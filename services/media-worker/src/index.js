import { http } from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { spawn } from 'node:child_process';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { mkdtemp, mkdir, rm, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const bucketName = process.env.MEDIA_BUCKET;
if (!projectId || !bucketName) throw new Error('GOOGLE_CLOUD_PROJECT and MEDIA_BUCKET are required');
if (!getApps().length) initializeApp({ projectId });
const db = getFirestore();
const storage = new Storage({ projectId });
const bucket = storage.bucket(bucketName);
const MAX_INPUT_BYTES = 250 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60 * 60;
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
async function upload(local,object,contentType,cacheControl='public,max-age=31536000,immutable'){
  await bucket.upload(local,{destination:object,metadata:{contentType,cacheControl,metadata:{nexoraGenerated:'true'}}});
}
async function processObject(event){
  const object=event.data || event;
  const name=object.name;
  const match=typeof name==='string' && name.match(/^users\/([A-Za-z0-9_-]{1,128})\/media\/([A-Za-z0-9_-]{1,128})$/);
  if(!match || object.bucket!==bucketName) return {ignored:true};
  const [,ownerId,mediaId]=match;
  if(object.metadata?.ownerId!==ownerId || object.metadata?.mediaId!==mediaId) return {ignored:true};
  if(Number(object.size)>MAX_INPUT_BYTES || Number(object.size)<=0) throw new Error('Input file exceeds media size policy');
  const isVideo=String(object.contentType||'').toLowerCase().startsWith('video/');
  const isImage=String(object.contentType||'').toLowerCase().startsWith('image/');
  if(!isVideo && !isImage) return {ignored:true};
  if(isImage && Number(object.size)>12*1024*1024) throw new Error('Image exceeds 12 MiB processing limit');
  const ref=db.collection('mediaAssets').doc(mediaId);
  const token=randomUUID();
  const accepted=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref); const current=snap.data();
    if(current && (current.ownerId!==ownerId || !['pending_upload','uploaded','failed'].includes(current.status))) return false;
    tx.set(ref,{ownerId,status:'processing',processor:'nexora-ffmpeg-v1',processingToken:token,processingStartedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
    return true;
  });
  if(!accepted) return {ignored:true,reason:'already-processed-or-owned'};
  const work=await mkdtemp(path.join(tmpdir(),'nexora-media-'));
  try {
    const input=path.join(work,'source');
    await bucket.file(name).download({destination:input});
    if(isImage) {
      const sourceMetadata=await sharp(input,{limitInputPixels:100_000_000}).metadata();
      if(!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width>20_000 || sourceMetadata.height>20_000) throw new Error('Image dimensions are outside supported limits');
      const outputRoot=`processed/${ownerId}/${mediaId}/${object.generation || 'current'}`;
      const variants=[];
      for(const width of [320,640,1280]) {
        if(sourceMetadata.width<width && width!==320) continue;
        const output=path.join(work,`image-${width}.webp`);
        await sharp(input,{limitInputPixels:100_000_000}).rotate().resize({width,withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(output);
        const objectPath=`${outputRoot}/image-${width}.webp`;
        await upload(output,objectPath,'image/webp');
        variants.push({width,path:objectPath});
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
    const outputRoot=`processed/${ownerId}/${mediaId}/${object.generation || 'current'}`;
    const master=[];
    const actual=[];
    for(const rendition of RENDITIONS){
      if(metadata.height<rendition.height) continue;
      const dir=path.join(work,String(rendition.height)); await mkdir(dir,{recursive:true});
      const mp4=path.join(dir,'video.mp4');
      await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf',`scale=-2:min(${rendition.height}\\,ih)`,'-c:v','libx264','-preset','veryfast','-profile:v','main','-b:v',rendition.bitrate,'-maxrate',rendition.bitrate,'-bufsize',`${parseInt(rendition.bitrate,10)*2}k`,'-c:a','aac','-b:a',rendition.audio,'-movflags','+faststart','-pix_fmt','yuv420p',mp4]);
      const hls=path.join(dir,'index.m3u8');
      await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf',`scale=-2:min(${rendition.height}\\,ih)`,'-c:v','libx264','-preset','veryfast','-b:v',rendition.bitrate,'-c:a','aac','-b:a',rendition.audio,'-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename',path.join(dir,'segment_%05d.ts'),hls]);
      const prefix=`${outputRoot}/${rendition.height}p`;
      const playlist=(await readFile(hls,'utf8')).split(String.fromCharCode(10)).map(rawLine=>{
        const line=rawLine.replaceAll(String.fromCharCode(13),'');
        return line && !line.startsWith('#') ? signedCdnUrl(prefix+'/'+line,line) : line;
      }).join(String.fromCharCode(10));
      await (await import('node:fs/promises')).writeFile(hls,playlist);
      await upload(mp4,`${prefix}/video.mp4`,'video/mp4');
      await upload(hls,`${prefix}/index.m3u8`,'application/vnd.apple.mpegurl','public,max-age=60');
      for(const entry of await (await import('node:fs/promises')).readdir(dir)) if(entry.endsWith('.ts')) await upload(path.join(dir,entry),`${prefix}/${entry}`,'video/mp2t');
      master.push('#EXT-X-STREAM-INF:BANDWIDTH='+ (parseInt(rendition.bitrate,10)*1000) + ',RESOLUTION=' + Math.round(metadata.width*rendition.height/metadata.height) + 'x' + rendition.height + String.fromCharCode(10) + signedCdnUrl(prefix+'/index.m3u8',rendition.height+'p/index.m3u8'));
      actual.push({height:rendition.height,bitrate:rendition.bitrate,mp4Path:`${prefix}/video.mp4`,hlsPath:`${prefix}/index.m3u8`});
    }
    if(!actual.length) throw new Error('No supported rendition could be generated');
    const masterPath=path.join(work,'master.m3u8');
    await (await import('node:fs/promises')).writeFile(masterPath,`#EXTM3U\n#EXT-X-VERSION:3\n${master.join('\n')}\n`);
    await upload(masterPath,`${outputRoot}/master.m3u8`,'application/vnd.apple.mpegurl','public,max-age=60');
    const poster=path.join(work,'poster.jpg');
    await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(Math.min(1,metadata.durationSeconds/4)),'-i',input,'-frames:v','1','-vf','scale=640:-2','-q:v','3',poster]);
    await upload(poster,`${outputRoot}/poster.jpg`,'image/jpeg');
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
http('processMedia',async(req,res)=>{
  try {
    if(req.method!=='POST') return res.status(405).send('Method not allowed');
    const type=req.header('ce-type') || req.body?.type;
    if(type && type!=='google.cloud.storage.object.v1.finalized') return res.status(204).send();
    const result=await processObject(req.body);
    return res.status(200).json(result);
  } catch(error) {
    console.error('NEXORA media processing failed', {message:String(error.message||error)});
    return res.status(500).json({error:'media_processing_failed'});
  }
});
