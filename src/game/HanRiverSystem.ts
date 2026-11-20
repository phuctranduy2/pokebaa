import * as THREE from 'three';
import {
  CITY_ROAD_BOUNDS,
  type BoulevardSignalState,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import type { HospitalCharacterHelpers, HospitalScaledLight } from './HospitalSystem';
import type { IntersectionColliderBox, IntersectionSignalState } from './WestIntersectionSystem';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  type CityCarVariant,
} from './CityVehicleMeshBuilder';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickOutsideNpcModel } from './NpcModelCatalog';
import {
  getAsphaltTextures,
  getGlowSpriteTexture,
  getSidewalkPaverTextures,
  getSoftSmokeTexture,
  getTerracottaWalkwayTextures,
} from './VisualPolishSystem';
import { buildLuxuryYachtMesh, type BuiltYachtHandle, type YachtStyle } from './YachtMeshBuilder';
import { buildAmbientXanhSmTaxiCar } from './XanhSmTaxiSystem';
import {
  WEST_RIVER_RESIDENTIAL_OPENINGS,
  isInWestRiverResidentialOpening,
} from './westResidentialLayout';

export const HAN_RIVER_WATER_Y = -1.55;
export const HAN_BRIDGE_CENTER_X = 193.5;
export const DRAGON_BRIDGE_CENTER_X = 370.0;
export const TRAN_THI_LY_BRIDGE_CENTER_X = 503.0;
export const HAN_BRIDGE_DECK_Y = 5.4;
export const HAN_BRIDGE_SOUTH_FLAT_END_Z = -129.0;
export const HAN_BRIDGE_SOUTH_RAMP_END_Z = -175.0;
export const HAN_BRIDGE_NORTH_RAMP_START_Z = -305.0;
export const HAN_BRIDGE_NORTH_FLAT_START_Z = -351.0;

export const NORTH_BANK_INTERSECTION_CENTER_X = 193.5;
export const NORTH_BANK_INTERSECTION_CENTER_Z = -362.0;
export const NORTH_BANK_WEST_END_X = 76.0;
export const NORTH_BANK_EAST_END_X = 570.0;
export const NORTH_BANK_NORTH_END_Z = -458.0;

export const VIEWING_PIER_CENTER_X = 146.0;
export const CARP_PLAZA_MIN_X = 248.0;
export const LOVE_BRIDGE_NECK_MIN_X = 274.0;
export const LOVE_BRIDGE_NECK_MAX_X = 284.0;
export const LOVE_BRIDGE_MIN_X = 272.0;
export const LOVE_BRIDGE_MAX_X = 346.0;
export const LOVE_BRIDGE_MAIN_MIN_Z = -333.0;
export const LOVE_BRIDGE_MAIN_MAX_Z = -325.0;

export interface HanRiverBuildResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  poolMats: THREE.MeshBasicMaterial[];
  scaledLights: HospitalScaledLight[];
  getSouthSignalState: () => IntersectionSignalState;
  getNorthBankSignalState: () => IntersectionSignalState;
  update: (delta: number, rawHour: number, lampFactor: number, isNearWater?: boolean) => void;
}

/**
 * Smooth S-curve bridge elevation along Z across widened Sông Hàn (222m total bridge length):
 * - South flat landing: Z >= -129.0 -> Y = -0.26 (flush with Ngã 4 Bạch Đằng asphalt)
 * - South S-ramp: -175.0 <= Z < -129.0 -> smoothly rises from -0.26 up to +5.40
 * - Main river span: -305.0 <= Z < -175.0 -> flat at +5.40 (clears cruise boats underneath)
 * - North S-ramp: -351.0 <= Z < -305.0 -> smoothly descends from +5.40 down to -0.26
 * - North flat approach & Ngã 4 Bờ Bắc: Z < -351.0 -> Y = -0.26
 */
export function getHanRiverBridgeDeckY(z: number): number {
  const baseY = -0.26;
  const rise = HAN_BRIDGE_DECK_Y - baseY;
  if (z >= HAN_BRIDGE_SOUTH_FLAT_END_Z) {
    return baseY;
  }
  if (z >= HAN_BRIDGE_SOUTH_RAMP_END_Z) {
    const t =
      (HAN_BRIDGE_SOUTH_FLAT_END_Z - z) /
      (HAN_BRIDGE_SOUTH_FLAT_END_Z - HAN_BRIDGE_SOUTH_RAMP_END_Z);
    const s = t * t * (3 - 2 * t);
    return baseY + rise * s;
  }
  if (z >= HAN_BRIDGE_NORTH_RAMP_START_Z) {
    return HAN_BRIDGE_DECK_Y;
  }
  if (z >= HAN_BRIDGE_NORTH_FLAT_START_Z) {
    const t =
      (HAN_BRIDGE_NORTH_RAMP_START_Z - z) /
      (HAN_BRIDGE_NORTH_RAMP_START_Z - HAN_BRIDGE_NORTH_FLAT_START_Z);
    const s = t * t * (3 - 2 * t);
    return HAN_BRIDGE_DECK_Y - rise * s;
  }
  return baseY;
}

/**
 * Analytical derivative dY / dZ along Sông Hàn bridges for vehicle pitch alignment.
 */
export function getHanRiverBridgeSlopeDz(z: number): number {
  const baseY = -0.26;
  const rise = HAN_BRIDGE_DECK_Y - baseY;
  if (z < HAN_BRIDGE_SOUTH_FLAT_END_Z && z > HAN_BRIDGE_SOUTH_RAMP_END_Z) {
    const span = HAN_BRIDGE_SOUTH_FLAT_END_Z - HAN_BRIDGE_SOUTH_RAMP_END_Z;
    const t = (HAN_BRIDGE_SOUTH_FLAT_END_Z - z) / span;
    return rise * 6 * t * (1 - t) * (-1 / span);
  }
  if (z < HAN_BRIDGE_NORTH_RAMP_START_Z && z > HAN_BRIDGE_NORTH_FLAT_START_Z) {
    const span = HAN_BRIDGE_NORTH_RAMP_START_Z - HAN_BRIDGE_NORTH_FLAT_START_Z;
    const t = (HAN_BRIDGE_NORTH_RAMP_START_Z - z) / span;
    return -rise * 6 * t * (1 - t) * (-1 / span);
  }
  return 0;
}

function getRiverSpanFlareT(z: number): number {
  if (z >= -134.5 || z <= -345.0) return 0;
  const s = THREE.MathUtils.clamp((-134.5 - z) / 14.0, 0, 1);
  const n = THREE.MathUtils.clamp((z + 345.0) / 14.0, 0, 1);
  const f = Math.min(s, n);
  return f * f * (3 - 2 * f);
}

export const HAN_BRIDGE_ROAD_HALF_W = 7.9;
export const HAN_BRIDGE_OUTER_HALF_W = 11.1;

export function getHanBridgeRoadHalfW(_z: number): number {
  return HAN_BRIDGE_ROAD_HALF_W;
}

export function getHanBridgeOuterHalfW(_z: number): number {
  return HAN_BRIDGE_OUTER_HALF_W;
}

export function getDragonBridgeRoadHalfW(z: number): number {
  return THREE.MathUtils.lerp(8.4, 9.2, getRiverSpanFlareT(z));
}

export function getDragonBridgeOuterHalfW(z: number): number {
  return THREE.MathUtils.lerp(11.8, 12.6, getRiverSpanFlareT(z));
}

export function getTranThiLyBridgeRoadHalfW(z: number): number {
  return THREE.MathUtils.lerp(8.4, 11.4, getRiverSpanFlareT(z));
}

export function getTranThiLyBridgeOuterHalfW(_z: number): number {
  return 14.1;
}

export type DragonFireShowPhase = 'idle' | 'gathering' | 'fire_show' | 'dispersing';

/**
 * Cầu Rồng fire-breathing & tourist viewing schedule:
 * - 'gathering':  19:21 .. 20:00 (tourists & NPCs walk onto both bridge walkways & Dragon Head viewing zone)
 * - 'fire_show':  20:00 .. 24:00 (Dragon breathes fire + layered smoke; crowd watches along walkways & head)
 * - 'dispersing': 00:00 .. 01:21 (Fire stops; spectators walk back along the full bridge and head home)
 * - 'idle':       01:21 .. 19:21 (Bridge clear, no fire show)
 */
export function getDragonFireShowPhase(rawHour: number): DragonFireShowPhase {
  const h = ((rawHour % 24) + 24) % 24;
  if (h >= 20.0 && h < 24.0) return 'fire_show';
  if (h >= 19.35 && h < 20.0) return 'gathering';
  if (h >= 0.0 && h < 1.35) return 'dispersing';
  return 'idle';
}

/**
 * Shared ground elevation for Bạch Đằng Waterfront, Cầu Sông Hàn, Cầu Rồng, Cầu Trần Thị Lý, and North Bank Ngã 4
 * used identically by walking player, player motorbike, and cross-river NPC traffic.
 */
export function getHanRiverExteriorGroundY(x: number, z: number): number {
  // Bridge corridors: Cầu Sông Hàn (193.5), Cầu Rồng (370.0), and Cầu Trần Thị Lý (503.0) across Z = -351.0 .. -125.9
  const hanOuterHW = getHanBridgeOuterHalfW(z) + 0.55;
  const onHanBridge = x >= HAN_BRIDGE_CENTER_X - hanOuterHW && x <= HAN_BRIDGE_CENTER_X + hanOuterHW;
  const dragonOuterHW = Math.max(9.7, getDragonBridgeOuterHalfW(z) + 0.55);
  const onDragonBridge =
    x >= DRAGON_BRIDGE_CENTER_X - dragonOuterHW && x <= DRAGON_BRIDGE_CENTER_X + dragonOuterHW;
  const ttlOuterHW = Math.max(9.7, getTranThiLyBridgeOuterHalfW(z) + 0.55);
  const onTranThiLyBridge =
    x >= TRAN_THI_LY_BRIDGE_CENTER_X - ttlOuterHW && x <= TRAN_THI_LY_BRIDGE_CENTER_X + ttlOuterHW;
  if (
    z >= HAN_BRIDGE_NORTH_FLAT_START_Z &&
    z < -125.9 &&
    (onHanBridge || onDragonBridge || onTranThiLyBridge)
  ) {
    const cx = onTranThiLyBridge
      ? TRAN_THI_LY_BRIDGE_CENTER_X
      : onDragonBridge
        ? DRAGON_BRIDGE_CENTER_X
        : HAN_BRIDGE_CENTER_X;
    const roadHW = onTranThiLyBridge
      ? getTranThiLyBridgeRoadHalfW(z)
      : onDragonBridge
        ? getDragonBridgeRoadHalfW(z)
        : getHanBridgeRoadHalfW(z);
    const deckY = getHanRiverBridgeDeckY(z);
    if (x >= cx - roadHW && x <= cx + roadHW) {
      return deckY; // Drivable bridge asphalt
    }
    // Pedestrian side walkways smoothly connecting Promenade (Y = 0.0) up onto bridge curb (+0.12m)
    return Math.max(0.0, deckY + 0.12);
  }

  // Đường Bạch Đằng Waterfront Roadway (Z = -125.9 .. -109.1, X = -235.9 .. 538.0)
  if (z >= -125.9 && z <= -109.1 && x >= -235.9 && x <= 538.0) {
    return -0.26;
  }

  // Đường Ven Sông Bạch Đằng Tây (X = -965.0 .. -219.1, Z = -153.4 .. -137.0) + East Tie-In Leg into Đường Bạch Đằng (X = -235.9 .. -219.1, Z = -137.0 .. -125.9)
  if (
    (x >= -965.0 && x <= -219.1 && z >= -153.4 && z <= -137.0) ||
    (x >= -235.9 && x <= -219.1 && z >= -137.0 && z < -125.9)
  ) {
    return -0.26;
  }

  // Smooth sloped transition aprons connecting all 6 Row N4 Alleys & Công Viên Tổ 7 (Z = -134.0, Y = +0.035) down to Đường Ven Sông Bạch Đằng Tây (Z = -137.0, Y = -0.26)
  if (z > -137.0 && z <= -134.0 && isInWestRiverResidentialOpening(x)) {
    const t = (z - -137.0) / 3.0;
    return -0.26 + t * 0.295;
  }

  // North Bank & Ngã Tư Trần Hưng Đạo (Z < -351.0)
  if (z < HAN_BRIDGE_NORTH_FLAT_START_Z) {
    if (
      ((x >= HAN_BRIDGE_CENTER_X - 8.4 && x <= HAN_BRIDGE_CENTER_X + 8.4) ||
        (x >= DRAGON_BRIDGE_CENTER_X - 8.4 && x <= DRAGON_BRIDGE_CENTER_X + 8.4) ||
        (x >= TRAN_THI_LY_BRIDGE_CENTER_X - 8.4 && x <= TRAN_THI_LY_BRIDGE_CENTER_X + 8.4)) &&
      z >= NORTH_BANK_NORTH_END_Z
    ) {
      return -0.26;
    }
    if (
      z >= NORTH_BANK_INTERSECTION_CENTER_Z - 8.4 &&
      z <= NORTH_BANK_INTERSECTION_CENTER_Z + 8.4 &&
      x >= NORTH_BANK_WEST_END_X &&
      x <= NORTH_BANK_EAST_END_X
    ) {
      return -0.26;
    }
    return 0.0;
  }

  // Cầu Tình Yêu, Cá Chép Hóa Rồng Plaza (X = 248.0..346.0) & Bến Du Thuyền (Z = -345.2..-321.5)
  if (z > -345.2 && z <= -321.5) {
    if (x >= 248.0 && x < LOVE_BRIDGE_MIN_X && z <= LOVE_BRIDGE_MAIN_MAX_Z) {
      return 0.0;
    }
    if (x >= LOVE_BRIDGE_NECK_MIN_X && x <= LOVE_BRIDGE_NECK_MAX_X && z < LOVE_BRIDGE_MAIN_MIN_Z) {
      return 0.0;
    }
    if (
      x >= LOVE_BRIDGE_MIN_X &&
      x <= LOVE_BRIDGE_MAX_X &&
      z >= LOVE_BRIDGE_MAIN_MIN_Z &&
      z <= LOVE_BRIDGE_MAIN_MAX_Z
    ) {
      return 0.0;
    }
    if (
      z > LOVE_BRIDGE_MAIN_MAX_Z &&
      ((x >= 285.0 && x <= 297.0) || (x >= 305.0 && x <= 317.0) || (x >= 325.0 && x <= 337.0))
    ) {
      const stepT = THREE.MathUtils.clamp((z - LOVE_BRIDGE_MAIN_MAX_Z) / 1.2, 0, 1);
      return -0.72 * stepT;
    }
  }

  return 0.0;
}

// =========================================================================
// COLLIDERS: BẠCH ĐẰNG, VIEWING PIER (X=146), CẦU SÔNG HÀN (193.5), CẦU RỒNG (370.0), CẦU TRẦN THỊ LÝ (503.0) & NGÃ 4 BỜ BẮC
// =========================================================================
export const HAN_RIVER_COLLIDERS: IntersectionColliderBox[] = [
  // South Riverfront Safety Balustrades (open at West Bạch Đằng Connector X=-241..-214, Pier 140..152, Cầu Sông Hàn 182.3..204.7, Cầu Rồng 358.0..382.0 & Cầu Trần Thị Lý 488.7..517.3!)
  { minX: -214.0, maxX: 140.1, minZ: -134.5, maxZ: -133.8, floor: 1 },
  // Bờ Kè Ven Sông Bạch Đằng Tây Riverfront Balustrades (East corner X=-214.0, Z=-165..-134 & Continuous North Seawall Z=-165.0, X=-960..-214)
  { minX: -214.5, maxX: -213.6, minZ: -165.4, maxZ: -133.8, floor: 1 },
  { minX: -960.0, maxX: -213.6, minZ: -165.6, maxZ: -164.4, floor: 1 },
  { minX: 151.9, maxX: 182.3, minZ: -134.5, maxZ: -133.8, floor: 1 },
  { minX: 204.7, maxX: 358.0, minZ: -134.5, maxZ: -133.8, floor: 1 },
  { minX: 382.0, maxX: 488.7, minZ: -134.5, maxZ: -133.8, floor: 1 },
  { minX: 517.3, maxX: 538.5, minZ: -134.5, maxZ: -133.8, floor: 1 },

  // Relocated Viewing Pier Guardrails (X = 140.0..152.0, Z = -142.2..-134.4)
  { minX: 139.8, maxX: 140.3, minZ: -142.2, maxZ: -134.4, floor: 1 }, // West Pier Rail
  { minX: 151.7, maxX: 152.2, minZ: -142.2, maxZ: -134.4, floor: 1 }, // East Pier Rail
  { minX: 139.8, maxX: 152.2, minZ: -142.3, maxZ: -141.7, floor: 1 }, // North End Rail

  // Relocated "Cá Chép Hóa Rồng" Marble Statue Pedestal (X = 146.0, Z = -137.6)
  { minX: 144.7, maxX: 147.3, minZ: -138.9, maxZ: -136.3, floor: 1 },

  // Cầu Sông Hàn Widened Bridge Side Safety Guardrails (river span Z = -345.0..-134.15; open at bank approaches!)
  { minX: 182.0, maxX: 182.9, minZ: -345.2, maxZ: -134.1, floor: 1 }, // Bridge West Rail
  { minX: 204.1, maxX: 205.0, minZ: -345.2, maxZ: -134.1, floor: 1 }, // Bridge East Rail

  // Cầu Rồng Widened Bridge Side Safety Guardrails (river span Z = -345.0..-134.15; open at bank approaches so walkways connect seamlessly!)
  { minX: 357.5, maxX: 358.5, minZ: -139.5, maxZ: -134.1, floor: 1 }, // South Flare Step 1 West
  { minX: 381.5, maxX: 382.5, minZ: -139.5, maxZ: -134.1, floor: 1 }, // South Flare Step 1 East
  { minX: 357.1, maxX: 358.1, minZ: -144.5, maxZ: -139.2, floor: 1 }, // South Flare Step 2 West
  { minX: 381.9, maxX: 382.9, minZ: -144.5, maxZ: -139.2, floor: 1 }, // South Flare Step 2 East
  { minX: 356.9, maxX: 357.7, minZ: -148.8, maxZ: -144.2, floor: 1 }, // South Flare Step 3 West
  { minX: 382.3, maxX: 383.1, minZ: -148.8, maxZ: -144.2, floor: 1 }, // South Flare Step 3 East
  { minX: 356.9, maxX: 357.7, minZ: -331.2, maxZ: -148.5, floor: 1 }, // Main Wide Span West Rail
  { minX: 382.3, maxX: 383.1, minZ: -331.2, maxZ: -148.5, floor: 1 }, // Main Wide Span East Rail
  { minX: 356.9, maxX: 357.7, minZ: -335.2, maxZ: -330.8, floor: 1 }, // North Flare Step 3 West
  { minX: 382.3, maxX: 383.1, minZ: -335.2, maxZ: -330.8, floor: 1 }, // North Flare Step 3 East
  { minX: 357.1, maxX: 358.1, minZ: -340.2, maxZ: -334.8, floor: 1 }, // North Flare Step 2 West
  { minX: 381.9, maxX: 382.9, minZ: -340.2, maxZ: -334.8, floor: 1 }, // North Flare Step 2 East
  { minX: 357.5, maxX: 358.5, minZ: -345.2, maxZ: -339.8, floor: 1 }, // North Flare Step 1 West
  { minX: 381.5, maxX: 382.5, minZ: -345.2, maxZ: -339.8, floor: 1 }, // North Flare Step 1 East

  // Cầu Trần Thị Lý Straight Wide Bridge Side Guardrails (river span Z = -345.0..-134.15; bank mouths 100% open!) & White Central Median
  { minX: 488.4, maxX: 489.4, minZ: -345.2, maxZ: -134.1, floor: 1 }, // Main Wide Span West Rail
  { minX: 516.6, maxX: 517.6, minZ: -345.2, maxZ: -134.1, floor: 1 }, // Main Wide Span East Rail
  { minX: 502.1, maxX: 503.9, minZ: -344.0, maxZ: -136.0, floor: 1 }, // Central White Median & Inclined Sail Pylon Plinth

  // South Sidewalk Curb Edge Past Đại Lộ Bệnh Viện (open at X = -212.0..-88.0 for Công Viên Trung Tâm Bạch Đằng, X = -86.0..-52.0 for Starbucks Reserve, X = -50.4..2.0 for Adidas & Skechers, and X = 45.0..145.8 for Phê La, CHANEL, YSL & KATINAT Bạch Đằng!)
  { minX: -214.0, maxX: -212.0, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: -88.0, maxX: -86.0, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: -52.0, maxX: -50.4, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: 2.0, maxX: 45.0, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: 145.8, maxX: 147.2, minZ: -104.5, maxZ: -103.5, floor: 1 },

  // South Sidewalk Curb Edges flanking Walk-In Green Park (X=207..252), Casa Riva Plaza (X=256..311), Huawei (X=316..356.5), Sony (X=383.8..412.6) & DIOR (X=488.5..517.0)
  { minX: 252.0, maxX: 256.0, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: 311.0, maxX: 316.0, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: 412.6, maxX: 488.5, minZ: -104.5, maxZ: -103.5, floor: 1 },
  { minX: 517.0, maxX: 538.5, minZ: -104.5, maxZ: -103.5, floor: 1 },

  // Far East Boundary along Extended Bạch Đằng Waterfront (X = 537.5..539.5)
  { minX: 537.5, maxX: 539.5, minZ: -134.5, maxZ: -103.5, floor: 1 },

  // Ngã 4 Bạch Đằng - Cầu Sông Hàn Corner Signal Poles (river mouth pushed outward to 182.3/204.7 to keep wide walkways open)
  { minX: 183.8, maxX: 184.6, minZ: -108.9, maxZ: -108.1, floor: 1 },
  { minX: 202.4, maxX: 203.2, minZ: -108.9, maxZ: -108.1, floor: 1 },
  { minX: 181.9, maxX: 182.7, minZ: -126.9, maxZ: -126.1, floor: 1 },
  { minX: 204.3, maxX: 205.1, minZ: -126.9, maxZ: -126.1, floor: 1 },

  // Ngã 4 Bạch Đằng - Cầu Rồng Corner Gantry / Signal Poles (South sidewalk 360.8/379.2, river mouth pushed outward to 357.85/382.15 to keep wide walkways 100% open)
  { minX: 360.4, maxX: 361.2, minZ: -108.9, maxZ: -108.1, floor: 1 },
  { minX: 378.8, maxX: 379.6, minZ: -108.9, maxZ: -108.1, floor: 1 },
  { minX: 357.45, maxX: 358.25, minZ: -126.9, maxZ: -126.1, floor: 1 },
  { minX: 381.75, maxX: 382.55, minZ: -126.9, maxZ: -126.1, floor: 1 },

  // Ngã 4 Bạch Đằng - Cầu Trần Thị Lý Corner Signal Poles (river mouth pushed outward to 488.5/517.5 to keep 5.7m wide walkways 100% open)
  { minX: 493.4, maxX: 494.2, minZ: -108.9, maxZ: -108.1, floor: 1 },
  { minX: 511.8, maxX: 512.6, minZ: -108.9, maxZ: -108.1, floor: 1 },
  { minX: 488.1, maxX: 488.9, minZ: -126.9, maxZ: -126.1, floor: 1 },
  { minX: 517.1, maxX: 517.9, minZ: -126.9, maxZ: -126.1, floor: 1 },

  // North Bank Riverfront Balustrades (Z = -345.4..-344.6, open at Cầu Sông Hàn 182.3..204.7, Cá Chép Plaza & Cầu Tình Yêu 248.0..284.0, Cầu Rồng 358.0..382.0 & Cầu Trần Thị Lý 488.7..517.3!)
  { minX: 75.0, maxX: 182.3, minZ: -345.4, maxZ: -344.6, floor: 1 },
  { minX: 204.7, maxX: 248.0, minZ: -345.4, maxZ: -344.6, floor: 1 },
  { minX: 284.0, maxX: 358.0, minZ: -345.4, maxZ: -344.6, floor: 1 },
  { minX: 382.0, maxX: 488.7, minZ: -345.4, maxZ: -344.6, floor: 1 },
  { minX: 517.3, maxX: 571.0, minZ: -345.4, maxZ: -344.6, floor: 1 },

  // Widened Cá Chép Hóa Rồng Plaza (X = 248..274), Cầu Tình Yêu & Bến Du Thuyền Guardrails, Planter & Pedestal
  { minX: 247.8, maxX: 248.3, minZ: -345.0, maxZ: -324.8, floor: 1 }, // Widened West Plaza Rail
  { minX: 249.1, maxX: 257.1, minZ: -344.3, maxZ: -341.7, floor: 1 }, // North-West Granite Shrub Planter
  { minX: 256.4, maxX: 262.6, minZ: -335.6, maxZ: -329.4, floor: 1 }, // Cá Chép Hóa Rồng Monument Pedestal
  { minX: 276.0, maxX: 276.4, minZ: -345.2, maxZ: -344.8, floor: 1 },
  { minX: 278.8, maxX: 279.2, minZ: -345.2, maxZ: -344.8, floor: 1 },
  { minX: 281.6, maxX: 282.0, minZ: -345.2, maxZ: -344.8, floor: 1 },
  { minX: 283.7, maxX: 284.2, minZ: -345.0, maxZ: -332.8, floor: 1 }, // Neck East Rail
  { minX: 283.8, maxX: 346.2, minZ: -333.3, maxZ: -332.8, floor: 1 }, // Main North Edge
  { minX: 345.7, maxX: 346.2, minZ: -333.2, maxZ: -324.8, floor: 1 }, // Main East Tip Rail
  { minX: 247.8, maxX: 285.2, minZ: -325.2, maxZ: -324.7, floor: 1 }, // South Rail Seg 1 (extended West to 248)
  { minX: 296.8, maxX: 305.2, minZ: -325.2, maxZ: -324.7, floor: 1 }, // South Rail Seg 2
  { minX: 316.8, maxX: 325.2, minZ: -325.2, maxZ: -324.7, floor: 1 }, // South Rail Seg 3
  { minX: 336.8, maxX: 346.2, minZ: -325.2, maxZ: -324.7, floor: 1 }, // South Rail Seg 4
  // Stepped Marina Boat-Boarding Bay Side & Split Outer Edge Rails (leaving 3.6m center gate open at X = 291, 311, 331!)
  { minX: 284.8, maxX: 285.3, minZ: -325.2, maxZ: -321.4, floor: 1 },
  { minX: 296.7, maxX: 297.2, minZ: -325.2, maxZ: -321.4, floor: 1 },
  { minX: 284.8, maxX: 289.2, minZ: -321.7, maxZ: -321.2, floor: 1 },
  { minX: 292.8, maxX: 297.2, minZ: -321.7, maxZ: -321.2, floor: 1 },
  { minX: 304.8, maxX: 305.3, minZ: -325.2, maxZ: -321.4, floor: 1 },
  { minX: 316.7, maxX: 317.2, minZ: -325.2, maxZ: -321.4, floor: 1 },
  { minX: 304.8, maxX: 309.2, minZ: -321.7, maxZ: -321.2, floor: 1 },
  { minX: 312.8, maxX: 317.2, minZ: -321.7, maxZ: -321.2, floor: 1 },
  { minX: 324.8, maxX: 325.3, minZ: -325.2, maxZ: -321.4, floor: 1 },
  { minX: 336.7, maxX: 337.2, minZ: -325.2, maxZ: -321.4, floor: 1 },
  { minX: 324.8, maxX: 329.2, minZ: -321.7, maxZ: -321.2, floor: 1 },
  { minX: 332.8, maxX: 337.2, minZ: -321.7, maxZ: -321.2, floor: 1 },

  // North Bank Ngã Tư Trần Hưng Đạo Perimeter & Outer Curb Walls (X = 75..571)
  { minX: 75.0, maxX: 76.2, minZ: -378.5, maxZ: -344.8, floor: 1 }, // West Edge
  { minX: 569.8, maxX: 571.0, minZ: -378.5, maxZ: -344.8, floor: 1 }, // East Edge
  { minX: 75.0, maxX: 180.0, minZ: -378.5, maxZ: -377.5, floor: 1 }, // North Sidewalk Boundary West
  { minX: 207.0, maxX: 356.5, minZ: -378.5, maxZ: -377.5, floor: 1 }, // North Sidewalk Boundary Center
  { minX: 383.5, maxX: 489.0, minZ: -378.5, maxZ: -377.5, floor: 1 }, // North Sidewalk Boundary Mid-East
  { minX: 517.0, maxX: 571.0, minZ: -378.5, maxZ: -377.5, floor: 1 }, // North Sidewalk Boundary Far-East
  { minX: 179.2, maxX: 180.0, minZ: -458.5, maxZ: -377.5, floor: 1 }, // Cầu Sông Hàn North Leg West Boundary
  { minX: 207.0, maxX: 207.8, minZ: -458.5, maxZ: -377.5, floor: 1 }, // Cầu Sông Hàn North Leg East Boundary
  { minX: 179.2, maxX: 207.8, minZ: -458.8, maxZ: -457.6, floor: 1 }, // Cầu Sông Hàn North Leg End Barrier
  { minX: 355.7, maxX: 356.5, minZ: -458.5, maxZ: -377.5, floor: 1 }, // Cầu Rồng North Leg West Boundary
  { minX: 383.5, maxX: 384.3, minZ: -458.5, maxZ: -377.5, floor: 1 }, // Cầu Rồng North Leg East Boundary
  { minX: 355.7, maxX: 384.3, minZ: -458.8, maxZ: -457.6, floor: 1 }, // Cầu Rồng North Leg End Barrier
  { minX: 488.7, maxX: 489.5, minZ: -458.5, maxZ: -377.5, floor: 1 }, // Cầu Trần Thị Lý North Leg West Boundary
  { minX: 516.5, maxX: 517.3, minZ: -458.5, maxZ: -377.5, floor: 1 }, // Cầu Trần Thị Lý North Leg East Boundary
  { minX: 488.7, maxX: 517.3, minZ: -458.8, maxZ: -457.6, floor: 1 }, // Cầu Trần Thị Lý North Leg End Barrier

  // North Bank Ngã 4 Traffic Light Corner Poles at Cầu Sông Hàn (193.5), Cầu Rồng (370.0) & Cầu Trần Thị Lý (503.0)
  { minX: 181.9, maxX: 182.7, minZ: -353.5, maxZ: -352.7, floor: 1 },
  { minX: 204.3, maxX: 205.1, minZ: -353.5, maxZ: -352.7, floor: 1 },
  { minX: 183.9, maxX: 184.7, minZ: -371.4, maxZ: -370.5, floor: 1 },
  { minX: 202.3, maxX: 203.1, minZ: -371.4, maxZ: -370.5, floor: 1 },

  { minX: 357.45, maxX: 358.25, minZ: -353.5, maxZ: -352.7, floor: 1 },
  { minX: 381.75, maxX: 382.55, minZ: -353.5, maxZ: -352.7, floor: 1 },
  { minX: 360.4, maxX: 361.2, minZ: -371.4, maxZ: -370.5, floor: 1 },
  { minX: 378.8, maxX: 379.6, minZ: -371.4, maxZ: -370.5, floor: 1 },

  { minX: 488.1, maxX: 488.9, minZ: -353.5, maxZ: -352.7, floor: 1 },
  { minX: 517.1, maxX: 517.9, minZ: -353.5, maxZ: -352.7, floor: 1 },
  { minX: 493.4, maxX: 494.2, minZ: -371.4, maxZ: -370.5, floor: 1 },
  { minX: 511.8, maxX: 512.6, minZ: -371.4, maxZ: -370.5, floor: 1 },
];

function createRoadArrowTex(
  kind: 't_both' | 'straight' | 'straight_left' | 'straight_right'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#f8fafc';

  if (kind === 't_both') {
    ctx.fillRect(114, 128, 28, 106);
    ctx.fillRect(62, 102, 132, 28);
    ctx.beginPath();
    ctx.moveTo(22, 116);
    ctx.lineTo(70, 74);
    ctx.lineTo(70, 158);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(234, 116);
    ctx.lineTo(186, 74);
    ctx.lineTo(186, 158);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(114, 70, 28, 150);
    ctx.beginPath();
    ctx.moveTo(128, 22);
    ctx.lineTo(176, 86);
    ctx.lineTo(80, 86);
    ctx.closePath();
    ctx.fill();

    if (kind === 'straight_left') {
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
    } else if (kind === 'straight_right') {
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
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBachDangSignTex(
  title = 'NGÃ TƯ BẠCH ĐẰNG • CẦU SÔNG HÀN',
  sub = '▲ QUA CẦU SÔNG HÀN  •  ◀ BẾN DU THUYỀN  •  CẦU RỒNG ▶'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, 1024, 192);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 1004, 172);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 42px system-ui, sans-serif';
  ctx.fillText(title, 512, 68);

  ctx.shadowBlur = 2;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 23px system-ui, sans-serif';
  ctx.fillText(sub, 512, 130);
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWaterWindNormalTex(): THREE.DataTexture {
  const size = 512;
  const heights = new Float32Array(size * size);
  const twoPi = Math.PI * 2;

  // Periodic integer-harmonic wind-wave & capillary packets (100% seamless tiling)
  const swellModes: ReadonlyArray<readonly [number, number, number, number]> = [
    [2, 1, 1.0, 0.3],
    [3, -2, 0.72, 1.4],
    [1, 3, 0.64, 2.2],
    [4, 2, 0.48, 0.9],
  ];
  const chopModes: ReadonlyArray<readonly [number, number, number, number]> = [
    [6, 3, 0.42, 0.5],
    [7, -4, 0.36, 1.9],
    [5, 6, 0.31, 3.1],
    [9, 2, 0.26, 2.4],
    [8, -6, 0.23, 0.8],
    [11, 4, 0.19, 1.7],
  ];
  const capillaryModes: ReadonlyArray<readonly [number, number, number, number]> = [
    [16, 5, 0.13, 0.4],
    [19, -7, 0.11, 1.8],
    [23, 9, 0.09, 2.7],
    [28, -11, 0.07, 0.9],
    [34, 6, 0.055, 2.1],
  ];

  for (let y = 0; y < size; y++) {
    const v = (y / size) * twoPi;
    const rowOff = y * size;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * twoPi;
      const warp = 0.38 * Math.sin(2 * u - v + 0.7) + 0.24 * Math.cos(u + 3 * v + 1.5);

      let swellH = 0;
      for (let m = 0; m < swellModes.length; m++) {
        const [kx, ky, amp, ph] = swellModes[m];
        const p = kx * u + ky * v + ph + warp * 0.55;
        // Trochoidal crest sharpening: sharper wave crests & wider dark troughs
        const s = 0.5 + 0.5 * Math.sin(p + 0.32 * Math.sin(p));
        swellH += amp * Math.pow(s, 1.55);
      }

      let chopH = 0;
      for (let m = 0; m < chopModes.length; m++) {
        const [kx, ky, amp, ph] = chopModes[m];
        const p = kx * u + ky * v + ph + warp * 0.85;
        const s = 0.5 + 0.5 * Math.sin(p + 0.28 * Math.sin(p));
        chopH += amp * Math.pow(s, 1.45);
      }

      // Fine capillary wavelets ride stronger along swell crests & slopes (matching wind-ripple photo)
      const capMod = 0.45 + 0.55 * Math.min(1, swellH * 0.45);
      let capH = 0;
      for (let m = 0; m < capillaryModes.length; m++) {
        const [kx, ky, amp, ph] = capillaryModes[m];
        const p = kx * u + ky * v + ph + warp * 0.4;
        capH += amp * Math.sin(p);
      }

      heights[rowOff + x] = swellH + chopH + capH * capMod;
    }
  }

  let minH = Infinity;
  let maxH = -Infinity;
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] < minH) minH = heights[i];
    if (heights[i] > maxH) maxH = heights[i];
  }
  const invSpanH = 1.0 / Math.max(0.001, maxH - minH);

  const data = new Uint8Array(size * size * 4);
  const strength = 2.65;
  for (let y = 0; y < size; y++) {
    const ym = ((y - 1 + size) % size) * size;
    const yp = ((y + 1) % size) * size;
    const rowOff = y * size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[rowOff + xp] - heights[rowOff + xm]) * strength;
      const dy = (heights[yp + x] - heights[ym + x]) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const invLen = 1.0 / Math.hypot(nx, ny, nz);
      const outIdx = (rowOff + x) * 4;
      data[outIdx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      data[outIdx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      data[outIdx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      data[outIdx + 3] = Math.round(
        THREE.MathUtils.clamp((heights[rowOff + x] - minH) * invSpanH, 0, 1) * 255
      );
    }
  }

  const normalTex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.minFilter = THREE.LinearMipmapLinearFilter;
  normalTex.magFilter = THREE.LinearFilter;
  normalTex.generateMipmaps = true;
  normalTex.anisotropy = 8;
  normalTex.needsUpdate = true;
  return normalTex;
}

function createWaterSurfaceDrawer() {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const westCanvas = document.createElement('canvas');
  westCanvas.width = w;
  westCanvas.height = h;
  const westCtx = westCanvas.getContext('2d')!;
  const westTex = new THREE.CanvasTexture(westCanvas);
  westTex.colorSpace = THREE.SRGBColorSpace;
  westTex.anisotropy = 4;

  const redraw = (t: number, lampFactor: number) => {
    // Authentic Sông Hàn Đà Nẵng palette: natural jade-olive-emerald by day, deep emerald-indigo by night
    const shoreR = Math.round(THREE.MathUtils.lerp(66, 9, lampFactor));
    const shoreG = Math.round(THREE.MathUtils.lerp(98, 25, lampFactor));
    const shoreB = Math.round(THREE.MathUtils.lerp(78, 34, lampFactor));

    const midR = Math.round(THREE.MathUtils.lerp(46, 7, lampFactor));
    const midG = Math.round(THREE.MathUtils.lerp(82, 20, lampFactor));
    const midB = Math.round(THREE.MathUtils.lerp(69, 30, lampFactor));

    const deepR = Math.round(THREE.MathUtils.lerp(40, 6, lampFactor));
    const deepG = Math.round(THREE.MathUtils.lerp(74, 17, lampFactor));
    const deepB = Math.round(THREE.MathUtils.lerp(64, 27, lampFactor));

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, `rgb(${shoreR},${shoreG},${shoreB})`);
    grad.addColorStop(0.14, `rgb(${midR},${midG},${midB})`);
    grad.addColorStop(0.5, `rgb(${deepR},${deepG},${deepB})`);
    grad.addColorStop(0.86, `rgb(${midR},${midG},${midB})`);
    grad.addColorStop(1.0, `rgb(${shoreR},${shoreG},${shoreB})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle organic river current bands along East-West flow (subtle at day, gentle shimmer at night)
    for (let band = 0; band < 18; band++) {
      const cy = ((band / 18) * h + Math.sin(t * 0.25 + band * 1.4) * 5 + h) % h;
      const cx = ((band * 83 + t * 9) % (w + 160)) - 160;
      const bw = 110 + (band % 4) * 45;
      const bh = 8 + (band % 3) * 5;
      const bandAlpha = lampFactor > 0.35 ? 0.045 * lampFactor : 0.055;
      ctx.fillStyle =
        lampFactor > 0.35
          ? `rgba(34, 150, 178, ${bandAlpha})`
          : band % 2 === 0
            ? `rgba(88, 128, 108, ${bandAlpha})`
            : `rgba(28, 56, 48, ${bandAlpha})`;
      ctx.beginPath();
      ctx.ellipse(cx + bw * 0.5, cy, bw * 0.5, bh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Copy seamless base river current & colors to West Basin (X = -360..52.5) before drawing bridge reflections
    westCtx.drawImage(c, 0, 0);
    westTex.needsUpdate = true;

    if (lampFactor > 0.15) {
      // Softly broken night reflections aligned to Viewing Pier (u≈0.18), Cầu Sông Hàn (u≈0.27), Cầu Rồng (u≈0.61), and Cầu Trần Thị Lý (u≈0.87)
      const cols = [
        { u: 0.18, col: 'rgba(253, 224, 71, 0.22)' },
        { u: 0.27, col: 'rgba(34, 211, 238, 0.42)' },
        { u: 0.29, col: 'rgba(217, 70, 239, 0.32)' },
        { u: 0.60, col: 'rgba(251, 191, 36, 0.46)' },
        { u: 0.62, col: 'rgba(249, 115, 22, 0.36)' },
        { u: 0.85, col: 'rgba(34, 197, 94, 0.32)' },
        { u: 0.87, col: 'rgba(217, 70, 239, 0.44)' },
        { u: 0.89, col: 'rgba(251, 191, 36, 0.34)' },
      ];
      for (let i = 0; i < cols.length; i++) {
        const ref = cols[i];
        ctx.fillStyle = ref.col;
        for (let seg = 0; seg < 24; seg++) {
          const sy = (seg / 24) * h;
          const sx = ref.u * w + Math.sin(t * 2.6 + seg * 1.15 + i) * 12;
          const sw = 14 + Math.cos(t * 2.1 + seg * 0.8) * 8;
          ctx.beginPath();
          ctx.ellipse(sx, sy + 4, sw * 0.55, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    tex.needsUpdate = true;
  };

  redraw(0, 0.0);
  return { tex, westTex, redraw };
}

function createLoveBridgeRailingTex(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = '#18181b';
  ctx.fillStyle = '#18181b';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer wrought-iron border bars
  ctx.fillRect(0, 2, w, 10);
  ctx.fillRect(0, h - 12, w, 10);
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
  ctx.fillRect(w * 0.5 - 4, 8, 8, h - 16);

  // Ornate curved wave & dolphin-style scrollwork inside both half panels (matching Đà Nẵng Love Bridge)
  [0, w * 0.5].forEach((ox) => {
    const pw = w * 0.5;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(ox + 10, h * 0.68);
    ctx.bezierCurveTo(ox + pw * 0.28, h * 0.14, ox + pw * 0.72, h * 0.14, ox + pw - 10, h * 0.68);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ox + 14, h * 0.34);
    ctx.bezierCurveTo(ox + pw * 0.32, h * 0.86, ox + pw * 0.68, h * 0.86, ox + pw - 14, h * 0.34);
    ctx.stroke();

    // Central medallion scroll
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ox + pw * 0.5, h * 0.48, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical iron pickets framing filigree
    ctx.fillRect(ox + pw * 0.23 - 3, 10, 6, h - 20);
    ctx.fillRect(ox + pw * 0.77 - 3, 10, 6, h - 20);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWaterGlowPoolTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.40)');
  grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.14)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDragonFlameTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const lobes: Array<[number, number, number, string, string, string]> = [
    [64, 68, 56, 'rgba(255,253,228,0.96)', 'rgba(255,154,28,0.72)', 'rgba(220,38,12,0)'],
    [42, 60, 38, 'rgba(255,244,195,0.78)', 'rgba(251,126,20,0.52)', 'rgba(185,28,28,0)'],
    [86, 62, 36, 'rgba(255,238,180,0.74)', 'rgba(249,115,22,0.48)', 'rgba(185,28,28,0)'],
    [54, 34, 34, 'rgba(255,216,120,0.68)', 'rgba(234,88,12,0.44)', 'rgba(153,27,27,0)'],
    [76, 36, 30, 'rgba(255,210,105,0.62)', 'rgba(234,88,12,0.40)', 'rgba(153,27,27,0)'],
    [64, 88, 36, 'rgba(255,245,205,0.68)', 'rgba(245,158,11,0.44)', 'rgba(180,45,10,0)'],
    [46, 86, 26, 'rgba(255,230,150,0.55)', 'rgba(239,68,68,0.34)', 'rgba(153,27,27,0)'],
  ];
  for (const [cx, cy, r, c0, c1, c2] of lobes) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.06, cx, cy, r);
    g.addColorStop(0.0, c0);
    g.addColorStop(0.42, c1);
    g.addColorStop(1.0, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createEmberSparkTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
  g.addColorStop(0.0, 'rgba(255,255,235,1)');
  g.addColorStop(0.35, 'rgba(255,196,64,0.85)');
  g.addColorStop(0.75, 'rgba(249,115,22,0.28)');
  g.addColorStop(1.0, 'rgba(239,68,68,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an indexed BufferGeometry ribbon extruded smoothly along Z using getY(z)
 * with full position, normal, and uv attributes so it merges cleanly in static groups.
 */
function createBridgeRibbonGeometry(
  x0: number,
  x1: number,
  getBottomY: (z: number) => number,
  getTopY: (z: number) => number,
  zStart: number,
  zEnd: number,
  steps: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const addQuad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
    nx: number,
    ny: number,
    nz: number,
    u0 = 0,
    v0 = 0,
    u1 = 1,
    v1 = 1
  ) => {
    const base = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const za = THREE.MathUtils.lerp(zStart, zEnd, t0);
    const zb = THREE.MathUtils.lerp(zStart, zEnd, t1);

    const yaBot = getBottomY(za);
    const yaTop = getTopY(za);
    const ybBot = getBottomY(zb);
    const ybTop = getTopY(zb);

    const dz = zb - za;
    const dyTop = ybTop - yaTop;
    const topLen = Math.hypot(dz, dyTop) || 1;
    // Cross product check: outward top normal (+Y tilted along slope)
    const nTopY = Math.abs(dz) / topLen;
    const nTopZ = dz >= 0 ? -dyTop / topLen : dyTop / topLen;

    // Top face (visible from above, CCW looking from +Y)
    if (zb < za) {
      addQuad(
        [x0, yaTop, za],
        [x1, yaTop, za],
        [x1, ybTop, zb],
        [x0, ybTop, zb],
        0,
        nTopY,
        nTopZ,
        0,
        t0,
        1,
        t1
      );
      // Bottom face
      addQuad(
        [x0, ybBot, zb],
        [x1, ybBot, zb],
        [x1, yaBot, za],
        [x0, yaBot, za],
        0,
        -1,
        0,
        0,
        t1,
        1,
        t0
      );
      // West side (-X normal)
      addQuad(
        [x0, yaBot, za],
        [x0, yaTop, za],
        [x0, ybTop, zb],
        [x0, ybBot, zb],
        -1,
        0,
        0,
        t0,
        0,
        t1,
        1
      );
      // East side (+X normal)
      addQuad(
        [x1, ybBot, zb],
        [x1, ybTop, zb],
        [x1, yaTop, za],
        [x1, yaBot, za],
        1,
        0,
        0,
        t1,
        0,
        t0,
        1
      );
    } else {
      addQuad(
        [x0, ybTop, zb],
        [x1, ybTop, zb],
        [x1, yaTop, za],
        [x0, yaTop, za],
        0,
        nTopY,
        nTopZ,
        0,
        t1,
        1,
        t0
      );
      addQuad(
        [x0, yaBot, za],
        [x1, yaBot, za],
        [x1, ybBot, zb],
        [x0, ybBot, zb],
        0,
        -1,
        0,
        0,
        t0,
        1,
        t1
      );
      addQuad(
        [x0, ybBot, zb],
        [x0, ybTop, zb],
        [x0, yaTop, za],
        [x0, yaBot, za],
        -1,
        0,
        0,
        t1,
        0,
        t0,
        1
      );
      addQuad(
        [x1, yaBot, za],
        [x1, yaTop, za],
        [x1, ybTop, zb],
        [x1, ybBot, zb],
        1,
        0,
        0,
        t0,
        0,
        t1,
        1
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export function createHanRiverStructure(
  helpers: HospitalCharacterHelpers,
  coordinator?: CityTrafficCoordinator
): HanRiverBuildResult {
  const staticGroup = new THREE.Group();
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const poolMats: THREE.MeshBasicMaterial[] = [];
  const scaledLights: HospitalScaledLight[] = [];

  // Core Infrastructure Materials
  const asphaltTex = getAsphaltTextures();
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.92,
    ...(asphaltTex
      ? { map: asphaltTex.map, bumpMap: asphaltTex.bumpMap, bumpScale: 0.025 }
      : {}),
  });
  const sidewalkTex = getSidewalkPaverTextures();
  const granitePromenadeMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.80,
    ...(sidewalkTex
      ? { map: sidewalkTex.map, bumpMap: sidewalkTex.bumpMap, bumpScale: 0.02 }
      : {}),
  });
  const coastalTileMat = new THREE.MeshStandardMaterial({
    color: 0xb6a89a,
    roughness: 0.82,
    ...(sidewalkTex
      ? { map: sidewalkTex.map, bumpMap: sidewalkTex.bumpMap, bumpScale: 0.02 }
      : {}),
  });
  const darkCurbMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.72 });
  const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.72 });
  const riverBedMat = new THREE.MeshStandardMaterial({ color: 0x061326, roughness: 0.95 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const yellowMedianMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.7 });
  const marbleWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.15 });
  const railGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.35,
  });

  // Emissive Coastal & Bridge Neon Materials
  const bridgeCyanMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const bridgeMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xd946ef,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const dragonGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.24,
    metalness: 0.58,
  });
  const dragonBodyGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf5b814,
    emissive: 0xd97706,
    emissiveIntensity: 0.22,
    roughness: 0.30,
    metalness: 0.65,
  });
  const dragonDarkGoldMat = new THREE.MeshStandardMaterial({
    color: 0xa1490a,
    emissive: 0x451a03,
    emissiveIntensity: 0.14,
    roughness: 0.44,
    metalness: 0.55,
  });
  const terracottaTex = getTerracottaWalkwayTextures();
  const terracottaMap = terracottaTex ? terracottaTex.map.clone() : null;
  const terracottaBump = terracottaTex ? terracottaTex.bumpMap.clone() : null;
  if (terracottaMap) {
    terracottaMap.repeat.set(2, 2);
    terracottaMap.needsUpdate = true;
  }
  if (terracottaBump) {
    terracottaBump.repeat.set(2, 2);
    terracottaBump.needsUpdate = true;
  }
  const dragonWalkwayMat = new THREE.MeshStandardMaterial({
    color: 0xc88459,
    roughness: 0.82,
    ...(terracottaMap && terracottaBump
      ? { map: terracottaMap, bumpMap: terracottaBump, bumpScale: 0.025 }
      : {}),
  });
  const dragonMedianMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    roughness: 0.72,
  });
  const dragonRailTealMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.42,
    metalness: 0.48,
  });
  const dragonWalkwayBurgundyMat = new THREE.MeshStandardMaterial({
    color: 0x6b282b,
    roughness: 0.84,
    ...(terracottaMap && terracottaBump
      ? { map: terracottaMap, bumpMap: terracottaBump, bumpScale: 0.02 }
      : {}),
  });
  const dragonSpringerMat = new THREE.MeshStandardMaterial({
    color: 0xdcd7d2,
    roughness: 0.74,
  });
  const dragonRailCyanMat = new THREE.MeshStandardMaterial({
    color: 0x8be9f5,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.14,
    roughness: 0.28,
    metalness: 0.42,
  });
  const dragonStanchionTealMat = new THREE.MeshStandardMaterial({
    color: 0x4b877d,
    roughness: 0.48,
    metalness: 0.35,
  });
  const dragonCableMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.38,
    metalness: 0.65,
  });
  const dragonLampGreenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.40,
    metalness: 0.42,
  });
  const dragonRedStripeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.65,
  });
  // Dedicated materials for Cầu Rồng's animated gold <-> sapphire-blue LED shows
  const dragonBridgeGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.32,
    roughness: 0.22,
    metalness: 0.68,
  });
  const dragonBridgeBodyMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0xd97706,
    emissiveIntensity: 0.18,
    roughness: 0.28,
    metalness: 0.64,
  });
  const dragonBridgeDarkMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0x92400e,
    emissiveIntensity: 0.12,
    roughness: 0.36,
    metalness: 0.58,
  });
  const dragonFireMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf97316,
    emissiveIntensity: 0.0,
    transparent: true,
    opacity: 0.85,
    roughness: 0.2,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.3,
    roughness: 0.3,
  });
  const tranThiLyRedCableMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.0,
    roughness: 0.36,
    metalness: 0.18,
  });
  const tranThiLyPylonRedMat = new THREE.MeshStandardMaterial({
    color: 0xc81e1e,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.0,
    roughness: 0.42,
    metalness: 0.15,
  });
  const tranThiLyVioletMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0xc026d3,
    emissiveIntensity: 0.08,
    roughness: 0.28,
  });
  // Dedicated Cầu Trần Thị Lý architectural roadway, sage-green 4-bar railing, salmon walkway & white sail-pylon materials
  const ttlAsphaltMat = new THREE.MeshStandardMaterial({
    color: 0x575b61,
    roughness: 0.88,
    ...(asphaltTex
      ? { map: asphaltTex.map, bumpMap: asphaltTex.bumpMap, bumpScale: 0.016 }
      : {}),
  });
  const ttlSalmonWalkMat = new THREE.MeshStandardMaterial({
    color: 0xe2a291,
    roughness: 0.80,
    ...(terracottaMap && terracottaBump
      ? { map: terracottaMap, bumpMap: terracottaBump, bumpScale: 0.018 }
      : {}),
  });
  const ttlWhiteMedianMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.42,
    metalness: 0.06,
  });
  const ttlSageRailMat = new THREE.MeshStandardMaterial({
    color: 0x9ab396,
    roughness: 0.36,
    metalness: 0.30,
  });
  const ttlDarkDashMat = new THREE.MeshStandardMaterial({
    color: 0x3a3e44,
    roughness: 0.65,
  });
  const ttlConcreteGirderMat = new THREE.MeshStandardMaterial({
    color: 0xcbd2da,
    roughness: 0.72,
    metalness: 0.08,
  });
  const ttlSailWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.08,
    roughness: 0.26,
    metalness: 0.18,
  });
  const ttlWhiteCableMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.10,
    roughness: 0.28,
    metalness: 0.35,
  });
  const ttlCanopySilverMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0xcbd5e1,
    emissiveIntensity: 0.06,
    roughness: 0.30,
    metalness: 0.32,
  });
  neonMats.push(bridgeCyanMat, bridgeMagentaMat, dragonGoldMat, dragonBodyGoldMat, tranThiLyVioletMat, ttlSailWhiteMat);
  lanternMats.push(warmLanternMat);

  const scalePlaneUv = (geo: THREE.BufferGeometry, tileW: number, tileH: number) => {
    const uv = geo.attributes.uv;
    if (!uv) return geo;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * tileW, uv.getY(i) * tileH);
    }
    uv.needsUpdate = true;
    return geo;
  };

  const addBox = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    mat: THREE.Material
  ) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = new THREE.BoxGeometry(w, y1 - y0, d);
    if (mat === coastalTileMat || mat === granitePromenadeMat) {
      scalePlaneUv(geo, Math.max(1, w / 3.5), Math.max(1, d / 3.5));
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    if (mat === coastalTileMat || mat === granitePromenadeMat || mat === woodDeckMat) {
      m.receiveShadow = true;
    }
    staticGroup.add(m);
    return m;
  };

  const addStrut = (
    pA: [number, number, number],
    pB: [number, number, number],
    r: number,
    mat: THREE.Material,
    radialSegs = 6
  ) => {
    const a = new THREE.Vector3(...pA);
    const b = new THREE.Vector3(...pB);
    const len = a.distanceTo(b);
    if (len < 0.05) return;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radialSegs), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    staticGroup.add(mesh);
    return mesh;
  };

  const addMark = (x: number, z: number, w: number, d: number, mat: THREE.Material, y = -0.25) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    staticGroup.add(m);
  };

  const tBothArrow = createRoadArrowTex('t_both');
  const straightArrow = createRoadArrowTex('straight');
  const straightRightArrow = createRoadArrowTex('straight_right');
  const straightLeftArrow = createRoadArrowTex('straight_left');
  const addArrowDecal = (x: number, z: number, tex: THREE.Texture, rotY = 0, y = -0.244) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false })
    );
    m.rotation.order = 'YXZ';
    m.rotation.y = rotY;
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    staticGroup.add(m);
  };

  // Helper to construct 4-way corner LED Traffic Signal Rig at any intersection (cx, cz)
  // (Sleek 4.4m corner posts — zero overhead gantry arms blocking storefront/river views!)
  const buildTrafficSignalRig = (
    cx: number,
    cz: number,
    _includePortalClearance = false,
    portalSignZ?: number,
    southHalfX = 9.25,
    northHalfX = 9.25
  ) => {
    interface SignalLightHeads {
      ewRed: THREE.MeshStandardMaterial;
      ewYellow: THREE.MeshStandardMaterial;
      ewGreen: THREE.MeshStandardMaterial;
      nsRed: THREE.MeshStandardMaterial;
      nsYellow: THREE.MeshStandardMaterial;
      nsGreen: THREE.MeshStandardMaterial;
    }

    const heads: SignalLightHeads = {
      ewRed: new THREE.MeshStandardMaterial({ color: 0x3f0a0a, emissive: 0xef4444, emissiveIntensity: 0 }),
      ewYellow: new THREE.MeshStandardMaterial({ color: 0x422006, emissive: 0xf59e0b, emissiveIntensity: 0 }),
      ewGreen: new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 2.0 }),
      nsRed: new THREE.MeshStandardMaterial({ color: 0x3f0a0a, emissive: 0xef4444, emissiveIntensity: 2.0 }),
      nsYellow: new THREE.MeshStandardMaterial({ color: 0x422006, emissive: 0xf59e0b, emissiveIntensity: 0 }),
      nsGreen: new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 0 }),
    };

    const housingMat = darkMetalMat;
    const poleH = 4.45;
    const swX = cx - southHalfX;
    const seX = cx + southHalfX;
    const nwX = cx - northHalfX;
    const neX = cx + northHalfX;
    const swZ = portalSignZ ?? cz + 8.95;
    const neZ = cz - 8.95;

    // 4 clean corner masts (zero overhead steel portal arch across the road)
    [
      [nwX, neZ],
      [neX, neZ],
      [seX, swZ],
      [swX, swZ],
    ].forEach(([px, pz]) => {
      addBox(px - 0.22, px + 0.22, 0.0, 0.40, pz - 0.22, pz + 0.22, housingMat);
      addBox(px - 0.12, px + 0.12, 0.0, poleH, pz - 0.12, pz + 0.12, housingMat);
    });

    const mountCornerSignal = (
      x: number,
      z: number,
      offX: number,
      offZ: number,
      axis: 'ew' | 'ns'
    ) => {
      const stub = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(offX) + 0.12, 0.10, Math.abs(offZ) + 0.12),
        housingMat
      );
      stub.position.set(x + offX * 0.5, 3.55, z + offZ * 0.5);
      staticGroup.add(stub);

      const box = new THREE.Group();
      box.position.set(x + offX, 3.55, z + offZ);
      box.rotation.y = axis === 'ew' ? Math.PI / 2 : 0;
      const shell = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.40, 0.32), housingMat);
      box.add(shell);

      const mats =
        axis === 'ew'
          ? [heads.ewRed, heads.ewYellow, heads.ewGreen]
          : [heads.nsRed, heads.nsYellow, heads.nsGreen];
      [-0.30, 0, 0.30].forEach((lx, idx) => {
        [-0.17, 0.17].forEach((lz) => {
          const lens = new THREE.Mesh(new THREE.CircleGeometry(0.10, 10), mats[idx]);
          lens.position.set(lx, 0, lz);
          if (lz < 0) lens.rotation.y = Math.PI;
          lens.userData.noMerge = true;
          box.add(lens);
        });
      });
      staticGroup.add(box);
    };

    // Compact corner-mounted 4-way traffic signal heads (two directions at NE corner, two at SW corner)
    mountCornerSignal(neX, neZ, -0.32, 0, 'ns');
    mountCornerSignal(neX, neZ, 0, 0.32, 'ew');
    mountCornerSignal(swX, swZ, 0.32, 0, 'ns');
    mountCornerSignal(swX, swZ, 0, -0.32, 'ew');

    const applyPhase = (
      ew: 'green' | 'yellow' | 'red',
      ns: 'green' | 'yellow' | 'red'
    ) => {
      heads.ewGreen.emissiveIntensity = ew === 'green' ? 2.1 : 0.02;
      heads.ewYellow.emissiveIntensity = ew === 'yellow' ? 2.1 : 0.02;
      heads.ewRed.emissiveIntensity = ew === 'red' ? 2.1 : 0.02;

      heads.nsGreen.emissiveIntensity = ns === 'green' ? 2.1 : 0.02;
      heads.nsYellow.emissiveIntensity = ns === 'yellow' ? 2.1 : 0.02;
      heads.nsRed.emissiveIntensity = ns === 'red' ? 2.1 : 0.02;
    };

    return { applyPhase };
  };

  const mountCornerStreetSign = (x: number, z: number, signMat: THREE.MeshStandardMaterial, dirX: number) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.08), darkMetalMat);
    bracket.position.set(x + dirX * 0.55, 4.28, z);
    staticGroup.add(bracket);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.54, 0.10), signMat);
    blade.position.set(x + dirX * 1.05, 4.28, z);
    blade.userData.noMerge = true;
    staticGroup.add(blade);
  };

  // =========================================================================
  // 1. ĐƯỜNG BẠCH ĐẰNG (X = -235.9 .. 538) + GÓC TÂY BỆNH VIỆN (-227.5) + CẦU SÔNG HÀN (193.5) + SƠN TÂY (370) + DIOR (503)
  // =========================================================================
  const tRoadCenterZ = -117.5;

  // East-West Bạch Đằng Boulevard Asphalt (Z = -125.9 .. -109.1, X = -235.9 .. 538.0)
  const ewRoadMesh = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(773.9, 16.8), 120, 3), asphaltMat);
  ewRoadMesh.rotation.x = -Math.PI / 2;
  ewRoadMesh.position.set(151.05, -0.26, tRoadCenterZ);
  ewRoadMesh.receiveShadow = true;
  staticGroup.add(ewRoadMesh);

  // Bridge North Apron Strips (Z = -129.0 .. -125.9) joining ewRoadMesh flush with each bridge without coplanar overlap!
  const stemRoadMesh = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(16.8, 3.1), 3, 1), asphaltMat);
  stemRoadMesh.rotation.x = -Math.PI / 2;
  stemRoadMesh.position.set(HAN_BRIDGE_CENTER_X, -0.26, -127.45);
  stemRoadMesh.receiveShadow = true;
  staticGroup.add(stemRoadMesh);

  const sonTayStemRoadMesh = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(16.8, 3.1), 3, 1), asphaltMat);
  sonTayStemRoadMesh.rotation.x = -Math.PI / 2;
  sonTayStemRoadMesh.position.set(DRAGON_BRIDGE_CENTER_X, -0.26, -127.45);
  sonTayStemRoadMesh.receiveShadow = true;
  staticGroup.add(sonTayStemRoadMesh);

  const diorStemRoadMesh = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(16.8, 3.1), 3, 1), asphaltMat);
  diorStemRoadMesh.rotation.x = -Math.PI / 2;
  diorStemRoadMesh.position.set(TRAN_THI_LY_BRIDGE_CENTER_X, -0.26, -127.45);
  diorStemRoadMesh.receiveShadow = true;
  staticGroup.add(diorStemRoadMesh);

  // South Sidewalks flanking Bạch Đằng & all junctions (split around X = 5.8..13.8 for The Royal Residences Bạch Đằng B1 garage ramp):
  addBox(-214.0, 5.8, -0.28, 0.0, -109.1, -104.0, coastalTileMat);
  addBox(13.8, 185.3, -0.28, 0.0, -109.1, -104.0, coastalTileMat);
  addBox(-219.3, 5.8, 0.0, 0.12, -109.22, -108.98, darkCurbMat);
  addBox(13.8, 185.18, 0.0, 0.12, -109.22, -108.98, darkCurbMat);
  addBox(185.18, 185.42, 0.0, 0.12, -109.22, -104.0, darkCurbMat);

  addBox(201.7, 361.8, -0.28, 0.0, -109.1, -104.0, coastalTileMat);
  addBox(201.82, 361.68, 0.0, 0.12, -109.22, -108.98, darkCurbMat);
  addBox(201.58, 201.82, 0.0, 0.12, -109.22, -104.0, darkCurbMat);
  addBox(361.68, 361.92, 0.0, 0.12, -109.22, -104.0, darkCurbMat);

  addBox(378.2, 494.6, -0.28, 0.0, -109.1, -104.0, coastalTileMat);
  addBox(378.32, 494.48, 0.0, 0.12, -109.22, -108.98, darkCurbMat);
  addBox(378.08, 378.32, 0.0, 0.12, -109.22, -104.0, darkCurbMat);
  addBox(494.48, 494.72, 0.0, 0.12, -109.22, -104.0, darkCurbMat);

  addBox(511.4, 538.0, -0.28, 0.0, -109.1, -104.0, coastalTileMat);
  addBox(511.52, 538.0, 0.0, 0.12, -109.22, -108.98, darkCurbMat);
  addBox(511.28, 511.52, 0.0, 0.12, -109.22, -104.0, darkCurbMat);

  // Flush concrete sub-slab under East Corner Walk-In Green Park beside 4U Club
  addBox(207.0, 252.0, -0.28, -0.02, -104.0, -70.0, coastalTileMat);

  // Road Markings on Đường Bạch Đằng (West segment X = -215 .. 182)
  [-0.14, 0.14].forEach((off) => addMark(-16.5, tRoadCenterZ + off, 397.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(-16.5, tRoadCenterZ + dir * 7.75, 397.0, 0.16, stripeMat));
  for (let x = -211; x <= 178; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, tRoadCenterZ + off, 2.4, 0.14, stripeMat));
  }

  [-0.14, 0.14].forEach((off) => addMark(282.0, tRoadCenterZ + off, 154.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(282.0, tRoadCenterZ + dir * 7.75, 154.0, 0.16, stripeMat));
  for (let x = 208; x <= 355; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, tRoadCenterZ + off, 2.4, 0.14, stripeMat));
  }

  [-0.14, 0.14].forEach((off) => addMark(436.0, tRoadCenterZ + off, 110.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(436.0, tRoadCenterZ + dir * 7.75, 110.0, 0.16, stripeMat));
  for (let x = 384; x <= 487; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, tRoadCenterZ + off, 2.4, 0.14, stripeMat));
  }

  [-0.14, 0.14].forEach((off) => addMark(526.5, tRoadCenterZ + off, 23.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(526.5, tRoadCenterZ + dir * 7.75, 23.0, 0.16, stripeMat));
  for (let x = 517; x <= 535; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, tRoadCenterZ + off, 2.4, 0.14, stripeMat));
  }

  // 2 Zebra Crosswalks framing Góc Tây Bạch Đằng – Đại Lộ Bệnh Viện (X = -227.5, Z = -117.5)
  for (let x = -234.7; x <= -220.3; x += 1.05) {
    addMark(x, -107.3, 0.52, 3.0, stripeMat, -0.248); // South crosswalk across Đại Lộ Bệnh Viện
  }
  for (let z = -124.7; z <= -110.3; z += 1.05) {
    addMark(-216.7, z, 3.0, 0.52, stripeMat, -0.248); // East crosswalk across Đường Bạch Đằng
  }

  // 4 Zebra Crosswalks framing Ngã Tư Bạch Đằng – Cầu Sông Hàn (X = 193.5, Z = -117.5)
  for (let x = 186.2; x <= 200.8; x += 1.05) {
    addMark(x, -107.3, 0.52, 3.0, stripeMat, -0.248); // South crosswalk
    addMark(x, -127.3, 0.52, 2.8, stripeMat, -0.248); // North crosswalk (Bridge mouth)
  }
  [183.4, 203.6].forEach((cx) => {
    for (let z = -124.7; z <= -110.3; z += 1.05) {
      addMark(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // 4 Zebra Crosswalks framing Ngã Tư Bạch Đằng - Cầu Rồng (X = 370.0, Z = -117.5)
  for (let x = 362.8; x <= 377.2; x += 1.05) {
    addMark(x, -107.3, 0.52, 3.0, stripeMat, -0.248);
    addMark(x, -127.3, 0.52, 2.8, stripeMat, -0.248); // North crosswalk (Cầu Rồng mouth)
  }
  [359.8, 380.2].forEach((cx) => {
    for (let z = -124.7; z <= -110.3; z += 1.05) {
      addMark(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // 4 Zebra Crosswalks framing Ngã Tư Bạch Đằng - Cầu Trần Thị Lý (X = 503.0)
  for (let x = 495.8; x <= 510.2; x += 1.05) {
    addMark(x, -107.3, 0.52, 3.0, stripeMat, -0.248);
    addMark(x, -127.3, 0.52, 2.8, stripeMat, -0.248); // North crosswalk (Cầu Trần Thị Lý mouth)
  }
  [492.8, 513.2].forEach((cx) => {
    for (let z = -124.7; z <= -110.3; z += 1.05) {
      addMark(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // Stop Lines + Pavement Arrows for Góc Tây Bạch Đằng – Đại Lộ Bệnh Viện (-227.5, -117.5)
  addMark(-223.4, -104.8, 7.6, 0.42, stripeMat, -0.247); // Đại Lộ Bệnh Viện NB stop line
  addMark(-214.0, -121.7, 0.42, 7.6, stripeMat, -0.247); // Bạch Đằng WB approach stop line
  addArrowDecal(-224.4, -101.8, straightRightArrow, 0);
  addArrowDecal(-210.5, -121.6, straightLeftArrow, Math.PI / 2);

  // Corner Signpost at Góc Tây Bạch Đằng – Đại Lộ Bệnh Viện (-218.25, -108.5)
  addBox(-218.47, -218.03, 0.0, 0.40, -108.72, -108.28, darkMetalMat);
  addBox(-218.37, -218.13, 0.0, 4.45, -108.62, -108.38, darkMetalMat);
  const westBachDangSignTex = createBachDangSignTex(
    'NGÃ TƯ BẠCH ĐẰNG • VEN BIỂN TÂY',
    '▲ VEN SÔNG – BIỂN MỸ KHÊ TÂY  |  ▼ ĐẠI LỘ BỆNH VIỆN  |  CẦU SÔNG HÀN ▶'
  );
  const westBachDangSignMat = new THREE.MeshStandardMaterial({
    map: westBachDangSignTex,
    emissive: 0xffffff,
    emissiveMap: westBachDangSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(westBachDangSignMat);
  mountCornerStreetSign(-218.25, -108.5, westBachDangSignMat, 1);

  // Stop Lines + Pavement Arrows for Ngã 4 Bạch Đằng – Cầu Sông Hàn
  addMark(197.6, -104.8, 7.6, 0.42, stripeMat, -0.247); // Phố Đi Bộ NB stop line
  addMark(189.4, -129.1, 7.6, 0.42, stripeMat, -0.247); // Cầu Sông Hàn SB stop line
  addMark(180.8, -113.3, 0.42, 7.6, stripeMat, -0.247); // West-approach EB stop line
  addMark(206.2, -121.7, 0.42, 7.6, stripeMat, -0.247); // East-approach WB stop line

  addArrowDecal(196.6, -101.8, straightArrow, 0);
  addArrowDecal(177.2, -113.4, straightLeftArrow, -Math.PI / 2);
  addArrowDecal(209.8, -121.6, straightRightArrow, Math.PI / 2);

  // Ngã 4 Bạch Đằng – Cầu Rồng & Ngã 4 Cầu Trần Thị Lý Stop Lines + Arrows
  addMark(374.1, -104.8, 7.6, 0.42, stripeMat, -0.247); // Sơn Tây NB stop line
  addMark(365.9, -129.1, 7.6, 0.42, stripeMat, -0.247); // Cầu Rồng SB stop line
  addMark(357.2, -113.3, 0.42, 7.6, stripeMat, -0.247); // EB stop line
  addMark(382.8, -121.7, 0.42, 7.6, stripeMat, -0.247); // WB stop line

  addMark(507.1, -104.8, 7.6, 0.42, stripeMat, -0.247); // Đại Lộ Paris NB stop line
  addMark(498.9, -129.1, 7.6, 0.42, stripeMat, -0.247); // Cầu Trần Thị Lý SB stop line
  addMark(490.2, -113.3, 0.42, 7.6, stripeMat, -0.247);
  addMark(515.8, -121.7, 0.42, 7.6, stripeMat, -0.247);

  addArrowDecal(373.1, -101.8, straightArrow, 0);
  addArrowDecal(353.6, -113.4, straightLeftArrow, -Math.PI / 2);
  addArrowDecal(386.4, -121.6, straightRightArrow, Math.PI / 2);

  addArrowDecal(506.1, -101.8, straightArrow, 0);
  addArrowDecal(486.6, -113.4, straightLeftArrow, -Math.PI / 2);
  addArrowDecal(519.4, -121.6, straightRightArrow, Math.PI / 2);

  // Corner Signal Rig + Compact Sidewalk Street-Name Sign ("NGÃ TƯ BẠCH ĐẰNG • CẦU SÔNG HÀN")
  const bachDangSignTex = createBachDangSignTex();
  const bachDangSignMat = new THREE.MeshStandardMaterial({
    map: bachDangSignTex,
    emissive: 0xffffff,
    emissiveMap: bachDangSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  const southSignalRig = buildTrafficSignalRig(193.5, -117.5, false, -108.5, 9.25, 11.2);
  mountCornerStreetSign(184.25, -108.5, bachDangSignMat, -1);

  // Corner Signal Rig + Compact Sidewalk Street-Name Sign at Ngã Tư Bạch Đằng - Cầu Rồng (X = 370.0)
  const sonTayBachDangSignTex = createBachDangSignTex(
    'NGÃ TƯ BẠCH ĐẰNG • CẦU RỒNG',
    '▲ QUA CẦU RỒNG  •  ◀ CẦU SÔNG HÀN  •  CẦU TRẦN THỊ LÝ ▶'
  );
  const sonTaySignMat = new THREE.MeshStandardMaterial({
    map: sonTayBachDangSignTex,
    emissive: 0xffffff,
    emissiveMap: sonTayBachDangSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(sonTaySignMat);
  const dragonSouthSignalRig = buildTrafficSignalRig(
    DRAGON_BRIDGE_CENTER_X,
    -117.5,
    false,
    -108.5,
    9.25,
    12.15
  );
  mountCornerStreetSign(360.75, -108.5, sonTaySignMat, -1);

  // Corner Signal Rig + Street-Name Sign at Ngã Tư Bạch Đằng - Cầu Trần Thị Lý (X = 503.0, Z = -117.5)
  const diorBachDangSignTex = createBachDangSignTex(
    'NGÃ TƯ BẠCH ĐẰNG • CẦU TRẦN THỊ LÝ',
    '▲ QUA CẦU TRẦN THỊ LÝ  •  ◀ CẦU RỒNG  •  BỜ ĐÔNG ▶'
  );
  const diorSignMat = new THREE.MeshStandardMaterial({
    map: diorBachDangSignTex,
    emissive: 0xffffff,
    emissiveMap: diorBachDangSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(diorSignMat);
  const tranThiLySouthSignalRig = buildTrafficSignalRig(
    TRAN_THI_LY_BRIDGE_CENTER_X,
    -117.5,
    false,
    -108.5,
    9.25,
    14.5
  );
  mountCornerStreetSign(512.2, -108.5, diorSignMat, 1);

  // =========================================================================
  // 2. BỜ KÈ BẠCH ĐẰNG + ĐƯỜNG VEN SÔNG BẠCH ĐẰNG TÂY (CONNECTING TO ĐƯỜNG VEN BIỂN VÕ NGUYÊN GIÁP) + VIEWING PIER
  // =========================================================================
  // East-of-connector Bờ Kè Bạch Đằng promenade starts cleanly at X = -219.1 (leaving X = -235.9..-219.1 open for the North tie-in road!)
  addBox(-219.1, 182.4, -0.25, 0.0, -134.5, -125.9, granitePromenadeMat);
  addBox(-241.0, -235.9, -0.25, 0.0, -137.0, -125.9, coastalTileMat);
  addBox(204.6, 358.2, -0.25, 0.0, -134.5, -125.9, granitePromenadeMat);
  addBox(381.8, 488.9, -0.25, 0.0, -134.5, -125.9, granitePromenadeMat);
  addBox(517.1, 538.0, -0.25, 0.0, -134.5, -125.9, granitePromenadeMat);
  addBox(-241.0, -235.9, 0.0, 0.12, -126.02, -125.78, darkCurbMat);
  addBox(-219.1, 182.4, 0.0, 0.12, -126.02, -125.78, darkCurbMat);
  addBox(-241.12, -240.88, 0.0, 0.12, -134.5, -125.9, darkCurbMat);
  addBox(-236.02, -235.78, 0.0, 0.12, -137.0, -125.9, darkCurbMat);
  addBox(-219.22, -218.98, 0.0, 0.12, -153.4, -125.9, darkCurbMat);
  addBox(204.6, 358.2, 0.0, 0.12, -126.02, -125.78, darkCurbMat);
  addBox(381.8, 488.9, 0.0, 0.12, -126.02, -125.78, darkCurbMat);
  addBox(517.1, 538.0, 0.0, 0.12, -126.02, -125.78, darkCurbMat);

  // 2a. ĐƯỜNG VEN SÔNG BẠCH ĐẰNG TÂY (4-Lane Scenic Riverfront Boulevard: X = -965.0..-219.1, Z = -153.4..-137.0)
  //     + East Tie-In Leg (X = -235.9..-219.1, Z = -137.0..-125.9) seamlessly joining Đường Bạch Đằng & Đại Lộ Bệnh Viện!
  const westConnectorRoad = new THREE.Mesh(
    scalePlaneUv(new THREE.PlaneGeometry(745.9, 16.4), 74, 2),
    asphaltMat
  );
  westConnectorRoad.rotation.x = -Math.PI / 2;
  westConnectorRoad.position.set(-592.05, -0.26, -145.2);
  westConnectorRoad.receiveShadow = true;
  staticGroup.add(westConnectorRoad);

  const westTieInLeg = new THREE.Mesh(
    scalePlaneUv(new THREE.PlaneGeometry(16.8, 11.2), 2, 2),
    asphaltMat
  );
  westTieInLeg.rotation.x = -Math.PI / 2;
  westTieInLeg.position.set(-227.5, -0.26, -131.45);
  westTieInLeg.receiveShadow = true;
  staticGroup.add(westTieInLeg);

  // South Sidewalk along Đường Ven Sông Bạch Đằng Tây (X = -960.0..-235.9, Z = -137.0..-134.0)
  // Segmented cleanly around all 6 Row N4 alleys & Công Viên Tổ 7 riverfront gate, with sloped asphalt tie-in ramps & zebra crossings!
  let riverWalkCursorX = -960.0;
  const sortedRiverOpenings = [...WEST_RIVER_RESIDENTIAL_OPENINGS].sort((a, b) => a.minX - b.minX);
  const riverRampAngle = Math.atan2(0.295, 3.0);
  for (const op of sortedRiverOpenings) {
    if (op.minX > riverWalkCursorX + 0.1) {
      addBox(riverWalkCursorX, op.minX, -0.28, 0.0, -137.0, -134.0, coastalTileMat);
      addBox(riverWalkCursorX, op.minX, 0.0, 0.12, -137.12, -136.88, darkCurbMat);
    }
    // Flush sloped asphalt tie-in apron bridging Row N4 alley (+0.035 at Z=-134.0) <-> Đường Ven Sông (-0.26 at Z=-137.0)
    const opW = op.maxX - op.minX;
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(opW, 0.14, 3.12), asphaltMat);
    rampMesh.position.set(op.cx, -0.18, -135.5);
    rampMesh.rotation.x = -riverRampAngle;
    staticGroup.add(rampMesh);
    // Subtle white crosswalk bars across each residential-to-river junction mouth
    const barCount = Math.max(3, Math.floor(opW / 1.45));
    for (let bi = 0; bi < barCount; bi++) {
      const bx = op.minX + 0.7 + ((opW - 1.4) * bi) / Math.max(1, barCount - 1);
      addMark(bx, -138.2, 0.52, 2.0, stripeMat, -0.248);
    }
    riverWalkCursorX = op.maxX;
  }
  if (riverWalkCursorX < -235.9) {
    addBox(riverWalkCursorX, -235.9, -0.28, 0.0, -137.0, -134.0, coastalTileMat);
    addBox(riverWalkCursorX, -235.9, 0.0, 0.12, -137.12, -136.88, darkCurbMat);
  }

  // Continuous Bờ Kè Ven Sông Tây Granite Promenade (X = -960.0..-214.0, Z = -165.0..-153.4) + East Corner Promenade (X = -219.1..-214.0, Z = -153.4..-134.5)
  addBox(-960.0, -214.0, -0.25, 0.0, -165.0, -153.4, granitePromenadeMat);
  addBox(-219.1, -214.0, -0.25, 0.0, -153.4, -134.5, granitePromenadeMat);
  addBox(-960.0, -219.0, 0.0, 0.12, -153.52, -153.28, darkCurbMat);

  // Double-yellow center lines, white edge stripes & dashed lane dividers along Đường Ven Sông Bạch Đằng Tây
  const westRoadCenterZ = -145.2;
  [-0.14, 0.14].forEach((off) => addMark(-599.5, westRoadCenterZ + off, 722.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(-599.5, westRoadCenterZ + dir * 7.75, 722.0, 0.16, stripeMat));
  for (let x = -956; x <= -242; x += 6.0) {
    [-4.1, 4.1].forEach((off) => addMark(x, westRoadCenterZ + off, 2.6, 0.14, stripeMat));
  }
  // Tie-in leg N-S lane markings & crosswalk connecting into Đường Bạch Đằng (Z = -137.0..-125.9)
  [-0.14, 0.14].forEach((off) => addMark(-227.5 + off, -131.5, 0.12, 8.6, yellowMedianMat));
  for (let x = -234.7; x <= -220.3; x += 1.05) {
    addMark(x, -127.6, 0.52, 2.8, stripeMat, -0.248);
  }
  for (let z = -152.2; z <= -138.2; z += 1.05) {
    addMark(-237.8, z, 2.8, 0.52, stripeMat, -0.248);
  }
  // Directional corner sign at the East elbow (-216.2, -154.5) guiding drivers between Đường Bạch Đằng & Biển Mỹ Khê Tây
  addBox(-216.4, -216.0, 0.0, 4.35, -154.7, -154.3, darkMetalMat);
  const westConnectorSignTex = createBachDangSignTex(
    'ĐƯỜNG VEN SÔNG BẠCH ĐẰNG TÂY',
    '◀ BÃI BIỂN MỸ KHÊ TÂY • VÕ NGUYÊN GIÁP  |  ĐƯỜNG BẠCH ĐẰNG • CẦU SÔNG HÀN ▶'
  );
  const westConnectorSignMat = new THREE.MeshStandardMaterial({
    map: westConnectorSignTex,
    emissive: 0xffffff,
    emissiveMap: westConnectorSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(westConnectorSignMat);
  mountCornerStreetSign(-216.2, -154.5, westConnectorSignMat, -1);

  // Retaining side curbs along all 3 Bridge Mouths on Promenade (Z = -134.5..-125.9)
  addBox(185.5, 185.75, -0.26, 0.12, -134.5, -125.9, darkCurbMat);
  addBox(201.25, 201.5, -0.26, 0.12, -134.5, -125.9, darkCurbMat);
  addBox(361.45, 361.7, -0.26, 0.12, -134.5, -125.9, darkCurbMat);
  addBox(378.3, 378.55, -0.26, 0.12, -134.5, -125.9, darkCurbMat);
  addBox(494.45, 494.7, -0.26, 0.12, -134.5, -125.9, darkCurbMat);
  addBox(511.3, 511.55, -0.26, 0.12, -134.5, -125.9, darkCurbMat);

  // Vertical Stone River Embankment Quay Wall (West Riverfront Z=-165 from Ocean X=-996 to Corner X=-214, Corner Return X=-214, South Bank X=-214..570, North Bank seal X=-996..60)
  addBox(-996.0, -213.8, -3.4, 0.05, -165.4, -164.7, stoneWallMat);
  addBox(-960.0, -213.8, 0.0, 0.18, -165.15, -164.45, marbleWhiteMat);
  addBox(-214.3, -213.6, -3.4, 0.05, -165.4, -134.1, stoneWallMat);
  addBox(-214.45, -213.75, 0.0, 0.18, -165.15, -133.95, marbleWhiteMat);
  addBox(-996.0, 60.0, -3.5, -0.26, -345.4, -344.8, stoneWallMat);
  addBox(-214.0, 182.3, -3.4, 0.05, -134.8, -134.1, stoneWallMat);
  addBox(204.7, 358.0, -3.4, 0.05, -134.8, -134.1, stoneWallMat);
  addBox(382.0, 488.7, -3.4, 0.05, -134.8, -134.1, stoneWallMat);
  addBox(517.3, 570.0, -3.4, 0.05, -134.8, -134.1, stoneWallMat);
  addBox(-214.0, 182.3, 0.0, 0.18, -134.65, -133.95, marbleWhiteMat);
  addBox(204.7, 358.0, 0.0, 0.18, -134.65, -133.95, marbleWhiteMat);
  addBox(382.0, 488.7, 0.0, 0.18, -134.65, -133.95, marbleWhiteMat);
  addBox(517.3, 570.0, 0.0, 0.18, -134.65, -133.95, marbleWhiteMat);

  // White & Glass Riverside Balustrade Railing (Continuous along West Connector Z=-164.65 + East Corner X=-214.15 + Bạch Đằng Z=-134.15)
  const addRailingRun = (x0: number, x1: number, z: number) => {
    addBox(x0, x1, 0.18, 0.88, z - 0.03, z + 0.03, railGlassMat);
    addBox(x0, x1, 0.94, 1.04, z - 0.06, z + 0.06, marbleWhiteMat);
    for (let px = x0; px <= x1 + 0.01; px += 3.5) {
      addBox(px - 0.09, px + 0.09, 0.18, 1.06, z - 0.09, z + 0.09, marbleWhiteMat);
    }
  };
  addRailingRun(-960.0, -214.15, -164.65);
  // N-S Railing closing East Corner Promenade (X = -214.15, Z = -164.65 .. -134.15)
  addBox(-214.18, -214.12, 0.18, 0.88, -164.65, -134.15, railGlassMat);
  addBox(-214.21, -214.09, 0.94, 1.04, -164.65, -134.15, marbleWhiteMat);
  for (let pz = -164.65; pz <= -134.14; pz += 3.8) {
    addBox(-214.24, -214.06, 0.18, 1.06, pz - 0.09, pz + 0.09, marbleWhiteMat);
  }
  addRailingRun(-214.0, 140.0, -134.15);
  addRailingRun(152.0, 182.3, -134.15);
  addRailingRun(204.7, 358.0, -134.15);
  addRailingRun(382.0, 488.7, -134.15);
  addRailingRun(517.3, 537.5, -134.15);

  // Relocated Viewing Pier (Bến Du Thuyền at X = 140.0..152.0, Z = -142.0..-134.5)
  addBox(VIEWING_PIER_CENTER_X - 6.0, VIEWING_PIER_CENTER_X + 6.0, -0.22, 0.02, -142.0, -134.5, woodDeckMat);
  [-1, 1].forEach((sx) => {
    const px = VIEWING_PIER_CENTER_X + sx * 5.2;
    [-136.5, -141.2].forEach((pz) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.6, 10), stoneWallMat);
      piling.position.set(px, -1.75, pz);
      staticGroup.add(piling);
    });
  });
  addBox(VIEWING_PIER_CENTER_X - 6.1, VIEWING_PIER_CENTER_X + 6.1, -0.18, 0.05, -142.08, -141.96, bridgeCyanMat);
  addBox(VIEWING_PIER_CENTER_X - 6.05, VIEWING_PIER_CENTER_X - 5.88, 0.02, 1.02, -142.0, -134.4, marbleWhiteMat);
  addBox(VIEWING_PIER_CENTER_X + 5.88, VIEWING_PIER_CENTER_X + 6.05, 0.02, 1.02, -142.0, -134.4, marbleWhiteMat);
  addBox(VIEWING_PIER_CENTER_X - 6.05, VIEWING_PIER_CENTER_X + 6.05, 0.02, 1.02, -142.05, -141.88, marbleWhiteMat);

  // Relocated "Cá Chép Hóa Rồng" Landmark on Viewing Pier (X = 146.0, Z = -137.6)
  const statuePed = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.32, 0.95, 16), marbleWhiteMat);
  statuePed.position.set(VIEWING_PIER_CENTER_X, 0.48, -137.6);
  staticGroup.add(statuePed);
  const statueRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.05, 8, 24), bridgeCyanMat);
  statueRing.rotation.x = Math.PI / 2;
  statueRing.position.set(VIEWING_PIER_CENTER_X, 0.92, -137.6);
  staticGroup.add(statueRing);
  const carpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.56, 2.25, 12), marbleWhiteMat);
  carpBody.position.set(VIEWING_PIER_CENTER_X, 2.0, -137.6);
  staticGroup.add(carpBody);
  const dragonHead = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.85), dragonGoldMat);
  dragonHead.position.set(VIEWING_PIER_CENTER_X, 3.25, -137.45);
  staticGroup.add(dragonHead);

  // Bạch Đằng Coastal Palm Trees & Riverside Lanterns
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78553a, roughness: 0.9 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.78 });
  const addCoastalPalm = (px: number, pz: number, h = 5.4) => {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, h, 8), palmTrunkMat);
    trunk.position.y = h * 0.5;
    g.add(trunk);
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.4), palmLeafMat);
      frond.position.set(Math.sin(ang) * 1.15, h - 0.1, Math.cos(ang) * 1.15);
      frond.rotation.y = ang;
      frond.rotation.x = 0.28;
      g.add(frond);
    }
    staticGroup.add(g);
  };

  const poolTex = createWaterGlowPoolTex();
  const sharedPoolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  poolMats.push(sharedPoolMat);

  const addRiversideLamp = (lx: number, lz: number, baseY = 0) => {
    const grp = new THREE.Group();
    grp.position.set(lx, baseY, lz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 4.6, 8), darkMetalMat);
    pole.position.y = 2.3;
    grp.add(pole);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), warmLanternMat);
    globe.position.y = 4.7;
    grp.add(globe);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 8.5), sharedPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.025;
    grp.add(pool);
    staticGroup.add(grp);
  };

  // Architectural Boulevard Streetlamp along both sides of Đường Bạch Đằng roadway
  const addBoulevardStreetLamp = (lx: number, lz: number, armDirZ: 1 | -1) => {
    const grp = new THREE.Group();
    grp.position.set(lx, 0, lz);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.42, 10), darkMetalMat);
    plinth.position.y = 0.21;
    grp.add(plinth);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 6.8, 10), darkMetalMat);
    mast.position.y = 3.4;
    grp.add(mast);

    // Swept architectural luminaire arm reaching out over the asphalt lane
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 2.25), darkMetalMat);
    arm.position.set(0, 6.65, armDirZ * 1.05);
    arm.rotation.x = -armDirZ * 0.14;
    grp.add(arm);

    const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.85), darkMetalMat);
    headHousing.position.set(0, 6.80, armDirZ * 2.15);
    grp.add(headHousing);

    const ledPanel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.72), warmLanternMat);
    ledPanel.position.set(0, 6.71, armDirZ * 2.15);
    grp.add(ledPanel);

    // Warm asphalt light pool directly on the roadway surface (Y = -0.245 relative to 0 -> -0.245)
    const roadPool = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 13.5), sharedPoolMat);
    roadPool.rotation.x = -Math.PI / 2;
    roadPool.position.set(0, -0.245, armDirZ * 2.8);
    grp.add(roadPool);

    staticGroup.add(grp);
  };

  for (let x = -210; x <= 532; x += 18) {
    if (
      Math.abs(x - VIEWING_PIER_CENTER_X) > 7 &&
      Math.abs(x - HAN_BRIDGE_CENTER_X) > 13.5 &&
      Math.abs(x - DRAGON_BRIDGE_CENTER_X) > 14 &&
      Math.abs(x - TRAN_THI_LY_BRIDGE_CENTER_X) > 15.5
    ) {
      addRiversideLamp(x, -132.8);
    }
    if (
      Math.abs(x + 9 - HAN_BRIDGE_CENTER_X) > 13 &&
      Math.abs(x + 9 - DRAGON_BRIDGE_CENTER_X) > 13.5 &&
      Math.abs(x + 9 - TRAN_THI_LY_BRIDGE_CENTER_X) > 15.5 &&
      Math.abs(x + 9 - VIEWING_PIER_CENTER_X) > 6
    ) {
      addCoastalPalm(x + 9, -129.0, 5.2 + (Math.abs(x) % 3) * 0.4);
    }
    const inWestAvenueMouth = x >= -240 && x <= -214;
    const inRoyalRampMouth = x >= 4 && x <= 15;
    const inWestMouth = x >= 178 && x <= 208;
    const inEastMouth = x >= 357 && x <= 383;
    const inDiorMouth = x >= 488 && x <= 518;
    if (!inWestAvenueMouth && !inRoyalRampMouth && !inWestMouth && !inEastMouth && !inDiorMouth) {
      const palmX = x === -66 ? -51.2 : x === 132 ? 121.5 : x === 168 ? 165.4 : x;
      addCoastalPalm(palmX, -106.2, 4.8);
    }
  }
  addRiversideLamp(VIEWING_PIER_CENTER_X - 5.7, -133.5);
  addRiversideLamp(VIEWING_PIER_CENTER_X + 5.7, -133.5);

  // Scenic Palms, Riverside Lanterns, Benches & Streetlamps along Đường Ven Sông Bạch Đằng Tây (X = -950 .. -226)
  for (let x = -948; x <= -224; x += 28) {
    addRiversideLamp(x, -163.2);
    addCoastalPalm(x + 12, -158.6, 5.3 + (Math.abs(x) % 3) * 0.45);
    addBoulevardStreetLamp(x + 6, -154.25, 1);
    if (x <= -244 && !isInWestRiverResidentialOpening(x + 18, 1.4)) {
      addBoulevardStreetLamp(x + 18, -136.15, -1);
    }
    // River-view wooden & stone park benches facing Sông Hàn
    addBox(x - 1.1, x + 1.1, 0.0, 0.46, -162.1, -161.4, woodDeckMat);
    addBox(x - 1.1, x + 1.1, 0.46, 0.88, -161.55, -161.38, woodDeckMat);
  }
  // Distant North Bank Coastal Palm & Green Tree Line along Sông Hàn West Estuary (Z = -349.5, X = -982 .. -366)
  for (let x = -982; x <= -366; x += 36) {
    addCoastalPalm(x, -349.2, 6.2 + (Math.abs(x) % 3) * 0.5);
  }

  // 2-Side Waterfront Boulevard Streetlamps along Đường Bạch Đằng (North curb Z=-126.75 & South curb Z=-108.25)
  for (let x = -214; x <= 534; x += 22) {
    const inHanMouth = x >= 178 && x <= 209;
    const inDragonMouth = x >= 356 && x <= 384;
    const inTranThiLyMouth = x >= 486 && x <= 520;
    if (!inHanMouth && !inDragonMouth && !inTranThiLyMouth) {
      // North riverside curb facing South (+Z) over Westbound lanes (leave Viewing Pier neck 140..152 clear)
      if (x < 139 || x > 153) {
        addBoulevardStreetLamp(x, -126.75, 1);
      }

      // South curb facing North (-Z) over Eastbound lanes (clear of Đại Lộ Bệnh Viện corner <-214, Royal B1 ramp ~6, DIOR 491..515 & Casa Riva driveways ~271, ~300)
      const inDiorCross = x >= 491 && x <= 515;
      if (!inDiorCross) {
        const southX =
          Math.abs(x - 6) < 4.0
            ? 3.2
            : Math.abs(x - 270) < 3.5
              ? 265.0
              : Math.abs(x - 299) < 3.5
                ? 306.0
                : x;
        addBoulevardStreetLamp(southX, -108.25, -1);
      }
    }
  }

  // =========================================================================
  // 3. SÔNG HÀN ĐÀ NẴNG FLOWING CONTINUOUSLY WESTWARD INTO BIỂN MỸ KHÊ TÂY (X = -1045..572.5, Z = -345..-134.5)
  // =========================================================================
  const riverBed = new THREE.Mesh(new THREE.PlaneGeometry(1617.5, 218.0), riverBedMat);
  riverBed.rotation.x = -Math.PI / 2;
  riverBed.position.set(-236.25, -3.45, -240.0);
  staticGroup.add(riverBed);

  const waterDrawer = createWaterSurfaceDrawer();
  const waterWindNormalTex = createWaterWindNormalTex();
  const waterUniforms = {
    uWaterTime: { value: 0 },
    uWaterLamp: { value: 0 },
  };
  const configureRealisticWindWaterShader = (mat: THREE.MeshStandardMaterial) => {
    mat.customProgramCacheKey = () => 'han_river_wind_water_v1';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = waterUniforms.uWaterTime;
      shader.uniforms.uWaterLamp = waterUniforms.uWaterLamp;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vWaterWorldPos;`
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vWaterWorldPos;
uniform float uWaterTime;
uniform float uWaterLamp;`
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#ifdef USE_NORMALMAP_TANGENTSPACE
  vec2 wp = vWaterWorldPos.xz;
  // 3-layer seamless world-space wind swells, cross-wind chop & fine capillary wavelets
  vec2 uv1 = wp * vec2(0.058, 0.074) + vec2(uWaterTime * 0.015, uWaterTime * 0.008);
  vec2 uv2 = vec2(wp.x * 0.898 - wp.y * 0.438, wp.x * 0.438 + wp.y * 0.898) * vec2(0.148, 0.182)
           + vec2(-uWaterTime * 0.024, uWaterTime * 0.019);
  vec2 uv3 = vec2(wp.x * 0.961 + wp.y * 0.275, -wp.x * 0.275 + wp.y * 0.961) * vec2(0.44, 0.52)
           + vec2(uWaterTime * 0.044, -uWaterTime * 0.028);

  vec4 s1 = texture2D( normalMap, uv1 );
  vec4 s2 = texture2D( normalMap, uv2 );
  vec4 s3 = texture2D( normalMap, uv3 );
  vec3 n1 = s1.xyz * 2.0 - 1.0;
  vec3 n2 = s2.xyz * 2.0 - 1.0;
  vec3 n3 = s3.xyz * 2.0 - 1.0;

  float camDistW = length( vViewPosition );
  float microFade = 1.0 - smoothstep( 42.0, 165.0, camDistW );
  float gustEnv = 0.74 + 0.36 * sin( wp.x * 0.042 + wp.y * 0.068 - uWaterTime * 0.32 )
                       * cos( wp.x * 0.028 - wp.y * 0.051 + uWaterTime * 0.21 );

  vec3 mapN = vec3(
    ( n1.xy * 0.56 + n2.xy * 0.52 + n3.xy * ( 0.48 * microFade ) ) * gustEnv,
    1.0
  );
  mapN.xy *= normalScale;
  float waterSlopeMag = clamp( length( mapN.xy ), 0.0, 1.0 );
  float waterWaveH = clamp(
    ( s1.a * 0.52 + s2.a * 0.32 + s3.a * ( 0.16 * microFade ) ) * ( 0.82 + 0.24 * gustEnv ),
    0.0,
    1.0
  );
  mapN = normalize( mapN );
  normal = normalize( tbn * mapN );
#else
  float waterSlopeMag = 0.0;
  float waterWaveH = 0.5;
#endif`
        )
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
{
  float ndvW = clamp( dot( geometryNormal, geometryViewDir ), 0.0, 1.0 );
  float fresnelW = pow( 1.0 - ndvW, 3.0 );
  // Deepen ripple troughs while crests & wind-tilted facets catch crisp sky/silver highlights
  float troughShade = mix( 0.66, 1.12, smoothstep( 0.15, 0.85, waterWaveH ) );
  reflectedLight.indirectDiffuse *= troughShade;
  reflectedLight.directDiffuse *= troughShade;

  vec3 daySkyRefl = vec3( 0.66, 0.80, 0.85 );
  vec3 nightSkyRefl = vec3( 0.07, 0.14, 0.24 );
  vec3 skyRefl = mix( daySkyRefl, nightSkyRefl, uWaterLamp );

  vec3 dayGlintCol = vec3( 0.88, 0.95, 1.0 );
  vec3 nightGlintCol = vec3( 0.46, 0.74, 0.96 );
  vec3 glintCol = mix( dayGlintCol, nightGlintCol, uWaterLamp );

  float crestMask = smoothstep( 0.36, 0.86, waterWaveH );
  float crestSparkle = pow( clamp( ( 1.0 - ndvW ) * 0.82 + waterSlopeMag * 0.55, 0.0, 1.0 ), 4.4 )
                     * smoothstep( 0.12, 0.58, waterSlopeMag )
                     * ( 0.35 + 0.65 * crestMask );
  reflectedLight.indirectSpecular += skyRefl * fresnelW * ( 0.22 + 0.56 * waterSlopeMag * ( 0.5 + 0.5 * crestMask ) );
  reflectedLight.directSpecular += glintCol * crestSparkle * ( 0.54 - 0.20 * uWaterLamp );
}`
        );
    };
  };

  const waterMat = new THREE.MeshStandardMaterial({
    map: waterDrawer.tex,
    normalMap: waterWindNormalTex,
    normalScale: new THREE.Vector2(0.88, 0.88),
    emissive: 0xffffff,
    emissiveMap: waterDrawer.tex,
    emissiveIntensity: 0.02,
    roughness: 0.16,
    metalness: 0.12,
    envMapIntensity: 0.42,
  });
  configureRealisticWindWaterShader(waterMat);

  const waterWestMat = new THREE.MeshStandardMaterial({
    map: waterDrawer.westTex,
    normalMap: waterWindNormalTex,
    normalScale: new THREE.Vector2(0.88, 0.88),
    emissive: 0xffffff,
    emissiveMap: waterDrawer.westTex,
    emissiveIntensity: 0.02,
    roughness: 0.16,
    metalness: 0.12,
    envMapIntensity: 0.42,
  });
  configureRealisticWindWaterShader(waterWestMat);

  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(520.0, 214.0), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(312.5, HAN_RIVER_WATER_Y, -239.8);
  waterMesh.userData.noMerge = true;
  staticGroup.add(waterMesh);

  // Mid-West Basin (X = -214.0 .. 52.5, Z = -346.8 .. -132.8)
  const waterMeshWest = new THREE.Mesh(new THREE.PlaneGeometry(266.5, 214.0), waterWestMat);
  waterMeshWest.rotation.x = -Math.PI / 2;
  waterMeshWest.position.set(-80.75, HAN_RIVER_WATER_Y, -239.8);
  waterMeshWest.userData.noMerge = true;
  staticGroup.add(waterMeshWest);

  // West Sông Hàn Channel & Sea Estuary (X = -1038.0 .. -214.0, Z = -346.8 .. -164.6) flowing seamlessly out into Biển Mỹ Khê Tây!
  const estuaryLenX = 824.0;
  const estuaryCenterX = -626.0;
  const estuaryWidthZ = 182.2;
  const estuaryCenterZ = -255.7;
  const estuaryGeo = new THREE.PlaneGeometry(estuaryLenX, estuaryWidthZ, 48, 8);
  estuaryGeo.rotateX(-Math.PI / 2);
  const estPos = estuaryGeo.attributes.position;
  for (let i = 0; i < estPos.count; i++) {
    const wx = estuaryCenterX + estPos.getX(i);
    let wy = HAN_RIVER_WATER_Y;
    if (wx < -930.0 && wx >= -1026.0) {
      // Smooth 96m estuarine transition rising seamlessly from river level (-1.55) to ocean level (-0.82)
      const t = THREE.MathUtils.clamp((-930.0 - wx) / 96.0, 0, 1);
      const smoothT = t * t * (3 - 2 * t);
      wy = THREE.MathUtils.lerp(HAN_RIVER_WATER_Y, -0.82, smoothT);
    } else if (wx < -1026.0) {
      // Gently tuck beneath the ocean wave mesh at X = -1026..-1038 so there is zero z-fighting at the sea mouth
      const t = THREE.MathUtils.clamp((-1026.0 - wx) / 12.0, 0, 1);
      wy = THREE.MathUtils.lerp(-0.82, -1.16, t);
    }
    estPos.setY(i, wy);
  }
  estuaryGeo.computeVertexNormals();
  const waterMeshEstuary = new THREE.Mesh(estuaryGeo, waterWestMat);
  waterMeshEstuary.position.set(estuaryCenterX, 0.0, estuaryCenterZ);
  waterMeshEstuary.userData.noMerge = true;
  staticGroup.add(waterMeshEstuary);

  // =========================================================================
  // 4. DRIVABLE CẦU SÔNG HÀN (X = 193.5) & CẦU RỒNG (X = 370.0) — 222m LONG SPAN
  // =========================================================================
  const buildDrivableHanRiverSwingBridge = (bx: number) => {
    const zStart = HAN_BRIDGE_SOUTH_FLAT_END_Z; // -129.0
    const zEnd = HAN_BRIDGE_NORTH_FLAT_START_Z; // -351.0
    const segs = 88;
    const roadHW = HAN_BRIDGE_ROAD_HALF_W; // 7.9
    const outerHW = HAN_BRIDGE_OUTER_HALF_W; // 11.1 (uniform 3.2m walkways everywhere!)

    // 4a. Concrete box-girder underside & roadbed slab smoothly sloped along Z
    const girderGeo = createBridgeRibbonGeometry(
      bx - (outerHW + 0.05),
      bx + (outerHW + 0.05),
      (z) => getHanRiverBridgeDeckY(z) - 0.68,
      (z) => getHanRiverBridgeDeckY(z) - 0.02,
      zStart,
      zEnd,
      segs
    );
    staticGroup.add(new THREE.Mesh(girderGeo, stoneWallMat));

    // 4b. Smooth 4-Lane Asphalt Roadway (X = 185.6 .. 201.4, Y = deckY)
    const roadGeo = createBridgeRibbonGeometry(
      bx - roadHW,
      bx + roadHW,
      (z) => getHanRiverBridgeDeckY(z) - 0.04,
      (z) => getHanRiverBridgeDeckY(z),
      zStart,
      zEnd,
      segs
    );
    staticGroup.add(new THREE.Mesh(roadGeo, asphaltMat));

    // 4c. Continuously Wide Granite Pedestrian Sidewalks Flanking Roadway (3.2m wide everywhere, connected flush Z=-125.9 .. -353.6!)
    const walkZStart = -125.9;
    const walkZEnd = -353.6;
    const walkSegs = 124;
    [-1, 1].forEach((side) => {
      const sx0 = side < 0 ? bx - outerHW : bx + roadHW;
      const sx1 = side < 0 ? bx - roadHW : bx + outerHW;
      const walkGeo = createBridgeRibbonGeometry(
        sx0,
        sx1,
        (z) => Math.max(-0.08, getHanRiverBridgeDeckY(z) - 0.05),
        (z) => Math.max(0.012, getHanRiverBridgeDeckY(z) + 0.12),
        walkZStart,
        walkZEnd,
        walkSegs
      );
      staticGroup.add(new THREE.Mesh(walkGeo, granitePromenadeMat));
    });

    // 4d. Illuminated Neon Rim Strips over River Span (West Cyan, East Magenta)
    const westNeonGeo = createBridgeRibbonGeometry(
      bx - outerHW - 0.16,
      bx - outerHW + 0.02,
      (z) => getHanRiverBridgeDeckY(z) - 0.48,
      (z) => getHanRiverBridgeDeckY(z) + 0.18,
      -134.5,
      -345.0,
      segs
    );
    staticGroup.add(new THREE.Mesh(westNeonGeo, bridgeCyanMat));

    const eastNeonGeo = createBridgeRibbonGeometry(
      bx + outerHW - 0.02,
      bx + outerHW + 0.16,
      (z) => getHanRiverBridgeDeckY(z) - 0.48,
      (z) => getHanRiverBridgeDeckY(z) + 0.18,
      -134.5,
      -345.0,
      segs
    );
    staticGroup.add(new THREE.Mesh(eastNeonGeo, bridgeMagentaMat));

    // 4e. Crisp Bridge Road Markings (Double-Yellow Centerline, Outer Edge Lines & Dashed Lane Dividers)
    [-0.14, 0.14].forEach((off) => {
      const yLineGeo = createBridgeRibbonGeometry(
        bx + off - 0.06,
        bx + off + 0.06,
        (z) => getHanRiverBridgeDeckY(z) + 0.004,
        (z) => getHanRiverBridgeDeckY(z) + 0.015,
        zStart,
        zEnd,
        segs
      );
      staticGroup.add(new THREE.Mesh(yLineGeo, yellowMedianMat));
    });
    [-7.55, 7.55].forEach((off) => {
      const edgeGeo = createBridgeRibbonGeometry(
        bx + off - 0.08,
        bx + off + 0.08,
        (z) => getHanRiverBridgeDeckY(z) + 0.004,
        (z) => getHanRiverBridgeDeckY(z) + 0.015,
        zStart,
        zEnd,
        segs
      );
      staticGroup.add(new THREE.Mesh(edgeGeo, stripeMat));
    });
    for (let z = -132.0; z >= -348.0; z -= 5.6) {
      [-4.1, 4.1].forEach((off) => {
        const dashGeo = createBridgeRibbonGeometry(
          bx + off - 0.07,
          bx + off + 0.07,
          (zz) => getHanRiverBridgeDeckY(zz) + 0.004,
          (zz) => getHanRiverBridgeDeckY(zz) + 0.015,
          z,
          z - 2.5,
          2
        );
        staticGroup.add(new THREE.Mesh(dashGeo, stripeMat));
      });
    }

    // 4f. Sloped Guardrails + Posts over River Span ONLY (Z = -134.15 .. -345.0, leaving bank mouths 100% open!)
    const railStep = 3.0;
    const zRailStart = -134.15;
    const zRailEnd = -345.0;
    for (let z = zRailStart; z > zRailEnd + 0.05; z -= railStep) {
      const zNext = Math.max(zRailEnd, z - railStep);
      const y0 = Math.max(0.0, getHanRiverBridgeDeckY(z) + 0.12);
      const y1 = Math.max(0.0, getHanRiverBridgeDeckY(zNext) + 0.12);

      [-(outerHW - 0.10), outerHW - 0.10].forEach((rxOff) => {
        const rx = bx + rxOff;
        addStrut([rx, y0 + 0.98, z], [rx, y1 + 0.98, zNext], 0.06, marbleWhiteMat);
        addStrut([rx, y0 + 0.50, z], [rx, y1 + 0.50, zNext], 0.035, darkMetalMat);
        addBox(rx - 0.07, rx + 0.07, y0, y0 + 1.04, z - 0.07, z + 0.07, marbleWhiteMat);
      });
    }
    [-(outerHW - 0.10), outerHW - 0.10].forEach((rxOff) => {
      const rx = bx + rxOff;
      const yEnd = Math.max(0.0, getHanRiverBridgeDeckY(zRailEnd) + 0.12);
      addBox(rx - 0.07, rx + 0.07, yEnd, yEnd + 1.04, zRailEnd - 0.07, zRailEnd + 0.07, marbleWhiteMat);
    });

    // Bridge Streetlamps tucked neatly along the outer rail edge (clear of pedestrians)
    for (let z = -139.0; z >= -340.0; z -= 17.5) {
      if (Math.abs(z + 240.0) < 6.5) continue;
      const wy = Math.max(0.0, getHanRiverBridgeDeckY(z) + 0.12);
      addRiversideLamp(bx - (outerHW - 0.48), z, wy);
      addRiversideLamp(bx + (outerHW - 0.48), z, wy);
    }

    // 4g. Concrete Abutments & 5 River Piers + Central Swing Turntable Drum
    addBox(bx - outerHW, bx + outerHW, -3.5, -0.05, -135.2, -133.4, stoneWallMat);
    addBox(bx - outerHW, bx + outerHW, -3.5, -0.05, -346.2, -344.4, stoneWallMat);
    [-168.0, -204.0, -240.0, -276.0, -312.0].forEach((pz) => {
      addBox(bx - 8.4, bx + 8.4, -3.6, HAN_BRIDGE_DECK_Y - 0.68, pz - 2.3, pz + 2.3, stoneWallMat);
    });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.6, 3.4, 24), stoneWallMat);
    drum.position.set(bx, -1.2, -240.0);
    staticGroup.add(drum);

    // 4h. Iconic Twin A-Frame Pylons & Dual Outer Cable-Stayed Fans (Leaving traffic lanes & outer 2m walkway wide open!)
    const pylonZ = -240.0;
    const pylonH = 42.0;
    [-1, 1].forEach((side) => {
      const footX = bx + side * 8.2;
      const apexX = bx + side * 1.55;
      addStrut([footX, HAN_BRIDGE_DECK_Y, pylonZ], [apexX, pylonH, pylonZ], 0.65, marbleWhiteMat);
      addStrut([footX + side * 0.22, HAN_BRIDGE_DECK_Y + 0.4, pylonZ], [apexX + side * 0.16, pylonH - 0.4, pylonZ], 0.18, bridgeCyanMat);
    });
    addBox(bx - 5.2, bx + 5.2, 26.5, 27.6, pylonZ - 0.6, pylonZ + 0.6, marbleWhiteMat);
    addBox(bx - 2.1, bx + 2.1, pylonH - 0.9, pylonH + 0.5, pylonZ - 0.65, pylonZ + 0.65, bridgeMagentaMat);

    for (let c = 1; c <= 12; c++) {
      const dz = c * 5.2;
      const anchorY = pylonH - 1.6 - (12 - c) * 1.05;
      const cMat = c % 2 === 0 ? bridgeCyanMat : bridgeMagentaMat;
      [-1, 1].forEach((side) => {
        const anchorX = bx + side * THREE.MathUtils.lerp(8.2, 1.55, (anchorY - HAN_BRIDGE_DECK_Y) / (pylonH - HAN_BRIDGE_DECK_Y));
        const deckEdgeX = bx + side * 8.05;
        const deckYNorth = getHanRiverBridgeDeckY(pylonZ - dz);
        const deckYSouth = getHanRiverBridgeDeckY(pylonZ + dz);
        addStrut([anchorX, anchorY, pylonZ], [deckEdgeX, deckYNorth + 0.12, pylonZ - dz], 0.08, cMat);
        addStrut([anchorX, anchorY, pylonZ], [deckEdgeX, deckYSouth + 0.12, pylonZ + dz], 0.08, cMat);
      });
    }
  };
  buildDrivableHanRiverSwingBridge(HAN_BRIDGE_CENTER_X);

  // 4B. CẦU RỒNG ĐÀ NẴNG (Uniformly Wide Connected Walkways, Sleek 3-Arch Golden Spine, North-Facing Dragon Head & South Lotus Tail)
  let dragonMouthGlowRef: THREE.Mesh | null = null;
  const dragonHeadAnchorZ = -318.2;
  let dragonHeadAnchorY = getHanRiverBridgeDeckY(dragonHeadAnchorZ) + 4.8;
  let dragonMouthZ = dragonHeadAnchorZ - 4.2 * 0.98;

  const buildDragonBridge = (rx: number) => {
    const zStart = HAN_BRIDGE_SOUTH_FLAT_END_Z; // -129.0
    const zEnd = HAN_BRIDGE_NORTH_FLAT_START_Z; // -351.0
    const segs = 110;
    const pierZs = [-152.0, -198.0, -262.0, -308.0];

    // Clean, architectural outer half-width — stays wide (11.8m -> 12.6m) all the way onto both banks!
    const getVisualOuterHalfW = (z: number): number => getDragonBridgeOuterHalfW(z);

    // 1. Concrete Box-Girder Belly & Multi-Rib Underside Haunches
    for (let i = 0; i < segs; i++) {
      const za = THREE.MathUtils.lerp(zStart, zEnd, i / segs);
      const zb = THREE.MathUtils.lerp(zStart, zEnd, (i + 1) / segs);
      const zMid = (za + zb) * 0.5;
      const gHalfW = getVisualOuterHalfW(zMid) - 0.15;
      const girderSeg = createBridgeRibbonGeometry(
        rx - gHalfW,
        rx + gHalfW,
        (z) => getHanRiverBridgeDeckY(z) - 0.88,
        (z) => getHanRiverBridgeDeckY(z) - 0.02,
        za,
        zb,
        1
      );
      staticGroup.add(new THREE.Mesh(girderSeg, dragonMedianMat));
    }
    [-7.4, -3.7, 3.7, 7.4].forEach((hx) => {
      const haunchGeo = createBridgeRibbonGeometry(
        rx + hx - 0.36,
        rx + hx + 0.36,
        (z) => getHanRiverBridgeDeckY(z) - 1.36,
        (z) => getHanRiverBridgeDeckY(z) - 0.80,
        zStart,
        zEnd,
        segs
      );
      staticGroup.add(new THREE.Mesh(haunchGeo, stoneWallMat));
    });

    // 2. Dual Multi-Lane Asphalt Carriageways (8.4m at banks flaring gently to 9.2m over river)
    for (let i = 0; i < segs; i++) {
      const za = THREE.MathUtils.lerp(zStart, zEnd, i / segs);
      const zb = THREE.MathUtils.lerp(zStart, zEnd, (i + 1) / segs);
      const zMid = (za + zb) * 0.5;
      const rHalfW = getDragonBridgeRoadHalfW(zMid);
      const roadSeg = scalePlaneUv(
        createBridgeRibbonGeometry(
          rx - rHalfW,
          rx + rHalfW,
          (z) => getHanRiverBridgeDeckY(z) - 0.04,
          (z) => getHanRiverBridgeDeckY(z),
          za,
          zb,
          1
        ),
        3.5,
        0.55
      );
      const rm = new THREE.Mesh(roadSeg, asphaltMat);
      rm.receiveShadow = true;
      staticGroup.add(rm);
    }

    // 3. Sleek Burgundy & Concrete Central Median Strip (low profile, zero clutter at bank intersections)
    const medianBodyGeo = createBridgeRibbonGeometry(
      rx - 0.96,
      rx + 0.96,
      (z) => getHanRiverBridgeDeckY(z) - 0.02,
      (z) => getHanRiverBridgeDeckY(z) + 0.20,
      -134.5,
      -346.5,
      100
    );
    const medianBodyMesh = new THREE.Mesh(medianBodyGeo, dragonWalkwayBurgundyMat);
    medianBodyMesh.receiveShadow = true;
    staticGroup.add(medianBodyMesh);

    [-1.02, 1.02].forEach((mx) => {
      const curbRim = createBridgeRibbonGeometry(
        rx + mx - 0.11,
        rx + mx + 0.11,
        (z) => getHanRiverBridgeDeckY(z) - 0.01,
        (z) => getHanRiverBridgeDeckY(z) + 0.22,
        -134.5,
        -346.5,
        100
      );
      staticGroup.add(new THREE.Mesh(curbRim, dragonMedianMat));
    });

    // 4. Continuously Wide Burgundy Terracotta Pedestrian Walkways (3.4m wide, connected flush Z=-125.9 .. -353.6!)
    const walkZStart = -125.9;
    const walkZEnd = -353.6;
    const walkSegs = 124;
    for (let i = 0; i < walkSegs; i++) {
      const za = THREE.MathUtils.lerp(walkZStart, walkZEnd, i / walkSegs);
      const zb = THREE.MathUtils.lerp(walkZStart, walkZEnd, (i + 1) / walkSegs);
      const zMid = (za + zb) * 0.5;
      const roadHW = getDragonBridgeRoadHalfW(zMid);
      const outerHW = getVisualOuterHalfW(zMid);
      [-1, 1].forEach((side) => {
        const xIn = side < 0 ? rx - outerHW : rx + roadHW;
        const xOut = side < 0 ? rx - roadHW : rx + outerHW;
        const walkSeg = createBridgeRibbonGeometry(
          xIn,
          xOut,
          (z) => Math.max(-0.08, getHanRiverBridgeDeckY(z) - 0.08),
          (z) => Math.max(0.014, getHanRiverBridgeDeckY(z) + 0.12),
          za,
          zb,
          1
        );
        const walkMesh = new THREE.Mesh(walkSeg, dragonWalkwayBurgundyMat);
        walkMesh.receiveShadow = true;
        staticGroup.add(walkMesh);

        // Low concrete curb separating roadway from walkway along bridge span (-129..-351)
        if (zMid <= -129.0 && zMid >= -351.0) {
          const curbX = side * (roadHW - 0.04);
          const curbSeg = createBridgeRibbonGeometry(
            rx + curbX - 0.11,
            rx + curbX + 0.11,
            (z) => getHanRiverBridgeDeckY(z) - 0.02,
            (z) => Math.max(0.024, getHanRiverBridgeDeckY(z) + 0.14),
            za,
            zb,
            1
          );
          staticGroup.add(new THREE.Mesh(curbSeg, dragonMedianMat));
        }

        // Golden illuminated exterior fascia trim along river span
        if (zMid < -134.6 && zMid > -344.8) {
          const rimX0 = side < 0 ? rx - outerHW - 0.15 : rx + outerHW;
          const rimX1 = side < 0 ? rx - outerHW : rx + outerHW + 0.15;
          const rimSeg = createBridgeRibbonGeometry(
            rimX0,
            rimX1,
            (z) => getHanRiverBridgeDeckY(z) - 0.50,
            (z) => getHanRiverBridgeDeckY(z) + 0.16,
            za,
            zb,
            1
          );
          staticGroup.add(new THREE.Mesh(rimSeg, dragonBridgeGoldMat));
        }
      });
    }

    // Road Markings: White edge lines + Red Dashed Lane Dividers
    for (let i = 0; i < segs; i++) {
      const za = THREE.MathUtils.lerp(zStart, zEnd, i / segs);
      const zb = THREE.MathUtils.lerp(zStart, zEnd, (i + 1) / segs);
      const zMid = (za + zb) * 0.5;
      const roadHW = getDragonBridgeRoadHalfW(zMid);
      [-1, 1].forEach((side) => {
        const edgeX = rx + side * (roadHW - 0.34);
        const edgeSeg = createBridgeRibbonGeometry(
          edgeX - 0.09,
          edgeX + 0.09,
          (z) => getHanRiverBridgeDeckY(z) + 0.005,
          (z) => getHanRiverBridgeDeckY(z) + 0.018,
          za,
          zb,
          1
        );
        staticGroup.add(new THREE.Mesh(edgeSeg, stripeMat));
      });
    }
    for (let z = -132.0; z >= -348.0; z -= 5.4) {
      const roadHW = getDragonBridgeRoadHalfW(z);
      const innerSpan = roadHW - 1.15;
      [-1, 1].forEach((side) => {
        [0.34, 0.68].forEach((frac) => {
          const laneOff = side * (1.15 + innerSpan * frac);
          const dashGeo = createBridgeRibbonGeometry(
            rx + laneOff - 0.08,
            rx + laneOff + 0.08,
            (zz) => getHanRiverBridgeDeckY(zz) + 0.005,
            (zz) => getHanRiverBridgeDeckY(zz) + 0.018,
            z,
            z - 2.3,
            2
          );
          staticGroup.add(new THREE.Mesh(dashGeo, dragonRedStripeMat));
        });
      });
    }

    // 5. Cyan 3-Bar Pedestrian Balustrade over River Span ONLY (Z = -134.15 .. -345.0)
    // Leaving bank mouths (Z > -134.15 & Z < -345.0) 100% open onto Bạch Đằng & Trần Hưng Đạo promenades!
    const railStep = 2.05;
    const zRailStart = -134.15;
    const zRailEnd = -345.0;
    for (let z = zRailStart; z > zRailEnd + 0.05; z -= railStep) {
      const zNext = Math.max(zRailEnd, z - railStep);
      const y0 = Math.max(0.014, getHanRiverBridgeDeckY(z) + 0.12);
      const y1 = Math.max(0.014, getHanRiverBridgeDeckY(zNext) + 0.12);
      const hw0 = getVisualOuterHalfW(z) - 0.10;
      const hw1 = getVisualOuterHalfW(zNext) - 0.10;

      [-1, 1].forEach((side) => {
        const x0 = rx + side * hw0;
        const x1 = rx + side * hw1;
        addStrut([x0, y0 + 1.02, z], [x1, y1 + 1.02, zNext], 0.058, dragonRailCyanMat, 8);
        addStrut([x0, y0 + 0.68, z], [x1, y1 + 0.68, zNext], 0.044, dragonRailCyanMat, 8);
        addStrut([x0, y0 + 0.36, z], [x1, y1 + 0.36, zNext], 0.044, dragonRailCyanMat, 8);
        addStrut([x0 - side * 0.04, y0, z], [x0 + side * 0.06, y0 + 1.06, z], 0.046, dragonStanchionTealMat, 6);
      });
    }

    // Slender Architectural Green Bridge Streetlamps mounted along Outer Rail Edge (clear of pedestrian flow)
    for (let z = -139.0; z >= -340.0; z -= 17.5) {
      const wy = Math.max(0.014, getHanRiverBridgeDeckY(z) + 0.12);
      const hw = getVisualOuterHalfW(z) - 0.34;
      [-1, 1].forEach((side) => {
        const lx = rx + side * hw;
        const poleH = 6.2;
        addStrut([lx, wy, z], [lx, wy + poleH, z], 0.068, dragonLampGreenMat, 8);
        addStrut(
          [lx, wy + poleH - 0.50, z],
          [lx - side * 1.95, wy + poleH + 0.25, z],
          0.048,
          dragonLampGreenMat,
          8
        );
        const scrollRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.48, 0.032, 6, 14, Math.PI * 1.25),
          dragonLampGreenMat
        );
        scrollRing.position.set(lx - side * 0.18, wy + poleH - 0.72, z);
        scrollRing.rotation.z = side > 0 ? 0.35 : Math.PI - 0.35;
        staticGroup.add(scrollRing);

        const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.26), warmLanternMat);
        lampHead.position.set(lx - side * 2.05, wy + poleH + 0.24, z);
        lampHead.rotation.z = side * 0.14;
        staticGroup.add(lampHead);
      });
    }

    // 6. Concrete River Piers & Hammerhead Caps
    addBox(rx - 9.4, rx + 9.4, -3.5, -0.05, -135.2, -133.4, stoneWallMat);
    addBox(rx - 9.4, rx + 9.4, -3.5, -0.05, -346.2, -344.4, stoneWallMat);
    pierZs.forEach((pz) => {
      const pDeckY = getHanRiverBridgeDeckY(pz);
      const pHW = getVisualOuterHalfW(pz);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(pHW * 1.66, 1.25, 4.0), dragonMedianMat);
      cap.position.set(rx, HAN_RIVER_WATER_Y + 0.05, pz);
      staticGroup.add(cap);
      [-pHW * 0.48, pHW * 0.48].forEach((pxOff) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(1.30, 1.46, pDeckY + 1.3, 16), dragonMedianMat);
        col.position.set(rx + pxOff, (HAN_RIVER_WATER_Y + pDeckY - 0.6) * 0.5, pz);
        staticGroup.add(col);
      });
      addBox(rx - pHW * 0.42, rx + pHW * 0.42, HAN_RIVER_WATER_Y + 0.2, pDeckY - 1.35, pz - 0.72, pz + 0.72, stoneWallMat);
      addBox(rx - pHW + 0.4, rx + pHW - 0.4, pDeckY - 1.45, pDeckY - 0.72, pz - 1.70, pz + 1.70, dragonMedianMat);
    });

    // 7. AUTHENTIC 3-ARCH 5-TUBE GOLDEN DRAGON SPINE (Z = -152.0 South Tail .. -308.0 North Arch)
    const archSpans: Array<{ z0: number; z1: number; h: number }> = [
      { z0: -198.0, z1: -152.0, h: 9.2 },   // Vòng 1: South Tail Arch
      { z0: -262.0, z1: -198.0, h: 16.0 },  // Vòng 2: Center Tallest Hero Arch
      { z0: -308.0, z1: -262.0, h: 10.6 },  // Vòng 3: North Front Arch behind Dragon Head
    ];

    const getArchSpline = (z: number): { y: number; dyDz: number } => {
      for (const sp of archSpans) {
        if (z >= sp.z0 - 0.001 && z <= sp.z1 + 0.001) {
          const spanLen = sp.z1 - sp.z0;
          const u = THREE.MathUtils.clamp((z - sp.z0) / spanLen, 0, 1);
          const s = Math.sin(u * Math.PI);
          const yOff = 0.85 + sp.h * Math.pow(s, 0.84);
          const cosU = Math.cos(u * Math.PI);
          const dyDu = sp.h * 0.84 * Math.pow(Math.max(s, 1e-4), -0.16) * cosU * Math.PI;
          const dyDz = getHanRiverBridgeSlopeDz(z) + dyDu / spanLen;
          return { y: getHanRiverBridgeDeckY(z) + yOff, dyDz };
        }
      }
      return { y: getHanRiverBridgeDeckY(z) + 0.85, dyDz: getHanRiverBridgeSlopeDz(z) };
    };

    // Compact Concrete Stepped Springer Pedestals at the 4 main pier/arch nodes
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-2.0, 0);
    pedShape.lineTo(2.0, 0);
    pedShape.lineTo(1.65, 0.68);
    pedShape.lineTo(0.95, 1.05);
    pedShape.lineTo(0.42, 0.82);
    pedShape.lineTo(0, 1.12);
    pedShape.lineTo(-0.42, 0.82);
    pedShape.lineTo(-0.95, 1.05);
    pedShape.lineTo(-1.65, 0.68);
    pedShape.closePath();
    const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
      depth: 1.62,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    pedGeo.translate(0, 0, -0.81);
    [-152.0, -198.0, -262.0, -308.0].forEach((pz) => {
      const pMesh = new THREE.Mesh(pedGeo, dragonSpringerMat);
      pMesh.rotation.y = Math.PI / 2;
      pMesh.position.set(rx, getHanRiverBridgeDeckY(pz) + 0.14, pz);
      staticGroup.add(pMesh);
    });

    // Crisp Compact Golden Dragon Dorsal Crest Scales
    const dorsalFinShape = new THREE.Shape();
    dorsalFinShape.moveTo(-0.44, 0);
    dorsalFinShape.lineTo(0.38, 0);
    dorsalFinShape.lineTo(0.10, 0.36);
    dorsalFinShape.lineTo(-0.48, 0.68);
    dorsalFinShape.lineTo(-0.30, 0.24);
    dorsalFinShape.closePath();
    const dorsalFinGeo = new THREE.ExtrudeGeometry(dorsalFinShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 1,
    });
    dorsalFinGeo.translate(0, 0, -0.07);

    // Compact Stay-Cable Anchor Gusset along Central Median
    const gussetShape = new THREE.Shape();
    gussetShape.moveTo(-0.36, 0);
    gussetShape.lineTo(0.36, 0);
    gussetShape.lineTo(0.16, 0.48);
    gussetShape.lineTo(-0.16, 0.48);
    gussetShape.closePath();
    const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    gussetGeo.translate(0, 0, -0.13);

    // Sleek 5-Tube Golden Steel Arch Cluster (~1.35m bundle)
    const tubeOffsets: Array<{ dx: number; dn: number; r: number; mat: THREE.Material }> = [
      { dx: 0.0, dn: 0.48, r: 0.21, mat: dragonBridgeGoldMat },     // Crown Pipe
      { dx: -0.50, dn: 0.15, r: 0.19, mat: dragonBridgeBodyMat },  // Upper-West Pipe
      { dx: 0.50, dn: 0.15, r: 0.19, mat: dragonBridgeBodyMat },   // Upper-East Pipe
      { dx: -0.34, dn: -0.42, r: 0.19, mat: dragonBridgeBodyMat }, // Lower-West Pipe
      { dx: 0.34, dn: -0.42, r: 0.19, mat: dragonBridgeBodyMat },  // Lower-East Pipe
    ];

    const archSteps = 160;
    const zBodyStart = -152.0; // South Lotus Tail
    const zBodyEnd = -309.0;   // Ends cleanly inside the -308.0 pedestal where neck immediately rises
    let prevPts: Array<[number, number, number]> | null = null;

    for (let i = 0; i <= archSteps; i++) {
      const pz = THREE.MathUtils.lerp(zBodyStart, zBodyEnd, i / archSteps);
      const { y: py, dyDz } = getArchSpline(pz);
      const pitch = Math.atan(dyDz);
      const normY = Math.cos(pitch);
      const normZ = -Math.sin(pitch);

      const curPts: Array<[number, number, number]> = tubeOffsets.map((t) => [
        rx + t.dx,
        py + t.dn * normY,
        pz + t.dn * normZ,
      ]);

      if (prevPts) {
        for (let k = 0; k < tubeOffsets.length; k++) {
          addStrut(prevPts[k], curPts[k], tubeOffsets[k].r, tubeOffsets[k].mat, 10);
        }
      }

      if (i % 2 === 0 && i > 0 && i < archSteps) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.20, 12), dragonBridgeDarkMat);
        ring.rotation.x = Math.PI / 2 - pitch;
        ring.position.set(rx, py, pz);
        staticGroup.add(ring);

        const outerRim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.075, 6, 14), dragonBridgeGoldMat);
        outerRim.rotation.x = -pitch;
        outerRim.position.set(rx, py, pz);
        staticGroup.add(outerRim);

        // Swept Dorsal Scale sweeping backward toward South Tail (+Z) along the 3 arches
        if (pz >= -308.0) {
          const fin = new THREE.Mesh(dorsalFinGeo, dragonBridgeGoldMat);
          fin.rotation.order = 'YXZ';
          fin.rotation.y = Math.PI / 2;
          fin.rotation.z = -pitch;
          fin.position.set(rx, py + 0.60 * normY, pz + 0.60 * normZ);
          staticGroup.add(fin);
        }
      }

      prevPts = curPts;
    }

    // Slender Silver-Slate Stay-Cable Fans & Compact Median Anchor Gussets under the 3 arches
    for (const sp of archSpans) {
      const spanMidZ = (sp.z0 + sp.z1) * 0.5;
      const spanHalf = (sp.z1 - sp.z0) * 0.5;
      const anchorCount = sp.h > 13 ? 9 : 7;
      for (let a = 0; a < anchorCount; a++) {
        const frac = (a / (anchorCount - 1)) * 2 - 1;
        const anchorZ = spanMidZ + frac * (spanHalf - 3.6);
        const upperZ = spanMidZ + frac * (spanHalf * 0.56);
        const { y: archY, dyDz } = getArchSpline(upperZ);
        const aPitch = Math.atan(dyDz);
        const nY = Math.cos(aPitch);
        const nZ = -Math.sin(aPitch);
        const medianY = getHanRiverBridgeDeckY(anchorZ) + 0.20;

        if (archY - medianY > 2.2) {
          [-1, 1].forEach((side) => {
            const gusset = new THREE.Mesh(gussetGeo, dragonStanchionTealMat);
            gusset.rotation.y = Math.PI / 2;
            gusset.position.set(rx + side * 0.86, medianY, anchorZ);
            staticGroup.add(gusset);

            [-0.12, 0.12].forEach((cOff) => {
              addStrut(
                [rx + side * 0.86, medianY + 0.42, anchorZ + cOff],
                [
                  rx + side * 0.40,
                  archY - 0.32 * nY,
                  upperZ + cOff * 1.3 - 0.32 * nZ,
                ],
                0.024,
                dragonCableMat,
                6
              );
            });
          });
        }
      }
    }

    // 8. COMPACT SCULPTED LÝ-DYNASTY DRAGON HEAD AT NORTH SPAN (Z = -309.0 .. -322.3, FACING NORTH -Z)
    const neckSteps = 12;
    const zNeck0 = -309.0;
    const zNeck1 = -318.0;
    const yNeck0 = getHanRiverBridgeDeckY(zNeck0) + 0.85;
    const yNeck1 = getHanRiverBridgeDeckY(zNeck1) + 4.45;
    let prevNeckPts: Array<[number, number, number]> | null = null;

    for (let i = 0; i <= neckSteps; i++) {
      const u = i / neckSteps;
      const pz = THREE.MathUtils.lerp(zNeck0, zNeck1, u);
      const curveF = 0.22 * u + 0.78 * u * u;
      const py = THREE.MathUtils.lerp(yNeck0, yNeck1, curveF);
      const dCurveDu = 0.22 + 1.56 * u;
      const dyDz = ((yNeck1 - yNeck0) * dCurveDu) / (zNeck1 - zNeck0);
      const pitch = Math.atan(dyDz);
      const ny = Math.cos(pitch);
      const nz = -Math.sin(pitch);
      const neckScale = THREE.MathUtils.lerp(1.0, 1.06, u);
      const curNeck: Array<[number, number, number]> = tubeOffsets.map((t) => [
        rx + t.dx * neckScale,
        py + t.dn * neckScale * ny,
        pz + t.dn * neckScale * nz,
      ]);
      if (prevNeckPts) {
        for (let k = 0; k < tubeOffsets.length; k++) {
          addStrut(prevNeckPts[k], curNeck[k], tubeOffsets[k].r * neckScale, tubeOffsets[k].mat, 10);
        }
      }
      if (i > 0 && i < neckSteps && i % 2 === 0) {
        const collar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.68 * neckScale, 0.68 * neckScale, 0.20, 12),
          dragonBridgeDarkMat
        );
        collar.rotation.x = Math.PI / 2 - pitch;
        collar.position.set(rx, py, pz);
        staticGroup.add(collar);

        const outerRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.68 * neckScale, 0.075, 6, 14),
          dragonBridgeGoldMat
        );
        outerRim.rotation.x = -pitch;
        outerRim.position.set(rx, py, pz);
        staticGroup.add(outerRim);
      }
      prevNeckPts = curNeck;
    }

    const headScale = 0.98;
    const headBaseY = yNeck1 + 0.35;
    dragonHeadAnchorY = headBaseY;
    dragonMouthZ = dragonHeadAnchorZ - 4.2 * headScale; // ~ -322.3
    const headGrp = new THREE.Group();
    headGrp.position.set(rx, headBaseY, dragonHeadAnchorZ);
    headGrp.rotation.y = Math.PI;
    headGrp.scale.set(headScale, headScale, headScale);

    // 8a. Upper Jaw & Upturned Nasal Scroll Profile
    const upperJawShape = new THREE.Shape();
    upperJawShape.moveTo(-1.35, 0.12);
    upperJawShape.lineTo(0.4, 0.02);
    upperJawShape.lineTo(2.45, 0.34);
    upperJawShape.lineTo(3.45, 0.94);
    upperJawShape.lineTo(4.02, 0.28); // Front fang
    upperJawShape.lineTo(4.52, 1.04);
    upperJawShape.lineTo(4.86, 1.62); // Snout tip
    upperJawShape.lineTo(4.42, 2.15);
    upperJawShape.lineTo(3.72, 2.34); // Upturned nostril bridge
    upperJawShape.lineTo(3.2, 1.98);
    upperJawShape.lineTo(2.4, 2.52); // Brow peak
    upperJawShape.lineTo(1.25, 2.45);
    upperJawShape.lineTo(0.25, 2.60);
    upperJawShape.lineTo(-1.02, 2.10);
    upperJawShape.lineTo(-1.72, 1.38);
    upperJawShape.closePath();

    const makeHeadPlate = (
      shape: THREE.Shape,
      depth: number,
      mat: THREE.Material,
      xOff: number,
      yawFlare = 0,
      yOff = 0,
      zOff = 0
    ) => {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
      });
      geo.translate(0, 0, -depth * 0.5);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = -Math.PI / 2 + yawFlare;
      m.position.set(xOff, yOff, zOff);
      headGrp.add(m);
      return m;
    };

    makeHeadPlate(upperJawShape, 1.18, dragonBridgeDarkMat, 0);
    [-0.78, 0.78].forEach((px) => makeHeadPlate(upperJawShape, 0.36, dragonBridgeBodyMat, px));
    [-1.18, 1.18].forEach((px) =>
      makeHeadPlate(upperJawShape, 0.18, dragonBridgeGoldMat, px, px > 0 ? 0.09 : -0.09)
    );

    // Top 5 crown crest tubes emerging over the dragon brow
    [-0.95, -0.48, 0, 0.48, 0.95].forEach((bx, bIdx) => {
      const browPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.6, 10), dragonBridgeGoldMat);
      browPipe.rotation.x = Math.PI / 2 - 0.18;
      browPipe.position.set(bx, 2.52 - Math.abs(bIdx - 2) * 0.08, 1.75);
      headGrp.add(browPipe);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), dragonBridgeGoldMat);
      cap.position.set(bx, 2.84 - Math.abs(bIdx - 2) * 0.08, 3.52);
      headGrp.add(cap);
    });

    // 8b. Sculpted Lower Jaw & Swept-Down Flame Beard Prongs
    const lowerJawShape = new THREE.Shape();
    lowerJawShape.moveTo(-1.15, -0.35);
    lowerJawShape.lineTo(0.85, -0.38);
    lowerJawShape.lineTo(2.75, -0.46);
    lowerJawShape.lineTo(3.72, -0.14);
    lowerJawShape.lineTo(4.06, 0.40);
    lowerJawShape.lineTo(4.38, -0.02);
    lowerJawShape.lineTo(4.58, -0.52);
    lowerJawShape.lineTo(3.92, -1.32);
    lowerJawShape.lineTo(3.15, -1.48);
    lowerJawShape.lineTo(2.80, -2.28);
    lowerJawShape.lineTo(2.18, -1.68);
    lowerJawShape.lineTo(1.58, -2.65);
    lowerJawShape.lineTo(1.04, -1.84);
    lowerJawShape.lineTo(0.25, -2.72);
    lowerJawShape.lineTo(-0.38, -1.80);
    lowerJawShape.lineTo(-1.30, -2.24);
    lowerJawShape.closePath();

    makeHeadPlate(lowerJawShape, 1.06, dragonBridgeDarkMat, 0);
    [-0.70, 0.70].forEach((px) => makeHeadPlate(lowerJawShape, 0.34, dragonBridgeBodyMat, px));
    [-1.10, 1.10].forEach((px) =>
      makeHeadPlate(lowerJawShape, 0.18, dragonBridgeGoldMat, px, px > 0 ? 0.10 : -0.10)
    );

    // 8c. Swept-Back Flared Lý-Dynasty Flame Mane Wings
    const maneShape = new THREE.Shape();
    maneShape.moveTo(1.55, 2.15);
    maneShape.lineTo(0.55, 2.75);
    maneShape.lineTo(-0.72, 2.88);
    maneShape.lineTo(-2.55, 2.68);
    maneShape.lineTo(-1.50, 1.92);
    maneShape.lineTo(-3.45, 1.72);
    maneShape.lineTo(-1.92, 0.98);
    maneShape.lineTo(-3.65, 0.35);
    maneShape.lineTo(-1.92, -0.28);
    maneShape.lineTo(-3.20, -1.05);
    maneShape.lineTo(-1.58, -1.30);
    maneShape.lineTo(-2.45, -2.15);
    maneShape.lineTo(-0.68, -1.60);
    maneShape.lineTo(0.95, -0.88);
    maneShape.lineTo(1.78, 0.35);
    maneShape.closePath();

    [-1, 1].forEach((side) => {
      makeHeadPlate(maneShape, 0.22, dragonBridgeBodyMat, side * 1.24, side * 0.18);
      makeHeadPlate(maneShape, 0.16, dragonBridgeGoldMat, side * 1.58, side * 0.32);
      makeHeadPlate(maneShape, 0.14, dragonBridgeGoldMat, side * 1.92, side * 0.46, 0.08, -0.22);
    });

    // 8d. Glowing Open Throat Core & Large Sculpted Fangs
    dragonMouthGlowRef = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), dragonFireMat);
    dragonMouthGlowRef.position.set(0, 0.02, 2.05);
    dragonMouthGlowRef.userData.noMerge = true;
    headGrp.add(dragonMouthGlowRef);

    [-0.62, 0.62].forEach((tx) => {
      const upperFang = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.58, 6), dragonBridgeGoldMat);
      upperFang.position.set(tx, 0.46, 3.72);
      upperFang.rotation.x = Math.PI;
      headGrp.add(upperFang);

      const lowerFang = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.54, 6), dragonBridgeGoldMat);
      lowerFang.position.set(tx, -0.20, 3.92);
      headGrp.add(lowerFang);
    });

    // 8e. Heart-Shaped Glowing Cyan Eyes & Riveted Cheek Orbital Rings
    const heartEyeShape = new THREE.Shape();
    heartEyeShape.moveTo(0, -0.26);
    heartEyeShape.bezierCurveTo(0.28, -0.05, 0.36, 0.26, 0.16, 0.34);
    heartEyeShape.bezierCurveTo(0.05, 0.38, 0, 0.25, 0, 0.18);
    heartEyeShape.bezierCurveTo(0, 0.25, -0.05, 0.38, -0.16, 0.34);
    heartEyeShape.bezierCurveTo(-0.36, 0.26, -0.28, -0.05, 0, -0.26);
    const heartEyeGeo = new THREE.ExtrudeGeometry(heartEyeShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    heartEyeGeo.translate(0, 0, -0.07);

    [-1, 1].forEach((side) => {
      const eyeSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.20, 14), dragonBridgeDarkMat);
      eyeSocket.rotation.z = Math.PI / 2;
      eyeSocket.position.set(side * 1.34, 1.40, 1.58);
      headGrp.add(eyeSocket);

      const heartEye = new THREE.Mesh(heartEyeGeo, bridgeCyanMat);
      heartEye.rotation.y = side > 0 ? Math.PI / 2 - 0.12 : -Math.PI / 2 + 0.12;
      heartEye.rotation.z = side > 0 ? -0.22 : 0.22;
      heartEye.position.set(side * 1.48, 1.40, 1.60);
      headGrp.add(heartEye);

      for (let b = 0; b < 7; b++) {
        const ang = -0.35 + b * 0.42;
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), dragonBridgeGoldMat);
        bead.position.set(side * 1.42, 1.38 - Math.sin(ang) * 0.72, 1.58 + Math.cos(ang) * 0.72);
        headGrp.add(bead);
      }

      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.74, 2.22, 0.45),
        new THREE.Vector3(side * 1.12, 3.22, -0.85),
        new THREE.Vector3(side * 1.34, 3.65, -2.55),
        new THREE.Vector3(side * 1.15, 3.25, -3.85),
      ]);
      const hornMesh = new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 12, 0.20, 8, false), dragonBridgeGoldMat);
      headGrp.add(hornMesh);

      const snoutWhisker = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 6), dragonBridgeGoldMat);
      snoutWhisker.position.set(side * 0.88, 2.42, 4.22);
      snoutWhisker.rotation.x = 0.45;
      snoutWhisker.rotation.z = -side * 0.28;
      headGrp.add(snoutWhisker);
    });

    staticGroup.add(headGrp);

    // 9. Blooming Golden Lotus Dragon Tail at SOUTH Bank Approach (Z = -140.0)
    const tailBaseY = getHanRiverBridgeDeckY(zBodyStart) + 0.85;
    const lotusPetalShape = new THREE.Shape();
    lotusPetalShape.moveTo(-0.42, 0);
    lotusPetalShape.lineTo(0.42, 0);
    lotusPetalShape.quadraticCurveTo(0.65, 2.6, 0, 5.2);
    lotusPetalShape.quadraticCurveTo(-0.65, 2.6, -0.42, 0);
    const lotusGeo = new THREE.ExtrudeGeometry(lotusPetalShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 1,
    });
    lotusGeo.translate(0, 0, -0.09);
    [-1.4, -0.75, 0, 0.75, 1.4].forEach((tx, idx) => {
      const petal = new THREE.Mesh(lotusGeo, idx % 2 === 0 ? dragonBridgeGoldMat : dragonBridgeBodyMat);
      const scaleH = idx === 2 ? 1.18 : idx === 1 || idx === 3 ? 0.94 : 0.72;
      petal.scale.set(1, scaleH, 1);
      petal.position.set(rx + tx * 0.48, tailBaseY + 0.25, zBodyStart + 0.32);
      petal.rotation.x = 0.45; // Blooming gracefully South (+Z)
      petal.rotation.z = -tx * 0.34;
      staticGroup.add(petal);
    });
  };
  buildDragonBridge(DRAGON_BRIDGE_CENTER_X);

  // Volumetric Fireball Jet, Hot Rising Ember Sparks, Layered Smoke Plume & LED Halos at Cầu Rồng (Zero-GC Pools)
  const smokeTex = getSoftSmokeTexture();
  const glowTex = getGlowSpriteTexture();
  const dragonFlameTex = createDragonFlameTex();
  const dragonEmberTex = createEmberSparkTex();

  const dragonFlameBillows: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phase: number;
    swayAmp: number;
    swayFreq: number;
    liftBias: number;
    lateralBias: number;
    spinSpeed: number;
    baseScale: number;
    speedMul: number;
    reachMul: number;
  }> = [];
  const FLAME_BILLOW_COUNT = 54;
  for (let f = 0; f < FLAME_BILLOW_COUNT; f++) {
    const fMat = new THREE.SpriteMaterial({
      map: dragonFlameTex,
      color: 0xffb74d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const fSp = new THREE.Sprite(fMat);
    fSp.visible = false;
    fSp.userData.noMerge = true;
    staticGroup.add(fSp);
    dragonFlameBillows.push({
      sprite: fSp,
      mat: fMat,
      phase: f / FLAME_BILLOW_COUNT,
      swayAmp: 0.42 + (f % 5) * 0.22,
      swayFreq: 4.2 + (f % 6) * 1.15,
      liftBias: ((f % 5) - 2) * 0.62,
      lateralBias: Math.sin(f * 1.9) * 1.35,
      spinSpeed: (f % 2 === 0 ? 1 : -1) * (1.2 + (f % 4) * 0.45),
      baseScale: 2.35 + (f % 5) * 0.48,
      speedMul: 0.92 + (f % 3) * 0.16,
      reachMul: 0.85 + (f % 4) * 0.14,
    });
  }

  const dragonEmberSparks: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phase: number;
    spreadX: number;
    riseGain: number;
    reachZ: number;
    baseScale: number;
  }> = [];
  const EMBER_SPARK_COUNT = 64;
  for (let e = 0; e < EMBER_SPARK_COUNT; e++) {
    const eMat = new THREE.SpriteMaterial({
      map: dragonEmberTex,
      color: 0xfde047,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const eSp = new THREE.Sprite(eMat);
    eSp.visible = false;
    eSp.userData.noMerge = true;
    staticGroup.add(eSp);
    dragonEmberSparks.push({
      sprite: eSp,
      mat: eMat,
      phase: e / EMBER_SPARK_COUNT,
      spreadX: Math.sin(e * 2.7) * 4.4,
      riseGain: 4.2 + (e % 7) * 1.6,
      reachZ: 14.0 + (e % 6) * 3.1,
      baseScale: 0.30 + (e % 4) * 0.12,
    });
  }

  const dragonSmokePuffs: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phase: number;
    driftX: number;
    driftY: number;
    reachZ: number;
    baseScale: number;
  }> = [];
  if (smokeTex) {
    for (let s = 0; s < 32; s++) {
      const smMat = new THREE.SpriteMaterial({
        map: smokeTex,
        color: 0x94a3b8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(smMat);
      sp.visible = false;
      sp.userData.noMerge = true;
      staticGroup.add(sp);
      dragonSmokePuffs.push({
        sprite: sp,
        mat: smMat,
        phase: s / 32,
        driftX: Math.sin(s * 2.1) * 2.9,
        driftY: 4.5 + (s % 5) * 1.65,
        reachZ: 17.5 + (s % 4) * 2.6,
        baseScale: 3.2 + (s % 4) * 1.15,
      });
    }
  }

  const dragonFireLight = new THREE.PointLight(0xff7b1c, 0, 86, 1.2);
  dragonFireLight.position.set(DRAGON_BRIDGE_CENTER_X, dragonHeadAnchorY + 0.6, dragonMouthZ - 8.5);
  dragonFireLight.visible = false;
  dragonFireLight.userData.noMerge = true;
  staticGroup.add(dragonFireLight);

  const dragonGlowSprites: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phaseOffset: number;
    kind: 'mouth' | 'eye' | 'mane' | 'arch';
  }> = [];
  if (glowTex) {
    const glowConfigs: Array<{
      x: number;
      y: number;
      z: number;
      scale: number;
      color: number;
      offset: number;
      kind: 'mouth' | 'eye' | 'mane' | 'arch';
    }> = [
      { x: DRAGON_BRIDGE_CENTER_X, y: dragonHeadAnchorY + 0.25, z: dragonMouthZ - 0.2, scale: 8.6, color: 0xfb923c, offset: 0, kind: 'mouth' },
      { x: DRAGON_BRIDGE_CENTER_X - 1.42, y: dragonHeadAnchorY + 1.38, z: dragonHeadAnchorZ - 1.55, scale: 3.4, color: 0x38bdf8, offset: 1.2, kind: 'eye' },
      { x: DRAGON_BRIDGE_CENTER_X + 1.42, y: dragonHeadAnchorY + 1.38, z: dragonHeadAnchorZ - 1.55, scale: 3.4, color: 0x38bdf8, offset: 1.2, kind: 'eye' },
      { x: DRAGON_BRIDGE_CENTER_X - 1.85, y: dragonHeadAnchorY + 0.12, z: dragonHeadAnchorZ - 0.3, scale: 3.8, color: 0xfde047, offset: 0.7, kind: 'mane' },
      { x: DRAGON_BRIDGE_CENTER_X + 1.85, y: dragonHeadAnchorY + 0.12, z: dragonHeadAnchorZ - 0.3, scale: 3.8, color: 0xfde047, offset: 1.8, kind: 'mane' },
      { x: DRAGON_BRIDGE_CENTER_X, y: HAN_BRIDGE_DECK_Y + 14.5, z: -230.0, scale: 14.0, color: 0xfbbf24, offset: 2.1, kind: 'arch' },
      { x: DRAGON_BRIDGE_CENTER_X, y: HAN_BRIDGE_DECK_Y + 9.5, z: -285.0, scale: 11.5, color: 0xfbbf24, offset: 2.8, kind: 'arch' },
    ];
    for (const cfg of glowConfigs) {
      const gMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: cfg.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const gSp = new THREE.Sprite(gMat);
      gSp.position.set(cfg.x, cfg.y, cfg.z);
      gSp.scale.set(cfg.scale, cfg.scale, 1);
      gSp.visible = false;
      gSp.userData.noMerge = true;
      staticGroup.add(gSp);
      dragonGlowSprites.push({ sprite: gSp, mat: gMat, phaseOffset: cfg.offset, kind: cfg.kind });
    }
  }

  // =========================================================================
  // 4B-2. CẦU TRẦN THỊ LÝ — ARCHITECTURAL SAIL BRIDGE (X = 503.0, Z = -351..-129)
  // =========================================================================
  const buildTranThiLyBridge = (tx: number) => {
    const zStart = HAN_BRIDGE_SOUTH_FLAT_END_Z; // -129.0
    const zEnd = HAN_BRIDGE_NORTH_FLAT_START_Z; // -351.0
    const pylonBaseZ = -246.0;
    const pylonTiltSlopeZ = 0.195; // Backward sail lean toward South (+Z)
    const pylonApexH = 74.0; // Razor-sharp tall white-silver sail pylon apex

    interface RoadStation {
      cx: number;
      cz: number;
      y: number;
      tx: number;
      tz: number;
      rx: number;
      rz: number;
      roadHW: number;
      outerHW: number;
      medianHW: number;
    }

    const buildStationsGeometry = (
      stations: RoadStation[],
      withGirderAndWalkways = true,
      skipMedianLanes = false
    ) => {
      // Helper to build an arbitrary quad-strip ribbon across a range of station offsets
      const buildOffsetStrip = (
        getXOff0: (s: RoadStation) => number,
        getXOff1: (s: RoadStation) => number,
        getY0: (s: RoadStation) => number,
        getY1: (s: RoadStation) => number,
        mat: THREE.Material,
        withSides = true,
        receiveShadow = false
      ) => {
        const pos: number[] = [];
        const norm: number[] = [];
        const uv: number[] = [];
        const idx: number[] = [];
        const pushQ = (
          a: [number, number, number],
          b: [number, number, number],
          c: [number, number, number],
          d: [number, number, number],
          nx: number,
          ny: number,
          nz: number,
          u0: number,
          v0: number,
          u1: number,
          v1: number
        ) => {
          const base = pos.length / 3;
          pos.push(...a, ...b, ...c, ...d);
          norm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
          uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
          idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        };

        for (let i = 0; i < stations.length - 1; i++) {
          const s0 = stations[i];
          const s1 = stations[i + 1];
          const t0 = i / (stations.length - 1);
          const t1 = (i + 1) / (stations.length - 1);

          const o00 = getXOff0(s0);
          const o01 = getXOff1(s0);
          const o10 = getXOff0(s1);
          const o11 = getXOff1(s1);

          const y0Bot = getY0(s0);
          const y0Top = getY1(s0);
          const y1Bot = getY0(s1);
          const y1Top = getY1(s1);

          const aTop: [number, number, number] = [s0.cx + s0.rx * o00, y0Top, s0.cz + s0.rz * o00];
          const bTop: [number, number, number] = [s0.cx + s0.rx * o01, y0Top, s0.cz + s0.rz * o01];
          const cTop: [number, number, number] = [s1.cx + s1.rx * o11, y1Top, s1.cz + s1.rz * o11];
          const dTop: [number, number, number] = [s1.cx + s1.rx * o10, y1Top, s1.cz + s1.rz * o10];
          pushQ(aTop, bTop, cTop, dTop, 0, 1, 0, 0, t0 * 12, 1, t1 * 12);

          if (withSides) {
            const aBot: [number, number, number] = [s0.cx + s0.rx * o00, y0Bot, s0.cz + s0.rz * o00];
            const bBot: [number, number, number] = [s0.cx + s0.rx * o01, y0Bot, s0.cz + s0.rz * o01];
            const cBot: [number, number, number] = [s1.cx + s1.rx * o11, y1Bot, s1.cz + s1.rz * o11];
            const dBot: [number, number, number] = [s1.cx + s1.rx * o10, y1Bot, s1.cz + s1.rz * o10];
            pushQ(dBot, cBot, bBot, aBot, 0, -1, 0, 0, t0, 1, t1);
            pushQ(aBot, aTop, dTop, dBot, -s0.rx, 0, -s0.rz, t0, 0, t1, 1);
            pushQ(cBot, cTop, bTop, bBot, s0.rx, 0, s0.rz, t1, 0, t0, 1);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, mat);
        if (receiveShadow) mesh.receiveShadow = true;
        staticGroup.add(mesh);
      };

      // 1. Trapezoidal Sloped Concrete Box-Girder Underside (matching 3D render cross-section!)
      if (withGirderAndWalkways) {
        const gPos: number[] = [];
        const gNorm: number[] = [];
        const gUv: number[] = [];
        const gIdx: number[] = [];
        const pushTrapQuad = (
          a: [number, number, number],
          b: [number, number, number],
          c: [number, number, number],
          d: [number, number, number],
          nx: number,
          ny: number,
          nz: number
        ) => {
          const base = gPos.length / 3;
          gPos.push(...a, ...b, ...c, ...d);
          gNorm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
          gUv.push(0, 0, 1, 0, 1, 1, 0, 1);
          gIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        };
        for (let i = 0; i < stations.length - 1; i++) {
          const s0 = stations[i];
          const s1 = stations[i + 1];
          const b0W = s0.outerHW * 0.44;
          const b1W = s1.outerHW * 0.44;
          const y0Belly = s0.y - 1.55;
          const y1Belly = s1.y - 1.55;
          const y0Rim = s0.y - 0.16;
          const y1Rim = s1.y - 0.16;

          const p0BL: [number, number, number] = [s0.cx - s0.rx * b0W, y0Belly, s0.cz - s0.rz * b0W];
          const p0BR: [number, number, number] = [s0.cx + s0.rx * b0W, y0Belly, s0.cz + s0.rz * b0W];
          const p1BL: [number, number, number] = [s1.cx - s1.rx * b1W, y1Belly, s1.cz - s1.rz * b1W];
          const p1BR: [number, number, number] = [s1.cx + s1.rx * b1W, y1Belly, s1.cz + s1.rz * b1W];

          const p0TL: [number, number, number] = [s0.cx - s0.rx * s0.outerHW, y0Rim, s0.cz - s0.rz * s0.outerHW];
          const p0TR: [number, number, number] = [s0.cx + s0.rx * s0.outerHW, y0Rim, s0.cz + s0.rz * s0.outerHW];
          const p1TL: [number, number, number] = [s1.cx - s1.rx * s1.outerHW, y1Rim, s1.cz - s1.rz * s1.outerHW];
          const p1TR: [number, number, number] = [s1.cx + s1.rx * s1.outerHW, y1Rim, s1.cz + s1.rz * s1.outerHW];

          // Bottom belly
          pushTrapQuad(p1BL, p1BR, p0BR, p0BL, 0, -1, 0);
          // Sloped left haunch wall
          pushTrapQuad(p0TL, p0BL, p1BL, p1TL, -s0.rx * 0.72, -0.69, -s0.rz * 0.72);
          // Sloped right haunch wall
          pushTrapQuad(p0BR, p0TR, p1TR, p1BR, s0.rx * 0.72, -0.69, s0.rz * 0.72);
          // Top underside support slab
          pushTrapQuad(p0TL, p0TR, p1TR, p1TL, 0, 1, 0);
        }
        const trapGeo = new THREE.BufferGeometry();
        trapGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
        trapGeo.setAttribute('normal', new THREE.Float32BufferAttribute(gNorm, 3));
        trapGeo.setAttribute('uv', new THREE.Float32BufferAttribute(gUv, 2));
        trapGeo.setIndex(gIdx);
        trapGeo.computeBoundingSphere();
        staticGroup.add(new THREE.Mesh(trapGeo, ttlConcreteGirderMat));
      }

      // 2. Dual Wide Asphalt Carriageways
      if (!skipMedianLanes) {
        buildOffsetStrip(
          (s) => -s.roadHW,
          (s) => -s.medianHW,
          (s) => s.y - 0.06,
          (s) => s.y,
          ttlAsphaltMat,
          true,
          true
        );
        buildOffsetStrip(
          (s) => s.medianHW,
          (s) => s.roadHW,
          (s) => s.y - 0.06,
          (s) => s.y,
          ttlAsphaltMat,
          true,
          true
        );
      }

      // 3. Bright White Central Median Strip + Subtle Top Surface
      buildOffsetStrip(
        (s) => -s.medianHW,
        (s) => s.medianHW,
        (s) => s.y - 0.02,
        (s) => s.y + 0.22,
        ttlWhiteMedianMat,
        true,
        true
      );

      // 4. Warm Salmon-Peach Terracotta Pedestrian Walkways Flanking Both Sides
      if (withGirderAndWalkways) {
        buildOffsetStrip(
          (s) => -s.outerHW,
          (s) => -s.roadHW,
          (s) => s.y - 0.06,
          (s) => Math.max(0.012, s.y + 0.12),
          ttlSalmonWalkMat,
          true,
          true
        );
        buildOffsetStrip(
          (s) => s.roadHW,
          (s) => s.outerHW,
          (s) => s.y - 0.06,
          (s) => Math.max(0.012, s.y + 0.12),
          ttlSalmonWalkMat,
          true,
          true
        );
      }

      // 5. Crisp 3-Lane Dashed Asphalt Dividers along Both Carriageways
      let accumDist = 0;
      for (let i = 0; i < stations.length - 1; i++) {
        const s0 = stations[i];
        const s1 = stations[i + 1];
        const segLen = Math.hypot(s1.cx - s0.cx, s1.cz - s0.cz);
        const mod = accumDist % 6.2;
        accumDist += segLen;
        if (mod > 2.8) continue;

        [-1, 1].forEach((side) => {
          [0.34, 0.67].forEach((frac) => {
            const off0 = side * THREE.MathUtils.lerp(s0.medianHW, s0.roadHW, frac);
            const off1 = side * THREE.MathUtils.lerp(s1.medianHW, s1.roadHW, frac);
            const pos: number[] = [
              s0.cx + s0.rx * (off0 - 0.08),
              s0.y + 0.012,
              s0.cz + s0.rz * (off0 - 0.08),
              s0.cx + s0.rx * (off0 + 0.08),
              s0.y + 0.012,
              s0.cz + s0.rz * (off0 + 0.08),
              s1.cx + s1.rx * (off1 + 0.08),
              s1.y + 0.012,
              s1.cz + s1.rz * (off1 + 0.08),
              s1.cx + s1.rx * (off1 - 0.08),
              s1.y + 0.012,
              s1.cz + s1.rz * (off1 - 0.08),
            ];
            const dGeo = new THREE.BufferGeometry();
            dGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            dGeo.setAttribute(
              'normal',
              new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3)
            );
            dGeo.setIndex([0, 1, 2, 0, 2, 3]);
            staticGroup.add(new THREE.Mesh(dGeo, ttlDarkDashMat));
          });
        });
      }

      // 6. Six Parallel Lines of 4-Bar Sage-Green Metal Railings (Merged via Single Shared Material!)
      const railBarHeights = [0.28, 0.52, 0.76, 1.00];
      const postGeo = new THREE.BoxGeometry(0.08, 1.08, 0.08);
      for (let i = 0; i < stations.length - 1; i++) {
        const s0 = stations[i];
        const s1 = stations[i + 1];
        const offsets0 = [
          -s0.outerHW + 0.14,
          -s0.roadHW - 0.06,
          -s0.medianHW + 0.04,
          s0.medianHW - 0.04,
          s0.roadHW + 0.06,
          s0.outerHW - 0.14,
        ];
        const offsets1 = [
          -s1.outerHW + 0.14,
          -s1.roadHW - 0.06,
          -s1.medianHW + 0.04,
          s1.medianHW - 0.04,
          s1.roadHW + 0.06,
          s1.outerHW - 0.14,
        ];
        const baseY0 = (idx: number) =>
          idx === 2 || idx === 3 ? s0.y + 0.22 : Math.max(0.0, s0.y + 0.12);
        const baseY1 = (idx: number) =>
          idx === 2 || idx === 3 ? s1.y + 0.22 : Math.max(0.0, s1.y + 0.12);

        for (let r = 0; r < 6; r++) {
          // Place guardrails strictly over the river span (Z = -134.15 .. -345.0), leaving both bank mouths 100% open!
          if (s0.cz > -134.15 || s1.cz < -345.0) continue;
          const x0 = s0.cx + s0.rx * offsets0[r];
          const z0 = s0.cz + s0.rz * offsets0[r];
          const x1 = s1.cx + s1.rx * offsets1[r];
          const z1 = s1.cz + s1.rz * offsets1[r];
          const y0 = baseY0(r);
          const y1 = baseY1(r);

          for (let h = 0; h < railBarHeights.length; h++) {
            const bh = railBarHeights[h];
            addStrut([x0, y0 + bh, z0], [x1, y1 + bh, z1], 0.025, ttlSageRailMat, 4);
          }
          if (i % 1 === 0) {
            const pMesh = new THREE.Mesh(postGeo, ttlSageRailMat);
            pMesh.position.set(x0, y0 + 0.54, z0);
            pMesh.rotation.y = Math.atan2(s0.tx, s0.tz);
            staticGroup.add(pMesh);
          }
        }
      }

      // 7. Tall Slender White Streetlamps Along the White Central Median
      let lampDist = 11.0;
      for (let i = 1; i < stations.length - 1; i++) {
        const sPrev = stations[i - 1];
        const sCur = stations[i];
        lampDist += Math.hypot(sCur.cx - sPrev.cx, sCur.cz - sPrev.cz);
        if (lampDist < 22.0) continue;
        lampDist = 0;
        if (sCur.cz > -134.0 || sCur.cz < -345.0) continue;
        // Skip right on top of the main pylon base at (-246)
        if (Math.abs(sCur.cx - tx) < 2.0 && Math.abs(sCur.cz - pylonBaseZ) < 6.0) continue;

        const baseY = sCur.y + 0.22;
        const poleH = 7.4;
        addStrut([sCur.cx, baseY, sCur.cz], [sCur.cx, baseY + poleH, sCur.cz], 0.08, ttlSailWhiteMat, 8);
        [-1, 1].forEach((side) => {
          const armEndX = sCur.cx + sCur.rx * side * 2.15;
          const armEndZ = sCur.cz + sCur.rz * side * 2.15;
          addStrut([sCur.cx, baseY + poleH - 0.15, sCur.cz], [armEndX, baseY + poleH + 0.25, armEndZ], 0.045, ttlSailWhiteMat, 6);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.24), warmLanternMat);
          head.position.set(armEndX, baseY + poleH + 0.20, armEndZ);
          head.rotation.y = Math.atan2(sCur.tx, sCur.tz);
          staticGroup.add(head);
        });
      }
    };

    // Build Main Straight 222m Uniformly Wide Bridge Stations (Z = -129 .. -351) + Extended Connected Walkways (-125.9 .. -353.6)
    const mainSegs = 82;
    const mainStations: RoadStation[] = [];
    for (let i = 0; i <= mainSegs; i++) {
      const z = THREE.MathUtils.lerp(zStart, zEnd, i / mainSegs);
      mainStations.push({
        cx: tx,
        cz: z,
        y: getHanRiverBridgeDeckY(z),
        tx: 0,
        tz: -1,
        rx: 1,
        rz: 0,
        roadHW: getTranThiLyBridgeRoadHalfW(z),
        outerHW: getTranThiLyBridgeOuterHalfW(z),
        medianHW: 0.92,
      });
    }
    buildStationsGeometry(mainStations, true, false);

    // Flush Approach Salmon Terracotta Walkways connecting South Bạch Đằng (Z=-125.9..-129.0) & North Trần Hưng Đạo (Z=-351.0..-353.6)
    [-1, 1].forEach((side) => {
      const xIn = side < 0 ? tx - 14.1 : tx + 8.4;
      const xOut = side < 0 ? tx - 8.4 : tx + 14.1;
      const southApronWalk = createBridgeRibbonGeometry(
        xIn,
        xOut,
        () => -0.06,
        () => 0.012,
        -125.9,
        -129.0,
        4
      );
      staticGroup.add(new THREE.Mesh(southApronWalk, ttlSalmonWalkMat));

      const northApronWalk = createBridgeRibbonGeometry(
        xIn,
        xOut,
        () => -0.06,
        () => 0.012,
        -351.0,
        -353.6,
        4
      );
      staticGroup.add(new THREE.Mesh(northApronWalk, ttlSalmonWalkMat));
    });

    // Subtle exterior bridge side trim fascia along full river span (-134.6 .. -344.8)
    const westRimGeo = createBridgeRibbonGeometry(
      tx - 14.1 - 0.14,
      tx - 14.1 + 0.04,
      (z) => getHanRiverBridgeDeckY(z) - 0.34,
      (z) => getHanRiverBridgeDeckY(z) + 0.14,
      -134.6,
      -344.8,
      64
    );
    staticGroup.add(new THREE.Mesh(westRimGeo, ttlCanopySilverMat));
    const eastRimGeo = createBridgeRibbonGeometry(
      tx + 14.1 - 0.04,
      tx + 14.1 + 0.14,
      (z) => getHanRiverBridgeDeckY(z) - 0.34,
      (z) => getHanRiverBridgeDeckY(z) + 0.14,
      -134.6,
      -344.8,
      64
    );
    staticGroup.add(new THREE.Mesh(eastRimGeo, ttlCanopySilverMat));

    // Main Bridge River Concrete Piers & Curved Silver-White Architectural Sail-Wing Canopy at Main Pylon
    addBox(tx - 13.8, tx + 13.8, -3.5, -0.05, -135.2, -133.4, stoneWallMat);
    addBox(tx - 13.8, tx + 13.8, -3.5, -0.05, -346.2, -344.4, stoneWallMat);
    [-166.0, -206.0, pylonBaseZ, -286.0, -320.0].forEach((pz) => {
      const pDeckY = getHanRiverBridgeDeckY(pz);
      const pOuterW = getTranThiLyBridgeOuterHalfW(pz);
      const isMainPylonPier = pz === pylonBaseZ;
      const cap = new THREE.Mesh(
        isMainPylonPier ? new THREE.CylinderGeometry(11.5, 12.2, 1.65, 24) : new THREE.BoxGeometry(pOuterW * 1.68, 1.25, 3.8),
        ttlConcreteGirderMat
      );
      cap.position.set(tx, HAN_RIVER_WATER_Y + 0.1, pz);
      staticGroup.add(cap);

      [-pOuterW * 0.44, pOuterW * 0.44].forEach((pxOff) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.38, pDeckY + 1.4, 16), ttlConcreteGirderMat);
        col.position.set(tx + pxOff, (HAN_RIVER_WATER_Y + pDeckY - 0.6) * 0.5, pz);
        staticGroup.add(col);
      });
      if (isMainPylonPier) {
        const centerPier = new THREE.Mesh(
          new THREE.CylinderGeometry(2.6, 3.1, pDeckY + 1.6, 20),
          ttlConcreteGirderMat
        );
        centerPier.position.set(tx, (HAN_RIVER_WATER_Y + pDeckY - 0.6) * 0.5, pz);
        staticGroup.add(centerPier);

        // Curved Silver-White Architectural Sail-Wing Canopy tucked cleanly BENEATH the Deck Girder
        const canopyShellGeo = new THREE.CylinderGeometry(14.0, 14.0, 16.0, 24, 1, true, -Math.PI * 0.38, Math.PI * 0.76);
        canopyShellGeo.rotateZ(Math.PI / 2);
        canopyShellGeo.scale(1.0, 0.24, 1.0);
        const canopyMatSide = ttlCanopySilverMat.clone();
        canopyMatSide.side = THREE.DoubleSide;
        const canopyMesh = new THREE.Mesh(canopyShellGeo, canopyMatSide);
        canopyMesh.position.set(tx, pDeckY - 4.75, pylonBaseZ);
        staticGroup.add(canopyMesh);
      } else {
        addBox(tx - pOuterW * 0.38, tx + pOuterW * 0.38, HAN_RIVER_WATER_Y + 0.2, pDeckY - 1.25, pz - 0.68, pz + 0.68, stoneWallMat);
      }
      addBox(tx - pOuterW * 0.92, tx + pOuterW * 0.92, pDeckY - 1.45, pDeckY - 0.62, pz - 1.7, pz + 1.7, ttlConcreteGirderMat);
    });

    // 8. Tall Sharp Pointed White-Silver Inclined Sail Pylon (74m Tall, Leans Smoothly South Inside Central White Median!)
    const pylonDeckY = getHanRiverBridgeDeckY(pylonBaseZ);
    addBox(tx - 0.88, tx + 0.88, pylonDeckY, pylonDeckY + 2.8, pylonBaseZ - 3.6, pylonBaseZ + 3.0, ttlWhiteMedianMat);

    const towerSegs = 28;
    const pylonTopY = pylonDeckY + pylonApexH;
    const getPylonSpineAt = (frac: number) => {
      const y = THREE.MathUtils.lerp(pylonDeckY + 0.6, pylonTopY, frac);
      const z = pylonBaseZ + (y - pylonDeckY) * pylonTiltSlopeZ;
      return { y, z };
    };

    for (let s = 0; s < towerSegs; s++) {
      const f0 = s / towerSegs;
      const f1 = (s + 1) / towerSegs;
      const fm = (f0 + f1) * 0.5;
      const p0 = getPylonSpineAt(f0);
      const p1 = getPylonSpineAt(f1);
      const pm = getPylonSpineAt(fm);
      const segLen = Math.hypot(p1.y - p0.y, p1.z - p0.z) + 0.14;
      const taper = Math.pow(1 - fm, 0.82);
      const depthZ = Math.max(0.24, 5.4 * taper);
      const widthX = Math.max(0.24, 1.62 * Math.pow(1 - fm, 0.72));

      const sailSeg = new THREE.Mesh(
        new THREE.BoxGeometry(widthX, segLen, depthZ),
        ttlSailWhiteMat
      );
      sailSeg.position.set(tx, pm.y, pm.z);
      sailSeg.rotation.x = Math.atan(pylonTiltSlopeZ);
      staticGroup.add(sailSeg);
    }
    const apexPos = getPylonSpineAt(1);
    const spireNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.22, 4.2, 8), ttlSailWhiteMat);
    spireNeedle.position.set(tx, apexPos.y + 1.8, apexPos.z + 0.35);
    spireNeedle.rotation.x = Math.atan(pylonTiltSlopeZ);
    staticGroup.add(spireNeedle);

    // 9. Dense Crisp White-Silver Cable-Stayed Harp/Fan Planes Anchoring onto Central White Median!
    const addWhiteStayPair = (frac: number, deckZ: number, radius = 0.05) => {
      const anchor = getPylonSpineAt(frac);
      const deckY = Math.max(0.0, getHanRiverBridgeDeckY(deckZ) + 0.24);
      [-1, 1].forEach((side) => {
        const medianEdgeX = tx + side * 0.58;
        const pylonEdgeX = tx + side * Math.max(0.16, 0.62 * (1 - frac * 0.72));
        addStrut([pylonEdgeX, anchor.y, anchor.z], [medianEdgeX, deckY, deckZ], radius, ttlWhiteCableMat, 5);
      });
    };

    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const frac = THREE.MathUtils.lerp(0.32, 0.96, t);
      const deckZ = THREE.MathUtils.lerp(-252.0, -340.0, t);
      addWhiteStayPair(frac, deckZ, 0.052);
    }

    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const frac = THREE.MathUtils.lerp(0.35, 0.95, t);
      const deckZ = THREE.MathUtils.lerp(-238.0, -142.0, t);
      addWhiteStayPair(frac, deckZ, 0.056);
    }

    // 10. Bridge Entrance Nameplate Monument tucked flush along riverside balustrade (X = 486.5, Z = -133.75) so West walkway mouth stays 100% open
    const ttlPlaqueCanvas = document.createElement('canvas');
    ttlPlaqueCanvas.width = 512;
    ttlPlaqueCanvas.height = 192;
    const ttlCtx = ttlPlaqueCanvas.getContext('2d')!;
    ttlCtx.fillStyle = '#f8fafc';
    ttlCtx.fillRect(0, 0, 512, 192);
    ttlCtx.strokeStyle = '#65a30d';
    ttlCtx.lineWidth = 8;
    ttlCtx.strokeRect(8, 8, 496, 176);
    ttlCtx.fillStyle = '#0f172a';
    ttlCtx.textAlign = 'center';
    ttlCtx.font = '900 42px system-ui, sans-serif';
    ttlCtx.fillText('CẦU TRẦN THỊ LÝ', 256, 78);
    ttlCtx.fillStyle = '#3f6212';
    ttlCtx.font = '700 24px system-ui, sans-serif';
    ttlCtx.fillText('ĐÀ NẴNG • SÔNG HÀN', 256, 134);
    const ttlPlaqueTex = new THREE.CanvasTexture(ttlPlaqueCanvas);
    ttlPlaqueTex.colorSpace = THREE.SRGBColorSpace;
    ttlPlaqueTex.anisotropy = 4;
    const ttlPlaqueMat = new THREE.MeshStandardMaterial({
      map: ttlPlaqueTex,
      emissive: 0xffffff,
      emissiveMap: ttlPlaqueTex,
      emissiveIntensity: 0.22,
      roughness: 0.45,
    });
    const plaqueSign = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 0.18), ttlPlaqueMat);
    plaqueSign.position.set(tx - 16.5, 1.35, -133.75);
    staticGroup.add(plaqueSign);
    addBox(tx - 17.4, tx - 15.6, 0.0, 0.92, -133.92, -133.58, stoneWallMat);
  };
  buildTranThiLyBridge(TRAN_THI_LY_BRIDGE_CENTER_X);

  // =========================================================================
  // 4C. BỜ KÈ BẮC SÔNG HÀN (MIRROR BẠCH ĐẰNG: Z=-353.6..-345.0) + ĐƯỜNG TRẦN HƯNG ĐẠO (Z=-370.4..-353.6)
  // =========================================================================
  // Split North River Embankment cleanly around Cầu Sông Hàn (182.4..204.6), Cầu Rồng (358.2..381.8) & Cầu Trần Thị Lý (488.9..517.1)
  addBox(60.0, 182.4, -3.5, -0.05, -353.6, -344.8, stoneWallMat);
  addBox(204.6, 358.2, -3.5, -0.05, -353.6, -344.8, stoneWallMat);
  addBox(381.8, 488.9, -3.5, -0.05, -353.6, -344.8, stoneWallMat);
  addBox(517.1, 575.0, -3.5, -0.05, -353.6, -344.8, stoneWallMat);

  // North Bank Riverside Granite Promenade (8.6m deep Z=-353.6..-345.0, matching Bạch Đằng's 8.6m promenade!)
  addBox(74.0, 182.4, -0.04, 0.0, -353.6, -345.0, granitePromenadeMat);
  addBox(204.6, 358.2, -0.04, 0.0, -353.6, -345.0, granitePromenadeMat);
  addBox(381.8, 488.9, -0.04, 0.0, -353.6, -345.0, granitePromenadeMat);
  addBox(517.1, 571.0, -0.04, 0.0, -353.6, -345.0, granitePromenadeMat);

  // Promenade Roadside Curbs (Z = -353.72..-353.48) + Retaining Side Curbs Along All 3 Bridge Mouths (Z = -353.6..-345.0)
  addBox(75.0, 182.4, 0.0, 0.12, -353.72, -353.48, darkCurbMat);
  addBox(204.6, 358.2, 0.0, 0.12, -353.72, -353.48, darkCurbMat);
  addBox(381.8, 488.9, 0.0, 0.12, -353.72, -353.48, darkCurbMat);
  addBox(517.1, 571.0, 0.0, 0.12, -353.72, -353.48, darkCurbMat);
  addBox(185.5, 185.75, -0.26, 0.12, -353.6, -345.0, darkCurbMat);
  addBox(201.25, 201.5, -0.26, 0.12, -353.6, -345.0, darkCurbMat);
  addBox(361.48, 361.72, -0.26, 0.12, -353.6, -345.0, darkCurbMat);
  addBox(378.28, 378.52, -0.26, 0.12, -353.6, -345.0, darkCurbMat);
  addBox(494.48, 494.72, -0.26, 0.12, -353.6, -345.0, darkCurbMat);
  addBox(511.28, 511.52, -0.26, 0.12, -353.6, -345.0, darkCurbMat);

  addBox(60.0, 182.3, 0.0, 0.18, -345.2, -344.6, marbleWhiteMat);
  addBox(204.7, 248.0, 0.0, 0.18, -345.2, -344.6, marbleWhiteMat);
  addBox(284.0, 358.0, 0.0, 0.18, -345.2, -344.6, marbleWhiteMat);
  addBox(382.0, 488.7, 0.0, 0.18, -345.2, -344.6, marbleWhiteMat);
  addBox(517.3, 575.0, 0.0, 0.18, -345.2, -344.6, marbleWhiteMat);
  addBox(60.0, 182.3, -0.15, 0.04, -345.3, -344.5, bridgeCyanMat);
  addBox(204.7, 248.0, -0.15, 0.04, -345.3, -344.5, bridgeCyanMat);
  addBox(284.0, 358.0, -0.15, 0.04, -345.3, -344.5, bridgeCyanMat);
  addBox(382.0, 488.7, -0.15, 0.04, -345.3, -344.5, bridgeCyanMat);
  addBox(517.3, 575.0, -0.15, 0.04, -345.3, -344.5, bridgeCyanMat);
  addRailingRun(75.0, 182.3, -345.0);
  addRailingRun(204.7, 248.0, -345.0);
  addRailingRun(284.0, 358.0, -345.0);
  addRailingRun(382.0, 488.7, -345.0);
  addRailingRun(517.3, 570.5, -345.0);

  // North Bank Ngã Tư Roadway Network (Asphalt at Y = -0.26, split cleanly around nbEwRoad Z = -370.4 .. -353.6 to prevent Z-fighting)
  [NORTH_BANK_INTERSECTION_CENTER_X, DRAGON_BRIDGE_CENTER_X, TRAN_THI_LY_BRIDGE_CENTER_X].forEach((cx) => {
    const nbApproach = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(16.8, 2.6), 3, 1), asphaltMat);
    nbApproach.rotation.x = -Math.PI / 2;
    nbApproach.position.set(cx, -0.26, -352.3); // Z = -353.6 .. -351.0
    staticGroup.add(nbApproach);

    const nbNorthLeg = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(16.8, 87.6), 3, 14), asphaltMat);
    nbNorthLeg.rotation.x = -Math.PI / 2;
    nbNorthLeg.position.set(cx, -0.26, -414.2); // Z = -458.0 .. -370.4
    staticGroup.add(nbNorthLeg);
  });

  // 2. E-W North Bank Trần Hưng Đạo Boulevard (Z = -370.4..-353.6, center Z = -362.0, X = 76..570)
  const nbEwRoad = new THREE.Mesh(scalePlaneUv(new THREE.PlaneGeometry(494.0, 16.8), 78, 3), asphaltMat);
  nbEwRoad.rotation.x = -Math.PI / 2;
  nbEwRoad.position.set(323.0, -0.26, NORTH_BANK_INTERSECTION_CENTER_Z);
  staticGroup.add(nbEwRoad);

  // North Sidewalks & Curbs Flanking North Side of Trần Hưng Đạo (Z = -378.2..-370.4, zero overlap with riverfront promenade!)
  // North Sidewalk West of Cầu Sông Hàn North Leg (X = 75..185.1, Z = -378.2..-370.4)
  addBox(75.0, 185.1, -0.25, 0.0, -378.2, -370.4, coastalTileMat);
  addBox(75.0, 185.1, 0.0, 0.12, -370.52, -370.28, darkCurbMat);
  addBox(184.98, 185.22, 0.0, 0.12, -458.0, -370.4, darkCurbMat);
  // North Sidewalk Center between Cầu Sông Hàn & Cầu Rồng North Legs (X = 201.9..361.6, Z = -378.2..-370.4)
  addBox(201.9, 361.6, -0.25, 0.0, -378.2, -370.4, coastalTileMat);
  addBox(201.9, 361.6, 0.0, 0.12, -370.52, -370.28, darkCurbMat);
  addBox(201.78, 202.02, 0.0, 0.12, -458.0, -370.4, darkCurbMat);
  addBox(361.48, 361.72, 0.0, 0.12, -458.0, -370.4, darkCurbMat);
  // North Sidewalk Mid-East between Cầu Rồng & Cầu Trần Thị Lý North Legs (X = 378.4..494.6, Z = -378.2..-370.4)
  addBox(378.4, 494.6, -0.25, 0.0, -378.2, -370.4, coastalTileMat);
  addBox(378.4, 494.6, 0.0, 0.12, -370.52, -370.28, darkCurbMat);
  addBox(378.28, 378.52, 0.0, 0.12, -458.0, -370.4, darkCurbMat);
  addBox(494.48, 494.72, 0.0, 0.12, -458.0, -370.4, darkCurbMat);
  // North Sidewalk Far-East East of Cầu Trần Thị Lý North Leg (X = 511.4..571.0, Z = -378.2..-370.4)
  addBox(511.4, 571.0, -0.25, 0.0, -378.2, -370.4, coastalTileMat);
  addBox(511.4, 571.0, 0.0, 0.12, -370.52, -370.28, darkCurbMat);
  addBox(511.28, 511.52, 0.0, 0.12, -458.0, -370.4, darkCurbMat);

  // Sidewalks flanking All 3 North Legs (Z = -458..-378.2)
  addBox(179.0, 185.1, -0.25, 0.0, -458.0, -378.2, coastalTileMat);
  addBox(201.9, 208.0, -0.25, 0.0, -458.0, -378.2, coastalTileMat);
  addBox(355.5, 361.6, -0.25, 0.0, -458.0, -378.2, coastalTileMat);
  addBox(378.4, 384.5, -0.25, 0.0, -458.0, -378.2, coastalTileMat);
  addBox(488.5, 494.6, -0.25, 0.0, -458.0, -378.2, coastalTileMat);
  addBox(511.4, 517.5, -0.25, 0.0, -458.0, -378.2, coastalTileMat);

  // North Bank Road Centerlines & Lane Dashes
  // West E-W leg (X = 76 .. 182)
  [-0.14, 0.14].forEach((off) => addMark(129.0, NORTH_BANK_INTERSECTION_CENTER_Z + off, 106.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(129.0, NORTH_BANK_INTERSECTION_CENTER_Z + dir * 7.75, 106.0, 0.16, stripeMat));
  for (let x = 80; x <= 178; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, NORTH_BANK_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }
  // Center E-W leg between Cầu Sông Hàn & Cầu Rồng (X = 205 .. 358.5)
  [-0.14, 0.14].forEach((off) => addMark(281.75, NORTH_BANK_INTERSECTION_CENTER_Z + off, 153.5, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(281.75, NORTH_BANK_INTERSECTION_CENTER_Z + dir * 7.75, 153.5, 0.16, stripeMat));
  for (let x = 209; x <= 354; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, NORTH_BANK_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }
  // Mid-East E-W leg between Cầu Rồng & Cầu Trần Thị Lý (X = 381.5 .. 491.5)
  [-0.14, 0.14].forEach((off) => addMark(436.5, NORTH_BANK_INTERSECTION_CENTER_Z + off, 110.0, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(436.5, NORTH_BANK_INTERSECTION_CENTER_Z + dir * 7.75, 110.0, 0.16, stripeMat));
  for (let x = 385; x <= 487; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, NORTH_BANK_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }
  // Far-East E-W leg past Cầu Trần Thị Lý (X = 514.5 .. 570)
  [-0.14, 0.14].forEach((off) => addMark(542.25, NORTH_BANK_INTERSECTION_CENTER_Z + off, 55.5, 0.12, yellowMedianMat));
  [-1, 1].forEach((dir) => addMark(542.25, NORTH_BANK_INTERSECTION_CENTER_Z + dir * 7.75, 55.5, 0.16, stripeMat));
  for (let x = 518; x <= 566; x += 5.5) {
    [-4.1, 4.1].forEach((off) => addMark(x, NORTH_BANK_INTERSECTION_CENTER_Z + off, 2.4, 0.14, stripeMat));
  }
  // North Leg Centerlines (Cầu Sông Hàn + Cầu Rồng + Cầu Trần Thị Lý, Z = -456 .. -374)
  [NORTH_BANK_INTERSECTION_CENTER_X, DRAGON_BRIDGE_CENTER_X, TRAN_THI_LY_BRIDGE_CENTER_X].forEach((nx) => {
    [-0.14, 0.14].forEach((off) => {
      addMark(nx + off, -415.0, 0.12, 82.0, yellowMedianMat);
    });
    for (let z = -455; z <= -375; z += 5.2) {
      [-4.1, 4.1].forEach((off) => addMark(nx + off, z, 0.14, 2.3, stripeMat));
    }
  });

  // 4 Zebra Crosswalks framing Ngã Tư Trần Hưng Đạo – Cầu Sông Hàn (193.5, -362.0)
  for (let x = 186.2; x <= 200.8; x += 1.05) {
    addMark(x, -352.2, 0.52, 2.6, stripeMat, -0.248);
    addMark(x, -372.2, 0.52, 3.0, stripeMat, -0.248);
  }
  [183.4, 203.6].forEach((cx) => {
    for (let z = -369.2; z <= -354.8; z += 1.05) {
      addMark(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // 4 Zebra Crosswalks framing Ngã Tư Trần Hưng Đạo – Cầu Rồng (370.0, -362.0)
  for (let x = 362.8; x <= 377.2; x += 1.05) {
    addMark(x, -352.2, 0.52, 2.6, stripeMat, -0.248);
    addMark(x, -372.2, 0.52, 3.0, stripeMat, -0.248);
  }
  [359.8, 380.2].forEach((cx) => {
    for (let z = -369.2; z <= -354.8; z += 1.05) {
      addMark(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // 4 Zebra Crosswalks framing Ngã Tư Trần Hưng Đạo – Cầu Trần Thị Lý (503.0, -362.0)
  for (let x = 495.8; x <= 510.2; x += 1.05) {
    addMark(x, -352.2, 0.52, 2.6, stripeMat, -0.248);
    addMark(x, -372.2, 0.52, 3.0, stripeMat, -0.248);
  }
  [492.8, 513.2].forEach((cx) => {
    for (let z = -369.2; z <= -354.8; z += 1.05) {
      addMark(cx, z, 3.0, 0.52, stripeMat, -0.248);
    }
  });

  // Stop Lines & Directional Arrows at All 3 North Bank Intersections (centerZ = -362.0)
  addMark(197.6, -350.7, 7.6, 0.42, stripeMat, -0.247);
  addMark(189.4, -375.5, 7.6, 0.42, stripeMat, -0.247);
  addMark(179.4, -357.8, 0.42, 7.6, stripeMat, -0.247);
  addMark(207.6, -366.2, 0.42, 7.6, stripeMat, -0.247);

  addArrowDecal(190.4, -378.5, straightLeftArrow, Math.PI);
  addArrowDecal(176.2, -357.8, straightRightArrow, -Math.PI / 2);
  addArrowDecal(210.8, -366.2, straightLeftArrow, Math.PI / 2);

  addMark(374.1, -350.7, 7.6, 0.42, stripeMat, -0.247);
  addMark(365.9, -375.5, 7.6, 0.42, stripeMat, -0.247);
  addMark(355.9, -357.8, 0.42, 7.6, stripeMat, -0.247);
  addMark(384.1, -366.2, 0.42, 7.6, stripeMat, -0.247);

  addArrowDecal(366.9, -378.5, straightLeftArrow, Math.PI);
  addArrowDecal(352.7, -357.8, straightRightArrow, -Math.PI / 2);
  addArrowDecal(387.3, -366.2, straightLeftArrow, Math.PI / 2);

  addMark(507.1, -350.7, 7.6, 0.42, stripeMat, -0.247);
  addMark(498.9, -375.5, 7.6, 0.42, stripeMat, -0.247);
  addMark(488.9, -357.8, 0.42, 7.6, stripeMat, -0.247);
  addMark(517.1, -366.2, 0.42, 7.6, stripeMat, -0.247);

  addArrowDecal(499.9, -378.5, straightLeftArrow, Math.PI);
  addArrowDecal(485.7, -357.8, straightRightArrow, -Math.PI / 2);
  addArrowDecal(520.3, -366.2, straightLeftArrow, Math.PI / 2);

  // North Bank Corner Signal Rigs + Compact Sidewalk Street-Name Signs at (193.5), (370.0) & (503.0)
  const northBankSignalRig = buildTrafficSignalRig(
    NORTH_BANK_INTERSECTION_CENTER_X,
    NORTH_BANK_INTERSECTION_CENTER_Z,
    false,
    -353.1,
    11.2,
    9.25
  );
  const northBankSignTex = createBachDangSignTex(
    'NGÃ TƯ TRẦN HƯNG ĐẠO • CẦU SÔNG HÀN',
    '◀ BỜ ĐÔNG TÂY  •  ▼ VỀ BẠCH ĐẰNG  •  CẦU RỒNG ▶'
  );
  const northBankSignMat = new THREE.MeshStandardMaterial({
    map: northBankSignTex,
    emissive: 0xffffff,
    emissiveMap: northBankSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(northBankSignMat);
  mountCornerStreetSign(182.3, -353.1, northBankSignMat, -1);

  const dragonNorthBankSignalRig = buildTrafficSignalRig(
    DRAGON_BRIDGE_CENTER_X,
    NORTH_BANK_INTERSECTION_CENTER_Z,
    false,
    -353.1,
    12.15,
    9.25
  );
  const dragonNorthBankSignTex = createBachDangSignTex(
    'NGÃ TƯ TRẦN HƯNG ĐẠO • CẦU RỒNG',
    '◀ CẦU SÔNG HÀN • BỜ BẮC  •  ▼ VỀ SƠN TÂY  •  CẦU TRẦN THỊ LÝ ▶'
  );
  const dragonNorthBankSignMat = new THREE.MeshStandardMaterial({
    map: dragonNorthBankSignTex,
    emissive: 0xffffff,
    emissiveMap: dragonNorthBankSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(dragonNorthBankSignMat);
  mountCornerStreetSign(357.85, -353.1, dragonNorthBankSignMat, -1);

  const tranThiLyNorthBankSignalRig = buildTrafficSignalRig(
    TRAN_THI_LY_BRIDGE_CENTER_X,
    NORTH_BANK_INTERSECTION_CENTER_Z,
    false,
    -353.1,
    14.5,
    9.25
  );
  const tranThiLyNorthBankSignTex = createBachDangSignTex(
    'NGÃ TƯ TRẦN HƯNG ĐẠO • CẦU TRẦN THỊ LÝ',
    '◀ CẦU RỒNG  •  ▼ VỀ ĐẠI LỘ PARIS  •  BỜ ĐÔNG ▶'
  );
  const tranThiLyNorthBankSignMat = new THREE.MeshStandardMaterial({
    map: tranThiLyNorthBankSignTex,
    emissive: 0xffffff,
    emissiveMap: tranThiLyNorthBankSignTex,
    emissiveIntensity: 0.24,
    roughness: 0.55,
  });
  neonMats.push(tranThiLyNorthBankSignMat);
  mountCornerStreetSign(488.5, -353.1, tranThiLyNorthBankSignMat, -1);

  // North Bank Palms & Riverside Lamps along Waterfront Promenade (-353.6..-345.0) & North Sidewalk (-371.6)
  for (let x = 86; x <= 560; x += 22) {
    if (
      Math.abs(x - 193.5) > 13.5 &&
      Math.abs(x - DRAGON_BRIDGE_CENTER_X) > 14 &&
      Math.abs(x - TRAN_THI_LY_BRIDGE_CENTER_X) > 15.5
    ) {
      if (x < 247.0 || x > 284.5) {
        addRiversideLamp(x, -346.4);
      }
      if (Math.abs(x + 8 - 279.0) > 6.5) {
        addCoastalPalm(x + 8, -350.0, 5.4);
      }
      addRiversideLamp(x, -371.6);
    }
  }
  addRiversideLamp(247.4, -345.8);
  addRiversideLamp(284.6, -345.8);

  // =========================================================================
  // 4D. CẦU TÌNH YÊU & BẾN DU THUYỀN BỜ BẮC (X = 272..346, Z = -345..-316)
  // =========================================================================
  const lovePierDeckTex = getSidewalkPaverTextures();
  const lovePierDeckMat = new THREE.MeshStandardMaterial({
    color: 0xd8dee6,
    map: lovePierDeckTex?.map || null,
    roughness: 0.72,
    metalness: 0.05,
  });
  const lovePierSideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.78 });
  const loveStonePillarMat = new THREE.MeshStandardMaterial({ color: 0xc9b492, roughness: 0.80 });
  const loveStoneCapMat = new THREE.MeshStandardMaterial({ color: 0xa38b67, roughness: 0.76 });
  const loveIronMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.55 });
  const loveScrollTex = createLoveBridgeRailingTex();
  const loveScrollMat = new THREE.MeshStandardMaterial({
    map: loveScrollTex,
    alphaTest: 0.4,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 0.50,
    metalness: 0.45,
  });
  const loveHeartLanternMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.20,
    roughness: 0.35,
    metalness: 0.08,
  });
  const loveStepMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.86 });
  const loveLifebuoyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.52 });

  // Pedestrian bollards at the Cầu Tình Yêu entrance mouth (X = 274..284, Z = -345.0)
  [276.2, 279.0, 281.8].forEach((bx) => {
    const bollardBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.14, 10), loveStonePillarMat);
    bollardBase.position.set(bx, 0.07, -345.0);
    staticGroup.add(bollardBase);
    const bollardPost = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.72, 10), loveIronMat);
    bollardPost.position.set(bx, 0.44, -345.0);
    staticGroup.add(bollardPost);
    const bollardCap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dragonGoldMat);
    bollardCap.position.set(bx, 0.82, -345.0);
    staticGroup.add(bollardCap);
  });

  // Entrance Neck + Widened Cá Chép Hóa Rồng Plaza (X = 248..284, Z = -345..-333, Y = 0.0) & Main Love Promenade (X = 272..346, Z = -333..-325, Y = 0.0)
  addBox(248.0, LOVE_BRIDGE_NECK_MAX_X, -0.28, 0.0, -345.1, LOVE_BRIDGE_MAIN_MIN_Z, lovePierDeckMat);
  addBox(247.82, LOVE_BRIDGE_NECK_MAX_X + 0.15, -2.15, -0.02, -345.1, LOVE_BRIDGE_MAIN_MIN_Z - 0.18, lovePierSideMat);
  addBox(248.0, LOVE_BRIDGE_MAX_X, -0.28, 0.0, LOVE_BRIDGE_MAIN_MIN_Z, LOVE_BRIDGE_MAIN_MAX_Z, lovePierDeckMat);
  addBox(247.82, LOVE_BRIDGE_MAX_X + 0.18, -2.15, -0.02, LOVE_BRIDGE_MAIN_MIN_Z - 0.18, LOVE_BRIDGE_MAIN_MAX_Z + 0.18, lovePierSideMat);

  // Support pilings down into the Han Riverbed beneath both Cá Chép Plaza & Cầu Tình Yêu
  for (let px = 250.0; px <= 343.0; px += 8.5) {
    [-332.2, -325.8].forEach((pz) => {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.30, 3.6, 10), stoneWallMat);
      pile.position.set(px, -2.02, pz);
      staticGroup.add(pile);
    });
  }
  [-342.0, -337.0].forEach((pz) => {
    [250.0, 262.0, 274.0, 283.0].forEach((px) => {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.6, 10), stoneWallMat);
      pile.position.set(px, -2.02, pz);
      staticGroup.add(pile);
    });
  });

  // Helper: Stone Corner Pillar + Ornate Black Wrought-Iron Scrollwork Railing Span
  const addStonePillar = (px: number, pz: number, baseY = 0.0) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.12, 0.42), loveStonePillarMat);
    body.position.set(px, baseY + 0.56, pz);
    staticGroup.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.11, 0.50), loveStoneCapMat);
    cap.position.set(px, baseY + 1.16, pz);
    staticGroup.add(cap);
  };

  const lockColors = [0xfbbf24, 0xf43f5e, 0xec4899, 0x38bdf8, 0xf97316];
  const lockMats = lockColors.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.65 }));

  const addOrnateIronSpan = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    y0 = 0.0,
    y1 = 0.0,
    withLocks = false
  ) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.25) return;
    const segCount = Math.max(1, Math.round(len / 4.2));
    const yaw = Math.atan2(dx, dz);

    for (let s = 0; s < segCount; s++) {
      const tA = s / segCount;
      const tB = (s + 1) / segCount;
      const ax = THREE.MathUtils.lerp(x0, x1, tA);
      const az = THREE.MathUtils.lerp(z0, z1, tA);
      const ay = THREE.MathUtils.lerp(y0, y1, tA);
      const bx = THREE.MathUtils.lerp(x0, x1, tB);
      const bz = THREE.MathUtils.lerp(z0, z1, tB);
      const by = THREE.MathUtils.lerp(y0, y1, tB);
      const segLen = Math.hypot(bx - ax, bz - az);
      const mx = (ax + bx) * 0.5;
      const mz = (az + bz) * 0.5;
      const my = (ay + by) * 0.5;
      const pitch = Math.atan2(by - ay, segLen);

      const panelGrp = new THREE.Group();
      panelGrp.position.set(mx, my + 0.52, mz);
      panelGrp.rotation.order = 'YXZ';
      panelGrp.rotation.y = yaw;
      panelGrp.rotation.x = -pitch;

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(segLen, 0.92), loveScrollMat);
      plane.rotation.y = Math.PI / 2;
      panelGrp.add(plane);

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, segLen), loveIronMat);
      topBar.position.y = 0.45;
      panelGrp.add(topBar);

      const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, segLen), loveIronMat);
      botBar.position.y = -0.44;
      panelGrp.add(botBar);

      if (withLocks) {
        for (let lk = 0; lk < 5; lk++) {
          const lz = ((lk + 0.5) / 5 - 0.5) * (segLen * 0.78);
          const lockMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.09, 0.065),
            lockMats[(s * 5 + lk) % lockMats.length]
          );
          lockMesh.position.set((lk % 2 === 0 ? 1 : -1) * 0.045, 0.16 + ((lk * 17) % 5) * 0.055, lz);
          panelGrp.add(lockMesh);
        }
      }

      staticGroup.add(panelGrp);
      if (s > 0) {
        addStonePillar(ax, az, ay);
      }
    }
    addStonePillar(x0, z0, y0);
    addStonePillar(x1, z1, y1);
  };

  // Perimeter ornate railings + stone pillars framing Widened Cá Chép Plaza (X=248..274) & Cầu Tình Yêu (X=272..346)
  addOrnateIronSpan(248.0, -345.0, 248.0, -325.0, 0.0, 0.0, false);
  addOrnateIronSpan(284.0, -345.0, 284.0, -333.0, 0.0, 0.0, true);
  addOrnateIronSpan(284.0, -333.0, 346.0, -333.0, 0.0, 0.0, true);
  addOrnateIronSpan(346.0, -333.0, 346.0, -325.0, 0.0, 0.0, true);

  // Main South railing segments (Cá Chép Plaza West rail + leaving 3 Marina Boat-Boarding Bays open!)
  addOrnateIronSpan(248.0, -325.0, 272.0, -325.0, 0.0, 0.0, false);
  addOrnateIronSpan(272.0, -325.0, 285.0, -325.0, 0.0, 0.0, true);
  addOrnateIronSpan(297.0, -325.0, 305.0, -325.0, 0.0, 0.0, true);
  addOrnateIronSpan(317.0, -325.0, 325.0, -325.0, 0.0, 0.0, true);
  addOrnateIronSpan(337.0, -325.0, 346.0, -325.0, 0.0, 0.0, true);

  // =========================================================================
  // 4E. TƯỢNG CÁ CHÉP HÓA RỒNG PHUN NƯỚC (X = 259.5, Z = -332.5)
  // Sculpted white marble carp-dragon statue with carved scale relief, cloud scrolls,
  // feathered dragon head, dark ashlar pedestal, warm night uplights & luminous water fountain!
  // =========================================================================
  const carpStoneCanvas = document.createElement('canvas');
  carpStoneCanvas.width = 256;
  carpStoneCanvas.height = 256;
  const csCtx = carpStoneCanvas.getContext('2d')!;
  csCtx.fillStyle = '#3c3632';
  csCtx.fillRect(0, 0, 256, 256);
  const blockShades = ['#4d453f', '#5c5249', '#3f3833', '#695c50', '#463e38'];
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    const offset = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      csCtx.fillStyle = blockShades[(row * 5 + col + 3) % blockShades.length];
      csCtx.fillRect(col * 64 + offset + 2, y + 2, 60, 28);
      csCtx.fillStyle = 'rgba(255,245,230,0.08)';
      csCtx.fillRect(col * 64 + offset + 2, y + 2, 60, 4);
    }
  }
  const carpStoneTex = new THREE.CanvasTexture(carpStoneCanvas);
  carpStoneTex.colorSpace = THREE.SRGBColorSpace;
  carpStoneTex.wrapS = THREE.RepeatWrapping;
  carpStoneTex.wrapT = THREE.RepeatWrapping;
  carpStoneTex.repeat.set(3, 1);

  const carpStonePedestalMat = new THREE.MeshStandardMaterial({
    map: carpStoneTex,
    roughness: 0.84,
    metalness: 0.06,
  });

  // Procedural White Marble & Carved Overlapping Carp Scale Texture + Relief Bump Map
  const carpScaleAlbedoCanvas = document.createElement('canvas');
  carpScaleAlbedoCanvas.width = 256;
  carpScaleAlbedoCanvas.height = 256;
  const csaCtx = carpScaleAlbedoCanvas.getContext('2d')!;
  csaCtx.fillStyle = '#f8fafc';
  csaCtx.fillRect(0, 0, 256, 256);

  const carpScaleBumpCanvas = document.createElement('canvas');
  carpScaleBumpCanvas.width = 256;
  carpScaleBumpCanvas.height = 256;
  const csbCtx = carpScaleBumpCanvas.getContext('2d')!;
  csbCtx.fillStyle = '#808080';
  csbCtx.fillRect(0, 0, 256, 256);

  // Overlapping semi-circular carp scales (8 cols x 10 rows)
  const scCols = 8;
  const scRows = 10;
  const scW = 256 / scCols;
  const scH = 256 / scRows;
  for (let row = -1; row <= scRows; row++) {
    const offX = (row % 2) * (scW * 0.5);
    for (let col = -1; col <= scCols + 1; col++) {
      const cx = col * scW + offX;
      const cy = row * scH;
      const rad = scW * 0.56;

      // Albedo gradient per carved marble scale
      const ag = csaCtx.createRadialGradient(cx, cy - rad * 0.15, rad * 0.1, cx, cy, rad);
      ag.addColorStop(0.0, '#ffffff');
      ag.addColorStop(0.72, '#eef2f6');
      ag.addColorStop(1.0, '#cbd5e1');
      csaCtx.fillStyle = ag;
      csaCtx.beginPath();
      csaCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      csaCtx.fill();
      csaCtx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      csaCtx.lineWidth = 2.0;
      csaCtx.beginPath();
      csaCtx.arc(cx, cy, rad - 1, 0.15, Math.PI - 0.15);
      csaCtx.stroke();

      // Bump height per scale
      const bg = csbCtx.createRadialGradient(cx, cy - rad * 0.2, rad * 0.1, cx, cy, rad);
      bg.addColorStop(0.0, '#f2f2f2');
      bg.addColorStop(0.78, '#b5b5b5');
      bg.addColorStop(1.0, '#383838');
      csbCtx.fillStyle = bg;
      csbCtx.beginPath();
      csbCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      csbCtx.fill();
    }
  }
  const carpScaleAlbedoTex = new THREE.CanvasTexture(carpScaleAlbedoCanvas);
  carpScaleAlbedoTex.colorSpace = THREE.SRGBColorSpace;
  carpScaleAlbedoTex.wrapS = THREE.RepeatWrapping;
  carpScaleAlbedoTex.wrapT = THREE.RepeatWrapping;
  carpScaleAlbedoTex.repeat.set(2.4, 2.4);

  const carpScaleBumpTex = new THREE.CanvasTexture(carpScaleBumpCanvas);
  carpScaleBumpTex.wrapS = THREE.RepeatWrapping;
  carpScaleBumpTex.wrapT = THREE.RepeatWrapping;
  carpScaleBumpTex.repeat.set(2.4, 2.4);

  const carpMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.30,
    metalness: 0.06,
    emissive: 0xffd27a,
    emissiveIntensity: 0.0,
  });
  const carpScaleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    map: carpScaleAlbedoTex,
    bumpMap: carpScaleBumpTex,
    bumpScale: 0.085,
    roughness: 0.34,
    metalness: 0.06,
    emissive: 0xffd27a,
    emissiveIntensity: 0.0,
  });

  const carpPlaqueCanvas = document.createElement('canvas');
  carpPlaqueCanvas.width = 512;
  carpPlaqueCanvas.height = 160;
  const cpCtx = carpPlaqueCanvas.getContext('2d')!;
  cpCtx.clearRect(0, 0, 512, 160);
  cpCtx.textAlign = 'center';
  cpCtx.fillStyle = '#fde047';
  cpCtx.font = 'italic bold 48px Georgia, serif';
  cpCtx.fillText('Cá chép hóa Rồng', 256, 68);
  cpCtx.fillStyle = '#fef08a';
  cpCtx.font = 'bold 26px sans-serif';
  cpCtx.fillText('ĐÀ NẴNG - VIỆT NAM', 256, 118);
  const carpPlaqueTex = new THREE.CanvasTexture(carpPlaqueCanvas);
  carpPlaqueTex.colorSpace = THREE.SRGBColorSpace;
  const carpPlaqueMat = new THREE.MeshStandardMaterial({
    map: carpPlaqueTex,
    transparent: true,
    alphaTest: 0.15,
    roughness: 0.22,
    metalness: 0.68,
    emissive: 0xfbbf24,
    emissiveMap: carpPlaqueTex,
    emissiveIntensity: 0.32,
  });
  neonMats.push(carpPlaqueMat);

  const carpCenterX = 259.5;
  const carpCenterZ = -332.5;
  const carpGroup = new THREE.Group();
  carpGroup.position.set(carpCenterX, 0, carpCenterZ);
  carpGroup.userData.noMerge = true;
  staticGroup.add(carpGroup);

  // Dark granite stepped base plinth, ashlar masonry drum & chamfered upper stone cornice
  const carpStep0 = new THREE.Mesh(new THREE.CylinderGeometry(3.28, 3.48, 0.32, 24), loveStepMat);
  carpStep0.position.y = 0.16;
  carpGroup.add(carpStep0);
  const carpStep1 = new THREE.Mesh(new THREE.CylinderGeometry(2.88, 3.04, 0.24, 24), loveStepMat);
  carpStep1.position.y = 0.44;
  carpGroup.add(carpStep1);
  const carpDrum = new THREE.Mesh(new THREE.CylinderGeometry(2.58, 2.70, 3.02, 28), carpStonePedestalMat);
  carpDrum.position.y = 2.05;
  carpGroup.add(carpDrum);
  const carpDrumCornice = new THREE.Mesh(new THREE.CylinderGeometry(2.74, 2.60, 0.16, 28), loveStepMat);
  carpDrumCornice.position.y = 3.52;
  carpGroup.add(carpDrumCornice);

  // Gold inscription plaques facing Cầu Tình Yêu (+X), Bờ Bắc (-Z) & South-West River (-X/+Z)
  [Math.PI * 0.52, -Math.PI * 0.18, -Math.PI * 0.68].forEach((ang) => {
    const plaque = new THREE.Mesh(
      new THREE.CylinderGeometry(2.69, 2.69, 0.90, 22, 1, true, ang - 0.58, 1.16),
      carpPlaqueMat
    );
    plaque.position.y = 2.40;
    carpGroup.add(plaque);
  });

  // White Marble Beaded Collar & 24 Sculpted Outward-Blooming Lotus Petals (Y = 3.56..4.15)
  const carpCollar = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.14, 12, 32), carpMarbleMat);
  carpCollar.rotation.x = Math.PI / 2;
  carpCollar.position.y = 3.62;
  carpGroup.add(carpCollar);
  for (let b = 0; b < 32; b++) {
    const a = (b / 32) * Math.PI * 2;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), carpMarbleMat);
    bead.position.set(Math.cos(a) * 2.72, 3.60, Math.sin(a) * 2.72);
    carpGroup.add(bead);
  }
  const lotusPetal = new THREE.Shape();
  lotusPetal.moveTo(-0.32, 0);
  lotusPetal.bezierCurveTo(-0.46, 0.24, -0.34, 0.52, 0, 0.72);
  lotusPetal.bezierCurveTo(0.34, 0.52, 0.46, 0.24, 0.32, 0);
  lotusPetal.closePath();
  const carpLotusGeo = new THREE.ExtrudeGeometry(lotusPetal, {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  carpLotusGeo.translate(0, 0, -0.075);
  for (let lp = 0; lp < 22; lp++) {
    const a = (lp / 22) * Math.PI * 2;
    const petalMesh = new THREE.Mesh(carpLotusGeo, carpMarbleMat);
    petalMesh.position.set(Math.sin(a) * 2.58, 3.64, Math.cos(a) * 2.58);
    petalMesh.rotation.order = 'YXZ';
    petalMesh.rotation.y = a;
    petalMesh.rotation.x = 0.28;
    carpGroup.add(petalMesh);
  }
  const carpTopCap = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.60, 0.26, 28), carpMarbleMat);
  carpTopCap.position.y = 4.02;
  carpGroup.add(carpTopCap);

  // Sculpted White Marble Carp-Turning-Dragon Statue facing West-South-West toward Sông Hàn & Cầu Sông Hàn
  const carpFacingYaw = -1.119; // local +Z -> (-0.90 X, +0.436 Z)
  const carpStatueGroup = new THREE.Group();
  carpStatueGroup.position.y = 4.14;
  carpStatueGroup.rotation.y = carpFacingYaw;
  carpGroup.add(carpStatueGroup);

  // Carved Swirling Cloud & Wave Scroll Base (tầng sóng mây cuộn quanh chân cá chép)
  [
    [0, 0.22, 0.42, 1.32, 1.05, 0.56, 1.10],
    [-0.96, 0.24, 0.20, 0.72, 1.0, 0.68, 1.0],
    [0.96, 0.24, 0.20, 0.72, 1.0, 0.68, 1.0],
    [-0.78, 0.30, -0.78, 0.78, 1.0, 0.66, 1.08],
    [0.78, 0.30, -0.78, 0.78, 1.0, 0.66, 1.08],
    [0, 0.34, -1.28, 0.86, 1.1, 0.64, 1.0],
  ].forEach(([cx, cy, cz, cr, sx, sy, sz]) => {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(cr, 14, 12), carpMarbleMat);
    cloud.scale.set(sx, sy, sz);
    cloud.position.set(cx, cy, cz);
    carpStatueGroup.add(cloud);
  });
  [-1, 1].forEach((side) => {
    const waveScroll = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 10, 18, Math.PI * 1.45), carpMarbleMat);
    waveScroll.rotation.y = Math.PI / 2;
    waveScroll.rotation.z = side > 0 ? 0.3 : -0.3;
    waveScroll.position.set(side * 0.92, 0.44, 0.52);
    carpStatueGroup.add(waveScroll);
  });

  // Anatomical S-Curved Carp-Dragon Torso extending seamlessly into Dragon Throat (tapered + UVs for carved scales)
  const carpSpinePts = [
    new THREE.Vector3(0, 0.24, -0.72),
    new THREE.Vector3(0, 0.92, -0.34),
    new THREE.Vector3(0, 1.88, 0.04),
    new THREE.Vector3(0, 2.86, 0.26),
    new THREE.Vector3(0, 3.68, 0.44),
    new THREE.Vector3(0, 4.02, 0.50),
  ];
  const carpSpineCurve = new THREE.CatmullRomCurve3(carpSpinePts);
  const carpRings = 36;
  const carpRadial = 24;
  const carpPos: number[] = [];
  const carpUvs: number[] = [];
  const carpIdx: number[] = [];
  for (let r = 0; r <= carpRings; r++) {
    const t = r / carpRings;
    const pt = carpSpineCurve.getPoint(t);
    const tan = carpSpineCurve.getTangent(t);
    const upRef = new THREE.Vector3(1, 0, 0);
    const binorm = new THREE.Vector3().crossVectors(tan, upRef).normalize();
    const norm = new THREE.Vector3().crossVectors(binorm, tan).normalize();
    const baseRad =
      THREE.MathUtils.lerp(0.98, 0.56, Math.pow(t, 0.88)) *
      (1.0 + 0.14 * Math.sin(t * Math.PI * 0.92));
    for (let s = 0; s <= carpRadial; s++) {
      const u = s / carpRadial;
      const a = u * Math.PI * 2;
      // Slight dorsal ridge crest along -Z (sin(a) < 0) and rounded belly chest along +Z
      const dorsalPinch = Math.sin(a) < -0.5 ? 1.0 + 0.12 * (-Math.sin(a) - 0.5) : 1.0;
      const rx = Math.cos(a) * baseRad * 0.82;
      const rz = Math.sin(a) * baseRad * 1.12 * dorsalPinch;
      const p = pt
        .clone()
        .addScaledVector(norm, rx)
        .addScaledVector(binorm, rz);
      carpPos.push(p.x, p.y, p.z);
      carpUvs.push(u * 2.0, t * 2.2);
    }
  }
  for (let r = 0; r < carpRings; r++) {
    for (let s = 0; s < carpRadial; s++) {
      const a = r * (carpRadial + 1) + s;
      const b = a + carpRadial + 1;
      carpIdx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const carpBodyGeo = new THREE.BufferGeometry();
  carpBodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(carpPos, 3));
  carpBodyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(carpUvs, 2));
  carpBodyGeo.setIndex(carpIdx);
  carpBodyGeo.computeVertexNormals();
  carpStatueGroup.add(new THREE.Mesh(carpBodyGeo, carpScaleMat));

  // Carved Swept Flame-Crest Dorsal Fin Spines following spine tangent
  const dorsalBladeShape = new THREE.Shape();
  dorsalBladeShape.moveTo(0, -0.14);
  dorsalBladeShape.quadraticCurveTo(0.32, -0.10, 0.56, 0.14);
  dorsalBladeShape.quadraticCurveTo(0.24, 0.16, 0, 0.14);
  dorsalBladeShape.closePath();
  const dorsalBladeGeo = new THREE.ExtrudeGeometry(dorsalBladeShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  dorsalBladeGeo.translate(0, 0, -0.06);
  dorsalBladeGeo.rotateY(Math.PI / 2);
  for (let df = 0; df < 12; df++) {
    const t = 0.08 + (df / 11) * 0.82;
    const pt = carpSpineCurve.getPoint(t);
    const blade = new THREE.Mesh(dorsalBladeGeo, carpMarbleMat);
    const rad = THREE.MathUtils.lerp(0.98, 0.58, Math.pow(t, 0.88));
    blade.position.set(0, pt.y + 0.05, pt.z - rad * 0.98);
    blade.rotation.x = 0.25 + t * 0.18;
    blade.scale.setScalar(THREE.MathUtils.lerp(1.12, 0.78, t));
    carpStatueGroup.add(blade);
  }

  // Sweeping Sculpted Double-Volute Lotus Tail at Rear (-Z)
  const tailArcPts = [
    new THREE.Vector3(0, 0.34, -0.74),
    new THREE.Vector3(0, 0.68, -1.42),
    new THREE.Vector3(0, 1.38, -1.82),
  ];
  const tailStem = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailArcPts), 16, 0.42, 12, false),
    carpScaleMat
  );
  carpStatueGroup.add(tailStem);

  const tailFinShape = new THREE.Shape();
  tailFinShape.moveTo(0, 0);
  tailFinShape.bezierCurveTo(-0.62, 0.22, -0.96, 1.05, -0.48, 1.62);
  tailFinShape.quadraticCurveTo(-0.14, 0.92, 0.06, 0.36);
  tailFinShape.bezierCurveTo(0.30, 0.95, 0.88, 1.28, 1.10, 0.86);
  tailFinShape.quadraticCurveTo(0.74, 0.24, 0, 0);
  const tailFinGeo = new THREE.ExtrudeGeometry(tailFinShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  tailFinGeo.translate(0, 0, -0.11);
  tailFinGeo.rotateY(Math.PI / 2);
  const tailFin = new THREE.Mesh(tailFinGeo, carpMarbleMat);
  tailFin.position.set(0, 1.24, -1.78);
  tailFin.rotation.x = 0.28;
  carpStatueGroup.add(tailFin);

  // Fluted relief fin rays + carved spiral cloud volutes on tail
  [-1, 1].forEach((side) => {
    const volute = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.14, 10, 18), carpMarbleMat);
    volute.rotation.y = Math.PI / 2;
    volute.position.set(side * 0.22, 1.18, -1.62);
    carpStatueGroup.add(volute);
    const voluteBoss = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), carpMarbleMat);
    voluteBoss.position.set(side * 0.25, 1.18, -1.62);
    carpStatueGroup.add(voluteBoss);
  });

  // Sculpted Feathered Ribbed Pectoral Wing Fins (curved organic ExtrudeGeometry flush to shoulders)
  const pecFinShape = new THREE.Shape();
  pecFinShape.moveTo(0, 0);
  pecFinShape.bezierCurveTo(0.18, -0.32, 0.56, -0.38, 0.78, -0.14);
  pecFinShape.bezierCurveTo(0.92, 0.06, 0.86, 0.42, 0.62, 0.72);
  pecFinShape.bezierCurveTo(0.42, 0.96, 0.16, 0.82, 0, 0.48);
  pecFinShape.closePath();
  const pecFinGeo = new THREE.ExtrudeGeometry(pecFinShape, {
    depth: 0.11,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  pecFinGeo.translate(0, 0, -0.055);
  pecFinGeo.rotateY(Math.PI / 2);
  [-1, 1].forEach((side) => {
    const pecFin = new THREE.Mesh(pecFinGeo, carpMarbleMat);
    pecFin.position.set(side * 0.68, 2.52, 0.06);
    pecFin.rotation.order = 'YXZ';
    pecFin.rotation.y = side * -0.22;
    pecFin.rotation.z = side * 0.30;
    pecFin.rotation.x = 0.22;
    carpStatueGroup.add(pecFin);
  });

  // Sculpted Seamless Dragon Head at Apex (Zero Boxy Cubes! Y = 3.84..4.92 local -> Y = 7.98..9.06 world)
  const carpHead = new THREE.Group();
  carpHead.position.set(0, 3.88, 0.48);
  carpHead.rotation.x = -0.44; // Roaring proudly skyward ~25 deg
  carpStatueGroup.add(carpHead);

  // Sculpted throat & neck transition bulge so head merges 100% smoothly into body
  const neckBlend = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 14), carpScaleMat);
  neckBlend.scale.set(0.86, 1.05, 1.02);
  neckBlend.position.set(0, -0.08, -0.02);
  carpHead.add(neckBlend);

  // Rounded Cranium Vault & Cheekbones
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 16), carpMarbleMat);
  cranium.scale.set(0.86, 0.74, 1.06);
  cranium.position.set(0, 0.36, 0.08);
  carpHead.add(cranium);

  // Tapered Sculpted Upper Snout & Flared Dragon Muzzle Tip
  const upperSnout = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 14), carpMarbleMat);
  upperSnout.scale.set(0.82, 0.56, 1.24);
  upperSnout.position.set(0, 0.34, 0.72);
  carpHead.add(upperSnout);
  const snoutTip = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), carpMarbleMat);
  snoutTip.scale.set(1.04, 0.78, 0.92);
  snoutTip.position.set(0, 0.44, 1.24);
  carpHead.add(snoutTip);

  // Sculpted Roaring Lower Jaw + Chin Beard Scroll
  const lowerJaw = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), carpMarbleMat);
  lowerJaw.scale.set(0.82, 0.40, 1.18);
  lowerJaw.position.set(0, -0.16, 0.62);
  lowerJaw.rotation.x = 0.34;
  carpHead.add(lowerJaw);

  const chinBeardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.24, 0.96),
    new THREE.Vector3(0, -0.44, 0.72),
    new THREE.Vector3(0, -0.62, 0.38),
  ]);
  carpHead.add(new THREE.Mesh(new THREE.TubeGeometry(chinBeardCurve, 10, 0.11, 8, false), carpMarbleMat));

  // Upper & Lower Carved Marble Fangs inside Open Mouth
  [-0.22, 0.22].forEach((fx) => {
    const upFang = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), carpMarbleMat);
    upFang.position.set(fx, 0.14, 1.18);
    upFang.rotation.x = Math.PI + 0.15;
    carpHead.add(upFang);
    const lowFang = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.19, 8), carpMarbleMat);
    lowFang.position.set(fx * 0.9, -0.12, 1.04);
    lowFang.rotation.x = 0.32;
    carpHead.add(lowFang);
  });

  // Swept Dragon Horns, Flame Brow Crests, Glowing Golden Eyes, Nostrils, Mane & Sinuous Whiskers
  [-1, 1].forEach((side) => {
    // Swept dual-stage curving antler horn
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.28, 0.72, -0.02),
      new THREE.Vector3(side * 0.48, 1.12, -0.58),
      new THREE.Vector3(side * 0.56, 1.32, -1.24),
    ]);
    carpHead.add(new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 14, 0.11, 10, false), carpMarbleMat));
    const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 10), carpMarbleMat);
    hornTip.position.set(side * 0.58, 1.36, -1.40);
    hornTip.rotation.x = -Math.PI * 0.45;
    hornTip.rotation.z = -side * 0.12;
    carpHead.add(hornTip);

    // Secondary swept cheek/ear crest fin
    const earFinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.46, 0.42, -0.18),
      new THREE.Vector3(side * 0.68, 0.56, -0.68),
      new THREE.Vector3(side * 0.72, 0.62, -1.12),
    ]);
    carpHead.add(new THREE.Mesh(new THREE.TubeGeometry(earFinCurve, 10, 0.085, 8, false), carpMarbleMat));

    // Fierce carved brow ridge framing golden eye
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.32, 0.62, 0.68),
      new THREE.Vector3(side * 0.52, 0.68, 0.42),
      new THREE.Vector3(side * 0.56, 0.56, 0.10),
    ]);
    carpHead.add(new THREE.Mesh(new THREE.TubeGeometry(browCurve, 10, 0.095, 8, false), carpMarbleMat));

    // Golden dragon eye orb
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), dragonGoldMat);
    eye.position.set(side * 0.46, 0.52, 0.46);
    carpHead.add(eye);

    // Flared nostril scroll
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), carpMarbleMat);
    nostril.position.set(side * 0.24, 0.56, 1.24);
    carpHead.add(nostril);

    // Sinuous curving dragon whisker sweeping back along cheek
    const whiskerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.36, 0.30, 1.10),
      new THREE.Vector3(side * 0.64, 0.24, 0.68),
      new THREE.Vector3(side * 0.76, 0.10, 0.14),
    ]);
    carpHead.add(new THREE.Mesh(new THREE.TubeGeometry(whiskerCurve, 12, 0.06, 8, false), carpMarbleMat));
  });

  // 4 Architectural LED Uplight Projectors Mounted Around Cá Chép Base + Ground Light Pools + Upward Glow Halos
  const carpUplightLensMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  neonMats.push(carpUplightLensMat);

  const carpUplightHaloTex = getGlowSpriteTexture() ?? createDragonFlameTex();
  const carpUplightHalos: Array<{ sprite: THREE.Sprite; mat: THREE.SpriteMaterial }> = [];
  for (let ul = 0; ul < 4; ul++) {
    const ang = (ul / 4) * Math.PI * 2 + Math.PI * 0.25;
    const ux = Math.cos(ang) * 3.55;
    const uz = Math.sin(ang) * 3.55;

    const projBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.26, 10), darkMetalMat);
    projBase.position.set(ux, 0.13, uz);
    carpGroup.add(projBase);

    const projHead = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.28, 12), darkMetalMat);
    projHead.position.set(ux, 0.32, uz);
    projHead.lookAt(carpCenterX, 4.5, carpCenterZ);
    projHead.rotateX(Math.PI / 2);
    carpGroup.add(projHead);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), carpUplightLensMat);
    lens.position.set(ux * 0.94, 0.38, uz * 0.94);
    lens.lookAt(carpCenterX, 5.2, carpCenterZ);
    carpGroup.add(lens);

    const haloMat = new THREE.SpriteMaterial({
      map: carpUplightHaloTex,
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const haloSp = new THREE.Sprite(haloMat);
    haloSp.position.set(ux * 0.85, 2.2, uz * 0.85);
    haloSp.scale.set(4.2, 5.6, 1);
    carpGroup.add(haloSp);
    carpUplightHalos.push({ sprite: haloSp, mat: haloMat });

    const gPool = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), sharedPoolMat);
    gPool.rotation.x = -Math.PI / 2;
    gPool.position.set(ux * 1.15, 0.025, uz * 1.15);
    carpGroup.add(gPool);
  }

  // Warm Golden Aura Halos Wrapping the Cá Chép Statue Upper Torso & Dragon Head at Night
  [
    [0, 5.8, 0.2, 6.2],
    [0, 8.2, 0.6, 5.4],
  ].forEach(([hx, hy, hz, hScale]) => {
    const statueGlowMat = new THREE.SpriteMaterial({
      map: carpUplightHaloTex,
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const statueGlowSp = new THREE.Sprite(statueGlowMat);
    statueGlowSp.position.set(hx, hy, hz);
    statueGlowSp.scale.set(hScale, hScale, 1);
    carpGroup.add(statueGlowSp);
    carpUplightHalos.push({ sprite: statueGlowSp, mat: statueGlowMat });
  });

  // 4 Perimeter Decorative Stone Bollard Lanterns Lighting the Widened Cá Chép Waterfront Plaza
  [
    [249.6, -326.8],
    [249.6, -339.5],
    [269.8, -340.5],
    [269.8, -326.8],
  ].forEach(([lx, lz]) => {
    addRiversideLamp(lx, lz);
  });

  // Landscaped Granite Shrub Beds flanking West Plaza North Edge
  const carpPlanterLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  addBox(249.2, 257.0, 0.0, 0.42, -344.2, -341.8, loveStepMat);
  for (let sx = 250.2; sx <= 256.2; sx += 1.4) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.68, 9, 8), carpPlanterLeafMat);
    shrub.scale.set(1.15, 0.82, 1.0);
    shrub.position.set(sx, 0.74, -343.0);
    staticGroup.add(shrub);
  }

  // Continuous Luminous Parabolic Water Fountain Veil + Fine Mist Sprites + River Splash (Day & Night!)
  const carpMouthWorld = new THREE.Vector3(
    carpCenterX + Math.sin(carpFacingYaw) * 1.38,
    8.12,
    carpCenterZ + Math.cos(carpFacingYaw) * 1.38
  );
  const carpSplashWorld = new THREE.Vector3(241.0, HAN_RIVER_WATER_Y + 0.06, -323.5);
  const getCarpWaterArcPoint = (u: number, out: THREE.Vector3): THREE.Vector3 => {
    out.lerpVectors(carpMouthWorld, carpSplashWorld, u);
    out.y += Math.sin(u * Math.PI) * 3.95;
    return out;
  };

  // Animated flowing water-streak texture so the fountain tube looks like continuous rushing spray
  const carpJetCanvas = document.createElement('canvas');
  carpJetCanvas.width = 256;
  carpJetCanvas.height = 64;
  const cjc = carpJetCanvas.getContext('2d')!;
  cjc.clearRect(0, 0, 256, 64);
  for (let st = 0; st < 28; st++) {
    const sx = (st * 23) % 256;
    const sy = ((st * 19) % 52) + 6;
    const sw = 24 + (st % 5) * 14;
    const sg = cjc.createLinearGradient(sx, 0, sx + sw, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.45, 'rgba(255,255,255,0.88)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    cjc.fillStyle = sg;
    cjc.fillRect(sx, sy - 2, sw, 4);
  }
  const carpStreamTex = new THREE.CanvasTexture(carpJetCanvas);
  carpStreamTex.wrapS = THREE.RepeatWrapping;
  carpStreamTex.wrapT = THREE.RepeatWrapping;
  carpStreamTex.repeat.set(3.5, 1);

  // Tapered variable-radius parabolic water plume mesh (tight 0.09m jet at mouth fanning gracefully to 0.58m mist)
  const arcSteps = 32;
  const arcRadial = 14;
  const arcCurvePts: THREE.Vector3[] = [];
  for (let i = 0; i <= arcSteps; i++) {
    arcCurvePts.push(getCarpWaterArcPoint(i / arcSteps, new THREE.Vector3()));
  }
  const arcCurve = new THREE.CatmullRomCurve3(arcCurvePts);
  const arcPos: number[] = [];
  const arcUv: number[] = [];
  const arcIdx: number[] = [];
  const _arcUp = new THREE.Vector3(0, 1, 0);
  const _arcSide = new THREE.Vector3();
  const _arcNorm = new THREE.Vector3();
  for (let i = 0; i <= arcSteps; i++) {
    const u = i / arcSteps;
    const pt = arcCurve.getPoint(u);
    const tan = arcCurve.getTangent(u);
    _arcSide.crossVectors(tan, _arcUp).normalize();
    _arcNorm.crossVectors(_arcSide, tan).normalize();
    const rad = THREE.MathUtils.lerp(0.09, 0.58, Math.pow(u, 0.85));
    for (let s = 0; s <= arcRadial; s++) {
      const v = s / arcRadial;
      const a = v * Math.PI * 2;
      const px = pt.x + (_arcSide.x * Math.cos(a) * 0.72 + _arcNorm.x * Math.sin(a) * 1.18) * rad;
      const py = pt.y + (_arcSide.y * Math.cos(a) * 0.72 + _arcNorm.y * Math.sin(a) * 1.18) * rad;
      const pz = pt.z + (_arcSide.z * Math.cos(a) * 0.72 + _arcNorm.z * Math.sin(a) * 1.18) * rad;
      arcPos.push(px, py, pz);
      arcUv.push(u, v);
    }
  }
  for (let i = 0; i < arcSteps; i++) {
    for (let s = 0; s < arcRadial; s++) {
      const a = i * (arcRadial + 1) + s;
      const b = a + arcRadial + 1;
      arcIdx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const carpWaterArcGeo = new THREE.BufferGeometry();
  carpWaterArcGeo.setAttribute('position', new THREE.Float32BufferAttribute(arcPos, 3));
  carpWaterArcGeo.setAttribute('uv', new THREE.Float32BufferAttribute(arcUv, 2));
  carpWaterArcGeo.setIndex(arcIdx);
  carpWaterArcGeo.computeVertexNormals();

  const carpWaterArcMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    map: carpStreamTex,
    emissive: 0xf472b6,
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.58,
    roughness: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const carpWaterArcMesh = new THREE.Mesh(carpWaterArcGeo, carpWaterArcMat);
  carpWaterArcMesh.userData.noMerge = true;
  staticGroup.add(carpWaterArcMesh);

  // Bright inner core jet so fountain stream stays crisp and continuous from mouth to splash
  const carpWaterCoreMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const carpWaterCoreMesh = new THREE.Mesh(
    new THREE.TubeGeometry(arcCurve, 28, 0.085, 8, false),
    carpWaterCoreMat
  );
  carpWaterCoreMesh.userData.noMerge = true;
  staticGroup.add(carpWaterCoreMesh);

  const carpJetTex = getSoftSmokeTexture() ?? getGlowSpriteTexture() ?? createDragonFlameTex();
  const carpJetDrops: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phase: number;
    jitterX: number;
    jitterZ: number;
    scale: number;
  }> = [];
  for (let j = 0; j < 48; j++) {
    const jMat = new THREE.SpriteMaterial({
      map: carpJetTex,
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const jSp = new THREE.Sprite(jMat);
    jSp.userData.noMerge = true;
    staticGroup.add(jSp);
    carpJetDrops.push({
      sprite: jSp,
      mat: jMat,
      phase: j / 48,
      jitterX: Math.sin(j * 2.3) * 0.34,
      jitterZ: Math.cos(j * 1.9) * 0.34,
      scale: 0.34 + (j % 4) * 0.11,
    });
  }

  const carpSplashRings: Array<{ sprite: THREE.Sprite; mat: THREE.SpriteMaterial; phase: number }> = [];
  for (let sp = 0; sp < 14; sp++) {
    const sMat = new THREE.SpriteMaterial({
      map: carpJetTex,
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sSp = new THREE.Sprite(sMat);
    sSp.userData.noMerge = true;
    staticGroup.add(sSp);
    carpSplashRings.push({ sprite: sSp, mat: sMat, phase: sp / 14 });
  }
  const carpArcPos = new THREE.Vector3();

  // 3 Stepped Marina Boat-Boarding Bays (Bến Du Thuyền), open center gates (3.6m wide), gangways & lifebuoys
  const marinaBays: ReadonlyArray<{ x0: number; x1: number }> = [
    { x0: 285.0, x1: 297.0 },
    { x0: 305.0, x1: 317.0 },
    { x0: 325.0, x1: 337.0 },
  ];
  const createGangwayBridge = () => {
    const gw = new THREE.Group();
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 2.35), woodDeckMat);
    plank.position.set(0, 0.04, 1.15);
    gw.add(plank);
    [-0.76, 0.76].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.35), marbleWhiteMat);
      rail.position.set(rx, 0.86, 1.15);
      gw.add(rail);
      [0.15, 1.15, 2.15].forEach((rz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.84, 6), marbleWhiteMat);
        post.position.set(rx, 0.44, rz);
        gw.add(post);
      });
    });
    return gw;
  };
  const bayGangwayPivots: Array<THREE.Group | null> = [null, null, null];

  marinaBays.forEach(({ x0: bx0, x1: bx1 }, bayIdx) => {
    const bxMid = (bx0 + bx1) * 0.5;
    const gateLeftX = bxMid - 1.8;
    const gateRightX = bxMid + 1.8;

    // 5 dark granite descending stair treads (Z = -325.0 .. -323.8, Y = 0.0 .. -0.72)
    for (let st = 0; st < 5; st++) {
      const sz0 = -325.0 + st * 0.24;
      const sz1 = sz0 + 0.26;
      const sy = -0.144 * (st + 1);
      addBox(bx0, bx1, sy - 0.18, sy, sz0, sz1, loveStepMat);
    }
    // Lower boat-boarding platform (Y = -0.72) & concrete quay apron into river
    addBox(bx0, bx1, -0.92, -0.72, -323.8, -321.5, lovePierDeckMat);
    addBox(bx0 - 0.15, bx1 + 0.15, -2.25, -0.73, -324.82, -321.45, lovePierSideMat);

    // Side & split riverfront wrought-iron railings framing a 3.6m OPEN boarding gate in the center!
    addOrnateIronSpan(bx0, -325.0, bx0, -323.8, 0.0, -0.72, false);
    addOrnateIronSpan(bx1, -325.0, bx1, -323.8, 0.0, -0.72, false);
    addOrnateIronSpan(bx0, -323.8, bx0, -321.5, -0.72, -0.72, false);
    addOrnateIronSpan(bx1, -323.8, bx1, -321.5, -0.72, -0.72, false);
    addOrnateIronSpan(bx0, -321.5, gateLeftX, -321.5, -0.72, -0.72, false);
    addOrnateIronSpan(gateRightX, -321.5, bx1, -321.5, -0.72, -0.72, false);

    // Subtle open-gate warm lantern finials atop gateposts so boarding doorway reads clearly day & night
    [gateLeftX, gateRightX].forEach((gx) => {
      const lampTop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), warmLanternMat);
      lampTop.position.set(gx, 0.56, -321.5);
      staticGroup.add(lampTop);
    });

    // Animated retractable teak-and-stainless boarding gangway extending through each open bay gate
    const gw = createGangwayBridge();
    gw.position.set(bxMid, -0.72, -321.55);
    gw.rotation.x = -0.18;
    gw.userData.noMerge = true;
    staticGroup.add(gw);
    bayGangwayPivots[bayIdx] = gw;

    // 4 vertical black rubber marine fenders mounted along the river face (skipping open center gate!)
    [bx0 + 1.0, gateLeftX - 0.55, gateRightX + 0.55, bx1 - 1.0].forEach((fx) => {
      const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 1.35, 10), loveStepMat);
      fender.position.set(fx, -1.05, -321.32);
      staticGroup.add(fender);
    });

    // Orange safety lifebuoy ring mounted on bay side post
    const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 18), loveLifebuoyMat);
    buoy.position.set(bx0 + 0.25, 0.56, -324.85);
    buoy.rotation.y = Math.PI / 2;
    staticGroup.add(buoy);
  });

  // 6 Iconic Glowing Red Heart Lantern Trees (Cây Đèn Lồng Trái Tim Đỏ) along Cầu Tình Yêu!
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.14);
  heartShape.bezierCurveTo(0.06, -0.05, 0.16, 0.02, 0.16, 0.10);
  heartShape.bezierCurveTo(0.16, 0.18, 0.06, 0.20, 0, 0.12);
  heartShape.bezierCurveTo(-0.06, 0.20, -0.16, 0.18, -0.16, 0.10);
  heartShape.bezierCurveTo(-0.16, 0.02, -0.06, -0.05, 0, -0.14);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
    depth: 0.10,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  heartGeo.center();

  const heartTreeXs = [279.0, 292.0, 305.0, 318.0, 331.0, 342.5];
  const heartArmTiers: ReadonlyArray<{ y: number; reach: number }> = [
    { y: 2.55, reach: 0.34 },
    { y: 3.00, reach: 0.68 },
    { y: 3.46, reach: 1.04 },
    { y: 3.92, reach: 1.32 },
    { y: 4.38, reach: 1.10 },
  ];
  heartTreeXs.forEach((hx) => {
    const hz = -329.2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 5.1, 8), loveIronMat);
    pole.position.set(hx, 2.55, hz);
    staticGroup.add(pole);

    const basePed = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.35, 10), loveIronMat);
    basePed.position.set(hx, 0.175, hz);
    staticGroup.add(basePed);

    const topFinial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), loveIronMat);
    topFinial.position.set(hx, 5.15, hz);
    staticGroup.add(topFinial);

    heartArmTiers.forEach((tier, tIdx) => {
      // Crossed horizontal iron arms along X and Z so the heart cluster looks full from every angle
      const armX = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, tier.reach * 2, 6), loveIronMat);
      armX.rotation.z = Math.PI / 2;
      armX.position.set(hx, tier.y, hz);
      staticGroup.add(armX);

      const armZ = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, tier.reach * 1.4, 6), loveIronMat);
      armZ.rotation.x = Math.PI / 2;
      armZ.position.set(hx, tier.y, hz);
      staticGroup.add(armZ);

      const slots = tIdx === 0 ? [-1, 1] : [-1, -0.5, 0.5, 1];
      slots.forEach((f) => {
        const lanternX = new THREE.Mesh(heartGeo, loveHeartLanternMat);
        lanternX.position.set(hx + f * tier.reach, tier.y - 0.19, hz);
        staticGroup.add(lanternX);

        if (Math.abs(f) > 0.6) {
          const lanternZ = new THREE.Mesh(heartGeo, loveHeartLanternMat);
          lanternZ.position.set(hx, tier.y - 0.19, hz + Math.sign(f) * tier.reach * 0.65);
          lanternZ.rotation.y = Math.PI / 2;
          staticGroup.add(lanternZ);
        }
      });
    });

    // Bottom apex heart lantern
    const apexHeart = new THREE.Mesh(heartGeo, loveHeartLanternMat);
    apexHeart.position.set(hx, 2.08, hz);
    staticGroup.add(apexHeart);
  });

  // Helper to spawn crisp Quaternius GLB NPCs (with fallback avatar) standing on yacht decks or boarding via marina gates
  const yachtWarmGlowMats: THREE.MeshStandardMaterial[] = [];
  const yachtWaterGlowMats: THREE.MeshStandardMaterial[] = [];
  const yachtNightHaloMats: THREE.MeshBasicMaterial[] = [];

  const registerYachtLighting = (handle: BuiltYachtHandle) => {
    yachtWarmGlowMats.push(...handle.warmGlowMats);
    yachtWaterGlowMats.push(...handle.waterGlowMats);
    yachtNightHaloMats.push(...handle.nightHaloMats);
  };

  interface YachtHumanActor {
    grp: THREE.Group;
    armL: THREE.Group;
    armR: THREE.Group;
    legL: THREE.Group;
    legR: THREE.Group;
    glbHandle: GlbHumanHandle;
    animState: 'Walk' | 'Idle';
    phase: number;
  }

  const createYachtHumanActor = (
    seed: number,
    initialState: 'Walk' | 'Idle',
    shirtColor: number,
    pantsColor: number
  ): YachtHumanActor => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;

    const fallbackGrp = new THREE.Group();
    grp.add(fallbackGrp);

    const sMat = new THREE.MeshStandardMaterial({ color: '#fbd3b4', roughness: 0.7 });
    const cMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.65 });
    const pMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
    const hMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), cMat);
    torso.position.y = 1.04;
    fallbackGrp.add(torso);
    const head = helpers.createHeadMesh(sMat, helpers.createFaceTexture('happy', '#fbd3b4'), 0.28, 0.28, 0.28);
    head.position.y = 1.48;
    fallbackGrp.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hMat);
    hair.position.y = 1.61;
    fallbackGrp.add(hair);

    const makeLimb = (x: number, y: number, w: number, h: number, m: THREE.Material) => {
      const piv = new THREE.Group();
      piv.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m);
      mesh.position.y = -h * 0.45;
      piv.add(mesh);
      fallbackGrp.add(piv);
      return piv;
    };
    const armL = makeLimb(-0.29, 1.26, 0.13, 0.44, cMat);
    const armR = makeLimb(0.29, 1.26, 0.13, 0.44, cMat);
    const legL = makeLimb(-0.11, 0.76, 0.16, 0.68, pMat);
    const legR = makeLimb(0.11, 0.76, 0.16, 0.68, pMat);

    const spec = pickOutsideNpcModel(seed);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: spec.modelSource,
      hostGroup: grp,
      fallbackMeshes: [fallbackGrp],
      targetHeight: spec.targetHeight,
      clipProfile: spec.clipProfile,
      rotationY: spec.rotationY,
      initialState,
      phaseOffset: (seed % 11) * 0.43,
    });

    return { grp, armL, armR, legL, legR, glbHandle, animState: initialState, phase: seed * 0.7 };
  };

  const setYachtHumanAnim = (actor: YachtHumanActor, next: 'Walk' | 'Idle') => {
    if (actor.animState === next) return;
    actor.animState = next;
    actor.glbHandle.setAnimState(next, next === 'Walk' ? 1.05 : 1.0);
    if (next === 'Idle') {
      actor.armL.rotation.set(0, 0, 0);
      actor.armR.rotation.set(0, 0, 0);
      actor.legL.rotation.set(0, 0, 0);
      actor.legR.rotation.set(0, 0, 0);
    }
  };

  const attachDeckGuests = (
    yachtGroup: THREE.Group,
    style: YachtStyle,
    seedBase: number,
    count: number
  ) => {
    const slots: ReadonlyArray<{ x: number; y: number; z: number; yaw: number; shirt: number; pants: number }> =
      style === 'catamaran'
        ? [
            { x: -1.15, y: 1.27, z: 5.55, yaw: 0.25, shirt: 0xf43f5e, pants: 0xf8fafc },
            { x: 1.05, y: 1.27, z: 5.25, yaw: -0.35, shirt: 0x0ea5e9, pants: 0x1e293b },
            { x: -0.65, y: 2.55, z: -2.45, yaw: -2.6, shirt: 0xfbbf24, pants: 0x334155 },
            { x: 0.75, y: 1.24, z: -4.15, yaw: 2.8, shirt: 0x10b981, pants: 0xf1f5f9 },
          ]
        : [
            { x: -0.92, y: 1.44, z: 3.10, yaw: 0.3, shirt: 0x38bdf8, pants: 0x0f172a },
            { x: 0.92, y: 1.44, z: 3.10, yaw: -0.3, shirt: 0xfb7185, pants: 0xf8fafc },
            { x: -0.35, y: 2.73, z: -0.45, yaw: 0.15, shirt: 0xfde047, pants: 0x1e293b },
            { x: 0.45, y: 1.27, z: -4.55, yaw: 2.9, shirt: 0x2dd4bf, pants: 0x334155 },
          ];
    for (let i = 0; i < Math.min(count, slots.length); i++) {
      const s = slots[i];
      const actor = createYachtHumanActor(seedBase + i * 7, 'Idle', s.shirt, s.pants);
      actor.grp.position.set(s.x, s.y, s.z);
      actor.grp.rotation.y = s.yaw;
      yachtGroup.add(actor.grp);
    }
  };

  // =========================================================================
  // 4A & 4B. ALL 3 MARINA LIVE NPC EXCURSION YACHTS (Bays 1, 2, 3: Bến -> Sông Hàn -> Bến)
  // Every bay yacht boards NPCs through its open gate, retracts gangway, and cruises Sông Hàn!
  // =========================================================================
  type ExcursionState = 'docked_boarding' | 'cruising' | 'docked_disembarking';
  interface ExcursionPed {
    actor: YachtHumanActor;
    mode: 'pier_wait' | 'walking_board' | 'on_board' | 'walking_disembark';
    wpIdx: number;
    boardSlot: { x: number; y: number; z: number; yaw: number };
    pierHome: { x: number; z: number; yaw: number };
  }
  interface MarinaExcursionUnit {
    bayIdx: number;
    bayX: number;
    boat: THREE.Group;
    handle: BuiltYachtHandle;
    gangwayPivot: THREE.Group | null;
    cruisePath: ReadonlyArray<{ x: number; z: number }>;
    state: ExcursionState;
    timer: number;
    boardTimeout: number;
    wpIdx: number;
    x: number;
    z: number;
    yaw: number;
    gangwayTilt: number;
    phase: number;
    peds: ExcursionPed[];
  }

  const getExcursionPierWalkY = (z: number): number => {
    if (z <= -325.0) return 0.0;
    if (z <= -323.8) return -0.72 * ((z + 325.0) / 1.2);
    if (z <= -321.55) return -0.72;
    const t = THREE.MathUtils.clamp((z + 321.55) / 2.05, 0, 1);
    return THREE.MathUtils.lerp(-0.72, -0.24, t);
  };

  const excursionConfigs: ReadonlyArray<{
    bayIdx: number;
    bayX: number;
    style: YachtStyle;
    accentColor: number;
    seedBase: number;
    phase: number;
    initialTimer: number;
    boardTimeout: number;
    pedCount: number;
  }> = [
    { bayIdx: 0, bayX: 291.0, style: 'catamaran', accentColor: 0x0ea5e9, seedBase: 260, phase: 0.0, initialTimer: 6.0, boardTimeout: 12.0, pedCount: 4 },
    { bayIdx: 1, bayX: 311.0, style: 'catamaran', accentColor: 0x06b6d4, seedBase: 320, phase: 0.9, initialTimer: 0.0, boardTimeout: 14.5, pedCount: 5 },
    { bayIdx: 2, bayX: 331.0, style: 'flybridge_superyacht', accentColor: 0x38bdf8, seedBase: 375, phase: 1.7, initialTimer: 9.5, boardTimeout: 11.5, pedCount: 4 },
  ];

  const excursionColors = [
    { shirt: 0xf43f5e, pants: 0xf8fafc },
    { shirt: 0x0ea5e9, pants: 0x0f172a },
    { shirt: 0xfbbf24, pants: 0x334155 },
    { shirt: 0x10b981, pants: 0xf1f5f9 },
    { shirt: 0xa855f7, pants: 0x1e293b },
  ];

  const marinaExcursions: MarinaExcursionUnit[] = excursionConfigs.map((cfg) => {
    const handle = buildLuxuryYachtMesh({
      style: cfg.style,
      accentColor: cfg.accentColor,
      scale: 0.96,
      showWake: true,
    });
    const boat = handle.group;
    boat.position.set(cfg.bayX, HAN_RIVER_WATER_Y + 0.05, -317.8);
    boat.rotation.y = Math.PI / 2;
    boat.userData.noMerge = true;
    staticGroup.add(boat);
    registerYachtLighting(handle);

    // One-way Grand Sông Hàn Scenic Oval (Outbound Z=-292.5 East -> Return Z=-269.0 West -> Approach Z=-301.5 East)
    // Clears every bridge pier across Cầu Sông Hàn, Cầu Rồng & Cầu Trần Thị Lý with zero crossing conflicts!
    const cruisePath: ReadonlyArray<{ x: number; z: number }> = [
      { x: cfg.bayX, z: -317.8 },         // 0: Docked beside bay open gate
      { x: cfg.bayX + 9.0, z: -306.5 },   // 1: Ease South-East clear of pier
      { x: cfg.bayX + 24.0, z: -292.5 },  // 2: Enter Eastbound lane (-292.5)
      { x: 435.0, z: -292.5 },            // 3: Sail East under Cầu Rồng
      { x: 534.0, z: -292.5 },            // 4: Pass under Cầu Trần Thị Lý
      { x: 549.0, z: -280.0 },            // 5: East turning basin
      { x: 534.0, z: -269.0 },            // 6: Align Westbound on South scenic lane (-269.0)
      { x: 350.0, z: -269.0 },            // 7: Glide past Cầu Rồng head & Dragon Bridge
      { x: 190.0, z: -269.0 },            // 8: Glide past Viewing Pier & Cầu Sông Hàn
      { x: 132.0, z: -269.0 },            // 9: Reach West basin
      { x: 117.0, z: -285.0 },            // 10: West turning basin
      { x: 132.0, z: -301.5 },            // 11: Align Eastbound on North approach lane (-301.5)
      { x: cfg.bayX - 15.0, z: -301.5 },  // 12: Approach assigned bay
      { x: cfg.bayX - 7.0, z: -309.5 },   // 13: Turn into bay berth
      { x: cfg.bayX, z: -317.8 },         // 14: Docked flush beside bay gate
    ];

    const slotTable: ReadonlyArray<{ x: number; y: number; z: number; yaw: number }> =
      cfg.style === 'catamaran'
        ? [
            { x: -1.18, y: 1.27, z: 5.55, yaw: 0.25 },
            { x: 1.10, y: 1.27, z: 5.45, yaw: -0.25 },
            { x: -0.65, y: 2.55, z: -2.25, yaw: -2.8 },
            { x: 0.72, y: 1.27, z: 3.15, yaw: -0.35 },
            { x: -0.75, y: 1.24, z: -4.05, yaw: 2.85 },
          ]
        : [
            { x: -0.92, y: 1.44, z: 3.10, yaw: 0.3 },
            { x: 0.92, y: 1.44, z: 3.10, yaw: -0.3 },
            { x: -0.35, y: 2.73, z: -0.45, yaw: 0.15 },
            { x: 0.45, y: 1.27, z: -4.55, yaw: 2.9 },
          ];

    const peds: ExcursionPed[] = Array.from({ length: cfg.pedCount }, (_, i) => {
      const slot = slotTable[i % slotTable.length];
      const c = excursionColors[(i + cfg.bayIdx) % excursionColors.length];
      const home = {
        x: cfg.bayX + (i - (cfg.pedCount - 1) * 0.5) * 1.25,
        z: -326.8 - (i % 2) * 0.9,
        yaw: (i % 2 === 0 ? 0.15 : -0.15),
      };
      // Stagger initial positions so Bay 1 & Bay 3 already have NPCs boarding right away!
      const alreadyOnBoard = cfg.bayIdx === 2 && i < 2;
      const actor = createYachtHumanActor(cfg.seedBase + i * 11, alreadyOnBoard ? 'Idle' : 'Walk', c.shirt, c.pants);
      if (alreadyOnBoard) {
        boat.add(actor.grp);
        actor.grp.position.set(slot.x, slot.y, slot.z);
        actor.grp.rotation.y = slot.yaw;
      } else {
        const startZ =
          i === 0
            ? -322.2
            : i === 1
              ? -324.0
              : i === 2 && cfg.bayIdx !== 1
                ? -322.8
                : home.z;
        const startX = i < 2 || (i === 2 && cfg.bayIdx !== 1) ? cfg.bayX : home.x;
        actor.grp.position.set(startX, getExcursionPierWalkY(startZ), startZ);
        staticGroup.add(actor.grp);
      }
      return {
        actor,
        mode: alreadyOnBoard ? 'on_board' : 'walking_board',
        wpIdx: alreadyOnBoard ? 0 : i < 2 ? 2 : 0,
        boardSlot: slot,
        pierHome: home,
      };
    });

    return {
      bayIdx: cfg.bayIdx,
      bayX: cfg.bayX,
      boat,
      handle,
      gangwayPivot: bayGangwayPivots[cfg.bayIdx] ?? null,
      cruisePath,
      state: 'docked_boarding',
      timer: cfg.initialTimer,
      boardTimeout: cfg.boardTimeout,
      wpIdx: 1,
      x: cfg.bayX,
      z: -317.8,
      yaw: Math.PI / 2,
      gangwayTilt: -0.18,
      phase: cfg.phase,
      peds,
    };
  });

  // =========================================================================
  // 5. ANIMATED HAN RIVER CRUISE YACHTS (9 DU THUYỀN CHẠY NGOÀI SÔNG HÀN)
  // Distributed across 4 pier-free channels (Z = -179, -190, -214, -225) with on-deck NPCs & night lighting!
  // =========================================================================
  const cruiseBoats: Array<{
    grp: THREE.Group;
    handle: BuiltYachtHandle;
    dir: 1 | -1;
    x: number;
    z: number;
    speed: number;
    phase: number;
  }> = [];
  const buildCruiseBoat = (
    bx: number,
    bz: number,
    dir: 1 | -1,
    style: YachtStyle,
    accentColor: number,
    speed: number,
    phase: number,
    seedBase: number
  ) => {
    const handle = buildLuxuryYachtMesh({
      style,
      accentColor,
      scale: 1.15,
      showWake: true,
    });
    const boat = handle.group;
    boat.position.set(bx, HAN_RIVER_WATER_Y + 0.05, bz);
    boat.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    boat.userData.noMerge = true;

    attachDeckGuests(boat, style, seedBase, 3);
    staticGroup.add(boat);
    registerYachtLighting(handle);
    cruiseBoats.push({
      grp: boat,
      handle,
      dir,
      x: bx,
      z: bz,
      speed,
      phase,
    });
  };
  // Lane 1 (Z = -179.0, Eastbound, same speed so never catch up)
  buildCruiseBoat(155.0, -179.0, 1, 'flybridge_superyacht', 0x38bdf8, 3.8, 0.4, 410);
  buildCruiseBoat(-165.0, -179.0, 1, 'catamaran', 0x22d3ee, 3.8, 1.3, 440);
  buildCruiseBoat(445.0, -179.0, 1, 'flybridge_superyacht', 0xf59e0b, 3.8, 2.5, 590);
  // Lane 2 (Z = -190.0, Westbound, same speed so never catch up)
  buildCruiseBoat(275.0, -190.0, -1, 'flybridge_superyacht', 0xf472b6, 3.4, 2.2, 470);
  buildCruiseBoat(-45.0, -190.0, -1, 'catamaran', 0xfbbf24, 3.4, 3.1, 500);
  // Lane 3 (Z = -214.0, Eastbound, same speed so never catch up)
  buildCruiseBoat(42.0, -214.0, 1, 'catamaran', 0x0ea5e9, 3.5, 0.9, 530);
  buildCruiseBoat(-245.0, -214.0, 1, 'flybridge_superyacht', 0xa855f7, 3.5, 1.8, 620);
  // Lane 4 (Z = -225.0, Westbound, same speed so never catch up)
  buildCruiseBoat(415.0, -225.0, -1, 'flybridge_superyacht', 0x34d399, 3.6, 2.7, 560);
  buildCruiseBoat(115.0, -225.0, -1, 'catamaran', 0x06b6d4, 3.6, 0.7, 650);

  // =========================================================================
  // 6. CROSS-RIVER NPC TRAFFIC FLEET (CARS + MOTORBIKES CROSSING CẦU SÔNG HÀN & NGÃ 4 BỜ BẮC)
  // =========================================================================
  let southEwPhase: 'green' | 'yellow' | 'red' = 'green';
  let southNsPhase: 'green' | 'yellow' | 'red' = 'red';
  let northEwPhase: 'green' | 'yellow' | 'red' = 'green';
  let northNsPhase: 'green' | 'yellow' | 'red' = 'red';

  type RiverVehicleMode = 'bd_ew' | 'bridge_ns' | 'nb_ew' | 'nb_north_leg' | 'turn_curve';
  interface RiverNpcVehicle {
    id: string;
    kind: 'car' | 'motorbike';
    grp: THREE.Group;
    wheels: THREE.Object3D[];
    wheelR: number;
    halfW: number;
    halfL: number;
    priority: number;
    cruiseSpeed: number;
    speed: number;
    x: number;
    y: number;
    z: number;
    yaw: number;
    mode: RiverVehicleMode;
    dirX: 1 | -1;
    dirZ: 1 | -1;
    laneCoord: number;
    routeCounter: number;
    branchCooldown: number;
    // Curve interpolation state
    turnStartX: number;
    turnStartZ: number;
    turnCtrlX: number;
    turnCtrlZ: number;
    turnEndX: number;
    turnEndZ: number;
    turnT: number;
    turnDuration: number;
    turnNextMode: RiverVehicleMode;
    turnNextDirX: 1 | -1;
    turnNextDirZ: 1 | -1;
    turnNextLane: number;
    bridgeCenterX: number;
    headMat: THREE.MeshStandardMaterial;
    brakeMat: THREE.MeshStandardMaterial;
  }

  const carVariants: CityCarVariant[] = ['sedan', 'suv', 'coupe', 'hatchback'];
  const jacketPalette = [0x1e293b, 0x0f766e, 0x334155, 0x7c2d12, 0x312e81];
  const helmetPalette = [0xf8fafc, 0xef4444, 0x0284c7, 0xfacc15, 0x22c55e];

  const createNpcCarMesh = (
    color: number,
    isTaxi = false,
    variant: CityCarVariant = 'sedan',
    taxiIdx = 0
  ): {
    grp: THREE.Group;
    wheels: THREE.Object3D[];
    headMat: THREE.MeshStandardMaterial;
    brakeMat: THREE.MeshStandardMaterial;
    wheelR: number;
    halfW: number;
    halfL: number;
  } => {
    if (isTaxi) {
      const built = buildAmbientXanhSmTaxiCar(
        taxiIdx % 2 === 0 ? 'vfe34' : 'vf5',
        `43H-886.${String(21 + (taxiIdx % 70)).padStart(2, '0')}`,
        taxiIdx % 3 !== 2
      );
      return {
        grp: built.group,
        wheels: built.wheels,
        headMat: built.headlightMat,
        brakeMat: built.brakeMat,
        wheelR: built.wheelR,
        halfW: built.halfW,
        halfL: built.halfL,
      };
    }
    const built = buildCityCarMesh({
      color,
      variant,
      isTaxi: false,
      taxiColor: 0x06b6d4,
      headlightIntensity: 1.0,
      brakeIntensity: 0.4,
      noMerge: true,
    });
    return {
      grp: built.group,
      wheels: built.wheels,
      headMat: built.headlightMat,
      brakeMat: built.brakeMat,
      wheelR: built.wheelR,
      halfW: built.halfW,
      halfL: built.halfL,
    };
  };

  const createNpcMotoMesh = (
    color: number,
    helmetColor: number,
    jacketColor: number,
    isSport: boolean,
    includePassenger: boolean = false,
    passengerHelmetColor?: number,
    passengerJacketColor?: number
  ): {
    grp: THREE.Group;
    wheels: THREE.Object3D[];
    headMat: THREE.MeshStandardMaterial;
    brakeMat: THREE.MeshStandardMaterial;
    wheelR: number;
    halfW: number;
    halfL: number;
  } => {
    const built = buildCityMotorbikeMesh({
      color,
      variant: isSport ? 'sport' : 'scooter',
      helmetColor,
      jacketColor,
      includeRider: true,
      includePassenger,
      passengerHelmetColor,
      passengerJacketColor,
      headlightIntensity: 1.2,
      brakeIntensity: 0.4,
      noMerge: true,
    });
    return {
      grp: built.group,
      wheels: built.wheels,
      headMat: built.headlightMat,
      brakeMat: built.brakeMat,
      wheelR: built.wheelR,
      halfW: built.halfW,
      halfL: built.halfL,
    };
  };

  const riverVehicles: RiverNpcVehicle[] = [];
  const vehicleSpecs: Array<{
    kind: 'car' | 'motorbike';
    color: number;
    taxi?: boolean;
    mode: RiverVehicleMode;
    x: number;
    z: number;
    dirX: 1 | -1;
    dirZ: 1 | -1;
    laneCoord: number;
    speed: number;
    step: number;
    bridgeCenterX?: number;
  }> = [
    // Active immediately ON Cầu Sông Hàn (both directions across 222m span!)
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bridge_ns', x: 195.8, z: -182.0, dirX: 1, dirZ: -1, laneCoord: 195.8, speed: 9.2, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0xe2e8f0, mode: 'bridge_ns', x: 195.8, z: -278.0, dirX: 1, dirZ: -1, laneCoord: 195.8, speed: 9.6, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xe2e8f0, mode: 'bridge_ns', x: 199.2, z: -158.0, dirX: 1, dirZ: -1, laneCoord: 199.2, speed: 10.4, step: 2, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x06b6d4, mode: 'bridge_ns', x: 199.2, z: -268.0, dirX: 1, dirZ: -1, laneCoord: 199.2, speed: 10.8, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0xf59e0b, mode: 'bridge_ns', x: 191.2, z: -242.0, dirX: -1, dirZ: 1, laneCoord: 191.2, speed: 9.0, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bridge_ns', x: 191.2, z: -305.0, dirX: -1, dirZ: 1, laneCoord: 191.2, speed: 9.3, step: 2, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x3b82f6, mode: 'bridge_ns', x: 191.2, z: -162.0, dirX: -1, dirZ: 1, laneCoord: 191.2, speed: 9.4, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x16a34a, mode: 'bridge_ns', x: 187.8, z: -214.0, dirX: -1, dirZ: 1, laneCoord: 187.8, speed: 10.6, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xf472b6, mode: 'bridge_ns', x: 187.8, z: -318.0, dirX: -1, dirZ: 1, laneCoord: 187.8, speed: 10.2, step: 3, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    // Active immediately ON Cầu Rồng (X = 370.0, 222m monumental 6-arch span)
    { kind: 'car', color: 0xf97316, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X + 2.3, z: -176.0, dirX: 1, dirZ: -1, laneCoord: DRAGON_BRIDGE_CENTER_X + 2.3, speed: 9.3, step: 0, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X + 2.3, z: -272.0, dirX: 1, dirZ: -1, laneCoord: DRAGON_BRIDGE_CENTER_X + 2.3, speed: 9.7, step: 2, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xdc2626, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X + 5.7, z: -156.0, dirX: 1, dirZ: -1, laneCoord: DRAGON_BRIDGE_CENTER_X + 5.7, speed: 10.6, step: 1, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xfacc15, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X + 5.7, z: -264.0, dirX: 1, dirZ: -1, laneCoord: DRAGON_BRIDGE_CENTER_X + 5.7, speed: 10.9, step: 0, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x10b981, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X - 2.3, z: -252.0, dirX: -1, dirZ: 1, laneCoord: DRAGON_BRIDGE_CENTER_X - 2.3, speed: 9.1, step: 1, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X - 2.3, z: -186.0, dirX: -1, dirZ: 1, laneCoord: DRAGON_BRIDGE_CENTER_X - 2.3, speed: 9.4, step: 0, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x2563eb, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X - 5.7, z: -218.0, dirX: -1, dirZ: 1, laneCoord: DRAGON_BRIDGE_CENTER_X - 5.7, speed: 10.5, step: 2, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xe2e8f0, mode: 'bridge_ns', x: DRAGON_BRIDGE_CENTER_X - 5.7, z: -314.0, dirX: -1, dirZ: 1, laneCoord: DRAGON_BRIDGE_CENTER_X - 5.7, speed: 10.3, step: 0, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xf472b6, mode: 'nb_north_leg', x: DRAGON_BRIDGE_CENTER_X - 5.7, z: -428.0, dirX: -1, dirZ: 1, laneCoord: DRAGON_BRIDGE_CENTER_X - 5.7, speed: 9.9, step: 2, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    // Active immediately ON Cầu Trần Thị Lý (X = 503.0, dual 3-lane lanes clear of central white median 502.1..503.9)
    { kind: 'car', color: 0xe11d48, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X + 2.8, z: -178.0, dirX: 1, dirZ: -1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X + 2.8, speed: 9.4, step: 0, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X + 2.8, z: -282.0, dirX: 1, dirZ: -1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X + 2.8, speed: 9.8, step: 2, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xe2e8f0, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X + 6.2, z: -158.0, dirX: 1, dirZ: -1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X + 6.2, speed: 10.6, step: 1, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x16a34a, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X + 6.2, z: -268.0, dirX: 1, dirZ: -1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X + 6.2, speed: 10.8, step: 0, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x3b82f6, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X - 2.8, z: -256.0, dirX: -1, dirZ: 1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X - 2.8, speed: 9.2, step: 1, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X - 2.8, z: -192.0, dirX: -1, dirZ: 1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X - 2.8, speed: 9.5, step: 0, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xf97316, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X - 6.2, z: -218.0, dirX: -1, dirZ: 1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X - 6.2, speed: 10.7, step: 1, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xef4444, mode: 'bridge_ns', x: TRAN_THI_LY_BRIDGE_CENTER_X - 6.2, z: -316.0, dirX: -1, dirZ: 1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X - 6.2, speed: 10.4, step: 0, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x10b981, mode: 'nb_north_leg', x: TRAN_THI_LY_BRIDGE_CENTER_X - 5.7, z: -428.0, dirX: -1, dirZ: 1, laneCoord: TRAN_THI_LY_BRIDGE_CENTER_X - 5.7, speed: 9.9, step: 2, bridgeCenterX: TRAN_THI_LY_BRIDGE_CENTER_X },
    // Active on Ngã Tư Bờ Bắc (North Bank E-W Trần Hưng Đạo & North legs, Z = -362.0)
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'nb_ew', x: 96.0, z: -358.0, dirX: 1, dirZ: -1, laneCoord: -358.0, speed: 9.4, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xf8fafc, mode: 'nb_ew', x: 112.0, z: -355.8, dirX: 1, dirZ: -1, laneCoord: -355.8, speed: 10.8, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x8b5cf6, mode: 'nb_ew', x: 132.0, z: -358.0, dirX: 1, dirZ: -1, laneCoord: -358.0, speed: 9.1, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xef4444, mode: 'nb_ew', x: 244.0, z: -368.2, dirX: -1, dirZ: 1, laneCoord: -368.2, speed: 10.5, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'nb_ew', x: 286.0, z: -366.0, dirX: -1, dirZ: 1, laneCoord: -366.0, speed: 9.5, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'nb_ew', x: 332.0, z: -358.0, dirX: 1, dirZ: -1, laneCoord: -358.0, speed: 9.3, step: 1, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x06b6d4, mode: 'nb_ew', x: 396.0, z: -355.8, dirX: 1, dirZ: -1, laneCoord: -355.8, speed: 11.0, step: 2, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'car', color: 0xe2e8f0, mode: 'nb_ew', x: 422.0, z: -366.0, dirX: -1, dirZ: 1, laneCoord: -366.0, speed: 9.3, step: 2, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x38bdf8, mode: 'nb_north_leg', x: 191.2, z: -432.0, dirX: -1, dirZ: 1, laneCoord: 191.2, speed: 9.8, step: 2, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    // Active on Đường Bạch Đằng (West Park / Starbucks / Adidas -> Cầu Sông Hàn -> Cầu Rồng -> Cầu Trần Thị Lý)
    { kind: 'motorbike', color: 0x16a34a, mode: 'bd_ew', x: -178.0, z: -111.0, dirX: 1, dirZ: -1, laneCoord: -111.0, speed: 10.6, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bd_ew', x: -148.0, z: -113.4, dirX: 1, dirZ: -1, laneCoord: -113.4, speed: 9.5, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xf472b6, mode: 'bd_ew', x: -64.0, z: -124.0, dirX: -1, dirZ: -1, laneCoord: -124.0, speed: 10.4, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bd_ew', x: 42.0, z: -121.6, dirX: -1, dirZ: -1, laneCoord: -121.6, speed: 9.3, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0x06b6d4, mode: 'bd_ew', x: 86.0, z: -111.0, dirX: 1, dirZ: -1, laneCoord: -111.0, speed: 10.9, step: 2, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0xf43f5e, mode: 'bd_ew', x: 140.0, z: -113.4, dirX: 1, dirZ: -1, laneCoord: -113.4, speed: 9.4, step: 0, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xe11d48, mode: 'bd_ew', x: 246.0, z: -124.0, dirX: -1, dirZ: -1, laneCoord: -124.0, speed: 10.7, step: 1, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x6366f1, mode: 'bd_ew', x: 270.0, z: -121.6, dirX: -1, dirZ: -1, laneCoord: -121.6, speed: 9.0, step: 1, bridgeCenterX: HAN_BRIDGE_CENTER_X },
    { kind: 'car', color: 0x06b6d4, taxi: true, mode: 'bd_ew', x: 312.0, z: -113.4, dirX: 1, dirZ: -1, laneCoord: -113.4, speed: 9.5, step: 1, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
    { kind: 'motorbike', color: 0xfacc15, mode: 'bd_ew', x: 416.0, z: -124.0, dirX: -1, dirZ: -1, laneCoord: -124.0, speed: 10.6, step: 2, bridgeCenterX: DRAGON_BRIDGE_CENTER_X },
  ];

  const pHelmetPalette = [0xdc2626, 0xf8fafc, 0x18181b, 0xf472b6];
  const pJacketPalette = [0xe8b4cb, 0x334155, 0xd1d5db, 0x0f766e];
  let motoCounter = 0;
  let taxiCounter = 0;

  vehicleSpecs.forEach((sp, i) => {
    const carVar: CityCarVariant = sp.taxi ? 'sedan' : carVariants[i % carVariants.length];
    let built: ReturnType<typeof createNpcCarMesh>;
    if (sp.kind === 'car') {
      const tIdx = sp.taxi ? taxiCounter++ : 0;
      built = createNpcCarMesh(sp.color, Boolean(sp.taxi), carVar, tIdx);
    } else {
      const mIdx = motoCounter++;
      const hasPassenger = mIdx % 5 === 0 || mIdx % 5 === 3;
      built = createNpcMotoMesh(
        sp.color,
        mIdx === 0 ? 0x18181b : helmetPalette[i % helmetPalette.length],
        mIdx === 0 ? 0xc2a888 : jacketPalette[i % jacketPalette.length],
        mIdx % 4 === 3,
        hasPassenger,
        pHelmetPalette[mIdx % pHelmetPalette.length],
        pJacketPalette[mIdx % pJacketPalette.length]
      );
    }
    const y = getHanRiverExteriorGroundY(sp.x, sp.z);
    const yaw =
      sp.mode === 'bridge_ns' || sp.mode === 'nb_north_leg'
        ? sp.dirZ > 0
          ? 0
          : Math.PI
        : sp.dirX > 0
          ? Math.PI / 2
          : -Math.PI / 2;
    built.grp.position.set(sp.x, y, sp.z);
    built.grp.rotation.y = yaw;
    staticGroup.add(built.grp);

    riverVehicles.push({
      id: `han_npc_${i}`,
      kind: sp.kind,
      grp: built.grp,
      wheels: built.wheels,
      wheelR: built.wheelR,
      halfW: built.halfW,
      halfL: built.halfL,
      priority: sp.kind === 'car' ? 28 : 22,
      cruiseSpeed: sp.speed,
      speed: sp.speed * 0.65,
      x: sp.x,
      y,
      z: sp.z,
      yaw,
      mode: sp.mode,
      dirX: sp.dirX,
      dirZ: sp.dirZ,
      laneCoord: sp.laneCoord,
      routeCounter: sp.step,
      branchCooldown: 0,
      turnStartX: sp.x,
      turnStartZ: sp.z,
      turnCtrlX: sp.x,
      turnCtrlZ: sp.z,
      turnEndX: sp.x,
      turnEndZ: sp.z,
      turnT: 0,
      turnDuration: 1.2,
      turnNextMode: sp.mode,
      turnNextDirX: sp.dirX,
      turnNextDirZ: sp.dirZ,
      turnNextLane: sp.laneCoord,
      bridgeCenterX: sp.bridgeCenterX ?? HAN_BRIDGE_CENTER_X,
      headMat: built.headMat,
      brakeMat: built.brakeMat,
    });
  });

  // Strolling Tourists along Bạch Đằng Waterfront & Relocated Viewing Pier (X = 146.0)
  interface Stroller {
    grp: THREE.Group;
    armL: THREE.Group;
    armR: THREE.Group;
    legL: THREE.Group;
    legR: THREE.Group;
    glbHandle: GlbHumanHandle;
    wps: THREE.Vector3[];
    wpIdx: number;
    phase: number;
    speed: number;
  }
  const strollers: Stroller[] = [];
  const touristSpecs = [
    {
      shirt: 0xf43f5e,
      pants: 0x0f172a,
      skin: '#fbd3b4',
      hair: 0x111827,
      wps: [
        new THREE.Vector3(122, 0.02, -130.5),
        new THREE.Vector3(142.5, 0.02, -130.5),
        new THREE.Vector3(143.0, 0.02, -140.2),
        new THREE.Vector3(149.0, 0.02, -140.2),
        new THREE.Vector3(149.0, 0.02, -130.5),
        new THREE.Vector3(176, 0.02, -130.5),
      ],
      speed: 1.25,
    },
    {
      shirt: 0x38bdf8,
      pants: 0x1e293b,
      skin: '#fce0c8',
      hair: 0x27150a,
      wps: [
        new THREE.Vector3(178, 0.02, -129.0),
        new THREE.Vector3(108, 0.02, -129.0),
      ],
      speed: 1.32,
    },
    {
      shirt: 0xfbbf24,
      pants: 0x09090b,
      skin: '#f5c7a3',
      hair: 0x111827,
      wps: [
        new THREE.Vector3(150, 0.02, -106.8),
        new THREE.Vector3(183, 0.02, -106.8),
        new THREE.Vector3(183, 0.02, -128.0),
        new THREE.Vector3(150, 0.02, -128.0),
      ],
      speed: 1.28,
    },
    {
      shirt: 0xa855f7,
      pants: 0x0f172a,
      skin: '#fbd3b4',
      hair: 0x18181b,
      wps: [
        new THREE.Vector3(212, 0.02, -131.5),
        new THREE.Vector3(250, 0.02, -131.5),
      ],
      speed: 1.22,
    },
    // North Bank Promenade Stroller beside Ngã Tư Bờ Bắc
    {
      shirt: 0x10b981,
      pants: 0x1e293b,
      skin: '#fbd3b4',
      hair: 0x111827,
      wps: [
        new THREE.Vector3(212, 0.02, -347.5),
        new THREE.Vector3(262, 0.02, -347.5),
        new THREE.Vector3(262, 0.02, -351.2),
        new THREE.Vector3(212, 0.02, -351.2),
      ],
      speed: 1.24,
    },
    // Cá Chép Hóa Rồng Plaza & Cầu Tình Yêu Strolling Tourists
    {
      shirt: 0xec4899,
      pants: 0x1e293b,
      skin: '#fce0c8',
      hair: 0x111827,
      wps: [
        new THREE.Vector3(250.5, 0.02, -338.5),
        new THREE.Vector3(266.0, 0.02, -338.5),
        new THREE.Vector3(266.0, 0.02, -327.0),
        new THREE.Vector3(250.5, 0.02, -327.0),
      ],
      speed: 1.05,
    },
    {
      shirt: 0x14b8a6,
      pants: 0xf1f5f9,
      skin: '#fbd3b4',
      hair: 0x27150a,
      wps: [
        new THREE.Vector3(268.0, 0.02, -342.0),
        new THREE.Vector3(268.0, 0.02, -327.2),
        new THREE.Vector3(296.0, 0.02, -327.2),
        new THREE.Vector3(268.0, 0.02, -327.2),
      ],
      speed: 1.12,
    },
    // Cầu Tình Yêu & Bến Du Thuyền Strolling Tourists
    {
      shirt: 0xf43f5e,
      pants: 0xf8fafc,
      skin: '#fce0c8',
      hair: 0x1e1b4b,
      wps: [
        new THREE.Vector3(277.0, 0.02, -331.0),
        new THREE.Vector3(342.0, 0.02, -331.0),
        new THREE.Vector3(342.0, 0.02, -327.0),
        new THREE.Vector3(277.0, 0.02, -327.0),
      ],
      speed: 1.08,
    },
    {
      shirt: 0x0ea5e9,
      pants: 0x0f172a,
      skin: '#fbd3b4',
      hair: 0x111827,
      wps: [
        new THREE.Vector3(338.0, 0.02, -327.2),
        new THREE.Vector3(281.0, 0.02, -327.2),
        new THREE.Vector3(281.0, 0.02, -342.0),
        new THREE.Vector3(281.0, 0.02, -327.2),
      ],
      speed: 1.12,
    },
    {
      shirt: 0xfbbf24,
      pants: 0x334155,
      skin: '#f5c7a3',
      hair: 0x27150a,
      wps: [
        new THREE.Vector3(290.0, 0.02, -330.8),
        new THREE.Vector3(328.0, 0.02, -330.8),
      ],
      speed: 1.02,
    },
  ];
  touristSpecs.forEach((ts, idx) => {
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    grp.position.copy(ts.wps[0]);

    const fallbackGrp = new THREE.Group();
    grp.add(fallbackGrp);

    const sMat = new THREE.MeshStandardMaterial({ color: ts.skin, roughness: 0.7 });
    const cMat = new THREE.MeshStandardMaterial({ color: ts.shirt, roughness: 0.65 });
    const pMat = new THREE.MeshStandardMaterial({ color: ts.pants, roughness: 0.78 });
    const hMat = new THREE.MeshStandardMaterial({ color: ts.hair, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), cMat);
    torso.position.y = 1.04;
    fallbackGrp.add(torso);
    const head = helpers.createHeadMesh(sMat, helpers.createFaceTexture('happy', ts.skin), 0.28, 0.28, 0.28);
    head.position.y = 1.48;
    fallbackGrp.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.11, 0.30), hMat);
    hair.position.y = 1.61;
    fallbackGrp.add(hair);

    const makeLimb = (x: number, y: number, w: number, h: number, m: THREE.Material) => {
      const piv = new THREE.Group();
      piv.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m);
      mesh.position.y = -h * 0.45;
      piv.add(mesh);
      fallbackGrp.add(piv);
      return piv;
    };
    const armL = makeLimb(-0.29, 1.26, 0.13, 0.44, cMat);
    const armR = makeLimb(0.29, 1.26, 0.13, 0.44, cMat);
    const legL = makeLimb(-0.11, 0.76, 0.16, 0.68, pMat);
    const legR = makeLimb(0.11, 0.76, 0.16, 0.68, pMat);

    const strollSpec = pickOutsideNpcModel(140 + idx);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: strollSpec.modelSource,
      hostGroup: grp,
      fallbackMeshes: [fallbackGrp],
      targetHeight: strollSpec.targetHeight,
      clipProfile: strollSpec.clipProfile,
      rotationY: strollSpec.rotationY,
      initialState: 'Walk',
      phaseOffset: idx * 0.47,
    });

    staticGroup.add(grp);
    strollers.push({ grp, armL, armR, legL, legR, glbHandle, wps: ts.wps, wpIdx: 1, phase: idx * 0.9, speed: ts.speed });
  });

  // -------------------------------------------------------------------------
  // 6B. CẦU RỒNG FIRE-SHOW SPECTATORS & TOURIST CROWD (72 GLB NPCs: 30/side + 12 Head)
  // Gather around 19:21-20:00, pack shoulder-to-shoulder near the Dragon Head & raise
  // smartphones to film/snap photos along BOTH walkways (30 West + 30 East = 60) &
  // Dragon Head promenade (12) during 20:00-24:00, then walk full bridge home after 24:00.
  // -------------------------------------------------------------------------
  const getDragonWalkwayX = (side: -1 | 1, z: number, laneBias = 0): number => {
    const roadHW = getDragonBridgeRoadHalfW(z);
    const outerHW = getDragonBridgeOuterHalfW(z);
    const midOff = THREE.MathUtils.clamp((roadHW + outerHW) * 0.5 + laneBias, roadHW + 0.55, outerHW - 0.62);
    return DRAGON_BRIDGE_CENTER_X + side * midOff;
  };

  // Shared smartphone + camera flash resources for Cầu Rồng spectators
  const phoneBodyGeo = new THREE.BoxGeometry(0.082, 0.162, 0.014);
  const phoneScreenGeo = new THREE.PlaneGeometry(0.072, 0.144);
  const phoneCamGeo = new THREE.BoxGeometry(0.048, 0.022, 0.006);
  const phoneRecGeo = new THREE.CircleGeometry(0.009, 8);
  const phoneBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.55,
  });
  const phoneScreenMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.45,
    roughness: 0.15,
  });
  const phoneRecMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = 64;
  flashCanvas.height = 64;
  const fctx = flashCanvas.getContext('2d');
  if (fctx) {
    const fg = fctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    fg.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    fg.addColorStop(0.28, 'rgba(254, 249, 195, 0.92)');
    fg.addColorStop(0.65, 'rgba(253, 224, 71, 0.30)');
    fg.addColorStop(1.0, 'rgba(253, 224, 71, 0.0)');
    fctx.fillStyle = fg;
    fctx.fillRect(0, 0, 64, 64);
  }
  const flashTex = new THREE.CanvasTexture(flashCanvas);
  const flashPlaneGeo = new THREE.PlaneGeometry(0.36, 0.36);

  const createSpectatorPhoneRig = (scaleScalar: number) => {
    const root = new THREE.Group();
    root.visible = false;
    root.scale.setScalar(scaleScalar);

    const body = new THREE.Mesh(phoneBodyGeo, phoneBodyMat);
    root.add(body);

    // Glowing camera preview screen facing the spectator (-Z in phone local space)
    const screen = new THREE.Mesh(phoneScreenGeo, phoneScreenMat);
    screen.position.z = -0.008;
    screen.rotation.y = Math.PI;
    root.add(screen);

    // Rear camera bump & tiny red REC indicator facing Dragon Head (+Z in phone local space)
    const cam = new THREE.Mesh(phoneCamGeo, phoneBodyMat);
    cam.position.set(-0.012, 0.056, 0.009);
    root.add(cam);

    const recDot = new THREE.Mesh(phoneRecGeo, phoneRecMat);
    recDot.position.set(0.018, 0.058, 0.012);
    root.add(recDot);

    const flashMat = new THREE.MeshBasicMaterial({
      map: flashTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flashMesh = new THREE.Mesh(flashPlaneGeo, flashMat);
    flashMesh.position.set(-0.012, 0.056, 0.032);
    flashMesh.visible = false;
    root.add(flashMesh);

    return { root, flashMesh, flashMat };
  };

  interface DragonSpectator {
    grp: THREE.Group;
    armL: THREE.Group;
    armR: THREE.Group;
    legL: THREE.Group;
    legR: THREE.Group;
    handle: GlbHumanHandle;
    glbPhoneRoot: THREE.Group | null;
    glbFlashMesh: THREE.Mesh | null;
    glbFlashMat: THREE.MeshBasicMaterial | null;
    fallbackPhoneRoot: THREE.Group;
    fallbackFlashMesh: THREE.Mesh;
    fallbackFlashMat: THREE.MeshBasicMaterial;
    side: -1 | 1;
    zone: 'bridge_walkway' | 'north_head_promenade';
    entryEnd: 'south' | 'north';
    laneBias: number;
    watchX: number;
    watchZ: number;
    watchYaw: number;
    homeX: number;
    homeZ: number;
    speed: number;
    phase: number;
    departDelay: number;
    departTimer: number;
    filmTogglePhase: number;
    flashCooldown: number;
    flashTimer: number;
    state: 'hidden' | 'walking_to_watch' | 'watching' | 'walking_home' | 'gone_home';
    wpList: Array<{ x: number; z: number; trackWalkway?: boolean }>;
    wpIdx: number;
    animState: 'Walk' | 'Idle' | 'FilmPhone';
  }

  interface SpectatorSpecItem {
    side: -1 | 1;
    zone: 'bridge_walkway' | 'north_head_promenade';
    entryEnd: 'south' | 'north';
    watchZ: number;
    watchXOverride?: number;
    laneBias: number;
    homeX: number;
    homeZ: number;
    speed: number;
    departDelay: number;
  }

  const spectatorSpecs: SpectatorSpecItem[] = [];

  // 30 West + 30 East Bridge Walkway Spectators (60 total) packed shoulder-to-shoulder around Dragon Head (-308..-344.6)
  const walkwayCountPerSide = 30;
  const walkwayLaneCycle = [-0.86, -0.06, 0.78, -0.76, 0.12, 0.86];
  const southHomeXsWest = [294, 304, 314, 324, 334, 344];
  const southHomeXsEast = [394, 404, 414, 424, 434, 444];
  const northHomeXsWest = [302, 312, 322, 332, 340, 348];
  const northHomeXsEast = [392, 400, 410, 420, 430, 440];

  ([-1, 1] as const).forEach((side, sideIdx) => {
    for (let k = 0; k < walkwayCountPerSide; k++) {
      // Cluster tightly near Dragon Head (-318) & fire plume (-322..-344)
      const t = k / (walkwayCountPerSide - 1);
      const baseZ = -308.0 - t * 36.6;
      const zJitter = ((k % 3) - 1) * 0.18 + (sideIdx === 1 ? -0.22 : 0);
      const watchZ = THREE.MathUtils.clamp(baseZ + zJitter, -344.7, -307.5);
      const laneBias = walkwayLaneCycle[(k + sideIdx * 2) % walkwayLaneCycle.length] * (side === 1 ? -1 : 1);
      const entryEnd: 'south' | 'north' = k < 12 ? 'south' : 'north';
      const homePool =
        entryEnd === 'south'
          ? side === -1
            ? southHomeXsWest
            : southHomeXsEast
          : side === -1
            ? northHomeXsWest
            : northHomeXsEast;
      const homeX = homePool[k % homePool.length];
      const homeZ =
        entryEnd === 'south'
          ? -129.8 - (k % 3) * 0.9
          : k % 4 === 3
            ? -351.4
            : -347.2 - (k % 3) * 0.7;
      spectatorSpecs.push({
        side,
        zone: 'bridge_walkway',
        entryEnd,
        watchZ,
        laneBias,
        homeX,
        homeZ,
        speed: 1.44 + (k % 5) * 0.05,
        departDelay: (k % 8) * 0.38 + sideIdx * 0.15,
      });
    }
  });

  // 12 North Riverside Balustrade Spectators (6 West + 6 East) packed in 2 tight rows flanking the Dragon Mouth
  const headPromenadeSpecs: SpectatorSpecItem[] = [
    // West Dragon Head cluster (6 NPCs)
    { side: -1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.2, watchXOverride: 355.8, laneBias: 0, homeX: 318.0, homeZ: -348.0, speed: 1.38, departDelay: 0.9 },
    { side: -1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.3, watchXOverride: 353.8, laneBias: 0, homeX: 306.0, homeZ: -348.5, speed: 1.36, departDelay: 1.4 },
    { side: -1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.5, watchXOverride: 351.6, laneBias: 0, homeX: 294.0, homeZ: -347.8, speed: 1.40, departDelay: 2.1 },
    { side: -1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.8, watchXOverride: 349.2, laneBias: 0, homeX: 282.0, homeZ: -351.2, speed: 1.42, departDelay: 2.7 },
    { side: -1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -347.7, watchXOverride: 354.6, laneBias: 0, homeX: 312.0, homeZ: -349.0, speed: 1.35, departDelay: 1.8 },
    { side: -1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -347.9, watchXOverride: 350.6, laneBias: 0, homeX: 298.0, homeZ: -351.4, speed: 1.39, departDelay: 3.1 },

    // East Dragon Head cluster (6 NPCs)
    { side: 1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.2, watchXOverride: 384.2, laneBias: 0, homeX: 422.0, homeZ: -348.0, speed: 1.38, departDelay: 1.0 },
    { side: 1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.3, watchXOverride: 386.2, laneBias: 0, homeX: 434.0, homeZ: -348.5, speed: 1.36, departDelay: 1.6 },
    { side: 1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.5, watchXOverride: 388.4, laneBias: 0, homeX: 446.0, homeZ: -347.8, speed: 1.40, departDelay: 2.2 },
    { side: 1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -346.8, watchXOverride: 390.8, laneBias: 0, homeX: 458.0, homeZ: -351.2, speed: 1.42, departDelay: 2.8 },
    { side: 1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -347.7, watchXOverride: 385.4, laneBias: 0, homeX: 428.0, homeZ: -349.0, speed: 1.35, departDelay: 1.9 },
    { side: 1, zone: 'north_head_promenade', entryEnd: 'north', watchZ: -347.9, watchXOverride: 389.4, laneBias: 0, homeX: 442.0, homeZ: -351.4, speed: 1.39, departDelay: 3.3 },
  ];
  spectatorSpecs.push(...headPromenadeSpecs);

  const dragonSpectatorPalette = [
    { shirt: 0xef4444, pants: 0x0f172a, skin: '#fbd3b4', hair: 0x111827 },
    { shirt: 0x3b82f6, pants: 0x1e293b, skin: '#fce0c8', hair: 0x27150a },
    { shirt: 0xf59e0b, pants: 0x09090b, skin: '#f5c7a3', hair: 0x18181b },
    { shirt: 0x10b981, pants: 0x1e293b, skin: '#fbd3b4', hair: 0x111827 },
    { shirt: 0xec4899, pants: 0x0f172a, skin: '#fce0c8', hair: 0x3f2314 },
    { shirt: 0x8b5cf6, pants: 0x1e293b, skin: '#f5c7a3', hair: 0x111827 },
  ];

  const dragonSpectators: DragonSpectator[] = [];
  spectatorSpecs.forEach((spec, idx) => {
    const pal = dragonSpectatorPalette[idx % dragonSpectatorPalette.length];
    const grp = new THREE.Group();
    grp.userData.noMerge = true;
    grp.visible = false;

    const fallbackGrp = new THREE.Group();
    grp.add(fallbackGrp);

    const sMat = new THREE.MeshStandardMaterial({ color: pal.skin, roughness: 0.7 });
    const cMat = new THREE.MeshStandardMaterial({ color: pal.shirt, roughness: 0.65 });
    const pMat = new THREE.MeshStandardMaterial({ color: pal.pants, roughness: 0.78 });
    const hMat = new THREE.MeshStandardMaterial({ color: pal.hair, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.52, 0.22), cMat);
    torso.position.y = 1.02;
    fallbackGrp.add(torso);
    const head = helpers.createHeadMesh(sMat, helpers.createFaceTexture('happy', pal.skin), 0.27, 0.27, 0.27);
    head.position.y = 1.46;
    fallbackGrp.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.11, 0.29), hMat);
    hair.position.y = 1.59;
    fallbackGrp.add(hair);

    const makeSpecLimb = (x: number, y: number, w: number, h: number, m: THREE.Material) => {
      const piv = new THREE.Group();
      piv.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m);
      mesh.position.y = -h * 0.45;
      piv.add(mesh);
      fallbackGrp.add(piv);
      return piv;
    };
    const armL = makeSpecLimb(-0.28, 1.24, 0.12, 0.43, cMat);
    const armR = makeSpecLimb(0.28, 1.24, 0.12, 0.43, cMat);
    const legL = makeSpecLimb(-0.10, 0.74, 0.15, 0.66, pMat);
    const legR = makeSpecLimb(0.10, 0.74, 0.15, 0.66, pMat);

    // Fallback phone on raised right arm
    const fbPhone = createSpectatorPhoneRig(1.0);
    fbPhone.root.position.set(0, -0.45, 0.05);
    fbPhone.root.rotation.set(1.25, 0, 0);
    armR.add(fbPhone.root);

    const watchX = spec.watchXOverride ?? getDragonWalkwayX(spec.side, spec.watchZ, spec.laneBias);
    const watchYaw = Math.atan2(DRAGON_BRIDGE_CENTER_X - watchX, dragonMouthZ - spec.watchZ);

    const spRecord: DragonSpectator = {
      grp,
      armL,
      armR,
      legL,
      legR,
      handle: null as unknown as GlbHumanHandle,
      glbPhoneRoot: null,
      glbFlashMesh: null,
      glbFlashMat: null,
      fallbackPhoneRoot: fbPhone.root,
      fallbackFlashMesh: fbPhone.flashMesh,
      fallbackFlashMat: fbPhone.flashMat,
      side: spec.side,
      zone: spec.zone,
      entryEnd: spec.entryEnd,
      laneBias: spec.laneBias,
      watchX,
      watchZ: spec.watchZ,
      watchYaw,
      homeX: spec.homeX,
      homeZ: spec.homeZ,
      speed: spec.speed,
      phase: idx * 0.85,
      departDelay: spec.departDelay,
      departTimer: 0,
      filmTogglePhase: idx * 1.37,
      flashCooldown: 1.5 + (idx % 7) * 0.75,
      flashTimer: 0,
      state: 'hidden',
      wpList: [],
      wpIdx: 0,
      animState: 'Idle',
    };

    const modelSpec = pickOutsideNpcModel(220 + idx);
    const handle = attachGlbHumanToNpc({
      modelSource: modelSpec.modelSource,
      hostGroup: grp,
      fallbackMeshes: [fallbackGrp],
      targetHeight: modelSpec.targetHeight,
      clipProfile: modelSpec.clipProfile,
      rotationY: modelSpec.rotationY,
      lodMixerRadius: 88,
      initialState: 'Idle',
      phaseOffset: idx * 0.61,
      onModelMounted: (modelRoot) => {
        const rightHandBone =
          modelRoot.getObjectByName('FistR') ??
          modelRoot.getObjectByName('Fist.R') ??
          modelRoot.getObjectByName('RightHand');
        if (rightHandBone) {
          const glbPhone = createSpectatorPhoneRig(1.88);
          // Calibrated to Quaternius Fist.R bone orientation in FilmPhone pose so screen faces NPC & camera aims up/forward
          glbPhone.root.position.set(0.0, 0.08, 0.02);
          glbPhone.root.rotation.set(-1.34, 0.56, 2.54);
          glbPhone.root.visible = spRecord.animState === 'FilmPhone';
          rightHandBone.add(glbPhone.root);
          spRecord.glbPhoneRoot = glbPhone.root;
          spRecord.glbFlashMesh = glbPhone.flashMesh;
          spRecord.glbFlashMat = glbPhone.flashMat;
        }
      },
    });
    handle.setVisible(false);
    spRecord.handle = handle;

    staticGroup.add(grp);
    dragonSpectators.push(spRecord);
  });

  const buildSpectatorToWatchWps = (sp: DragonSpectator): Array<{ x: number; z: number; trackWalkway?: boolean }> => {
    if (sp.zone === 'north_head_promenade') {
      return [
        { x: sp.watchX, z: sp.homeZ },
        { x: sp.watchX, z: sp.watchZ },
      ];
    }
    if (sp.entryEnd === 'south') {
      const entryX = getDragonWalkwayX(sp.side, -129.0, sp.laneBias);
      return [
        { x: entryX, z: -129.0 },
        { x: sp.watchX, z: sp.watchZ, trackWalkway: true },
      ];
    }
    const northEntryX = getDragonWalkwayX(sp.side, -351.0, sp.laneBias);
    return [
      { x: northEntryX, z: -351.0 },
      { x: sp.watchX, z: sp.watchZ, trackWalkway: true },
    ];
  };

  const buildSpectatorHomeWps = (sp: DragonSpectator): Array<{ x: number; z: number; trackWalkway?: boolean }> => {
    if (sp.zone === 'north_head_promenade') {
      return [
        { x: sp.watchX, z: -348.2 },
        { x: sp.homeX, z: sp.homeZ },
      ];
    }
    if (sp.entryEnd === 'south') {
      const southExitX = getDragonWalkwayX(sp.side, -129.0, sp.laneBias);
      return [
        { x: southExitX, z: -129.0, trackWalkway: true },
        { x: sp.homeX, z: sp.homeZ },
      ];
    }
    const northExitX = getDragonWalkwayX(sp.side, -351.0, sp.laneBias);
    return [
      { x: northExitX, z: -351.0, trackWalkway: true },
      { x: sp.homeX, z: sp.homeZ },
    ];
  };

  const setSpectatorPhoneVisible = (sp: DragonSpectator, visible: boolean) => {
    if (sp.glbPhoneRoot) sp.glbPhoneRoot.visible = visible;
    sp.fallbackPhoneRoot.visible = visible;
    if (!visible) {
      if (sp.glbFlashMesh) sp.glbFlashMesh.visible = false;
      sp.fallbackFlashMesh.visible = false;
      sp.flashTimer = 0;
    }
  };

  const setSpectatorAnim = (sp: DragonSpectator, next: 'Walk' | 'Idle' | 'FilmPhone') => {
    if (sp.animState !== next) {
      sp.animState = next;
      sp.handle.setAnimState(next, next === 'Walk' ? 1.05 : 1.0);
    }
    setSpectatorPhoneVisible(sp, next === 'FilmPhone');
  };

  const resetSpectatorLimbs = (sp: DragonSpectator) => {
    sp.armL.rotation.set(0, 0, 0);
    sp.armR.rotation.set(0, 0, 0);
    sp.legL.rotation.set(0, 0, 0);
    sp.legR.rotation.set(0, 0, 0);
  };

  let prevDragonPhase: DragonFireShowPhase = 'idle';
  let smokeFade = 0;

  // =========================================================================
  // 7. COASTAL & BRIDGE POINT LIGHTING RIG & ANIMATION LOOP
  // =========================================================================
  const registerLight = (
    color: number,
    x: number,
    y: number,
    z: number,
    dist: number,
    dayInt: number,
    nightInt: number
  ) => {
    const l = new THREE.PointLight(color, nightInt, dist, 1.25);
    l.position.set(x, y, z);
    scaledLights.push({ light: l, dayInt, nightInt, getScale: () => 1.0 });
  };

  registerLight(0x38bdf8, -218.0, 6.5, -108.5, 34, 4, 20); // Góc Tây Bạch Đằng Corner Sign Wash
  registerLight(0xfde047, -185.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfde047, -120.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfde047, -55.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfde047, 10.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfde047, 70.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0x38bdf8, 193.5, 6.5, -108.5, 34, 4, 20); // Ngã 4 Bạch Đằng Corner Sign Wash
  registerLight(0xfbbf24, DRAGON_BRIDGE_CENTER_X, 6.5, -108.5, 34, 4, 20); // Ngã 4 Bạch Đằng • Cầu Rồng Sign Wash
  registerLight(0x38bdf8, 503.0, 6.5, -108.5, 34, 4, 20); // Ngã 3 Bạch Đằng - DIOR Corner Sign Wash
  registerLight(0xfef08a, VIEWING_PIER_CENTER_X, 4.5, -137.0, 28, 3, 18); // Relocated Viewing Pier & Cá Chép Hóa Rồng Wash
  registerLight(0x06b6d4, HAN_BRIDGE_CENTER_X, 16.0, -240.0, 68, 3, 28); // Cầu Sông Hàn Central Pylon Illumination
  registerLight(0xd946ef, HAN_BRIDGE_CENTER_X, 10.0, -172.0, 50, 2, 20); // Cầu Sông Hàn South Span Wash
  registerLight(0x06b6d4, HAN_BRIDGE_CENTER_X, 10.0, -308.0, 50, 2, 20); // Cầu Sông Hàn North Span Wash
  registerLight(0x38bdf8, 193.5, 6.8, NORTH_BANK_INTERSECTION_CENTER_Z, 42, 4, 24); // Ngã 4 Bờ Bắc Cầu Sông Hàn Illumination
  const dragonLights: THREE.PointLight[] = [];
  const registerDragonLight = (x: number, y: number, z: number, dist: number, dayInt: number, nightInt: number) => {
    const l = new THREE.PointLight(0xf59e0b, nightInt, dist, 1.25);
    l.position.set(x, y, z);
    scaledLights.push({ light: l, dayInt, nightInt, getScale: () => 1.0 });
    dragonLights.push(l);
  };
  registerDragonLight(DRAGON_BRIDGE_CENTER_X, 14.0, -319.0, 62, 3, 28); // Cầu Rồng North Dragon Head Illumination
  registerDragonLight(DRAGON_BRIDGE_CENTER_X, 20.0, -230.0, 84, 3, 32); // Cầu Rồng Central Tallest Arch Illumination
  registerDragonLight(DRAGON_BRIDGE_CENTER_X, 14.0, -168.0, 64, 2, 26); // Cầu Rồng South Arch & Lotus Tail Wash
  registerLight(0xfbbf24, DRAGON_BRIDGE_CENTER_X, 6.8, NORTH_BANK_INTERSECTION_CENTER_Z, 42, 4, 24); // Ngã 4 Bờ Bắc Cầu Rồng Illumination
  registerLight(0xf8fafc, TRAN_THI_LY_BRIDGE_CENTER_X, 22.0, -246.0, 82, 4, 32); // Cầu Trần Thị Lý White Sail Pylon Illumination
  registerLight(0xfef08a, TRAN_THI_LY_BRIDGE_CENTER_X, 12.0, -168.0, 58, 2, 22); // Cầu Trần Thị Lý South Span Illumination
  registerLight(0xe2e8f0, TRAN_THI_LY_BRIDGE_CENTER_X, 12.0, -315.0, 58, 2, 22); // Cầu Trần Thị Lý North Span Illumination
  registerLight(0xfbbf24, TRAN_THI_LY_BRIDGE_CENTER_X, 6.8, NORTH_BANK_INTERSECTION_CENTER_Z, 42, 4, 24); // Ngã 4 Bờ Bắc Cầu Trần Thị Lý Illumination
  registerLight(0xfde047, 118.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfde047, 162.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfde047, 232.0, 5.8, -117.5, 44, 0, 20);
  registerLight(0xfde047, 286.0, 5.8, -117.5, 44, 0, 20);
  registerLight(0xfde047, 336.0, 5.8, -117.5, 44, 0, 20);
  registerLight(0xfde047, 408.0, 5.8, -117.5, 44, 0, 20);
  registerLight(0xfde047, 456.0, 5.8, -117.5, 44, 0, 20);
  registerLight(0xfde047, 518.0, 5.8, -117.5, 42, 0, 18);
  registerLight(0xfbbf24, 255.8, 5.4, -330.6, 36, 2, 32); // Cá Chép Hóa Rồng Warm Golden SW Uplight
  registerLight(0xfde047, 263.2, 5.4, -331.0, 36, 2, 30); // Cá Chép Hóa Rồng Warm Golden East Uplight
  registerLight(0xfbbf24, 259.5, 5.4, -336.5, 34, 2, 26); // Cá Chép Hóa Rồng Warm Golden North Uplight
  registerLight(0xfef08a, 258.0, 8.8, -331.8, 30, 2, 28); // Cá Chép Dragon Head & Crown Spotlight
  registerLight(0xf472b6, 251.5, 7.8, -328.8, 34, 0, 28); // Cá Chép Illuminated Water Fountain Upper Arc
  registerLight(0xec4899, 244.5, 3.8, -325.2, 32, 0, 24); // Cá Chép Water Fountain River Splash Glow
  registerLight(0xff6b6b, 285.0, 4.4, -329.0, 32, 2, 18); // Cầu Tình Yêu West Heart Tree Glow
  registerLight(0xfb7185, 311.0, 4.4, -329.0, 34, 2, 20); // Cầu Tình Yêu Center & Marina Glow
  registerLight(0xff6b6b, 336.0, 4.4, -329.0, 32, 2, 18); // Cầu Tình Yêu East Tip & Yacht Glow

  const beginCurveTurn = (
    v: RiverNpcVehicle,
    ctrlX: number,
    ctrlZ: number,
    endX: number,
    endZ: number,
    nextMode: RiverVehicleMode,
    nextDirX: 1 | -1,
    nextDirZ: 1 | -1,
    nextLane: number,
    duration = 1.25
  ) => {
    v.mode = 'turn_curve';
    v.turnStartX = v.x;
    v.turnStartZ = v.z;
    v.turnCtrlX = ctrlX;
    v.turnCtrlZ = ctrlZ;
    v.turnEndX = endX;
    v.turnEndZ = endZ;
    v.turnT = 0;
    v.turnDuration = duration;
    v.turnNextMode = nextMode;
    v.turnNextDirX = nextDirX;
    v.turnNextDirZ = nextDirZ;
    v.turnNextLane = nextLane;
    v.branchCooldown = 2.6;
  };

  let clock = 0;
  let waterClock = 0;
  let lastWaterLamp = -1;
  let signalClock = 0;

  const update = (delta: number, rawHour: number, lampFactor: number, isNearWater = true) => {
    const dt = Math.min(delta, 0.1);
    clock += dt;
    waterClock += dt;
    signalClock += dt;

    // 4-Way Traffic Signal Timers (30s staggered cycles for smooth progression)
    const southCycle = signalClock % 30.0;
    if (southCycle < 12.0) {
      southEwPhase = 'green';
      southNsPhase = 'red';
    } else if (southCycle < 15.0) {
      southEwPhase = 'yellow';
      southNsPhase = 'red';
    } else if (southCycle < 27.0) {
      southEwPhase = 'red';
      southNsPhase = 'green';
    } else {
      southEwPhase = 'red';
      southNsPhase = 'yellow';
    }
    southSignalRig.applyPhase(southEwPhase, southNsPhase);
    dragonSouthSignalRig.applyPhase(southEwPhase, southNsPhase);
    tranThiLySouthSignalRig.applyPhase(southEwPhase, southNsPhase);

    // Offset North Bank intersection cycle by 10s so waves flow off all 3 bridges nicely
    const northCycle = (signalClock + 10.0) % 30.0;
    if (northCycle < 12.0) {
      northEwPhase = 'green';
      northNsPhase = 'red';
    } else if (northCycle < 15.0) {
      northEwPhase = 'yellow';
      northNsPhase = 'red';
    } else if (northCycle < 27.0) {
      northEwPhase = 'red';
      northNsPhase = 'green';
    } else {
      northEwPhase = 'red';
      northNsPhase = 'yellow';
    }
    northBankSignalRig.applyPhase(northEwPhase, northNsPhase);
    dragonNorthBankSignalRig.applyPhase(northEwPhase, northNsPhase);
    tranThiLyNorthBankSignalRig.applyPhase(northEwPhase, northNsPhase);

    waterUniforms.uWaterTime.value = clock;
    waterUniforms.uWaterLamp.value = lampFactor;
    if (Math.abs(lampFactor - lastWaterLamp) > 0.03 || (isNearWater && waterClock >= 0.16)) {
      waterClock = 0;
      lastWaterLamp = lampFactor;
      waterDrawer.redraw(clock, lampFactor);
    }

    // Cầu Rồng Schedule:
    // - 20:00..24:00 ('fire_show'): Dragon breathes multi-layered fire + embers + smoke, spine glows fiery Royal Gold!
    // - Other night hours (lampFactor > 0.25): decorative Gold <-> Sapphire LED show only (no fire/water spray).
    const dragonPhase = getDragonFireShowPhase(rawHour);
    const isFireShowHours = dragonPhase === 'fire_show';
    const isNightShow = lampFactor > 0.25;

    let firePower = 0;
    if (isFireShowHours) {
      // 12s dramatic dragon breath cycle (offset +2.5s so at 20:00 start it immediately roars)
      const breathT = (clock + 2.5) % 12.0;
      if (breathT < 0.7) {
        firePower = THREE.MathUtils.smoothstep(breathT, 0, 0.7);
      } else if (breathT < 9.0) {
        const flicker = Math.sin(clock * 14.5) * 0.07 + Math.sin(clock * 23.0) * 0.04;
        firePower = THREE.MathUtils.clamp(0.95 + flicker, 0.75, 1.08);
      } else if (breathT < 10.2) {
        firePower = 1.0 - THREE.MathUtils.smoothstep(breathT, 9.0, 10.2);
      }
      smokeFade = THREE.MathUtils.lerp(smokeFade, 1.0, Math.min(1, dt * 3.5));
    } else {
      smokeFade = Math.max(0, smokeFade - dt * 0.45);
    }

    const showCycle = clock % 24.0;
    const blueTarget = isFireShowHours
      ? 0
      : showCycle < 10.5
        ? 0
        : showCycle < 12.0
          ? THREE.MathUtils.smoothstep(showCycle, 10.5, 12.0)
          : showCycle < 22.5
            ? 1
            : 1 - THREE.MathUtils.smoothstep(showCycle, 22.5, 24.0);
    const blueMix = lampFactor > 0.2 ? blueTarget * THREE.MathUtils.clamp((lampFactor - 0.2) / 0.3, 0, 1) : 0;

    const firePulse = (Math.sin(clock * 11.2) + 1) * 0.5;
    const activeFireStrength = isFireShowHours ? Math.max(0, firePower) : 0;

    dragonFireMat.emissiveIntensity = isFireShowHours
      ? 0.72 + activeFireStrength * (2.3 + firePulse * 0.65)
      : 0;
    dragonFireMat.opacity = isFireShowHours ? Math.min(0.95, 0.22 + activeFireStrength * 0.73) : 0;

    if (dragonMouthGlowRef) {
      dragonMouthGlowRef.material = dragonFireMat;
      dragonMouthGlowRef.visible = isFireShowHours;
      if (isFireShowHours) {
        dragonMouthGlowRef.scale.setScalar(0.84 + activeFireStrength * (0.76 + firePulse * 0.24));
      }
    }

    // Shift Cầu Rồng's 5-tube arches & sculpted head (Royal Gold during fire show, Gold<->Sapphire outside 20:00-24:00)
    dragonBridgeGoldMat.color.setRGB(
      THREE.MathUtils.lerp(0.98, 0.32, blueMix),
      THREE.MathUtils.lerp(0.80, 0.78, blueMix),
      THREE.MathUtils.lerp(0.08, 0.99, blueMix)
    );
    dragonBridgeGoldMat.emissive.setRGB(
      THREE.MathUtils.lerp(0.96, 0.14, blueMix),
      THREE.MathUtils.lerp(0.62, 0.65, blueMix),
      THREE.MathUtils.lerp(0.04, 0.96, blueMix)
    );
    dragonBridgeGoldMat.emissiveIntensity =
      0.28 + lampFactor * (0.98 + 0.18 * blueMix) + activeFireStrength * 0.24;

    dragonBridgeBodyMat.color.setRGB(
      THREE.MathUtils.lerp(0.92, 0.22, blueMix),
      THREE.MathUtils.lerp(0.70, 0.62, blueMix),
      THREE.MathUtils.lerp(0.03, 0.94, blueMix)
    );
    dragonBridgeBodyMat.emissive.setRGB(
      THREE.MathUtils.lerp(0.85, 0.08, blueMix),
      THREE.MathUtils.lerp(0.46, 0.48, blueMix),
      THREE.MathUtils.lerp(0.02, 0.88, blueMix)
    );
    dragonBridgeBodyMat.emissiveIntensity = 0.16 + lampFactor * (0.62 + 0.20 * blueMix);

    dragonBridgeDarkMat.color.setRGB(
      THREE.MathUtils.lerp(0.71, 0.14, blueMix),
      THREE.MathUtils.lerp(0.33, 0.39, blueMix),
      THREE.MathUtils.lerp(0.04, 0.76, blueMix)
    );
    dragonBridgeDarkMat.emissiveIntensity = 0.10 + lampFactor * 0.35;

    for (let dl = 0; dl < dragonLights.length; dl++) {
      dragonLights[dl].color.setRGB(
        THREE.MathUtils.lerp(0.96, 0.20, blueMix),
        THREE.MathUtils.lerp(0.62, 0.74, blueMix),
        THREE.MathUtils.lerp(0.04, 0.98, blueMix)
      );
    }

    // Dynamic Fire Jet Illumination on Dragon Head, Walkway Crowd & Han River Water
    if (isNearWater && isFireShowHours && activeFireStrength > 0.03) {
      dragonFireLight.visible = true;
      dragonFireLight.intensity = activeFireStrength * (66.0 + Math.sin(clock * 17.0) * 14.0);
      dragonFireLight.position.set(
        DRAGON_BRIDGE_CENTER_X + Math.sin(clock * 9.0) * 0.55,
        dragonHeadAnchorY + 0.8 + activeFireStrength * 1.1,
        dragonMouthZ - 7.5 - activeFireStrength * 4.5
      );
    } else {
      dragonFireLight.visible = false;
      dragonFireLight.intensity = 0;
    }

    // 1. Dense Volumetric Fireball Billows Streaming North (-Z) from Dragon Mouth (no sharp cone mesh!)
    const showFlames = isNearWater && isFireShowHours && activeFireStrength > 0.04;
    for (let i = 0; i < dragonFlameBillows.length; i++) {
      const fb = dragonFlameBillows[i];
      fb.sprite.visible = showFlames;
      if (showFlames) {
        const life = (clock * 1.12 * fb.speedMul + fb.phase) % 1;
        const reach = (18.5 + activeFireStrength * 7.2) * fb.reachMul * life;
        const arcY = -0.55 * life + 5.6 * life * life + fb.liftBias * life;
        const turbX =
          fb.lateralBias * Math.pow(life, 0.85) +
          Math.sin(clock * fb.swayFreq + i * 2.1) * fb.swayAmp * (0.2 + life * 1.65);
        fb.sprite.position.set(
          DRAGON_BRIDGE_CENTER_X + turbX,
          dragonHeadAnchorY + 0.08 + arcY,
          dragonMouthZ + 0.45 - reach
        );
        const sizeCurve = 0.72 + Math.sin(Math.min(1, life * 1.12) * Math.PI) * 1.92;
        const sz = fb.baseScale * sizeCurve * (0.78 + activeFireStrength * 0.46);
        fb.sprite.scale.set(sz, sz * (0.94 + 0.14 * Math.sin(clock * 5.0 + i)), 1);
        fb.mat.rotation = clock * fb.spinSpeed + i * 0.85;

        // Hot incandescent yellow-white core -> vivid fire orange -> deep crimson-red tip
        if (life < 0.22) {
          const t = life / 0.22;
          fb.mat.color.setRGB(1.0, THREE.MathUtils.lerp(0.98, 0.70, t), THREE.MathUtils.lerp(0.76, 0.18, t));
        } else {
          const t = (life - 0.22) / 0.78;
          fb.mat.color.setRGB(
            THREE.MathUtils.lerp(1.0, 0.92, t),
            THREE.MathUtils.lerp(0.70, 0.15, t),
            THREE.MathUtils.lerp(0.18, 0.02, t)
          );
        }
        const envAlpha = Math.sin(Math.pow(life, 0.6) * Math.PI);
        fb.mat.opacity = envAlpha * 0.92 * activeFireStrength;
      }
    }

    // 2. Hot Glowing Ember Sparks Drifting Upward & Northward from Fire Plume
    const showEmbers = isNearWater && (isFireShowHours || smokeFade > 0.08);
    for (let i = 0; i < dragonEmberSparks.length; i++) {
      const em = dragonEmberSparks[i];
      em.sprite.visible = showEmbers;
      if (showEmbers) {
        const life = (clock * 0.72 + em.phase) % 1;
        const energy = isFireShowHours ? Math.max(0.22, activeFireStrength) : smokeFade * 0.25;
        em.sprite.position.set(
          DRAGON_BRIDGE_CENTER_X + em.spreadX * life + Math.sin(clock * 4.2 + i) * 0.55 * life,
          dragonHeadAnchorY + 0.15 + life * em.riseGain * (0.65 + energy * 0.45),
          dragonMouthZ - 1.2 - life * em.reachZ
        );
        const sz = em.baseScale * (1.15 - life * 0.7);
        em.sprite.scale.set(sz, sz, 1);
        em.mat.color.setRGB(1.0, THREE.MathUtils.lerp(0.92, 0.36, life), THREE.MathUtils.lerp(0.45, 0.05, life));
        em.mat.opacity = Math.sin(life * Math.PI) * 0.92 * energy;
      }
    }

    // 3. Layered Volumetric Smoke Column (Fire-lit amber base -> dark slate rising billows)
    const showSmoke = isNearWater && smokeFade > 0.02;
    for (let i = 0; i < dragonSmokePuffs.length; i++) {
      const p = dragonSmokePuffs[i];
      p.sprite.visible = showSmoke;
      if (showSmoke) {
        const life = (clock * 0.26 + p.phase) % 1;
        const spread = 0.85 + life * 2.55;
        const riseY = life * 3.2 + life * life * p.driftY;
        p.sprite.position.set(
          DRAGON_BRIDGE_CENTER_X + p.driftX * life + Math.sin(clock * 1.4 + i) * 0.65 * life,
          dragonHeadAnchorY + 0.25 + riseY,
          dragonMouthZ - 3.6 - life * p.reachZ
        );
        const sz = p.baseScale * spread;
        p.sprite.scale.set(sz, sz, 1);

        // Smoke illuminated warm orange-amber near the fire jet, cooling to charcoal-slate higher up
        const warmMix = Math.max(0, 1 - life / 0.38) * activeFireStrength;
        p.mat.color.setRGB(
          THREE.MathUtils.lerp(0.34, 0.92, warmMix),
          THREE.MathUtils.lerp(0.37, 0.52, warmMix),
          THREE.MathUtils.lerp(0.42, 0.26, warmMix)
        );
        const breathSmokeScale = isFireShowHours ? 0.52 + activeFireStrength * 0.48 : 1.0;
        const fade = Math.sin(Math.pow(life, 0.75) * Math.PI);
        p.mat.opacity = fade * 0.52 * smokeFade * breathSmokeScale;
      }
    }

    const showHalos = isNearWater && (isFireShowHours || isNightShow);
    for (let i = 0; i < dragonGlowSprites.length; i++) {
      const g = dragonGlowSprites[i];
      const showThisHalo = showHalos && (g.kind !== 'mouth' || isFireShowHours);
      g.sprite.visible = showThisHalo;
      if (showThisHalo) {
        const pulse = 0.72 + 0.28 * Math.sin(clock * 2.5 + g.phaseOffset);
        if (g.kind === 'mouth' || g.kind === 'mane' || g.kind === 'arch') {
          g.mat.color.setRGB(
            THREE.MathUtils.lerp(0.99, 0.24, blueMix),
            THREE.MathUtils.lerp(0.66, 0.80, blueMix),
            THREE.MathUtils.lerp(0.18, 1.0, blueMix)
          );
        }
        g.mat.opacity =
          g.kind === 'mouth'
            ? (0.28 + activeFireStrength * 0.62) * pulse
            : 0.34 * pulse * lampFactor;
      }
    }

    bridgeCyanMat.emissiveIntensity = 0.35 + lampFactor * (1.15 + 0.25 * Math.sin(clock * 1.6));
    bridgeMagentaMat.emissiveIntensity = 0.35 + lampFactor * (1.1 + 0.25 * Math.cos(clock * 1.6));
    tranThiLyVioletMat.emissiveIntensity = 0.08 + lampFactor * (1.25 + 0.25 * Math.sin(clock * 1.3 + 0.8));
    tranThiLyRedCableMat.emissiveIntensity = lampFactor * 0.6;
    ttlSailWhiteMat.emissiveIntensity = 0.08 + lampFactor * 0.32;
    ttlWhiteCableMat.emissiveIntensity = 0.10 + lampFactor * 0.28;
    ttlCanopySilverMat.emissiveIntensity = 0.06 + lampFactor * 0.22;
    dragonGoldMat.emissiveIntensity = 0.24 + lampFactor * 1.05;
    dragonBodyGoldMat.emissiveIntensity = 0.14 + lampFactor * 0.52;
    waterMat.emissiveIntensity = 0.02 + lampFactor * 0.34;
    waterWestMat.emissiveIntensity = 0.02 + lampFactor * 0.34;
    warmLanternMat.emissiveIntensity = 0.15 + lampFactor * 1.25;
    loveHeartLanternMat.emissiveIntensity = 0.20 + lampFactor * 1.18;
    westBachDangSignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    bachDangSignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    sonTaySignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    diorSignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    northBankSignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    dragonNorthBankSignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    tranThiLyNorthBankSignMat.emissiveIntensity = 0.16 + lampFactor * 0.44;
    carpPlaqueMat.emissiveIntensity = 0.35 + lampFactor * 1.45;
    carpMarbleMat.emissiveIntensity = lampFactor * 0.42;
    carpScaleMat.emissiveIntensity = lampFactor * 0.38;
    carpUplightLensMat.emissiveIntensity = 0.20 + lampFactor * 2.1;
    for (let uli = 0; uli < carpUplightHalos.length; uli++) {
      carpUplightHalos[uli].mat.opacity = lampFactor * (uli >= 4 ? 0.24 : 0.42);
    }
    sharedPoolMat.opacity = lampFactor * 0.65;

    // Animate Cá Chép Hóa Rồng Parabolic Water Fountain & Splash (White/Cyan Day -> Vivid Magenta/Pink-Gold Night!)
    carpStreamTex.offset.x = -(clock * 1.35) % 1;
    carpWaterArcMat.emissiveIntensity = 0.22 + lampFactor * 1.85;
    carpWaterArcMat.opacity = 0.48 + lampFactor * 0.34;
    carpWaterArcMat.color.setRGB(
      THREE.MathUtils.lerp(0.90, 1.0, lampFactor),
      THREE.MathUtils.lerp(0.97, 0.50, lampFactor),
      THREE.MathUtils.lerp(1.0, 0.84, lampFactor)
    );
    carpWaterCoreMat.opacity = 0.46 + lampFactor * 0.30;
    carpWaterCoreMat.color.setRGB(
      THREE.MathUtils.lerp(0.94, 1.0, lampFactor),
      THREE.MathUtils.lerp(0.99, 0.66, lampFactor),
      THREE.MathUtils.lerp(1.0, 0.88, lampFactor)
    );
    for (let j = 0; j < carpJetDrops.length; j++) {
      const jd = carpJetDrops[j];
      const u = (clock * 0.72 + jd.phase) % 1;
      getCarpWaterArcPoint(u, carpArcPos);
      jd.sprite.position.set(
        carpArcPos.x + jd.jitterX * u,
        carpArcPos.y + Math.sin(clock * 6.0 + j) * 0.08 * u,
        carpArcPos.z + jd.jitterZ * u
      );
      const sz = jd.scale * (0.45 + u * 2.25);
      jd.sprite.scale.set(sz, sz, 1);
      jd.mat.color.setRGB(
        THREE.MathUtils.lerp(0.88, 1.0, lampFactor),
        THREE.MathUtils.lerp(0.97, 0.44 + (1 - u) * 0.30, lampFactor),
        THREE.MathUtils.lerp(1.0, 0.80, lampFactor)
      );
      jd.mat.opacity = Math.sin(Math.pow(u, 0.55) * Math.PI) * (0.36 + lampFactor * 0.30);
    }
    for (let sp = 0; sp < carpSplashRings.length; sp++) {
      const sr = carpSplashRings[sp];
      const u = (clock * 0.98 + sr.phase) % 1;
      const ang = sp * 1.65 + clock * 0.4;
      const rad = u * 2.45;
      sr.sprite.position.set(
        carpSplashWorld.x + Math.cos(ang) * rad,
        HAN_RIVER_WATER_Y + 0.12 + Math.sin(u * Math.PI) * 1.25,
        carpSplashWorld.z + Math.sin(ang) * rad
      );
      const sz = 0.75 + u * 2.1;
      sr.sprite.scale.set(sz, sz * 0.72, 1);
      sr.mat.color.setRGB(
        THREE.MathUtils.lerp(0.92, 1.0, lampFactor),
        THREE.MathUtils.lerp(0.98, 0.56, lampFactor),
        THREE.MathUtils.lerp(1.0, 0.86, lampFactor)
      );
      sr.mat.opacity = Math.sin(u * Math.PI) * (0.46 + lampFactor * 0.28);
    }

    // Cruise yachts gliding East-West across Sông Hàn & moored yachts gently bobbing at Bến Du Thuyền
    for (let i = 0; i < yachtWarmGlowMats.length; i++) {
      yachtWarmGlowMats[i].emissiveIntensity = 0.06 + lampFactor * 1.45;
    }
    for (let i = 0; i < yachtWaterGlowMats.length; i++) {
      yachtWaterGlowMats[i].emissiveIntensity = 0.04 + lampFactor * 1.65;
    }
    for (let i = 0; i < yachtNightHaloMats.length; i++) {
      yachtNightHaloMats[i].opacity = lampFactor * 0.56;
    }
    // Update all 3 Marina Live NPC Excursion Yachts (Bays 1, 2, 3) + Retractable Gangways + Boarding Passengers
    for (let m = 0; m < marinaExcursions.length; m++) {
      const ex = marinaExcursions[m];
      ex.timer += dt;
      const gangwayTargetTilt = ex.state === 'cruising' ? -0.85 : -0.18;
      ex.gangwayTilt = THREE.MathUtils.lerp(ex.gangwayTilt, gangwayTargetTilt, Math.min(1, dt * 3.2));
      if (ex.gangwayPivot) {
        ex.gangwayPivot.rotation.x = ex.gangwayTilt;
      }

      if (ex.state === 'docked_boarding') {
        ex.x = THREE.MathUtils.lerp(ex.x, ex.bayX, Math.min(1, dt * 4));
        ex.z = THREE.MathUtils.lerp(ex.z, -317.8, Math.min(1, dt * 4));
        ex.yaw = Math.PI / 2;
        let allAboard = true;
        for (let p = 0; p < ex.peds.length; p++) {
          if (ex.peds[p].mode !== 'on_board') allAboard = false;
        }
        if (allAboard || ex.timer > ex.boardTimeout) {
          for (let p = 0; p < ex.peds.length; p++) {
            const ep = ex.peds[p];
            if (ep.mode !== 'on_board') {
              ep.mode = 'on_board';
              ex.boat.add(ep.actor.grp);
              ep.actor.grp.position.set(ep.boardSlot.x, ep.boardSlot.y, ep.boardSlot.z);
              ep.actor.grp.rotation.y = ep.boardSlot.yaw;
              setYachtHumanAnim(ep.actor, 'Idle');
            }
          }
          ex.state = 'cruising';
          ex.wpIdx = 1;
          ex.timer = 0;
        }
      } else if (ex.state === 'cruising') {
        const wp = ex.cruisePath[ex.wpIdx];
        const dx = wp.x - ex.x;
        const dz = wp.z - ex.z;
        const dist = Math.hypot(dx, dz);
        const boatSpeed = ex.wpIdx <= 1 || ex.wpIdx >= ex.cruisePath.length - 2 ? 3.0 : 6.2;
        if (dist < 1.2) {
          if (ex.wpIdx < ex.cruisePath.length - 1) {
            ex.wpIdx++;
          } else {
            ex.x = ex.bayX;
            ex.z = -317.8;
            ex.yaw = Math.PI / 2;
            ex.state = 'docked_disembarking';
            ex.timer = 0;
            for (let p = 0; p < ex.peds.length; p++) {
              const ep = ex.peds[p];
              ep.mode = 'walking_disembark';
              ep.wpIdx = 0;
              staticGroup.add(ep.actor.grp);
              ep.actor.grp.position.set(ex.bayX + (p - 1.5) * 0.28, -0.24, -319.55);
              setYachtHumanAnim(ep.actor, 'Walk');
            }
          }
        } else {
          const step = Math.min(dist, boatSpeed * dt);
          ex.x += (dx / dist) * step;
          ex.z += (dz / dist) * step;
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - ex.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ex.yaw += diff * Math.min(1, dt * 1.9);
        }
      } else {
        ex.x = THREE.MathUtils.lerp(ex.x, ex.bayX, Math.min(1, dt * 4));
        ex.z = THREE.MathUtils.lerp(ex.z, -317.8, Math.min(1, dt * 4));
        let diff = Math.PI / 2 - ex.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        ex.yaw += diff * Math.min(1, dt * 3);

        let allOff = true;
        for (let p = 0; p < ex.peds.length; p++) {
          if (ex.peds[p].mode === 'walking_disembark') allOff = false;
        }
        if ((allOff && ex.timer > 4.5) || ex.timer > 11.0) {
          ex.state = 'docked_boarding';
          ex.timer = 0;
          for (let p = 0; p < ex.peds.length; p++) {
            const ep = ex.peds[p];
            ep.mode = 'walking_board';
            ep.wpIdx = 0;
            setYachtHumanAnim(ep.actor, 'Walk');
          }
        }
      }

      ex.boat.position.set(
        ex.x,
        HAN_RIVER_WATER_Y + 0.05 + Math.sin(clock * 1.68 + ex.phase) * 0.032,
        ex.z
      );
      ex.boat.rotation.order = 'YXZ';
      ex.boat.rotation.y = ex.yaw;
      ex.boat.rotation.z = Math.sin(clock * 1.18 + ex.phase) * 0.012;
      ex.boat.rotation.x = Math.cos(clock * 1.40 + ex.phase) * 0.009;
      if (ex.handle.radarScanner) {
        ex.handle.radarScanner.rotation.y = clock * (ex.state === 'cruising' ? 1.85 : 0.75);
      }
      const isExcursionMoving = ex.state === 'cruising';
      for (let w = 0; w < ex.handle.wakeMeshes.length; w++) {
        const wm = ex.handle.wakeMeshes[w];
        wm.visible = isExcursionMoving;
        if (isExcursionMoving) {
          wm.scale.z = 0.92 + 0.14 * Math.sin(clock * 3.4 + w + ex.phase);
        }
      }

      for (let p = 0; p < ex.peds.length; p++) {
        const ep = ex.peds[p];
        if (ep.mode === 'on_board') continue;

        const offset = (p - (ex.peds.length - 1) * 0.5) * 0.22;
        const boardWps: ReadonlyArray<{ x: number; z: number }> = [
          { x: ex.bayX + offset, z: -325.05 }, // Top of bay stairs
          { x: ex.bayX + offset * 0.85, z: -323.5 },  // Lower boarding bay
          { x: ex.bayX + offset * 0.7, z: -321.5 },   // Straight through OPEN Gate!
          { x: ex.bayX + offset * 0.6, z: -319.55 },  // Across gangway onto yacht deck
        ];
        const disembarkWps: ReadonlyArray<{ x: number; z: number }> = [
          { x: ex.bayX + offset * 0.7, z: -321.5 },   // Back through OPEN Gate!
          { x: ex.bayX + offset * 0.9, z: -323.6 },
          { x: ex.bayX + offset, z: -325.1 },         // Up stairs onto Cầu Tình Yêu
          { x: ep.pierHome.x, z: ep.pierHome.z },
        ];

        const wps = ep.mode === 'walking_board' ? boardWps : disembarkWps;
        if (ep.wpIdx >= wps.length) {
          if (ep.mode === 'walking_board') {
            ep.mode = 'on_board';
            ex.boat.add(ep.actor.grp);
            ep.actor.grp.position.set(ep.boardSlot.x, ep.boardSlot.y, ep.boardSlot.z);
            ep.actor.grp.rotation.y = ep.boardSlot.yaw;
            setYachtHumanAnim(ep.actor, 'Idle');
          } else {
            ep.mode = 'pier_wait';
            ep.actor.grp.rotation.y = ep.pierHome.yaw;
            setYachtHumanAnim(ep.actor, 'Idle');
          }
          continue;
        }

        const tgt = wps[ep.wpIdx];
        const dx = tgt.x - ep.actor.grp.position.x;
        const dz = tgt.z - ep.actor.grp.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.22) {
          ep.wpIdx++;
        } else {
          const walkSpd = 1.3;
          const step = Math.min(dist, walkSpd * dt);
          const nx = ep.actor.grp.position.x + (dx / dist) * step;
          const nz = ep.actor.grp.position.z + (dz / dist) * step;
          ep.actor.grp.position.set(nx, getExcursionPierWalkY(nz), nz);
          ep.actor.grp.rotation.y = Math.atan2(dx, dz);
          ep.actor.phase += dt * walkSpd * 4.2;
          const sw = Math.sin(ep.actor.phase) * 0.45;
          ep.actor.legL.rotation.x = sw;
          ep.actor.legR.rotation.x = -sw;
          ep.actor.armL.rotation.x = -sw * 0.6;
          ep.actor.armR.rotation.x = ep.actor.glbHandle.hasActiveUmbrella() ? -0.88 : sw * 0.6;
        }
      }
    }

    for (let i = 0; i < cruiseBoats.length; i++) {
      const b = cruiseBoats[i];
      b.x += b.dir * b.speed * dt;
      if (b.dir > 0 && b.x > 542) b.x = -330;
      if (b.dir < 0 && b.x < -330) b.x = 542;
      b.grp.position.x = b.x;
      b.grp.position.y = HAN_RIVER_WATER_Y + 0.05 + Math.sin(clock * 1.7 + b.phase) * 0.036;
      b.grp.rotation.z = Math.sin(clock * 1.15 + b.phase) * 0.012;
      b.grp.rotation.x = Math.cos(clock * 1.35 + b.phase) * 0.009;
      if (b.handle.radarScanner) {
        b.handle.radarScanner.rotation.y = clock * 1.85;
      }
      for (let w = 0; w < b.handle.wakeMeshes.length; w++) {
        b.handle.wakeMeshes[w].scale.z = 0.92 + 0.14 * Math.sin(clock * 3.4 + w + b.phase);
      }
    }

    // Cross-River NPC Vehicles (Đường Bạch Đằng <-> Cầu Sông Hàn <-> Ngã Tư Bờ Bắc)
    for (let i = 0; i < riverVehicles.length; i++) {
      const v = riverVehicles[i];
      if (v.branchCooldown > 0) v.branchCooldown = Math.max(0, v.branchCooldown - dt);
      const prevX = v.x;
      const prevZ = v.z;
      let braking = false;
      const jamBypass = Boolean(coordinator?.isJamBypassActive(v.id));

      if (v.mode === 'turn_curve') {
        const fwdX = Math.sin(v.yaw);
        const fwdZ = Math.cos(v.yaw);
        const clr = coordinator?.getForwardClearance({
          id: v.id,
          x: v.x,
          y: v.y,
          z: v.z,
          moveDirX: fwdX,
          moveDirZ: fwdZ,
          halfW: v.halfW,
          halfL: v.halfL,
          lookahead: 6.5,
          minGap: 1.5,
          priority: v.priority + 12,
        });
        const baseFactor = clr ? (clr.blocked ? 0 : Math.max(0.25, clr.maxSpeedFactor)) : 1;
        const factor = jamBypass ? Math.max(0.85, baseFactor) : baseFactor;
        braking = factor < 0.7;
        v.turnT = Math.min(1, v.turnT + (dt / v.turnDuration) * factor);
        const t = v.turnT;
        const omt = 1 - t;
        const nx = omt * omt * v.turnStartX + 2 * omt * t * v.turnCtrlX + t * t * v.turnEndX;
        const nz = omt * omt * v.turnStartZ + 2 * omt * t * v.turnCtrlZ + t * t * v.turnEndZ;
        const vx = (nx - v.x) / Math.max(dt, 0.001);
        const vz = (nz - v.z) / Math.max(dt, 0.001);
        if (Math.hypot(vx, vz) > 0.25) {
          v.yaw = Math.atan2(vx, vz);
        }
        v.x = nx;
        v.z = nz;
        v.speed = Math.hypot(vx, vz);
        if (v.turnT >= 1) {
          v.mode = v.turnNextMode;
          v.dirX = v.turnNextDirX;
          v.dirZ = v.turnNextDirZ;
          v.laneCoord = v.turnNextLane;
          v.yaw =
            v.mode === 'bridge_ns' || v.mode === 'nb_north_leg'
              ? v.dirZ > 0
                ? 0
                : Math.PI
              : v.dirX > 0
                ? Math.PI / 2
                : -Math.PI / 2;
        }
      } else if (v.mode === 'bd_ew') {
        // Cruising Đường Bạch Đằng (X = -212 .. 526), stopping/branching at Cầu Sông Hàn (193.5), Cầu Rồng (370.0) & Cầu Trần Thị Lý (503.0)
        let sigFactor = 1;
        const frontX = v.x + v.dirX * v.halfL;
        for (const cx of [HAN_BRIDGE_CENTER_X, DRAGON_BRIDGE_CENTER_X, TRAN_THI_LY_BRIDGE_CENTER_X]) {
          const distToSouthBox = v.dirX > 0 ? cx - 14.1 - frontX : frontX - (cx + 14.1);
          if (distToSouthBox >= -0.3 && distToSouthBox <= 15.0) {
            if (
              coordinator &&
              !coordinator.isIntersectionBoxClearForAxis({
                id: v.id,
                centerX: cx,
                centerZ: -117.5,
                axis: 'ew',
                y: -0.26,
              }) &&
              distToSouthBox <= 5.0
            ) {
              sigFactor = Math.min(
                sigFactor,
                distToSouthBox <= 1.4 ? 0 : Math.max(0.08, (distToSouthBox - 1.4) / 3.6)
              );
            } else if (southEwPhase !== 'green' && !(southEwPhase === 'yellow' && distToSouthBox < 1.5)) {
              sigFactor = Math.min(
                sigFactor,
                distToSouthBox <= 1.2 ? 0 : Math.max(0.08, (distToSouthBox - 1.2) / 13.8)
              );
            }
          }
        }
        if (jamBypass) {
          sigFactor = 1;
        }

        const clr = coordinator?.getForwardClearance({
          id: v.id,
          x: v.x,
          y: -0.26,
          z: v.z,
          moveDirX: v.dirX,
          moveDirZ: 0,
          halfW: v.halfW,
          halfL: v.halfL,
          lookahead: 13.0,
          minGap: 2.4,
          priority: v.priority,
        });
        const clrFactor = clr ? (clr.blocked ? 0 : clr.maxSpeedFactor) : 1;
        const factor = Math.min(sigFactor, clrFactor);
        braking = factor < 0.72;
        const targetSpd = v.cruiseSpeed * factor;
        v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        v.x += v.dirX * v.speed * dt;
        v.z = THREE.MathUtils.lerp(v.z, v.laneCoord, Math.min(1, dt * 4.0));
        v.yaw = v.dirX > 0 ? Math.PI / 2 : -Math.PI / 2;

        // Turn onto Cầu Sông Hàn (193.5), Cầu Rồng (370.0) or Cầu Trần Thị Lý (503.0) when crossing Bạch Đằng intersection boxes
        let branched = false;
        if (v.branchCooldown <= 0 && southEwPhase === 'green') {
          for (const cx of [HAN_BRIDGE_CENTER_X, DRAGON_BRIDGE_CENTER_X, TRAN_THI_LY_BRIDGE_CENTER_X]) {
            const atBridgeBox =
              (v.dirX > 0 && v.x >= cx - 7.0 && v.x <= cx + 1.0) ||
              (v.dirX < 0 && v.x <= cx + 7.0 && v.x >= cx - 1.0);
            if (atBridgeBox) {
              if (v.routeCounter % 2 === 0) {
                const bridgeLaneX = cx + (v.kind === 'car' ? 2.3 : 5.7);
                v.bridgeCenterX = cx;
                v.routeCounter++;
                beginCurveTurn(v, bridgeLaneX, v.z, bridgeLaneX, -128.0, 'bridge_ns', v.dirX, -1, bridgeLaneX, 1.25);
              } else {
                v.branchCooldown = 2.0;
                v.routeCounter++;
              }
              branched = true;
              break;
            }
          }
        }
        if (!branched) {
          if (v.dirX > 0 && v.x >= 526.0) {
            v.dirX = -1;
            v.laneCoord = v.kind === 'car' ? CITY_ROAD_BOUNDS.bachDangWBZ : -124.0;
            v.z = v.laneCoord;
            v.yaw = -Math.PI / 2;
          } else if (v.dirX < 0 && v.x <= -212.0) {
            v.dirX = 1;
            v.laneCoord = v.kind === 'car' ? CITY_ROAD_BOUNDS.bachDangEBZ : -111.0;
            v.z = v.laneCoord;
            v.yaw = Math.PI / 2;
          }
        }
      } else if (v.mode === 'bridge_ns') {
        // Crossing Cầu Sông Hàn (193.5) or Cầu Rồng (370.0) with full Y slope!
        const cx = v.bridgeCenterX;
        let sigFactor = 1;
        if (v.dirZ < 0) {
          // Approaching Ngã Tư Bờ Bắc (Z = -350.6 stop line)
          const frontZ = v.z - v.halfL;
          const dist = frontZ - -350.6;
          if (dist >= -0.3 && dist <= 15.0) {
            if (
              coordinator &&
              !coordinator.isIntersectionBoxClearForAxis({
                id: v.id,
                centerX: cx,
                centerZ: NORTH_BANK_INTERSECTION_CENTER_Z,
                axis: 'ns',
                y: -0.26,
              }) &&
              dist <= 5.0
            ) {
              sigFactor = dist <= 1.4 ? 0 : Math.max(0.08, (dist - 1.4) / 3.6);
            } else if (northNsPhase !== 'green' && !(northNsPhase === 'yellow' && dist < 1.5)) {
              sigFactor = dist <= 1.2 ? 0 : Math.max(0.08, (dist - 1.2) / 13.8);
            }
          }
        } else {
          // Returning Southbound toward Ngã Tư Bạch Đằng (Z = -129.1 stop line)
          const frontZ = v.z + v.halfL;
          const dist = -129.1 - frontZ;
          if (dist >= -0.3 && dist <= 15.0) {
            if (
              coordinator &&
              !coordinator.isIntersectionBoxClearForAxis({
                id: v.id,
                centerX: cx,
                centerZ: -117.5,
                axis: 'ns',
                y: -0.26,
              }) &&
              dist <= 5.0
            ) {
              sigFactor = dist <= 1.4 ? 0 : Math.max(0.08, (dist - 1.4) / 3.6);
            } else if (southNsPhase !== 'green' && !(southNsPhase === 'yellow' && dist < 1.5)) {
              sigFactor = dist <= 1.2 ? 0 : Math.max(0.08, (dist - 1.2) / 13.8);
            }
          }
        }
        if (jamBypass) {
          sigFactor = 1;
        }

        const clr = coordinator?.getForwardClearance({
          id: v.id,
          x: v.x,
          y: v.y,
          z: v.z,
          moveDirX: 0,
          moveDirZ: v.dirZ,
          halfW: v.halfW,
          halfL: v.halfL,
          lookahead: 13.0,
          minGap: 2.4,
          priority: v.priority,
        });
        const clrFactor = clr ? (clr.blocked ? 0 : clr.maxSpeedFactor) : 1;
        const factor = Math.min(sigFactor, clrFactor);
        braking = factor < 0.72;
        const targetSpd = v.cruiseSpeed * factor;
        v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        v.z += v.dirZ * v.speed * dt;
        v.x = THREE.MathUtils.lerp(v.x, v.laneCoord, Math.min(1, dt * 4.0));
        v.yaw = v.dirZ > 0 ? 0 : Math.PI;

        if (v.dirZ < 0 && v.z <= -352.5) {
          // Enter Ngã Tư Bờ Bắc: turn East, West, or go straight into North Leg!
          const choice = v.routeCounter % 3;
          v.routeCounter++;
          if (choice === 0) {
            const ewZ = v.kind === 'car' ? -358.0 : -355.8;
            beginCurveTurn(v, v.x, ewZ, cx + 13.0, ewZ, 'nb_ew', 1, -1, ewZ, 1.25);
          } else if (choice === 1) {
            const ewZ = v.kind === 'car' ? -366.0 : -368.2;
            beginCurveTurn(v, v.x, ewZ, cx - 13.0, ewZ, 'nb_ew', -1, -1, ewZ, 1.25);
          } else {
            v.mode = 'nb_north_leg';
          }
        } else if (v.dirZ > 0 && v.z >= -124.5) {
          // Enter Ngã Tư Bạch Đằng: turn East or West onto Đường Bạch Đằng!
          const goEast = v.routeCounter % 2 === 0;
          v.routeCounter++;
          const nextDirX: 1 | -1 = goEast ? 1 : -1;
          const ewZ = goEast
            ? v.kind === 'car'
              ? CITY_ROAD_BOUNDS.bachDangEBZ
              : -111.0
            : v.kind === 'car'
              ? CITY_ROAD_BOUNDS.bachDangWBZ
              : -124.0;
          const endX = goEast ? cx + 13.0 : cx - 13.0;
          beginCurveTurn(v, v.x, ewZ, endX, ewZ, 'bd_ew', nextDirX, 1, ewZ, 1.25);
        }
      } else if (v.mode === 'nb_ew') {
        // East-West Boulevard on North Bank (Z = -388.0, X = 84 .. NORTH_BANK_EAST_END_X - 8)
        let sigFactor = 1;
        const frontX = v.x + v.dirX * v.halfL;
        for (const cx of [
          NORTH_BANK_INTERSECTION_CENTER_X,
          DRAGON_BRIDGE_CENTER_X,
          TRAN_THI_LY_BRIDGE_CENTER_X,
        ]) {
          const distToNorthBox = v.dirX > 0 ? cx - 14.1 - frontX : frontX - (cx + 14.1);
          if (distToNorthBox >= -0.3 && distToNorthBox <= 15.0) {
            if (
              coordinator &&
              !coordinator.isIntersectionBoxClearForAxis({
                id: v.id,
                centerX: cx,
                centerZ: NORTH_BANK_INTERSECTION_CENTER_Z,
                axis: 'ew',
                y: -0.26,
              }) &&
              distToNorthBox <= 5.0
            ) {
              sigFactor = Math.min(
                sigFactor,
                distToNorthBox <= 1.4 ? 0 : Math.max(0.08, (distToNorthBox - 1.4) / 3.6)
              );
            } else if (northEwPhase !== 'green' && !(northEwPhase === 'yellow' && distToNorthBox < 1.5)) {
              sigFactor = Math.min(
                sigFactor,
                distToNorthBox <= 1.2 ? 0 : Math.max(0.08, (distToNorthBox - 1.2) / 13.8)
              );
            }
          }
        }
        if (jamBypass) {
          sigFactor = 1;
        }

        const clr = coordinator?.getForwardClearance({
          id: v.id,
          x: v.x,
          y: -0.26,
          z: v.z,
          moveDirX: v.dirX,
          moveDirZ: 0,
          halfW: v.halfW,
          halfL: v.halfL,
          lookahead: 13.0,
          minGap: 2.4,
          priority: v.priority,
        });
        const clrFactor = clr ? (clr.blocked ? 0 : clr.maxSpeedFactor) : 1;
        const factor = Math.min(sigFactor, clrFactor);
        braking = factor < 0.72;
        const targetSpd = v.cruiseSpeed * factor;
        v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        v.x += v.dirX * v.speed * dt;
        v.z = THREE.MathUtils.lerp(v.z, v.laneCoord, Math.min(1, dt * 4.0));
        v.yaw = v.dirX > 0 ? Math.PI / 2 : -Math.PI / 2;

        let branchedNb = false;
        if (v.branchCooldown <= 0 && northEwPhase === 'green') {
          for (const cx of [
            NORTH_BANK_INTERSECTION_CENTER_X,
            DRAGON_BRIDGE_CENTER_X,
            TRAN_THI_LY_BRIDGE_CENTER_X,
          ]) {
            const atNbBox =
              (v.dirX > 0 && v.x >= cx - 7.0 && v.x <= cx + 1.0) ||
              (v.dirX < 0 && v.x <= cx + 7.0 && v.x >= cx - 1.0);
            if (atNbBox) {
              if (v.routeCounter % 2 === 0) {
                // Turn South back across Cầu Sông Hàn, Cầu Rồng, or Cầu Trần Thị Lý!
                const bridgeLaneX = cx - (v.kind === 'car' ? 2.3 : 5.7);
                v.bridgeCenterX = cx;
                v.routeCounter++;
                beginCurveTurn(v, bridgeLaneX, v.z, bridgeLaneX, -348.0, 'bridge_ns', v.dirX, 1, bridgeLaneX, 1.25);
              } else {
                v.branchCooldown = 2.0;
                v.routeCounter++;
              }
              branchedNb = true;
              break;
            }
          }
        }
        if (!branchedNb) {
          if (v.dirX > 0 && v.x >= NORTH_BANK_EAST_END_X - 8.0) {
            v.dirX = -1;
            v.laneCoord = v.kind === 'car' ? -366.0 : -368.2;
            v.z = v.laneCoord;
            v.yaw = -Math.PI / 2;
          } else if (v.dirX < 0 && v.x <= 84.0) {
            v.dirX = 1;
            v.laneCoord = v.kind === 'car' ? -358.0 : -355.8;
            v.z = v.laneCoord;
            v.yaw = Math.PI / 2;
          }
        }
      } else if (v.mode === 'nb_north_leg') {
        // North Leg of Ngã Tư Bờ Bắc (Z = -370.4 .. -453) for Cầu Sông Hàn, Cầu Rồng & Cầu Trần Thị Lý
        const cx = v.bridgeCenterX;
        let sigFactor = 1;
        if (v.dirZ > 0) {
          const frontZ = v.z + v.halfL;
          const dist = -375.5 - frontZ;
          if (dist >= -0.3 && dist <= 14.0) {
            if (
              coordinator &&
              !coordinator.isIntersectionBoxClearForAxis({
                id: v.id,
                centerX: cx,
                centerZ: NORTH_BANK_INTERSECTION_CENTER_Z,
                axis: 'ns',
                y: -0.26,
              }) &&
              dist <= 5.0
            ) {
              sigFactor = dist <= 1.4 ? 0 : Math.max(0.08, (dist - 1.4) / 3.6);
            } else if (northNsPhase !== 'green' && !(northNsPhase === 'yellow' && dist < 1.5)) {
              sigFactor = dist <= 1.2 ? 0 : Math.max(0.08, (dist - 1.2) / 12.8);
            }
          }
        }
        if (jamBypass) {
          sigFactor = 1;
        }

        const clr = coordinator?.getForwardClearance({
          id: v.id,
          x: v.x,
          y: -0.26,
          z: v.z,
          moveDirX: 0,
          moveDirZ: v.dirZ,
          halfW: v.halfW,
          halfL: v.halfL,
          lookahead: 12.0,
          minGap: 2.2,
          priority: v.priority,
        });
        const clrFactor = clr ? (clr.blocked ? 0 : clr.maxSpeedFactor) : 1;
        const factor = Math.min(sigFactor, clrFactor);
        braking = factor < 0.72;
        const targetSpd = v.cruiseSpeed * factor;
        v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, Math.min(1, dt * (braking ? 6.5 : 3.2)));
        v.z += v.dirZ * v.speed * dt;
        v.x = THREE.MathUtils.lerp(v.x, v.laneCoord, Math.min(1, dt * 4.0));
        v.yaw = v.dirZ > 0 ? 0 : Math.PI;

        if (v.dirZ < 0 && v.z <= -452.0) {
          v.dirZ = 1;
          v.laneCoord = cx - (v.kind === 'car' ? 2.3 : 5.7);
          v.x = v.laneCoord;
          v.yaw = 0;
        } else if (v.dirZ > 0 && v.z >= -356.0) {
          // Head straight South across Cầu Sông Hàn, Cầu Rồng, or Cầu Trần Thị Lý!
          v.mode = 'bridge_ns';
        }
      }

      // Compute exact deck Y & bridge slope pitch (note local +Z is forward on NPC meshes)
      v.y = getHanRiverExteriorGroundY(v.x, v.z);
      const slopeDz =
        v.z >= HAN_BRIDGE_NORTH_FLAT_START_Z && v.z <= HAN_BRIDGE_SOUTH_FLAT_END_Z
          ? getHanRiverBridgeSlopeDz(v.z)
          : 0;
      const fwdZ = Math.cos(v.yaw);
      const pitch = -Math.atan(slopeDz * fwdZ);

      v.grp.position.set(v.x, v.y, v.z);
      v.grp.rotation.order = 'YXZ';
      v.grp.rotation.y = v.yaw;
      v.grp.rotation.x = pitch;

      const moved = Math.hypot(v.x - prevX, v.z - prevZ);
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.x += moved / v.wheelR;
      }
      v.headMat.emissiveIntensity = 0.75 + lampFactor * 1.1;
      v.brakeMat.emissiveIntensity = braking || v.speed < 0.25 ? 2.1 : 0.4 + lampFactor * 0.45;

      coordinator?.updateVehicle({
        id: v.id,
        kind: v.kind,
        x: v.x,
        y: v.y,
        z: v.z,
        fwdX: Math.sin(v.yaw),
        fwdZ: Math.cos(v.yaw),
        halfW: v.halfW,
        halfL: v.halfL,
        speed: v.speed,
        isStoppedOrParked: false,
        priority: v.priority,
        active: true,
      });
    }

    // Waterfront strolling pedestrians
    for (let i = 0; i < strollers.length; i++) {
      const s = strollers[i];
      const tgt = s.wps[s.wpIdx];
      const dx = tgt.x - s.grp.position.x;
      const dz = tgt.z - s.grp.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.25) {
        s.wpIdx = (s.wpIdx + 1) % s.wps.length;
      } else {
        const step = Math.min(dist, s.speed * dt);
        s.grp.position.x += (dx / dist) * step;
        s.grp.position.z += (dz / dist) * step;
        s.grp.rotation.y = Math.atan2(dx, dz);
        s.phase += dt * s.speed * 4.2;
        const sw = Math.sin(s.phase) * 0.45;
        s.legL.rotation.x = sw;
        s.legR.rotation.x = -sw;
        s.armL.rotation.x = -sw * 0.6;
        s.armR.rotation.x = s.glbHandle.hasActiveUmbrella() ? -0.88 : sw * 0.6;
      }
    }

    // Cầu Rồng Fire-Show Spectator & Tourist Crowd State Machine
    if (dragonPhase !== prevDragonPhase) {
      if (dragonPhase === 'idle') {
        for (let i = 0; i < dragonSpectators.length; i++) {
          const sp = dragonSpectators[i];
          sp.state = 'hidden';
          sp.grp.visible = false;
          sp.handle.setVisible(false);
          setSpectatorAnim(sp, 'Idle');
          resetSpectatorLimbs(sp);
        }
      } else if (dragonPhase === 'gathering') {
        for (let i = 0; i < dragonSpectators.length; i++) {
          const sp = dragonSpectators[i];
          sp.wpList = buildSpectatorToWatchWps(sp);
          sp.wpIdx = 0;
          sp.state = 'walking_to_watch';
          // Start staggered from home sidewalks & bridge approaches so crowd walks onto Cầu Rồng
          const approachFrac = prevDragonPhase === 'idle' ? (i % 4) * 0.16 : 0;
          const firstWp = sp.wpList[0];
          const sx = THREE.MathUtils.lerp(sp.homeX, firstWp.x, approachFrac);
          const sz = THREE.MathUtils.lerp(sp.homeZ, firstWp.z, approachFrac);
          sp.grp.position.set(sx, getHanRiverExteriorGroundY(sx, sz) + 0.01, sz);
          sp.grp.visible = true;
          sp.handle.setVisible(true);
          setSpectatorAnim(sp, 'Walk');
        }
      } else if (dragonPhase === 'fire_show') {
        for (let i = 0; i < dragonSpectators.length; i++) {
          const sp = dragonSpectators[i];
          if (prevDragonPhase === 'gathering' && sp.state === 'walking_to_watch') {
            // Keep walking seamlessly up to their viewing spot
            continue;
          }
          // Direct clock jump or init during 20:00-24:00: place ~85% already watching with phones raised & ~15% finishing walk up bridge
          sp.wpList = buildSpectatorToWatchWps(sp);
          if (i % 7 === 6 && sp.zone === 'bridge_walkway') {
            const approachZ = THREE.MathUtils.lerp(-148.0, sp.watchZ, 0.62);
            const approachX = getDragonWalkwayX(sp.side, approachZ, sp.laneBias);
            sp.wpIdx = 1;
            sp.state = 'walking_to_watch';
            sp.grp.position.set(approachX, getHanRiverExteriorGroundY(approachX, approachZ) + 0.01, approachZ);
            setSpectatorAnim(sp, 'Walk');
          } else {
            sp.state = 'watching';
            sp.grp.position.set(sp.watchX, getHanRiverExteriorGroundY(sp.watchX, sp.watchZ) + 0.01, sp.watchZ);
            sp.grp.rotation.y = sp.watchYaw;
            resetSpectatorLimbs(sp);
            setSpectatorAnim(sp, i % 6 === 5 ? 'Idle' : 'FilmPhone');
          }
          sp.grp.visible = true;
          sp.handle.setVisible(true);
        }
      } else if (dragonPhase === 'dispersing') {
        for (let i = 0; i < dragonSpectators.length; i++) {
          const sp = dragonSpectators[i];
          if (prevDragonPhase === 'idle') {
            // Jumped directly to post-midnight dispersal: start from viewing positions on bridge
            sp.grp.position.set(sp.watchX, getHanRiverExteriorGroundY(sp.watchX, sp.watchZ) + 0.01, sp.watchZ);
          }
          sp.wpList = buildSpectatorHomeWps(sp);
          sp.wpIdx = 0;
          sp.departTimer = sp.departDelay;
          sp.state = 'walking_home';
          sp.grp.visible = true;
          sp.handle.setVisible(true);
          resetSpectatorLimbs(sp);
          if (sp.departTimer > 0) {
            setSpectatorAnim(sp, 'Idle');
          } else {
            setSpectatorAnim(sp, 'Walk');
          }
        }
      }
      prevDragonPhase = dragonPhase;
    }

    if (dragonPhase !== 'idle') {
      for (let i = 0; i < dragonSpectators.length; i++) {
        const sp = dragonSpectators[i];
        if (sp.state === 'hidden' || sp.state === 'gone_home') continue;

        if (sp.state === 'watching') {
          // Subtle lively head/body panning while filming & admiring Dragon Head fire bursts
          const lookSway = Math.sin(clock * 0.85 + i * 1.7) * 0.09;
          sp.grp.rotation.y = sp.watchYaw + lookSway;

          // Dynamic "take out phone, raise to film/snap photos, briefly lower, raise again" rhythm
          const filmWave = Math.sin(clock * 0.38 + sp.filmTogglePhase);
          const wantFilm = isFireShowHours
            ? activeFireStrength > 0.22
              ? filmWave > -0.68
              : filmWave > -0.15
            : filmWave > 0.25;
          const desiredAnim = wantFilm ? 'FilmPhone' : 'Idle';
          if (sp.animState !== desiredAnim) {
            setSpectatorAnim(sp, desiredAnim);
          }

          // Fallback proxy raised arm pose when filming
          const targetFallArmX = desiredAnim === 'FilmPhone' ? -2.32 + Math.sin(clock * 1.5 + i) * 0.08 : 0;
          const targetFallArmZ = desiredAnim === 'FilmPhone' ? -0.14 : 0;
          sp.armR.rotation.x = THREE.MathUtils.lerp(sp.armR.rotation.x, targetFallArmX, Math.min(1, dt * 8.0));
          sp.armR.rotation.z = THREE.MathUtils.lerp(sp.armR.rotation.z, targetFallArmZ, Math.min(1, dt * 8.0));

          // Camera photo flash pops while holding phone up toward Dragon Head
          if (desiredAnim === 'FilmPhone' && isNearWater) {
            if (sp.flashTimer > 0) {
              sp.flashTimer = Math.max(0, sp.flashTimer - dt);
              const flashAlpha = Math.sin((sp.flashTimer / 0.16) * Math.PI);
              const flashScale = 0.6 + flashAlpha * 0.9;
              if (sp.glbFlashMesh && sp.glbFlashMat) {
                sp.glbFlashMesh.visible = sp.flashTimer > 0;
                sp.glbFlashMat.opacity = flashAlpha * 0.95;
                sp.glbFlashMesh.scale.setScalar(flashScale);
              }
              sp.fallbackFlashMesh.visible = sp.flashTimer > 0;
              sp.fallbackFlashMat.opacity = flashAlpha * 0.95;
              sp.fallbackFlashMesh.scale.setScalar(flashScale);
            } else {
              sp.flashCooldown -= dt;
              if (sp.flashCooldown <= 0) {
                sp.flashTimer = 0.16;
                sp.flashCooldown = isFireShowHours ? 3.2 + ((i * 1.73 + clock) % 5.5) : 6.0 + ((i * 1.37) % 6.0);
              }
            }
          } else if (sp.flashTimer > 0) {
            sp.flashTimer = 0;
            if (sp.glbFlashMesh) sp.glbFlashMesh.visible = false;
            sp.fallbackFlashMesh.visible = false;
          }
          continue;
        }

        if (sp.state === 'walking_home' && sp.departTimer > 0) {
          sp.departTimer -= dt;
          if (sp.departTimer <= 0) {
            setSpectatorAnim(sp, 'Walk');
          } else {
            continue;
          }
        }

        const wp = sp.wpList[sp.wpIdx];
        if (!wp) continue;
        const curX = sp.grp.position.x;
        const curZ = sp.grp.position.z;
        const tgtZ = wp.z;
        const tgtX =
          wp.trackWalkway && sp.zone === 'bridge_walkway'
            ? getDragonWalkwayX(sp.side, curZ, sp.laneBias)
            : wp.x;

        const dx = (wp.trackWalkway ? tgtX - curX : wp.x - curX);
        const dz = tgtZ - curZ;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.35 && Math.abs(wp.z - curZ) < 0.45) {
          sp.wpIdx++;
          if (sp.wpIdx >= sp.wpList.length) {
            if (sp.state === 'walking_to_watch') {
              sp.state = 'watching';
              sp.grp.position.set(sp.watchX, getHanRiverExteriorGroundY(sp.watchX, sp.watchZ) + 0.01, sp.watchZ);
              sp.grp.rotation.y = sp.watchYaw;
              setSpectatorAnim(sp, 'Idle');
              resetSpectatorLimbs(sp);
            } else {
              sp.state = 'gone_home';
              sp.grp.visible = false;
              sp.handle.setVisible(false);
              setSpectatorAnim(sp, 'Idle');
              resetSpectatorLimbs(sp);
            }
          }
        } else {
          setSpectatorAnim(sp, 'Walk');
          const step = Math.min(dist, sp.speed * dt);
          const nx = dist > 0.001 ? curX + (dx / dist) * step : curX;
          const nz = dist > 0.001 ? curZ + (dz / dist) * step : curZ;
          const clampedX =
            wp.trackWalkway && sp.zone === 'bridge_walkway' && nz <= -129.0 && nz >= -351.0
              ? getDragonWalkwayX(sp.side, nz, sp.laneBias)
              : nx;
          const ny = getHanRiverExteriorGroundY(clampedX, nz) + 0.01;
          sp.grp.position.set(clampedX, ny, nz);
          if (dist > 0.05) {
            sp.grp.rotation.y = Math.atan2(dx, dz);
          }
          sp.phase += dt * sp.speed * 4.3;
          const sw = Math.sin(sp.phase) * 0.46;
          sp.legL.rotation.x = sw;
          sp.legR.rotation.x = -sw;
          sp.armL.rotation.x = -sw * 0.6;
          sp.armR.rotation.x = sp.handle.hasActiveUmbrella() ? -0.88 : sw * 0.6;
        }
      }
    }
  };

  update(0, 20.0, 1.0);

  const getSouthSignalState = (): IntersectionSignalState => ({
    ewPhase: southEwPhase,
    nsPhase: southNsPhase,
  });
  const getNorthBankSignalState = (): IntersectionSignalState => ({
    ewPhase: northEwPhase,
    nsPhase: northNsPhase,
  });

  return {
    staticGroup,
    neonMats,
    lanternMats,
    poolMats,
    scaledLights,
    getSouthSignalState,
    getNorthBankSignalState,
    update,
  };
}
