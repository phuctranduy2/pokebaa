import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  APPLE_FLOOR_H,
  APPLE_PODIUM_Y,
  APPLE_STORE_COLLIDERS,
  buildAppleStoreBrowseRoute,
  buildAppleStoreExitRoute,
} from './AppleStoreSystem';
import { FAR_EAST_INTERSECTION_COLLIDERS } from './FarEastIntersectionSystem';
import { isAppleStoreOpenAtHour } from './VenueOperatingHours';

function overlapsPoint(
  colliders: Array<{ minX: number; maxX: number; minZ: number; maxZ: number; floor?: number | 'both' }>,
  x: number,
  z: number,
  floor: number
): boolean {
  const r = 0.22;
  return colliders.some((c) => {
    const f = c.floor ?? 1;
    if (f !== 'both' && f !== floor) return false;
    return x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ;
  });
}

function assertRouteClear(start: THREE.Vector3, pts: THREE.Vector3[], label: string) {
  let prev = start.clone();
  for (let i = 0; i < pts.length; i++) {
    const next = pts[i];
    const samples = 24;
    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const x = prev.x + (next.x - prev.x) * t;
      const y = prev.y + (next.y - prev.y) * t;
      const z = prev.z + (next.z - prev.z) * t;

      // Never clip stairwell center spine wall (X = 409.12..409.48, Z = -42.3..-37.2)
      const hitsCenterWall = x + 0.18 > 409.12 && x - 0.18 < 409.48 && z + 0.18 > -42.3 && z - 0.18 < -37.2;
      assert.equal(
        hitsCenterWall,
        false,
        `${label} segment ${i} clipped stairCenterWall at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
      );

      // When clearly on Floor 1 or Floor 2 outside the stair slope, ensure no furniture/wall/fountain overlap
      const inStairSlope = x >= 406.9 && z <= -37.1 && y > APPLE_PODIUM_Y + 0.05 && y < APPLE_PODIUM_Y + APPLE_FLOOR_H - 0.05;
      if (!inStairSlope) {
        const floor = y > APPLE_PODIUM_Y + APPLE_FLOOR_H * 0.5 ? 2 : 1;
        assert.equal(
          overlapsPoint(APPLE_STORE_COLLIDERS, x, z, floor),
          false,
          `${label} segment ${i} hit floor ${floor} collider at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
        );
      }
    }
    prev = next;
  }
}

test('AppleStoreSystem opens daily from 07:00 to 23:00', () => {
  assert.equal(isAppleStoreOpenAtHour(6.5), false);
  assert.equal(isAppleStoreOpenAtHour(7.0), true);
  assert.equal(isAppleStoreOpenAtHour(15.0), true);
  assert.equal(isAppleStoreOpenAtHour(22.9), true);
  assert.equal(isAppleStoreOpenAtHour(23.0), false);
});

test('AppleStoreSystem keeps plaza central walkway, entrance doorway, and Floor 1 & Floor 2 walkable', () => {
  assert.equal(APPLE_PODIUM_Y, 0.08);
  assert.equal(APPLE_FLOOR_H, 4.6);
  const allColliders = [...FAR_EAST_INTERSECTION_COLLIDERS, ...APPLE_STORE_COLLIDERS];
  // Central plaza path between the two fountain basins
  assert.equal(overlapsPoint(allColliders, 385.8, -31.0, 1), false);
  // Sliding door threshold
  assert.equal(overlapsPoint(allColliders, 388.95, -31.0, 1), false);
  // Central aisle inside Floor 1 & Floor 2
  assert.equal(overlapsPoint(allColliders, 396.0, -31.0, 1), false);
  assert.equal(overlapsPoint(allColliders, 403.5, -31.0, 2), false);
  // Fountain pools & oak tables are properly collided
  assert.equal(overlapsPoint(allColliders, 385.8, -39.8, 1), true);
  assert.equal(overlapsPoint(allColliders, 393.0, -31.0, 1), true);
});

test('AppleStoreSystem NPC stair & multi-floor routes avoid tables, railings, and stairCenterWall', () => {
  const f2Y = APPLE_PODIUM_Y + APPLE_FLOOR_H;
  const midY = APPLE_PODIUM_Y + APPLE_FLOOR_H * 0.5;

  // Outside spawn -> Floor 2 Genius Bar / Mac Studio spot
  const outsideStart = new THREE.Vector3(383.2, 0.02, -32.4);
  const upRoute = buildAppleStoreBrowseRoute(outsideStart, { x: 398.0, z: -37.0 }, 2, true);
  assertRouteClear(new THREE.Vector3(385.5, APPLE_PODIUM_Y, -31.0), upRoute, 'outside->F2');

  // Floor 2 spot -> Floor 1 spot via NE switchback stairs
  const f2Spot = new THREE.Vector3(398.0, f2Y, -25.0);
  const downBrowse = buildAppleStoreBrowseRoute(f2Spot, { x: 391.4, z: -38.8 }, 1, false);
  assertRouteClear(f2Spot, downBrowse, 'F2->F1');

  // Floor 1 spot -> Floor 2 spot via NE switchback stairs
  const f1Spot = new THREE.Vector3(401.2, APPLE_PODIUM_Y, -22.5);
  const upBrowse = buildAppleStoreBrowseRoute(f1Spot, { x: 405.8, z: -27.0 }, 2, false);
  assertRouteClear(f1Spot, upBrowse, 'F1->F2');

  // Mid-browse Exit routes from Floor 2 and from mid-staircase
  assertRouteClear(f2Spot, buildAppleStoreExitRoute(f2Spot, 8), 'exit-from-F2');
  const onFlight2 = new THREE.Vector3(410.6, midY + 1.1, -39.8);
  assertRouteClear(onFlight2, buildAppleStoreExitRoute(onFlight2, 9), 'exit-from-Flight2');
  const onLanding = new THREE.Vector3(409.5, midY, -43.35);
  assertRouteClear(onLanding, buildAppleStoreExitRoute(onLanding, 10), 'exit-from-Landing');
  const onFlight1 = new THREE.Vector3(408.05, APPLE_PODIUM_Y + 1.1, -39.8);
  assertRouteClear(onFlight1, buildAppleStoreExitRoute(onFlight1, 4), 'exit-from-Flight1');
});

