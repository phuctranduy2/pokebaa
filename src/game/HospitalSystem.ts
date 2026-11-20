import * as THREE from 'three';
import {
  CITY_ROAD_BOUNDS,
  computeBoulevardSignalFactor,
  computeNorthSouthSignalFactor,
  DIOR_INTERSECTION_CENTER_X,
  EAST_INTERSECTION_CENTER_X,
  FAR_EAST_INTERSECTION_CENTER_X,
  WEST_INTERSECTION_CENTER_X,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import type { IntersectionColliderBox, IntersectionSignalState } from './WestIntersectionSystem';
import { buildCityCarMesh } from './CityVehicleMeshBuilder';
import {
  attachGlbHumanToNpc,
  type GlbHumanHandle,
} from './GlbHumanNpcSystem';
import {
  GUARD_NPC_MODEL,
  pickDoctorNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export const HOSPITAL_FLOOR_HEIGHT = 4.6;
export const HOSPITAL_FLOOR_COUNT = 5; // Floors 1..4 interior + Floor 5 Rooftop Helipad & Garden

export interface HospitalCharacterHelpers {
  createFaceTexture: (expression: 'happy' | 'neutral' | 'surprised', skinColor?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    w?: number,
    h?: number,
    d?: number
  ) => THREE.Mesh;
}

export interface HospitalScaledLight {
  light: THREE.PointLight;
  dayInt: number;
  nightInt: number;
  getScale: () => number;
}

export interface HospitalElevatorApi {
  readonly index: number;
  readonly x: number;
  readonly doorZ: number;
  readonly cabMinX: number;
  readonly cabMaxX: number;
  readonly cabMinZ: number;
  readonly cabMaxZ: number;
  readonly currentFloor: number; // 1..5
  readonly currentY: number;
  readonly targetFloor: number; // 1..5
  readonly doorOpen: number; // 0..1
  readonly state: 'idle' | 'door_opening' | 'boarding' | 'door_closing' | 'moving';
  callToFloor: (floor: number) => void;
  requestFloor: (floor: number) => void;
}

export interface HospitalBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  elevators: HospitalElevatorApi[];
  update: (
    delta: number,
    rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcNearRearDoor?: boolean
  ) => void;
}

// =========================================================================
// PER-FLOOR HOSPITAL COLLIDERS (FLOORS 1..5)
// Building Footprint: X = -296.0 .. -246.0, Z = 55.0 .. 90.0
// Rear Entrance Doorway (Floor 1): X = -282.0 .. -278.4, Z = 89.9
// Rear Visitor Parking Lot: X = -301.5 .. -241.0, Z = 90.0 .. 134.0
// Elevator 0 Core: X = -277.3 .. -274.7, Z = 85.0 .. 89.4 (center X = -276.0)
// Elevator 1 Core: X = -271.3 .. -268.7, Z = 85.0 .. 89.4 (center X = -270.0)
// Grand Stairwell: X = -267.2 .. -262.8, Z = 78.6 .. 88.6 (open entry at Z = 78.5)
// =========================================================================

function buildHospitalColliders(): IntersectionColliderBox[] {
  const cols: IntersectionColliderBox[] = [
    // Campus Perimeter & Forecourt (Floor 1 Only)
    { minX: -302.5, maxX: -301.0, minZ: 42.3, maxZ: 134.8, floor: 1 }, // West hedge
    { minX: -302.4, maxX: -240.6, minZ: 133.4, maxZ: 135.0, floor: 1 }, // Far South parking hedge
    { minX: -242.0, maxX: -240.6, minZ: 105.0, maxZ: 134.8, floor: 1 }, // East parking hedge (south of gate)
    { minX: -263.4, maxX: -261.6, minZ: 42.6, maxZ: 44.0, floor: 1 }, // Totem pylon
    { minX: -278.9, maxX: -277.9, minZ: 47.7, maxZ: 48.7, floor: 1 }, // Canopy col W
    { minX: -268.1, maxX: -267.1, minZ: 47.7, maxZ: 48.7, floor: 1 }, // Canopy col E
    { minX: -258.8, maxX: -257.8, minZ: 46.8, maxZ: 47.8, floor: 1 }, // ER pillar

    // Rear Entrance Canopy Pillars, Guard Booth & Parking Info Pylon (Floor 1)
    { minX: -284.0, maxX: -283.2, minZ: 94.6, maxZ: 95.4, floor: 1 },
    { minX: -277.2, maxX: -276.4, minZ: 94.6, maxZ: 95.4, floor: 1 },
    { minX: -244.6, maxX: -241.8, minZ: 99.5, maxZ: 101.7, floor: 1 }, // Security guard booth
    { minX: -277.1, maxX: -276.1, minZ: 103.0, maxZ: 104.0, floor: 1 }, // Parking info pylon

    // Covered Motorbike Parking Sheds (North Row & South Row)
    { minX: -298.8, maxX: -284.2, minZ: 105.6, maxZ: 110.2, floor: 1 },
    { minX: -298.8, maxX: -284.2, minZ: 115.2, maxZ: 119.8, floor: 1 },

    // Parked Visitor & Accessible Cars (Priority Row Z = 108.4)
    ...[-273.5, -265.5, -261.5, -253.5].map((cx) => ({
      minX: cx - 1.05,
      maxX: cx + 1.05,
      minZ: 106.0,
      maxZ: 110.8,
      floor: 1,
    })),
    // Parked Visitor Cars (Main South Row Z = 127.6)
    ...[-295.0, -290.5, -281.5, -271.5, -262.5, -253.5].map((cx) => ({
      minX: cx - 1.05,
      maxX: cx + 1.05,
      minZ: 125.2,
      maxZ: 130.0,
      floor: 1,
    })),

    // Floor 1 Exterior Walls (with Main Door -276..-270 and ER Door -255.5..-251.5)
    { minX: -251.2, maxX: -245.8, minZ: 54.6, maxZ: 55.5, floor: 1 },
    { minX: -269.8, maxX: -255.8, minZ: 54.6, maxZ: 55.5, floor: 1 },
    { minX: -296.2, maxX: -276.2, minZ: 54.6, maxZ: 55.5, floor: 1 },

    // Floor 1 Lobby & Wing Furniture
    { minX: -276.7, maxX: -269.3, minZ: 62.9, maxZ: 64.7, floor: 1 }, // Central Reception
    { minX: -282.7, maxX: -278.3, minZ: 58.6, maxZ: 60.2, floor: 1 }, // Waiting bench N
    { minX: -282.7, maxX: -278.3, minZ: 63.2, maxZ: 64.8, floor: 1 }, // Waiting bench S
    { minX: -287.4, maxX: -286.0, minZ: 58.5, maxZ: 66.5, floor: 1 }, // Pharmacy counter
    { minX: -295.4, maxX: -293.6, minZ: 56.2, maxZ: 69.5, floor: 1 }, // Pharmacy shelves
    // ER Trauma Beds (East Wing: 4 beds at Z = 59.5, 64.5, 69.5, 74.5)
    { minX: -250.6, maxX: -247.0, minZ: 58.6, maxZ: 60.4, floor: 1 },
    { minX: -250.6, maxX: -247.0, minZ: 63.6, maxZ: 65.4, floor: 1 },
    { minX: -250.6, maxX: -247.0, minZ: 68.6, maxZ: 70.4, floor: 1 },
    { minX: -250.6, maxX: -247.0, minZ: 73.6, maxZ: 75.4, floor: 1 },
    { minX: -260.6, maxX: -257.6, minZ: 63.8, maxZ: 67.6, floor: 1 }, // ER Nurse station
    // MRI Glass Suite (X = -261.4 .. -246.8, Z = 79.0 .. 89.2, open doorway X = -260.8 .. -258.2)
    { minX: -261.5, maxX: -260.9, minZ: 78.9, maxZ: 89.2, floor: 1 },
    { minX: -258.2, maxX: -246.8, minZ: 78.7, maxZ: 79.3, floor: 1 },
    { minX: -255.6, maxX: -251.4, minZ: 81.2, maxZ: 86.4, floor: 1 }, // MRI scanner + bed
    { minX: -261.0, maxX: -258.2, minZ: 82.8, maxZ: 84.2, floor: 1 }, // MRI console
    // Rear West Consultation Suite
    { minX: -296.0, maxX: -284.0, minZ: 75.1, maxZ: 75.9, floor: 1 },
    { minX: -288.0, maxX: -282.5, minZ: 81.5, maxZ: 83.2, floor: 1 },
    { minX: -293.5, maxX: -290.5, minZ: 84.7, maxZ: 87.3, floor: 1 },
    // Check-in kiosks & water dispenser
    { minX: -268.8, maxX: -266.2, minZ: 57.0, maxZ: 58.0, floor: 1 },
    { minX: -283.6, maxX: -282.8, minZ: 61.3, maxZ: 62.1, floor: 1 },
  ];

  // Floors 1..4 shared outer walls, atrium columns, elevator shaft side/back walls & stairwell guards
  for (let fl = 1; fl <= 4; fl++) {
    // West & East outer walls
    cols.push(
      { minX: -296.4, maxX: -295.5, minZ: 54.8, maxZ: 90.2, floor: fl },
      { minX: -246.5, maxX: -245.6, minZ: 54.8, maxZ: 90.2, floor: fl }
    );
    // South outer wall: open Rear Entrance Doorway (-282.0..-278.4) on Floor 1!
    if (fl === 1) {
      cols.push(
        { minX: -296.2, maxX: -282.1, minZ: 89.4, maxZ: 90.4, floor: 1 },
        { minX: -278.3, maxX: -245.8, minZ: 89.4, maxZ: 90.4, floor: 1 }
      );
    } else {
      cols.push({ minX: -296.2, maxX: -245.8, minZ: 89.4, maxZ: 90.4, floor: fl });
    }
    // North outer facade solid on Floors 2..4
    if (fl >= 2) {
      cols.push({ minX: -296.2, maxX: -245.8, minZ: 54.6, maxZ: 55.5, floor: fl });
    }
    // Central structural columns
    cols.push(
      { minX: -283.9, maxX: -283.1, minZ: 58.6, maxZ: 59.4, floor: fl },
      { minX: -283.9, maxX: -283.1, minZ: 69.6, maxZ: 70.4, floor: fl },
      { minX: -262.9, maxX: -262.1, minZ: 58.6, maxZ: 59.4, floor: fl },
      { minX: -262.9, maxX: -262.1, minZ: 69.6, maxZ: 70.4, floor: fl }
    );
    // Elevator side & central piers (portals at X = -277.1..-274.9 and -271.1..-268.9 are open!)
    cols.push(
      { minX: -278.0, maxX: -277.2, minZ: 84.7, maxZ: 89.5, floor: fl }, // West pier of Elev 0
      { minX: -274.8, maxX: -271.2, minZ: 84.7, maxZ: 89.5, floor: fl }, // Central directory pier
      { minX: -268.8, maxX: -268.0, minZ: 84.7, maxZ: 89.5, floor: fl }, // East pier of Elev 1
      { minX: -278.0, maxX: -268.0, minZ: 89.0, maxZ: 89.8, floor: fl } // Rear wall behind cabins
    );
    // Grand Stairwell perimeter guards (entry open at North Z = 78.6)
    cols.push(
      { minX: -267.45, maxX: -267.05, minZ: 78.5, maxZ: 88.8, floor: fl }, // Stair West wall
      { minX: -262.95, maxX: -262.55, minZ: 78.5, maxZ: 88.8, floor: fl }, // Stair East wall
      { minX: -267.4, maxX: -262.6, minZ: 88.5, maxZ: 88.9, floor: fl }, // Stair South back wall
      { minX: -265.18, maxX: -264.82, minZ: 78.8, maxZ: 85.7, floor: fl } // Center handrail divider
    );
  }

  // FLOOR 2: Khoa Xét Nghiệm (West) + Khoa Nhi (East)
  cols.push(
    // Central Floor 2 Nurse Desk
    { minX: -275.5, maxX: -270.5, minZ: 68.0, maxZ: 69.6, floor: 2 },
    // Lab Glass Partition (X = -278.4, Z = 55.2..65.5 and 71.5..89.5 — wide doorway at Z = 65.5..71.5)
    { minX: -278.7, maxX: -278.1, minZ: 55.2, maxZ: 65.5, floor: 2 },
    { minX: -278.7, maxX: -278.1, minZ: 71.5, maxZ: 89.5, floor: 2 },
    // Lab Analyzer Benches & Fridges
    { minX: -294.8, maxX: -285.0, minZ: 59.5, maxZ: 61.5, floor: 2 },
    { minX: -294.8, maxX: -285.0, minZ: 73.5, maxZ: 75.5, floor: 2 },
    { minX: -295.4, maxX: -293.8, minZ: 63.0, maxZ: 72.0, floor: 2 },
    { minX: -292.0, maxX: -284.0, minZ: 82.5, maxZ: 84.5, floor: 2 },
    // Pediatric Beds (East Wing: 4 colorful beds at Z = 60, 66, 72, 78)
    { minX: -250.6, maxX: -247.0, minZ: 59.1, maxZ: 60.9, floor: 2 },
    { minX: -250.6, maxX: -247.0, minZ: 65.1, maxZ: 66.9, floor: 2 },
    { minX: -250.6, maxX: -247.0, minZ: 71.1, maxZ: 72.9, floor: 2 },
    { minX: -250.6, maxX: -247.0, minZ: 77.1, maxZ: 78.9, floor: 2 },
    // Pediatric Play Corner & Nurse Desk
    { minX: -259.5, maxX: -256.5, minZ: 64.0, maxZ: 67.2, floor: 2 },
    { minX: -258.2, maxX: -255.8, minZ: 81.8, maxZ: 84.2, floor: 2 }
  );

  // FLOOR 3: Khoa Nội Trú (West) + Hồi Sức Tích Cực ICU (East)
  cols.push(
    // Central Floor 3 Nurse Station
    { minX: -275.5, maxX: -270.5, minZ: 67.2, maxZ: 68.8, floor: 3 },
    // Inpatient Ward 4 Beds (West Wing: Z = 59.5, 65.5, 73.5, 79.5)
    { minX: -295.2, maxX: -291.4, minZ: 58.6, maxZ: 60.4, floor: 3 },
    { minX: -295.2, maxX: -291.4, minZ: 64.6, maxZ: 66.4, floor: 3 },
    { minX: -295.2, maxX: -291.4, minZ: 72.6, maxZ: 74.4, floor: 3 },
    { minX: -295.2, maxX: -291.4, minZ: 78.6, maxZ: 80.4, floor: 3 },
    // Ward Divider Glass Partition (Z = 69.5, X = -295.6..-282.0)
    { minX: -295.6, maxX: -282.0, minZ: 69.2, maxZ: 69.8, floor: 3 },
    // ICU Glass Partition (X = -261.2, Z = 55.2..64.5 and 70.5..89.5 — doorway Z = 64.5..70.5)
    { minX: -261.5, maxX: -260.9, minZ: 55.2, maxZ: 64.5, floor: 3 },
    { minX: -261.5, maxX: -260.9, minZ: 70.5, maxZ: 89.5, floor: 3 },
    // ICU 4 Intensive Care Beds (East Wing)
    { minX: -250.6, maxX: -247.0, minZ: 59.1, maxZ: 60.9, floor: 3 },
    { minX: -250.6, maxX: -247.0, minZ: 65.1, maxZ: 66.9, floor: 3 },
    { minX: -250.6, maxX: -247.0, minZ: 71.1, maxZ: 72.9, floor: 3 },
    { minX: -250.6, maxX: -247.0, minZ: 77.1, maxZ: 78.9, floor: 3 },
    // ICU Central Monitoring Island
    { minX: -258.5, maxX: -255.8, minZ: 66.0, maxZ: 69.8, floor: 3 }
  );

  // FLOOR 4: Phòng Mổ Vô Trùng OR-01 & OR-02 (West) + Hậu Phẫu (East)
  cols.push(
    // Scrub Sink Station
    { minX: -275.4, maxX: -270.6, minZ: 67.2, maxZ: 68.8, floor: 4 },
    // Operating Room Partition Wall (X = -278.4, doorways at Z = 61..65 and 76..80)
    { minX: -278.7, maxX: -278.1, minZ: 55.2, maxZ: 61.0, floor: 4 },
    { minX: -278.7, maxX: -278.1, minZ: 65.0, maxZ: 76.0, floor: 4 },
    { minX: -278.7, maxX: -278.1, minZ: 80.0, maxZ: 89.5, floor: 4 },
    { minX: -295.6, maxX: -278.4, minZ: 71.2, maxZ: 71.8, floor: 4 }, // Wall between OR-01 & OR-02
    // OR-01 & OR-02 Operating Tables
    { minX: -290.2, maxX: -286.6, minZ: 61.8, maxZ: 64.2, floor: 4 },
    { minX: -290.2, maxX: -286.6, minZ: 78.8, maxZ: 81.2, floor: 4 },
    // Post-Op Recovery 4 Beds (East Wing)
    { minX: -250.6, maxX: -247.0, minZ: 59.1, maxZ: 60.9, floor: 4 },
    { minX: -250.6, maxX: -247.0, minZ: 65.1, maxZ: 66.9, floor: 4 },
    { minX: -250.6, maxX: -247.0, minZ: 71.1, maxZ: 72.9, floor: 4 },
    { minX: -250.6, maxX: -247.0, minZ: 77.1, maxZ: 78.9, floor: 4 },
    { minX: -259.2, maxX: -256.4, minZ: 65.8, maxZ: 69.2, floor: 4 }
  );

  // FLOOR 5 (Sân Thượng / Helipad & Rooftop Healing Garden)
  cols.push(
    // Rooftop perimeter safety parapets
    { minX: -296.4, maxX: -245.6, minZ: 54.6, maxZ: 55.4, floor: 5 },
    { minX: -296.4, maxX: -245.6, minZ: 89.4, maxZ: 90.4, floor: 5 },
    { minX: -296.4, maxX: -295.5, minZ: 54.8, maxZ: 90.2, floor: 5 },
    { minX: -246.5, maxX: -245.6, minZ: 54.8, maxZ: 90.2, floor: 5 },
    // Penthouse elevator & stairwell walls on rooftop
    { minX: -278.0, maxX: -277.2, minZ: 84.7, maxZ: 89.5, floor: 5 },
    { minX: -274.8, maxX: -271.2, minZ: 84.7, maxZ: 89.5, floor: 5 },
    { minX: -268.8, maxX: -268.0, minZ: 84.7, maxZ: 89.5, floor: 5 },
    { minX: -278.0, maxX: -262.5, minZ: 89.0, maxZ: 89.8, floor: 5 },
    { minX: -267.45, maxX: -267.05, minZ: 78.5, maxZ: 88.8, floor: 5 },
    { minX: -262.95, maxX: -262.55, minZ: 78.5, maxZ: 88.8, floor: 5 },
    { minX: -265.18, maxX: -264.82, minZ: 78.8, maxZ: 85.7, floor: 5 },
    // Rooftop garden benches / planters
    { minX: -256.8, maxX: -254.2, minZ: 63.0, maxZ: 64.2, floor: 5 },
    { minX: -256.8, maxX: -254.2, minZ: 73.0, maxZ: 74.2, floor: 5 }
  );

  return cols;
}

export const HOSPITAL_COLLIDERS: IntersectionColliderBox[] = buildHospitalColliders();

function drawFittedText(
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

function createHospitalBannerTex(
  title: string,
  sub: string,
  bgHex: string,
  accentHex: string,
  withCross = true
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, c.width - 24, c.height - 24);

  if (withCross) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(46, 48, 160, 160);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(108, 72, 36, 112);
    ctx.fillRect(70, 110, 112, 36);
  }

  ctx.textAlign = withCross ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  const textX = withCross ? 248 : c.width / 2;
  const maxWidth = withCross ? c.width - textX - 48 : c.width - 96;

  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, title, textX, 92, maxWidth, 72, 36, '900');

  ctx.fillStyle = accentHex === '#ef4444' ? '#fecaca' : '#bae6fd';
  drawFittedText(ctx, sub, textX, 174, maxWidth, 38, 22, '800');

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHospitalPylonTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1500;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, c.width - 36, c.height - 36);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(36, 36, c.width - 72, 26);

  const badgeSize = 240;
  const badgeX = (c.width - badgeSize) / 2;
  const badgeY = 120;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(badgeX + 94, badgeY + 40, 52, 160);
  ctx.fillRect(badgeX + 40, badgeY + 94, 160, 52);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'BỆNH VIỆN', c.width / 2, 470, 420, 68, 40, '900');
  drawFittedText(ctx, 'ĐA KHOA', c.width / 2, 560, 420, 74, 42, '900');
  drawFittedText(ctx, 'QUỐC TẾ', c.width / 2, 650, 420, 68, 40, '900');

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(76, 735, c.width - 152, 8);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(56, 800, c.width - 112, 118);
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'KHOA CẤP CỨU', c.width / 2, 859, 360, 46, 28, '900');

  ctx.fillStyle = '#bae6fd';
  drawFittedText(ctx, '5 TẦNG CHUYÊN KHOA', c.width / 2, 1020, 410, 38, 24, '800');
  ctx.fillStyle = '#38bdf8';
  drawFittedText(ctx, 'HOẠT ĐỘNG 24/7', c.width / 2, 1105, 410, 46, 28, '900');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(76, 1210, c.width - 152, 130);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(76, 1210, c.width - 152, 130);
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, 'LỐI VÀO CHÍNH', c.width / 2, 1255, 330, 34, 22, '800');
  ctx.fillStyle = '#38bdf8';
  drawFittedText(ctx, 'SẢNH KHÁM →', c.width / 2, 1305, 330, 32, 22, '800');

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(36, c.height - 62, c.width - 72, 26);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHelipadTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(256, 256, 206, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.setLineDash([28, 18]);
  ctx.beginPath();
  ctx.arc(256, 256, 174, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(162, 136, 42, 240);
  ctx.fillRect(308, 136, 42, 240);
  ctx.fillRect(162, 234, 188, 44);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHospitalWallBoardTex(header: string, lines: string[], accent = '#0284c7'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, c.width, 70);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  drawFittedText(ctx, header, c.width / 2, 36, c.width - 36, 32, 20, '900');

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  const rowStep = lines.length > 3 ? 42 : 58;
  const startY = lines.length > 3 ? 104 : 122;
  lines.forEach((line, idx) => {
    drawFittedText(ctx, line, 28, startY + idx * rowStep, c.width - 56, 24, 15, '700');
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createElevatorDisplayCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  draw: (floor: number, dir: -1 | 0 | 1) => void;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  let lastKey = '';

  const draw = (floor: number, dir: -1 | 0 | 1) => {
    const key = `${floor}_${dir}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 88);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = dir > 0 ? '#22c55e' : dir < 0 ? '#f59e0b' : '#38bdf8';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.fillText(dir > 0 ? '▲' : dir < 0 ? '▼' : '●', 26, 48);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '900 50px system-ui, sans-serif';
    ctx.fillText(`T${floor}`, 226, 50);
    tex.needsUpdate = true;
  };
  draw(1, 0);
  return { canvas, ctx, tex, draw };
}

export function createHospitalStructure(): HospitalBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  const createHospitalGlowPoolTex = () => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 245, 200, 0.44)');
    grad.addColorStop(0.5, 'rgba(224, 242, 254, 0.18)');
    grad.addColorStop(1, 'rgba(224, 242, 254, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const hospWarmPoolMat = new THREE.MeshBasicMaterial({
    map: createHospitalGlowPoolTex(),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(hospWarmPoolMat);
  const addHospitalGroundPool = (x: number, z: number, size: number, y = 0.028) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), hospWarmPoolMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    staticGroup.add(p);
  };

  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.82 });
  const plazaWalkMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
  const driveAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.92 });
  const whiteWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xcbd5e1,
    emissiveIntensity: 0.12,
    roughness: 0.52,
  });
  const warmAccentWallMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.62 });
  const trimTealMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.2 });
  const facadeLedTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  neonMats.push(facadeLedTrimMat);
  const canopySoffitLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  lanternMats.push(canopySoffitLedMat);
  const erRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.72,
    roughness: 0.35,
  });
  neonMats.push(erRedMat);
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.72 });
  const glassFacadeMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.16,
    roughness: 0.1,
    metalness: 0.25,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const doorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  neonMats.push(glassFacadeMat);

  const floorTerrazzoMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  const erFloorMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.38 });
  const pedsFloorMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.42 });
  const sterileFloorMat = new THREE.MeshStandardMaterial({ color: 0xd1fae5, roughness: 0.32 });
  const roofDeckMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.72 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
  const yellowPaintMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });

  const counterTealMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.45 });
  const warmWoodMat = new THREE.MeshStandardMaterial({ color: 0xc29b6e, roughness: 0.65 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.22, metalness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.88 });
  const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.6 });
  const sheetMat = new THREE.MeshStandardMaterial({ color: 0xecfeff, roughness: 0.8 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.85,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const monitorScreenMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.9,
  });
  const mriBoreGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  const ceilLedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

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

  const addFloorBoard = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    w: number,
    h: number,
    header: string,
    lines: string[],
    accent = '#0284c7'
  ) => {
    const tex = createHospitalWallBoardTex(header, lines, accent);
    const backing = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.14, 0.08), darkMetalMat);
    backing.position.set(x, y, z);
    backing.rotation.y = rotY;
    staticGroup.add(backing);

    const nx = Math.sin(rotY);
    const nz = Math.cos(rotY);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45 })
    );
    face.rotation.y = rotY;
    face.position.set(x + nx * 0.055, y, z + nz * 0.055);
    staticGroup.add(face);
  };

  // Composite 8-part procedural Hospital Bed + IV Stand + Vital Monitor + Bedside Cabinet
  const addDetailedHospitalBed = (
    cx: number,
    floorY: number,
    cz: number,
    headOnEast: boolean,
    blanketHex: number,
    withCurtainNorth = false,
    isIcu = false
  ) => {
    const dir = headOnEast ? 1 : -1;
    const blanketMat = new THREE.MeshStandardMaterial({ color: blanketHex, roughness: 0.78 });
    // 1. Undercarriage & 4 locking casters
    addBox(cx - 1.15, cx + 1.15, floorY + 0.12, floorY + 0.24, cz - 0.48, cz + 0.48, darkMetalMat);
    [-1.02, 1.02].forEach((ox) => {
      [-0.44, 0.44].forEach((oz) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), darkMetalMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(cx + ox, floorY + 0.06, cz + oz);
        staticGroup.add(wheel);
      });
    });
    // 2. Main steel bed frame + head/footboards + safety side rails
    addBox(cx - 1.28, cx + 1.28, floorY + 0.34, floorY + 0.48, cz - 0.56, cz + 0.56, bedFrameMat);
    const headX = cx + dir * 1.25;
    const footX = cx - dir * 1.25;
    addBox(headX - 0.04, headX + 0.04, floorY + 0.34, floorY + 1.06, cz - 0.58, cz + 0.58, warmWoodMat);
    addBox(footX - 0.04, footX + 0.04, floorY + 0.34, floorY + 0.88, cz - 0.58, cz + 0.58, warmWoodMat);
    [-0.57, 0.57].forEach((rz) => {
      addBox(cx - 0.65, cx + 0.65, floorY + 0.62, floorY + 0.86, cz + rz - 0.02, cz + rz + 0.02, chromeMat);
    });
    // 3. Mattress, pillow & folded blanket
    addBox(cx - 1.20, cx + 1.20, floorY + 0.48, floorY + 0.70, cz - 0.50, cz + 0.50, sheetMat);
    addBox(
      cx + dir * 0.25 - 0.82,
      cx + dir * 0.25 + 0.82,
      floorY + 0.50,
      floorY + 0.73,
      cz - 0.52,
      cz + 0.52,
      blanketMat
    );
    addBox(headX - dir * 0.36 - 0.22, headX - dir * 0.36 + 0.22, floorY + 0.70, floorY + 0.84, cz - 0.34, cz + 0.34, pillowMat);
    // 4. IV Drip pole & saline bag
    const poleX = headX - dir * 0.2;
    const poleZ = cz - 0.82;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.92, 8), chromeMat);
    pole.position.set(poleX, floorY + 0.96, poleZ);
    staticGroup.add(pole);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.07), glassFacadeMat);
    bag.position.set(poleX - dir * 0.14, floorY + 1.78, poleZ);
    staticGroup.add(bag);
    // 5. Bedside cabinet + Vital Monitor (and ICU ventilator column)
    const cabZ = cz + 0.88;
    addBox(headX - 0.28, headX + 0.28, floorY, floorY + 0.78, cabZ - 0.26, cabZ + 0.26, whiteWallMat);
    addBox(headX - 0.30, headX + 0.30, floorY + 0.78, floorY + 0.84, cabZ - 0.28, cabZ + 0.28, trimTealMat);
    addBox(headX - 0.22, headX + 0.22, floorY + 1.22, floorY + 1.60, cabZ - 0.12, cabZ + 0.12, monitorScreenMat);
    if (isIcu) {
      addBox(headX - 0.26, headX + 0.26, floorY, floorY + 1.48, cz - 1.05, cz - 0.65, steelMat);
      addBox(headX - 0.20, headX + 0.20, floorY + 1.25, floorY + 1.56, cz - 1.00, cz - 0.70, monitorScreenMat);
    }
    // 6. Wall oxygen & nurse-call headwall panel
    addBox(headX + dir * 0.72, headX + dir * 0.86, floorY + 1.24, floorY + 1.68, cz - 0.72, cz + 0.72, steelMat);
    // 7. Optional privacy curtain
    if (withCurtainNorth) {
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.3), curtainMat);
      curtain.position.set(cx, floorY + 1.85, cz - 2.35);
      staticGroup.add(curtain);
      addBox(cx - 1.45, cx + 1.45, floorY + 2.98, floorY + 3.04, cz - 2.38, cz - 2.32, steelMat);
    }
  };

  const addPlant = (px: number, floorY: number, pz: number, scale = 1.0) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.24 * scale, 0.52 * scale, 12), whiteWallMat);
    pot.position.set(px, floorY + 0.26 * scale, pz);
    staticGroup.add(pot);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.72 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    stem.position.set(px, floorY + 0.82 * scale, pz);
    staticGroup.add(stem);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.44 * scale, 10, 8), hedgeMat);
    leaves.position.set(px, floorY + 1.35 * scale, pz);
    staticGroup.add(leaves);
    const topLeaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.30 * scale, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 })
    );
    topLeaves.position.set(px + 0.12 * scale, floorY + 1.62 * scale, pz - 0.08 * scale);
    staticGroup.add(topLeaves);
  };

  const addLoungeBenchRow = (cx: number, floorY: number, cz: number) => {
    addBox(cx - 2.0, cx + 2.0, floorY + 0.28, floorY + 0.42, cz - 0.45, cz + 0.45, steelMat);
    [-1.6, -0.55, 0.55, 1.6].forEach((ox) => {
      addBox(cx + ox - 0.40, cx + ox + 0.40, floorY + 0.42, floorY + 0.55, cz - 0.42, cz + 0.42, counterTealMat);
      addBox(cx + ox - 0.40, cx + ox + 0.40, floorY + 0.55, floorY + 1.02, cz + 0.30, cz + 0.44, counterTealMat);
    });
  };

  // =========================================================================
  // 1. CAMPUS FORECOURT PLAZA, REAR PARKING APRON, ER DRIVEWAY & TOTEM PYLON
  // =========================================================================
  addBox(-302.0, -241.0, -0.25, 0.0, 42.5, 134.5, plazaMat);

  const erDriveway = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 17.7), driveAsphaltMat);
  erDriveway.rotation.x = -Math.PI / 2;
  erDriveway.position.set(-251.5, 0.008, 46.15);
  staticGroup.add(erDriveway);

  const apronRamp = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.26, 1.4), driveAsphaltMat);
  apronRamp.position.set(-251.5, -0.13, 37.6);
  apronRamp.rotation.x = -0.16;
  staticGroup.add(apronRamp);

  [-247.2, -252.2, -257.2].forEach((bx) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 9.5), yellowPaintMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(bx, 0.015, 49.0);
    staticGroup.add(line);
  });

  const walkPlaza = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 12.5), plazaWalkMat);
  walkPlaza.rotation.x = -Math.PI / 2;
  walkPlaza.position.set(-274.0, 0.01, 48.75);
  staticGroup.add(walkPlaza);

  // Outer Perimeter Hedges (West full length, Far South behind parking lot, East south of parking gate)
  addBox(-302.2, -301.1, 0.0, 0.9, 43.0, 134.0, hedgeMat);
  addBox(-302.0, -241.0, 0.0, 0.9, 133.5, 134.6, hedgeMat);
  addBox(-241.8, -240.8, 0.0, 0.9, 105.0, 134.0, hedgeMat);

  const pylonBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 5.2, 0.65), darkMetalMat);
  pylonBase.position.set(-262.5, 2.6, 43.3);
  staticGroup.add(pylonBase);
  const pylonTex = createHospitalPylonTex();
  const pylonMat = new THREE.MeshStandardMaterial({
    map: pylonTex,
    emissive: 0xffffff,
    emissiveMap: pylonTex,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  neonMats.push(pylonMat);
  const pylonFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4.4), pylonMat);
  pylonFace.rotation.y = Math.PI;
  pylonFace.position.set(-262.5, 2.7, 42.95);
  staticGroup.add(pylonFace);

  // =========================================================================
  // 2. 5-FLOOR OPEN HOSPITAL SHELL, CURTAIN WALLS, CANOPIES & ROOFTOP
  // =========================================================================
  // Ground floor terrazzo & ER zone
  const mainFloor = new THREE.Mesh(new THREE.PlaneGeometry(50.0, 35.0), floorTerrazzoMat);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.set(-271.0, 0.02, 72.5);
  staticGroup.add(mainFloor);
  const erFloor = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 23.0), erFloorMat);
  erFloor.rotation.x = -Math.PI / 2;
  erFloor.position.set(-255.0, 0.024, 66.5);
  staticGroup.add(erFloor);

  // Multi-floor slabs (T2=4.6, T3=9.2, T4=13.8, T5=18.4) with exact cutouts for Elevators & Grand Stairwell
  for (let flIdx = 1; flIdx <= 4; flIdx++) {
    const topY = flIdx * HOSPITAL_FLOOR_HEIGHT;
    const botY = topY - 0.30;
    const slabMat = flIdx === 4 ? roofDeckMat : floorTerrazzoMat;
    // Main North span (Z = 55.0..78.6)
    addBox(-296.0, -246.0, botY, topY, 55.0, 78.6, slabMat);
    // West wing south of Z=78.6
    addBox(-296.0, -277.3, botY, topY, 78.6, 90.0, slabMat);
    // Strip in front of Elevators (Z = 78.6..85.0)
    addBox(-277.3, -267.2, botY, topY, 78.6, 85.0, slabMat);
    // Central Pier between Elevator 0 & Elevator 1 (X = -274.7..-271.3, Z = 85.0..90.0)
    addBox(-274.7, -271.3, botY, topY, 85.0, 90.0, slabMat);
    // Pier between Elevator 1 & Grand Stairwell (X = -268.7..-267.2, Z = 78.6..90.0)
    addBox(-268.7, -267.2, botY, topY, 78.6, 90.0, slabMat);
    // South rear lips behind shafts
    addBox(-277.3, -268.7, botY, topY, 89.4, 90.0, slabMat);
    addBox(-267.2, -262.8, botY, topY, 88.6, 90.0, slabMat);
    // East wing south of Z=78.6
    addBox(-262.8, -246.0, botY, topY, 78.6, 90.0, slabMat);

    // Distinct colored zone inlays on Floors 2..4
    if (flIdx === 1) {
      const pedsFloor = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 23.0), pedsFloorMat);
      pedsFloor.rotation.x = -Math.PI / 2;
      pedsFloor.position.set(-254.0, topY + 0.018, 67.5);
      staticGroup.add(pedsFloor);
    } else if (flIdx === 2) {
      const icuFloor = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 33.5), erFloorMat);
      icuFloor.rotation.x = -Math.PI / 2;
      icuFloor.position.set(-253.8, topY + 0.018, 72.5);
      staticGroup.add(icuFloor);
    } else if (flIdx === 3) {
      const orFloor = new THREE.Mesh(new THREE.PlaneGeometry(17.0, 33.5), sterileFloorMat);
      orFloor.rotation.x = -Math.PI / 2;
      orFloor.position.set(-287.0, topY + 0.018, 72.5);
      staticGroup.add(orFloor);
    }
  }

  // Ground-Floor North Exterior Wall & Automatic Sliding Glass Doors
  addBox(-296.0, -276.0, 0, 4.6, 54.8, 55.3, whiteWallMat);
  addBox(-276.0, -270.0, 3.4, 4.6, 54.8, 55.3, whiteWallMat);
  addBox(-270.0, -255.5, 0, 4.6, 54.8, 55.3, whiteWallMat);
  addBox(-255.5, -251.5, 3.2, 4.6, 54.8, 55.3, whiteWallMat);
  addBox(-251.5, -246.0, 0, 4.6, 54.8, 55.3, whiteWallMat);

  addBox(-293.0, -278.0, 0.85, 3.65, 54.85, 55.25, glassFacadeMat);
  addBox(-268.2, -257.3, 0.85, 3.65, 54.85, 55.25, glassFacadeMat);

  // Side & Rear Walls on Ground Floor (South wall opens at X = -282.0 .. -278.4 for Rear Parking Entrance!)
  addBox(-296.2, -295.6, 0, 4.6, 55.0, 90.0, whiteWallMat);
  addBox(-246.4, -245.8, 0, 4.6, 55.0, 90.0, whiteWallMat);
  addBox(-296.0, -282.0, 0, 4.6, 89.6, 90.2, whiteWallMat);
  addBox(-282.0, -278.4, 3.35, 4.6, 89.6, 90.2, whiteWallMat);
  addBox(-278.4, -246.0, 0, 4.6, 89.6, 90.2, whiteWallMat);

  // Curtain Wall Facade for Floors 2, 3, 4 (Y = 4.6 .. 18.4)
  for (let flIdx = 1; flIdx <= 3; flIdx++) {
    const baseY = flIdx * HOSPITAL_FLOOR_HEIGHT;
    // Knee wall + upper spandrel band on all 4 sides
    addBox(-296.1, -245.9, baseY - 0.30, baseY + 0.88, 54.85, 55.25, whiteWallMat);
    addBox(-296.1, -245.9, baseY + 3.65, baseY + 4.30, 54.85, 55.25, whiteWallMat);
    addBox(-296.1, -245.9, baseY - 0.12, baseY + 0.10, 54.76, 55.34, trimTealMat);

    addBox(-296.1, -245.9, baseY - 0.30, baseY + 0.88, 89.6, 90.15, whiteWallMat);
    addBox(-296.1, -245.9, baseY + 3.65, baseY + 4.30, 89.6, 90.15, whiteWallMat);

    addBox(-296.2, -295.6, baseY - 0.30, baseY + 0.88, 55.0, 90.0, whiteWallMat);
    addBox(-296.2, -295.6, baseY + 3.65, baseY + 4.30, 55.0, 90.0, whiteWallMat);

    addBox(-246.4, -245.8, baseY - 0.30, baseY + 0.88, 55.0, 90.0, whiteWallMat);
    addBox(-246.4, -245.8, baseY + 3.65, baseY + 4.30, 55.0, 90.0, whiteWallMat);

    // Panoramic transparent glass windows on Floors 2..4 so interiors shine out
    addBox(-295.5, -246.5, baseY + 0.88, baseY + 3.65, 54.96, 55.14, glassFacadeMat);
    addBox(-295.5, -246.5, baseY + 0.88, baseY + 3.65, 89.76, 89.94, glassFacadeMat);
    addBox(-296.0, -295.82, baseY + 0.88, baseY + 3.65, 55.4, 89.6, glassFacadeMat);
    addBox(-246.18, -246.0, baseY + 0.88, baseY + 3.65, 55.4, 89.6, glassFacadeMat);
  }
  // Vertical architectural teal fins on North facade
  [-294.0, -286.0, -278.5, -267.5, -259.5, -252.5, -246.5].forEach((fx) => {
    addBox(fx - 0.22, fx + 0.22, 4.6, 18.6, 54.68, 55.28, trimTealMat);
  });

  // Animated Ground-Floor Sliding Doors
  const erDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.98, 3.15, 0.10), doorGlassMat);
  erDoorL.position.set(-254.5, 1.58, 55.05);
  erDoorL.userData.noMerge = true;
  staticGroup.add(erDoorL);
  const erDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.98, 3.15, 0.10), doorGlassMat);
  erDoorR.position.set(-252.5, 1.58, 55.05);
  erDoorR.userData.noMerge = true;
  staticGroup.add(erDoorR);

  const mainDoorL = new THREE.Mesh(new THREE.BoxGeometry(2.96, 3.35, 0.10), doorGlassMat);
  mainDoorL.position.set(-274.5, 1.68, 55.05);
  mainDoorL.userData.noMerge = true;
  staticGroup.add(mainDoorL);
  const mainDoorR = new THREE.Mesh(new THREE.BoxGeometry(2.96, 3.35, 0.10), doorGlassMat);
  mainDoorR.position.set(-271.5, 1.68, 55.05);
  mainDoorR.userData.noMerge = true;
  staticGroup.add(mainDoorR);

  // Rear Entrance Door Frame + Animated Sliding Glass Doors (X = -282.0 .. -278.4, Z = 89.9)
  addBox(-282.08, -281.88, 0, 3.35, 89.55, 90.25, darkMetalMat);
  addBox(-278.52, -278.32, 0, 3.35, 89.55, 90.25, darkMetalMat);
  addBox(-282.08, -278.32, 3.22, 3.40, 89.55, 90.25, darkMetalMat);
  const rearDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.78, 3.20, 0.10), doorGlassMat);
  rearDoorL.position.set(-281.09, 1.61, 89.90);
  rearDoorL.userData.noMerge = true;
  staticGroup.add(rearDoorL);
  const rearDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.78, 3.20, 0.10), doorGlassMat);
  rearDoorR.position.set(-279.31, 1.61, 89.90);
  rearDoorR.userData.noMerge = true;
  staticGroup.add(rearDoorR);

  // Main Canopy & ER Canopy + Bright Under-Canopy Soffit LEDs + Forecourt Streetlamps
  const mainCanopyRoof = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.65, 7.6), whiteWallMat);
  mainCanopyRoof.position.set(-273.0, 4.85, 51.4);
  staticGroup.add(mainCanopyRoof);
  const mainCanopyTrim = new THREE.Mesh(new THREE.BoxGeometry(14.7, 0.24, 7.8), trimTealMat);
  mainCanopyTrim.position.set(-273.0, 5.22, 51.4);
  staticGroup.add(mainCanopyTrim);
  const mainCanopySoffitLed = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.06, 4.8), canopySoffitLedMat);
  mainCanopySoffitLed.position.set(-273.0, 4.50, 51.4);
  staticGroup.add(mainCanopySoffitLed);
  addHospitalGroundPool(-273.0, 50.8, 16.0);
  [-278.4, -267.6].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 4.7, 12), whiteWallMat);
    col.position.set(cx, 2.35, 48.2);
    staticGroup.add(col);
  });

  // Glowing Architectural Sky-Blue Cornice Ribbon along Hospital Roof Parapet (Y = 18.45)
  addBox(-296.2, -245.8, 18.35, 18.55, 54.70, 54.82, facadeLedTrimMat);

  const mainSignTex = createHospitalBannerTex(
    'BỆNH VIỆN ĐA KHOA QUỐC TẾ',
    'INTERNATIONAL GENERAL HOSPITAL • 5 TẦNG CHUYÊN KHOA 24/7',
    '#0c4a6e',
    '#38bdf8',
    true
  );
  const mainSignMat = new THREE.MeshStandardMaterial({
    map: mainSignTex,
    emissive: 0xffffff,
    emissiveMap: mainSignTex,
    emissiveIntensity: 0.88,
    roughness: 0.28,
  });
  neonMats.push(mainSignMat);
  const mainCanopyBacking = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.1, 0.22), darkMetalMat);
  mainCanopyBacking.position.set(-273.0, 6.25, 47.72);
  staticGroup.add(mainCanopyBacking);
  const mainCanopySign = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 1.98), mainSignMat);
  mainCanopySign.rotation.y = Math.PI;
  mainCanopySign.position.set(-273.0, 6.25, 47.59);
  staticGroup.add(mainCanopySign);

  const erCanopyRoof = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.55, 8.6), whiteWallMat);
  erCanopyRoof.position.set(-251.9, 4.55, 50.9);
  staticGroup.add(erCanopyRoof);
  const erCanopyStripe = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.34, 8.8), erRedMat);
  erCanopyStripe.position.set(-251.9, 4.92, 50.9);
  staticGroup.add(erCanopyStripe);
  const erCanopySoffitLed = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.06, 5.2), canopySoffitLedMat);
  erCanopySoffitLed.position.set(-251.9, 4.25, 50.9);
  staticGroup.add(erCanopySoffitLed);
  addHospitalGroundPool(-251.9, 49.5, 15.0);
  addBox(-258.58, -258.02, 0, 4.5, 47.02, 47.58, whiteWallMat);

  // Exterior Forecourt & Campus Perimeter Streetlamps
  const addHospitalExteriorLamp = (lx: number, lz: number) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.6, 10), darkMetalMat);
    post.position.set(lx, 2.3, lz);
    staticGroup.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), canopySoffitLedMat);
    cap.position.set(lx, 4.68, lz);
    staticGroup.add(cap);
    addHospitalGroundPool(lx, lz, 12.5);
  };
  [
    [-296.0, 44.2],
    [-286.0, 44.2],
    [-278.0, 44.2],
    [-266.0, 44.2],
    [-243.5, 44.2],
    [-298.8, 60.0],
    [-298.8, 78.0],
    [-243.5, 66.0],
    [-243.5, 84.0],
  ].forEach(([lx, lz]) => addHospitalExteriorLamp(lx, lz));

  const erSignTex = createHospitalBannerTex('KHOA CẤP CỨU', 'EMERGENCY • HOẠT ĐỘNG 24/24', '#7f1d1d', '#ef4444', true);
  const erSignMat = new THREE.MeshStandardMaterial({
    map: erSignTex,
    emissive: 0xffffff,
    emissiveMap: erSignTex,
    emissiveIntensity: 0.92,
    roughness: 0.25,
  });
  neonMats.push(erSignMat);
  const erCanopyBacking = new THREE.Mesh(new THREE.BoxGeometry(10.8, 1.8, 0.22), darkMetalMat);
  erCanopyBacking.position.set(-251.9, 5.85, 46.72);
  staticGroup.add(erCanopyBacking);
  const erCanopySign = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 1.68), erSignMat);
  erCanopySign.rotation.y = Math.PI;
  erCanopySign.position.set(-251.9, 5.85, 46.59);
  staticGroup.add(erCanopySign);

  // Rear Canopy & Illuminated Parking-Access Entrance Banner (Z = 90.2 .. 95.8)
  addBox(-284.4, -276.0, 3.60, 4.05, 90.15, 95.8, whiteWallMat);
  addBox(-284.55, -275.85, 4.05, 4.24, 90.15, 95.95, trimTealMat);
  const rearSoffitLed = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.06, 3.8), canopySoffitLedMat);
  rearSoffitLed.position.set(-280.2, 3.56, 93.0);
  staticGroup.add(rearSoffitLed);
  addHospitalGroundPool(-280.2, 93.2, 13.0);
  [-283.6, -276.8].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.62, 12), whiteWallMat);
    col.position.set(px, 1.81, 95.0);
    staticGroup.add(col);
  });
  const rearSignTex = createHospitalBannerTex(
    'LỐI VÀO BỆNH VIỆN • CỔNG SAU',
    'KẾT NỐI BÃI ĐỖ XE → THANG MÁY • SẢNH KHÁM • CẤP CỨU',
    '#0c4a6e',
    '#38bdf8',
    true
  );
  const rearSignMat = new THREE.MeshStandardMaterial({
    map: rearSignTex,
    emissive: 0xffffff,
    emissiveMap: rearSignTex,
    emissiveIntensity: 0.72,
    roughness: 0.28,
  });
  neonMats.push(rearSignMat);
  const rearCanopyBacking = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.45, 0.20), darkMetalMat);
  rearCanopyBacking.position.set(-280.2, 4.98, 95.72);
  staticGroup.add(rearCanopyBacking);
  const rearCanopySign = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 1.32), rearSignMat);
  rearCanopySign.position.set(-280.2, 4.98, 95.85);
  staticGroup.add(rearCanopySign);
  addFloorBoard(
    -280.2,
    3.92,
    89.42,
    Math.PI,
    3.6,
    0.85,
    'LỐI RA BÃI ĐỖ XE PHÍA SAU',
    ['• KHU GIỮ XE MÁY • BÃI Ô TÔ NGƯỜI THĂM'],
    '#0284c7'
  );

  // =========================================================================
  // 3. DUAL WORKING ELEVATORS (ZERO Z-FIGHTING, 5 STOPS, GLASS CABINS)
  // =========================================================================
  const ELEV_CENTERS = [-276.0, -270.0];
  const ELEV_DOOR_Z = 84.96;

  // Elevator shaft outer & rear walls (Y = 0 .. 22.4, reaches Floor 5 penthouse!)
  addBox(-278.0, -277.2, 0, 22.4, 84.8, 89.6, whiteWallMat); // West pier
  addBox(-274.8, -271.2, 0, 22.4, 84.8, 89.6, whiteWallMat); // Central pier (3.6m wide!)
  addBox(-268.8, -268.0, 0, 22.4, 84.8, 89.6, whiteWallMat); // East pier
  addBox(-278.0, -268.0, 0, 22.4, 89.1, 89.8, whiteWallMat); // Rear shaft wall
  addBox(-278.2, -267.8, 22.2, 22.6, 84.6, 89.9, darkMetalMat); // Penthouse roof

  // Floor directory boards on central pier (X = -273.0) on Floors 1..4 — zero clipping!
  for (let flIdx = 0; flIdx < 4; flIdx++) {
    const baseY = flIdx * HOSPITAL_FLOOR_HEIGHT;
    addFloorBoard(
      -273.0,
      baseY + 2.35,
      84.74,
      Math.PI,
      2.35,
      1.35,
      'SƠ ĐỒ CÁC KHOA • THANG MÁY',
      [
        '• T1: CẤP CỨU • DƯỢC • MRI 3.0T',
        '• T2: XÉT NGHIỆM • KHOA NHI',
        '• T3: NỘI TRÚ • HỒI SỨC ICU',
        '• T4: PHÒNG MỔ • HẬU PHẪU',
        '• T5: SÂN TRỰC THĂNG • VƯỜN',
      ],
      '#0369a1'
    );
  }

  interface InternalElevator {
    api: HospitalElevatorApi;
    index: number;
    x: number;
    currentY: number;
    currentFloor: number;
    targetFloor: number;
    doorOpen: number;
    state: 'idle' | 'door_opening' | 'boarding' | 'door_closing' | 'moving';
    timer: number;
    queue: number[];
    cabinGroup: THREE.Group;
    cabDoorL: THREE.Mesh;
    cabDoorR: THREE.Mesh;
    landingDoors: Array<{ left: THREE.Mesh; right: THREE.Mesh }>;
    displays: Array<ReturnType<typeof createElevatorDisplayCanvas>>;
  }

  const internalElevators: InternalElevator[] = [];

  ELEV_CENTERS.forEach((ex, idx) => {
    const startFloor = idx === 0 ? 1 : 3;
    const startY = (startFloor - 1) * HOSPITAL_FLOOR_HEIGHT;
    const landingDoors: Array<{ left: THREE.Mesh; right: THREE.Mesh }> = [];
    const displays: Array<ReturnType<typeof createElevatorDisplayCanvas>> = [];

    // Build landing portals & sliding landing doors on ALL 5 floors
    for (let flIdx = 0; flIdx < HOSPITAL_FLOOR_COUNT; flIdx++) {
      const baseY = flIdx * HOSPITAL_FLOOR_HEIGHT;
      // Brushed metal portal jambs & header (standing strictly proud of wall front Z=84.80)
      addBox(ex - 1.32, ex - 1.16, baseY, baseY + 2.75, 84.74, 85.14, darkMetalMat);
      addBox(ex + 1.16, ex + 1.32, baseY, baseY + 2.75, 84.74, 85.14, darkMetalMat);
      addBox(ex - 1.32, ex + 1.32, baseY + 2.75, baseY + 2.94, 84.74, 85.14, darkMetalMat);
      if (flIdx < 4) {
        // Upper lintel up to ceiling
        addBox(ex - 1.25, ex + 1.25, baseY + 2.94, baseY + HOSPITAL_FLOOR_HEIGHT, 84.80, 85.12, whiteWallMat);
      } else {
        // Penthouse lintel
        addBox(ex - 1.25, ex + 1.25, baseY + 2.94, baseY + 3.85, 84.80, 85.12, whiteWallMat);
      }

      // Recessed landing doors at Z = 84.96 (noMerge!) — strictly separated from jambs & cabin
      const dL = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.70, 0.05), steelMat);
      dL.position.set(ex - 0.58, baseY + 1.37, ELEV_DOOR_Z);
      dL.userData.noMerge = true;
      const winL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.065), doorGlassMat);
      winL.position.set(0.24, 0.15, 0);
      winL.userData.noMerge = true;
      dL.add(winL);
      staticGroup.add(dL);

      const dR = new THREE.Mesh(new THREE.BoxGeometry(1.14, 2.70, 0.05), steelMat);
      dR.position.set(ex + 0.58, baseY + 1.37, ELEV_DOOR_Z);
      dR.userData.noMerge = true;
      const winR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.065), doorGlassMat);
      winR.position.set(-0.24, 0.15, 0);
      winR.userData.noMerge = true;
      dR.add(winR);
      staticGroup.add(dR);
      landingDoors.push({ left: dL, right: dR });

      // Live floor indicator LED panel above doorway
      const disp = createElevatorDisplayCanvas();
      displays.push(disp);
      addBox(ex - 0.44, ex + 0.44, baseY + 3.05, baseY + 3.39, 84.74, 84.81, darkMetalMat);
      const dispFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.76, 0.28),
        new THREE.MeshStandardMaterial({
          map: disp.tex,
          emissive: 0xffffff,
          emissiveMap: disp.tex,
          emissiveIntensity: 0.7,
        })
      );
      dispFace.rotation.y = Math.PI;
      dispFace.position.set(ex, baseY + 3.22, 84.72);
      dispFace.userData.noMerge = true;
      staticGroup.add(dispFace);

      // Call button box beside doorway
      const btnX = idx === 0 ? ex + 1.46 : ex - 1.46;
      addBox(btnX - 0.09, btnX + 0.09, baseY + 1.12, baseY + 1.44, 84.74, 84.80, darkMetalMat);
      const btnGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), mriBoreGlowMat);
      btnGlow.position.set(btnX, baseY + 1.32, 84.73);
      staticGroup.add(btnGlow);
    }

    // Build moving Panoramic Cabin Group (`userData.noMerge = true`)
    const cabinGroup = new THREE.Group();
    cabinGroup.userData.noMerge = true;
    cabinGroup.position.set(ex, startY, 0);

    // Cabin floor deck (top flush at +0.02 inside cabin)
    const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.16, 3.66), darkMetalMat);
    cabFloor.position.set(0, -0.06, 87.05);
    cabinGroup.add(cabFloor);
    const cabInlay = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.03, 3.44), floorTerrazzoMat);
    cabInlay.position.set(0, 0.015, 87.05);
    cabinGroup.add(cabInlay);

    // Cabin ceiling & LED panel
    const cabCeil = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.14, 3.66), darkMetalMat);
    cabCeil.position.set(0, 2.72, 87.05);
    cabinGroup.add(cabCeil);
    const cabLight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 2.6), ceilLedMat);
    cabLight.position.set(0, 2.63, 87.05);
    cabinGroup.add(cabLight);

    // Side & rear cabin interior panels + stainless handrails
    [-1.04, 1.04].forEach((sx) => {
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.62, 3.55), warmWoodMat);
      sidePanel.position.set(sx, 1.33, 87.05);
      cabinGroup.add(sidePanel);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 3.1), chromeMat);
      rail.position.set(sx * 0.92, 0.98, 87.05);
      cabinGroup.add(rail);
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.04, 2.62, 0.08), steelMat);
    backWall.position.set(0, 1.33, 88.85);
    cabinGroup.add(backWall);
    const backMirror = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 0.03), doorGlassMat);
    backMirror.position.set(0, 1.55, 88.79);
    cabinGroup.add(backMirror);

    // Cabin inner doors (at Z = 85.22 — clear of landing doors Z = 84.96)
    const cabDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.58, 0.04), doorGlassMat);
    cabDoorL.position.set(-0.53, 1.31, 85.22);
    cabinGroup.add(cabDoorL);
    const cabDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.58, 0.04), doorGlassMat);
    cabDoorR.position.set(0.53, 1.31, 85.22);
    cabinGroup.add(cabDoorR);

    staticGroup.add(cabinGroup);

    const elev: InternalElevator = {
      api: null as unknown as HospitalElevatorApi,
      index: idx,
      x: ex,
      currentY: startY,
      currentFloor: startFloor,
      targetFloor: startFloor,
      doorOpen: 0,
      state: 'idle',
      timer: 0,
      queue: [],
      cabinGroup,
      cabDoorL,
      cabDoorR,
      landingDoors,
      displays,
    };

    const enqueueFloor = (floor: number) => {
      const f = Math.max(1, Math.min(HOSPITAL_FLOOR_COUNT, Math.round(floor)));
      if (f === elev.currentFloor && (elev.state === 'idle' || elev.state === 'boarding' || elev.state === 'door_opening')) {
        if (elev.state === 'idle') {
          elev.state = 'door_opening';
        } else if (elev.state === 'boarding') {
          elev.timer = Math.max(elev.timer, 2.4);
        }
        return;
      }
      if (!elev.queue.includes(f) && elev.targetFloor !== f) {
        elev.queue.push(f);
      }
    };

    const api: HospitalElevatorApi = {
      index: idx,
      x: ex,
      doorZ: ELEV_DOOR_Z,
      cabMinX: ex - 1.0,
      cabMaxX: ex + 1.0,
      cabMinZ: 85.3,
      cabMaxZ: 88.7,
      get currentFloor() {
        return elev.currentFloor;
      },
      get currentY() {
        return elev.currentY;
      },
      get targetFloor() {
        return elev.targetFloor;
      },
      get doorOpen() {
        return elev.doorOpen;
      },
      get state() {
        return elev.state;
      },
      callToFloor: enqueueFloor,
      requestFloor: enqueueFloor,
    };
    elev.api = api;
    internalElevators.push(elev);
  });

  // =========================================================================
  // 4. GRAND HOSPITAL SWITCHBACK STAIRCASE (CONNECTS FLOORS 1 <-> 5)
  // Footprint: X = -267.2 .. -262.8, Z = 78.5 .. 88.8
  // West Flight (-267.1 .. -265.0): climbs South (+Z) from baseY -> baseY + 2.3
  // Mid-Landing (Z = 85.8 .. 88.6): flat at baseY + 2.3
  // East Flight (-265.0 .. -262.9): climbs North (-Z) from baseY + 2.3 -> baseY + 4.6
  // =========================================================================
  addBox(-267.35, -267.1, 0, 22.4, 78.5, 88.8, whiteWallMat); // West stair shaft wall
  addBox(-262.9, -262.65, 0, 22.4, 78.5, 88.8, whiteWallMat); // East stair shaft wall
  addBox(-267.35, -262.65, 0, 22.4, 88.55, 88.85, whiteWallMat); // South back wall
  // Rooftop stair entry portal wall
  addBox(-267.35, -262.65, 22.15, 22.55, 78.4, 88.85, darkMetalMat);

  for (let flIdx = 0; flIdx < 4; flIdx++) {
    const baseY = flIdx * HOSPITAL_FLOOR_HEIGHT;
    const midY = baseY + HOSPITAL_FLOOR_HEIGHT * 0.5;
    // Mid-Landing slab
    addBox(-267.1, -262.9, midY - 0.18, midY, 85.8, 88.55, floorTerrazzoMat);

    // 10 West-lane steps climbing South (Z: 78.8 -> 85.8)
    const stepsPerFlight = 10;
    const runLen = 7.0;
    const dz = runLen / stepsPerFlight;
    const dy = (HOSPITAL_FLOOR_HEIGHT * 0.5) / stepsPerFlight;
    for (let s = 0; s < stepsPerFlight; s++) {
      const syTop = baseY + (s + 1) * dy;
      const sz0 = 78.8 + s * dz;
      addBox(-267.05, -265.08, syTop - 0.22, syTop, sz0, sz0 + dz + 0.02, floorTerrazzoMat);
    }
    // 10 East-lane steps climbing North (Z: 85.8 -> 78.8)
    for (let s = 0; s < stepsPerFlight; s++) {
      const syTop = midY + (s + 1) * dy;
      const sz1 = 85.8 - s * dz;
      addBox(-264.92, -262.95, syTop - 0.22, syTop, sz1 - dz - 0.02, sz1, floorTerrazzoMat);
    }

    // Center divider balustrade & stainless handrails
    addBox(-265.10, -264.90, baseY, baseY + HOSPITAL_FLOOR_HEIGHT + 0.9, 78.8, 85.75, trimTealMat);
    addFloorBoard(
      -265.0,
      baseY + 3.45,
      78.42,
      Math.PI,
      3.8,
      0.85,
      `CẦU THANG BỘ • TẦNG ${flIdx + 1}`,
      [`↑ LÊN TẦNG ${flIdx + 2} (LÀN PHẢI)   |   TẦNG ${flIdx + 1}..5`],
      '#0284c7'
    );
  }

  // =========================================================================
  // 5. FLOOR 1 INTERIOR UPGRADES (LOBBY, PHARMACY, 4-BAY ER, MRI 3.0T, CONSULT)
  // =========================================================================
  const addFloorLine = (x1: number, z1: number, x2: number, z2: number, colorHex: number, y = 0.028) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, len),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 })
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(x2 - x1, z2 - z1);
    line.position.set((x1 + x2) * 0.5, y, (z1 + z2) * 0.5);
    staticGroup.add(line);
  };
  addFloorLine(-273.0, 56.0, -273.0, 61.5, 0x0284c7);
  addFloorLine(-273.0, 59.5, -285.0, 59.5, 0x16a34a);
  addFloorLine(-273.0, 59.5, -256.5, 59.5, 0xdc2626);
  addFloorLine(-265.0, 59.5, -265.0, 77.5, 0x0ea5e9);
  addFloorLine(-273.0, 68.5, -273.0, 83.5, 0x0284c7);
  addFloorLine(-273.0, 81.5, -280.2, 81.5, 0x0ea5e9);
  addFloorLine(-280.2, 81.5, -280.2, 95.5, 0x0ea5e9);

  // Lobby Red Cross Medallion
  const lobbyMedallion = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.015, 24),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 })
  );
  lobbyMedallion.position.set(-273.0, 0.025, 58.2);
  staticGroup.add(lobbyMedallion);
  addBox(-273.18, -272.82, 0.02, 0.04, 57.6, 58.8, erRedMat);
  addBox(-273.6, -272.4, 0.02, 0.04, 58.02, 58.38, erRedMat);

  // Illuminated Atrium Columns across Floors 1..4 + Ceiling LED Grids
  for (let flIdx = 0; flIdx < 4; flIdx++) {
    const baseY = flIdx * HOSPITAL_FLOOR_HEIGHT;
    [
      [-283.5, 59.0],
      [-283.5, 70.0],
      [-262.5, 59.0],
      [-262.5, 70.0],
    ].forEach(([cx, cz]) => {
      addBox(cx - 0.31, cx + 0.31, baseY, baseY + 4.3, cz - 0.31, cz + 0.31, whiteWallMat);
      addBox(cx - 0.35, cx + 0.35, baseY, baseY + 0.42, cz - 0.35, cz + 0.35, counterTealMat);
      addBox(cx - 0.34, cx + 0.34, baseY + 3.72, baseY + 3.86, cz - 0.34, cz + 0.34, mriBoreGlowMat);
    });
    [-289, -273, -253].forEach((lx) => {
      [60, 68, 76].forEach((lz) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 1.3), ceilLedMat);
        panel.position.set(lx, baseY + 4.25, lz);
        staticGroup.add(panel);
      });
    });
  }

  addPlant(-277.4, 0.02, 56.2, 1.05);
  addPlant(-269.6, 0.02, 56.2, 1.05);
  addPlant(-268.2, 0.02, 74.2, 1.1);
  addPlant(-278.5, 0.02, 74.2, 1.1);

  // Digital Self-Check-In Kiosks
  [-268.1, -266.9].forEach((kx) => {
    addBox(kx - 0.27, kx + 0.27, 0, 1.15, 57.28, 57.72, counterTealMat);
    const kHead = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.18), darkMetalMat);
    kHead.position.set(kx, 1.48, 57.5);
    kHead.rotation.x = -0.25;
    staticGroup.add(kHead);
    const kScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.56), monitorScreenMat);
    kScreen.position.set(kx, 1.49, 57.40);
    kScreen.rotation.y = Math.PI;
    kScreen.rotation.x = 0.25;
    staticGroup.add(kScreen);
  });

  // Central Reception & Triage Desk
  addBox(-276.5, -269.5, 0, 1.05, 63.15, 64.45, counterTealMat);
  addBox(-276.2, -269.8, 0.12, 0.84, 63.09, 63.17, warmWoodMat);
  addBox(-276.6, -269.4, 1.05, 1.16, 63.05, 64.55, whiteWallMat);
  addBox(-276.3, -269.7, 1.16, 1.68, 63.22, 63.28, glassFacadeMat);
  [-275.0, -273.0, -271.0].forEach((mx) => {
    addBox(mx - 0.34, mx + 0.34, 1.22, 1.66, 63.82, 63.89, monitorScreenMat);
  });
  addFloorBoard(
    -273.0,
    2.85,
    69.2,
    Math.PI,
    5.2,
    1.95,
    'TIẾP ĐÓN BỆNH NHÂN • TRIAGE',
    ['• QUẦY 01: ĐĂNG KÝ KHÁM BỆNH', '• QUẦY 02: BẢO HIỂM Y TẾ', '• THANG MÁY & CẦU THANG LÊN TẦNG 2-5'],
    '#0284c7'
  );

  // Lounge Benches + Water Dispenser
  addLoungeBenchRow(-280.5, 0.02, 59.4);
  addLoungeBenchRow(-280.5, 0.02, 64.0);
  addBox(-283.46, -282.94, 0, 1.15, 61.44, 61.96, whiteWallMat);
  const waterJug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.20, 0.52, 12),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, roughness: 0.1 })
  );
  waterJug.position.set(-283.2, 1.40, 61.7);
  staticGroup.add(waterJug);

  // 4-Bay Emergency Trauma Wing (East Wing: Z = 59.5, 64.5, 69.5, 74.5)
  [59.5, 64.5, 69.5, 74.5].forEach((bz, idx) => {
    addDetailedHospitalBed(-248.8, 0.02, bz, true, 0x0d9488, idx < 3, false);
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 8), steelMat);
    lampArm.position.set(-248.8, 3.65, bz);
    staticGroup.add(lampArm);
    const lampDish = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.30, 0.14, 14), ceilLedMat);
    lampDish.position.set(-248.8, 2.95, bz);
    staticGroup.add(lampDish);
  });

  // ER Nurse Station + Crash Cart + Wheelchair
  addBox(-260.3, -257.9, 0, 1.05, 64.2, 67.4, erRedMat);
  addBox(-260.4, -257.8, 1.05, 1.15, 64.1, 67.5, whiteWallMat);
  [64.9, 66.7].forEach((mz) => addBox(-258.94, -258.86, 1.20, 1.64, mz - 0.34, mz + 0.34, monitorScreenMat));
  addBox(-259.52, -258.68, 0.04, 1.00, 63.09, 63.71, erRedMat);
  addBox(-259.31, -258.89, 1.00, 1.32, 63.23, 63.57, monitorScreenMat);
  addBox(-249.88, -249.32, 0.48, 0.56, 56.72, 57.28, darkMetalMat);
  addBox(-249.88, -249.32, 0.56, 1.10, 56.71, 56.79, darkMetalMat);
  [-249.92, -249.28].forEach((wx) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), darkMetalMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.34, 57.0);
    staticGroup.add(wheel);
  });

  // GPP Pharmacy (West Wing)
  addBox(-287.25, -286.15, 0, 1.05, 58.9, 66.1, hedgeMat);
  addBox(-287.35, -286.05, 1.05, 1.16, 58.8, 66.2, whiteWallMat);
  addBox(-286.12, -286.07, 1.16, 1.80, 59.1, 65.9, glassFacadeMat);
  addBox(-295.0, -293.8, 0, 2.8, 56.75, 68.25, whiteWallMat);
  const medColors = [0x38bdf8, 0x22c55e, 0xf59e0b, 0xef4444, 0xa855f7, 0xffffff];
  for (let row = 0; row < 3; row++) {
    for (let slot = 0; slot < 12; slot++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.30, 0.52),
        new THREE.MeshStandardMaterial({ color: medColors[(row + slot) % medColors.length], roughness: 0.5 })
      );
      box.position.set(-293.65, 0.85 + row * 0.62, 57.5 + slot * 0.9);
      staticGroup.add(box);
    }
  }
  addFloorBoard(
    -293.72,
    3.2,
    62.5,
    Math.PI / 2,
    4.6,
    1.6,
    'NHÀ THUỐC BỆNH VIỆN',
    ['• ĐẠT CHUẨN GPP', '• CẤP PHÁT THUỐC BHYT 24/7'],
    '#15803d'
  );

  // Rear East MRI 3.0T Glass Suite (X = -261.2 .. -246.8, Z = 79.0 .. 89.0, open doorway X = -260.8..-258.2)
  const mriFloor = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 9.8), erFloorMat);
  mriFloor.rotation.x = -Math.PI / 2;
  mriFloor.position.set(-254.0, 0.03, 83.9);
  staticGroup.add(mriFloor);
  addBox(-261.4, -261.0, 0, 4.3, 79.0, 89.0, whiteWallMat);
  addBox(-258.2, -246.8, 0, 0.95, 78.8, 79.2, whiteWallMat);
  addBox(-261.2, -246.8, 3.25, 4.3, 78.8, 79.2, whiteWallMat);
  addBox(-258.1, -247.0, 0.95, 3.25, 78.93, 79.07, glassFacadeMat);

  const mriBody = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 1.75, 24), whiteWallMat);
  mriBody.rotation.x = Math.PI / 2;
  mriBody.position.set(-253.5, 1.82, 84.8);
  staticGroup.add(mriBody);
  const mriBoreRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.14, 12, 24), mriBoreGlowMat);
  mriBoreRing.position.set(-253.5, 1.82, 83.92);
  staticGroup.add(mriBoreRing);
  const mriBoreDark = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.80, 18), darkMetalMat);
  mriBoreDark.rotation.x = Math.PI / 2;
  mriBoreDark.position.set(-253.5, 1.82, 84.8);
  staticGroup.add(mriBoreDark);
  addBox(-254.8, -252.2, 0, 0.60, 83.9, 85.7, steelMat);
  addBox(-253.94, -253.06, 0, 0.85, 80.95, 83.45, steelMat);
  addBox(-253.92, -253.08, 0.88, 1.02, 81.0, 83.8, sheetMat);
  addBox(-260.7, -258.4, 0, 0.88, 83.0, 83.9, counterTealMat);
  [-260.1, -259.0].forEach((sx) => addBox(sx - 0.35, sx + 0.35, 0.98, 1.48, 83.40, 83.48, monitorScreenMat));
  addFloorBoard(
    -254.0,
    3.8,
    78.75,
    Math.PI,
    5.0,
    1.15,
    'CHẨN ĐOÁN HÌNH ẢNH • MRI 3.0T',
    ['• CHỤP CỘNG HƯỞNG TỪ • CT SCANNER'],
    '#0369a1'
  );

  // Rear West Consultation Suite
  addBox(-296.0, -284.0, 0, 1.0, 75.3, 75.7, whiteWallMat);
  addBox(-296.0, -284.0, 3.3, 4.3, 75.3, 75.7, whiteWallMat);
  addBox(-295.8, -284.2, 1.0, 3.3, 75.44, 75.56, glassFacadeMat);
  addBox(-287.6, -282.8, 0, 0.85, 81.65, 82.95, counterTealMat);
  addBox(-287.7, -282.7, 0.85, 0.95, 81.55, 83.05, whiteWallMat);
  addBox(-285.55, -284.85, 1.0, 1.48, 82.26, 82.34, monitorScreenMat);
  addBox(-293.2, -290.8, 0.14, 0.56, 85.48, 86.52, bedFrameMat);
  addBox(-293.15, -290.85, 0.56, 0.74, 85.51, 86.49, new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.78 }));
  addBox(-293.1, -292.68, 0.74, 0.86, 85.64, 86.36, pillowMat);
  addBox(-289.6, -287.4, 1.75, 2.95, 89.38, 89.50, ceilLedMat);

  // =========================================================================
  // 6. FLOOR 2 (Y = 4.62): KHOA XÉT NGHIỆM (WEST) & KHOA NHI (EAST)
  // =========================================================================
  const y2 = HOSPITAL_FLOOR_HEIGHT;
  // Central Floor 2 Nurse Desk & Signs
  addBox(-275.4, -270.6, y2, y2 + 1.04, 68.1, 69.5, counterTealMat);
  addBox(-275.5, -270.5, y2 + 1.04, y2 + 1.14, 68.0, 69.6, whiteWallMat);
  [-274.2, -271.8].forEach((mx) => addBox(mx - 0.34, mx + 0.34, y2 + 1.18, y2 + 1.62, 68.75, 68.83, monitorScreenMat));
  addPlant(-277.6, y2, 68.8, 0.95);
  addPlant(-268.4, y2, 68.8, 0.95);
  addLoungeBenchRow(-273.0, y2, 62.0);
  addFloorBoard(
    -273.0,
    y2 + 3.0,
    72.5,
    Math.PI,
    5.4,
    1.4,
    'TẦNG 2 • XÉT NGHIỆM & KHOA NHI',
    ['← KHOA XÉT NGHIỆM (HÓA SINH - HUYẾT HỌC)', '→ KHOA NHI (NHI KHOA TỔNG HỢP)'],
    '#0284c7'
  );

  // West Lab Glass Wall (X = -278.4, doorway Z = 65.5..71.5)
  addBox(-278.55, -278.25, y2, y2 + 1.0, 55.2, 65.5, whiteWallMat);
  addBox(-278.55, -278.25, y2 + 1.0, y2 + 3.4, 55.2, 65.5, glassFacadeMat);
  addBox(-278.55, -278.25, y2 + 3.4, y2 + 4.3, 55.2, 65.5, whiteWallMat);
  addBox(-278.55, -278.25, y2, y2 + 1.0, 71.5, 89.5, whiteWallMat);
  addBox(-278.55, -278.25, y2 + 1.0, y2 + 3.4, 71.5, 89.5, glassFacadeMat);
  addBox(-278.55, -278.25, y2 + 3.4, y2 + 4.3, 71.5, 89.5, whiteWallMat);

  // Lab Analyzer Benches & Equipment (West Wing)
  [60.5, 74.5].forEach((bz) => {
    addBox(-294.6, -285.2, y2, y2 + 0.92, bz - 0.8, bz + 0.8, darkMetalMat);
    addBox(-294.7, -285.1, y2 + 0.92, y2 + 1.02, bz - 0.85, bz + 0.85, whiteWallMat);
    // Automated Analyzer Towers + Monitors + Centrifuges
    [-293.0, -289.8, -286.6].forEach((ax) => {
      addBox(ax - 0.65, ax + 0.65, y2 + 1.02, y2 + 1.68, bz - 0.45, bz + 0.45, warmAccentWallMat);
      addBox(ax - 0.45, ax + 0.45, y2 + 1.24, y2 + 1.56, bz - 0.48, bz - 0.43, monitorScreenMat);
    });
  });
  // Blood Bank Glass Refrigerators along West Wall
  [64.5, 67.5, 70.5].forEach((fz) => {
    addBox(-295.3, -293.9, y2, y2 + 2.35, fz - 0.85, fz + 0.85, steelMat);
    addBox(-293.92, -293.84, y2 + 0.35, y2 + 2.15, fz - 0.68, fz + 0.68, glassFacadeMat);
  });
  addBox(-291.8, -284.2, y2, y2 + 0.95, 82.7, 84.3, counterTealMat);
  addBox(-291.9, -284.1, y2 + 0.95, y2 + 1.05, 82.6, 84.4, whiteWallMat);
  addFloorBoard(
    -293.6,
    y2 + 3.2,
    67.5,
    Math.PI / 2,
    4.6,
    1.35,
    'KHOA XÉT NGHIỆM TRUNG TÂM',
    ['• SINH HÓA • HUYẾT HỌC • VI SINH', '• NGÂN HÀNG MÁU ĐẠT CHUẨN ISO'],
    '#0f766e'
  );

  // East Pediatric Ward (Khoa Nhi): 4 Colorful Hospital Beds + Play Corner + Nurse Station
  const pedColors = [0x38bdf8, 0x34d399, 0xfbbf24, 0xf472b6];
  [60.0, 66.0, 72.0, 78.0].forEach((bz, idx) => {
    addDetailedHospitalBed(-248.8, y2 + 0.02, bz, true, pedColors[idx], idx < 3, false);
  });
  addBox(-259.4, -256.6, y2, y2 + 1.02, 64.2, 67.0, new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }));
  addBox(-259.5, -256.5, y2 + 1.02, y2 + 1.12, 64.1, 67.1, whiteWallMat);
  addBox(-258.0, -256.0, y2, y2 + 0.52, 82.0, 84.0, new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 }));
  addFloorBoard(
    -247.0,
    y2 + 3.2,
    69.0,
    -Math.PI / 2,
    4.6,
    1.35,
    'KHOA NHI • PEDIATRICS',
    ['• KHÁM & ĐIỀU TRỊ NỘI TRÚ NHI', '• PHÒNG BỆNH THÂN THIỆN TRẺ EM'],
    '#db2777'
  );

  // =========================================================================
  // 7. FLOOR 3 (Y = 9.22): KHOA NỘI TRÚ (WEST) & HỒI SỨC TÍCH CỰC ICU (EAST)
  // =========================================================================
  const y3 = 2 * HOSPITAL_FLOOR_HEIGHT;
  addBox(-275.4, -270.6, y3, y3 + 1.04, 67.3, 68.7, counterTealMat);
  addBox(-275.5, -270.5, y3 + 1.04, y3 + 1.14, 67.2, 68.8, whiteWallMat);
  [-274.2, -271.8].forEach((mx) => addBox(mx - 0.34, mx + 0.34, y3 + 1.18, y3 + 1.62, 67.95, 68.03, monitorScreenMat));
  addFloorBoard(
    -273.0,
    y3 + 3.0,
    72.5,
    Math.PI,
    5.4,
    1.4,
    'TẦNG 3 • NỘI TRÚ & HỒI SỨC ICU',
    ['← KHOA NỘI TRÚ (GIƯỜNG TIÊU CHUẨN)', '→ HỒI SỨC TÍCH CỰC (ICU 24/7)'],
    '#0369a1'
  );

  // Inpatient Ward (West Wing): 4 Inpatient Beds + Divider Partition
  addBox(-295.6, -282.0, y3, y3 + 1.0, 69.3, 69.7, whiteWallMat);
  addBox(-295.6, -282.0, y3 + 1.0, y3 + 3.3, 69.35, 69.65, glassFacadeMat);
  [59.5, 65.5, 73.5, 79.5].forEach((bz, idx) => {
    addDetailedHospitalBed(-293.2, y3 + 0.02, bz, false, 0x0284c7, idx === 0 || idx === 2, false);
  });
  addFloorBoard(
    -293.6,
    y3 + 3.2,
    62.5,
    Math.PI / 2,
    4.6,
    1.35,
    'KHOA NỘI TRÚ CHẤT LƯỢNG CAO',
    ['• 4 GIƯỜNG BỆNH ĐIỆN ĐA NĂNG', '• OXY TRUNG TÂM & GỌI Y TÁ 24/7'],
    '#0284c7'
  );

  // ICU Wing (East Wing): Glass Front + 4 Full ICU Beds with Ventilators + Monitoring Island
  addBox(-261.35, -261.05, y3, y3 + 1.0, 55.2, 64.5, whiteWallMat);
  addBox(-261.35, -261.05, y3 + 1.0, y3 + 3.4, 55.2, 64.5, glassFacadeMat);
  addBox(-261.35, -261.05, y3 + 3.4, y3 + 4.3, 55.2, 64.5, whiteWallMat);
  addBox(-261.35, -261.05, y3, y3 + 1.0, 70.5, 89.5, whiteWallMat);
  addBox(-261.35, -261.05, y3 + 1.0, y3 + 3.4, 70.5, 89.5, glassFacadeMat);
  addBox(-261.35, -261.05, y3 + 3.4, y3 + 4.3, 70.5, 89.5, whiteWallMat);

  [60.0, 66.0, 72.0, 78.0].forEach((bz) => {
    addDetailedHospitalBed(-248.8, y3 + 0.02, bz, true, 0x0f766e, false, true);
  });
  addBox(-258.4, -255.9, y3, y3 + 1.04, 66.1, 69.7, erRedMat);
  addBox(-258.5, -255.8, y3 + 1.04, y3 + 1.14, 66.0, 69.8, whiteWallMat);
  [66.8, 67.9, 69.0].forEach((mz) => addBox(-256.8, -256.7, y3 + 1.18, y3 + 1.62, mz - 0.3, mz + 0.3, monitorScreenMat));
  addFloorBoard(
    -247.0,
    y3 + 3.2,
    69.0,
    -Math.PI / 2,
    4.6,
    1.35,
    'HỒI SỨC TÍCH CỰC • ICU',
    ['• MÁY THỞ XÂM LẤN & MONITOR TRUNG TÂM', '• CHĂM SÓC ĐẶC BIỆT 24/24'],
    '#dc2626'
  );

  // =========================================================================
  // 8. FLOOR 4 (Y = 13.82): PHÒNG MỔ VÔ TRÙNG (OR-01/02) & PHÒNG HẬU PHẪU
  // =========================================================================
  const y4 = 3 * HOSPITAL_FLOOR_HEIGHT;
  // Surgical Scrub Sinks & Corridor Signs
  addBox(-275.3, -270.7, y4, y4 + 0.92, 67.3, 68.7, steelMat);
  [-274.2, -273.0, -271.8].forEach((fx) => addBox(fx - 0.04, fx + 0.04, y4 + 0.92, y4 + 1.32, 68.25, 68.45, chromeMat));
  addFloorBoard(
    -273.0,
    y4 + 3.0,
    72.5,
    Math.PI,
    5.4,
    1.4,
    'TẦNG 4 • KHOA PHẪU THUẬT & HẬU PHẪU',
    ['← PHÒNG MỔ VÔ TRÙNG (OR-01 & OR-02)', '→ PHÒNG HỒI TỈNH / HẬU PHẪU'],
    '#0f766e'
  );

  // West Wing OR Glass Partition (doorways Z=61..65 & 76..80)
  addBox(-278.55, -278.25, y4, y4 + 1.0, 55.2, 61.0, whiteWallMat);
  addBox(-278.55, -278.25, y4 + 1.0, y4 + 3.3, 55.2, 61.0, glassFacadeMat);
  addBox(-278.55, -278.25, y4, y4 + 1.0, 65.0, 76.0, whiteWallMat);
  addBox(-278.55, -278.25, y4 + 1.0, y4 + 3.3, 65.0, 76.0, glassFacadeMat);
  addBox(-278.55, -278.25, y4, y4 + 1.0, 80.0, 89.5, whiteWallMat);
  addBox(-278.55, -278.25, y4 + 1.0, y4 + 3.3, 80.0, 89.5, glassFacadeMat);
  addBox(-295.6, -278.4, y4, y4 + 4.3, 71.3, 71.7, whiteWallMat); // Divider between OR-01 & OR-02

  // 2 Complete Operating Suites (OR-01 at Z=63.0, OR-02 at Z=80.0)
  [63.0, 80.0].forEach((oz, orIdx) => {
    // Hydraulic Operating Table
    addBox(-289.1, -287.7, y4, y4 + 0.78, oz - 0.42, oz + 0.42, steelMat);
    addBox(-290.0, -286.8, y4 + 0.78, y4 + 0.96, oz - 0.55, oz + 0.55, darkMetalMat);
    addBox(-289.8, -287.0, y4 + 0.96, y4 + 1.06, oz - 0.48, oz + 0.48, new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.75 }));
    // Dual-dome overhead shadowless surgical lamps
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 10), chromeMat);
    stem.position.set(-288.4, y4 + 3.65, oz);
    staticGroup.add(stem);
    [-0.75, 0.75].forEach((lx) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), chromeMat);
      arm.position.set(-288.4 + lx * 0.5, y4 + 3.12, oz);
      staticGroup.add(arm);
      const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 0.16, 16), ceilLedMat);
      dome.position.set(-288.4 + lx, y4 + 2.95, oz);
      staticGroup.add(dome);
    });
    // Anesthesia Station & Mayo Instrument Stand
    addBox(-291.5, -290.5, y4, y4 + 1.35, oz - 1.35, oz - 0.65, steelMat);
    addBox(-291.3, -290.7, y4 + 1.35, y4 + 1.72, oz - 1.25, oz - 0.75, monitorScreenMat);
    addBox(-287.0, -286.1, y4, y4 + 0.92, oz + 0.95, oz + 1.55, chromeMat);
    addFloorBoard(
      -295.4,
      y4 + 3.1,
      oz,
      Math.PI / 2,
      3.8,
      1.15,
      `PHÒNG MỔ VÔ TRÙNG • OR-0${orIdx + 1}`,
      ['• ÁP LỰC DƯƠNG • ĐÈN MỔ LED ĐÔI'],
      '#0f766e'
    );
  });

  // East Wing Post-Op Recovery (4 Beds)
  [60.0, 66.0, 72.0, 78.0].forEach((bz, idx) => {
    addDetailedHospitalBed(-248.8, y4 + 0.02, bz, true, 0x0ea5e9, idx < 3, false);
  });
  addBox(-259.1, -256.5, y4, y4 + 1.04, 65.9, 69.1, counterTealMat);
  addBox(-259.2, -256.4, y4 + 1.04, y4 + 1.14, 65.8, 69.2, whiteWallMat);
  addFloorBoard(
    -247.0,
    y4 + 3.2,
    69.0,
    -Math.PI / 2,
    4.6,
    1.35,
    'PHÒNG HỒI TỈNH • HẬU PHẪU',
    ['• THEO DÕI SINH HIỆU SAU MỔ 24/7'],
    '#0284c7'
  );

  // =========================================================================
  // 9. FLOOR 5 (Y = 18.42): ROOFTOP HELIPAD ("H"), PARAPET, SIGN & HEALING GARDEN
  // =========================================================================
  const y5 = 4 * HOSPITAL_FLOOR_HEIGHT;
  // Perimeter safety parapet (lower wall + glass balustrade)
  addBox(-296.2, -245.8, y5, y5 + 0.45, 54.8, 55.25, whiteWallMat);
  addBox(-296.2, -245.8, y5 + 0.45, y5 + 1.25, 54.96, 55.12, glassFacadeMat);
  addBox(-296.2, -245.8, y5, y5 + 0.45, 89.6, 90.15, whiteWallMat);
  addBox(-296.2, -245.8, y5 + 0.45, y5 + 1.25, 89.76, 89.94, glassFacadeMat);
  addBox(-296.2, -295.6, y5, y5 + 0.45, 55.0, 90.0, whiteWallMat);
  addBox(-295.98, -295.82, y5 + 0.45, y5 + 1.25, 55.2, 89.8, glassFacadeMat);
  addBox(-246.4, -245.8, y5, y5 + 0.45, 55.0, 90.0, whiteWallMat);
  addBox(-246.18, -246.02, y5 + 0.45, y5 + 1.25, 55.2, 89.8, glassFacadeMat);

  // Giant Roof Sign & Red Cross Crown facing North toward West Intersection
  const roofSignBacking = new THREE.Mesh(new THREE.BoxGeometry(20.0, 3.6, 0.45), darkMetalMat);
  roofSignBacking.position.set(-279.0, y5 + 3.0, 55.15);
  staticGroup.add(roofSignBacking);
  const roofSignBoard = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 3.4), mainSignMat);
  roofSignBoard.rotation.y = Math.PI;
  roofSignBoard.position.set(-279.0, y5 + 3.0, 54.90);
  staticGroup.add(roofSignBoard);

  const crossGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xef4444,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  neonMats.push(crossGlowMat);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.2, 0.55), crossGlowMat);
  crossV.position.set(-265.8, y5 + 3.2, 55.15);
  staticGroup.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.3, 0.55), crossGlowMat);
  crossH.position.set(-265.8, y5 + 3.2, 55.15);
  staticGroup.add(crossH);

  // Rooftop Helipad ("H") on West Deck
  const helipadTex = createHelipadTex();
  const helipadMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(14.0, 14.0),
    new THREE.MeshStandardMaterial({ map: helipadTex, roughness: 0.65 })
  );
  helipadMesh.rotation.x = -Math.PI / 2;
  helipadMesh.position.set(-283.0, y5 + 0.03, 70.0);
  staticGroup.add(helipadMesh);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  [
    [-6.6, -6.6],
    [6.6, -6.6],
    [-6.6, 6.6],
    [6.6, 6.6],
  ].forEach(([bx, bz]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), beaconMat);
    b.position.set(-283.0 + bx, y5 + 0.16, 70.0 + bz);
    b.userData.noMerge = true;
    staticGroup.add(b);
  });

  // Rooftop Healing Garden (East Deck: Pergola, Benches, Planter Trees)
  addBox(-256.8, -254.2, y5, y5 + 0.52, 63.1, 64.1, warmWoodMat);
  addBox(-256.8, -254.2, y5, y5 + 0.52, 73.1, 74.1, warmWoodMat);
  [
    [-259.0, 61.0],
    [-251.5, 61.0],
    [-259.0, 76.0],
    [-251.5, 76.0],
  ].forEach(([px, pz]) => {
    addBox(px - 0.14, px + 0.14, y5, y5 + 2.8, pz - 0.14, pz + 0.14, darkMetalMat);
  });
  for (let b = 0; b < 5; b++) {
    addBox(-259.3, -251.2, y5 + 2.75, y5 + 2.9, 61.2 + b * 3.6, 61.5 + b * 3.6, warmWoodMat);
  }
  addPlant(-251.0, y5, 65.5, 1.2);
  addPlant(-251.0, y5, 71.5, 1.2);
  addPlant(-259.5, y5, 68.5, 1.15);

  // Calibrated Hospital Interior + Exterior Facade / Forecourt Lights
  const addHospitalScaledLight = (color: number, x: number, y: number, z: number, dist: number, dayInt: number, nightInt: number) => {
    const l = new THREE.PointLight(color, nightInt, dist, 0.95);
    l.position.set(x, y, z);
    scaledLights.push({
      light: l,
      dayInt,
      nightInt,
      getScale: () => 1.0,
    });
  };
  addHospitalScaledLight(0xe0f2fe, -272.0, 4.0, 68.0, 48, 12, 34); // Atrium Ground
  addHospitalScaledLight(0xf8fafc, -273.0, 5.2, 48.5, 40, 8, 36); // Main Entrance Forecourt & Canopy
  addHospitalScaledLight(0xfff1f2, -251.9, 4.8, 48.5, 34, 7, 30); // ER Driveway & Ambulance Bay
  addHospitalScaledLight(0xe0f2fe, -290.0, 5.2, 49.5, 34, 6, 28); // West Campus Forecourt
  addHospitalScaledLight(0xe0f2fe, -271.0, 13.5, 48.0, 54, 6, 32); // 5-Floor Front Facade Wash

  // =========================================================================
  // 9B. REAR VISITOR & PATIENT PARKING LOT (MOTORBIKES + CARS + GUARD GATE)
  // Footprint: X = -300.5 .. -241.0, Z = 90.2 .. 133.4
  // =========================================================================
  const rearAsphalt = new THREE.Mesh(new THREE.PlaneGeometry(59.6, 38.2), driveAsphaltMat);
  rearAsphalt.rotation.x = -Math.PI / 2;
  rearAsphalt.position.set(-270.9, 0.008, 114.3);
  staticGroup.add(rearAsphalt);

  // Rear building sidewalk connecting East/West walkways & Rear Entrance Door
  const rearSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(59.6, 5.0), plazaWalkMat);
  rearSidewalk.rotation.x = -Math.PI / 2;
  rearSidewalk.position.set(-270.9, 0.015, 92.7);
  staticGroup.add(rearSidewalk);

  // Raised Pedestrian Spine connecting Rear Door (-280.2, 90.0) across Parking Lot to Z=122.4
  const pedWalkSpine = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 26.8), plazaWalkMat);
  pedWalkSpine.rotation.x = -Math.PI / 2;
  pedWalkSpine.position.set(-280.2, 0.018, 109.0);
  staticGroup.add(pedWalkSpine);
  const paintLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const bluePriorityMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.55 });
  const polyCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.18,
    metalness: 0.15,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });

  // Zebra Crosswalk across Entry Drive Aisle (Z = 96.4 .. 103.6)
  for (let x = -282.4; x <= -278.0; x += 0.9) {
    const zBar = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 6.4), paintLineMat);
    zBar.rotation.x = -Math.PI / 2;
    zBar.position.set(x, 0.022, 99.8);
    staticGroup.add(zBar);
  }
  // Yellow-black safety bollards along pedestrian walkway (Z = 104.5 .. 121.5)
  for (let bz = 105.0; bz <= 121.0; bz += 4.0) {
    [-282.8, -277.6].forEach((bx) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 10), yellowPaintMat);
      post.position.set(bx, 0.425, bz);
      staticGroup.add(post);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 10), darkMetalMat);
      cap.position.set(bx, 0.78, bz);
      staticGroup.add(cap);
    });
  }

  // Driveway dashed center lane markings (East Gate -242.5 -> West Turnaround -296.5)
  for (let dx = -295.0; dx <= -245.5; dx += 4.2) {
    if (dx > -283.5 && dx < -277.0) continue; // Clear crosswalk
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.15), yellowPaintMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(dx, 0.014, 100.0);
    staticGroup.add(dash);
  }
  for (let dx = -295.0; dx <= -245.5; dx += 4.2) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.15), yellowPaintMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(dx, 0.014, 121.8);
    staticGroup.add(dash);
  }

  // East Driveway Gate, Guard Booth & Automated Barrier Arms (X = -244.4..-241.8, Z = 96.0..105.0)
  addBox(-244.4, -242.0, 0, 1.05, 99.7, 101.5, counterTealMat);
  addBox(-244.5, -241.9, 1.05, 1.15, 99.6, 101.6, whiteWallMat);
  addBox(-244.3, -242.1, 1.15, 2.35, 99.8, 101.4, glassFacadeMat);
  addBox(-244.7, -241.7, 2.35, 2.65, 99.4, 101.8, darkMetalMat);
  addBox(-243.6, -242.8, 1.18, 1.58, 100.4, 100.8, monitorScreenMat);
  addFloorBoard(-243.2, 2.95, 100.6, Math.PI / 2, 1.9, 0.65, 'BẢO VỆ 24/7', ['• KIỂM SOÁT VÉ XE'], '#0284c7');

  // Overhead Gate Archway Sign ("BÃI ĐỖ XE BỆNH VIỆN • NGƯỜI THĂM & BỆNH NHÂN")
  [-242.6].forEach((gx) => {
    addBox(gx - 0.18, gx + 0.18, 0, 4.6, 95.8, 96.2, darkMetalMat);
    addBox(gx - 0.18, gx + 0.18, 0, 4.6, 104.8, 105.2, darkMetalMat);
    addBox(gx - 0.25, gx + 0.25, 4.2, 4.65, 95.7, 105.3, darkMetalMat);
  });
  const gateTex = createHospitalBannerTex(
    'BÃI ĐỖ XE BỆNH VIỆN • NGƯỜI THĂM',
    'XE MÁY CÓ MÁI CHE • Ô TÔ KHÁCH • HOẠT ĐỘNG 24/7',
    '#0f172a',
    '#38bdf8',
    true
  );
  const gateSignMat = new THREE.MeshStandardMaterial({
    map: gateTex,
    emissive: 0xffffff,
    emissiveMap: gateTex,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });
  neonMats.push(gateSignMat);
  const gateSignEast = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.35), gateSignMat);
  gateSignEast.rotation.y = Math.PI / 2;
  gateSignEast.position.set(-242.32, 4.95, 100.5);
  staticGroup.add(gateSignEast);
  const gateSignWest = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.35), gateSignMat);
  gateSignWest.rotation.y = -Math.PI / 2;
  gateSignWest.position.set(-242.88, 4.95, 100.5);
  staticGroup.add(gateSignWest);

  // Entry & Exit Barrier Pedestals + Animated Striped Barrier Arms
  const buildBarrierArm = (bx: number, bz: number, dirSign: number) => {
    addBox(bx - 0.18, bx + 0.18, 0, 1.15, bz - 0.18, bz + 0.18, yellowPaintMat);
    const pivot = new THREE.Group();
    pivot.position.set(bx, 0.98, bz);
    pivot.userData.noMerge = true;
    for (let s = 0; s < 6; s++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.10, 0.44),
        s % 2 === 0 ? erRedMat : paintLineMat
      );
      seg.position.set(0, 0, dirSign * (0.30 + s * 0.44));
      pivot.add(seg);
    }
    staticGroup.add(pivot);
    return pivot;
  };
  const rearGateBarEntry = buildBarrierArm(-243.1, 99.3, -1);
  const rearGateBarExit = buildBarrierArm(-243.1, 101.8, 1);

  // Parking Information Pylon beside Rear Walkway
  addBox(-276.9, -276.3, 0, 2.8, 103.3, 103.7, darkMetalMat);
  addFloorBoard(
    -276.6,
    2.0,
    103.26,
    Math.PI,
    1.85,
    1.15,
    'SƠ ĐỒ BÃI ĐỖ XE',
    ['← XE MÁY (CÓ MÁI CHE)', '→ Ô TÔ ƯU TIÊN & KHÁCH', '↓ CỔNG VÀO BỆNH VIỆN'],
    '#0369a1'
  );

  // ZONE A: Covered Motorbike Parking Sheds (West-Center: X = -298.6..-284.4, Z = 105.6..119.8)
  const buildMotorbikeShed = (zCenter: number, label: string) => {
    // 6 steel support posts
    [-298.2, -291.5, -284.8].forEach((px) => {
      [-1.9, 1.9].forEach((oz) => {
        addBox(px - 0.11, px + 0.11, 0, 2.85, zCenter + oz - 0.11, zCenter + oz + 0.11, darkMetalMat);
      });
      addBox(px - 0.12, px + 0.12, 2.75, 2.95, zCenter - 2.35, zCenter + 2.35, darkMetalMat);
    });
    // Translucent polycarbonate curved-style canopy roof + under-canopy LED strip
    addBox(-298.7, -284.3, 2.95, 3.04, zCenter - 2.45, zCenter + 2.45, polyCanopyMat);
    addBox(-298.7, -284.3, 2.94, 3.05, zCenter - 2.48, zCenter - 2.36, trimTealMat);
    addBox(-298.7, -284.3, 2.94, 3.05, zCenter + 2.36, zCenter + 2.48, trimTealMat);
    const underLed = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.06, 0.24), ceilLedMat);
    underLed.position.set(-291.5, 2.88, zCenter);
    staticGroup.add(underLed);

    // Wheel-stop galvanized rail + 8 white painted motorbike stalls
    addBox(-298.0, -285.0, 0.04, 0.16, zCenter - 0.06, zCenter + 0.06, steelMat);
    for (let sx = -298.0; sx <= -284.8; sx += 1.65) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 4.3), paintLineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(sx, 0.015, zCenter);
      staticGroup.add(line);
    }
    addFloorBoard(-284.55, 2.45, zCenter, Math.PI / 2, 2.4, 0.65, label, ['• GIỮ XE MÁY NGƯỜI THĂM'], '#0284c7');
  };
  buildMotorbikeShed(107.9, 'KHU XE MÁY A');
  buildMotorbikeShed(117.5, 'KHU XE MÁY B');

  // Composite Multi-Part Parked Motorbike Builder (8 distinct parts)
  const buildParkedMotorbike = (
    x: number,
    z: number,
    yaw: number,
    bodyHex: number,
    isScooter: boolean
  ) => {
    const bike = new THREE.Group();
    bike.position.set(x, 0.01, z);
    bike.rotation.y = yaw;

    const bMat = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.28, metalness: 0.35 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.45 });

    // Front & rear tires + alloy rims
    [0.54, -0.54].forEach((wz) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.11, 14), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(0, 0.24, wz);
      bike.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10), chromeMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(0, 0.24, wz);
      bike.add(rim);
    });
    // Lower chassis & footrest / engine block
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 1.05), isScooter ? bMat : darkMetalMat);
    frame.position.set(0, 0.38, -0.02);
    bike.add(frame);
    // Front leg shield / fairing + front fender
    const frontApron = new THREE.Mesh(new THREE.BoxGeometry(isScooter ? 0.42 : 0.32, 0.62, 0.26), bMat);
    frontApron.position.set(0, 0.68, 0.42);
    frontApron.rotation.x = -0.22;
    bike.add(frontApron);
    // Stepped seat + rear body cowl
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.76), seatMat);
    seat.position.set(0, 0.72, -0.22);
    bike.add(seat);
    const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.56), bMat);
    tailCowl.position.set(0, 0.58, -0.34);
    bike.add(tailCowl);
    // Handlebars + headlight + mirrors
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.07), chromeMat);
    hBar.position.set(0, 0.98, 0.34);
    bike.add(hBar);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.08), hlMat);
    hl.position.set(0, 0.92, 0.47);
    bike.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), erRedMat);
    tl.position.set(0, 0.60, -0.63);
    bike.add(tl);
    staticGroup.add(bike);
  };

  const bikeColors = [0xf8fafc, 0xdc2626, 0x0ea5e9, 0x1e293b, 0x10b981, 0xfef3c7, 0x2563eb];
  const bikeSlots: Array<[number, number, number, boolean]> = [
    [-297.1, 106.8, 0.08, true],
    [-295.4, 106.8, -0.05, false],
    [-293.8, 106.9, 0.04, true],
    [-290.6, 106.8, -0.06, true],
    [-288.9, 109.0, Math.PI + 0.05, false],
    [-287.2, 109.0, Math.PI - 0.06, true],
    [-285.6, 109.0, Math.PI, true],
    [-297.1, 116.4, -0.04, true],
    [-295.4, 116.4, 0.07, true],
    [-292.2, 118.6, Math.PI - 0.05, false],
    [-290.6, 118.6, Math.PI + 0.04, true],
    [-287.2, 116.4, 0.02, false],
    [-285.6, 118.6, Math.PI - 0.08, true],
  ];
  bikeSlots.forEach(([bx, bz, byaw, scooter], idx) => {
    buildParkedMotorbike(bx, bz, byaw, bikeColors[idx % bikeColors.length], scooter);
  });

  // ZONE B: Visitor & Accessible Car Parking Stalls + Multi-Part Cars
  const paintCarBay = (cx: number, cz: number, isAccessible = false) => {
    [-1.85, 1.85].forEach((ox) => {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 5.4), paintLineMat);
      side.rotation.x = -Math.PI / 2;
      side.position.set(cx + ox, 0.015, cz);
      staticGroup.add(side);
    });
    const endCap = new THREE.Mesh(new THREE.PlaneGeometry(3.83, 0.13), paintLineMat);
    endCap.rotation.x = -Math.PI / 2;
    endCap.position.set(cx, 0.015, cz + 2.7);
    staticGroup.add(endCap);
    // Concrete wheel-stop curb
    addBox(cx - 1.25, cx + 1.25, 0.0, 0.13, cz + 1.95, cz + 2.20, yellowPaintMat);
    if (isAccessible) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 5.0), bluePriorityMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(cx, 0.012, cz);
      staticGroup.add(pad);
      // White wheelchair/cross symbol on accessible bay
      const badge = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 18), paintLineMat);
      badge.rotation.x = -Math.PI / 2;
      badge.position.set(cx, 0.017, cz - 0.2);
      staticGroup.add(badge);
    }
  };

  // Priority Car Row (East of Pedestrian Walkway: Z = 108.4, 6 stalls)
  [-273.5, -269.5, -265.5, -261.5, -257.5, -253.5].forEach((cx, idx) => {
    paintCarBay(cx, 108.4, idx < 2);
  });
  // Main South Visitor Car Row (Z = 127.6, 10 stalls)
  [-295.0, -290.5, -286.0, -281.5, -277.0, -271.5, -267.0, -262.5, -258.0, -253.5].forEach((cx) => {
    paintCarBay(cx, 127.6, false);
  });

  // Composite Multi-Part Parked Visitor Car Builder
  const buildParkedVisitorCar = (
    x: number,
    z: number,
    yaw: number,
    bodyHex: number,
    isSuv: boolean
  ) => {
    const builtCar = buildCityCarMesh({
      color: bodyHex,
      variant: isSuv ? 'suv' : 'sedan',
      headlightIntensity: 0.25,
      brakeIntensity: 0.15,
      noMerge: false,
    });
    builtCar.group.position.set(x, 0.01, z);
    builtCar.group.rotation.y = yaw;
    staticGroup.add(builtCar.group);
  };

  // 4 cars in Priority Row + 6 cars in South Row (leaving open visitor stalls!)
  const carSpecs: Array<[number, number, number, number, boolean]> = [
    [-273.5, 108.4, Math.PI, 0xf8fafc, true],
    [-265.5, 108.4, Math.PI + 0.03, 0x94a3b8, false],
    [-261.5, 108.4, Math.PI - 0.02, 0x1e3a8a, true],
    [-253.5, 108.4, Math.PI, 0x0f766e, false],
    [-295.0, 127.6, Math.PI, 0x334155, true],
    [-290.5, 127.6, Math.PI + 0.03, 0xf8fafc, false],
    [-281.5, 127.6, Math.PI - 0.03, 0x991b1b, true],
    [-271.5, 127.6, Math.PI, 0xcbd5e1, false],
    [-262.5, 127.6, Math.PI + 0.02, 0x0284c7, true],
    [-253.5, 127.6, Math.PI - 0.02, 0x1e293b, false],
  ];
  carSpecs.forEach(([cx, cz, cyaw, col, suv]) => buildParkedVisitorCar(cx, cz, cyaw, col, suv));

  // Parking Lot Dual-Head Light Poles (6 fixtures)
  const parkingLampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.8,
  });
  lanternMats.push(parkingLampGlowMat);
  [
    [-294.0, 95.6],
    [-264.0, 95.6],
    [-294.0, 132.4],
    [-277.0, 132.4],
    [-256.0, 132.4],
    [-245.5, 113.0],
  ].forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 5.2, 10), darkMetalMat);
    pole.position.set(lx, 2.6, lz);
    staticGroup.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.14), darkMetalMat);
    arm.position.set(lx, 5.15, lz);
    staticGroup.add(arm);
    [-0.55, 0.55].forEach((ox) => {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.24), parkingLampGlowMat);
      head.position.set(lx + ox, 5.06, lz);
      staticGroup.add(head);
    });
    addHospitalGroundPool(lx, lz, 14.0);
  });

  // Calibrated Rear Parking Lot & Rear Entrance Door PointLights
  addHospitalScaledLight(0xe0f2fe, -275.0, 7.2, 112.0, 65, 8, 34);
  addHospitalScaledLight(0xfef3c7, -280.2, 4.4, 93.8, 30, 6, 28);

  // =========================================================================
  // 10. REAL-TIME DOOR, HELIPAD, GATE BARRIER & ELEVATOR KINEMATICS LOOP
  // =========================================================================
  let erDoorOpen = 0;
  let mainDoorOpen = 0;
  let rearDoorOpen = 0;
  let barrierLift = 0.28;
  let beaconClock = 0;

  const update = (
    delta: number,
    _rawHour: number,
    lampFactor: number,
    playerPos?: THREE.Vector3,
    npcNearRearDoor = false
  ) => {
    const dt = Math.min(delta, 0.1);
    beaconClock += dt;

    const pulse = 0.5 + 0.5 * Math.sin(beaconClock * 5.2);
    beaconMat.emissiveIntensity = 0.5 + (0.7 + lampFactor * 0.9) * pulse;

    let wantErOpen = false;
    let wantMainOpen = false;
    let wantRearOpen = npcNearRearDoor;
    let wantBarrierOpen = false;
    if (playerPos && playerPos.y < 3.0) {
      const distEr = Math.hypot(playerPos.x - -253.5, playerPos.z - 55.0);
      const distMain = Math.hypot(playerPos.x - -273.0, playerPos.z - 55.0);
      const distRear = Math.hypot(playerPos.x - -280.2, playerPos.z - 89.9);
      const distGate = Math.hypot(playerPos.x - -243.1, playerPos.z - 100.5);
      wantErOpen = distEr < 6.0;
      wantMainOpen = distMain < 6.5;
      wantRearOpen = wantRearOpen || distRear < 6.5;
      wantBarrierOpen = distGate < 7.5;
    }
    erDoorOpen = THREE.MathUtils.damp(erDoorOpen, wantErOpen ? 1 : 0, 7.0, dt);
    mainDoorOpen = THREE.MathUtils.damp(mainDoorOpen, wantMainOpen ? 1 : 0, 7.0, dt);
    rearDoorOpen = THREE.MathUtils.damp(rearDoorOpen, wantRearOpen ? 1 : 0, 7.0, dt);
    barrierLift = THREE.MathUtils.damp(barrierLift, wantBarrierOpen ? 1.15 : 0.22, 5.0, dt);

    erDoorL.position.x = -254.5 - erDoorOpen * 1.65;
    erDoorR.position.x = -252.5 + erDoorOpen * 1.65;
    mainDoorL.position.x = -274.5 - mainDoorOpen * 2.45;
    mainDoorR.position.x = -271.5 + mainDoorOpen * 2.45;
    rearDoorL.position.x = -281.09 - rearDoorOpen * 1.52;
    rearDoorR.position.x = -279.31 + rearDoorOpen * 1.52;
    rearGateBarEntry.rotation.x = barrierLift;
    rearGateBarExit.rotation.x = -barrierLift;

    // Step each elevator state machine
    for (let i = 0; i < internalElevators.length; i++) {
      const e = internalElevators[i];
      const playerInsideCab =
        playerPos !== undefined &&
        playerPos.x >= e.api.cabMinX &&
        playerPos.x <= e.api.cabMaxX &&
        playerPos.z >= e.api.cabMinZ &&
        playerPos.z <= e.api.cabMaxZ &&
        Math.abs(playerPos.y - e.currentY) < 1.2;
      const playerAtLanding =
        playerPos !== undefined &&
        Math.hypot(playerPos.x - e.x, playerPos.z - (ELEV_DOOR_Z - 1.1)) < 2.2 &&
        Math.abs(playerPos.y - (e.currentFloor - 1) * HOSPITAL_FLOOR_HEIGHT) < 1.2;

      if (e.state === 'idle') {
        if (e.queue.length > 0) {
          const next = e.queue[0];
          if (next === e.currentFloor) {
            e.queue.shift();
            e.state = 'door_opening';
          } else {
            e.targetFloor = e.queue.shift()!;
            e.state = 'moving';
          }
        } else if (playerAtLanding && e.doorOpen < 0.05) {
          e.state = 'door_opening';
        }
      } else if (e.state === 'door_opening') {
        e.doorOpen = Math.min(1, e.doorOpen + dt * 1.35);
        if (e.doorOpen >= 1) {
          e.state = 'boarding';
          e.timer = 2.8;
        }
      } else if (e.state === 'boarding') {
        if (playerAtLanding) {
          e.timer = Math.max(e.timer, 0.8);
        }
        e.timer -= dt;
        if (e.timer <= 0) {
          e.state = 'door_closing';
        }
      } else if (e.state === 'door_closing') {
        if (playerAtLanding && !playerInsideCab && e.queue.length === 0) {
          e.state = 'door_opening';
        } else {
          e.doorOpen = Math.max(0, e.doorOpen - dt * 1.35);
          if (e.doorOpen <= 0) {
            if (e.queue.length > 0) {
              const next = e.queue.shift()!;
              if (next === e.currentFloor) {
                e.state = 'door_opening';
              } else {
                e.targetFloor = next;
                e.state = 'moving';
              }
            } else {
              e.state = 'idle';
            }
          }
        }
      } else if (e.state === 'moving') {
        const destY = (e.targetFloor - 1) * HOSPITAL_FLOOR_HEIGHT;
        const diff = destY - e.currentY;
        const step = 2.6 * dt; // ~1.77s per floor
        if (Math.abs(diff) <= step) {
          e.currentY = destY;
          e.currentFloor = e.targetFloor;
          e.state = 'door_opening';
        } else {
          e.currentY += Math.sign(diff) * step;
          e.currentFloor = Math.max(1, Math.min(HOSPITAL_FLOOR_COUNT, Math.round(e.currentY / HOSPITAL_FLOOR_HEIGHT) + 1));
        }
      }

      // Sync cabin Y and open/close ONLY the current floor's landing doors when aligned
      e.cabinGroup.position.y = e.currentY;
      const cabSlide = e.doorOpen * 0.96;
      e.cabDoorL.position.x = -0.53 - cabSlide;
      e.cabDoorR.position.x = 0.53 + cabSlide;

      for (let fl = 0; fl < e.landingDoors.length; fl++) {
        const isAligned = Math.abs(e.currentY - fl * HOSPITAL_FLOOR_HEIGHT) < 0.08;
        const slide = isAligned ? e.doorOpen * 0.98 : 0;
        e.landingDoors[fl].left.position.x = e.x - 0.58 - slide;
        e.landingDoors[fl].right.position.x = e.x + 0.58 + slide;
      }

      // Update floor indicator displays
      const dir: -1 | 0 | 1 =
        e.state === 'moving' ? (e.targetFloor > e.currentFloor ? 1 : -1) : 0;
      for (let fl = 0; fl < e.displays.length; fl++) {
        e.displays[fl].draw(e.currentFloor, dir);
      }
    }
  };

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    elevators: internalElevators.map((e) => e.api),
    update,
  };
}

// =========================================================================
// AMBULANCE 115 FLEET CONTROLLER (PARKS AT ER BAY & PATROLS BOULEVARD 24/7)
// =========================================================================

interface AmbulanceUnit {
  id: string;
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  redLedMat: THREE.MeshStandardMaterial;
  blueLedMat: THREE.MeshStandardMaterial;
  bayX: number;
  bayZ: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  cruiseSpeed: number;
  state:
    | 'parked_in_bay'
    | 'exiting_bay'
    | 'cruise_east'
    | 'u_turn_east'
    | 'cruise_west'
    | 'entering_bay'
    | 'cruise_ns'
    | 'u_turn_ns'
    | 'cruise_bd'
    | 'u_turn_bd'
    | 'turn_curve';
  waitTimer: number;
  turnProgress: number;
  startX: number;
  startZ: number;
  laneZ: number;
  laneSwitchCooldown: number;
  emergencyCode3: boolean;
  sirenCooldown: number;
  phaseOffset: number;
  uTurnTargetX: number;
  patrolTripCount: number;
  nsCenterX: number;
  nsLaneX: number;
  nsDir: 1 | -1;
  bdLaneZ: number;
  bdDir: 1 | -1;
  turnCtrlX: number;
  turnCtrlZ: number;
  turnEndX: number;
  turnEndZ: number;
  turnDuration: number;
  turnNextState: 'cruise_ns' | 'cruise_bd' | 'cruise_west' | 'cruise_east';
}

function createAmbulanceSideDecalTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 192);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 124, 512, 34);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 158, 512, 16);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(46, 26, 22, 68);
  ctx.fillRect(23, 49, 68, 22);

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(106, 98);
  ctx.lineTo(148, 98);
  ctx.lineTo(160, 74);
  ctx.lineTo(172, 114);
  ctx.lineTo(186, 60);
  ctx.lineTo(198, 108);
  ctx.lineTo(212, 98);
  ctx.lineTo(486, 98);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('XE CẤP CỨU', 112, 46);
  ctx.fillStyle = '#0369a1';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('EMERGENCY AMBULANCE • ICU', 112, 78);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAmbulanceChevronTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = '#dc2626';
  for (let i = -4; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(128, i * 38);
    ctx.lineTo(256, i * 38 + 46);
    ctx.lineTo(256, i * 38 + 68);
    ctx.lineTo(128, i * 38 + 22);
    ctx.lineTo(0, i * 38 + 68);
    ctx.lineTo(0, i * 38 + 46);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(36, 56, 184, 58);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dc2626';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('CẤP CỨU', 128, 86);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildAmbulanceMesh(unitNum: string): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  redLedMat: THREE.MeshStandardMaterial;
  blueLedMat: THREE.MeshStandardMaterial;
} {
  const grp = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.22 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.65 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.82 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.88 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.7 });

  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.0 });
  const taillightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.8 });
  const redLedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 });
  const blueLedMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.2 });

  const boxBody = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.66, 3.55), whiteMat);
  boxBody.position.set(0, 1.32, -0.78);
  grp.add(boxBody);

  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.10, 3.58), blueMat);
  roofTrim.position.set(0, 2.15, -0.78);
  grp.add(roofTrim);

  const aeroCap = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.42, 0.92), whiteMat);
  aeroCap.position.set(0, 1.92, 1.26);
  aeroCap.rotation.x = 0.28;
  grp.add(aeroCap);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.00, 1.24, 1.56), whiteMat);
  cab.position.set(0, 1.08, 1.66);
  grp.add(cab);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.76, 0.78), whiteMat);
  hood.position.set(0, 0.83, 2.40);
  grp.add(hood);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.62, 0.10), glassMat);
  windshield.position.set(0, 1.38, 2.26);
  windshield.rotation.x = -0.28;
  grp.add(windshield);

  [-1.01, 1.01].forEach((sx) => {
    const cabWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.84), glassMat);
    cabWin.position.set(sx, 1.38, 1.72);
    grp.add(cabWin);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), darkMat);
    mirrorArm.position.set(sx * 1.12, 1.24, 2.15);
    grp.add(mirrorArm);
    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.14), darkMat);
    mirrorHousing.position.set(sx * 1.22, 1.26, 2.14);
    grp.add(mirrorHousing);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), darkMat);
    handle.position.set(sx, 1.02, 1.52);
    grp.add(handle);
  });

  const sideDecalMat = new THREE.MeshStandardMaterial({ map: createAmbulanceSideDecalTex(), roughness: 0.35 });
  const sidePanelL = new THREE.Mesh(new THREE.PlaneGeometry(3.42, 1.12), sideDecalMat);
  sidePanelL.rotation.y = -Math.PI / 2;
  sidePanelL.position.set(-1.08, 1.30, -0.78);
  grp.add(sidePanelL);
  const sidePanelR = new THREE.Mesh(new THREE.PlaneGeometry(3.42, 1.12), sideDecalMat);
  sidePanelR.rotation.y = Math.PI / 2;
  sidePanelR.position.set(1.08, 1.30, -0.78);
  grp.add(sidePanelR);

  [-1.08, 1.08].forEach((sx) => {
    const boxWin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 1.18), glassMat);
    boxWin.position.set(sx, 1.76, -0.25);
    grp.add(boxWin);
    const sideLedR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.24), redLedMat);
    sideLedR.position.set(sx, 2.02, 0.58);
    grp.add(sideLedR);
    const sideLedB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.24), blueLedMat);
    sideLedB.position.set(sx, 2.02, -2.18);
    grp.add(sideLedB);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 3.45), darkMat);
    skirt.position.set(sx * 0.99, 0.44, -0.78);
    grp.add(skirt);
  });

  const rearChevronMat = new THREE.MeshStandardMaterial({ map: createAmbulanceChevronTex(), roughness: 0.35 });
  const rearChevron = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 1.24), rearChevronMat);
  rearChevron.rotation.y = Math.PI;
  rearChevron.position.set(0, 1.24, -2.565);
  grp.add(rearChevron);
  [-0.50, 0.50].forEach((rx) => {
    const rWin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.42, 0.04), glassMat);
    rWin.position.set(rx, 1.78, -2.56);
    grp.add(rWin);
    const rHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.05), chromeMat);
    rHandle.position.set(rx * 0.25, 1.12, -2.57);
    grp.add(rHandle);
  });
  const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.56, 0.04), darkMat);
  doorSeam.position.set(0, 1.32, -2.56);
  grp.add(doorSeam);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.08), darkMat);
  grille.position.set(0, 0.72, 2.79);
  grp.add(grille);
  [-0.32, 0.32].forEach((gx) => {
    const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.04, 0.09), chromeMat);
    grilleBar.position.set(0, 0.72 + gx * 0.25, 2.80);
    grp.add(grilleBar);
  });
  const grilleLedL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.09), redLedMat);
  grilleLedL.position.set(-0.36, 0.72, 2.81);
  grp.add(grilleLedL);
  const grilleLedR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.09), blueLedMat);
  grilleLedR.position.set(0.36, 0.72, 2.81);
  grp.add(grilleLedR);
  const hCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.30), redMat);
  hCrossV.position.set(0, 1.22, 2.48);
  grp.add(hCrossV);
  const hCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.03, 0.10), redMat);
  hCrossH.position.set(0, 1.22, 2.48);
  grp.add(hCrossH);

  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.24, 0.22), darkMat);
  bumperF.position.set(0, 0.44, 2.75);
  grp.add(bumperF);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.22, 0.28), chromeMat);
  bumperR.position.set(0, 0.40, -2.62);
  grp.add(bumperR);

  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.26, 1.38), whiteMat);
  acUnit.position.set(0, 2.28, -0.35);
  grp.add(acUnit);
  const acGrill = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.27, 0.42), darkMat);
  acGrill.position.set(0, 2.28, -0.78);
  grp.add(acGrill);
  [-0.55, 0.55].forEach((ax) => {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.58, 6), darkMat);
    ant.position.set(ax, 2.48, -2.25);
    grp.add(ant);
  });

  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.10, 0.36), darkMat);
  barBase.position.set(0, 2.15, 1.35);
  grp.add(barBase);
  const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.16, 0.32), redLedMat);
  redLens.position.set(-0.46, 2.24, 1.35);
  grp.add(redLens);
  const centerStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.32), chromeMat);
  centerStrobe.position.set(0, 2.24, 1.35);
  grp.add(centerStrobe);
  const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.16, 0.32), blueLedMat);
  blueLens.position.set(0.46, 2.24, 1.35);
  grp.add(blueLens);

  [-0.78, 0.78].forEach((rx) => {
    const rearBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.18), rx < 0 ? redLedMat : blueLedMat);
    rearBeacon.position.set(rx, 2.22, -2.44);
    grp.add(rearBeacon);
    const amb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), amberMat);
    amb.position.set(rx, 2.04, -2.56);
    grp.add(amb);
  });

  [-0.72, 0.72].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.20, 0.08), headlightMat);
    hl.position.set(lx, 0.74, 2.78);
    grp.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.08), taillightMat);
    tl.position.set(lx * 1.24, 0.80, -2.56);
    grp.add(tl);
  });

  const wheelPositions = [
    [-0.98, 0.38, 1.68],
    [0.98, 0.38, 1.68],
    [-0.98, 0.38, -1.52],
    [0.98, 0.38, -1.52],
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 18), darkMat);
    tire.rotation.z = Math.PI / 2;
    wg.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.26, 12), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.27, 8), darkMat);
    hub.rotation.z = Math.PI / 2;
    wg.add(hub);
    grp.add(wg);
    wheels.push(wg);
  });

  grp.name = `ambulance_${unitNum}`;
  return { group: grp, wheels, headlightMat, taillightMat, redLedMat, blueLedMat };
}

export class HospitalAmbulanceController {
  public readonly rootGroup = new THREE.Group();
  private readonly coordinator: CityTrafficCoordinator;
  private readonly getEastSignal?: () => IntersectionSignalState;
  private readonly getWestSignal?: () => IntersectionSignalState;
  private readonly getFarEastSignal?: () => IntersectionSignalState;
  private readonly getDiorSignal?: () => IntersectionSignalState;
  private readonly playSiren?: (vol: number) => void;
  private readonly units: AmbulanceUnit[] = [];
  private animTime = 0;

  constructor(
    coordinator: CityTrafficCoordinator,
    getEastSignal?: () => IntersectionSignalState,
    getWestSignal?: () => IntersectionSignalState,
    playSiren?: (vol: number) => void,
    getFarEastSignal?: () => IntersectionSignalState,
    getDiorSignal?: () => IntersectionSignalState
  ) {
    this.coordinator = coordinator;
    this.getEastSignal = getEastSignal;
    this.getWestSignal = getWestSignal;
    this.playSiren = playSiren;
    this.getFarEastSignal = getFarEastSignal;
    this.getDiorSignal = getDiorSignal;
    this.rootGroup.userData.noMerge = true;

    const specs = [
      { id: 'hospital_amb_1', num: 'EMS-01', bayX: -249.6, bayZ: 49.5, wait: 1.5, code3: true, uTurnX: 544.0 },
      { id: 'hospital_amb_2', num: 'EMS-02', bayX: -254.6, bayZ: 49.5, wait: 12.0, code3: false, uTurnX: 363.0 },
    ];

    specs.forEach((s, idx) => {
      const built = buildAmbulanceMesh(s.num);
      built.group.position.set(s.bayX, -0.26, s.bayZ);
      built.group.rotation.y = Math.PI;
      this.rootGroup.add(built.group);

      this.units.push({
        id: s.id,
        group: built.group,
        wheels: built.wheels,
        headlightMat: built.headlightMat,
        taillightMat: built.taillightMat,
        redLedMat: built.redLedMat,
        blueLedMat: built.blueLedMat,
        bayX: s.bayX,
        bayZ: s.bayZ,
        x: s.bayX,
        z: s.bayZ,
        yaw: Math.PI,
        speed: 0,
        cruiseSpeed: 10.8,
        state: 'parked_in_bay',
        waitTimer: s.wait,
        turnProgress: 0,
        startX: s.bayX,
        startZ: s.bayZ,
        laneZ: 26.90,
        laneSwitchCooldown: 0,
        emergencyCode3: s.code3,
        sirenCooldown: 6.0 + idx * 12.0,
        phaseOffset: idx * 1.7,
        uTurnTargetX: s.uTurnX,
        patrolTripCount: idx,
        nsCenterX: FAR_EAST_INTERSECTION_CENTER_X,
        nsLaneX: 372.1,
        nsDir: -1,
        bdLaneZ: CITY_ROAD_BOUNDS.bachDangWBZ,
        bdDir: -1,
        turnCtrlX: 0,
        turnCtrlZ: 0,
        turnEndX: 0,
        turnEndZ: 0,
        turnDuration: 1.4,
        turnNextState: 'cruise_ns',
      });
    });
  }

  private getSignalForCenterX(centerX: number): (() => IntersectionSignalState) | undefined {
    if (Math.abs(centerX - WEST_INTERSECTION_CENTER_X) < 10) return this.getWestSignal;
    if (Math.abs(centerX - EAST_INTERSECTION_CENTER_X) < 10) return this.getEastSignal;
    if (Math.abs(centerX - FAR_EAST_INTERSECTION_CENTER_X) < 10) return this.getFarEastSignal;
    if (Math.abs(centerX - DIOR_INTERSECTION_CENTER_X) < 10) return this.getDiorSignal;
    return undefined;
  }

  public update(delta: number, lampFactor: number, playerPos?: THREE.Vector3) {
    const dt = Math.min(delta, 0.08);
    this.animTime += dt;

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const prevX = u.x;
      const prevZ = u.z;
      let braking = false;

      if (u.state === 'parked_in_bay') {
        u.speed = 0;
        u.x = u.bayX;
        u.z = u.bayZ;
        u.yaw = Math.PI;
        u.waitTimer -= dt;
        if (u.waitTimer <= 0) {
          const exitClear = this.coordinator.isZoneClear({
            id: u.id,
            x: u.bayX - 1.5,
            y: -0.26,
            z: 29.0,
            halfX: 15.0,
            halfZ: 7.5,
          });
          if (exitClear) {
            u.state = 'exiting_bay';
            u.turnProgress = 0;
            u.startX = u.bayX;
            u.startZ = u.bayZ;
            u.laneZ = i === 0 ? 26.90 : 23.25;
            u.emergencyCode3 = i === 0 || Math.random() < 0.65;
            u.patrolTripCount += 1;
            const mod = u.patrolTripCount % 3;
            u.uTurnTargetX = mod === 0 ? 544.0 : mod === 1 ? 363.0 : 544.0;
          } else {
            u.waitTimer = 1.2;
          }
        }
      } else if (u.state === 'exiting_bay') {
        const fwdX = Math.sin(u.yaw);
        const fwdZ = Math.cos(u.yaw);
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 8.5,
          minGap: 2.2,
          priority: 44,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked || factor < 0.5;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.34 * factor);
        const t = u.turnProgress;
        const endX = u.bayX + 5.0;
        const endZ = u.laneZ;
        const ctrlX = u.bayX;
        const ctrlZ = u.laneZ;
        const inv = 1 - t;
        u.x = inv * inv * u.startX + 2 * inv * t * ctrlX + t * t * endX;
        u.z = inv * inv * u.startZ + 2 * inv * t * ctrlZ + t * t * endZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.001) {
          u.yaw = Math.atan2(dx, dz);
        }
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.state = 'cruise_east';
          u.yaw = Math.PI / 2;
          u.x = endX;
          u.z = u.laneZ;
        }
      } else if (u.state === 'cruise_east' || u.state === 'cruise_west') {
        const isEast = u.state === 'cruise_east';
        const dirX: 1 | -1 = isEast ? 1 : -1;
        const lanes: readonly [number, number] = isEast ? [26.90, 23.25] : [31.10, 34.75];
        u.laneSwitchCooldown = Math.max(0, u.laneSwitchCooldown - dt);
        const approachingHospitalBay = !isEast && u.x < u.bayX + 36.0 && u.x > u.bayX + 8.0;
        const nearAnyIntersection =
          Math.abs(u.x - WEST_INTERSECTION_CENTER_X) < 18.0 ||
          Math.abs(u.x - EAST_INTERSECTION_CENTER_X) < 18.0 ||
          Math.abs(u.x - FAR_EAST_INTERSECTION_CENTER_X) < 18.0 ||
          Math.abs(u.x - DIOR_INTERSECTION_CENTER_X) < 18.0;

        const pick = this.coordinator.pickBestCruiseLane({
          id: u.id,
          x: u.x,
          y: -0.26,
          currentZ: u.z,
          laneZ: u.laneZ,
          moveDirX: dirX,
          lanes,
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 15.0,
          minGap: 3.0,
          priority: u.emergencyCode3 ? 34 : 22,
          allowSwitch: u.laneSwitchCooldown <= 0 && !nearAnyIntersection && u.x > -205 && u.x < 535,
          preferLane: approachingHospitalBay ? 34.75 : undefined,
        });
        if (pick.switched) {
          u.laneZ = pick.targetZ;
          u.laneSwitchCooldown = 3.5;
        }

        let targetSpeed = u.cruiseSpeed * (u.emergencyCode3 ? 1.15 : 0.92);
        if (pick.clearance.blocked) {
          targetSpeed = 0;
          braking = true;
        } else {
          targetSpeed *= pick.clearance.maxSpeedFactor;
        }

        const sigFactor = computeBoulevardSignalFactor({
          x: u.x,
          halfL: 2.65,
          moveDirX: dirX,
          getWestSignal: this.getWestSignal,
          getEastSignal: this.getEastSignal,
          getFarEastSignal: this.getFarEastSignal,
          getDiorSignal: this.getDiorSignal,
          coordinator: this.coordinator,
          vehicleId: u.id,
          emergencyBypass: u.emergencyCode3,
        });
        if (sigFactor < 1.0) {
          targetSpeed = Math.min(targetSpeed, u.cruiseSpeed * sigFactor);
          if (sigFactor < 0.7) braking = true;
        }

        // Branch North onto Sơn Tây (X=370) or Đại Lộ Paris / DIOR (X=503) to patrol Luxury District & Đường Bạch Đằng!
        let branchedNorth = false;
        if (isEast) {
          const branchTargetX =
            u.uTurnTargetX >= 500
              ? DIOR_INTERSECTION_CENTER_X - 4.0
              : u.uTurnTargetX >= 360
                ? FAR_EAST_INTERSECTION_CENTER_X - 4.0
                : null;
          if (
            branchTargetX !== null &&
            u.x >= branchTargetX - 0.8 &&
            u.x <= branchTargetX + 2.6 &&
            u.patrolTripCount % 2 === 1
          ) {
            const centerX =
              branchTargetX > 450 ? DIOR_INTERSECTION_CENTER_X : FAR_EAST_INTERSECTION_CENTER_X;
            const sigGetter = this.getSignalForCenterX(centerX);
            const ewGreen = u.emergencyCode3 || !sigGetter || sigGetter().ewPhase === 'green';
            if (
              ewGreen &&
              this.coordinator.isIntersectionBoxClearForAxis({ id: u.id, centerX, axis: 'ew', y: -0.26 })
            ) {
              u.nsCenterX = centerX;
              u.nsLaneX = centerX + 2.1;
              u.nsDir = -1;
              u.startX = u.x;
              u.startZ = u.z;
              u.turnCtrlX = u.nsLaneX;
              u.turnCtrlZ = u.z;
              u.turnEndX = u.nsLaneX;
              u.turnEndZ = 14.5;
              u.turnDuration = 1.45;
              u.turnProgress = 0;
              u.turnNextState = 'cruise_ns';
              u.state = 'turn_curve';
              branchedNorth = true;
            }
          }
        }

        let waitingForUTurn = false;
        if (!branchedNorth && isEast && u.x >= u.uTurnTargetX) {
          const uTurnCenterX =
            u.uTurnTargetX >= 490
              ? DIOR_INTERSECTION_CENTER_X
              : u.uTurnTargetX >= 350
                ? FAR_EAST_INTERSECTION_CENTER_X
                : EAST_INTERSECTION_CENTER_X;
          const canTurn = this.coordinator.canStartIntersectionUTurn({
            id: u.id,
            centerX: uTurnCenterX,
            fromDirX: 1,
            getSignal: this.getSignalForCenterX(uTurnCenterX),
            emergency: u.emergencyCode3,
          });
          if (canTurn) {
            u.state = 'u_turn_east';
            u.turnProgress = 0;
            u.startX = u.x;
            u.startZ = u.z;
            u.laneZ = 34.75;
          } else {
            waitingForUTurn = true;
            targetSpeed = 0;
            braking = true;
          }
        }

        if (!branchedNorth && u.state === (isEast ? 'cruise_east' : 'cruise_west')) {
          u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (targetSpeed < u.speed ? 6.5 : 3.0)));
          if (waitingForUTurn) {
            u.x = Math.min(u.uTurnTargetX + 1.0, u.x + dirX * u.speed * dt);
          } else {
            u.x += dirX * u.speed * dt;
          }
          u.z = THREE.MathUtils.lerp(u.z, u.laneZ, Math.min(1, dt * 3.5));
          const vx = (u.x - prevX) / Math.max(dt, 0.001);
          const vz = (u.z - prevZ) / Math.max(dt, 0.001);
          u.yaw = Math.hypot(vx, vz) > 0.35 ? Math.atan2(vx, vz) : isEast ? Math.PI / 2 : -Math.PI / 2;
        }

        if (
          !isEast &&
          u.state === 'cruise_west' &&
          u.x <= u.bayX + 8.5 &&
          u.x >= u.bayX + 3.0 &&
          u.z >= 33.4 &&
          this.coordinator.isZoneClear({
            id: u.id,
            x: u.bayX + 2.5,
            y: -0.26,
            z: 38.5,
            halfX: 3.0,
            halfZ: 2.5,
          })
        ) {
          u.state = 'entering_bay';
          u.turnProgress = 0;
          u.startX = u.x;
          u.startZ = u.z;
        } else if (!isEast && u.state === 'cruise_west' && u.x < CITY_ROAD_BOUNDS.westEndX) {
          u.x = CITY_ROAD_BOUNDS.westEndX;
          u.laneZ = 26.90;
          u.z = 26.90;
          u.yaw = Math.PI / 2;
          u.state = 'cruise_east';
        }
      } else if (u.state === 'cruise_ns') {
        const sigFactor = computeNorthSouthSignalFactor({
          z: u.z,
          halfL: 2.65,
          moveDirZ: u.nsDir,
          centerX: u.nsCenterX,
          getSignal: this.getSignalForCenterX(u.nsCenterX),
          coordinator: this.coordinator,
          vehicleId: u.id,
          emergencyBypass: u.emergencyCode3,
        });
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: 0,
          moveDirZ: u.nsDir,
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 13.5,
          minGap: 2.6,
          priority: u.emergencyCode3 ? 34 : 22,
        });
        let targetSpeed = u.cruiseSpeed * (u.emergencyCode3 ? 1.12 : 0.92);
        if (clr.blocked) {
          targetSpeed = 0;
          braking = true;
        } else {
          targetSpeed *= Math.min(sigFactor, clr.maxSpeedFactor);
          if (sigFactor < 0.7 || clr.maxSpeedFactor < 0.7) braking = true;
        }

        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (targetSpeed < u.speed ? 6.5 : 3.2)));
        u.z += u.nsDir * u.speed * dt;
        u.x = THREE.MathUtils.lerp(u.x, u.nsLaneX, Math.min(1, dt * 4.0));
        u.yaw = u.nsDir > 0 ? 0 : Math.PI;

        if (u.nsDir < 0 && u.z <= -104.5) {
          // Reached Đường Bạch Đằng T-junction (Sơn Tây Z=-105 or Ngã 3 Bạch Đằng – DIOR X=503): turn onto Đường Bạch Đằng!
          const turnWest = u.nsCenterX > 430;
          u.bdDir = turnWest ? -1 : 1;
          u.bdLaneZ = turnWest ? CITY_ROAD_BOUNDS.bachDangWBZ : CITY_ROAD_BOUNDS.bachDangEBZ;
          u.startX = u.x;
          u.startZ = u.z;
          u.turnCtrlX = u.x;
          u.turnCtrlZ = u.bdLaneZ;
          u.turnEndX = u.nsCenterX + u.bdDir * 12.5;
          u.turnEndZ = u.bdLaneZ;
          u.turnDuration = 1.35;
          u.turnProgress = 0;
          u.turnNextState = 'cruise_bd';
          u.state = 'turn_curve';
        } else if (u.nsDir > 0 && u.z >= 14.0 && u.z <= 21.0) {
          // Turn West onto Central/Luxury Boulevard (Z=31.10) back toward Hospital!
          const sigGetter = this.getSignalForCenterX(u.nsCenterX);
          const nsGreen = u.emergencyCode3 || !sigGetter || (sigGetter().nsPhase ?? 'green') === 'green';
          if (
            nsGreen &&
            this.coordinator.isIntersectionBoxClearForAxis({
              id: u.id,
              centerX: u.nsCenterX,
              axis: 'ns',
              y: -0.26,
            })
          ) {
            u.laneZ = 31.10;
            u.startX = u.x;
            u.startZ = u.z;
            u.turnCtrlX = u.x;
            u.turnCtrlZ = 31.10;
            u.turnEndX = u.nsCenterX - 13.0;
            u.turnEndZ = 31.10;
            u.turnDuration = 1.45;
            u.turnProgress = 0;
            u.turnNextState = 'cruise_west';
            u.state = 'turn_curve';
          }
        }
      } else if (u.state === 'cruise_bd') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: u.bdDir,
          moveDirZ: 0,
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 13.5,
          minGap: 2.6,
          priority: u.emergencyCode3 ? 34 : 22,
        });
        let targetSpeed = u.cruiseSpeed * (u.emergencyCode3 ? 1.12 : 0.92);
        if (clr.blocked) {
          targetSpeed = 0;
          braking = true;
        } else {
          targetSpeed *= clr.maxSpeedFactor;
          if (clr.maxSpeedFactor < 0.7) braking = true;
        }
        u.speed = THREE.MathUtils.lerp(u.speed, targetSpeed, Math.min(1, dt * (targetSpeed < u.speed ? 6.5 : 3.2)));
        u.x += u.bdDir * u.speed * dt;
        u.z = THREE.MathUtils.lerp(u.z, u.bdLaneZ, Math.min(1, dt * 4.0));
        u.yaw = u.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;

        // Turn South at Sơn Tây (X=370) or DIOR (X=503) to head back down to Boulevard!
        if (u.bdDir < 0 && u.x <= FAR_EAST_INTERSECTION_CENTER_X + 2.0 && u.x >= FAR_EAST_INTERSECTION_CENTER_X - 4.0) {
          u.nsCenterX = FAR_EAST_INTERSECTION_CENTER_X;
          u.nsLaneX = FAR_EAST_INTERSECTION_CENTER_X - 2.1;
          u.nsDir = 1;
          u.startX = u.x;
          u.startZ = u.z;
          u.turnCtrlX = u.nsLaneX;
          u.turnCtrlZ = u.z;
          u.turnEndX = u.nsLaneX;
          u.turnEndZ = -102.0;
          u.turnDuration = 1.35;
          u.turnProgress = 0;
          u.turnNextState = 'cruise_ns';
          u.state = 'turn_curve';
        } else if (u.bdDir > 0 && u.x >= DIOR_INTERSECTION_CENTER_X - 4.0 && u.x <= DIOR_INTERSECTION_CENTER_X + 2.0) {
          u.nsCenterX = DIOR_INTERSECTION_CENTER_X;
          u.nsLaneX = DIOR_INTERSECTION_CENTER_X - 2.1;
          u.nsDir = 1;
          u.startX = u.x;
          u.startZ = u.z;
          u.turnCtrlX = u.nsLaneX;
          u.turnCtrlZ = u.z;
          u.turnEndX = u.nsLaneX;
          u.turnEndZ = -102.0;
          u.turnDuration = 1.35;
          u.turnProgress = 0;
          u.turnNextState = 'cruise_ns';
          u.state = 'turn_curve';
        } else if ((u.bdDir > 0 && u.x >= 530.0) || (u.bdDir < 0 && u.x <= -212.0)) {
          u.startX = u.x;
          u.startZ = u.z;
          u.bdDir = u.bdDir > 0 ? -1 : 1;
          u.bdLaneZ = u.bdDir > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
          u.turnProgress = 0;
          u.state = 'u_turn_bd';
        }
      } else if (u.state === 'u_turn_bd') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 8.5,
          minGap: 2.0,
          priority: 28,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.48 * factor);
        const ang = u.turnProgress * Math.PI;
        const bulge = u.bdDir > 0 ? -5.0 : 5.0;
        u.x = u.startX + Math.sin(ang) * bulge;
        u.z = THREE.MathUtils.lerp(u.startZ, u.bdLaneZ, 0.5 - 0.5 * Math.cos(ang));
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.02) u.yaw = Math.atan2(dx, dz);
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (u.turnProgress >= 1) {
          u.z = u.bdLaneZ;
          u.yaw = u.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          u.state = 'cruise_bd';
        }
      } else if (u.state === 'turn_curve') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 8.5,
          minGap: 2.0,
          priority: 36,
        });
        const factor = clr.blocked ? 0.25 : Math.max(0.35, clr.maxSpeedFactor);
        braking = clr.blocked;
        u.turnProgress = Math.min(1, u.turnProgress + (dt * factor) / Math.max(0.6, u.turnDuration));
        const t = u.turnProgress;
        const inv = 1 - t;
        u.x = inv * inv * u.startX + 2 * inv * t * u.turnCtrlX + t * t * u.turnEndX;
        u.z = inv * inv * u.startZ + 2 * inv * t * u.turnCtrlZ + t * t * u.turnEndZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.005) u.yaw = Math.atan2(dx, dz);
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.x = u.turnEndX;
          u.z = u.turnEndZ;
          u.state = u.turnNextState;
        }
      } else if (u.state === 'u_turn_east') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 9.0,
          minGap: 2.3,
          priority: 26,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.45 * factor);
        const p = u.turnProgress;
        const ang = p * Math.PI;
        u.x = u.startX + Math.sin(ang) * 6.0;
        u.z = THREE.MathUtils.lerp(u.startZ, u.laneZ, 0.5 - 0.5 * Math.cos(ang));
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.05) {
          u.yaw = Math.atan2(dx, dz);
        }
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (p >= 1) {
          u.state = 'cruise_west';
          u.yaw = -Math.PI / 2;
        }
      } else if (u.state === 'entering_bay') {
        const clr = this.coordinator.getForwardClearance({
          id: u.id,
          x: u.x,
          y: -0.26,
          z: u.z,
          moveDirX: Math.sin(u.yaw),
          moveDirZ: Math.cos(u.yaw),
          halfW: 1.05,
          halfL: 2.65,
          lookahead: 7.5,
          minGap: 2.0,
          priority: 44,
        });
        const factor = clr.blocked ? 0 : clr.maxSpeedFactor;
        braking = clr.blocked || factor < 0.5;
        u.turnProgress = Math.min(1, u.turnProgress + dt * 0.34 * factor);
        const t = u.turnProgress;
        const ctrlX = u.bayX;
        const ctrlZ = u.startZ;
        const inv = 1 - t;
        u.x = inv * inv * u.startX + 2 * inv * t * ctrlX + t * t * u.bayX;
        u.z = inv * inv * u.startZ + 2 * inv * t * ctrlZ + t * t * u.bayZ;
        const dx = u.x - prevX;
        const dz = u.z - prevZ;
        if (Math.hypot(dx, dz) > 0.002) {
          u.yaw = Math.atan2(dx, dz);
        }
        u.speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
        if (t >= 1) {
          u.state = 'parked_in_bay';
          u.x = u.bayX;
          u.z = u.bayZ;
          u.yaw = Math.PI;
          u.speed = 0;
          u.waitTimer = 14.0 + i * 6.0;
        }
      }

      if (u.emergencyCode3 && u.state !== 'parked_in_bay' && this.playSiren) {
        u.sirenCooldown -= dt;
        if (u.sirenCooldown <= 0) {
          if (playerPos) {
            const distP = Math.hypot(playerPos.x - u.x, playerPos.z - u.z);
            if (distP < 90.0) {
              const vol = Math.max(0.25, Math.min(0.85, 1.0 - distP / 95.0));
              this.playSiren(vol);
            }
          }
          u.sirenCooldown = 19.0 + Math.random() * 9.0;
        }
      }

      const groundY = u.z >= 38.2 && u.x < -200 ? 0.0 : u.z <= 37.0 || u.x >= -200 ? -0.26 : THREE.MathUtils.lerp(-0.26, 0.0, (u.z - 37.0) / 1.2);
      u.group.position.set(u.x, groundY, u.z);
      u.group.rotation.y = u.yaw;

      const moved = Math.hypot(u.x - prevX, u.z - prevZ);
      for (let w = 0; w < u.wheels.length; w++) {
        u.wheels[w].rotation.x += moved / 0.38;
      }

      const activeOnRoad = u.state !== 'parked_in_bay';
      const pulse = Math.sin(this.animTime * (u.emergencyCode3 ? 20.0 : 9.0) + u.phaseOffset);
      const peak = activeOnRoad ? (u.emergencyCode3 ? 2.5 : 1.5) : 0.35;
      u.redLedMat.emissiveIntensity = pulse > 0 ? peak : 0.12;
      u.blueLedMat.emissiveIntensity = pulse <= 0 ? peak : 0.12;
      u.headlightMat.emissiveIntensity = activeOnRoad ? 0.95 + lampFactor * 0.95 : 0.15;
      u.taillightMat.emissiveIntensity = braking ? 2.0 : activeOnRoad ? 0.65 + lampFactor * 0.45 : 0.15;

      this.coordinator.updateVehicle({
        id: u.id,
        kind: 'car',
        x: u.x,
        y: groundY,
        z: u.z,
        fwdX: Math.sin(u.yaw),
        fwdZ: Math.cos(u.yaw),
        halfW: 1.05,
        halfL: 2.65,
        speed: u.speed,
        isStoppedOrParked: u.state === 'parked_in_bay',
        priority: u.state === 'exiting_bay' || u.state === 'entering_bay' ? 44 : u.emergencyCode3 ? 34 : 22,
        active: true,
      });
    }
  }
}

// =========================================================================
// HOSPITAL STAFF, MULTI-FLOOR SPECIALISTS & LIVE ELEVATOR-RIDING NPCS
// =========================================================================

interface HospitalNpcActor {
  group: THREE.Group;
  hips: THREE.Group;
  glbHandle: GlbHumanHandle;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  waypoints: THREE.Vector3[];
  wpIdx: number;
  speed: number;
  walkPhase: number;
  idleFacingYaw?: number;
  seated?: boolean;
}

interface ElevatorRiderNpc {
  group: THREE.Group;
  hips: THREE.Group;
  glbHandle: GlbHumanHandle;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  elevIdx: number;
  currentFloor: number; // 1..5
  targetFloor: number; // 1..5
  phase: 'to_wait' | 'waiting_door' | 'boarding' | 'riding' | 'exiting' | 'roam_floor';
  walkPhase: number;
  speed: number;
  roamTimer: number;
  roamIdx: number;
  roamTargets: Array<{ x: number; z: number }>;
  slotOffsetX: number;
  slotOffsetZ: number;
  floorCycle: number[];
  cyclePos: number;
}

function buildHospitalCharacterMesh(
  helpers: HospitalCharacterHelpers,
  role: 'doctor' | 'nurse' | 'pharmacist' | 'paramedic' | 'security' | 'patient' | 'surgeon',
  shirt: number,
  pants: number,
  skin: string,
  hairColor: number,
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

  if (role === 'doctor' || role === 'pharmacist') {
    const coat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.27), shirtMat);
    coat.position.y = 0.72;
    hips.add(coat);
    if (role === 'doctor') {
      const steth = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.022, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      steth.rotation.x = Math.PI / 2 - 0.35;
      steth.position.set(0, 1.24, 0.05);
      hips.add(steth);
    }
  } else if (role === 'paramedic') {
    const hiVis = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.10, 0.27),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.25 })
    );
    hiVis.position.y = 1.04;
    hips.add(hiVis);
  }

  const faceTex = helpers.createFaceTexture(role === 'patient' ? 'neutral' : 'happy', skin);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.28, 0.28, 0.28);
  head.position.y = 1.48;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hairMat);
  hair.position.y = 1.61;
  hips.add(hair);

  if (role === 'nurse') {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.08, 0.10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    cap.position.set(0, 1.69, -0.02);
    hips.add(cap);
  } else if (role === 'surgeon') {
    const scrubCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.31, 0.12, 0.31),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.65 })
    );
    scrubCap.position.set(0, 1.63, 0);
    hips.add(scrubCap);
  } else if (role === 'security') {
    const secCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.09, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
    );
    secCap.position.set(0, 1.66, 0.03);
    hips.add(secCap);
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

  const isDoctor = role === 'doctor' || role === 'pharmacist' || role === 'surgeon';
  const isSecurity = role === 'security';
  const roleSpec = isDoctor
    ? pickDoctorNpcModel(shirt + pants + hairColor)
    : isSecurity
      ? GUARD_NPC_MODEL
      : seated
        ? pickSeatedCivilianModel(shirt + pants + hairColor)
        : pickStationaryCivilianModel(shirt + pants + hairColor);
  const glbHandle = attachGlbHumanToNpc({
    modelSource: roleSpec.modelSource,
    targetHeight: roleSpec.targetHeight,
    clipProfile: roleSpec.clipProfile,
    rotationY: roleSpec.rotationY,
    hostGroup: grp,
    fallbackMeshes: [hips],
    initialState: seated ? 'Sit' : 'Idle',
    palette: {
      shirt: isSecurity ? 0x38bdf8 : shirt,
      pants,
      hair: hairColor,
      skin: Number.parseInt(skin.replace('#', ''), 16) || 0xfbd3b4,
      ...(isSecurity ? { suit: 0x0f172a, accent: 0xfacc15 } : {}),
    },
  });

  return { group: grp, hips, glbHandle, leftArm, rightArm, leftLeg, rightLeg };
}

export class HospitalNpcController {
  public readonly rootGroup = new THREE.Group();
  private readonly actors: HospitalNpcActor[] = [];
  private readonly riders: ElevatorRiderNpc[] = [];
  private elevators: HospitalElevatorApi[] = [];

  constructor(helpers: HospitalCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;

    const f2 = HOSPITAL_FLOOR_HEIGHT + 0.02;
    const f3 = 2 * HOSPITAL_FLOOR_HEIGHT + 0.02;
    const f4 = 3 * HOSPITAL_FLOOR_HEIGHT + 0.02;
    const f5 = 4 * HOSPITAL_FLOOR_HEIGHT + 0.02;

    const specs: Array<{
      role: 'doctor' | 'nurse' | 'pharmacist' | 'paramedic' | 'security' | 'patient' | 'surgeon';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      waypoints: THREE.Vector3[];
      idleYaw?: number;
      seated?: boolean;
      speed?: number;
    }> = [
      // FLOOR 1: Reception, Pharmacy, ER, MRI, Consult, Security, Courtyard
      {
        role: 'nurse',
        shirt: 0x0ea5e9,
        pants: 0x0369a1,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [new THREE.Vector3(-274.2, 0.02, 65.1)],
        idleYaw: Math.PI,
      },
      {
        role: 'nurse',
        shirt: 0x38bdf8,
        pants: 0x0284c7,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [new THREE.Vector3(-271.2, 0.02, 65.1)],
        idleYaw: Math.PI,
      },
      {
        role: 'pharmacist',
        shirt: 0xf8fafc,
        pants: 0x1e293b,
        skin: '#f5c7a3',
        hair: 0x3f2305,
        waypoints: [new THREE.Vector3(-288.6, 0.02, 61.0)],
        idleYaw: Math.PI / 2,
      },
      {
        role: 'doctor',
        shirt: 0xffffff,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(-253.5, 0.02, 59.5),
          new THREE.Vector3(-253.5, 0.02, 74.5),
          new THREE.Vector3(-256.8, 0.02, 66.0),
          new THREE.Vector3(-255.5, 0.02, 57.5),
        ],
      },
      {
        role: 'paramedic',
        shirt: 0xdc2626,
        pants: 0x1e293b,
        skin: '#e8b48e',
        hair: 0x09090b,
        waypoints: [
          new THREE.Vector3(-253.5, 0.0, 48.0),
          new THREE.Vector3(-253.5, 0.02, 56.5),
          new THREE.Vector3(-253.5, 0.02, 64.5),
          new THREE.Vector3(-253.5, 0.02, 56.5),
        ],
        speed: 1.65,
      },
      {
        role: 'doctor',
        shirt: 0xffffff,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x27150a,
        waypoints: [new THREE.Vector3(-289.2, 0.02, 85.8)],
        idleYaw: -Math.PI / 2,
      },
      {
        role: 'nurse',
        shirt: 0x14b8a6,
        pants: 0x0f766e,
        skin: '#fce0c8',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(-259.6, 0.03, 81.2),
          new THREE.Vector3(-256.2, 0.03, 81.2),
        ],
        speed: 0.95,
      },
      {
        role: 'security',
        shirt: 0x1e3a8a,
        pants: 0x0f172a,
        skin: '#e8b48e',
        hair: 0x09090b,
        waypoints: [
          new THREE.Vector3(-275.5, 0.0, 48.2),
          new THREE.Vector3(-270.5, 0.0, 48.2),
          new THREE.Vector3(-271.0, 0.02, 57.0),
          new THREE.Vector3(-275.0, 0.02, 57.0),
        ],
      },
      {
        role: 'patient',
        shirt: 0xf97316,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x18181b,
        waypoints: [new THREE.Vector3(-281.4, 0.02, 59.35)],
        idleYaw: Math.PI,
        seated: true,
      },
      {
        role: 'patient',
        shirt: 0xec4899,
        pants: 0x334155,
        skin: '#fce0c8',
        hair: 0x3f2305,
        waypoints: [new THREE.Vector3(-279.6, 0.02, 63.95)],
        idleYaw: Math.PI,
        seated: true,
      },
      // FLOOR 2: Lab Technicians & Pediatric Staff
      {
        role: 'doctor',
        shirt: 0xffffff,
        pants: 0x0f766e,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(-282.5, f2, 66.0),
          new THREE.Vector3(-291.0, f2, 66.0),
          new THREE.Vector3(-291.0, f2, 70.5),
          new THREE.Vector3(-282.5, f2, 70.5),
        ],
      },
      {
        role: 'nurse',
        shirt: 0xf472b6,
        pants: 0xbe185d,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(-254.0, f2, 61.0),
          new THREE.Vector3(-254.0, f2, 78.0),
          new THREE.Vector3(-255.5, f2, 70.0),
        ],
      },
      // FLOOR 3: Inpatient Ward & ICU Specialists
      {
        role: 'nurse',
        shirt: 0x0284c7,
        pants: 0x075985,
        skin: '#f5c7a3',
        hair: 0x1e1b18,
        waypoints: [
          new THREE.Vector3(-288.0, f3, 61.0),
          new THREE.Vector3(-288.0, f3, 78.0),
          new THREE.Vector3(-279.0, f3, 72.0),
        ],
      },
      {
        role: 'doctor',
        shirt: 0xffffff,
        pants: 0x1e293b,
        skin: '#e8b48e',
        hair: 0x18181b,
        waypoints: [
          new THREE.Vector3(-254.0, f3, 60.5),
          new THREE.Vector3(-254.0, f3, 78.5),
          new THREE.Vector3(-259.2, f3, 67.5),
        ],
      },
      // FLOOR 4: Surgeons & Post-Op Recovery Nurse
      {
        role: 'surgeon',
        shirt: 0x0d9488,
        pants: 0x115e59,
        skin: '#fbd3b4',
        hair: 0x0f172a,
        waypoints: [
          new THREE.Vector3(-285.0, f4, 63.0),
          new THREE.Vector3(-276.0, f4, 64.0),
          new THREE.Vector3(-276.0, f4, 78.0),
          new THREE.Vector3(-285.0, f4, 79.0),
        ],
      },
      {
        role: 'nurse',
        shirt: 0x0ea5e9,
        pants: 0x0369a1,
        skin: '#fce0c8',
        hair: 0x3f2305,
        waypoints: [
          new THREE.Vector3(-253.8, f4, 61.0),
          new THREE.Vector3(-253.8, f4, 77.5),
        ],
      },
      // FLOOR 5: Rooftop Helipad Medic
      {
        role: 'paramedic',
        shirt: 0xdc2626,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(-272.0, f5, 70.0),
          new THREE.Vector3(-258.5, f5, 68.5),
          new THREE.Vector3(-262.0, f5, 79.0),
          new THREE.Vector3(-274.0, f5, 77.5),
        ],
      },
      // REAR PARKING LOT: Security Guard & Visitors Walking Between Parking and Hospital Rear Door!
      {
        role: 'security',
        shirt: 0x1e3a8a,
        pants: 0x0f172a,
        skin: '#fbd3b4',
        hair: 0x09090b,
        waypoints: [
          new THREE.Vector3(-245.2, 0.02, 97.5),
          new THREE.Vector3(-245.2, 0.02, 103.5),
        ],
        speed: 0.95,
      },
      {
        role: 'patient',
        shirt: 0x10b981,
        pants: 0x1e293b,
        skin: '#fce0c8',
        hair: 0x27150a,
        waypoints: [
          new THREE.Vector3(-284.5, 0.02, 112.4),
          new THREE.Vector3(-280.2, 0.02, 112.4),
          new THREE.Vector3(-280.2, 0.02, 89.9),
          new THREE.Vector3(-280.2, 0.02, 76.0),
          new THREE.Vector3(-275.5, 0.02, 67.5),
          new THREE.Vector3(-280.2, 0.02, 76.0),
          new THREE.Vector3(-280.2, 0.02, 89.9),
          new THREE.Vector3(-280.2, 0.02, 112.4),
        ],
        speed: 1.45,
      },
      {
        role: 'patient',
        shirt: 0x3b82f6,
        pants: 0x334155,
        skin: '#f5c7a3',
        hair: 0x111827,
        waypoints: [
          new THREE.Vector3(-267.0, 0.02, 122.4),
          new THREE.Vector3(-280.2, 0.02, 122.4),
          new THREE.Vector3(-280.2, 0.02, 89.9),
          new THREE.Vector3(-273.0, 0.02, 81.8),
          new THREE.Vector3(-280.2, 0.02, 89.9),
          new THREE.Vector3(-280.2, 0.02, 122.4),
        ],
        speed: 1.38,
      },
      {
        role: 'patient',
        shirt: 0xf59e0b,
        pants: 0x1e293b,
        skin: '#e8b48e',
        hair: 0x3f2305,
        waypoints: [
          new THREE.Vector3(-269.5, 0.02, 112.2),
          new THREE.Vector3(-257.5, 0.02, 112.2),
          new THREE.Vector3(-278.5, 0.02, 112.2),
          new THREE.Vector3(-278.5, 0.02, 95.0),
          new THREE.Vector3(-278.5, 0.02, 112.2),
        ],
        speed: 1.25,
      },
    ];

    specs.forEach((s, idx) => {
      const built = buildHospitalCharacterMesh(helpers, s.role, s.shirt, s.pants, s.skin, s.hair, Boolean(s.seated));
      built.group.position.copy(s.waypoints[0]);
      if (s.idleYaw !== undefined) built.group.rotation.y = s.idleYaw;
      this.rootGroup.add(built.group);

      this.actors.push({
        group: built.group,
        hips: built.hips,
        glbHandle: built.glbHandle,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        waypoints: s.waypoints,
        wpIdx: s.waypoints.length > 1 ? 1 : 0,
        speed: s.speed ?? 1.32 + (idx % 3) * 0.14,
        walkPhase: idx * 0.85,
        idleFacingYaw: s.idleYaw,
        seated: s.seated,
      });
    });

    // 6 Live Elevator Rider NPCs cycling between Floors 1..5 in full view!
    const riderConfigs: Array<{
      role: 'doctor' | 'nurse' | 'patient' | 'surgeon';
      shirt: number;
      pants: number;
      skin: string;
      hair: number;
      elevIdx: number;
      startFloor: number;
      cycle: number[];
      slotX: number;
      slotZ: number;
    }> = [
      {
        role: 'doctor',
        shirt: 0xffffff,
        pants: 0x1e293b,
        skin: '#fbd3b4',
        hair: 0x111827,
        elevIdx: 0,
        startFloor: 1,
        cycle: [1, 3, 4, 2],
        slotX: -0.40,
        slotZ: 86.5,
      },
      {
        role: 'nurse',
        shirt: 0x0ea5e9,
        pants: 0x0369a1,
        skin: '#fce0c8',
        hair: 0x27150a,
        elevIdx: 0,
        startFloor: 2,
        cycle: [2, 1, 4, 3],
        slotX: 0.40,
        slotZ: 87.3,
      },
      {
        role: 'patient',
        shirt: 0x8b5cf6,
        pants: 0x1e293b,
        skin: '#f5c7a3',
        hair: 0x18181b,
        elevIdx: 0,
        startFloor: 1,
        cycle: [1, 2, 5, 1],
        slotX: 0.0,
        slotZ: 87.8,
      },
      {
        role: 'surgeon',
        shirt: 0x0d9488,
        pants: 0x115e59,
        skin: '#e8b48e',
        hair: 0x0f172a,
        elevIdx: 1,
        startFloor: 3,
        cycle: [3, 4, 1, 3],
        slotX: -0.38,
        slotZ: 86.7,
      },
      {
        role: 'patient',
        shirt: 0xf59e0b,
        pants: 0x334155,
        skin: '#fbd3b4',
        hair: 0x3f2305,
        elevIdx: 1,
        startFloor: 1,
        cycle: [1, 5, 3, 2],
        slotX: 0.38,
        slotZ: 87.5,
      },
      {
        role: 'nurse',
        shirt: 0x10b981,
        pants: 0x047857,
        skin: '#fce0c8',
        hair: 0x111827,
        elevIdx: 1,
        startFloor: 4,
        cycle: [4, 2, 5, 1],
        slotX: 0.0,
        slotZ: 86.3,
      },
    ];

    riderConfigs.forEach((rc, idx) => {
      const built = buildHospitalCharacterMesh(helpers, rc.role, rc.shirt, rc.pants, rc.skin, rc.hair, false);
      const startY = (rc.startFloor - 1) * HOSPITAL_FLOOR_HEIGHT + 0.02;
      const waitX = (rc.elevIdx === 0 ? -276.0 : -270.0) + rc.slotX;
      built.group.position.set(waitX, startY, 82.8);
      this.rootGroup.add(built.group);

      this.riders.push({
        group: built.group,
        hips: built.hips,
        glbHandle: built.glbHandle,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        elevIdx: rc.elevIdx,
        currentFloor: rc.startFloor,
        targetFloor: rc.cycle[1],
        phase: 'to_wait',
        walkPhase: idx * 1.1,
        speed: 1.48 + (idx % 2) * 0.14,
        roamTimer: 0,
        roamIdx: 0,
        roamTargets: [
          { x: -273.0, z: 75.5 },
          { x: rc.elevIdx === 0 ? -277.0 : -269.0, z: 72.0 },
        ],
        slotOffsetX: rc.slotX,
        slotOffsetZ: rc.slotZ,
        floorCycle: rc.cycle,
        cyclePos: 1,
      });
    });
  }

  public bindElevators(elevators: HospitalElevatorApi[]) {
    this.elevators = elevators;
  }

  public isAnyNpcNearRearDoor(): boolean {
    for (let i = 0; i < this.actors.length; i++) {
      const p = this.actors[i].group.position;
      if (p.y < 2.0 && Math.hypot(p.x - -280.2, p.z - 89.9) < 4.2) {
        return true;
      }
    }
    return false;
  }

  private animateWalk(
    actor: {
      hips: THREE.Group;
      glbHandle: GlbHumanHandle;
      leftArm: THREE.Group;
      rightArm: THREE.Group;
      leftLeg: THREE.Group;
      rightLeg: THREE.Group;
      walkPhase: number;
    },
    delta: number,
    moving: boolean,
    speed: number
  ) {
    actor.glbHandle.setAnimState(
      moving ? 'Walk' : 'Idle',
      moving ? THREE.MathUtils.clamp(speed / 1.35, 0.75, 1.45) : 1.0
    );
    if (!actor.hips.visible) return;
    if (moving) {
      actor.walkPhase += delta * (4.4 + speed * 1.9);
      const swing = Math.sin(actor.walkPhase) * 0.42;
      actor.leftArm.rotation.x = swing;
      actor.rightArm.rotation.x = actor.glbHandle.hasActiveUmbrella() ? -0.88 : -swing;
      actor.leftLeg.rotation.x = -swing * 1.15;
      actor.rightLeg.rotation.x = swing * 1.15;
      actor.hips.position.y = Math.abs(Math.sin(actor.walkPhase)) * 0.032;
    } else {
      actor.leftArm.rotation.x = THREE.MathUtils.lerp(actor.leftArm.rotation.x, 0, Math.min(1, delta * 8));
      actor.rightArm.rotation.x = THREE.MathUtils.lerp(actor.rightArm.rotation.x, 0, Math.min(1, delta * 8));
      actor.leftLeg.rotation.x = THREE.MathUtils.lerp(actor.leftLeg.rotation.x, 0, Math.min(1, delta * 8));
      actor.rightLeg.rotation.x = THREE.MathUtils.lerp(actor.rightLeg.rotation.x, 0, Math.min(1, delta * 8));
      actor.hips.position.y = THREE.MathUtils.lerp(actor.hips.position.y, 0, Math.min(1, delta * 8));
    }
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.1);
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (a.waypoints.length <= 1) {
        if (a.idleFacingYaw !== undefined) {
          a.group.rotation.y = a.idleFacingYaw;
        }
        a.glbHandle.setAnimState(a.seated ? 'Sit' : 'Idle', 1.0);
        if (!a.seated && a.hips.visible) {
          a.walkPhase += dt * 1.6;
          a.hips.position.y = Math.sin(a.walkPhase) * 0.008;
        }
        continue;
      }

      const target = a.waypoints[a.wpIdx];
      const dx = target.x - a.group.position.x;
      const dy = target.y - a.group.position.y;
      const dz = target.z - a.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.22) {
        a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
      } else {
        const step = Math.min(dist, a.speed * dt);
        a.group.position.x += (dx / dist) * step;
        a.group.position.z += (dz / dist) * step;
        a.group.position.y += dy * Math.min(1, dt * 6);
        a.group.rotation.y = Math.atan2(dx, dz);
      }
      this.animateWalk(a, dt, dist >= 0.22, a.speed);
    }

    // Update live elevator riders
    if (this.elevators.length === 0) return;
    for (let i = 0; i < this.riders.length; i++) {
      const r = this.riders[i];
      const elev = this.elevators[r.elevIdx];
      if (!elev) continue;

      const floorY = (r.currentFloor - 1) * HOSPITAL_FLOOR_HEIGHT + 0.02;
      const waitX = elev.x + r.slotOffsetX;
      const waitZ = 83.2;

      if (r.phase === 'to_wait') {
        const dx = waitX - r.group.position.x;
        const dz = waitZ - r.group.position.z;
        const dist = Math.hypot(dx, dz);
        r.group.position.y = floorY;
        if (dist < 0.16) {
          r.phase = 'waiting_door';
          elev.callToFloor(r.currentFloor);
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.group.position.x += (dx / dist) * step;
          r.group.position.z += (dz / dist) * step;
          r.group.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalk(r, dt, dist >= 0.16, r.speed);
      } else if (r.phase === 'waiting_door') {
        r.group.position.y = floorY;
        r.group.rotation.y = 0; // Face elevator door (+Z)
        this.animateWalk(r, dt, false, 0);
        if (elev.currentFloor === r.currentFloor && elev.doorOpen > 0.72) {
          r.phase = 'boarding';
        } else if (elev.state === 'idle' && elev.currentFloor !== r.currentFloor) {
          elev.callToFloor(r.currentFloor);
        }
      } else if (r.phase === 'boarding') {
        const cabX = elev.x + r.slotOffsetX;
        const cabZ = r.slotOffsetZ;
        const dx = cabX - r.group.position.x;
        const dz = cabZ - r.group.position.z;
        const dist = Math.hypot(dx, dz);
        r.group.position.y = elev.currentY + 0.02;
        if (dist < 0.16) {
          r.phase = 'riding';
          r.targetFloor = r.floorCycle[r.cyclePos];
          r.cyclePos = (r.cyclePos + 1) % r.floorCycle.length;
          elev.requestFloor(r.targetFloor);
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.group.position.x += (dx / dist) * step;
          r.group.position.z += (dz / dist) * step;
          r.group.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalk(r, dt, dist >= 0.16, r.speed);
      } else if (r.phase === 'riding') {
        r.group.position.y = elev.currentY + 0.02;
        r.group.rotation.y = Math.PI; // Face North toward glass cabin doors!
        this.animateWalk(r, dt, false, 0);
        if (elev.currentFloor === r.targetFloor && elev.doorOpen > 0.72) {
          r.currentFloor = r.targetFloor;
          r.phase = 'exiting';
        } else if (elev.state === 'idle' && elev.currentFloor !== r.targetFloor) {
          elev.requestFloor(r.targetFloor);
        }
      } else if (r.phase === 'exiting') {
        const exitX = elev.x + r.slotOffsetX;
        const exitZ = 82.0;
        const dx = exitX - r.group.position.x;
        const dz = exitZ - r.group.position.z;
        const dist = Math.hypot(dx, dz);
        r.group.position.y = floorY;
        if (dist < 0.18) {
          r.phase = 'roam_floor';
          r.roamTimer = 4.5 + (i % 3) * 1.5;
          r.roamIdx = 0;
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.group.position.x += (dx / dist) * step;
          r.group.position.z += (dz / dist) * step;
          r.group.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalk(r, dt, dist >= 0.18, r.speed);
      } else if (r.phase === 'roam_floor') {
        r.group.position.y = floorY;
        const t = r.roamTargets[r.roamIdx];
        const dx = t.x - r.group.position.x;
        const dz = t.z - r.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.22) {
          r.roamIdx = (r.roamIdx + 1) % r.roamTargets.length;
        } else {
          const step = Math.min(dist, r.speed * dt);
          r.group.position.x += (dx / dist) * step;
          r.group.position.z += (dz / dist) * step;
          r.group.rotation.y = Math.atan2(dx, dz);
        }
        this.animateWalk(r, dt, dist >= 0.22, r.speed);
        r.roamTimer -= dt;
        if (r.roamTimer <= 0) {
          r.phase = 'to_wait';
        }
      }
    }
  }
}
