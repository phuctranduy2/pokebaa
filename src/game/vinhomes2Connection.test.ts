import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR_EAST_INTERSECTION_COLLIDERS } from './FarEastIntersectionSystem';
import {
  VINHOMES2B_COLLIDERS,
  VINHOMES2B_CROSSROAD_MAX_X,
  VINHOMES2B_CROSSROAD_MIN_X,
  VINHOMES2B_INTERSECTION_CENTER_X,
  VINHOMES2_COLLIDERS,
  VINHOMES2_CROSSROAD_MAX_X,
  VINHOMES2_CROSSROAD_MIN_X,
  VINHOMES2_INTERSECTION_CENTER_X,
  VINHOMES3_COLLIDERS,
  VINHOMES3_CROSSROAD_MAX_X,
  VINHOMES3_CROSSROAD_MIN_X,
  VINHOMES3_INTERSECTION_CENTER_X,
  VINHOMES_COLLIDERS,
  VINHOMES_CROSSROAD_MAX_X,
  VINHOMES_INTERSECTION_CENTER_X,
  VINHOMES_INTERSECTION_CENTER_Z,
  VINHOMES_MID_COLLIDERS,
  VINHOMES_MID_CROSSROAD_MAX_X,
  VINHOMES_MID_CROSSROAD_MIN_X,
  VINHOMES_MID_INTERSECTION_CENTER_X,
  VINHOMES_SOUTH_END_Z,
  VINHOMES_SOUTH_INTERSECTION_CENTER_Z,
} from './VinhomesOceanParkSystem';
import { clampMotorbikeExteriorBounds } from './PlayerMotorbikeSystem';
import { computeCityGpsRoute, detectCurrentCityZone } from './cityMapData';

function isBlockedBySoutheastColliders(x: number, z: number, radius = 0.4): boolean {
  const all = [
    ...FAR_EAST_INTERSECTION_COLLIDERS,
    ...VINHOMES_COLLIDERS,
    ...VINHOMES_MID_COLLIDERS,
    ...VINHOMES2_COLLIDERS,
    ...VINHOMES2B_COLLIDERS,
    ...VINHOMES3_COLLIDERS,
  ];
  for (const b of all) {
    if (b.floor !== 1) continue;
    if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) {
      return true;
    }
  }
  return false;
}

test('All 5 Vinhomes Boulevards & seamless North/South connecting shophouses link cleanly across Z=148 and Z=344', () => {
  assert.equal(VINHOMES_CROSSROAD_MAX_X, 238.0);
  assert.equal(VINHOMES_MID_INTERSECTION_CENTER_X, 282.0);
  assert.equal(VINHOMES_MID_CROSSROAD_MIN_X, 238.0);
  assert.equal(VINHOMES_MID_CROSSROAD_MAX_X, 326.0);
  assert.equal(VINHOMES2_INTERSECTION_CENTER_X, 370.0);
  assert.equal(VINHOMES2_CROSSROAD_MIN_X, 326.0);
  assert.equal(VINHOMES2_CROSSROAD_MAX_X, 403.25);
  assert.equal(VINHOMES2B_INTERSECTION_CENTER_X, 436.5);
  assert.equal(VINHOMES2B_CROSSROAD_MIN_X, 403.25);
  assert.equal(VINHOMES2B_CROSSROAD_MAX_X, 469.75);
  assert.equal(VINHOMES3_INTERSECTION_CENTER_X, 503.0);
  assert.equal(VINHOMES3_CROSSROAD_MIN_X, 469.75);
  assert.equal(VINHOMES3_CROSSROAD_MAX_X, 564.0);

  // Full N-S road lanes from Sơn Tây (370) and Đại Lộ Paris (503) straight through Z=148 & Z=344 to Z=424
  for (let z = 45; z <= 424; z += 5) {
    for (const laneX of [363.9, 367.9, 372.1, 376.1, 496.9, 500.9, 505.1, 509.1]) {
      assert.equal(
        isBlockedBySoutheastColliders(laneX, z, 0.4),
        false,
        `Expected N-S roadway lane X=${laneX}, Z=${z} to be open`
      );
    }
  }

  // Both new inner boulevards (VHM X=282.0 & VH2B X=436.5) are open Z=148..424 with capped North T-junctions at Z=134.3
  for (const centerX of [VINHOMES_MID_INTERSECTION_CENTER_X, VINHOMES2B_INTERSECTION_CENTER_X]) {
    for (let z = 148; z <= 424; z += 5) {
      for (const offset of [-6.1, -2.1, 2.1, 6.1]) {
        assert.equal(
          isBlockedBySoutheastColliders(centerX + offset, z, 0.4),
          false,
          `Expected inner Vinhomes N-S lane X=${centerX + offset}, Z=${z} to be open`
        );
      }
    }
    assert.equal(isBlockedBySoutheastColliders(centerX, 134.3, 0.4), true, `North T-junction at X=${centerX} must stay capped`);
    assert.equal(isBlockedBySoutheastColliders(centerX, VINHOMES_SOUTH_END_Z, 0.4), true, `South cap at X=${centerX} must stay sealed`);
  }

  // Connecting promenades between all adjacent blocks stay wide open on North (Z=163.8) & South (Z=328.2), while rear cores (Z=177.2 & Z=314.6) seal the blocks
  for (const midGapX of [237.75, 326.0, 403.25, 469.75]) {
    assert.equal(isBlockedBySoutheastColliders(midGapX, 163.8, 0.35), false, `North connecting promenade at X=${midGapX} must be open`);
    assert.equal(isBlockedBySoutheastColliders(midGapX, 328.2, 0.35), false, `South connecting promenade at X=${midGapX} must be open`);
    assert.equal(isBlockedBySoutheastColliders(midGapX, 177.2, 0.35), true, `North connecting shophouse rear wall at X=${midGapX} must be solid`);
    assert.equal(isBlockedBySoutheastColliders(midGapX, 314.6, 0.35), true, `South connecting shophouse rear wall at X=${midGapX} must be solid`);
  }

  // East-West connection across all 5 Vinhomes avenues is open on both Z=148 & Z=344
  for (const cz of [VINHOMES_INTERSECTION_CENTER_Z, VINHOMES_SOUTH_INTERSECTION_CENTER_Z]) {
    for (let x = 112; x <= 558; x += 8) {
      for (const zOff of [-5.8, -2.2, 2.2, 5.8]) {
        assert.equal(
          isBlockedBySoutheastColliders(x, cz + zOff, 0.4),
          false,
          `Expected connected E-W crossroad X=${x}, Z=${cz + zOff} to be open`
        );
      }
    }
    assert.equal(isBlockedBySoutheastColliders(238.0, cz, 0.4), false, `Join at X=238, Z=${cz} must stay open`);
    assert.equal(isBlockedBySoutheastColliders(326.0, cz, 0.4), false, `Join at X=326, Z=${cz} must stay open`);
    assert.equal(isBlockedBySoutheastColliders(403.25, cz, 0.4), false, `Join at X=403.25, Z=${cz} must stay open`);
    assert.equal(isBlockedBySoutheastColliders(469.75, cz, 0.4), false, `Join at X=469.75, Z=${cz} must stay open`);
    assert.equal(isBlockedBySoutheastColliders(104.8, cz, 0.4), true, `West end at X=105, Z=${cz} remains capped`);
    assert.equal(isBlockedBySoutheastColliders(564.1, cz, 0.4), true, `East end at X=564.0, Z=${cz} remains capped`);
  }

  assert.equal(isBlockedBySoutheastColliders(370.0, VINHOMES_SOUTH_END_Z, 0.4), true);
  assert.equal(isBlockedBySoutheastColliders(503.0, VINHOMES_SOUTH_END_Z, 0.4), true);
});

test('Motorbike exterior bounds permit seamless riding across Vinhomes 1 <-> Mid <-> 2 <-> 2B <-> 3', () => {
  const samples: Array<[number, number]> = [
    [VINHOMES_INTERSECTION_CENTER_X, 148.0],
    [238.0, 148.0],
    [238.0, 163.8],
    [282.0, 148.0],
    [282.0, 240.0],
    [282.0, 344.0],
    [282.0, 415.0],
    [326.0, 148.0],
    [326.0, 328.2],
    [370.0, 120.0],
    [370.0, 148.0],
    [403.25, 148.0],
    [436.5, 148.0],
    [436.5, 240.0],
    [436.5, 344.0],
    [436.5, 415.0],
    [469.75, 148.0],
    [503.0, 120.0],
    [503.0, 148.0],
    [555.0, 148.0],
    [370.0, 240.0],
    [503.0, 240.0],
    [370.0, 344.0],
    [503.0, 344.0],
    [555.0, 344.0],
    [370.0, 415.0],
    [503.0, 415.0],
  ];
  for (const [x, z] of samples) {
    const res = clampMotorbikeExteriorBounds(x, z);
    assert.equal(res.x, x, `Motorbike X unexpectedly clamped at (${x}, ${z})`);
    assert.equal(res.z, z, `Motorbike Z unexpectedly clamped at (${x}, ${z})`);
  }
});

test('GPS routing and zone detection connect all 5 Vinhomes districts directly across Z=148', () => {
  const crossRoute = computeCityGpsRoute(VINHOMES_INTERSECTION_CENTER_X, 185.0, VINHOMES2_INTERSECTION_CENTER_X, 185.0);
  assert.ok(
    crossRoute.totalMeters > 150 && crossRoute.totalMeters <= 270,
    `Expected Vinhomes 1 <-> 2 GPS route via Z=148 crossroad (<=270m), got ${crossRoute.totalMeters}m`
  );

  const vh1ToMidRoute = computeCityGpsRoute(VINHOMES_INTERSECTION_CENTER_X, 185.0, VINHOMES_MID_INTERSECTION_CENTER_X, 185.0);
  assert.ok(
    vh1ToMidRoute.totalMeters > 100 && vh1ToMidRoute.totalMeters <= 190,
    `Expected Vinhomes 1 <-> Mid GPS route via Z=148 crossroad (<=190m), got ${vh1ToMidRoute.totalMeters}m`
  );

  const vh2ToVh2bRoute = computeCityGpsRoute(VINHOMES2_INTERSECTION_CENTER_X, 185.0, VINHOMES2B_INTERSECTION_CENTER_X, 185.0);
  assert.ok(
    vh2ToVh2bRoute.totalMeters > 90 && vh2ToVh2bRoute.totalMeters <= 170,
    `Expected Vinhomes 2 <-> 2B GPS route via Z=148 crossroad (<=170m), got ${vh2ToVh2bRoute.totalMeters}m`
  );

  const vh2ToVh3Route = computeCityGpsRoute(VINHOMES2_INTERSECTION_CENTER_X, 185.0, VINHOMES3_INTERSECTION_CENTER_X, 185.0);
  assert.ok(
    vh2ToVh3Route.totalMeters > 120 && vh2ToVh3Route.totalMeters <= 230,
    `Expected Vinhomes 2 <-> 3 GPS route via Z=148 crossroad (<=230m), got ${vh2ToVh3Route.totalMeters}m`
  );

  assert.equal(detectCurrentCityZone(282.0, 148.0, 1), 'Ngã Ba Đại Lộ Ocean Park');
  assert.equal(detectCurrentCityZone(282.0, 230.0, 1), 'Vinhomes Ocean Park Trung Tâm');
  assert.equal(detectCurrentCityZone(282.0, 344.0, 1), 'Ngã Tư Nam Ocean Park Trung Tâm');
  assert.equal(detectCurrentCityZone(257.0, 210.0, 1), 'Dãy Shophouse Ocean Park Trung Tâm Tây');
  assert.equal(detectCurrentCityZone(307.0, 210.0, 1), 'Dãy Shophouse Ocean Park Trung Tâm Đông');
  assert.equal(detectCurrentCityZone(238.0, 172.0, 1), 'Shophouse Liên Khu Ocean Park Bắc');

  assert.equal(detectCurrentCityZone(436.5, 148.0, 1), 'Ngã Ba Ocean Park 2 Đông');
  assert.equal(detectCurrentCityZone(436.5, 230.0, 1), 'Vinhomes Ocean Park 2 Đông');
  assert.equal(detectCurrentCityZone(436.5, 344.0, 1), 'Ngã Tư Nam Ocean Park 2 Đông');
  assert.equal(detectCurrentCityZone(411.0, 210.0, 1), 'Dãy Shophouse Ocean Park 2 Đông Tây');
  assert.equal(detectCurrentCityZone(461.0, 210.0, 1), 'Dãy Shophouse Ocean Park 2 Đông Đông');

  assert.equal(detectCurrentCityZone(370.0, 148.0, 1), 'Ngã Tư Sơn Tây Nam');
  assert.equal(detectCurrentCityZone(370.0, 230.0, 1), 'Vinhomes Ocean Park 2');
  assert.equal(detectCurrentCityZone(370.0, 344.0, 1), 'Ngã Tư Nam Ocean Park 2');
  assert.equal(detectCurrentCityZone(345.0, 210.0, 1), 'Dãy Shophouse Ocean Park 2 Tây');
  assert.equal(detectCurrentCityZone(395.0, 210.0, 1), 'Dãy Shophouse Ocean Park 2 Đông');

  assert.equal(detectCurrentCityZone(503.0, 148.0, 1), 'Ngã Tư DIOR Nam');
  assert.equal(detectCurrentCityZone(503.0, 230.0, 1), 'Vinhomes Ocean Park 3');
  assert.equal(detectCurrentCityZone(503.0, 344.0, 1), 'Ngã Tư Nam Ocean Park 3');
  assert.equal(detectCurrentCityZone(478.0, 210.0, 1), 'Dãy Shophouse Ocean Park 3 Tây');
  assert.equal(detectCurrentCityZone(528.0, 210.0, 1), 'Dãy Shophouse Ocean Park 3 Đông');
});
