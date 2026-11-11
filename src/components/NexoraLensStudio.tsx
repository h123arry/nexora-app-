import { useEffect, useRef, useState } from 'react';
import { Camera, Heart, Sparkles, Star, Crown, Glasses, Cat, Sun, Moon, Search } from 'lucide-react';

type Facing = 'user' | 'environment';
type Lens = {
  id: string;
  name: string;
  category: 'For you' | 'Beauty' | 'Mood' | 'AR';
  filter: string;
  sticker: 'none' | 'crown' | 'cat' | 'halo' | 'glasses' | 'hearts' | 'sparkles' | 'puppy' | 'bunny' | 'flower' | 'robot' | 'butterfly';
};

type Props = {
  cameraFacing: Facing;
  userId: string;
  captureMode: 'photo' | 'video';
  countdownTimer?: number | null;
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
  { id: 'puppy-face', name: 'Puppy Face', category: 'AR', filter: 'none', sticker: 'puppy' },
  { id: 'bunny-pop', name: 'Bunny Pop', category: 'AR', filter: 'none', sticker: 'bunny' },
  { id: 'flower-crown', name: 'Flower Crown', category: 'AR', filter: 'saturate(1.08)', sticker: 'flower' },
  { id: 'robot-mask', name: 'Robot Mask', category: 'AR', filter: 'contrast(1.08) saturate(1.12)', sticker: 'robot' },
  { id: 'butterfly-dream', name: 'Butterfly Dream', category: 'AR', filter: 'brightness(1.04) saturate(1.12)', sticker: 'butterfly' },
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
  } else if (lens.sticker === 'puppy') {
    context.fillStyle = '#8B5CF6';
    context.strokeStyle = '#E9D5FF';
    context.lineWidth = Math.max(2, eyeDistance * .025);
    for (const side of [-1, 1]) {
      context.beginPath();
      context.ellipse(forehead.x + side * faceWidth * .4, forehead.y + eyeDistance * .12, eyeDistance * .2, eyeDistance * .42, side * 0.25, 0, Math.PI * 2);
      context.fill(); context.stroke();
    }
    context.fillStyle = '#C084FC';
    context.beginPath(); context.ellipse(nose.x, nose.y + eyeDistance * .7, eyeDistance * .13, eyeDistance * .1, 0, 0, Math.PI * 2); context.fill();
  } else if (lens.sticker === 'bunny') {
    context.fillStyle = '#E9D5FF';
    context.strokeStyle = '#B69BFF';
    context.lineWidth = Math.max(2, eyeDistance * .025);
    for (const side of [-1, 1]) {
      context.beginPath(); context.ellipse(forehead.x + side * eyeDistance * .38, forehead.y - eyeDistance * .7, eyeDistance * .17, eyeDistance * .62, side * -0.16, 0, Math.PI * 2); context.fill(); context.stroke();
    }
  } else if (lens.sticker === 'flower') {
    for (let i = 0; i < 7; i += 1) {
      const angle = Math.PI + i * Math.PI / 6;
      const x = forehead.x + Math.cos(angle) * faceWidth * .42;
      const y = forehead.y + Math.sin(angle) * eyeDistance * .25;
      context.fillStyle = i % 2 ? '#D8B4FE' : '#A78BFA';
      context.beginPath(); context.arc(x, y, eyeDistance * .16, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#FDE68A'; context.beginPath(); context.arc(x, y, eyeDistance * .055, 0, Math.PI * 2); context.fill();
    }
  } else if (lens.sticker === 'robot') {
    context.fillStyle = 'rgba(75,16,242,.58)';
    context.strokeStyle = '#D8B4FE';
    context.lineWidth = Math.max(3, eyeDistance * .04);
    context.beginPath(); context.roundRect(leftEye.x - eyeDistance * .34, leftEye.y - eyeDistance * .18, eyeDistance * 1.68, eyeDistance * .58, eyeDistance * .12); context.fill(); context.stroke();
    context.fillStyle = '#F5F7FF';
    for (const eye of [leftEye, rightEye]) { context.beginPath(); context.arc(eye.x, eye.y, eyeDistance * .055, 0, Math.PI * 2); context.fill(); }
  } else if (lens.sticker === 'butterfly') {
    context.fillStyle = '#C4B5FD';
    for (const side of [-1, 1]) {
      context.save(); context.translate(forehead.x + side * faceWidth * .38, forehead.y - eyeDistance * .15); context.rotate(side * -.35);
      context.beginPath(); context.ellipse(0, 0, eyeDistance * .22, eyeDistance * .38, side * .4, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.ellipse(side * eyeDistance * .06, eyeDistance * .28, eyeDistance * .16, eyeDistance * .24, side * -.4, 0, Math.PI * 2); context.fill();
      context.restore();
    }
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

function createThreeLensRuntime(THREE: any, canvas: HTMLCanvasElement, width: number, height: number) {
  const aspect = width / Math.max(1, height);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 30);
  camera.position.z = 10;
  scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-2, 3, 5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x9b5cff, 2.5, 8);
  rimLight.position.set(1, 1, 3);
  scene.add(rimLight);

  const root = new THREE.Group();
  scene.add(root);
  const objects: Record<string, any> = {};
  const makeGroup = (name: string) => {
    const group = new THREE.Group();
    group.name = name;
    root.add(group);
    objects[name] = group;
    return group;
  };
  const violet = new THREE.MeshStandardMaterial({ color: 0x7138ff, metalness: 0.62, roughness: 0.24, emissive: 0x23065c });
  const lilac = new THREE.MeshStandardMaterial({ color: 0xd9c4ff, metalness: 0.35, roughness: 0.2, emissive: 0x392078 });
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x32116e, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.78 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf0c66b, metalness: 0.8, roughness: 0.22 });

  const crown = makeGroup('crown');
  const crownShape = new THREE.Shape();
  crownShape.moveTo(-0.95, -0.28);
  crownShape.lineTo(-0.82, 0.28);
  crownShape.lineTo(-0.38, -0.02);
  crownShape.lineTo(0, 0.62);
  crownShape.lineTo(0.38, -0.02);
  crownShape.lineTo(0.82, 0.28);
  crownShape.lineTo(0.95, -0.28);
  crownShape.closePath();
  const crownGeometry = new THREE.ExtrudeGeometry(crownShape, { depth: 0.16, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.045, bevelThickness: 0.045 });
  crownGeometry.center();
  const crownMesh = new THREE.Mesh(crownGeometry, violet);
  crownMesh.position.y = 0.38;
  crown.add(crownMesh);
  const crownBand = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.16, 0.2), gold);
  crownBand.position.y = -0.18;
  crown.add(crownBand);
  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), lilac);
  crownGem.position.set(0, 0.63, 0.15);
  crown.add(crownGem);

  const cat = makeGroup('cat');
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 4), violet);
    ear.position.set(side * 0.68, 0.56, 0);
    ear.rotation.z = side * -0.28;
    cat.add(ear);
    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.54, 4), lilac);
    innerEar.position.set(side * 0.68, 0.56, 0.13);
    innerEar.rotation.z = side * -0.28;
    cat.add(innerEar);
  }

  const halo = makeGroup('halo');
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.065, 12, 48), gold);
  haloRing.position.y = 0.98;
  haloRing.rotation.x = 0.16;
  halo.add(haloRing);
  const haloGlow = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.018, 8, 48), lilac);
  haloGlow.position.y = 0.98;
  haloGlow.rotation.x = 0.16;
  halo.add(haloGlow);

  const glasses = makeGroup('glasses');
  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.055, 10, 36), lilac);
    lens.position.set(side * 0.48, -0.42, 0.12);
    glasses.add(lens);
    const glassFill = new THREE.Mesh(new THREE.CircleGeometry(0.39, 32), darkGlass);
    glassFill.position.set(side * 0.48, -0.42, 0.08);
    glasses.add(glassFill);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 12), gold);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, -0.42, 0.14);
  glasses.add(bridge);

  const hearts = makeGroup('hearts');
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.28);
  heartShape.bezierCurveTo(-0.5, 0.02, -0.38, 0.42, 0, 0.2);
  heartShape.bezierCurveTo(0.38, 0.42, 0.5, 0.02, 0, -0.28);
  const heartGeometry = new THREE.ExtrudeGeometry(heartShape, { depth: 0.08, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.025 });
  for (const side of [-1, 1]) {
    const heart = new THREE.Mesh(heartGeometry, lilac);
    heart.scale.setScalar(0.55);
    heart.position.set(side * 0.48, -0.42, 0.15);
    hearts.add(heart);
  }

  const sparkles = makeGroup('sparkles');
  for (let i = 0; i < 6; i += 1) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13 + (i % 2) * 0.06, 0), i % 2 ? gold : lilac);
    const angle = i * Math.PI / 3;
    star.position.set(Math.cos(angle) * 1.02, 0.15 + Math.sin(angle) * 0.62, 0.12);
    sparkles.add(star);
  }

  const puppy = makeGroup('puppy');
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), violet);
    ear.scale.set(0.82, 1.5, 0.55);
    ear.position.set(side * 0.76, -0.02, 0.08);
    ear.rotation.z = side * -0.24;
    puppy.add(ear);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), lilac);
  muzzle.scale.set(1.1, 0.72, 0.48);
  muzzle.position.set(0, -0.62, 0.22);
  puppy.add(muzzle);
  const puppyNose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), darkGlass);
  puppyNose.position.set(0, -0.53, 0.47);
  puppy.add(puppyNose);

  const bunny = makeGroup('bunny');
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.2, 16), lilac);
    ear.position.set(side * 0.42, 0.8, 0);
    ear.rotation.z = side * -0.16;
    bunny.add(ear);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.92, 12), violet);
    inner.position.set(side * 0.42, 0.82, 0.12);
    inner.rotation.z = side * -0.16;
    bunny.add(inner);
  }

  const flower = makeGroup('flower');
  for (let i = 0; i < 9; i += 1) {
    const angle = Math.PI + i * Math.PI / 8;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), i % 2 ? lilac : violet);
    petal.scale.set(0.72, 1.15, 0.42);
    petal.position.set(Math.cos(angle) * 0.9, 0.42 + Math.sin(angle) * 0.42, 0.12);
    flower.add(petal);
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), gold);
    center.position.copy(petal.position);
    center.position.z += 0.13;
    flower.add(center);
  }

  const robot = makeGroup('robot');
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62, 0.22), darkGlass);
  visor.position.set(0, -0.42, 0.12);
  robot.add(visor);
  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.72, 0.12), lilac);
  visorFrame.position.set(0, -0.42, 0.02);
  robot.add(visorFrame);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), gold);
    eye.position.set(side * 0.48, -0.42, 0.28);
    robot.add(eye);
  }
  const antenna = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), violet);
  antenna.position.set(0, 0.48, 0.12);
  robot.add(antenna);

  const butterfly = makeGroup('butterfly');
  for (const side of [-1, 1]) {
    const upperWing = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), lilac);
    upperWing.scale.set(1.05, 1.35, 0.18);
    upperWing.position.set(side * 0.68, 0.28, 0.1);
    upperWing.rotation.z = side * -0.28;
    butterfly.add(upperWing);
    const lowerWing = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), violet);
    lowerWing.scale.set(0.9, 1.2, 0.18);
    lowerWing.position.set(side * 0.62, -0.22, 0.12);
    lowerWing.rotation.z = side * 0.3;
    butterfly.add(lowerWing);
  }
  const butterflyBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.52, 4, 8), gold);
  butterflyBody.position.set(0, 0.02, 0.22);
  butterfly.add(butterflyBody);

  const setLens = (sticker: Lens['sticker']) => {
    Object.entries(objects).forEach(([key, group]) => { group.visible = sticker === key || (sticker === 'sparkles' && key === 'sparkles'); });
  };
  const render = () => renderer.render(scene, camera);
  const dispose = () => {
    renderer.dispose();
    Object.values(objects).forEach((group: any) => group.traverse((item: any) => {
      item.geometry?.dispose?.();
      if (Array.isArray(item.material)) item.material.forEach((material: any) => material.dispose?.());
      else item.material?.dispose?.();
    }));
  };
  return { renderer, scene, camera, root, objects, setLens, render, dispose };
}

export default function NexoraLensStudio({ cameraFacing, userId, captureMode, countdownTimer = null, onStreamReady, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamCallbackRef = useRef(onStreamReady);
  const [activeLens, setActiveLens] = useState('natural');
  const [category, setCategory] = useState<'For you' | 'Beauty' | 'Mood' | 'AR' | 'Favourites'>('For you');
  const [searchQuery, setSearchQuery] = useState('');
  const [beautyIntensity, setBeautyIntensity] = useState(32);
  const beautyIntensityRef = useRef(32);
  beautyIntensityRef.current = beautyIntensity;
  const [favourites, setFavourites] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`nexora_lens_favourites_${userId}`) || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  });
  const [faceTracking, setFaceTracking] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [threeReady, setThreeReady] = useState(false);
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
    let threeRuntime: any = null;
    const threeCanvas = document.createElement('canvas');
    let lastDetectAt = 0;
    let latestLandmarks: any[] | null = null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!video || !canvas || !context) return;
    setCameraError('');
    setFaceTracking('loading');
    setThreeReady(false);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: captureMode === 'video',
        });
        if (cancelled) { cameraStream.getTracks().forEach(track => track.stop()); return; }
        video.srcObject = cameraStream;
        await video.play();
        await new Promise<void>(resolve => {
          if (video.readyState >= 2) resolve();
          else video.onloadeddata = () => resolve();
        });
        const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        const constrainedDevice = (typeof deviceMemory === 'number' && deviceMemory <= 4) || navigator.hardwareConcurrency <= 4;
        const renderWidth = constrainedDevice ? 720 : 1280;
        canvas.width = Math.min(renderWidth, video.videoWidth || 720);
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
          if (landmarker && now - lastDetectAt >= (constrainedDevice ? 100 : 66)) {
            try {
              const result = landmarker.detectForVideo(video, now);
              latestLandmarks = result.faceLandmarks?.[0] || null;
            } catch { latestLandmarks = null; }
            lastDetectAt = now;
          }
          if (latestLandmarks && (lens.id === 'soft-light' || lens.id === 'violet-glow') && beautyIntensityRef.current > 0) {
            const forehead = point(latestLandmarks, 10, canvas.width, canvas.height);
            const chin = point(latestLandmarks, 152, canvas.width, canvas.height);
            const leftCheek = point(latestLandmarks, 234, canvas.width, canvas.height);
            const rightCheek = point(latestLandmarks, 454, canvas.width, canvas.height);
            if (forehead && chin && leftCheek && rightCheek) {
              context.save();
              context.beginPath();
              context.ellipse(
                (leftCheek.x + rightCheek.x) / 2,
                (forehead.y + chin.y) / 2,
                Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y) * 0.48,
                Math.abs(chin.y - forehead.y) * 0.49,
                0, 0, Math.PI * 2,
              );
              context.clip();
              context.globalAlpha = beautyIntensityRef.current / 100 * 0.28;
              context.filter = 'blur(2.4px) saturate(1.04)';
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              context.restore();
            }
          }
          if (latestLandmarks) {
            if (threeRuntime) {
              const leftEye = point(latestLandmarks, 33, canvas.width, canvas.height);
              const rightEye = point(latestLandmarks, 263, canvas.width, canvas.height);
              const forehead = point(latestLandmarks, 10, canvas.width, canvas.height);
              const nose = point(latestLandmarks, 1, canvas.width, canvas.height);
              if (leftEye && rightEye && forehead && nose) {
                const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
                const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
                const eyeMidX = (leftEye.x + rightEye.x) / 2;
                const centerX = eyeMidX;
                const centerY = forehead.y + eyeDistance * 0.08;
                const aspect = canvas.width / canvas.height;
                const yaw = Math.max(-0.8, Math.min(0.8, ((nose.x - eyeMidX) / Math.max(1, eyeDistance)) * 1.2));
                threeRuntime.root.position.set((centerX / canvas.width - 0.5) * 2 * aspect, (0.5 - centerY / canvas.height) * 2, 0);
                threeRuntime.root.rotation.set(0, yaw, -eyeAngle);
                threeRuntime.root.scale.setScalar(eyeDistance / canvas.width * 1.8);
                threeRuntime.setLens(lens.sticker);
                const activeModel = threeRuntime.objects[lens.sticker];
                if (activeModel) {
                  if (activeModel.userData.baseY === undefined) activeModel.userData.baseY = activeModel.position.y;
                  activeModel.rotation.y = Math.sin(now / 620) * 0.12;
                  activeModel.position.y = activeModel.userData.baseY + Math.sin(now / 360) * 0.025;
                }
                if (lens.sticker !== 'none') {
                  threeRuntime.render();
                  context.drawImage(threeCanvas, 0, 0, canvas.width, canvas.height);
                }
              }
            } else {
              drawLens(context, latestLandmarks, lens, canvas.width, canvas.height, now);
            }
          }
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
          if (!cancelled) {
            setFaceTracking('ready');
            try {
              const threeUrl = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
              const THREE: any = await import(/* @vite-ignore */ threeUrl);
              if (!cancelled) {
                threeCanvas.width = canvas.width;
                threeCanvas.height = canvas.height;
                threeRuntime = createThreeLensRuntime(THREE, threeCanvas, canvas.width, canvas.height);
                setThreeReady(true);
              }
            } catch (threeError) {
              console.warn('[NEXORA Lenses] 3D renderer unavailable; using tracked 2D lens overlays.', threeError);
            }
          }
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
      threeRuntime?.dispose?.();
      streamCallbackRef.current(null);
      outputStream?.getTracks().forEach(track => track.stop());
      cameraStream?.getTracks().forEach(track => track.stop());
      if (video) { video.pause(); video.srcObject = null; }
    };
  }, [cameraFacing, captureMode]);

  const toggleFavourite = (id: string) => {
    setFavourites(previous => {
      const next = previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id];
      try {
        localStorage.setItem(`nexora_lens_favourites_${userId}`, JSON.stringify(next));
      } catch {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'NEXORA could not save lens favourites on this device.' }));
      }
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

  const categoryLenses = category === 'For you'
    ? LENSES.filter(item => item.category === 'For you' || favourites.includes(item.id))
    : category === 'Favourites'
      ? LENSES.filter(item => favourites.includes(item.id))
      : LENSES.filter(item => item.category === category);
  const visibleLenses = categoryLenses.filter(item => item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[1.6rem] border border-[#44376F] bg-[#050914] shadow-[0_16px_48px_rgba(0,0,0,.38)]">
        <video ref={videoRef} autoPlay muted playsInline className="hidden" />
        <canvas ref={canvasRef} className="h-full w-full object-cover" aria-label="Live NEXORA camera preview with selected lens" />
        {countdownTimer !== null && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050914]/20"><span className="animate-ping text-7xl font-black text-white drop-shadow-[0_0_24px_rgba(138,63,252,.9)]">{countdownTimer}</span></div>}
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-[#050914]/75 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_#8A3FFC]" /> NEXORA LENSES
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-[#050914]/75 px-2.5 py-1.5 text-[9px] text-[#D7C7FF] backdrop-blur">
          {threeReady ? '3D AR ready' : faceTracking === 'ready' ? 'Face tracking ready' : faceTracking === 'loading' ? 'Preparing AR…' : 'Filters ready · AR offline'}
        </div>
        {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-[#050914]/90 p-6 text-center text-sm text-rose-200">{cameraError}</div>}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-[10px] text-white">{LENSES.find(item => item.id === activeLens)?.name}</span>
          {captureMode === 'photo' && (
            <button type="button" onClick={() => void capturePhoto()} disabled={isCapturing || Boolean(cameraError)} className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-[#8A3FFC] to-[#4B10F2] text-white shadow-lg disabled:opacity-50" aria-label="Capture filtered photo">
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E88A7]" />
        <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Find a lens" aria-label="Search lenses" className="w-full rounded-xl border border-white/10 bg-[#120E2B] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-[#756D91] focus:border-[#8A3FFC]" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['For you', 'Beauty', 'Mood', 'AR', 'Favourites'] as const).map(item => (
          <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${category === item ? 'border-[#A78BFA] bg-[#7138FF]/25 text-white' : 'border-white/10 bg-white/[0.04] text-[#A39BBF]'}`}>{item}</button>
        ))}
      </div>
      {(category === 'Beauty' || ['soft-light', 'violet-glow'].includes(activeLens)) && (
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#120E2B] px-3 py-2.5">
          <span className="shrink-0 text-[10px] font-semibold text-[#D7C7FF]">Skin softening</span>
          <input type="range" min="0" max="100" value={beautyIntensity} onChange={event => setBeautyIntensity(Number(event.target.value))} className="min-w-0 flex-1 accent-violet-500" aria-label="Skin softening intensity" />
          <span className="w-8 text-right text-[10px] tabular-nums text-[#A39BBF]">{beautyIntensity}%</span>
        </label>
      )}
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
