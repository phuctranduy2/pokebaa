import * as THREE from 'three';

/**
 * Lightweight, zero-lag procedural PBR textures, cloudy sky dome, outdoor IBL,
 * contact shadow resources, and atmospheric particle textures.
 * All textures are cached as singletons so GPU memory & draw calls stay minimal.
 */

function safeCreateCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

function makeTiledTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean,
  anisotropy = 4
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Deterministic fast hash for seamless procedural noise
function hash2(x: number, y: number, period: number): number {
  const px = ((x % period) + period) % period;
  const py = ((y % period) + period) % period;
  let n = (px * 374761393 + py * 668265263) ^ 0x5bf03635;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function valueNoise2D(x: number, y: number, period: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash2(xi, yi, period);
  const n10 = hash2(xi + 1, yi, period);
  const n01 = hash2(xi, yi + 1, period);
  const n11 = hash2(xi + 1, yi + 1, period);
  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return nx0 + (nx1 - nx0) * v;
}

function fbmPeriodic(u: number, v: number, baseFreq: number, octaves = 4): number {
  let amp = 0.5;
  let freq = baseFreq;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise2D(u * freq, v * freq, freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// 1. ASPHALT ROAD PBR TEXTURES (Subtle aggregate grain + bump)
// ---------------------------------------------------------------------------
let cachedAsphalt: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;

export function getAsphaltTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null {
  if (cachedAsphalt) return cachedAsphalt;
  const diff = safeCreateCanvas(256, 256);
  const bump = safeCreateCanvas(256, 256);
  if (!diff || !bump) return null;

  const dImg = diff.ctx.createImageData(256, 256);
  const bImg = bump.ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const coarse = fbmPeriodic(x / 256, y / 256, 8, 3);
      const grain = hash2(x, y, 256);
      // Keep asphalt clean & smooth at distance like Danang3D screenshots (subtle luminance modulation)
      const val = Math.round(218 + (coarse - 0.5) * 24 + (grain - 0.5) * 16);
      dImg.data[idx] = val;
      dImg.data[idx + 1] = val + 1;
      dImg.data[idx + 2] = Math.min(255, val + 4);
      dImg.data[idx + 3] = 255;

      const bVal = Math.round(128 + (coarse - 0.5) * 48 + (grain - 0.5) * 54);
      bImg.data[idx] = bVal;
      bImg.data[idx + 1] = bVal;
      bImg.data[idx + 2] = bVal;
      bImg.data[idx + 3] = 255;
    }
  }
  diff.ctx.putImageData(dImg, 0, 0);
  bump.ctx.putImageData(bImg, 0, 0);

  cachedAsphalt = {
    map: makeTiledTexture(diff.canvas, 1, 1, true, 4),
    bumpMap: makeTiledTexture(bump.canvas, 1, 1, false, 4),
  };
  return cachedAsphalt;
}

// ---------------------------------------------------------------------------
// 2. GRANITE / CONCRETE SIDEWALK PAVER TEXTURES
// ---------------------------------------------------------------------------
let cachedSidewalk: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;

export function getSidewalkPaverTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null {
  if (cachedSidewalk) return cachedSidewalk;
  const diff = safeCreateCanvas(256, 256);
  const bump = safeCreateCanvas(256, 256);
  if (!diff || !bump) return null;

  const tiles = 4;
  const step = 256 / tiles;
  diff.ctx.fillStyle = '#c4c7ce';
  diff.ctx.fillRect(0, 0, 256, 256);
  bump.ctx.fillStyle = '#d8d8d8';
  bump.ctx.fillRect(0, 0, 256, 256);

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const n = hash2(tx * 7 + 3, ty * 11 + 5, 64);
      const tone = Math.round(212 + (n - 0.5) * 18);
      diff.ctx.fillStyle = `rgb(${tone},${tone + 1},${tone + 3})`;
      diff.ctx.fillRect(tx * step + 2, ty * step + 2, step - 4, step - 4);

      // Subtle inner stone speckle
      for (let s = 0; s < 26; s++) {
        const sx = tx * step + 3 + hash2(tx * 31 + s, ty * 17, 128) * (step - 6);
        const sy = ty * step + 3 + hash2(tx * 19, ty * 29 + s, 128) * (step - 6);
        diff.ctx.fillStyle = s % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(30,41,59,0.06)';
        diff.ctx.fillRect(sx, sy, 2, 2);
      }

      // Grout lines
      diff.ctx.strokeStyle = 'rgba(71, 85, 105, 0.34)';
      diff.ctx.lineWidth = 2;
      diff.ctx.strokeRect(tx * step + 1, ty * step + 1, step - 2, step - 2);

      bump.ctx.fillStyle = `rgb(${Math.round(210 + (n - 0.5) * 20)},${Math.round(210 + (n - 0.5) * 20)},${Math.round(210 + (n - 0.5) * 20)})`;
      bump.ctx.fillRect(tx * step + 2, ty * step + 2, step - 4, step - 4);
      bump.ctx.strokeStyle = '#505050';
      bump.ctx.lineWidth = 3;
      bump.ctx.strokeRect(tx * step + 1, ty * step + 1, step - 2, step - 2);
    }
  }

  cachedSidewalk = {
    map: makeTiledTexture(diff.canvas, 1, 1, true, 4),
    bumpMap: makeTiledTexture(bump.canvas, 1, 1, false, 4),
  };
  return cachedSidewalk;
}

// ---------------------------------------------------------------------------
// 3. TERRACOTTA RED BRICK BRIDGE WALKWAY TEXTURES (Cầu Rồng & Waterfront)
// ---------------------------------------------------------------------------
let cachedTerracotta: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;

export function getTerracottaWalkwayTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null {
  if (cachedTerracotta) return cachedTerracotta;
  const diff = safeCreateCanvas(256, 256);
  const bump = safeCreateCanvas(256, 256);
  if (!diff || !bump) return null;

  diff.ctx.fillStyle = '#5c4338';
  diff.ctx.fillRect(0, 0, 256, 256);
  bump.ctx.fillStyle = '#484848';
  bump.ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 4;
  const rh = 256 / rows;
  const cw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * cw + offset;
      const by = r * rh;
      const n = hash2((c + 4) * 13, r * 17, 64);
      const red = Math.round(182 + (n - 0.5) * 28);
      const grn = Math.round(108 + (n - 0.5) * 20);
      const blu = Math.round(76 + (n - 0.5) * 16);
      diff.ctx.fillStyle = `rgb(${red},${grn},${blu})`;
      diff.ctx.fillRect(bx + 2, by + 2, cw - 4, rh - 4);

      // Subtle bevel top highlight
      diff.ctx.fillStyle = 'rgba(255, 224, 196, 0.14)';
      diff.ctx.fillRect(bx + 2, by + 2, cw - 4, 3);

      const bTone = Math.round(215 + (n - 0.5) * 24);
      bump.ctx.fillStyle = `rgb(${bTone},${bTone},${bTone})`;
      bump.ctx.fillRect(bx + 2, by + 2, cw - 4, rh - 4);
    }
  }

  cachedTerracotta = {
    map: makeTiledTexture(diff.canvas, 1, 1, true, 4),
    bumpMap: makeTiledTexture(bump.canvas, 1, 1, false, 4),
  };
  return cachedTerracotta;
}

// ---------------------------------------------------------------------------
// 4. NATURAL GRASS TURF TEXTURE (Replaces flat green exterior ground)
// ---------------------------------------------------------------------------
let cachedGrassTex: THREE.CanvasTexture | null = null;

export function getGrassTurfTexture(): THREE.CanvasTexture | null {
  if (cachedGrassTex) return cachedGrassTex;
  const res = safeCreateCanvas(256, 256);
  if (!res) return null;

  const img = res.ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const patch = fbmPeriodic(x / 256, y / 256, 4, 3);
      const blade = hash2(x, y, 256);
      const lum = 0.85 + (patch - 0.5) * 0.24 + (blade - 0.5) * 0.12;
      img.data[idx] = Math.min(255, Math.round(195 * lum));
      img.data[idx + 1] = Math.min(255, Math.round(235 * lum));
      img.data[idx + 2] = Math.min(255, Math.round(180 * lum));
      img.data[idx + 3] = 255;
    }
  }
  res.ctx.putImageData(img, 0, 0);
  cachedGrassTex = makeTiledTexture(res.canvas, 1, 1, true, 4);
  return cachedGrassTex;
}

// ---------------------------------------------------------------------------
// 5. DISTANT CITY SKYLINE TOWER WINDOWS (Day glass + Night lit grid)
// ---------------------------------------------------------------------------
let cachedSkyline: { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } | null = null;

export function getSkylineTowerTextures(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } | null {
  if (cachedSkyline) return cachedSkyline;
  const diff = safeCreateCanvas(128, 256);
  const emis = safeCreateCanvas(128, 256);
  if (!diff || !emis) return null;

  diff.ctx.fillStyle = '#94a3b8';
  diff.ctx.fillRect(0, 0, 128, 256);
  emis.ctx.fillStyle = '#000000';
  emis.ctx.fillRect(0, 0, 128, 256);

  const cols = 16;
  const rows = 32;
  const cw = 128 / cols;
  const rh = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rnd = hash2(c * 19 + 3, r * 23 + 7, 128);
      diff.ctx.fillStyle = rnd > 0.5 ? '#64748b' : '#475569';
      diff.ctx.fillRect(c * cw + 1, r * rh + 2, cw - 2, rh - 3);

      // ~42% of apartments/offices lit warmly or cool-white at night
      if (rnd > 0.58) {
        emis.ctx.fillStyle = rnd > 0.84 ? '#fde68a' : rnd > 0.70 ? '#fef3c7' : '#bae6fd';
        emis.ctx.fillRect(c * cw + 1, r * rh + 2, cw - 2, rh - 3);
      }
    }
  }

  cachedSkyline = {
    map: makeTiledTexture(diff.canvas, 1, 1, true, 2),
    emissiveMap: makeTiledTexture(emis.canvas, 1, 1, true, 2),
  };
  return cachedSkyline;
}

// ---------------------------------------------------------------------------
// 6. HUMAN FABRIC / DENIM / SKIN / HAIR / BACKPACK TEXTURES
// ---------------------------------------------------------------------------
const cachedHumanTex = new Map<string, THREE.CanvasTexture>();

export function getHumanSlotTexture(
  kind: 'shirt' | 'pants' | 'skin' | 'hair' | 'backpack' | 'shoes'
): THREE.CanvasTexture | null {
  const existing = cachedHumanTex.get(kind);
  if (existing) return existing;

  const size = 128;
  const res = safeCreateCanvas(size, size);
  if (!res) return null;
  const { canvas, ctx } = res;

  if (kind === 'pants') {
    // Seamless crisp diagonal denim / chino twill weave
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const diag = ((x + y) % 4 === 0 ? 9 : (x + y) % 4 === 2 ? -5 : 1);
        const weave = fbmPeriodic(x / size, y / size, 6, 3);
        const grain = (hash2(x, y, size) - 0.5) * 14;
        const v = Math.max(198, Math.min(255, Math.round(234 + diag + (weave - 0.5) * 20 + grain)));
        img.data[idx] = v;
        img.data[idx + 1] = v;
        img.data[idx + 2] = Math.min(255, v + 4);
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (kind === 'shirt') {
    // Seamless woven cotton / linen cross-hatch micro-texture
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const warp = x % 3 === 0 ? 5 : -2;
        const weft = y % 3 === 0 ? 5 : -2;
        const soft = fbmPeriodic(x / size, y / size, 4, 2);
        const grain = (hash2(x, y, size) - 0.5) * 10;
        const v = Math.max(208, Math.min(255, Math.round(238 + (warp + weft) * 0.65 + (soft - 0.5) * 16 + grain)));
        img.data[idx] = v;
        img.data[idx + 1] = v;
        img.data[idx + 2] = v;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else if (kind === 'hair') {
    // Seamless vertical hair strand streaks
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 2) {
      const n = hash2(x, 1, size);
      const tone = Math.round(205 + n * 50);
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
      ctx.fillRect(x, 0, 2, size);
    }
  } else if (kind === 'backpack') {
    // Canvas/nylon backpack weave + stitched pocket trim
    ctx.fillStyle = '#d4d0c4';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const n = hash2(x, y, size);
        ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 14, size - 20, size - 28);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(18, 44, size - 36, 4);
  } else if (kind === 'shoes') {
    // Seamless fine pebbled leather / sneaker canvas grain
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const pebble = fbmPeriodic(x / size, y / size, 12, 2);
        const micro = (hash2(x, y, size) - 0.5) * 14;
        const v = Math.max(202, Math.min(255, Math.round(236 + (pebble - 0.5) * 24 + micro)));
        img.data[idx] = v;
        img.data[idx + 1] = v;
        img.data[idx + 2] = v;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  } else {
    // Seamless warm skin micro-variation (soft realistic skin tone without radial tile seams)
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const tone = fbmPeriodic(x / size, y / size, 4, 3);
        const pore = (hash2(x, y, size) - 0.5) * 6;
        const base = 248 + (tone - 0.5) * 10 + pore;
        img.data[idx] = Math.max(230, Math.min(255, Math.round(base + 2)));
        img.data[idx + 1] = Math.max(222, Math.min(255, Math.round(base - 3)));
        img.data[idx + 2] = Math.max(216, Math.min(255, Math.round(base - 6)));
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = makeTiledTexture(canvas, 1, 1, true, 2);
  cachedHumanTex.set(kind, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// 7. SHARED CONTACT SHADOW DISC (Zero-cost grounding for distant NPCs)
// ---------------------------------------------------------------------------
let cachedContactShadowMat: THREE.MeshBasicMaterial | null = null;
let cachedContactShadowGeo: THREE.CircleGeometry | null = null;

export function getContactShadowResources(): {
  geometry: THREE.CircleGeometry;
  material: THREE.MeshBasicMaterial;
} | null {
  if (cachedContactShadowMat && cachedContactShadowGeo) {
    return { geometry: cachedContactShadowGeo, material: cachedContactShadowMat };
  }
  const res = safeCreateCanvas(64, 64);
  if (!res) return null;
  const grad = res.ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  res.ctx.fillStyle = grad;
  res.ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(res.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  cachedContactShadowGeo = new THREE.CircleGeometry(0.32, 10);
  cachedContactShadowGeo.rotateX(-Math.PI / 2);

  cachedContactShadowMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  return { geometry: cachedContactShadowGeo, material: cachedContactShadowMat };
}

// ---------------------------------------------------------------------------
// 8. DRAGON BRIDGE NIGHT SMOKE PUFF & ADDITIVE GLOW SPRITE TEXTURES
// ---------------------------------------------------------------------------
let cachedSmokeTex: THREE.CanvasTexture | null = null;
let cachedGlowTex: THREE.CanvasTexture | null = null;

export function getSoftSmokeTexture(): THREE.CanvasTexture | null {
  if (cachedSmokeTex) return cachedSmokeTex;
  const res = safeCreateCanvas(128, 128);
  if (!res) return null;
  const { canvas, ctx } = res;
  ctx.clearRect(0, 0, 128, 128);

  // Overlapping soft cloud puffs for natural volumetric mist silhouette
  const puffs = [
    [64, 64, 48, 0.36],
    [48, 56, 34, 0.28],
    [80, 58, 32, 0.26],
    [58, 76, 32, 0.24],
    [74, 46, 28, 0.22],
  ];
  for (const [cx, cy, r, a] of puffs) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
    g.addColorStop(0.55, `rgba(241, 245, 249, ${a * 0.55})`);
    g.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  cachedSmokeTex = new THREE.CanvasTexture(canvas);
  cachedSmokeTex.colorSpace = THREE.SRGBColorSpace;
  cachedSmokeTex.needsUpdate = true;
  return cachedSmokeTex;
}

export function getGlowSpriteTexture(): THREE.CanvasTexture | null {
  if (cachedGlowTex) return cachedGlowTex;
  const res = safeCreateCanvas(64, 64);
  if (!res) return null;
  const grad = res.ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.10)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  res.ctx.fillStyle = grad;
  res.ctx.fillRect(0, 0, 64, 64);
  cachedGlowTex = new THREE.CanvasTexture(res.canvas);
  cachedGlowTex.colorSpace = THREE.SRGBColorSpace;
  cachedGlowTex.needsUpdate = true;
  return cachedGlowTex;
}

// ---------------------------------------------------------------------------
// 9. CLOUDY EQUIRECTANGULAR SKY DOME DRAWER (Pre-computed Cloud Buffer)
// ---------------------------------------------------------------------------
export interface CloudySkyDrawer {
  draw: (topHex: number, midHex: number, horizonHex: number, lampFactor: number, rainFactor?: number) => void;
}

export function createCloudySkyDrawer(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  tex: THREE.CanvasTexture
): CloudySkyDrawer {
  const w = canvas.width;
  const h = canvas.height;
  // Precompute cloud alpha/highlight map once in memory (0 ms per frame during steady play)
  const cloudHeight = Math.floor(h * 0.58);
  const cloudDensity = new Float32Array(w * cloudHeight);
  const cloudShade = new Float32Array(w * cloudHeight);
  const stormDensity = new Float32Array(w * cloudHeight);

  for (let y = 0; y < cloudHeight; y++) {
    const v = y / cloudHeight; // 0 = zenith, 1 = horizon
    // Soft bell envelope: clouds appear mainly in mid-sky (v = 0.25..0.88), fading cleanly before zenith & horizon
    const horizonFade = Math.sin(Math.pow(v, 0.85) * Math.PI);
    const bandMask = Math.max(0, horizonFade * (0.35 + 0.65 * Math.sin(v * Math.PI * 0.92)));
    const stormBand = Math.max(0.28, Math.sin(Math.pow(v, 0.72) * Math.PI * 0.96));
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const n1 = fbmPeriodic(u, v * 0.8, 6, 4);
      const n2 = fbmPeriodic(u + 0.37, v * 0.8 + 0.19, 12, 3);
      const raw = n1 * 0.72 + n2 * 0.28;
      // Threshold into crisp fluffy cumulus puffs
      const d = THREE.MathUtils.smoothstep(raw, 0.50, 0.78) * bandMask;
      const sd = THREE.MathUtils.smoothstep(raw, 0.24, 0.62) * stormBand;
      const idx = y * w + x;
      cloudDensity[idx] = d;
      stormDensity[idx] = sd;
      // Top-lit cloud highlight vs cooler underside
      const topSample = y > 2 ? fbmPeriodic(u, ((y - 3) / cloudHeight) * 0.8, 6, 3) : raw;
      cloudShade[idx] = THREE.MathUtils.clamp(0.55 + (raw - topSample) * 4.5 + (1 - v) * 0.22, 0.15, 1.0);
    }
  }

  const img = ctx.createImageData(w, h);
  const cTop = new THREE.Color();
  const cMid = new THREE.Color();
  const cHor = new THREE.Color();
  const tmpCol = new THREE.Color();

  const draw = (topHex: number, midHex: number, horizonHex: number, lampFactor: number, rainFactor: number = 0) => {
    cTop.setHex(topHex);
    cMid.setHex(midHex);
    cHor.setHex(horizonHex);
    const rf = THREE.MathUtils.clamp(rainFactor, 0, 1);

    const data = img.data;
    // Cloud palette shifts cleanly between crisp sunlit white, warm sunset peach, moody night slate, and thick storm clouds
    const isTwilight = lampFactor > 0.05 && lampFactor < 0.75;
    let cloudBrightR = THREE.MathUtils.lerp(isTwilight ? 255 : 252, 74, lampFactor);
    let cloudBrightG = THREE.MathUtils.lerp(isTwilight ? 228 : 254, 82, lampFactor);
    let cloudBrightB = THREE.MathUtils.lerp(isTwilight ? 210 : 255, 108, lampFactor);

    let cloudDarkR = THREE.MathUtils.lerp(156, 34, lampFactor);
    let cloudDarkG = THREE.MathUtils.lerp(184, 38, lampFactor);
    let cloudDarkB = THREE.MathUtils.lerp(218, 56, lampFactor);

    if (rf > 0.005) {
      const stormBrightR = THREE.MathUtils.lerp(144, 34, lampFactor);
      const stormBrightG = THREE.MathUtils.lerp(158, 42, lampFactor);
      const stormBrightB = THREE.MathUtils.lerp(176, 62, lampFactor);

      const stormDarkR = THREE.MathUtils.lerp(72, 12, lampFactor);
      const stormDarkG = THREE.MathUtils.lerp(84, 17, lampFactor);
      const stormDarkB = THREE.MathUtils.lerp(102, 28, lampFactor);

      cloudBrightR = THREE.MathUtils.lerp(cloudBrightR, stormBrightR, rf);
      cloudBrightG = THREE.MathUtils.lerp(cloudBrightG, stormBrightG, rf);
      cloudBrightB = THREE.MathUtils.lerp(cloudBrightB, stormBrightB, rf);

      cloudDarkR = THREE.MathUtils.lerp(cloudDarkR, stormDarkR, rf);
      cloudDarkG = THREE.MathUtils.lerp(cloudDarkG, stormDarkG, rf);
      cloudDarkB = THREE.MathUtils.lerp(cloudDarkB, stormDarkB, rf);
    }

    for (let y = 0; y < h; y++) {
      const ny = y / (h - 1);
      if (ny < 0.38) {
        tmpCol.copy(cTop).lerp(cMid, ny / 0.38);
      } else if (ny < 0.54) {
        tmpCol.copy(cMid).lerp(cHor, (ny - 0.38) / 0.16);
      } else {
        tmpCol.copy(cHor);
      }

      const skyR = tmpCol.r * 255;
      const skyG = tmpCol.g * 255;
      const skyB = tmpCol.b * 255;

      const hasCloudRow = y < cloudHeight;
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        if (hasCloudRow) {
          const ci = y * w + x;
          const clearAlpha = cloudDensity[ci] * (1.0 - lampFactor * 0.25);
          const stormAlpha = stormDensity[ci] * (1.0 - lampFactor * 0.15) * 0.92;
          const a = THREE.MathUtils.lerp(clearAlpha, Math.max(clearAlpha, stormAlpha), rf);
          if (a > 0.005) {
            const sh = cloudShade[ci];
            const cr = cloudDarkR + (cloudBrightR - cloudDarkR) * sh;
            const cg = cloudDarkG + (cloudBrightG - cloudDarkG) * sh;
            const cb = cloudDarkB + (cloudBrightB - cloudDarkB) * sh;
            data[p] = Math.round(skyR + (cr - skyR) * a);
            data[p + 1] = Math.round(skyG + (cg - skyG) * a);
            data[p + 2] = Math.round(skyB + (cb - skyB) * a);
            data[p + 3] = 255;
            continue;
          }
        }
        data[p] = Math.round(skyR);
        data[p + 1] = Math.round(skyG);
        data[p + 2] = Math.round(skyB);
        data[p + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    tex.needsUpdate = true;
  };

  return { draw };
}

// ---------------------------------------------------------------------------
// 10. OUTDOOR SKY + SUN + GROUND ENVIRONMENT MAP (Replaces Indoor Studio IBL)
// ---------------------------------------------------------------------------
export function createOutdoorEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  try {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();

    // Sky-ground gradient dome inside mini PMREM scene (gives outdoor glass & water realistic sky reflections)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 zenith = vec3(0.18, 0.56, 0.92);
          vec3 horizon = vec3(0.84, 0.93, 1.0);
          vec3 ground = vec3(0.24, 0.27, 0.31);
          vec3 col = h >= 0.0
            ? mix(horizon, zenith, pow(h, 0.55))
            : mix(horizon * 0.72, ground, pow(-h, 0.45));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), skyMat);
    envScene.add(dome);

    // Warm sun specular highlight lobe for cars, river water, and golden bridges
    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 16, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 4.1, 3.4) })
    );
    sunDisc.position.set(10, 12, 10);
    envScene.add(sunDisc);

    // Soft opposite sky fill bounce
    const bouncePanel = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.7, 2.0) })
    );
    bouncePanel.position.set(-10, 6, -10);
    envScene.add(bouncePanel);

    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    dome.geometry.dispose();
    skyMat.dispose();
    sunDisc.geometry.dispose();
    (sunDisc.material as THREE.Material).dispose();
    bouncePanel.geometry.dispose();
    (bouncePanel.material as THREE.Material).dispose();
    pmremGenerator.dispose();
    return envRT.texture;
  } catch {
    return null;
  }
}
