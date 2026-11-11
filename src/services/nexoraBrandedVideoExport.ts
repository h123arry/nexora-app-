export interface NexoraBrandedExport {
  blob: Blob;
  extension: 'mp4' | 'webm';
}

/**
 * Records the source video through a canvas so the watermark is part of every
 * exported frame. Source audio is routed through Web Audio, then the existing
 * NEXORA sonic logo is appended as a short branded end-card sound.
 *
 * The source must permit anonymous CORS access. We fail closed rather than
 * silently delivering an unwatermarked original.
 */
export async function exportNexoraBrandedVideo(
  sourceUrl: string,
  username: string,
  onProgress?: (progress: number) => void,
): Promise<NexoraBrandedExport> {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('Branded video export is not supported on this device.');
  }

  const mimeCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const mimeType = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('This browser cannot encode a branded video download.');

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';

  const brandLogo = new Image();
  brandLogo.src = '/logo.svg';
  await brandLogo.decode().catch(() => undefined);
  if (!brandLogo.naturalWidth) throw new Error('The official NEXORA logo could not be loaded. Branded export was stopped.');

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Video export canvas is unavailable.');

  let audioContext: AudioContext | null = null;
  let recorder: MediaRecorder | null = null;
  let frameRequest = 0;
  let settled = false;
  let lastProgress = -1;

  const waitFor = (event: string, target: HTMLMediaElement) => new Promise<void>((resolve, reject) => {
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('The source video could not be loaded for branded export.')); };
    const cleanup = () => {
      target.removeEventListener(event, onReady);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(event, onReady, { once: true });
    target.addEventListener('error', onError, { once: true });
  });

  try {
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      const metadataReady = waitFor('loadedmetadata', video);
      video.src = sourceUrl;
      await metadataReady;
    } else {
      video.src = sourceUrl;
    }
    if (!video.videoWidth || !video.videoHeight) throw new Error('The source video has no usable video frames.');

    canvas.width = Math.min(1920, video.videoWidth);
    canvas.height = Math.max(2, Math.round(canvas.width * video.videoHeight / video.videoWidth));
    audioContext = new AudioContext();
    const sourceAudio = audioContext.createMediaElementSource(video);
    const audioOutput = audioContext.createMediaStreamDestination();
    sourceAudio.connect(audioOutput);
    let sonicBuffer: AudioBuffer | null = null;
    try {
      const sonicResponse = await fetch('/sounds/nexora-sonic-logo.mp3');
      if (sonicResponse.ok) sonicBuffer = await audioContext.decodeAudioData(await sonicResponse.arrayBuffer());
    } catch {
      // The permanent visual watermark remains mandatory if the optional sonic tag is unavailable.
    }

    const canvasStream = canvas.captureStream(30);
    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioOutput.stream.getAudioTracks(),
    ]);
    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const completed = new Promise<Blob>((resolve, reject) => {
      recorder!.addEventListener('dataavailable', event => {
        if (event.data.size) chunks.push(event.data);
      });
      recorder!.addEventListener('error', () => reject(new Error('The branded video encoder stopped unexpectedly.')), { once: true });
      recorder!.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: mimeType });
        blob.size ? resolve(blob) : reject(new Error('The branded video export was empty.'));
      }, { once: true });
    });

    const drawFrame = () => {
      if (settled) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const scale = Math.max(0.75, canvas.width / 1080);
      const pad = Math.round(22 * scale);
      const fontSize = Math.round(Math.max(13, canvas.width * 0.018));
      const handle = '@' + username.replace(/^@+/, '').slice(0, 32);
      const logoSize = Math.round(fontSize * 1.65);
      context.save();
      context.globalAlpha = 0.9;
      context.font = '600 ' + Math.round(fontSize * 0.9) + 'px Arial, sans-serif';
      const margin = Math.round(canvas.width * 0.035);
      const pillHeight = Math.round(fontSize * 2.55);
      const maxPillWidth = Math.max(120, canvas.width - margin * 2);
      const maxHandleWidth = Math.max(24, maxPillWidth - pad * 2.2 - logoSize - pad * 0.85);
      let displayHandle = handle;
      while (displayHandle.length > 2 && context.measureText(displayHandle).width > maxHandleWidth) {
        displayHandle = displayHandle.slice(0, -2) + '…';
      }
      const handleWidth = Math.min(context.measureText(displayHandle).width, maxHandleWidth);
      const pillWidth = Math.min(maxPillWidth, pad * 2.2 + logoSize + handleWidth + pad * 0.85);
      // TikTok-style alternating placement: the complete logo + creator handle
      // moves together between opposite corners as the video plays.
      const positionSlot = Math.floor(video.currentTime / 3) % 2;
      const atTopLeft = positionSlot === 0;
      const x = atTopLeft ? margin : canvas.width - pillWidth - margin;
      const y = atTopLeft ? margin : canvas.height - pillHeight - margin;
      context.fillStyle = 'rgba(5, 9, 20, 0.72)';
      context.beginPath();
      context.roundRect(x, y, pillWidth, pillHeight, pillHeight / 2);
      context.fill();
      const centerY = y + pillHeight / 2;
      const logoX = x + pad * 0.65;
      if (brandLogo.complete && brandLogo.naturalWidth > 0) {
        context.drawImage(brandLogo, logoX, centerY - logoSize / 2, logoSize, logoSize);
      }
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.font = '600 ' + Math.round(fontSize * 0.9) + 'px Arial, sans-serif';
      context.fillStyle = '#F5F7FF';
      context.shadowColor = 'rgba(0, 0, 0, 0.55)';
      context.shadowBlur = Math.max(2, 4 * scale);
      context.fillText(displayHandle, logoX + logoSize + pad * 0.55, centerY, maxHandleWidth);
      context.restore();
      const progress = Math.min(92, Math.round((video.currentTime / Math.max(1, video.duration)) * 92));
      if (progress !== lastProgress) { lastProgress = progress; onProgress?.(progress); }
      if (!video.paused && !video.ended) frameRequest = requestAnimationFrame(drawFrame);
    };

    await audioContext.resume();
    const playbackFinished = new Promise<void>((resolve, reject) => {
      video.addEventListener('ended', () => resolve(), { once: true });
      video.addEventListener('error', () => reject(new Error('The source video failed during export.')), { once: true });
    });
    recorder.start(1000);
    await video.play();
    drawFrame();
    await playbackFinished;

    // TikTok-style downloaded-video outro: the source footage ends first,
    // then a short NEXORA end card is rendered into the same exported file.
    cancelAnimationFrame(frameRequest);
    onProgress?.(94);
    const outroDurationMs = Math.max(2400, sonicBuffer ? sonicBuffer.duration * 1000 : 0);
    const outroStartedAt = performance.now();
    const drawOutroFrame = (now: number) => {
      const elapsed = Math.min(1, (now - outroStartedAt) / outroDurationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const w = canvas.width;
      const h = canvas.height;
      const gradient = context.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#050914');
      gradient.addColorStop(0.52, '#120B2D');
      gradient.addColorStop(1, '#260A68');
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
      const glow = context.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.62);
      glow.addColorStop(0, 'rgba(113, 56, 255, 0.34)');
      glow.addColorStop(1, 'rgba(113, 56, 255, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, w, h);
      const centerX = w / 2;
      const centerY = h * 0.43;
      const logoSize = Math.round(Math.min(w * 0.25, h * 0.19) * (0.86 + eased * 0.14));
      context.save();
      context.globalAlpha = eased;
      context.shadowColor = 'rgba(138, 63, 252, 0.65)';
      context.shadowBlur = Math.max(12, logoSize * 0.22);
      if (brandLogo.complete && brandLogo.naturalWidth > 0) {
        context.drawImage(brandLogo, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
      }
      context.shadowBlur = 0;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#F5F7FF';
      context.font = '700 ' + Math.round(Math.max(22, w * 0.045)) + 'px Arial, sans-serif';
      context.fillText('NEXORA', centerX, h * 0.63);
      context.fillStyle = 'rgba(245, 247, 255, 0.88)';
      context.font = '600 ' + Math.round(Math.max(15, w * 0.023)) + 'px Arial, sans-serif';
      const outroHandle = '@' + username.replace(/^@+/, '').slice(0, 32);
      context.fillText(outroHandle, centerX, h * 0.71, w * 0.82);
      context.fillStyle = 'rgba(196, 181, 253, 0.78)';
      context.font = '500 ' + Math.round(Math.max(10, w * 0.012)) + 'px Arial, sans-serif';
      context.fillText("THE WORLD'S LIVING SOCIAL NETWORK", centerX, h * 0.81, w * 0.88);
      context.restore();
    };
    if (sonicBuffer) {
      const sonicSource = audioContext!.createBufferSource();
      sonicSource.buffer = sonicBuffer;
      sonicSource.connect(audioOutput);
      sonicSource.start();
    }
    await new Promise<void>(resolve => {
      const finishOutro = () => { settled = true; resolve(); };
      const outroLoop = (now: number) => {
        drawOutroFrame(now);
        if (now - outroStartedAt >= outroDurationMs) finishOutro();
        else frameRequest = requestAnimationFrame(outroLoop);
      };
      frameRequest = requestAnimationFrame(outroLoop);
    });
    recorder.stop();
    const blob = await completed;
    onProgress?.(100);
    return { blob, extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
  } finally {
    settled = true;
    cancelAnimationFrame(frameRequest);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    video.pause();
    video.removeAttribute('src');
    video.load();
    await audioContext?.close().catch(() => {});
  }
}
