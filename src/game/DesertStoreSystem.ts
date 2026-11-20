import * as THREE from 'three';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isDesertOpenAtHour,
  setShutterProgress,
  type RollingShutterHandle,
} from './VenueOperatingHours';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  CASHIER_NPC_MODEL,
  pickOutsideNpcModel,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export interface DesertStoreBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  getClosedFactor: () => number;
  update: (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: DesertNpcController | null,
    externalNpcNearDoor?: boolean
  ) => void;
}

// Positioned directly East (screen-left from Boulevard looking South +Z) of Adidas Flagship Store (X = 299.2..325.2)
// Corner Plot at Ngã Tư Sơn Tây SW:
//   1. Main North Facade facing East Leg Boulevard SE Sidewalk (Z = 37.2..42.5), Double Door Aperture X = 333.0..337.0, Z = 44.2
//   2. Second East Facade facing Đường Sơn Tây Nam Sidewalk (X = 356.5..361.8), Double Door Aperture Z = 59.0..63.0, X = 352.75
// Plot Span: X = 328.4 .. 353.4 (25.0m wide, midX = 340.9), Z = 42.5 .. 67.5 (25.0m deep)
export const DESERT_COLLIDERS: IntersectionColliderBox[] = [
  // West & South Rear Perimeter Walls
  { minX: 328.1, maxX: 328.9, minZ: 43.8, maxZ: 67.7, floor: 1 }, // West Wall
  { minX: 328.2, maxX: 353.6, minZ: 67.0, maxZ: 67.8, floor: 1 }, // South Rear Wall

  // North Storefront Piers, Sidelights & Showcase Window (Open Double Door Aperture: X = 333.0 .. 337.0, Z = 44.2)
  { minX: 328.4, maxX: 333.0, minZ: 43.85, maxZ: 44.55, floor: 1 }, // West Pilaster + West Door Sidelight
  { minX: 337.0, maxX: 353.4, minZ: 43.85, maxZ: 44.55, floor: 1 }, // East Sidelight + Center 83 Sơn Tây Pier + Showcase Window + NE Pilaster

  // East Storefront Piers, Showcase Window & Sidelights (Open Double Door Aperture: Z = 59.0 .. 63.0, X = 352.75)
  { minX: 352.35, maxX: 353.35, minZ: 43.8, maxZ: 59.0, floor: 1 }, // NE Pier + East Showcase Window + East 83 Sơn Tây Pier + North Sidelight
  { minX: 352.35, maxX: 353.35, minZ: 63.0, maxZ: 67.7, floor: 1 }, // South Sidelight + SE Pier

  // Showcase Window Mannequin Plinth Zones
  { minX: 342.6, maxX: 351.0, minZ: 44.8, maxZ: 46.5, floor: 1 }, // North Showcase Plinth
  { minX: 351.0, maxX: 352.4, minZ: 46.7, maxZ: 53.3, floor: 1 }, // East Showcase Plinth

  // Interior Display Tables & Garment Rack Islands (keeping North X = 333..338 & East Z = 58.2..62.8 promenades clear)
  { minX: 339.2, maxX: 343.2, minZ: 50.2, maxZ: 52.0, floor: 1 }, // Center Folded Table 1
  { minX: 346.2, maxX: 350.2, minZ: 50.2, maxZ: 52.0, floor: 1 }, // East Garment Island 1
  { minX: 339.2, maxX: 343.2, minZ: 56.2, maxZ: 57.8, floor: 1 }, // Center Garment Island 2
  { minX: 346.2, maxX: 350.2, minZ: 56.2, maxZ: 57.8, floor: 1 }, // East Folded Table 2

  // Perimeter Wall Racks & Rear Cashwrap Checkout Counter
  { minX: 328.8, maxX: 330.1, minZ: 48.0, maxZ: 64.0, floor: 1 }, // West Wall Racks
  { minX: 331.7, maxX: 334.7, minZ: 65.6, maxZ: 67.0, floor: 1 }, // South-West Rear Wall Rack
  { minX: 347.1, maxX: 350.1, minZ: 65.6, maxZ: 67.0, floor: 1 }, // South-East Rear Wall Rack
  { minX: 336.5, maxX: 345.5, minZ: 62.6, maxZ: 64.2, floor: 1 }, // Rear Checkout Cashwrap
];

// Crisp white classical cornice fascia texture: centered outlined serif "DESERT" + bottom-left "MADE IN VIET NAM"
// PlaneGeometry facing -Z has rotation.y = Math.PI, so canvas left-to-right matches screen left-to-right directly!
function createDesertFasciaSignTex(): THREE.CanvasTexture {
  const w = 2048;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Centered large outlined classic serif "DESERT" (matching Image 2 typography)
  ctx.save();
  ctx.translate(w * 0.5, 118);
  ctx.font = 'italic 700 132px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtle exterior shadow
  ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  // Crisp white letter interior + dark charcoal hairline outline
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1f2937';
  ctx.strokeText('DESERT', 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DESERT', 0, 0);
  ctx.restore();

  // Bottom-left sans-serif mark: "MADE IN VIET NAM" (sits on screen-left above window bay, matching Image 2)
  ctx.fillStyle = '#1f2937';
  ctx.font = '800 30px "Montserrat", "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MADE IN VIET NAM', 84, 218);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Sculpted Gold Camel Emblem Texture for the dark matte charcoal awnings
function drawCamelSilhouette(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, fill: string | CanvasGradient) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = fill;
  ctx.beginPath();
  // Head & curved neck (facing right like Image 2)
  ctx.moveTo(46, -42);
  ctx.bezierCurveTo(58, -46, 62, -34, 52, -30);
  ctx.lineTo(42, -28);
  ctx.bezierCurveTo(38, -8, 30, 8, 22, 10);
  // Front chest & right-front stride leg
  ctx.lineTo(18, 22);
  ctx.lineTo(28, 52);
  ctx.lineTo(20, 54);
  ctx.lineTo(10, 26);
  // Left-front leg
  ctx.lineTo(4, 54);
  ctx.lineTo(-4, 54);
  ctx.lineTo(-2, 20);
  // Belly
  ctx.bezierCurveTo(-12, 22, -24, 20, -30, 14);
  // Rear legs
  ctx.lineTo(-24, 54);
  ctx.lineTo(-32, 54);
  ctx.lineTo(-40, 20);
  ctx.lineTo(-48, 50);
  ctx.lineTo(-56, 48);
  ctx.lineTo(-48, 8);
  // Tail
  ctx.bezierCurveTo(-56, 2, -62, 10, -64, 18);
  ctx.bezierCurveTo(-66, 6, -58, -8, -46, -10);
  // Back & sculpted desert camel hump
  ctx.bezierCurveTo(-34, -20, -24, -44, -8, -44);
  ctx.bezierCurveTo(8, -44, 12, -16, 20, -14);
  ctx.bezierCurveTo(28, -12, 34, -36, 46, -42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createGoldCamelAwningEmblemTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Drop shadow behind raised brass/gold camel
  drawCamelSilhouette(ctx, 134, 134, 1.55, 'rgba(0, 0, 0, 0.55)');

  const goldGrad = ctx.createLinearGradient(40, 40, 210, 210);
  goldGrad.addColorStop(0, '#fff4b8');
  goldGrad.addColorStop(0.35, '#e6b84c');
  goldGrad.addColorStop(0.7, '#c28e2b');
  goldGrad.addColorStop(1, '#f7d97e');
  drawCamelSilhouette(ctx, 128, 128, 1.55, goldGrad);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Center column "83 / SƠN TÂY" + "DESERT" plaque texture
function createAddressPlaqueTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#18181b';
  ctx.font = '800 84px "Montserrat", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('83', w * 0.5, 68);

  ctx.font = '700 32px "Montserrat", system-ui, sans-serif';
  ctx.fillText('SƠN TÂY', w * 0.5, 136);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Subtle "DESERT" serif wordmark for lower piers & door sidelight decal
function createDesertPierMarkTex(withCamel = false): THREE.CanvasTexture {
  const w = 256;
  const h = withCamel ? 192 : 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  if (withCamel) {
    drawCamelSilhouette(ctx, w * 0.5, 66, 0.68, 'rgba(63, 63, 70, 0.80)');
    ctx.fillStyle = 'rgba(41, 37, 36, 0.85)';
    ctx.font = 'italic 700 36px "Georgia", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DESERT', w * 0.5, 146);
  } else {
    ctx.fillStyle = '#44403c';
    ctx.font = 'italic 700 44px "Georgia", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DESERT', w * 0.5, h * 0.52);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Backlit rear boutique feature wall texture
function createDesertRearWallTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f6f2ea';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4c8b4';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  const goldGrad = ctx.createLinearGradient(w * 0.42, 42, w * 0.58, 165);
  goldGrad.addColorStop(0, '#e8be56');
  goldGrad.addColorStop(1, '#b68224');
  drawCamelSilhouette(ctx, w * 0.5, 102, 1.05, goldGrad);

  ctx.fillStyle = '#1f2937';
  ctx.font = 'italic 700 82px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DESERT', w * 0.5, 224);

  ctx.fillStyle = '#57534e';
  ctx.font = '700 28px "Montserrat", system-ui, sans-serif';
  ctx.fillText('MADE IN VIET NAM  •  83 SƠN TÂY', w * 0.5, 304);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Warm travertine / cream limestone tile interior floor texture
function createDesertTravertineFloorTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ede6d8';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(176, 164, 144, 0.36)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = i * 128;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(w, p);
    ctx.stroke();
  }

  let seed = 8303;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(166,152,130,0.12)';
    ctx.fillRect(rnd() * w, rnd() * h, 4, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createDesertGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 244, 214, 0.42)');
  grad.addColorStop(0.55, 'rgba(253, 230, 176, 0.16)');
  grad.addColorStop(1, 'rgba(253, 230, 176, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildDesertMannequin(
  x: number,
  y: number,
  z: number,
  yaw: number,
  topMat: THREE.Material,
  bottomMat: THREE.Material,
  mannequinMat: THREE.Material,
  plinthMat: THREE.Material,
  isDress = false
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = yaw;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.72), plinthMat);
  plinth.position.y = 0.11;
  grp.add(plinth);

  const baseY = 0.22;
  if (isDress) {
    [-0.08, 0.08].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.035, 0.72, 10), mannequinMat);
      leg.position.set(lx, baseY + 0.36, 0);
      grp.add(leg);
    });
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.56, 14), topMat);
    skirt.position.set(0, baseY + 0.78, 0);
    grp.add(skirt);
    const bodice = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.36, 0.18), topMat);
    bodice.position.set(0, baseY + 1.18, 0);
    grp.add(bodice);
  } else {
    [-0.10, 0.10].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.86, 0.16), bottomMat);
      leg.position.set(lx, baseY + 0.43, 0);
      grp.add(leg);
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.56, 0.22), topMat);
    torso.position.set(0, baseY + 1.12, 0);
    grp.add(torso);
    [-0.25, 0.25].forEach((ax) => {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.13), topMat);
      sleeve.position.set(ax, baseY + 1.26, 0);
      grp.add(sleeve);
    });
  }

  [-0.23, 0.23].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.030, 0.48, 8), mannequinMat);
    arm.position.set(ax, baseY + (isDress ? 1.06 : 0.96), 0);
    grp.add(arm);
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.14, 10), mannequinMat);
  neck.position.set(0, baseY + 1.44, 0);
  grp.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 12), mannequinMat);
  head.scale.set(0.90, 1.14, 0.95);
  head.position.set(0, baseY + 1.60, 0);
  grp.add(head);

  return grp;
}

function buildDesertGarmentRack(
  x: number,
  y: number,
  z: number,
  w: number,
  frameMat: THREE.Material,
  brassMat: THREE.Material,
  woodMat: THREE.Material,
  garmentMats: THREE.Material[]
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 1.04), woodMat);
  plinth.position.y = 0.09;
  grp.add(plinth);

  [-w * 0.44, w * 0.44].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.44, 0.055), frameMat);
    post.position.set(px, 0.82, 0);
    grp.add(post);
  });

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, w * 0.90, 10), brassMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.48, 0);
  grp.add(rail);

  const count = Math.max(6, Math.floor(w * 3.0));
  for (let i = 0; i < count; i++) {
    const gx = -w * 0.39 + (i / (count - 1)) * (w * 0.78);
    const mat = garmentMats[i % garmentMats.length];
    const garment = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.70, 0.42), mat);
    garment.position.set(gx, 1.11, 0);
    grp.add(garment);
  }

  return grp;
}

function buildDesertFoldedTable(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  topMat: THREE.Material,
  frameMat: THREE.Material,
  clothMats: THREE.Material[]
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);

  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), topMat);
  top.position.y = 0.78;
  grp.add(top);

  [-w * 0.44, w * 0.44].forEach((lx) => {
    [-d * 0.40, d * 0.40].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.07), frameMat);
      leg.position.set(lx, 0.38, lz);
      grp.add(leg);
    });
  });

  const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 0.05, d - 0.16), topMat);
  lowerShelf.position.y = 0.24;
  grp.add(lowerShelf);

  const cols = 4;
  for (let c = 0; c < cols; c++) {
    const sx = -w * 0.34 + (c / (cols - 1)) * (w * 0.68);
    [-0.24, 0.24].forEach((sz, r) => {
      const stackH = 0.14 + ((c + r) % 3) * 0.05;
      const mat = clothMats[(c * 2 + r) % clothMats.length];
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.36, stackH, 0.28), mat);
      stack.position.set(sx, 0.82 + stackH * 0.5, sz);
      grp.add(stack);
    });
  }

  return grp;
}

export function createDesertStoreStructure(): DesertStoreBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const minX = 328.4;
  const maxX = 353.4;
  const midX = (minX + maxX) * 0.5; // 340.9 (25.0m wide)
  const frontGlassZ = 44.2;
  const eastGlassX = 352.75;
  const backZ = 67.5;
  const midHallZ = (frontGlassZ + backZ) * 0.5; // 55.85
  const doorCenterX = 335.0; // Screen-right entrance portal (looking South +Z from boulevard)
  const eastDoorCenterZ = 61.0; // East entrance portal facing Đường Sơn Tây Nam (aperture Z = 59.0..63.0)

  // Materials matching Image 2 (crisp classical white fascia/columns, matte charcoal awnings & bronze/brass French doors)
  const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.68 });
  const warmCreamWallMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.76 });
  const travertineMat = new THREE.MeshStandardMaterial({ map: createDesertTravertineFloorTex(), roughness: 0.56 });
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.78, metalness: 0.08 });
  const darkMarbleMat = new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.36, metalness: 0.16 });
  const doorBronzeMat = new THREE.MeshStandardMaterial({ color: 0x2f2a24, roughness: 0.34, metalness: 0.55 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd9ad4c, roughness: 0.28, metalness: 0.76 });
  const silverHandleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.24, metalness: 0.80 });
  const warmOakMat = new THREE.MeshStandardMaterial({ color: 0xb99364, roughness: 0.62 });
  const mannequinMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.42 }); // Charcoal matte sculpted mannequins matching Image 2
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.12,
    roughness: 0.15,
    metalness: 0.14,
  });

  // Garment palette matching Image 2 (crisp white, cream, warm taupe/sand, soft blush linen, camel, charcoal)
  const clothWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.74 });
  const clothCreamMat = new THREE.MeshStandardMaterial({ color: 0xebe3d3, roughness: 0.76 });
  const clothTaupeMat = new THREE.MeshStandardMaterial({ color: 0xa69c92, roughness: 0.74 });
  const clothBlushMat = new THREE.MeshStandardMaterial({ color: 0xd9b8a9, roughness: 0.74 });
  const clothCamelMat = new THREE.MeshStandardMaterial({ color: 0xbc9163, roughness: 0.74 });
  const clothCharcoalMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.74 });
  const garmentPalette = [clothWhiteMat, clothCreamMat, clothBlushMat, clothTaupeMat, clothCamelMat, clothCharcoalMat];

  const ceilingStripMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.50,
    roughness: 0.32,
  });
  const soffitSpotMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde68a,
    emissiveIntensity: 0.55,
    roughness: 0.30,
  });
  const sensorLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.40,
    roughness: 0.35,
  });

  // =========================================================================
  // 1. FLOOR SLAB, WALKABLE APRONS (NORTH & EAST) & PERIMETER SHELL
  // =========================================================================
  const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.16, 23.3), travertineMat);
  interiorFloor.position.set(midX, 0.0, midHallZ);
  staticGroup.add(interiorFloor);

  // North sidewalk apron seamlessly joining SE Boulevard sidewalk (Z = 42.5 .. 44.2)
  const apronWalk = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.04, 1.8), travertineMat);
  apronWalk.position.set(midX, 0.02, 43.35);
  staticGroup.add(apronWalk);

  // East sidewalk apron seamlessly joining Ngã Tư Sơn Tây SW sidewalk (X = 352.75 .. 356.75, Z = 42.5 .. 67.5)
  const eastApronWalk = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.04, 25.0), travertineMat);
  eastApronWalk.position.set(354.75, 0.02, 55.0);
  staticGroup.add(eastApronWalk);

  // Dark charcoal marble step plinth under North showcase window (X = 342.4 .. 351.2)
  const windowMarbleStep = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.24, 0.90), darkMarbleMat);
  windowMarbleStep.position.set(346.8, 0.12, 43.95);
  staticGroup.add(windowMarbleStep);

  // Low dark marble door threshold flush across North entrance portal (walkable smoothly)
  const doorMarbleSill = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.03, 0.85), darkMarbleMat);
  doorMarbleSill.position.set(doorCenterX, 0.075, 43.95);
  staticGroup.add(doorMarbleSill);

  // Dark charcoal marble step plinth under East showcase window (Z = 46.3 .. 53.7)
  const eastWindowMarbleStep = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.24, 7.4), darkMarbleMat);
  eastWindowMarbleStep.position.set(353.0, 0.12, 50.0);
  staticGroup.add(eastWindowMarbleStep);

  // Low dark marble door threshold flush across East entrance portal (Z = 56.5 .. 65.5)
  const eastDoorMarbleSill = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 8.8), darkMarbleMat);
  eastDoorMarbleSill.position.set(353.0, 0.075, eastDoorCenterZ);
  staticGroup.add(eastDoorMarbleSill);

  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.6, 23.4), warmCreamWallMat);
  westWall.position.set(minX + 0.22, 3.8, midHallZ);
  staticGroup.add(westWall);

  // Segmented East perimeter above storefront lintel (Y = 4.35..7.60) + low window sill (Z = 46.3..53.7)
  const eastUpperWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.25, 23.4), warmCreamWallMat);
  eastUpperWall.position.set(maxX - 0.22, 5.975, midHallZ);
  staticGroup.add(eastUpperWall);

  const eastWindowSill = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.30, 7.4), warmCreamWallMat);
  eastWindowSill.position.set(eastGlassX + 0.05, 0.15, 50.0);
  staticGroup.add(eastWindowSill);

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(25.0, 7.6, 0.45), warmCreamWallMat);
  rearWall.position.set(midX, 3.8, backZ - 0.22);
  staticGroup.add(rearWall);

  const lowerCeiling = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.30, 23.6), warmCreamWallMat);
  lowerCeiling.position.set(midX, 4.42, midHallZ);
  staticGroup.add(lowerCeiling);

  const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(25.2, 0.34, 23.6), darkMarbleMat);
  upperRoof.position.set(midX, 7.45, midHallZ);
  staticGroup.add(upperRoof);

  // =========================================================================
  // 2. CLASSICAL UPPER WHITE CORNICE FASCIA, STEPPED PARAPET & ARCHITECTURAL DOWNLIGHTS (NORTH + EAST WRAP)
  // =========================================================================
  // North parapet & dark bronze coping cap
  const upperParapet = new THREE.Mesh(new THREE.BoxGeometry(24.8, 0.52, 1.02), whiteStuccoMat);
  upperParapet.position.set(midX, 7.72, 44.22);
  staticGroup.add(upperParapet);

  const parapetCap = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.12, 1.14), doorBronzeMat);
  parapetCap.position.set(midX, 8.02, 44.20);
  staticGroup.add(parapetCap);

  // East wrap-around parapet & bronze coping cap
  const eastUpperParapet = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.52, 22.67), whiteStuccoMat);
  eastUpperParapet.position.set(352.79, 7.72, 56.065);
  staticGroup.add(eastUpperParapet);

  const eastParapetCap = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 22.71), doorBronzeMat);
  eastParapetCap.position.set(352.79, 8.02, 56.125);
  staticGroup.add(eastParapetCap);

  // North White Classical Cornice Fascia Band (Y = 4.35 .. 7.45, front face at Z = 43.65)
  const mainFascia = new THREE.Mesh(new THREE.BoxGeometry(25.0, 3.10, 1.10), whiteStuccoMat);
  mainFascia.position.set(midX, 5.90, 44.20);
  staticGroup.add(mainFascia);

  // East White Classical Cornice Fascia Band (Y = 4.35 .. 7.45, outer face at X = 353.40, joins North fascia seamlessly at Z = 44.75)
  const eastFascia = new THREE.Mesh(new THREE.BoxGeometry(1.10, 3.10, 22.75), whiteStuccoMat);
  eastFascia.position.set(352.85, 5.90, 56.125);
  staticGroup.add(eastFascia);

  // Stepped classical upper & lower cornice moldings (North)
  const upperCorniceMolding = new THREE.Mesh(new THREE.BoxGeometry(25.3, 0.22, 1.32), whiteStuccoMat);
  upperCorniceMolding.position.set(midX, 7.38, 44.14);
  staticGroup.add(upperCorniceMolding);

  const midCorniceTrim = new THREE.Mesh(new THREE.BoxGeometry(25.16, 0.10, 1.20), whiteStuccoMat);
  midCorniceTrim.position.set(midX, 7.05, 44.16);
  staticGroup.add(midCorniceTrim);

  const lowerCorniceLedge = new THREE.Mesh(new THREE.BoxGeometry(25.26, 0.20, 1.28), whiteStuccoMat);
  lowerCorniceLedge.position.set(midX, 4.44, 44.14);
  staticGroup.add(lowerCorniceLedge);

  // Stepped classical upper & lower cornice moldings (East wrap)
  const eastUpperCorniceMolding = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.22, 22.85), whiteStuccoMat);
  eastUpperCorniceMolding.position.set(352.89, 7.38, 56.225);
  staticGroup.add(eastUpperCorniceMolding);

  const eastMidCorniceTrim = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.10, 22.82), whiteStuccoMat);
  eastMidCorniceTrim.position.set(352.88, 7.05, 56.17);
  staticGroup.add(eastMidCorniceTrim);

  const eastLowerCorniceLedge = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.20, 22.85), whiteStuccoMat);
  eastLowerCorniceLedge.position.set(352.89, 4.44, 56.205);
  staticGroup.add(eastLowerCorniceLedge);

  // 5 Architectural Black-Bronze Fascia Downlights along North cornice ledge
  for (let i = 0; i < 5; i++) {
    const lx = 331.4 + i * 4.75;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.42), doorBronzeMat);
    arm.position.set(lx, 7.22, 43.46);
    staticGroup.add(arm);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.20), doorBronzeMat);
    hood.position.set(lx, 7.18, 43.26);
    hood.rotation.x = 0.35;
    staticGroup.add(hood);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.14), soffitSpotMat);
    bulb.position.set(lx, 7.12, 43.28);
    staticGroup.add(bulb);
  }

  // 5 Architectural Black-Bronze Fascia Downlights along East cornice ledge facing Đường Sơn Tây
  for (let i = 0; i < 5; i++) {
    const lz = 46.8 + i * 4.5;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), doorBronzeMat);
    arm.position.set(353.59, 7.22, lz);
    staticGroup.add(arm);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.26), doorBronzeMat);
    hood.position.set(353.79, 7.18, lz);
    hood.rotation.z = 0.35;
    staticGroup.add(hood);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.20), soffitSpotMat);
    bulb.position.set(353.77, 7.12, lz);
    staticGroup.add(bulb);
  }

  // Front-facing (-Z) & East-facing (+X) DESERT + MADE IN VIET NAM signage planes
  const fasciaTex = createDesertFasciaSignTex();
  const fasciaSignMat = new THREE.MeshStandardMaterial({
    map: fasciaTex,
    emissive: 0xffffff,
    emissiveMap: fasciaTex,
    emissiveIntensity: 0.10,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.35,
  });
  const fasciaSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(24.6, 3.075), fasciaSignMat);
  fasciaSignPlane.userData.noMerge = true;
  fasciaSignPlane.rotation.y = Math.PI;
  fasciaSignPlane.position.set(midX, 5.90, 43.62);
  staticGroup.add(fasciaSignPlane);

  const eastFasciaSignPlane = new THREE.Mesh(new THREE.PlaneGeometry(22.8, 2.85), fasciaSignMat);
  eastFasciaSignPlane.userData.noMerge = true;
  eastFasciaSignPlane.rotation.y = Math.PI * 0.5;
  eastFasciaSignPlane.position.set(353.43, 5.90, 55.85);
  staticGroup.add(eastFasciaSignPlane);

  // =========================================================================
  // 3. CLASSICAL PILASTERS, "83 SƠN TÂY" COLUMNS, CHARCOAL AWNINGS & GOLD CAMELS (NORTH + EAST)
  // =========================================================================
  // Three North White Classical Piers: West Outer (329.5), Center (340.9), NE Corner (352.225)
  [
    { x: 329.5, w: 2.2 }, // Screen-right outer pilaster
    { x: 340.9, w: 3.0 }, // Center "83 SƠN TÂY" column
    { x: 352.225, w: 2.05 }, // NE corner pilaster (outer East edge flush at X = 353.25)
  ].forEach((col) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(col.w, 4.30, 0.86), whiteStuccoMat);
    pier.position.set(col.x, 2.22, 44.18);
    staticGroup.add(pier);

    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(col.w + 0.14, 0.56, 0.96), whiteStuccoMat);
    basePlinth.position.set(col.x, 0.30, 44.16);
    staticGroup.add(basePlinth);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(col.w + 0.12, 0.22, 0.94), whiteStuccoMat);
    capital.position.set(col.x, 4.22, 44.16);
    staticGroup.add(capital);

    [-col.w * 0.42, col.w * 0.42].forEach((ox) => {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.45, 0.06), whiteStuccoMat);
      flute.position.set(col.x + ox, 2.34, 43.73);
      staticGroup.add(flute);
    });
  });

  // Three East White Classical Piers: NE Corner Wing (45.25), Center "83 SƠN TÂY" (55.1), SE Corner (66.5)
  [
    { z: 45.25, w: 2.1 }, // NE corner pilaster extending South along Sơn Tây
    { z: 55.1, w: 2.8 }, // East Center "83 SƠN TÂY" column
    { z: 66.5, w: 2.0 }, // SE corner pilaster
  ].forEach((col) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.86, 4.30, col.w), whiteStuccoMat);
    pier.position.set(352.77, 2.22, col.z);
    staticGroup.add(pier);

    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.56, col.w + 0.14), whiteStuccoMat);
    basePlinth.position.set(352.79, 0.30, col.z);
    staticGroup.add(basePlinth);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.22, col.w + 0.12), whiteStuccoMat);
    capital.position.set(352.79, 4.22, col.z);
    staticGroup.add(capital);

    [-col.w * 0.42, col.w * 0.42].forEach((oz) => {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.45, 0.10), whiteStuccoMat);
      flute.position.set(353.22, 2.34, col.z + oz);
      staticGroup.add(flute);
    });
  });

  // Twin Warm Brass & Charcoal Wall Sconces flanking both Center "83 SƠN TÂY" Piers (North + East)
  [midX - 1.05, midX + 1.05].forEach((sx) => {
    const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.06), doorBronzeMat);
    backplate.position.set(sx, 2.55, 43.72);
    staticGroup.add(backplate);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.24, 10), goldTrimMat);
    lantern.position.set(sx, 2.68, 43.62);
    staticGroup.add(lantern);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), soffitSpotMat);
    glow.position.set(sx, 2.68, 43.62);
    staticGroup.add(glow);
  });

  [55.1 - 0.98, 55.1 + 0.98].forEach((sz) => {
    const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.16), doorBronzeMat);
    backplate.position.set(353.23, 2.55, sz);
    staticGroup.add(backplate);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.24, 10), goldTrimMat);
    lantern.position.set(353.33, 2.68, sz);
    staticGroup.add(lantern);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), soffitSpotMat);
    glow.position.set(353.33, 2.68, sz);
    staticGroup.add(glow);
  });

  // "83 / SƠN TÂY" address sign on North & East Center Piers
  const addressMat = new THREE.MeshStandardMaterial({
    map: createAddressPlaqueTex(),
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.45,
  });
  const addressPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.70, 1.28), addressMat);
  addressPlane.userData.noMerge = true;
  addressPlane.rotation.y = Math.PI;
  addressPlane.position.set(midX, 2.68, 43.73);
  staticGroup.add(addressPlane);

  const eastAddressPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 1.20), addressMat);
  eastAddressPlane.userData.noMerge = true;
  eastAddressPlane.rotation.y = Math.PI * 0.5;
  eastAddressPlane.position.set(353.22, 2.68, 55.1);
  staticGroup.add(eastAddressPlane);

  // Subtle "DESERT" mark on lower faces of all North & East white piers
  const pierDesertMat = new THREE.MeshStandardMaterial({
    map: createDesertPierMarkTex(false),
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.50,
  });
  [329.5, midX, 352.225].forEach((px) => {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.51), pierDesertMat);
    mark.userData.noMerge = true;
    mark.rotation.y = Math.PI;
    mark.position.set(px, 0.88, 43.73);
    staticGroup.add(mark);
  });
  [45.25, 55.1, 66.5].forEach((pz) => {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.30, 0.49), pierDesertMat);
    mark.userData.noMerge = true;
    mark.rotation.y = Math.PI * 0.5;
    mark.position.set(353.22, 0.88, pz);
    staticGroup.add(mark);
  });

  // MATTE CHARCOAL SLOPED AWNINGS + GOLD CAMEL EMBLEMS (North Twin + East Twin)
  const camelEmblemMat = new THREE.MeshStandardMaterial({
    map: createGoldCamelAwningEmblemTex(),
    transparent: true,
    alphaTest: 0.08,
    depthWrite: false,
    roughness: 0.28,
    metalness: 0.65,
  });

  const buildAwningBay = (parent: THREE.Group, cx: number, baseZ: number, w: number) => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 1.38), awningMat);
    slope.position.set(cx, 3.84, baseZ - 0.62);
    slope.rotation.x = 0.58;
    parent.add(slope);

    [-w * 0.49, w * 0.49].forEach((sx) => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 1.05), awningMat);
      cheek.position.set(cx + sx, 3.74, baseZ - 0.58);
      parent.add(cheek);
    });

    const valance = new THREE.Mesh(new THREE.BoxGeometry(w, 0.34, 0.12), awningMat);
    valance.position.set(cx, 3.44, baseZ - 1.12);
    parent.add(valance);

    [-w * 0.28, 0, w * 0.28].forEach((dx) => {
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), soffitSpotMat);
      bulb.position.set(cx + dx, 3.44, baseZ - 0.65);
      parent.add(bulb);
    });

    const camelPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.18), camelEmblemMat);
    camelPlane.userData.noMerge = true;
    camelPlane.rotation.y = Math.PI;
    camelPlane.rotation.x = -0.58;
    camelPlane.position.set(cx, 3.92, baseZ - 0.69);
    parent.add(camelPlane);
  };

  // North Awnings (facing -Z)
  [
    { cx: 346.8, w: 8.6 },
    { cx: doorCenterX, w: 8.6 },
  ].forEach((awn) => buildAwningBay(staticGroup, awn.cx, frontGlassZ, awn.w));

  // East Awnings (rotated -90 deg on Y around eastGlassX so local -Z faces +X toward Đường Sơn Tây!)
  [
    { cz: 50.0, w: 7.2 }, // East Showcase Window Awning
    { cz: eastDoorCenterZ, w: 8.8 }, // East Entrance Awning
  ].forEach((awn) => {
    const grp = new THREE.Group();
    grp.position.set(eastGlassX, 0, awn.cz);
    grp.rotation.y = -Math.PI * 0.5;
    buildAwningBay(grp, 0, 0, awn.w);
    staticGroup.add(grp);
  });

  // =========================================================================
  // 4. NORTH & EAST SHOWCASE WINDOWS AND DOUBLE FRENCH GLASS ENTRANCE DOORS
  // =========================================================================
  // North Showcase Window Glass & Dark Bronze Framing (X = 342.4 .. 351.2, center 346.8)
  const showcaseGlass = new THREE.Mesh(new THREE.BoxGeometry(8.6, 3.10, 0.06), windowGlassMat);
  showcaseGlass.position.set(346.8, 1.82, frontGlassZ);
  staticGroup.add(showcaseGlass);

  [0.26, 3.36].forEach((ry) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.10, 0.14), doorBronzeMat);
    rail.position.set(346.8, ry, frontGlassZ);
    staticGroup.add(rail);
  });
  [342.45, 351.15].forEach((rx) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.20, 0.14), doorBronzeMat);
    jamb.position.set(rx, 1.82, frontGlassZ);
    staticGroup.add(jamb);
  });

  // East Showcase Window Glass & Dark Bronze Framing (Z = 46.3 .. 53.7, center 50.0)
  const eastShowcaseGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.10, 7.3), windowGlassMat);
  eastShowcaseGlass.position.set(eastGlassX, 1.82, 50.0);
  staticGroup.add(eastShowcaseGlass);

  [0.26, 3.36].forEach((ry) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 7.4), doorBronzeMat);
    rail.position.set(eastGlassX, ry, 50.0);
    staticGroup.add(rail);
  });
  [46.35, 53.65].forEach((rz) => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.20, 0.10), doorBronzeMat);
    jamb.position.set(eastGlassX, 1.82, rz);
    staticGroup.add(jamb);
  });

  // North Entrance Portal Framing, Sidelights & Transom (X = 330.6 .. 339.4, center 335.0)
  const portalTransom = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.56, 0.06), windowGlassMat);
  portalTransom.position.set(doorCenterX, 3.14, frontGlassZ);
  staticGroup.add(portalTransom);

  [331.82, 338.18].forEach((sx) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(2.34, 2.74, 0.06), windowGlassMat);
    pane.position.set(sx, 1.48, frontGlassZ);
    staticGroup.add(pane);
  });

  const sidelightDecalMat = new THREE.MeshStandardMaterial({
    map: createDesertPierMarkTex(true),
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    roughness: 0.40,
  });
  const sidelightDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.86), sidelightDecalMat);
  sidelightDecal.userData.noMerge = true;
  sidelightDecal.rotation.y = Math.PI;
  sidelightDecal.position.set(338.18, 1.88, frontGlassZ - 0.045);
  staticGroup.add(sidelightDecal);

  [330.65, 333.0, 337.0, 339.35].forEach((mx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 3.36, 0.16), doorBronzeMat);
    post.position.set(mx, 1.76, frontGlassZ);
    staticGroup.add(post);
  });
  [2.86, 3.42].forEach((my) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.10, 0.16), doorBronzeMat);
    bar.position.set(doorCenterX, my, frontGlassZ);
    staticGroup.add(bar);
  });

  [frontGlassZ - 0.12, frontGlassZ + 0.12].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), darkMarbleMat);
    pod.position.set(doorCenterX, 2.86, sz);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.02), sensorLedMat);
    led.position.set(doorCenterX, 2.85, sz + (sz < frontGlassZ ? -0.042 : 0.042));
    staticGroup.add(led);
  });

  // East Entrance Portal Framing, Sidelights & Transom (Z = 56.5 .. 65.5, center 61.0, door aperture Z = 59.0..63.0)
  const eastPortalTransom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 8.8), windowGlassMat);
  eastPortalTransom.position.set(eastGlassX, 3.14, eastDoorCenterZ);
  staticGroup.add(eastPortalTransom);

  [57.775, 64.225].forEach((sz) => {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.74, 2.44), windowGlassMat);
    pane.position.set(eastGlassX, 1.48, sz);
    staticGroup.add(pane);
  });

  const eastSidelightDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.86), sidelightDecalMat);
  eastSidelightDecal.userData.noMerge = true;
  eastSidelightDecal.rotation.y = Math.PI * 0.5;
  eastSidelightDecal.position.set(eastGlassX + 0.045, 1.88, 57.775);
  staticGroup.add(eastSidelightDecal);

  [56.55, 59.0, 63.0, 65.45].forEach((mz) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.36, 0.11), doorBronzeMat);
    post.position.set(eastGlassX, 1.76, mz);
    staticGroup.add(post);
  });
  [2.86, 3.42].forEach((my) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 8.9), doorBronzeMat);
    bar.position.set(eastGlassX, my, eastDoorCenterZ);
    staticGroup.add(bar);
  });

  [eastGlassX + 0.12, eastGlassX - 0.12].forEach((sx) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.32), darkMarbleMat);
    pod.position.set(sx, 2.86, eastDoorCenterZ);
    staticGroup.add(pod);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.10), sensorLedMat);
    led.position.set(sx + (sx > eastGlassX ? 0.042 : -0.042), 2.85, eastDoorCenterZ);
    staticGroup.add(led);
  });

  // TWIN DARK-BRONZE & GOLD-TRIM FRENCH DOUBLE GLASS DOORS (North + East)
  const buildFrenchDoorLeaf = (isWestLeaf: boolean) => {
    const pivot = new THREE.Group();
    pivot.userData.noMerge = true;
    const xSign = isWestLeaf ? 1 : -1;
    const leafW = 1.94;
    const centerOffset = xSign * (leafW * 0.5);

    const leaf = new THREE.Group();
    leaf.position.set(centerOffset, 0, 0);
    pivot.add(leaf);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.24, 2.02, 0.045), windowGlassMat);
    glass.position.set(0, 0.30, 0);
    leaf.add(glass);

    [-leafW * 0.47, leafW * 0.47].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.74, 0.09), doorBronzeMat);
      stile.position.set(sx, 0, 0);
      leaf.add(stile);
    });
    [1.33, -0.70, -1.32].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.10, 0.09), doorBronzeMat);
      rail.position.set(0, ry, 0);
      leaf.add(rail);
    });

    const kickPanel = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.20, 0.56, 0.075), doorBronzeMat);
    kickPanel.position.set(0, -1.01, 0);
    leaf.add(kickPanel);

    const goldBorder = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.42, 0.38, 0.092), goldTrimMat);
    goldBorder.position.set(0, -1.01, 0);
    leaf.add(goldBorder);

    const innerPanel = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.47, 0.33, 0.098), doorBronzeMat);
    innerPanel.position.set(0, -1.01, 0);
    leaf.add(innerPanel);

    const handleX = xSign * (leafW * 0.39);
    [-0.075, 0.075].forEach((hz) => {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.05, 8), silverHandleMat);
      handle.position.set(handleX, -0.05, hz);
      leaf.add(handle);
    });

    staticGroup.add(pivot);
    return pivot;
  };

  const westDoorPivot = buildFrenchDoorLeaf(true);
  westDoorPivot.position.set(333.04, 1.46, frontGlassZ);
  const eastDoorPivot = buildFrenchDoorLeaf(false);
  eastDoorPivot.position.set(336.96, 1.46, frontGlassZ);

  // East French Double Doors (hinged at Z = 59.04 & Z = 62.96, rotated -90 deg so closed leaves meet at Z = 61.0 and swing inward -X)
  const eastNorthDoorPivot = buildFrenchDoorLeaf(true);
  eastNorthDoorPivot.position.set(eastGlassX, 1.46, 59.04);
  eastNorthDoorPivot.rotation.y = -Math.PI * 0.5;
  const eastSouthDoorPivot = buildFrenchDoorLeaf(false);
  eastSouthDoorPivot.position.set(eastGlassX, 1.46, 62.96);
  eastSouthDoorPivot.rotation.y = -Math.PI * 0.5;

  // =========================================================================
  // 5. SHOWCASE MANNEQUIN DISPLAYS (NORTH + EAST) & WALKABLE BOUTIQUE INTERIOR
  // =========================================================================
  const showcasePlinth = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.18, 1.35), whiteStuccoMat);
  showcasePlinth.position.set(346.8, 0.17, 45.45);
  staticGroup.add(showcasePlinth);

  // 4 North Showcase Mannequins
  staticGroup.add(
    buildDesertMannequin(349.8, 0.26, 45.45, Math.PI + 0.08, clothWhiteMat, clothCreamMat, mannequinMat, whiteStuccoMat, false)
  );
  staticGroup.add(
    buildDesertMannequin(347.8, 0.26, 45.45, Math.PI - 0.06, clothWhiteMat, clothCreamMat, mannequinMat, whiteStuccoMat, false)
  );
  staticGroup.add(
    buildDesertMannequin(345.8, 0.26, 45.45, Math.PI + 0.05, clothTaupeMat, clothTaupeMat, mannequinMat, whiteStuccoMat, true)
  );
  staticGroup.add(
    buildDesertMannequin(343.8, 0.26, 45.45, Math.PI - 0.10, clothBlushMat, clothBlushMat, mannequinMat, whiteStuccoMat, true)
  );

  // East Showcase Plinth & 3 Mannequins facing Đường Sơn Tây (+X)
  const eastShowcasePlinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 6.4), whiteStuccoMat);
  eastShowcasePlinth.position.set(351.75, 0.17, 50.0);
  staticGroup.add(eastShowcasePlinth);

  staticGroup.add(
    buildDesertMannequin(351.75, 0.26, 48.0, Math.PI * 0.5 + 0.08, clothBlushMat, clothBlushMat, mannequinMat, whiteStuccoMat, true)
  );
  staticGroup.add(
    buildDesertMannequin(351.75, 0.26, 50.0, Math.PI * 0.5 - 0.06, clothCamelMat, clothCreamMat, mannequinMat, whiteStuccoMat, false)
  );
  staticGroup.add(
    buildDesertMannequin(351.75, 0.26, 52.0, Math.PI * 0.5 + 0.05, clothWhiteMat, clothCharcoalMat, mannequinMat, whiteStuccoMat, false)
  );

  // West Wall Wood Panelling & Wall Racks
  const westPanel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 20.6), warmOakMat);
  westPanel.position.set(328.95, 1.98, 55.8);
  staticGroup.add(westPanel);
  for (let wz = 49.5; wz <= 62.5; wz += 4.3) {
    staticGroup.add(
      buildDesertGarmentRack(329.55, 0.08, wz, 1.0, doorBronzeMat, goldTrimMat, warmOakMat, [
        clothWhiteMat,
        clothCreamMat,
        clothBlushMat,
        clothTaupeMat,
      ])
    );
  }

  // Rear-Flank Wood Panelling & Garment Racks (leaving East glass facade completely unobstructed!)
  [333.2, 348.6].forEach((rx, idx) => {
    const pan = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.8, 0.18), warmOakMat);
    pan.position.set(rx, 1.98, 67.18);
    staticGroup.add(pan);
    staticGroup.add(
      buildDesertGarmentRack(
        rx,
        0.08,
        66.3,
        2.8,
        doorBronzeMat,
        goldTrimMat,
        warmOakMat,
        idx === 0
          ? [clothCamelMat, clothCharcoalMat, clothWhiteMat, clothCreamMat]
          : [clothBlushMat, clothTaupeMat, clothWhiteMat, clothCamelMat]
      )
    );
  });

  // Interior Display Tables & Garment Islands (clean spacious North X=335 & East Z=61 promenades!)
  staticGroup.add(
    buildDesertFoldedTable(341.2, 0.08, 51.1, 3.6, 1.5, whiteStuccoMat, doorBronzeMat, [
      clothWhiteMat,
      clothCreamMat,
      clothBlushMat,
      clothTaupeMat,
    ])
  );
  staticGroup.add(
    buildDesertGarmentRack(348.2, 0.08, 51.1, 3.6, doorBronzeMat, goldTrimMat, warmOakMat, garmentPalette)
  );
  staticGroup.add(
    buildDesertGarmentRack(341.2, 0.08, 57.0, 3.6, doorBronzeMat, goldTrimMat, warmOakMat, garmentPalette)
  );
  staticGroup.add(
    buildDesertFoldedTable(348.2, 0.08, 57.0, 3.6, 1.5, whiteStuccoMat, doorBronzeMat, [
      clothCamelMat,
      clothWhiteMat,
      clothCharcoalMat,
      clothCreamMat,
    ])
  );

  // Rear Stone & Oak Cashwrap Counter + Backlit DESERT Feature Wall (Z = 63.4)
  const checkoutDesk = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.02, 1.25), warmOakMat);
  checkoutDesk.position.set(341.0, 0.59, 63.4);
  staticGroup.add(checkoutDesk);

  const checkoutTop = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.08, 1.38), whiteStuccoMat);
  checkoutTop.position.set(341.0, 1.13, 63.4);
  staticGroup.add(checkoutTop);

  [338.8, 343.2].forEach((rx) => {
    const pos = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.08), darkMarbleMat);
    pos.position.set(rx, 1.37, 63.3);
    staticGroup.add(pos);
  });

  const rearWallTex = createDesertRearWallTex();
  const rearWallMat = new THREE.MeshStandardMaterial({
    map: rearWallTex,
    emissive: 0xffffff,
    emissiveMap: rearWallTex,
    emissiveIntensity: 0.20,
    roughness: 0.45,
  });
  const rearSign = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 3.3), rearWallMat);
  rearSign.userData.noMerge = true;
  rearSign.rotation.y = Math.PI;
  rearSign.position.set(341.0, 2.45, 66.95);
  staticGroup.add(rearSign);

  // Warm Boutique Ceiling Light Panels
  for (let lz = 47.0; lz <= 62.5; lz += 3.8) {
    [334.5, midX, 347.3].forEach((lx) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.38), ceilingStripMat);
      panel.position.set(lx, 4.24, lz);
      staticGroup.add(panel);
    });
  }

  // =========================================================================
  // 6. OPERATING HOURS ROLLING SHUTTERS (07:00 - 23:00, NORTH + EAST) & LIGHTING
  // =========================================================================
  const shutterTex = createRollingShutterTexture({
    title: 'DESERT  •  MADE IN VIET NAM',
    hoursLabel: 'MỞ CỬA: 07:00 - 23:00',
    accentHex: '#2f2a24',
    slatDarkHex: '#27272a',
    slatLightHex: '#3f3f46',
  });
  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.62, metalness: 0.18 });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'desert_main_door',
      axis: 'x',
      pos: frontGlassZ - 0.16,
      spanCenter: doorCenterX,
      width: 4.10,
      baseY: 0.08,
      topY: 2.84,
      thickness: 0.08,
    },
    shutterMat,
    doorBronzeMat
  );
  const eastShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'desert_east_door',
      axis: 'z',
      pos: eastGlassX + 0.16,
      spanCenter: eastDoorCenterZ,
      width: 4.10,
      baseY: 0.08,
      topY: 2.84,
      thickness: 0.08,
    },
    shutterMat,
    doorBronzeMat
  );

  const porchLight = new THREE.PointLight(0xfff1d6, 4.5, 32.0, 0.95);
  porchLight.position.set(midX, 4.1, 41.8);
  scaledLights.push({ light: porchLight, dayInt: 4.5, nightInt: 18.5, getScale: () => 1.0 - mainShutter.progress });

  const eastPorchLight = new THREE.PointLight(0xfff1d6, 4.4, 32.0, 0.95);
  eastPorchLight.position.set(355.4, 4.1, 55.8);
  scaledLights.push({ light: eastPorchLight, dayInt: 4.4, nightInt: 18.0, getScale: () => 1.0 - eastShutter.progress });

  const hallLight = new THREE.PointLight(0xfffaf0, 5.6, 36.0, 0.95);
  hallLight.position.set(midX, 4.0, 55.0);
  scaledLights.push({ light: hallLight, dayInt: 5.6, nightInt: 21.5, getScale: () => 1.0 - mainShutter.progress });

  const showcaseLight = new THREE.PointLight(0xfff7ed, 5.2, 26.0, 0.95);
  showcaseLight.position.set(346.8, 3.8, 46.8);
  scaledLights.push({ light: showcaseLight, dayInt: 5.2, nightInt: 20.0, getScale: () => 1.0 - mainShutter.progress });

  const eastShowcaseLight = new THREE.PointLight(0xfff7ed, 4.8, 24.0, 0.95);
  eastShowcaseLight.position.set(350.8, 3.8, 50.0);
  scaledLights.push({ light: eastShowcaseLight, dayInt: 4.8, nightInt: 18.5, getScale: () => 1.0 - eastShutter.progress });

  const rearCounterLight = new THREE.PointLight(0xfffaf0, 4.8, 28.0, 0.95);
  rearCounterLight.position.set(341.0, 3.9, 61.5);
  scaledLights.push({ light: rearCounterLight, dayInt: 4.8, nightInt: 18.0, getScale: () => 1.0 - mainShutter.progress });

  const poolTex = createDesertGlowPoolTex();
  const porchPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(porchPoolMat);
  const porchPool = new THREE.Mesh(new THREE.PlaneGeometry(23.6, 6.8), porchPoolMat);
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(midX, 0.042, 41.0);
  staticGroup.add(porchPool);

  const eastPorchPool = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 22.0), porchPoolMat);
  eastPorchPool.rotation.x = -Math.PI / 2;
  eastPorchPool.position.set(356.2, 0.042, 55.8);
  staticGroup.add(eastPorchPool);

  let doorOpenAmount = 0.0;
  let eastDoorOpenAmount = 0.0;
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const update = (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcController?: DesertNpcController | null,
    externalNpcNearDoor?: boolean
  ) => {
    const dt = Math.min(delta, 0.08);
    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isDesertOpenAtHour(h);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (h < 7.0 || h >= 23.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      const nextP = Math.max(0, mainShutter.progress - dt * 1.1);
      setShutterProgress(mainShutter, nextP);
      setShutterProgress(eastShutter, nextP);
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
      setShutterProgress(eastShutter, 1.0);
    } else {
      closingElapsed += dt;
      const canClose = closingElapsed >= 15.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.7) {
        const nextP = Math.min(1.0, mainShutter.progress + dt * 0.85);
        setShutterProgress(mainShutter, nextP);
        setShutterProgress(eastShutter, nextP);
      }
    }
    wasOpen = isOpen;

    // Proximity-activated French double glass doors swinging inward (North +Z & East -X)
    const nearPlayerNorth =
      !!playerPos &&
      Math.abs(playerPos.x - doorCenterX) <= 3.8 &&
      Math.abs(playerPos.z - frontGlassZ) <= 4.2 &&
      playerPos.y <= 3.5;
    const nearPlayerEast =
      !!playerPos &&
      Math.abs(playerPos.x - eastGlassX) <= 4.2 &&
      Math.abs(playerPos.z - eastDoorCenterZ) <= 3.8 &&
      playerPos.y <= 3.5;
    const nearNpcNorth = Boolean(npcController?.hasNpcNearNorthDoor()) || Boolean(externalNpcNearDoor);
    const nearNpcEast = Boolean(npcController?.hasNpcNearEastDoor());

    const northSensorTriggered = nearPlayerNorth || nearNpcNorth;
    const targetNorthDoor = (isOpen || !mainShutter.progress) && northSensorTriggered ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetNorthDoor, Math.min(1, dt * 7.5));
    const northSwing = doorOpenAmount * (Math.PI * 0.45);
    westDoorPivot.rotation.y = -northSwing;
    eastDoorPivot.rotation.y = northSwing;

    const eastSensorTriggered = nearPlayerEast || nearNpcEast;
    const targetEastDoor = (isOpen || !eastShutter.progress) && eastSensorTriggered ? 1.0 : 0.0;
    eastDoorOpenAmount = THREE.MathUtils.lerp(eastDoorOpenAmount, targetEastDoor, Math.min(1, dt * 7.5));
    const eastSwing = eastDoorOpenAmount * (Math.PI * 0.45);
    eastNorthDoorPivot.rotation.y = -Math.PI * 0.5 - eastSwing;
    eastSouthDoorPivot.rotation.y = -Math.PI * 0.5 + eastSwing;

    const litScale = 1.0 - mainShutter.progress;
    fasciaSignMat.emissiveIntensity = (0.06 + lampFactor * 0.20) * litScale;
    rearWallMat.emissiveIntensity = (0.18 + lampFactor * 0.34) * litScale;
    soffitSpotMat.emissiveIntensity = (0.42 + lampFactor * 0.55) * litScale;
    ceilingStripMat.emissiveIntensity = (0.44 + lampFactor * 0.48) * litScale;
    sensorLedMat.emissiveIntensity = isOpen
      ? northSensorTriggered || eastSensorTriggered
        ? 0.95
        : 0.35
      : 0.05;
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getClosedFactor: () => mainShutter.progress,
    update,
  };
}

// =========================================================================
// DESERT BOUTIQUE NPC CONTROLLER (3 STAFF + 8 SHOPPERS + 2 SIDEWALK STROLLERS)
// =========================================================================
const DESERT_PROFILES = [
  { shirt: 0xf8fafc, pants: 0xebe3d3, hair: 0x111827, skinHex: '#fbe0c8' },
  { shirt: 0xa69c92, pants: 0x1e293b, hair: 0x2c1a10, skinHex: '#f5c7a3' },
  { shirt: 0xd9b8a9, pants: 0x374151, hair: 0x18181b, skinHex: '#fbe0c8' },
  { shirt: 0xbc9163, pants: 0x1e293b, hair: 0x3b2314, skinHex: '#e8b48e' },
  { shirt: 0xebe3d3, pants: 0x27272a, hair: 0x111827, skinHex: '#f5c7a3' },
  { shirt: 0x374151, pants: 0xd6d3d1, hair: 0x291c15, skinHex: '#fbe0c8' },
  { shirt: 0xf5f5f4, pants: 0x78716c, hair: 0x1e1b4b, skinHex: '#f5c7a3' },
  { shirt: 0x57534e, pants: 0x18181b, hair: 0x4a2c18, skinHex: '#fbe0c8' },
];

type DesertPhase =
  | 'respawn_wait'
  | 'walk_to_browse'
  | 'browsing'
  | 'walk_to_checkout'
  | 'at_checkout'
  | 'walk_leave';

interface DesertActor {
  id: number;
  root: THREE.Group;
  hipsGroup: THREE.Group;
  torsoMesh: THREE.Mesh;
  leftArm: THREE.Group;
  leftArmMesh: THREE.Mesh;
  rightArm: THREE.Group;
  rightArmMesh: THREE.Mesh;
  leftLeg: THREE.Group;
  leftLegMesh: THREE.Mesh;
  rightLeg: THREE.Group;
  rightLegMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  hairMesh: THREE.Mesh;
  bagGroup: THREE.Group;
  kind: 'staff' | 'shopper' | 'stroller';
  homePos: THREE.Vector3;
  homeYaw: number;
  seed: number;
  walkPhase: number;
  speed: number;
  profileIdx: number;
  phase: DesertPhase;
  pathQueue: THREE.Vector3[];
  pathIdx: number;
  stateTimer: number;
  waitYaw: number;
  browseSpotIdx: number;
  strollDir?: 1 | -1;
  strollPauseTimer?: number;
  strollNextPause?: number;
  exiting: boolean;
  exitDone: boolean;
  exitWaypoints?: THREE.Vector3[];
  exitRef: { idx: number };
  walkPhaseRef: { phase: number };
  glbHandle: GlbHumanHandle;
}

export class DesertNpcController {
  public readonly rootGroup = new THREE.Group();
  private actors: DesertActor[] = [];
  private profileMats: Array<{
    shirt: THREE.MeshStandardMaterial;
    pants: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    faceTex: THREE.Texture;
  }> = [];
  private skinMat: THREE.MeshStandardMaterial;
  private timer = 0;
  private wasOpen: boolean | null = null;
  private closingActive = false;
  private fullyClosedAndEmpty = false;
  private nextSpawnSide = 0;

  private readonly browseSpots = [
    { pos: new THREE.Vector3(341.2, 0.08, 49.0), yaw: 0 }, // Center Folded Table 1
    { pos: new THREE.Vector3(348.2, 0.08, 49.0), yaw: 0 }, // East Garment Island 1
    { pos: new THREE.Vector3(341.2, 0.08, 54.6), yaw: 0 }, // Center Garment Island 2
    { pos: new THREE.Vector3(348.2, 0.08, 54.6), yaw: 0 }, // East Folded Table 2
    { pos: new THREE.Vector3(331.4, 0.08, 54.5), yaw: -Math.PI * 0.5 }, // West Garment Wall
    { pos: new THREE.Vector3(348.6, 0.08, 64.9), yaw: 0 }, // East-Rear Garment Wall
  ];

  constructor(private helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cbb0, roughness: 0.65 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });
    const staffShirtMat = new THREE.MeshStandardMaterial({ color: 0x2f2a24, roughness: 0.65 });
    const bagBodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e4, roughness: 0.58 });
    const bagGoldBandMat = new THREE.MeshStandardMaterial({ color: 0xc28e2b, roughness: 0.45 });

    this.profileMats = DESERT_PROFILES.map((p) => ({
      shirt: new THREE.MeshStandardMaterial({ color: p.shirt, roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.78 }),
      hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.85 }),
      faceTex: helpers.createFaceTexture('happy', p.skinHex),
    }));

    const createActorRig = (
      kind: 'staff' | 'shopper' | 'stroller',
      profileIdx: number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      speed = 1.28
    ): DesertActor => {
      const id = this.actors.length;
      const pm = this.profileMats[profileIdx % this.profileMats.length];
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.set(0, 0.80, 0);
      root.add(hipsGroup);

      const torsoMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.54, 0.24),
        kind === 'staff' ? staffShirtMat : pm.shirt
      );
      torsoMesh.position.y = 0.28;
      hipsGroup.add(torsoMesh);

      const headMesh = helpers.createHeadMesh(this.skinMat, pm.faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), pm.hair);
      hairMesh.position.y = 0.86;
      hipsGroup.add(hairMesh);

      const leftArm = new THREE.Group();
      leftArm.position.set(-0.27, 0.52, 0);
      const leftArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        kind === 'staff' ? staffShirtMat : pm.shirt
      );
      leftArmMesh.position.y = -0.20;
      leftArm.add(leftArmMesh);
      hipsGroup.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.27, 0.52, 0);
      const rightArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        kind === 'staff' ? staffShirtMat : pm.shirt
      );
      rightArmMesh.position.y = -0.20;
      rightArm.add(rightArmMesh);
      hipsGroup.add(rightArm);

      // DESERT Cream & Gold Boutique Shopping Bag
      const bagGroup = new THREE.Group();
      bagGroup.position.set(0.04, -0.52, 0.02);
      const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.30, 0.26), bagBodyMat);
      bagGroup.add(bagMesh);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.20), bagGoldBandMat);
      bagGroup.add(band);
      bagGroup.visible = false;
      rightArm.add(bagGroup);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.60, 0.15), pm.pants);
        leg.position.y = -0.30;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), shoeMat);
        shoe.position.set(0, -0.62, 0.03);
        p.add(shoe);
        hipsGroup.add(p);
        return { group: p, legMesh: leg };
      };
      const lLeg = makeLeg(-0.10);
      const rLeg = makeLeg(0.10);

      root.position.set(x, y, z);
      root.rotation.y = yaw;
      this.rootGroup.add(root);

      const seed = id * 1.87;
      const spec =
        kind === 'staff'
          ? id <= 1
            ? CASHIER_NPC_MODEL
            : pickStationaryCivilianModel(id + 151)
          : kind === 'stroller'
            ? pickOutsideNpcModel(id + 163)
            : pickShopCustomerModel(id + 161);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: root,
        fallbackMeshes: [hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: kind === 'staff' ? (id <= 1 ? 'Checkout' : 'Idle') : kind === 'stroller' ? 'Walk' : 'Idle',
        phaseOffset: seed * 0.37,
      });

      const actor: DesertActor = {
        id,
        root,
        hipsGroup,
        torsoMesh,
        leftArm,
        leftArmMesh,
        rightArm,
        rightArmMesh,
        leftLeg: lLeg.group,
        leftLegMesh: lLeg.legMesh,
        rightLeg: rLeg.group,
        rightLegMesh: rLeg.legMesh,
        headMesh,
        hairMesh,
        bagGroup,
        kind,
        homePos: new THREE.Vector3(x, y, z),
        homeYaw: yaw,
        seed,
        walkPhase: seed * 0.6,
        speed,
        profileIdx,
        phase: 'respawn_wait',
        pathQueue: [],
        pathIdx: 0,
        stateTimer: 0,
        waitYaw: yaw,
        browseSpotIdx: id % this.browseSpots.length,
        strollDir: id % 2 === 0 ? 1 : -1,
        strollPauseTimer: 0,
        strollNextPause: 5.0 + (id % 3) * 3.0,
        exiting: false,
        exitDone: false,
        exitWaypoints:
          kind === 'staff'
            ? [
                new THREE.Vector3(335.0, 0.08, 59.5),
                new THREE.Vector3(335.0, 0.08, 46.8),
                new THREE.Vector3(335.0, 0.02, 41.2),
                new THREE.Vector3(325.5 + id * 1.5, 0.02, 39.8),
              ]
            : undefined,
        exitRef: { idx: 0 },
        walkPhaseRef: { phase: seed },
        glbHandle,
      };
      this.actors.push(actor);
      return actor;
    };

    // 1. Three DESERT Boutique Associates (2 Cashiers + 1 Floor Stylist)
    createActorRig('staff', 0, 339.2, 0.08, 65.0, Math.PI);
    createActorRig('staff', 1, 342.8, 0.08, 65.0, Math.PI);
    createActorRig('staff', 2, 345.0, 0.08, 49.0, -Math.PI * 0.45);

    // 2. Eight Dynamic Rotating Shoppers
    for (let i = 0; i < 8; i++) {
      createActorRig('shopper', i % this.profileMats.length, 335.0, 0.02, 40.5, 0, 1.24 + (i % 3) * 0.08);
    }

    // 3. Two Boulevard Sidewalk Strollers + One Đường Sơn Tây East Sidewalk Stroller
    createActorRig('stroller', 2, 331.0, 0.02, 39.3, Math.PI * 0.5, 1.20);
    createActorRig('stroller', 5, 349.0, 0.02, 40.2, -Math.PI * 0.5, 1.16);
    createActorRig('stroller', 4, 358.2, 0.02, 50.0, 0, 1.18);
  }

  private applyShopperProfile(a: DesertActor, nextIdx: number) {
    a.profileIdx = nextIdx % this.profileMats.length;
    const pm = this.profileMats[a.profileIdx];
    a.torsoMesh.material = pm.shirt;
    a.leftArmMesh.material = pm.shirt;
    a.rightArmMesh.material = pm.shirt;
    a.leftLegMesh.material = pm.pants;
    a.rightLegMesh.material = pm.pants;
    a.hairMesh.material = pm.hair;
    if (Array.isArray(a.headMesh.material) && a.headMesh.material[4]) {
      const faceMat = a.headMesh.material[4] as THREE.MeshStandardMaterial;
      if (faceMat.map !== pm.faceTex) {
        faceMat.map = pm.faceTex;
        faceMat.needsUpdate = true;
      }
    }
  }

  private assignNewShopperArrival(a: DesertActor, rotateProfile: boolean) {
    if (rotateProfile) {
      this.applyShopperProfile(a, a.profileIdx + 3 + (a.id % 4));
    }
    a.bagGroup.visible = false;
    a.leftLeg.rotation.x = 0;
    a.rightLeg.rotation.x = 0;

    const sideSlot = this.nextSpawnSide++ % 3;
    a.browseSpotIdx = (a.browseSpotIdx + 1) % this.browseSpots.length;
    const spot = this.browseSpots[a.browseSpotIdx];

    if (sideSlot === 2) {
      // Arrive from Đường Sơn Tây Nam Sidewalk through East French Glass Entrance (Z = 61.0)
      const fromSouth = a.id % 2 === 0;
      a.root.position.set(358.2, 0.02, fromSouth ? 68.5 : 44.5);
      a.root.visible = true;
      a.pathQueue = [
        new THREE.Vector3(355.6, 0.02, 61.0),
        new THREE.Vector3(350.6, 0.08, 61.0),
        new THREE.Vector3(345.0, 0.08, 59.5),
        new THREE.Vector3(345.0, 0.08, 54.0),
        spot.pos.clone(),
      ];
    } else {
      const fromEast = sideSlot === 0;
      const spawnX = fromEast ? 354.5 : 326.2;
      const spawnZ = 39.2 + (a.id % 3) * 0.45;
      a.root.position.set(spawnX, 0.02, spawnZ);
      a.root.visible = true;
      a.pathQueue = [
        new THREE.Vector3(335.0, 0.02, 41.6),
        new THREE.Vector3(335.0, 0.08, 46.8),
        new THREE.Vector3(335.0, 0.08, 49.0),
        spot.pos.clone(),
      ];
    }
    a.pathIdx = 0;
    a.waitYaw = spot.yaw;
    a.phase = 'walk_to_browse';
    a.glbHandle.setAnimState('Walk');
  }

  private snapClosed() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.root.visible = false;
      a.exiting = false;
      a.exitDone = true;
      a.bagGroup.visible = false;
      a.glbHandle.setAnimState('Idle');
    }
  }

  private reopen() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = false;

    let shopperIdx = 0;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = false;
      a.exitDone = false;
      a.exitRef.idx = 0;

      if (a.kind === 'staff') {
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.glbHandle.setAnimState(a.id <= 1 ? 'Checkout' : 'Idle');
        continue;
      }

      if (a.kind === 'stroller') {
        a.root.visible = true;
        a.root.position.copy(a.homePos);
        a.root.rotation.y = a.homeYaw;
        a.bagGroup.visible = i % 2 === 1;
        a.glbHandle.setAnimState('Walk');
        continue;
      }

      if (shopperIdx < 4) {
        const spot = this.browseSpots[(shopperIdx * 2) % this.browseSpots.length];
        a.browseSpotIdx = (shopperIdx * 2) % this.browseSpots.length;
        a.bagGroup.visible = false;
        a.root.visible = true;
        a.root.position.copy(spot.pos);
        a.root.rotation.y = spot.yaw;
        a.waitYaw = spot.yaw;
        a.phase = 'browsing';
        a.stateTimer = 3.5 + shopperIdx * 2.5;
        a.glbHandle.setAnimState('Idle');
      } else {
        a.root.visible = false;
        a.phase = 'respawn_wait';
        a.stateTimer = (shopperIdx - 4) * 1.4;
        a.glbHandle.setAnimState('Idle');
      }
      shopperIdx++;
    }
  }

  private beginClosing() {
    this.closingActive = true;
    this.fullyClosedAndEmpty = false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.exiting = true;
      a.exitRef.idx = 0;

      if (a.kind === 'staff') {
        a.exitDone = false;
        a.glbHandle.setAnimState('Walk');
        continue;
      }
      if (a.kind === 'stroller') {
        a.exitDone = true;
        a.root.visible = false;
        a.glbHandle.setAnimState('Idle');
        continue;
      }
      if (!a.root.visible || a.phase === 'respawn_wait' || a.root.position.z < 43.0) {
        a.exitDone = true;
        a.root.visible = false;
        a.glbHandle.setAnimState('Idle');
        continue;
      }

      a.exitDone = false;
      const exitSlot = i % 3;
      if (exitSlot === 2) {
        a.exitWaypoints = [
          new THREE.Vector3(350.6, 0.08, 61.0),
          new THREE.Vector3(355.6, 0.02, 61.0),
          new THREE.Vector3(358.2, 0.02, 68.5),
        ];
      } else {
        const leaveEast = exitSlot === 0;
        a.exitWaypoints = [
          new THREE.Vector3(335.0, 0.08, 48.2),
          new THREE.Vector3(335.0, 0.02, 41.6),
          new THREE.Vector3(leaveEast ? 354.5 : 326.2, 0.02, 39.8),
        ];
      }
      a.glbHandle.setAnimState('Walk');
    }
  }

  public hasNpcNearNorthDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible || a.kind === 'stroller') continue;
      const p = a.root.position;
      if (p.x >= 332.6 && p.x <= 337.4 && p.z >= 41.0 && p.z <= 47.4) return true;
    }
    return false;
  }

  public hasNpcNearEastDoor(): boolean {
    if (this.fullyClosedAndEmpty) return false;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.root.visible || a.kind === 'stroller') continue;
      const p = a.root.position;
      if (p.x >= 349.6 && p.x <= 356.0 && p.z >= 58.6 && p.z <= 63.4) return true;
    }
    return false;
  }

  public hasNpcNearDoor(): boolean {
    return this.hasNpcNearNorthDoor() || this.hasNpcNearEastDoor();
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  private stepPath(a: DesertActor, dt: number): boolean {
    if (a.pathIdx >= a.pathQueue.length) return true;
    const target = a.pathQueue[a.pathIdx];
    const dx = target.x - a.root.position.x;
    const dy = target.y - a.root.position.y;
    const dz = target.z - a.root.position.z;
    const distXZ = Math.hypot(dx, dz);
    const dist3D = Math.hypot(dx, dy, dz);
    const step = a.speed * dt;

    if (dist3D <= step + 0.06) {
      a.root.position.copy(target);
      a.pathIdx++;
      return a.pathIdx >= a.pathQueue.length;
    }

    const r = step / dist3D;
    a.root.position.x += dx * r;
    a.root.position.y += dy * r;
    a.root.position.z += dz * r;

    if (distXZ > 0.03) {
      const yaw = Math.atan2(dx, dz);
      let diff = yaw - a.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.root.rotation.y += diff * Math.min(1, dt * 8.5);
    }

    a.walkPhase += dt * 5.8;
    const swing = Math.sin(a.walkPhase) * 0.40;
    a.leftLeg.rotation.x = swing;
    a.rightLeg.rotation.x = -swing;
    a.leftArm.rotation.x = -swing * 0.55;
    a.rightArm.rotation.x = a.bagGroup.visible ? 0.14 : swing * 0.55;
    return false;
  }

  public update(delta: number, rawHour = 10.0) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    const h = ((rawHour % 24) + 24) % 24;
    const isOpen = isDesertOpenAtHour(h);

    if (this.wasOpen === null) {
      if (!isOpen) this.snapClosed();
      else this.reopen();
    } else if (!isOpen && this.wasOpen) {
      this.beginClosing();
    } else if (isOpen && !this.wasOpen) {
      this.reopen();
    }
    this.wasOpen = isOpen;

    if (this.fullyClosedAndEmpty) return;

    let allCleared = true;
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];

      if (this.closingActive && a.exiting) {
        if (a.exitDone) {
          a.root.visible = false;
          continue;
        }
        allCleared = false;
        const exitPts = a.exitWaypoints ?? [
          new THREE.Vector3(335.0, 0.08, 48.2),
          new THREE.Vector3(335.0, 0.02, 41.6),
          new THREE.Vector3(326.2 + i * 2.0, 0.02, 39.8),
        ];
        const done = advanceNpcExitPath(
          a.root,
          exitPts,
          a.exitRef,
          1.55,
          dt,
          { legL: a.leftLeg, legR: a.rightLeg, armL: a.leftArm, armR: a.rightArm },
          a.walkPhaseRef
        );
        if (done) {
          a.exitDone = true;
          a.root.visible = false;
          a.glbHandle.setAnimState('Idle');
        } else {
          a.glbHandle.setAnimState('Walk');
        }
        continue;
      }

      if (a.kind === 'staff') {
        a.root.visible = true;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.25;
        a.rightArm.rotation.x = -0.18 + Math.sin(this.timer * 2.0 + a.seed) * 0.14;
        a.glbHandle.setAnimState(a.id <= 1 ? 'Checkout' : 'Idle');
        continue;
      }

      if (a.kind === 'stroller') {
        a.root.visible = true;
        const isEastSidewalkStroller = a.homePos.x > 356.0;
        if ((a.strollPauseTimer ?? 0) > 0) {
          a.strollPauseTimer! -= dt;
          a.glbHandle.setAnimState('Idle');
          const lookYaw = isEastSidewalkStroller ? -Math.PI * 0.5 : 0; // Face West toward East showcase or South toward North showcase
          let diff = lookYaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 6.5);
          a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
          a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
          a.headMesh.rotation.y = Math.sin(this.timer * 1.5 + a.seed) * 0.22;
        } else {
          a.glbHandle.setAnimState('Walk');
          const dir = a.strollDir ?? 1;
          if (isEastSidewalkStroller) {
            a.root.position.z += dir * a.speed * dt;
            const targetYaw = dir > 0 ? 0 : Math.PI;
            let diff = targetYaw - a.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.root.rotation.y += diff * Math.min(1, dt * 8.0);
          } else {
            a.root.position.x += dir * a.speed * dt;
            const targetYaw = dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
            let diff = targetYaw - a.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.root.rotation.y += diff * Math.min(1, dt * 8.0);
          }

          a.walkPhase += dt * 5.6;
          const swing = Math.sin(a.walkPhase) * 0.38;
          a.leftLeg.rotation.x = swing;
          a.rightLeg.rotation.x = -swing;
          a.leftArm.rotation.x = -swing * 0.52;
          a.rightArm.rotation.x = a.bagGroup.visible ? 0.14 : swing * 0.52;
          a.headMesh.rotation.y = Math.sin(this.timer * 1.1 + a.seed) * 0.12;

          a.strollNextPause = (a.strollNextPause ?? 5.0) - dt;
          if (isEastSidewalkStroller) {
            if ((a.strollNextPause ?? 0) <= 0 && a.root.position.z >= 47.0 && a.root.position.z <= 53.0) {
              a.strollPauseTimer = 2.6 + (a.id % 2) * 1.1;
              a.strollNextPause = 9.0 + (a.id % 3) * 2.5;
            }
            if (a.root.position.z >= 67.0) a.strollDir = -1;
            else if (a.root.position.z <= 43.5) a.strollDir = 1;
          } else {
            if ((a.strollNextPause ?? 0) <= 0 && a.root.position.x >= 342.0 && a.root.position.x <= 351.0) {
              a.strollPauseTimer = 2.6 + (a.id % 2) * 1.2;
              a.strollNextPause = 9.0 + (a.id % 3) * 2.5;
            }
            if (a.root.position.x >= 353.8) a.strollDir = -1;
            else if (a.root.position.x <= 327.0) a.strollDir = 1;
          }
        }
        continue;
      }

      // Dynamic Shopper Lifecycle
      if (a.phase === 'respawn_wait') {
        a.stateTimer -= dt;
        if (a.stateTimer <= 0 && isOpen) {
          this.assignNewShopperArrival(a, true);
        }
        continue;
      }

      if (a.phase === 'walk_to_browse') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'browsing';
          a.stateTimer = 4.5 + (a.id % 4) * 2.0;
          a.glbHandle.setAnimState('Idle');
        }
        continue;
      }

      if (a.phase === 'browsing') {
        a.glbHandle.setAnimState('Idle');
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 6.5);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightArm.rotation.x = -0.30 + Math.sin(this.timer * 2.2 + a.seed) * 0.14;
        a.headMesh.rotation.y = Math.sin(this.timer * 1.3 + a.seed) * 0.28;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          const checkoutX = a.id % 2 === 0 ? 339.2 : 342.8;
          a.pathQueue = [
            new THREE.Vector3(335.0, 0.08, 54.0),
            new THREE.Vector3(335.0, 0.08, 60.8),
            new THREE.Vector3(checkoutX, 0.08, 61.6),
          ];
          a.pathIdx = 0;
          a.waitYaw = 0;
          a.phase = 'walk_to_checkout';
          a.glbHandle.setAnimState('Walk');
        }
        continue;
      }

      if (a.phase === 'walk_to_checkout') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.phase = 'at_checkout';
          a.stateTimer = 3.2 + (a.id % 3) * 1.1;
          a.glbHandle.setAnimState('Checkout');
        }
        continue;
      }

      if (a.phase === 'at_checkout') {
        a.glbHandle.setAnimState('Checkout');
        let diff = a.waitYaw - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 6.5);
        a.leftLeg.rotation.x = THREE.MathUtils.lerp(a.leftLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.rightLeg.rotation.x = THREE.MathUtils.lerp(a.rightLeg.rotation.x, 0, Math.min(1, dt * 10));
        a.headMesh.rotation.y = Math.sin(this.timer * 1.6 + a.seed) * 0.18;

        a.stateTimer -= dt;
        if (a.stateTimer <= 0) {
          a.bagGroup.visible = true;
          const leaveSlot = a.id % 3;
          if (leaveSlot === 2) {
            a.pathQueue = [
              new THREE.Vector3(346.8, 0.08, 61.0),
              new THREE.Vector3(355.6, 0.02, 61.0),
              new THREE.Vector3(358.2, 0.02, a.id % 2 === 0 ? 68.5 : 44.5),
            ];
          } else {
            const leaveEast = leaveSlot === 0;
            a.pathQueue = [
              new THREE.Vector3(335.0, 0.08, 58.0),
              new THREE.Vector3(335.0, 0.08, 46.8),
              new THREE.Vector3(335.0, 0.02, 41.6),
              new THREE.Vector3(leaveEast ? 354.5 : 326.2, 0.02, 39.8),
            ];
          }
          a.pathIdx = 0;
          a.phase = 'walk_leave';
          a.glbHandle.setAnimState('Walk');
        }
        continue;
      }

      if (a.phase === 'walk_leave') {
        a.glbHandle.setAnimState('Walk');
        if (this.stepPath(a, dt)) {
          a.root.visible = false;
          a.phase = 'respawn_wait';
          a.stateTimer = 1.6 + (a.id % 3) * 1.2;
          a.glbHandle.setAnimState('Idle');
        }
      }
    }

    if (this.closingActive && allCleared) {
      this.closingActive = false;
      this.fullyClosedAndEmpty = true;
    }
  }
}
