import * as THREE from 'three';
import { attachGlbHumanToNpc, steerYawSmooth, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';

export interface StarbucksCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface StarbucksCafeBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  warmLampMats: THREE.MeshStandardMaterial[];
  interiorWindowGlowMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
}

export function createStarbucksEmblemTexture(size: number = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = '#00704A';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.032;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.435, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#005638';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.31, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.14, cy - size * 0.10);
  ctx.lineTo(cx - size * 0.10, cy - size * 0.22);
  ctx.lineTo(cx - size * 0.03, cy - size * 0.14);
  ctx.lineTo(cx, cy - size * 0.24);
  ctx.lineTo(cx + size * 0.03, cy - size * 0.14);
  ctx.lineTo(cx + size * 0.10, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.14, cy - size * 0.10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.12, cy - size * 0.06);
  ctx.lineTo(cx + size * 0.12, cy - size * 0.06);
  ctx.lineTo(cx + size * 0.09, cy + size * 0.19);
  ctx.lineTo(cx - size * 0.09, cy + size * 0.19);
  ctx.closePath();
  ctx.fill();

  ctx.font = `900 ${Math.round(size * 0.09)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx - size * 0.365, cy);
  ctx.fillText('★', cx + size * 0.365, cy);

  ctx.font = `900 ${Math.round(size * 0.072)}px system-ui, sans-serif`;
  ctx.fillText('STARBUCKS', cx, cy - size * 0.36);
  ctx.fillText('COFFEE', cx, cy + size * 0.365);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createStarbucksFasciaSignTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#00704A';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 14, w, 14);

  const drawMiniLogo = (lx: number) => {
    ctx.fillStyle = '#00704A';
    ctx.beginPath();
    ctx.arc(lx, h / 2, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(lx - 26, h / 2 - 14);
    ctx.lineTo(lx + 26, h / 2 - 14);
    ctx.lineTo(lx + 18, h / 2 + 34);
    ctx.lineTo(lx - 18, h / 2 + 34);
    ctx.closePath();
    ctx.fill();
  };
  drawMiniLogo(150);
  drawMiniLogo(w - 150);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 108px system-ui, -apple-system, sans-serif';
  ctx.fillText('S T A R B U C K S', w / 2, h / 2 - 14);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '800 34px system-ui, -apple-system, sans-serif';
  ctx.fillText('RESERVE® ROASTERY  •  ESPRESSO  •  MATCHA  •  BAKERY', w / 2, h / 2 + 68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createStarbucksMenuBoardTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#141a17';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#00704A';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#00704A';
  ctx.fillRect(14, 14, w - 28, 66);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('STARBUCKS RESERVE® MENU  •  HANDCRAFTED DRINKS', 36, 48);

  const cols = [
    {
      title: 'ESPRESSO & COFFEE',
      x: 40,
      items: [
        ['Caramel Macchiato', '$5.45'],
        ['Caffè Latte', '$4.95'],
        ['Iced Americano', '$3.95'],
        ['Flat White', '$5.15'],
      ],
    },
    {
      title: 'FRAPPUCCINO & TEA',
      x: 375,
      items: [
        ['Matcha Crème Frap', '$5.95'],
        ['Java Chip Frappuccino', '$6.25'],
        ['Iced Matcha Latte', '$5.45'],
        ['Strawberry Açai', '$4.95'],
      ],
    },
    {
      title: 'FRESH BAKERY',
      x: 710,
      items: [
        ['Butter Croissant', '$3.75'],
        ['Chocolate Muffin', '$3.95'],
        ['New York Cheesecake', '$5.50'],
        ['Banana Walnut Loaf', '$4.25'],
      ],
    },
  ];

  cols.forEach((col) => {
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(col.title, col.x, 118);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(col.x, 138);
    ctx.lineTo(col.x + 280, 138);
    ctx.stroke();

    col.items.forEach(([name, price], i) => {
      const y = 174 + i * 48;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 21px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(name, col.x, y);

      ctx.fillStyle = '#fde047';
      ctx.font = '700 21px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(price, col.x + 278, y);
    });
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createStarbucksWallArtTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText('ROASTERY ★', w / 2, 118);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText('100% ARABICA BEANS', w / 2, 192);

  ctx.fillStyle = '#fde68a';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('SINGLE ORIGIN  •  FRESHLY ROASTED', w / 2, 268);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStarbucksCafeStructure(): StarbucksCafeBuildResult {
  // Building L1 occupies X = -29 to -13 (16m wide, center X = -21.0), extended deeper Z = -0.5 to 15.6 (16.1m deep! Center Z = 8.8)
  // Local Z spans -9.3 (back wall -> world Z = -0.5) to +6.8 (front glass -> world Z = 15.6)
  const cafeGroup = new THREE.Group();
  cafeGroup.position.set(-21.0, 0, 8.8);

  const neonMats: THREE.MeshStandardMaterial[] = [];
  const warmLampMats: THREE.MeshStandardMaterial[] = [];
  const interiorWindowGlowMats: THREE.MeshStandardMaterial[] = [];

  // Shared PBR Materials
  const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55, metalness: 0.35 });
  const darkSlateWallMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 });
  const starbucksGreenMat = new THREE.MeshStandardMaterial({ color: 0x00704a, roughness: 0.42, metalness: 0.15 });
  const cedarWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.58 });
  const oakLightMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.52 });
  const floorOakMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    emissive: 0x451a03,
    emissiveIntensity: 0.35,
    roughness: 0.60,
  });
  const floorTileZoneMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    emissive: 0x292524,
    emissiveIntensity: 0.35,
    roughness: 0.50,
  });
  const creamPlasterMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.28,
    roughness: 0.72,
  });
  const interiorCeilingMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.34,
    roughness: 0.65,
  });
  const brickAccentMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a2b,
    emissive: 0x452214,
    emissiveIntensity: 0.42,
    roughness: 0.88,
  });
  const marbleCounterMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.08,
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.88, roughness: 0.22 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.82, roughness: 0.24 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const cupWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32 });
  const laptopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.22 });
  const glassClearMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.05,
    metalness: 0.16,
    transparent: true,
    opacity: 0.15,
  });

  const warmCeilingMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 1.1,
    roughness: 0.35,
  });
  neonMats.push(warmCeilingMat);

  const pendantGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  neonMats.push(pendantGlowMat);

  // Warm Interior PointLight centered inside Starbucks to illuminate baristas, tables, walls & guests evenly
  const sbPointLight = new THREE.PointLight(0xffe7ba, 10.0, 28.0, 1.0);
  sbPointLight.position.set(-21.0, 3.35, 9.2);
  const interiorPointLights = [{ light: sbPointLight, dayInt: 8.0, nightInt: 38.0 }];

  // 1. Deep Structural Shell (16m wide X = -8..+8, 16.1m deep local Z = -9.3..+6.8 -> world Z = -0.5..15.6)
  // Full deep oak ground floor
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.08, 16.0), floorOakMat);
  floorSlab.position.set(0, 0.04, -1.25);
  cafeGroup.add(floorSlab);

  // Dark slate walkway / ordering path guide strip leading deep into store
  const entryWalkStrip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.015, 11.2), floorTileZoneMat);
  entryWalkStrip.position.set(-4.7, 0.085, 1.0);
  cafeGroup.add(entryWalkStrip);

  // Back building wall & brick accent way back at local Z = -8.6 (world Z = 0.2) — 15.4m interior depth!
  const rearWallMass = new THREE.Mesh(new THREE.BoxGeometry(16.0, 8.6, 1.4), darkSlateWallMat);
  rearWallMass.position.set(0, 4.3, -8.8);
  cafeGroup.add(rearWallMass);

  const backAccentWall = new THREE.Mesh(new THREE.BoxGeometry(15.4, 4.1, 0.16), brickAccentMat);
  backAccentWall.position.set(0, 2.05, -8.02);
  cafeGroup.add(backAccentWall);

  // Left & Right structural ground-floor side walls spanning entire 15.2m interior depth
  [-7.85, 7.85].forEach((wx) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.30, 4.1, 15.0), creamPlasterMat);
    sideWall.position.set(wx, 2.05, -0.6);
    cafeGroup.add(sideWall);
  });

  // Warm interior ceiling & deep cedar perspective ceiling beams + recessed warm LED strips leading front-to-back!
  const interiorCeiling = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.14, 15.2), interiorCeilingMat);
  interiorCeiling.position.set(0, 4.02, -0.6);
  cafeGroup.add(interiorCeiling);

  // Parallel warm LED cove light battens running front-to-back (creates deep vanishing perspective!)
  [-4.6, -1.2, 2.2, 5.4].forEach((lx) => {
    const ledTrack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 13.8), warmCeilingMat);
    ledTrack.position.set(lx, 3.93, -0.5);
    cafeGroup.add(ledTrack);
  });
  // Transverse architectural cedar beams every 2.8m along Z
  for (let bz = -6.5; bz <= 5.5; bz += 2.8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.18, 0.22), cedarWoodMat);
    beam.position.set(0, 3.86, bz);
    cafeGroup.add(beam);
  }

  // Upper 2nd-story facade (Y = 4.1 .. 8.6, Z = -8.2 .. +6.8)
  const upperMass = new THREE.Mesh(new THREE.BoxGeometry(16.0, 4.5, 15.0), darkSlateWallMat);
  upperMass.position.set(0, 6.35, -0.6);
  cafeGroup.add(upperMass);

  const parapetTrim = new THREE.Mesh(new THREE.BoxGeometry(16.16, 0.24, 15.2), charcoalMat);
  parapetTrim.position.set(0, 8.62, -0.6);
  cafeGroup.add(parapetTrim);

  // Warm cedar vertical timber slats flanking the main Starbucks fascia on the 2nd floor
  for (let sx = -7.4; sx <= 7.4; sx += 0.52) {
    if (Math.abs(sx) < 5.7) continue;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 0.12), cedarWoodMat);
    slat.position.set(sx, 6.35, 6.94);
    cafeGroup.add(slat);
  }
  const upperGreenBand = new THREE.Mesh(new THREE.BoxGeometry(11.6, 3.75, 0.08), charcoalMat);
  upperGreenBand.position.set(0, 6.35, 6.92);
  cafeGroup.add(upperGreenBand);

  // 2. Storefront Glass & Open Entrance Vestibule (local Z = +6.75 -> world Z = 15.55)
  const entryHeaderGlass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 0.08), glassClearMat);
  entryHeaderGlass.position.set(-4.7, 3.35, 6.75);
  cafeGroup.add(entryHeaderGlass);

  [-1, 1].forEach((side) => {
    const openDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.72, 0.92), glassClearMat);
    openDoorLeaf.position.set(-4.7 + side * 0.98, 1.40, 6.32);
    cafeGroup.add(openDoorLeaf);

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.80, 0.10), charcoalMat);
    doorFrame.position.set(-4.7 + side * 1.02, 1.44, 6.76);
    cafeGroup.add(doorFrame);
  });

  // Main panoramic clear floor-to-ceiling storefront glass (local X = -3.68 .. +7.55)
  const mainGlass = new THREE.Mesh(new THREE.BoxGeometry(11.15, 3.65, 0.06), glassClearMat);
  mainGlass.position.set(1.92, 1.98, 6.75);
  cafeGroup.add(mainGlass);

  const kickplate = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.22, 0.16), charcoalMat);
  kickplate.position.set(1.92, 0.11, 6.75);
  cafeGroup.add(kickplate);

  [-7.55, -5.85, -3.65, -1.2, 1.6, 4.5, 7.55].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.11, 3.92, 0.14), charcoalMat);
    mullion.position.set(mx, 2.00, 6.75);
    cafeGroup.add(mullion);
  });

  // 3. Cantilevered Architectural Starbucks Canopy (Z = +6.8 .. +8.6) with Cedar Soffit
  const canopyFrame = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.16, 1.85), charcoalMat);
  canopyFrame.position.set(0, 3.92, 7.68);
  cafeGroup.add(canopyFrame);

  const canopyGreenTrim = new THREE.Mesh(new THREE.BoxGeometry(15.24, 0.06, 1.88), starbucksGreenMat);
  canopyGreenTrim.position.set(0, 3.98, 7.68);
  cafeGroup.add(canopyGreenTrim);

  const canopyWoodSoffit = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.05, 1.65), cedarWoodMat);
  canopyWoodSoffit.position.set(0, 3.83, 7.64);
  cafeGroup.add(canopyWoodSoffit);

  const canopyLedStrip = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.03, 0.12), pendantGlowMat);
  canopyLedStrip.position.set(0, 3.80, 7.64);
  cafeGroup.add(canopyLedStrip);

  // 4. Illuminated Starbucks Signage (Fascia Banner + Circular Emblem + Projecting Blade Sign)
  const fasciaTex = createStarbucksFasciaSignTexture();
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTex,
    emissive: 0xffffff,
    emissiveMap: fasciaTex,
    emissiveIntensity: 0.52,
    roughness: 0.25,
  });
  neonMats.push(fasciaMat);

  const fasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 1.38), fasciaMat);
  fasciaSign.position.set(0, 4.92, 7.00);
  cafeGroup.add(fasciaSign);

  const emblemTex = createStarbucksEmblemTexture(512);
  const emblemMat = new THREE.MeshStandardMaterial({
    map: emblemTex,
    emissive: 0xffffff,
    emissiveMap: emblemTex,
    emissiveIntensity: 0.58,
    transparent: true,
    roughness: 0.22,
  });
  neonMats.push(emblemMat);

  const emblemHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 28), charcoalMat);
  emblemHousing.rotation.x = Math.PI / 2;
  emblemHousing.position.set(0, 6.62, 7.02);
  cafeGroup.add(emblemHousing);

  const emblemDisk = new THREE.Mesh(new THREE.CircleGeometry(0.86, 28), emblemMat);
  emblemDisk.position.set(0, 6.62, 7.10);
  cafeGroup.add(emblemDisk);

  const bladeArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.95), charcoalMat);
  bladeArm.position.set(7.4, 4.75, 7.30);
  cafeGroup.add(bladeArm);

  const bladeDiskBody = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.12, 24), charcoalMat);
  bladeDiskBody.rotation.z = Math.PI / 2;
  bladeDiskBody.position.set(7.4, 4.75, 7.82);
  cafeGroup.add(bladeDiskBody);

  [-1, 1].forEach((side) => {
    const bladeFace = new THREE.Mesh(new THREE.CircleGeometry(0.50, 24), emblemMat);
    bladeFace.position.set(7.4 + side * 0.065, 4.75, 7.82);
    bladeFace.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    cafeGroup.add(bladeFace);
  });

  // 5. Deep Interior Layers (3 Zones: Front Window & Retail -> Mid Espresso Bar & Communal Study -> Back Roastery & Sofa Booths)

  // A. Deep Back Wall (local Z = -7.9 -> world Z = 0.9): Roastery Artwork, Back-Bar Coffee Shelves & Back Espresso Prep Counter
  const wallArtTex = createStarbucksWallArtTexture();
  const wallArtMat = new THREE.MeshStandardMaterial({
    map: wallArtTex,
    emissive: 0xffffff,
    emissiveMap: wallArtTex,
    emissiveIntensity: 0.35,
  });
  neonMats.push(wallArtMat);
  const backPoster = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), wallArtMat);
  backPoster.position.set(-4.6, 2.35, -7.90);
  cafeGroup.add(backPoster);

  // Illuminated Back Menu Board mounted deep at local Z = -3.8 behind the long espresso bar (visible straight from the sidewalk!)
  const menuTex = createStarbucksMenuBoardTexture();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTex,
    emissive: 0xffffff,
    emissiveMap: menuTex,
    emissiveIntensity: 0.48,
    roughness: 0.25,
  });
  neonMats.push(menuMat);

  // Floating architectural menu header bulkhead hanging over the espresso bar (local Z = -2.2 -> world Z = 6.6)
  const barBulkhead = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.45, 0.28), charcoalMat);
  barBulkhead.position.set(2.4, 3.22, -2.2);
  cafeGroup.add(barBulkhead);
  const menuFace = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.25), menuMat);
  menuFace.position.set(2.4, 3.22, -2.04);
  cafeGroup.add(menuFace);

  // Roastery Bean & Merch Display Wall on West interior wall (local X = -7.45, Z = 1.5..4.5)
  const merchRack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.4, 3.4), cedarWoodMat);
  merchRack.position.set(-7.45, 1.24, 2.6);
  cafeGroup.add(merchRack);
  [0.75, 1.35, 1.95].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 3.3), marbleCounterMat);
    shelf.position.set(-7.42, sy, 2.6);
    cafeGroup.add(shelf);
    for (let mz = 1.2; mz <= 4.0; mz += 0.55) {
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.07, 0.22, 10),
        (sIdx + Math.round(mz)) % 2 === 0 ? starbucksGreenMat : cupWhiteMat
      );
      mug.position.set(-7.35, sy + 0.14, mz);
      cafeGroup.add(mug);
    }
  });

  // B. Long Signature Espresso & Pickup Bar pushed deep into Mid Zone (local X = -1.6 .. +7.0, Z = -0.8 -> world Z = 8.0)
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.02, 0.92), cedarWoodMat);
  counterBase.position.set(2.6, 0.55, -0.8);
  cafeGroup.add(counterBase);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.08, 1.08), marbleCounterMat);
  counterTop.position.set(2.6, 1.08, -0.8);
  cafeGroup.add(counterTop);

  // Starbucks green medallion emblem on front of espresso counter
  const counterEmblem = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), emblemMat);
  counterEmblem.position.set(0.4, 0.62, -0.33);
  cafeGroup.add(counterEmblem);

  // Back Bar Counter behind baristas (local Z = -3.4 -> world Z = 5.4) with coffee grinders, syrup bottles & cabinetry
  const backBarBase = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.96, 0.72), charcoalMat);
  backBarBase.position.set(2.6, 0.52, -3.4);
  cafeGroup.add(backBarBase);
  const backBarTop = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.06, 0.78), cedarWoodMat);
  backBarTop.position.set(2.6, 1.03, -3.4);
  cafeGroup.add(backBarTop);

  // Dual Stainless Steel Espresso Machines on main bar (local X = +2.8 & +4.2, Z = -0.82)
  [2.6, 4.1].forEach((ex) => {
    const espressoBody = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.56, 0.58), steelMat);
    espressoBody.position.set(ex, 1.38, -0.82);
    cafeGroup.add(espressoBody);
    const espressoTrim = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.14, 0.60), charcoalMat);
    espressoTrim.position.set(ex, 1.68, -0.82);
    cafeGroup.add(espressoTrim);
  });

  // Refrigerated Glass Pastry & Cake Display Case (local X = +5.8, Z = -0.8)
  const pastryCaseBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.25, 0.72), charcoalMat);
  pastryCaseBase.position.set(5.8, 1.24, -0.8);
  cafeGroup.add(pastryCaseBase);
  const pastryCaseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.58, 0.68), glassClearMat);
  pastryCaseGlass.position.set(5.8, 1.65, -0.8);
  cafeGroup.add(pastryCaseGlass);
  [0xfbbf24, 0xd97706, 0xf43f5e, 0x84cc16].forEach((pCol, pIdx) => {
    const pastry = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.10, 10),
      new THREE.MeshStandardMaterial({ color: pCol, roughness: 0.6 })
    );
    pastry.position.set(5.32 + pIdx * 0.30, 1.44, -0.8);
    cafeGroup.add(pastry);
  });

  // POS Monitor + Pickup Drink Cups at West end of bar (local X = -1.2 .. +0.6, Z = -0.7)
  const posMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.28, 0.06), charcoalMat);
  posMonitor.position.set(0.4, 1.34, -0.82);
  cafeGroup.add(posMonitor);
  [-1.25, -1.02, -0.80].forEach((cx) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.16, 10), cupWhiteMat);
    cup.position.set(cx, 1.20, -0.65);
    cafeGroup.add(cup);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.052, 0.06, 10), starbucksGreenMat);
    sleeve.position.set(cx, 1.19, -0.65);
    cafeGroup.add(sleeve);
  });

  // C. Deep Back Cozy Velvet/Leather Sofa Booths (local X = -6.8 .. -2.5, Z = -6.6 -> world X = -27.8 .. -23.5, Z = 2.2)
  const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.44, 0.90), starbucksGreenMat);
  sofaSeat.position.set(-4.6, 0.26, -7.2);
  cafeGroup.add(sofaSeat);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 0.24), starbucksGreenMat);
  sofaBack.position.set(-4.6, 0.68, -7.56);
  cafeGroup.add(sofaBack);

  [-5.7, -3.5].forEach((tx) => {
    const bTop = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 14), marbleCounterMat);
    bTop.position.set(tx, 0.76, -6.15);
    cafeGroup.add(bTop);
    const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 10), charcoalMat);
    bPost.position.set(tx, 0.40, -6.15);
    cafeGroup.add(bPost);
    const bCup = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.14, 10), cupWhiteMat);
    bCup.position.set(tx + 0.12, 0.85, -6.15);
    cafeGroup.add(bCup);
  });

  // D. Mid-Cafe Communal Wooden Work Table & Chairs (local X = +1.8, Z = +2.4 -> world X = -19.2, Z = 11.2)
  const commTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 1.05), oakLightMat);
  commTop.position.set(1.8, 0.78, 2.4);
  cafeGroup.add(commTop);
  [0.45, 3.15].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.85), charcoalMat);
    leg.position.set(lx, 0.41, 2.4);
    cafeGroup.add(leg);
  });
  const commLaptop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.25), laptopMat);
  commLaptop.position.set(1.3, 0.83, 2.35);
  cafeGroup.add(commLaptop);
  const commScreen = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.02), charcoalMat);
  commScreen.position.set(1.3, 0.95, 2.47);
  commScreen.rotation.x = -0.18;
  cafeGroup.add(commScreen);

  // 4 Chairs flanking the Communal Study Table (local Z = +1.55 back row & +3.25 front row)
  [0.95, 2.65].forEach((cx) => {
    [1.55, 3.25].forEach((cz, rowIdx) => {
      const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), cedarWoodMat);
      cSeat.position.set(cx, 0.46, cz);
      cafeGroup.add(cSeat);
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.05), charcoalMat);
      cBack.position.set(cx, 0.68, cz + (rowIdx === 0 ? -0.20 : 0.20));
      cafeGroup.add(cBack);
      const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.36), charcoalMat);
      cLeg.position.set(cx, 0.24, cz);
      cafeGroup.add(cLeg);
    });
  });

  // Hanging Brass Pendant Lamps in TWO depth rows (Mid Z = +2.4 & Bar Z = -0.7) for strong interior depth!
  [-1.0, 1.4, 3.8, 6.0].forEach((px) => {
    [-0.7, 2.4].forEach((pz) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.25, 6), charcoalMat);
      cord.position.set(px, 3.35, pz);
      cafeGroup.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.20, 14), brassMat);
      shade.position.set(px, 2.74, pz);
      cafeGroup.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), pendantGlowMat);
      bulb.position.set(px, 2.65, pz);
      cafeGroup.add(bulb);
    });
  });

  // E. Front Window Counter (local X = -2.4 .. +6.4, Z = 6.28 -> world X = -23.4 .. -14.6, Z = 15.08) + Barstools
  const windowCounter = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.07, 0.56), oakLightMat);
  windowCounter.position.set(2.0, 1.02, 6.28);
  cafeGroup.add(windowCounter);
  [-1.6, 1.8, 5.2].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 0.44), charcoalMat);
    leg.position.set(bx, 0.52, 6.28);
    cafeGroup.add(leg);
  });
  const indoorLaptop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.25), laptopMat);
  indoorLaptop.position.set(1.8, 1.07, 6.25);
  cafeGroup.add(indoorLaptop);
  const indoorLaptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.02), charcoalMat);
  indoorLaptopScreen.position.set(1.8, 1.19, 6.37);
  indoorLaptopScreen.rotation.x = -0.18;
  cafeGroup.add(indoorLaptopScreen);

  // Window barstools (world X = -21.2, -19.2, -16.8, Z = 14.34 -> local Z = 5.54)
  [-0.2, 1.8, 4.2].forEach((sx) => {
    const stoolPost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8), charcoalMat);
    stoolPost.position.set(sx, 0.36, 5.54);
    cafeGroup.add(stoolPost);
    const stoolBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.04, 10), charcoalMat);
    stoolBase.position.set(sx, 0.06, 5.54);
    cafeGroup.add(stoolBase);
    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.06, 12), cedarWoodMat);
    stoolSeat.position.set(sx, 0.72, 5.54);
    cafeGroup.add(stoolSeat);
  });

  // Indoor Lounge Round Table & Armchairs on East Front-Mid (local X = +5.6, Z = 3.8 -> world X = -15.4, Z = 12.6)
  const loungeTableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), oakLightMat);
  loungeTableTop.position.set(5.6, 0.76, 3.8);
  cafeGroup.add(loungeTableTop);
  const loungeTablePost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 10), charcoalMat);
  loungeTablePost.position.set(5.6, 0.40, 3.8);
  cafeGroup.add(loungeTablePost);
  const loungeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.15, 10), cupWhiteMat);
  loungeCup.position.set(5.72, 0.86, 3.75);
  cafeGroup.add(loungeCup);
  const loungeSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.047, 0.06, 10), starbucksGreenMat);
  loungeSleeve.position.set(5.72, 0.85, 3.75);
  cafeGroup.add(loungeSleeve);

  [4.75, 6.45].forEach((cx, idx) => {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.08, 0.48), starbucksGreenMat);
    chairSeat.position.set(cx, 0.46, 3.8);
    cafeGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.48), starbucksGreenMat);
    chairBack.position.set(cx + (idx === 0 ? -0.22 : 0.22), 0.70, 3.8);
    cafeGroup.add(chairBack);
    const chairBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.40), charcoalMat);
    chairBase.position.set(cx, 0.24, 3.8);
    cafeGroup.add(chairBase);
  });

  // 6. Outdoor Starbucks Sidewalk Patio Sets (world Z = 17.2 -> local Z = 8.4)
  [-2.4, 7.0].forEach((px) => {
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.56, 1.45), charcoalMat);
    planterBox.position.set(px, 0.28, 8.1);
    cafeGroup.add(planterBox);
    const bush = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 1.32), foliageMat);
    bush.position.set(px, 0.72, 8.1);
    cafeGroup.add(bush);
  });

  [-0.5, 2.5, 5.4].forEach((tx, tIdx) => {
    const pz = 8.4;
    const tbBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.04, 12), charcoalMat);
    tbBase.position.set(tx, 0.02, pz);
    cafeGroup.add(tbBase);
    const tbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.78, 8), charcoalMat);
    tbPole.position.set(tx, 0.39, pz);
    cafeGroup.add(tbPole);
    const tbTop = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.045, 16), oakLightMat);
    tbTop.position.set(tx, 0.79, pz);
    cafeGroup.add(tbTop);

    const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 2.45, 8), charcoalMat);
    uPole.position.set(tx, 1.24, pz);
    cafeGroup.add(uPole);
    const uCanopy = new THREE.Mesh(new THREE.ConeGeometry(1.26, 0.46, 12), starbucksGreenMat);
    uCanopy.position.set(tx, 2.48, pz);
    cafeGroup.add(uCanopy);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.15, 10), cupWhiteMat);
    cup.position.set(tx + 0.16, 0.89, pz + 0.08);
    cafeGroup.add(cup);
    const cupSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.042, 0.055, 10), starbucksGreenMat);
    cupSleeve.position.set(tx + 0.16, 0.88, pz + 0.08);
    cafeGroup.add(cupSleeve);
    const cupLid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 10), cupWhiteMat);
    cupLid.position.set(tx + 0.16, 0.97, pz + 0.08);
    cafeGroup.add(cupLid);
    const cupStraw = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), starbucksGreenMat);
    cupStraw.position.set(tx + 0.16, 1.01, pz + 0.08);
    cafeGroup.add(cupStraw);

    if (tIdx === 0) {
      const pLaptop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), laptopMat);
      pLaptop.position.set(tx - 0.12, 0.83, pz - 0.04);
      cafeGroup.add(pLaptop);
      const pLid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.02), charcoalMat);
      pLid.position.set(tx - 0.12, 0.94, pz + 0.08);
      pLid.rotation.x = -0.18;
      cafeGroup.add(pLid);
    }

    [-0.74, 0.74].forEach((cxOff, cSide) => {
      const cx = tx + cxOff;
      const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.42), oakLightMat);
      cSeat.position.set(cx, 0.45, pz);
      cafeGroup.add(cSeat);
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.44, 0.40), charcoalMat);
      cBack.position.set(cx + (cSide === 0 ? -0.19 : 0.19), 0.67, pz);
      cafeGroup.add(cBack);
      const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), charcoalMat);
      cLeg.position.set(cx, 0.22, pz);
      cafeGroup.add(cLeg);
    });
  });

  return {
    staticGroup: cafeGroup,
    neonMats,
    warmLampMats,
    interiorWindowGlowMats,
    interiorPointLights,
  };
}

interface CafeNpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  handCup?: THREE.Group;
  glbHandle?: GlbHumanHandle;
}

interface BaristaActor extends CafeNpcRig {
  baseX: number;
  baseZ: number;
  rangeX: number;
  speed: number;
  dir: 1 | -1;
  walkPhase: number;
  pauseTimer: number;
  role: 'espresso' | 'cashier';
}

interface SeatedGuestActor extends CafeNpcRig {
  phaseOffset: number;
  mode: 'laptop' | 'sipping' | 'chatting';
}

interface TakeawayCustomerActor extends CafeNpcRig {
  state: 'walking_sidewalk' | 'entering_door' | 'ordering' | 'picking_up' | 'exiting_door' | 'leaving_sidewalk';
  x: number;
  z: number;
  laneZ: number;
  outDir: 1 | -1;
  speed: number;
  walkPhase: number;
  timer: number;
}

export class StarbucksNpcController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private baristas: BaristaActor[] = [];
  private seatedGuests: SeatedGuestActor[] = [];
  private takeawayCustomers: TakeawayCustomerActor[] = [];

  constructor(helpers: StarbucksCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    this.buildBaristas(helpers);
    this.buildSeatedGuests(helpers);
    this.buildTakeawayCustomers(helpers);
  }

  private buildNpcRig(
    paletteIndex: number,
    helpers: StarbucksCharacterHelpers,
    opts: { isBarista?: boolean; withHandCup?: boolean; shirtOverride?: number }
  ): CafeNpcRig {
    const skinPalette = [
      { color: 0xffdbac, hex: '#ffdbac' },
      { color: 0xf1c27d, hex: '#f1c27d' },
      { color: 0xe0ac69, hex: '#e0ac69' },
      { color: 0xc68642, hex: '#c68642' },
      { color: 0xffe0bd, hex: '#ffe0bd' },
    ];
    const hairPalette = [0x111111, 0x2b1d0c, 0x6b3e1a, 0xd4a359, 0x1e293b];
    const shirtPalette = [0x2563eb, 0xe11d48, 0x4f46e5, 0xf8fafc, 0x0d9488, 0xf59e0b];
    const pantsPalette = [0x1e293b, 0x0f172a, 0x334155, 0x27272a];

    const skin = skinPalette[paletteIndex % skinPalette.length];
    const hair = hairPalette[(paletteIndex + 2) % hairPalette.length];
    const shirt = opts.isBarista ? 0x18181b : opts.shirtOverride ?? shirtPalette[paletteIndex % shirtPalette.length];
    const pants = opts.isBarista ? 0x0f172a : pantsPalette[(paletteIndex + 1) % pantsPalette.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.color, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.72 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: opts.isBarista ? 0x09090b : 0xf8fafc, roughness: 0.42 });
    const sbGreenMat = new THREE.MeshStandardMaterial({ color: 0x00704a, roughness: 0.55 });

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

    if (opts.isBarista) {
      const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.03), sbGreenMat);
      apronBib.position.set(0, 0.24, 0.12);
      torsoGroup.add(apronBib);
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

    if (opts.isBarista) {
      const capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.245), sbGreenMat);
      capCrown.position.set(0, 0.15, 0);
      headGroup.add(capCrown);
      const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.025, 0.12), sbGreenMat);
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
    torsoGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.25, 0.52, 0);
    const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), shirtMat);
    rSleeve.position.set(0, -0.11, 0);
    rightArm.add(rSleeve);
    const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.10), skinMat);
    rForearm.position.set(0, -0.32, 0);
    rightArm.add(rForearm);

    let handCup: THREE.Group | undefined;
    if (opts.withHandCup) {
      handCup = new THREE.Group();
      handCup.position.set(0, -0.44, 0.08);
      const cupWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.13, 10), cupWhiteMat);
      handCup.add(cupBody);
      const cupSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.039, 0.05, 10), sbGreenMat);
      handCup.add(cupSleeve);
      const cupLid = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 10), cupWhiteMat);
      cupLid.position.y = 0.072;
      handCup.add(cupLid);
      const cupStraw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6), sbGreenMat);
      cupStraw.position.y = 0.11;
      handCup.add(cupStraw);
      handCup.visible = false;
      rightArm.add(handCup);
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
      handCup,
    };
  }

  private setSeatedPose(actor: CafeNpcRig, seatHeight: number = 0.49) {
    actor.hipsGroup.position.y = seatHeight;
    actor.leftLeg.rotation.x = -Math.PI / 2;
    actor.rightLeg.rotation.x = -Math.PI / 2;
    actor.leftKnee.rotation.x = Math.PI / 2;
    actor.rightKnee.rotation.x = Math.PI / 2;
  }

  private buildBaristas(helpers: StarbucksCharacterHelpers) {
    // Baristas stand deep in the barista aisle (world Z = 6.75, between counter Z = 8.0 and back bar Z = 5.4)
    const specs: Array<{ x: number; z: number; rangeX: number; speed: number; role: 'espresso' | 'cashier'; idx: number }> = [
      { x: -17.6, z: 6.75, rangeX: 1.4, speed: 0.9, role: 'espresso', idx: 0 },
      { x: -20.8, z: 6.75, rangeX: 0.85, speed: 0.85, role: 'cashier', idx: 3 },
    ];
    this.baristas = specs.map((sp, i) => {
      const rig = this.buildNpcRig(sp.idx, helpers, { isBarista: true });
      rig.group.position.set(sp.x, 0.08, sp.z);
      rig.group.rotation.y = 0;
      const spec = sp.role === 'cashier' ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(11 + i);
      rig.glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: sp.role === 'cashier' ? 'Checkout' : 'Idle',
        phaseOffset: sp.idx * 0.37,
      });
      this.rootGroup.add(rig.group);
      return {
        ...rig,
        baseX: sp.x,
        baseZ: sp.z,
        rangeX: sp.rangeX,
        speed: sp.speed,
        dir: 1,
        walkPhase: sp.idx,
        pauseTimer: 2.2,
        role: sp.role,
      };
    });
  }

  private buildSeatedGuests(helpers: StarbucksCharacterHelpers) {
    // Rich depth placement across 4 distinct interior & exterior zones:
    // 1-2: Front window barstools (world Z = 14.34)
    // 3: Front-East indoor lounge chair (world X = -16.25, Z = 12.60)
    // 4-5: Mid-Cafe communal study table patrons (world Z = 10.35 & 12.05)
    // 6: Deep Back Sofa Booth guest way at back wall (world X = -26.7, Z = 1.85) -> huge depth!
    // 7-9: Outdoor sidewalk patio guests (world Z = 17.20)
    const specs: Array<{
      x: number;
      y: number;
      z: number;
      rotY: number;
      seatY: number;
      mode: 'laptop' | 'sipping' | 'chatting';
      idx: number;
    }> = [
      { x: -19.20, y: 0.08, z: 14.34, rotY: 0, seatY: 0.72, mode: 'laptop', idx: 1 },
      { x: -21.20, y: 0.08, z: 14.34, rotY: 0, seatY: 0.72, mode: 'sipping', idx: 6 },
      { x: -16.25, y: 0.08, z: 12.60, rotY: Math.PI / 2, seatY: 0.49, mode: 'chatting', idx: 4 },
      { x: -20.05, y: 0.08, z: 10.35, rotY: 0, seatY: 0.49, mode: 'laptop', idx: 8 },
      { x: -18.35, y: 0.08, z: 12.05, rotY: Math.PI, seatY: 0.49, mode: 'sipping', idx: 9 },
      { x: -26.70, y: 0.08, z: 1.75, rotY: 0, seatY: 0.48, mode: 'sipping', idx: 7 },
      { x: -22.24, y: 0.0, z: 17.20, rotY: Math.PI / 2, seatY: 0.48, mode: 'laptop', idx: 2 },
      { x: -17.76, y: 0.0, z: 17.20, rotY: -Math.PI / 2, seatY: 0.48, mode: 'sipping', idx: 3 },
      { x: -14.86, y: 0.0, z: 17.20, rotY: -Math.PI / 2, seatY: 0.48, mode: 'sipping', idx: 5 },
    ];

    this.seatedGuests = specs.map((sp, i) => {
      const rig = this.buildNpcRig(sp.idx, helpers, { withHandCup: sp.mode === 'sipping' });
      rig.group.position.set(sp.x, sp.y, sp.z);
      rig.group.rotation.y = sp.rotY;
      this.setSeatedPose(rig, sp.seatY);
      if (rig.handCup && sp.mode === 'sipping') {
        rig.handCup.visible = true;
      }
      const glbHost = new THREE.Group();
      glbHost.position.y = sp.seatY >= 0.64 ? sp.seatY - 0.52 : (sp.y >= 0.05 ? -0.05 : 0);
      rig.group.add(glbHost);
      const guestSpec = pickSeatedCivilianModel(30 + sp.idx + i);
      rig.glbHandle = attachGlbHumanToNpc({
        modelSource: guestSpec.modelSource,
        hostGroup: glbHost,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: guestSpec.targetHeight,
        clipProfile: guestSpec.clipProfile,
        rotationY: guestSpec.rotationY,
        initialState: 'Sit',
        phaseOffset: sp.idx * 0.43,
      });
      this.rootGroup.add(rig.group);
      return {
        ...rig,
        phaseOffset: sp.idx * 1.4,
        mode: sp.mode,
      };
    });
  }

  private buildTakeawayCustomers(helpers: StarbucksCharacterHelpers) {
    // 3 Dynamic Takeaway Customers walking deep inside through entry corridor (X = -25.7) -> bar counter (Z = 9.2) -> pickup -> out
    const specs: Array<{ x: number; z: number; laneZ: number; outDir: 1 | -1; speed: number; idx: number; startState: TakeawayCustomerActor['state'] }> = [
      { x: -25.7, z: 15.8, laneZ: 18.6, outDir: 1, speed: 1.42, idx: 2, startState: 'entering_door' },
      { x: -20.6, z: 9.2, laneZ: 19.0, outDir: -1, speed: 1.36, idx: 4, startState: 'ordering' },
      { x: -34.0, z: 18.4, laneZ: 18.4, outDir: 1, speed: 1.48, idx: 0, startState: 'walking_sidewalk' },
    ];

    this.takeawayCustomers = specs.map((sp, i) => {
      const rig = this.buildNpcRig(sp.idx + 7, helpers, { withHandCup: true });
      rig.group.position.set(sp.x, sp.z < 15.55 ? 0.08 : 0, sp.z);
      const takeawaySpec = pickOutsideNpcModel(45 + sp.idx + i);
      rig.glbHandle = attachGlbHumanToNpc({
        modelSource: takeawaySpec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: takeawaySpec.targetHeight,
        clipProfile: takeawaySpec.clipProfile,
        rotationY: takeawaySpec.rotationY,
        initialState: sp.startState === 'ordering' ? 'Idle' : 'Walk',
        phaseOffset: sp.idx * 0.49,
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
        walkPhase: sp.idx * 2.0,
        timer: sp.startState === 'ordering' ? 2.0 : 0,
      };
    });
  }

  private animateWalk(actor: CafeNpcRig, delta: number, speed: number, walkObj: { walkPhase: number }, holdCup: boolean = false) {
    walkObj.walkPhase += delta * speed * 3.9;
    const swing = Math.sin(walkObj.walkPhase) * 0.46;
    actor.hipsGroup.position.y = 0.84 + Math.abs(Math.sin(walkObj.walkPhase * 2)) * 0.022;
    actor.leftLeg.rotation.x = swing;
    actor.rightLeg.rotation.x = -swing;
    actor.leftKnee.rotation.x = Math.max(0, -swing * 0.55);
    actor.rightKnee.rotation.x = Math.max(0, swing * 0.55);
    actor.leftArm.rotation.x = -swing * 0.72;
    actor.rightArm.rotation.x = holdCup ? -0.65 : swing * 0.72;
  }

  private resetIdleStand(actor: CafeNpcRig, delta: number, holdCup: boolean = false) {
    actor.hipsGroup.position.y = 0.84;
    actor.leftLeg.rotation.x = THREE.MathUtils.damp(actor.leftLeg.rotation.x, 0, 8, delta);
    actor.rightLeg.rotation.x = THREE.MathUtils.damp(actor.rightLeg.rotation.x, 0, 8, delta);
    actor.leftKnee.rotation.x = THREE.MathUtils.damp(actor.leftKnee.rotation.x, 0, 8, delta);
    actor.rightKnee.rotation.x = THREE.MathUtils.damp(actor.rightKnee.rotation.x, 0, 8, delta);
    actor.leftArm.rotation.x = THREE.MathUtils.damp(actor.leftArm.rotation.x, 0, 8, delta);
    actor.rightArm.rotation.x = THREE.MathUtils.damp(actor.rightArm.rotation.x, holdCup ? -0.65 : 0, 8, delta);
  }

  public update(delta: number, rawHour: number, isShopOpen: boolean) {
    const isCafeOpen = isShopOpen && rawHour >= 7.0 && rawHour < 23.5;
    this.rootGroup.visible = isCafeOpen;
    if (!isCafeOpen) return;

    const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

    for (const b of this.baristas) {
      if (b.pauseTimer > 0) {
        b.pauseTimer -= delta;
        b.glbHandle?.setAnimState(b.role === 'cashier' ? 'Checkout' : 'Stock', 1.0);
        if (b.hipsGroup.visible) {
          this.resetIdleStand(b, delta, false);
          b.leftArm.rotation.x = -0.35 + Math.sin(nowSec * 3.8 + b.baseX) * 0.14;
          b.rightArm.rotation.x = -0.45 + Math.cos(nowSec * 4.2 + b.baseX) * 0.18;
        }
        steerYawSmooth(b.group, b.role === 'espresso' ? Math.PI : 0, 9.0, delta);
        if (b.pauseTimer <= 0) {
          b.dir = b.group.position.x > b.baseX ? -1 : 1;
        }
      } else {
        b.glbHandle?.setAnimState('Walk', THREE.MathUtils.clamp(b.speed / 1.08, 0.85, 1.65));
        const nextX = b.group.position.x + b.dir * b.speed * delta;
        b.group.position.x = nextX;
        steerYawSmooth(b.group, b.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 10.0, delta);
        if (b.hipsGroup.visible) {
          this.animateWalk(b, delta, b.speed, b, false);
        }
        if (Math.abs(nextX - b.baseX) >= b.rangeX) {
          b.group.position.x = b.baseX + Math.sign(nextX - b.baseX) * b.rangeX;
          b.pauseTimer = 2.4 + Math.random() * 2.2;
        }
      }
    }

    for (const g of this.seatedGuests) {
      if (g.mode === 'laptop') {
        g.leftArm.rotation.x = -0.78 + Math.sin(nowSec * 7.5 + g.phaseOffset) * 0.06;
        g.rightArm.rotation.x = -0.78 + Math.cos(nowSec * 8.1 + g.phaseOffset) * 0.06;
        g.headGroup.rotation.y = Math.sin(nowSec * 0.6 + g.phaseOffset) * 0.12;
      } else if (g.mode === 'sipping') {
        const sipWave = Math.max(0, Math.sin(nowSec * 0.55 + g.phaseOffset));
        g.rightArm.rotation.x = -0.55 - sipWave * 0.55;
        g.leftArm.rotation.x = -0.35;
        g.headGroup.rotation.x = sipWave * 0.10;
        g.headGroup.rotation.y = Math.sin(nowSec * 0.45 + g.phaseOffset) * 0.18;
      } else {
        g.leftArm.rotation.x = -0.45 + Math.sin(nowSec * 1.8 + g.phaseOffset) * 0.12;
        g.rightArm.rotation.x = -0.45 + Math.cos(nowSec * 1.5 + g.phaseOffset) * 0.12;
        g.headGroup.rotation.y = Math.sin(nowSec * 0.9 + g.phaseOffset) * 0.24;
      }
    }

    // 3. Dynamic Walk-In Customers walk straight down West entry corridor (X = -25.7) deep into the counter (Z = 9.2)
    const doorX = -25.7;
    const corridorZ = 9.2;
    const orderX = -20.6;
    const pickupX = -22.2;

    for (const c of this.takeawayCustomers) {
      let targetX = c.x;
      let targetZ = c.z;
      const holdingCup = c.state === 'exiting_door' || c.state === 'leaving_sidewalk';
      if (c.handCup) c.handCup.visible = holdingCup;

      if (c.state === 'walking_sidewalk') {
        targetX = doorX;
        targetZ = c.laneZ;
        if (Math.hypot(targetX - c.x, targetZ - c.z) < 0.25) {
          c.state = 'entering_door';
        }
      } else if (c.state === 'entering_door') {
        if (c.z > corridorZ + 0.35 && Math.abs(c.x - doorX) < 0.5) {
          targetX = doorX;
          targetZ = corridorZ;
        } else {
          targetX = orderX;
          targetZ = corridorZ;
          if (Math.hypot(orderX - c.x, corridorZ - c.z) < 0.22) {
            c.state = 'ordering';
            c.timer = 2.6;
            c.group.rotation.y = Math.PI;
            continue;
          }
        }
      } else if (c.state === 'ordering') {
        c.glbHandle?.setAnimState('Idle', 1.0);
        if (c.hipsGroup.visible) this.resetIdleStand(c, delta, false);
        steerYawSmooth(c.group, Math.PI, 9.0, delta);
        c.timer -= delta;
        if (c.timer <= 0) {
          c.state = 'picking_up';
        }
        continue;
      } else if (c.state === 'picking_up') {
        targetX = pickupX;
        targetZ = corridorZ;
        if (Math.hypot(pickupX - c.x, corridorZ - c.z) < 0.20) {
          c.state = 'exiting_door';
          c.timer = 1.1;
        }
      } else if (c.state === 'exiting_door') {
        if (c.timer > 0) {
          c.timer -= delta;
          c.glbHandle?.setAnimState('PickShelf', 1.0);
          if (c.hipsGroup.visible) this.resetIdleStand(c, delta, true);
          steerYawSmooth(c.group, Math.PI, 9.0, delta);
          continue;
        }
        if (c.z < 14.5 && Math.abs(c.x - doorX) > 0.25) {
          targetX = doorX;
          targetZ = corridorZ;
        } else {
          targetX = doorX;
          targetZ = c.laneZ;
          if (c.z >= c.laneZ - 0.20) {
            c.state = 'leaving_sidewalk';
            targetX = c.outDir > 0 ? 52.0 : -56.0;
          }
        }
      } else {
        targetX = c.outDir > 0 ? 52.0 : -56.0;
        targetZ = c.laneZ;
        if ((c.outDir > 0 && c.x >= 50.0) || (c.outDir < 0 && c.x <= -54.0)) {
          c.outDir = c.outDir > 0 ? -1 : 1;
          c.state = 'walking_sidewalk';
        }
      }

      c.glbHandle?.setAnimState('Walk', THREE.MathUtils.clamp(c.speed / 1.08, 0.85, 1.65));
      const dx = targetX - c.x;
      const dz = targetZ - c.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001) {
        const step = Math.min(dist, c.speed * delta);
        c.x += (dx / dist) * step;
        c.z += (dz / dist) * step;
        steerYawSmooth(c.group, Math.atan2(dx, dz), 9.5, delta);
      }
      c.group.position.set(c.x, c.z < 15.55 ? 0.08 : 0, c.z);
      if (c.hipsGroup.visible) {
        this.animateWalk(c, delta, c.speed, c, holdingCup);
      }
    }
  }
}
