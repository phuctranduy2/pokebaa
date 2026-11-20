import * as THREE from 'three';
import {
  createStarbucksEmblemTexture,
  createStarbucksMenuBoardTexture,
} from './StarbucksCafeSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isAeonMallOpenAtHour,
  RollingShutterHandle,
  setShutterProgress,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface AeonCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface AeonMallBuildResult {
  staticGroup: THREE.Group;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; nightInt: number; dayInt: number }>;
  updateOperatingHours: (rawHour: number, delta: number, npcController?: AeonMallNpcController | null) => void;
  getShutterProgress: () => number;
  getMainClosedFactor: () => number;
}

// ==========================================
// TEXT-FITTING & PROFESSIONAL BRAND POSTER ARTWORK GENERATORS
// ==========================================

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  basePx: number,
  weight = '900'
) {
  let size = basePx;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  }
  ctx.fillText(text, x, y);
}

function createAeonCorporateLogoTex(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const paintFallback = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#9c196e';
    ctx.lineWidth = 32;
    const pad = 42;
    const r = 110;
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(size - pad - r, pad);
    ctx.quadraticCurveTo(size - pad, pad, size - pad, pad + r);
    ctx.lineTo(size - pad, size - pad - r);
    ctx.quadraticCurveTo(size - pad, size - pad, size - pad - r, size - pad);
    ctx.lineTo(pad + r, size - pad);
    ctx.quadraticCurveTo(pad, size - pad, pad, size - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#9c196e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawFittedText(ctx, 'ÆON', size / 2, size * 0.39, size * 0.72, 240, '800');
    drawFittedText(ctx, 'MALL', size / 2, size * 0.68, size * 0.72, 220, '700');
    tex.needsUpdate = true;
  };

  const paintLogoImage = (img: HTMLImageElement) => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      // Key out near-white background while keeping anti-aliased magenta edges smooth
      if (minC > 210 && maxC - minC < 30) {
        const alpha = Math.max(0, Math.min(255, Math.round(((248 - minC) / 38) * 255)));
        d[i + 3] = Math.min(d[i + 3], alpha);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    tex.needsUpdate = true;
  };

  const logoUrl = '/assets/aeon-posters/aeon_mall_logo.png';
  const cached = loadedPosterImageCache.get(logoUrl);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    paintLogoImage(cached);
  } else {
    paintFallback();
    const img = cached ?? new Image();
    if (!cached) {
      loadedPosterImageCache.set(logoUrl, img);
      img.src = logoUrl;
    }
    img.addEventListener(
      'load',
      () => {
        paintLogoImage(img);
      },
      { once: true }
    );
  }

  return tex;
}

type BrandPosterStyle =
  | 'uniqlo'
  | 'cgv'
  | 'zara'
  | 'hm'
  | 'aeon_supermarket'
  | 'nike'
  | 'starbucks'
  | 'muji'
  | 'adidas'
  | 'samsung'
  | 'haidilao';

const BRAND_POSTER_IMAGES: Partial<Record<BrandPosterStyle, string>> = {
  adidas: '/assets/aeon-posters/adidas.jpg',
  nike: '/assets/aeon-posters/nike.jpg',
  uniqlo: '/assets/aeon-posters/uniqlo.jpg',
  zara: '/assets/aeon-posters/zara.jpg',
  hm: '/assets/aeon-posters/hm.png',
  cgv: '/assets/cgv/cgv_logo.jpg',
};

const loadedPosterImageCache = new Map<string, HTMLImageElement>();

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.min(bw / iw, bh / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, bx + (bw - dw) * 0.5, by + (bh - dh) * 0.5, dw, dh);
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(bw / iw, bh / ih);
  const sw = bw / scale;
  const sh = bh / scale;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * 0.5;
  ctx.drawImage(img, sx, sy, sw, sh, bx, by, bw, bh);
}

function createGlobalBrandPosterTex(style: BrandPosterStyle, w = 1024, h = 448): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(w * 0.5);
  c.height = Math.round(h * 0.5);
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const paintPoster = (img?: HTMLImageElement) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(0.5, 0.5);
    ctx.textAlign = 'center';
    const isPortrait = h > w;

    if (style === 'uniqlo') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, w, 14);
      ctx.fillRect(0, h - 14, w, 14);

      if (img) {
        if (isPortrait) {
          drawContainImage(ctx, img, w * 0.08, h * 0.08, w * 0.84, h * 0.58);
          ctx.fillStyle = '#0f172a';
          drawFittedText(ctx, 'LIFEWEAR', w * 0.5, h * 0.77, w * 0.86, 66, '900');
          ctx.fillStyle = '#dc2626';
          drawFittedText(ctx, 'AIRism  •  TẦNG 1', w * 0.5, h * 0.89, w * 0.86, 36, '800');
        } else {
          drawContainImage(ctx, img, w * 0.04, h * 0.08, w * 0.40, h * 0.84);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#0f172a';
          drawFittedText(ctx, 'LIFEWEAR COLLECTION', w * 0.47, h * 0.40, w * 0.49, 52, '900');
          ctx.fillStyle = '#dc2626';
          drawFittedText(ctx, 'AIRism  •  ULTRA LIGHT DOWN  •  UV CUT', w * 0.47, h * 0.60, w * 0.49, 26, '800');
          ctx.fillStyle = '#475569';
          drawFittedText(ctx, 'TẦNG 1  •  CỬA HÀNG CHÍNH HÃNG NHẬT BẢN', w * 0.47, h * 0.78, w * 0.49, 23, '700');
        }
      } else {
        const bw = Math.min(w, h) * 0.52;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(w * 0.08, (h - bw) / 2, bw, bw);
        ctx.fillStyle = '#ffffff';
        drawFittedText(ctx, 'UNIQLO', w * 0.08 + bw / 2, h * 0.56, bw * 0.82, Math.round(bw * 0.28));
      }
    } else if (style === 'zara') {
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      if (img) {
        if (isPortrait) {
          drawContainImage(ctx, img, w * 0.06, h * 0.14, w * 0.88, h * 0.50);
          ctx.fillStyle = '#f8fafc';
          drawFittedText(ctx, 'AUTUMN / WINTER', w * 0.5, h * 0.75, w * 0.84, 44, '800');
          ctx.fillStyle = '#fde68a';
          drawFittedText(ctx, 'NEW ARRIVALS • TẦNG 1', w * 0.5, h * 0.87, w * 0.84, 30, '700');
        } else {
          drawContainImage(ctx, img, w * 0.04, h * 0.08, w * 0.62, h * 0.84);
          ctx.fillStyle = '#27272a';
          ctx.fillRect(w * 0.69, 28, w * 0.27, h - 56);
          ctx.fillStyle = '#f8fafc';
          drawFittedText(ctx, 'STUDIO', w * 0.825, h * 0.42, w * 0.23, 44, '900');
          ctx.fillStyle = '#d4d4d8';
          drawFittedText(ctx, 'RUNWAY 2026', w * 0.825, h * 0.58, w * 0.23, 26, '700');
          ctx.fillStyle = '#fde68a';
          drawFittedText(ctx, 'TẦNG 1 • AEON', w * 0.825, h * 0.74, w * 0.23, 24, '700');
        }
      } else {
        ctx.fillStyle = '#ffffff';
        drawFittedText(ctx, 'Z A R A', w * 0.5, h * 0.52, w * 0.8, 92, '900');
      }
    } else if (style === 'hm') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 8;
      ctx.strokeRect(16, 16, w - 32, h - 32);

      if (img) {
        if (isPortrait) {
          drawContainImage(ctx, img, w * 0.10, h * 0.10, w * 0.80, h * 0.52);
          ctx.fillStyle = '#0f172a';
          drawFittedText(ctx, 'STUDIO COLLECTION', w * 0.5, h * 0.74, w * 0.84, 46, '900');
          ctx.fillStyle = '#dc2626';
          drawFittedText(ctx, 'NEW ARRIVALS • TẦNG 1', w * 0.5, h * 0.86, w * 0.84, 32, '800');
        } else {
          drawContainImage(ctx, img, w * 0.05, h * 0.12, w * 0.38, h * 0.76);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#0f172a';
          drawFittedText(ctx, 'H&M FASHION', w * 0.47, h * 0.40, w * 0.48, 62, '900');
          ctx.fillStyle = '#dc2626';
          drawFittedText(ctx, 'SPRING / SUMMER  •  TRENDY APPAREL', w * 0.47, h * 0.61, w * 0.48, 28, '800');
          ctx.fillStyle = '#475569';
          drawFittedText(ctx, 'TẦNG 1  •  AEON MALL FLAGSHIP STORE', w * 0.47, h * 0.80, w * 0.48, 24, '700');
        }
      } else {
        ctx.fillStyle = '#dc2626';
        drawFittedText(ctx, 'H&M', w * 0.5, h * 0.54, w * 0.8, 110, '900');
      }
    } else if (style === 'nike') {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);

      if (img) {
        if (isPortrait) {
          drawCoverImage(ctx, img, 0, 0, w, h);
        } else {
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(0, 0, 18, h);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          drawFittedText(ctx, 'NIKE', w * 0.06, h * 0.38, w * 0.54, 102, '900');
          ctx.fillStyle = '#fb923c';
          drawFittedText(ctx, 'AIR JORDAN 1  •  JUST DO IT.', w * 0.06, h * 0.61, w * 0.56, 38, '900');
          ctx.fillStyle = '#d6d3d1';
          drawFittedText(ctx, 'RETRO HIGH OG  •  AEON MALL TẦNG 2', w * 0.06, h * 0.80, w * 0.56, 25, '700');
          drawContainImage(ctx, img, w * 0.65, 14, w * 0.33, h - 28);
        }
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        drawFittedText(ctx, 'NIKE', w * 0.08, h * 0.45, w * 0.5, 96, '900');
        ctx.fillStyle = '#fb923c';
        drawFittedText(ctx, 'JUST DO IT.', w * 0.08, h * 0.68, w * 0.5, 42, '900');
      }
    } else if (style === 'adidas') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      if (img) {
        if (isPortrait) {
          drawContainImage(ctx, img, 12, 12, w - 24, w - 24);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(0, w + 4, w, 6);
          ctx.fillStyle = '#ffffff';
          drawFittedText(ctx, 'ADIDAS', w * 0.5, h * 0.87, w * 0.88, 56, '900');
          ctx.fillStyle = '#fca5a5';
          drawFittedText(ctx, 'ORIGINALS • TẦNG 2', w * 0.5, h * 0.95, w * 0.88, 28, '800');
        } else {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(0, 0, 18, h);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          drawFittedText(ctx, 'ADIDAS', w * 0.06, h * 0.40, w * 0.48, 96, '900');
          ctx.fillStyle = '#f87171';
          drawFittedText(ctx, 'ORIGINALS  •  RUNNING  •  FOOTBALL', w * 0.06, h * 0.63, w * 0.50, 30, '800');
          ctx.fillStyle = '#cbd5e1';
          drawFittedText(ctx, 'TẦNG 2  •  KHU THỂ THAO QUỐC TẾ', w * 0.06, h * 0.82, w * 0.50, 24, '700');
          drawContainImage(ctx, img, w * 0.58, 14, w * 0.40, h - 28);
        }
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        drawFittedText(ctx, 'ADIDAS', w * 0.08, h * 0.45, w * 0.6, 92, '900');
      }
    } else if (style === 'cgv') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#09090b');
      g.addColorStop(0.58, '#18181b');
      g.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#e5c17c';
      ctx.lineWidth = 5;
      ctx.strokeRect(14, 14, w - 28, h - 28);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f87171';
      drawFittedText(ctx, 'CJ CGV VIETNAM  •  CULTUREPLEX', w * 0.06, h * 0.22, w * 0.56, 26, '800');
      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, 'CGV CINEMAS', w * 0.06, h * 0.45, w * 0.56, 86, '900');
      ctx.fillStyle = '#e5c17c';
      drawFittedText(ctx, 'IMAX LASER  •  GOLD CLASS  •  4DX', w * 0.06, h * 0.65, w * 0.56, 30, '800');
      ctx.fillStyle = '#cbd5e1';
      drawFittedText(ctx, 'TẦNG 3  •  TRẢI NGHIỆM ĐIỆN ẢNH ĐỈNH CAO', w * 0.06, h * 0.83, w * 0.56, 24, '700');

      if (img) {
        drawContainImage(ctx, img, w * 0.65, 28, w * 0.30, h - 56);
      } else {
        drawCgvEmblemMark(ctx, w * 0.80, h * 0.50, h * 0.36);
      }
    } else if (style === 'aeon_supermarket') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#580b45');
      g.addColorStop(1, '#9d174d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#f9a8d4';
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, 'ÆON SUPERMARKET', w / 2, h * 0.38, w * 0.86, 76, '900');
      ctx.fillStyle = '#fde047';
      drawFittedText(ctx, 'DELICA & SUSHI NHẬT BẢN  •  THỰC PHẨM TƯƠI SỐNG', w / 2, h * 0.60, w * 0.86, 30, '800');
      ctx.fillStyle = '#fbcfe8';
      drawFittedText(ctx, 'TOPVALU  •  BÁNH MÌ ARTISAN  •  TẦNG TRỆT & TẦNG 1', w / 2, h * 0.80, w * 0.86, 25, '700');
    } else if (style === 'starbucks') {
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, w - 28, h - 28);

      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, 'STARBUCKS RESERVE', w / 2, h * 0.40, w * 0.86, 68, '900');
      ctx.fillStyle = '#fde68a';
      drawFittedText(ctx, 'ROASTERY  •  ESPRESSO  •  FRAPPUCCINO', w / 2, h * 0.62, w * 0.84, 30, '800');
      ctx.fillStyle = '#a7f3d0';
      drawFittedText(ctx, 'TẦNG 1  •  CỔNG ĐẠI LỘ CHÍNH', w / 2, h * 0.81, w * 0.84, 24, '700');
    } else if (style === 'muji') {
      ctx.fillStyle = '#f5f0e6';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(28, 28, w - 56, 14);
      ctx.fillRect(28, h - 42, w - 56, 14);

      ctx.fillStyle = '#7f1d1d';
      drawFittedText(ctx, 'MUJI  無印良品', w / 2, h * 0.44, w * 0.84, 78, '900');
      ctx.fillStyle = '#44403c';
      drawFittedText(ctx, 'GIA DỤNG TỐI GIẢN  •  NỘI THẤT & THỜI TRANG NHẬT', w / 2, h * 0.66, w * 0.86, 28, '700');
      ctx.fillStyle = '#78716c';
      drawFittedText(ctx, 'FLAGSHIP STORE  •  TẦNG 2', w / 2, h * 0.83, w * 0.84, 24, '700');
    } else if (style === 'samsung') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#020617');
      g.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, 'SAMSUNG EXPERIENCE', w / 2, h * 0.40, w * 0.86, 68, '900');
      ctx.fillStyle = '#93c5fd';
      drawFittedText(ctx, 'GALAXY AI  •  QLED 8K  •  SMART HOME', w / 2, h * 0.62, w * 0.84, 32, '800');
      ctx.fillStyle = '#e2e8f0';
      drawFittedText(ctx, 'TRẢI NGHIỆM CÔNG NGHỆ  •  TẦNG 2', w / 2, h * 0.81, w * 0.84, 24, '700');
    } else {
      // haidilao
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, w - 28, h - 28);

      ctx.fillStyle = '#facc15';
      drawFittedText(ctx, 'HAIDILAO HOT POT', w / 2, h * 0.40, w * 0.86, 72, '900');
      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, 'LẨU TỨ XUYÊN  •  MÚA MÌ  •  PHỤC VỤ VIP', w / 2, h * 0.62, w * 0.84, 30, '800');
      ctx.fillStyle = '#fde68a';
      drawFittedText(ctx, 'TẦNG 3  •  KHU ẨM THỰC QUỐC TẾ', w / 2, h * 0.81, w * 0.84, 24, '700');
    }

    ctx.restore();
    tex.needsUpdate = true;
  };

  const imgUrl = BRAND_POSTER_IMAGES[style];
  if (imgUrl) {
    const cachedImg = loadedPosterImageCache.get(imgUrl);
    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
      paintPoster(cachedImg);
    } else {
      paintPoster(undefined);
      const img = cachedImg ?? new Image();
      if (!cachedImg) {
        loadedPosterImageCache.set(imgUrl, img);
        img.src = imgUrl;
      }
      img.addEventListener(
        'load',
        () => {
          paintPoster(img);
        },
        { once: true }
      );
    }
  } else {
    paintPoster(undefined);
  }

  return tex;
}

function createMallBrandPanelTex(
  brand: string,
  sub: string,
  bgHex: string,
  fgHex = '#ffffff',
  borderHex = '#ffffff',
  w = 1024,
  h = 256
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(w * 0.5);
  c.height = Math.round(h * 0.5);
  const ctx = c.getContext('2d')!;
  ctx.scale(0.5, 0.5);

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.textAlign = 'center';
  ctx.fillStyle = fgHex;
  drawFittedText(ctx, brand, w / 2, h * 0.48, w * 0.88, Math.round(h * 0.36), '900');

  ctx.fillStyle = fgHex === '#ffffff' ? '#fde68a' : '#334155';
  drawFittedText(ctx, sub, w / 2, h * 0.78, w * 0.88, Math.round(h * 0.16), '700');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMallPylonTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#4a044e');
  g.addColorStop(0.5, '#86198f');
  g.addColorStop(1, '#3b0764');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 1024);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 484, 996);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'AEON', 256, 145, 420, 92, '900');
  ctx.fillStyle = '#fde68a';
  drawFittedText(ctx, 'MALL', 256, 228, 420, 72, '900');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(54, 270, 404, 5);

  const tenants = [
    ['AEON SUPERMARKET', '#ffffff'],
    ['UNIQLO • ZARA • MUJI', '#f9a8d4'],
    ['NIKE • ADIDAS • PUMA', '#a3e635'],
    ['CGV CINEMAS • IMAX', '#fde047'],
    ['STARBUCKS • HAIDILAO', '#ffffff'],
    ['MỞ CỬA 07:00 - 22:00', '#fde68a'],
  ];
  tenants.forEach(([txt, col], idx) => {
    ctx.fillStyle = col;
    drawFittedText(ctx, txt, 256, 360 + idx * 96, 430, 30, '800');
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMallAtriumFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 512, 512);

  const step = 128;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#f8fafc' : '#e2e8f0';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  ctx.strokeStyle = 'rgba(162, 28, 175, 0.20)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 504);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMallFacadeCladdingTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createUniqloLogoCubeTex(jp = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  if (jp) {
    ctx.font = '900 72px system-ui, -apple-system, sans-serif';
    ctx.fillText('ユニ', 128, 112);
    ctx.fillText('クロ', 128, 200);
  } else {
    ctx.font = '900 76px system-ui, -apple-system, sans-serif';
    ctx.fillText('UNI', 128, 114);
    ctx.fillText('QLO', 128, 202);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createUniqloCategoryHeaderTex(title: string, sub: string, accentHex = '#dc2626'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 18, 128);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  drawFittedText(ctx, title, 34, 62, 460, 44, '900');
  ctx.fillStyle = '#475569';
  drawFittedText(ctx, sub, 34, 102, 460, 24, '700');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createUniqloWoodFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e7d3b5';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? 'rgba(180, 130, 80, 0.14)' : 'rgba(255, 255, 255, 0.10)';
    ctx.fillRect(0, y, 256, 30);
    ctx.fillStyle = 'rgba(120, 80, 40, 0.18)';
    ctx.fillRect(0, y + 30, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createReserveWalnutFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? 'rgba(146, 64, 14, 0.22)' : 'rgba(255, 224, 178, 0.08)';
    ctx.fillRect(0, y, 256, 30);
    ctx.fillStyle = 'rgba(30, 15, 5, 0.35)';
    ctx.fillRect(0, y + 30, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStarbucksReserveFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#042f24');
  grad.addColorStop(0.5, '#065f46');
  grad.addColorStop(1, '#042f24');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'STARBUCKS RESERVE ★', w / 2, h * 0.48, w * 0.88, 96, '900');

  ctx.fillStyle = '#fde68a';
  drawFittedText(ctx, 'ROASTERY  •  ESPRESSO BAR  •  ARTISAN BAKERY', w / 2, h * 0.78, w * 0.88, 34, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createReserveRoasteryArtTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'STARBUCKS ★ R', w / 2, 118, w * 0.82, 54, '900');

  ctx.fillStyle = '#6ee7b7';
  drawFittedText(ctx, 'RESERVE ROASTERY', w / 2, 195, w * 0.82, 34, '800');

  ctx.fillStyle = '#fde68a';
  drawFittedText(ctx, '100% ARABICA  •  MICRO-LOT COFFEE', w / 2, 272, w * 0.84, 24, '700');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAeonMarketFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);
  const step = 64;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#ffffff' : '#f1f5f9';
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }
  ctx.strokeStyle = 'rgba(162, 28, 175, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 252, 252);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAeonLogoCrestTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#86198f';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 118, 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'ÆON', 128, 134, 122, 52, '900');
  ctx.fillStyle = '#fde68a';
  drawFittedText(ctx, 'STYLE', 128, 224, 210, 34, '900');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAeonStyleFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#580b45');
  g.addColorStop(0.5, '#a21caf');
  g.addColorStop(1, '#580b45');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#f9a8d4';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'AEON STYLE  •  SUPERMARKET', w / 2, h * 0.48, w * 0.88, 86, '900');
  ctx.fillStyle = '#fde047';
  drawFittedText(ctx, 'SIÊU THỊ BÁCH HÓA  •  DELICA & SUSHI NHẬT BẢN  •  TOPVALU', w / 2, h * 0.79, w * 0.88, 32, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAeonDepartmentSignTex(title: string, sub: string, bgHex = '#86198f', accentHex = '#fde047'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 256, 76, 460, 44, '900');
  ctx.fillStyle = accentHex;
  drawFittedText(ctx, sub, 256, 126, 460, 26, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAeonPromoWindowTex(title: string, badge: string, sub: string, bgHex: string, accentHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 384, 92);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'ÆON STYLE JAPAN', 192, 58, 340, 34, '900');
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 192, 200, 340, 48, '900');
  ctx.fillStyle = '#fde047';
  drawFittedText(ctx, badge, 192, 315, 340, 62, '900');
  ctx.fillStyle = '#f8fafc';
  drawFittedText(ctx, sub, 192, 425, 340, 26, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createZaraTravertineFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e7e2d8';
  ctx.fillRect(0, 0, 256, 256);
  const step = 128;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#ede9df' : '#dfd8cc';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  ctx.strokeStyle = 'rgba(24, 24, 27, 0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createZaraFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#e7e2d8';
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 120px Georgia, "Times New Roman", serif';
  ctx.fillText('Z A R A', w / 2, h * 0.56);

  ctx.fillStyle = '#d6d3d1';
  drawFittedText(ctx, 'WOMAN   •   MAN   •   ZARA STUDIO   •   TREND COLLECTION', w / 2, h * 0.83, w * 0.86, 28, '700');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createZaraLogoPlaqueTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f5f2eb';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'center';
  ctx.font = '700 66px Georgia, "Times New Roman", serif';
  ctx.fillText('ZARA', 128, 138);
  ctx.fillStyle = '#57534e';
  drawFittedText(ctx, 'EST. 1975', 128, 192, 180, 22, '700');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHmConcreteFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 256);
  const step = 64;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#f1f5f9' : '#e2e8f0';
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHmFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#dc2626';
  ctx.font = 'italic 900 124px "Segoe UI", Arial, sans-serif';
  ctx.fillText('H&M', w / 2, h * 0.56);

  ctx.fillStyle = '#18181b';
  drawFittedText(ctx, 'DIVIDED   •   TREND   •   BASICS   •   NEW ARRIVALS', w / 2, h * 0.83, w * 0.88, 30, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHmCrestTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'italic 900 84px "Segoe UI", Arial, sans-serif';
  ctx.fillText('H&M', 128, 146);
  drawFittedText(ctx, 'FLAGSHIP', 128, 206, 180, 26, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFashionPromoPosterTex(brand: string, title: string, sub: string, bgHex: string, accentHex: string, textHex = '#ffffff'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 384, 90);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, brand, 192, 58, 320, 42, '900');
  ctx.fillStyle = textHex;
  drawFittedText(ctx, title, 192, 235, 330, 50, '900');
  ctx.fillStyle = accentHex === '#09090b' ? '#78716c' : accentHex;
  drawFittedText(ctx, sub, 192, 360, 330, 28, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCnkTerrazzoFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f3ede3';
  ctx.fillRect(0, 0, 256, 256);
  const step = 128;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#f7f3ec' : '#ebe3d5';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  ctx.strokeStyle = 'rgba(180, 140, 80, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCnkFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#181412';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#faf7f2';
  drawFittedText(ctx, 'CHARLES & KEITH', w / 2, h * 0.56, w * 0.88, 96, '700');

  ctx.fillStyle = '#d4af37';
  drawFittedText(ctx, 'HANDBAGS   •   FOOTWEAR   •   ACCESSORIES   •   FLAGSHIP', w / 2, h * 0.83, w * 0.88, 28, '700');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCnkMonogramTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#181412';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.fillStyle = '#181412';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'C & K', 128, 140, 190, 68, '800');
  ctx.fillStyle = '#a17c38';
  drawFittedText(ctx, 'SINGAPORE', 128, 198, 180, 22, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMlbFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 256);
  const step = 64;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#f8fafc' : '#e2e8f0';
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }
  ctx.strokeStyle = 'rgba(30, 58, 138, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMlbFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(0.5, '#1e3a8a');
  g.addColorStop(1, '#0f172a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Signature MLB Korea split red/navy diamond badge on left
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(46, 52, 110, 152);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(156, 52, 110, 152);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(46, 52, 220, 152);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'MLB', 156, 154, 180, 74, '900');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'MLB KOREA  •  STREETWEAR', 745, h * 0.50, 880, 88, '900');
  ctx.fillStyle = '#fde047';
  drawFittedText(ctx, 'BIGBALL CHUNKY   •   NY MONOGRAM   •   VARSITY   •   CAPS', 745, h * 0.80, 900, 30, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMlbLogoTex(team: 'NY' | 'LA'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = team === 'NY' ? '#0f172a' : '#1d4ed8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 108px Georgia, "Times New Roman", serif';
  ctx.fillText(team, 128, 152);
  ctx.fillStyle = '#fde047';
  drawFittedText(ctx, team === 'NY' ? 'NEW YORK YANKEES' : 'LA DODGERS', 128, 212, 210, 22, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSportsStoreFasciaTex(
  brand: string,
  tagline: string,
  bgHex: string,
  accentHex: string,
  textHex: string,
  badgeKind: 'adidas' | 'nike' | 'puma'
): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  if (badgeKind === 'adidas') {
    // Iconic 3 performance bars on left
    ctx.fillStyle = textHex;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(105 + i * 44, 152);
      ctx.rotate(-0.42);
      ctx.fillRect(-13, -(32 + i * 24), 26, 48 + i * 24);
      ctx.restore();
    }
  } else if (badgeKind === 'nike') {
    // Bold dynamic swoosh emblem on left
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(64, 118);
    ctx.quadraticCurveTo(96, 178, 250, 92);
    ctx.quadraticCurveTo(120, 148, 86, 112);
    ctx.closePath();
    ctx.fill();
  } else {
    // PUMA racing stripe & badge on left
    ctx.fillStyle = accentHex;
    ctx.fillRect(58, 66, 184, 124);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawFittedText(ctx, 'PUMA', 150, 148, 156, 56, '900');
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = textHex;
  drawFittedText(ctx, brand, 740, h * 0.52, 860, 102, '900');
  ctx.fillStyle = accentHex;
  drawFittedText(ctx, tagline, 740, h * 0.82, 880, 32, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWestLifestyleFasciaTex(
  brand: string,
  tagline: string,
  bgHex: string,
  accentHex: string,
  textHex: string,
  badgeKind: 'muji' | 'locknlock' | 'levis'
): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  if (badgeKind === 'muji') {
    // Minimalist burgundy crest + Japanese 無印良品 emblem
    ctx.fillStyle = accentHex;
    ctx.fillRect(58, 56, 178, 144);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawFittedText(ctx, 'MUJI', 147, 118, 150, 48, '900');
    drawFittedText(ctx, '無印良品', 147, 168, 150, 34, '800');
  } else if (badgeKind === 'locknlock') {
    // Clean geometric lock square icon
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(147, 102, 34, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    ctx.fillRect(98, 104, 98, 86);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(147, 147, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Iconic Levi's crimson batwing badge
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(54, 72);
    ctx.lineTo(242, 72);
    ctx.lineTo(222, 168);
    ctx.quadraticCurveTo(182, 148, 148, 182);
    ctx.quadraticCurveTo(114, 148, 74, 168);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawFittedText(ctx, "Levi's", 148, 134, 146, 48, '900');
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = textHex;
  drawFittedText(ctx, brand, 742, h * 0.52, 860, 102, '900');
  ctx.fillStyle = accentHex;
  drawFittedText(ctx, tagline, 742, h * 0.82, 880, 32, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTommyFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c5a57e';
  ctx.fillRect(0, 0, 256, 256);
  const plankH = 32;
  for (let y = 0; y < 256; y += plankH) {
    for (let x = 0; x < 256; x += 64) {
      const shade = ((x / 64 + y / plankH) % 3);
      ctx.fillStyle = shade === 0 ? '#cca982' : shade === 1 ? '#be9a72' : '#b48f66';
      ctx.fillRect(x + 1, y + 1, 62, plankH - 2);
    }
  }
  ctx.strokeStyle = 'rgba(12, 27, 51, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, 254, 254);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 11);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTommyFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1b33';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#c5b088';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Iconic Tommy Hilfiger Flag Emblem on left
  ctx.fillStyle = '#e5e1d8';
  ctx.fillRect(58, 70, 178, 116);
  ctx.fillStyle = '#0c1b33';
  ctx.fillRect(58, 70, 178, 22);
  ctx.fillRect(58, 164, 178, 22);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(147, 92, 89, 72);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ece7df';
  drawFittedText(ctx, 'TOMMY HILFIGER', 748, h * 0.52, 860, 96, '900');
  ctx.fillStyle = '#c5b088';
  drawFittedText(ctx, 'NEW YORK   •   EST. 1985   •   PREPPY HERITAGE & DENIM', 748, h * 0.82, 880, 30, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTommyFlagPlaqueTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1b33';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#c5b088';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 232, 232);

  // Central Tommy Flag
  ctx.fillStyle = '#e5e1d8';
  ctx.fillRect(48, 74, 160, 96);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(128, 74, 80, 96);
  ctx.fillStyle = '#0c1b33';
  ctx.fillRect(48, 54, 160, 20);
  ctx.fillRect(48, 170, 160, 20);

  ctx.fillStyle = '#ece7df';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'TH  •  1985', 128, 224, 180, 26, '900');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCrocsFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d8dee6';
  ctx.fillRect(0, 0, 256, 256);
  const step = 128;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#dfe5ec' : '#d2d9e2';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  const specks = ['#65a30d', '#38bdf8', '#fb7185', '#eab308', '#a855f7'];
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = specks[i % specks.length];
    const sx = ((i * 53) % 236) + 10;
    const sy = ((i * 97) % 236) + 10;
    ctx.beginPath();
    ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 11);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCrocsFasciaTex(): THREE.CanvasTexture {
  const w = 1280;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#18221e';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#65a30d';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Stylized Crocs Clog Badge on left
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.roundRect(58, 56, 178, 144, 34);
  ctx.fill();
  ctx.fillStyle = '#18221e';
  [104, 144, 184].forEach((hx) => {
    [96, 134].forEach((hy) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'CROCS', 147, 180, 140, 30, '900');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5ece8';
  drawFittedText(ctx, 'crocs', 748, h * 0.54, 820, 126, '900');
  ctx.fillStyle = '#84cc16';
  drawFittedText(ctx, 'COME AS YOU ARE™   •   CLASSIC CLOG   •   JIBBITZ™ CHARM BAR', 748, h * 0.84, 880, 30, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCrocsEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#18221e';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 232);

  // Clog ventilation dots circle
  ctx.fillStyle = '#18221e';
  [84, 128, 172].forEach((hx) => {
    [76, 114].forEach((hy) => {
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'crocs', 128, 184, 190, 56, '900');
  ctx.fillStyle = '#18221e';
  drawFittedText(ctx, 'JIBBITZ™ BAR', 128, 222, 190, 24, '900');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHaidilaoFasciaTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#180507');
  grad.addColorStop(0.5, '#3b0910');
  grad.addColorStop(1, '#180507');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 1000, 232);
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 980, 212);

  // Iconic Haidilao red crest badge on left
  ctx.fillStyle = '#c81e1e';
  ctx.beginPath();
  ctx.roundRect(56, 52, 148, 152, 26);
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'Hi', 130, 134, 120, 74, '900');
  ctx.fillStyle = '#fef08a';
  drawFittedText(ctx, '海底捞', 130, 184, 124, 28, '800');

  // Main English + Chinese + Vietnamese flagship title
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'HAIDILAO HOT POT', 606, 120, 720, 74, '900');
  ctx.fillStyle = '#facc15';
  drawFittedText(ctx, '海底捞火锅  •  LẨU TỨ XUYÊN CHÍNH HIỆU  •  FLOOR 3', 606, 186, 720, 28, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHaidilaoEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 228);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'Hi', 128, 134, 180, 108, '900');
  ctx.fillStyle = '#fef08a';
  drawFittedText(ctx, 'HAIDILAO • 海底捞', 128, 206, 200, 24, '900');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHaidilaoTileTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#dfd4c4';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      const tint = ((x + y) / 128) % 2 === 0 ? '#e7ddd0' : '#d8cbb8';
      ctx.fillStyle = tint;
      ctx.fillRect(x + 2, y + 2, 124, 124);
      ctx.strokeStyle = 'rgba(146, 114, 72, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 36);
      ctx.lineTo(x + 96, y + 84);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#9f8b73';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 4);
  return tex;
}

function createHaidilaoMenuBoardTex(title: string, subtitle: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#24070b';
  ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 748, 236);
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  drawFittedText(ctx, title, 384, 110, 690, 52, '900');
  ctx.fillStyle = '#f8fafc';
  drawFittedText(ctx, subtitle, 384, 182, 690, 30, '700');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKichiFasciaTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, 0, 1024, 256);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 260, 256);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(260, 212, 764, 44);

  // Kichi circular crest on left crimson banner
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(130, 118, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  drawFittedText(ctx, 'KICHI', 130, 126, 110, 38, '900');
  ctx.fillStyle = '#fef2f2';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'LẨU BĂNG CHUYỀN', 130, 224, 224, 22, '900');

  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'KICHI-KICHI', 642, 118, 690, 82, '900');
  ctx.fillStyle = '#fca5a5';
  drawFittedText(ctx, 'NHÀ HÀNG LẨU BĂNG CHUYỀN NHẬT BẢN  •  HOT POT BAR', 642, 180, 690, 26, '800');
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'SHABU SHABU • SUSHI • WAGYU • 60+ MÓN NHÚNG KHÔNG GIỚI HẠN', 642, 241, 710, 20, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKichiEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 94, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'KICHI', 128, 118, 148, 46, '900');
  ctx.fillStyle = '#18181b';
  drawFittedText(ctx, 'KICHI', 128, 166, 148, 42, '900');
  ctx.fillStyle = '#dc2626';
  drawFittedText(ctx, 'LẨU BĂNG CHUYỀN', 128, 202, 152, 17, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKichiWoodFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9c6e44';
  ctx.fillRect(0, 0, 512, 512);

  for (let row = 0; row < 8; row++) {
    const y = row * 64;
    const offset = (row % 2) * 128;
    for (let col = -1; col < 3; col++) {
      const x = col * 256 + offset;
      const shade = ['#a57548', '#98693e', '#ad7d50', '#8f6138'][(row + col + 4) % 4];
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 254, 62);
      ctx.strokeStyle = 'rgba(58, 34, 16, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 254, 62);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 4);
  return tex;
}

function drawFlameGrillIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Roaring outer orange flame
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.bezierCurveTo(26, -34, 42, -6, 32, 22);
  ctx.bezierCurveTo(24, 38, 10, 44, 0, 44);
  ctx.bezierCurveTo(-14, 44, -28, 36, -33, 18);
  ctx.bezierCurveTo(-40, -6, -20, -34, 0, -56);
  ctx.fill();

  // Inner golden-yellow flame core
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(16, -14, 22, 6, 14, 24);
  ctx.bezierCurveTo(8, 34, -8, 34, -14, 24);
  ctx.bezierCurveTo(-22, 6, -14, -14, 0, -30);
  ctx.fill();

  // Smokeless BBQ grill grate bars across bottom
  ctx.strokeStyle = '#181412';
  ctx.lineWidth = 5;
  for (let gx = -24; gx <= 24; gx += 12) {
    ctx.beginPath();
    ctx.moveTo(gx, 28);
    ctx.lineTo(gx, 46);
    ctx.stroke();
  }
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-34, 36);
  ctx.lineTo(34, 36);
  ctx.stroke();
  ctx.restore();
}

function drawTexasStarLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer sunburst ring
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = outerR * 0.09;
  ctx.stroke();

  // Inner cream badge
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(0, 0, outerR * 0.84, 0, Math.PI * 2);
  ctx.fill();

  // 5-Pointed Lone Star in Texas Gold with Crimson Trim
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = outerR * 0.05;
  ctx.beginPath();
  const innerR = outerR * 0.34;
  const starR = outerR * 0.74;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? starR : innerR;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center ribbon bar
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(-outerR * 0.82, -outerR * 0.22, outerR * 1.64, outerR * 0.44, outerR * 0.1);
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = outerR * 0.04;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'TEXAS', 0, outerR * 0.08, outerR * 1.38, outerR * 0.38, '900');
  ctx.fillStyle = '#18181b';
  drawFittedText(ctx, 'CHICKEN', 0, outerR * 0.50, outerR * 1.24, outerR * 0.24, '900');
  ctx.restore();
}

function createHp3BbqFasciaTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#120e0d');
  grad.addColorStop(0.45, '#2b150e');
  grad.addColorStop(1, '#120e0d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 1000, 232);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 980, 212);

  // Flame + Grill emblem crest on left
  ctx.fillStyle = '#1f1614';
  ctx.beginPath();
  ctx.roundRect(44, 38, 178, 180, 24);
  ctx.fill();
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 5;
  ctx.stroke();
  drawFlameGrillIcon(ctx, 133, 98, 0.92);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'HP3 BBQ', 133, 198, 152, 34, '900');

  // Main Headline + Tagline
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'HP3 BBQ  •  NƯỚNG & LẨU', 610, 114, 710, 72, '900');
  ctx.fillStyle = '#fb923c';
  drawFittedText(ctx, 'BUFFET NƯỚNG KHÔNG KHÓI NHẬT - HÀN  •  QUẦY LINE 50+ MÓN', 610, 178, 710, 25, '800');
  ctx.fillStyle = '#fde68a';
  drawFittedText(ctx, 'BÒ WAGYU  •  BA CHỈ MỸ  •  HẢI SẢN TƯƠI  •  TẦNG 3 AEON MALL', 610, 216, 710, 20, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHp3BbqEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#161110';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 16;
  ctx.strokeRect(18, 18, 476, 476);

  ctx.fillStyle = '#291711';
  ctx.beginPath();
  ctx.arc(256, 224, 172, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  ctx.stroke();

  drawFlameGrillIcon(ctx, 256, 170, 2.05);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'HP3 BBQ', 256, 356, 360, 84, '900');
  ctx.fillStyle = '#fb923c';
  drawFittedText(ctx, 'NƯỚNG & LẨU KHÔNG KHÓI', 256, 444, 410, 32, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBbqSlateFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#292524';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      ctx.fillStyle = ((x + y) / 128) % 2 === 0 ? '#352f2c' : '#26211f';
      ctx.fillRect(x + 2, y + 2, 124, 124);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createTexasChickenFasciaTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(0.5, '#dc2626');
  grad.addColorStop(1, '#991b1b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Sunny Texas yellow bottom bar & star badge
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 206, 1024, 50);

  drawTexasStarLogo(ctx, 132, 106, 84);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'TEXAS CHICKEN', 606, 114, 710, 84, '900');
  ctx.fillStyle = '#fef08a';
  drawFittedText(ctx, 'CRUNCH! JUICY! BOLD!  •  EST. 1952', 606, 174, 710, 28, '800');
  ctx.fillStyle = '#18181b';
  drawFittedText(ctx, 'GÀ RÁN GIÒN TƯƠI  •  BÁNH QUY BƠ MẬT ONG  •  REFILL NƯỚC NGỌT', 512, 239, 940, 22, '900');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTexasChickenEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 16;
  ctx.strokeRect(18, 18, 476, 476);

  drawTexasStarLogo(ctx, 256, 224, 174);

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'CRUNCH! JUICY! BOLD! • EST. 1952', 256, 456, 420, 26, '900');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTexasMenuBoardTex(title: string, subtitle: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(0, 0, 768, 256);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 768, 56);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 748, 236);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, title, 384, 42, 700, 30, '900');
  ctx.fillStyle = '#facc15';
  drawFittedText(ctx, subtitle, 384, 156, 700, 38, '800');
  ctx.fillStyle = '#e2e8f0';
  drawFittedText(ctx, 'GÀ GIÒN • BÁNH QUY MẬT ONG • BURGER • KHOAI TÂY', 384, 212, 700, 24, '700');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTexasTileTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f2e8d5';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      ctx.fillStyle = ((x + y) / 128) % 2 === 0 ? '#f5ede0' : '#e7dac4';
      ctx.fillRect(x + 2, y + 2, 124, 124);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function drawCgvEmblemMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  ctx.save();
  // Clean authentic CGV crimson-red radial card matching the official brand mark
  const bg = ctx.createRadialGradient(cx, cy - radius * 0.45, radius * 0.1, cx, cy, radius * 1.15);
  bg.addColorStop(0, '#dc2626');
  bg.addColorStop(0.65, '#b91c1c');
  bg.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(radius * 0.62)}px Inter, Arial, sans-serif`;
  ctx.fillText('CGV', cx - radius * 0.06, cy - radius * 0.08);

  // 6-petal asterisk mark at top right
  const sx = cx + radius * 0.56;
  const sy = cy - radius * 0.38;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.save();
    ctx.translate(sx + Math.cos(a) * radius * 0.09, sy + Math.sin(a) * radius * 0.09);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.065, radius * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(radius * 0.22)}px Inter, Arial, sans-serif`;
  ctx.fillText('CINEMAS', cx, cy + radius * 0.40);
  ctx.restore();
}

function createCgvLogoEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(256, 80, 20, 256, 256, 380);
  grad.addColorStop(0, '#ef4444');
  grad.addColorStop(0.55, '#b91c1c');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  drawCgvEmblemMark(ctx, 256, 256, 215);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCgvMarqueeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 384;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 2048, 0);
  grad.addColorStop(0, '#09090b');
  grad.addColorStop(0.5, '#18181b');
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 384);

  // Subtle crimson top & bottom architectural rules + thin champagne-gold inner border
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 2048, 10);
  ctx.fillRect(0, 374, 2048, 10);
  ctx.strokeStyle = 'rgba(229, 193, 124, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 2000, 336);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'CULTUREPLEX  •  CINEMA HALLS 1 - 3', 1024, 178, 1680, 92, '900');

  ctx.fillStyle = '#e5c17c';
  drawFittedText(
    ctx,
    'IMAX LASER   |   GOLD CLASS VIP   |   4DX MOTION   |   SWEETBOX',
    1024,
    274,
    1620,
    36,
    '800'
  );

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCgvLuxuryBannerTex(
  tag: string,
  title: string,
  sub: string,
  accentHex = '#e5c17c'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 280;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 1024, 280);
  bg.addColorStop(0, '#09090b');
  bg.addColorStop(0.55, '#18181b');
  bg.addColorStop(1, '#27272a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 280);

  // Diagonal subtle glass sheen
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(540, 0);
  ctx.lineTo(340, 280);
  ctx.lineTo(0, 280);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Thin metallic gold frame + bold left accent bar
  ctx.strokeStyle = 'rgba(229, 193, 124, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 1004, 260);
  ctx.fillStyle = accentHex;
  ctx.fillRect(10, 10, 16, 260);

  // Top Tag Pill
  ctx.fillStyle = accentHex;
  ctx.fillRect(58, 34, 210, 40);
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'center';
  drawFittedText(ctx, tag, 163, 62, 184, 22, '900');

  // Main Headline & Subtitle
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 58, 152, 910, 66, '900');
  ctx.fillStyle = accentHex;
  drawFittedText(ctx, sub, 58, 222, 910, 30, '700');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCgvMoviePosterTex(
  title: string,
  subtitle: string,
  tag: string,
  topColor: string,
  botColor: string,
  accentColor: string,
  rating = 'T13'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.55, botColor);
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 768);

  // Subtle diagonal cinematic light beams
  ctx.save();
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(180, 0);
  ctx.lineTo(420, 560);
  ctx.lineTo(250, 560);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cinematic graphic silhouette / orb artwork
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(256, 290, 165, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.arc(256, 290, 108, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Dramatic horizon silhouette
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.moveTo(0, 500);
  ctx.lineTo(118, 395);
  ctx.lineTo(256, 440);
  ctx.lineTo(392, 382);
  ctx.lineTo(512, 488);
  ctx.lineTo(512, 768);
  ctx.lineTo(0, 768);
  ctx.closePath();
  ctx.fill();

  // Top "NOW SHOWING" ribbon
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 24, 512, 54);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, tag, 256, 61, 460, 26, '900');

  // Age Rating & CGV Stamp Badges
  ctx.fillStyle = '#facc15';
  ctx.fillRect(28, 96, 66, 38);
  ctx.fillStyle = '#18181b';
  drawFittedText(ctx, rating, 61, 124, 56, 24, '900');

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(396, 96, 88, 38);
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'CGV', 440, 124, 72, 24, '900');

  // Movie Title & Format Badges
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, 256, 588, 450, 54, '900');
  ctx.fillStyle = accentColor;
  drawFittedText(ctx, subtitle, 256, 646, 440, 26, '800');

  ctx.fillStyle = '#e4e4e7';
  drawFittedText(ctx, 'CGV IMAX LASER  •  GOLD CLASS  •  4DX', 256, 718, 440, 20, '700');

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 748);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCgvShowtimeBoardTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 576;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#07080d';
  ctx.fillRect(0, 0, 1536, 576);

  const hdr = ctx.createLinearGradient(0, 0, 1536, 0);
  hdr.addColorStop(0, '#991b1b');
  hdr.addColorStop(0.5, '#dc2626');
  hdr.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = hdr;
  ctx.fillRect(0, 0, 1536, 98);

  ctx.strokeStyle = '#e5c17c';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 1520, 560);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'LỊCH CHIẾU PHIM HÔM NAY  •  CGV SHOWTIMES', 768, 66, 1400, 44, '900');

  const rows = [
    { hall: 'HALL 1 • IMAX', film: 'HUYẾT THỐNG  (T18)', times: ['14:15', '17:30', '20:45'], color: '#38bdf8' },
    { hall: 'HALL 2 • GOLD', film: 'TÀI • PHIM VIỆT  (T16)', times: ['15:00', '18:10', '21:15'], color: '#e5c17c' },
    { hall: 'HALL 3 • 4DX', film: 'CONAN MOVIE  (K)', times: ['13:45', '16:15', '19:20'], color: '#fb923c' },
    { hall: 'SWEETBOX • 2D', film: 'BÒ SỮA BAY  (P)', times: ['13:30', '15:50', '18:40'], color: '#f472b6' },
  ];
  rows.forEach((r, idx) => {
    const ry = 132 + idx * 106;
    ctx.fillStyle = idx % 2 === 0 ? '#11131c' : '#0b0d14';
    ctx.fillRect(32, ry, 1472, 88);

    // Format badge pill
    ctx.fillStyle = r.color;
    ctx.fillRect(48, ry + 18, 250, 52);
    ctx.fillStyle = '#09090b';
    ctx.textAlign = 'center';
    drawFittedText(ctx, r.hall, 173, ry + 54, 224, 28, '900');

    // Movie title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    drawFittedText(ctx, r.film, 336, ry + 56, 560, 38, '800');

    // Individual showtime pills
    r.times.forEach((t, tIdx) => {
      const tx = 960 + tIdx * 172;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx, ry + 18, 150, 52);
      ctx.strokeStyle = '#e5c17c';
      ctx.lineWidth = 2;
      ctx.strokeRect(tx, ry + 18, 150, 52);
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      drawFittedText(ctx, t, tx + 75, ry + 54, 126, 28, '800');
    });
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCgvConcessionMenuTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 480;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, 1536, 480);

  const hdr = ctx.createLinearGradient(0, 0, 1536, 0);
  hdr.addColorStop(0, '#7f1d1d');
  hdr.addColorStop(0.5, '#b91c1c');
  hdr.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = hdr;
  ctx.fillRect(0, 0, 1536, 94);

  ctx.strokeStyle = '#e5c17c';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 1520, 464);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawFittedText(ctx, 'CGV POPCORN & COMBO BAR  •  BẮP RANG BƠ PHÔ MAI', 768, 62, 1400, 42, '900');

  const items = [
    { name: 'MY COMBO', detail: '1 BẮP LỚN + 1 NƯỚC NGỌT', price: '89.000Đ', badge: 'BEST SELLER' },
    { name: 'CGV COUPLE', detail: '1 BẮP CARAMEL + 2 NƯỚC', price: '115.000Đ', badge: 'PHỔ BIẾN' },
    { name: 'TUMBLER SET', detail: 'LY SƯU TẦM + BẮP LỚN', price: '199.000Đ', badge: 'LIMITED' },
  ];
  items.forEach((it, idx) => {
    const cx = 276 + idx * 492;
    ctx.fillStyle = '#151821';
    ctx.fillRect(cx - 216, 128, 432, 310);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 216, 128, 432, 10);

    ctx.fillStyle = '#e5c17c';
    drawFittedText(ctx, it.badge, cx, 174, 340, 22, '800');
    ctx.fillStyle = '#ffffff';
    drawFittedText(ctx, it.name, cx, 240, 380, 50, '900');
    ctx.fillStyle = '#cbd5e1';
    drawFittedText(ctx, it.detail, cx, 304, 380, 28, '700');

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 120, 348, 240, 62);
    ctx.fillStyle = '#ffffff';
    drawFittedText(ctx, it.price, cx, 390, 210, 36, '900');
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCgvLobbyCarpetTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1b141a';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#4c1d2e';
  ctx.lineWidth = 4;
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      ctx.strokeRect(x + 6, y + 6, 52, 52);
      ctx.fillStyle = ((x + y) / 64) % 2 === 0 ? '#2b1922' : '#20161d';
      ctx.fillRect(x + 14, y + 14, 36, 36);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function createCgvScreenTex(
  hallTitle: string,
  movieSub: string,
  topHex: string,
  midHex: string,
  orbHex: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 428; // 2.39:1 widescreen ratio
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, 1024, 428);

  const sky = ctx.createLinearGradient(0, 34, 1024, 394);
  sky.addColorStop(0, topHex);
  sky.addColorStop(0.55, midHex);
  sky.addColorStop(1, '#09090b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 34, 1024, 360);

  const sun = ctx.createRadialGradient(512, 205, 18, 512, 205, 155);
  sun.addColorStop(0, '#ffffff');
  sun.addColorStop(0.32, orbHex);
  sun.addColorStop(0.7, 'rgba(249, 115, 22, 0.35)');
  sun.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(512, 205, 155, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.moveTo(0, 394);
  ctx.lineTo(0, 310);
  ctx.lineTo(190, 278);
  ctx.lineTo(355, 325);
  ctx.lineTo(512, 265);
  ctx.lineTo(680, 318);
  ctx.lineTo(860, 268);
  ctx.lineTo(1024, 305);
  ctx.lineTo(1024, 394);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.textAlign = 'center';
  drawFittedText(ctx, hallTitle, 512, 168, 620, 44, '900');
  ctx.fillStyle = '#fde047';
  drawFittedText(ctx, movieSub, 512, 222, 680, 26, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ==========================================
// MAIN AEON MALL STRUCTURE BUILDER
// Footprint: X = 99.0 .. 157.0 (58.0m wide!), Z = 44.6 .. 91.6 (47.0m deep!), Height = 24.8m
// ==========================================
export function createAeonMallStructure(): AeonMallBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const interiorPointLights: Array<{ light: THREE.PointLight; nightInt: number; dayInt: number }> = [];

  const centerX = 128.0;
  const mallW = 58.0;
  const frontZ = 44.6;
  const backZ = 91.6;
  const mallD = backZ - frontZ; // 47.0m
  const midZ = (frontZ + backZ) / 2; // 68.1
  const mallH = 24.8;

  // Architectural Materials
  const facadeTex = createMallFacadeCladdingTex();
  const pearlWhiteMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    color: 0xe2e8f0,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const ceilingLampLensMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    emissive: 0xfef9c3,
    emissiveIntensity: 0.72,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const brushedAlumMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.12,
    envMapIntensity: 0,
  });
  const silverTrimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.85,
    metalness: 0.12,
    envMapIntensity: 0,
  });
  const aeonMagentaMat = new THREE.MeshStandardMaterial({
    color: 0x86198f,
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const aeonMagentaGlowMat = new THREE.MeshStandardMaterial({
    color: 0x9d174d,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0,
  });

  const warmLedGlowMat = new THREE.MeshStandardMaterial({
    color: 0xd6c297,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0,
  });

  const brightLedPanelMat = new THREE.MeshStandardMaterial({
    color: 0xd8dee6,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.86,
    metalness: 0.1,
    envMapIntensity: 0,
  });
  const slateWallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x7c8798,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const cedarWoodMat = new THREE.MeshStandardMaterial({
    color: 0x9a480a,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const turfGreenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0,
  });
  const sakuraPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf4a8cb,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0,
  });

  const atriumGlassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const floorTex = createMallAtriumFloorTex();
  const atriumFloorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0,
  });

  // =========================================================================
  // 1. GRAND PLAZA & SLEEK WHITE / GRAPHITE ARCHITECTURAL SHELL
  // =========================================================================
  const forecourtSlab = new THREE.Mesh(new THREE.BoxGeometry(mallW + 1.0, 0.14, 4.0), graniteMat);
  forecourtSlab.position.set(centerX, 0.0, 44.3);
  staticGroup.add(forecourtSlab);

  const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(mallW, 0.16, mallD), atriumFloorMat);
  mainFloor.position.set(centerX, -0.02, midZ);
  staticGroup.add(mainFloor);

  // Side Retail Wings (West: X = 97.8..112.0 + Starbucks Deep West Hall X = 78.0..97.8 at Z = 73.6..89.2; East: X = 144.0..176.2)
  // Split West Wing across ALL 3 Floors: Ground (UNIQLO / STARBUCKS), Floor 2 (MUJI / LOCK&LOCK / LEVI'S), Floor 3 (HP3 BBQ / TEXAS CHICKEN)!
  // Upper cladding above Y = 17.7..mallH (24.8) plus front/back piers & X=99.0..99.65 outer wall open Floor 3 West Wing cleanly onto the balcony.
  const westWingFloor3Top = new THREE.Mesh(new THREE.BoxGeometry(13.0, mallH - 17.7, mallD), pearlWhiteMat);
  westWingFloor3Top.position.set(105.5, 17.7 + (mallH - 17.7) / 2, midZ);
  staticGroup.add(westWingFloor3Top);

  const westF3FrontPier = new THREE.Mesh(new THREE.BoxGeometry(13.0, 6.2, 3.4), pearlWhiteMat);
  westF3FrontPier.position.set(105.5, 14.65, 46.3);
  staticGroup.add(westF3FrontPier);

  const westF3SubFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.56, mallD - 2.0), pearlWhiteMat);
  westF3SubFloorSlab.position.set(105.5, 11.98, midZ);
  staticGroup.add(westF3SubFloorSlab);

  const westF3OuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 6.2, 40.2), pearlWhiteMat);
  westF3OuterWall.position.set(99.325, 14.65, 68.1);
  staticGroup.add(westF3OuterWall);

  const westF3Divider = new THREE.Mesh(new THREE.BoxGeometry(13.0, 6.0, 1.4), pearlWhiteMat);
  westF3Divider.position.set(105.5, 14.7, 68.1);
  staticGroup.add(westF3Divider);

  const westF3BackPier = new THREE.Mesh(new THREE.BoxGeometry(13.0, 6.0, 3.4), pearlWhiteMat);
  westF3BackPier.position.set(105.5, 14.7, 89.9);
  staticGroup.add(westF3BackPier);

  const westF2SubFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.76, mallD - 2.0), pearlWhiteMat);
  westF2SubFloorSlab.position.set(105.5, 5.80, midZ);
  staticGroup.add(westF2SubFloorSlab);

  const westF2OuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 6.16, 40.1), pearlWhiteMat);
  westF2OuterWall.position.set(99.325, 8.50, 68.05);
  staticGroup.add(westF2OuterWall);

  [
    { z: 46.3, d: 3.4 },
    { z: 61.15, d: 1.3 },
    { z: 74.95, d: 1.3 },
    { z: 89.85, d: 3.5 },
  ].forEach((div) => {
    const wF2Div = new THREE.Mesh(new THREE.BoxGeometry(13.0, 6.16, div.d), pearlWhiteMat);
    wF2Div.position.set(105.5, 8.50, div.z);
    staticGroup.add(wF2Div);
  });

  const westWingFrontGround = new THREE.Mesh(new THREE.BoxGeometry(14.78, 5.4, 3.4), pearlWhiteMat);
  westWingFrontGround.position.set(104.61, 2.7, 46.3);
  staticGroup.add(westWingFrontGround);

  const westWingMidDivider = new THREE.Mesh(new THREE.BoxGeometry(14.8, 5.4, 1.3), pearlWhiteMat);
  westWingMidDivider.position.set(104.9, 2.7, 67.15);
  staticGroup.add(westWingMidDivider);

  const westWingBackGround = new THREE.Mesh(new THREE.BoxGeometry(34.4, 5.4, 2.4), pearlWhiteMat);
  westWingBackGround.position.set(94.8, 2.7, 90.4);
  staticGroup.add(westWingBackGround);

  // Rear boundary wall behind UNIQLO & Starbucks NW corner (X = 97.22..97.80, cleanly east of Royal Residences at 97.20)
  const westWingOuterBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.58, 5.4, 25.6), pearlWhiteMat);
  westWingOuterBackWall.position.set(97.51, 2.7, 60.8);
  staticGroup.add(westWingOuterBackWall);

  const westWingMiniRoofCap = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.3, 29.0), pearlWhiteMat);
  westWingMiniRoofCap.position.set(98.11, 5.35, 59.1);
  staticGroup.add(westWingMiniRoofCap);

  // Starbucks Deep West Roastery Annex Shell (X = 77.6..99.0, Z = 73.0..91.6, safely south of Royal Residences Z = 72.0)
  const sbAnnexNorthWall = new THREE.Mesh(new THREE.BoxGeometry(20.2, 5.55, 0.65), pearlWhiteMat);
  sbAnnexNorthWall.position.set(87.7, 2.775, 73.3);
  staticGroup.add(sbAnnexNorthWall);

  const sbAnnexBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.75, 5.55, 18.6), pearlWhiteMat);
  sbAnnexBackWall.position.set(77.65, 2.775, 82.3);
  staticGroup.add(sbAnnexBackWall);

  const sbAnnexRoof = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.35, 18.6), pearlWhiteMat);
  sbAnnexRoof.position.set(88.3, 5.42, 82.3);
  staticGroup.add(sbAnnexRoof);

  const sbAnnexTrim = new THREE.Mesh(
    new THREE.BoxGeometry(21.5, 0.22, 18.7),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.65 })
  );
  sbAnnexTrim.position.set(88.3, 5.48, 82.3);
  staticGroup.add(sbAnnexTrim);

  // Split East Wing across ALL 3 Floors: Ground (AEON STYLE / ZARA / H&M), Floor 2 (ADIDAS / NIKE / PUMA), Floor 3 (HAIDILAO / KICHI-KICHI)!
  // Upper cladding above Y = 17.7..mallH (24.8) plus front/back piers & 32m annex walls open Floor 3 East Wing cleanly onto the balcony.
  const eastWingFloor3Top = new THREE.Mesh(new THREE.BoxGeometry(13.0, mallH - 17.7, mallD), pearlWhiteMat);
  eastWingFloor3Top.position.set(150.5, 17.7 + (mallH - 17.7) / 2, midZ);
  staticGroup.add(eastWingFloor3Top);

  const eastF3FrontPier = new THREE.Mesh(new THREE.BoxGeometry(13.0, 6.2, 3.4), pearlWhiteMat);
  eastF3FrontPier.position.set(150.5, 14.65, 46.3);
  staticGroup.add(eastF3FrontPier);

  const eastF3SubFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(32.8, 0.56, 44.2), pearlWhiteMat);
  eastF3SubFloorSlab.position.set(160.4, 11.98, 69.5);
  staticGroup.add(eastF3SubFloorSlab);

  const eastF3NorthWall = new THREE.Mesh(new THREE.BoxGeometry(19.8, 6.0, 0.58), pearlWhiteMat);
  eastF3NorthWall.position.set(166.9, 14.7, 47.68);
  staticGroup.add(eastF3NorthWall);

  const eastF3OuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.0, 44.2), pearlWhiteMat);
  eastF3OuterWall.position.set(176.55, 14.7, 69.5);
  staticGroup.add(eastF3OuterWall);

  const eastF3Divider = new THREE.Mesh(new THREE.BoxGeometry(32.8, 6.0, 1.4), pearlWhiteMat);
  eastF3Divider.position.set(160.4, 14.7, 68.1);
  staticGroup.add(eastF3Divider);

  const eastF3BackPier = new THREE.Mesh(new THREE.BoxGeometry(32.8, 6.0, 3.4), pearlWhiteMat);
  eastF3BackPier.position.set(160.4, 14.7, 89.9);
  staticGroup.add(eastF3BackPier);

  const eastF3AnnexRoof = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.42, 44.2), pearlWhiteMat);
  eastF3AnnexRoof.position.set(166.9, 17.65, 69.5);
  staticGroup.add(eastF3AnnexRoof);

  const eastF3AnnexTrim = new THREE.Mesh(new THREE.BoxGeometry(19.9, 0.22, 44.3), brushedAlumMat);
  eastF3AnnexTrim.position.set(166.9, 17.72, 69.5);
  staticGroup.add(eastF3AnnexTrim);

  const eastF2SubFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.76, mallD - 2.0), pearlWhiteMat);
  eastF2SubFloorSlab.position.set(150.5, 5.80, midZ);
  staticGroup.add(eastF2SubFloorSlab);

  const eastF2SubFloorAnnex = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.56, 44.2), pearlWhiteMat);
  eastF2SubFloorAnnex.position.set(166.9, 5.90, 69.5);
  staticGroup.add(eastF2SubFloorAnnex);

  const eastF2NorthWall = new THREE.Mesh(new THREE.BoxGeometry(19.8, 5.98, 0.58), pearlWhiteMat);
  eastF2NorthWall.position.set(166.9, 8.61, 47.68);
  staticGroup.add(eastF2NorthWall);

  const eastF2OuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.98, 44.2), pearlWhiteMat);
  eastF2OuterWall.position.set(176.55, 8.61, 69.5);
  staticGroup.add(eastF2OuterWall);

  const eastF2AnnexRoof = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.35, 44.2), pearlWhiteMat);
  eastF2AnnexRoof.position.set(166.9, 11.595, 69.5);
  staticGroup.add(eastF2AnnexRoof);

  const eastF2AnnexTrim = new THREE.Mesh(new THREE.BoxGeometry(19.9, 0.22, 44.3), brushedAlumMat);
  eastF2AnnexTrim.position.set(166.9, 11.66, 69.5);
  staticGroup.add(eastF2AnnexTrim);

  const f2FrontDiv = new THREE.Mesh(new THREE.BoxGeometry(13.0, 6.16, 3.4), pearlWhiteMat);
  f2FrontDiv.position.set(150.5, 8.50, 46.3);
  staticGroup.add(f2FrontDiv);

  [
    { z: 61.15, d: 1.3 },
    { z: 74.95, d: 1.3 },
    { z: 89.85, d: 3.5 },
  ].forEach((div) => {
    const f2Div = new THREE.Mesh(new THREE.BoxGeometry(32.8, 5.98, div.d), pearlWhiteMat);
    f2Div.position.set(160.4, 8.61, div.z);
    staticGroup.add(f2Div);
  });

  const eastWingFrontGround = new THREE.Mesh(new THREE.BoxGeometry(13.0, 5.4, 3.4), pearlWhiteMat);
  eastWingFrontGround.position.set(150.5, 2.7, 46.3);
  staticGroup.add(eastWingFrontGround);

  // Exterior Ground-Floor Annex Shell for Deep 32m AEON STYLE Hypermarket (X = 157.0..176.8, Z = 47.4..61.1)
  const aeonAnnexNorthWall = new THREE.Mesh(new THREE.BoxGeometry(19.8, 5.55, 0.58), pearlWhiteMat);
  aeonAnnexNorthWall.position.set(166.9, 2.775, 47.68);
  staticGroup.add(aeonAnnexNorthWall);

  const aeonAnnexBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.55, 13.7), pearlWhiteMat);
  aeonAnnexBackWall.position.set(176.55, 2.775, 54.25);
  staticGroup.add(aeonAnnexBackWall);

  const aeonAnnexRoof = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.35, 13.7), pearlWhiteMat);
  aeonAnnexRoof.position.set(166.9, 5.42, 54.25);
  staticGroup.add(aeonAnnexRoof);

  const aeonAnnexTrim = new THREE.Mesh(new THREE.BoxGeometry(19.9, 0.24, 13.8), aeonMagentaGlowMat);
  aeonAnnexTrim.position.set(166.9, 5.48, 54.25);
  staticGroup.add(aeonAnnexTrim);

  // Dividers & Deep 32m Annex Enclosures for ZARA (Z=61.8..74.3) and H&M (Z=75.6..88.1) flush at X=176.55
  const eastWingDivider1 = new THREE.Mesh(new THREE.BoxGeometry(32.8, 5.4, 1.3), pearlWhiteMat);
  eastWingDivider1.position.set(160.4, 2.7, 61.15);
  staticGroup.add(eastWingDivider1);

  const eastWingDivider2 = new THREE.Mesh(new THREE.BoxGeometry(32.8, 5.4, 1.3), pearlWhiteMat);
  eastWingDivider2.position.set(160.4, 2.7, 74.95);
  staticGroup.add(eastWingDivider2);

  const eastWingBackGround = new THREE.Mesh(new THREE.BoxGeometry(32.8, 5.4, 3.5), pearlWhiteMat);
  eastWingBackGround.position.set(160.4, 2.7, 89.85);
  staticGroup.add(eastWingBackGround);

  const eastWingBoutiqueBackWall = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.55, 30.5), pearlWhiteMat);
  eastWingBoutiqueBackWall.position.set(176.55, 2.775, 76.35);
  staticGroup.add(eastWingBoutiqueBackWall);

  const eastWingBoutiqueAnnexRoof = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.35, 30.5), pearlWhiteMat);
  eastWingBoutiqueAnnexRoof.position.set(166.9, 5.42, 76.35);
  staticGroup.add(eastWingBoutiqueAnnexRoof);

  const eastWingBoutiqueTrim = new THREE.Mesh(new THREE.BoxGeometry(19.9, 0.22, 30.6), brushedAlumMat);
  eastWingBoutiqueTrim.position.set(166.9, 5.48, 76.35);
  staticGroup.add(eastWingBoutiqueTrim);

  // Split South Rear Atrium Wall across ALL 3 Floors:
  // Ground Floor (MLB / CHARLES & KEITH), Floor 2 (TOMMY HILFIGER / CROCS), Floor 3 (CGV CINEMAS • X=112.4..143.6!)
  const rearF3WestPier = new THREE.Mesh(new THREE.BoxGeometry(13.4, mallH - 11.6, 0.9), slateWallMat);
  rearF3WestPier.position.set(105.7, 11.6 + (mallH - 11.6) / 2, backZ);
  staticGroup.add(rearF3WestPier);

  const rearF3EastPier = new THREE.Mesh(new THREE.BoxGeometry(13.4, mallH - 11.6, 0.9), slateWallMat);
  rearF3EastPier.position.set(150.3, 11.6 + (mallH - 11.6) / 2, backZ);
  staticGroup.add(rearF3EastPier);

  const rearF3CenterTop = new THREE.Mesh(new THREE.BoxGeometry(31.2, mallH - 18.4, 0.9), slateWallMat);
  rearF3CenterTop.position.set(centerX, 18.4 + (mallH - 18.4) / 2, backZ);
  staticGroup.add(rearF3CenterTop);

  const rearWestPier = new THREE.Mesh(new THREE.BoxGeometry(13.4, 5.38, 0.9), slateWallMat);
  rearWestPier.position.set(105.7, 2.69, backZ);
  staticGroup.add(rearWestPier);

  const rearCenterPier = new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.38, 0.9), slateWallMat);
  rearCenterPier.position.set(128.0, 2.69, backZ);
  staticGroup.add(rearCenterPier);

  const rearEastPier = new THREE.Mesh(new THREE.BoxGeometry(13.4, 5.38, 0.9), slateWallMat);
  rearEastPier.position.set(150.3, 2.69, backZ);
  staticGroup.add(rearEastPier);

  // Floor 2 South Rear Piers framing TOMMY HILFIGER (X=112.4..127.5) & CROCS (X=128.5..143.6)
  const rearF2WestPier = new THREE.Mesh(new THREE.BoxGeometry(13.4, 6.2, 0.9), slateWallMat);
  rearF2WestPier.position.set(105.7, 8.5, backZ);
  staticGroup.add(rearF2WestPier);

  const rearF2CenterPier = new THREE.Mesh(new THREE.BoxGeometry(1.0, 6.2, 0.9), slateWallMat);
  rearF2CenterPier.position.set(128.0, 8.5, backZ);
  staticGroup.add(rearF2CenterPier);

  const rearF2EastPier = new THREE.Mesh(new THREE.BoxGeometry(13.4, 6.2, 0.9), slateWallMat);
  rearF2EastPier.position.set(150.3, 8.5, backZ);
  staticGroup.add(rearF2EastPier);

  // 34m Deep South Rear Annex Shell behind Atrium (X = 111.75..144.25, Z = 92.08..126.0, Floors 1, 2 & 3!)
  const southAnnexWestWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.55, 33.7), pearlWhiteMat);
  southAnnexWestWall.position.set(112.06, 2.775, 108.93);
  staticGroup.add(southAnnexWestWall);

  const southAnnexEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.55, 33.7), pearlWhiteMat);
  southAnnexEastWall.position.set(143.94, 2.775, 108.93);
  staticGroup.add(southAnnexEastWall);

  const southAnnexCenterWall = new THREE.Mesh(new THREE.BoxGeometry(0.96, 5.55, 33.7), pearlWhiteMat);
  southAnnexCenterWall.position.set(128.0, 2.775, 108.93);
  staticGroup.add(southAnnexCenterWall);

  const southAnnexBackWall = new THREE.Mesh(new THREE.BoxGeometry(32.5, 5.55, 0.85), pearlWhiteMat);
  southAnnexBackWall.position.set(128.0, 2.775, 125.58);
  staticGroup.add(southAnnexBackWall);

  const southAnnexRoof = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.35, 33.7), pearlWhiteMat);
  southAnnexRoof.position.set(128.0, 5.42, 108.93);
  staticGroup.add(southAnnexRoof);

  const southAnnexTrim = new THREE.Mesh(new THREE.BoxGeometry(32.6, 0.22, 33.8), brushedAlumMat);
  southAnnexTrim.position.set(128.0, 5.48, 108.98);
  staticGroup.add(southAnnexTrim);

  // Floor 2 South Rear Annex Shell (Stacked cleanly at Y = 5.42..11.66 for TOMMY HILFIGER & CROCS)
  const southF2SubFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.76, 33.7), pearlWhiteMat);
  southF2SubFloorSlab.position.set(128.0, 5.80, 108.93);
  staticGroup.add(southF2SubFloorSlab);

  const southF2WestWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 6.10, 33.7), pearlWhiteMat);
  southF2WestWall.position.set(112.06, 8.60, 108.93);
  staticGroup.add(southF2WestWall);

  const southF2EastWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 6.10, 33.7), pearlWhiteMat);
  southF2EastWall.position.set(143.94, 8.60, 108.93);
  staticGroup.add(southF2EastWall);

  const southF2CenterWall = new THREE.Mesh(new THREE.BoxGeometry(0.96, 6.10, 33.7), pearlWhiteMat);
  southF2CenterWall.position.set(128.0, 8.60, 108.93);
  staticGroup.add(southF2CenterWall);

  const southF2BackWall = new THREE.Mesh(new THREE.BoxGeometry(32.5, 6.10, 0.85), pearlWhiteMat);
  southF2BackWall.position.set(128.0, 8.60, 125.58);
  staticGroup.add(southF2BackWall);

  const southF2Roof = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.35, 33.7), pearlWhiteMat);
  southF2Roof.position.set(128.0, 11.595, 108.93);
  staticGroup.add(southF2Roof);

  const southF2Trim = new THREE.Mesh(new THREE.BoxGeometry(32.6, 0.22, 33.8), brushedAlumMat);
  southF2Trim.position.set(128.0, 11.66, 108.98);
  staticGroup.add(southF2Trim);

  // Floor 3 South Rear Annex Shell (Stacked cleanly at Y = 11.66..20.95 for CGV CINEMAS Multiplex & IMAX Auditorium!)
  const southF3SubFloorSlab = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.56, 33.7), pearlWhiteMat);
  southF3SubFloorSlab.position.set(128.0, 11.98, 108.93);
  staticGroup.add(southF3SubFloorSlab);

  const southF3WestWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.20, 33.7), pearlWhiteMat);
  southF3WestWall.position.set(112.06, 16.30, 108.93);
  staticGroup.add(southF3WestWall);

  const southF3EastWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.20, 33.7), pearlWhiteMat);
  southF3EastWall.position.set(143.94, 16.30, 108.93);
  staticGroup.add(southF3EastWall);

  const southF3BackWall = new THREE.Mesh(new THREE.BoxGeometry(32.5, 9.20, 0.85), pearlWhiteMat);
  southF3BackWall.position.set(128.0, 16.30, 125.58);
  staticGroup.add(southF3BackWall);

  const southF3Roof = new THREE.Mesh(new THREE.BoxGeometry(32.5, 0.42, 33.7), pearlWhiteMat);
  southF3Roof.position.set(128.0, 20.80, 108.93);
  staticGroup.add(southF3Roof);

  const southF3Trim = new THREE.Mesh(new THREE.BoxGeometry(32.6, 0.24, 33.8), brushedAlumMat);
  southF3Trim.position.set(128.0, 20.92, 108.98);
  staticGroup.add(southF3Trim);

  // Architectural Roof Cornice & Sleek Brushed-Aluminum Spandrel Bands
  const topCornice = new THREE.Mesh(new THREE.BoxGeometry(mallW + 0.8, 0.75, 0.9), brushedAlumMat);
  topCornice.position.set(centerX, mallH, frontZ - 0.1);
  staticGroup.add(topCornice);

  const topMagentaLed = new THREE.Mesh(new THREE.BoxGeometry(mallW + 0.85, 0.22, 0.96), aeonMagentaGlowMat);
  topMagentaLed.position.set(centerX, mallH - 0.35, frontZ - 0.12);
  staticGroup.add(topMagentaLed);

  // Clean horizontal silver-aluminum floor bands ONLY on outer wings + mid-upper Floor 3 accent band
  [5.9, 11.9, 19.8].forEach((by) => {
    [105.5, 150.5].forEach((wx) => {
      const wingBand = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.36, 0.45), brushedAlumMat);
      wingBand.position.set(wx, by, frontZ - 0.14);
      staticGroup.add(wingBand);
    });
    // Side return cornice bands
    [98.9, 157.1].forEach((sx) => {
      const sBand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, mallD), brushedAlumMat);
      sBand.position.set(sx, by, midZ);
      staticGroup.add(sBand);
    });
  });

  // =========================================================================
  // 2. MAJOR EXTERIOR BRAND BILLBOARDS & DOOH LED POSTERS ("NHIỀU POSTER QUẢNG CÁO CÁC NHÃN HÀNG LỚN")
  // All billboards framed in crisp dark-steel lightboxes with zero clipped typography!
  // =========================================================================
  const addExteriorBillboard = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotY: number,
    style: BrandPosterStyle,
    emissiveInt = 0.72
  ) => {
    const tex = createGlobalBrandPosterTex(style, 1024, Math.max(320, Math.round((1024 * h) / w)));
    tex.anisotropy = 4;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, h + 0.45, 0.22), darkFrameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    staticGroup.add(frame);

    const posterMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: emissiveInt,
      roughness: 0.22,
    });
    neonMats.push(posterMat);

    const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), posterMat);
    // Push plane slightly forward along its local +Z normal before rotation
    const normalZ = Math.cos(rotY);
    const normalX = Math.sin(rotY);
    poster.position.set(x + normalX * 0.125, y, z + normalZ * 0.125);
    poster.rotation.y = rotY;
    staticGroup.add(poster);
  };

  // NOTE: Street is at Z < 44.6 (-Z normal -> rotY = Math.PI)
  // FRONT WEST RETAIL WING (X = 105.5, facing -Z street — 3 full billboard tiers!):
  addExteriorBillboard(105.5, 3.1, frontZ - 0.12, 11.2, 4.4, Math.PI, 'aeon_supermarket', 0.72);
  addExteriorBillboard(105.5, 8.9, frontZ - 0.12, 11.2, 4.4, Math.PI, 'uniqlo', 0.58);
  addExteriorBillboard(105.5, 15.8, frontZ - 0.12, 11.2, 4.4, Math.PI, 'nike', 0.76);

  // FRONT EAST RETAIL WING (X = 150.5, facing -Z street — 3 full billboard tiers!):
  addExteriorBillboard(150.5, 3.1, frontZ - 0.12, 11.2, 4.4, Math.PI, 'zara', 0.74);
  addExteriorBillboard(150.5, 8.9, frontZ - 0.12, 11.2, 4.4, Math.PI, 'adidas', 0.76);
  addExteriorBillboard(150.5, 15.8, frontZ - 0.12, 11.2, 4.4, Math.PI, 'hm', 0.58);

  // WEST SIDE FACADE WALL (X = 98.9, facing West toward The Royal Residences — huge visibility!):
  addExteriorBillboard(98.9, 8.9, 55.0, 15.0, 5.2, -Math.PI / 2, 'cgv', 0.75);
  addExteriorBillboard(98.9, 8.9, 75.0, 15.0, 5.2, -Math.PI / 2, 'adidas', 0.74);
  addExteriorBillboard(98.9, 15.8, 65.0, 18.0, 4.8, -Math.PI / 2, 'nike', 0.76);

  // EAST SIDE FACADE WALL (X = 177.08, flush on outer 32m Floor 2 & Floor 3 East Annex wall facing East avenue):
  addExteriorBillboard(177.08, 8.9, 55.0, 15.0, 5.2, Math.PI / 2, 'zara', 0.74);
  addExteriorBillboard(177.08, 8.9, 75.0, 15.0, 5.2, Math.PI / 2, 'haidilao', 0.75);
  addExteriorBillboard(177.08, 14.8, 58.0, 15.0, 4.6, Math.PI / 2, 'haidilao', 0.75);

  // EAST WING NORTH ANNEX FACADE (X = 157.0..176.8, Z = 47.39, facing -Z street — 7 distinct brand posters across Floors 1–3)
  const annexPosterLoader = new THREE.TextureLoader();
  const addPhotoLightboxBillboard = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotY: number,
    imgUrl: string,
    emissiveInt = 0.65
  ) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, h + 0.36, 0.22), darkFrameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    staticGroup.add(frame);

    const posterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: emissiveInt,
      roughness: 0.24,
    });
    if (typeof window !== 'undefined') {
      annexPosterLoader.load(imgUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        posterMat.map = tex;
        posterMat.emissiveMap = tex;
        posterMat.needsUpdate = true;
      });
    }
    neonMats.push(posterMat);

    const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), posterMat);
    const normalZ = Math.cos(rotY);
    const normalX = Math.sin(rotY);
    poster.position.set(x + normalX * 0.125, y, z + normalZ * 0.125);
    poster.rotation.y = rotY;
    staticGroup.add(poster);
  };

  // Floor 3 (Y = 14.90): Levi's & Tommy Hilfiger
  addPhotoLightboxBillboard(162.5, 14.90, 47.27, 4.40, 4.40, Math.PI, '/assets/aeon-posters/annex_poster_4.jpg', 0.64);
  addPhotoLightboxBillboard(171.3, 14.90, 47.27, 3.19, 4.55, Math.PI, '/assets/aeon-posters/annex_poster_3.jpg', 0.64);
  // Floor 2 (Y = 8.80): PUMA, MUJI & CROCS
  addPhotoLightboxBillboard(160.8, 8.80, 47.27, 3.30, 4.40, Math.PI, '/assets/aeon-posters/annex_poster_6.jpg', 0.68);
  addPhotoLightboxBillboard(166.9, 8.80, 47.27, 3.10, 4.42, Math.PI, '/assets/aeon-posters/annex_poster_5.jpg', 0.56);
  addPhotoLightboxBillboard(173.0, 8.80, 47.27, 2.95, 4.40, Math.PI, '/assets/aeon-posters/annex_poster_7.jpg', 0.64);
  // Floor 1 (Y = 2.85): Haidilao Hotpot & Shohei Ohtani MLB
  addPhotoLightboxBillboard(162.5, 2.85, 47.27, 2.36, 4.20, Math.PI, '/assets/aeon-posters/annex_poster_1.jpg', 0.68);
  addPhotoLightboxBillboard(171.3, 2.85, 47.27, 3.36, 4.20, Math.PI, '/assets/aeon-posters/annex_poster_2.jpg', 0.68);

  // Illuminated Freestanding Plaza Citylight Poster Kiosks ("Poster đứng trước sảnh Mall" — All 5 Brand Posters!):
  [
    { x: 111.2, style: 'uniqlo' as BrandPosterStyle, emissive: 0.58 },
    { x: 115.2, style: 'adidas' as BrandPosterStyle, emissive: 0.76 },
    { x: 121.0, style: 'nike' as BrandPosterStyle, emissive: 0.78 },
    { x: 135.0, style: 'zara' as BrandPosterStyle, emissive: 0.74 },
    { x: 141.5, style: 'hm' as BrandPosterStyle, emissive: 0.58 },
  ].forEach((k) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.2, 0.26), darkFrameMat);
    post.position.set(k.x, 1.65, 43.0);
    staticGroup.add(post);

    const kTex = createGlobalBrandPosterTex(k.style, 768, 960);
    kTex.anisotropy = 4;
    const kMat = new THREE.MeshStandardMaterial({
      map: kTex,
      emissive: 0xffffff,
      emissiveMap: kTex,
      emissiveIntensity: k.emissive,
      roughness: 0.2,
    });
    neonMats.push(kMat);
    const faceFront = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.75), kMat);
    faceFront.rotation.y = Math.PI;
    faceFront.position.set(k.x, 1.75, 42.85);
    staticGroup.add(faceFront);

    const faceBack = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.75), kMat);
    faceBack.position.set(k.x, 1.75, 43.15);
    staticGroup.add(faceBack);
  });

  // =========================================================================
  // 3. CENTRAL 3-STORY PANORAMIC ATRIUM GLASS & AEON PORTE-COCHERE
  // =========================================================================

  // Sweeping Architectural Glass & Dark-Steel Porte-Cochère Canopy (Z = 42.4 .. 45.4)
  const porteCanopy = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.45, 3.2), brushedAlumMat);
  porteCanopy.position.set(centerX, 5.1, 43.8);
  staticGroup.add(porteCanopy);

  const porteEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(20.1, 0.14, 3.28), aeonMagentaGlowMat);
  porteEdgeGlow.position.set(centerX, 4.86, 43.8);
  staticGroup.add(porteEdgeGlow);

  const canopyGlow = new THREE.Mesh(new THREE.PlaneGeometry(17.5, 2.0), brightLedPanelMat);
  canopyGlow.rotation.x = Math.PI / 2;
  canopyGlow.position.set(centerX, 4.84, 43.8);
  staticGroup.add(canopyGlow);

  // Architectural Champagne/Brushed-Steel Columns framing Main Plaza
  [118.6, 123.4, 132.6, 137.4].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.9, 16), silverTrimMat);
    col.position.set(px, 2.45, 42.5);
    staticGroup.add(col);
  });

  // Sculpted Architectural Shrubs in Slate Planter Boxes
  [117.5, 138.5].forEach((tx) => {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 1.2), slateWallMat);
    planter.position.set(tx, 0.275, 43.8);
    staticGroup.add(planter);
    [-0.75, 0, 0.75].forEach((dx) => {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), turfGreenMat);
      bush.position.set(tx + dx, 0.8, 43.8);
      staticGroup.add(bush);
    });
  });

  // Front Panoramic Curtain Glass Wall (Floors 1-2 + lower 50% of Floor 3: Y = 0..18.4, doorway X = 125.0..131.0)
  // Upper 50% of Floor 3 (Y = 18.4..mallH) stays solid pearl-white architectural cladding!
  const f3GlassTopY = 18.4;
  const glassLeft = new THREE.Mesh(new THREE.PlaneGeometry(13.0, f3GlassTopY), atriumGlassMat);
  glassLeft.position.set(118.5, f3GlassTopY / 2, 45.2);
  staticGroup.add(glassLeft);

  const glassRight = new THREE.Mesh(new THREE.PlaneGeometry(13.0, f3GlassTopY), atriumGlassMat);
  glassRight.position.set(137.5, f3GlassTopY / 2, 45.2);
  staticGroup.add(glassRight);

  const glassOverDoorH = f3GlassTopY - 4.5;
  const glassOverDoor = new THREE.Mesh(new THREE.PlaneGeometry(6.0, glassOverDoorH), atriumGlassMat);
  glassOverDoor.position.set(centerX, 4.5 + glassOverDoorH / 2, 45.2);
  staticGroup.add(glassOverDoor);

  [112.0, 118.5, 125.0, 131.0, 137.5, 144.0].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.16, f3GlassTopY, 0.22), darkFrameMat);
    mullion.position.set(mx, f3GlassTopY / 2, 45.2);
    staticGroup.add(mullion);
  });

  [4.5, 9.0, 13.5, f3GlassTopY].forEach((hy) => {
    const transom = new THREE.Mesh(new THREE.BoxGeometry(32.0, 0.14, 0.20), brushedAlumMat);
    transom.position.set(centerX, hy, 45.2);
    staticGroup.add(transom);
  });

  // Upper 50% of Floor 3 Front Wall (Y = 18.4..mallH, solid pearl-white cladding)
  const f3FrontWallH = mallH - f3GlassTopY;
  const f3FrontWall = new THREE.Mesh(
    new THREE.BoxGeometry(32.0, f3FrontWallH, 0.7),
    pearlWhiteMat
  );
  f3FrontWall.position.set(centerX, f3GlassTopY + f3FrontWallH / 2, 45.15);
  staticGroup.add(f3FrontWall);

  const f3FrontBand = new THREE.Mesh(new THREE.BoxGeometry(32.4, 0.36, 0.84), brushedAlumMat);
  f3FrontBand.position.set(centerX, f3GlassTopY + 0.05, 45.15);
  staticGroup.add(f3FrontBand);

  // Official AEON MALL corporate logo centered on the upper white facade wall
  const aeonLogoTex = createAeonCorporateLogoTex();
  const aeonLogoMat = new THREE.MeshStandardMaterial({
    map: aeonLogoTex,
    emissive: 0xffffff,
    emissiveMap: aeonLogoTex,
    emissiveIntensity: 0.28,
    transparent: true,
    alphaTest: 0.04,
    roughness: 0.35,
    metalness: 0.05,
  });
  neonMats.push(aeonLogoMat);
  const aeonWallLogo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), aeonLogoMat);
  aeonWallLogo.rotation.y = Math.PI;
  aeonWallLogo.position.set(centerX, 21.48, 44.76);
  staticGroup.add(aeonWallLogo);

  // Automatic Sliding Glass Double Doors (doorLeft / doorRight -> userData.noMerge = true)
  const buildSlidingDoorLeaf = (sx: number) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    leaf.position.set(sx, 0, 0);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.1, 0.08), darkFrameMat);
    topRail.position.set(0, 4.35, 0);
    leaf.add(topRail);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.12, 0.08), darkFrameMat);
    botRail.position.set(0, 0.06, 0);
    leaf.add(botRail);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(2.9, 4.2, 0.04), atriumGlassMat);
    pane.position.set(0, 2.2, 0);
    leaf.add(pane);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), aeonMagentaGlowMat);
    handle.position.set(sx < 0 ? 1.25 : -1.25, 1.35, -0.05);
    leaf.add(handle);
    return leaf;
  };

  const doorRoot = new THREE.Group();
  doorRoot.userData.noMerge = true;
  doorRoot.position.set(centerX, 0, 45.15);
  const doorLeft = buildSlidingDoorLeaf(-1.48);
  const doorRight = buildSlidingDoorLeaf(1.48);
  doorRoot.add(doorLeft, doorRight);
  staticGroup.add(doorRoot);

  // Sidewalk AEON MALL Directory Pylon at X = 100.8, Z = 43.2
  const pylonBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.2, 0.48), darkFrameMat);
  pylonBody.position.set(100.8, 3.1, 43.2);
  staticGroup.add(pylonBody);

  const pylonTex = createMallPylonTex();
  const pylonMat = new THREE.MeshStandardMaterial({
    map: pylonTex,
    emissive: 0xffffff,
    emissiveMap: pylonTex,
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });
  neonMats.push(pylonMat);
  const pylonFace = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 2.64), pylonMat);
  pylonFace.rotation.y = Math.PI;
  pylonFace.position.set(100.8, 3.6, 42.94);
  staticGroup.add(pylonFace);

  // =========================================================================
  // 4. SOARING 3-STORY INTERIOR ATRIUM, HIGH SOLID CEILING, BALCONIES, ESCALATORS & SHOPS
  // =========================================================================
  // Clean solid pearl-white architectural roof slab (matching Floor 1 & Floor 2 finish, zero glass skylight)
  const solidRoofSlab = new THREE.Mesh(new THREE.BoxGeometry(mallW, 0.72, mallD), pearlWhiteMat);
  solidRoofSlab.position.set(centerX, mallH - 0.36, midZ);
  staticGroup.add(solidRoofSlab);

  // Standard Architectural Mall Linear Ceiling Light Fixtures (matching Floor 1 & Floor 2 panels)
  const addCeilingLightPanel = (lx: number, ly: number, lz: number, w: number, d: number) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), darkFrameMat);
    housing.position.set(lx, ly, lz);
    staticGroup.add(housing);

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(w - 0.22, 0.04, d - 0.16), ceilingLampLensMat);
    diffuser.position.set(lx, ly - 0.04, lz);
    staticGroup.add(diffuser);
  };

  // Floor 3 High Ceiling Lights (3 clean columns × 6 rows flush on ceiling)
  [115.6, centerX, 140.4].forEach((lx) => {
    [53.0, 59.0, 65.0, 71.0, 77.0, 83.0].forEach((lz) => {
      addCeilingLightPanel(lx, mallH - 0.76, lz, 3.8, 0.86);
    });
  });

  [6.0, 12.0].forEach((by, lvlIdx) => {
    // Widened 6.8m West (X = 112.0..118.8) & East (X = 137.2..144.0) Side Balconies
    [115.4, 140.6].forEach((bx) => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.36, mallD - 2.0), pearlWhiteMat);
      deck.position.set(bx, by, midZ);
      staticGroup.add(deck);

      // Floor 1 (under Floor 2 deck) & Floor 2 (under Floor 3 deck) corridor ceiling light panels
      [50.0, 56.0, 62.0, 68.0, 74.0, 80.0, 86.0].forEach((lz) => {
        addCeilingLightPanel(bx, by - 0.20, lz, 2.2, 0.68);
      });

      if (lvlIdx === 0) {
        // Floor 2 single continuous central atrium void Z = 52.2..84.7
        const ledUnder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 32.5), warmLedGlowMat);
        ledUnder.position.set(bx < centerX ? bx + 3.35 : bx - 3.35, by - 0.16, 68.45);
        staticGroup.add(ledUnder);

        const glassRail = new THREE.Mesh(new THREE.PlaneGeometry(32.5, 1.15), atriumGlassMat);
        glassRail.rotation.y = Math.PI / 2;
        glassRail.position.set(bx < centerX ? bx + 3.36 : bx - 3.36, by + 0.72, 68.45);
        staticGroup.add(glassRail);
      } else {
        // Floor 3 split around Front Bridge (Z<=52.2), Skybridge (Z=66.2..72.5) & Back Bridge (Z>=84.7)
        [
          { z: 59.2, len: 14.0 },
          { z: 78.6, len: 12.2 },
        ].forEach((seg) => {
          const ledUnder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, seg.len), warmLedGlowMat);
          ledUnder.position.set(bx < centerX ? bx + 3.35 : bx - 3.35, by - 0.16, seg.z);
          staticGroup.add(ledUnder);

          const glassRail = new THREE.Mesh(new THREE.PlaneGeometry(seg.len, 1.15), atriumGlassMat);
          glassRail.rotation.y = Math.PI / 2;
          glassRail.position.set(bx < centerX ? bx + 3.36 : bx - 3.36, by + 0.72, seg.z);
          staticGroup.add(glassRail);
        });
      }
    });

    // Wide 6.6m Front North Panoramic Sky-Promenade (X = 118.8..137.2, Z = 45.6..52.2) creating a full 360° loop!
    const frontBridge = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.36, 6.6), pearlWhiteMat);
    frontBridge.position.set(centerX, by, 48.9);
    staticGroup.add(frontBridge);

    [122.0, centerX, 134.0].forEach((lx) => {
      addCeilingLightPanel(lx, by - 0.20, 48.9, 2.2, 0.68);
    });

    const frontBridgeLed = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.12, 0.14), warmLedGlowMat);
    frontBridgeLed.position.set(centerX, by - 0.16, 52.15);
    staticGroup.add(frontBridgeLed);

    const frontBridgeRail = new THREE.Mesh(new THREE.PlaneGeometry(18.4, 1.15), atriumGlassMat);
    frontBridgeRail.position.set(centerX, by + 0.72, 52.18);
    staticGroup.add(frontBridgeRail);

    // Expanded South Back Bridge (X = 112.0..144.0, Z = 84.7..91.15)
    const backBridge = new THREE.Mesh(new THREE.BoxGeometry(32.0, 0.36, 6.45), pearlWhiteMat);
    backBridge.position.set(centerX, by, 87.925);
    staticGroup.add(backBridge);

    [116.0, 122.0, centerX, 134.0, 140.0].forEach((lx) => {
      addCeilingLightPanel(lx, by - 0.20, 87.925, 2.2, 0.68);
    });

    if (lvlIdx === 0) {
      // Floor 2 back rail split cleanly at wide 4-lane escalator & grand stair landings (X = 120.2..135.8)
      [
        { x: 119.5, w: 1.4 },
        { x: 124.0, w: 0.4 },
        { x: 128.0, w: 0.4 },
        { x: 132.0, w: 0.4 },
        { x: 136.5, w: 1.4 },
      ].forEach((seg) => {
        const railSeg = new THREE.Mesh(new THREE.PlaneGeometry(seg.w, 1.15), atriumGlassMat);
        railSeg.position.set(seg.x, by + 0.72, 84.72);
        staticGroup.add(railSeg);
      });
    } else {
      // Floor 3 back rail + Expanded 6.3m Floor 3 Central Skybridge (X = 118.8..137.2, Z = 66.2..72.5)
      const backRail = new THREE.Mesh(new THREE.PlaneGeometry(18.4, 1.15), atriumGlassMat);
      backRail.position.set(centerX, by + 0.72, 84.72);
      staticGroup.add(backRail);

      const skyBridge = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.36, 6.3), pearlWhiteMat);
      skyBridge.position.set(centerX, by, 69.35);
      staticGroup.add(skyBridge);

      [122.0, centerX, 134.0].forEach((lx) => {
        addCeilingLightPanel(lx, by - 0.20, 69.35, 2.2, 0.68);
      });

      [66.25, 72.45].forEach((sz) => {
        const sbLed = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.12, 0.14), warmLedGlowMat);
        sbLed.position.set(centerX, by - 0.16, sz);
        staticGroup.add(sbLed);
      });

      const sbFrontRail = new THREE.Mesh(new THREE.PlaneGeometry(18.4, 1.15), atriumGlassMat);
      sbFrontRail.position.set(centerX, by + 0.72, 66.22);
      staticGroup.add(sbFrontRail);

      [
        { x: 119.5, w: 1.4 },
        { x: 128.0, w: 8.4 },
        { x: 136.5, w: 1.4 },
      ].forEach((seg) => {
        const sbBackRail = new THREE.Mesh(new THREE.PlaneGeometry(seg.w, 1.15), atriumGlassMat);
        sbBackRail.position.set(seg.x, by + 0.72, 72.48);
        staticGroup.add(sbBackRail);
      });
    }

  });

  // Expanded 4-Lane Symmetric Atrium Escalators & Grand Staircases (each 3.6m wide!)
  // Ground <-> Floor 2: Dual-Lane Escalator (X=126.0) + Grand Staircase (X=130.0)
  // Floor 2 <-> Floor 3: Grand Staircase (X=122.0) + Dual-Lane Escalator (X=134.0)
  [
    { x: 126.0, y1: 0.08, y2: 6.08, z1: 70.2, z2: 84.9, kind: 'escalator' as const },
    { x: 130.0, y1: 0.08, y2: 6.08, z1: 70.2, z2: 84.9, kind: 'stair' as const },
    { x: 122.0, y1: 6.08, y2: 12.08, z1: 84.9, z2: 72.3, kind: 'stair' as const },
    { x: 134.0, y1: 6.08, y2: 12.08, z1: 84.9, z2: 72.3, kind: 'escalator' as const },
  ].forEach((esc) => {
    const dy = esc.y2 - esc.y1;
    const dz = esc.z2 - esc.z1;
    const horiz = Math.abs(dz);
    const len = Math.hypot(dy, horiz);
    const tilt = Math.atan2(dy, horiz); // Strictly 0..PI/2 so local +Y always faces UP!
    const isStair = esc.kind === 'stair';

    const escGroup = new THREE.Group();
    escGroup.position.set(esc.x, (esc.y1 + esc.y2) / 2 - 0.16, (esc.z1 + esc.z2) / 2);
    escGroup.rotation.order = 'YXZ';
    escGroup.rotation.y = dz >= 0 ? 0 : Math.PI;
    escGroup.rotation.x = -tilt;

    // Wide structural under-truss + brushed steel / pearl architectural cladding
    const truss = new THREE.Mesh(
      new THREE.BoxGeometry(3.52, 0.56, len),
      isStair ? pearlWhiteMat : darkFrameMat
    );
    escGroup.add(truss);

    const underLed = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, len - 0.8), warmLedGlowMat);
    underLed.position.set(0, -0.30, 0);
    escGroup.add(underLed);

    [-1.78, 1.78].forEach((sx) => {
      const sideClad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, len), silverTrimMat);
      sideClad.position.set(sx, 0.02, 0);
      escGroup.add(sideClad);
    });

    // Stepped treads kept horizontally level relative to world ground!
    const stepCount = isStair ? 26 : 28;
    const treadMat = isStair ? pearlWhiteMat : graniteMat;
    const treadW = isStair ? 3.26 : 3.10;
    for (let i = 0; i < stepCount; i++) {
      const t = (i + 0.5) / stepCount - 0.5;
      const sz = t * (len - 0.7);
      const step = new THREE.Mesh(new THREE.BoxGeometry(treadW, 0.11, 0.50), treadMat);
      step.position.set(0, 0.30, sz);
      step.rotation.x = tilt;
      escGroup.add(step);

      if (isStair || i % 2 === 0) {
        const nosingLed = new THREE.Mesh(
          new THREE.BoxGeometry(treadW - 0.14, 0.022, 0.03),
          warmLedGlowMat
        );
        nosingLed.position.set(0, 0.355, sz - 0.22);
        nosingLed.rotation.x = tilt;
        escGroup.add(nosingLed);
      }
    }

    // Outer tempered glass balustrades & glowing handrails
    [-1.68, 1.68].forEach((sx) => {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, len), silverTrimMat);
      skirt.position.set(sx, 0.36, 0);
      escGroup.add(skirt);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.94, len - 0.1), atriumGlassMat);
      rail.position.set(sx, 0.83, 0);
      escGroup.add(rail);

      const topHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.10, len + 0.45),
        isStair ? warmLedGlowMat : aeonMagentaGlowMat
      );
      topHand.position.set(sx, 1.32, 0);
      escGroup.add(topHand);

      // Curved handrail newel caps at bottom & top landings
      [-len / 2 - 0.18, len / 2 + 0.18].forEach((nz) => {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12),
          isStair ? warmLedGlowMat : aeonMagentaGlowMat
        );
        cap.rotation.z = Math.PI / 2;
        cap.position.set(sx, 1.20, nz);
        escGroup.add(cap);
      });
    });

    staticGroup.add(escGroup);

    // Wide stainless-steel landing comb plates flush with bottom & top floors
    [
      { y: esc.y1 + 0.01, z: esc.z1 },
      { y: esc.y2 + 0.08, z: esc.z2 },
    ].forEach((land) => {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.08, 1.05), silverTrimMat);
      plate.position.set(esc.x, land.y, land.z);
      staticGroup.add(plate);
    });
  });

  // Sakura Blossom Tree Plaza
  const sakuraBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.55, 28), pearlWhiteMat);
  sakuraBase.position.set(centerX, 0.275, 63.0);
  staticGroup.add(sakuraBase);
  const sakuraGlow = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.1, 28), aeonMagentaGlowMat);
  sakuraGlow.position.set(centerX, 0.52, 63.0);
  staticGroup.add(sakuraGlow);
  const sakuraTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 3.6, 12), cedarWoodMat);
  sakuraTrunk.position.set(centerX, 2.2, 63.0);
  staticGroup.add(sakuraTrunk);
  [
    [0, 4.4, 0, 2.2],
    [-1.4, 3.8, 0.9, 1.5],
    [1.5, 3.9, -0.7, 1.6],
    [0.5, 3.7, 1.3, 1.4],
  ].forEach(([ox, oy, oz, rad]) => {
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), sakuraPinkMat);
    canopy.position.set(centerX + ox, oy, 63.0 + oz);
    staticGroup.add(canopy);
  });

  // =========================================================================
  // 5. EXPANDED WALK-IN UNIQLO MEGA FLAGSHIP (West Wing Ground: X=97.8..112.0, Z=48.0..66.5)
  // =========================================================================
  const buildUniqloFlagshipBoutique = () => {
    const uWoodTex = createUniqloWoodFloorTex();
    uWoodTex.repeat.set(6, 7);
    const uWoodMat = new THREE.MeshStandardMaterial({ map: uWoodTex, roughness: 0.55 });
    const uOakMat = new THREE.MeshStandardMaterial({ color: 0xd6b084, roughness: 0.52 });
    const uWhiteWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const uWhiteFixtureMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 });
    const uRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const uChromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.85 });
    const uMirrorMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.08, metalness: 0.92 });
    const uMannequinMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });

    // Light Japanese Ash Wood Boutique Floor (14.2m × 18.5m) + Matte Gallery Walls + Ceiling
    const uFloor = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.02, 18.48), uWoodMat);
    uFloor.position.set(104.9, 0.065, 57.25);
    staticGroup.add(uFloor);

    const uBackWall = new THREE.Mesh(new THREE.PlaneGeometry(18.48, 5.2), uWhiteWallMat);
    uBackWall.rotation.y = Math.PI / 2;
    uBackWall.position.set(97.82, 2.66, 57.25);
    staticGroup.add(uBackWall);

    [48.02, 66.48].forEach((wz, idx) => {
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 5.2), uWhiteWallMat);
      sideWall.rotation.y = idx === 0 ? 0 : Math.PI;
      sideWall.position.set(104.9, 2.66, wz);
      staticGroup.add(sideWall);
    });

    const uCeiling = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 18.48), uWhiteWallMat);
    uCeiling.rotation.x = Math.PI / 2;
    uCeiling.position.set(104.9, 5.25, 57.25);
    staticGroup.add(uCeiling);

    // Bright Recessed Boutique LED Ceiling Strips & Wood Louvers
    [50.6, 55.0, 59.5, 63.9].forEach((lz) => {
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.06, 0.34), brightLedPanelMat);
      ledStrip.position.set(105.0, 5.22, lz);
      staticGroup.add(ledStrip);
    });
    [49.4, 52.8, 56.2, 58.3, 61.7, 65.1].forEach((sz) => {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.10, 0.14), uOakMat);
      louver.position.set(105.0, 5.18, sz);
      staticGroup.add(louver);
    });

    // Open Storefront Portal at X = 112.0 (Z = 48.0..66.5, wide open doorway Z = 52.8..61.7)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.15, 18.5), uWhiteFixtureMat);
    portalHeader.position.set(112.0, 4.32, 57.25);
    staticGroup.add(portalHeader);

    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 18.5), darkFrameMat);
    portalTrim.position.set(112.0, 3.25, 57.25);
    staticGroup.add(portalTrim);

    // Signature UNIQLO Fascia Banner + Twin Iconic Red Square Logos
    const uSignTex = createMallBrandPanelTex('UNIQLO  •  LIFEWEAR', 'THỜI TRANG NHẬT BẢN  •  MEGA FLAGSHIP', '#ffffff', '#0f172a', '#dc2626');
    const uSignMat = new THREE.MeshStandardMaterial({
      map: uSignTex,
      emissive: 0xffffff,
      emissiveMap: uSignTex,
      emissiveIntensity: 0.72,
    });
    neonMats.push(uSignMat);
    const uFasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.55), uSignMat);
    uFasciaSign.rotation.y = Math.PI / 2;
    uFasciaSign.position.set(112.23, 4.32, 57.25);
    staticGroup.add(uFasciaSign);

    const cubeEnTex = createUniqloLogoCubeTex(false);
    const cubeJpTex = createUniqloLogoCubeTex(true);
    [
      { z: 50.2, tex: cubeEnTex },
      { z: 64.3, tex: cubeJpTex },
    ].forEach((cube) => {
      const cMat = new THREE.MeshStandardMaterial({
        map: cube.tex,
        emissive: 0xffffff,
        emissiveMap: cube.tex,
        emissiveIntensity: 0.55,
      });
      neonMats.push(cMat);
      const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), cMat);
      logoPlane.rotation.y = Math.PI / 2;
      logoPlane.position.set(112.23, 4.32, cube.z);
      staticGroup.add(logoPlane);
    });

    // Helper: Build Dressed Mannequin on Plinth
    const addMannequin = (mx: number, my: number, mz: number, rotY: number, topHex: number, bottomHex: number, scarfHex?: number) => {
      const mGroup = new THREE.Group();
      mGroup.position.set(mx, my, mz);
      mGroup.rotation.y = rotY;
      const topMat = new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.55 });
      const botMat = new THREE.MeshStandardMaterial({ color: bottomHex, roughness: 0.65 });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.05, 14), uChromeMat);
      base.position.y = 0.025;
      mGroup.add(base);

      [-0.09, 0.09].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.78, 0.14), botMat);
        leg.position.set(lx, 0.44, 0);
        mGroup.add(leg);
      });
      const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), topMat);
      jacket.position.y = 1.08;
      mGroup.add(jacket);
      [-0.26, 0.26].forEach((ax) => {
        const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.44, 0.12), topMat);
        sleeve.position.set(ax, 1.07, 0);
        sleeve.rotation.z = ax < 0 ? 0.08 : -0.08;
        mGroup.add(sleeve);
      });
      if (scarfHex !== undefined) {
        const scarf = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.12, 0.26),
          new THREE.MeshStandardMaterial({ color: scarfHex, roughness: 0.5 })
        );
        scarf.position.y = 1.34;
        mGroup.add(scarf);
      }
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.23, 0.20), uMannequinMat);
      head.position.y = 1.50;
      mGroup.add(head);
      staticGroup.add(mGroup);
    };

    // Flanking Panoramic Glass Display Windows (Z=48.0..52.8 & Z=61.7..66.5) with 6 Dressed Mannequins
    [
      { z: 50.4, colors: [0xdc2626, 0x1e3a8a, 0xf8fafc] },
      { z: 64.1, colors: [0x3f6212, 0xeab308, 0x0f172a] },
    ].forEach((win) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 4.75), uWhiteFixtureMat);
      curb.position.set(111.75, 0.24, win.z);
      staticGroup.add(curb);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.85), atriumGlassMat);
      glassPane.rotation.y = Math.PI / 2;
      glassPane.position.set(112.15, 1.82, win.z);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.25, 0.16), darkFrameMat);
      postInner.position.set(112.0, 1.65, win.z < 57 ? 52.76 : 61.74);
      staticGroup.add(postInner);

      addMannequin(111.7, 0.41, win.z - 1.35, Math.PI / 2, win.colors[0], 0x1e293b, 0xf8fafc);
      addMannequin(111.7, 0.41, win.z, Math.PI / 2, win.colors[1], 0xd6c7b2);
      addMannequin(111.7, 0.41, win.z + 1.35, Math.PI / 2, win.colors[2], 0x334155, 0xdc2626);
    });

    // Grand 8-Column Signature UNIQLO Color-Grid Apparel Wall (X = 98.16, Z = 53.6..65.4)
    const shelfUnit = new THREE.Mesh(new THREE.BoxGeometry(0.68, 3.4, 11.8), uWhiteFixtureMat);
    shelfUnit.position.set(98.16, 1.77, 59.5);
    staticGroup.add(shelfUnit);

    const foldedPalette = [
      0xdc2626, 0x1d4ed8, 0xf8fafc, 0x15803d, 0xf59e0b, 0x334155,
      0xec4899, 0x0ea5e9, 0xd6c7b2, 0x7c3aed, 0x0f172a, 0xea580c,
    ];
    const garmentMats = foldedPalette.map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.65 }));

    for (let col = 0; col < 8; col++) {
      const cz = 54.32 + col * 1.48;
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.72, 3.38, 0.07), uOakMat);
      divider.position.set(98.18, 1.77, cz - 0.72);
      staticGroup.add(divider);

      for (let row = 0; row < 5; row++) {
        const sy = 0.52 + row * 0.60;
        const shelfPlank = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 1.42), uWhiteFixtureMat);
        shelfPlank.position.set(98.18, sy - 0.04, cz);
        staticGroup.add(shelfPlank);

        [-0.34, 0.34].forEach((subZ, sIdx) => {
          const stackMat = garmentMats[(col * 5 + row * 2 + sIdx) % garmentMats.length];
          for (let layer = 0; layer < 3; layer++) {
            const foldedItem = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.48), stackMat);
            foldedItem.position.set(98.40, sy + 0.04 + layer * 0.10, cz + subZ);
            staticGroup.add(foldedItem);
          }
        });
      }
    }

    // 3 Illuminated Category Headers above Back Apparel Wall
    [
      { z: 55.2, title: 'AIRism & UT TEES', sub: 'ÁO THUN MÁT MẺ • GRAPHIC', accent: '#0284c7' },
      { z: 59.5, title: 'ULTRA LIGHT DOWN', sub: 'ÁO PHAO SIÊU NHẸ • CASHMERE', accent: '#dc2626' },
      { z: 63.8, title: 'LINEN & STRETCH JEANS', sub: 'SƠ MI LINEN • QUẦN JEAN NHẬT', accent: '#15803d' },
    ].forEach((cat) => {
      const cTex = createUniqloCategoryHeaderTex(cat.title, cat.sub, cat.accent);
      const cMat = new THREE.MeshStandardMaterial({
        map: cTex,
        emissive: 0xffffff,
        emissiveMap: cTex,
        emissiveIntensity: 0.45,
      });
      neonMats.push(cMat);
      const catBanner = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.75), cMat);
      catBanner.rotation.y = Math.PI / 2;
      catBanner.position.set(98.54, 3.92, cat.z);
      staticGroup.add(catBanner);
    });

    // 3 Spacious Fitting Rooms ("PHÒNG THỬ ĐỒ") in North-West Corner (X = 97.9..100.3, Z = 48.2..52.8)
    const frFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.75, 0.12), uOakMat);
    frFrame.position.set(99.05, 1.44, 52.85);
    staticGroup.add(frFrame);
    [49.6, 51.2].forEach((mz) => {
      const frMid = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.75, 0.10), uOakMat);
      frMid.position.set(99.05, 1.44, mz);
      staticGroup.add(frMid);
    });
    const frCurtainMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.8 });
    [48.9, 50.4, 52.0].forEach((fz) => {
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.15), frCurtainMat);
      curtain.position.set(100.18, 1.26, fz);
      staticGroup.add(curtain);
    });
    const frTex = createUniqloCategoryHeaderTex('FITTING ROOMS (3)', 'PHÒNG THỬ ĐỒ • MỜI VÀO', '#0f172a');
    const frSignMat = new THREE.MeshStandardMaterial({ map: frTex, emissive: 0xffffff, emissiveMap: frTex, emissiveIntensity: 0.4 });
    neonMats.push(frSignMat);
    const frSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.50), frSignMat);
    frSign.rotation.y = Math.PI / 2;
    frSign.position.set(100.25, 3.12, 50.45);
    staticGroup.add(frSign);

    // Extended Side Hanging Garment Racks + Dual Mirrors (North Z = 48.55 & South Z = 65.95)
    [
      { z: 48.55, startX: 101.6, endX: 110.4, mirrorXs: [102.2, 108.8] },
      { z: 65.95, startX: 103.6, endX: 110.4, mirrorXs: [104.4, 109.2] },
    ].forEach((side, sIdx) => {
      const railLen = side.endX - side.startX;
      const midX = (side.startX + side.endX) / 2;
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, railLen, 8), uChromeMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(midX, 1.85, side.z);
      staticGroup.add(rail);

      [-railLen / 2 + 0.15, 0.0, railLen / 2 - 0.15].forEach((bx) => {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), uChromeMat);
        bracket.position.set(midX + bx, 1.85, side.z + (sIdx === 0 ? -0.25 : 0.25));
        staticGroup.add(bracket);
      });

      side.mirrorXs.forEach((mx) => {
        const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.35, 0.06), darkFrameMat);
        mirrorFrame.position.set(mx, 1.32, side.z + (sIdx === 0 ? -0.45 : 0.45));
        staticGroup.add(mirrorFrame);
        const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.22), uMirrorMat);
        mirrorGlass.rotation.y = sIdx === 0 ? 0 : Math.PI;
        mirrorGlass.position.set(mx, 1.32, side.z + (sIdx === 0 ? -0.41 : 0.41));
        staticGroup.add(mirrorGlass);
      });

      for (let gx = side.startX + 0.25; gx <= side.endX - 0.25; gx += 0.39) {
        const gMat = garmentMats[(Math.round(gx * 3) + sIdx * 5) % garmentMats.length];
        const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.26), uChromeMat);
        hanger.position.set(gx, 1.80, side.z);
        staticGroup.add(hanger);

        const garment = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.72, 0.42), gMat);
        garment.position.set(gx, 1.40, side.z);
        staticGroup.add(garment);
      }
    });

    // 4 Center Island Folded-Apparel Display Tables (2x2 Grid: X = 104.0 & 108.4, Z = 54.0 & 60.5)
    [
      { x: 108.4, z: 54.0, hasMannequin: true, mTop: 0xf8fafc, mBot: 0x334155, scarf: 0xdc2626 },
      { x: 108.4, z: 60.5, hasMannequin: true, mTop: 0x1e3a8a, mBot: 0xd6c7b2 },
      { x: 104.0, z: 54.0, hasMannequin: false, mTop: 0, mBot: 0 },
      { x: 104.0, z: 60.5, hasMannequin: false, mTop: 0, mBot: 0 },
    ].forEach((tbl, tIdx) => {
      const tableBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.82, 1.25), uOakMat);
      tableBase.position.set(tbl.x, 0.48, tbl.z);
      staticGroup.add(tableBase);

      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.08, 1.38), uWhiteFixtureMat);
      tableTop.position.set(tbl.x, 0.92, tbl.z);
      staticGroup.add(tableTop);

      const riser = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.65), uOakMat);
      riser.position.set(tbl.x, 1.08, tbl.z);
      staticGroup.add(riser);

      for (let px = -0.9; px <= 0.91; px += 0.6) {
        for (let pz = -0.36; pz <= 0.37; pz += 0.72) {
          const isCenter = Math.abs(px) < 0.35;
          const baseY = isCenter ? 1.20 : 0.96;
          const stackMat = garmentMats[(Math.round((px + 1) * 3) + (pz > 0 ? 2 : 0) + tIdx * 3) % garmentMats.length];
          for (let l = 0; l < 3; l++) {
            const fold = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.075, 0.46), stackMat);
            fold.position.set(tbl.x + px, baseY + 0.04 + l * 0.08, tbl.z + pz);
            staticGroup.add(fold);
          }
        }
      }

      const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.32), uRedMat);
      signPost.position.set(tbl.x + 1.05, 1.15, tbl.z);
      staticGroup.add(signPost);

      if (tbl.hasMannequin) {
        addMannequin(tbl.x + 1.85, 0.075, tbl.z, Math.PI / 2, tbl.mTop, tbl.mBot, tbl.scarf);
      }
    });

    // UNIQLO Flagship 3-POS Checkout Counter ("QUẦY THANH TOÁN") in South-West Corner (X = 100.6, Z = 63.4)
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.02, 3.8), uWhiteFixtureMat);
    counterBody.position.set(100.6, 0.58, 63.4);
    staticGroup.add(counterBody);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.07, 3.92), uOakMat);
    counterTop.position.set(100.6, 1.12, 63.4);
    staticGroup.add(counterTop);

    [62.1, 63.4, 64.7].forEach((py) => {
      const posMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.42), darkFrameMat);
      posMonitor.position.set(100.7, 1.35, py);
      staticGroup.add(posMonitor);
      const posScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), atriumGlassMat);
      posScreen.rotation.y = -Math.PI / 2;
      posScreen.position.set(100.65, 1.35, py);
      staticGroup.add(posScreen);
    });

    [62.7, 64.0].forEach((bz) => {
      const readyBag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.28), uWhiteFixtureMat);
      readyBag.position.set(100.82, 1.32, bz);
      staticGroup.add(readyBag);
      const bagLogo = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.10, 0.10), uRedMat);
      bagLogo.position.set(100.82, 1.35, bz);
      staticGroup.add(bagLogo);
    });

    const coTex = createUniqloCategoryHeaderTex('CHECKOUT • 3 CASHIERS', 'QUẦY THANH TOÁN UNIQLO', '#dc2626');
    const coMat = new THREE.MeshStandardMaterial({ map: coTex, emissive: 0xffffff, emissiveMap: coTex, emissiveIntensity: 0.45 });
    neonMats.push(coMat);
    const coSign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.65), coMat);
    coSign.rotation.y = Math.PI;
    coSign.position.set(101.2, 2.85, 66.42);
    staticGroup.add(coSign);
  };
  buildUniqloFlagshipBoutique();

  // =========================================================================
  // 6. EXPANDED 34m STARBUCKS RESERVE ROASTERY (Front: X=97.8..112.0, Z=67.8..89.2 + Deep West Hall: X=78.0..97.8, Z=73.6..89.2)
  // =========================================================================
  const buildAeonStarbucksReserve = () => {
    const sbFloorTexFront = createReserveWalnutFloorTex();
    sbFloorTexFront.repeat.set(5, 8);
    const sbFloorMatFront = new THREE.MeshStandardMaterial({ map: sbFloorTexFront, roughness: 0.52 });
    const sbFloorTexDeep = createReserveWalnutFloorTex();
    sbFloorTexDeep.repeat.set(7, 6);
    const sbFloorMatDeep = new THREE.MeshStandardMaterial({ map: sbFloorTexDeep, roughness: 0.52 });
    const sbSlateFloorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 });
    const sbGreenMat = new THREE.MeshStandardMaterial({ color: 0x00704a, roughness: 0.42, metalness: 0.12 });
    const sbDarkEspressoMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.52, metalness: 0.35 });
    const sbWalnutMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.56 });
    const sbOakMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.52 });
    const sbCreamWallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.68 });
    const sbBrickWallMat = new THREE.MeshStandardMaterial({ color: 0x452214, roughness: 0.85 });
    const sbMarbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.08 });
    const sbSteelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.88, roughness: 0.22 });
    const sbCopperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.84, roughness: 0.24 });
    const sbCupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32 });
    const sbLaptopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.22 });

    // Walnut Floors across Front Wing (14.2m × 21.4m) + Deep West Roastery Hall (19.8m × 15.6m)
    const sbFloorFront = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.02, 21.38), sbFloorMatFront);
    sbFloorFront.position.set(104.9, 0.065, 78.5);
    staticGroup.add(sbFloorFront);

    const sbFloorDeep = new THREE.Mesh(new THREE.BoxGeometry(19.82, 0.02, 15.58), sbFloorMatDeep);
    sbFloorDeep.position.set(87.9, 0.065, 81.4);
    staticGroup.add(sbFloorDeep);

    // Slate Promenade Strip guiding from Atrium into North/South aisles & deep into Roastery
    const sbWalkFront = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.015, 5.2), sbSlateFloorMat);
    sbWalkFront.position.set(108.3, 0.078, 78.5);
    staticGroup.add(sbWalkFront);
    const sbWalkDeep = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.015, 3.0), sbSlateFloorMat);
    sbWalkDeep.position.set(92.5, 0.078, 84.2);
    staticGroup.add(sbWalkDeep);

    // Architectural Walls & Warm Slatted Ceilings
    const sbFrontNWWall = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.2), sbBrickWallMat);
    sbFrontNWWall.rotation.y = Math.PI / 2;
    sbFrontNWWall.position.set(97.82, 2.66, 70.7);
    staticGroup.add(sbFrontNWWall);

    const sbDeepNorthWall = new THREE.Mesh(new THREE.PlaneGeometry(19.8, 5.2), sbBrickWallMat);
    sbDeepNorthWall.position.set(87.9, 2.66, 73.62);
    staticGroup.add(sbDeepNorthWall);

    const sbDeepBackWall = new THREE.Mesh(new THREE.PlaneGeometry(15.58, 5.2), sbBrickWallMat);
    sbDeepBackWall.rotation.y = Math.PI / 2;
    sbDeepBackWall.position.set(78.02, 2.66, 81.4);
    staticGroup.add(sbDeepBackWall);

    const sbFrontNorthWall = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 5.2), sbCreamWallMat);
    sbFrontNorthWall.position.set(104.9, 2.66, 67.82);
    staticGroup.add(sbFrontNorthWall);

    const sbContinuousSouthWall = new THREE.Mesh(new THREE.PlaneGeometry(34.0, 5.2), sbCreamWallMat);
    sbContinuousSouthWall.rotation.y = Math.PI;
    sbContinuousSouthWall.position.set(95.0, 2.66, 89.18);
    staticGroup.add(sbContinuousSouthWall);

    [
      { x: 104.9, z: 67.86, w: 14.0 },
      { x: 95.0, z: 89.14, w: 33.8 },
    ].forEach((ws) => {
      const wainscot = new THREE.Mesh(new THREE.BoxGeometry(ws.w, 1.15, 0.08), sbWalnutMat);
      wainscot.position.set(ws.x, 0.65, ws.z);
      staticGroup.add(wainscot);
    });

    const sbCeilingFront = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 21.38), sbDarkEspressoMat);
    sbCeilingFront.rotation.x = Math.PI / 2;
    sbCeilingFront.position.set(104.9, 5.25, 78.5);
    staticGroup.add(sbCeilingFront);

    const sbCeilingDeep = new THREE.Mesh(new THREE.PlaneGeometry(19.82, 15.58), sbDarkEspressoMat);
    sbCeilingDeep.rotation.x = Math.PI / 2;
    sbCeilingDeep.position.set(87.9, 5.25, 81.4);
    staticGroup.add(sbCeilingDeep);

    [70.8, 75.5, 78.5, 81.5, 86.2].forEach((lz) => {
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.05, 0.28), warmLedGlowMat);
      ledStrip.position.set(105.0, 5.22, lz);
      staticGroup.add(ledStrip);
    });
    [76.2, 81.4, 86.6].forEach((lz) => {
      const deepStrip = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.05, 0.28), warmLedGlowMat);
      deepStrip.position.set(88.0, 5.22, lz);
      staticGroup.add(deepStrip);
    });
    [69.6, 73.2, 76.8, 80.4, 84.0, 87.6].forEach((bz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.14, 0.18), sbWalnutMat);
      beam.position.set(105.0, 5.16, bz);
      staticGroup.add(beam);
    });

    // Grand Walk-In Storefront Portal at X = 112.0 (Z = 67.8..89.2, Open Entryway Z = 73.8..83.2)
    const sbPortalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.15, 21.4), sbDarkEspressoMat);
    sbPortalHeader.position.set(112.0, 4.32, 78.5);
    staticGroup.add(sbPortalHeader);

    const sbPortalBrassTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 21.4), sbCopperMat);
    sbPortalBrassTrim.position.set(112.0, 3.25, 78.5);
    staticGroup.add(sbPortalBrassTrim);

    const sbFasciaTex = createStarbucksReserveFasciaTex();
    const sbFasciaMat = new THREE.MeshStandardMaterial({
      map: sbFasciaTex,
      emissive: 0xffffff,
      emissiveMap: sbFasciaTex,
      emissiveIntensity: 0.72,
    });
    neonMats.push(sbFasciaMat);
    const sbFasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 1.55), sbFasciaMat);
    sbFasciaSign.rotation.y = Math.PI / 2;
    sbFasciaSign.position.set(112.23, 4.32, 78.5);
    staticGroup.add(sbFasciaSign);

    const sbEmblemTex = createStarbucksEmblemTexture(512);
    const sbEmblemMat = new THREE.MeshStandardMaterial({
      map: sbEmblemTex,
      emissive: 0xffffff,
      emissiveMap: sbEmblemTex,
      emissiveIntensity: 0.65,
      transparent: true,
      roughness: 0.22,
    });
    neonMats.push(sbEmblemMat);

    [70.2, 86.8].forEach((ez) => {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.10, 24), sbDarkEspressoMat);
      housing.rotation.z = Math.PI / 2;
      housing.position.set(112.20, 4.32, ez);
      staticGroup.add(housing);

      const disk = new THREE.Mesh(new THREE.CircleGeometry(0.80, 24), sbEmblemMat);
      disk.rotation.y = Math.PI / 2;
      disk.position.set(112.26, 4.32, ez);
      staticGroup.add(disk);
    });

    // Flanking 5.95m Panoramic Display Windows (Z = 67.8..73.8 & Z = 83.2..89.2) with Oak Counters & Barstools
    [
      { z: 70.8, stoolZ: [69.0, 70.2, 71.4, 72.6] },
      { z: 86.2, stoolZ: [84.4, 85.6, 86.8, 88.0] },
    ].forEach((win) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 5.95), sbDarkEspressoMat);
      curb.position.set(111.98, 0.19, win.z);
      staticGroup.add(curb);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 2.95), atriumGlassMat);
      glassPane.rotation.y = Math.PI / 2;
      glassPane.position.set(112.14, 1.78, win.z);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.25, 0.16), sbDarkEspressoMat);
      postInner.position.set(112.0, 1.65, win.z < 78 ? 73.76 : 83.24);
      staticGroup.add(postInner);

      const winCounter = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 5.4), sbOakMat);
      winCounter.position.set(111.42, 1.04, win.z);
      staticGroup.add(winCounter);
      [-2.3, 0, 2.3].forEach((dz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.96, 0.07), sbDarkEspressoMat);
        leg.position.set(111.42, 0.55, win.z + dz);
        staticGroup.add(leg);
      });

      [-1.0, 1.0].forEach((czOff) => {
        const wCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.15, 10), sbCupMat);
        wCup.position.set(111.42, 1.15, win.z + czOff);
        staticGroup.add(wCup);
        const wSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.047, 0.06, 10), sbGreenMat);
        wSleeve.position.set(111.42, 1.14, win.z + czOff);
        staticGroup.add(wSleeve);
      });

      win.stoolZ.forEach((sz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8), sbDarkEspressoMat);
        post.position.set(110.75, 0.41, sz);
        staticGroup.add(post);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.04, 10), sbDarkEspressoMat);
        base.position.set(110.75, 0.09, sz);
        staticGroup.add(base);
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.06, 12), sbOakMat);
        seat.position.set(110.75, 0.76, sz);
        staticGroup.add(seat);
      });
    });

    // Grand Central Espresso & Bakery Island (X = 101.2..103.8, Z = 75.0..82.8 — wide aisles on BOTH North & South!)
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.04, 7.6), sbWalnutMat);
    counterBody.position.set(103.8, 0.59, 78.9);
    staticGroup.add(counterBody);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.08, 7.8), sbMarbleMat);
    counterTop.position.set(103.8, 1.14, 78.9);
    staticGroup.add(counterTop);

    const counterMedallion = new THREE.Mesh(new THREE.CircleGeometry(0.38, 22), sbEmblemMat);
    counterMedallion.rotation.y = Math.PI / 2;
    counterMedallion.position.set(104.3, 0.62, 78.9);
    staticGroup.add(counterMedallion);

    [75.9, 76.7].forEach((pz) => {
      const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.30, 0.42), sbDarkEspressoMat);
      posScreen.position.set(103.85, 1.36, pz);
      staticGroup.add(posScreen);
    });

    [77.6, 78.9].forEach((ez) => {
      const espBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 1.02), sbSteelMat);
      espBody.position.set(103.78, 1.46, ez);
      staticGroup.add(espBody);
      const espTrim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 1.06), sbDarkEspressoMat);
      espTrim.position.set(103.78, 1.76, ez);
      staticGroup.add(espTrim);
    });

    [79.9, 80.15, 80.4].forEach((cz) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.16, 10), sbCupMat);
      cup.position.set(104.02, 1.26, cz);
      staticGroup.add(cup);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.052, 0.06, 10), sbGreenMat);
      sleeve.position.set(104.02, 1.25, cz);
      staticGroup.add(sleeve);
    });

    const pastryBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 1.85), sbDarkEspressoMat);
    pastryBase.position.set(103.82, 1.30, 81.65);
    staticGroup.add(pastryBase);
    const pastryGlass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.58, 1.80), atriumGlassMat);
    pastryGlass.position.set(103.82, 1.70, 81.65);
    staticGroup.add(pastryGlass);
    [0xfbbf24, 0xd97706, 0xf43f5e, 0x84cc16, 0xa855f7].forEach((pCol, pIdx) => {
      const pastry = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.10, 10),
        new THREE.MeshStandardMaterial({ color: pCol, roughness: 0.6 })
      );
      pastry.position.set(103.85, 1.48, 81.0 + pIdx * 0.32);
      staticGroup.add(pastry);
    });

    // Back Espresso Prep Bar (X = 101.3, Z = 78.9) + Suspended Overhead Illuminated Reserve Menu Board
    const backBarBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.96, 7.2), sbDarkEspressoMat);
    backBarBase.position.set(101.3, 0.55, 78.9);
    staticGroup.add(backBarBase);
    const backBarTop = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 7.3), sbWalnutMat);
    backBarTop.position.set(101.3, 1.06, 78.9);
    staticGroup.add(backBarTop);

    const sbMenuTex = createStarbucksMenuBoardTexture();
    const sbMenuMat = new THREE.MeshStandardMaterial({
      map: sbMenuTex,
      emissive: 0xffffff,
      emissiveMap: sbMenuTex,
      emissiveIntensity: 0.58,
      roughness: 0.24,
    });
    neonMats.push(sbMenuMat);
    const menuHousing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.85, 6.6), sbDarkEspressoMat);
    menuHousing.position.set(101.3, 3.45, 78.9);
    staticGroup.add(menuHousing);
    const sbMenuBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.72), sbMenuMat);
    sbMenuBoard.rotation.y = Math.PI / 2;
    sbMenuBoard.position.set(101.38, 3.45, 78.9);
    staticGroup.add(sbMenuBoard);
    [76.0, 81.8].forEach((rz) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), sbDarkEspressoMat);
      rod.position.set(101.3, 4.75, rz);
      staticGroup.add(rod);
    });

    // Front-Wing North Lounge: Emerald Sofa Booth, 3 Marble Bistro Tables, Merch Rack & Corner Roaster Silo
    const merchFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.42), sbWalnutMat);
    merchFrame.position.set(108.8, 1.27, 68.12);
    staticGroup.add(merchFrame);
    [0.85, 1.45, 2.05].forEach((sy, sIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 0.46), sbMarbleMat);
      shelf.position.set(108.8, sy, 68.16);
      staticGroup.add(shelf);
      for (let mx = 107.9; mx <= 109.7; mx += 0.45) {
        const tumbler = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.055, 0.22, 10),
          (sIdx + Math.round(mx)) % 2 === 0 ? sbGreenMat : sbCopperMat
        );
        tumbler.position.set(mx, sy + 0.13, 68.22);
        staticGroup.add(tumbler);
      }
    });

    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.44, 0.84), sbGreenMat);
    sofaSeat.position.set(103.6, 0.29, 68.45);
    staticGroup.add(sofaSeat);
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.85, 0.22), sbGreenMat);
    sofaBack.position.set(103.6, 0.70, 68.08);
    staticGroup.add(sofaBack);

    [101.8, 103.6, 105.4].forEach((tx) => {
      const bTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), sbMarbleMat);
      bTop.position.set(tx, 0.78, 69.5);
      staticGroup.add(bTop);
      const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.70, 10), sbDarkEspressoMat);
      bPost.position.set(tx, 0.42, 69.5);
      staticGroup.add(bPost);
      const bCup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.14, 10), sbCupMat);
      bCup.position.set(tx + 0.10, 0.87, 69.5);
      staticGroup.add(bCup);
    });

    // Front-Wing South Cozy Lounge Tables (X = 104.2 & 107.4, Z = 87.2)
    [104.2, 107.4].forEach((tx) => {
      const sTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), sbOakMat);
      sTop.position.set(tx, 0.78, 87.2);
      staticGroup.add(sTop);
      const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.70, 10), sbDarkEspressoMat);
      sPost.position.set(tx, 0.42, 87.2);
      staticGroup.add(sPost);
      [-0.78, 0.78].forEach((dx) => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.46), sbGreenMat);
        chair.position.set(tx + dx, 0.29, 87.2);
        staticGroup.add(chair);
      });
    });

    // =========================================================================
    // DEEP WEST ROASTERY & LIBRARY HALL (X = 78.0..97.8, Z = 73.6..89.2)
    // =========================================================================
    // 1) Monumental Copper Reserve Roaster Drum, Cooling Tray & Overhead Brass Pipes (X = 94.0, Z = 77.2)
    const roasterBase = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.48, 0.82, 22), sbDarkEspressoMat);
    roasterBase.position.set(94.0, 0.48, 77.2);
    staticGroup.add(roasterBase);
    const roasterDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.15, 2.2, 22), sbCopperMat);
    roasterDrum.position.set(94.0, 1.98, 77.2);
    staticGroup.add(roasterDrum);
    const roasterRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.07, 10, 24), sbDarkEspressoMat);
    roasterRing.rotation.x = Math.PI / 2;
    roasterRing.position.set(94.0, 2.95, 77.2);
    staticGroup.add(roasterRing);
    const roasterPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.3, 14), sbCopperMat);
    roasterPipe.position.set(94.0, 4.15, 77.2);
    staticGroup.add(roasterPipe);
    const coolTray = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, 0.45, 18), sbSteelMat);
    coolTray.position.set(95.9, 0.78, 77.2);
    staticGroup.add(coolTray);

    // 2) Reserve Pour-Over & Siphon Tasting Bar (X = 92.8, Z = 85.4) with 3 Brass Barstools
    const pourBody = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.02, 1.05), sbWalnutMat);
    pourBody.position.set(92.8, 0.58, 85.4);
    staticGroup.add(pourBody);
    const pourTop = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.07, 1.18), sbMarbleMat);
    pourTop.position.set(92.8, 1.12, 85.4);
    staticGroup.add(pourTop);
    [91.3, 92.8, 94.3].forEach((px) => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.16), sbCopperMat);
      stand.position.set(px, 1.34, 85.4);
      staticGroup.add(stand);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8), sbDarkEspressoMat);
      post.position.set(px, 0.41, 84.35);
      staticGroup.add(post);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 12), sbOakMat);
      seat.position.set(px, 0.76, 84.35);
      staticGroup.add(seat);
    });

    // 3) Grand Communal Walnut Library Table (X = 85.2, Z = 81.4, 6.4m × 1.5m) with Laptops, Lamps & 6 Chairs
    const commTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 1.5), sbOakMat);
    commTop.position.set(85.2, 0.82, 81.4);
    staticGroup.add(commTop);
    [82.5, 85.2, 87.9].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.74, 1.25), sbDarkEspressoMat);
      leg.position.set(lx, 0.44, 81.4);
      staticGroup.add(leg);
    });
    [83.4, 86.8].forEach((lx) => {
      const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), sbCopperMat);
      lampPost.position.set(lx, 1.08, 81.4);
      staticGroup.add(lampPost);
      const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 12), sbCopperMat);
      lampShade.position.set(lx, 1.32, 81.4);
      staticGroup.add(lampShade);
    });
    [83.8, 86.2].forEach((lapX) => {
      const lap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.25), sbLaptopMat);
      lap.position.set(lapX, 0.87, 81.05);
      staticGroup.add(lap);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.02), sbDarkEspressoMat);
      scr.position.set(lapX, 0.99, 81.17);
      scr.rotation.x = -0.18;
      staticGroup.add(scr);
    });
    [83.4, 85.2, 87.0].forEach((cx) => {
      [80.25, 82.55].forEach((cz, rowIdx) => {
        const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), sbWalnutMat);
        cSeat.position.set(cx, 0.49, cz);
        staticGroup.add(cSeat);
        const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.05), sbDarkEspressoMat);
        cBack.position.set(cx, 0.71, cz + (rowIdx === 0 ? -0.20 : 0.20));
        staticGroup.add(cBack);
        const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.36), sbDarkEspressoMat);
        cLeg.position.set(cx, 0.28, cz);
        staticGroup.add(cLeg);
      });
    });

    // 4) Rear Velvet Study Booths & Illuminated Reserve Bookshelf Wall (X = 78.2..80.4, Z = 74.5..88.3)
    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.6, 13.6), sbWalnutMat);
    shelfBack.position.set(78.32, 1.87, 81.4);
    staticGroup.add(shelfBack);
    [0.9, 1.65, 2.4, 3.15].forEach((sy) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 13.4), sbOakMat);
      plank.position.set(78.38, sy, 81.4);
      staticGroup.add(plank);
    });

    const artTex = createReserveRoasteryArtTex();
    const artMat = new THREE.MeshStandardMaterial({
      map: artTex,
      emissive: 0xffffff,
      emissiveMap: artTex,
      emissiveIntensity: 0.42,
    });
    neonMats.push(artMat);
    const wallArtNorth = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), artMat);
    wallArtNorth.position.set(88.0, 2.95, 73.68);
    staticGroup.add(wallArtNorth);
    const wallArtBack = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), artMat);
    wallArtBack.rotation.y = Math.PI / 2;
    wallArtBack.position.set(78.6, 2.85, 81.4);
    staticGroup.add(wallArtBack);

    [76.4, 86.4].forEach((bz) => {
      const boothBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.15, 2.8), sbGreenMat);
      boothBack.position.set(78.88, 0.65, bz);
      staticGroup.add(boothBack);
      const boothSeat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.44, 2.8), sbGreenMat);
      boothSeat.position.set(79.22, 0.29, bz);
      staticGroup.add(boothSeat);
      const boothTbl = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 1.45), sbMarbleMat);
      boothTbl.position.set(80.12, 0.78, bz);
      staticGroup.add(boothTbl);
      const boothPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.70, 10), sbDarkEspressoMat);
      boothPost.position.set(80.12, 0.42, bz);
      staticGroup.add(boothPost);
    });

    // Hanging Brass Pendant Lamps Over Front Bar & Deep Roastery Hall
    [
      { x: 103.8, zs: [75.8, 78.9, 82.0] },
      { x: 94.0, zs: [77.2, 85.4] },
      { x: 85.2, zs: [79.8, 83.0] },
    ].forEach((row) => {
      row.zs.forEach((pz) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), sbDarkEspressoMat);
        cord.position.set(row.x, 4.48, pz);
        staticGroup.add(cord);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.20, 14), sbCopperMat);
        shade.position.set(row.x, 3.74, pz);
        staticGroup.add(shade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), warmLedGlowMat);
        bulb.position.set(row.x, 3.64, pz);
        staticGroup.add(bulb);
      });
    });
  };
  buildAeonStarbucksReserve();

  // =========================================================================
  // 7. DEEP 32m WALK-IN AEON STYLE HYPERMARKET & DELICA SUSHI (X=144.0..176.2, Z=48.0..60.5)
  // =========================================================================
  const buildAeonStyleSupermarket = () => {
    const mFloorTex = createAeonMarketFloorTex();
    mFloorTex.repeat.set(10, 4);
    const mFloorMat = new THREE.MeshStandardMaterial({ map: mFloorTex, roughness: 0.32 });
    const mMagentaMat = new THREE.MeshStandardMaterial({ color: 0xa21caf, roughness: 0.35, metalness: 0.12 });
    const mWhiteWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.58 });
    const mFixtureWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 });
    const mCedarMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.54 });
    const mOakMat = new THREE.MeshStandardMaterial({ color: 0xd6b084, roughness: 0.52 });
    const mDarkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.44, metalness: 0.5 });
    const mChromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.86 });
    const mColdLedMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    neonMats.push(mColdLedMat);

    // 32.2m Deep Terrazzo Hypermarket Floor + Continuous Magenta Central Promenade Runner
    const mFloor = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.02, 12.48), mFloorMat);
    mFloor.position.set(160.1, 0.065, 54.25);
    staticGroup.add(mFloor);

    const mEntryStripe = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.014, 2.3), mMagentaMat);
    mEntryStripe.position.set(155.4, 0.076, 54.25);
    staticGroup.add(mEntryStripe);

    // Rear Wall (X=176.12), Side Walls (Z=48.02 & Z=60.48), & Continuous 32m Bright LED Ceiling
    const mBackWall = new THREE.Mesh(new THREE.PlaneGeometry(12.48, 5.2), mWhiteWallMat);
    mBackWall.rotation.y = -Math.PI / 2;
    mBackWall.position.set(176.12, 2.66, 54.25);
    staticGroup.add(mBackWall);

    [48.02, 60.48].forEach((wz, idx) => {
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 5.2), mWhiteWallMat);
      sideWall.rotation.y = idx === 0 ? 0 : Math.PI;
      sideWall.position.set(160.1, 2.66, wz);
      staticGroup.add(sideWall);

      const stripeBand = new THREE.Mesh(new THREE.BoxGeometry(31.8, 0.24, 0.016), mMagentaMat);
      stripeBand.position.set(160.1, 3.65, wz + (idx === 0 ? 0.014 : -0.014));
      staticGroup.add(stripeBand);
    });

    const mCeiling = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 12.48), mWhiteWallMat);
    mCeiling.rotation.x = Math.PI / 2;
    mCeiling.position.set(160.1, 5.25, 54.25);
    staticGroup.add(mCeiling);

    [50.2, 54.25, 58.3].forEach((lz) => {
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.06, 0.36), brightLedPanelMat);
      ledStrip.position.set(160.2, 5.22, lz);
      staticGroup.add(ledStrip);
    });

    // Open Storefront Portal at X = 144.0 (Z = 48.0..60.5, Wide Open Entrance Z = 51.4..57.1)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.15, 12.5), mMagentaMat);
    portalHeader.position.set(144.0, 4.32, 54.25);
    staticGroup.add(portalHeader);

    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 12.5), brightLedPanelMat);
    portalTrim.position.set(144.0, 3.25, 54.25);
    staticGroup.add(portalTrim);

    // Illuminated AEON STYLE • SUPERMARKET Fascia + Twin ÆON Crests
    const mFasciaTex = createAeonStyleFasciaTex();
    const mFasciaMat = new THREE.MeshStandardMaterial({
      map: mFasciaTex,
      emissive: 0xffffff,
      emissiveMap: mFasciaTex,
      emissiveIntensity: 0.72,
    });
    neonMats.push(mFasciaMat);
    const mFasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.55), mFasciaMat);
    mFasciaSign.rotation.y = -Math.PI / 2;
    mFasciaSign.position.set(143.77, 4.32, 54.25);
    staticGroup.add(mFasciaSign);

    const mCrestTex = createAeonLogoCrestTex();
    const mCrestMat = new THREE.MeshStandardMaterial({
      map: mCrestTex,
      emissive: 0xffffff,
      emissiveMap: mCrestTex,
      emissiveIntensity: 0.58,
    });
    neonMats.push(mCrestMat);
    [49.4, 59.1].forEach((cz) => {
      const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), mCrestMat);
      logoPlane.rotation.y = -Math.PI / 2;
      logoPlane.position.set(143.77, 4.32, cz);
      staticGroup.add(logoPlane);
    });

    // Flanking Clear Glass Storefront Windows with Promo Posters
    [
      { z: 49.7, title: 'SUSHI TƯƠI', badge: 'DELICA', sub: 'CHẾ BIẾN MỖI NGÀY', bg: '#7f1d1d', accent: '#a21caf' },
      { z: 58.8, title: 'TOPVALU', badge: 'NHẬT BẢN', sub: 'BÁNH KẸO • ĐỒ UỐNG', bg: '#580b45', accent: '#db2777' },
    ].forEach((win) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 3.35), mFixtureWhiteMat);
      curb.position.set(144.02, 0.19, win.z);
      staticGroup.add(curb);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.95), atriumGlassMat);
      glassPane.rotation.y = -Math.PI / 2;
      glassPane.position.set(143.86, 1.78, win.z);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.25, 0.16), mDarkSteelMat);
      postInner.position.set(144.0, 1.65, win.z < 54 ? 51.36 : 57.14);
      staticGroup.add(postInner);

      const pTex = createAeonPromoWindowTex(win.title, win.badge, win.sub, win.bg, win.accent);
      const pMat = new THREE.MeshStandardMaterial({
        map: pTex,
        emissive: 0xffffff,
        emissiveMap: pTex,
        emissiveIntensity: 0.55,
      });
      neonMats.push(pMat);
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.6), pMat);
      poster.rotation.y = -Math.PI / 2;
      poster.position.set(144.12, 1.75, win.z);
      staticGroup.add(poster);
    });

    // =========================================================================
    // FRONT HALL (X = 144.0 .. 153.5): Bakery, Fresh Produce, Baskets & 3 Checkouts
    // =========================================================================
    // AEON Bakery & Melonpan Boutique along North Wall (Z = 48.55, X = 145.6..152.2)
    const bakeryBase = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.92, 0.82), mCedarMat);
    bakeryBase.position.set(148.9, 0.53, 48.55);
    staticGroup.add(bakeryBase);
    const bakeryGlass = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.65, 0.66), atriumGlassMat);
    bakeryGlass.position.set(148.9, 1.32, 48.55);
    staticGroup.add(bakeryGlass);
    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    for (let bx = 146.3; bx <= 151.5; bx += 0.58) {
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), breadMat);
      loaf.scale.set(1.2, 0.7, 0.9);
      loaf.position.set(bx, 1.08, 48.55);
      staticGroup.add(loaf);
    }
    const bakerySignTex = createAeonDepartmentSignTex('AEON BAKERY', 'MELONPAN  •  BÁNH MÌ NHẬT TƯƠI', '#92400e', '#fde68a');
    const bakerySignMat = new THREE.MeshStandardMaterial({ map: bakerySignTex, emissive: 0xffffff, emissiveMap: bakerySignTex, emissiveIntensity: 0.48 });
    neonMats.push(bakerySignMat);
    const bakeryWallSign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.95), bakerySignMat);
    bakeryWallSign.position.set(148.9, 2.75, 48.08);
    staticGroup.add(bakeryWallSign);

    // Fresh Produce & Japanese Fruit Island (X = 148.8, Z = 52.4)
    const prodBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 2.2), mOakMat);
    prodBase.position.set(148.8, 0.46, 52.4);
    staticGroup.add(prodBase);
    const prodTop = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.08, 2.36), mCedarMat);
    prodTop.position.set(148.8, 0.89, 52.4);
    staticGroup.add(prodTop);

    const fruitMats = [
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }),
    ];
    [-0.64, 0.64].forEach((dx, xIdx) => {
      [-0.50, 0.50].forEach((dz, zIdx) => {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.78), mCedarMat);
        crate.position.set(148.8 + dx, 1.01, 52.4 + dz);
        staticGroup.add(crate);
        const fMat = fruitMats[(xIdx * 2 + zIdx) % fruitMats.length];
        for (let fx = -0.26; fx <= 0.27; fx += 0.26) {
          for (let fz = -0.18; fz <= 0.19; fz += 0.18) {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), fMat);
            fruit.position.set(148.8 + dx + fx, 1.12, 52.4 + dz + fz);
            staticGroup.add(fruit);
          }
        }
      });
    });

    // 3 AEON Magenta Supermarket Checkout Lanes along South Front (X = 146.4, 149.2, 152.0, Z = 59.0)
    [146.4, 149.2, 152.0].forEach((cx) => {
      const coBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.92, 0.85), mFixtureWhiteMat);
      coBody.position.set(cx, 0.53, 59.0);
      staticGroup.add(coBody);
      const coBelt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.62), mDarkSteelMat);
      coBelt.position.set(cx + 0.15, 1.01, 59.0);
      staticGroup.add(coBelt);
      const coStripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.16, 0.88), mMagentaMat);
      coStripe.position.set(cx, 0.24, 59.0);
      staticGroup.add(coStripe);
      const posMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.06), mDarkSteelMat);
      posMonitor.position.set(cx - 0.65, 1.24, 59.0);
      staticGroup.add(posMonitor);
    });

    // Stack of AEON Magenta Shopping Baskets by Entrance (X = 145.0, Z = 57.6)
    for (let b = 0; b < 4; b++) {
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.32), mMagentaMat);
      basket.position.set(145.0, 0.16 + b * 0.10, 57.6);
      staticGroup.add(basket);
    }

    // =========================================================================
    // MID HALL (X = 153.5 .. 165.5): Dual 10m Gondola Aisles, Freezers & Dairy Cooler
    // =========================================================================
    const snackMats = [
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.5 }),
    ];

    // Parallel 10m Gondola Aisles leaving wide Central Promenade (Z = 52.3..55.3) — slim center pegboard eliminates coplanar Z-fighting!
    [
      { z: 51.3, endColor: mMagentaMat },
      { z: 56.3, endColor: mDarkSteelMat },
    ].forEach((gSpec, gIdx) => {
      const gondolaCore = new THREE.Mesh(new THREE.BoxGeometry(9.8, 1.85, 0.32), mFixtureWhiteMat);
      gondolaCore.position.set(159.2, 1.00, gSpec.z);
      staticGroup.add(gondolaCore);
      [154.22, 164.18].forEach((ex) => {
        const endcap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.88, 1.08), gSpec.endColor);
        endcap.position.set(ex, 1.01, gSpec.z);
        staticGroup.add(endcap);
      });
      [0.52, 0.96, 1.40, 1.82].forEach((sy, sIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(9.75, 0.04, 1.08), mFixtureWhiteMat);
        shelf.position.set(159.2, sy, gSpec.z);
        staticGroup.add(shelf);
        for (let sx = 154.6; sx <= 163.8; sx += 0.54) {
          [-0.34, 0.34].forEach((szOff, sideIdx) => {
            const pack = new THREE.Mesh(
              new THREE.BoxGeometry(0.36, 0.28, 0.24),
              snackMats[(sIdx * 3 + Math.round(sx) + sideIdx + gIdx * 2) % snackMats.length]
            );
            pack.position.set(sx, sy + 0.16, gSpec.z + szOff);
            staticGroup.add(pack);
          });
        }
      });
    });

    // North Wall Mid: 3 Glass-Top Frozen Food & Ice Cream Chest Freezers (Z = 48.65, X = 154.0..164.4)
    [155.7, 159.2, 162.7].forEach((fx) => {
      const freezerBody = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.86, 1.05), mFixtureWhiteMat);
      freezerBody.position.set(fx, 0.50, 48.65);
      staticGroup.add(freezerBody);
      const freezerTrim = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.12, 1.08), mColdLedMat);
      freezerTrim.position.set(fx, 0.94, 48.65);
      staticGroup.add(freezerTrim);
      const freezerGlass = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.04, 0.92), atriumGlassMat);
      freezerGlass.position.set(fx, 1.02, 48.65);
      staticGroup.add(freezerGlass);
    });

    // South Wall Mid: 10.5m Open-Front Chilled Beverage & Hokkaido Dairy Multi-Deck Cooler (Z = 59.85, X = 154.5..165.0)
    const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.65, 0.42), mDarkSteelMat);
    coolerBody.position.set(159.75, 1.40, 60.15);
    staticGroup.add(coolerBody);
    const coolerLight = new THREE.Mesh(new THREE.BoxGeometry(10.2, 2.3, 0.04), mColdLedMat);
    coolerLight.position.set(159.75, 1.45, 59.91);
    staticGroup.add(coolerLight);

    const drinkMats = [
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }),
    ];
    [0.65, 1.15, 1.65, 2.15].forEach((fy, rIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.04, 0.65), mChromeMat);
      shelf.position.set(159.75, fy, 59.68);
      staticGroup.add(shelf);
      for (let bx = 154.9; bx <= 164.6; bx += 0.42) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.06, 0.24, 8),
          drinkMats[(rIdx + Math.round(bx * 2)) % drinkMats.length]
        );
        bottle.position.set(bx, fy + 0.14, 59.56);
        staticGroup.add(bottle);
      }
    });

    // Hanging Illuminated Aisle Directory Signs along Deep Hall
    [
      { x: 148.8, z: 52.4, title: 'FRESH PRODUCE', sub: 'TRÁI CÂY & RAU SẠCH NHẬT', bg: '#15803d' },
      { x: 156.8, z: 51.3, title: 'TOPVALU  •  SNACKS', sub: 'BÁNH KẸO & MÌ NHẬT BẢN', bg: '#86198f' },
      { x: 156.8, z: 56.3, title: 'HOUSEHOLD & BEAUTY', sub: 'GIA DỤNG & MỸ PHẨM NHẬT', bg: '#0f172a' },
      { x: 162.8, z: 56.3, title: 'BEVERAGES & DAIRY', sub: 'TRÀ XANH • SỮA HOKKAIDO', bg: '#0369a1' },
    ].forEach((dir) => {
      const dTex = createAeonDepartmentSignTex(dir.title, dir.sub, dir.bg, '#fde047');
      const dMat = new THREE.MeshStandardMaterial({
        map: dTex,
        emissive: 0xffffff,
        emissiveMap: dTex,
        emissiveIntensity: 0.50,
      });
      neonMats.push(dMat);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.72), dMat);
      sign.rotation.y = -Math.PI / 2;
      sign.position.set(dir.x, 3.45, dir.z);
      staticGroup.add(sign);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), mChromeMat);
      rod.position.set(dir.x, 4.5, dir.z);
      staticGroup.add(rod);
    });

    // =========================================================================
    // REAR GRAND HALL (X = 165.5 .. 176.2): Wagyu Island, Eat-In Bar, Live Sushi & Hot Delica
    // =========================================================================
    // Fresh Wagyu & Crushed-Ice Seafood Island (X = 168.4, Z = 54.25)
    const meatIslandBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.84, 2.5), mDarkSteelMat);
    meatIslandBase.position.set(168.4, 0.49, 54.25);
    staticGroup.add(meatIslandBase);
    const meatGlassRim = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.34, 2.58), atriumGlassMat);
    meatGlassRim.position.set(168.4, 1.08, 54.25);
    staticGroup.add(meatGlassRim);
    const meatColdGlow = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.04, 2.35), mColdLedMat);
    meatColdGlow.position.set(168.4, 0.93, 54.25);
    staticGroup.add(meatColdGlow);
    const wagyuMat = new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.35 });
    const seaMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.3 });
    [-0.55, 0.55].forEach((mx) => {
      [-0.65, 0, 0.65].forEach((mz, idx) => {
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.44), idx % 2 === 0 ? wagyuMat : seaMat);
        pack.position.set(168.4 + mx, 0.98, 54.25 + mz);
        staticGroup.add(pack);
      });
    });

    // Eat-In Sushi & Bento Tasting Counter along North Wall (Z = 48.65, X = 166.2..170.4)
    const eatTable = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.82), mOakMat);
    eatTable.position.set(168.3, 1.04, 48.65);
    staticGroup.add(eatTable);
    [166.5, 170.1].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.96, 0.72), mDarkSteelMat);
      leg.position.set(lx, 0.55, 48.65);
      staticGroup.add(leg);
    });
    [166.9, 168.3, 169.7].forEach((sx) => {
      const stoolPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8), mChromeMat);
      stoolPost.position.set(sx, 0.41, 49.45);
      staticGroup.add(stoolPost);
      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.06, 12), mCedarMat);
      stoolSeat.position.set(sx, 0.76, 49.45);
      staticGroup.add(stoolSeat);
    });

    // GRAND DELICA & LIVE SUSHI COUNTER (X = 173.0, Z = 48.8..55.4)
    const sushiBase = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.96, 6.4), mCedarMat);
    sushiBase.position.set(173.0, 0.55, 52.1);
    staticGroup.add(sushiBase);
    const sushiDeck = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.07, 6.5), mDarkSteelMat);
    sushiDeck.position.set(173.0, 1.06, 52.1);
    staticGroup.add(sushiDeck);
    const sushiGlassHood = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.54, 6.35), atriumGlassMat);
    sushiGlassHood.position.set(173.0, 1.36, 52.1);
    staticGroup.add(sushiGlassHood);
    const sushiColdLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 6.2), mColdLedMat);
    sushiColdLed.position.set(173.0, 1.61, 52.1);
    staticGroup.add(sushiColdLed);

    const sushiTrayMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 });
    const sushiRiceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const salmonMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.35 });
    const tunaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const tamagoMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
    const matchaMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });

    for (let i = 0; i < 9; i++) {
      const sz = 49.25 + i * 0.71;
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.54), sushiTrayMat);
      tray.position.set(172.98, 1.12, sz);
      staticGroup.add(tray);
      const rice = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.44), sushiRiceMat);
      rice.position.set(172.98, 1.155, sz);
      staticGroup.add(rice);
      const topMat = [salmonMat, tunaMat, tamagoMat, matchaMat][i % 4];
      [-0.12, 0.12].forEach((dz) => {
        const piece = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.14), topMat);
        piece.position.set(172.98, 1.19, sz + dz);
        staticGroup.add(piece);
      });
    }

    // Traditional Cloth Noren Curtains Hanging Over Sushi Bar
    [49.6, 51.2, 52.8, 54.4].forEach((nz, idx) => {
      const noren = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.65, 1.38),
        idx % 2 === 0 ? mMagentaMat : mDarkSteelMat
      );
      noren.position.set(173.0, 2.75, nz);
      staticGroup.add(noren);
    });

    // HOT DELICA KARAAGE, TEMPURA & TAKOYAKI COUNTER (X = 173.0, Z = 55.8..60.0)
    const hotBase = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.96, 4.1), mDarkSteelMat);
    hotBase.position.set(173.0, 0.55, 57.9);
    staticGroup.add(hotBase);
    const hotGlass = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.52, 3.95), atriumGlassMat);
    hotGlass.position.set(173.0, 1.32, 57.9);
    staticGroup.add(hotGlass);
    const hotLamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 3.85), warmLedGlowMat);
    hotLamp.position.set(173.0, 1.56, 57.9);
    staticGroup.add(hotLamp);
    const karaageMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
    for (let kz = 56.3; kz <= 59.5; kz += 0.64) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.44), sushiTrayMat);
      tray.position.set(172.98, 1.09, kz);
      staticGroup.add(tray);
      const food = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.32), karaageMat);
      food.position.set(172.98, 1.15, kz);
      staticGroup.add(food);
    }

    // Back Prep Kitchen Counter & Rear Illuminated Sushi + Hot Delica Marquees (X = 175.3..176.06)
    const prepBase = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.96, 11.2), mDarkSteelMat);
    prepBase.position.set(175.4, 0.55, 54.4);
    staticGroup.add(prepBase);
    const prepTop = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 11.3), mChromeMat);
    prepTop.position.set(175.4, 1.06, 54.4);
    staticGroup.add(prepTop);

    [
      { z: 52.1, title: 'DELICA • SUSHI NHẬT', sub: 'SASHIMI  •  NIGIRI  •  ONIGIRI TƯƠI', bg: '#7f1d1d', accent: '#fde047' },
      { z: 58.1, title: 'HOT DELICA • BENTO', sub: 'TAKOYAKI  •  KARAAGE  •  CƠM HỘP NHẬT', bg: '#78350f', accent: '#fde68a' },
    ].forEach((ds) => {
      const sTex = createAeonDepartmentSignTex(ds.title, ds.sub, ds.bg, ds.accent);
      const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.58 });
      neonMats.push(sMat);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.2), sMat);
      sign.rotation.y = -Math.PI / 2;
      sign.position.set(176.04, 3.25, ds.z);
      staticGroup.add(sign);
    });
  };
  buildAeonStyleSupermarket();

  // =========================================================================
  // 8. DEEP 32m WALK-IN ZARA FLAGSHIP BOUTIQUE (East Wing Ground: X=144.0..176.2, Z=61.8..74.3)
  // =========================================================================
  const buildZaraFlagshipBoutique = () => {
    const zFloorTex = createZaraTravertineFloorTex();
    zFloorTex.repeat.set(10, 4);
    const zFloorMat = new THREE.MeshStandardMaterial({ map: zFloorTex, roughness: 0.36 });
    const zPlasterMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.62 });
    const zStoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d0c4, roughness: 0.48 });
    const zBlackMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.38, metalness: 0.25 });
    const zBrassMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.28, metalness: 0.78 });
    const zMannequinMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.32 });
    const zMirrorMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.08, metalness: 0.92 });
    const zOliveMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.78 });

    const zFloor = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.02, 12.48), zFloorMat);
    zFloor.position.set(160.1, 0.065, 68.05);
    staticGroup.add(zFloor);

    const zBackWall = new THREE.Mesh(new THREE.PlaneGeometry(12.48, 5.2), zPlasterMat);
    zBackWall.rotation.y = -Math.PI / 2;
    zBackWall.position.set(176.12, 2.66, 68.05);
    staticGroup.add(zBackWall);

    [61.82, 74.28].forEach((wz, idx) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 5.2), zPlasterMat);
      wall.rotation.y = idx === 0 ? 0 : Math.PI;
      wall.position.set(160.1, 2.66, wz);
      staticGroup.add(wall);
    });

    const zCeiling = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 12.48), zPlasterMat);
    zCeiling.rotation.x = Math.PI / 2;
    zCeiling.position.set(160.1, 5.25, 68.05);
    staticGroup.add(zCeiling);

    [64.2, 68.05, 71.9].forEach((lz) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.06, 0.26), warmLedGlowMat);
      strip.position.set(160.2, 5.22, lz);
      staticGroup.add(strip);
    });

    // Architectural Matte-Black Steel Portal at X = 144.0 (Open Gallery Entrance Z = 65.2..70.9)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.15, 12.5), zBlackMat);
    portalHeader.position.set(144.0, 4.32, 68.05);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 12.5), warmLedGlowMat);
    portalTrim.position.set(144.0, 3.25, 68.05);
    staticGroup.add(portalTrim);

    const zFasciaTex = createZaraFasciaTex();
    const zFasciaMat = new THREE.MeshStandardMaterial({ map: zFasciaTex, emissive: 0xffffff, emissiveMap: zFasciaTex, emissiveIntensity: 0.72 });
    neonMats.push(zFasciaMat);
    const zFasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.55), zFasciaMat);
    zFasciaSign.rotation.y = -Math.PI / 2;
    zFasciaSign.position.set(143.77, 4.32, 68.05);
    staticGroup.add(zFasciaSign);

    const zPlaqueTex = createZaraLogoPlaqueTex();
    const zPlaqueMat = new THREE.MeshStandardMaterial({ map: zPlaqueTex, emissive: 0xffffff, emissiveMap: zPlaqueTex, emissiveIntensity: 0.52 });
    neonMats.push(zPlaqueMat);
    [63.2, 72.9].forEach((pz) => {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), zPlaqueMat);
      plaque.rotation.y = -Math.PI / 2;
      plaque.position.set(143.77, 4.32, pz);
      staticGroup.add(plaque);
    });

    const coatPalette = [
      new THREE.MeshStandardMaterial({ color: 0xd6b084, roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 }),
    ];
    const foldedClothesMats = [
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 }),
    ];

    const addZaraMannequin = (mx: number, my: number, mz: number, coatIdx: number) => {
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.88, 10), zMannequinMat);
      legs.position.set(mx, my + 0.44, mz);
      staticGroup.add(legs);
      const coat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.78, 0.44), coatPalette[coatIdx % 2]);
      coat.position.set(mx, my + 1.15, mz);
      staticGroup.add(coat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), zMannequinMat);
      head.position.set(mx, my + 1.67, mz);
      staticGroup.add(head);
    };

    // ZONE 1: FRONT EDITORIAL GALLERY (X = 144.0..153.5)
    [
      { z: 63.5, title: 'ZARA STUDIO', sub: 'MINIMALIST TAILORING', coatIdx: 0 },
      { z: 72.6, title: 'NEW SEASON', sub: 'AUTUMN / WINTER', coatIdx: 1 },
    ].forEach((win) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 2.75), zStoneMat);
      plinth.position.set(144.45, 0.24, win.z);
      staticGroup.add(plinth);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.95), atriumGlassMat);
      glassPane.rotation.y = -Math.PI / 2;
      glassPane.position.set(143.86, 1.78, win.z);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.25, 0.16), zBlackMat);
      postInner.position.set(144.0, 1.65, win.z < 68 ? 65.16 : 70.94);
      staticGroup.add(postInner);

      [-0.52, 0.52].forEach((dz, mIdx) => {
        addZaraMannequin(144.45, 0.41, win.z + dz, win.coatIdx + mIdx);
      });

      const pTex = createFashionPromoPosterTex('ZARA', win.title, win.sub, '#18181b', '#e7e2d8');
      const pMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.48 });
      neonMats.push(pMat);
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), pMat);
      poster.rotation.y = -Math.PI / 2;
      poster.position.set(144.08, 2.35, win.z);
      staticGroup.add(poster);
    });

    [148.6, 152.2].forEach((tx, tIdx) => {
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.78, 1.3), zStoneMat);
      table.position.set(tx, 0.46, 68.05);
      staticGroup.add(table);
      [-0.72, 0, 0.72].forEach((dx, sIdx) => {
        for (let layer = 0; layer < 4; layer++) {
          const item = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.06, 0.36),
            foldedClothesMats[(tIdx + sIdx + layer) % foldedClothesMats.length]
          );
          item.position.set(tx + dx, 0.89 + layer * 0.065, 68.05 + (sIdx === 1 ? 0.25 : -0.22));
          staticGroup.add(item);
        }
      });
      const bagObj = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.14), zBlackMat);
      bagObj.position.set(tx, 0.98, 67.85);
      staticGroup.add(bagObj);
    });

    // Continuous 24m Architectural Brass Garment Rails along North (Z = 62.35) & South (Z = 73.75) Walls
    [62.35, 73.75].forEach((rz, sideIdx) => {
      const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 23.6, 8), zBrassMat);
      railBar.rotation.z = Math.PI / 2;
      railBar.position.set(158.0, 1.72, rz);
      staticGroup.add(railBar);
      const shelfTop = new THREE.Mesh(new THREE.BoxGeometry(23.8, 0.06, 0.48), zStoneMat);
      shelfTop.position.set(158.0, 2.05, rz);
      staticGroup.add(shelfTop);

      for (let hx = 146.5; hx <= 169.5; hx += 0.44) {
        const garment = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.88, 0.38),
          foldedClothesMats[(Math.round(hx * 2) + sideIdx) % foldedClothesMats.length]
        );
        garment.position.set(hx, 1.24, rz);
        staticGroup.add(garment);
      }
    });

    // ZONE 2: MID COLLECTIONS — ZARA WOMAN (Z=65.4) & ZARA MAN (Z=70.7) 8.4m Brass Gondolas (X = 155.2..163.6)
    [
      { z: 65.4, title: 'ZARA WOMAN', sub: 'BLAZERS • SILK • KNITWEAR', matIdx: 0 },
      { z: 70.7, title: 'ZARA MAN', sub: 'TAILORED SUITS • OUTERWEAR', matIdx: 2 },
    ].forEach((aisle, aIdx) => {
      const islandCore = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.78, 1.15), zStoneMat);
      islandCore.position.set(159.4, 0.46, aisle.z);
      staticGroup.add(islandCore);
      const brassArch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 8.2, 8), zBrassMat);
      brassArch.rotation.z = Math.PI / 2;
      brassArch.position.set(159.4, 1.74, aisle.z);
      staticGroup.add(brassArch);
      [155.35, 163.45].forEach((px) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.96, 0.06), zBlackMat);
        post.position.set(px, 1.28, aisle.z);
        staticGroup.add(post);
      });
      for (let gx = 155.8; gx <= 163.0; gx += 0.48) {
        const coat = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.74, 0.40),
          foldedClothesMats[(Math.round(gx) + aisle.matIdx + aIdx) % foldedClothesMats.length]
        );
        coat.position.set(gx, 1.32, aisle.z);
        staticGroup.add(coat);
      }
      addZaraMannequin(154.6, 0.075, aisle.z, aIdx);

      const secTex = createFashionPromoPosterTex('ZARA', aisle.title, aisle.sub, '#09090b', '#e7e2d8');
      const secMat = new THREE.MeshStandardMaterial({ map: secTex, emissive: 0xffffff, emissiveMap: secTex, emissiveIntensity: 0.48 });
      neonMats.push(secMat);
      const secBanner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), secMat);
      secBanner.rotation.y = -Math.PI / 2;
      secBanner.position.set(157.5, 3.45, aisle.z);
      staticGroup.add(secBanner);
    });

    // ZONE 3: REAR ZARA STUDIO PERFUME BAR, FITTING ROOMS & FLAGSHIP CASHDESK (X = 165.5..176.1)
    const perfumeIsland = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.86, 1.8), zStoneMat);
    perfumeIsland.position.set(168.4, 0.50, 68.05);
    staticGroup.add(perfumeIsland);
    [-0.7, 0, 0.7].forEach((px, fIdx) => {
      const bottle = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.24, 0.16),
        new THREE.MeshStandardMaterial({ color: fIdx === 1 ? 0xd97706 : 0xf5f5f4, roughness: 0.15, metalness: 0.15 })
      );
      bottle.position.set(168.4 + px, 1.06, 68.05);
      staticGroup.add(bottle);
    });
    const olivePot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.42, 12), zStoneMat);
    olivePot.position.set(166.2, 0.28, 68.05);
    staticGroup.add(olivePot);
    const oliveCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), zOliveMat);
    oliveCanopy.position.set(166.2, 1.25, 68.05);
    staticGroup.add(oliveCanopy);

    // 4 Linen Fitting Room Cabins (X = 171.6..175.8, Z = 62.2..65.4) + Full-Length Brass Mirror
    const fitPartition = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.75, 0.12), zStoneMat);
    fitPartition.position.set(173.7, 1.44, 65.4);
    staticGroup.add(fitPartition);
    [172.0, 173.2, 174.4].forEach((cx) => {
      const fitCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.45, 0.08), zPlasterMat);
      fitCurtain.position.set(cx, 1.30, 65.44);
      staticGroup.add(fitCurtain);
    });
    const zMirror = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.3), zMirrorMat);
    zMirror.rotation.y = -Math.PI / 2;
    zMirror.position.set(171.56, 1.35, 63.8);
    staticGroup.add(zMirror);

    // Grand Flagship Travertine Cashdesk (X = 173.6, Z = 67.2..72.2) + Monumental Back Wall Marquee
    const zaraDesk = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.02, 5.0), zStoneMat);
    zaraDesk.position.set(173.6, 0.58, 69.7);
    staticGroup.add(zaraDesk);
    [68.1, 69.7, 71.3].forEach((pz) => {
      const zaraPos = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.36), zBlackMat);
      zaraPos.position.set(173.4, 1.22, pz);
      staticGroup.add(zaraPos);
    });

    const zaraBackTex = createZaraFasciaTex();
    const zaraBackMat = new THREE.MeshStandardMaterial({ map: zaraBackTex, emissive: 0xffffff, emissiveMap: zaraBackTex, emissiveIntensity: 0.58 });
    neonMats.push(zaraBackMat);
    const zaraBackSign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.65), zaraBackMat);
    zaraBackSign.rotation.y = -Math.PI / 2;
    zaraBackSign.position.set(176.04, 3.05, 68.05);
    staticGroup.add(zaraBackSign);
  };
  buildZaraFlagshipBoutique();

  // =========================================================================
  // 9. DEEP 32m WALK-IN H&M FLAGSHIP STORE BESIDE ZARA (East Wing Ground: X=144.0..176.2, Z=75.6..88.1)
  // =========================================================================
  const buildHmFlagshipBoutique = () => {
    const hFloorTex = createHmConcreteFloorTex();
    hFloorTex.repeat.set(10, 4);
    const hFloorMat = new THREE.MeshStandardMaterial({ map: hFloorTex, roughness: 0.38 });
    const hWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.52 });
    const hOakMat = new THREE.MeshStandardMaterial({ color: 0xe2c799, roughness: 0.52 });
    const hRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const hBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.42 });
    const hChromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
    const hMannequinMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });

    const hFloor = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.02, 12.48), hFloorMat);
    hFloor.position.set(160.1, 0.065, 81.85);
    staticGroup.add(hFloor);

    const hBackWall = new THREE.Mesh(new THREE.PlaneGeometry(12.48, 5.2), hWhiteMat);
    hBackWall.rotation.y = -Math.PI / 2;
    hBackWall.position.set(176.12, 2.66, 81.85);
    staticGroup.add(hBackWall);

    [75.62, 88.08].forEach((wz, idx) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 5.2), hWhiteMat);
      wall.rotation.y = idx === 0 ? 0 : Math.PI;
      wall.position.set(160.1, 2.66, wz);
      staticGroup.add(wall);

      const redStripe = new THREE.Mesh(new THREE.BoxGeometry(31.8, 0.20, 0.016), hRedMat);
      redStripe.position.set(160.1, 3.65, wz + (idx === 0 ? 0.014 : -0.014));
      staticGroup.add(redStripe);
    });

    const hCeiling = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 12.48), hWhiteMat);
    hCeiling.rotation.x = Math.PI / 2;
    hCeiling.position.set(160.1, 5.25, 81.85);
    staticGroup.add(hCeiling);

    [78.0, 81.85, 85.7].forEach((lz) => {
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.06, 0.36), brightLedPanelMat);
      ledStrip.position.set(160.2, 5.22, lz);
      staticGroup.add(ledStrip);
    });

    // Crisp White & Signature Crimson H&M Portal at X = 144.0 (Open Entrance Z = 79.0..84.7)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.15, 12.5), hWhiteMat);
    portalHeader.position.set(144.0, 4.32, 81.85);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 12.5), hRedMat);
    portalTrim.position.set(144.0, 3.25, 81.85);
    staticGroup.add(portalTrim);

    const hFasciaTex = createHmFasciaTex();
    const hFasciaMat = new THREE.MeshStandardMaterial({ map: hFasciaTex, emissive: 0xffffff, emissiveMap: hFasciaTex, emissiveIntensity: 0.72 });
    neonMats.push(hFasciaMat);
    const hFasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.55), hFasciaMat);
    hFasciaSign.rotation.y = -Math.PI / 2;
    hFasciaSign.position.set(143.77, 4.32, 81.85);
    staticGroup.add(hFasciaSign);

    const hCrestTex = createHmCrestTex();
    const hCrestMat = new THREE.MeshStandardMaterial({ map: hCrestTex, emissive: 0xffffff, emissiveMap: hCrestTex, emissiveIntensity: 0.62 });
    neonMats.push(hCrestMat);
    [77.0, 86.7].forEach((cz) => {
      const crest = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), hCrestMat);
      crest.rotation.y = -Math.PI / 2;
      crest.position.set(143.77, 4.32, cz);
      staticGroup.add(crest);
    });

    const hmStreetMats = [
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }),
    ];
    [
      { z: 77.3, title: 'H&M DIVIDED', sub: 'STREETWEAR • DENIM', colIdx: 0 },
      { z: 86.4, title: 'NEW SEASON', sub: 'UP TO 30% OFF BASICS', colIdx: 1 },
    ].forEach((win) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 2.75), hWhiteMat);
      plinth.position.set(144.45, 0.24, win.z);
      staticGroup.add(plinth);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.95), atriumGlassMat);
      glassPane.rotation.y = -Math.PI / 2;
      glassPane.position.set(143.86, 1.78, win.z);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.25, 0.16), hBlackMat);
      postInner.position.set(144.0, 1.65, win.z < 81.8 ? 78.96 : 84.74);
      staticGroup.add(postInner);

      [-0.5, 0.5].forEach((dz, mIdx) => {
        const mx = 144.45;
        const mz = win.z + dz;
        const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.88, 10), hMannequinMat);
        legs.position.set(mx, 0.85, mz);
        staticGroup.add(legs);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 0.42), hmStreetMats[(win.colIdx + mIdx) % hmStreetMats.length]);
        top.position.set(mx, 1.56, mz);
        staticGroup.add(top);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), hMannequinMat);
        head.position.set(mx, 2.02, mz);
        staticGroup.add(head);
      });

      const pTex = createFashionPromoPosterTex('H&M', win.title, win.sub, '#ffffff', '#dc2626', '#18181b');
      const pMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.52 });
      neonMats.push(pMat);
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), pMat);
      poster.rotation.y = -Math.PI / 2;
      poster.position.set(144.08, 2.35, win.z);
      staticGroup.add(poster);
    });

    // ZONE 1: Twin White-Oak Promo Display Tables (X = 148.8, Z = 79.0 & 84.7) + 2 Circular Carousels (X = 152.6 & 165.0)
    [79.0, 84.7].forEach((tz, tIdx) => {
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.3), hOakMat);
      table.position.set(148.8, 0.46, tz);
      staticGroup.add(table);
      [-0.75, 0, 0.75].forEach((dx, sIdx) => {
        for (let layer = 0; layer < 4; layer++) {
          const stack = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.06, 0.36),
            hmStreetMats[(tIdx + sIdx + layer) % hmStreetMats.length]
          );
          stack.position.set(148.8 + dx, 0.89 + layer * 0.065, tz);
          staticGroup.add(stack);
        }
      });
    });

    [152.6, 165.0].forEach((cx, cIdx) => {
      const carouselPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.65, 10), hChromeMat);
      carouselPole.position.set(cx, 0.90, 81.85);
      staticGroup.add(carouselPole);
      const carouselRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.025, 8, 24), hChromeMat);
      carouselRing.rotation.x = Math.PI / 2;
      carouselRing.position.set(cx, 1.68, 81.85);
      staticGroup.add(carouselRing);
      for (let a = 0; a < 10; a++) {
        const ang = (a / 10) * Math.PI * 2;
        const item = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.32), hmStreetMats[(a + cIdx) % hmStreetMats.length]);
        item.rotation.y = -ang;
        item.position.set(cx + Math.cos(ang) * 0.75, 1.25, 81.85 + Math.sin(ang) * 0.75);
        staticGroup.add(item);
      }
    });

    // Continuous 24m North (Z = 76.15) & South (Z = 87.55) Chrome Streetwear Racks
    [76.15, 87.55].forEach((rz, sideIdx) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 23.6, 8), hChromeMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(158.0, 1.72, rz);
      staticGroup.add(rail);
      for (let hx = 146.4; hx <= 169.6; hx += 0.44) {
        const garment = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.80, 0.36),
          hmStreetMats[(Math.round(hx * 2) + sideIdx) % hmStreetMats.length]
        );
        garment.position.set(hx, 1.26, rz);
        staticGroup.add(garment);
      }
    });

    // ZONE 2: MID H&M DIVIDED & DENIM LAB 8.2m Streetwear Gondolas (X = 155.4..163.6, Z = 79.1 & 84.6)
    [
      { z: 79.1, title: 'H&M DIVIDED', sub: 'HOODIES • OVERSIZED TEES', cOff: 0 },
      { z: 84.6, title: 'DENIM LAB • BASICS', sub: 'JEANS • JACKETS • SNEAKERS', cOff: 1 },
    ].forEach((gond, gIdx) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.78, 1.15), hOakMat);
      base.position.set(159.5, 0.46, gond.z);
      staticGroup.add(base);
      const rackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 8.0, 8), hChromeMat);
      rackBar.rotation.z = Math.PI / 2;
      rackBar.position.set(159.5, 1.72, gond.z);
      staticGroup.add(rackBar);
      for (let hx = 155.9; hx <= 163.1; hx += 0.48) {
        const piece = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.74, 0.36),
          hmStreetMats[(Math.round(hx) + gond.cOff + gIdx) % hmStreetMats.length]
        );
        piece.position.set(hx, 1.30, gond.z);
        staticGroup.add(piece);
      }
      const catTex = createFashionPromoPosterTex('H&M', gond.title, gond.sub, '#ffffff', '#dc2626', '#18181b');
      const catMat = new THREE.MeshStandardMaterial({ map: catTex, emissive: 0xffffff, emissiveMap: catTex, emissiveIntensity: 0.50 });
      neonMats.push(catMat);
      const catBanner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), catMat);
      catBanner.rotation.y = -Math.PI / 2;
      catBanner.position.set(157.5, 3.45, gond.z);
      staticGroup.add(catBanner);
    });

    // ZONE 3: Rear Sneaker & Accessories Display Island (X = 168.5, Z = 81.85), Fitting Cabins (Z = 76.0..79.2) & 4-POS Checkout
    const accIsland = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.84, 1.6), hOakMat);
    accIsland.position.set(168.5, 0.49, 81.85);
    staticGroup.add(accIsland);
    [-0.65, 0, 0.65].forEach((dx, sIdx) => {
      const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.22), hmStreetMats[sIdx % hmStreetMats.length]);
      sneaker.position.set(168.5 + dx, 0.99, 81.85);
      staticGroup.add(sneaker);
    });

    const hmFitWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.75, 0.12), hWhiteMat);
    hmFitWall.position.set(173.7, 1.44, 79.2);
    staticGroup.add(hmFitWall);
    [172.0, 173.2, 174.4].forEach((cx) => {
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.45, 0.08), hBlackMat);
      curtain.position.set(cx, 1.30, 79.24);
      staticGroup.add(curtain);
    });

    const recycleBin = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.08, 0.62), hRedMat);
    recycleBin.position.set(145.6, 0.61, 86.9);
    staticGroup.add(recycleBin);

    const hmDesk = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.02, 5.2), hWhiteMat);
    hmDesk.position.set(173.6, 0.58, 83.2);
    staticGroup.add(hmDesk);
    const hmDeskStripe = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 5.22), hRedMat);
    hmDeskStripe.position.set(173.6, 0.22, 83.2);
    staticGroup.add(hmDeskStripe);
    [81.3, 82.5, 83.8, 85.0].forEach((pz) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.36), hBlackMat);
      pos.position.set(173.4, 1.22, pz);
      staticGroup.add(pos);
    });

    const hmBackTex = createHmFasciaTex();
    const hmBackMat = new THREE.MeshStandardMaterial({ map: hmBackTex, emissive: 0xffffff, emissiveMap: hmBackTex, emissiveIntensity: 0.58 });
    neonMats.push(hmBackMat);
    const hmBackSign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.65), hmBackMat);
    hmBackSign.rotation.y = -Math.PI / 2;
    hmBackSign.position.set(176.04, 3.05, 81.85);
    staticGroup.add(hmBackSign);
  };
  buildHmFlagshipBoutique();

  // =========================================================================
  // 10. EXPANDED 34m WALK-IN MLB KOREA STREETWEAR FLAGSHIP (X=112.4..127.5, Z=91.15..125.15)
  // =========================================================================
  const buildMlbFlagshipBoutique = () => {
    const mlbFloorTex = createMlbFloorTex();
    mlbFloorTex.repeat.set(5, 11);
    const mlbFloorMat = new THREE.MeshStandardMaterial({ map: mlbFloorTex, roughness: 0.36 });
    const mlbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.52 });
    const mlbNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.25 });
    const mlbRoyalMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.38, metalness: 0.15 });
    const mlbRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38 });
    const mlbChromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.88 });
    const mlbGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.28, metalness: 0.72 });
    const mlbMannequinMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });

    const mFloor = new THREE.Mesh(new THREE.BoxGeometry(15.06, 0.02, 34.0), mlbFloorMat);
    mFloor.position.set(119.95, 0.065, 108.15);
    staticGroup.add(mFloor);

    const mRunner = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.014, 29.5), mlbRoyalMat);
    mRunner.position.set(118.9, 0.076, 106.5);
    staticGroup.add(mRunner);

    // Interior Walls & Bright 34m Stadium-Strip Ceiling
    const mBackWall = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 5.2), mlbNavyMat);
    mBackWall.rotation.y = Math.PI;
    mBackWall.position.set(119.95, 2.66, 125.12);
    staticGroup.add(mBackWall);

    [112.42, 127.48].forEach((wx, idx) => {
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(33.7, 5.2), mlbWhiteMat);
      sideWall.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
      sideWall.position.set(wx, 2.66, 108.25);
      staticGroup.add(sideWall);
    });

    const mCeiling = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 34.0), mlbWhiteMat);
    mCeiling.rotation.x = Math.PI / 2;
    mCeiling.position.set(119.95, 5.25, 108.15);
    staticGroup.add(mCeiling);

    [115.0, 119.95, 124.9].forEach((lx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 31.6), brightLedPanelMat);
      strip.position.set(lx, 5.22, 108.15);
      staticGroup.add(strip);
    });

    // Storefront Portal at Z = 91.15 (Inset 4cm from piers to eliminate edge Z-fighting; Doorway X = 116.2..121.6)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(15.02, 2.12, 0.42), mlbNavyMat);
    portalHeader.position.set(119.95, 4.31, 91.15);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.14, 0.46), mlbRedMat);
    portalTrim.position.set(119.95, 3.24, 91.15);
    staticGroup.add(portalTrim);

    const mlbFasciaTex = createMlbFasciaTex();
    const mlbFasciaMat = new THREE.MeshStandardMaterial({ map: mlbFasciaTex, emissive: 0xffffff, emissiveMap: mlbFasciaTex, emissiveIntensity: 0.72 });
    neonMats.push(mlbFasciaMat);
    const mlbFascia = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.55), mlbFasciaMat);
    mlbFascia.rotation.y = Math.PI;
    mlbFascia.position.set(119.95, 4.31, 90.92);
    staticGroup.add(mlbFascia);

    [
      { x: 113.9, team: 'NY' as const },
      { x: 126.0, team: 'LA' as const },
    ].forEach((cr) => {
      const cTex = createMlbLogoTex(cr.team);
      const cMat = new THREE.MeshStandardMaterial({ map: cTex, emissive: 0xffffff, emissiveMap: cTex, emissiveIntensity: 0.62 });
      neonMats.push(cMat);
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), cMat);
      plaque.rotation.y = Math.PI;
      plaque.position.set(cr.x, 4.31, 90.92);
      staticGroup.add(plaque);
    });

    const mlbStreetMats = [
      mlbNavyMat,
      mlbRoyalMat,
      mlbWhiteMat,
      mlbRedMat,
      new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.6 }),
    ];

    // Flanking Panoramic Display Windows (West X=112.4..116.2 & East X=121.6..127.5)
    [
      { x: 114.3, w: 3.64, postX: 116.16, title: 'NY MONOGRAM', sub: 'CAPS & VARSITY', colIdx: 0 },
      { x: 124.55, w: 5.74, postX: 121.64, title: 'BIGBALL CHUNKY', sub: 'ICONIC STREET SHOES', colIdx: 1 },
    ].forEach((win) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(win.w, 0.34, 0.95), mlbWhiteMat);
      curb.position.set(win.x, 0.24, 91.55);
      staticGroup.add(curb);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(win.w, 2.95), atriumGlassMat);
      glassPane.rotation.y = Math.PI;
      glassPane.position.set(win.x, 1.78, 90.98);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.22, 0.16), mlbNavyMat);
      postInner.position.set(win.postX, 1.64, 91.15);
      staticGroup.add(postInner);

      [-0.75, 0.75].forEach((dx, mIdx) => {
        const mx = win.x + dx;
        const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.88, 10), mlbMannequinMat);
        legs.position.set(mx, 0.85, 91.55);
        staticGroup.add(legs);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.64, 0.32), mlbStreetMats[(win.colIdx + mIdx) % mlbStreetMats.length]);
        top.position.set(mx, 1.58, 91.55);
        staticGroup.add(top);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), mlbMannequinMat);
        head.position.set(mx, 2.04, 91.55);
        staticGroup.add(head);
      });

      const pTex = createFashionPromoPosterTex('MLB', win.title, win.sub, '#0f172a', '#1d4ed8', '#ffffff');
      const pMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.52 });
      neonMats.push(pMat);
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), pMat);
      poster.rotation.y = Math.PI;
      poster.position.set(win.x, 2.35, 91.16);
      staticGroup.add(poster);
    });

    // ZONE 1: Chunky Sneaker 3-Tier Bleacher (X=115.6, Z=95.8) & Varsity Apparel Table (X=123.2, Z=95.8)
    for (let tier = 0; tier < 3; tier++) {
      const stepBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28 + tier * 0.22, 0.50), mlbWhiteMat);
      stepBox.position.set(115.6, 0.21 + tier * 0.11, 95.3 + tier * 0.48);
      staticGroup.add(stepBox);
      for (let sx = -0.95; sx <= 0.96; sx += 0.48) {
        const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), mlbStreetMats[(tier + Math.round(sx * 3) + 4) % mlbStreetMats.length]);
        sneaker.position.set(115.6 + sx, 0.43 + tier * 0.22, 95.3 + tier * 0.48);
        staticGroup.add(sneaker);
      }
    }

    const varTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.3), mlbNavyMat);
    varTable.position.set(123.2, 0.46, 95.8);
    staticGroup.add(varTable);
    [-0.75, 0, 0.75].forEach((dx, sIdx) => {
      for (let l = 0; l < 4; l++) {
        const hoodie = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.065, 0.40), mlbStreetMats[(sIdx + l) % mlbStreetMats.length]);
        hoodie.position.set(123.2 + dx, 0.89 + l * 0.07, 95.8);
        staticGroup.add(hoodie);
      }
    });

    // ZONE 2: Expanded 23.6m Floor-to-Ceiling MLB Cap Wall (West X=112.74, Z=94..117.6) & Varsity Jacket Rail (East X=127.02)
    const capWallUnit = new THREE.Mesh(new THREE.BoxGeometry(0.58, 3.2, 23.6), mlbNavyMat);
    capWallUnit.position.set(112.74, 1.67, 105.8);
    staticGroup.add(capWallUnit);
    [0.65, 1.25, 1.85, 2.45].forEach((cy, rIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 23.2), mlbChromeMat);
      shelf.position.set(112.92, cy, 105.8);
      staticGroup.add(shelf);
      for (let cz = 94.7; cz <= 117.1; cz += 0.70) {
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
          mlbStreetMats[(rIdx + Math.round(cz * 2)) % mlbStreetMats.length]
        );
        crown.position.set(112.96, cy + 0.03, cz);
        staticGroup.add(crown);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.16), mlbGoldMat);
        brim.position.set(113.06, cy + 0.04, cz);
        staticGroup.add(brim);
      }
    });

    [
      { z: 99.8, title: 'MLB CAP WALL', sub: 'NY YANKEES  •  LA DODGERS  •  BOSTON' },
      { z: 112.2, title: 'LIMITED CAPS', sub: 'MONOGRAM  •  DIAMOND  •  STREET' },
    ].forEach((hdr) => {
      const mlbCapTex = createAeonDepartmentSignTex(hdr.title, hdr.sub, '#1e3a8a', '#fde047');
      const mlbCapMat = new THREE.MeshStandardMaterial({ map: mlbCapTex, emissive: 0xffffff, emissiveMap: mlbCapTex, emissiveIntensity: 0.5 });
      neonMats.push(mlbCapMat);
      const mlbCapHeader = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.72), mlbCapMat);
      mlbCapHeader.rotation.y = Math.PI / 2;
      mlbCapHeader.position.set(113.08, 3.72, hdr.z);
      staticGroup.add(mlbCapHeader);
    });

    const eastRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 23.4, 8), mlbChromeMat);
    eastRail.rotation.x = Math.PI / 2;
    eastRail.position.set(127.02, 1.78, 105.8);
    staticGroup.add(eastRail);
    for (let gz = 94.6; gz <= 117.2; gz += 0.48) {
      const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.80, 0.16), mlbStreetMats[Math.round(gz * 2) % mlbStreetMats.length]);
      jacket.position.set(127.02, 1.28, gz);
      staticGroup.add(jacket);
    }

    // ZONE 3: Twin Mid Streetwear Gondolas (X=116.3 & 122.5, Z=100.8) + Overhead Banners
    [
      { x: 116.3, z: 100.8, title: 'BIGBALL CHUNKY', sub: 'SNEAKERS & STREET CAPS' },
      { x: 122.5, z: 100.8, title: 'NY MONOGRAM', sub: 'CROSSBODY BAGS & HOODIES' },
      { x: 116.3, z: 114.6, title: 'VARSITY DENIM', sub: 'JACKETS & FLEECE DROP' },
      { x: 122.5, z: 114.6, title: 'MLB BACKPACKS', sub: 'NY & LA DAILY BAGS' },
    ].forEach((g, gIdx) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.78, 1.2), mlbNavyMat);
      base.position.set(g.x, 0.46, g.z);
      staticGroup.add(base);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.0, 8), mlbChromeMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(g.x, 1.72, g.z);
      staticGroup.add(bar);
      for (let gx = g.x - 1.2; gx <= g.x + 1.21; gx += 0.48) {
        const tee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.36), mlbStreetMats[(Math.round(gx) + gIdx) % mlbStreetMats.length]);
        tee.position.set(gx, 1.30, g.z);
        staticGroup.add(tee);
      }
      const bTex = createAeonDepartmentSignTex(g.title, g.sub, '#0f172a', '#ffffff');
      const bMat = new THREE.MeshStandardMaterial({ map: bTex, emissive: 0xffffff, emissiveMap: bTex, emissiveIntensity: 0.48 });
      neonMats.push(bMat);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), bMat);
      banner.rotation.y = Math.PI;
      banner.position.set(g.x, 3.45, g.z);
      staticGroup.add(banner);
    });

    // ZONE 4 (Deep Expansion Centerpiece Z=108.0): MLB Diamond Sneaker Court Island
    const courtStage = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.42, 2.8), mlbWhiteMat);
    courtStage.position.set(119.4, 0.28, 108.0);
    staticGroup.add(courtStage);
    const courtRim = new THREE.Mesh(new THREE.BoxGeometry(4.28, 0.06, 2.88), mlbRedMat);
    courtRim.position.set(119.4, 0.50, 108.0);
    staticGroup.add(courtRim);
    [-1.2, 0.0, 1.2].forEach((px, idx) => {
      const riser = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42 + idx * 0.14, 0.75), mlbNavyMat);
      riser.position.set(119.4 + px, 0.72 + idx * 0.07, 108.0);
      staticGroup.add(riser);
      const heroShoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.44), mlbStreetMats[idx % mlbStreetMats.length]);
      heroShoe.position.set(119.4 + px, 1.04 + idx * 0.14, 108.0);
      staticGroup.add(heroShoe);
    });
    const labTex = createAeonDepartmentSignTex('MLB SNEAKER LAB', 'CHUNKY RUNNER  •  COURT EDITION', '#dc2626', '#ffffff');
    const labMat = new THREE.MeshStandardMaterial({ map: labTex, emissive: 0xffffff, emissiveMap: labTex, emissiveIntensity: 0.52 });
    neonMats.push(labMat);
    const labSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.78), labMat);
    labSign.rotation.y = Math.PI;
    labSign.position.set(119.4, 3.55, 108.0);
    staticGroup.add(labSign);

    // ZONE 5 (Deep Rear Z=121..125): Stadium Locker Fitting Rooms (X=123.8..127.3) & Navy Dugout Checkout (X=118.6, Z=122.8)
    const lockWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.75, 0.14), mlbNavyMat);
    lockWall.position.set(125.6, 1.44, 121.4);
    staticGroup.add(lockWall);
    [124.5, 126.2].forEach((cx) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.4, 0.08), mlbRoyalMat);
      door.position.set(cx, 1.28, 121.34);
      staticGroup.add(door);
    });

    const mlbDesk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.02, 0.96), mlbNavyMat);
    mlbDesk.position.set(118.6, 0.58, 122.8);
    staticGroup.add(mlbDesk);
    const mlbDeskTop = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.07, 1.08), mlbChromeMat);
    mlbDeskTop.position.set(118.6, 1.12, 122.8);
    staticGroup.add(mlbDeskTop);
    [117.0, 118.6, 120.2].forEach((px) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.18), mlbWhiteMat);
      pos.position.set(px, 1.28, 122.6);
      staticGroup.add(pos);
    });

    const mlbBackSign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), mlbFasciaMat);
    mlbBackSign.rotation.y = Math.PI;
    mlbBackSign.position.set(119.95, 3.15, 125.04);
    staticGroup.add(mlbBackSign);
  };
  buildMlbFlagshipBoutique();

  // =========================================================================
  // 11. EXPANDED 34m WALK-IN CHARLES & KEITH FLAGSHIP BOUTIQUE (X=128.5..143.6, Z=91.15..125.15)
  // =========================================================================
  const buildCharlesKeithBoutique = () => {
    const ckFloorTex = createCnkTerrazzoFloorTex();
    ckFloorTex.repeat.set(5, 11);
    const ckFloorMat = new THREE.MeshStandardMaterial({ map: ckFloorTex, roughness: 0.34 });
    const ckCreamWallMat = new THREE.MeshStandardMaterial({ color: 0xf4eee6, roughness: 0.62 });
    const ckStoneMat = new THREE.MeshStandardMaterial({ color: 0xded4c6, roughness: 0.46 });
    const ckCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.38, metalness: 0.25 });
    const ckGoldMat = new THREE.MeshStandardMaterial({ color: 0xc8a258, roughness: 0.26, metalness: 0.82 });
    const ckVelvetMat = new THREE.MeshStandardMaterial({ color: 0x9f7e69, roughness: 0.82 });
    const ckMirrorMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.08, metalness: 0.92 });

    const cFloor = new THREE.Mesh(new THREE.BoxGeometry(15.06, 0.02, 34.0), ckFloorMat);
    cFloor.position.set(136.05, 0.065, 108.15);
    staticGroup.add(cFloor);

    const cInlay = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.014, 29.5), ckStoneMat);
    cInlay.position.set(136.05, 0.076, 106.5);
    staticGroup.add(cInlay);

    // Interior Walls & Warm 34m Gallery Cove Ceiling
    const cBackWall = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 5.2), ckCreamWallMat);
    cBackWall.rotation.y = Math.PI;
    cBackWall.position.set(136.05, 2.66, 125.12);
    staticGroup.add(cBackWall);

    [128.52, 143.58].forEach((wx, idx) => {
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(33.7, 5.2), ckCreamWallMat);
      sideWall.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
      sideWall.position.set(wx, 2.66, 108.25);
      staticGroup.add(sideWall);
    });

    const cCeiling = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 34.0), ckCreamWallMat);
    cCeiling.rotation.x = Math.PI / 2;
    cCeiling.position.set(136.05, 5.25, 108.15);
    staticGroup.add(cCeiling);

    [131.5, 136.05, 140.6].forEach((lx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 31.6), warmLedGlowMat);
      strip.position.set(lx, 5.22, 108.15);
      staticGroup.add(strip);
    });

    // Architectural Dark-Bronze & Champagne-Gold Portal at Z = 91.15 (Inset 4cm from piers; Doorway X = 133.2..138.9)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(15.02, 2.12, 0.42), ckCharcoalMat);
    portalHeader.position.set(136.05, 4.31, 91.15);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.12, 0.46), ckGoldMat);
    portalTrim.position.set(136.05, 3.24, 91.15);
    staticGroup.add(portalTrim);

    const ckFasciaTex = createCnkFasciaTex();
    const ckFasciaMat = new THREE.MeshStandardMaterial({ map: ckFasciaTex, emissive: 0xffffff, emissiveMap: ckFasciaTex, emissiveIntensity: 0.70 });
    neonMats.push(ckFasciaMat);
    const ckFascia = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.55), ckFasciaMat);
    ckFascia.rotation.y = Math.PI;
    ckFascia.position.set(136.05, 4.31, 90.92);
    staticGroup.add(ckFascia);

    const ckMonoTex = createCnkMonogramTex();
    const ckMonoMat = new THREE.MeshStandardMaterial({ map: ckMonoTex, emissive: 0xffffff, emissiveMap: ckMonoTex, emissiveIntensity: 0.52 });
    neonMats.push(ckMonoMat);
    [130.1, 142.0].forEach((px) => {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 1.48), ckMonoMat);
      plaque.rotation.y = Math.PI;
      plaque.position.set(px, 4.31, 90.92);
      staticGroup.add(plaque);
    });

    const bagLeatherMats = [
      new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.35 }),
      new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.40 }),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.38 }),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.38 }),
      new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.42 }),
    ];

    const addHandbagProp = (bx: number, by: number, bz: number, matIdx: number) => {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.13), bagLeatherMats[matIdx % bagLeatherMats.length]);
      bag.position.set(bx, by + 0.10, bz);
      staticGroup.add(bag);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 12, Math.PI), ckGoldMat);
      handle.position.set(bx, by + 0.20, bz);
      staticGroup.add(handle);
    };

    // Flanking Luxury Display Windows (X=128.5..133.2 & X=138.9..143.6)
    [
      { x: 130.85, w: 4.54, postX: 133.16, title: 'SCULPTURAL BAGS', sub: 'FALL / WINTER COLLECTION' },
      { x: 141.25, w: 4.54, postX: 138.94, title: 'SIGNATURE HEELS', sub: 'MINIMALIST LUXURY' },
    ].forEach((win, wIdx) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(win.w, 0.42, 0.95), ckStoneMat);
      plinth.position.set(win.x, 0.28, 91.55);
      staticGroup.add(plinth);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(win.w, 2.95), atriumGlassMat);
      glassPane.rotation.y = Math.PI;
      glassPane.position.set(win.x, 1.78, 90.98);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.22, 0.16), ckCharcoalMat);
      postInner.position.set(win.postX, 1.64, 91.15);
      staticGroup.add(postInner);

      [-1.0, 0.0, 1.0].forEach((dx, bIdx) => {
        addHandbagProp(win.x + dx, 0.50, 91.55, wIdx * 2 + bIdx);
      });

      const pTex = createFashionPromoPosterTex('CHARLES & KEITH', win.title, win.sub, '#181412', '#c8a258', '#faf7f2');
      const pMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.48 });
      neonMats.push(pMat);
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), pMat);
      poster.rotation.y = Math.PI;
      poster.position.set(win.x, 2.35, 91.16);
      staticGroup.add(poster);
    });

    // ZONE 1: Twin Front Travertine & Brass Hero Handbag Pedestals (X=132.5 & 139.6, Z=95.4)
    [132.5, 139.6].forEach((px, pIdx) => {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.84, 1.3), ckStoneMat);
      ped.position.set(px, 0.49, 95.4);
      staticGroup.add(ped);
      const brassRim = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.05, 1.36), ckGoldMat);
      brassRim.position.set(px, 0.92, 95.4);
      staticGroup.add(brassRim);
      [-0.68, 0, 0.68].forEach((dx, bIdx) => {
        addHandbagProp(px + dx, 0.95, 95.4, pIdx + bIdx);
      });
    });

    // ZONE 2: Expanded 23.8m Backlit Handbag & Heel Perimeter Wall Alcoves (West X=128.88 & East X=143.22, Z=94.0..117.8)
    [
      { x: 128.88, shelfX: 129.02, rotY: Math.PI / 2 },
      { x: 143.22, shelfX: 143.08, rotY: -Math.PI / 2 },
    ].forEach((side, sIdx) => {
      const backing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.2, 23.8), ckCharcoalMat);
      backing.position.set(side.x, 1.67, 105.9);
      staticGroup.add(backing);
      [0.65, 1.25, 1.85, 2.45].forEach((sy, rIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 23.4), ckGoldMat);
        shelf.position.set(side.shelfX, sy, 105.9);
        staticGroup.add(shelf);
        for (let bz = 94.7; bz <= 117.3; bz += 0.90) {
          addHandbagProp(side.shelfX, sy + 0.02, bz, rIdx + sIdx + Math.round(bz));
        }
      });
      [99.8, 113.5].forEach((mz) => {
        const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), ckMirrorMat);
        mirror.rotation.y = side.rotY;
        mirror.position.set(side.x + (sIdx === 0 ? 0.24 : -0.24), 1.45, mz);
        staticGroup.add(mirror);
      });
    });

    // ZONE 3: Mid Footwear Lounge — Velvet Try-On Bench (X=136.05, Z=100.8) & Twin Heel Display Towers (X=132.2 & 139.9)
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.42, 1.15), ckVelvetMat);
    benchSeat.position.set(136.05, 0.36, 100.8);
    staticGroup.add(benchSeat);
    const benchBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 1.0), ckGoldMat);
    benchBase.position.set(136.05, 0.14, 100.8);
    staticGroup.add(benchBase);

    [132.2, 139.9].forEach((tx, tIdx) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.15, 1.2), ckStoneMat);
      tower.position.set(tx, 0.65, 100.8);
      staticGroup.add(tower);
      [-0.5, 0, 0.5].forEach((dx, hIdx) => {
        const heel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.28), bagLeatherMats[(tIdx + hIdx) % bagLeatherMats.length]);
        heel.position.set(tx + dx, 1.30, 100.8);
        staticGroup.add(heel);
      });
    });

    // ZONE 4 (Deep Expansion Z=107.8..115.6): Luxury Atelier Islands & VIP Velvet Try-On Salon
    [
      { x: 132.3, title: 'ATELIER BAGS', sub: 'ITALIAN CALFSKIN EDITS' },
      { x: 139.8, title: 'LOAFERS & BOOTS', sub: 'SCULPTURAL FOOTWEAR' },
    ].forEach((isl, iIdx) => {
      const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.88, 1.4), ckStoneMat);
      ped.position.set(isl.x, 0.51, 107.8);
      staticGroup.add(ped);
      const brassRim = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.05, 1.46), ckGoldMat);
      brassRim.position.set(isl.x, 0.96, 107.8);
      staticGroup.add(brassRim);
      [-0.78, 0, 0.78].forEach((dx, bIdx) => {
        addHandbagProp(isl.x + dx, 0.99, 107.8, iIdx + bIdx + 1);
      });
      const bTex = createAeonDepartmentSignTex(isl.title, isl.sub, '#181412', '#e5c17c');
      const bMat = new THREE.MeshStandardMaterial({ map: bTex, emissive: 0xffffff, emissiveMap: bTex, emissiveIntensity: 0.45 });
      neonMats.push(bMat);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), bMat);
      banner.rotation.y = Math.PI;
      banner.position.set(isl.x, 3.48, 107.8);
      staticGroup.add(banner);
    });

    const vipSofaSeat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.44, 1.25), ckVelvetMat);
    vipSofaSeat.position.set(136.05, 0.37, 114.6);
    staticGroup.add(vipSofaSeat);
    const vipSofaBase = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.14, 1.10), ckGoldMat);
    vipSofaBase.position.set(136.05, 0.14, 114.6);
    staticGroup.add(vipSofaBase);

    [131.8, 140.3].forEach((tx, tIdx) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.18, 1.2), ckCharcoalMat);
      tower.position.set(tx, 0.66, 114.6);
      staticGroup.add(tower);
      const capGold = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.05, 1.24), ckGoldMat);
      capGold.position.set(tx, 1.26, 114.6);
      staticGroup.add(capGold);
      [-0.45, 0.45].forEach((dx, hIdx) => {
        addHandbagProp(tx + dx, 1.29, 114.6, tIdx + hIdx);
      });
    });

    // ZONE 5 (Deep Rear Z=121..125): Styling Alcove (X=129.0..132.3), Fluted Champagne Cashdesk (X=136.05, Z=122.6) & Marquee
    const styleWall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.75, 0.14), ckCharcoalMat);
    styleWall.position.set(130.6, 1.44, 121.4);
    staticGroup.add(styleWall);
    const styleCurtain = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.45, 0.08), ckVelvetMat);
    styleCurtain.position.set(130.6, 1.30, 121.34);
    staticGroup.add(styleCurtain);

    const ckDesk = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.02, 0.96), ckStoneMat);
    ckDesk.position.set(136.05, 0.58, 122.6);
    staticGroup.add(ckDesk);
    const ckDeskBrass = new THREE.Mesh(new THREE.BoxGeometry(5.46, 0.08, 1.02), ckGoldMat);
    ckDeskBrass.position.set(136.05, 1.12, 122.6);
    staticGroup.add(ckDeskBrass);
    [134.5, 136.05, 137.6].forEach((px) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.18), ckCharcoalMat);
      pos.position.set(px, 1.28, 122.45);
      staticGroup.add(pos);
    });

    const ckBackSign = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.85), ckFasciaMat);
    ckBackSign.rotation.y = Math.PI;
    ckBackSign.position.set(136.05, 3.15, 125.04);
    staticGroup.add(ckBackSign);
  };
  buildCharlesKeithBoutique();

  // =========================================================================
  // 12. DEEP 32m FLOOR 2 SPORTSWEAR FLAGSHIPS: ADIDAS, NIKE & PUMA (X=144.0..176.2, Y=6.18..11.45)
  // =========================================================================
  const buildFloor2SportsFlagships = () => {
    const f2Y = 6.18;
    const sportStoreConfigs: Array<{
      brand: 'ADIDAS' | 'NIKE' | 'PUMA';
      badge: 'adidas' | 'nike' | 'puma';
      tagline: string;
      zStart: number;
      zEnd: number;
      floorHex: number;
      wallHex: number;
      accentHex: number;
      accentCss: string;
      bgCss: string;
      textCss: string;
      poster1: [string, string];
      poster2: [string, string];
      zone1Sign: [string, string];
      zone2Sign: [string, string];
      shoeWallTitle: string;
      kitColors: number[];
    }> = [
      {
        brand: 'ADIDAS',
        badge: 'adidas',
        tagline: 'ORIGINALS   •   RUNNING   •   FOOTBALL',
        zStart: 48.0,
        zEnd: 60.5,
        floorHex: 0xcbd5e1,
        wallHex: 0xdbe2ea,
        accentHex: 0x0284c7,
        accentCss: '#38bdf8',
        bgCss: '#09090b',
        textCss: '#ffffff',
        poster1: ['SAMBA OG', 'ORIGINALS ICON'],
        poster2: ['ULTRABOOST 5X', 'ENERGY RETURN'],
        zone1Sign: ['ADIDAS ORIGINALS', 'SAMBA • GAZELLE • STAN SMITH'],
        zone2Sign: ['ADIDAS FOOTBALL', 'PREDATOR & F50 PITCH LAB'],
        shoeWallTitle: 'ADIDAS SNEAKER ARCHIVE',
        kitColors: [0x0f172a, 0x38bdf8, 0xe2e8f0, 0x1e3a8a],
      },
      {
        brand: 'NIKE',
        badge: 'nike',
        tagline: 'JUST DO IT.   •   AIR MAX   •   JORDAN',
        zStart: 61.8,
        zEnd: 74.3,
        floorHex: 0xd4cfc4,
        wallHex: 0xdedad2,
        accentHex: 0xea580c,
        accentCss: '#fb923c',
        bgCss: '#18181b',
        textCss: '#ffffff',
        poster1: ['AIR MAX DN', 'DYNAMIC AIR'],
        poster2: ['AIR JORDAN', 'BASKETBALL ARCHIVE'],
        zone1Sign: ['NIKE RISE LAB', 'AIR MAX • TECH FLEECE'],
        zone2Sign: ['JORDAN BRAND COURT', 'FLIGHT ARCHIVE & PEGASUS'],
        shoeWallTitle: 'NIKE & JORDAN WALL',
        kitColors: [0x18181b, 0xea580c, 0xe2e8f0, 0xdc2626],
      },
      {
        brand: 'PUMA',
        badge: 'puma',
        tagline: 'FOREVER. FASTER.   •   SPEEDCAT   •   NITRO',
        zStart: 75.6,
        zEnd: 88.1,
        floorHex: 0xc2beb9,
        wallHex: 0xd6d3d1,
        accentHex: 0xdc2626,
        accentCss: '#ef4444',
        bgCss: '#18181b',
        textCss: '#ffffff',
        poster1: ['SPEEDCAT OG', 'MOTORSPORT ICON'],
        poster2: ['DEVIATE NITRO', 'SPEED SERIES'],
        zone1Sign: ['PUMA NITRO', 'DEVIATE • PALERMO'],
        zone2Sign: ['PUMA MOTORSPORT', 'F1 PADDOCK & SPEEDCAT'],
        shoeWallTitle: 'PUMA SPEEDCAT WALL',
        kitColors: [0x18181b, 0xdc2626, 0xe2e8f0, 0xeab308],
      },
    ];

    const sChromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86, metalness: 0.12, envMapIntensity: 0 });
    const sDarkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88, metalness: 0.05, envMapIntensity: 0 });
    const sMannequinMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.88, metalness: 0.0, envMapIntensity: 0 });
    const sMirrorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86, metalness: 0.12, envMapIntensity: 0 });
    const sTurfMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9, metalness: 0.0, envMapIntensity: 0 });
    const sHardwoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.88, metalness: 0.0, envMapIntensity: 0 });
    const sTarmacMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9, metalness: 0.0, envMapIntensity: 0 });

    sportStoreConfigs.forEach((cfg, sIdx) => {
      const zMid = (cfg.zStart + cfg.zEnd) / 2;
      const doorHalfW = 2.6;
      const winW = (12.5 - doorHalfW * 2) / 2;

      const sFloorMat = new THREE.MeshStandardMaterial({ color: cfg.floorHex, roughness: 0.9, metalness: 0.0, envMapIntensity: 0 });
      const sWallMat = new THREE.MeshStandardMaterial({ color: cfg.wallHex, roughness: 0.92, metalness: 0.0, envMapIntensity: 0 });
      const sAccentMat = new THREE.MeshStandardMaterial({ color: cfg.accentHex, roughness: 0.88, metalness: 0.0, envMapIntensity: 0 });
      const sAccentGlowMat = new THREE.MeshStandardMaterial({
        color: cfg.accentHex,
        roughness: 0.88,
        metalness: 0.0,
        envMapIntensity: 0,
      });

      const kitMats = cfg.kitColors.map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.44 }));

      // 32.2m Deep Boutique Floor (Y = 6.255), Walls & Illuminated Architectural Ceiling
      const sFloor = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.02, 12.5), sFloorMat);
      sFloor.position.set(160.1, f2Y + 0.065, zMid);
      staticGroup.add(sFloor);

      // Signature Brand Center Runway / Stripe down 30m promenade
      const courtStripe = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.014, 1.8), sAccentMat);
      courtStripe.position.set(159.8, f2Y + 0.076, zMid);
      staticGroup.add(courtStripe);

      if (cfg.brand === 'ADIDAS') {
        [-1.15, 1.15].forEach((dz) => {
          const threeStripe = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.014, 0.26), kitMats[2]);
          threeStripe.position.set(159.8, f2Y + 0.077, zMid + dz);
          staticGroup.add(threeStripe);
        });
      }

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 5.2), sWallMat);
      backWall.rotation.y = -Math.PI / 2;
      backWall.position.set(176.12, f2Y + 2.62, zMid);
      staticGroup.add(backWall);

      [cfg.zStart + 0.02, cfg.zEnd - 0.02].forEach((sz, idx) => {
        const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 5.2), sWallMat);
        sideWall.rotation.y = idx === 0 ? 0 : Math.PI;
        sideWall.position.set(160.1, f2Y + 2.62, sz);
        staticGroup.add(sideWall);

        // Glowing Architectural Accent Ribbon along full 32m North & South walls
        const wallGlow = new THREE.Mesh(new THREE.BoxGeometry(31.4, 0.14, 0.02), sAccentGlowMat);
        wallGlow.position.set(160.1, f2Y + 3.65, sz + (idx === 0 ? 0.015 : -0.015));
        staticGroup.add(wallGlow);
      });

      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 12.5), sWallMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(160.1, f2Y + 5.20, zMid);
      staticGroup.add(ceiling);

      // Continuous 30m Linear LED Light Tracks + Transverse Architectural Louvers
      [-3.4, 0, 3.4].forEach((dz) => {
        const ledBar = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.06, 0.28), brightLedPanelMat);
        ledBar.position.set(160.2, f2Y + 5.17, zMid + dz);
        staticGroup.add(ledBar);
      });
      for (let bx = 147.0; bx <= 173.5; bx += 4.2) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 11.4), sDarkMat);
        louver.position.set(bx, f2Y + 5.12, zMid);
        staticGroup.add(louver);
      }

      // Grand Storefront Portal facing -X onto Floor 2 East Balcony (X = 144.0)
      const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.08, 12.42), sDarkMat);
      portalHeader.position.set(144.0, f2Y + 4.24, zMid);
      staticGroup.add(portalHeader);

      const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 12.42), sAccentGlowMat);
      portalTrim.position.set(144.0, f2Y + 3.18, zMid);
      staticGroup.add(portalTrim);

      // Vertical Glowing Portal Lightblades framing the 5.2m Flagship Entrance
      [-2.68, 2.68].forEach((dz) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.18, 0.14), sAccentGlowMat);
        blade.position.set(143.92, f2Y + 1.62, zMid + dz);
        staticGroup.add(blade);
      });

      const fTex = createSportsStoreFasciaTex(cfg.brand, cfg.tagline, cfg.bgCss, cfg.accentCss, cfg.textCss, cfg.badge);
      const fMat = new THREE.MeshStandardMaterial({ map: fTex, emissive: 0xffffff, emissiveMap: fTex, emissiveIntensity: 0.78 });
      neonMats.push(fMat);
      const fascia = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 1.58), fMat);
      fascia.rotation.y = -Math.PI / 2;
      fascia.position.set(143.76, f2Y + 4.24, zMid);
      staticGroup.add(fascia);

      // Flanking Panoramic Display Windows & Dressed Athletic Mannequins
      [
        { z: cfg.zStart + winW / 2, postZ: cfg.zStart + winW - 0.04, poster: cfg.poster1 },
        { z: cfg.zEnd - winW / 2, postZ: cfg.zEnd - winW + 0.04, poster: cfg.poster2 },
      ].forEach((win, wIdx) => {
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.36, winW - 0.12), sDarkMat);
        plinth.position.set(144.45, f2Y + 0.25, win.z);
        staticGroup.add(plinth);

        const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.12, 2.95), atriumGlassMat);
        glassPane.rotation.y = -Math.PI / 2;
        glassPane.position.set(143.84, f2Y + 1.78, win.z);
        staticGroup.add(glassPane);

        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.18, 0.16), sDarkMat);
        post.position.set(144.0, f2Y + 1.62, win.postZ);
        staticGroup.add(post);

        [-0.55, 0.55].forEach((dz, mIdx) => {
          const mz = win.z + dz;
          const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.88, 10), sMannequinMat);
          legs.position.set(144.45, f2Y + 0.86, mz);
          staticGroup.add(legs);
          const top = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.64, 0.42), kitMats[(wIdx + mIdx) % kitMats.length]);
          top.position.set(144.45, f2Y + 1.58, mz);
          staticGroup.add(top);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), sMannequinMat);
          head.position.set(144.45, f2Y + 2.04, mz);
          staticGroup.add(head);
        });

        const pTex = createFashionPromoPosterTex(cfg.brand, win.poster[0], win.poster[1], cfg.bgCss, cfg.accentCss, cfg.textCss);
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.54 });
        neonMats.push(pMat);
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), pMat);
        poster.rotation.y = -Math.PI / 2;
        poster.position.set(144.02, f2Y + 2.34, win.z + (wIdx === 0 ? -1.05 : 1.05));
        staticGroup.add(poster);
      });

      // ZONE 1 (Front X=146.2..153.5): Twin Stepped Launch Tables + Overhead Zone Banner + 24m Continuous Wall Apparel Racks
      [-3.05, 3.05].forEach((dz, tIdx) => {
        const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.78, 2.05), sDarkMat);
        tbl.position.set(147.2, f2Y + 0.46, zMid + dz);
        staticGroup.add(tbl);
        const tblRim = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.05, 2.10), sAccentMat);
        tblRim.position.set(147.2, f2Y + 0.86, zMid + dz);
        staticGroup.add(tblRim);
        [-0.5, 0.5].forEach((szOff, kIdx) => {
          for (let l = 0; l < 3; l++) {
            const stack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.38), kitMats[(tIdx + kIdx + l) % kitMats.length]);
            stack.position.set(147.0, f2Y + 0.92 + l * 0.075, zMid + dz + szOff);
            staticGroup.add(stack);
          }
          const shoeHero = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), kitMats[(kIdx + 1) % kitMats.length]);
          shoeHero.position.set(147.55, f2Y + 0.96, zMid + dz + szOff);
          staticGroup.add(shoeHero);
        });
      });

      const z1Tex = createAeonDepartmentSignTex(cfg.zone1Sign[0], cfg.zone1Sign[1], cfg.bgCss, cfg.accentCss);
      const z1Mat = new THREE.MeshStandardMaterial({ map: z1Tex, emissive: 0xffffff, emissiveMap: z1Tex, emissiveIntensity: 0.52 });
      neonMats.push(z1Mat);
      const z1Banner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.82), z1Mat);
      z1Banner.rotation.y = -Math.PI / 2;
      z1Banner.position.set(150.2, f2Y + 3.55, zMid);
      staticGroup.add(z1Banner);

      // Continuous 24m North & South Architectural Chrome Apparel Racks (X = 146.2..170.0)
      [cfg.zStart + 0.52, cfg.zEnd - 0.52].forEach((rz, rIdx) => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 23.6, 8), sChromeMat);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(158.1, f2Y + 1.82, rz);
        staticGroup.add(rail);
        const topShelf = new THREE.Mesh(new THREE.BoxGeometry(23.8, 0.06, 0.52), sDarkMat);
        topShelf.position.set(158.1, f2Y + 2.15, rz);
        staticGroup.add(topShelf);
        for (let gx = 146.5; gx <= 169.7; gx += 0.46) {
          const item = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.84, 0.38),
            kitMats[(rIdx + Math.round(gx * 2)) % kitMats.length]
          );
          item.position.set(gx, f2Y + 1.32, rz);
          staticGroup.add(item);
        }
      });

      // ZONE 2 (Mid-Store X=156.5..164.5): Signature Brand Hero Experience Pod + Twin Performance Gondolas
      const podPlatformMat =
        cfg.brand === 'ADIDAS' ? sTurfMat : cfg.brand === 'NIKE' ? sHardwoodMat : sTarmacMat;
      const heroPod = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.42, 3.0), sDarkMat);
      heroPod.position.set(158.2, f2Y + 0.28, zMid);
      staticGroup.add(heroPod);
      const heroSurface = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.06, 2.85), podPlatformMat);
      heroSurface.position.set(158.2, f2Y + 0.52, zMid);
      staticGroup.add(heroSurface);
      const heroRim = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.06, 3.06), sAccentGlowMat);
      heroRim.position.set(158.2, f2Y + 0.48, zMid);
      staticGroup.add(heroRim);

      if (cfg.brand === 'ADIDAS') {
        // Football Pitch Pedestal + Match Balls + Cleats Display
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), kitMats[2]);
        ball.position.set(158.2, f2Y + 0.80, zMid);
        staticGroup.add(ball);
        [-0.85, 0.85].forEach((dz, cIdx) => {
          const cleatPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.55), sChromeMat);
          cleatPlinth.position.set(158.2, f2Y + 0.72, zMid + dz);
          staticGroup.add(cleatPlinth);
          const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.22), kitMats[cIdx % kitMats.length]);
          cleat.position.set(158.2, f2Y + 0.98, zMid + dz);
          staticGroup.add(cleat);
        });
      } else if (cfg.brand === 'NIKE') {
        // Air Jordan Mini Hardwood Backboard & Flight Sneaker Plinths
        const hoopPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.85, 10), sDarkMat);
        hoopPost.position.set(158.9, f2Y + 1.45, zMid);
        staticGroup.add(hoopPost);
        const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 1.45), atriumGlassMat);
        backboard.position.set(158.75, f2Y + 2.15, zMid);
        staticGroup.add(backboard);
        const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 18), sAccentMat);
        rimRing.rotation.x = Math.PI / 2;
        rimRing.position.set(158.42, f2Y + 1.92, zMid);
        staticGroup.add(rimRing);
        [-0.75, 0.75].forEach((dz, jIdx) => {
          const jShoe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.20, 0.24), kitMats[jIdx % kitMats.length]);
          jShoe.position.set(157.8, f2Y + 0.68, zMid + dz);
          staticGroup.add(jShoe);
        });
      } else {
        // PUMA F1 Motorsport Nose-Cone Sculpture + Twin Racing Tires + Speedcat Display
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.32, 0.68), sAccentMat);
        chassis.position.set(158.2, f2Y + 0.78, zMid);
        staticGroup.add(chassis);
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.46), sDarkMat);
        cockpit.position.set(158.45, f2Y + 1.02, zMid);
        staticGroup.add(cockpit);
        [-0.58, 0.58].forEach((tz) => {
          [-0.65, 0.65].forEach((tx) => {
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 14), sDarkMat);
            tire.rotation.x = Math.PI / 2;
            tire.position.set(158.2 + tx, f2Y + 0.76, zMid + tz);
            staticGroup.add(tire);
          });
        });
      }

      const z2Tex = createAeonDepartmentSignTex(cfg.zone2Sign[0], cfg.zone2Sign[1], cfg.bgCss, cfg.accentCss);
      const z2Mat = new THREE.MeshStandardMaterial({ map: z2Tex, emissive: 0xffffff, emissiveMap: z2Tex, emissiveIntensity: 0.56 });
      neonMats.push(z2Mat);
      const z2Banner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.82), z2Mat);
      z2Banner.rotation.y = -Math.PI / 2;
      z2Banner.position.set(158.2, f2Y + 3.55, zMid);
      staticGroup.add(z2Banner);

      // Twin Mid-Store Performance Apparel & Shoe Gondolas (X = 162.5, Z = zMid ± 3.0)
      [-3.0, 3.0].forEach((dz, gIdx) => {
        const gond = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.74, 1.45), sDarkMat);
        gond.position.set(162.5, f2Y + 0.44, zMid + dz);
        staticGroup.add(gond);
        const gTrim = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.05, 1.50), sAccentMat);
        gTrim.position.set(162.5, f2Y + 0.83, zMid + dz);
        staticGroup.add(gTrim);
        const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), sChromeMat);
        railBar.rotation.z = Math.PI / 2;
        railBar.position.set(162.5, f2Y + 1.72, zMid + dz);
        staticGroup.add(railBar);
        for (let gx = 161.55; gx <= 163.45; gx += 0.38) {
          const jersey = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.34), kitMats[(gIdx + Math.round(gx)) % kitMats.length]);
          jersey.position.set(gx, f2Y + 1.30, zMid + dz);
          staticGroup.add(jersey);
        }
      });

      // ZONE 3 (Deep Rear X=167.0..176.1): Try-On Bench + Full-Length Mirror + Fitting Cabins + 2-POS Cashdesk + 7.4m Sneaker Archive Wall
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 2.9), sDarkMat);
      bench.position.set(167.8, f2Y + 0.29, zMid);
      staticGroup.add(bench);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.10, 2.8), sAccentMat);
      cushion.position.set(167.8, f2Y + 0.54, zMid);
      staticGroup.add(cushion);

      // North-East Fitting Cabins (X = 171.2..175.8, Z = zStart..zStart+3.1) + Mirror
      const fitWall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.75, 0.14), sDarkMat);
      fitWall.position.set(173.4, f2Y + 1.44, cfg.zStart + 3.05);
      staticGroup.add(fitWall);
      [171.8, 173.1, 174.4].forEach((fx) => {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.42, 0.08), sAccentMat);
        door.position.set(fx, f2Y + 1.28, cfg.zStart + 3.11);
        staticGroup.add(door);
      });
      const fitMirror = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.35), sMirrorMat);
      fitMirror.rotation.y = -Math.PI / 2;
      fitMirror.position.set(171.16, f2Y + 1.38, cfg.zStart + 1.55);
      staticGroup.add(fitMirror);

      // South-East Sleek 2-POS Checkout Counter (X = 173.4, Z = zEnd - 2.45)
      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.02, 3.2), sDarkMat);
      desk.position.set(173.4, f2Y + 0.58, cfg.zEnd - 2.45);
      staticGroup.add(desk);
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.07, 3.3), sChromeMat);
      deskTop.position.set(173.4, f2Y + 1.12, cfg.zEnd - 2.45);
      staticGroup.add(deskTop);
      const deskGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 3.22), sAccentGlowMat);
      deskGlow.position.set(172.89, f2Y + 0.96, cfg.zEnd - 2.45);
      staticGroup.add(deskGlow);
      [-0.75, 0.75].forEach((pz) => {
        const pos = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.34), kitMats[2]);
        pos.position.set(173.22, f2Y + 1.28, cfg.zEnd - 2.45 + pz);
        staticGroup.add(pos);
      });

      // Monumental 7.4m Backlit Sneaker Archive Wall (X = 175.75, zMid - 3.6 .. zMid + 3.6)
      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 3.35, 7.4), sDarkMat);
      wallBack.position.set(175.82, f2Y + 1.74, zMid);
      staticGroup.add(wallBack);
      [0.62, 1.18, 1.74, 2.30, 2.86].forEach((sy, rIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 7.1), sAccentGlowMat);
        shelf.position.set(175.64, f2Y + sy, zMid);
        staticGroup.add(shelf);
        for (let sz = zMid - 3.15; sz <= zMid + 3.2; sz += 0.70) {
          const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.22), kitMats[(rIdx + Math.round(sz)) % kitMats.length]);
          shoe.position.set(175.58, f2Y + sy + 0.095, sz);
          staticGroup.add(shoe);
        }
      });

      const swTex = createAeonDepartmentSignTex(cfg.shoeWallTitle, cfg.brand + ' PERFORMANCE FLAGSHIP', cfg.bgCss, cfg.accentCss);
      const swMat = new THREE.MeshStandardMaterial({ map: swTex, emissive: 0xffffff, emissiveMap: swTex, emissiveIntensity: 0.62 });
      neonMats.push(swMat);
      const swHeader = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.92), swMat);
      swHeader.rotation.y = -Math.PI / 2;
      swHeader.position.set(175.50, f2Y + 3.92, zMid);
      staticGroup.add(swHeader);
    });
  };
  buildFloor2SportsFlagships();

  // =========================================================================
  // 13. FLOOR 2 WEST WING FLAGSHIPS: MUJI, LOCK&LOCK & LEVI'S (X=99.65..112.0, Y=6.18..11.45)
  // =========================================================================
  const buildFloor2WestFlagships = () => {
    const f2Y = 6.18;
    const wWoodFloorTex = createUniqloWoodFloorTex();
    wWoodFloorTex.repeat.set(5, 5);
    const wOakFloorMat = new THREE.MeshStandardMaterial({ map: wWoodFloorTex, roughness: 0.9, metalness: 0.0, envMapIntensity: 0 });
    const wChromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86, metalness: 0.12, envMapIntensity: 0 });
    const wDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.05, envMapIntensity: 0 });
    const wOakMat = new THREE.MeshStandardMaterial({ color: 0xc29b70, roughness: 0.9, metalness: 0.0, envMapIntensity: 0 });
    const wMannequinMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.88, metalness: 0.0, envMapIntensity: 0 });
    const wMirrorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86, metalness: 0.12, envMapIntensity: 0 });

    const westConfigs: Array<{
      brand: 'MUJI' | 'LOCK&LOCK' | 'LEVI’S';
      badge: 'muji' | 'locknlock' | 'levis';
      tagline: string;
      zStart: number;
      zEnd: number;
      useWoodFloor: boolean;
      floorHex: number;
      wallHex: number;
      accentHex: number;
      accentCss: string;
      bgCss: string;
      textCss: string;
      poster1: [string, string];
      poster2: [string, string];
      centerSign: [string, string];
      backWallTitle: string;
      itemColors: number[];
    }> = [
      {
        brand: 'MUJI',
        badge: 'muji',
        tagline: '無印良品   •   HOMEWARE   •   APPAREL',
        zStart: 48.0,
        zEnd: 60.5,
        useWoodFloor: true,
        floorHex: 0xc29b70,
        wallHex: 0xe3dcd0,
        accentHex: 0x7f1d1d,
        accentCss: '#991b1b',
        bgCss: '#ebe5da',
        textCss: '#1c1917',
        poster1: ['MUJI LINEN', 'JAPANESE ESSENTIALS'],
        poster2: ['AROMA DIFFUSER', 'CALM HOME LIVING'],
        centerSign: ['MUJI STATIONERY', 'STORAGE & AROMA LAB'],
        backWallTitle: 'MUJI HOME & STORAGE',
        itemColors: [0xdcd7cf, 0xc29b70, 0x7f1d1d, 0x78716c],
      },
      {
        brand: 'LOCK&LOCK',
        badge: 'locknlock',
        tagline: 'SMART LIVING   •   TUMBLERS   •   KITCHEN',
        zStart: 61.8,
        zEnd: 74.3,
        useWoodFloor: false,
        floorHex: 0xcbd5e1,
        wallHex: 0xdce2e9,
        accentHex: 0x2563eb,
        accentCss: '#38bdf8',
        bgCss: '#0f172a',
        textCss: '#ffffff',
        poster1: ['METRO TUMBLER', 'THERMAL SERIES'],
        poster2: ['SMART KITCHEN', 'AIR FRYER & GLASS'],
        centerSign: ['LOCK&LOCK KITCHEN', 'APPLIANCES & COOKWARE'],
        backWallTitle: 'METRO TUMBLER BAR',
        itemColors: [0x38bdf8, 0xfb7185, 0x1e3a8a, 0xe2e8f0],
      },
      {
        brand: 'LEVI’S',
        badge: 'levis',
        tagline: '501® ORIGINAL   •   DENIM   •   TRUCKER',
        zStart: 75.6,
        zEnd: 88.1,
        useWoodFloor: false,
        floorHex: 0x855834,
        wallHex: 0xded8cc,
        accentHex: 0xb91c1c,
        accentCss: '#ef4444',
        bgCss: '#18181b',
        textCss: '#ffffff',
        poster1: ['501® ORIGINAL', 'SINCE 1873 ICON'],
        poster2: ['TRUCKER JACKET', 'SELVEDGE DENIM'],
        centerSign: ['LEVI’S TAILOR SHOP', 'CUSTOM PATCHES & FIT'],
        backWallTitle: '501® DENIM ARCHIVE',
        itemColors: [0x1e3a8a, 0x3b82f6, 0x18181b, 0x991b1b],
      },
    ];

    westConfigs.forEach((cfg, wIdx) => {
      const zMid = (cfg.zStart + cfg.zEnd) / 2;
      const doorHalfW = 2.6;
      const winW = (12.5 - doorHalfW * 2) / 2;

      const sFloorMat = cfg.useWoodFloor
        ? wOakFloorMat
        : new THREE.MeshStandardMaterial({ color: cfg.floorHex, roughness: 0.9, metalness: 0.0, envMapIntensity: 0 });
      const sWallMat = new THREE.MeshStandardMaterial({ color: cfg.wallHex, roughness: 0.92, metalness: 0.0, envMapIntensity: 0 });
      const sAccentMat = new THREE.MeshStandardMaterial({ color: cfg.accentHex, roughness: 0.88, metalness: 0.0, envMapIntensity: 0 });
      const sAccentGlowMat = new THREE.MeshStandardMaterial({
        color: cfg.accentHex,
        roughness: 0.88,
        metalness: 0.0,
        envMapIntensity: 0,
      });
      const fixMat = cfg.badge === 'muji' ? wOakMat : wDarkMat;
      const itemMats = cfg.itemColors.map((hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.44 }));

      // Floor slab (Y = 6.255), Back Wall (X = 99.68), Side Walls & Ceiling
      const wFloor = new THREE.Mesh(new THREE.BoxGeometry(12.35, 0.02, 12.5), sFloorMat);
      wFloor.position.set(105.825, f2Y + 0.065, zMid);
      staticGroup.add(wFloor);

      const runner = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.014, 1.9), sAccentMat);
      runner.position.set(106.0, f2Y + 0.076, zMid);
      staticGroup.add(runner);

      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 5.2), sWallMat);
      backWall.rotation.y = Math.PI / 2;
      backWall.position.set(99.68, f2Y + 2.62, zMid);
      staticGroup.add(backWall);

      [cfg.zStart + 0.02, cfg.zEnd - 0.02].forEach((sz, idx) => {
        const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(12.35, 5.2), sWallMat);
        sideWall.rotation.y = idx === 0 ? 0 : Math.PI;
        sideWall.position.set(105.825, f2Y + 2.62, sz);
        staticGroup.add(sideWall);

        const wallStripe = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.12, 0.02), sAccentGlowMat);
        wallStripe.position.set(105.825, f2Y + 3.62, sz + (idx === 0 ? 0.015 : -0.015));
        staticGroup.add(wallStripe);
      });

      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12.35, 12.5), sWallMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(105.825, f2Y + 5.20, zMid);
      staticGroup.add(ceiling);

      [-3.4, 0, 3.4].forEach((dz) => {
        const ledBar = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.06, 0.26), brightLedPanelMat);
        ledBar.position.set(105.8, f2Y + 5.17, zMid + dz);
        staticGroup.add(ledBar);
      });

      // Storefront Portal facing +X onto Floor 2 West Balcony (X = 112.0)
      const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.08, 12.42), fixMat);
      portalHeader.position.set(112.0, f2Y + 4.24, zMid);
      staticGroup.add(portalHeader);

      const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 12.42), sAccentGlowMat);
      portalTrim.position.set(112.0, f2Y + 3.18, zMid);
      staticGroup.add(portalTrim);

      [-2.68, 2.68].forEach((dz) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.18, 0.14), sAccentGlowMat);
        blade.position.set(112.08, f2Y + 1.62, zMid + dz);
        staticGroup.add(blade);
      });

      const fTex = createWestLifestyleFasciaTex(cfg.brand, cfg.tagline, cfg.bgCss, cfg.accentCss, cfg.textCss, cfg.badge);
      const fMat = new THREE.MeshStandardMaterial({ map: fTex, emissive: 0xffffff, emissiveMap: fTex, emissiveIntensity: 0.78 });
      neonMats.push(fMat);
      const fascia = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.56), fMat);
      fascia.rotation.y = Math.PI / 2;
      fascia.position.set(112.24, f2Y + 4.24, zMid);
      staticGroup.add(fascia);

      // Flanking Panoramic Display Windows facing East (+X)
      [
        { z: cfg.zStart + winW / 2, postZ: cfg.zStart + winW - 0.04, poster: cfg.poster1 },
        { z: cfg.zEnd - winW / 2, postZ: cfg.zEnd - winW + 0.04, poster: cfg.poster2 },
      ].forEach((win, pIdx) => {
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.36, winW - 0.12), fixMat);
        plinth.position.set(111.55, f2Y + 0.25, win.z);
        staticGroup.add(plinth);

        const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.12, 2.95), atriumGlassMat);
        glassPane.rotation.y = Math.PI / 2;
        glassPane.position.set(112.16, f2Y + 1.78, win.z);
        staticGroup.add(glassPane);

        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.18, 0.16), fixMat);
        post.position.set(112.0, f2Y + 1.62, win.postZ);
        staticGroup.add(post);

        if (cfg.badge === 'locknlock') {
          // Display colorful insulated Metro Tumblers & appliance pedestal in window
          [-0.65, 0, 0.65].forEach((dz, tIdx) => {
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.42, 12), itemMats[(pIdx + tIdx) % itemMats.length]);
            cup.position.set(111.55, f2Y + 0.64, win.z + dz);
            staticGroup.add(cup);
          });
        } else {
          // Minimalist MUJI linen / Levi's denim mannequin
          const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.88, 10), wMannequinMat);
          legs.position.set(111.55, f2Y + 0.86, win.z);
          staticGroup.add(legs);
          const top = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.64, 0.42), itemMats[(wIdx + pIdx) % itemMats.length]);
          top.position.set(111.55, f2Y + 1.58, win.z);
          staticGroup.add(top);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), wMannequinMat);
          head.position.set(111.55, f2Y + 2.04, win.z);
          staticGroup.add(head);
        }

        const pTex = createFashionPromoPosterTex(cfg.brand, win.poster[0], win.poster[1], cfg.bgCss, cfg.accentCss, cfg.textCss);
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, emissive: 0xffffff, emissiveMap: pTex, emissiveIntensity: 0.54 });
        neonMats.push(pMat);
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), pMat);
        poster.rotation.y = Math.PI / 2;
        poster.position.set(111.98, f2Y + 2.34, win.z + (pIdx === 0 ? -1.0 : 1.0));
        staticGroup.add(poster);
      });

      // Twin Front Feature Tables (X = 109.15)
      [-3.05, 3.05].forEach((dz, tIdx) => {
        const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.78, 1.95), fixMat);
        tbl.position.set(109.15, f2Y + 0.46, zMid + dz);
        staticGroup.add(tbl);
        const tblRim = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 2.0), sAccentMat);
        tblRim.position.set(109.15, f2Y + 0.86, zMid + dz);
        staticGroup.add(tblRim);
        [-0.48, 0.48].forEach((szOff, kIdx) => {
          if (cfg.badge === 'locknlock') {
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.38), itemMats[(tIdx + kIdx) % itemMats.length]);
            box.position.set(109.15, f2Y + 1.04, zMid + dz + szOff);
            staticGroup.add(box);
          } else {
            for (let l = 0; l < 3; l++) {
              const fold = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.38), itemMats[(tIdx + kIdx + l) % itemMats.length]);
              fold.position.set(109.15, f2Y + 0.92 + l * 0.075, zMid + dz + szOff);
              staticGroup.add(fold);
            }
          }
        });
      });

      // Side Wall Shelving & Chrome Racks along North & South Interior Walls
      [cfg.zStart + 0.48, cfg.zEnd - 0.48].forEach((rz, rIdx) => {
        const shelfTop = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.06, 0.50), fixMat);
        shelfTop.position.set(106.1, f2Y + 2.05, rz);
        staticGroup.add(shelfTop);
        if (cfg.badge === 'levis') {
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 7.0, 8), wChromeMat);
          rail.rotation.z = Math.PI / 2;
          rail.position.set(106.1, f2Y + 1.72, rz);
          staticGroup.add(rail);
          for (let gx = 102.9; gx <= 109.3; gx += 0.50) {
            const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.36), itemMats[(rIdx + Math.round(gx)) % itemMats.length]);
            jacket.position.set(gx, f2Y + 1.26, rz);
            staticGroup.add(jacket);
          }
        } else {
          [0.75, 1.38].forEach((sy, lIdx) => {
            const plank = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.05, 0.48), fixMat);
            plank.position.set(106.1, f2Y + sy, rz);
            staticGroup.add(plank);
            for (let gx = 103.0; gx <= 109.2; gx += 0.62) {
              const item = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.30), itemMats[(rIdx + lIdx + Math.round(gx)) % itemMats.length]);
              item.position.set(gx, f2Y + sy + 0.16, rz);
              staticGroup.add(item);
            }
          });
        }
      });

      // Center Brand Hero Experience Island (X = 105.2, zMid)
      const island = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.68, 2.5), fixMat);
      island.position.set(105.2, f2Y + 0.41, zMid);
      staticGroup.add(island);
      const islandRim = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.06, 2.56), sAccentMat);
      islandRim.position.set(105.2, f2Y + 0.78, zMid);
      staticGroup.add(islandRim);
      [-0.65, 0.65].forEach((dz, iIdx) => {
        const heroProp =
          cfg.badge === 'locknlock'
            ? new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.36, 12), itemMats[(wIdx + iIdx) % itemMats.length])
            : new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.20, 0.32), itemMats[(wIdx + iIdx) % itemMats.length]);
        heroProp.position.set(105.2, f2Y + 0.94, zMid + dz);
        staticGroup.add(heroProp);
      });

      const cTex = createAeonDepartmentSignTex(cfg.centerSign[0], cfg.centerSign[1], cfg.bgCss, cfg.accentCss);
      const cMat = new THREE.MeshStandardMaterial({ map: cTex, emissive: 0xffffff, emissiveMap: cTex, emissiveIntensity: 0.52 });
      neonMats.push(cMat);
      const cBanner = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.72), cMat);
      cBanner.rotation.y = Math.PI / 2;
      cBanner.position.set(105.2, f2Y + 3.45, zMid);
      staticGroup.add(cBanner);

      // Rear Backlit Showcase Wall (X = 100.1, zMid-2.5 .. zMid+2.5)
      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 3.25, 5.2), fixMat);
      wallBack.position.set(100.02, f2Y + 1.70, zMid);
      staticGroup.add(wallBack);
      [0.65, 1.25, 1.85, 2.45].forEach((sy, rIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 5.0), sAccentGlowMat);
        shelf.position.set(100.20, f2Y + sy, zMid);
        staticGroup.add(shelf);
        for (let sz = zMid - 2.1; sz <= zMid + 2.15; sz += 0.68) {
          const prop =
            cfg.badge === 'locknlock'
              ? new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.26, 10), itemMats[(rIdx + Math.round(sz)) % itemMats.length])
              : new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.36), itemMats[(rIdx + Math.round(sz)) % itemMats.length]);
          prop.position.set(100.24, f2Y + sy + 0.14, sz);
          staticGroup.add(prop);
        }
      });

      const swTex = createAeonDepartmentSignTex(cfg.backWallTitle, cfg.brand + ' FLAGSHIP', cfg.bgCss, cfg.accentCss);
      const swMat = new THREE.MeshStandardMaterial({ map: swTex, emissive: 0xffffff, emissiveMap: swTex, emissiveIntensity: 0.60 });
      neonMats.push(swMat);
      const swHeader = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.80), swMat);
      swHeader.rotation.y = Math.PI / 2;
      swHeader.position.set(100.34, f2Y + 3.76, zMid);
      staticGroup.add(swHeader);

      // North-West Fitting / Consultation Alcove + South-West 2-POS Checkout Counter
      const fitWall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.65, 0.14), fixMat);
      fitWall.position.set(101.15, f2Y + 1.40, cfg.zStart + 2.65);
      staticGroup.add(fitWall);
      [100.6, 101.9].forEach((fx) => {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.35, 0.08), sAccentMat);
        door.position.set(fx, f2Y + 1.25, cfg.zStart + 2.71);
        staticGroup.add(door);
      });
      const alcMirror = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.25), wMirrorMat);
      alcMirror.rotation.y = Math.PI / 2;
      alcMirror.position.set(102.58, f2Y + 1.32, cfg.zStart + 1.35);
      staticGroup.add(alcMirror);

      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.02, 2.8), fixMat);
      desk.position.set(102.25, f2Y + 0.58, cfg.zEnd - 2.05);
      staticGroup.add(desk);
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.07, 2.9), wChromeMat);
      deskTop.position.set(102.25, f2Y + 1.12, cfg.zEnd - 2.05);
      staticGroup.add(deskTop);
      const deskGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 2.82), sAccentGlowMat);
      deskGlow.position.set(102.74, f2Y + 0.96, cfg.zEnd - 2.05);
      staticGroup.add(deskGlow);
      [-0.65, 0.65].forEach((pz) => {
        const pos = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.34), wDarkMat);
        pos.position.set(102.40, f2Y + 1.28, cfg.zEnd - 2.05 + pz);
        staticGroup.add(pos);
      });
    });
  };
  buildFloor2WestFlagships();

  // =========================================================================
  // 14. FLOOR 2 SOUTH WING FLAGSHIP 1: TOMMY HILFIGER (X=112.4..127.5, Z=91.15..125.15, Y=6.18..11.45)
  // =========================================================================
  const buildFloor2TommyHilfigerBoutique = () => {
    const f2Y = 6.18;
    const thFloorTex = createTommyFloorTex();
    const thFloorMat = new THREE.MeshStandardMaterial({ map: thFloorTex, roughness: 0.9 });
    const thCreamMat = new THREE.MeshStandardMaterial({ color: 0xdfd8cd, roughness: 0.92 });
    const thNavyMat = new THREE.MeshStandardMaterial({ color: 0x0c1b33, roughness: 0.88 });
    const thRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.88 });
    const thBrassMat = new THREE.MeshStandardMaterial({ color: 0xb89b5e, roughness: 0.86, metalness: 0.1 });
    const thOakMat = new THREE.MeshStandardMaterial({ color: 0x9c734b, roughness: 0.9 });
    const thDenimMat = new THREE.MeshStandardMaterial({ color: 0x1d3f72, roughness: 0.9 });
    const thKhakiMat = new THREE.MeshStandardMaterial({ color: 0xc8b48e, roughness: 0.9 });
    const thMannequinMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c7, roughness: 0.88 });

    const thPalette = [thNavyMat, thCreamMat, thRedMat, thDenimMat, thKhakiMat];

    // Walkable Floor, Walls & Recessed Architectural Ceiling
    const tFloor = new THREE.Mesh(new THREE.BoxGeometry(15.06, 0.02, 34.0), thFloorMat);
    tFloor.position.set(119.95, f2Y + 0.065, 108.15);
    staticGroup.add(tFloor);

    // Classic Tommy Tri-Stripe Center Promenade Runner (Navy-White-Crimson)
    const runnerNavy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.014, 29.2), thNavyMat);
    runnerNavy.position.set(118.9, f2Y + 0.076, 106.5);
    staticGroup.add(runnerNavy);
    const runnerWhite = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.016, 29.0), thCreamMat);
    runnerWhite.position.set(118.6, f2Y + 0.077, 106.5);
    staticGroup.add(runnerWhite);
    const runnerRed = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.016, 29.0), thRedMat);
    runnerRed.position.set(119.2, f2Y + 0.077, 106.5);
    staticGroup.add(runnerRed);

    const tBackWall = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 5.2), thNavyMat);
    tBackWall.rotation.y = Math.PI;
    tBackWall.position.set(119.95, f2Y + 2.66, 125.12);
    staticGroup.add(tBackWall);

    [112.42, 127.48].forEach((wx, idx) => {
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(33.7, 5.2), thCreamMat);
      sideWall.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
      sideWall.position.set(wx, f2Y + 2.66, 108.25);
      staticGroup.add(sideWall);

      // Navy Wainscoting Rail & Crimson Heritage Trim along both 33.7m walls
      const wainscot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 33.2), thNavyMat);
      wainscot.position.set(wx + (idx === 0 ? 0.03 : -0.03), f2Y + 0.56, 108.25);
      staticGroup.add(wainscot);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 33.2), thRedMat);
      stripe.position.set(wx + (idx === 0 ? 0.03 : -0.03), f2Y + 3.65, 108.25);
      staticGroup.add(stripe);
    });

    const tCeiling = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 34.0), thCreamMat);
    tCeiling.rotation.x = Math.PI / 2;
    tCeiling.position.set(119.95, f2Y + 5.25, 108.15);
    staticGroup.add(tCeiling);

    [115.0, 119.95, 124.9].forEach((lx) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 31.6), brightLedPanelMat);
      panel.position.set(lx, f2Y + 5.22, 108.15);
      staticGroup.add(panel);
    });

    // Grand Storefront Portal at Z = 91.15 facing Floor 2 South Back Bridge (Doorway X = 116.2..121.6)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(15.02, 2.12, 0.42), thNavyMat);
    portalHeader.position.set(119.95, f2Y + 4.31, 91.15);
    staticGroup.add(portalHeader);
    const portalTrimRed = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.12, 0.46), thRedMat);
    portalTrimRed.position.set(119.95, f2Y + 3.25, 91.15);
    staticGroup.add(portalTrimRed);
    const portalTrimCream = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.08, 0.46), thCreamMat);
    portalTrimCream.position.set(119.95, f2Y + 3.16, 91.15);
    staticGroup.add(portalTrimCream);

    const thFasciaTex = createTommyFasciaTex();
    const thFasciaMat = new THREE.MeshStandardMaterial({ map: thFasciaTex });
    const thFascia = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.55), thFasciaMat);
    thFascia.rotation.y = Math.PI;
    thFascia.position.set(119.95, f2Y + 4.31, 90.92);
    staticGroup.add(thFascia);

    const thFlagTex = createTommyFlagPlaqueTex();
    const thFlagMat = new THREE.MeshStandardMaterial({ map: thFlagTex });
    [113.9, 126.0].forEach((px) => {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), thFlagMat);
      plaque.rotation.y = Math.PI;
      plaque.position.set(px, f2Y + 4.31, 90.92);
      staticGroup.add(plaque);
    });

    // Flanking Panoramic Display Windows (West X=112.4..116.2 & East X=121.6..127.5)
    [
      { x: 114.3, w: 3.64, postX: 116.16, title: 'TOMMY CLASSICS', sub: 'POLOS & OXFORDS', colIdx: 2 },
      { x: 124.55, w: 5.74, postX: 121.64, title: 'NY VARSITY', sub: 'HERITAGE CAPSULE', colIdx: 0 },
    ].forEach((win) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(win.w, 0.34, 0.95), thCreamMat);
      curb.position.set(win.x, f2Y + 0.24, 91.55);
      staticGroup.add(curb);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(win.w, 2.95), atriumGlassMat);
      glassPane.rotation.y = Math.PI;
      glassPane.position.set(win.x, f2Y + 1.78, 90.98);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.16, 0.16), thNavyMat);
      postInner.position.set(win.postX, f2Y + 1.62, 91.15);
      staticGroup.add(postInner);

      [-0.75, 0.75].forEach((dx, mIdx) => {
        const mx = win.x + dx;
        const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.88, 10), thMannequinMat);
        legs.position.set(mx, f2Y + 0.85, 91.55);
        staticGroup.add(legs);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.64, 0.32), thPalette[(win.colIdx + mIdx) % thPalette.length]);
        top.position.set(mx, f2Y + 1.58, 91.55);
        staticGroup.add(top);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), thMannequinMat);
        head.position.set(mx, f2Y + 2.04, 91.55);
        staticGroup.add(head);
      });

      const pTex = createFashionPromoPosterTex('TOMMY HILFIGER', win.title, win.sub, '#0c1b33', '#b91c1c', '#ece7df');
      const pMat = new THREE.MeshStandardMaterial({ map: pTex });
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), pMat);
      poster.rotation.y = Math.PI;
      poster.position.set(win.x, f2Y + 2.35, 91.16);
      staticGroup.add(poster);
    });

    // ZONE 1 (Z=95.8): Preppy Polo Waterfall Table (X=115.6) & Varsity Launch Island (X=123.2)
    const poloTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.3), thNavyMat);
    poloTable.position.set(115.6, f2Y + 0.46, 95.8);
    staticGroup.add(poloTable);
    const poloTop = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.06, 1.36), thOakMat);
    poloTop.position.set(115.6, f2Y + 0.88, 95.8);
    staticGroup.add(poloTop);
    [-0.78, 0, 0.78].forEach((dx, sIdx) => {
      for (let l = 0; l < 4; l++) {
        const polo = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.065, 0.40), thPalette[(sIdx + l) % 3]);
        polo.position.set(115.6 + dx, f2Y + 0.94 + l * 0.07, 95.8);
        staticGroup.add(polo);
      }
    });

    const varTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.3), thNavyMat);
    varTable.position.set(123.2, f2Y + 0.46, 95.8);
    staticGroup.add(varTable);
    const varTop = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.06, 1.36), thBrassMat);
    varTop.position.set(123.2, f2Y + 0.88, 95.8);
    staticGroup.add(varTop);
    [-0.75, 0, 0.75].forEach((dx, sIdx) => {
      for (let l = 0; l < 4; l++) {
        const knit = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.065, 0.40), thPalette[(sIdx + l + 1) % thPalette.length]);
        knit.position.set(123.2 + dx, f2Y + 0.94 + l * 0.07, 95.8);
        staticGroup.add(knit);
      }
    });

    // ZONE 2: 23.6m Tailored Wardrobe Wall (West X=112.74) & Hilfiger Denim Wall (East X=127.02)
    const westCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 3.2, 23.6), thNavyMat);
    westCabinet.position.set(112.74, f2Y + 1.67, 105.8);
    staticGroup.add(westCabinet);
    [0.65, 1.30, 1.95, 2.60].forEach((sy, rIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.05, 23.2), thOakMat);
      shelf.position.set(112.92, f2Y + sy, 105.8);
      staticGroup.add(shelf);
      for (let sz = 94.7; sz <= 117.0; sz += 0.78) {
        const fold = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.44), thPalette[(rIdx + Math.round(sz)) % thPalette.length]);
        fold.position.set(112.98, f2Y + sy + 0.14, sz);
        staticGroup.add(fold);
      }
    });

    [
      { z: 99.8, title: 'TOMMY MEN', sub: 'OXFORDS  •  POLOS  •  CHINOS' },
      { z: 112.2, title: 'TOMMY WOMAN', sub: 'KNITWEAR  •  BLAZERS  •  DRESSES' },
    ].forEach((hdr) => {
      const hTex = createAeonDepartmentSignTex(hdr.title, hdr.sub, '#0c1b33', '#c5b088');
      const hMat = new THREE.MeshStandardMaterial({ map: hTex });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.72), hMat);
      sign.rotation.y = Math.PI / 2;
      sign.position.set(113.08, f2Y + 3.72, hdr.z);
      staticGroup.add(sign);
    });

    const eastRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 23.4, 8), thBrassMat);
    eastRail.rotation.x = Math.PI / 2;
    eastRail.position.set(127.02, f2Y + 1.82, 105.8);
    staticGroup.add(eastRail);
    const eastTopShelf = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 23.6), thOakMat);
    eastTopShelf.position.set(127.14, f2Y + 2.18, 105.8);
    staticGroup.add(eastTopShelf);
    for (let gz = 94.6; gz <= 117.2; gz += 0.48) {
      const blazer = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.82, 0.16), thPalette[Math.round(gz * 2) % thPalette.length]);
      blazer.position.set(127.02, f2Y + 1.32, gz);
      staticGroup.add(blazer);
    }

    // ZONE 3: Four Mid-Store Heritage Gondolas (Z=100.8 & 114.6)
    [
      { x: 116.3, z: 100.8, title: 'PREPPY POLO', sub: 'CLASSIC FIT & BRETON STRIPES' },
      { x: 122.5, z: 100.8, title: 'HILFIGER DENIM', sub: 'STRAIGHT  •  SLIM  •  TRUCKER' },
      { x: 116.3, z: 114.6, title: 'LEATHER & BAGS', sub: 'BELTS  •  TOTES  •  BACKPACKS' },
      { x: 122.5, z: 114.6, title: 'OUTERWEAR DROP', sub: 'PUFFERS & VARSITY JACKETS' },
    ].forEach((g, gIdx) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.78, 1.2), thNavyMat);
      base.position.set(g.x, f2Y + 0.46, g.z);
      staticGroup.add(base);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.05, 1.26), thBrassMat);
      trim.position.set(g.x, f2Y + 0.87, g.z);
      staticGroup.add(trim);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.0, 8), thBrassMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(g.x, f2Y + 1.72, g.z);
      staticGroup.add(bar);
      for (let gx = g.x - 1.2; gx <= g.x + 1.21; gx += 0.48) {
        const garment = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.36), thPalette[(Math.round(gx) + gIdx) % thPalette.length]);
        garment.position.set(gx, f2Y + 1.30, g.z);
        staticGroup.add(garment);
      }
      const bTex = createAeonDepartmentSignTex(g.title, g.sub, '#0c1b33', '#ece7df');
      const bMat = new THREE.MeshStandardMaterial({ map: bTex });
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), bMat);
      banner.rotation.y = Math.PI;
      banner.position.set(g.x, f2Y + 3.45, g.z);
      staticGroup.add(banner);
    });

    // ZONE 4 (Centerpiece Z=108.0): TOMMY YACHT CLUB Heritage Island with Multi-Part 3D Sailing Yacht Sculpture
    const yachtStage = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.44, 2.8), thOakMat);
    yachtStage.position.set(119.4, f2Y + 0.29, 108.0);
    staticGroup.add(yachtStage);
    const yachtRim = new THREE.Mesh(new THREE.BoxGeometry(4.28, 0.08, 2.88), thNavyMat);
    yachtRim.position.set(119.4, f2Y + 0.52, 108.0);
    staticGroup.add(yachtRim);
    const yachtStripe = new THREE.Mesh(new THREE.BoxGeometry(4.30, 0.04, 2.90), thRedMat);
    yachtStripe.position.set(119.4, f2Y + 0.56, 108.0);
    staticGroup.add(yachtStripe);

    // 3D Composite Sailing Yacht Sculpture on Central Teak Plinth
    const yachtPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.46, 0.95), thNavyMat);
    yachtPlinth.position.set(119.4, f2Y + 0.79, 108.0);
    staticGroup.add(yachtPlinth);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.22, 0.46), thCreamMat);
    hull.position.set(119.4, f2Y + 1.14, 108.0);
    staticGroup.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 4), thRedMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.x = Math.PI / 4;
    bow.position.set(120.32, f2Y + 1.16, 108.0);
    staticGroup.add(bow);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.35, 8), thBrassMat);
    mast.position.set(119.4, f2Y + 1.92, 108.0);
    staticGroup.add(mast);
    const mainSail = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.05, 0.03), thCreamMat);
    mainSail.position.set(119.04, f2Y + 1.95, 108.0);
    staticGroup.add(mainSail);
    const sailFlagStripe = new THREE.Mesh(new THREE.BoxGeometry(0.69, 0.22, 0.04), thRedMat);
    sailFlagStripe.position.set(119.04, f2Y + 1.80, 108.0);
    staticGroup.add(sailFlagStripe);

    [-1.45, 1.45].forEach((dx, pIdx) => {
      const bagRiser = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.36, 0.65), thCreamMat);
      bagRiser.position.set(119.4 + dx, f2Y + 0.74, 108.0);
      staticGroup.add(bagRiser);
      const duffel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.44, 12), pIdx === 0 ? thNavyMat : thRedMat);
      duffel.rotation.z = Math.PI / 2;
      duffel.position.set(119.4 + dx, f2Y + 1.08, 108.0);
      staticGroup.add(duffel);
    });

    const yachtSignTex = createAeonDepartmentSignTex('TOMMY YACHT CLUB', 'NAUTICAL HERITAGE  •  LIMITED CAPSULE', '#b91c1c', '#ece7df');
    const yachtSignMat = new THREE.MeshStandardMaterial({ map: yachtSignTex });
    const yachtSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.80), yachtSignMat);
    yachtSign.rotation.y = Math.PI;
    yachtSign.position.set(119.4, f2Y + 3.55, 108.0);
    staticGroup.add(yachtSign);

    // ZONE 5 (Rear Z=121..125): East Fitting Suites & West 3-POS Navy/Brass Cashdesk
    const fitWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.75, 0.14), thNavyMat);
    fitWall.position.set(125.6, f2Y + 1.44, 121.4);
    staticGroup.add(fitWall);
    [124.5, 126.2].forEach((fx) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.4, 0.08), thOakMat);
      door.position.set(fx, f2Y + 1.28, 121.34);
      staticGroup.add(door);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.05), thBrassMat);
      handle.position.set(fx - 0.32, f2Y + 1.25, 121.29);
      staticGroup.add(handle);
    });

    const thDesk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.02, 0.96), thNavyMat);
    thDesk.position.set(118.6, f2Y + 0.58, 122.8);
    staticGroup.add(thDesk);
    const thDeskTop = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.07, 1.08), thBrassMat);
    thDeskTop.position.set(118.6, f2Y + 1.12, 122.8);
    staticGroup.add(thDeskTop);
    [117.0, 118.6, 120.2].forEach((px) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.18), thCreamMat);
      pos.position.set(px, f2Y + 1.28, 122.6);
      staticGroup.add(pos);
    });

    const thBackSign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), thFasciaMat);
    thBackSign.rotation.y = Math.PI;
    thBackSign.position.set(119.95, f2Y + 3.15, 125.04);
    staticGroup.add(thBackSign);
  };
  buildFloor2TommyHilfigerBoutique();

  // =========================================================================
  // 15. FLOOR 2 SOUTH WING FLAGSHIP 2: CROCS EXPERIENCE (X=128.5..143.6, Z=91.15..125.15, Y=6.18..11.45)
  // =========================================================================
  const buildFloor2CrocsBoutique = () => {
    const f2Y = 6.18;
    const crFloorTex = createCrocsFloorTex();
    const crFloorMat = new THREE.MeshStandardMaterial({ map: crFloorTex, roughness: 0.9 });
    const crWallMat = new THREE.MeshStandardMaterial({ color: 0xd9dfe6, roughness: 0.92 });
    const crSlateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const crLimeMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.88 });
    const crCoralMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.88 });
    const crSkyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.88 });
    const crYellowMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.88 });
    const crPurpleMat = new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.88 });
    const crWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });

    const clogMats = [crLimeMat, crCoralMat, crSkyMat, crYellowMat, crPurpleMat, crWhiteMat, crSlateMat];

    // Helper: Composite Multi-Part 3D Classic Crocs Clog (Footbed Sole + Toe Dome + Ventilation Dots + Heel Strap)
    const add3DClog = (x: number, y: number, z: number, scale: number, rotY: number, mat: THREE.Material) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      g.scale.setScalar(scale);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.36), mat);
      sole.position.set(0, 0.025, 0);
      g.add(sole);

      const toeBox = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.18, 10, 1, false, 0, Math.PI), mat);
      toeBox.rotation.z = Math.PI / 2;
      toeBox.rotation.y = Math.PI / 2;
      toeBox.position.set(0, 0.05, 0.06);
      g.add(toeBox);

      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.016, 6, 12, Math.PI), crSlateMat);
      strap.rotation.y = Math.PI / 2;
      strap.rotation.x = 0.55;
      strap.position.set(0, 0.09, -0.09);
      g.add(strap);

      const jibbitz = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 8), crYellowMat);
      jibbitz.position.set(0, 0.135, 0.08);
      g.add(jibbitz);

      staticGroup.add(g);
    };

    const cFloor = new THREE.Mesh(new THREE.BoxGeometry(15.06, 0.02, 34.0), crFloorMat);
    cFloor.position.set(136.05, f2Y + 0.065, 108.15);
    staticGroup.add(cFloor);

    // Signature Crocs Lime Promenade Stripe
    const cRunner = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.014, 29.2), crLimeMat);
    cRunner.position.set(136.05, f2Y + 0.076, 106.5);
    staticGroup.add(cRunner);

    const cBackWall = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 5.2), crSlateMat);
    cBackWall.rotation.y = Math.PI;
    cBackWall.position.set(136.05, f2Y + 2.66, 125.12);
    staticGroup.add(cBackWall);

    [128.52, 143.58].forEach((wx, idx) => {
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(33.7, 5.2), crWallMat);
      sideWall.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
      sideWall.position.set(wx, f2Y + 2.66, 108.25);
      staticGroup.add(sideWall);

      const limeRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 33.2), crLimeMat);
      limeRibbon.position.set(wx + (idx === 0 ? 0.03 : -0.03), f2Y + 3.68, 108.25);
      staticGroup.add(limeRibbon);
    });

    const cCeiling = new THREE.Mesh(new THREE.PlaneGeometry(15.1, 34.0), crWallMat);
    cCeiling.rotation.x = Math.PI / 2;
    cCeiling.position.set(136.05, f2Y + 5.25, 108.15);
    staticGroup.add(cCeiling);

    [131.1, 136.05, 141.0].forEach((lx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 31.6), brightLedPanelMat);
      strip.position.set(lx, f2Y + 5.22, 108.15);
      staticGroup.add(strip);
    });

    // Storefront Portal at Z = 91.15 facing Floor 2 South Back Bridge (Doorway X = 133.2..138.8)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(15.02, 2.12, 0.42), crSlateMat);
    portalHeader.position.set(136.05, f2Y + 4.31, 91.15);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(15.02, 0.16, 0.46), crLimeMat);
    portalTrim.position.set(136.05, f2Y + 3.24, 91.15);
    staticGroup.add(portalTrim);

    const crFasciaTex = createCrocsFasciaTex();
    const crFasciaMat = new THREE.MeshStandardMaterial({ map: crFasciaTex });
    const crFascia = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.55), crFasciaMat);
    crFascia.rotation.y = Math.PI;
    crFascia.position.set(136.05, f2Y + 4.31, 90.92);
    staticGroup.add(crFascia);

    const crEmbTex = createCrocsEmblemTex();
    const crEmbMat = new THREE.MeshStandardMaterial({ map: crEmbTex });
    [130.0, 142.1].forEach((px) => {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), crEmbMat);
      plaque.rotation.y = Math.PI;
      plaque.position.set(px, f2Y + 4.31, 90.92);
      staticGroup.add(plaque);
    });

    // Flanking Panoramic Display Windows with Oversized 3D Clogs (West X=128.5..133.2 & East X=138.8..143.6)
    [
      { x: 130.85, w: 4.54, postX: 133.16, title: 'CLASSIC CLOG', sub: 'ICONIC COMFORT', colIdx: 0 },
      { x: 141.2, w: 4.64, postX: 138.84, title: 'JIBBITZ™ CHARMS', sub: 'PERSONALIZE YOUR PAIR', colIdx: 1 },
    ].forEach((win) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(win.w, 0.34, 0.95), crLimeMat);
      curb.position.set(win.x, f2Y + 0.24, 91.55);
      staticGroup.add(curb);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(win.w, 2.95), atriumGlassMat);
      glassPane.rotation.y = Math.PI;
      glassPane.position.set(win.x, f2Y + 1.78, 90.98);
      staticGroup.add(glassPane);

      const postInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.16, 0.16), crLimeMat);
      postInner.position.set(win.postX, f2Y + 1.62, 91.15);
      staticGroup.add(postInner);

      [-0.85, 0.85].forEach((dx, cIdx) => {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.56, 16), crWhiteMat);
        ped.position.set(win.x + dx, f2Y + 0.68, 91.55);
        staticGroup.add(ped);
        add3DClog(win.x + dx, f2Y + 0.98, 91.55, 1.9, (cIdx === 0 ? 0.4 : -0.4) + Math.PI, clogMats[(win.colIdx + cIdx * 2) % clogMats.length]);
      });

      const pTex = createFashionPromoPosterTex('CROCS', win.title, win.sub, '#18221e', '#65a30d', '#ffffff');
      const pMat = new THREE.MeshStandardMaterial({ map: pTex });
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.45), pMat);
      poster.rotation.y = Math.PI;
      poster.position.set(win.x, f2Y + 2.35, 91.16);
      staticGroup.add(poster);
    });

    // ZONE 1 (Z=95.4): Twin Color-Pop Clog Towers (X=132.5 & X=139.6)
    [132.5, 139.6].forEach((tx, tIdx) => {
      for (let tier = 0; tier < 3; tier++) {
        const tierBox = new THREE.Mesh(new THREE.BoxGeometry(2.2 - tier * 0.35, 0.34, 1.35 - tier * 0.22), tier % 2 === 0 ? crSlateMat : crWhiteMat);
        tierBox.position.set(tx, f2Y + 0.24 + tier * 0.34, 95.4);
        staticGroup.add(tierBox);
        [-0.48 + tier * 0.1, 0.48 - tier * 0.1].forEach((ox, sIdx) => {
          add3DClog(tx + ox, f2Y + 0.41 + tier * 0.34, 95.4, 1.1, Math.PI, clogMats[(tIdx + tier + sIdx) % clogMats.length]);
        });
      }
    });

    // ZONE 2: 23.6m Signature Rainbow Clog Wall (West X=128.88) & Echo/Platform Shelf Wall (East X=143.22)
    [
      { x: 128.88, shelfX: 129.04, rotY: Math.PI / 2 },
      { x: 143.22, shelfX: 143.06, rotY: -Math.PI / 2 },
    ].forEach((wall, wIdx) => {
      const backUnit = new THREE.Mesh(new THREE.BoxGeometry(0.56, 3.2, 23.6), crSlateMat);
      backUnit.position.set(wall.x, f2Y + 1.67, 105.8);
      staticGroup.add(backUnit);

      [0.65, 1.28, 1.91, 2.54].forEach((sy, rIdx) => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.05, 23.2), wIdx === 0 ? crLimeMat : crWhiteMat);
        shelf.position.set(wall.shelfX, f2Y + sy, 105.8);
        staticGroup.add(shelf);
        for (let sz = 94.6; sz <= 117.1; sz += 0.85) {
          add3DClog(
            wall.shelfX + (wIdx === 0 ? 0.08 : -0.08),
            f2Y + sy + 0.03,
            sz,
            0.95,
            wall.rotY,
            clogMats[(wIdx + rIdx + Math.round(sz)) % clogMats.length]
          );
        }
      });
    });

    [
      { z: 99.8, title: 'RAINBOW CLOG WALL', sub: 'LIME  •  CORAL  •  SKY  •  CLASSIC' },
      { z: 112.2, title: 'MEGA CRUSH & ECHO', sub: 'PLATFORMS  •  STREET TRAIL' },
    ].forEach((hdr) => {
      const cTex = createAeonDepartmentSignTex(hdr.title, hdr.sub, '#18221e', '#84cc16');
      const cMat = new THREE.MeshStandardMaterial({ map: cTex });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.72), cMat);
      sign.rotation.y = Math.PI / 2;
      sign.position.set(129.24, f2Y + 3.72, hdr.z);
      staticGroup.add(sign);
    });

    // ZONE 3: Four Mid-Store Playful Clog Gondolas (Z=100.8 & 114.6)
    [
      { x: 132.4, z: 100.8, title: 'CLASSIC LINED', sub: 'COZY FUZZY FLEECE INSIDE' },
      { x: 139.6, z: 100.8, title: 'ECHO COLLECTION', sub: 'SCULPTED SPORT COMFORT' },
      { x: 132.4, z: 114.6, title: 'KIDS CLOGS', sub: 'JUNIOR  •  TODDLER  •  GLOW' },
      { x: 139.6, z: 114.6, title: 'SLIDES & SANDALS', sub: 'BROOKLYN  •  MELLOW RECOVERY' },
    ].forEach((g, gIdx) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.76, 1.3), crWhiteMat);
      base.position.set(g.x, f2Y + 0.45, g.z);
      staticGroup.add(base);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.07, 1.36), clogMats[gIdx % clogMats.length]);
      rim.position.set(g.x, f2Y + 0.85, g.z);
      staticGroup.add(rim);
      [-0.85, 0, 0.85].forEach((dx, cIdx) => {
        add3DClog(g.x + dx, f2Y + 0.89, g.z, 1.15, Math.PI, clogMats[(gIdx + cIdx) % clogMats.length]);
      });
      const bTex = createAeonDepartmentSignTex(g.title, g.sub, '#18221e', '#84cc16');
      const bMat = new THREE.MeshStandardMaterial({ map: bTex });
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.72), bMat);
      banner.rotation.y = Math.PI;
      banner.position.set(g.x, f2Y + 3.45, g.z);
      staticGroup.add(banner);
    });

    // ZONE 4 (Centerpiece Z=108.0): Giant JIBBITZ™ CHARM CUSTOMIZATION BAR + Hero Lime Clog Sculpture
    const jibBar = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.25, 0.92, 16), crSlateMat);
    jibBar.position.set(136.05, f2Y + 0.53, 108.0);
    staticGroup.add(jibBar);
    const jibRim = new THREE.Mesh(new THREE.CylinderGeometry(2.22, 2.22, 0.08, 16), crLimeMat);
    jibRim.position.set(136.05, f2Y + 1.00, 108.0);
    staticGroup.add(jibRim);
    const heroDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.95, 0.48, 16), crWhiteMat);
    heroDrum.position.set(136.05, f2Y + 1.24, 108.0);
    staticGroup.add(heroDrum);
    // Giant Hero Lime Classic Clog Centerpiece
    add3DClog(136.05, f2Y + 1.50, 108.0, 2.8, Math.PI * 0.85, crLimeMat);

    // 12 Jibbitz Charm Pick-n-Mix Bins circling the Island
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const bx = 136.05 + Math.cos(ang) * 1.55;
      const bz = 108.0 + Math.sin(ang) * 1.55;
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 10), clogMats[i % clogMats.length]);
      jar.position.set(bx, f2Y + 1.14, bz);
      staticGroup.add(jar);
    }

    const jibTex = createAeonDepartmentSignTex('JIBBITZ™ CHARM BAR', 'CUSTOMIZE YOUR CROCS  •  500+ PINS', '#65a30d', '#18221e');
    const jibMat = new THREE.MeshStandardMaterial({ map: jibTex });
    const jibSign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.84), jibMat);
    jibSign.rotation.y = Math.PI;
    jibSign.position.set(136.05, f2Y + 3.55, 108.0);
    staticGroup.add(jibSign);

    // ZONE 5 (Rear Z=121..125): Try-On Pouf Lounge & Selfie Alcove (West) + Lime & Slate Checkout Counter (East)
    const alcoveWall = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.75, 0.14), crSlateMat);
    alcoveWall.position.set(130.7, f2Y + 1.44, 121.4);
    staticGroup.add(alcoveWall);
    [129.6, 131.5].forEach((px, idx) => {
      const pouf = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.46, 14), idx === 0 ? crLimeMat : crPurpleMat);
      pouf.position.set(px, f2Y + 0.30, 120.2);
      staticGroup.add(pouf);
    });

    const crDesk = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.02, 0.96), crSlateMat);
    crDesk.position.set(136.05, f2Y + 0.58, 122.6);
    staticGroup.add(crDesk);
    const crDeskTop = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.08, 1.08), crLimeMat);
    crDeskTop.position.set(136.05, f2Y + 1.12, 122.6);
    staticGroup.add(crDeskTop);
    [134.4, 136.05, 137.7].forEach((px) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.18), crWhiteMat);
      pos.position.set(px, f2Y + 1.28, 122.4);
      staticGroup.add(pos);
    });

    const crBackSign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), crFasciaMat);
    crBackSign.rotation.y = Math.PI;
    crBackSign.position.set(136.05, f2Y + 3.15, 125.04);
    staticGroup.add(crBackSign);
  };
  buildFloor2CrocsBoutique();

  // =========================================================================
  // 4E. FLOOR 3 EAST WING DINING: HAIDILAO HOT POT (Z = 48.0..67.4) & KICHI-KICHI (Z = 68.8..88.2)
  // Full 32m Walk-In Culinary Flagships (X = 144.0..176.1, Y = 12.18 -> Floor Top 12.255)
  // =========================================================================
  const buildFloor3HaidilaoRestaurant = () => {
    const f3Y = 12.18;
    const zStart = 48.0;
    const zEnd = 67.4;
    const zMid = (zStart + zEnd) / 2; // 57.7
    const bayW = zEnd - zStart; // 19.4m

    const hdlTileTex = createHaidilaoTileTex();
    const hdlFloorMat = new THREE.MeshStandardMaterial({ map: hdlTileTex, roughness: 0.88 });
    const hdlWallMat = new THREE.MeshStandardMaterial({ color: 0xf4ece1, roughness: 0.9 });
    const hdlDarkMat = new THREE.MeshStandardMaterial({ color: 0x181312, roughness: 0.88 });
    const hdlCrimsonMat = new THREE.MeshStandardMaterial({ color: 0xa4161a, roughness: 0.88 });
    const hdlVelvetMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.92 });
    const hdlWalnutMat = new THREE.MeshStandardMaterial({ color: 0x452212, roughness: 0.88 });
    const hdlGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.88 });
    const hdlMarbleMat = new THREE.MeshStandardMaterial({ color: 0xf5efe6, roughness: 0.88 });
    const hdlSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    const hdlMalaSoupMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.88 });
    const hdlCreamSoupMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.88 });
    const hdlTomSoupMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.88 });
    const hdlMushroomSoupMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.88 });
    const hdlBeefMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.88 });
    const hdlVegMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.88 });

    // Floor, Perimeter Walls & Walnut Coffered Ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.14, bayW), hdlFloorMat);
    floor.position.set(160.1, f3Y + 0.005, zMid);
    staticGroup.add(floor);

    // Imperial crimson & gold carpet runner along central promenade
    const runner = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.015, 2.2), hdlCrimsonMat);
    runner.position.set(158.0, f3Y + 0.08, zMid);
    staticGroup.add(runner);
    [-1.12, 1.12].forEach((rz) => {
      const border = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.018, 0.08), hdlGoldMat);
      border.position.set(158.0, f3Y + 0.082, zMid + rz);
      staticGroup.add(border);
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(bayW, 5.25), hdlDarkMat);
    backWall.rotation.y = -Math.PI / 2;
    backWall.position.set(176.08, f3Y + 2.65, zMid);
    staticGroup.add(backWall);

    [zStart + 0.02, zEnd - 0.02].forEach((sz, idx) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 5.25), hdlWallMat);
      wall.rotation.y = idx === 0 ? 0 : Math.PI;
      wall.position.set(160.1, f3Y + 2.65, sz);
      staticGroup.add(wall);

      const dado = new THREE.Mesh(new THREE.BoxGeometry(31.8, 1.15, 0.06), hdlWalnutMat);
      dado.position.set(160.1, f3Y + 0.65, sz + (idx === 0 ? 0.03 : -0.03));
      staticGroup.add(dado);

      const goldBand = new THREE.Mesh(new THREE.BoxGeometry(31.8, 0.08, 0.08), hdlGoldMat);
      goldBand.position.set(160.1, f3Y + 1.25, sz + (idx === 0 ? 0.04 : -0.04));
      staticGroup.add(goldBand);
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(32.2, bayW), hdlDarkMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(160.1, f3Y + 5.22, zMid);
    staticGroup.add(ceiling);

    // Flush ceiling lamp panels + walnut beams
    for (let bx = 146.5; bx <= 173.5; bx += 4.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, bayW - 0.6), hdlWalnutMat);
      beam.position.set(bx, f3Y + 5.14, zMid);
      staticGroup.add(beam);
      [51.2, 57.7, 64.2].forEach((lz) => {
        addCeilingLightPanel(bx + 2.1, f3Y + 5.19, lz, 2.2, 0.72);
      });
    }

    // Helper: Multi-part Palace Silk Red Lantern with warm glowing core
    const addPalaceLantern = (lx: number, ly: number, lz: number, scale = 1.0) => {
      const lg = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72 * scale, 8), hdlGoldMat);
      rod.position.y = 0.54 * scale;
      lg.add(rod);
      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.20 * scale, 0.24 * scale, 0.08 * scale, 14), hdlGoldMat);
      topCap.position.y = 0.22 * scale;
      lg.add(topCap);
      const silkBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.26 * scale, 0.42 * scale, 16), hdlCrimsonMat);
      lg.add(silkBody);
      const glowBand = new THREE.Mesh(new THREE.CylinderGeometry(0.29 * scale, 0.29 * scale, 0.14 * scale, 16), ceilingLampLensMat);
      lg.add(glowBand);
      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.16 * scale, 0.08 * scale, 14), hdlGoldMat);
      botCap.position.y = -0.22 * scale;
      lg.add(botCap);
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.06 * scale, 0.26 * scale, 8), hdlCrimsonMat);
      tassel.position.y = -0.38 * scale;
      lg.add(tassel);
      lg.position.set(lx, ly, lz);
      staticGroup.add(lg);
    };

    // Grand Storefront Portal facing -X onto Floor 3 East Balcony (Doorway Z = 54.4..61.0)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.56, 2.02, bayW - 0.08), hdlDarkMat);
    portalHeader.position.set(144.0, f3Y + 4.24, zMid);
    staticGroup.add(portalHeader);
    const portalGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.12, bayW - 0.08), hdlGoldMat);
    portalGoldTrim.position.set(144.0, f3Y + 3.22, zMid);
    staticGroup.add(portalGoldTrim);

    const hdlFasciaTex = createHaidilaoFasciaTex();
    const hdlFasciaMat = new THREE.MeshStandardMaterial({ map: hdlFasciaTex, roughness: 0.88 });
    const fascia = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 1.66), hdlFasciaMat);
    fascia.rotation.y = -Math.PI / 2;
    fascia.position.set(143.70, f3Y + 4.24, zMid);
    staticGroup.add(fascia);

    // Flanking Chinese Walnut & Gold Fretwork Screens + Panoramic Glass + Hi Emblems
    const hdlEmbTex = createHaidilaoEmblemTex();
    const hdlEmbMat = new THREE.MeshStandardMaterial({ map: hdlEmbTex, roughness: 0.88 });
    [
      { zMin: 48.08, zMax: 54.4, zCenter: 51.24, doorEdge: 54.34 },
      { zMin: 61.0, zMax: 67.32, zCenter: 64.16, doorEdge: 61.06 },
    ].forEach((side) => {
      const segW = side.zMax - side.zMin;
      const baseWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, segW), hdlDarkMat);
      baseWall.position.set(144.0, f3Y + 0.60, side.zCenter);
      staticGroup.add(baseWall);
      const baseGold = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, segW), hdlGoldMat);
      baseGold.position.set(144.0, f3Y + 1.15, side.zCenter);
      staticGroup.add(baseGold);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(segW - 0.3, 2.05), atriumGlassMat);
      glassPane.rotation.y = -Math.PI / 2;
      glassPane.position.set(143.88, f3Y + 2.18, side.zCenter);
      staticGroup.add(glassPane);

      // Chinese fretwork vertical mullions
      for (let gz = side.zMin + 0.65; gz <= side.zMax - 0.65; gz += 0.92) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.04, 0.09), hdlWalnutMat);
        mullion.position.set(143.95, f3Y + 2.18, gz);
        staticGroup.add(mullion);
      }

      // Grand crimson entrance pillar with Hi Emblem
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.54, 3.22, 0.54), hdlCrimsonMat);
      pillar.position.set(144.0, f3Y + 1.66, side.doorEdge);
      staticGroup.add(pillar);
      const pGold = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.58), hdlGoldMat);
      pGold.position.set(144.0, f3Y + 3.16, side.doorEdge);
      staticGroup.add(pGold);

      const emb = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), hdlEmbMat);
      emb.rotation.y = -Math.PI / 2;
      emb.position.set(143.76, f3Y + 2.18, side.zCenter);
      staticGroup.add(emb);
    });

    // 4 Hanging Red Silk Palace Lanterns along storefront balcony + 6 interior lanterns down central aisle
    [50.0, 53.6, 61.8, 65.4].forEach((lz) => addPalaceLantern(143.42, f3Y + 2.95, lz, 0.92));
    [148.5, 154.0, 160.9, 167.2].forEach((lx) => {
      addPalaceLantern(lx, f3Y + 4.35, 55.6, 0.85);
      addPalaceLantern(lx, f3Y + 4.35, 59.8, 0.85);
    });

    // ZONE 1A (Front-South X=145.6..149.0, Z=62.5..66.6): Hostess Reception Desk, Hi Wall Crest & Free Snack Cart
    const recWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 3.2), hdlCrimsonMat);
    recWall.position.set(148.6, f3Y + 1.68, 64.5);
    staticGroup.add(recWall);
    const recEmblem = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), hdlEmbMat);
    recEmblem.rotation.y = -Math.PI / 2;
    recEmblem.position.set(148.44, f3Y + 2.25, 64.5);
    staticGroup.add(recEmblem);

    const recDesk = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.06, 2.85), hdlWalnutMat);
    recDesk.position.set(146.4, f3Y + 0.60, 64.3);
    staticGroup.add(recDesk);
    const recTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 2.96), hdlMarbleMat);
    recTop.position.set(146.4, f3Y + 1.15, 64.3);
    staticGroup.add(recTop);
    const recTablet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.34), hdlDarkMat);
    recTablet.position.set(146.3, f3Y + 1.32, 63.8);
    staticGroup.add(recTablet);

    // Complimentary Snack & Popcorn Cart
    const cartBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.82, 1.15), hdlCrimsonMat);
    cartBase.position.set(146.6, f3Y + 0.48, 66.2);
    staticGroup.add(cartBase);
    const cartCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 1.25), hdlGoldMat);
    cartCanopy.position.set(146.6, f3Y + 1.72, 66.2);
    staticGroup.add(cartCanopy);

    // ZONE 1B (Front-North X=145.5..150.2, Z=48.8..53.0): Iconic Haidilao VIP Waiting & Free Nail Salon
    const nailSignTex = createHaidilaoMenuBoardTex('NAIL CARE & VIP LOUNGE', 'LÀM MÓNG & TRÀ ĐÀO MIỄN PHÍ');
    const nailSignMat = new THREE.MeshStandardMaterial({ map: nailSignTex, roughness: 0.88 });
    const nailSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.95), nailSignMat);
    nailSign.position.set(147.8, f3Y + 2.85, 48.08);
    staticGroup.add(nailSign);

    const waitSofa = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.78, 0.92), hdlVelvetMat);
    waitSofa.position.set(147.8, f3Y + 0.46, 49.0);
    staticGroup.add(waitSofa);
    const nailDesk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.76, 0.82), hdlMarbleMat);
    nailDesk.position.set(147.8, f3Y + 0.45, 51.8);
    staticGroup.add(nailDesk);
    const nailLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.32, 10), hdlGoldMat);
    nailLamp.position.set(147.4, f3Y + 0.98, 51.8);
    staticGroup.add(nailLamp);

    // Helper: Build Complete Marble Hot Pot Table + Recessed 4-Compartment Yuan-Yang Hot Pot + Dishes
    const buildHotPotTable = (tx: number, tz: number, isBooth: boolean) => {
      const tg = new THREE.Group();
      const tblW = isBooth ? 1.52 : 1.56;
      const tblD = isBooth ? 1.24 : 1.38;
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.55), hdlDarkMat);
      ped.position.y = 0.41;
      tg.add(ped);
      const top = new THREE.Mesh(new THREE.BoxGeometry(tblW, 0.08, tblD), hdlMarbleMat);
      top.position.y = 0.78;
      tg.add(top);
      const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(tblW + 0.05, 0.04, tblD + 0.05), hdlGoldMat);
      brassTrim.position.y = 0.75;
      tg.add(brassTrim);

      // Iconic Square 4-Compartment Haidilao Yuan-Yang Hot Pot Frame
      const potOuter = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.56), hdlSteelMat);
      potOuter.position.y = 0.84;
      tg.add(potOuter);
      const potRim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.03, 0.58), hdlGoldMat);
      potRim.position.y = 0.88;
      tg.add(potRim);

      // 4 Broth Quadrants: Spicy Red Mala, Creamy Pork Bone, Tangy Tomato, Wild Mushroom
      const broths = [
        { ox: -0.12, oz: -0.12, mat: hdlMalaSoupMat },
        { ox: 0.12, oz: -0.12, mat: hdlCreamSoupMat },
        { ox: -0.12, oz: 0.12, mat: hdlTomSoupMat },
        { ox: 0.12, oz: 0.12, mat: hdlMushroomSoupMat },
      ];
      broths.forEach((b) => {
        const soup = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.025, 0.21), b.mat);
        soup.position.set(b.ox, 0.885, b.oz);
        tg.add(soup);
      });

      // Side Platters (Wagyu Beef Slices + Fresh Greens) & Dipping Bowls
      [-0.48, 0.48].forEach((ox, idx) => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.03, 12), hdlMarbleMat);
        plate.position.set(ox, 0.84, idx === 0 ? -0.22 : 0.22);
        tg.add(plate);
        const food = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.14), idx === 0 ? hdlBeefMat : hdlVegMat);
        food.position.set(ox, 0.87, idx === 0 ? -0.22 : 0.22);
        tg.add(food);
      });

      tg.position.set(tx, f3Y, tz);
      staticGroup.add(tg);
    };

    // ZONE 2A: 8 Signature Semi-Enclosed Crimson Booths (4 North Z=50.8, 4 South Z=64.6)
    [153.2, 157.4, 161.6, 165.8].forEach((bx) => {
      // North Booth
      [-1.42, 1.42].forEach((dz) => {
        const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, 0.66), hdlVelvetMat);
        sofaSeat.position.set(bx, f3Y + 0.29, 50.8 + dz * 0.78);
        staticGroup.add(sofaSeat);
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.06, 0.18), hdlCrimsonMat);
        sofaBack.position.set(bx, f3Y + 0.62, 50.8 + dz * 0.98);
        staticGroup.add(sofaBack);
      });
      const nScreen = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.85, 3.3), hdlWalnutMat);
      nScreen.position.set(bx + 2.1, f3Y + 1.0, 50.8);
      staticGroup.add(nScreen);
      buildHotPotTable(bx, 50.8, true);

      // South Booth
      [-1.42, 1.42].forEach((dz) => {
        const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, 0.66), hdlVelvetMat);
        sofaSeat.position.set(bx, f3Y + 0.29, 64.6 + dz * 0.78);
        staticGroup.add(sofaSeat);
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.06, 0.18), hdlCrimsonMat);
        sofaBack.position.set(bx, f3Y + 0.62, 64.6 + dz * 0.98);
        staticGroup.add(sofaBack);
      });
      const sScreen = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.85, 3.3), hdlWalnutMat);
      sScreen.position.set(bx + 2.1, f3Y + 1.0, 64.6);
      staticGroup.add(sScreen);
      buildHotPotTable(bx, 64.6, true);
    });

    // ZONE 2B: 4 Center Dining Tables + Chairs (X = 154.0 & 166.2 at Z = 54.8 & 60.6)
    [154.0, 166.2].forEach((tx) => {
      [54.8, 60.6].forEach((tz) => {
        buildHotPotTable(tx, tz, false);
        [-0.95, 0.95].forEach((ox) => {
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.46), hdlVelvetMat);
          chair.position.set(tx + ox, f3Y + 0.29, tz);
          staticGroup.add(chair);
        });
      });
    });

    // ZONE 3: Iconic Central Self-Service Sauce, Fruit & Dessert Bar Island (X = 160.9, Z = 57.7)
    const sauceBase = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.94, 2.7), hdlDarkMat);
    sauceBase.position.set(160.9, f3Y + 0.54, zMid);
    staticGroup.add(sauceBase);
    const sauceTop = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.10, 2.86), hdlMarbleMat);
    sauceTop.position.set(160.9, f3Y + 1.05, zMid);
    staticGroup.add(sauceTop);

    // 16 Sauce Canisters & Chilled Fruit Trays
    for (let sx = -1.1; sx <= 1.1; sx += 0.55) {
      [-0.78, -0.26, 0.26, 0.78].forEach((sz, cIdx) => {
        const bowl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.14, 0.14, 12),
          cIdx % 2 === 0 ? hdlSteelMat : hdlMarbleMat
        );
        bowl.position.set(160.9 + sx, f3Y + 1.17, zMid + sz);
        staticGroup.add(bowl);
        const condiment = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10),
          [hdlMalaSoupMat, hdlVegMat, hdlCreamSoupMat, hdlTomSoupMat][(Math.round(sx * 2) + cIdx + 8) % 4]
        );
        condiment.position.set(160.9 + sx, f3Y + 1.24, zMid + sz);
        staticGroup.add(condiment);
      });
    }

    // Brass Overhead Gantry + Sauce Bar Signboard
    [-1.4, 1.4].forEach((ox) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 10), hdlGoldMat);
      post.position.set(160.9 + ox, f3Y + 1.92, zMid);
      staticGroup.add(post);
    });
    const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.18), hdlGoldMat);
    gantryBeam.position.set(160.9, f3Y + 2.82, zMid);
    staticGroup.add(gantryBeam);
    const sauceBoardTex = createHaidilaoMenuBoardTex('QUẦY NƯỚC CHẤM 30+ VỊ', 'TRÁI CÂY • CHÈ • KEM MIỄN PHÍ');
    const sauceBoardMat = new THREE.MeshStandardMaterial({ map: sauceBoardTex, roughness: 0.88 });
    const sauceBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.74), sauceBoardMat);
    sauceBoard.rotation.y = -Math.PI / 2;
    sauceBoard.position.set(159.35, f3Y + 2.48, zMid);
    staticGroup.add(sauceBoard);

    // ZONE 4: Rear Open Show-Kitchen & Hand-Pulled Noodle Stage (X = 170.5..175.8)
    const noodleStage = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.92, 2.2), hdlWalnutMat);
    noodleStage.position.set(171.0, f3Y + 0.53, zMid);
    staticGroup.add(noodleStage);
    const noodleMarble = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 2.32), hdlMarbleMat);
    noodleMarble.position.set(171.0, f3Y + 1.02, zMid);
    staticGroup.add(noodleMarble);

    const kitchPass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.02, 16.4), hdlDarkMat);
    kitchPass.position.set(172.6, f3Y + 0.58, zMid);
    staticGroup.add(kitchPass);
    const kitchSteelTop = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 16.5), hdlSteelMat);
    kitchSteelTop.position.set(172.6, f3Y + 1.12, zMid);
    staticGroup.add(kitchSteelTop);
    const kitchGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 16.2), atriumGlassMat);
    kitchGlass.position.set(172.1, f3Y + 1.48, zMid);
    staticGroup.add(kitchGlass);

    for (let kz = 50.8; kz <= 64.8; kz += 2.8) {
      const copperPot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.28, 14), hdlGoldMat);
      copperPot.position.set(174.4, f3Y + 1.24, kz);
      staticGroup.add(copperPot);
    }

    const kitchenBoardTex = createHaidilaoMenuBoardTex(
      'BẾP MỞ TỨ XUYÊN & MÚA MÌ TƯƠI',
      'LẨU MALA • BÒ WAGYU • TÔM HÙM • MÌ KÉO TAY'
    );
    const kitchenBoardMat = new THREE.MeshStandardMaterial({ map: kitchenBoardTex, roughness: 0.88 });
    const kitchenBoard = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 1.55), kitchenBoardMat);
    kitchenBoard.rotation.y = -Math.PI / 2;
    kitchenBoard.position.set(175.95, f3Y + 3.45, zMid);
    staticGroup.add(kitchenBoard);
  };
  buildFloor3HaidilaoRestaurant();

  const buildFloor3KichiKichiRestaurant = () => {
    const f3Y = 12.18;
    const zStart = 68.8;
    const zEnd = 88.2;
    const zMid = (zStart + zEnd) / 2; // 78.5
    const bayW = zEnd - zStart; // 19.4m

    const kcWoodTex = createKichiWoodFloorTex();
    const kcFloorMat = new THREE.MeshStandardMaterial({ map: kcWoodTex, roughness: 0.88 });
    const kcCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const kcWallMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.9 });
    const kcHinokiMat = new THREE.MeshStandardMaterial({ color: 0xc28549, roughness: 0.88 });
    const kcRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.88 });
    const kcSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    const kcCreamMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.88 });
    const kcBeltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const kcSalmonMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.88 });
    const kcBeefMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.88 });
    const kcGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.88 });
    const kcTomYumMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.88 });

    // Floor, Japanese Hinoki Slat Walls & Ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.14, bayW), kcFloorMat);
    floor.position.set(160.1, f3Y + 0.005, zMid);
    staticGroup.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(bayW, 5.25), kcCharcoalMat);
    backWall.rotation.y = -Math.PI / 2;
    backWall.position.set(176.08, f3Y + 2.65, zMid);
    staticGroup.add(backWall);

    [zStart + 0.02, zEnd - 0.02].forEach((sz, idx) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(32.2, 5.25), kcWallMat);
      wall.rotation.y = idx === 0 ? 0 : Math.PI;
      wall.position.set(160.1, f3Y + 2.65, sz);
      staticGroup.add(wall);

      // Decorative vertical Hinoki cedar slats along North & South walls
      for (let wx = 146.0; wx <= 171.0; wx += 1.2) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.8, 0.08), kcHinokiMat);
        slat.position.set(wx, f3Y + 1.98, sz + (idx === 0 ? 0.05 : -0.05));
        staticGroup.add(slat);
      }
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(32.2, bayW), kcCharcoalMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(160.1, f3Y + 5.22, zMid);
    staticGroup.add(ceiling);

    // Hinoki Ceiling Baffles + Flush Linear Light Panels
    for (let bx = 146.5; bx <= 173.5; bx += 4.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, bayW - 0.6), kcHinokiMat);
      beam.position.set(bx, f3Y + 5.13, zMid);
      staticGroup.add(beam);
      [73.6, 78.5, 83.4].forEach((lz) => {
        addCeilingLightPanel(bx + 2.1, f3Y + 5.19, lz, 2.2, 0.72);
      });
    }

    // Helper: Japanese Chochin Paper Lantern (White/Red cylindrical lamp)
    const addChochinLantern = (lx: number, ly: number, lz: number, isRed: boolean) => {
      const cg = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), kcCharcoalMat);
      cord.position.y = 0.52;
      cg.add(cord);
      const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 12), kcCharcoalMat);
      capT.position.y = 0.24;
      cg.add(capT);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.44, 14),
        isRed ? kcRedMat : ceilingLampLensMat
      );
      cg.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.10, 14), ceilingLampLensMat);
      cg.add(band);
      const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.06, 12), kcCharcoalMat);
      capB.position.y = -0.24;
      cg.add(capB);
      cg.position.set(lx, ly, lz);
      staticGroup.add(cg);
    };

    // Grand KICHI-KICHI Storefront Portal facing -X balcony (Doorway Z = 75.2..81.8)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.56, 2.02, bayW - 0.08), kcCharcoalMat);
    portalHeader.position.set(144.0, f3Y + 4.24, zMid);
    staticGroup.add(portalHeader);
    const portalRedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.14, bayW - 0.08), kcRedMat);
    portalRedStrip.position.set(144.0, f3Y + 3.22, zMid);
    staticGroup.add(portalRedStrip);

    const kcFasciaTex = createKichiFasciaTex();
    const kcFasciaMat = new THREE.MeshStandardMaterial({ map: kcFasciaTex, roughness: 0.88 });
    const fascia = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 1.66), kcFasciaMat);
    fascia.rotation.y = -Math.PI / 2;
    fascia.position.set(143.70, f3Y + 4.24, zMid);
    staticGroup.add(fascia);

    // Traditional Japanese Crimson Noren Curtains across upper doorway (Z = 75.6..81.4)
    for (let nz = 75.75; nz <= 81.25; nz += 1.38) {
      const noren = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 1.24), kcRedMat);
      noren.position.set(143.84, f3Y + 2.86, nz);
      staticGroup.add(noren);
      const norenCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 12), kcCreamMat);
      norenCrest.rotation.z = Math.PI / 2;
      norenCrest.position.set(143.84, f3Y + 2.86, nz);
      staticGroup.add(norenCrest);
    }

    const kcEmbTex = createKichiEmblemTex();
    const kcEmbMat = new THREE.MeshStandardMaterial({ map: kcEmbTex, roughness: 0.88 });
    [
      { zMin: 68.88, zMax: 75.2, zCenter: 72.04, doorEdge: 75.14 },
      { zMin: 81.8, zMax: 88.12, zCenter: 84.96, doorEdge: 81.86 },
    ].forEach((side) => {
      const segW = side.zMax - side.zMin;
      const baseWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, segW), kcCharcoalMat);
      baseWall.position.set(144.0, f3Y + 0.60, side.zCenter);
      staticGroup.add(baseWall);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(segW - 0.3, 2.05), atriumGlassMat);
      glassPane.rotation.y = -Math.PI / 2;
      glassPane.position.set(143.88, f3Y + 2.18, side.zCenter);
      staticGroup.add(glassPane);

      for (let gz = side.zMin + 0.6; gz <= side.zMax - 0.6; gz += 0.72) {
        const hinokiSlat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.04, 0.08), kcHinokiMat);
        hinokiSlat.position.set(143.95, f3Y + 2.18, gz);
        staticGroup.add(hinokiSlat);
      }

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.54, 3.22, 0.54), kcRedMat);
      pillar.position.set(144.0, f3Y + 1.66, side.doorEdge);
      staticGroup.add(pillar);

      const emb = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 1.32), kcEmbMat);
      emb.rotation.y = -Math.PI / 2;
      emb.position.set(143.76, f3Y + 2.18, side.zCenter);
      staticGroup.add(emb);
    });

    // Storefront + Interior Japanese Chochin Lanterns
    [70.6, 74.3, 82.7, 86.4].forEach((lz, idx) => addChochinLantern(143.42, f3Y + 2.95, lz, idx % 2 === 0));
    [152.0, 158.0, 164.0, 169.0].forEach((lx, idx) => {
      addChochinLantern(lx, f3Y + 4.35, 73.6, idx % 2 === 0);
      addChochinLantern(lx, f3Y + 4.35, 83.4, idx % 2 === 1);
    });

    // ZONE 1A (Front-North X=145.6..148.3, Z=70.0..73.6): Kichi Reception Podium & Welcome Counter
    const kRec = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.06, 2.45), kcCharcoalMat);
    kRec.position.set(146.4, f3Y + 0.60, 71.8);
    staticGroup.add(kRec);
    const kRecTop = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 2.55), kcHinokiMat);
    kRecTop.position.set(146.4, f3Y + 1.15, 71.8);
    staticGroup.add(kRecTop);
    const kBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.1, 2.8), kcRedMat);
    kBack.position.set(148.0, f3Y + 1.62, 71.8);
    staticGroup.add(kBack);
    const kBackCrest = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), kcEmbMat);
    kBackCrest.rotation.y = -Math.PI / 2;
    kBackCrest.position.set(147.86, f3Y + 2.2, 71.8);
    staticGroup.add(kBackCrest);

    // ZONE 1B (Front-South X=145.6..149.0, Z=83.2..87.2): Free Soft Drink, Matcha & Soft-Serve Dessert Station
    const drinkBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.98, 1.05), kcCharcoalMat);
    drinkBase.position.set(147.1, f3Y + 0.56, 86.2);
    staticGroup.add(drinkBase);
    const drinkTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 1.15), kcSteelMat);
    drinkTop.position.set(147.1, f3Y + 1.08, 86.2);
    staticGroup.add(drinkTop);
    [146.2, 147.1, 148.0].forEach((dx, dIdx) => {
      const dispenser = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.65, 0.52),
        dIdx === 1 ? kcRedMat : kcSteelMat
      );
      dispenser.position.set(dx, f3Y + 1.44, 86.2);
      staticGroup.add(dispenser);
    });

    // ZONE 2: TWIN 17m U-SHAPED KAITEN CONVEYOR BELT LOOPS (Loop A @ Z=73.6, Loop B @ Z=83.4)
    const buildConveyorLoop = (centerZ: number) => {
      const loopLen = 17.8; // X = 151.3..169.1
      const loopCenterX = 160.2;

      // Oak Dining Counter Base & Stainless Conveyor Track
      const counterBase = new THREE.Mesh(new THREE.BoxGeometry(loopLen, 0.82, 2.32), kcCharcoalMat);
      counterBase.position.set(loopCenterX, f3Y + 0.48, centerZ);
      staticGroup.add(counterBase);
      const oakLedge = new THREE.Mesh(new THREE.BoxGeometry(loopLen + 0.36, 0.08, 2.64), kcHinokiMat);
      oakLedge.position.set(loopCenterX, f3Y + 0.90, centerZ);
      staticGroup.add(oakLedge);

      // Rounded conveyor ends
      [-loopLen / 2, loopLen / 2].forEach((ox) => {
        const endCap = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.88, 18), kcCharcoalMat);
        endCap.position.set(loopCenterX + ox, f3Y + 0.50, centerZ);
        staticGroup.add(endCap);
        const endOak = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.08, 18), kcHinokiMat);
        endOak.position.set(loopCenterX + ox, f3Y + 0.90, centerZ);
        staticGroup.add(endOak);
      });

      // Elevated Stainless Track + Dark Moving Belt
      const trackSteel = new THREE.Mesh(new THREE.BoxGeometry(loopLen - 0.4, 0.12, 1.24), kcSteelMat);
      trackSteel.position.set(loopCenterX, f3Y + 0.98, centerZ);
      staticGroup.add(trackSteel);
      const beltSurf = new THREE.Mesh(new THREE.BoxGeometry(loopLen - 0.6, 0.04, 1.08), kcBeltMat);
      beltSurf.position.set(loopCenterX, f3Y + 1.05, centerZ);
      staticGroup.add(beltSurf);

      // 24 Conveyor Plates (12 North Lane, 12 South Lane) with 3D Shabu Beef, Salmon Sushi, Mushrooms & Greens
      for (let i = 0; i < 12; i++) {
        const px = 152.0 + i * 1.48;
        [-0.30, 0.30].forEach((laneZ, lIdx) => {
          const pz = centerZ + laneZ;
          const plateMat = (i + lIdx) % 3 === 0 ? kcRedMat : (i + lIdx) % 3 === 1 ? kcCreamMat : kcCharcoalMat;
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.03, 12), plateMat);
          plate.position.set(px, f3Y + 1.09, pz);
          staticGroup.add(plate);

          const foodType = (i + lIdx) % 4;
          const foodMat =
            foodType === 0 ? kcBeefMat : foodType === 1 ? kcSalmonMat : foodType === 2 ? kcGreenMat : kcCreamMat;
          const food = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.14), foodMat);
          food.position.set(px, f3Y + 1.13, pz);
          staticGroup.add(food);
        });
      }

      // 14 Bar Stools + Individual Mini Induction Hot Pots (7 along North side, 7 along South side)
      for (let i = 0; i < 7; i++) {
        const sx = 152.3 + i * 2.58;
        [-1.02, 1.02].forEach((potOff) => {
          const miniPot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.10, 12), kcSteelMat);
          miniPot.position.set(sx, f3Y + 0.96, centerZ + potOff);
          staticGroup.add(miniPot);
          const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), kcTomYumMat);
          broth.position.set(sx, f3Y + 1.01, centerZ + potOff);
          staticGroup.add(broth);
        });
        [-1.58, 1.58].forEach((stoolOff) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.56, 8), kcSteelMat);
          post.position.set(sx, f3Y + 0.34, centerZ + stoolOff);
          staticGroup.add(post);
          const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.10, 12), kcRedMat);
          seat.position.set(sx, f3Y + 0.64, centerZ + stoolOff);
          staticGroup.add(seat);
        });
      }
    };

    buildConveyorLoop(73.6);
    buildConveyorLoop(83.4);

    // ZONE 3: Center-Back Live Sashimi & Broth Refill Island (X = 166.3, Z = 78.5)
    const sashBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.96, 1.9), kcCharcoalMat);
    sashBase.position.set(166.3, f3Y + 0.55, zMid);
    staticGroup.add(sashBase);
    const sashGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.52, 1.6), atriumGlassMat);
    sashGlass.position.set(166.3, f3Y + 1.30, zMid);
    staticGroup.add(sashGlass);
    const sashTray = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.2), kcSalmonMat);
    sashTray.position.set(166.3, f3Y + 1.08, zMid);
    staticGroup.add(sashTray);

    // ZONE 4: Rear Open Japanese Kitchen & Broth Pass-Through (X = 172.0..175.8)
    const kcKitchen = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.02, 16.8), kcCharcoalMat);
    kcKitchen.position.set(172.6, f3Y + 0.58, zMid);
    staticGroup.add(kcKitchen);
    const kcSteelTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.08, 16.9), kcSteelMat);
    kcSteelTop.position.set(172.6, f3Y + 1.12, zMid);
    staticGroup.add(kcSteelTop);

    const kcMenuTex = createHaidilaoMenuBoardTex(
      'KICHI-KICHI  •  NHÀ HÀNG LẨU BĂNG CHUYỀN',
      'BÒ MỸ WAGYU • CÁ HỒI SASHIMI • LẨU TOMYUM • LẨU NẤM'
    );
    const kcMenuMat = new THREE.MeshStandardMaterial({ map: kcMenuTex, roughness: 0.88 });
    const kcMenuBoard = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 1.55), kcMenuMat);
    kcMenuBoard.rotation.y = -Math.PI / 2;
    kcMenuBoard.position.set(175.95, f3Y + 3.45, zMid);
    staticGroup.add(kcMenuBoard);
  };
  buildFloor3KichiKichiRestaurant();

  // =========================================================================
  // 4F. FLOOR 3 WEST WING DINING: HP3 BBQ (Z = 48.0..67.4) & TEXAS CHICKEN (Z = 68.8..88.2)
  // Walk-In Culinary Flagships (X = 99.65..112.0, Y = 12.18 -> Floor Top 12.255)
  // =========================================================================
  const buildFloor3Hp3BbqRestaurant = () => {
    const f3Y = 12.18;
    const zStart = 48.0;
    const zEnd = 67.4;
    const zMid = (zStart + zEnd) / 2; // 57.7
    const bayW = zEnd - zStart; // 19.4m

    const bbqFloorTex = createBbqSlateFloorTex();
    const bbqFloorMat = new THREE.MeshStandardMaterial({ map: bbqFloorTex, roughness: 0.88 });
    const bbqDarkMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.88 });
    const bbqWallMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.9 });
    const bbqOakMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.88 });
    const bbqOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.88 });
    const bbqGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.88 });
    const bbqCopperMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.88 });
    const bbqSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    const bbqLeatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const bbqEmberMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.88 });
    const bbqMeatMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.88 });
    const bbqCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
    const bbqVegMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.88 });

    const bbqFasciaTex = createHp3BbqFasciaTex();
    const bbqFasciaMat = new THREE.MeshStandardMaterial({ map: bbqFasciaTex, roughness: 0.88 });
    const bbqEmbTex = createHp3BbqEmblemTex();
    const bbqEmbMat = new THREE.MeshStandardMaterial({ map: bbqEmbTex, roughness: 0.88 });

    // Floor, Back Wall (X = 99.68), Oak Wainscot Side Walls & Exposed Industrial Baffle Ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12.35, 0.14, bayW), bbqFloorMat);
    floor.position.set(105.825, f3Y + 0.005, zMid);
    staticGroup.add(floor);

    const runner = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.015, 2.4), bbqOakMat);
    runner.position.set(106.2, f3Y + 0.08, zMid);
    staticGroup.add(runner);
    [-1.24, 1.24].forEach((rz) => {
      const rTrim = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.018, 0.07), bbqOrangeMat);
      rTrim.position.set(106.2, f3Y + 0.082, zMid + rz);
      staticGroup.add(rTrim);
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(bayW, 5.25), bbqDarkMat);
    backWall.rotation.y = Math.PI / 2;
    backWall.position.set(99.68, f3Y + 2.65, zMid);
    staticGroup.add(backWall);

    [zStart + 0.02, zEnd - 0.02].forEach((sz, idx) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(12.35, 5.25), bbqWallMat);
      wall.rotation.y = idx === 0 ? 0 : Math.PI;
      wall.position.set(105.825, f3Y + 2.65, sz);
      staticGroup.add(wall);

      const dado = new THREE.Mesh(new THREE.BoxGeometry(11.9, 1.15, 0.06), bbqOakMat);
      dado.position.set(105.825, f3Y + 0.65, sz + (idx === 0 ? 0.03 : -0.03));
      staticGroup.add(dado);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.10, 0.08), bbqOrangeMat);
      stripe.position.set(105.825, f3Y + 1.26, sz + (idx === 0 ? 0.04 : -0.04));
      staticGroup.add(stripe);

      // Framed BBQ Culinary Boards along Side Walls (no repeated square logo spam)
      const sideArtTex = createHaidilaoMenuBoardTex(
        idx === 0 ? 'SƯỜN BÒ MỸ & WAGYU A5' : 'LẨU KIM CHI & HẢI SẢN TƯƠI',
        idx === 0 ? 'ƯỚP SỐT TÁO HÀN QUỐC • NƯỚNG THAN KHÔNG KHÓI' : 'TÔM SÚ • BẠCH TUỘC • RAU NẤM SẠCH'
      );
      const sideArtMat = new THREE.MeshStandardMaterial({ map: sideArtTex, roughness: 0.88 });
      const sidePoster = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.15), sideArtMat);
      sidePoster.rotation.y = idx === 0 ? 0 : Math.PI;
      sidePoster.position.set(104.4, f3Y + 2.45, sz + (idx === 0 ? 0.04 : -0.04));
      staticGroup.add(sidePoster);
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12.35, bayW), bbqDarkMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(105.825, f3Y + 5.22, zMid);
    staticGroup.add(ceiling);

    // Architectural oak ceiling beams + flush light panels
    for (let bx = 101.2; bx <= 110.6; bx += 3.1) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, bayW - 0.6), bbqOakMat);
      beam.position.set(bx, f3Y + 5.14, zMid);
      staticGroup.add(beam);
    }
    [102.4, 106.4, 109.8].forEach((lx) => {
      [51.4, 57.7, 64.0].forEach((lz) => {
        addCeilingLightPanel(lx, f3Y + 5.19, lz, 2.0, 0.68);
      });
    });

    // Storefront Portal facing +X onto Floor 3 West Balcony (Doorway Z = 54.4..61.0)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.56, 2.02, bayW - 0.08), bbqDarkMat);
    portalHeader.position.set(112.0, f3Y + 4.24, zMid);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.14, bayW - 0.08), bbqOrangeMat);
    portalTrim.position.set(112.0, f3Y + 3.22, zMid);
    staticGroup.add(portalTrim);

    const fascia = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 1.66), bbqFasciaMat);
    fascia.rotation.y = Math.PI / 2;
    fascia.position.set(112.30, f3Y + 4.24, zMid);
    staticGroup.add(fascia);

    [
      { zMin: 48.08, zMax: 54.4, zCenter: 51.24, doorEdge: 54.34 },
      { zMin: 61.0, zMax: 67.32, zCenter: 64.16, doorEdge: 61.06 },
    ].forEach((side) => {
      const segW = side.zMax - side.zMin;
      const baseWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, segW), bbqDarkMat);
      baseWall.position.set(112.0, f3Y + 0.60, side.zCenter);
      staticGroup.add(baseWall);
      const baseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, segW), bbqOrangeMat);
      baseStripe.position.set(112.0, f3Y + 1.14, side.zCenter);
      staticGroup.add(baseStripe);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(segW - 0.3, 2.05), atriumGlassMat);
      glassPane.rotation.y = Math.PI / 2;
      glassPane.position.set(112.12, f3Y + 2.18, side.zCenter);
      staticGroup.add(glassPane);

      for (let gz = side.zMin + 0.65; gz <= side.zMax - 0.65; gz += 0.86) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.04, 0.08), bbqOakMat);
        louver.position.set(112.05, f3Y + 2.18, gz);
        staticGroup.add(louver);
      }

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.54, 3.22, 0.54), bbqOrangeMat);
      pillar.position.set(112.0, f3Y + 1.66, side.doorEdge);
      staticGroup.add(pillar);
    });

    // Warm industrial copper pendant lights along storefront canopy
    [50.2, 53.0, 62.4, 65.2].forEach((lz) => {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), bbqDarkMat);
      wire.position.set(112.55, f3Y + 3.45, lz);
      staticGroup.add(wire);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.24, 14), bbqCopperMat);
      shade.position.set(112.55, f3Y + 3.10, lz);
      staticGroup.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), ceilingLampLensMat);
      bulb.position.set(112.55, f3Y + 2.98, lz);
      staticGroup.add(bulb);
    });

    // ZONE 1A (Front-South X=108.4..110.9, Z=62.5..66.6): Hostess Reception Desk with Menu Welcome Board & Bench
    const recWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 3.0), bbqDarkMat);
    recWall.position.set(108.5, f3Y + 1.62, 64.5);
    staticGroup.add(recWall);
    const recBoardTex = createHaidilaoMenuBoardTex('QUẦY LỄ TÂN & ĐẶT BÀN', 'BUFFET NƯỚNG LẨU KHÔNG KHÓI');
    const recBoardMat = new THREE.MeshStandardMaterial({ map: recBoardTex, roughness: 0.88 });
    const recBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.85), recBoardMat);
    recBoard.rotation.y = Math.PI / 2;
    recBoard.position.set(108.66, f3Y + 2.25, 64.5);
    staticGroup.add(recBoard);

    const recDesk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.04, 2.5), bbqOakMat);
    recDesk.position.set(110.2, f3Y + 0.59, 64.2);
    staticGroup.add(recDesk);
    const recDeskTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 2.52), bbqOrangeMat);
    recDeskTrim.position.set(110.68, f3Y + 0.96, 64.2);
    staticGroup.add(recDeskTrim);
    const waitBench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.72), bbqLeatherMat);
    waitBench.position.set(109.8, f3Y + 0.31, 66.2);
    staticGroup.add(waitBench);

    // ZONE 1B (Front-North X=107.6..110.8, Z=48.8..52.2): Salad, Banchan, Kimchi & Dessert Buffet Line + Overhead Sign
    const bufBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.94, 1.15), bbqDarkMat);
    bufBase.position.set(109.2, f3Y + 0.54, 49.6);
    staticGroup.add(bufBase);
    const bufTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 1.25), bbqSteelMat);
    bufTop.position.set(109.2, f3Y + 1.05, 49.6);
    staticGroup.add(bufTop);
    for (let bx = 107.9; bx <= 110.5; bx += 0.65) {
      const pan = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.10, 0.72), bbqSteelMat);
      pan.position.set(bx, f3Y + 1.13, 49.6);
      staticGroup.add(pan);
      const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.05, 0.62),
        Math.round(bx * 2) % 2 === 0 ? bbqVegMat : bbqEmberMat
      );
      item.position.set(bx, f3Y + 1.18, 49.6);
      staticGroup.add(item);
    }
    const bufBannerTex = createHaidilaoMenuBoardTex('QUẦY LINE BUFFET 50+ MÓN', 'SALAD • KIMCHI • SÚP • TRÁNG MIỆNG');
    const bufBannerMat = new THREE.MeshStandardMaterial({ map: bufBannerTex, roughness: 0.88 });
    const bufBanner = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.88), bufBannerMat);
    bufBanner.position.set(109.2, f3Y + 2.85, 48.08);
    staticGroup.add(bufBanner);

    // Helper: Build Smokeless Korean-Japanese BBQ Grill Table + Telescopic Exhaust Hood
    const buildBbqGrillTable = (tx: number, tz: number, isBooth: boolean) => {
      const tg = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.68, 0.50), bbqDarkMat);
      ped.position.y = 0.41;
      tg.add(ped);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, isBooth ? 1.18 : 1.32), bbqOakMat);
      top.position.y = 0.78;
      tg.add(top);

      // Recessed charcoal grill + glowing embers + stainless grate + sizzling cuts
      const grillRing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), bbqSteelMat);
      grillRing.position.y = 0.83;
      tg.add(grillRing);
      const charcoal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 14), bbqEmberMat);
      charcoal.position.y = 0.855;
      tg.add(charcoal);
      const meatSlice = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.10), bbqMeatMat);
      meatSlice.position.set(-0.04, 0.88, 0.02);
      tg.add(meatSlice);

      // Side Wagyu meat tray + lettuce bowl + dipping sauce + drinks
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.22), bbqCreamMat);
      tray.position.set(0.46, 0.84, 0.22);
      tg.add(tray);
      const beef = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), bbqMeatMat);
      beef.position.set(0.46, 0.87, 0.22);
      tg.add(beef);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.14, 10), bbqGoldMat);
      mug.position.set(-0.46, 0.89, -0.26);
      tg.add(mug);

      // Iconic Telescopic Black & Copper Smokeless Exhaust Hood descending from ceiling
      const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.15, 12), bbqDarkMat);
      duct.position.y = 3.60;
      tg.add(duct);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), bbqCopperMat);
      collar.position.y = 2.40;
      tg.add(collar);
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.38, 14), bbqCopperMat);
      hood.position.y = 1.98;
      tg.add(hood);
      const hoodRim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 14), bbqSteelMat);
      hoodRim.position.y = 1.80;
      tg.add(hoodRim);

      tg.position.set(tx, f3Y, tz);
      staticGroup.add(tg);
    };

    // ZONE 2A: 4 Signature BBQ Grill Booths (2 North @ Z=51.0, 2 South @ Z=64.4)
    [102.4, 106.4].forEach((bx) => {
      [51.0, 64.4].forEach((bz) => {
        [-1.08, 1.08].forEach((dz) => {
          const seat = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.44, 0.60), bbqLeatherMat);
          seat.position.set(bx, f3Y + 0.29, bz + dz);
          staticGroup.add(seat);
          const back = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.02, 0.16), bbqDarkMat);
          back.position.set(bx, f3Y + 0.62, bz + dz * 1.24);
          staticGroup.add(back);
        });
        buildBbqGrillTable(bx, bz, true);
      });
    });

    // ZONE 2B: 2 Center Smokeless Grill Tables (X=104.4 at Z=55.1 & Z=60.3) -> 3.0m clear aisle Z=56.2..59.2!
    [55.1, 60.3].forEach((tz) => {
      buildBbqGrillTable(104.4, tz, false);
      [-0.92, 0.92].forEach((ox) => {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 12), bbqLeatherMat);
        stool.position.set(104.4 + ox, f3Y + 0.29, tz);
        staticGroup.add(stool);
      });
    });

    // ZONE 3: Rear Open Butcher, Wagyu Showcase & Centerpiece HP3 BBQ Logo Wall (X = 99.8..101.2)
    const meatCounter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.02, 16.0), bbqDarkMat);
    meatCounter.position.set(100.6, f3Y + 0.58, zMid);
    staticGroup.add(meatCounter);
    const meatGlass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.54, 15.6), atriumGlassMat);
    meatGlass.position.set(100.7, f3Y + 1.34, zMid);
    staticGroup.add(meatGlass);
    for (let mz = 51.0; mz <= 64.5; mz += 2.2) {
      const steakTray = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.95), bbqMeatMat);
      steakTray.position.set(100.6, f3Y + 1.14, mz);
      staticGroup.add(steakTray);
    }

    // Centerpiece HP3 BBQ Hero Logo Plaque + Flanking Illuminated Menu Boards on Rear Wall
    const rearLogo = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.15), bbqEmbMat);
    rearLogo.rotation.y = Math.PI / 2;
    rearLogo.position.set(99.84, f3Y + 3.45, zMid);
    staticGroup.add(rearLogo);

    [
      { z: 52.8, title: 'HP3 BBQ  •  THỊT BÒ MỸ & WAGYU', sub: 'BA CHỈ MỸ • DẺ SƯỜN • NẠC VAI ƯỚP SỐT' },
      { z: 62.6, title: 'HẢI SẢN TƯƠI & LẨU KHÔNG KHÓI', sub: 'TÔM SÚ • BẠCH TUỘC • LẨU KIM CHI CAY' },
    ].forEach((mb) => {
      const mTex = createHaidilaoMenuBoardTex(mb.title, mb.sub);
      const mMat = new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.88 });
      const mMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.55), mMat);
      mMesh.rotation.y = Math.PI / 2;
      mMesh.position.set(99.82, f3Y + 3.45, mb.z);
      staticGroup.add(mMesh);
    });
  };
  buildFloor3Hp3BbqRestaurant();

  const buildFloor3TexasChickenRestaurant = () => {
    const f3Y = 12.18;
    const zStart = 68.8;
    const zEnd = 88.2;
    const zMid = (zStart + zEnd) / 2; // 78.5
    const bayW = zEnd - zStart; // 19.4m

    const txTileTex = createTexasTileTex();
    const txFloorMat = new THREE.MeshStandardMaterial({ map: txTileTex, roughness: 0.88 });
    const txCreamWallMat = new THREE.MeshStandardMaterial({ color: 0xf5efe6, roughness: 0.9 });
    const txRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.88 });
    const txYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.88 });
    const txOakMat = new THREE.MeshStandardMaterial({ color: 0xc28549, roughness: 0.88 });
    const txDarkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const txSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    const txCrispyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.88 });
    const txWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.88 });

    const txFasciaTex = createTexasChickenFasciaTex();
    const txFasciaMat = new THREE.MeshStandardMaterial({ map: txFasciaTex, roughness: 0.88 });
    const txEmbTex = createTexasChickenEmblemTex();
    const txEmbMat = new THREE.MeshStandardMaterial({ map: txEmbTex, roughness: 0.88 });

    // Floor, Oak-Wainscot Cream Walls & Ribbed Bright Ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12.35, 0.14, bayW), txFloorMat);
    floor.position.set(105.825, f3Y + 0.005, zMid);
    staticGroup.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(bayW, 5.25), txDarkMat);
    backWall.rotation.y = Math.PI / 2;
    backWall.position.set(99.68, f3Y + 2.65, zMid);
    staticGroup.add(backWall);

    [zStart + 0.02, zEnd - 0.02].forEach((sz, idx) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(12.35, 5.25), txCreamWallMat);
      wall.rotation.y = idx === 0 ? 0 : Math.PI;
      wall.position.set(105.825, f3Y + 2.65, sz);
      staticGroup.add(wall);

      const oakDado = new THREE.Mesh(new THREE.BoxGeometry(11.9, 1.10, 0.06), txOakMat);
      oakDado.position.set(105.825, f3Y + 0.62, sz + (idx === 0 ? 0.03 : -0.03));
      staticGroup.add(oakDado);
      const redStripe = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.20, 0.06), txRedMat);
      redStripe.position.set(105.825, f3Y + 3.12, sz + (idx === 0 ? 0.03 : -0.03));
      staticGroup.add(redStripe);
      const yellowStripe = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.10, 0.06), txYellowMat);
      yellowStripe.position.set(105.825, f3Y + 2.94, sz + (idx === 0 ? 0.03 : -0.03));
      staticGroup.add(yellowStripe);

      // Crisp Food & Quality Promo Boards on North & South Walls (avoid repeating square logo)
      const sideTex = createTexasMenuBoardTex(
        idx === 0 ? 'GÀ RÁN TƯƠI MỖI NGÀY' : 'BÁNH QUY BƠ MẬT ONG',
        idx === 0 ? 'GIÒN RỤM TỪNG MIẾNG • CHUẨN VỊ MỸ TỪ 1952' : 'FREE REFILL NƯỚC NGỌT CỰC ĐÃ'
      );
      const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.88 });
      const sideLogo = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.10), sideMat);
      sideLogo.rotation.y = idx === 0 ? 0 : Math.PI;
      sideLogo.position.set(106.4, f3Y + 2.08, sz + (idx === 0 ? 0.05 : -0.05));
      staticGroup.add(sideLogo);
    });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12.35, bayW), txCreamWallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(105.825, f3Y + 5.22, zMid);
    staticGroup.add(ceiling);

    for (let bx = 101.2; bx <= 110.6; bx += 3.1) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, bayW - 0.6), txOakMat);
      rib.position.set(bx, f3Y + 5.15, zMid);
      staticGroup.add(rib);
    }
    [102.4, 106.4, 109.8].forEach((lx) => {
      [72.2, 78.5, 84.8].forEach((lz) => {
        addCeilingLightPanel(lx, f3Y + 5.19, lz, 2.0, 0.70);
      });
    });

    // Storefront Portal facing +X onto Floor 3 West Balcony (Doorway Z = 75.2..81.8)
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(0.56, 2.02, bayW - 0.08), txRedMat);
    portalHeader.position.set(112.0, f3Y + 4.24, zMid);
    staticGroup.add(portalHeader);
    const portalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.16, bayW - 0.08), txYellowMat);
    portalTrim.position.set(112.0, f3Y + 3.22, zMid);
    staticGroup.add(portalTrim);

    const fascia = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 1.66), txFasciaMat);
    fascia.rotation.y = Math.PI / 2;
    fascia.position.set(112.30, f3Y + 4.24, zMid);
    staticGroup.add(fascia);

    [
      { zMin: 68.88, zMax: 75.2, zCenter: 72.04, doorEdge: 75.14 },
      { zMin: 81.8, zMax: 88.12, zCenter: 84.96, doorEdge: 81.86 },
    ].forEach((side) => {
      const segW = side.zMax - side.zMin;
      const baseWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, segW), txRedMat);
      baseWall.position.set(112.0, f3Y + 0.60, side.zCenter);
      staticGroup.add(baseWall);
      const baseYellow = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.10, segW), txYellowMat);
      baseYellow.position.set(112.0, f3Y + 1.15, side.zCenter);
      staticGroup.add(baseYellow);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(segW - 0.3, 2.05), atriumGlassMat);
      glassPane.rotation.y = Math.PI / 2;
      glassPane.position.set(112.12, f3Y + 2.18, side.zCenter);
      staticGroup.add(glassPane);

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.54, 3.22, 0.54), txRedMat);
      pillar.position.set(112.0, f3Y + 1.66, side.doorEdge);
      staticGroup.add(pillar);
      const pCap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.58), txYellowMat);
      pCap.position.set(112.0, f3Y + 3.16, side.doorEdge);
      staticGroup.add(pCap);
    });

    // Signature Red & Yellow Dome Pendant Lamps along storefront & interior center tables
    [71.0, 73.8, 83.2, 86.0].forEach((lz, idx) => {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
        idx % 2 === 0 ? txRedMat : txYellowMat
      );
      dome.position.set(112.55, f3Y + 3.05, lz);
      staticGroup.add(dome);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), ceilingLampLensMat);
      bulb.position.set(112.55, f3Y + 2.98, lz);
      staticGroup.add(bulb);
    });

    // ZONE 1A (Front-North X=110.2..111.3, Z=69.6..74.4): Sunny Window Bar & Red Stools
    const winBar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.98, 4.4), txOakMat);
    winBar.position.set(111.0, f3Y + 0.56, 72.0);
    staticGroup.add(winBar);
    [70.4, 71.5, 72.6, 73.7].forEach((sz) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.68, 12), txRedMat);
      stool.position.set(110.35, f3Y + 0.41, sz);
      staticGroup.add(stool);
    });

    // ZONE 1B (Front-South X=109.8..110.8, Z=83.0..87.2): Self-Order Touchscreen Kiosks with Texas Screen
    const kioskScreenTex = createTexasMenuBoardTex('ĐẶT MÓN TỰ ĐỘNG', 'CHẠM ĐỂ CHỌN COMBO');
    const kioskScreenMat = new THREE.MeshStandardMaterial({ map: kioskScreenTex, roughness: 0.88 });
    [83.8, 85.8].forEach((kz) => {
      const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.75, 0.65), txDarkMat);
      kiosk.position.set(110.2, f3Y + 0.95, kz);
      staticGroup.add(kiosk);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.74), kioskScreenMat);
      screen.rotation.y = -Math.PI / 2;
      screen.position.set(109.91, f3Y + 1.32, kz);
      staticGroup.add(screen);
    });

    // Helper: Build Fast-Casual Dining Table + Fried Chicken Bucket, Fries & Biscuit Tray + Hanging Pendant Dome
    const buildTexasTable = (tx: number, tz: number, isHigh: boolean, idx: number) => {
      const tg = new THREE.Group();
      const h = isHigh ? 0.96 : 0.74;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.26, h, 10), txDarkMat);
      ped.position.y = h / 2 + 0.05;
      tg.add(ped);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.07, 1.12), txOakMat);
      top.position.y = h + 0.06;
      tg.add(top);

      // Iconic Red & Yellow Striped Texas Chicken Bucket + Golden Crispy Chicken Tenders
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 12), txRedMat);
      bucket.position.set(-0.22, h + 0.20, -0.10);
      tg.add(bucket);
      const bucketBand = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.155, 0.05, 12), txYellowMat);
      bucketBand.position.set(-0.22, h + 0.24, -0.10);
      tg.add(bucketBand);
      const chickenTop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), txCrispyMat);
      chickenTop.position.set(-0.22, h + 0.30, -0.10);
      tg.add(chickenTop);

      // Tray + Honey-Butter Biscuits & Drink Cup
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.28), txYellowMat);
      tray.position.set(0.24, h + 0.11, 0.16);
      tg.add(tray);
      const biscuit = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 10), txCrispyMat);
      biscuit.position.set(0.24, h + 0.14, 0.16);
      tg.add(biscuit);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 10), txRedMat);
      cup.position.set(0.32, h + 0.20, -0.18);
      tg.add(cup);

      // Overhead pendant dome centered above table
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.35, 6), txDarkMat);
      cord.position.y = 3.95;
      tg.add(cord);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
        idx % 2 === 0 ? txRedMat : txYellowMat
      );
      dome.position.y = 2.80;
      tg.add(dome);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), ceilingLampLensMat);
      bulb.position.y = 2.74;
      tg.add(bulb);

      tg.position.set(tx, f3Y, tz);
      staticGroup.add(tg);
    };

    // ZONE 2A: 4 Bright Crimson & Oak Booths (2 North @ Z=71.2, 2 South @ Z=85.8)
    [104.9, 108.0].forEach((bx, bIdx) => {
      [71.2, 85.8].forEach((bz, zIdx) => {
        [-0.95, 0.95].forEach((dz) => {
          const bench = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.44, 0.56), txRedMat);
          bench.position.set(bx, f3Y + 0.29, bz + dz);
          staticGroup.add(bench);
        });
        buildTexasTable(bx, bz, false, bIdx + zIdx);
      });
    });

    // ZONE 2B: 2 Center High-Top Tables (X=106.4 at Z=75.4 & Z=81.6) -> 3.8m wide center walkway!
    [75.4, 81.6].forEach((tz, tIdx) => {
      buildTexasTable(106.4, tz, true, tIdx);
      [-0.86, 0.86].forEach((ox, idx) => {
        const stool = new THREE.Mesh(
          new THREE.CylinderGeometry(0.20, 0.20, 0.66, 12),
          idx === 0 ? txRedMat : txYellowMat
        );
        stool.position.set(106.4 + ox, f3Y + 0.40, tz);
        staticGroup.add(stool);
      });
    });

    // ZONE 3: Full-Width Order Counter, Branded Apron Logos, Warmer Chutes, Drink Tower & Digital Menu Boards
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.04, 16.4), txWhiteMat);
    counter.position.set(102.0, f3Y + 0.59, zMid);
    staticGroup.add(counter);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 16.5), txOakMat);
    counterTop.position.set(102.0, f3Y + 1.14, zMid);
    staticGroup.add(counterTop);
    const counterStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 16.4), txRedMat);
    counterStripe.position.set(102.54, f3Y + 0.95, zMid);
    staticGroup.add(counterStripe);

    // Order Counter POS terminals (clean apron without repeated logo stickers)
    [74.5, 78.5, 82.5].forEach((pz) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.42), txDarkMat);
      pos.position.set(102.1, f3Y + 1.34, pz);
      staticGroup.add(pos);
    });

    const warmerChute = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 2.8), txSteelMat);
    warmerChute.position.set(100.8, f3Y + 1.25, 78.5);
    staticGroup.add(warmerChute);
    const drinkTower = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.45, 1.6), txRedMat);
    drinkTower.position.set(101.8, f3Y + 1.15, 86.2);
    staticGroup.add(drinkTower);

    // Centerpiece Texas Chicken Logo + 2 Flanking Illuminated Digital QSR Menu Boards on Rear Wall (X = 99.82)
    const rearLogo = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.15), txEmbMat);
    rearLogo.rotation.y = Math.PI / 2;
    rearLogo.position.set(99.84, f3Y + 3.45, zMid);
    staticGroup.add(rearLogo);

    [
      { z: 72.8, title: 'COMBO GÀ RÁN GIÒN TƯƠI', sub: '2 MIẾNG GÀ + KHOAI + NƯỚC CHỈ 89K' },
      { z: 84.2, title: 'BÁNH QUY BƠ MẬT ONG TRỨNG MUỐI', sub: 'GÀ SỐT MẬT ONG • FREE REFILL NƯỚC NGỌT' },
    ].forEach((mb) => {
      const mTex = createTexasMenuBoardTex(mb.title, mb.sub);
      const mMat = new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.88 });
      const mMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.55), mMat);
      mMesh.rotation.y = Math.PI / 2;
      mMesh.position.set(99.82, f3Y + 3.45, mb.z);
      staticGroup.add(mMesh);
    });
  };
  buildFloor3TexasChickenRestaurant();

  // =========================================================================
  // 4G. FLOOR 3 SOUTH WING FLAGSHIP: CGV CINEMAS • CULTUREPLEX (3 WALK-IN SCREENING HALLS!)
  // Grand Lobby + Hall 1 IMAX LASER + Hall 2 GOLD CLASS VIP + Hall 3 4DX MOTION
  // =========================================================================
  const buildFloor3CgvCinema = () => {
    const f3Y = 12.18;
    const cgvCarpetTex = createCgvLobbyCarpetTex();
    const cgvCarpetMat = new THREE.MeshStandardMaterial({ map: cgvCarpetTex, roughness: 0.92 });
    const cgvRedCarpetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.92 });
    const cgvVelvetMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.9 });
    const cgvGoldLeatherMat = new THREE.MeshStandardMaterial({ color: 0xc89b54, roughness: 0.88 });
    const cgv4dxBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.88 });
    const cgvSweetPinkMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.9 });
    const cgvBrickMat = new THREE.MeshStandardMaterial({ color: 0x5c241d, roughness: 0.92 });
    const cgvCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const cgvTheaterBlackMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.94 });
    const cgvWalnutMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.88 });
    const cgvBrassMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.85, metalness: 0.1 });
    const cgvCrimsonMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.88 });
    const cgvPopcornMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.88 });
    const cgvCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 });

    // Walkable Floor (31.2m × 34.0m) + Red Carpet Promenade & 3 Hall Runners
    const cFloor = new THREE.Mesh(new THREE.BoxGeometry(31.2, 0.02, 34.0), cgvCarpetMat);
    cFloor.position.set(128.0, f3Y + 0.065, 108.15);
    staticGroup.add(cFloor);

    const lobbyRunner = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.012, 16.0), cgvRedCarpetMat);
    lobbyRunner.position.set(128.0, f3Y + 0.075, 99.1);
    staticGroup.add(lobbyRunner);

    // Transverse corridor red carpet linking Hall 1, Hall 2 & Hall 3 doors (Z = 104.2..106.8)
    const hallFoyerCarpet = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.013, 2.5), cgvRedCarpetMat);
    hallFoyerCarpet.position.set(128.0, f3Y + 0.075, 105.45);
    staticGroup.add(hallFoyerCarpet);

    [125.75, 130.25].forEach((tx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.014, 15.8), cgvBrassMat);
      strip.position.set(tx, f3Y + 0.076, 99.1);
      staticGroup.add(strip);
    });

    // Enclosure Side & Back Walls + Coffered Lobby Ceiling + High 3-Hall Auditorium Ceiling
    const westWall = new THREE.Mesh(new THREE.PlaneGeometry(34.0, 8.5), cgvCharcoalMat);
    westWall.rotation.y = Math.PI / 2;
    westWall.position.set(112.42, f3Y + 4.30, 108.15);
    staticGroup.add(westWall);

    const eastWall = new THREE.Mesh(new THREE.PlaneGeometry(34.0, 8.5), cgvCharcoalMat);
    eastWall.rotation.y = -Math.PI / 2;
    eastWall.position.set(143.58, f3Y + 4.30, 108.15);
    staticGroup.add(eastWall);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(31.2, 8.5), cgvTheaterBlackMat);
    backWall.rotation.y = Math.PI;
    backWall.position.set(128.0, f3Y + 4.30, 125.12);
    staticGroup.add(backWall);

    [112.45, 143.55].forEach((wx) => {
      const brick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 15.6), cgvBrickMat);
      brick.position.set(wx, f3Y + 0.82, 99.1);
      staticGroup.add(brick);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 15.6), cgvBrassMat);
      rail.position.set(wx, f3Y + 1.58, 99.1);
      staticGroup.add(rail);
    });

    const lobbyCeiling = new THREE.Mesh(new THREE.PlaneGeometry(31.2, 16.1), cgvCharcoalMat);
    lobbyCeiling.rotation.x = Math.PI / 2;
    lobbyCeiling.position.set(128.0, f3Y + 6.18, 99.15);
    staticGroup.add(lobbyCeiling);

    const audCeiling = new THREE.Mesh(new THREE.PlaneGeometry(31.2, 18.0), cgvTheaterBlackMat);
    audCeiling.rotation.x = Math.PI / 2;
    audCeiling.position.set(128.0, f3Y + 8.38, 116.15);
    staticGroup.add(audCeiling);

    [94.2, 98.8, 103.4].forEach((bz) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(31.0, 0.24, 0.24), cgvTheaterBlackMat);
      beam.position.set(128.0, f3Y + 6.06, bz);
      staticGroup.add(beam);
    });
    [119.5, 128.0, 136.5].forEach((cx) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), cgvBrassMat);
      stem.position.set(cx, f3Y + 5.82, 98.8);
      staticGroup.add(stem);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.08, 10, 28), cgvBrassMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, f3Y + 5.46, 98.8);
      staticGroup.add(ring);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.055, 8, 28), ceilingLampLensMat);
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.set(cx, f3Y + 5.40, 98.8);
      staticGroup.add(glowRing);
    });

    // =========================================================================
    // 11 REAL MOVIE POSTERS & 4 PROMOTIONAL AD POSTERS (/assets/cgv/*)
    // Loaded from verified local assets (no CORS) with procedural fallback
    // =========================================================================
    const posterData = [
      { url: '/assets/cgv/film_01.jpg', title: 'HUYẾT THỐNG', sub: 'PHIM ĐANG CHIẾU', tag: 'BOM TẤN MỚI', c1: '#450a0a', c2: '#991b1b', acc: '#fde047', rate: 'T18' },
      { url: '/assets/cgv/film_02.jpg', title: 'SIÊU PHẨM RẠP', sub: 'IMAX  •  2D', tag: 'ĐANG CHIẾU TẠI CGV', c1: '#1e1b4b', c2: '#be123c', acc: '#38bdf8', rate: 'T13' },
      { url: '/assets/cgv/film_03.jpg', title: 'TÀI • PHIM VIỆT', sub: 'CGV EXCLUSIVE', tag: 'CHÁY VÉ TẠI CGV', c1: '#4c0519', c2: '#9f1239', acc: '#fda4af', rate: 'T16' },
      { url: '/assets/cgv/film_04.jpg', title: 'BOM TẤN HÀNH ĐỘNG', sub: '4DX MOTION • DOLBY', tag: 'ĐANG CHIẾU TẠI CGV', c1: '#0f172a', c2: '#0369a1', acc: '#38bdf8', rate: 'T13' },
      { url: '/assets/cgv/film_05.jpg', title: 'PHIÊU LƯU KỲ THÚ', sub: 'LỒNG TIẾNG  •  2D', tag: 'PHIM HOT TUẦN NÀY', c1: '#3b0764', c2: '#7e22ce', acc: '#facc15', rate: 'P' },
      { url: '/assets/cgv/film_06.jpg', title: 'ĐẠI CHIẾN ĐIỆN ẢNH', sub: 'GOLD CLASS  •  IMAX', tag: 'KHỞI CHIẾU TUẦN NÀY', c1: '#450a0a', c2: '#dc2626', acc: '#facc15', rate: 'T16' },
      { url: '/assets/cgv/film_07.jpg', title: 'PHIM ĐẶC BIỆT', sub: '2D  •  SWEETBOX', tag: 'SUẤT CHIẾU ĐẶC BIỆT', c1: '#451a03', c2: '#d97706', acc: '#fef08a', rate: 'T13' },
      { url: '/assets/cgv/film_08.jpg', title: 'TÁC PHẨM MỚI', sub: 'PHỤ ĐỀ & LỒNG TIẾNG', tag: 'ĐANG CHIẾU TẠI CGV', c1: '#064e3b', c2: '#15803d', acc: '#fde047', rate: 'P' },
      { url: '/assets/cgv/film_09.jpg', title: 'PHIM HẤP DẪN', sub: 'IMAX LASER', tag: 'ĐANG CHIẾU', c1: '#500724', c2: '#db2777', acc: '#22d3ee', rate: 'T13' },
      { url: '/assets/cgv/film_10.jpg', title: 'CONAN MOVIE', sub: 'THÁM TỬ LỪNG DANH', tag: 'ANIME ĐẶC BIỆT', c1: '#172554', c2: '#312e81', acc: '#facc15', rate: 'K' },
      { url: '/assets/cgv/film_11.jpg', title: 'BÒ SỮA BAY', sub: 'HOẠT HÌNH GIA ĐÌNH', tag: 'CUỐI TUẦN VUI VẺ', c1: '#052e16', c2: '#166534', acc: '#f472b6', rate: 'P' },
    ];
    const adPosterData = [
      { url: '/assets/cgv/ad_01.jpg', title: 'ƯU ĐÃI ĐẶC BIỆT', sub: 'MI6 • CGV PROMO', tag: 'QUẢNG CÁO CGV', c1: '#1e293b', c2: '#b91c1c', acc: '#fde047', rate: 'AD' },
      { url: '/assets/cgv/ad_02.jpg', title: 'PHI HỒNG • ƯU ĐÃI', sub: 'CGV MEMBERSHIP', tag: 'QUẢNG CÁO HOT', c1: '#4c0519', c2: '#db2777', acc: '#fef08a', rate: 'AD' },
      { url: '/assets/cgv/ad_03.jpg', title: 'KHUYẾN MÃI CGV', sub: 'COMBO & THẺ THÀNH VIÊN', tag: 'QUẢNG CÁO', c1: '#1e1b4b', c2: '#2563eb', acc: '#facc15', rate: 'AD' },
      { url: '/assets/cgv/ad_04.jpg', title: 'NVC REFILL COMBO', sub: 'BỎNG NƯỚC THẢ GA', tag: 'QUẢNG CÁO BỎNG NƯỚC', c1: '#450a0a', c2: '#ea580c', acc: '#fde047', rate: 'AD' },
    ];

    const cgvTexLoader = new THREE.TextureLoader();
    const createSyncedPosterMat = (pc: (typeof posterData)[number]) => {
      const mat = new THREE.MeshStandardMaterial({
        map: createCgvMoviePosterTex(pc.title, pc.sub, pc.tag, pc.c1, pc.c2, pc.acc, pc.rate),
        roughness: 0.88,
      });
      if (typeof window !== 'undefined') {
        cgvTexLoader.load(pc.url, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          mat.map = tex;
          mat.needsUpdate = true;
        });
      }
      return mat;
    };

    const posterMats = posterData.map(createSyncedPosterMat);
    const adMats = adPosterData.map(createSyncedPosterMat);

    const cgvEmbTex = createCgvLogoEmblemTex();
    const cgvEmbMat = new THREE.MeshStandardMaterial({ map: cgvEmbTex, roughness: 0.88 });
    if (typeof window !== 'undefined') {
      cgvTexLoader.load('/assets/cgv/cgv_logo.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        cgvEmbMat.map = tex;
        cgvEmbMat.needsUpdate = true;
      });
    }

    // =========================================================================
    // STOREFRONT FACADE, GLASS ENTRANCE DOORS & ATRIUM MEGA MARQUEE (Z = 91.15)
    // =========================================================================
    const cgvPortalHeader = new THREE.Mesh(new THREE.BoxGeometry(31.2, 2.15, 0.50), cgvCharcoalMat);
    cgvPortalHeader.position.set(128.0, f3Y + 5.20, 91.15);
    staticGroup.add(cgvPortalHeader);
    const cgvHeaderTrim = new THREE.Mesh(new THREE.BoxGeometry(31.2, 0.12, 0.56), cgvBrassMat);
    cgvHeaderTrim.position.set(128.0, f3Y + 4.14, 91.15);
    staticGroup.add(cgvHeaderTrim);
    const cgvCrimsonBand = new THREE.Mesh(new THREE.BoxGeometry(31.2, 0.12, 0.56), cgvCrimsonMat);
    cgvCrimsonBand.position.set(128.0, f3Y + 6.22, 91.15);
    staticGroup.add(cgvCrimsonBand);

    const cgvFasciaTex = createCgvMarqueeTex();
    const cgvFasciaMat = new THREE.MeshStandardMaterial({ map: cgvFasciaTex, roughness: 0.88 });
    const cgvFascia = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 1.65), cgvFasciaMat);
    cgvFascia.rotation.y = Math.PI;
    cgvFascia.position.set(128.0, f3Y + 5.20, 90.88);
    staticGroup.add(cgvFascia);

    // Sleek Architectural Vertical Brushed-Brass Rib Accent Sconces flanking Storefront Fascia
    [114.2, 117.4, 138.6, 141.8].forEach((sx) => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.50, 0.10), cgvBrassMat);
      rib.position.set(sx, f3Y + 5.20, 90.88);
      staticGroup.add(rib);
    });

    // 1 Large Standalone Official CGV Logo Plaque on Upper Atrium Wall (visible across all 3 Mall Floors!)
    const megaBox = new THREE.Mesh(new THREE.BoxGeometry(4.85, 4.85, 0.28), cgvCharcoalMat);
    megaBox.position.set(128.0, 21.45, 91.10);
    staticGroup.add(megaBox);
    const megaBrass = new THREE.Mesh(new THREE.BoxGeometry(4.62, 4.62, 0.29), cgvBrassMat);
    megaBrass.position.set(128.0, 21.45, 91.09);
    staticGroup.add(megaBrass);
    const cgvMegaSign = new THREE.Mesh(new THREE.PlaneGeometry(4.42, 4.42), cgvEmbMat);
    cgvMegaSign.rotation.y = Math.PI;
    cgvMegaSign.position.set(128.0, 21.45, 90.92);
    staticGroup.add(cgvMegaSign);

    // 2 Sleek Two-Sided Projecting CGV Blade Signs along Floor 3 Back Bridge
    [120.8, 135.2].forEach((bx) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.95), cgvBrassMat);
      bracket.position.set(bx, f3Y + 3.45, 90.62);
      staticGroup.add(bracket);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.24, 1.24), cgvCharcoalMat);
      housing.position.set(bx, f3Y + 3.45, 90.35);
      staticGroup.add(housing);
      const bladeW = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.16), cgvEmbMat);
      bladeW.rotation.y = -Math.PI / 2;
      bladeW.position.set(bx - 0.08, f3Y + 3.45, 90.35);
      staticGroup.add(bladeW);
      const bladeE = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.16), cgvEmbMat);
      bladeE.rotation.y = Math.PI / 2;
      bladeE.position.set(bx + 0.08, f3Y + 3.45, 90.35);
      staticGroup.add(bladeE);
    });

    // Flanking Brick-Red Movie Poster Facade Wings (6 Posters facing Back Bridge)
    [
      { x: 116.7, w: 8.6, pilX: 120.92 },
      { x: 139.3, w: 8.6, pilX: 135.08 },
    ].forEach((wing) => {
      const wWall = new THREE.Mesh(new THREE.BoxGeometry(wing.w, 4.10, 0.32), cgvBrickMat);
      wWall.position.set(wing.x, f3Y + 2.12, 91.15);
      staticGroup.add(wWall);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.18, 0.44), cgvCharcoalMat);
      pil.position.set(wing.pilX, f3Y + 2.16, 91.15);
      staticGroup.add(pil);
      const pilTrim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.48), cgvBrassMat);
      pilTrim.position.set(wing.pilX, f3Y + 0.14, 91.15);
      staticGroup.add(pilTrim);
    });

    [114.0, 116.7, 119.4, 136.6, 139.3, 142.0].forEach((px, idx) => {
      const pFrame = new THREE.Mesh(new THREE.BoxGeometry(1.76, 2.58, 0.12), cgvCharcoalMat);
      pFrame.position.set(px, f3Y + 2.22, 90.96);
      staticGroup.add(pFrame);
      const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 2.34), posterMats[idx]);
      pMesh.rotation.y = Math.PI;
      pMesh.position.set(px, f3Y + 2.22, 90.89);
      staticGroup.add(pMesh);
    });

    // Main Entrance Glass Sidelights (X=121.0..123.4 & 132.6..135.0) + Swung-Open Double Glass Doors (walkable X=123.6..132.4!)
    [
      { x: 122.2, leafX: 123.4, rotY: 1.15 },
      { x: 133.8, leafX: 132.6, rotY: -1.15 },
    ].forEach((ent) => {
      const sidePane = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 3.95), atriumGlassMat);
      sidePane.position.set(ent.x, f3Y + 2.05, 91.15);
      staticGroup.add(sidePane);
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.10, 0.22), cgvCharcoalMat);
      mullion.position.set(ent.leafX, f3Y + 2.12, 91.15);
      staticGroup.add(mullion);

      // Hinged-open glass cinema entrance door leaf with brass push bar
      const doorLeaf = new THREE.Group();
      doorLeaf.position.set(ent.leafX, f3Y + 0.08, 91.15);
      doorLeaf.rotation.y = ent.rotY;
      const dFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 1.25), cgvCharcoalMat);
      dFrame.position.set(0, 1.8, 0.625);
      doorLeaf.add(dFrame);
      const dGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.3, 1.05), atriumGlassMat);
      dGlass.position.set(0, 1.8, 0.625);
      doorLeaf.add(dGlass);
      const dHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 8), cgvBrassMat);
      dHandle.position.set(0.07, 1.25, 0.95);
      doorLeaf.add(dHandle);
      staticGroup.add(doorLeaf);
    });

    // =========================================================================
    // ZONE 1: BOX OFFICE, KIOSKS, CONCESSION BAR & FREESTANDING MOVIE POSTERS
    // =========================================================================
    const boxCounter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.02, 6.8), cgvWalnutMat);
    boxCounter.position.set(115.2, f3Y + 0.58, 98.0);
    staticGroup.add(boxCounter);
    const boxTop = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.08, 6.96), cgvBrassMat);
    boxTop.position.set(115.2, f3Y + 1.12, 98.0);
    staticGroup.add(boxTop);
    const boxTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 6.82), cgvCrimsonMat);
    boxTrim.position.set(116.14, f3Y + 0.92, 98.0);
    staticGroup.add(boxTrim);

    const aprLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.84), cgvEmbMat);
    aprLogo.rotation.y = Math.PI / 2;
    aprLogo.position.set(116.15, f3Y + 0.50, 98.0);
    staticGroup.add(aprLogo);

    [95.8, 98.0, 100.2].forEach((pz) => {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.42), cgvCharcoalMat);
      pos.position.set(115.35, f3Y + 1.33, pz);
      staticGroup.add(pos);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.95), atriumGlassMat);
      glass.position.set(115.9, f3Y + 1.42, pz);
      staticGroup.add(glass);
    });

    const boxHeaderTex = createCgvLuxuryBannerTex(
      'BOX OFFICE',
      'QUẦY BÁN VÉ  •  CGV TICKETS',
      'CHỌN SUẤT CHIẾU  •  IMAX  •  GOLD CLASS  •  4DX',
      '#e5c17c'
    );
    const boxHeaderMat = new THREE.MeshStandardMaterial({ map: boxHeaderTex, roughness: 0.88 });
    const boxHeaderBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.36, 5.6), cgvCharcoalMat);
    boxHeaderBox.position.set(115.14, f3Y + 3.45, 98.0);
    staticGroup.add(boxHeaderBox);
    const boxHeader = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.24), boxHeaderMat);
    boxHeader.rotation.y = Math.PI / 2;
    boxHeader.position.set(115.22, f3Y + 3.45, 98.0);
    staticGroup.add(boxHeader);

    const showtimeTex = createCgvShowtimeBoardTex();
    const showtimeMat = new THREE.MeshStandardMaterial({ map: showtimeTex, roughness: 0.88 });
    const showtimeBoard = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.55), showtimeMat);
    showtimeBoard.rotation.y = Math.PI / 2;
    showtimeBoard.position.set(112.48, f3Y + 3.25, 98.0);
    staticGroup.add(showtimeBoard);

    // West Lobby Promotional Ad Lightboxes flanking the Showtimes Board (Z = 93.2 & 102.8)
    [
      { z: 93.2, mat: adMats[0] },
      { z: 102.8, mat: adMats[2] },
    ].forEach((ad) => {
      const adFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.38, 1.62), cgvBrassMat);
      adFrame.position.set(112.46, f3Y + 3.15, ad.z);
      staticGroup.add(adFrame);
      const adPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 2.18), ad.mat);
      adPlane.rotation.y = Math.PI / 2;
      adPlane.position.set(112.52, f3Y + 3.15, ad.z);
      staticGroup.add(adPlane);
    });

    // 3 Red CGV Self-Ticketing Kiosks
    [93.7, 94.8, 95.9].forEach((kz, idx) => {
      const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.65, 0.72), cgvCrimsonMat);
      kiosk.position.set(118.8, f3Y + 0.90, kz);
      staticGroup.add(kiosk);
      const kioskIdx = [2, 9, 10][idx] ?? idx;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.78), posterMats[kioskIdx]);
      screen.rotation.y = Math.PI / 2;
      screen.position.set(119.09, f3Y + 1.24, kz);
      staticGroup.add(screen);
    });

    // Popcorn & Concession Bar (East Lobby X=139.8..143.5, Z=94.5..101.5)
    const concCounter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.02, 7.0), cgvCrimsonMat);
    concCounter.position.set(140.8, f3Y + 0.58, 98.0);
    staticGroup.add(concCounter);
    const concTop = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.08, 7.16), cgvBrassMat);
    concTop.position.set(140.8, f3Y + 1.12, 98.0);
    staticGroup.add(concTop);
    const concTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 7.02), cgvCharcoalMat);
    concTrim.position.set(139.84, f3Y + 0.92, 98.0);
    staticGroup.add(concTrim);

    const concAprLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.84), cgvEmbMat);
    concAprLogo.rotation.y = -Math.PI / 2;
    concAprLogo.position.set(139.83, f3Y + 0.50, 98.0);
    staticGroup.add(concAprLogo);

    [95.8, 98.0].forEach((wz) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 1.15), cgvCrimsonMat);
      base.position.set(140.8, f3Y + 1.24, wz);
      staticGroup.add(base);
      const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 1.10), atriumGlassMat);
      caseGlass.position.set(140.8, f3Y + 1.66, wz);
      staticGroup.add(caseGlass);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 1.16), cgvCrimsonMat);
      cap.position.set(140.8, f3Y + 2.04, wz);
      staticGroup.add(cap);
      const popcornMound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), cgvPopcornMat);
      popcornMound.scale.set(0.95, 0.72, 1.35);
      popcornMound.position.set(140.8, f3Y + 1.50, wz);
      staticGroup.add(popcornMound);
    });

    const sodaTower = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 1.05), cgvCharcoalMat);
    sodaTower.position.set(140.95, f3Y + 1.53, 100.3);
    staticGroup.add(sodaTower);

    const concMenuTex = createCgvConcessionMenuTex();
    const concMenuMat = new THREE.MeshStandardMaterial({ map: concMenuTex, roughness: 0.88 });
    const concMenu = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.5), concMenuMat);
    concMenu.rotation.y = -Math.PI / 2;
    concMenu.position.set(143.52, f3Y + 3.25, 98.0);
    staticGroup.add(concMenu);

    // East Lobby Promotional Ad Lightboxes flanking the Concession Menu (Z = 92.8 & 103.2)
    [
      { z: 92.8, mat: adMats[1] },
      { z: 103.2, mat: adMats[3] },
    ].forEach((ad) => {
      const adFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.38, 1.62), cgvBrassMat);
      adFrame.position.set(143.54, f3Y + 3.15, ad.z);
      staticGroup.add(adFrame);
      const adPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 2.18), ad.mat);
      adPlane.rotation.y = -Math.PI / 2;
      adPlane.position.set(143.48, f3Y + 3.15, ad.z);
      staticGroup.add(adPlane);
    });

    // 2 Double-Sided Freestanding Movie & Promo Poster Standees near Lobby Entrance (X=122.4 & 133.6, Z=93.2)
    [
      { x: 122.4, mFront: posterMats[6], mBack: adMats[0] },
      { x: 133.6, mFront: posterMats[7], mBack: adMats[1] },
    ].forEach((st) => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(1.22, 2.25, 0.24), cgvCharcoalMat);
      stand.position.set(st.x, f3Y + 1.20, 93.2);
      staticGroup.add(stand);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.10, 0.28), cgvBrassMat);
      cap.position.set(st.x, f3Y + 2.34, 93.2);
      staticGroup.add(cap);
      const fFront = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.85), st.mFront);
      fFront.rotation.y = Math.PI;
      fFront.position.set(st.x, f3Y + 1.25, 93.07);
      staticGroup.add(fFront);
      const fBack = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.85), st.mBack);
      fBack.position.set(st.x, f3Y + 1.25, 93.33);
      staticGroup.add(fBack);
    });

    // Waiting Lounge Sofas (X=122.1 & 133.9, Z=99.6)
    [122.1, 133.9].forEach((lx) => {
      const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.44, 0.98), cgvVelvetMat);
      sofaBase.position.set(lx, f3Y + 0.29, 100.2);
      staticGroup.add(sofaBase);
      const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.56, 0.22), cgvVelvetMat);
      sofaBack.position.set(lx, f3Y + 0.68, 100.62);
      staticGroup.add(sofaBack);
      const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.06, 16), cgvCreamMat);
      tableTop.position.set(lx, f3Y + 0.52, 98.4);
      staticGroup.add(tableTop);
      const tableStem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.22, 0.44, 12), cgvBrassMat);
      tableStem.position.set(lx, f3Y + 0.29, 98.4);
      staticGroup.add(tableStem);
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 10), cgvCrimsonMat);
      tub.position.set(lx - 0.12, f3Y + 0.65, 98.4);
      staticGroup.add(tub);
    });

    // =========================================================================
    // 3 SCREENING HALLS DIVIDED BY ACOUSTIC WALLS + REAL CINEMA DOORS (Z = 107.0..125.15)
    // Hall 1 (IMAX LASER): X=112.4..122.6 (door center X=117.5)
    // Hall 2 (GOLD CLASS): X=123.0..133.0 (door center X=128.0)
    // Hall 3 (4DX MOTION): X=133.4..143.6 (door center X=138.5)
    // =========================================================================
    // Inter-Hall Acoustic Partition Walls (X = 122.8 & X = 133.2, Z = 107.0..125.15)
    [122.8, 133.2].forEach((px) => {
      const partWall = new THREE.Mesh(new THREE.BoxGeometry(0.40, 8.35, 18.15), cgvCharcoalMat);
      partWall.position.set(px, f3Y + 4.24, 116.08);
      staticGroup.add(partWall);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 18.15), cgvBrassMat);
      trim.position.set(px, f3Y + 1.56, 116.08);
      staticGroup.add(trim);
    });

    // Divider Wall Segments along Z = 107.0 leaving 3 Walkable Hall Doorways (each 2.8m wide!)
    [
      { x: 114.25, w: 3.70 },
      { x: 122.80, w: 7.80 },
      { x: 133.20, w: 7.80 },
      { x: 141.75, w: 3.70 },
    ].forEach((seg) => {
      const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(seg.w, 6.2, 0.48), cgvCharcoalMat);
      wallSeg.position.set(seg.x, f3Y + 3.16, 107.0);
      staticGroup.add(wallSeg);
      const brassRail = new THREE.Mesh(new THREE.BoxGeometry(seg.w, 0.14, 0.52), cgvBrassMat);
      brassRail.position.set(seg.x, f3Y + 1.56, 107.0);
      staticGroup.add(brassRail);
    });

    // CGV Emblem Plaques & Movie Posters mounted between the 3 Hall Entrances on Z = 106.72!
    [122.8, 133.2].forEach((px) => {
      const emblemPillar = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.75), cgvEmbMat);
      emblemPillar.rotation.y = Math.PI;
      emblemPillar.position.set(px, f3Y + 4.55, 106.72);
      staticGroup.add(emblemPillar);
    });
    [
      { x: 114.2, mat: posterMats[8] },
      { x: 120.7, mat: posterMats[9] },
      { x: 124.9, mat: posterMats[10] },
      { x: 131.1, mat: adMats[2] },
      { x: 135.3, mat: adMats[3] },
      { x: 141.8, mat: posterMats[0] },
    ].forEach((hp) => {
      const pFrame = new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.34, 0.10), cgvBrassMat);
      pFrame.position.set(hp.x, f3Y + 2.85, 106.72);
      staticGroup.add(pFrame);
      const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.40, 2.14), hp.mat);
      pMesh.rotation.y = Math.PI;
      pMesh.position.set(hp.x, f3Y + 2.85, 106.66);
      staticGroup.add(pMesh);
    });

    // Helper to build a full Walk-In Screening Hall + Hinged Double Cinema Doors + Stadium Seats + Screen!
    const buildCinemaHall = (cfg: {
      xCenter: number;
      hallTag: string;
      hallName: string;
      hallSub: string;
      accentHex: string;
      doorMat: THREE.MeshStandardMaterial;
      seatMat: THREE.MeshStandardMaterial;
      altSeatMat?: THREE.MeshStandardMaterial;
      screenTitle: string;
      screenSub: string;
      screenC1: string;
      screenC2: string;
      screenOrb: string;
      curtainMat: THREE.MeshStandardMaterial;
      hallWidth: number;
    }) => {
      const doorW = 2.8;
      // Overhead Portal Lintel + Illuminated Hall Sign above Doors
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, 2.55, 0.50), cgvCharcoalMat);
      lintel.position.set(cfg.xCenter, f3Y + 4.98, 107.0);
      staticGroup.add(lintel);

      const hTex = createCgvLuxuryBannerTex(
        cfg.hallTag,
        cfg.hallName,
        cfg.hallSub,
        cfg.accentHex
      );
      const hMat = new THREE.MeshStandardMaterial({ map: hTex, roughness: 0.88 });
      const hFrame = new THREE.Mesh(new THREE.BoxGeometry(3.52, 1.06, 0.12), cgvBrassMat);
      hFrame.position.set(cfg.xCenter, f3Y + 4.26, 106.74);
      staticGroup.add(hFrame);
      const hSign = new THREE.Mesh(new THREE.PlaneGeometry(3.38, 0.94), hMat);
      hSign.rotation.y = Math.PI;
      hSign.position.set(cfg.xCenter, f3Y + 4.26, 106.67);
      staticGroup.add(hSign);

      // Door Jamb Pillars & Swung-Open Double Acoustic Cinema Doors with Porthole Glass & Push-Bars!
      [-1.45, 1.45].forEach((dx, dIdx) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.72, 0.54), cgvBrassMat);
        jamb.position.set(cfg.xCenter + dx, f3Y + 1.92, 107.0);
        staticGroup.add(jamb);

        const doorLeaf = new THREE.Group();
        const hingeX = cfg.xCenter + (dIdx === 0 ? -1.36 : 1.36);
        doorLeaf.position.set(hingeX, f3Y + 0.08, 107.05);
        // Swing open smoothly into auditorium (+Z) leaving clear 2.1m+ walkable passage!
        doorLeaf.rotation.y = dIdx === 0 ? -0.35 : 0.35;

        const leafW = 1.28;
        const leafOffsetZ = leafW / 2;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.55, leafW), cfg.doorMat);
        panel.position.set(0, 1.78, leafOffsetZ);
        doorLeaf.add(panel);

        const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, leafW - 0.04), cgvBrassMat);
        kickPlate.position.set(0, 0.20, leafOffsetZ);
        doorLeaf.add(kickPlate);

        const pushBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, leafW * 0.72, 8), cgvBrassMat);
        pushBar.rotation.x = Math.PI / 2;
        pushBar.position.set(dIdx === 0 ? 0.08 : -0.08, 1.18, leafOffsetZ);
        doorLeaf.add(pushBar);

        const portholeFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.14, 14), cgvBrassMat);
        portholeFrame.rotation.z = Math.PI / 2;
        portholeFrame.position.set(0, 2.02, leafOffsetZ);
        doorLeaf.add(portholeFrame);

        const portholeGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.15, 14), atriumGlassMat);
        portholeGlass.rotation.z = Math.PI / 2;
        portholeGlass.position.set(0, 2.02, leafOffsetZ);
        doorLeaf.add(portholeGlass);

        staticGroup.add(doorLeaf);
      });

      // Ticket Checker Podium beside each Hall Door
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.02, 0.62), cgvWalnutMat);
      pod.position.set(cfg.xCenter - 1.9, f3Y + 0.58, 106.1);
      staticGroup.add(pod);
      const podTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.68), cgvBrassMat);
      podTop.position.set(cfg.xCenter - 1.9, f3Y + 1.12, 106.1);
      staticGroup.add(podTop);

      // Walkable Red Carpet Center Aisle (X center +/- 1.15m)
      const hallRunner = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.012, 16.5), cgvRedCarpetMat);
      hallRunner.position.set(cfg.xCenter, f3Y + 0.075, 115.6);
      staticGroup.add(hallRunner);

      // Wall Acoustic Ribs & Warm Sconces
      [110.0, 114.2, 118.4].forEach((sz) => {
        [-cfg.hallWidth / 2 + 0.24, cfg.hallWidth / 2 - 0.24].forEach((ox) => {
          const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.14), ceilingLampLensMat);
          sconce.position.set(cfg.xCenter + ox, f3Y + 3.15, sz);
          staticGroup.add(sconce);
        });
      });

      // Projection Booth Window high on North wall inside each hall
      const projWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.90, 0.12), atriumGlassMat);
      projWin.position.set(cfg.xCenter, f3Y + 6.85, 107.30);
      staticGroup.add(projWin);

      // 3 Tiered Stadium Risers (Z = 115.2, 113.1, 111.0) + Plush Seats on Left & Right Wings!
      [
        { z: 115.2, h: 0.34, rowIdx: 0 },
        { z: 113.1, h: 0.74, rowIdx: 1 },
        { z: 111.0, h: 1.14, rowIdx: 2 },
      ].forEach((row) => {
        const riserY = f3Y + 0.075 + row.h / 2;
        const seatBaseY = f3Y + 0.075 + row.h;
        [-3.05, 3.05].forEach((rx) => {
          const riser = new THREE.Mesh(new THREE.BoxGeometry(3.45, row.h, 1.88), cgvCharcoalMat);
          riser.position.set(cfg.xCenter + rx, riserY, row.z);
          staticGroup.add(riser);
        });
        [-1.25, 1.25].forEach((sx) => {
          const stepLed = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 1.80), ceilingLampLensMat);
          stepLed.position.set(cfg.xCenter + sx, seatBaseY + 0.03, row.z);
          staticGroup.add(stepLed);
        });

        const sMat = cfg.altSeatMat && row.rowIdx === 2 ? cfg.altSeatMat : cfg.seatMat;
        [-4.1, -3.05, -2.0, 2.0, 3.05, 4.1].forEach((ox) => {
          const sx = cfg.xCenter + ox;
          const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.22, 0.64), sMat);
          cushion.position.set(sx, seatBaseY + 0.28, row.z + 0.08);
          staticGroup.add(cushion);
          const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.84, 0.20), sMat);
          backrest.position.set(sx, seatBaseY + 0.62, row.z - 0.22);
          backrest.rotation.x = -0.14;
          staticGroup.add(backrest);
          [-0.42, 0.42].forEach((ax) => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.64), cgvTheaterBlackMat);
            arm.position.set(sx + ax, seatBaseY + 0.44, row.z + 0.04);
            staticGroup.add(arm);
          });
        });
      });

      // Individual Hall Cinema Stage & Silver Widescreen
      const stageDeck = new THREE.Mesh(new THREE.BoxGeometry(cfg.hallWidth - 0.8, 0.62, 1.65), cgvCharcoalMat);
      stageDeck.position.set(cfg.xCenter, f3Y + 0.38, 124.25);
      staticGroup.add(stageDeck);

      const scrBack = new THREE.Mesh(new THREE.BoxGeometry(8.9, 4.8, 0.24), cgvTheaterBlackMat);
      scrBack.position.set(cfg.xCenter, f3Y + 3.85, 124.75);
      staticGroup.add(scrBack);

      const scrTex = createCgvScreenTex(cfg.screenTitle, cfg.screenSub, cfg.screenC1, cfg.screenC2, cfg.screenOrb);
      const scrMat = new THREE.MeshStandardMaterial({ map: scrTex, roughness: 0.88 });
      const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 4.3), scrMat);
      scrMesh.rotation.y = Math.PI;
      scrMesh.position.set(cfg.xCenter, f3Y + 3.85, 124.58);
      staticGroup.add(scrMesh);

      [-4.45, 4.45].forEach((cx) => {
        for (let f = -0.25; f <= 0.25; f += 0.25) {
          const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.9, 8), cfg.curtainMat);
          fold.position.set(cfg.xCenter + cx + f, f3Y + 3.85, 124.52);
          staticGroup.add(fold);
        }
      });
    };

    // Build all 3 Distinct CGV Screening Halls!
    buildCinemaHall({
      xCenter: 117.5,
      hallTag: 'HALL 01  •  IMAX LASER',
      hallName: 'IMAX LASER 4K',
      hallSub: 'HUYẾT THỐNG  •  MỜI QUÝ KHÁCH VÀO RẠP',
      accentHex: '#38bdf8',
      doorMat: cgvCrimsonMat,
      seatMat: cgvVelvetMat,
      screenTitle: 'HALL 1  •  CGV IMAX LASER',
      screenSub: 'HUYẾT THỐNG  •  ĐANG CHIẾU 4K DOLBY ATMOS',
      screenC1: '#0f172a',
      screenC2: '#dc2626',
      screenOrb: '#fef08a',
      curtainMat: cgvVelvetMat,
      hallWidth: 10.0,
    });

    buildCinemaHall({
      xCenter: 128.0,
      hallTag: 'HALL 02  •  VIP LOUNGE',
      hallName: 'GOLD CLASS',
      hallSub: 'TÀI (PHIM VIỆT)  •  GHẾ DA HẠNG SANG',
      accentHex: '#e5c17c',
      doorMat: cgvWalnutMat,
      seatMat: cgvGoldLeatherMat,
      screenTitle: 'HALL 2  •  CGV GOLD CLASS',
      screenSub: 'TÀI  •  PHÒNG CHIẾU VIP HẠNG SANG',
      screenC1: '#450a0a',
      screenC2: '#be123c',
      screenOrb: '#fde047',
      curtainMat: cgvGoldLeatherMat,
      hallWidth: 9.8,
    });

    buildCinemaHall({
      xCenter: 138.5,
      hallTag: 'HALL 03  •  MOTION',
      hallName: '4DX & SWEETBOX',
      hallSub: 'CONAN & BÒ SỮA BAY  •  HIỆU ỨNG 4DX',
      accentHex: '#fb923c',
      doorMat: cgv4dxBlueMat,
      seatMat: cgv4dxBlueMat,
      altSeatMat: cgvSweetPinkMat,
      screenTitle: 'HALL 3  •  CGV 4DX MOTION',
      screenSub: 'CONAN & BÒ SỮA BAY  •  GHẾ RUNG 4DX & SWEETBOX',
      screenC1: '#0f172a',
      screenC2: '#0284c7',
      screenOrb: '#38bdf8',
      curtainMat: cgv4dxBlueMat,
      hallWidth: 10.0,
    });
  };
  buildFloor3CgvCinema();

  // Per-floor & per-zone wide-radius PointLights (decay = 1.0, aligned with ShopScene's 10-slot PointLight pool):
  // Using fewer, wider lights ensures all 3 floors, the 24.8m concrete atrium, and nearby shops stay brightly lit day & night without glare.
  [
    // Floor 3 High Concrete Ceiling & Central Atrium (4 wide overhead lights)
    { x: centerX, y: 21.2, z: 54.0, nightInt: 66, dayInt: 6.0, dist: 50, decay: 0.9 },
    { x: centerX, y: 21.2, z: 68.0, nightInt: 72, dayInt: 6.5, dist: 52, decay: 0.9 },
    { x: centerX, y: 21.2, z: 84.0, nightInt: 66, dayInt: 6.0, dist: 50, decay: 0.9 },
    { x: centerX, y: 15.2, z: 68.0, nightInt: 54, dayInt: 4.5, dist: 45, decay: 0.95 },
    // Floor 3 West Wing Restaurants: HP3 BBQ & TEXAS CHICKEN
    { x: 105.8, y: 16.4, z: 57.7, nightInt: 38, dayInt: 2.4, dist: 34, decay: 1.0 },
    { x: 105.8, y: 16.4, z: 78.5, nightInt: 38, dayInt: 2.4, dist: 34, decay: 1.0 },
    // Floor 3 East Wing Restaurants: HAIDILAO HOT POT & KICHI-KICHI
    { x: 158.0, y: 16.4, z: 57.7, nightInt: 38, dayInt: 2.4, dist: 36, decay: 1.0 },
    { x: 166.5, y: 16.4, z: 57.7, nightInt: 34, dayInt: 2.0, dist: 32, decay: 1.0 },
    { x: 158.0, y: 16.4, z: 78.5, nightInt: 38, dayInt: 2.4, dist: 36, decay: 1.0 },
    { x: 166.5, y: 16.4, z: 78.5, nightInt: 34, dayInt: 2.0, dist: 32, decay: 1.0 },
    // Floor 3 South Wing CGV CINEMAS Lobby & 3 Enclosed Screening Halls
    { x: 128.0, y: 17.4, z: 98.5, nightInt: 46, dayInt: 7.0, dist: 38, decay: 0.95 },
    { x: 117.5, y: 18.0, z: 117.5, nightInt: 28, dayInt: 7.5, dist: 24, decay: 0.95 },
    { x: 128.0, y: 18.0, z: 117.5, nightInt: 28, dayInt: 7.5, dist: 24, decay: 0.95 },
    { x: 138.5, y: 18.0, z: 117.5, nightInt: 28, dayInt: 7.5, dist: 24, decay: 0.95 },
    // Floor 1 Central Plaza, Escalators & Walkways (3 wide lights)
    { x: centerX, y: 5.0, z: 50.0, nightInt: 46, dayInt: 4.0, dist: 38, decay: 0.95 },
    { x: centerX, y: 5.0, z: 66.0, nightInt: 52, dayInt: 4.5, dist: 40, decay: 0.95 },
    { x: centerX, y: 5.0, z: 86.0, nightInt: 46, dayInt: 4.0, dist: 38, decay: 0.95 },
    // Floor 2 Balconies & Bridges (3 wide calm lights — crisp without glare)
    { x: 115.5, y: 10.8, z: 68.0, nightInt: 32, dayInt: 1.8, dist: 32, decay: 1.0 },
    { x: 140.5, y: 10.8, z: 68.0, nightInt: 32, dayInt: 1.8, dist: 32, decay: 1.0 },
    { x: centerX, y: 10.8, z: 87.0, nightInt: 32, dayInt: 1.8, dist: 32, decay: 1.0 },
    // Floor 1 Shops (1 wide light per shop hall)
    { x: 105.0, y: 4.2, z: 57.5, nightInt: 38, dayInt: 2.5, dist: 28, decay: 1.0 },
    { x: 93.0, y: 4.2, z: 81.5, nightInt: 40, dayInt: 2.5, dist: 32, decay: 1.0 },
    { x: 160.5, y: 4.2, z: 54.5, nightInt: 40, dayInt: 2.6, dist: 32, decay: 1.0 },
    { x: 160.5, y: 4.2, z: 68.0, nightInt: 38, dayInt: 2.5, dist: 30, decay: 1.0 },
    { x: 160.5, y: 4.2, z: 81.8, nightInt: 38, dayInt: 2.5, dist: 30, decay: 1.0 },
    { x: 120.0, y: 4.2, z: 108.5, nightInt: 40, dayInt: 2.5, dist: 34, decay: 1.0 },
    { x: 136.0, y: 4.2, z: 108.5, nightInt: 40, dayInt: 2.5, dist: 34, decay: 1.0 },
    // Floor 2 Shops (1 wide calm light per shop hall)
    { x: 105.5, y: 10.5, z: 54.25, nightInt: 28, dayInt: 1.4, dist: 26, decay: 1.0 },
    { x: 105.5, y: 10.5, z: 68.05, nightInt: 28, dayInt: 1.4, dist: 26, decay: 1.0 },
    { x: 105.5, y: 10.5, z: 81.85, nightInt: 28, dayInt: 1.4, dist: 26, decay: 1.0 },
    { x: 160.5, y: 10.5, z: 54.25, nightInt: 30, dayInt: 1.5, dist: 30, decay: 1.0 },
    { x: 160.5, y: 10.5, z: 68.05, nightInt: 30, dayInt: 1.5, dist: 30, decay: 1.0 },
    { x: 160.5, y: 10.5, z: 81.85, nightInt: 30, dayInt: 1.5, dist: 30, decay: 1.0 },
    { x: 120.0, y: 10.5, z: 108.5, nightInt: 30, dayInt: 1.5, dist: 32, decay: 1.0 },
    { x: 136.0, y: 10.5, z: 108.5, nightInt: 30, dayInt: 1.5, dist: 32, decay: 1.0 },
  ].forEach((l) => {
    const pl = new THREE.PointLight(0xfff7ed, l.nightInt, l.dist, l.decay);
    pl.position.set(l.x, l.y, l.z);
    interiorPointLights.push({ light: pl, nightInt: l.nightInt, dayInt: l.dayInt });
  });

  // =========================================================================
  // ALL 20 STOREFRONT ROLLING SHUTTERS (Floors 1, 2, 3) FOR AFTER 22:00 CLOSURE
  // =========================================================================
  const shuttersGroup = new THREE.Group();
  shuttersGroup.userData.noMerge = true;
  staticGroup.add(shuttersGroup);

  const shutterTex = createRollingShutterTexture({
    title: 'AEON MALL • GIAN HÀNG TẠM NGHỈ',
    hoursLabel: 'GIỜ MỞ CỬA: 07:00 – 22:00',
    accentHex: '#a21caf',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.72,
    metalness: 0.25,
  });
  const shutterHousingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.3,
  });

  const storeShutterSpecs = [
    // Floor 1 (7 stores)
    { id: 'f1_uniqlo', axis: 'z' as const, pos: 112.0, spanCenter: 57.25, width: 8.6, baseY: 0.08, topY: 3.20, bounds: { minX: 97.5, maxX: 112.2, minZ: 48.0, maxZ: 66.5, floor: 1 } },
    { id: 'f1_starbucks', axis: 'z' as const, pos: 112.0, spanCenter: 78.5, width: 9.1, baseY: 0.08, topY: 3.20, bounds: { minX: 77.5, maxX: 112.2, minZ: 67.5, maxZ: 89.5, floor: 1 } },
    { id: 'f1_aeon_style', axis: 'z' as const, pos: 144.0, spanCenter: 54.25, width: 5.5, baseY: 0.08, topY: 3.20, bounds: { minX: 143.8, maxX: 176.5, minZ: 48.0, maxZ: 60.5, floor: 1 } },
    { id: 'f1_zara', axis: 'z' as const, pos: 144.0, spanCenter: 68.05, width: 5.5, baseY: 0.08, topY: 3.20, bounds: { minX: 143.8, maxX: 176.5, minZ: 61.8, maxZ: 74.3, floor: 1 } },
    { id: 'f1_hm', axis: 'z' as const, pos: 144.0, spanCenter: 81.85, width: 5.5, baseY: 0.08, topY: 3.20, bounds: { minX: 143.8, maxX: 176.5, minZ: 75.6, maxZ: 88.2, floor: 1 } },
    { id: 'f1_mlb', axis: 'x' as const, pos: 91.15, spanCenter: 118.9, width: 5.2, baseY: 0.08, topY: 3.20, bounds: { minX: 112.4, maxX: 127.6, minZ: 91.0, maxZ: 125.5, floor: 1 } },
    { id: 'f1_cnk', axis: 'x' as const, pos: 91.15, spanCenter: 136.05, width: 5.5, baseY: 0.08, topY: 3.20, bounds: { minX: 128.4, maxX: 143.6, minZ: 91.0, maxZ: 125.5, floor: 1 } },
    // Floor 2 (8 stores)
    { id: 'f2_adidas', axis: 'z' as const, pos: 144.0, spanCenter: 54.25, width: 5.36, baseY: 6.24, topY: 9.32, bounds: { minX: 143.8, maxX: 176.5, minZ: 48.0, maxZ: 60.5, floor: 2 } },
    { id: 'f2_nike', axis: 'z' as const, pos: 144.0, spanCenter: 68.05, width: 5.36, baseY: 6.24, topY: 9.32, bounds: { minX: 143.8, maxX: 176.5, minZ: 61.8, maxZ: 74.3, floor: 2 } },
    { id: 'f2_puma', axis: 'z' as const, pos: 144.0, spanCenter: 81.85, width: 5.36, baseY: 6.24, topY: 9.32, bounds: { minX: 143.8, maxX: 176.5, minZ: 75.6, maxZ: 88.2, floor: 2 } },
    { id: 'f2_muji', axis: 'z' as const, pos: 112.0, spanCenter: 54.25, width: 5.36, baseY: 6.24, topY: 9.32, bounds: { minX: 99.5, maxX: 112.2, minZ: 48.0, maxZ: 60.5, floor: 2 } },
    { id: 'f2_locknlock', axis: 'z' as const, pos: 112.0, spanCenter: 68.05, width: 5.36, baseY: 6.24, topY: 9.32, bounds: { minX: 99.5, maxX: 112.2, minZ: 61.8, maxZ: 74.3, floor: 2 } },
    { id: 'f2_levis', axis: 'z' as const, pos: 112.0, spanCenter: 81.85, width: 5.36, baseY: 6.24, topY: 9.32, bounds: { minX: 99.5, maxX: 112.2, minZ: 75.6, maxZ: 88.2, floor: 2 } },
    { id: 'f2_tommy', axis: 'x' as const, pos: 91.15, spanCenter: 118.9, width: 5.2, baseY: 6.24, topY: 9.32, bounds: { minX: 112.4, maxX: 127.6, minZ: 91.0, maxZ: 125.5, floor: 2 } },
    { id: 'f2_crocs', axis: 'x' as const, pos: 91.15, spanCenter: 136.05, width: 5.5, baseY: 6.24, topY: 9.32, bounds: { minX: 128.4, maxX: 143.6, minZ: 91.0, maxZ: 125.5, floor: 2 } },
    // Floor 3 (5 restaurants + CGV Cinemas)
    { id: 'f3_haidilao', axis: 'z' as const, pos: 144.0, spanCenter: 57.7, width: 6.6, baseY: 12.24, topY: 15.36, bounds: { minX: 143.8, maxX: 176.5, minZ: 48.0, maxZ: 67.5, floor: 3 } },
    { id: 'f3_kichi', axis: 'z' as const, pos: 144.0, spanCenter: 78.5, width: 6.6, baseY: 12.24, topY: 15.36, bounds: { minX: 143.8, maxX: 176.5, minZ: 68.8, maxZ: 88.2, floor: 3 } },
    { id: 'f3_hp3', axis: 'z' as const, pos: 112.0, spanCenter: 57.7, width: 6.6, baseY: 12.24, topY: 15.36, bounds: { minX: 99.5, maxX: 112.2, minZ: 48.0, maxZ: 67.5, floor: 3 } },
    { id: 'f3_texas', axis: 'z' as const, pos: 112.0, spanCenter: 78.5, width: 6.6, baseY: 12.24, topY: 15.36, bounds: { minX: 99.5, maxX: 112.2, minZ: 68.8, maxZ: 88.2, floor: 3 } },
    { id: 'f3_cgv', axis: 'x' as const, pos: 91.02, spanCenter: 128.0, width: 9.1, baseY: 12.26, topY: 16.26, bounds: { minX: 112.4, maxX: 143.6, minZ: 91.0, maxZ: 125.5, floor: 3 } },
  ];

  const storeShutters: RollingShutterHandle[] = storeShutterSpecs.map((spec) =>
    createRollingShutterDoor(shuttersGroup, spec, shutterMat, shutterHousingMat)
  );

  // Main Grand Entrance Rolling Shutter (Z = 45.32, X = 128.0, width = 5.95m, Y = 0.08..4.35)
  const mainEntranceTex = createRollingShutterTexture({
    title: 'AEON MALL • HẸN GẶP LẠI',
    hoursLabel: 'GIỜ MỞ CỬA: 07:00 – 22:00',
    accentHex: '#a21caf',
  });
  const mainEntranceShutterMat = new THREE.MeshStandardMaterial({
    map: mainEntranceTex,
    roughness: 0.72,
    metalness: 0.25,
  });
  const mainEntranceShutter: RollingShutterHandle = createRollingShutterDoor(
    shuttersGroup,
    { id: 'aeon_main_gate', axis: 'x', pos: 45.32, spanCenter: centerX, width: 5.95, baseY: 0.08, topY: 4.35 },
    mainEntranceShutterMat,
    shutterHousingMat
  );

  // Global anti-glare sanitization pass across EVERY material in AEON Mall:
  // Strips specular IBL reflections and harsh bloom while keeping ceiling light panels softly lit.
  const visitedMats = new Set<THREE.Material>();
  staticGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat || visitedMats.has(mat)) continue;
      visitedMats.add(mat);
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        if (mat !== ceilingLampLensMat) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          if (mat.emissiveMap) {
            mat.emissiveMap = null;
            mat.needsUpdate = true;
          }
        }
        mat.envMapIntensity = 0;
        mat.metalness = mat.transparent ? 0 : Math.min(mat.metalness, 0.1);
        mat.roughness = Math.max(mat.roughness, 0.88);
        if (mat instanceof THREE.MeshPhysicalMaterial) {
          mat.clearcoat = 0;
          mat.reflectivity = 0;
        }
      }
    }
  });

  let wasOpen: boolean | null = null;
  let closingElapsed = 0;
  let globalShutterProgress = 0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: AeonMallNpcController | null
  ) => {
    const isOpen = isAeonMallOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (rawHour < 7.0 || rawHour >= 22.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      let sum = 0;
      for (const sh of storeShutters) {
        const next = Math.max(0, sh.progress - delta * 1.1);
        setShutterProgress(sh, next);
        sum += next;
      }
      setShutterProgress(mainEntranceShutter, Math.max(0, mainEntranceShutter.progress - delta * 1.1));
      globalShutterProgress = sum / storeShutters.length;
    } else if (snapImmediate) {
      closingElapsed = 0;
      for (const sh of storeShutters) {
        setShutterProgress(sh, 1.0);
      }
      setShutterProgress(mainEntranceShutter, 1.0);
      globalShutterProgress = 1.0;
    } else {
      closingElapsed += delta;
      let sum = 0;
      for (const sh of storeShutters) {
        const occupied =
          closingElapsed < 16.0 &&
          sh.bounds &&
          npcController?.isStoreOccupiedByExitingNpc(sh.bounds);
        if (!occupied && closingElapsed >= 1.2) {
          const next = Math.min(1.0, sh.progress + delta * 0.72);
          setShutterProgress(sh, next);
        }
        sum += sh.progress;
      }
      const canCloseMain =
        closingElapsed >= 28.0 ||
        (closingElapsed >= 2.0 && Boolean(npcController?.isFullyClosedAndEmpty()));
      if (canCloseMain) {
        setShutterProgress(mainEntranceShutter, Math.min(1.0, mainEntranceShutter.progress + delta * 0.72));
      }
      globalShutterProgress = sum / storeShutters.length;
    }
    wasOpen = isOpen;

    // Power off interior ceiling diffuser lenses when the mall closes
    ceilingLampLensMat.emissiveIntensity = 0.72 * (1.0 - mainEntranceShutter.progress);
  };

  return {
    staticGroup,
    doorLeft,
    doorRight,
    neonMats: [],
    interiorPointLights,
    updateOperatingHours,
    getShutterProgress: () => globalShutterProgress,
    getMainClosedFactor: () => mainEntranceShutter.progress,
  };
}

// ==========================================
// ANIMATED MALL CROWD & UNIQLO SHOPPING NPC CONTROLLER
// ==========================================
interface NpcRigRef {
  hips: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
}

interface MallNpcSim {
  root: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  mode: 'concierge' | 'strollX' | 'strollZ';
  originX: number;
  originZ: number;
  range: number;
  speed: number;
  phase: number;
  homePos?: THREE.Vector3;
  homeRotY?: number;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitDone?: boolean;
  exitPhaseRef?: { phase: number };
  glbHandle?: GlbHumanHandle;
}

interface UniqloWaypoint {
  x: number;
  z: number;
  pauseDuration: number;
  faceY: number;
  action: 'browse' | 'pay' | 'walk_through';
  bagAfter?: boolean;
}

interface UniqloShopperSim {
  root: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  bagMesh: THREE.Group;
  waypoints: UniqloWaypoint[];
  wpIdx: number;
  state: 'walk' | 'pause';
  pauseTimer: number;
  speed: number;
  walkPhase: number;
  baseY?: number;
  homePos?: THREE.Vector3;
  homeRotY?: number;
  homeWpIdx?: number;
  homeBagVisible?: boolean;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitDone?: boolean;
  exitPhaseRef?: { phase: number };
  glbHandle?: GlbHumanHandle;
}

interface UniqloStaffSim {
  root: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  baseYaw: number;
  phase: number;
  homePos?: THREE.Vector3;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitDone?: boolean;
  exitPhaseRef?: { phase: number };
  glbHandle?: GlbHumanHandle;
}

interface SeatedGuestSim {
  root: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
  phase: number;
  mode: 'sip' | 'laptop';
  homePos?: THREE.Vector3;
  homeRotY?: number;
  homeHipsY?: number;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitDone?: boolean;
  exitPhaseRef?: { phase: number };
  glbHandle?: GlbHumanHandle;
  glbHost?: THREE.Group;
}

export class AeonMallNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly npcs: MallNpcSim[] = [];
  private readonly uniqloShoppers: UniqloShopperSim[] = [];
  private readonly uniqloStaff: UniqloStaffSim[] = [];
  private readonly seatedCafeGuests: SeatedGuestSim[] = [];
  private elapsed = 0;
  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;

  constructor(helpers: AeonCharacterHelpers) {
    const buildShopper = (opts: {
      shirtHex: number;
      pantHex: number;
      skinHex: string;
      skinColor: number;
      bagHex?: number;
      apronHex?: number;
      capHex?: number;
    }) => {
      const root = new THREE.Group();
      const sMat = new THREE.MeshStandardMaterial({ color: opts.skinColor, roughness: 0.65 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirtHex, roughness: 0.55 });
      const pantMat = new THREE.MeshStandardMaterial({ color: opts.pantHex, roughness: 0.68 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });

      const hips = new THREE.Group();
      hips.position.y = 0.84;
      root.add(hips);

      const makeLeg = (lx: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(lx, 0, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.74, 0.14), pantMat);
        leg.position.y = -0.37;
        pivot.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.22), shoeMat);
        shoe.position.set(0, -0.78, 0.04);
        pivot.add(shoe);
        hips.add(pivot);
        return pivot;
      };
      const legL = makeLeg(-0.1);
      const legR = makeLeg(0.1);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.24), shirtMat);
      torso.position.y = 0.28;
      hips.add(torso);

      if (opts.apronHex !== undefined) {
        const apron = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.46, 0.04),
          new THREE.MeshStandardMaterial({ color: opts.apronHex, roughness: 0.6 })
        );
        apron.position.set(0, 0.18, 0.13);
        hips.add(apron);
      }

      const head = new THREE.Group();
      head.position.y = 0.68;
      const faceTex = helpers.createFaceTexture('happy', opts.skinHex);
      head.add(helpers.createHeadMesh(sMat, faceTex, 0.22, 0.24, 0.21));
      if (opts.capHex !== undefined) {
        const capMat = new THREE.MeshStandardMaterial({ color: opts.capHex, roughness: 0.5 });
        const capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.075, 0.23), capMat);
        capCrown.position.set(0, 0.14, 0);
        head.add(capCrown);
        const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.11), capMat);
        capBrim.position.set(0, 0.105, 0.14);
        head.add(capBrim);
      }
      hips.add(head);

      const makeArm = (ax: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(ax, 0.46, 0);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.44, 0.10), shirtMat);
        arm.position.y = -0.22;
        pivot.add(arm);
        hips.add(pivot);
        return pivot;
      };
      const armL = makeArm(-0.27);
      const armR = makeArm(0.27);

      if (opts.bagHex !== undefined) {
        const bag = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.26, 0.22),
          new THREE.MeshStandardMaterial({ color: opts.bagHex, roughness: 0.45 })
        );
        bag.position.set(0.05, -0.5, 0);
        armR.add(bag);
      }

      const rig: NpcRigRef = { hips, legL, legR, armL, armR, head };
      root.userData.rig = rig;
      return { root, hips, legL, legR, armL, armR, head };
    };

    const concierge = buildShopper({ shirtHex: 0xa21caf, pantHex: 0x0f172a, skinHex: '#f1c27d', skinColor: 0xf1c27d });
    concierge.root.position.set(128.0, 0, 49.0);
    concierge.root.rotation.y = Math.PI;
    const conciergeGlb = attachGlbHumanToNpc({
      modelSource: CASHIER_NPC_MODEL.modelSource,
      hostGroup: concierge.root,
      fallbackMeshes: [concierge.hips],
      targetHeight: CASHIER_NPC_MODEL.targetHeight,
      rotationY: CASHIER_NPC_MODEL.rotationY,
      clipProfile: CASHIER_NPC_MODEL.clipProfile,
      initialState: 'Idle',
      phaseOffset: 0.3,
    });
    this.rootGroup.add(concierge.root);
    this.npcs.push({ ...concierge, mode: 'concierge', originX: 128.0, originZ: 49.0, range: 0, speed: 0, phase: 0, glbHandle: conciergeGlb });

    const specs: Array<{
      x: number;
      z: number;
      mode: 'strollX' | 'strollZ';
      range: number;
      speed: number;
      shirt: number;
      bag?: number;
      phase: number;
    }> = [
      // Indoor Grand Atrium strollers (Ground floor corridor & Sakura Rotunda)
      { x: 121.5, z: 58.0, mode: 'strollZ', range: 7.5, speed: 1.3, shirt: 0xe11d48, bag: 0xa21caf, phase: 0.0 },
      { x: 134.5, z: 60.0, mode: 'strollZ', range: 8.5, speed: 1.15, shirt: 0x0284c7, bag: 0xfacc15, phase: 1.4 },
      { x: 128.0, z: 56.5, mode: 'strollX', range: 8.0, speed: 1.1, shirt: 0x16a34a, bag: 0xf8fafc, phase: 2.2 },
      { x: 128.0, z: 69.5, mode: 'strollX', range: 9.0, speed: 1.2, shirt: 0xf97316, bag: 0xa21caf, phase: 0.9 },
      { x: 125.0, z: 51.8, mode: 'strollX', range: 6.5, speed: 1.18, shirt: 0x14b8a6, bag: 0xfbbf24, phase: 2.7 },
      { x: 131.5, z: 64.0, mode: 'strollZ', range: 7.0, speed: 1.25, shirt: 0x8b5cf6, bag: 0xf43f5e, phase: 0.5 },
      // Outdoor AEON Mall Sidewalk & Porte-Cochere strollers
      { x: 118.5, z: 43.2, mode: 'strollX', range: 5.5, speed: 1.0, shirt: 0xec4899, bag: 0xd946ef, phase: 1.7 },
      { x: 138.0, z: 43.2, mode: 'strollX', range: 5.0, speed: 1.05, shirt: 0x3b82f6, bag: 0xef4444, phase: 3.0 },
      { x: 113.0, z: 39.2, mode: 'strollX', range: 11.5, speed: 1.22, shirt: 0x10b981, bag: 0xf8fafc, phase: 0.4 },
      { x: 141.5, z: 38.6, mode: 'strollX', range: 11.0, speed: 1.18, shirt: 0xf59e0b, bag: 0xa21caf, phase: 2.1 },
      { x: 128.0, z: 40.2, mode: 'strollX', range: 15.5, speed: 1.28, shirt: 0x06b6d4, bag: 0xfacc15, phase: 1.1 },
      { x: 122.0, z: 38.7, mode: 'strollX', range: 12.0, speed: 1.15, shirt: 0xe11d48, phase: 3.6 },
      { x: 135.0, z: 41.2, mode: 'strollX', range: 9.5, speed: 1.12, shirt: 0x6366f1, bag: 0xf8fafc, phase: 2.5 },
    ];

    specs.forEach((sp, idx) => {
      const char = buildShopper({
        shirtHex: sp.shirt,
        pantHex: 0x1e293b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
        bagHex: sp.bag,
      });
      char.root.position.set(sp.x, 0, sp.z);
      const modelSpec = pickOutsideNpcModel(250 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: sp.phase,
      });
      this.rootGroup.add(char.root);
      this.npcs.push({
        ...char,
        mode: sp.mode,
        originX: sp.x,
        originZ: sp.z,
        range: sp.range,
        speed: sp.speed,
        phase: sp.phase,
        glbHandle,
      });
    });

    // UNIQLO Mega Flagship Staff (1 Cashier at 3-POS Counter + 1 Floor Associate)
    const cashier = buildShopper({
      shirtHex: 0xf8fafc,
      pantHex: 0x0f172a,
      skinHex: '#f1c27d',
      skinColor: 0xf1c27d,
      apronHex: 0xdc2626,
    });
    cashier.root.position.set(99.45, 0.075, 63.4);
    cashier.root.rotation.y = Math.PI / 2;
    const cashierGlb = attachGlbHumanToNpc({
      modelSource: CASHIER_NPC_MODEL.modelSource,
      hostGroup: cashier.root,
      fallbackMeshes: [cashier.hips],
      targetHeight: CASHIER_NPC_MODEL.targetHeight,
      rotationY: CASHIER_NPC_MODEL.rotationY,
      clipProfile: CASHIER_NPC_MODEL.clipProfile,
      initialState: 'Idle',
      phaseOffset: 0.4,
    });
    this.rootGroup.add(cashier.root);
    this.uniqloStaff.push({ root: cashier.root, armL: cashier.armL, armR: cashier.armR, baseYaw: Math.PI / 2, phase: 0, glbHandle: cashierGlb });

    const floorStaff = buildShopper({
      shirtHex: 0x0f172a,
      pantHex: 0x334155,
      skinHex: '#e0ac69',
      skinColor: 0xe0ac69,
      apronHex: 0xdc2626,
    });
    floorStaff.root.position.set(106.2, 0.075, 49.8);
    floorStaff.root.rotation.y = 0;
    const floorStaffSpec = pickStationaryCivilianModel(270);
    const floorStaffGlb = attachGlbHumanToNpc({
      modelSource: floorStaffSpec.modelSource,
      hostGroup: floorStaff.root,
      fallbackMeshes: [floorStaff.hips],
      targetHeight: floorStaffSpec.targetHeight,
      rotationY: floorStaffSpec.rotationY,
      clipProfile: floorStaffSpec.clipProfile,
      initialState: 'Idle',
      phaseOffset: 1.5,
    });
    this.rootGroup.add(floorStaff.root);
    this.uniqloStaff.push({ root: floorStaff.root, armL: floorStaff.armL, armR: floorStaff.armR, baseYaw: 0, phase: 1.5, glbHandle: floorStaffGlb });

    // Shared White/Red UNIQLO Shopping Bag Mesh Builder
    const bagPaperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const bagRedLogoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const buildUniqloBag = () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.30, 0.26), bagPaperMat);
      g.add(body);
      const logo = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.10), bagRedLogoMat);
      logo.position.y = 0.03;
      g.add(logo);
      g.position.set(0.06, -0.5, 0);
      return g;
    };

    // 6 Autonomous UNIQLO Shoppers (Enter -> Browse 4 Tables / Color-Grid Wall -> Pay at 3-POS -> Walk Out w/ UNIQLO Bag)
    const shopperRoutes: Array<{ shirt: number; pant: number; skin: string; skinHex: number; startWp: number; speed: number; waypoints: UniqloWaypoint[] }> = [
      {
        shirt: 0x38bdf8, pant: 0x1e293b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.35,
        waypoints: [
          { x: 113.8, z: 57.2, pauseDuration: 0.5, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 108.4, z: 55.4, pauseDuration: 2.6, faceY: Math.PI, action: 'browse' },
          { x: 99.3, z: 55.2, pauseDuration: 2.5, faceY: -Math.PI / 2, action: 'browse' },
          { x: 101.7, z: 62.3, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 106.2, z: 57.25, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 117.5, z: 55.5, pauseDuration: 1.6, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xf43f5e, pant: 0x334155, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 2, speed: 1.25,
        waypoints: [
          { x: 113.6, z: 56.4, pauseDuration: 0.5, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 104.0, z: 55.4, pauseDuration: 2.7, faceY: Math.PI, action: 'browse' },
          { x: 99.3, z: 58.6, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'browse' },
          { x: 101.7, z: 63.5, pauseDuration: 2.5, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 106.2, z: 57.1, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 118.2, z: 59.5, pauseDuration: 1.6, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        shirt: 0x22c55e, pant: 0x1e293b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 3, speed: 1.28,
        waypoints: [
          { x: 113.4, z: 58.2, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 108.4, z: 59.1, pauseDuration: 2.6, faceY: 0, action: 'browse' },
          { x: 104.0, z: 59.1, pauseDuration: 2.4, faceY: 0, action: 'browse' },
          { x: 101.7, z: 64.4, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 106.2, z: 57.4, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 116.8, z: 57.2, pauseDuration: 1.4, faceY: Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xfbbf24, pant: 0x0f172a, skin: '#d2996c', skinHex: 0xd2996c, startWp: 0, speed: 1.32,
        waypoints: [
          { x: 114.2, z: 57.6, pauseDuration: 0.5, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 108.4, z: 52.5, pauseDuration: 2.7, faceY: 0, action: 'browse' },
          { x: 104.2, z: 49.7, pauseDuration: 2.5, faceY: Math.PI, action: 'browse' },
          { x: 101.7, z: 62.8, pauseDuration: 2.3, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 106.2, z: 57.0, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 119.0, z: 53.5, pauseDuration: 1.8, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xa855f7, pant: 0x334155, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 4, speed: 1.22,
        waypoints: [
          { x: 113.5, z: 56.8, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 101.4, z: 50.6, pauseDuration: 2.5, faceY: -Math.PI / 2, action: 'browse' },
          { x: 107.6, z: 49.8, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 101.7, z: 63.9, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 106.2, z: 57.3, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 117.4, z: 61.5, pauseDuration: 1.7, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xea580c, pant: 0x1e293b, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 5, speed: 1.30,
        waypoints: [
          { x: 113.9, z: 58.6, pauseDuration: 0.5, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 104.0, z: 62.1, pauseDuration: 2.6, faceY: Math.PI, action: 'browse' },
          { x: 99.3, z: 56.8, pauseDuration: 2.5, faceY: -Math.PI / 2, action: 'browse' },
          { x: 101.7, z: 63.2, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 106.2, z: 57.2, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 116.5, z: 52.0, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
    ];

    shopperRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const bagMesh = buildUniqloBag();
      const initWp = sr.waypoints[sr.startWp];
      const hasBagInitially = sr.startWp >= 4;
      bagMesh.visible = hasBagInitially;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, initWp.x <= 112.0 ? 0.075 : 0.0, initWp.z);
      const modelSpec = pickOutsideNpcModel(275 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.1,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.1,
        glbHandle,
      });
    });

    // STARBUCKS RESERVE ROASTERY Baristas (2 Front Espresso Bar + 1 Deep West Pour-Over Master)
    [
      { x: 102.52, z: 77.2, rotY: Math.PI / 2, phase: 0.4 },
      { x: 102.52, z: 80.4, rotY: Math.PI / 2, phase: 2.1 },
      { x: 92.8, z: 86.9, rotY: Math.PI, phase: 1.2 },
    ].forEach((b, idx) => {
      const barista = buildShopper({
        shirtHex: 0x18181b,
        pantHex: 0x0f172a,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
        apronHex: 0x00704a,
        capHex: 0x00704a,
      });
      barista.root.position.set(b.x, 0.075, b.z);
      barista.root.rotation.y = b.rotY;
      const modelSpec = idx === 0 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(285 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: barista.root,
        fallbackMeshes: [barista.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: b.phase,
      });
      this.rootGroup.add(barista.root);
      this.uniqloStaff.push({
        root: barista.root,
        armL: barista.armL,
        armR: barista.armR,
        baseYaw: b.rotY,
        phase: b.phase,
        glbHandle,
      });
    });

    // Starbucks Cup Mesh Builder for Walk-In Guests & Seated Patrons
    const sbGreenCupMat = new THREE.MeshStandardMaterial({ color: 0x00704a, roughness: 0.4 });
    const buildStarbucksCup = () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.034, 0.14, 10), bagPaperMat);
      g.add(body);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.040, 0.055, 10), sbGreenCupMat);
      g.add(sleeve);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.018, 10), bagPaperMat);
      lid.position.y = 0.075;
      g.add(lid);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6), sbGreenCupMat);
      straw.position.y = 0.115;
      g.add(straw);
      g.position.set(0.02, -0.45, 0.06);
      return g;
    };

    // 6 Seated Starbucks Reserve Patrons (North Sofa, Window Barstool, Deep Library Table, Velvet Booth, Pour-Over Bar)
    [
      { x: 102.7, z: 68.55, rotY: 0, seatY: 0.50, shirt: 0x0284c7, mode: 'sip' as const, phase: 0.3 },
      { x: 110.75, z: 70.2, rotY: Math.PI / 2, seatY: 0.72, shirt: 0x7c3aed, mode: 'sip' as const, phase: 3.4 },
      { x: 83.8, z: 80.25, rotY: 0, seatY: 0.49, shirt: 0xe11d48, mode: 'laptop' as const, phase: 1.5 },
      { x: 87.0, z: 82.55, rotY: Math.PI, seatY: 0.49, shirt: 0x16a34a, mode: 'sip' as const, phase: 2.7 },
      { x: 79.32, z: 76.4, rotY: Math.PI / 2, seatY: 0.50, shirt: 0xf59e0b, mode: 'sip' as const, phase: 0.9 },
      { x: 92.8, z: 84.35, rotY: 0, seatY: 0.72, shirt: 0x0ea5e9, mode: 'sip' as const, phase: 2.1 },
    ].forEach((gSpec, idx) => {
      const guest = buildShopper({
        shirtHex: gSpec.shirt,
        pantHex: 0x1e293b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
      });
      guest.root.position.set(gSpec.x, 0.075, gSpec.z);
      guest.root.rotation.y = gSpec.rotY;
      guest.hips.position.y = gSpec.seatY;
      guest.legL.rotation.x = -1.32;
      guest.legR.rotation.x = -1.32;
      if (gSpec.mode === 'sip') {
        const handCup = buildStarbucksCup();
        guest.armR.add(handCup);
      }
      const glbHost = new THREE.Group();
      glbHost.position.y = gSpec.seatY >= 0.64 ? gSpec.seatY - 0.50 : 0;
      guest.root.add(glbHost);
      const modelSpec = pickSeatedCivilianModel(290 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: glbHost,
        fallbackMeshes: [guest.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Sit',
        phaseOffset: gSpec.phase,
      });
      this.rootGroup.add(guest.root);
      this.seatedCafeGuests.push({
        root: guest.root,
        armL: guest.armL,
        armR: guest.armR,
        head: guest.head,
        phase: gSpec.phase,
        mode: gSpec.mode,
        glbHandle,
        glbHost,
      });
    });

    // 3 Walk-In Starbucks Reserve Coffee Customers (Front Espresso Bar + Deep Roastery Hall Promenade)
    const sbShopperRoutes: Array<{ shirt: number; pant: number; skin: string; skinHex: number; startWp: number; speed: number; waypoints: UniqloWaypoint[] }> = [
      {
        shirt: 0x0ea5e9, pant: 0x1e293b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 0, speed: 1.32,
        waypoints: [
          { x: 114.4, z: 78.0, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 105.2, z: 76.4, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'pay' },
          { x: 105.2, z: 80.2, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'browse', bagAfter: true },
          { x: 110.2, z: 78.6, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 117.5, z: 76.5, pauseDuration: 1.6, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xf43f5e, pant: 0x334155, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 2, speed: 1.24,
        waypoints: [
          { x: 114.2, z: 79.2, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 105.2, z: 77.0, pauseDuration: 2.3, faceY: -Math.PI / 2, action: 'pay' },
          { x: 105.2, z: 80.5, pauseDuration: 1.8, faceY: -Math.PI / 2, action: 'browse', bagAfter: true },
          { x: 104.2, z: 84.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 96.2, z: 82.5, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 91.6, z: 77.6, pauseDuration: 2.4, faceY: Math.PI / 2, action: 'browse' },
          { x: 98.5, z: 84.0, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 110.0, z: 78.8, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 118.2, z: 80.8, pauseDuration: 1.8, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xf59e0b, pant: 0x0f172a, skin: '#d2996c', skinHex: 0xd2996c, startWp: 4, speed: 1.28,
        waypoints: [
          { x: 114.0, z: 78.5, pauseDuration: 0.5, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 105.1, z: 75.8, pauseDuration: 2.5, faceY: -Math.PI / 2, action: 'pay' },
          { x: 105.1, z: 79.8, pauseDuration: 1.9, faceY: -Math.PI / 2, action: 'browse', bagAfter: true },
          { x: 108.8, z: 69.5, pauseDuration: 2.1, faceY: Math.PI, action: 'browse' },
          { x: 110.4, z: 78.0, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 116.8, z: 74.2, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
    ];

    sbShopperRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const cupMesh = buildStarbucksCup();
      const initWp = sr.waypoints[sr.startWp];
      cupMesh.visible = sr.startWp >= 3;
      char.armR.add(cupMesh);
      char.root.position.set(initWp.x, initWp.x <= 112.0 ? 0.075 : 0.0, initWp.z);
      const modelSpec = pickOutsideNpcModel(300 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.7,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh: cupMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.7,
        glbHandle,
      });
    });

    // AEON STYLE Deep Hypermarket Staff (Sushi Master, Hot Delica Chef, Bakery Associate & Checkout Cashier)
    [
      { x: 174.1, z: 52.1, rotY: -Math.PI / 2, shirt: 0xffffff, apron: 0x7f1d1d, cap: 0xffffff, phase: 0.8 },
      { x: 174.1, z: 57.9, rotY: -Math.PI / 2, shirt: 0xffffff, apron: 0x78350f, cap: 0xffffff, phase: 1.9 },
      { x: 146.4, z: 59.8, rotY: Math.PI, shirt: 0xf8fafc, apron: 0xa21caf, phase: 2.3 },
      { x: 148.9, z: 49.4, rotY: 0, shirt: 0xf8fafc, apron: 0xa21caf, phase: 3.1 },
    ].forEach((st, idx) => {
      const staff = buildShopper({
        shirtHex: st.shirt,
        pantHex: 0x0f172a,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
        apronHex: st.apron,
        capHex: st.cap,
      });
      staff.root.position.set(st.x, 0.075, st.z);
      staff.root.rotation.y = st.rotY;
      const modelSpec = idx === 3 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(310 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: staff.root,
        fallbackMeshes: [staff.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: st.phase,
      });
      this.rootGroup.add(staff.root);
      this.uniqloStaff.push({
        root: staff.root,
        armL: staff.armL,
        armR: staff.armR,
        baseYaw: st.rotY,
        phase: st.phase,
        glbHandle,
      });
    });

    // ZARA Flagship Stylist + H&M Flagship Associate behind Rear 32m Cashdesks
    [
      { x: 174.6, z: 69.7, shirt: 0x09090b, apron: undefined, phase: 0.4 },
      { x: 174.6, z: 83.2, shirt: 0xdc2626, apron: 0x18181b, phase: 1.5 },
    ].forEach((fs, idx) => {
      const staff = buildShopper({
        shirtHex: fs.shirt,
        pantHex: 0x18181b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
        apronHex: fs.apron,
      });
      staff.root.position.set(fs.x, 0.075, fs.z);
      staff.root.rotation.y = -Math.PI / 2;
      const modelSpec = pickStationaryCivilianModel(316 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: staff.root,
        fallbackMeshes: [staff.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: fs.phase,
      });
      this.rootGroup.add(staff.root);
      this.uniqloStaff.push({
        root: staff.root,
        armL: staff.armL,
        armR: staff.armR,
        baseYaw: -Math.PI / 2,
        phase: fs.phase,
        glbHandle,
      });
    });

    // Branded Shopping Bag Builders (AEON Magenta, ZARA Minimalist Black-Cream, H&M White-Red)
    const aeonBagMat = new THREE.MeshStandardMaterial({ color: 0xa21caf, roughness: 0.45 });
    const zaraBagMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.45 });
    const zaraBandMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.45 });
    const hmBagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 });
    const hmBandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });

    const buildBrandedBag = (bodyMat: THREE.Material, stripeMat: THREE.Material) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.28, 0.26), bodyMat);
      g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.27), stripeMat);
      stripe.position.y = 0.06;
      g.add(stripe);
      g.position.set(0.06, -0.5, 0);
      return g;
    };

    // Walk-In Shoppers for Deep 32m AEON STYLE (5), ZARA Flagship (3), & H&M Flagship (3)
    const eastWingShopperRoutes: Array<{
      brand: 'aeon' | 'zara' | 'hm';
      shirt: number;
      pant: number;
      skin: string;
      skinHex: number;
      startWp: number;
      speed: number;
      waypoints: UniqloWaypoint[];
    }> = [
      // AEON STYLE 5 Deep Hypermarket Shoppers
      {
        brand: 'aeon', shirt: 0xec4899, pant: 0x1e293b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.32,
        waypoints: [
          { x: 141.8, z: 54.0, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 159.0, z: 53.6, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' },
          { x: 171.4, z: 52.2, pauseDuration: 2.8, faceY: Math.PI / 2, action: 'browse' },
          { x: 166.4, z: 54.0, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'browse' },
          { x: 146.4, z: 57.9, pauseDuration: 2.3, faceY: 0, action: 'pay', bagAfter: true },
          { x: 145.0, z: 54.2, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 138.8, z: 52.5, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'aeon', shirt: 0x2563eb, pant: 0x334155, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 2, speed: 1.28,
        waypoints: [
          { x: 141.6, z: 54.8, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 160.2, z: 58.2, pauseDuration: 2.5, faceY: 0, action: 'browse' },
          { x: 171.2, z: 57.6, pauseDuration: 2.6, faceY: Math.PI / 2, action: 'browse' },
          { x: 149.2, z: 57.9, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 145.4, z: 54.6, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.2, z: 57.0, pauseDuration: 1.5, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'aeon', shirt: 0x16a34a, pant: 0x0f172a, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 3, speed: 1.30,
        waypoints: [
          { x: 142.0, z: 53.4, pauseDuration: 0.5, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 148.8, z: 50.4, pauseDuration: 2.5, faceY: 0, action: 'browse' },
          { x: 162.8, z: 53.8, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 170.8, z: 53.5, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'browse' },
          { x: 152.0, z: 57.9, pauseDuration: 2.3, faceY: 0, action: 'pay', bagAfter: true },
          { x: 145.0, z: 54.0, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 138.4, z: 55.0, pauseDuration: 1.6, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        brand: 'aeon', shirt: 0xf59e0b, pant: 0x1e293b, skin: '#d2996c', skinHex: 0xd2996c, startWp: 0, speed: 1.26,
        waypoints: [
          { x: 141.7, z: 55.2, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 157.5, z: 49.9, pauseDuration: 2.5, faceY: Math.PI, action: 'browse' },
          { x: 168.4, z: 52.0, pauseDuration: 2.4, faceY: 0, action: 'browse' },
          { x: 149.2, z: 57.9, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 145.4, z: 54.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.5, z: 50.5, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'aeon', shirt: 0x7c3aed, pant: 0x0f172a, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 4, speed: 1.34,
        waypoints: [
          { x: 141.9, z: 54.2, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 165.8, z: 54.2, pauseDuration: 1.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 171.3, z: 50.8, pauseDuration: 2.6, faceY: Math.PI / 2, action: 'browse' },
          { x: 156.5, z: 58.2, pauseDuration: 2.2, faceY: 0, action: 'browse' },
          { x: 146.5, z: 57.9, pauseDuration: 2.1, faceY: 0, action: 'pay', bagAfter: true },
          { x: 145.2, z: 54.2, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.0, z: 53.8, pauseDuration: 1.4, faceY: Math.PI, action: 'walk_through' },
        ],
      },

      // ZARA 3 Deep 32m Flagship Fashion Shoppers
      {
        brand: 'zara', shirt: 0x18181b, pant: 0xd6d3d1, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.24,
        waypoints: [
          { x: 141.6, z: 68.0, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 148.6, z: 66.6, pauseDuration: 2.5, faceY: 0, action: 'browse' },
          { x: 159.4, z: 63.8, pauseDuration: 2.4, faceY: 0, action: 'browse' },
          { x: 168.4, z: 66.5, pauseDuration: 2.1, faceY: 0, action: 'browse' },
          { x: 172.5, z: 68.5, pauseDuration: 2.2, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 170.5, z: 66.5, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 155.0, z: 66.5, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 145.6, z: 68.0, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.0, z: 66.8, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'zara', shirt: 0xd6b084, pant: 0x18181b, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 3, speed: 1.26,
        waypoints: [
          { x: 141.8, z: 67.6, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 152.2, z: 69.4, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 160.2, z: 72.3, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 172.5, z: 71.0, pauseDuration: 2.2, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 165.0, z: 69.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 145.6, z: 69.0, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.4, z: 69.5, pauseDuration: 1.5, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'zara', shirt: 0xf8fafc, pant: 0x27272a, skin: '#d2996c', skinHex: 0xd2996c, startWp: 0, speed: 1.22,
        waypoints: [
          { x: 141.5, z: 68.4, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 150.5, z: 63.5, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 168.4, z: 69.6, pauseDuration: 2.3, faceY: Math.PI, action: 'browse' },
          { x: 172.5, z: 69.7, pauseDuration: 2.1, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 170.5, z: 66.6, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 145.6, z: 67.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 138.6, z: 68.0, pauseDuration: 1.6, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },

      // H&M 3 Deep 32m Flagship Streetwear Shoppers
      {
        brand: 'hm', shirt: 0xdc2626, pant: 0x1e293b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.30,
        waypoints: [
          { x: 141.6, z: 81.8, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 148.8, z: 80.5, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 159.5, z: 80.4, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 168.5, z: 80.4, pauseDuration: 2.2, faceY: 0, action: 'browse' },
          { x: 172.5, z: 82.0, pauseDuration: 2.1, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 170.5, z: 83.3, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 145.6, z: 81.8, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.0, z: 80.5, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'hm', shirt: 0x3b82f6, pant: 0x0f172a, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 3, speed: 1.26,
        waypoints: [
          { x: 141.8, z: 82.4, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 151.0, z: 86.4, pauseDuration: 2.3, faceY: 0, action: 'browse' },
          { x: 160.0, z: 86.2, pauseDuration: 2.3, faceY: Math.PI, action: 'browse' },
          { x: 172.5, z: 84.6, pauseDuration: 2.1, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 170.5, z: 83.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 155.0, z: 83.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 145.6, z: 82.2, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 139.5, z: 83.4, pauseDuration: 1.6, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'hm', shirt: 0xec4899, pant: 0x334155, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 0, speed: 1.28,
        waypoints: [
          { x: 141.5, z: 81.2, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 152.6, z: 80.5, pauseDuration: 2.3, faceY: 0, action: 'browse' },
          { x: 162.0, z: 77.3, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' },
          { x: 165.0, z: 83.3, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' },
          { x: 172.5, z: 83.2, pauseDuration: 2.1, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 170.5, z: 80.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 145.6, z: 81.4, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 138.6, z: 81.8, pauseDuration: 1.5, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
    ];

    eastWingShopperRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const bagMesh =
        sr.brand === 'aeon'
          ? buildBrandedBag(aeonBagMat, bagPaperMat)
          : sr.brand === 'zara'
            ? buildBrandedBag(zaraBagMat, zaraBandMat)
            : buildBrandedBag(hmBagMat, hmBandMat);
      const initWp = sr.waypoints[sr.startWp];
      const payIdx = sr.waypoints.findIndex((w) => w.bagAfter);
      bagMesh.visible = payIdx >= 0 && sr.startWp > payIdx;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, initWp.x >= 144.0 ? 0.075 : 0.0, initWp.z);
      const modelSpec = pickOutsideNpcModel(320 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.3,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.3,
        glbHandle,
      });
    });

    // MLB Korea Associate + CHARLES & KEITH Advisor behind 34m Deep Checkout Counters
    [
      { x: 118.6, z: 123.85, shirt: 0x1e3a8a, apron: 0x0f172a, phase: 0.6 },
      { x: 136.05, z: 123.65, shirt: 0x181412, apron: undefined, phase: 2.0 },
    ].forEach((ss, idx) => {
      const staff = buildShopper({
        shirtHex: ss.shirt,
        pantHex: 0x0f172a,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
        apronHex: ss.apron,
      });
      staff.root.position.set(ss.x, 0.075, ss.z);
      staff.root.rotation.y = Math.PI;
      const modelSpec = pickStationaryCivilianModel(335 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: staff.root,
        fallbackMeshes: [staff.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: ss.phase,
      });
      this.rootGroup.add(staff.root);
      this.uniqloStaff.push({
        root: staff.root,
        armL: staff.armL,
        armR: staff.armR,
        baseYaw: Math.PI,
        phase: ss.phase,
        glbHandle,
      });
    });

    const mlbBagMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.42 });
    const cnkBagMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.44 });
    const cnkGoldBandMat = new THREE.MeshStandardMaterial({ color: 0xc8a258, roughness: 0.35 });

    // 6 Autonomous Shoppers for 34m Deep South Rear Wing (3 MLB Korea + 3 CHARLES & KEITH)
    const southWingShopperRoutes: Array<{
      brand: 'mlb' | 'cnk';
      shirt: number;
      pant: number;
      skin: string;
      skinHex: number;
      startWp: number;
      speed: number;
      waypoints: UniqloWaypoint[];
    }> = [
      {
        brand: 'mlb', shirt: 0xffffff, pant: 0x1e293b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.30,
        waypoints: [
          { x: 118.8, z: 89.2, pauseDuration: 0.4, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 114.2, z: 98.4, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'browse' },
          { x: 114.2, z: 112.0, pauseDuration: 2.3, faceY: -Math.PI / 2, action: 'browse' },
          { x: 118.6, z: 121.6, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 118.6, z: 111.5, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 119.0, z: 93.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 119.0, z: 86.2, pauseDuration: 1.5, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'mlb', shirt: 0xdc2626, pant: 0x0f172a, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 3, speed: 1.28,
        waypoints: [
          { x: 119.4, z: 89.0, pauseDuration: 0.4, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 122.5, z: 98.6, pauseDuration: 2.2, faceY: 0, action: 'browse' },
          { x: 119.4, z: 105.6, pauseDuration: 2.4, faceY: 0, action: 'browse' },
          { x: 125.5, z: 114.5, pauseDuration: 2.2, faceY: Math.PI / 2, action: 'browse' },
          { x: 117.4, z: 121.6, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 119.0, z: 111.5, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 119.0, z: 93.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 118.4, z: 85.8, pauseDuration: 1.5, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        brand: 'mlb', shirt: 0x2563eb, pant: 0x1e293b, skin: '#d2996c', skinHex: 0xd2996c, startWp: 2, speed: 1.26,
        waypoints: [
          { x: 118.5, z: 89.0, pauseDuration: 0.4, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 116.3, z: 112.6, pauseDuration: 2.3, faceY: 0, action: 'browse' },
          { x: 122.5, z: 116.8, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' },
          { x: 120.0, z: 121.6, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 119.0, z: 111.5, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 119.0, z: 93.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 117.8, z: 86.4, pauseDuration: 1.5, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'cnk', shirt: 0x181412, pant: 0xded4c6, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.24,
        waypoints: [
          { x: 136.0, z: 89.0, pauseDuration: 0.4, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 132.5, z: 97.2, pauseDuration: 2.4, faceY: Math.PI, action: 'browse' },
          { x: 132.3, z: 109.8, pauseDuration: 2.3, faceY: Math.PI, action: 'browse' },
          { x: 134.8, z: 121.4, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 136.0, z: 111.2, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 136.0, z: 93.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 137.0, z: 86.0, pauseDuration: 1.5, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'cnk', shirt: 0x9f7e69, pant: 0x18181b, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 2, speed: 1.26,
        waypoints: [
          { x: 135.5, z: 89.2, pauseDuration: 0.4, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 139.6, z: 97.2, pauseDuration: 2.3, faceY: Math.PI, action: 'browse' },
          { x: 141.9, z: 112.0, pauseDuration: 2.4, faceY: Math.PI / 2, action: 'browse' },
          { x: 137.4, z: 121.4, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 136.2, z: 111.2, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 136.2, z: 93.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 135.0, z: 85.8, pauseDuration: 1.5, faceY: Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        brand: 'cnk', shirt: 0xf8fafc, pant: 0x44403c, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 3, speed: 1.22,
        waypoints: [
          { x: 136.3, z: 89.2, pauseDuration: 0.4, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 130.2, z: 103.5, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'browse' },
          { x: 139.8, z: 109.8, pauseDuration: 2.3, faceY: Math.PI, action: 'browse' },
          { x: 136.05, z: 116.8, pauseDuration: 2.0, faceY: Math.PI, action: 'browse' },
          { x: 136.05, z: 121.4, pauseDuration: 2.2, faceY: 0, action: 'pay', bagAfter: true },
          { x: 135.6, z: 111.2, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 136.0, z: 93.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 136.5, z: 86.2, pauseDuration: 1.5, faceY: Math.PI, action: 'walk_through' },
        ],
      },
    ];

    southWingShopperRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const bagMesh =
        sr.brand === 'mlb'
          ? buildBrandedBag(mlbBagMat, bagPaperMat)
          : buildBrandedBag(cnkBagMat, cnkGoldBandMat);
      const initWp = sr.waypoints[sr.startWp];
      const payIdx = sr.waypoints.findIndex((w) => w.bagAfter);
      bagMesh.visible = payIdx >= 0 && sr.startWp > payIdx;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, initWp.z >= 91.15 ? 0.075 : 0.0, initWp.z);
      const modelSpec = pickOutsideNpcModel(340 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.5,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.5,
        glbHandle,
      });
    });

    // Floor 2 Sportswear Staff (32m ADIDAS, NIKE, PUMA Cashdesks)
    [
      { x: 174.6, z: 58.05, shirt: 0x0f172a, apron: 0x38bdf8, phase: 0.5 },
      { x: 174.6, z: 71.85, shirt: 0x18181b, apron: 0xf97316, phase: 1.8 },
      { x: 174.6, z: 85.65, shirt: 0x18181b, apron: 0xdc2626, phase: 2.9 },
    ].forEach((st, idx) => {
      const staff = buildShopper({
        shirtHex: st.shirt,
        pantHex: 0x0f172a,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
        apronHex: st.apron,
      });
      staff.root.position.set(st.x, 6.255, st.z);
      staff.root.rotation.y = -Math.PI / 2;
      const modelSpec = pickStationaryCivilianModel(350 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: staff.root,
        fallbackMeshes: [staff.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: st.phase,
      });
      this.rootGroup.add(staff.root);
      this.uniqloStaff.push({
        root: staff.root,
        armL: staff.armL,
        armR: staff.armR,
        baseYaw: -Math.PI / 2,
        phase: st.phase,
        glbHandle,
      });
    });

    const adidasBagMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.42 });
    const nikeBagMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42 });
    const pumaBagMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });

    // 6 Autonomous Floor 2 Sportswear Shoppers across 32m ADIDAS, NIKE & PUMA Flagships
    const floor2SportsRoutes: Array<{
      brand: 'adidas' | 'nike' | 'puma';
      shirt: number;
      pant: number;
      skin: string;
      skinHex: number;
      startWp: number;
      speed: number;
      waypoints: UniqloWaypoint[];
    }> = [
      {
        brand: 'adidas', shirt: 0x38bdf8, pant: 0x0f172a, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.32,
        waypoints: [
          { x: 141.6, z: 54.25, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 152.0, z: 54.25, pauseDuration: 1.8, faceY: Math.PI / 2, action: 'browse' },
          { x: 158.2, z: 52.1, pauseDuration: 2.2, faceY: 0, action: 'browse' },
          { x: 171.6, z: 54.25, pauseDuration: 2.4, faceY: Math.PI / 2, action: 'browse' },
          { x: 171.8, z: 58.05, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 165.0, z: 54.25, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 153.0, z: 54.25, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 141.6, z: 59.8, pauseDuration: 1.4, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'adidas', shirt: 0xf8fafc, pant: 0x1e3a8a, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 3, speed: 1.28,
        waypoints: [
          { x: 141.8, z: 54.25, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 149.4, z: 51.8, pauseDuration: 2.1, faceY: Math.PI, action: 'browse' },
          { x: 162.5, z: 55.6, pauseDuration: 2.2, faceY: 0, action: 'browse' },
          { x: 173.4, z: 53.4, pauseDuration: 2.3, faceY: Math.PI / 2, action: 'browse' },
          { x: 171.8, z: 57.6, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 153.5, z: 54.25, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 141.6, z: 50.5, pauseDuration: 1.4, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'nike', shirt: 0xf97316, pant: 0x18181b, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 2, speed: 1.34,
        waypoints: [
          { x: 141.6, z: 68.05, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 152.0, z: 68.05, pauseDuration: 1.8, faceY: Math.PI / 2, action: 'browse' },
          { x: 158.2, z: 70.2, pauseDuration: 2.3, faceY: Math.PI, action: 'browse' },
          { x: 171.6, z: 68.05, pauseDuration: 2.4, faceY: Math.PI / 2, action: 'browse' },
          { x: 171.8, z: 71.85, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 165.0, z: 68.05, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 153.0, z: 68.05, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 141.6, z: 73.5, pauseDuration: 1.4, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'nike', shirt: 0x18181b, pant: 0x475569, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 4, speed: 1.29,
        waypoints: [
          { x: 141.8, z: 68.05, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 149.4, z: 65.8, pauseDuration: 2.0, faceY: Math.PI, action: 'browse' },
          { x: 162.5, z: 66.2, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' },
          { x: 173.4, z: 67.2, pauseDuration: 2.3, faceY: Math.PI / 2, action: 'browse' },
          { x: 171.8, z: 71.3, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 153.5, z: 68.05, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 141.6, z: 64.2, pauseDuration: 1.4, faceY: Math.PI, action: 'walk_through' },
        ],
      },
      {
        brand: 'puma', shirt: 0xdc2626, pant: 0x1e293b, skin: '#d2996c', skinHex: 0xd2996c, startWp: 1, speed: 1.30,
        waypoints: [
          { x: 141.6, z: 81.85, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 152.0, z: 81.85, pauseDuration: 1.8, faceY: Math.PI / 2, action: 'browse' },
          { x: 158.2, z: 79.7, pauseDuration: 2.3, faceY: 0, action: 'browse' },
          { x: 171.6, z: 81.85, pauseDuration: 2.4, faceY: Math.PI / 2, action: 'browse' },
          { x: 171.8, z: 85.65, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 165.0, z: 81.85, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 153.0, z: 81.85, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 141.6, z: 87.2, pauseDuration: 1.4, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'puma', shirt: 0xfacc15, pant: 0x18181b, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 3, speed: 1.27,
        waypoints: [
          { x: 141.8, z: 81.85, pauseDuration: 0.4, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 149.4, z: 84.1, pauseDuration: 2.0, faceY: 0, action: 'browse' },
          { x: 162.5, z: 83.2, pauseDuration: 2.2, faceY: 0, action: 'browse' },
          { x: 173.4, z: 81.0, pauseDuration: 2.3, faceY: Math.PI / 2, action: 'browse' },
          { x: 171.8, z: 85.1, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 153.5, z: 81.85, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' },
          { x: 141.6, z: 77.8, pauseDuration: 1.4, faceY: Math.PI, action: 'walk_through' },
        ],
      },
    ];

    floor2SportsRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const bagMesh =
        sr.brand === 'adidas'
          ? buildBrandedBag(adidasBagMat, bagPaperMat)
          : sr.brand === 'nike'
            ? buildBrandedBag(nikeBagMat, zaraBandMat)
            : buildBrandedBag(pumaBagMat, bagPaperMat);
      const initWp = sr.waypoints[sr.startWp];
      const payIdx = sr.waypoints.findIndex((w) => w.bagAfter);
      bagMesh.visible = payIdx >= 0 && sr.startWp > payIdx;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, 6.18 + (initWp.x >= 144.0 ? 0.075 : 0.0), initWp.z);
      const modelSpec = pickOutsideNpcModel(355 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.4,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.4,
        baseY: 6.18,
        glbHandle,
      });
    });

    // Floor 2 West Wing Staff (MUJI, LOCK&LOCK, LEVI'S Cashdesks)
    [
      { x: 101.05, z: 58.45, shirt: 0xf5f5f4, apron: 0x7f1d1d, phase: 0.7 },
      { x: 101.05, z: 72.25, shirt: 0xf8fafc, apron: 0x2563eb, phase: 1.9 },
      { x: 101.05, z: 86.05, shirt: 0x1e3a8a, apron: 0xb91c1c, phase: 3.1 },
    ].forEach((st, idx) => {
      const staff = buildShopper({
        shirtHex: st.shirt,
        pantHex: 0x1e293b,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
        apronHex: st.apron,
      });
      staff.root.position.set(st.x, 6.255, st.z);
      staff.root.rotation.y = Math.PI / 2;
      const modelSpec = pickStationaryCivilianModel(365 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: staff.root,
        fallbackMeshes: [staff.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: st.phase,
      });
      this.rootGroup.add(staff.root);
      this.uniqloStaff.push({
        root: staff.root,
        armL: staff.armL,
        armR: staff.armR,
        baseYaw: Math.PI / 2,
        phase: st.phase,
        glbHandle,
      });
    });

    const mujiBagMat = new THREE.MeshStandardMaterial({ color: 0xc29b70, roughness: 0.55 });
    const lockBagMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.42 });
    const levisBagMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.44 });

    // 3 Autonomous Floor 2 West Wing Shoppers (MUJI, LOCK&LOCK, LEVI'S)
    const floor2WestRoutes: Array<{
      brand: 'muji' | 'locknlock' | 'levis';
      shirt: number;
      pant: number;
      skin: string;
      skinHex: number;
      startWp: number;
      speed: number;
      waypoints: UniqloWaypoint[];
    }> = [
      {
        brand: 'muji', shirt: 0xf5f5f4, pant: 0x78716c, skin: '#f1c27d', skinHex: 0xf1c27d, startWp: 1, speed: 1.24,
        waypoints: [
          { x: 114.2, z: 54.25, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 107.6, z: 54.25, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'browse' },
          { x: 102.0, z: 54.25, pauseDuration: 2.3, faceY: -Math.PI / 2, action: 'browse' },
          { x: 103.6, z: 58.45, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 110.2, z: 54.25, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 114.2, z: 60.0, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'locknlock', shirt: 0x38bdf8, pant: 0x0f172a, skin: '#e0ac69', skinHex: 0xe0ac69, startWp: 2, speed: 1.28,
        waypoints: [
          { x: 114.2, z: 68.05, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 107.6, z: 68.05, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'browse' },
          { x: 102.0, z: 68.05, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'browse' },
          { x: 103.6, z: 72.25, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 110.2, z: 68.05, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 114.2, z: 73.5, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
      {
        brand: 'levis', shirt: 0x1e3a8a, pant: 0x18181b, skin: '#d2996c', skinHex: 0xd2996c, startWp: 1, speed: 1.26,
        waypoints: [
          { x: 114.2, z: 81.85, pauseDuration: 0.4, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 107.6, z: 81.85, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'browse' },
          { x: 102.0, z: 81.85, pauseDuration: 2.3, faceY: -Math.PI / 2, action: 'browse' },
          { x: 103.6, z: 86.05, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'pay', bagAfter: true },
          { x: 110.2, z: 81.85, pauseDuration: 0.0, faceY: Math.PI / 2, action: 'walk_through' },
          { x: 114.2, z: 87.2, pauseDuration: 1.5, faceY: 0, action: 'walk_through' },
        ],
      },
    ];

    floor2WestRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const bagMesh =
        sr.brand === 'muji'
          ? buildBrandedBag(mujiBagMat, zaraBandMat)
          : sr.brand === 'locknlock'
            ? buildBrandedBag(lockBagMat, bagPaperMat)
            : buildBrandedBag(levisBagMat, bagPaperMat);
      const initWp = sr.waypoints[sr.startWp];
      const payIdx = sr.waypoints.findIndex((w) => w.bagAfter);
      bagMesh.visible = payIdx >= 0 && sr.startWp > payIdx;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, 6.18 + (initWp.x <= 112.0 ? 0.075 : 0.0), initWp.z);
      const modelSpec = pickOutsideNpcModel(370 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.6,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.6,
        baseY: 6.18,
        glbHandle,
      });
    });

    // Floor 2 South Wing Shoppers (TOMMY HILFIGER & CROCS)
    const tommyBagMat = new THREE.MeshStandardMaterial({ color: 0x0c1b33, roughness: 0.86 });
    const tommyBandMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.86 });
    const crocsBagMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.86 });
    const floor2SouthRoutes: Array<{
      brand: 'tommy' | 'crocs';
      shirt: number;
      pant: number;
      skin: string;
      skinHex: number;
      speed: number;
      startWp: number;
      waypoints: UniqloWaypoint[];
    }> = [
      {
        brand: 'tommy',
        shirt: 0xb91c1c,
        pant: 0x0c1b33,
        skin: '#f1c27d',
        skinHex: 0xf1c27d,
        speed: 1.25,
        startWp: 0,
        waypoints: [
          { x: 118.9, z: 88.6, pauseDuration: 0.8, faceY: 0, action: 'walk_through' },
          { x: 118.9, z: 95.8, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'browse' },
          { x: 114.4, z: 103.5, pauseDuration: 2.4, faceY: -Math.PI / 2, action: 'browse' },
          { x: 119.4, z: 110.8, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' },
          { x: 118.6, z: 121.0, pauseDuration: 2.4, faceY: 0, action: 'pay', bagAfter: true },
          { x: 119.2, z: 88.6, pauseDuration: 1.2, faceY: Math.PI, action: 'walk_through', bagAfter: false },
        ],
      },
      {
        brand: 'crocs',
        shirt: 0x65a30d,
        pant: 0x1e293b,
        skin: '#ffe0bd',
        skinHex: 0xffe0bd,
        speed: 1.28,
        startWp: 1,
        waypoints: [
          { x: 136.05, z: 88.6, pauseDuration: 0.8, faceY: 0, action: 'walk_through' },
          { x: 136.05, z: 95.4, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'browse' },
          { x: 130.6, z: 104.2, pauseDuration: 2.5, faceY: -Math.PI / 2, action: 'browse' },
          { x: 136.05, z: 111.2, pauseDuration: 2.6, faceY: Math.PI, action: 'browse' },
          { x: 136.05, z: 120.8, pauseDuration: 2.3, faceY: 0, action: 'pay', bagAfter: true },
          { x: 136.05, z: 88.6, pauseDuration: 1.2, faceY: Math.PI, action: 'walk_through', bagAfter: false },
        ],
      },
    ];

    floor2SouthRoutes.forEach((sr, idx) => {
      const char = buildShopper({
        shirtHex: sr.shirt,
        pantHex: sr.pant,
        skinHex: sr.skin,
        skinColor: sr.skinHex,
      });
      const bagMesh =
        sr.brand === 'tommy'
          ? buildBrandedBag(tommyBagMat, tommyBandMat)
          : buildBrandedBag(crocsBagMat, bagPaperMat);
      const initWp = sr.waypoints[sr.startWp];
      const payIdx = sr.waypoints.findIndex((w) => w.bagAfter);
      bagMesh.visible = payIdx >= 0 && sr.startWp > payIdx;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, 6.18 + (initWp.z > 91.15 ? 0.075 : 0.0), initWp.z);
      const modelSpec = pickOutsideNpcModel(375 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.9 + 0.7,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: sr.waypoints,
        wpIdx: (sr.startWp + 1) % sr.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: sr.speed,
        walkPhase: idx * 1.9 + 0.7,
        baseY: 6.18,
        glbHandle,
      });
    });

    // Floor 2 & Floor 3 Promenade Strollers on Expanded Front Bridge, Side Balconies & Floor 3 Skybridge
    [
      {
        y: 6.18,
        shirt: 0xec4899,
        pant: 0x0f172a,
        speed: 1.25,
        waypoints: [
          { x: 116.2, z: 48.8, pauseDuration: 0.6, faceY: Math.PI / 2, action: 'walk_through' as const },
          { x: 139.8, z: 48.8, pauseDuration: 1.4, faceY: Math.PI, action: 'browse' as const },
          { x: 139.8, z: 68.0, pauseDuration: 1.5, faceY: -Math.PI / 2, action: 'browse' as const },
          { x: 139.8, z: 48.8, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' as const },
        ],
      },
      {
        y: 12.18,
        shirt: 0xf59e0b,
        pant: 0x1e293b,
        speed: 1.20,
        waypoints: [
          { x: 116.2, z: 48.8, pauseDuration: 1.2, faceY: Math.PI / 2, action: 'browse' as const },
          { x: 139.8, z: 48.8, pauseDuration: 1.2, faceY: 0, action: 'browse' as const },
          { x: 139.8, z: 69.3, pauseDuration: 1.0, faceY: -Math.PI / 2, action: 'walk_through' as const },
          { x: 116.2, z: 69.3, pauseDuration: 1.4, faceY: Math.PI, action: 'browse' as const },
        ],
      },
      {
        y: 12.18,
        shirt: 0x38bdf8,
        pant: 0x0f172a,
        speed: 1.22,
        waypoints: [
          { x: 139.8, z: 69.3, pauseDuration: 1.0, faceY: -Math.PI / 2, action: 'browse' as const },
          { x: 116.2, z: 69.3, pauseDuration: 1.2, faceY: 0, action: 'browse' as const },
          { x: 116.2, z: 87.6, pauseDuration: 1.4, faceY: Math.PI / 2, action: 'browse' as const },
          { x: 139.8, z: 87.6, pauseDuration: 1.0, faceY: Math.PI, action: 'walk_through' as const },
        ],
      },
    ].forEach((pr, idx) => {
      const char = buildShopper({
        shirtHex: pr.shirt,
        pantHex: pr.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      const bagMesh = buildBrandedBag(bagPaperMat, zaraBandMat);
      bagMesh.visible = idx % 2 === 0;
      char.armR.add(bagMesh);
      char.root.position.set(pr.waypoints[0].x, pr.y, pr.waypoints[0].z);
      const modelSpec = pickOutsideNpcModel(380 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 2.1,
      });
      this.rootGroup.add(char.root);
      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: pr.waypoints,
        wpIdx: 1,
        state: 'walk',
        pauseTimer: 0,
        speed: pr.speed,
        walkPhase: idx * 2.1,
        baseY: pr.y,
        glbHandle,
      });
    });

    // Floor 3 HAIDILAO & KICHI-KICHI Staff, Noodle Chef & Seated Hot Pot Diners
    [
      { x: 145.6, z: 63.8, yaw: -Math.PI / 2, shirt: 0xa4161a, pant: 0x18181b, phase: 0.4 }, // Haidilao Hostess
      { x: 170.2, z: 57.7, yaw: -Math.PI / 2, shirt: 0xf8fafc, pant: 0x0f172a, phase: 2.1 }, // Haidilao Noodle Dancer
      { x: 145.6, z: 72.1, yaw: -Math.PI / 2, shirt: 0xdc2626, pant: 0x18181b, phase: 1.3 }, // Kichi Host
      { x: 171.6, z: 78.5, yaw: -Math.PI / 2, shirt: 0x18181b, pant: 0x0f172a, phase: 3.0 }, // Kichi Chef
    ].forEach((stSpec, idx) => {
      const st = buildShopper({
        shirtHex: stSpec.shirt,
        pantHex: stSpec.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      st.root.position.set(stSpec.x, 12.255, stSpec.z);
      st.root.rotation.y = stSpec.yaw;
      const modelSpec = pickStationaryCivilianModel(385 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: st.root,
        fallbackMeshes: [st.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: stSpec.phase,
      });
      this.rootGroup.add(st.root);
      this.uniqloStaff.push({
        armL: st.armL,
        armR: st.armR,
        root: st.root,
        baseYaw: stSpec.yaw,
        phase: stSpec.phase,
        glbHandle,
      });
    });

    [
      { x: 153.2, z: 49.7, rotY: 0, shirt: 0x2563eb, phase: 0.6 }, // Haidilao Booth Diner 1
      { x: 161.6, z: 65.7, rotY: Math.PI, shirt: 0xf43f5e, phase: 2.2 }, // Haidilao Booth Diner 2
      { x: 154.9, z: 72.0, rotY: 0, shirt: 0x10b981, phase: 1.4 }, // Kichi Conveyor Diner 1
      { x: 162.6, z: 85.0, rotY: Math.PI, shirt: 0xf59e0b, phase: 3.5 }, // Kichi Conveyor Diner 2
    ].forEach((dg, idx) => {
      const guest = buildShopper({
        shirtHex: dg.shirt,
        pantHex: 0x1e293b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
      });
      guest.root.position.set(dg.x, 12.255, dg.z);
      guest.root.rotation.y = dg.rotY;
      guest.hips.position.y = 0.50;
      guest.legL.rotation.x = -1.32;
      guest.legR.rotation.x = -1.32;
      const modelSpec = pickSeatedCivilianModel(390 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: guest.root,
        fallbackMeshes: [guest.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Sit',
        phaseOffset: dg.phase,
      });
      this.rootGroup.add(guest.root);
      this.seatedCafeGuests.push({
        root: guest.root,
        armL: guest.armL,
        armR: guest.armR,
        head: guest.head,
        phase: dg.phase,
        mode: 'sip',
        glbHandle,
      });
    });

    // Floor 3 Walk-In Guests strolling between East Balcony, HAIDILAO Sauce Bar & KICHI-KICHI Promenade
    [
      {
        shirt: 0xe11d48,
        pant: 0x0f172a,
        speed: 1.18,
        waypoints: [
          { x: 141.0, z: 57.7, pauseDuration: 0.8, faceY: Math.PI / 2, action: 'walk_through' as const },
          { x: 146.2, z: 57.7, pauseDuration: 1.4, faceY: Math.PI / 2, action: 'browse' as const },
          { x: 157.4, z: 56.8, pauseDuration: 2.2, faceY: Math.PI / 2, action: 'browse' as const },
          { x: 158.6, z: 58.6, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'browse' as const },
          { x: 141.0, z: 57.7, pauseDuration: 1.2, faceY: -Math.PI / 2, action: 'walk_through' as const },
        ],
      },
      {
        shirt: 0x0284c7,
        pant: 0x1e293b,
        speed: 1.22,
        waypoints: [
          { x: 141.2, z: 78.5, pauseDuration: 0.8, faceY: Math.PI / 2, action: 'walk_through' as const },
          { x: 152.0, z: 78.5, pauseDuration: 1.6, faceY: 0, action: 'browse' as const },
          { x: 162.5, z: 78.5, pauseDuration: 2.2, faceY: Math.PI, action: 'browse' as const },
          { x: 149.2, z: 78.5, pauseDuration: 0.0, faceY: -Math.PI / 2, action: 'walk_through' as const },
          { x: 141.2, z: 78.5, pauseDuration: 1.4, faceY: -Math.PI / 2, action: 'walk_through' as const },
        ],
      },
    ].forEach((f3g, idx) => {
      const char = buildShopper({
        shirtHex: f3g.shirt,
        pantHex: f3g.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      const bagMesh = buildBrandedBag(bagPaperMat, zaraBandMat);
      bagMesh.visible = false;
      char.armR.add(bagMesh);
      char.root.position.set(f3g.waypoints[0].x, 12.18, f3g.waypoints[0].z);
      const modelSpec = pickOutsideNpcModel(395 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 2.4 + 0.5,
      });
      this.rootGroup.add(char.root);
      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: f3g.waypoints,
        wpIdx: 1,
        state: 'walk',
        pauseTimer: 0,
        speed: f3g.speed,
        walkPhase: idx * 2.4 + 0.5,
        baseY: 12.18,
        glbHandle,
      });
    });

    // Floor 3 West Wing HP3 BBQ & TEXAS CHICKEN Staff, Diners & Walk-In Guests
    [
      { x: 110.9, z: 64.2, yaw: Math.PI / 2, shirt: 0xea580c, pant: 0x18181b, phase: 0.7 }, // HP3 BBQ Host
      { x: 101.4, z: 57.7, yaw: Math.PI / 2, shirt: 0x18181b, pant: 0x0f172a, phase: 2.4 }, // HP3 BBQ Grill Chef
      { x: 102.9, z: 78.5, yaw: Math.PI / 2, shirt: 0xdc2626, pant: 0x18181b, phase: 1.5 }, // Texas Chicken Cashier
    ].forEach((stSpec, idx) => {
      const st = buildShopper({
        shirtHex: stSpec.shirt,
        pantHex: stSpec.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      st.root.position.set(stSpec.x, 12.255, stSpec.z);
      st.root.rotation.y = stSpec.yaw;
      const modelSpec = idx === 2 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(400 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: st.root,
        fallbackMeshes: [st.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: stSpec.phase,
      });
      this.rootGroup.add(st.root);
      this.uniqloStaff.push({
        armL: st.armL,
        armR: st.armR,
        root: st.root,
        baseYaw: stSpec.yaw,
        phase: stSpec.phase,
        glbHandle,
      });
    });

    [
      { x: 102.4, z: 49.9, rotY: 0, shirt: 0x3b82f6, phase: 1.1 }, // HP3 BBQ Diner
      { x: 106.4, z: 65.5, rotY: Math.PI, shirt: 0xf43f5e, phase: 2.8 }, // HP3 BBQ Diner
      { x: 104.9, z: 70.2, rotY: 0, shirt: 0x16a34a, phase: 0.9 }, // Texas Chicken Diner
      { x: 108.0, z: 86.7, rotY: Math.PI, shirt: 0xf59e0b, phase: 3.3 }, // Texas Chicken Diner
    ].forEach((dg, idx) => {
      const guest = buildShopper({
        shirtHex: dg.shirt,
        pantHex: 0x1e293b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
      });
      guest.root.position.set(dg.x, 12.255, dg.z);
      guest.root.rotation.y = dg.rotY;
      guest.hips.position.y = 0.50;
      guest.legL.rotation.x = -1.32;
      guest.legR.rotation.x = -1.32;
      const modelSpec = pickSeatedCivilianModel(405 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: guest.root,
        fallbackMeshes: [guest.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Sit',
        phaseOffset: dg.phase,
      });
      this.rootGroup.add(guest.root);
      this.seatedCafeGuests.push({
        root: guest.root,
        armL: guest.armL,
        armR: guest.armR,
        head: guest.head,
        phase: dg.phase,
        mode: 'sip',
        glbHandle,
      });
    });

    [
      {
        shirt: 0xf97316,
        pant: 0x0f172a,
        speed: 1.18,
        waypoints: [
          { x: 114.6, z: 57.7, pauseDuration: 0.8, faceY: -Math.PI / 2, action: 'walk_through' as const },
          { x: 109.2, z: 53.2, pauseDuration: 2.0, faceY: Math.PI, action: 'browse' as const },
          { x: 103.0, z: 57.7, pauseDuration: 1.6, faceY: -Math.PI / 2, action: 'browse' as const },
          { x: 114.6, z: 57.7, pauseDuration: 1.2, faceY: Math.PI / 2, action: 'walk_through' as const },
        ],
      },
      {
        shirt: 0xef4444,
        pant: 0x1e293b,
        speed: 1.24,
        waypoints: [
          { x: 114.6, z: 78.5, pauseDuration: 0.8, faceY: -Math.PI / 2, action: 'walk_through' as const },
          { x: 103.5, z: 78.5, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'pay' as const },
          { x: 108.5, z: 78.5, pauseDuration: 1.4, faceY: Math.PI / 2, action: 'walk_through' as const },
          { x: 114.6, z: 78.5, pauseDuration: 1.2, faceY: Math.PI / 2, action: 'walk_through' as const },
        ],
      },
    ].forEach((f3w, idx) => {
      const char = buildShopper({
        shirtHex: f3w.shirt,
        pantHex: f3w.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      const bagMesh = buildBrandedBag(bagPaperMat, zaraBandMat);
      bagMesh.visible = false;
      char.armR.add(bagMesh);
      char.root.position.set(f3w.waypoints[0].x, 12.18, f3w.waypoints[0].z);
      const modelSpec = pickOutsideNpcModel(410 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 2.1 + 0.3,
      });
      this.rootGroup.add(char.root);
      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: f3w.waypoints,
        wpIdx: 1,
        state: 'walk',
        pauseTimer: 0,
        speed: f3w.speed,
        walkPhase: idx * 2.1 + 0.3,
        baseY: 12.18,
        glbHandle,
      });
    });

    // Floor 3 South Wing CGV CINEMAS Staff, 3-Hall Moviegoers & Walk-In Guests
    [
      { x: 113.5, z: 98.0, yaw: Math.PI / 2, shirt: 0xdc2626, pant: 0x18181b, phase: 0.5 }, // Box Office Cashier
      { x: 142.5, z: 98.0, yaw: -Math.PI / 2, shirt: 0xdc2626, pant: 0x18181b, phase: 2.0 }, // Popcorn Bar Staff
      { x: 126.1, z: 105.4, yaw: Math.PI, shirt: 0x18181b, pant: 0x0f172a, phase: 1.2 }, // Hall Ticket Usher
    ].forEach((stSpec, idx) => {
      const st = buildShopper({
        shirtHex: stSpec.shirt,
        pantHex: stSpec.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      st.root.position.set(stSpec.x, 12.255, stSpec.z);
      st.root.rotation.y = stSpec.yaw;
      const modelSpec = idx === 0 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(415 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: st.root,
        fallbackMeshes: [st.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Idle',
        phaseOffset: stSpec.phase,
      });
      this.rootGroup.add(st.root);
      this.uniqloStaff.push({
        armL: st.armL,
        armR: st.armR,
        root: st.root,
        baseYaw: stSpec.yaw,
        phase: stSpec.phase,
        glbHandle,
      });
    });

    [
      { x: 114.45, y: 12.595, z: 115.28, shirt: 0x38bdf8, phase: 0.8 }, // Hall 1 IMAX Moviegoer
      { x: 120.55, y: 12.595, z: 115.28, shirt: 0xf43f5e, phase: 2.3 }, // Hall 1 IMAX Moviegoer
      { x: 124.95, y: 12.595, z: 115.28, shirt: 0xfacc15, phase: 1.5 }, // Hall 2 Gold Class Moviegoer
      { x: 131.05, y: 12.595, z: 115.28, shirt: 0xa855f7, phase: 2.9 }, // Hall 2 Gold Class Moviegoer
      { x: 135.45, y: 12.995, z: 113.18, shirt: 0x10b981, phase: 3.1 }, // Hall 3 4DX Moviegoer
      { x: 141.55, y: 13.395, z: 111.08, shirt: 0xec4899, phase: 1.1 }, // Hall 3 Sweetbox Moviegoer
    ].forEach((mg, idx) => {
      const guest = buildShopper({
        shirtHex: mg.shirt,
        pantHex: 0x1e293b,
        skinHex: '#e0ac69',
        skinColor: 0xe0ac69,
      });
      guest.root.position.set(mg.x, mg.y, mg.z);
      guest.root.rotation.y = 0; // Face South (+Z) toward cinema screen
      guest.hips.position.y = 0.52;
      guest.legL.rotation.x = -1.32;
      guest.legR.rotation.x = -1.32;
      const modelSpec = pickSeatedCivilianModel(420 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: guest.root,
        fallbackMeshes: [guest.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Sit',
        phaseOffset: mg.phase,
      });
      this.rootGroup.add(guest.root);
      this.seatedCafeGuests.push({
        root: guest.root,
        armL: guest.armL,
        armR: guest.armR,
        head: guest.head,
        phase: mg.phase,
        mode: 'sip',
        glbHandle,
      });
    });

    [
      {
        shirt: 0x3b82f6,
        pant: 0x0f172a,
        speed: 1.24,
        waypoints: [
          { x: 126.6, z: 88.6, pauseDuration: 0.8, faceY: 0, action: 'walk_through' as const },
          { x: 117.5, z: 98.0, pauseDuration: 2.0, faceY: -Math.PI / 2, action: 'pay' as const },
          { x: 117.5, z: 105.4, pauseDuration: 0.8, faceY: 0, action: 'walk_through' as const },
          { x: 117.5, z: 114.6, pauseDuration: 2.2, faceY: 0, action: 'browse' as const },
          { x: 117.5, z: 105.4, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' as const },
          { x: 126.6, z: 88.6, pauseDuration: 1.2, faceY: Math.PI, action: 'walk_through' as const },
        ],
      },
      {
        shirt: 0xec4899,
        pant: 0x1e293b,
        speed: 1.20,
        waypoints: [
          { x: 129.6, z: 88.6, pauseDuration: 0.8, faceY: 0, action: 'walk_through' as const },
          { x: 138.5, z: 98.0, pauseDuration: 2.2, faceY: Math.PI / 2, action: 'pay' as const },
          { x: 138.5, z: 105.4, pauseDuration: 0.8, faceY: 0, action: 'walk_through' as const },
          { x: 138.5, z: 114.6, pauseDuration: 2.2, faceY: 0, action: 'browse' as const },
          { x: 138.5, z: 105.4, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' as const },
          { x: 129.6, z: 88.6, pauseDuration: 1.2, faceY: Math.PI, action: 'walk_through' as const },
        ],
      },
      {
        shirt: 0xfacc15,
        pant: 0x0f172a,
        speed: 1.18,
        waypoints: [
          { x: 128.0, z: 88.6, pauseDuration: 0.8, faceY: 0, action: 'walk_through' as const },
          { x: 128.0, z: 105.4, pauseDuration: 0.9, faceY: 0, action: 'walk_through' as const },
          { x: 128.0, z: 115.0, pauseDuration: 2.4, faceY: 0, action: 'browse' as const },
          { x: 128.0, z: 88.6, pauseDuration: 1.2, faceY: Math.PI, action: 'walk_through' as const },
        ],
      },
    ].forEach((cgvGuest, idx) => {
      const char = buildShopper({
        shirtHex: cgvGuest.shirt,
        pantHex: cgvGuest.pant,
        skinHex: '#f1c27d',
        skinColor: 0xf1c27d,
      });
      const bagMesh = buildBrandedBag(bagPaperMat, zaraBandMat);
      bagMesh.visible = false;
      char.armR.add(bagMesh);
      char.root.position.set(cgvGuest.waypoints[0].x, 12.255, cgvGuest.waypoints[0].z);
      const modelSpec = pickOutsideNpcModel(428 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 2.3 + 0.4,
      });
      this.rootGroup.add(char.root);
      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: cgvGuest.waypoints,
        wpIdx: 1,
        state: 'walk',
        pauseTimer: 0,
        speed: cgvGuest.speed,
        walkPhase: idx * 2.3 + 0.4,
        baseY: 12.255,
        glbHandle,
      });
    });

    // 5 Walk-In / Walk-Out AEON Mall Plaza & Main Atrium Visitors (Sidewalk <-> Porte-Cochere <-> Sakura Rotunda)
    const aeonEntranceRoutes: Array<{ shirt: number; pant: number; speed: number; startWp: number; waypoints: UniqloWaypoint[] }> = [
      {
        shirt: 0x0ea5e9, pant: 0x1e293b, speed: 1.32, startWp: 0,
        waypoints: [
          { x: 116.5, z: 39.2, pauseDuration: 1.0, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 127.4, z: 43.2, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 127.6, z: 48.0, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 123.5, z: 56.5, pauseDuration: 2.2, faceY: -Math.PI / 3, action: 'browse', bagAfter: true },
          { x: 129.8, z: 65.0, pauseDuration: 2.0, faceY: Math.PI / 4, action: 'browse' },
          { x: 128.4, z: 48.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 128.4, z: 42.8, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 141.5, z: 39.2, pauseDuration: 1.4, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xf43f5e, pant: 0x334155, speed: 1.26, startWp: 3,
        waypoints: [
          { x: 140.0, z: 40.4, pauseDuration: 1.2, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 128.5, z: 43.2, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 128.4, z: 48.4, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 135.2, z: 57.5, pauseDuration: 2.4, faceY: Math.PI / 2, action: 'browse', bagAfter: true },
          { x: 135.2, z: 68.0, pauseDuration: 2.0, faceY: Math.PI / 2, action: 'browse' },
          { x: 127.8, z: 48.2, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 127.8, z: 42.5, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 115.5, z: 40.4, pauseDuration: 1.4, faceY: Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        shirt: 0x22c55e, pant: 0x0f172a, speed: 1.38, startWp: 5,
        waypoints: [
          { x: 120.5, z: 38.8, pauseDuration: 0.9, faceY: 0, action: 'walk_through', bagAfter: false },
          { x: 127.5, z: 43.4, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 127.5, z: 54.0, pauseDuration: 1.8, faceY: -Math.PI / 2, action: 'browse' },
          { x: 118.8, z: 58.5, pauseDuration: 2.2, faceY: -Math.PI / 2, action: 'browse', bagAfter: true },
          { x: 128.2, z: 48.0, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 128.2, z: 41.8, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 136.5, z: 38.8, pauseDuration: 1.3, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xa855f7, pant: 0x1e293b, speed: 1.24, startWp: 2,
        waypoints: [
          { x: 133.5, z: 38.8, pauseDuration: 1.1, faceY: -Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 128.2, z: 43.0, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 128.0, z: 52.0, pauseDuration: 1.5, faceY: 0, action: 'browse' },
          { x: 133.0, z: 62.5, pauseDuration: 2.5, faceY: Math.PI / 3, action: 'browse', bagAfter: true },
          { x: 127.6, z: 48.2, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 127.6, z: 42.4, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 121.0, z: 39.8, pauseDuration: 1.4, faceY: Math.PI / 2, action: 'walk_through' },
        ],
      },
      {
        shirt: 0xf59e0b, pant: 0x334155, speed: 1.30, startWp: 1,
        waypoints: [
          { x: 114.2, z: 41.4, pauseDuration: 0.8, faceY: Math.PI / 2, action: 'walk_through', bagAfter: false },
          { x: 127.8, z: 43.6, pauseDuration: 0.0, faceY: 0, action: 'walk_through' },
          { x: 127.8, z: 50.5, pauseDuration: 1.4, faceY: 0, action: 'browse' },
          { x: 121.5, z: 64.5, pauseDuration: 2.3, faceY: -Math.PI / 4, action: 'browse', bagAfter: true },
          { x: 128.2, z: 48.5, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 128.2, z: 41.8, pauseDuration: 0.0, faceY: Math.PI, action: 'walk_through' },
          { x: 141.8, z: 41.4, pauseDuration: 1.2, faceY: -Math.PI / 2, action: 'walk_through' },
        ],
      },
    ];

    aeonEntranceRoutes.forEach((ar, idx) => {
      const char = buildShopper({
        shirtHex: ar.shirt,
        pantHex: ar.pant,
        skinHex: idx % 2 === 0 ? '#f1c27d' : '#e0ac69',
        skinColor: idx % 2 === 0 ? 0xf1c27d : 0xe0ac69,
      });
      const bagMesh = buildBrandedBag(bagPaperMat, idx % 2 === 0 ? hmBandMat : zaraBandMat);
      const initWp = ar.waypoints[ar.startWp];
      bagMesh.visible = ar.startWp >= 4;
      char.armR.add(bagMesh);
      char.root.position.set(initWp.x, 0.0, initWp.z);
      const modelSpec = pickOutsideNpcModel(435 + idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: modelSpec.modelSource,
        hostGroup: char.root,
        fallbackMeshes: [char.hips],
        targetHeight: modelSpec.targetHeight,
        rotationY: modelSpec.rotationY,
        clipProfile: modelSpec.clipProfile,
        initialState: 'Walk',
        phaseOffset: idx * 1.4 + 0.5,
      });
      this.rootGroup.add(char.root);

      this.uniqloShoppers.push({
        ...char,
        bagMesh,
        waypoints: ar.waypoints,
        wpIdx: (ar.startWp + 1) % ar.waypoints.length,
        state: 'walk',
        pauseTimer: 0,
        speed: ar.speed,
        walkPhase: idx * 1.4 + 0.5,
        glbHandle,
      });
    });

    const npcMats = new Set<THREE.Material>();
    this.rootGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat || npcMats.has(mat)) continue;
        npcMats.add(mat);
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          mat.envMapIntensity = 0;
          mat.metalness = Math.min(mat.metalness, 0.08);
          mat.roughness = Math.max(mat.roughness, 0.85);
        }
      }
    });
    this.captureHomePoses();
  }

  private captureHomePoses() {
    for (const n of this.npcs) {
      n.homePos = n.root.position.clone();
      n.homeRotY = n.root.rotation.y;
    }
    for (const st of this.uniqloStaff) {
      st.homePos = st.root.position.clone();
    }
    for (const sh of this.uniqloShoppers) {
      sh.homePos = sh.root.position.clone();
      sh.homeRotY = sh.root.rotation.y;
      sh.homeWpIdx = sh.wpIdx;
      sh.homeBagVisible = sh.bagMesh.visible;
    }
    for (const sg of this.seatedCafeGuests) {
      sg.homePos = sg.root.position.clone();
      sg.homeRotY = sg.root.rotation.y;
      const rig = sg.root.userData.rig as NpcRigRef | undefined;
      sg.homeHipsY = rig ? rig.hips.position.y : 0.5;
    }
  }

  private buildExitWaypoints(startX: number, startY: number, startZ: number, idx: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const sideOutX = idx % 2 === 0 ? 105.0 : 151.0;

    // Outside sidewalk strollers simply walk down the sidewalk away from the entrance
    if (startZ < 45.0 && startY < 1.5) {
      pts.push(new THREE.Vector3(startX < 128 ? 104.0 : 152.0, 0, 41.2));
      return pts;
    }

    let curY = startY;
    let curX = startX;
    let curZ = startZ;

    // 1. FLOOR 3 -> ESCALATOR 2 (X = 134.0, Z = 72.3 -> Z = 84.9, Y = 6.18)
    if (curY >= 10.5) {
      if (curX > 143.8) {
        const doorZ = curZ < 68.0 ? 57.7 : 78.5;
        pts.push(new THREE.Vector3(145.0, 12.255, doorZ));
        pts.push(new THREE.Vector3(140.5, 12.18, doorZ));
        pts.push(new THREE.Vector3(140.5, 12.18, 69.3));
      } else if (curX < 112.2) {
        const doorZ = curZ < 68.0 ? 57.7 : 78.5;
        pts.push(new THREE.Vector3(111.2, 12.255, doorZ));
        pts.push(new THREE.Vector3(115.6, 12.18, doorZ));
        pts.push(new THREE.Vector3(115.6, 12.18, 69.3));
      } else if (curZ > 91.0) {
        if (curZ > 106.5) {
          const aisleX = curX < 122.6 ? 117.5 : curX < 133.0 ? 128.0 : 138.5;
          pts.push(new THREE.Vector3(aisleX, 12.255, curZ));
          pts.push(new THREE.Vector3(aisleX, 12.255, 105.4));
        }
        pts.push(new THREE.Vector3(128.0, 12.255, 96.0));
        pts.push(new THREE.Vector3(128.0, 12.255, 88.0));
        pts.push(new THREE.Vector3(139.8, 12.18, 87.4));
        pts.push(new THREE.Vector3(139.8, 12.18, 69.3));
      } else if (curZ > 73.5) {
        if (curX < 126.0) {
          pts.push(new THREE.Vector3(115.8, 12.18, 69.3));
        } else {
          pts.push(new THREE.Vector3(139.8, 12.18, 87.4));
          pts.push(new THREE.Vector3(139.8, 12.18, 69.3));
        }
      }
      pts.push(new THREE.Vector3(134.0, 12.18, 69.3));
      pts.push(new THREE.Vector3(134.0, 12.18, 72.3));
      pts.push(new THREE.Vector3(134.0, 6.18, 84.9));
      pts.push(new THREE.Vector3(134.0, 6.18, 87.0));
      curX = 134.0;
      curY = 6.18;
      curZ = 87.0;
    }

    // 2. FLOOR 2 -> ESCALATOR 1 (X = 126.0, Z = 84.9 -> Z = 70.2, Y = 0.0)
    if (curY >= 4.5 && curY < 10.5) {
      if (curX > 143.8) {
        const doorZ = curZ < 61.0 ? 54.25 : curZ < 75.0 ? 68.05 : 81.85;
        pts.push(new THREE.Vector3(145.2, 6.255, doorZ));
        pts.push(new THREE.Vector3(140.5, 6.18, doorZ));
        pts.push(new THREE.Vector3(140.5, 6.18, 87.0));
      } else if (curX < 112.2) {
        const doorZ = curZ < 61.0 ? 54.25 : curZ < 75.0 ? 68.05 : 81.85;
        pts.push(new THREE.Vector3(110.8, 6.255, doorZ));
        pts.push(new THREE.Vector3(115.5, 6.18, doorZ));
        pts.push(new THREE.Vector3(115.5, 6.18, 87.0));
      } else if (curZ > 91.0) {
        const doorX = curX < 128.0 ? 118.9 : 136.05;
        pts.push(new THREE.Vector3(doorX, 6.255, 92.2));
        pts.push(new THREE.Vector3(doorX, 6.18, 87.2));
      } else if (curZ < 83.0) {
        const balX = curX < 128.0 ? 115.5 : 140.5;
        pts.push(new THREE.Vector3(balX, 6.18, curZ));
        pts.push(new THREE.Vector3(balX, 6.18, 87.0));
      }
      pts.push(new THREE.Vector3(126.0, 6.18, 87.0));
      pts.push(new THREE.Vector3(126.0, 6.18, 84.9));
      pts.push(new THREE.Vector3(126.0, 0.0, 70.2));
      curX = 126.0;
      curY = 0.0;
      curZ = 70.2;
    }

    // 3. FLOOR 1 -> OUT THROUGH GRAND ATRIUM SLIDING DOORS (128.0, 45.15)
    if (curX < 112.2 && curZ < 67.0) {
      // UNIQLO
      pts.push(new THREE.Vector3(106.2, 0.075, 57.25));
      pts.push(new THREE.Vector3(115.0, 0.0, 57.25));
      curX = 115.0;
      curZ = 57.25;
    } else if (curX < 112.2 && curZ >= 67.0) {
      // Starbucks Reserve (Front + Deep Roastery)
      if (curX < 98.0) {
        pts.push(new THREE.Vector3(96.5, 0.075, 82.0));
      }
      pts.push(new THREE.Vector3(107.0, 0.075, 78.5));
      pts.push(new THREE.Vector3(115.0, 0.0, 78.5));
      curX = 115.0;
      curZ = 78.5;
    } else if (curX > 143.8) {
      // AEON Style / ZARA / H&M
      const doorZ = curZ < 61.0 ? 54.25 : curZ < 75.0 ? 68.05 : 81.85;
      pts.push(new THREE.Vector3(145.0, 0.075, doorZ));
      pts.push(new THREE.Vector3(140.5, 0.0, doorZ));
      curX = 140.5;
      curZ = doorZ;
    } else if (curZ > 91.0) {
      // MLB / CHARLES & KEITH
      const doorX = curX < 128.0 ? 118.9 : 136.05;
      pts.push(new THREE.Vector3(doorX, 0.075, 111.5));
      pts.push(new THREE.Vector3(doorX, 0.075, 92.5));
      pts.push(new THREE.Vector3(doorX, 0.0, 86.5));
      curX = doorX;
      curZ = 86.5;
    }

    if (curZ > 54.0) {
      const laneX = curX < 128.0 ? 121.5 : 134.5;
      pts.push(new THREE.Vector3(laneX, 0.0, Math.min(curZ, 70.0)));
      pts.push(new THREE.Vector3(laneX, 0.0, 52.5));
    }
    pts.push(new THREE.Vector3(128.0, 0.0, 48.2));
    pts.push(new THREE.Vector3(128.0, 0.0, 44.8));
    pts.push(new THREE.Vector3(128.0, 0.0, 41.2));
    pts.push(new THREE.Vector3(sideOutX, 0.0, 40.8));
    return pts;
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    let idx = 0;

    for (const n of this.npcs) {
      n.root.visible = true;
      n.exitPath = this.buildExitWaypoints(n.root.position.x, n.root.position.y, n.root.position.z, idx++);
      n.exitWpRef = { idx: 0 };
      n.exitDone = false;
      n.exitPhaseRef = { phase: n.phase };
      n.glbHandle?.setAnimState('Walk');
    }
    for (const st of this.uniqloStaff) {
      st.root.visible = true;
      st.exitPath = this.buildExitWaypoints(st.root.position.x, st.root.position.y, st.root.position.z, idx++);
      st.exitWpRef = { idx: 0 };
      st.exitDone = false;
      st.exitPhaseRef = { phase: st.phase };
      st.glbHandle?.setAnimState('Walk');
    }
    for (const sh of this.uniqloShoppers) {
      sh.root.visible = true;
      sh.exitPath = this.buildExitWaypoints(sh.root.position.x, sh.root.position.y, sh.root.position.z, idx++);
      sh.exitWpRef = { idx: 0 };
      sh.exitDone = false;
      sh.exitPhaseRef = { phase: sh.walkPhase };
      sh.glbHandle?.setAnimState('Walk');
    }
    for (const sg of this.seatedCafeGuests) {
      sg.root.visible = true;
      const rig = sg.root.userData.rig as NpcRigRef | undefined;
      if (rig) {
        rig.hips.position.y = 0.84;
        rig.legL.rotation.x = 0;
        rig.legR.rotation.x = 0;
        rig.head.rotation.y = 0;
      }
      if (sg.glbHost) sg.glbHost.position.y = 0;
      sg.glbHandle?.setAnimState('Walk');
      sg.exitPath = this.buildExitWaypoints(sg.root.position.x, sg.root.position.y, sg.root.position.z, idx++);
      sg.exitWpRef = { idx: 0 };
      sg.exitDone = false;
      sg.exitPhaseRef = { phase: sg.phase };
    }
  }

  private hideAllNpcsImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (const n of this.npcs) {
      n.root.visible = false;
      n.exitDone = true;
    }
    for (const st of this.uniqloStaff) {
      st.root.visible = false;
      st.exitDone = true;
    }
    for (const sh of this.uniqloShoppers) {
      sh.root.visible = false;
      sh.exitDone = true;
    }
    for (const sg of this.seatedCafeGuests) {
      sg.root.visible = false;
      sg.exitDone = true;
    }
  }

  private restoreForOpen() {
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    for (const n of this.npcs) {
      if (n.homePos) n.root.position.copy(n.homePos);
      if (n.homeRotY !== undefined) n.root.rotation.y = n.homeRotY;
      n.legL.rotation.x = 0;
      n.legR.rotation.x = 0;
      n.armL.rotation.x = 0;
      n.armR.rotation.x = 0;
      n.root.visible = true;
      n.exitDone = false;
      n.glbHandle?.setAnimState(n.mode === 'concierge' ? 'Idle' : 'Walk');
    }
    for (const st of this.uniqloStaff) {
      if (st.homePos) st.root.position.copy(st.homePos);
      st.root.rotation.y = st.baseYaw;
      const rig = st.root.userData.rig as NpcRigRef | undefined;
      if (rig) {
        rig.legL.rotation.x = 0;
        rig.legR.rotation.x = 0;
      }
      st.root.visible = true;
      st.exitDone = false;
      st.glbHandle?.setAnimState('Idle');
    }
    for (const sh of this.uniqloShoppers) {
      if (sh.homePos) sh.root.position.copy(sh.homePos);
      if (sh.homeRotY !== undefined) sh.root.rotation.y = sh.homeRotY;
      if (sh.homeWpIdx !== undefined) sh.wpIdx = sh.homeWpIdx;
      if (sh.homeBagVisible !== undefined) sh.bagMesh.visible = sh.homeBagVisible;
      sh.state = 'walk';
      sh.pauseTimer = 0;
      sh.legL.rotation.x = 0;
      sh.legR.rotation.x = 0;
      sh.root.visible = true;
      sh.exitDone = false;
      sh.glbHandle?.setAnimState('Walk');
    }
    for (const sg of this.seatedCafeGuests) {
      if (sg.homePos) sg.root.position.copy(sg.homePos);
      if (sg.homeRotY !== undefined) sg.root.rotation.y = sg.homeRotY;
      const rig = sg.root.userData.rig as NpcRigRef | undefined;
      if (rig) {
        rig.hips.position.y = sg.homeHipsY ?? 0.5;
        rig.legL.rotation.x = -1.32;
        rig.legR.rotation.x = -1.32;
      }
      if (sg.glbHost) {
        const ySeat = sg.homeHipsY ?? 0.5;
        sg.glbHost.position.y = ySeat >= 0.64 ? ySeat - 0.50 : 0;
      }
      sg.root.visible = true;
      sg.exitDone = false;
      sg.glbHandle?.setAnimState('Sit');
    }
  }

  public isStoreOccupiedByExitingNpc(b: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    floor?: number;
  }): boolean {
    if (!this.closingActive) return false;
    const matchPos = (p: THREE.Vector3, visible: boolean) => {
      if (!visible) return false;
      const floor = p.y >= 10.5 ? 3 : p.y >= 4.5 ? 2 : 1;
      if (b.floor !== undefined && floor !== b.floor) return false;
      return p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;
    };
    for (const st of this.uniqloStaff) {
      if (matchPos(st.root.position, st.root.visible)) return true;
    }
    for (const sh of this.uniqloShoppers) {
      if (matchPos(sh.root.position, sh.root.visible)) return true;
    }
    for (const sg of this.seatedCafeGuests) {
      if (matchPos(sg.root.position, sg.root.visible)) return true;
    }
    return false;
  }

  public hasExitingNpcNearDoor(): boolean {
    if (!this.closingActive) return false;
    const near = (p: THREE.Vector3, visible: boolean) =>
      visible && p.y < 1.5 && p.x >= 123.5 && p.x <= 132.5 && p.z >= 41.0 && p.z <= 49.5;
    for (const n of this.npcs) if (near(n.root.position, n.root.visible)) return true;
    for (const st of this.uniqloStaff) if (near(st.root.position, st.root.visible)) return true;
    for (const sh of this.uniqloShoppers) if (near(sh.root.position, sh.root.visible)) return true;
    for (const sg of this.seatedCafeGuests) if (near(sg.root.position, sg.root.visible)) return true;
    return false;
  }

  public hasActiveNpcNearDoor(): boolean {
    if (!this.isOpenState || this.closingActive) return false;
    const near = (p: THREE.Vector3, visible: boolean) =>
      visible && p.y < 1.5 && p.x >= 124.0 && p.x <= 132.0 && p.z >= 41.6 && p.z <= 48.8;
    for (const n of this.npcs) if (near(n.root.position, n.root.visible)) return true;
    for (const sh of this.uniqloShoppers) if (near(sh.root.position, sh.root.visible)) return true;
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number = 12.0) {
    const isOpen = isAeonMallOpenAtHour(rawHour);

    if (this.isOpenState === null) {
      this.isOpenState = isOpen;
      if (!isOpen) {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (this.isOpenState && !isOpen) {
      this.isOpenState = false;
      if (rawHour >= 22.0 && rawHour < 22.35) {
        this.beginClosingEvacuation();
      } else {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (!this.isOpenState && isOpen) {
      this.isOpenState = true;
      this.restoreForOpen();
    } else if (!isOpen && !this.closingActive) {
      return;
    }

    if (!isOpen && this.closingActive) {
      this.closingTimer += delta;
      let anyRemaining = false;
      const exitSpeed = 2.45;

      const stepGroup = (
        root: THREE.Group,
        path: THREE.Vector3[] | undefined,
        wpRef: { idx: number } | undefined,
        phaseRef: { phase: number } | undefined,
        done: boolean | undefined,
        setDone: () => void
      ) => {
        if (done || !root.visible) return;
        if (!path || !wpRef || !phaseRef) {
          root.visible = false;
          setDone();
          return;
        }
        const rig = root.userData.rig as NpcRigRef | undefined;
        const finished = advanceNpcExitPath(root, path, wpRef, exitSpeed, delta, rig, phaseRef);
        if (finished) {
          root.visible = false;
          setDone();
        } else {
          anyRemaining = true;
        }
      };

      for (const n of this.npcs) {
        stepGroup(n.root, n.exitPath, n.exitWpRef, n.exitPhaseRef, n.exitDone, () => {
          n.exitDone = true;
        });
      }
      for (const st of this.uniqloStaff) {
        stepGroup(st.root, st.exitPath, st.exitWpRef, st.exitPhaseRef, st.exitDone, () => {
          st.exitDone = true;
        });
      }
      for (const sh of this.uniqloShoppers) {
        stepGroup(sh.root, sh.exitPath, sh.exitWpRef, sh.exitPhaseRef, sh.exitDone, () => {
          sh.exitDone = true;
        });
      }
      for (const sg of this.seatedCafeGuests) {
        stepGroup(sg.root, sg.exitPath, sg.exitWpRef, sg.exitPhaseRef, sg.exitDone, () => {
          sg.exitDone = true;
        });
      }

      if (!anyRemaining || this.closingTimer >= 36.0) {
        this.hideAllNpcsImmediate();
      }
      return;
    }

    this.elapsed += delta;
    for (const n of this.npcs) {
      const t = this.elapsed + n.phase;
      if (n.mode === 'concierge') {
        n.armR.rotation.x = -0.35 + Math.sin(t * 2.0) * 0.14;
        n.root.rotation.y = Math.PI + Math.sin(t * 0.7) * 0.3;
        continue;
      }
      const s = Math.sin(t * (n.speed / Math.max(1, n.range * 0.3)));
      const cosDir = Math.cos(t * (n.speed / Math.max(1, n.range * 0.3)));
      const walkSwing = Math.sin(t * 5.2) * 0.36;

      if (n.mode === 'strollZ') {
        n.root.position.z = n.originZ + s * n.range;
        n.root.rotation.y = cosDir >= 0 ? 0 : Math.PI;
      } else {
        n.root.position.x = n.originX + s * n.range;
        n.root.rotation.y = cosDir >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      n.legL.rotation.x = walkSwing;
      n.legR.rotation.x = -walkSwing;
      n.armL.rotation.x = -walkSwing * 0.6;
      n.armR.rotation.x = walkSwing * 0.5;
    }

    // Animate UNIQLO & Starbucks Reserve Staff
    for (const st of this.uniqloStaff) {
      const t = this.elapsed + st.phase;
      st.armR.rotation.x = -0.55 + Math.sin(t * 2.8) * 0.22;
      st.armL.rotation.x = -0.40 + Math.cos(t * 2.1) * 0.15;
      st.root.rotation.y = st.baseYaw + Math.sin(t * 0.65) * 0.18;
    }

    // Animate Seated Starbucks Reserve Patrons
    for (const sg of this.seatedCafeGuests) {
      const t = this.elapsed + sg.phase;
      if (sg.mode === 'laptop') {
        sg.armL.rotation.x = -0.85 + Math.sin(t * 7.5) * 0.08;
        sg.armR.rotation.x = -0.85 + Math.cos(t * 8.2) * 0.08;
        sg.head.rotation.y = Math.sin(t * 0.6) * 0.14;
      } else {
        const sipLift = Math.max(0, Math.sin(t * 0.85));
        sg.armR.rotation.x = -0.55 - sipLift * 0.65;
        sg.armL.rotation.x = -0.25;
        sg.head.rotation.y = Math.sin(t * 0.5) * 0.18;
      }
    }

    // Animate UNIQLO & Starbucks Reserve Shopping NPCs
    for (const sh of this.uniqloShoppers) {
      const target = sh.waypoints[sh.wpIdx];
      if (sh.state === 'pause') {
        sh.glbHandle?.setAnimState('Idle');
        sh.pauseTimer -= delta;
        sh.legL.rotation.x *= 0.85;
        sh.legR.rotation.x *= 0.85;
        sh.root.rotation.y = target.faceY;
        const t = this.elapsed * 2.6 + sh.walkPhase;
        if (target.action === 'browse') {
          sh.armR.rotation.x = -0.75 + Math.sin(t) * 0.18;
          sh.armL.rotation.x = -0.18;
        } else if (target.action === 'pay') {
          sh.armR.rotation.x = -0.65 + Math.sin(t * 1.3) * 0.12;
          sh.armL.rotation.x = -0.35;
        } else {
          sh.armL.rotation.x *= 0.85;
          sh.armR.rotation.x *= 0.85;
        }
        if (sh.pauseTimer <= 0) {
          if (target.bagAfter !== undefined) {
            sh.bagMesh.visible = target.bagAfter;
          }
          sh.wpIdx = (sh.wpIdx + 1) % sh.waypoints.length;
          sh.state = 'walk';
          sh.glbHandle?.setAnimState('Walk');
        }
        continue;
      }

      const dx = target.x - sh.root.position.x;
      const dz = target.z - sh.root.position.z;
      const dist = Math.hypot(dx, dz);
      const step = sh.speed * delta;
      if (dist <= step + 0.08) {
        sh.root.position.x = target.x;
        sh.root.position.z = target.z;
        sh.root.position.y = (sh.baseY ?? 0) + ((sh.root.position.x <= 112.0 || sh.root.position.x >= 144.0 || sh.root.position.z >= 91.15) ? 0.075 : 0.0);
        sh.root.rotation.y = target.faceY;
        if (target.pauseDuration > 0) {
          sh.state = 'pause';
          sh.pauseTimer = target.pauseDuration;
          sh.glbHandle?.setAnimState('Idle');
        } else {
          if (target.bagAfter !== undefined) {
            sh.bagMesh.visible = target.bagAfter;
          }
          sh.wpIdx = (sh.wpIdx + 1) % sh.waypoints.length;
          sh.glbHandle?.setAnimState('Walk');
        }
      } else {
        sh.glbHandle?.setAnimState('Walk');
        sh.root.position.x += (dx / dist) * step;
        sh.root.position.z += (dz / dist) * step;
        sh.root.position.y = (sh.baseY ?? 0) + ((sh.root.position.x <= 112.0 || sh.root.position.x >= 144.0 || sh.root.position.z >= 91.15) ? 0.075 : 0.0);
        sh.root.rotation.y = Math.atan2(dx, dz);
        sh.walkPhase += delta * 6.0;
        const swing = Math.sin(sh.walkPhase) * 0.36;
        sh.legL.rotation.x = swing;
        sh.legR.rotation.x = -swing;
        sh.armL.rotation.x = -swing * 0.6;
        sh.armR.rotation.x = sh.bagMesh.visible ? -0.15 : swing * 0.55;
      }
    }
  }
}
