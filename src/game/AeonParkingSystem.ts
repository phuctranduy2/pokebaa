import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickOutsideNpcModel, pickStationaryCivilianModel, WORKER_GUARD_NPC_MODEL } from './NpcModelCatalog';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import { buildCityCarMesh, buildCityMotorbikeMesh } from './CityVehicleMeshBuilder';

export interface AeonParkingBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

// Lot Footprint right behind AEON MALL SE L-Corner:
// West Border:  X = 144.3 (Flush with AEON South Rear Annex East Wall)
// North Border: Z = 91.7  (Flush with AEON East Wing South Rear Wall)
// East Front:   X = 180.0 (Opens onto AEON East Avenue West Sidewalk via Gate Z = 96.0 .. 109.0)
// South Border: Z = 126.0
const PARK_LOT_MIN_X = 144.3;
const PARK_LOT_MAX_X = 180.0;
const PARK_LOT_MIN_Z = 91.7;
const PARK_LOT_MAX_Z = 126.0;

export const AEON_PARKING_COLLIDERS: IntersectionColliderBox[] = [
  // North boundary flush against AEON East Wing South Wall
  { minX: 144.3, maxX: 180.0, minZ: 91.2, maxZ: 92.3, floor: 1 },
  // West boundary flush against AEON South Annex East Wall
  { minX: 143.9, maxX: 145.0, minZ: 91.7, maxZ: 126.2, floor: 1 },
  // South Perimeter Hedge & Curb
  { minX: 144.3, maxX: 180.0, minZ: 125.3, maxZ: 126.3, floor: 1 },
  // East Perimeter Fence & Hedge (Leaves Gate Opening Z = 95.8 .. 109.2 wide open!)
  { minX: 179.0, maxX: 180.0, minZ: 91.7, maxZ: 95.8, floor: 1 },
  { minX: 179.0, maxX: 180.0, minZ: 109.2, maxZ: 126.2, floor: 1 },

  // Central Smart-Ticket Control Booth Island (leaves Driveways North Z=96..101.0 & South Z=103.8..109.2 clear!)
  { minX: 175.4, maxX: 178.7, minZ: 101.0, maxZ: 103.8, floor: 1 },

  // Motorbike Shed Canopy Columns & Bike Bays (North Zone: Z = 92.8 .. 107.6)
  { minX: 146.5, maxX: 172.0, minZ: 93.0, maxZ: 97.4, floor: 1 }, // Row A1 Parked Motorbikes
  { minX: 146.5, maxX: 172.0, minZ: 101.4, maxZ: 105.8, floor: 1 }, // Row A2 Parked Motorbikes

  // South Zone Parked Cars & EV Chargers (Z = 114.2 .. 125.0, central aisle Z = 107.6 .. 114.2 clear!)
  { minX: 146.5, maxX: 168.5, minZ: 118.4, maxZ: 124.8, floor: 1 }, // South Car Stalls Row B1
  { minX: 170.2, maxX: 177.8, minZ: 118.4, maxZ: 124.8, floor: 1 }, // EV Charging Bays + Pedestals
  { minX: 146.5, maxX: 158.0, minZ: 113.8, maxZ: 117.4, floor: 1 }, // Mid-Island Compact Car Row B2 (leaves Z=107.6..113.8 open)
];

function createParkingGantrySignTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1e1b2e';
  ctx.fillRect(0, 0, w, h);

  // AEON Magenta Signature Top Ribbon
  ctx.fillStyle = '#a21caf';
  ctx.fillRect(0, 0, w, 58);

  // White Parking "P" Square Badge on Left
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(28, 76, 148, 152);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(34, 82, 136, 140);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 112px system-ui, sans-serif';
  ctx.fillText('P', 102, 158);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText('ÆON MALL  •  BÃI GIỮ XE THÔNG MINH', 512, 31);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText('SMART PARKING', 560, 128);

  ctx.fillStyle = '#4ade80';
  ctx.font = '800 32px monospace';
  ctx.fillText('VÀO / IN   ◄  ●  ►   RA / OUT   •   TRỐNG: 128', 568, 198);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createParkingZoneBannerTex(title: string, sub: string, bgHex: string): THREE.CanvasTexture {
  const w = 768;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 50px system-ui, sans-serif';
  ctx.fillText(title, w * 0.5, 60);

  ctx.fillStyle = '#fde047';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText(sub, w * 0.5, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createAsphaltMarkingTex(): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Clean dark architectural asphalt
  ctx.fillStyle = '#232834';
  ctx.fillRect(0, 0, w, h);

  // Subtle asphalt grain
  for (let i = 0; i < 4000; i++) {
    const rx = (i * 197) % w;
    const ry = (i * 313) % h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Note: UV x = (X - 144.3) / 35.7, y = (Z - 91.7) / 34.3
  const px = (wx: number) => ((wx - PARK_LOT_MIN_X) / (PARK_LOT_MAX_X - PARK_LOT_MIN_X)) * w;
  const pz = (wz: number) => ((wz - PARK_LOT_MIN_Z) / (PARK_LOT_MAX_Z - PARK_LOT_MIN_Z)) * h;

  // Center Drive Aisle Center Dashed Yellow Line (Z ~ 110.5)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(px(146.0), pz(110.4));
  ctx.lineTo(px(178.5), pz(110.4));
  ctx.stroke();
  ctx.setLineDash([]);

  // Motorbike Yellow Parking Bays (Rows A1 & A2)
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3;
  [93.2, 101.6].forEach((zStart) => {
    const zEnd = zStart + 4.0;
    for (let x = 146.5; x <= 171.5; x += 2.2) {
      ctx.strokeRect(px(x), pz(zStart), px(x + 2.2) - px(x), pz(zEnd) - pz(zStart));
    }
  });

  // South Row Full-Size Car Stalls (White Lines, Z = 119.2 .. 124.8)
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4;
  for (let x = 146.5; x <= 167.5; x += 3.5) {
    ctx.strokeRect(px(x), pz(119.2), px(x + 3.5) - px(x), pz(124.8) - pz(119.2));
  }

  // Mid Row Compact Car Stalls (Z = 113.8 .. 117.4)
  for (let x = 146.5; x <= 157.0; x += 3.5) {
    ctx.strokeRect(px(x), pz(113.8), px(x + 3.5) - px(x), pz(117.4) - pz(113.8));
  }

  // Green EV Charging Bays (SE Corner: X = 170.2 .. 177.2, Z = 119.2 .. 124.8)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.fillRect(px(170.2), pz(119.2), px(177.2) - px(170.2), pz(124.8) - pz(119.2));
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 5;
  ctx.strokeRect(px(170.2), pz(119.2), px(177.2) - px(170.2), pz(124.8) - pz(119.2));

  // Zebra Pedestrian Walkway from AEON Gate Sidewalk -> Lot Center (Z = 107.6 .. 109.1, X = 166.0 .. 179.6)
  ctx.fillStyle = '#f8fafc';
  for (let x = 166.0; x <= 178.8; x += 1.4) {
    ctx.fillRect(px(x), pz(107.8), 18, pz(109.0) - pz(107.8));
  }

  // Gate IN / OUT Lane Arrows
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◄ IN', px(174.5), pz(98.5));
  ctx.fillText('OUT ►', px(174.5), pz(105.8));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createAeonParkingStructure(): AeonParkingBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const lotW = PARK_LOT_MAX_X - PARK_LOT_MIN_X; // 35.7m
  const lotD = PARK_LOT_MAX_Z - PARK_LOT_MIN_Z; // 34.3m
  const lotMidX = (PARK_LOT_MIN_X + PARK_LOT_MAX_X) * 0.5;
  const lotMidZ = (PARK_LOT_MIN_Z + PARK_LOT_MAX_Z) * 0.5;

  // Materials
  const asphaltTex = createAsphaltMarkingTex();
  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.88 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.58 });
  const silverSteelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.72 });
  const aeonMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xa21caf,
    emissive: 0x701a75,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const canopyRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.52, metalness: 0.32 });
  const concreteCurbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 });
  const hazardYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const evGreenMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });
  const ledWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });
  const boothGlassMat = new THREE.MeshStandardMaterial({
    color: 0xf0f9ff,
    roughness: 0.06,
    metalness: 0.15,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  neonMats.push(aeonMagentaMat, evGreenMat, ledWhiteMat);

  const addBox = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    staticGroup.add(m);
    return m;
  };

  // =========================================================================
  // 1. ASPHALT PARKING LOT DECK, PERIMETER CURBS, HEDGES & WHEEL STOPS
  // =========================================================================
  const asphaltSlab = new THREE.Mesh(new THREE.BoxGeometry(lotW, 0.24, lotD), asphaltMat);
  asphaltSlab.position.set(lotMidX, -0.118, lotMidZ); // top at +0.002m, flush & zero overlap with sidewalk
  staticGroup.add(asphaltSlab);

  // Perimeter Curbs & Low Evergreen Hedges along South & East Non-Gate Edges
  addBox(144.4, 179.9, 0.0, 0.22, 125.4, 126.0, concreteCurbMat);
  addBox(144.6, 179.7, 0.22, 0.65, 125.45, 125.95, hedgeMat);
  addBox(179.2, 179.9, 0.0, 0.22, 91.8, 95.8, concreteCurbMat);
  addBox(179.3, 179.8, 0.22, 0.65, 91.9, 95.7, hedgeMat);
  addBox(179.2, 179.9, 0.0, 0.22, 109.2, 126.0, concreteCurbMat);
  addBox(179.3, 179.8, 0.22, 0.65, 109.3, 125.8, hedgeMat);

  // =========================================================================
  // 2. SMART PARKING PORTAL GANTRY, TICKET BOOTH & ANIMATED BOOM BARRIERS
  // =========================================================================
  // Tall Steel Entrance Portal framing Lanes at X = 178.5, Z = 95.8 .. 109.2
  addBox(178.1, 178.6, 0.0, 4.6, 95.7, 96.2, darkSteelMat);
  addBox(178.1, 178.6, 0.0, 4.6, 108.9, 109.4, darkSteelMat);
  addBox(177.9, 178.8, 4.4, 5.8, 95.5, 109.5, darkSteelMat);
  addBox(177.85, 178.85, 5.75, 5.95, 95.45, 109.55, aeonMagentaMat);

  const gantryTex = createParkingGantrySignTex();
  const gantryMat = new THREE.MeshStandardMaterial({
    map: gantryTex,
    emissive: 0xffffff,
    emissiveMap: gantryTex,
    emissiveIntensity: 0.95,
    roughness: 0.24,
  });
  neonMats.push(gantryMat);

  const gantryFrontSign = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 1.32), gantryMat);
  gantryFrontSign.rotation.y = Math.PI / 2;
  gantryFrontSign.position.set(178.82, 5.1, 102.5);
  gantryFrontSign.userData.noMerge = true;
  staticGroup.add(gantryFrontSign);

  const gantryBackSign = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 1.32), gantryMat);
  gantryBackSign.rotation.y = -Math.PI / 2;
  gantryBackSign.position.set(177.88, 5.1, 102.5);
  gantryBackSign.userData.noMerge = true;
  staticGroup.add(gantryBackSign);

  // Smart-Card Security Kiosk Island (X = 175.6 .. 178.5, Z = 101.2 .. 103.6)
  addBox(175.5, 178.6, 0.0, 0.16, 101.1, 103.7, concreteCurbMat);
  addBox(175.8, 178.3, 0.16, 1.05, 101.3, 103.5, darkSteelMat);
  addBox(175.75, 178.35, 2.38, 2.72, 101.25, 103.55, aeonMagentaMat);
  // Clear glass enclosure for attendant booth
  addBox(175.85, 178.25, 1.05, 2.38, 101.35, 103.45, boothGlassMat);
  // 4 Slim corner mullions on kiosk
  [
    [175.85, 101.35],
    [178.25, 101.35],
    [175.85, 103.45],
    [178.25, 103.45],
  ].forEach(([mx, mz]) => {
    addBox(mx - 0.05, mx + 0.05, 1.05, 2.38, mz - 0.05, mz + 0.05, silverSteelMat);
  });
  // Desk & Dual Parking Monitor Screens inside clear glass kiosk
  addBox(176.2, 177.9, 1.05, 1.12, 101.6, 103.2, silverSteelMat);
  addBox(176.6, 176.7, 1.12, 1.50, 101.9, 102.9, ledWhiteMat);

  // Two Automated Boom Barrier Pedestals & Lifting Arms (`inArm` opens for approaching player)
  const buildBarrierArm = (bx: number, bz: number, armDirZ: 1 | -1) => {
    addBox(bx - 0.22, bx + 0.22, 0.0, 1.08, bz - 0.22, bz + 0.22, aeonMagentaMat);
    addBox(bx - 0.24, bx + 0.24, 0.92, 1.10, bz - 0.24, bz + 0.24, hazardYellowMat);
    const pivot = new THREE.Group();
    pivot.userData.noMerge = true;
    pivot.position.set(bx, 0.96, bz);
    for (let seg = 0; seg < 6; seg++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.10, 0.62),
        seg % 2 === 0 ? hazardYellowMat : darkSteelMat
      );
      m.position.set(0, 0, armDirZ * (0.35 + seg * 0.62));
      pivot.add(m);
    }
    staticGroup.add(pivot);
    return pivot;
  };
  const inBarrierArm = buildBarrierArm(177.0, 100.85, -1); // Swings across IN lane Z=96.5..100.85
  const outBarrierArm = buildBarrierArm(177.0, 103.95, 1); // Swings across OUT lane Z=103.95..108.0

  // =========================================================================
  // 3. KHU GỬI XE MÁY CÓ MÁI CHE (MOTORBIKE SHED: Z = 92.6 .. 106.4)
  // =========================================================================
  // 2 Covered Canopy Wings (Row A1 Z=92.8..97.6, Row A2 Z=101.2..106.0)
  [95.2, 103.6].forEach((cz, idx) => {
    // Roof Canopy & Magenta Edge Fascia
    addBox(146.2, 172.6, 3.65, 3.92, cz - 2.35, cz + 2.35, canopyRoofMat);
    addBox(146.15, 172.65, 3.55, 3.72, cz - 2.40, cz - 2.28, aeonMagentaMat);
    addBox(146.15, 172.65, 3.55, 3.72, cz + 2.28, cz + 2.40, aeonMagentaMat);

    // 4 Pairs of Steel H-Columns supporting Roof
    [147.2, 155.4, 163.6, 171.8].forEach((px) => {
      addBox(px - 0.12, px + 0.12, 0.0, 3.65, cz - 0.14, cz + 0.14, darkSteelMat);
    });

    // Under-Canopy Bright Linear LED Tube Strips
    [151.0, 159.5, 168.0].forEach((lx) => {
      addBox(lx - 2.4, lx + 2.4, 3.56, 3.64, cz - 0.08, cz + 0.08, ledWhiteMat);
    });

    // Overhead Zone Sign Facing East Avenue / Aisle
    const zoneTex = createParkingZoneBannerTex(
      idx === 0 ? 'KHU XE MÁY • A1' : 'KHU XE MÁY • A2',
      'MOTO PARKING  •  CẤM HÚT THUỐC',
      '#86198f'
    );
    const zoneMat = new THREE.MeshStandardMaterial({
      map: zoneTex,
      emissive: 0xffffff,
      emissiveMap: zoneTex,
      emissiveIntensity: 0.72,
      roughness: 0.3,
    });
    neonMats.push(zoneMat);
    const zoneSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.75), zoneMat);
    zoneSign.rotation.y = Math.PI / 2;
    zoneSign.position.set(172.68, 3.45, cz);
    zoneSign.userData.noMerge = true;
    staticGroup.add(zoneSign);
  });

  // Back AEON Lobby Link Wayfinding Panel mounted cleanly on AEON East Annex Wall (X=144.36)
  const linkTex = createParkingZoneBannerTex('← LỐI VÀO AEON MALL', 'SẢNH TẦNG 1  •  AEON STYLE / CGV', '#1e293b');
  const linkMat = new THREE.MeshStandardMaterial({
    map: linkTex,
    emissive: 0xffffff,
    emissiveMap: linkTex,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  neonMats.push(linkMat);
  const linkSign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.0), linkMat);
  linkSign.rotation.y = Math.PI / 2;
  linkSign.position.set(144.38, 2.8, 108.4);
  linkSign.userData.noMerge = true;
  staticGroup.add(linkSign);

  // Build 18 Realistic Parked Scooters / Motorbikes neatly parked under canopies A1 & A2
  const motoColors = [0xdc2626, 0xf8fafc, 0x1e293b, 0x0284c7, 0x10b981, 0xf59e0b, 0x64748b];
  const buildParkedMoto = (mx: number, mz: number, rotY: number, colorHex: number) => {
    const builtBike = buildCityMotorbikeMesh({
      color: colorHex,
      variant: Math.round(mx * 10) % 2 === 0 ? 'scooter' : 'sport',
      includeRider: false,
      kickstandTilt: true,
      headlightIntensity: 0.1,
      brakeIntensity: 0.08,
      noMerge: false,
    });
    builtBike.group.position.set(mx, 0, mz);
    builtBike.group.rotation.y = rotY + Math.PI;
    staticGroup.add(builtBike.group);
  };

  for (let i = 0; i < 9; i++) {
    const bx = 148.2 + i * 2.55;
    buildParkedMoto(bx, 94.6, 0, motoColors[i % motoColors.length]);
    buildParkedMoto(bx, 96.4, Math.PI, motoColors[(i + 2) % motoColors.length]);
    buildParkedMoto(bx, 102.9, 0, motoColors[(i + 4) % motoColors.length]);
    if (i % 2 === 0) {
      buildParkedMoto(bx, 104.7, Math.PI, motoColors[(i + 1) % motoColors.length]);
    }
  }

  // =========================================================================
  // 4. KHU ĐỖ Ô TÔ & TRẠM SẠC XE ĐIỆN EV CHARGING (SOUTH ZONE: Z = 113.6..125)
  // =========================================================================
  const buildParkedCar = (cx: number, cz: number, rotY: number, colorHex: number, isSuv: boolean) => {
    const builtCar = buildCityCarMesh({
      color: colorHex,
      variant: isSuv ? 'suv' : 'sedan',
      headlightIntensity: 0.12,
      brakeIntensity: 0.08,
      noMerge: false,
    });
    builtCar.group.position.set(cx, 0, cz);
    builtCar.group.rotation.y = rotY + Math.PI;
    staticGroup.add(builtCar.group);
  };

  // South Bay Sedans & SUVs (keeping 2 bays open cleanly)
  buildParkedCar(148.25, 122.0, 0, 0xf8fafc, true);
  buildParkedCar(151.75, 122.0, Math.PI, 0x334155, false);
  buildParkedCar(158.75, 122.0, 0, 0x991b1b, true);
  buildParkedCar(162.25, 122.0, 0, 0xcbd5e1, false);
  buildParkedCar(165.75, 122.0, Math.PI, 0x1e3a8a, true);
  // Mid Compact Island Cars
  buildParkedCar(148.5, 115.6, Math.PI / 2, 0x0f172a, false);
  buildParkedCar(154.5, 115.6, -Math.PI / 2, 0xe2e8f0, true);
  // Parked White EV Crossover plugged in at V-GREEN / AEON EV Stall
  buildParkedCar(172.2, 122.0, 0, 0xffffff, true);

  // Wheel Stops along South Car Stalls
  for (let x = 147.2; x <= 175.0; x += 3.5) {
    addBox(x, x + 1.8, 0.0, 0.14, 124.25, 124.48, hazardYellowMat);
  }

  // Dual EV Fast Charger Stations at SE Corner (X = 171.8 & 175.4, Z = 124.9)
  [172.2, 175.6].forEach((ex) => {
    addBox(ex - 0.32, ex + 0.32, 0.0, 1.75, 124.7, 125.15, darkSteelMat);
    addBox(ex - 0.34, ex + 0.34, 1.55, 1.82, 124.66, 125.18, evGreenMat);
    addBox(ex - 0.20, ex + 0.20, 1.05, 1.42, 124.65, 124.72, ledWhiteMat);
  });

  // 2 Tall Dual-Arm Floodlight Poles illuminating the Open-Air Car Parking Yard
  [154.0, 169.0].forEach((fx) => {
    addBox(fx - 0.12, fx + 0.12, 0.0, 6.2, 117.6, 117.85, darkSteelMat);
    addBox(fx - 1.1, fx + 1.1, 6.1, 6.32, 117.55, 117.90, darkSteelMat);
    addBox(fx - 0.95, fx - 0.25, 6.02, 6.12, 117.45, 118.0, ledWhiteMat);
    addBox(fx + 0.25, fx + 0.95, 6.02, 6.12, 117.45, 118.0, ledWhiteMat);
  });

  // =========================================================================
  // 5. BUDGET SCALED POINT LIGHTS (2 LIGHTS COVERING GATE & PARKING YARD)
  // =========================================================================
  const gateLight = new THREE.PointLight(0xfdf2f8, 1.6, 30, 1.3);
  gateLight.position.set(177.2, 4.4, 102.5);
  scaledLights.push({
    light: gateLight,
    dayInt: 0.4,
    nightInt: 2.8,
    getScale: () => 1.0,
  });

  const yardLight = new THREE.PointLight(0xe0f2fe, 1.8, 36, 1.25);
  yardLight.position.set(161.0, 5.8, 116.5);
  scaledLights.push({
    light: yardLight,
    dayInt: 0.5,
    nightInt: 3.1,
    getScale: () => 1.0,
  });

  let barrierOpen = 0;
  const update = (delta: number, _rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Math.min(delta, 0.1);
    const glowScale = 0.8 + lampFactor * 0.6;
    ledWhiteMat.emissiveIntensity = 1.15 * glowScale;
    aeonMagentaMat.emissiveIntensity = 0.3 + lampFactor * 0.55;
    evGreenMat.emissiveIntensity = 0.75 + lampFactor * 0.65;

    const nearGate = Boolean(
      playerPos &&
        playerPos.y < 2.2 &&
        playerPos.x >= 170.5 &&
        playerPos.x <= 184.5 &&
        playerPos.z >= 95.0 &&
        playerPos.z <= 109.5
    );
    barrierOpen = THREE.MathUtils.lerp(barrierOpen, nearGate ? 1 : 0, Math.min(1, dt * 6.0));
    inBarrierArm.rotation.x = barrierOpen * 1.28;
    outBarrierArm.rotation.x = -barrierOpen * 1.15;
  };

  update(0, 12.0, 0);

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
// AEON PARKING ATTENDANTS & SHOPPERS (5 ANIMATED ACTORS)
// =========================================================================
interface ParkingActor {
  root: THREE.Group;
  hipsGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  headMesh: THREE.Mesh;
  role: 'guard' | 'patrol' | 'walk';
  seed: number;
  walkPhase: number;
  waypoints?: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  glbHandle: GlbHumanHandle;
}

export class AeonParkingNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: ParkingActor[] = [];
  private timer = 0;

  constructor(helpers: HospitalCharacterHelpers) {
    const specs: Array<{
      role: ParkingActor['role'];
      x: number;
      z: number;
      yaw: number;
      shirt: number;
      pants: number;
      skinHex: string;
      waypoints?: Array<[number, number]>;
    }> = [
      // Kiosk Smart-Ticket Guard inside Glass Booth
      { role: 'guard', x: 177.0, z: 102.4, yaw: Math.PI / 2, shirt: 0x0284c7, pants: 0x0f172a, skinHex: '#f1c27d' },
      // Parking Marshal patrolling Center Aisle
      {
        role: 'patrol',
        x: 168.0,
        z: 108.6,
        yaw: -Math.PI / 2,
        shirt: 0xa21caf,
        pants: 0x1e293b,
        skinHex: '#f5cfa0',
        waypoints: [
          [168.0, 108.6],
          [151.0, 108.6],
          [151.0, 112.5],
          [168.0, 112.5],
        ],
      },
      // Shoppers walking from Car / Moto bays to East Avenue Sidewalk
      {
        role: 'walk',
        x: 158.0,
        z: 118.0,
        yaw: Math.PI / 2,
        shirt: 0xf43f5e,
        pants: 0x1e293b,
        skinHex: '#ffdbac',
        waypoints: [
          [158.0, 118.0],
          [167.0, 108.4],
          [179.5, 108.4],
          [167.0, 108.4],
        ],
      },
      {
        role: 'walk',
        x: 154.0,
        z: 99.5,
        yaw: Math.PI / 2,
        shirt: 0x10b981,
        pants: 0x334155,
        skinHex: '#e0ac69',
        waypoints: [
          [154.0, 99.5],
          [169.0, 99.5],
          [169.0, 108.4],
          [154.0, 99.5],
        ],
      },
    ];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.72 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });

    specs.forEach((sp, idx) => {
      const root = new THREE.Group();
      const hipsGroup = new THREE.Group();
      hipsGroup.position.y = 0.80;
      root.add(hipsGroup);

      const shirtMat = new THREE.MeshStandardMaterial({ color: sp.shirt, roughness: 0.7 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: sp.pants, roughness: 0.78 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.24), shirtMat);
      torso.position.y = 0.28;
      hipsGroup.add(torso);

      const faceTex = helpers.createFaceTexture('happy', sp.skinHex);
      const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.27, 0.27, 0.27);
      headMesh.position.y = 0.72;
      hipsGroup.add(headMesh);

      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.10, 0.29), hairMat);
      hair.position.y = 0.86;
      hipsGroup.add(hair);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 0.52, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), shirtMat);
        m.position.y = -0.20;
        p.add(m);
        hipsGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.27);
      const rightArm = makeArm(0.27);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.64, 0.15), pantsMat);
        leg.position.y = -0.32;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), shoeMat);
        shoe.position.set(0, -0.68, 0.03);
        p.add(shoe);
        hipsGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.10);
      const rightLeg = makeLeg(0.10);

      root.position.set(sp.x, 0, sp.z);
      root.rotation.y = sp.yaw;
      this.rootGroup.add(root);

      const glbHandle =
        sp.role === 'guard'
          ? attachGlbHumanToNpc({
              modelSource: WORKER_GUARD_NPC_MODEL.modelSource,
              hostGroup: root,
              fallbackMeshes: [hipsGroup],
              targetHeight: WORKER_GUARD_NPC_MODEL.targetHeight,
              clipProfile: WORKER_GUARD_NPC_MODEL.clipProfile,
              rotationY: WORKER_GUARD_NPC_MODEL.rotationY,
              initialState: 'Idle',
              phaseOffset: idx * 0.85,
            })
          : (() => {
              const spec =
                sp.role === 'patrol'
                  ? pickStationaryCivilianModel(idx * 3 + 1)
                  : pickOutsideNpcModel(idx * 3 + 2);
              return attachGlbHumanToNpc({
                modelSource: spec.modelSource,
                hostGroup: root,
                fallbackMeshes: [hipsGroup],
                targetHeight: spec.targetHeight,
                clipProfile: spec.clipProfile,
                rotationY: spec.rotationY,
                initialState: 'Walk',
                phaseOffset: idx * 0.85,
              });
            })();

      this.actors.push({
        root,
        hipsGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        headMesh,
        role: sp.role,
        seed: idx * 1.4,
        walkPhase: idx * 0.9,
        waypoints: sp.waypoints?.map(([wx, wz]) => new THREE.Vector3(wx, 0, wz)),
        wpIdx: 1,
        speed: sp.role === 'patrol' ? 1.1 : 1.35,
        glbHandle,
      });
    });
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.08);
    this.timer += dt;

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if ((a.role === 'patrol' || a.role === 'walk') && a.waypoints && a.waypoints.length >= 2) {
        const target = a.waypoints[a.wpIdx % a.waypoints.length];
        const dx = target.x - a.root.position.x;
        const dz = target.z - a.root.position.z;
        const dist = Math.hypot(dx, dz);
        const step = a.speed * dt;
        if (dist <= step + 0.08) {
          a.root.position.copy(target);
          a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
        } else {
          const r = step / dist;
          a.root.position.x += dx * r;
          a.root.position.z += dz * r;
          const yaw = Math.atan2(dx, dz);
          let diff = yaw - a.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          a.root.rotation.y += diff * Math.min(1, dt * 8);
        }
        a.walkPhase += dt * 6.0;
        const swing = Math.sin(a.walkPhase) * 0.42;
        a.leftLeg.rotation.x = swing;
        a.rightLeg.rotation.x = -swing;
        a.leftArm.rotation.x = -swing * 0.55;
        a.rightArm.rotation.x = a.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.55;
      } else {
        const wave = Math.sin(this.timer * 1.8 + a.seed);
        a.headMesh.rotation.y = wave * 0.25;
        a.rightArm.rotation.x = -0.3 + wave * 0.22;
      }
    }
  }
}
