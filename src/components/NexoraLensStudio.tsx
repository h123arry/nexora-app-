import { useEffect, useRef, useState } from 'react';
import { Camera, Heart, Sparkles, Star, Crown, Glasses, Cat, Sun, Moon } from 'lucide-react';

type Facing = 'user' | 'environment';
type Lens = {
  id: string;
  name: string;
  category: 'For you' | 'Beauty' | 'Mood' | 'AR';
  filter: string;
  sticker: 'none' | 'crown' | 'cat' | 'halo' | 'glasses' | 'hearts' | 'sparkles';
};

type Props = {
  cameraFacing: Facing;
  userId: string;
  onStreamReady: (stream: MediaStream | null) => void;
  onCapture: (blob: Blob) => void;
};

const LENSES: Lens[] = [
  { id: 'natural', name: 'Original', category: 'For you', filter: 'none', sticker: 'none' },
  { id: 'violet-glow', name: 'Violet Glow', category: 'Beauty', filter: 'brightness(1.08) saturate(1.18) contrast(1.03)', sticker: 'sparkles' },
  { id: 'soft-light', name: 'Soft Light', category: 'Beauty', filter: 'brightness(1.12) contrast(.94) saturate(1.04)', sticker: 'none' },
  { id: 'golden-hour', name: 'Golden Hour', category: 'Mood', filter: 'sepia(.22) saturate(1.28) brightness(1.06)', sticker: 'none' },
  { id: 'midnight', name: 'Midnight', category: 'Mood', filter: 'brightness(.82) contrast(1.2) saturate(.82) hue-rotate(12deg)', sticker: 'none' },
  { id: 'mono', name: 'Mono', category: 'Mood', filter: 'grayscale(1) contrast(1.12)', sticker: 'none' },
  { id: 'royal-crown', name: 'Royal Crown', category: 'AR', filter: 'none', sticker: 'crown' },
  { id: 'starlight', name: 'Starlight', category: 'AR', filter: 'saturate(1.12) brightness(1.04)', sticker: 'sparkles' },
  { id: 'halo', name: 'Halo', category: 'AR', filter: 'none', sticker: 'halo' },
  { id: 'cat-mode', name: 'Cat Mode', category: 'AR', filter: 'none', sticker: 'cat' },
  { id: 'heart-eyes', name: 'Heart Eyes', category: 'AR', filter: 'none', sticker: 'hearts' },
  { id: 'violet-shades', name: 'Violet Shades', category: 'AR', filter: 'none', sticker: 'glasses' },
];

const VISION_VERSION = '0.10.14';
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function point(landmarks: any[], index: number, width: number, height: number) {
  const item = landmarks[index];
  return item ? { x: item.x * width, y: item.y * height } : null;
}

function drawLens(context: CanvasRenderingContext2D, landmarks: any[], lens: Lens, width: number, height: number, time: number) {
  if (!landmarks?.length || lens.sticker === 'none') return;
  const forehead = point(landmarks, 10, width, height);
  const leftEye = point(landmarks, 33, width, height);
  const rightEye = point(landmarks, 263, width, height);
  const nose = point(landmarks, 1, width, height);
  const mouthLeft = point(landmarks, 61, width, height);
  const mouthRight = point(landmarks, 291, width, height);
  const chin = point(landmarks, 152, width, height);
  if (!forehead || !leftEye || !rightEye || !nose || !chin) return;
  const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const faceWidth = eyeDistance * 2.15;
  const pulse = 1 + Math.sin(time / 180) * 0.035;
  context.save();
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.shadowColor = 'rgba(113,56,255,.7)';
  context.shadowBlur = Math.max(8, eyeDistance * .12);

  if (lens.sticker === 'crown') {
    const crownWidth = faceWidth * .72 * pulse;
    const crownHeight = crownWidth * .42;
    const x = forehead.x - crownWidth / 2;
    const y = forehead.y - crownHeight * 1.05;
    context.fillStyle = '#8A3FFC';
    context.strokeStyle = '#E9D5FF';
    context.lineWidth = Math.max(2, eyeDistance * .025);
    context.beginPath();
    context.moveTo(x, y + crownHeight);
    context.lineTo(x + crownWidth * .08, y + crownHeight * .2);
    context.lineTo(x + crownWidth * .3, y + crownHeight * .62);
    context.lineTo(x + crownWidth * .5, y);
    context.lineTo(x + crownWidth * .7, y + crownHeight * .62);
    context.lineTo(x + crownWidth * .92, y + crownHeight * .2);
    context.lineTo(x + crownWidth, y + crownHeight);
    context.closePath();
    context.fill(); context.stroke();
    context.fillStyle = '#F5F7FF';
    context.beginPath(); context.arc(forehead.x, y + crownHeight * .34, Math.max(2, eyeDistance * .035), 0, Math.PI * 2); context.fill();
  } else if (lens.sticker === 'cat') {
    const earWidth = faceWidth * .24;
    const earHeight = earWidth * .9;
    context.fillStyle = '#7138FF';
    context.strokeStyle = '#E9D5FF';
    context.lineWidth = Math.max(2, eyeDistance * .025);
    for (const side of [-1, 1]) {
      const baseX = forehead.x + side * faceWidth * .34;
      const baseY = forehead.y + eyeDistance * .12;
      context.beginPath();
      context.moveTo(baseX - earWidth / 2, baseY);
      context.lineTo(baseX + side * earWidth * .18, baseY - earHeight);
      context.lineTo(baseX + earWidth / 2, baseY + earHeight * .08);
      context.closePath(); context.fill(); context.stroke();
    }
  } else if (lens.sticker === 'halo') {
    const haloY = forehead.y - eyeDistance * .62 - Math.sin(time / 250) * eyeDistance * .04;
    context.strokeStyle = '#DCCBFF';
    context.lineWidth = Math.max(3, eyeDistance * .055);
    context.beginPath(); context.ellipse(forehead.x, haloY, faceWidth * .28, eyeDistance * .12, 0, 0, Math.PI * 2); context.stroke();
  } else if (lens.sticker === 'glasses') {
    const lensRadius = eyeDistance * .28;
    context.strokeStyle = '#B69BFF';
    context.fillStyle = 'rgba(75,16,242,.34)';
    context.lineWidth = Math.max(3, eyeDistance * .045);
    for (const eye of [leftEye, rightEye]) {
      context.beginPath(); context.roundRect(eye.x - lensRadius, eye.y - lensRadius * .62, lensRadius * 2, lensRadius * 1.25, lensRadius * .28); context.fill(); context.stroke();
    }
    context.beginPath(); context.moveTo(leftEye.x + lensRadius, leftEye.y); context.lineTo(rightEye.x - lensRadius, rightEye.y); context.stroke();
  } else if (lens.sticker === 'hearts') {
    const drawHeart = (x: number, y: number, size: number) => {
      context.save(); context.translate(x, y); context.scale(size / 24, size / 24);
      context.fillStyle = '#C084FC'; context.beginPath(); context.moveTo(0, 20); context.bezierCurveTo(-28, 2, -12, -14, 0, -3); context.bezierCurveTo(12, -14, 28, 2, 0, 20); context.fill(); context.restore();
    };
    drawHeart(leftEye.x, leftEye.y - eyeDistance * .1, eyeDistance * .24);
    drawHeart(rightEye.x, rightEye.y - eyeDistance * .1, eyeDistance * .24);
  } else if (lens.sticker === 'sparkles') {
    context.fillStyle = '#E9D5FF';
    for (let i = 0; i < 5; i += 1) {
      const angle = time / 500 + i * Math.PI * 2 / 5;
      const x = forehead.x + Math.cos(angle) * faceWidth * .48;
      const y = nose.y + Math.sin(angle) * eyeDistance * .72;
      const size = Math.max(3, eyeDistance * (.035 + (i % 2) * .018));
      context.beginPath(); context.moveTo(x, y - size * 2); context.lineTo(x + size * .5, y - size * .5); context.lineTo(x + size * 2, y); context.lineTo(x + size * .5, y + size * .5); context.lineTo(x, y + size * 2); context.lineTo(x - size * .5, y + size * .5); context.lineTo(x - size * 2, y); context.lineTo(x - size * .5, y - size * .5); context.closePath(); context.fill();
    }
  }
  context.restore();
}

export default function NexoraLensStudio({ cameraFacing, userId, onStreamReady, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamCallbackRef = useRef(onStreamReady);
  const [activeLens, setActiveLens] = useState('natural');
  const [category, setCategory] = useState<'For you' | 'Beauty' | 'Mood' | 'AR'>('For you');
  const [favourites, setFavourites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`nexora_lens_favourites_${userId}`) || '[]'); } catch { return []; }
  });
  const [faceTracking, setFaceTracking] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [cameraError, setCameraError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const activeLensRef = useRef(activeLens);
  activeLensRef.current = activeLens;
  streamCallbackRef.current = onStreamReady;

  useEffect(() => {
    let cancelled = false;
    let cameraStream: MediaStream | null = null;
    let outputStream: MediaStream | null = null;
    let animationFrame = 0;
    let landmarker: any = null;
    let lastDetectAt = 0;
    let latestLandmarks: any[] | null = null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!video || !canvas || !context) return;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) { cameraStream.getTracks().forEach(track => track.stop()); return; }
        video.srcObject = cameraStream;
        await video.play();
        await new Promise<void>(resolve => {
          if (video.readyState >= 2) resolve();
          else video.onloadeddata = () => resolve();
        });
        canvas.width = Math.min(1280, video.videoWidth || 720);
        canvas.height = Math.round(canvas.width * (video.videoHeight || 1280) / (video.videoWidth || 720));
        const canvasStream = canvas.captureStream(30);
        outputStream = new MediaStream([...canvasStream.getVideoTracks(), ...cameraStream.getAudioTracks()]);
        streamCallbackRef.current(outputStream);

        const render = (now: number) => {
          if (cancelled || !video.videoWidth) return;
          const lens = LENSES.find(item => item.id === activeLensRef.current) || LENSES[0];
          context.save();
          if (cameraFacing === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
          }
          context.filter = lens.filter;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          context.filter = 'none';
          if (landmarker && now - lastDetectAt >= 66) {
            try {
              const result = landmarker.detectForVideo(video, now);
              latestLandmarks = result.faceLandmarks?.[0] || null;
            } catch { latestLandmarks = null; }
            lastDetectAt = now;
          }
          if (latestLandmarks) drawLens(context, latestLandmarks, lens, canvas.width, canvas.height, now);
          context.restore();
          animationFrame = requestAnimationFrame(render);
        };
        // Keep the live preview responsive while the optional AR model downloads.
        render(performance.now());

        try {
          const moduleUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/+esm`;
          const vision: any = await import(/* @vite-ignore */ moduleUrl);
          const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT);
          const options = {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          };
          try {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, options);
          } catch {
            landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
              ...options,
              baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
            });
          }
          if (!cancelled) setFaceTracking('ready');
        } catch (error) {
          console.warn('[NEXORA Lenses] Face tracking model unavailable; visual filters remain available.', error);
          if (!cancelled) setFaceTracking('unavailable');
        }
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : 'Could not start the NEXORA camera.');
      }
    };

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close?.();
      streamCallbackRef.current(null);
      outputStream?.getTracks().forEach(track => track.stop());
      cameraStream?.getTracks().forEach(track => track.stop());
      if (video) { video.pause(); video.srcObject = null; }
    };
  }, [cameraFacing]);

  const toggleFavourite = (id: string) => {
    setFavourites(previous => {
      const next = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      localStorage.setItem(`nexora_lens_favourites_${userId}`, JSON.stringify(next));
      return next;
    });
  };

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isCapturing) return;
    setIsCapturing(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The photo could not be saved.')), 'image/jpeg', 0.94));
      onCapture(blob);
    } finally { setIsCapturing(false); }
  };

  const visibleLenses = category === 'For you'
    ? LENSES.filter(item => item.category === 'For you' || favourites.includes(item.id))
    : LENSES.filter(item => item.category === category);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[1.6rem] border border-[#44376F] bg-[#050914] shadow-[0_16px_48px_rgba(0,0,0,.38)]">
        <video ref={videoRef} autoPlay muted playsInline className="hidden" />
        <canvas ref={canvasRef} className="h-full w-full object-cover" aria-label="Live NEXORA camera preview with selected lens" />
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#050914]/75 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_#8A3FFC]" /> NEXORA LENSES
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-[#050914]/75 px-2.5 py-1.5 text-[9px] text-[#D7C7FF] backdrop-blur">
          {faceTracking === 'ready' ? 'Face tracking ready' : faceTracking === 'loading' ? 'Preparing AR…' : 'Filters ready · AR offline'}
        </div>
        {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-[#050914]/90 p-6 text-center text-sm text-rose-200">{cameraError}</div>}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-[10px] text-white">{LENSES.find(item => item.id === activeLens)?.name}</span>
          <button type="button" onClick={() => void capturePhoto()} disabled={isCapturing || Boolean(cameraError)} className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-[#8A3FFC] to-[#4B10F2] text-white shadow-lg disabled:opacity-50" aria-label="Capture filtered photo">
            <Camera className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['For you', 'Beauty', 'Mood', 'AR'] as const).map(item => (
          <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${category === item ? 'border-[#A78BFA] bg-[#7138FF]/25 text-white' : 'border-white/10 bg-white/[0.04] text-[#A39BBF]'}`}>{item}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {visibleLenses.map(lens => {
          const selected = activeLens === lens.id;
          const Icon = lens.sticker === 'crown' ? Crown : lens.sticker === 'cat' ? Cat : lens.sticker === 'glasses' ? Glasses : lens.sticker === 'hearts' ? Heart : lens.sticker === 'halo' ? Sun : lens.sticker === 'sparkles' ? Sparkles : lens.id === 'midnight' || lens.id === 'mono' ? Moon : Star;
          return (
            <div key={lens.id} className="relative min-w-0">
              <button type="button" onClick={() => setActiveLens(lens.id)} className={`flex w-full flex-col items-center gap-1.5 rounded-xl border p-2 transition ${selected ? 'border-[#A78BFA] bg-[#7138FF]/20 text-white' : 'border-white/[0.08] bg-[#120E2B] text-[#B8AED4]'}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7138FF]/35 to-[#1600A3]/40"><Icon className="h-4 w-4" /></span>
                <span className="w-full truncate text-[9px] font-semibold">{lens.name}</span>
              </button>
              <button type="button" onClick={() => toggleFavourite(lens.id)} aria-label={favourites.includes(lens.id) ? 'Remove lens from favourites' : 'Add lens to favourites'} className="absolute right-1 top-1 rounded-full bg-[#050914]/80 p-1 text-[#D7C7FF]"><Heart className={`h-3 w-3 ${favourites.includes(lens.id) ? 'fill-current text-fuchsia-300' : ''}`} /></button>
            </div>
          );
        })}
      </div>
      {faceTracking === 'unavailable' && <p className="text-center text-[10px] text-[#8E88A7]">AR face lenses need a one-time on-device model download. Colour and beauty filters remain available.</p>}
    </div>
  );
}
