export type TrafficVehicleKind = 'bus' | 'truck' | 'car' | 'motorbike';

export interface TrafficVehicleEntry {
  id: string;
  kind: TrafficVehicleKind;
  x: number;
  y: number;
  z: number;
  fwdX: number;
  fwdZ: number;
  halfW: number;
  halfL: number;
  speed: number;
  isStoppedOrParked: boolean;
  priority: number;
  active: boolean;
}

export interface ForwardClearanceQuery {
  id: string;
  x: number;
  y: number;
  z: number;
  moveDirX: number;
  moveDirZ: number;
  halfW: number;
  halfL: number;
  lookahead: number;
  minGap: number;
  latMargin?: number;
  priority: number;
}

export interface ForwardClearanceResult {
  blocked: boolean;
  maxSpeedFactor: number;
  closestGap: number;
  blockerId: string | null;
}

interface VehicleJamState {
  stalledSinceMs: number | null;
  bypassUntilMs: number;
  lastCheckMs: number;
  lastCheckResult: boolean;
}

function nowClockMs(override?: number): number {
  if (override !== undefined) return override;
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export class CityTrafficCoordinator {
  private vehicles = new Map<string, TrafficVehicleEntry>();
  private vehicleList: TrafficVehicleEntry[] = [];
  private jamStates = new Map<string, VehicleJamState>();
  private crossStalls = new Map<string, { blockerId: string; sinceMs: number }>();

  public updateVehicle(entry: TrafficVehicleEntry, nowMs?: number): void {
    const tMs = nowClockMs(nowMs);
    const len = Math.hypot(entry.fwdX, entry.fwdZ);
    const nx = len > 0.0001 ? entry.fwdX / len : 1;
    const nz = len > 0.0001 ? entry.fwdZ / len : 0;

    const existing = this.vehicles.get(entry.id);
    if (existing) {
      existing.kind = entry.kind;
      existing.x = entry.x;
      existing.y = entry.y;
      existing.z = entry.z;
      existing.fwdX = nx;
      existing.fwdZ = nz;
      existing.halfW = entry.halfW;
      existing.halfL = entry.halfL;
      existing.speed = entry.speed;
      existing.isStoppedOrParked = entry.isStoppedOrParked;
      existing.priority = entry.priority;
      existing.active = entry.active;
    } else {
      const created: TrafficVehicleEntry = {
        ...entry,
        fwdX: nx,
        fwdZ: nz,
      };
      this.vehicles.set(entry.id, created);
      this.vehicleList.push(created);
    }

    let js = this.jamStates.get(entry.id);
    if (!js) {
      js = { stalledSinceMs: null, bypassUntilMs: 0, lastCheckMs: -1e9, lastCheckResult: false };
      this.jamStates.set(entry.id, js);
    }
    if (!entry.active || entry.isStoppedOrParked) {
      js.stalledSinceMs = null;
    } else if (entry.speed < 0.45) {
      if (js.stalledSinceMs === null) {
        js.stalledSinceMs = tMs;
      }
    } else if (entry.speed >= 1.85) {
      js.stalledSinceMs = null;
    }
  }

  public deactivateVehicle(id: string): void {
    const existing = this.vehicles.get(id);
    if (existing) {
      existing.active = false;
      existing.speed = 0;
    }
    this.jamStates.delete(id);
    this.crossStalls.delete(id);
  }

  /**
   * Detects when a vehicle is stuck in a traffic jam ("kẹt xe"):
   * - Either stalled >= 2.5s on its own, OR
   * - Stalled >= 1.1s while >= 1 other active non-parked vehicle is also stopped/crawling nearby, OR
   * - >= 2 other active non-parked vehicles are stopped/crawling within 28m on the same corridor.
   * Once triggered, keeps bypass active for 4.5s so the vehicle cleanly clears the intersection/bottleneck.
   */
  public isJamBypassActive(id: string, nowMs?: number): boolean {
    const tMs = nowClockMs(nowMs);
    const me = this.vehicles.get(id);
    if (!me || !me.active || me.isStoppedOrParked) return false;

    const js = this.jamStates.get(id);
    if (js && tMs < js.bypassUntilMs) {
      return true;
    }
    if (js && tMs - js.lastCheckMs < 120) {
      return js.lastCheckResult;
    }

    const stalledDur = js?.stalledSinceMs !== null && js?.stalledSinceMs !== undefined ? tMs - js.stalledSinceMs : 0;
    if (stalledDur >= 2500) {
      if (js) {
        js.bypassUntilMs = tMs + 4500;
        js.lastCheckMs = tMs;
        js.lastCheckResult = true;
      }
      return true;
    }

    let queuedNeighbors = 0;
    const isEW = Math.abs(me.fwdX) >= Math.abs(me.fwdZ);
    const list = this.vehicleList;
    for (let i = 0; i < list.length; i++) {
      const other = list[i];
      if (!other.active || other.isStoppedOrParked || other.id === id) continue;
      if (Math.abs(other.y - me.y) > 1.45) continue;
      if (other.speed >= 0.85) continue;

      const dx = other.x - me.x;
      const dz = other.z - me.z;
      if (dx * dx + dz * dz > 784.0) continue; // 28m squared

      const sameCorridor = isEW ? Math.abs(dz) <= 7.5 : Math.abs(dx) <= 7.5;
      if (sameCorridor) {
        queuedNeighbors++;
        if (queuedNeighbors >= 2) break;
      }
    }

    const res = (queuedNeighbors >= 2 && me.speed < 1.2) || (queuedNeighbors >= 1 && stalledDur >= 1100);
    if (js) {
      js.lastCheckMs = tMs;
      js.lastCheckResult = res;
      if (res) js.bypassUntilMs = tMs + 4500;
    }
    return res;
  }

  public getForwardClearance(q: ForwardClearanceQuery, nowMs?: number): ForwardClearanceResult {
    const tMs = nowClockMs(nowMs);
    const dirLen = Math.hypot(q.moveDirX, q.moveDirZ);
    if (dirLen < 0.0001) {
      this.crossStalls.delete(q.id);
      return { blocked: false, maxSpeedFactor: 1, closestGap: Infinity, blockerId: null };
    }
    const fx = q.moveDirX / dirLen;
    const fz = q.moveDirZ / dirLen;
    const rx = -fz;
    const rz = fx;

    const jamBypass = this.isJamBypassActive(q.id, tMs);
    const latMargin = q.latMargin ?? 0.20;
    const maxCheckRange = q.lookahead + q.halfL + 7.5;
    const maxCheckRangeSq = maxCheckRange * maxCheckRange;
    const minFwdThreshold = Math.max(0.25, q.halfL * 0.25);

    let closestGap = Infinity;
    let blockerId: string | null = null;
    let blockerEntry: TrafficVehicleEntry | null = null;
    let blockerHeadingDot = 1;

    const list = this.vehicleList;
    for (let i = 0; i < list.length; i++) {
      const other = list[i];
      if (!other.active || other.id === q.id) continue;
      if (Math.abs(other.y - q.y) > 1.45) continue;

      const dx = other.x - q.x;
      const dz = other.z - q.z;
      if (dx * dx + dz * dz > maxCheckRangeSq) continue;

      const fwdDist = dx * fx + dz * fz;
      // Ignore vehicles behind our front/mid body so a trailing vehicle touching our rear bumper never freezes us
      if (fwdDist <= minFwdThreshold) continue;

      const latDist = Math.abs(dx * rx + dz * rz);

      const oRightX = -other.fwdZ;
      const oRightZ = other.fwdX;

      const bProjF =
        Math.abs(other.fwdX * fx + other.fwdZ * fz) * other.halfL +
        Math.abs(oRightX * fx + oRightZ * fz) * other.halfW;
      const bProjR =
        Math.abs(other.fwdX * rx + other.fwdZ * rz) * other.halfL +
        Math.abs(oRightX * rx + oRightZ * rz) * other.halfW;

      // Vehicles waiting strictly behind the sidewalk curb of Main Boulevard (Z = 20.8..37.2)
      // must never freeze through-moving Main Boulevard vehicles driving along X.
      if (Math.abs(fz) < 0.35 && other.speed < 0.30 && q.z >= 20.0 && q.z <= 38.0) {
        const halfZExt = Math.abs(other.fwdZ) * other.halfL + Math.abs(other.fwdX) * other.halfW;
        if (
          (other.z > 37.2 && other.z - halfZExt >= 37.0) ||
          (other.z >= 10.0 && other.z < 20.8 && other.z + halfZExt <= 21.0)
        ) {
          continue;
        }
      }

      if (latDist >= q.halfW + bProjR + latMargin) continue;

      const bumperGap = fwdDist - q.halfL - bProjF;
      if (bumperGap > q.lookahead) continue;

      // If jam-bypass ("vượt kẹt xe") is active, push past stalled/crawling blockers so traffic never deadlocks!
      if (jamBypass && !other.isStoppedOrParked && other.speed < 1.35) {
        continue;
      }

      // Cross-traffic & angled-merge deadlock prevention:
      // Same-lane traffic (dot > 0.85 inline) yields to whoever is ahead.
      // Only allow right-of-way bypass when there is positive bumper separation (> 0.35m)
      // so vehicles never clip into or overlap another vehicle's body.
      const headingDot = other.fwdX * fx + other.fwdZ * fz;
      const hasHigherRightOfWay =
        q.priority > other.priority || (q.priority === other.priority && q.id < other.id);
      if (
        headingDot <= 0.86 &&
        !other.isStoppedOrParked &&
        other.speed < 0.30 &&
        bumperGap > (headingDot <= 0.45 ? 0.35 : 0.45) &&
        hasHigherRightOfWay
      ) {
        continue;
      }

      if (bumperGap < closestGap) {
        closestGap = bumperGap;
        blockerId = other.id;
        blockerEntry = other;
        blockerHeadingDot = headingDot;
      }
    }

    if (jamBypass && closestGap <= q.minGap) {
      return { blocked: false, maxSpeedFactor: 0.78, closestGap, blockerId: null };
    }

    if (closestGap <= q.minGap) {
      // Mutual crossing/opposing stall watchdog: never bypass inline (headingDot > 0.55), parked vehicles,
      // or physically touching/overlapping vehicles (closestGap <= 0.25).
      if (
        blockerId &&
        blockerEntry &&
        blockerHeadingDot <= 0.55 &&
        closestGap > 0.25 &&
        !(blockerEntry as TrafficVehicleEntry).isStoppedOrParked &&
        (blockerEntry as TrafficVehicleEntry).speed < 0.2
      ) {
        const b = blockerEntry as TrafficVehicleEntry;
        const canBreak = q.priority > b.priority || (q.priority === b.priority && q.id < b.id);
        if (canBreak) {
          const prevStall = this.crossStalls.get(q.id);
          if (!prevStall || prevStall.blockerId !== blockerId) {
            this.crossStalls.set(q.id, { blockerId, sinceMs: tMs });
          } else if (tMs - prevStall.sinceMs >= 2000) {
            return { blocked: false, maxSpeedFactor: 0.55, closestGap, blockerId: null };
          }
        }
      } else {
        this.crossStalls.delete(q.id);
      }
      return { blocked: true, maxSpeedFactor: 0, closestGap, blockerId };
    }
    this.crossStalls.delete(q.id);

    if (closestGap < q.lookahead) {
      const t = (closestGap - q.minGap) / Math.max(0.5, q.lookahead - q.minGap);
      return {
        blocked: false,
        maxSpeedFactor: Math.max(0.08, Math.min(1, t)),
        closestGap,
        blockerId,
      };
    }

    return { blocked: false, maxSpeedFactor: 1, closestGap: Infinity, blockerId: null };
  }

  public pickBestCruiseLane(params: {
    id: string;
    x: number;
    y: number;
    currentZ: number;
    laneZ: number;
    moveDirX: number;
    lanes: readonly [number, number];
    halfW: number;
    halfL: number;
    lookahead: number;
    minGap: number;
    priority: number;
    allowSwitch: boolean;
    preferLane?: number;
  }): { targetZ: number; switched: boolean; clearance: ForwardClearanceResult } {
    const curClr = this.getForwardClearance({
      id: params.id,
      x: params.x,
      y: params.y,
      z: params.currentZ,
      moveDirX: params.moveDirX,
      moveDirZ: 0,
      halfW: params.halfW,
      halfL: params.halfL,
      lookahead: params.lookahead,
      minGap: params.minGap,
      priority: params.priority,
    });

    const lane0 = params.lanes[0];
    const lane1 = params.lanes[1];
    const currentIs0 = Math.abs(params.laneZ - lane0) <= Math.abs(params.laneZ - lane1);
    const activeLaneZ = currentIs0 ? lane0 : lane1;
    const altLaneZ = currentIs0 ? lane1 : lane0;

    if (!params.allowSwitch) {
      return { targetZ: activeLaneZ, switched: false, clearance: curClr };
    }

    const sideClear = this.isZoneClear({
      id: params.id,
      x: params.x,
      y: params.y,
      z: altLaneZ,
      halfX: params.halfL + 1.6,
      halfZ: params.halfW + 0.35,
    });

    if (!sideClear) {
      return { targetZ: activeLaneZ, switched: false, clearance: curClr };
    }

    const altClr = this.getForwardClearance({
      id: params.id,
      x: params.x,
      y: params.y,
      z: altLaneZ,
      moveDirX: params.moveDirX,
      moveDirZ: 0,
      halfW: params.halfW,
      halfL: params.halfL,
      lookahead: params.lookahead,
      minGap: params.minGap,
      priority: params.priority,
    });

    const wantsPrefer =
      params.preferLane !== undefined && Math.abs(altLaneZ - params.preferLane) < 0.5;
    if (wantsPrefer && !altClr.blocked && altClr.maxSpeedFactor >= 0.72) {
      return { targetZ: altLaneZ, switched: true, clearance: curClr };
    }

    const curImpeded = curClr.blocked || curClr.maxSpeedFactor < 0.82;
    const altClearlyBetter =
      !altClr.blocked &&
      altClr.maxSpeedFactor > curClr.maxSpeedFactor + 0.14 &&
      altClr.closestGap > curClr.closestGap + 2.5;

    if (curImpeded && altClearlyBetter) {
      return { targetZ: altLaneZ, switched: true, clearance: curClr };
    }

    return { targetZ: activeLaneZ, switched: false, clearance: curClr };
  }

  public isZoneClear(params: {
    id: string;
    x: number;
    y: number;
    z: number;
    halfX: number;
    halfZ: number;
  }): boolean {
    const list = this.vehicleList;
    for (let i = 0; i < list.length; i++) {
      const other = list[i];
      if (!other.active || other.id === params.id) continue;
      if (Math.abs(other.y - params.y) > 1.45) continue;

      const oRightX = -other.fwdZ;
      const oRightZ = other.fwdX;
      const extX = Math.abs(other.fwdX) * other.halfL + Math.abs(oRightX) * other.halfW;
      const extZ = Math.abs(other.fwdZ) * other.halfL + Math.abs(oRightZ) * other.halfW;

      if (
        Math.abs(other.x - params.x) < params.halfX + extX + 0.35 &&
        Math.abs(other.z - params.z) < params.halfZ + extZ + 0.35
      ) {
        return false;
      }
    }
    return true;
  }

  public isIntersectionBoxClearForAxis(params: {
    id: string;
    centerX: number;
    centerZ?: number;
    axis: 'ew' | 'ns';
    y?: number;
  }): boolean {
    const checkY = params.y ?? -0.26;
    const checkZ = params.centerZ ?? 29.0;
    const list = this.vehicleList;
    for (let i = 0; i < list.length; i++) {
      const other = list[i];
      if (!other.active || other.id === params.id) continue;
      if (Math.abs(other.y - checkY) > 1.45) continue;

      const oRightX = -other.fwdZ;
      const oRightZ = other.fwdX;
      const extX = Math.abs(other.fwdX) * other.halfL + Math.abs(oRightX) * other.halfW;
      const extZ = Math.abs(other.fwdZ) * other.halfL + Math.abs(oRightZ) * other.halfW;

      // Intersection asphalt box is centerX ± 8.6m, centerZ ± 8.4m
      const insideBox =
        Math.abs(other.x - params.centerX) < 8.6 + extX &&
        Math.abs(other.z - checkZ) < 8.4 + extZ;
      if (!insideBox) continue;

      // Check conflicting-axis vehicles or slow turning vehicles still clearing the box
      const isConflicting =
        params.axis === 'ew' ? Math.abs(other.fwdZ) > 0.32 : Math.abs(other.fwdX) > 0.32;
      if (isConflicting) {
        return false;
      }
    }
    return true;
  }

  public canStartIntersectionUTurn(params: {
    id: string;
    centerX: number;
    fromDirX: 1 | -1;
    getSignal?: BoulevardSignalGetter | null;
    emergency?: boolean;
    y?: number;
    nowMs?: number;
  }): boolean {
    // If jammed/stalled at the intersection U-turn point, execute immediately instead of blocking traffic!
    if (this.isJamBypassActive(params.id, params.nowMs)) {
      return true;
    }

    const checkY = params.y ?? -0.26;
    if (params.getSignal && !params.emergency) {
      if (params.getSignal().ewPhase !== 'green') {
        return false;
      }
    }
    if (!this.isIntersectionBoxClearForAxis({ id: params.id, centerX: params.centerX, axis: 'ew', y: checkY })) {
      return false;
    }
    // Check immediate oncoming vehicles inside/entering the turn arc (halfX = 9.0m)
    const oppCenterZ = params.fromDirX > 0 ? 33.8 : 24.2;
    const oppCheckX = params.fromDirX > 0 ? params.centerX + 4.5 : params.centerX - 4.5;
    return this.isZoneClear({
      id: params.id,
      x: oppCheckX,
      y: checkY,
      z: oppCenterZ,
      halfX: 9.0,
      halfZ: 3.4,
    });
  }
}

export interface BoulevardSignalState {
  ewPhase: 'green' | 'yellow' | 'red';
  nsPhase?: 'green' | 'yellow' | 'red';
}

export type BoulevardSignalGetter = () => BoulevardSignalState;

export const WEST_INTERSECTION_CENTER_X = -227.5;
export const EAST_INTERSECTION_CENTER_X = 193.5;
export const FAR_EAST_INTERSECTION_CENTER_X = 370.0;
export const DIOR_INTERSECTION_CENTER_X = 503.0;
export const WEST_INTERSECTION_EW_STOP_X = -241.6;
export const WEST_INTERSECTION_WB_STOP_X = -213.4;
export const EAST_INTERSECTION_EB_STOP_X = 179.4;
export const EAST_INTERSECTION_WB_STOP_X = 207.6;
export const FAR_EAST_INTERSECTION_EB_STOP_X = 356.0;
export const FAR_EAST_INTERSECTION_WB_STOP_X = 384.0;
export const DIOR_INTERSECTION_EB_STOP_X = 489.0;
export const DIOR_INTERSECTION_WB_STOP_X = 517.0;

export const CITY_ROAD_BOUNDS = {
  westEndX: -956.0,
  eastEndX: 554.0,
  nsStopNorthZ: 14.8,
  nsStopSouthZ: 43.2,
  westNorthEndZ: -110.0,
  westSouthEndZ: 100.0,
  eastNorthEndZ: -80.0,
  eastSouthEndZ: 422.0,
  farEastNorthEndZ: -105.0,
  farEastSouthEndZ: 138.0,
  diorNorthEndZ: -105.0,
  diorSouthEndZ: 120.0,
  bachDangWestEndX: -220.0,
  bachDangEastEndX: 534.0,
  bachDangEBZ: -113.4,
  bachDangWBZ: -121.6,
} as const;

export function computeNorthSouthSignalFactor(params: {
  z: number;
  halfL: number;
  moveDirZ: 1 | -1;
  centerX: number;
  getSignal?: BoulevardSignalGetter | null;
  coordinator?: CityTrafficCoordinator | null;
  vehicleId?: string;
  emergencyBypass?: boolean;
  nowMs?: number;
}): number {
  const { z, halfL, moveDirZ, centerX, getSignal, coordinator, vehicleId, emergencyBypass, nowMs } = params;

  if (coordinator && vehicleId && coordinator.isJamBypassActive(vehicleId, nowMs)) {
    return 1;
  }

  const distToStop =
    moveDirZ > 0
      ? CITY_ROAD_BOUNDS.nsStopNorthZ - (z + halfL)
      : z - halfL - CITY_ROAD_BOUNDS.nsStopSouthZ;

  let factor = 1;
  if (coordinator && vehicleId && distToStop >= -0.35 && distToStop <= 5.5) {
    if (!coordinator.isIntersectionBoxClearForAxis({ id: vehicleId, centerX, axis: 'ns' })) {
      factor = distToStop <= 1.5 ? 0 : Math.max(0.08, (distToStop - 1.5) / 4.0);
    }
  }

  if (!emergencyBypass && getSignal) {
    const phase = getSignal().nsPhase ?? 'green';
    if (phase !== 'green') {
      const allowYellowClear = phase === 'yellow' && distToStop < 1.4;
      if (!allowYellowClear && distToStop >= -0.35 && distToStop <= 16.0) {
        const sigF = distToStop <= 1.25 ? 0 : Math.max(0.08, Math.min(1, (distToStop - 1.25) / 14.75));
        factor = Math.min(factor, sigF);
      }
    }
  }

  return factor;
}

export function computeBoulevardSignalFactor(params: {
  x: number;
  halfL: number;
  moveDirX: 1 | -1;
  getWestSignal?: BoulevardSignalGetter | null;
  getEastSignal?: BoulevardSignalGetter | null;
  getFarEastSignal?: BoulevardSignalGetter | null;
  getDiorSignal?: BoulevardSignalGetter | null;
  coordinator?: CityTrafficCoordinator | null;
  vehicleId?: string;
  emergencyBypass?: boolean;
  nowMs?: number;
}): number {
  const {
    x,
    halfL,
    moveDirX,
    getWestSignal,
    getEastSignal,
    getFarEastSignal,
    getDiorSignal,
    coordinator,
    vehicleId,
    emergencyBypass,
    nowMs,
  } = params;

  // Anti-gridlock jam override: if there is a traffic jam ("kẹt xe"), push straight through even on red!
  if (coordinator && vehicleId && coordinator.isJamBypassActive(vehicleId, nowMs)) {
    return 1;
  }

  const frontX = x + moveDirX * halfL;
  let minFactor = 1;

  const checkStopLine = (
    stopX: number,
    centerX: number,
    getter?: BoulevardSignalGetter | null
  ) => {
    const dist = moveDirX > 0 ? stopX - frontX : frontX - stopX;

    // Never enter an intersection box if cross-traffic is still clearing inside it ("don't block the box")
    if (coordinator && vehicleId && dist >= -0.35 && dist <= 5.5) {
      if (!coordinator.isIntersectionBoxClearForAxis({ id: vehicleId, centerX, axis: 'ew' })) {
        if (dist <= 1.5) {
          minFactor = Math.min(minFactor, 0);
        } else {
          minFactor = Math.min(minFactor, Math.max(0.08, (dist - 1.5) / 4.0));
        }
        return;
      }
    }

    if (emergencyBypass || !getter) return;
    const phase = getter().ewPhase;
    if (phase === 'green') return;

    // On yellow, only let a vehicle already past or within 1.6m of stop line clear cleanly
    if (phase === 'yellow' && dist < 1.6) return;
    if (dist < -0.35 || dist > 18.0) return;

    if (dist <= 1.25) {
      minFactor = Math.min(minFactor, 0);
    } else {
      const t = (dist - 1.25) / (18.0 - 1.25);
      minFactor = Math.min(minFactor, Math.max(0.08, Math.min(1, t)));
    }
  };

  if (moveDirX > 0) {
    checkStopLine(WEST_INTERSECTION_EW_STOP_X, WEST_INTERSECTION_CENTER_X, getWestSignal);
    checkStopLine(EAST_INTERSECTION_EB_STOP_X, EAST_INTERSECTION_CENTER_X, getEastSignal);
    checkStopLine(FAR_EAST_INTERSECTION_EB_STOP_X, FAR_EAST_INTERSECTION_CENTER_X, getFarEastSignal);
    checkStopLine(DIOR_INTERSECTION_EB_STOP_X, DIOR_INTERSECTION_CENTER_X, getDiorSignal);
  } else {
    checkStopLine(DIOR_INTERSECTION_WB_STOP_X, DIOR_INTERSECTION_CENTER_X, getDiorSignal);
    checkStopLine(FAR_EAST_INTERSECTION_WB_STOP_X, FAR_EAST_INTERSECTION_CENTER_X, getFarEastSignal);
    checkStopLine(EAST_INTERSECTION_WB_STOP_X, EAST_INTERSECTION_CENTER_X, getEastSignal);
    checkStopLine(WEST_INTERSECTION_WB_STOP_X, WEST_INTERSECTION_CENTER_X, getWestSignal);
  }

  return minFactor;
}

