import * as THREE from 'three';
import {
  CITY_ROAD_BOUNDS,
  computeBoulevardSignalFactor,
  computeNorthSouthSignalFactor,
  DIOR_INTERSECTION_CENTER_X,
  EAST_INTERSECTION_CENTER_X as COORD_EAST_CENTER_X,
  FAR_EAST_INTERSECTION_CENTER_X,
  WEST_INTERSECTION_CENTER_X,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import {
  createHaNoiPhoRestaurantStructure,
  type HaNoiPhoNpcController,
} from './HaNoiPhoRestaurantSystem';
import { createBoutiqueHotelStructure } from './BoutiqueHotelSystem';
import { createPeriPoolArenaStructure } from './PeriPoolArenaSystem';
import type { HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox, IntersectionSignalState } from './WestIntersectionSystem';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickOutsideNpcModel } from './NpcModelCatalog';
import { buildAmbientXanhSmTaxiCar } from './XanhSmTaxiSystem';

export interface EastIntersectionCharacterHelpers {
  createFaceTexture: (expression: 'happy' | 'neutral' | 'surprised', skinColor?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    w?: number,
    h?: number,
    d?: number
  ) => THREE.Mesh;
}

export interface EastIntersectionBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  getSignalState: () => IntersectionSignalState;
  isPedestrianZoneActive: () => boolean;
  update: (delta: number, rawHour: number, lampFactor: number) => void;
  updateHaNoiPhoOperatingHours: (
    rawHour: number,
    delta: number,
    lampFactor: number,
    npcController?: HaNoiPhoNpcController | null
  ) => void;
  getHaNoiPhoClosedFactor: () => number;
  updateBoutiqueHotel: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
  updatePeriPoolArena: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

// East 4-Way Intersection center at (X = 193.5, Z = 29.0) — cleanly East of AEON MALL (max X = 176.5)
export const EAST_INTERSECTION_CENTER_X = 193.5;
export const EAST_INTERSECTION_CENTER_Z = 29.0;

export function isPedestrianStreetTime(rawHour: number): boolean {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 4.0;
}

export function isPlayerInPhoDiBoZone(x: number, z: number): boolean {
  // Phố Đi Bộ street & West/East promenades passing under the Gateway Arch (Z <= 15.5)
  return x >= 179.5 && x <= 207.5 && z >= -108.0 && z <= 15.5;
}

export const EAST_INTERSECTION_COLLIDERS: IntersectionColliderBox[] = [
  // North Sidewalk Hedge Line connecting RON PICKLEBALL (144.0) -> TOXIC West Edge (147.0)
  { minX: 144.0, maxX: 147.0, minZ: 14.8, maxZ: 15.8, floor: 1 },
  // South Sidewalk Hedge/Fence Line past AEON MALL East Wing (162.0 -> 180.0)
  { minX: 162.0, maxX: 180.0, minZ: 42.3, maxZ: 45.0, floor: 1 },
  // Phố Đi Bộ East Verge north of 4U CLUB (Z = -104.0 .. -70.0) opens directly into the Walk-In Green Park!
  // NE Corner Setback & City Block Edge (Open X = 207.0..238.0 for Ron Béo, X = 238.0..264.0 for Vietcombank, X = 264.0..274.6 for ATM Booth, X = 277.8..298.8 for Phúc Long, X = 301.8..326.8 for Skechers & X = 329.8..354.8 for John Henry Store; X >= 356.5 opens onto Far-East 4-Way Intersection!)
  { minX: 274.6, maxX: 277.8, minZ: 14.8, maxZ: 15.8, floor: 1 },
  { minX: 298.8, maxX: 301.8, minZ: 14.8, maxZ: 15.8, floor: 1 },
  { minX: 326.8, maxX: 329.8, minZ: 14.8, maxZ: 15.8, floor: 1 },
  { minX: 354.8, maxX: 356.5, minZ: 14.8, maxZ: 15.8, floor: 1 },
  // SE Corner Setback & City Block Edge (Open for Hà Nội Phố, Peri Pool Arena 235.5..271.5, Phê La Coffee 273.5..296.5, Adidas Flagship Store 299.2..325.2 & DESERT Store 328.4..353.4; X >= 356.5 opens onto Far-East 4-Way Intersection!)
  { minX: 233.0, maxX: 235.5, minZ: 42.2, maxZ: 43.2, floor: 1 },
  { minX: 271.5, maxX: 273.5, minZ: 42.2, maxZ: 43.2, floor: 1 },
  { minX: 296.5, maxX: 299.2, minZ: 42.2, maxZ: 43.2, floor: 1 },
  { minX: 325.2, maxX: 328.4, minZ: 42.2, maxZ: 43.2, floor: 1 },
  { minX: 353.4, maxX: 356.5, minZ: 42.2, maxZ: 43.2, floor: 1 },
  // South Avenue West Verge Wall (Open Z = 91.7 .. 126.2 for AEON MALL Smart Parking Lot, meets Ngã Tư Vinhomes at 134.3)
  { minX: 179.0, maxX: 180.0, minZ: 42.5, maxZ: 91.7, floor: 1 },
  { minX: 179.0, maxX: 180.0, minZ: 126.2, maxZ: 134.3, floor: 1 },
  // South Avenue East Verge Wall (Open Z = 42.5 .. 96.6 for Hà Nội Phố & Boutique Hotel, and Z = 96.6 .. 133.4 for Hotel Green Park!)
  { minX: 207.0, maxX: 208.0, minZ: 133.4, maxZ: 134.3, floor: 1 },
  // 4 Traffic Light Gantry Corner Poles
  { minX: 202.2, maxX: 203.2, minZ: 19.3, maxZ: 20.3, floor: 1 }, // NE Pole
  { minX: 202.2, maxX: 203.2, minZ: 37.7, maxZ: 38.7, floor: 1 }, // SE Pole
  { minX: 183.8, maxX: 184.8, minZ: 37.7, maxZ: 38.7, floor: 1 }, // SW Pole
  { minX: 183.8, maxX: 184.8, minZ: 19.3, maxZ: 20.3, floor: 1 }, // NW Pole
  // Phố Đi Bộ Entrance Arch Pillars (Z = 14.4, X = 184.5 & 202.5)
  { minX: 184.1, maxX: 184.9, minZ: 14.0, maxZ: 14.8, floor: 1 },
  { minX: 202.1, maxX: 202.9, minZ: 14.0, maxZ: 14.8, floor: 1 },
];

function createEastTurnArrowTex(type: 'straight' | 'straight_left' | 'straight_right'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(114, 70, 28, 150);
  ctx.beginPath();
  ctx.moveTo(128, 22);
  ctx.lineTo(176, 86);
  ctx.lineTo(80, 86);
  ctx.closePath();
  ctx.fill();

  if (type === 'straight_left') {
    ctx.beginPath();
    ctx.moveTo(114, 150);
    ctx.lineTo(66, 150);
    ctx.lineTo(66, 126);
    ctx.lineTo(26, 162);
    ctx.lineTo(66, 198);
    ctx.lineTo(66, 174);
    ctx.lineTo(114, 174);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'straight_right') {
    ctx.beginPath();
    ctx.moveTo(142, 150);
    ctx.lineTo(190, 150);
    ctx.lineTo(190, 126);
    ctx.lineTo(230, 162);
    ctx.lineTo(190, 198);
    ctx.lineTo(190, 174);
    ctx.lineTo(142, 174);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createEastSignTex(title: string, sub: string, bg = '#065f46'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText(title, 256, 56);
  ctx.fillStyle = '#fde047';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(sub, 256, 114);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPedestrianArchSignTex(pedestrianOpen: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  // Matte deep black panel so only the crisp white LED lettering glows gently
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, 1024, 192);

  // Subtle slim border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 1004, 172);

  if (pedestrianOpen) {
    // No-vehicle red emblem on left & right
    [88, 936].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, 96, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, 96, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 24, 89, 48, 14);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText('PHỐ ĐI BỘ AEON • ĐÊM HỘI', 512, 68);

    ctx.shadowBlur = 2;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText('CẤM XE LƯU THÔNG (16:00 – 04:00)', 512, 130);
    ctx.shadowBlur = 0;
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText('ĐẠI LỘ BẮC • XE LƯU THÔNG', 512, 68);

    ctx.shadowBlur = 2;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText('PHỐ ĐI BỘ CẤM XE TỪ 16:00 ĐẾN 04:00', 512, 130);
    ctx.shadowBlur = 0;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createEastGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 241, 184, 0.36)');
  grad.addColorStop(0.5, 'rgba(255, 224, 130, 0.14)');
  grad.addColorStop(1, 'rgba(255, 224, 130, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEastIntersectionStructure(): EastIntersectionBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.9 });
  const pedPlazaMat = new THREE.MeshStandardMaterial({ color: 0xb6a89a, roughness: 0.86 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.75, metalness: 0.1 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.95 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const yellowMedianMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const poleDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.4 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });

  // =========================================================================
  // PART 1: CONNECTOR (X = 166 .. 180) + 4-WAY ASPHALT ROADS (CENTER X = 193.5, Z = 29.0)
  // =========================================================================
  // 1A. East-West Boulevard Connector & East Extension (X = 166.0 .. 360.0, Z = 20.6 .. 37.4)
  const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(194.0, 16.8), asphaltMat);
  ewRoad.rotation.x = -Math.PI / 2;
  ewRoad.position.set(263.0, -0.26, EAST_INTERSECTION_CENTER_Z);
  staticGroup.add(ewRoad);

  // 1B. North Leg — Phố Đi Bộ Avenue (Z = -109.1 .. 20.6, flush with Đường Bạch Đằng)
  const nsNorthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 129.7), asphaltMat);
  nsNorthRoad.rotation.x = -Math.PI / 2;
  nsNorthRoad.position.set(EAST_INTERSECTION_CENTER_X, -0.26, -44.25);
  staticGroup.add(nsNorthRoad);

  // 1C. South Leg — AEON East Avenue (Z = 37.4 .. 139.6, connects directly into Ngã Tư Vinhomes Ocean Park)
  const nsSouthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 102.2), asphaltMat);
  nsSouthRoad.rotation.x = -Math.PI / 2;
  nsSouthRoad.position.set(EAST_INTERSECTION_CENTER_X, -0.26, 88.5);
  staticGroup.add(nsSouthRoad);

  // =========================================================================
  // PART 2: SIDEWALKS, GRANITE CURBS & CONNECTOR HEDGE
  // =========================================================================
  const addSidewalkSlab = (minX: number, maxX: number, minZ: number, maxZ: number, mat = sidewalkMat) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), mat);
    mesh.position.set((minX + maxX) * 0.5, -0.125, (minZ + maxZ) * 0.5);
    staticGroup.add(mesh);
  };
  const addCurbBar = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = Math.max(0.24, maxX - minX);
    const d = Math.max(0.24, maxZ - minZ);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), curbMat);
    mesh.position.set((minX + maxX) * 0.5, 0.06, (minZ + maxZ) * 0.5);
    staticGroup.add(mesh);
  };

  // Connector Sidewalks (X = 166.0 .. 180.0)
  addSidewalkSlab(166.0, 180.0, 15.58, 20.80);
  addCurbBar(166.0, 180.0, 20.68, 20.92);
  addSidewalkSlab(166.0, 180.0, 37.20, 42.50);
  addCurbBar(166.0, 180.0, 37.08, 37.32);

  // Decorative Low Hedge along North sidewalk between RON PICKLEBALL (144.2) & TOXIC (146.9)
  const northConnectorHedge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.65, 0.75), hedgeMat);
  northConnectorHedge.position.set(145.55, 0.325, 15.15);
  staticGroup.add(northConnectorHedge);

  // NW Corner Sidewalk (Phố Đi Bộ West Promenade: X = 180.0 .. 185.3, Z = -104.0 .. 20.80, flush with Bạch Đằng south sidewalk)
  addSidewalkSlab(180.0, 185.3, -104.0, 15.58, pedPlazaMat);
  addSidewalkSlab(180.0, 185.3, 15.58, 20.80);
  addCurbBar(185.18, 185.42, -104.0, 20.92);
  addCurbBar(180.0, 185.3, 20.68, 20.92);

  // SW Corner Sidewalk (Adjacent to AEON MALL East Annex & Smart Parking: X = 180.0 .. 185.3, Z = 37.20 .. 134.3)
  addSidewalkSlab(180.0, 185.3, 37.20, 134.3);
  addCurbBar(185.18, 185.42, 37.08, 134.3);
  addCurbBar(180.0, 185.3, 37.08, 37.32);

  // NE Corner Sidewalk (Phố Đi Bộ East Promenade & East Leg North: X = 201.7 .. 360.0)
  addSidewalkSlab(201.7, 207.0, -104.0, 15.58, pedPlazaMat);
  addSidewalkSlab(201.7, 360.0, 15.58, 20.80);
  addCurbBar(201.58, 201.82, -104.0, 20.92);
  addCurbBar(201.7, 360.0, 20.68, 20.92);

  // SE Corner Sidewalk (South Avenue East & East Leg South: X = 201.7 .. 360.0, meets Ngã Tư Vinhomes at 134.3)
  addSidewalkSlab(201.7, 207.0, 42.50, 134.3);
  addSidewalkSlab(201.7, 360.0, 37.20, 42.50);
  addCurbBar(201.58, 201.82, 37.08, 134.3);
  addCurbBar(201.7, 360.0, 37.08, 37.32);

  // =========================================================================
  // PART 3: ROAD MARKINGS, CROSSWALKS, STOP LINES & LANE ARROWS
  // =========================================================================
  const addStripe = (x: number, z: number, w: number, d: number, mat: THREE.Material, y = -0.25) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    staticGroup.add(m);
  };

  // West Connector Markings (X = 166.0 .. 180.0)
  [-0.14, 0.14].forEach((off) => addStripe(173.0, EAST_INTERSECTION_CENTER_Z + off, 14.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(173.0, EAST_INTERSECTION_CENTER_Z + dir * 7.75, 14.0, 0.16, stripeMat));
  for (let x = 166.5; x <= 178.0; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, EAST_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }

  // East Boulevard Leg Markings (X = 207.0 .. 360.0)
  const eastLegLen = 153.0;
  const eastLegMidX = 283.5;
  [-0.14, 0.14].forEach((off) => addStripe(eastLegMidX, EAST_INTERSECTION_CENTER_Z + off, eastLegLen, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(eastLegMidX, EAST_INTERSECTION_CENTER_Z + dir * 7.75, eastLegLen, 0.16, stripeMat));
  for (let x = 210; x <= 356; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, EAST_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }

  // North Leg (Phố Đi Bộ) Markings (Z = -105 .. +15.4, cleanly stopping before Ngã 3 crosswalk)
  const nLen = 120.4;
  const nMidZ = -44.8;
  [-0.14, 0.14].forEach((off) => addStripe(EAST_INTERSECTION_CENTER_X + off, nMidZ, 0.12, nLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(EAST_INTERSECTION_CENTER_X + dir * 7.75, nMidZ, 0.16, nLen, stripeMat));
  for (let z = -101; z <= 12; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(EAST_INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // South Leg Markings (Z = 42.6 .. 134.0, cleanly stopping before Ngã Tư Vinhomes crosswalk)
  const sLen = 91.4;
  const sMidZ = 88.3;
  [-0.14, 0.14].forEach((off) => addStripe(EAST_INTERSECTION_CENTER_X + off, sMidZ, 0.12, sLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(EAST_INTERSECTION_CENTER_X + dir * 7.75, sMidZ, 0.16, sLen, stripeMat));
  for (let z = 46; z <= 132; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(EAST_INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // 4 Zebra Crosswalks
  [182.7, 204.3].forEach((cx) => {
    for (let z = 21.8; z <= 36.2; z += 1.05) {
      addStripe(cx, z, 3.2, 0.52, stripeMat, -0.248);
    }
  });
  [18.2, 39.8].forEach((cz) => {
    for (let x = 186.3; x <= 200.7; x += 1.05) {
      addStripe(x, cz, 0.52, 3.2, stripeMat, -0.248);
    }
  });

  // 4 White Stop Lines
  addStripe(180.0, 24.9, 0.42, 7.6, stripeMat, -0.247); // West leg (Eastbound)
  addStripe(207.0, 33.1, 0.42, 7.6, stripeMat, -0.247); // East leg (Westbound)
  addStripe(189.4, 15.4, 7.6, 0.42, stripeMat, -0.247); // North leg (Southbound)
  addStripe(197.6, 42.6, 7.6, 0.42, stripeMat, -0.247); // South leg (Northbound)

  // Lane Directional Arrows
  const straightTex = createEastTurnArrowTex('straight');
  const straightLeftTex = createEastTurnArrowTex('straight_left');
  const straightRightTex = createEastTurnArrowTex('straight_right');
  const addLaneArrow = (x: number, z: number, yaw: number, tex: THREE.CanvasTexture) => {
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.7), mat);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = yaw;
    mesh.position.set(x, -0.246, z);
    staticGroup.add(mesh);
  };
  addLaneArrow(175.5, 26.8, -Math.PI / 2, straightLeftTex);
  addLaneArrow(175.5, 23.2, -Math.PI / 2, straightRightTex);
  addLaneArrow(211.5, 31.1, Math.PI / 2, straightLeftTex);
  addLaneArrow(211.5, 34.8, Math.PI / 2, straightRightTex);
  addLaneArrow(191.4, 11.2, Math.PI, straightLeftTex);
  addLaneArrow(187.4, 11.2, Math.PI, straightRightTex);
  addLaneArrow(195.6, 46.8, 0, straightLeftTex);
  addLaneArrow(199.6, 46.8, 0, straightRightTex);
  addLaneArrow(228.0, 31.1, Math.PI / 2, straightTex);
  addLaneArrow(199.6, 62.0, 0, straightTex);
  addLaneArrow(199.6, 128.0, 0, straightTex);
  addLaneArrow(191.4, 128.0, Math.PI, straightTex);

  // =========================================================================
  // PART 4: PHỐ ĐI BỘ GATEWAY ARCH, RETRACTABLE BOLLARDS & FESTIVAL STRING LIGHTS
  // =========================================================================
  const archGroup = new THREE.Group();
  archGroup.position.set(EAST_INTERSECTION_CENTER_X, 0, 14.4);
  const archSteelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.72 });

  [-9.0, 9.0].forEach((px) => {
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.65, 0.76), poleDarkMat);
    pBase.position.set(px, 0.325, 0);
    archGroup.add(pBase);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.23, 6.65, 12), archSteelMat);
    pillar.position.set(px, 3.325, 0);
    archGroup.add(pillar);
  });

  // Compact overhead steel mounting beams above & below signboard so nothing blocks the text
  const archTopBeam = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.22, 0.28), archSteelMat);
  archTopBeam.position.set(0, 6.52, 0);
  archGroup.add(archTopBeam);
  const archBotBeam = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.18, 0.24), archSteelMat);
  archBotBeam.position.set(0, 4.58, 0);
  archGroup.add(archBotBeam);
  staticGroup.add(archGroup);

  // Dynamic Arch Signboards (compact black panel + gentle white LED typography at night)
  const pedOpenTex = createPedestrianArchSignTex(true);
  const pedOpenMat = new THREE.MeshStandardMaterial({
    map: pedOpenTex,
    emissive: 0xffffff,
    emissiveMap: pedOpenTex,
    emissiveIntensity: 0.18,
    roughness: 0.55,
  });
  const pedOpenBoard = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.75, 0.22), pedOpenMat);
  pedOpenBoard.position.set(EAST_INTERSECTION_CENTER_X, 5.55, 14.4);
  pedOpenBoard.userData.noMerge = true;
  staticGroup.add(pedOpenBoard);

  const pedDayTex = createPedestrianArchSignTex(false);
  const pedDayMat = new THREE.MeshStandardMaterial({
    map: pedDayTex,
    emissive: 0xffffff,
    emissiveMap: pedDayTex,
    emissiveIntensity: 0.18,
    roughness: 0.55,
  });
  const pedDayBoard = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.75, 0.22), pedDayMat);
  pedDayBoard.position.set(EAST_INTERSECTION_CENTER_X, 5.55, 14.4);
  pedDayBoard.userData.noMerge = true;
  staticGroup.add(pedDayBoard);

  // 8 Motorized Retractable Steel Bollards across the Phố Đi Bộ Road Entrance (Z = 15.35, X = 186.2 .. 200.8)
  const bollardMeshes: THREE.Group[] = [];
  const bollardBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 });
  const bollardLedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf43f5e,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  for (let i = 0; i < 8; i++) {
    const bx = 186.2 + i * 2.085;
    // Recessed floor collar socket (static)
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.04, 14), housingMat);
    socket.position.set(bx, -0.245, 15.35);
    staticGroup.add(socket);

    // Moving steel bollard shaft
    const bGrp = new THREE.Group();
    bGrp.position.set(bx, -0.26, 15.35);
    bGrp.userData.noMerge = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.88, 14), bollardBodyMat);
    shaft.position.y = 0.44;
    bGrp.add(shaft);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.146, 0.146, 0.12, 14), bollardLedMat);
    ring.position.y = 0.78;
    bGrp.add(ring);
    staticGroup.add(bGrp);
    bollardMeshes.push(bGrp);
  }

  // Phố Đi Bộ overhead string lights removed per user request (streetlamps & arch remain active)

  // Decorative Street Benches & Night-Market Food/Souvenir Stalls tucked cleanly outside Phố Đi Bộ walkways (X = 177.2 & X = 209.8)
  const stallRoofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const stallBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
  const stallGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  neonMats.push(stallGlowMat);

  [-6, -24, -42, -60].forEach((kz, idx) => {
    [177.6, 209.4].forEach((kx, sideIdx) => {
      // Leave East/West corners at Z=-6 (RON BÉO / TOXIC), Z=-24 (KHÓI / LAN QUẾ PHƯỜNG), Z=-42 (4U / LAN QUẾ PHƯỜNG) & Z=-60 (4U / NEW DTV) open!
      if (kz === -6 || kz === -24 || kz === -42 || kz === -60) return;
      const kGrp = new THREE.Group();
      kGrp.position.set(kx, 0, kz);
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 4.2), stallBodyMat);
      base.position.y = 0.55;
      kGrp.add(base);
      const counterGlow = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.25, 4.0), stallGlowMat);
      counterGlow.position.y = 1.18;
      kGrp.add(counterGlow);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.3, 4), stallRoofMat);
      roof.rotation.y = Math.PI / 4 + ((idx + sideIdx) % 2) * 0.05;
      roof.position.y = 3.2;
      kGrp.add(roof);
      [
        [-1.6, -1.8],
        [1.6, -1.8],
        [-1.6, 1.8],
        [1.6, 1.8],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6), poleDarkMat);
        post.position.set(px, 1.35, pz);
        kGrp.add(post);
      });
      staticGroup.add(kGrp);
    });
  });

  // =========================================================================
  // PART 5: 4 SYNCHRONIZED TRAFFIC LIGHT GANTRIES (ANIMATED RED / YELLOW / GREEN)
  // =========================================================================
  interface SignalLensGroup {
    red: THREE.MeshStandardMaterial;
    yellow: THREE.MeshStandardMaterial;
    green: THREE.MeshStandardMaterial;
  }
  const ewLenses: SignalLensGroup[] = [];
  const nsLenses: SignalLensGroup[] = [];

  const buildTrafficGantry = (
    cornerX: number,
    cornerZ: number,
    armRotY: number,
    axisControlled: 'ew' | 'ns',
    streetSignTitle: string,
    streetSignSub: string
  ) => {
    const grp = new THREE.Group();
    grp.position.set(cornerX, 0, cornerZ);
    grp.rotation.y = armRotY;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.40, 12), poleDarkMat);
    base.position.y = 0.20;
    grp.add(base);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 4.35, 12), poleDarkMat);
    post.position.y = 2.175;
    grp.add(post);

    const signBracket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), poleDarkMat);
    signBracket.position.set(0.45, 4.18, 0);
    grp.add(signBracket);

    const signTex = createEastSignTex(streetSignTitle, streetSignSub);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0xffffff,
      emissiveMap: signTex,
      emissiveIntensity: 0.34,
      roughness: 0.4,
    });
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.50, 0.08), signMat);
    signBox.position.set(0.75, 4.18, 0.06);
    grp.add(signBox);

    const createSignalHead = (hx: number, hy: number, hz: number, list: SignalLensGroup[]) => {
      const head = new THREE.Group();
      head.position.set(hx, hy, hz);

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.06, 0.32), housingMat);
      head.add(box);

      const redMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xef4444, emissiveIntensity: 0.1 });
      const yelMat = new THREE.MeshStandardMaterial({ color: 0x451a03, emissive: 0xf59e0b, emissiveIntensity: 0.1 });
      const grnMat = new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 0.1 });
      list.push({ red: redMat, yellow: yelMat, green: grnMat });

      [
        { y: 0.30, mat: redMat },
        { y: 0.0, mat: yelMat },
        { y: -0.30, mat: grnMat },
      ].forEach((l) => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), l.mat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, l.y, 0.15);
        lens.userData.noMerge = true;
        head.add(lens);
      });

      grp.add(head);
    };

    const targetList = axisControlled === 'ew' ? ewLenses : nsLenses;
    const armStub = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.28), poleDarkMat);
    armStub.position.set(0, 3.48, 0.14);
    grp.add(armStub);
    createSignalHead(0, 3.48, 0.30, targetList);

    const pedList = axisControlled === 'ew' ? nsLenses : ewLenses;
    const pedBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.22), housingMat);
    pedBox.position.set(0, 2.35, 0.20);
    grp.add(pedBox);
    const pedRedMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xef4444, emissiveIntensity: 0.1 });
    const pedGrnMat = new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 0.1 });
    const pedDummyYel = new THREE.MeshStandardMaterial({ color: 0x451a03, emissive: 0xf59e0b, emissiveIntensity: 0.0 });
    pedList.push({ red: pedRedMat, yellow: pedDummyYel, green: pedGrnMat });

    const pRed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.06), pedRedMat);
    pRed.position.set(0, 2.47, 0.32);
    pRed.userData.noMerge = true;
    grp.add(pRed);
    const pGrn = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.06), pedGrnMat);
    pGrn.position.set(0, 2.23, 0.32);
    pGrn.userData.noMerge = true;
    grp.add(pGrn);

    staticGroup.add(grp);
  };

  buildTrafficGantry(202.7, 38.2, Math.PI / 2, 'ew', 'ĐẠI LỘ TRUNG TÂM', 'NGÃ TƯ AEON MALL');
  buildTrafficGantry(184.3, 19.8, -Math.PI / 2, 'ew', 'ĐẠI LỘ TRUNG TÂM', 'KHU PHỐ ĐÔNG');
  buildTrafficGantry(202.7, 19.8, Math.PI, 'ns', 'PHỐ ĐI BỘ AEON', 'CẤM XE 16:00-04:00');
  buildTrafficGantry(184.3, 38.2, 0, 'ns', 'ĐẠI LỘ PHÍA NAM', 'AEON MALL EAST');

  // =========================================================================
  // PART 6: STREETLAMPS, TREES & EAST URBAN CITYSCAPE BLOCKS
  // =========================================================================
  const sharedLampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xffe082,
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });
  lanternMats.push(sharedLampGlowMat);

  const poolTex = createEastGlowPoolTex();
  const sharedPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedPoolMat);

  const addIntersectionLamp = (x: number, z: number, armDirX: number, armDirZ: number) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.40, 10), poleDarkMat);
    base.position.y = 0.2;
    grp.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 10), poleDarkMat);
    pole.position.y = 2.5;
    grp.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(armDirX) > 0 ? 0.8 : 0.08, 0.08, Math.abs(armDirZ) > 0 ? 0.8 : 0.08),
      poleDarkMat
    );
    arm.position.set(armDirX * 0.35, 4.7, armDirZ * 0.35);
    grp.add(arm);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), sharedLampGlowMat);
    lantern.position.set(armDirX * 0.7, 4.55, armDirZ * 0.7);
    grp.add(lantern);

    const swPool = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), sharedPoolMat);
    swPool.rotation.x = -Math.PI / 2;
    swPool.position.set(armDirX * 0.2, 0.012, armDirZ * 0.2);
    grp.add(swPool);

    const rdPool = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 11.0), sharedPoolMat);
    rdPool.rotation.x = -Math.PI / 2;
    rdPool.position.set(armDirX * 0.9, -0.248, armDirZ * 0.9);
    grp.add(rdPool);

    staticGroup.add(grp);
  };

  // Connector & East Leg Lamps (frame Peri Pool Arena, Vietcombank + 24h ATM Booth, Phúc Long & Phê La Coffee cleanly)
  [174, 214, 234].forEach((lx) => {
    addIntersectionLamp(lx, 20.25, 0, 1);
  });
  [174, 214, 234].forEach((lx) => {
    addIntersectionLamp(lx, 37.75, 0, -1);
  });
  addIntersectionLamp(265.5, 20.25, 0, 1);
  addIntersectionLamp(276.5, 20.25, 0, 1);
  addIntersectionLamp(299.2, 20.25, 0, 1);
  addIntersectionLamp(328.2, 20.25, 0, 1);
  addIntersectionLamp(356.2, 20.25, 0, 1);
  addIntersectionLamp(274, 37.75, 0, -1);
  addIntersectionLamp(297.5, 37.75, 0, -1);
  addIntersectionLamp(326.8, 37.75, 0, -1);
  addIntersectionLamp(355.0, 37.75, 0, -1);
  // Phố Đi Bộ Lamps (aligned at property dividers so entrances stay clear)
  [4, -14, -44, -74, -103.5].forEach((lz) => {
    addIntersectionLamp(184.75, lz, 1, 0);
    addIntersectionLamp(202.25, lz, -1, 0);
  });
  // South Leg Lamps (above Ngã Tư Vinhomes)
  [52, 72, 92, 129].forEach((lz) => {
    addIntersectionLamp(184.75, lz, 1, 0);
    addIntersectionLamp(202.25, lz, -1, 0);
  });

  // Landscaping Trees
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });
  const addTree = (x: number, z: number, scale = 1.0) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.2, 8), trunkMat);
    trunk.position.y = 1.1;
    t.add(trunk);
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), leafMat1);
    c1.position.set(0, 3.0, 0);
    t.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), leafMat2);
    c2.position.set(0.55, 3.6, 0.35);
    t.add(c2);
    staticGroup.add(t);
  };

  addTree(145.5, 12.6, 0.95);
  [236.9, 276.2, 300.2, 328.2, 356.2].forEach((tx) => {
    addTree(tx, 13.5, 1.05);
  });
  [234.4, 272.1, 297.4, 326.8, 355.0].forEach((tx) => {
    addTree(tx, 44.5, 1.0);
  });
  // South Avenue West Roadside Trees (beside AEON East Wing green verge & South of AEON Smart Parking)
  [52, 66, 80, 131].forEach((tz) => {
    addTree(178.5, tz, 0.98);
  });
  // South Avenue East Roadside Trees (beside Hà Nội Phố / L'Amour divider & South corner of Hotel Green Park)
  [64, 131.5].forEach((tz) => {
    addTree(209.5, tz, 1.0);
  });

  // Modern Urban Skyline Buildings around NE, SE, East & Phố Đi Bộ Flanks (strictly clear of AEON MALL X <= 176.5)
  const bldgColors = [0xcbd5e1, 0x94a3b8, 0x64748b, 0xe2e8f0, 0x334155];
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  neonMats.push(windowGlowMat);

  const addCityBlock = (x: number, z: number, w: number, h: number, d: number, colorIdx: number) => {
    const bMat = new THREE.MeshStandardMaterial({
      color: bldgColors[colorIdx % bldgColors.length],
      roughness: 0.68,
      metalness: 0.12,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
    body.position.set(x, h * 0.5 - 0.26, z);
    staticGroup.add(body);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.45, d + 0.4), poleDarkMat);
    cap.position.set(x, h - 0.1, z);
    staticGroup.add(cap);

    const floors = Math.max(2, Math.floor(h / 4.2));
    for (let f = 1; f < floors; f++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.9, d + 0.08), windowGlowMat);
      band.position.set(x, f * 4.0, z);
      staticGroup.add(band);
    }
  };

  // NE Quadrant Towers (Z=-104..-52 west of Huawei reserved for Casa Riva; Z=-70..+15.6 reserved for 4U CLUB, KHÓI Food Garden, Quán Nhậu RON BÉO & Vietcombank)
  addCityBlock(254, -30.0, 20, 26, 20, 0);

  // SE Quadrant Corner Restaurant ("Hà Nội Phố — Lẩu Cua Đồng Đặc Biệt" at X = 212.5..231.5, Z = 46.5..65.5)
  const haNoiPho = createHaNoiPhoRestaurantStructure();
  neonMats.push(...haNoiPho.neonMats);
  lanternMats.push(...haNoiPho.lanternMats);
  poolMats.push(...haNoiPho.poolMats);
  staticGroup.add(haNoiPho.staticGroup);

  // SE Boulevard 5-Floor Boutique Hotel, French Patisserie & Luxury Spa ("L'Amour Hotel & Patisserie")
  const boutiqueHotel = createBoutiqueHotelStructure();
  neonMats.push(...boutiqueHotel.neonMats);
  lanternMats.push(...boutiqueHotel.lanternMats);
  poolMats.push(...boutiqueHotel.poolMats);
  staticGroup.add(boutiqueHotel.staticGroup);

  // SE Boulevard Flagship Billiards Hall ("PERI POOL ARENA • TKON" beside Hà Nội Phố, X = 236.5..270.5, Z = 48.0..67.0)
  const periArena = createPeriPoolArenaStructure();
  neonMats.push(...periArena.neonMats);
  lanternMats.push(...periArena.lanternMats);
  poolMats.push(...periArena.poolMats);
  staticGroup.add(periArena.staticGroup);

  // =========================================================================
  // PART 7: TRAFFIC SIGNAL CYCLE & PHỐ ĐI BỘ STATE ANIMATION
  // =========================================================================
  let cycleTimer = 9.5; // Offset from West intersection for realistic city pacing
  let ewPhase: 'green' | 'yellow' | 'red' = 'red';
  let nsPhase: 'green' | 'yellow' | 'red' = 'green';
  let bollardLift = 0.0;
  let lastPedMode: boolean | null = null;
  let pedZoneActive = false;

  const applyLensState = (list: SignalLensGroup[], phase: 'green' | 'yellow' | 'red') => {
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      g.red.emissiveIntensity = phase === 'red' ? 2.1 : 0.06;
      g.yellow.emissiveIntensity = phase === 'yellow' ? 2.1 : 0.06;
      g.green.emissiveIntensity = phase === 'green' ? 2.1 : 0.06;
    }
  };

  const update = (delta: number, rawHour: number, lampFactor: number) => {
    const dt = Math.min(delta, 0.1);
    cycleTimer = (cycleTimer + dt) % 18.0;
    if (cycleTimer < 6.5) {
      ewPhase = 'green';
      nsPhase = 'red';
    } else if (cycleTimer < 8.0) {
      ewPhase = 'yellow';
      nsPhase = 'red';
    } else if (cycleTimer < 9.5) {
      ewPhase = 'red';
      nsPhase = 'red';
    } else if (cycleTimer < 15.0) {
      ewPhase = 'red';
      nsPhase = 'green';
    } else if (cycleTimer < 16.5) {
      ewPhase = 'red';
      nsPhase = 'yellow';
    } else {
      ewPhase = 'red';
      nsPhase = 'red';
    }
    applyLensState(ewLenses, ewPhase);
    applyLensState(nsLenses, nsPhase);

    pedZoneActive = isPedestrianStreetTime(rawHour);
    if (lastPedMode !== pedZoneActive) {
      lastPedMode = pedZoneActive;
      pedOpenBoard.visible = pedZoneActive;
      pedDayBoard.visible = !pedZoneActive;
    }

    const targetLift = pedZoneActive ? 1.0 : 0.0;
    bollardLift = THREE.MathUtils.lerp(bollardLift, targetLift, Math.min(1, dt * 4.5));
    const bollardY = THREE.MathUtils.lerp(-1.08, -0.26, bollardLift);
    for (let i = 0; i < bollardMeshes.length; i++) {
      bollardMeshes[i].position.y = bollardY;
    }
    bollardLedMat.emissiveIntensity = pedZoneActive ? 1.5 + lampFactor * 0.9 : 0.05;

    const signLedInt = 0.16 + lampFactor * 0.44;
    pedOpenMat.emissiveIntensity = signLedInt;
    pedDayMat.emissiveIntensity = signLedInt;
  };

  update(0, 7.0, 0);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights: [...haNoiPho.scaledLights, ...boutiqueHotel.scaledLights, ...periArena.scaledLights],
    getSignalState: () => ({ ewPhase, nsPhase }),
    isPedestrianZoneActive: () => pedZoneActive,
    update,
    updateHaNoiPhoOperatingHours: haNoiPho.updateOperatingHours,
    getHaNoiPhoClosedFactor: haNoiPho.getClosedFactor,
    updateBoutiqueHotel: boutiqueHotel.update,
    updatePeriPoolArena: periArena.update,
  };
}

// =========================================================================
// EAST INTERSECTION TRAFFIC & PHỐ ĐI BỘ STROLLING NPC CONTROLLER
// =========================================================================

interface EastVehicleUnit {
  id: string;
  kind: 'car' | 'motorbike';
  route: 'ew' | 'ns';
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  halfW: number;
  halfL: number;
  wheelR: number;
  dir: 1 | -1;
  laneCoord: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  cruiseSpeed: number;
  priority: number;
  turningRightToEast?: boolean;
  turnT?: number;
  exitingEastOnPedBan?: boolean;
  subMode?: 'ew' | 'ns_branch' | 'bd' | 'turn_curve';
  nsCenterX?: number;
  nsDir?: 1 | -1;
  nsLaneX?: number;
  bdDir?: 1 | -1;
  bdLaneZ?: number;
  turnStartX?: number;
  turnStartZ?: number;
  turnCtrlX?: number;
  turnCtrlZ?: number;
  turnEndX?: number;
  turnEndZ?: number;
  turnDuration?: number;
  turnNextMode?: 'ew' | 'ns_branch' | 'bd';
  branchCooldown?: number;
}

function buildEastSedan(colorHex: number, variant: CityCarVariant = 'sedan'): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  wheelR: number;
  halfW: number;
  halfL: number;
} {
  return buildCityCarMesh({
    color: colorHex,
    variant,
    headlightIntensity: 0.9,
    brakeIntensity: 0.7,
    noMerge: true,
  });
}

function buildEastMotorbike(
  bodyHex: number,
  helmetHex: number,
  jacketHex: number,
  isSport: boolean,
  includePassenger: boolean = false,
  passengerHelmetHex?: number,
  passengerJacketHex?: number
): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  wheelR: number;
  halfW: number;
  halfL: number;
} {
  return buildCityMotorbikeMesh({
    color: bodyHex,
    variant: isSport ? 'sport' : 'scooter',
    helmetColor: helmetHex,
    jacketColor: jacketHex,
    includeRider: true,
    includePassenger,
    passengerHelmetColor: passengerHelmetHex,
    passengerJacketColor: passengerJacketHex,
    headlightIntensity: 0.9,
    brakeIntensity: 0.7,
    noMerge: true,
  });
}

interface PedStroller {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  glbHandle: GlbHumanHandle;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  nightOnly: boolean;
}

export class EastIntersectionTrafficController {
  public readonly rootGroup = new THREE.Group();
  private readonly coordinator: CityTrafficCoordinator;
  private readonly getSignalState: () => IntersectionSignalState;
  private readonly getWestSignal?: () => IntersectionSignalState;
  private readonly getFarEastSignal?: () => IntersectionSignalState;
  private readonly getDiorSignal?: () => IntersectionSignalState;
  private readonly getVinhomesSignal?: () => IntersectionSignalState;
  private readonly units: EastVehicleUnit[] = [];
  private readonly strollers: PedStroller[] = [];

  constructor(
    coordinator: CityTrafficCoordinator,
    getSignalState: () => IntersectionSignalState,
    helpers: EastIntersectionCharacterHelpers,
    getWestSignal?: () => IntersectionSignalState,
    getFarEastSignal?: () => IntersectionSignalState,
    getDiorSignal?: () => IntersectionSignalState,
    getVinhomesSignal?: () => IntersectionSignalState
  ) {
    this.coordinator = coordinator;
    this.getSignalState = getSignalState;
    this.getWestSignal = getWestSignal;
    this.getFarEastSignal = getFarEastSignal;
    this.getDiorSignal = getDiorSignal;
    this.getVinhomesSignal = getVinhomesSignal;
    this.rootGroup.userData.noMerge = true;
    this.buildVehicles();
    this.buildStrollingPedestrians(helpers);
  }

  private getSignalForCenterX(centerX: number): (() => IntersectionSignalState) | undefined {
    if (Math.abs(centerX - WEST_INTERSECTION_CENTER_X) < 10) return this.getWestSignal;
    if (Math.abs(centerX - COORD_EAST_CENTER_X) < 10) return this.getSignalState;
    if (Math.abs(centerX - FAR_EAST_INTERSECTION_CENTER_X) < 10) return this.getFarEastSignal;
    if (Math.abs(centerX - DIOR_INTERSECTION_CENTER_X) < 10) return this.getDiorSignal;
    return undefined;
  }

  private buildVehicles() {
    const specs: Array<{
      id: string;
      kind: 'car' | 'motorbike';
      route: 'ew' | 'ns';
      color: number;
      xanhSm?: { variant: 'vfe34' | 'vf5'; plate: string };
      dir: 1 | -1;
      laneCoord: number;
      pos: number;
      speed: number;
      initSubMode?: 'ew' | 'bd';
      initBdDir?: 1 | -1;
    }> = [
      // North-South Avenue Vehicles (respect 16:00-04:00 Phố Đi Bộ closure!)
      { id: 'east_ns_car_1', kind: 'car', route: 'ns', color: 0x0284c7, dir: 1, laneCoord: 191.4, pos: -45.0, speed: 9.6 },
      { id: 'east_ns_xanhsm_1', kind: 'car', route: 'ns', color: 0x00b6be, xanhSm: { variant: 'vfe34', plate: '43H-886.41' }, dir: -1, laneCoord: 195.6, pos: -18.0, speed: 9.3 },
      { id: 'east_ns_car_2', kind: 'car', route: 'ns', color: 0xf43f5e, dir: -1, laneCoord: 195.6, pos: 74.0, speed: 9.4 },
      { id: 'east_ns_xanhsm_2', kind: 'car', route: 'ns', color: 0x00b6be, xanhSm: { variant: 'vf5', plate: '43H-886.42' }, dir: 1, laneCoord: 191.4, pos: 52.0, speed: 9.2 },
      { id: 'east_ns_moto_1', kind: 'motorbike', route: 'ns', color: 0xe2e8f0, dir: 1, laneCoord: 187.4, pos: -18.0, speed: 10.6 },
      { id: 'east_ns_moto_2', kind: 'motorbike', route: 'ns', color: 0xf472b6, dir: -1, laneCoord: 199.6, pos: 56.0, speed: 10.4 },
      { id: 'east_ns_moto_3', kind: 'motorbike', route: 'ns', color: 0x16a34a, dir: 1, laneCoord: 187.4, pos: -62.0, speed: 10.8 },
      { id: 'east_ns_moto_4', kind: 'motorbike', route: 'ns', color: 0x06b6d4, dir: -1, laneCoord: 199.6, pos: 14.0, speed: 10.5 },
      // East-West & Multi-Avenue Vehicles spread across Đường Bạch Đằng, Phố Cư Dân Tây (-956), Luxury, Sơn Tây & DIOR!
      { id: 'east_ew_car_1', kind: 'car', route: 'ew', color: 0x6366f1, dir: 1, laneCoord: 26.8, pos: -135.0, speed: 10.2, initSubMode: 'bd', initBdDir: 1 },
      { id: 'east_ew_xanhsm_1', kind: 'car', route: 'ew', color: 0x00b6be, xanhSm: { variant: 'vfe34', plate: '43H-886.43' }, dir: -1, laneCoord: 31.1, pos: 245.0, speed: 9.6, initSubMode: 'bd', initBdDir: -1 },
      { id: 'east_ew_car_2', kind: 'car', route: 'ew', color: 0xe2e8f0, dir: -1, laneCoord: 31.1, pos: 486.0, speed: 9.8 },
      { id: 'east_ew_car_3', kind: 'car', route: 'ew', color: 0x0d9488, dir: 1, laneCoord: 26.8, pos: 45.0, speed: 9.9, initSubMode: 'bd', initBdDir: 1 },
      // Dedicated Extended West Central Boulevard & Ring-Road Cars (-956..-312 <-> Đại Lộ Bệnh Viện <-> Bạch Đằng!)
      { id: 'east_ew_car_4', kind: 'car', route: 'ew', color: 0xef4444, dir: 1, laneCoord: 23.25, pos: -365.0, speed: 10.1 },
      { id: 'east_ew_car_5', kind: 'car', route: 'ew', color: 0x1e293b, dir: -1, laneCoord: 34.75, pos: -415.0, speed: 9.7 },
      { id: 'east_ew_xanhsm_2', kind: 'car', route: 'ew', color: 0x00b6be, xanhSm: { variant: 'vf5', plate: '43H-886.51' }, dir: 1, laneCoord: 26.8, pos: -495.0, speed: 9.8 },
      { id: 'east_ew_car_6', kind: 'car', route: 'ew', color: 0xf8fafc, dir: -1, laneCoord: 31.1, pos: -545.0, speed: 10.0 },
      { id: 'east_ew_car_7', kind: 'car', route: 'ew', color: 0x2563eb, dir: 1, laneCoord: 23.25, pos: -625.0, speed: 9.9 },
      { id: 'east_ew_car_8', kind: 'car', route: 'ew', color: 0xd97706, dir: -1, laneCoord: 34.75, pos: -685.0, speed: 9.6 },
      { id: 'east_ew_xanhsm_3', kind: 'car', route: 'ew', color: 0x00b6be, xanhSm: { variant: 'vfe34', plate: '43H-886.52' }, dir: 1, laneCoord: 26.8, pos: -755.0, speed: 9.8 },
      { id: 'east_ew_car_9', kind: 'car', route: 'ew', color: 0x64748b, dir: -1, laneCoord: 31.1, pos: -815.0, speed: 10.2 },
      { id: 'east_ew_car_10', kind: 'car', route: 'ew', color: 0x10b981, dir: 1, laneCoord: 23.25, pos: -895.0, speed: 9.9 },
      { id: 'east_ew_car_11', kind: 'car', route: 'ew', color: 0x7c3aed, dir: -1, laneCoord: 34.75, pos: 430.0, speed: 9.8, initSubMode: 'bd', initBdDir: -1 },
      { id: 'east_ew_moto_1', kind: 'motorbike', route: 'ew', color: 0xdc2626, dir: -1, laneCoord: 31.1, pos: 412.0, speed: 11.2 },
      { id: 'east_ew_moto_2', kind: 'motorbike', route: 'ew', color: 0x0284c7, dir: 1, laneCoord: 25.6, pos: 268.0, speed: 11.0 },
      { id: 'east_ew_moto_3', kind: 'motorbike', route: 'ew', color: 0xe2e8f0, dir: -1, laneCoord: 32.3, pos: 528.0, speed: 10.8 },
      { id: 'east_ew_moto_4', kind: 'motorbike', route: 'ew', color: 0xf97316, dir: 1, laneCoord: 25.6, pos: -65.0, speed: 10.7, initSubMode: 'bd', initBdDir: 1 },
      { id: 'east_ew_moto_5', kind: 'motorbike', route: 'ew', color: 0x10b981, dir: -1, laneCoord: 32.3, pos: 165.0, speed: 11.1, initSubMode: 'bd', initBdDir: -1 },
      { id: 'east_ew_moto_6', kind: 'motorbike', route: 'ew', color: 0xfacc15, dir: 1, laneCoord: 25.6, pos: 344.0, speed: 10.9 },
      { id: 'east_ew_moto_7', kind: 'motorbike', route: 'ew', color: 0xef4444, dir: 1, laneCoord: 25.6, pos: -450.0, speed: 10.9 },
      { id: 'east_ew_moto_8', kind: 'motorbike', route: 'ew', color: 0x0ea5e9, dir: -1, laneCoord: 32.3, pos: -590.0, speed: 11.0 },
      { id: 'east_ew_moto_9', kind: 'motorbike', route: 'ew', color: 0x22c55e, dir: 1, laneCoord: 25.6, pos: -720.0, speed: 10.8 },
      { id: 'east_ew_moto_10', kind: 'motorbike', route: 'ew', color: 0xa855f7, dir: -1, laneCoord: 32.3, pos: -860.0, speed: 11.1 },
    ];

    const carVariants: CityCarVariant[] = ['suv', 'coupe', 'sedan', 'hatchback', 'suv'];
    const helmetPalette = [0x18181b, 0xf472b6, 0xf8fafc, 0x0284c7, 0xfacc15];
    const jacketPalette = [0xc2a888, 0xd1d5db, 0xc2a888, 0x0f766e, 0x1d4ed8];
    const pHelmetPalette = [0xdc2626, 0xf8fafc, 0x18181b, 0xf472b6, 0xef4444];
    const pJacketPalette = [0xe8b4cb, 0x334155, 0xe8b4cb, 0x7c2d12, 0xd1d5db];
    let carIdx = 0;
    let motoIdx = 0;

    specs.forEach((s) => {
      let built: ReturnType<typeof buildEastSedan>;
      if (s.kind === 'car') {
        built = s.xanhSm
          ? buildAmbientXanhSmTaxiCar(s.xanhSm.variant, s.xanhSm.plate, true)
          : buildEastSedan(s.color, carVariants[carIdx++ % carVariants.length]);
      } else {
        const idx = motoIdx++;
        const hasPassenger = idx % 2 === 0;
        built = buildEastMotorbike(
          s.color,
          helmetPalette[idx % helmetPalette.length],
          jacketPalette[idx % jacketPalette.length],
          idx % 3 === 2,
          hasPassenger,
          pHelmetPalette[idx % pHelmetPalette.length],
          pJacketPalette[idx % pJacketPalette.length]
        );
      }
      const isEW = s.route === 'ew';
      const startOnBd = isEW && s.initSubMode === 'bd';
      const bdDir: 1 | -1 = s.initBdDir ?? s.dir;
      const bdLaneZ = bdDir > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
      const x = isEW ? s.pos : s.laneCoord;
      const z = startOnBd ? bdLaneZ : isEW ? s.laneCoord : s.pos;
      const yaw = startOnBd
        ? bdDir > 0
          ? Math.PI / 2
          : -Math.PI / 2
        : isEW
          ? s.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : s.dir > 0
            ? 0
            : Math.PI;
      built.group.position.set(x, -0.26, z);
      built.group.rotation.y = yaw;
      this.rootGroup.add(built.group);

      this.units.push({
        id: s.id,
        kind: s.kind,
        route: s.route,
        group: built.group,
        wheels: built.wheels,
        headlightMat: built.headlightMat,
        brakeMat: built.brakeMat,
        halfW: built.halfW,
        halfL: built.halfL,
        wheelR: built.wheelR,
        dir: s.dir,
        laneCoord: s.laneCoord,
        x,
        z,
        yaw,
        speed: s.speed,
        cruiseSpeed: s.speed,
        priority: s.kind === 'car' ? 2 : 1,
        subMode: isEW ? (startOnBd ? 'bd' : 'ew') : undefined,
        bdDir: startOnBd ? bdDir : undefined,
        bdLaneZ: startOnBd ? bdLaneZ : undefined,
        branchCooldown: isEW ? 3.0 + Math.random() * 6.0 : 0,
      });
    });
  }

  private buildStrollingPedestrians(helpers: EastIntersectionCharacterHelpers) {
    const outfits = [
      { shirt: 0xf43f5e, pants: 0x1e293b, hair: 0x111827, skin: '#fbd3b4' },
      { shirt: 0x0ea5e9, pants: 0x334155, hair: 0x3f2305, skin: '#f5c7a3' },
      { shirt: 0xf59e0b, pants: 0x0f172a, hair: 0x09090b, skin: '#e8b48e' },
      { shirt: 0x10b981, pants: 0x1e293b, hair: 0x451a03, skin: '#fce0c8' },
      { shirt: 0xa855f7, pants: 0x334155, hair: 0x1e1b4b, skin: '#f5c7a3' },
      { shirt: 0xec4899, pants: 0x18181b, hair: 0x29150b, skin: '#fbd3b4' },
    ];

    const nightLoops: THREE.Vector3[][] = [
      [
        new THREE.Vector3(189.0, 0.02, 12.0),
        new THREE.Vector3(190.5, 0.02, -16.0),
        new THREE.Vector3(197.0, 0.02, -38.0),
        new THREE.Vector3(198.0, 0.02, -10.0),
      ],
      [
        new THREE.Vector3(198.0, 0.02, -52.0),
        new THREE.Vector3(190.0, 0.02, -30.0),
        new THREE.Vector3(188.5, 0.02, 8.0),
        new THREE.Vector3(196.5, 0.02, 10.0),
      ],
      [
        new THREE.Vector3(193.5, 0.02, -5.0),
        new THREE.Vector3(199.5, 0.02, -26.0),
        new THREE.Vector3(192.0, 0.02, -56.0),
        new THREE.Vector3(187.5, 0.02, -28.0),
      ],
      [
        new THREE.Vector3(186.5, 0.02, -45.0),
        new THREE.Vector3(195.0, 0.02, -62.0),
        new THREE.Vector3(201.0, 0.02, -34.0),
        new THREE.Vector3(193.0, 0.02, -14.0),
      ],
      [
        new THREE.Vector3(182.6, 0.02, 12.0),
        new THREE.Vector3(182.6, 0.02, -55.0),
      ],
      [
        new THREE.Vector3(204.2, 0.02, -55.0),
        new THREE.Vector3(204.2, 0.02, 12.0),
      ],
    ];

    outfits.forEach((of, idx) => {
      const grp = new THREE.Group();
      const hipsGroup = new THREE.Group();
      grp.add(hipsGroup);

      const skinMat = new THREE.MeshStandardMaterial({ color: of.skin, roughness: 0.7 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: of.shirt, roughness: 0.72 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: of.pants, roughness: 0.8 });
      const hairMat = new THREE.MeshStandardMaterial({ color: of.hair, roughness: 0.85 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
      torso.position.y = 1.04;
      hipsGroup.add(torso);

      const faceTex = helpers.createFaceTexture('happy', of.skin);
      const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
      head.position.y = 1.48;
      hipsGroup.add(head);

      const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
      hairCap.position.y = 1.61;
      hipsGroup.add(hairCap);

      const makeArm = (ax: number) => {
        const p = new THREE.Group();
        p.position.set(ax, 1.26, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), shirtMat);
        m.position.y = -0.18;
        p.add(m);
        hipsGroup.add(p);
        return p;
      };
      const leftArm = makeArm(-0.29);
      const rightArm = makeArm(0.29);

      const makeLeg = (lx: number) => {
        const p = new THREE.Group();
        p.position.set(lx, 0.76, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.16), pantsMat);
        leg.position.y = -0.32;
        p.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
        shoe.position.set(0, -0.68, 0.03);
        p.add(shoe);
        hipsGroup.add(p);
        return p;
      };
      const leftLeg = makeLeg(-0.11);
      const rightLeg = makeLeg(0.11);

      const npcSpec = pickOutsideNpcModel(idx);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: npcSpec.modelSource,
        targetHeight: npcSpec.targetHeight,
        clipProfile: npcSpec.clipProfile,
        rotationY: npcSpec.rotationY,
        hostGroup: grp,
        fallbackMeshes: [hipsGroup],
        initialState: 'Walk',
        phaseOffset: idx * 1.1,
        palette: {
          shirt: of.shirt,
          pants: of.pants,
          hair: of.hair,
          skin: Number.parseInt(of.skin.replace('#', ''), 16) || 0xfbd3b4,
        },
      });

      const wps = nightLoops[idx];
      grp.position.copy(wps[0]);
      this.rootGroup.add(grp);

      this.strollers.push({
        group: grp,
        hipsGroup,
        glbHandle,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        waypoints: wps,
        wpIdx: 1 % wps.length,
        speed: 1.35 + (idx % 3) * 0.18,
        walkPhase: idx * 1.1,
        nightOnly: idx < 4, // 4 stroll across the pedestrian street during 16:00-04:00, 2 stay on side promenades 24/7
      });
    });
  }

  public update(delta: number, rawHour: number, lampFactor: number) {
    const dt = Math.min(delta, 0.08);
    const sig = this.getSignalState();
    const pedActive = isPedestrianStreetTime(rawHour);

    // 1. Update Vehicles
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const prevX = u.x;
      const prevZ = u.z;

      if (u.route === 'ns') {
        if (u.exitingEastOnPedBan) {
          u.group.visible = true;
          const clr = this.coordinator.getForwardClearance({
            id: u.id,
            x: u.x,
            y: -0.26,
            z: u.z,
            moveDirX: 1,
            moveDirZ: 0,
            halfW: u.halfW,
            halfL: u.halfL,
            lookahead: 14.0,
            minGap: 2.8,
            priority: u.priority,
          });
          const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
          const targetSpeed = u.cruiseSpeed * factor;
          const braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;
          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
          u.x += u.speed * dt;
          u.z = 26.8;
          u.yaw = Math.PI / 2;

          if (u.x > 552.0) {
            if (
              this.coordinator.isZoneClear({
                id: u.id,
                x: u.laneCoord,
                y: -0.26,
                z: 420.0,
                halfX: 1.8,
                halfZ: 4.5,
              })
            ) {
              u.exitingEastOnPedBan = false;
              u.x = u.laneCoord;
              u.z = 420.0;
              u.yaw = Math.PI;
              u.speed = u.cruiseSpeed;
            } else {
              u.group.visible = false;
              this.coordinator.deactivateVehicle(u.id);
              continue;
            }
          }

          u.group.position.set(u.x, -0.26, u.z);
          u.group.rotation.y = u.yaw;
          const moved = Math.hypot(u.x - prevX, u.z - prevZ);
          for (let w = 0; w < u.wheels.length; w++) {
            u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
          }
          u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
          u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;
          this.coordinator.updateVehicle({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: -0.26,
            z: u.z,
            fwdX: Math.sin(u.yaw),
            fwdZ: Math.cos(u.yaw),
            halfW: u.halfW,
            halfL: u.halfL,
            speed: u.speed,
            isStoppedOrParked: u.speed < 0.15,
            priority: u.priority,
            active: true,
          });
          continue;
        }
        if (pedActive) {
          // Strict vehicle ban inside Phố Đi Bộ (Z < 15.4) between 16:00 and 04:00!
          if (u.dir > 0) {
            // If Southbound vehicle is already south of Phố Đi Bộ entrance when 16:00 strikes, let it finish exiting South past 420.0 instead of vanishing mid-street
            const alreadyPastPedZone = u.z >= 14.0 && u.z <= 420.0;
            if (!alreadyPastPedZone) {
              u.group.visible = false;
              u.speed = 0;
              u.z = -84.0;
              this.coordinator.updateVehicle({
                id: u.id,
                kind: u.kind,
                x: u.x,
                y: -0.26,
                z: u.z,
                fwdX: 0,
                fwdZ: 1,
                halfW: u.halfW,
                halfL: u.halfL,
                speed: 0,
                isStoppedOrParked: true,
                priority: u.priority,
                active: false,
              });
              continue;
            }
          } else {
            // Northbound vehicles approaching from South leg turn Right onto East Leg instead of entering Phố Đi Bộ!
            u.group.visible = true;
            if (u.turningRightToEast) {
              const turnClr = this.coordinator.getForwardClearance({
                id: u.id,
                x: u.x,
                y: -0.26,
                z: u.z,
                moveDirX: Math.sin(u.yaw),
                moveDirZ: Math.cos(u.yaw),
                halfW: u.halfW,
                halfL: u.halfL,
                lookahead: 8.5,
                minGap: 2.0,
                priority: u.priority + 10,
              });
              const turnFactor = turnClr.blocked ? 0 : turnClr.maxSpeedFactor;
              const brakingTurn = turnClr.blocked || turnFactor < 0.6;
              u.turnT = Math.min(1, (u.turnT ?? 0) + dt * 0.72 * turnFactor);
              const t = u.turnT;
              // Smooth quarter-circle right turn from (laneCoord, Z=39.5) -> (X=208.5, Z=26.8)
              const startX = u.laneCoord;
              const startZ = 39.5;
              const endX = 208.5;
              const endZ = 26.8;
              const ctrlX = startX;
              const ctrlZ = endZ;
              const inv = 1 - t;
              u.x = inv * inv * startX + 2 * inv * t * ctrlX + t * t * endX;
              u.z = inv * inv * startZ + 2 * inv * t * ctrlZ + t * t * endZ;
              const dx = u.x - prevX;
              const dz = u.z - prevZ;
              if (Math.hypot(dx, dz) > 0.001) {
                u.yaw = Math.atan2(dx, dz);
              }
              u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
              if (t >= 1) {
                // Continue driving all the way East down the East leg past the intersection (never vanish mid-junction)
                u.turningRightToEast = false;
                u.turnT = 0;
                u.exitingEastOnPedBan = true;
                u.x = endX;
                u.z = endZ;
                u.yaw = Math.PI / 2;
                u.speed = Math.max(u.speed, 6.5);
              }
              u.group.position.set(u.x, -0.26, u.z);
              u.group.rotation.y = u.yaw;
              const moved = Math.hypot(u.x - prevX, u.z - prevZ);
              for (let w = 0; w < u.wheels.length; w++) {
                u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
              }
              u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
              u.brakeMat.emissiveIntensity = brakingTurn ? 1.9 : 0.55 + lampFactor * 0.5;
              this.coordinator.updateVehicle({
                id: u.id,
                kind: u.kind,
                x: u.x,
                y: -0.26,
                z: u.z,
                fwdX: Math.sin(u.yaw),
                fwdZ: Math.cos(u.yaw),
                halfW: u.halfW,
                halfL: u.halfL,
                speed: u.speed,
                isStoppedOrParked: u.speed < 0.15,
                priority: u.priority + 10,
                active: true,
              });
              continue;
            }
          }
        } else {
          u.group.visible = true;
          u.turningRightToEast = false;
        }

        // Standard North-South Signal & Box-Clearance Check (East Intersection Z=29.0 + Ngã Tư Vinhomes Z=148.0)
        let signalSlowFactor = 1.0;
        const distToStop = u.dir > 0 ? 14.8 - (u.z + u.halfL) : u.z - u.halfL - 43.2;
        if (sig.nsPhase === 'green') {
          if (
            distToStop >= -0.35 &&
            distToStop <= 5.5 &&
            !this.coordinator.isIntersectionBoxClearForAxis({
              id: u.id,
              centerX: EAST_INTERSECTION_CENTER_X,
              axis: 'ns',
            })
          ) {
            signalSlowFactor = distToStop <= 1.5 ? 0 : Math.max(0.08, (distToStop - 1.5) / 4.0);
          }
        } else {
          const allowYellowClear = sig.nsPhase === 'yellow' && distToStop < 1.2;
          if (!allowYellowClear && distToStop >= -0.35 && distToStop <= 16.0) {
            signalSlowFactor = distToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (distToStop - 1.25) / 14.75));
          }
        }

        if (this.getVinhomesSignal) {
          const vhSig = this.getVinhomesSignal();
          const evalVhSig = (centerZ: number, northStopZ: number, southStopZ: number) => {
            const vhDistToStop = u.dir > 0 ? northStopZ - (u.z + u.halfL) : u.z - u.halfL - southStopZ;
            if (vhSig.nsPhase === 'green') {
              if (
                vhDistToStop >= -0.35 &&
                vhDistToStop <= 5.5 &&
                !this.coordinator.isIntersectionBoxClearForAxis({
                  id: u.id,
                  centerX: EAST_INTERSECTION_CENTER_X,
                  centerZ,
                  axis: 'ns',
                })
              ) {
                return vhDistToStop <= 1.5 ? 0 : Math.max(0.08, (vhDistToStop - 1.5) / 4.0);
              }
            } else {
              const allowYellowClear = vhSig.nsPhase === 'yellow' && vhDistToStop < 1.2;
              if (!allowYellowClear && vhDistToStop >= -0.35 && vhDistToStop <= 16.0) {
                return vhDistToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (vhDistToStop - 1.25) / 14.75));
              }
            }
            return 1.0;
          };
          signalSlowFactor = Math.min(
            signalSlowFactor,
            evalVhSig(148.0, 134.4, 161.6),
            evalVhSig(344.0, 330.4, 357.6)
          );
        }

        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: 0,
          moveDirZ: u.dir,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 14.0,
          minGap: 2.8,
          priority: u.priority,
        });

        let holdForRightTurnClear = false;
        if (pedActive && u.dir < 0 && u.z <= 40.0 && u.z > 38.5) {
          const eastClear = this.coordinator.isZoneClear({
            id: u.id,
            x: 199.0,
            y: -0.26,
            z: 27.0,
            halfX: 10.5,
            halfZ: 3.8,
          });
          if (!eastClear) {
            holdForRightTurnClear = true;
          }
        }

        if (this.coordinator.isJamBypassActive(u.id)) {
          signalSlowFactor = 1.0;
          holdForRightTurnClear = false;
        }

        const factor = clr.blocked || holdForRightTurnClear ? 0 : Math.min(signalSlowFactor, clr.maxSpeedFactor);
        const targetSpeed = u.cruiseSpeed * factor;
        const braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;

        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        u.z += u.dir * u.speed * dt;
        u.x = u.laneCoord;
        u.yaw = u.dir > 0 ? 0 : Math.PI;

        if (pedActive && u.dir < 0 && u.z <= 39.5 && u.z > 30.0 && !holdForRightTurnClear) {
          u.turningRightToEast = true;
          u.turnT = 0;
        } else if (u.dir > 0 && u.z > 420.0) {
          if (pedActive) {
            // Finished full exit out of South leg after 16:00 ban began; park off-street cleanly
            u.z = -84.0;
            u.group.visible = false;
            u.speed = 0;
            this.coordinator.deactivateVehicle(u.id);
            continue;
          }
          u.z = -84.0;
        } else if (u.dir < 0 && u.z < -84.0) {
          u.z = 420.0;
        }

        u.group.position.set(u.x, -0.26, u.z);
        u.group.rotation.y = u.yaw;
        const moved = Math.abs(u.z - prevZ);
        for (let w = 0; w < u.wheels.length; w++) {
          u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
        }
        u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
        u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;

        this.coordinator.updateVehicle({
          id: u.id,
          kind: u.kind,
          x: u.x,
          y: -0.26,
          z: u.z,
          fwdX: 0,
          fwdZ: u.dir,
          halfW: u.halfW,
          halfL: u.halfL,
          speed: u.speed,
          isStoppedOrParked: u.speed < 0.15,
          priority: u.priority,
          active: true,
        });
      } else {
        // Multi-route city roaming units (Central/Luxury Boulevard <-> Sơn Tây <-> Đại Lộ Paris DIOR <-> Đường Bạch Đằng)
        if (u.branchCooldown && u.branchCooldown > 0) u.branchCooldown = Math.max(0, u.branchCooldown - dt);
        const mode = u.subMode ?? 'ew';

        if (mode === 'turn_curve') {
          u.group.visible = true;
          const clr = this.coordinator.getForwardClearance({
            id: u.id,
            x: u.x,
            y: -0.26,
            z: u.z,
            moveDirX: Math.sin(u.yaw),
            moveDirZ: Math.cos(u.yaw),
            halfW: u.halfW,
            halfL: u.halfL,
            lookahead: 8.5,
            minGap: 2.0,
            priority: u.priority + 8,
          });
          const factor = clr.blocked ? 0.25 : Math.max(0.35, clr.maxSpeedFactor);
          const braking = clr.blocked;
          u.turnT = Math.min(1, (u.turnT ?? 0) + (dt * factor) / Math.max(0.65, u.turnDuration ?? 1.4));
          const t = u.turnT;
          const inv = 1 - t;
          const sx = u.turnStartX ?? u.x;
          const sz = u.turnStartZ ?? u.z;
          const cx = u.turnCtrlX ?? u.x;
          const cz = u.turnCtrlZ ?? u.z;
          const ex = u.turnEndX ?? u.x;
          const ez = u.turnEndZ ?? u.z;
          u.x = inv * inv * sx + 2 * inv * t * cx + t * t * ex;
          u.z = inv * inv * sz + 2 * inv * t * cz + t * t * ez;
          const dx = u.x - prevX;
          const dz = u.z - prevZ;
          if (Math.hypot(dx, dz) > 0.005) u.yaw = Math.atan2(dx, dz);
          u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
          if (t >= 1) {
            u.x = ex;
            u.z = ez;
            u.subMode = u.turnNextMode ?? 'ew';
            u.turnT = 0;
            u.branchCooldown = 5.0;
          }

          u.group.position.set(u.x, -0.26, u.z);
          u.group.rotation.y = u.yaw;
          const moved = Math.hypot(u.x - prevX, u.z - prevZ);
          for (let w = 0; w < u.wheels.length; w++) {
            u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
          }
          u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
          u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;
          this.coordinator.updateVehicle({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: -0.26,
            z: u.z,
            fwdX: Math.sin(u.yaw),
            fwdZ: Math.cos(u.yaw),
            halfW: u.halfW,
            halfL: u.halfL,
            speed: u.speed,
            isStoppedOrParked: u.speed < 0.15,
            priority: u.priority + 8,
            active: true,
          });
        } else if (mode === 'ns_branch') {
          u.group.visible = true;
          const centerX = u.nsCenterX ?? FAR_EAST_INTERSECTION_CENTER_X;
          const nsDir = u.nsDir ?? -1;
          const nsLaneX = u.nsLaneX ?? centerX + 2.1;
          const sigFactor = computeNorthSouthSignalFactor({
            z: u.z,
            halfL: u.halfL,
            moveDirZ: nsDir,
            centerX,
            getSignal: this.getSignalForCenterX(centerX),
            coordinator: this.coordinator,
            vehicleId: u.id,
          });
          const clr = this.coordinator.getForwardClearance({
            id: u.id,
            x: u.x,
            y: -0.26,
            z: u.z,
            moveDirX: 0,
            moveDirZ: nsDir,
            halfW: u.halfW,
            halfL: u.halfL,
            lookahead: 13.0,
            minGap: 2.5,
            priority: u.priority,
          });
          const factor = clr.blocked ? 0 : Math.min(sigFactor, clr.maxSpeedFactor);
          const targetSpeed = u.cruiseSpeed * factor;
          const braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;
          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
          u.z += nsDir * u.speed * dt;
          u.x = THREE.MathUtils.lerp(u.x, nsLaneX, Math.min(1, dt * 4.0));
          u.yaw = nsDir > 0 ? 0 : Math.PI;

          if (nsDir < 0 && u.z <= -104.5) {
            const turnWest = centerX < 0 ? false : centerX > 430 || Math.random() < 0.58;
            const bdDir: 1 | -1 = turnWest ? -1 : 1;
            const bdLaneZ = bdDir > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
            u.bdDir = bdDir;
            u.bdLaneZ = bdLaneZ;
            u.turnStartX = u.x;
            u.turnStartZ = u.z;
            u.turnCtrlX = u.x;
            u.turnCtrlZ = bdLaneZ;
            u.turnEndX = centerX + bdDir * 12.5;
            u.turnEndZ = bdLaneZ;
            u.turnDuration = 1.35;
            u.turnT = 0;
            u.turnNextMode = 'bd';
            u.subMode = 'turn_curve';
          } else if (nsDir > 0 && u.z >= 14.0 && u.z <= 21.0) {
            const sigGetter = this.getSignalForCenterX(centerX);
            const nsGreen = !sigGetter || (sigGetter().nsPhase ?? 'green') === 'green';
            if (
              nsGreen &&
              this.coordinator.isIntersectionBoxClearForAxis({ id: u.id, centerX, axis: 'ns', y: -0.26 })
            ) {
              // Coming South off Đại Lộ Bệnh Viện: bias 78% West into Phố Cư Dân Tây to keep Central calm!
              const turnDir: 1 | -1 = centerX < 0 ? (Math.random() < 0.78 ? -1 : 1) : Math.random() < 0.5 ? 1 : -1;
              const targetZ = turnDir > 0 ? (u.kind === 'car' ? 26.8 : 25.6) : (u.kind === 'car' ? 31.1 : 32.3);
              u.dir = turnDir;
              u.laneCoord = targetZ;
              u.turnStartX = u.x;
              u.turnStartZ = u.z;
              u.turnCtrlX = u.x;
              u.turnCtrlZ = targetZ;
              u.turnEndX = centerX + turnDir * 13.0;
              u.turnEndZ = targetZ;
              u.turnDuration = 1.4;
              u.turnT = 0;
              u.turnNextMode = 'ew';
              u.subMode = 'turn_curve';
            }
          }

          u.group.position.set(u.x, -0.26, u.z);
          u.group.rotation.y = u.yaw;
          const moved = Math.hypot(u.x - prevX, u.z - prevZ);
          for (let w = 0; w < u.wheels.length; w++) {
            u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
          }
          u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
          u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;
          this.coordinator.updateVehicle({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: -0.26,
            z: u.z,
            fwdX: Math.sin(u.yaw),
            fwdZ: Math.cos(u.yaw),
            halfW: u.halfW,
            halfL: u.halfL,
            speed: u.speed,
            isStoppedOrParked: u.speed < 0.15,
            priority: u.priority,
            active: true,
          });
        } else if (mode === 'bd') {
          u.group.visible = true;
          const bdDir = u.bdDir ?? 1;
          const bdLaneZ = u.bdLaneZ ?? CITY_ROAD_BOUNDS.bachDangEBZ;
          const clr = this.coordinator.getForwardClearance({
            id: u.id,
            x: u.x,
            y: -0.26,
            z: u.z,
            moveDirX: bdDir,
            moveDirZ: 0,
            halfW: u.halfW,
            halfL: u.halfL,
            lookahead: 13.0,
            minGap: 2.5,
            priority: u.priority,
          });
          const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
          const targetSpeed = u.cruiseSpeed * factor;
          const braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;
          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
          u.x += bdDir * u.speed * dt;
          u.z = THREE.MathUtils.lerp(u.z, bdLaneZ, Math.min(1, dt * 4.0));
          u.yaw = bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;

          // Turn South onto Sơn Tây (370), DIOR (503), or Đại Lộ Bệnh Viện (-227.5) to complete the waterfront ring-road bypass!
          const atSonTay = Math.abs(u.x - FAR_EAST_INTERSECTION_CENTER_X) < 3.0;
          const atDior = Math.abs(u.x - DIOR_INTERSECTION_CENTER_X) < 3.0;
          if ((u.branchCooldown ?? 0) <= 0 && (atSonTay || atDior)) {
            if (Math.random() < 0.52) {
              const centerX = atDior ? DIOR_INTERSECTION_CENTER_X : FAR_EAST_INTERSECTION_CENTER_X;
              const nsLaneX = u.kind === 'car' ? centerX - 2.1 : centerX - 6.1;
              u.nsCenterX = centerX;
              u.nsDir = 1;
              u.nsLaneX = nsLaneX;
              u.turnStartX = u.x;
              u.turnStartZ = u.z;
              u.turnCtrlX = nsLaneX;
              u.turnCtrlZ = u.z;
              u.turnEndX = nsLaneX;
              u.turnEndZ = -102.0;
              u.turnDuration = 1.35;
              u.turnT = 0;
              u.turnNextMode = 'ns_branch';
              u.subMode = 'turn_curve';
            } else {
              u.branchCooldown = 3.5;
            }
          } else if (bdDir > 0 && u.x >= 530.0) {
            u.bdDir = -1;
            u.bdLaneZ = CITY_ROAD_BOUNDS.bachDangWBZ;
            u.z = u.bdLaneZ;
            u.yaw = -Math.PI / 2;
          } else if (bdDir < 0 && u.x <= -214.0) {
            const nsLaneX = u.kind === 'car' ? WEST_INTERSECTION_CENTER_X - 2.1 : WEST_INTERSECTION_CENTER_X - 6.1;
            u.nsCenterX = WEST_INTERSECTION_CENTER_X;
            u.nsDir = 1;
            u.nsLaneX = nsLaneX;
            u.turnStartX = u.x;
            u.turnStartZ = u.z;
            u.turnCtrlX = nsLaneX;
            u.turnCtrlZ = u.z;
            u.turnEndX = nsLaneX;
            u.turnEndZ = -102.0;
            u.turnDuration = 1.35;
            u.turnT = 0;
            u.turnNextMode = 'ns_branch';
            u.subMode = 'turn_curve';
          }

          u.group.position.set(u.x, -0.26, u.z);
          u.group.rotation.y = u.yaw;
          const moved = Math.hypot(u.x - prevX, u.z - prevZ);
          for (let w = 0; w < u.wheels.length; w++) {
            u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
          }
          u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
          u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;
          this.coordinator.updateVehicle({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: -0.26,
            z: u.z,
            fwdX: Math.sin(u.yaw),
            fwdZ: Math.cos(u.yaw),
            halfW: u.halfW,
            halfL: u.halfL,
            speed: u.speed,
            isStoppedOrParked: u.speed < 0.15,
            priority: u.priority,
            active: true,
          });
        } else {
          // East-West Boulevard Vehicle traversing full boulevard (-956 .. +552), obeying all 4 lights & branching!
          if (!u.group.visible) {
            const respawnX = u.dir > 0 ? CITY_ROAD_BOUNDS.westEndX : 552.0;
            if (
              this.coordinator.isZoneClear({
                id: u.id,
                x: respawnX,
                y: -0.26,
                z: u.laneCoord,
                halfX: u.halfL + 4.0,
                halfZ: u.halfW + 0.8,
              })
            ) {
              u.x = respawnX;
              u.z = u.laneCoord;
              u.speed = u.cruiseSpeed;
              u.group.visible = true;
            } else {
              this.coordinator.deactivateVehicle(u.id);
              continue;
            }
          }

          const signalSlowFactor = computeBoulevardSignalFactor({
            x: u.x,
            halfL: u.halfL,
            moveDirX: u.dir,
            getWestSignal: this.getWestSignal,
            getEastSignal: this.getSignalState,
            getFarEastSignal: this.getFarEastSignal,
            getDiorSignal: this.getDiorSignal,
            coordinator: this.coordinator,
            vehicleId: u.id,
          });

          const clr = this.coordinator.getForwardClearance({
            id: u.id,
            x: u.x,
            y: -0.26,
            z: u.z,
            moveDirX: u.dir,
            moveDirZ: 0,
            halfW: u.halfW,
            halfL: u.halfL,
            lookahead: 14.0,
            minGap: 2.8,
            priority: u.priority,
          });

          const factor = clr.blocked ? 0 : Math.min(signalSlowFactor, clr.maxSpeedFactor);
          const targetSpeed = u.cruiseSpeed * factor;
          const braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;

          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
          u.x += u.dir * u.speed * dt;
          u.z = u.laneCoord;
          u.yaw = u.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

          // Divert traffic onto Đại Lộ Bệnh Viện (-227.5), Sơn Tây (370), or Đại Lộ Paris / DIOR (503) -> Đường Bạch Đằng waterfront bypass!
          if ((u.branchCooldown ?? 0) <= 0) {
            const nearWestInt = Math.abs(u.x - (WEST_INTERSECTION_CENTER_X - u.dir * 3.5)) < 1.8;
            const nearSonTay = Math.abs(u.x - (FAR_EAST_INTERSECTION_CENTER_X - u.dir * 3.5)) < 1.8;
            const nearDior = Math.abs(u.x - (DIOR_INTERSECTION_CENTER_X - u.dir * 3.5)) < 1.8;
            const branchProb = nearWestInt ? 0.65 : 0.58;
            if ((nearWestInt || nearSonTay || nearDior) && Math.random() < branchProb) {
              const centerX = nearWestInt
                ? WEST_INTERSECTION_CENTER_X
                : nearDior
                  ? DIOR_INTERSECTION_CENTER_X
                  : FAR_EAST_INTERSECTION_CENTER_X;
              const sigGetter = this.getSignalForCenterX(centerX);
              const ewGreen = !sigGetter || sigGetter().ewPhase === 'green';
              if (
                ewGreen &&
                this.coordinator.isIntersectionBoxClearForAxis({ id: u.id, centerX, axis: 'ew', y: -0.26 })
              ) {
                const nsLaneX = u.kind === 'car' ? centerX + 2.1 : centerX + 6.1;
                u.nsCenterX = centerX;
                u.nsDir = -1;
                u.nsLaneX = nsLaneX;
                u.turnStartX = u.x;
                u.turnStartZ = u.z;
                u.turnCtrlX = nsLaneX;
                u.turnCtrlZ = u.z;
                u.turnEndX = nsLaneX;
                u.turnEndZ = 14.5;
                u.turnDuration = 1.4;
                u.turnT = 0;
                u.turnNextMode = 'ns_branch';
                u.subMode = 'turn_curve';
              } else {
                u.branchCooldown = 4.0;
              }
            }
          }

          if (u.subMode === 'ew') {
            if (u.dir > 0 && u.x > 552.0) {
              if (
                this.coordinator.isZoneClear({
                  id: u.id,
                  x: CITY_ROAD_BOUNDS.westEndX,
                  y: -0.26,
                  z: u.laneCoord,
                  halfX: u.halfL + 4.0,
                  halfZ: u.halfW + 0.8,
                })
              ) {
                u.x = CITY_ROAD_BOUNDS.westEndX;
              } else {
                u.group.visible = false;
                u.speed = 0;
                this.coordinator.deactivateVehicle(u.id);
                continue;
              }
            } else if (u.dir < 0 && u.x < CITY_ROAD_BOUNDS.westEndX) {
              if (
                this.coordinator.isZoneClear({
                  id: u.id,
                  x: 552.0,
                  y: -0.26,
                  z: u.laneCoord,
                  halfX: u.halfL + 4.0,
                  halfZ: u.halfW + 0.8,
                })
              ) {
                u.x = 552.0;
              } else {
                u.group.visible = false;
                u.speed = 0;
                this.coordinator.deactivateVehicle(u.id);
                continue;
              }
            }
          }

          u.group.position.set(u.x, -0.26, u.z);
          u.group.rotation.y = u.yaw;
          const moved = Math.abs(u.x - prevX);
          for (let w = 0; w < u.wheels.length; w++) {
            u.wheels[w].rotation.x += moved / Math.max(0.15, u.wheelR);
          }
          u.headlightMat.emissiveIntensity = 0.75 + lampFactor * 1.0;
          u.brakeMat.emissiveIntensity = braking ? 1.9 : 0.55 + lampFactor * 0.5;

          this.coordinator.updateVehicle({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: -0.26,
            z: u.z,
            fwdX: u.dir,
            fwdZ: 0,
            halfW: u.halfW,
            halfL: u.halfL,
            speed: u.speed,
            isStoppedOrParked: u.speed < 0.15,
            priority: u.priority,
            active: true,
          });
        }
      }
    }

    // 2. Update Strolling Pedestrian NPCs in Phố Đi Bộ
    for (let i = 0; i < this.strollers.length; i++) {
      const p = this.strollers[i];
      if (p.nightOnly && !pedActive) {
        p.group.visible = false;
        p.glbHandle.setVisible(false);
        continue;
      }
      p.group.visible = true;
      p.glbHandle.setVisible(true);
      p.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(p.speed / 1.35, 0.85, 1.4));
      const target = p.waypoints[p.wpIdx];
      const dx = target.x - p.group.position.x;
      const dz = target.z - p.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.35) {
        p.wpIdx = (p.wpIdx + 1) % p.waypoints.length;
      } else {
        const step = Math.min(dist, p.speed * dt);
        p.group.position.x += (dx / dist) * step;
        p.group.position.z += (dz / dist) * step;
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - p.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.group.rotation.y += diff * Math.min(1, dt * 6);

        if (p.hipsGroup.visible) {
          p.walkPhase += dt * p.speed * 4.2;
          const swing = Math.sin(p.walkPhase) * 0.52;
          p.leftLeg.rotation.x = swing;
          p.rightLeg.rotation.x = -swing;
          p.leftArm.rotation.x = -swing * 0.65;
          p.rightArm.rotation.x = p.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
          p.hipsGroup.position.y = Math.abs(Math.cos(p.walkPhase)) * 0.03;
        }
      }
    }
  }
}
