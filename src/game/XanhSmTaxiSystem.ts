import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickOutsideNpcModel } from './NpcModelCatalog';
import {
  CITY_ROAD_BOUNDS,
  computeBoulevardSignalFactor,
  computeNorthSouthSignalFactor,
  DIOR_INTERSECTION_CENTER_X,
  EAST_INTERSECTION_CENTER_X,
  FAR_EAST_INTERSECTION_CENTER_X,
  WEST_INTERSECTION_CENTER_X,
  type BoulevardSignalGetter,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import {
  isAdidasOpenAtHour,
  isAeonMallOpenAtHour,
  isChanelOpenAtHour,
  isDesertOpenAtHour,
  isDiorOpenAtHour,
  isGucciOpenAtHour,
  isHaNoiPhoOpenAtHour,
  isHermesOpenAtHour,
  isHighlandsOpenAtHour,
  isJohnHenryOpenAtHour,
  isLouisVuittonOpenAtHour,
  isPheLaOpenAtHour,
  isPhucLongOpenAtHour,
  isPorscheShowroomOpenAtHour,
  isPradaOpenAtHour,
  isRonPickleballOpenAtHour,
  isSkechersOpenAtHour,
  isSteakhouseOpenAtHour,
  isVietcombankOpenAtHour,
  isYslOpenAtHour,
} from './VenueOperatingHours';

export interface XanhSmCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface XanhSmStopSpec {
  id: string;
  label: string;
  side: 'south' | 'north'; // 'south' = Westbound thru Z=31.25 / bay Z=35.50 (curb Z=37.20); 'north' = Eastbound thru Z=26.75 / bay Z=22.45 (curb Z=20.80)
  bayX: number;
  venueDoorX: number;
  venueDoorZ: number;
  approachWalkX: number;
  curbHoldZ: number;
  isAeonMall?: boolean;
}

// Multiple citywide drop-off / pick-up stations along both sides of the boulevard,
// carefully positioned between streetlamps, trees, and bus/garage driveways.
export const XANH_SM_STOPS: readonly XanhSmStopSpec[] = [
  // SOUTH / PLAZA SIDE (Westbound curb bay Z = 35.50 -> Sidewalk curb Z = 37.20+)
  {
    id: 'desert',
    label: 'DESERT • Made in Viet Nam',
    side: 'south',
    bayX: 335.0,
    venueDoorX: 335.0,
    venueDoorZ: 44.2,
    approachWalkX: 335.0,
    curbHoldZ: 38.25,
  },
  {
    id: 'adidas',
    label: 'Adidas Flagship Store',
    side: 'south',
    bayX: 313.2,
    venueDoorX: 313.2,
    venueDoorZ: 44.2,
    approachWalkX: 313.2,
    curbHoldZ: 38.25,
  },
  {
    id: 'phe_la',
    label: 'Cà Phê Phê La',
    side: 'south',
    bayX: 278.5,
    venueDoorX: 278.9,
    venueDoorZ: 47.2,
    approachWalkX: 278.5,
    curbHoldZ: 38.25,
  },
  {
    id: 'hanoi_pho',
    label: 'Lẩu Cua Đồng Hà Nội Phố',
    side: 'south',
    bayX: 221.5,
    venueDoorX: 221.4,
    venueDoorZ: 48.2,
    approachWalkX: 221.4,
    curbHoldZ: 38.25,
  },
  {
    id: 'aeon_west',
    label: 'AEON Mall (West Bay)',
    side: 'south',
    bayX: 121.8,
    venueDoorX: 127.4,
    venueDoorZ: 48.2,
    approachWalkX: 127.2,
    curbHoldZ: 38.25,
    isAeonMall: true,
  },
  {
    id: 'aeon_east',
    label: 'AEON Mall (East Bay)',
    side: 'south',
    bayX: 134.8,
    venueDoorX: 128.6,
    venueDoorZ: 48.2,
    approachWalkX: 128.8,
    curbHoldZ: 38.25,
    isAeonMall: true,
  },
  {
    id: 'royal_residences',
    label: 'The Royal Residences',
    side: 'south',
    bayX: 83.5,
    venueDoorX: 83.5,
    venueDoorZ: 44.6,
    approachWalkX: 83.5,
    curbHoldZ: 38.25,
  },
  {
    id: 'green_park',
    label: 'Green Park Plaza',
    side: 'south',
    bayX: 39.0,
    venueDoorX: 36.5,
    venueDoorZ: 44.0,
    approachWalkX: 37.5,
    curbHoldZ: 38.25,
  },
  {
    id: 'landmark_81',
    label: 'Landmark 81',
    side: 'south',
    bayX: -1.5,
    venueDoorX: 0.0,
    venueDoorZ: 47.4,
    approachWalkX: -0.4,
    curbHoldZ: 38.25,
  },

  // NORTH / SHOP SIDE (Eastbound curb bay Z = 22.45 -> Sidewalk curb Z = 20.80-)
  {
    id: 'starbucks_711',
    label: 'Starbucks & 7-Eleven',
    side: 'north',
    bayX: -32.5,
    venueDoorX: -24.5,
    venueDoorZ: 17.6,
    approachWalkX: -31.5,
    curbHoldZ: 19.75,
  },
  {
    id: 'card_shop',
    label: 'TCG Card Shop',
    side: 'north',
    bayX: 3.5,
    venueDoorX: 0.0,
    venueDoorZ: 16.8,
    approachWalkX: 1.5,
    curbHoldZ: 19.75,
  },
  {
    id: 'porsche_steakhouse',
    label: 'Porsche & Steakhouse',
    side: 'north',
    bayX: 66.5,
    venueDoorX: 68.0,
    venueDoorZ: 17.2,
    approachWalkX: 67.2,
    curbHoldZ: 19.75,
  },
  {
    id: 'ron_pickleball',
    label: 'RON Pickleball Arena',
    side: 'north',
    bayX: 122.0,
    venueDoorX: 133.0,
    venueDoorZ: 17.2,
    approachWalkX: 125.0,
    curbHoldZ: 19.75,
  },
  {
    id: 'vietcombank',
    label: 'Ngân hàng Vietcombank',
    side: 'north',
    bayX: 251.0,
    venueDoorX: 251.0,
    venueDoorZ: 11.4,
    approachWalkX: 251.0,
    curbHoldZ: 19.75,
  },
  {
    id: 'phuc_long',
    label: 'Phúc Long Coffee & Tea',
    side: 'north',
    bayX: 287.1,
    venueDoorX: 287.1,
    venueDoorZ: 10.4,
    approachWalkX: 287.1,
    curbHoldZ: 19.75,
  },
  {
    id: 'skechers',
    label: 'Skechers Store',
    side: 'north',
    bayX: 313.2,
    venueDoorX: 313.2,
    venueDoorZ: 14.5,
    approachWalkX: 313.2,
    curbHoldZ: 19.75,
  },
  {
    id: 'john_henry',
    label: 'John Henry & Freelancer',
    side: 'north',
    bayX: 342.3,
    venueDoorX: 342.3,
    venueDoorZ: 14.5,
    approachWalkX: 342.3,
    curbHoldZ: 19.75,
  },

  // LUXURY CORRIDOR SOUTH (East of Ngã Tư Sơn Tây -> Ngã Tư DIOR)
  {
    id: 'highlands',
    label: 'Highlands Coffee',
    side: 'south',
    bayX: 400.5,
    venueDoorX: 391.6,
    venueDoorZ: 49.5,
    approachWalkX: 396.5,
    curbHoldZ: 38.25,
  },
  {
    id: 'hermes',
    label: 'Hermès Flagship',
    side: 'south',
    bayX: 423.9,
    venueDoorX: 423.9,
    venueDoorZ: 45.8,
    approachWalkX: 423.9,
    curbHoldZ: 38.25,
  },
  {
    id: 'chanel',
    label: 'CHANEL Boutique',
    side: 'south',
    bayX: 455.2,
    venueDoorX: 455.2,
    venueDoorZ: 47.2,
    approachWalkX: 455.2,
    curbHoldZ: 38.25,
  },
  {
    id: 'prada',
    label: 'PRADA Flagship',
    side: 'south',
    bayX: 466.4,
    venueDoorX: 466.4,
    venueDoorZ: 46.8,
    approachWalkX: 466.4,
    curbHoldZ: 38.25,
  },

  // LUXURY CORRIDOR NORTH (East of Ngã Tư Sơn Tây -> Ngã Tư DIOR)
  {
    id: 'louis_vuitton',
    label: 'Louis Vuitton Maison',
    side: 'north',
    bayX: 397.0,
    venueDoorX: 397.0,
    venueDoorZ: 13.0,
    approachWalkX: 397.0,
    curbHoldZ: 19.75,
  },
  {
    id: 'gucci',
    label: 'GUCCI Boutique',
    side: 'north',
    bayX: 423.9,
    venueDoorX: 423.9,
    venueDoorZ: 13.6,
    approachWalkX: 423.9,
    curbHoldZ: 19.75,
  },
  {
    id: 'ysl',
    label: 'SAINT LAURENT (YSL)',
    side: 'north',
    bayX: 448.4,
    venueDoorX: 448.4,
    venueDoorZ: 12.6,
    approachWalkX: 448.4,
    curbHoldZ: 19.75,
  },
  {
    id: 'dior',
    label: 'DIOR Flagship',
    side: 'north',
    bayX: 473.5,
    venueDoorX: 473.5,
    venueDoorZ: 13.8,
    approachWalkX: 473.5,
    curbHoldZ: 19.75,
  },
] as const;

const isTaxiServiceOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 22.0;

const isStopOpenAtHour = (stopId: string, rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  switch (stopId) {
    case 'hanoi_pho':
      return isHaNoiPhoOpenAtHour(h);
    case 'vietcombank':
      return isVietcombankOpenAtHour(h);
    case 'phe_la':
      return isPheLaOpenAtHour(h);
    case 'phuc_long':
      return isPhucLongOpenAtHour(h);
    case 'adidas':
      return isAdidasOpenAtHour(h);
    case 'desert':
      return isDesertOpenAtHour(h);
    case 'skechers':
      return isSkechersOpenAtHour(h);
    case 'john_henry':
      return isJohnHenryOpenAtHour(h);
    case 'highlands':
      return isHighlandsOpenAtHour(h);
    case 'louis_vuitton':
      return isLouisVuittonOpenAtHour(h);
    case 'gucci':
      return isGucciOpenAtHour(h);
    case 'hermes':
      return isHermesOpenAtHour(h);
    case 'ysl':
      return isYslOpenAtHour(h);
    case 'chanel':
      return isChanelOpenAtHour(h);
    case 'dior':
      return isDiorOpenAtHour(h);
    case 'prada':
      return isPradaOpenAtHour(h);
    case 'ron_pickleball':
      return isRonPickleballOpenAtHour(h);
    case 'porsche_steakhouse':
      return isPorscheShowroomOpenAtHour(h) || isSteakhouseOpenAtHour(h);
    case 'aeon_west':
    case 'aeon_east':
      return isAeonMallOpenAtHour(h);
    default:
      return isTaxiServiceOpenAtHour(h);
  }
};

const hasOpenEastCorridorStopAtHour = (rawHour: number): boolean => {
  for (let i = 0; i < XANH_SM_STOPS.length; i++) {
    const s = XANH_SM_STOPS[i];
    if (s.bayX > EAST_INTERSECTION_CENTER_X && isStopOpenAtHour(s.id, rawHour)) {
      return true;
    }
  }
  return false;
};

interface XanhSmTaxiRig {
  group: THREE.Group;
  pitchPivot: THREE.Group;
  wheels: THREE.Group[];
  rearDoorPivot: THREE.Group;
  rearPassengerSilhouette: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  hazardLeftMat: THREE.MeshStandardMaterial;
  hazardRightMat: THREE.MeshStandardMaterial;
  roofSignMat: THREE.MeshStandardMaterial;
  roofStatusLedMat: THREE.MeshStandardMaterial;
  wheelR: number;
  halfW: number;
  halfL: number;
}

interface XanhSmPassengerActor {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  bagMesh: THREE.Group;
  state:
    | 'hidden'
    | 'dropoff_exit_car'
    | 'dropoff_walk_venue'
    | 'pickup_exit_venue'
    | 'pickup_wait_curb'
    | 'pickup_board_car';
  x: number;
  y: number;
  z: number;
  stopSpec: XanhSmStopSpec;
  speed: number;
  walkPhase: number;
  phaseOffset: number;
  wpIdx: number;
  waitTimer: number;
  glbHandle: GlbHumanHandle;
}

type TaxiRouteScope = 'central' | 'east_mid' | 'luxury_dior' | 'citywide';

type TaxiVehicleState =
  | 'cruise_east'
  | 'u_turn_east'
  | 'cruise_west'
  | 'u_turn_west'
  | 'cruise_ns'
  | 'u_turn_ns'
  | 'cruise_bd'
  | 'u_turn_bd'
  | 'turn_curve'
  | 'pulling_in'
  | 'at_curb_door_open'
  | 'at_curb_door_close'
  | 'pulling_out';

interface XanhSmTaxiEntry {
  rig: XanhSmTaxiRig;
  passenger: XanhSmPassengerActor;
  isServiceTaxi: boolean;
  servesEastCorridor: boolean;
  routeScope: TaxiRouteScope;
  tripMode: 'dropoff' | 'pickup';
  targetStopIdx: number;
  dockSide: 'south' | 'north';
  speed: number;
  baseSpeed: number;
  turnProgress: number;
  startX: number;
  startZ: number;
  turnCtrlX: number;
  turnCtrlZ: number;
  turnEndX: number;
  turnEndZ: number;
  turnEndYaw: number;
  turnNextState: TaxiVehicleState;
  nsCenterX: number;
  nsDir: 1 | -1;
  bdDir: 1 | -1;
  turnCooldown: number;
  routeStep: number;
  laneZ: number;
  laneCooldown: number;
  doorOpen: number; // 0..1
  curbWaitTimer: number;
  hasPassengerInside: boolean;
  cooldownTimer: number;
  pickupSpawnedForThisApproach: boolean;
  prevX: number;
  prevZ: number;
  state: TaxiVehicleState;
}

function createFallbackCanvasTexture(): THREE.Texture {
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createXanhSmSideLogoTex(): THREE.Texture {
  if (typeof document === 'undefined') return createFallbackCanvasTexture();
  const w = 512;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Immediate crisp fallback vector emblem matching the Behance Xanh SM V-wing logo
  const drawFallbackLogo = () => {
    ctx.clearRect(0, 0, w, h);

    // Left white inner wing
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 98);
    ctx.quadraticCurveTo(150, 96, 178, 198);
    ctx.lineTo(138, 212);
    ctx.quadraticCurveTo(118, 128, 64, 98);
    ctx.closePath();
    ctx.fill();

    // Right-sweeping main white V-wing
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(118, 212);
    ctx.quadraticCurveTo(164, 272, 224, 250);
    ctx.quadraticCurveTo(286, 226, 342, 134);
    ctx.quadraticCurveTo(376, 82, 444, 58);
    ctx.lineTo(342, 58);
    ctx.quadraticCurveTo(288, 92, 232, 178);
    ctx.quadraticCurveTo(190, 236, 118, 212);
    ctx.closePath();
    ctx.fill();

    // Golden-amber inner swoosh accent
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(112, 202);
    ctx.quadraticCurveTo(176, 220, 224, 152);
    ctx.quadraticCurveTo(276, 78, 342, 58);
    ctx.lineTo(318, 58);
    ctx.quadraticCurveTo(258, 86, 208, 154);
    ctx.quadraticCurveTo(166, 206, 112, 202);
    ctx.closePath();
    ctx.fill();
  };

  drawFallbackLogo();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  // Load the exact Behance logo asset and chroma-key its teal background cleanly to transparent
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;

        // Crop tightly around the V-wing mark in the Behance graphic (808x632)
        const sx = Math.round(iw * 0.21);
        const sy = Math.round(ih * 0.25);
        const sw = Math.round(iw * 0.58);
        const sh = Math.round(ih * 0.50);

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, sx, sy, sw, sh, 16, 16, w - 32, h - 32);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Identify cyan/teal background vs white & golden-yellow emblem
          const cyanScore = Math.min(g, b) - r;
          if (cyanScore > 90 && r < 95) {
            data[i + 3] = 0;
          } else if (cyanScore > 36 && r < 140) {
            const keep = 1 - (cyanScore - 36) / 54;
            data[i + 3] = Math.round(Math.max(0, Math.min(1, keep)) * 255);
          }
        }
        ctx.putImageData(imgData, 0, 0);
        tex.needsUpdate = true;
      } catch {
        // Keep vector fallback if canvas pixel read is restricted
      }
    };
    img.src = '/assets/xanhsm-logo.jpg';
  }

  return tex;
}

function createXanhSmRoofTopperTex(): THREE.Texture {
  if (typeof document === 'undefined') return createFallbackCanvasTexture();
  const w = 512;
  const h = 160;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#007a82');
  grad.addColorStop(0.5, '#00bfc7');
  grad.addColorStop(1, '#007a82');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 58px system-ui, -apple-system, sans-serif';
  ctx.fillText('XANH SM', w / 2, 62);

  ctx.fillStyle = '#fef08a';
  ctx.font = '800 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('TAXI ĐIỆN VINFAST', w / 2, 118);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createXanhSmPlateTex(plateStr: string): THREE.Texture {
  if (typeof document === 'undefined') return createFallbackCanvasTexture();
  const w = 256;
  const h = 80;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plateStr, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

interface XanhSmVariantDims {
  isVf5: boolean;
  wheelR: number;
  wheelZ: number;
  wheelX: number;
  frontOverhangZ: number;
  rearOverhangZ: number;
  beltY: number;
  roofH: number;
  zFrontBot: number;
  zFrontTop: number;
  zRearTop: number;
  zRearBot: number;
  wb: number;
  wt: number;
  sideSurface: number;
  halfW: number;
  halfL: number;
  doorLen: number;
}

interface CachedXanhSmGeos {
  dims: XanhSmVariantDims;
  lowerGeo: THREE.BufferGeometry;
  wellGeo: THREE.BufferGeometry;
  archGeo: THREE.BufferGeometry;
  glassGeo: THREE.BufferGeometry;
  roofCapGeo: THREE.BufferGeometry;
  roofRailGeo?: THREE.BufferGeometry;
  spoilerGeo: THREE.BufferGeometry;
  sharkFinGeo: THREE.BufferGeometry;
  aPillarGeo: THREE.BufferGeometry;
  cPillarGeo: THREE.BufferGeometry;
  bPillarGeo: THREE.BufferGeometry;
  topRailGeo: THREE.BufferGeometry;
  beltTrimGeo: THREE.BufferGeometry;
  handleGeo: THREE.BufferGeometry;
  mirrorStalkGeo: THREE.BufferGeometry;
  mirrorCapGeo: THREE.BufferGeometry;
  splitterGeo: THREE.BufferGeometry;
  skirtGeo: THREE.BufferGeometry;
  rockerAccentGeo: THREE.BufferGeometry;
  diffuserGeo: THREE.BufferGeometry;
  diffuserFinGeo: THREE.BufferGeometry;
  evNosePanelGeo: THREE.BufferGeometry;
  intakeGeo: THREE.BufferGeometry;
  headlampHousingGeo: THREE.BufferGeometry;
  headlampGeo: THREE.BufferGeometry;
  rearLightBarGeo: THREE.BufferGeometry;
  tireGeo: THREE.BufferGeometry;
  rimDiskGeo: THREE.BufferGeometry;
  spokeGeo: THREE.BufferGeometry;
  hubGeo: THREE.BufferGeometry;
  caliperGeo: THREE.BufferGeometry;
}

const xanhSmGeoCache = new Map<'vfe34' | 'vf5', CachedXanhSmGeos>();

function ensureTaxiUv(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.getAttribute('uv')) {
    const pos = geo.getAttribute('position');
    if (pos) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
    }
  }
  return geo;
}

function orientBetweenPoints(
  x1: number,
  py1: number,
  z1: number,
  x2: number,
  py2: number,
  z2: number
): THREE.Quaternion {
  const dir = new THREE.Vector3(x2 - x1, py2 - py1, z2 - z1).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
}

function getXanhSmVariantGeos(variant: 'vfe34' | 'vf5'): CachedXanhSmGeos {
  const existing = xanhSmGeoCache.get(variant);
  if (existing) return existing;

  const isVf5 = variant === 'vf5';
  const wheelR = isVf5 ? 0.32 : 0.35;
  const wheelZ = isVf5 ? 1.18 : 1.32;
  const wheelX = isVf5 ? 0.77 : 0.81;
  const frontOverhangZ = isVf5 ? 1.88 : 2.08;
  const rearOverhangZ = isVf5 ? -1.86 : -2.08;
  const beltY = isVf5 ? 0.89 : 0.93;
  const roofH = isVf5 ? 1.46 : 1.50;
  const zFrontBot = isVf5 ? 0.92 : 1.00;
  const zFrontTop = isVf5 ? 0.30 : 0.32;
  const zRearTop = isVf5 ? -1.20 : -1.24;
  const zRearBot = isVf5 ? -1.66 : -1.78;
  const wb = isVf5 ? 0.73 : 0.77;
  const wt = isVf5 ? 0.59 : 0.62;
  const bevelDepth = isVf5 ? 1.50 : 1.60;
  const bevelSize = 0.05;
  const sideSurface = bevelDepth * 0.5 + bevelSize;
  const doorLen = isVf5 ? 0.78 : 0.88;

  const dims: XanhSmVariantDims = {
    isVf5,
    wheelR,
    wheelZ,
    wheelX,
    frontOverhangZ,
    rearOverhangZ,
    beltY,
    roofH,
    zFrontBot,
    zFrontTop,
    zRearTop,
    zRearBot,
    wb,
    wt,
    sideSurface,
    halfW: isVf5 ? 0.89 : 0.94,
    halfL: isVf5 ? 1.96 : 2.16,
    doorLen,
  };

  // Smooth sculpted CUV/SUV lower body silhouette extruded across width
  const fZ = frontOverhangZ;
  const rZ = rearOverhangZ;
  const fNose = fZ + 0.06;
  const rTail = rZ - 0.04;
  const lowerShape = new THREE.Shape();
  lowerShape.moveTo(rZ, wheelR - 0.03);
  lowerShape.lineTo(fZ, wheelR - 0.04);
  lowerShape.lineTo(fNose, wheelR + 0.17);
  lowerShape.lineTo(fZ - 0.04, isVf5 ? 0.71 : 0.75);
  lowerShape.lineTo(zFrontBot + 0.04, beltY);
  lowerShape.lineTo(zRearBot - 0.08, beltY + 0.015);
  lowerShape.lineTo(rZ, isVf5 ? 0.88 : 0.91);
  lowerShape.lineTo(rTail, 0.42);
  lowerShape.closePath();

  const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, {
    depth: bevelDepth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize,
    bevelSegments: 3,
  });
  lowerGeo.translate(0, 0, -bevelDepth * 0.5);
  lowerGeo.rotateY(-Math.PI / 2);
  ensureTaxiUv(lowerGeo);

  // Upper semi-cylinder wheel wells (strictly above road surface Y=0)
  const wellGeo = new THREE.CylinderGeometry(
    wheelR + 0.075,
    wheelR + 0.075,
    0.25,
    18,
    1,
    false,
    -0.18,
    Math.PI + 0.36
  );
  wellGeo.rotateZ(Math.PI / 2);

  const archGeo = new THREE.TorusGeometry(wheelR + 0.076, 0.036, 8, 18, Math.PI);
  archGeo.rotateY(Math.PI / 2);

  // Tapered dark automotive glasshouse
  const y0 = beltY - 0.02;
  const y1 = roofH - 0.02;
  const glassPos = new Float32Array([
    -wb, y0, zFrontBot,
    wb, y0, zFrontBot,
    wb, y0, zRearBot,
    -wb, y0, zRearBot,
    -wt, y1, zFrontTop,
    wt, y1, zFrontTop,
    wt, y1, zRearTop,
    -wt, y1, zRearTop,
  ]);
  const glassIdx = [
    0, 1, 5, 0, 5, 4,
    2, 3, 7, 2, 7, 6,
    1, 2, 6, 1, 6, 5,
    3, 0, 4, 3, 4, 7,
    4, 5, 6, 4, 6, 7,
  ];
  const indexedGlass = new THREE.BufferGeometry();
  indexedGlass.setAttribute('position', new THREE.BufferAttribute(glassPos, 3));
  indexedGlass.setIndex(glassIdx);
  const glassGeo = indexedGlass.toNonIndexed();
  glassGeo.computeVertexNormals();
  ensureTaxiUv(glassGeo);

  const roofLen = zFrontTop - zRearTop + 0.06;
  const roofCapGeo = new THREE.BoxGeometry(wt * 2.02, 0.055, roofLen);
  const roofRailGeo = !isVf5 ? new THREE.BoxGeometry(0.04, 0.04, roofLen * 0.84) : undefined;
  const spoilerGeo = new THREE.BoxGeometry(isVf5 ? 1.14 : 1.24, 0.045, 0.18);
  const sharkFinGeo = new THREE.BoxGeometry(0.04, 0.075, 0.14);

  const aLen = Math.hypot(wt - wb, y1 - y0, zFrontTop - (zFrontBot - 0.02));
  const aPillarGeo = new THREE.BoxGeometry(0.055, aLen, 0.075);

  const cLen = Math.hypot(wt - wb, y1 - y0, zRearTop - (zRearBot + 0.04));
  const cPillarGeo = new THREE.BoxGeometry(0.065, cLen, isVf5 ? 0.16 : 0.18);

  const bLen = Math.hypot(wt - wb, y1 - y0, 0);
  const bPillarGeo = new THREE.BoxGeometry(0.036, bLen, 0.11);

  const topRailLen = Math.abs(zFrontTop - zRearTop);
  const topRailGeo = new THREE.BoxGeometry(0.04, 0.04, topRailLen);

  const beltTrimGeo = new THREE.BoxGeometry(0.024, 0.028, zFrontBot - zRearBot - 0.10);
  const handleGeo = new THREE.BoxGeometry(0.038, 0.032, 0.16);
  const mirrorStalkGeo = new THREE.BoxGeometry(0.085, 0.038, 0.055);
  const mirrorCapGeo = new THREE.BoxGeometry(0.14, 0.08, 0.13);

  const hullBodyW = isVf5 ? 1.66 : 1.76;
  const splitterGeo = new THREE.BoxGeometry(hullBodyW, 0.07, 0.22);
  const skirtGeo = new THREE.BoxGeometry(0.085, 0.085, isVf5 ? 1.54 : 1.78);
  const rockerAccentGeo = new THREE.BoxGeometry(0.02, 0.028, isVf5 ? 1.46 : 1.68);
  const diffuserGeo = new THREE.BoxGeometry(hullBodyW - 0.04, 0.15, 0.18);
  const diffuserFinGeo = new THREE.BoxGeometry(0.035, 0.12, 0.08);

  const evNosePanelGeo = new THREE.BoxGeometry(isVf5 ? 0.88 : 0.98, 0.22, 0.06);
  const intakeGeo = new THREE.BoxGeometry(isVf5 ? 0.24 : 0.28, 0.11, 0.06);
  const headlampHousingGeo = new THREE.BoxGeometry(isVf5 ? 0.30 : 0.34, 0.115, 0.08);
  const headlampGeo = new THREE.BoxGeometry(isVf5 ? 0.24 : 0.28, 0.075, 0.088);
  const rearLightBarGeo = new THREE.BoxGeometry(isVf5 ? 1.34 : 1.48, 0.048, 0.055);

  const tireW = 0.23;
  const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, tireW, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const rimDiskGeo = new THREE.CylinderGeometry(wheelR * 0.68, wheelR * 0.68, tireW + 0.01, 16);
  rimDiskGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.03, wheelR * 1.24, 0.055);
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, tireW + 0.025, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const caliperGeo = new THREE.BoxGeometry(0.08, 0.135, 0.095);

  const built: CachedXanhSmGeos = {
    dims,
    lowerGeo,
    wellGeo,
    archGeo,
    glassGeo,
    roofCapGeo,
    roofRailGeo,
    spoilerGeo,
    sharkFinGeo,
    aPillarGeo,
    cPillarGeo,
    bPillarGeo,
    topRailGeo,
    beltTrimGeo,
    handleGeo,
    mirrorStalkGeo,
    mirrorCapGeo,
    splitterGeo,
    skirtGeo,
    rockerAccentGeo,
    diffuserGeo,
    diffuserFinGeo,
    evNosePanelGeo,
    intakeGeo,
    headlampHousingGeo,
    headlampGeo,
    rearLightBarGeo,
    tireGeo,
    rimDiskGeo,
    spokeGeo,
    hubGeo,
    caliperGeo,
  };
  xanhSmGeoCache.set(variant, built);
  return built;
}

export function buildXanhSmTaxiMeshRig(opts: {
  variant: 'vfe34' | 'vf5';
  plateStr: string;
  sideLogoTex?: THREE.Texture;
  roofTopperTex?: THREE.Texture;
}): XanhSmTaxiRig {
  const g = getXanhSmVariantGeos(opts.variant);
  const d = g.dims;
  const group = new THREE.Group();
  const pitchPivot = new THREE.Group();
  group.add(pitchPivot);

  const xanhCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00b6be,
    metalness: 0.48,
    roughness: 0.20,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.26,
    roughness: 0.68,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.14,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x09111e,
    metalness: 0.52,
    roughness: 0.08,
    transparent: true,
    opacity: 0.66,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    metalness: 0.88,
    roughness: 0.18,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.92 });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    metalness: 0.45,
    roughness: 0.30,
  });
  const rockerCyanMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.35,
    roughness: 0.28,
  });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.86 });
  const driverUniformMat = new THREE.MeshStandardMaterial({ color: 0x008c95, roughness: 0.65 });
  const passengerOutfitMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.65 });
  const skinSilhouetteMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.15,
    roughness: 0.12,
  });
  const drlCyanMat = new THREE.MeshStandardMaterial({
    color: 0xf0fdfa,
    emissive: 0x67e8f9,
    emissiveIntensity: 1.35,
    roughness: 0.15,
  });
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const hazardLeftMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.05,
    roughness: 0.25,
  });
  const hazardRightMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.05,
    roughness: 0.25,
  });
  const topperTex = opts.roofTopperTex ?? createXanhSmRoofTopperTex();
  const roofSignMat = new THREE.MeshStandardMaterial({
    map: topperTex,
    emissive: 0x5eead4,
    emissiveMap: topperTex,
    emissiveIntensity: 0.6,
    roughness: 0.26,
  });
  const roofStatusLedMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  // 1. Sculpted Beveled Xanh SM Cyan Body Shell
  const lowerMesh = new THREE.Mesh(g.lowerGeo, xanhCyanMat);
  pitchPivot.add(lowerMesh);

  // Dark upper-arc wheel well pockets & SUV matte cladding arches
  const wellXOffset = d.isVf5 ? 0.72 : 0.77;
  const archXOffset = d.isVf5 ? 0.81 : 0.86;
  [
    [-wellXOffset, d.wheelZ],
    [wellXOffset, d.wheelZ],
    [-wellXOffset, -d.wheelZ],
    [wellXOffset, -d.wheelZ],
  ].forEach(([ax, az]) => {
    const well = new THREE.Mesh(g.wellGeo, darkTrimMat);
    well.position.set(ax, d.wheelR, az);
    pitchPivot.add(well);

    const arch = new THREE.Mesh(g.archGeo, darkTrimMat);
    arch.position.set(ax > 0 ? archXOffset : -archXOffset, d.wheelR + 0.01, az);
    pitchPivot.add(arch);
  });

  // 2. Cabin Interior + Visible Driver & Rear Passenger Silhouettes
  const y0 = d.beltY - 0.02;
  const y1 = d.roofH - 0.02;
  const cabinInterior = new THREE.Mesh(
    new THREE.BoxGeometry(d.wb * 1.48, (y1 - y0) * 0.72, (d.zFrontBot - d.zRearBot) * 0.68),
    interiorMat
  );
  cabinInterior.position.set(0, y0 + (y1 - y0) * 0.22, -0.18);
  pitchPivot.add(cabinInterior);

  const driverGroup = new THREE.Group();
  const drvTorso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.22), driverUniformMat);
  drvTorso.position.set(-d.wb * 0.44, d.beltY + 0.14, 0.26);
  driverGroup.add(drvTorso);
  const drvHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinSilhouetteMat);
  drvHead.position.set(-d.wb * 0.44, d.beltY + 0.38, 0.26);
  driverGroup.add(drvHead);
  pitchPivot.add(driverGroup);

  const rearPassengerSilhouette = new THREE.Group();
  const paxTorso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.22), passengerOutfitMat);
  paxTorso.position.set(d.wb * 0.40, d.beltY + 0.13, -0.44);
  rearPassengerSilhouette.add(paxTorso);
  const paxHead = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), skinSilhouetteMat);
  paxHead.position.set(d.wb * 0.40, d.beltY + 0.36, -0.44);
  rearPassengerSilhouette.add(paxHead);
  pitchPivot.add(rearPassengerSilhouette);

  // Dark curbside rear doorway jamb recess revealed when door opens
  const doorJamb = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.48, d.doorLen * 0.92),
    darkTrimMat
  );
  doorJamb.position.set(d.sideSurface - 0.008, d.beltY - 0.24, 0.06 - d.doorLen * 0.5);
  pitchPivot.add(doorJamb);

  // 3. Tapered Glossy Dark Tinted Greenhouse, Roof Cap, Spoiler & Pillars
  const glassMesh = new THREE.Mesh(g.glassGeo, glassMat);
  pitchPivot.add(glassMesh);

  const roofCenterZ = (d.zFrontTop + d.zRearTop) * 0.5;
  const roofCap = new THREE.Mesh(g.roofCapGeo, xanhCyanMat);
  roofCap.position.set(0, d.roofH - 0.005, roofCenterZ);
  pitchPivot.add(roofCap);

  const sharkFin = new THREE.Mesh(g.sharkFinGeo, darkTrimMat);
  sharkFin.position.set(0, d.roofH + 0.035, d.zRearTop + 0.20);
  sharkFin.rotation.x = -0.35;
  pitchPivot.add(sharkFin);

  const spoiler = new THREE.Mesh(g.spoilerGeo, xanhCyanMat);
  spoiler.position.set(0, d.roofH + 0.015, d.zRearTop - 0.07);
  spoiler.rotation.x = -0.14;
  pitchPivot.add(spoiler);

  if (g.roofRailGeo) {
    [-0.50, 0.50].forEach((rx) => {
      const rail = new THREE.Mesh(g.roofRailGeo!, chromeMat);
      rail.position.set(rx, d.roofH + 0.035, roofCenterZ - 0.06);
      pitchPivot.add(rail);
    });
  }

  // A/B/C Pillars, Horizontal Top Frame Rails, Chrome Beltline Trim, Door Handles & Wing Mirrors
  const handleX = d.sideSurface + 0.005;
  const mirrorX = d.sideSurface + 0.02;
  [-1, 1].forEach((side) => {
    const aPillar = new THREE.Mesh(g.aPillarGeo, xanhCyanMat);
    aPillar.position.set(
      side * ((d.wb + d.wt) * 0.5 - 0.01),
      (y0 + y1) * 0.5,
      (d.zFrontBot - 0.02 + d.zFrontTop) * 0.5
    );
    aPillar.quaternion.copy(
      orientBetweenPoints(
        side * (d.wb - 0.01), y0, d.zFrontBot - 0.02,
        side * (d.wt - 0.01), y1, d.zFrontTop
      )
    );
    pitchPivot.add(aPillar);

    const cPillar = new THREE.Mesh(g.cPillarGeo, d.isVf5 ? darkTrimMat : xanhCyanMat);
    cPillar.position.set(
      side * ((d.wb + d.wt) * 0.5 - 0.01),
      (y0 + y1) * 0.5,
      (d.zRearBot + 0.04 + d.zRearTop) * 0.5
    );
    cPillar.quaternion.copy(
      orientBetweenPoints(
        side * (d.wb - 0.01), y0, d.zRearBot + 0.04,
        side * (d.wt - 0.01), y1, d.zRearTop
      )
    );
    pitchPivot.add(cPillar);

    const bZ = 0.08;
    const bPillar = new THREE.Mesh(g.bPillarGeo, darkTrimMat);
    bPillar.position.set(side * ((d.wb + d.wt) * 0.5), (y0 + y1) * 0.5, bZ);
    bPillar.quaternion.copy(
      orientBetweenPoints(side * (d.wb - 0.005), y0, bZ, side * (d.wt + 0.005), y1, bZ)
    );
    pitchPivot.add(bPillar);

    // Horizontal top frame rail (Z-aligned, cleanly along upper door frame)
    const topRail = new THREE.Mesh(g.topRailGeo, darkTrimMat);
    topRail.position.set(side * d.wt, y1, (d.zFrontTop + d.zRearTop) * 0.5);
    pitchPivot.add(topRail);

    const beltTrim = new THREE.Mesh(g.beltTrimGeo, chromeMat);
    beltTrim.position.set(side * (d.wb + 0.01), d.beltY - 0.01, (d.zFrontBot + d.zRearBot) * 0.5);
    pitchPivot.add(beltTrim);

    // Front door handle on both sides + left-rear door handle (right-rear has animated door handle)
    const fHandle = new THREE.Mesh(g.handleGeo, chromeMat);
    fHandle.position.set(side * handleX, d.beltY - 0.13, 0.22);
    pitchPivot.add(fHandle);
    if (side < 0) {
      const rHandle = new THREE.Mesh(g.handleGeo, chromeMat);
      rHandle.position.set(side * handleX, d.beltY - 0.13, -0.58);
      pitchPivot.add(rHandle);
    }

    const mirrorStalk = new THREE.Mesh(g.mirrorStalkGeo, darkTrimMat);
    mirrorStalk.position.set(side * mirrorX, d.beltY + 0.02, d.isVf5 ? 0.50 : 0.58);
    pitchPivot.add(mirrorStalk);

    const mirrorCap = new THREE.Mesh(g.mirrorCapGeo, xanhCyanMat);
    mirrorCap.position.set(side * (mirrorX + 0.08), d.beltY + 0.04, d.isVf5 ? 0.48 : 0.56);
    pitchPivot.add(mirrorCap);
  });

  // 4. Crisp Xanh SM V-Wing Door Logos on Left & Right Front Doors
  const sideLogoTex = opts.sideLogoTex ?? createXanhSmSideLogoTex();
  const sideLogoMat = new THREE.MeshStandardMaterial({
    map: sideLogoTex,
    transparent: true,
    alphaTest: 0.04,
    roughness: 0.24,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const logoW = d.isVf5 ? 0.58 : 0.66;
  const logoH = logoW * 0.60;
  const logoY = d.wheelR + 0.29;
  const logoZ = d.isVf5 ? 0.40 : 0.46;

  const logoL = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), sideLogoMat);
  logoL.rotation.y = -Math.PI / 2;
  logoL.position.set(-(d.sideSurface + 0.008), logoY, logoZ);
  pitchPivot.add(logoL);

  const logoR = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), sideLogoMat);
  logoR.rotation.y = Math.PI / 2;
  logoR.position.set(d.sideSurface + 0.008, logoY, logoZ);
  pitchPivot.add(logoR);

  // 5. Articulated Curbside Rear Passenger Door (+X side, hinged at B-pillar z = +0.06)
  const rearDoorPivot = new THREE.Group();
  rearDoorPivot.position.set(d.sideSurface + 0.006, d.beltY - 0.24, 0.06);

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.46, d.doorLen),
    xanhCyanMat
  );
  doorPanel.position.set(0, 0, -d.doorLen * 0.5);
  rearDoorPivot.add(doorPanel);

  // Tapered upper window glass tilting inward to match cabin greenhouse bevel
  const doorGlassGrp = new THREE.Group();
  doorGlassGrp.position.set(-0.02, 0.23, -d.doorLen * 0.5);
  doorGlassGrp.rotation.z = Math.atan2(d.wb - d.wt, y1 - y0);
  const doorWinH = y1 - y0 - 0.02;
  const doorWin = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, doorWinH, d.doorLen * 0.88),
    glassMat
  );
  doorWin.position.y = doorWinH * 0.5;
  doorGlassGrp.add(doorWin);
  rearDoorPivot.add(doorGlassGrp);

  const doorHandle = new THREE.Mesh(g.handleGeo, chromeMat);
  doorHandle.position.set(0.012, 0.11, -d.doorLen * 0.76);
  rearDoorPivot.add(doorHandle);
  pitchPivot.add(rearDoorPivot);

  // 6. Aerodynamic Lower Splitter, SUV Rocker Skirts w/ EV Cyan Accent & EV Rear Diffuser
  const splitter = new THREE.Mesh(g.splitterGeo, darkTrimMat);
  splitter.position.set(0, Math.max(0.24, d.wheelR - 0.06), d.frontOverhangZ - 0.01);
  pitchPivot.add(splitter);

  const skirtX = d.sideSurface + 0.015;
  [-skirtX, skirtX].forEach((sx) => {
    const skirt = new THREE.Mesh(g.skirtGeo, darkTrimMat);
    skirt.position.set(sx, Math.max(0.25, d.wheelR - 0.05), 0);
    pitchPivot.add(skirt);

    const accent = new THREE.Mesh(g.rockerAccentGeo, rockerCyanMat);
    accent.position.set(sx + Math.sign(sx) * 0.04, Math.max(0.26, d.wheelR - 0.04), 0);
    pitchPivot.add(accent);
  });

  const diffuser = new THREE.Mesh(g.diffuserGeo, darkTrimMat);
  diffuser.position.set(0, Math.max(0.27, d.wheelR - 0.03), d.rearOverhangZ);
  pitchPivot.add(diffuser);

  [-0.45, -0.15, 0.15, 0.45].forEach((fx) => {
    const fin = new THREE.Mesh(g.diffuserFinGeo, darkTrimMat);
    fin.position.set(fx, Math.max(0.25, d.wheelR - 0.05), d.rearOverhangZ - 0.07);
    pitchPivot.add(fin);
  });

  // 7. Streamlined Glowing Xanh SM Roof Taxi Lightbox (illuminated faces + green/amber status LED)
  const topperGroup = new THREE.Group();
  topperGroup.position.set(0, d.roofH + 0.11, 0.18);

  const topperMount = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.20), darkTrimMat);
  topperMount.position.y = -0.075;
  topperGroup.add(topperMount);

  const topperShell = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 0.22), chromeMat);
  topperGroup.add(topperShell);

  const topperFaceF = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.16), roofSignMat);
  topperFaceF.position.z = 0.114;
  topperGroup.add(topperFaceF);

  const topperFaceB = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.16), roofSignMat);
  topperFaceB.rotation.y = Math.PI;
  topperFaceB.position.z = -0.114;
  topperGroup.add(topperFaceB);

  const statusLed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.232), roofStatusLedMat);
  statusLed.position.set(0.35, 0, 0);
  topperGroup.add(statusLed);
  pitchPivot.add(topperGroup);

  // 8. Authentic VinFast Electric Front & Rear Fascias + Yellow Taxi Plates
  const fFaceZ = d.frontOverhangZ + 0.055;
  const evNosePanel = new THREE.Mesh(g.evNosePanelGeo, darkTrimMat);
  evNosePanel.position.set(0, 0.53, fFaceZ);
  pitchPivot.add(evNosePanel);

  // Sculpted 3D VinFast chrome 'V' double wings centered on front nose
  [-1, 1].forEach((side) => {
    const badgeWing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.03), chromeMat);
    badgeWing.position.set(side * 0.042, 0.56, fFaceZ + 0.032);
    badgeWing.rotation.z = side * 0.45;
    pitchPivot.add(badgeWing);

    // Sweeping white-cyan VinFast LED DRL wings across front fascia
    const fV = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.035), drlCyanMat);
    fV.position.set(side * 0.34, 0.62, fFaceZ + 0.02);
    fV.rotation.z = side * 0.22;
    pitchPivot.add(fV);

    const headlampHousing = new THREE.Mesh(g.headlampHousingGeo, darkTrimMat);
    headlampHousing.position.set(side * (d.isVf5 ? 0.56 : 0.62), 0.56, d.frontOverhangZ + 0.01);
    headlampHousing.rotation.y = side > 0 ? -0.18 : 0.18;
    pitchPivot.add(headlampHousing);

    const headlamp = new THREE.Mesh(g.headlampGeo, headlightMat);
    headlamp.position.set(side * (d.isVf5 ? 0.56 : 0.62), 0.56, d.frontOverhangZ + 0.02);
    headlamp.rotation.y = side > 0 ? -0.18 : 0.18;
    pitchPivot.add(headlamp);

    const intake = new THREE.Mesh(g.intakeGeo, darkTrimMat);
    intake.position.set(side * (d.isVf5 ? 0.56 : 0.62), 0.38, d.frontOverhangZ + 0.038);
    intake.rotation.y = side > 0 ? -0.14 : 0.14;
    pitchPivot.add(intake);

    const hMat = side < 0 ? hazardLeftMat : hazardRightMat;
    const fInd = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.04), hMat);
    fInd.position.set(side * (d.isVf5 ? 0.70 : 0.76), 0.44, d.frontOverhangZ + 0.01);
    fInd.rotation.y = side > 0 ? -0.22 : 0.22;
    pitchPivot.add(fInd);
  });

  const plateTex = createXanhSmPlateTex(opts.plateStr);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.38 });
  const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), plateMat);
  frontPlate.position.set(0, 0.37, fFaceZ + 0.04);
  pitchPivot.add(frontPlate);

  // Rear Fascia: Full-width Red LED Lightbar + VinFast V Brake Wings + Tailgate Plate
  const rFaceZ = d.rearOverhangZ - 0.042;
  const rearLightBar = new THREE.Mesh(g.rearLightBarGeo, brakeMat);
  rearLightBar.position.set(0, d.beltY - 0.10, rFaceZ);
  pitchPivot.add(rearLightBar);

  [-1, 1].forEach((side) => {
    const rV = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.048, 0.045), brakeMat);
    rV.position.set(side * 0.36, d.beltY - 0.12, rFaceZ - 0.01);
    rV.rotation.z = -side * 0.18;
    pitchPivot.add(rV);

    const rearBadgeWing = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.024, 0.03), chromeMat);
    rearBadgeWing.position.set(side * 0.036, d.beltY - 0.12, rFaceZ - 0.025);
    rearBadgeWing.rotation.z = side * 0.45;
    pitchPivot.add(rearBadgeWing);

    const hMat = side < 0 ? hazardLeftMat : hazardRightMat;
    const rInd = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.04), hMat);
    rInd.position.set(side * (d.isVf5 ? 0.66 : 0.72), d.beltY - 0.22, rFaceZ - 0.005);
    pitchPivot.add(rInd);
  });

  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.12), plateMat);
  rearPlate.rotation.y = Math.PI;
  rearPlate.position.set(0, 0.55, rFaceZ - 0.02);
  pitchPivot.add(rearPlate);

  // 9. Four Multi-Part 5-Spoke EV Alloy Wheels + Cyan Brake Calipers (bottom seated at Y = 0.0!)
  const wheels: THREE.Group[] = [];
  [-d.wheelX, d.wheelX].forEach((wx) => {
    [-d.wheelZ, d.wheelZ].forEach((wz) => {
      const wheelPivot = new THREE.Group();
      wheelPivot.position.set(wx, d.wheelR, wz);

      wheelPivot.add(new THREE.Mesh(g.tireGeo, tireMat));
      wheelPivot.add(new THREE.Mesh(g.rimDiskGeo, darkTrimMat));

      const sideSign = wx > 0 ? 1 : -1;
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(g.spokeGeo, rimMat);
        spoke.position.x = sideSign * 0.12;
        spoke.rotation.x = (s * Math.PI) / 5;
        wheelPivot.add(spoke);
      }

      wheelPivot.add(new THREE.Mesh(g.hubGeo, chromeMat));

      const caliper = new THREE.Mesh(g.caliperGeo, caliperMat);
      caliper.position.set(sideSign * 0.04, 0.10, -0.085);
      wheelPivot.add(caliper);

      pitchPivot.add(wheelPivot);
      wheels.push(wheelPivot);
    });
  });

  return {
    group,
    pitchPivot,
    wheels,
    rearDoorPivot,
    rearPassengerSilhouette,
    headlightMat,
    brakeMat,
    hazardLeftMat,
    hazardRightMat,
    roofSignMat,
    roofStatusLedMat,
    wheelR: d.wheelR,
    halfW: d.halfW,
    halfL: d.halfL,
  };
}

let sharedAmbientSideLogoTex: THREE.Texture | null = null;
let sharedAmbientRoofTopperTex: THREE.Texture | null = null;

/**
 * Lightweight ambient Xanh SM VinFast VF e34 / VF 5 taxi rig sharing cached
 * geometries and procedural door/topper textures for use on any city road,
 * bridge, or residential boulevard without duplicating GPU resources.
 */
export function buildAmbientXanhSmTaxiCar(
  variant: 'vfe34' | 'vf5' = 'vfe34',
  plateStr = '43H-886.01',
  hasPassenger = false
): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  wheelR: number;
  halfW: number;
  halfL: number;
} {
  if (!sharedAmbientSideLogoTex) {
    sharedAmbientSideLogoTex = createXanhSmSideLogoTex();
  }
  if (!sharedAmbientRoofTopperTex) {
    sharedAmbientRoofTopperTex = createXanhSmRoofTopperTex();
  }
  const rig = buildXanhSmTaxiMeshRig({
    variant,
    plateStr,
    sideLogoTex: sharedAmbientSideLogoTex,
    roofTopperTex: sharedAmbientRoofTopperTex,
  });
  rig.group.userData.noMerge = true;
  rig.rearPassengerSilhouette.visible = hasPassenger;
  return {
    group: rig.group,
    wheels: rig.wheels,
    headlightMat: rig.headlightMat,
    brakeMat: rig.brakeMat,
    wheelR: rig.wheelR,
    halfW: rig.halfW,
    halfL: rig.halfL,
  };
}

export class XanhSmTaxiController {
  public readonly rootGroup = new THREE.Group();
  private taxis: XanhSmTaxiEntry[] = [];
  private sharedSideLogoTex: THREE.Texture;
  private sharedRoofTopperTex: THREE.Texture;
  private trafficCoordinator: CityTrafficCoordinator | null = null;
  private getWestSignal: BoulevardSignalGetter | null = null;
  private getEastSignal: BoulevardSignalGetter | null = null;
  private getFarEastSignal: BoulevardSignalGetter | null = null;
  private getDiorSignal: BoulevardSignalGetter | null = null;
  private timer = 0;

  constructor(helpers: XanhSmCharacterHelpers, trafficCoordinator?: CityTrafficCoordinator) {
    this.rootGroup.userData.noMerge = true;
    this.trafficCoordinator = trafficCoordinator ?? null;
    this.sharedSideLogoTex = createXanhSmSideLogoTex();
    this.sharedRoofTopperTex = createXanhSmRoofTopperTex();

    this.buildFleet(helpers);
  }

  public setTrafficCoordinator(coordinator: CityTrafficCoordinator) {
    this.trafficCoordinator = coordinator;
  }

  public setIntersectionSignalGetters(
    west?: BoulevardSignalGetter | null,
    east?: BoulevardSignalGetter | null,
    farEast?: BoulevardSignalGetter | null,
    dior?: BoulevardSignalGetter | null
  ) {
    this.getWestSignal = west ?? null;
    this.getEastSignal = east ?? null;
    this.getFarEastSignal = farEast ?? null;
    this.getDiorSignal = dior ?? null;
  }

  private getSignalForCenterX(centerX: number): BoulevardSignalGetter | null {
    if (Math.abs(centerX - WEST_INTERSECTION_CENTER_X) < 5) return this.getWestSignal;
    if (Math.abs(centerX - EAST_INTERSECTION_CENTER_X) < 5) return this.getEastSignal;
    if (Math.abs(centerX - FAR_EAST_INTERSECTION_CENTER_X) < 5) return this.getFarEastSignal;
    if (Math.abs(centerX - DIOR_INTERSECTION_CENTER_X) < 5) return this.getDiorSignal;
    return null;
  }

  private getNsLaneX(centerX: number, dirZ: 1 | -1): number {
    return dirZ > 0 ? centerX - 2.1 : centerX + 2.1;
  }

  private beginCurveTurn(
    t: XanhSmTaxiEntry,
    ctrlX: number,
    ctrlZ: number,
    endX: number,
    endZ: number,
    endYaw: number,
    nextState: TaxiVehicleState,
    nextLaneZ?: number
  ) {
    t.state = 'turn_curve';
    t.turnProgress = 0;
    t.startX = t.rig.group.position.x;
    t.startZ = t.rig.group.position.z;
    t.turnCtrlX = ctrlX;
    t.turnCtrlZ = ctrlZ;
    t.turnEndX = endX;
    t.turnEndZ = endZ;
    t.turnEndYaw = endYaw;
    t.turnNextState = nextState;
    if (nextLaneZ !== undefined) t.laneZ = nextLaneZ;
    t.turnCooldown = 5.5;
  }

  private createXanhSmTaxiRig(variant: 'vfe34' | 'vf5', plateStr: string): XanhSmTaxiRig {
    return buildXanhSmTaxiMeshRig({
      variant,
      plateStr,
      sideLogoTex: this.sharedSideLogoTex,
      roofTopperTex: this.sharedRoofTopperTex,
    });
  }

  private buildPassengerActor(helpers: XanhSmCharacterHelpers, idx: number): XanhSmPassengerActor {
    const shirts = [0xf43f5e, 0x2563eb, 0x16a34a, 0xa855f7, 0xf97316, 0x0ea5e9];
    const pants = [0x0f172a, 0x1e293b, 0x334155, 0x1e1b4b];
    const skins = ['#f1c27d', '#e0ac69', '#d2996c', '#f5cba7'];
    const bags = [0xa21caf, 0xf8fafc, 0xef4444, 0xfacc15, 0x14b8a6, 0xec4899];

    const skinHexStr = skins[idx % skins.length];
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHexStr, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirts[idx % shirts.length], roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants[idx % pants.length], roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0x18181b : 0x3f2312, roughness: 0.9 });

    const group = new THREE.Group();
    const hipsGroup = new THREE.Group();
    hipsGroup.position.y = 0.84;
    group.add(hipsGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), shirtMat);
    torso.position.y = 0.30;
    hipsGroup.add(torso);

    const faceTex = helpers.createFaceTexture('happy', skinHexStr);
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.62;
    const headMesh = helpers.createHeadMesh(skinMat, faceTex, 0.29, 0.29, 0.29);
    headMesh.position.y = 0.14;
    headGroup.add(headMesh);
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.08, 0.31), hairMat);
    hairTop.position.y = 0.29;
    headGroup.add(hairTop);
    hipsGroup.add(headGroup);

    const makeLeg = (lx: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0, 0);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
      leg.position.y = -0.36;
      pivot.add(leg);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.22), shoeMat);
      shoe.position.set(0, -0.77, 0.03);
      pivot.add(shoe);
      hipsGroup.add(pivot);
      return pivot;
    };
    const leftLeg = makeLeg(-0.11);
    const rightLeg = makeLeg(0.11);

    const makeArm = (ax: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(ax, 0.54, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.48, 0.14), shirtMat);
      arm.position.y = -0.22;
      pivot.add(arm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), skinMat);
      hand.position.y = -0.49;
      pivot.add(hand);
      hipsGroup.add(pivot);
      return pivot;
    };
    const leftArm = makeArm(-0.26);
    const rightArm = makeArm(0.26);

    const bagMesh = new THREE.Group();
    const bagBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.28, 0.24),
      new THREE.MeshStandardMaterial({ color: bags[idx % bags.length], roughness: 0.48 })
    );
    bagMesh.add(bagBody);
    bagMesh.position.set(0.06, -0.50, 0);
    rightArm.add(bagMesh);

    group.visible = false;
    this.rootGroup.add(group);

    const spec = pickOutsideNpcModel(idx * 3 + 2);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: group,
      fallbackMeshes: [hipsGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: 'Walk',
      phaseOffset: idx * 0.9,
    });

    return {
      group,
      hipsGroup,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      headGroup,
      bagMesh,
      state: 'hidden',
      x: 121.8,
      y: 0,
      z: 36.2,
      stopSpec: XANH_SM_STOPS[0],
      speed: 1.44 + (idx % 3) * 0.08,
      walkPhase: idx * 1.3,
      phaseOffset: idx * 1.9,
      wpIdx: 0,
      waitTimer: 0,
      glbHandle,
    };
  }

  private buildFleet(helpers: XanhSmCharacterHelpers) {
    const idxOf = (id: string) => Math.max(0, XANH_SM_STOPS.findIndex((s) => s.id === id));
    const fleetSpecs: Array<{
      variant: 'vfe34' | 'vf5';
      plate: string;
      isServiceTaxi: boolean;
      routeScope: TaxiRouteScope;
      tripMode: 'dropoff' | 'pickup';
      targetStopIdx: number;
      initState: TaxiVehicleState;
      initX: number;
      initZ: number;
      initBdDir?: 1 | -1;
      baseSpeed: number;
    }> = [
      // Taxi 0: Citywide Waterfront Cruiser (starts on Đường Bạch Đằng Westbound -> Đại Lộ Bệnh Viện -> Phố Cư Dân Tây)
      {
        variant: 'vfe34',
        plate: '51H-886.01',
        isServiceTaxi: true,
        routeScope: 'citywide',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('aeon_west'),
        initState: 'cruise_bd',
        initX: 68.0,
        initZ: CITY_ROAD_BOUNDS.bachDangWBZ,
        initBdDir: -1,
        baseSpeed: 8.8,
      },
      // Taxi 1: Central Corridor (Card Shop / Porsche / RON Pickleball / Landmark)
      {
        variant: 'vf5',
        plate: '51H-886.18',
        isServiceTaxi: true,
        routeScope: 'central',
        tripMode: 'pickup',
        targetStopIdx: idxOf('card_shop'),
        initState: 'cruise_east',
        initX: -28.0,
        initZ: 23.25,
        baseSpeed: 8.8,
      },
      // Taxi 2: Citywide Express (starts in Phố Cư Dân Tây & tours Đại Lộ Bệnh Viện / Bạch Đằng / Sơn Tây / DIOR)
      {
        variant: 'vfe34',
        plate: '51H-886.39',
        isServiceTaxi: true,
        routeScope: 'citywide',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('landmark_81'),
        initState: 'cruise_east',
        initX: -520.0,
        initZ: 26.90,
        baseSpeed: 9.0,
      },
      // Taxi 3: Luxury District & DIOR (Louis Vuitton / Gucci / YSL / DIOR / Chanel / PRADA)
      {
        variant: 'vf5',
        plate: '30K-688.55',
        isServiceTaxi: true,
        routeScope: 'luxury_dior',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('dior'),
        initState: 'cruise_east',
        initX: 412.0,
        initZ: 23.25,
        baseSpeed: 8.9,
      },
      // Taxi 4: East Mid Corridor (Hà Nội Phố / Adidas / Phúc Long / Sơn Tây)
      {
        variant: 'vfe34',
        plate: '51H-886.79',
        isServiceTaxi: true,
        routeScope: 'east_mid',
        tripMode: 'pickup',
        targetStopIdx: idxOf('ha_noi_pho'),
        initState: 'cruise_west',
        initX: 292.0,
        initZ: 34.75,
        baseSpeed: 8.7,
      },
      // Taxi 5: Continuous Citywide Ambient Cruiser (starts in East Luxury District & tours Bạch Đằng / N-S avenues)
      {
        variant: 'vf5',
        plate: '51H-886.92',
        isServiceTaxi: false,
        routeScope: 'citywide',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('prada'),
        initState: 'cruise_west',
        initX: 526.0,
        initZ: 31.10,
        baseSpeed: 9.4,
      },
      // Taxi 6: East Mid Corridor (Adidas, Phê La, Hà Nội Phố, Desert)
      {
        variant: 'vfe34',
        plate: '51H-886.88',
        isServiceTaxi: true,
        routeScope: 'east_mid',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('adidas'),
        initState: 'cruise_west',
        initX: 332.0,
        initZ: 34.75,
        baseSpeed: 8.6,
      },
      // Taxi 7: East Mid Corridor (Phúc Long, Vietcombank, Skechers, John Henry)
      {
        variant: 'vf5',
        plate: '51H-886.99',
        isServiceTaxi: true,
        routeScope: 'east_mid',
        tripMode: 'pickup',
        targetStopIdx: idxOf('phuc_long'),
        initState: 'cruise_east',
        initX: 256.0,
        initZ: 23.25,
        baseSpeed: 8.9,
      },
      // Taxi 8: Luxury District & DIOR (PRADA, Chanel, Hermès, Highlands)
      {
        variant: 'vfe34',
        plate: '51H-886.66',
        isServiceTaxi: true,
        routeScope: 'luxury_dior',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('prada'),
        initState: 'cruise_west',
        initX: 508.0,
        initZ: 34.75,
        baseSpeed: 8.8,
      },
      // Taxi 9: Citywide Luxury & Bạch Đằng Connector (Louis Vuitton / Gucci / Ngã 3 Bạch Đằng - DIOR)
      {
        variant: 'vf5',
        plate: '51H-886.77',
        isServiceTaxi: true,
        routeScope: 'luxury_dior',
        tripMode: 'pickup',
        targetStopIdx: idxOf('louis_vuitton'),
        initState: 'cruise_east',
        initX: 356.0,
        initZ: 23.25,
        baseSpeed: 8.7,
      },
      // Taxi 10: Đường Bạch Đằng Waterfront Cruiser (starts right beside Công Viên Trung Tâm Bạch Đằng & Starbucks!)
      {
        variant: 'vfe34',
        plate: '43H-886.10',
        isServiceTaxi: false,
        routeScope: 'citywide',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('adidas'),
        initState: 'cruise_bd',
        initX: -118.0,
        initZ: CITY_ROAD_BOUNDS.bachDangEBZ,
        initBdDir: 1,
        baseSpeed: 9.2,
      },
      // Taxi 11: West Hospital & Phan Châu Trinh High School Boulevard Cruiser
      {
        variant: 'vf5',
        plate: '43H-886.11',
        isServiceTaxi: true,
        routeScope: 'citywide',
        tripMode: 'pickup',
        targetStopIdx: idxOf('card_shop'),
        initState: 'cruise_east',
        initX: -278.0,
        initZ: 23.25,
        baseSpeed: 8.9,
      },
      // Taxi 12..15: Extended West Central Boulevard (Phố Cư Dân Tây <-> Trung Tâm <-> Bạch Đằng)
      {
        variant: 'vfe34',
        plate: '43H-886.12',
        isServiceTaxi: false,
        routeScope: 'citywide',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('card_shop'),
        initState: 'cruise_west',
        initX: -465.0,
        initZ: 31.10,
        baseSpeed: 9.2,
      },
      {
        variant: 'vf5',
        plate: '43H-886.15',
        isServiceTaxi: true,
        routeScope: 'citywide',
        tripMode: 'pickup',
        targetStopIdx: idxOf('aeon_west'),
        initState: 'cruise_east',
        initX: -620.0,
        initZ: 23.25,
        baseSpeed: 9.1,
      },
      {
        variant: 'vfe34',
        plate: '43H-886.19',
        isServiceTaxi: false,
        routeScope: 'citywide',
        tripMode: 'dropoff',
        targetStopIdx: idxOf('landmark_81'),
        initState: 'cruise_west',
        initX: -775.0,
        initZ: 34.75,
        baseSpeed: 9.3,
      },
      {
        variant: 'vf5',
        plate: '43H-886.24',
        isServiceTaxi: false,
        routeScope: 'citywide',
        tripMode: 'pickup',
        targetStopIdx: idxOf('royal_residences'),
        initState: 'cruise_east',
        initX: -905.0,
        initZ: 26.90,
        baseSpeed: 9.0,
      },
    ];

    fleetSpecs.forEach((sp, idx) => {
      const rig = this.createXanhSmTaxiRig(sp.variant, sp.plate);
      rig.group.position.set(sp.initX, -0.26, sp.initZ);
      const initBdDir: 1 | -1 = sp.initBdDir ?? -1;
      rig.group.rotation.y =
        sp.initState === 'cruise_bd'
          ? initBdDir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : sp.initState === 'cruise_east'
            ? Math.PI / 2
            : -Math.PI / 2;
      const hasPassenger = sp.isServiceTaxi && sp.tripMode === 'dropoff';
      rig.rearPassengerSilhouette.visible = hasPassenger;
      this.rootGroup.add(rig.group);

      const passenger = this.buildPassengerActor(helpers, idx);
      const stopSpec = XANH_SM_STOPS[sp.targetStopIdx] ?? XANH_SM_STOPS[0];

      this.taxis.push({
        rig,
        passenger,
        isServiceTaxi: sp.isServiceTaxi,
        servesEastCorridor: sp.routeScope !== 'central',
        routeScope: sp.routeScope,
        tripMode: sp.tripMode,
        targetStopIdx: sp.targetStopIdx,
        dockSide: stopSpec.side,
        speed: sp.baseSpeed,
        baseSpeed: sp.baseSpeed,
        turnProgress: 0,
        startX: sp.initX,
        startZ: sp.initZ,
        turnCtrlX: sp.initX,
        turnCtrlZ: sp.initZ,
        turnEndX: sp.initX,
        turnEndZ: sp.initZ,
        turnEndYaw: 0,
        turnNextState: sp.initState,
        nsCenterX: DIOR_INTERSECTION_CENTER_X,
        nsDir: 1,
        bdDir: initBdDir,
        turnCooldown: 2.0 + idx * 0.6,
        routeStep: idx,
        laneZ: sp.initZ,
        laneCooldown: 0,
        doorOpen: 0,
        curbWaitTimer: 0,
        hasPassengerInside: hasPassenger,
        cooldownTimer: 0,
        pickupSpawnedForThisApproach: false,
        prevX: sp.initX,
        prevZ: sp.initZ,
        state: sp.initState,
      });
    });
  }

  private getCurbGroundY(z: number, stopId?: string): number {
    // Widened 4-lane road asphalt spans Z = 20.8..37.2 at Y = -0.26; sidewalks sit at Y = 0.0
    if (z >= 21.35 && z <= 36.65) return -0.26;
    if (z < 21.35 && z >= 20.55) {
      return THREE.MathUtils.lerp(0.0, -0.26, (z - 20.55) / 0.8);
    }
    if (z > 36.65 && z <= 37.45) {
      return THREE.MathUtils.lerp(-0.26, 0.0, (z - 36.65) / 0.8);
    }
    // Vietcombank elevated granite forecourt podium steps (Z = 13.6 .. 11.4 climbs from 0.0 to 0.36m)
    if (stopId === 'vietcombank' && z < 13.6) {
      return THREE.MathUtils.clamp(THREE.MathUtils.lerp(0.0, 0.36, (13.6 - z) / 2.2), 0.0, 0.36);
    }
    return 0.0;
  }

  private isStopBusy(stopIdx: number, ignoreTaxiIdx: number): boolean {
    const targetX = XANH_SM_STOPS[stopIdx].bayX;
    const targetSide = XANH_SM_STOPS[stopIdx].side;
    for (let i = 0; i < this.taxis.length; i++) {
      if (i === ignoreTaxiIdx) continue;
      const other = this.taxis[i];
      const busy =
        other.state === 'pulling_in' ||
        other.state === 'at_curb_door_open' ||
        other.state === 'at_curb_door_close' ||
        other.state === 'pulling_out';
      if (
        busy &&
        other.dockSide === targetSide &&
        Math.abs(XANH_SM_STOPS[other.targetStopIdx].bayX - targetX) < 7.0
      ) {
        return true;
      }
      if (
        other.isServiceTaxi &&
        other.targetStopIdx === stopIdx &&
        (other.pickupSpawnedForThisApproach || busy)
      ) {
        return true;
      }
    }
    return false;
  }

  private matchesRouteScope(bayX: number, scope: TaxiRouteScope): boolean {
    switch (scope) {
      case 'central':
        return bayX <= EAST_INTERSECTION_CENTER_X;
      case 'east_mid':
        return bayX > EAST_INTERSECTION_CENTER_X && bayX < FAR_EAST_INTERSECTION_CENTER_X;
      case 'luxury_dior':
        return bayX > FAR_EAST_INTERSECTION_CENTER_X;
      case 'citywide':
        return true;
    }
  }

  private pickNextStopForSide(
    side: 'south' | 'north',
    taxiIdx: number,
    prevStopIdx: number,
    rawHour: number,
    opts?: {
      minBayX?: number;
      maxBayX?: number;
      routeScope?: TaxiRouteScope;
    }
  ): number | null {
    const scope = opts?.routeScope ?? 'central';
    const candidates: number[] = [];
    for (let i = 0; i < XANH_SM_STOPS.length; i++) {
      const s = XANH_SM_STOPS[i];
      if (s.side !== side) continue;
      if (!isStopOpenAtHour(s.id, rawHour)) continue;
      if (!this.matchesRouteScope(s.bayX, scope)) continue;
      if (opts?.minBayX !== undefined && s.bayX < opts.minBayX) continue;
      if (opts?.maxBayX !== undefined && s.bayX > opts.maxBayX) continue;
      candidates.push(i);
    }
    if (candidates.length === 0) return null;

    // Rotate starting search offset per taxi + timer so service spreads across all city stops evenly
    const startOffset = (taxiIdx * 2 + Math.floor(this.timer * 0.25)) % candidates.length;
    for (let k = 0; k < candidates.length; k++) {
      const idx = candidates[(startOffset + k) % candidates.length];
      if (idx !== prevStopIdx && !this.isStopBusy(idx, taxiIdx)) {
        return idx;
      }
    }
    return candidates[startOffset];
  }

  private spawnPickupWaiter(entry: XanhSmTaxiEntry, stop: XanhSmStopSpec) {
    const p = entry.passenger;
    p.stopSpec = stop;
    p.state = 'pickup_exit_venue';
    p.wpIdx = 0;
    p.waitTimer = 0;
    p.x = stop.venueDoorX;
    p.z = stop.venueDoorZ;
    p.y = this.getCurbGroundY(p.z, stop.id);
    p.bagMesh.visible = true;
    p.group.position.set(p.x, p.y, p.z);
    p.group.rotation.y = stop.side === 'south' ? Math.PI : 0;
    p.group.visible = true;
  }

  private spawnDropoffAlighter(entry: XanhSmTaxiEntry, stop: XanhSmStopSpec) {
    const p = entry.passenger;
    p.stopSpec = stop;
    p.state = 'dropoff_exit_car';
    p.wpIdx = 0;
    p.waitTimer = 0;
    if (stop.side === 'south') {
      p.x = stop.bayX + 0.55;
      p.z = 36.55;
      p.group.rotation.y = 0;
    } else {
      p.x = stop.bayX - 0.55;
      p.z = 21.40;
      p.group.rotation.y = Math.PI;
    }
    p.y = this.getCurbGroundY(p.z, stop.id);
    p.bagMesh.visible = entry.targetStopIdx % 2 === 1;
    p.group.position.set(p.x, p.y, p.z);
    p.group.visible = true;
  }

  private animatePassengerWalk(p: XanhSmPassengerActor, delta: number) {
    p.glbHandle.setAnimState('Walk');
    p.walkPhase += delta * p.speed * 4.2;
    const swing = Math.sin(p.walkPhase) * 0.46;
    p.leftLeg.rotation.x = swing;
    p.rightLeg.rotation.x = -swing;
    p.leftArm.rotation.x = -swing * 0.72;
    p.rightArm.rotation.x = p.glbHandle.hasActiveUmbrella() ? -0.88 : p.bagMesh.visible ? -0.16 : swing * 0.65;
    p.hipsGroup.position.y = 0.84 + Math.abs(Math.sin(p.walkPhase * 2)) * 0.024;
    p.headGroup.rotation.y = Math.sin(p.walkPhase * 0.35) * 0.06;
  }

  private settlePassengerIdle(p: XanhSmPassengerActor, delta: number, lookPhase: number) {
    p.glbHandle.setAnimState('Idle');
    p.leftLeg.rotation.x = THREE.MathUtils.damp(p.leftLeg.rotation.x, 0, 10, delta);
    p.rightLeg.rotation.x = THREE.MathUtils.damp(p.rightLeg.rotation.x, 0, 10, delta);
    p.leftArm.rotation.x = THREE.MathUtils.damp(p.leftArm.rotation.x, 0, 10, delta);
    p.rightArm.rotation.x = THREE.MathUtils.damp(p.rightArm.rotation.x, p.bagMesh.visible ? -0.15 : 0, 10, delta);
    p.hipsGroup.position.y = 0.84;
    p.headGroup.rotation.y = Math.sin(lookPhase) * 0.25;
  }

  private stepPassengerToward(p: XanhSmPassengerActor, tx: number, tz: number, delta: number): boolean {
    const dx = tx - p.x;
    const dz = tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.14) {
      p.x = tx;
      p.z = tz;
      p.y = this.getCurbGroundY(p.z, p.stopSpec.id);
      p.group.position.set(p.x, p.y, p.z);
      return true;
    }
    const step = Math.min(dist, p.speed * delta);
    p.x += (dx / dist) * step;
    p.z += (dz / dist) * step;
    p.y = this.getCurbGroundY(p.z, p.stopSpec.id);
    p.group.position.set(p.x, p.y, p.z);
    p.group.rotation.y = Math.atan2(dx, dz);
    this.animatePassengerWalk(p, delta);
    return false;
  }

  private updatePassengerActor(p: XanhSmPassengerActor, delta: number) {
    if (!p.group.visible || p.state === 'hidden') return;
    const stop = p.stopSpec;
    const isSouth = stop.side === 'south';
    const doorOffsetX = isSouth ? 0.55 : -0.55;
    const roadDoorZ = isSouth ? 36.55 : 21.40;
    const sidewalkMidZ = isSouth ? 39.8 : 18.4;

    if (p.state === 'dropoff_exit_car') {
      const reached = this.stepPassengerToward(p, stop.bayX + doorOffsetX, stop.curbHoldZ, delta);
      if (reached) {
        p.state = 'dropoff_walk_venue';
        p.wpIdx = 0;
      }
    } else if (p.state === 'dropoff_walk_venue') {
      const pts: Array<[number, number]> = [
        [stop.approachWalkX, sidewalkMidZ],
        [stop.venueDoorX, isSouth ? Math.min(stop.venueDoorZ, 43.2) : Math.max(stop.venueDoorZ, 18.0)],
        [stop.venueDoorX, stop.venueDoorZ],
      ];
      const pt = pts[p.wpIdx];
      if (!pt) {
        p.state = 'hidden';
        p.group.visible = false;
        return;
      }
      if (this.stepPassengerToward(p, pt[0], pt[1], delta)) {
        p.wpIdx++;
        if (p.wpIdx >= pts.length) {
          p.state = 'hidden';
          p.group.visible = false;
        }
      }
    } else if (p.state === 'pickup_exit_venue') {
      const pts: Array<[number, number]> = [
        [stop.venueDoorX, isSouth ? Math.min(stop.venueDoorZ, 42.8) : Math.max(stop.venueDoorZ, 18.2)],
        [stop.approachWalkX, sidewalkMidZ],
        [stop.bayX + doorOffsetX, stop.curbHoldZ],
      ];
      const pt = pts[p.wpIdx];
      if (!pt) {
        p.state = 'pickup_wait_curb';
        p.waitTimer = 0;
        p.group.rotation.y = isSouth ? Math.PI * 0.72 : -Math.PI * 0.25;
        return;
      }
      if (this.stepPassengerToward(p, pt[0], pt[1], delta)) {
        p.wpIdx++;
        if (p.wpIdx >= pts.length) {
          p.state = 'pickup_wait_curb';
          p.waitTimer = 0;
          p.group.rotation.y = isSouth ? Math.PI * 0.72 : -Math.PI * 0.25;
        }
      }
    } else if (p.state === 'pickup_wait_curb') {
      p.waitTimer += delta;
      this.settlePassengerIdle(p, delta, this.timer * 1.4 + p.phaseOffset);
    } else if (p.state === 'pickup_board_car') {
      const reached = this.stepPassengerToward(p, stop.bayX + doorOffsetX, roadDoorZ, delta);
      if (reached) {
        p.state = 'hidden';
        p.group.visible = false;
      }
    }
  }

  public hasPassengerNearAeonDoor(): boolean {
    for (let i = 0; i < this.taxis.length; i++) {
      const p = this.taxis[i].passenger;
      if (
        p.group.visible &&
        p.stopSpec.isAeonMall &&
        p.x >= 124.2 &&
        p.x <= 131.8 &&
        p.z >= 41.8 &&
        p.z <= 48.8
      ) {
        return true;
      }
    }
    return false;
  }

  public hasPassengerNearLandmark81Door(): boolean {
    for (let i = 0; i < this.taxis.length; i++) {
      const p = this.taxis[i].passenger;
      if (
        p.group.visible &&
        p.stopSpec.id === 'landmark_81' &&
        Math.abs(p.x) <= 3.2 &&
        p.z >= 42.8 &&
        p.z <= 49.0
      ) {
        return true;
      }
    }
    return false;
  }

  public hasPassengerNearStopDoor(stopId: string, radius = 3.8): boolean {
    for (let i = 0; i < this.taxis.length; i++) {
      const p = this.taxis[i].passenger;
      if (
        p.group.visible &&
        p.stopSpec.id === stopId &&
        Math.hypot(p.x - p.stopSpec.venueDoorX, p.z - p.stopSpec.venueDoorZ) <= radius
      ) {
        return true;
      }
    }
    return false;
  }

  public update(
    delta: number,
    rawHour: number,
    lampFactor: number,
    busPose?: { active?: boolean; x: number; z: number } | null
  ) {
    this.timer += delta;
    const blink = Math.floor(this.timer * 3.0) % 2 === 0;
    const westServiceOpen = isTaxiServiceOpenAtHour(rawHour);
    const eastCorridorOpen = hasOpenEastCorridorStopAtHour(rawHour);

    for (let i = 0; i < this.taxis.length; i++) {
      const t = this.taxis[i];
      const rig = t.rig;
      const taxiId = `xanhsm_${i}`;
      let stop = XANH_SM_STOPS[t.targetStopIdx] ?? XANH_SM_STOPS[0];
      let taxiServiceActive = isStopOpenAtHour(stop.id, rawHour);

      // Update passenger actor attached to this taxi
      this.updatePassengerActor(t.passenger, delta);

      // Dismiss any unboarded pickup waiter once their venue closes
      if (
        !taxiServiceActive &&
        t.passenger.group.visible &&
        (t.passenger.state === 'pickup_exit_venue' || t.passenger.state === 'pickup_wait_curb') &&
        t.state !== 'pulling_in' &&
        t.state !== 'at_curb_door_open'
      ) {
        t.passenger.state = 'hidden';
        t.passenger.group.visible = false;
      }

      if (t.turnCooldown > 0) t.turnCooldown -= delta;

      // If current target venue is closed while cruising, switch immediately to an open venue ahead on this side
      if (
        t.isServiceTaxi &&
        !taxiServiceActive &&
        (t.state === 'cruise_east' || t.state === 'cruise_west')
      ) {
        const nextOpenIdx = this.pickNextStopForSide(
          t.state === 'cruise_east' ? 'north' : 'south',
          i,
          t.targetStopIdx,
          rawHour,
          t.state === 'cruise_east'
            ? { minBayX: rig.group.position.x + 16.0, routeScope: t.routeScope }
            : { maxBayX: rig.group.position.x - 16.0, routeScope: t.routeScope }
        );
        if (nextOpenIdx !== null) {
          t.targetStopIdx = nextOpenIdx;
          t.dockSide = XANH_SM_STOPS[nextOpenIdx].side;
          t.pickupSpawnedForThisApproach = false;
          t.hasPassengerInside = t.tripMode === 'dropoff';
          rig.rearPassengerSilhouette.visible = t.hasPassengerInside;
          stop = XANH_SM_STOPS[nextOpenIdx];
          taxiServiceActive = true;
        }
      }

      const routeHasAnyOpenVenues = t.servesEastCorridor ? eastCorridorOpen : westServiceOpen;
      const retireAtNight = t.isServiceTaxi && !routeHasAnyOpenVenues;

      // After closing hours, service taxis finish their full westbound route past Phố Cư Dân Tây before parking off-map (X <= westEndX)
      if (!rig.group.visible) {
        if (!retireAtNight) {
          const spawnClear =
            !this.trafficCoordinator ||
            this.trafficCoordinator.isZoneClear({
              id: taxiId,
              x: CITY_ROAD_BOUNDS.westEndX,
              y: -0.26,
              z: 23.25,
              halfX: 5.5,
              halfZ: 1.5,
            });
          if (spawnClear) {
            t.state = 'cruise_east';
            t.laneZ = 23.25;
            rig.group.position.set(CITY_ROAD_BOUNDS.westEndX, -0.26, 23.25);
            rig.group.rotation.y = Math.PI / 2;
            rig.group.visible = true;
            t.speed = t.baseSpeed;
            t.pickupSpawnedForThisApproach = false;
            if (t.isServiceTaxi) {
              const freshNorth = this.pickNextStopForSide('north', i, t.targetStopIdx, rawHour, {
                routeScope: t.routeScope,
              });
              if (freshNorth !== null) {
                t.targetStopIdx = freshNorth;
                t.dockSide = 'north';
                t.hasPassengerInside = t.tripMode === 'dropoff';
                stop = XANH_SM_STOPS[freshNorth];
                taxiServiceActive = true;
              } else {
                t.hasPassengerInside = false;
              }
              rig.rearPassengerSilhouette.visible = t.hasPassengerInside;
            }
          } else {
            this.trafficCoordinator?.deactivateVehicle(taxiId);
            continue;
          }
        } else {
          this.trafficCoordinator?.deactivateVehicle(taxiId);
          continue;
        }
      }
      if (retireAtNight && t.state === 'cruise_west' && rig.group.position.x <= CITY_ROAD_BOUNDS.westEndX) {
        rig.group.visible = false;
        t.hasPassengerInside = false;
        rig.rearPassengerSilhouette.visible = false;
        this.trafficCoordinator?.deactivateVehicle(taxiId);
        continue;
      }
      rig.group.visible = true;

      let isBraking = false;
      let hazardLeft = false;
      let hazardRight = false;

      if (t.laneCooldown > 0) t.laneCooldown -= delta;

      if (t.state === 'cruise_east') {
        if (t.cooldownTimer > 0) t.cooldownTimer -= delta;

        // If approaching a North-side pickup bay during service hours (07:00 - 22:00), dispatch pickup customer out
        if (
          t.isServiceTaxi &&
          taxiServiceActive &&
          t.cooldownTimer <= 0 &&
          t.dockSide === 'north' &&
          stop.side === 'north' &&
          t.tripMode === 'pickup' &&
          !t.pickupSpawnedForThisApproach &&
          rig.group.position.x >= stop.bayX - 24.0 &&
          rig.group.position.x <= stop.bayX - 10.0 &&
          !this.isStopBusy(t.targetStopIdx, i)
        ) {
          t.pickupSpawnedForThisApproach = true;
          this.spawnPickupWaiter(t, stop);
        }

        // Check if ready to pull into North-side bay (Eastbound lane -> Curb bay Z=22.45)
        let shouldPullIn = false;
        if (
          t.isServiceTaxi &&
          taxiServiceActive &&
          t.cooldownTimer <= 0 &&
          t.dockSide === 'north' &&
          stop.side === 'north' &&
          rig.group.position.x >= stop.bayX - 11.8 &&
          rig.group.position.x <= stop.bayX - 8.5 &&
          !this.isStopBusy(t.targetStopIdx, i) &&
          (!this.trafficCoordinator ||
            this.trafficCoordinator.isZoneClear({
              id: taxiId,
              x: stop.bayX - 4.0,
              y: -0.26,
              z: 22.8,
              halfX: 5.2,
              halfZ: 1.5,
            }))
        ) {
          shouldPullIn = true;
        }

        if (shouldPullIn) {
          t.startX = rig.group.position.x;
          t.startZ = rig.group.position.z;
          t.turnProgress = 0;
          t.state = 'pulling_in';
        } else {
          // 2-Lane Eastbound cruising (26.90 inner / 23.25 outer) with smooth lane-changing overtaking
          let speedFactor = 1;
          const approachingNorthStop =
            t.isServiceTaxi &&
            taxiServiceActive &&
            t.cooldownTimer <= 0 &&
            t.dockSide === 'north' &&
            stop.side === 'north' &&
            stop.bayX - rig.group.position.x > 7.0 &&
            stop.bayX - rig.group.position.x < 42.0;

          if (this.trafficCoordinator) {
            const pick = this.trafficCoordinator.pickBestCruiseLane({
              id: taxiId,
              x: rig.group.position.x,
              y: -0.26,
              currentZ: rig.group.position.z,
              laneZ: t.laneZ,
              moveDirX: 1,
              lanes: [26.90, 23.25],
              halfW: rig.halfW,
              halfL: rig.halfL,
              lookahead: 11.5,
              minGap: 2.0,
              priority: 20,
              allowSwitch:
                t.laneCooldown <= 0 &&
                rig.group.position.x > -205.0 &&
                rig.group.position.x < 535.0 &&
                Math.abs(rig.group.position.x - EAST_INTERSECTION_CENTER_X) > 15.0 &&
                Math.abs(rig.group.position.x - FAR_EAST_INTERSECTION_CENTER_X) > 16.0 &&
                Math.abs(rig.group.position.x - DIOR_INTERSECTION_CENTER_X) > 16.0,
              preferLane: approachingNorthStop ? 23.25 : undefined,
            });
            if (pick.switched) {
              t.laneZ = pick.targetZ;
              t.laneCooldown = 1.8;
            }
            speedFactor = pick.clearance.maxSpeedFactor;
          } else {
            for (let j = 0; j < this.taxis.length; j++) {
              if (j === i || !this.taxis[j].rig.group.visible) continue;
              const other = this.taxis[j];
              if (
                Math.abs(other.rig.group.position.z - rig.group.position.z) < 1.8 &&
                other.rig.group.position.x > rig.group.position.x &&
                other.rig.group.position.x - rig.group.position.x < 9.5
              ) {
                speedFactor = 0;
                break;
              }
            }
          }

          const sigFactor = computeBoulevardSignalFactor({
            x: rig.group.position.x,
            halfL: rig.halfL,
            moveDirX: 1,
            getWestSignal: this.getWestSignal,
            getEastSignal: this.getEastSignal,
            getFarEastSignal: this.getFarEastSignal,
            getDiorSignal: this.getDiorSignal,
            coordinator: this.trafficCoordinator,
            vehicleId: taxiId,
          });
          speedFactor = Math.min(speedFactor, sigFactor);

          // Citywide & Luxury taxis periodically branch onto Sơn Tây / Ngã Tư DIOR -> Đường Bạch Đằng waterfront!
          const curX = rig.group.position.x;
          if (
            t.turnCooldown <= 0 &&
            t.cooldownTimer <= 0 &&
            (t.routeScope === 'citywide' || (!t.hasPassengerInside && t.routeScope === 'luxury_dior'))
          ) {
            let turnCx: number | null = null;
            let turnDirZ: 1 | -1 = -1;
            if (curX >= 490.0 && curX <= 496.0 && t.routeStep % 2 === 0) {
              turnCx = DIOR_INTERSECTION_CENTER_X;
              turnDirZ = t.routeStep % 4 === 0 ? -1 : 1;
            } else if (curX >= 357.0 && curX <= 363.0 && t.routeStep % 3 === 1) {
              turnCx = FAR_EAST_INTERSECTION_CENTER_X;
              turnDirZ = -1;
            } else if (
              t.routeScope === 'citywide' &&
              curX >= WEST_INTERSECTION_CENTER_X - 13.0 &&
              curX <= WEST_INTERSECTION_CENTER_X - 7.0 &&
              t.routeStep % 2 === 0
            ) {
              turnCx = WEST_INTERSECTION_CENTER_X;
              turnDirZ = -1;
            }
            if (turnCx !== null) {
              const sGet = this.getSignalForCenterX(turnCx);
              const ewGreen = !sGet || sGet().ewPhase === 'green';
              const endX = this.getNsLaneX(turnCx, turnDirZ);
              const endZ = turnDirZ > 0 ? 41.5 : 16.5;
              const clear =
                !this.trafficCoordinator ||
                this.trafficCoordinator.isZoneClear({
                  id: taxiId,
                  x: endX,
                  y: -0.26,
                  z: turnDirZ > 0 ? 45.0 : 13.0,
                  halfX: rig.halfW + 1.4,
                  halfZ: rig.halfL + 4.0,
                });
              if (ewGreen && clear) {
                t.routeStep++;
                t.nsCenterX = turnCx;
                t.nsDir = turnDirZ;
                this.beginCurveTurn(t, endX, rig.group.position.z, endX, endZ, turnDirZ > 0 ? 0 : Math.PI, 'cruise_ns');
              }
            }
          }

          if (t.state === 'cruise_east') {
            // Central taxis U-turn before East Intersection; East-Mid cruise past Sơn Tây (392.0); Luxury/Citywide cruise past Ngã Tư DIOR (544.0)!
            const uTurnTriggerX =
              t.routeScope === 'central'
                ? 186.5
                : t.routeScope === 'east_mid'
                  ? 392.0
                  : 544.0;

            let holdEastUTurn = false;
            if (rig.group.position.x >= uTurnTriggerX) {
              const canTurn =
                t.routeScope !== 'central'
                  ? !this.trafficCoordinator ||
                    this.trafficCoordinator.isZoneClear({
                      id: taxiId,
                      x: rig.group.position.x + 2.8,
                      y: -0.26,
                      z: 33.8,
                      halfX: 8.5,
                      halfZ: 3.4,
                    })
                  : !this.trafficCoordinator ||
                    this.trafficCoordinator.canStartIntersectionUTurn({
                      id: taxiId,
                      centerX: EAST_INTERSECTION_CENTER_X,
                      fromDirX: 1,
                      getSignal: this.getEastSignal,
                    });
              if (canTurn) {
                t.routeStep++;
                t.startX = rig.group.position.x;
                t.startZ = rig.group.position.z;
                t.turnProgress = 0;
                t.state = 'u_turn_east';
              } else {
                holdEastUTurn = true;
                speedFactor = 0;
              }
            }

            if (speedFactor < 0.75) {
              isBraking = true;
            }
            const targetSpd = t.baseSpeed * speedFactor;
            t.speed = THREE.MathUtils.lerp(t.speed, targetSpd, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 3.2)));

            rig.group.position.x += t.speed * delta;
            if (holdEastUTurn && rig.group.position.x > uTurnTriggerX + 1.0) {
              rig.group.position.x = uTurnTriggerX + 1.0;
            }
            const prevZPos = rig.group.position.z;
            rig.group.position.z = THREE.MathUtils.lerp(prevZPos, t.laneZ, Math.min(1, delta * (t.speed > 0.8 ? 3.2 : 0.4)));
            rig.group.position.y = -0.26;
            const latVel = (rig.group.position.z - prevZPos) / Math.max(0.001, delta);
            rig.group.rotation.y = Math.atan2(Math.max(1.5, t.speed), latVel);
          }
        }
      } else if (t.state === 'u_turn_east') {
        const nextWestLaneZ = i % 2 === 0 ? 34.75 : 31.10;
        const angNow = t.turnProgress * Math.PI;
        const dirX = Math.cos(angNow);
        const dirZ = Math.sin(angNow);
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: dirX,
          moveDirZ: dirZ,
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 7.5,
          minGap: 1.8,
          priority: 18,
        });
        const factor = clr ? clr.maxSpeedFactor : 1;
        isBraking = factor < 0.7;
        t.speed = 5.4 * factor;
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.50 * factor);
        const ang = t.turnProgress * Math.PI;
        const blendZ = 0.5 - 0.5 * Math.cos(ang);
        const uTurnForwardRadius = t.startX > 335.0 ? 4.6 : 6.0;
        rig.group.position.x = t.startX + Math.sin(ang) * uTurnForwardRadius;
        rig.group.position.z = THREE.MathUtils.lerp(t.startZ, nextWestLaneZ, blendZ);
        rig.group.position.y = -0.26;
        rig.group.rotation.y = Math.PI / 2 - ang;

        if (t.turnProgress >= 1) {
          t.laneZ = nextWestLaneZ;
          rig.group.position.set(t.startX, -0.26, t.laneZ);
          rig.group.rotation.y = -Math.PI / 2;
          t.pickupSpawnedForThisApproach = false;
          if (t.isServiceTaxi) {
            const nextSouth = this.pickNextStopForSide('south', i, t.targetStopIdx, rawHour, {
              maxBayX: t.startX - 12.0,
              routeScope: t.routeScope,
            });
            if (nextSouth !== null) {
              t.targetStopIdx = nextSouth;
              t.dockSide = 'south';
              t.tripMode = t.tripMode === 'dropoff' ? 'pickup' : 'dropoff';
              t.hasPassengerInside = t.tripMode === 'dropoff';
            } else {
              t.hasPassengerInside = false;
            }
            rig.rearPassengerSilhouette.visible = t.hasPassengerInside;
          }
          t.state = 'cruise_west';
        }
      } else if (t.state === 'cruise_west') {
        if (t.cooldownTimer > 0) t.cooldownTimer -= delta;

        // If heading in for a South-side pick-up during service hours, dispatch customer from venue
        if (
          t.isServiceTaxi &&
          taxiServiceActive &&
          t.cooldownTimer <= 0 &&
          t.dockSide === 'south' &&
          stop.side === 'south' &&
          t.tripMode === 'pickup' &&
          !t.pickupSpawnedForThisApproach &&
          rig.group.position.x <= stop.bayX + 24.0 &&
          rig.group.position.x >= stop.bayX + 10.0 &&
          !this.isStopBusy(t.targetStopIdx, i)
        ) {
          t.pickupSpawnedForThisApproach = true;
          this.spawnPickupWaiter(t, stop);
        }

        // Check if ready to pull into South-side bay (Westbound lane -> Curb bay Z=35.50)
        let shouldPullIn = false;
        if (
          t.isServiceTaxi &&
          taxiServiceActive &&
          t.cooldownTimer <= 0 &&
          t.dockSide === 'south' &&
          stop.side === 'south' &&
          rig.group.position.x <= stop.bayX + 11.8 &&
          rig.group.position.x >= stop.bayX + 8.5 &&
          !this.isStopBusy(t.targetStopIdx, i) &&
          (!this.trafficCoordinator ||
            this.trafficCoordinator.isZoneClear({
              id: taxiId,
              x: stop.bayX + 4.0,
              y: -0.26,
              z: 35.1,
              halfX: 5.2,
              halfZ: 1.5,
            }))
        ) {
          shouldPullIn = true;
        }

        if (shouldPullIn) {
          t.startX = rig.group.position.x;
          t.startZ = rig.group.position.z;
          t.turnProgress = 0;
          t.state = 'pulling_in';
        } else {
          // 2-Lane Westbound cruising (31.10 inner / 34.75 outer) with smooth overtaking
          let speedFactor = 1;
          const approachingSouthStop =
            t.isServiceTaxi &&
            taxiServiceActive &&
            t.cooldownTimer <= 0 &&
            t.dockSide === 'south' &&
            stop.side === 'south' &&
            rig.group.position.x - stop.bayX > 7.0 &&
            rig.group.position.x - stop.bayX < 42.0;

          if (this.trafficCoordinator) {
            const pick = this.trafficCoordinator.pickBestCruiseLane({
              id: taxiId,
              x: rig.group.position.x,
              y: -0.26,
              currentZ: rig.group.position.z,
              laneZ: t.laneZ,
              moveDirX: -1,
              lanes: [31.10, 34.75],
              halfW: rig.halfW,
              halfL: rig.halfL,
              lookahead: 12.0,
              minGap: 2.0,
              priority: 20,
              allowSwitch:
                t.laneCooldown <= 0 &&
                rig.group.position.x > -205.0 &&
                rig.group.position.x < 535.0 &&
                Math.abs(rig.group.position.x - EAST_INTERSECTION_CENTER_X) > 15.0 &&
                Math.abs(rig.group.position.x - FAR_EAST_INTERSECTION_CENTER_X) > 16.0 &&
                Math.abs(rig.group.position.x - DIOR_INTERSECTION_CENTER_X) > 16.0,
              preferLane: approachingSouthStop ? 34.75 : undefined,
            });
            if (pick.switched) {
              t.laneZ = pick.targetZ;
              t.laneCooldown = 1.8;
            }
            speedFactor = pick.clearance.maxSpeedFactor;
          } else {
            const busOnWest = Boolean(
              busPose && busPose.active !== false && busPose.z > 29.0 && busPose.z < 36.2
            );
            const distToBus = busOnWest ? rig.group.position.x - busPose!.x : 999;
            const yieldBus = busOnWest && distToBus > 0 && distToBus < 14.5;
            if (yieldBus) speedFactor = 0;
            for (let j = 0; j < this.taxis.length && speedFactor > 0; j++) {
              if (j === i || !this.taxis[j].rig.group.visible) continue;
              const other = this.taxis[j];
              if (
                Math.abs(other.rig.group.position.z - rig.group.position.z) < 1.9 &&
                other.rig.group.position.x < rig.group.position.x &&
                rig.group.position.x - other.rig.group.position.x < 9.5
              ) {
                speedFactor = 0;
                break;
              }
            }
          }

          const sigFactor = computeBoulevardSignalFactor({
            x: rig.group.position.x,
            halfL: rig.halfL,
            moveDirX: -1,
            getWestSignal: this.getWestSignal,
            getEastSignal: this.getEastSignal,
            getFarEastSignal: this.getFarEastSignal,
            getDiorSignal: this.getDiorSignal,
            coordinator: this.trafficCoordinator,
            vehicleId: taxiId,
          });
          speedFactor = Math.min(speedFactor, sigFactor);

          // Citywide & Luxury Westbound taxis can turn onto Sơn Tây or Ngã Tư DIOR to serve N-S avenues & Bạch Đằng!
          const curX = rig.group.position.x;
          if (
            t.turnCooldown <= 0 &&
            t.cooldownTimer <= 0 &&
            !retireAtNight &&
            (t.routeScope === 'citywide' || (!t.hasPassengerInside && t.routeScope === 'luxury_dior'))
          ) {
            let turnCx: number | null = null;
            let turnDirZ: 1 | -1 = -1;
            if (curX <= 516.0 && curX >= 510.0 && t.routeStep % 3 === 0) {
              turnCx = DIOR_INTERSECTION_CENTER_X;
              turnDirZ = -1;
            } else if (curX <= 383.0 && curX >= 377.0 && t.routeStep % 3 === 2) {
              turnCx = FAR_EAST_INTERSECTION_CENTER_X;
              turnDirZ = t.routeStep % 2 === 0 ? -1 : 1;
            } else if (
              t.routeScope === 'citywide' &&
              curX <= WEST_INTERSECTION_CENTER_X + 13.0 &&
              curX >= WEST_INTERSECTION_CENTER_X + 7.0 &&
              t.routeStep % 2 === 1
            ) {
              turnCx = WEST_INTERSECTION_CENTER_X;
              turnDirZ = -1;
            }
            if (turnCx !== null) {
              const sGet = this.getSignalForCenterX(turnCx);
              const ewGreen = !sGet || sGet().ewPhase === 'green';
              const endX = this.getNsLaneX(turnCx, turnDirZ);
              const endZ = turnDirZ > 0 ? 41.5 : 16.5;
              const clear =
                !this.trafficCoordinator ||
                this.trafficCoordinator.isZoneClear({
                  id: taxiId,
                  x: endX,
                  y: -0.26,
                  z: turnDirZ > 0 ? 45.0 : 13.0,
                  halfX: rig.halfW + 1.4,
                  halfZ: rig.halfL + 4.0,
                });
              if (ewGreen && clear) {
                t.routeStep++;
                t.nsCenterX = turnCx;
                t.nsDir = turnDirZ;
                this.beginCurveTurn(t, endX, rig.group.position.z, endX, endZ, turnDirZ > 0 ? 0 : Math.PI, 'cruise_ns');
              }
            }
          }

          if (t.state === 'cruise_west') {
            // Luxury & East-Mid taxis U-turn West of their zones; Central U-turns at West Intersection (-220.5); Citywide serves Hospital, High School & full Phố Cư Dân Tây all the way to -946.0!
            const westUTurnX =
              t.routeScope === 'luxury_dior'
                ? 374.0
                : t.routeScope === 'east_mid'
                  ? 198.5
                  : t.routeScope === 'citywide'
                    ? -946.0
                    : -220.5;
            const uTurnCenterX =
              t.routeScope === 'luxury_dior'
                ? FAR_EAST_INTERSECTION_CENTER_X
                : t.routeScope === 'east_mid'
                  ? EAST_INTERSECTION_CENTER_X
                  : WEST_INTERSECTION_CENTER_X;
            const uTurnSignal = this.getSignalForCenterX(uTurnCenterX);

            let holdWestUTurn = false;
            if (!retireAtNight && rig.group.position.x <= westUTurnX) {
              const canTurn =
                t.routeScope === 'citywide'
                  ? !this.trafficCoordinator ||
                    this.trafficCoordinator.isZoneClear({
                      id: taxiId,
                      x: rig.group.position.x - 2.8,
                      y: -0.26,
                      z: 24.2,
                      halfX: 8.5,
                      halfZ: 3.4,
                    })
                  : !this.trafficCoordinator ||
                    this.trafficCoordinator.canStartIntersectionUTurn({
                      id: taxiId,
                      centerX: uTurnCenterX,
                      fromDirX: -1,
                      getSignal: uTurnSignal,
                    });
              if (canTurn) {
                t.routeStep++;
                t.startX = rig.group.position.x;
                t.startZ = rig.group.position.z;
                t.turnProgress = 0;
                t.state = 'u_turn_west';
              } else {
                holdWestUTurn = true;
                speedFactor = 0;
              }
            }

            if (speedFactor < 0.75) {
              isBraking = true;
            }
            const targetSpd = t.baseSpeed * speedFactor;
            t.speed = THREE.MathUtils.lerp(t.speed, targetSpd, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 3.2)));

            rig.group.position.x -= t.speed * delta;
            if (holdWestUTurn && rig.group.position.x < westUTurnX - 1.0) {
              rig.group.position.x = westUTurnX - 1.0;
            }
            const prevZPos = rig.group.position.z;
            rig.group.position.z = THREE.MathUtils.lerp(prevZPos, t.laneZ, Math.min(1, delta * (t.speed > 0.8 ? 3.2 : 0.4)));
            rig.group.position.y = -0.26;
            const latVel = (rig.group.position.z - prevZPos) / Math.max(0.001, delta);
            rig.group.rotation.y = Math.atan2(-Math.max(1.5, t.speed), latVel);
          }
        }
      } else if (t.state === 'u_turn_west') {
        const nextEastLaneZ = i % 2 === 0 ? 26.90 : 23.25;
        const angNow = t.turnProgress * Math.PI;
        const dirX = -Math.cos(angNow);
        const dirZ = -Math.sin(angNow);
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: dirX,
          moveDirZ: dirZ,
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 7.5,
          minGap: 1.8,
          priority: 18,
        });
        const factor = clr ? clr.maxSpeedFactor : 1;
        isBraking = factor < 0.7;
        t.speed = 5.4 * factor;
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.50 * factor);
        const ang = t.turnProgress * Math.PI;
        const blendZ = 0.5 - 0.5 * Math.cos(ang);
        rig.group.position.x = t.startX - Math.sin(ang) * 6.0;
        rig.group.position.z = THREE.MathUtils.lerp(t.startZ, nextEastLaneZ, blendZ);
        rig.group.position.y = -0.26;
        rig.group.rotation.y = -Math.PI / 2 - ang;

        if (t.turnProgress >= 1) {
          t.laneZ = nextEastLaneZ;
          rig.group.position.set(t.startX, -0.26, t.laneZ);
          rig.group.rotation.y = Math.PI / 2;
          t.pickupSpawnedForThisApproach = false;
          if (t.isServiceTaxi) {
            const nextNorth = this.pickNextStopForSide('north', i, t.targetStopIdx, rawHour, {
              minBayX: t.startX + 10.0,
              routeScope: t.routeScope,
            });
            if (nextNorth !== null) {
              t.targetStopIdx = nextNorth;
              t.dockSide = 'north';
              t.tripMode = t.tripMode === 'dropoff' ? 'pickup' : 'dropoff';
              t.hasPassengerInside = t.tripMode === 'dropoff';
            } else {
              t.hasPassengerInside = false;
            }
            rig.rearPassengerSilhouette.visible = t.hasPassengerInside;
          }
          t.state = 'cruise_east';
        }
      } else if (t.state === 'cruise_ns') {
        const dirZ = t.nsDir;
        const laneX = this.getNsLaneX(t.nsCenterX, dirZ);
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: 0,
          moveDirZ: dirZ,
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 13.0,
          minGap: 2.6,
          priority: 20,
        });
        const sigFactor = computeNorthSouthSignalFactor({
          z: rig.group.position.z,
          halfL: rig.halfL,
          moveDirZ: dirZ,
          centerX: t.nsCenterX,
          getSignal: this.getSignalForCenterX(t.nsCenterX),
          coordinator: this.trafficCoordinator,
          vehicleId: taxiId,
        });
        const speedFactor = Math.min(clr ? (clr.blocked ? 0 : clr.maxSpeedFactor) : 1, sigFactor);
        isBraking = speedFactor < 0.75;
        t.speed = THREE.MathUtils.lerp(t.speed, t.baseSpeed * speedFactor, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 3.2)));

        const curZ = rig.group.position.z;
        const atNorthStop = dirZ > 0 && curZ >= 10.5 && curZ <= 15.5;
        const atSouthStop = dirZ < 0 && curZ >= 41.5 && curZ <= 46.5;
        if (t.turnCooldown <= 0 && (atNorthStop || atSouthStop) && (t.nsCenterX < 0 || t.routeStep % 2 === 0)) {
          const sGet = this.getSignalForCenterX(t.nsCenterX);
          const nsGreen = !sGet || (sGet().nsPhase ?? 'green') === 'green';
          // Coming South off Đại Lộ Bệnh Viện: route 75% West into Phố Cư Dân Tây, 25% East into Central
          const turnEast = t.nsCenterX < 0 ? t.routeStep % 4 === 0 : t.nsCenterX < 400;
          const nextState: TaxiVehicleState = turnEast ? 'cruise_east' : 'cruise_west';
          const nextLaneZ = turnEast ? (i % 2 === 0 ? 26.90 : 23.25) : (i % 2 === 0 ? 34.75 : 31.10);
          const endX = turnEast ? t.nsCenterX + 12.5 : t.nsCenterX - 12.5;
          const clear =
            !this.trafficCoordinator ||
            this.trafficCoordinator.isZoneClear({
              id: taxiId,
              x: endX + (turnEast ? 3.5 : -3.5),
              y: -0.26,
              z: nextLaneZ,
              halfX: rig.halfL + 4.0,
              halfZ: rig.halfW + 1.4,
            });
          if (nsGreen && clear) {
            t.routeStep++;
            this.beginCurveTurn(
              t,
              rig.group.position.x,
              nextLaneZ,
              endX,
              nextLaneZ,
              turnEast ? Math.PI / 2 : -Math.PI / 2,
              nextState,
              nextLaneZ
            );
          }
        }

        if (t.state === 'cruise_ns') {
          const isWestAve = Math.abs(t.nsCenterX - WEST_INTERSECTION_CENTER_X) < 5;
          const isFarEastAve = Math.abs(t.nsCenterX - FAR_EAST_INTERSECTION_CENTER_X) < 5;
          const isDiorAve = Math.abs(t.nsCenterX - DIOR_INTERSECTION_CENTER_X) < 5;
          const northLimit = isWestAve
            ? CITY_ROAD_BOUNDS.westNorthEndZ
            : isFarEastAve
              ? CITY_ROAD_BOUNDS.farEastNorthEndZ
              : CITY_ROAD_BOUNDS.diorNorthEndZ;
          const southLimit = isWestAve
            ? CITY_ROAD_BOUNDS.westSouthEndZ - 8.0
            : isFarEastAve
              ? CITY_ROAD_BOUNDS.farEastSouthEndZ - 8.0
              : CITY_ROAD_BOUNDS.diorSouthEndZ - 8.0;

          if ((isWestAve || isFarEastAve || isDiorAve) && dirZ < 0 && curZ <= -104.5) {
            const bdDir: 1 | -1 = isWestAve ? 1 : isDiorAve ? -1 : 1;
            t.bdDir = bdDir;
            t.routeStep++;
            const endZ = bdDir > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
            const endX = t.nsCenterX + bdDir * 13.5;
            this.beginCurveTurn(t, rig.group.position.x, endZ, endX, endZ, bdDir > 0 ? Math.PI / 2 : -Math.PI / 2, 'cruise_bd', endZ);
          } else if ((dirZ < 0 && curZ <= northLimit) || (dirZ > 0 && curZ >= southLimit)) {
            t.state = 'u_turn_ns';
            t.turnProgress = 0;
            t.startX = rig.group.position.x;
            t.startZ = curZ;
          } else {
            rig.group.position.z += dirZ * t.speed * delta;
            rig.group.position.x = THREE.MathUtils.lerp(rig.group.position.x, laneX, Math.min(1, delta * 3.8));
            rig.group.position.y = -0.26;
            rig.group.rotation.y = dirZ > 0 ? 0 : Math.PI;
          }
        }
      } else if (t.state === 'u_turn_ns') {
        const nextDir: 1 | -1 = t.nsDir > 0 ? -1 : 1;
        const targetX = this.getNsLaneX(t.nsCenterX, nextDir);
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.55);
        const p = t.turnProgress;
        const prevXPos = rig.group.position.x;
        const prevZPos = rig.group.position.z;
        rig.group.position.x = THREE.MathUtils.lerp(t.startX, targetX, 0.5 - 0.5 * Math.cos(p * Math.PI));
        rig.group.position.z = t.startZ + t.nsDir * Math.sin(p * Math.PI) * 5.0;
        rig.group.position.y = -0.26;
        const dx = rig.group.position.x - prevXPos;
        const dz = rig.group.position.z - prevZPos;
        t.speed = Math.hypot(dx, dz) / Math.max(delta, 0.001);
        if (Math.hypot(dx, dz) > 0.002) rig.group.rotation.y = Math.atan2(dx, dz);
        if (p >= 1) {
          t.nsDir = nextDir;
          t.state = 'cruise_ns';
          rig.group.position.x = targetX;
          rig.group.rotation.y = nextDir > 0 ? 0 : Math.PI;
          t.turnCooldown = 2.0;
        }
      } else if (t.state === 'cruise_bd') {
        const dirX = t.bdDir;
        const targetZ = dirX > 0 ? CITY_ROAD_BOUNDS.bachDangEBZ : CITY_ROAD_BOUNDS.bachDangWBZ;
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: dirX,
          moveDirZ: 0,
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 13.0,
          minGap: 2.6,
          priority: 20,
        });
        const factor = clr ? (clr.blocked ? 0 : clr.maxSpeedFactor) : 1;
        isBraking = factor < 0.7;
        t.speed = THREE.MathUtils.lerp(t.speed, t.baseSpeed * factor, Math.min(1, delta * (factor === 0 ? 6.5 : 3.2)));

        const curX = rig.group.position.x;
        const atSonTayT = (dirX > 0 && curX >= 354.5 && curX <= 360.5) || (dirX < 0 && curX <= 385.5 && curX >= 379.5);
        const atDiorT = (dirX > 0 && curX >= 487.5 && curX <= 493.5) || (dirX < 0 && curX <= 518.5 && curX >= 512.5);
        if (t.turnCooldown <= 0 && (atDiorT || atSonTayT)) {
          if (t.routeStep % 2 === 1) {
            const turnCenter = atDiorT ? DIOR_INTERSECTION_CENTER_X : FAR_EAST_INTERSECTION_CENTER_X;
            t.nsCenterX = turnCenter;
            t.nsDir = 1;
            t.routeStep++;
            const endX = this.getNsLaneX(turnCenter, 1);
            this.beginCurveTurn(t, endX, rig.group.position.z, endX, -105.0, 0, 'cruise_ns');
          } else {
            // Continue straight along Đường Bạch Đằng to serve Công Viên Trung Tâm, Starbucks, Adidas & Cầu Sông Hàn!
            t.routeStep++;
            t.turnCooldown = 2.6;
          }
        } else if (dirX < 0 && curX <= -212.5) {
          // Turn South down Đại Lộ Bệnh Viện to feed Phố Cư Dân Tây & Bệnh Viện Đa Khoa!
          t.nsCenterX = WEST_INTERSECTION_CENTER_X;
          t.nsDir = 1;
          t.routeStep++;
          const endX = this.getNsLaneX(WEST_INTERSECTION_CENTER_X, 1);
          this.beginCurveTurn(t, endX, rig.group.position.z, endX, -104.0, 0, 'cruise_ns');
        } else if (dirX > 0 && curX >= CITY_ROAD_BOUNDS.bachDangEastEndX - 6.0) {
          t.state = 'u_turn_bd';
          t.turnProgress = 0;
          t.startX = curX;
          t.startZ = rig.group.position.z;
          t.laneZ = dirX > 0 ? CITY_ROAD_BOUNDS.bachDangWBZ : CITY_ROAD_BOUNDS.bachDangEBZ;
        } else {
          rig.group.position.x += dirX * t.speed * delta;
          rig.group.position.z = THREE.MathUtils.lerp(rig.group.position.z, targetZ, Math.min(1, delta * 3.8));
          rig.group.position.y = -0.26;
          rig.group.rotation.y = dirX > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      } else if (t.state === 'u_turn_bd') {
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.55);
        const p = t.turnProgress;
        const prevXPos = rig.group.position.x;
        const prevZPos = rig.group.position.z;
        rig.group.position.x = t.startX + t.bdDir * Math.sin(p * Math.PI) * 5.0;
        rig.group.position.z = THREE.MathUtils.lerp(t.startZ, t.laneZ, 0.5 - 0.5 * Math.cos(p * Math.PI));
        rig.group.position.y = -0.26;
        const dx = rig.group.position.x - prevXPos;
        const dz = rig.group.position.z - prevZPos;
        t.speed = Math.hypot(dx, dz) / Math.max(delta, 0.001);
        if (Math.hypot(dx, dz) > 0.002) rig.group.rotation.y = Math.atan2(dx, dz);
        if (p >= 1) {
          t.bdDir = t.bdDir > 0 ? -1 : 1;
          t.state = 'cruise_bd';
          rig.group.rotation.y = t.bdDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          t.turnCooldown = 2.0;
        }
      } else if (t.state === 'turn_curve') {
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: Math.sin(rig.group.rotation.y),
          moveDirZ: Math.cos(rig.group.rotation.y),
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 7.5,
          minGap: 1.8,
          priority: 26,
        });
        const factor = clr ? (clr.blocked ? 0 : Math.max(0.35, clr.maxSpeedFactor)) : 1;
        isBraking = factor < 0.65;
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.72 * factor);
        const p = t.turnProgress;
        const inv = 1 - p;
        const prevXPos = rig.group.position.x;
        const prevZPos = rig.group.position.z;
        rig.group.position.x = inv * inv * t.startX + 2 * inv * p * t.turnCtrlX + p * p * t.turnEndX;
        rig.group.position.z = inv * inv * t.startZ + 2 * inv * p * t.turnCtrlZ + p * p * t.turnEndZ;
        rig.group.position.y = -0.26;
        const dx = rig.group.position.x - prevXPos;
        const dz = rig.group.position.z - prevZPos;
        t.speed = Math.hypot(dx, dz) / Math.max(delta, 0.001);
        if (Math.hypot(dx, dz) > 0.002) {
          rig.group.rotation.y = Math.atan2(dx, dz);
        }
        if (p >= 1) {
          rig.group.position.set(t.turnEndX, -0.26, t.turnEndZ);
          rig.group.rotation.y = t.turnEndYaw;
          t.state = t.turnNextState;
        }
      } else if (t.state === 'pulling_in') {
        const isSouth = stop.side === 'south';
        const dockZ = isSouth ? 35.65 : 22.30;

        hazardRight = true;
        const fwdX = Math.sin(rig.group.rotation.y);
        const fwdZ = Math.cos(rig.group.rotation.y);
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 6.0,
          minGap: 1.5,
          latMargin: 0.20,
          priority: t.turnProgress > 0.08 ? 36 : 18,
        });
        const factor = clr ? (t.turnProgress > 0.08 ? Math.max(0.4, clr.maxSpeedFactor) : clr.maxSpeedFactor) : 1;
        isBraking = t.turnProgress > 0.55 || factor < 0.7;
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.48 * factor);
        const s = t.turnProgress * t.turnProgress * (3 - 2 * t.turnProgress);
        const nextX = THREE.MathUtils.lerp(t.startX, stop.bayX, s);
        const nextZ = THREE.MathUtils.lerp(t.startZ, dockZ, s);
        const dx = nextX - rig.group.position.x;
        const dz = nextZ - rig.group.position.z;
        t.speed = Math.hypot(dx, dz) / Math.max(0.001, delta);
        rig.group.position.set(nextX, -0.26, nextZ);
        if (Math.hypot(dx, dz) > 0.001) {
          rig.group.rotation.y = Math.atan2(dx, dz);
        }

        if (t.turnProgress >= 1) {
          rig.group.position.set(stop.bayX, -0.26, dockZ);
          rig.group.rotation.y = isSouth ? -Math.PI / 2 : Math.PI / 2;
          t.speed = 0;
          t.curbWaitTimer = 0;
          t.state = 'at_curb_door_open';

          if (t.tripMode === 'dropoff') {
            t.hasPassengerInside = false;
            rig.rearPassengerSilhouette.visible = false;
            this.spawnDropoffAlighter(t, stop);
          } else if (t.passenger.state === 'hidden') {
            const p = t.passenger;
            p.stopSpec = stop;
            p.x = stop.bayX + (isSouth ? 0.55 : -0.55);
            p.z = stop.curbHoldZ;
            p.y = 0;
            p.bagMesh.visible = true;
            p.group.position.set(p.x, p.y, p.z);
            p.group.rotation.y = isSouth ? Math.PI * 0.72 : -Math.PI * 0.25;
            p.state = 'pickup_wait_curb';
            p.waitTimer = 0;
            p.group.visible = true;
          }
        }
      } else if (t.state === 'at_curb_door_open') {
        t.speed = 0;
        isBraking = true;
        hazardLeft = true;
        hazardRight = true;
        t.curbWaitTimer += delta;
        t.doorOpen = THREE.MathUtils.damp(t.doorOpen, 1.0, 6.5, delta);

        if (t.tripMode === 'dropoff') {
          const passengerClearedCurb =
            t.passenger.state === 'dropoff_walk_venue' || t.passenger.state === 'hidden';
          if (passengerClearedCurb && t.curbWaitTimer >= 2.2) {
            t.state = 'at_curb_door_close';
          }
        } else {
          if (t.doorOpen > 0.75 && t.passenger.state === 'pickup_wait_curb') {
            t.passenger.state = 'pickup_board_car';
          }
          if (t.curbWaitTimer > 12.0 && t.passenger.state !== 'hidden') {
            t.passenger.state = 'hidden';
            t.passenger.group.visible = false;
          }
          if (t.passenger.state === 'hidden') {
            t.hasPassengerInside = true;
            rig.rearPassengerSilhouette.visible = true;
            if (t.curbWaitTimer >= 1.8) {
              t.state = 'at_curb_door_close';
            }
          }
        }
      } else if (t.state === 'at_curb_door_close') {
        const isSouth = stop.side === 'south';
        const mergeLaneZ = isSouth ? 34.75 : 23.25;

        t.speed = 0;
        isBraking = true;
        hazardLeft = true;
        hazardRight = true;
        t.doorOpen = THREE.MathUtils.damp(t.doorOpen, 0.0, 7.0, delta);

        if (t.doorOpen < 0.04) {
          t.doorOpen = 0;
          let zoneConflict = false;
          if (this.trafficCoordinator) {
            const checkX = isSouth ? stop.bayX - 4.0 : stop.bayX + 4.0;
            zoneConflict = !this.trafficCoordinator.isZoneClear({
              id: taxiId,
              x: checkX,
              y: -0.26,
              z: mergeLaneZ,
              halfX: 6.5,
              halfZ: 1.5,
            });
          } else {
            const busConflict = Boolean(
              isSouth &&
                busPose &&
                busPose.active !== false &&
                busPose.z > 29.0 &&
                busPose.z < 36.2 &&
                busPose.x > stop.bayX - 4.0 &&
                busPose.x < stop.bayX + 14.0
            );
            let taxiConflict = false;
            for (let j = 0; j < this.taxis.length; j++) {
              if (j === i || !this.taxis[j].rig.group.visible) continue;
              const other = this.taxis[j];
              if (Math.abs(other.rig.group.position.z - mergeLaneZ) < 2.2) {
                const conflictRange = isSouth
                  ? other.rig.group.position.x > stop.bayX - 3.5 && other.rig.group.position.x < stop.bayX + 11.5
                  : other.rig.group.position.x < stop.bayX + 3.5 && other.rig.group.position.x > stop.bayX - 11.5;
                if (conflictRange) {
                  taxiConflict = true;
                  break;
                }
              }
            }
            zoneConflict = busConflict || taxiConflict;
          }

          if (!zoneConflict) {
            t.startX = stop.bayX;
            t.laneZ = mergeLaneZ;
            t.turnProgress = 0;
            t.state = 'pulling_out';
          }
        }
      } else if (t.state === 'pulling_out') {
        const isSouth = stop.side === 'south';
        const laneZ = isSouth ? 34.75 : 23.25;
        const dockZ = isSouth ? 35.65 : 22.30;
        const mergeDist = !isSouth && t.startX > 335.0 ? 7.0 : 9.5;
        const mergeOutX = isSouth ? t.startX - mergeDist : t.startX + mergeDist;

        hazardLeft = true;
        const fwdX = Math.sin(rig.group.rotation.y);
        const fwdZ = Math.cos(rig.group.rotation.y);
        const clr = this.trafficCoordinator?.getForwardClearance({
          id: taxiId,
          x: rig.group.position.x,
          y: -0.26,
          z: rig.group.position.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: rig.halfW,
          halfL: rig.halfL,
          lookahead: 6.5,
          minGap: 1.5,
          latMargin: 0.20,
          priority: 36,
        });
        const factor = clr ? Math.max(0.4, clr.maxSpeedFactor) : 1;
        if (factor < 0.7) isBraking = true;
        t.turnProgress = Math.min(1, t.turnProgress + delta * 0.56 * factor);
        const s = t.turnProgress * t.turnProgress * (3 - 2 * t.turnProgress);
        const nextX = THREE.MathUtils.lerp(t.startX, mergeOutX, s);
        const nextZ = THREE.MathUtils.lerp(dockZ, laneZ, s);
        const dx = nextX - rig.group.position.x;
        const dz = nextZ - rig.group.position.z;
        t.speed = Math.hypot(dx, dz) / Math.max(0.001, delta);
        rig.group.position.set(nextX, -0.26, nextZ);
        if (Math.hypot(dx, dz) > 0.001) {
          rig.group.rotation.y = Math.atan2(dx, dz);
        }

        if (t.turnProgress >= 1) {
          t.laneZ = laneZ;
          t.laneCooldown = 1.2;
          rig.group.position.set(mergeOutX, -0.26, laneZ);
          rig.group.rotation.y = isSouth ? -Math.PI / 2 : Math.PI / 2;
          t.cooldownTimer = 10.0;
          t.state = isSouth ? 'cruise_west' : 'cruise_east';
        }
      }

      // Register live pose with global CityTrafficCoordinator
      if (this.trafficCoordinator) {
        const yaw = rig.group.rotation.y;
        const isDocked = t.state === 'at_curb_door_open' || t.state === 'at_curb_door_close';
        this.trafficCoordinator.updateVehicle({
          id: taxiId,
          kind: 'car',
          x: rig.group.position.x,
          y: rig.group.position.y,
          z: rig.group.position.z,
          fwdX: Math.sin(yaw),
          fwdZ: Math.cos(yaw),
          halfW: rig.halfW,
          halfL: rig.halfL,
          speed: t.speed,
          isStoppedOrParked: isDocked,
          priority: t.state === 'cruise_east' || t.state === 'cruise_west' ? 20 : 15,
          active: rig.group.visible,
        });
      }

      // Apply door swing, wheel rotation, suspension pitch & lights
      rig.rearDoorPivot.rotation.y = -t.doorOpen * 0.88;

      const stepDist = Math.hypot(
        rig.group.position.x - t.prevX,
        rig.group.position.z - t.prevZ
      );
      t.prevX = rig.group.position.x;
      t.prevZ = rig.group.position.z;

      if (stepDist > 0.0005) {
        const wheelSpin = stepDist / rig.wheelR;
        for (let w = 0; w < rig.wheels.length; w++) {
          rig.wheels[w].rotation.x += wheelSpin;
        }
      }

      rig.pitchPivot.rotation.x = isBraking ? 0.012 : t.speed > 3 ? -0.006 : 0;

      rig.headlightMat.emissiveIntensity = 1.05 + lampFactor * 1.25;
      rig.brakeMat.emissiveIntensity = isBraking ? 2.15 : 0.45 + lampFactor * 0.35;
      rig.hazardLeftMat.emissiveIntensity = hazardLeft && blink ? 2.2 : 0.04;
      rig.hazardRightMat.emissiveIntensity = hazardRight && blink ? 2.2 : 0.04;
      rig.roofSignMat.emissiveIntensity = 0.55 + lampFactor * 0.65;

      // Green = Available / Empty; Amber = Carrying Passenger
      if (t.hasPassengerInside) {
        rig.roofStatusLedMat.color.setHex(0xfbbf24);
        rig.roofStatusLedMat.emissive.setHex(0xf59e0b);
      } else {
        rig.roofStatusLedMat.color.setHex(0x34d399);
        rig.roofStatusLedMat.emissive.setHex(0x10b981);
      }
    }
  }
}
