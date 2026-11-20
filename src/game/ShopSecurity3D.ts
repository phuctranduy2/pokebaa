import * as THREE from 'three';
import { SecurityAlertEvent } from './shopExpansionSystems';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { GUARD_NPC_MODEL } from './NpcModelCatalog';

export interface SecurityNpcHelperDeps {
  createFaceTexture: (variant: string, skinHex: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    w: number,
    h: number,
    d: number
  ) => THREE.Object3D;
  onGuardSubdueThief?: () => void;
}

type ThiefPhase =
  | 'hidden'
  | 'sneaking_in'
  | 'stealing_at_target'
  | 'caught_surrender'
  | 'fleeing_out';

type GuardPhase = 'patrol_post' | 'chasing_thief' | 'arresting' | 'returning_post';

const _tempVecA = new THREE.Vector3();
const _tempVecB = new THREE.Vector3();

function createSecurityQuadTexture(alertActive: boolean, securityLevel: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = alertActive ? '#14060d' : '#050b16';
  ctx.fillRect(0, 0, 1024, 576);

  // Header bar
  const hdrGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  if (alertActive) {
    hdrGrad.addColorStop(0, '#9f1239');
    hdrGrad.addColorStop(0.5, '#e11d48');
    hdrGrad.addColorStop(1, '#9f1239');
  } else {
    hdrGrad.addColorStop(0, '#0c4a6e');
    hdrGrad.addColorStop(0.5, '#0284c7');
    hdrGrad.addColorStop(1, '#0c4a6e');
  }
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(0, 0, 1024, 54);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px system-ui, sans-serif';
  ctx.fillText(
    alertActive
      ? '🚨 CẢNH BÁO AN NINH: PHÁT HIỆN XÂM NHẬP / TRÁO SLAB!'
      : `🛡️ POKEVAULT AI SECURITY • CẤP ${securityLevel}/2 • LIVE 360°`,
    22,
    35
  );

  // Status pill on top right
  ctx.fillStyle = alertActive ? '#fef08a' : '#10b981';
  ctx.beginPath();
  ctx.roundRect(844, 11, 160, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#09090b';
  ctx.font = '900 16px monospace';
  ctx.fillText(alertActive ? '● LOCKDOWN' : '● ARMED 24/7', 862, 33);

  // 4 CCTV Camera Feeds
  const feeds = [
    { label: 'CAM 01 · CỔNG VÀO EAS', sub: 'GATE 1-2 · RFID ACTIVE', scene: 'gate' },
    { label: 'CAM 02 · TỦ SLAB VIP', sub: 'PSA / BGS VAULT WATCH', scene: 'slab' },
    { label: 'CAM 03 · KỆ BOOSTER BOX', sub: 'AISLE A-C MOTION AI', scene: 'shelf' },
    { label: 'CAM 04 · QUẦY THU NGÂN', sub: 'POS & SAFE MONITORING', scene: 'pos' },
  ];

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 18 + col * 500;
    const y = 70 + row * 246;
    const w = 488;
    const h = 232;

    ctx.fillStyle = alertActive ? '#1c0a12' : '#081426';
    ctx.fillRect(x, y, w, h);

    // Subtle schematic shop interior silhouette inside each feed
    ctx.strokeStyle = alertActive ? 'rgba(251, 113, 133, 0.25)' : 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Perspective floor grid lines
    ctx.moveTo(x + 20, y + h - 22);
    ctx.lineTo(x + w / 2 - 40, y + 66);
    ctx.moveTo(x + w - 20, y + h - 22);
    ctx.lineTo(x + w / 2 + 40, y + 66);
    ctx.strokeRect(x + w / 2 - 80, y + 66, 160, 92);
    ctx.stroke();

    // Target bounding box highlight
    if (alertActive && (i === 0 || i === 1)) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 178, y + 74, 132, 96);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.fillRect(x + 178, y + 74, 132, 96);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('TARGET LOCKED 99.4%', x + 184, y + 66);
    } else {
      // Crosshair reticle
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2 + 10, 26, 0, Math.PI * 2);
      ctx.moveTo(x + w / 2 - 36, y + h / 2 + 10);
      ctx.lineTo(x + w / 2 + 36, y + h / 2 + 10);
      ctx.moveTo(x + w / 2, y + h / 2 - 26);
      ctx.lineTo(x + w / 2, y + h / 2 + 46);
      ctx.stroke();
    }

    // Scanlines
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let sy = y + 8; sy < y + h - 6; sy += 7) {
      ctx.fillRect(x + 2, sy, w - 4, 2);
    }

    // Frame border
    ctx.strokeStyle = alertActive ? '#f43f5e' : '#0ea5e9';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Feed HUD labels
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(x + 8, y + 8, 270, 30);
    ctx.fillStyle = alertActive ? '#fda4af' : '#bae6fd';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(feeds[i].label, x + 16, y + 29);

    ctx.fillStyle = alertActive ? '#fb7185' : '#34d399';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(alertActive ? '● REC ALARM' : '● LIVE AI', x + 14, y + h - 14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(feeds[i].sub, x + 180, y + h - 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSideWingTexture(
  side: 'radar' | 'biometric',
  alertActive: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = alertActive ? '#17070e' : '#060e1c';
  ctx.fillRect(0, 0, 512, 384);

  ctx.strokeStyle = alertActive ? '#f43f5e' : '#06b6d4';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 372);

  ctx.fillStyle = alertActive ? '#be123c' : '#0e7490';
  ctx.fillRect(6, 6, 500, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';

  if (side === 'radar') {
    ctx.fillText('RADAR CỬA & CỔNG RFID', 20, 34);

    // Radar concentric rings
    const cx = 256;
    const cy = 205;
    ctx.strokeStyle = alertActive ? 'rgba(244,63,94,0.55)' : 'rgba(34,211,238,0.45)';
    ctx.lineWidth = 2;
    for (const r of [42, 82, 122]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 130, cy);
    ctx.lineTo(cx + 130, cy);
    ctx.moveTo(cx, cy - 130);
    ctx.lineTo(cx, cy + 130);
    ctx.stroke();

    // Gate markers
    ctx.fillStyle = alertActive ? '#fb7185' : '#34d399';
    ctx.fillRect(cx - 48, cy + 72, 18, 28);
    ctx.fillRect(cx + 30, cy + 72, 18, 28);

    if (alertActive) {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx + 18, cy - 26, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = alertActive ? '#fda4af' : '#67e8f9';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(alertActive ? 'EAS GATE: BREACH!' : 'EAS GATE: ARMED', 22, 360);
    ctx.fillText('RANGE: 360°', 370, 360);
  } else {
    ctx.fillText('AN NINH SLAB & HOTLINE 113', 20, 34);

    const rows = [
      { label: 'KHÓA KÍNH TỦ SLAB', val: alertActive ? 'TAMPER!' : 'LOCKED', ok: !alertActive },
      { label: 'CẢM BIẾN TRỌNG LƯỢNG', val: alertActive ? 'ALERT' : 'STABLE', ok: !alertActive },
      { label: 'NHẬN DIỆN KHUÔN MẶT', val: alertActive ? 'SUSPECT' : '99.4% OK', ok: !alertActive },
      { label: 'KẾT NỐI ĐỒN CÔNG AN 113', val: 'ONLINE', ok: true },
    ];

    rows.forEach((r, idx) => {
      const ry = 74 + idx * 70;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(22, ry, 468, 54);
      ctx.strokeStyle = r.ok ? '#0284c7' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.strokeRect(22, ry, 468, 54);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(r.label, 36, ry + 33);

      ctx.fillStyle = r.ok ? '#34d399' : '#fb7185';
      ctx.font = 'bold 17px monospace';
      ctx.fillText(r.val, 355, ry + 33);
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKioskPlaqueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09111e';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 176);

  // Shield emblem
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.moveTo(76, 42);
  ctx.lineTo(114, 56);
  ctx.lineTo(106, 118);
  ctx.lineTo(76, 146);
  ctx.lineTo(46, 118);
  ctx.lineTo(38, 56);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#facc15';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('AI', 62, 102);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('POKEVAULT SECURITY', 136, 78);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('CCTV 24/7 • CHỐNG TRỘM RFID', 136, 114);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('● HỆ THỐNG ĐANG HOẠT ĐỘNG', 136, 146);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createEasHeaderTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 250, 58);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RFID SECURED', 128, 30);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('AI ANTI-THEFT GATE', 128, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class ShopSecurity3DController {
  public readonly rootGroup = new THREE.Group();

  private deps: SecurityNpcHelperDeps;
  private securityLevel: number = 0;
  private isShopOpen: boolean = true;
  private isStaffOnShift: boolean = true;

  // Hardware groups
  private easGatesGroup = new THREE.Group();
  private gateLedMats: THREE.MeshStandardMaterial[] = [];
  private gateBeaconMats: THREE.MeshStandardMaterial[] = [];
  private easHeaderTex: THREE.CanvasTexture | null = null;

  private cctvGroup = new THREE.Group();
  private cctvRigs: Array<{
    yawPivot: THREE.Group;
    pitchPivot: THREE.Group;
    ledMat: THREE.MeshStandardMaterial;
    baseYaw: number;
    phaseOffset: number;
    worldPos: THREE.Vector3;
  }> = [];

  private guardStationGroup = new THREE.Group();
  private consoleMainScreenMat: THREE.MeshBasicMaterial | null = null;
  private consoleLeftScreenMat: THREE.MeshBasicMaterial | null = null;
  private consoleRightScreenMat: THREE.MeshBasicMaterial | null = null;
  private consoleQuadNormalTex: THREE.CanvasTexture | null = null;
  private consoleQuadAlertTex: THREE.CanvasTexture | null = null;
  private consoleRadarNormalTex: THREE.CanvasTexture | null = null;
  private consoleRadarAlertTex: THREE.CanvasTexture | null = null;
  private consoleBioNormalTex: THREE.CanvasTexture | null = null;
  private consoleBioAlertTex: THREE.CanvasTexture | null = null;
  private kioskPlaqueTex: THREE.CanvasTexture | null = null;
  private kioskAccentLedMat: THREE.MeshStandardMaterial | null = null;
  private radarSweepHand: THREE.Mesh | null = null;

  // 3D Security Guard NPC (GLB guard_officer + procedural fallback)
  private guardGroup = new THREE.Group();
  private guardFallbackGroup = new THREE.Group();
  private guardGlbHandle: GlbHumanHandle | null = null;
  private guardLeftLeg = new THREE.Group();
  private guardRightLeg = new THREE.Group();
  private guardLeftArm = new THREE.Group();
  private guardRightArm = new THREE.Group();
  private guardHead = new THREE.Group();
  private guardPhase: GuardPhase = 'patrol_post';
  private guardWalkPhase: number = 0;
  private guardArrestTimer: number = 0;
  private guardStrikeTimer: number = 0;
  private guardStunSparkMesh: THREE.Mesh | null = null;
  // Positioned standing outside right beside the storefront entrance on the sidewalk porch (clear of planter & doorway traffic)
  private readonly guardPostPos = new THREE.Vector3(2.25, 0, 16.35);
  private readonly guardPostYaw = -0.32;

  // 3D Shoplifter / Slab Swapper NPC (GLB stealth + procedural fallback)
  private thiefGroup = new THREE.Group();
  private thiefFallbackGroup = new THREE.Group();
  private thiefGlbHandle: GlbHumanHandle | null = null;
  private thiefLeftLeg = new THREE.Group();
  private thiefRightLeg = new THREE.Group();
  private thiefLeftArm = new THREE.Group();
  private thiefRightArm = new THREE.Group();
  private thiefTorso = new THREE.Group();
  private thiefHead = new THREE.Group();
  private thiefBagMesh: THREE.Mesh | null = null;
  private thiefFakeSlabGroup: THREE.Group | null = null;
  private thiefBeaconGroup = new THREE.Group();
  private thiefFloorRing: THREE.Mesh | null = null;
  private thiefFloorRingMat: THREE.MeshBasicMaterial | null = null;
  private thiefHitboxMesh: THREE.Mesh | null = null;

  private thiefPhase: ThiefPhase = 'hidden';
  private thiefWaypoints: THREE.Vector3[] = [];
  private thiefWaypointIdx: number = 0;
  private thiefWalkPhase: number = 0;
  private thiefActionTimer: number = 0;
  private activeAlertId: string | null = null;
  private activeIncidentType: 'shoplifter' | 'slab_swapper' = 'shoplifter';
  private alarmPulseTimer: number = 0;
  private autoCatchBannerTimer: number = 0;

  constructor(deps: SecurityNpcHelperDeps) {
    this.deps = deps;
    this.buildEasSecurityGates();
    this.buildCctvCameras();
    this.buildGuardStation();
    this.buildSecurityGuardNpc();
    this.buildThiefNpc();
    this.applyVisibility();
  }

  private buildEasSecurityGates() {
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
    const brushedAluminumMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.88,
    });
    const acrylicMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.7 });
    this.easHeaderTex = createEasHeaderTexture();
    const headerPlaqueMat = new THREE.MeshBasicMaterial({ map: this.easHeaderTex });

    for (const xPos of [-1.92, 1.92]) {
      const gate = new THREE.Group();
      gate.position.set(xPos, 0, 14.2);

      // Sleek stepped dark titanium plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.54), obsidianMat);
      plinth.position.set(0, 0.025, 0);
      gate.add(plinth);

      const trimCollar = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.48), brushedAluminumMat);
      trimCollar.position.set(0, 0.065, 0);
      gate.add(trimCollar);

      // Twin sculpted brushed-aluminum pillars
      const postFront = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 1.62, 16), brushedAluminumMat);
      postFront.position.set(0, 0.88, 0.19);
      gate.add(postFront);

      const postBack = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 1.62, 16), brushedAluminumMat);
      postBack.position.set(0, 0.88, -0.19);
      gate.add(postBack);

      // Crystal acrylic RFID scanner blade
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.022, 1.48, 0.34), acrylicMat);
      panel.position.set(0, 0.86, 0);
      gate.add(panel);

      // Glowing RFID laser sensor rails
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.15,
        roughness: 0.2,
      });
      this.gateLedMats.push(ledMat);

      for (const barY of [0.38, 0.82, 1.26]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.038, 0.40), coilMat);
        bar.position.set(0, barY, 0);
        gate.add(bar);

        const glowLine = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.014, 0.36), ledMat);
        glowLine.position.set(0, barY, 0);
        gate.add(glowLine);
      }

      // Top arch bridge + RFID signage header
      const topArch = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.46), obsidianMat);
      topArch.position.set(0, 1.69, 0);
      gate.add(topArch);

      const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.024, 0.44), ledMat);
      topTrim.position.set(0, 1.625, 0);
      gate.add(topTrim);

      // Double-sided RFID header graphic facing aisle side (+X/-X)
      const plaqueGeo = new THREE.PlaneGeometry(0.38, 0.095);
      const plaqueInner = new THREE.Mesh(plaqueGeo, headerPlaqueMat);
      plaqueInner.position.set(xPos < 0 ? 0.067 : -0.067, 1.70, 0);
      plaqueInner.rotation.y = xPos < 0 ? Math.PI / 2 : -Math.PI / 2;
      gate.add(plaqueInner);

      const plaqueOuter = new THREE.Mesh(plaqueGeo, headerPlaqueMat);
      plaqueOuter.position.set(xPos < 0 ? -0.067 : 0.067, 1.70, 0);
      plaqueOuter.rotation.y = xPos < 0 ? -Math.PI / 2 : Math.PI / 2;
      gate.add(plaqueOuter);

      // Faceted strobe prism beacon
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x0891b2,
        emissiveIntensity: 0.95,
        roughness: 0.12,
        metalness: 0.2,
      });
      this.gateBeaconMats.push(beaconMat);
      const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.05, 0.025, 14), brushedAluminumMat);
      beaconBase.position.set(0, 1.77, 0);
      gate.add(beaconBase);

      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.075, 12), beaconMat);
      beacon.position.set(0, 1.815, 0);
      gate.add(beacon);

      this.easGatesGroup.add(gate);
    }

    this.rootGroup.add(this.easGatesGroup);
  }

  private buildCctvCameras() {
    const mountMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.78 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.18 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3, metalness: 0.65 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.05, metalness: 0.95 });
    const irRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });

    const placements: Array<{ pos: [number, number, number]; baseYaw: number; phase: number }> = [
      { pos: [0.0, 4.65, 14.75], baseYaw: Math.PI, phase: 0.0 },      // Entrance watch
      { pos: [-5.5, 4.65, 1.2], baseYaw: Math.PI, phase: 1.3 },       // Slab Showcase watch
      { pos: [2.4, 4.65, 6.2], baseYaw: Math.PI, phase: 2.5 },        // Booster Gondola watch
      { pos: [-3.5, 4.65, 7.2], baseYaw: Math.PI, phase: 3.7 },       // Counter POS watch
    ];

    placements.forEach((cfg) => {
      const rig = new THREE.Group();
      rig.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);

      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.04, 16), mountMat);
      plate.position.set(0, 0.31, 0);
      rig.add(plate);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.30, 12), mountMat);
      stem.position.set(0, 0.15, 0);
      rig.add(stem);

      const gimbalBall = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), darkTrimMat);
      rig.add(gimbalBall);

      const yawPivot = new THREE.Group();
      yawPivot.rotation.y = cfg.baseYaw;

      const pitchPivot = new THREE.Group();
      pitchPivot.rotation.x = 0.48;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.082, 0.26, 16), shellMat);
      body.rotation.x = Math.PI / 2;
      pitchPivot.add(body);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.05, 16), darkTrimMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0, 0.11);
      pitchPivot.add(collar);

      const visorHood = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.30), shellMat);
      visorHood.position.set(0, 0.082, 0.02);
      pitchPivot.add(visorHood);

      const irRing = new THREE.Mesh(new THREE.RingGeometry(0.042, 0.062, 18), irRingMat);
      irRing.position.set(0, 0, 0.138);
      pitchPivot.add(irRing);

      const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), lensMat);
      lensGlass.position.set(0, 0, 0.14);
      pitchPivot.add(lensGlass);

      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.5,
      });
      const ledDot = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ledMat);
      ledDot.position.set(0.055, 0.055, 0.13);
      pitchPivot.add(ledDot);

      yawPivot.add(pitchPivot);
      rig.add(yawPivot);
      this.cctvGroup.add(rig);

      this.cctvRigs.push({
        yawPivot,
        pitchPivot,
        ledMat,
        baseYaw: cfg.baseYaw,
        phaseOffset: cfg.phase,
        worldPos: new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]),
      });
    });

    this.rootGroup.add(this.cctvGroup);
  }

  private buildGuardStation() {
    // Overhead Triple-Screen CCTV Array mounted high on the interior face of the front glass bay (X = -3.08, Y = 3.08, Z = 15.20)
    // Faces -Z into the shop (rotation.y = Math.PI) and tilts downward so screens are large and clearly visible from the floor.
    this.guardStationGroup.position.set(-3.08, 3.08, 15.20);
    this.guardStationGroup.rotation.y = Math.PI;

    const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.28, metalness: 0.85 });
    const brushedMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.88 });
    const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.45, metalness: 0.35 });

    this.kioskAccentLedMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    });

    // 1. Glass-Clamp & Upper Transom Mounting Rig (connects local Z = -0.075 back to glass Z = 15.50 / local Z = -0.30 and transom Y = 3.80 / local Y = +0.72)
    const vesaCrossArm = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.065, 0.055), brushedMat);
    vesaCrossArm.position.set(0, 0.02, -0.075);
    this.guardStationGroup.add(vesaCrossArm);

    for (const bracketX of [-0.42, 0.42]) {
      // Rear horizontal standoff bar from VESA rail to glass suction/clamp pad
      const standoffArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.21), titaniumMat);
      standoffArm.position.set(bracketX, 0.02, -0.175);
      this.guardStationGroup.add(standoffArm);

      // Circular rubberized aluminum glass-suction clamp pad flush against storefront glass
      const glassPadRing = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.026, 18), brushedMat);
      glassPadRing.rotation.x = Math.PI / 2;
      glassPadRing.position.set(bracketX, 0.02, -0.275);
      this.guardStationGroup.add(glassPadRing);

      const glassPadGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.094, 0.01, 18), this.kioskAccentLedMat);
      glassPadGlow.rotation.x = Math.PI / 2;
      glassPadGlow.position.set(bracketX, 0.02, -0.262);
      this.guardStationGroup.add(glassPadGlow);

      // Vertical hanger strut rising up to grip the upper window transom bar (Y = 3.80 => local Y = +0.72)
      const hangerStrut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), titaniumMat);
      hangerStrut.position.set(bracketX, 0.37, -0.26);
      this.guardStationGroup.add(hangerStrut);

      // Top transom clamp collar
      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.11), obsidianMat);
      topClamp.position.set(bracketX, 0.72, -0.26);
      this.guardStationGroup.add(topClamp);
    }

    // Illuminated "POKEVAULT SECURITY" Rear Plate facing outward through the glass onto the street
    this.kioskPlaqueTex = createKioskPlaqueTexture();
    const plaqueMat = new THREE.MeshBasicMaterial({ map: this.kioskPlaqueTex });

    const plaqueHousing = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.29, 0.028), obsidianMat);
    plaqueHousing.position.set(0, 0.45, -0.245);
    this.guardStationGroup.add(plaqueHousing);

    const outerPlaque = new THREE.Mesh(new THREE.PlaneGeometry(0.81, 0.25), plaqueMat);
    outerPlaque.position.set(0, 0.45, -0.261);
    outerPlaque.rotation.y = Math.PI;
    this.guardStationGroup.add(outerPlaque);

    // Subtle under-rail cyan LED bar beneath center monitor
    const underLedBar = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.024, 0.03), this.kioskAccentLedMat);
    underLedBar.position.set(0, -0.328, -0.02);
    this.guardStationGroup.add(underLedBar);

    // 2. Live CCTV Monitor Textures
    this.consoleQuadNormalTex = createSecurityQuadTexture(false, 2);
    this.consoleQuadAlertTex = createSecurityQuadTexture(true, 2);
    this.consoleRadarNormalTex = createSideWingTexture('radar', false);
    this.consoleRadarAlertTex = createSideWingTexture('radar', true);
    this.consoleBioNormalTex = createSideWingTexture('biometric', false);
    this.consoleBioAlertTex = createSideWingTexture('biometric', true);

    // 3. Center Main Ultrawide Monitor (tilted +0.20 rad downward toward viewers inside the shop)
    const centerMonitor = new THREE.Group();
    centerMonitor.position.set(0, 0, 0);
    centerMonitor.rotation.x = 0.20;

    const centerShell = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.62, 0.036), obsidianMat);
    centerMonitor.add(centerShell);
    const centerBezelAccent = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.022, 0.04), this.kioskAccentLedMat);
    centerBezelAccent.position.set(0, 0.306, 0);
    centerMonitor.add(centerBezelAccent);

    this.consoleMainScreenMat = new THREE.MeshBasicMaterial({
      map: this.consoleQuadNormalTex,
      toneMapped: false,
    });
    const centerScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.03, 0.57), this.consoleMainScreenMat);
    centerScreen.position.set(0, 0, 0.02);
    centerMonitor.add(centerScreen);
    this.guardStationGroup.add(centerMonitor);

    // 4. Left Angled Wing Monitor (Radar + 3D Sweep Hand)
    const leftMonitor = new THREE.Group();
    leftMonitor.position.set(-0.78, -0.01, 0.105);
    leftMonitor.rotation.y = 0.32;
    leftMonitor.rotation.x = 0.20;

    const leftShell = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.032), obsidianMat);
    leftMonitor.add(leftShell);
    this.consoleLeftScreenMat = new THREE.MeshBasicMaterial({
      map: this.consoleRadarNormalTex,
      toneMapped: false,
    });
    const leftScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.40), this.consoleLeftScreenMat);
    leftScreen.position.set(0, 0, 0.018);
    leftMonitor.add(leftScreen);

    // Rotating 3D radar sweep line hovering 2mm in front of radar center
    const sweepGeo = new THREE.PlaneGeometry(0.122, 0.006);
    sweepGeo.translate(0.061, 0, 0);
    this.radarSweepHand = new THREE.Mesh(
      sweepGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
    );
    this.radarSweepHand.position.set(0, -0.014, 0.02);
    leftMonitor.add(this.radarSweepHand);
    this.guardStationGroup.add(leftMonitor);

    // 5. Right Angled Wing Monitor (Biometric & Slab Vault Lock)
    const rightMonitor = new THREE.Group();
    rightMonitor.position.set(0.78, -0.01, 0.105);
    rightMonitor.rotation.y = -0.32;
    rightMonitor.rotation.x = 0.20;

    const rightShell = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.032), obsidianMat);
    rightMonitor.add(rightShell);
    this.consoleRightScreenMat = new THREE.MeshBasicMaterial({
      map: this.consoleBioNormalTex,
      toneMapped: false,
    });
    const rightScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.40), this.consoleRightScreenMat);
    rightScreen.position.set(0, 0, 0.018);
    rightMonitor.add(rightScreen);
    this.guardStationGroup.add(rightMonitor);

    this.rootGroup.add(this.guardStationGroup);
  }

  private buildSecurityGuardNpc() {
    this.guardGroup.position.copy(this.guardPostPos);
    this.guardGroup.rotation.y = this.guardPostYaw;

    // Ground contact shadow
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.015;
    this.guardGroup.add(shadowDisc);

    // Subtle procedural fallback rig (hidden automatically once guard_officer.glb loads)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.72, metalness: 0.02 });
    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.62 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.15 });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    const goldBadgeMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.92,
      roughness: 0.18,
    });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.82 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.25 });

    const buildLeg = (legGroup: THREE.Group, xOffset: number) => {
      legGroup.position.set(xOffset, 0.74, 0);
      const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.06, 0.66, 14), pantsMat);
      trouser.position.set(0, -0.33, 0);
      legGroup.add(trouser);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.23), bootMat);
      boot.position.set(0, -0.69, 0.04);
      legGroup.add(boot);
      this.guardFallbackGroup.add(legGroup);
    };
    buildLeg(this.guardLeftLeg, -0.115);
    buildLeg(this.guardRightLeg, 0.115);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), uniformMat);
    torso.position.set(0, 1.04, 0);
    this.guardFallbackGroup.add(torso);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.44, 0.27), vestMat);
    vest.position.set(0, 1.06, 0);
    this.guardFallbackGroup.add(vest);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.045, 0.28), stripeMat);
    trim.position.set(0, 0.94, 0);
    this.guardFallbackGroup.add(trim);

    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 6), goldBadgeMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(-0.12, 1.16, 0.145);
    this.guardFallbackGroup.add(badge);

    this.guardLeftArm.position.set(-0.27, 1.26, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.46, 0.105), uniformMat);
    lArm.position.set(0, -0.22, 0);
    this.guardLeftArm.add(lArm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.09), skinMat);
    lHand.position.set(0, -0.47, 0);
    this.guardLeftArm.add(lHand);
    this.guardFallbackGroup.add(this.guardLeftArm);

    const createSecurityBatonMesh = (): THREE.Group => {
      const baton = new THREE.Group();
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.08 });
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.34, metalness: 0.55 });
      const chromeRingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 });
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.3,
      });

      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.14, 12), gripMat);
      baton.add(grip);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), chromeRingMat);
      pommel.position.y = -0.075;
      baton.add(pommel);

      const guardCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.026, 14), chromeRingMat);
      guardCollar.position.y = 0.078;
      baton.add(guardCollar);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.44, 12), shaftMat);
      shaft.position.y = 0.305;
      baton.add(shaft);

      for (const bandY of [0.39, 0.46]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.0165, 0.022, 12), bandMat);
        band.position.y = bandY;
        baton.add(band);
      }

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 10, 8), shaftMat);
      tip.position.y = 0.525;
      baton.add(tip);

      return baton;
    };

    this.guardRightArm.position.set(0.27, 1.26, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.46, 0.105), uniformMat);
    rArm.position.set(0, -0.22, 0);
    this.guardRightArm.add(rArm);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.09), skinMat);
    rHand.position.set(0, -0.47, 0);
    this.guardRightArm.add(rHand);
    const fallbackBaton = createSecurityBatonMesh();
    fallbackBaton.position.set(0, -0.48, 0.015);
    fallbackBaton.rotation.x = 1.72;
    this.guardRightArm.add(fallbackBaton);
    this.guardFallbackGroup.add(this.guardRightArm);

    this.guardHead.position.set(0, 1.46, 0);
    const faceTex = this.deps.createFaceTexture('male_cool', '#f1c29b');
    const headMesh = this.deps.createHeadMesh(skinMat, faceTex, 0.22, 0.24, 0.21);
    this.guardHead.add(headMesh);
    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.09, 14), uniformMat);
    capCrown.position.set(0, 0.145, 0);
    this.guardHead.add(capCrown);
    const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.02, 0.12), bootMat);
    capVisor.position.set(0, 0.105, 0.11);
    capVisor.rotation.x = 0.15;
    this.guardHead.add(capVisor);
    this.guardFallbackGroup.add(this.guardHead);

    this.guardGroup.add(this.guardFallbackGroup);

    // Attach crisp 3D GLB Security Officer model — stands watch outside the shop entrance holding a security baton
    this.guardGlbHandle = attachGlbHumanToNpc({
      modelSource: GUARD_NPC_MODEL.modelSource,
      targetHeight: GUARD_NPC_MODEL.targetHeight,
      clipProfile: GUARD_NPC_MODEL.clipProfile,
      rotationY: GUARD_NPC_MODEL.rotationY,
      hostGroup: this.guardGroup,
      fallbackMeshes: [this.guardFallbackGroup],
      palette: {
        suit: 0x0f172a,
        shirt: 0x38bdf8,
        accent: 0xfacc15,
      },
      initialState: 'Idle',
      castShadow: false,
      onModelMounted: (modelRoot) => {
        const legacyHand = modelRoot.getObjectByName('RightHand');
        const rightHandBone = legacyHand ?? modelRoot.getObjectByName('FistR');
        if (rightHandBone) {
          const glbBaton = createSecurityBatonMesh();
          if (legacyHand) {
            glbBaton.position.set(0, -0.042, 0.012);
            glbBaton.rotation.x = 1.72;
          } else {
            glbBaton.scale.setScalar(1.85);
            glbBaton.position.set(0, -0.04, 0.05);
            glbBaton.rotation.x = 1.65;
          }
          rightHandBone.add(glbBaton);
        }
      },
    });

    // Stun baton electric impact spark burst (flashes forward during baton swings)
    const sparkGeo = new THREE.OctahedronGeometry(0.16, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.guardStunSparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
    this.guardStunSparkMesh.position.set(0.12, 1.05, 0.72);
    this.guardStunSparkMesh.visible = false;
    this.guardGroup.add(this.guardStunSparkMesh);

    this.rootGroup.add(this.guardGroup);
  }

  private buildThiefNpc() {
    this.thiefGroup.position.set(0.45, 0, 17.6);
    this.thiefGroup.visible = false;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b89c, roughness: 0.75 });
    const hoodieMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
    const sneakerMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.65 });
    const maskMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.9 });
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72, metalness: 0.1 });

    // Pulsing crimson target ring at thief feet
    this.thiefFloorRingMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.thiefFloorRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 24), this.thiefFloorRingMat);
    this.thiefFloorRing.rotation.x = -Math.PI / 2;
    this.thiefFloorRing.position.y = 0.025;
    this.thiefGroup.add(this.thiefFloorRing);

    // Procedural fallback rig (hidden automatically once GLB loads)
    const buildLeg = (legGroup: THREE.Group, xOffset: number) => {
      legGroup.position.set(xOffset, 0.72, 0);
      const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.64, 12), cargoMat);
      pant.position.set(0, -0.32, 0);
      legGroup.add(pant);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.22), sneakerMat);
      shoe.position.set(0, -0.67, 0.04);
      legGroup.add(shoe);
      this.thiefFallbackGroup.add(legGroup);
    };
    buildLeg(this.thiefLeftLeg, -0.11);
    buildLeg(this.thiefRightLeg, 0.11);

    this.thiefTorso.position.set(0, 0.72, 0);
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.52, 0.25), hoodieMat);
    jacket.position.set(0, 0.30, 0);
    this.thiefTorso.add(jacket);

    this.thiefBagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.18), bagMat);
    this.thiefBagMesh.position.set(0, 0.30, -0.20);
    this.thiefTorso.add(this.thiefBagMesh);

    this.thiefLeftArm.position.set(-0.25, 0.50, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.44, 0.095), hoodieMat);
    lArm.position.set(0, -0.20, 0);
    this.thiefLeftArm.add(lArm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.085), skinMat);
    lHand.position.set(0, -0.44, 0);
    this.thiefLeftArm.add(lHand);
    this.thiefTorso.add(this.thiefLeftArm);

    this.thiefRightArm.position.set(0.25, 0.50, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.44, 0.095), hoodieMat);
    rArm.position.set(0, -0.20, 0);
    this.thiefRightArm.add(rArm);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.085), skinMat);
    rHand.position.set(0, -0.44, 0);
    this.thiefRightArm.add(rHand);
    this.thiefTorso.add(this.thiefRightArm);

    this.thiefHead.position.set(0, 0.70, 0.02);
    const faceTex = this.deps.createFaceTexture('male_cool', '#e6b89c');
    const headMesh = this.deps.createHeadMesh(skinMat, faceTex, 0.21, 0.23, 0.20);
    this.thiefHead.add(headMesh);
    const faceMask = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.105, 0.215), maskMat);
    faceMask.position.set(0, -0.05, 0.008);
    this.thiefHead.add(faceMask);
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hoodieMat
    );
    beanie.position.set(0, 0.09, -0.01);
    this.thiefHead.add(beanie);
    this.thiefTorso.add(this.thiefHead);
    this.thiefFallbackGroup.add(this.thiefTorso);
    this.thiefGroup.add(this.thiefFallbackGroup);

    // Fake gold slab prop held near hand when incidentType === 'slab_swapper'
    this.thiefFakeSlabGroup = new THREE.Group();
    this.thiefFakeSlabGroup.position.set(0.28, 0.96, 0.24);
    const slabCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.15, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xb45309,
        emissiveIntensity: 0.55,
        roughness: 0.2,
      })
    );
    this.thiefFakeSlabGroup.add(slabCase);
    this.thiefFakeSlabGroup.visible = false;
    this.thiefGroup.add(this.thiefFakeSlabGroup);

    // Attach crisp GLB humanoid with stealth black hoodie outfit
    this.thiefGlbHandle = attachGlbHumanToNpc({
      modelSource: '/models/quaternius/Casual3_Male.glb',
      targetHeight: 1.67,
      clipProfile: 'multi',
      hostGroup: this.thiefGroup,
      fallbackMeshes: [this.thiefFallbackGroup],
      palette: {
        shirt: 0x111827,
        pants: 0x09090b,
        hair: 0x030712,
        shoes: 0x09090b,
        accent: 0xf43f5e,
      },
      initialState: 'Walk',
      castShadow: false,
    });
    this.thiefGlbHandle.setVisible(false);

    // Floating overhead rotating crimson alert diamond (!)
    this.thiefBeaconGroup.position.set(0, 2.15, 0);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), beaconMat);
    this.thiefBeaconGroup.add(diamond);
    this.thiefGroup.add(this.thiefBeaconGroup);

    // Generous invisible click proxy hitbox for effortless 3D catching
    this.thiefHitboxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 2.35, 1.15),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.thiefHitboxMesh.position.set(0, 1.18, 0);
    this.thiefHitboxMesh.userData.isSecurityThief = true;
    this.thiefGroup.add(this.thiefHitboxMesh);

    this.rootGroup.add(this.thiefGroup);
  }

  public syncSecurityState(opts: {
    securityLevel: number;
    activeAlert: SecurityAlertEvent | null;
    isShopOpen: boolean;
    isStaffOnShift: boolean;
  }) {
    const nextLevel = Math.max(0, Math.min(2, opts.securityLevel || 0));
    this.securityLevel = nextLevel;
    this.isShopOpen = opts.isShopOpen;
    this.isStaffOnShift = opts.isStaffOnShift;

    const nextAlert = opts.activeAlert;

    if (nextAlert && nextAlert.id !== this.activeAlertId) {
      this.activeAlertId = nextAlert.id;
      this.activeIncidentType = nextAlert.incidentType;
      this.thiefGroup.position.set(0.45, 0, 17.6);
      this.thiefGroup.rotation.y = Math.PI;
      this.thiefGroup.visible = true;
      this.thiefGlbHandle?.setVisible(true);
      this.thiefGlbHandle?.setAnimState('Walk', 0.95);
      this.thiefPhase = 'sneaking_in';
      this.thiefWaypointIdx = 0;
      this.thiefActionTimer = 0;
      if (this.thiefFakeSlabGroup) {
        this.thiefFakeSlabGroup.visible = nextAlert.incidentType === 'slab_swapper';
      }
      if (nextAlert.incidentType === 'slab_swapper') {
        this.thiefWaypoints = [
          new THREE.Vector3(0.0, 0, 14.0),
          new THREE.Vector3(0.0, 0, 10.0),
          new THREE.Vector3(0.0, 0, 5.0),
          new THREE.Vector3(0.0, 0, 0.0),
          new THREE.Vector3(-2.5, 0, -0.9),
          new THREE.Vector3(-4.4, 0, -1.05),
        ];
      } else {
        this.thiefWaypoints = [
          new THREE.Vector3(0.0, 0, 14.0),
          new THREE.Vector3(0.0, 0, 10.0),
          new THREE.Vector3(0.0, 0, 5.0),
          new THREE.Vector3(2.2, 0, 4.15),
        ];
      }

      // Guard immediately stands up from chair and runs out to intercept the intruder!
      if (this.securityLevel >= 2 && this.guardGroup.visible) {
        this.guardPhase = 'chasing_thief';
        this.guardGlbHandle?.setAnimState('Walk', 1.75);
      }
    } else if (!nextAlert && this.activeAlertId) {
      this.activeAlertId = null;
      if (this.thiefPhase === 'sneaking_in' || this.thiefPhase === 'stealing_at_target') {
        this.thiefPhase = 'fleeing_out';
        this.thiefGlbHandle?.setAnimState('Walk', 1.8);
        this.thiefWaypointIdx = 0;
        this.thiefWaypoints = [
          new THREE.Vector3(0.0, 0, 5.0),
          new THREE.Vector3(0.0, 0, 14.0),
          new THREE.Vector3(0.0, 0, 19.6),
        ];
      }
      if (this.guardPhase === 'chasing_thief') {
        this.guardPhase = 'returning_post';
        this.guardGlbHandle?.setAnimState('Walk', 1.05);
      }
    }

    this.applyVisibility();
  }

  public notifyCaught(incidentType?: 'shoplifter' | 'slab_swapper') {
    if (incidentType) this.activeIncidentType = incidentType;
    this.activeAlertId = null;
    this.autoCatchBannerTimer = 2.6;
    if (!this.thiefGroup.visible) {
      this.thiefGroup.position.set(0.35, 0, 14.1);
      this.thiefGroup.visible = true;
      this.thiefGlbHandle?.setVisible(true);
    }
    this.thiefPhase = 'caught_surrender';
    this.thiefGlbHandle?.setAnimState('Surrender', 1.0);
    this.thiefActionTimer = 0;
    this.thiefWaypoints = [
      new THREE.Vector3(0.0, 0, 14.0),
      new THREE.Vector3(0.0, 0, 19.6),
    ];
    this.thiefWaypointIdx = 0;

    if (this.securityLevel >= 2 && this.guardGroup.visible) {
      const d = Math.hypot(
        this.thiefGroup.position.x - this.guardGroup.position.x,
        this.thiefGroup.position.z - this.guardGroup.position.z
      );
      if (d <= 1.65) {
        this.guardPhase = 'arresting';
        this.guardArrestTimer = 0;
        this.guardStrikeTimer = 0;
        this.guardGlbHandle?.setAnimState('Attack', 1.35);
      } else {
        this.guardPhase = 'chasing_thief';
        this.guardStrikeTimer = 0;
        this.guardGlbHandle?.setAnimState('Walk', 1.75);
      }
    }
  }

  public notifyEscaped() {
    this.activeAlertId = null;
    if (this.thiefGroup.visible && this.thiefPhase !== 'caught_surrender') {
      this.thiefPhase = 'fleeing_out';
      this.thiefGlbHandle?.setAnimState('Walk', 1.85);
      this.thiefWaypointIdx = 0;
      this.thiefWaypoints = [
        new THREE.Vector3(0.0, 0, 5.0),
        new THREE.Vector3(0.0, 0, 14.0),
        new THREE.Vector3(0.0, 0, 19.8),
      ];
    }
  }

  public triggerAutoCatchSequence(incidentType: 'shoplifter' | 'slab_swapper' = 'shoplifter') {
    this.activeIncidentType = incidentType;
    this.activeAlertId = null;
    this.autoCatchBannerTimer = 3.2;
    this.thiefGroup.position.set(0.35, 0, 14.1);
    this.thiefGroup.rotation.y = Math.PI;
    this.thiefGroup.visible = true;
    this.thiefGlbHandle?.setVisible(true);
    if (this.thiefFakeSlabGroup) {
      this.thiefFakeSlabGroup.visible = incidentType === 'slab_swapper';
    }
    this.thiefPhase = 'caught_surrender';
    this.thiefGlbHandle?.setAnimState('Surrender', 1.0);
    this.thiefActionTimer = 0;
    this.thiefWaypoints = [
      new THREE.Vector3(0.0, 0, 14.0),
      new THREE.Vector3(0.0, 0, 19.6),
    ];
    this.thiefWaypointIdx = 0;

    if (this.securityLevel >= 2 && this.guardGroup.visible) {
      this.guardPhase = 'chasing_thief';
      this.guardStrikeTimer = 0;
      this.guardGlbHandle?.setAnimState('Walk', 1.75);
    }
  }

  public isThiefNearDoor(): boolean {
    if (!this.thiefGroup.visible) return false;
    return (
      Math.abs(this.thiefGroup.position.x) < 2.8 &&
      this.thiefGroup.position.z >= 12.0 &&
      this.thiefGroup.position.z <= 19.5
    );
  }

  public isGuardNearDoor(): boolean {
    if (!this.guardGroup.visible || this.guardPhase === 'patrol_post') return false;
    return (
      Math.abs(this.guardGroup.position.x) < 2.5 &&
      this.guardGroup.position.z >= 12.5 &&
      this.guardGroup.position.z <= 18.0
    );
  }

  public getClickableTargets(): THREE.Object3D[] {
    if (!this.thiefGroup.visible || !this.thiefHitboxMesh) return [];
    if (this.thiefPhase !== 'sneaking_in' && this.thiefPhase !== 'stealing_at_target') return [];
    return [this.thiefHitboxMesh];
  }

  public getThiefDistanceTo(x: number, y: number, z: number): number | null {
    if (!this.thiefGroup.visible) return null;
    if (this.thiefPhase !== 'sneaking_in' && this.thiefPhase !== 'stealing_at_target') return null;
    if (y > 2.8) return null;
    return Math.hypot(this.thiefGroup.position.x - x, this.thiefGroup.position.z - z);
  }

  private applyVisibility() {
    const hasHardware = this.securityLevel >= 1;
    const hasGuard = this.securityLevel >= 2;
    this.easGatesGroup.visible = hasHardware;
    this.cctvGroup.visible = hasHardware;
    this.guardStationGroup.visible = hasHardware;
    const guardVis = hasGuard && this.isStaffOnShift;
    this.guardGroup.visible = guardVis;
    this.guardGlbHandle?.setVisible(guardVis);
  }

  public update(delta: number, elapsedSec: number) {
    const alertActive =
      Boolean(this.activeAlertId) ||
      this.autoCatchBannerTimer > 0 ||
      this.thiefPhase === 'sneaking_in' ||
      this.thiefPhase === 'stealing_at_target';

    if (this.autoCatchBannerTimer > 0) {
      this.autoCatchBannerTimer = Math.max(0, this.autoCatchBannerTimer - delta);
    }

    // 1. EAS Gate Strobes & Command Kiosk LEDs/Screens
    if (this.easGatesGroup.visible) {
      this.alarmPulseTimer += delta * (alertActive ? 9.5 : 2.0);
      const strobe = alertActive ? (Math.sin(this.alarmPulseTimer) > 0 ? 1 : 0.15) : 0.72;
      const ledColor = alertActive ? 0xf43f5e : 0x06b6d4;
      for (const mat of this.gateLedMats) {
        mat.color.setHex(ledColor);
        mat.emissive.setHex(ledColor);
        mat.emissiveIntensity = alertActive ? 2.5 * strobe : 1.05;
      }
      for (const bMat of this.gateBeaconMats) {
        bMat.color.setHex(alertActive ? 0xef4444 : 0x22d3ee);
        bMat.emissive.setHex(alertActive ? 0xdc2626 : 0x0891b2);
        bMat.emissiveIntensity = alertActive ? 2.8 * strobe : 0.85;
      }
    }

    if (this.guardStationGroup.visible) {
      const targetMain = alertActive ? this.consoleQuadAlertTex : this.consoleQuadNormalTex;
      if (this.consoleMainScreenMat && targetMain && this.consoleMainScreenMat.map !== targetMain) {
        this.consoleMainScreenMat.map = targetMain;
        this.consoleMainScreenMat.needsUpdate = true;
      }
      const targetLeft = alertActive ? this.consoleRadarAlertTex : this.consoleRadarNormalTex;
      if (this.consoleLeftScreenMat && targetLeft && this.consoleLeftScreenMat.map !== targetLeft) {
        this.consoleLeftScreenMat.map = targetLeft;
        this.consoleLeftScreenMat.needsUpdate = true;
      }
      const targetRight = alertActive ? this.consoleBioAlertTex : this.consoleBioNormalTex;
      if (this.consoleRightScreenMat && targetRight && this.consoleRightScreenMat.map !== targetRight) {
        this.consoleRightScreenMat.map = targetRight;
        this.consoleRightScreenMat.needsUpdate = true;
      }
      if (this.kioskAccentLedMat) {
        const c = alertActive ? 0xf43f5e : 0x06b6d4;
        this.kioskAccentLedMat.color.setHex(c);
        this.kioskAccentLedMat.emissive.setHex(c);
        this.kioskAccentLedMat.emissiveIntensity = alertActive ? 1.8 + 0.8 * Math.sin(elapsedSec * 9) : 1.2;
      }
      if (this.radarSweepHand) {
        this.radarSweepHand.rotation.z -= delta * (alertActive ? 4.8 : 1.8);
      }
    }

    // 2. CCTV Camera AI Panning / Thief Lock-On
    if (this.cctvGroup.visible) {
      for (const rig of this.cctvRigs) {
        if (alertActive && this.thiefGroup.visible) {
          const dx = this.thiefGroup.position.x - rig.worldPos.x;
          const dz = this.thiefGroup.position.z - rig.worldPos.z;
          const targetYaw = Math.atan2(dx, dz);
          rig.yawPivot.rotation.y = THREE.MathUtils.damp(rig.yawPivot.rotation.y, targetYaw, 6, delta);
          rig.ledMat.color.setHex(0xf43f5e);
          rig.ledMat.emissive.setHex(0xf43f5e);
          rig.ledMat.emissiveIntensity = 1.6 + 0.8 * Math.sin(elapsedSec * 10);
        } else {
          const sweep = rig.baseYaw + Math.sin(elapsedSec * 0.65 + rig.phaseOffset) * 0.45;
          rig.yawPivot.rotation.y = THREE.MathUtils.damp(rig.yawPivot.rotation.y, sweep, 4, delta);
          rig.ledMat.color.setHex(0x10b981);
          rig.ledMat.emissive.setHex(0x10b981);
          rig.ledMat.emissiveIntensity = Math.sin(elapsedSec * 2 + rig.phaseOffset) > 0.2 ? 1.3 : 0.3;
        }
      }
    }

    // 3. Thief NPC Animation & Pathing
    if (this.thiefGroup.visible) {
      this.thiefBeaconGroup.rotation.y += delta * 2.8;
      this.thiefBeaconGroup.position.y = 2.15 + Math.sin(elapsedSec * 5.0) * 0.08;
      if (this.thiefFloorRingMat) {
        this.thiefFloorRingMat.opacity = 0.45 + 0.4 * Math.sin(elapsedSec * 7.0);
      }

      if (this.thiefPhase === 'sneaking_in' || this.thiefPhase === 'fleeing_out') {
        const wp = this.thiefWaypoints[this.thiefWaypointIdx];
        if (wp) {
          const dx = wp.x - this.thiefGroup.position.x;
          const dz = wp.z - this.thiefGroup.position.z;
          const dist = Math.hypot(dx, dz);
          const speed = this.thiefPhase === 'fleeing_out' ? 5.2 : 2.35;
          if (dist > 0.2) {
            const step = Math.min(dist, speed * delta);
            this.thiefGroup.position.x += (dx / dist) * step;
            this.thiefGroup.position.z += (dz / dist) * step;
            const targetYaw = Math.atan2(dx, dz);
            this.thiefGroup.rotation.y = THREE.MathUtils.damp(this.thiefGroup.rotation.y, targetYaw, 10, delta);

            this.thiefWalkPhase += delta * (this.thiefPhase === 'fleeing_out' ? 14 : 8.5);
            this.thiefLeftLeg.rotation.x = Math.sin(this.thiefWalkPhase) * 0.45;
            this.thiefRightLeg.rotation.x = -Math.sin(this.thiefWalkPhase) * 0.45;
            this.thiefLeftArm.rotation.x = -Math.sin(this.thiefWalkPhase) * 0.35;
            this.thiefRightArm.rotation.x = Math.sin(this.thiefWalkPhase) * 0.35;
            this.thiefTorso.rotation.x = this.thiefPhase === 'sneaking_in' ? 0.16 : 0.10;
            this.thiefHead.rotation.y = Math.sin(elapsedSec * 3.5) * 0.35;
          } else {
            this.thiefWaypointIdx++;
            if (this.thiefWaypointIdx >= this.thiefWaypoints.length) {
              if (this.thiefPhase === 'sneaking_in') {
                this.thiefPhase = 'stealing_at_target';
                this.thiefGlbHandle?.setAnimState('Checkout', 1.25);
                this.thiefActionTimer = 0;
                this.thiefLeftLeg.rotation.x = 0;
                this.thiefRightLeg.rotation.x = 0;
                this.thiefGroup.rotation.y =
                  this.activeIncidentType === 'slab_swapper' ? -Math.PI * 0.5 : 0;
              } else {
                this.thiefPhase = 'hidden';
                this.thiefGroup.visible = false;
                this.thiefGlbHandle?.setVisible(false);
              }
            }
          }
        }
      } else if (this.thiefPhase === 'stealing_at_target') {
        this.thiefActionTimer += delta;
        this.thiefTorso.rotation.x = 0.24;
        this.thiefRightArm.rotation.x = -0.85 + Math.sin(this.thiefActionTimer * 5.2) * 0.28;
        this.thiefLeftArm.rotation.x = -0.55;
        this.thiefHead.rotation.y = Math.sin(this.thiefActionTimer * 3.1) * 0.65;
      } else if (this.thiefPhase === 'caught_surrender') {
        this.thiefActionTimer += delta;
        this.thiefTorso.rotation.x = 0;
        this.thiefLeftLeg.rotation.x = 0;
        this.thiefRightLeg.rotation.x = 0;
        this.thiefLeftArm.rotation.x = -2.45;
        this.thiefRightArm.rotation.x = -2.45;
        this.thiefHead.rotation.y = Math.sin(this.thiefActionTimer * 6.0) * 0.25;
        if (this.thiefActionTimer >= 1.8) {
          this.thiefPhase = 'fleeing_out';
          this.thiefGlbHandle?.setAnimState('Walk', 1.85);
        }
      }
    }

    // 4. Security Guard NPC AI (Tier 2: Stands guard outside entrance until an intruder triggers interception)
    if (this.guardGroup.visible) {
      if (this.guardStunSparkMesh) this.guardStunSparkMesh.visible = false;

      if (this.guardPhase === 'patrol_post') {
        this.guardStrikeTimer = 0;
        // Check if a thief just spawned before phase transitioned
        if (alertActive && this.thiefGroup.visible && (this.thiefPhase === 'sneaking_in' || this.thiefPhase === 'stealing_at_target')) {
          this.guardPhase = 'chasing_thief';
          this.guardGlbHandle?.setAnimState('Walk', 1.75);
        } else {
          // Standing at attention outside storefront entrance watching street & doorway
          this.guardGroup.position.copy(this.guardPostPos);
          this.guardGroup.rotation.y = THREE.MathUtils.damp(this.guardGroup.rotation.y, this.guardPostYaw, 6, delta);
          this.guardGlbHandle?.setAnimState('Idle', 1.0);
          // Fallback mesh upright standing pose
          this.guardFallbackGroup.position.y = 0;
          this.guardLeftLeg.rotation.x = THREE.MathUtils.damp(this.guardLeftLeg.rotation.x, 0, 8, delta);
          this.guardRightLeg.rotation.x = THREE.MathUtils.damp(this.guardRightLeg.rotation.x, 0, 8, delta);
          this.guardHead.rotation.y = Math.sin(elapsedSec * 0.65) * 0.28;
          this.guardLeftArm.rotation.x = THREE.MathUtils.damp(this.guardLeftArm.rotation.x, 0.04, 8, delta);
          this.guardRightArm.rotation.x = THREE.MathUtils.damp(this.guardRightArm.rotation.x, 0.04, 8, delta);
        }
      } else if (this.guardPhase === 'chasing_thief') {
        this.guardFallbackGroup.position.y = 0;
        if (!this.thiefGroup.visible || this.thiefPhase === 'fleeing_out') {
          this.guardStrikeTimer = 0;
          this.guardPhase = 'returning_post';
          this.guardGlbHandle?.setAnimState('Walk', 1.05);
        } else {
          _tempVecA.copy(this.thiefGroup.position);
          // Route through the sliding glass doorway (X = 0, Z = 15.35) instead of walking through storefront glass
          if (this.guardGroup.position.z > 15.55 && _tempVecA.z < 15.25 && Math.abs(this.guardGroup.position.x) > 1.25) {
            _tempVecA.set(0.0, 0, 15.35);
          }
          const dx = _tempVecA.x - this.guardGroup.position.x;
          const dz = _tempVecA.z - this.guardGroup.position.z;
          const dist = Math.hypot(dx, dz);
          const distToThief = Math.hypot(
            this.thiefGroup.position.x - this.guardGroup.position.x,
            this.thiefGroup.position.z - this.guardGroup.position.z
          );
          if (distToThief > 1.40) {
            this.guardStrikeTimer = 0;
            this.guardGlbHandle?.setAnimState('Walk', 1.75);
            const step = Math.min(dist, 5.2 * delta);
            if (dist > 0.001) {
              this.guardGroup.position.x += (dx / dist) * step;
              this.guardGroup.position.z += (dz / dist) * step;
              this.guardGroup.rotation.y = THREE.MathUtils.damp(
                this.guardGroup.rotation.y,
                Math.atan2(dx, dz),
                12,
                delta
              );
            }
            this.guardWalkPhase += delta * 13.0;
            this.guardLeftLeg.rotation.x = Math.sin(this.guardWalkPhase) * 0.45;
            this.guardRightLeg.rotation.x = -Math.sin(this.guardWalkPhase) * 0.45;
            this.guardLeftArm.rotation.x = -Math.sin(this.guardWalkPhase) * 0.4;
            this.guardRightArm.rotation.x = -0.95;
          } else if (this.thiefPhase === 'caught_surrender') {
            this.guardPhase = 'arresting';
            this.guardGlbHandle?.setAnimState('Attack', 1.35);
            this.guardArrestTimer = 0;
          } else {
            // Reached the active thief — strike aggressively with stun baton & subdue!
            this.guardStrikeTimer += delta;
            this.guardGlbHandle?.setAnimState('Attack', 1.40);
            this.guardGroup.rotation.y = THREE.MathUtils.damp(
              this.guardGroup.rotation.y,
              Math.atan2(
                this.thiefGroup.position.x - this.guardGroup.position.x,
                this.thiefGroup.position.z - this.guardGroup.position.z
              ),
              14,
              delta
            );
            this.guardLeftLeg.rotation.x = THREE.MathUtils.damp(this.guardLeftLeg.rotation.x, -0.18, 10, delta);
            this.guardRightLeg.rotation.x = THREE.MathUtils.damp(this.guardRightLeg.rotation.x, 0.22, 10, delta);
            const swingWave = Math.sin(this.guardStrikeTimer * 12.5);
            this.guardRightArm.rotation.x = -1.35 + swingWave * 1.15;
            this.guardLeftArm.rotation.x = -0.65;

            if (this.guardStunSparkMesh) {
              const hitFlash = swingWave > 0.35;
              this.guardStunSparkMesh.visible = hitFlash;
              if (hitFlash) {
                const sc = 0.8 + swingWave * 0.75;
                this.guardStunSparkMesh.scale.setScalar(sc);
                this.guardStunSparkMesh.rotation.y += delta * 18;
                this.guardStunSparkMesh.rotation.z += delta * 14;
              }
            }

            if (this.guardStrikeTimer >= 1.10) {
              this.guardStrikeTimer = 0;
              this.guardPhase = 'arresting';
              this.guardArrestTimer = 0;
              this.deps.onGuardSubdueThief?.();
            }
          }
        }
      } else if (this.guardPhase === 'arresting') {
        this.guardFallbackGroup.position.y = 0;
        this.guardArrestTimer += delta;
        if (this.thiefGroup.visible) {
          this.guardGroup.rotation.y = THREE.MathUtils.damp(
            this.guardGroup.rotation.y,
            Math.atan2(
              this.thiefGroup.position.x - this.guardGroup.position.x,
              this.thiefGroup.position.z - this.guardGroup.position.z
            ),
            12,
            delta
          );
        }
        this.guardLeftLeg.rotation.x = THREE.MathUtils.damp(this.guardLeftLeg.rotation.x, 0, 10, delta);
        this.guardRightLeg.rotation.x = THREE.MathUtils.damp(this.guardRightLeg.rotation.x, 0, 10, delta);
        if (this.guardArrestTimer < 0.75) {
          this.guardGlbHandle?.setAnimState('Attack', 1.35);
          const swingWave = Math.sin(this.guardArrestTimer * 12.5);
          this.guardRightArm.rotation.x = -1.35 + swingWave * 1.15;
          this.guardLeftArm.rotation.x = -0.75;
          if (this.guardStunSparkMesh) {
            this.guardStunSparkMesh.visible = swingWave > 0.35;
            this.guardStunSparkMesh.scale.setScalar(0.8 + Math.max(0, swingWave) * 0.75);
            this.guardStunSparkMesh.rotation.y += delta * 18;
          }
        } else {
          this.guardGlbHandle?.setAnimState('Lecture', 1.15);
          this.guardRightArm.rotation.x = -1.05;
          this.guardLeftArm.rotation.x = -0.55;
        }
        if (this.guardArrestTimer >= 1.95) {
          this.guardPhase = 'returning_post';
          this.guardGlbHandle?.setAnimState('Walk', 1.05);
        }
      } else if (this.guardPhase === 'returning_post') {
        this.guardFallbackGroup.position.y = 0;
        _tempVecB.copy(this.guardPostPos);
        // Route back outside through the sliding doorway (X = 0, Z = 15.75) if returning from inside the shop
        if (this.guardGroup.position.z < 15.45 && Math.abs(this.guardGroup.position.x) > 1.25) {
          _tempVecB.set(0.0, 0, 15.75);
        }
        const dx = _tempVecB.x - this.guardGroup.position.x;
        const dz = _tempVecB.z - this.guardGroup.position.z;
        const dist = Math.hypot(dx, dz);
        const distToPost = Math.hypot(
          this.guardPostPos.x - this.guardGroup.position.x,
          this.guardPostPos.z - this.guardGroup.position.z
        );
        if (distToPost > 0.18) {
          this.guardGlbHandle?.setAnimState('Walk', 1.05);
          const step = Math.min(dist, 2.8 * delta);
          if (dist > 0.001) {
            this.guardGroup.position.x += (dx / dist) * step;
            this.guardGroup.position.z += (dz / dist) * step;
            this.guardGroup.rotation.y = THREE.MathUtils.damp(
              this.guardGroup.rotation.y,
              Math.atan2(dx, dz),
              8,
              delta
            );
          }
          this.guardWalkPhase += delta * 9.0;
          this.guardLeftLeg.rotation.x = Math.sin(this.guardWalkPhase) * 0.38;
          this.guardRightLeg.rotation.x = -Math.sin(this.guardWalkPhase) * 0.38;
          this.guardLeftArm.rotation.x = -Math.sin(this.guardWalkPhase) * 0.32;
          this.guardRightArm.rotation.x = Math.sin(this.guardWalkPhase) * 0.32;
        } else {
          this.guardGroup.position.copy(this.guardPostPos);
          this.guardPhase = 'patrol_post';
          this.guardGlbHandle?.setAnimState('Idle', 1.0);
        }
      }
    }
  }

  public dispose() {
    this.guardGlbHandle?.dispose();
    this.thiefGlbHandle?.dispose();
    this.consoleQuadNormalTex?.dispose();
    this.consoleQuadAlertTex?.dispose();
    this.consoleRadarNormalTex?.dispose();
    this.consoleRadarAlertTex?.dispose();
    this.consoleBioNormalTex?.dispose();
    this.consoleBioAlertTex?.dispose();
    this.kioskPlaqueTex?.dispose();
    this.easHeaderTex?.dispose();
    this.rootGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
}
