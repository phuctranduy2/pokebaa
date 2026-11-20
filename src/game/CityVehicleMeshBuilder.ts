import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type CityCarVariant = 'sedan' | 'suv' | 'coupe' | 'hatchback';
export type CityMotoVariant = 'scooter' | 'sport';

export interface CityCarBuildOptions {
  color: number;
  variant?: CityCarVariant;
  isTaxi?: boolean;
  taxiColor?: number;
  roofCrestBadge?: boolean;
  headlightIntensity?: number;
  brakeIntensity?: number;
  /**
   * Default true for dynamic traffic vehicles (prevents mergeStaticGroupMeshes from freezing
   * animated vehicles and reuses shared GPU BufferGeometries).
   * Pass false for static parked cars so Scene merges them safely with isolated cloned wrappers.
   */
  noMerge?: boolean;
}

export interface CityCarMeshResult {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  wheelR: number;
  halfW: number;
  halfL: number;
}

export interface CityMotoBuildOptions {
  color: number;
  variant?: CityMotoVariant;
  helmetColor?: number;
  jacketColor?: number;
  pantsColor?: number;
  includeRider?: boolean;
  includePassenger?: boolean;
  passengerHelmetColor?: number;
  passengerJacketColor?: number;
  passengerPantsColor?: number;
  kickstandTilt?: boolean;
  headlightIntensity?: number;
  brakeIntensity?: number;
  noMerge?: boolean;
}

export interface CityMotoMeshResult {
  group: THREE.Group;
  riderGroup?: THREE.Group;
  wheels: THREE.Object3D[];
  headlightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  wheelR: number;
  halfW: number;
  halfL: number;
}

interface VariantDims {
  isSuv: boolean;
  isCoupe: boolean;
  isHatch: boolean;
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
  halfW: number;
  halfL: number;
}

function getVariantDims(variant: CityCarVariant): VariantDims {
  const isSuv = variant === 'suv';
  const isCoupe = variant === 'coupe';
  const isHatch = variant === 'hatchback';
  const wheelR = isSuv ? 0.36 : isHatch ? 0.32 : 0.34;
  const wheelZ = isHatch ? 1.18 : 1.32;
  const wheelX = isHatch ? 0.80 : 0.85;
  const frontOverhangZ = isHatch ? 1.88 : 2.14;
  const rearOverhangZ = isHatch ? -1.86 : -2.14;
  const beltY = isSuv ? 0.98 : isHatch ? 0.90 : 0.88;
  const roofH = isSuv ? 1.58 : isCoupe ? 1.28 : isHatch ? 1.42 : 1.35;
  const zFrontBot = isHatch ? 0.94 : 1.08;
  const zFrontTop = isSuv ? 0.48 : isHatch ? 0.36 : 0.34;
  const zRearTop = isSuv ? -1.46 : isCoupe ? -0.78 : isHatch ? -1.32 : -0.88;
  const zRearBot = isSuv ? -1.94 : isHatch ? -1.72 : -1.68;
  const wb = isHatch ? 0.74 : 0.79;
  const wt = isHatch ? 0.60 : 0.63;
  return {
    isSuv,
    isCoupe,
    isHatch,
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
    halfW: isHatch ? 0.90 : 0.96,
    halfL: isHatch ? 1.95 : 2.25,
  };
}

interface CachedCarGeometries {
  dims: VariantDims;
  lowerGeo: THREE.BufferGeometry;
  wellGeo: THREE.BufferGeometry;
  archGeo: THREE.BufferGeometry;
  glassGeo: THREE.BufferGeometry;
  roofCapGeo: THREE.BufferGeometry;
  sharkFinGeo: THREE.BufferGeometry;
  aPillarGeo: THREE.BufferGeometry;
  cPillarGeo: THREE.BufferGeometry;
  bPillarGeo: THREE.BufferGeometry;
  topRailGeo: THREE.BufferGeometry;
  beltTrimGeo: THREE.BufferGeometry;
  handleGeo: THREE.BufferGeometry;
  mirrorStalkGeo: THREE.BufferGeometry;
  mirrorCapGeo: THREE.BufferGeometry;
  roofRailGeo?: THREE.BufferGeometry;
  spoilerGeo?: THREE.BufferGeometry;
  splitterGeo: THREE.BufferGeometry;
  skirtGeo: THREE.BufferGeometry;
  diffuserGeo: THREE.BufferGeometry;
  exhaustGeo: THREE.BufferGeometry;
  grilleFrameGeo: THREE.BufferGeometry;
  grilleCoreGeo: THREE.BufferGeometry;
  badgeGeo: THREE.BufferGeometry;
  headlampHousingGeo: THREE.BufferGeometry;
  headlampGeo: THREE.BufferGeometry;
  intakeGeo: THREE.BufferGeometry;
  frontPlateGeo: THREE.BufferGeometry;
  rearLightBarGeo: THREE.BufferGeometry;
  brakeClusterGeo: THREE.BufferGeometry;
  rearPlateGeo: THREE.BufferGeometry;
  tireGeo: THREE.BufferGeometry;
  rimDiskGeo: THREE.BufferGeometry;
  spokeGeo: THREE.BufferGeometry;
  hubGeo: THREE.BufferGeometry;
  caliperGeo: THREE.BufferGeometry;
  taxiCapGeo: THREE.BufferGeometry;
  taxiBaseGeo: THREE.BufferGeometry;
  taxiDoorStripeGeo: THREE.BufferGeometry;
  roofCrestGeo: THREE.BufferGeometry;
}

interface CachedSharedMaterials {
  darkTrimMat: THREE.MeshStandardMaterial;
  chromeMat: THREE.MeshStandardMaterial;
  rimMat: THREE.MeshStandardMaterial;
  tireRubberMat: THREE.MeshStandardMaterial;
  carGlassMat: THREE.MeshStandardMaterial;
  caliperMat: THREE.MeshStandardMaterial;
  plateMat: THREE.MeshStandardMaterial;
  taillightStaticMat: THREE.MeshStandardMaterial;
  taxiCyanMat: THREE.MeshStandardMaterial;
  taxiAmberMat: THREE.MeshStandardMaterial;
  brassCrestMat: THREE.MeshStandardMaterial;
  motoSeatMat: THREE.MeshStandardMaterial;
  motoPantsMat: THREE.MeshStandardMaterial;
  motoSkinMat: THREE.MeshStandardMaterial;
  motoVisorMat: THREE.MeshStandardMaterial;
  motoBootMat: THREE.MeshStandardMaterial;
}

let cachedSharedMaterials: CachedSharedMaterials | null = null;
const staticPaintMatCache = new Map<number, THREE.MeshStandardMaterial>();
const staticHeadlightMatCache = new Map<number, THREE.MeshStandardMaterial>();
const staticBrakeMatCache = new Map<number, THREE.MeshStandardMaterial>();
const carGeoCache = new Map<CityCarVariant, CachedCarGeometries>();
const motoGeoCache = new Map<CityMotoVariant, CachedMotoGeometries>();

function getSharedMaterials(): CachedSharedMaterials {
  if (cachedSharedMaterials) return cachedSharedMaterials;
  cachedSharedMaterials = {
    darkTrimMat: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.25 }),
    chromeMat: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 }),
    rimMat: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.88, roughness: 0.18 }),
    tireRubberMat: new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.92 }),
    carGlassMat: new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      metalness: 0.55,
      roughness: 0.08,
    }),
    caliperMat: new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.4, roughness: 0.35 }),
    plateMat: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
    taillightStaticMat: new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xef4444,
      emissiveIntensity: 0.65,
      roughness: 0.24,
    }),
    taxiCyanMat: new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.3,
      roughness: 0.2,
    }),
    taxiAmberMat: new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    }),
    brassCrestMat: new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.82,
      roughness: 0.22,
    }),
    motoSeatMat: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.84 }),
    motoPantsMat: new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.86 }),
    motoSkinMat: new THREE.MeshStandardMaterial({ color: 0xebb98a, roughness: 0.62 }),
    motoVisorMat: new THREE.MeshStandardMaterial({
      color: 0x05080f,
      metalness: 0.48,
      roughness: 0.08,
      side: THREE.DoubleSide,
    }),
    motoBootMat: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.82 }),
  };
  return cachedSharedMaterials;
}

function getStaticPaintMat(color: number): THREE.MeshStandardMaterial {
  let mat = staticPaintMatCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.66,
      roughness: 0.22,
    });
    staticPaintMatCache.set(color, mat);
  }
  return mat;
}

function getStaticHeadlightMat(intensity: number): THREE.MeshStandardMaterial {
  const key = Math.round(intensity * 100);
  let mat = staticHeadlightMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: intensity,
      roughness: 0.15,
    });
    staticHeadlightMatCache.set(key, mat);
  }
  return mat;
}

function getStaticBrakeMat(intensity: number): THREE.MeshStandardMaterial {
  const key = Math.round(intensity * 100);
  let mat = staticBrakeMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: intensity,
      roughness: 0.2,
    });
    staticBrakeMatCache.set(key, mat);
  }
  return mat;
}

/**
 * Ensures every BufferGeometry has position, normal, and uv attributes so ShopScene.mergeStaticGroupMeshes
 * cleanly buckets & merges static meshes without vertex-attribute mismatches.
 */
function ensureUvAttribute(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.getAttribute('uv')) {
    const pos = geo.getAttribute('position');
    if (pos) {
      const uvs = new Float32Array(pos.count * 2);
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
  }
  return geo;
}

function getCarGeometries(variant: CityCarVariant): CachedCarGeometries {
  const existing = carGeoCache.get(variant);
  if (existing) return existing;

  const d = getVariantDims(variant);
  const fZ = d.frontOverhangZ;
  const rZ = d.rearOverhangZ;
  const fNose = fZ + 0.06;
  const rTail = rZ - 0.04;
  const bevelDepth = d.isHatch ? 1.56 : 1.66;

  // Lower sculpted body profile extruded along X (then rotated -PI/2 around Y so +X -> +Z forward)
  const lowerShape = new THREE.Shape();
  lowerShape.moveTo(rZ, d.wheelR - 0.03);
  lowerShape.lineTo(fZ, d.wheelR - 0.05);
  lowerShape.lineTo(fNose, d.wheelR + 0.16);
  lowerShape.lineTo(fZ - 0.04, d.isSuv ? 0.80 : d.isHatch ? 0.72 : 0.70);
  lowerShape.lineTo(d.zFrontBot + 0.04, d.beltY);
  lowerShape.lineTo(d.zRearBot - 0.08, d.beltY);
  lowerShape.lineTo(rZ, d.isSuv ? 0.94 : d.isHatch ? 0.88 : 0.85);
  lowerShape.lineTo(rTail, 0.42);
  lowerShape.closePath();

  const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, {
    depth: bevelDepth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  lowerGeo.translate(0, 0, -bevelDepth * 0.5);
  lowerGeo.rotateY(-Math.PI / 2);
  ensureUvAttribute(lowerGeo);

  const wellGeo = new THREE.CylinderGeometry(
    d.wheelR + 0.07,
    d.wheelR + 0.07,
    0.25,
    18,
    1,
    false,
    -0.18,
    Math.PI + 0.36
  );
  wellGeo.rotateZ(Math.PI / 2);

  const archGeo = new THREE.TorusGeometry(d.wheelR + 0.075, 0.038, 8, 16, Math.PI);
  archGeo.rotateY(Math.PI / 2);

  // Tapered dark glasshouse with UV attribute
  const y0 = d.beltY - 0.02;
  const y1 = d.roofH - 0.02;
  const glassPos = new Float32Array([
    -d.wb, y0, d.zFrontBot, // 0
    d.wb, y0, d.zFrontBot,  // 1
    d.wb, y0, d.zRearBot,   // 2
    -d.wb, y0, d.zRearBot,  // 3
    -d.wt, y1, d.zFrontTop, // 4
    d.wt, y1, d.zFrontTop,  // 5
    d.wt, y1, d.zRearTop,   // 6
    -d.wt, y1, d.zRearTop,  // 7
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
  ensureUvAttribute(glassGeo);

  const roofLen = d.zFrontTop - d.zRearTop + 0.06;
  const roofCapGeo = new THREE.BoxGeometry(d.wt * 2.02, 0.055, roofLen);
  const sharkFinGeo = new THREE.BoxGeometry(0.04, 0.08, 0.14);

  const aLen = Math.hypot(d.wt - d.wb, y1 - y0, d.zFrontTop - (d.zFrontBot - 0.02));
  const aPillarGeo = new THREE.BoxGeometry(0.055, aLen, 0.075);

  const cLen = Math.hypot(d.wt - d.wb, y1 - y0, d.zRearTop - (d.zRearBot + 0.04));
  const cPillarGeo = new THREE.BoxGeometry(0.06, cLen, d.isHatch ? 0.14 : 0.16);

  const bLen = Math.hypot(d.wt - d.wb, y1 - y0, 0);
  const bPillarGeo = new THREE.BoxGeometry(0.035, bLen, 0.11);

  const topRailLen = Math.abs(d.zFrontTop - d.zRearTop);
  const topRailGeo = new THREE.BoxGeometry(0.04, 0.04, topRailLen);

  const beltTrimGeo = new THREE.BoxGeometry(0.025, 0.028, d.zFrontBot - d.zRearBot - 0.12);
  const handleGeo = new THREE.BoxGeometry(0.04, 0.035, 0.16);
  const mirrorStalkGeo = new THREE.BoxGeometry(0.09, 0.04, 0.06);
  const mirrorCapGeo = new THREE.BoxGeometry(0.14, 0.085, 0.13);

  const roofRailGeo = d.isSuv ? new THREE.BoxGeometry(0.045, 0.045, roofLen * 0.86) : undefined;
  const spoilerGeo = d.isCoupe
    ? new THREE.BoxGeometry(1.52, 0.05, 0.16)
    : d.isHatch
      ? new THREE.BoxGeometry(1.18, 0.045, 0.18)
      : undefined;

  const hullBodyW = d.isHatch ? 1.70 : 1.80;
  const splitterGeo = new THREE.BoxGeometry(hullBodyW, 0.075, 0.22);
  const skirtGeo = new THREE.BoxGeometry(0.09, 0.085, d.isHatch ? 1.56 : 1.82);
  const diffuserGeo = new THREE.BoxGeometry(hullBodyW - 0.04, 0.15, 0.18);
  const exhaustGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10);
  exhaustGeo.rotateX(Math.PI / 2);

  const grilleFrameGeo = new THREE.BoxGeometry(d.isHatch ? 0.84 : 0.96, 0.28, 0.06);
  const grilleCoreGeo = new THREE.BoxGeometry(d.isHatch ? 0.74 : 0.86, 0.22, 0.07);
  const badgeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12);
  badgeGeo.rotateX(Math.PI / 2);

  const headlampHousingGeo = new THREE.BoxGeometry(d.isHatch ? 0.34 : 0.38, 0.13, 0.09);
  const headlampGeo = new THREE.BoxGeometry(d.isHatch ? 0.30 : 0.34, 0.075, 0.095);
  const intakeGeo = new THREE.BoxGeometry(d.isHatch ? 0.26 : 0.30, 0.11, 0.06);
  const frontPlateGeo = new THREE.BoxGeometry(0.42, 0.10, 0.025);

  const rearLightBarGeo = new THREE.BoxGeometry(d.isHatch ? 1.38 : 1.56, 0.055, 0.06);
  const brakeClusterGeo = new THREE.BoxGeometry(d.isHatch ? 0.28 : 0.32, 0.11, 0.07);
  const rearPlateGeo = new THREE.BoxGeometry(0.42, 0.11, 0.03);

  const tireW = 0.24;
  const tireGeo = new THREE.CylinderGeometry(d.wheelR, d.wheelR, tireW, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const rimDiskGeo = new THREE.CylinderGeometry(d.wheelR * 0.68, d.wheelR * 0.68, tireW + 0.01, 16);
  rimDiskGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.03, d.wheelR * 1.24, 0.055);
  const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, tireW + 0.025, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.10);

  const taxiCapGeo = new THREE.BoxGeometry(0.56, 0.14, 0.22);
  const taxiBaseGeo = new THREE.BoxGeometry(0.62, 0.04, 0.26);
  const taxiDoorStripeGeo = new THREE.BoxGeometry(0.02, 0.055, d.isHatch ? 1.35 : 1.70);
  const roofCrestGeo = new THREE.BoxGeometry(0.54, 0.11, 0.18);

  const built: CachedCarGeometries = {
    dims: d,
    lowerGeo,
    wellGeo,
    archGeo,
    glassGeo,
    roofCapGeo,
    sharkFinGeo,
    aPillarGeo,
    cPillarGeo,
    bPillarGeo,
    topRailGeo,
    beltTrimGeo,
    handleGeo,
    mirrorStalkGeo,
    mirrorCapGeo,
    roofRailGeo,
    spoilerGeo,
    splitterGeo,
    skirtGeo,
    diffuserGeo,
    exhaustGeo,
    grilleFrameGeo,
    grilleCoreGeo,
    badgeGeo,
    headlampHousingGeo,
    headlampGeo,
    intakeGeo,
    frontPlateGeo,
    rearLightBarGeo,
    brakeClusterGeo,
    rearPlateGeo,
    tireGeo,
    rimDiskGeo,
    spokeGeo,
    hubGeo,
    caliperGeo,
    taxiCapGeo,
    taxiBaseGeo,
    taxiDoorStripeGeo,
    roofCrestGeo,
  };
  carGeoCache.set(variant, built);
  return built;
}

function orientQuaternionBetween(
  x1: number, py1: number, z1: number,
  x2: number, py2: number, z2: number
): THREE.Quaternion {
  const dir = new THREE.Vector3(x2 - x1, py2 - py1, z2 - z1).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
}

/**
 * Builds a realistic sculpted multi-part 3D automobile facing +Z forward with wheels seated at Y = 0.0.
 */
export function buildCityCarMesh(opts: CityCarBuildOptions): CityCarMeshResult {
  const variant: CityCarVariant = opts.variant ?? 'sedan';
  const noMerge = opts.noMerge ?? true;
  const g = getCarGeometries(variant);
  const d = g.dims;
  const mats = getSharedMaterials();

  const useGeo = <T extends THREE.BufferGeometry>(geo: T): T =>
    (noMerge ? geo : (geo.clone() as T));

  const paintMat = noMerge
    ? new THREE.MeshStandardMaterial({
        color: opts.color,
        metalness: 0.66,
        roughness: 0.22,
      })
    : getStaticPaintMat(opts.color);

  const headInt = opts.headlightIntensity ?? 1.0;
  const headlightMat = noMerge
    ? new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfef08a,
        emissiveIntensity: headInt,
        roughness: 0.15,
      })
    : getStaticHeadlightMat(headInt);

  const brakeInt = opts.brakeIntensity ?? 0.55;
  const brakeMat = noMerge
    ? new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: brakeInt,
        roughness: 0.2,
      })
    : getStaticBrakeMat(brakeInt);

  const car = new THREE.Group();
  if (noMerge) {
    car.userData.noMerge = true;
  }

  // 1. Sculpted Lower Car Chassis
  const lowerMesh = new THREE.Mesh(useGeo(g.lowerGeo), paintMat);
  car.add(lowerMesh);

  // Dark wheel well pockets & matte-black fender arch trims around all 4 wheels
  const archXOffset = d.isHatch ? 0.84 : 0.89;
  const wellXOffset = d.isHatch ? 0.76 : 0.81;
  [
    [-wellXOffset, d.wheelZ],
    [wellXOffset, d.wheelZ],
    [-wellXOffset, -d.wheelZ],
    [wellXOffset, -d.wheelZ],
  ].forEach(([ax, az]) => {
    const well = new THREE.Mesh(useGeo(g.wellGeo), mats.darkTrimMat);
    well.position.set(ax, d.wheelR, az);
    car.add(well);

    const arch = new THREE.Mesh(useGeo(g.archGeo), mats.darkTrimMat);
    arch.position.set(ax > 0 ? archXOffset : -archXOffset, d.wheelR + 0.01, az);
    car.add(arch);
  });

  // 2. Tapered Glossy Dark Tinted Glass Greenhouse
  const glassMesh = new THREE.Mesh(useGeo(g.glassGeo), mats.carGlassMat);
  car.add(glassMesh);

  // 3. Painted Roof Cap & Shark-Fin Antenna
  const roofCenterZ = (d.zFrontTop + d.zRearTop) * 0.5;
  const roofCap = new THREE.Mesh(useGeo(g.roofCapGeo), paintMat);
  roofCap.position.set(0, d.roofH - 0.005, roofCenterZ);
  car.add(roofCap);

  const sharkFin = new THREE.Mesh(useGeo(g.sharkFinGeo), mats.darkTrimMat);
  sharkFin.position.set(0, d.roofH + 0.04, d.zRearTop + 0.22);
  sharkFin.rotation.x = -0.35;
  car.add(sharkFin);

  // A/B/C Pillars, Window Rails, Beltline Trim, Door Handles & Wing Mirrors
  const y0 = d.beltY - 0.02;
  const y1 = d.roofH - 0.02;
  const mirrorX = d.isHatch ? 0.83 : 0.88;
  const handleX = d.isHatch ? 0.84 : 0.89;
  const handleZs = d.isCoupe ? [0.06] : [0.12, -0.68];

  [-1, 1].forEach((side) => {
    const aPillar = new THREE.Mesh(useGeo(g.aPillarGeo), paintMat);
    aPillar.position.set(
      side * ((d.wb + d.wt) * 0.5 - 0.01),
      (y0 + y1) * 0.5,
      (d.zFrontBot - 0.02 + d.zFrontTop) * 0.5
    );
    aPillar.quaternion.copy(
      orientQuaternionBetween(
        side * (d.wb - 0.01), y0, d.zFrontBot - 0.02,
        side * (d.wt - 0.01), y1, d.zFrontTop
      )
    );
    car.add(aPillar);

    const cPillar = new THREE.Mesh(useGeo(g.cPillarGeo), paintMat);
    cPillar.position.set(
      side * ((d.wb + d.wt) * 0.5 - 0.01),
      (y0 + y1) * 0.5,
      (d.zRearBot + 0.04 + d.zRearTop) * 0.5
    );
    cPillar.quaternion.copy(
      orientQuaternionBetween(
        side * (d.wb - 0.01), y0, d.zRearBot + 0.04,
        side * (d.wt - 0.01), y1, d.zRearTop
      )
    );
    car.add(cPillar);

    const bZ = d.isCoupe ? -0.24 : -0.18;
    const bPillar = new THREE.Mesh(useGeo(g.bPillarGeo), mats.darkTrimMat);
    bPillar.position.set(side * ((d.wb + d.wt) * 0.5), (y0 + y1) * 0.5, bZ);
    bPillar.quaternion.copy(
      orientQuaternionBetween(side * (d.wb - 0.005), y0, bZ, side * (d.wt + 0.005), y1, bZ)
    );
    car.add(bPillar);

    const topRail = new THREE.Mesh(useGeo(g.topRailGeo), mats.darkTrimMat);
    topRail.position.set(side * d.wt, y1, (d.zFrontTop + d.zRearTop) * 0.5);
    car.add(topRail);

    const beltTrim = new THREE.Mesh(useGeo(g.beltTrimGeo), mats.chromeMat);
    beltTrim.position.set(side * (d.wb + 0.01), d.beltY - 0.01, (d.zFrontBot + d.zRearBot) * 0.5);
    car.add(beltTrim);

    handleZs.forEach((hz) => {
      const handle = new THREE.Mesh(useGeo(g.handleGeo), mats.chromeMat);
      handle.position.set(side * handleX, d.beltY - 0.14, hz);
      car.add(handle);
    });

    const mirrorStalk = new THREE.Mesh(useGeo(g.mirrorStalkGeo), mats.darkTrimMat);
    mirrorStalk.position.set(side * mirrorX, d.beltY + 0.02, d.isHatch ? 0.54 : 0.62);
    car.add(mirrorStalk);

    const mirrorCap = new THREE.Mesh(useGeo(g.mirrorCapGeo), paintMat);
    mirrorCap.position.set(side * (mirrorX + 0.08), d.beltY + 0.04, d.isHatch ? 0.52 : 0.60);
    car.add(mirrorCap);

    if (opts.isTaxi) {
      const livery = new THREE.Mesh(
        useGeo(g.taxiDoorStripeGeo),
        opts.taxiColor === 0xf59e0b ? mats.taxiAmberMat : mats.taxiCyanMat
      );
      livery.position.set(side * (handleX - 0.005), d.beltY - 0.27, -0.05);
      car.add(livery);
    }
  });

  if (d.isSuv && g.roofRailGeo) {
    [-0.54, 0.54].forEach((rx) => {
      const rail = new THREE.Mesh(useGeo(g.roofRailGeo!), mats.chromeMat);
      rail.position.set(rx, d.roofH + 0.04, roofCenterZ);
      car.add(rail);
    });
  } else if (g.spoilerGeo) {
    const spoiler = new THREE.Mesh(useGeo(g.spoilerGeo), d.isHatch ? paintMat : mats.darkTrimMat);
    if (d.isHatch) {
      spoiler.position.set(0, d.roofH + 0.02, d.zRearTop - 0.08);
      spoiler.rotation.x = -0.14;
    } else {
      spoiler.position.set(0, d.beltY + 0.01, -2.08);
      spoiler.rotation.x = 0.2;
    }
    car.add(spoiler);
  }

  // Optional Taxi Roof Cap or Hotel Brass Crest
  if (opts.isTaxi) {
    const taxiBase = new THREE.Mesh(useGeo(g.taxiBaseGeo), mats.darkTrimMat);
    taxiBase.position.set(0, d.roofH + 0.04, roofCenterZ + 0.22);
    car.add(taxiBase);
    const taxiCap = new THREE.Mesh(
      useGeo(g.taxiCapGeo),
      opts.taxiColor === 0xf59e0b ? mats.taxiAmberMat : mats.taxiCyanMat
    );
    taxiCap.position.set(0, d.roofH + 0.12, roofCenterZ + 0.22);
    car.add(taxiCap);
  } else if (opts.roofCrestBadge) {
    const crest = new THREE.Mesh(useGeo(g.roofCrestGeo), mats.brassCrestMat);
    crest.position.set(0, d.roofH + 0.075, d.zFrontTop - 0.18);
    car.add(crest);
  }

  // 4. Lower Splitter, Rocker Skirts, Diffuser & Dual Chrome Exhausts
  const splitter = new THREE.Mesh(useGeo(g.splitterGeo), mats.darkTrimMat);
  splitter.position.set(0, Math.max(0.24, d.wheelR - 0.07), d.frontOverhangZ - 0.01);
  car.add(splitter);

  const skirtX = d.isHatch ? 0.83 : 0.88;
  [-skirtX, skirtX].forEach((sx) => {
    const skirt = new THREE.Mesh(useGeo(g.skirtGeo), mats.darkTrimMat);
    skirt.position.set(sx, Math.max(0.25, d.wheelR - 0.06), 0);
    car.add(skirt);
  });

  const diffuser = new THREE.Mesh(useGeo(g.diffuserGeo), mats.darkTrimMat);
  diffuser.position.set(0, Math.max(0.27, d.wheelR - 0.04), d.rearOverhangZ);
  car.add(diffuser);

  const exX = d.isHatch ? 0.48 : 0.56;
  [-exX, exX].forEach((ex) => {
    const exhaust = new THREE.Mesh(useGeo(g.exhaustGeo), mats.chromeMat);
    exhaust.position.set(ex, Math.max(0.27, d.wheelR - 0.04), d.rearOverhangZ - 0.07);
    car.add(exhaust);
  });

  // 5. Front Fascia: Chrome Grille, Center Badge, Angled LED Headlights, Bumper Intakes & Front Plate
  const fFaceZ = d.frontOverhangZ + 0.05;
  const grilleFrame = new THREE.Mesh(useGeo(g.grilleFrameGeo), mats.chromeMat);
  grilleFrame.position.set(0, 0.54, fFaceZ);
  car.add(grilleFrame);

  const grilleCore = new THREE.Mesh(useGeo(g.grilleCoreGeo), mats.darkTrimMat);
  grilleCore.position.set(0, 0.54, fFaceZ + 0.01);
  car.add(grilleCore);

  const badge = new THREE.Mesh(useGeo(g.badgeGeo), mats.chromeMat);
  badge.position.set(0, 0.54, fFaceZ + 0.04);
  car.add(badge);

  const lightX = d.isHatch ? 0.60 : 0.66;
  [-lightX, lightX].forEach((hx) => {
    const headlampHousing = new THREE.Mesh(useGeo(g.headlampHousingGeo), mats.darkTrimMat);
    headlampHousing.position.set(hx, 0.66, d.frontOverhangZ);
    headlampHousing.rotation.y = hx > 0 ? -0.18 : 0.18;
    car.add(headlampHousing);

    const headlamp = new THREE.Mesh(useGeo(g.headlampGeo), headlightMat);
    headlamp.position.set(hx, 0.66, d.frontOverhangZ + 0.01);
    headlamp.rotation.y = hx > 0 ? -0.18 : 0.18;
    car.add(headlamp);

    const intake = new THREE.Mesh(useGeo(g.intakeGeo), mats.darkTrimMat);
    intake.position.set(hx, 0.38, d.frontOverhangZ + 0.04);
    intake.rotation.y = hx > 0 ? -0.14 : 0.14;
    car.add(intake);
  });

  const frontPlate = new THREE.Mesh(useGeo(g.frontPlateGeo), mats.plateMat);
  frontPlate.position.set(0, 0.36, fFaceZ + 0.03);
  car.add(frontPlate);

  // 6. Rear Fascia: LED Light Bar, Dual Brake Clusters & Rear License Plate
  const rFaceZ = d.rearOverhangZ - 0.04;
  const rearLightBar = new THREE.Mesh(useGeo(g.rearLightBarGeo), mats.taillightStaticMat);
  rearLightBar.position.set(0, d.beltY - 0.10, rFaceZ);
  car.add(rearLightBar);

  [-lightX, lightX].forEach((bx) => {
    const brakeCluster = new THREE.Mesh(useGeo(g.brakeClusterGeo), brakeMat);
    brakeCluster.position.set(bx, d.beltY - 0.10, rFaceZ - 0.01);
    car.add(brakeCluster);
  });

  const rearPlate = new THREE.Mesh(useGeo(g.rearPlateGeo), mats.plateMat);
  rearPlate.position.set(0, 0.54, rFaceZ - 0.01);
  car.add(rearPlate);

  // 7. Four Rotating Multi-Part 5-Spoke Alloy Wheels (bottom seated cleanly at Y = 0.0!)
  const wheels: THREE.Object3D[] = [];
  const wheelCoords: Array<[number, number]> = [
    [-d.wheelX, d.wheelZ],
    [d.wheelX, d.wheelZ],
    [-d.wheelX, -d.wheelZ],
    [d.wheelX, -d.wheelZ],
  ];

  wheelCoords.forEach(([wx, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, d.wheelR, wz);

    const tire = new THREE.Mesh(useGeo(g.tireGeo), mats.tireRubberMat);
    wGroup.add(tire);

    const rimDisk = new THREE.Mesh(useGeo(g.rimDiskGeo), mats.darkTrimMat);
    wGroup.add(rimDisk);

    const sideSign = wx > 0 ? 1 : -1;
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(useGeo(g.spokeGeo), mats.rimMat);
      spoke.position.x = sideSign * 0.125;
      spoke.rotation.x = (s * Math.PI) / 5;
      wGroup.add(spoke);
    }

    const hub = new THREE.Mesh(useGeo(g.hubGeo), mats.chromeMat);
    wGroup.add(hub);

    const caliper = new THREE.Mesh(useGeo(g.caliperGeo), mats.caliperMat);
    caliper.position.set(sideSign * 0.04, 0.11, -0.09);
    wGroup.add(caliper);

    car.add(wGroup);
    wheels.push(wGroup);
  });

  return {
    group: car,
    wheels,
    headlightMat,
    brakeMat,
    wheelR: d.wheelR,
    halfW: d.halfW,
    halfL: d.halfL,
  };
}

// =========================================================================
// MOTORBIKE & SCOOTER BUILDER (SCULPTED FAIRINGS + ORGANIC RIDERS + 2-UP)
// =========================================================================

interface CachedMotoGeometries {
  wheelR: number;
  tireGeo: THREE.BufferGeometry;
  rimGeo: THREE.BufferGeometry;
  hubGeo: THREE.BufferGeometry;
  spokeGeo: THREE.BufferGeometry;
  engineGeo: THREE.BufferGeometry;
  exhaustGeo: THREE.BufferGeometry;
  exhaustTipGeo: THREE.BufferGeometry;
  forkTubeGeo: THREE.BufferGeometry;
  fenderGeo: THREE.BufferGeometry;
  rearMudflapGeo: THREE.BufferGeometry;
  // Scooter parts (sculpted beveled Vespa/Vision curves)
  apronGeo: THREE.BufferGeometry;
  apronCrestGeo: THREE.BufferGeometry;
  cowlNacelleGeo: THREE.BufferGeometry;
  floorDeckGeo: THREE.BufferGeometry;
  rearBodyGeo: THREE.BufferGeometry;
  // Sport parts (sculpted beveled sport fairings)
  tankGeo: THREE.BufferGeometry;
  frontCowlGeo: THREE.BufferGeometry;
  tailCowlGeo: THREE.BufferGeometry;
  // Shared trim & lighting
  seatGeo: THREE.BufferGeometry;
  grabRailGeo: THREE.BufferGeometry;
  handlebarGeo: THREE.BufferGeometry;
  gripGeo: THREE.BufferGeometry;
  stalkGeo: THREE.BufferGeometry;
  mirrorGeo: THREE.BufferGeometry;
  headlightScooterGeo: THREE.BufferGeometry;
  headlightSportGeo: THREE.BufferGeometry;
  taillightGeo: THREE.BufferGeometry;
  plateGeo: THREE.BufferGeometry;
  // Organic smooth rider parts (Capsule / Tapered Cylinder / Curved Visor)
  pelvisGeo: THREE.BufferGeometry;
  torsoGeo: THREE.BufferGeometry;
  shoulderCapGeo: THREE.BufferGeometry;
  neckGeo: THREE.BufferGeometry;
  helmetGeo: THREE.BufferGeometry;
  visorGeo: THREE.BufferGeometry;
  upperArmGeo: THREE.BufferGeometry;
  forearmGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  thighGeo: THREE.BufferGeometry;
  shinGeo: THREE.BufferGeometry;
  bootGeo: THREE.BufferGeometry;
}

function createExtrudedSideProfile(
  points: Array<[number, number]>,
  depth: number,
  bevelThickness: number,
  bevelSize: number,
  bevelSegments: number = 3
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments,
  });
  // Extrude is in XY extruded along Z; center Z and rotate -PI/2 around Y so +X -> +Z forward
  geo.translate(0, 0, -depth * 0.5);
  geo.rotateY(-Math.PI / 2);
  return ensureUvAttribute(geo);
}

function getMotoGeometries(variant: CityMotoVariant): CachedMotoGeometries {
  const existing = motoGeoCache.get(variant);
  if (existing) return existing;

  // Outer radius = 0.21 + 0.07 = 0.28m -> exact match with wheelR = 0.28!
  const wheelR = 0.28;
  const tireGeo = ensureUvAttribute(new THREE.TorusGeometry(0.21, 0.07, 12, 22));
  tireGeo.rotateY(Math.PI / 2);

  const rimGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.155, 0.155, 0.07, 16));
  rimGeo.rotateZ(Math.PI / 2);

  const hubGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 12));
  hubGeo.rotateZ(Math.PI / 2);

  const spokeGeo = ensureUvAttribute(new THREE.BoxGeometry(0.055, 0.27, 0.028));

  const engineGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.13, 0.34, 6, 12));
  engineGeo.rotateX(Math.PI / 2);

  const exhaustGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.036, 0.055, 0.58, 12));
  exhaustGeo.rotateX(Math.PI / 2 - 0.20);

  const exhaustTipGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.028, 0.036, 0.07, 10));
  exhaustTipGeo.rotateX(Math.PI / 2 - 0.20);

  const forkTubeGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.026, 0.024, 0.56, 10));
  const fenderGeo = ensureUvAttribute(
    new THREE.CylinderGeometry(0.295, 0.295, 0.155, 16, 1, false, Math.PI / 2 - 0.72, 1.48)
  );
  fenderGeo.rotateZ(Math.PI / 2);

  const rearMudflapGeo = ensureUvAttribute(new THREE.BoxGeometry(0.17, 0.24, 0.03));

  // Sculpted Scooter Front Leg-Shield Apron (side-profile X=Z, Y=Y, rounded bevels)
  const apronGeo = createExtrudedSideProfile(
    [
      [0.34, 0.40],
      [0.48, 0.42],
      [0.57, 0.64],
      [0.52, 0.88],
      [0.42, 0.96],
      [0.32, 0.90],
      [0.30, 0.56],
    ],
    0.26,
    0.07,
    0.045,
    4
  );
  const apronCrestGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.035, 0.24, 5, 10));

  // Rounded Scooter Handlebar Headlight Nacelle
  const cowlNacelleGeo = ensureUvAttribute(new THREE.SphereGeometry(0.155, 16, 12));
  cowlNacelleGeo.scale(1.42, 0.62, 1.05);

  const floorDeckGeo = createExtrudedSideProfile(
    [
      [-0.14, 0.35],
      [0.36, 0.35],
      [0.38, 0.42],
      [-0.12, 0.42],
    ],
    0.32,
    0.03,
    0.02,
    2
  );

  // Plump Vespa / Lead Style Tapered Rear Body Fairing
  const rearBodyGeo = createExtrudedSideProfile(
    [
      [-0.78, 0.56],
      [-0.64, 0.44],
      [-0.22, 0.43],
      [-0.04, 0.62],
      [-0.10, 0.75],
      [-0.66, 0.75],
      [-0.79, 0.67],
    ],
    0.28,
    0.085,
    0.055,
    4
  );

  // Sculpted Sport Bike Parts
  const tankGeo = createExtrudedSideProfile(
    [
      [-0.12, 0.64],
      [0.32, 0.62],
      [0.38, 0.78],
      [0.18, 0.89],
      [-0.08, 0.82],
    ],
    0.24,
    0.06,
    0.045,
    3
  );
  const frontCowlGeo = createExtrudedSideProfile(
    [
      [0.32, 0.62],
      [0.64, 0.68],
      [0.54, 0.92],
      [0.34, 0.90],
    ],
    0.22,
    0.055,
    0.04,
    3
  );
  const tailCowlGeo = createExtrudedSideProfile(
    [
      [-0.76, 0.72],
      [-0.26, 0.64],
      [-0.16, 0.78],
      [-0.72, 0.84],
    ],
    0.20,
    0.05,
    0.035,
    3
  );

  // Dual-length Contoured Saddle Seat (fits both solo & 2-up passenger!)
  const seatGeo = createExtrudedSideProfile(
    [
      [-0.68, 0.75],
      [-0.02, 0.74],
      [-0.04, 0.82],
      [-0.30, 0.82],
      [-0.38, 0.855],
      [-0.66, 0.85],
    ],
    0.24,
    0.045,
    0.035,
    3
  );
  const grabRailGeo = ensureUvAttribute(new THREE.TorusGeometry(0.12, 0.018, 8, 14, Math.PI));
  grabRailGeo.rotateX(Math.PI / 2);

  const handlebarGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.02, 0.02, 0.64, 10));
  handlebarGeo.rotateZ(Math.PI / 2);
  const gripGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.028, 0.028, 0.13, 10));
  gripGeo.rotateZ(Math.PI / 2);
  const stalkGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 6));
  const mirrorGeo = ensureUvAttribute(new THREE.SphereGeometry(0.048, 10, 8));
  mirrorGeo.scale(1.22, 0.78, 0.38);

  const headlightScooterGeo = ensureUvAttribute(new THREE.SphereGeometry(0.075, 14, 10));
  headlightScooterGeo.scale(1.18, 0.72, 0.55);
  const headlightSportGeo = ensureUvAttribute(new THREE.BoxGeometry(0.18, 0.09, 0.06));
  const taillightGeo = ensureUvAttribute(new THREE.SphereGeometry(0.058, 12, 8));
  taillightGeo.scale(1.35, 0.65, 0.52);
  const plateGeo = ensureUvAttribute(new THREE.BoxGeometry(0.16, 0.11, 0.018));

  // Smooth Organic Capsule Rider Geometries (matching rounded reference silhouette)
  const pelvisGeo = ensureUvAttribute(new THREE.SphereGeometry(0.145, 14, 10));
  pelvisGeo.scale(1.06, 0.72, 0.92);

  const torsoGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.162, 0.136, 0.38, 14));
  torsoGeo.scale(1.05, 1.0, 0.76);

  const shoulderCapGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.108, 0.15, 6, 12));
  shoulderCapGeo.rotateZ(Math.PI / 2);
  shoulderCapGeo.scale(1.0, 0.72, 0.85);

  const neckGeo = ensureUvAttribute(new THREE.CylinderGeometry(0.052, 0.062, 0.10, 10));

  const helmetGeo = ensureUvAttribute(new THREE.SphereGeometry(0.142, 16, 14));
  helmetGeo.scale(0.98, 1.05, 1.12);

  // Curved wrap-around dark visor patch flush on front (+Z) of helmet
  const visorGeo = ensureUvAttribute(
    new THREE.SphereGeometry(0.146, 16, 10, Math.PI / 2 - 0.74, 1.48, Math.PI * 0.39, Math.PI * 0.21)
  );
  visorGeo.scale(0.985, 1.055, 1.125);

  // Unit-aligned Capsule segments (Y-axis, scaled or oriented via orientQuaternionBetween)
  const upperArmGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.044, 0.18, 6, 10));
  const forearmGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.038, 0.18, 6, 10));
  const handGeo = ensureUvAttribute(new THREE.SphereGeometry(0.044, 10, 8));

  const thighGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.060, 0.22, 6, 10));
  const shinGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.050, 0.23, 6, 10));
  const bootGeo = ensureUvAttribute(new THREE.CapsuleGeometry(0.045, 0.09, 6, 10));
  bootGeo.rotateX(Math.PI / 2);

  const built: CachedMotoGeometries = {
    wheelR,
    tireGeo,
    rimGeo,
    hubGeo,
    spokeGeo,
    engineGeo,
    exhaustGeo,
    exhaustTipGeo,
    forkTubeGeo,
    fenderGeo,
    rearMudflapGeo,
    apronGeo,
    apronCrestGeo,
    cowlNacelleGeo,
    floorDeckGeo,
    rearBodyGeo,
    tankGeo,
    frontCowlGeo,
    tailCowlGeo,
    seatGeo,
    grabRailGeo,
    handlebarGeo,
    gripGeo,
    stalkGeo,
    mirrorGeo,
    headlightScooterGeo,
    headlightSportGeo,
    taillightGeo,
    plateGeo,
    pelvisGeo,
    torsoGeo,
    shoulderCapGeo,
    neckGeo,
    helmetGeo,
    visorGeo,
    upperArmGeo,
    forearmGeo,
    handGeo,
    thighGeo,
    shinGeo,
    bootGeo,
  };
  motoGeoCache.set(variant, built);
  return built;
}

function addOrientedSegment(
  parent: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
  mesh.quaternion.copy(orientQuaternionBetween(x1, y1, z1, x2, y2, z2));
  parent.add(mesh);
  return mesh;
}

function buildSmoothMotoRider(params: {
  g: CachedMotoGeometries;
  mats: CachedSharedMaterials;
  useGeo: <T extends THREE.BufferGeometry>(geo: T) => T;
  jacketMat: THREE.Material;
  helmetMat: THREE.Material;
  pantsMat: THREE.Material;
  isScooter: boolean;
  isPassenger: boolean;
}): THREE.Group {
  const { g, mats, useGeo, jacketMat, helmetMat, pantsMat, isScooter, isPassenger } = params;
  const person = new THREE.Group();

  // Base seating offsets: driver sits forward, passenger sits behind on elevated rear saddle
  const hipZ = isPassenger ? -0.42 : -0.14;
  const hipY = isPassenger ? 0.90 : 0.855;
  const leanFwd = isPassenger ? (isScooter ? 0.14 : 0.24) : isScooter ? 0.14 : 0.30;

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, hipY, hipZ);
  torsoPivot.rotation.x = leanFwd;
  person.add(torsoPivot);

  const pelvis = new THREE.Mesh(useGeo(g.pelvisGeo), pantsMat);
  pelvis.position.set(0, 0.02, 0);
  torsoPivot.add(pelvis);

  const torso = new THREE.Mesh(useGeo(g.torsoGeo), jacketMat);
  torso.position.set(0, 0.24, 0);
  torsoPivot.add(torso);

  const shoulderCap = new THREE.Mesh(useGeo(g.shoulderCapGeo), jacketMat);
  shoulderCap.position.set(0, 0.40, 0);
  torsoPivot.add(shoulderCap);

  const neck = new THREE.Mesh(useGeo(g.neckGeo), mats.motoSkinMat);
  neck.position.set(0, 0.48, 0.01);
  torsoPivot.add(neck);

  // Helmet tilts back slightly so rider looks level at the road ahead
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.585, 0.02);
  headPivot.rotation.x = -leanFwd * 0.65;
  torsoPivot.add(headPivot);

  const helmet = new THREE.Mesh(useGeo(g.helmetGeo), helmetMat);
  headPivot.add(helmet);

  const visor = new THREE.Mesh(useGeo(g.visorGeo), mats.motoVisorMat);
  headPivot.add(visor);

  // Compute shoulder world-in-person coords from torso lean
  const sinL = Math.sin(leanFwd);
  const cosL = Math.cos(leanFwd);
  const shY = hipY + 0.40 * cosL;
  const shZ = hipZ + 0.40 * sinL;
  const shX = 0.172;

  [-1, 1].forEach((side) => {
    if (isPassenger) {
      // Passenger arms reach forward around driver's waist/hips
      const elX = side * 0.235;
      const elY = shY - 0.17;
      const elZ = shZ + 0.12;
      const haX = side * 0.175;
      const haY = hipY + 0.08;
      const haZ = -0.14;

      addOrientedSegment(person, useGeo(g.upperArmGeo), jacketMat, side * shX, shY, shZ, elX, elY, elZ);
      addOrientedSegment(person, useGeo(g.forearmGeo), jacketMat, elX, elY, elZ, haX, haY, haZ);

      const hand = new THREE.Mesh(useGeo(g.handGeo), mats.motoSkinMat);
      hand.position.set(haX, haY, haZ);
      person.add(hand);

      // Passenger legs straddle wider outside driver's thighs down to rear footpegs
      const hipLX = side * 0.135;
      const kneeX = side * 0.225;
      const kneeY = 0.72;
      const kneeZ = -0.17;
      const footX = side * 0.215;
      const footY = 0.43;
      const footZ = -0.24;

      addOrientedSegment(person, useGeo(g.thighGeo), pantsMat, hipLX, hipY - 0.01, hipZ + 0.02, kneeX, kneeY, kneeZ);
      addOrientedSegment(person, useGeo(g.shinGeo), pantsMat, kneeX, kneeY, kneeZ, footX, footY, footZ);

      const boot = new THREE.Mesh(useGeo(g.bootGeo), mats.motoBootMat);
      boot.position.set(footX, footY - 0.015, footZ + 0.045);
      person.add(boot);
    } else {
      // Driver arms reach smoothly via bent elbows to handlebar grips
      const elX = side * 0.23;
      const elY = shY - 0.18;
      const elZ = shZ + 0.17;
      const gripX = side * 0.265;
      const gripY = 0.96;
      const gripZ = 0.37;

      addOrientedSegment(person, useGeo(g.upperArmGeo), jacketMat, side * shX, shY, shZ, elX, elY, elZ);
      addOrientedSegment(person, useGeo(g.forearmGeo), jacketMat, elX, elY, elZ, gripX, gripY, gripZ);

      const hand = new THREE.Mesh(useGeo(g.handGeo), mats.motoBootMat);
      hand.position.set(gripX, gripY, gripZ);
      person.add(hand);

      // Driver legs rest naturally on scooter floorboard or sport footpegs
      const hipLX = side * 0.125;
      const kneeX = side * (isScooter ? 0.175 : 0.185);
      const kneeY = isScooter ? 0.71 : 0.69;
      const kneeZ = isScooter ? 0.13 : 0.09;
      const footX = side * (isScooter ? 0.16 : 0.185);
      const footY = isScooter ? 0.43 : 0.41;
      const footZ = isScooter ? 0.16 : -0.04;

      addOrientedSegment(person, useGeo(g.thighGeo), pantsMat, hipLX, hipY - 0.01, hipZ + 0.03, kneeX, kneeY, kneeZ);
      addOrientedSegment(person, useGeo(g.shinGeo), pantsMat, kneeX, kneeY, kneeZ, footX, footY, footZ);

      const boot = new THREE.Mesh(useGeo(g.bootGeo), mats.motoBootMat);
      boot.position.set(footX, footY - 0.01, footZ + 0.05);
      person.add(boot);
    }
  });

  return person;
}

/**
 * Builds a detailed sculpted scooter or sport motorbike facing +Z forward, bottom seated at Y = 0.0,
 * with smooth capsule-jointed NPC rider and optional pillion passenger.
 */
export function buildCityMotorbikeMesh(opts: CityMotoBuildOptions): CityMotoMeshResult {
  const variant: CityMotoVariant = opts.variant ?? 'scooter';
  const isScooter = variant === 'scooter';
  const includeRider = opts.includeRider ?? true;
  const includePassenger = includeRider && (opts.includePassenger ?? false);
  const noMerge = opts.noMerge ?? true;

  const g = getMotoGeometries(variant);
  const mats = getSharedMaterials();

  const useGeo = <T extends THREE.BufferGeometry>(geo: T): T =>
    (noMerge ? geo : (geo.clone() as T));

  const paintMat = noMerge
    ? new THREE.MeshStandardMaterial({ color: opts.color, metalness: 0.52, roughness: 0.22 })
    : getStaticPaintMat(opts.color);

  const headInt = opts.headlightIntensity ?? 1.15;
  const headlightMat = noMerge
    ? new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe0f2fe,
        emissiveIntensity: headInt,
        roughness: 0.16,
      })
    : getStaticHeadlightMat(headInt);

  const brakeInt = opts.brakeIntensity ?? 0.6;
  const brakeMat = noMerge
    ? new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: brakeInt,
        roughness: 0.22,
      })
    : getStaticBrakeMat(brakeInt);

  const root = new THREE.Group();
  if (noMerge) {
    root.userData.noMerge = true;
  }

  const tiltGroup = new THREE.Group();
  if (opts.kickstandTilt) {
    tiltGroup.rotation.z = 0.085;
  }
  root.add(tiltGroup);

  const wheels: THREE.Object3D[] = [];
  [0.62, -0.58].forEach((wz) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(0, g.wheelR, wz);

    wGroup.add(new THREE.Mesh(useGeo(g.tireGeo), mats.tireRubberMat));
    wGroup.add(new THREE.Mesh(useGeo(g.rimGeo), mats.chromeMat));
    wGroup.add(new THREE.Mesh(useGeo(g.hubGeo), mats.darkTrimMat));
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(useGeo(g.spokeGeo), mats.rimMat);
      spoke.rotation.x = (s * Math.PI) / 5;
      wGroup.add(spoke);
    }

    tiltGroup.add(wGroup);
    wheels.push(wGroup);
  });

  const fender = new THREE.Mesh(useGeo(g.fenderGeo), paintMat);
  fender.position.set(0, 0.28, 0.62);
  tiltGroup.add(fender);

  const engine = new THREE.Mesh(useGeo(g.engineGeo), mats.darkTrimMat);
  engine.position.set(0, 0.34, -0.14);
  tiltGroup.add(engine);

  const exhaust = new THREE.Mesh(useGeo(g.exhaustGeo), mats.chromeMat);
  exhaust.position.set(0.185, 0.34, -0.38);
  tiltGroup.add(exhaust);

  const exhaustTip = new THREE.Mesh(useGeo(g.exhaustTipGeo), mats.darkTrimMat);
  exhaustTip.position.set(0.185, 0.398, -0.66);
  tiltGroup.add(exhaustTip);

  [-0.08, 0.08].forEach((fx) => {
    const forkTube = new THREE.Mesh(useGeo(g.forkTubeGeo), mats.chromeMat);
    forkTube.position.set(fx, 0.56, 0.50);
    forkTube.rotation.x = -0.32;
    tiltGroup.add(forkTube);
  });

  if (isScooter) {
    const apron = new THREE.Mesh(useGeo(g.apronGeo), paintMat);
    tiltGroup.add(apron);

    const apronCrest = new THREE.Mesh(useGeo(g.apronCrestGeo), mats.chromeMat);
    apronCrest.position.set(0, 0.72, 0.595);
    apronCrest.rotation.x = 0.24;
    tiltGroup.add(apronCrest);

    const cowlNacelle = new THREE.Mesh(useGeo(g.cowlNacelleGeo), paintMat);
    cowlNacelle.position.set(0, 0.96, 0.39);
    tiltGroup.add(cowlNacelle);

    const floorDeck = new THREE.Mesh(useGeo(g.floorDeckGeo), mats.darkTrimMat);
    tiltGroup.add(floorDeck);

    const rearBody = new THREE.Mesh(useGeo(g.rearBodyGeo), paintMat);
    tiltGroup.add(rearBody);

    const headlight = new THREE.Mesh(useGeo(g.headlightScooterGeo), headlightMat);
    headlight.position.set(0, 0.96, 0.53);
    tiltGroup.add(headlight);
  } else {
    const tank = new THREE.Mesh(useGeo(g.tankGeo), paintMat);
    tiltGroup.add(tank);

    const frontCowl = new THREE.Mesh(useGeo(g.frontCowlGeo), paintMat);
    tiltGroup.add(frontCowl);

    const tailCowl = new THREE.Mesh(useGeo(g.tailCowlGeo), paintMat);
    tiltGroup.add(tailCowl);

    const headlight = new THREE.Mesh(useGeo(g.headlightSportGeo), headlightMat);
    headlight.position.set(0, 0.80, 0.65);
    tiltGroup.add(headlight);
  }

  const seat = new THREE.Mesh(useGeo(g.seatGeo), mats.motoSeatMat);
  tiltGroup.add(seat);

  const grabRail = new THREE.Mesh(useGeo(g.grabRailGeo), mats.chromeMat);
  grabRail.position.set(0, 0.80, -0.66);
  tiltGroup.add(grabRail);

  const handlebar = new THREE.Mesh(useGeo(g.handlebarGeo), mats.darkTrimMat);
  handlebar.position.set(0, 0.96, 0.37);
  tiltGroup.add(handlebar);

  [-0.265, 0.265].forEach((gx) => {
    const grip = new THREE.Mesh(useGeo(g.gripGeo), mats.tireRubberMat);
    grip.position.set(gx, 0.96, 0.37);
    tiltGroup.add(grip);

    const stalk = new THREE.Mesh(useGeo(g.stalkGeo), mats.chromeMat);
    stalk.position.set(gx * 0.96, 1.05, 0.38);
    stalk.rotation.z = gx > 0 ? -0.28 : 0.28;
    tiltGroup.add(stalk);

    const mirror = new THREE.Mesh(useGeo(g.mirrorGeo), mats.darkTrimMat);
    mirror.position.set(gx * 1.12, 1.13, 0.38);
    tiltGroup.add(mirror);
  });

  const taillight = new THREE.Mesh(useGeo(g.taillightGeo), brakeMat);
  taillight.position.set(0, 0.72, -0.80);
  tiltGroup.add(taillight);

  const rearMudflap = new THREE.Mesh(useGeo(g.rearMudflapGeo), mats.darkTrimMat);
  rearMudflap.position.set(0, 0.45, -0.78);
  rearMudflap.rotation.x = 0.28;
  tiltGroup.add(rearMudflap);

  const plate = new THREE.Mesh(useGeo(g.plateGeo), mats.plateMat);
  plate.position.set(0, 0.50, -0.795);
  plate.rotation.x = 0.28;
  tiltGroup.add(plate);

  let riderGroup: THREE.Group | undefined;

  if (includeRider) {
    riderGroup = new THREE.Group();

    const jacketMat = noMerge
      ? new THREE.MeshStandardMaterial({ color: opts.jacketColor ?? 0xc2a888, roughness: 0.72 })
      : getStaticPaintMat(opts.jacketColor ?? 0xc2a888);
    const helmetMat = noMerge
      ? new THREE.MeshStandardMaterial({
          color: opts.helmetColor ?? 0x18181b,
          metalness: 0.35,
          roughness: 0.22,
        })
      : getStaticPaintMat(opts.helmetColor ?? 0x18181b);
    const pantsMat =
      opts.pantsColor !== undefined
        ? noMerge
          ? new THREE.MeshStandardMaterial({ color: opts.pantsColor, roughness: 0.85 })
          : getStaticPaintMat(opts.pantsColor)
        : mats.motoPantsMat;

    const driverMesh = buildSmoothMotoRider({
      g,
      mats,
      useGeo,
      jacketMat,
      helmetMat,
      pantsMat,
      isScooter,
      isPassenger: false,
    });
    riderGroup.add(driverMesh);

    if (includePassenger) {
      const pJacketMat = noMerge
        ? new THREE.MeshStandardMaterial({
            color: opts.passengerJacketColor ?? 0xe8b4cb,
            roughness: 0.74,
          })
        : getStaticPaintMat(opts.passengerJacketColor ?? 0xe8b4cb);
      const pHelmetMat = noMerge
        ? new THREE.MeshStandardMaterial({
            color: opts.passengerHelmetColor ?? 0xdc2626,
            metalness: 0.35,
            roughness: 0.22,
          })
        : getStaticPaintMat(opts.passengerHelmetColor ?? 0xdc2626);
      const pPantsMat =
        opts.passengerPantsColor !== undefined
          ? noMerge
            ? new THREE.MeshStandardMaterial({ color: opts.passengerPantsColor, roughness: 0.85 })
            : getStaticPaintMat(opts.passengerPantsColor)
          : mats.motoPantsMat;

      const passengerMesh = buildSmoothMotoRider({
        g,
        mats,
        useGeo,
        jacketMat: pJacketMat,
        helmetMat: pHelmetMat,
        pantsMat: pPantsMat,
        isScooter,
        isPassenger: true,
      });
      riderGroup.add(passengerMesh);
    }

    tiltGroup.add(riderGroup);
  }

  return {
    group: root,
    riderGroup,
    wheels,
    headlightMat,
    brakeMat,
    wheelR: g.wheelR,
    halfW: 0.40,
    halfL: 0.92,
  };
}

function mergeSubtreeByMaterial(
  container: THREE.Object3D,
  skipRoots?: Set<THREE.Object3D>
): void {
  container.updateMatrixWorld(true);
  const invContainer = new THREE.Matrix4().copy(container.matrixWorld).invert();
  const relMat = new THREE.Matrix4();

  const buckets = new Map<
    string,
    { mat: THREE.Material; castShadow: boolean; receiveShadow: boolean; meshes: THREE.Mesh[] }
  >();

  const collect = (obj: THREE.Object3D) => {
    if (obj !== container && skipRoots?.has(obj)) return;
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (
        mesh.geometry &&
        mesh.geometry.attributes.position &&
        !Array.isArray(mesh.material)
      ) {
        const mat = mesh.material;
        const attrs = mesh.geometry.attributes;
        const key = `${mat.uuid}|${attrs.normal ? 1 : 0}|${attrs.uv ? 1 : 0}|${attrs.color ? 1 : 0}|${mesh.castShadow ? 1 : 0}|${mesh.receiveShadow ? 1 : 0}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            mat,
            castShadow: mesh.castShadow,
            receiveShadow: mesh.receiveShadow,
            meshes: [],
          };
          buckets.set(key, bucket);
        }
        bucket.meshes.push(mesh);
      }
    }
    const children = obj.children;
    for (let i = 0; i < children.length; i++) {
      collect(children[i]);
    }
  };
  collect(container);

  const allowedAttrs = new Set(['position', 'normal', 'uv', 'color']);

  buckets.forEach((bucket) => {
    if (bucket.meshes.length < 2) return;
    const clones: THREE.BufferGeometry[] = [];
    for (let i = 0; i < bucket.meshes.length; i++) {
      const mesh = bucket.meshes[i];
      let g = mesh.geometry.clone();
      if (g.index !== null) {
        const nonIdx = g.toNonIndexed();
        g.dispose();
        g = nonIdx;
      }
      for (const attrName of Object.keys(g.attributes)) {
        if (!allowedAttrs.has(attrName)) {
          g.deleteAttribute(attrName);
        }
      }
      g.morphAttributes = {};
      relMat.multiplyMatrices(invContainer, mesh.matrixWorld);
      g.applyMatrix4(relMat);
      clones.push(g);
    }

    const merged = mergeGeometries(clones, false);
    for (let i = 0; i < clones.length; i++) clones[i].dispose();
    if (!merged) return;

    for (let i = 0; i < bucket.meshes.length; i++) {
      const m = bucket.meshes[i];
      if (m.parent) m.parent.remove(m);
    }
    const mergedMesh = new THREE.Mesh(merged, bucket.mat);
    mergedMesh.castShadow = bucket.castShadow;
    mergedMesh.receiveShadow = bucket.receiveShadow;
    mergedMesh.matrixAutoUpdate = false;
    mergedMesh.updateMatrix();
    container.add(mergedMesh);
  });

  // Prune empty non-skipped groups left behind after merging
  const pruneEmpty = (obj: THREE.Object3D): boolean => {
    for (let i = obj.children.length - 1; i >= 0; i--) {
      const child = obj.children[i];
      if (skipRoots?.has(child)) continue;
      if (!(child as THREE.Mesh).isMesh && pruneEmpty(child)) {
        obj.remove(child);
      }
    }
    return obj !== container && obj.children.length === 0;
  };
  pruneEmpty(container);
}

/**
 * Compacts a dynamic city car or motorbike (built with `noMerge: true`) by merging
 * static chassis meshes, wheel sub-meshes, and rider sub-meshes by material.
 * Preserves live wheel spin (`wheels`) and rider group transforms while reducing
 * draw calls by ~65–75% per active vehicle.
 */
export function compactDynamicVehicleMeshes(
  root: THREE.Group,
  wheels: THREE.Object3D[],
  riderGroup?: THREE.Group
): void {
  const skipSet = new Set<THREE.Object3D>(wheels);
  if (riderGroup) skipSet.add(riderGroup);

  for (let i = 0; i < wheels.length; i++) {
    mergeSubtreeByMaterial(wheels[i]);
  }
  if (riderGroup) {
    mergeSubtreeByMaterial(riderGroup);
  }
  mergeSubtreeByMaterial(root, skipSet);
}

