import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  PLAYER_CHARACTER_CATALOG,
  getPlayerCharacterDef,
  isValidPlayerCharacterId,
} from './PlayerCharacterCatalog';
import {
  PlayerGlbAvatarController,
  applyGojoStandingCalibration,
  removeStrayGear5FloatingMesh,
} from './PlayerGlbAvatar';

test('PlayerCharacterCatalog includes default plus 4 anime GLB characters (without Sukuna or normal Luffy)', () => {
  const ids = PLAYER_CHARACTER_CATALOG.map((c) => c.id);
  assert.deepEqual(ids, [
    'default',
    'naruto',
    'luffy_gear5',
    'gojo',
    'itachi',
  ]);
  assert.equal(new Set(ids).size, 5);
  assert.equal(isValidPlayerCharacterId('luffy'), false);
  assert.equal(isValidPlayerCharacterId('sukuna'), false);

  for (const char of PLAYER_CHARACTER_CATALOG) {
    assert.ok(char.name.length > 0);
    assert.ok(char.targetHeight >= 1.65 && char.targetHeight <= 1.90);
    if (char.id !== 'default') {
      assert.ok(char.modelUrl, `missing modelUrl for ${char.id}`);
      assert.equal(char.rotationY, Math.PI, `${char.id} should rotate PI to face -Z`);
    }
  }

  for (const sharedId of ['luffy_gear5', 'gojo', 'itachi'] as const) {
    const def = getPlayerCharacterDef(sharedId);
    assert.equal(def.animationSourceUrl, '/models/characters/naruto.glb', `${sharedId} should share Naruto walk/run`);
  }
});

test('All local character GLB files exist on disk and have valid glTF binary magic', () => {
  for (const char of PLAYER_CHARACTER_CATALOG) {
    if (!char.modelUrl) continue;
    const relPath = char.modelUrl.replace(/^\//, '');
    const fullPath = path.join(process.cwd(), 'public', relPath);
    assert.equal(fs.existsSync(fullPath), true, `Missing GLB asset: ${fullPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 100_000, `GLB asset unexpectedly small (${stat.size}B): ${fullPath}`);

    const fd = fs.openSync(fullPath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    assert.equal(header.toString('ascii'), 'glTF', `Invalid glTF header in ${fullPath}`);
  }
});

test('Gojo configuration disables source dance animation and uses retargeted Naruto walk/run', () => {
  const gojo = getPlayerCharacterDef('gojo');
  assert.equal(gojo.disableSourceDanceAnimation, true);
  assert.equal(gojo.rigKind, 'gojo_standing');
  assert.equal(gojo.animationSourceUrl, '/models/characters/naruto.glb');
  assert.equal(isValidPlayerCharacterId('gojo'), true);
  assert.equal(isValidPlayerCharacterId('unknown_id'), false);
  assert.equal(getPlayerCharacterDef('unknown_id').id, 'default');
});

async function parseLocalGlb(relUrl: string): Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF> {
  (globalThis as Record<string, unknown>).self = globalThis;
  (globalThis as Record<string, unknown>).ImageBitmap = class {};
  (globalThis as Record<string, unknown>).document = { createElementNS: () => ({}) };

  const buf = fs.readFileSync(path.join(process.cwd(), 'public', relUrl.replace(/^\//, '')));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject));
}

test('applyGojoStandingCalibration puts Gojo skeleton into clean upright symmetrical standing pose', async () => {
  const gltf = await parseLocalGlb('/models/characters/gojo.glb');

  applyGojoStandingCalibration(gltf.scene);
  gltf.scene.updateMatrixWorld(true);

  const lFoot = new THREE.Vector3();
  const rFoot = new THREE.Vector3();
  const lToe = new THREE.Vector3();
  const rToe = new THREE.Vector3();
  const lHand = new THREE.Vector3();
  const rHand = new THREE.Vector3();

  gltf.scene.getObjectByName('leftFoot_10')?.getWorldPosition(lFoot);
  gltf.scene.getObjectByName('rightFoot_4')?.getWorldPosition(rFoot);
  gltf.scene.getObjectByName('leftFootToe_11')?.getWorldPosition(lToe);
  gltf.scene.getObjectByName('rightFootToe_5')?.getWorldPosition(rToe);
  gltf.scene.getObjectByName('leftHand_26')?.getWorldPosition(lHand);
  gltf.scene.getObjectByName('rightHand_20')?.getWorldPosition(rHand);

  // Both feet sit symmetrically at ground level instead of kicking mid-air
  assert.ok(Math.abs(lFoot.y - rFoot.y) < 0.05, `Feet Y should match (L=${lFoot.y}, R=${rFoot.y})`);
  assert.ok(Math.abs(lFoot.z - rFoot.z) < 0.05, `Feet Z should match (L=${lFoot.z}, R=${rFoot.z})`);
  // Toes point forward (+Z)
  assert.ok(lToe.z > lFoot.z + 0.25);
  assert.ok(rToe.z > rFoot.z + 0.25);
  // Both hands rest symmetrically down at sides
  assert.ok(Math.abs(lHand.y - rHand.y) < 0.05);
  assert.ok(lHand.y < 4.0, 'Hands should be lowered symmetrically by sides');
});

test('removeStrayGear5FloatingMesh strips Object_106 floating shirt and restores Luffy Gear 5 body bounds', async () => {
  const gltf = await parseLocalGlb('/models/characters/luffy_gear5.glb');

  gltf.scene.traverse((obj) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      (obj as THREE.SkinnedMesh).skeleton?.pose();
    }
  });

  const removedCount = removeStrayGear5FloatingMesh(gltf.scene);
  assert.equal(removedCount, 1);
  assert.equal(gltf.scene.getObjectByName('Object_106'), undefined);

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  assert.ok(size.y > 0.75 && size.y < 0.95, `Expected clean Gear 5 body height ~0.84m, got ${size.y}`);
  assert.ok(size.x < 0.75, `Expected stray giant sleeves removed (width=${size.x})`);
});

test('All 4 GLB characters play Naruto idle/walk/run animations and grip motorbike cleanly with 2-Bone IK', async () => {
  const narutoGltf = await parseLocalGlb('/models/characters/naruto.glb');

  for (const def of PLAYER_CHARACTER_CATALOG) {
    if (!def.modelUrl) continue;
    const gltf = def.id === 'naruto' ? narutoGltf : await parseLocalGlb(def.modelUrl);
    const animGltf = def.animationSourceUrl ? narutoGltf : undefined;

    const playerMesh = new THREE.Group();
    const ctrl = new PlayerGlbAvatarController({ playerMesh, fallbackMeshes: [] });
    ctrl.mountPreloadedForTest(def, gltf, animGltf);

    // Verify L/R normalization in standing pose (leftArm at -X, rightArm at +X)
    const lArmStand = new THREE.Vector3();
    const rArmStand = new THREE.Vector3();
    assert.equal(ctrl.getBoneWorldPosition('leftArm', lArmStand), true, `${def.id} missing leftArm`);
    assert.equal(ctrl.getBoneWorldPosition('rightArm', rArmStand), true, `${def.id} missing rightArm`);
    assert.ok(lArmStand.x < -0.05 && rArmStand.x > 0.05, `${def.id} L/R arms should sit on -X/+X (L=${lArmStand.x}, R=${rArmStand.x})`);

    // Verify ALL 4 anime GLB characters play idle, walk, and run Mixamo animations cleanly
    ctrl.update({ delta: 0.03, isMoving: false, isSprinting: false, moveDistance: 0, isRidingBike: false, steerAngle: 0, visible: true });
    assert.equal(ctrl.getActiveClipRole(), 'idle', `${def.id} should play idle`);
    ctrl.update({ delta: 0.03, isMoving: true, isSprinting: false, moveDistance: 0.12, isRidingBike: false, steerAngle: 0, visible: true });
    assert.equal(ctrl.getActiveClipRole(), 'walk', `${def.id} should play walk`);
    ctrl.update({ delta: 0.03, isMoving: true, isSprinting: true, moveDistance: 0.25, isRidingBike: false, steerAngle: 0, visible: true });
    assert.equal(ctrl.getActiveClipRole(), 'run', `${def.id} should play run`);

    // Verify motorbike seated IK pose straight (steer = 0) and turning left (steer = +0.35)
    for (const steer of [0, 0.35]) {
      ctrl.update({
        delta: 0.016,
        isMoving: false,
        isSprinting: false,
        moveDistance: 0,
        isRidingBike: true,
        steerAngle: steer,
        visible: true,
      });

      const hips = new THREE.Vector3();
      const lHand = new THREE.Vector3();
      const rHand = new THREE.Vector3();
      const lKnee = new THREE.Vector3();
      const rKnee = new THREE.Vector3();
      const lFoot = new THREE.Vector3();
      const rFoot = new THREE.Vector3();

      ctrl.getBoneWorldPosition('hips', hips);
      ctrl.getBoneWorldPosition('leftHand', lHand);
      ctrl.getBoneWorldPosition('rightHand', rHand);
      ctrl.getBoneWorldPosition('leftLeg', lKnee);
      ctrl.getBoneWorldPosition('rightLeg', rKnee);
      ctrl.getBoneWorldPosition('leftFoot', lFoot);
      ctrl.getBoneWorldPosition('rightFoot', rFoot);

      // 1. Pelvis sits flush on black saddle (not floating)
      assert.ok(hips.y >= 0.82 && hips.y <= 0.90, `${def.id} hipsY=${hips.y} should sit on saddle`);

      // 2. Both hands reach steering-rotated handlebar wrist targets cleanly
      const cosS = Math.cos(steer);
      const sinS = Math.sin(steer);
      const lTarget = new THREE.Vector3(-0.275 * cosS + 0.02 * sinS, 0.988, -0.60 + 0.275 * sinS + 0.02 * cosS + 0.045);
      const rTarget = new THREE.Vector3(0.275 * cosS + 0.02 * sinS, 0.988, -0.60 - 0.275 * sinS + 0.02 * cosS + 0.045);
      const lErr = lHand.distanceTo(lTarget);
      const rErr = rHand.distanceTo(rTarget);
      assert.ok(lErr < 0.07, `${def.id} (steer=${steer}) L-hand err=${lErr.toFixed(3)} too large`);
      assert.ok(rErr < 0.07, `${def.id} (steer=${steer}) R-hand err=${rErr.toFixed(3)} too large`);

      // 3. Knees straddle cleanly outside ±0.15m red fuel tank without frog-leg oversplay
      assert.ok(lKnee.x <= -0.18 && lKnee.x >= -0.34, `${def.id} L-knee X=${lKnee.x.toFixed(3)} outside tank clearance`);
      assert.ok(rKnee.x >= 0.18 && rKnee.x <= 0.34, `${def.id} R-knee X=${rKnee.x.toFixed(3)} outside tank clearance`);

      // 4. Feet rest squarely on footboards
      const lFootErr = lFoot.distanceTo(new THREE.Vector3(-0.215, 0.365, -0.20));
      const rFootErr = rFoot.distanceTo(new THREE.Vector3(0.215, 0.365, -0.20));
      assert.ok(lFootErr < 0.02, `${def.id} L-foot err=${lFootErr.toFixed(3)}`);
      assert.ok(rFootErr < 0.02, `${def.id} R-foot err=${rFootErr.toFixed(3)}`);
    }

    ctrl.dispose();
  }
});
