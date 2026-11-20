import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import { buildCityCarMesh } from './CityVehicleMeshBuilder';

export interface LuxuryParkResidencesBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  windowGlowMats: THREE.MeshStandardMaterial[];
  lampGlowMats: THREE.MeshStandardMaterial[];
  basementStripMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  basementPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  updateNightLighting: (lampFactor: number, isAfter11PM: boolean) => void;
}

export interface LuxuryParkResidencesPlacementConfig {
  offsetX: number;
  offsetZ: number;
  seedOffset?: number;
}

/**
 * THE ROYAL RESIDENCES — Chi nhánh Đường Bạch Đằng (kế bên Phê La Bạch Đằng):
 * - B1 Underground Parking Ramp & Level 2 Infinity Pool Podium: X = 3.6 .. 15.8, Z = -109.1 .. -70.3
 * - 19-Story Luxury Apartment Tower + Grand Lobby: X = 16.0 .. 43.0 (2.0m West of Phê La at X = 45.0), Z = -103.8 .. -74.3
 * - Facing: North (-Z) directly onto Đường Bạch Đằng & Sông Hàn
 */
export const ROYAL_RESIDENCES_BACH_DANG_PLACEMENT: LuxuryParkResidencesPlacementConfig = {
  offsetX: -54.0,
  offsetZ: -146.3,
  seedOffset: 73,
};

export interface ResidencesCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

/**
 * Generates an aspect-matched high-DPI architectural canvas texture (1:1 aspect ratio, crisp typography).
 */
function createArchitecturalSignTex(
  widthM: number,
  heightM: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  baseWidthPx = 768
): THREE.CanvasTexture {
  const w = baseWidthPx;
  const h = Math.max(64, Math.round((w * heightM) / Math.max(0.25, widthM)));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates veined Calacatta marble texture for the Porte-Cochere, Grand Lobby & feature walls.
 */
function createCalacattaMarbleTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f5f2ec';
  ctx.fillRect(0, 0, w, h);

  // Subtle stone tile grid
  ctx.strokeStyle = 'rgba(180, 168, 148, 0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const pos = (i * w) / 4;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(w, pos);
    ctx.stroke();
  }

  // Soft golden-grey mineral veins
  let seed = 4092026;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let v = 0; v < 14; v++) {
    ctx.strokeStyle = v % 3 === 0 ? 'rgba(196, 164, 102, 0.22)' : 'rgba(130, 126, 118, 0.18)';
    ctx.lineWidth = 1 + rand() * 2.2;
    ctx.beginPath();
    let x = rand() * w;
    let y = rand() * h;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.35) * 110;
      y += (rand() - 0.35) * 110;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates brushed parking floor texture with subtle tile/expansion joints & clean epoxy sheen.
 */
function createEpoxyGarageFloorTex(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#262b34';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = (i * w) / 4;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(w, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds a pitched slab connecting (zStart, yStart) to (zEnd, yEnd) cleanly along Z.
 */
function createRampSlab(
  width: number,
  thickness: number,
  x: number,
  zStart: number,
  yStart: number,
  zEnd: number,
  yEnd: number,
  mat: THREE.Material
): THREE.Mesh {
  const dz = zEnd - zStart;
  const dy = yEnd - yStart;
  const length = Math.hypot(dz, dy);
  const angleX = Math.atan2(-dy, dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, length), mat);
  mesh.position.set(x, (yStart + yEnd) / 2 - thickness * 0.5, (zStart + zEnd) / 2);
  mesh.rotation.x = angleX;
  return mesh;
}

/**
 * Builds a sleek static luxury parked automobile for the B1 underground parking bays.
 */
function createStaticLuxuryParkedCar(
  paintHex: number,
  isSuv: boolean,
  isCoupe: boolean
): THREE.Group {
  return buildCityCarMesh({
    color: paintHex,
    variant: isSuv ? 'suv' : isCoupe ? 'coupe' : 'sedan',
    headlightIntensity: 0.75,
    brakeIntensity: 0.5,
    noMerge: false,
  }).group;
}

/**
 * Builds the "THE ROYAL RESIDENCES" ultra-luxury apartment tower & B1 underground parking basement
 * located immediately East of Green Park:
 * - B1 Basement & Ramp Wing: X = 57.6 .. 69.8, Ramp Cut Z = 35.4 .. 54.0, B1 Hall Z = 54.0 .. 76.0 (Y = -3.60)
 * - Level 2 Sky Club & Infinity Pool Podium: atop B1 garage at Y = 4.20
 * - 19-Story Luxury Apartment Tower: X = 70.0 .. 97.0, Z = 44.5 .. 72.0 (Height ~ 69.3m)
 */
export function createLuxuryParkResidencesStructure(
  placement?: LuxuryParkResidencesPlacementConfig
): LuxuryParkResidencesBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const windowGlowMats: THREE.MeshStandardMaterial[] = [];
  const lampGlowMats: THREE.MeshStandardMaterial[] = [];
  const basementStripMats: THREE.MeshStandardMaterial[] = [];
  const interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }> = [];
  const basementPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }> = [];

  // Shared Architectural Materials
  const travertineMat = new THREE.MeshStandardMaterial({
    color: 0xf2ece1,
    roughness: 0.74,
    metalness: 0.04,
  });
  const travertineWarmMat = new THREE.MeshStandardMaterial({
    color: 0xe6dccb,
    roughness: 0.78,
    metalness: 0.05,
  });
  const darkBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x1c222d,
    roughness: 0.56,
    metalness: 0.18,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xc9a86a,
    metalness: 0.78,
    roughness: 0.26,
  });
  const bronzeDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b3126,
    metalness: 0.65,
    roughness: 0.36,
  });
  const walnutWoodMat = new THREE.MeshStandardMaterial({
    color: 0x6d4728,
    roughness: 0.68,
    metalness: 0.06,
  });
  const marbleTex = createCalacattaMarbleTex();
  const marbleFloorMat = new THREE.MeshStandardMaterial({
    map: marbleTex,
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.08,
  });
  const onyxBacklitMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.42,
    roughness: 0.35,
  });

  const facadeGlassMat = new THREE.MeshStandardMaterial({
    color: 0x9ac6e8,
    transparent: true,
    opacity: 0.34,
    roughness: 0.12,
    metalness: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const balconyGlassMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.44,
    roughness: 0.16,
    metalness: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lobbyGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    metalness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Residential suite interior glow layers (driven cleanly by updateNightLighting for rich warm evening glow)
  const suiteWarmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.08,
    roughness: 0.65,
  });
  const suiteSoftCreamMat = new THREE.MeshStandardMaterial({
    color: 0xfef9e7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.08,
    roughness: 0.72,
  });
  const suiteAmberEveningMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.06,
    roughness: 0.72,
  });
  const suiteDimSlateMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    emissive: 0x334155,
    emissiveIntensity: 0.02,
    roughness: 0.72,
  });
  const suiteCeilingLightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 0.05,
    roughness: 0.2,
  });

  // Architectural Night Facade LED accent materials (vertical ribs, balcony soffits, crown cove, pool rim)
  const pierLedMat = new THREE.MeshStandardMaterial({
    color: 0xe5c158,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.0,
    roughness: 0.22,
    metalness: 0.35,
  });
  const balconyLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde047,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });
  const crownLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.05,
    roughness: 0.18,
  });
  const poolLedMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.15,
    roughness: 0.2,
  });

  // Exterior & Lobby lamp glow materials
  const architecturalGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde047,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });
  lampGlowMats.push(architecturalGlowMat);

  // Greenery materials for podium sky terrace & biophilic balconies
  const planterSoilMat = new THREE.MeshStandardMaterial({ color: 0x3f2e1e, roughness: 0.95 });
  const foliageDarkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.84 });
  const foliageLightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.82 });
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x7c6a58, roughness: 0.9 });

  // B1 Basement materials
  const epoxyFloorTex = createEpoxyGarageFloorTex();
  const b1EpoxyFloorMat = new THREE.MeshStandardMaterial({
    map: epoxyFloorTex,
    color: 0xffffff,
    roughness: 0.26,
    metalness: 0.14,
  });
  const b1RampMat = new THREE.MeshStandardMaterial({
    color: 0x2d333d,
    roughness: 0.76,
    metalness: 0.08,
  });
  const b1WallCreamMat = new THREE.MeshStandardMaterial({ color: 0xd6d3cb, roughness: 0.82 });
  const b1WallDarkMat = new THREE.MeshStandardMaterial({ color: 0x222832, roughness: 0.72 });
  const b1ConcreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const b1GoldLineMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45 });
  const b1WhiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
  const b1LedStripMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef3c7,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  basementStripMats.push(b1LedStripMat);
  const b1RampArrowMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xfacc15,
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  basementStripMats.push(b1RampArrowMat);

  // =====================================================================
  // PART 1: LUXURY UNDERGROUND B1 PARKING BASEMENT & RAMP (X = 57.6..69.8)
  // =====================================================================
  const RAMP_CENTER_X = 63.8;
  const RAMP_WEST_X = 59.8;
  const RAMP_EAST_X = 67.8;

  // 1A. Sloped 2-Lane Granite/Concrete Ramp (Z = 37.20 @ Y = -0.26 down to Z = 54.0 @ Y = -3.60)
  const rampSlab = createRampSlab(7.6, 0.28, RAMP_CENTER_X, 37.20, -0.26, 54.0, -3.60, b1RampMat);
  staticGroup.add(rampSlab);

  // Ramp side kerbs & champagne-gold center divider line
  [RAMP_WEST_X + 0.22, RAMP_EAST_X - 0.22].forEach((kx) => {
    const kerb = createRampSlab(0.24, 0.16, kx, 37.20, -0.15, 54.0, -3.49, b1GoldLineMat);
    staticGroup.add(kerb);
  });
  const rampDivider = createRampSlab(0.12, 0.02, RAMP_CENTER_X, 37.5, -0.25, 53.6, -3.52, b1GoldLineMat);
  staticGroup.add(rampDivider);

  // Illuminated directional chevron arrows on IN lane (X = 61.9, pointing +Z down) & OUT lane (X = 65.7, pointing -Z up)
  [
    { x: 61.9, dirZ: 1 },
    { x: 65.7, dirZ: -1 },
  ].forEach((lane) => {
    [40.5, 45.0, 49.5].forEach((az) => {
      const t = (az - 37.20) / (54.0 - 37.20);
      const ay = THREE.MathUtils.lerp(-0.26, -3.60, t) + 0.03;
      const shaft = createRampSlab(0.14, 0.02, lane.x, az - 0.5, ay + 0.09, az + 0.5, ay - 0.09, b1RampArrowMat);
      staticGroup.add(shaft);
      [-1, 1].forEach((side) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.48), b1RampArrowMat);
        wing.position.set(lane.x + side * 0.17, ay - lane.dirZ * 0.05, az + lane.dirZ * 0.42);
        wing.rotation.y = side * lane.dirZ * -0.62;
        wing.rotation.x = 0.17;
        staticGroup.add(wing);
      });
    });
  });

  // Stainless steel drainage trench grate across curb threshold (Z = 37.35)
  const grate = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.04, 0.36), bronzeDarkMat);
  grate.position.set(RAMP_CENTER_X, -0.25, 37.35);
  staticGroup.add(grate);

  // 1B. Sidewalk Retaining Trench Walls & Frameless Glass Balustrades (Z = 37.2..44.0)
  [RAMP_WEST_X - 0.08, RAMP_EAST_X + 0.08].forEach((rx) => {
    const retaining = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.1, 6.8), darkBasaltMat);
    retaining.position.set(rx, -1.85, 40.6);
    staticGroup.add(retaining);

    const coping = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 6.85), champagneGoldMat);
    coping.position.set(rx, 0.12, 40.6);
    staticGroup.add(coping);

    [37.5, 39.6, 41.7, 43.7].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.92, 8), champagneGoldMat);
      post.position.set(rx, 0.64, pz);
      staticGroup.add(post);
    });
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.35, 8), champagneGoldMat);
    topRail.rotation.x = Math.PI / 2;
    topRail.position.set(rx, 1.09, 40.6);
    staticGroup.add(topRail);

    const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.78, 6.15), lobbyGlassMat);
    glassPanel.position.set(rx, 0.60, 40.6);
    staticGroup.add(glassPanel);

    // Curbside protective bronze & gold bollard
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.88, 12), bronzeDarkMat);
    bollard.position.set(rx, 0.44, 37.45);
    staticGroup.add(bollard);
    const bollardRing = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.10, 12), champagneGoldMat);
    bollardRing.position.set(rx, 0.76, 37.45);
    staticGroup.add(bollardRing);
  });

  // 1C. Luxury B1 Portal Arch, Skylight Canopy, Security Kiosk & Barrier Gates (Z = 42.5..54.0)
  // Left & Right Travertine Portal Piers framing the garage entry at Z = 43.8
  [
    { x: 58.65, w: 2.1 }, // West corner pier (X = 57.6..59.7)
    { x: 68.85, w: 2.1 }, // East pier joining the main tower (X = 67.8..69.9)
  ].forEach((p) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(p.w, 4.4, 2.6), travertineMat);
    pier.position.set(p.x, 2.0, 44.3);
    staticGroup.add(pier);

    const pierTrim = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.08, 0.16, 2.7), champagneGoldMat);
    pierTrim.position.set(p.x, 4.18, 44.3);
    staticGroup.add(pierTrim);
  });

  // Architectural Portal Header Beam over the ramp entrance (proud in front of piers by 0.14m to eliminate coplanar Z-fighting)
  const portalBeam = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.15, 2.48), darkBasaltMat);
  portalBeam.position.set(63.75, 3.62, 44.10);
  staticGroup.add(portalBeam);

  const portalGoldLip = new THREE.Mesh(new THREE.BoxGeometry(12.35, 0.12, 2.66), champagneGoldMat);
  portalGoldLip.position.set(63.75, 4.24, 44.10);
  staticGroup.add(portalGoldLip);

  // High-DPI Backlit B1 Garage Fascia Sign facing -Z (Street & Green Park view)
  const b1FasciaTex = createArchitecturalSignTex(
    10.8,
    0.96,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#0f131a');
      grad.addColorStop(0.5, '#19212d');
      grad.addColorStop(1, '#0f131a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      // P Badge on left with clean margin from border and right-side text
      const badgeX = 36;
      const badgeY = 28;
      const badgeSize = h - 56;
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.strokeRect(badgeX, badgeY, badgeSize, badgeSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 76px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', badgeX + badgeSize / 2, h / 2 + 2);

      const textLeft = badgeX + badgeSize + 32;
      const textRight = w - 36;
      const textCenterX = (textLeft + textRight) / 2;
      const maxTextW = textRight - textLeft;

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 54px "Helvetica Neue", system-ui, sans-serif';
      ctx.fillText('THE ROYAL RESIDENCES  •  HẦM XE B1', textCenterX, h * 0.36, maxTextW);

      ctx.fillStyle = '#e5c158';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.fillText('BÃI ĐỖ XE CƯ DÂN & VIP   ↓   CHIỀU CAO TỐI ĐA 2.2M', textCenterX, h * 0.72, maxTextW);
    },
    2048
  );
  const b1FasciaMat = new THREE.MeshStandardMaterial({
    map: b1FasciaTex,
    emissive: 0xffffff,
    emissiveMap: b1FasciaTex,
    emissiveIntensity: 0.42,
    roughness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  neonMats.push(b1FasciaMat);

  const b1FasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 0.96), b1FasciaMat);
  b1FasciaSign.position.set(63.75, 3.62, 42.80);
  b1FasciaSign.rotation.y = Math.PI;
  staticGroup.add(b1FasciaSign);

  // Glass & Champagne-Bronze Louver Ramp Canopy sheltering the descent from Z = 43.0..54.0
  const rampCanopyGlass = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.08, 11.2), facadeGlassMat);
  rampCanopyGlass.position.set(RAMP_CENTER_X, 3.92, 48.6);
  staticGroup.add(rampCanopyGlass);
  for (let lz = 44.4; lz <= 53.6; lz += 1.15) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 0.08), champagneGoldMat);
    fin.position.set(RAMP_CENTER_X, 3.84, lz);
    staticGroup.add(fin);
  }

  // Automatic Barrier Gates + Divider Island along the sloped ramp (Z = 47.0)
  const gateY = THREE.MathUtils.lerp(-0.26, -3.60, (47.0 - 37.20) / (54.0 - 37.20));
  const island = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 2.2), darkBasaltMat);
  island.position.set(RAMP_CENTER_X, gateY + 0.12, 47.0);
  staticGroup.add(island);

  [-0.14, 0.14].forEach((dx, idx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.96, 0.34), bronzeDarkMat);
    post.position.set(RAMP_CENTER_X + dx * 1.1, gateY + 0.65, 47.0 + (idx === 0 ? -0.4 : 0.4));
    staticGroup.add(post);

    const armSide = idx === 0 ? -1 : 1;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.07, 0.07), champagneGoldMat);
    arm.position.set(RAMP_CENTER_X + armSide * 1.45, gateY + 0.98, 47.0 + (idx === 0 ? -0.4 : 0.4));
    staticGroup.add(arm);
  });

  // Sleek Security Concierge Booth tucked on West shoulder (X = 58.65, Z = 43.1)
  const booth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.35, 1.5), darkBasaltMat);
  booth.position.set(58.65, 1.18, 43.1);
  staticGroup.add(booth);
  const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.25, 1.52), lobbyGlassMat);
  boothGlass.position.set(58.65, 1.55, 43.1);
  staticGroup.add(boothGlass);
  const boothGlow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), b1LedStripMat);
  boothGlow.position.set(58.65, 2.22, 43.1);
  staticGroup.add(boothGlow);

  // 1D. Deep Underground B1 Parking Hall (X = 57.8..69.8, Z = 54.0..76.0, Floor Y = -3.60, Ceiling Y = +2.20)
  const b1Floor = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.3, 22.4), b1EpoxyFloorMat);
  b1Floor.position.set(63.8, -3.75, 65.0);
  staticGroup.add(b1Floor);

  // Tunnel flanking concrete retaining walls along the sloped ramp (Z = 44.0..54.0) & deep hall (Z = 54.0..76.0)
  const b1WestWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.8, 32.2), b1WallCreamMat);
  b1WestWall.position.set(57.7, 0.1, 60.0);
  staticGroup.add(b1WestWall);

  const b1EastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.8, 32.2), b1WallCreamMat);
  b1EastWall.position.set(69.85, 0.1, 60.0);
  staticGroup.add(b1EastWall);

  const b1BackWall = new THREE.Mesh(new THREE.BoxGeometry(12.4, 7.8, 0.4), b1WallDarkMat);
  b1BackWall.position.set(63.8, 0.1, 76.0);
  staticGroup.add(b1BackWall);

  // Dark basalt protective dado band along B1 walls
  const b1DadoBack = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1.1, 0.08), b1WallDarkMat);
  b1DadoBack.position.set(63.8, -3.05, 75.76);
  staticGroup.add(b1DadoBack);

  // Structural B1 columns with gold hazard bumpers
  [
    [59.8, 56.5],
    [67.8, 56.5],
    [59.8, 66.0],
    [67.8, 66.0],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.46, 5.8, 0.46), b1ConcreteMat);
    col.position.set(cx, -0.7, cz);
    staticGroup.add(col);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.9, 0.50), b1GoldLineMat);
    bumper.position.set(cx, -3.15, cz);
    staticGroup.add(bumper);
  });

  // B1 Interior Ceiling & Warm Linear LED Lighting Strips (visible directly down the ramp from the sidewalk!)
  const b1Ceiling = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.35, 22.4), b1WallDarkMat);
  b1Ceiling.position.set(63.8, 2.35, 65.0);
  staticGroup.add(b1Ceiling);

  [61.6, 66.0].forEach((lx) => {
    [55.5, 60.5, 65.5, 70.5].forEach((lz) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 3.2), b1LedStripMat);
      strip.position.set(lx, 2.12, lz);
      staticGroup.add(strip);
    });
  });

  // B1 Back Wall Directional Wayfinding Sign (facing -Z toward ramp viewer)
  const b1WayfindingTex = createArchitecturalSignTex(
    8.4,
    0.9,
    (ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HẦM ĐỖ XE B1  •  KHU VỰC VIP CƯ DÂN  •  SẢNH THANG MÁY →', w / 2, h / 2, w - 96);
    },
    1680
  );
  const b1WayfindingMat = new THREE.MeshStandardMaterial({
    map: b1WayfindingTex,
    emissive: 0xffffff,
    emissiveMap: b1WayfindingTex,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  neonMats.push(b1WayfindingMat);

  const b1WayfindingSign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.9), b1WayfindingMat);
  b1WayfindingSign.position.set(63.8, 0.45, 75.66);
  b1WayfindingSign.rotation.y = Math.PI;
  staticGroup.add(b1WayfindingSign);

  // VIP Elevator Access Vestibule Door on East B1 Wall (X = 69.55, Z = 65.0) leading into the Tower core
  const elevFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 2.8), champagneGoldMat);
  elevFrame.position.set(69.58, -2.25, 65.0);
  staticGroup.add(elevFrame);
  const elevDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 2.4), lobbyGlassMat);
  elevDoor.position.set(69.54, -2.35, 65.0);
  staticGroup.add(elevDoor);
  const elevHeader = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 2.2), b1LedStripMat);
  elevHeader.position.set(69.53, -0.75, 65.0);
  staticGroup.add(elevHeader);

  // Convex traffic mirror at far end of ramp turnaround (Z = 75.6)
  const mirrorPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), b1ConcreteMat);
  mirrorPole.position.set(60.6, -2.3, 75.4);
  staticGroup.add(mirrorPole);
  const mirrorDisc = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.08 })
  );
  mirrorDisc.rotation.x = -Math.PI / 2;
  mirrorDisc.position.set(60.6, -1.65, 75.35);
  staticGroup.add(mirrorDisc);

  // Painted Gold/White Luxury Parking Bay Lines & 3 Parked Static Luxury Cars in B1 Hall
  [
    { x: 60.4, z: 62.5, rotY: Math.PI, color: 0xf8fafc, isSuv: false, isCoupe: false }, // Bay B1-01: Pearl Flagship Sedan
    { x: 63.8, z: 71.2, rotY: Math.PI / 2, color: 0x111827, isSuv: false, isCoupe: true }, // Bay B1-02: Obsidian GT Coupe
    { x: 66.8, z: 61.5, rotY: Math.PI, color: 0x064e3b, isSuv: true, isCoupe: false }, // Bay B1-03: Emerald Luxury SUV
  ].forEach((bay) => {
    const bayWidth = 2.65;
    const bayLen = 5.1;
    const lineGrp = new THREE.Group();
    lineGrp.position.set(bay.x, -3.59, bay.z);
    lineGrp.rotation.y = bay.rotY;

    [-bayWidth / 2, bayWidth / 2].forEach((lx) => {
      const sideStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.11, bayLen), b1WhiteLineMat);
      sideStripe.rotation.x = -Math.PI / 2;
      sideStripe.position.set(lx, 0, 0);
      lineGrp.add(sideStripe);
    });
    const stopBar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.11, 0.16), b1GoldLineMat);
    stopBar.position.set(0, 0.055, -bayLen * 0.38);
    lineGrp.add(stopBar);
    staticGroup.add(lineGrp);

    const car = createStaticLuxuryParkedCar(bay.color, bay.isSuv, bay.isCoupe);
    car.position.set(bay.x, -3.60, bay.z);
    car.rotation.y = bay.rotY;
    staticGroup.add(car);
  });

  // 1 centered non-shadow PointLight inside B1 hall + ramp throat so the underground looks rich & well-lit
  const b1Light = new THREE.PointLight(0xfef3c7, 14.0, 32.0, 1.05);
  b1Light.position.set(63.8, 0.5, 62.0);
  basementPointLights.push({ light: b1Light, dayInt: 14.0, nightInt: 36.0 });

  // =====================================================================
  // PART 2: LEVEL 2 SKY CLUB & INFINITY POOL PODIUM (Atop B1 Garage, Y = 4.2)
  // =====================================================================
  const PODIUM_Y = 4.2;
  // Solid Podium Slab over the B1 garage (X = 57.5..69.9, Z = 43.2..76.2)
  const podiumDeckSlab = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.55, 33.0), travertineMat);
  podiumDeckSlab.position.set(63.7, PODIUM_Y - 0.275, 59.7);
  staticGroup.add(podiumDeckSlab);

  const podiumGoldBand = new THREE.Mesh(new THREE.BoxGeometry(12.55, 0.14, 33.15), champagneGoldMat);
  podiumGoldBand.position.set(63.7, PODIUM_Y + 0.04, 59.7);
  staticGroup.add(podiumGoldBand);

  // Warm Teak Pool Deck Platform (X = 58.0..69.4, Z = 44.5..75.0)
  const teakDeck = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.08, 30.5), walnutWoodMat);
  teakDeck.position.set(63.7, PODIUM_Y + 0.04, 59.75);
  staticGroup.add(teakDeck);

  // Turquoise Infinity Lap Pool (X = 60.2..67.2, Z = 51.0..68.0)
  const poolCoping = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 17.6), travertineWarmMat);
  poolCoping.position.set(63.7, PODIUM_Y + 0.14, 59.5);
  staticGroup.add(poolCoping);

  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.22,
  });
  const poolWater = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.18, 16.9), poolWaterMat);
  poolWater.position.set(63.7, PODIUM_Y + 0.19, 59.5);
  staticGroup.add(poolWater);

  // Turquoise LED perimeter strip glowing under infinity pool coping at night
  [-3.48, 3.48].forEach((pxOff) => {
    const poolSideLed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 16.9), poolLedMat);
    poolSideLed.position.set(63.7 + pxOff, PODIUM_Y + 0.26, 59.5);
    staticGroup.add(poolSideLed);
  });
  const skyPoolLight = new THREE.PointLight(0x38bdf8, 0.0, 26.0, 1.0);
  skyPoolLight.position.set(63.7, PODIUM_Y + 2.8, 59.5);
  interiorPointLights.push({ light: skyPoolLight, dayInt: 0.0, nightInt: 24.0 });

  // Sun Loungers & Parasols on the Sky Pool Terrace
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.75 });
  [53.0, 56.5, 62.5, 66.0].forEach((lz) => {
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 1.85), walnutWoodMat);
    lounger.position.set(58.85, PODIUM_Y + 0.16, lz);
    staticGroup.add(lounger);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.10, 1.75), cushionMat);
    pad.position.set(58.85, PODIUM_Y + 0.32, lz);
    staticGroup.add(pad);
  });

  // Frameless Glass Terrace Railings around West & Front edge of Podium Sky Deck
  const frontTerraceRail = new THREE.Mesh(new THREE.BoxGeometry(12.2, 1.05, 0.06), balconyGlassMat);
  frontTerraceRail.position.set(63.7, PODIUM_Y + 0.56, 43.3);
  staticGroup.add(frontTerraceRail);
  const frontTerraceCap = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.06, 0.10), champagneGoldMat);
  frontTerraceCap.position.set(63.7, PODIUM_Y + 1.10, 43.3);
  staticGroup.add(frontTerraceCap);

  const westTerraceRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 32.6), balconyGlassMat);
  westTerraceRail.position.set(57.6, PODIUM_Y + 0.56, 59.6);
  staticGroup.add(westTerraceRail);
  const westTerraceCap = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 32.7), champagneGoldMat);
  westTerraceCap.position.set(57.6, PODIUM_Y + 1.10, 59.6);
  staticGroup.add(westTerraceCap);

  // Tropical Potted Palms along the Sky Terrace overlooking Green Park
  [46.5, 55.0, 64.5, 72.5].forEach((pz) => {
    const pot = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 1.15), darkBasaltMat);
    pot.position.set(58.5, PODIUM_Y + 0.36, pz);
    staticGroup.add(pot);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 2.3, 8), palmTrunkMat);
    trunk.position.set(58.5, PODIUM_Y + 1.65, pz);
    staticGroup.add(trunk);

    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), foliageDarkMat);
    crown1.scale.set(1.25, 0.65, 1.25);
    crown1.position.set(58.5, PODIUM_Y + 2.85, pz);
    staticGroup.add(crown1);

    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), foliageLightMat);
    crown2.scale.set(1.15, 0.55, 1.15);
    crown2.position.set(58.6, PODIUM_Y + 3.25, pz + 0.15);
    staticGroup.add(crown2);
  });

  // =====================================================================
  // PART 3: 19-STORY LUXURY APARTMENT TOWER (X = 70.0..97.0, Z = 44.5..72.0)
  // =====================================================================
  const TOWER_MIN_X = 70.0;
  const TOWER_MAX_X = 97.0;
  const TOWER_CENTER_X = 83.5; // width = 27.0m
  const TOWER_WIDTH = 27.0;
  const TOWER_FRONT_Z = 44.5;
  const TOWER_BACK_Z = 72.0;
  const TOWER_DEPTH = TOWER_BACK_Z - TOWER_FRONT_Z; // 27.5m
  const TOWER_CENTER_Z = (TOWER_FRONT_Z + TOWER_BACK_Z) / 2; // 58.25

  // 3A. Forecourt Plaza & Cantilevered Marble-and-Gold Porte-Cochere (Z = 39.2..44.5)
  const forecourtApron = new THREE.Mesh(new THREE.BoxGeometry(27.4, 0.08, 3.0), marbleFloorMat);
  forecourtApron.position.set(TOWER_CENTER_X, 0.02, 43.2);
  staticGroup.add(forecourtApron);

  // Flanking manicured landscape planters beside the lobby entrance
  [73.2, 93.8].forEach((px) => {
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.56, 1.35), darkBasaltMat);
    planterBox.position.set(px, 0.28, 43.65);
    staticGroup.add(planterBox);

    const soil = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.08, 1.05), planterSoilMat);
    soil.position.set(px, 0.54, 43.65);
    staticGroup.add(soil);

    const hedge = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.52, 0.86), foliageDarkMat);
    hedge.position.set(px, 0.78, 43.65);
    staticGroup.add(hedge);

    [-1.7, 0, 1.7].forEach((ox) => {
      const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), foliageLightMat);
      shrub.position.set(px + ox, 1.15, 43.65);
      staticGroup.add(shrub);
    });
  });

  // Low Champagne-Gold Bollard Lights framing the grand drop-off walkway
  [77.0, 80.2, 86.8, 90.0].forEach((bx) => {
    const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.72, 10), bronzeDarkMat);
    bPost.position.set(bx, 0.36, 42.75);
    staticGroup.add(bPost);
    const bGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.14, 10), architecturalGlowMat);
    bGlow.position.set(bx, 0.68, 42.75);
    staticGroup.add(bGlow);
  });

  // Porte-Cochere Cantilevered Luxury Canopy (X = 76.2..90.8, Z = 39.2..44.5, Underside Y = 4.15)
  const canopyWidth = 14.6;
  const canopyDepth = 5.4;
  const canopyMain = new THREE.Mesh(new THREE.BoxGeometry(canopyWidth, 0.55, canopyDepth), darkBasaltMat);
  canopyMain.position.set(TOWER_CENTER_X, 4.45, 41.85);
  staticGroup.add(canopyMain);

  const canopyGoldCrown = new THREE.Mesh(new THREE.BoxGeometry(canopyWidth + 0.18, 0.14, canopyDepth + 0.18), champagneGoldMat);
  canopyGoldCrown.position.set(TOWER_CENTER_X, 4.78, 41.85);
  staticGroup.add(canopyGoldCrown);

  const canopyWalnutSoffit = new THREE.Mesh(new THREE.BoxGeometry(canopyWidth - 0.5, 0.06, canopyDepth - 0.5), walnutWoodMat);
  canopyWalnutSoffit.position.set(TOWER_CENTER_X, 4.16, 41.85);
  staticGroup.add(canopyWalnutSoffit);

  // Recessed warm downlights under the Porte-Cochere soffit
  for (let dx = -5.2; dx <= 5.2; dx += 2.6) {
    [40.4, 42.6].forEach((dz) => {
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12), architecturalGlowMat);
      puck.position.set(TOWER_CENTER_X + dx, 4.13, dz);
      staticGroup.add(puck);
    });
  }

  // Two Sleek Tapered Travertine-and-Gold Porte-Cochere Columns at Z = 42.6 (keeps sidewalk Z = 35.5..42.5 clear!)
  [77.2, 89.8].forEach((cx) => {
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.72), darkBasaltMat);
    colBase.position.set(cx, 0.225, 42.65);
    staticGroup.add(colBase);
    const colShaft = new THREE.Mesh(new THREE.BoxGeometry(0.56, 3.8, 0.56), travertineMat);
    colShaft.position.set(cx, 2.35, 42.65);
    staticGroup.add(colShaft);
    const colCap = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.64), champagneGoldMat);
    colCap.position.set(cx, 4.12, 42.65);
    staticGroup.add(colCap);
  });

  // High-DPI Illuminated Porte-Cochere Sign facing -Z (Street View), cleanly inset on canopy fascia
  const mainSignTex = createArchitecturalSignTex(
    13.8,
    0.48,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#0f131a');
      grad.addColorStop(0.5, '#1b2331');
      grad.addColorStop(1, '#0f131a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 46px "Helvetica Neue", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('T H E   R O Y A L   R E S I D E N C E S', w / 2, h * 0.36, w - 96);

      ctx.fillStyle = '#e5c158';
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillText(
        'LUXURY SKY APARTMENTS  •  PRIVATE CONCIERGE & RESIDENCES',
        w / 2,
        h * 0.72,
        w - 96
      );
    },
    3600
  );
  const mainSignMat = new THREE.MeshStandardMaterial({
    map: mainSignTex,
    emissive: 0xffffff,
    emissiveMap: mainSignTex,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  neonMats.push(mainSignMat);

  const porteSign = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 0.48), mainSignMat);
  porteSign.position.set(TOWER_CENTER_X, 4.44, 39.12);
  porteSign.rotation.y = Math.PI;
  staticGroup.add(porteSign);

  // 3B. Double-Height 5-Star Marble Lobby (Y = 0..5.4, Z = 44.5..58.0, Visible Through Panoramic Glass)
  const LOBBY_H = 5.4;
  // Marble lobby floor
  const lobbyFloor = new THREE.Mesh(new THREE.BoxGeometry(TOWER_WIDTH - 0.4, 0.16, 16.0), marbleFloorMat);
  lobbyFloor.position.set(TOWER_CENTER_X, 0.08, 52.5);
  staticGroup.add(lobbyFloor);

  // Lobby structural enclosure walls (West, East, Rear Core)
  const lobbyWestWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, LOBBY_H, TOWER_DEPTH), travertineMat);
  lobbyWestWall.position.set(TOWER_MIN_X + 0.325, LOBBY_H / 2, TOWER_CENTER_Z);
  staticGroup.add(lobbyWestWall);

  const lobbyEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.65, LOBBY_H, TOWER_DEPTH), travertineMat);
  lobbyEastWall.position.set(TOWER_MAX_X - 0.325, LOBBY_H / 2, TOWER_CENTER_Z);
  staticGroup.add(lobbyEastWall);

  const lobbyBackWall = new THREE.Mesh(new THREE.BoxGeometry(TOWER_WIDTH, LOBBY_H, 11.2), travertineWarmMat);
  lobbyBackWall.position.set(TOWER_CENTER_X, LOBBY_H / 2, 66.4);
  staticGroup.add(lobbyBackWall);

  // Lobby Backlit Honey-Onyx Concierge Feature Wall (at Z = 58.6, facing -Z)
  const onyxFeature = new THREE.Mesh(new THREE.BoxGeometry(10.4, 4.6, 0.22), onyxBacklitMat);
  onyxFeature.position.set(TOWER_CENTER_X, 2.6, 58.5);
  staticGroup.add(onyxFeature);

  // Vertical bronze flutes flanking the onyx feature wall
  for (let fx = -6.0; fx <= 6.0; fx += 0.55) {
    if (Math.abs(fx) < 5.0) continue;
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.8, 0.26), champagneGoldMat);
    flute.position.set(TOWER_CENTER_X + fx, 2.6, 58.5);
    staticGroup.add(flute);
  }

  // Walnut & Calacatta Concierge Reception Desk (X = 83.5, Z = 53.5)
  const deskBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.05, 0.95), walnutWoodMat);
  deskBody.position.set(TOWER_CENTER_X, 0.55, 53.5);
  staticGroup.add(deskBody);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 1.1), marbleFloorMat);
  deskTop.position.set(TOWER_CENTER_X, 1.12, 53.5);
  staticGroup.add(deskTop);
  const deskGoldKick = new THREE.Mesh(new THREE.BoxGeometry(4.86, 0.12, 0.98), champagneGoldMat);
  deskGoldKick.position.set(TOWER_CENTER_X, 0.12, 53.5);
  staticGroup.add(deskGoldKick);

  // VIP Lounge Velvet Seating Groups (East & West sides of Lobby)
  const velvetEmeraldMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.78 });
  const velvetCreamMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.75 });
  [
    { x: 75.5, z: 50.8, mat: velvetEmeraldMat },
    { x: 91.5, z: 50.8, mat: velvetCreamMat },
  ].forEach((lounge) => {
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.52, 1.05), lounge.mat);
    sofa.position.set(lounge.x, 0.34, lounge.z + 1.2);
    staticGroup.add(sofa);
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.52, 0.26), lounge.mat);
    sofaBack.position.set(lounge.x, 0.72, lounge.z + 1.6);
    staticGroup.add(sofaBack);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 16), marbleFloorMat);
    table.position.set(lounge.x, 0.48, lounge.z - 0.1);
    staticGroup.add(table);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.42, 12), champagneGoldMat);
    tableLeg.position.set(lounge.x, 0.24, lounge.z - 0.1);
    staticGroup.add(tableLeg);
  });

  // Grand Multi-Tier Halo Ring Chandelier suspended in center of Lobby (Y = 4.35..4.85)
  [
    { r: 1.9, y: 4.75 },
    { r: 1.3, y: 4.42 },
    { r: 0.75, y: 4.10 },
  ].forEach((ring) => {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(ring.r, 0.055, 10, 32), champagneGoldMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(TOWER_CENTER_X, ring.y, 49.8);
    staticGroup.add(halo);

    const haloGlow = new THREE.Mesh(new THREE.TorusGeometry(ring.r, 0.032, 8, 32), architecturalGlowMat);
    haloGlow.rotation.x = Math.PI / 2;
    haloGlow.position.set(TOWER_CENTER_X, ring.y - 0.03, 49.8);
    staticGroup.add(haloGlow);
  });

  // Outdoor Porte-Cochere Real Estate ("SÀN GIAO DỊCH BĐS") Welcome Stand beside Entrance (X = 79.4, Z = 43.35)
  const standPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.12), darkBasaltMat);
  standPost.position.set(79.4, 0.72, 43.35);
  staticGroup.add(standPost);
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.42), champagneGoldMat);
  standBase.position.set(79.4, 0.10, 43.35);
  staticGroup.add(standBase);
  const welcomeSignTex = createArchitecturalSignTex(1.05, 1.35, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 18;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(36, 48, w - 72, 160);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MỞ BÁN', w / 2, 128);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 66px system-ui, sans-serif';
    ctx.fillText('ROYAL', w / 2, 330);
    ctx.fillText('RESIDENCES', w / 2, 420);
    ctx.fillStyle = '#e5c158';
    ctx.font = '700 44px system-ui, sans-serif';
    ctx.fillText('• SKY VILLAS •', w / 2, 560);
    ctx.fillText('• PENTHOUSES •', w / 2, 640);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 38px system-ui, sans-serif';
    ctx.fillText('TƯ VẤN BĐS TRỰC TIẾP', w / 2, 790);
    ctx.fillStyle = '#22c55e';
    ctx.font = '800 42px system-ui, sans-serif';
    ctx.fillText('LÃI SUẤT 0% • VIP', w / 2, 890);
  });
  const welcomeSignMat = new THREE.MeshStandardMaterial({
    map: welcomeSignTex,
    emissive: 0xffffff,
    emissiveMap: welcomeSignTex,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  neonMats.push(welcomeSignMat);
  const welcomeStandTiltGroup = new THREE.Group();
  welcomeStandTiltGroup.position.set(79.4, 1.48, 43.35);
  welcomeStandTiltGroup.rotation.x = -0.18;
  const welcomeSignBoard = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.15, 0.06), darkBasaltMat);
  welcomeStandTiltGroup.add(welcomeSignBoard);
  const welcomeSignFace = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.08), welcomeSignMat);
  welcomeSignFace.position.set(0, 0, -0.042);
  welcomeSignFace.rotation.y = Math.PI;
  welcomeStandTiltGroup.add(welcomeSignFace);
  staticGroup.add(welcomeStandTiltGroup);

  // Lobby Architectural Scale Model ("SA BÀN THE ROYAL RESIDENCES") in West-Center Lobby (X = 78.6, Z = 48.2)
  const sabanBase = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.84, 1.55), walnutWoodMat);
  sabanBase.position.set(78.6, 0.58, 48.2);
  staticGroup.add(sabanBase);
  const sabanTrim = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.07, 1.64), champagneGoldMat);
  sabanTrim.position.set(78.6, 1.02, 48.2);
  staticGroup.add(sabanTrim);
  const sabanPad = new THREE.Mesh(new THREE.BoxGeometry(2.20, 0.04, 1.40), foliageDarkMat);
  sabanPad.position.set(78.6, 1.07, 48.2);
  staticGroup.add(sabanPad);
  const sabanPool = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.85), poolWaterMat);
  sabanPool.position.set(78.0, 1.14, 48.2);
  staticGroup.add(sabanPool);
  const sabanPodium = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.14, 1.05), travertineMat);
  sabanPodium.position.set(78.0, 1.12, 48.2);
  staticGroup.add(sabanPodium);
  const sabanMiniTower = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.78), onyxBacklitMat);
  sabanMiniTower.position.set(78.85, 1.70, 48.2);
  staticGroup.add(sabanMiniTower);
  const sabanMiniCrown = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.10, 0.84), champagneGoldMat);
  sabanMiniCrown.position.set(78.85, 2.36, 48.2);
  staticGroup.add(sabanMiniCrown);

  // East Lobby Private BĐS Sales Consultation Desk (X = 91.5, Z = 55.2)
  const salesDeskBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 0.90), walnutWoodMat);
  salesDeskBody.position.set(91.5, 0.55, 55.2);
  staticGroup.add(salesDeskBody);
  const salesDeskTop = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.07, 0.98), marbleFloorMat);
  salesDeskTop.position.set(91.5, 0.97, 55.2);
  staticGroup.add(salesDeskTop);
  const salesMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.05), darkBasaltMat);
  salesMonitor.position.set(91.1, 1.18, 55.2);
  staticGroup.add(salesMonitor);
  const salesFolio = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.26), champagneGoldMat);
  salesFolio.position.set(91.85, 1.02, 55.02);
  staticGroup.add(salesFolio);
  const clientChairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.50), velvetCreamMat);
  clientChairSeat.position.set(91.5, 0.56, 54.05);
  staticGroup.add(clientChairSeat);
  const clientChairBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.12), velvetCreamMat);
  clientChairBack.position.set(91.5, 0.84, 53.85);
  staticGroup.add(clientChairBack);

  // Illuminated Real Estate Pricing & Floorplan Gallery Board on East Rear Lobby Wall (X = 91.5, Z = 58.38, facing -Z)
  const priceBoardTex = createArchitecturalSignTex(
    4.6,
    2.3,
    (ctx, w, h) => {
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      ctx.fillStyle = '#e5c158';
      ctx.font = '800 56px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('THE ROYAL RESIDENCES  •  BẢNG GIÁ BĐS', w / 2, 108, w - 120);

      const rows = [
        { label: '2PN SKY SUITE (88m²)', price: '$420,000', tag: 'VIEW CÔNG VIÊN' },
        { label: '3PN ROYAL CORNER (135m²)', price: '$680,000', tag: 'BAN CÔNG KÉP' },
        { label: 'SKY PENTHOUSE VILLA (280m²)', price: '$1,850,000', tag: 'HỒ BƠI RIÊNG' },
      ];
      rows.forEach((r, idx) => {
        const y = 265 + idx * 175;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(64, y - 62, w - 128, 134);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 44px system-ui, sans-serif';
        ctx.fillText(r.label, 96, y - 16);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 32px system-ui, sans-serif';
        ctx.fillText(r.tag, 96, y + 36);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fbbf24';
        ctx.font = '800 52px system-ui, sans-serif';
        ctx.fillText(r.price, w - 96, y + 6);
      });
    },
    1536
  );
  const priceBoardMat = new THREE.MeshStandardMaterial({
    map: priceBoardTex,
    emissive: 0xffffff,
    emissiveMap: priceBoardTex,
    emissiveIntensity: 0.45,
    roughness: 0.28,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  neonMats.push(priceBoardMat);
  const priceBoardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.75, 2.45, 0.12), champagneGoldMat);
  priceBoardFrame.position.set(92.4, 2.55, 58.5);
  staticGroup.add(priceBoardFrame);
  const priceBoardFace = new THREE.Mesh(new THREE.PlaneGeometry(4.55, 2.25), priceBoardMat);
  priceBoardFace.position.set(92.4, 2.55, 58.39);
  priceBoardFace.rotation.y = Math.PI;
  staticGroup.add(priceBoardFace);

  // Twin Glass Scenic Elevator Shafts at West Lobby Core (X = 72.2 & 74.6, Z = 56.5)
  [72.4, 75.0].forEach((ex) => {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.9, LOBBY_H, 1.9), lobbyGlassMat);
    shaft.position.set(ex, LOBBY_H / 2, 56.6);
    staticGroup.add(shaft);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 2.05), champagneGoldMat);
    frame.position.set(ex, 3.1, 56.6);
    staticGroup.add(frame);
  });

  // Panoramic Front Lobby Curtain-Wall Glass & Grand Double Entry Doors (Z = 44.5)
  [
    { x: 75.2, w: 9.8 },
    { x: 91.8, w: 9.8 },
  ].forEach((win) => {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(win.w, LOBBY_H - 0.3, 0.10), lobbyGlassMat);
    glass.position.set(win.x, LOBBY_H / 2, TOWER_FRONT_Z);
    staticGroup.add(glass);
  });

  // Grand Double Bronze-Framed Glass Doors in Center (X = 80.5..86.5)
  const centerEntryTransom = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.9, 0.12), lobbyGlassMat);
  centerEntryTransom.position.set(TOWER_CENTER_X, 4.35, TOWER_FRONT_Z);
  staticGroup.add(centerEntryTransom);
  const transomBar = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 0.22), champagneGoldMat);
  transomBar.position.set(TOWER_CENTER_X, 3.35, TOWER_FRONT_Z);
  staticGroup.add(transomBar);

  [-1.35, 1.35].forEach((dx) => {
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.55, 3.25, 0.08), lobbyGlassMat);
    doorLeaf.position.set(TOWER_CENTER_X + dx, 1.65, TOWER_FRONT_Z);
    staticGroup.add(doorLeaf);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.15, 8), champagneGoldMat);
    handle.position.set(TOWER_CENTER_X + dx * 0.22, 1.35, TOWER_FRONT_Z - 0.08);
    staticGroup.add(handle);
  });

  // Vertical bronze mullions along the ground floor facade
  for (let mx = TOWER_MIN_X; mx <= TOWER_MAX_X + 0.05; mx += 3.375) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.24, LOBBY_H, 0.38), bronzeDarkMat);
    mullion.position.set(mx, LOBBY_H / 2, TOWER_FRONT_Z);
    staticGroup.add(mullion);
  }

  // 1 centered interior PointLight illuminating the Grand Lobby + 1 warm Porte-Cochere exterior light
  const lobbyLight = new THREE.PointLight(0xffe7b8, 14.0, 30.0, 1.0);
  lobbyLight.position.set(TOWER_CENTER_X, 4.0, 50.5);
  interiorPointLights.push({ light: lobbyLight, dayInt: 14.0, nightInt: 52.0 });

  const porteCochereLight = new THREE.PointLight(0xffe4b5, 0.0, 24.0, 1.0);
  porteCochereLight.position.set(TOWER_CENTER_X, 3.85, 41.8);
  interiorPointLights.push({ light: porteCochereLight, dayInt: 0.0, nightInt: 30.0 });

  // 3C. 16 Upper Residential Floors (Levels 2–17: Y = 5.4 .. 58.2, 3.3m floor-to-floor)
  const TYPICAL_FLOORS = 16;
  const FLOOR_H = 3.3;
  const BASE_Y = LOBBY_H; // 5.4
  const UPPER_TOP_Y = BASE_Y + TYPICAL_FLOORS * FLOOR_H; // 58.2

  // Solid structural inner core (set back 1.6m inside the curtain glass so rooms & balconies have deep 3D shadow relief)
  const coreHeight = UPPER_TOP_Y - BASE_Y;
  const coreMesh = new THREE.Mesh(
    new THREE.BoxGeometry(TOWER_WIDTH - 1.4, coreHeight, TOWER_DEPTH - 2.4),
    travertineWarmMat
  );
  coreMesh.position.set(TOWER_CENTER_X, BASE_Y + coreHeight / 2, TOWER_CENTER_Z + 0.8);
  staticGroup.add(coreMesh);

  // Full-height structural fluted travertine piers framing the 4 architectural facade bays
  // Piers at X = 70.45, 76.95, 83.5, 90.05, 96.55
  const pierXs = [70.45, 76.95, 83.5, 90.05, 96.55];
  pierXs.forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.15, coreHeight + 0.6, 1.35), travertineMat);
    pier.position.set(px, BASE_Y + coreHeight / 2, TOWER_FRONT_Z + 0.15);
    staticGroup.add(pier);

    const goldRib = new THREE.Mesh(new THREE.BoxGeometry(0.16, coreHeight + 0.6, 1.42), champagneGoldMat);
    goldRib.position.set(px, BASE_Y + coreHeight / 2, TOWER_FRONT_Z + 0.15);
    staticGroup.add(goldRib);

    // Slim architectural warm LED vertical accent proud in front of goldRib (front Z=43.94 -> strip at Z=43.91, zero Z-fighting)
    const pierLedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.07, coreHeight + 0.4, 0.04), pierLedMat);
    pierLedStrip.position.set(px, BASE_Y + coreHeight / 2, TOWER_FRONT_Z - 0.59);
    staticGroup.add(pierLedStrip);

    // Side & Rear vertical architectural piers for 360-degree sculptural silhouette
    const rearPier = new THREE.Mesh(new THREE.BoxGeometry(1.15, coreHeight + 0.6, 1.15), travertineMat);
    rearPier.position.set(px, BASE_Y + coreHeight / 2, TOWER_BACK_Z - 0.45);
    staticGroup.add(rearPier);
  });

  // Side vertical flank piers on West (X = 70.3) & East (X = 96.7) facades
  [51.5, 58.5, 65.5].forEach((sz) => {
    [
      { x: 70.3, ledX: 69.80 },
      { x: 96.7, ledX: 97.20 },
    ].forEach((side) => {
      const sidePier = new THREE.Mesh(new THREE.BoxGeometry(0.95, coreHeight + 0.6, 1.15), travertineMat);
      sidePier.position.set(side.x, BASE_Y + coreHeight / 2, sz);
      staticGroup.add(sidePier);

      const sideLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, coreHeight + 0.4, 0.07), pierLedMat);
      sideLed.position.set(side.ledX, BASE_Y + coreHeight / 2, sz);
      staticGroup.add(sideLed);
    });
  });

  // Deterministic suite lighting pattern across floors & bays (richly illuminated at night)
  for (let f = 0; f < TYPICAL_FLOORS; f++) {
    const floorY = BASE_Y + f * FLOOR_H;

    // Wrap-around architectural floor slab + champagne-gold fascia trim
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(TOWER_WIDTH + 0.4, 0.28, TOWER_DEPTH + 0.4),
      travertineMat
    );
    slab.position.set(TOWER_CENTER_X, floorY + 0.14, TOWER_CENTER_Z);
    staticGroup.add(slab);

    const goldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(TOWER_WIDTH + 0.48, 0.10, TOWER_DEPTH + 0.48),
      champagneGoldMat
    );
    goldTrim.position.set(TOWER_CENTER_X, floorY + 0.22, TOWER_CENTER_Z);
    staticGroup.add(goldTrim);

    // 4 Front Residential Bays per floor (between pierXs[i] and pierXs[i+1])
    for (let b = 0; b < 4; b++) {
      const bayCenterX = (pierXs[b] + pierXs[b + 1]) / 2;
      const bayW = pierXs[b + 1] - pierXs[b] - 1.15; // ~ 5.35m wide panoramic bay

      // Recessed apartment interior glow/backing wall behind glass (~88% warmly lit at night!)
      const roll = ((f * 7 + b * 13) % 16) / 16;
      const bayBackMat =
        roll > 0.56
          ? suiteWarmGlowMat
          : roll > 0.30
          ? suiteSoftCreamMat
          : roll > 0.12
          ? suiteAmberEveningMat
          : suiteDimSlateMat;
      const suiteBack = new THREE.Mesh(new THREE.BoxGeometry(bayW, FLOOR_H - 0.35, 0.16), bayBackMat);
      suiteBack.position.set(bayCenterX, floorY + FLOOR_H / 2 + 0.05, TOWER_FRONT_Z + 1.05);
      staticGroup.add(suiteBack);

      // Warm interior ceiling cove light strip visible through the glass for lit apartments
      if (roll > 0.12) {
        const ceilingCove = new THREE.Mesh(
          new THREE.BoxGeometry(bayW * 0.72, 0.11, 0.16),
          suiteCeilingLightMat
        );
        ceilingCove.position.set(bayCenterX, floorY + FLOOR_H - 0.34, TOWER_FRONT_Z + 0.78);
        staticGroup.add(ceilingCove);
      }

      // Floor-to-ceiling tinted curtain wall glass (single-plane to minimize transparent overdraw) + slim horizontal bronze mullion
      const bayGlass = new THREE.Mesh(new THREE.PlaneGeometry(bayW, FLOOR_H - 0.32), facadeGlassMat);
      bayGlass.position.set(bayCenterX, floorY + FLOOR_H / 2 + 0.05, TOWER_FRONT_Z + 0.42);
      staticGroup.add(bayGlass);

      const midMullion = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.08, 0.16), bronzeDarkMat);
      midMullion.position.set(bayCenterX, floorY + 1.25, TOWER_FRONT_Z + 0.42);
      staticGroup.add(midMullion);

      // Staggered Projecting Private Sky Balconies (creates luxury undulating resort silhouette)
      const hasFrontBalcony = (f + b) % 2 === 0;
      if (hasFrontBalcony) {
        const balcSlab = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.1, 0.22, 1.35), travertineMat);
        balcSlab.position.set(bayCenterX, floorY + 0.16, TOWER_FRONT_Z - 0.58);
        staticGroup.add(balcSlab);

        const balcSoffit = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.18, 0.06, 1.25), walnutWoodMat);
        balcSoffit.position.set(bayCenterX, floorY + 0.04, TOWER_FRONT_Z - 0.58);
        staticGroup.add(balcSoffit);

        // Warm recessed linear LED under balcony soffit (zero Z-fighting, sits cleanly below soffit)
        const balcLed = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.68, 0.03, 0.08), balconyLedMat);
        balcLed.position.set(bayCenterX, floorY - 0.015, TOWER_FRONT_Z - 1.02);
        staticGroup.add(balcLed);

        const balcGlass = new THREE.Mesh(new THREE.PlaneGeometry(bayW - 0.14, 1.02), balconyGlassMat);
        balcGlass.position.set(bayCenterX, floorY + 0.78, TOWER_FRONT_Z - 1.22);
        staticGroup.add(balcGlass);

        const balcHandrail = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.1, 0.06, 0.09), champagneGoldMat);
        balcHandrail.position.set(bayCenterX, floorY + 1.30, TOWER_FRONT_Z - 1.22);
        staticGroup.add(balcHandrail);

        // Staggered Biophilic Sky-Garden Planter greenery every 3rd floor
        if (f % 3 === 1) {
          const planter = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.42, 0.44, 0.48), darkBasaltMat);
          planter.position.set(bayCenterX - bayW * 0.22, floorY + 0.48, TOWER_FRONT_Z - 0.86);
          staticGroup.add(planter);

          const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), foliageDarkMat);
          bush.scale.set(1.8, 0.85, 0.9);
          bush.position.set(bayCenterX - bayW * 0.22, floorY + 0.88, TOWER_FRONT_Z - 0.86);
          staticGroup.add(bush);
        }
      }
    }

    // Side East & West Facade Curtain Glazing (richly illuminated at night from Green Park & East side too)
    [
      { x: 70.12, side: -1 },
      { x: 96.88, side: 1 },
    ].forEach((sideInfo) => {
      [48.2, 55.0, 62.0, 68.8].forEach((sz, idx) => {
        const sRoll = ((f * 5 + idx * 9) % 12) / 12;
        const sBackMat =
          sRoll > 0.55
            ? suiteWarmGlowMat
            : sRoll > 0.25
            ? suiteSoftCreamMat
            : sRoll > 0.10
            ? suiteAmberEveningMat
            : suiteDimSlateMat;
        const sBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, FLOOR_H - 0.35, 5.4), sBackMat);
        sBack.position.set(sideInfo.x - sideInfo.side * 0.55, floorY + FLOOR_H / 2, sz);
        staticGroup.add(sBack);

        if (sRoll > 0.10) {
          const sCove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 3.8), suiteCeilingLightMat);
          sCove.position.set(sideInfo.x - sideInfo.side * 0.38, floorY + FLOOR_H - 0.34, sz);
          staticGroup.add(sCove);
        }

        const sGlass = new THREE.Mesh(new THREE.PlaneGeometry(5.4, FLOOR_H - 0.35), facadeGlassMat);
        sGlass.rotation.y = Math.PI / 2;
        sGlass.position.set(sideInfo.x - sideInfo.side * 0.12, floorY + FLOOR_H / 2, sz);
        staticGroup.add(sGlass);
      });
    });
  }

  // 3D. Stepped Double-Height Sky Penthouse Villas & Illuminated Crown (Y = 58.2 .. 69.3)
  const PENT_Y = UPPER_TOP_Y; // 58.2
  const pentSlab = new THREE.Mesh(
    new THREE.BoxGeometry(TOWER_WIDTH + 0.5, 0.35, TOWER_DEPTH + 0.5),
    travertineMat
  );
  pentSlab.position.set(TOWER_CENTER_X, PENT_Y + 0.175, TOWER_CENTER_Z);
  staticGroup.add(pentSlab);

  const pentTerraceRail = new THREE.Mesh(
    new THREE.BoxGeometry(TOWER_WIDTH + 0.2, 1.1, 0.08),
    balconyGlassMat
  );
  pentTerraceRail.position.set(TOWER_CENTER_X, PENT_Y + 0.85, TOWER_FRONT_Z - 0.1);
  staticGroup.add(pentTerraceRail);

  // Recessed Penthouse Villa Pavilion (X = 72.5..94.5, Z = 46.8..69.8, Height = 6.2m)
  const PENT_W = 22.0;
  const PENT_D = 23.0;
  const PENT_H = 6.2;
  const pentCore = new THREE.Mesh(new THREE.BoxGeometry(PENT_W - 0.8, PENT_H, PENT_D - 0.8), darkBasaltMat);
  pentCore.position.set(TOWER_CENTER_X, PENT_Y + PENT_H / 2 + 0.2, TOWER_CENTER_Z);
  staticGroup.add(pentCore);

  // Penthouse Panoramic Warm-Lit Villa Glass (Front + West + East)
  const pentFrontGlow = new THREE.Mesh(new THREE.BoxGeometry(PENT_W - 1.6, PENT_H - 0.8, 0.16), suiteWarmGlowMat);
  pentFrontGlow.position.set(TOWER_CENTER_X, PENT_Y + PENT_H / 2 + 0.2, 46.9);
  staticGroup.add(pentFrontGlow);

  const pentFrontGlass = new THREE.Mesh(new THREE.BoxGeometry(PENT_W - 1.2, PENT_H - 0.5, 0.10), facadeGlassMat);
  pentFrontGlass.position.set(TOWER_CENTER_X, PENT_Y + PENT_H / 2 + 0.2, 46.7);
  staticGroup.add(pentFrontGlass);

  [-1, 1].forEach((side) => {
    const pentSideGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, PENT_H - 0.8, PENT_D - 2.4), suiteSoftCreamMat);
    pentSideGlow.position.set(TOWER_CENTER_X + side * (PENT_W / 2 - 0.35), PENT_Y + PENT_H / 2 + 0.2, TOWER_CENTER_Z);
    staticGroup.add(pentSideGlow);

    const pentSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, PENT_H - 0.5, PENT_D - 2.0), facadeGlassMat);
    pentSideGlass.position.set(TOWER_CENTER_X + side * (PENT_W / 2 - 0.12), PENT_Y + PENT_H / 2 + 0.2, TOWER_CENTER_Z);
    staticGroup.add(pentSideGlass);
  });

  // Penthouse Sky Terrace Greenery
  [73.5, 78.5, 88.5, 93.5].forEach((gx) => {
    const treePot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.1), darkBasaltMat);
    treePot.position.set(gx, PENT_Y + 0.65, 45.2);
    staticGroup.add(treePot);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), foliageLightMat);
    bush.scale.set(1.2, 0.9, 1.0);
    bush.position.set(gx, PENT_Y + 1.35, 45.2);
    staticGroup.add(bush);
  });

  // Sculptural Illuminated Architectural Crown Pergola (Y = 64.6 .. 69.3)
  const CROWN_Y = PENT_Y + PENT_H + 0.2; // 64.6
  const crownRoof = new THREE.Mesh(new THREE.BoxGeometry(PENT_W + 2.4, 0.55, PENT_D + 2.2), travertineMat);
  crownRoof.position.set(TOWER_CENTER_X, CROWN_Y + 0.28, TOWER_CENTER_Z);
  staticGroup.add(crownRoof);

  const crownGoldBand = new THREE.Mesh(new THREE.BoxGeometry(PENT_W + 2.5, 0.16, PENT_D + 2.3), champagneGoldMat);
  crownGoldBand.position.set(TOWER_CENTER_X, CROWN_Y + 0.62, TOWER_CENTER_Z);
  staticGroup.add(crownGoldBand);

  // Warm Golden Halo Cove LEDs wrapping Front, West & East of the Penthouse Crown
  const crownFrontLed = new THREE.Mesh(new THREE.BoxGeometry(PENT_W + 2.3, 0.08, 0.12), crownLedMat);
  crownFrontLed.position.set(TOWER_CENTER_X, CROWN_Y - 0.06, 45.62);
  staticGroup.add(crownFrontLed);
  [-1, 1].forEach((side) => {
    const crownSideLed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, PENT_D + 2.1), crownLedMat);
    crownSideLed.position.set(TOWER_CENTER_X + side * (PENT_W / 2 + 1.16), CROWN_Y - 0.06, TOWER_CENTER_Z);
    staticGroup.add(crownSideLed);
  });

  // Vertical Champagne-Gold Crown Fins & Glowing Halo Spire Frame
  for (let cx = -10.5; cx <= 10.5; cx += 3.5) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 1.4), champagneGoldMat);
    fin.position.set(TOWER_CENTER_X + cx, CROWN_Y + 2.45, 47.0);
    staticGroup.add(fin);
  }
  const topCrownBeam = new THREE.Mesh(new THREE.BoxGeometry(PENT_W + 1.2, 0.65, 1.6), darkBasaltMat);
  topCrownBeam.position.set(TOWER_CENTER_X, CROWN_Y + 4.25, 47.0);
  staticGroup.add(topCrownBeam);

  const topCrownLed = new THREE.Mesh(new THREE.BoxGeometry(PENT_W + 1.3, 0.10, 0.12), crownLedMat);
  topCrownLed.position.set(TOWER_CENTER_X, CROWN_Y + 4.63, 46.22);
  staticGroup.add(topCrownLed);

  // Glowing Architectural Rooftop Signboard ("ROYAL RESIDENCES")
  const crownSignTex = createArchitecturalSignTex(
    18.0,
    1.15,
    (ctx, w, h) => {
      ctx.fillStyle = '#0b0f17';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e5c158';
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, w - 28, h - 28);

      ctx.fillStyle = '#fef3c7';
      ctx.font = '800 76px "Helvetica Neue", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R O Y A L   R E S I D E N C E S', w / 2, h / 2, w - 120);
    },
    2880
  );
  const crownSignMat = new THREE.MeshStandardMaterial({
    map: crownSignTex,
    emissive: 0xffffff,
    emissiveMap: crownSignTex,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  neonMats.push(crownSignMat);

  const crownSign = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 1.15), crownSignMat);
  crownSign.position.set(TOWER_CENTER_X, CROWN_Y + 4.25, 46.12);
  crownSign.rotation.y = Math.PI;
  staticGroup.add(crownSign);

  const updateNightLighting = (lampFactor: number, isAfter11PM: boolean) => {
    const f = THREE.MathUtils.clamp(lampFactor, 0, 1);
    // Warm golden apartment suites light up richly at dusk/night
    suiteWarmGlowMat.emissiveIntensity = THREE.MathUtils.lerp(0.06, 1.55, f);
    suiteSoftCreamMat.emissiveIntensity = THREE.MathUtils.lerp(0.06, 1.32, f);
    suiteAmberEveningMat.emissiveIntensity = THREE.MathUtils.lerp(
      0.04,
      isAfter11PM ? 0.38 : 1.12,
      f
    );
    suiteDimSlateMat.emissiveIntensity = THREE.MathUtils.lerp(0.02, 0.16, f);
    suiteCeilingLightMat.emissiveIntensity = THREE.MathUtils.lerp(0.05, 2.45, f);

    // Lower curtain-wall glass opacity slightly at night so glowing suites read cleanly
    facadeGlassMat.opacity = THREE.MathUtils.lerp(0.34, 0.16, f);

    // Architectural LED highlights (vertical piers, balcony soffits, penthouse crown, sky pool)
    pierLedMat.emissiveIntensity = f > 0.04 ? 0.2 + f * 1.45 : 0.0;
    balconyLedMat.emissiveIntensity = f > 0.04 ? 0.25 + f * 1.85 : 0.0;
    crownLedMat.emissiveIntensity = THREE.MathUtils.lerp(0.05, 2.35, f);
    poolLedMat.emissiveIntensity = THREE.MathUtils.lerp(0.15, 2.1, f);
    poolWaterMat.emissiveIntensity = THREE.MathUtils.lerp(0.28, 1.15, f);
    onyxBacklitMat.emissiveIntensity = THREE.MathUtils.lerp(0.38, 1.25, f);
  };

  if (placement) {
    staticGroup.position.set(placement.offsetX, 0, placement.offsetZ);
    interiorPointLights.forEach((entry) => {
      entry.light.position.x += placement.offsetX;
      entry.light.position.z += placement.offsetZ;
    });
    basementPointLights.forEach((entry) => {
      entry.light.position.x += placement.offsetX;
      entry.light.position.z += placement.offsetZ;
    });
  }

  return {
    staticGroup,
    neonMats,
    windowGlowMats,
    lampGlowMats,
    basementStripMats,
    interiorPointLights,
    basementPointLights,
    updateNightLighting,
  };
}

// =====================================================================
// PART 4: ANIMATED REAL ESTATE ("SALER BĐS") & VIP BUYER NPC CONTROLLER
// =====================================================================
interface RoyalNpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  glbHandle: GlbHumanHandle;
}

interface StationaryRoyalActor extends RoyalNpcRig {
  baseY: number;
  phaseOffset: number;
  role: 'outdoor_saler' | 'reception_saler' | 'saban_saler' | 'desk_saler' | 'seated_client' | 'admiring_buyer';
}

interface WalkingRoyalActor extends RoyalNpcRig {
  waypoints: Array<{ x: number; z: number; pauseSec: number }>;
  wpIdx: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  pauseTimer: number;
  walkPhase: number;
  isSaler: boolean;
}

export class LuxuryParkResidencesNpcController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private stationaryActors: StationaryRoyalActor[] = [];
  private walkingActors: WalkingRoyalActor[] = [];
  private readonly seedOffset: number;

  constructor(helpers: ResidencesCharacterHelpers, placement?: LuxuryParkResidencesPlacementConfig) {
    this.rootGroup.userData.noMerge = true;
    this.seedOffset = placement?.seedOffset ?? 0;
    if (placement) {
      this.rootGroup.position.set(placement.offsetX, 0, placement.offsetZ);
    }
    this.buildStationarySalersAndClients(helpers);
    this.buildWalkingTourActors(helpers);
  }

  private buildNpcRig(
    paletteIndex: number,
    helpers: ResidencesCharacterHelpers,
    opts: {
      role: 'saler_navy' | 'saler_charcoal' | 'buyer';
      withBrochure?: boolean;
      seated?: boolean;
      walker?: boolean;
      useCashier?: boolean;
    }
  ): RoyalNpcRig {
    const idx = paletteIndex + this.seedOffset;
    const skinPalette = [
      { color: 0xffdbac, hex: '#ffdbac' },
      { color: 0xf5cfa0, hex: '#f5cfa0' },
      { color: 0xf1c27d, hex: '#f1c27d' },
      { color: 0xe0ac69, hex: '#e0ac69' },
    ];
    const hairPalette = [0x111111, 0x2b1d0c, 0x1e293b, 0x4b2c14];
    const buyerShirtPalette = [0x1d4ed8, 0x0f766e, 0x9333ea, 0xe11d48];

    const skin = skinPalette[idx % skinPalette.length];
    const hair = hairPalette[(idx + 1) % hairPalette.length];

    const suitColor =
      opts.role === 'saler_navy'
        ? 0x0f172a
        : opts.role === 'saler_charcoal'
        ? 0x1f2937
        : buyerShirtPalette[idx % buyerShirtPalette.length];
    const pantsColor = opts.role === 'buyer' ? 0x334155 : 0x090d16;

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.color, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.50 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.72 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.42 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.55 });
    const whiteShirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });

    const group = new THREE.Group();
    group.userData.noMerge = true;

    const hipsGroup = new THREE.Group();
    hipsGroup.position.set(0, 0.84, 0);
    group.add(hipsGroup);

    const buildLeg = (lx: number) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(lx, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.40, 0.145), pantsMat);
      thigh.position.set(0, -0.20, 0);
      hipPivot.add(thigh);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.40, 0);
      hipPivot.add(kneePivot);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.36, 0.135), pantsMat);
      shin.position.set(0, -0.18, 0);
      kneePivot.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.09, 0.22), shoesMat);
      shoe.position.set(0, -0.39, 0.04);
      kneePivot.add(shoe);

      hipsGroup.add(hipPivot);
      return { hipPivot, kneePivot };
    };
    const leftLegPair = buildLeg(-0.1);
    const rightLegPair = buildLeg(0.1);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
    torso.position.set(0, 0.29, 0);
    hipsGroup.add(torso);

    if (opts.role !== 'buyer') {
      const shirtCollar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.25), whiteShirtMat);
      shirtCollar.position.set(0, 0.44, 0.005);
      hipsGroup.add(shirtCollar);

      const necktie = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.27, 0.26), goldAccentMat);
      necktie.position.set(0, 0.36, 0.01);
      hipsGroup.add(necktie);

      const lapelBadge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.038, 0.26), goldAccentMat);
      lapelBadge.position.set(0.12, 0.41, 0.01);
      hipsGroup.add(lapelBadge);
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);
    const faceTex = helpers.createFaceTexture('happy', skin.hex);
    headGroup.add(helpers.createHeadMesh(skinMat, faceTex, 0.23, 0.25, 0.22));
    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.09, 0.24), hairMat);
    hairCap.position.set(0, 0.145, -0.01);
    headGroup.add(hairCap);
    hipsGroup.add(headGroup);

    const buildArm = (ax: number) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(ax, 0.50, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), shirtMat);
      sleeve.position.set(0, -0.11, 0);
      armPivot.add(sleeve);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.24, 0.095), skinMat);
      forearm.position.set(0, -0.32, 0);
      armPivot.add(forearm);
      hipsGroup.add(armPivot);
      return armPivot;
    };
    const leftArm = buildArm(-0.275);
    const rightArm = buildArm(0.275);

    if (opts.withBrochure) {
      const folder = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.32), goldAccentMat);
      folder.position.set(0.02, -0.40, 0.14);
      leftArm.add(folder);
    }

    const spec = opts.useCashier
      ? CASHIER_NPC_MODEL
      : opts.seated
      ? pickSeatedCivilianModel(idx * 3 + 2)
      : opts.walker && opts.role === 'buyer'
      ? pickOutsideNpcModel(idx * 5 + 3)
      : pickStationaryCivilianModel(idx * 3 + (opts.role === 'buyer' ? 2 : 5));
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: group,
      fallbackMeshes: [hipsGroup],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState: opts.seated ? 'Sit' : opts.walker ? 'Walk' : 'Idle',
      phaseOffset: idx * 1.15,
    });

    return {
      group,
      hipsGroup,
      leftLeg: leftLegPair.hipPivot,
      rightLeg: rightLegPair.hipPivot,
      leftKnee: leftLegPair.kneePivot,
      rightKnee: rightLegPair.kneePivot,
      leftArm,
      rightArm,
      headGroup,
      glbHandle,
    };
  }

  private buildStationarySalersAndClients(helpers: ResidencesCharacterHelpers) {
    // 1. Outdoor Forecourt Welcome Saler BĐS #1 right under the Porte-Cochere Canopy (X = 80.7, Z = 43.2)
    // Clearly visible from the street and beside the "MỞ BÁN ROYAL RESIDENCES" sign!
    const outdoorSaler = this.buildNpcRig(0, helpers, {
      role: 'saler_navy',
      withBrochure: true,
    });
    outdoorSaler.group.position.set(80.7, 0.06, 43.2);
    outdoorSaler.group.rotation.y = Math.PI + 0.18; // Facing street (-Z), slightly angled toward center
    this.rootGroup.add(outdoorSaler.group);
    this.stationaryActors.push({
      ...outdoorSaler,
      baseY: 0.06,
      phaseOffset: 0.2,
      role: 'outdoor_saler',
    });

    // 2. Central Lobby Reception Lead Saler BĐS #2 behind Walnut Concierge Desk (X = 82.4, Z = 54.45)
    // Visible straight through the front glass entrance doors!
    const receptionSalerLeft = this.buildNpcRig(1, helpers, {
      role: 'saler_navy',
      withBrochure: false,
      useCashier: true,
    });
    receptionSalerLeft.group.position.set(82.4, 0.16, 54.45);
    receptionSalerLeft.group.rotation.y = Math.PI;
    this.rootGroup.add(receptionSalerLeft.group);
    this.stationaryActors.push({
      ...receptionSalerLeft,
      baseY: 0.16,
      phaseOffset: 1.1,
      role: 'reception_saler',
    });

    // 3. Central Lobby Senior Advisor Saler BĐS #3 behind Walnut Concierge Desk (X = 84.6, Z = 54.45)
    const receptionSalerRight = this.buildNpcRig(2, helpers, {
      role: 'saler_charcoal',
      withBrochure: true,
      useCashier: true,
    });
    receptionSalerRight.group.position.set(84.6, 0.16, 54.45);
    receptionSalerRight.group.rotation.y = Math.PI - 0.12;
    this.rootGroup.add(receptionSalerRight.group);
    this.stationaryActors.push({
      ...receptionSalerRight,
      baseY: 0.16,
      phaseOffset: 2.3,
      role: 'reception_saler',
    });

    // 4. Sa Bàn Specialist Saler BĐS #4 presenting the Architectural Tower Model (X = 77.0, Z = 48.2)
    const sabanSaler = this.buildNpcRig(3, helpers, {
      role: 'saler_navy',
      withBrochure: true,
    });
    sabanSaler.group.position.set(77.0, 0.16, 48.2);
    sabanSaler.group.rotation.y = Math.PI * 0.52; // Facing the Sa Bàn & Buyer
    this.rootGroup.add(sabanSaler.group);
    this.stationaryActors.push({
      ...sabanSaler,
      baseY: 0.16,
      phaseOffset: 0.7,
      role: 'saban_saler',
    });

    // 5. East Consultation Desk Saler BĐS #5 advising seated client (X = 91.5, Z = 56.1)
    const deskSaler = this.buildNpcRig(0, helpers, {
      role: 'saler_charcoal',
      withBrochure: true,
    });
    deskSaler.group.position.set(91.5, 0.16, 56.1);
    deskSaler.group.rotation.y = Math.PI;
    this.rootGroup.add(deskSaler.group);
    this.stationaryActors.push({
      ...deskSaler,
      baseY: 0.16,
      phaseOffset: 3.1,
      role: 'desk_saler',
    });

    // 6. VIP Prospective Buyer #1 admiring the Sa Bàn model (X = 80.2, Z = 48.1)
    const sabanBuyer = this.buildNpcRig(1, helpers, { role: 'buyer' });
    sabanBuyer.group.position.set(80.2, 0.16, 48.1);
    sabanBuyer.group.rotation.y = -Math.PI * 0.52;
    this.rootGroup.add(sabanBuyer.group);
    this.stationaryActors.push({
      ...sabanBuyer,
      baseY: 0.16,
      phaseOffset: 1.9,
      role: 'admiring_buyer',
    });

    // 7. Seated Client #2 at East Consultation Desk (X = 91.5, Z = 54.05)
    const seatedDeskClient = this.buildNpcRig(2, helpers, { role: 'buyer', withBrochure: true, seated: true });
    seatedDeskClient.group.position.set(91.5, 0.16, 54.05);
    seatedDeskClient.group.rotation.y = 0;
    seatedDeskClient.hipsGroup.position.y = 0.56;
    seatedDeskClient.leftLeg.rotation.x = -Math.PI / 2;
    seatedDeskClient.rightLeg.rotation.x = -Math.PI / 2;
    seatedDeskClient.leftKnee.rotation.x = Math.PI / 2;
    seatedDeskClient.rightKnee.rotation.x = Math.PI / 2;
    this.rootGroup.add(seatedDeskClient.group);
    this.stationaryActors.push({
      ...seatedDeskClient,
      baseY: 0.16,
      phaseOffset: 2.6,
      role: 'seated_client',
    });

    // 8. Seated VIP Buyer #3 on West Emerald Velvet Sofa (X = 75.5, Z = 51.85)
    const seatedLoungeBuyer = this.buildNpcRig(3, helpers, { role: 'buyer', seated: true });
    seatedLoungeBuyer.group.position.set(75.5, 0.16, 51.85);
    seatedLoungeBuyer.group.rotation.y = Math.PI;
    seatedLoungeBuyer.hipsGroup.position.y = 0.52;
    seatedLoungeBuyer.leftLeg.rotation.x = -Math.PI / 2;
    seatedLoungeBuyer.rightLeg.rotation.x = -Math.PI / 2;
    seatedLoungeBuyer.leftKnee.rotation.x = Math.PI / 2;
    seatedLoungeBuyer.rightKnee.rotation.x = Math.PI / 2;
    this.rootGroup.add(seatedLoungeBuyer.group);
    this.stationaryActors.push({
      ...seatedLoungeBuyer,
      baseY: 0.16,
      phaseOffset: 4.0,
      role: 'seated_client',
    });
  }

  private buildWalkingTourActors(helpers: ResidencesCharacterHelpers) {
    // Escorting Saler BĐS #6 patrolling the Grand Lobby between entrance, Sa Bàn & Pricing Board
    const salerRoute: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: 83.5, z: 46.8, pauseSec: 2.8 },
      { x: 87.8, z: 47.2, pauseSec: 2.2 },
      { x: 88.2, z: 52.2, pauseSec: 3.0 },
      { x: 85.4, z: 51.5, pauseSec: 2.0 },
      { x: 81.2, z: 50.8, pauseSec: 3.2 },
    ];

    // Visiting Homebuyer #4 touring the Grand Lobby & Pricing Board
    const buyerRoute: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: 85.5, z: 46.5, pauseSec: 2.5 },
      { x: 89.2, z: 54.5, pauseSec: 4.2 },
      { x: 87.2, z: 51.2, pauseSec: 2.4 },
      { x: 81.0, z: 47.4, pauseSec: 3.5 },
    ];

    [
      { route: salerRoute, startIdx: 0, palette: 1, speed: 1.05, isSaler: true },
      { route: buyerRoute, startIdx: 1, palette: 0, speed: 1.15, isSaler: false },
    ].forEach((cfg) => {
      const rig = this.buildNpcRig(cfg.palette, helpers, {
        role: cfg.isSaler ? 'saler_navy' : 'buyer',
        withBrochure: cfg.isSaler,
        walker: true,
      });
      const startPt = cfg.route[cfg.startIdx];
      rig.group.position.set(startPt.x, 0.16, startPt.z);
      this.rootGroup.add(rig.group);
      this.walkingActors.push({
        ...rig,
        waypoints: cfg.route,
        wpIdx: (cfg.startIdx + 1) % cfg.route.length,
        x: startPt.x,
        y: 0.16,
        z: startPt.z,
        speed: cfg.speed,
        pauseTimer: 1.5,
        walkPhase: cfg.palette * 1.3,
        isSaler: cfg.isSaler,
      });
    });
  }

  public update(delta: number) {
    const dt = Math.min(delta, 0.1);
    const now = performance.now() * 0.001;

    for (let i = 0; i < this.stationaryActors.length; i++) {
      const a = this.stationaryActors[i];
      const t = now * 1.6 + a.phaseOffset;
      if (a.role === 'outdoor_saler') {
        // Welcoming wave & brochure presentation toward street visitors
        a.rightArm.rotation.x = -0.58 + Math.sin(t * 1.45) * 0.30;
        a.rightArm.rotation.z = 0.18 + Math.cos(t * 1.1) * 0.12;
        a.leftArm.rotation.x = -0.68;
        a.headGroup.rotation.y = Math.sin(t * 0.75) * 0.28;
        a.headGroup.rotation.x = Math.sin(t * 1.4) * 0.05;
      } else if (a.role === 'saban_saler') {
        // Pointing and presenting the apartment tower scale model
        a.rightArm.rotation.x = -0.62 + Math.sin(t * 1.2) * 0.25;
        a.rightArm.rotation.z = -0.15 + Math.cos(t * 0.9) * 0.10;
        a.leftArm.rotation.x = -0.68;
        a.headGroup.rotation.y = Math.sin(t * 0.65) * 0.24;
        a.headGroup.rotation.x = 0.08 + Math.sin(t * 1.5) * 0.05;
      } else if (a.role === 'reception_saler' || a.role === 'desk_saler') {
        // Friendly concierge nods & contract consultation gestures
        a.rightArm.rotation.x = -0.40 + Math.sin(t * 1.6) * 0.16;
        a.leftArm.rotation.x = -0.45 + Math.cos(t * 1.3) * 0.12;
        a.headGroup.rotation.y = Math.sin(t * 0.85) * 0.22;
        a.headGroup.rotation.x = 0.04 + Math.abs(Math.sin(t * 1.2)) * 0.05;
      } else if (a.role === 'admiring_buyer') {
        a.rightArm.rotation.x = -0.22 + Math.sin(t * 1.1) * 0.10;
        a.leftArm.rotation.x = -0.16;
        a.headGroup.rotation.y = Math.sin(t * 0.7) * 0.24;
        a.headGroup.rotation.x = 0.10 + Math.sin(t * 1.2) * 0.04;
      } else {
        // Seated VIP clients reviewing floorplan brochures
        a.leftArm.rotation.x = -0.60 + Math.sin(t * 0.9) * 0.06;
        a.rightArm.rotation.x = -0.50 + Math.cos(t * 1.1) * 0.10;
        a.headGroup.rotation.x = 0.10 + Math.sin(t * 1.1) * 0.05;
        a.headGroup.rotation.y = Math.sin(t * 0.6) * 0.18;
      }
    }

    for (let i = 0; i < this.walkingActors.length; i++) {
      const w = this.walkingActors[i];
      if (w.pauseTimer > 0) {
        w.glbHandle.setAnimState('Idle');
        w.pauseTimer -= dt;
        const lookPhase = now * 1.5 + i;
        w.leftLeg.rotation.x = THREE.MathUtils.lerp(w.leftLeg.rotation.x, 0, dt * 8);
        w.rightLeg.rotation.x = THREE.MathUtils.lerp(w.rightLeg.rotation.x, 0, dt * 8);
        w.leftArm.rotation.x = w.isSaler ? -0.62 : -0.16 + Math.sin(lookPhase) * 0.08;
        w.rightArm.rotation.x = w.isSaler
          ? -0.45 + Math.sin(lookPhase * 1.4) * 0.22
          : -0.22 + Math.cos(lookPhase * 1.1) * 0.10;
        w.headGroup.rotation.y = Math.sin(lookPhase * 0.85) * 0.28;
        w.hipsGroup.position.y = 0.84;
        continue;
      }

      w.glbHandle.setAnimState('Walk');
      const target = w.waypoints[w.wpIdx];
      const dx = target.x - w.x;
      const dz = target.z - w.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.12) {
        w.x = target.x;
        w.z = target.z;
        w.pauseTimer = target.pauseSec;
        w.wpIdx = (w.wpIdx + 1) % w.waypoints.length;
        continue;
      }

      const step = Math.min(dist, w.speed * dt);
      w.x += (dx / dist) * step;
      w.z += (dz / dist) * step;
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - w.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      w.group.rotation.y += diff * Math.min(1, dt * 7.5);
      w.group.position.set(w.x, w.y, w.z);

      w.walkPhase += dt * w.speed * 5.2;
      const swing = Math.sin(w.walkPhase) * 0.42;
      w.leftLeg.rotation.x = swing;
      w.rightLeg.rotation.x = -swing;
      w.leftArm.rotation.x = w.isSaler ? -0.58 : -swing * 0.65;
      w.rightArm.rotation.x = swing * 0.65;
      w.hipsGroup.position.y = 0.84 + Math.abs(Math.cos(w.walkPhase)) * 0.032;
      w.headGroup.rotation.y = 0;
    }
  }
}
