import * as THREE from 'three';
import type { HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox } from './WestIntersectionSystem';
import {
  attachGlbHumanToNpc,
  type GlbHumanHandle,
} from './GlbHumanNpcSystem';
import { GUARD_NPC_MODEL, pickSchoolStudentModel, TEACHER_NPC_MODEL } from './NpcModelCatalog';

export const PHAN_CHAU_TRINH_CENTER_X = -333.0;
export const PHAN_CHAU_TRINH_MIN_X = -361.0;
export const PHAN_CHAU_TRINH_MAX_X = -305.0;
export const PHAN_CHAU_TRINH_MIN_Z = 42.5;
export const PHAN_CHAU_TRINH_MAX_Z = 148.0;

export const SCHOOL_PODIUM_Y = 0.45;
export const SCHOOL_FLOOR_H = 3.9;
export const SCHOOL_FLOOR_COUNT = 3;

export interface PhanChuTrinhSchoolBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  update: (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => void;
}

// =========================================================================
// PER-FLOOR COLLIDERS FOR TRƯỜNG THPT PHAN CHÂU TRINH (FLOORS 1..3)
// Campus: X = -361.0 .. -305.0, Z = 42.5 .. 148.0
// Main Gate Opening: X = -338.5 .. -327.5 at Z = 50.8 (Sliding Iron Picket Gates!)
// Pedestrian Gate: X = -327.5 .. -325.4 at Z = 50.8
// Guardhouse (Enterable!): X = -326.8 .. -321.5, Z = 48.0 .. 52.2 (Doorway at X = -325.2..-323.4, Z = 52.0)
// Courtyard: X = -348.5 .. -317.5, Z = 66.5 .. 103.2 (Y = 0.45)
// Switchback Stairwell (Floors 1..3): X = -359.0 .. -354.0, Z = 104.2 .. 114.6
// =========================================================================
function buildPhanChuTrinhColliders(): IntersectionColliderBox[] {
  const cols: IntersectionColliderBox[] = [
    // Campus Outer Perimeter Fences (Floor 1) — West wall opens at Z = 101.7 .. 104.4 for Cổng Phụ Sân Bóng Rổ!
    { minX: -361.4, maxX: -360.4, minZ: 42.5, maxZ: 101.7, floor: 1 },
    { minX: -361.4, maxX: -360.4, minZ: 104.4, maxZ: 148.2, floor: 1 },
    { minX: -305.6, maxX: -304.6, minZ: 42.5, maxZ: 148.2, floor: 1 },
    { minX: -361.4, maxX: -304.6, minZ: 147.2, maxZ: 148.4, floor: 1 },

    // Front Iron Picket Fence at Z = 50.8 (Gate X = -338.5 .. -327.5 is OPEN for sliding gate!)
    { minX: -361.2, maxX: -338.5, minZ: 50.4, maxZ: 51.2, floor: 1 },
    { minX: -321.5, maxX: -304.8, minZ: 50.4, maxZ: 51.2, floor: 1 },

    // Front Flowerbed Planters (outside fence, flanking Plaza)
    { minX: -360.2, maxX: -341.2, minZ: 43.0, maxZ: 46.2, floor: 1 },
    { minX: -321.2, maxX: -305.8, minZ: 43.0, maxZ: 46.2, floor: 1 },

    // Enterable Guardhouse Walls (Phòng Bảo Vệ: X = -326.8 .. -321.5, Z = 48.0 .. 52.2, Doorway X = -325.3..-323.3 at Z = 52.0)
    { minX: -327.0, maxX: -326.5, minZ: 48.0, maxZ: 52.2, floor: 1 }, // West wall
    { minX: -322.1, maxX: -321.4, minZ: 48.0, maxZ: 52.2, floor: 1 }, // East L-portal wall
    { minX: -326.8, maxX: -321.8, minZ: 48.0, maxZ: 48.45, floor: 1 }, // North street wall
    { minX: -326.8, maxX: -325.3, minZ: 51.75, maxZ: 52.2, floor: 1 }, // South wall left of doorway
    { minX: -323.3, maxX: -321.8, minZ: 51.75, maxZ: 52.2, floor: 1 }, // South wall right of doorway
    { minX: -326.5, maxX: -325.0, minZ: 48.6, maxZ: 50.1, floor: 1 }, // Interior security desk

    // Left Front Bike Shed (Nhà Xe Học Sinh) outer pillars only so players can inspect bikes
    { minX: -359.8, maxX: -344.2, minZ: 51.4, maxZ: 52.2, floor: 1 },
    { minX: -359.8, maxX: -358.8, minZ: 51.4, maxZ: 55.2, floor: 1 },

    // Front Facade Wing Solid End-Walls (Portico X = -343.0 .. -323.0 is WIDE OPEN underneath!)
    { minX: -359.8, maxX: -343.0, minZ: 55.2, maxZ: 66.5, floor: 1 },
    { minX: -323.0, maxX: -306.2, minZ: 55.2, maxZ: 66.5, floor: 1 },

    // Floor 1 Flagpole Stepped Podium & Courtyard Tree Planters
    { minX: -335.4, maxX: -330.6, minZ: 71.1, maxZ: 75.9, floor: 1 },
    { minX: -346.6, maxX: -342.4, minZ: 77.2, maxZ: 81.2, floor: 1 },
    { minX: -323.6, maxX: -319.4, minZ: 77.2, maxZ: 81.2, floor: 1 },
    { minX: -346.6, maxX: -342.4, minZ: 92.8, maxZ: 96.8, floor: 1 },
    { minX: -323.6, maxX: -319.4, minZ: 92.8, maxZ: 96.8, floor: 1 },

    // Floor 1 Rear Passage to Back Yard (X = -323.0 .. -317.8 is OPEN!)
    // Rear Cross Wing Rooms on Floor 1: Teachers' Lounge (-352..-323.2) & Music Room (-317.6..-306.5)
    { minX: -353.8, maxX: -339.2, minZ: 105.8, maxZ: 106.4, floor: 1 }, // Teachers' Lounge North wall L (Doorway -339.2..-336.8)
    { minX: -336.8, maxX: -323.0, minZ: 105.8, maxZ: 106.4, floor: 1 }, // Teachers' Lounge North wall R
    { minX: -353.8, maxX: -353.2, minZ: 105.8, maxZ: 115.6, floor: 1 }, // West divider near stairwell
    { minX: -323.4, maxX: -322.8, minZ: 105.8, maxZ: 115.6, floor: 1 }, // East wall of Teachers' Lounge
    { minX: -353.8, maxX: -323.0, minZ: 115.1, maxZ: 115.8, floor: 1 }, // Rear outer wall of Teachers' Lounge
    { minX: -344.5, maxX: -333.5, minZ: 109.8, maxZ: 111.6, floor: 1 }, // Conference table inside Teachers' Lounge

    { minX: -317.9, maxX: -313.6, minZ: 105.8, maxZ: 106.4, floor: 1 }, // Music Room North wall L (Doorway -313.6..-311.4)
    { minX: -311.4, maxX: -306.2, minZ: 105.8, maxZ: 106.4, floor: 1 }, // Music Room North wall R
    { minX: -318.0, maxX: -317.4, minZ: 105.8, maxZ: 115.6, floor: 1 }, // West wall of Music Room
    { minX: -307.2, maxX: -306.2, minZ: 105.8, maxZ: 115.6, floor: 1 }, // East outer wall of Music Room
    { minX: -317.9, maxX: -306.2, minZ: 115.1, maxZ: 115.8, floor: 1 }, // South outer wall of Music Room

    // Rear 2-Story Canteen / Academic Block (X = -359.5 .. -338.0, Z = 119.5 .. 129.0) — OPEN Ground Floor Canteen!
    // Doorway at South face Z = 128.6..129.2, X = -350.8..-346.6
    { minX: -359.6, maxX: -338.0, minZ: 119.4, maxZ: 120.1, floor: 1 }, // North wall
    { minX: -359.6, maxX: -358.8, minZ: 119.4, maxZ: 129.1, floor: 1 }, // West wall
    { minX: -338.6, maxX: -337.8, minZ: 119.4, maxZ: 129.1, floor: 1 }, // East wall
    { minX: -359.6, maxX: -350.8, minZ: 128.5, maxZ: 129.2, floor: 1 }, // South wall L
    { minX: -346.6, maxX: -338.0, minZ: 128.5, maxZ: 129.2, floor: 1 }, // South wall R
    { minX: -358.2, maxX: -352.0, minZ: 120.8, maxZ: 122.6, floor: 1 }, // Canteen serving counter

    // White Gabled Multi-Purpose Pavilion (Nhà Đa Năng, X = -334.0 .. -317.0, Z = 122.0 .. 131.5) - pillars + picnic benches
    { minX: -334.2, maxX: -333.4, minZ: 122.0, maxZ: 131.5, floor: 1 },
    { minX: -317.6, maxX: -316.8, minZ: 122.0, maxZ: 131.5, floor: 1 },
    { minX: -330.3, maxX: -327.7, minZ: 125.6, maxZ: 127.8, floor: 1 },
    { minX: -323.3, maxX: -320.7, minZ: 125.6, maxZ: 127.8, floor: 1 },

    // Rear Covered Cyan-Skylight Sports Court Walls (X = -356.5 .. -312.0, Z = 136.0 .. 146.5, open doorway X = -336..-330)
    { minX: -356.5, maxX: -336.0, minZ: 135.8, maxZ: 136.6, floor: 1 },
    { minX: -330.0, maxX: -312.0, minZ: 135.8, maxZ: 136.6, floor: 1 },
    { minX: -356.5, maxX: -355.7, minZ: 135.8, maxZ: 146.5, floor: 1 },
    { minX: -312.8, maxX: -312.0, minZ: 135.8, maxZ: 146.5, floor: 1 },
    { minX: -356.5, maxX: -312.0, minZ: 145.8, maxZ: 146.6, floor: 1 },
  ];

  // =========================================================================
  // ENTERABLE CLASSROOMS & ROOMS ACROSS FLOORS 1, 2 AND 3
  // =========================================================================
  [1, 2, 3].forEach((fl) => {
    // 1. West Wing Classrooms (X = -359.5 .. -351.3, Z = 66.5 .. 102.6)
    // Doorways: North room at Z = 74.2..76.4, South room at Z = 92.8..95.0
    // Floor 1 ends at Z = 101.7 to open a clear breezeway (Z = 101.7..104.4) out to the Basketball Side Gate!
    cols.push(
      { minX: -359.8, maxX: -358.8, minZ: 66.5, maxZ: fl === 1 ? 101.7 : 102.8, floor: fl }, // West outer wall
      { minX: -351.9, maxX: -351.1, minZ: 66.5, maxZ: 74.2, floor: fl }, // Corridor wall 1
      { minX: -351.9, maxX: -351.1, minZ: 76.4, maxZ: 92.8, floor: fl }, // Corridor wall 2
      { minX: -351.9, maxX: -351.1, minZ: 95.0, maxZ: fl === 1 ? 101.7 : 102.8, floor: fl }, // Corridor wall 3
      { minX: -359.2, maxX: -351.2, minZ: 66.3, maxZ: 67.0, floor: fl }, // North room end wall
      { minX: -359.2, maxX: -351.2, minZ: 84.6, maxZ: 85.4, floor: fl }, // Center partition
      {
        minX: -359.2,
        maxX: -351.2,
        minZ: fl === 1 ? 101.0 : 102.2,
        maxZ: fl === 1 ? 101.7 : 102.9,
        floor: fl,
      } // South room end wall (leaves Z=101.7..104.4 clear on Floor 1 for Basketball Side Gate!)
    );

    // 2. East Wing Classrooms (X = -314.7 .. -306.5, Z = 66.5 .. 102.6)
    // Doorways: North room at Z = 74.2..76.4, South room at Z = 92.8..95.0
    cols.push(
      { minX: -307.2, maxX: -306.2, minZ: 66.5, maxZ: 102.8, floor: fl }, // East outer wall
      { minX: -314.9, maxX: -314.1, minZ: 66.5, maxZ: 74.2, floor: fl }, // Corridor wall 1
      { minX: -314.9, maxX: -314.1, minZ: 76.4, maxZ: 92.8, floor: fl }, // Corridor wall 2
      { minX: -314.9, maxX: -314.1, minZ: 95.0, maxZ: 102.8, floor: fl }, // Corridor wall 3
      { minX: -314.8, maxX: -306.8, minZ: 66.3, maxZ: 67.0, floor: fl }, // North room end wall
      { minX: -314.8, maxX: -306.8, minZ: 84.6, maxZ: 85.4, floor: fl }, // Center partition
      { minX: -314.8, maxX: -306.8, minZ: 102.2, maxZ: 102.9, floor: fl } // South room end wall
    );

    // 3. Classroom Desk Row Colliders (leaving center aisle + front doorway wide open!)
    // West North Classroom (67..84.6) & West South Classroom (85.4..102.2)
    [71.8, 78.6, 80.6, 89.2, 91.6, 98.0].forEach((dz) => {
      if (fl === 1 && dz > 86) return; // Floor 1 West South is Medical/Youth room
      cols.push(
        { minX: -358.1, maxX: -356.1, minZ: dz - 0.35, maxZ: dz + 0.35, floor: fl },
        { minX: -354.5, maxX: -352.5, minZ: dz - 0.35, maxZ: dz + 0.35, floor: fl }
      );
    });
    if (fl === 1) {
      // Medical & Youth Union room props (West South Floor 1)
      cols.push(
        { minX: -358.5, maxX: -356.5, minZ: 87.0, maxZ: 89.5, floor: 1 },
        { minX: -355.0, maxX: -352.5, minZ: 97.5, maxZ: 99.6, floor: 1 }
      );
    }

    // East North & South Rooms
    [71.8, 78.6, 80.6, 89.2, 91.6, 98.0].forEach((dz) => {
      cols.push(
        { minX: -313.5, maxX: -311.5, minZ: dz - 0.35, maxZ: dz + 0.35, floor: fl },
        { minX: -309.9, maxX: -307.9, minZ: dz - 0.35, maxZ: dz + 0.35, floor: fl }
      );
    });

    // Upper-Floor Corridor Guardrails, Outer Perimeter & Enterable Rooms on Floors 2 & 3
    if (fl >= 2) {
      cols.push(
        // Balcony Guardrails around Courtyard Opening (X = -348.5 .. -317.5, Z = 66.5 .. 103.2)
        { minX: -349.1, maxX: -348.1, minZ: 66.3, maxZ: 103.4, floor: fl },
        { minX: -317.9, maxX: -316.9, minZ: 66.3, maxZ: 103.4, floor: fl },
        { minX: -348.5, maxX: -317.5, minZ: 66.1, maxZ: 67.0, floor: fl },
        { minX: -348.5, maxX: -317.5, minZ: 102.8, maxZ: 103.6, floor: fl },
        // Outer Perimeter Walls on Upper Floors
        { minX: -359.8, maxX: -358.8, minZ: 55.2, maxZ: 115.6, floor: fl },
        { minX: -307.2, maxX: -306.2, minZ: 55.2, maxZ: 115.6, floor: fl },
        { minX: -359.8, maxX: -306.2, minZ: 55.2, maxZ: 56.2, floor: fl },
        { minX: -359.8, maxX: -306.2, minZ: 114.8, maxZ: 115.8, floor: fl },
        // Front Corner Structural End Wings (solid at X=-359..-351.3 and -314.7..-307)
        { minX: -359.0, maxX: -351.3, minZ: 55.2, maxZ: 66.5, floor: fl },
        { minX: -314.7, maxX: -307.0, minZ: 55.2, maxZ: 66.5, floor: fl },
        // Front Bridge Room (Principal Office Floor 2 / Hall of Fame Floor 3): X = -343..-323, Z = 56.2..63.7
        // Open doorway at X = -334.4..-331.6, Z = 63.7!
        { minX: -351.3, maxX: -343.0, minZ: 55.2, maxZ: 63.7, floor: fl },
        { minX: -323.0, maxX: -314.7, minZ: 55.2, maxZ: 63.7, floor: fl },
        { minX: -343.2, maxX: -342.4, minZ: 56.2, maxZ: 63.9, floor: fl },
        { minX: -323.6, maxX: -322.8, minZ: 56.2, maxZ: 63.9, floor: fl },
        { minX: -343.2, maxX: -334.4, minZ: 63.2, maxZ: 63.9, floor: fl },
        { minX: -331.6, maxX: -322.8, minZ: 63.2, maxZ: 63.9, floor: fl },
        { minX: -335.4, maxX: -330.6, minZ: 58.2, maxZ: 59.8, floor: fl }, // Executive desk / Display showcase
        // Rear Cross-Wing Room (Floor 2 = Library, Floor 3 = Auditorium): X = -352.5..-306.8, Z = 106.0..115.4
        // Open wide double doorway at X = -335.0..-331.0, Z = 106.0!
        { minX: -353.8, maxX: -335.0, minZ: 105.8, maxZ: 106.5, floor: fl },
        { minX: -331.0, maxX: -306.5, minZ: 105.8, maxZ: 106.5, floor: fl },
        { minX: -353.8, maxX: -353.0, minZ: 105.8, maxZ: 115.6, floor: fl }
      );
      if (fl === 2) {
        // Library bookshelves & reading tables
        cols.push(
          { minX: -348.5, maxX: -342.5, minZ: 110.2, maxZ: 111.6, floor: 2 },
          { minX: -323.5, maxX: -317.5, minZ: 110.2, maxZ: 111.6, floor: 2 },
          { minX: -337.0, maxX: -329.0, minZ: 110.2, maxZ: 111.8, floor: 2 }
        );
      } else {
        // Auditorium stage podium (West end)
        cols.push({ minX: -352.6, maxX: -346.5, minZ: 107.0, maxZ: 114.4, floor: 3 });
      }
    }
  });

  return cols;
}

export const PHAN_CHAU_TRINH_COLLIDERS: IntersectionColliderBox[] = buildPhanChuTrinhColliders();

// =========================================================================
// PROCEDURAL CANVAS TEXTURES (SIGNS, CHALKBOARDS, MONITORS, FLAG, CREST)
// =========================================================================
function createSchoolSignTexture(title: string, subtitle?: string, goldText = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cf4848';
  ctx.fillRect(0, 0, 1024, 192);

  ctx.strokeStyle = '#fef2f2';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 176);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = goldText ? '#fef08a' : '#ffffff';
  if (subtitle) {
    ctx.font = '900 50px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, 512, 70);
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(subtitle, 512, 134);
  } else {
    ctx.font = '900 56px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, 512, 98);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createRoomPlaqueTexture(roomTitle: string, bgHex = '#b91c1c'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 384, 96);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 372, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roomTitle, 192, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChalkboardTexture(classLabel: string, line1: string, line2: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 244);

  ctx.fillStyle = 'rgba(254, 240, 138, 0.94)';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText(`THPT PHAN CHÂU TRINH • ${classLabel}`, 28, 48);
  ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText(line1, 28, 102);
  ctx.fillText(line2, 28, 144);
  ctx.fillStyle = 'rgba(167, 243, 208, 0.85)';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('Giờ học: 07:00 – 17:00  •  Thi đua Dạy Tốt - Học Tốt', 28, 198);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCctvMonitorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 256, 160);
  const cams = ['CAM 01: CỔNG', 'CAM 02: SÂN CỜ', 'CAM 03: HÀNH LANG', 'CAM 04: SÂN SAU'];
  const colors = ['#1e3a8a', '#14532d', '#312e81', '#134e4a'];
  cams.forEach((lbl, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 6 + col * 124;
    const y = 6 + row * 76;
    ctx.fillStyle = colors[idx];
    ctx.fillRect(x, y, 118, 70);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 118, 70);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + 10, y + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 10px monospace';
    ctx.fillText(lbl, x + 18, y + 15);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createVnFlagTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 170;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#da251d';
  ctx.fillRect(0, 0, 256, 170);

  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  const cx = 128;
  const cy = 85;
  const rOut = 42;
  const rIn = 16;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOut : rIn;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGateEmblemTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cf4848';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.fillStyle = '#cf4848';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PCT', 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCanteenMenuTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 384, 160);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 374, 150);
  ctx.fillStyle = '#fde047';
  ctx.font = '900 26px system-ui, sans-serif';
  ctx.fillText('CĂNG TIN THPT PHAN CHÂU TRINH', 20, 38);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('Bánh Mì Trứng / Thịt: $1.5  •  Xôi Mặn: $1.5', 20, 78);
  ctx.fillText('Trà Sữa / Nước Cam: $1.0  •  Cơm Trưa: $2.5', 20, 112);
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('Mở cửa phục vụ học sinh 06:30 – 17:30', 20, 142);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPhanChuTrinhSchoolStructure(): PhanChuTrinhSchoolBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Refined Architectural PBR Materials (warm cream stucco, coral red, teak wood soffits, transparent glass)
  const stuccoWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.84 });
  const warmFacadeMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f3, roughness: 0.82 });
  const coralRedMat = new THREE.MeshStandardMaterial({ color: 0xd9534f, roughness: 0.58, metalness: 0.05 });
  const deepRedRoofMat = new THREE.MeshStandardMaterial({ color: 0xc4423e, roughness: 0.66 });
  const woodSoffitMat = new THREE.MeshStandardMaterial({ color: 0xb07542, roughness: 0.72 });
  const plazaTileMat = new THREE.MeshStandardMaterial({ color: 0xddd9d2, roughness: 0.86 });
  const courtyardTileMat = new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.84 });
  const courtyardAccentTileMat = new THREE.MeshStandardMaterial({ color: 0xcbc6bd, roughness: 0.85 });
  const graniteStepMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.08 });
  const classroomFloorMat = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 0.68 });
  const ironFenceMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.68 });
  const louverMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.42, metalness: 0.52 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.45 });
  const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.12 });
  const timberBenchMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.74 });
  const woodDeskMat = new THREE.MeshStandardMaterial({ color: 0xc88f50, roughness: 0.7 });
  const chairBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.68 });
  const curtainBeigeMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 });
  const glassWindowMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.44,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.08,
  });
  const cyanSkylightMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    roughness: 0.2,
    metalness: 0.15,
    transparent: true,
    opacity: 0.72,
    emissive: 0x0891b2,
    emissiveIntensity: 0.18,
  });
  const grassLawnMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.92 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.84 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.82 });
  const flowerPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 });
  const flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.8 });
  const courtBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
  const courtGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const monitorGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const ceilingLedMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    emissive: 0xfef08a,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  neonMats.push(glassWindowMat, cyanSkylightMat, ceilingLedMat, monitorGlowMat);
  lanternMats.push(warmLanternMat);

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material,
    parent: THREE.Group = staticGroup
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    parent.add(m);
    return m;
  };

  const addCyl = (
    x: number,
    y0: number,
    y1: number,
    z: number,
    rTop: number,
    rBot: number,
    mat: THREE.Material,
    segs = 14,
    parent: THREE.Group = staticGroup
  ) => {
    const h = y1 - y0;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
    m.position.set(x, (y0 + y1) * 0.5, z);
    parent.add(m);
    return m;
  };

  // Detailed multi-frond palm tree with layered crown
  const addPalmTree = (x: number, z: number, height = 4.6) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, height, 8), trunkMat);
    trunk.position.y = height * 0.5;
    g.add(trunk);
    const crownHub = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), leafMat1);
    crownHub.position.y = height;
    g.add(crownHub);
    for (let tier = 0; tier < 2; tier++) {
      const cnt = tier === 0 ? 7 : 5;
      const tilt = tier === 0 ? 0.36 : 0.08;
      const len = tier === 0 ? 1.75 : 1.45;
      for (let f = 0; f < cnt; f++) {
        const ang = (f / cnt) * Math.PI * 2 + tier * 0.45;
        const fGrp = new THREE.Group();
        fGrp.position.y = height + tier * 0.14;
        fGrp.rotation.y = ang;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28, len, 5), tier === 0 ? leafMat1 : leafMat2);
        frond.rotation.x = Math.PI * 0.5 + tilt;
        frond.position.set(0, -tilt * 0.2, len * 0.55);
        fGrp.add(frond);
        g.add(fGrp);
      }
    }
    staticGroup.add(g);
  };

  const addShadeTree = (x: number, z: number, baseY: number, scale = 1.0) => {
    const g = new THREE.Group();
    g.position.set(x, baseY, z);
    g.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3.2, 8), trunkMat);
    trunk.position.y = 1.6;
    g.add(trunk);
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.75, 10, 8), leafMat1);
    c1.position.set(0, 4.1, 0);
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), leafMat2);
    c2.position.set(0.75, 4.75, 0.45);
    g.add(c2);
    const c3 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), leafMat1);
    c3.position.set(-0.68, 4.55, -0.45);
    g.add(c3);
    const c4 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 9, 7), leafMat2);
    c4.position.set(-0.4, 5.15, 0.45);
    g.add(c4);
    staticGroup.add(g);
  };

  // Window module helper (framed reflective translucent glass + mullions so classrooms are visible inside!)
  const addWindowBay = (
    cx: number,
    y0: number,
    cz: number,
    width: number,
    height: number,
    facingAxis: 'x' | 'z'
  ) => {
    const thickness = 0.08;
    if (facingAxis === 'z') {
      addBox(cx - width * 0.5, cx + width * 0.5, y0, y0 + height, cz - thickness * 0.5, cz + thickness * 0.5, glassWindowMat);
      addBox(cx - width * 0.5, cx + width * 0.5, y0 - 0.06, y0 + 0.04, cz - 0.08, cz + 0.08, mullionMat);
      addBox(cx - width * 0.5, cx + width * 0.5, y0 + height - 0.04, y0 + height + 0.05, cz - 0.08, cz + 0.08, mullionMat);
      [-0.5, 0, 0.5].forEach((frac) => {
        const mx = cx + frac * width;
        addBox(mx - 0.035, mx + 0.035, y0, y0 + height, cz - 0.07, cz + 0.07, mullionMat);
      });
    } else {
      addBox(cx - thickness * 0.5, cx + thickness * 0.5, y0, y0 + height, cz - width * 0.5, cz + width * 0.5, glassWindowMat);
      addBox(cx - 0.08, cx + 0.08, y0 - 0.06, y0 + 0.04, cz - width * 0.5, cz + width * 0.5, mullionMat);
      addBox(cx - 0.08, cx + 0.08, y0 + height - 0.04, y0 + height + 0.05, cz - width * 0.5, cz + width * 0.5, mullionMat);
      [-0.5, 0, 0.5].forEach((frac) => {
        const mz = cz + frac * width;
        addBox(cx - 0.07, cx + 0.07, y0, y0 + height, mz - 0.035, mz + 0.035, mullionMat);
      });
    }
  };

  // Room plaque & open wooden door helper
  const addRoomDoorwayAndPlaque = (
    doorX: number,
    floorY: number,
    doorZ: number,
    facing: '+x' | '-x' | '+z' | '-z',
    roomLabel: string,
    plaqueColor = '#b91c1c'
  ) => {
    const tex = createRoomPlaqueTexture(roomLabel, plaqueColor);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.22,
      roughness: 0.45,
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.36), mat);
    const frameW = 0.08;
    if (facing === '+x' || facing === '-x') {
      const signDir = facing === '+x' ? 1 : -1;
      plaque.position.set(doorX + signDir * 0.34, floorY + 2.75, doorZ);
      plaque.rotation.y = signDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      // Open wooden door swung neatly inside classroom
      addBox(
        doorX - signDir * 0.95,
        doorX - signDir * 0.05,
        floorY,
        floorY + 2.35,
        doorZ - 1.05,
        doorZ - 0.96,
        timberBenchMat
      );
      // Door jambs
      addBox(doorX - 0.28, doorX + 0.28, floorY, floorY + 2.42, doorZ - 1.12, doorZ - 1.12 + frameW, mullionMat);
      addBox(doorX - 0.28, doorX + 0.28, floorY, floorY + 2.42, doorZ + 1.12 - frameW, doorZ + 1.12, mullionMat);
    } else {
      const signDir = facing === '+z' ? 1 : -1;
      plaque.position.set(doorX, floorY + 2.75, doorZ + signDir * 0.34);
      plaque.rotation.y = signDir > 0 ? 0 : Math.PI;
      addBox(
        doorX - 1.08,
        doorX - 0.98,
        floorY,
        floorY + 2.35,
        doorZ - signDir * 0.95,
        doorZ - signDir * 0.05,
        timberBenchMat
      );
      addBox(doorX - 1.15, doorX - 1.15 + frameW, floorY, floorY + 2.42, doorZ - 0.28, doorZ + 0.28, mullionMat);
      addBox(doorX + 1.15 - frameW, doorX + 1.15, floorY, floorY + 2.42, doorZ - 0.28, doorZ + 0.28, mullionMat);
    }
    staticGroup.add(plaque);
  };

  // =========================================================================
  // 1. FRONT FORECOURT PLAZA, IRON FENCE, ACTIVE GATES & ENTERABLE GUARDHOUSE
  // =========================================================================
  addBox(PHAN_CHAU_TRINH_MIN_X, PHAN_CHAU_TRINH_MAX_X, -0.28, 0.0, 42.5, 55.2, plazaTileMat);
  for (let gx = -358; gx <= -308; gx += 4) {
    addBox(gx - 0.03, gx + 0.03, 0.002, 0.006, 43.0, 54.8, courtyardTileMat);
  }
  for (let gz = 45; gz <= 54; gz += 3) {
    addBox(-360.5, -305.5, 0.002, 0.006, gz - 0.03, gz + 0.03, courtyardTileMat);
  }

  // Front Perimeter Iron Picket Fence (Z = 50.8, leaving Main Gate X = -338.5..-327.5 & Pedestrian Gate X = -327.5..-325.4 clear!)
  const addFenceSection = (xStart: number, xEnd: number, zLine: number) => {
    addBox(xStart, xEnd, 0.0, 0.46, zLine - 0.14, zLine + 0.14, stuccoWhiteMat);
    addBox(xStart, xEnd, 2.22, 2.28, zLine - 0.06, zLine + 0.06, ironFenceMat);
    addBox(xStart, xEnd, 0.62, 0.68, zLine - 0.05, zLine + 0.05, ironFenceMat);
    for (let px = xStart + 0.35; px <= xEnd - 0.35; px += 0.38) {
      addBox(px - 0.025, px + 0.025, 0.46, 2.34, zLine - 0.025, zLine + 0.025, ironFenceMat);
    }
    for (let px = xStart; px <= xEnd + 0.05; px += 4.2) {
      addBox(px - 0.18, px + 0.18, 0.0, 2.46, zLine - 0.18, zLine + 0.18, stuccoWhiteMat);
    }
  };
  addFenceSection(-360.8, -338.6, 50.8);
  addFenceSection(-321.5, -305.2, 50.8);

  // East, West & Rear Perimeter Walls (Z = 50.8 .. 148.0) — West Wall opens at Z = 101.7..104.4 for Cổng Sân Bóng Rổ
  addBox(-361.2, -360.6, 0.0, 2.45, 50.8, 101.7, stuccoWhiteMat);
  addBox(-361.2, -360.6, 0.0, 2.45, 104.4, 148.0, stuccoWhiteMat);
  addBox(-305.4, -304.8, 0.0, 2.45, 50.8, 148.0, stuccoWhiteMat);
  addBox(-361.2, -304.8, 0.0, 2.45, 147.4, 148.0, stuccoWhiteMat);

  // West Student Side Gate ("CỔNG SÂN BÓNG RỔ") connecting School Courtyard directly to Basketball Court & FAHASA Plaza
  addBox(-361.32, -360.48, 0.0, 3.35, 101.35, 101.78, stuccoWhiteMat);
  addBox(-361.32, -360.48, 0.0, 3.35, 104.32, 104.75, stuccoWhiteMat);
  addBox(-361.4, -360.4, 3.35, 3.55, 101.28, 101.84, coralRedMat);
  addBox(-361.4, -360.4, 3.35, 3.55, 104.26, 104.82, coralRedMat);
  addBox(-361.3, -360.5, 2.85, 3.35, 101.7, 104.4, coralRedMat);
  addBox(-361.35, -360.45, 3.35, 3.5, 101.7, 104.4, whiteTrimMat);
  // Open iron gate leaves swung back neatly against inside wall
  addBox(-360.55, -359.75, 0.48, 2.55, 101.72, 101.82, ironFenceMat);
  addBox(-360.55, -359.75, 0.48, 2.55, 104.28, 104.38, ironFenceMat);
  // Granite threshold & steps from exterior ground (Y=0 at X=-362.5) up to school podium (Y=0.45 at X=-360.5)
  addBox(-360.6, -359.75, -0.05, SCHOOL_PODIUM_Y, 101.7, 104.4, courtyardTileMat);
  for (let s = 0; s < 4; s++) {
    const sx0 = -362.5 + s * 0.5;
    const sy1 = ((s + 1) / 4) * SCHOOL_PODIUM_Y;
    addBox(sx0, sx0 + 0.52, -0.05, sy1, 101.7, 104.4, graniteStepMat);
  }
  const sideGateTex = createSchoolSignTexture('CỔNG SÂN BÓNG RỔ', 'LỐI RA SÂN 3x3 & NHÀ SÁCH', true);
  const sideGateMat = new THREE.MeshStandardMaterial({
    map: sideGateTex,
    emissive: 0xffffff,
    emissiveMap: sideGateTex,
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  neonMats.push(sideGateMat);
  const sideGateFaceOut = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.46), sideGateMat);
  sideGateFaceOut.position.set(-361.34, 3.1, 103.05);
  sideGateFaceOut.rotation.y = -Math.PI / 2;
  staticGroup.add(sideGateFaceOut);
  const sideGateFaceIn = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.46), sideGateMat);
  sideGateFaceIn.position.set(-360.46, 3.1, 103.05);
  sideGateFaceIn.rotation.y = Math.PI / 2;
  staticGroup.add(sideGateFaceIn);

  // Front Flowerbeds outside fence with Tropical Palms & Dense Bougainvillea Blossoms
  const addPlanterBox = (x0: number, x1: number, z0: number, z1: number) => {
    addBox(x0, x1, 0.0, 0.36, z0, z1, stuccoWhiteMat);
    addBox(x0 + 0.25, x1 - 0.25, 0.34, 0.42, z0 + 0.25, z1 - 0.25, grassLawnMat);
    for (let sx = x0 + 0.85; sx <= x1 - 0.85; sx += 1.45) {
      const gBush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), leafMat2);
      gBush.position.set(sx, 0.54, (z0 + z1) * 0.5);
      staticGroup.add(gBush);
      const fl = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.32, 1),
        Math.round(sx) % 2 === 0 ? flowerPinkMat : flowerRedMat
      );
      fl.position.set(sx + 0.12, 0.72, (z0 + z1) * 0.5 - 0.08);
      staticGroup.add(fl);
    }
  };
  addPlanterBox(-360.0, -341.4, 43.2, 46.0);
  addPlanterBox(-321.2, -306.0, 43.2, 46.0);
  addPalmTree(-356.5, 44.6, 4.4);
  addPalmTree(-350.0, 44.6, 4.8);
  addPalmTree(-343.8, 44.6, 4.2);
  addPalmTree(-317.8, 44.6, 4.5);
  addPalmTree(-310.2, 44.6, 4.7);
  addShadeTree(-308.5, 52.8, 0.0, 0.95);

  // Modern School Main Gate Canopy & Overhead Track (X = -340.0 .. -321.4, Z = 49.3 .. 52.7)
  addBox(-340.0, -321.4, 3.65, 4.00, 49.3, 52.7, stuccoWhiteMat);
  addBox(-340.05, -321.35, 4.00, 4.12, 49.25, 52.75, coralRedMat);
  // Warm wood soffit under gate canopy
  addBox(-339.7, -321.7, 3.61, 3.65, 49.5, 52.5, woodSoffitMat);
  [-338.8, -327.2].forEach((gx) => {
    [49.8, 52.1].forEach((gz) => {
      addCyl(gx, 0.0, 3.65, gz, 0.22, 0.22, whiteTrimMat, 14);
    });
  });

  // Main Gate Signboard (sleek & crisp so Floor 2 facade sign stays completely unobstructed above!)
  const gateSignTex = createSchoolSignTexture('TRƯỜNG THPT PHAN CHÂU TRINH', 'GIỜ HỌC: 07:00 – 17:00  •  CHÀO MỪNG', true);
  const gateSignMat = new THREE.MeshStandardMaterial({
    map: gateSignTex,
    emissive: 0xffffff,
    emissiveMap: gateSignTex,
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  neonMats.push(gateSignMat);
  const gateSignFace = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 1.05), gateSignMat);
  gateSignFace.position.set(-333.0, 4.62, 49.26);
  gateSignFace.rotation.y = Math.PI;
  staticGroup.add(gateSignFace);
  addBox(-337.1, -328.9, 4.12, 5.18, 49.28, 49.55, coralRedMat);

  // --- ACTIVE ANIMATED SLIDING IRON PICKET MAIN GATES + BARRIER ARM + PEDESTRIAN GATE ---
  const gateEmblemTex = createGateEmblemTexture();
  const gateEmblemMat = new THREE.MeshStandardMaterial({ map: gateEmblemTex, transparent: true, roughness: 0.4 });
  const dynamicGateRoot = new THREE.Group();
  dynamicGateRoot.userData.noMerge = true;
  staticGroup.add(dynamicGateRoot);

  const buildSlidingGateWing = (width: number) => {
    const wing = new THREE.Group();
    // Outer rectangular steel frame + mid rail (hollow picket styling, NOT solid black slab!)
    addBox(-width * 0.5, width * 0.5, 0.14, 0.24, -0.05, 0.05, ironFenceMat, wing);
    addBox(-width * 0.5, width * 0.5, 1.08, 1.15, -0.04, 0.04, ironFenceMat, wing);
    addBox(-width * 0.5, width * 0.5, 2.15, 2.26, -0.05, 0.05, ironFenceMat, wing);
    addBox(-width * 0.5, -width * 0.5 + 0.09, 0.14, 2.26, -0.05, 0.05, ironFenceMat, wing);
    addBox(width * 0.5 - 0.09, width * 0.5, 0.14, 2.26, -0.05, 0.05, ironFenceMat, wing);
    for (let px = -width * 0.5 + 0.32; px <= width * 0.5 - 0.25; px += 0.34) {
      addBox(px - 0.022, px + 0.022, 0.18, 2.34, -0.022, 0.022, ironFenceMat, wing);
    }
    const discFront = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), gateEmblemMat);
    discFront.position.set(0, 1.38, -0.06);
    discFront.rotation.y = Math.PI;
    wing.add(discFront);
    const discBack = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), gateEmblemMat);
    discBack.position.set(0, 1.38, 0.06);
    wing.add(discBack);
    return wing;
  };

  // Left Sliding Gate Wing (Closed X = -335.75, Open slides West to X = -341.0)
  const leftGateWing = buildSlidingGateWing(5.4);
  leftGateWing.position.set(-335.75, 0, 50.8);
  dynamicGateRoot.add(leftGateWing);

  // Right Sliding Gate Wing (Closed X = -330.25, Open slides East behind fence/guardhouse track to X = -324.8)
  const rightGateWing = buildSlidingGateWing(5.4);
  rightGateWing.position.set(-330.25, 0, 50.8);
  dynamicGateRoot.add(rightGateWing);

  // Articulated Red/White Security Boom Barrier inside Gate (Pivot at X = -327.6, Z = 51.65)
  addBox(-327.82, -327.38, 0.0, 1.05, 51.45, 51.85, coralRedMat);
  const barrierPivot = new THREE.Group();
  barrierPivot.position.set(-327.6, 0.95, 51.65);
  for (let seg = 0; seg < 6; seg++) {
    addBox(-0.22 - seg * 1.15 - 1.1, -0.22 - seg * 1.15, -0.04, 0.06, -0.04, 0.04, seg % 2 === 0 ? coralRedMat : whiteTrimMat, barrierPivot);
  }
  dynamicGateRoot.add(barrierPivot);

  // --- ENTERABLE GUARDHOUSE (PHÒNG BẢO VỆ, X = -326.8 .. -321.5, Z = 48.0 .. 52.2) ---
  // Hollow structure with walk-in South doorway (X = -325.3 .. -323.3, Z = 52.0), translucent windows, desk & CCTV!
  addBox(-326.8, -321.8, 0.0, 0.08, 48.2, 52.0, classroomFloorMat); // Tiled floor
  addBox(-326.8, -321.8, 3.05, 3.18, 48.2, 52.0, stuccoWhiteMat); // Ceiling slab
  // West wall (facing Gate) with translucent service window (Z = 48.8..51.1)
  addBox(-326.8, -326.58, 0.0, 1.05, 48.2, 52.0, stuccoWhiteMat);
  addBox(-326.8, -326.58, 2.35, 3.12, 48.2, 52.0, stuccoWhiteMat);
  addBox(-326.8, -326.58, 1.05, 2.35, 48.2, 48.8, stuccoWhiteMat);
  addBox(-326.8, -326.58, 1.05, 2.35, 51.1, 52.0, stuccoWhiteMat);
  addWindowBay(-326.7, 1.05, 49.95, 2.3, 1.3, 'x');
  // North wall (facing Street) with wide translucent window (X = -325.8..-322.8)
  addBox(-326.8, -321.8, 0.0, 1.05, 48.2, 48.42, stuccoWhiteMat);
  addBox(-326.8, -321.8, 2.35, 3.12, 48.2, 48.42, stuccoWhiteMat);
  addBox(-326.8, -325.8, 1.05, 2.35, 48.2, 48.42, stuccoWhiteMat);
  addBox(-322.8, -321.8, 1.05, 2.35, 48.2, 48.42, stuccoWhiteMat);
  addWindowBay(-324.3, 1.05, 48.31, 3.0, 1.3, 'z');
  // South wall (facing School Yard) with open Doorway X = -325.3 .. -323.3
  addBox(-326.8, -325.3, 0.0, 3.12, 51.78, 52.0, stuccoWhiteMat);
  addBox(-323.3, -321.8, 0.0, 3.12, 51.78, 52.0, stuccoWhiteMat);
  addBox(-325.3, -323.3, 2.35, 3.12, 51.78, 52.0, stuccoWhiteMat);
  // Signature Coral-Red Architectural L-Portal around Guardhouse (non-overlapping top/pillar join)
  addBox(-327.15, -321.45, 3.12, 3.55, 47.95, 52.25, coralRedMat);
  addBox(-321.80, -321.45, 0.0, 3.12, 47.95, 52.25, coralRedMat);
  // Guardhouse Interior Details: Desk, Glowing CCTV Screen, Chair, Key Rack & LED Ceiling Panel
  addBox(-326.4, -325.1, 0.08, 0.82, 48.65, 50.05, woodDeskMat);
  addBox(-326.3, -326.15, 0.85, 1.42, 48.85, 49.75, ironFenceMat);
  const cctvTex = createCctvMonitorTexture();
  const cctvMat = new THREE.MeshStandardMaterial({
    map: cctvTex,
    emissive: 0xffffff,
    emissiveMap: cctvTex,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  neonMats.push(cctvMat);
  const cctvFace = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.52), cctvMat);
  cctvFace.position.set(-326.13, 1.14, 49.3);
  cctvFace.rotation.y = Math.PI / 2;
  staticGroup.add(cctvFace);
  addBox(-325.1, -323.5, 2.98, 3.04, 49.3, 50.8, ceilingLedMat);
  const guardHouseLight = new THREE.PointLight(0xfef3c7, 0.9, 10, 1.6);
  guardHouseLight.position.set(-324.4, 2.75, 50.0);
  staticGroup.add(guardHouseLight);
  scaledLights.push({ light: guardHouseLight, dayInt: 0.55, nightInt: 1.45, getScale: () => 1 });
  // Plaque on Guardhouse
  addRoomDoorwayAndPlaque(-324.3, 0.0, 52.0, '+z', 'PHÒNG BẢO VỆ', '#0369a1');

  // Left Front Student Bike Shed (Nhà Xe Học Sinh, X = -359.5 .. -344.2, Z = 51.4 .. 55.1)
  const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.16, 4.2), coralRedMat);
  shedRoof.position.set(-351.85, 3.15, 53.25);
  shedRoof.rotation.x = 0.16;
  staticGroup.add(shedRoof);
  [-358.8, -354.2, -349.6, -345.0].forEach((tx) => {
    addBox(tx - 0.07, tx + 0.07, 0.0, 2.95, 53.9, 54.05, coralRedMat);
    addBox(tx - 0.07, tx + 0.07, 0.0, 3.25, 51.75, 51.9, coralRedMat);
  });
  const bikeColors = [0xef4444, 0x0ea5e9, 0x10b981, 0xf59e0b, 0x6366f1, 0xec4899];
  for (let bi = 0; bi < 6; bi++) {
    const bx = -357.8 + bi * 2.25;
    const bikePaint = new THREE.MeshStandardMaterial({ color: bikeColors[bi], roughness: 0.45 });
    addBox(bx - 0.06, bx + 0.06, 0.32, 0.88, 52.35, 53.75, bikePaint);
    addBox(bx - 0.25, bx + 0.25, 0.92, 0.98, 52.45, 52.55, ironFenceMat); // Handlebars
    addCyl(bx, 0.0, 0.56, 52.32, 0.32, 0.32, ironFenceMat, 10);
    addCyl(bx, 0.0, 0.56, 53.85, 0.32, 0.32, ironFenceMat, 10);
  }

  // =========================================================================
  // 2. MAIN 3-STORY SCHOOL COMPLEX + STEPPED WINGS + WOOD SOFFITS (Z = 55.2..116)
  // =========================================================================
  addBox(-359.8, -306.2, -0.25, SCHOOL_PODIUM_Y, 57.5, 116.0, courtyardTileMat);
  // Subtle Courtyard Paving Checkerboard Grid
  for (let gx = -347; gx <= -319; gx += 3) {
    addBox(gx - 0.025, gx + 0.025, SCHOOL_PODIUM_Y + 0.002, SCHOOL_PODIUM_Y + 0.008, 67.0, 102.5, courtyardAccentTileMat);
  }
  for (let gz = 69; gz <= 101; gz += 3) {
    addBox(-348.0, -318.0, SCHOOL_PODIUM_Y + 0.002, SCHOOL_PODIUM_Y + 0.008, gz - 0.025, gz + 0.025, courtyardAccentTileMat);
  }

  // Wide Granite Portico Steps & Side Ramp (Z = 55.0 .. 57.5)
  for (let s = 0; s < 5; s++) {
    const z0 = 55.0 + s * 0.5;
    const y1 = ((s + 1) / 5) * SCHOOL_PODIUM_Y;
    addBox(-343.0, -323.0, -0.1, y1, z0, z0 + 0.52, graniteStepMat);
  }
  const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 2.65), plazaTileMat);
  rampMesh.position.set(-324.4, 0.0, 56.25);
  rampMesh.rotation.x = -Math.atan2(SCHOOL_PODIUM_Y, 2.5);
  staticGroup.add(rampMesh);

  // Portico Open-Air Undercroft Columns + School Honor Board (Bảng Vinh Danh)
  [-342.4, -336.4, -329.6, -323.6].forEach((px) => {
    [58.2, 64.8].forEach((pz) => {
      addCyl(px, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H, pz, 0.28, 0.28, whiteTrimMat, 16);
    });
  });

  // Left Front Wing (X = -359.5 .. -343.0, Z = 55.2 .. 66.5) — Full-Height Round White Columns + Stepped Cornice!
  addBox(-359.5, -351.3, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 3, 57.6, 66.5, warmFacadeMat);
  addBox(-351.3, -343.0, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H, 57.6, 66.5, warmFacadeMat);
  addBox(-351.3, -343.0, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 3, 57.6, 63.7, warmFacadeMat);
  [-358.8, -353.8, -348.8, -343.8].forEach((cx) => {
    addCyl(cx, 0.0, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 3 + 0.25, 55.8, 0.28, 0.28, whiteTrimMat, 14);
  });

  // Right Front Wing (X = -323.0 .. -306.5, Z = 55.2 .. 66.5) — Mosaic Coral-Red Squares + Windows!
  addBox(-314.7, -306.5, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 3, 55.4, 66.5, warmFacadeMat);
  addBox(-323.0, -314.7, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H, 55.4, 66.5, warmFacadeMat);
  addBox(-323.0, -314.7, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 3, 55.4, 63.7, warmFacadeMat);
  const mosaicSquares: Array<[number, number, number]> = [
    [-319.8, 2.2, 1.3],
    [-316.2, 3.6, 1.1],
    [-312.0, 2.0, 1.4],
    [-308.6, 4.4, 1.2],
    [-320.4, 6.2, 1.15],
    [-315.4, 5.4, 1.35],
    [-311.2, 7.6, 1.25],
    [-308.2, 9.8, 1.4],
    [-317.8, 9.4, 1.15],
    [-313.0, 10.6, 1.1],
    [-321.2, 10.2, 0.95],
  ];
  mosaicSquares.forEach(([mx, my, sz]) => {
    addBox(mx - sz * 0.5, mx + sz * 0.5, my - sz * 0.5, my + sz * 0.5, 55.3, 55.42, coralRedMat);
  });

  // Front Cantilevered Balconies, Warm Wood Soffits, Horizontal Brise-Soleil Louvers & Stepped Wing Roofs!
  [1, 2, 3].forEach((fl) => {
    const flBaseY = SCHOOL_PODIUM_Y + fl * SCHOOL_FLOOR_H;
    // Full front floor slab (with warm wood soffits on undersides)
    addBox(-359.6, -306.4, flBaseY - 0.20, flBaseY, 55.2, 66.5, stuccoWhiteMat);
    addBox(-359.5, -343.0, flBaseY - 0.24, flBaseY - 0.20, 55.3, 57.6, woodSoffitMat);
    if (fl === 1) {
      addBox(-343.0, -323.0, flBaseY - 0.24, flBaseY - 0.20, 56.0, 66.5, woodSoffitMat);
    }
    if (fl < 3) {
      // Coral-red balcony parapets (wings step slightly forward at Z=55.0, central bridge recessed at Z=55.65)
      addBox(-359.7, -342.9, flBaseY, flBaseY + 1.05, 55.0, 55.38, coralRedMat);
      addBox(-342.9, -323.0, flBaseY, flBaseY + 1.05, 55.65, 56.0, coralRedMat);
      addBox(-323.0, -321.8, flBaseY, flBaseY + 1.05, 55.0, 55.65, coralRedMat);
      addBox(-323.0, -321.8, flBaseY, flBaseY + 1.05, 55.65, 57.8, coralRedMat);
      // White handrail trim seated cleanly atop each parapet section
      addBox(-359.7, -342.9, flBaseY + 1.16, flBaseY + 1.22, 55.12, 55.26, whiteTrimMat);
      addBox(-342.9, -323.0, flBaseY + 1.16, flBaseY + 1.22, 55.76, 55.89, whiteTrimMat);
      addBox(-323.0, -321.8, flBaseY + 1.16, flBaseY + 1.22, 55.12, 55.26, whiteTrimMat);
      // Crisp silver brise-soleil louvers across central bridge
      for (let lx = -342.4; lx <= -323.6; lx += 0.55) {
        addBox(lx - 0.03, lx + 0.03, flBaseY + 1.05, flBaseY + SCHOOL_FLOOR_H - 0.22, 55.8, 55.88, louverMat);
      }
      // Front Bridge Classroom / Office Walls (Z = 56.2 .. 63.7, open doorway X = -334.4..-331.6 at Z = 63.7!)
      addBox(-343.0, -323.0, flBaseY, flBaseY + SCHOOL_FLOOR_H - 0.2, 56.2, 56.55, warmFacadeMat); // Front wall behind louvers
      addWindowBay(-338.0, flBaseY + 1.0, 56.38, 6.2, 1.9, 'z');
      addWindowBay(-328.0, flBaseY + 1.0, 56.38, 6.2, 1.9, 'z');
      // Rear wall facing North Bridge Corridor (Z = 63.7) with open doorway!
      addBox(-343.0, -334.4, flBaseY, flBaseY + SCHOOL_FLOOR_H - 0.2, 63.3, 63.7, stuccoWhiteMat);
      addBox(-331.6, -323.0, flBaseY, flBaseY + SCHOOL_FLOOR_H - 0.2, 63.3, 63.7, stuccoWhiteMat);
      addBox(-334.4, -331.6, flBaseY + 2.42, flBaseY + SCHOOL_FLOOR_H - 0.2, 63.3, 63.7, stuccoWhiteMat);
      addWindowBay(-338.8, flBaseY + 1.1, 63.5, 4.2, 1.45, 'z');
      addWindowBay(-327.2, flBaseY + 1.1, 63.5, 4.2, 1.45, 'z');
      // Interior Floor & Ceiling LED for Front Bridge Room
      addBox(-342.8, -323.2, flBaseY + 0.01, flBaseY + 0.04, 56.6, 63.2, classroomFloorMat);
      addBox(-340.0, -326.0, flBaseY + SCHOOL_FLOOR_H - 0.3, flBaseY + SCHOOL_FLOOR_H - 0.22, 58.2, 61.6, ceilingLedMat);
      addRoomDoorwayAndPlaque(
        -333.0,
        flBaseY,
        63.7,
        '+z',
        fl === 1 ? 'VĂN PHÒNG HIỆU TRƯỞNG' : 'PHÒNG TRUYỀN THỐNG',
        '#9f1239'
      );
      if (fl === 1) {
        // Principal's Office (Floor 2 = fl === 1 in loop!) furniture
        addBox(-335.2, -330.8, flBaseY, flBaseY + 0.78, 58.4, 59.5, timberBenchMat);
        addBox(-341.8, -340.6, flBaseY, flBaseY + 2.2, 57.2, 61.5, timberBenchMat); // Bookcase
        addBox(-326.0, -324.2, flBaseY, flBaseY + 0.5, 58.0, 61.5, chairBlueMat); // Reception sofa
      } else {
        // Hall of Fame / Trophy display cases (Floor 3)
        addBox(-335.2, -330.8, flBaseY, flBaseY + 1.15, 58.4, 59.6, glassWindowMat);
        addBox(-334.6, -331.4, flBaseY + 0.9, flBaseY + 1.1, 58.6, 59.4, warmLanternMat); // Trophy glow
      }
    } else {
      // Stepped Roof Cornices (Left & Right wings step slightly higher & deeper overhang with warm wood soffit; zero overlap!)
      addBox(-360.2, -342.9, flBaseY, flBaseY + 1.35, 54.6, 66.8, coralRedMat);
      addBox(-360.0, -343.0, flBaseY - 0.05, flBaseY + 0.005, 54.7, 57.6, woodSoffitMat);
      addBox(-323.1, -305.8, flBaseY, flBaseY + 1.35, 54.6, 66.8, coralRedMat);
      addBox(-323.0, -306.0, flBaseY - 0.05, flBaseY + 0.005, 54.7, 57.6, woodSoffitMat);
      // Recessed Central Roof Fascia & Upper Crown Roof Slab (sits strictly above cornices!)
      addBox(-342.9, -323.1, flBaseY, flBaseY + 0.95, 55.4, 66.8, coralRedMat);
      addBox(-342.9, -323.1, flBaseY + 0.95, flBaseY + 1.25, 55.6, 66.6, deepRedRoofMat);
      addBox(-359.8, -342.9, flBaseY + 1.35, flBaseY + 1.55, 55.0, 66.6, deepRedRoofMat);
      addBox(-323.1, -306.2, flBaseY + 1.35, flBaseY + 1.55, 55.0, 66.6, deepRedRoofMat);
    }
  });

  // Giant Illuminated School Facade Name Sign on Floor 2 Bridge Parapet
  const facadeSignTex = createSchoolSignTexture('TRƯỜNG THPT PHAN CHÂU TRINH');
  const facadeSignMat = new THREE.MeshStandardMaterial({
    map: facadeSignTex,
    emissive: 0xffffff,
    emissiveMap: facadeSignTex,
    emissiveIntensity: 0.28,
    roughness: 0.38,
  });
  neonMats.push(facadeSignMat);
  const facadeSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 1.3), facadeSignMat);
  facadeSignMesh.position.set(-333.0, SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H + 0.56, 55.62);
  facadeSignMesh.rotation.y = Math.PI;
  staticGroup.add(facadeSignMesh);

  // =========================================================================
  // 3. ACTIVE 3-STORY CLASSROOMS, LABS, LIBRARY, AUDITORIUM & STAIRWELL
  // =========================================================================
  const spinningFans: THREE.Group[] = [];
  const createCeilingFan = (x: number, y: number, z: number) => {
    const f = new THREE.Group();
    f.position.set(x, y, z);
    f.userData.noMerge = true;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 6), whiteTrimMat);
    rod.position.y = 0.16;
    f.add(rod);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 10), whiteTrimMat);
    f.add(hub);
    for (let b = 0; b < 3; b++) {
      const ang = (b / 3) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.65), whiteTrimMat);
      blade.position.set(Math.sin(ang) * 0.38, 0, Math.cos(ang) * 0.38);
      blade.rotation.y = ang;
      f.add(blade);
    }
    staticGroup.add(f);
    spinningFans.push(f);
  };

  // Helper to furnish an active Classroom (desks, chairs, teacher lectern, chalkboard, fans, lights!)
  const furnishClassroom = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    floorY: number,
    classLabel: string,
    line1: string,
    line2: string,
    boardOnNorth = true
  ) => {
    addBox(x0 + 0.05, x1 - 0.05, floorY, floorY + 0.03, z0 + 0.05, z1 - 0.05, classroomFloorMat);
    const cx = (x0 + x1) * 0.5;
    const boardZ = boardOnNorth ? z0 + 0.25 : z1 - 0.25;
    const boardTex = createChalkboardTexture(classLabel, line1, line2);
    const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.65 });
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.55), boardMat);
    boardMesh.position.set(cx, floorY + 1.85, boardZ);
    boardMesh.rotation.y = boardOnNorth ? 0 : Math.PI;
    staticGroup.add(boardMesh);

    // Teacher podium & lectern near board
    const podZ = boardOnNorth ? z0 + 1.45 : z1 - 1.45;
    addBox(cx - 1.5, cx + 1.5, floorY, floorY + 0.16, podZ - 0.55, podZ + 0.55, woodDeskMat);
    addBox(cx - 0.75, cx + 0.75, floorY + 0.16, floorY + 0.92, podZ - 0.28, podZ + 0.28, timberBenchMat);

    // 2 columns x 3 rows of Student Desks & Blue Chairs (leaving clear walking aisle!)
    const rowZs = boardOnNorth ? [z0 + 4.8, z0 + 7.4, z0 + 10.0, z0 + 12.6] : [z1 - 4.8, z1 - 7.4, z1 - 10.0, z1 - 12.6];
    const colXs = [x0 + 1.5, x1 - 1.5];
    rowZs.slice(0, 3).forEach((rz) => {
      colXs.forEach((rx) => {
        // Desk top & legs
        addBox(rx - 0.85, rx + 0.85, floorY + 0.68, floorY + 0.74, rz - 0.26, rz + 0.26, woodDeskMat);
        addBox(rx - 0.78, rx - 0.70, floorY, floorY + 0.68, rz - 0.2, rz + 0.2, ironFenceMat);
        addBox(rx + 0.70, rx + 0.78, floorY, floorY + 0.68, rz - 0.2, rz + 0.2, ironFenceMat);
        // 2 student chairs behind desk
        const chairZ = boardOnNorth ? rz + 0.52 : rz - 0.52;
        [-0.42, 0.42].forEach((co) => {
          addBox(rx + co - 0.22, rx + co + 0.22, floorY + 0.40, floorY + 0.45, chairZ - 0.18, chairZ + 0.18, chairBlueMat);
          addBox(
            rx + co - 0.20,
            rx + co + 0.20,
            floorY + 0.45,
            floorY + 0.82,
            boardOnNorth ? chairZ + 0.12 : chairZ - 0.18,
            boardOnNorth ? chairZ + 0.18 : chairZ - 0.12,
            chairBlueMat
          );
        });
      });
    });

    // Ceiling LED strips & 2 Rotating Ceiling Fans
    addBox(x0 + 1.8, x1 - 1.8, floorY + SCHOOL_FLOOR_H - 0.3, floorY + SCHOOL_FLOOR_H - 0.22, z0 + 2.8, z1 - 2.8, ceilingLedMat);
    createCeilingFan(cx, floorY + SCHOOL_FLOOR_H - 0.55, z0 + 5.2);
    createCeilingFan(cx, floorY + SCHOOL_FLOOR_H - 0.55, z1 - 4.8);
  };

  // Build All 3 Floors of U-Wings with Hollow Enterable Rooms!
  [0, 1, 2].forEach((flIdx) => {
    const flNum = flIdx + 1;
    const y0 = SCHOOL_PODIUM_Y + flIdx * SCHOOL_FLOOR_H;
    const yTop = y0 + SCHOOL_FLOOR_H;

    // Upper Floor Slabs (zero overlap between slabs, clear of Stairwell shaft X=-359.5..-354.0, Z=104.5..114.6!)
    if (flIdx > 0) {
      addBox(-359.5, -348.38, y0 - 0.22, y0, 66.5, 103.0, stuccoWhiteMat);
      addBox(-354.0, -348.38, y0 - 0.22, y0, 103.0, 115.6, stuccoWhiteMat);
      addBox(-359.5, -354.0, y0 - 0.22, y0, 103.0, 104.5, stuccoWhiteMat);
      addBox(-359.5, -354.0, y0 - 0.22, y0, 114.6, 115.6, stuccoWhiteMat);
      addBox(-317.62, -306.5, y0 - 0.22, y0, 66.5, 115.6, stuccoWhiteMat);
      addBox(-348.38, -317.62, y0 - 0.22, y0, 103.0, 115.6, stuccoWhiteMat);

      // Courtyard Coral-Red Parapets strictly recessed BETWEEN the projecting white columns (NO Z-fighting!)
      addBox(-348.72, -348.40, y0, y0 + 0.96, 66.70, 103.00, coralRedMat);
      addBox(-348.62, -348.50, y0 + 1.15, y0 + 1.22, 66.70, 103.00, whiteTrimMat);
      addBox(-317.60, -317.28, y0, y0 + 0.96, 66.70, 103.00, coralRedMat);
      addBox(-317.50, -317.38, y0 + 1.15, y0 + 1.22, 66.70, 103.00, whiteTrimMat);
      addBox(-348.32, -317.68, y0, y0 + 0.96, 66.34, 66.66, coralRedMat);
      addBox(-348.32, -317.68, y0 + 1.15, y0 + 1.22, 66.44, 66.56, whiteTrimMat);
      addBox(-348.32, -317.68, y0, y0 + 0.96, 103.04, 103.36, coralRedMat);
      addBox(-348.32, -317.68, y0 + 1.15, y0 + 1.22, 103.14, 103.26, whiteTrimMat);
    }

    // Courtyard Corridor Columns standing cleanly proud (0.08m) of both parapet and floor slab edge (ZERO Z-fighting!)
    [67.0, 73.0, 79.0, 85.0, 91.0, 97.0, 103.0].forEach((cz) => {
      const zMin = cz === 67.0 ? 66.32 : cz === 103.0 ? 102.98 : cz - 0.18;
      const zMax = cz === 67.0 ? 66.72 : cz === 103.0 ? 103.38 : cz + 0.18;
      addBox(-348.80, -348.32, y0 + 0.005, yTop - 0.225, zMin, zMax, whiteTrimMat);
      addBox(-317.68, -317.20, y0 + 0.005, yTop - 0.225, zMin, zMax, whiteTrimMat);
    });
    // Cross-corridor North & South support columns standing proud of cross parapets
    [-342.4, -336.4, -329.6, -323.6].forEach((cx) => {
      if (flIdx > 0) {
        addBox(cx - 0.18, cx + 0.18, y0 + 0.005, yTop - 0.225, 66.26, 66.74, whiteTrimMat);
      }
      addBox(cx - 0.18, cx + 0.18, y0 + 0.005, yTop - 0.225, 102.96, 103.44, whiteTrimMat);
    });

    // --- WEST WING WALLS (Hollow + Enterable on ALL 3 FLOORS! Z = 66.5 .. 102.6) ---
    // On Floor 1, walls stop at Z = 101.6 so Z = 101.7..104.4 forms an open covered breezeway to Cổng Sân Bóng Rổ!
    const westZEnd = flNum === 1 ? 101.6 : 102.6;
    // West Outer Wall with Window Bays
    addBox(-359.5, -358.9, y0, y0 + 1.05, 66.5, westZEnd, warmFacadeMat);
    addBox(-359.5, -358.9, y0 + 2.65, yTop - 0.22, 66.5, westZEnd, warmFacadeMat);
    [66.5, 72.5, 78.5, 84.5, 90.5, 96.5, flNum === 1 ? 101.15 : 101.8].forEach((pz) => {
      addBox(-359.5, -358.9, y0 + 1.05, y0 + 2.65, pz - 0.45, pz + 0.45, warmFacadeMat);
    });
    for (let wz = 69.5; wz <= 99.5; wz += 6.0) {
      addWindowBay(-359.2, y0 + 1.05, wz, wz > 96 && flNum === 1 ? 3.2 : 4.2, 1.6, 'x');
    }
    // Corridor Inner Wall (Doorways at Z = 74.2..76.4 & Z = 92.8..95.0)
    addBox(-351.8, -351.3, y0, yTop - 0.22, 66.5, 74.2, stuccoWhiteMat);
    addBox(-351.8, -351.3, y0, yTop - 0.22, 76.4, 92.8, stuccoWhiteMat);
    addBox(-351.8, -351.3, y0, yTop - 0.22, 95.0, westZEnd, stuccoWhiteMat);
    addBox(-351.8, -351.3, y0 + 2.42, yTop - 0.22, 74.2, 76.4, stuccoWhiteMat);
    addBox(-351.8, -351.3, y0 + 2.42, yTop - 0.22, 92.8, 95.0, stuccoWhiteMat);
    // Interior window cutouts along West corridor
    [69.5, 80.5, 88.5, 98.5].forEach((wz) => {
      addWindowBay(-351.55, y0 + 1.05, wz, 3.2, 1.5, 'x');
    });
    // Room end & divider walls (trimmed cleanly inside inner walls so no corner overlap!)
    addBox(-358.9, -351.8, y0, yTop - 0.22, 66.5, 67.0, stuccoWhiteMat);
    addBox(-358.9, -351.8, y0, yTop - 0.22, 84.7, 85.2, stuccoWhiteMat);
    addBox(-358.9, -351.8, y0, yTop - 0.22, flNum === 1 ? 101.1 : 102.2, westZEnd, stuccoWhiteMat);

    // West Wing Room Furnishings & Plaques per Floor
    if (flNum === 1) {
      addRoomDoorwayAndPlaque(-351.3, y0, 75.3, '+x', 'LỚP 10A1');
      furnishClassroom(-358.9, -351.8, 67.0, 84.7, y0, 'LỚP 10A1', 'Đại Số 10: Hàm số bậc hai & Bất đẳng thức', 'Giải phương trình: f(x) = ax² + bx + c = 0');
      addRoomDoorwayAndPlaque(-351.3, y0, 93.9, '+x', 'PHÒNG Y TẾ & ĐOÀN', '#0f766e');
      // Medical & Youth Union interior
      addBox(-358.8, -351.9, y0, y0 + 0.03, 85.2, 101.1, classroomFloorMat);
      addBox(-358.4, -356.5, y0, y0 + 0.65, 87.0, 89.4, whiteTrimMat); // Medical bed
      addBox(-358.2, -357.5, y0 + 0.65, y0 + 0.82, 87.1, 87.7, coralRedMat); // Pillow
      addBox(-358.8, -358.4, y0 + 1.2, y0 + 2.3, 90.0, 91.6, whiteTrimMat); // First-aid cabinet
      addBox(-358.45, -358.38, y0 + 1.55, y0 + 1.95, 90.65, 90.95, coralRedMat);
      addBox(-355.0, -352.6, y0, y0 + 0.76, 97.6, 99.4, woodDeskMat); // Advisor desk
      addBox(-357.0, -353.5, y0 + SCHOOL_FLOOR_H - 0.3, y0 + SCHOOL_FLOOR_H - 0.22, 88.0, 99.0, ceilingLedMat);
    } else if (flNum === 2) {
      addRoomDoorwayAndPlaque(-351.3, y0, 75.3, '+x', 'LỚP 11A1');
      furnishClassroom(-358.9, -351.8, 67.0, 84.7, y0, 'LỚP 11A1', 'Hóa Học 11: Cân bằng hóa học & Nitơ', 'N₂ + 3H₂ ⇌ 2NH₃  (ΔH < 0)');
      addRoomDoorwayAndPlaque(-351.3, y0, 93.9, '+x', 'LỚP 11A2');
      furnishClassroom(-358.9, -351.8, 85.2, 102.2, y0, 'LỚP 11A2', 'Ngữ Văn 11: Thơ ca Việt Nam hiện đại', 'Phân tích giá trị nhân đạo trong tác phẩm');
    } else {
      addRoomDoorwayAndPlaque(-351.3, y0, 75.3, '+x', 'LỚP 12A1');
      furnishClassroom(-358.9, -351.8, 67.0, 84.7, y0, 'LỚP 12A1', 'Giải Tích 12: Tích phân & Số phức', '∫ f(x)dx = F(b) - F(a)  |  Ôn thi THPT');
      addRoomDoorwayAndPlaque(-351.3, y0, 93.9, '+x', 'LỚP 12A2');
      furnishClassroom(-358.9, -351.8, 85.2, 102.2, y0, 'LỚP 12A2', 'Vật Lý 12: Dao động điều hòa & Sóng', 'x = A cos(ωt + φ)  •  E = ½kA²');
    }

    // --- EAST WING WALLS (Hollow + Enterable on ALL 3 FLOORS! X = -314.7..-306.5, Z = 66.5..102.6) ---
    addBox(-307.1, -306.5, y0, y0 + 1.05, 66.5, 102.6, warmFacadeMat);
    addBox(-307.1, -306.5, y0 + 2.65, yTop - 0.22, 66.5, 102.6, warmFacadeMat);
    [66.5, 72.5, 78.5, 84.5, 90.5, 96.5, 101.8].forEach((pz) => {
      addBox(-307.1, -306.5, y0 + 1.05, y0 + 2.65, pz - 0.45, pz + 0.45, warmFacadeMat);
    });
    for (let wz = 69.5; wz <= 99.5; wz += 6.0) {
      addWindowBay(-306.8, y0 + 1.05, wz, 4.2, 1.6, 'x');
    }
    addBox(-314.7, -314.2, y0, yTop - 0.22, 66.5, 74.2, stuccoWhiteMat);
    addBox(-314.7, -314.2, y0, yTop - 0.22, 76.4, 92.8, stuccoWhiteMat);
    addBox(-314.7, -314.2, y0, yTop - 0.22, 95.0, 102.6, stuccoWhiteMat);
    addBox(-314.7, -314.2, y0 + 2.42, yTop - 0.22, 74.2, 76.4, stuccoWhiteMat);
    addBox(-314.7, -314.2, y0 + 2.42, yTop - 0.22, 92.8, 95.0, stuccoWhiteMat);
    [69.5, 80.5, 88.5, 98.5].forEach((wz) => {
      addWindowBay(-314.45, y0 + 1.05, wz, 3.2, 1.5, 'x');
    });
    addBox(-314.2, -307.1, y0, yTop - 0.22, 66.5, 67.0, stuccoWhiteMat);
    addBox(-314.2, -307.1, y0, yTop - 0.22, 84.7, 85.2, stuccoWhiteMat);
    addBox(-314.2, -307.1, y0, yTop - 0.22, 102.2, 102.6, stuccoWhiteMat);

    // East Wing Room Furnishings & Plaques per Floor
    if (flNum === 1) {
      addRoomDoorwayAndPlaque(-314.7, y0, 75.3, '-x', 'LỚP 10A2');
      furnishClassroom(-314.2, -307.1, 67.0, 84.7, y0, 'LỚP 10A2', 'Hình Học 10: Vectơ & Tọa độ phẳng', 'u · v = |u|·|v|·cos(α)');
      addRoomDoorwayAndPlaque(-314.7, y0, 93.9, '-x', 'PHÒNG TIN HỌC', '#0284c7');
      furnishClassroom(-314.2, -307.1, 85.2, 102.2, y0, 'TIN HỌC', 'Lập trình Python & C++ Cơ bản', 'for i in range(n): print("Hello PCT!")');
      // Glowing computer monitors on every desk in Computer Lab!
      [89.2, 91.6, 98.0].forEach((rz) => {
        [-312.5, -308.9].forEach((rx) => {
          [-0.4, 0.4].forEach((off) => {
            addBox(rx + off - 0.22, rx + off + 0.22, y0 + 0.75, y0 + 1.12, rz - 0.1, rz - 0.04, monitorGlowMat);
          });
        });
      });
    } else if (flNum === 2) {
      addRoomDoorwayAndPlaque(-314.7, y0, 75.3, '-x', 'LỚP 11A3');
      furnishClassroom(-314.2, -307.1, 67.0, 84.7, y0, 'LỚP 11A3', 'Sinh Học 11: Quang hợp & Trao đổi chất', '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂');
      addRoomDoorwayAndPlaque(-314.7, y0, 93.9, '-x', 'PHÒNG THÍ NGHIỆM', '#059669');
      furnishClassroom(-314.2, -307.1, 85.2, 102.2, y0, 'THÍ NGHIỆM', 'Thực hành Hóa - Lý: Phản ứng oxi hóa', 'Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O');
      // Colorful glowing flasks/beakers on Lab benches
      [89.2, 91.6, 98.0].forEach((rz, ri) => {
        [-312.5, -308.9].forEach((rx) => {
          addCyl(rx - 0.25, y0 + 0.74, y0 + 1.0, rz, 0.08, 0.11, ri % 2 === 0 ? cyanSkylightMat : warmLanternMat, 8);
          addCyl(rx + 0.25, y0 + 0.74, y0 + 1.06, rz, 0.07, 0.1, coralRedMat, 8);
        });
      });
    } else {
      addRoomDoorwayAndPlaque(-314.7, y0, 75.3, '-x', 'LỚP 12A3');
      furnishClassroom(-314.2, -307.1, 67.0, 84.7, y0, 'LỚP 12A3', 'Tiếng Anh 12: IELTS & Academic Reading', 'Unit 8: Lifelong Learning & Future Careers');
      addRoomDoorwayAndPlaque(-314.7, y0, 93.9, '-x', 'PHÒNG NGHE NHÌN', '#7c3aed');
      furnishClassroom(-314.2, -307.1, 85.2, 102.2, y0, 'NGHE NHÌN', 'Luyện Nghe - Nói Đa Phương Tiện', 'Audio Channel Active • Smart Projector ON');
    }

    // --- REAR CROSS-WING ROOMS (Z = 106.0 .. 115.6) ---
    if (flNum === 1) {
      // Floor 1 Rear: Teachers' Lounge (X = -353.5..-323.0) + Open Rear Passage (-323..-317.8) + Music Room (-317.8..-306.5)
      addBox(-353.8, -339.2, y0, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-336.8, -323.0, y0, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-339.2, -336.8, y0 + 2.42, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-353.8, -353.2, y0, yTop - 0.2, 106.0, 115.6, stuccoWhiteMat);
      addBox(-323.4, -322.8, y0, yTop - 0.2, 106.0, 115.6, stuccoWhiteMat);
      addBox(-353.8, -323.0, y0, yTop - 0.2, 115.1, 115.6, stuccoWhiteMat);
      addBox(-353.2, -323.4, y0, y0 + 0.04, 106.45, 115.1, classroomFloorMat);
      addRoomDoorwayAndPlaque(-338.0, y0, 106.0, '-z', 'PHÒNG GIÁO VIÊN', '#b45309');
      // Long Conference Table + Chairs + Lockers + LEDs in Teachers' Lounge
      addBox(-344.2, -333.8, y0, y0 + 0.76, 110.0, 111.5, timberBenchMat);
      for (let cx = -343.5; cx <= -334.5; cx += 1.8) {
        addBox(cx - 0.25, cx + 0.25, y0, y0 + 0.45, 109.2, 109.7, chairBlueMat);
        addBox(cx - 0.25, cx + 0.25, y0, y0 + 0.45, 111.8, 112.3, chairBlueMat);
      }
      addBox(-352.6, -346.5, y0, y0 + 2.1, 114.0, 114.9, woodDeskMat); // Teacher lockers
      addBox(-347.0, -328.0, y0 + SCHOOL_FLOOR_H - 0.3, y0 + SCHOOL_FLOOR_H - 0.22, 108.5, 113.0, ceilingLedMat);

      // Music Room (-317.8..-306.5)
      addBox(-317.9, -313.6, y0, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-311.4, -306.5, y0, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-313.6, -311.4, y0 + 2.42, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-317.9, -317.4, y0, yTop - 0.2, 106.0, 115.6, stuccoWhiteMat);
      addBox(-307.1, -306.5, y0, yTop - 0.2, 106.0, 115.6, stuccoWhiteMat);
      addBox(-317.8, -306.5, y0, yTop - 0.2, 115.1, 115.6, stuccoWhiteMat);
      addBox(-317.4, -307.1, y0, y0 + 0.04, 106.45, 115.1, classroomFloorMat);
      addRoomDoorwayAndPlaque(-312.5, y0, 106.0, '-z', 'PHÒNG ÂM NHẠC', '#be185d');
      // Upright Piano & Stage Keyboard inside Music Room
      addBox(-310.2, -308.0, y0, y0 + 1.25, 112.8, 113.8, ironFenceMat);
      addBox(-310.0, -308.2, y0 + 0.72, y0 + 0.80, 112.4, 112.8, whiteTrimMat); // Piano keys
      addBox(-315.5, -309.0, y0 + SCHOOL_FLOOR_H - 0.3, y0 + SCHOOL_FLOOR_H - 0.22, 108.5, 113.0, ceilingLedMat);
    } else {
      // Floor 2 = School Library; Floor 3 = School Auditorium (open wide double doorway at X = -335..-331)
      addBox(-353.8, -335.0, y0, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-331.0, -306.5, y0, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-335.0, -331.0, y0 + 2.55, yTop - 0.2, 106.0, 106.45, stuccoWhiteMat);
      addBox(-353.8, -353.2, y0, yTop - 0.2, 106.0, 115.6, stuccoWhiteMat);
      addBox(-307.1, -306.5, y0, yTop - 0.2, 106.0, 115.6, stuccoWhiteMat);
      addBox(-353.8, -306.5, y0, yTop - 0.2, 115.0, 115.6, stuccoWhiteMat);
      addBox(-353.2, -307.1, y0, y0 + 0.04, 106.45, 115.0, classroomFloorMat);
      addBox(-348.0, -312.0, y0 + SCHOOL_FLOOR_H - 0.3, y0 + SCHOOL_FLOOR_H - 0.22, 108.5, 113.0, ceilingLedMat);
      [106.2].forEach((cz) => {
        [-345.0, -339.5, -325.0, -317.5].forEach((wx) => addWindowBay(wx, y0 + 1.05, cz, 3.4, 1.55, 'z'));
      });

      if (flNum === 2) {
        addRoomDoorwayAndPlaque(-333.0, y0, 106.0, '-z', 'THƯ VIỆN TRƯỜNG', '#0f766e');
        // Library Bookshelves & Reading Tables
        [-348.2, -343.2, -322.8, -317.8].forEach((sx) => {
          addBox(sx - 0.45, sx + 0.45, y0, y0 + 2.15, 109.2, 113.2, timberBenchMat);
          [0.5, 1.05, 1.6].forEach((sy, bi) => {
            addBox(
              sx - 0.48,
              sx + 0.48,
              y0 + sy,
              y0 + sy + 0.26,
              109.4,
              113.0,
              bi === 0 ? coralRedMat : bi === 1 ? chairBlueMat : woodDeskMat
            );
          });
        });
        addBox(-336.8, -329.2, y0, y0 + 0.76, 110.2, 111.7, woodDeskMat); // Central reading table
        addBox(-333.3, -332.7, y0 + 0.76, y0 + 1.15, 110.7, 111.2, courtGreenMat); // Reading lamp
      } else {
        addRoomDoorwayAndPlaque(-333.0, y0, 106.0, '-z', 'HỘI TRƯỜNG LỚN', '#991b1b');
        // Auditorium Stage & Red Velvet Backdrop + Auditorium Chairs
        addBox(-352.6, -346.5, y0, y0 + 0.45, 107.0, 114.2, timberBenchMat);
        addBox(-352.9, -352.4, y0 + 0.45, y0 + 3.2, 107.4, 113.8, coralRedMat);
        for (let ax = -343.5; ax <= -312.5; ax += 2.6) {
          [108.5, 110.6, 112.7].forEach((az) => {
            addBox(ax - 0.35, ax + 0.35, y0, y0 + 0.44, az - 0.3, az + 0.3, coralRedMat);
            addBox(ax + 0.28, ax + 0.36, y0 + 0.44, y0 + 0.88, az - 0.28, az + 0.28, coralRedMat);
          });
        }
      }
    }
  });

  // Floor 3 Ceiling White Fascia + Top Coral-Red Roof Slabs over Courtyard U-Wings (zero overlap with front roof & stair shaft!)
  const topY = SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 3;
  addBox(-359.5, -348.38, topY - 0.22, topY, 66.8, 103.0, stuccoWhiteMat);
  addBox(-354.0, -348.38, topY - 0.22, topY, 103.0, 115.6, stuccoWhiteMat);
  addBox(-359.5, -354.0, topY - 0.22, topY, 103.0, 104.5, stuccoWhiteMat);
  addBox(-359.5, -354.0, topY - 0.22, topY, 114.6, 115.6, stuccoWhiteMat);
  addBox(-317.62, -306.5, topY - 0.22, topY, 66.8, 115.6, stuccoWhiteMat);
  addBox(-348.38, -317.62, topY - 0.22, topY, 103.0, 115.6, stuccoWhiteMat);
  // Roof fascia crown strictly above topY
  addBox(-359.9, -348.2, topY, topY + 0.9, 66.8, 115.8, deepRedRoofMat);
  addBox(-317.8, -306.1, topY, topY + 0.9, 66.8, 115.8, deepRedRoofMat);
  addBox(-348.2, -317.8, topY, topY + 0.9, 102.85, 115.8, deepRedRoofMat);

  // Exterior/Rear-West Switchback Stairwell (X = -359.0 .. -354.0, Z = 104.2 .. 114.6) connecting Floors 1 -> 2 -> 3
  [0, 1].forEach((flIdx) => {
    const baseY = SCHOOL_PODIUM_Y + flIdx * SCHOOL_FLOOR_H;
    const midY = baseY + SCHOOL_FLOOR_H * 0.5;
    for (let s = 0; s < 10; s++) {
      const t = (s + 0.5) / 10;
      const sz = 104.8 + t * 7.2;
      const sy = baseY + t * (SCHOOL_FLOOR_H * 0.5);
      addBox(-358.9, -356.7, sy - 0.2, sy, sz - 0.38, sz + 0.38, graniteStepMat);
    }
    addBox(-359.1, -354.0, midY - 0.22, midY, 112.0, 114.6, stuccoWhiteMat);
    for (let s = 0; s < 10; s++) {
      const t = (s + 0.5) / 10;
      const sz = 112.0 - t * 7.2;
      const sy = midY + t * (SCHOOL_FLOOR_H * 0.5);
      addBox(-356.3, -354.1, sy - 0.2, sy, sz - 0.38, sz + 0.38, graniteStepMat);
    }
    const railW = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 7.6), coralRedMat);
    railW.position.set(-359.05, baseY + SCHOOL_FLOOR_H * 0.25 + 0.45, 108.4);
    railW.rotation.x = -Math.atan2(SCHOOL_FLOOR_H * 0.5, 7.2);
    staticGroup.add(railW);
  });

  // =========================================================================
  // 4. COURTYARD FLAGPOLE PODIUM, TREES, BENCHES & NOTICE BOARD
  // =========================================================================
  addCyl(-333.0, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + 0.16, 73.5, 2.8, 2.8, graniteStepMat, 28);
  addCyl(-333.0, SCHOOL_PODIUM_Y + 0.16, SCHOOL_PODIUM_Y + 0.32, 73.5, 2.2, 2.2, graniteStepMat, 28);
  addCyl(-333.0, SCHOOL_PODIUM_Y + 0.32, SCHOOL_PODIUM_Y + 0.48, 73.5, 1.55, 1.55, graniteStepMat, 28);
  addCyl(-333.0, SCHOOL_PODIUM_Y + 0.48, SCHOOL_PODIUM_Y + 14.5, 73.5, 0.08, 0.13, ironFenceMat, 12);

  const flagTex = createVnFlagTexture();
  const flagMat = new THREE.MeshStandardMaterial({
    map: flagTex,
    side: THREE.DoubleSide,
    roughness: 0.55,
  });
  const flagGeo = new THREE.PlaneGeometry(2.55, 1.7, 10, 4);
  flagGeo.translate(1.275, 0, 0);
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.set(-333.0, SCHOOL_PODIUM_Y + 13.5, 73.5);
  flagMesh.userData.noMerge = true;
  staticGroup.add(flagMesh);

  [
    { x: -344.5, z: 79.2 },
    { x: -321.5, z: 79.2 },
    { x: -344.5, z: 94.8 },
    { x: -321.5, z: 94.8 },
  ].forEach((p) => {
    addBox(p.x - 1.9, p.x + 1.9, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + 0.52, p.z - 1.8, p.z + 1.8, timberBenchMat);
    addBox(p.x - 1.6, p.x + 1.6, SCHOOL_PODIUM_Y + 0.48, SCHOOL_PODIUM_Y + 0.55, p.z - 1.5, p.z + 1.5, grassLawnMat);
    addShadeTree(p.x, p.z, SCHOOL_PODIUM_Y + 0.5, 1.25);
  });

  // Stone Benches (Bàn Ghế Đá) around Courtyard
  [-340.5, -325.5].forEach((bx) => {
    addBox(bx - 1.2, bx + 1.2, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + 0.46, 61.5, 62.3, graniteStepMat);
    addBox(bx - 1.2, bx + 1.2, SCHOOL_PODIUM_Y, SCHOOL_PODIUM_Y + 0.46, 86.2, 87.0, graniteStepMat);
  });

  // =========================================================================
  // 5. REAR CAMPUS: ENTERABLE CANTEEN, PAVILION & BASKETBALL SPORTS HALL
  // =========================================================================
  addBox(PHAN_CHAU_TRINH_MIN_X, PHAN_CHAU_TRINH_MAX_X, -0.28, 0.0, 116.0, 148.0, plazaTileMat);
  for (let s = 0; s < 4; s++) {
    const y1 = SCHOOL_PODIUM_Y * (1 - (s + 1) / 4);
    addBox(-323.0, -317.8, -0.1, Math.max(0.05, y1 + 0.05), 115.6 + s * 0.45, 116.05 + s * 0.45, graniteStepMat);
  }

  // Rear 2-Story Academic & Active Ground-Floor Canteen Block (X = -359.5..-338.0, Z = 119.5..129.0)
  addBox(-359.5, -338.0, 0.0, 0.06, 119.5, 129.0, classroomFloorMat);
  addBox(-359.5, -338.0, 3.8, 7.8, 119.5, 129.0, warmFacadeMat); // 2nd story body
  addBox(-359.8, -337.7, 7.75, 8.65, 119.2, 129.3, deepRedRoofMat);
  // Hollow Canteen Ground Floor Walls (Open Doorway at South Z = 128.6..129.1, X = -350.8..-346.6!)
  addBox(-359.5, -338.0, 0.0, 3.8, 119.5, 120.05, warmFacadeMat);
  addBox(-359.5, -358.9, 0.0, 3.8, 119.5, 129.0, warmFacadeMat);
  addBox(-338.6, -338.0, 0.0, 3.8, 119.5, 129.0, warmFacadeMat);
  addBox(-359.5, -350.8, 0.0, 3.8, 128.55, 129.05, warmFacadeMat);
  addBox(-346.6, -338.0, 0.0, 3.8, 128.55, 129.05, warmFacadeMat);
  addBox(-350.8, -346.6, 2.45, 3.8, 128.55, 129.05, warmFacadeMat);
  for (let wx = -356.5; wx <= -340.5; wx += 4.2) {
    addWindowBay(wx, 4.7, 128.95, 2.6, 1.9, 'z');
  }
  addWindowBay(-355.0, 1.15, 128.8, 4.0, 1.6, 'z');
  addWindowBay(-342.4, 1.15, 128.8, 4.0, 1.6, 'z');
  addRoomDoorwayAndPlaque(-348.7, 0.0, 129.0, '+z', 'CĂNG TIN HỌC SINH', '#065f46');
  // Canteen Counter, Menu Board & LED Light
  addBox(-358.2, -352.0, 0.0, 0.96, 120.8, 122.4, woodDeskMat);
  const menuTex = createCanteenMenuTexture();
  const menuMat = new THREE.MeshStandardMaterial({ map: menuTex, emissive: 0xffffff, emissiveMap: menuTex, emissiveIntensity: 0.25 });
  const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.4), menuMat);
  menuBoard.position.set(-355.0, 2.35, 120.12);
  staticGroup.add(menuBoard);
  addBox(-356.0, -341.0, 3.55, 3.63, 122.0, 126.5, ceilingLedMat);

  addBox(-359.2, -338.2, 0.0, 0.12, 129.2, 134.5, grassLawnMat);
  [-356.5, -351.0, -345.5, -340.2].forEach((tx) => {
    addShadeTree(tx, 131.8, 0.1, 1.05);
  });

  // White Gabled Multi-Purpose Pavilion (Nhà Đa Năng / Căng Tin Ngoài Trời)
  [-333.8, -317.2].forEach((px) => {
    [122.4, 126.75, 131.1].forEach((pz) => {
      addCyl(px, 0.0, 4.1, pz, 0.18, 0.18, whiteTrimMat, 12);
    });
  });
  const gableLeft = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.18, 10.6), whiteTrimMat);
  gableLeft.position.set(-329.8, 4.85, 126.75);
  gableLeft.rotation.z = 0.24;
  staticGroup.add(gableLeft);
  const gableRight = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.18, 10.6), whiteTrimMat);
  gableRight.position.set(-321.2, 4.85, 126.75);
  gableRight.rotation.z = -0.24;
  staticGroup.add(gableRight);
  [-329.0, -322.0].forEach((cx) => {
    addBox(cx - 1.2, cx + 1.2, 0.0, 0.74, 125.8, 127.6, woodDeskMat);
  });

  // Rear Covered Cyan-Skylight Sports Hall + Basketball Hoops!
  addBox(-356.5, -336.0, 0.0, 5.2, 136.0, 136.5, warmFacadeMat);
  addBox(-330.0, -312.0, 0.0, 5.2, 136.0, 136.5, warmFacadeMat);
  addBox(-356.5, -355.9, 0.0, 5.2, 136.0, 146.5, warmFacadeMat);
  addBox(-312.6, -312.0, 0.0, 5.2, 136.0, 146.5, warmFacadeMat);
  addBox(-356.5, -312.0, 0.0, 5.2, 145.9, 146.5, warmFacadeMat);
  addBox(-355.8, -312.7, 0.01, 0.06, 136.6, 145.8, courtGreenMat);
  addBox(-352.0, -316.5, 0.05, 0.09, 138.0, 144.4, courtBlueMat);
  addBox(-352.0, -316.5, 0.08, 0.11, 141.12, 141.28, whiteTrimMat);
  // Dual Basketball Backboards & Hoops (West X = -352.4, East X = -316.1)
  [-352.4, -316.1].forEach((hx, hi) => {
    const dir = hi === 0 ? 1 : -1;
    addCyl(hx - dir * 0.4, 0.0, 3.25, 141.2, 0.09, 0.11, ironFenceMat, 8);
    addBox(hx - 0.06, hx + 0.06, 2.75, 3.85, 140.3, 142.1, whiteTrimMat);
    addBox(hx + dir * 0.06, hx + dir * 0.56, 2.95, 3.04, 140.95, 141.45, coralRedMat); // Rim
  });
  const skylightRoof = new THREE.Mesh(new THREE.BoxGeometry(44.2, 0.14, 10.6), cyanSkylightMat);
  skylightRoof.position.set(-334.25, 5.65, 141.25);
  staticGroup.add(skylightRoof);
  for (let rx = -355.0; rx <= -313.5; rx += 3.8) {
    addBox(rx - 0.12, rx + 0.12, 5.2, 5.82, 136.0, 146.5, whiteTrimMat);
  }
  addBox(-311.8, -305.5, 0.0, 0.12, 117.0, 146.5, grassLawnMat);
  addShadeTree(-308.6, 124.0, 0.1, 1.0);
  addShadeTree(-308.6, 134.0, 0.1, 1.05);

  // Warm Lamps & Point Lights
  const addSchoolLamp = (lx: number, lz: number, baseY: number) => {
    addCyl(lx, baseY, baseY + 3.6, lz, 0.06, 0.09, ironFenceMat, 8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), warmLanternMat);
    bulb.position.set(lx, baseY + 3.72, lz);
    staticGroup.add(bulb);
  };
  addSchoolLamp(-339.2, 47.0, 0.0);
  addSchoolLamp(-326.8, 47.0, 0.0);
  addSchoolLamp(-346.0, 71.0, SCHOOL_PODIUM_Y);
  addSchoolLamp(-320.0, 71.0, SCHOOL_PODIUM_Y);
  addSchoolLamp(-346.0, 100.5, SCHOOL_PODIUM_Y);
  addSchoolLamp(-320.0, 100.5, SCHOOL_PODIUM_Y);

  const gateLight = new THREE.PointLight(0xfef3c7, 0.0, 26, 1.6);
  gateLight.position.set(-333.0, 4.2, 47.5);
  staticGroup.add(gateLight);
  scaledLights.push({ light: gateLight, dayInt: 0, nightInt: 1.55, getScale: () => 1 });

  const courtyardLight = new THREE.PointLight(0xfef3c7, 0.0, 38, 1.5);
  courtyardLight.position.set(-333.0, 6.2, 82.0);
  staticGroup.add(courtyardLight);
  scaledLights.push({ light: courtyardLight, dayInt: 0, nightInt: 1.75, getScale: () => 1 });

  // =========================================================================
  // 6. SCHEDULE-DRIVEN NPC CROWD: ENTRY AT 7H, ACTIVE CLASSES, DISMISSAL AT 5H
  // =========================================================================
  interface AnimatedSchoolNpc {
    grp: THREE.Group;
    proxyGrp: THREE.Group;
    glbHandle: GlbHumanHandle;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    role: 'guard' | 'teacher' | 'seated_student' | 'roam' | 'arrive_7h' | 'dismiss_5h';
    baseX: number;
    baseY: number;
    baseZ: number;
    baseYaw: number;
    patrolAxis?: 'x' | 'z';
    patrolRange?: number;
    phase: number;
    speed: number;
  }
  const schoolNpcs: AnimatedSchoolNpc[] = [];
  const npcRootGroup = new THREE.Group();
  npcRootGroup.userData.noMerge = true;
  staticGroup.add(npcRootGroup);

  // Shared Geometries & Materials for high FPS even with ~65 NPCs!
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.56, 0.24);
  const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const hairGeo = new THREE.BoxGeometry(0.3, 0.12, 0.3);
  const legGeo = new THREE.BoxGeometry(0.16, 0.72, 0.18);
  const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.14);
  const packGeo = new THREE.BoxGeometry(0.32, 0.38, 0.15);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.75 });
  const shirtWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });
  const pantsNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 });
  const guardBlueMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
  const teacherMats = [
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.72 }), // Teal shirt/ao dai
    new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.72 }), // Crimson ao dai
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.72 }), // Blue dress shirt
    new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.72 }), // Purple ao dai
  ];
  const backpackMats = [
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.75 }),
  ];

  const spawnNpc = (
    role: AnimatedSchoolNpc['role'],
    x: number,
    y: number,
    z: number,
    yaw: number,
    phase: number,
    opts?: {
      patrolAxis?: 'x' | 'z';
      patrolRange?: number;
      speed?: number;
      hasBackpack?: boolean;
      teacherVariant?: number;
      packVariant?: number;
    }
  ) => {
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = yaw;

    const proxyGrp = new THREE.Group();
    grp.add(proxyGrp);

    const topMat =
      role === 'guard'
        ? guardBlueMat
        : role === 'teacher'
          ? teacherMats[(opts?.teacherVariant ?? 0) % teacherMats.length]
          : shirtWhiteMat;

    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 1.04;
    proxyGrp.add(torso);

    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.48;
    proxyGrp.add(head);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.62;
    proxyGrp.add(hair);

    const leftLeg = new THREE.Mesh(legGeo, pantsNavyMat);
    leftLeg.position.set(-0.1, 0.36, 0);
    proxyGrp.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, pantsNavyMat);
    rightLeg.position.set(0.1, 0.36, 0);
    proxyGrp.add(rightLeg);

    if (role === 'seated_student') {
      // Fold legs forward slightly & lower body cleanly onto student chair
      torso.position.y = 0.82;
      head.position.y = 1.26;
      hair.position.y = 1.40;
      leftLeg.rotation.x = -Math.PI * 0.42;
      rightLeg.rotation.x = -Math.PI * 0.42;
      leftLeg.position.set(-0.1, 0.36, 0.16);
      rightLeg.position.set(0.1, 0.36, 0.16);
    }

    const armY = role === 'seated_student' ? 0.80 : 1.02;
    const leftArm = new THREE.Mesh(armGeo, topMat);
    leftArm.position.set(-0.28, armY, 0);
    proxyGrp.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, topMat);
    rightArm.position.set(0.28, armY, 0);
    proxyGrp.add(rightArm);

    if (opts?.hasBackpack && role !== 'guard' && role !== 'teacher') {
      const pack = new THREE.Mesh(packGeo, backpackMats[(opts.packVariant ?? 0) % backpackMats.length]);
      pack.position.set(0, role === 'seated_student' ? 0.82 : 1.04, -0.18);
      proxyGrp.add(pack);
    }

    const packColors = [0xef4444, 0x2563eb, 0x16a34a, 0xf59e0b];
    const teacherColors = [0x0f766e, 0x9f1239, 0x3b82f6, 0x7c3aed];
    const roleSpec =
      role === 'guard'
        ? GUARD_NPC_MODEL
        : role === 'teacher'
          ? TEACHER_NPC_MODEL
          : pickSchoolStudentModel(schoolNpcs.length + Math.round(phase * 10));
    const glbHandle = attachGlbHumanToNpc({
      modelSource: roleSpec.modelSource,
      targetHeight: roleSpec.targetHeight,
      clipProfile: roleSpec.clipProfile,
      rotationY: roleSpec.rotationY,
      hostGroup: grp,
      fallbackMeshes: [proxyGrp],
      initialState:
        role === 'seated_student'
          ? 'Sit'
          : role === 'teacher'
            ? 'Lecture'
            : role === 'guard'
              ? 'Idle'
              : 'Walk',
      phaseOffset: phase,
      palette:
        role === 'guard'
          ? { suit: 0x0f172a, shirt: 0x38bdf8, accent: 0xfacc15 }
          : role === 'teacher'
            ? { suit: teacherColors[(opts?.teacherVariant ?? 0) % teacherColors.length], shirt: 0xf8fafc, accent: 0xfef3c7 }
            : {
                shirt: 0xf8fafc,
                pants: 0x1e293b,
                accent: opts?.hasBackpack ? packColors[(opts.packVariant ?? 0) % packColors.length] : 0x1e293b,
              },
    });

    npcRootGroup.add(grp);
    schoolNpcs.push({
      grp,
      proxyGrp,
      glbHandle,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      role,
      baseX: x,
      baseY: y,
      baseZ: z,
      baseYaw: yaw,
      patrolAxis: opts?.patrolAxis,
      patrolRange: opts?.patrolRange,
      phase,
      speed: opts?.speed ?? 1.25,
    });
  };

  // A. 2 Security Guards (24/7): Inside Guardhouse at CCTV Desk + Outside Gate Barrier
  spawnNpc('guard', -324.6, 0.08, 49.4, -Math.PI / 2, 0.1);
  spawnNpc('guard', -327.6, 0.0, 49.4, Math.PI, 1.4);

  // B. Active Classroom Teachers & Seated Students across Floors 1, 2 & 3 (07:00 - 17:00)
  const populateActiveRoom = (
    x0: number,
    x1: number,
    z0: number,
    floorY: number,
    tVar: number,
    seed: number
  ) => {
    const cx = (x0 + x1) * 0.5;
    // Standing Teacher at Podium facing students (+Z)
    spawnNpc('teacher', cx, floorY + 0.16, z0 + 1.45, 0, seed * 0.7, { teacherVariant: tVar });
    // 4 Seated Students at desks facing chalkboard (Math.PI)
    const rows = [z0 + 5.32, z0 + 7.92];
    const cols = [x0 + 1.5, x1 - 1.5];
    rows.forEach((sz, ri) => {
      cols.forEach((sx, ci) => {
        spawnNpc('seated_student', sx + (ci === 0 ? -0.38 : 0.38), floorY, sz, Math.PI, seed + ri * 1.1 + ci * 0.6, {
          hasBackpack: true,
          packVariant: seed + ri + ci,
        });
      });
    });
  };
  // Floor 1 Classrooms + Computer Lab + Teachers' Lounge + Canteen
  populateActiveRoom(-358.9, -351.8, 67.0, SCHOOL_PODIUM_Y, 0, 1); // 10A1
  populateActiveRoom(-314.2, -307.1, 67.0, SCHOOL_PODIUM_Y, 1, 2); // 10A2
  populateActiveRoom(-314.2, -307.1, 85.2, SCHOOL_PODIUM_Y, 2, 3); // Computer Lab
  spawnNpc('teacher', -354.5, SCHOOL_PODIUM_Y, 96.5, -0.4, 0.5, { teacherVariant: 3 }); // Medical/Advisor
  spawnNpc('teacher', -338.8, SCHOOL_PODIUM_Y, 108.8, 0.0, 1.2, { teacherVariant: 0 }); // Teachers' Lounge
  spawnNpc('teacher', -336.2, SCHOOL_PODIUM_Y, 112.4, Math.PI, 2.1, { teacherVariant: 1 });
  spawnNpc('teacher', -355.0, 0.0, 121.6, 0.0, 0.8, { teacherVariant: 2 }); // Canteen Staff

  // Floor 2 Classrooms + Science Lab + Library + Principal Office
  const f2Y = SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H;
  populateActiveRoom(-358.9, -351.8, 67.0, f2Y, 2, 4); // 11A1
  populateActiveRoom(-358.9, -351.8, 85.2, f2Y, 3, 5); // 11A2
  populateActiveRoom(-314.2, -307.1, 67.0, f2Y, 0, 6); // 11A3
  populateActiveRoom(-314.2, -307.1, 85.2, f2Y, 1, 7); // Lab
  spawnNpc('teacher', -333.0, f2Y, 57.6, 0.0, 1.6, { teacherVariant: 1 }); // Principal
  spawnNpc('teacher', -339.2, f2Y, 108.8, 0.0, 0.9, { teacherVariant: 3 }); // Librarian
  spawnNpc('seated_student', -334.4, f2Y, 112.2, Math.PI, 2.3, { hasBackpack: false });
  spawnNpc('seated_student', -331.6, f2Y, 112.2, Math.PI, 3.1, { hasBackpack: false });

  // Floor 3 Classrooms + Language Room
  const f3Y = SCHOOL_PODIUM_Y + SCHOOL_FLOOR_H * 2;
  populateActiveRoom(-358.9, -351.8, 67.0, f3Y, 1, 8); // 12A1
  populateActiveRoom(-358.9, -351.8, 85.2, f3Y, 0, 9); // 12A2
  populateActiveRoom(-314.2, -307.1, 67.0, f3Y, 3, 10); // 12A3
  populateActiveRoom(-314.2, -307.1, 85.2, f3Y, 2, 11); // Language Lab

  // C. Roaming Courtyard, Corridor, Canteen & Basketball Court Students & Teachers (07:00 - 17:00)
  spawnNpc('roam', -337.2, SCHOOL_PODIUM_Y, 84.0, 0.0, 0.4, { patrolAxis: 'z', patrolRange: 6.5, hasBackpack: true, packVariant: 1, speed: 1.08 });
  spawnNpc('roam', -328.6, SCHOOL_PODIUM_Y, 86.0, Math.PI, 1.8, { patrolAxis: 'z', patrolRange: 5.5, hasBackpack: true, packVariant: 2, speed: 1.05 });
  spawnNpc('roam', -333.0, SCHOOL_PODIUM_Y, 63.2, Math.PI / 2, 2.5, { patrolAxis: 'x', patrolRange: 5.5, speed: 1.02 });
  spawnNpc('roam', -349.8, f2Y, 84.0, 0.0, 1.1, { patrolAxis: 'z', patrolRange: 8.5, hasBackpack: true, packVariant: 0, speed: 1.1 });
  spawnNpc('roam', -316.0, f2Y, 84.0, Math.PI, 2.7, { patrolAxis: 'z', patrolRange: 8.0, speed: 1.06 });
  spawnNpc('roam', -349.8, f3Y, 86.0, 0.0, 0.9, { patrolAxis: 'z', patrolRange: 7.5, hasBackpack: true, packVariant: 3, speed: 1.08 });
  spawnNpc('roam', -325.5, 0.0, 126.5, 0.4, 1.5, { patrolAxis: 'x', patrolRange: 3.5, speed: 0.98 }); // Pavilion
  spawnNpc('roam', -340.0, 0.08, 141.2, Math.PI / 2, 0.2, { patrolAxis: 'x', patrolRange: 7.5, speed: 1.65 }); // Basketball player 1
  spawnNpc('roam', -328.0, 0.08, 139.6, -Math.PI / 2, 1.9, { patrolAxis: 'x', patrolRange: 6.5, speed: 1.58 }); // Basketball player 2
  spawnNpc('roam', -334.0, 0.08, 143.0, Math.PI / 2, 3.0, { patrolAxis: 'x', patrolRange: 5.0, speed: 1.52 }); // Basketball player 3

  // D. 7:00 AM Morning Arrival Wave ("vào học lúc 7h": Long Sidewalk -> Gate -> Courtyard -> Corridor)
  for (let i = 0; i < 12; i++) {
    const isTeacher = i === 3 || i === 9;
    spawnNpc(
      isTeacher ? 'teacher' : 'arrive_7h',
      -360.0 + (i % 6) * 2.5,
      0.0,
      40.5,
      0.0,
      i * 0.85,
      {
        hasBackpack: !isTeacher,
        packVariant: i % 4,
        teacherVariant: i % 4,
        speed: 1.12 + (i % 3) * 0.08,
      }
    );
    schoolNpcs[schoolNpcs.length - 1].role = 'arrive_7h';
  }

  // E. 5:00 PM Dismissal Wave ("tan học lúc 5h": Courtyard -> Gate -> Walk ALL THE WAY down Sidewalk East & West!)
  for (let i = 0; i < 12; i++) {
    spawnNpc(
      'dismiss_5h',
      -333.0,
      0.0,
      68.5,
      Math.PI,
      i * 0.85,
      {
        hasBackpack: true,
        packVariant: (i + 1) % 4,
        speed: 1.15 + (i % 3) * 0.08,
      }
    );
  }

  // F. Daytime Student Errand & Sidewalk Commuters (calm realistic walking pace along front sidewalk!)
  // Patrol cleanly along avenue sidewalks between X=-356 and X=-274 (clear of Hospital driveway at -262)
  for (let i = 0; i < 6; i++) {
    const startX = -315.0 + ((i % 3) - 1) * 8.0;
    spawnNpc(
      'roam',
      startX,
      0.0,
      40.2 + (i % 3) * 0.45,
      i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2,
      i * 1.15,
      {
        patrolAxis: 'x',
        patrolRange: 26.0 + (i % 2) * 8.0,
        hasBackpack: true,
        packVariant: (i + 2) % 4,
        speed: 1.08 + (i % 3) * 0.07,
      }
    );
  }

  let animClock = 0;
  let gateOpenFactor = 1.0;

  const smoothYawToward = (current: number, target: number, alpha: number) => {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * alpha;
  };

  const update = (delta: number, rawHour: number, lampFactor: number, playerPos?: THREE.Vector3) => {
    const dt = Math.min(delta, 0.1);
    animClock += dt;

    // 1. Gentle Vietnamese Flag Wave
    const posAttr = flagGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const fx = posAttr.getX(i);
      const fy = posAttr.getY(i);
      const wave = Math.sin(animClock * 4.2 - fx * 2.4) * (fx / 2.55) * 0.18;
      const drop = (fx / 2.55) * 0.08 * Math.cos(animClock * 2.1 + fy);
      posAttr.setZ(i, wave + drop);
    }
    posAttr.needsUpdate = true;

    // 2. Spin Active Classroom Ceiling Fans strictly during school hours (07:00 - 17:00)
    const inClassHours = rawHour >= 7.0 && rawHour < 17.0;
    const schoolOpen = inClassHours;
    if (schoolOpen) {
      for (let i = 0; i < spinningFans.length; i++) {
        spinningFans[i].rotation.y += dt * 7.5;
      }
    }

    // 3. Active Sliding School Gate & Boom Barrier Animation!
    const nearGate =
      playerPos !== undefined &&
      Math.hypot(playerPos.x - -333.0, playerPos.z - 50.8) <= 9.2 &&
      playerPos.y < 3.0;
    const isEntryWindow = rawHour >= 7.0 && rawHour <= 7.65; // 07:00 - 07:39 morning arrival
    const isDismissWindow = rawHour >= 16.5 && rawHour < 17.0; // 16:30 - 17:00 afternoon dismissal
    const wantGateOpen = schoolOpen || nearGate;
    gateOpenFactor = THREE.MathUtils.lerp(gateOpenFactor, wantGateOpen ? 1 : 0, Math.min(1, dt * 3.8));

    leftGateWing.position.x = THREE.MathUtils.lerp(-335.75, -341.05, gateOpenFactor);
    rightGateWing.position.x = THREE.MathUtils.lerp(-330.25, -324.75, gateOpenFactor);
    barrierPivot.rotation.z = -gateOpenFactor * 1.42;

    // 4. Schedule-Driven NPC Updates (07:00 - 17:00 school hours; outside 17:00-07:00 only guards remain!)
    const yawAlpha = Math.min(1, dt * 6.0);

    for (let i = 0; i < schoolNpcs.length; i++) {
      const npc = schoolNpcs[i];
      if (npc.role === 'guard') {
        npc.grp.visible = true;
        npc.glbHandle.setVisible(true);
        npc.grp.rotation.y = npc.baseYaw + Math.sin(animClock * 0.9 + npc.phase) * 0.22;
        npc.glbHandle.setAnimState(i === 1 && gateOpenFactor > 0.65 ? 'Wave' : 'Idle', 1.0);
        if (i === 1 && npc.proxyGrp.visible) {
          npc.rightArm.rotation.x = gateOpenFactor > 0.65 ? -0.45 + Math.sin(animClock * 2.4) * 0.12 : 0;
        }
        continue;
      }

      if (npc.role === 'teacher' || npc.role === 'seated_student' || npc.role === 'roam') {
        const vis = inClassHours;
        npc.grp.visible = vis;
        npc.glbHandle.setVisible(vis);
        if (!vis) continue;

        if (npc.role === 'teacher') {
          npc.glbHandle.setAnimState('Lecture', 1.0);
          const t = animClock * 1.6 + npc.phase;
          npc.grp.rotation.y = npc.baseYaw + Math.sin(t * 0.7) * 0.28;
          if (npc.proxyGrp.visible) {
            npc.rightArm.rotation.x = -0.55 + Math.sin(t * 2.1) * 0.35;
            npc.leftArm.rotation.x = -0.15 + Math.cos(t * 1.4) * 0.12;
          }
        } else if (npc.role === 'seated_student') {
          npc.glbHandle.setAnimState('Sit', 1.0);
          const t = animClock * 1.4 + npc.phase;
          npc.grp.rotation.y = npc.baseYaw + Math.sin(t * 0.6) * 0.1;
          if (npc.proxyGrp.visible) {
            npc.rightArm.rotation.x = -0.45 + Math.sin(t * 3.0) * 0.14;
          }
        } else {
          // True metric velocity: omega = speed / range so peak velocity is EXACTLY npc.speed (1.0..1.65 m/s)!
          const range = Math.max(1.5, npc.patrolRange ?? 4.0);
          const omega = npc.speed / range;
          const angle = animClock * omega + npc.phase;
          const offset = Math.sin(angle) * range;
          const velDir = Math.cos(angle);
          const instSpeed = Math.abs(velDir) * npc.speed;

          npc.glbHandle.setAnimState(
            instSpeed > 0.18 ? 'Walk' : 'Idle',
            THREE.MathUtils.clamp(instSpeed / 1.38, 0.65, 1.15)
          );
          if (npc.patrolAxis === 'z') {
            npc.grp.position.z = npc.baseZ + offset;
            const targetYaw = velDir >= 0 ? 0 : Math.PI;
            npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, targetYaw, yawAlpha);
          } else {
            npc.grp.position.x = npc.baseX + offset;
            const targetYaw = velDir >= 0 ? Math.PI / 2 : -Math.PI / 2;
            npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, targetYaw, yawAlpha);
          }
          if (npc.proxyGrp.visible) {
            const swing = Math.sin(animClock * npc.speed * 3.1 + npc.phase) * Math.min(0.36, instSpeed * 0.3);
            npc.leftLeg.rotation.x = swing;
            npc.rightLeg.rotation.x = -swing;
            npc.leftArm.rotation.x = -swing * 0.65;
            npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
          }
        }
        continue;
      }

      if (npc.role === 'arrive_7h') {
        npc.grp.visible = isEntryWindow;
        npc.glbHandle.setVisible(isEntryWindow);
        if (!isEntryWindow) continue;
        npc.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(npc.speed / 1.38, 0.72, 1.0));
        // True metric distance progression at calm walking speed (1.12..1.28 m/s)
        const fromWest = i % 2 === 0;
        const laneOff = ((i % 5) - 2) * 0.75;
        const startX = fromWest ? -412.0 : -274.0;
        const gateX = -333.0 + laneOff;
        const endX = fromWest ? -350.0 : -316.0;
        const seg1 = Math.abs(gateX - startX);
        const seg2 = 72.0 - 40.5;
        const seg3 = Math.hypot(endX - gateX, 6.0);
        const totalLen = seg1 + seg2 + seg3;
        const dist = (animClock * npc.speed + npc.phase * 14.0) % totalLen;

        let x = gateX;
        let z = 40.5;
        let targetYaw = 0;
        if (dist < seg1) {
          const p = dist / seg1;
          x = THREE.MathUtils.lerp(startX, gateX, p);
          z = 40.3 + (i % 3) * 0.45;
          targetYaw = fromWest ? Math.PI / 2 : -Math.PI / 2;
        } else if (dist < seg1 + seg2) {
          const p = (dist - seg1) / seg2;
          z = THREE.MathUtils.lerp(40.5, 72.0, p);
          targetYaw = 0;
        } else {
          const p = (dist - seg1 - seg2) / seg3;
          z = 72.0 + p * 6.0;
          x = THREE.MathUtils.lerp(gateX, endX, p);
          targetYaw = Math.atan2(endX - gateX, 6.0);
        }
        const y = z <= 55.0 ? 0.0 : z >= 57.5 ? SCHOOL_PODIUM_Y : ((z - 55.0) / 2.5) * SCHOOL_PODIUM_Y;
        npc.grp.position.set(x, y, z);
        npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, targetYaw, yawAlpha);
        if (npc.proxyGrp.visible) {
          const swing = Math.sin(animClock * npc.speed * 3.2 + npc.phase) * 0.34;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
          npc.leftArm.rotation.x = -swing * 0.65;
          npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
        }
        continue;
      }

      if (npc.role === 'dismiss_5h') {
        npc.grp.visible = isDismissWindow;
        npc.glbHandle.setVisible(isDismissWindow);
        if (!isDismissWindow) continue;
        npc.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(npc.speed / 1.38, 0.72, 1.0));
        // True metric distance progression at calm walking speed (1.15..1.31 m/s)
        const goWest = i % 2 === 0;
        const laneOff = ((i % 5) - 2) * 0.75;
        const gateX = -333.0 + laneOff;
        const endX = goWest ? -412.0 : -272.0;
        const seg1 = 72.0 - 40.5;
        const seg2 = Math.abs(endX - gateX);
        const totalLen = seg1 + seg2;
        const dist = (animClock * npc.speed + npc.phase * 14.0) % totalLen;

        let x = gateX;
        let z = 40.5;
        let targetYaw = Math.PI;
        if (dist < seg1) {
          const p = dist / seg1;
          z = THREE.MathUtils.lerp(72.0, 40.5, p);
          targetYaw = Math.PI;
        } else {
          const p = (dist - seg1) / seg2;
          x = THREE.MathUtils.lerp(gateX, endX, p);
          z = 40.3 + (i % 3) * 0.45;
          targetYaw = goWest ? -Math.PI / 2 : Math.PI / 2;
        }
        const y = z <= 55.0 ? 0.0 : z >= 57.5 ? SCHOOL_PODIUM_Y : ((z - 55.0) / 2.5) * SCHOOL_PODIUM_Y;
        npc.grp.position.set(x, y, z);
        npc.grp.rotation.y = smoothYawToward(npc.grp.rotation.y, targetYaw, yawAlpha);
        if (npc.proxyGrp.visible) {
          const swing = Math.sin(animClock * npc.speed * 3.2 + npc.phase) * 0.34;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
          npc.leftArm.rotation.x = -swing * 0.65;
          npc.rightArm.rotation.x = npc.glbHandle.hasActiveUmbrella() ? -0.88 : swing * 0.65;
        }
      }
    }

    // 5. Dynamic Interior Classroom & Sign Illumination (bright during class hours 07:00-17:00; dark after dismissal)
    facadeSignMat.emissiveIntensity = 0.26 + lampFactor * 0.48;
    gateSignMat.emissiveIntensity = 0.25 + lampFactor * 0.48;
    ceilingLedMat.emissiveIntensity = inClassHours ? 0.78 : 0.08;
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
