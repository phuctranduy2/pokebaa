import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAGON_BRIDGE_CENTER_X,
  HAN_BRIDGE_CENTER_X,
  HAN_BRIDGE_DECK_Y,
  HAN_BRIDGE_NORTH_FLAT_START_Z,
  HAN_BRIDGE_NORTH_RAMP_START_Z,
  HAN_BRIDGE_SOUTH_FLAT_END_Z,
  HAN_BRIDGE_SOUTH_RAMP_END_Z,
  HAN_RIVER_COLLIDERS,
  HAN_RIVER_WATER_Y,
  NORTH_BANK_EAST_END_X,
  NORTH_BANK_INTERSECTION_CENTER_X,
  NORTH_BANK_INTERSECTION_CENTER_Z,
  NORTH_BANK_NORTH_END_Z,
  NORTH_BANK_WEST_END_X,
  TRAN_THI_LY_BRIDGE_CENTER_X,
  VIEWING_PIER_CENTER_X,
  getDragonBridgeOuterHalfW,
  getDragonBridgeRoadHalfW,
  getDragonFireShowPhase,
  getHanRiverBridgeDeckY,
  getHanRiverBridgeSlopeDz,
  getHanRiverExteriorGroundY,
} from './HanRiverSystem';
import { WEST_INTERSECTION_COLLIDERS } from './WestIntersectionSystem';
import { computeCityGpsRoute } from './cityMapData';
import { CityTrafficCoordinator } from './CityTrafficCoordinator';
import { PlayerMotorbikeController, clampMotorbikeExteriorBounds } from './PlayerMotorbikeSystem';

function colliderBlocksPoint(x: number, z: number, radius = 0.4): boolean {
  for (const b of [...HAN_RIVER_COLLIDERS, ...WEST_INTERSECTION_COLLIDERS]) {
    if (b.floor !== 1) continue;
    if (
      x + radius > b.minX &&
      x - radius < b.maxX &&
      z + radius > b.minZ &&
      z - radius < b.maxZ
    ) {
      return true;
    }
  }
  return false;
}

test('Cầu Sông Hàn, Cầu Rồng & Cầu Trần Thị Lý deck profiles transition smoothly from Bạch Đằng (-0.26) up to +5.40 and down onto North Bank (-0.26)', () => {
  assert.equal(HAN_BRIDGE_CENTER_X, 193.5);
  assert.equal(DRAGON_BRIDGE_CENTER_X, 370.0);
  assert.equal(TRAN_THI_LY_BRIDGE_CENTER_X, 503.0);
  assert.equal(NORTH_BANK_EAST_END_X, 570.0);
  assert.equal(VIEWING_PIER_CENTER_X, 146.0);
  assert.ok(HAN_BRIDGE_DECK_Y - HAN_RIVER_WATER_Y >= 6.5, 'Bridge deck must clear river boats underneath');

  // South flat edge flush with Ngã 4 Bạch Đằng asphalt
  assert.equal(getHanRiverBridgeDeckY(-120.0), -0.26);
  assert.equal(getHanRiverBridgeDeckY(HAN_BRIDGE_SOUTH_FLAT_END_Z), -0.26);
  assert.equal(getHanRiverBridgeSlopeDz(-125.0), 0);

  // Monotonically rises along South S-ramp (-129 -> -175)
  let prevY = getHanRiverBridgeDeckY(HAN_BRIDGE_SOUTH_FLAT_END_Z);
  for (let z = -132; z >= HAN_BRIDGE_SOUTH_RAMP_END_Z; z -= 3) {
    const y = getHanRiverBridgeDeckY(z);
    assert.ok(y > prevY - 1e-9, `Expected South ramp to rise as Z decreases (z=${z}, y=${y}, prevY=${prevY})`);
    if (z > HAN_BRIDGE_SOUTH_RAMP_END_Z) {
      assert.ok(getHanRiverBridgeSlopeDz(z) < 0, `Expected dY/dZ < 0 on ascending South ramp at z=${z}`);
    }
    prevY = y;
  }

  // Peak river span flat at +5.40 across Z = -305..-175
  assert.ok(Math.abs(getHanRiverBridgeDeckY(HAN_BRIDGE_SOUTH_RAMP_END_Z) - HAN_BRIDGE_DECK_Y) < 1e-9);
  assert.equal(getHanRiverBridgeDeckY(-240.0), HAN_BRIDGE_DECK_Y);
  assert.equal(getHanRiverBridgeSlopeDz(-240.0), 0);
  assert.equal(getHanRiverBridgeDeckY(HAN_BRIDGE_NORTH_RAMP_START_Z), HAN_BRIDGE_DECK_Y);

  // Monotonically descends along North S-ramp (-305 -> -351)
  prevY = getHanRiverBridgeDeckY(HAN_BRIDGE_NORTH_RAMP_START_Z);
  for (let z = -308; z >= HAN_BRIDGE_NORTH_FLAT_START_Z; z -= 3) {
    const y = getHanRiverBridgeDeckY(z);
    assert.ok(y < prevY + 1e-9, `Expected North ramp to descend as Z decreases (z=${z}, y=${y}, prevY=${prevY})`);
    if (z > HAN_BRIDGE_NORTH_FLAT_START_Z) {
      assert.ok(getHanRiverBridgeSlopeDz(z) > 0, `Expected dY/dZ > 0 on descending North ramp at z=${z}`);
    }
    prevY = y;
  }

  // North flat arrival flush with Ngã Tư Trần Hưng Đạo asphalt
  assert.ok(Math.abs(getHanRiverBridgeDeckY(HAN_BRIDGE_NORTH_FLAT_START_Z) + 0.26) < 1e-9);
  assert.equal(getHanRiverBridgeDeckY(NORTH_BANK_INTERSECTION_CENTER_Z), -0.26);
  assert.equal(getHanRiverBridgeSlopeDz(NORTH_BANK_INTERSECTION_CENTER_Z), 0);
});

test('Shared elevation matches across HanRiverSystem and PlayerMotorbikeController for Cầu Sông Hàn, Cầu Rồng (X=370), Cầu Trần Thị Lý (X=503), and North Bank Ngã 4', () => {
  const samplePoints: Array<[number, number, number]> = [
    // Bạch Đằng E-W roadway, West Avenue junction & east extension
    [-227.5, -117.5, -0.26],
    [-100.0, -117.5, -0.26],
    [193.5, -117.5, -0.26],
    [DRAGON_BRIDGE_CENTER_X, -117.5, -0.26],
    [TRAN_THI_LY_BRIDGE_CENTER_X, -117.5, -0.26],
    // Cầu Sông Hàn peak roadway & raised pedestrian walkway
    [193.5, -240.0, HAN_BRIDGE_DECK_Y],
    [184.6, -240.0, HAN_BRIDGE_DECK_Y + 0.12],
    // Cầu Rồng (X=370.0) uniformly wide roadway & 3.4m burgundy pedestrian walkway (bank entrances & peak span)
    [DRAGON_BRIDGE_CENTER_X, -240.0, HAN_BRIDGE_DECK_Y],
    [DRAGON_BRIDGE_CENTER_X - 8.6, -240.0, HAN_BRIDGE_DECK_Y],
    [DRAGON_BRIDGE_CENTER_X + 8.6, -240.0, HAN_BRIDGE_DECK_Y],
    [DRAGON_BRIDGE_CENTER_X - 11.2, -240.0, HAN_BRIDGE_DECK_Y + 0.12],
    [DRAGON_BRIDGE_CENTER_X + 11.2, -240.0, HAN_BRIDGE_DECK_Y + 0.12],
    [DRAGON_BRIDGE_CENTER_X - 10.2, -130.0, Math.max(0.0, getHanRiverBridgeDeckY(-130.0) + 0.12)],
    [DRAGON_BRIDGE_CENTER_X + 10.2, -130.0, Math.max(0.0, getHanRiverBridgeDeckY(-130.0) + 0.12)],
    // Cầu Trần Thị Lý (X=503.0) widened 6-lane asphalt roadway & salmon terracotta pedestrian walkway
    [TRAN_THI_LY_BRIDGE_CENTER_X - 5.5, -240.0, HAN_BRIDGE_DECK_Y],
    [TRAN_THI_LY_BRIDGE_CENTER_X + 5.5, -240.0, HAN_BRIDGE_DECK_Y],
    [TRAN_THI_LY_BRIDGE_CENTER_X - 12.5, -240.0, HAN_BRIDGE_DECK_Y + 0.12],
    [TRAN_THI_LY_BRIDGE_CENTER_X + 12.5, -240.0, HAN_BRIDGE_DECK_Y + 0.12],
    // Ngã Tư Bờ Bắc (Cầu Sông Hàn, Cầu Rồng & Cầu Trần Thị Lý) E-W & N-S asphalt roads
    [NORTH_BANK_INTERSECTION_CENTER_X, NORTH_BANK_INTERSECTION_CENTER_Z, -0.26],
    [DRAGON_BRIDGE_CENTER_X, NORTH_BANK_INTERSECTION_CENTER_Z, -0.26],
    [TRAN_THI_LY_BRIDGE_CENTER_X, NORTH_BANK_INTERSECTION_CENTER_Z, -0.26],
    [550.0, NORTH_BANK_INTERSECTION_CENTER_Z, -0.26],
    [NORTH_BANK_WEST_END_X + 10, NORTH_BANK_INTERSECTION_CENTER_Z, -0.26],
    [NORTH_BANK_EAST_END_X - 10, NORTH_BANK_INTERSECTION_CENTER_Z, -0.26],
    [NORTH_BANK_INTERSECTION_CENTER_X, NORTH_BANK_NORTH_END_Z + 10, -0.26],
    [DRAGON_BRIDGE_CENTER_X, NORTH_BANK_NORTH_END_Z + 10, -0.26],
    [TRAN_THI_LY_BRIDGE_CENTER_X, -440.0, -0.26],
    // North Bank riverside promenade & North sidewalk
    [140.0, -349.0, 0.0],
    [420.0, -349.0, 0.0],
    [140.0, -374.0, 0.0],
    [420.0, -374.0, 0.0],
    [146.0, -138.0, 0.0],
  ];

  for (const [x, z, expectedY] of samplePoints) {
    assert.ok(
      Math.abs(getHanRiverExteriorGroundY(x, z) - expectedY) < 1e-6,
      `HanRiver groundY mismatch at (${x}, ${z})`
    );
    assert.ok(
      Math.abs(PlayerMotorbikeController.getExteriorGroundY(x, z) - expectedY) < 1e-6,
      `Motorbike groundY mismatch at (${x}, ${z})`
    );
  }
  // West Avenue approach south of Bạch Đằng is handled by PlayerMotorbikeController
  assert.equal(PlayerMotorbikeController.getExteriorGroundY(-227.5, -90.0), -0.26);
});

test('Bridge corridors from Bạch Đằng across Cầu Sông Hàn, Cầu Rồng (X=370) & Cầu Trần Thị Lý (X=503) into Ngã Tư Bờ Bắc are free of colliders, while guardrails & central pylon/median remain protected', () => {
  // Check Cầu Sông Hàn corridor from Bạch Đằng (-115) through North Bank (-450)
  for (let z = -115; z >= -450; z -= 4) {
    assert.equal(
      colliderBlocksPoint(188.0, z, 0.45),
      false,
      `Cầu Sông Hàn Southbound lane (X=188) unexpectedly blocked at z=${z}`
    );
    assert.equal(
      colliderBlocksPoint(193.5, z, 0.45),
      false,
      `Cầu Sông Hàn center (X=193.5) unexpectedly blocked at z=${z}`
    );
    assert.equal(
      colliderBlocksPoint(198.8, z, 0.45),
      false,
      `Cầu Sông Hàn Northbound lane (X=198.8) unexpectedly blocked at z=${z}`
    );

    // Check Cầu Rồng (X=370.0) corridor from Sơn Tây Bắc / Ngã 4 Bạch Đằng (-115) through North Bank (-450)
    assert.equal(
      colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X - 5.5, z, 0.45),
      false,
      `Cầu Rồng Southbound lane unexpectedly blocked at z=${z}`
    );
    assert.equal(
      colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X, z, 0.45),
      false,
      `Cầu Rồng center (X=${DRAGON_BRIDGE_CENTER_X}) unexpectedly blocked at z=${z}`
    );
    assert.equal(
      colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X + 5.5, z, 0.45),
      false,
      `Cầu Rồng Northbound lane unexpectedly blocked at z=${z}`
    );
    // Check Cầu Trần Thị Lý (X=503.0) dual 3-lane carriageways from Bạch Đằng (-115) through North Bank (-450)
    for (const laneX of [
      TRAN_THI_LY_BRIDGE_CENTER_X - 5.5,
      TRAN_THI_LY_BRIDGE_CENTER_X - 2.8,
      TRAN_THI_LY_BRIDGE_CENTER_X + 2.8,
      TRAN_THI_LY_BRIDGE_CENTER_X + 5.5,
    ]) {
      assert.equal(
        colliderBlocksPoint(laneX, z, 0.45),
        false,
        `Cầu Trần Thị Lý lane (X=${laneX}) unexpectedly blocked at z=${z}`
      );
    }
  }

  // West Bạch Đằng & Đại Lộ Bệnh Viện corridor is continuously clear
  for (let z = -125; z <= -70; z += 5) {
    assert.equal(
      colliderBlocksPoint(-227.5, z, 0.45),
      false,
      `Đại Lộ Bệnh Viện N-S corridor unexpectedly blocked at z=${z}`
    );
  }
  for (let x = -227.5; x <= 180; x += 15) {
    assert.equal(
      colliderBlocksPoint(x, -117.5, 0.45),
      false,
      `Đường Bạch Đằng West E-W corridor unexpectedly blocked at x=${x}`
    );
  }

  // Bridge outer safety guardrails & Cầu Trần Thị Lý central white median / inclined pylon base remain protected
  assert.equal(colliderBlocksPoint(182.2, -240.0, 0.35), true, 'Cầu Sông Hàn West guardrail must block fall');
  assert.equal(colliderBlocksPoint(204.8, -240.0, 0.35), true, 'Cầu Sông Hàn East guardrail must block fall');
  // Cầu Sông Hàn full-width walkways remain completely unobstructed at South & North bank entrances and over the span
  for (const walkZ of [-130.0, -134.15, -240.0, -345.0, -348.0]) {
    assert.equal(
      colliderBlocksPoint(183.6, walkZ, 0.35),
      false,
      `Cầu Sông Hàn West walkway must stay open at z=${walkZ}`
    );
    assert.equal(
      colliderBlocksPoint(203.4, walkZ, 0.35),
      false,
      `Cầu Sông Hàn East walkway must stay open at z=${walkZ}`
    );
  }
  assert.equal(
    colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X - 12.7, -240.0, 0.35),
    true,
    'Cầu Rồng West guardrail must block fall'
  );
  assert.equal(
    colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X + 12.7, -240.0, 0.35),
    true,
    'Cầu Rồng East guardrail must block fall'
  );
  assert.equal(
    colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X - 11.0, -240.0, 0.35),
    false,
    'Cầu Rồng widened burgundy pedestrian walkway must remain walkable'
  );
  assert.equal(
    colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X + 11.0, -240.0, 0.35),
    false,
    'Cầu Rồng widened burgundy pedestrian walkway must remain walkable'
  );
  // South & North bank walkway mouths stay >= 3.2m wide (never pinched) and 100% open into riverside promenades
  assert.ok(getDragonBridgeOuterHalfW(-130.0) - getDragonBridgeRoadHalfW(-130.0) >= 3.2);
  assert.ok(getDragonBridgeOuterHalfW(-348.0) - getDragonBridgeRoadHalfW(-348.0) >= 3.2);
  for (const walkZ of [-130.0, -134.15, -345.0, -348.0]) {
    assert.equal(
      colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X - 10.2, walkZ, 0.35),
      false,
      `Cầu Rồng West walkway entrance must stay open onto bank promenade at z=${walkZ}`
    );
    assert.equal(
      colliderBlocksPoint(DRAGON_BRIDGE_CENTER_X + 10.2, walkZ, 0.35),
      false,
      `Cầu Rồng East walkway entrance must stay open onto bank promenade at z=${walkZ}`
    );
  }
  assert.equal(
    colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X - 14.3, -240.0, 0.35),
    true,
    'Cầu Trần Thị Lý West sage-green guardrail must block fall'
  );
  assert.equal(
    colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X + 14.3, -240.0, 0.35),
    true,
    'Cầu Trần Thị Lý East sage-green guardrail must block fall'
  );
  // Cầu Trần Thị Lý full-width walkways stay open from Bạch Đằng & North Bank entrances onto bridge deck
  for (const walkZ of [-130.0, -134.15, -345.0, -348.0]) {
    assert.equal(
      colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X - 13.0, walkZ, 0.35),
      false,
      `Cầu Trần Thị Lý outer West walkway must remain open at z=${walkZ}`
    );
    assert.equal(
      colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X + 13.0, walkZ, 0.35),
      false,
      `Cầu Trần Thị Lý outer East walkway must remain open at z=${walkZ}`
    );
  }
  assert.equal(
    colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X - 12.5, -240.0, 0.35),
    false,
    'Cầu Trần Thị Lý salmon pedestrian walkway must remain walkable'
  );
  assert.equal(
    colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X + 12.5, -240.0, 0.35),
    false,
    'Cầu Trần Thị Lý salmon pedestrian walkway must remain walkable'
  );
  assert.equal(
    colliderBlocksPoint(TRAN_THI_LY_BRIDGE_CENTER_X, -246.0, 0.35),
    true,
    'Cầu Trần Thị Lý central white median & sail pylon plinth blocks center overlap'
  );

  // Motorbike bounds allow riding smoothly across Cầu Sông Hàn, Cầu Rồng, Cầu Trần Thị Lý, West Bạch Đằng & North Bank east extension
  const onHanWestWalk = clampMotorbikeExteriorBounds(183.6, -130.0);
  assert.equal(onHanWestWalk.x, 183.6);
  assert.equal(onHanWestWalk.z, -130.0);
  const onTtlWestEntrance = clampMotorbikeExteriorBounds(490.0, -130.0);
  assert.equal(onTtlWestEntrance.x, 490.0);
  assert.equal(onTtlWestEntrance.z, -130.0);
  const onTtlNorthEntrance = clampMotorbikeExteriorBounds(516.0, -347.0);
  assert.equal(onTtlNorthEntrance.x, 516.0);
  assert.equal(onTtlNorthEntrance.z, -347.0);
  const onDragonDeck = clampMotorbikeExteriorBounds(DRAGON_BRIDGE_CENTER_X, -240.0);
  assert.equal(onDragonDeck.x, DRAGON_BRIDGE_CENTER_X);
  assert.equal(onDragonDeck.z, -240.0);
  const onTranThiLyDeck = clampMotorbikeExteriorBounds(TRAN_THI_LY_BRIDGE_CENTER_X, -240.0);
  assert.equal(onTranThiLyDeck.x, TRAN_THI_LY_BRIDGE_CENTER_X);
  assert.equal(onTranThiLyDeck.z, -240.0);
  const onNorthEast = clampMotorbikeExteriorBounds(550.0, -362.0);
  assert.equal(onNorthEast.x, 550.0);
  assert.equal(onNorthEast.z, -362.0);
  const onWestBachDang = clampMotorbikeExteriorBounds(-100.0, -117.5);
  assert.equal(onWestBachDang.x, -100.0);
  assert.equal(onWestBachDang.z, -117.5);
  const onWestCorner = clampMotorbikeExteriorBounds(-227.5, -100.0);
  assert.equal(onWestCorner.x, -227.5);
  assert.equal(onWestCorner.z, -100.0);

  // GPS route reaches Bạch Đằng via West Avenue and crosses Cầu Trần Thị Lý directly
  const westRoute = computeCityGpsRoute(-227.5, -40, 146, -138);
  assert.ok(westRoute.totalMeters > 0 && westRoute.totalMeters <= 480, `Expected West Bạch Đằng GPS route <= 480m, got ${westRoute.totalMeters}`);
  const ttlRoute = computeCityGpsRoute(TRAN_THI_LY_BRIDGE_CENTER_X, 0, TRAN_THI_LY_BRIDGE_CENTER_X, -362);
  assert.ok(ttlRoute.totalMeters >= 352 && ttlRoute.totalMeters <= 372, `Expected straight Cầu Trần Thị Lý route ~362m, got ${ttlRoute.totalMeters}`);

  // Relocated Viewing Pier opening at X=146.0 is walkable onto pier, while old balustrade protects adjacent waterfront
  assert.equal(colliderBlocksPoint(146.0, -134.2, 0.4), false, 'Relocated Viewing Pier entrance must be open');
  assert.equal(colliderBlocksPoint(146.0, -137.6, 0.3), true, 'Relocated Cá Chép Hóa Rồng pedestal blocks overlap');
  assert.equal(colliderBlocksPoint(170.0, -134.1, 0.3), true, 'Waterfront balustrade protects river edge');
  assert.equal(colliderBlocksPoint(-100.0, -134.1, 0.3), true, 'West Bạch Đằng balustrade protects river edge');

  // Widened Cá Chép Hóa Rồng Plaza (X=248..274) + Cầu Tình Yêu & Bến Du Thuyền (X=248..346, Z=-345..-321.5)
  assert.equal(colliderBlocksPoint(277.6, -345.0, 0.35), false, 'Cầu Tình Yêu pedestrian entrance gap must stay open');
  assert.equal(colliderBlocksPoint(264.0, -345.0, 0.4), false, 'Cá Chép Hóa Rồng plaza opening from North Bank must be open');
  assert.equal(colliderBlocksPoint(253.0, -343.0, 0.35), true, 'Cá Chép plaza granite shrub planter blocks overlap');
  assert.equal(colliderBlocksPoint(252.0, -332.5, 0.4), false, 'Walkway West of Cá Chép pedestal must be walkable');
  assert.equal(colliderBlocksPoint(279.0, -339.0, 0.4), false, 'Cầu Tình Yêu entrance neck must be walkable');
  assert.equal(colliderBlocksPoint(266.0, -338.5, 0.4), false, 'Widened Cá Chép Hóa Rồng Plaza walkway must be walkable');
  assert.equal(colliderBlocksPoint(272.0, -329.0, 0.35), false, 'Plaza passage between Cá Chép Hóa Rồng and Cầu Tình Yêu must stay open');
  assert.equal(colliderBlocksPoint(259.5, -332.5, 0.4), true, 'Cá Chép Hóa Rồng monument pedestal must block overlap');
  assert.equal(colliderBlocksPoint(248.0, -329.0, 0.35), true, 'Widened Cá Chép Plaza West railing must block falling into river');
  assert.equal(colliderBlocksPoint(310.0, -329.0, 0.4), false, 'Cầu Tình Yêu main deck must be walkable');
  assert.equal(colliderBlocksPoint(291.0, -322.8, 0.4), false, 'Bến Du Thuyền marina boarding deck must be walkable');
  assert.equal(getHanRiverExteriorGroundY(264.0, -335.0), 0.0);
  assert.equal(getHanRiverExteriorGroundY(310.0, -329.0), 0.0);
  assert.equal(getHanRiverExteriorGroundY(291.0, -322.5), -0.72);
  assert.equal(colliderBlocksPoint(346.0, -329.0, 0.35), true, 'Cầu Tình Yêu East tip railing must block falling into river');
  assert.equal(colliderBlocksPoint(291.0, -321.5, 0.35), false, 'Bến Du Thuyền Bay 1 open boarding gate must let NPCs & players board');
  assert.equal(colliderBlocksPoint(311.0, -321.5, 0.35), false, 'Bến Du Thuyền Bay 2 open boarding gate must let NPCs board excursion yacht');
  assert.equal(colliderBlocksPoint(331.0, -321.5, 0.35), false, 'Bến Du Thuyền Bay 3 open boarding gate must stay open');
  [287.0, 295.0, 307.0, 315.0, 327.0, 335.0].forEach((rx) => {
    assert.equal(colliderBlocksPoint(rx, -321.4, 0.35), true, `Bến Du Thuyền flanking marina railing at X=${rx} must block falling into river`);
  });
});

test('CityTrafficCoordinator detects stopped vehicles on Bạch Đằng & North Bank and respects centerZ in box clearance', () => {
  const coord = new CityTrafficCoordinator();

  // Stopped car at North Bank Eastbound stop line / roadway (Z = -357.8)
  coord.updateVehicle({
    id: 'han_npc_0',
    kind: 'car',
    x: NORTH_BANK_INTERSECTION_CENTER_X - 18.0,
    y: -0.26,
    z: NORTH_BANK_INTERSECTION_CENTER_Z + 4.2,
    fwdX: 1,
    fwdZ: 0,
    halfW: 0.96,
    halfL: 2.25,
    speed: 0,
    isStoppedOrParked: true,
    priority: 26,
    active: true,
  });

  // Following Eastbound car must yield behind it (regression test: old z < 20.8 curb exemption must NOT ignore Z=-357.8!)
  const clrNorth = coord.getForwardClearance({
    id: 'han_npc_1',
    x: NORTH_BANK_INTERSECTION_CENTER_X - 24.5,
    y: -0.26,
    z: NORTH_BANK_INTERSECTION_CENTER_Z + 4.2,
    moveDirX: 1,
    moveDirZ: 0,
    halfW: 0.96,
    halfL: 2.25,
    lookahead: 12.0,
    minGap: 2.2,
    priority: 26,
  });
  assert.ok(clrNorth.closestGap < 2.2 && clrNorth.maxSpeedFactor < 0.2, 'North Bank car must yield behind stopped lead car');

  // Vehicle inside Ngã Tư Bờ Bắc box (centerZ = -268.0) blocks perpendicular green wave
  coord.updateVehicle({
    id: 'han_npc_cross',
    kind: 'car',
    x: NORTH_BANK_INTERSECTION_CENTER_X + 2.0,
    y: -0.26,
    z: NORTH_BANK_INTERSECTION_CENTER_Z + 1.0,
    fwdX: 0,
    fwdZ: -1,
    halfW: 0.96,
    halfL: 2.25,
    speed: 2.0,
    isStoppedOrParked: false,
    priority: 26,
    active: true,
  });

  assert.equal(
    coord.isIntersectionBoxClearForAxis({
      id: 'han_ew_check',
      centerX: NORTH_BANK_INTERSECTION_CENTER_X,
      centerZ: NORTH_BANK_INTERSECTION_CENTER_Z,
      axis: 'ew',
      y: -0.26,
    }),
    false
  );
  assert.equal(
    coord.isIntersectionBoxClearForAxis({
      id: 'han_ns_check',
      centerX: NORTH_BANK_INTERSECTION_CENTER_X,
      centerZ: NORTH_BANK_INTERSECTION_CENTER_Z,
      axis: 'ns',
      y: -0.26,
    }),
    true
  );

  // Nose-to-nose stalled active vehicles inside Ngã Tư Bờ Bắc (with isStoppedOrParked: false)
  // trigger isJamBypassActive so traffic on Cầu Sông Hàn never permanently deadlocks
  const t0 = 10_000;
  coord.updateVehicle(
    {
      id: 'han_npc_taxi',
      kind: 'car',
      x: NORTH_BANK_INTERSECTION_CENTER_X - 1.5,
      y: -0.26,
      z: NORTH_BANK_INTERSECTION_CENTER_Z + 1.0,
      fwdX: -0.8,
      fwdZ: 0.6,
      halfW: 0.96,
      halfL: 2.25,
      speed: 0,
      isStoppedOrParked: false,
      priority: 28,
      active: true,
    },
    t0
  );
  coord.updateVehicle(
    {
      id: 'han_npc_suv',
      kind: 'car',
      x: NORTH_BANK_INTERSECTION_CENTER_X - 5.2,
      y: -0.26,
      z: NORTH_BANK_INTERSECTION_CENTER_Z + 4.0,
      fwdX: 1,
      fwdZ: 0,
      halfW: 0.96,
      halfL: 2.25,
      speed: 0,
      isStoppedOrParked: false,
      priority: 28,
      active: true,
    },
    t0
  );
  assert.equal(coord.isJamBypassActive('han_npc_taxi', t0 + 1200), true);
  const clrTaxi = coord.getForwardClearance(
    {
      id: 'han_npc_taxi',
      x: NORTH_BANK_INTERSECTION_CENTER_X - 1.5,
      y: -0.26,
      z: NORTH_BANK_INTERSECTION_CENTER_Z + 1.0,
      moveDirX: -0.8,
      moveDirZ: 0.6,
      halfW: 0.96,
      halfL: 2.25,
      lookahead: 6.5,
      minGap: 1.5,
      priority: 40,
    },
    t0 + 1200
  );
  assert.equal(clrTaxi.blocked, false, 'Stalled Ngã Tư Bờ Bắc vehicle must bypass deadlock after stall threshold');
});

test('Dragon Bridge fire-breathing show and tourist crowd schedule runs 20:00–24:00 with pre-show gathering and post-midnight dispersal', () => {
  assert.equal(getDragonFireShowPhase(14.0), 'idle');
  assert.equal(getDragonFireShowPhase(19.0), 'idle');
  assert.equal(getDragonFireShowPhase(19.5), 'gathering');
  assert.equal(getDragonFireShowPhase(19.99), 'gathering');
  assert.equal(getDragonFireShowPhase(20.0), 'fire_show');
  assert.equal(getDragonFireShowPhase(22.25), 'fire_show');
  assert.equal(getDragonFireShowPhase(23.99), 'fire_show');
  assert.equal(getDragonFireShowPhase(24.0), 'dispersing');
  assert.equal(getDragonFireShowPhase(0.0), 'dispersing');
  assert.equal(getDragonFireShowPhase(0.75), 'dispersing');
  assert.equal(getDragonFireShowPhase(2.0), 'idle');
});
