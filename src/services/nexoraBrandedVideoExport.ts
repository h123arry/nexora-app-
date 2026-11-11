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
  video.src = sourceUrl;

  const brandLogo = new Image();
  brandLogo.src = '/logo.svg';
  await brandLogo.decode().catch(() => undefined);

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
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) await waitFor('loadedmetadata', video);
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
      const pad = Math.round(18 * scale);
      const fontSize = Math.round(Math.max(13, canvas.width * 0.018));
      const brand = 'NEXORA';
      const handle = '@' + username.replace(/^@+/, '').slice(0, 32);
      const logoSize = Math.round(fontSize * 1.35);
      context.save();
      context.globalAlpha = 0.88;
      context.font = '700 ' + fontSize + 'px Arial, sans-serif';
      const brandWidth = context.measureText(brand).width;
      context.font = '600 ' + Math.round(fontSize * 0.82) + 'px Arial, sans-serif';
      const handleWidth = context.measureText(handle).width;
      const pillWidth = pad * 3 + logoSize + brandWidth + handleWidth + pad * 1.5;
      const pillHeight = Math.round(fontSize * 2.6);
      const x = canvas.width - pillWidth - pad;
      const y = canvas.height - pillHeight - pad;
      context.fillStyle = 'rgba(5, 9, 20, 0.76)';
      context.beginPath();
      context.roundRect(x, y, pillWidth, pillHeight, pillHeight / 2);
      context.fill();
      context.strokeStyle = 'rgba(168, 85, 247, 0.62)';
      context.lineWidth = Math.max(1, scale);
      context.stroke();
      const centerY = y + pillHeight / 2;
      const logoX = x + pad;
      context.fillStyle = '#050914';
      context.beginPath();
      context.roundRect(logoX, centerY - logoSize / 2, logoSize, logoSize, Math.round(logoSize * 0.22));
      context.fill();
      if (brandLogo.complete && brandLogo.naturalWidth > 0) {
        context.drawImage(brandLogo, logoX, centerY - logoSize / 2, logoSize, logoSize);
      } else {
        context.fillStyle = '#A855F7';
        context.font = '900 ' + Math.round(logoSize * 0.66) + 'px Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('N', logoX + logoSize / 2, centerY + 0.5);
      }
      context.textAlign = 'left';
      context.font = '800 ' + fontSize + 'px Arial, sans-serif';
      const brandX = logoX + logoSize + pad * 0.55;
      context.fillStyle = '#F5F7FF';
      context.fillText(brand, brandX, centerY);
      context.font = '600 ' + Math.round(fontSize * 0.82) + 'px Arial, sans-serif';
      context.fillStyle = '#C4B5FD';
      context.fillText(handle, brandX + brandWidth + pad * 0.8, centerY);
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

    settled = true;
    cancelAnimationFrame(frameRequest);
    onProgress?.(94);
    if (sonicBuffer) {
      await new Promise<void>(resolve => {
        const sonicSource = audioContext!.createBufferSource();
        sonicSource.buffer = sonicBuffer;
        sonicSource.connect(audioOutput);
        sonicSource.onended = () => resolve();
        sonicSource.start();
        window.setTimeout(resolve, Math.ceil(sonicBuffer!.duration * 1000) + 500);
      });
    }

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
