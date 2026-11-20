import * as THREE from 'three';
import { attachGlbHumanToNpc, steerYawSmooth, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';

export interface SevenElevenCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface SevenElevenBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
}

function createSevenElevenEmblemTexture(size: number = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  // White square sign base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Subtle metallic frame
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = size * 0.03;
  ctx.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);

  // Iconic tri-stripe background bands top & bottom
  ctx.fillStyle = '#f97316'; // Orange
  ctx.fillRect(size * 0.06, size * 0.07, size * 0.88, size * 0.09);
  ctx.fillStyle = '#008062'; // Deep Teal-Green
  ctx.fillRect(size * 0.06, size * 0.84, size * 0.88, size * 0.09);

  // Iconic giant orange "7"
  ctx.save();
  ctx.fillStyle = '#f97316';
  ctx.font = `900 ${Math.round(size * 0.72)}px "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('7', size * 0.49, size * 0.54);
  ctx.restore();

  // Horizontal "ELEVEN" banner in 7-Eleven forest green with white backing strip
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(size * 0.10, size * 0.43, size * 0.80, size * 0.19);

  ctx.fillStyle = '#008062';
  ctx.font = `900 ${Math.round(size * 0.175)}px "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ELEVEN', size * 0.50, size * 0.525);

  // Red "n" accent badge bottom-right corner like classic logo
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(size * 0.68, size * 0.68, size * 0.22, size * 0.11, size * 0.02);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(size * 0.07)}px system-ui, sans-serif`;
  ctx.fillText('24H', size * 0.79, size * 0.735);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSevenElevenFasciaTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Crisp bright white fascia backing
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Signature 3 horizontal 7-Eleven color stripes across entire 19m storefront
  ctx.fillStyle = '#f97316'; // Orange band
  ctx.fillRect(0, 0, w, 58);

  ctx.fillStyle = '#008062'; // Forest green band
  ctx.fillRect(0, 66, w, 52);

  ctx.fillStyle = '#dc2626'; // Crimson red band
  ctx.fillRect(0, h - 42, w, 42);

  // Left & Right 7-Eleven emblem badges
  const drawBadge = (bx: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#008062';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(bx - 78, 128, 156, 138, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    ctx.font = '900 108px "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7', bx, 200);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - 66, 182, 132, 34);
    ctx.fillStyle = '#008062';
    ctx.font = '900 28px "Arial Black", system-ui, sans-serif';
    ctx.fillText('ELEVEN', bx, 200);
  };
  drawBadge(155);
  drawBadge(w - 155);

  // Main Center Wordmark
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 102px "Arial Black", system-ui, sans-serif';
  ctx.fillText('7-ELEVEN', w / 2 - 110, 195);

  // "OPEN 24 HOURS" green pill badge next to wordmark
  ctx.fillStyle = '#008062';
  ctx.beginPath();
  ctx.roundRect(w / 2 + 215, 148, 310, 86, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText('OPEN 24H', w / 2 + 370, 192);

  // Top green stripe tagline
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText('SLURPEE®  •  FRESH BENTO & ONIGIRI  •  HOT SNACKS  •  7CAFÉ  •  ATM 24/7', w / 2, 93);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWindowPromoPosterTexture(title: string, price: string, bgHex: string, accentHex: string): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, w, 64);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('7-ELEVEN SPECIAL', w / 2, 34);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px system-ui, sans-serif';
  const lines = title.split('\n');
  lines.forEach((line, idx) => {
    ctx.fillText(line, w / 2, 148 + idx * 46);
  });

  ctx.fillStyle = '#fde047';
  ctx.font = '900 66px system-ui, sans-serif';
  ctx.fillText(price, w / 2, 305);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAisleSignTexture(label: string, stripeHex: string): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = stripeHex;
  ctx.fillRect(0, 0, w, 24);
  ctx.fillRect(0, h - 18, w, 18);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSevenElevenStructure(): SevenElevenBuildResult {
  // Building L2 occupies X = -50 to -31 (center X = -40.5, width = 19.0m), Z = 2.0 to 15.6 (center Z = 8.8, depth = 13.6m)
  const martGroup = new THREE.Group();
  martGroup.position.set(-40.5, 0, 8.8);

  const neonMats: THREE.MeshStandardMaterial[] = [];

  // Shared Architectural & Retail Materials
  const whiteFacadeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.58 });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.36,
    roughness: 0.55,
  });
  const tileFloorMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xcbd5e1,
    emissiveIntensity: 0.28,
    roughness: 0.36,
  });
  const tileAccentStripMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45 });
  const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.48, metalness: 0.35 });
  const sevenGreenMat = new THREE.MeshStandardMaterial({ color: 0x008062, roughness: 0.36 });
  const sevenOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.36 });
  const sevenRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.36 });
  const shelfWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.24,
    roughness: 0.45,
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.82, roughness: 0.24 });
  const woodCounterMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.52 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45 });
  const yellowTagMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });

  const glassClearMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.05,
    metalness: 0.16,
    transparent: true,
    opacity: 0.14,
  });

  const brightCeilingLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });
  neonMats.push(brightCeilingLedMat);

  const fridgeCyanLedMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  neonMats.push(fridgeCyanLedMat);

  const warmerAmberMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.0,
    roughness: 0.25,
  });
  neonMats.push(warmerAmberMat);

  // Crisp Retail Interior PointLight illuminating all 3 aisles, shoppers, checkout & coolers
  const martPointLight = new THREE.PointLight(0xf8fafc, 12.0, 30.0, 1.0);
  martPointLight.position.set(-40.5, 3.65, 9.2);
  const interiorPointLights = [{ light: martPointLight, dayInt: 10.0, nightInt: 44.0 }];

  // 1. Deep Walk-In Architectural Shell (19m wide X = -9.5..+9.5, 13.6m deep Z = -6.8..+6.8)
  // Bright terrazzo tiled floor
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.08, 13.4), tileFloorMat);
  floorSlab.position.set(0, 0.04, 0);
  martGroup.add(floorSlab);

  // Subtle floor aisle guide stripes for spatial depth
  [-3.0, 0.2, 3.8].forEach((fx) => {
    const aisleStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 10.6), tileAccentStripMat);
    aisleStripe.position.set(fx, 0.085, 0.6);
    martGroup.add(aisleStripe);
  });

  // Back structural wall way at rear (local Z = -6.0 -> world Z = 2.8) + bright interior wall liner
  const backWallMass = new THREE.Mesh(new THREE.BoxGeometry(19.0, 9.6, 1.5), whiteFacadeMat);
  backWallMass.position.set(0, 4.8, -6.05);
  martGroup.add(backWallMass);

  const backInteriorLiner = new THREE.Mesh(new THREE.BoxGeometry(18.5, 4.2, 0.10), interiorWallMat);
  backInteriorLiner.position.set(0, 2.15, -5.26);
  martGroup.add(backInteriorLiner);

  // Side walls (West local X = -9.35, East local X = +9.35) brightly lit inside
  [-9.35, 9.35].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.30, 4.35, 12.2), interiorWallMat);
    sideWall.position.set(wx, 2.18, 0.65);
    martGroup.add(sideWall);
  });

  // Interior White Retail Ceiling & Front-to-Back LED Light Battens (creates huge visual depth!)
  const interiorCeiling = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.14, 12.2), interiorWallMat);
  interiorCeiling.position.set(0, 4.28, 0.65);
  martGroup.add(interiorCeiling);

  [-6.2, -3.0, 0.2, 3.4, 6.6].forEach((lx) => {
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 10.8), brightCeilingLedMat);
    ledStrip.position.set(lx, 4.19, 0.65);
    martGroup.add(ledStrip);
  });

  // Upper 2nd Story Facade (Y = 4.35 .. 9.6)
  const upperMass = new THREE.Mesh(new THREE.BoxGeometry(19.0, 5.25, 12.4), whiteFacadeMat);
  upperMass.position.set(0, 6.98, 0.60);
  martGroup.add(upperMass);

  const roofParapet = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.28, 12.6), charcoalMat);
  roofParapet.position.set(0, 9.62, 0.60);
  martGroup.add(roofParapet);

  // Upper architectural decorative mullions / louver accents flanking central cube logo
  [-7.2, -5.8, 5.8, 7.2].forEach((lx) => {
    const winPanel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.12), charcoalMat);
    winPanel.position.set(lx, 7.6, 6.82);
    martGroup.add(winPanel);
  });

  // 2. Iconic 7-Eleven Fascia Signage, Glowing Tri-Stripes & Blade Totem
  const fasciaTex = createSevenElevenFasciaTexture();
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTex,
    emissive: 0xffffff,
    emissiveMap: fasciaTex,
    emissiveIntensity: 0.48,
    roughness: 0.22,
  });
  neonMats.push(fasciaMat);

  const fasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(18.96, 2.05), fasciaMat);
  fasciaSign.position.set(0, 5.15, 6.84);
  martGroup.add(fasciaSign);

  // 3D Architectural Tri-Stripe Canopy Fascia (protruding over the sidewalk Z = +6.8..+8.55)
  const canopyBase = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.24, 1.75), whiteFacadeMat);
  canopyBase.position.set(0, 4.02, 7.68);
  martGroup.add(canopyBase);

  const canopyOrange = new THREE.Mesh(new THREE.BoxGeometry(19.06, 0.14, 1.78), sevenOrangeMat);
  canopyOrange.position.set(0, 4.21, 7.68);
  martGroup.add(canopyOrange);

  const canopyGreen = new THREE.Mesh(new THREE.BoxGeometry(19.06, 0.11, 1.78), sevenGreenMat);
  canopyGreen.position.set(0, 4.08, 7.68);
  martGroup.add(canopyGreen);

  const canopyRed = new THREE.Mesh(new THREE.BoxGeometry(19.06, 0.08, 1.78), sevenRedMat);
  canopyRed.position.set(0, 3.96, 7.68);
  martGroup.add(canopyRed);

  // Under-canopy bright LED strip illuminating entrance sidewalk
  const canopyLed = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.04, 0.22), brightCeilingLedMat);
  canopyLed.position.set(0, 3.89, 7.65);
  martGroup.add(canopyLed);

  // Center Illuminated Square 7-ELEVEN Cube Sign above fascia (Y = 7.45)
  const emblemTex = createSevenElevenEmblemTexture(512);
  const emblemMat = new THREE.MeshStandardMaterial({
    map: emblemTex,
    emissive: 0xffffff,
    emissiveMap: emblemTex,
    emissiveIntensity: 0.52,
    roughness: 0.22,
  });
  neonMats.push(emblemMat);

  const upperLogoFrame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.55, 0.24), charcoalMat);
  upperLogoFrame.position.set(0, 7.65, 6.86);
  martGroup.add(upperLogoFrame);
  const upperLogoFace = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 2.36), emblemMat);
  upperLogoFace.position.set(0, 7.65, 6.99);
  martGroup.add(upperLogoFace);

  // Double-sided projecting 7-Eleven blade sign on East corner (world X = -31.5) visible down street
  const bladeArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.95), charcoalMat);
  bladeArm.position.set(9.1, 5.2, 7.28);
  martGroup.add(bladeArm);
  const bladeBox = new THREE.Mesh(new THREE.BoxGeometry(0.20, 1.55, 1.55), charcoalMat);
  bladeBox.position.set(9.1, 5.2, 8.02);
  martGroup.add(bladeBox);
  [-1, 1].forEach((side) => {
    const bladeFace = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.42), emblemMat);
    bladeFace.position.set(9.1 + side * 0.105, 5.2, 8.02);
    bladeFace.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    martGroup.add(bladeFace);
  });

  // 3. Panoramic Clear Glass Storefront & Open Automatic Sliding Doors (local X = -3.0, width 2.4m -> world X = -43.5)
  // Door header transom glass
  const doorHeaderGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.05, 0.08), glassClearMat);
  doorHeaderGlass.position.set(-3.0, 3.40, 6.75);
  martGroup.add(doorHeaderGlass);

  // Automatic sliding door motion sensor housing & retracted glass panels flanking -4.2 and -1.8
  const doorHeaderBar = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 0.18), charcoalMat);
  doorHeaderBar.position.set(-3.0, 2.86, 6.75);
  martGroup.add(doorHeaderBar);

  [-4.45, -1.55].forEach((dx) => {
    const retractedLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.75, 0.05), glassClearMat);
    retractedLeaf.position.set(dx, 1.40, 6.66);
    martGroup.add(retractedLeaf);
    const doorMullion = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.85, 0.14), charcoalMat);
    doorMullion.position.set(dx + (dx < -3 ? 0.25 : -0.25), 1.94, 6.75);
    martGroup.add(doorMullion);
  });

  // Emerald & orange 7-Eleven welcome mat at threshold
  const welcomeMat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 1.25), sevenGreenMat);
  welcomeMat.position.set(-3.0, 0.085, 6.55);
  martGroup.add(welcomeMat);

  // West & East clear panoramic glass sections
  const westGlass = new THREE.Mesh(new THREE.BoxGeometry(4.9, 3.70, 0.06), glassClearMat);
  westGlass.position.set(-6.7, 2.02, 6.75);
  martGroup.add(westGlass);

  const eastGlass = new THREE.Mesh(new THREE.BoxGeometry(10.8, 3.70, 0.06), glassClearMat);
  eastGlass.position.set(3.65, 2.02, 6.75);
  martGroup.add(eastGlass);

  // Low charcoal sill kickplates & vertical mullions (leaving upper 3.6m crystal clear!)
  const westKick = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.22, 0.14), charcoalMat);
  westKick.position.set(-6.7, 0.11, 6.75);
  martGroup.add(westKick);
  const eastKick = new THREE.Mesh(new THREE.BoxGeometry(10.9, 0.22, 0.14), charcoalMat);
  eastKick.position.set(3.65, 0.11, 6.75);
  martGroup.add(eastKick);

  [-9.15, -6.7, -1.75, 1.2, 4.2, 7.1, 9.15].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.85, 0.14), charcoalMat);
    mullion.position.set(mx, 1.94, 6.75);
    martGroup.add(mullion);
  });

  // Promotional 7-Eleven Window Posters on East window piers
  const posterSpecs = [
    { x: 2.7, title: 'SLURPEE\nICE COLD', price: '$1.99', bg: '#008062', acc: '#f97316' },
    { x: 5.65, title: 'BENTO &\nONIGIRI', price: '$3.50', bg: '#dc2626', acc: '#008062' },
  ];
  posterSpecs.forEach((ps) => {
    const pTex = createWindowPromoPosterTexture(ps.title, ps.price, ps.bg, ps.acc);
    const pMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.35 });
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.28), pMat);
    poster.position.set(ps.x, 1.45, 6.80);
    martGroup.add(poster);
  });

  // 4. Deep Interior: Back-Wall Illuminated Drink Coolers (local Z = -4.95, spanning X = -7.8 .. +4.8)
  const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(13.2, 2.95, 0.85), charcoalMat);
  coolerBody.position.set(-1.5, 1.52, -4.95);
  martGroup.add(coolerBody);

  const coolerHeader = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.34, 0.88), sevenGreenMat);
  coolerHeader.position.set(-1.5, 3.16, -4.95);
  martGroup.add(coolerHeader);

  const drinkPalette = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xa855f7, 0xec4899, 0x06b6d4];
  const drinkMats = drinkPalette.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.18 }));

  // 7 Glass-Door Refrigerated Bays along the back wall
  for (let bay = 0; bay < 7; bay++) {
    const bx = -7.1 + bay * 1.85;
    const glowingInterior = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 2.55), fridgeCyanLedMat);
    glowingInterior.position.set(bx, 1.52, -4.51);
    martGroup.add(glowingInterior);

    // 4 Fridge wire shelves & stocked drink bottles/cans
    for (let sy = 0; sy < 4; sy++) {
      const shelfY = 0.60 + sy * 0.58;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.03, 0.25), steelMat);
      shelf.position.set(bx, shelfY, -4.46);
      martGroup.add(shelf);

      for (let c = 0; c < 6; c++) {
        const canMat = drinkMats[(bay + sy + c) % drinkMats.length];
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.055, 0.22, 8), canMat);
        bottle.position.set(bx - 0.62 + c * 0.245, shelfY + 0.13, -4.44);
        martGroup.add(bottle);
      }
    }

    // Fridge glass door frame mullions
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.65, 0.08), steelMat);
    frameL.position.set(bx - 0.84, 1.52, -4.42);
    martGroup.add(frameL);
  }

  // 5. Three Full-Depth Convenience Store Gondola Aisles (local X = -4.6, -1.4, +1.8, running Z = -2.8 .. +2.8)
  const aisleHeaders = [
    { x: -4.6, label: 'SNACKS & CHIPS', col: '#f97316' },
    { x: -1.4, label: 'RAMEN & NOODLES', col: '#008062' },
    { x: 1.8, label: 'DRINKS & SWEETS', col: '#dc2626' },
  ];
  const itemColors = [0xf59e0b, 0xef4444, 0x3b82f6, 0x22c55e, 0xa855f7, 0xfbbf24, 0xf43f5e, 0x14b8a6];
  const itemMats = itemColors.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }));

  aisleHeaders.forEach((aisle, aIdx) => {
    // Central spine & base plinth
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.92, 5.5), shelfWhiteMat);
    spine.position.set(aisle.x, 1.00, 0.0);
    martGroup.add(spine);

    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.18, 5.55), charcoalMat);
    basePlinth.position.set(aisle.x, 0.13, 0.0);
    martGroup.add(basePlinth);

    // 4 Shelf Tiers on both sides + colorful convenience products
    for (let t = 0; t < 4; t++) {
      const ty = 0.48 + t * 0.42;
      const shelfBoard = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.04, 5.45), shelfWhiteMat);
      shelfBoard.position.set(aisle.x, ty, 0.0);
      martGroup.add(shelfBoard);

      // Yellow price trim strips
      [-0.405, 0.405].forEach((sideOff) => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 5.45), yellowTagMat);
        trim.position.set(aisle.x + sideOff, ty, 0.0);
        martGroup.add(trim);
      });

      // Populate products along Z
      for (let pz = -2.35; pz <= 2.35; pz += 0.58) {
        const pMatA = itemMats[(aIdx * 3 + t + Math.round((pz + 3) * 2)) % itemMats.length];
        const pMatB = itemMats[(aIdx * 5 + t + 2 + Math.round((pz + 3) * 2)) % itemMats.length];

        const boxL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.36), pMatA);
        boxL.position.set(aisle.x - 0.23, ty + 0.14, pz);
        martGroup.add(boxL);

        const boxR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.36), pMatB);
        boxR.position.set(aisle.x + 0.23, ty + 0.14, pz);
        martGroup.add(boxR);
      }
    }

    // Hanging overhead Aisle Signboard for extra supermarket depth
    const signTex = createAisleSignTexture(aisle.label, aisle.col);
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 });
    const hangSign = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 1.55), signMat);
    hangSign.position.set(aisle.x, 3.05, 1.6);
    martGroup.add(hangSign);
  });

  // 6. East Side 7-Eleven Checkout Counter, Slurpee Station, Hot Steamed Bun Warmer & Coffee Bar (local X = +5.6 .. +8.4)
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.96, 5.2), shelfWhiteMat);
  counterBase.position.set(6.2, 0.52, -0.2);
  martGroup.add(counterBase);

  const counterGreenStripe = new THREE.Mesh(new THREE.BoxGeometry(0.91, 0.16, 5.22), sevenGreenMat);
  counterGreenStripe.position.set(6.2, 0.78, -0.2);
  martGroup.add(counterGreenStripe);

  const counterOrangeStripe = new THREE.Mesh(new THREE.BoxGeometry(0.91, 0.12, 5.22), sevenOrangeMat);
  counterOrangeStripe.position.set(6.2, 0.92, -0.2);
  martGroup.add(counterOrangeStripe);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.06, 5.35), charcoalMat);
  counterTop.position.set(6.2, 1.03, -0.2);
  martGroup.add(counterTop);

  // Dual POS Registers on Checkout Counter
  [-1.2, 0.7].forEach((rz) => {
    const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.44), charcoalMat);
    posScreen.position.set(6.15, 1.28, rz);
    martGroup.add(posScreen);
    const posGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), fridgeCyanLedMat);
    posGlow.position.set(6.10, 1.28, rz);
    posGlow.rotation.y = -Math.PI / 2;
    martGroup.add(posGlow);
  });

  // Iconic Warm Glowing Steamed Bun (Bánh Bao) & Oden Warmer Case on Front of Counter (local Z = +1.85)
  const warmerBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.72), steelMat);
  warmerBase.position.set(6.18, 1.15, 1.85);
  martGroup.add(warmerBase);
  const warmerCase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.66), warmerAmberMat);
  warmerCase.position.set(6.18, 1.50, 1.85);
  martGroup.add(warmerCase);

  // Back-Counter Slurpee Twin Machine & 7Café Brewer (against East Wall local X = +8.8)
  const backCounter = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.96, 6.2), charcoalMat);
  backCounter.position.set(8.8, 0.52, -0.2);
  martGroup.add(backCounter);

  // Twin Slurpee Machine (Red Cherry & Blue Raspberry domes)
  const slurpeeBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 1.05), steelMat);
  slurpeeBody.position.set(8.75, 1.38, 1.35);
  martGroup.add(slurpeeBody);
  const slurpeeRedDome = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.34, 12), sevenRedMat);
  slurpeeRedDome.position.set(8.70, 1.88, 1.10);
  martGroup.add(slurpeeRedDome);
  const slurpeeBlueDome = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.34, 12), blueMat);
  slurpeeBlueDome.position.set(8.70, 1.88, 1.60);
  martGroup.add(slurpeeBlueDome);

  // Self-Serve 7Café Espresso Brewer
  const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.80), charcoalMat);
  coffeeMachine.position.set(8.75, 1.36, -0.45);
  martGroup.add(coffeeMachine);

  // 7. West Side 7-Bank ATM Kiosk & Front Window Eat-In Counter (local X = -8.6 .. -5.5)
  const atmKiosk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.05, 0.95), charcoalMat);
  atmKiosk.position.set(-8.75, 1.06, 2.8);
  martGroup.add(atmKiosk);
  const atmHeader = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.35, 0.98), sevenGreenMat);
  atmHeader.position.set(-8.75, 2.15, 2.8);
  martGroup.add(atmHeader);
  const atmScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), fridgeCyanLedMat);
  atmScreen.position.set(-8.31, 1.32, 2.8);
  atmScreen.rotation.y = Math.PI / 2;
  martGroup.add(atmScreen);

  // Indoor Window Eat-In Counter + 3 Barstools (local X = -8.5 .. -5.2, Z = 6.15 -> world X = -49.0 .. -45.7, Z = 14.95)
  const eatCounter = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.07, 0.56), woodCounterMat);
  eatCounter.position.set(-6.9, 1.00, 6.18);
  martGroup.add(eatCounter);
  [-8.2, -5.6].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.96, 0.44), charcoalMat);
    leg.position.set(lx, 0.50, 6.18);
    martGroup.add(leg);
  });

  // Cup noodles & Slurpee cup sitting on window eat-in counter
  const ramenBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.14, 12), sevenRedMat);
  ramenBowl.position.set(-6.5, 1.11, 6.14);
  martGroup.add(ramenBowl);
  const slurpeeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.17, 10), sevenOrangeMat);
  slurpeeCup.position.set(-6.2, 1.12, 6.16);
  martGroup.add(slurpeeCup);

  // 3 Window Barstools (world X = -48.3, -47.0, -45.8, world Z = 14.22 -> local Z = 5.42)
  [-7.8, -6.5, -5.3].forEach((sx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.66, 8), charcoalMat);
    post.position.set(sx, 0.35, 5.42);
    martGroup.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.04, 10), charcoalMat);
    base.position.set(sx, 0.06, 5.42);
    martGroup.add(base);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.06, 12), sevenGreenMat);
    seat.position.set(sx, 0.70, 5.42);
    martGroup.add(seat);
  });

  return {
    staticGroup: martGroup,
    neonMats,
    interiorPointLights,
  };
}

interface MartNpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  basket?: THREE.Group;
  shoppingBag?: THREE.Group;
}

interface MartStaffActor extends MartNpcRig {
  role: 'cashier' | 'restocker';
  baseX: number;
  baseZ: number;
  rangeZ: number;
  dir: 1 | -1;
  speed: number;
  walkPhase: number;
  pauseTimer: number;
  glbHandle?: GlbHumanHandle;
}

interface MartStaticPatronActor extends MartNpcRig {
  mode: 'eat_in' | 'atm';
  phaseOffset: number;
  glbHandle?: GlbHumanHandle;
}

interface MartShopperActor extends MartNpcRig {
  state:
    | 'walking_sidewalk'
    | 'entering_door'
    | 'to_aisle'
    | 'browsing_aisle'
    | 'to_fridge'
    | 'browsing_fridge'
    | 'to_checkout'
    | 'paying'
    | 'exiting_door'
    | 'leaving_sidewalk';
  x: number;
  z: number;
  laneZ: number;
  outDir: 1 | -1;
  speed: number;
  walkPhase: number;
  timer: number;
  aisleTargetX: number;
  aisleTargetZ: number;
  fridgeTargetX: number;
  checkoutSlotZ: number;
  glbHandle?: GlbHumanHandle;
}

export class SevenElevenNpcController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private staff: MartStaffActor[] = [];
  private staticPatrons: MartStaticPatronActor[] = [];
  private shoppers: MartShopperActor[] = [];

  constructor(helpers: SevenElevenCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    this.buildStaff(helpers);
    this.buildStaticPatrons(helpers);
    this.buildShoppers(helpers);
  }

  private buildNpcRig(
    paletteIndex: number,
    helpers: SevenElevenCharacterHelpers,
    opts: { isClerk?: boolean; withBasket?: boolean; withBag?: boolean }
  ): MartNpcRig {
    const skinPalette = [
      { color: 0xffdbac, hex: '#ffdbac' },
      { color: 0xf1c27d, hex: '#f1c27d' },
      { color: 0xe0ac69, hex: '#e0ac69' },
      { color: 0xc68642, hex: '#c68642' },
      { color: 0xffe0bd, hex: '#ffe0bd' },
    ];
    const hairPalette = [0x111111, 0x2b1d0c, 0x6b3e1a, 0xd4a359, 0x1e293b];
    const shirtPalette = [0x2563eb, 0xe11d48, 0x7c3aed, 0xf8fafc, 0x0d9488, 0xf59e0b, 0x334155];
    const pantsPalette = [0x1e293b, 0x0f172a, 0x334155, 0x27272a];

    const skin = skinPalette[paletteIndex % skinPalette.length];
    const hair = hairPalette[(paletteIndex + 1) % hairPalette.length];
    const shirt = opts.isClerk ? 0xf8fafc : shirtPalette[paletteIndex % shirtPalette.length];
    const pants = opts.isClerk ? 0x0f172a : pantsPalette[(paletteIndex + 2) % pantsPalette.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.color, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.72 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: opts.isClerk ? 0x18181b : 0xf8fafc, roughness: 0.42 });
    const sevenGreenMat = new THREE.MeshStandardMaterial({ color: 0x008062, roughness: 0.5 });
    const sevenOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const sevenRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });

    const group = new THREE.Group();
    const hipsGroup = new THREE.Group();
    hipsGroup.position.set(0, 0.84, 0);
    group.add(hipsGroup);

    const buildLeg = (lx: number) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.02, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), pantsMat);
      thigh.position.set(0, -0.19, 0);
      leg.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.38, 0);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), pantsMat);
      shin.position.set(0, -0.19, 0);
      knee.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), shoesMat);
      shoe.position.set(0, -0.40, 0.04);
      knee.add(shoe);

      leg.add(knee);
      hipsGroup.add(leg);
      return { leg, knee };
    };

    const left = buildLeg(-0.10);
    const right = buildLeg(0.10);

    const torsoGroup = new THREE.Group();
    hipsGroup.add(torsoGroup);

    const hipsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), pantsMat);
    hipsMesh.position.set(0, 0.08, 0);
    torsoGroup.add(hipsMesh);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.40, 0.22), shirtMat);
    chest.position.set(0, 0.36, 0);
    torsoGroup.add(chest);

    if (opts.isClerk) {
      // Iconic 7-Eleven clerk vest / striped uniform
      const vestGreen = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.34, 0.235), sevenGreenMat);
      vestGreen.position.set(0, 0.34, 0);
      torsoGroup.add(vestGreen);
      const stripeOrange = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.06, 0.242), sevenOrangeMat);
      stripeOrange.position.set(0, 0.44, 0);
      torsoGroup.add(stripeOrange);
      const stripeRed = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.04, 0.242), sevenRedMat);
      stripeRed.position.set(0, 0.38, 0);
      torsoGroup.add(stripeRed);
    }

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.08, 10), skinMat);
    neck.position.set(0, 0.60, 0);
    torsoGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.74, 0);
    torsoGroup.add(headGroup);

    const faceTex = helpers.createFaceTexture('happy', skin.hex);
    headGroup.add(helpers.createHeadMesh(skinMat, faceTex, 0.22, 0.24, 0.21));

    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.235), hairMat);
    hairTop.position.set(0, 0.12, -0.004);
    headGroup.add(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.045), hairMat);
    hairBack.position.set(0, 0.025, -0.104);
    headGroup.add(hairBack);

    if (opts.isClerk) {
      const capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.245), sevenGreenMat);
      capCrown.position.set(0, 0.15, 0);
      headGroup.add(capCrown);
      const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.025, 0.12), sevenOrangeMat);
      capBrim.position.set(0, 0.11, 0.15);
      headGroup.add(capBrim);
    }

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.25, 0.52, 0);
    const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), shirtMat);
    lSleeve.position.set(0, -0.11, 0);
    leftArm.add(lSleeve);
    const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.10), skinMat);
    lForearm.position.set(0, -0.32, 0);
    leftArm.add(lForearm);

    let shoppingBag: THREE.Group | undefined;
    if (opts.withBag) {
      shoppingBag = new THREE.Group();
      shoppingBag.position.set(0, -0.48, 0.02);
      const bagBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.28, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
      );
      shoppingBag.add(bagBody);
      const bagStripe = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.06, 0.145), sevenGreenMat);
      bagStripe.position.y = 0.03;
      shoppingBag.add(bagStripe);
      const bagStripeTop = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.04, 0.145), sevenOrangeMat);
      bagStripeTop.position.y = 0.08;
      shoppingBag.add(bagStripeTop);
      shoppingBag.visible = false;
      leftArm.add(shoppingBag);
    }
    torsoGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.25, 0.52, 0);
    const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), shirtMat);
    rSleeve.position.set(0, -0.11, 0);
    rightArm.add(rSleeve);
    const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.10), skinMat);
    rForearm.position.set(0, -0.32, 0);
    rightArm.add(rForearm);

    let basket: THREE.Group | undefined;
    if (opts.withBasket) {
      basket = new THREE.Group();
      basket.position.set(0, -0.46, 0.06);
      const bBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.30), sevenGreenMat);
      basket.add(bBody);
      const bRim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.32), sevenOrangeMat);
      bRim.position.y = 0.08;
      basket.add(bRim);
      basket.visible = false;
      rightArm.add(basket);
    }
    torsoGroup.add(rightArm);

    return {
      group,
      hipsGroup,
      leftLeg: left.leg,
      rightLeg: right.leg,
      leftKnee: left.knee,
      rightKnee: right.knee,
      leftArm,
      rightArm,
      headGroup,
      basket,
      shoppingBag,
    };
  }

  private setSeatedPose(actor: MartNpcRig, seatHeight: number = 0.70) {
    actor.hipsGroup.position.y = seatHeight;
    actor.leftLeg.rotation.x = -Math.PI / 2;
    actor.rightLeg.rotation.x = -Math.PI / 2;
    actor.leftKnee.rotation.x = Math.PI / 2;
    actor.rightKnee.rotation.x = Math.PI / 2;
  }

  private buildStaff(helpers: SevenElevenCharacterHelpers) {
    // 1. Cashier behind checkout desk (world X = -33.35, Z = 8.4 .. 9.8, facing -X toward customers)
    // 2. Floor Restocker walking along back cooler corridor (world X = -40.3, Z = 8.8, patrolling Z = 5.4..11.2)
    const specs: Array<{ x: number; z: number; rangeZ: number; speed: number; role: 'cashier' | 'restocker'; idx: number }> = [
      { x: -33.35, z: 8.8, rangeZ: 1.0, speed: 0.75, role: 'cashier', idx: 1 },
      { x: -40.3, z: 8.8, rangeZ: 2.6, speed: 0.95, role: 'restocker', idx: 4 },
    ];
    this.staff = specs.map((sp) => {
      const rig = this.buildNpcRig(sp.idx, helpers, { isClerk: true });
      rig.group.position.set(sp.x, 0.08, sp.z);
      rig.group.rotation.y = sp.role === 'cashier' ? -Math.PI / 2 : 0;
      const spec = sp.role === 'cashier' ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(21 + sp.idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: sp.role === 'cashier' ? 'Checkout' : 'Idle',
        phaseOffset: sp.idx * 0.41,
      });
      this.rootGroup.add(rig.group);
      return {
        ...rig,
        role: sp.role,
        baseX: sp.x,
        baseZ: sp.z,
        rangeZ: sp.rangeZ,
        dir: 1,
        speed: sp.speed,
        walkPhase: sp.idx,
        pauseTimer: 2.0,
        glbHandle,
      };
    });
  }

  private buildStaticPatrons(helpers: SevenElevenCharacterHelpers) {
    // 1. Window counter ramen eater (world X = -47.0, Z = 14.22, facing +Z street)
    // 2. ATM customer withdrawing cash (world X = -48.2, Z = 11.6, facing -X ATM)
    const eatIn = this.buildNpcRig(2, helpers, {});
    eatIn.group.position.set(-47.0, 0.08, 14.22);
    eatIn.group.rotation.y = 0;
    this.setSeatedPose(eatIn, 0.70);
    const eatInGlbHost = new THREE.Group();
    eatInGlbHost.position.y = 0.20;
    eatIn.group.add(eatInGlbHost);
    const eatInSpec = pickSeatedCivilianModel(33);
    const eatInGlb = attachGlbHumanToNpc({
      modelSource: eatInSpec.modelSource,
      hostGroup: eatInGlbHost,
      fallbackMeshes: [eatIn.hipsGroup],
      targetHeight: eatInSpec.targetHeight,
      clipProfile: eatInSpec.clipProfile,
      rotationY: eatInSpec.rotationY,
      initialState: 'Sit',
      phaseOffset: 0.4,
    });
    this.rootGroup.add(eatIn.group);

    const atmUser = this.buildNpcRig(5, helpers, {});
    atmUser.group.position.set(-48.1, 0.08, 11.6);
    atmUser.group.rotation.y = -Math.PI / 2;
    const atmSpec = pickStationaryCivilianModel(37);
    const atmGlb = attachGlbHumanToNpc({
      modelSource: atmSpec.modelSource,
      hostGroup: atmUser.group,
      fallbackMeshes: [atmUser.hipsGroup],
      targetHeight: atmSpec.targetHeight,
      clipProfile: atmSpec.clipProfile,
      rotationY: atmSpec.rotationY,
      initialState: 'Idle',
      phaseOffset: 2.1,
    });
    this.rootGroup.add(atmUser.group);

    this.staticPatrons = [
      { ...eatIn, mode: 'eat_in', phaseOffset: 0.4, glbHandle: eatInGlb },
      { ...atmUser, mode: 'atm', phaseOffset: 2.1, glbHandle: atmGlb },
    ];
  }

  private buildShoppers(helpers: SevenElevenCharacterHelpers) {
    // 5 Dynamic 7-Eleven Shoppers strolling in -> deep aisle & fridge browsing -> checkout payment -> leaving with bag
    const specs: Array<{
      x: number;
      z: number;
      laneZ: number;
      outDir: 1 | -1;
      speed: number;
      idx: number;
      startState: MartShopperActor['state'];
      aisleX: number;
      aisleZ: number;
      fridgeX: number;
      checkoutZ: number;
    }> = [
      {
        // Already deep inside browsing the glowing drink coolers on boot
        x: -43.5,
        z: 5.2,
        laneZ: 18.2,
        outDir: 1,
        speed: 1.45,
        idx: 0,
        startState: 'browsing_fridge',
        aisleX: -43.5,
        aisleZ: 8.6,
        fridgeX: -43.5,
        checkoutZ: 9.2,
      },
      {
        // Already paying at checkout counter on boot
        x: -35.65,
        z: 8.4,
        laneZ: 18.7,
        outDir: -1,
        speed: 1.38,
        idx: 2,
        startState: 'paying',
        aisleX: -40.3,
        aisleZ: 9.5,
        fridgeX: -39.5,
        checkoutZ: 8.4,
      },
      {
        // Stepping straight through open sliding doors into aisle 1
        x: -43.5,
        z: 16.0,
        laneZ: 19.2,
        outDir: 1,
        speed: 1.42,
        idx: 3,
        startState: 'entering_door',
        aisleX: -43.5,
        aisleZ: 9.8,
        fridgeX: -45.2,
        checkoutZ: 9.6,
      },
      {
        // Walking along sidewalk from East toward 7-Eleven
        x: -28.0,
        z: 18.5,
        laneZ: 18.5,
        outDir: -1,
        speed: 1.40,
        idx: 6,
        startState: 'walking_sidewalk',
        aisleX: -40.3,
        aisleZ: 8.2,
        fridgeX: -41.4,
        checkoutZ: 7.8,
      },
      {
        // Walking along sidewalk from West toward 7-Eleven
        x: -55.0,
        z: 19.0,
        laneZ: 19.0,
        outDir: 1,
        speed: 1.46,
        idx: 7,
        startState: 'walking_sidewalk',
        aisleX: -43.5,
        aisleZ: 7.6,
        fridgeX: -38.0,
        checkoutZ: 10.1,
      },
    ];

    this.shoppers = specs.map((sp, i) => {
      const rig = this.buildNpcRig(sp.idx, helpers, { withBasket: true, withBag: true });
      rig.group.position.set(sp.x, sp.z < 15.6 ? 0.08 : 0, sp.z);
      const isInitIdle = sp.startState === 'browsing_fridge' || sp.startState === 'paying';
      const shopperSpec = pickOutsideNpcModel(60 + sp.idx + i);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: shopperSpec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: shopperSpec.targetHeight,
        clipProfile: shopperSpec.clipProfile,
        rotationY: shopperSpec.rotationY,
        initialState: sp.startState === 'paying' ? 'PickShelf' : isInitIdle ? 'PickShelf' : 'Walk',
        phaseOffset: sp.idx * 0.53,
        onModelMounted: () => {
          if (rig.basket) {
            rig.group.add(rig.basket);
            rig.basket.position.set(0.26, 0.64, 0.09);
          }
          if (rig.shoppingBag) {
            rig.group.add(rig.shoppingBag);
            rig.shoppingBag.position.set(-0.26, 0.46, 0.08);
          }
        },
      });
      this.rootGroup.add(rig.group);
      return {
        ...rig,
        state: sp.startState,
        x: sp.x,
        z: sp.z,
        laneZ: sp.laneZ,
        outDir: sp.outDir,
        speed: sp.speed,
        walkPhase: sp.idx * 1.7,
        timer: sp.startState === 'browsing_fridge' ? 2.5 : sp.startState === 'paying' ? 2.2 : 0,
        aisleTargetX: sp.aisleX,
        aisleTargetZ: sp.aisleZ,
        fridgeTargetX: sp.fridgeX,
        checkoutSlotZ: sp.checkoutZ,
        glbHandle,
      };
    });
  }

  private animateWalk(actor: MartNpcRig, delta: number, speed: number, walkObj: { walkPhase: number }, carryBag: boolean = false) {
    walkObj.walkPhase += delta * speed * 3.9;
    const swing = Math.sin(walkObj.walkPhase) * 0.46;
    actor.hipsGroup.position.y = 0.84 + Math.abs(Math.sin(walkObj.walkPhase * 2)) * 0.022;
    actor.leftLeg.rotation.x = swing;
    actor.rightLeg.rotation.x = -swing;
    actor.leftKnee.rotation.x = Math.max(0, -swing * 0.55);
    actor.rightKnee.rotation.x = Math.max(0, swing * 0.55);
    actor.leftArm.rotation.x = carryBag ? -0.25 : -swing * 0.72;
    actor.rightArm.rotation.x = swing * 0.72;
  }

  private resetIdleStand(actor: MartNpcRig, delta: number, carryBag: boolean = false) {
    actor.hipsGroup.position.y = 0.84;
    actor.leftLeg.rotation.x = THREE.MathUtils.damp(actor.leftLeg.rotation.x, 0, 8, delta);
    actor.rightLeg.rotation.x = THREE.MathUtils.damp(actor.rightLeg.rotation.x, 0, 8, delta);
    actor.leftKnee.rotation.x = THREE.MathUtils.damp(actor.leftKnee.rotation.x, 0, 8, delta);
    actor.rightKnee.rotation.x = THREE.MathUtils.damp(actor.rightKnee.rotation.x, 0, 8, delta);
    actor.leftArm.rotation.x = THREE.MathUtils.damp(actor.leftArm.rotation.x, carryBag ? -0.25 : 0, 8, delta);
    actor.rightArm.rotation.x = THREE.MathUtils.damp(actor.rightArm.rotation.x, 0, 8, delta);
  }

  public update(delta: number) {
    // 7-Eleven is OPEN 24 HOURS!
    const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

    // 1. Update Clerks (Cashier at counter + Aisle restocker)
    for (const s of this.staff) {
      if (s.pauseTimer > 0) {
        s.pauseTimer -= delta;
        s.glbHandle?.setAnimState(s.role === 'cashier' ? 'Checkout' : 'Stock');
        this.resetIdleStand(s, delta, false);
        s.leftArm.rotation.x = -0.32 + Math.sin(nowSec * 3.5 + s.baseZ) * 0.15;
        s.rightArm.rotation.x = -0.40 + Math.cos(nowSec * 4.0 + s.baseZ) * 0.18;
        s.group.rotation.y = s.role === 'cashier' ? -Math.PI / 2 : Math.PI / 2;
        if (s.pauseTimer <= 0) {
          s.dir = s.group.position.z > s.baseZ ? -1 : 1;
        }
      } else {
        s.glbHandle?.setAnimState('Walk');
        const nextZ = s.group.position.z + s.dir * s.speed * delta;
        s.group.position.z = nextZ;
        s.group.rotation.y = s.dir > 0 ? 0 : Math.PI;
        this.animateWalk(s, delta, s.speed, s, false);
        if (Math.abs(nextZ - s.baseZ) >= s.rangeZ) {
          s.group.position.z = s.baseZ + Math.sign(nextZ - s.baseZ) * s.rangeZ;
          s.pauseTimer = 2.6 + Math.random() * 2.2;
        }
      }
    }

    // 2. Update Static Patrons (Window ramen diner & ATM user)
    for (const p of this.staticPatrons) {
      if (p.mode === 'eat_in') {
        const sip = Math.max(0, Math.sin(nowSec * 0.8 + p.phaseOffset));
        p.rightArm.rotation.x = -0.55 - sip * 0.45;
        p.leftArm.rotation.x = -0.45;
        p.headGroup.rotation.x = sip * 0.14;
        p.headGroup.rotation.y = Math.sin(nowSec * 0.5 + p.phaseOffset) * 0.14;
      } else {
        p.rightArm.rotation.x = -0.68 + Math.sin(nowSec * 4.5 + p.phaseOffset) * 0.08;
        p.leftArm.rotation.x = -0.25;
        p.headGroup.rotation.y = Math.sin(nowSec * 0.6 + p.phaseOffset) * 0.10;
      }
    }

    // 3. Update Dynamic Shopping Customers (deep store navigation)
    const doorX = -43.5;
    const doorInsideZ = 14.3;
    const backCrossZ = 5.2;
    const checkoutX = -35.65;

    for (const c of this.shoppers) {
      const hasBasket =
        c.state === 'to_aisle' ||
        c.state === 'browsing_aisle' ||
        c.state === 'to_fridge' ||
        c.state === 'browsing_fridge' ||
        c.state === 'to_checkout' ||
        c.state === 'paying';
      const hasBag = c.state === 'exiting_door' || c.state === 'leaving_sidewalk';
      if (c.basket) c.basket.visible = hasBasket;
      if (c.shoppingBag) c.shoppingBag.visible = hasBag;

      let targetX = c.x;
      let targetZ = c.z;

      if (c.state === 'walking_sidewalk') {
        targetX = doorX;
        targetZ = c.laneZ;
        if (Math.hypot(targetX - c.x, targetZ - c.z) < 0.25) {
          c.state = 'entering_door';
        }
      } else if (c.state === 'entering_door') {
        targetX = doorX;
        targetZ = doorInsideZ;
        if (Math.hypot(doorX - c.x, doorInsideZ - c.z) < 0.22) {
          c.state = 'to_aisle';
        }
      } else if (c.state === 'to_aisle') {
        // Walk along front cross-aisle if changing corridor, then down aisle
        if (Math.abs(c.x - c.aisleTargetX) > 0.35 && c.z > 13.0) {
          targetX = c.aisleTargetX;
          targetZ = 13.4;
        } else {
          targetX = c.aisleTargetX;
          targetZ = c.aisleTargetZ;
          if (Math.hypot(targetX - c.x, targetZ - c.z) < 0.22) {
            c.state = 'browsing_aisle';
            c.timer = 2.4 + Math.random() * 1.4;
          }
        }
      } else if (c.state === 'browsing_aisle') {
        c.glbHandle?.setAnimState(c.timer > 1.3 ? 'PickShelf' : c.timer > 0.6 ? 'InspectItem' : 'DropBasket');
        this.resetIdleStand(c, delta, false);
        c.group.rotation.y = Math.PI / 2; // look into rack shelves
        c.rightArm.rotation.x = -0.35 + Math.sin(nowSec * 2.5 + c.aisleTargetZ) * 0.12;
        c.timer -= delta;
        if (c.timer <= 0) {
          c.state = 'to_fridge';
        }
        continue;
      } else if (c.state === 'to_fridge') {
        // Walk straight north down current aisle to back cross-aisle (Z = 5.2), then across to cooler bay
        if (c.z > backCrossZ + 0.35) {
          targetX = c.x;
          targetZ = backCrossZ;
        } else {
          targetX = c.fridgeTargetX;
          targetZ = backCrossZ;
          if (Math.hypot(targetX - c.x, targetZ - c.z) < 0.22) {
            c.state = 'browsing_fridge';
            c.timer = 2.6 + Math.random() * 1.5;
          }
        }
      } else if (c.state === 'browsing_fridge') {
        c.glbHandle?.setAnimState(c.timer > 1.3 ? 'PickShelf' : c.timer > 0.6 ? 'InspectItem' : 'DropBasket');
        this.resetIdleStand(c, delta, false);
        c.group.rotation.y = Math.PI; // face -Z glowing beverage coolers
        c.leftArm.rotation.x = -0.45 + Math.sin(nowSec * 3.0 + c.fridgeTargetX) * 0.14;
        c.timer -= delta;
        if (c.timer <= 0) {
          c.state = 'to_checkout';
        }
        continue;
      } else if (c.state === 'to_checkout') {
        // Move along back cross-aisle into checkout corridor (X = -35.65), then step forward to register
        if (Math.abs(c.x - checkoutX) > 0.30) {
          targetX = checkoutX;
          targetZ = backCrossZ;
        } else {
          targetX = checkoutX;
          targetZ = c.checkoutSlotZ;
          if (Math.hypot(targetX - c.x, targetZ - c.z) < 0.22) {
            c.state = 'paying';
            c.timer = 2.8;
          }
        }
      } else if (c.state === 'paying') {
        c.glbHandle?.setAnimState('PickShelf');
        this.resetIdleStand(c, delta, false);
        c.group.rotation.y = Math.PI / 2; // face +X cashier behind counter
        c.leftArm.rotation.x = -0.35;
        c.timer -= delta;
        if (c.timer <= 0) {
          c.state = 'exiting_door';
        }
        continue;
      } else if (c.state === 'exiting_door') {
        // Walk down front checkout zone to front cross-aisle (Z = 13.4), across to doorX (-43.5), then out onto sidewalk!
        if (c.z < 13.0) {
          targetX = checkoutX;
          targetZ = 13.4;
        } else if (Math.abs(c.x - doorX) > 0.28 && c.z < 15.0) {
          targetX = doorX;
          targetZ = doorInsideZ;
        } else {
          targetX = doorX;
          targetZ = c.laneZ;
          if (c.z >= c.laneZ - 0.20) {
            c.state = 'leaving_sidewalk';
            targetX = c.outDir > 0 ? 52.0 : -58.0;
          }
        }
      } else {
        // leaving_sidewalk
        targetX = c.outDir > 0 ? 52.0 : -58.0;
        targetZ = c.laneZ;
        if ((c.outDir > 0 && c.x >= 50.0) || (c.outDir < 0 && c.x <= -56.0)) {
          c.outDir = c.outDir > 0 ? -1 : 1;
          c.state = 'walking_sidewalk';
        }
      }

      c.glbHandle?.setAnimState(hasBasket ? 'WalkBasket' : 'Walk', THREE.MathUtils.clamp(c.speed / 1.12, 0.85, 1.38));
      const dx = targetX - c.x;
      const dz = targetZ - c.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001) {
        const step = Math.min(dist, c.speed * delta);
        c.x += (dx / dist) * step;
        c.z += (dz / dist) * step;
        steerYawSmooth(c.group, Math.atan2(dx, dz), 8.5, delta);
      }
      c.group.position.set(c.x, c.z < 15.55 ? 0.08 : 0, c.z);
      this.animateWalk(c, delta, c.speed, c, hasBag);
    }
  }
}
