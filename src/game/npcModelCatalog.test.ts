import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import {
  ADULT_NPC_MODELS,
  ALL_EXTERNAL_NPC_URLS,
  CASHIER_NPC_MODEL,
  CHILD_NPC_MODELS,
  DOCTOR_NPC_MODELS,
  GUARD_NPC_MODEL,
  OUTSIDE_MIXED_NPC_MODELS,
  SEATED_ADULT_NPC_MODELS,
  STATIONARY_ADULT_NPC_MODELS,
  TEACHER_NPC_MODEL,
  WORKER_GUARD_NPC_MODEL,
  pickDoctorNpcModel,
  pickOutsideNpcModel,
  pickSchoolStudentModel,
  pickSeatedCivilianModel,
  pickShopCustomerModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';
import {
  attachGlbHumanToNpc,
  clearGlbHumanRegistryForTest,
  getRegisteredGlbHumanCount,
  inspectUmbrellaResourcesForTest,
  setGlobalNpcRainActive,
  steerYawSmooth,
  updateAllGlbHumanNpcs,
} from './GlbHumanNpcSystem';
import { RESTOCKER_FLOOR2_Y, resolveBaseRestockerTarget } from './pokemonShopLogic';

test('NpcModelCatalog: bundles all 14 optimized Quaternius CC0 GLBs locally under public/models/quaternius/', () => {
  assert.equal(ALL_EXTERNAL_NPC_URLS.length, 14, 'Expected all 14 Quaternius models in preload list');

  for (const url of ALL_EXTERNAL_NPC_URLS) {
    assert.ok(url.startsWith('/models/quaternius/'), `Expected local Quaternius path, got ${url}`);
    const filePath = path.resolve(process.cwd(), 'public', url.replace(/^\//, ''));
    assert.ok(fs.existsSync(filePath), `Missing Quaternius GLB: ${filePath}`);
    const sizeKb = fs.statSync(filePath).size / 1024;
    assert.ok(sizeKb < 500, `Expected optimized GLB < 500 KB for high FPS, got ${sizeKb.toFixed(0)} KB for ${url}`);
  }

  const allSpecs = [
    ...ADULT_NPC_MODELS,
    ...CHILD_NPC_MODELS,
    ...DOCTOR_NPC_MODELS,
    CASHIER_NPC_MODEL,
    GUARD_NPC_MODEL,
    WORKER_GUARD_NPC_MODEL,
    TEACHER_NPC_MODEL,
  ];
  for (const spec of allSpecs) {
    assert.ok(spec.modelSource.startsWith('/models/quaternius/'), `Expected Quaternius source, got ${spec.modelSource}`);
    assert.ok(spec.targetHeight > 1.4, `Expected calibrated targetHeight > 1.4m for ${spec.id}`);
    assert.equal(spec.clipProfile, 'multi');
  }
});

test('NpcModelCatalog: picker functions assign Quaternius roles cleanly across negative and positive seeds', () => {
  const studentIds = new Set<string>();
  for (let i = -5; i < 20; i++) {
    const picked = pickSchoolStudentModel(i);
    assert.ok(picked.targetHeight >= 1.5 && picked.targetHeight <= 1.62);
    studentIds.add(picked.id);
  }
  assert.equal(studentIds.size, CHILD_NPC_MODELS.length);

  const doctorIds = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const doc = pickDoctorNpcModel(i);
    assert.ok(doc.id.startsWith('Doctor_'));
    doctorIds.add(doc.id);
  }
  assert.equal(doctorIds.size, 2);

  const outsideIds = new Set<string>();
  for (let i = 0; i < OUTSIDE_MIXED_NPC_MODELS.length * 2; i++) {
    outsideIds.add(pickOutsideNpcModel(i).id);
    assert.ok(pickShopCustomerModel(i).modelSource.startsWith('/models/quaternius/'));
  }
  for (const adult of ADULT_NPC_MODELS) {
    assert.ok(outsideIds.has(adult.id), `Missing ${adult.id} from outside NPC pool`);
  }

  for (let i = 0; i < STATIONARY_ADULT_NPC_MODELS.length * 2; i++) {
    const stationary = pickStationaryCivilianModel(i);
    assert.equal(stationary.suitableForStationary, true);
  }

  for (let i = 0; i < SEATED_ADULT_NPC_MODELS.length * 2; i++) {
    const seated = pickSeatedCivilianModel(i);
    assert.equal(seated.suitableForSit, true);
  }

  assert.equal(CASHIER_NPC_MODEL.id, 'Suit_Female');
  assert.equal(GUARD_NPC_MODEL.id, 'Suit_Male');
  assert.equal(WORKER_GUARD_NPC_MODEL.id, 'Worker_Male');
});

test('GlbHumanNpcSystem: registers, updates LOD cleanly, and disposes without leaks', () => {
  clearGlbHumanRegistryForTest();
  assert.equal(getRegisteredGlbHumanCount(), 0);

  const g1 = new THREE.Group();
  const h1 = attachGlbHumanToNpc({
    modelSource: ADULT_NPC_MODELS[0].modelSource,
    targetHeight: ADULT_NPC_MODELS[0].targetHeight,
    hostGroup: g1,
    initialState: 'Walk',
    clipProfile: ADULT_NPC_MODELS[0].clipProfile,
  });
  assert.equal(getRegisteredGlbHumanCount(), 1);

  h1.setAnimState('Idle', 1.0);
  h1.setVisible(false);
  assert.equal(g1.visible, false);

  updateAllGlbHumanNpcs(0.016, new THREE.Vector3(0, 1.6, 5));
  h1.dispose();
  updateAllGlbHumanNpcs(0.016, new THREE.Vector3(0, 1.6, 5));
  assert.equal(getRegisteredGlbHumanCount(), 0);
});

test('GlbHumanNpcSystem: steerYawSmooth takes shortest arc across +/-PI without 360 spinouts', () => {
  const obj = new THREE.Object3D();
  obj.rotation.y = Math.PI - 0.1;
  // Turning slightly across +PI to -PI + 0.1 should step positively (+0.2 rad arc), not spin -6.08 rad
  steerYawSmooth(obj, -Math.PI + 0.1, 10, 0.05);
  assert.ok(obj.rotation.y > Math.PI - 0.1, `Expected shortest-arc positive step, got ${obj.rotation.y}`);
  assert.ok(obj.rotation.y < Math.PI + 0.15, `Expected bounded smooth step, got ${obj.rotation.y}`);
});

test('GlbHumanNpcSystem: staff and customer task animation states switch and tick cleanly', () => {
  clearGlbHumanRegistryForTest();
  const group = new THREE.Group();
  const handle = attachGlbHumanToNpc({
    modelSource: WORKER_GUARD_NPC_MODEL.modelSource,
    targetHeight: WORKER_GUARD_NPC_MODEL.targetHeight,
    clipProfile: WORKER_GUARD_NPC_MODEL.clipProfile,
    hostGroup: group,
    initialState: 'Idle',
  });

  const taskStates = [
    'Checkout',
    'PickUp',
    'Carry',
    'CarryWalk',
    'Stock',
    'CarryBasket',
    'WalkBasket',
    'PickShelf',
    'InspectItem',
    'DropBasket',
    'Attack',
    'Surrender',
    'Wave',
    'Lecture',
  ] as const;

  const camPos = new THREE.Vector3(0, 1.6, 4);
  for (const state of taskStates) {
    handle.setAnimState(state, 1.15);
    updateAllGlbHumanNpcs(0.016, camPos);
  }

  handle.dispose();
  updateAllGlbHumanNpcs(0.016, camPos);
  assert.equal(getRegisteredGlbHumanCount(), 0);
});

test('resolveBaseRestockerTarget routes Floor 1 Pokemon & Floor 2 One Piece products to exact bays and facings', () => {
  // Floor 1 East Wall Booster Box & Pack (Bay 1 vs unlocked Bay 2)
  const f1Box = resolveBaseRestockerTarget('sv151_box', ['shelf_wall_bay_1']);
  assert.equal(f1Box.floor, 1);
  assert.equal(f1Box.y, 0);
  assert.equal(f1Box.zone, 'wall');
  assert.equal(f1Box.x, 9.75);
  assert.equal(f1Box.z, -6.05);
  assert.equal(f1Box.lookY, Math.PI / 2);

  const f1Bay2Only = resolveBaseRestockerTarget('paldeaEvolved_pack', ['shelf_wall_bay_2']);
  assert.equal(f1Bay2Only.floor, 1);
  assert.equal(f1Bay2Only.z, -3.35);

  // Floor 1 Mystery Gacha Gondola front (Z = +4.10 facing -Z = Math.PI, NOT Z = 1.2 behind wall)
  const gachaCol0 = resolveBaseRestockerTarget('gacha_silver_pack');
  const gachaCol2 = resolveBaseRestockerTarget('gacha_blaze_pack');
  assert.equal(gachaCol0.floor, 1);
  assert.equal(gachaCol0.zone, 'gacha');
  assert.equal(gachaCol0.z, 4.1);
  assert.equal(gachaCol0.lookY, Math.PI);
  assert.ok(gachaCol2.x > gachaCol0.x);

  // Floor 1 GameStop Mystery Rack front & Collector Bay
  const gs = resolveBaseRestockerTarget('gamestop_mystery_gold');
  assert.equal(gs.floor, 1);
  assert.equal(gs.zone, 'mystery');
  assert.equal(gs.x, -5.8);
  assert.equal(gs.z, 5.6);
  assert.equal(gs.lookY, Math.PI);

  const colBay2 = resolveBaseRestockerTarget('collector_prismatic_spc');
  assert.equal(colBay2.floor, 1);
  assert.equal(colBay2.zone, 'collector');
  assert.equal(colBay2.x, -10.25);
  assert.equal(colBay2.z, 5.0);
  assert.equal(colBay2.lookY, -Math.PI / 2);

  // Floor 2 One Piece East Wall Booster Box
  const f2Box = resolveBaseRestockerTarget('op10RoyalBlood_box', ['op_shelf_wall_bay_1']);
  assert.equal(f2Box.floor, 2);
  assert.equal(f2Box.y, RESTOCKER_FLOOR2_Y);
  assert.equal(f2Box.zone, 'wall');
  assert.equal(f2Box.x, 9.75);
  assert.equal(f2Box.lookY, Math.PI / 2);

  // Floor 2 Devil Fruit Gacha Gondola front
  const f2Gacha = resolveBaseRestockerTarget('gacha_op_mera_pack');
  assert.equal(f2Gacha.floor, 2);
  assert.equal(f2Gacha.y, RESTOCKER_FLOOR2_Y);
  assert.equal(f2Gacha.zone, 'gacha');
  assert.equal(f2Gacha.z, 4.1);
  assert.equal(f2Gacha.lookY, Math.PI);

  // Floor 2 One Piece Bounty Rack & Pirate Vault
  const f2Bounty = resolveBaseRestockerTarget('op_bounty_wanted_box');
  assert.equal(f2Bounty.floor, 2);
  assert.equal(f2Bounty.y, RESTOCKER_FLOOR2_Y);
  assert.equal(f2Bounty.zone, 'mystery');
  assert.equal(f2Bounty.x, -5.8);
  assert.equal(f2Bounty.z, 5.6);

  const f2Collector = resolveBaseRestockerTarget('op_col_roger_gold_box');
  assert.equal(f2Collector.floor, 2);
  assert.equal(f2Collector.y, RESTOCKER_FLOOR2_Y);
  assert.equal(f2Collector.zone, 'collector');
  assert.equal(f2Collector.x, -10.25);
  assert.equal(f2Collector.z, 5.0);
  assert.equal(f2Collector.lookY, -Math.PI / 2);
});

test('GlbHumanNpcSystem: upgraded 8-gore umbrella resources & extended 180m rain activation work for all walkers', () => {
  const info = inspectUmbrellaResourcesForTest();
  assert.equal(info.styleCount, 10);
  assert.equal(info.hasClearVariant, true);
  assert.ok(info.canopyVertexCount > 200);
  assert.ok(info.frameTriangleCount > 100);
  assert.ok(info.handleTriangleCount > 60);
  assert.equal(info.sampleGroupChildrenCount, 4);
  assert.equal(info.sampleGroupNoMerge, true);

  clearGlbHumanRegistryForTest();
  setGlobalNpcRainActive(false);

  const walkerNear = new THREE.Group();
  walkerNear.position.set(0, 0, 18.5);
  const hNear = attachGlbHumanToNpc({
    modelSource: ADULT_NPC_MODELS[0].modelSource,
    targetHeight: ADULT_NPC_MODELS[0].targetHeight,
    hostGroup: walkerNear,
    initialState: 'Walk',
    clipProfile: 'multi',
  });

  const walkerFar = new THREE.Group();
  walkerFar.position.set(140, 0, 22);
  const hFar = attachGlbHumanToNpc({
    modelSource: ADULT_NPC_MODELS[1].modelSource,
    targetHeight: ADULT_NPC_MODELS[1].targetHeight,
    hostGroup: walkerFar,
    initialState: 'Walk',
    clipProfile: 'multi',
  });

  const camPos = new THREE.Vector3(0, 1.6, 25);
  updateAllGlbHumanNpcs(0.016, camPos);
  assert.equal(hNear.hasActiveUmbrella(), false);
  assert.equal(hFar.hasActiveUmbrella(), false);

  // Turn on rain -> both near and 140m distant outdoor walkers immediately equip umbrellas
  setGlobalNpcRainActive(true);
  updateAllGlbHumanNpcs(0.016, camPos);
  assert.equal(hNear.hasActiveUmbrella(), true);
  assert.equal(hFar.hasActiveUmbrella(), true);

  setGlobalNpcRainActive(false);
  hNear.dispose();
  hFar.dispose();
  updateAllGlbHumanNpcs(0.016, camPos);
  assert.equal(getRegisteredGlbHumanCount(), 0);
});

