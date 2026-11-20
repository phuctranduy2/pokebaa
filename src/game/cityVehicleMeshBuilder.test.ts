import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildCityCarMesh,
  buildCityMotorbikeMesh,
  type CityCarVariant,
  type CityMotoVariant,
} from './CityVehicleMeshBuilder';
import { buildXanhSmTaxiMeshRig } from './XanhSmTaxiSystem';

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      meshes.push(obj);
    }
  });
  return meshes;
}

test('CityVehicleMeshBuilder: builds sculpted multi-part car variants grounded at Y=0 with UV/normals and 4 wheels', () => {
  const carVariants: CityCarVariant[] = ['sedan', 'suv', 'coupe', 'hatchback'];

  for (const variant of carVariants) {
    const built = buildCityCarMesh({
      color: 0x3b82f6,
      variant,
      isTaxi: variant === 'sedan',
      roofCrestBadge: variant === 'coupe',
      noMerge: true,
    });

    assert.equal(built.group.userData.noMerge, true);
    assert.equal(built.wheels.length, 4);
    assert.ok(built.wheelR > 0.3);

    const meshes = collectMeshes(built.group);
    assert.ok(meshes.length >= 35, `Expected >=35 meshes for ${variant}, got ${meshes.length}`);

    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position');
      const norm = m.geometry.getAttribute('normal');
      const uv = m.geometry.getAttribute('uv');
      assert.ok(pos, 'missing position attribute');
      assert.ok(norm, 'missing normal attribute');
      assert.ok(uv, 'missing uv attribute');
      assert.ok(pos.count > 0);
      for (let i = 0; i < pos.array.length; i++) {
        assert.equal(Number.isNaN(pos.array[i]), false);
      }
    }

    built.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(built.group);
    const maxExpectedH = variant === 'suv' ? 1.72 : variant === 'sedan' ? 1.62 : 1.55;
    assert.ok(box.min.y >= -0.02 && box.min.y <= 0.02, `Car ${variant} min.y=${box.min.y}`);
    assert.ok(
      box.max.y > 1.2 && box.max.y <= maxExpectedH,
      `Car ${variant} max.y=${box.max.y} exceeded roof cap ${maxExpectedH}`
    );
    assert.ok(box.max.x - box.min.x <= 2.15);
    assert.ok(box.max.z - box.min.z <= 4.75);
  }
});

test('CityVehicleMeshBuilder: shares cached geometries for dynamic vehicles and clones wrappers for static noMerge=false', () => {
  const dynA = buildCityCarMesh({ color: 0xf59e0b, variant: 'sedan', noMerge: true });
  const dynB = buildCityCarMesh({ color: 0x3b82f6, variant: 'sedan', noMerge: true });
  const stat = buildCityCarMesh({ color: 0xf8fafc, variant: 'sedan', noMerge: false });

  const dynMeshesA = collectMeshes(dynA.group);
  const dynMeshesB = collectMeshes(dynB.group);
  const statMeshes = collectMeshes(stat.group);

  assert.equal(stat.group.userData.noMerge, undefined);
  assert.equal(dynMeshesA[0].geometry, dynMeshesB[0].geometry);
  assert.notEqual(statMeshes[0].geometry, dynMeshesA[0].geometry);
});

test('CityVehicleMeshBuilder: builds detailed scooter and sport motorbikes with helmeted rider and 2 grounded wheels', () => {
  const motoVariants: CityMotoVariant[] = ['scooter', 'sport'];

  for (const variant of motoVariants) {
    const built = buildCityMotorbikeMesh({
      color: 0xef4444,
      variant,
      helmetColor: 0xf8fafc,
      jacketColor: 0x1e293b,
      includeRider: true,
      noMerge: true,
    });

    assert.equal(built.group.userData.noMerge, true);
    assert.equal(built.wheels.length, 2);
    assert.ok(Math.abs(built.wheelR - 0.28) < 0.001);

    const meshes = collectMeshes(built.group);
    assert.ok(meshes.length >= 25);

    built.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(built.group);
    assert.ok(box.min.y >= -0.02 && box.min.y <= 0.02, `Moto ${variant} min.y=${box.min.y}`);
    assert.ok(box.max.y > 1.4);
  }

  const parked = buildCityMotorbikeMesh({
    color: 0x0284c7,
    variant: 'scooter',
    includeRider: false,
    kickstandTilt: true,
    noMerge: false,
  });
  const withRider = buildCityMotorbikeMesh({
    color: 0x0284c7,
    variant: 'scooter',
    includeRider: true,
    noMerge: false,
  });
  const withPassenger = buildCityMotorbikeMesh({
    color: 0xe2e8f0,
    variant: 'scooter',
    helmetColor: 0x18181b,
    jacketColor: 0xc2a888,
    includeRider: true,
    includePassenger: true,
    passengerHelmetColor: 0xdc2626,
    passengerJacketColor: 0xe8b4cb,
    noMerge: true,
  });

  assert.equal(parked.group.userData.noMerge, undefined);
  assert.ok(withRider.riderGroup instanceof THREE.Group);
  assert.ok(withPassenger.riderGroup instanceof THREE.Group);

  const parkedMeshes = collectMeshes(parked.group);
  const soloMeshes = collectMeshes(withRider.group);
  const twoUpMeshes = collectMeshes(withPassenger.group);
  assert.ok(parkedMeshes.length < soloMeshes.length);
  assert.ok(soloMeshes.length < twoUpMeshes.length);

  for (const m of [...parkedMeshes, ...twoUpMeshes]) {
    const pos = m.geometry.getAttribute('position');
    const norm = m.geometry.getAttribute('normal');
    const uv = m.geometry.getAttribute('uv');
    assert.ok(pos, 'missing moto position attribute');
    assert.ok(norm, 'missing moto normal attribute');
    assert.ok(uv, 'missing moto uv attribute');
    for (let i = 0; i < pos.array.length; i++) {
      assert.equal(Number.isNaN(pos.array[i]), false);
    }
  }

  withPassenger.group.updateMatrixWorld(true);
  const twoUpBox = new THREE.Box3().setFromObject(withPassenger.group);
  assert.ok(twoUpBox.min.y >= -0.02 && twoUpBox.min.y <= 0.02, `2-up moto min.y=${twoUpBox.min.y}`);
  assert.ok(twoUpBox.max.y > 1.4, `2-up moto max.y=${twoUpBox.max.y}`);
});

test('XanhSmTaxiSystem: builds sculpted VinFast VF e34 and VF 5 taxi rigs with 4 grounded wheels, UV/normals, and interactive door/passenger', () => {
  const variants: Array<'vfe34' | 'vf5'> = ['vfe34', 'vf5'];

  for (const variant of variants) {
    const rig = buildXanhSmTaxiMeshRig({
      variant,
      plateStr: variant === 'vfe34' ? '43H-088.88' : '43H-055.55',
    });

    assert.equal(rig.wheels.length, 4);
    assert.ok(rig.rearDoorPivot instanceof THREE.Group);
    assert.ok(rig.rearPassengerSilhouette instanceof THREE.Group);
    assert.ok(rig.pitchPivot instanceof THREE.Group);

    const meshes = collectMeshes(rig.group);
    assert.ok(meshes.length >= 45, `Expected >=45 meshes for Xanh SM ${variant}, got ${meshes.length}`);

    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position');
      const norm = m.geometry.getAttribute('normal');
      const uv = m.geometry.getAttribute('uv');
      assert.ok(pos, `missing position on ${variant}`);
      assert.ok(norm, `missing normal on ${variant}`);
      assert.ok(uv, `missing uv on ${variant}`);
      assert.ok(pos.count > 0);
      for (let i = 0; i < pos.array.length; i++) {
        assert.equal(Number.isNaN(pos.array[i]), false);
      }
    }

    rig.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.group);
    assert.ok(box.min.y >= -0.02 && box.min.y <= 0.02, `Xanh SM ${variant} min.y=${box.min.y}`);
    assert.ok(
      box.max.y > 1.4 && box.max.y <= 1.75,
      `Xanh SM ${variant} max.y=${box.max.y} out of expected roof+lightbox range`
    );
  }
});
