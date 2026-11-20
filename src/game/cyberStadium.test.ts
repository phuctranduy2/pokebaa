import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CYBER_STADIUM_COLLIDERS,
  CYBER_STADIUM_FLOOR_H,
  CYBER_STADIUM_MIN_X,
  CYBER_STADIUM_MAX_X,
} from './CyberStadiumSystem';
import { CITY_BUILDINGS, CITY_POIS } from './cityMapData';
import { isPointInsideRoofedBuilding } from './WeatherSystem';
import { clampMotorbikeExteriorBounds } from './PlayerMotorbikeSystem';
import { WEST_INTERSECTION_COLLIDERS } from './WestIntersectionSystem';

function hitsCollider(x: number, z: number, floor: number): boolean {
  return [...CYBER_STADIUM_COLLIDERS, ...WEST_INTERSECTION_COLLIDERS].some(
    (c) => (c.floor ?? 1) === floor && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ
  );
}

test('Cyber Stadium sits beside Hospital Night Hub with open entrance, unobstructed apron, 2-floor colliders, and clear stairwell', () => {
  assert.equal(CYBER_STADIUM_MIN_X, -361.6);
  assert.equal(CYBER_STADIUM_MAX_X, -342.4);
  assert.equal(CYBER_STADIUM_FLOOR_H, 4.2);

  // Forecourt sidewalk apron threshold (Z = 15.2) & wide open automatic door entrance (Z = 5.3) are 100% OPEN!
  assert.equal(hitsCollider(-352.0, 15.2, 1), false);
  assert.equal(hitsCollider(-352.0, 10.0, 1), false);
  assert.equal(hitsCollider(-352.0, 5.3, 1), false);
  // Left PUBG mural wall & right panel are solid
  assert.equal(hitsCollider(-357.0, 5.3, 1), true);
  assert.equal(hitsCollider(-346.5, 5.3, 1), true);
  // Floor 1 stairwell entrance on West lane (-346.9, -9.4) is OPEN
  assert.equal(hitsCollider(-346.9, -9.4, 1), false);
  // Floor 2 stairwell exit on East lane (-344.8, -9.4) is OPEN, while West drop-off has guardrail
  assert.equal(hitsCollider(-344.8, -9.4, 2), false);
  assert.equal(hitsCollider(-346.9, -9.4, 2), true);
});

test('Cyber Stadium is registered on city map, sheltered indoors from rain, and reachable by motorbike', () => {
  const b = CITY_BUILDINGS.find((item) => item.id === 'cyber_stadium');
  assert.ok(b, 'cyber_stadium building footprint should exist');
  assert.equal(b.floors, 2);

  const poi = CITY_POIS.find((p) => p.id === 'poi_cyber_stadium');
  assert.ok(poi, 'poi_cyber_stadium POI should exist');
  assert.equal(poi.openHours, '24/7');

  // Rain stops indoors (Z = -5) but falls on open-air front bicycle/motorbike forecourt (Z = 10)
  assert.equal(isPointInsideRoofedBuilding(-352.0, -5.0), true);
  assert.equal(isPointInsideRoofedBuilding(-352.0, 10.0), false);

  // Motorbike can ride right onto Cyber Stadium front forecourt
  const parked = clampMotorbikeExteriorBounds(-352.0, 10.0);
  assert.equal(parked.x, -352.0);
  assert.equal(parked.z, 10.0);
});
