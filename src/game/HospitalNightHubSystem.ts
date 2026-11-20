import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  GUARD_NPC_MODEL,
  pickDoctorNpcModel,
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import { buildCityCarMesh, buildCityMotorbikeMesh } from './CityVehicleMeshBuilder';

export interface HospitalNightHubBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number) => void;
}

// =========================================================================
// COLLIDERS: KHU ẨM THỰC ĐÊM, TRẠM SẠC XE ĐIỆN & TỔ HỢP TIỆN ÍCH THĂM BỆNH 24/7
// Footprint: X = -342.0 .. -241.0, Z = -18.0 .. +15.6
// Directly faces International General Hospital across the West Boulevard!
// =========================================================================

export const HOSPITAL_NIGHT_HUB_COLLIDERS: IntersectionColliderBox[] = [
  // Perimeter Hedges & North Boundary Wall (X = -342 .. -241; open promenade at X = -300, Z = -0.5..+15.0)
  { minX: -342.4, maxX: -341.2, minZ: -18.2, maxZ: 15.8, floor: 1 }, // Far West perimeter hedge
  { minX: -300.4, maxX: -299.2, minZ: -18.2, maxZ: -0.5, floor: 1 }, // Divider hedge behind Food Court
  { minX: -342.2, maxX: -240.8, minZ: -18.4, maxZ: -17.2, floor: 1 }, // North rear boundary
  // Front South Hedge Segments (openings: Utility Plaza -335..-306, Food Court Arch -286..-276, Lay-by -263..-244)
  { minX: -341.8, maxX: -335.4, minZ: 14.9, maxZ: 15.8, floor: 1 },
  { minX: -306.0, maxX: -286.2, minZ: 14.9, maxZ: 15.8, floor: 1 },
  { minX: -275.8, maxX: -263.4, minZ: 14.9, maxZ: 15.8, floor: 1 },
  // Entrance Archway Pillars
  { minX: -286.0, maxX: -285.1, minZ: 14.3, maxZ: 15.3, floor: 1 },
  { minX: -276.9, maxX: -276.0, minZ: 14.3, maxZ: 15.3, floor: 1 },

  // 4 Food Court Kiosks along North Arcade (Z = -15.6 .. -10.2)
  { minX: -297.2, maxX: -291.6, minZ: -15.8, maxZ: -10.2, floor: 1 }, // Kiosk 1: Cháo & Súp
  { minX: -289.4, maxX: -283.6, minZ: -15.8, maxZ: -10.2, floor: 1 }, // Kiosk 2: Phở & Cơm 24/7
  { minX: -281.4, maxX: -275.6, minZ: -15.8, maxZ: -10.2, floor: 1 }, // Kiosk 3: Cà Phê & Trà Sữa
  { minX: -273.4, maxX: -267.6, minZ: -15.8, maxZ: -10.2, floor: 1 }, // Kiosk 4: Trái Cây & Nước Ép

  // 8 Outdoor Dining Table Sets (2 rows × 4 tables)
  ...[-294.0, -286.5, -279.0, -271.5].flatMap((tx) => [
    { minX: tx - 1.35, maxX: tx + 1.35, minZ: -5.4, maxZ: -2.6, floor: 1 },
    { minX: tx - 1.35, maxX: tx + 1.35, minZ: 2.6, maxZ: 5.4, floor: 1 },
  ]),

  // Automated Battery Swap Cabinet & 2 Rows of EV Charging Pedestals + Electric Scooters
  { minX: -257.8, maxX: -249.8, minZ: -16.4, maxZ: -14.8, floor: 1 }, // Battery swap locker
  { minX: -261.5, maxX: -246.2, minZ: -13.6, maxZ: -10.8, floor: 1 }, // EV Charging Row N
  { minX: -261.5, maxX: -246.2, minZ: -7.6, maxZ: -4.8, floor: 1 }, // EV Charging Row S

  // Covered Pick-up Waiting Shelter & Short-Term Motorbike Bays
  { minX: -262.6, maxX: -254.4, minZ: 2.8, maxZ: 5.6, floor: 1 }, // Waiting shelter bench + back wall
  { minX: -252.2, maxX: -243.4, minZ: 2.2, maxZ: 6.2, floor: 1 }, // Quick motorbike parking bay + kiosk

  // 2 Waiting Pick-up Vehicles in Boulevard Lay-by
  { minX: -261.2, maxX: -256.4, minZ: 10.6, maxZ: 13.0, floor: 1 }, // Family MPV waiting
  { minX: -252.4, maxX: -247.6, minZ: 10.6, maxZ: 13.0, floor: 1 }, // Ride-hail / Taxi waiting

  // =========================================================================
  // TỔ HỢP TIỆN ÍCH THĂM BỆNH 24/7 (X = -340.0 .. -302.5, Z = -15.8 .. +13.0)
  // =========================================================================
  // Outer Side & Rear Building Walls
  { minX: -339.8, maxX: -339.1, minZ: -15.8, maxZ: 5.2, floor: 1 }, // West outer wall
  { minX: -303.4, maxX: -302.7, minZ: -15.8, maxZ: 5.2, floor: 1 }, // East outer wall
  { minX: -339.8, maxX: -302.7, minZ: -15.8, maxZ: -15.1, floor: 1 }, // North rear wall
  // Interior Dividing Walls between the 3 Walkable Shops
  { minX: -327.7, maxX: -327.1, minZ: -15.5, maxZ: 5.2, floor: 1 }, // Between Café/Laundry & Pharmacy
  { minX: -315.1, maxX: -314.5, minZ: -15.5, maxZ: 5.2, floor: 1 }, // Between Pharmacy & Gift/Flower Mart
  // Front Glass Storefront Walls (leaving 3.6m wide open doorways at each shop!)
  { minX: -339.6, maxX: -335.4, minZ: 4.7, maxZ: 5.3, floor: 1 }, // Café front W
  { minX: -331.6, maxX: -327.4, minZ: 4.7, maxZ: 5.3, floor: 1 }, // Café front E
  { minX: -327.4, maxX: -323.0, minZ: 4.7, maxZ: 5.3, floor: 1 }, // Pharmacy front W
  { minX: -319.0, maxX: -314.8, minZ: 4.7, maxZ: 5.3, floor: 1 }, // Pharmacy front E
  { minX: -314.8, maxX: -310.6, minZ: 4.7, maxZ: 5.3, floor: 1 }, // Minimart front W
  { minX: -306.8, maxX: -302.9, minZ: 4.7, maxZ: 5.3, floor: 1 }, // Minimart front E
  // Store 3 (Café & 24/7 Laundry) Interior Furniture
  { minX: -339.1, maxX: -337.9, minZ: -12.0, maxZ: -2.0, floor: 1 }, // 4 Commercial Washer/Dryers
  { minX: -336.0, maxX: -328.4, minZ: -14.8, maxZ: -11.4, floor: 1 }, // Espresso bar counter
  { minX: -331.2, maxX: -328.6, minZ: -6.5, maxZ: -1.5, floor: 1 }, // Indoor sofa booth
  // Store 2 (GPP Pharmacy & Medical Equipment) Interior Furniture
  { minX: -326.8, maxX: -315.6, minZ: -15.0, maxZ: -13.6, floor: 1 }, // Back medicine shelves
  { minX: -325.4, maxX: -317.2, minZ: -11.2, maxZ: -9.8, floor: 1 }, // Pharmacist prescription counter
  { minX: -326.8, maxX: -324.4, minZ: -6.2, maxZ: -0.5, floor: 1 }, // Wheelchair & medical equipment display
  // Store 1 (Gift Hamper, Flowers & Convenience 24/7) Interior Furniture
  { minX: -304.6, maxX: -303.4, minZ: -13.5, maxZ: -2.5, floor: 1 }, // Refrigerated drink & milk wall
  { minX: -314.5, maxX: -313.5, minZ: -10.8, maxZ: -4.2, floor: 1 }, // Minimart snack gondola along West partition
  { minX: -311.2, maxX: -307.6, minZ: -8.5, maxZ: -4.2, floor: 1 }, // Center Flower & Fruit Gift Island
  { minX: -313.8, maxX: -308.6, minZ: -14.2, maxZ: -12.4, floor: 1 }, // Checkout counter
  // Outdoor Café Terrace Tables (Z = 8.4) & Central Night Food Court Directory Totem
  ...[-336.0, -331.0, -321.5, -310.0].map((tx) => ({
    minX: tx - 1.25,
    maxX: tx + 1.25,
    minZ: 7.2,
    maxZ: 9.6,
    floor: 1,
  })),
  { minX: -288.2, maxX: -286.6, minZ: 10.6, maxZ: 12.2, floor: 1 },
];

function drawHubText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startPx: number,
  minPx: number,
  weight = '900'
) {
  let fontSize = startPx;
  while (fontSize > minPx) {
    ctx.font = `${weight} ${fontSize}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
  ctx.font = `${weight} ${fontSize}px system-ui, sans-serif`;
  ctx.fillText(text, x, y, maxWidth);
}

function createHubBannerTex(
  title: string,
  sub: string,
  bgHex: string,
  borderHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, bgHex);
  grad.addColorStop(0.5, bgHex);
  grad.addColorStop(1, bgHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, c.width - 48, c.height - 48);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  drawHubText(ctx, title, c.width / 2, 92, c.width - 80, 66, 32, '900');
  ctx.fillStyle = accentHex;
  drawHubText(ctx, sub, c.width / 2, 178, c.width - 80, 38, 20, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMenuBoardTex(title: string, items: string[], bgHex: string, accentHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, c.width, 82);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  drawHubText(ctx, title, c.width / 2, 42, c.width - 36, 36, 18, '900');

  ctx.fillStyle = accentHex;
  items.forEach((line, idx) => {
    drawHubText(ctx, line, c.width / 2, 126 + idx * 56, c.width - 44, 28, 16, '800');
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBladeSignTex(top: string, bottom: string, bgHex: string, accentHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 236, 492);
  ctx.fillStyle = accentHex;
  ctx.fillRect(24, 34, 208, 76);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText('24/7', 128, 72);
  ctx.fillStyle = '#ffffff';
  drawHubText(ctx, top, 128, 225, 208, 44, 24, '900');
  ctx.fillStyle = accentHex;
  drawHubText(ctx, bottom, 128, 340, 208, 36, 20, '800');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createMedicalCrossBadgeTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 236, 236);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(102, 42, 52, 172);
  ctx.fillRect(42, 102, 172, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHubGlowPoolTex(innerRgba: string, midRgba: string, outerRgba: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.5, midRgba);
  grad.addColorStop(1, outerRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHospitalNightHubStructure(): HospitalNightHubBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];
  const evPulseMats: THREE.MeshStandardMaterial[] = [];

  // Shared PBR Materials
  const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.8 });
  const warmDeckMat = new THREE.MeshStandardMaterial({ color: 0xc29568, roughness: 0.68 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.92 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const silverFrameMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.7 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.65 });
  const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const evGreenMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });
  neonMats.push(evGreenMat);
  const archAmberLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.22,
  });
  neonMats.push(archAmberLedMat);
  const evPadMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.55 });
  const yellowPaintMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const whitePaintMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
  const flowerBushMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.85 });
  const warmBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });
  lanternMats.push(warmBulbMat);

  const lanternRedMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
    roughness: 0.35,
  });
  lanternMats.push(lanternRedMat);

  const lanternGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.35,
  });
  lanternMats.push(lanternGoldMat);

  const warmPoolMat = new THREE.MeshBasicMaterial({
    map: createHubGlowPoolTex('rgba(255, 240, 178, 0.42)', 'rgba(253, 224, 71, 0.18)', 'rgba(253, 224, 71, 0)'),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(warmPoolMat);

  const emeraldPoolMat = new THREE.MeshBasicMaterial({
    map: createHubGlowPoolTex('rgba(167, 243, 208, 0.38)', 'rgba(16, 185, 129, 0.16)', 'rgba(16, 185, 129, 0)'),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(emeraldPoolMat);

  const addGroundGlowPool = (x: number, z: number, size: number, mat: THREE.MeshBasicMaterial, y = 0.032) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    staticGroup.add(p);
  };

  const addBox = (
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
    mat: THREE.Material,
    noMerge = false
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ), mat);
    m.position.set((minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5);
    if (noMerge) m.userData.noMerge = true;
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. BASE PLAZA, NORTH/WEST PERIMETER HEDGES & BOULEVARD LAY-BY APRON
  // =========================================================================
  addBox(-342.2, -241.0, -0.25, 0.0, -18.2, 15.6, plazaStoneMat);
  // Warm timber patio slab for Night Food Court (X = -298.5 .. -265.5, Z = -16.5 .. +13.5)
  addBox(-298.5, -265.5, 0.0, 0.025, -16.5, 13.5, warmDeckMat);
  // Subtle stone walkway pavers between Food Court and 24/7 Utility Complex
  addBox(-341.0, -298.5, 0.0, 0.018, 5.2, 14.8, plazaStoneMat);

  // Asphalt Pick-up & Drop-off Lay-by on SE corner (X = -263.5 .. -242.0, Z = 6.5 .. 15.6)
  const laybyPad = new THREE.Mesh(new THREE.PlaneGeometry(21.5, 9.2), asphaltMat);
  laybyPad.rotation.x = -Math.PI / 2;
  laybyPad.position.set(-252.75, 0.012, 11.0);
  staticGroup.add(laybyPad);

  // EV Charging Courtyard bright concrete apron
  const evCourt = new THREE.Mesh(new THREE.PlaneGeometry(21.0, 18.0), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 }));
  evCourt.rotation.x = -Math.PI / 2;
  evCourt.position.set(-253.0, 0.012, -7.2);
  staticGroup.add(evCourt);

  // Perimeter Hedges (open promenade at X = -300, Z = -0.5..15.0 connecting to Utility Complex!)
  addBox(-342.2, -341.2, 0, 0.9, -18.0, 15.6, hedgeMat); // Far West edge
  addBox(-300.2, -299.2, 0, 0.9, -18.0, -0.5, hedgeMat); // Partial divider behind Food Court
  addBox(-342.0, -241.0, 0, 1.1, -18.2, -17.3, hedgeMat); // North back edge
  addBox(-341.6, -335.5, 0, 0.85, 15.0, 15.7, hedgeMat); // South front Far W
  addBox(-305.8, -286.4, 0, 0.85, 15.0, 15.7, hedgeMat); // South front W
  addBox(-275.6, -263.6, 0, 0.85, 15.0, 15.7, hedgeMat); // South front Mid

  // Sleek Plaza Pedestrian Lantern Poles along the Front Promenade (Z = 14.3, clear of doorways!)
  const addPlazaLamp = (lx: number, lz: number, poolMat: THREE.MeshBasicMaterial = warmPoolMat) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.6, 10), darkSteelMat);
    post.position.set(lx, 1.8, lz);
    staticGroup.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.55), darkSteelMat);
    arm.position.set(lx, 3.56, lz - 0.20);
    staticGroup.add(arm);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), warmBulbMat);
    globe.position.set(lx, 3.42, lz - 0.42);
    staticGroup.add(globe);
    addGroundGlowPool(lx, lz - 1.2, 11.5, poolMat, 0.036);
  };
  [-338.5, -327.4, -314.8, -303.0, -290.5].forEach((lx) => addPlazaLamp(lx, 14.3, warmPoolMat));

  // Entrance Archway Facing Hospital Main Gate (X = -285.5 .. -276.5, Z = 14.8) with glowing light columns
  addBox(-285.85, -285.15, 0, 4.45, 14.45, 15.15, darkSteelMat);
  addBox(-276.85, -276.15, 0, 4.45, 14.45, 15.15, darkSteelMat);
  // Glowing vertical warm LED strips on both arch pillars
  addBox(-285.3, -285.12, 0.35, 4.25, 14.62, 15.18, archAmberLedMat);
  addBox(-276.88, -276.70, 0.35, 4.25, 14.62, 15.18, archAmberLedMat);
  addBox(-286.2, -275.8, 4.2, 4.65, 14.3, 15.3, darkSteelMat);
  const mainArchTex = createHubBannerTex(
    'PHỐ ẨM THỰC ĐÊM • TRẠM SẠC XE ĐIỆN',
    'PHỤC VỤ 24/7 • CHÁO • PHỞ • CÀ PHÊ • SẠC PIN & ĐÓN KHÁCH VIỆN',
    '#0f172a',
    '#f59e0b',
    '#fde68a'
  );
  const mainArchMat = new THREE.MeshStandardMaterial({
    map: mainArchTex,
    emissive: 0xffffff,
    emissiveMap: mainArchTex,
    emissiveIntensity: 0.95,
    roughness: 0.25,
  });
  neonMats.push(mainArchMat);
  const archSignFront = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.65), mainArchMat);
  archSignFront.position.set(-281.0, 5.45, 15.15);
  staticGroup.add(archSignFront);
  const archSignBack = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.65), mainArchMat);
  archSignBack.rotation.y = Math.PI;
  archSignBack.position.set(-281.0, 5.45, 14.45);
  staticGroup.add(archSignBack);
  addBox(-285.9, -276.1, 4.55, 6.32, 14.55, 15.05, darkSteelMat);
  addGroundGlowPool(-281.0, 13.6, 12.0, warmPoolMat, 0.035);

  // Illuminated Directory Totem next to Food Court Plaza (`X = -287.4, Z = 11.4`)
  addBox(-288.0, -286.8, 0, 2.75, 11.1, 11.7, darkSteelMat);
  const totemTex = createBladeSignTex('ẨM THỰC ĐÊM', 'SẠC XE • 24/7', '#0f172a', '#fbbf24');
  const totemMat = new THREE.MeshStandardMaterial({
    map: totemTex,
    emissive: 0xffffff,
    emissiveMap: totemTex,
    emissiveIntensity: 0.9,
  });
  neonMats.push(totemMat);
  const totemFront = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.35), totemMat);
  totemFront.position.set(-287.4, 1.45, 11.72);
  staticGroup.add(totemFront);
  const totemBack = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.35), totemMat);
  totemBack.rotation.y = Math.PI;
  totemBack.position.set(-287.4, 1.45, 11.08);
  staticGroup.add(totemBack);

  // =========================================================================
  // 2. 4 COMPOSITE NIGHT FOOD COURT KIOSKS (CHÁO, PHỞ-CƠM, CÀ PHÊ, TRÁI CÂY)
  // =========================================================================
  const kioskDefs: Array<{
    cx: number;
    title: string;
    items: string[];
    wallHex: number;
    interiorHex: number;
    bannerBg: string;
    accentHex: string;
    awningStripeHex: number;
  }> = [
    {
      cx: -294.4,
      title: 'CHÁO DINH DƯỠNG • SÚP',
      items: ['CHÁO GÀ ÁC • CHÁO THỊT BẰM', 'SÚP CUA • SỮA HẠT NÓNG'],
      wallHex: 0x0f766e,
      interiorHex: 0xfef3c7,
      bannerBg: '#115e59',
      accentHex: '#99f6e4',
      awningStripeHex: 0x14b8a6,
    },
    {
      cx: -286.5,
      title: 'PHỞ BÒ • CƠM TẤM 24/7',
      items: ['PHỞ TÁI NẠM • BÚN BÒ HUẾ', 'CƠM SƯỜN TRỨNG • MÌ XÀO'],
      wallHex: 0xb45309,
      interiorHex: 0xfef3c7,
      bannerBg: '#9a3412',
      accentHex: '#fed7aa',
      awningStripeHex: 0xf59e0b,
    },
    {
      cx: -278.5,
      title: 'CÀ PHÊ ĐÊM • TRÀ SỮA',
      items: ['CÀ PHÊ MUỐI • BẠC XỈU ĐÁ', 'TRÀ ĐÀO CAM SẢ • BÁNH NGỌT'],
      wallHex: 0x334155,
      interiorHex: 0xfde68a,
      bannerBg: '#1e293b',
      accentHex: '#fde047',
      awningStripeHex: 0xeab308,
    },
    {
      cx: -270.5,
      title: 'TRÁI CÂY • QUÀ THĂM BỆNH',
      items: ['NƯỚC ÉP CAM • SINH TỐ BƠ', 'GIỎ TRÁI CÂY • SỮA TƯƠI'],
      wallHex: 0x15803d,
      interiorHex: 0xecfdf5,
      bannerBg: '#166534',
      accentHex: '#bbf7d0',
      awningStripeHex: 0x22c55e,
    },
  ];

  const woodCounterMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
  const potSteelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });

  kioskDefs.forEach((k, idx) => {
    const kMat = new THREE.MeshStandardMaterial({ color: k.wallHex, roughness: 0.48 });
    const kInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: k.interiorHex,
      emissiveIntensity: 0.38,
      roughness: 0.5,
    });
    const kStripedMat = new THREE.MeshStandardMaterial({ color: k.awningStripeHex, roughness: 0.55 });

    // Structural container shell + brightly illuminated interior liner
    addBox(k.cx - 2.6, k.cx + 2.6, 0, 3.25, -15.6, -15.1, kMat);
    addBox(k.cx - 2.2, k.cx + 2.2, 0.05, 3.10, -15.08, -14.98, kInteriorMat); // Lit back interior wall
    addBox(k.cx - 2.6, k.cx - 2.2, 0, 3.25, -15.2, -10.5, kMat);
    addBox(k.cx + 2.2, k.cx + 2.6, 0, 3.25, -15.2, -10.5, kMat);
    addBox(k.cx - 2.8, k.cx + 2.8, 3.15, 3.55, -15.8, -9.6, darkSteelMat); // Overhang roof

    // Decorative slanted market awning + under-awning bright LED bar
    const awning = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.14, 1.35), kStripedMat);
    awning.position.set(k.cx, 2.52, -9.85);
    awning.rotation.x = 0.28;
    staticGroup.add(awning);
    addBox(k.cx - 2.2, k.cx + 2.2, 3.05, 3.14, -10.45, -10.25, warmBulbMat); // Linear under-counter light bar

    // Back wall backlit menu board inside each kiosk
    const innerMenuTex = createMenuBoardTex(k.title, k.items, k.bannerBg, '#ffffff');
    const innerMenuMat = new THREE.MeshStandardMaterial({
      map: innerMenuTex,
      emissive: 0xffffff,
      emissiveMap: innerMenuTex,
      emissiveIntensity: 0.85,
    });
    neonMats.push(innerMenuMat);
    const innerMenu = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.15), innerMenuMat);
    innerMenu.position.set(k.cx, 2.22, -14.95);
    staticGroup.add(innerMenu);

    // Front Serving Counter + Glowing Under-counter Accent + Glass Sneeze Shield
    addBox(k.cx - 2.2, k.cx + 2.2, 0, 1.02, -11.4, -10.4, woodCounterMat);
    addBox(k.cx - 2.25, k.cx + 2.25, 0.90, 0.96, -10.42, -10.36, archAmberLedMat);
    addBox(k.cx - 2.3, k.cx + 2.3, 1.02, 1.12, -11.5, -10.3, whiteTrimMat);
    addBox(k.cx - 2.0, k.cx + 2.0, 1.12, 1.56, -10.52, -10.44, glassMat);

    // Rich Interior & Counter Appliances
    if (idx <= 1) {
      [-1.05, 0.0, 1.05].forEach((ox) => {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.27, 0.36, 14), potSteelMat);
        pot.position.set(k.cx + ox, 1.30, -10.95);
        staticGroup.add(pot);
        const soup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.26, 0.04, 14),
          new THREE.MeshStandardMaterial({ color: idx === 0 ? 0xfef08a : 0xd97706, roughness: 0.25 })
        );
        soup.position.set(k.cx + ox, 1.48, -10.95);
        staticGroup.add(soup);
      });
      // Warm food display tray stack
      addBox(k.cx + 1.45, k.cx + 2.05, 1.12, 1.54, -11.15, -10.58, glassMat);
    } else if (idx === 2) {
      addBox(k.cx - 0.65, k.cx + 0.55, 1.12, 1.66, -11.15, -10.65, darkSteelMat);
      addBox(k.cx - 0.55, k.cx + 0.45, 1.62, 1.72, -11.1, -10.7, chromeMat);
      addBox(k.cx + 0.85, k.cx + 1.95, 1.12, 1.68, -11.2, -10.55, glassMat);
      [0xf59e0b, 0xec4899, 0xfef3c7].forEach((cakeCol, ci) => {
        const cake = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.14, 0.22),
          new THREE.MeshStandardMaterial({ color: cakeCol, roughness: 0.5 })
        );
        cake.position.set(k.cx + 1.05 + ci * 0.32, 1.28, -10.85);
        staticGroup.add(cake);
      });
    } else {
      const fruitColors = [0xf97316, 0xef4444, 0x22c55e, 0xfacc15];
      [-1.35, -0.45, 0.45, 1.35].forEach((ox, fi) => {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.26, 0.58),
          new THREE.MeshStandardMaterial({ color: fruitColors[fi], roughness: 0.45 })
        );
        crate.position.set(k.cx + ox, 1.25, -10.95);
        staticGroup.add(crate);
        // Stacked fruit spheres on crate
        for (let s = -1; s <= 1; s++) {
          const fruit = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 8, 8),
            new THREE.MeshStandardMaterial({ color: fruitColors[(fi + s + 4) % 4], roughness: 0.4 })
          );
          fruit.position.set(k.cx + ox + s * 0.18, 1.44, -10.95);
          staticGroup.add(fruit);
        }
      });
    }

    // Backlit Menu Signboard mounted high on Awning Fascia facing Dining Plaza (+Z)
    const menuTex = createMenuBoardTex(k.title, k.items, k.bannerBg, k.accentHex);
    const menuMat = new THREE.MeshStandardMaterial({
      map: menuTex,
      emissive: 0xffffff,
      emissiveMap: menuTex,
      emissiveIntensity: 0.95,
      roughness: 0.22,
    });
    neonMats.push(menuMat);
    addBox(k.cx - 2.48, k.cx + 2.48, 2.72, 3.82, -9.85, -9.66, darkSteelMat);
    const menuFace = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 0.98), menuMat);
    menuFace.position.set(k.cx, 3.27, -9.64);
    staticGroup.add(menuFace);

    // Warm Hanging Pendant Lamps + Ground glow pool in front of each kiosk
    [-1.4, 0, 1.4].forEach((ox) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), warmBulbMat);
      bulb.position.set(k.cx + ox, 2.86, -10.22);
      staticGroup.add(bulb);
    });
    addGroundGlowPool(k.cx, -9.2, 8.8, warmPoolMat, 0.036);
  });

  // =========================================================================
  // 3. OUTDOOR DINING TABLES, LANTERN POLES & NIGHT-MARKET PAPER LANTERNS
  // =========================================================================
  const tablePositions = [-294.0, -286.5, -279.0, -271.5];
  [-4.0, 4.0].forEach((tz) => {
    tablePositions.forEach((tx, tIdx) => {
      addBox(tx - 0.95, tx + 0.95, 0.72, 0.80, tz - 0.48, tz + 0.48, warmDeckMat);
      [-0.78, 0.78].forEach((lx) => addBox(tx + lx - 0.05, tx + lx + 0.05, 0, 0.72, tz - 0.40, tz + 0.40, darkSteelMat));
      [-0.88, 0.88].forEach((bz) => {
        addBox(tx - 0.90, tx + 0.90, 0.42, 0.48, tz + bz - 0.20, tz + bz + 0.20, warmDeckMat);
        [-0.70, 0.70].forEach((lx) => addBox(tx + lx - 0.04, tx + lx + 0.04, 0, 0.42, tz + bz - 0.14, tz + bz + 0.14, darkSteelMat));
      });
      // Bowls, tray, cups + glowing mini table lantern
      addBox(tx - 0.32, tx + 0.32, 0.80, 0.84, tz - 0.22, tz + 0.22, whiteTrimMat);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.08, 10), whiteTrimMat);
      bowl.position.set(tx - 0.38, 0.84, tz + 0.08);
      staticGroup.add(bowl);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.13, 8), evGreenMat);
      cup.position.set(tx + 0.48, 0.865, tz + 0.12);
      staticGroup.add(cup);
      const tableLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 10), warmBulbMat);
      tableLamp.position.set(tx + 0.12, 0.91, tz - 0.05);
      staticGroup.add(tableLamp);

      if ((tIdx + (tz > 0 ? 1 : 0)) % 2 === 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.45, 8), darkSteelMat);
        pole.position.set(tx, 1.25, tz);
        staticGroup.add(pole);
        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(1.48, 0.46, 8),
          new THREE.MeshStandardMaterial({ color: tIdx % 2 === 0 ? 0xf59e0b : 0x0ea5e9, roughness: 0.65 })
        );
        canopy.position.set(tx, 2.55, tz);
        staticGroup.add(canopy);
      }
    });
  });

  // Festoon String Light Poles + Glowing Edison Bulbs & Paper Lanterns across Food Court
  const stringPoles: Array<[number, number]> = [
    [-297.2, -7.8],
    [-282.5, -7.8],
    [-267.8, -7.8],
    [-297.2, 8.8],
    [-282.5, 8.8],
    [-267.8, 8.8],
  ];
  stringPoles.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.85, 8), darkSteelMat);
    post.position.set(px, 1.92, pz);
    staticGroup.add(post);
  });
  [-7.8, 0.5, 8.8].forEach((sz, rowIdx) => {
    addBox(-297.2, -267.8, 3.72, 3.76, sz - 0.02, sz + 0.02, darkSteelMat);
    let bIdx = 0;
    for (let bx = -296.0; bx <= -269.0; bx += 2.7) {
      if (bIdx % 2 === 0) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), warmBulbMat);
        bulb.position.set(bx, 3.60, sz);
        staticGroup.add(bulb);
      } else {
        // Colorful glowing night-market paper lantern
        const lanMat = (bIdx + rowIdx) % 3 === 0 ? lanternRedMat : lanternGoldMat;
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), lanMat);
        lantern.scale.set(1, 1.25, 1);
        lantern.position.set(bx, 3.44, sz);
        staticGroup.add(lantern);
      }
      bIdx++;
    }
    [-293.0, -282.5, -272.0].forEach((gx) => addGroundGlowPool(gx, sz, 11.5, warmPoolMat, 0.034));
  });

  // =========================================================================
  // 4. TRẠM SẠC XE MÁY ĐIỆN 24/7 (CANOPY + 8 CHARGING DOCKS + BATTERY SWAP)
  // =========================================================================
  [-262.8, -253.4, -244.0].forEach((px) => {
    [-15.6, -4.4].forEach((pz) => {
      addBox(px - 0.14, px + 0.14, 0, 3.85, pz - 0.14, pz + 0.14, darkSteelMat);
      addBox(px - 0.16, px + 0.16, 1.1, 3.5, pz - 0.16, pz + 0.16, evGreenMat); // Luminous pillar accent
    });
  });
  addBox(-263.4, -243.4, 3.75, 4.10, -16.2, -3.8, darkSteelMat);
  addBox(-263.5, -243.3, 3.92, 4.18, -16.3, -3.7, evGreenMat); // Luminous EV green trim fascia
  // Bright Under-Canopy Ceiling LED Light Bars
  [-13.0, -7.0].forEach((lz) => {
    addBox(-261.8, -245.0, 3.68, 3.75, lz - 0.18, lz + 0.18, whitePaintMat);
    const ledTube = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.05, 0.28), warmBulbMat);
    ledTube.position.set(-253.4, 3.66, lz);
    staticGroup.add(ledTube);
    addGroundGlowPool(-258.0, lz + 0.8, 10.5, emeraldPoolMat, 0.035);
    addGroundGlowPool(-249.0, lz + 0.8, 10.5, emeraldPoolMat, 0.035);
  });

  const evBannerTex = createHubBannerTex(
    'TRẠM SẠC XE MÁY ĐIỆN 24/7',
    'SẠC NHANH THÔNG MINH • ĐỔI PIN TỰ ĐỘNG • V-GREEN HUB',
    '#064e3b',
    '#34d399',
    '#a7f3d0'
  );
  const evBannerMat = new THREE.MeshStandardMaterial({
    map: evBannerTex,
    emissive: 0xffffff,
    emissiveMap: evBannerTex,
    emissiveIntensity: 0.95,
    roughness: 0.25,
  });
  neonMats.push(evBannerMat);
  const evFasciaFront = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 1.35), evBannerMat);
  evFasciaFront.position.set(-253.4, 4.78, -3.72);
  staticGroup.add(evFasciaFront);
  addBox(-259.4, -247.4, 4.10, 5.52, -3.95, -3.75, darkSteelMat);

  // Automated Battery Swap Cabinet against North Wall (X = -257.6 .. -250.0, Z = -16.2 .. -15.0)
  addBox(-257.6, -250.0, 0, 2.35, -16.2, -15.1, whiteTrimMat);
  addBox(-257.7, -249.9, 2.25, 2.48, -16.25, -15.0, evGreenMat);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const slotMat = (row + col) % 3 === 0 ? evGreenMat : darkSteelMat;
      addBox(
        -257.0 + col * 1.15,
        -256.1 + col * 1.15,
        0.35 + row * 0.56,
        0.78 + row * 0.56,
        -15.12,
        -15.06,
        slotMat
      );
    }
  }
  const swapScreenMat = new THREE.MeshStandardMaterial({
    color: 0x022c22,
    emissive: 0x34d399,
    emissiveIntensity: 1.2,
  });
  neonMats.push(swapScreenMat);
  addBox(-251.3, -250.3, 1.05, 1.75, -15.10, -15.04, swapScreenMat);

  const buildChargingStationWithScooter = (cx: number, cz: number, scooterHex: number, hasBike: boolean) => {
    const bayPad = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.5), evPadMat);
    bayPad.rotation.x = -Math.PI / 2;
    bayPad.position.set(cx, 0.016, cz + 0.65);
    staticGroup.add(bayPad);

    addBox(cx - 0.24, cx + 0.24, 0, 1.55, cz - 0.16, cz + 0.16, whiteTrimMat);
    addBox(cx - 0.26, cx + 0.26, 1.48, 1.62, cz - 0.18, cz + 0.18, evGreenMat);
    addBox(cx - 0.16, cx + 0.16, 0.96, 1.32, cz + 0.14, cz + 0.18, swapScreenMat);
    const pulseMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.35,
    });
    evPulseMats.push(pulseMat);
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.04), pulseMat);
    ledStrip.position.set(cx, 1.42, cz + 0.17);
    ledStrip.userData.noMerge = true;
    staticGroup.add(ledStrip);

    if (hasBike) {
      const scoot = new THREE.Group();
      scoot.position.set(cx + 0.12, 0.018, cz + 0.95);
      scoot.rotation.y = Math.PI + 0.08;
      const bMat = new THREE.MeshStandardMaterial({ color: scooterHex, roughness: 0.26, metalness: 0.3 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
      [0.48, -0.48].forEach((wz) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.10, 12), tireMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(0, 0.22, wz);
        scoot.add(w);
      });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.96), bMat);
      deck.position.set(0, 0.34, 0);
      scoot.add(deck);
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.60, 0.24), bMat);
      apron.position.set(0, 0.64, 0.38);
      apron.rotation.x = -0.22;
      scoot.add(apron);
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.04), warmBulbMat);
      hl.position.set(0, 0.74, 0.49);
      scoot.add(hl);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.14, 0.68), darkSteelMat);
      seat.position.set(0, 0.68, -0.20);
      scoot.add(seat);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.05, 0.06), chromeMat);
      bar.position.set(0, 0.94, 0.32);
      scoot.add(bar);
      staticGroup.add(scoot);

      const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.72), evGreenMat);
      cable.position.set(cx + 0.08, 0.76, cz + 0.45);
      cable.rotation.x = 0.25;
      staticGroup.add(cable);
    }
  };

  const evBikeColors = [0xf8fafc, 0x10b981, 0x0ea5e9, 0xfef3c7, 0xdc2626, 0x334155];
  [-259.6, -255.6, -251.6, -247.6].forEach((ex, i) => {
    buildChargingStationWithScooter(ex, -13.0, evBikeColors[i], i !== 2);
    buildChargingStationWithScooter(ex, -7.0, evBikeColors[(i + 2) % evBikeColors.length], i !== 1);
  });

  // =========================================================================
  // 5. KHU GỬI XE NHANH & VỊNH ĐÓN TRẢ KHÁCH ĐỐI DIỆN BỆNH VIỆN
  // =========================================================================
  addBox(-262.4, -254.6, 0, 2.75, 2.9, 3.15, darkSteelMat);
  addBox(-262.2, -254.8, 0.65, 2.55, 2.98, 3.08, glassMat);
  addBox(-262.6, -254.4, 2.70, 2.92, 2.75, 5.45, darkSteelMat);
  addBox(-262.6, -254.4, 2.86, 2.96, 5.38, 5.48, evGreenMat);
  addBox(-261.8, -255.2, 2.66, 2.71, 3.55, 4.35, warmBulbMat); // Shelter ceiling LED panel
  addGroundGlowPool(-258.5, 5.2, 10.5, warmPoolMat, 0.036);
  addGroundGlowPool(-249.0, 5.2, 9.5, warmPoolMat, 0.036);

  addBox(-261.6, -255.4, 0.42, 0.50, 3.35, 3.95, warmDeckMat);
  [-261.2, -258.5, -255.8].forEach((bx) => addBox(bx - 0.06, bx + 0.06, 0, 0.42, 3.40, 3.90, darkSteelMat));
  const pickupSignTex = createMenuBoardTex(
    'ĐIỂM ĐÓN BỆNH NHÂN & KHÁCH',
    ['• XE Ô TÔ ĐÓN TRẢ NHANH (TỐI ĐA 10 PHÚT)', '• BĂNG QUA ĐƯỜNG TỚI SẢNH BỆNH VIỆN'],
    '#0369a1',
    '#bae6fd'
  );
  const pickupSignMat = new THREE.MeshStandardMaterial({
    map: pickupSignTex,
    emissive: 0xffffff,
    emissiveMap: pickupSignTex,
    emissiveIntensity: 0.9,
  });
  neonMats.push(pickupSignMat);
  const pickupSign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.9), pickupSignMat);
  pickupSign.position.set(-258.5, 2.15, 3.18);
  staticGroup.add(pickupSign);

  for (let mx = -251.8; mx <= -245.4; mx += 1.6) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 2.6), whitePaintMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(mx, 0.015, 4.2);
    staticGroup.add(line);
  }
  addBox(-245.2, -243.6, 0, 2.25, 2.5, 3.9, darkSteelMat);
  addBox(-245.1, -243.7, 1.05, 1.95, 3.85, 3.92, glassMat);
  addBox(-245.2, -243.6, 2.18, 2.26, 2.5, 3.9, evGreenMat);
  [-251.0, -249.4, -247.8].forEach((bx, idx) => {
    const builtBike = buildCityMotorbikeMesh({
      color: [0xdc2626, 0x0284c7, 0xf8fafc][idx],
      variant: idx % 2 === 0 ? 'scooter' : 'sport',
      includeRider: false,
      kickstandTilt: true,
      headlightIntensity: 0.15,
      brakeIntensity: 0.1,
      noMerge: false,
    });
    builtBike.group.position.set(bx, 0.015, 4.1);
    staticGroup.add(builtBike.group);
  });

  for (let px = -262.0; px <= -244.0; px += 6.0) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3.6), yellowPaintMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(px, 0.016, 11.8);
    staticGroup.add(line);
  }
  const buildPickupCar = (x: number, z: number, bodyHex: number, isTaxi: boolean) => {
    const builtCar = buildCityCarMesh({
      color: bodyHex,
      variant: isTaxi ? 'sedan' : 'coupe',
      isTaxi,
      taxiColor: 0x06b6d4,
      headlightIntensity: 0.7,
      brakeIntensity: 0.45,
      noMerge: false,
    });
    builtCar.group.position.set(x, 0.015, z);
    builtCar.group.rotation.y = Math.PI / 2;
    staticGroup.add(builtCar.group);
  };
  buildPickupCar(-258.8, 11.8, 0xf8fafc, false);
  buildPickupCar(-250.0, 11.8, 0x06b6d4, true);

  // =========================================================================
  // 6. TỔ HỢP TIỆN ÍCH THĂM BỆNH 24/7 (CAFÉ/LAUNDRY + NHÀ THUỐC GPP + HOA QUÀ)
  // Footprint: X = -340.0 .. -302.5, Z = -15.8 .. +13.5 (Brightly Lit 2-Story Architecture!)
  // =========================================================================
  const retailFloorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xcbd5e1,
    emissiveIntensity: 0.24,
    roughness: 0.32,
  });
  const clinicWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.18,
    roughness: 0.45,
  });
  const clinicInteriorWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.34,
    roughness: 0.48,
  });
  const f2ClinicWallMat = new THREE.MeshStandardMaterial({
    color: 0xf0f9ff,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.38,
    roughness: 0.42,
  });
  const pharmacyTealMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x047857,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  });
  const cafeWoodMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.58 });
  const storeCeilLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf0f9ff,
    emissiveIntensity: 1.5,
  });
  neonMats.push(storeCeilLedMat);

  // Interior floor slab + Cedar Wood Canopy Soffit + 2nd Floor Clinic Deck (Y = 4.2 .. 8.3)
  addBox(-339.6, -302.9, 0.0, 0.024, -15.5, 5.1, retailFloorMat);
  addBox(-340.0, -302.5, 4.15, 4.46, -15.8, 6.2, clinicWallMat); // Overhanging Floor 2 deck & portico canopy
  addBox(-339.8, -302.7, 4.10, 4.16, 4.9, 6.1, cafeWoodMat); // Warm cedar soffit under front portico
  addBox(-339.8, -302.7, 4.06, 4.11, 5.65, 5.82, storeCeilLedMat); // Continuous warm-white arcade downlight strip
  addBox(-340.1, -302.4, 4.26, 4.38, 6.14, 6.24, evGreenMat); // Luminous Emerald LED architectural ribbon (Floor 1)

  // Floor 2 Structural Walls & Roof + Illuminated Rooftop Ribbon
  addBox(-339.8, -302.7, 4.46, 5.20, -15.6, 5.35, clinicWallMat); // Floor 2 knee wall
  addBox(-339.8, -302.7, 7.50, 8.28, -15.6, 5.35, clinicWallMat); // Floor 2 header & roof slab
  addBox(-340.0, -302.5, 8.18, 8.48, -15.7, 5.65, pharmacyTealMat); // Rooftop teal cornice
  addBox(-340.1, -302.4, 8.36, 8.46, 5.60, 5.70, archAmberLedMat); // Warm architectural cornice glow strip

  // Floor 2 Lit Interior ("PHÒNG KHÁM CHUYÊN KHOA • NHA KHOA • MẮT • XÉT NGHIỆM NHANH")
  addBox(-339.5, -303.0, 4.46, 4.50, -15.4, 5.15, retailFloorMat);
  addBox(-339.5, -303.0, 4.50, 7.50, -15.4, -15.1, f2ClinicWallMat); // Lit back interior wall
  addBox(-339.5, -339.2, 4.50, 7.50, -15.3, 5.15, f2ClinicWallMat);
  addBox(-303.3, -303.0, 4.50, 7.50, -15.3, 5.15, f2ClinicWallMat);
  // 6 Bright Ceiling LED panels on Floor 2
  [-335.5, -329.5, -323.5, -317.5, -311.5, -306.5].forEach((lx) => {
    const led = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.5), storeCeilLedMat);
    led.position.set(lx, 7.42, 0.5);
    staticGroup.add(led);
  });
  // Floor 2 Visible Clinic Rooms (Dental Chair, Reception Desk + Banner, Exam Bed + Analyzers)
  addBox(-336.5, -333.5, 4.5, 5.35, -3.5, -1.5, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })); // Dental chair
  addBox(-335.6, -334.4, 5.35, 7.15, -3.6, -3.3, chromeMat); // Dental lamp arm
  addBox(-334.8, -334.1, 6.75, 6.95, -2.5, -1.9, storeCeilLedMat); // Dental overhead lamp
  addBox(-325.8, -317.2, 4.5, 5.55, -2.8, -1.6, pharmacyTealMat); // Floor 2 Reception Desk
  addBox(-326.0, -317.0, 5.55, 5.66, -2.9, -1.5, whiteTrimMat);
  const f2SignTex = createHubBannerTex(
    'PHÒNG KHÁM TẦNG 2 • NHA KHOA • MẮT',
    'KHÁM NHANH 24/7 • LẤY MẪU XÉT NGHIỆM • TƯ VẤN SỨC KHỎE',
    '#0c4a6e',
    '#38bdf8',
    '#bae6fd'
  );
  const f2SignMat = new THREE.MeshStandardMaterial({
    map: f2SignTex,
    emissive: 0xffffff,
    emissiveMap: f2SignTex,
    emissiveIntensity: 0.9,
  });
  neonMats.push(f2SignMat);
  const f2WallSign = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 1.45), f2SignMat);
  f2WallSign.position.set(-321.2, 6.35, -14.95);
  staticGroup.add(f2WallSign);
  addBox(-311.5, -306.5, 4.5, 5.35, -3.6, -1.6, whiteTrimMat); // Exam bed
  addBox(-309.5, -306.5, 4.5, 5.55, -9.0, -7.8, darkSteelMat); // Lab bench
  addBox(-309.2, -307.2, 5.55, 6.25, -8.6, -8.3, swapScreenMat); // Lit analyzer screen

  // Panoramic Floor 2 Glass & Architectural Louver Mullions (Emerald & Gold)
  addBox(-339.6, -302.9, 5.20, 7.50, 5.14, 5.24, glassMat);
  [-339.7, -333.5, -327.4, -321.2, -314.8, -308.8, -302.9].forEach((fx, idx) => {
    addBox(fx - 0.14, fx + 0.14, 4.46, 8.28, 5.16, 5.52, idx % 2 === 0 ? silverFrameMat : pharmacyTealMat);
    if (idx % 2 === 0) {
      addBox(fx - 0.05, fx + 0.05, 4.55, 8.15, 5.52, 5.58, goldTrimMat);
    }
  });

  // Rooftop Illuminated Complex Sign + Flanking Glowing Medical Crosses
  const utilityRoofTex = createHubBannerTex(
    'TỔ HỢP TIỆN ÍCH THĂM BỆNH 24/7',
    'NHÀ THUỐC GPP • GIỎ QUÀ HOA TƯƠI • CAFÉ & GIẶT SẤY • PHÒNG KHÁM TẦNG 2',
    '#064e3b',
    '#34d399',
    '#fef08a'
  );
  const utilityRoofMat = new THREE.MeshStandardMaterial({
    map: utilityRoofTex,
    emissive: 0xffffff,
    emissiveMap: utilityRoofTex,
    emissiveIntensity: 0.98,
  });
  neonMats.push(utilityRoofMat);
  addBox(-333.8, -308.7, 8.48, 10.75, 4.85, 5.30, darkSteelMat);
  const utilityRoofSign = new THREE.Mesh(new THREE.PlaneGeometry(24.5, 2.10), utilityRoofMat);
  utilityRoofSign.position.set(-321.25, 9.62, 5.33);
  staticGroup.add(utilityRoofSign);

  // Flanking Glowing Green Medical Cross Emblems on Rooftop
  const crossTex = createMedicalCrossBadgeTex();
  const crossMat = new THREE.MeshStandardMaterial({
    map: crossTex,
    emissive: 0xffffff,
    emissiveMap: crossTex,
    emissiveIntensity: 0.95,
  });
  neonMats.push(crossMat);
  [-336.5, -306.0].forEach((cx) => {
    addBox(cx - 1.15, cx + 1.15, 8.50, 10.70, 4.92, 5.26, darkSteelMat);
    const cf = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.05), crossMat);
    cf.position.set(cx, 9.60, 5.28);
    staticGroup.add(cf);
  });

  // Ground-Floor Structural Walls & Brightly Lit Store Interiors
  addBox(-339.7, -339.2, 0, 4.2, -15.6, 5.1, clinicWallMat);
  addBox(-303.3, -302.8, 0, 4.2, -15.6, 5.1, clinicWallMat);
  addBox(-339.7, -302.8, 0, 4.2, -15.7, -15.2, clinicWallMat);
  addBox(-339.1, -303.4, 0.05, 4.05, -15.18, -15.08, clinicInteriorWallMat); // Lit back wall liner
  addBox(-327.6, -327.2, 0, 4.2, -15.4, 5.1, clinicWallMat);
  addBox(-327.18, -327.10, 0.05, 4.05, -15.0, 4.8, clinicInteriorWallMat);
  addBox(-327.70, -327.62, 0.05, 4.05, -15.0, 4.8, clinicInteriorWallMat);
  addBox(-315.0, -314.6, 0, 4.2, -15.4, 5.1, clinicWallMat);
  addBox(-314.58, -314.50, 0.05, 4.05, -15.0, 4.8, clinicInteriorWallMat);
  addBox(-315.10, -315.02, 0.05, 4.05, -15.0, 4.8, clinicInteriorWallMat);

  // Storefront Cladding Columns + 3 Projecting 24/7 Neon Blade Signs
  const bladeConfigs: Array<[number, string, string, string, string]> = [
    [-327.4, 'CAFÉ ĐÊM', 'GIẶT SẤY', '#78350f', '#fde047'],
    [-314.8, 'NHÀ THUỐC', 'GPP 24H', '#065f46', '#34d399'],
    [-303.0, 'HOA TƯƠI', 'GIỎ QUÀ', '#0c4a6e', '#38bdf8'],
  ];
  bladeConfigs.forEach(([bx, t1, t2, bg, acc]) => {
    addBox(bx - 0.24, bx + 0.24, 0, 4.2, 4.85, 5.55, pharmacyTealMat);
    addBox(bx - 0.08, bx + 0.08, 0.2, 4.0, 5.54, 5.60, goldTrimMat);
    addBox(bx - 0.06, bx + 0.06, 2.25, 3.55, 5.55, 6.28, darkSteelMat);
    const bTex = createBladeSignTex(t1, t2, bg, acc);
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      emissive: 0xffffff,
      emissiveMap: bTex,
      emissiveIntensity: 0.92,
    });
    neonMats.push(bMat);
    [-0.065, 0.065].forEach((ox, side) => {
      const bf = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.25), bMat);
      bf.rotation.y = side === 0 ? -Math.PI / 2 : Math.PI / 2;
      bf.position.set(bx + ox, 2.90, 5.92);
      staticGroup.add(bf);
    });
  });

  // Front Storefronts with 3.6m wide open entrances, mullions, ceiling LEDs & glowing fascias
  const storeDoors: Array<[number, number, number, string, string, string]> = [
    [-339.5, -327.6, -333.5, 'CAFÉ ĐÊM • GIẶT SẤY 24/7', '#78350f', '#fde68a'],
    [-327.2, -315.0, -321.0, 'NHÀ THUỐC GPP • THIẾT BỊ Y TẾ', '#065f46', '#a7f3d0'],
    [-314.6, -303.2, -308.7, 'HOA TƯƠI • GIỎ QUÀ THĂM BỆNH', '#0c4a6e', '#bae6fd'],
  ];
  storeDoors.forEach(([x0, x1, doorCx, title, bg, acc]) => {
    addBox(x0, doorCx - 1.8, 0, 0.9, 4.85, 5.15, clinicWallMat);
    addBox(x0, doorCx - 1.8, 0.88, 0.96, 4.82, 5.20, silverFrameMat);
    addBox(x0, doorCx - 1.8, 0.96, 3.4, 4.94, 5.06, glassMat);
    addBox(doorCx + 1.8, x1, 0, 0.9, 4.85, 5.15, clinicWallMat);
    addBox(doorCx + 1.8, x1, 0.88, 0.96, 4.82, 5.20, silverFrameMat);
    addBox(doorCx + 1.8, x1, 0.96, 3.4, 4.94, 5.06, glassMat);
    // Silver doorway frame jambs
    addBox(doorCx - 1.88, doorCx - 1.78, 0, 3.45, 4.85, 5.18, silverFrameMat);
    addBox(doorCx + 1.78, doorCx + 1.88, 0, 3.45, 4.85, 5.18, silverFrameMat);
    addBox(x0, x1, 3.4, 4.2, 4.85, 5.18, clinicWallMat);

    // 3 Bright Ceiling LED panels inside each store
    [-11.5, -5.5, 0.5].forEach((lz) => {
      const led = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.06, 1.4), storeCeilLedMat);
      led.position.set((x0 + x1) * 0.5, 4.08, lz);
      staticGroup.add(led);
    });

    // Glowing Store Fascia Signboard above entrance
    const sTex = createHubBannerTex(title, 'MỞ CỬA 24/7 • ĐỐI DIỆN BỆNH VIỆN', bg, '#34d399', acc);
    const sMat = new THREE.MeshStandardMaterial({
      map: sTex,
      emissive: 0xffffff,
      emissiveMap: sTex,
      emissiveIntensity: 0.95,
    });
    neonMats.push(sMat);
    const sFace = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 1.02), sMat);
    sFace.position.set((x0 + x1) * 0.5, 3.82, 5.25);
    staticGroup.add(sFace);

    // Decorative Stone Flower Planters flanking each doorway on exterior apron
    [doorCx - 3.6, doorCx + 3.6].forEach((px) => {
      addBox(px - 0.85, px + 0.85, 0, 0.45, 5.25, 5.85, whiteTrimMat);
      addBox(px - 0.75, px + 0.75, 0.45, 0.85, 5.32, 5.78, flowerBushMat);
    });
  });

  // STORE 3 (West): CAFÉ & LAUNDRY 24/7 Interior Details
  addBox(-335.8, -328.6, 0, 1.05, -14.6, -11.6, cafeWoodMat);
  addBox(-335.9, -328.5, 1.05, 1.15, -14.7, -11.5, whiteTrimMat);
  addBox(-334.6, -333.2, 1.15, 1.75, -14.0, -13.2, chromeMat);
  addBox(-331.2, -329.2, 1.15, 1.75, -12.3, -11.6, glassMat);
  const cafeMenuTex = createMenuBoardTex(
    'MENU CAFÉ ĐÊM & GIẶT SẤY',
    ['ESPRESSO • CÀ PHÊ SỮA • BẠC XỈU', 'GIẶT SẤY NHANH 45 PHÚT • ỦI HƠI'],
    '#78350f',
    '#fde68a'
  );
  const cafeMenuMat = new THREE.MeshStandardMaterial({
    map: cafeMenuTex,
    emissive: 0xffffff,
    emissiveMap: cafeMenuTex,
    emissiveIntensity: 0.88,
  });
  neonMats.push(cafeMenuMat);
  const cafeMenu = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.5), cafeMenuMat);
  cafeMenu.position.set(-332.2, 2.65, -15.0);
  staticGroup.add(cafeMenu);
  [-334.4, -332.2, -330.0].forEach((lx) => {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 10), warmBulbMat);
    shade.position.set(lx, 2.75, -12.0);
    staticGroup.add(shade);
  });
  // 4 Commercial Washer/Dryers with glowing digital LED rings
  for (let w = 0; w < 4; w++) {
    const wz = -10.8 + w * 2.2;
    addBox(-339.0, -338.0, 0, 1.50, wz - 0.78, wz + 0.78, whiteTrimMat);
    addBox(-338.1, -337.98, 1.25, 1.42, wz - 0.65, wz + 0.65, darkSteelMat);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16), glassMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(-337.96, 0.74, wz);
    staticGroup.add(drum);
    const ledRing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.34), swapScreenMat);
    ledRing.position.set(-337.96, 1.33, wz + 0.35);
    staticGroup.add(ledRing);
  }
  addBox(-331.0, -328.8, 0, 0.52, -6.2, -1.8, cafeWoodMat);

  // STORE 2 (Center): NHÀ THUỐC GPP & THIẾT BỊ Y TẾ Interior Details
  addBox(-326.6, -315.8, 0, 3.05, -14.9, -13.8, whiteTrimMat);
  addBox(-326.6, -315.8, 2.85, 3.05, -13.9, -13.65, evGreenMat); // Illuminated pharmacy canopy shelf strip
  const pharmaCross = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), crossMat);
  pharmaCross.position.set(-321.2, 3.45, -14.85);
  staticGroup.add(pharmaCross);
  const pharmaColors = [0x38bdf8, 0x10b981, 0xf59e0b, 0xef4444, 0xffffff];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 11; c++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.34, 0.36),
        new THREE.MeshStandardMaterial({ color: pharmaColors[(r + c) % pharmaColors.length], roughness: 0.4 })
      );
      box.position.set(-325.8 + c * 0.92, 0.85 + r * 0.62, -13.68);
      staticGroup.add(box);
    }
  }
  addBox(-325.2, -317.4, 0, 1.05, -11.0, -10.0, pharmacyTealMat);
  addBox(-325.3, -317.3, 1.05, 1.16, -11.1, -9.9, whiteTrimMat);
  addBox(-321.8, -320.6, 1.16, 1.58, -10.6, -10.4, swapScreenMat); // Pharmacy POS screen
  addBox(-326.6, -324.6, 0, 0.25, -6.0, -0.8, whiteTrimMat);
  [-4.6, -2.2].forEach((wz) => {
    addBox(-326.0, -325.2, 0.55, 0.65, wz - 0.32, wz + 0.32, darkSteelMat);
    addBox(-326.0, -325.8, 0.65, 1.18, wz - 0.32, wz + 0.32, darkSteelMat);
    [-0.36, 0.36].forEach((oz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 14), darkSteelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(-325.6, 0.48, wz + oz);
      staticGroup.add(wheel);
    });
  });

  // STORE 1 (East): MINIMART, HOA TƯƠI & GIỎ QUÀ THĂM BỆNH Interior Details
  // Backlit Refrigerated Drink Wall along East wall
  addBox(-304.5, -303.5, 0, 2.75, -13.2, -2.8, whiteTrimMat);
  addBox(-304.54, -304.46, 0.35, 2.45, -13.0, -3.0, storeCeilLedMat); // Glowing white-cyan cooler interior!
  const drinkColors = [0x0ea5e9, 0xef4444, 0x22c55e, 0xf59e0b, 0xf8fafc];
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 9; dc++) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.32, 8),
        new THREE.MeshStandardMaterial({ color: drinkColors[(dr + dc) % drinkColors.length], roughness: 0.3 })
      );
      bottle.position.set(-304.25, 0.68 + dr * 0.62, -12.3 + dc * 1.05);
      staticGroup.add(bottle);
    }
  }
  addBox(-304.60, -304.55, 0.35, 2.45, -13.0, -3.0, glassMat);
  // Minimart snack gondola along West partition
  addBox(-314.4, -313.6, 0, 1.85, -10.6, -4.4, whiteTrimMat);
  for (let sr = 0; sr < 3; sr++) {
    for (let sc = 0; sc < 5; sc++) {
      const pack = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.28, 0.65),
        new THREE.MeshStandardMaterial({ color: pharmaColors[(sr + sc) % pharmaColors.length], roughness: 0.45 })
      );
      pack.position.set(-313.75, 0.55 + sr * 0.48, -9.8 + sc * 1.15);
      staticGroup.add(pack);
    }
  }
  addBox(-313.6, -308.8, 0, 1.02, -14.0, -12.6, cafeWoodMat);
  addBox(-311.6, -310.8, 1.05, 1.52, -13.3, -13.1, swapScreenMat); // Lit POS screen
  // Center Flower & Fruit Gift Island (`X = -311.0 .. -307.8, Z = -8.2 .. -4.5`)
  addBox(-311.0, -307.8, 0, 0.85, -8.2, -4.5, cafeWoodMat);
  addBox(-310.4, -308.4, 0.85, 1.18, -7.8, -4.9, whiteTrimMat); // Tiered display riser
  const giftColors = [0xf43f5e, 0xf59e0b, 0x22c55e, 0xa855f7, 0xfbbf24, 0xec4899];
  for (let gx = 0; gx < 3; gx++) {
    for (let gz = 0; gz < 3; gz++) {
      const bouquet = new THREE.Mesh(
        new THREE.ConeGeometry(0.30, 0.56, 10),
        new THREE.MeshStandardMaterial({ color: giftColors[(gx * 3 + gz) % giftColors.length], roughness: 0.55 })
      );
      bouquet.rotation.x = Math.PI;
      bouquet.position.set(-310.3 + gx * 0.9, 1.46, -7.4 + gz * 1.1);
      staticGroup.add(bouquet);
    }
  }

  // Outdoor Shaded Terrace Tables in Front of Utility Complex (`Z = 8.4`) with glowing table lamps
  [-336.0, -331.0, -321.5, -310.0].forEach((tx, idx) => {
    addBox(tx - 0.85, tx + 0.85, 0.72, 0.80, 8.0, 8.8, warmDeckMat);
    addBox(tx - 0.12, tx + 0.12, 0, 0.72, 8.28, 8.52, darkSteelMat);
    [7.4, 9.4].forEach((cz) => {
      addBox(tx - 0.75, tx + 0.75, 0.42, 0.48, cz - 0.18, cz + 0.18, warmDeckMat);
    });
    const tLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 10), warmBulbMat);
    tLamp.position.set(tx + 0.35, 0.89, 8.4);
    staticGroup.add(tLamp);
    const tCup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8), whiteTrimMat);
    tCup.position.set(tx - 0.38, 0.86, 8.32);
    staticGroup.add(tCup);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.45, 8), darkSteelMat);
    pole.position.set(tx, 1.25, 8.4);
    staticGroup.add(pole);
    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(1.52, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0x10b981 : 0xf59e0b, roughness: 0.65 })
    );
    umbrella.position.set(tx, 2.55, 8.4);
    staticGroup.add(umbrella);
  });

  // =========================================================================
  // 7. LOCALIZED HIGH-OUTPUT POINT LIGHTS (CALIBRATED FOR POOLED LIGHTING)
  // =========================================================================
  const registerHubLight = (color: number, x: number, y: number, z: number, dist: number, dayInt: number, nightInt: number) => {
    const l = new THREE.PointLight(color, nightInt, dist, 0.95);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };

  // Tổ hợp Tiện ích Thăm Bệnh 24/7 (West Cafe, East Pharmacy/Minimart, Floor 2 Clinic, Outdoor Terrace)
  registerHubLight(0xfffbeb, -333.5, 3.6, -3.0, 26, 9, 30);
  registerHubLight(0xf8fafc, -315.5, 3.6, -3.0, 28, 10, 34);
  registerHubLight(0xe0f2fe, -321.0, 6.8, -1.5, 34, 9, 32);
  registerHubLight(0xfef3c7, -321.0, 4.4, 10.5, 34, 6, 30);

  // Khu Ẩm thực Đêm & Trạm Sạc Xe Máy Điện & Vịnh Đón Khách
  registerHubLight(0xfde68a, -282.5, 4.4, -1.5, 38, 6, 34);
  registerHubLight(0xfffbeb, -282.5, 3.0, -10.5, 30, 7, 28);
  registerHubLight(0xd1fae5, -253.5, 4.0, -8.5, 30, 7, 30);
  registerHubLight(0xe0f2fe, -253.5, 4.2, 8.5, 30, 6, 26);

  let clock = 0;
  const update = (delta: number, _rawHour: number, lampFactor: number) => {
    clock += Math.min(delta, 0.1);
    const pulse = 0.75 + 0.55 * (0.5 + 0.5 * Math.sin(clock * 3.4));
    for (let i = 0; i < evPulseMats.length; i++) {
      evPulseMats[i].emissiveIntensity = (0.7 + lampFactor * 0.8) * pulse;
    }
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    update,
  };
}

// =========================================================================
// LIVE NPCS: VENDORS, DINERS, E-BIKE CHARGERS & HOSPITAL STAFF / VISITORS
// =========================================================================

interface HubNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleYaw?: number;
  seated?: boolean;
  glbHandle: GlbHumanHandle;
}

function buildHubCharacterMesh(
  helpers: HospitalCharacterHelpers,
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
  hatColor: number | null,
  seated = false
) {
  const grp = new THREE.Group();
  const hips = new THREE.Group();
  grp.add(hips);

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.25), shirtMat);
  torso.position.y = 1.04;
  hips.add(torso);

  const faceTex = helpers.createFaceTexture('happy', skin);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
  head.position.y = 1.48;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
  hair.position.y = 1.61;
  hips.add(hair);

  if (hatColor !== null) {
    const hat = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.09, 0.34),
      new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.6 })
    );
    hat.position.set(0, 1.66, 0.02);
    hips.add(hat);
  }

  const makeArm = (ax: number) => {
    const p = new THREE.Group();
    p.position.set(ax, 1.26, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), shirtMat);
    m.position.y = -0.18;
    p.add(m);
    hips.add(p);
    return p;
  };
  const leftArm = makeArm(-0.30);
  const rightArm = makeArm(0.30);

  const makeLeg = (lx: number) => {
    const p = new THREE.Group();
    p.position.set(lx, 0.76, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.16), pantsMat);
    leg.position.y = -0.32;
    p.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
    shoe.position.set(0, -0.68, 0.03);
    p.add(shoe);
    hips.add(p);
    return p;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);

  if (seated) {
    hips.position.y = -0.26;
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = -0.4;
    rightArm.rotation.x = -0.4;
  }

  return { group: grp, hips, leftArm, rightArm, leftLeg, rightLeg };
}

export class HospitalNightHubNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: HubNpcActor[] = [];

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const specs: Array<{
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      hat: number | null;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // 4 Food Stall Vendors behind counters
      { shirt: 0x14b8a6, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827, hat: 0xffffff, waypoints: [new THREE.Vector3(-294.4, 0.03, -12.4)], idleYaw: 0 },
      { shirt: 0xf97316, pants: 0x1e293b, skin: '#fce0c8', hair: 0x27150a, hat: 0xf8fafc, waypoints: [new THREE.Vector3(-286.5, 0.03, -12.4)], idleYaw: 0 },
      { shirt: 0x1e293b, pants: 0x0f172a, skin: '#f5c7a3', hair: 0x18181b, hat: 0x334155, waypoints: [new THREE.Vector3(-278.5, 0.03, -12.4)], idleYaw: 0 },
      { shirt: 0x22c55e, pants: 0x14532d, skin: '#e8b48e', hair: 0x3f2305, hat: 0xfef08a, waypoints: [new THREE.Vector3(-270.5, 0.03, -12.4)], idleYaw: 0 },
      // 4 Diners seated at outdoor tables
      { shirt: 0x3b82f6, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, hat: null, waypoints: [new THREE.Vector3(-294.0, 0.03, -4.85)], idleYaw: 0, seated: true },
      { shirt: 0xec4899, pants: 0x334155, skin: '#fce0c8', hair: 0x27150a, hat: null, waypoints: [new THREE.Vector3(-286.5, 0.03, -3.15)], idleYaw: Math.PI, seated: true },
      { shirt: 0xffffff, pants: 0x0f172a, skin: '#f5c7a3', hair: 0x18181b, hat: null, waypoints: [new THREE.Vector3(-279.0, 0.03, 3.15)], idleYaw: 0, seated: true },
      { shirt: 0x8b5cf6, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x3f2305, hat: null, waypoints: [new THREE.Vector3(-271.5, 0.03, 4.85)], idleYaw: Math.PI, seated: true },
      // 4 Walking Patrons / Doctors / EV Riders / Attendant
      {
        shirt: 0xffffff,
        pants: 0x0369a1,
        skin: '#fce0c8',
        hair: 0x111827,
        hat: null,
        waypoints: [
          new THREE.Vector3(-281.0, 0.03, 14.5),
          new THREE.Vector3(-281.0, 0.03, -0.5),
          new THREE.Vector3(-278.5, 0.03, -8.8),
          new THREE.Vector3(-286.5, 0.03, -8.8),
          new THREE.Vector3(-281.0, 0.03, -0.5),
        ],
        speed: 1.4,
      },
      {
        shirt: 0x10b981,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x27150a,
        hat: 0x059669,
        waypoints: [
          new THREE.Vector3(-254.0, 0.02, -14.2),
          new THREE.Vector3(-254.0, 0.02, -9.2),
          new THREE.Vector3(-263.5, 0.02, -9.2),
          new THREE.Vector3(-263.5, 0.02, -0.5),
          new THREE.Vector3(-254.0, 0.02, -9.2),
        ],
        speed: 1.35,
      },
      {
        shirt: 0xf59e0b,
        pants: 0x334155,
        skin: '#e8b48e',
        hair: 0x18181b,
        hat: null,
        waypoints: [
          new THREE.Vector3(-258.5, 0.02, 6.6),
          new THREE.Vector3(-264.5, 0.02, 6.6),
          new THREE.Vector3(-265.0, 0.03, -0.5),
          new THREE.Vector3(-270.5, 0.03, -8.8),
          new THREE.Vector3(-264.5, 0.02, 6.6),
        ],
        speed: 1.28,
      },
      {
        shirt: 0x1e3a8a,
        pants: 0x0f172a,
        skin: '#f5c7a3',
        hair: 0x09090b,
        hat: 0x0f172a,
        waypoints: [
          new THREE.Vector3(-244.0, 0.02, 6.8),
          new THREE.Vector3(-253.0, 0.02, 6.8),
        ],
        speed: 0.9,
      },
      // 24/7 Patient Visiting Utility Complex NPCs (Staff + Terrace Diners + Cross-Plaza Visitors)
      { shirt: 0x92400e, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827, hat: 0x78350f, waypoints: [new THREE.Vector3(-332.2, 0.03, -10.8)], idleYaw: 0 },
      { shirt: 0xffffff, pants: 0x065f46, skin: '#fce0c8', hair: 0x27150a, hat: null, waypoints: [new THREE.Vector3(-321.2, 0.03, -12.0)], idleYaw: 0 },
      { shirt: 0xec4899, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x3f2305, hat: null, waypoints: [new THREE.Vector3(-311.2, 0.03, -11.6)], idleYaw: 0 },
      { shirt: 0x0ea5e9, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x18181b, hat: null, waypoints: [new THREE.Vector3(-336.0, 0.03, 7.5)], idleYaw: 0, seated: true },
      { shirt: 0xffffff, pants: 0x0f172a, skin: '#fce0c8', hair: 0x111827, hat: null, waypoints: [new THREE.Vector3(-321.5, 0.03, 9.3)], idleYaw: Math.PI, seated: true },
      {
        shirt: 0x10b981,
        pants: 0x1e293b,
        skin: '#e8b48e',
        hair: 0x111827,
        hat: null,
        waypoints: [
          new THREE.Vector3(-308.8, 0.03, -2.5),
          new THREE.Vector3(-308.8, 0.03, 6.5),
          new THREE.Vector3(-297.5, 0.03, 6.5),
          new THREE.Vector3(-294.4, 0.03, -8.5),
          new THREE.Vector3(-297.5, 0.03, 6.5),
        ],
        speed: 1.38,
      },
      {
        shirt: 0xf97316,
        pants: 0x334155,
        skin: '#fbd3b4',
        hair: 0x27150a,
        hat: null,
        waypoints: [
          new THREE.Vector3(-321.0, 0.03, -8.5),
          new THREE.Vector3(-321.0, 0.03, 6.2),
          new THREE.Vector3(-333.5, 0.03, 6.2),
          new THREE.Vector3(-333.5, 0.03, -8.5),
          new THREE.Vector3(-333.5, 0.03, 6.2),
        ],
        speed: 1.32,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildHubCharacterMesh(helpers, s.shirt, s.pants, s.skin, s.hair, s.hat, Boolean(s.seated));
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      const glbHandle =
        idx === 8
          ? (() => {
              const docSpec = pickDoctorNpcModel(idx);
              return attachGlbHumanToNpc({
                modelSource: docSpec.modelSource,
                hostGroup: built.group,
                fallbackMeshes: [built.hips],
                targetHeight: docSpec.targetHeight,
                clipProfile: docSpec.clipProfile,
                rotationY: docSpec.rotationY,
                initialState: 'Walk',
                phaseOffset: idx * 0.9,
              });
            })()
          : idx === 11
          ? attachGlbHumanToNpc({
              modelSource: GUARD_NPC_MODEL.modelSource,
              hostGroup: built.group,
              fallbackMeshes: [built.hips],
              targetHeight: GUARD_NPC_MODEL.targetHeight,
              clipProfile: GUARD_NPC_MODEL.clipProfile,
              rotationY: GUARD_NPC_MODEL.rotationY,
              palette: { suit: 0x0f172a, shirt: 0x38bdf8, accent: 0xfacc15 },
              initialState: 'Walk',
              phaseOffset: idx * 0.9,
            })
          : (() => {
              const spec =
                s.seated
                  ? pickSeatedCivilianModel(idx * 3 + 2)
                  : s.waypoints.length > 1
                  ? pickOutsideNpcModel(idx * 3 + 1)
                  : pickStationaryCivilianModel(idx * 3 + 2);
              return attachGlbHumanToNpc({
                modelSource: spec.modelSource,
                hostGroup: built.group,
                fallbackMeshes: [built.hips],
                targetHeight: spec.targetHeight,
                clipProfile: spec.clipProfile,
                rotationY: spec.rotationY,
                initialState: s.seated ? 'Sit' : s.waypoints.length > 1 ? 'Walk' : 'Idle',
                phaseOffset: idx * 0.9,
              });
            })();

      this.actors.push({
        group: built.group,
        hips: built.hips,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        waypoints: s.waypoints,
        wpIdx: s.waypoints.length > 1 ? 1 : 0,
        speed: s.speed ?? 1.3,
        walkPhase: idx * 0.9,
        idleYaw: s.idleYaw,
        seated: s.seated,
        glbHandle,
      });
    });
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.1);
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.waypoints.length <= 1) {
        if (a.idleYaw !== undefined) a.group.rotation.y = a.idleYaw;
        if (!a.seated) {
          a.walkPhase += dt * 1.6;
          a.hips.position.y = Math.sin(a.walkPhase) * 0.008;
        }
        continue;
      }
      const target = a.waypoints[a.wpIdx];
      const dx = target.x - a.group.position.x;
      const dz = target.z - a.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.20) {
        a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
      } else {
        const step = Math.min(dist, a.speed * dt);
        a.group.position.x += (dx / dist) * step;
        a.group.position.z += (dz / dist) * step;
        a.group.rotation.y = Math.atan2(dx, dz);
        a.walkPhase += dt * (4.4 + a.speed * 1.8);
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftArm.rotation.x = swing;
        a.rightArm.rotation.x = a.glbHandle.hasActiveUmbrella() ? -0.88 : -swing;
        a.leftLeg.rotation.x = -swing * 1.15;
        a.rightLeg.rotation.x = swing * 1.15;
        a.hips.position.y = Math.abs(Math.sin(a.walkPhase)) * 0.03;
      }
    }
  }
}
