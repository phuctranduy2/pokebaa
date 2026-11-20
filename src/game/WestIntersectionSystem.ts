import * as THREE from 'three';
import { CITY_ROAD_BOUNDS, type CityTrafficCoordinator } from './CityTrafficCoordinator';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { buildAmbientXanhSmTaxiCar } from './XanhSmTaxiSystem';

export interface IntersectionColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floor?: number | 'both';
}

export interface IntersectionSignalState {
  ewPhase: 'green' | 'yellow' | 'red';
  nsPhase: 'green' | 'yellow' | 'red';
}

export interface WestIntersectionBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  getSignalState: () => IntersectionSignalState;
  update: (delta: number) => void;
}

// Intersection center at (X = -227.5, Z = 29.0)
export const INTERSECTION_CENTER_X = -227.5;
export const INTERSECTION_CENTER_Z = 29.0;
export const NS_ROAD_MIN_X = -235.7;
export const NS_ROAD_MAX_X = -219.3;

export const WEST_INTERSECTION_COLLIDERS: IntersectionColliderBox[] = [
  // Far-West mouth at X = -965..-960 is now WIDE OPEN into Ngã 3 Ven Biển & Đường Ven Biển Võ Nguyên Giáp!
  // NW Corner Setback & City Block Edge (Open X = -960.0..-362.0 for Expanded Phố Cư Dân Tây, X = -361.6..-342.4 for Cyber Stadium & X = -342..-241 for Night Food Court; opens East into Đại Lộ Bệnh Viện at Bắc 1 Z=-26..-18, Bắc 2 Z=-64..-56 & Bắc 3 Z=-102..-94!)
  { minX: -242.0, maxX: -241.0, minZ: -134.0, maxZ: -102.0, floor: 1 },
  { minX: -242.0, maxX: -241.0, minZ: -94.0, maxZ: -64.0, floor: 1 },
  { minX: -242.0, maxX: -241.0, minZ: -56.0, maxZ: -26.0, floor: 1 },
  // SW Corner Setback & City Block Edge (Open X = -960..-426 for Khu Dân Cư Nam Tây, X = -425..-363 for Snack Alley & FAHASA, X = -361..-305 for Trường THPT Phan Châu Trinh & X = -302..-241 for Hospital Campus!)
  { minX: -363.0, maxX: -361.0, minZ: 42.2, maxZ: 43.2, floor: 1 },
  { minX: -305.0, maxX: -302.0, minZ: 42.2, maxZ: 43.2, floor: 1 },
  // NE Corner Avenue Verge Wall (separating Police Station & Grand Park West perimeter from North Avenue East sidewalk; open Z=-70.6..-63.4 for Grand Park West Koi Bridge Gate!)
  { minX: -214.2, maxX: -213.2, minZ: -104.0, maxZ: -70.6, floor: 1 },
  { minX: -214.2, maxX: -213.2, minZ: -63.4, maxZ: 15.4, floor: 1 },
  // SE Corner Avenue Verge Wall (separating RON Football West fence from South Avenue East sidewalk; opens East at Z>=88 into Khu Dân Cư Nam Bệnh Viện!)
  { minX: -214.2, maxX: -213.2, minZ: 42.5, maxZ: 88.0, floor: 1 },
  // 4 Traffic Light Gantry Corner Poles
  { minX: -218.8, maxX: -217.8, minZ: 19.3, maxZ: 20.3, floor: 1 }, // NE Pole
  { minX: -218.8, maxX: -217.8, minZ: 37.7, maxZ: 38.7, floor: 1 }, // SE Pole
  { minX: -237.2, maxX: -236.2, minZ: 37.7, maxZ: 38.7, floor: 1 }, // SW Pole
  { minX: -237.2, maxX: -236.2, minZ: 19.3, maxZ: 20.3, floor: 1 }, // NW Pole
];

function createTurnArrowTex(type: 'straight' | 'straight_left' | 'straight_right'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.fillStyle = '#f8fafc';
  // Straight arrow shaft (+Y is forward in canvas before rotation)
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

function createIntersectionSignTex(title: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText(title, 256, 58);
  ctx.fillStyle = '#fde047';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(sub, 256, 114);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 249, 214, 0.86)');
  grad.addColorStop(0.35, 'rgba(253, 224, 118, 0.48)');
  grad.addColorStop(0.7, 'rgba(251, 180, 62, 0.18)');
  grad.addColorStop(1, 'rgba(251, 180, 62, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWestIntersectionStructure(): WestIntersectionBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];

  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.9 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.75, metalness: 0.1 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.95 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const yellowMedianMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const poleDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.4 });

  // =========================================================================
  // PART 1: 4-WAY ASPHALT ROADS (CONNECTED SEAMLESSLY AT X = -214.0)
  // =========================================================================
  // 1A. West Extension of Main East-West Boulevard (X = -965 .. -214, Z = 20.6 .. 37.4)
  const ewWestRoad = new THREE.Mesh(new THREE.PlaneGeometry(751.0, 16.8), asphaltMat);
  ewWestRoad.rotation.x = -Math.PI / 2;
  ewWestRoad.position.set(-589.5, -0.26, INTERSECTION_CENTER_Z);
  staticGroup.add(ewWestRoad);

  // 1B. North & South Cross Avenue (X = -235.9 .. -219.1, joins Đường Bạch Đằng flush at Z = -109.1)
  const nsNorthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 129.7), asphaltMat);
  nsNorthRoad.rotation.x = -Math.PI / 2;
  nsNorthRoad.position.set(INTERSECTION_CENTER_X, -0.26, -44.25);
  staticGroup.add(nsNorthRoad);

  const nsSouthRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 315.0), asphaltMat);
  nsSouthRoad.rotation.x = -Math.PI / 2;
  nsSouthRoad.position.set(INTERSECTION_CENTER_X, -0.26, 194.9);
  staticGroup.add(nsSouthRoad);

  // =========================================================================
  // PART 2: 4-CORNER SIDEWALKS & GRANITE CURBS (FLUSH AT Y = 0.0)
  // =========================================================================
  const addSidewalkSlab = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), sidewalkMat);
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

  // NE Corner Sidewalk (connects north cleanly to Bạch Đằng south sidewalk at Z = -109.1)
  addSidewalkSlab(-219.3, -214.0, -109.1, 20.80);
  addCurbBar(-219.42, -219.18, -109.1, 20.92);
  addCurbBar(-219.3, -214.0, 20.68, 20.92);

  // SE Corner Sidewalk (connects to existing South sidewalk at X = -214.0, Z = 37.20..42.50, split cleanly around Đông BV 1 [104..112], Nam 2 [148..156], Nam 3 [194..202], Nam 4 [240..248], Nam 5 [290..298], & 16m Nam 6 [336..352]!)
  addSidewalkSlab(-219.3, -214.0, 37.20, 104.0);
  addSidewalkSlab(-219.3, -214.0, 112.0, 148.0);
  addSidewalkSlab(-219.3, -214.0, 156.0, 194.0);
  addSidewalkSlab(-219.3, -214.0, 202.0, 240.0);
  addSidewalkSlab(-219.3, -214.0, 248.0, 290.0);
  addSidewalkSlab(-219.3, -214.0, 298.0, 336.0);
  addCurbBar(-219.42, -219.18, 37.08, 104.0);
  addCurbBar(-219.42, -219.18, 112.0, 148.0);
  addCurbBar(-219.42, -219.18, 156.0, 194.0);
  addCurbBar(-219.42, -219.18, 202.0, 240.0);
  addCurbBar(-219.42, -219.18, 248.0, 290.0);
  addCurbBar(-219.42, -219.18, 298.0, 336.0);
  addCurbBar(-219.3, -214.0, 37.08, 37.32);
  // Flush sloped East asphalt aprons seamlessly joining Đại Lộ Bệnh Viện (Y=-0.26) up to East Residential Inner Roads (Y=+0.035)
  const eastInnerApronSlopeZ = Math.atan2(0.295, 5.3);
  [
    { z: 108.0, d: 8.0 },
    { z: 152.0, d: 8.0 },
    { z: 198.0, d: 8.0 },
    { z: 244.0, d: 8.0 },
    { z: 294.0, d: 8.0 },
    { z: 344.0, d: 16.0 },
  ].forEach(({ z: aprZ, d: aprD }) => {
    const eastInnerApron = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.26, aprD), asphaltMat);
    eastInnerApron.position.set(-216.65, -0.2425, aprZ);
    eastInnerApron.rotation.z = eastInnerApronSlopeZ;
    staticGroup.add(eastInnerApron);
  });

  // NW Corner Sidewalk (extends north to Bạch Đằng at Z=-125.9, with flush curb cuts & aprons for Bắc 1/2/3 and all 9 Row N1 alleys!)
  const addSegmentedSidewalkAndCurb = (
    minX: number,
    maxX: number,
    slabMinZ: number,
    slabMaxZ: number,
    curbMinZ: number,
    curbMaxZ: number,
    cutouts: Array<[number, number]>
  ) => {
    const sorted = [...cutouts].sort((a, b) => a[0] - b[0]);
    let cursor = minX;
    for (const [cMin, cMax] of sorted) {
      if (cMin > cursor + 0.05) {
        addSidewalkSlab(cursor, cMin, slabMinZ, slabMaxZ);
        addCurbBar(cursor, cMin, curbMinZ, curbMaxZ);
      }
      cursor = Math.max(cursor, cMax);
    }
    if (maxX > cursor + 0.05) {
      addSidewalkSlab(cursor, maxX, slabMinZ, slabMaxZ);
      addCurbBar(cursor, maxX, curbMinZ, curbMaxZ);
    }
  };
  const northAlleyCutouts: Array<[number, number]> = [
    [-922.0, -916.0],
    [-860.0, -854.0],
    [-798.0, -792.0],
    [-736.0, -730.0],
    [-674.6, -668.6],
    [-612.6, -606.6],
    [-550.4, -544.4],
    [-488.6, -482.6],
    [-396.4, -390.8],
  ];
  const southAlleyCutouts: Array<[number, number]> = [
    [-922.0, -916.0],
    [-860.0, -854.0],
    [-798.0, -792.0],
    [-736.0, -730.0],
    [-674.6, -668.6],
    [-612.6, -606.6],
    [-550.4, -544.4],
    [-488.6, -482.6],
    [-434.0, -426.0],
  ];

  // Inner North pedestrian strip (Z = 15.58..18.60) + outer curb strip (Z = 18.60..20.80) split cleanly around all 9 N1 alley ramps
  addSidewalkSlab(-965.0, -262.0, 15.58, 18.60);
  addSegmentedSidewalkAndCurb(-965.0, -262.0, 18.60, 20.80, 20.68, 20.92, northAlleyCutouts);
  addSidewalkSlab(-244.0, -235.7, 15.58, 20.80);
  addSidewalkSlab(-241.0, -235.7, -125.9, -102.0);
  addSidewalkSlab(-241.0, -235.7, -94.0, -64.0);
  addSidewalkSlab(-241.0, -235.7, -56.0, -26.0);
  addSidewalkSlab(-241.0, -235.7, -18.0, 15.58);
  addCurbBar(-244.0, -235.7, 20.68, 20.92);
  addCurbBar(-235.82, -235.58, -125.9, -102.0);
  addCurbBar(-235.82, -235.58, -94.0, -64.0);
  addCurbBar(-235.82, -235.58, -56.0, -26.0);
  addCurbBar(-235.82, -235.58, -18.0, 20.92);
  // Flush sloped asphalt aprons seamlessly joining Đường Nội Khu Bắc 1 (Z=-22), Bắc 2 (Z=-60) & Bắc 3 (Z=-98) at Y=+0.035 down to Đại Lộ Bệnh Viện at Y=-0.26
  const innerApronSlopeZ = -Math.atan2(0.295, 5.3);
  [-22.0, -60.0, -98.0].forEach((aprZ) => {
    const northInnerApron = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.26, 8.0), asphaltMat);
    northInnerApron.position.set(-238.35, -0.2425, aprZ);
    northInnerApron.rotation.z = innerApronSlopeZ;
    staticGroup.add(northInnerApron);
  });
  // Sloped asphalt driveway apron into the Hospital Opposite Pick-Up & Drop-Off Lay-by (X=-262..-244)
  const laybyApron = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.25, 5.22), asphaltMat);
  laybyApron.position.set(-253.0, -0.25, 18.2);
  laybyApron.rotation.x = 0.048;
  staticGroup.add(laybyApron);

  // SW Corner Sidewalk (South of West boulevard + West of South Avenue, split cleanly around all 8 Row S1 alleys, the 8m South Connector Road [-434..-426], & driveway Z=96.5..104.5)
  addSidewalkSlab(-965.0, -434.0, 39.40, 42.50);
  addSidewalkSlab(-426.0, -235.7, 39.40, 42.50);
  addSegmentedSidewalkAndCurb(-965.0, -235.7, 37.20, 39.40, 37.08, 37.32, southAlleyCutouts);
  addSidewalkSlab(-241.0, -235.7, 42.50, 96.50);
  addSidewalkSlab(-241.0, -235.7, 104.50, 148.0);
  addSidewalkSlab(-241.0, -235.7, 156.0, 194.0);
  addSidewalkSlab(-241.0, -235.7, 202.0, 240.0);
  addSidewalkSlab(-241.0, -235.7, 248.0, 290.0);
  addSidewalkSlab(-241.0, -235.7, 298.0, 336.0);
  addCurbBar(-235.82, -235.58, 37.08, 96.50);
  addCurbBar(-235.82, -235.58, 104.50, 148.0);
  addCurbBar(-235.82, -235.58, 156.0, 194.0);
  addCurbBar(-235.82, -235.58, 202.0, 240.0);
  addCurbBar(-235.82, -235.58, 248.0, 290.0);
  addCurbBar(-235.82, -235.58, 298.0, 336.0);
  // Flush sloped asphalt driveway apron connecting South Avenue (-235.7, Y=-0.26) to Hospital Rear Parking Lot (-241.0, Y=0.0)
  const rearLotApron = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.26, 8.0), asphaltMat);
  rearLotApron.position.set(-238.35, -0.26, 100.5);
  rearLotApron.rotation.z = -Math.atan2(0.26, 5.3);
  staticGroup.add(rearLotApron);
  // Flush sloped West asphalt aprons seamlessly joining Đường Nội Khu Nam 2 (Z=152), Nam 3 (Z=198), Nam 4 (Z=244), Nam 5 (Z=294), & 16m Nam 6 (Z=344)
  [
    { z: 152.0, d: 8.0 },
    { z: 198.0, d: 8.0 },
    { z: 244.0, d: 8.0 },
    { z: 294.0, d: 8.0 },
    { z: 344.0, d: 16.0 },
  ].forEach(({ z: aprZ, d: aprD }) => {
    const westSouthApron = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.26, aprD), asphaltMat);
    westSouthApron.position.set(-238.35, -0.2425, aprZ);
    westSouthApron.rotation.z = innerApronSlopeZ;
    staticGroup.add(westSouthApron);
  });

  // =========================================================================
  // PART 3: ROAD MARKINGS, CROSSWALKS, STOP LINES & LANE ARROWS
  // =========================================================================
  const addStripe = (x: number, z: number, w: number, d: number, mat: THREE.Material, y = -0.25) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    staticGroup.add(m);
  };

  // West Boulevard Markings (X = -965 .. -241.0)
  const westLegLen = 724.0;
  const westLegMidX = -603.0;
  [-0.14, 0.14].forEach((off) => addStripe(westLegMidX, INTERSECTION_CENTER_Z + off, westLegLen, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(westLegMidX, INTERSECTION_CENTER_Z + dir * 7.75, westLegLen, 0.16, stripeMat));
  for (let x = -961; x <= -245; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(x, INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }
  // Residential Pedestrian Crosswalks linking Phố Cư Dân Tây North <-> South ("bên kia đường")
  [-393.6, -485.6, -547.4, -609.6, -671.6, -733.0, -795.0, -857.0, -919.0].forEach((cx) => {
    for (let z = 21.8; z <= 36.2; z += 1.05) {
      addStripe(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // North Avenue Markings (Z = -105.0 .. +15.4, stopping cleanly before Bạch Đằng corner crosswalk)
  const nLen = 120.4;
  const nMidZ = -44.8;
  [-0.14, 0.14].forEach((off) => addStripe(INTERSECTION_CENTER_X + off, nMidZ, 0.12, nLen, yellowMedianMat));
  [-1, 1].forEach((dir) => addStripe(INTERSECTION_CENTER_X + dir * 7.75, nMidZ, 0.16, nLen, stripeMat));
  for (let z = -102; z <= 12; z += 5.5) {
    [-4.1, 4.1].forEach((off) => addStripe(INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
  }

  // South Avenue Markings (Z = 42.6 .. 332.0, cleanly segmented around Nam 2, Nam 3, Nam 4, Nam 5, & Nam 6!)
  const southRoadMarkSpans: Array<[number, number]> = [
    [42.6, 142.0],
    [162.0, 188.0],
    [208.0, 234.0],
    [254.0, 284.0],
    [304.0, 330.0],
  ];
  southRoadMarkSpans.forEach(([zA, zB]) => {
    const segLen = zB - zA;
    const segMid = (zA + zB) * 0.5;
    [-0.14, 0.14].forEach((off) => addStripe(INTERSECTION_CENTER_X + off, segMid, 0.12, segLen, yellowMedianMat));
    [-1, 1].forEach((dir) => addStripe(INTERSECTION_CENTER_X + dir * 7.75, segMid, 0.16, segLen, stripeMat));
    for (let z = zA + 3.0; z <= zB - 2.0; z += 5.5) {
      [-4.1, 4.1].forEach((off) => addStripe(INTERSECTION_CENTER_X + off, z, 0.14, 2.4, stripeMat));
    }
  });
  // Residential Zebra Crosswalks framing Nam 2, Nam 3, Nam 4, Nam 5 & Đại Lộ Nam 6
  [145.0, 159.0, 191.0, 205.0, 237.0, 251.0, 287.0, 301.0, 333.0].forEach((cz) => {
    for (let x = -234.7; x <= -220.3; x += 1.05) {
      addStripe(x, cz, 0.52, 2.8, stripeMat, -0.248);
    }
  });

  // 4 Zebra Crosswalks framing the Intersection Box
  // East Crosswalk (X = -218.5 .. -214.9) & West Crosswalk (X = -240.1 .. -236.5)
  [-216.7, -238.3].forEach((cx) => {
    for (let z = 21.8; z <= 36.2; z += 1.05) {
      addStripe(cx, z, 3.2, 0.52, stripeMat, -0.248);
    }
  });
  // North Crosswalk (Z = 16.4 .. 20.0) & South Crosswalk (Z = 38.0 .. 41.6)
  [18.2, 39.8].forEach((cz) => {
    for (let x = -234.7; x <= -220.3; x += 1.05) {
      addStripe(x, cz, 0.52, 3.2, stripeMat, -0.248);
    }
  });

  // 4 White Approach Stop Lines
  addStripe(-214.0, 33.1, 0.42, 7.6, stripeMat, -0.247); // East leg (Westbound)
  addStripe(-241.0, 24.9, 0.42, 7.6, stripeMat, -0.247); // West leg (Eastbound)
  addStripe(-231.6, 15.4, 7.6, 0.42, stripeMat, -0.247); // North leg (Southbound)
  addStripe(-223.4, 42.6, 7.6, 0.42, stripeMat, -0.247); // South leg (Northbound)

  // Painted Lane Directional Arrows
  const straightTex = createTurnArrowTex('straight');
  const straightLeftTex = createTurnArrowTex('straight_left');
  const straightRightTex = createTurnArrowTex('straight_right');
  const addLaneArrow = (x: number, z: number, yaw: number, tex: THREE.CanvasTexture) => {
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.7), mat);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = yaw;
    mesh.position.set(x, -0.246, z);
    staticGroup.add(mesh);
  };
  // East approach (-X): yaw = +PI/2 points -X
  addLaneArrow(-209.5, 31.1, Math.PI / 2, straightLeftTex);
  addLaneArrow(-209.5, 34.8, Math.PI / 2, straightRightTex);
  // West approach (+X): yaw = -PI/2 points +X
  addLaneArrow(-245.5, 26.8, -Math.PI / 2, straightLeftTex);
  addLaneArrow(-245.5, 23.2, -Math.PI / 2, straightRightTex);
  // North approach (+Z): yaw = Math.PI points +Z
  addLaneArrow(-229.6, 11.2, Math.PI, straightLeftTex);
  addLaneArrow(-233.6, 11.2, Math.PI, straightRightTex);
  // South approach (-Z): yaw = 0 points -Z
  addLaneArrow(-225.4, 46.8, 0, straightLeftTex);
  addLaneArrow(-221.4, 46.8, 0, straightRightTex);
  // Extra straight arrows further down
  addLaneArrow(-262.0, 26.8, -Math.PI / 2, straightTex);
  addLaneArrow(-221.4, 62.0, 0, straightTex);
  addLaneArrow(-233.6, -6.0, Math.PI, straightTex);

  // =========================================================================
  // PART 4: 4 SYNCHRONIZED TRAFFIC LIGHT GANTRIES (ANIMATED RED / YELLOW / GREEN)
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

    // Compact corner street-name blade mounted neatly beside the post (zero road intrusion!)
    const signBracket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), poleDarkMat);
    signBracket.position.set(0.45, 4.18, 0);
    grp.add(signBracket);

    const signTex = createIntersectionSignTex(streetSignTitle, streetSignSub);
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

    const createSignalHead = (hx: number, hy: number, hz: number, rotY: number, list: SignalLensGroup[]) => {
      const head = new THREE.Group();
      head.position.set(hx, hy, hz);
      head.rotation.y = rotY;

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

    // Compact corner traffic signal head mounted cleanly on the corner mast
    const targetList = axisControlled === 'ew' ? ewLenses : nsLenses;
    const armStub = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.28), poleDarkMat);
    armStub.position.set(0, 3.48, 0.14);
    grp.add(armStub);
    createSignalHead(0, 3.48, 0.30, 0, targetList);

    // Pedestrian crossing signal box lower on the vertical post
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

  // NE Corner (-218.3, 19.8): arm points -X (rotY = Math.PI) -> local +Z is -Z... wait:
  // If rotY = Math.PI, local +X -> world -X, local +Z -> world -Z! Wait: we want local +Z facing East (+X) for Westbound traffic?
  // Let's check exact world directions:
  // - Westbound traffic travels -X (approaching from East X > -219), so signal lens should face +X (rotY = Math.PI / 2)!
  //   If gantry is at NE (-218.3, 19.8) and arm extends South (+Z over lanes Z=29..36), rotY = -Math.PI/2 makes local +X -> +Z, local +Z -> +X!
  //   Wait: at SE (-218.3, 38.2), arm extends North (-Z over Westbound lanes Z=31..35): rotY = +Math.PI/2 -> local +X is -Z, local +Z is +X (facing Westbound drivers)!
  // - Eastbound traffic travels +X (approaching from West X < -236), so signal lens should face -X (rotY = -Math.PI/2)!
  //   At NW (-236.7, 19.8), arm extends South (+Z over Eastbound lanes Z=23..27): rotY = -Math.PI/2 -> local +X is +Z, local +Z is -X (facing Eastbound drivers)!
  // - Southbound traffic travels +Z (approaching from North Z < 16), so signal lens should face -Z (rotY = Math.PI)!
  //   At NE (-218.3, 19.8), arm extends West (-X over Southbound lanes X=-233..-229... or NW (-236.7, 19.8) extends East):
  //   If NE (-218.3, 19.8) has rotY = Math.PI -> local +X is -X (arm goes West over lanes), local +Z is -Z (facing Northbound? Wait: local +Z rotated by Math.PI is -Z, which faces North toward Southbound drivers!) YES!
  // - Northbound traffic travels -Z (approaching from South Z > 42), so signal lens should face +Z (rotY = 0)!
  //   At SW (-236.7, 38.2), rotY = 0 -> local +X is +X (arm goes East over Northbound lanes), local +Z is +Z (facing Northbound drivers)!
  buildTrafficGantry(-218.3, 38.2, Math.PI / 2, 'ew', 'ĐẠI LỘ TRUNG TÂM', 'HƯỚNG TÂY ↔ ĐÔNG');
  buildTrafficGantry(-236.7, 19.8, -Math.PI / 2, 'ew', 'ĐẠI LỘ TRUNG TÂM', 'KHU ĐÔ THỊ MỚI');
  buildTrafficGantry(-218.3, 19.8, Math.PI, 'ns', 'ĐẠI LỘ BẮC - NAM', 'NGÃ TƯ CÔNG AN');
  buildTrafficGantry(-236.7, 38.2, 0, 'ns', 'ĐẠI LỘ BẮC - NAM', 'KHU THỂ THAO RON');

  // =========================================================================
  // PART 5: STREETLAMPS, CORNER LANDSCAPING & URBAN CITY BLOCKS
  // =========================================================================
  const sharedLampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffe48f,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });
  lanternMats.push(sharedLampGlowMat);

  const lampGoldAccentMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.82 });
  const poolTex = createGlowPoolTex();
  const sharedPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedPoolMat);

  const sharedHaloMat = new THREE.MeshBasicMaterial({
    color: 0x6b5324,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedHaloMat);

  const addIntersectionLamp = (x: number, z: number, armDirX: number, armDirZ: number) => {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const yaw = Math.atan2(armDirX, armDirZ);
    grp.rotation.y = yaw;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.56, 10), poleDarkMat);
    base.position.y = 0.28;
    grp.add(base);

    const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.09, 10), lampGoldAccentMat);
    baseCollar.position.y = 0.58;
    grp.add(baseCollar);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.095, 5.15, 10), poleDarkMat);
    pole.position.y = 2.86;
    grp.add(pole);

    const topCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 10), lampGoldAccentMat);
    topCollar.position.y = 5.38;
    grp.add(topCollar);

    // Sleek outreach arm + diagonal support brace + modern LED cobra luminaire head
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 1.05, 8), poleDarkMat);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, 5.26, 0.5);
    grp.add(arm);

    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.68, 6), poleDarkMat);
    brace.rotation.x = Math.PI / 4;
    brace.position.set(0, 4.98, 0.26);
    grp.add(brace);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.72), poleDarkMat);
    hood.position.set(0, 5.32, 0.94);
    grp.add(hood);

    const ledPanel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.64), sharedLampGlowMat);
    ledPanel.position.set(0, 5.23, 0.94);
    grp.add(ledPanel);

    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), sharedLampGlowMat);
    lantern.scale.set(1.15, 0.72, 1.35);
    lantern.position.set(0, 5.14, 0.94);
    grp.add(lantern);

    // Warm additive night halo glow around luminaire head
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.76, 10, 8), sharedHaloMat);
    halo.position.set(0, 5.12, 0.94);
    grp.add(halo);

    // Generous bright warm additive ground pools on both sidewalk & asphalt
    const swPool = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 12.8), sharedPoolMat);
    swPool.rotation.x = -Math.PI / 2;
    swPool.position.set(0, 0.014, 0.25);
    grp.add(swPool);

    const rdPool = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 14.8), sharedPoolMat);
    rdPool.rotation.x = -Math.PI / 2;
    rdPool.position.set(0, -0.246, 1.25);
    grp.add(rdPool);

    staticGroup.add(grp);
  };

  // West Boulevard Lamps (carefully clear of Pick-Up Lay-by, school gate, AND every N1/S1 alley mouth!)
  [-242.5, -264.5, -288, -310, -338, -358, -382, -404, -422, -446, -470, -496, -520, -540, -566, -592, -622, -648, -680, -708, -725, -756, -780, -806, -830, -850, -876, -900, -928, -950].forEach((lx) => {
    addIntersectionLamp(lx, 20.25, 0, 1);
  });
  [-248, -268, -288, -308, -321, -344, -368, -386, -420, -446, -470, -496, -520, -540, -566, -592, -622, -648, -680, -708, -725, -756, -780, -806, -830, -850, -876, -900, -928, -950].forEach((lx) => {
    addIntersectionLamp(lx, 37.75, 0, -1);
  });
  // North Avenue Lamps (clear of Bắc 1, Bắc 2 & Bắc 3 inner street mouths at Z=-22, -60, -98)
  [4, -15, -40, -53, -84, -106].forEach((lz) => {
    addIntersectionLamp(-236.25, lz, 1, 0);
    addIntersectionLamp(-218.75, lz, -1, 0);
  });
  // South Avenue Lamps (continuing smoothly through Khu Dân Cư Nam Bệnh Viện down to Đại Lộ Nam 6 Z = 330)
  [52, 72, 92, 118, 138, 166, 186, 212, 232, 258, 280, 308, 328].forEach((lz) => {
    addIntersectionLamp(-236.25, lz, 1, 0);
    addIntersectionLamp(-218.75, lz, -1, 0);
  });

  // Corner Trees & Urban Cityscape Buildings framing the 4-way Intersection
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

  // Avenue Trees along SW, North & South green verges (safely clear of Hospital Campus & Khu Dân Cư Nam Bệnh Viện!)
  [-292, -299].forEach((tx) => {
    addTree(tx, 44.5, 1.0);
  });
  [-8, -30, -44, -52, -84, -108].forEach((tz) => {
    addTree(-243.5, tz, 1.05);
  });
  [68, 86].forEach((tz) => {
    addTree(-242.8, tz, 1.0);
  });
  [50, 68].forEach((tz) => {
    addTree(-211.5, tz, 0.95);
  });

  // Stylized Modern Urban Buildings framing Far-West Quadrant beyond Mega Phố Cư Dân Tây
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

    // Horizontal architectural window bands
    const floors = Math.max(2, Math.floor(h / 4.2));
    for (let f = 1; f < floors; f++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.9, d + 0.08), windowGlowMat);
      band.position.set(x, f * 4.0, z);
      staticGroup.add(band);
    }
  };

  // Old far-west backdrop towers at X = -982 removed to open an unobstructed oceanfront horizon at Ngã 3 Ven Biển!
  // Old white anchor tower at (-227.5, 124.0) removed — replaced by full Khu Dân Cư Nam Bệnh Viện!

  // =========================================================================
  // PART 6: TRAFFIC LIGHT PHASE STATE MACHINE (with 1.5s All-Red Clearance)
  // =========================================================================
  // Cycle = 18.0s: [0..6.5) EW Green, [6.5..8.0) EW Yellow, [8.0..9.5) All-Red,
  //                [9.5..15.0) NS Green, [15.0..16.5) NS Yellow, [16.5..18.0) All-Red
  let cycleTimer = 0.5;
  let ewPhase: 'green' | 'yellow' | 'red' = 'green';
  let nsPhase: 'green' | 'yellow' | 'red' = 'red';

  const applyLensState = (list: SignalLensGroup[], phase: 'green' | 'yellow' | 'red') => {
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      g.red.emissiveIntensity = phase === 'red' ? 2.1 : 0.06;
      g.yellow.emissiveIntensity = phase === 'yellow' ? 2.1 : 0.06;
      g.green.emissiveIntensity = phase === 'green' ? 2.1 : 0.06;
    }
  };

  const update = (delta: number) => {
    cycleTimer = (cycleTimer + Math.min(delta, 0.1)) % 18.0;
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
  };

  update(0);

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    getSignalState: () => ({ ewPhase, nsPhase }),
    update,
  };
}

// ==========================================
// NORTH-SOUTH CROSS AVENUE TRAFFIC CONTROLLER
// ==========================================

interface CrossVehicleUnit {
  id: string;
  kind: 'car' | 'motorbike';
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  halfW: number;
  halfL: number;
  wheelR: number;
  mode: 'cruise_ns' | 'cruise_bd' | 'turn_curve' | 'u_turn_south' | 'u_turn_bd';
  dirZ: 1 | -1; // +1 = Southbound, -1 = Northbound
  dirX: 1 | -1; // +1 = Eastbound, -1 = Westbound on Bạch Đằng
  laneX: number;
  laneZ: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  cruiseSpeed: number;
  priority: number;
  turnStartX: number;
  turnStartZ: number;
  turnCtrlX: number;
  turnCtrlZ: number;
  turnEndX: number;
  turnEndZ: number;
  turnT: number;
  turnDuration: number;
  turnNextMode: 'cruise_ns' | 'cruise_bd';
  turnNextDirX: 1 | -1;
  turnNextDirZ: 1 | -1;
  turnNextLane: number;
}

function buildCrossSedan(colorHex: number, variant: CityCarVariant = 'sedan'): {
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

function buildCrossMotorbike(
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

export class WestIntersectionTrafficController {
  public readonly rootGroup = new THREE.Group();
  private readonly coordinator: CityTrafficCoordinator;
  private readonly getSignalState: () => IntersectionSignalState;
  private readonly units: CrossVehicleUnit[] = [];

  constructor(
    coordinator: CityTrafficCoordinator,
    getSignalState: () => IntersectionSignalState
  ) {
    this.coordinator = coordinator;
    this.getSignalState = getSignalState;
    this.rootGroup.userData.noMerge = true;
    this.buildVehicles();
  }

  private buildVehicles() {
    const specs: Array<{
      id: string;
      kind: 'car' | 'motorbike';
      color: number;
      xanhSm?: { variant: 'vfe34' | 'vf5'; plate: string };
      dirZ: 1 | -1;
      laneX: number;
      z: number;
      speed: number;
    }> = [
      { id: 'ns_car_1', kind: 'car', color: 0x0ea5e9, dirZ: 1, laneX: -229.6, z: -48.0, speed: 9.8 },
      { id: 'ns_xanhsm_1', kind: 'car', color: 0x00b6be, xanhSm: { variant: 'vfe34', plate: '43H-886.31' }, dirZ: 1, laneX: -229.6, z: -86.0, speed: 9.4 },
      { id: 'ns_car_2', kind: 'car', color: 0xe11d48, dirZ: -1, laneX: -225.4, z: 78.0, speed: 9.5 },
      { id: 'ns_xanhsm_2', kind: 'car', color: 0x00b6be, xanhSm: { variant: 'vf5', plate: '43H-886.32' }, dirZ: -1, laneX: -225.4, z: 4.0, speed: 9.2 },
      { id: 'ns_moto_1', kind: 'motorbike', color: 0xe2e8f0, dirZ: 1, laneX: -233.6, z: -16.0, speed: 10.8 },
      { id: 'ns_moto_2', kind: 'motorbike', color: 0xf472b6, dirZ: -1, laneX: -221.4, z: 54.0, speed: 10.6 },
      { id: 'ns_moto_3', kind: 'motorbike', color: 0x16a34a, dirZ: 1, laneX: -233.6, z: -72.0, speed: 10.4 },
      { id: 'ns_moto_4', kind: 'motorbike', color: 0x06b6d4, dirZ: -1, laneX: -221.4, z: -56.0, speed: 10.9 },
      { id: 'ns_moto_5', kind: 'motorbike', color: 0xdc2626, dirZ: 1, laneX: -233.6, z: 48.0, speed: 11.1 },
      { id: 'ns_moto_6', kind: 'motorbike', color: 0xfacc15, dirZ: -1, laneX: -221.4, z: 8.0, speed: 10.3 },
      { id: 'ns_moto_7', kind: 'motorbike', color: 0x2563eb, dirZ: 1, laneX: -233.6, z: -96.0, speed: 10.7 },
      { id: 'ns_moto_8', kind: 'motorbike', color: 0xf97316, dirZ: -1, laneX: -221.4, z: 84.0, speed: 10.5 },
      { id: 'ns_moto_9', kind: 'motorbike', color: 0x10b981, dirZ: 1, laneX: -233.6, z: -42.0, speed: 10.2 },
      { id: 'ns_moto_10', kind: 'motorbike', color: 0xf8fafc, dirZ: -1, laneX: -221.4, z: -22.0, speed: 11.0 },
      { id: 'ns_moto_11', kind: 'motorbike', color: 0xa855f7, dirZ: 1, laneX: -233.6, z: 74.0, speed: 10.6 },
      { id: 'ns_moto_12', kind: 'motorbike', color: 0x0ea5e9, dirZ: -1, laneX: -221.4, z: -86.0, speed: 10.8 },
    ];

    const carVariants: CityCarVariant[] = ['coupe', 'suv'];
    const helmetPalette = [0x18181b, 0xf472b6, 0x16a34a, 0x06b6d4, 0xf8fafc, 0x0284c7];
    const jacketPalette = [0xc2a888, 0xd1d5db, 0x15803d, 0x0891b2, 0x1e293b, 0x334155];
    const pHelmetPalette = [0xdc2626, 0xf8fafc, 0x18181b, 0xf472b6];
    const pJacketPalette = [0xe8b4cb, 0x0f766e, 0x475569, 0xfecdd3];
    let carIdx = 0;
    let motoIdx = 0;

    specs.forEach((s) => {
      let built: ReturnType<typeof buildCrossSedan>;
      if (s.kind === 'car') {
        built = s.xanhSm
          ? buildAmbientXanhSmTaxiCar(s.xanhSm.variant, s.xanhSm.plate, true)
          : buildCrossSedan(s.color, carVariants[carIdx++ % carVariants.length]);
      } else {
        const idx = motoIdx++;
        const hasPassenger = idx % 2 === 0;
        built = buildCrossMotorbike(
          s.color,
          helmetPalette[idx % helmetPalette.length],
          jacketPalette[idx % jacketPalette.length],
          false,
          hasPassenger,
          pHelmetPalette[idx % pHelmetPalette.length],
          pJacketPalette[idx % pJacketPalette.length]
        );
      }
      const yaw = s.dirZ > 0 ? 0 : Math.PI;
      built.group.position.set(s.laneX, -0.26, s.z);
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
        mode: 'cruise_ns',
        dirZ: s.dirZ,
        dirX: 1,
        laneX: s.laneX,
        laneZ: s.kind === 'car' ? CITY_ROAD_BOUNDS.bachDangEBZ : -111.0,
        x: s.laneX,
        z: s.z,
        yaw,
        speed: s.speed,
        cruiseSpeed: s.speed,
        priority: s.kind === 'car' ? 2 : 1,
        turnStartX: s.laneX,
        turnStartZ: s.z,
        turnCtrlX: s.laneX,
        turnCtrlZ: s.z,
        turnEndX: s.laneX,
        turnEndZ: s.z,
        turnT: 0,
        turnDuration: 1.2,
        turnNextMode: 'cruise_ns',
        turnNextDirX: 1,
        turnNextDirZ: s.dirZ,
        turnNextLane: s.laneX,
      });
    });
  }

  public update(delta: number, lampFactor: number) {
    const dt = Math.min(delta, 0.08);
    const sig = this.getSignalState();
    const nsCanGo = sig.nsPhase === 'green';

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const prevX = u.x;
      const prevZ = u.z;
      const jamBypass = this.coordinator.isJamBypassActive(u.id);
      let braking = false;

      if (u.mode === 'turn_curve') {
        const fwdX = Math.sin(u.yaw);
        const fwdZ = Math.cos(u.yaw);
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 7.0,
          minGap: 1.6,
          priority: u.priority + 6,
        });
        const baseFactor = clr.blocked ? 0 : Math.max(0.25, clr.maxSpeedFactor);
        const factor = jamBypass ? Math.max(0.85, baseFactor) : baseFactor;
        braking = factor < 0.7;
        u.turnT = Math.min(1, u.turnT + (dt / u.turnDuration) * factor);
        const t = u.turnT;
        const omt = 1 - t;
        const nx = omt * omt * u.turnStartX + 2 * omt * t * u.turnCtrlX + t * t * u.turnEndX;
        const nz = omt * omt * u.turnStartZ + 2 * omt * t * u.turnCtrlZ + t * t * u.turnEndZ;
        const vx = (nx - u.x) / Math.max(dt, 0.001);
        const vz = (nz - u.z) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.25) {
          u.yaw = Math.atan2(vx, vz);
        }
        u.x = nx;
        u.z = nz;
        u.speed = Math.hypot(vx, vz);
        if (u.turnT >= 1) {
          u.mode = u.turnNextMode;
          u.dirX = u.turnNextDirX;
          u.dirZ = u.turnNextDirZ;
          if (u.mode === 'cruise_ns') {
            u.laneX = u.turnNextLane;
            u.yaw = u.dirZ > 0 ? 0 : Math.PI;
          } else {
            u.laneZ = u.turnNextLane;
            u.yaw = u.dirX > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
        }
      } else if (u.mode === 'u_turn_south') {
        const fwdX = Math.sin(u.yaw);
        const fwdZ = Math.cos(u.yaw);
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 6.5,
          minGap: 1.5,
          priority: u.priority + 6,
        });
        const factor = jamBypass ? 1 : clr.blocked ? 0 : Math.max(0.3, clr.maxSpeedFactor);
        braking = factor < 0.7;
        u.turnT = Math.min(1, u.turnT + dt * 0.72 * factor);
        const p = u.turnT;
        const nx = THREE.MathUtils.lerp(u.turnStartX, u.turnNextLane, 0.5 - 0.5 * Math.cos(p * Math.PI));
        const nz = u.turnStartZ + Math.sin(p * Math.PI) * 4.5;
        const vx = (nx - u.x) / Math.max(dt, 0.001);
        const vz = (nz - u.z) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.25) u.yaw = Math.atan2(vx, vz);
        u.x = nx;
        u.z = nz;
        u.speed = Math.hypot(vx, vz);
        if (u.turnT >= 1) {
          u.mode = 'cruise_ns';
          u.dirZ = -1;
          u.laneX = u.turnNextLane;
          u.x = u.laneX;
          u.yaw = Math.PI;
        }
      } else if (u.mode === 'u_turn_bd') {
        const fwdX = Math.sin(u.yaw);
        const fwdZ = Math.cos(u.yaw);
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 6.5,
          minGap: 1.5,
          priority: u.priority + 6,
        });
        const factor = jamBypass ? 1 : clr.blocked ? 0 : Math.max(0.3, clr.maxSpeedFactor);
        braking = factor < 0.7;
        u.turnT = Math.min(1, u.turnT + dt * 0.65 * factor);
        const p = u.turnT;
        const nx = u.turnStartX + Math.sin(p * Math.PI) * 4.8;
        const nz = THREE.MathUtils.lerp(u.turnStartZ, u.turnNextLane, 0.5 - 0.5 * Math.cos(p * Math.PI));
        const vx = (nx - u.x) / Math.max(dt, 0.001);
        const vz = (nz - u.z) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.25) u.yaw = Math.atan2(vx, vz);
        u.x = nx;
        u.z = nz;
        u.speed = Math.hypot(vx, vz);
        if (u.turnT >= 1) {
          u.mode = 'cruise_bd';
          u.dirX = -1;
          u.laneZ = u.turnNextLane;
          u.z = u.laneZ;
          u.yaw = -Math.PI / 2;
        }
      } else if (u.mode === 'cruise_bd') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: u.dirX,
          moveDirZ: 0,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 13.0,
          minGap: 2.6,
          priority: u.priority,
        });
        const factor = jamBypass ? 1 : clr.blocked ? 0 : clr.maxSpeedFactor;
        const targetSpeed = u.cruiseSpeed * factor;
        braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;
        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        u.x += u.dirX * u.speed * dt;
        u.z = THREE.MathUtils.lerp(u.z, u.laneZ, Math.min(1, dt * 4.0));
        u.yaw = u.dirX > 0 ? Math.PI / 2 : -Math.PI / 2;

        if (u.dirX > 0 && u.x >= -152.0) {
          // Smooth U-turn onto Westbound Đường Bạch Đằng back to Đại Lộ Bệnh Viện
          u.mode = 'u_turn_bd';
          u.turnT = 0;
          u.turnStartX = u.x;
          u.turnStartZ = u.z;
          u.turnNextLane = u.kind === 'car' ? CITY_ROAD_BOUNDS.bachDangWBZ : -124.0;
        } else if (u.dirX < 0 && u.x <= -214.0) {
          // Smooth left turn around the NW corner (-227.5, -117.5) back South onto Đại Lộ Bệnh Viện
          const sbLaneX = u.kind === 'car' ? -229.6 : -233.6;
          u.mode = 'turn_curve';
          u.turnT = 0;
          u.turnDuration = 1.45;
          u.turnStartX = u.x;
          u.turnStartZ = u.z;
          u.turnCtrlX = sbLaneX;
          u.turnCtrlZ = u.z;
          u.turnEndX = sbLaneX;
          u.turnEndZ = -102.0;
          u.turnNextMode = 'cruise_ns';
          u.turnNextDirX = -1;
          u.turnNextDirZ = 1;
          u.turnNextLane = sbLaneX;
        }
      } else {
        // cruise_ns on Đại Lộ Bệnh Viện
        let signalSlowFactor = 1.0;
        const distToStop = u.dirZ > 0 ? 14.8 - (u.z + u.halfL) : u.z - u.halfL - 43.2;
        if (nsCanGo) {
          if (
            distToStop >= -0.35 &&
            distToStop <= 5.5 &&
            !this.coordinator.isIntersectionBoxClearForAxis({
              id: u.id,
              centerX: INTERSECTION_CENTER_X,
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

        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: 0,
          moveDirZ: u.dirZ,
          halfW: u.halfW,
          halfL: u.halfL,
          lookahead: 14.0,
          minGap: 2.8,
          priority: u.priority,
        });

        if (jamBypass) {
          signalSlowFactor = 1.0;
        }

        const factor = clr.blocked ? 0 : Math.min(signalSlowFactor, clr.maxSpeedFactor);
        const targetSpeed = u.cruiseSpeed * factor;
        braking = targetSpeed < u.speed - 0.5 || targetSpeed < 0.2;

        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        u.z += u.dirZ * u.speed * dt;
        u.x = THREE.MathUtils.lerp(u.x, u.laneX, Math.min(1, dt * 4.0));
        u.yaw = u.dirZ > 0 ? 0 : Math.PI;

        if (u.dirZ < 0 && u.z <= -104.0) {
          // Smooth right turn onto Eastbound Đường Bạch Đằng at corner (-227.5, -117.5)
          const ebLaneZ = u.kind === 'car' ? CITY_ROAD_BOUNDS.bachDangEBZ : -111.0;
          u.mode = 'turn_curve';
          u.turnT = 0;
          u.turnDuration = 1.35;
          u.turnStartX = u.x;
          u.turnStartZ = u.z;
          u.turnCtrlX = u.x;
          u.turnCtrlZ = ebLaneZ;
          u.turnEndX = -212.0;
          u.turnEndZ = ebLaneZ;
          u.turnNextMode = 'cruise_bd';
          u.turnNextDirX = 1;
          u.turnNextDirZ = -1;
          u.turnNextLane = ebLaneZ;
        } else if (u.dirZ > 0 && u.z >= 332.0) {
          // Smooth U-turn at South end of Đại Lộ Bệnh Viện (Ngã Tư Nam 6) back onto Northbound lanes
          u.mode = 'u_turn_south';
          u.turnT = 0;
          u.turnStartX = u.x;
          u.turnStartZ = u.z;
          u.turnNextLane = u.kind === 'car' ? -225.4 : -221.4;
        }
      }

      u.group.position.set(u.x, -0.26, u.z);
      u.group.rotation.y = u.yaw;
      const moved = Math.hypot(u.x - prevX, u.z - prevZ);
      const spin = moved / Math.max(0.15, u.wheelR);
      for (let w = 0; w < u.wheels.length; w++) {
        u.wheels[w].rotation.x += spin;
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
  }
}
