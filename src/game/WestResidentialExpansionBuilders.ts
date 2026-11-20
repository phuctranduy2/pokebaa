import * as THREE from 'three';
import type { HospitalScaledLight } from './HospitalSystem';
import type { WestWalkableShopDef } from './westResidentialLayout';

// =========================================================================
// UNIFIED ARCHITECTURAL CLEARANCE CONSTANTS (ZERO SIGNBOARD / BALCONY OVERLAP!)
// - Doorway top + sensor bar: Y = 0.04 .. 2.84
// - Slim rain awning rear top: Y = 2.89 (slopes down forward to 2.68)
// - Signboard lightbox band:  Y = 2.99 .. 3.97 (center 3.48, height 0.98)
// - Ground-floor wall top:    Y = 4.16
// - 2nd-floor balcony slab:   Y = 4.22 .. 4.40 (clear +0.25m ABOVE signboard top!)
// =========================================================================
export const RESIDENTIAL_F1_HEIGHT = 4.16;
export const RESIDENTIAL_SLAB_HEIGHT = 0.24;
export const RESIDENTIAL_BALCONY_BOTTOM_Y = 4.22;
export const RESIDENTIAL_SIGNBOARD_CENTER_Y = 3.48;
export const RESIDENTIAL_SIGNBOARD_HEIGHT = 0.98;
export const RESIDENTIAL_SIGNBOARD_TOP_Y = RESIDENTIAL_SIGNBOARD_CENTER_Y + RESIDENTIAL_SIGNBOARD_HEIGHT * 0.5;
export const RESIDENTIAL_SIGNBOARD_BOTTOM_Y = RESIDENTIAL_SIGNBOARD_CENTER_Y - RESIDENTIAL_SIGNBOARD_HEIGHT * 0.5;
export const RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS = 4.2;
export const LOT_VISUAL_INSET = 0.16;

export function computeAutoDoorTargetOpen(
  playerX: number,
  playerZ: number,
  doorWx: number,
  doorWz: number,
  triggerRadius = RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS
): number {
  const dx = playerX - doorWx;
  const dz = playerZ - doorWz;
  return dx * dx + dz * dz <= triggerRadius * triggerRadius ? 1 : 0;
}

export interface AutoSlidingDoorRig {
  root: THREE.Group;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  wx: number;
  wz: number;
  baseHalfW: number;
  slideDist: number;
  openFrac: number;
}

export type SignTexFn = (
  title: string,
  subtitle: string,
  opts?: {
    bg?: string;
    bg2?: string;
    border?: string;
    titleColor?: string;
    subColor?: string;
    w?: number;
    h?: number;
  }
) => THREE.CanvasTexture;

export interface ResidentialHouseActivitySlot {
  id: number;
  cx: number;
  cz: number;
  facingNorth: boolean;
  isShop: boolean;
  theme?: string;
  /** Seated relaxation spot (living room sofa facing TV, or shop counter spot) */
  sofaX: number;
  sofaZ: number;
  sofaYaw: number;
  /** Kitchen cooking / shop cashier spot */
  kitchenX: number;
  kitchenZ: number;
  kitchenYaw: number;
  /** Mid-room dining / shelving tidying spot */
  midX: number;
  midZ: number;
  midYaw: number;
  /** Center of front automatic sliding door */
  doorX: number;
  doorZ: number;
}

export interface DrivewayBikeSlot {
  parkX: number;
  parkZ: number;
  parkYaw: number;
  doorX: number;
  doorZ: number;
  yardOutX: number;
  yardOutZ: number;
  facingNorth: boolean;
  color: number;
}

export interface WalkableShopActivitySlot {
  id: string;
  name: string;
  theme: WestWalkableShopDef['theme'];
  cx: number;
  cz: number;
  facingNorth: boolean;
  doorX: number;
  doorZ: number;
  sidewalkX: number;
  sidewalkZ: number;
  curbParkX: number;
  curbParkZ: number;
  curbParkYaw: number;
  orderX: number;
  orderZ: number;
  orderYaw: number;
  seats: Array<{ x: number; z: number; yaw: number; occupiedBy: number | null }>;
}

export interface WestResPalette {
  concreteMat: THREE.MeshStandardMaterial;
  asphaltAlleyMat: THREE.MeshStandardMaterial;
  tilePatioMat: THREE.MeshStandardMaterial;
  brickCourtyardMat: THREE.MeshStandardMaterial;
  creamPlasterMat: THREE.MeshStandardMaterial;
  warmYellowWallMat: THREE.MeshStandardMaterial;
  ochreHoiAnMat: THREE.MeshStandardMaterial;
  mintWallMat: THREE.MeshStandardMaterial;
  pastelTealWallMat: THREE.MeshStandardMaterial;
  blushPinkWallMat: THREE.MeshStandardMaterial;
  sandBeigeWallMat: THREE.MeshStandardMaterial;
  concreteModernMat: THREE.MeshStandardMaterial;
  charcoalTrimMat: THREE.MeshStandardMaterial;
  terracottaTileMat: THREE.MeshStandardMaterial;
  weatheredTileMat: THREE.MeshStandardMaterial;
  emeraldRoofMat: THREE.MeshStandardMaterial;
  slateBlueRoofMat: THREE.MeshStandardMaterial;
  cobaltRoofMat: THREE.MeshStandardMaterial;
  tealTinRoofMat: THREE.MeshStandardMaterial;
  redTinRoofMat: THREE.MeshStandardMaterial;
  graniteRedBlackMat: THREE.MeshStandardMaterial;
  breezeBlockWhiteMat: THREE.MeshStandardMaterial;
  breezeBlockTerracottaMat: THREE.MeshStandardMaterial;
  goldBrassMat: THREE.MeshStandardMaterial;
  chromeInoxMat: THREE.MeshStandardMaterial;
  darkSteelMat: THREE.MeshStandardMaterial;
  woodMat: THREE.MeshStandardMaterial;
  bambooMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshStandardMaterial;
  clearSeeThroughGlassMat: THREE.MeshStandardMaterial;
  interiorWallMat: THREE.MeshStandardMaterial;
  interiorFloorWoodMat: THREE.MeshStandardMaterial;
  interiorCeilingGlowMat: THREE.MeshStandardMaterial;
  curtainMat: THREE.MeshStandardMaterial;
  beddingBlueMat: THREE.MeshStandardMaterial;
  beddingCoralMat: THREE.MeshStandardMaterial;
  tvScreenMat: THREE.MeshStandardMaterial;
  autoDoorSensorLedMat: THREE.MeshStandardMaterial;
  housePorchGlowMat: THREE.MeshStandardMaterial;
  housePorchPoolMat: THREE.MeshBasicMaterial;
  windowWarmMat: THREE.MeshStandardMaterial;
  paintWhiteMat: THREE.MeshStandardMaterial;
  foliageMat: THREE.MeshStandardMaterial;
  darkFoliageMat: THREE.MeshStandardMaterial;
  bougainvilleaMat: THREE.MeshStandardMaterial;
  apricotBlossomMat: THREE.MeshStandardMaterial;
  trunkMat: THREE.MeshStandardMaterial;
  plasticBlueMat: THREE.MeshStandardMaterial;
  plasticRedMat: THREE.MeshStandardMaterial;
  stripedAwningMat: THREE.MeshStandardMaterial;
  greenAwningMat: THREE.MeshStandardMaterial;
  neonGreenCrossMat: THREE.MeshStandardMaterial;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  createSignTex: SignTexFn;
  registerAutoDoor: (
    wx: number,
    wz: number,
    facingNorth: boolean,
    doorW: number,
    lotW: number,
    doorH?: number
  ) => void;
  registerHouseSlot?: (slot: Omit<ResidentialHouseActivitySlot, 'id'>) => void;
  tryClaimDrivewayBike?: (slot: DrivewayBikeSlot) => boolean;
  registerWalkableShopSlot?: (slot: WalkableShopActivitySlot) => void;
  addTree: (
    parent: THREE.Object3D,
    x: number,
    z: number,
    scale?: number,
    blossom?: 'none' | 'pink' | 'yellow'
  ) => void;
  addMotorbike: (parent: THREE.Object3D, x: number, z: number, yaw: number, color: number) => void;
  addAcUnit: (parent: THREE.Object3D, x: number, y: number, z: number) => void;
  addRooftopWaterTank: (parent: THREE.Object3D, x: number, roofY: number, z: number) => void;
}

function addLocalBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rot?: [number, number, number]
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  return m;
}

const _signMatCache = new WeakMap<THREE.CanvasTexture, THREE.MeshStandardMaterial>();

function addSignBoard(
  parent: THREE.Object3D,
  palette: WestResPalette,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  title: string,
  subtitle: string,
  opts?: Parameters<SignTexFn>[2]
) {
  // Crisp 3D dark-metal illuminated lightbox cabinet behind the signboard face
  addLocalBox(parent, w + 0.14, h + 0.1, 0.14, palette.darkSteelMat, x, y, z - 0.06);
  const tex = palette.createSignTex(title, subtitle, opts);
  let mat = _signMatCache.get(tex);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.38,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.4,
    });
    _signMatCache.set(tex, mat);
    palette.neonMats.push(mat);
  }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.set(x, y, z + 0.02);
  parent.add(plane);
}

/**
 * Wraps local facade assembly so `facingNorth = true` cleanly faces World -Z
 * ("bên kia đường" looking across Đại Lộ Trung Tâm) without mirrored text!
 */
function makeOrientedHouse(
  staticGroup: THREE.Group,
  cx: number,
  centerZ: number,
  facingNorth: boolean
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(cx, 0, centerZ);
  if (facingNorth) grp.rotation.y = Math.PI;
  staticGroup.add(grp);
  return grp;
}

/**
 * Adds the sleek overhead automatic sliding-door frame, sensor bar, LED indicator,
 * and registers the animated left/right glass door leaves in dynamicGroup.
 */
function attachAutoDoorFrame(
  grp: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  halfD: number,
  facingNorth: boolean,
  doorW: number,
  lotW: number,
  doorH = 2.68
) {
  // Aluminum perimeter jambs + top track header
  addLocalBox(grp, 0.08, doorH + 0.12, 0.24, p.darkSteelMat, -doorW * 0.5, 0.04 + (doorH + 0.12) * 0.5, halfD - 0.16);
  addLocalBox(grp, 0.08, doorH + 0.12, 0.24, p.darkSteelMat, doorW * 0.5, 0.04 + (doorH + 0.12) * 0.5, halfD - 0.16);
  addLocalBox(grp, doorW + 0.16, 0.14, 0.26, p.darkSteelMat, 0, 0.04 + doorH + 0.07, halfD - 0.14);
  // Overhead motion sensor pod + soft cyan status LED (outside & inside)
  addLocalBox(grp, 0.44, 0.1, 0.12, p.charcoalTrimMat, 0, 0.04 + doorH + 0.14, halfD + 0.02);
  addLocalBox(grp, 0.14, 0.035, 0.04, p.autoDoorSensorLedMat, 0, 0.04 + doorH + 0.14, halfD + 0.08);

  // Warm Architectural Front Porch Entrance Sconces (flanking doorway) & Under-Eave Warm LED Strip
  const sconceOffset = Math.min(lotW * 0.5 - 0.38, doorW * 0.5 + 0.48);
  if (sconceOffset > doorW * 0.5 + 0.12) {
    [-sconceOffset, sconceOffset].forEach((sx) => {
      addLocalBox(grp, 0.16, 0.34, 0.12, p.darkSteelMat, sx, 2.26, halfD + 0.05);
      addLocalBox(grp, 0.12, 0.24, 0.14, p.housePorchGlowMat, sx, 2.26, halfD + 0.08);
    });
  }
  addLocalBox(grp, Math.min(lotW * 0.78, doorW + 1.8), 0.05, 0.12, p.housePorchGlowMat, 0, 2.79, halfD + 0.22);

  // Soft Additive Warm Porch Light Spill onto Front Yard / Sidewalk
  const porchPool = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(lotW * 0.92, 8.6), 5.2),
    p.housePorchPoolMat
  );
  porchPool.rotation.x = -Math.PI / 2;
  porchPool.position.set(0, 0.072, halfD + 2.15);
  grp.add(porchPool);

  const worldDoorZ = facingNorth ? cz - (halfD - 0.18) : cz + (halfD - 0.18);
  p.registerAutoDoor(cx, worldDoorZ, facingNorth, doorW, lotW, doorH);
}

/**
 * Builds a hollow, brightly illuminated upper-floor room (Tầng 2, Tầng 3, AND Tầng 4)
 * with transparent panoramic glass windows, curtains, glowing ceiling LEDs, AC unit, wall art,
 * and distinct floor-specific Vietnamese furnishings visible cleanly from outside!
 */
export function buildTransparentSecondFloorRoom(
  grp: THREE.Group,
  p: WestResPalette,
  w: number,
  bodyD: number,
  balcY: number,
  floorH: number,
  wallMat: THREE.Material,
  isShop: boolean,
  variantSeed = 0,
  floorNum = 2
) {
  const visW = w - LOT_VISUAL_INSET;
  const halfD = bodyD * 0.5;
  const roomD = Math.min(4.6, bodyD * 0.42);
  const rearCoreD = Math.max(2.0, bodyD - roomD);
  const yMid = balcY + floorH * 0.5;
  const roomBackZ = halfD - roomD;

  // 1. Solid rear structural core behind the visible upper-floor front room
  addLocalBox(grp, visW, floorH, rearCoreD, wallMat, 0, yMid, -halfD + rearCoreD * 0.5);

  // 2. Hollow Front Upper-Floor Room Shell (side walls cleanly between rear core & front piers, wood floor & ceiling inset inside walls)
  const roomSideD = roomD - 0.24;
  const roomSideZ = halfD - 0.24 - roomSideD * 0.5;
  const roomInnerD = roomD - 0.36;
  const roomInnerZ = roomBackZ + 0.12 + roomInnerD * 0.5;
  addLocalBox(grp, 0.3, floorH, roomSideD, wallMat, -visW * 0.5 + 0.15, yMid, roomSideZ);
  addLocalBox(grp, 0.3, floorH, roomSideD, wallMat, visW * 0.5 - 0.15, yMid, roomSideZ);
  addLocalBox(grp, visW - 0.6, floorH - 0.12, 0.12, p.interiorWallMat, 0, yMid, roomBackZ + 0.06);
  addLocalBox(grp, visW - 0.6, 0.08, roomInnerD, p.interiorFloorWoodMat, 0, balcY + 0.04, roomInnerZ);
  addLocalBox(grp, visW - 0.6, 0.1, roomInnerD, p.interiorWallMat, 0, balcY + floorH - 0.05, roomInnerZ);
  // Bright glowing ceiling LED light panel + warm rear cornice light so Tầng 2/3/4 furnishings read vividly at night!
  addLocalBox(grp, Math.min(visW * 0.66, 4.6), 0.06, 0.68, p.interiorCeilingGlowMat, 0, balcY + floorH - 0.12, halfD - roomD * 0.46);
  addLocalBox(grp, Math.min(visW * 0.72, 5.2), 0.08, 0.12, p.interiorCeilingGlowMat, 0, balcY + floorH - 0.22, roomBackZ + 0.18);

  // 3. Front Wall with REAL Open Panoramic Window Cutout + Transparent Glass & Curtains
  const winW = Math.min(visW - 1.35, Math.max(3.2, visW * 0.72));
  const pierW = Math.max(0.42, (visW - winW) * 0.5);
  const sillH = 0.52;
  const lintelH = 0.4;
  const winH = floorH - sillH - lintelH;
  const winMidY = balcY + sillH + winH * 0.5;

  addLocalBox(grp, pierW, floorH, 0.24, wallMat, -visW * 0.5 + pierW * 0.5, yMid, halfD - 0.12);
  addLocalBox(grp, pierW, floorH, 0.24, wallMat, visW * 0.5 - pierW * 0.5, yMid, halfD - 0.12);
  addLocalBox(grp, winW, sillH, 0.24, wallMat, 0, balcY + sillH * 0.5, halfD - 0.12);
  addLocalBox(grp, winW, lintelH, 0.24, wallMat, 0, balcY + floorH - lintelH * 0.5, halfD - 0.12);

  // Aluminum window frame, mullions & transparent glazing
  addLocalBox(grp, winW + 0.12, 0.08, 0.26, p.darkSteelMat, 0, balcY + sillH + 0.04, halfD - 0.1);
  addLocalBox(grp, winW + 0.12, 0.1, 0.28, p.darkSteelMat, 0, balcY + floorH - lintelH - 0.03, halfD - 0.1);
  addLocalBox(grp, 0.06, winH, 0.14, p.darkSteelMat, 0, winMidY, halfD - 0.1); // Center mullion
  addLocalBox(grp, winW - 0.08, winH - 0.08, 0.04, p.clearSeeThroughGlassMat, 0, winMidY, halfD - 0.1);

  // Flanking interior fabric curtains tucked neatly inside left & right edges of window
  const curtainW = Math.min(0.45, winW * 0.11);
  addLocalBox(grp, curtainW, winH - 0.08, 0.1, p.curtainMat, -winW * 0.5 + curtainW * 0.55, winMidY, halfD - 0.28);
  addLocalBox(grp, curtainW, winH - 0.08, 0.1, p.curtainMat, winW * 0.5 - curtainW * 0.55, winMidY, halfD - 0.28);

  // 4. Furnished Upper-Floor Interior (distinct across Floor 2, Floor 3, and Floor 4, for both Shops & Homes!)
  const innerHalfW = (w - 0.8) * 0.5;
  const wallBackInsideZ = roomBackZ + 0.22;
  const seed = variantSeed + floorNum * 3;
  // Wall-mounted AC indoor unit + framed artwork on back wall
  addLocalBox(grp, 0.92, 0.28, 0.22, p.paintWhiteMat, innerHalfW * 0.52, balcY + floorH - 0.56, wallBackInsideZ);
  addLocalBox(grp, 1.35, 0.86, 0.06, p.goldBrassMat, 0, balcY + 1.85, roomBackZ + 0.15);
  addLocalBox(
    grp,
    1.18,
    0.7,
    0.07,
    seed % 3 === 0 ? p.beddingBlueMat : seed % 3 === 1 ? p.terracottaTileMat : p.beddingCoralMat,
    0,
    balcY + 1.85,
    roomBackZ + 0.17
  );

  if (floorNum >= 4) {
    if (isShop) {
      // TẦNG 4 QUÁN: Rooftop Indoor Bistro / Sky Lounge Bar (quầy bar + ghế cao + kệ chai phát sáng + bàn ngắm phố)
      addLocalBox(grp, Math.min(2.8, w * 0.42), 1.05, 0.62, p.woodMat, 0, balcY + 0.56, roomBackZ + 0.58);
      addLocalBox(grp, Math.min(2.9, w * 0.44), 0.08, 0.68, p.goldBrassMat, 0, balcY + 1.1, roomBackZ + 0.58);
      addLocalBox(grp, Math.min(2.2, w * 0.34), 0.18, 0.18, p.interiorCeilingGlowMat, 0, balcY + 1.55, roomBackZ + 0.24);
      const stoolStep = Math.min(0.95, innerHalfW * 0.42);
      [-stoolStep, 0, stoolStep].forEach((sx) => {
        addLocalBox(grp, 0.34, 0.68, 0.34, p.charcoalTrimMat, sx, balcY + 0.38, roomBackZ + 1.25);
        addLocalBox(grp, 0.38, 0.1, 0.38, p.beddingCoralMat, sx, balcY + 0.74, roomBackZ + 1.25);
      });
      // Window-side bistro tables + indoor greenery
      [-innerHalfW * 0.58, innerHalfW * 0.58].forEach((px) => {
        addLocalBox(grp, 0.42, 0.44, 0.42, p.terracottaTileMat, px, balcY + 0.26, halfD - 0.95);
        addLocalBox(grp, 0.56, 0.66, 0.56, p.foliageMat, px, balcY + 0.78, halfD - 0.95);
      });
    } else {
      // TẦNG 4 NHÀ Ở: Phòng Thờ Truyền Thống & Góc Trà Đạo Việt Nam (Bàn thờ gỗ gụ + cặp đèn thờ ấm + bàn trà + chậu cảnh)
      const altarW = Math.min(1.85, w * 0.32);
      addLocalBox(grp, altarW, 1.18, 0.62, p.woodMat, 0, balcY + 0.63, roomBackZ + 0.44);
      addLocalBox(grp, altarW + 0.14, 0.1, 0.68, p.goldBrassMat, 0, balcY + 1.24, roomBackZ + 0.44);
      // Twin warm glowing altar lamps & brass incense urn
      addLocalBox(grp, 0.22, 0.24, 0.22, p.goldBrassMat, 0, balcY + 1.4, roomBackZ + 0.48);
      addLocalBox(grp, 0.14, 0.34, 0.14, p.interiorCeilingGlowMat, -altarW * 0.36, balcY + 1.44, roomBackZ + 0.46);
      addLocalBox(grp, 0.14, 0.34, 0.14, p.interiorCeilingGlowMat, altarW * 0.36, balcY + 1.44, roomBackZ + 0.46);
      // Foreground tea table + 2 wooden cushioned armchairs near panoramic window
      const teaZ = halfD - 1.35;
      addLocalBox(grp, 1.18, 0.46, 0.72, p.woodMat, 0, balcY + 0.27, teaZ);
      addLocalBox(grp, 0.36, 0.14, 0.26, p.paintWhiteMat, 0, balcY + 0.56, teaZ);
      const chairX = Math.min(1.25, innerHalfW * 0.52);
      [-chairX, chairX].forEach((cx) => {
        addLocalBox(grp, 0.62, 0.44, 0.62, p.woodMat, cx, balcY + 0.26, teaZ);
        addLocalBox(grp, 0.54, 0.12, 0.54, p.beddingCoralMat, cx, balcY + 0.52, teaZ);
      });
      // Potted feng-shui indoor plants flanking corners
      [-innerHalfW * 0.72, innerHalfW * 0.72].forEach((px) => {
        addLocalBox(grp, 0.38, 0.4, 0.38, p.terracottaTileMat, px, balcY + 0.24, roomBackZ + 0.65);
        addLocalBox(grp, 0.52, 0.72, 0.52, p.foliageMat, px, balcY + 0.76, roomBackZ + 0.65);
      });
    }
  } else if (floorNum === 3) {
    if (isShop) {
      // TẦNG 3 QUÁN: Phòng VIP Sofa Lounge & Kệ Trưng Bày + Đèn Sàn Ấm
      const sofaX = -Math.min(1.25, innerHalfW * 0.38);
      const sofaZ = roomBackZ + 0.78;
      addLocalBox(grp, Math.min(2.3, w * 0.38), 0.44, 0.85, p.beddingBlueMat, sofaX, balcY + 0.28, sofaZ);
      addLocalBox(grp, Math.min(2.3, w * 0.38), 0.56, 0.22, p.beddingBlueMat, sofaX, balcY + 0.66, sofaZ - 0.34);
      addLocalBox(grp, 1.35, 0.4, 0.72, p.woodMat, sofaX, balcY + 0.24, halfD - 1.35);
      // Warm standing floor lamp & tall display cabinet on the right
      const rightX = Math.min(1.6, innerHalfW * 0.52);
      addLocalBox(grp, 0.08, 1.65, 0.08, p.goldBrassMat, rightX - 0.65, balcY + 0.86, halfD - 1.25);
      addLocalBox(grp, 0.38, 0.32, 0.38, p.interiorCeilingGlowMat, rightX - 0.65, balcY + 1.78, halfD - 1.25);
      addLocalBox(grp, 1.28, 1.98, 0.48, p.woodMat, rightX, balcY + 1.03, roomBackZ + 0.42);
      addLocalBox(grp, 1.12, 0.26, 0.14, p.beddingCoralMat, rightX, balcY + 1.35, roomBackZ + 0.62);
    } else {
      // TẦNG 3 NHÀ Ở: Phòng Ngủ Gia Đình + Góc Máy Tính PC Làm Việc (Giường + Bàn PC màn hình phát sáng + Giá sách)
      const bedX = Math.min(1.5, innerHalfW * 0.46);
      const bedZ = halfD - 2.05;
      const quiltMat = seed % 2 === 0 ? p.beddingCoralMat : p.beddingBlueMat;
      addLocalBox(grp, 1.68, 0.36, 1.98, p.woodMat, bedX, balcY + 0.22, bedZ);
      addLocalBox(grp, 1.58, 0.2, 1.88, p.paintWhiteMat, bedX, balcY + 0.47, bedZ);
      addLocalBox(grp, 1.6, 0.11, 1.26, quiltMat, bedX, balcY + 0.59, bedZ + 0.28);
      addLocalBox(grp, 1.72, 0.92, 0.12, p.woodMat, bedX, balcY + 0.52, bedZ - 0.96);
      addLocalBox(grp, 0.58, 0.15, 0.36, p.paintWhiteMat, bedX, balcY + 0.63, bedZ - 0.66);

      // PC Workstation Desk + Glowing Monitor + Bookshelf on the left near window
      const pcX = -Math.min(1.55, innerHalfW * 0.5);
      const pcZ = halfD - 1.3;
      addLocalBox(grp, 1.42, 0.08, 0.66, p.woodMat, pcX, balcY + 0.76, pcZ);
      addLocalBox(grp, 0.08, 0.72, 0.58, p.charcoalTrimMat, pcX - 0.62, balcY + 0.38, pcZ);
      addLocalBox(grp, 0.08, 0.72, 0.58, p.charcoalTrimMat, pcX + 0.62, balcY + 0.38, pcZ);
      addLocalBox(grp, 0.78, 0.46, 0.06, p.charcoalTrimMat, pcX, balcY + 1.12, pcZ - 0.16);
      addLocalBox(grp, 0.7, 0.38, 0.04, p.interiorCeilingGlowMat, pcX, balcY + 1.12, pcZ - 0.12); // Glowing monitor
      addLocalBox(grp, 0.46, 0.48, 0.46, p.beddingBlueMat, pcX, balcY + 0.28, pcZ + 0.52); // Office chair
      // Tall bookshelf along rear-left wall
      addLocalBox(grp, 1.3, 1.96, 0.44, p.woodMat, -innerHalfW + 0.85, balcY + 1.02, roomBackZ + 0.38);
      addLocalBox(grp, 1.12, 0.22, 0.2, p.terracottaTileMat, -innerHalfW + 0.85, balcY + 1.48, roomBackZ + 0.54);
      addLocalBox(grp, 1.12, 0.22, 0.2, p.beddingBlueMat, -innerHalfW + 0.85, balcY + 1.04, roomBackZ + 0.54);
    }
  } else if (isShop) {
    // TẦNG 2 QUÁN: 2nd-Floor Café / Dining / Lounge Seating visible right through the glass!
    const tableSpacing = Math.min(1.65, innerHalfW * 0.55);
    [-tableSpacing, tableSpacing].forEach((tx, idx) => {
      const tz = halfD - 1.75;
      addLocalBox(grp, 1.15, 0.08, 0.82, p.woodMat, tx, balcY + 0.78, tz);
      addLocalBox(grp, 0.12, 0.72, 0.12, p.darkSteelMat, tx, balcY + 0.4, tz);
      const seatMat = idx === 0 ? p.beddingCoralMat : p.beddingBlueMat;
      addLocalBox(grp, 0.42, 0.44, 0.42, seatMat, tx - 0.72, balcY + 0.28, tz);
      addLocalBox(grp, 0.42, 0.44, 0.42, seatMat, tx + 0.72, balcY + 0.28, tz);
      // Warm glowing tabletop pendant lamp
      addLocalBox(grp, 0.04, 0.55, 0.04, p.darkSteelMat, tx, balcY + floorH - 0.38, tz);
      addLocalBox(grp, 0.28, 0.2, 0.28, p.interiorCeilingGlowMat, tx, balcY + floorH - 0.72, tz);
    });
    // Back shelf / plant credenza
    addLocalBox(grp, Math.min(2.6, w * 0.34), 0.92, 0.45, p.woodMat, 0, balcY + 0.5, roomBackZ + 0.42);
  } else {
    // TẦNG 2 NHÀ Ở: Cozy 2nd-Floor Master Bedroom (Bed with headboard & pillows + Wardrobe + Study Desk & Lamp!)
    const bedX = -Math.min(1.55, innerHalfW * 0.48);
    const bedZ = halfD - 2.1;
    const quiltMat = variantSeed % 2 === 0 ? p.beddingBlueMat : p.beddingCoralMat;
    addLocalBox(grp, 1.85, 0.38, 2.05, p.woodMat, bedX, balcY + 0.24, bedZ); // Bed frame
    addLocalBox(grp, 1.74, 0.22, 1.94, p.paintWhiteMat, bedX, balcY + 0.5, bedZ); // Mattress
    addLocalBox(grp, 1.76, 0.12, 1.32, quiltMat, bedX, balcY + 0.62, bedZ + 0.3); // Blanket
    addLocalBox(grp, 1.88, 0.98, 0.12, p.woodMat, bedX, balcY + 0.56, bedZ - 1.0); // Headboard
    addLocalBox(grp, 0.62, 0.16, 0.38, p.paintWhiteMat, bedX - 0.42, balcY + 0.66, bedZ - 0.68); // Pillow 1
    addLocalBox(grp, 0.62, 0.16, 0.38, p.paintWhiteMat, bedX + 0.42, balcY + 0.66, bedZ - 0.68); // Pillow 2

    // Study Desk + Chair + Warm Desk Lamp on the right side near the window
    const deskX = Math.min(1.65, innerHalfW * 0.52);
    const deskZ = halfD - 1.35;
    addLocalBox(grp, 1.32, 0.08, 0.65, p.woodMat, deskX, balcY + 0.78, deskZ);
    addLocalBox(grp, 0.08, 0.72, 0.58, p.woodMat, deskX - 0.58, balcY + 0.4, deskZ);
    addLocalBox(grp, 0.08, 0.72, 0.58, p.woodMat, deskX + 0.58, balcY + 0.4, deskZ);
    addLocalBox(grp, 0.44, 0.44, 0.44, p.charcoalTrimMat, deskX, balcY + 0.28, deskZ - 0.55); // Desk chair
    addLocalBox(grp, 0.22, 0.32, 0.22, p.interiorCeilingGlowMat, deskX + 0.42, balcY + 0.98, deskZ); // Glowing lamp

    // Tall Wooden Wardrobe tucked along rear-right wall
    addLocalBox(grp, 1.45, 2.05, 0.56, p.woodMat, innerHalfW - 0.82, balcY + 1.08, roomBackZ + 0.42);
  }
}

/** Standard upper facade window grid with transparent 2nd, 3rd & 4th-floor interiors, balconies & AC condenser */
function addUpperStoriesShell(
  grp: THREE.Group,
  p: WestResPalette,
  w: number,
  bodyD: number,
  floors: number,
  floorH: number,
  baseY: number,
  wallMat: THREE.Material,
  opts?: {
    breezeBlock?: boolean;
    breezeMat?: THREE.Material;
    goldLouvers?: boolean;
    timberLouvers?: boolean;
    tigerCage?: boolean;
    graniteTrim?: boolean;
    laundry?: boolean;
    planters?: boolean;
    isShop?: boolean;
    variantSeed?: number;
  }
) {
  const visW = w - LOT_VISUAL_INSET;
  const halfD = bodyD * 0.5;
  for (let fl = 2; fl <= floors; fl++) {
    const balcY = baseY + (fl - 2) * floorH;
    const yMid = balcY + floorH * 0.5;

    // REAL HOLLOW & TRANSPARENT UPPER ROOMS FOR EVERY SINGLE FLOOR (Tầng 2, Tầng 3, AND Tầng 4!)
    buildTransparentSecondFloorRoom(
      grp,
      p,
      w,
      bodyD,
      balcY,
      floorH,
      wallMat,
      Boolean(opts?.isShop),
      opts?.variantSeed ?? Math.round(w * 7),
      fl
    );

    // Floor belt trim (inset inside lot boundaries and non-overlapping with balcony slab)
    addLocalBox(grp, visW + 0.02, 0.18, bodyD + 0.04, p.charcoalTrimMat, 0, balcY + 0.09, 0);

    // Architectural Balcony Slab & Railing (bottom strictly at balcY = 4.22..4.40, +0.25m above signboard!)
    const balcSlabY = fl === 2 ? Math.max(balcY, RESIDENTIAL_BALCONY_BOTTOM_Y) : balcY;
    addLocalBox(grp, Math.min(w * 0.78, visW - 0.04), 0.18, 1.04, p.creamPlasterMat, 0, balcSlabY + 0.09, halfD + 0.54);
    // Warm Under-Balcony Soffit LED Bar & Balcony Wall Sconce (illuminates facade warmly at night!)
    addLocalBox(grp, w * 0.64, 0.045, 0.14, p.housePorchGlowMat, 0, balcSlabY - 0.02, halfD + 0.66);
    addLocalBox(grp, 0.14, 0.28, 0.12, p.darkSteelMat, -w * 0.36, balcSlabY + 2.1, halfD + 0.05);
    addLocalBox(grp, 0.11, 0.2, 0.14, p.housePorchGlowMat, -w * 0.36, balcSlabY + 2.1, halfD + 0.08);
    addLocalBox(grp, w * 0.78, 0.07, 0.07, p.darkSteelMat, 0, balcSlabY + 0.98, halfD + 1.0);
    addLocalBox(grp, 0.07, 0.88, 0.07, p.darkSteelMat, -w * 0.36, balcSlabY + 0.54, halfD + 1.0);
    addLocalBox(grp, 0.07, 0.88, 0.07, p.darkSteelMat, w * 0.36, balcSlabY + 0.54, halfD + 1.0);
    for (let rx = -w * 0.3; rx <= w * 0.3; rx += 0.68) {
      addLocalBox(grp, 0.035, 0.82, 0.035, p.darkSteelMat, rx, balcSlabY + 0.54, halfD + 1.0);
    }

    // Accent screens framed cleanly on outer side bays of Floor 2 so the center panoramic window stays unobstructed!
    if (opts?.breezeBlock && fl === 2) {
      const bMat = opts.breezeMat ?? p.breezeBlockWhiteMat;
      [-w * 0.35, w * 0.35].forEach((sideX) => {
        for (let bx = sideX - 0.3; bx <= sideX + 0.3; bx += 0.3) {
          addLocalBox(grp, 0.12, floorH * 0.72, 0.16, bMat, bx, balcSlabY + floorH * 0.5, halfD + 0.84);
        }
      });
    }

    if (opts?.goldLouvers) {
      [-w * 0.36, -w * 0.29, w * 0.29, w * 0.36].forEach((lx) => {
        addLocalBox(grp, 0.08, floorH * 0.84, 0.2, p.goldBrassMat, lx, balcSlabY + floorH * 0.52, halfD + 0.7);
      });
    }

    if (opts?.timberLouvers) {
      [-w * 0.36, -w * 0.3, w * 0.3, w * 0.36].forEach((lx) => {
        addLocalBox(grp, 0.07, floorH * 0.82, 0.18, p.woodMat, lx, balcSlabY + floorH * 0.52, halfD + 0.66);
      });
    }

    if (opts?.tigerCage) {
      addLocalBox(grp, w * 0.76, 0.06, 1.18, p.darkSteelMat, 0, balcSlabY + 2.48, halfD + 0.59);
      for (let bx = -w * 0.35; bx <= w * 0.35; bx += 0.72) {
        addLocalBox(grp, 0.03, 1.46, 0.03, p.darkSteelMat, bx, balcSlabY + 1.74, halfD + 1.12);
      }
      addLocalBox(grp, w * 0.58, 0.24, 0.28, p.terracottaTileMat, 0, balcSlabY + 0.3, halfD + 0.86);
      addLocalBox(grp, w * 0.54, 0.24, 0.24, p.foliageMat, 0, balcSlabY + 0.52, halfD + 0.86);
    }

    if (opts?.graniteTrim) {
      const gtX = visW * 0.5 - 0.26;
      addLocalBox(grp, 0.52, floorH - 0.18, 0.18, p.graniteRedBlackMat, -gtX, yMid + 0.09, halfD + 0.11);
      addLocalBox(grp, 0.52, floorH - 0.18, 0.18, p.graniteRedBlackMat, gtX, yMid + 0.09, halfD + 0.11);
    }

    if (opts?.planters) {
      addLocalBox(grp, w * 0.56, 0.24, 0.3, p.concreteModernMat, 0, balcSlabY + 0.3, halfD + 0.9);
      addLocalBox(grp, w * 0.52, 0.28, 0.24, p.foliageMat, 0, balcSlabY + 0.52, halfD + 0.9);
    }

    if (opts?.laundry && fl === 2) {
      addLocalBox(grp, 2.2, 0.035, 0.035, p.chromeInoxMat, -w * 0.2, balcSlabY + 2.38, halfD + 0.74);
      addLocalBox(grp, 0.42, 0.52, 0.05, p.plasticBlueMat, -w * 0.2 - 0.65, balcSlabY + 2.08, halfD + 0.74);
      addLocalBox(grp, 0.4, 0.48, 0.05, p.paintWhiteMat, -w * 0.2, balcSlabY + 2.1, halfD + 0.74);
      addLocalBox(grp, 0.42, 0.52, 0.05, p.plasticRedMat, -w * 0.2 + 0.65, balcSlabY + 2.08, halfD + 0.74);
    }

    // Rear Facade Windows, Trim & Utility Balcony (eliminates flat blank backs along inner streets!)
    const rearWinW = Math.min(w * 0.44, 4.0);
    addLocalBox(grp, rearWinW, floorH * 0.5, 0.12, p.windowWarmMat, -w * 0.14, yMid + 0.12, -halfD - 0.04);
    addLocalBox(grp, rearWinW + 0.24, 0.14, 0.24, p.charcoalTrimMat, -w * 0.14, yMid + 0.12 + floorH * 0.25, -halfD - 0.08);
    addLocalBox(grp, 1.3, floorH * 0.46, 0.12, p.glassMat, w * 0.28, yMid + 0.12, -halfD - 0.04);
    if (fl === 2) {
      addLocalBox(grp, w * 0.62, 0.16, 0.9, p.creamPlasterMat, 0, balcY + 0.08, -halfD - 0.42);
      addLocalBox(grp, w * 0.48, 0.045, 0.12, p.housePorchGlowMat, 0, balcY - 0.02, -halfD - 0.52);
      addLocalBox(grp, w * 0.62, 0.07, 0.07, p.darkSteelMat, 0, balcY + 0.88, -halfD - 0.82);
      [-w * 0.28, 0, w * 0.28].forEach((rx) => {
        addLocalBox(grp, 0.05, 0.78, 0.05, p.darkSteelMat, rx, balcY + 0.48, -halfD - 0.82);
      });
    }

    p.addAcUnit(grp, w * 0.36, balcSlabY + 2.38, halfD + 0.18);
  }
}

/** Add Pitched Roof Styles: Thai Dual Gable, Japanese Hip, Terracotta Gable, Tin Sloped, or Mansard */
function addVietnameseRoofStyle(
  grp: THREE.Group,
  p: WestResPalette,
  w: number,
  bodyD: number,
  topY: number,
  style: 'thai_dual' | 'japanese_hip' | 'terracotta_gable' | 'tin_sloped' | 'mansard' | 'flat_tank',
  roofMat: THREE.Material
) {
  const visW = w - LOT_VISUAL_INSET;
  if (style === 'thai_dual') {
    [-visW * 0.22, visW * 0.22].forEach((gx) => {
      addLocalBox(grp, visW * 0.36, 1.35, 3.6, roofMat, gx - visW * 0.09, topY + 0.65, bodyD * 0.32, [0, 0, 0.52]);
      addLocalBox(grp, visW * 0.36, 1.35, 3.6, roofMat, gx + visW * 0.09, topY + 0.65, bodyD * 0.32, [0, 0, -0.52]);
    });
    addLocalBox(grp, visW + 0.02, 0.25, bodyD + 0.36, roofMat, 0, topY + 0.125, 0);
    p.addRooftopWaterTank(grp, 0, topY + 0.25, -bodyD * 0.25);
  } else if (style === 'japanese_hip') {
    addLocalBox(grp, visW + 0.02, 0.24, bodyD + 0.8, roofMat, 0, topY + 0.12, 0);
    addLocalBox(grp, visW * 0.8, 0.85, bodyD * 0.8, roofMat, 0, topY + 0.665, 0);
    addLocalBox(grp, visW * 0.52, 0.75, bodyD * 0.52, roofMat, 0, topY + 1.465, 0);
    addLocalBox(grp, visW * 0.26, 0.4, bodyD * 0.26, p.charcoalTrimMat, 0, topY + 2.04, 0);
  } else if (style === 'terracotta_gable') {
    const slopeD = bodyD * 0.56;
    addLocalBox(grp, visW + 0.02, 0.24, slopeD, roofMat, 0, topY + 0.75, bodyD * 0.24, [0.36, 0, 0]);
    addLocalBox(grp, visW + 0.02, 0.24, slopeD, roofMat, 0, topY + 0.75, -bodyD * 0.24, [-0.36, 0, 0]);
    addLocalBox(grp, visW + 0.02, 0.26, 0.35, p.creamPlasterMat, 0, topY + 1.65, 0);
  } else if (style === 'tin_sloped') {
    addLocalBox(grp, visW + 0.02, 0.14, bodyD + 0.7, roofMat, 0, topY + 0.42, 0.1, [0.09, 0, 0]);
    p.addRooftopWaterTank(grp, -visW * 0.25, topY + 0.55, -bodyD * 0.15);
    // Rooftop solar water heater collector (`máy nước nóng năng lượng mặt trời`)
    addLocalBox(grp, 1.5, 0.1, 1.25, p.darkSteelMat, visW * 0.2, topY + 0.88, -bodyD * 0.12, [0.42, 0, 0]);
    addLocalBox(grp, 1.56, 0.34, 0.34, p.chromeInoxMat, visW * 0.2, topY + 1.18, -bodyD * 0.15);
  } else if (style === 'mansard') {
    addLocalBox(grp, visW + 0.02, 1.55, bodyD + 0.2, roofMat, 0, topY + 0.775, 0);
    addLocalBox(grp, visW - 1.2, 0.4, bodyD - 1.2, p.charcoalTrimMat, 0, topY + 1.75, 0);
  } else {
    addLocalBox(grp, visW + 0.02, 0.45, bodyD + 0.2, p.charcoalTrimMat, 0, topY + 0.225, 0);
    p.addRooftopWaterTank(grp, visW * 0.24, topY + 0.45, -bodyD * 0.2);
    addLocalBox(grp, 1.45, 0.1, 1.2, p.darkSteelMat, -visW * 0.22, topY + 0.78, -bodyD * 0.15, [0.42, 0, 0]);
    addLocalBox(grp, 1.5, 0.32, 0.32, p.chromeInoxMat, -visW * 0.22, topY + 1.06, -bodyD * 0.18);
  }
}

/**
 * Adds bright ceiling LED lighting, wainscot baseboards, ceiling beams, fan, wall art, AC indoor unit,
 * and rear wooden staircase to any walkable shop or home ground floor!
 */
function addCommonGroundCeilingAndStairs(
  grp: THREE.Group,
  p: WestResPalette,
  w: number,
  bodyD: number,
  f1H: number,
  hasUpperFloor: boolean,
  isShop: boolean
) {
  const visW = w - LOT_VISUAL_INSET;
  const halfW = visW * 0.5;
  const halfD = bodyD * 0.5;
  // Bright interior ceiling slab + 3 wide glowing LED ceiling panels + 2 architectural timber beams (inset cleanly inside walls)
  addLocalBox(grp, visW - 0.82, 0.08, bodyD - 0.82, p.interiorWallMat, 0, f1H - 0.04, 0);
  addLocalBox(grp, Math.min(visW * 0.56, 4.0), 0.06, 0.62, p.interiorCeilingGlowMat, 0, f1H - 0.1, halfD * 0.66);
  addLocalBox(grp, Math.min(visW * 0.56, 4.0), 0.06, 0.62, p.interiorCeilingGlowMat, 0, f1H - 0.1, halfD * 0.18);
  addLocalBox(grp, Math.min(visW * 0.56, 4.0), 0.06, 0.62, p.interiorCeilingGlowMat, 0, f1H - 0.1, -halfD * 0.36);
  [halfD * 0.42, -halfD * 0.1].forEach((bz) => {
    addLocalBox(grp, visW - 0.82, 0.14, 0.2, isShop ? p.charcoalTrimMat : p.woodMat, 0, f1H - 0.11, bz);
  });

  // Interior Dado Wainscoting (`lamri tường`) along left, right & rear walls so rooms never look flat
  const dadoMat = isShop ? p.charcoalTrimMat : p.woodMat;
  addLocalBox(grp, 0.05, 0.88, bodyD - 0.72, dadoMat, -halfW + 0.4, 0.48, 0);
  addLocalBox(grp, 0.05, 0.88, bodyD - 0.72, dadoMat, halfW - 0.4, 0.48, 0);
  addLocalBox(grp, visW - 0.72, 0.88, 0.05, dadoMat, 0, 0.48, -halfD + 0.4);
  addLocalBox(grp, 0.07, 0.06, bodyD - 0.72, p.creamPlasterMat, -halfW + 0.41, 0.94, 0);
  addLocalBox(grp, 0.07, 0.06, bodyD - 0.72, p.creamPlasterMat, halfW - 0.41, 0.94, 0);

  // Indoor split-AC unit mounted high on rear wall
  addLocalBox(grp, 1.05, 0.3, 0.24, p.paintWhiteMat, -halfW * 0.36, f1H - 0.65, -halfD + 0.52);

  // Central Ceiling Fan (`quạt trần 4 cánh`) for shops
  if (isShop) {
    const fanZ = halfD * 0.15;
    addLocalBox(grp, 0.06, 0.34, 0.06, p.darkSteelMat, 0, f1H - 0.2, fanZ);
    addLocalBox(grp, 0.24, 0.1, 0.24, p.paintWhiteMat, 0, f1H - 0.36, fanZ);
    addLocalBox(grp, 1.48, 0.03, 0.15, p.woodMat, 0, f1H - 0.36, fanZ);
    addLocalBox(grp, 0.15, 0.03, 1.48, p.woodMat, 0, f1H - 0.36, fanZ);
  }

  // Decorative wall frame / menu board on rear interior wall + side framed posters
  addLocalBox(grp, Math.min(visW * 0.42, 3.0), 1.05, 0.06, isShop ? p.charcoalTrimMat : p.goldBrassMat, 0, 2.25, -halfD + 0.44);
  addLocalBox(
    grp,
    Math.min(visW * 0.38, 2.8),
    0.88,
    0.07,
    isShop ? p.terracottaTileMat : p.beddingBlueMat,
    0,
    2.25,
    -halfD + 0.46
  );
  // Twin framed artwork posters on left wall
  [-1.2, 1.2].forEach((oz, idx) => {
    addLocalBox(grp, 0.05, 0.76, 0.96, p.woodMat, -halfW + 0.42, 2.05, oz);
    addLocalBox(grp, 0.06, 0.62, 0.82, idx === 0 ? p.apricotBlossomMat : p.beddingCoralMat, -halfW + 0.43, 2.05, oz);
  });

  // Interior wooden staircase tucked cleanly along the rear-right wall ascending toward Floor 2
  if (hasUpperFloor && bodyD >= 11.0) {
    const stairX = halfW - 0.92;
    const steps = 8;
    const stepSpanZ = Math.min(4.6, bodyD * 0.26);
    const zStart = -halfD + 1.0 + stepSpanZ;
    for (let s = 0; s < steps; s++) {
      const sy = 0.24 + s * ((f1H - 0.55) / steps);
      const sz = zStart - (s / steps) * stepSpanZ;
      addLocalBox(grp, 1.05, 0.14, stepSpanZ / steps + 0.08, p.woodMat, stairX, sy, sz);
    }
    // Handrail post along open side of stair
    addLocalBox(grp, 0.06, 2.2, 0.06, p.darkSteelMat, stairX - 0.52, 1.15, zStart - stepSpanZ * 0.2);
    addLocalBox(grp, 0.06, 3.4, 0.06, p.darkSteelMat, stairX - 0.52, 1.75, zStart - stepSpanZ * 0.85);
  }
}

/**
 * Populates a detailed, walkable ground-floor interior tailored to either:
 * - A Vietnamese residential home (`ngôi nhà`): phòng khách (wooden sofa, tea table, rug, TV cabinet & flat-screen TV, shoe rack) + rear kitchen counter & fridge + dining set + stairs
 * - A neighborhood shop (`quán`): service/cashier counter + POS monitor + theme-specific showcase/shelves/barber mirrors/pharmacy racks + seating tables & chairs + stairs!
 */
export function addDetailedGroundFloorInterior(
  grp: THREE.Group,
  p: WestResPalette,
  w: number,
  bodyD: number,
  f1H: number,
  hasUpperFloor: boolean,
  opts: {
    isShop: boolean;
    theme?: 'cafe' | 'garden' | 'laundry' | 'barber' | 'pharmacy' | 'hardware' | 'ac_shop' | 'villa' | 'bikes';
  }
) {
  const halfW = w * 0.5;
  const halfD = bodyD * 0.5;
  const innerW = w - 0.8;

  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, hasUpperFloor, opts.isShop);

  const frontZoneZ = halfD * 0.34;
  const midZoneZ = -halfD * 0.05;
  const rearCounterZ = -halfD + 1.35;
  const leftSideX = -halfW + 1.28;
  const rightSideX = halfW - 1.28;

  if (!opts.isShop) {
    // =========================================================================
    // VIETNAMESE FAMILY HOUSE GROUND FLOOR (PHÒNG KHÁCH + BẾP + BÀN ĂN CHI TIẾT!)
    // =========================================================================
    // Soft decorative living room rug in front-left lounge
    addLocalBox(grp, Math.min(2.6, innerW * 0.34), 0.025, 3.2, p.beddingBlueMat, leftSideX + 0.4, 0.095, frontZoneZ);

    // Traditional Vietnamese Wooden Salon Sofa against Left Wall + Cushions + Armrests + Colorful Throw Pillows
    addLocalBox(grp, 0.88, 0.44, 2.7, p.woodMat, leftSideX - 0.26, 0.3, frontZoneZ); // Seat base
    addLocalBox(grp, 0.16, 0.92, 2.7, p.woodMat, leftSideX - 0.64, 0.54, frontZoneZ); // Backrest
    addLocalBox(grp, 0.88, 0.24, 0.14, p.woodMat, leftSideX - 0.26, 0.64, frontZoneZ - 1.28); // Rear armrest
    addLocalBox(grp, 0.88, 0.24, 0.14, p.woodMat, leftSideX - 0.26, 0.64, frontZoneZ + 1.28); // Front armrest
    addLocalBox(grp, 0.74, 0.12, 2.45, p.curtainMat, leftSideX - 0.22, 0.56, frontZoneZ); // Seat cushion
    addLocalBox(grp, 0.18, 0.3, 0.38, p.beddingCoralMat, leftSideX - 0.45, 0.76, frontZoneZ - 0.75); // Throw pillow 1
    addLocalBox(grp, 0.18, 0.3, 0.38, p.goldBrassMat, leftSideX - 0.45, 0.76, frontZoneZ); // Throw pillow 2
    addLocalBox(grp, 0.18, 0.3, 0.38, p.beddingBlueMat, leftSideX - 0.45, 0.76, frontZoneZ + 0.75); // Throw pillow 3

    // Tea Table (`bàn trà`) + Ceramic Tray + Teapot + 4 Teacups + Fruit Bowl
    addLocalBox(grp, 0.72, 0.46, 1.35, p.woodMat, leftSideX + 0.82, 0.31, frontZoneZ);
    addLocalBox(grp, 0.46, 0.04, 0.68, p.bambooMat, leftSideX + 0.82, 0.56, frontZoneZ - 0.12);
    addLocalBox(grp, 0.18, 0.16, 0.18, p.paintWhiteMat, leftSideX + 0.82, 0.65, frontZoneZ - 0.18); // Teapot
    addLocalBox(grp, 0.08, 0.09, 0.08, p.paintWhiteMat, leftSideX + 0.7, 0.61, frontZoneZ + 0.04); // Cup 1
    addLocalBox(grp, 0.08, 0.09, 0.08, p.paintWhiteMat, leftSideX + 0.94, 0.61, frontZoneZ + 0.04); // Cup 2
    addLocalBox(grp, 0.28, 0.14, 0.28, p.terracottaTileMat, leftSideX + 0.82, 0.61, frontZoneZ + 0.38); // Fruit bowl
    addLocalBox(grp, 0.16, 0.12, 0.16, p.apricotBlossomMat, leftSideX + 0.82, 0.71, frontZoneZ + 0.38); // Fruit pile

    // Standing Electric Fan (`quạt đứng`) next to the sofa
    const fanZ = frontZoneZ - 1.62;
    addLocalBox(grp, 0.36, 0.07, 0.36, p.paintWhiteMat, leftSideX - 0.12, 0.115, fanZ);
    addLocalBox(grp, 0.06, 0.96, 0.06, p.chromeInoxMat, leftSideX - 0.12, 0.62, fanZ);
    addLocalBox(grp, 0.12, 0.42, 0.42, p.beddingBlueMat, leftSideX - 0.12, 1.18, fanZ);

    // Right Wall: TV Console Cabinet + Soundbar + Vase + Flat-Screen TV + Wall Clock + Tall Display Bookshelf
    addLocalBox(grp, 0.52, 0.56, 2.4, p.woodMat, rightSideX + 0.48, 0.36, frontZoneZ);
    addLocalBox(grp, 0.14, 0.1, 1.15, p.charcoalTrimMat, rightSideX + 0.44, 0.69, frontZoneZ); // Soundbar
    addLocalBox(grp, 0.16, 0.28, 0.16, p.beddingCoralMat, rightSideX + 0.46, 0.78, frontZoneZ + 0.92); // Flower vase
    addLocalBox(grp, 0.24, 0.24, 0.24, p.bougainvilleaMat, rightSideX + 0.46, 0.98, frontZoneZ + 0.92); // Flowers
    addLocalBox(grp, 0.09, 0.92, 1.65, p.tvScreenMat, rightSideX + 0.56, 1.34, frontZoneZ);
    addLocalBox(grp, 0.06, 0.98, 1.72, p.darkSteelMat, rightSideX + 0.58, 1.34, frontZoneZ);
    // Wall Clock above TV
    addLocalBox(grp, 0.06, 0.4, 0.4, p.goldBrassMat, rightSideX + 0.6, 2.38, frontZoneZ);
    addLocalBox(grp, 0.07, 0.32, 0.32, p.paintWhiteMat, rightSideX + 0.59, 2.38, frontZoneZ);
    // Tall Bookshelf / Display Cabinet (`tủ sách phòng khách`) on mid-right wall
    if (bodyD >= 12.0) {
      const shelfZ = frontZoneZ - 2.35;
      addLocalBox(grp, 0.42, 1.92, 1.35, p.woodMat, rightSideX + 0.52, 1.04, shelfZ);
      addLocalBox(grp, 0.3, 0.24, 1.12, p.beddingBlueMat, rightSideX + 0.44, 0.78, shelfZ);
      addLocalBox(grp, 0.3, 0.24, 1.12, p.terracottaTileMat, rightSideX + 0.44, 1.24, shelfZ);
      addLocalBox(grp, 0.3, 0.24, 1.12, p.goldBrassMat, rightSideX + 0.44, 1.68, shelfZ);
    }

    // Compact Shoe Cabinet (`tủ giày`) + Indoor Potted Plant near front entrance pier
    addLocalBox(grp, 0.42, 0.95, 1.1, p.woodMat, rightSideX + 0.52, 0.55, halfD - 1.15);
    addLocalBox(grp, 0.36, 0.36, 0.36, p.terracottaTileMat, leftSideX - 0.36, 0.26, halfD - 0.95);
    addLocalBox(grp, 0.52, 0.7, 0.52, p.foliageMat, leftSideX - 0.36, 0.78, halfD - 0.95);

    // Family Dining Table + Rice Cooker + Plates + 4 Backed Chairs in Mid-Left Zone (clear central walkthrough!)
    if (bodyD >= 13.0) {
      const dinZ = midZoneZ - 1.1;
      addLocalBox(grp, 1.45, 0.08, 1.1, p.woodMat, leftSideX + 0.45, 0.78, dinZ);
      addLocalBox(grp, 0.12, 0.72, 0.12, p.darkSteelMat, leftSideX + 0.45, 0.4, dinZ);
      // Tableware: electric rice cooker (`nồi cơm điện`) + 2 dinner plates + condiment bottle
      addLocalBox(grp, 0.28, 0.24, 0.28, p.paintWhiteMat, leftSideX + 0.1, 0.94, dinZ);
      addLocalBox(grp, 0.26, 0.04, 0.26, p.chromeInoxMat, leftSideX + 0.52, 0.84, dinZ - 0.22);
      addLocalBox(grp, 0.26, 0.04, 0.26, p.chromeInoxMat, leftSideX + 0.52, 0.84, dinZ + 0.22);
      addLocalBox(grp, 0.1, 0.18, 0.1, p.plasticRedMat, leftSideX + 0.85, 0.91, dinZ);
      [-0.78, 0.78].forEach((oz) => {
        const backSign = oz > 0 ? 1 : -1;
        addLocalBox(grp, 0.38, 0.44, 0.38, p.woodMat, leftSideX + 0.15, 0.3, dinZ + oz);
        addLocalBox(grp, 0.38, 0.42, 0.07, p.woodMat, leftSideX + 0.15, 0.72, dinZ + oz + backSign * 0.16);
        addLocalBox(grp, 0.38, 0.44, 0.38, p.woodMat, leftSideX + 0.75, 0.3, dinZ + oz);
        addLocalBox(grp, 0.38, 0.42, 0.07, p.woodMat, leftSideX + 0.75, 0.72, dinZ + oz + backSign * 0.16);
      });
    }

    // Rear Kitchen Counter (Granite top + Sink & Faucet + Dual Stove & Cooking Pot + Microwave + Upper Cabinets + 2-Door Fridge!)
    const kitchenW = Math.max(3.2, innerW - 2.2);
    addLocalBox(grp, kitchenW, 0.92, 0.85, p.creamPlasterMat, -0.5, 0.54, rearCounterZ);
    addLocalBox(grp, kitchenW + 0.06, 0.08, 0.92, p.graniteRedBlackMat, -0.5, 1.02, rearCounterZ);
    // Backsplash + Stainless Sink & Arched Faucet + Gas Stove with Cooking Pot & Red Kettle + Microwave
    addLocalBox(grp, kitchenW, 0.75, 0.06, p.tilePatioMat, -0.5, 1.44, -halfD + 0.42);
    addLocalBox(grp, 0.72, 0.04, 0.52, p.chromeInoxMat, -1.25, 1.08, rearCounterZ); // Sink basin
    addLocalBox(grp, 0.06, 0.32, 0.06, p.chromeInoxMat, -1.25, 1.24, rearCounterZ - 0.24); // Faucet neck
    addLocalBox(grp, 0.78, 0.06, 0.46, p.charcoalTrimMat, -0.2, 1.09, rearCounterZ); // Dual gas stove
    addLocalBox(grp, 0.28, 0.22, 0.28, p.chromeInoxMat, -0.36, 1.23, rearCounterZ); // Cooking pot
    addLocalBox(grp, 0.2, 0.22, 0.2, p.plasticRedMat, 0.02, 1.23, rearCounterZ); // Kettle
    addLocalBox(grp, 0.52, 0.32, 0.36, p.paintWhiteMat, 0.72, 1.22, rearCounterZ - 0.06); // Microwave
    addLocalBox(grp, 0.32, 0.22, 0.04, p.charcoalTrimMat, 0.66, 1.22, rearCounterZ + 0.14); // Microwave window
    addLocalBox(grp, kitchenW, 0.68, 0.45, p.woodMat, -0.5, 2.25, -halfD + 0.62); // Upper cabinets
    // Tall 2-door Silver Refrigerator with dark door seam & chrome handles
    addLocalBox(grp, 0.82, 1.92, 0.82, p.chromeInoxMat, -halfW + 0.95, 1.04, rearCounterZ);
    addLocalBox(grp, 0.84, 0.04, 0.04, p.darkSteelMat, -halfW + 0.95, 1.38, rearCounterZ + 0.41);
    addLocalBox(grp, 0.04, 0.42, 0.06, p.paintWhiteMat, -halfW + 1.24, 1.62, rearCounterZ + 0.43);
    addLocalBox(grp, 0.04, 0.42, 0.06, p.paintWhiteMat, -halfW + 1.24, 1.04, rearCounterZ + 0.43);

    // === EXTRA VIETNAMESE HOME LIVING DETAILS (Fills middle & rear zones cleanly while keeping central aisle wide open!) ===
    // 1. Framed 3-Panel Wall Art (`bộ tranh treo tường`) above wooden sofa on Left Wall
    [-0.78, 0, 0.78].forEach((oz, idx) => {
      const artMat = idx === 1 ? p.apricotBlossomMat : idx === 0 ? p.beddingBlueMat : p.beddingCoralMat;
      addLocalBox(grp, 0.05, 0.72, 0.56, p.woodMat, leftSideX - 0.76, 1.88, frontZoneZ + oz);
      addLocalBox(grp, 0.06, 0.58, 0.44, artMat, leftSideX - 0.74, 1.88, frontZoneZ + oz);
    });

    // 2. Ceiling Fan (`quạt trần 4 cánh`) over living room & rear dining hall
    const fanYs = f1H - 0.36;
    [frontZoneZ, midZoneZ - 1.1].forEach((fz) => {
      addLocalBox(grp, 0.06, 0.34, 0.06, p.darkSteelMat, 0, f1H - 0.2, fz);
      addLocalBox(grp, 0.24, 0.1, 0.24, p.paintWhiteMat, 0, fanYs, fz);
      addLocalBox(grp, 1.45, 0.03, 0.14, p.paintWhiteMat, 0, fanYs, fz);
      addLocalBox(grp, 0.14, 0.03, 1.45, p.paintWhiteMat, 0, fanYs, fz);
    });

    // 3. Glowing Living-Room Aquarium (`bể cá cảnh`) on mid-right wall (bodyD >= 15m)
    if (bodyD >= 15.0) {
      const aqZ = midZoneZ + 0.35;
      addLocalBox(grp, 0.54, 0.78, 1.55, p.woodMat, rightSideX + 0.48, 0.46, aqZ); // Cabinet stand
      addLocalBox(grp, 0.48, 0.66, 1.45, p.clearSeeThroughGlassMat, rightSideX + 0.48, 1.18, aqZ); // Glass tank
      addLocalBox(grp, 0.34, 0.52, 1.32, p.tvScreenMat, rightSideX + 0.48, 1.16, aqZ); // Lit cyan aquarium water
      addLocalBox(grp, 0.14, 0.28, 0.18, p.foliageMat, rightSideX + 0.46, 1.04, aqZ - 0.36); // Aquatic plant
      addLocalBox(grp, 0.16, 0.22, 0.18, p.beddingCoralMat, rightSideX + 0.46, 1.01, aqZ + 0.32); // Coral rock
      addLocalBox(grp, 0.52, 0.09, 1.5, p.charcoalTrimMat, rightSideX + 0.48, 1.55, aqZ); // Tank hood
    }

    // 4. Study / Home-Office Desk (`bàn làm việc máy tính`) on rear-right wall (bodyD >= 17m)
    if (bodyD >= 17.0) {
      const deskZ = midZoneZ - 2.4;
      addLocalBox(grp, 0.68, 0.07, 1.4, p.woodMat, rightSideX + 0.4, 0.76, deskZ);
      addLocalBox(grp, 0.64, 0.72, 0.07, p.woodMat, rightSideX + 0.4, 0.38, deskZ - 0.64);
      addLocalBox(grp, 0.64, 0.72, 0.07, p.woodMat, rightSideX + 0.4, 0.38, deskZ + 0.64);
      addLocalBox(grp, 0.06, 0.42, 0.68, p.tvScreenMat, rightSideX + 0.56, 1.08, deskZ); // Glowing PC monitor
      addLocalBox(grp, 0.22, 0.04, 0.48, p.charcoalTrimMat, rightSideX + 0.28, 0.81, deskZ); // Keyboard
      addLocalBox(grp, 0.44, 0.44, 0.44, p.beddingBlueMat, rightSideX - 0.24, 0.28, deskZ); // Desk chair
      addLocalBox(grp, 0.08, 0.46, 0.42, p.beddingBlueMat, rightSideX - 0.44, 0.64, deskZ); // Chair backrest
    }

    // 5. Vietnamese Ancestor Altar Cabinet (`tủ thờ gia tiên`) with Brass Burner & Red Altar Bulbs
    if (bodyD >= 14.0) {
      const altZ = rearCounterZ + 2.35;
      addLocalBox(grp, 0.58, 1.24, 1.25, p.woodMat, rightSideX + 0.44, 0.68, altZ);
      addLocalBox(grp, 0.2, 0.16, 0.2, p.goldBrassMat, rightSideX + 0.44, 1.38, altZ); // Brass incense burner
      addLocalBox(grp, 0.1, 0.2, 0.1, p.plasticRedMat, rightSideX + 0.44, 1.4, altZ - 0.42); // Left red altar lamp
      addLocalBox(grp, 0.1, 0.2, 0.1, p.plasticRedMat, rightSideX + 0.44, 1.4, altZ + 0.42); // Right red altar lamp
      addLocalBox(grp, 0.08, 0.54, 0.38, p.goldBrassMat, rightSideX + 0.64, 1.62, altZ); // Golden altar plaque
    }

    // 6. Hot/Cold Water Dispenser (`cây nước nóng lạnh`) with Blue 20L Bottle + Front-Load Washer near Rear Kitchen
    addLocalBox(grp, 0.42, 0.96, 0.42, p.paintWhiteMat, leftSideX - 0.34, 0.54, rearCounterZ + 1.55);
    addLocalBox(grp, 0.3, 0.42, 0.3, p.plasticBlueMat, leftSideX - 0.34, 1.23, rearCounterZ + 1.55); // Blue water jug
    // Compact Front-Load Laundry Washer + Clothes Basket on rear-right corner
    const washX = halfW - 1.05;
    if (washX > 1.8) {
      addLocalBox(grp, 0.72, 0.88, 0.68, p.paintWhiteMat, washX, 0.5, rearCounterZ + 0.12);
      addLocalBox(grp, 0.42, 0.42, 0.06, p.charcoalTrimMat, washX, 0.52, rearCounterZ + 0.48);
      addLocalBox(grp, 0.3, 0.3, 0.07, p.clearSeeThroughGlassMat, washX, 0.52, rearCounterZ + 0.5);
      addLocalBox(grp, 0.48, 0.36, 0.42, p.beddingCoralMat, washX, 1.12, rearCounterZ + 0.12); // Laundry basket on top
    }
    return;
  }

  // =========================================================================
  // COMMERCIAL SHOP GROUND FLOOR (QUÁN CÀ PHÊ / QUÁN ĂN / NHÀ THUỐC / BARBER / CỬA HÀNG)
  // =========================================================================
  const theme = opts.theme ?? 'cafe';

  if (theme === 'pharmacy') {
    // White & Emerald Glass Medicine Counter + POS + Individual Pill Box Clusters + Blood-Pressure Desk + Chiller
    addLocalBox(grp, 1.15, 1.02, Math.min(5.2, bodyD * 0.32), p.paintWhiteMat, leftSideX + 0.15, 0.58, frontZoneZ - 0.8);
    addLocalBox(grp, 1.08, 0.42, Math.min(5.0, bodyD * 0.3), p.clearSeeThroughGlassMat, leftSideX + 0.15, 1.28, frontZoneZ - 0.8);
    addLocalBox(grp, 0.42, 0.36, 0.08, p.tvScreenMat, leftSideX + 0.2, 1.66, frontZoneZ + 0.6); // POS screen
    // Colorful blister packs & vitamin jars visible inside counter showcase
    [-1.2, -0.3, 0.6, 1.4].forEach((oz, pi) => {
      const pMat = pi % 2 === 0 ? p.emeraldRoofMat : p.beddingBlueMat;
      addLocalBox(grp, 0.52, 0.18, 0.55, pMat, leftSideX + 0.15, 1.18, frontZoneZ - 0.8 + oz);
    });
    addLocalBox(grp, 0.14, 0.56, 0.14, p.neonGreenCrossMat, -0.4, 2.75, rearCounterZ - 0.12);
    addLocalBox(grp, 0.56, 0.14, 0.14, p.neonGreenCrossMat, -0.4, 2.75, rearCounterZ - 0.12);
    // Back-wall medicine shelves with segmented colorful medicine boxes
    const rackW = Math.max(3.4, innerW - 2.0);
    addLocalBox(grp, rackW, 2.35, 0.55, p.paintWhiteMat, -0.4, 1.25, rearCounterZ - 0.15);
    const medMats = [p.emeraldRoofMat, p.beddingBlueMat, p.plasticRedMat, p.apricotBlossomMat, p.paintWhiteMat];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const bx = -0.4 - rackW * 0.36 + col * (rackW * 0.18);
        addLocalBox(grp, 0.46, 0.26, 0.34, medMats[(row + col) % medMats.length], bx, 0.72 + row * 0.62, rearCounterZ + 0.06);
      }
    }
    // Waiting bench + blood-pressure table + cold supplement chiller on right side
    addLocalBox(grp, 0.65, 0.46, 2.4, p.beddingBlueMat, rightSideX + 0.35, 0.3, frontZoneZ);
    addLocalBox(grp, 0.65, 0.74, 0.85, p.paintWhiteMat, rightSideX - 0.2, 0.42, frontZoneZ + 1.85);
    addLocalBox(grp, 0.24, 0.16, 0.28, p.emeraldRoofMat, rightSideX - 0.2, 0.88, frontZoneZ + 1.85);
    addLocalBox(grp, 0.72, 1.85, 0.72, p.paintWhiteMat, rightSideX + 0.32, 1.0, frontZoneZ - 2.0);
    addLocalBox(grp, 0.06, 1.32, 0.56, p.clearSeeThroughGlassMat, rightSideX - 0.04, 1.15, frontZoneZ - 2.0);
  } else if (theme === 'barber') {
    // Left Wall Framed Mirrors + Counter Shelf + Hair Products + Rolling Trolley + 2 Barber Chairs + Right Waiting Sofa
    addLocalBox(grp, 0.5, 0.85, 4.4, p.charcoalTrimMat, leftSideX - 0.38, 0.5, frontZoneZ - 0.6);
    [-1.1, 1.1].forEach((oz) => {
      addLocalBox(grp, 0.08, 1.46, 1.26, p.goldBrassMat, leftSideX - 0.71, 1.68, frontZoneZ - 0.6 + oz); // Gold mirror frame
      addLocalBox(grp, 0.06, 1.35, 1.15, p.clearSeeThroughGlassMat, leftSideX - 0.67, 1.68, frontZoneZ - 0.6 + oz);
      addLocalBox(grp, 0.08, 0.22, 0.08, p.plasticBlueMat, leftSideX - 0.32, 1.04, frontZoneZ - 0.6 + oz - 0.35);
      addLocalBox(grp, 0.08, 0.26, 0.08, p.plasticRedMat, leftSideX - 0.32, 1.06, frontZoneZ - 0.6 + oz + 0.35);
      addLocalBox(grp, 0.72, 0.54, 0.72, p.plasticRedMat, leftSideX + 0.55, 0.48, frontZoneZ - 0.6 + oz); // Barber chair
      addLocalBox(grp, 0.16, 0.56, 0.68, p.plasticRedMat, leftSideX + 0.86, 0.84, frontZoneZ - 0.6 + oz); // Chair backrest
      addLocalBox(grp, 0.2, 0.46, 0.2, p.chromeInoxMat, leftSideX + 0.55, 0.24, frontZoneZ - 0.6 + oz);
    });
    // Rolling barber tool trolley between chairs
    addLocalBox(grp, 0.44, 0.78, 0.44, p.darkSteelMat, leftSideX + 0.42, 0.42, frontZoneZ - 0.6);
    addLocalBox(grp, 0.1, 0.16, 0.1, p.apricotBlossomMat, leftSideX + 0.42, 0.88, frontZoneZ - 0.6);
    // Waiting sofa + throw pillows + rug + coffee table on right + rear reception desk
    addLocalBox(grp, 1.8, 0.025, 2.8, p.terracottaTileMat, rightSideX - 0.1, 0.095, frontZoneZ);
    addLocalBox(grp, 0.78, 0.48, 2.5, p.charcoalTrimMat, rightSideX + 0.32, 0.32, frontZoneZ);
    addLocalBox(grp, 0.18, 0.28, 0.36, p.beddingCoralMat, rightSideX + 0.18, 0.68, frontZoneZ - 0.7);
    addLocalBox(grp, 0.18, 0.28, 0.36, p.goldBrassMat, rightSideX + 0.18, 0.68, frontZoneZ + 0.7);
    addLocalBox(grp, 0.55, 0.42, 0.95, p.woodMat, rightSideX - 0.48, 0.28, frontZoneZ);
    addLocalBox(grp, Math.max(3.2, innerW - 2.2), 1.05, 0.9, p.woodMat, -0.4, 0.58, rearCounterZ);
    addLocalBox(grp, 0.42, 0.34, 0.08, p.tvScreenMat, -0.4, 1.28, rearCounterZ + 0.15);
  } else if (theme === 'hardware' || theme === 'ac_shop' || theme === 'laundry') {
    // Stocked Display Racks / Front-Loading Washing Machines + Stacked Dryers + Detergent Shelf / Paint & AC Wall Units
    const shelfLen = Math.min(5.6, bodyD * 0.34);
    if (theme === 'laundry') {
      // Row of 4 front-loading washing machines + upper stacked dryer drums + detergent jugs!
      for (let wm = 0; wm < 4; wm++) {
        const wz = frontZoneZ - 2.0 + wm * 1.15;
        addLocalBox(grp, 0.82, 0.98, 0.88, p.paintWhiteMat, leftSideX - 0.12, 0.56, wz);
        addLocalBox(grp, 0.06, 0.46, 0.46, p.charcoalTrimMat, leftSideX + 0.31, 0.56, wz);
        addLocalBox(grp, 0.08, 0.34, 0.34, p.clearSeeThroughGlassMat, leftSideX + 0.33, 0.56, wz);
        addLocalBox(grp, 0.76, 0.82, 0.84, p.chromeInoxMat, leftSideX - 0.14, 1.48, wz); // Stacked dryer above washer
        addLocalBox(grp, 0.06, 0.42, 0.42, p.darkSteelMat, leftSideX + 0.26, 1.48, wz);
      }
      // Detergent & softener rack on rear wall
      addLocalBox(grp, 1.6, 0.12, 0.42, p.woodMat, leftSideX + 0.1, 1.85, rearCounterZ + 1.2);
      addLocalBox(grp, 0.24, 0.34, 0.24, p.plasticRedMat, leftSideX - 0.2, 2.08, rearCounterZ + 1.2);
      addLocalBox(grp, 0.24, 0.34, 0.24, p.plasticBlueMat, leftSideX + 0.2, 2.08, rearCounterZ + 1.2);
    } else {
      addLocalBox(grp, 0.92, 2.05, shelfLen, p.darkSteelMat, leftSideX - 0.12, 1.1, frontZoneZ - 0.8);
      for (let lv = 0; lv < 3; lv++) {
        const m = lv === 0 ? p.plasticBlueMat : lv === 1 ? p.plasticRedMat : p.terracottaTileMat;
        addLocalBox(grp, 0.68, 0.34, shelfLen - 0.4, m, leftSideX + 0.06, 0.55 + lv * 0.62, frontZoneZ - 0.8);
      }
      // Stacked paint cans (`thùng sơn`) or split-AC showroom wall units
      [0, 1].forEach((si) => {
        const sz = frontZoneZ + 1.8 + si * 1.1;
        if (theme === 'ac_shop') {
          addLocalBox(grp, 0.26, 0.32, 0.95, p.paintWhiteMat, leftSideX - 0.52, 2.05, sz);
        } else {
          addLocalBox(grp, 0.46, 0.44, 0.46, si === 0 ? p.plasticRedMat : p.plasticBlueMat, leftSideX + 0.25, 0.3, sz);
          addLocalBox(grp, 0.42, 0.4, 0.42, p.apricotBlossomMat, leftSideX + 0.25, 0.72, sz);
        }
      });
    }
    // Right display island / appliance lineup + folding laundry basket / toolboxes
    addLocalBox(grp, 0.85, 1.05, 3.2, p.chromeInoxMat, rightSideX + 0.24, 0.6, frontZoneZ - 0.4);
    addLocalBox(grp, 0.52, 0.32, 0.64, p.plasticBlueMat, rightSideX + 0.24, 1.28, frontZoneZ + 0.4);
    addLocalBox(grp, 0.52, 0.32, 0.64, p.plasticRedMat, rightSideX + 0.24, 1.28, frontZoneZ - 0.6);
    // Rear cashier counter & POS monitor
    addLocalBox(grp, Math.max(3.4, innerW - 2.2), 1.02, 1.0, p.woodMat, -0.4, 0.58, rearCounterZ);
    addLocalBox(grp, 0.45, 0.36, 0.08, p.tvScreenMat, -0.4, 1.28, rearCounterZ + 0.15);
  } else {
    // Default Café / Eatery / Bakery Shop (`cafe` etc.) — Richly Stocked Showcase, Chiller, Floor Runner, Pendant Lights & Set Tables!
    const counterLen = Math.min(5.4, bodyD * 0.32);
    addLocalBox(grp, 1.4, 0.02, Math.max(4.0, bodyD - 4.0), p.terracottaTileMat, 0, 0.095, 0); // Warm center floor runner
    addLocalBox(grp, 1.18, 1.02, counterLen, p.woodMat, leftSideX + 0.12, 0.58, frontZoneZ - 0.8);
    addLocalBox(grp, 1.08, 0.52, counterLen * 0.55, p.clearSeeThroughGlassMat, leftSideX + 0.12, 1.34, frontZoneZ + 0.35);
    // Visible pastries / food trays inside glass showcase
    addLocalBox(grp, 0.54, 0.14, 0.85, p.apricotBlossomMat, leftSideX + 0.12, 1.18, frontZoneZ + 0.55);
    addLocalBox(grp, 0.54, 0.14, 0.65, p.terracottaTileMat, leftSideX + 0.12, 1.18, frontZoneZ - 0.15);
    addLocalBox(grp, 0.54, 0.14, 0.65, p.bougainvilleaMat, leftSideX + 0.12, 1.38, frontZoneZ + 0.35);
    addLocalBox(grp, 0.55, 0.48, 0.48, p.chromeInoxMat, leftSideX + 0.12, 1.32, frontZoneZ - 1.5); // Coffee machine / broth warmer
    addLocalBox(grp, 0.32, 0.44, 0.32, p.charcoalTrimMat, leftSideX + 0.12, 1.3, frontZoneZ - 2.15); // Coffee grinder
    addLocalBox(grp, 0.42, 0.34, 0.08, p.tvScreenMat, leftSideX + 0.18, 1.28, frontZoneZ - 0.5); // POS terminal
    // Glass Beverage Chiller Fridge (`tủ mát nước ngọt`) with colorful drinks visible
    addLocalBox(grp, 0.78, 1.92, 0.82, p.paintWhiteMat, leftSideX - 0.05, 1.04, rearCounterZ + 1.35);
    addLocalBox(grp, 0.06, 1.4, 0.64, p.clearSeeThroughGlassMat, leftSideX + 0.36, 1.14, rearCounterZ + 1.35);
    addLocalBox(grp, 0.35, 0.22, 0.52, p.plasticRedMat, leftSideX + 0.12, 0.84, rearCounterZ + 1.35);
    addLocalBox(grp, 0.35, 0.22, 0.52, p.emeraldRoofMat, leftSideX + 0.12, 1.22, rearCounterZ + 1.35);
    addLocalBox(grp, 0.35, 0.22, 0.52, p.plasticBlueMat, leftSideX + 0.12, 1.58, rearCounterZ + 1.35);
    // 3 Customer Dining/Café Tables + Bowls/Cups + Condiments + Stools + Hanging Pendant Lamps along Right Side
    const shopTableZs = bodyD >= 17.5 ? [frontZoneZ + 1.0, frontZoneZ - 1.9, frontZoneZ - 4.8] : [frontZoneZ + 0.8, frontZoneZ - 2.2];
    shopTableZs.forEach((tz, idx) => {
      if (tz < -halfD + 2.8) return;
      addLocalBox(grp, 1.32, 0.08, 0.92, p.woodMat, rightSideX - 0.05, 0.78, tz);
      addLocalBox(grp, 0.12, 0.72, 0.12, p.darkSteelMat, rightSideX - 0.05, 0.4, tz);
      // Table bowls / coffee cups + chopsticks caddy + red chili jar
      addLocalBox(grp, 0.2, 0.12, 0.2, p.paintWhiteMat, rightSideX - 0.34, 0.88, tz - 0.12);
      addLocalBox(grp, 0.2, 0.12, 0.2, p.paintWhiteMat, rightSideX + 0.22, 0.88, tz + 0.12);
      addLocalBox(grp, 0.09, 0.18, 0.09, p.bambooMat, rightSideX - 0.04, 0.91, tz);
      addLocalBox(grp, 0.08, 0.12, 0.08, p.plasticRedMat, rightSideX + 0.08, 0.88, tz - 0.14);
      // Warm pendant lamp hanging over table
      addLocalBox(grp, 0.04, 0.9, 0.04, p.darkSteelMat, rightSideX - 0.05, f1H - 0.55, tz);
      addLocalBox(grp, 0.32, 0.2, 0.32, p.interiorCeilingGlowMat, rightSideX - 0.05, f1H - 1.06, tz);
      const stoolMat = idx % 2 === 0 ? p.plasticRedMat : p.plasticBlueMat;
      addLocalBox(grp, 0.36, 0.44, 0.36, stoolMat, rightSideX - 0.05, 0.28, tz - 0.72);
      addLocalBox(grp, 0.36, 0.44, 0.36, stoolMat, rightSideX - 0.05, 0.28, tz + 0.72);
    });
    // Rear kitchen / bar pass counter with steaming broth pot & stainless range hood
    addLocalBox(grp, Math.max(3.4, innerW - 2.2), 1.0, 1.05, p.chromeInoxMat, -0.4, 0.58, rearCounterZ);
    addLocalBox(grp, 0.42, 0.36, 0.42, p.chromeInoxMat, -0.8, 1.26, rearCounterZ);
    addLocalBox(grp, 2.2, 0.46, 0.88, p.chromeInoxMat, -0.4, f1H - 0.95, rearCounterZ);
  }

  // Common Commercial Shop Finishing Touches: Illuminated Wall Menu/Price Board + Wall Fan + Entrance Potted Plants
  addLocalBox(grp, 0.06, 0.88, 2.25, p.charcoalTrimMat, rightSideX + 0.58, 2.28, frontZoneZ - 0.4);
  addLocalBox(grp, 0.07, 0.72, 2.05, p.windowWarmMat, rightSideX + 0.56, 2.28, frontZoneZ - 0.4); // Glowing price/menu board
  // Wall-mounted oscillating fan (`quạt treo tường`) on Left Wall
  addLocalBox(grp, 0.18, 0.36, 0.36, p.plasticBlueMat, leftSideX - 0.58, 2.55, midZoneZ);
  // Twin Potted Entrance Plants flanking doorway inside
  [-halfW + 0.82, halfW - 0.82].forEach((px) => {
    addLocalBox(grp, 0.38, 0.36, 0.38, p.terracottaTileMat, px, 0.24, halfD - 0.85);
    addLocalBox(grp, 0.52, 0.68, 0.52, p.foliageMat, px, 0.74, halfD - 0.85);
  });
}

/**
 * Shared enrichment helper for the 5 prime front-row walkable eateries (Phở, Cơm Tấm, Bún Đậu, Hủ Tiếu, Bún Bò Huế):
 * fills the deep 21–24m halls with extra dining tables, floor runner, hanging lanterns, beer crates, range hood,
 * tableware, beverage chiller, menu board, kitchen pots, entrance potted flowers & outdoor patio table + umbrella!
 */
function enrichWalkableEateryHall(
  grp: THREE.Group,
  p: WestResPalette,
  w: number,
  bodyD: number,
  f1H: number,
  opts: {
    tableSideX: number;
    counterSideX: number;
    tableMat: THREE.Material;
    stoolMat: THREE.Material;
    umbrellaMat: THREE.Material;
    tableZs: number[];
    patioSideSign: -1 | 1;
  }
) {
  const halfW = w * 0.5;
  const halfD = bodyD * 0.5;

  // Warm center aisle floor runner + 3 hanging warm dining hall lanterns (`đèn lồng quán ăn`)
  addLocalBox(grp, 1.55, 0.02, Math.max(8.0, bodyD - 6.5), p.terracottaTileMat, 0, 0.09, 0.5);
  [-4.2, 0.4, 5.0].forEach((lz) => {
    addLocalBox(grp, 0.04, 0.72, 0.04, p.darkSteelMat, 0, f1H - 0.42, lz);
    addLocalBox(grp, 0.42, 0.34, 0.42, p.interiorCeilingGlowMat, 0, f1H - 0.86, lz);
  });

  // Full Dining Tables set with Noodle Bowls, Iced Tea Cups, Chopsticks Caddy, Chili Jar, Stools & Pendant Lamps
  opts.tableZs.forEach((tz) => {
    addLocalBox(grp, 1.55, 0.08, 1.05, opts.tableMat, opts.tableSideX, 0.74, tz);
    addLocalBox(grp, 0.12, 0.7, 0.12, p.darkSteelMat, opts.tableSideX, 0.37, tz);
    // Tableware (2 bowls + chopsticks + red chili bottle + green lime plate + napkin box)
    addLocalBox(grp, 0.24, 0.12, 0.24, p.paintWhiteMat, opts.tableSideX - 0.35, 0.84, tz - 0.16);
    addLocalBox(grp, 0.24, 0.12, 0.24, p.paintWhiteMat, opts.tableSideX + 0.32, 0.84, tz + 0.16);
    addLocalBox(grp, 0.1, 0.18, 0.1, p.bambooMat, opts.tableSideX, 0.87, tz);
    addLocalBox(grp, 0.08, 0.14, 0.08, p.plasticRedMat, opts.tableSideX + 0.18, 0.85, tz - 0.18);
    addLocalBox(grp, 0.14, 0.06, 0.14, p.foliageMat, opts.tableSideX - 0.18, 0.81, tz + 0.2);
    addLocalBox(grp, 0.16, 0.09, 0.12, p.paintWhiteMat, opts.tableSideX + 0.44, 0.82, tz - 0.22);
    // 4 Stools around each table (left/right & front/back)
    addLocalBox(grp, 0.36, 0.44, 0.36, opts.stoolMat, opts.tableSideX - 1.02, 0.24, tz);
    addLocalBox(grp, 0.36, 0.44, 0.36, opts.stoolMat, opts.tableSideX + 1.02, 0.24, tz);
    addLocalBox(grp, 0.36, 0.44, 0.36, opts.stoolMat, opts.tableSideX, 0.24, tz - 0.76);
    addLocalBox(grp, 0.36, 0.44, 0.36, opts.stoolMat, opts.tableSideX, 0.24, tz + 0.76);
    // Warm pendant lantern hanging over table
    addLocalBox(grp, 0.04, 0.94, 0.04, p.darkSteelMat, opts.tableSideX, f1H - 0.56, tz);
    addLocalBox(grp, 0.36, 0.24, 0.36, p.interiorCeilingGlowMat, opts.tableSideX, f1H - 1.08, tz);
  });

  // Tall Glass Beverage Chiller Fridge (`tủ mát nước ngọt`) + Stacked Beer/Soda Crates (`két bia`) behind counter
  const fridgeZ = -2.4;
  addLocalBox(grp, 0.9, 2.02, 0.95, p.paintWhiteMat, opts.counterSideX, 1.05, fridgeZ);
  addLocalBox(grp, 0.54, 0.24, 0.68, p.plasticRedMat, opts.counterSideX, 0.78, fridgeZ);
  addLocalBox(grp, 0.54, 0.24, 0.68, p.emeraldRoofMat, opts.counterSideX, 1.22, fridgeZ);
  addLocalBox(grp, 0.54, 0.24, 0.68, p.plasticBlueMat, opts.counterSideX, 1.66, fridgeZ);
  addLocalBox(grp, 0.54, 0.34, 0.44, p.plasticRedMat, opts.counterSideX, 0.21, fridgeZ - 0.95);
  addLocalBox(grp, 0.54, 0.34, 0.44, p.plasticBlueMat, opts.counterSideX, 0.55, fridgeZ - 0.95);

  // Visible Food Trays & Steaming Broth Pots on Front Counter + Rear Kitchen Pass + Stainless Range Hood (`máy hút mùi`)
  addLocalBox(grp, 0.58, 0.2, 0.9, p.apricotBlossomMat, opts.counterSideX, 1.18, 1.6);
  addLocalBox(grp, 0.58, 0.16, 0.78, p.beddingCoralMat, opts.counterSideX, 1.16, 2.9);
  addLocalBox(grp, 0.58, 0.16, 0.78, p.foliageMat, opts.counterSideX, 1.16, 4.1);
  addLocalBox(grp, 0.56, 0.46, 0.56, p.chromeInoxMat, -1.2, 1.26, -halfD + 4.0);
  addLocalBox(grp, 0.56, 0.42, 0.56, p.chromeInoxMat, 1.1, 1.24, -halfD + 4.0);
  addLocalBox(grp, Math.min(4.8, w * 0.52), 0.48, 0.95, p.chromeInoxMat, 0, f1H - 0.95, -halfD + 4.0);
  addLocalBox(grp, 0.6, 0.75, 0.6, p.chromeInoxMat, 0, f1H - 0.36, -halfD + 4.0);

  // Illuminated Wall Menu Board + Oscillating Wall Fans along Dining Wall
  const wallX = opts.tableSideX > 0 ? halfW - 0.46 : -halfW + 0.46;
  const wallSign = opts.tableSideX > 0 ? -1 : 1;
  addLocalBox(grp, 0.06, 1.05, 3.2, p.charcoalTrimMat, wallX, 2.38, 1.8);
  addLocalBox(grp, 0.07, 0.88, 2.95, p.windowWarmMat, wallX + wallSign * 0.03, 2.38, 1.8);
  [-2.0, 4.8].forEach((fz) => {
    addLocalBox(grp, 0.16, 0.38, 0.38, p.plasticBlueMat, wallX + wallSign * 0.12, 2.68, fz);
  });

  // Entrance Potted Flowers + A-Frame Sidewalk Daily Specials Standee (`bảng menu đứng`)
  [-halfW + 0.85, halfW - 0.85].forEach((px) => {
    addLocalBox(grp, 0.42, 0.4, 0.42, p.terracottaTileMat, px, 0.22, halfD + 0.75);
    addLocalBox(grp, 0.56, 0.62, 0.56, p.foliageMat, px, 0.7, halfD + 0.75);
    addLocalBox(grp, 0.34, 0.28, 0.34, p.bougainvilleaMat, px, 1.02, halfD + 0.75);
  });
  const aFrameX = -opts.patioSideSign * (halfW - 1.45);
  addLocalBox(grp, 0.62, 1.04, 0.12, p.woodMat, aFrameX, 0.56, halfD + 1.45, [-0.14, 0, 0]);
  addLocalBox(grp, 0.5, 0.78, 0.04, p.charcoalTrimMat, aFrameX, 0.62, halfD + 1.52, [-0.14, 0, 0]);

  // Outdoor Front Patio Dining Table + Stools + Striped Sun Umbrella (tucked cleanly on wing, doorway 100% open!)
  const patX = opts.patioSideSign * (halfW - 1.85);
  const patZ = halfD + 3.4;
  addLocalBox(grp, 1.05, 0.07, 0.85, opts.tableMat, patX, 0.66, patZ);
  addLocalBox(grp, 0.1, 0.62, 0.1, p.chromeInoxMat, patX, 0.33, patZ);
  addLocalBox(grp, 0.32, 0.38, 0.32, opts.stoolMat, patX - 0.68, 0.21, patZ);
  addLocalBox(grp, 0.32, 0.38, 0.32, opts.stoolMat, patX + 0.68, 0.21, patZ);
  addLocalBox(grp, 0.07, 2.55, 0.07, p.chromeInoxMat, patX, 1.28, patZ);
  addLocalBox(grp, 2.25, 0.14, 2.25, opts.umbrellaMat, patX, 2.55, patZ);
}

/** Walkable Tiệm Sửa Xe & Rửa Xe Chú Bảy (House 7: X=-435..-425.4, Z=-15.8..+5.4) */
export function buildWalkableMotorRepairShop(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  facingNorth = false
) {
  const w = 9.6;
  const visW = w - LOT_VISUAL_INSET;
  const bodyD = 21.2;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const halfD = bodyD * 0.5;
  const doorW = 5.2;

  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.concreteMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.concreteMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 9.8, p.tilePatioMat, 0, 0.03, halfD + 4.9);

  // Hollow F1 walls (wide open garage bay with automatic sliding door — non-overlapping side & front corners!)
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.warmYellowWallMat, -visW * 0.5 + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.warmYellowWallMat, visW * 0.5 - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, p.warmYellowWallMat, 0, f1H * 0.5, -halfD + 0.2);
  addLocalBox(grp, (visW - doorW) * 0.5, f1H, 0.4, p.tealTinRoofMat, -(doorW * 0.5 + (visW - doorW) * 0.25), f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, (visW - doorW) * 0.5, f1H, 0.4, p.tealTinRoofMat, doorW * 0.5 + (visW - doorW) * 0.25, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, p.tealTinRoofMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, true, true);

  // Upper 2nd floor (transparent furnished!) + Tin Roof + Sơn Hà Water Tank
  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  addUpperStoriesShell(grp, p, w, bodyD, 2, 3.1, slabBaseY, p.warmYellowWallMat, {
    tigerCage: true,
    isShop: true,
    variantSeed: 7,
  });
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 3.1, 'tin_sloped', p.tealTinRoofMat);

  // Slim Awning & Unobstructed Signboard (Y = 2.99..3.97 — well below balcony Y = 4.22!)
  addLocalBox(grp, visW - 0.2, 0.09, 1.45, p.tealTinRoofMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    8.6,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'SỬA XE CHÚ BẢY',
    'Vá Vỏ • Thay Nhớt • Rửa Xe 24H',
    { bg: '#166534', bg2: '#14532d', border: '#fde047' }
  );

  // Rear facade backdoor, lit kitchen window & utility awning
  addLocalBox(grp, 1.35, 2.35, 0.14, p.darkSteelMat, -w * 0.24, 1.18, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.35, 0.12, p.windowWarmMat, w * 0.2, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.86, 0.12, 0.9, p.tealTinRoofMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  // Inside Workshop Props: Dual Hydraulic Bike Lifts + Air Compressor + Spare Tire Rack + Oil Shelf + Tool Chest + Waiting Bench!
  addLocalBox(grp, 1.4, 0.22, 2.8, p.plasticRedMat, -2.5, 0.11, 2.0);
  p.addMotorbike(grp, -2.5, 2.0, 0.2, 0x0ea5e9);
  addLocalBox(grp, 1.4, 0.22, 2.8, p.plasticBlueMat, -2.5, 0.11, -2.2);
  p.addMotorbike(grp, -2.5, -2.2, 0.12, 0xf59e0b);
  addLocalBox(grp, 0.56, 0.08, 0.42, p.chromeInoxMat, -1.35, 0.08, 1.6); // Oil drain tray beside front lift
  addLocalBox(grp, 0.9, 0.85, 0.55, p.plasticRedMat, 3.6, 0.42, 4.2); // Air compressor
  addLocalBox(grp, 6.8, 0.95, 1.3, p.charcoalTrimMat, 0, 0.48, -6.5); // Rear tool workbench
  addLocalBox(grp, 0.36, 0.24, 0.26, p.darkSteelMat, -2.2, 1.08, -6.4); // Bench vise (`êtô`)
  addLocalBox(grp, 0.95, 0.98, 0.62, p.plasticRedMat, 2.6, 0.52, -6.4); // Red rolling mechanic tool chest
  addLocalBox(grp, 5.4, 1.15, 0.08, p.darkSteelMat, 0, 1.85, -7.25); // Wall tool pegboard
  [-1.8, -0.6, 0.6, 1.8].forEach((wx) => {
    addLocalBox(grp, 0.08, 0.52, 0.04, p.chromeInoxMat, wx, 1.85, -7.18); // Hanging wrenches
  });
  // Spare tire rack + motor oil display shelves + stacked tires on right wall
  addLocalBox(grp, 0.75, 2.05, 3.2, p.darkSteelMat, 3.9, 1.05, -0.8);
  for (let lv = 0; lv < 3; lv++) {
    const bottleMat = lv === 0 ? p.apricotBlossomMat : lv === 1 ? p.plasticRedMat : p.plasticBlueMat;
    addLocalBox(grp, 0.46, 0.28, 2.8, bottleMat, 3.85, 0.58 + lv * 0.6, -0.8);
  }
  [0.24, 0.52, 0.8].forEach((ty) => {
    addLocalBox(grp, 0.68, 0.24, 0.68, p.charcoalTrimMat, 3.8, ty, -3.1); // Stacked spare tires
  });
  // Customer waiting bench + iced tea table with glasses near front-right
  addLocalBox(grp, 0.65, 0.46, 2.1, p.woodMat, 3.8, 0.25, 6.4);
  addLocalBox(grp, 0.58, 0.48, 0.82, p.plasticBlueMat, 2.85, 0.26, 6.4);
  addLocalBox(grp, 0.14, 0.18, 0.14, p.apricotBlossomMat, 2.85, 0.58, 6.25);
  addLocalBox(grp, 0.14, 0.18, 0.14, p.apricotBlossomMat, 2.85, 0.58, 6.55);
  // Outdoor car/bike wash bay water drum + parked bikes on patio wings
  addLocalBox(grp, 0.64, 0.92, 0.64, p.plasticBlueMat, -3.5, 0.48, halfD + 2.2);
  p.addMotorbike(grp, 3.2, halfD + 3.5, -0.4, 0xef4444);
}

/** Walkable Phở Bò & Bún Chả Hà Nội — Mặt Tiền Gạch Bông Gió (House 11) */
export function buildWalkablePhoBreezeHouse(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  facingNorth = false
) {
  const w = 9.6;
  const visW = w - LOT_VISUAL_INSET;
  const bodyD = 21.2;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const halfD = bodyD * 0.5;
  const doorW = 4.4;

  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.tilePatioMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.tilePatioMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 9.8, p.tilePatioMat, 0, 0.03, halfD + 4.9);

  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.creamPlasterMat, -visW * 0.5 + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.creamPlasterMat, visW * 0.5 - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, p.creamPlasterMat, 0, f1H * 0.5, -halfD + 0.2);
  addLocalBox(grp, (visW - doorW) * 0.5, f1H, 0.4, p.creamPlasterMat, -(doorW * 0.5 + (visW - doorW) * 0.25), f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, (visW - doorW) * 0.5, f1H, 0.4, p.creamPlasterMat, doorW * 0.5 + (visW - doorW) * 0.25, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, p.creamPlasterMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, true, true);

  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  addUpperStoriesShell(grp, p, w, bodyD, 3, 3.1, slabBaseY, p.sandBeigeWallMat, {
    breezeBlock: true,
    breezeMat: p.breezeBlockWhiteMat,
    planters: true,
    isShop: true,
    variantSeed: 11,
  });
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 6.2, 'flat_tank', p.creamPlasterMat);

  addLocalBox(grp, visW - 0.2, 0.09, 1.45, p.stripedAwningMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    8.6,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'PHỞ BÒ HÀ NỘI',
    'Tái Nạm • Bún Chả Quạt Than Hoa',
    { bg: '#b91c1c', bg2: '#7f1d1d', border: '#fde047' }
  );

  addLocalBox(grp, 1.35, 2.35, 0.14, p.woodMat, -w * 0.22, 1.18, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.3, 0.12, p.windowWarmMat, w * 0.22, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.86, 0.12, 0.9, p.charcoalTrimMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  addLocalBox(grp, 1.5, 1.05, 6.2, p.chromeInoxMat, -2.9, 0.52, 3.2);
  addLocalBox(grp, 0.65, 0.55, 0.65, p.chromeInoxMat, -2.9, 1.32, 4.8);
  addLocalBox(grp, 6.4, 1.0, 1.4, p.woodMat, 0, 0.5, -6.4);
  enrichWalkableEateryHall(grp, p, w, bodyD, f1H, {
    tableSideX: 2.4,
    counterSideX: -2.9,
    tableMat: p.woodMat,
    stoolMat: p.plasticRedMat,
    umbrellaMat: p.stripedAwningMat,
    tableZs: [-2.6, 1.0, 4.6, 7.6],
    patioSideSign: -1,
  });
}

/** Walkable Quán Cơm Tấm Sài Gòn (House S1 across the street) */
export function buildWalkableComTamShop(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  facingNorth = true
) {
  const w = 10.0;
  const visW = w - LOT_VISUAL_INSET;
  const bodyD = 24.0;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const halfD = bodyD * 0.5;
  const doorW = 4.4;

  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.tilePatioMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.tilePatioMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 9.5, p.tilePatioMat, 0, 0.03, halfD + 4.75);

  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.warmYellowWallMat, -visW * 0.5 + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.warmYellowWallMat, visW * 0.5 - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, p.warmYellowWallMat, 0, f1H * 0.5, -halfD + 0.2);
  addLocalBox(grp, (visW - doorW) * 0.5, f1H, 0.4, p.warmYellowWallMat, -(doorW * 0.5 + (visW - doorW) * 0.25), f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, (visW - doorW) * 0.5, f1H, 0.4, p.warmYellowWallMat, doorW * 0.5 + (visW - doorW) * 0.25, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, p.warmYellowWallMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, true, true);

  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  addUpperStoriesShell(grp, p, w, bodyD, 3, 3.1, slabBaseY, p.warmYellowWallMat, {
    planters: true,
    isShop: true,
    variantSeed: 21,
  });
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 6.2, 'terracotta_gable', p.terracottaTileMat);

  addLocalBox(grp, visW - 0.2, 0.09, 1.45, p.stripedAwningMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    9.0,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'CƠM TẤM SÀI GÒN',
    'Sườn Nướng • Bì Chả • Trứng Ốp La',
    { bg: '#ea580c', bg2: '#c2410c', border: '#fef08a' }
  );

  addLocalBox(grp, 1.35, 2.35, 0.14, p.woodMat, -w * 0.22, 1.18, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.3, 0.12, p.windowWarmMat, w * 0.22, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.86, 0.12, 0.9, p.terracottaTileMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  addLocalBox(grp, 1.6, 1.1, 6.8, p.chromeInoxMat, -3.1, 0.55, 3.2);
  addLocalBox(grp, 1.5, 0.65, 6.6, p.clearSeeThroughGlassMat, -3.1, 1.42, 3.2);
  addLocalBox(grp, 6.8, 1.0, 1.5, p.woodMat, 0, 0.5, -7.2);
  enrichWalkableEateryHall(grp, p, w, bodyD, f1H, {
    tableSideX: 2.6,
    counterSideX: -3.1,
    tableMat: p.chromeInoxMat,
    stoolMat: p.plasticBlueMat,
    umbrellaMat: p.stripedAwningMat,
    tableZs: [-2.8, 1.2, 5.2, 8.6],
    patioSideSign: 1,
  });
  // Charcoal pork-chop BBQ grill cart (`bếp nướng sườn cơm tấm`) on front-left patio
  addLocalBox(grp, 1.6, 0.9, 0.8, p.chromeInoxMat, -3.4, 0.45, halfD + 1.8);
  addLocalBox(grp, 1.4, 0.14, 0.62, p.plasticRedMat, -3.4, 0.96, halfD + 1.8);
}

/** Walkable Quán Bún Đậu Mẹt & Trà Chanh Góc Hẻm 426 (House S6 across the street) */
export function buildWalkableBunDauCorner(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  facingNorth = true
) {
  const w = 8.6;
  const visW = w - LOT_VISUAL_INSET;
  const bodyD = 24.0;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const halfD = bodyD * 0.5;
  const doorW = 4.4;
  const sideFrontW = (visW - doorW) * 0.5;

  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.brickCourtyardMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.brickCourtyardMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 9.5, p.brickCourtyardMat, 0, 0.03, halfD + 4.75);

  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.ochreHoiAnMat, -visW * 0.5 + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.ochreHoiAnMat, visW * 0.5 - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, p.ochreHoiAnMat, 0, f1H * 0.5, -halfD + 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, p.bambooMat, -(doorW * 0.5 + sideFrontW * 0.5), f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, p.bambooMat, doorW * 0.5 + sideFrontW * 0.5, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, p.bambooMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, true, true);

  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  addUpperStoriesShell(grp, p, w, bodyD, 2, 3.1, slabBaseY, p.ochreHoiAnMat, {
    timberLouvers: true,
    isShop: true,
    variantSeed: 26,
  });
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 3.1, 'terracotta_gable', p.weatheredTileMat);

  addLocalBox(grp, visW - 0.2, 0.09, 1.45, p.greenAwningMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    7.8,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'BÚN ĐẬU MẸT 426',
    'Trà Chanh • Nem Chua Rán • Mắm Tôm',
    { bg: '#15803d', bg2: '#166534', border: '#fef08a' }
  );

  addLocalBox(grp, 1.35, 2.35, 0.14, p.bambooMat, -w * 0.22, 1.18, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.3, 0.12, p.windowWarmMat, w * 0.22, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.86, 0.12, 0.9, p.greenAwningMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  addLocalBox(grp, 1.5, 1.0, 6.2, p.bambooMat, 2.7, 0.5, 3.2);
  addLocalBox(grp, 6.4, 1.0, 1.4, p.woodMat, 0, 0.5, -7.0);
  enrichWalkableEateryHall(grp, p, w, bodyD, f1H, {
    tableSideX: -2.4,
    counterSideX: 2.7,
    tableMat: p.bambooMat,
    stoolMat: p.bambooMat,
    umbrellaMat: p.greenAwningMat,
    tableZs: [-2.8, 1.2, 5.2, 8.6],
    patioSideSign: 1,
  });
}

/** Versatile Configurable Vietnamese Residence / Shophouse / Courtyard House — ALL WALKABLE WITH AUTO DOORS & TRANSPARENT 2F! */
export function buildDiverseVietnameseHouse(
  staticGroup: THREE.Group,
  p: WestResPalette,
  spec: {
    cx: number;
    cz: number;
    w: number;
    bodyD: number;
    yardD: number;
    facingNorth: boolean;
    floors: 1 | 2 | 3 | 4;
    wallMat: THREE.Material;
    roofStyle: 'thai_dual' | 'japanese_hip' | 'terracotta_gable' | 'tin_sloped' | 'mansard' | 'flat_tank';
    roofMat: THREE.Material;
    signTitle?: string;
    signSub?: string;
    signBg?: string;
    breezeBlock?: boolean;
    breezeMat?: THREE.Material;
    goldLouvers?: boolean;
    timberLouvers?: boolean;
    tigerCage?: boolean;
    graniteTrim?: boolean;
    laundry?: boolean;
    planters?: boolean;
    yardTheme?: 'cafe' | 'garden' | 'laundry' | 'barber' | 'pharmacy' | 'hardware' | 'ac_shop' | 'villa' | 'bikes';
    blossom?: 'none' | 'pink' | 'yellow';
  }
) {
  const { cx, cz, w, bodyD, yardD, facingNorth, floors, wallMat, roofStyle, roofMat } = spec;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const visW = w - LOT_VISUAL_INSET;
  const halfW = visW * 0.5;
  const halfD = bodyD * 0.5;
  const floorH = 3.15;
  const isShop = Boolean(spec.signTitle);
  const f1H = floors === 1 ? 3.92 : RESIDENTIAL_F1_HEIGHT;
  const doorW = isShop ? Math.min(Math.max(2.6, w * 0.38), 3.4) : Math.min(Math.max(2.4, w * 0.3), 2.8);
  const sideFrontW = Math.max(0.75, (visW - doorW) * 0.5);

  // Courtyard paving + Interior Ground Floor Ceramic Tile (inset cleanly inside perimeter walls + doorway threshold!)
  addLocalBox(grp, visW, 0.06, yardD, spec.yardTheme === 'garden' ? p.brickCourtyardMat : p.tilePatioMat, 0, 0.03, halfD + yardD * 0.5);
  addLocalBox(grp, visW - 0.72, 0.08, bodyD - 0.7, p.tilePatioMat, 0, 0.04, 0.01);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.34, p.tilePatioMat, 0, 0.03, halfD - 0.17);

  // HOLLOW WALK-IN GROUND FLOOR WALLS (Left, Right inset cleanly between Rear & Front Piers — zero corner Z-fighting!)
  addLocalBox(grp, 0.36, f1H, bodyD - 0.7, wallMat, -halfW + 0.18, f1H * 0.5, 0.01);
  addLocalBox(grp, 0.36, f1H, bodyD - 0.7, wallMat, halfW - 0.18, f1H * 0.5, 0.01);
  addLocalBox(grp, visW, f1H, 0.36, wallMat, 0, f1H * 0.5, -halfD + 0.18);

  // Front-left & front-right piers with real recessed transparent ground-floor windows!
  const fWinW = Math.max(0.65, sideFrontW - 0.95);
  const sillH = 0.85;
  const winTopY = 2.55;
  const fWinH = winTopY - sillH;
  const buildFrontPier = (sideSign: -1 | 1) => {
    const pierCx = sideSign * (halfW - sideFrontW * 0.5);
    if (sideFrontW < 1.55) {
      addLocalBox(grp, sideFrontW, f1H, 0.34, wallMat, pierCx, f1H * 0.5, halfD - 0.17);
      return;
    }
    const postW = (sideFrontW - fWinW) * 0.5;
    addLocalBox(grp, postW, f1H, 0.34, wallMat, pierCx - (fWinW + postW) * 0.5, f1H * 0.5, halfD - 0.17);
    addLocalBox(grp, postW, f1H, 0.34, wallMat, pierCx + (fWinW + postW) * 0.5, f1H * 0.5, halfD - 0.17);
    addLocalBox(grp, fWinW, sillH, 0.34, wallMat, pierCx, sillH * 0.5, halfD - 0.17);
    addLocalBox(grp, fWinW, f1H - winTopY, 0.34, wallMat, pierCx, winTopY + (f1H - winTopY) * 0.5, halfD - 0.17);
    // Transparent display/living-room glass + slim frame
    addLocalBox(grp, fWinW - 0.06, fWinH - 0.06, 0.04, p.clearSeeThroughGlassMat, pierCx, sillH + fWinH * 0.5, halfD - 0.14);
    addLocalBox(grp, fWinW + 0.06, 0.06, 0.16, p.darkSteelMat, pierCx, sillH + 0.03, halfD - 0.14);
    addLocalBox(grp, fWinW + 0.06, 0.06, 0.16, p.darkSteelMat, pierCx, winTopY - 0.03, halfD - 0.14);
  };
  buildFrontPier(-1);
  buildFrontPier(1);

  // Header beam above automatic doorway (Y = 2.74 .. f1H, exact doorW width so it never overlaps piers!)
  addLocalBox(grp, doorW, f1H - 2.74, 0.34, wallMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.17);

  if (spec.graniteTrim) {
    addLocalBox(grp, 0.56, f1H, 0.22, p.graniteRedBlackMat, -halfW + 0.28, f1H * 0.5, halfD + 0.11);
    addLocalBox(grp, 0.56, f1H, 0.22, p.graniteRedBlackMat, halfW - 0.28, f1H * 0.5, halfD + 0.11);
  }

  // Automatic Sliding Glass Door + Overhead Sensor
  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);

  // Detailed Furnished Ground-Floor Interior (Phòng Khách / Bếp for Homes, Counter / Shelves / Tables for Shops!)
  addDetailedGroundFloorInterior(grp, p, w, bodyD, f1H, floors > 1, {
    isShop,
    theme: spec.yardTheme,
  });

  // Rear Ground Floor Service Door, Lit Kitchen Window & Awning (vital for rear inner-street views!)
  addLocalBox(grp, 1.35, 2.3, 0.14, p.woodMat, -w * 0.24, 1.15, -halfD - 0.04);
  addLocalBox(grp, 1.85, 1.35, 0.14, p.windowWarmMat, w * 0.18, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.88, 0.1, 0.95, p.charcoalTrimMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);
  addLocalBox(grp, 0.28, 0.28, 0.28, p.housePorchGlowMat, -w * 0.24, 2.65, -halfD - 0.18);

  // Upper Floors (Floor 2 has transparent windows & furnished visible interior!)
  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  if (floors > 1) {
    addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
    addUpperStoriesShell(grp, p, w, bodyD, floors, floorH, slabBaseY, wallMat, {
      breezeBlock: spec.breezeBlock,
      breezeMat: spec.breezeMat,
      goldLouvers: spec.goldLouvers,
      timberLouvers: spec.timberLouvers,
      tigerCage: spec.tigerCage,
      graniteTrim: spec.graniteTrim,
      laundry: spec.laundry,
      planters: spec.planters,
      isShop,
      variantSeed: Math.abs(Math.round(cx + cz)),
    });
  }

  const totalH = floors === 1 ? f1H : slabBaseY + (floors - 1) * floorH;
  addVietnameseRoofStyle(grp, p, w, bodyD, totalH, roofStyle, roofMat);

  // Slim Rain Awning (rear top Y = 2.89, strictly below signboard bottom Y = 2.99!)
  addLocalBox(grp, Math.min(w * 0.94, visW - 0.14), 0.09, 1.4, spec.yardTheme === 'cafe' ? p.greenAwningMat : roofMat, 0, 2.84, halfD + 0.68, [0.14, 0, 0]);

  // Illuminated Shop Signboard mounted cleanly at Y = 2.99..3.97 (ZERO balcony overlap!)
  if (spec.signTitle) {
    addSignBoard(
      grp,
      p,
      Math.min(w - 0.8, 8.8),
      RESIDENTIAL_SIGNBOARD_HEIGHT,
      0,
      RESIDENTIAL_SIGNBOARD_CENTER_Y,
      halfD + 0.14,
      spec.signTitle,
      spec.signSub ?? '',
      { bg: spec.signBg ?? '#1e3a8a', bg2: '#0f172a', border: '#fde047' }
    );
  }

  // Register EVERY single residential house / shop lot for the live Indoor Resident NPC Pool!
  const fSign = facingNorth ? -1 : 1; // local +Z maps to world +fSign * Z; local +X maps to world +fSign * X
  const toWorldX = (lx: number) => cx + fSign * lx;
  const toWorldZ = (lz: number) => cz + fSign * lz;
  const frontZoneZ = halfD * 0.34;
  const rearCounterZ = -halfD + 1.35;
  const leftSideX = -w * 0.5 + 1.28;
  const worldDoorX = cx;
  const worldDoorZ = toWorldZ(halfD - 0.16);
  if (p.registerHouseSlot) {
    const sofaLocalX = isShop ? 0.15 : leftSideX - 0.28;
    const sofaLocalZ = isShop ? frontZoneZ - 0.5 : frontZoneZ;
    // Facing +X in local (toward TV on right wall) -> yaw = facingNorth ? -Math.PI/2 : +Math.PI/2
    const sofaYaw = isShop ? (facingNorth ? Math.PI : 0) : facingNorth ? -Math.PI * 0.5 : Math.PI * 0.5;
    const kitchenLocalX = isShop ? -0.4 : -0.35;
    const kitchenLocalZ = rearCounterZ + 1.15;
    const kitchenYaw = facingNorth ? 0 : Math.PI; // Facing -Z local (into rear kitchen/cashier counter)
    const midLocalX = 0.0;
    const midLocalZ = 0.2;
    const midYaw = facingNorth ? Math.PI : 0; // Facing out toward front glass door
    p.registerHouseSlot({
      cx,
      cz,
      facingNorth,
      isShop,
      theme: spec.yardTheme,
      sofaX: toWorldX(sofaLocalX),
      sofaZ: toWorldZ(sofaLocalZ),
      sofaYaw,
      kitchenX: toWorldX(kitchenLocalX),
      kitchenZ: toWorldZ(kitchenLocalZ),
      kitchenYaw,
      midX: toWorldX(midLocalX),
      midZ: toWorldZ(midLocalZ),
      midYaw,
      doorX: worldDoorX,
      doorZ: worldDoorZ,
    });
  }

  // Front Yard Theme Props (kept cleanly on left/right margins so central path to auto door is 100% unobstructed!)
  const ydFront = halfD + yardD - 1.2;
  const ydMid = halfD + yardD * 0.48;
  const sidePropX = Math.max(2.2, w * 0.32);

  // Helper: either claim this yard motorbike as a LIVE active resident commuter motorbike, or fall back to parked bike!
  const placeYardBike = (localX: number, localZ: number, localYaw: number, color: number) => {
    const parkX = toWorldX(localX);
    const parkZ = toWorldZ(localZ);
    const parkYaw = facingNorth ? localYaw + Math.PI : localYaw;
    const yardOutX = parkX;
    const yardOutZ = toWorldZ(halfD + yardD + 0.9);
    const claimed = p.tryClaimDrivewayBike?.({
      parkX,
      parkZ,
      parkYaw,
      doorX: worldDoorX,
      doorZ: worldDoorZ,
      yardOutX,
      yardOutZ,
      facingNorth,
      color,
    });
    if (!claimed) {
      p.addMotorbike(grp, localX, localZ, localYaw, color);
    }
  };

  // Common Vietnamese Porch Details on ALL houses: House Number Plaque, Mailbox & Twin Entrance Flower Pots!
  const doorHalfSpan = (isShop ? Math.min(4.2, w * 0.44) : Math.min(2.8, w * 0.32)) * 0.5;
  const potX = Math.min(halfW - 0.58, doorHalfSpan + 0.62);
  [-potX, potX].forEach((px, pIdx) => {
    addLocalBox(grp, 0.36, 0.34, 0.36, p.terracottaTileMat, px, 0.19, halfD + 0.44);
    addLocalBox(grp, 0.48, 0.54, 0.48, p.foliageMat, px, 0.62, halfD + 0.44);
    if ((pIdx + Math.round(spec.cx)) % 2 === 0) {
      addLocalBox(grp, 0.3, 0.24, 0.3, spec.blossom === 'yellow' ? p.apricotBlossomMat : p.bougainvilleaMat, px, 0.92, halfD + 0.44);
    }
  });
  // Blue Vietnamese House Number Plaque (`biển số nhà`) & Wall Mailbox next to door
  addLocalBox(grp, 0.42, 0.26, 0.04, p.plasticBlueMat, potX, 2.26, halfD + 0.04);
  addLocalBox(grp, 0.28, 0.36, 0.14, p.plasticRedMat, -potX, 1.48, halfD + 0.09);

  if (spec.yardTheme === 'cafe') {
    addLocalBox(grp, 0.88, 0.52, 0.88, p.woodMat, -sidePropX, 0.26, ydMid);
    addLocalBox(grp, 0.32, 0.34, 0.32, p.plasticBlueMat, -sidePropX - 0.62, 0.17, ydMid);
    addLocalBox(grp, 0.32, 0.34, 0.32, p.plasticBlueMat, -sidePropX + 0.62, 0.17, ydMid);
    addLocalBox(grp, 0.08, 2.5, 0.08, p.woodMat, -sidePropX, 1.25, ydMid);
    addLocalBox(grp, 2.3, 0.14, 2.3, p.greenAwningMat, -sidePropX, 2.48, ydMid);
    p.addTree(grp, w * 0.36, ydFront - 1.0, 0.72, spec.blossom ?? 'yellow');
    placeYardBike(w * 0.3, ydMid - 0.6, -0.25, 0xe11d48);
  } else if (spec.yardTheme === 'garden' || spec.yardTheme === 'villa') {
    // Open-center gate pillars with glowing lantern globes leaving wide walkway directly into the house!
    addLocalBox(grp, 0.5, 2.1, 0.5, p.creamPlasterMat, -w * 0.43, 1.05, ydFront);
    addLocalBox(grp, 0.5, 2.1, 0.5, p.creamPlasterMat, w * 0.43, 1.05, ydFront);
    addLocalBox(grp, 0.32, 0.34, 0.32, p.housePorchGlowMat, -w * 0.43, 2.28, ydFront);
    addLocalBox(grp, 0.32, 0.34, 0.32, p.housePorchGlowMat, w * 0.43, 2.28, ydFront);
    addLocalBox(grp, w * 0.2, 1.15, 0.24, p.darkSteelMat, -w * 0.31, 0.58, ydFront);
    addLocalBox(grp, w * 0.2, 1.15, 0.24, p.darkSteelMat, w * 0.31, 0.58, ydFront);
    addLocalBox(grp, 1.4, 0.46, 0.52, p.concreteMat, w * 0.3, 0.23, ydMid);
    addLocalBox(grp, 0.72, 0.56, 0.72, p.concreteMat, w * 0.3, 0.28, ydMid + 0.95); // Yard stone tea table
    p.addTree(grp, -w * 0.34, ydMid + 0.8, 0.8, spec.blossom ?? 'pink');
    placeYardBike(-w * 0.3, halfD + 1.65, 0.22, 0x0ea5e9);
  } else if (spec.yardTheme === 'barber') {
    addLocalBox(grp, 0.22, 1.1, 0.22, p.plasticRedMat, -w * 0.38, 1.4, halfD + 0.45);
    addLocalBox(grp, 0.24, 0.35, 0.24, p.paintWhiteMat, -w * 0.38, 1.4, halfD + 0.45);
    addLocalBox(grp, 1.3, 0.44, 0.5, p.woodMat, -w * 0.32, 0.22, ydMid); // Waiting bench outside barber
    placeYardBike(w * 0.32, ydMid, 0.3, 0x1e293b);
  } else if (spec.yardTheme === 'hardware') {
    addLocalBox(grp, 1.8, 1.5, 0.6, p.paintWhiteMat, -w * 0.33, 0.75, halfD + 0.85);
    addLocalBox(grp, 0.65, 0.45, 0.65, p.plasticRedMat, -w * 0.34, 0.24, ydMid + 0.7); // Goods crate
    placeYardBike(w * 0.32, ydMid, -0.35, 0x0284c7);
  } else if (spec.yardTheme === 'ac_shop') {
    addLocalBox(grp, 1.6, 1.35, 0.65, p.chromeInoxMat, -w * 0.33, 0.68, halfD + 0.9);
    addLocalBox(grp, 0.85, 0.65, 0.42, p.paintWhiteMat, -w * 0.33, 0.34, ydMid + 0.65); // Display AC compressor unit
    placeYardBike(w * 0.32, ydMid, 0.25, 0x16a34a);
  } else if (spec.yardTheme === 'pharmacy') {
    addLocalBox(grp, 0.24, 0.76, 0.14, p.neonGreenCrossMat, -w * 0.4, 2.35, halfD + 0.26);
    addLocalBox(grp, 0.76, 0.24, 0.14, p.neonGreenCrossMat, -w * 0.4, 2.35, halfD + 0.26);
    addLocalBox(grp, 1.35, 0.45, 0.48, p.beddingBlueMat, -w * 0.32, 0.23, ydMid);
    p.addTree(grp, w * 0.36, ydFront - 1.2, 0.68, 'none');
  } else {
    placeYardBike(-w * 0.32, ydMid, 0.2, 0x2563eb);
    p.addTree(grp, w * 0.34, ydMid + 0.8, 0.74, spec.blossom ?? 'none');
    // Cozy porch tea set (`bàn trà đá nhỏ`) or stone bench on opposite front-yard corner!
    if (yardD >= 4.2) {
      addLocalBox(grp, 0.75, 0.48, 0.75, p.woodMat, w * 0.32, 0.24, halfD + 1.55);
      addLocalBox(grp, 0.3, 0.32, 0.3, p.plasticBlueMat, w * 0.32 - 0.56, 0.16, halfD + 1.55);
      addLocalBox(grp, 0.3, 0.32, 0.3, p.plasticRedMat, w * 0.32 + 0.56, 0.16, halfD + 1.55);
    }
  }
}

/** Exterior 2-Story Steel Stair Boarding House (House 14: Dãy Trọ Bình Dân — Walkable Lobby + Transparent 2F!) */
export function buildExteriorStairMotelRow(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  w = 11.4,
  bodyD = 21.2
) {
  const grp = makeOrientedHouse(staticGroup, cx, cz, false);
  const visW = w - LOT_VISUAL_INSET;
  const halfW = visW * 0.5;
  const halfD = bodyD * 0.5;
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const doorW = 2.8;
  const sideFrontW = (visW - doorW) * 0.5;

  addLocalBox(grp, visW, 0.06, 10.2, p.concreteMat, 0, 0.03, halfD + 5.1);
  addLocalBox(grp, visW - 0.76, 0.08, bodyD - 0.74, p.tilePatioMat, 0, 0.04, 0.01);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.36, p.tilePatioMat, 0, 0.03, halfD - 0.18);

  // Hollow Walk-in Ground Floor
  addLocalBox(grp, 0.38, f1H, bodyD - 0.74, p.creamPlasterMat, -halfW + 0.19, f1H * 0.5, 0.01);
  addLocalBox(grp, 0.38, f1H, bodyD - 0.74, p.creamPlasterMat, halfW - 0.19, f1H * 0.5, 0.01);
  addLocalBox(grp, visW, f1H, 0.38, p.creamPlasterMat, 0, f1H * 0.5, -halfD + 0.19);
  addLocalBox(grp, sideFrontW, f1H, 0.36, p.creamPlasterMat, -halfW + sideFrontW * 0.5, f1H * 0.5, halfD - 0.18);
  addLocalBox(grp, sideFrontW, f1H, 0.36, p.creamPlasterMat, halfW - sideFrontW * 0.5, f1H * 0.5, halfD - 0.18);
  addLocalBox(grp, doorW, f1H - 2.74, 0.36, p.creamPlasterMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.18);

  // Flanking room doors + central automatic entrance door
  [-w * 0.32, w * 0.32].forEach((dx) => {
    addLocalBox(grp, 1.35, 2.35, 0.14, p.tealTinRoofMat, dx, 1.18, halfD + 0.04);
  });
  attachAutoDoorFrame(grp, p, cx, cz, halfD, false, doorW, w, 2.68);
  addDetailedGroundFloorInterior(grp, p, w, bodyD, f1H, true, { isShop: false });

  // 2nd Floor Corridor Deck (bottom Y = 4.22 — strictly above signboard!) + Transparent 2nd-Floor Rooms
  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD + 1.3, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0.65);
  buildTransparentSecondFloorRoom(grp, p, w, bodyD, slabBaseY, 3.05, p.mintWallMat, false, 14);
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 3.05, 'tin_sloped', p.redTinRoofMat);

  // Exterior corridor steel railing + clotheslines
  addLocalBox(grp, w - 0.4, 0.08, 0.08, p.darkSteelMat, 0, slabBaseY + 0.98, halfD + 1.24);
  for (let rx = -w * 0.44; rx <= w * 0.44; rx += 0.75) {
    addLocalBox(grp, 0.04, 0.9, 0.04, p.darkSteelMat, rx, slabBaseY + 0.52, halfD + 1.24);
  }
  addLocalBox(grp, 3.4, 0.04, 0.04, p.chromeInoxMat, 1.6, slabBaseY + 2.3, halfD + 0.95);
  addLocalBox(grp, 0.46, 0.52, 0.05, p.plasticRedMat, 0.9, slabBaseY + 2.0, halfD + 0.95);
  addLocalBox(grp, 0.46, 0.52, 0.05, p.plasticBlueMat, 1.8, slabBaseY + 2.0, halfD + 0.95);

  // Exterior diagonal steel stair on West side leading up to 2nd floor corridor
  for (let s = 0; s < 9; s++) {
    const sy = 0.22 + s * 0.44;
    const sz = halfD + 4.6 - s * 0.4;
    addLocalBox(grp, 1.1, 0.1, 0.36, p.darkSteelMat, -w * 0.41, sy, sz);
  }
  // Rear windows + upper rear balustrade on Dãy Trọ
  addLocalBox(grp, 1.6, 1.3, 0.14, p.windowWarmMat, -w * 0.26, 1.6, -halfD - 0.04);
  addLocalBox(grp, 1.6, 1.3, 0.14, p.windowWarmMat, w * 0.26, 1.6, -halfD - 0.04);
  addLocalBox(grp, 1.6, 1.2, 0.14, p.windowWarmMat, -w * 0.26, slabBaseY + 1.5, -halfD - 0.04);
  addLocalBox(grp, 1.6, 1.2, 0.14, p.windowWarmMat, w * 0.26, slabBaseY + 1.5, -halfD - 0.04);
  addLocalBox(grp, w * 0.86, 0.1, 0.85, p.redTinRoofMat, 0, 2.85, -halfD - 0.38, [-0.18, 0, 0]);

  // Signboard mounted cleanly below 2nd-floor corridor deck (Y = 2.99..3.97 — ZERO railing overlap!)
  addSignBoard(
    grp,
    p,
    7.6,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0.8,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'NHÀ TRỌ BÌNH DÂN',
    'Phòng Sạch • Wifi • An Ninh 24/7',
    { bg: '#0369a1', bg2: '#0c4a6e', border: '#fde047' }
  );
  p.addMotorbike(grp, 3.0, halfD + 3.2, -0.2, 0xe11d48);
  p.addMotorbike(grp, 4.3, halfD + 3.4, 0.15, 0x0ea5e9);
}

/** Lot R1: Nhà Văn Hóa Tổ Dân Phố Số 4 & Sân Cờ Tướng / Tập Thể Dục (-380..-362, Z=-54..-26) — Now Walkable with Auto Doors! */
export function buildCommunityHallAndFitnessCourt(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx = -371.0
) {
  addLocalBox(staticGroup, 18.0, 0.06, 28.0, p.tilePatioMat, cx, 0.03, -40.0);
  // Hollow Walkable Community Hall at Z = -54..-38 (17.6m x 15.6m, centerZ = -46.0)
  const w = 17.6;
  const bodyD = 15.6;
  const f1H = 4.25;
  const cz = -46.0;
  const halfW = w * 0.5;
  const halfD = bodyD * 0.5;
  const doorW = 4.2;
  const sideFrontW = (w - doorW) * 0.5;

  addLocalBox(staticGroup, w - 0.8, 0.08, bodyD - 0.8, p.tilePatioMat, cx, 0.04, cz);
  addLocalBox(staticGroup, doorW - 0.08, 0.06, 0.4, p.tilePatioMat, cx, 0.03, cz + halfD - 0.2);
  addLocalBox(staticGroup, 0.4, f1H, bodyD - 0.8, p.creamPlasterMat, cx - halfW + 0.2, f1H * 0.5, cz);
  addLocalBox(staticGroup, 0.4, f1H, bodyD - 0.8, p.creamPlasterMat, cx + halfW - 0.2, f1H * 0.5, cz);
  addLocalBox(staticGroup, w, f1H, 0.4, p.creamPlasterMat, cx, f1H * 0.5, cz - halfD + 0.2);
  addLocalBox(staticGroup, sideFrontW, f1H, 0.4, p.creamPlasterMat, cx - halfW + sideFrontW * 0.5, f1H * 0.5, cz + halfD - 0.2);
  addLocalBox(staticGroup, sideFrontW, f1H, 0.4, p.creamPlasterMat, cx + halfW - sideFrontW * 0.5, f1H * 0.5, cz + halfD - 0.2);
  addLocalBox(staticGroup, doorW, f1H - 2.74, 0.4, p.creamPlasterMat, cx, 2.74 + (f1H - 2.74) * 0.5, cz + halfD - 0.2);
  addLocalBox(staticGroup, w - 0.6, 0.1, bodyD - 0.6, p.interiorWallMat, cx, f1H - 0.05, cz);
  addLocalBox(staticGroup, 6.0, 0.06, 0.6, p.interiorCeilingGlowMat, cx, f1H - 0.12, cz + 2.0);
  addLocalBox(staticGroup, 6.0, 0.06, 0.6, p.interiorCeilingGlowMat, cx, f1H - 0.12, cz - 2.6);

  // Automatic Sliding Double Doors into Community Hall
  addLocalBox(staticGroup, doorW + 0.16, 0.14, 0.26, p.darkSteelMat, cx, 2.79, cz + halfD - 0.14);
  addLocalBox(staticGroup, 0.44, 0.1, 0.12, p.charcoalTrimMat, cx, 2.86, cz + halfD + 0.02);
  addLocalBox(staticGroup, 0.14, 0.035, 0.04, p.autoDoorSensorLedMat, cx, 2.86, cz + halfD + 0.08);
  p.registerAutoDoor(cx, cz + halfD - 0.18, false, doorW, w, 2.68);

  // Interior Community Hall Ceremonial Stage, Red Curtain Backdrop & Meeting Benches
  addLocalBox(staticGroup, 10.6, 0.52, 4.2, p.woodMat, cx, 0.3, -49.2); // Stage at Z = -51.3..-47.1
  addLocalBox(staticGroup, 9.6, 2.6, 0.14, p.plasticRedMat, cx, 2.1, -53.2); // Red ceremonial backdrop
  addLocalBox(staticGroup, 1.1, 1.15, 0.65, p.woodMat, cx, 1.12, -48.0); // Speaker podium
  [-4.2, 4.2].forEach((bx) => {
    [-44.5, -42.2].forEach((bz) => {
      addLocalBox(staticGroup, 3.6, 0.45, 0.55, p.woodMat, cx + bx, 0.28, bz);
    });
  });

  // Roof & Signboard
  addLocalBox(staticGroup, 18.4, 0.3, 16.4, p.terracottaTileMat, cx, f1H + 0.15, cz);
  addLocalBox(staticGroup, 14.0, 1.1, 11.4, p.terracottaTileMat, cx, f1H + 0.8, cz);
  addLocalBox(staticGroup, 2.6, 1.6, 0.14, p.windowWarmMat, cx - 4.4, 2.1, -53.86);
  addLocalBox(staticGroup, 2.6, 1.6, 0.14, p.windowWarmMat, cx + 4.4, 2.1, -53.86);
  addLocalBox(staticGroup, 1.5, 2.4, 0.14, p.woodMat, cx, 1.2, -53.86);
  addSignBoard(
    staticGroup,
    p,
    11.5,
    1.05,
    cx,
    3.52,
    -38.04,
    'NHÀ VĂN HÓA TỔ DÂN PHỐ 4',
    'Sinh Hoạt Cộng Đồng • Cờ Tướng • Thể Dục',
    { bg: '#991b1b', bg2: '#7f1d1d', border: '#fde047' }
  );

  // National Flagpole & Outdoor Pull-Up Fitness Bars + Stone Chess Tables
  addLocalBox(staticGroup, 0.85, 0.45, 0.85, p.creamPlasterMat, cx - 5.5, 0.22, -34.5);
  addLocalBox(staticGroup, 0.1, 6.2, 0.1, p.chromeInoxMat, cx - 5.5, 3.3, -34.5);
  addLocalBox(staticGroup, 1.35, 0.85, 0.04, p.plasticRedMat, cx - 4.82, 5.85, -34.5);

  [cx + 3.2, cx + 5.6].forEach((fx) => {
    addLocalBox(staticGroup, 0.1, 2.35, 0.1, p.plasticBlueMat, fx, 1.17, -33.5);
  });
  addLocalBox(staticGroup, 2.5, 0.08, 0.08, p.plasticRedMat, cx + 4.4, 2.32, -33.5);

  [cx - 2.0, cx + 1.8].forEach((tx) => {
    addLocalBox(staticGroup, 1.15, 0.72, 1.15, p.concreteMat, tx, 0.36, -29.8);
    addLocalBox(staticGroup, 0.42, 0.44, 0.42, p.concreteMat, tx - 0.92, 0.22, -29.8);
    addLocalBox(staticGroup, 0.42, 0.44, 0.42, p.concreteMat, tx + 0.92, 0.22, -29.8);
  });

  p.addTree(staticGroup, cx - 7.5, -27.6, 0.95, 'none');
  p.addTree(staticGroup, cx + 7.5, -27.6, 0.95, 'pink');
}

/** Walkable Quán Hủ Tiếu Nam Vang & Mì Gõ 545 (House H20: X=-584.2..-572.6, Z=-15.8..+5.4) */
export function buildWalkableHuTieuShop(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  facingNorth = false
) {
  const w = 11.6;
  const visW = w - LOT_VISUAL_INSET;
  const bodyD = 21.2;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const halfD = bodyD * 0.5;
  const doorW = 4.4;
  const sideFrontW = (visW - doorW) * 0.5;

  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.tilePatioMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.tilePatioMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 10.2, p.tilePatioMat, 0, 0.03, halfD + 5.1);

  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.sandBeigeWallMat, -visW * 0.5 + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.sandBeigeWallMat, visW * 0.5 - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, p.sandBeigeWallMat, 0, f1H * 0.5, -halfD + 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, p.sandBeigeWallMat, -(doorW * 0.5 + sideFrontW * 0.5), f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, p.sandBeigeWallMat, doorW * 0.5 + sideFrontW * 0.5, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, p.sandBeigeWallMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, true, true);

  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  addUpperStoriesShell(grp, p, w, bodyD, 3, 3.1, slabBaseY, p.sandBeigeWallMat, {
    breezeBlock: true,
    breezeMat: p.breezeBlockTerracottaMat,
    planters: true,
    isShop: true,
    variantSeed: 20,
  });
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 6.2, 'thai_dual', p.terracottaTileMat);

  addLocalBox(grp, visW - 0.2, 0.09, 1.45, p.stripedAwningMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    9.6,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'HỦ TIẾU NAM VANG 545',
    'Khô • Nước • Xương Ống Đêm Khuya',
    { bg: '#b45309', bg2: '#78350f', border: '#fef08a' }
  );

  addLocalBox(grp, 1.35, 2.35, 0.14, p.woodMat, -w * 0.22, 1.18, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.3, 0.12, p.windowWarmMat, w * 0.22, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.86, 0.12, 0.9, p.terracottaTileMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  addLocalBox(grp, 1.5, 1.05, 5.6, p.chromeInoxMat, -3.5, 0.52, 3.0);
  addLocalBox(grp, 1.4, 0.7, 5.4, p.clearSeeThroughGlassMat, -3.5, 1.4, 3.0);
  addLocalBox(grp, 7.6, 1.0, 1.4, p.woodMat, 0, 0.5, -6.5);
  enrichWalkableEateryHall(grp, p, w, bodyD, f1H, {
    tableSideX: 3.0,
    counterSideX: -3.5,
    tableMat: p.chromeInoxMat,
    stoolMat: p.plasticBlueMat,
    umbrellaMat: p.stripedAwningMat,
    tableZs: [-2.6, 0.8, 4.2, 7.4],
    patioSideSign: -1,
  });
}

/** Walkable Quán Bún Bò Huế O Nga 490 (South S14: X=-584.2..-572.6, Z=52..76 facing North) */
export function buildWalkableBunBoHueShop(
  staticGroup: THREE.Group,
  p: WestResPalette,
  cx: number,
  cz: number,
  facingNorth = true
) {
  const w = 11.6;
  const visW = w - LOT_VISUAL_INSET;
  const bodyD = 24.0;
  const grp = makeOrientedHouse(staticGroup, cx, cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const halfD = bodyD * 0.5;
  const doorW = 4.4;
  const sideFrontW = (visW - doorW) * 0.5;

  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.tilePatioMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.tilePatioMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 9.5, p.tilePatioMat, 0, 0.03, halfD + 4.75);

  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.creamPlasterMat, -visW * 0.5 + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, p.creamPlasterMat, visW * 0.5 - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, p.creamPlasterMat, 0, f1H * 0.5, -halfD + 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, p.creamPlasterMat, -(doorW * 0.5 + sideFrontW * 0.5), f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, p.creamPlasterMat, doorW * 0.5 + sideFrontW * 0.5, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, p.creamPlasterMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  attachAutoDoorFrame(grp, p, cx, cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, true, true);

  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  addUpperStoriesShell(grp, p, w, bodyD, 3, 3.1, slabBaseY, p.mintWallMat, {
    planters: true,
    laundry: true,
    isShop: true,
    variantSeed: 34,
  });
  addVietnameseRoofStyle(grp, p, w, bodyD, slabBaseY + 6.2, 'terracotta_gable', p.terracottaTileMat);

  addLocalBox(grp, visW - 0.2, 0.09, 1.45, p.greenAwningMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    9.4,
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    'BÚN BÒ HUẾ O NGA 490',
    'Giò Heo • Chả Cua • Mắm Ruốc Huế',
    { bg: '#7e22ce', bg2: '#581c87', border: '#fde047' }
  );

  addLocalBox(grp, 1.35, 2.35, 0.14, p.woodMat, -w * 0.22, 1.18, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.3, 0.12, p.windowWarmMat, w * 0.22, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.86, 0.12, 0.9, p.greenAwningMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  addLocalBox(grp, 1.6, 1.05, 6.2, p.chromeInoxMat, -3.5, 0.52, 3.2);
  addLocalBox(grp, 7.6, 1.0, 1.5, p.woodMat, 0, 0.5, -7.2);
  enrichWalkableEateryHall(grp, p, w, bodyD, f1H, {
    tableSideX: 3.0,
    counterSideX: -3.5,
    tableMat: p.woodMat,
    stoolMat: p.plasticRedMat,
    umbrellaMat: p.greenAwningMat,
    tableZs: [-2.8, 1.2, 5.2, 8.6],
    patioSideSign: -1,
  });
}

/** Parametric Walkable Shopfront matching buildWalkableShopColliders() 1-to-1 with Auto Sliding Doors & Transparent 2F! */
export function buildWalkableStreetShop(
  staticGroup: THREE.Group,
  p: WestResPalette,
  shop: WestWalkableShopDef
) {
  const { w, bodyD, doorW, facingNorth } = shop;
  const grp = makeOrientedHouse(staticGroup, shop.cx, shop.cz, facingNorth);
  const f1H = RESIDENTIAL_F1_HEIGHT;
  const visW = w - LOT_VISUAL_INSET;
  const halfW = visW * 0.5;
  const halfD = bodyD * 0.5;
  const xDir = facingNorth ? -1 : 1;

  const wallByTheme: Record<WestWalkableShopDef['theme'], THREE.Material> = {
    pho: p.warmYellowWallMat,
    cafe: p.sandBeigeWallMat,
    boba: p.blushPinkWallMat,
    banhmi: p.ochreHoiAnMat,
    oc_lau: p.creamPlasterMat,
    mini_mart: p.mintWallMat,
    billiard_net: p.concreteModernMat,
  };
  const wallMat = wallByTheme[shop.theme] ?? p.creamPlasterMat;

  // Floor pad inside shop (inset inside walls + doorway threshold) & front porch
  addLocalBox(grp, visW - 0.8, 0.08, bodyD - 0.8, p.tilePatioMat, 0, 0.04, 0);
  addLocalBox(grp, doorW - 0.08, 0.06, 0.4, p.tilePatioMat, 0, 0.03, halfD - 0.2);
  addLocalBox(grp, visW, 0.06, 6.0, p.concreteMat, 0, 0.03, halfD + 3.0);

  // Hollow Ground Floor Walls matching buildWalkableShopColliders (zero corner overlap!)
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, wallMat, -halfW + 0.2, f1H * 0.5, 0);
  addLocalBox(grp, 0.4, f1H, bodyD - 0.8, wallMat, halfW - 0.2, f1H * 0.5, 0);
  addLocalBox(grp, visW, f1H, 0.4, wallMat, 0, f1H * 0.5, -halfD + 0.2);
  const sideFrontW = Math.max(0.8, (visW - doorW) * 0.5);
  addLocalBox(grp, sideFrontW, f1H, 0.4, wallMat, -halfW + sideFrontW * 0.5, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, sideFrontW, f1H, 0.4, wallMat, halfW - sideFrontW * 0.5, f1H * 0.5, halfD - 0.2);
  addLocalBox(grp, doorW, f1H - 2.74, 0.4, wallMat, 0, 2.74 + (f1H - 2.74) * 0.5, halfD - 0.2);

  // Storefront glass panels flanking doorway
  const glassW = Math.max(0.5, sideFrontW - 0.65);
  addLocalBox(grp, glassW, 1.85, 0.06, p.clearSeeThroughGlassMat, -halfW + sideFrontW * 0.5, 1.65, halfD + 0.01);
  addLocalBox(grp, glassW, 1.85, 0.06, p.clearSeeThroughGlassMat, halfW - sideFrontW * 0.5, 1.65, halfD + 0.01);

  attachAutoDoorFrame(grp, p, shop.cx, shop.cz, halfD, facingNorth, doorW, w, 2.68);
  addCommonGroundCeilingAndStairs(grp, p, w, bodyD, f1H, (shop.floors ?? 2) > 1, true);

  // Rear Facade Backdoor, Lit Window & Gutter Awning
  addLocalBox(grp, 1.35, 2.3, 0.14, p.woodMat, -w * 0.22, 1.15, -halfD - 0.04);
  addLocalBox(grp, 1.8, 1.3, 0.12, p.windowWarmMat, w * 0.22, 1.65, -halfD - 0.04);
  addLocalBox(grp, visW * 0.88, 0.1, 0.9, p.charcoalTrimMat, 0, 2.85, -halfD - 0.42, [-0.18, 0, 0]);

  // Upper Floors (Transparent 2nd Floor!) + Roof + Slim Awning + Unobstructed Signboard
  const floors = shop.floors ?? 2;
  const slabBaseY = f1H + RESIDENTIAL_SLAB_HEIGHT;
  addLocalBox(grp, visW, RESIDENTIAL_SLAB_HEIGHT, bodyD, p.concreteMat, 0, f1H + RESIDENTIAL_SLAB_HEIGHT * 0.5, 0);
  if (floors > 1) {
    addUpperStoriesShell(grp, p, w, bodyD, floors, 3.1, slabBaseY, wallMat, {
      planters: shop.theme === 'cafe' || shop.theme === 'boba',
      timberLouvers: shop.theme === 'cafe' || shop.theme === 'banhmi',
      breezeBlock: shop.theme === 'boba' || shop.theme === 'pho',
      breezeMat: p.breezeBlockWhiteMat,
      laundry: floors === 3,
      isShop: true,
      variantSeed: Math.abs(Math.round(shop.cx + shop.cz)),
    });
  }
  const topY = slabBaseY + Math.max(0, floors - 1) * 3.1;
  addVietnameseRoofStyle(
    grp,
    p,
    w,
    bodyD,
    topY,
    shop.theme === 'oc_lau' ? 'tin_sloped' : shop.theme === 'billiard_net' ? 'flat_tank' : 'terracotta_gable',
    shop.theme === 'boba' ? p.tealTinRoofMat : p.terracottaTileMat
  );

  const awningMat =
    shop.theme === 'cafe' || shop.theme === 'mini_mart' ? p.greenAwningMat : p.stripedAwningMat;
  addLocalBox(grp, visW - 0.22, 0.09, 1.45, awningMat, 0, 2.84, halfD + 0.72, [0.14, 0, 0]);
  addSignBoard(
    grp,
    p,
    Math.min(w - 0.8, 9.6),
    RESIDENTIAL_SIGNBOARD_HEIGHT,
    0,
    RESIDENTIAL_SIGNBOARD_CENTER_Y,
    halfD + 0.14,
    shop.name.toUpperCase(),
    shop.subtitle,
    { bg: shop.signBg, bg2: '#0f172a', border: '#fde047' }
  );

  // West Service / Checkout Counter + POS + Theme-Specific Stocked Showcase (matches buildWalkableShopColliders!)
  const origHalfW = w * 0.5;
  const leftCounterX = xDir * (-origHalfW + 1.5);
  const counterMat =
    shop.theme === 'billiard_net'
      ? p.emeraldRoofMat
      : shop.theme === 'boba'
        ? p.paintWhiteMat
        : p.chromeInoxMat;
  const stoolMat =
    shop.theme === 'boba'
      ? p.plasticRedMat
      : shop.theme === 'cafe'
        ? p.woodMat
        : p.plasticBlueMat;

  addLocalBox(grp, 1.5, 1.04, 6.2, counterMat, leftCounterX, 0.52, halfD - 7.25);
  addLocalBox(grp, 1.36, 0.62, 5.9, p.clearSeeThroughGlassMat, leftCounterX, 1.35, halfD - 7.25);
  addLocalBox(grp, 0.42, 0.34, 0.08, p.tvScreenMat, leftCounterX, 1.24, halfD - 4.8); // POS screen
  if (shop.theme === 'pho' || shop.theme === 'oc_lau' || shop.theme === 'banhmi') {
    addLocalBox(grp, 0.56, 0.2, 0.95, p.apricotBlossomMat, leftCounterX, 1.15, halfD - 5.9);
    addLocalBox(grp, 0.56, 0.16, 0.78, p.beddingCoralMat, leftCounterX, 1.14, halfD - 7.1);
    addLocalBox(grp, 0.56, 0.16, 0.78, p.foliageMat, leftCounterX, 1.14, halfD - 8.2);
    addLocalBox(grp, 0.62, 0.52, 0.62, p.chromeInoxMat, leftCounterX, 1.3, halfD - 9.45);
    addLocalBox(grp, 0.52, 0.04, 0.52, p.terracottaTileMat, leftCounterX, 1.57, halfD - 9.45);
    if (shop.theme === 'banhmi' || shop.theme === 'pho') {
      // Hanging roast duck/char siu rail inside showcase
      addLocalBox(grp, 0.05, 0.05, 1.8, p.chromeInoxMat, leftCounterX, 1.58, halfD - 6.6);
      [-6.1, -6.6, -7.1].forEach((rz) => {
        addLocalBox(grp, 0.18, 0.32, 0.18, p.terracottaTileMat, leftCounterX, 1.38, halfD + rz);
      });
    }
  } else if (shop.theme === 'cafe' || shop.theme === 'boba') {
    addLocalBox(grp, 0.56, 0.52, 0.62, p.chromeInoxMat, leftCounterX, 1.3, halfD - 6.2);
    addLocalBox(grp, 0.14, 0.34, 0.14, p.plasticRedMat, leftCounterX, 1.22, halfD - 7.4);
    addLocalBox(grp, 0.14, 0.34, 0.14, p.apricotBlossomMat, leftCounterX, 1.22, halfD - 7.75);
    addLocalBox(grp, 0.14, 0.34, 0.14, p.emeraldRoofMat, leftCounterX, 1.22, halfD - 8.1);
    addLocalBox(grp, 0.6, 0.22, 0.85, p.bougainvilleaMat, leftCounterX, 1.16, halfD - 9.1);
    addLocalBox(grp, 0.55, 0.18, 0.65, p.apricotBlossomMat, leftCounterX, 1.36, halfD - 9.1);
  } else if (shop.theme === 'mini_mart') {
    addLocalBox(grp, 0.65, 0.36, 1.4, p.plasticRedMat, leftCounterX, 1.24, halfD - 6.1);
    addLocalBox(grp, 0.65, 0.36, 1.4, p.plasticBlueMat, leftCounterX, 1.24, halfD - 7.8);
    addLocalBox(grp, 0.65, 0.36, 1.2, p.apricotBlossomMat, leftCounterX, 1.24, halfD - 9.3);
    // Stacked red shopping baskets (`giỏ xách siêu thị`) at entrance end of counter
    addLocalBox(grp, 0.48, 0.42, 0.38, p.plasticRedMat, leftCounterX + xDir * 0.25, 0.25, halfD - 3.6);
  }

  // Rear Kitchen / Bar Pass Counter + Stainless Range Hood + Steaming Pots
  addLocalBox(grp, Math.max(4.0, w - 3.2), 1.02, 1.45, p.woodMat, 0, 0.51, -halfD + 3.9);
  addLocalBox(grp, 0.54, 0.42, 0.54, p.chromeInoxMat, -0.9, 1.23, -halfD + 3.9);
  addLocalBox(grp, 0.54, 0.38, 0.54, p.chromeInoxMat, 0.9, 1.21, -halfD + 3.9);
  addLocalBox(grp, Math.min(4.2, w * 0.46), 0.44, 0.95, p.chromeInoxMat, 0, f1H - 0.95, -halfD + 3.9);

  // Theme-Specific Floor Plan: Mini-Mart Gondolas & Freezer vs. Billiard Club vs. Eatery Dining Hall
  const seatDefs: WalkableShopActivitySlot['seats'] = [];
  const fSign = facingNorth ? -1 : 1;
  const toWX = (lx: number) => shop.cx + fSign * lx;
  const toWZ = (lz: number) => shop.cz + fSign * lz;
  const sitBack = 0.2;

  if (shop.theme === 'mini_mart') {
    // East wall 4-tier stocked grocery shelves matching East wall collider (halfD - 4.0 .. halfD - 14.5)
    const eastShelfX = xDir * (origHalfW - 0.95);
    addLocalBox(grp, 0.88, 2.15, 10.2, p.darkSteelMat, eastShelfX, 1.1, halfD - 9.2);
    const shelfGoodsMats = [p.plasticRedMat, p.plasticBlueMat, p.apricotBlossomMat, p.emeraldRoofMat, p.terracottaTileMat];
    for (let lv = 0; lv < 4; lv++) {
      for (let k = 0; k < 10; k++) {
        addLocalBox(
          grp,
          0.42,
          0.26,
          0.74,
          shelfGoodsMats[(lv + k) % shelfGoodsMats.length],
          eastShelfX - xDir * 0.16,
          0.46 + lv * 0.46,
          halfD - 4.6 - k * 0.98
        );
      }
    }
    // Center-East supermarket gondola (`kệ giữa siêu thị`) matching collider cx + 0.85..1.75, spanZ(5.2, 11.4)
    const gondolaX = xDir * 1.3;
    addLocalBox(grp, 0.78, 1.72, 5.8, p.paintWhiteMat, gondolaX, 0.9, halfD - 8.3);
    addLocalBox(grp, 0.88, 0.12, 5.9, p.plasticRedMat, gondolaX, 1.82, halfD - 8.3); // Red promo header
    for (let lv = 0; lv < 3; lv++) {
      for (let k = 0; k < 6; k++) {
        const gMat = shelfGoodsMats[(lv * 2 + k) % shelfGoodsMats.length];
        addLocalBox(grp, 0.86, 0.24, 0.72, gMat, gondolaX, 0.46 + lv * 0.44, halfD - 5.9 - k * 0.92);
      }
    }
    // Ice-cream chest freezer (`tủ kem`) behind gondola matching spanZ(12.6, 14.8)
    addLocalBox(grp, 0.95, 0.88, 2.0, p.paintWhiteMat, gondolaX, 0.48, halfD - 13.7);
    addLocalBox(grp, 0.82, 0.06, 1.85, p.clearSeeThroughGlassMat, gondolaX, 0.94, halfD - 13.7);
    addLocalBox(grp, 0.56, 0.14, 0.7, p.bougainvilleaMat, gondolaX, 0.82, halfD - 13.25);
    addLocalBox(grp, 0.56, 0.14, 0.7, p.apricotBlossomMat, gondolaX, 0.82, halfD - 14.15);
    // Warm overhead supermarket aisle LED strip
    addLocalBox(grp, 0.38, 0.06, 7.6, p.interiorCeilingGlowMat, 0, f1H - 0.18, halfD - 8.4);
  } else if (shop.theme === 'billiard_net') {
    // Beverage chiller on West rear matching spanZ(11.8, 14.8)
    addLocalBox(grp, 0.88, 2.02, 1.0, p.paintWhiteMat, leftCounterX, 1.05, halfD - 13.3);
    addLocalBox(grp, 0.52, 0.24, 0.65, p.plasticRedMat, leftCounterX, 0.78, halfD - 13.3);
    addLocalBox(grp, 0.52, 0.24, 0.65, p.emeraldRoofMat, leftCounterX, 1.22, halfD - 13.3);
    addLocalBox(grp, 0.52, 0.24, 0.65, p.plasticBlueMat, leftCounterX, 1.66, halfD - 13.3);
    // West wall cue rack & digital scoreboard
    const westWallX = xDir * (-origHalfW + 0.48);
    addLocalBox(grp, 0.12, 1.6, 2.0, p.woodMat, westWallX, 1.2, halfD - 10.8);
    addLocalBox(grp, 0.08, 0.85, 1.65, p.tvScreenMat, westWallX, 2.25, halfD - 7.2);
    // Pool tables on East side matching colliders [5.0, 9.8, 14.4] / [5.0, 9.8]
    const poolLocalZs = bodyD >= 21.0 ? [halfD - 5.0, halfD - 9.8, halfD - 14.4] : [halfD - 5.0, halfD - 9.8];
    const poolTableX = xDir * (origHalfW - 2.2);
    const spectatorStoolX = xDir * (origHalfW - 3.65);
    poolLocalZs.forEach((tz) => {
      addLocalBox(grp, 1.95, 0.74, 1.45, p.emeraldRoofMat, poolTableX, 0.37, tz);
      addLocalBox(grp, 2.06, 0.12, 0.12, p.woodMat, poolTableX, 0.8, tz - 0.72);
      addLocalBox(grp, 2.06, 0.12, 0.12, p.woodMat, poolTableX, 0.8, tz + 0.72);
      addLocalBox(grp, 0.12, 0.12, 1.45, p.woodMat, poolTableX - 0.98, 0.8, tz);
      addLocalBox(grp, 0.12, 0.12, 1.45, p.woodMat, poolTableX + 0.98, 0.8, tz);
      // Triangle rack of colorful billiard balls + cue stick
      addLocalBox(grp, 0.1, 0.1, 0.1, p.paintWhiteMat, poolTableX - 0.45, 0.79, tz);
      addLocalBox(grp, 0.1, 0.1, 0.1, p.plasticRedMat, poolTableX + 0.35, 0.79, tz + 0.12);
      addLocalBox(grp, 0.1, 0.1, 0.1, p.apricotBlossomMat, poolTableX + 0.42, 0.79, tz - 0.12);
      addLocalBox(grp, 0.1, 0.1, 0.1, p.plasticBlueMat, poolTableX + 0.5, 0.79, tz);
      addLocalBox(grp, 1.35, 0.04, 0.04, p.bambooMat, poolTableX, 0.87, tz + 0.42, [0, 0.18, 0]);
      // Wide green billiard lampshade hanging over table
      addLocalBox(grp, 0.04, 0.86, 0.04, p.darkSteelMat, poolTableX, f1H - 0.5, tz);
      addLocalBox(grp, 1.25, 0.24, 0.58, p.emeraldRoofMat, poolTableX, f1H - 1.0, tz);
      addLocalBox(grp, 1.05, 0.06, 0.42, p.interiorCeilingGlowMat, poolTableX, f1H - 1.13, tz);
      // High bar spectator stool on center-aisle side facing pool table (+X world = +Math.PI/2)
      addLocalBox(grp, 0.38, 0.48, 0.38, p.charcoalTrimMat, spectatorStoolX, 0.26, tz);
      const seatYaw = Math.PI * 0.5;
      seatDefs.push({
        x: toWX(spectatorStoolX) - Math.sin(seatYaw) * sitBack,
        z: toWZ(tz) - Math.cos(seatYaw) * sitBack,
        yaw: seatYaw,
        occupiedBy: null,
      });
    });
  } else {
    // Eatery / Café / Boba: Beverage chiller + beer crates + center aisle runner & ceiling lanterns + dining tables
    addLocalBox(grp, 1.35, 0.02, Math.max(6.0, bodyD - 6.0), p.terracottaTileMat, 0, 0.09, 0);
    [-halfD + 6.5, 0, halfD - 6.0].forEach((lz) => {
      addLocalBox(grp, 0.04, 0.68, 0.04, p.darkSteelMat, 0, f1H - 0.4, lz);
      addLocalBox(grp, 0.38, 0.32, 0.38, p.interiorCeilingGlowMat, 0, f1H - 0.82, lz);
    });
    // Tall glass beverage chiller (`tủ mát`) at West rear matching collider spanZ(12.0, 14.6)
    addLocalBox(grp, 0.88, 2.02, 1.0, p.paintWhiteMat, leftCounterX, 1.05, halfD - 13.3);
    addLocalBox(grp, 0.52, 0.24, 0.65, p.plasticRedMat, leftCounterX, 0.78, halfD - 13.3);
    addLocalBox(grp, 0.52, 0.24, 0.65, p.emeraldRoofMat, leftCounterX, 1.22, halfD - 13.3);
    addLocalBox(grp, 0.52, 0.24, 0.65, p.plasticBlueMat, leftCounterX, 1.66, halfD - 13.3);
    addLocalBox(grp, 0.54, 0.34, 0.44, p.plasticRedMat, leftCounterX, 0.21, halfD - 14.3);
    // Wide-lot condiment / fresh herb / trà đá island matching collider cx + 0.3..1.1, spanZ(7.0, 8.8)
    if (w >= 11.4 && bodyD >= 21.0) {
      const islandX = xDir * 0.7;
      const islandZ = halfD - 7.9;
      addLocalBox(grp, 0.74, 0.94, 1.65, p.woodMat, islandX, 0.49, islandZ);
      addLocalBox(grp, 0.78, 0.06, 1.72, p.chromeInoxMat, islandX, 0.98, islandZ);
      addLocalBox(grp, 0.24, 0.34, 0.24, p.plasticRedMat, islandX, 1.18, islandZ - 0.42); // Iced tea thermos
      addLocalBox(grp, 0.28, 0.14, 0.42, p.foliageMat, islandX, 1.08, islandZ + 0.15); // Fresh herbs basket
      addLocalBox(grp, 0.12, 0.16, 0.12, p.apricotBlossomMat, islandX, 1.09, islandZ + 0.55); // Chili/garlic jar
    }
    const rightTableX = xDir * (origHalfW - 1.9);
    const tableLocalZs =
      bodyD >= 21.0
        ? [halfD - 4.4, halfD - 7.8, halfD - 11.2, halfD - 14.4]
        : bodyD >= 17.5
          ? [halfD - 4.8, halfD - 8.4, halfD - 11.8]
          : [halfD - 5.4, halfD - 9.4];
    tableLocalZs.forEach((tz) => {
      addLocalBox(grp, 1.75, 0.74, 1.25, p.woodMat, rightTableX, 0.37, tz);
      addLocalBox(grp, 0.24, 0.12, 0.24, p.paintWhiteMat, rightTableX - 0.32, 0.81, tz - 0.2);
      addLocalBox(grp, 0.24, 0.12, 0.24, p.paintWhiteMat, rightTableX + 0.28, 0.81, tz + 0.18);
      addLocalBox(grp, 0.1, 0.18, 0.1, p.bambooMat, rightTableX, 0.84, tz);
      addLocalBox(grp, 0.08, 0.14, 0.08, p.plasticRedMat, rightTableX + 0.16, 0.82, tz - 0.18);
      addLocalBox(grp, 0.08, 0.14, 0.08, p.emeraldRoofMat, rightTableX - 0.16, 0.82, tz + 0.22);
      addLocalBox(grp, 0.04, 0.92, 0.04, p.darkSteelMat, rightTableX, f1H - 0.56, tz);
      addLocalBox(grp, 0.36, 0.2, 0.36, p.interiorCeilingGlowMat, rightTableX, f1H - 1.08, tz);
      addLocalBox(grp, 0.36, 0.44, 0.36, stoolMat, rightTableX, 0.22, tz - 0.82);
      addLocalBox(grp, 0.36, 0.44, 0.36, stoolMat, rightTableX, 0.22, tz + 0.82);
      const yawNorthStool = facingNorth ? Math.PI : 0;
      const yawSouthStool = facingNorth ? 0 : Math.PI;
      seatDefs.push({
        x: toWX(rightTableX) - Math.sin(yawNorthStool) * sitBack,
        z: toWZ(tz - 0.82) - Math.cos(yawNorthStool) * sitBack,
        yaw: yawNorthStool,
        occupiedBy: null,
      });
      seatDefs.push({
        x: toWX(rightTableX) - Math.sin(yawSouthStool) * sitBack,
        z: toWZ(tz + 0.82) - Math.cos(yawSouthStool) * sitBack,
        yaw: yawSouthStool,
        occupiedBy: null,
      });
    });
  }

  // Illuminated Wall Menu Board + Oscillating Wall Fan + Entrance Potted Plants + A-Frame Sidewalk Standee + Patio Table!
  const diningWallX = xDir * (halfW - 0.46);
  addLocalBox(grp, 0.06, 0.98, 2.85, p.charcoalTrimMat, diningWallX, 2.34, halfD - 7.6);
  addLocalBox(grp, 0.07, 0.82, 2.6, p.windowWarmMat, diningWallX - xDir * 0.03, 2.34, halfD - 7.6);
  addLocalBox(grp, 0.16, 0.36, 0.36, p.plasticBlueMat, diningWallX - xDir * 0.12, 2.62, halfD - 4.6);
  [-halfW + 0.8, halfW - 0.8].forEach((px) => {
    addLocalBox(grp, 0.38, 0.36, 0.38, p.terracottaTileMat, px, 0.2, halfD + 0.62);
    addLocalBox(grp, 0.52, 0.58, 0.52, p.foliageMat, px, 0.64, halfD + 0.62);
  });
  // Sidewalk A-frame menu board next to right entrance wing
  const standeeX = xDir * (halfW - 1.35);
  addLocalBox(grp, 0.58, 0.98, 0.1, p.woodMat, standeeX, 0.52, halfD + 1.2, [-0.14, 0, 0]);
  addLocalBox(grp, 0.46, 0.74, 0.04, p.charcoalTrimMat, standeeX, 0.58, halfD + 1.26, [-0.14, 0, 0]);
  // Outdoor Sidewalk Patio Table + Stools + Colorful Sun Umbrella on Left Wing (doorway & right curb bike spot stay 100% open!)
  if (shop.theme !== 'billiard_net' && shop.theme !== 'mini_mart') {
    const patioX = xDir * (-halfW + 1.85);
    const patioZ = halfD + 2.7;
    addLocalBox(grp, 0.95, 0.07, 0.8, p.woodMat, patioX, 0.62, patioZ);
    addLocalBox(grp, 0.09, 0.58, 0.09, p.chromeInoxMat, patioX, 0.31, patioZ);
    addLocalBox(grp, 0.32, 0.36, 0.32, stoolMat, patioX - 0.62, 0.2, patioZ);
    addLocalBox(grp, 0.32, 0.36, 0.32, stoolMat, patioX + 0.62, 0.2, patioZ);
    addLocalBox(grp, 0.07, 2.42, 0.07, p.chromeInoxMat, patioX, 1.21, patioZ);
    addLocalBox(grp, 2.1, 0.13, 2.1, awningMat, patioX, 2.42, patioZ);
  }

  // Register this walkable shop/eatery for live walking customers AND motorbike diners!
  if (p.registerWalkableShopSlot) {
    p.registerWalkableShopSlot({
      id: shop.id,
      name: shop.name,
      theme: shop.theme,
      cx: shop.cx,
      cz: shop.cz,
      facingNorth,
      doorX: shop.cx,
      doorZ: toWZ(halfD - 0.1),
      sidewalkX: shop.cx,
      sidewalkZ: toWZ(halfD + 4.4),
      curbParkX: toWX(origHalfW * 0.52),
      curbParkZ: toWZ(halfD + 2.65),
      curbParkYaw: facingNorth ? Math.PI * 0.85 : -Math.PI * 0.15,
      orderX: toWX(0.0),
      orderZ: toWZ(halfD - 6.6),
      orderYaw: facingNorth ? Math.PI * 0.5 : -Math.PI * 0.5,
      seats: seatDefs,
    });
  }
}

/** Sân Cầu Lông & Công Viên Mini Tổ 5 (-390..-362, Z=-94..-64) */
export function buildBadmintonAndPocketPark(
  staticGroup: THREE.Group,
  p: WestResPalette
) {
  const cx = -376.0;
  const cz = -79.0;
  addLocalBox(staticGroup, 28.0, 0.06, 30.0, p.concreteMat, cx, 0.03, cz);
  addLocalBox(staticGroup, 14.0, 0.08, 21.0, p.emeraldRoofMat, cx - 2.0, 0.04, cz);
  addLocalBox(staticGroup, 13.4, 0.09, 0.14, p.paintWhiteMat, cx - 2.0, 0.045, cz - 9.8);
  addLocalBox(staticGroup, 13.4, 0.09, 0.14, p.paintWhiteMat, cx - 2.0, 0.045, cz + 9.8);
  addLocalBox(staticGroup, 0.14, 0.09, 19.6, p.paintWhiteMat, cx - 8.7, 0.045, cz);
  addLocalBox(staticGroup, 0.14, 0.09, 19.6, p.paintWhiteMat, cx + 4.7, 0.045, cz);
  addLocalBox(staticGroup, 0.1, 1.6, 0.1, p.darkSteelMat, cx - 8.8, 0.8, cz);
  addLocalBox(staticGroup, 0.1, 1.6, 0.1, p.darkSteelMat, cx + 4.8, 0.8, cz);
  addLocalBox(staticGroup, 13.6, 0.65, 0.05, p.paintWhiteMat, cx - 2.0, 1.25, cz);

  // Scoreboard & Umpire Stand + Covered Spectator Canopy + Outdoor Pull-Up Bar + Flower Planters!
  addLocalBox(staticGroup, 0.1, 2.2, 0.1, p.darkSteelMat, cx + 5.8, 1.1, cz);
  addLocalBox(staticGroup, 0.18, 0.85, 1.4, p.charcoalTrimMat, cx + 5.8, 2.15, cz);
  addLocalBox(staticGroup, 0.2, 0.56, 0.5, p.plasticRedMat, cx + 5.8, 2.18, cz - 0.34);
  addLocalBox(staticGroup, 0.2, 0.56, 0.5, p.plasticBlueMat, cx + 5.8, 2.18, cz + 0.34);

  // Covered spectator bench canopy on East side (-365.5)
  addLocalBox(staticGroup, 2.6, 0.12, 6.2, p.stripedAwningMat, -365.4, 2.68, cz);
  [-2.8, 2.8].forEach((oz) => {
    addLocalBox(staticGroup, 0.1, 2.65, 0.1, p.darkSteelMat, -366.5, 1.32, cz + oz);
    addLocalBox(staticGroup, 0.1, 2.65, 0.1, p.darkSteelMat, -364.3, 1.32, cz + oz);
  });
  addLocalBox(staticGroup, 0.8, 0.45, 4.8, p.woodMat, -365.4, 0.24, cz);
  // Chilled drinks & shuttlecock kiosk cart beside court
  addLocalBox(staticGroup, 1.4, 0.92, 0.85, p.plasticBlueMat, -365.4, 0.48, -69.5);
  addLocalBox(staticGroup, 0.07, 2.3, 0.07, p.chromeInoxMat, -365.4, 1.18, -69.5);
  addLocalBox(staticGroup, 2.1, 0.12, 2.1, p.greenAwningMat, -365.4, 2.34, -69.5);
  // Corner light poles + flower planter borders along North/South court edges
  [-86.5, -71.5].forEach((bz) => {
    addLocalBox(staticGroup, 0.8, 0.45, 2.8, p.woodMat, -365.5, 0.23, bz);
    p.addTree(staticGroup, -365.0, bz + 3.5, 0.9, bz < -78 ? 'pink' : 'yellow');
  });
  [-387.5, -366.5].forEach((px) => {
    [-92.2, -65.8].forEach((pz) => {
      addLocalBox(staticGroup, 2.6, 0.42, 0.85, p.creamPlasterMat, px, 0.22, pz);
      addLocalBox(staticGroup, 2.3, 0.48, 0.62, p.foliageMat, px, 0.56, pz);
      addLocalBox(staticGroup, 1.8, 0.22, 0.42, px < -375 ? p.bougainvilleaMat : p.apricotBlossomMat, px, 0.84, pz);
    });
  });
  // Warm court floodlight poles
  [[-388.2, -91.5], [-388.2, -66.5], [-364.2, -91.5], [-364.2, -66.5]].forEach(([lx, lz]) => {
    addLocalBox(staticGroup, 0.12, 4.4, 0.12, p.darkSteelMat, lx, 2.2, lz);
    addLocalBox(staticGroup, 0.52, 0.22, 0.34, p.interiorCeilingGlowMat, lx, 4.42, lz);
  });
}
