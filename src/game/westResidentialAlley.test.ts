import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEST_RESIDENTIAL_COLLIDERS,
  WEST_RES_MIN_X,
  WEST_RES_EXPANSION_MIN_X,
  WEST_RES_MAX_X,
  WEST_RES_EAST_REAR_MAX_X,
  WEST_RES_MIN_Z,
  WEST_RES_MAX_Z,
  WEST_RES_REAR_MIN_Z,
  WEST_RES_SOUTH_MIN_X,
  WEST_RES_SOUTH_MAX_X,
  WEST_RES_SOUTH_S3_MAX_X,
  WEST_RES_SOUTH_MIN_Z,
  WEST_RES_SOUTH_MAX_Z,
  WEST_RES_ALLEY_MIN_X,
  WEST_RES_ALLEY_MAX_X,
  WEST_RES_HEM485_MIN_X,
  WEST_RES_HEM485_MAX_X,
  WEST_RES_HEM545_MIN_X,
  WEST_RES_HEM545_MAX_X,
  WEST_RES_HEM605_MIN_X,
  WEST_RES_HEM605_MAX_X,
  WEST_RES_HEM665_MIN_X,
  WEST_RES_HEM665_MAX_X,
  WEST_RES_HEM426_MIN_X,
  WEST_RES_HEM426_MAX_X,
  WEST_RES_HEM490_MIN_X,
  WEST_RES_HEM490_MAX_X,
  WEST_RES_HEM550_MIN_X,
  WEST_RES_HEM550_MAX_X,
  WEST_RES_HEM610_MIN_X,
  WEST_RES_HEM610_MAX_X,
  WEST_ALLEYS,
  WEST_INNER_ROADS,
  WEST_WALKABLE_SHOPS,
  ALL_WEST_ROW_SEGMENTS,
  RESIDENTIAL_F1_HEIGHT,
  RESIDENTIAL_BALCONY_BOTTOM_Y,
  RESIDENTIAL_SIGNBOARD_BOTTOM_Y,
  RESIDENTIAL_SIGNBOARD_TOP_Y,
  RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS,
  computeAutoDoorTargetOpen,
  isResidentialMarketOpenAtHour,
  isPointBlockedByClosedResidentialMarkets,
} from './WestResidentialAlleySystem';
import { WEST_INTERSECTION_COLLIDERS } from './WestIntersectionSystem';
import { VINHOMES_COLLIDERS } from './VinhomesOceanParkSystem';
import { CITY_BUILDINGS, CITY_POIS, CITY_ROADS, computeCityGpsRoute, detectCurrentCityZone } from './cityMapData';
import { isPointInsideRoofedBuilding } from './WeatherSystem';
import { clampMotorbikeExteriorBounds } from './PlayerMotorbikeSystem';
import { DELIVERY_DROP_LOCATIONS } from './cardDeliverySystem';

function hitsCollider(x: number, z: number, floor = 1): boolean {
  return [...WEST_RESIDENTIAL_COLLIDERS, ...WEST_INTERSECTION_COLLIDERS, ...VINHOMES_COLLIDERS].some(
    (c) => (c.floor === 'both' || (c.floor ?? 1) === floor) && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ
  );
}

test('Mega Phố Cư Dân Tây (-960..-242/-305, 56 alleys, 5 inner streets, 27 walkable shops) has open lanes & doors', () => {
  assert.equal(WEST_RES_MIN_X, -425.0);
  assert.equal(WEST_RES_EXPANSION_MIN_X, -960.0);
  assert.equal(WEST_RES_MAX_X, -362.0);
  assert.equal(WEST_RES_EAST_REAR_MAX_X, -242.0);
  assert.equal(WEST_RES_MIN_Z, -18.0);
  assert.equal(WEST_RES_MAX_Z, 15.6);
  assert.equal(WEST_RES_REAR_MIN_Z, -134.0);
  assert.equal(WEST_RES_SOUTH_MIN_X, -960.0);
  assert.equal(WEST_RES_SOUTH_MAX_X, -426.0);
  assert.equal(WEST_RES_SOUTH_S3_MAX_X, -305.0);
  assert.equal(WEST_RES_SOUTH_MIN_Z, 42.5);
  assert.equal(WEST_RES_SOUTH_MAX_Z, 362.0);

  // Widened 5.6m–6.0m primary alleys
  assert.equal(WEST_RES_ALLEY_MIN_X, -396.4);
  assert.equal(WEST_RES_ALLEY_MAX_X, -390.8);
  assert.equal(WEST_RES_HEM485_MIN_X, -488.6);
  assert.equal(WEST_RES_HEM485_MAX_X, -482.6);
  assert.equal(WEST_RES_HEM545_MIN_X, -550.4);
  assert.equal(WEST_RES_HEM545_MAX_X, -544.4);
  assert.equal(WEST_RES_HEM605_MIN_X, -612.6);
  assert.equal(WEST_RES_HEM605_MAX_X, -606.6);
  assert.equal(WEST_RES_HEM665_MIN_X, -674.6);
  assert.equal(WEST_RES_HEM665_MAX_X, -668.6);
  assert.equal(WEST_RES_HEM426_MIN_X, -488.6);
  assert.equal(WEST_RES_HEM426_MAX_X, -482.6);
  assert.equal(WEST_RES_HEM490_MIN_X, -550.4);
  assert.equal(WEST_RES_HEM490_MAX_X, -544.4);
  assert.equal(WEST_RES_HEM550_MIN_X, -612.6);
  assert.equal(WEST_RES_HEM550_MAX_X, -606.6);
  assert.equal(WEST_RES_HEM610_MIN_X, -674.6);
  assert.equal(WEST_RES_HEM610_MAX_X, -668.6);

  assert.equal(WEST_INNER_ROADS.length, 10);
  assert.equal(WEST_ALLEYS.length, 101);
  assert.equal(WEST_WALKABLE_SHOPS.length, 46);
  assert.equal(ALL_WEST_ROW_SEGMENTS.length, 138);

  // Extended NW & SW sidewalk aprons are open from -366 out to -955, and SW corner into Snack Alley is unobstructed
  [-366.8, -485.6, -547.4, -671.6, -795.0, -919.0, -955.0].forEach((sx) => {
    assert.equal(hitsCollider(sx, 15.2), false, `North sidewalk blocked at ${sx}`);
  });
  [-425.5, -485.6, -609.6, -733.0, -857.0, -955.0].forEach((sx) => {
    assert.equal(hitsCollider(sx, 42.6), false, `South sidewalk blocked at ${sx}`);
  });
  assert.equal(hitsCollider(-963.5, 29.0), false); // Far-West mouth now opens cleanly into Ngã 3 Ven Biển & Mỹ Khê Tây Beach!

  // EVERY ONE of the 56 alleys is unobstructed across entry, midpoint, and exit!
  for (const a of WEST_ALLEYS) {
    assert.ok(a.maxX - a.minX >= 5.59, `Alley ${a.id} narrower than 5.6m`);
    const midZ = (a.minZ + a.maxZ) * 0.5;
    assert.equal(hitsCollider(a.cx, a.minZ + 1.5), false, `Alley ${a.id} blocked near minZ`);
    assert.equal(hitsCollider(a.cx, midZ), false, `Alley ${a.id} blocked at center`);
    assert.equal(hitsCollider(a.cx, a.maxZ - 1.5), false, `Alley ${a.id} blocked near maxZ`);
  }

  // All 8 inner streets + open East junctions Bắc 1/2/3 & South Hospital crossings into Đại Lộ Bệnh Viện (-227.5)
  for (const r of WEST_INNER_ROADS) {
    assert.equal(hitsCollider((r.x1 + r.x2) * 0.5, r.cz), false, `Inner road ${r.id} blocked at mid`);
    if (r.x1 <= -485.6 && r.x2 >= -485.6) {
      assert.equal(hitsCollider(-485.6, r.cz), false, `Inner road ${r.id} blocked at -485.6`);
    }
  }
  assert.equal(hitsCollider(-241.5, -22.0), false); // Bắc 1 East mouth open into Đại Lộ Bệnh Viện
  assert.equal(hitsCollider(-241.5, -60.0), false); // Bắc 2 East mouth open into Đại Lộ Bệnh Viện
  assert.equal(hitsCollider(-241.5, -98.0), false); // Bắc 3 East mouth open into Đại Lộ Bệnh Viện
  // Old white building at (-227.5, 124) & Z=105 dead-end are completely removed; Đại Lộ Bệnh Viện Nam is open to Z=248!
  assert.equal(hitsCollider(-227.5, 105.0), false);
  assert.equal(hitsCollider(-227.5, 124.0), false);
  assert.equal(hitsCollider(-227.5, 152.0), false);
  assert.equal(hitsCollider(-227.5, 198.0), false);
  assert.equal(hitsCollider(-227.5, 244.0), false);

  // Community & rear lots: behind Cyber Stadium (-303.5), behind Food Hub (-260.6), and behind PCT School (-390, 175)
  assert.equal(hitsCollider(-376.0, -76.0), false); // Sân Cầu Lông Tổ 5 court playable
  assert.equal(hitsCollider(-376.0, -79.0), true);  // Badminton net solid
  assert.equal(hitsCollider(-378.0, -118.0), false); // Công Viên Tổ 7 playable
  assert.equal(hitsCollider(-371.0, -48.0), true);  // Nhà Văn Hóa Tổ 4 Hall solid
  assert.equal(hitsCollider(-303.5, -28.0), false); // Behind Cyber shop front yard
  assert.equal(hitsCollider(-303.5, -43.0), false); // Behind Cyber shop hollow dining floor
  assert.equal(hitsCollider(-345.0, 175.0), false); // Row S3 behind PCT house now has hollow walkable ground floor
  assert.equal(hitsCollider(-345.0, 187.8), true);  // Row S3 behind PCT house rear wall remains solid
  assert.equal(hitsCollider(-390.5, 175.0), false); // Row S3 walkable Tạp Hóa & Trà Chanh floor

  // EVERY ONE of the 27 walkable shops has an open doorway, hollow interior floor, and solid rear counter!
  for (const s of WEST_WALKABLE_SHOPS) {
    assert.equal(hitsCollider(s.doorX, s.doorZ), false, `Shop ${s.id} door blocked`);
    assert.equal(hitsCollider(s.cx, s.cz), false, `Shop ${s.id} interior floor blocked`);
    if (!s.isLegacyCustom) {
      const dirIn = s.facingNorth ? 1 : -1;
      const frontZ = s.facingNorth ? s.minZ : s.maxZ;
      const backZ = s.facingNorth ? s.maxZ : s.minZ;
      assert.equal(hitsCollider(s.cx, frontZ + dirIn * 4.0), false, `Parametric shop ${s.id} walkway blocked`);
      assert.equal(hitsCollider(s.cx, backZ - dirIn * 4.0), true, `Parametric shop ${s.id} rear counter missing`);
    }
  }

  // Regression checks: H4 Quán Cơm Gia Đình centered at -401.0 (w=9.2), S6 Bún Đậu clear of S4 boundary, H7 waiting bench, and mini_mart aisle/gondola
  const h4Shop = WEST_WALKABLE_SHOPS.find((s) => s.id === 'shop_n1_com_giadinh');
  assert.ok(h4Shop);
  assert.equal(h4Shop.cx, -401.0);
  assert.equal(h4Shop.w, 9.2);

  const s6Shop = WEST_WALKABLE_SHOPS.find((s) => s.id === 'shop_s1_bundau_426');
  assert.ok(s6Shop);
  assert.equal(s6Shop.w, 8.6);
  assert.ok(s6Shop.maxX <= -474.0, `S6 maxX (${s6Shop.maxX}) must not protrude into S4 (-474.0)`);
  assert.equal(hitsCollider(-473.4, 62.0), false, 'S4 interior floor (-473.4) must remain clear of S6');

  assert.equal(hitsCollider(-426.4, 1.2), true, 'H7 Sửa Xe Chú Bảy waiting bench should have a solid collider');

  const miniMart = WEST_WALKABLE_SHOPS.find((s) => s.id === 'shop_sc3_minimart_ocean');
  assert.ok(miniMart);
  assert.equal(hitsCollider(miniMart.cx, 170.0), false, 'Mini-mart center walkway should stay open');
  assert.equal(hitsCollider(miniMart.cx + 1.3, 170.0), true, 'Mini-mart center-east gondola should be solid');
  assert.equal(hitsCollider(miniMart.cx + 1.3, 175.8), true, 'Mini-mart freezer chest should be solid');
});

test('Mega Phố Cư Dân Tây integrates with cityMapData, WeatherSystem, PlayerMotorbikeSystem, and cardDeliverySystem', () => {
  // Split building footprints on map (no single monolithic slab covering alleys!)
  const splitBlocks = CITY_BUILDINGS.filter(
    (b) => b.id.startsWith('wr_') || b.id.startsWith('sh') || /^sc\d+_/.test(b.id)
  );
  assert.equal(splitBlocks.length, 138);
  assert.equal(CITY_ROADS.filter((r) => r.kind === 'alley').length, 101);
  assert.equal(
    CITY_ROADS.filter((r) => r.id.startsWith('west_res_') || r.id.startsWith('south_hosp_') || r.id.startsWith('south_exp_') || r.id.startsWith('south_center_') || r.id.startsWith('south_far_') || r.id.startsWith('south_sw_') || r.id.startsWith('south_ocean_')).length,
    17
  );

  for (const s of WEST_WALKABLE_SHOPS) {
    assert.ok(CITY_POIS.some((p) => p.id === `poi_${s.id}`), `Missing map POI for ${s.id}`);
  }
  assert.ok(CITY_POIS.some((p) => p.id === 'poi_west_north3_park'));

  // Delivery drop-offs registered across all zones including Sau Cyber & Sau Trường PCT
  assert.ok(DELIVERY_DROP_LOCATIONS.some((d) => d.poiId === 'poi_shop_n2_oc_sau_cyber'));
  assert.ok(DELIVERY_DROP_LOCATIONS.some((d) => d.poiId === 'poi_shop_n2_trasua_cyber'));
  assert.ok(DELIVERY_DROP_LOCATIONS.some((d) => d.poiId === 'poi_west_north3_park'));
  assert.ok(DELIVERY_DROP_LOCATIONS.some((d) => d.poiId === 'poi_shop_s3_taphoa_sau_truong'));

  // Weather shelter: inside houses/shops/Nhà Văn Hóa Hall dry; ALL 56 alleys, 5 inner streets, parks & yards open-air!
  assert.equal(isPointInsideRoofedBuilding(-371.0, -48.0), true);  // Nhà Văn Hóa Tổ 4 Hall
  assert.equal(isPointInsideRoofedBuilding(-371.0, -32.0), false); // Nhà Văn Hóa front yard
  assert.equal(isPointInsideRoofedBuilding(-303.5, -43.0), true);  // Quán Ốc Sau Cyber
  assert.equal(isPointInsideRoofedBuilding(-835.0, -118.0), true); // Row N4 house
  assert.equal(isPointInsideRoofedBuilding(-390.5, 175.0), true);  // Row S3 shop behind PCT
  for (const a of WEST_ALLEYS) {
    assert.equal(
      isPointInsideRoofedBuilding(a.cx, (a.minZ + a.maxZ) * 0.5),
      false,
      `Alley ${a.id} should be open-air in rain`
    );
  }
  for (const r of WEST_INNER_ROADS) {
    assert.equal(isPointInsideRoofedBuilding((r.x1 + r.x2) * 0.5, r.cz), false, `Inner road ${r.id} should be open-air`);
  }

  // Motorbike rides cleanly into alleys (-919, -733, -649.6, -485.6, -283, -355), Bắc 1/2/3, Nam 1/2, behind Cyber & behind PCT!
  assert.deepEqual(
    { x: clampMotorbikeExteriorBounds(-857.0, -5.0).x, z: clampMotorbikeExteriorBounds(-857.0, -5.0).z },
    { x: -857.0, z: -5.0 }
  );
  assert.deepEqual(
    { x: clampMotorbikeExteriorBounds(-649.6, -45.0).x, z: clampMotorbikeExteriorBounds(-649.6, -45.0).z },
    { x: -649.6, z: -45.0 }
  );
  assert.deepEqual(
    { x: clampMotorbikeExteriorBounds(-283.0, -45.0).x, z: clampMotorbikeExteriorBounds(-283.0, -45.0).z },
    { x: -283.0, z: -45.0 }
  );
  assert.deepEqual(
    { x: clampMotorbikeExteriorBounds(-600.0, -98.0).x, z: clampMotorbikeExteriorBounds(-600.0, -98.0).z },
    { x: -600.0, z: -98.0 }
  );
  assert.deepEqual(
    { x: clampMotorbikeExteriorBounds(-350.0, 152.0).x, z: clampMotorbikeExteriorBounds(-350.0, 152.0).z },
    { x: -350.0, z: 152.0 }
  );
  assert.deepEqual(
    { x: clampMotorbikeExteriorBounds(-355.0, 175.0).x, z: clampMotorbikeExteriorBounds(-355.0, 175.0).z },
    { x: -355.0, z: 175.0 }
  );
  assert.equal(clampMotorbikeExteriorBounds(-566.9, -5.0).z, 5.8);
  assert.equal(clampMotorbikeExteriorBounds(-566.9, 62.0).z, 51.8);

  // Zone labels and GPS routing out to -950, behind Cyber, and behind PCT
  assert.ok(detectCurrentCityZone(-303.5, -43.0, 1).includes('Quán Ốc'));
  assert.ok(detectCurrentCityZone(-857.0, 4.0, 1).includes('Hẻm 845'));
  assert.ok(detectCurrentCityZone(-600.0, -60.0, 1).includes('Nội Khu Dân Cư Bắc 2'));
  assert.ok(detectCurrentCityZone(-600.0, -98.0, 1).includes('Nội Khu Dân Cư Bắc 3'));
  assert.ok(detectCurrentCityZone(-390.5, 175.0, 1).includes('Trà Chanh'));

  const gpsFarWest = computeCityGpsRoute(0, 29, -945, -98);
  assert.ok(gpsFarWest.points.length >= 3);
  assert.ok(gpsFarWest.totalMeters > 980);

  const gpsBehindCyber = computeCityGpsRoute(-227.5, -110, -303.5, -22);
  assert.ok(gpsBehindCyber.points.length >= 3);
  assert.ok(gpsBehindCyber.totalMeters < 220); // Routes cleanly via Đại Lộ Bệnh Viện -> Bắc 1 instead of long detour!
});

test('Motorbike can enter and ride smoothly through ALL 101 alleys, all 10 inner roads, 7 N-S connectors, and BOTH Vinhomes Ocean Park connections', () => {
  const allCols = [...WEST_RESIDENTIAL_COLLIDERS, ...WEST_INTERSECTION_COLLIDERS, ...VINHOMES_COLLIDERS];
  const hitsWithBikeRadius = (x: number, z: number, radius = 0.42): boolean =>
    allCols.some(
      (c) =>
        (c.floor === 'both' || (c.floor ?? 1) === 1) &&
        x + radius >= c.minX &&
        x - radius <= c.maxX &&
        z + radius >= c.minZ &&
        z - radius <= c.maxZ
    );

  // Sweep EVERY SINGLE ONE of the 101 alleys every 0.25m from entry to exit!
  for (const a of WEST_ALLEYS) {
    const isShortSH = a.row === 'SH1' || (a.row === 'SH2' && a.cx < -240);
    const startZ =
      a.row === 'N1'
        ? -22.0
        : a.row === 'S1'
          ? 35.0
          : isShortSH
            ? a.minZ + 1.0
            : Math.max(-133.0, a.minZ - 2.0);
    const endZ =
      a.row === 'N1'
        ? 23.0
        : a.row === 'S1'
          ? 98.0
          : Math.min(350.0, a.maxZ + 2.0);
    for (const dx of [0, -1.4, 1.4]) {
      const tx = a.cx + dx;
      for (let tz = startZ; tz <= endZ; tz += 0.25) {
        const clamped = clampMotorbikeExteriorBounds(tx, tz);
        assert.ok(
          Math.abs(clamped.x - tx) <= 0.01 && Math.abs(clamped.z - tz) <= 0.01,
          `Motorbike bounds blocked alley ${a.id} (${a.row}) at x=${tx.toFixed(2)}, z=${tz.toFixed(2)} -> (${clamped.x.toFixed(2)}, ${clamped.z.toFixed(2)})`
        );
        assert.equal(
          hitsWithBikeRadius(tx, tz),
          false,
          `Collider blocked motorbike in alley ${a.id} (${a.row}) at x=${tx.toFixed(2)}, z=${tz.toFixed(2)}`
        );
      }
    }
  }

  // Sweep ALL 10 inner neighborhood roads end-to-end (including Nam 2 & Đại Lộ Nam 6 straight into Vinhomes Ocean Park at X=105!)
  for (const r of WEST_INNER_ROADS) {
    for (let tx = r.x1 + 2.0; tx <= r.x2 - 2.0; tx += 4.0) {
      const clamped = clampMotorbikeExteriorBounds(tx, r.cz);
      assert.ok(
        Math.abs(clamped.x - tx) <= 0.01 && Math.abs(clamped.z - r.cz) <= 0.01,
        `Motorbike bounds blocked inner road ${r.id} at x=${tx}, z=${r.cz} -> (${clamped.x}, ${clamped.z})`
      );
      assert.equal(hitsWithBikeRadius(tx, r.cz), false, `Collider blocked inner road ${r.id} at x=${tx}, z=${r.cz}`);
    }
  }

  // Sweep BOTH Vinhomes Ocean Park transition mouths (X = 94..120 at Z = 148 & Z = 344) 100% unobstructed!
  for (const crossZ of [148.0, 152.0, 344.0]) {
    for (let tx = 94.0; tx <= 120.0; tx += 0.5) {
      const clamped = clampMotorbikeExteriorBounds(tx, crossZ);
      assert.ok(
        Math.abs(clamped.x - tx) <= 0.01 && Math.abs(clamped.z - crossZ) <= 0.01,
        `Vinhomes transition blocked bounds at x=${tx}, z=${crossZ} -> (${clamped.x}, ${clamped.z})`
      );
      assert.equal(hitsWithBikeRadius(tx, crossZ), false, `Collider blocked Vinhomes transition at x=${tx}, z=${crossZ}`);
    }
  }

  // Sweep all 7 North-South Connector Roads + extended Đại Lộ Bệnh Viện Nam (down to Z=350) end-to-end!
  for (const tx of [-432.0, -430.0, -428.0]) {
    for (let tz = 35.0; tz <= 156.0; tz += 1.0) {
      const clamped = clampMotorbikeExteriorBounds(tx, tz);
      assert.ok(
        Math.abs(clamped.x - tx) <= 0.01 && Math.abs(clamped.z - tz) <= 0.01,
        `Motorbike bounds blocked South Connector Road at x=${tx}, z=${tz} -> (${clamped.x}, ${clamped.z})`
      );
      assert.equal(hitsWithBikeRadius(tx, tz), false, `Collider blocked South Connector Road at x=${tx}, z=${tz}`);
      assert.equal(isPointInsideRoofedBuilding(tx, tz), false, `South Connector Road should be open-air at x=${tx}, z=${tz}`);
    }
  }
  for (let tz = 40.0; tz <= 350.0; tz += 2.0) {
    const clamped = clampMotorbikeExteriorBounds(-227.5, tz);
    assert.ok(Math.abs(clamped.z - tz) <= 0.01, `Đại Lộ Bệnh Viện Nam blocked at z=${tz}`);
    assert.equal(hitsWithBikeRadius(-227.5, tz), false, `Collider blocked Đại Lộ Bệnh Viện Nam at z=${tz}`);
  }
  const connectorChecks: Array<[number, number, number]> = [
    [-956.0, 196.0, 350.0],
    [-615.0, 196.0, 350.0],
    [-301.0, 150.0, 350.0],
    [-104.0, 106.0, 350.0],
    [-2.0, 106.0, 350.0],
    [96.0, 106.0, 350.0],
  ];
  for (const [cx, minZ, maxZ] of connectorChecks) {
    for (let tz = minZ; tz <= maxZ; tz += 2.0) {
      assert.equal(hitsWithBikeRadius(cx, tz), false, `Connector x=${cx} blocked at z=${tz}`);
      const clamped = clampMotorbikeExteriorBounds(cx, tz);
      assert.ok(
        Math.abs(clamped.x - cx) <= 0.01 && Math.abs(clamped.z - tz) <= 0.01,
        `Connector x=${cx} bounds blocked at z=${tz} -> (${clamped.x}, ${clamped.z})`
      );
    }
  }

  // GPS routing & zone detection across South-Central, Southwest Expansion & direct Vinhomes Ocean Park link!
  assert.ok(detectCurrentCityZone(-179.0, 130.0, 1).includes('Hẻm 210'));
  assert.ok(detectCurrentCityZone(-180.0, 356.0, 1).includes('Công Viên Đại Lộ Nam Liên Khu'));
  assert.ok(detectCurrentCityZone(-2.0, 220.0, 1).includes('Trục Nam Trung Tâm'));
  assert.ok(detectCurrentCityZone(25.0, 220.0, 1).includes('Khu Dân Cư Nam Trung Tâm'));
  const gpsSouthHosp = computeCityGpsRoute(0, 29, -160, 198);
  assert.ok(gpsSouthHosp.points.length >= 4);
  assert.ok(gpsSouthHosp.totalMeters > 350 && gpsSouthHosp.totalMeters < 650);
  const gpsCrossNam2 = computeCityGpsRoute(-350, 152, -150, 152);
  assert.ok(gpsCrossNam2.totalMeters < 240, `Expected direct Nam 2 crossing, got ${gpsCrossNam2.totalMeters}m`);
  const gpsToOceanParkSouth = computeCityGpsRoute(-850, 294, 193.5, 344);
  assert.ok(gpsToOceanParkSouth.points.length >= 5);
  assert.ok(
    gpsToOceanParkSouth.totalMeters < 1200,
    `Expected direct Southern Ocean Park corridor route < 1200m, got ${gpsToOceanParkSouth.totalMeters}m`
  );
  const gpsToOceanParkNorth = computeCityGpsRoute(-150, 152, 193.5, 148);
  assert.ok(
    gpsToOceanParkNorth.totalMeters < 400,
    `Expected direct Nam 2 -> Ocean Park North route < 400m, got ${gpsToOceanParkNorth.totalMeters}m`
  );
});

test('All residential signboards sit strictly below 2F balconies, automatic doors respond to player proximity, and houses/shops are walkable inside', () => {
  // Zero signboard-vs-balcony clipping across all residential districts
  assert.ok(
    RESIDENTIAL_SIGNBOARD_TOP_Y < RESIDENTIAL_F1_HEIGHT,
    `Signboard top (${RESIDENTIAL_SIGNBOARD_TOP_Y}) must sit strictly below F2 slab (${RESIDENTIAL_F1_HEIGHT})`
  );
  assert.ok(
    RESIDENTIAL_SIGNBOARD_TOP_Y + 0.2 <= RESIDENTIAL_BALCONY_BOTTOM_Y,
    `Signboard top (${RESIDENTIAL_SIGNBOARD_TOP_Y}) must leave >=0.2m clearance below 2F balcony (${RESIDENTIAL_BALCONY_BOTTOM_Y})`
  );
  assert.ok(
    RESIDENTIAL_SIGNBOARD_BOTTOM_Y > 2.9,
    `Signboard bottom (${RESIDENTIAL_SIGNBOARD_BOTTOM_Y}) must sit cleanly above the 2.84m automatic sliding door & awning`
  );

  // Automatic sliding door proximity sensor
  assert.equal(computeAutoDoorTargetOpen(0, 0, 1.5, 0), 1);
  assert.equal(computeAutoDoorTargetOpen(0, 0, RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS - 0.1, 0), 1);
  assert.equal(computeAutoDoorTargetOpen(0, 0, RESIDENTIAL_AUTO_DOOR_TRIGGER_RADIUS + 0.25, 0), 0);

  // Previously closed houses & shophouses (H2 Nhà Chú Tư, H17 Điện Nước 545, H18 Bánh Mì Cô Năm 545, S12 Bánh Cuốn 490)
  // now have open front doorways, walkable living/shop interiors, and solid perimeter side/rear walls!
  const walkInSamples: Array<{ name: string; doorX: number; doorZ: number; insideX: number; insideZ: number; rearWallX: number; rearWallZ: number }> = [
    { name: 'H2 Nhà Chú Tư', doorX: -376.5, doorZ: 5.3, insideX: -376.5, insideZ: -4.0, rearWallX: -376.5, rearWallZ: -15.6 },
    { name: 'H17 Tiệm Điện Nước 545', doorX: -539.0, doorZ: 5.3, insideX: -539.0, insideZ: -4.0, rearWallX: -539.0, rearWallZ: -15.6 },
    { name: 'H18 Bánh Mì Cô Năm 545', doorX: -555.8, doorZ: 5.3, insideX: -555.8, insideZ: -4.0, rearWallX: -555.8, rearWallZ: -15.6 },
    { name: 'S12 Bánh Cuốn Nóng 490', doorX: -555.8, doorZ: 52.1, insideX: -555.8, insideZ: 62.0, rearWallX: -555.8, rearWallZ: 75.8 },
  ];
  for (const h of walkInSamples) {
    assert.equal(hitsCollider(h.doorX, h.doorZ), false, `${h.name} automatic doorway should be passable`);
    assert.equal(hitsCollider(h.insideX, h.insideZ), false, `${h.name} interior floor should be walkable`);
    assert.equal(hitsCollider(h.rearWallX, h.rearWallZ), true, `${h.name} rear perimeter wall should remain solid`);
  }
});

test('North (Chợ Bắc Tây) and South (Chợ Nam Tây) traditional residential markets have 4 open gates, clear central/cross aisles, solid stalls, rain shelter, motorbike access, and POIs', () => {
  const markets = [
    {
      label: 'Chợ Bắc Tây',
      poiId: 'poi_market_north',
      cx: -545.0,
      bodyCz: -43.0,
      frontGateZ: -32.0,
      rearGateZ: -54.0,
      frontPlazaZ: -28.0,
      westGateX: -578.8,
      eastGateX: -511.2,
      stallSampleX: -560.0,
      stallSampleZ: -37.6,
    },
    {
      label: 'Chợ Nam Tây',
      poiId: 'poi_market_south',
      cx: -556.6,
      bodyCz: 121.0,
      frontGateZ: 108.0,
      rearGateZ: 134.0,
      frontPlazaZ: 104.0,
      westGateX: -586.8,
      eastGateX: -526.4,
      stallSampleX: -572.0,
      stallSampleZ: 114.4,
    },
  ];

  for (const m of markets) {
    // 4 open entrances + central promenade & cross aisle are completely passable
    assert.equal(hitsCollider(m.cx, m.frontPlazaZ), false, `${m.label} front plaza blocked`);
    assert.equal(hitsCollider(m.cx, m.frontGateZ), false, `${m.label} main gate blocked`);
    assert.equal(hitsCollider(m.cx, m.bodyCz), false, `${m.label} central intersection blocked`);
    assert.equal(hitsCollider(m.cx, m.rearGateZ), false, `${m.label} rear gate blocked`);
    assert.equal(hitsCollider(m.westGateX + 0.2, m.bodyCz), false, `${m.label} west side gate blocked`);
    assert.equal(hitsCollider(m.eastGateX - 0.2, m.bodyCz), false, `${m.label} east side gate blocked`);

    // Solid interior merchant stall islands & outer wall beside gate
    assert.equal(hitsCollider(m.stallSampleX, m.stallSampleZ), true, `${m.label} merchant stall island should be solid`);
    assert.equal(hitsCollider(m.cx - 8.0, m.frontGateZ), true, `${m.label} front perimeter wall should be solid`);

    // Weather shelter: dry inside vaulted hall, open-air on front plaza
    assert.equal(isPointInsideRoofedBuilding(m.cx, m.bodyCz), true, `${m.label} vaulted hall should shelter from rain`);
    assert.equal(isPointInsideRoofedBuilding(m.cx, m.frontPlazaZ), false, `${m.label} front plaza should be open-air`);

    // Motorbike can ride onto front plaza and smoothly through central promenade & cross aisle
    for (const [bx, bz] of [
      [m.cx, m.frontPlazaZ],
      [m.cx, m.frontGateZ],
      [m.cx, m.bodyCz],
      [m.cx - 12.0, m.bodyCz],
      [m.cx + 12.0, m.bodyCz],
    ]) {
      const clamped = clampMotorbikeExteriorBounds(bx, bz);
      assert.ok(
        Math.abs(clamped.x - bx) <= 0.01 && Math.abs(clamped.z - bz) <= 0.01,
        `${m.label} motorbike bounds blocked at (${bx}, ${bz}) -> (${clamped.x}, ${clamped.z})`
      );
    }

    // Map POI, Zone Detection, GPS Routing & PokeShip Delivery Drop integration
    const poi = CITY_POIS.find((p) => p.id === m.poiId);
    assert.ok(poi, `${m.label} POI missing`);
    assert.equal(poi.openHours, '07:00 - 18:00', `${m.label} POI openHours should be 07:00 - 18:00`);
    assert.ok(DELIVERY_DROP_LOCATIONS.some((d) => d.poiId === m.poiId), `${m.label} delivery drop missing`);
    assert.ok(detectCurrentCityZone(m.cx, m.bodyCz, 1).includes(m.label), `${m.label} zone label missing`);
    const gps = computeCityGpsRoute(0, 29, poi.x, poi.z);
    assert.ok(gps.points.length >= 4, `${m.label} GPS route should follow road graph`);
    assert.ok(gps.totalMeters > 520 && gps.totalMeters < 820, `${m.label} GPS route length unexpected: ${gps.totalMeters}m`);

    // Closed-shutter collision blocking (18:00 - 07:00) blocks all 4 gate thresholds while leaving hall/plaza unblocked
    assert.equal(isPointBlockedByClosedResidentialMarkets(m.cx, m.frontGateZ), true, `${m.label} closed front gate should block`);
    assert.equal(isPointBlockedByClosedResidentialMarkets(m.cx, m.rearGateZ), true, `${m.label} closed rear gate should block`);
    assert.equal(isPointBlockedByClosedResidentialMarkets(m.westGateX, m.bodyCz), true, `${m.label} closed west gate should block`);
    assert.equal(isPointBlockedByClosedResidentialMarkets(m.eastGateX, m.bodyCz), true, `${m.label} closed east gate should block`);
    assert.equal(isPointBlockedByClosedResidentialMarkets(m.cx, m.bodyCz), false, `${m.label} interior center should not be blocked by gate shutters`);
    assert.equal(isPointBlockedByClosedResidentialMarkets(m.cx, m.frontPlazaZ), false, `${m.label} exterior front plaza should remain passable when closed`);
  }

  // Operating schedule: strictly open 07:00 - 18:00 daily
  for (const closedHour of [0, 5.5, 6.95, 18.0, 19.25, 23.9]) {
    assert.equal(isResidentialMarketOpenAtHour(closedHour), false, `Market should be closed at hour ${closedHour}`);
  }
  for (const openHour of [7.0, 7.5, 11.75, 15.2, 17.99]) {
    assert.equal(isResidentialMarketOpenAtHour(openHour), true, `Market should be open at hour ${openHour}`);
  }
});


