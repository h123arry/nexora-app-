const fs = require('fs');

let code = fs.readFileSync('src/components/NexoraImagePlayer.tsx', 'utf8');

// Add import
if (!code.includes('resolveMediaUrl')) {
  code = code.replace("import NexoraWatermark", "import { resolveMediaUrl } from '../utils/indexedDbStorage';\nimport NexoraWatermark");
}

// Add state and effect for resolving images
const stateInjection = `
  const rawImages = images && images.length > 0 ? images : (image ? [image] : []);
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  
  useEffect(() => {
    let active = true;
    Promise.all(rawImages.map(url => resolveMediaUrl(url))).then(resolved => {
      if (active) setDisplayImages(resolved.filter(Boolean) as string[]);
    });
    return () => { active = false; };
  }, [rawImages.join(',')]);

  const isOwnPost = currentUser && (post.userId === currentUser.id || post.username === currentUser.username);
  if (displayImages.length === 0) return null;
`;

// Replace the old displayImages definition
code = code.replace(/const isOwnPost = currentUser[\s\S]*?if \(displayImages\.length === 0\) return null;/m, stateInjection);

fs.writeFileSync('src/components/NexoraImagePlayer.tsx', code);
