import * as THREE from 'three';
import {
  DIOR_INTERSECTION_CENTER_X,
  FAR_EAST_INTERSECTION_CENTER_X,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import type { EastIntersectionCharacterHelpers } from './EastIntersectionSystem';
import type { IntersectionColliderBox, IntersectionSignalState } from './WestIntersectionSystem';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickOutsideNpcModel } from './NpcModelCatalog';
import { buildAmbientXanhSmTaxiCar } from './XanhSmTaxiSystem';

export const FAR_EAST_INTERSECTION_CENTER_Z = 29.0;

export interface FarEastIntersectionBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  getSignalState: () => IntersectionSignalState;
  getDiorSignalState: () => IntersectionSignalState;
  update: (delta: number, rawHour: number, lampFactor: number) => void;
}

// Colliders around the Far-East 4-Way Intersections:
// 1. "Ngã Tư Sơn Tây" (Center X = 370.0, Z = 29.0)
// 2. "Ngã Tư DIOR" (Center X = 503.0, Z = 29.0) immediately East of DIOR (X = 461.6..487.6)
export const FAR_EAST_INTERSECTION_COLLIDERS: IntersectionColliderBox[] = [
  // Far East Road End Boundary (X = 561.5)
  { minX: 561.0, maxX: 564.5, minZ: 15.0, maxZ: 43.0, floor: 1 },
  // Note: Ngã Tư DIOR South Leg (X=489..517) connects openly south into Ngã Tư DIOR Nam (Z=148) & Vinhomes Ocean Park 3!

  // 4 Traffic Light Gantry Corner Poles at Ngã Tư Sơn Tây (X = 360.8 & 379.2, Z = 19.8 & 38.2)
  { minX: 360.4, maxX: 361.2, minZ: 19.4, maxZ: 20.2, floor: 1 }, // NW Pole
  { minX: 378.8, maxX: 379.6, minZ: 19.4, maxZ: 20.2, floor: 1 }, // NE Pole
  { minX: 360.4, maxX: 361.2, minZ: 37.8, maxZ: 38.6, floor: 1 }, // SW Pole
  { minX: 378.8, maxX: 379.6, minZ: 37.8, maxZ: 38.6, floor: 1 }, // SE Pole

  // 4 Traffic Light Gantry Corner Poles at Ngã Tư DIOR (X = 493.8 & 512.2, Z = 19.8 & 38.2)
  { minX: 493.4, maxX: 494.2, minZ: 19.4, maxZ: 20.2, floor: 1 }, // Dior NW Pole
  { minX: 511.8, maxX: 512.6, minZ: 19.4, maxZ: 20.2, floor: 1 }, // Dior NE Pole
  { minX: 493.4, maxX: 494.2, minZ: 37.8, maxZ: 38.6, floor: 1 }, // Dior SW Pole
  { minX: 511.8, maxX: 512.6, minZ: 37.8, maxZ: 38.6, floor: 1 }, // Dior SE Pole

  // Sidewalk Verge Lines & East Quadrant Building Blocks
  // West Side of Sơn Tây North Leg (carves out Huawei Corner Store Z = -104.0..-64.0, Xiaomi Store Z = -62.4..-37.6 and Samsung Store Z = -35.8..-10.2 beside John Henry!)
  { minX: 355.5, maxX: 356.5, minZ: -64.0, maxZ: -62.4, floor: 1 },
  { minX: 355.5, maxX: 356.5, minZ: -37.6, maxZ: -35.8, floor: 1 },
  { minX: 355.5, maxX: 356.5, minZ: -10.2, maxZ: -8.6, floor: 1 },
  // West Side of Sơn Tây South Leg (carves out KATINAT Coffee & Tea House Z = 69.0..95.0 & Công Viên Sơn Tây Nam Z = 97.0..133.0)
  { minX: 353.4, maxX: 356.5, minZ: 67.5, maxZ: 69.0, floor: 1 },
  { minX: 355.5, maxX: 356.5, minZ: 95.0, maxZ: 97.0, floor: 1 },
  { minX: 355.5, maxX: 356.5, minZ: 133.0, maxZ: 134.3, floor: 1 },
  // East Side of Sơn Tây North Leg & NE Corner Skyline Towers (carves out LV, Gucci, YSL & DIOR X=461.6..487.6, Z=-12.4..15.6 AND Ngã Tư DIOR North Leg X=487.6..517.0)
  { minX: 434.8, maxX: 436.2, minZ: -12.4, maxZ: 13.9, floor: 1 }, // Alley seal between Gucci & YSL
  { minX: 460.0, maxX: 461.6, minZ: -12.4, maxZ: 15.52, floor: 1 }, // Alley seal between YSL & Dior
  // Apple Store (Z = -45.2..-16.8), LG Brandshop (Z = -75.0..-47.0) & Sony Flagship Corner (Z = -104.0..-76.2) carved out cleanly at X = 383.8..412.6
  { minX: 412.6, maxX: 488.0, minZ: -104.0, maxZ: -12.0, floor: 1 }, // Rear wall behind Gucci, YSL, DIOR, Apple, LG & Sony Store
  { minX: 387.0, maxX: 412.6, minZ: -76.2, maxZ: -75.0, floor: 1 }, // Pocket seal between LG & Sony (keeps X=383.8..387.0 sidewalk open)
  { minX: 387.0, maxX: 412.6, minZ: -47.0, maxZ: -45.2, floor: 1 }, // Pocket seal between Apple & LG (keeps X=383.8..387.0 sidewalk open)
  { minX: 387.0, maxX: 412.6, minZ: -16.8, maxZ: -12.15, floor: 1 }, // Pocket seal between LV & Apple (keeps X=383.8..387.0 sidewalk open)
  { minX: 487.6, maxX: 488.5, minZ: -104.0, maxZ: -11.6, floor: 1 }, // West edge of Ngã Tư DIOR North Leg up to Bạch Đằng sidewalk (keeps Dior East Plaza X=487.6..494.6 open!)
  { minX: 517.0, maxX: 564.0, minZ: -104.0, maxZ: 15.52, floor: 1 }, // East of Ngã Tư DIOR along North extended sidewalk
  // East Side of Sơn Tây South Leg & SE Corner Skyline Towers (carves out Highlands, Hermès, Chanel, PRADA X=461.6..487.6, Z=45.8..70.0 AND Ngã Tư DIOR South Leg X=488.5..517.0)
  { minX: 460.0, maxX: 461.6, minZ: 42.58, maxZ: 70.2, floor: 1 }, // Alley seal between Chanel & Prada
  { minX: 487.6, maxX: 488.5, minZ: 45.8, maxZ: 70.2, floor: 1 }, // East verge beside Prada (keeps Ngã Tư DIOR SW corner sidewalk X=488.5..494.6 & Prada apron open)
  { minX: 517.0, maxX: 564.0, minZ: 42.58, maxZ: 134.3, floor: 1 }, // South blocks East of Ngã Tư DIOR (stops cleanly at Vinhomes 3 North crossroad Z=134.3)
  // Carve out VPBank 2-Story Branch (X=383.8..409.5, Z=73.0..99.1) & VPBank 24h ATM Booth (X=383.8..392.6, Z=100.2..109.5) South of Highlands Coffee
  { minX: 387.8, maxX: 412.6, minZ: 70.2, maxZ: 73.0, floor: 1 }, // Landscaped alley buffer between Highlands & VPBank (keeps X=383.8..387.8 sidewalk open)
  { minX: 409.5, maxX: 489.0, minZ: 70.2, maxZ: 134.3, floor: 1 }, // City towers & Hermès/Chanel rear behind VPBank up to Ngã Tư DIOR South Leg West sidewalk (X=489.0)
  { minX: 392.6, maxX: 409.5, minZ: 99.1, maxZ: 134.3, floor: 1 }, // Behind VPBank 24h ATM Booth
  { minX: 383.8, maxX: 392.6, minZ: 109.5, maxZ: 134.3, floor: 1 }, // South of VPBank 24h ATM Booth
  { minX: 434.8, maxX: 436.2, minZ: 45.8, maxZ: 70.2, floor: 1 }, // Alley seal between Hermès & Chanel
];

function createFarEastTurnArrowTex(type: 'straight' | 'straight_left' | 'straight_right'): THREE.CanvasTexture {
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

function createFarEastSignTex(title: string, sub: string, bg = '#065f46'): THREE.CanvasTexture {
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
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText(title, 256, 56);
  ctx.fillStyle = '#fde047';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(sub, 256, 114);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createFarEastGlowPoolTex(): THREE.CanvasTexture {
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

export function createFarEastIntersectionStructure(): FarEastIntersectionBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.9 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.75, metalness: 0.1 });
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.95,
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const yellowMedianMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const poleDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.4 });

  // =========================================================================
  // 1. 4-WAY ASPHALT ROADS (CENTER X = 370.0, Z = 29.0)
  // =========================================================================
  // East-West Boulevard Extension from X = 360.0 to X = 564.0 (204.0m long, seamless join at X = 360.0)
  const ewRoadExt = new THREE.Mesh(new THREE.PlaneGeometry(204.0, 16.8), asphaltMat);
  ewRoadExt.rotation.x = -Math.PI / 2;
  ewRoadExt.position.set(462.0, -0.26, FAR_EAST_INTERSECTION_CENTER_Z);
  staticGroup.add(ewRoadExt);

  // North Leg — Sơn Tây Bắc Avenue extending all the way North into Ngã 3 Bạch Đằng (Z = -109.1 .. 20.6)
  const nsNorthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 129.7), asphaltMat);
  nsNorthRoad.rotation.x = -Math.PI / 2;
  nsNorthRoad.position.set(FAR_EAST_INTERSECTION_CENTER_X, -0.26, -44.25);
  staticGroup.add(nsNorthRoad);

  // South Leg — Sơn Tây Nam Avenue (Z = 37.4 .. 139.6, joining Ngã Tư Sơn Tây Nam / Vinhomes 2 seamlessly)
  const nsSouthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 102.2), asphaltMat);
  nsSouthRoad.rotation.x = -Math.PI / 2;
  nsSouthRoad.position.set(FAR_EAST_INTERSECTION_CENTER_X, -0.26, 88.5);
  staticGroup.add(nsSouthRoad);

  // Ngã Tư DIOR North Leg — Đại Lộ Paris Bắc connecting all the way into Ngã 3 Bạch Đằng (Center X = 503.0, X = 494.6..511.4, Z = -109.1..20.6)
  const diorNorthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 129.7), asphaltMat);
  diorNorthRoad.rotation.x = -Math.PI / 2;
  diorNorthRoad.position.set(DIOR_INTERSECTION_CENTER_X, -0.26, -44.25);
  staticGroup.add(diorNorthRoad);

  // Ngã Tư DIOR South Leg — Đại Lộ Paris Nam connecting all the way into Ngã Tư DIOR Nam (Z=148) & Vinhomes 3 (Center X = 503.0, X = 494.6..511.4, Z = 37.4..139.6)
  const diorSouthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 102.2), asphaltMat);
  diorSouthRoad.rotation.x = -Math.PI / 2;
  diorSouthRoad.position.set(DIOR_INTERSECTION_CENTER_X, -0.26, 88.5);
  staticGroup.add(diorSouthRoad);

  // =========================================================================
  // 2. SIDEWALKS & GRANITE CURBS ON ALL 4 CORNERS
  // =========================================================================
  const addSidewalkSlab = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), sidewalkMat);
    mesh.position.set((minX + maxX) * 0.5, -0.14, (minZ + maxZ) * 0.5);
    staticGroup.add(mesh);
  };
  const addCurbBar = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = Math.max(0.24, maxX - minX);
    const d = Math.max(0.24, maxZ - minZ);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), curbMat);
    mesh.position.set((minX + maxX) * 0.5, 0.06, (minZ + maxZ) * 0.5);
    staticGroup.add(mesh);
  };

  // NW Corner Sidewalk (X = 356.5..361.8, Z = -104.0..15.58; joins Bạch Đằng sidewalk at Z = -104.0 & EW sidewalk at Z = 15.58)
  addSidewalkSlab(356.5, 361.8, -104.0, 15.58);
  addSidewalkSlab(360.0, 361.8, 15.58, 20.80);
  addCurbBar(361.68, 361.92, -104.0, 20.92);
  addCurbBar(360.0, 361.8, 20.68, 20.92);

  // SW Corner Sidewalk (X = 356.5..361.8, Z = 42.50..134.3; joins Vinhomes 2 NW corner at Z = 134.3..139.6)
  addSidewalkSlab(356.5, 361.8, 42.50, 134.3);
  addSidewalkSlab(360.0, 361.8, 37.20, 42.50);
  addCurbBar(361.68, 361.92, 37.08, 139.6);
  addCurbBar(360.0, 361.8, 37.08, 37.32);

  // NE Corner Sidewalk at Sơn Tây (X = 378.2..383.8 North leg + Boulevard North split cleanly around Ngã Tư DIOR X = 494.6..511.4)
  addSidewalkSlab(378.2, 383.8, -104.0, 15.58);
  addSidewalkSlab(378.2, 494.6, 15.58, 20.80);
  addCurbBar(378.08, 378.32, -104.0, 20.92);
  addCurbBar(378.2, 494.6, 20.68, 20.92);

  // SE Corner Sidewalk at Sơn Tây (X = 378.2..383.8 South leg up to Z = 134.3 + Boulevard South split cleanly around Ngã Tư DIOR)
  addSidewalkSlab(378.2, 383.8, 42.50, 134.3);
  addSidewalkSlab(378.2, 494.6, 37.20, 42.50);
  addCurbBar(378.08, 378.32, 37.08, 139.6);
  addCurbBar(378.2, 494.6, 37.08, 37.32);

  // Ngã Tư DIOR 4 Corner Sidewalks & Curbs (Center X = 503.0, Z = 29.0)
  // Dior NW Corner: broad open 7m East Showcase Plaza beside Dior (X = 487.6..494.6, Z = -12.0..15.58) + North leg West sidewalk to Bạch Đằng (Z = -104.0)
  addSidewalkSlab(487.6, 494.6, -12.0, 15.58);
  addSidewalkSlab(489.0, 494.6, -104.0, -12.0);
  addCurbBar(494.48, 494.72, -104.0, 20.92);
  // Dior NE Corner up to Bạch Đằng sidewalk (Z = -104.0)
  addSidewalkSlab(511.4, 517.0, -104.0, 15.58);
  addSidewalkSlab(511.4, 564.0, 15.58, 20.80);
  addCurbBar(511.28, 511.52, -104.0, 20.92);
  addCurbBar(511.4, 564.0, 20.68, 20.92);
  // Dior SW Corner (connects flush to Vinhomes 3 NW sidewalk at Z = 134.3..139.6)
  addSidewalkSlab(489.0, 494.6, 42.50, 134.3);
  addCurbBar(494.48, 494.72, 37.08, 139.6);
  // Dior SE Corner (connects flush to Vinhomes 3 NE sidewalk at Z = 134.3..139.6)
  addSidewalkSlab(511.4, 517.0, 42.50, 134.3);
  addSidewalkSlab(511.4, 564.0, 37.20, 42.50);
  addCurbBar(511.28, 511.52, 37.08, 139.6);
  addCurbBar(511.4, 564.0, 37.08, 37.32);

  // Far-East End Promenade Cap & Granite Curb (X = 562.2..564.0)
  addSidewalkSlab(562.2, 564.0, 20.80, 37.20);
  addCurbBar(562.08, 562.32, 20.68, 37.32);

  // =========================================================================
  // 3. ROAD MARKINGS, CROSSWALKS, STOP LINES & LANE ARROWS
  // =========================================================================
  const addStripe = (x: number, z: number, w: number, d: number, mat: THREE.Material, y = -0.25) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    staticGroup.add(m);
  };

  // East Boulevard Extension Markings split cleanly around Ngã Tư DIOR (X = 489.0..517.0)
  [
    { startX: 383.5, endX: 489.0 },
    { startX: 517.0, endX: 561.5 },
  ].forEach(({ startX, endX }) => {
    const segLen = endX - startX;
    const segMidX = (startX + endX) * 0.5;
    [-0.14, 0.14].forEach((off) =>
      addStripe(segMidX, FAR_EAST_INTERSECTION_CENTER_Z + off, segLen, 0.12, yellowMedianMat)
    );
    [-1, 1].forEach((dir) =>
      addStripe(segMidX, FAR_EAST_INTERSECTION_CENTER_Z + dir * 7.75, segLen, 0.16, stripeMat)
    );
  });
  for (let x = 386.5; x <= 557.5; x += 5.5) {
    if (x >= 462.8 && x <= 468.2) continue; // keep crosswalk X=464..467.2 clear
    if (x >= 488.2 && x <= 517.8) continue; // keep Ngã Tư DIOR intersection box & crosswalks clear
    [-4.1, 4.1].forEach((off) => addStripe(x, FAR_EAST_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }
  // Pedestrian Crosswalk along Extended Luxury Boulevard beside YSL/Chanel (X = 464.0..467.2)
  for (let z = 21.8; z <= 36.2; z += 1.05) {
    addStripe(465.6, z, 3.2, 0.52, stripeMat, -0.248);
  }

  // Sơn Tây North Leg Markings (Z = -104.8 .. 15.4 stopping cleanly before Ngã 3 Bạch Đằng!)
  const nLen = 120.2;
  const nMidZ = -44.7;
  [-0.14, 0.14].forEach((off) => addStripe(FAR_EAST_INTERSECTION_CENTER_X + off, nMidZ, 0.12, nLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(FAR_EAST_INTERSECTION_CENTER_X + dir * 7.75, nMidZ, 0.16, nLen, stripeMat));
  for (let z = -99.5; z <= 12.0; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(FAR_EAST_INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // Sơn Tây South Leg Markings (Z = 42.6 .. 134.0 stopping cleanly before Ngã Tư Sơn Tây Nam stop line!)
  const sLen = 91.4;
  const sMidZ = 88.3;
  [-0.14, 0.14].forEach((off) => addStripe(FAR_EAST_INTERSECTION_CENTER_X + off, sMidZ, 0.12, sLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(FAR_EAST_INTERSECTION_CENTER_X + dir * 7.75, sMidZ, 0.16, sLen, stripeMat));
  for (let z = 46.0; z <= 132.0; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(FAR_EAST_INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // Ngã Tư DIOR North Leg Markings (X = 503.0, Z = -104.8 .. 15.4 stopping cleanly before Ngã 3 Bạch Đằng!)
  const diorNLen = 120.2;
  const diorNMidZ = -44.7;
  [-0.14, 0.14].forEach((off) => addStripe(DIOR_INTERSECTION_CENTER_X + off, diorNMidZ, 0.12, diorNLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(DIOR_INTERSECTION_CENTER_X + dir * 7.75, diorNMidZ, 0.16, diorNLen, stripeMat));
  for (let z = -99.5; z <= 12.0; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(DIOR_INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // Ngã Tư DIOR South Leg Markings (X = 503.0, Z = 42.6 .. 134.0 stopping cleanly before Ngã Tư DIOR Nam stop line!)
  const diorSLen = 91.4;
  const diorSMidZ = 88.3;
  [-0.14, 0.14].forEach((off) => addStripe(DIOR_INTERSECTION_CENTER_X + off, diorSMidZ, 0.12, diorSLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(DIOR_INTERSECTION_CENTER_X + dir * 7.75, diorSMidZ, 0.16, diorSLen, stripeMat));
  for (let z = 46.0; z <= 132.0; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(DIOR_INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // 4 Zebra Crosswalks around Sơn Tây Center (X = 370.0, Z = 29.0)
  [359.2, 380.8].forEach((cx) => {
    for (let z = 21.8; z <= 36.2; z += 1.05) {
      addStripe(cx, z, 3.2, 0.52, stripeMat, -0.248);
    }
  });
  [18.2, 39.8].forEach((cz) => {
    for (let x = 362.8; x <= 377.2; x += 1.05) {
      addStripe(x, cz, 0.52, 3.2, stripeMat, -0.248);
    }
  });

  // 4 Zebra Crosswalks around Ngã Tư DIOR Center (X = 503.0, Z = 29.0)
  [492.2, 513.8].forEach((cx) => {
    for (let z = 21.8; z <= 36.2; z += 1.05) {
      addStripe(cx, z, 3.2, 0.52, stripeMat, -0.248);
    }
  });
  [18.2, 39.8].forEach((cz) => {
    for (let x = 495.8; x <= 510.2; x += 1.05) {
      addStripe(x, cz, 0.52, 3.2, stripeMat, -0.248);
    }
  });

  // 4 White Stop Lines at Sơn Tây
  addStripe(356.0, 24.9, 0.42, 7.6, stripeMat, -0.247); // West leg (Eastbound)
  addStripe(384.0, 33.1, 0.42, 7.6, stripeMat, -0.247); // East leg (Westbound)
  addStripe(365.9, 15.4, 7.6, 0.42, stripeMat, -0.247); // North leg (Southbound)
  addStripe(374.1, 42.6, 7.6, 0.42, stripeMat, -0.247); // South leg (Northbound)

  // 4 White Stop Lines at Ngã Tư DIOR
  addStripe(489.0, 24.9, 0.42, 7.6, stripeMat, -0.247); // West leg (Eastbound beside Dior)
  addStripe(517.0, 33.1, 0.42, 7.6, stripeMat, -0.247); // East leg (Westbound)
  addStripe(498.9, 15.4, 7.6, 0.42, stripeMat, -0.247); // North leg (Southbound)
  addStripe(507.1, 42.6, 7.6, 0.42, stripeMat, -0.247); // South leg (Northbound)

  // Directional Lane Arrows (cached 3 shared materials instead of 28 per-mesh materials!)
  const straightMat = new THREE.MeshStandardMaterial({
    map: createFarEastTurnArrowTex('straight'),
    transparent: true,
    roughness: 0.55,
  });
  const straightLeftMat = new THREE.MeshStandardMaterial({
    map: createFarEastTurnArrowTex('straight_left'),
    transparent: true,
    roughness: 0.55,
  });
  const straightRightMat = new THREE.MeshStandardMaterial({
    map: createFarEastTurnArrowTex('straight_right'),
    transparent: true,
    roughness: 0.55,
  });
  const arrowGeo = new THREE.PlaneGeometry(1.75, 2.7);
  const addLaneArrow = (x: number, z: number, yaw: number, mat: THREE.MeshStandardMaterial) => {
    const mesh = new THREE.Mesh(arrowGeo, mat);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = yaw;
    mesh.position.set(x, -0.246, z);
    staticGroup.add(mesh);
  };
  // Sơn Tây arrows
  addLaneArrow(352.0, 26.8, -Math.PI / 2, straightLeftMat);
  addLaneArrow(352.0, 23.2, -Math.PI / 2, straightRightMat);
  addLaneArrow(388.0, 31.1, Math.PI / 2, straightLeftMat);
  addLaneArrow(388.0, 34.8, Math.PI / 2, straightRightMat);
  addLaneArrow(367.9, 11.2, Math.PI, straightLeftMat);
  addLaneArrow(363.9, 11.2, Math.PI, straightRightMat);
  addLaneArrow(372.1, 46.8, 0, straightLeftMat);
  addLaneArrow(376.1, 46.8, 0, straightRightMat);
  addLaneArrow(406.0, 26.8, -Math.PI / 2, straightMat);
  addLaneArrow(406.0, 31.1, Math.PI / 2, straightMat);
  addLaneArrow(367.9, -32.0, Math.PI, straightMat);
  addLaneArrow(372.1, 86.0, 0, straightMat);
  // Ngã Tư DIOR arrows
  addLaneArrow(485.0, 26.8, -Math.PI / 2, straightLeftMat);
  addLaneArrow(485.0, 23.2, -Math.PI / 2, straightRightMat);
  addLaneArrow(521.0, 31.1, Math.PI / 2, straightLeftMat);
  addLaneArrow(521.0, 34.8, Math.PI / 2, straightRightMat);
  addLaneArrow(500.9, 11.2, Math.PI, straightLeftMat);
  addLaneArrow(496.9, 11.2, Math.PI, straightRightMat);
  addLaneArrow(505.1, 46.8, 0, straightLeftMat);
  addLaneArrow(509.1, 46.8, 0, straightRightMat);
  addLaneArrow(536.0, 26.8, -Math.PI / 2, straightMat);
  addLaneArrow(536.0, 31.1, Math.PI / 2, straightMat);
  addLaneArrow(500.9, -32.0, Math.PI, straightMat);
  addLaneArrow(505.1, 84.0, 0, straightMat);

  // =========================================================================
  // 4. SYNCHRONIZED TRAFFIC LIGHT GANTRIES (NGÃ TƯ SƠN TÂY & NGÃ TƯ DIOR)
  // =========================================================================
  interface SignalLensGroup {
    red: THREE.MeshStandardMaterial;
    yellow: THREE.MeshStandardMaterial;
    green: THREE.MeshStandardMaterial;
  }
  const ewLenses: SignalLensGroup[] = [];
  const nsLenses: SignalLensGroup[] = [];
  const diorEwLenses: SignalLensGroup[] = [];
  const diorNsLenses: SignalLensGroup[] = [];

  const buildTrafficGantry = (
    cornerX: number,
    cornerZ: number,
    armRotY: number,
    axisControlled: 'ew' | 'ns',
    streetSignTitle: string,
    streetSignSub: string,
    targetEwList: SignalLensGroup[] = ewLenses,
    targetNsList: SignalLensGroup[] = nsLenses
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

    const signTex = createFarEastSignTex(streetSignTitle, streetSignSub);
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

    const targetList = axisControlled === 'ew' ? targetEwList : targetNsList;
    const armStub = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.28), poleDarkMat);
    armStub.position.set(0, 3.48, 0.14);
    grp.add(armStub);
    createSignalHead(0, 3.48, 0.30, targetList);

    const pedList = axisControlled === 'ew' ? targetNsList : targetEwList;
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

  // Ngã Tư Sơn Tây (Center X = 370.0)
  buildTrafficGantry(379.2, 38.2, Math.PI / 2, 'ew', 'ĐẠI LỘ ĐÔNG TÂY', 'NGÃ TƯ SƠN TÂY');
  buildTrafficGantry(360.8, 19.8, -Math.PI / 2, 'ew', 'ĐẠI LỘ ĐÔNG TÂY', 'KHU THỜI TRANG');
  buildTrafficGantry(379.2, 19.8, Math.PI, 'ns', 'ĐƯỜNG SƠN TÂY BẮC', 'CỬA NGÕ PHÍA ĐÔNG');
  buildTrafficGantry(360.8, 38.2, 0, 'ns', 'ĐƯỜNG SƠN TÂY NAM', 'DESERT • ADIDAS');

  // Ngã Tư DIOR (Center X = 503.0)
  buildTrafficGantry(512.2, 38.2, Math.PI / 2, 'ew', 'ĐẠI LỘ ĐÔNG TÂY', 'NGÃ TƯ DIOR', diorEwLenses, diorNsLenses);
  buildTrafficGantry(493.8, 19.8, -Math.PI / 2, 'ew', 'ĐẠI LỘ ĐÔNG TÂY', 'DIOR • PARIS', diorEwLenses, diorNsLenses);
  buildTrafficGantry(512.2, 19.8, Math.PI, 'ns', 'ĐẠI LỘ PARIS BẮC', 'CỬA NGÕ DIOR', diorEwLenses, diorNsLenses);
  buildTrafficGantry(493.8, 38.2, 0, 'ns', 'ĐẠI LỘ PARIS NAM', 'KHU THỜI TRANG', diorEwLenses, diorNsLenses);

  // =========================================================================
  // 5. STREETLAMPS, TREES & EAST QUADRANT URBAN BUILDINGS
  // =========================================================================
  const sharedLampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xffe082,
    emissiveIntensity: 0.0,
    roughness: 0.3,
  });
  lanternMats.push(sharedLampGlowMat);

  const poolTex = createFarEastGlowPoolTex();
  const sharedPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedPoolMat);

  const addLamp = (x: number, z: number, armDirX: number, armDirZ: number) => {
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

  // East Boulevard Extension Lamps (keeping Ngã Tư DIOR roadway X=494.6..511.4 completely clear!)
  [392, 412, 430, 459.2, 482, 524, 548].forEach((lx) => {
    addLamp(lx, 20.25, 0, 1);
    addLamp(lx, 37.75, 0, -1);
  });
  // Sơn Tây North Leg Lamps (West lamps frame John Henry, Samsung Showcase & Xiaomi Flagship Store cleanly)
  [-4, -37.2, -63.5, -78, -99].forEach((lz) => {
    addLamp(361.25, lz, 1, 0);
  });
  [-4, -15.2, -46.8, -76.2, -99].forEach((lz) => {
    addLamp(378.75, lz, -1, 0);
  });
  // Sơn Tây South Leg Lamps
  [60, 84, 108, 128].forEach((lz) => {
    addLamp(361.25, lz, 1, 0);
    addLamp(378.75, lz, -1, 0);
  });
  // Ngã Tư DIOR North & South Leg Lamps (up to Z = -100 approaching Ngã 3 Bạch Đằng)
  [-4, -30, -58, -82, -100].forEach((lz) => {
    addLamp(494.25, lz, 1, 0);
    addLamp(511.75, lz, -1, 0);
  });
  [60, 84, 108, 128].forEach((lz) => {
    addLamp(494.25, lz, 1, 0);
    addLamp(511.75, lz, -1, 0);
  });

  // Landscaping Trees flanking the 4 new road corridors
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

  // Keep Dior & Prada Showcase Windows unobstructed; line Ngã Tư DIOR North/South verges cleanly!
  [526, 550].forEach((tx) => {
    addTree(tx, 13.6, 1.04);
  });
  [528, 552].forEach((tx) => {
    addTree(tx, 44.4, 1.04);
  });
  [-24, -52, -80, -94].forEach((tz) => {
    addTree(488.0, tz, 0.96);
  });
  [-14, -42, -70, -94].forEach((tz) => {
    addTree(518.2, tz, 1.02);
  });
  [64, 92, 118].forEach((tz) => {
    addTree(488.0, tz, 0.96);
    addTree(518.2, tz, 1.02);
  });
  addTree(384.6, 71.75, 0.92);
  [-68, -92].forEach((tz) => {
    addTree(311.5, tz, 0.96);
  });
  [-14.4, -75.6].forEach((tz) => {
    addTree(385.0, tz, 1.02);
  });
  [113.5, 127.0].forEach((tz) => {
    addTree(385.0, tz, 1.02);
  });

  // Modern Urban Skyline Blocks framing the East Quadrant Corners (cached 5 materials for fast GPU batching!)
  const bldgColors = [0xdbe3ed, 0x94a3b8, 0x64748b, 0xe2e8f0, 0x334155];
  const cachedBldgMats = bldgColors.map(
    (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.68, metalness: 0.12 })
  );
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  neonMats.push(windowGlowMat);

  const addCityBlock = (x: number, z: number, w: number, h: number, d: number, colorIdx: number) => {
    const bMat = cachedBldgMats[colorIdx % cachedBldgMats.length];
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

  // NE Corner Commercial Towers behind Apple, LV, Gucci, YSL, Dior & flanking Ngã Tư DIOR North Leg (Apple Store replaces old X=400, Z=-34 block!)
  addCityBlock(432.0, -41.0, 20, 38, 20, 3);
  addCityBlock(452.0, -34.0, 20, 30, 20, 4);
  addCityBlock(475.0, -34.0, 22, 26, 20, 1);
  addCityBlock(475.0, -68.0, 22, 24, 20, 3);
  addCityBlock(536.0, -24.0, 24, 30, 20, 3);
  addCityBlock(536.0, -60.0, 22, 25, 20, 2);
  addCityBlock(432.0, -90.0, 22, 28, 20, 1);
  // SE Corner Commercial Towers behind Highlands, Hermès, Chanel & flanking Ngã Tư DIOR South Leg
  addCityBlock(424.0, 96.0, 20, 26, 22, 4);
  addCityBlock(448.0, 96.0, 20, 25, 22, 3);
  addCityBlock(474.0, 86.0, 22, 26, 20, 2);
  addCityBlock(474.0, 112.0, 22, 22, 20, 1);
  addCityBlock(536.0, 74.0, 24, 29, 22, 4);
  addCityBlock(536.0, 106.0, 22, 23, 22, 0);
  // Plot (X = 383.8..410.0, Z = 73.0..109.5) cleared for VPBank 2-Story Branch & 24h ATM Booth next to Highlands Coffee
  // North Leg West Rear Backdrop reserved for Casa Riva Tower (X = 254.0..314.0, Z = -104.0..-52.0)
  // South Leg West Rear Backdrop South of DESERT (Z=42.5..67.5) & KATINAT (Z=69.0..95.0) cleared for Công Viên Sơn Tây Nam (X=314.5..356.5, Z=96.8..133.2)

  // =========================================================================
  // 6. TRAFFIC SIGNAL CYCLES (SƠN TÂY & NGÃ TƯ DIOR WITH REALISTIC GREEN WAVE)
  // =========================================================================
  let cycleTimer = 2.5;
  let ewPhase: 'green' | 'yellow' | 'red' = 'green';
  let nsPhase: 'green' | 'yellow' | 'red' = 'red';

  let diorCycleTimer = 11.5;
  let diorEwPhase: 'green' | 'yellow' | 'red' = 'red';
  let diorNsPhase: 'green' | 'yellow' | 'red' = 'green';

  const applyLensState = (list: SignalLensGroup[], phase: 'green' | 'yellow' | 'red') => {
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      g.red.emissiveIntensity = phase === 'red' ? 2.1 : 0.06;
      g.yellow.emissiveIntensity = phase === 'yellow' ? 2.1 : 0.06;
      g.green.emissiveIntensity = phase === 'green' ? 2.1 : 0.06;
    }
  };

  const sampleCyclePhases = (t: number): { ew: 'green' | 'yellow' | 'red'; ns: 'green' | 'yellow' | 'red' } => {
    if (t < 6.5) return { ew: 'green', ns: 'red' };
    if (t < 8.0) return { ew: 'yellow', ns: 'red' };
    if (t < 9.5) return { ew: 'red', ns: 'red' };
    if (t < 15.0) return { ew: 'red', ns: 'green' };
    if (t < 16.5) return { ew: 'red', ns: 'yellow' };
    return { ew: 'red', ns: 'red' };
  };

  const update = (delta: number, _rawHour: number, _lampFactor: number) => {
    const dt = Math.min(delta, 0.1);
    cycleTimer = (cycleTimer + dt) % 18.0;
    const p1 = sampleCyclePhases(cycleTimer);
    ewPhase = p1.ew;
    nsPhase = p1.ns;
    applyLensState(ewLenses, ewPhase);
    applyLensState(nsLenses, nsPhase);

    diorCycleTimer = (diorCycleTimer + dt) % 18.0;
    const p2 = sampleCyclePhases(diorCycleTimer);
    diorEwPhase = p2.ew;
    diorNsPhase = p2.ns;
    applyLensState(diorEwLenses, diorEwPhase);
    applyLensState(diorNsLenses, diorNsPhase);
  };

  update(0, 7.0, 0);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    getSignalState: () => ({ ewPhase, nsPhase }),
    getDiorSignalState: () => ({ ewPhase: diorEwPhase, nsPhase: diorNsPhase }),
    update,
  };
}

// =========================================================================
// FAR-EAST INTERSECTION NORTH-SOUTH TRAFFIC & CROSSWALK PEDESTRIANS
// =========================================================================

interface FarEastVehicleUnit {
  id: string;
  kind: 'car' | 'motorbike';
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
  tPhase: 'ns' | 'turn_to_bd' | 'bd' | 'turn_from_bd' | 'dior_ns' | 'turn_dior_to_bd' | 'turn_bd_to_dior';
  turnT: number;
  bdDir: 1 | -1;
}

function buildFarEastSedan(colorHex: number, variant: CityCarVariant = 'sedan'): {
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

function buildFarEastMotorbike(
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

interface FarEastPedestrian {
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
}

export class FarEastIntersectionTrafficController {
  public readonly rootGroup = new THREE.Group();
  private readonly coordinator: CityTrafficCoordinator;
  private readonly getSignalState: () => IntersectionSignalState;
  private readonly getDiorSignalState?: () => IntersectionSignalState;
  private readonly getVinhomes2SignalState?: () => IntersectionSignalState;
  private readonly getVinhomes3SignalState?: () => IntersectionSignalState;
  private readonly units: FarEastVehicleUnit[] = [];
  private readonly peds: FarEastPedestrian[] = [];

  constructor(
    coordinator: CityTrafficCoordinator,
    getSignalState: () => IntersectionSignalState,
    helpers: EastIntersectionCharacterHelpers,
    getDiorSignalState?: () => IntersectionSignalState,
    getVinhomes2SignalState?: () => IntersectionSignalState,
    getVinhomes3SignalState?: () => IntersectionSignalState
  ) {
    this.coordinator = coordinator;
    this.getSignalState = getSignalState;
    this.getDiorSignalState = getDiorSignalState;
    this.getVinhomes2SignalState = getVinhomes2SignalState;
    this.getVinhomes3SignalState = getVinhomes3SignalState;
    this.rootGroup.userData.noMerge = true;
    this.buildVehicles();
    this.buildCornerPedestrians(helpers);
  }

  private buildVehicles() {
    const specs: Array<{
      id: string;
      kind: 'car' | 'motorbike';
      color: number;
      xanhSm?: { variant: 'vfe34' | 'vf5'; plate: string };
      dir: 1 | -1;
      laneCoord: number;
      pos: number;
      speed: number;
      phase: 'ns' | 'dior_ns';
    }> = [
      { id: 'far_east_ns_car_1', kind: 'car', color: 0x0ea5e9, dir: 1, laneCoord: 367.9, pos: -50.0, speed: 9.4, phase: 'ns' },
      { id: 'far_east_ns_xanhsm_1', kind: 'car', color: 0x00b6be, xanhSm: { variant: 'vfe34', plate: '43H-886.51' }, dir: -1, laneCoord: 372.1, pos: -14.0, speed: 9.3, phase: 'ns' },
      { id: 'far_east_ns_car_2', kind: 'car', color: 0xf43f5e, dir: -1, laneCoord: 372.1, pos: 95.0, speed: 9.2, phase: 'ns' },
      { id: 'far_east_ns_xanhsm_2', kind: 'car', color: 0x00b6be, xanhSm: { variant: 'vf5', plate: '43H-886.52' }, dir: 1, laneCoord: 367.9, pos: 64.0, speed: 9.1, phase: 'ns' },
      { id: 'far_east_ns_moto_1', kind: 'motorbike', color: 0xe2e8f0, dir: 1, laneCoord: 363.9, pos: -18.0, speed: 10.4, phase: 'ns' },
      { id: 'far_east_ns_moto_2', kind: 'motorbike', color: 0xf472b6, dir: -1, laneCoord: 376.1, pos: 58.0, speed: 10.2, phase: 'ns' },
      { id: 'far_east_ns_moto_3', kind: 'motorbike', color: 0x16a34a, dir: 1, laneCoord: 363.9, pos: -68.0, speed: 10.7, phase: 'ns' },
      { id: 'far_east_ns_moto_4', kind: 'motorbike', color: 0x06b6d4, dir: -1, laneCoord: 376.1, pos: 14.0, speed: 10.6, phase: 'ns' },
      // Ngã Tư DIOR N-S traffic (X = 494.6..511.4, center 503.0)
      { id: 'dior_ns_car_1', kind: 'car', color: 0x1e293b, dir: 1, laneCoord: 500.9, pos: -44.0, speed: 9.0, phase: 'dior_ns' },
      { id: 'dior_ns_xanhsm_1', kind: 'car', color: 0x00b6be, xanhSm: { variant: 'vfe34', plate: '43H-886.53' }, dir: 1, laneCoord: 500.9, pos: 14.0, speed: 9.2, phase: 'dior_ns' },
      { id: 'dior_ns_car_2', kind: 'car', color: 0xe2e8f0, dir: -1, laneCoord: 505.1, pos: 86.0, speed: 9.2, phase: 'dior_ns' },
      { id: 'dior_ns_moto_1', kind: 'motorbike', color: 0xdc2626, dir: 1, laneCoord: 496.9, pos: -14.0, speed: 10.2, phase: 'dior_ns' },
      { id: 'dior_ns_moto_2', kind: 'motorbike', color: 0x0ea5e9, dir: -1, laneCoord: 509.1, pos: 56.0, speed: 10.0, phase: 'dior_ns' },
      { id: 'dior_ns_moto_3', kind: 'motorbike', color: 0xfacc15, dir: 1, laneCoord: 496.9, pos: -64.0, speed: 10.6, phase: 'dior_ns' },
      { id: 'dior_ns_moto_4', kind: 'motorbike', color: 0xf8fafc, dir: -1, laneCoord: 509.1, pos: 10.0, speed: 10.4, phase: 'dior_ns' },
    ];

    const carVariants: CityCarVariant[] = ['sedan', 'coupe', 'suv', 'hatchback'];
    const helmetPalette = [0x18181b, 0xf472b6, 0xf8fafc, 0x0ea5e9];
    const jacketPalette = [0xc2a888, 0xd1d5db, 0xc2a888, 0x0f766e];
    const pHelmetPalette = [0xdc2626, 0xf8fafc, 0x18181b, 0xf472b6];
    const pJacketPalette = [0xe8b4cb, 0x334155, 0xe8b4cb, 0xd1d5db];
    let carIdx = 0;
    let motoIdx = 0;

    specs.forEach((s) => {
      let built: ReturnType<typeof buildFarEastSedan>;
      if (s.kind === 'car') {
        built = s.xanhSm
          ? buildAmbientXanhSmTaxiCar(s.xanhSm.variant, s.xanhSm.plate, true)
          : buildFarEastSedan(s.color, carVariants[carIdx++ % carVariants.length]);
      } else {
        const idx = motoIdx++;
        const hasPassenger = idx % 2 === 0;
        built = buildFarEastMotorbike(
          s.color,
          helmetPalette[idx % helmetPalette.length],
          jacketPalette[idx % jacketPalette.length],
          idx % 3 === 2,
          hasPassenger,
          pHelmetPalette[idx % pHelmetPalette.length],
          pJacketPalette[idx % pJacketPalette.length]
        );
      }
      const yaw = s.dir > 0 ? 0 : Math.PI;
      built.group.position.set(s.laneCoord, -0.26, s.pos);
      built.group.rotation.y = yaw;
      this.rootGroup.add(built.group);

      this.units.push({
        id: s.id,
        kind: s.kind,
        group: built.group,
        wheels: built.wheels,
        headlightMat: built.headlightMat,
        brakeMat: built.brakeMat,
        halfW: built.halfW,
        halfL: built.halfL,
        wheelR: built.wheelR,
        dir: s.dir,
        laneCoord: s.laneCoord,
        x: s.laneCoord,
        z: s.pos,
        yaw,
        speed: s.speed,
        cruiseSpeed: s.speed,
        priority: s.kind === 'car' ? 2 : 1,
        tPhase: s.phase,
        turnT: 0,
        bdDir: s.kind === 'car' ? 1 : -1,
      });
    });
  }

  private buildCornerPedestrians(helpers: EastIntersectionCharacterHelpers) {
    const outfits = [
      { shirt: 0x0284c7, pants: 0x1e293b, hair: 0x111827, skin: '#fbe0c8' },
      { shirt: 0xe11d48, pants: 0x334155, hair: 0x2c1a10, skin: '#f5c7a3' },
      { shirt: 0x10b981, pants: 0x0f172a, hair: 0x18181b, skin: '#fbe0c8' },
      { shirt: 0xf59e0b, pants: 0x1e293b, hair: 0x3b2314, skin: '#e8b48e' },
      { shirt: 0xf4f4f5, pants: 0x18181b, hair: 0x1c1917, skin: '#fbe0c8' },
      { shirt: 0x6366f1, pants: 0x0f172a, hair: 0x271911, skin: '#f5c7a3' },
      { shirt: 0xbe123c, pants: 0x1e293b, hair: 0x111827, skin: '#fbe0c8' },
    ];
    const loops: THREE.Vector3[][] = [
      [
        new THREE.Vector3(358.8, 0.02, 18.2),
        new THREE.Vector3(381.0, 0.02, 18.2),
        new THREE.Vector3(381.0, 0.02, 39.8),
        new THREE.Vector3(358.8, 0.02, 39.8),
      ],
      [
        new THREE.Vector3(381.0, 0.02, 39.8),
        new THREE.Vector3(358.8, 0.02, 39.8),
        new THREE.Vector3(358.8, 0.02, 18.2),
        new THREE.Vector3(381.0, 0.02, 18.2),
      ],
      [
        new THREE.Vector3(359.2, 0.02, -26.0),
        new THREE.Vector3(359.2, 0.02, 16.5),
        new THREE.Vector3(359.2, 0.02, 41.0),
        new THREE.Vector3(359.2, 0.02, 82.0),
      ],
      [
        new THREE.Vector3(380.8, 0.02, 80.0),
        new THREE.Vector3(380.8, 0.02, 41.0),
        new THREE.Vector3(380.8, 0.02, 16.5),
        new THREE.Vector3(380.8, 0.02, -26.0),
      ],
      // Ngã Tư DIOR Crosswalk & Corner Pedestrians
      [
        new THREE.Vector3(491.8, 0.02, 18.2),
        new THREE.Vector3(514.0, 0.02, 18.2),
        new THREE.Vector3(514.0, 0.02, 39.8),
        new THREE.Vector3(491.8, 0.02, 39.8),
      ],
      [
        new THREE.Vector3(514.0, 0.02, 39.8),
        new THREE.Vector3(491.8, 0.02, 39.8),
        new THREE.Vector3(491.8, 0.02, 18.2),
        new THREE.Vector3(514.0, 0.02, 18.2),
      ],
      [
        new THREE.Vector3(491.8, 0.02, -32.0),
        new THREE.Vector3(491.8, 0.02, 16.8),
        new THREE.Vector3(491.8, 0.02, 40.5),
        new THREE.Vector3(491.8, 0.02, 78.0),
      ],
    ];

    outfits.forEach((of, idx) => {
      const grp = new THREE.Group();
      const hipsGroup = new THREE.Group();
      grp.add(hipsGroup);

      const skinMat = new THREE.MeshStandardMaterial({ color: of.skin, roughness: 0.72 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: of.shirt, roughness: 0.75 });
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

      const npcSpec = pickOutsideNpcModel(idx + 3);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: npcSpec.modelSource,
        targetHeight: npcSpec.targetHeight,
        clipProfile: npcSpec.clipProfile,
        rotationY: npcSpec.rotationY,
        hostGroup: grp,
        fallbackMeshes: [hipsGroup],
        initialState: 'Walk',
        phaseOffset: idx * 1.2,
        palette: {
          shirt: of.shirt,
          pants: of.pants,
          hair: of.hair,
          skin: Number.parseInt(of.skin.replace('#', ''), 16) || 0xfbe0c8,
        },
      });

      const wps = loops[idx];
      grp.position.copy(wps[0]);
      this.rootGroup.add(grp);

      this.peds.push({
        group: grp,
        hipsGroup,
        glbHandle,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        waypoints: wps,
        wpIdx: 1 % wps.length,
        speed: 1.32 + (idx % 2) * 0.14,
        walkPhase: idx * 1.2,
      });
    });
  }

  public update(delta: number, lampFactor: number) {
    const dt = Math.min(delta, 0.08);
    const sig = this.getSignalState();

    // 1. Update NS Vehicles + smooth Ngã 3 Bạch Đằng - Sơn Tây turns
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const prevX = u.x;
      const prevZ = u.z;
      let braking = false;

      if (u.tPhase === 'ns') {
        const evalNsStop = (
          centerZ: number,
          northStopZ: number,
          southStopZ: number,
          intSig: IntersectionSignalState
        ) => {
          const distToStop = u.dir > 0 ? northStopZ - (u.z + u.halfL) : u.z - u.halfL - southStopZ;
          if (intSig.nsPhase === 'green') {
            if (
              distToStop >= -0.35 &&
              distToStop <= 5.5 &&
              !this.coordinator.isIntersectionBoxClearForAxis({
                id: u.id,
                centerX: FAR_EAST_INTERSECTION_CENTER_X,
                centerZ,
                axis: 'ns',
              })
            ) {
              return distToStop <= 1.5 ? 0 : Math.max(0.08, (distToStop - 1.5) / 4.0);
            }
          } else {
            const allowYellowClear = intSig.nsPhase === 'yellow' && distToStop < 1.2;
            if (!allowYellowClear && distToStop >= -0.35 && distToStop <= 16.0) {
              return distToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (distToStop - 1.25) / 14.75));
            }
          }
          return 1.0;
        };

        let signalSlowFactor = evalNsStop(FAR_EAST_INTERSECTION_CENTER_Z, 14.8, 43.2, sig);
        if (this.getVinhomes2SignalState) {
          const vh2Sig = this.getVinhomes2SignalState();
          signalSlowFactor = Math.min(
            signalSlowFactor,
            evalNsStop(148.0, 134.4, 161.6, vh2Sig),
            evalNsStop(344.0, 330.4, 357.6, vh2Sig)
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

        if (this.coordinator.isJamBypassActive(u.id)) {
          signalSlowFactor = 1.0;
        }

        const factor = clr.blocked ? 0 : Math.min(signalSlowFactor, clr.maxSpeedFactor);
        const targetSpeed = u.cruiseSpeed * factor;
        braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;

        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        u.z += u.dir * u.speed * dt;
        u.x = u.laneCoord;
        u.yaw = u.dir > 0 ? 0 : Math.PI;

        if (u.dir > 0 && u.z > 420.0) {
          // Respawn Southbound vehicle along Đường Bạch Đằng so it approaches and turns cleanly into Sơn Tây Bắc
          const nextBdDir: 1 | -1 = u.kind === 'car' ? 1 : -1;
          const spawnX = nextBdDir > 0 ? 290.0 : 438.0;
          const spawnZ = nextBdDir > 0 ? -113.4 : -121.6;
          if (
            this.coordinator.isZoneClear({
              id: u.id,
              x: spawnX,
              y: -0.26,
              z: spawnZ,
              halfX: u.halfL + 2.0,
              halfZ: u.halfW + 0.5,
            })
          ) {
            u.bdDir = nextBdDir;
            u.tPhase = 'bd';
            u.x = spawnX;
            u.z = spawnZ;
            u.yaw = nextBdDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            u.z = 420.0;
            u.speed = 0;
          }
        } else if (u.dir < 0 && u.z <= -105.0) {
          // Reach Ngã 3 Bạch Đằng -> curve smoothly left or right onto Đường Bạch Đằng!
          u.tPhase = 'turn_to_bd';
          u.turnT = 0;
          u.z = -105.0;
        }
      } else if (u.tPhase === 'turn_to_bd') {
        const endZ = u.bdDir > 0 ? -113.4 : -121.6;
        const endX = u.bdDir > 0 ? 383.5 : 356.5;
        const startX = u.laneCoord;
        const startZ = -105.0;
        u.turnT = Math.min(1, u.turnT + dt * 0.65);
        const t = u.turnT;
        const inv = 1 - t;
        u.x = inv * inv * startX + 2 * inv * t * startX + t * t * endX;
        u.z = inv * inv * startZ + 2 * inv * t * endZ + t * t * endZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.001) u.yaw = Math.atan2(dx, dz);
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.tPhase = 'bd';
          u.x = endX;
          u.z = endZ;
          u.yaw = u.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          u.speed = u.cruiseSpeed;
        }
      } else if (u.tPhase === 'bd') {
        const laneZ = u.bdDir > 0 ? -113.4 : -121.6;
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: u.bdDir,
          moveDirZ: 0,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 12.0,
          minGap: 2.5,
          priority: u.priority,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        const targetSpeed = u.cruiseSpeed * factor;
        braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;
        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        u.x += u.bdDir * u.speed * dt;
        u.z = laneZ;
        u.yaw = u.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;

        if (u.dir < 0) {
          // Exiting Sơn Tây Ngã 3 along Bạch Đằng until Ngã 3 DIOR -> curve Southbound down Đại Lộ Paris (DIOR) or wrap
          if (u.bdDir > 0 && u.x >= 489.0 && u.x <= 496.0) {
            u.tPhase = 'turn_bd_to_dior';
            u.turnT = 0;
            u.laneCoord = u.kind === 'car' ? 500.9 : 496.9;
            u.dir = 1;
          } else if ((u.bdDir > 0 && u.x > 532.0) || (u.bdDir < 0 && u.x < 288.0)) {
            const nextLaneX = u.kind === 'car' ? 372.1 : 376.1;
            if (
              this.coordinator.isZoneClear({
                id: u.id,
                x: nextLaneX,
                y: -0.26,
                z: 418.0,
                halfX: u.halfW + 0.5,
                halfZ: u.halfL + 2.5,
              })
            ) {
              u.tPhase = 'ns';
              u.laneCoord = nextLaneX;
              u.x = nextLaneX;
              u.z = 418.0;
              u.yaw = Math.PI;
            } else {
              u.x = u.bdDir > 0 ? 532.0 : 288.0;
              u.speed = 0;
            }
          }
        } else {
          // Southbound vehicle approaching Sơn Tây Ngã 3 OR Ngã 3 DIOR along Bạch Đằng -> turn smoothly South!
          if ((u.bdDir > 0 && u.x >= 356.5 && u.x <= 363.5) || (u.bdDir < 0 && u.x <= 383.5 && u.x >= 376.5)) {
            u.tPhase = 'turn_from_bd';
            u.turnT = 0;
            u.laneCoord = u.kind === 'car' ? 367.9 : 363.9;
            u.x = u.bdDir > 0 ? 356.5 : 383.5;
          } else if (u.bdDir < 0 && u.x <= 516.5 && u.x >= 509.5) {
            u.tPhase = 'turn_bd_to_dior';
            u.turnT = 0;
            u.laneCoord = u.kind === 'car' ? 500.9 : 496.9;
          }
        }
      } else if (u.tPhase === 'turn_from_bd') {
        // turn_from_bd -> curve smoothly onto Sơn Tây Bắc Southbound (laneCoord, Z = -105.0)
        const startX = u.bdDir > 0 ? 356.5 : 383.5;
        const startZ = u.bdDir > 0 ? -113.4 : -121.6;
        const endX = u.laneCoord;
        const endZ = -105.0;
        u.turnT = Math.min(1, u.turnT + dt * 0.65);
        const t = u.turnT;
        const inv = 1 - t;
        u.x = inv * inv * startX + 2 * inv * t * endX + t * t * endX;
        u.z = inv * inv * startZ + 2 * inv * t * startZ + t * t * endZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.001) u.yaw = Math.atan2(dx, dz);
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.tPhase = 'ns';
          u.x = endX;
          u.z = endZ;
          u.yaw = 0;
          u.speed = u.cruiseSpeed;
        }
      } else if (u.tPhase === 'turn_dior_to_bd') {
        const endZ = u.bdDir > 0 ? -113.4 : -121.6;
        const endX = u.bdDir > 0 ? 516.5 : 489.5;
        const startX = u.laneCoord;
        const startZ = -105.0;
        u.turnT = Math.min(1, u.turnT + dt * 0.65);
        const t = u.turnT;
        const inv = 1 - t;
        u.x = inv * inv * startX + 2 * inv * t * startX + t * t * endX;
        u.z = inv * inv * startZ + 2 * inv * t * endZ + t * t * endZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.001) u.yaw = Math.atan2(dx, dz);
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.tPhase = 'bd';
          u.x = endX;
          u.z = endZ;
          u.yaw = u.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          u.speed = u.cruiseSpeed;
        }
      } else if (u.tPhase === 'turn_bd_to_dior') {
        const startX = u.bdDir > 0 ? 489.5 : 516.5;
        const startZ = u.bdDir > 0 ? -113.4 : -121.6;
        const endX = u.kind === 'car' ? 500.9 : 496.9;
        const endZ = -105.0;
        u.turnT = Math.min(1, u.turnT + dt * 0.65);
        const t = u.turnT;
        const inv = 1 - t;
        u.x = inv * inv * startX + 2 * inv * t * endX + t * t * endX;
        u.z = inv * inv * startZ + 2 * inv * t * startZ + t * t * endZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.001) u.yaw = Math.atan2(dx, dz);
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.tPhase = 'dior_ns';
          u.dir = 1;
          u.laneCoord = endX;
          u.x = endX;
          u.z = endZ;
          u.yaw = 0;
          u.speed = u.cruiseSpeed;
        }
      } else {
        // Ngã Tư DIOR North-South Avenue connecting cleanly through Ngã 3 Bạch Đằng - DIOR and South into Vinhomes Ocean Park 3 (Z = -105 .. +420, Center X = 503.0)
        const dSig = this.getDiorSignalState ? this.getDiorSignalState() : sig;
        const evalDiorNsStop = (
          centerZ: number,
          northStopZ: number,
          southStopZ: number,
          intSig: IntersectionSignalState
        ) => {
          const distToStop = u.dir > 0 ? northStopZ - (u.z + u.halfL) : u.z - u.halfL - southStopZ;
          if (intSig.nsPhase === 'green') {
            if (
              distToStop >= -0.35 &&
              distToStop <= 5.5 &&
              !this.coordinator.isIntersectionBoxClearForAxis({
                id: u.id,
                centerX: DIOR_INTERSECTION_CENTER_X,
                centerZ,
                axis: 'ns',
              })
            ) {
              return distToStop <= 1.5 ? 0 : Math.max(0.08, (distToStop - 1.5) / 4.0);
            }
          } else {
            const allowYellowClear = intSig.nsPhase === 'yellow' && distToStop < 1.2;
            if (!allowYellowClear && distToStop >= -0.35 && distToStop <= 16.0) {
              return distToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (distToStop - 1.25) / 14.75));
            }
          }
          return 1.0;
        };

        let signalSlowFactor = evalDiorNsStop(FAR_EAST_INTERSECTION_CENTER_Z, 14.8, 43.2, dSig);
        if (this.getVinhomes3SignalState) {
          const vh3Sig = this.getVinhomes3SignalState();
          signalSlowFactor = Math.min(
            signalSlowFactor,
            evalDiorNsStop(148.0, 134.4, 161.6, vh3Sig),
            evalDiorNsStop(344.0, 330.4, 357.6, vh3Sig)
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
        if (this.coordinator.isJamBypassActive(u.id)) {
          signalSlowFactor = 1.0;
        }

        const factor = clr.blocked ? 0 : Math.min(signalSlowFactor, clr.maxSpeedFactor);
        const targetSpeed = u.cruiseSpeed * factor;
        braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;

        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        u.z += u.dir * u.speed * dt;
        u.x = u.laneCoord;
        u.yaw = u.dir > 0 ? 0 : Math.PI;

        if (u.dir > 0 && u.z > 420.0) {
          // Wrap Southbound vehicle onto Đường Bạch Đằng so it approaches and turns South at Ngã 3 DIOR or Sơn Tây!
          if (
            this.coordinator.isZoneClear({
              id: u.id,
              x: 532.0,
              y: -0.26,
              z: -121.6,
              halfX: u.halfL + 2.0,
              halfZ: u.halfW + 0.5,
            })
          ) {
            u.bdDir = -1;
            u.tPhase = 'bd';
            u.x = 532.0;
            u.z = -121.6;
            u.yaw = -Math.PI / 2;
          } else {
            u.z = 420.0;
            u.speed = 0;
          }
        } else if (u.dir < 0 && u.z <= -105.0) {
          // Reach Ngã 3 Bạch Đằng - DIOR -> curve smoothly onto Đường Bạch Đằng Westbound toward Sơn Tây & Sông Hàn!
          u.tPhase = 'turn_dior_to_bd';
          u.turnT = 0;
          u.bdDir = -1;
          u.z = -105.0;
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
    }

    // 2. Update Crosswalk Pedestrians
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
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
