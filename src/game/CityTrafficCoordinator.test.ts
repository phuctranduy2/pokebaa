import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_ROAD_BOUNDS,
  CityTrafficCoordinator,
  DIOR_INTERSECTION_CENTER_X,
  EAST_INTERSECTION_CENTER_X,
  FAR_EAST_INTERSECTION_CENTER_X,
  WEST_INTERSECTION_CENTER_X,
  computeBoulevardSignalFactor,
  computeNorthSouthSignalFactor,
} from './CityTrafficCoordinator';

test('CityTrafficCoordinator: cross-traffic never clips through overlapping or close perpendicular vehicles', () => {
  const coord = new CityTrafficCoordinator();

  // Red NS sedan stopped inside the West Intersection box facing +Z
  coord.updateVehicle({
    id: 'west_ns_car',
    kind: 'car',
    x: WEST_INTERSECTION_CENTER_X - 4.0,
    y: -0.26,
    z: 27.0,
    fwdX: 0,
    fwdZ: 1,
    halfW: 0.95,
    halfL: 2.25,
    speed: 0,
    isStoppedOrParked: true,
    priority: 30,
    active: true,
  });

  // Eastbound City Bus approaching the West Intersection along Z = 26.90
  const clr = coord.getForwardClearance({
    id: 'city_bus',
    x: WEST_INTERSECTION_CENTER_X - 9.0,
    y: -0.26,
    z: 26.9,
    moveDirX: 1,
    moveDirZ: 0,
    halfW: 1.25,
    halfL: 5.2,
    lookahead: 14.0,
    minGap: 2.0,
    priority: 40, // Even higher priority must yield when cross-traffic overlaps ahead!
  });

  assert.equal(clr.blocked, true);
  assert.equal(clr.maxSpeedFactor, 0);
});

test('CityTrafficCoordinator: isIntersectionBoxClearForAxis detects lingering cross-axis traffic inside West/East boxes', () => {
  const coord = new CityTrafficCoordinator();

  // NS motorbike still clearing West Intersection crosswalk
  coord.updateVehicle({
    id: 'west_ns_moto',
    kind: 'motorbike',
    x: WEST_INTERSECTION_CENTER_X + 2.5,
    y: -0.26,
    z: 24.5,
    fwdX: 0,
    fwdZ: -1,
    halfW: 0.36,
    halfL: 0.92,
    speed: 3.0,
    isStoppedOrParked: false,
    priority: 20,
    active: true,
  });

  assert.equal(
    coord.isIntersectionBoxClearForAxis({ id: 'ew_car', centerX: WEST_INTERSECTION_CENTER_X, axis: 'ew' }),
    false
  );
  assert.equal(
    coord.isIntersectionBoxClearForAxis({ id: 'ns_car', centerX: WEST_INTERSECTION_CENTER_X, axis: 'ns' }),
    true
  );

  // Move motorbike clear south/north outside Z = [20.6, 37.4]
  coord.updateVehicle({
    id: 'west_ns_moto',
    kind: 'motorbike',
    x: WEST_INTERSECTION_CENTER_X + 2.5,
    y: -0.26,
    z: 14.0,
    fwdX: 0,
    fwdZ: -1,
    halfW: 0.36,
    halfL: 0.92,
    speed: 5.0,
    isStoppedOrParked: false,
    priority: 20,
    active: true,
  });

  assert.equal(
    coord.isIntersectionBoxClearForAxis({ id: 'ew_car', centerX: WEST_INTERSECTION_CENTER_X, axis: 'ew' }),
    true
  );
});

test('computeBoulevardSignalFactor: yields at red, yellow stop line, and occupied box even on green', () => {
  const coord = new CityTrafficCoordinator();

  // Red signal stops approaching Westbound ambulance
  const redFactor = computeBoulevardSignalFactor({
    x: WEST_INTERSECTION_CENTER_X + 18.0, // frontX = -209.5 - halfL(2.8) -> 1.1m before WB stop line (-213.4)
    halfL: 2.8,
    moveDirX: -1,
    getWestSignal: () => ({ ewPhase: 'red' }),
    coordinator: coord,
    vehicleId: 'amb_1',
  });
  assert.equal(redFactor, 0);

  // Yellow signal: within 1.6m of stop line clears smoothly; >= 1.6m brakes firmly to stop for red
  const yellowCommittedFactor = computeBoulevardSignalFactor({
    x: WEST_INTERSECTION_CENTER_X + 17.8, // frontX = -212.5, dist = 0.9m (< 1.6m)
    halfL: 2.8,
    moveDirX: -1,
    getWestSignal: () => ({ ewPhase: 'yellow' }),
    coordinator: coord,
    vehicleId: 'amb_1',
  });
  assert.equal(yellowCommittedFactor, 1);

  const yellowBrakingFactor = computeBoulevardSignalFactor({
    x: WEST_INTERSECTION_CENTER_X + 18.9, // frontX = -211.4, dist = 2.0m (>= 1.6m)
    halfL: 2.8,
    moveDirX: -1,
    getWestSignal: () => ({ ewPhase: 'yellow' }),
    coordinator: coord,
    vehicleId: 'amb_1',
  });
  assert.ok(yellowBrakingFactor < 0.15, `Expected firm yellow braking (<0.15), got ${yellowBrakingFactor}`);

  // Green signal + cross-traffic stuck inside West Intersection box -> MUST stop behind stop line (even emergency!)
  coord.updateVehicle({
    id: 'west_ns_car',
    kind: 'car',
    x: WEST_INTERSECTION_CENTER_X,
    y: -0.26,
    z: 29.0,
    fwdX: 0,
    fwdZ: 1,
    halfW: 0.95,
    halfL: 2.25,
    speed: 1.5,
    isStoppedOrParked: false,
    priority: 30,
    active: true,
  });

  const occupiedBoxGreenFactor = computeBoulevardSignalFactor({
    x: WEST_INTERSECTION_CENTER_X + 18.0,
    halfL: 2.8,
    moveDirX: -1,
    getWestSignal: () => ({ ewPhase: 'green' }),
    coordinator: coord,
    vehicleId: 'amb_1',
    emergencyBypass: true,
  });
  assert.equal(occupiedBoxGreenFactor, 0);
});

test('CityTrafficCoordinator: canStartIntersectionUTurn enforces green EW signal, clear box, and clear opposing lane', () => {
  const coord = new CityTrafficCoordinator();

  // Red signal blocks regular U-turn
  assert.equal(
    coord.canStartIntersectionUTurn({
      id: 'taxi_0',
      centerX: EAST_INTERSECTION_CENTER_X,
      fromDirX: 1,
      getSignal: () => ({ ewPhase: 'red' }),
    }),
    false
  );

  // Green signal + empty box + empty opposing lane -> allowed
  assert.equal(
    coord.canStartIntersectionUTurn({
      id: 'taxi_0',
      centerX: EAST_INTERSECTION_CENTER_X,
      fromDirX: 1,
      getSignal: () => ({ ewPhase: 'green' }),
    }),
    true
  );

  // Green signal + oncoming Westbound truck in Z=34.75 approaching East Intersection -> blocked
  coord.updateVehicle({
    id: 'oncoming_wb',
    kind: 'truck',
    x: EAST_INTERSECTION_CENTER_X + 10.0,
    y: -0.26,
    z: 34.75,
    fwdX: -1,
    fwdZ: 0,
    halfW: 1.15,
    halfL: 2.95,
    speed: 8.0,
    isStoppedOrParked: false,
    priority: 30,
    active: true,
  });

  assert.equal(
    coord.canStartIntersectionUTurn({
      id: 'taxi_0',
      centerX: EAST_INTERSECTION_CENTER_X,
      fromDirX: 1,
      getSignal: () => ({ ewPhase: 'green' }),
    }),
    false
  );
});

test('CityTrafficCoordinator: jam-bypass clears queued congestion and overrides red lights & U-turn holds', () => {
  const coord = new CityTrafficCoordinator();

  // Simulate Westbound jam behind a stalled vehicle at West Intersection (Z=31.10)
  const t0 = 10000;
  coord.updateVehicle(
    {
      id: 'csgt_lead',
      kind: 'car',
      x: WEST_INTERSECTION_CENTER_X + 7.0,
      y: -0.26,
      z: 31.1,
      fwdX: -1,
      fwdZ: 0,
      halfW: 0.98,
      halfL: 2.35,
      speed: 0,
      isStoppedOrParked: false,
      priority: 30,
      active: true,
    },
    t0
  );
  coord.updateVehicle(
    {
      id: 'taxi_queued',
      kind: 'car',
      x: WEST_INTERSECTION_CENTER_X + 14.0,
      y: -0.26,
      z: 31.1,
      fwdX: -1,
      fwdZ: 0,
      halfW: 0.95,
      halfL: 2.25,
      speed: 0.1,
      isStoppedOrParked: false,
      priority: 22,
      active: true,
    },
    t0
  );
  coord.updateVehicle(
    {
      id: 'bus_queued',
      kind: 'bus',
      x: WEST_INTERSECTION_CENTER_X + 24.0,
      y: -0.26,
      z: 31.1,
      fwdX: -1,
      fwdZ: 0,
      halfW: 1.25,
      halfL: 5.2,
      speed: 0.05,
      isStoppedOrParked: false,
      priority: 25,
      active: true,
    },
    t0
  );

  // Immediately triggers jam-bypass for taxi_queued because >= 2 other queued neighbors are in same corridor
  assert.equal(coord.isJamBypassActive('taxi_queued', t0 + 100), true);

  // Even on RED signal, jammed vehicle is allowed to push through instead of freezing the queue
  const redBypassFactor = computeBoulevardSignalFactor({
    x: WEST_INTERSECTION_CENTER_X + 18.0,
    halfL: 2.25,
    moveDirX: -1,
    getWestSignal: () => ({ ewPhase: 'red' }),
    coordinator: coord,
    vehicleId: 'taxi_queued',
    nowMs: t0 + 100,
  });
  assert.equal(redBypassFactor, 1);

  // Stalled lead vehicle triggers solo stall bypass after >= 2500ms, letting it run red / U-turn out
  coord.updateVehicle(
    {
      id: 'csgt_lead',
      kind: 'car',
      x: WEST_INTERSECTION_CENTER_X + 7.0,
      y: -0.26,
      z: 31.1,
      fwdX: -1,
      fwdZ: 0,
      halfW: 0.98,
      halfL: 2.35,
      speed: 0,
      isStoppedOrParked: false,
      priority: 30,
      active: true,
    },
    t0 + 2600
  );
  assert.equal(coord.isJamBypassActive('csgt_lead', t0 + 2600), true);
  assert.equal(
    coord.canStartIntersectionUTurn({
      id: 'csgt_lead',
      centerX: WEST_INTERSECTION_CENTER_X,
      fromDirX: -1,
      getSignal: () => ({ ewPhase: 'red' }),
      nowMs: t0 + 2600,
    }),
    true
  );

  // Forward clearance unblocks crawling inline vehicles when jamBypass is active
  const clr = coord.getForwardClearance(
    {
      id: 'taxi_queued',
      x: WEST_INTERSECTION_CENTER_X + 14.0,
      y: -0.26,
      z: 31.1,
      moveDirX: -1,
      moveDirZ: 0,
      halfW: 0.95,
      halfL: 2.25,
      lookahead: 11.0,
      minGap: 2.1,
      priority: 22,
    },
    t0 + 2600
  );
  assert.equal(clr.blocked, false);
  assert.ok(clr.maxSpeedFactor > 0.5);
});

test('Ngã 3 Bạch Đằng – DIOR bounds and computeNorthSouthSignalFactor obey all 4-way lights & box clearance', () => {
  assert.equal(DIOR_INTERSECTION_CENTER_X, 503.0);
  assert.ok(CITY_ROAD_BOUNDS.bachDangEastEndX >= 530.0);
  assert.ok(CITY_ROAD_BOUNDS.diorNorthEndZ <= -104.0);

  const coord = new CityTrafficCoordinator();

  // Northbound ambulance approaching Sơn Tây South stop line (Z = 43.2) on RED NS signal -> stops cleanly
  const nsRedFactor = computeNorthSouthSignalFactor({
    z: CITY_ROAD_BOUNDS.nsStopSouthZ + 3.2, // frontZ = 46.4 - 2.65 = 43.75 -> 0.55m before stop line
    halfL: 2.65,
    moveDirZ: -1,
    centerX: FAR_EAST_INTERSECTION_CENTER_X,
    getSignal: () => ({ ewPhase: 'green', nsPhase: 'red' }),
    coordinator: coord,
    vehicleId: 'ns_car_1',
  });
  assert.equal(nsRedFactor, 0);

  // DIOR intersection EW signal stops approaching Eastbound car when DIOR EW is red
  const diorRedFactor = computeBoulevardSignalFactor({
    x: DIOR_INTERSECTION_CENTER_X - 17.5, // frontX = 488.0 -> 1.0m before DIOR EB stop line (489.0)
    halfL: 2.5,
    moveDirX: 1,
    getDiorSignal: () => ({ ewPhase: 'red', nsPhase: 'green' }),
    coordinator: coord,
    vehicleId: 'ew_dior_car',
  });
  assert.equal(diorRedFactor, 0);
});

