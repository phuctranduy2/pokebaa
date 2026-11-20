import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEST_SCHOOL_DISTRICT_COLLIDERS,
  FAHASA_BOOKSTORE_FLOOR_H,
  FAHASA_BOOKSTORE_MIN_X,
  FAHASA_BOOKSTORE_MAX_X,
  SNACK_ALLEY_MIN_X,
  SNACK_ALLEY_MAX_X,
  YOUTH_PARK_MIN_Z,
  YOUTH_PARK_MAX_Z,
} from './WestSchoolDistrictSystem';
import { CITY_BUILDINGS, CITY_POIS, computeCityGpsRoute, detectCurrentCityZone } from './cityMapData';
import { isPointInsideRoofedBuilding } from './WeatherSystem';
import { clampMotorbikeExteriorBounds } from './PlayerMotorbikeSystem';
import { WEST_INTERSECTION_COLLIDERS } from './WestIntersectionSystem';
import { PHAN_CHAU_TRINH_COLLIDERS } from './PhanChuTrinhSchoolSystem';

function hitsCollider(x: number, z: number, floor: number): boolean {
  return [...WEST_SCHOOL_DISTRICT_COLLIDERS, ...WEST_INTERSECTION_COLLIDERS, ...PHAN_CHAU_TRINH_COLLIDERS].some(
    (c) => (c.floor === 'both' || (c.floor ?? 1) === floor) && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ
  );
}

test('West School District venues have open entrances, walkable alleyways, clear basketball gates, and 2-floor FAHASA stairwell', () => {
  assert.equal(FAHASA_BOOKSTORE_MIN_X, -393.0);
  assert.equal(FAHASA_BOOKSTORE_MAX_X, -363.0);
  assert.equal(FAHASA_BOOKSTORE_FLOOR_H, 4.2);
  assert.equal(SNACK_ALLEY_MIN_X, -425.0);
  assert.equal(SNACK_ALLEY_MAX_X, -395.0);
  assert.equal(YOUTH_PARK_MIN_Z, 94.0);
  assert.equal(YOUTH_PARK_MAX_Z, 148.0);

  // Sidewalk threshold & FAHASA front/rear doors are open
  assert.equal(hitsCollider(-378.0, 42.6, 1), false);
  assert.equal(hitsCollider(-378.0, 48.0, 1), false);
  assert.equal(hitsCollider(-378.0, 88.0, 1), false);
  // Side walls are solid
  assert.equal(hitsCollider(-385.0, 48.0, 1), true);
  // FAHASA stairwell Floor 1 West lane open; Floor 2 West guardrail solid, East lane open
  assert.equal(hitsCollider(-390.1, 78.0, 1), false);
  assert.equal(hitsCollider(-390.1, 78.0, 2), true);
  assert.equal(hitsCollider(-388.0, 78.0, 2), false);

  // Connecting pedestrian alley between Bookstore and Snack Alley (X = -394) is unobstructed end-to-end
  assert.equal(hitsCollider(-394.0, 42.6, 1), false);
  assert.equal(hitsCollider(-394.0, 68.0, 1), false);
  assert.equal(hitsCollider(-394.0, 93.0, 1), false);

  // Snack Alley central promenade is clear, kiosk front counters/walls are solid, and staff doors + interiors are walkable!
  assert.equal(hitsCollider(-410.0, 43.2, 1), false);
  assert.equal(hitsCollider(-410.0, 68.0, 1), false);
  assert.equal(hitsCollider(-418.5, 53.5, 1), true);
  assert.equal(hitsCollider(-422.2, 49.3, 1), false);
  assert.equal(hitsCollider(-421.0, 53.5, 1), false);
  assert.equal(hitsCollider(-397.8, 49.3, 1), false);
  assert.equal(hitsCollider(-398.9, 53.5, 1), false);

  // Basketball 3x3 North, West & East gates + Phan Châu Trinh School West Side Gate (Z = 103.0) are open!
  assert.equal(hitsCollider(-378.0, 96.0, 1), false);
  assert.equal(hitsCollider(-393.0, 121.0, 1), false);
  assert.equal(hitsCollider(-378.5, 121.0, 1), false);
  assert.equal(hitsCollider(-364.0, 103.5, 1), false);
  assert.equal(hitsCollider(-361.0, 103.0, 1), false);
  assert.equal(hitsCollider(-355.0, 103.0, 1), false);
  assert.equal(hitsCollider(-361.0, 90.0, 1), true);
  assert.equal(hitsCollider(-364.0, 120.0, 1), true);
});

test('West School District is registered on city map, weather, motorbike bounds, and GPS routing', () => {
  for (const id of ['fahasa_bookstore', 'school_snack_alley', 'youth_basketball_park']) {
    assert.ok(CITY_BUILDINGS.some((b) => b.id === id), `building ${id} should exist`);
  }
  for (const poiId of ['poi_fahasa_bookstore', 'poi_school_snack_alley', 'poi_youth_basketball_park']) {
    assert.ok(CITY_POIS.some((p) => p.id === poiId), `POI ${poiId} should exist`);
  }

  // Weather shelter checks: indoors FAHASA dry, open-air snack promenade & basketball court wet
  assert.equal(isPointInsideRoofedBuilding(-378.0, 65.0), true);
  assert.equal(isPointInsideRoofedBuilding(-410.0, 65.0), false);
  assert.equal(isPointInsideRoofedBuilding(-421.0, 53.5), true);
  assert.equal(isPointInsideRoofedBuilding(-378.5, 121.0), false);

  // Motorbike can ride freely into Phố Ăn Vặt, Hẻm Đèn Lồng, Fountain Plaza, Skatepark, and Sân Bóng Rổ 3x3 from all open approaches!
  const rideableWaypoints: Array<[number, number, string]> = [
    [-410.0, 44.0, 'Phố Ăn Vặt North entrance'],
    [-410.0, 68.0, 'Phố Ăn Vặt central promenade'],
    [-394.0, 70.0, 'Hẻm Đèn Lồng'],
    [-426.0, 92.0, 'Đường Kết Nối Nam East curb (North of vending machine)'],
    [-425.9, 110.0, 'Đường Kết Nối Nam -> Fountain Plaza transition seam'],
    [-425.0, 110.0, 'Fountain Plaza West open entrance'],
    [-410.0, 112.0, 'Fountain Plaza South walkway'],
    [-378.5, 121.0, 'Sân Bóng Rổ 3x3 center'],
    [-362.5, 103.5, 'Phan Châu Trinh School <-> Basketball East gate'],
    [-395.5, 147.5, 'Đường Nội Khu Nam 2 -> Skatepark/Basketball South entrance'],
    [-395.5, 150.0, 'Đường Nội Khu Nam 2 apron'],
  ];
  for (const [wx, wz, label] of rideableWaypoints) {
    const clamped = clampMotorbikeExteriorBounds(wx, wz);
    assert.ok(
      Math.abs(clamped.x - wx) <= 0.01 && Math.abs(clamped.z - wz) <= 0.01,
      `Motorbike bounds blocked ${label} at (${wx}, ${wz}) -> (${clamped.x}, ${clamped.z})`
    );
    assert.equal(hitsCollider(wx, wz, 1), false, `Collider blocked motorbike at ${label} (${wx}, ${wz})`);
  }
  // Sweep West -> East directly from Đường Kết Nối Nam into Fountain Plaza (Z = 92 & Z = 110) with zero seam snag
  for (const sweepZ of [92.0, 110.0]) {
    for (let sx = -430.0; sx <= -415.0; sx += 0.25) {
      const clamped = clampMotorbikeExteriorBounds(sx, sweepZ);
      assert.ok(
        Math.abs(clamped.x - sx) <= 0.01 && Math.abs(clamped.z - sweepZ) <= 0.01,
        `West->East motorbike sweep blocked at (${sx}, ${sweepZ}) -> (${clamped.x}, ${clamped.z})`
      );
      assert.equal(hitsCollider(sx, sweepZ, 1), false, `West->East collider blocked at (${sx}, ${sweepZ})`);
    }
  }
  // Visual South Skatepark mural wall remains solid
  assert.equal(hitsCollider(-410.0, 146.6, 1), true);

  // Zone labels and GPS routing work cleanly
  assert.ok(detectCurrentCityZone(-378.0, 65.0, 2).includes('Tầng 2'));
  assert.ok(detectCurrentCityZone(-410.0, 65.0, 1).includes('Ăn Vặt'));
  const gps = computeCityGpsRoute(0, 29, -410, 42);
  assert.ok(gps.points.length >= 2);
  assert.ok(gps.totalMeters > 380);
});
