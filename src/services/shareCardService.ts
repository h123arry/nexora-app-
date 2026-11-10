export interface PostShareCardInput {
  name?: string;
  username?: string;
  content?: string;
}

export interface PostShareCardCopy {
  author: string;
  handle: string;
  excerpt: string;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';
}

export function buildPostShareCardCopy(input: PostShareCardInput): PostShareCardCopy {
  const author = cleanText(input.name, 70) || 'A NEXORA creator';
  const handle = cleanText(input.username, 40).replace(/^@/, '');
  const excerpt = cleanText(input.content, 240) || 'Discover conversations, creators and communities on NEXORA.';
  return { author, handle: handle ? '@' + handle : '', excerpt };
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = word;
      if (lines >= maxLines) break;
    } else line = candidate;
  }
  if (lines < maxLines && line) {
    const finalLine = lines === maxLines - 1 && context.measureText(line).width > maxWidth
      ? line.slice(0, 90) + '…' : line;
    context.fillText(finalLine, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines;
}

/** Render a branded 4:5 share image without sending post content to a third-party renderer. */
export async function renderPostShareCard(input: PostShareCardInput): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('Share cards are available in a browser.');
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This device cannot render a share card.');
  const copy = buildPostShareCardCopy(input);

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, '#090714');
  background.addColorStop(0.55, '#120E2B');
  background.addColorStop(1, '#050914');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(850, 220, 30, 850, 220, 700);
  glow.addColorStop(0, 'rgba(113,56,255,0.42)');
  glow.addColorStop(1, 'rgba(113,56,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(168,85,247,0.45)';
  context.lineWidth = 3;
  context.strokeRect(54, 54, 972, 1242);

  context.fillStyle = '#C4B5FD';
  context.font = '700 30px Arial, sans-serif';
  context.fillText('THE WORLD’S LIVING SOCIAL NETWORK', 100, 160);
  context.fillStyle = '#FFFFFF';
  context.font = '900 82px Arial, sans-serif';
  context.fillText('NEXORA', 96, 270);
  context.fillStyle = '#A78BFA';
  context.fillRect(100, 330, 140, 8);

  context.fillStyle = '#F5F3FF';
  context.font = '700 48px Arial, sans-serif';
  context.fillText(copy.author, 100, 520);
  context.fillStyle = '#A1A1AA';
  context.font = '32px Arial, sans-serif';
  if (copy.handle) context.fillText(copy.handle, 100, 575);

  context.fillStyle = '#FFFFFF';
  context.font = '500 48px Arial, sans-serif';
  drawWrappedText(context, copy.excerpt, 100, 700, 860, 72, 6);

  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.fillRect(100, 1120, 880, 2);
  context.fillStyle = '#DDD6FE';
  context.font = '700 34px Arial, sans-serif';
  context.fillText('Find your people. Share your world.', 100, 1200);
  context.fillStyle = '#A1A1AA';
  context.font = '26px Arial, sans-serif';
  context.fillText('nexora.app', 100, 1250);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The share card could not be exported.')), 'image/png');
  });
}
