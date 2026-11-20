import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CITY_BUS_FLEET_SIZE,
  CITY_BUS_SCHEDULE_HOURS,
  CityBusController,
  CityBusRelayScheduler,
  CityBusScheduleTracker,
  PARK_BUS_STOPS,
  computeStopPassengerPaths,
} from './CityBusSystem';

test('CityBusScheduleTracker: schedules strictly 3 trips per day (Morning, Afternoon, Evening) and resets on new day', () => {
  assert.deepEqual([...CITY_BUS_SCHEDULE_HOURS], [8.0, 14.0, 20.0]);

  const tracker = new CityBusScheduleTracker();
  const triggeredHours: number[] = [];

  // Simulate Day 1 from 07:00 to 23:58 in 2-minute steps
  for (let totalMin = 7 * 60; totalMin < 24 * 60; totalMin += 2) {
    const rawHour = totalMin / 60;
    const res = tracker.syncAndCheckTrigger(rawHour, true, true);
    if (res.triggerTripIndex !== null) {
      triggeredHours.push(Math.round(rawHour * 100) / 100);
    }
  }

  assert.equal(triggeredHours.length, 3, 'Should trigger strictly 3 bus trips in one full day');
  assert.deepEqual(triggeredHours, [8, 14, 20]);
  assert.deepEqual(tracker.tripsCompletedToday, [true, true, true]);

  // Late night after evening trip should not show waiting NPCs
  const lateNight = tracker.syncAndCheckTrigger(22.0, true, true);
  assert.equal(lateNight.triggerTripIndex, null);
  assert.equal(lateNight.shouldHaveWaiters, false);

  // Day 2 morning reset at 07:00
  const nextMorning = tracker.syncAndCheckTrigger(7.0, true, true);
  assert.equal(nextMorning.resetOccurred, true);
  assert.equal(nextMorning.shouldHaveWaiters, true);
  assert.deepEqual(tracker.tripsCompletedToday, [false, false, false]);

  // Morning trip triggers again on Day 2 at 08:00
  const day2Morning = tracker.syncAndCheckTrigger(8.0, true, true);
  assert.equal(day2Morning.triggerTripIndex, 0);
});

test('PARK_BUS_STOPS: provides 1 dedicated stop at each of the 4 green parks without coordinate collisions', () => {
  assert.equal(PARK_BUS_STOPS.length, 4);
  const ids = new Set(PARK_BUS_STOPS.map((s) => s.id));
  assert.deepEqual(ids, new Set(['park_central', 'park_west', 'park_hotel', 'park_phodibo']));

  // All stop positions and bus bays should be distinct and well separated (> 40m apart)
  for (let i = 0; i < PARK_BUS_STOPS.length; i++) {
    for (let j = i + 1; j < PARK_BUS_STOPS.length; j++) {
      const a = PARK_BUS_STOPS[i];
      const b = PARK_BUS_STOPS[j];
      const dist = Math.hypot(a.x - b.x, a.z - b.z);
      assert.ok(dist > 40, `Stops ${a.id} and ${b.id} must be at different parks (dist=${dist})`);
    }
  }
});

test('CityBusRelayScheduler: strictly 3 buses take alternating relay turns (0 -> 1 -> 2 -> 0) and honor closed hours', () => {
  assert.equal(CITY_BUS_FLEET_SIZE, 3);

  const scheduler = new CityBusRelayScheduler({
    maxActiveOnRoute: 2,
    headwaySeconds: 20,
    restCooldownSeconds: 5,
  });

  // Closed hours never dispatch
  assert.equal(scheduler.step(30, false), null);
  assert.equal(scheduler.getActiveCount(), 0);

  // Dispatch Bus 0 immediately
  const first = scheduler.step(0.1, true);
  assert.equal(first, 0);
  assert.equal(scheduler.getActiveCount(), 1);
  assert.equal(scheduler.nextTurnIndex, 1);

  // Headway blocks immediate second dispatch
  assert.equal(scheduler.step(10, true), null);

  // After headway elapses, Bus 1 dispatches while Bus 0 is still active
  const second = scheduler.step(10.5, true);
  assert.equal(second, 1);
  assert.equal(scheduler.getActiveCount(), 2);
  assert.equal(scheduler.nextTurnIndex, 2);

  // At maxActiveOnRoute (2), Bus 2 waits even after headway passes
  assert.equal(scheduler.step(25, true), null);

  // When Bus 0 finishes and rests, Bus 2 dispatches next
  scheduler.markFinished(0);
  assert.equal(scheduler.getActiveCount(), 1);
  const third = scheduler.step(1, true);
  assert.equal(third, 2);
  assert.equal(scheduler.nextTurnIndex, 0);

  // Bus 0 cannot re-dispatch until its rest cooldown AND headway expire
  scheduler.markFinished(1);
  assert.equal(scheduler.step(2, true), null); // rest cooldown < 5s & headway < 20s
  assert.equal(scheduler.step(20, true), 0); // cycles cleanly back to Bus 0
});

test('computeStopPassengerPaths: aligns each waiter and alighter with the active bus doors at all 4 stops', () => {
  for (const spec of PARK_BUS_STOPS) {
    const paths = computeStopPassengerPaths(spec);
    assert.equal(paths.waiterPlans.length, 3);
    assert.equal(paths.alighterPlans.length, 2);

    // Every waiter's final waypoint must land right on the front door threshold
    for (const wpPlan of paths.waiterPlans) {
      const lastWp = wpPlan.boardingWaypoints[wpPlan.boardingWaypoints.length - 1];
      const dDoor = Math.hypot(lastWp.x - paths.boardDoorX, lastWp.z - paths.boardDoorZ);
      assert.ok(dDoor < 0.05, `Stop ${spec.id} waiter final waypoint must reach front door`);
    }

    // Alighter 0 (rear door) and Alighter 1 (front door) must start at distinct doors > 3.5m apart
    const [a0, a1] = paths.alighterPlans;
    const doorSep = Math.hypot(a0.doorX - a1.doorX, a0.doorZ - a1.doorZ);
    assert.ok(doorSep > 3.5, `Stop ${spec.id} alighters must spawn at separate doors (sep=${doorSep})`);

    // Alighter 1 spawns at the front door and steps perpendicularly onto the sidewalk
    const dFront = Math.hypot(a1.doorX - paths.boardDoorX, a1.doorZ - paths.boardDoorZ);
    assert.ok(dFront < 0.05, `Stop ${spec.id} front alighter must spawn at front door`);

    // Each alighter moves <= 1.2m from door to targetSidewalk (no diagonal clipping along bus body)
    for (const al of paths.alighterPlans) {
      const stepOutDist = Math.hypot(al.targetSidewalkX - al.doorX, al.targetSidewalkZ - al.doorZ);
      assert.ok(stepOutDist > 0.7 && stepOutDist < 1.25, `Stop ${spec.id} alighter step-out dist=${stepOutDist}`);
    }
  }
});

test('CityBusController: NPCs board and alight without getting stuck and docked bus departs on schedule', () => {
  const prevDoc = (globalThis as { document?: unknown }).document;
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fillText() {},
  };
  (globalThis as { document: unknown }).document = {
    createElement: () => ({
      width: 256,
      height: 256,
      getContext: () => mockCtx,
    }),
  };

  try {
    const controller = new CityBusController({
      createFaceTexture: () => new THREE.Texture(),
      createHeadMesh: () => new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2)),
    });

    // Advance simulation at 30Hz until Bus 01 reaches Stop 1 (park_central), docks, exchanges passengers, and departs
    let sawDocked = false;
    let sawExiting = false;
    let sawBoarding = false;
    let sawDeparted = false;

    for (let step = 0; step < 600; step++) {
      controller.update(1 / 30, 10.0, 0.0, true);
      const bus0 = (controller as unknown as { buses: Array<{ phase: string; doorOpen: number; dockTimer: number }> }).buses[0];
      const stop0 = (controller as unknown as {
        stopStates: Array<{
          dockedBusIndex: number | null;
          waiters: Array<{ state: string }>;
          alighters: Array<{ state: string }>;
        }>;
      }).stopStates[0];

      if (bus0.phase === 'docked') {
        sawDocked = true;
        if (stop0.alighters.some((a) => a.state === 'exiting_bus' || a.state === 'walking_away')) {
          sawExiting = true;
        }
        if (stop0.waiters.some((w) => w.state === 'boarding')) {
          sawBoarding = true;
        }
        assert.ok(bus0.dockTimer < 11.0, `Bus 01 stuck docked too long (dockTimer=${bus0.dockTimer})`);
      } else if (sawDocked) {
        sawDeparted = true;
        assert.equal(stop0.dockedBusIndex, null);
        assert.ok(
          stop0.waiters.every((w) => w.state === 'on_bus'),
          'All waiters must finish boarding before bus departs'
        );
        assert.ok(
          stop0.alighters.every((a) => a.state === 'walking_away' || a.state === 'hidden'),
          'All alighters must clear bus doors before bus departs'
        );
        break;
      }
    }

    assert.ok(sawDocked, 'Bus 01 should reach and dock at Stop 1');
    assert.ok(sawExiting, 'Alighters should exit the bus once doors open');
    assert.ok(sawBoarding, 'Waiters should board the bus smoothly');
    assert.ok(sawDeparted, 'Bus 01 should finish boarding/alighting and depart cleanly');
  } finally {
    (globalThis as { document?: unknown }).document = prevDoc;
  }
});

