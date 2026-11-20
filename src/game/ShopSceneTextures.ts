import * as THREE from 'three';

/**
 * Procedural texture generators for 3D Pokémon TCG Shop Simulator.
 * Provides high-fidelity textures without external image network latency:
 * - "MY CARD EMPIRE" yellow lightbox storefront sign (Image 2)
 * - "STORE OPEN" green neon glass decal (Image 2)
 * - Retail shelf embossed "Pokémon" watermark backboard (Image 3 & 4)
 * - Yellow retail shelf price tags: [Thumb] [Qty] [$Price] (Image 3, 4, 5)
 * - Booster pack front foils (32-pack tiered standing columns)
 * - Booster box front & top covers (4-box row displays)
 * - Oak plank floor & exterior brick facade
 */

// Safe rounded rect helper for high-DPI canvas signage
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[]
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  } else {
    const r = typeof radius === 'number' ? radius : (radius[0] || 4);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// 1. STOREFRONT LIGHTBOX SIGN ("POKÉMON TCG TRADING CARD SHOP")
export function createStorefrontSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const drawTrackedText = (
    text: string,
    centerX: number,
    y: number,
    tracking: number,
    drawStroke = false
  ) => {
    const chars = Array.from(text);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalW =
      widths.reduce((sum, w) => sum + w, 0) + tracking * Math.max(0, chars.length - 1);
    let cursorX = centerX - totalW / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    chars.forEach((ch, idx) => {
      if (drawStroke) ctx.strokeText(ch, cursorX, y);
      ctx.fillText(ch, cursorX, y);
      cursorX += widths[idx] + tracking;
    });
    ctx.textAlign = prevAlign;
  };

  // 1. Matte Obsidian-Onyx Satin Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  bgGrad.addColorStop(0, '#07090e');
  bgGrad.addColorStop(0.22, '#0c1018');
  bgGrad.addColorStop(0.5, '#121824');
  bgGrad.addColorStop(0.78, '#0c1018');
  bgGrad.addColorStop(1, '#07090e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle vertical satin vignette for architectural depth
  const sheenGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
  sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Brushed Champagne-Gold Architectural Frame Hairlines
  const goldHGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  goldHGrad.addColorStop(0, '#8f6b22');
  goldHGrad.addColorStop(0.2, '#d4af37');
  goldHGrad.addColorStop(0.5, '#f5e298');
  goldHGrad.addColorStop(0.8, '#d4af37');
  goldHGrad.addColorStop(1, '#8f6b22');

  ctx.strokeStyle = goldHGrad;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

  // Minimal Corner L-Brackets
  const cLen = 22;
  ctx.fillStyle = '#f3df96';
  ctx.fillRect(13, 13, cLen, 3);
  ctx.fillRect(13, 13, 3, cLen);
  ctx.fillRect(canvas.width - 13 - cLen, 13, cLen, 3);
  ctx.fillRect(canvas.width - 16, 13, 3, cLen);
  ctx.fillRect(13, canvas.height - 16, cLen, 3);
  ctx.fillRect(13, canvas.height - 13 - cLen, 3, cLen);
  ctx.fillRect(canvas.width - 13 - cLen, canvas.height - 16, cLen, 3);
  ctx.fillRect(canvas.width - 16, canvas.height - 13 - cLen, 3, cLen);

  // Subtle Vertical Gold Hairline Dividers separating Left & Right Boutique Wings
  const drawDivider = (dx: number) => {
    const divGrad = ctx.createLinearGradient(0, 48, 0, canvas.height - 48);
    divGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    divGrad.addColorStop(0.3, 'rgba(212, 175, 55, 0.55)');
    divGrad.addColorStop(0.7, 'rgba(212, 175, 55, 0.55)');
    divGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dx, 48);
    ctx.lineTo(dx, canvas.height - 48);
    ctx.stroke();
  };
  drawDivider(420);
  drawDivider(canvas.width - 420);

  // Left & Right Whisper-Quiet Architectural Metadata Wings
  const drawWing = (cx: number, topLabel: string, bottomLabel: string) => {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e7e5e4';
    ctx.font = '600 19px "Helvetica Neue", Arial, sans-serif';
    drawTrackedText(topLabel, cx, canvas.height / 2 - 26, 4.5);

    const ruleGrad = ctx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    ruleGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    ruleGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.85)');
    ruleGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(cx - 56, canvas.height / 2 - 1, 112, 1.5);

    ctx.fillStyle = '#c8aa58';
    ctx.font = '600 13px "Helvetica Neue", Arial, sans-serif';
    drawTrackedText(bottomLabel, cx, canvas.height / 2 + 26, 3.8);
    ctx.restore();
  };

  drawWing(224, 'GRADED VAULT', 'PSA · BGS · CGC');
  drawWing(canvas.width - 224, 'SEALED ARCHIVE', 'COLLECTOR LOUNGE');

  // -------------------------------------------------------------
  // CENTER HERO LOCKUP: REFINED POKÉBALL SEAL + LUXURY WORDMARK
  // -------------------------------------------------------------
  const centerX = canvas.width / 2;
  const wordmarkY = canvas.height / 2 - 20;

  // Measure wordmark components for optical horizontal centering
  const pokeText = 'POKÉMON';
  const shopText = 'CARD SHOP';
  const tracking = 5.5;
  ctx.font = '700 54px "Helvetica Neue", Arial, sans-serif';

  const measureTracked = (str: string) => {
    const chars = Array.from(str);
    return (
      chars.reduce((s, c) => s + ctx.measureText(c).width, 0) +
      tracking * Math.max(0, chars.length - 1)
    );
  };

  const pokeW = measureTracked(pokeText);
  const shopW = measureTracked(shopText);
  const gapWord = 24;
  const pbR = 38;
  const gapEmblem = 34;
  const totalLockupW = pbR * 2 + gapEmblem + pokeW + gapWord + shopW;
  const startX = centerX - totalLockupW / 2;

  // Refined Lacquered Pokéball Monogram Seal (zero neon blur)
  const pbX = startX + pbR;
  const pbY = canvas.height / 2 - 4;

  ctx.save();
  ctx.beginPath();
  ctx.arc(pbX, pbY, pbR, 0, Math.PI * 2);
  ctx.clip();

  // Deep Crimson Lacquer Upper Dome
  const redGrad = ctx.createLinearGradient(pbX, pbY - pbR, pbX, pbY);
  redGrad.addColorStop(0, '#c82333');
  redGrad.addColorStop(0.65, '#991b1b');
  redGrad.addColorStop(1, '#6b1116');
  ctx.fillStyle = redGrad;
  ctx.fillRect(pbX - pbR, pbY - pbR, pbR * 2, pbR);

  // Warm Alabaster Lower Dome
  const ivoryGrad = ctx.createLinearGradient(pbX, pbY, pbX, pbY + pbR);
  ivoryGrad.addColorStop(0, '#fafaf9');
  ivoryGrad.addColorStop(0.75, '#e7e5e4');
  ivoryGrad.addColorStop(1, '#a8a29e');
  ctx.fillStyle = ivoryGrad;
  ctx.fillRect(pbX - pbR, pbY, pbR * 2, pbR);

  // Subtle top lacquer reflection
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pbX, pbY, pbR - 6, Math.PI * 1.18, Math.PI * 1.82);
  ctx.stroke();
  ctx.restore();

  // Equatorial Obsidian Band
  ctx.fillStyle = '#0c1018';
  ctx.fillRect(pbX - pbR, pbY - 5, pbR * 2, 10);

  // Brushed Gold Outer Bevel Ring
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pbX, pbY, pbR, 0, Math.PI * 2);
  ctx.stroke();

  // Gold & Pearl Center Clasp
  ctx.fillStyle = '#0c1018';
  ctx.beginPath();
  ctx.arc(pbX, pbY, 13.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pbX, pbY, 12.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.arc(pbX, pbY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Wordmark Typography
  const pokeCenterX = startX + pbR * 2 + gapEmblem + pokeW / 2;
  const shopCenterX = startX + pbR * 2 + gapEmblem + pokeW + gapWord + shopW / 2;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = '700 54px "Helvetica Neue", Arial, sans-serif';

  // Crisp subtle architectural drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  // "POKÉMON" in Warm Pearl Ivory
  const pearlGrad = ctx.createLinearGradient(0, wordmarkY - 26, 0, wordmarkY + 26);
  pearlGrad.addColorStop(0, '#ffffff');
  pearlGrad.addColorStop(0.6, '#f5f5f4');
  pearlGrad.addColorStop(1, '#d6d3d1');
  ctx.fillStyle = pearlGrad;
  drawTrackedText(pokeText, pokeCenterX, wordmarkY, tracking);

  // "CARD SHOP" in Brushed Champagne Gold
  const champagneGrad = ctx.createLinearGradient(0, wordmarkY - 26, 0, wordmarkY + 26);
  champagneGrad.addColorStop(0, '#faecc0');
  champagneGrad.addColorStop(0.45, '#e6c567');
  champagneGrad.addColorStop(1, '#b88f2d');
  ctx.fillStyle = champagneGrad;
  drawTrackedText(shopText, shopCenterX, wordmarkY, tracking);
  ctx.restore();

  // Airy Luxury Subtitle with Flanking Gold Hairlines (zero boxy pill)
  const subY = canvas.height / 2 + 40;
  const subLockupCenterX = startX + pbR * 2 + gapEmblem + (pokeW + gapWord + shopW) / 2;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#cbb374';
  ctx.font = '600 14px "Helvetica Neue", Arial, sans-serif';
  const subLabel = 'FLAGSHIP COLLECTOR BOUTIQUE  •  BOULEVARD EDITION';
  drawTrackedText(subLabel, subLockupCenterX, subY, 4.2);

  // Delicate horizontal rules flanking the subtitle
  const subChars = Array.from(subLabel);
  const subTextW =
    subChars.reduce((s, c) => s + ctx.measureText(c).width, 0) +
    4.2 * Math.max(0, subChars.length - 1);
  const lineLen = 58;
  const lineGap = 20;

  ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.fillRect(subLockupCenterX - subTextW / 2 - lineGap - lineLen, subY - 0.5, lineLen, 1);
  ctx.fillRect(subLockupCenterX + subTextW / 2 + lineGap, subY - 0.5, lineLen, 1);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. "STORE OPEN" GREEN NEON DECAL (Image 2)
export function createStoreOpenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Transparent background with rounded green outline
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
  ctx.beginPath();
  ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 16);
  ctx.fill();

  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 15;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STORE', canvas.width / 2, canvas.height / 2 - 18);
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '900 28px sans-serif';
  ctx.fillText('OPEN', canvas.width / 2, canvas.height / 2 + 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. RETAIL SHELF EMBOSSED "Pokémon" LOGO WATERMARK BACKBOARD (Image 3 & 4)
export function createPokemonWatermarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Smooth matte slate metal backing
  ctx.fillStyle = '#334155'; // Slate 700
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle metallic horizontal grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  // Embossed hollow/silhouetted "Pokémon" logo (Image 3 & 4)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 76px sans-serif';

  // Emboss shadow & highlight
  ctx.fillStyle = '#1e293b'; // Dark shadow
  ctx.fillText('Pokémon', canvas.width / 2 + 2, canvas.height / 2 + 2);

  ctx.fillStyle = '#64748b'; // Lighter top edge
  ctx.fillText('Pokémon', canvas.width / 2 - 1, canvas.height / 2 - 1);

  ctx.fillStyle = '#475569'; // Base embossed fill
  ctx.fillText('Pokémon', canvas.width / 2, canvas.height / 2);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. YELLOW RETAIL SHELF PRICE TAGS (Image 3, 4, 5)
// Format: [Mini Thumbnail] [Quantity e.g. 8 or 32] [$Price e.g. $25.00]
export function createYellowShelfTagTexture(
  qty: number,
  price: number,
  accentColor: string = '#ea580c',
  itemType: 'pack' | 'box' | 'figure' = 'box'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  // Bright Yellow retail tag background (#ffe600 / #facc15)
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Crisp black outer border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  // Left thumbnail square
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(14, 16, 75, 108);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 16, 75, 108);

  // Mini artwork depiction inside thumbnail
  ctx.fillStyle = accentColor;
  ctx.fillRect(18, 20, 67, 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(itemType === 'box' ? '📦' : itemType === 'figure' ? '🗿' : '🎴', 51, 70);

  // Center/Right Top: Large Quantity Remaining (e.g. 8, 32, 4, 0)
  ctx.fillStyle = '#000000';
  ctx.font = '900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${qty}`, 172, 60);

  // Horizontal divider
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, 72);
  ctx.lineTo(240, 72);
  ctx.stroke();

  // Bottom: Bold Price Tag (e.g. $25.00, $13.00, $17.00)
  ctx.font = '900 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`$${price.toFixed(2)}`, 172, 112);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 5. BOOSTER PACK FOIL FACE TEXTURE (Upright Standing Packs - Image 4 & 5)
export function createBoosterPackFoilTexture(
  setName: string,
  primaryColor: string,
  badgeText: string = '10 CARDS'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Clean matte foil gradient - no blinding white glare streak
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, primaryColor);
  grad.addColorStop(0.5, primaryColor);
  grad.addColorStop(0.85, '#09090b');
  grad.addColorStop(1, primaryColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top metallic crimped flap
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, canvas.width, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POKÉMON TCG POCKET', canvas.width / 2, 16);

  // Main Logo & Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText(setName.toUpperCase(), canvas.width / 2, 65);
  ctx.shadowBlur = 0;

  // Character emblem silhouette / icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 180, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 180, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '68px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', canvas.width / 2, 180);

  // Bottom info badge: "10 CARDS PER PACK"
  ctx.fillStyle = '#09090b';
  ctx.fillRect(16, canvas.height - 56, canvas.width - 32, 34);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, canvas.height - 56, canvas.width - 32, 34);

  ctx.fillStyle = '#fde047';
  ctx.font = '900 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, canvas.width / 2, canvas.height - 39);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 6. BOOSTER BOX PACKAGING TEXTURE (Sealed 10-Pack Boxes - Image 3 & 5)
export function createBoosterBoxPackagingTexture(
  setName: string,
  colorA: string,
  colorB: string,
  symbol: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Dynamic box graphic background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, colorA);
  grad.addColorStop(0.5, colorB);
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clean border trim - no diagonal glare line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Pokémon TCG Top Banner
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  ctx.fillText('POKÉMON TRADING CARD GAME', canvas.width / 2, 45);

  // Set Title
  ctx.fillStyle = '#fde047';
  ctx.font = '900 40px sans-serif';
  ctx.fillText(setName.toUpperCase(), canvas.width / 2, 95);

  // Center Art
  ctx.font = '96px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, canvas.width / 2, 210);

  // Bottom Box Spec: "BOOSTER DISPLAY - 10 PACKS (100 CARDS)"
  ctx.fillStyle = '#000000';
  ctx.fillRect(20, canvas.height - 60, canvas.width - 40, 42);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, canvas.height - 60, canvas.width - 40, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BOOSTER DISPLAY · 10 PACKS (100 CARDS)', canvas.width / 2, canvas.height - 39);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Texture Cache for 3D Shelves
const shelfTextureCache = new Map<string, THREE.Texture>();

export function createReservedSlotPlaqueTexture(
  title: string = 'VIP SLOT 1×1',
  subtitle: string = 'Tối đa 2 Box / Kệ · Sắp về hàng hiếm'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 66);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, 114);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Loads authentic booster box photo or renders branded set display.
 * Uses TextureLoader for pristine 100% full-bleed uncropped artwork.
 */
export function getBoosterBoxTexture(
  setId: string,
  setName: string,
  imageUrl?: string,
  colorA: string = '#1e293b',
  colorB: string = '#0f172a',
  symbol: string = '📦',
  containMode: boolean = false
): THREE.Texture {
  const cacheKey = `box_${setId}_${imageUrl || 'no_img'}`;
  if (shelfTextureCache.has(cacheKey)) {
    return shelfTextureCache.get(cacheKey)!;
  }

  if (imageUrl) {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      imageUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn(`Failed to load texture ${imageUrl}, falling back`, err);
        if (imageUrl.includes('pokemon30thCelebrationNight') || imageUrl.includes('night30th')) {
          loader.load('/boxes/night30th_clean.png', (fallbackTex) => {
            fallbackTex.colorSpace = THREE.SRGBColorSpace;
            texture.image = fallbackTex.image;
            texture.needsUpdate = true;
          });
        }
      }
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    shelfTextureCache.set(cacheKey, texture);
    return texture;
  }

  const canvasTex = createBoosterBoxPackagingTexture(setName, colorA, colorB, symbol);
  shelfTextureCache.set(cacheKey, canvasTex);
  return canvasTex;
}

/**
 * Loads authentic booster pack foil photo or renders branded foil.
 */
export function getBoosterPackTexture(
  setId: string,
  setName: string,
  imageUrl?: string,
  primaryColor: string = '#ea580c',
  badgeText: string = '10 CARDS'
): THREE.Texture {
  const cacheKey = `pack_${setId}`;
  if (shelfTextureCache.has(cacheKey)) {
    return shelfTextureCache.get(cacheKey)!;
  }

  const canvasTex = createBoosterPackFoilTexture(setName, primaryColor, badgeText);
  shelfTextureCache.set(cacheKey, canvasTex);

  if (imageUrl) {
    const img = new Image();
    if (imageUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const canvas = canvasTex.image as HTMLCanvasElement;
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Foil background
        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw authentic pack photo
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvasTex.needsUpdate = true;
      }
    };
    img.src = imageUrl;
  }

  return canvasTex;
}

// 7. LUXURY SMOKED EUROPEAN WALNUT-OAK PARQUET FLOOR TEXTURE (1024x1024 high-detail)
export function createOakWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep espresso-walnut base shadow in plank grooves
  ctx.fillStyle = '#24160d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const plankHeight = 64; // 16 rows across 1024px
  const plankWidth = 256; // 4 wide luxury planks per row

  const pseudoRand = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let row = 0; row < canvas.height / plankHeight; row++) {
    const y = row * plankHeight;
    const rowShift = (row % 4) * 64 + ((row % 2) * 64);

    for (let col = -1; col <= canvas.width / plankWidth; col++) {
      const px = col * plankWidth + (rowShift % plankWidth);
      const pw = plankWidth - 2;
      const ph = plankHeight - 2;
      const seed = row * 31 + col * 17 + 5;
      const rVar = pseudoRand(seed);
      const warmVar = pseudoRand(seed + 9);

      // Rich smoked walnut-oak palette (#5a3822 .. #855737)
      const baseR = Math.round(92 + rVar * 34 + warmVar * 10);
      const baseG = Math.round(58 + rVar * 23 + warmVar * 6);
      const baseB = Math.round(35 + rVar * 15);

      // Horizontal tonal gradient across each board for satin lacquer sheen
      const plankGrad = ctx.createLinearGradient(px, y, px + pw, y + ph);
      plankGrad.addColorStop(0, `rgb(${baseR + 6}, ${baseG + 4}, ${baseB + 3})`);
      plankGrad.addColorStop(0.55, `rgb(${baseR}, ${baseG}, ${baseB})`);
      plankGrad.addColorStop(1, `rgb(${baseR - 8}, ${baseG - 5}, ${baseB - 4})`);
      ctx.fillStyle = plankGrad;
      ctx.fillRect(px + 1, y + 1, pw - 1, ph - 1);

      // Clip inside plank for realistic wood-grain fibers & subtle knots
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 1, y + 1, pw - 1, ph - 1);
      ctx.clip();

      // Longitudinal fine wood grain streaks
      const fiberCount = 14;
      for (let f = 0; f < fiberCount; f++) {
        const fy = y + 3 + (f / fiberCount) * (ph - 4) + (pseudoRand(seed + f * 3) - 0.5) * 3;
        const wave = (pseudoRand(seed + f * 7) - 0.5) * 4;
        ctx.beginPath();
        ctx.moveTo(px + 1, fy);
        ctx.bezierCurveTo(
          px + pw * 0.33,
          fy + wave,
          px + pw * 0.66,
          fy - wave,
          px + pw,
          fy + wave * 0.4
        );
        ctx.strokeStyle =
          f % 3 === 0 ? 'rgba(32, 18, 10, 0.22)' : 'rgba(218, 174, 130, 0.08)';
        ctx.lineWidth = f % 4 === 0 ? 1.5 : 0.9;
        ctx.stroke();
      }

      // Occasional subtle dark heartwood knot ellipse
      if (pseudoRand(seed + 41) > 0.62) {
        const kx = px + 36 + pseudoRand(seed + 43) * (pw - 72);
        const ky = y + 14 + pseudoRand(seed + 47) * (ph - 28);
        ctx.beginPath();
        ctx.ellipse(kx, ky, 14, 4.5, (pseudoRand(seed + 53) - 0.5) * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(35, 20, 11, 0.26)';
        ctx.fill();
      }

      // Micro chamfer bevel highlight along top edge of each board
      ctx.fillStyle = 'rgba(255, 228, 196, 0.10)';
      ctx.fillRect(px + 1, y + 1, pw - 1, 1.5);
      // Micro shadow along bottom edge
      ctx.fillStyle = 'rgba(18, 10, 5, 0.34)';
      ctx.fillRect(px + 1, y + ph - 1.5, pw - 1, 1.5);

      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 8);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 8. BRICK FACADE TEXTURE (Apartment Exterior Wall - Image 2)
export function createBrickFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Mortar background
  ctx.fillStyle = '#d4d4d8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const brickH = 16;
  const brickW = 40;
  for (let row = 0; row < canvas.height / brickH; row++) {
    const y = row * brickH;
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let x = -offset; x < canvas.width; x += brickW + 2) {
      // Random warm red-brown tones
      const r = 160 + (Math.sin(x * y) * 20);
      const g = 60 + (Math.cos(x) * 15);
      const b = 45 + (Math.sin(y) * 10);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 1, y + 1, brickW, brickH - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 9. GACHA MARQUEE TEXTURE (Shelf Top Header - Mystery Pack)
export function createGachaMarqueeTexture(): THREE.Texture {
  const loader = new THREE.TextureLoader();
  const texture = loader.load('/mystery_pack_banner.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 10. SCREEN GEOMETRY FACING -Z (Toward Cashier at Z = 3.8)
// Guarantees counter-clockwise front face and un-mirrored normal text when viewed from cashier
export function createScreenGeometry(width: number, height: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const hw = width / 2;
  const hh = height / 2;
  // Viewed from -Z (cashier looking at screen in +Z direction):
  // Vertices in CCW order: 0 (Bottom-Left) -> 1 (Bottom-Right) -> 2 (Top-Right) -> 3 (Top-Left)
  const vertices = new Float32Array([
    -hw, -hh, 0, // 0: Bottom-Left
     hw, -hh, 0, // 1: Bottom-Right
     hw,  hh, 0, // 2: Top-Right
    -hw,  hh, 0, // 3: Top-Left
  ]);
  // UV mapping with inverted U (u: 1 on Left -> 0 on Right) so texture reads naturally from left-to-right
  const uvs = new Float32Array([
    1, 0, // Bottom-Left (u = 1)
    0, 0, // Bottom-Right (u = 0)
    0, 1, // Top-Right (u = 0)
    1, 1, // Top-Left (u = 1)
  ]);
  const normals = new Float32Array([
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
  ]);
  const indices = [
    0, 1, 2, // Bottom-Left -> Bottom-Right -> Top-Right (CCW)
    0, 2, 3, // Bottom-Left -> Top-Right -> Top-Left (CCW)
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

// 10B. 3D POS TOUCHSCREEN MONITOR TEXTURE MANAGER (Image 2 Replica)
export interface PosScreenTextureManager {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  update: (
    customer?: any,
    isScanned?: boolean,
    scannedItems?: Record<string, boolean>,
    scannedCounts?: Record<string, number>
  ) => void;
}

export function createPosScreenTextureManager(): PosScreenTextureManager {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const update = (
    customer?: any,
    isScanned?: boolean,
    scannedItems: Record<string, boolean> = {},
    scannedCounts?: Record<string, number>
  ) => {
    // 1. Dark background container (Image 1 replica)
    ctx.fillStyle = '#0f131a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Top Customer Header Banner (Image 1 style)
    const topBarHeight = 56;
    ctx.fillStyle = '#161b24';
    ctx.fillRect(8, 8, canvas.width - 16, topBarHeight);
    ctx.strokeStyle = '#273244';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, canvas.width - 16, topBarHeight);

    if (customer) {
      // Customer Avatar Circle
      ctx.fillStyle = customer.avatarColor || '#10b981';
      ctx.beginPath();
      ctx.arc(38, 36, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(customer.name ? customer.name.charAt(0) : 'K', 38, 36);

      // Customer Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Khách hàng: ${customer.name || 'Khách Vãng Lai'}`, 66, 30);

      // Role Pill Badge (Whale / Collector / Casual)
      const roleText = customer.role || 'Whale';
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const badgeX = 66 + ctx.measureText(`Khách hàng: ${customer.name || 'Khách Vãng Lai'}`).width + 12;
      ctx.roundRect(badgeX, 18, 70, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(roleText, badgeX + 35, 29);

      // Budget & Items count
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Ngân sách: $${(customer.budget || 300).toFixed(2)} · Giỏ hàng: ${customer.basket?.length || 1} món`, 66, 50);

      // Status indicator on top right
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px sans-serif';
      if (isScanned) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('✓ ĐÃ QUÉT HÀNG - SẴN SÀNG THANH TOÁN', canvas.width - 24, 36);
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('⚡ BẤM [SPACE] ĐỂ QUÉT LASER', canvas.width - 24, 36);
      }
    } else {
      // Standby top bar
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏪 HỆ THỐNG POS BÁN HÀNG TỰ ĐỘNG - POKÉCARD 3D', 24, 36);

      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('● Quầy Sẵn Sàng Phục Vụ (Standby)', canvas.width - 24, 36);
    }

    // Calculate total
    let totalSum = 0;
    const basket = customer && Array.isArray(customer.basket) ? customer.basket : [];
    basket.forEach((bItem: any) => {
      totalSum += (bItem.unitPrice || 0) * (bItem.count || 1);
    });

    // -------------------------------------------------------------
    // 3. LEFT PANEL: PHONE-STYLE NUMERIC KEYPAD (Exact Image 1 Replica)
    // -------------------------------------------------------------
    const leftPadX = 12;
    const leftPadY = 72;
    const leftPadW = 280;
    const leftPadH = canvas.height - leftPadY - 14;

    // Outer dark housing with curved corners
    ctx.fillStyle = '#1e2430';
    ctx.beginPath();
    ctx.roundRect(leftPadX, leftPadY, leftPadW, leftPadH, 20);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Blue "TOTAL" Header Bar (Image 1)
    const padHeaderH = 46;
    ctx.fillStyle = '#0066cc';
    ctx.beginPath();
    ctx.roundRect(leftPadX + 6, leftPadY + 6, leftPadW - 12, padHeaderH, [14, 14, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOTAL', leftPadX + leftPadW / 2, leftPadY + 6 + padHeaderH / 2);

    // Dark screen displaying total amount (Image 1)
    const dispBoxH = 92;
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(leftPadX + 6, leftPadY + 6 + padHeaderH, leftPadW - 12, dispBoxH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const numDisplay = totalSum > 0 ? (totalSum >= 100 ? totalSum.toFixed(0) : totalSum.toFixed(1)) : '0';
    ctx.fillText(numDisplay, leftPadX + leftPadW / 2, leftPadY + 6 + padHeaderH + dispBoxH / 2);

    // 12-key Grid of white rounded buttons (Image 1)
    const keyRows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['←', '0', '.'],
    ];
    const keyStartX = leftPadX + 16;
    const keyStartY = leftPadY + 6 + padHeaderH + dispBoxH + 12;
    const keyW = 74;
    const keyH = 70;
    const keyGapX = 12;
    const keyGapY = 10;

    keyRows.forEach((row, rIdx) => {
      row.forEach((kLabel, cIdx) => {
        const kx = keyStartX + cIdx * (keyW + keyGapX);
        const ky = keyStartY + rIdx * (keyH + keyGapY);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(kx, ky, keyW, keyH, 12);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kLabel, kx + keyW / 2, ky + keyH / 2 + 1);
      });
    });

    // Big Green Checkmark Button at bottom of Keypad (Image 1)
    const checkBtnY = keyStartY + 4 * (keyH + keyGapY) + 4;
    const checkBtnH = 68;
    ctx.fillStyle = '#00a844';
    ctx.beginPath();
    ctx.roundRect(leftPadX + 16, checkBtnY, leftPadW - 32, checkBtnH, 14);
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // White bold checkmark icon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const cxCenter = leftPadX + leftPadW / 2;
    const cyCenter = checkBtnY + checkBtnH / 2;
    ctx.moveTo(cxCenter - 18, cyCenter - 2);
    ctx.lineTo(cxCenter - 4, cyCenter + 12);
    ctx.lineTo(cxCenter + 20, cyCenter - 14);
    ctx.stroke();

    // -------------------------------------------------------------
    // 4. RIGHT PANEL: PAYMENT SYSTEM TABLE (Exact Image 1 Replica)
    // -------------------------------------------------------------
    const rightPanelX = leftPadX + leftPadW + 12;
    const rightPanelY = 72;
    const rightPanelW = canvas.width - rightPanelX - 12;
    const rightPanelH = canvas.height - rightPanelY - 14;

    // Outer frame
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(rightPanelX, rightPanelY, rightPanelW, rightPanelH, 20);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top Blue Bar: "Payment System" with green diamond and PAY button (Image 1)
    const rightHeaderH = 62;
    ctx.fillStyle = '#0072ce';
    ctx.beginPath();
    ctx.roundRect(rightPanelX, rightPanelY, rightPanelW, rightHeaderH, [18, 18, 0, 0]);
    ctx.fill();

    // Green diamond icon
    ctx.save();
    ctx.fillStyle = '#84cc16';
    ctx.translate(rightPanelX + 34, rightPanelY + 31);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = '#0072ce';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();

    // "Payment System" Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Payment System', rightPanelX + 60, rightPanelY + 31);

    // Green Checkmark Circle
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(rightPanelX + rightPanelW - 130, rightPanelY + 31, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rightPanelX + rightPanelW - 136, rightPanelY + 31);
    ctx.lineTo(rightPanelX + rightPanelW - 132, rightPanelY + 36);
    ctx.lineTo(rightPanelX + rightPanelW - 124, rightPanelY + 27);
    ctx.stroke();

    // "PAY" Button
    ctx.fillStyle = '#00529b';
    ctx.beginPath();
    ctx.roundRect(rightPanelX + rightPanelW - 98, rightPanelY + 13, 76, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAY', rightPanelX + rightPanelW - 60, rightPanelY + 31);

    // Orange Subheader Bar: NAME | UNIT | PRICE | TOTAL (Image 1)
    const orangeBarH = 46;
    const orangeBarY = rightPanelY + rightHeaderH;
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(rightPanelX, orangeBarY, rightPanelW, orangeBarH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillText('NAME', rightPanelX + 32, orangeBarY + orangeBarH / 2);

    ctx.textAlign = 'center';
    ctx.fillText('UNIT', rightPanelX + rightPanelW - 270, orangeBarY + orangeBarH / 2);
    ctx.fillText('PRICE', rightPanelX + rightPanelW - 170, orangeBarY + orangeBarH / 2);

    ctx.textAlign = 'right';
    ctx.fillText('TOTAL', rightPanelX + rightPanelW - 32, orangeBarY + orangeBarH / 2);

    // Items List Area
    const listStartY = orangeBarY + orangeBarH + 12;
    const itemRowH = 78;

    if (basket.length > 0) {
      basket.forEach((bItem: any, idx: number) => {
        const ry = listStartY + idx * (itemRowH + 8);
        if (ry + itemRowH > rightPanelY + rightPanelH - 145) return; // Guard overflow

        const unitCount = Math.max(1, bItem.count || 1);
        const itemId = bItem.item?.id || `row_${idx}`;
        const scannedQty = isScanned
          ? unitCount
          : scannedCounts && typeof scannedCounts[itemId] === 'number'
          ? Math.min(unitCount, scannedCounts[itemId])
          : scannedItems[itemId]
          ? unitCount
          : 0;
        const itemScanned = scannedQty >= unitCount;
        const lineTotal = (bItem.unitPrice || 0) * unitCount;

        // Row border / background
        ctx.fillStyle = itemScanned ? '#f0fdf4' : scannedQty > 0 ? '#fffbeb' : '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(rightPanelX + 12, ry, rightPanelW - 24, itemRowH, 10);
        ctx.fill();
        ctx.strokeStyle = itemScanned ? '#22c55e' : scannedQty > 0 ? '#f59e0b' : '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Item Thumbnail Box
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(rightPanelX + 22, ry + 10, 48, 58, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bItem.item?.type === 'box' ? '📦' : bItem.item?.cardData ? '💎' : '🎴', rightPanelX + 46, ry + 39);

        // Item Name
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const iName = bItem.item?.name || 'Vật phẩm Pokémon';
        ctx.fillText(iName.length > 24 ? iName.slice(0, 23) + '...' : iName, rightPanelX + 80, ry + 36);

        // Subtext / Scan prompt
        ctx.font = 'bold 13px sans-serif';
        if (itemScanned) {
          ctx.fillStyle = '#16a34a';
          ctx.fillText(`✓ Đã quét đủ (${scannedQty}/${unitCount})`, rightPanelX + 80, ry + 58);
        } else if (scannedQty > 0) {
          ctx.fillStyle = '#d97706';
          ctx.fillText(`⚡ Đang quét ${scannedQty}/${unitCount} · Bấm [SPACE] quét tiếp`, rightPanelX + 80, ry + 58);
        } else {
          ctx.fillStyle = '#ea580c';
          ctx.fillText('👆 Click món trên quầy hoặc bấm [SPACE]', rightPanelX + 80, ry + 58);
        }

        // Unit Count
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${bItem.count || 1}`, rightPanelX + rightPanelW - 270, ry + itemRowH / 2);

        // Unit Price
        ctx.fillText(`${(bItem.unitPrice || 0).toFixed(2)}`, rightPanelX + rightPanelW - 170, ry + itemRowH / 2);

        // Total
        ctx.textAlign = 'right';
        ctx.font = '900 24px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(`$${lineTotal.toFixed(2)}`, rightPanelX + rightPanelW - 32, ry + itemRowH / 2);
      });
    } else {
      // Empty / Standby box
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(rightPanelX + 24, listStartY + 20, rightPanelW - 48, 220, 14);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0072ce';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POKÉCARD SHOP SIMULATOR - POS SYSTEM', rightPanelX + rightPanelW / 2, listStartY + 70);

      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('● Quầy Thu Ngân POS Đang Sẵn Sàng Phục Vụ', rightPanelX + rightPanelW / 2, listStartY + 115);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px sans-serif';
      ctx.fillText('Đang đợi khách hàng mang pack bài & thẻ tới quầy...', rightPanelX + rightPanelW / 2, listStartY + 155);
      ctx.fillText('Khi khách tới quầy, nhấn SPACE để quét và thanh toán nhanh!', rightPanelX + rightPanelW / 2, listStartY + 185);
    }

    // Big Green Total Banner (Exact Image 1 Replica)
    const greenTotalH = 72;
    const greenTotalY = rightPanelY + rightPanelH - 128;
    ctx.fillStyle = '#00a844';
    ctx.beginPath();
    ctx.roundRect(rightPanelX + 12, greenTotalY, rightPanelW - 24, greenTotalH, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', rightPanelX + 32, greenTotalY + greenTotalH / 2);

    ctx.textAlign = 'right';
    ctx.font = '900 48px monospace';
    const finalTotalDisplay = totalSum > 0 ? totalSum.toFixed(2) : '0.00';
    ctx.fillText(`$${finalTotalDisplay}`, rightPanelX + rightPanelW - 32, greenTotalY + greenTotalH / 2);

    // Blue Footer Status Bar: Thu Ngân Viên & Scan all (Image 1)
    const footerH = 46;
    const footerY = rightPanelY + rightPanelH - 48;
    ctx.fillStyle = '#0072ce';
    ctx.beginPath();
    ctx.roundRect(rightPanelX, footerY, rightPanelW, footerH, [0, 0, 18, 18]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤 Thu Ngân Viên: Player 1', rightPanelX + 24, footerY + footerH / 2);

    // Scan All button tag
    ctx.fillStyle = '#00529b';
    ctx.beginPath();
    ctx.roundRect(rightPanelX + rightPanelW - 200, footerY + 8, 140, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('||||| Quét Toàn Bộ', rightPanelX + rightPanelW - 130, footerY + footerH / 2);

    // Receipt printer icon
    ctx.font = '18px sans-serif';
    ctx.fillText('🖨️', rightPanelX + rightPanelW - 32, footerY + footerH / 2);

    texture.needsUpdate = true;
  };

  update();
  return { texture, canvas, update };
}

// 10C. 3D CARD PAYMENT TERMINAL PINPAD TEXTURE MANAGER (Image 2 Replica)
export interface PosPinpadTextureManager {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  update: (totalAmount?: number, isConfirmed?: boolean, typedAmount?: string) => void;
}

export function createPosPinpadTextureManager(): PosPinpadTextureManager {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const update = (totalAmount: number = 0, isConfirmed: boolean = false, typedAmount?: string) => {
    // 1. Dark Charcoal Casing Border
    ctx.fillStyle = '#22262e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Top Receipt Paper Feed Slot (Image 2)
    ctx.fillStyle = '#111418';
    ctx.beginPath();
    ctx.roundRect(40, 16, canvas.width - 80, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(60, 24, canvas.width - 120, 6);

    // 3. Blue Header: "Total" (Image 2)
    ctx.fillStyle = '#0066cc';
    ctx.beginPath();
    ctx.roundRect(24, 52, canvas.width - 48, 54, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', canvas.width / 2, 79);

    // 4. Digital LED Display Screen (Image 2)
    ctx.fillStyle = '#0b1b36';
    ctx.fillRect(24, 106, canvas.width - 48, 110);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 106, canvas.width - 48, 110);

    const textToDisplay = typedAmount !== undefined ? typedAmount : (totalAmount > 0 ? `${totalAmount.toFixed(0)}` : '0');
    ctx.fillStyle = isConfirmed ? '#4ade80' : '#ffffff';
    ctx.font = '900 84px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textToDisplay, canvas.width / 2, 161);

    // 5. 12-Key Numeric Keypad Area (Image 2)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(24, 216, canvas.width - 48, 520, [0, 0, 24, 24]);
    ctx.fill();

    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['←', '0', '.'],
    ];

    const keyW = 130;
    const keyH = 74;
    const startX = 42;
    const startY = 236;
    const gapX = 18;
    const gapY = 16;

    keys.forEach((row, rIdx) => {
      row.forEach((key, cIdx) => {
        const x = startX + cIdx * (keyW + gapX);
        const y = startY + rIdx * (keyH + gapY);

        // Key button
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(x, y, keyW, keyH, 14);
        ctx.fill();

        // Shadow/border
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key, x + keyW / 2, y + keyH / 2 + 2);
      });
    });

    // 6. Big Green Checkmark Button [✓] (Image 2)
    const checkY = startY + 4 * (keyH + gapY) + 4;
    const checkW = canvas.width - 84;
    const checkH = 88;

    ctx.fillStyle = '#00a844';
    ctx.beginPath();
    ctx.roundRect(startX, checkY, checkW, checkH, 18);
    ctx.fill();

    // White Checkmark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(startX + checkW / 2 - 28, checkY + checkH / 2);
    ctx.lineTo(startX + checkW / 2 - 8, checkY + checkH / 2 + 20);
    ctx.lineTo(startX + checkW / 2 + 32, checkY + checkH / 2 - 20);
    ctx.stroke();

    texture.needsUpdate = true;
  };

  update();
  return { texture, canvas, update };
}

// 10D. AUTHENTIC SHOWCASE CARD TEXTURE (Raw Cards have NO PSA; Graded Slabs have PSA/BGS/CGC)
export function createShowcaseCardTexture(
  card?: {
    name: string;
    imageUrl?: string;
    artUrl?: string;
    fallbackUrl?: string;
    cardColor?: string;
    accentColor?: string;
    type?: string;
    hp?: number;
    setName?: string;
    setNumber?: string;
    raritySymbol?: string;
    rarity?: string;
    marketPrice?: number;
    hasRgbAura?: boolean;
    isSlab?: boolean;
    slab?: {
      company: string;
      grade: number;
      gradeLabel: string;
      certNumber?: string;
      year?: number;
      slabGuardColor?: string;
      subgrades?: { centering: number; corners: number; edges: number; surface: number };
    };
  },
  slabOverride?: {
    company: string;
    grade: number;
    gradeLabel: string;
    certNumber?: string;
    year?: number;
    slabGuardColor?: string;
    subgrades?: { centering: number; corners: number; edges: number; surface: number };
  } | null
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 616;
  const ctx = canvas.getContext('2d')!;

  const resolveRenderUrl = (rawUrl?: string, cardName?: string): string => {
    let u = rawUrl || '';
    if (u.includes('Charizard-4-130-Base-Set-2') || cardName?.includes('Base Set 2')) {
      return '/assets/cards/charizard_base_set_2.png';
    }
    if (u.includes('large_b04f6fc1') || cardName?.includes('Mega Charizard X')) {
      return '/assets/cards/mega_charizard_x.png';
    }
    if (u.includes('SV3PT5_EN_199') || u.includes('/199.png') || u.includes('/199_hires') || cardName?.includes('Charizard ex 151')) {
      return 'https://images.pokemontcg.io/sv3pt5/199_hires.png';
    }
    if (
      u.includes('SV3PT5_EN_151') ||
      u.includes('/151.png') ||
      u.includes('/151_hires') ||
      (cardName?.includes('Mew') && cardName?.includes('30th') && !cardName?.includes('YOSHIROTTEN') && !cardName?.includes('Blue'))
    ) {
      return 'https://images.pokemontcg.io/sv3pt5/151_hires.png';
    }
    if (u.includes('tcgplayer-cdn.tcgplayer.com/product/717607')) {
      return 'https://images.scrydex.com/pokemon/me55-R/large';
    }
    if (u.includes('OP05-060 ODA_p1.jpg')) {
      u = 'https://optcgapi.com/media/static/Card_Images/OP05-060_p1.jpg';
    }
    // optcgapi.com lacks Access-Control-Allow-Origin and limitlesstcg restricts origin;
    // route through wsrv.nl CORS-enabled image CDN so WebGL CanvasTexture drawImage never fails CORS.
    if (u.includes('optcgapi.com') || u.includes('limitlesstcg.nyc3.cdn.digitaloceanspaces.com')) {
      return `https://wsrv.nl/?url=${encodeURIComponent(u)}&output=webp`;
    }
    return u;
  };

  // 1. Sleek Empty Stand when slot has no card
  if (!card) {
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 CHÂN ĐỨNG MẠ VÀNG', canvas.width / 2, 64);

    ctx.fillStyle = '#64748b';
    ctx.font = '38px sans-serif';
    ctx.fillText('🎴', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('CHƯA TRƯNG BÀY', canvas.width / 2, canvas.height / 2 + 28);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('(Mở bàn để đặt thẻ bài lên)', canvas.width / 2, canvas.height / 2 + 58);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // 2. CHECK IF THIS CARD IS A GRADED SLAB (PSA / BGS / CGC) OR A RAW CARD!
  const slab = slabOverride || card.slab;
  const isGradedSlab = !!slab || !!card.isSlab;

  if (isGradedSlab && slab) {
    // AUTHENTIC GRADED ACRYLIC SLAB CASE
    const caseGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    caseGrad.addColorStop(0, '#27272a');
    caseGrad.addColorStop(0.5, '#18181b');
    caseGrad.addColorStop(1, '#27272a');
    ctx.fillStyle = caseGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer clear acrylic highlight rim
    ctx.strokeStyle = 'rgba(228, 228, 231, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    const company = slab.company || 'PSA';
    const grade = slab.grade || 10;
    const gradeLabel = slab.gradeLabel || (grade === 10 ? 'GEM MT 10' : grade === 9 ? 'MINT 9' : 'NM-MT 8');
    const certNumber = slab.certNumber || '88401924';
    const year = slab.year || 2026;
    const cardNum = card.setNumber ? `#${card.setNumber.split('/')[0]}` : '#001';

    const labelX = 18;
    const labelY = 16;
    const labelW = canvas.width - 36;
    const labelH = 108;

    const drawMiniBarcode = (bx: number, by: number, bw: number, bh: number) => {
      ctx.fillStyle = '#09090b';
      const weights = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 2, 1, 3, 1];
      let cx = bx;
      for (let i = 0; i < weights.length && cx < bx + bw; i++) {
        const w = weights[i] * 2;
        ctx.fillRect(cx, by, w, bh);
        cx += w + 2.5;
      }
    };

    if (company === 'CGC') {
      const isCgcPristine = grade === 10 && gradeLabel.includes('PRISTINE');
      // CGC: Black header bar + Black/Gold Foil plate for Pristine 10, Silver-White for Gem Mint / 9 / 8
      ctx.fillStyle = '#000000';
      ctx.fillRect(labelX, labelY, labelW, labelH);
      ctx.strokeStyle = isCgcPristine ? '#fbbf24' : '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(labelX, labelY, labelW, labelH);

      // Top black bar: CGC logo + CERTIFIED GUARANTY COMPANY
      ctx.fillStyle = '#000000';
      ctx.fillRect(labelX, labelY, labelW, 34);

      // CGC diamond icon
      const badgeGrad = ctx.createLinearGradient(labelX + 10, labelY + 7, labelX + 30, labelY + 27);
      badgeGrad.addColorStop(0, isCgcPristine ? '#f59e0b' : '#06b6d4');
      badgeGrad.addColorStop(1, isCgcPristine ? '#fef08a' : '#38bdf8');
      ctx.fillStyle = badgeGrad;
      ctx.fillRect(labelX + 10, labelY + 7, 20, 20);

      ctx.fillStyle = isCgcPristine ? '#fde047' : '#ffffff';
      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CGC', labelX + 36, labelY + 24);

      ctx.fillStyle = isCgcPristine ? '#fde68a' : '#f4f4f5';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        isCgcPristine ? 'PRISTINE GOLD EDITION' : 'CERTIFIED GUARANTY COMPANY',
        labelX + labelW - 10,
        labelY + 22
      );

      // Lower plate (Black & Gold vs Silver-White)
      const plateY = labelY + 34;
      const plateH = labelH - 34;
      const plateGrad = ctx.createLinearGradient(0, plateY, 0, plateY + plateH);
      if (isCgcPristine) {
        plateGrad.addColorStop(0, '#18181b');
        plateGrad.addColorStop(0.5, '#09090b');
        plateGrad.addColorStop(1, '#1c1917');
      } else {
        plateGrad.addColorStop(0, '#f1f5f9');
        plateGrad.addColorStop(0.5, '#ffffff');
        plateGrad.addColorStop(1, '#e2e8f0');
      }
      ctx.fillStyle = plateGrad;
      ctx.fillRect(labelX + 2, plateY, labelW - 4, plateH - 2);

      // Left card metadata
      ctx.fillStyle = isCgcPristine ? '#fef08a' : '#09090b';
      ctx.font = '900 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.name.slice(0, 24), labelX + 10, plateY + 20);

      const isOpCard =
        (card as any).universe === 'onepiece' ||
        (card.setNumber || '').startsWith('OP') ||
        (card.setName || '').toUpperCase().includes('ONE PIECE');
      ctx.fillStyle = isCgcPristine ? '#fcd34d' : '#27272a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(
        `${isOpCard ? 'One Piece' : 'Pokémon'} (${year}) · ${(card.setName || 'TCG').slice(0, 22)}`,
        labelX + 10,
        plateY + 37
      );

      if (isCgcPristine) {
        ctx.fillStyle = '#fbbf24';
        const weights = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 2, 1, 3, 1];
        let cx = labelX + 10;
        for (let i = 0; i < weights.length && cx < labelX + 130; i++) {
          const w = weights[i] * 2;
          ctx.fillRect(cx, plateY + 48, w, 14);
          cx += w + 2.5;
        }
      } else {
        drawMiniBarcode(labelX + 10, plateY + 48, 120, 14);
      }
      ctx.fillStyle = isCgcPristine ? '#fde047' : '#18181b';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(certNumber, labelX + 136, plateY + 59);

      // Right vertical divider + Grade box
      const gradeBoxX = labelX + labelW - 96;
      if (isCgcPristine) {
        const goldBoxGrad = ctx.createLinearGradient(gradeBoxX + 4, plateY + 5, gradeBoxX + 90, plateY + plateH - 6);
        goldBoxGrad.addColorStop(0, '#fde047');
        goldBoxGrad.addColorStop(0.5, '#f59e0b');
        goldBoxGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = goldBoxGrad;
        ctx.fillRect(gradeBoxX + 4, plateY + 5, 86, plateH - 12);
      } else {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(gradeBoxX, plateY + 6, 2, plateH - 14);
      }

      const cgcSub =
        grade === 10
          ? isCgcPristine
            ? 'PRISTINE'
            : 'GEM MINT'
          : grade === 9
          ? 'MINT'
          : 'NM-MT';
      ctx.fillStyle = isCgcPristine ? '#09090b' : '#18181b';
      ctx.font = '900 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cgcSub, gradeBoxX + 48, plateY + 21);

      ctx.fillStyle = '#09090b';
      ctx.font = '900 38px sans-serif';
      ctx.fillText(String(grade), gradeBoxX + 48, plateY + 60);
    } else if (company === 'BGS') {
      const isBlackLabel = grade >= 10 && gradeLabel.includes('BLACK LABEL');
      const isBgsGold = grade >= 9.5 && !isBlackLabel;

      ctx.fillStyle = isBlackLabel ? '#09090b' : isBgsGold ? '#1c1917' : '#1e293b';
      ctx.fillRect(labelX, labelY, labelW, labelH);

      if (isBlackLabel) {
        const blGrad = ctx.createLinearGradient(labelX, labelY, labelX + labelW, labelY + labelH);
        blGrad.addColorStop(0, '#09090b');
        blGrad.addColorStop(0.5, '#18181b');
        blGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = blGrad;
        ctx.fillRect(labelX + 2, labelY + 2, labelW - 4, labelH - 4);
      } else if (isBgsGold) {
        const goldGrad = ctx.createLinearGradient(labelX, labelY, labelX + labelW, labelY + labelH);
        goldGrad.addColorStop(0, '#92400e');
        goldGrad.addColorStop(0.4, '#f59e0b');
        goldGrad.addColorStop(0.7, '#fde047');
        goldGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(labelX + 2, labelY + 2, labelW - 4, labelH - 4);
      } else {
        const silverGrad = ctx.createLinearGradient(labelX, labelY, labelX + labelW, labelY + labelH);
        silverGrad.addColorStop(0, '#cbd5e1');
        silverGrad.addColorStop(0.5, '#f8fafc');
        silverGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = silverGrad;
        ctx.fillRect(labelX + 2, labelY + 2, labelW - 4, labelH - 4);
      }

      ctx.strokeStyle = isBlackLabel ? '#fbbf24' : isBgsGold ? '#fef08a' : '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(labelX, labelY, labelW, labelH);

      const textPrimary = isBlackLabel ? '#fde047' : '#09090b';
      const textSub = isBlackLabel ? '#f4f4f5' : '#18181b';

      ctx.fillStyle = textPrimary;
      ctx.font = '900 17px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(isBlackLabel ? 'BECKETT BLACK LABEL' : 'BECKETT GRADING (BGS)', labelX + 12, labelY + 24);

      ctx.fillStyle = textSub;
      ctx.font = '900 14px sans-serif';
      ctx.fillText(card.name.slice(0, 21).toUpperCase(), labelX + 12, labelY + 46);

      // 4 Subgrades compact readout
      const sg = slab.subgrades;
      const sgText = sg
        ? `C:${sg.centering.toFixed(1)}  CR:${sg.corners.toFixed(1)}  E:${sg.edges.toFixed(1)}  S:${sg.surface.toFixed(1)}`
        : isBlackLabel
        ? 'C:10.0 CR:10.0 E:10.0 S:10.0'
        : `#${certNumber}`;
      ctx.fillStyle = isBlackLabel ? '#fbbf24' : '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(sgText, labelX + 12, labelY + 70);

      ctx.fillStyle = isBlackLabel ? '#a1a1aa' : '#27272a';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`CERT #${certNumber}`, labelX + 12, labelY + 90);

      // Right BGS Grade Box
      const boxX = labelX + labelW - 88;
      ctx.fillStyle = isBlackLabel ? '#fbbf24' : '#09090b';
      ctx.fillRect(boxX, labelY + 8, 78, labelH - 16);
      ctx.fillStyle = isBlackLabel ? '#09090b' : '#fde047';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isBlackLabel ? 'BLACK 10' : grade >= 10 ? 'PRISTINE' : grade >= 9.5 ? 'GEM MINT' : 'BGS', boxX + 39, labelY + 26);
      ctx.font = '900 34px sans-serif';
      ctx.fillText(String(grade), boxX + 39, labelY + 68);
    } else {
      // PSA: Crisp white background, iconic red border (#d91e2a), crisp black typography
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(labelX, labelY, labelW, labelH);
      ctx.strokeStyle = '#d91e2a';
      ctx.lineWidth = 6;
      ctx.strokeRect(labelX + 3, labelY + 3, labelW - 6, labelH - 6);

      const isOpPsa =
        (card as any).universe === 'onepiece' ||
        (card.setNumber || '').startsWith('OP') ||
        (card.setName || '').toUpperCase().includes('ONE PIECE');
      ctx.fillStyle = '#09090b';
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `${year} ${isOpPsa ? 'ONE PIECE' : 'POKEMON'} ${(card.setName || 'TCG').slice(0, 16).toUpperCase()}`,
        labelX + 12,
        labelY + 24
      );

      ctx.font = '900 15px monospace';
      ctx.fillText(card.name.slice(0, 21).toUpperCase(), labelX + 12, labelY + 44);

      ctx.fillStyle = '#3f3f46';
      ctx.font = 'bold 11px monospace';
      ctx.fillText((card.rarity || 'COLLECTIBLE').slice(0, 24).toUpperCase(), labelX + 12, labelY + 62);

      drawMiniBarcode(labelX + 12, labelY + 72, 130, 18);

      // Tiny foil PSA badge in bottom center-right
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(labelX + 165, labelY + 70, 44, 22);
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX + 165, labelY + 70, 44, 22);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PSA', labelX + 187, labelY + 86);

      // Right PSA grade block (black typography)
      const psaSub = grade === 10 ? 'GEM MT' : grade === 9 ? 'MINT' : 'NM-MT';
      ctx.fillStyle = '#09090b';
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(cardNum, labelX + labelW - 12, labelY + 24);

      ctx.font = '900 13px monospace';
      ctx.fillText(psaSub, labelX + labelW - 12, labelY + 42);

      ctx.font = '900 32px monospace';
      ctx.fillText(String(grade), labelX + labelW - 12, labelY + 74);

      ctx.font = 'bold 11px monospace';
      ctx.fillText(certNumber, labelX + labelW - 12, labelY + 93);
    }

    // Optional protective Slab Guard colored outer bumper
    const guardColorMap: Record<string, string> = {
      gold: '#fbbf24',
      crimson: '#ef4444',
      cyan: '#22d3ee',
      emerald: '#10b981',
      obsidian: '#52525b',
    };
    const guardHex = slab.slabGuardColor ? guardColorMap[slab.slabGuardColor] : undefined;
    if (guardHex) {
      ctx.strokeStyle = guardHex;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    }

    // Recessed Card Window inside Slab
    const winX = 18;
    const winY = 132;
    const winW = canvas.width - 36;
    const winH = canvas.height - 148;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = 'rgba(161, 161, 170, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);

    // Loading card fallback text inside window
    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.name.slice(0, 26), canvas.width / 2, winY + winH / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;

    const drawContainedCardInSlab = (img: HTMLImageElement) => {
      const innerPad = 10;
      const availW = winW - innerPad * 2;
      const availH = winH - innerPad * 2;
      const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 63 / 88;
      let drawW = availW;
      let drawH = drawW / ratio;
      if (drawH > availH) {
        drawH = availH;
        drawW = drawH * ratio;
      }
      const dx = winX + (winW - drawW) / 2;
      const dy = winY + (winH - drawH) / 2;

      ctx.fillStyle = '#09090b';
      ctx.fillRect(winX + 2, winY + 2, winW - 4, winH - 4);
      ctx.drawImage(img, dx, dy, drawW, drawH);
      texture.needsUpdate = true;
    };

    const loadSlabImage = (url: string, step: number = 0) => {
      if (!url) return;
      const img = new Image();
      if (url.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          drawContainedCardInSlab(img);
        } catch {}
      };
      img.onerror = () => {
        if (step === 0 && url.includes('_hires.png')) {
          loadSlabImage(url.replace('_hires.png', '.png'), 1);
        } else if (step <= 1 && card.artUrl) {
          const resolvedArt = resolveRenderUrl(card.artUrl, card.name);
          if (resolvedArt && resolvedArt !== url) {
            loadSlabImage(resolvedArt, 2);
            return;
          }
          if (card.fallbackUrl && card.fallbackUrl !== url) {
            loadSlabImage(card.fallbackUrl, 3);
          }
        } else if (step <= 2 && card.fallbackUrl && card.fallbackUrl !== url) {
          loadSlabImage(card.fallbackUrl, 3);
        }
      };
      img.src = url;
    };

    const slabTargetUrl = resolveRenderUrl(card.imageUrl, card.name);
    if (slabTargetUrl) {
      loadSlabImage(slabTargetUrl, 0);
    } else if (card.artUrl) {
      loadSlabImage(resolveRenderUrl(card.artUrl, card.name), 2);
    } else if (card.fallbackUrl) {
      loadSlabImage(card.fallbackUrl, 3);
    }
    return texture;
  }

  // 3. RAW POKÉMON CARD (THẺ RAW NGUYÊN BẢN - KHÔNG PSA!)
  ctx.fillStyle = '#0a0f1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = 6;
  const cardW = canvas.width - pad * 2;
  const cardH = canvas.height - pad * 2;

  ctx.strokeStyle = card.hasRgbAura || (card.marketPrice && card.marketPrice >= 100) ? '#ffd700' : '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(pad, pad, cardW, cardH);

  ctx.fillStyle = card.cardColor || '#1e293b';
  ctx.fillRect(pad + 2, pad + 2, cardW - 4, cardH - 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;

  const cleanUrl = resolveRenderUrl(card.imageUrl, card.name);

  const loadRawImage = (url: string, step: number = 0) => {
    if (!url) return;
    const img = new Image();
    if (url.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(pad, pad, cardW, cardH);
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 63 / 88;
        let drawW = cardW;
        let drawH = drawW / ratio;
        if (drawH > cardH) {
          drawH = cardH;
          drawW = drawH * ratio;
        }
        const dx = pad + (cardW - drawW) / 2;
        const dy = pad + (cardH - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.strokeStyle = card.hasRgbAura || (card.marketPrice && card.marketPrice >= 100) ? '#ffd700' : '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(pad, pad, cardW, cardH);
        texture.needsUpdate = true;
      } catch {}
    };
    img.onerror = () => {
      if (step === 0 && url.includes('_hires.png')) {
        loadRawImage(url.replace('_hires.png', '.png'), 1);
      } else if (step <= 1 && card.artUrl) {
        const resolvedArt = resolveRenderUrl(card.artUrl, card.name);
        if (resolvedArt && resolvedArt !== url) {
          loadRawImage(resolvedArt, 2);
          return;
        }
        if (card.fallbackUrl && card.fallbackUrl !== url) {
          loadRawImage(card.fallbackUrl, 3);
        }
      } else if (step <= 2 && card.fallbackUrl && card.fallbackUrl !== url) {
        loadRawImage(card.fallbackUrl, 3);
      }
    };
    img.src = url;
  };

  if (cleanUrl) {
    loadRawImage(cleanUrl, 0);
  } else if (card.artUrl) {
    loadRawImage(resolveRenderUrl(card.artUrl, card.name), 2);
  } else if (card.fallbackUrl) {
    loadRawImage(card.fallbackUrl, 3);
  }

  return texture;
}

// 11. SHOWCASE PRICE TAG TEXTURE (Yellow retail price tag on gold stand)
export function createShowcasePriceTagTexture(price: number, isSold?: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isSold ? '#ef4444' : '#facc15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  if (isSold) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ĐÃ BÁN', canvas.width / 2, canvas.height / 2);
  } else {
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(16 + i * 8, 16, i % 2 === 0 ? 4 : 2, canvas.height - 32);
    }
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${price.toLocaleString()}`, canvas.width - 16, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 12. PROMOTIONAL STORE POSTER TEXTURE
export function createStorePosterTexture(
  imageUrl: string,
  title: string,
  subtitle: string = 'OFFICIAL POKÉMON TCG',
  accentColor: string = '#e11d48',
  aspectRatio: number = 0.7
): THREE.CanvasTexture {
  const canvasW = aspectRatio >= 1 ? 768 : 512;
  const canvasH = Math.round(canvasW / aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // High quality procedural background poster as fallback & immediate render
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#09090b');
  grad.addColorStop(0.4, '#18181b');
  grad.addColorStop(0.7, accentColor);
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border & Gold Rim
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  // Top header text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(subtitle, canvas.width / 2, 60);

  // Center Emblem / Pokeball
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px sans-serif';
  ctx.fillText(subtitle.includes('ONE PIECE') ? 'ONE PIECE' : 'POKÉMON', canvas.width / 2, canvas.height / 2 - 10);

  // Bottom Title
  ctx.fillStyle = '#fde047';
  ctx.font = '900 30px sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height - 45);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  if (imageUrl) {
    const img = new Image();
    if (imageUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width || canvas.width;
        const naturalH = img.naturalHeight || img.height || canvas.height;
        const imgRatio = naturalW / naturalH;
        const targetRatio = canvas.width / canvas.height;

        let drawW = canvas.width;
        let drawH = canvas.height;
        let drawX = 0;
        let drawY = 0;

        if (imgRatio > targetRatio) {
          drawW = canvas.width;
          drawH = canvas.width / imgRatio;
          drawY = (canvas.height - drawH) / 2;
        } else {
          drawH = canvas.height;
          drawW = canvas.height * imgRatio;
          drawX = (canvas.width - drawW) / 2;
        }

        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Re-apply crisp outer frame
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        texture.needsUpdate = true;
      } catch {}
    };
    img.src = imageUrl;
  }

  return texture;
}

// 15. WALL CARD DISPLAY ROW TEXTURE (TCG Card Shop Simulator - Reference image_b3fdd596.png)
// 15. WALL CARD DISPLAY ROW TEXTURE (TCG Card Shop Simulator - Real Pokemon Cards & Market Prices)
export function createShelfCardRowTexture(tierIndex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark slate-grey metal display backing
  ctx.fillStyle = '#1e2430';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle vertical grooves for card slots
  ctx.strokeStyle = '#0f141c';
  ctx.lineWidth = 2;

  const cardCount = 8;
  const slotW = canvas.width / cardCount;
  const cardW = 98;
  const cardH = 180;
  const cardY = 28;

  // Curated list of iconic authentic cards with official TCG image scans & accurate market prices
  const cardThemes = [
    { name: 'Charizard 151', price: '$500', url: 'https://images.pokemontcg.io/sv3pt5/199_hires.png', bg: '#ea580c' },
    { name: 'Moonbreon VMAX', price: '$650', url: 'https://images.pokemontcg.io/swsh7/215_hires.png', bg: '#1e1b4b' },
    { name: 'Rayquaza VMAX', price: '$350', url: 'https://images.pokemontcg.io/swsh7/218_hires.png', bg: '#059669' },
    { name: 'Lugia V Alt', price: '$180', url: 'https://images.pokemontcg.io/swsh12/186_hires.png', bg: '#0284c7' },
    { name: 'Giratina V Alt', price: '$320', url: 'https://images.pokemontcg.io/swsh11/177_hires.png', bg: '#7c2d12' },
    { name: 'Gengar VMAX', price: '$220', url: 'https://images.pokemontcg.io/swsh8/271_hires.png', bg: '#581c87' },
    { name: 'Charizard 1999', price: '$890', url: 'https://images.pokemontcg.io/base1/4_hires.png', bg: '#c2410c' },
    { name: 'Blastoise 1999', price: '$95', url: 'https://images.pokemontcg.io/base1/2_hires.png', bg: '#1d4ed8' },
    { name: 'Venusaur 1999', price: '$85', url: 'https://images.pokemontcg.io/base1/15_hires.png', bg: '#15803d' },
    { name: 'Pikachu SR', price: '$45', url: 'https://images.pokemontcg.io/swsh12pt5/160_hires.png', bg: '#ca8a04' },
    { name: 'Mew 151 Rare', price: '$50', url: 'https://images.pokemontcg.io/sv3pt5/151_hires.png', bg: '#db2777' },
    { name: 'Mew 30th Grail', price: '$4,000', url: 'https://images.pokemontcg.io/sv3pt5/151_hires.png', bg: '#e11d48' },
    { name: 'Arceus VSTAR', price: '$80', url: 'https://images.pokemontcg.io/swsh12pt5/gg70_hires.png', bg: '#eab308' },
    { name: 'Giratina VSTAR', price: '$130', url: 'https://images.pokemontcg.io/swsh12pt5/gg69_hires.png', bg: '#b45309' },
    { name: 'Dragonite V', price: '$140', url: 'https://images.pokemontcg.io/swsh7/192_hires.png', bg: '#0369a1' },
    { name: 'Tyranitar V', price: '$165', url: 'https://images.pokemontcg.io/swsh5/155_hires.png', bg: '#047857' },
  ];

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  // Render cards across the 8 slots
  for (let i = 0; i < cardCount; i++) {
    const cardInfo = cardThemes[(i + tierIndex * 3) % cardThemes.length];
    const cardX = i * slotW + (slotW - cardW) / 2;

    // Slot divider line
    ctx.beginPath();
    ctx.moveTo((i + 1) * slotW, 0);
    ctx.lineTo((i + 1) * slotW, canvas.height);
    ctx.stroke();

    // 1. Acrylic Toploader / Sleeve Border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cardX - 4, cardY - 4, cardW + 8, cardH + 6);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX - 4, cardY - 4, cardW + 8, cardH + 6);

    // 2. Initial Card Face Background
    ctx.fillStyle = cardInfo.bg;
    ctx.fillRect(cardX, cardY, cardW, cardH - 24);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardW, cardH - 24);

    // Initial Card Name & Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cardInfo.name, cardX + cardW / 2, cardY + 24);

    // 3. Yellow Retail Price Tag on Shelf Lip
    const tagW = 68;
    const tagH = 20;
    const tagX = cardX + (cardW - tagW) / 2;
    const tagY = cardY + cardH - 16;

    ctx.fillStyle = '#facc15';
    ctx.fillRect(tagX, tagY, tagW, tagH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tagX, tagY, tagW, tagH);

    ctx.fillStyle = '#000000';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cardInfo.price, tagX + tagW / 2, tagY + 14);

    // 4. Asynchronously Load Real Official Pokemon Card Scan into the Slot
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        ctx.drawImage(img, cardX, cardY, cardW, cardH - 24);

        // Re-apply crisp outer sleeve border & price tag
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cardX - 4, cardY - 4, cardW + 8, cardH + 6);

        ctx.fillStyle = '#facc15';
        ctx.fillRect(tagX, tagY, tagW, tagH);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tagX, tagY, tagW, tagH);

        ctx.fillStyle = '#000000';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cardInfo.price, tagX + tagW / 2, tagY + 14);

        texture.needsUpdate = true;
      } catch {}
    };
    img.src = cardInfo.url;
  }

  // Silver Bottom Shelf Lip
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, canvas.height - 10, canvas.width, 10);

  return texture;
}

// 12. OFFICIAL POKEMON TCG TOURNAMENT BATTLE PLAYMAT TEXTURE
export function createPokemonPlaymatTexture(colorVariant: 'blue' | 'purple' = 'blue'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  // Smooth neoprene mat background
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (colorVariant === 'blue') {
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
  } else {
    bgGrad.addColorStop(0, '#1e112a');
    bgGrad.addColorStop(0.5, '#2e1065');
    bgGrad.addColorStop(1, '#1e112a');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stitched border edge
  ctx.strokeStyle = colorVariant === 'blue' ? '#38bdf8' : '#c084fc';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  // Center Pokeball Watermark
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - 60, centerY);
  ctx.lineTo(centerX + 60, centerY);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Helper to draw a card zone
  const drawSlot = (x: number, y: number, w: number, h: number, label: string) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  };

  // 1. Prize Cards (6 cards on left: 2 columns x 3 rows)
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < 3; r++) {
      drawSlot(20 + c * 34, 40 + r * 50, 30, 44, 'PRIZE');
    }
  }

  // 2. Active Spot (Center Top)
  drawSlot(centerX - 24, 50, 48, 68, 'ACTIVE');

  // 3. Bench Slots (5 slots along Center Bottom)
  const benchStartX = centerX - (5 * 46) / 2;
  for (let b = 0; b < 5; b++) {
    drawSlot(benchStartX + b * 46 + 4, 150, 38, 54, 'BENCH');
  }

  // 4. Deck & Discard Pile (Right Side)
  drawSlot(canvas.width - 70, 50, 48, 68, 'DECK');
  drawSlot(canvas.width - 70, 140, 48, 68, 'DISCARD');

  // Playmat Title
  ctx.fillStyle = colorVariant === 'blue' ? '#38bdf8' : '#e879f9';
  ctx.font = '900 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POKÉMON TCG BATTLE PLAYMAT', centerX, 260);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

// 14. AUTHENTIC POKEMON CARD BACK TEXTURE
export function createPokemonCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;

  // Dark Navy Blue Card Border
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Golden Yellow Inner Frame
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(16, 16, canvas.width - 32, canvas.height - 32);

  // Deep Blue Swirl Background
  const radial = ctx.createRadialGradient(200, 280, 20, 200, 280, 220);
  radial.addColorStop(0, '#2563eb');
  radial.addColorStop(0.6, '#1d4ed8');
  radial.addColorStop(1, '#091e42');
  ctx.fillStyle = radial;
  ctx.fillRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Pokéball in Center
  const cx = 200;
  const cy = 280;
  const r = 85;

  // Outer ring shadow
  ctx.fillStyle = '#0b1329';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.fill();

  // Top half: Red
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fill();

  // Bottom half: White
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.fill();

  // Center black band
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - r, cy - 10, r * 2, 20);

  // Center button outer black ring
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();

  // Center button white core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();

  // Highlight dot
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 6, 6, 0, Math.PI * 2);
  ctx.fill();

  // Classic Arched POKÉMON Header & Footer in Golden Glow
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 4;
  ctx.font = '900 28px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';

  ctx.strokeText('POKÉMON', cx, 85);
  ctx.fillText('POKÉMON', cx, 85);

  ctx.strokeText('TRADING CARD GAME', cx, 495);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('TRADING CARD GAME', cx, 495);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// 12. RED TARTAN PLAID SKIRT TEXTURE (Exact replica of hired cashier in user screenshot)
export function createRedPlaidSkirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep crimson red foundation
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 256, 256);

  // Broad dark navy / charcoal crossing blocks
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  for (let i = 0; i < 256; i += 64) {
    ctx.fillRect(i, 0, 28, 256);
    ctx.fillRect(0, i, 256, 28);
  }

  // Medium black crossing stripes
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  for (let i = 0; i < 256; i += 64) {
    ctx.fillRect(i + 10, 0, 8, 256);
    ctx.fillRect(0, i + 10, 256, 8);
  }

  // Fine white and yellow accent lines
  ctx.fillStyle = '#fef08a';
  for (let i = 0; i < 256; i += 64) {
    ctx.fillRect(i + 46, 0, 2, 256);
    ctx.fillRect(0, i + 46, 256, 2);
  }

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 256; i += 32) {
    ctx.fillRect(i + 14, 0, 1, 256);
    ctx.fillRect(0, i + 14, 256, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 13. PROCEDURAL FACIAL EXPRESSION TEXTURES
// Matching user request: "người chơi phải có khuôn mặt hỉ nộ vui vẻ hoặc khuôn mặt gì đó"
export type FaceExpressionType = 'happy' | 'focused' | 'shocked' | 'excited' | 'smug' | 'female_cashier';

const faceTextureCache = new Map<string, THREE.CanvasTexture>();

export function createCharacterFaceTexture(
  expression: FaceExpressionType = 'happy',
  skinTone: string = '#ffd1a4'
): THREE.CanvasTexture {
  const cacheKey = `${expression}_${skinTone}`;
  const cached = faceTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Smooth skin tone base
  ctx.fillStyle = skinTone;
  ctx.fillRect(0, 0, 256, 256);

  if (expression === 'female_cashier') {
    // Pretty female cashier face matching user screenshot (YouShowMeat)
    // Soft blush on cheeks
    const blushGradL = ctx.createRadialGradient(68, 150, 4, 68, 150, 28);
    blushGradL.addColorStop(0, 'rgba(251, 113, 133, 0.55)');
    blushGradL.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = blushGradL;
    ctx.beginPath();
    ctx.arc(68, 150, 28, 0, Math.PI * 2);
    ctx.fill();

    const blushGradR = ctx.createRadialGradient(188, 150, 4, 188, 150, 28);
    blushGradR.addColorStop(0, 'rgba(251, 113, 133, 0.55)');
    blushGradR.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = blushGradR;
    ctx.beginPath();
    ctx.arc(188, 150, 28, 0, Math.PI * 2);
    ctx.fill();

    // Elegant curved eyebrows
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(75, 102, 24, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(181, 102, 24, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Large Anime eyes with long dark eyelashes
    [75, 181].forEach((ex, idx) => {
      // White sclera
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 126, 22, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Deep Blue/Violet Iris
      const irisGrad = ctx.createRadialGradient(ex, 126, 2, ex, 126, 14);
      irisGrad.addColorStop(0, '#38bdf8');
      irisGrad.addColorStop(0.5, '#2563eb');
      irisGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(ex + (idx === 0 ? 2 : -2), 126, 12, 0, Math.PI * 2);
      ctx.fill();

      // Black pupil
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(ex + (idx === 0 ? 2 : -2), 126, 6, 0, Math.PI * 2);
      ctx.fill();

      // Glossy light reflections
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 3, 122, 4, 0, Math.PI * 2);
      ctx.arc(ex + 4, 128, 2, 0, Math.PI * 2);
      ctx.fill();

      // Top thick eyeliner & winged lash
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ex, 122, 22, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Wing flick
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (idx === 0) {
        ctx.moveTo(ex - 22, 124);
        ctx.lineTo(ex - 30, 118);
      } else {
        ctx.moveTo(ex + 22, 124);
        ctx.lineTo(ex + 30, 118);
      }
      ctx.stroke();
    });

    // Delicate nose shadow
    ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
    ctx.beginPath();
    ctx.arc(128, 154, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Sweet pink smiling lips with gloss
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(128, 185, 16, 8, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // White teeth / lip gleam
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(128, 183, 8, 2.5, 0, 0, Math.PI);
    ctx.fill();
  } else if (expression === 'happy' || expression === 'excited') {
    // Vui vẻ / Phấn khích (Happy Smile & Wide Eyes)
    ctx.strokeStyle = '#27170a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Arched happy eyebrows
    ctx.beginPath();
    ctx.arc(76, 95, 20, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(180, 95, 20, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Cheerful Eyes
    [76, 180].forEach((ex) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 122, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Iris & Pupil
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.arc(ex, 122, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex, 122, 5, 0, Math.PI * 2);
      ctx.fill();
      // Reflection
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 3, 118, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Big happy open smile with teeth
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(128, 172, 28, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // White teeth row
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.rect(112, 172, 32, 9);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(65, 146, 15, 0, Math.PI * 2);
    ctx.arc(191, 146, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (expression === 'shocked') {
    // Hỉ nộ / Bất ngờ cay cú khi thua thẻ bài (Shocked / Gasping)
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // High arched shocked eyebrows
    ctx.beginPath();
    ctx.arc(76, 85, 22, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(180, 85, 22, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Wide round shocked eyes
    [76, 180].forEach((ex) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, 122, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Tiny pinpoint shocked pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex, 122, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Open round 'O' gasping mouth
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(128, 185, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sweat drop of stress
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(205, 95);
    ctx.quadraticCurveTo(215, 112, 205, 120);
    ctx.quadraticCurveTo(195, 112, 205, 95);
    ctx.fill();
  } else if (expression === 'smug') {
    // Tự tin đắc ý / Smug grin
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // One raised eyebrow, one low
    ctx.beginPath();
    ctx.moveTo(56, 102);
    ctx.lineTo(96, 92);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(180, 88, 20, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Half-lidded confident eyes
    [76, 180].forEach((ex) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, 124, 16, Math.PI * 0.1, Math.PI * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(ex, 126, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sideways cocky grin
    ctx.beginPath();
    ctx.moveTo(110, 182);
    ctx.quadraticCurveTo(135, 192, 155, 170);
    ctx.stroke();
  } else {
    // Tập trung suy nghĩ (Focused / Tactical)
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Angled furrowed eyebrows concentrating on cards
    ctx.beginPath();
    ctx.moveTo(58, 102);
    ctx.lineTo(96, 112);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(198, 102);
    ctx.lineTo(160, 112);
    ctx.stroke();

    // Narrow focused eyes
    [76, 180].forEach((ex) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 126, 17, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(ex, 126, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Small firm determined mouth
    ctx.beginPath();
    ctx.moveTo(114, 182);
    ctx.lineTo(142, 182);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  faceTextureCache.set(cacheKey, texture);
  return texture;
}

// 22. RETAIL SHOPPING BAG TEXTURE (Túi Xách Thẻ Bài Pokemon)
export function createShoppingBagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm boutique kraft yellow/cream bag
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.45, '#fde047');
  grad.addColorStop(1, '#eab308');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Border & Fold creases
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 244);

  // Bag top fold flap (shifted slightly down so 3D top collar lip never covers the text)
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(6, 20, 244, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ POKECARD STORE ★', 128, 37);

  // Big Bold Pokéball Icon in Center
  const cx = 128;
  const cy = 136;
  const r = 46;

  // Outer circle shadow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fill();

  // Top half: Red
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  // Bottom half: White
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Outer border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#18181b';
  ctx.stroke();

  // Center horizontal band
  ctx.fillStyle = '#18181b';
  ctx.fillRect(cx - r, cy - 4, r * 2, 8);

  // Center button outer black ring
  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fillStyle = '#18181b';
  ctx.fill();

  // Center button inner white button
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#71717a';
  ctx.stroke();

  // Bottom text: POKEMON TCG
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POKÉMON TCG', 128, 216);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('OFFICIAL MERCHANDISE', 128, 234);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 23. BLUE PLASTIC SHOPPING BASKET TEXTURE (Giỏ Nhựa Siêu Thị Màu Xanh Dương)
// Exact match to supermarket simulator blue plastic basket with ventilation slots
export function createShoppingBasketTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // 1. Vivid Bright Supermarket Blue Plastic Base
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0099ff');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // 2. Reinforced Plastic Rim
  ctx.fillStyle = '#0077dd';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, 30, 256, 3);

  // 3. Ventilation Grid Slots (Iconic plastic supermarket basket ribs)
  const cols = 8;
  const rows = 5;
  const slotW = 18;
  const slotH = 26;
  const startX = 20;
  const startY = 48;
  const gapX = 11;
  const gapY = 12;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = startX + c * (slotW + gapX);
      const sy = startY + r * (slotH + gapY);

      // Shadow depth inside slot
      ctx.fillStyle = 'rgba(2, 44, 75, 0.85)';
      ctx.beginPath();
      ctx.roundRect(sx, sy, slotW, slotH, 4);
      ctx.fill();

      // Inner hollow cutout (genuine alpha-transparent ventilation hole)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sx + 2, sy + 2, slotW - 4, slotH - 4, 3);
      ctx.clip();
      ctx.clearRect(sx + 1, sy + 1, slotW - 2, slotH - 2);
      ctx.restore();

      // Top-left plastic highlight border
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(sx + 1.5, sy + 1.5, slotW - 3, slotH - 3, 3);
      ctx.stroke();
    }
  }

  // 4. Reinforced Bottom Base Rib
  ctx.fillStyle = '#024b7a';
  ctx.fillRect(0, 240, 256, 16);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, 238, 256, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Official GameStop Marquee Texture for the GameStop Mystery Box shelf.
 * Clean black background with the official GameStop logo, strictly NO text.
 */
export function createGameStopMarqueeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 353;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padX = 36;
    const padY = 24;
    ctx.drawImage(img, padX, padY, canvas.width - padX * 2, canvas.height - padY * 2);
    texture.needsUpdate = true;
  };
  img.src = '/boxes/gamestop_gamestopLogo.png';

  return texture;
}

/**
 * Procedural Cardboard Shipping / Delivery Box Texture (Image 1 & 2 Replica)
 * Features kraft corrugated cardboard grain, packing tape, shipping label with barcode, and fragile icons.
 */
export function createCardboardDeliveryBoxTexture(
  productTitle: string = 'POKÉMON TCG EXPANSION',
  itemCount: number = 10,
  previewThumbUrl?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Kraft Corrugated Cardboard Base
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#cda275');
  grad.addColorStop(0.5, '#bd8e5f');
  grad.addColorStop(1, '#ab7c4e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle corrugated fluting horizontal lines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 2);
  }

  // 2. Brown Packing Tape seam down middle
  ctx.fillStyle = 'rgba(146, 95, 48, 0.75)';
  ctx.fillRect(0, canvas.height / 2 - 28, canvas.width, 56);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, canvas.height / 2 - 28, canvas.width, 56);

  // 3. Official Shipping Address Label with Barcode (Image 1 & 2 replica)
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 8;
  ctx.fillRect(240, 40, 240, 180);
  ctx.shadowBlur = 0;

  // Label Header & Courier Logo
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PRIORITY DELIVERY', 255, 68);

  ctx.fillStyle = '#475569';
  ctx.font = '700 11px sans-serif';
  ctx.fillText('TO: POKÉMON TCG SHOP', 255, 90);
  ctx.fillText('TRACK: #PKM-' + Math.floor(100000 + Math.random() * 900000), 255, 108);
  ctx.fillText(`QTY: ${itemCount} UNITS`, 255, 126);

  // Realistic Barcode
  ctx.fillStyle = '#0f172a';
  const barX = 255;
  const barY = 140;
  const barW = 210;
  const barH = 55;
  for (let bx = 0; bx < barW; bx += 4) {
    if (Math.sin(bx * 0.45) > -0.2) {
      const lineW = Math.random() > 0.5 ? 2.5 : 1.5;
      ctx.fillRect(barX + bx, barY, lineW, barH);
    }
  }
  ctx.restore();

  // 4. Product Sticker / Packing Slip on the other half (Image 1 & 2)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.fillRect(35, 45, 180, 170);
  ctx.strokeRect(35, 45, 180, 170);

  ctx.fillStyle = '#0284c7';
  ctx.font = '900 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL MERCHANDISE', 125, 70);

  ctx.fillStyle = '#1e293b';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(productTitle.length > 20 ? productTitle.slice(0, 18) + '...' : productTitle, 125, 95);

  ctx.fillStyle = '#059669';
  ctx.font = '900 16px sans-serif';
  ctx.fillText(`📦 ${itemCount} ITEMS`, 125, 125);

  ctx.fillStyle = '#64748b';
  ctx.font = '700 10px sans-serif';
  ctx.fillText('FRAGILE · HANDLE WITH CARE', 125, 150);
  ctx.fillText('↑↑ THIS WAY UP ↑↑', 125, 175);
  ctx.restore();

  // 5. Handling & Fragility Symbols on Bottom Half
  ctx.fillStyle = '#1e293b';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🍷 ☔ ♻️ ⬆️⬆️', 50, 440);

  ctx.font = 'bold 14px monospace';
  ctx.fillText('CERTIFIED TCG WHOLESALE CARTON', 50, 475);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Open Cardboard Box Texture (Image 3 Replica)
 * Shows the open cardboard box interior filled with rows of booster packs.
 */
export function createOpenCardboardBoxTexture(
  packName: string = 'Booster Packs',
  packCount: number = 20,
  accentColor: string = '#0284c7'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // 1. Corrugated Cardboard Rim & Flaps (folded open)
  ctx.fillStyle = '#bd8e5f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer border rim
  ctx.strokeStyle = '#8d5c2e';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // 2. Dark Interior Cavity
  const innerMargin = 50;
  ctx.fillStyle = '#1c150c';
  ctx.fillRect(
    innerMargin,
    innerMargin,
    canvas.width - innerMargin * 2,
    canvas.height - innerMargin * 2
  );

  // 3. Rows of Booster Packs / Box Units packed tightly inside (Exact Image 3 replica)
  // Two columns of packs, each column having 5 rows stacked neatly with staggered tabs
  const cols = [
    { x: 80, w: 410 },
    { x: 534, w: 410 },
  ];

  cols.forEach((col) => {
    // Divider channel
    ctx.fillStyle = '#2d2215';
    ctx.fillRect(col.x - 10, innerMargin + 10, col.w + 20, canvas.height - innerMargin * 2 - 20);

    const rows = 6;
    const rowH = 85;
    for (let r = 0; r < rows; r++) {
      const py = innerMargin + 25 + r * (rowH - 12);

      // Pack Top Header Tab
      ctx.save();
      const tabGrad = ctx.createLinearGradient(col.x, py, col.x, py + rowH);
      tabGrad.addColorStop(0, '#f8fafc');
      tabGrad.addColorStop(0.35, '#cbd5e1');
      tabGrad.addColorStop(0.4, accentColor);
      tabGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = tabGrad;

      // Rounded pack foil top
      ctx.beginPath();
      ctx.roundRect(col.x, py, col.w, rowH, 8);
      ctx.fill();

      // Top crimp line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Peg hole in center of tab
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(col.x + col.w / 2, py + 16, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pack Branding / Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ POKÉMON TCG ★', col.x + col.w / 2, py + 48);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(packName.toUpperCase(), col.x + col.w / 2, py + 68);

      // 6+ age icon
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(col.x + col.w - 48, py + 12, 34, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px sans-serif';
      ctx.fillText('6+', col.x + col.w - 31, py + 25);

      ctx.restore();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Security Shutter / Lock Overlay Texture rendered on locked 3D shelves & bays
 */
export function createShelfLockedPanelTexture(
  shelfName: string,
  reqLevel: number,
  fee: number,
  accentColor: string = '#f59e0b'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark tinted smoked-glass background
  ctx.fillStyle = 'rgba(9, 13, 22, 0.94)';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle diagonal frosted security stripes
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 14;
  for (let i = -512; i < 1024; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
  }
  ctx.restore();

  // Hazard caution ribbon top & bottom
  const drawHazardBar = (y: number, h: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, 512, h);
    ctx.clip();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, y, 512, h);
    ctx.fillStyle = accentColor;
    for (let x = -40; x < 560; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20, y);
      ctx.lineTo(x + 4, y + h);
      ctx.lineTo(x - 16, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  drawHazardBar(0, 22);
  drawHazardBar(490, 22);

  // Outer glowing border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 32, 484, 448);

  // Center Padlock Badge Circle
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(256, 128, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Padlock icon (vector drawn cleanly)
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(256, 114, 18, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(230, 114, 52, 42, 8);
  ctx.fill();
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(256, 132, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(253, 134, 6, 12);
  ctx.restore();

  // "KỆ ĐANG KHÓA" header
  ctx.fillStyle = accentColor;
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KỆ HÀNG ĐANG KHÓA', 256, 218);

  // Shelf Name (wrapped max 2 lines)
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 24px sans-serif';
  const words = shelfName.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 24) {
      line1 = (line1 + ' ' + w).trim();
    } else {
      line2 = (line2 + ' ' + w).trim();
    }
  }
  ctx.fillText(line1, 256, 260);
  if (line2) {
    ctx.fillText(line2.length > 26 ? line2.slice(0, 24) + '...' : line2, 256, 290);
  }

  // Requirement Pill: Cấp X · Phí $Y
  ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(56, 322, 400, 82, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.font = '900 28px sans-serif';
  ctx.fillText(`MỞ TẠI CẤP ${reqLevel}`, 256, 358);

  ctx.fillStyle = '#4ade80';
  ctx.font = '900 24px monospace';
  ctx.fillText(`PHÍ MỞ KHÓA: $${fee.toLocaleString()}`, 256, 390);

  // Footer instruction
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('MỞ TABLET [TAB] → MỞ KHÓA KỆ', 256, 448);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ============================================================================
// FLOOR 2 — ONE PIECE CARD GAME (OPCG) PROCEDURAL TEXTURES
// ============================================================================

export function createOnePieceWatermarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18141c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle nautical diagonal wave stripes
  ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
  for (let i = -512; i < 1024; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 18, 0);
    ctx.lineTo(i - 220, 512);
    ctx.lineTo(i - 238, 512);
    ctx.closePath();
    ctx.fill();
  }

  ctx.save();
  ctx.translate(256, 256);
  ctx.rotate(-0.18);
  ctx.font = '900 62px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
  ctx.fillText('ONE PIECE', 0, -24);
  ctx.font = '900 32px sans-serif';
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
  ctx.fillText('CARD GAME', 0, 28);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createOnePieceCanopyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2560;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Deep imperial crimson-obsidian boutique header gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#0d0406');
  grad.addColorStop(0.22, '#2d060c');
  grad.addColorStop(0.5, '#4c0a12');
  grad.addColorStop(0.78, '#2d060c');
  grad.addColorStop(1, '#0d0406');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center warm amber-gold architectural gallery spotlight glow
  const glow = ctx.createRadialGradient(canvas.width / 2, 80, 20, canvas.width / 2, 80, 780);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.25)');
  glow.addColorStop(0.55, 'rgba(220, 38, 38, 0.14)');
  glow.addColorStop(1, 'rgba(13, 4, 6, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle diagonal luxury architectural louvre pattern on left & right wings
  ctx.fillStyle = 'rgba(253, 224, 71, 0.045)';
  for (let x = 36; x < 440; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 12, 18);
    ctx.lineTo(x - 24, 142);
    ctx.lineTo(x - 36, 142);
    ctx.closePath();
    ctx.fill();
  }
  for (let x = canvas.width - 440; x < canvas.width - 36; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 12, 18);
    ctx.lineTo(x + 48, 142);
    ctx.lineTo(x + 36, 142);
    ctx.closePath();
    ctx.fill();
  }

  // Champagne-gold metallic horizontal framing lines
  const goldGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  goldGrad.addColorStop(0, '#78350f');
  goldGrad.addColorStop(0.25, '#facc15');
  goldGrad.addColorStop(0.5, '#fef08a');
  goldGrad.addColorStop(0.75, '#facc15');
  goldGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 0, canvas.width, 7);
  ctx.fillRect(0, canvas.height - 7, canvas.width, 7);

  // Thin imperial crimson pinstripe inside gold border
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(28, 13, canvas.width - 56, 3);
  ctx.fillRect(28, canvas.height - 16, canvas.width - 56, 3);

  // Symmetrical Golden Grand Line Compass & Pirate Crown Medallions on left & right wings
  const drawGrandLineEmblem = (cx: number, cy: number, r: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
    ctx.fill();

    // Outer compass ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1f070b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    // Inner crimson nautical circle
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = '#7f1d1d';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();

    // 4-point Golden Compass Star
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.84);
    ctx.lineTo(cx + r * 0.17, cy - r * 0.17);
    ctx.lineTo(cx + r * 0.84, cy);
    ctx.lineTo(cx + r * 0.17, cy + r * 0.17);
    ctx.lineTo(cx, cy + r * 0.84);
    ctx.lineTo(cx - r * 0.17, cy + r * 0.17);
    ctx.lineTo(cx - r * 0.84, cy);
    ctx.lineTo(cx - r * 0.17, cy - r * 0.17);
    ctx.closePath();
    ctx.fill();

    // Center crimson gem
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();
    ctx.restore();
  };

  drawGrandLineEmblem(195, 80, 42);
  drawGrandLineEmblem(canvas.width - 195, 80, 42);

  // Left & right hairline gold divider bars
  ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
  ctx.fillRect(275, 78, 175, 3);
  ctx.fillRect(canvas.width - 450, 78, 175, 3);

  // Crisp un-stretched headline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px "Arial Black", "Montserrat", sans-serif';
  ctx.fillText('ONE PIECE CARD GAME  •  GRAND LINE COLLECTION', canvas.width / 2, 62);
  ctx.shadowBlur = 0;

  // Crisp subtitle line
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 21px "Inter", sans-serif';
  ctx.fillText(
    'OFFICIAL BOOSTER PACKS  &  EMPEROR DISPLAY BOXES  •  2ND FLOOR GALLERY',
    canvas.width / 2,
    118
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createDevilFruitGachaMarqueeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#3b0764');
  grad.addColorStop(0.5, '#7e22ce');
  grad.addColorStop(1, '#3b0764');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
  };
  img.src = '/assets/devil_fruit_gacha_banner.png';

  return texture;
}

export function createBountyMysteryMarqueeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 353;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padX = 36;
    const padY = 24;
    ctx.drawImage(img, padX, padY, canvas.width - padX * 2, canvas.height - padY * 2);
    texture.needsUpdate = true;
  };
  img.src = '/boxes/gamestop_gamestopLogo.png';

  return texture;
}

export function createOnePieceStairSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, '#111827');
  grad.addColorStop(0.5, '#7f1d1d');
  grad.addColorStop(1, '#111827');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.fillStyle = '#fde047';
  ctx.font = '900 38px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('↑ TẦNG 2 · ONE PIECE TCG ↑', canvas.width / 2, 82);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('DEVIL FRUIT GACHA · YONKO SLABS · PIRATE ARENA', canvas.width / 2, 138);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createOnePiecePlaymatTexture(colorVariant: 'gold' | 'crimson' = 'crimson'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (colorVariant === 'crimson') {
    bgGrad.addColorStop(0, '#2a0808');
    bgGrad.addColorStop(0.5, '#450a0a');
    bgGrad.addColorStop(1, '#1a0505');
  } else {
    bgGrad.addColorStop(0, '#1c1917');
    bgGrad.addColorStop(0.5, '#422006');
    bgGrad.addColorStop(1, '#1c1917');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = colorVariant === 'crimson' ? '#ef4444' : '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  // Center Straw Hat / Compass Rose watermark
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 6, 46, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(centerX - 24, centerY - 12, 48, 8);
  ctx.restore();

  const drawSlot = (x: number, y: number, w: number, h: number, label: string) => {
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  };

  // Life Cards (5 on left)
  for (let r = 0; r < 5; r++) {
    drawSlot(20, 28 + r * 48, 36, 42, 'LIFE');
  }

  // Leader & Stage (Center)
  drawSlot(centerX - 58, 46, 48, 68, 'LEADER');
  drawSlot(centerX + 10, 46, 48, 68, 'STAGE');

  // Character Area (5 slots)
  const charStartX = centerX - (5 * 46) / 2;
  for (let b = 0; b < 5; b++) {
    drawSlot(charStartX + b * 46 + 4, 146, 38, 54, 'CHAR');
  }

  // DON!! Deck & Main Deck & Trash (Right)
  drawSlot(canvas.width - 72, 34, 48, 62, 'DECK');
  drawSlot(canvas.width - 72, 112, 48, 62, 'TRASH');
  drawSlot(canvas.width - 72, 190, 48, 62, 'DON!!');

  ctx.fillStyle = colorVariant === 'crimson' ? '#fca5a5' : '#fde047';
  ctx.font = '900 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ONE PIECE CARD GAME · GRAND LINE PLAYMAT', centerX, 268);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function createOnePieceCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#d97706';
  ctx.fillRect(14, 14, canvas.width - 28, canvas.height - 28);

  const radial = ctx.createRadialGradient(200, 280, 20, 200, 280, 230);
  radial.addColorStop(0, '#0284c7');
  radial.addColorStop(0.55, '#0f172a');
  radial.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = radial;
  ctx.fillRect(22, 22, canvas.width - 44, canvas.height - 44);

  // Nautical Compass Ring
  const cx = 200;
  const cy = 280;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 98, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 82, 0, Math.PI * 2);
  ctx.stroke();

  // Compass Needle Stars
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 88);
  ctx.lineTo(cx + 16, cy - 16);
  ctx.lineTo(cx + 88, cy);
  ctx.lineTo(cx + 16, cy + 16);
  ctx.lineTo(cx, cy + 88);
  ctx.lineTo(cx - 16, cy + 16);
  ctx.lineTo(cx - 88, cy);
  ctx.lineTo(cx - 16, cy - 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.font = '900 32px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ONE PIECE', cx, 88);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('CARD GAME', cx, 495);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// ==========================================
// 26. LUXURY CHECKOUT COUNTER TEXTURES & CUSTOMER-FACING DISPLAY (CFD)
// ==========================================

export function createCounterMarbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#141821');
  grad.addColorStop(0.5, '#1b212d');
  grad.addColorStop(1, '#11161e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle mineral speckles
  for (let i = 0; i < 900; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 19341.231) % 1;
    const px = Math.abs(x) * 512;
    const py = Math.abs(y) * 512;
    ctx.fillStyle = i % 5 === 0 ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(px, py, 2, 2);
  }

  // Calacatta dark-gold veins
  for (let v = 0; v < 9; v++) {
    ctx.beginPath();
    let vx = ((v * 67) % 512);
    let vy = ((v * 113) % 512);
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 14; s++) {
      vx += 34 + Math.sin(v * 2.1 + s * 0.9) * 16;
      vy += 22 + Math.cos(v * 1.7 + s * 1.1) * 18;
      ctx.lineTo(vx, vy);
    }
    ctx.strokeStyle = v % 3 === 0 ? 'rgba(234, 179, 8, 0.16)' : 'rgba(226, 232, 240, 0.09)';
    ctx.lineWidth = v % 3 === 0 ? 1.8 : 2.6;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCounterFrontSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 768, 256);
  bg.addColorStop(0, '#090d16');
  bg.addColorStop(0.5, '#111827');
  bg.addColorStop(1, '#090d16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 768, 256);

  // Double gold boutique border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 6;
  ctx.roundRect(10, 10, 748, 236, 16);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 728, 216);

  // Pokéball crest on left
  const cx = 104;
  const cy = 128;
  const r = 46;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - r, cy - 4, r * 2, 8);
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#facc15';
  ctx.fill();

  // Brand + Checkout Title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('★ POKÉCARD FLAGSHIP STORE ★', 176, 66);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('QUẦY THU NGÂN', 176, 122);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('CHECKOUT  •  QUÉT TỪNG MÓN  •  QR / NFC', 176, 178);

  // Corner accent dots
  ctx.fillStyle = '#facc15';
  [
    [34, 34],
    [734, 34],
    [34, 222],
    [734, 222],
  ].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createCheckoutMatTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle diagonal weave lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 2;
  for (let i = -256; i < 768; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.stroke();
  }

  // Gold stitched border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 240);

  // 4 dashed placement bays for items
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 2;
  for (let b = 0; b < 4; b++) {
    const bx = 24 + b * 118;
    ctx.strokeRect(bx, 64, 104, 134);
  }
  ctx.setLineDash([]);

  // Header & Footer labels
  ctx.fillStyle = '#fde047';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('KHU ĐẶT HÀNG • PLACE ITEMS HERE', 24, 38);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('QUÉT TỪNG MÓN →', 488, 230);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createBaggingPadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1917';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.fillStyle = '#34d399';
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ĐÃ QUÉT', 128, 44);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BAGGING ZONE', 128, 68);

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(28, 84, 200, 144);
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createNfcQrStandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 320);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 56);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TAP CARD / VIETQR', 128, 34);

  // Deterministic crisp QR code grid
  const qrSize = 152;
  const qrX = (256 - qrSize) / 2;
  const qrY = 74;
  const cells = 19;
  const cellW = qrSize / cells;

  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const inTL = r < 6 && c < 6;
      const inTR = r < 6 && c >= cells - 6;
      const inBL = r >= cells - 6 && c < 6;
      let on = false;
      if (inTL || inTR || inBL) {
        const lr = r < 6 ? r : r - (cells - 6);
        const lc = c < 6 ? c : c - (cells - 6);
        on = lr === 0 || lr === 5 || lc === 0 || lc === 5 || (lr >= 2 && lr <= 3 && lc >= 2 && lc <= 3);
      } else {
        on = ((r * 17 + c * 31 + r * c) % 5) < 2;
      }
      if (on) {
        ctx.fillRect(qrX + c * cellW, qrY + r * cellW, Math.ceil(cellW), Math.ceil(cellW));
      }
    }
  }

  // NFC Contactless badge bottom
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(24, 246, 208, 52, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px sans-serif';
  ctx.fillText('))) CHẠM THẺ / QUÉT MÃ', 128, 278);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createReceiptPaperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 512);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('POKECARD STORE', 128, 34);
  ctx.font = '12px monospace';
  ctx.fillText('========================', 128, 58);

  ctx.textAlign = 'left';
  const rows = [
    '1x Booster Pack   $5.50',
    '1x Collector Box $45.00',
    '1x PSA 10 Slab   $99.00',
    '1x Mystery Pack  $15.00',
    '1x Card Sleeve    $4.00',
    '------------------------',
    'SUBTOTAL        $168.50',
    'TAX (0%)          $0.00',
    'PAID VISA / QR  $168.50',
  ];
  rows.forEach((line, i) => {
    ctx.fillText(line, 14, 88 + i * 34);
  });

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('CAM ON QUY KHACH!', 128, 430);
  // Fake mini barcode at bottom of receipt
  for (let x = 36; x < 220; x += 5) {
    ctx.fillRect(x, 452, ((x * 7) % 3) + 1, 36);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface CustomerDisplayTextureManager {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  update: (
    customer?: any,
    scannedCounts?: Record<string, number>,
    isPaid?: boolean
  ) => void;
}

export function createCustomerDisplayTextureManager(): CustomerDisplayTextureManager {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const update = (
    customer?: any,
    scannedCounts: Record<string, number> = {},
    isPaid: boolean = false
  ) => {
    // Clean dark boutique frame
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Header Bar
    ctx.fillStyle = isPaid ? '#065f46' : '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 62);
    ctx.fillStyle = isPaid ? '#34d399' : '#facc15';
    ctx.fillRect(0, 60, canvas.width, 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('POKÉCARD BOUTIQUE', 20, 31);

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px sans-serif';
    if (isPaid) {
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('✓ ĐÃ THANH TOÁN THÀNH CÔNG!', canvas.width - 20, 31);
    } else if (customer) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`KHÁCH: ${(customer.name || 'VIP').toUpperCase()}`, canvas.width - 20, 31);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('● MỜI QUÝ KHÁCH ĐẶT HÀNG', canvas.width - 20, 31);
    }

    const basket = customer && Array.isArray(customer.basket) ? customer.basket : [];

    if (basket.length === 0) {
      // Standby Customer Welcome Screen
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(24, 86, canvas.width - 48, 306, 18);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = '900 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('XIN CHÀO QUÝ KHÁCH!', canvas.width / 2, 162);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Vui lòng đặt thẻ bài / pack lên thảm bên trái', canvas.width / 2, 222);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Chấp nhận Tiền Mặt  ·  Thẻ NFC  ·  VietQR', canvas.width / 2, 276);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('★ CAM KẾT CHÍNH HÃNG 100% ★', canvas.width / 2, 336);

      texture.needsUpdate = true;
      return;
    }

    // Left Panel: Live Scanned Items Feed
    const leftW = 374;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(16, 78, leftW, 326, 14);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HÓA ĐƠN CHI TIẾT (TỪNG MÓN)', 32, 102);

    let totalUnits = 0;
    let scannedUnits = 0;
    let scannedSubtotal = 0;
    let grandTotal = 0;

    basket.forEach((bItem: any, idx: number) => {
      const count = Math.max(1, bItem.count || 1);
      const id = bItem.item?.id || `row_${idx}`;
      const doneCount = isPaid ? count : Math.min(count, scannedCounts[id] || 0);
      totalUnits += count;
      scannedUnits += doneCount;
      scannedSubtotal += (bItem.unitPrice || 0) * doneCount;
      grandTotal += (bItem.unitPrice || 0) * count;

      if (idx < 5) {
        const ry = 122 + idx * 54;
        const fullyDone = doneCount >= count;
        ctx.fillStyle = fullyDone ? 'rgba(16, 185, 129, 0.16)' : doneCount > 0 ? 'rgba(245, 158, 11, 0.14)' : 'rgba(30, 41, 59, 0.6)';
        ctx.beginPath();
        ctx.roundRect(26, ry, leftW - 20, 46, 8);
        ctx.fill();

        ctx.fillStyle = fullyDone ? '#34d399' : doneCount > 0 ? '#fbbf24' : '#64748b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        const icon = fullyDone ? '✓' : doneCount > 0 ? '⚡' : '•';
        const name = (bItem.item?.name || 'Item').slice(0, 20);
        ctx.fillText(`${icon} ${name}`, 36, ry + 23);

        ctx.textAlign = 'right';
        ctx.fillStyle = fullyDone || doneCount > 0 ? '#ffffff' : '#94a3b8';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`${doneCount}/${count} · $${((bItem.unitPrice || 0) * count).toFixed(2)}`, leftW + 2, ry + 23);
      }
    });

    // Right Panel: Running Subtotal, Total & QR Code
    const rx = leftW + 28;
    const rw = canvas.width - rx - 16;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(rx, 78, rw, 326, 14);
    ctx.fill();
    ctx.strokeStyle = isPaid ? '#10b981' : '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`ĐÃ QUÉT ${scannedUnits}/${totalUnits} MÓN`, rx + rw / 2, 104);

    ctx.fillStyle = isPaid ? '#34d399' : '#fde047';
    ctx.font = '900 40px monospace';
    const shownAmount = isPaid ? grandTotal : scannedUnits > 0 ? scannedSubtotal : grandTotal;
    ctx.fillText(`$${shownAmount.toFixed(2)}`, rx + rw / 2, 150);

    // Mini QR box or Success Stamp
    if (isPaid) {
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(rx + 22, 190, rw - 44, 140, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.fillText('PAID ✓', rx + rw / 2, 245);
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('CẢM ƠN QUÝ KHÁCH!', rx + rw / 2, 286);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(rx + rw / 2 - 58, 184, 116, 116, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      const qx = rx + rw / 2 - 48;
      const qy = 194;
      for (let r = 0; r < 11; r++) {
        for (let c = 0; c < 11; c++) {
          if (((r * 13 + c * 29) % 4) < 2 || (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3)) {
            ctx.fillRect(qx + c * 8.7, qy + r * 8.7, 7.5, 7.5);
          }
        }
      }
      ctx.fillStyle = scannedUnits >= totalUnits ? '#34d399' : '#38bdf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(
        scannedUnits >= totalUnits ? 'MỜI CHẠM THẺ / QR' : 'ĐANG TÍNH TỪNG MÓN...',
        rx + rw / 2,
        336
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText(`Tổng đơn: $${grandTotal.toFixed(2)}`, rx + rw / 2, 368);
    }

    texture.needsUpdate = true;
  };

  update();
  return { texture, canvas, update };
}

// 32. FLAGSHIP POKÉMON TCG EXPANSION COLLECTION LIGHTBOX CANOPY (2560x160 = exact 16:1 aspect, zero stretching)
export function createExpansionCanopyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2560;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Deep obsidian boutique header gradient
  const bg = ctx.createLinearGradient(0, 0, canvas.width, 0);
  bg.addColorStop(0, '#070b14');
  bg.addColorStop(0.22, '#0f172a');
  bg.addColorStop(0.5, '#172033');
  bg.addColorStop(0.78, '#0f172a');
  bg.addColorStop(1, '#070b14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center warm champagne gold architectural glow
  const glow = ctx.createRadialGradient(canvas.width / 2, 80, 20, canvas.width / 2, 80, 760);
  glow.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
  glow.addColorStop(0.55, 'rgba(220, 38, 38, 0.09)');
  glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle diagonal luxury architectural louvre pattern on wings
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let x = 36; x < 440; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 12, 18);
    ctx.lineTo(x - 24, 142);
    ctx.lineTo(x - 36, 142);
    ctx.closePath();
    ctx.fill();
  }
  for (let x = canvas.width - 440; x < canvas.width - 36; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 12, 18);
    ctx.lineTo(x + 48, 142);
    ctx.lineTo(x + 36, 142);
    ctx.closePath();
    ctx.fill();
  }

  // Champagne-gold metallic horizontal framing lines
  const goldGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  goldGrad.addColorStop(0, '#78350f');
  goldGrad.addColorStop(0.25, '#facc15');
  goldGrad.addColorStop(0.5, '#fef08a');
  goldGrad.addColorStop(0.75, '#facc15');
  goldGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 0, canvas.width, 7);
  ctx.fillRect(0, canvas.height - 7, canvas.width, 7);

  // Thin crimson heritage pinstripe just inside the gold frame
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(28, 13, canvas.width - 56, 3);
  ctx.fillRect(28, canvas.height - 16, canvas.width - 56, 3);

  // Symmetrical Pokéball emblems on left & right wings
  const drawCrest = (cx: number, cy: number, r: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - r, cy - 3.5, r * 2, 7);

    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.restore();
  };

  drawCrest(195, 80, 42);
  drawCrest(canvas.width - 195, 80, 42);

  // Left & Right decorative hairline divider bars
  ctx.fillStyle = 'rgba(250, 204, 21, 0.38)';
  ctx.fillRect(275, 78, 185, 3);
  ctx.fillRect(canvas.width - 460, 78, 185, 3);

  // Crisp un-stretched headline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(250, 204, 21, 0.42)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px "Arial Black", "Montserrat", sans-serif';
  ctx.fillText('POKÉMON TCG  •  EXPANSION COLLECTION', canvas.width / 2, 62);
  ctx.shadowBlur = 0;

  // Crisp subtitle badge line
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 21px "Inter", sans-serif';
  ctx.fillText(
    'OFFICIAL BOOSTER PACKS  &  SEALED DISPLAY BOXES  •  FLAGSHIP GALLERY',
    canvas.width / 2,
    118
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// 33. BAY HEADER PLAQUE TEXTURE (512x64 = 8:1 aspect for sleek 1.28x0.16 bay label plaques)
export function createExpansionBayBadgeTexture(
  bayNum: string,
  title: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090e1a';
  ctx.fillRect(0, 0, 512, 64);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 506, 58);

  // Left gold/accent pill badge (strictly architectural label, not UI)
  ctx.fillStyle = accentHex;
  ctx.fillRect(10, 10, 104, 44);
  ctx.fillStyle = '#090e1a';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bayNum, 62, 33);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 23px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 130, 33);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}







