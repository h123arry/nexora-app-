const fs = require('fs');
let code = fs.readFileSync('src/utils/indexedDbStorage.ts', 'utf8');

const newFunc = `export function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoBlob);
    
    let timeoutId = setTimeout(() => {
        cleanup();
        resolve('');
    }, 5000);

    const cleanup = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
    };

    video.onerror = () => {
      console.warn('[Storage] Video error during thumbnail generation');
      cleanup();
      resolve('');
    };

    video.onloadeddata = () => {
      let seekTime = 0.5;
      if (video.duration && video.duration > 0) {
         seekTime = Math.min(0.5, video.duration / 2);
      }
      video.currentTime = seekTime;
    };

    const extractFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          cleanup();
          resolve(dataUrl);
        } else {
          cleanup();
          resolve('');
        }
      } catch (err) {
        console.error('[Storage] Error drawing video thumbnail content', err);
        cleanup();
        resolve('');
      }
    };

    video.onseeked = extractFrame;
    video.src = url;
  });
}`;

code = code.replace(/export function generateVideoThumbnail[\s\S]*?\}\s*\n\}\s*\n/m, newFunc + '\n');
fs.writeFileSync('src/utils/indexedDbStorage.ts', code);
