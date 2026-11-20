import * as THREE from 'three';
import type { CityTrafficCoordinator } from './CityTrafficCoordinator';
import {
  DRAGON_BRIDGE_CENTER_X,
  TRAN_THI_LY_BRIDGE_CENTER_X,
  getDragonBridgeOuterHalfW,
  getHanRiverBridgeSlopeDz,
  getHanRiverExteriorGroundY,
  getTranThiLyBridgeOuterHalfW,
} from './HanRiverSystem';
import {
  WEST_RES_EXPANSION_MIN_X,
  clampMotorbikeWestResidentialBounds,
  isInWestRiverResidentialOpening,
  isInsideWestBikeForbiddenShop,
} from './westResidentialLayout';
import {
  WEST_COAST_BIKE_MIN_X,
  WEST_COAST_ROAD_MAX_Z,
  WEST_COAST_ROAD_MIN_Z,
  getWestCoastalGroundY,
} from './WestCoastalBeachSystem';

export interface PlayerMotorbikeHudState {
  nearBike: boolean;
  canMount: boolean;
  isRiding: boolean;
  speedKmh: number;
  gear: 'P' | 'N' | 'D' | 'R' | 'S';
  headlightOn: boolean;
  cameraView: 'cockpit' | 'chase';
  bikeX: number;
  bikeZ: number;
}

export interface MotorbikeDriveInputs {
  throttle: boolean;
  brakeReverse: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  boost: boolean;
  joyX: number;
  joyY: number;
}

export interface MotorbikeEnvironmentCheck {
  checkCollider: (x: number, z: number, radius: number) => boolean;
}

const _armShoulderVec = new THREE.Vector3();
const _armWristVec = new THREE.Vector3();
const _armDirVec = new THREE.Vector3();
const _armZAxis = new THREE.Vector3(0, 0, 1);

function createLicensePlateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 144);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(16, 16, 224, 18);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 46px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('43-P1', 128, 82);
  ctx.font = 'bold 48px monospace';
  ctx.fillText('151.00', 128, 134);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPokeTankEmblemTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  // Top crimson half
  ctx.beginPath();
  ctx.arc(64, 64, 54, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  // Bottom pearl white half
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  // Outer ring & belt
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#09090b';
  ctx.fillRect(10, 58, 108, 12);
  // Center gold-rimmed button
  ctx.beginPath();
  ctx.arc(64, 64, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 64, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createHeadlightPoolTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 220, 8, 128, 110, 145);
  grad.addColorStop(0.0, 'rgba(255, 250, 225, 0.88)');
  grad.addColorStop(0.35, 'rgba(254, 240, 138, 0.44)');
  grad.addColorStop(0.75, 'rgba(186, 230, 253, 0.14)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPokeShipCargoDecalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 192);

  // Diagonal sport accent stripe
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 28);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, 166, 256, 26);

  // Center badge pill
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(18, 42, 220, 108);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 42, 220, 108);

  // PokéShip emblem dot
  ctx.beginPath();
  ctx.arc(54, 96, 20, Math.PI, 0);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(54, 96, 20, 0, Math.PI);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(34, 93, 40, 6);
  ctx.beginPath();
  ctx.arc(54, 96, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#facc15';
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('POKÉSHIP', 84, 90);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('CARD EXPRESS', 84, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawDashboardCanvas(
  ctx: CanvasRenderingContext2D,
  kmh: number,
  gear: 'P' | 'N' | 'D' | 'R' | 'S',
  headlightOn: boolean
) {
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, 384, 192);

  // Subtle cyan/amber bezel border
  ctx.strokeStyle = gear === 'S' ? '#f59e0b' : '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 372, 180);

  // Top status strip
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(14, 14, 356, 36);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('POKÉ-SPORT 155', 24, 39);

  ctx.fillStyle = headlightOn ? '#38bdf8' : '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(headlightOn ? 'HIGH BEAM' : 'AUTO LIGHT', 360, 39);

  // Main digital speed readout
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 84px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.min(99, Math.max(0, Math.round(kmh)))).padStart(2, '0'), 156, 138);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('KM/H', 222, 134);

  // Gear pill on right
  const gearColor =
    gear === 'S' ? '#f59e0b' : gear === 'R' ? '#fb7185' : gear === 'D' ? '#34d399' : '#64748b';
  ctx.fillStyle = gearColor;
  ctx.fillRect(302, 66, 58, 72);
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(gear, 331, 118);

  // RPM / Throttle bar at bottom
  const pct = Math.min(1, kmh / 74);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 154, 344, 18);
  ctx.fillStyle = gear === 'S' ? '#f97316' : '#22d3ee';
  ctx.fillRect(20, 154, Math.round(344 * pct), 18);
}

export class PlayerMotorbikeController {
  public readonly root: THREE.Group;
  private readonly leanPivot: THREE.Group;
  private readonly steerPivot: THREE.Group;
  private readonly frontWheelSpin: THREE.Group;
  private readonly rearWheelSpin: THREE.Group;
  private readonly kickstandPivot: THREE.Group;
  private readonly riderArmsGroup: THREE.Group;
  private readonly leftArmPivot: THREE.Group;
  private readonly rightArmPivot: THREE.Group;
  private readonly leftArmMesh: THREE.Group;
  private readonly rightArmMesh: THREE.Group;
  private readonly leftHandGroup: THREE.Group;
  private readonly rightHandGroup: THREE.Group;
  private readonly leftLeverMesh: THREE.Mesh;
  private readonly rightLeverMesh: THREE.Mesh;

  private readonly headlightMat: THREE.MeshStandardMaterial;
  private readonly drlMat: THREE.MeshStandardMaterial;
  private readonly taillightMat: THREE.MeshStandardMaterial;
  private readonly headlightBeamMat: THREE.MeshBasicMaterial;
  private readonly headlightBeamMesh: THREE.Mesh;

  private readonly dashCanvas: HTMLCanvasElement;
  private readonly dashCtx: CanvasRenderingContext2D;
  private readonly dashTexture: THREE.CanvasTexture;
  private lastDashKey: string = '';

  // PokeShip Rear Thermal Delivery Cargo Box
  private readonly deliveryCargoGroup: THREE.Group;
  private readonly deliveryBoxBodyMat: THREE.MeshStandardMaterial;
  private readonly deliveryBoxLidMat: THREE.MeshStandardMaterial;

  // World pose (local -Z is forward when rotation.y === yaw, matching ShopScene playerYaw!)
  public x: number;
  public y: number;
  public z: number;
  public yaw: number;

  // Vehicle kinematics state
  public speed: number = 0; // m/s signed (+ forward, - reverse)
  public steerAngle: number = 0; // rad (+ left, - right)
  public leanAngle: number = 0; // rad
  public pitchAngle: number = 0; // rad
  public kickstandAngle: number = -0.48; // folded out when parked
  public isMounted: boolean = false;
  public cameraView: 'cockpit' | 'chase' = 'cockpit';
  public riderLookYawOffset: number = 0;
  public headlightOn: boolean = true;

  private prevWheelSpeed: number = 0;
  private lastHudEmitKey: string = '';
  private throttleGripTwist: number = 0;
  private brakeLeverPull: number = 0;

  // Parked initially right in front of the Pokémon Card Shop's clear right-side sidewalk apron
  public static readonly INITIAL_PARK_X = 5.4;
  public static readonly INITIAL_PARK_Y = 0.0;
  public static readonly INITIAL_PARK_Z = 19.3;
  public static readonly INITIAL_PARK_YAW = -Math.PI * 0.42;

  constructor() {
    this.x = PlayerMotorbikeController.INITIAL_PARK_X;
    this.y = PlayerMotorbikeController.INITIAL_PARK_Y;
    this.z = PlayerMotorbikeController.INITIAL_PARK_Z;
    this.yaw = PlayerMotorbikeController.INITIAL_PARK_YAW;

    this.root = new THREE.Group();
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;

    this.leanPivot = new THREE.Group();
    this.root.add(this.leanPivot);

    // PBR Materials with gloss metallic/matte roughness contrast
    const crimsonBodyMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.42,
      roughness: 0.18,
    });
    const pearlWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.22,
      roughness: 0.24,
    });
    const matteChassisMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.35,
      roughness: 0.72,
    });
    const rubberTireMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.04,
      roughness: 0.88,
    });
    const goldAlloyMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.22,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.14,
    });
    const seatLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.04,
      roughness: 0.78,
    });
    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.76,
    });

    this.headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfefce8,
      emissive: 0xfef08a,
      emissiveIntensity: 1.6,
      roughness: 0.15,
    });
    this.drlMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.3,
      roughness: 0.2,
    });
    this.taillightMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });

    // Subtle ground contact shadow disc beneath bike
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.scale.set(0.55, 1.15, 1);
    contactShadow.position.y = 0.014;
    this.root.add(contactShadow);

    // Projected headlight beam pool on ground ahead (-Z local)
    this.headlightBeamMat = new THREE.MeshBasicMaterial({
      map: createHeadlightPoolTexture(),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.headlightBeamMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.2), this.headlightBeamMat);
    this.headlightBeamMesh.rotation.x = -Math.PI / 2;
    this.headlightBeamMesh.position.set(0, 0.024, -3.2);
    this.root.add(this.headlightBeamMesh);

    // Wheel builder helper (axle oriented along local X axis!)
    const buildWheelAssembly = (radius: number, tube: number): THREE.Group => {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - tube * 0.45, tube, 14, 28), rubberTireMat);
      tire.rotation.y = Math.PI / 2;
      wheelGroup.add(tire);

      const rimRing = new THREE.Mesh(
        new THREE.CylinderGeometry(radius - tube * 0.9, radius - tube * 0.9, 0.09, 20, 1, true),
        goldAlloyMat
      );
      rimRing.rotation.z = Math.PI / 2;
      wheelGroup.add(rimRing);

      // 5 sporty spokes
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.045, (radius - tube * 0.95) * 2, 0.032), goldAlloyMat);
        spoke.rotation.x = (i * Math.PI) / 5;
        wheelGroup.add(spoke);
      }

      // Hub + steel disc brake rotor
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 14), matteChassisMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.012, 20), chromeMat);
      disc.rotation.z = Math.PI / 2;
      disc.position.x = -0.065;
      wheelGroup.add(disc);

      return wheelGroup;
    };

    // 1. Rear Wheel at local Z = +0.66, Y = 0.255
    this.rearWheelSpin = buildWheelAssembly(0.255, 0.082);
    this.rearWheelSpin.position.set(0, 0.255, 0.66);
    this.leanPivot.add(this.rearWheelSpin);

    // Swingarm + Dual Rear Shock Absorbers
    const swingArmL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.56), matteChassisMat);
    swingArmL.position.set(-0.11, 0.27, 0.42);
    this.leanPivot.add(swingArmL);

    const swingArmR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.56), matteChassisMat);
    swingArmR.position.set(0.11, 0.27, 0.42);
    this.leanPivot.add(swingArmR);

    [-0.12, 0.12].forEach((sx) => {
      const shockSpring = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.30, 10), goldAlloyMat);
      shockSpring.position.set(sx, 0.45, 0.52);
      shockSpring.rotation.x = -0.45;
      this.leanPivot.add(shockSpring);
    });

    // 2. Engine Block, Footboards & Belly Pan
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.42), matteChassisMat);
    engineBlock.position.set(0, 0.28, 0.06);
    this.leanPivot.add(engineBlock);

    const bellyPan = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.64), pearlWhiteMat);
    bellyPan.position.set(0, 0.19, -0.06);
    this.leanPivot.add(bellyPan);

    // Side footpegs / floorboard step
    const footboard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.36), matteChassisMat);
    footboard.position.set(0, 0.25, -0.04);
    this.leanPivot.add(footboard);

    // Chrome Exhaust Muffler on Right Side (+X)
    const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 10), chromeMat);
    exhaustPipe.rotation.x = Math.PI / 2 - 0.12;
    exhaustPipe.position.set(0.15, 0.24, 0.28);
    this.leanPivot.add(exhaustPipe);

    const mufflerCan = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.048, 0.44, 14), matteChassisMat);
    mufflerCan.rotation.x = Math.PI / 2 - 0.18;
    mufflerCan.position.set(0.175, 0.32, 0.62);
    this.leanPivot.add(mufflerCan);

    const mufflerHeatShield = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.075, 0.30), chromeMat);
    mufflerHeatShield.rotation.x = -0.18;
    mufflerHeatShield.position.set(0.215, 0.32, 0.61);
    this.leanPivot.add(mufflerHeatShield);

    // Fold-out Left Side Kickstand (pivot at bottom frame left)
    this.kickstandPivot = new THREE.Group();
    this.kickstandPivot.position.set(-0.15, 0.24, 0.04);
    const standLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.28, 8), chromeMat);
    standLeg.position.set(-0.08, -0.11, 0.02);
    standLeg.rotation.z = -0.45;
    this.kickstandPivot.add(standLeg);
    const standFoot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.06), matteChassisMat);
    standFoot.position.set(-0.14, -0.22, 0.02);
    this.kickstandPivot.add(standFoot);
    this.kickstandPivot.rotation.x = 0.18;
    this.leanPivot.add(this.kickstandPivot);

    // 3. Sculpted Tank, Side Fairings & Rear Tail Section
    const mainFrameSpine = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.72), crimsonBodyMat);
    mainFrameSpine.position.set(0, 0.56, 0.05);
    this.leanPivot.add(mainFrameSpine);

    // Fuel tank hump forward of rider knees (with Pokéball emblems on both sides!)
    const tankBody = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.22, 0.38), crimsonBodyMat);
    tankBody.position.set(0, 0.68, -0.22);
    tankBody.rotation.x = 0.22;
    this.leanPivot.add(tankBody);

    const tankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.36), pearlWhiteMat);
    tankStripe.position.set(0, 0.79, -0.22);
    tankStripe.rotation.x = 0.22;
    this.leanPivot.add(tankStripe);

    const emblemTex = createPokeTankEmblemTexture();
    const emblemMat = new THREE.MeshStandardMaterial({
      map: emblemTex,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
    });
    [-0.155, 0.155].forEach((ex) => {
      const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), emblemMat);
      emblem.position.set(ex, 0.68, -0.22);
      emblem.rotation.y = ex < 0 ? -Math.PI / 2 : Math.PI / 2;
      this.leanPivot.add(emblem);
    });

    // Side Body Fairing Wing Panels (Red + Pearl White Accent)
    [-0.155, 0.155].forEach((fx) => {
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.78), crimsonBodyMat);
      sidePanel.position.set(fx, 0.58, 0.30);
      sidePanel.rotation.x = -0.14;
      this.leanPivot.add(sidePanel);

      const whiteAccent = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.56), pearlWhiteMat);
      whiteAccent.position.set(fx, 0.63, 0.32);
      whiteAccent.rotation.x = -0.14;
      this.leanPivot.add(whiteAccent);
    });

    // Dual-level Ergonomic Rider & Pillion Seat
    const riderSeat = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.10, 0.42), seatLeatherMat);
    riderSeat.position.set(0, 0.71, 0.16);
    riderSeat.rotation.x = 0.06;
    this.leanPivot.add(riderSeat);

    const pillionSeat = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.10, 0.32), seatLeatherMat);
    pillionSeat.position.set(0, 0.78, 0.50);
    pillionSeat.rotation.x = -0.08;
    this.leanPivot.add(pillionSeat);

    // Chrome Rear Grab Handle
    const grabRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.032, 0.16), chromeMat);
    grabRail.position.set(0, 0.80, 0.74);
    grabRail.rotation.x = -0.12;
    this.leanPivot.add(grabRail);

    // 3b. PokeShip Express Rear Thermal Cargo Crate (mounted behind rider on pillion rack)
    this.deliveryCargoGroup = new THREE.Group();
    this.deliveryCargoGroup.visible = false;

    const rackPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.024, 0.34), matteChassisMat);
    rackPlate.position.set(0, 0.84, 0.60);
    this.deliveryCargoGroup.add(rackPlate);

    [-0.10, 0.10].forEach((bx) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.055, 0.22), chromeMat);
      bracket.position.set(bx, 0.815, 0.61);
      this.deliveryCargoGroup.add(bracket);
    });

    this.deliveryBoxBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.38,
      metalness: 0.18,
    });
    this.deliveryBoxLidMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.32,
      metalness: 0.22,
    });
    const cargoDecalMat = new THREE.MeshStandardMaterial({
      map: createPokeShipCargoDecalTexture(),
      roughness: 0.35,
      metalness: 0.12,
    });
    const cargoTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });

    const boxBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.30, 0.36), this.deliveryBoxBodyMat);
    boxBody.position.set(0, 1.00, 0.61);
    this.deliveryCargoGroup.add(boxBody);

    const boxLid = new THREE.Mesh(new THREE.BoxGeometry(0.385, 0.052, 0.385), this.deliveryBoxLidMat);
    boxLid.position.set(0, 1.168, 0.61);
    this.deliveryCargoGroup.add(boxLid);

    // Side & Rear Decal Plates
    [-0.183, 0.183].forEach((sx) => {
      const sideDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.21), cargoDecalMat);
      sideDecal.position.set(sx, 1.00, 0.61);
      sideDecal.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.deliveryCargoGroup.add(sideDecal);
    });
    const rearDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.21), cargoDecalMat);
    rearDecal.position.set(0, 1.00, 0.793);
    this.deliveryCargoGroup.add(rearDecal);

    // Metallic Latch Clasps & Rear Safety Reflector Strip
    [-0.11, 0.11].forEach((lx) => {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.048, 0.024), chromeMat);
      latch.position.set(lx, 1.135, 0.796);
      this.deliveryCargoGroup.add(latch);
    });
    const reflectorStrip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.028, 0.014), cargoTrimMat);
    reflectorStrip.position.set(0, 0.875, 0.796);
    this.deliveryCargoGroup.add(reflectorStrip);

    const topStrapHandle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), matteChassisMat);
    topStrapHandle.position.set(0, 1.202, 0.61);
    this.deliveryCargoGroup.add(topStrapHandle);

    this.leanPivot.add(this.deliveryCargoGroup);

    // Tail Light, Rear Fender & Plate
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.075, 0.06), this.taillightMat);
    taillight.position.set(0, 0.68, 0.80);
    this.leanPivot.add(taillight);

    const rearFender = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.22, 0.04), matteChassisMat);
    rearFender.position.set(0, 0.52, 0.84);
    rearFender.rotation.x = 0.34;
    this.leanPivot.add(rearFender);

    const plateMat = new THREE.MeshStandardMaterial({
      map: createLicensePlateTexture(),
      roughness: 0.35,
      metalness: 0.1,
    });
    const licensePlate = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.11, 0.015), plateMat);
    licensePlate.position.set(0, 0.51, 0.865);
    licensePlate.rotation.x = 0.34;
    this.leanPivot.add(licensePlate);

    // 4. Front Steering Fork Assembly (Pivots at neck Z = -0.44)
    this.steerPivot = new THREE.Group();
    this.steerPivot.position.set(0, 0, -0.44);
    this.leanPivot.add(this.steerPivot);

    // Front Wheel relative to steerPivot (wheel center at Z = -0.24 -> world local Z = -0.68)
    this.frontWheelSpin = buildWheelAssembly(0.255, 0.080);
    this.frontWheelSpin.position.set(0, 0.255, -0.24);
    this.steerPivot.add(this.frontWheelSpin);

    // Twin Telescopic Fork Tubes
    [-0.105, 0.105].forEach((fx) => {
      const lowerFork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 10), goldAlloyMat);
      lowerFork.position.set(fx, 0.42, -0.19);
      lowerFork.rotation.x = 0.34;
      this.steerPivot.add(lowerFork);

      const upperFork = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.38, 10), chromeMat);
      upperFork.position.set(fx, 0.68, -0.09);
      upperFork.rotation.x = 0.34;
      this.steerPivot.add(upperFork);
    });

    // Front Mudguard Fender
    const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.34), crimsonBodyMat);
    frontFender.position.set(0, 0.51, -0.24);
    frontFender.rotation.x = 0.22;
    this.steerPivot.add(frontFender);

    // Front Aero Fairing Cowl & Headlight Mask
    const frontCowl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.26), crimsonBodyMat);
    frontCowl.position.set(0, 0.77, -0.14);
    frontCowl.rotation.x = 0.32;
    this.steerPivot.add(frontCowl);

    const cowlBezel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), pearlWhiteMat);
    cowlBezel.position.set(0, 0.76, -0.27);
    cowlBezel.rotation.x = 0.32;
    this.steerPivot.add(cowlBezel);

    // Bright LED Headlight + Cyan DRL Strips
    const headlightLens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.04), this.headlightMat);
    headlightLens.position.set(0, 0.76, -0.29);
    headlightLens.rotation.x = 0.32;
    this.steerPivot.add(headlightLens);

    [-0.125, 0.125].forEach((dx) => {
      const drl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.04), this.drlMat);
      drl.position.set(dx, 0.78, -0.28);
      drl.rotation.x = 0.32;
      this.steerPivot.add(drl);
    });

    // Dark Smoked Sport Windscreen (positioned forward of instrument cluster so screen is 100% clear)
    const windscreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.24, 0.022),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.48,
      })
    );
    windscreen.position.set(0, 1.07, -0.175);
    windscreen.rotation.x = 0.68;
    this.steerPivot.add(windscreen);
    // Keep unused material reference valid cleanly
    void windshieldMat;

    // Lower Triple-Clamp Yoke & Split V-Riser Handlebars (leaves central LCD cluster completely unobstructed!)
    const yokeBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.036, 0.065), matteChassisMat);
    yokeBase.position.set(0, 0.90, -0.01);
    this.steerPivot.add(yokeBase);

    const stemCap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.028, 12), chromeMat);
    stemCap.position.set(0, 0.922, -0.01);
    this.steerPivot.add(stemCap);

    // Build Left & Right Angled V-Risers + Outboard Grip Bars + Levers + Mirrors
    const gripTargets: Array<{ side: -1 | 1; gx: number; gy: number; gz: number }> = [
      { side: -1, gx: -0.275, gy: 0.968, gz: 0.02 },
      { side: 1, gx: 0.275, gy: 0.968, gz: 0.02 },
    ];

    let leftLever!: THREE.Mesh;
    let rightLever!: THREE.Mesh;

    for (const { side, gx, gy, gz } of gripTargets) {
      // Angled riser strut from triple-clamp (side*0.055, 0.905, -0.01) up & out to inner grip (side*0.185, gy, gz)
      const startPt = new THREE.Vector3(side * 0.055, 0.905, -0.01);
      const endPt = new THREE.Vector3(side * 0.185, gy, gz);
      const riserVec = new THREE.Vector3().subVectors(endPt, startPt);
      const riserLen = riserVec.length();
      const riserMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.018, riserLen, 10),
        chromeMat
      );
      riserMesh.position.copy(startPt).addScaledVector(riserVec, 0.5);
      riserMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), riserVec.clone().normalize());
      this.steerPivot.add(riserMesh);

      // Outboard handlebar tube (only from inner collar side*0.175 out to bar-end side*0.365)
      const barEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.19, 12), chromeMat);
      barEnd.rotation.z = Math.PI / 2;
      barEnd.position.set(side * 0.27, gy, gz);
      this.steerPivot.add(barEnd);

      // Rubber Handlebar Grip + Gold Bar-End Weight
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.145, 14), rubberTireMat);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(gx, gy, gz);
      this.steerPivot.add(grip);

      const barWeight = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.021, 0.024, 12), goldAlloyMat);
      barWeight.rotation.z = Math.PI / 2;
      barWeight.position.set(side * 0.358, gy, gz);
      this.steerPivot.add(barWeight);

      // Control switch pod inside the grip
      const switchPod = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.048, 0.052), matteChassisMat);
      switchPod.position.set(side * 0.185, gy, gz);
      this.steerPivot.add(switchPod);

      // Brake / Clutch Lever (pivots at switchPod side)
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.012, 0.018), chromeMat);
      lever.position.set(side * 0.245, gy - 0.008, gz - 0.046);
      lever.rotation.y = side < 0 ? 0.16 : -0.16;
      this.steerPivot.add(lever);
      if (side < 0) leftLever = lever;
      else rightLever = lever;

      // Mirror stalk & mirror housing
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), matteChassisMat);
      stalk.position.set(side * 0.215, gy + 0.075, gz - 0.02);
      stalk.rotation.z = side < 0 ? 0.34 : -0.34;
      this.steerPivot.add(stalk);

      const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.068, 0.025), matteChassisMat);
      mirrorHousing.position.set(side * 0.268, gy + 0.148, gz - 0.02);
      mirrorHousing.rotation.y = side < 0 ? 0.18 : -0.18;
      this.steerPivot.add(mirrorHousing);

      const mirrorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.11, 0.054),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.08 })
      );
      mirrorGlass.position.set(side * 0.268, gy + 0.148, gz - 0.005);
      mirrorGlass.rotation.y = side < 0 ? 0.18 : -0.18;
      this.steerPivot.add(mirrorGlass);
    }

    this.leftLeverMesh = leftLever;
    this.rightLeverMesh = rightLever;

    // Live Digital TFT LCD Dashboard Screen (Elevated cleanly ABOVE triple clamp & tilted toward rider eyes!)
    this.dashCanvas = document.createElement('canvas');
    this.dashCanvas.width = 384;
    this.dashCanvas.height = 192;
    this.dashCtx = this.dashCanvas.getContext('2d')!;
    drawDashboardCanvas(this.dashCtx, 0, 'P', true);

    this.dashTexture = new THREE.CanvasTexture(this.dashCanvas);
    this.dashTexture.colorSpace = THREE.SRGBColorSpace;
    this.dashTexture.anisotropy = 4;

    const dashCluster = new THREE.Group();
    dashCluster.position.set(0, 1.028, -0.078);
    dashCluster.rotation.x = -0.62;
    this.steerPivot.add(dashCluster);

    const dashHousing = new THREE.Mesh(new THREE.BoxGeometry(0.228, 0.118, 0.03), matteChassisMat);
    dashCluster.add(dashHousing);

    // Anti-glare visor brow above top edge of instrument cluster
    const dashBrow = new THREE.Mesh(new THREE.BoxGeometry(0.232, 0.014, 0.048), matteChassisMat);
    dashBrow.position.set(0, 0.062, 0.012);
    dashCluster.add(dashBrow);

    const dashScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.21, 0.102),
      new THREE.MeshBasicMaterial({ map: this.dashTexture })
    );
    dashScreen.position.set(0, 0, 0.017);
    dashCluster.add(dashScreen);

    // 5. Rider Arms & Gloved Hands Gripping Both Handlebars (visible while mounted!)
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.62 });
    const cuffWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.72 });
    const knuckleGuardMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.35 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfce7f3, roughness: 0.55 });

    const buildRiderHand = (side: -1 | 1): THREE.Group => {
      const hand = new THREE.Group();

      // Wrist skin joint + glove cuff
      const wristSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.027, 0.04, 12), skinMat);
      wristSkin.rotation.x = Math.PI / 2;
      wristSkin.position.set(0, 0.008, 0.048);
      hand.add(wristSkin);

      const glovePalm = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.032, 0.068), gloveMat);
      glovePalm.position.set(0, 0.024, 0.004);
      hand.add(glovePalm);

      // Sport knuckle armor + red accent stripe
      const knuckleGuard = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.018, 0.022), knuckleGuardMat);
      knuckleGuard.position.set(0, 0.040, -0.008);
      hand.add(knuckleGuard);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.006, 0.016), crimsonBodyMat);
      stripe.position.set(0, 0.042, 0.02);
      hand.add(stripe);

      // 4 Curled Fingers wrapping front & underside of the rubber grip
      for (let fi = 0; fi < 4; fi++) {
        const fxOffset = (fi - 1.5) * 0.020;
        const fingerTop = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.022, 0.036), gloveMat);
        fingerTop.position.set(fxOffset, 0.018, -0.032);
        fingerTop.rotation.x = 0.58;
        hand.add(fingerTop);

        const fingerTip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.028, 0.018), gloveMat);
        fingerTip.position.set(fxOffset, -0.006, -0.034);
        fingerTip.rotation.x = -0.32;
        hand.add(fingerTip);
      }

      // Thumb wrapped inward around the inner end of the grip
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.046), gloveMat);
      thumb.position.set(-side * 0.048, 0.006, -0.004);
      thumb.rotation.y = side * 0.35;
      hand.add(thumb);

      // Wristwatch on Left Wrist!
      if (side === -1) {
        const watchBand = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.018, 12), chromeMat);
        watchBand.rotation.x = Math.PI / 2;
        watchBand.position.set(0, 0.008, 0.045);
        hand.add(watchBand);
        const watchFace = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.024), goldAlloyMat);
        watchFace.position.set(0, 0.035, 0.045);
        hand.add(watchFace);
      }

      return hand;
    };

    this.leftHandGroup = buildRiderHand(-1);
    this.leftHandGroup.position.set(-0.275, 0.968, 0.02);
    this.steerPivot.add(this.leftHandGroup);

    this.rightHandGroup = buildRiderHand(1);
    this.rightHandGroup.position.set(0.275, 0.968, 0.02);
    this.steerPivot.add(this.rightHandGroup);

    // Forearms/Jacket Sleeves bridging shoulder anchor -> wrist (in leanPivot space, oriented along +Z local axis of pivot)
    this.riderArmsGroup = new THREE.Group();
    this.leanPivot.add(this.riderArmsGroup);

    const buildSleeveSegment = (): { pivot: THREE.Group; meshGroup: THREE.Group } => {
      const pivot = new THREE.Group();
      const meshGroup = new THREE.Group();

      // Unit-length arm oriented from Z = 0 (shoulder) to Z = +1 (wrist), scaled dynamically by Z!
      const sleeveMesh = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.88), jacketMat);
      sleeveMesh.position.set(0, 0, 0.44);
      meshGroup.add(sleeveMesh);

      const shirtCuff = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.092, 0.10), cuffWhiteMat);
      shirtCuff.position.set(0, 0, 0.91);
      meshGroup.add(shirtCuff);

      pivot.add(meshGroup);
      return { pivot, meshGroup };
    };

    const leftArmBuilt = buildSleeveSegment();
    this.leftArmPivot = leftArmBuilt.pivot;
    this.leftArmMesh = leftArmBuilt.meshGroup;
    this.riderArmsGroup.add(this.leftArmPivot);

    const rightArmBuilt = buildSleeveSegment();
    this.rightArmPivot = rightArmBuilt.pivot;
    this.rightArmMesh = rightArmBuilt.meshGroup;
    this.riderArmsGroup.add(this.rightArmPivot);

    // Initially hidden when parked unoccupied
    this.leftHandGroup.visible = false;
    this.rightHandGroup.visible = false;
    this.riderArmsGroup.visible = false;
  }

  /**
   * Computes smooth citywide ground elevation:
   * - All asphalt roads sit at Y = -0.26
   * - All sidewalks, plazas, parks, and open aprons sit at Y = 0.0
   */
  public static getExteriorGroundY(x: number, z: number): number {
    // 0. Far-West Ngã 3 Ven Biển, Đường Ven Biển Võ Nguyên Giáp, Promenade, Sloped Golden Sand & Ocean Swim Floor
    if (x < -960.0) {
      const coastY = getWestCoastalGroundY(x, z);
      if (coastY !== null) return coastY;
    }
    // 1. Main East-West 4-Lane Boulevard (Z = 20.80..37.20)
    if (z >= 20.8 && z <= 37.2 && x >= -965.0 && x <= 564.0) {
      return -0.26;
    }
    // 2. West Intersection North-South Avenue (X = -235.9..-219.1) connecting Đường Ven Sông Bạch Đằng Tây (Z = -153.4) <-> Đường Bạch Đằng <-> Đại Lộ Nam 6 (Z = 352.4)
    if (x >= -235.9 && x <= -219.1 && z >= -153.4 && z <= 352.4) {
      return -0.26;
    }
    // 2b. Flush sloped asphalt transition ramps at X = 99.7..105.0 joining South-Central Residential (+0.035) <-> Vinhomes Crossroads (-0.26)
    if (x > 99.7 && x < 105.0 && ((z >= 139.6 && z <= 156.4) || (z >= 335.6 && z <= 352.4))) {
      return 0.035 - ((x - 99.7) / 5.3) * 0.295;
    }
    // 3. East Intersection North-South Avenue / Phố Đi Bộ / Vinhomes Ocean Park Shophouse Boulevard (X = 185.1..201.9)
    if (x >= 185.1 && x <= 201.9 && z >= -109.1 && z <= 428.0) {
      return -0.26;
    }
    // 3b. Ngã Tư Vinhomes Ocean Park East-West Crossroad (Z = 139.8..156.2, X = 105.0..564.0)
    if (z >= 139.8 && z <= 156.2 && x >= 105.0 && x <= 564.0) {
      return -0.26;
    }
    // 3c. Ngã Tư Nam Vinhomes East-West Crossroad (Z = 335.6..352.4, X = 105.0..564.0)
    if (z >= 335.6 && z <= 352.4 && x >= 105.0 && x <= 564.0) {
      return -0.26;
    }
    // 4. Far-East Intersection North-South Avenue / Đường Sơn Tây (X = 361.6..378.4)
    if (x >= 361.6 && x <= 378.4 && z >= -109.1 && z <= 145.0) {
      return -0.26;
    }
    // 4b. Ngã Tư DIOR North-South Avenue / Đại Lộ Paris (X = 494.6..511.4, Z = -109.1..125.0)
    if (x >= 494.6 && x <= 511.4 && z >= -109.1 && z <= 125.0) {
      return -0.26;
    }
    // 5. Đường Bạch Đằng Waterfront, Đường Ven Sông Bạch Đằng Tây, Cầu Sông Hàn, Cầu Rồng, Cầu Trần Thị Lý, and Ngã Tư Bờ Bắc (Z <= -109.1)
    if (
      z <= -109.1 &&
      (z >= -135.0 ? x >= -241.0 : z >= -165.5 ? x >= -960.0 : x >= 75.0)
    ) {
      return getHanRiverExteriorGroundY(x, z);
    }
    return 0.0;
  }

  /**
   * Prevents driving the motorbike inside narrow enclosed shop interiors while keeping
   * the entire city road network, sidewalks, plazas, Phố Đi Bộ, parks, and waterfront open.
   */
  private isBikeForbiddenZone(x: number, z: number): boolean {
    // Block driving inside Pokémon Card Shop / Grading Lab / Steakhouse / Porsche interiors (leave Đường Bạch Đằng Z <= -104.0 open!)
    if (x >= -149.0 && x <= 85.0 && z < 15.65 && z > -104.0) {
      return true;
    }
    // Block driving inside RON PICKLEBALL Pro-Shop & Courts (keep outside sidewalk open)
    if (x >= 85.0 && x <= 144.2 && z < 15.65 && z > -103.0) {
      return true;
    }
    // Block driving inside North Boulevard bars/venues (keep Phố Đi Bộ X = 180.0..207.0 open, plus Vietcombank plaza curb Z >= 14.2)
    if (x >= 146.5 && x < 179.8 && z > -104.0 && z < 15.5) {
      return true;
    }
    if (x > 207.2 && x <= 356.2 && z > -104.0 && z < 15.35) {
      return true;
    }
    // Block driving inside Police HQ interior
    if (x >= -191.2 && x <= -173.8 && z >= -25.0 && z <= 8.9) {
      return true;
    }
    // Block driving inside Landmark 81 interior & AEON Mall interior & Hospital interior
    if (x >= -13.0 && x <= 13.0 && z >= 46.2 && z <= 64.8) {
      return true;
    }
    if (x >= 111.8 && x <= 144.2 && z >= 45.4 && z <= 91.2) {
      return true;
    }
    if (x >= -296.5 && x <= -245.5 && z >= 54.4 && z <= 90.5) {
      return true;
    }
    // Block driving inside walkable neighborhood eatery/repair interiors while keeping yards, alleys, and Đường Nội Khu open
    if (isInsideWestBikeForbiddenShop(x, z)) {
      return true;
    }
    // Block driving inside FAHASA Bookstore indoor hall & narrow food kiosk interiors (keep Phố Ăn Vặt, Hẻm Đèn Lồng, Fountain Plaza, Skatepark & Sân Bóng Rổ 3x3 open!)
    if (x >= -391.4 && x <= -364.6 && z >= 48.2 && z <= 87.8) {
      return true;
    }
    if (
      ((x >= -423.7 && x <= -418.1) || (x >= -401.9 && x <= -396.3)) &&
      ((z >= 49.2 && z <= 57.8) || (z >= 65.2 && z <= 73.8))
    ) {
      return true;
    }
    // Block driving into Grand Residences open pit ramp (X=-95.2..-86.8, Z=15.8..22.1)
    if (x >= -95.6 && x <= -86.4 && z >= 15.6 && z <= 22.4) {
      return true;
    }
    // Block driving inside Prada Flagship Boutique interior (keep front apron & Ngã Tư DIOR open)
    if (x >= 461.6 && x <= 487.6 && z >= 46.2 && z <= 70.2) {
      return true;
    }
    // Block driving inside VPBank Branch & 24h ATM Booth (keep Đường Sơn Tây Nam sidewalk X = 378.2..385.8 open)
    if (x >= 385.8 && x <= 409.5 && z >= 72.8 && z <= 109.5) {
      return true;
    }
    return false;
  }

  private clampBikeBounds(cx: number, cz: number): { x: number; z: number; clamped: boolean } {
    return clampMotorbikeExteriorBounds(cx, cz);
  }

  private canBikeStandAt(nx: number, nz: number, env: MotorbikeEnvironmentCheck): boolean {
    if (this.isBikeForbiddenZone(nx, nz)) return false;
    const bounded = this.clampBikeBounds(nx, nz);
    if (Math.abs(bounded.x - nx) > 0.01 || Math.abs(bounded.z - nz) > 0.01) return false;
    // Check bike hitbox footprint along front and rear axles
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    if (env.checkCollider(nx + fx * 0.58, nz + fz * 0.58, 0.36)) return false;
    if (env.checkCollider(nx - fx * 0.58, nz - fz * 0.58, 0.36)) return false;
    return !env.checkCollider(nx, nz, 0.42);
  }

  public getDistanceTo(px: number, py: number, pz: number): number {
    if (Math.abs(py - this.y) > 2.2) return Infinity;
    return Math.hypot(px - this.x, pz - this.z);
  }

  public mount(currentFloor: 1 | 2): boolean {
    if (this.isMounted || currentFloor !== 1) return false;
    this.isMounted = true;
    this.riderLookYawOffset = 0;
    return true;
  }

  /**
   * Dismounts the player safely beside the parked motorbike without trapping inside colliders.
   */
  public dismount(env: MotorbikeEnvironmentCheck): { x: number; y: number; z: number; yaw: number } {
    this.isMounted = false;
    this.riderLookYawOffset = 0;

    // Candidate offsets relative to bike heading: Left, Right, Rear, Front
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);

    const candidates = [
      { cx: this.x - rx * 1.15, cz: this.z - rz * 1.15 },
      { cx: this.x + rx * 1.15, cz: this.z + rz * 1.15 },
      { cx: this.x - fx * 1.45, cz: this.z - fz * 1.45 },
      { cx: this.x + fx * 1.45, cz: this.z + fz * 1.45 },
    ];

    let chosenX = this.x;
    let chosenZ = this.z;
    for (const c of candidates) {
      if (!env.checkCollider(c.cx, c.cz, 0.38)) {
        chosenX = c.cx;
        chosenZ = c.cz;
        break;
      }
    }

    const groundY = PlayerMotorbikeController.getExteriorGroundY(chosenX, chosenZ);
    return { x: chosenX, y: groundY, z: chosenZ, yaw: this.yaw };
  }

  public toggleCameraView(): 'cockpit' | 'chase' {
    this.cameraView = this.cameraView === 'cockpit' ? 'chase' : 'cockpit';
    return this.cameraView;
  }

  public setDeliveryCargoVisible(visible: boolean, isVip: boolean = false): void {
    this.deliveryCargoGroup.visible = visible;
    if (visible) {
      if (isVip) {
        this.deliveryBoxBodyMat.color.setHex(0x1e1b4b);
        this.deliveryBoxLidMat.color.setHex(0xf59e0b);
      } else {
        this.deliveryBoxBodyMat.color.setHex(0x0284c7);
        this.deliveryBoxLidMat.color.setHex(0xf97316);
      }
    }
  }

  public update(
    delta: number,
    inputs: MotorbikeDriveInputs,
    lampFactor: number,
    env: MotorbikeEnvironmentCheck,
    trafficCoordinator?: CityTrafficCoordinator
  ): { isThrottle: boolean; collidedTraffic: boolean } {
    let isThrottle = false;
    let isBraking = false;
    let collidedTraffic = false;

    if (this.isMounted) {
      const accelInput = (inputs.throttle ? 1 : 0) - (inputs.brakeReverse ? 1 : 0) - inputs.joyY * 0.9;
      const steerInput = THREE.MathUtils.clamp(
        (inputs.steerLeft ? 1 : 0) - (inputs.steerRight ? 1 : 0) - inputs.joyX,
        -1,
        1
      );

      const maxForwardSpeed = inputs.boost ? 20.5 : 13.8; // ~74 km/h sport boost, ~50 km/h normal
      const maxReverseSpeed = -4.2;

      if (accelInput > 0.08) {
        isThrottle = true;
        if (this.speed < 0) {
          this.speed = Math.min(0, this.speed + 26.0 * delta);
        } else {
          const accelRate = inputs.boost ? 14.5 : 10.5;
          this.speed = Math.min(maxForwardSpeed, this.speed + accelRate * accelInput * delta);
        }
      } else if (accelInput < -0.08) {
        if (this.speed > 0.35) {
          isBraking = true;
          this.speed = Math.max(0, this.speed - 25.0 * Math.abs(accelInput) * delta);
        } else {
          this.speed = Math.max(maxReverseSpeed, this.speed - 6.5 * Math.abs(accelInput) * delta);
        }
      } else {
        // Gentle engine braking / coasting drag
        const drag = Math.abs(this.speed) > 4.0 ? 5.2 : 4.2;
        if (this.speed > 0) this.speed = Math.max(0, this.speed - drag * delta);
        else if (this.speed < 0) this.speed = Math.min(0, this.speed + drag * delta);
      }

      // Handlebar visual & steering rate
      const targetSteer = steerInput * 0.44;
      this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, 11.0, delta);

      const absSpd = Math.abs(this.speed);
      const speedTurnScale =
        absSpd > 0.25 ? THREE.MathUtils.clamp(absSpd / 4.2, 0.32, 1.0) : 0.38;
      const dirSign = this.speed >= -0.05 ? 1 : -1;
      const turnRate = 1.95 * speedTurnScale * dirSign;
      this.yaw += steerInput * turnRate * delta;

      // Gently re-center free-look angle while accelerating
      if (absSpd > 2.5 && Math.abs(this.riderLookYawOffset) > 0.001) {
        this.riderLookYawOffset = THREE.MathUtils.damp(this.riderLookYawOffset, 0, 2.2, delta);
      }

      // Compute candidate displacement along heading (-sin(yaw), -cos(yaw))
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const stepDist = this.speed * delta;

      if (Math.abs(stepDist) > 0.0001) {
        let nextX = this.x + fx * stepDist;
        let nextZ = this.z + fz * stepDist;

        // Check active city traffic vehicles so player motorbike doesn't ghost inside AI buses/taxis
        if (trafficCoordinator && Math.abs(this.speed) > 0.15) {
          const moveDirX = this.speed >= 0 ? fx : -fx;
          const moveDirZ = this.speed >= 0 ? fz : -fz;
          const clr = trafficCoordinator.getForwardClearance({
            id: 'player_motorbike',
            x: this.x,
            y: this.y,
            z: this.z,
            moveDirX,
            moveDirZ,
            halfW: 0.44,
            halfL: 1.02,
            lookahead: 1.65,
            minGap: 0.35,
            latMargin: 0.15,
            priority: 10,
          });
          if (clr.closestGap <= 0.16 && stepDist > 0 && Math.abs(steerInput) < 0.25) {
            this.speed *= 0.28;
            collidedTraffic = true;
          } else if (clr.closestGap <= 0.34 && stepDist > 0) {
            this.speed *= 0.76;
          }
        }

        if (!collidedTraffic) {
          if (this.canBikeStandAt(nextX, nextZ, env)) {
            this.x = nextX;
            this.z = nextZ;
          } else {
            // Smooth wall sliding along X or Z independently so curbs/poles never hard-lock
            const canSlideX = this.canBikeStandAt(nextX, this.z, env);
            const canSlideZ = this.canBikeStandAt(this.x, nextZ, env);
            if (canSlideX) {
              this.x = nextX;
              this.speed *= 0.72;
            } else if (canSlideZ) {
              this.z = nextZ;
              this.speed *= 0.72;
            } else {
              this.speed = 0;
            }
          }
        }
      }

      // Dynamic lean-in roll & throttle/brake pitch
      const leanFactor = THREE.MathUtils.clamp(absSpd / 11.0, 0.0, 1.0);
      const targetLean = steerInput * 0.25 * leanFactor;
      this.leanAngle = THREE.MathUtils.damp(this.leanAngle, targetLean, 9.5, delta);

      const onBridgeSpan =
        (this.x >= 183.8 && this.x <= 203.2) ||
        (this.x >= 355.0 && this.x <= 385.0) ||
        (this.x >= 493.0 && this.x <= 513.0);
      const slopeDz = onBridgeSpan ? getHanRiverBridgeSlopeDz(this.z) : 0;
      const slopePitch = Math.atan(slopeDz * -Math.cos(this.yaw));
      const accelDelta = (this.speed - this.prevWheelSpeed) / Math.max(0.005, delta);
      const targetPitch =
        slopePitch + THREE.MathUtils.clamp(accelDelta * 0.0042, -0.055, 0.055);
      this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, targetPitch, 10.0, delta);
    } else {
      // Parked deceleration & auto kickstand down
      this.speed = THREE.MathUtils.damp(this.speed, 0, 12.0, delta);
      if (Math.abs(this.speed) < 0.03) this.speed = 0;
      this.steerAngle = THREE.MathUtils.damp(this.steerAngle, 0.14, 7.0, delta);
      this.leanAngle = THREE.MathUtils.damp(this.leanAngle, 0.09, 7.0, delta); // slight rest lean on kickstand!
      const onBridgeSpan =
        (this.x >= 183.8 && this.x <= 203.2) ||
        (this.x >= 355.0 && this.x <= 385.0) ||
        (this.x >= 493.0 && this.x <= 513.0);
      const slopeDz = onBridgeSpan ? getHanRiverBridgeSlopeDz(this.z) : 0;
      const slopePitch = Math.atan(slopeDz * -Math.cos(this.yaw));
      this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, slopePitch, 8.0, delta);
    }

    this.prevWheelSpeed = this.speed;

    // Smooth ground height damping (road -0.26 <-> sidewalk 0.0 <-> Cầu Sông Hàn deck +3.20)
    const targetGroundY = PlayerMotorbikeController.getExteriorGroundY(this.x, this.z);
    const groundFollowRate = Math.abs(targetGroundY - this.y) > 0.02 ? 26.0 : 20.0;
    this.y = THREE.MathUtils.damp(this.y, targetGroundY, groundFollowRate, delta);

    // Kickstand folds up cleanly when mounted
    const targetKickstand = this.isMounted ? 0.0 : -0.46;
    this.kickstandAngle = THREE.MathUtils.damp(this.kickstandAngle, targetKickstand, 12.0, delta);

    // Spin both wheels proportionally to distance rolled (-X rotation rolls toward -Z forward!)
    const wheelDeltaRot = (this.speed * delta) / 0.255;
    this.frontWheelSpin.rotation.x -= wheelDeltaRot;
    this.rearWheelSpin.rotation.x -= wheelDeltaRot;

    // Apply transforms cleanly
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    this.leanPivot.rotation.z = this.leanAngle;
    this.leanPivot.rotation.x = this.pitchAngle;
    this.steerPivot.rotation.y = this.steerAngle;
    this.kickstandPivot.rotation.z = this.kickstandAngle;

    // Update Rider Hands, Throttle Twist, Brake Lever Pull & Articulated Sleeves (1st-person cockpit only; 3rd-person chase uses playerMesh)
    const showRiderHands = this.isMounted && this.cameraView === 'cockpit';
    this.leftHandGroup.visible = showRiderHands;
    this.rightHandGroup.visible = showRiderHands;
    this.riderArmsGroup.visible = showRiderHands;

    if (showRiderHands) {
      const targetTwist = isThrottle ? -0.22 : 0.0;
      const targetPull = isBraking ? 0.18 : 0.0;
      this.throttleGripTwist = THREE.MathUtils.damp(this.throttleGripTwist, targetTwist, 12.0, delta);
      this.brakeLeverPull = THREE.MathUtils.damp(this.brakeLeverPull, targetPull, 14.0, delta);

      this.rightHandGroup.rotation.x = this.throttleGripTwist;
      this.leftLeverMesh.rotation.y = 0.16 - this.brakeLeverPull;
      this.rightLeverMesh.rotation.y = -0.16 + this.brakeLeverPull;

      // Align jacket sleeves cleanly from shoulders (in leanPivot) to rotating wrist points on steerPivot
      const sinS = Math.sin(this.steerAngle);
      const cosS = Math.cos(this.steerAngle);
      const updateArm = (
        side: -1 | 1,
        armPivot: THREE.Group,
        armMesh: THREE.Group
      ) => {
        // Shoulder position inside leanPivot (matches both cockpit edge of view & seated playerMesh shoulders)
        const shX = side * 0.295;
        const shY = this.cameraView === 'cockpit' ? 1.21 : 1.18;
        const shZ = this.cameraView === 'cockpit' ? 0.21 : 0.12;

        // Wrist target relative to steerPivot (right behind gloved wrist) -> rotated into leanPivot
        const lx = side * 0.275;
        const ly = 0.974;
        const lz = 0.068;
        const wx = lx * cosS + lz * sinS;
        const wz = -0.44 - lx * sinS + lz * cosS;

        _armShoulderVec.set(shX, shY, shZ);
        _armWristVec.set(wx, ly, wz);
        const dist = _armShoulderVec.distanceTo(_armWristVec);

        armPivot.position.copy(_armShoulderVec);
        _armDirVec.subVectors(_armWristVec, _armShoulderVec).normalize();
        armPivot.quaternion.setFromUnitVectors(_armZAxis, _armDirVec);
        armMesh.scale.set(1, 1, Math.max(0.25, dist));
      };

      updateArm(-1, this.leftArmPivot, this.leftArmMesh);
      updateArm(1, this.rightArmPivot, this.rightArmMesh);
    }

    // Update Headlight, DRL, Brake Light & Night Beam Projection
    const activeLamp = this.isMounted ? Math.max(0.35, lampFactor) : lampFactor * 0.45;
    this.headlightMat.emissiveIntensity = this.isMounted ? 1.8 + lampFactor * 1.4 : lampFactor * 0.7;
    this.drlMat.emissiveIntensity = this.isMounted ? 1.5 : 0.2 + lampFactor * 0.5;
    this.taillightMat.emissiveIntensity = isBraking
      ? 3.2
      : this.isMounted
        ? 1.1 + lampFactor * 0.7
        : 0.18 + lampFactor * 0.5;
    this.headlightBeamMat.opacity = this.isMounted ? Math.max(0.08, lampFactor * 0.68) : 0.0;
    this.headlightBeamMesh.visible = this.headlightBeamMat.opacity > 0.02;

    // Update Traffic Coordinator so AI cars/taxis/buses yield to the player motorbike
    if (trafficCoordinator) {
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      trafficCoordinator.updateVehicle({
        id: 'player_motorbike',
        kind: 'motorbike',
        x: this.x,
        y: this.y,
        z: this.z,
        fwdX: fx,
        fwdZ: fz,
        halfW: 0.44,
        halfL: 1.02,
        speed: Math.abs(this.speed),
        isStoppedOrParked: !this.isMounted || Math.abs(this.speed) < 0.25,
        priority: 10,
        active: true,
      });
    }

    // Update live 3D LCD Dashboard Texture (only redraw when integer km/h or gear changes)
    const kmh = Math.round(Math.abs(this.speed) * 3.6);
    const gear: 'P' | 'N' | 'D' | 'R' | 'S' = !this.isMounted
      ? 'P'
      : this.speed < -0.15
        ? 'R'
        : inputs.boost && this.speed > 1.0
          ? 'S'
          : Math.abs(this.speed) >= 0.25
            ? 'D'
            : 'N';
    const dashKey = `${kmh}_${gear}_${activeLamp > 0.3 ? 1 : 0}`;
    if (dashKey !== this.lastDashKey) {
      this.lastDashKey = dashKey;
      drawDashboardCanvas(this.dashCtx, kmh, gear, this.isMounted);
      this.dashTexture.needsUpdate = true;
    }

    return { isThrottle, collidedTraffic };
  }

  public getCameraPose(playerPitch: number): {
    posX: number;
    posY: number;
    posZ: number;
    lookAtX: number;
    lookAtY: number;
    lookAtZ: number;
    useLookAt: boolean;
    yaw: number;
    pitch: number;
  } {
    const viewYaw = this.yaw + this.riderLookYawOffset;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);

    if (this.cameraView === 'chase') {
      const backDist = 3.25;
      const lookFwd = 4.2;
      const lookYaw = this.yaw + this.riderLookYawOffset;
      const lfx = -Math.sin(lookYaw);
      const lfz = -Math.cos(lookYaw);
      const pitchShift = Math.sin(playerPitch) * 2.1;

      const camX = this.x - lfx * backDist;
      const camY = this.y + 1.85 - pitchShift * 0.45;
      const camZ = this.z - lfz * backDist;
      return {
        posX: camX,
        posY: camY,
        posZ: camZ,
        lookAtX: this.x + lfx * lookFwd,
        lookAtY: this.y + 0.92 + pitchShift * 0.35,
        lookAtZ: this.z + lfz * lookFwd,
        useLookAt: true,
        yaw: lookYaw,
        pitch: playerPitch,
      };
    }

    // 1st-person Cockpit Rider View: perched cleanly above the saddle (+0.18m rear local) looking over handlebars & digital dash!
    const saddleBackOffset = 0.24;
    const camX = this.x - fx * saddleBackOffset;
    const camY = this.y + 1.44;
    const camZ = this.z - fz * saddleBackOffset;

    return {
      posX: camX,
      posY: camY,
      posZ: camZ,
      lookAtX: camX + fx * 5,
      lookAtY: camY,
      lookAtZ: camZ + fz * 5,
      useLookAt: false,
      yaw: viewYaw,
      pitch: playerPitch,
    };
  }

  public getMountedPlayerSeatWorldPos(): {
    x: number;
    y: number;
    z: number;
    yaw: number;
    leanAngle: number;
    pitchAngle: number;
    steerAngle: number;
  } {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    // Saddle top sits at local Y = 0.76m, Z = +0.16m; shift laterally with leanPivot roll
    const seatLocalY = 0.76;
    const leanLatOffset = -seatLocalY * Math.sin(this.leanAngle);
    return {
      x: this.x - fx * 0.16 + rx * leanLatOffset,
      y: this.y + seatLocalY * Math.cos(this.leanAngle),
      z: this.z - fz * 0.16 + rz * leanLatOffset,
      yaw: this.yaw,
      leanAngle: this.leanAngle,
      pitchAngle: this.pitchAngle,
      steerAngle: this.steerAngle,
    };
  }

  public buildHudStateIfChanged(
    playerX: number,
    playerY: number,
    playerZ: number,
    currentFloor: 1 | 2,
    isCarryingSomething: boolean
  ): PlayerMotorbikeHudState | null {
    const dist = this.getDistanceTo(playerX, playerY, playerZ);
    const nearBike = currentFloor === 1 && dist <= 3.1;
    const canMount = nearBike && !this.isMounted && !isCarryingSomething;
    const speedKmh = Math.round(Math.abs(this.speed) * 3.6);
    const gear: 'P' | 'N' | 'D' | 'R' | 'S' = !this.isMounted
      ? 'P'
      : this.speed < -0.15
        ? 'R'
        : speedKmh >= 50
          ? 'S'
          : speedKmh >= 1
            ? 'D'
            : 'N';
    const key = `${nearBike ? 1 : 0}_${canMount ? 1 : 0}_${this.isMounted ? 1 : 0}_${speedKmh}_${gear}_${this.cameraView}`;
    if (key === this.lastHudEmitKey) return null;
    this.lastHudEmitKey = key;

    return {
      nearBike,
      canMount,
      isRiding: this.isMounted,
      speedKmh,
      gear,
      headlightOn: this.headlightOn,
      cameraView: this.cameraView,
      bikeX: this.x,
      bikeZ: this.z,
    };
  }
}

export function clampMotorbikeExteriorBounds(
  cx: number,
  cz: number
): { x: number; z: number; clamped: boolean } {
  let x = THREE.MathUtils.clamp(cx, WEST_COAST_BIKE_MIN_X, 563.4);
  let z = cz;
  if (x < -960.0) {
    // Ngã 3 Ven Biển, Đường Ven Biển Võ Nguyên Giáp & Oceanfront Promenade (motorbikes can ride & park on promenade, not on sand/water)
    z = THREE.MathUtils.clamp(z, WEST_COAST_ROAD_MIN_Z + 1.0, WEST_COAST_ROAD_MAX_Z - 1.0);
    return { x, z, clamped: Math.abs(x - cx) > 0.001 || Math.abs(z - cz) > 0.001 };
  }
  // Đường Ven Sông Bạch Đằng Tây & Bờ Kè Ven Sông Tây (X = -960..-214, Z = -165..-133.2)
  // Opens South directly into all 6 Row N4 residential alleys & Công Viên Tổ 7 riverfront gate!
  if (x >= -960.0 && x <= -214.0 && z >= -165.5 && z < -133.2) {
    z = Math.max(-164.0, z);
    if (x < -240.4 && !isInWestRiverResidentialOpening(x, -0.25)) {
      z = Math.min(-134.4, z);
    }
    return { x, z, clamped: Math.abs(x - cx) > 0.001 || Math.abs(z - cz) > 0.001 };
  }
  if ((z <= -345.2 && x >= 75.0) || (z <= -104.2 && x >= -241.0)) {
    if (z <= -345.2) {
      // North Bank & Ngã Tư Trần Hưng Đạo – Cầu Sông Hàn / Cầu Rồng / Cầu Trần Thị Lý
      if (z < -377.2) {
        if (x > 435.0) {
          x = THREE.MathUtils.clamp(x, 489.6, 516.4);
        } else if (x > 280.0) {
          x = THREE.MathUtils.clamp(x, 356.6, 383.4);
        } else {
          x = THREE.MathUtils.clamp(x, 180.4, 206.6);
        }
        z = Math.max(-457.2, z);
      } else {
        x = THREE.MathUtils.clamp(x, 76.6, 569.4);
        const onHanBridgeTop = x >= 183.4 && x <= 203.6;
        const onDragonBridgeTop = x >= 358.5 && x <= 381.5;
        const onTranThiLyBridgeTop = x >= 489.45 && x <= 516.55;
        if (!onHanBridgeTop && !onDragonBridgeTop && !onTranThiLyBridgeTop) {
          z = Math.min(-345.8, z);
        }
      }
    } else if (z < -133.5) {
      // Viewing Pier (X=140.5..151.5), Cầu Sông Hàn (183.4..203.6), widened Cầu Rồng, or widened Cầu Trần Thị Lý
      if (x >= 139.0 && x <= 153.5 && z >= -141.5) {
        x = THREE.MathUtils.clamp(x, 140.5, 151.5);
        z = Math.max(-141.0, z);
      } else if (x > 435.0) {
        const ttlSafeHalfW = Math.max(8.8, getTranThiLyBridgeOuterHalfW(z) - 0.55);
        x = THREE.MathUtils.clamp(x, TRAN_THI_LY_BRIDGE_CENTER_X - ttlSafeHalfW, TRAN_THI_LY_BRIDGE_CENTER_X + ttlSafeHalfW);
      } else if (x > 280.0) {
        const dragonSafeHalfW = Math.max(8.8, getDragonBridgeOuterHalfW(z) - 0.6);
        x = THREE.MathUtils.clamp(x, DRAGON_BRIDGE_CENTER_X - dragonSafeHalfW, DRAGON_BRIDGE_CENTER_X + dragonSafeHalfW);
      } else {
        x = THREE.MathUtils.clamp(x, 183.4, 203.6);
      }
    } else {
      // Đường Bạch Đằng & Bờ Kè Sông Hàn (connected west to Đại Lộ Bệnh Viện X=-227.5 & open to West Connector, Pier, Cầu Sông Hàn, Cầu Rồng, Cầu Trần Thị Lý)
      x = THREE.MathUtils.clamp(x, -240.2, 536.8);
      const onWestConnectorEntrance = x >= -240.2 && x <= -214.4;
      const onViewingPier = x >= 140.5 && x <= 151.5;
      const onHanBridgeEntrance = x >= 183.4 && x <= 203.6;
      const onDragonBridgeEntrance = x >= 358.5 && x <= 381.5;
      const onTranThiLyEntrance = x >= 489.45 && x <= 516.55;
      if (
        !onWestConnectorEntrance &&
        !onViewingPier &&
        !onHanBridgeEntrance &&
        !onDragonBridgeEntrance &&
        !onTranThiLyEntrance
      ) {
        z = Math.max(-133.2, z);
      }
    }
  } else if (z <= 15.5) {
    if (x <= -213.5) {
      x = Math.max(WEST_RES_EXPANSION_MIN_X, Math.min(-214.5, x));
      const resNorthClamp = clampMotorbikeWestResidentialBounds(x, z);
      if (resNorthClamp.handled) {
        x = resNorthClamp.x;
        z = resNorthClamp.z;
      } else {
        z = Math.max(-133.5, z);
      }
    } else if (x <= -172.5) {
      x = Math.max(-210.5, Math.min(-174.0, x));
      z = Math.max(-25.2, z);
    } else if (x <= -132.0) {
      x = Math.max(-170.4, Math.min(-134.5, x));
      z = Math.max(-24.8, z);
    } else if (x >= 355.5 && x <= 384.2) {
      x = Math.max(357.0, Math.min(383.0, x));
    } else if (x >= 487.8 && x <= 517.2) {
      // Ngã Tư DIOR North Leg (Dior East Plaza X=487.8..488.8 at Z >= -12.0 + Đại Lộ Paris Bắc X=488.8..517.0 into Ngã 3 Bạch Đằng)
      if (x < 488.8) {
        z = Math.max(-12.0, z);
      } else {
        x = Math.max(489.2, Math.min(516.6, x));
      }
    } else if (x > 517.2 && z < 15.4) {
      // Keep inside Đại Lộ Paris Bắc when turning East above North sidewalk line
      x = 516.6;
    } else if (x >= 179.5 && x <= 207.5) {
      x = Math.max(180.5, Math.min(206.5, x));
      z = Math.max(-108.5, z);
    } else {
      z = Math.max(15.65, z);
    }
  } else if (z >= 134.4 && z <= 161.6 && x >= 105.0 && x <= 564.0) {
    // Ngã Tư Vinhomes 1 (OPEN West into South-Central Residential at X=105.0!), VHM, VH2, VH2B & VH3
    x = Math.min(563.4, x);
    if (
      !(
        (x >= 179.8 && x <= 207.2) ||
        (x >= 356.3 && x <= 383.8) ||
        (x >= 489.0 && x <= 517.0)
      )
    ) {
      z = Math.max(134.8, z);
    }
    if (x < 160.4 || x > 536.1) {
      z = Math.min(161.2, z);
    }
  } else if (z > 161.6 && z <= 166.2 && x >= 159.8 && x <= 536.7) {
    // Continuous North Connecting Shophouse Promenade across all 5 Vinhomes blocks
    const vhDx =
      x >= 469.75 ? 309.5 : x >= 403.25 ? 243.0 : x >= 326.0 ? 176.5 : x >= 238.0 ? 88.5 : 0;
    const lx = x - vhDx;
    x = Math.max(160.5, Math.min(536.0, x));
    if (lx < 174.5 || lx > 212.5) {
      z = Math.min(165.6, z);
    }
  } else if (z >= 325.8 && z < 330.3 && x >= 159.8 && x <= 536.7) {
    // Continuous South Connecting Shophouse Promenade across all 5 Vinhomes blocks
    const vhDx =
      x >= 469.75 ? 309.5 : x >= 403.25 ? 243.0 : x >= 326.0 ? 176.5 : x >= 238.0 ? 88.5 : 0;
    const lx = x - vhDx;
    x = Math.max(160.5, Math.min(536.0, x));
    if (lx < 174.5 || lx > 212.5) {
      z = Math.max(326.4, z);
    }
  } else if (z >= 330.3 && z <= 357.7 && x >= 105.0 && x <= 564.0) {
    // Ngã Tư Nam Vinhomes 1 (OPEN West into Đại Lộ Nam 6 at X=105.0!), VHM, 2, 2B & 3 Connected East-West Crossroad
    const vhDx =
      x >= 469.75 ? 309.5 : x >= 403.25 ? 243.0 : x >= 326.0 ? 176.5 : x >= 238.0 ? 88.5 : 0;
    const lx = x - vhDx;
    x = Math.min(563.4, x);
    if (x < 160.4 || x > 536.1) {
      z = Math.max(330.8, z);
    }
    if (lx < 180.4 || lx > 206.6) {
      z = Math.min(357.2, z);
    }
  } else if (
    z > 161.6 &&
    z <= 330.3 &&
    ((x >= 174.5 && x <= 212.5) ||
      (x >= 263.0 && x <= 301.0) ||
      (x >= 351.0 && x <= 389.0) ||
      (x >= 417.5 && x <= 455.5) ||
      (x >= 484.0 && x <= 522.0))
  ) {
    // Vinhomes Ocean Park 1, Trung Tâm, 2, 2 Đông & 3 Shophouse Boulevard & Wide Promenades
    const vhDx =
      x >= 469.75 ? 309.5 : x >= 403.25 ? 243.0 : x >= 326.0 ? 176.5 : x >= 238.0 ? 88.5 : 0;
    x = Math.max(175.4 + vhDx, Math.min(211.6 + vhDx, x));
  } else if (
    z > 357.7 &&
    ((x >= 179.8 && x <= 207.2) ||
      (x >= 268.3 && x <= 295.7) ||
      (x >= 356.3 && x <= 383.8) ||
      (x >= 422.8 && x <= 450.2) ||
      (x >= 489.0 && x <= 517.0))
  ) {
    // South Leg Boulevard beyond South Ngã 4 (Z = 357.7..426.5)
    const vhDx =
      x >= 469.75 ? 309.5 : x >= 403.25 ? 243.0 : x >= 326.0 ? 176.5 : x >= 238.0 ? 88.5 : 0;
    x = Math.max(180.4 + vhDx, Math.min(206.6 + vhDx, x));
    z = Math.min(426.5, z);
  } else if (
    (x <= -425.8 && z >= 42.0) ||
    (x > -425.8 && x <= -305.0 && z >= 148.0) ||
    (x > -305.0 && x <= -241.0 && z >= 135.0) ||
    (x >= -214.0 && x <= -100.0 && z >= 88.0) ||
    (x > -100.0 && x <= 105.0 && z >= 104.0)
  ) {
    const resSouthClamp = clampMotorbikeWestResidentialBounds(x, z);
    if (resSouthClamp.handled) {
      x = resSouthClamp.x;
      z = resSouthClamp.z;
    } else {
      z = Math.min(361.2, z);
    }
  } else {
    const maxExteriorZ =
      x > -425.8 && x < -362.5
        ? 148.2
        : x >= -362.5 && x < -305.0
          ? 148.2
          : x >= -305.0 && x <= -241.0
            ? 103.5
            : x > -241.0 && x <= -213.8
              ? 361.2
              : x >= 179.8 && x <= 207.2
                ? 426.5
                : x >= 356.3 && x <= 383.8
                  ? 426.5
                  : x >= 488.6 && x <= 517.0
                    ? 426.5
                    : x >= -206.5 && x <= -163.0
                      ? 42.2
                      : x >= -49.4 && x <= -20.6
                        ? 48.0
                        : 42.2;
    z = Math.min(maxExteriorZ, z);
  }
  return { x, z, clamped: Math.abs(x - cx) > 0.001 || Math.abs(z - cz) > 0.001 };
}
