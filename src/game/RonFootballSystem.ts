import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  ADULT_NPC_MODELS,
  CASHIER_NPC_MODEL,
  pickShopCustomerModel,
} from './NpcModelCatalog';
import {
  advanceNpcExitPath,
  createRollingShutterDoor,
  createRollingShutterTexture,
  isRonFootballOpenAtHour,
  RollingShutterHandle,
  setShutterProgress,
} from './VenueOperatingHours';

export interface RonFootballCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface RonFootballBuildResult {
  staticGroup: THREE.Group;
  heroBallMesh: THREE.Mesh;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{
    light: THREE.PointLight;
    nightIntensity: number;
    dayIntensity: number;
    alwaysOn?: boolean;
  }>;
  updateOperatingHours: (
    rawHour: number,
    delta: number,
    npcController?: RonFootballNpcController | null,
    isPlayerNearGate?: boolean,
    isPlayerNearShopDoor?: boolean
  ) => void;
  getClosedFactor: () => number;
  getGateOpenAmount: () => number;
}

// World placement (South side of boulevard, West of RON BARBER SHOP):
// - Football Arena (2 Artificial Turf Pitches): X = -207.0 .. -163.0 (44.0m), Z = 42.5 .. 82.5 (40.0m)
//   * Pitch 01 (East): center (-174.0, 62.5), pitch 19m x 34m
//   * Pitch 02 (West): center (-196.0, 62.5), pitch 19m x 34m
// - Football Pro-Shop (Equipment Store): X = -163.0 .. -148.0 (15.0m), Z = 42.5 .. 78.5 (36.0m)
// - Front faces -Z toward boulevard sidewalk (Z = 37.2 .. 42.5).
export const RON_FOOTBALL_ARENA_MIN_X = -207.0;
export const RON_FOOTBALL_SHOP_MAX_X = -148.0;

// ==========================================
// PROCEDURAL CANVAS TEXTURES
// ==========================================

function createFootballTurfTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Striped stadium turf bands
  const stripes = 12;
  const bandH = h / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#16a34a';
    ctx.fillRect(0, i * bandH, w, bandH + 1);
  }

  // Subtle turf grain speckle
  ctx.fillStyle = 'rgba(20, 83, 45, 0.14)';
  for (let y = 0; y < h; y += 8) {
    for (let x = (y % 16 === 0 ? 0 : 4); x < w; x += 10) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const m = 22; // outer turf margin
  const pw = w - m * 2;
  const ph = h - m * 2;

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 6;
  ctx.strokeRect(m, m, pw, ph);

  // Halfway line & center circle
  ctx.beginPath();
  ctx.moveTo(m, h / 2);
  ctx.lineTo(w - m, h / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas & goal areas (top and bottom ends)
  const penW = pw * 0.56;
  const penH = 112;
  const goalW = pw * 0.28;
  const goalH = 44;

  // Top (-Z) goal end
  ctx.strokeRect(w / 2 - penW / 2, m, penW, penH);
  ctx.strokeRect(w / 2 - goalW / 2, m, goalW, goalH);
  ctx.beginPath();
  ctx.arc(w / 2, m + 82, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, m + 82, 54, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();

  // Bottom (+Z) goal end
  ctx.strokeRect(w / 2 - penW / 2, h - m - penH, penW, penH);
  ctx.strokeRect(w / 2 - goalW / 2, h - m - goalH, goalW, goalH);
  ctx.beginPath();
  ctx.arc(w / 2, h - m - 82, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, h - m - 82, 54, 1.22 * Math.PI, 1.78 * Math.PI);
  ctx.stroke();

  // Corner arcs
  const cr = 18;
  [
    [m, m, 0, Math.PI / 2],
    [w - m, m, Math.PI / 2, Math.PI],
    [w - m, h - m, Math.PI, Math.PI * 1.5],
    [m, h - m, Math.PI * 1.5, Math.PI * 2],
  ].forEach(([cx, cy, a0, a1]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, a0, a1);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSoccerBallTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);

  // Classic pentagon soccer pattern
  ctx.fillStyle = '#0f172a';
  const pts = [
    [32, 32],
    [96, 32],
    [160, 32],
    [224, 32],
    [64, 92],
    [128, 92],
    [192, 92],
    [0, 92],
    [256, 92],
  ];
  pts.forEach(([px, py]) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const vx = px + Math.cos(a) * 14;
      const vy = py + Math.sin(a) * 14;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
  });

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 32, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFenceMeshTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.78)';
  ctx.lineWidth = 3;
  for (let i = -128; i < 256; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 128, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGoalNetTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(241, 245, 249, 0.88)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createShowroomTileFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  const step = 128;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? '#e8eef5' : '#dbe3ec';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 9);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFootballSignTex(
  title: string,
  subtitle: string,
  _badgeText: string,
  widthPx = 2048,
  heightPx = 224,
  accentHex = '#22c55e'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = widthPx;
  c.height = heightPx;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, widthPx, 0);
  bg.addColorStop(0, '#090c10');
  bg.addColorStop(0.5, '#111820');
  bg.addColorStop(1, '#090c10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Subtle metallic hairline top/bottom accent
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, heightPx - 5, widthPx, 5);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fafc';
  ctx.font = `900 ${Math.round(heightPx * 0.40)}px system-ui, sans-serif`;
  ctx.fillText(title, widthPx / 2, heightPx * 0.42);

  if (subtitle) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 ${Math.round(heightPx * 0.16)}px system-ui, sans-serif`;
    ctx.fillText(subtitle, widthPx / 2, heightPx * 0.77);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPitchNumberTex(label: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#07130d';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4ade80';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.fillText(label, 256, 98);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText(sub, 256, 182);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWallZoneHeaderTex(title: string, sub: string, accentHex = '#22c55e'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b1117';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 152, 1024, 8);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 58px system-ui, sans-serif';
  ctx.fillText(title, 512, 62);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(sub, 512, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ==========================================
// STRUCTURE BUILDER
// ==========================================

export function createRonFootballStructure(): RonFootballBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const interiorPointLights: Array<{
    light: THREE.PointLight;
    nightIntensity: number;
    dayIntensity: number;
    alwaysOn?: boolean;
  }> = [];

  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.65 });
  const galvSteelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.38, metalness: 0.72 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const slateWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
  const warmTimberMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72 });
  const whiteGoalMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.15 });
  const acrylicClearMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.34,
  });
  const pitchEmeraldGlowMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.92,
    roughness: 0.25,
  });
  neonMats.push(pitchEmeraldGlowMat);

  const pitchFloodBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });
  neonMats.push(pitchFloodBulbMat);

  const emeraldGlowMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.92,
    roughness: 0.25,
  });

  const floodBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });

  // =========================================================================
  // PART 1: 2 FLOODLIT ARTIFICIAL-TURF FOOTBALL PITCHES (X = -207.0..-163.0, Z = 42.5..82.5)
  // =========================================================================
  const arenaSlab = new THREE.Mesh(
    new THREE.BoxGeometry(44.2, 0.12, 40.2),
    new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.94 })
  );
  arenaSlab.position.set(-185.0, -0.04, 62.5);
  staticGroup.add(arenaSlab);

  const turfTex = createFootballTurfTex();
  const turfMat = new THREE.MeshStandardMaterial({ map: turfTex, roughness: 0.92 });

  const netTex = createGoalNetTex();
  const netMat = new THREE.MeshStandardMaterial({
    map: netTex,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 0.65,
  });

  const buildGoalFrame = (gx: number, gz: number, openTowardDirZ: 1 | -1) => {
    const goal = new THREE.Group();
    goal.position.set(gx, 0.03, gz);
    if (openTowardDirZ === -1) {
      goal.rotation.y = Math.PI;
    }
    const gw = 3.2;
    const gh = 1.95;
    const gd = 1.05;

    // Front posts & crossbar
    [-gw / 2, gw / 2].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, gh, 10), whiteGoalMat);
      post.position.set(px, gh / 2, 0);
      goal.add(post);

      const backPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gh, 8), whiteGoalMat);
      backPost.position.set(px, gh / 2, -gd);
      goal.add(backPost);

      const topSideBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gd, 8), whiteGoalMat);
      topSideBar.rotation.x = Math.PI / 2;
      topSideBar.position.set(px, gh, -gd / 2);
      goal.add(topSideBar);

      const botSideBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gd, 8), whiteGoalMat);
      botSideBar.rotation.x = Math.PI / 2;
      botSideBar.position.set(px, 0.04, -gd / 2);
      goal.add(botSideBar);
    });

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, gw + 0.1, 10), whiteGoalMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, gh, 0);
    goal.add(crossbar);

    const backTopBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gw, 8), whiteGoalMat);
    backTopBar.rotation.z = Math.PI / 2;
    backTopBar.position.set(0, gh, -gd);
    goal.add(backTopBar);

    const backBotBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gw, 8), whiteGoalMat);
    backBotBar.rotation.z = Math.PI / 2;
    backBotBar.position.set(0, 0.04, -gd);
    goal.add(backBotBar);

    // Nets (back, top, left, right)
    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), netMat);
    backNet.position.set(0, gh / 2, -gd);
    goal.add(backNet);

    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), netMat);
    topNet.rotation.x = Math.PI / 2;
    topNet.position.set(0, gh, -gd / 2);
    goal.add(topNet);

    [-gw / 2, gw / 2].forEach((px) => {
      const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(gd, gh), netMat);
      sideNet.rotation.y = Math.PI / 2;
      sideNet.position.set(px, gh / 2, -gd / 2);
      goal.add(sideNet);
    });

    staticGroup.add(goal);
  };

  // Pitch 01 (East: X = -173.5) & Pitch 02 (West: X = -196.5), leaving 4.4m central entrance walkway at X = -187.2..-182.8
  [
    { cx: -173.5, label: 'SÂN 01', sub: 'MINI 5V5 • FIFA TURF' },
    { cx: -196.5, label: 'SÂN 02', sub: 'MINI 5V5 • FIFA TURF' },
  ].forEach((p) => {
    const pitchSurface = new THREE.Mesh(new THREE.PlaneGeometry(18.2, 34.4), turfMat);
    pitchSurface.rotation.x = -Math.PI / 2;
    pitchSurface.position.set(p.cx, 0.032, 62.5);
    staticGroup.add(pitchSurface);

    // North (-Z) Goal facing +Z into pitch (net at 44.85) and South (+Z) Goal facing -Z into pitch (net at 80.15)
    buildGoalFrame(p.cx, 45.9, 1);
    buildGoalFrame(p.cx, 79.1, -1);

    // Rear Bleacher Bench + Pitch Banner Board (Z = 81.2)
    const standPad = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.25, 1.35), plinthMat);
    standPad.position.set(p.cx, 0.14, 81.4);
    staticGroup.add(standPad);
    const standSeat = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.10, 0.65), warmTimberMat);
    standSeat.position.set(p.cx, 0.52, 81.4);
    staticGroup.add(standSeat);

    const boardTex = createPitchNumberTex(p.label, p.sub);
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      emissive: 0xffffff,
      emissiveMap: boardTex,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });
    neonMats.push(boardMat);
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.2), boardMat);
    boardMesh.rotation.y = Math.PI;
    boardMesh.position.set(p.cx, 2.4, 82.25);
    staticGroup.add(boardMesh);
  });

  // Center Walkway & Dugouts between Pitch 01 & Pitch 02 (X = -187.2 .. -182.8, aligned with single front entrance)
  const centerWalkway = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.04, 39.5),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
  );
  centerWalkway.position.set(-185.0, 0.025, 62.25);
  staticGroup.add(centerWalkway);

  [57.0, 69.0].forEach((dz) => {
    const dugout = new THREE.Group();
    dugout.position.set(-185.0, 0.04, dz);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.44, 3.8), darkSteelMat);
    bench.position.set(0, 0.22, 0);
    dugout.add(bench);
    const seatPlank = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 3.8), warmTimberMat);
    seatPlank.position.set(0, 0.46, 0);
    dugout.add(seatPlank);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 4.1), darkSteelMat);
    canopy.position.set(0, 2.15, 0);
    dugout.add(canopy);
    [-1.9, 1.9].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.15, 0.10), darkSteelMat);
      post.position.set(0, 1.075, pz);
      dugout.add(post);
    });
    const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.48, 10), pitchEmeraldGlowMat);
    jug.position.set(0, 0.72, 2.25);
    dugout.add(jug);

    staticGroup.add(dugout);
  });

  // 6 Stadium Floodlight Masts (8.8m tall, keeping central walkway X = -186.5..-183.5 clear) + 24/7 Overhead PointLights
  [
    [-206.6, 48.0, 1],
    [-206.6, 77.0, 1],
    [-186.9, 51.0, 0],
    [-186.9, 74.0, 0],
    [-163.4, 48.0, -1],
    [-163.4, 77.0, -1],
  ].forEach(([fx, fz, dirX]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 8.8, 10), galvSteelMat);
    mast.position.set(fx, 4.4, fz);
    staticGroup.add(mast);

    const headArm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 0.30), darkSteelMat);
    headArm.position.set(fx + dirX * 0.35, 8.75, fz);
    headArm.rotation.x = fz < 62.5 ? 0.32 : -0.32;
    staticGroup.add(headArm);

    const ledPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.52), pitchFloodBulbMat);
    ledPanel.position.set(fx + dirX * 0.35, 8.70, fz + (fz < 62.5 ? 0.18 : -0.18));
    ledPanel.rotation.y = fz < 62.5 ? 0 : Math.PI;
    ledPanel.rotation.x = fz < 62.5 ? 0.32 : -0.32;
    staticGroup.add(ledPanel);
  });

  [
    [-173.5, 54.0],
    [-173.5, 71.0],
    [-196.5, 54.0],
    [-196.5, 71.0],
  ].forEach(([px, pz]) => {
    const pLight = new THREE.PointLight(0xf8fafc, 52, 42, 0.85);
    pLight.position.set(px, 7.6, pz);
    interiorPointLights.push({ light: pLight, nightIntensity: 52, dayIntensity: 14, alwaysOn: true });
  });

  // Perimeter Chain-Link Sports Fence (4.0m high on outer sides, 2.8m front facing street)
  const fenceMeshTex = createFenceMeshTex();
  const sharedFenceMat = new THREE.MeshStandardMaterial({
    map: fenceMeshTex,
    transparent: false,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.55,
  });

  const addFenceSeg = (x1: number, z1: number, x2: number, z2: number, height = 3.8) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const ang = Math.atan2(dx, dz);

    const seg = new THREE.Group();
    seg.position.set(midX, 0, midZ);
    seg.rotation.y = ang + Math.PI / 2;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(len, 0.52, 0.22), plinthMat);
    plinth.position.y = 0.26;
    seg.add(plinth);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.14), pitchEmeraldGlowMat);
    topRail.position.y = height;
    seg.add(topRail);

    const planeGeo = new THREE.PlaneGeometry(len, height - 0.52);
    const repX = Math.max(1, Math.round(len / 1.5));
    const uvAttr = planeGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, uvAttr.getX(i) * repX, uvAttr.getY(i) * 3);
    }
    uvAttr.needsUpdate = true;
    const meshPlane = new THREE.Mesh(planeGeo, sharedFenceMat);
    meshPlane.position.y = 0.52 + (height - 0.52) / 2;
    seg.add(meshPlane);

    staticGroup.add(seg);
  };

  addFenceSeg(-207.0, 42.5, -207.0, 82.5, 4.0); // West boundary
  addFenceSeg(-207.0, 82.5, -163.0, 82.5, 4.0); // Rear South boundary
  // Front street fence (Z = 42.5): unified into 1 central entrance opening at X = -187.2 .. -182.8
  addFenceSeg(-207.0, 42.5, -187.2, 42.5, 2.8);
  addFenceSeg(-182.8, 42.5, -163.0, 42.5, 2.8);
  // East rear fence behind Pro-Shop (Pro-Shop wall covers Z = 42.5..78.5 cleanly without Z-fighting)
  addFenceSeg(-163.0, 78.5, -163.0, 82.5, 4.0);

  // Fence Posts along perimeter
  [-207.0, -187.2, -182.8, -163.0].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.2, 10), darkSteelMat);
    post.position.set(px, 1.6, 42.5);
    staticGroup.add(post);
  });

  // Sleek Black Structural Steel Portal Frame & Horizontal Crossbeam across Football Pitches
  [-206.8, -187.4, -182.6, -163.2].forEach((px) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.2, 0.36), darkSteelMat);
    col.position.set(px, 2.1, 42.6);
    staticGroup.add(col);
  });
  const arenaTopBeam = new THREE.Mesh(new THREE.BoxGeometry(44.2, 0.36, 0.38), darkSteelMat);
  arenaTopBeam.position.set(-185.0, 4.2, 42.6);
  staticGroup.add(arenaTopBeam);

  // Double Hinged Chain-Link Mesh Entrance Gate (X = -187.2 .. -182.8, swings open & closed)
  const buildSwingMeshGateLeaf = (pivotX: number, dir: 1 | -1, withInfoBoard: boolean) => {
    const gate = new THREE.Group();
    gate.userData.noMerge = true;
    gate.position.set(pivotX, 0, 42.55);

    const w = 2.19;
    const midX = dir * (w / 2);

    const outerStile = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.76, 0.11), darkSteelMat);
    outerStile.position.set(dir * 0.04, 1.38, 0);
    gate.add(outerStile);

    const innerStile = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.76, 0.11), darkSteelMat);
    innerStile.position.set(dir * (w - 0.04), 1.38, 0);
    gate.add(innerStile);

    const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.44, 0.10), plinthMat);
    kickPlate.position.set(midX, 0.22, 0);
    gate.add(kickPlate);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.12), pitchEmeraldGlowMat);
    topRail.position.set(midX, 2.74, 0);
    gate.add(topRail);

    const midBrace = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.06, 0.08), darkSteelMat);
    midBrace.position.set(midX, 1.45, 0);
    gate.add(midBrace);

    const meshGeo = new THREE.PlaneGeometry(w - 0.08, 2.26);
    const uvAttr = meshGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, uvAttr.getX(i) * 2, uvAttr.getY(i) * 2);
    }
    uvAttr.needsUpdate = true;
    const meshPlane = new THREE.Mesh(meshGeo, sharedFenceMat);
    meshPlane.position.set(midX, 0.44 + 1.13, 0);
    gate.add(meshPlane);

    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.18), galvSteelMat);
    latch.position.set(dir * (w - 0.14), 1.15, 0);
    gate.add(latch);

    if (withInfoBoard) {
      const sc = document.createElement('canvas');
      sc.width = 512;
      sc.height = 192;
      const sCtx = sc.getContext('2d')!;
      sCtx.fillStyle = '#07130d';
      sCtx.fillRect(0, 0, 512, 192);
      sCtx.strokeStyle = '#22c55e';
      sCtx.lineWidth = 8;
      sCtx.strokeRect(8, 8, 496, 176);
      sCtx.fillStyle = '#22c55e';
      sCtx.fillRect(16, 16, 480, 50);
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillStyle = '#052e16';
      sCtx.font = '900 28px system-ui, sans-serif';
      sCtx.fillText('RON FOOTBALL ARENA', 256, 41);
      sCtx.fillStyle = '#ffffff';
      sCtx.font = '800 30px system-ui, sans-serif';
      sCtx.fillText('LỐI VÀO SÂN 01 & 02', 256, 106);
      sCtx.fillStyle = '#fde68a';
      sCtx.font = '700 24px system-ui, sans-serif';
      sCtx.fillText('MỞ CỬA: XUYÊN ĐÊM 24/7', 256, 150);
      const sTex = new THREE.CanvasTexture(sc);
      sTex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.52, 0.60, 0.05),
        new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.45 })
      );
      board.rotation.y = Math.PI;
      board.position.set(midX, 1.56, -0.05);
      gate.add(board);
    }

    staticGroup.add(gate);
    return gate;
  };

  const meshGateLeft = buildSwingMeshGateLeaf(-187.2, 1, true);
  const meshGateRight = buildSwingMeshGateLeaf(-182.8, -1, false);

  // =========================================================================
  // PART 2: RON FOOTBALL PRO-SHOP (Cửa Hàng Dụng Cụ Đá Banh)
  // Footprint: X = -163.0 .. -148.0 (15.0m), Z = 42.5 .. 78.5 (36.0m), H = 7.2m
  // =========================================================================
  const shopCenterX = -155.5;
  const shopW = 15.0;
  const shopH = 7.2;

  const shopFloorTex = createShowroomTileFloorTex();
  const shopFloorMat = new THREE.MeshStandardMaterial({ map: shopFloorTex, roughness: 0.35, metalness: 0.05 });
  const shopFloor = new THREE.Mesh(new THREE.BoxGeometry(shopW, 0.14, 36.0), shopFloorMat);
  shopFloor.position.set(shopCenterX, -0.02, 60.5);
  staticGroup.add(shopFloor);

  // Turf Runway Carpet down center aisle of Pro-Shop
  const turfRunner = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.02, 28.0),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 })
  );
  turfRunner.position.set(shopCenterX, 0.055, 58.0);
  staticGroup.add(turfRunner);

  const shopRoof = new THREE.Mesh(new THREE.BoxGeometry(shopW + 0.4, 0.42, 36.4), darkSteelMat);
  shopRoof.position.set(shopCenterX, shopH, 60.5);
  staticGroup.add(shopRoof);

  // East Solid Wall (X = -148.2) & Rear South Wall (Z = 78.3)
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, shopH, 36.0), slateWallMat);
  eastWall.position.set(-148.2, shopH / 2, 60.5);
  staticGroup.add(eastWall);

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(shopW, shopH, 0.45), slateWallMat);
  rearWall.position.set(shopCenterX, shopH / 2, 78.3);
  staticGroup.add(rearWall);

  // West Partition Wall (X = -162.8) split cleanly around Arena Archway (Z = 49.0 .. 53.0)
  const westWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, shopH, 6.5), slateWallMat);
  westWallFront.position.set(-162.8, shopH / 2, 45.75);
  staticGroup.add(westWallFront);

  const westWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, shopH, 25.5), slateWallMat);
  westWallBack.position.set(-162.8, shopH / 2, 65.75);
  staticGroup.add(westWallBack);

  const westArchHeader = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.6, 4.0), darkSteelMat);
  westArchHeader.position.set(-162.8, 5.4, 51.0);
  staticGroup.add(westArchHeader);

  // Pro-Shop Interior Ceiling Linear Lights & 2 Pooled PointLights
  [-159.0, -152.0].forEach((lx) => {
    [48.0, 56.0, 64.0, 72.0].forEach((lz) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.35), floodBulbMat);
      strip.position.set(lx, shopH - 0.25, lz);
      staticGroup.add(strip);
    });
  });

  [53.0, 69.0].forEach((pz) => {
    const pLight = new THREE.PointLight(0xf8fafc, 34, 30, 0.95);
    pLight.position.set(shopCenterX, 5.8, pz);
    interiorPointLights.push({ light: pLight, nightIntensity: 34, dayIntensity: 16 });
  });

  // Front Storefront Facade (Z = 42.5, Clear Automatic Sliding Glass Door X = -157.5 .. -153.5)
  const clearDoorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const frostedBandMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });

  [-160.25, -150.75].forEach((fx) => {
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.15, 0.08), clearDoorGlassMat);
    winGlass.position.set(fx, 2.525, 42.64);
    staticGroup.add(winGlass);
    const botPlinth = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.45, 0.28), darkSteelMat);
    botPlinth.position.set(fx, 0.225, 42.6);
    staticGroup.add(botPlinth);
  });

  // Clear Glass Transom & Black Motion-Sensor Header Bar above Sliding Doorway
  const doorTransom = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.15, 0.08), clearDoorGlassMat);
  doorTransom.position.set(shopCenterX, 4.02, 42.64);
  staticGroup.add(doorTransom);

  const sensorHeaderBar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.22), darkSteelMat);
  sensorHeaderBar.position.set(shopCenterX, 3.45, 42.56);
  staticGroup.add(sensorHeaderBar);

  const sensorEye = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.08), emeraldGlowMat);
  sensorEye.position.set(shopCenterX, 3.42, 42.44);
  staticGroup.add(sensorEye);

  [-157.54, -153.46].forEach((px) => {
    const doorMullion = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.6, 0.20), darkSteelMat);
    doorMullion.position.set(px, 2.3, 42.6);
    staticGroup.add(doorMullion);
  });

  const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(shopW, 2.6, 0.45), darkSteelMat);
  frontHeader.position.set(shopCenterX, 5.9, 42.65);
  staticGroup.add(frontHeader);

  const shopSignTex = createFootballSignTex(
    'RON FOOTBALL PRO-SHOP',
    'GIỜ MỞ CỬA: 07:00 - 22:00  •  PHỤ KIỆN BÓNG ĐÁ',
    '',
    2048,
    224
  );
  const shopSignMat = new THREE.MeshStandardMaterial({
    map: shopSignTex,
    emissive: 0xffffff,
    emissiveMap: shopSignTex,
    emissiveIntensity: 0.36,
    roughness: 0.32,
  });
  const shopSign = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 1.95), shopSignMat);
  shopSign.rotation.y = Math.PI;
  shopSign.position.set(shopCenterX, 6.0, 42.38);
  staticGroup.add(shopSign);

  // Automatic Sliding Clear Glass Entrance Doors (closed: left -156.50, right -154.50)
  const buildSlidingGlassDoorLeaf = (closedCenterX: number, handleSide: -1 | 1) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    grp.position.set(closedCenterX, 0, 42.52);

    const w = 2.02;
    const h = 3.34;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.10, h - 0.16, 0.04), clearDoorGlassMat);
    glass.position.set(0, h / 2, 0);
    grp.add(glass);

    // Thin aluminum perimeter frame only (center remains completely transparent glass)
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.07), darkSteelMat);
    topRail.position.set(0, h - 0.045, 0);
    grp.add(topRail);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.11, 0.07), darkSteelMat);
    botRail.position.set(0, 0.055, 0);
    grp.add(botRail);
    [-w / 2 + 0.03, w / 2 - 0.03].forEach((sx) => {
      const stile = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.07), darkSteelMat);
      stile.position.set(sx, h / 2, 0);
      grp.add(stile);
    });

    const safetyBand = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.07, 0.045), frostedBandMat);
    safetyBand.position.set(0, 1.25, 0);
    grp.add(safetyBand);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.80, 8), galvSteelMat);
    handle.position.set(handleSide * (w / 2 - 0.16), 1.32, -0.05);
    grp.add(handle);

    staticGroup.add(grp);
    return grp;
  };
  const doorLeft = buildSlidingGlassDoorLeaf(-156.50, 1);
  const doorRight = buildSlidingGlassDoorLeaf(-154.50, -1);

  // Rolling Security Shutter for Pro-Shop (closes at 22:00)
  const shutterTex = createRollingShutterTexture({
    title: 'RON FOOTBALL PRO-SHOP',
    hoursLabel: 'ĐÓNG CỬA  •  MỞ LẠI LÚC 07:00',
    accentHex: '#22c55e',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.42,
    metalness: 0.35,
  });
  const shopShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'ron_football_shop_shutter',
      axis: 'x',
      pos: 42.44,
      spanCenter: -155.5,
      width: 4.1,
      baseY: 0.02,
      topY: 3.45,
      thickness: 0.08,
    },
    shutterMat,
    darkSteelMat
  );

  // Rolling Security Shutter for Arena-to-ProShop Side Archway (closes at 22:00 so pitches remain 24/7 while Pro-Shop seals shut)
  const archShutter: RollingShutterHandle = createRollingShutterDoor(
    staticGroup,
    {
      id: 'ron_football_arch_shutter',
      axis: 'z',
      pos: -162.8,
      spanCenter: 51.0,
      width: 4.0,
      baseY: 0.02,
      topY: 3.6,
      thickness: 0.08,
    },
    shutterMat,
    darkSteelMat
  );

  // =========================================================================
  // PART 3: PRO-SHOP GEAR DISPLAYS (BOOTS, JERSEYS, FIFA BALLS, GLOVES, COUNTER)
  // =========================================================================

  // 3A. West Wall ("GIÀY ĐÁ BANH" - Football Cleats Display Wall, Z = 55.0..71.5)
  const bootsHeaderTex = createWallZoneHeaderTex('GIÀY ĐÁ BANH', 'TF  •  FG  •  AG', '#22c55e');
  const bootsHeaderMat = new THREE.MeshStandardMaterial({
    map: bootsHeaderTex,
    emissive: 0xffffff,
    emissiveMap: bootsHeaderTex,
    emissiveIntensity: 0.22,
    roughness: 0.42,
  });
  const bootsHeader = new THREE.Mesh(new THREE.PlaneGeometry(10.0, 1.35), bootsHeaderMat);
  bootsHeader.rotation.y = Math.PI / 2;
  bootsHeader.position.set(-162.55, 4.4, 63.5);
  staticGroup.add(bootsHeader);

  const bootWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 13.5), darkSteelMat);
  bootWallBack.position.set(-162.45, 1.6, 63.5);
  staticGroup.add(bootWallBack);

  const bootColors = [0x22c55e, 0xef4444, 0x38bdf8, 0xfacc15, 0xf8fafc, 0xf97316, 0xa855f7];
  [0.85, 1.55, 2.25, 2.95].forEach((sy, rIdx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 13.0), acrylicClearMat);
    shelf.position.set(-162.18, sy, 63.5);
    staticGroup.add(shelf);

    for (let bz = 57.6; bz <= 69.6; bz += 1.2) {
      const col = bootColors[(Math.round(bz) + rIdx) % bootColors.length];
      const bootMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.38 });
      const soleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.14), soleMat);
      sole.position.set(-162.15, sy + 0.05, bz);
      staticGroup.add(sole);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.13), bootMat);
      upper.position.set(-162.14, sy + 0.11, bz);
      staticGroup.add(upper);

      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.13), bootMat);
      heel.position.set(-162.23, sy + 0.14, bz);
      staticGroup.add(heel);
    }
  });

  // 3B. East Wall ("ÁO ĐẤU CLB" - Football Jerseys Wall + 2 Mannequins, Z = 47.0..70.0)
  const jerseyHeaderTex = createWallZoneHeaderTex('ÁO ĐẤU CLB', 'HOME / AWAY KITS', '#38bdf8');
  const jerseyHeaderMat = new THREE.MeshStandardMaterial({
    map: jerseyHeaderTex,
    emissive: 0xffffff,
    emissiveMap: jerseyHeaderTex,
    emissiveIntensity: 0.22,
    roughness: 0.42,
  });
  const jerseyHeader = new THREE.Mesh(new THREE.PlaneGeometry(10.0, 1.35), jerseyHeaderMat);
  jerseyHeader.rotation.y = -Math.PI / 2;
  jerseyHeader.position.set(-148.45, 4.4, 58.5);
  staticGroup.add(jerseyHeader);

  const jerseyRackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 16.0), darkSteelMat);
  jerseyRackFrame.position.set(-148.55, 1.5, 58.5);
  staticGroup.add(jerseyRackFrame);

  const kitColors = [0xdc2626, 0x1d4ed8, 0xf8fafc, 0x0284c7, 0xfacc15, 0x0f172a, 0x16a34a];
  [1.15, 2.35].forEach((ry, rowIdx) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 15.2, 8), galvSteelMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(-148.85, ry + 0.42, 58.5);
    staticGroup.add(rail);

    for (let jz = 51.4; jz <= 65.8; jz += 0.9) {
      const kCol = kitColors[(Math.round(jz) + rowIdx * 2) % kitColors.length];
      const kitMat = new THREE.MeshStandardMaterial({ color: kCol, roughness: 0.65 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.64, 0.44), kitMat);
      body.position.set(-148.85, ry, jz);
      staticGroup.add(body);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.68), kitMat);
      sleeve.position.set(-148.85, ry + 0.20, jz);
      staticGroup.add(sleeve);
    }
  });

  // Two Full-Kit Mannequins near front glass & jersey rack
  [
    { x: -150.4, z: 46.8, shirt: 0xdc2626, shorts: 0xf8fafc },
    { x: -150.4, z: 68.5, shirt: 0x0284c7, shorts: 0x0f172a },
  ].forEach((m) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.50, 0.24, 16), darkSteelMat);
    plinth.position.set(m.x, 0.12, m.z);
    staticGroup.add(plinth);
    const mShorts = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.34, 0.24),
      new THREE.MeshStandardMaterial({ color: m.shorts, roughness: 0.7 })
    );
    mShorts.position.set(m.x, 0.95, m.z);
    staticGroup.add(mShorts);
    const mShirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.54, 0.25),
      new THREE.MeshStandardMaterial({ color: m.shirt, roughness: 0.65 })
    );
    mShirt.position.set(m.x, 1.39, m.z);
    staticGroup.add(mShirt);
    const mLegs = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.54, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    mLegs.position.set(m.x, 0.51, m.z);
    staticGroup.add(mLegs);
  });

  // 3C. Center Pro-Shop Display Islands (Hero Giant Soccer Ball + Match Balls & Cones + GK Gloves)
  const soccerBallTex = createSoccerBallTex();
  const soccerBallMat = new THREE.MeshStandardMaterial({ map: soccerBallTex, roughness: 0.32 });

  // Island 1: Hero Giant Rotating Soccer Ball Plinth (X = -155.5, Z = 50.8)
  const heroPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.30, 1.05, 24), darkSteelMat);
  heroPlinth.position.set(shopCenterX, 0.525, 50.8);
  staticGroup.add(heroPlinth);
  const heroRing = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.05, 8, 24), emeraldGlowMat);
  heroRing.rotation.x = Math.PI / 2;
  heroRing.position.set(shopCenterX, 1.06, 50.8);
  staticGroup.add(heroRing);

  const heroBallMesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 24, 18), soccerBallMat);
  heroBallMesh.position.set(shopCenterX, 1.88, 50.8);
  heroBallMesh.userData.noMerge = true;
  staticGroup.add(heroBallMesh);

  // Island 2: Match Soccer Balls & Training Cones Stepped Table (X = -155.5, Z = 59.5)
  const ballTable = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 3.6), darkSteelMat);
  ballTable.position.set(shopCenterX, 0.425, 59.5);
  staticGroup.add(ballTable);
  const ballTop = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 3.7), warmTimberMat);
  ballTop.position.set(shopCenterX, 0.88, 59.5);
  staticGroup.add(ballTop);

  for (let bx = -1.0; bx <= 1.0; bx += 0.66) {
    for (let bz = -1.2; bz <= 1.2; bz += 0.8) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), soccerBallMat);
      ball.position.set(shopCenterX + bx, 1.09, 59.5 + bz);
      staticGroup.add(ball);
    }
  }
  // Training agility cones along table front
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
  [-1.0, -0.5, 0.0, 0.5, 1.0].forEach((cx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 10), coneMat);
    cone.position.set(shopCenterX + cx, 1.05, 57.95);
    staticGroup.add(cone);
  });

  // Island 3: Goalkeeper Gloves, Shin Guards & Ball Bags Stand (X = -155.5, Z = 67.2)
  const gkIsland = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.15, 2.2), darkSteelMat);
  gkIsland.position.set(shopCenterX, 0.575, 67.2);
  staticGroup.add(gkIsland);
  const gkTop = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 2.3), acrylicClearMat);
  gkTop.position.set(shopCenterX, 1.18, 67.2);
  staticGroup.add(gkTop);

  const gloveColors = [0x22c55e, 0xf97316, 0x38bdf8, 0xf8fafc, 0xef4444];
  gloveColors.forEach((gc, gi) => {
    const gx = shopCenterX - 1.1 + gi * 0.55;
    const gMat = new THREE.MeshStandardMaterial({ color: gc, roughness: 0.45 });
    const gL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.08), gMat);
    gL.position.set(gx - 0.09, 1.35, 66.85);
    staticGroup.add(gL);
    const gR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.08), gMat);
    gR.position.set(gx + 0.09, 1.35, 66.85);
    staticGroup.add(gR);
  });

  // 3D. Rear Checkout & Pitch Booking Counter (X = -155.5, Z = 73.8)
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.08, 0.90), darkSteelMat);
  counterBase.position.set(shopCenterX, 0.54, 73.8);
  staticGroup.add(counterBase);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.76, 0.08, 1.02), warmTimberMat);
  counterTop.position.set(shopCenterX, 1.12, 73.8);
  staticGroup.add(counterTop);
  const counterTrim = new THREE.Mesh(new THREE.BoxGeometry(5.64, 0.07, 0.94), emeraldGlowMat);
  counterTrim.position.set(shopCenterX, 0.54, 73.8);
  staticGroup.add(counterTrim);

  [-1.2, 1.2].forEach((mx) => {
    const mon = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.40, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.85 })
    );
    mon.position.set(shopCenterX + mx, 1.38, 73.8);
    staticGroup.add(mon);
  });

  // 3E. Wall-Mounted Framed Football Posters (8 User-Provided Posters inside Pro-Shop)
  const posterLoader = new THREE.TextureLoader();
  const posterMatteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  const posterMats: THREE.MeshStandardMaterial[] = [];

  const posterSpecs = [
    { url: '/assets/football-posters/poster1.jpg', x: -159.1, y: 3.55, z: 78.03, ry: Math.PI, w: 1.95, h: 2.44 },
    { url: '/assets/football-posters/poster2.jpg', x: -155.5, y: 3.55, z: 78.03, ry: Math.PI, w: 1.85, h: 2.62 },
    { url: '/assets/football-posters/poster3.jpg', x: -151.9, y: 3.55, z: 78.03, ry: Math.PI, w: 1.85, h: 2.62 },
    { url: '/assets/football-posters/poster4.jpg', x: -162.55, y: 3.15, z: 45.8, ry: Math.PI / 2, w: 1.80, h: 2.70 },
    { url: '/assets/football-posters/poster5.jpg', x: -162.55, y: 3.25, z: 74.2, ry: Math.PI / 2, w: 1.95, h: 2.60 },
    { url: '/assets/football-posters/poster6.jpg', x: -148.45, y: 3.30, z: 73.6, ry: -Math.PI / 2, w: 1.70, h: 3.02 },
    { url: '/assets/football-posters/poster7.jpg', x: -148.45, y: 3.25, z: 46.5, ry: -Math.PI / 2, w: 1.90, h: 2.66 },
    { url: '/assets/football-posters/poster8.jpg', x: -148.45, y: 3.25, z: 69.5, ry: -Math.PI / 2, w: 1.80, h: 2.70 },
  ];

  posterSpecs.forEach((ps) => {
    const posterGrp = new THREE.Group();
    posterGrp.userData.noMerge = true;
    posterGrp.position.set(ps.x, ps.y, ps.z);
    posterGrp.rotation.y = ps.ry;

    const outerFrame = new THREE.Mesh(
      new THREE.BoxGeometry(ps.w + 0.18, ps.h + 0.18, 0.05),
      darkSteelMat
    );
    posterGrp.add(outerFrame);

    const innerMatte = new THREE.Mesh(
      new THREE.BoxGeometry(ps.w + 0.06, ps.h + 0.06, 0.06),
      posterMatteMat
    );
    posterGrp.add(innerMatte);

    const tex = posterLoader.load(ps.url, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 8;
      loaded.minFilter = THREE.LinearMipmapLinearFilter;
      loaded.magFilter = THREE.LinearFilter;
      loaded.needsUpdate = true;
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const artMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.36,
      metalness: 0.04,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.14,
    });
    posterMats.push(artMat);

    const artPlane = new THREE.Mesh(new THREE.PlaneGeometry(ps.w, ps.h), artMat);
    artPlane.position.z = 0.036;
    posterGrp.add(artPlane);

    const lampBar = new THREE.Mesh(new THREE.BoxGeometry(ps.w * 0.56, 0.04, 0.14), darkSteelMat);
    lampBar.position.set(0, ps.h / 2 + 0.16, 0.07);
    posterGrp.add(lampBar);

    const lampStrip = new THREE.Mesh(new THREE.BoxGeometry(ps.w * 0.48, 0.02, 0.04), floodBulbMat);
    lampStrip.position.set(0, ps.h / 2 + 0.135, 0.10);
    posterGrp.add(lampStrip);

    staticGroup.add(posterGrp);
  });

  // =========================================================================
  // OPERATING HOURS AUTOMATION:
  // - Pro-Shop Showroom: 07:00 - 22:00 (closes at 10 PM)
  // - 2 Football Pitches + Central Mesh Gate: Open 24/7 (Mở xuyên đêm)
  // =========================================================================
  let wasOpen: boolean | null = null;
  let closingElapsed = 0;
  let doorOpenAmount = 0.0;
  let meshGateOpenAmount = 0.0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: RonFootballNpcController | null,
    isPlayerNearGate: boolean = false,
    isPlayerNearShopDoor: boolean = false
  ) => {
    const isShopOpen = isRonFootballOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isShopOpen) ||
      (!isShopOpen && (rawHour < 7.0 || rawHour >= 22.35) && wasOpen === false && closingElapsed === 0);

    if (isShopOpen) {
      closingElapsed = 0;
      const nextP = Math.max(0, shopShutter.progress - delta * 1.1);
      setShutterProgress(shopShutter, nextP);
      setShutterProgress(archShutter, nextP);
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(shopShutter, 1.0);
      setShutterProgress(archShutter, 1.0);
    } else {
      closingElapsed += delta;
      const canClose = closingElapsed >= 16.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.8) {
        const nextP = Math.min(1.0, shopShutter.progress + delta * 0.72);
        setShutterProgress(shopShutter, nextP);
        setShutterProgress(archShutter, nextP);
      }
    }
    wasOpen = isShopOpen;

    const litScale = 1 - shopShutter.progress;
    shopSignMat.emissiveIntensity = 0.36 * litScale;
    bootsHeaderMat.emissiveIntensity = 0.22 * litScale;
    jerseyHeaderMat.emissiveIntensity = 0.22 * litScale;
    emeraldGlowMat.emissiveIntensity = 0.92 * litScale;
    floodBulbMat.emissiveIntensity = 1.5 * litScale;
    for (let i = 0; i < posterMats.length; i++) {
      posterMats[i].emissiveIntensity = 0.14 * litScale;
    }

    // Double Hinged Chain-Link Mesh Gate: openable 24/7 whenever player approaches (pitches stay open overnight)
    const wantGateOpen = isPlayerNearGate || Boolean(npcController?.hasExitingNpcNearArenaGate());
    const targetGateOpen = wantGateOpen ? 1.0 : 0.0;
    meshGateOpenAmount = THREE.MathUtils.lerp(meshGateOpenAmount, targetGateOpen, Math.min(1, delta * 5.8));
    meshGateLeft.rotation.y = -meshGateOpenAmount * 1.48;
    meshGateRight.rotation.y = meshGateOpenAmount * 1.48;

    // Automatic Sliding Clear Glass Showroom Doors (open 07:00 - 22:00 or while Pro-Shop NPCs evacuate)
    const wantShopDoorOpen =
      (isShopOpen && (isPlayerNearShopDoor || Boolean(npcController?.hasNpcNearShopDoor()))) ||
      Boolean(npcController?.hasExitingNpcNearDoor());
    const targetDoor = wantShopDoorOpen ? 1.0 : 0.0;
    doorOpenAmount = THREE.MathUtils.lerp(doorOpenAmount, targetDoor, Math.min(1, delta * 5.5));
    doorLeft.position.x = -156.50 - doorOpenAmount * 1.88;
    doorRight.position.x = -154.50 + doorOpenAmount * 1.88;

    if (isShopOpen) {
      heroBallMesh.rotation.y += delta * 0.8;
    }
  };

  return {
    staticGroup,
    heroBallMesh,
    doorLeft,
    doorRight,
    neonMats,
    interiorPointLights,
    updateOperatingHours,
    getClosedFactor: () => shopShutter.progress,
    getGateOpenAmount: () => meshGateOpenAmount,
  };
}

// ==========================================
// NPC CONTROLLER (LIVE 2-PITCH FOOTBALL MATCHES + PRO-SHOP STAFF & SHOPPERS)
// ==========================================

interface FootballNpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  glbHandle?: GlbHumanHandle;
}

interface PitchPlayerActor {
  rig: FootballNpcRig;
  pitchCenterX: number;
  team: 'A' | 'B';
  role: 'gk' | 'field';
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  walkPhase: number;
  kickTimer: number;
}

interface PitchBallState {
  mesh: THREE.Mesh;
  pitchCenterX: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  cooldown: number;
}

interface ShopperActor {
  rig: FootballNpcRig;
  waypoints: THREE.Vector3[];
  wpIdx: number;
  pauseTimer: number;
  walkPhase: number;
  speed: number;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitPhaseRef?: { phase: number };
  exitDone?: boolean;
}

export class RonFootballNpcController {
  public readonly rootGroup = new THREE.Group();

  private players: Array<
    PitchPlayerActor & {
      exitPath?: THREE.Vector3[];
      exitWpRef?: { idx: number };
      exitPhaseRef?: { phase: number };
      exitDone?: boolean;
    }
  > = [];
  private balls: PitchBallState[] = [];
  private shoppers: ShopperActor[] = [];
  private staff: Array<{
    rig: FootballNpcRig;
    homePos: THREE.Vector3;
    baseYaw: number;
    phaseOffset: number;
    exitPath?: THREE.Vector3[];
    exitWpRef?: { idx: number };
    exitPhaseRef?: { phase: number };
    exitDone?: boolean;
  }> = [];

  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;
  private animTime = 0;

  constructor(helpers: RonFootballCharacterHelpers) {
    this.rootGroup.userData.noMerge = true;
    this.buildMatches(helpers);
    this.buildProShopNpcs(helpers);
  }

  private buildNpcRig(
    shirtHex: number,
    shortsHex: number,
    socksHex: number,
    hairHex: number,
    skinHex: string,
    helpers: RonFootballCharacterHelpers
  ): FootballNpcRig {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.65 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsHex, roughness: 0.72 });
    const socksMat = new THREE.MeshStandardMaterial({ color: socksHex, roughness: 0.72 });
    const cleatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 });

    const hipsGroup = new THREE.Group();
    hipsGroup.position.y = 0.84;
    group.add(hipsGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.54, 0.22), shirtMat);
    torso.position.y = 0.29;
    hipsGroup.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.62, 0);
    const faceTex = helpers.createFaceTexture('happy', skinHex);
    const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.25, 0.26, 0.24);
    headMesh.position.y = 0.14;
    headGroup.add(headMesh);

    const hairMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.09, 0.26),
      new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.82 })
    );
    hairMesh.position.set(0, 0.27, -0.01);
    headGroup.add(hairMesh);
    hipsGroup.add(headGroup);

    const buildArm = (ax: number) => {
      const p = new THREE.Group();
      p.position.set(ax, 0.52, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), shirtMat);
      sleeve.position.y = -0.11;
      p.add(sleeve);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.24, 0.095), skinMat);
      arm.position.y = -0.34;
      p.add(arm);
      hipsGroup.add(p);
      return p;
    };
    const leftArm = buildArm(-0.26);
    const rightArm = buildArm(0.26);

    const buildLeg = (lx: number) => {
      const hip = new THREE.Group();
      hip.position.set(lx, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.14), shortsMat);
      thigh.position.y = -0.18;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.36;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.40, 0.12), socksMat);
      shin.position.y = -0.20;
      knee.add(shin);
      const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), cleatMat);
      cleat.position.set(0, -0.43, 0.04);
      knee.add(cleat);
      hip.add(knee);
      hipsGroup.add(hip);
      return { hip, knee };
    };
    const lLeg = buildLeg(-0.10);
    const rLeg = buildLeg(0.10);

    return {
      group,
      hipsGroup,
      headGroup,
      leftArm,
      rightArm,
      leftLeg: lLeg.hip,
      rightLeg: rLeg.hip,
      leftKnee: lLeg.knee,
      rightKnee: rLeg.knee,
    };
  }

  private buildMatches(helpers: RonFootballCharacterHelpers) {
    const ballTex = createSoccerBallTex();
    const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.32 });

    const pitchSpecs = [
      { cx: -173.5, teamA: 0xdc2626, shortsA: 0x18181b, teamB: 0x0284c7, shortsB: 0xf8fafc },
      { cx: -196.5, teamA: 0xeab308, shortsA: 0x0f172a, teamB: 0x10b981, shortsB: 0xf8fafc },
    ];

    const skins = ['#fbd3b4', '#f6c8a8', '#e8be9e', '#fbd3b4'];
    const hairs = [0x111111, 0x2b1d0c, 0x451a03, 0x1e293b];

    pitchSpecs.forEach((p, pIdx) => {
      // Animated soccer ball on each pitch
      const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), ballMat);
      ballMesh.position.set(p.cx, 0.21, 62.5);
      this.rootGroup.add(ballMesh);
      this.balls.push({
        mesh: ballMesh,
        pitchCenterX: p.cx,
        x: p.cx,
        y: 0.21,
        z: 62.5,
        vx: (pIdx === 0 ? 1 : -1) * 4.2,
        vy: 0,
        vz: (pIdx === 0 ? -1 : 1) * 5.6,
        cooldown: 0,
      });

      const teamAHome: Array<{ dx: number; z: number; role: 'gk' | 'field' }> = [
        { dx: 0.0, z: 47.0, role: 'gk' },
        { dx: -4.2, z: 54.0, role: 'field' },
        { dx: 4.0, z: 56.5, role: 'field' },
        { dx: -0.6, z: 62.5, role: 'field' },
      ];
      const teamBHome: Array<{ dx: number; z: number; role: 'gk' | 'field' }> = [
        { dx: 0.0, z: 78.0, role: 'gk' },
        { dx: 4.2, z: 71.0, role: 'field' },
        { dx: -4.0, z: 68.5, role: 'field' },
        { dx: 0.8, z: 64.5, role: 'field' },
      ];

      teamAHome.forEach((slot, idx) => {
        const rig = this.buildNpcRig(
          slot.role === 'gk' ? 0xf97316 : p.teamA,
          p.shortsA,
          p.teamA,
          hairs[idx % hairs.length],
          skins[idx % skins.length],
          helpers
        );
        const hx = p.cx + slot.dx;
        rig.group.position.set(hx, 0.03, slot.z);
        this.rootGroup.add(rig.group);
        const specA = ADULT_NPC_MODELS[(idx + pIdx * 4) % ADULT_NPC_MODELS.length];
        rig.glbHandle = attachGlbHumanToNpc({
          modelSource: specA.modelSource,
          hostGroup: rig.group,
          fallbackMeshes: [rig.hipsGroup],
          targetHeight: specA.targetHeight,
          clipProfile: specA.clipProfile,
          rotationY: specA.rotationY,
          initialState: 'Walk',
          phaseOffset: idx * 0.9 + pIdx,
          allowRainUmbrella: false,
        });
        this.players.push({
          rig,
          pitchCenterX: p.cx,
          team: 'A',
          role: slot.role,
          homeX: hx,
          homeZ: slot.z,
          x: hx,
          z: slot.z,
          vx: 0,
          vz: 0,
          walkPhase: idx * 1.3 + pIdx,
          kickTimer: 0,
        });
      });

      teamBHome.forEach((slot, idx) => {
        const rig = this.buildNpcRig(
          slot.role === 'gk' ? 0xa855f7 : p.teamB,
          p.shortsB,
          p.teamB,
          hairs[(idx + 2) % hairs.length],
          skins[(idx + 1) % skins.length],
          helpers
        );
        const hx = p.cx + slot.dx;
        rig.group.position.set(hx, 0.03, slot.z);
        rig.group.rotation.y = Math.PI;
        this.rootGroup.add(rig.group);
        const specB = ADULT_NPC_MODELS[(idx + 5 + pIdx * 4) % ADULT_NPC_MODELS.length];
        rig.glbHandle = attachGlbHumanToNpc({
          modelSource: specB.modelSource,
          hostGroup: rig.group,
          fallbackMeshes: [rig.hipsGroup],
          targetHeight: specB.targetHeight,
          clipProfile: specB.clipProfile,
          rotationY: specB.rotationY,
          initialState: 'Walk',
          phaseOffset: idx * 1.1 + pIdx,
          allowRainUmbrella: false,
        });
        this.players.push({
          rig,
          pitchCenterX: p.cx,
          team: 'B',
          role: slot.role,
          homeX: hx,
          homeZ: slot.z,
          x: hx,
          z: slot.z,
          vx: 0,
          vz: 0,
          walkPhase: idx * 1.6 + 2.0 + pIdx,
          kickTimer: 0,
        });
      });
    });
  }

  private buildProShopNpcs(helpers: RonFootballCharacterHelpers) {
    // 1. Pro-Shop Clerk behind counter (X = -155.5, Z = 75.3)
    const clerk = this.buildNpcRig(0x16a34a, 0x0f172a, 0x16a34a, 0x111111, '#fbd3b4', helpers);
    clerk.group.position.set(-155.5, 0.05, 75.3);
    clerk.group.rotation.y = Math.PI;
    this.rootGroup.add(clerk.group);
    clerk.glbHandle = attachGlbHumanToNpc({
      modelSource: CASHIER_NPC_MODEL.modelSource,
      hostGroup: clerk.group,
      fallbackMeshes: [clerk.hipsGroup],
      targetHeight: CASHIER_NPC_MODEL.targetHeight,
      clipProfile: CASHIER_NPC_MODEL.clipProfile,
      initialState: 'Idle',
      phaseOffset: 0.4,
    });
    this.staff.push({
      rig: clerk,
      homePos: clerk.group.position.clone(),
      baseYaw: Math.PI,
      phaseOffset: 0.6,
    });

    // 3 Browsing Shoppers in Pro-Shop + walking out through Pitch Archway
    const shopperSpecs = [
      {
        shirt: 0x3b82f6,
        shorts: 0x1e293b,
        hair: 0x2b1d0c,
        skin: '#f6c8a8',
        speed: 1.45,
        route: [
          new THREE.Vector3(-155.5, 0.05, 44.5),
          new THREE.Vector3(-159.5, 0.05, 57.5),
          new THREE.Vector3(-160.2, 0.05, 67.5),
          new THREE.Vector3(-155.5, 0.05, 72.2),
          new THREE.Vector3(-151.0, 0.05, 64.0),
          new THREE.Vector3(-151.5, 0.05, 50.0),
        ],
      },
      {
        shirt: 0xf59e0b,
        shorts: 0x334155,
        hair: 0x111111,
        skin: '#fbd3b4',
        speed: 1.38,
        route: [
          new THREE.Vector3(-151.2, 0.05, 56.0),
          new THREE.Vector3(-151.0, 0.05, 68.0),
          new THREE.Vector3(-159.2, 0.05, 69.5),
          new THREE.Vector3(-159.2, 0.05, 59.0),
          new THREE.Vector3(-155.5, 0.05, 47.0),
        ],
      },
      {
        shirt: 0xec4899,
        shorts: 0x0f172a,
        hair: 0x451a03,
        skin: '#e8be9e',
        speed: 1.5,
        route: [
          new THREE.Vector3(-155.5, 0.05, 40.5),
          new THREE.Vector3(-155.5, 0.05, 48.0),
          new THREE.Vector3(-159.8, 0.05, 51.0),
          new THREE.Vector3(-165.0, 0.03, 51.0),
          new THREE.Vector3(-159.8, 0.05, 51.0),
          new THREE.Vector3(-155.5, 0.05, 40.5),
        ],
      },
    ];

    shopperSpecs.forEach((sp, idx) => {
      const rig = this.buildNpcRig(sp.shirt, sp.shorts, sp.shirt, sp.hair, sp.skin, helpers);
      rig.group.position.copy(sp.route[0]);
      this.rootGroup.add(rig.group);
      const spec = pickShopCustomerModel(idx * 3 + 1);
      rig.glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: rig.group,
        fallbackMeshes: [rig.hipsGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Walk',
        phaseOffset: idx * 0.85,
      });
      this.shoppers.push({
        rig,
        waypoints: sp.route,
        wpIdx: 1,
        pauseTimer: 0.6 + idx * 0.8,
        walkPhase: idx * 1.4,
        speed: sp.speed,
      });
    });
  }

  private resetStandingPose(rig: FootballNpcRig) {
    rig.hipsGroup.position.y = 0.84;
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftKnee.rotation.x = 0;
    rig.rightKnee.rotation.x = 0;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;

    // Only Pro-Shop staff & shoppers evacuate at 22:00 — Football Pitch players play 24/7 overnight!
    for (const s of this.staff) {
      s.rig.group.visible = true;
      s.rig.glbHandle?.setAnimState('Walk', 1.25);
      s.exitPath = [
        new THREE.Vector3(-155.5, 0.05, 72.0),
        new THREE.Vector3(-155.5, 0.05, 44.5),
        new THREE.Vector3(-155.5, 0.0, 40.2),
        new THREE.Vector3(-148.0, 0.0, 39.8),
      ];
      s.exitWpRef = { idx: 0 };
      s.exitPhaseRef = { phase: s.phaseOffset };
      s.exitDone = false;
    }

    for (const sh of this.shoppers) {
      sh.rig.group.visible = true;
      sh.rig.glbHandle?.setAnimState('Walk', 1.25);
      sh.exitPath = [
        new THREE.Vector3(-155.5, 0.05, 44.5),
        new THREE.Vector3(-155.5, 0.0, 40.2),
        new THREE.Vector3(-164.0, 0.0, 39.8),
      ];
      sh.exitWpRef = { idx: 0 };
      sh.exitPhaseRef = { phase: sh.walkPhase };
      sh.exitDone = false;
    }
  }

  private hideShopNpcsImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (const s of this.staff) {
      s.rig.group.visible = false;
      s.exitDone = true;
    }
    for (const sh of this.shoppers) {
      sh.rig.group.visible = false;
      sh.exitDone = true;
    }
  }

  private restoreShopForOpen() {
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;

    for (const s of this.staff) {
      this.resetStandingPose(s.rig);
      s.rig.group.position.copy(s.homePos);
      s.rig.group.rotation.y = s.baseYaw;
      s.rig.group.visible = true;
      s.rig.glbHandle?.setAnimState('Idle');
      s.exitDone = false;
    }
    for (const sh of this.shoppers) {
      this.resetStandingPose(sh.rig);
      sh.wpIdx = 1;
      sh.rig.group.position.copy(sh.waypoints[0]);
      sh.rig.group.visible = true;
      sh.rig.glbHandle?.setAnimState('Walk');
      sh.exitDone = false;
    }
  }

  public hasExitingNpcNearDoor(): boolean {
    if (!this.isOpenState && !this.closingActive) return false;
    for (const sh of this.shoppers) {
      if (sh.rig.group.visible && Math.abs(sh.rig.group.position.x - -155.5) < 2.5 && sh.rig.group.position.z < 46.5) {
        return true;
      }
    }
    if (this.closingActive) {
      for (const s of this.staff) {
        if (s.rig.group.visible && s.rig.group.position.z < 46.5) return true;
      }
    }
    return false;
  }

  public hasNpcNearShopDoor(): boolean {
    for (const sh of this.shoppers) {
      if (
        sh.rig.group.visible &&
        Math.abs(sh.rig.group.position.x - -155.5) < 2.6 &&
        sh.rig.group.position.z >= 39.0 &&
        sh.rig.group.position.z <= 46.5
      ) {
        return true;
      }
    }
    return false;
  }

  public hasExitingNpcNearArenaGate(): boolean {
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number) {
    const isShopOpen = isRonFootballOpenAtHour(rawHour);

    if (this.isOpenState === null) {
      this.isOpenState = isShopOpen;
      if (!isShopOpen) {
        this.hideShopNpcsImmediate();
      }
    } else if (this.isOpenState && !isShopOpen) {
      this.isOpenState = false;
      if (rawHour >= 22.0 && rawHour < 22.35) {
        this.beginClosingEvacuation();
      } else {
        this.hideShopNpcsImmediate();
      }
    } else if (!this.isOpenState && isShopOpen) {
      this.isOpenState = true;
      this.restoreShopForOpen();
    }

    const dt = Math.min(delta, 0.05);
    this.animTime += dt;

    if (!isShopOpen && this.closingActive) {
      this.closingTimer += dt;
      let anyRemaining = false;

      const stepExit = (actor: {
        rig: FootballNpcRig;
        exitPath?: THREE.Vector3[];
        exitWpRef?: { idx: number };
        exitPhaseRef?: { phase: number };
        exitDone?: boolean;
      }) => {
        if (actor.exitDone || !actor.rig.group.visible) return;
        if (!actor.exitPath || !actor.exitWpRef || !actor.exitPhaseRef) {
          actor.rig.group.visible = false;
          actor.exitDone = true;
          return;
        }
        const done = advanceNpcExitPath(
          actor.rig.group,
          actor.exitPath,
          actor.exitWpRef,
          2.6,
          dt,
          {
            legL: actor.rig.leftLeg,
            legR: actor.rig.rightLeg,
            armL: actor.rig.leftArm,
            armR: actor.rig.rightArm,
          },
          actor.exitPhaseRef
        );
        if (done) {
          actor.rig.group.visible = false;
          actor.exitDone = true;
        } else {
          anyRemaining = true;
        }
      };

      for (const s of this.staff) stepExit(s);
      for (const sh of this.shoppers) stepExit(sh);

      if (!anyRemaining || this.closingTimer >= 22.0) {
        this.hideShopNpcsImmediate();
      }
    }

    const nowSec = this.animTime;
    const limbSmooth = Math.min(1, dt * 14.0);

    // 1. Update Match Balls & 2 Smooth Live 4v4 Pitch Matches (Zero stuttering)
    for (let bIdx = 0; bIdx < this.balls.length; bIdx++) {
      const b = this.balls[bIdx];
      b.cooldown = Math.max(0, b.cooldown - dt);

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.vy -= 14.0 * dt;
      b.y += b.vy * dt;
      if (b.y < 0.21) {
        b.y = 0.21;
        b.vy = Math.abs(b.vy) > 1.2 ? Math.abs(b.vy) * 0.45 : 0;
      }

      // Grass friction
      const drag = Math.exp(-0.78 * dt);
      b.vx *= drag;
      b.vz *= drag;

      // Pitch boundaries & goal bounce
      const minX = b.pitchCenterX - 8.0;
      const maxX = b.pitchCenterX + 8.0;
      if (b.x < minX) {
        b.x = minX;
        b.vx = Math.abs(b.vx) + 1.8;
      } else if (b.x > maxX) {
        b.x = maxX;
        b.vx = -Math.abs(b.vx) - 1.8;
      }

      if (b.z < 46.5) {
        b.z = 46.5;
        b.vz = Math.abs(b.vz) + 2.4;
      } else if (b.z > 78.5) {
        b.z = 78.5;
        b.vz = -Math.abs(b.vz) - 2.4;
      }

      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.x += b.vz * dt * 2.2;
      b.mesh.rotation.z -= b.vx * dt * 2.2;

      // Pick closest outfield chaser per team so both teams actively challenge the ball
      let chaserA: PitchPlayerActor | null = null;
      let chaserB: PitchPlayerActor | null = null;
      let bestDistA = 1e9;
      let bestDistB = 1e9;
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.pitchCenterX !== b.pitchCenterX || p.role !== 'field') continue;
        const dSq = (p.x - b.x) ** 2 + (p.z - b.z) ** 2;
        if (p.team === 'A' && dSq < bestDistA) {
          bestDistA = dSq;
          chaserA = p;
        } else if (p.team === 'B' && dSq < bestDistB) {
          bestDistB = dSq;
          chaserB = p;
        }
      }

      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.pitchCenterX !== b.pitchCenterX) continue;
        p.kickTimer = Math.max(0, p.kickTimer - dt);

        const isChaser = p === chaserA || p === chaserB;
        let tx = p.homeX;
        let tz = p.homeZ;
        if (p.role === 'gk') {
          tx = THREE.MathUtils.clamp(b.x, p.pitchCenterX - 1.5, p.pitchCenterX + 1.5) + Math.sin(nowSec * 1.9 + i) * 0.45;
          tz = p.homeZ + Math.cos(nowSec * 1.5 + i) * 0.35;
        } else if (isChaser) {
          // Slight lateral offset between Team A & Team B chasers so they don't overlap on the ball
          const offsetSide = p.team === 'A' ? -0.22 : 0.22;
          tx = b.x + offsetSide;
          tz = b.z;
        } else {
          // Continuous smooth off-ball tactical runs so players never freeze into statues
          const runX = Math.sin(nowSec * 1.35 + i * 1.9) * 1.9;
          const runZ = Math.cos(nowSec * 1.05 + i * 2.3) * 2.4;
          tx = THREE.MathUtils.clamp(p.homeX + (b.x - p.pitchCenterX) * 0.35 + runX, p.pitchCenterX - 7.4, p.pitchCenterX + 7.4);
          tz = THREE.MathUtils.clamp(p.homeZ + (b.z - 62.5) * 0.36 + runZ, 48.2, 76.8);
        }

        const dx = tx - p.x;
        const dz = tz - p.z;
        const dist = Math.hypot(dx, dz);
        const maxSpd = isChaser ? 4.4 : p.role === 'gk' ? 2.4 : 2.85;

        // Smooth velocity steering instead of binary stop/go snapping
        const desiredVx = dist > 0.08 ? (dx / dist) * Math.min(maxSpd, dist * 3.8) : 0;
        const desiredVz = dist > 0.08 ? (dz / dist) * Math.min(maxSpd, dist * 3.8) : 0;
        const steerAlpha = Math.min(1, dt * 8.5);
        p.vx = THREE.MathUtils.lerp(p.vx, desiredVx, steerAlpha);
        p.vz = THREE.MathUtils.lerp(p.vz, desiredVz, steerAlpha);

        p.x = THREE.MathUtils.clamp(p.x + p.vx * dt, p.pitchCenterX - 8.2, p.pitchCenterX + 8.2);
        p.z = THREE.MathUtils.clamp(p.z + p.vz * dt, 46.2, 78.8);

        const moveSpd = Math.hypot(p.vx, p.vz);
        const targetYaw = moveSpd > 0.45 ? Math.atan2(p.vx, p.vz) : Math.atan2(b.x - p.x, b.z - p.z);
        let diff = targetYaw - p.rig.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.rig.group.rotation.y += diff * Math.min(1, dt * 9.0);

        const strideAmp = THREE.MathUtils.clamp(moveSpd / 3.8, 0.12, 1.0);
        p.walkPhase += dt * (2.6 + moveSpd * 3.1);
        const swing = Math.sin(p.walkPhase) * 0.62 * strideAmp;

        const targetLLeg = swing;
        let targetRLeg = -swing;
        if (p.kickTimer > 0) {
          targetRLeg = -Math.sin(Math.PI * (p.kickTimer / 0.28)) * 0.95;
        }

        p.rig.leftLeg.rotation.x = THREE.MathUtils.lerp(p.rig.leftLeg.rotation.x, targetLLeg, limbSmooth);
        p.rig.rightLeg.rotation.x = THREE.MathUtils.lerp(p.rig.rightLeg.rotation.x, targetRLeg, limbSmooth);
        p.rig.leftKnee.rotation.x = THREE.MathUtils.lerp(p.rig.leftKnee.rotation.x, Math.max(0, -targetLLeg * 0.7), limbSmooth);
        p.rig.rightKnee.rotation.x = THREE.MathUtils.lerp(p.rig.rightKnee.rotation.x, Math.max(0, targetRLeg * 0.7), limbSmooth);
        p.rig.leftArm.rotation.x = THREE.MathUtils.lerp(p.rig.leftArm.rotation.x, -swing * 0.65, limbSmooth);
        p.rig.rightArm.rotation.x = THREE.MathUtils.lerp(p.rig.rightArm.rotation.x, swing * 0.65, limbSmooth);
        p.rig.hipsGroup.position.y = THREE.MathUtils.lerp(
          p.rig.hipsGroup.position.y,
          0.84 + Math.abs(Math.cos(p.walkPhase)) * 0.045 * strideAmp,
          limbSmooth
        );

        // Kick the ball toward opponent goal / teammate when close
        const ballDist = Math.hypot(p.x - b.x, p.z - b.z);
        if (ballDist < 0.88 && b.cooldown <= 0) {
          const goalZ = p.team === 'A' ? 78.6 : 46.4;
          const aimX = p.pitchCenterX + Math.sin(nowSec * 3.1 + i * 2.3) * 5.2;
          const kdx = aimX - b.x;
          const kdz = goalZ - b.z;
          const kd = Math.max(0.1, Math.hypot(kdx, kdz));
          const kickPower = p.role === 'gk' ? 11.5 : 8.5 + (i % 3) * 1.4;
          b.vx = (kdx / kd) * kickPower;
          b.vz = (kdz / kd) * kickPower;
          b.vy = 2.6 + (i % 2) * 1.1;
          b.cooldown = 0.42;
          p.kickTimer = 0.28;
        }

        p.rig.group.position.set(p.x, 0.03, p.z);
        if (moveSpd > 0.35) {
          p.rig.glbHandle?.setAnimState('Walk', THREE.MathUtils.clamp(moveSpd / 2.2, 0.75, 1.55));
        } else {
          p.rig.glbHandle?.setAnimState('Idle');
        }
      }
    }

    if (isShopOpen) {
      // 2. Pro-Shop Staff Idle Animation
      for (const s of this.staff) {
        s.rig.glbHandle?.setAnimState('Idle');
        s.rig.headGroup.rotation.y = Math.sin(nowSec * 1.1 + s.phaseOffset) * 0.28;
        s.rig.rightArm.rotation.x = -0.25 + Math.sin(nowSec * 2.1 + s.phaseOffset) * 0.1;
      }

      // 3. Browsing Shoppers Walking Through Pro-Shop & Pitch Archway
      for (let i = 0; i < this.shoppers.length; i++) {
        const sh = this.shoppers[i];
        if (sh.pauseTimer > 0) {
          sh.pauseTimer -= dt;
          sh.rig.glbHandle?.setAnimState('Idle');
          sh.rig.leftLeg.rotation.x = THREE.MathUtils.lerp(sh.rig.leftLeg.rotation.x, 0, limbSmooth);
          sh.rig.rightLeg.rotation.x = THREE.MathUtils.lerp(sh.rig.rightLeg.rotation.x, 0, limbSmooth);
          sh.rig.leftArm.rotation.x = THREE.MathUtils.lerp(sh.rig.leftArm.rotation.x, 0, limbSmooth);
          sh.rig.rightArm.rotation.x = THREE.MathUtils.lerp(sh.rig.rightArm.rotation.x, 0, limbSmooth);
          sh.rig.headGroup.rotation.y = Math.sin(nowSec * 1.4 + i) * 0.28;
          continue;
        }

        sh.rig.glbHandle?.setAnimState('Walk');
        const target = sh.waypoints[sh.wpIdx];
        const pos = sh.rig.group.position;
        const dx = target.x - pos.x;
        const dz = target.z - pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.14) {
          pos.copy(target);
          sh.pauseTimer = 1.6 + (i % 2) * 1.1;
          sh.wpIdx = (sh.wpIdx + 1) % sh.waypoints.length;
          continue;
        }

        const step = Math.min(dist, sh.speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        pos.y = target.y;

        const yaw = Math.atan2(dx, dz);
        let diff = yaw - sh.rig.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        sh.rig.group.rotation.y += diff * Math.min(1, dt * 8);

        sh.walkPhase += dt * 7.2;
        const swing = Math.sin(sh.walkPhase) * 0.44;
        sh.rig.leftLeg.rotation.x = swing;
        sh.rig.rightLeg.rotation.x = -swing;
        sh.rig.leftArm.rotation.x = -swing * 0.6;
        sh.rig.rightArm.rotation.x = swing * 0.6;
      }
    }
  }
}
