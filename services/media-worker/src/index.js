import { http } from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import sharp from 'sharp';

import { inspectSourceCredential } from './originCredentials.js';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { classifyStorageObject, classifyR2StorageObject, imageRenditionWidths, videoRenditionsForSize, videoRenditionDimensions, canClaimMediaProcessing, MAX_DURATION_SECONDS } from './policies.js';
import { resolveR2WorkerConfig, downloadR2Object, uploadR2Object } from './r2Storage.js';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const bucketName = process.env.MEDIA_BUCKET || '';
const databaseId = process.env.FIRESTORE_DATABASE_ID;
const r2Config = resolveR2WorkerConfig();
if (!projectId || !databaseId || (!bucketName && !r2Config)) throw new Error('GOOGLE_CLOUD_PROJECT, FIRESTORE_DATABASE_ID and either MEDIA_BUCKET or complete R2 credentials are required');
if (!getApps().length) initializeApp({ projectId });
const db = getFirestore(getApps()[0], databaseId);
const storage = new Storage({ projectId });
const bucket = bucketName ? storage.bucket(bucketName) : null;
const RENDITIONS = [{height:360,bitrate:'800k',audio:'96k'},{height:720,bitrate:'2500k',audio:'128k'},{height:1080,bitrate:'5000k',audio:'128k'}];

function run(binary,args) {
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>{stdout+=chunk.toString(); if(stdout.length>2_000_000) child.kill('SIGKILL');});
    child.stderr.on('data',chunk=>{stderr+=chunk.toString(); if(stderr.length>200_000) stderr=stderr.slice(-200_000);});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(stdout):reject(new Error(`${binary} exited ${code}: ${stderr.slice(-4000)}`)));
  });
}
function signedCdnUrl(objectPath, fallback) {
  let base=process.env.MEDIA_CDN_BASE_URL || '';
  if(base.endsWith('/')) base=base.slice(0,-1);
  const keyName=process.env.MEDIA_CDN_KEY_NAME;
  const key=process.env.MEDIA_CDN_SIGNING_KEY_BASE64;
  if(!base || !keyName || !key) return fallback;
  const expires=Math.floor(Date.now()/1000)+7*24*60*60;
  const unsigned=base+'/'+objectPath+'?Expires='+expires+'&KeyName='+keyName;
  const signature=createHmac('sha1',Buffer.from(key,'base64')).update(unsigned).digest('base64').replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return unsigned+'&Signature='+signature;
}
async function probe(file){
  const raw=await run('ffprobe',['-v','error','-show_entries','format=duration,format_name,size:stream=codec_type,codec_name,width,height,avg_frame_rate','-of','json',file]);
  const data=JSON.parse(raw); const video=data.streams?.find(s=>s.codec_type==='video');
  if(!video || !Number.isFinite(Number(data.format?.duration))) throw new Error('Unsupported or unreadable video');
  const duration=Number(data.format.duration);
  if(duration<=0 || duration>MAX_DURATION_SECONDS || !video.width || !video.height) throw new Error('Video duration or dimensions are outside supported limits');
  return {durationSeconds:duration,width:video.width,height:video.height,format:data.format.format_name,videoCodec:video.codec_name,frameRate:video.avg_frame_rate};
}
async function upload(local,object,contentType,cacheControl='public,max-age=31536000,immutable',provider='gcs'){
  if(provider==='r2') return uploadR2Object(r2Config,local,object,contentType,cacheControl);
  if(!bucket) throw new Error('Google Cloud Storage is not configured for this worker.');
  await bucket.upload(local,{destination:object,metadata:{contentType,cacheControl,metadata:{nexoraGenerated:'true'}}});
}
async function persistCredentialInspection({ownerId,mediaId,generation,inspection}){
  const assetRef=db.collection('mediaAssets').doc(mediaId);
  const originRef=db.collection('mediaOrigins').doc(mediaId);
  await db.runTransaction(async tx=>{
    const [assetSnap,originSnap]=await Promise.all([tx.get(assetRef),tx.get(originRef)]);
    const asset=assetSnap.data();
    if(assetSnap.exists && asset?.ownerId===ownerId && (!asset.generation || asset.generation===generation)){
      tx.set(assetRef,{credentialInspection:{...inspection,sourceGeneration:generation,checkedAt:FieldValue.serverTimestamp()},updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    const origin=originSnap.data();
    if(originSnap.exists && origin?.ownerUid===ownerId && origin?.mediaGeneration===generation){
      tx.set(originRef,{credentialState:inspection.state,credentialInspection:{...inspection,sourceGeneration:generation,checkedAt:FieldValue.serverTimestamp()},updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
  });
}

async function processObject(event){
  const provider=event?.provider==='r2'?'r2':'gcs';
  if(provider==='r2' && !r2Config) throw new Error('R2 processing credentials are not configured.');
  const classification=provider==='r2'
    ? classifyR2StorageObject(event,r2Config.bucket)
    : classifyStorageObject(event,bucketName);
  if(classification.ignored) return {ignored:true,reason:classification.reason};
  const {object,ownerId,mediaId,isVideo,isImage,generation}=classification;
  const ref=db.collection('mediaAssets').doc(mediaId);
  const token=randomUUID();
  const sourcePurpose=object.metadata?.purpose==='studio-export'?'studio-export':null;
  const studioExportExpiresAt=sourcePurpose?new Date(Date.now()+24*60*60*1000):null;
  const accepted=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref); const current=snap.data();
    if(provider==='r2' && (!snap.exists || current?.storageProvider!=='r2' || current?.storagePath!==object.name)) return false;
    if(current && (current.ownerId!==ownerId || !canClaimMediaProcessing(current))) return false;
    tx.set(ref,{
      ownerId,status:'processing',processor:'nexora-ffmpeg-v1',processingToken:token,
      processingStartedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),
      ...(sourcePurpose?{sourcePurpose,studioExportExpiresAt}:{}),
    },{merge:true});
    return true;
  });
  if(!accepted) return {ignored:true,reason:'already-processed-or-owned'};
  const work=await mkdtemp(path.join(tmpdir(),'nexora-media-'));
  try {
    const input=path.join(work,'source');
    if(provider==='r2') await downloadR2Object(r2Config,object.name,input);
    else {
      if(!bucket) throw new Error('Google Cloud Storage is not configured for this worker.');
      await bucket.file(object.name, { generation }).download({ destination: input, preconditionOpts: { ifGenerationMatch: generation } });
    }
    // Inspect the immutable original before Sharp/FFmpeg transforms can strip its manifest.
    const credentialInspection=await inspectSourceCredential(input,classification.contentType);
    await persistCredentialInspection({ownerId,mediaId,generation,inspection:credentialInspection});
    if(isImage) {
      const sourceMetadata=await sharp(input,{limitInputPixels:100_000_000}).metadata();
      if(!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width>20_000 || sourceMetadata.height>20_000) throw new Error('Image dimensions are outside supported limits');
      const outputRoot=`processed/${ownerId}/${mediaId}/${generation}`;
      const variants=[];
      for(const width of imageRenditionWidths(sourceMetadata.width)){
        const output=path.join(work,`image-${width}.webp`);
        const outputInfo=await sharp(input,{limitInputPixels:100_000_000}).rotate().resize({width,withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(output);
        const objectPath=`${outputRoot}/image-${outputInfo.width}.webp`;
        await upload(output,objectPath,'image/webp','public,max-age=31536000,immutable',provider);
        variants.push({width:outputInfo.width,height:outputInfo.height,path:objectPath});
      }
      const result=await db.runTransaction(async tx=>{
        const snap=await tx.get(ref); const current=snap.data();
        if(current?.processingToken!==token || current.ownerId!==ownerId) return false;
        tx.set(ref,{status:'ready',processor:'nexora-sharp-v1',metadata:{width:sourceMetadata.width,height:sourceMetadata.height,format:sourceMetadata.format,hasAlpha:sourceMetadata.hasAlpha===true,processedAt:FieldValue.serverTimestamp()},imageVariants:variants,posterPath:variants[0]?.path || null,processingToken:FieldValue.delete(),processingCompletedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
        return true;
      });
      return {ready:result,mediaId,imageVariants:variants.length};
    }
    const metadata=await probe(input);
    const outputRoot=`processed/${ownerId}/${mediaId}/${generation}`;
    const master=[];
    const actual=[];
    for(const rendition of videoRenditionsForSize(metadata.width,metadata.height,RENDITIONS)){
      const dir=path.join(work,String(rendition.height)); await mkdir(dir,{recursive:true});
      const mp4=path.join(dir,'video.mp4');
      await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf',`scale='if(gte(iw,ih),-2,${rendition.height})':'if(gte(iw,ih),${rendition.height},-2)'`,'-c:v','libx264','-preset','veryfast','-profile:v','main','-b:v',rendition.bitrate,'-maxrate',rendition.bitrate,'-bufsize',`${parseInt(rendition.bitrate,10)*2}k`,'-c:a','aac','-b:a',rendition.audio,'-movflags','+faststart','-pix_fmt','yuv420p',mp4]);
      const hls=path.join(dir,'index.m3u8');
      await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf',`scale='if(gte(iw,ih),-2,${rendition.height})':'if(gte(iw,ih),${rendition.height},-2)'`,'-c:v','libx264','-preset','veryfast','-b:v',rendition.bitrate,'-c:a','aac','-b:a',rendition.audio,'-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename',path.join(dir,'segment_%05d.ts'),hls]);
      const prefix=`${outputRoot}/${rendition.height}p`;
      const playlist=(await readFile(hls,'utf8')).split(String.fromCharCode(10)).map(rawLine=>{
        const line=rawLine.replaceAll(String.fromCharCode(13),'');
        return line && !line.startsWith('#') ? signedCdnUrl(prefix+'/'+line,line) : line;
      }).join(String.fromCharCode(10));
      await (await import('node:fs/promises')).writeFile(hls,playlist);
      await upload(mp4,`${prefix}/video.mp4`,'video/mp4','public,max-age=31536000,immutable',provider);
      await upload(hls,`${prefix}/index.m3u8`,'application/vnd.apple.mpegurl','public,max-age=60',provider);
      for(const entry of await (await import('node:fs/promises')).readdir(dir)) if(entry.endsWith('.ts')) await upload(path.join(dir,entry),`${prefix}/${entry}`,'video/mp2t','public,max-age=31536000,immutable',provider);
      master.push('#EXT-X-STREAM-INF:BANDWIDTH='+ (parseInt(rendition.bitrate,10)*1000) + ',RESOLUTION=' + videoRenditionDimensions(metadata.width,metadata.height,rendition.height).width + 'x' + videoRenditionDimensions(metadata.width,metadata.height,rendition.height).height + String.fromCharCode(10) + signedCdnUrl(prefix+'/index.m3u8',rendition.height+'p/index.m3u8'));
      actual.push({height:rendition.height,bitrate:rendition.bitrate,mp4Path:`${prefix}/video.mp4`,hlsPath:`${prefix}/index.m3u8`});
    }
    if(!actual.length) throw new Error('No supported rendition could be generated');
    const masterPath=path.join(work,'master.m3u8');
    await (await import('node:fs/promises')).writeFile(masterPath,`#EXTM3U\n#EXT-X-VERSION:3\n${master.join('\n')}\n`);
    await upload(masterPath,`${outputRoot}/master.m3u8`,'application/vnd.apple.mpegurl','public,max-age=60',provider);
    const poster=path.join(work,'poster.jpg');
    await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(Math.min(1,metadata.durationSeconds/4)),'-i',input,'-frames:v','1','-vf','scale=640:-2','-q:v','3',poster]);
    await upload(poster,`${outputRoot}/poster.jpg`,'image/jpeg','public,max-age=31536000,immutable',provider);
    const result=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref); const current=snap.data();
      if(current?.processingToken!==token || current.ownerId!==ownerId) return false;
      tx.set(ref,{status:'ready',processor:'nexora-ffmpeg-v1',metadata:{...metadata,processedAt:FieldValue.serverTimestamp()},renditions:actual,hlsMasterPath:`${outputRoot}/master.m3u8`,posterPath:`${outputRoot}/poster.jpg`,processingToken:FieldValue.delete(),processingCompletedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
      return true;
    });
    return {ready:result,mediaId,renditions:actual.length};
  } catch(error) {
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref); const current=snap.data();
      if(current?.processingToken===token) tx.set(ref,{status:'failed',failureCategory:'transcode_failed',failureMessage:String(error.message||'').slice(0,300),processingToken:FieldValue.delete(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }).catch(()=>{});
    throw error;
  } finally { await rm(work,{recursive:true,force:true}); }
}
let r2ReconciliationRunning=false;
async function reconcileR2Uploads(){
  if(!r2Config || r2ReconciliationRunning) return;
  r2ReconciliationRunning=true;
  try {
    // Use the single-field provider index so this reconciler does not depend
    // on a new composite Firestore index being deployed first.
    const inventory = await db.collection('mediaAssets').where('storageProvider','==','r2').limit(200).get();
    const candidates = inventory.docs.filter(snapshot => ['uploaded','failed','processing'].includes(String(snapshot.get('status'))) && canClaimMediaProcessing(snapshot.data())).slice(0,10);
    for(const snapshot of candidates){
      const asset=snapshot.data();
      if(!asset || !['video','image'].includes(String(asset.kind)) || typeof asset.ownerId!=='string'
        || typeof asset.storagePath!=='string' || !/^users\/[A-Za-z0-9_-]{1,128}\/media\/[A-Za-z0-9_-]{1,128}$/.test(asset.storagePath)
        || !/^\d{1,32}$/.test(String(asset.generation||''))) continue;
      const event={provider:'r2',object:{
        bucket:r2Config.bucket,name:asset.storagePath,size:String(asset.size),
        contentType:String(asset.contentType||''),generation:String(asset.generation),
        metadata:{ownerId:asset.ownerId,mediaId:snapshot.id,purpose:String(asset.purpose||'post')},
      }};
      await processObject(event).catch(error=>{
        console.error('[MediaWorker] R2 reconciliation failed.',{mediaId:snapshot.id,message:String(error.message||error)});
      });
    }
  } catch(error) {
    console.error('[MediaWorker] R2 reconciliation scan failed.',{message:String(error.message||error)});
  } finally { r2ReconciliationRunning=false; }
}
if(r2Config){
  setTimeout(()=>void reconcileR2Uploads(),5000).unref?.();
  setInterval(()=>void reconcileR2Uploads(),60_000).unref?.();
}

http('processMedia',async(req,res)=>{
  try {
    if(req.method!=='POST') return res.status(405).send('Method not allowed');
    if(req.body?.provider==='r2') {
      const token=process.env.MEDIA_WORKER_TOKEN;
      if(!token || req.header('authorization')!==`Bearer ${token}`) return res.status(401).json({error:'unauthorized'});
    }
    const type=req.header('ce-type') || req.body?.type;
    if(type && type!=='google.cloud.storage.object.v1.finalized') return res.status(204).send();
    const result=await processObject(req.body);
    return res.status(200).json(result);
  } catch(error) {
    console.error('NEXORA media processing failed', {message:String(error.message||error)});
    return res.status(500).json({error:'media_processing_failed'});
  }
});
