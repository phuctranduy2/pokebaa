import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEST_COASTAL_BEACH_COLLIDERS,
  WEST_COAST_BIKE_MIN_X,
  WEST_COAST_PLAYER_MIN_X,
  WEST_COAST_ROAD_CX,
  WEST_COAST_WATER_Y,
  BEACH_SWIMMER_PROFILES,
  COASTAL_GLB_NPC_ROLES,
  COASTAL_LUXURY_LAMP_HEIGHT,
  getWestCoastalGroundY,
  sampleOceanWaveY,
  shouldShowBeachBathers,
} from './WestCoastalBeachSystem';
import {
  WEST_COASTAL_RESIDENTIAL_OPENINGS,
  WEST_RIVER_RESIDENTIAL_OPENINGS,
} from './westResidentialLayout';
import { HAN_RIVER_COLLIDERS } from './HanRiverSystem';
import { WEST_INTERSECTION_COLLIDERS } from './WestIntersectionSystem';
import { WEST_RESIDENTIAL_COLLIDERS } from './WestResidentialAlleySystem';
import {
  PlayerMotorbikeController,
  clampMotorbikeExteriorBounds,
} from './PlayerMotorbikeSystem';
import { CITY_AREAS, computeCityGpsRoute, detectCurrentCityZone } from './cityMapData';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  compactDynamicVehicleMeshes,
} from './CityVehicleMeshBuilder';
import * as THREE from 'three';

function countMeshes(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) count++;
  });
  return count;
}

test('Ngã 3 Ven Biển, Đường Ven Biển, Đại Lộ Nam 6 tie-in, beach stairs, sand, and surf are unobstructed while facilities are protected', () => {
  const allColliders = [
    ...WEST_INTERSECTION_COLLIDERS,
    ...WEST_RESIDENTIAL_COLLIDERS,
    ...WEST_COASTAL_BEACH_COLLIDERS,
  ];
  const hitsCollider = (x: number, z: number, r = 0.45): boolean =>
    allColliders.some(
      (c) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ
    );

  // Open T-junction mouth & full coastal boulevard
  assert.equal(hitsCollider(-963.5, 29.0), false);
  assert.equal(hitsCollider(WEST_COAST_ROAD_CX, 29.0), false);
  assert.equal(hitsCollider(WEST_COAST_ROAD_CX, -120.0), false);
  assert.equal(hitsCollider(WEST_COAST_ROAD_CX, 180.0), false);
  assert.equal(hitsCollider(WEST_COAST_ROAD_CX, 344.0), false);
  // Open southern coastal link from Đại Lộ Nam 6
  assert.equal(hitsCollider(-962.5, 344.0), false);
  // Open central beach staircase (Z=24..34), golden sand, and shallow surf
  assert.equal(hitsCollider(-995.8, 29.0), false);
  assert.equal(hitsCollider(-1016.0, 29.0), false);
  assert.equal(hitsCollider(-1040.0, 29.0), false);

  // Protected amenities & guardrails
  assert.equal(hitsCollider(-991.0, 0.0), true); // Shower/changing cabin
  assert.equal(hitsCollider(-990.5, 62.5), true); // Coconut Beach Bar counter
  assert.equal(hitsCollider(-991.0, 100.0), true); // Jet-ski & kayak rental booth
  assert.equal(hitsCollider(-1006.0, -26.0), true); // North lifeguard tower
  assert.equal(hitsCollider(-1006.0, 62.0), true); // South lifeguard tower
  assert.equal(hitsCollider(-973.2, -165.4), true); // North end guardrail
  assert.equal(hitsCollider(-973.2, 365.4), true); // South end guardrail
});

test('Coastal ground elevation, motorbike bounds, zone detection, and GPS routing integrate cleanly', () => {
  // Smooth ground elevations from road -> promenade -> sloped sand -> surf
  assert.equal(PlayerMotorbikeController.getExteriorGroundY(-973.2, 29.0), -0.26);
  assert.equal(PlayerMotorbikeController.getExteriorGroundY(-988.0, 29.0), 0.0);
  const sandMidY = getWestCoastalGroundY(-1016.0, 29.0)!;
  const surfY = getWestCoastalGroundY(-1042.0, 29.0)!;
  assert.ok(sandMidY < -0.4 && sandMidY > -0.6, `Expected mid-sand Y near -0.49, got ${sandMidY}`);
  assert.ok(surfY < -1.0 && surfY > -1.25, `Expected surf Y near -1.05, got ${surfY}`);

  // Đại Lộ Nam 6 ramp smoothly bridges -0.26 at X=-965 to +0.035 at X=-960
  const rampMidY = PlayerMotorbikeController.getExteriorGroundY(-962.5, 344.0);
  assert.ok(Math.abs(rampMidY - (-0.26 + 0.295 * 0.5)) < 0.01);

  // Motorbike can cruise Đường Ven Biển and park on Promenade, but stops before the sandy beach
  const rideRoad = clampMotorbikeExteriorBounds(-973.2, 29.0);
  assert.equal(rideRoad.clamped, false);
  const parkPromenade = clampMotorbikeExteriorBounds(-992.0, 63.0);
  assert.equal(parkPromenade.clamped, false);
  const blockedOnSand = clampMotorbikeExteriorBounds(-1015.0, 29.0);
  assert.equal(blockedOnSand.clamped, true);
  assert.equal(blockedOnSand.x, WEST_COAST_BIKE_MIN_X);
  assert.ok(WEST_COAST_PLAYER_MIN_X < -1040.0);

  // Zone names & GPS route from Card Shop to Coconut Beach Bar
  assert.equal(detectCurrentCityZone(-973.2, 29.0, 1), 'Ngã 3 Ven Biển • Đại Lộ Trung Tâm');
  assert.equal(detectCurrentCityZone(-988.0, 29.0, 1), 'Phố Đi Bộ Ven Biển Mỹ Khê Tây');
  assert.equal(detectCurrentCityZone(-1016.0, 29.0, 1), 'Bãi Cát Vàng Mỹ Khê Tây');
  assert.equal(detectCurrentCityZone(-1040.0, 29.0, 1), 'Biển Mỹ Khê Tây • Khu Tắm Biển');

  const route = computeCityGpsRoute(0, 29, -984, 63);
  assert.ok(route.totalMeters > 950 && route.totalMeters < 1150);
  assert.ok(route.points.length >= 4);
});

test('compactDynamicVehicleMeshes drastically cuts draw calls while preserving live wheel and rider subtrees', () => {
  const car = buildCityCarMesh({ color: 0x0ea5e9, variant: 'sedan', noMerge: true });
  const carBefore = countMeshes(car.group);
  compactDynamicVehicleMeshes(car.group, car.wheels);
  const carAfter = countMeshes(car.group);
  assert.equal(car.wheels.length, 4);
  assert.ok(carAfter < carBefore * 0.55, `Expected car compaction (<55%), got ${carAfter}/${carBefore}`);

  const moto = buildCityMotorbikeMesh({
    color: 0xe11d48,
    variant: 'scooter',
    includeRider: true,
    includePassenger: true,
    noMerge: true,
  });
  const motoBefore = countMeshes(moto.group);
  compactDynamicVehicleMeshes(moto.group, moto.wheels, moto.riderGroup);
  const motoAfter = countMeshes(moto.group);
  assert.equal(moto.wheels.length, 2);
  assert.ok(moto.riderGroup && countMeshes(moto.riderGroup) >= 1);
  assert.ok(motoAfter < motoBefore * 0.55, `Expected moto compaction (<55%), got ${motoAfter}/${motoBefore}`);
});

test('sampleOceanWaveY produces real rolling ocean swells & currents while staying above the sloped seabed', () => {
  let minOffshore = Infinity;
  let maxOffshore = -Infinity;
  for (let i = 0; i < 60; i++) {
    const t = i * 0.15;
    const wy = sampleOceanWaveY(-1060.0, 29.0, t);
    if (wy < minOffshore) minOffshore = wy;
    if (wy > maxOffshore) maxOffshore = wy;
  }
  // Distinct rolling swell amplitude (> 0.65m trough-to-crest offshore)
  assert.ok(
    maxOffshore - minOffshore > 0.65,
    `Expected strong rolling wave oscillation (>0.65m), got ${(maxOffshore - minOffshore).toFixed(3)}m`
  );
  assert.ok(maxOffshore > WEST_COAST_WATER_Y + 0.3, 'Wave crest should rise well above mean sea level');
  assert.ok(minOffshore < WEST_COAST_WATER_Y - 0.3, 'Wave trough should dip well below mean sea level');

  // Diagonal ocean current ("hải lưu") varies height spatially along the coastline (Z)
  const zSamples = [0, 15, 30, 45, 60].map((z) => sampleOceanWaveY(-1055.0, z, 2.0));
  const zSpread = Math.max(...zSamples) - Math.min(...zSamples);
  assert.ok(zSpread > 0.2, `Expected spatial current undulation along Z (>0.2m), got ${zSpread.toFixed(3)}m`);

  // Mean sea surface stays clearly above the submerged wading seabed at X = -1042
  const seabedAtWading = getWestCoastalGroundY(-1042.0, 29.0)!;
  assert.ok(
    WEST_COAST_WATER_Y > seabedAtWading + 0.18,
    `Expected water level (${WEST_COAST_WATER_Y}) above wading seabed (${seabedAtWading})`
  );
});

test('Đường Ven Sông Bạch Đằng Tây connects Võ Nguyên Giáp to Bạch Đằng, Sông Hàn meets the ocean continuously, and beach bathers hide in rain with proper swimwear', () => {
  const allColliders = [
    ...WEST_INTERSECTION_COLLIDERS,
    ...WEST_RESIDENTIAL_COLLIDERS,
    ...WEST_COASTAL_BEACH_COLLIDERS,
    ...HAN_RIVER_COLLIDERS,
  ];
  const hitsCollider = (x: number, z: number, r = 0.45): boolean =>
    allColliders.some(
      (c) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ
    );

  // Full riverfront road from Đường Ven Biển (-973.2) straight to Đường Bạch Đằng (-227.5, Z=-117.5) is unobstructed
  for (const x of [-973.2, -920.0, -760.0, -540.0, -320.0, -235.0, -227.5]) {
    assert.equal(hitsCollider(x, -145.2), false, `Đường Ven Sông Bạch Đằng Tây blocked at x=${x}`);
    assert.equal(PlayerMotorbikeController.getExteriorGroundY(x, -145.2), -0.26);
    const clamped = clampMotorbikeExteriorBounds(x, -145.2);
    assert.equal(clamped.clamped, false, `Motorbike bounds blocked Đường Ven Sông at x=${x}`);
  }
  // East tie-in leg down to Ngã 3 Bạch Đằng (Z = -145.2 -> -117.5) is unobstructed
  for (const z of [-145.2, -135.0, -126.0, -117.5]) {
    assert.equal(hitsCollider(-227.5, z), false, `Bạch Đằng tie-in blocked at z=${z}`);
    const clamped = clampMotorbikeExteriorBounds(-227.5, z);
    assert.equal(clamped.clamped, false, `Motorbike bounds blocked Bạch Đằng tie-in at z=${z}`);
  }
  // North guardrail protects river drop-off along Bờ Kè Ven Sông
  assert.equal(hitsCollider(-600.0, -164.8), true);

  // Map water areas connect Sông Hàn continuously westward into Biển Mỹ Khê Tây
  const estuary = CITY_AREAS.find((a) => a.id === 'han_river_estuary_water');
  const ocean = CITY_AREAS.find((a) => a.id === 'west_ocean_sea');
  const hanRiver = CITY_AREAS.find((a) => a.id === 'han_river_water');
  assert.ok(estuary && ocean && hanRiver, 'Expected estuary, ocean, and Sông Hàn water areas');
  assert.ok(estuary.minX <= ocean.maxX + 1.0, 'Estuary must overlap/connect into west ocean');
  assert.ok(estuary.maxX >= hanRiver.minX - 1.0, 'Estuary must overlap/connect into Sông Hàn');

  // Zone names & GPS route along the new riverfront road
  assert.equal(detectCurrentCityZone(-600.0, -145.2, 1), 'Đường Ven Sông Bạch Đằng Tây');
  assert.equal(detectCurrentCityZone(-600.0, -159.0, 1), 'Bờ Kè Ven Sông Bạch Đằng Tây');
  assert.equal(detectCurrentCityZone(-973.2, -145.2, 1), 'Ngã 3 Ven Biển • Sông Hàn');
  const coastalToBachDang = computeCityGpsRoute(-973.2, -145.2, -227.5, -117.5);
  assert.ok(coastalToBachDang.points.length >= 3);
  assert.ok(
    coastalToBachDang.totalMeters < 820,
    `Expected direct riverfront GPS route < 820m, got ${coastalToBachDang.totalMeters}m`
  );

  // Beach bathers hide completely when raining and appear in dry weather
  assert.equal(shouldShowBeachBathers(true), false);
  assert.equal(shouldShowBeachBathers(false), true);

  // Every male beach bather wears swim trunks and every female beach bather wears a bikini
  assert.ok(BEACH_SWIMMER_PROFILES.length >= 16);
  const males = BEACH_SWIMMER_PROFILES.filter((p) => p.gender === 'male');
  const females = BEACH_SWIMMER_PROFILES.filter((p) => p.gender === 'female');
  assert.ok(males.length >= 6 && females.length >= 6);
  males.forEach((m, i) => {
    assert.equal(m.swimwear, 'swim_trunks', `Male beach NPC #${i} must wear swim_trunks`);
  });
  females.forEach((f, i) => {
    assert.equal(f.swimwear, 'bikini', `Female beach NPC #${i} must wear bikini`);
  });
});

test('ALL 9 residential inner streets connect directly to Đường Ven Biển & ALL 7 Row N4 alleys / Công Viên Tổ 7 connect directly to Sông Hàn, with luxury coastal lighting & GLB NPCs', () => {
  const allColliders = [
    ...WEST_INTERSECTION_COLLIDERS,
    ...WEST_RESIDENTIAL_COLLIDERS,
    ...WEST_COASTAL_BEACH_COLLIDERS,
    ...HAN_RIVER_COLLIDERS,
  ];
  const hitsCollider = (x: number, z: number, r = 0.42): boolean =>
    allColliders.some(
      (c) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ
    );

  // 1. ALL 9 coastal-reaching residential inner streets (Bắc 1/2/3, Nam 1..6) cross X = -965..-960 onto Đường Ven Biển unobstructed!
  assert.equal(WEST_COASTAL_RESIDENTIAL_OPENINGS.length, 9);
  for (const op of WEST_COASTAL_RESIDENTIAL_OPENINGS) {
    for (const tx of [-973.2, -965.0, -962.5, -960.0, -956.0]) {
      assert.equal(
        hitsCollider(tx, op.cz),
        false,
        `Coastal residential link ${op.id} blocked by collider at x=${tx}, z=${op.cz}`
      );
      const clamped = clampMotorbikeExteriorBounds(tx, op.cz);
      assert.ok(
        Math.abs(clamped.x - tx) <= 0.01 && Math.abs(clamped.z - op.cz) <= 0.01,
        `Motorbike bounds blocked coastal residential link ${op.id} at x=${tx}, z=${op.cz} -> (${clamped.x}, ${clamped.z})`
      );
    }
    const midRampY = PlayerMotorbikeController.getExteriorGroundY(-962.5, op.cz);
    assert.ok(
      Math.abs(midRampY - (-0.26 + 0.295 * 0.5)) < 0.015,
      `Expected smooth sloped coastal ramp for ${op.id}, got ${midRampY}`
    );
  }

  // Direct GPS route from Bắc 2 residential street straight onto Đường Ven Biển (no detour via Đại Lộ Trung Tâm!)
  const bac2ToOcean = computeCityGpsRoute(-920, -60, -973.2, -60);
  assert.ok(
    bac2ToOcean.totalMeters < 90,
    `Expected direct Bắc 2 -> Đường Ven Biển route < 90m, got ${bac2ToOcean.totalMeters}m`
  );

  // 2. ALL 6 Row N4 alleys + Công Viên Tổ 7 Riverfront Gate cross Z = -137..-134 onto Đường Ven Sông Bạch Đằng Tây unobstructed!
  assert.equal(WEST_RIVER_RESIDENTIAL_OPENINGS.length, 7);
  for (const op of WEST_RIVER_RESIDENTIAL_OPENINGS) {
    for (const tz of [-145.2, -137.0, -135.5, -134.0, -131.0]) {
      assert.equal(
        hitsCollider(op.cx, tz),
        false,
        `Riverfront residential link ${op.id} blocked by collider at x=${op.cx}, z=${tz}`
      );
      const clamped = clampMotorbikeExteriorBounds(op.cx, tz);
      assert.ok(
        Math.abs(clamped.x - op.cx) <= 0.01 && Math.abs(clamped.z - tz) <= 0.01,
        `Motorbike bounds blocked riverfront residential link ${op.id} at x=${op.cx}, z=${tz} -> (${clamped.x}, ${clamped.z})`
      );
    }
    const midRampY = PlayerMotorbikeController.getExteriorGroundY(op.cx, -135.5);
    assert.ok(
      Math.abs(midRampY - (-0.26 + 0.295 * 0.5)) < 0.015,
      `Expected smooth sloped riverfront ramp for ${op.id}, got ${midRampY}`
    );
  }

  // Direct GPS route from Bắc 3 / Row N4 alley straight out to Đường Ven Sông Bạch Đằng Tây!
  const bac3ToRiver = computeCityGpsRoute(-708, -98, -708, -145.2);
  assert.ok(
    bac3ToRiver.totalMeters < 80,
    `Expected direct Row N4 alley -> Sông Hàn route < 80m, got ${bac3ToRiver.totalMeters}m`
  );

  // 3. Luxury architectural coastal streetlamps & city-grade GLB coastal NPC roles
  assert.ok(COASTAL_LUXURY_LAMP_HEIGHT >= 7.5, 'Luxury coastal streetlamps should be >= 7.5m tall');
  assert.ok(COASTAL_GLB_NPC_ROLES.includes('promenade_walker'));
  assert.ok(COASTAL_GLB_NPC_ROLES.includes('lifeguard'));
  assert.ok(COASTAL_GLB_NPC_ROLES.includes('beach_bar_staff'));
  assert.ok(COASTAL_GLB_NPC_ROLES.includes('beach_bar_guest'));
});



