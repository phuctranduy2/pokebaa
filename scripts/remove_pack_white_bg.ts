import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PACKS = [
  {
    id: 'pack_151',
    url: 'https://collectorstore.com/cdn/shop/files/pokemon-scarlet-violet-151-booster-pack-789857.png?v=1735144602&width=600',
    out: 'public/packs/pokemon151.png',
  },
  {
    id: 'pack_crown_zenith',
    url: 'https://collectorstore.com/cdn/shop/files/pokemon-crown-zenith-booster-pack-636273.jpg?v=1727285037&width=600',
    out: 'public/packs/crownZenith.png',
  },
  {
    id: 'pack_shrouded_fable',
    url: 'https://collectorstore.com/cdn/shop/files/pokemon-scarlet-violet-shrouded-fable-booster-pack-124648.jpg?v=1730237254&width=600',
    out: 'public/packs/shroudedFable.png',
  },
  {
    id: 'pack_temporal_forces',
    url: 'https://collectorstore.com/cdn/shop/files/wfpack.png?v=1752782109&width=600',
    out: 'public/packs/temporalForces.png',
  },
  {
    id: 'pack_30th_common',
    url: 'https://collectorstore.com/cdn/shop/files/CollectorStore00001_ba6eb345-0e74-42a1-bd69-0e20bf9253f2.jpg?v=1790611459&width=600',
    out: 'public/packs/pokemon30thCommon.png',
  },
  {
    id: 'pack_destined_rivals',
    url: 'https://collectorstore.com/cdn/shop/files/CollectorStore00001_ba6eb345-0e74-42a1-bd69-0e20bf9253f2.jpg?v=1790611459&width=600',
    out: 'public/packs/destinedRivals.png',
  },
];

const BOXES = [
  {
    id: 'box_30th_common',
    url: 'https://static.wixstatic.com/media/ee561a_38b02bde06b34bd294aa9950bfd3ee78~mv2.png/v1/fit/w_500,h_500,q_90/file.png',
    out: 'public/boxes/pokemon30thCommon.png',
  },
  {
    id: 'box_151',
    url: 'https://screenfreegames.com/cdn/shop/files/pokemondestinedrivalselitetrainerbox.png?v=1746559914',
    out: 'public/boxes/pokemon151.png',
  },
  {
    id: 'box_destined_rivals',
    url: 'https://collectorstore.com/cdn/shop/files/pokemon-scarlet-violet-destined-rivals-elite-trainer-box-releasing-5-30-2025-233508.jpg?v=1748056603&width=600',
    out: 'public/boxes/destinedRivals.png',
  },
  {
    id: 'box_crown_zenith',
    url: 'https://acgamesonline.com/cdn/shop/files/raw--17_1200x1200.png?v=1711036389',
    out: 'public/boxes/crownZenith.png',
  },
  {
    id: 'box_shrouded_fable',
    url: 'https://cdn.shoplightspeed.com/shops/643438/files/72436375/pokemon-me02-phantasmal-flames-elite-trainer-box.jpg',
    out: 'public/boxes/shroudedFable.png',
  },
];

function isNearWhite(r: number, g: number, b: number, a: number): boolean {
  if (a < 20) return true;
  // Check if pixel is white, off-white or very light shadow on white
  const minVal = Math.min(r, g, b);
  const maxVal = Math.max(r, g, b);
  const saturation = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;
  
  // White or near white (r,g,b > 230)
  if (r > 225 && g > 225 && b > 225) return true;
  
  // Very light gray shadow around pack (brightness > 210, low saturation < 0.12)
  if (minVal > 200 && saturation < 0.12) return true;

  return false;
}

async function removeWhiteBackground(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed BFS from all borders (top, bottom, left, right edges)
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  while (queue.length > 0) {
    const cy = queue.pop()!;
    const cx = queue.pop()!;

    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    const pixelIndex = cy * width + cx;
    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;

    const dataIndex = pixelIndex * channels;
    const r = data[dataIndex];
    const g = data[dataIndex + 1];
    const b = data[dataIndex + 2];
    const a = data[dataIndex + 3];

    if (isNearWhite(r, g, b, a)) {
      // Set pixel transparent
      data[dataIndex + 3] = 0;

      // Expand to 4 neighbors
      if (cx > 0 && !visited[cy * width + (cx - 1)]) queue.push(cx - 1, cy);
      if (cx < width - 1 && !visited[cy * width + (cx + 1)]) queue.push(cx + 1, cy);
      if (cy > 0 && !visited[(cy - 1) * width + cx]) queue.push(cx, cy - 1);
      if (cy < height - 1 && !visited[(cy + 1) * width + cx]) queue.push(cx, cy + 1);
    }
  }

  // Smooth edge defringing: if transparent pixel is adjacent to pack, feather slightly
  return sharp(data, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .png()
    .toBuffer();
}

async function processItem(item: { id: string; url: string; out: string }) {
  console.log(`Processing ${item.id} from ${item.url}...`);
  try {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const inputBuf = Buffer.from(arrayBuffer);

    const transparentBuf = await removeWhiteBackground(inputBuf);
    const dir = path.dirname(item.out);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(item.out, transparentBuf);
    console.log(`Saved transparent PNG: ${item.out}`);
  } catch (err) {
    console.error(`Failed ${item.id}:`, err);
  }
}

async function main() {
  for (const pack of PACKS) {
    await processItem(pack);
  }
  for (const box of BOXES) {
    await processItem(box);
  }
  console.log('All packs and boxes processed!');
}

main();
