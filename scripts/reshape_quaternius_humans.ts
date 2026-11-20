import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { Accessor, Document, Material, Mesh, Node, NodeIO, Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize } from '@gltf-transform/functions';

interface BodyProportionProfile {
  /** Local cross-section/size scale per bone [sx, sy, sz] around that bone's pivot */
  boneScales: Record<string, [number, number, number]>;
  /** Local translation multiplier per bone [tx, ty, tz] for node & animation translation channels */
  boneTranslationMult: Record<string, [number, number, number]>;
  /** Optional additive local translation offset [dx, dy, dz] applied in rest & all animation frames */
  boneTranslationOffset?: Record<string, [number, number, number]>;
}

/**
 * Stage A anatomical proportion refinement applied on top of humanProportionV1:
 * - Lengthens legs (+16%) and slightly compacts trunk (0.92x) so hip height sits at ~45.5% of stature
 * - Shortens arms (0.83x) so wrists align naturally at hip/trouser-pocket level and fingertips at upper thigh
 * - Refines head scale (~0.91x -> ~1:7.45 adult head-to-body ratio) & slims neck cylinder
 */
const V2_ANATOMY_MALE: BodyProportionProfile = {
  boneScales: {
    Head: [0.91, 0.92, 0.92],
    Neck: [0.88, 0.96, 0.88],
    Torso: [0.97, 0.92, 0.96],
    Abdomen: [0.95, 0.92, 0.95],
    Hips: [0.96, 1.0, 0.96],
    Body: [0.96, 1.0, 0.96],
    'Shoulder.L': [0.96, 0.94, 0.96],
    'Shoulder.R': [0.96, 0.94, 0.96],
    'UpperArm.L': [0.93, 0.83, 0.93],
    'UpperArm.R': [0.93, 0.83, 0.93],
    'LowerArm.L': [0.93, 0.83, 0.93],
    'LowerArm.R': [0.93, 0.83, 0.93],
    'Fist.L': [0.88, 0.88, 0.88],
    'Fist.R': [0.88, 0.88, 0.88],
    'UpperLeg.L': [0.95, 1.16, 0.95],
    'UpperLeg.R': [0.95, 1.16, 0.95],
    'LowerLeg.L': [0.93, 1.16, 0.93],
    'LowerLeg.R': [0.93, 1.16, 0.93],
    'Foot.L': [0.90, 0.90, 0.90],
    'Foot.R': [0.90, 0.90, 0.90],
  },
  boneTranslationMult: {
    Body: [1.0, 1.16, 1.0],
    Abdomen: [1.0, 0.92, 1.0],
    Torso: [1.0, 0.92, 1.0],
    Neck: [1.0, 0.92, 1.0],
    'Shoulder.L': [0.96, 0.94, 1.0],
    'Shoulder.R': [0.96, 0.94, 1.0],
    'LowerArm.L': [1.0, 0.83, 1.0],
    'LowerArm.R': [1.0, 0.83, 1.0],
    'Fist.L': [1.0, 0.83, 1.0],
    'Fist.R': [1.0, 0.83, 1.0],
    'LowerLeg.L': [1.0, 1.16, 1.0],
    'LowerLeg.R': [1.0, 1.16, 1.0],
    'Foot.L': [1.0, 1.16, 1.0],
    'Foot.R': [1.0, 1.16, 1.0],
    'PoleTarget.L': [1.0, 1.16, 1.0],
    'PoleTarget.R': [1.0, 1.16, 1.0],
  },
};

const V2_ANATOMY_FEMALE: BodyProportionProfile = {
  boneScales: {
    ...V2_ANATOMY_MALE.boneScales,
    Head: [0.90, 0.91, 0.91],
    Neck: [0.85, 0.96, 0.85],
    Torso: [0.95, 0.92, 0.95],
    Abdomen: [0.93, 0.92, 0.94],
    'UpperArm.L': [0.90, 0.83, 0.90],
    'UpperArm.R': [0.90, 0.83, 0.90],
    'LowerArm.L': [0.90, 0.83, 0.90],
    'LowerArm.R': [0.90, 0.83, 0.90],
    'UpperLeg.L': [0.93, 1.16, 0.93],
    'UpperLeg.R': [0.93, 1.16, 0.93],
    'LowerLeg.L': [0.91, 1.16, 0.91],
    'LowerLeg.R': [0.91, 1.16, 0.91],
  },
  boneTranslationMult: {
    ...V2_ANATOMY_MALE.boneTranslationMult,
  },
};

type ArchetypeShoeStyle = 'sneaker' | 'dress' | 'workboot' | 'medical';

interface ModelVisualStyle {
  shoeStyle: ArchetypeShoeStyle;
  shoeHex: number;
  soleHex: number;
  sockHex: number | null; // null = bare ankles (shorts/capris)
  addEars: boolean;
  addMouth: boolean;
  skinHex: number;
}

const MODEL_STYLES: Record<string, ModelVisualStyle> = {
  'Casual_Male.glb': { shoeStyle: 'sneaker', shoeHex: 0x242f40, soleHex: 0xf1f5f9, sockHex: null, addEars: true, addMouth: true, skinHex: 0xeec09e },
  'Casual_Female.glb': { shoeStyle: 'sneaker', shoeHex: 0xe2e8f0, soleHex: 0xf8fafc, sockHex: null, addEars: false, addMouth: true, skinHex: 0xf1c6a7 },
  'Casual2_Male.glb': { shoeStyle: 'sneaker', shoeHex: 0x2b363d, soleHex: 0xf1f5f9, sockHex: null, addEars: true, addMouth: true, skinHex: 0xecc09f },
  'Casual2_Female.glb': { shoeStyle: 'sneaker', shoeHex: 0x3f242c, soleHex: 0xf1f5f9, sockHex: null, addEars: false, addMouth: true, skinHex: 0xf0c5a6 },
  'Casual3_Male.glb': { shoeStyle: 'sneaker', shoeHex: 0x1e293b, soleHex: 0xf1f5f9, sockHex: null, addEars: true, addMouth: true, skinHex: 0xe9b896 },
  'Casual_Bald.glb': { shoeStyle: 'sneaker', shoeHex: 0x5c3d28, soleHex: 0xe7e5e4, sockHex: null, addEars: true, addMouth: true, skinHex: 0xeac09f },
  'Suit_Male.glb': { shoeStyle: 'dress', shoeHex: 0x18181b, soleHex: 0x0f172a, sockHex: 0x1e293b, addEars: true, addMouth: true, skinHex: 0xeec09e },
  'Suit_Female.glb': { shoeStyle: 'dress', shoeHex: 0x1c1917, soleHex: 0x0f172a, sockHex: 0x1e293b, addEars: false, addMouth: true, skinHex: 0xf1c6a7 },
  'OldClassy_Male.glb': { shoeStyle: 'dress', shoeHex: 0x3f2518, soleHex: 0x1c1917, sockHex: 0x334155, addEars: true, addMouth: false, skinHex: 0xeac0a0 },
  'OldClassy_Female.glb': { shoeStyle: 'dress', shoeHex: 0x3b2218, soleHex: 0x1c1917, sockHex: 0x475569, addEars: false, addMouth: true, skinHex: 0xeec4a5 },
  'Doctor_Male_Young.glb': { shoeStyle: 'medical', shoeHex: 0xf1f5f9, soleHex: 0xcbd5e1, sockHex: 0x1e293b, addEars: true, addMouth: true, skinHex: 0xeec09e },
  'Doctor_Female_Young.glb': { shoeStyle: 'medical', shoeHex: 0xf1f5f9, soleHex: 0xcbd5e1, sockHex: 0x1e293b, addEars: false, addMouth: true, skinHex: 0xf1c6a7 },
  'Worker_Male.glb': { shoeStyle: 'workboot', shoeHex: 0x6e4325, soleHex: 0x1e293b, sockHex: null, addEars: true, addMouth: true, skinHex: 0xe8b590 },
  'Worker_Female.glb': { shoeStyle: 'workboot', shoeHex: 0x6e4325, soleHex: 0x1e293b, sockHex: null, addEars: false, addMouth: true, skinHex: 0xeec19f },
};

function hexToLinearRgba(hex: number): [number, number, number, number] {
  const srgb = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [
    srgb(((hex >> 16) & 0xff) / 255),
    srgb(((hex >> 8) & 0xff) / 255),
    srgb((hex & 0xff) / 255),
    1.0,
  ];
}

function computeNodeWorldMatrices(nodes: Node[]): Map<Node, THREE.Matrix4> {
  const cache = new Map<Node, THREE.Matrix4>();
  const getWorld = (node: Node): THREE.Matrix4 => {
    const hit = cache.get(node);
    if (hit) return hit;
    const t = node.getTranslation();
    const r = node.getRotation();
    const s = node.getScale();
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(t[0], t[1], t[2]),
      new THREE.Quaternion(r[0], r[1], r[2], r[3]),
      new THREE.Vector3(s[0], s[1], s[2])
    );
    const parent = node.getParentNode();
    const world = parent ? getWorld(parent).clone().multiply(local) : local;
    cache.set(node, world);
    return world;
  };
  for (const n of nodes) getWorld(n);
  return cache;
}

function reshapeDocument(doc: Document, profile: BodyProportionProfile): void {
  const root = doc.getRoot();
  const allNodes = root.listNodes();
  const skins = root.listSkins();
  if (skins.length === 0) return;

  const oldWorldMap = computeNodeWorldMatrices(allNodes);

  for (const node of allNodes) {
    const nm = node.getName();
    const mult = profile.boneTranslationMult[nm];
    const off = profile.boneTranslationOffset?.[nm];
    if (mult || off) {
      const t = node.getTranslation();
      const nx = t[0] * (mult ? mult[0] : 1) + (off ? off[0] : 0);
      const ny = t[1] * (mult ? mult[1] : 1) + (off ? off[1] : 0);
      const nz = t[2] * (mult ? mult[2] : 1) + (off ? off[2] : 0);
      node.setTranslation([nx, ny, nz]);
    }
  }

  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      if (ch.getTargetPath() !== 'translation') continue;
      const nm = ch.getTargetNode()?.getName() || '';
      const mult = profile.boneTranslationMult[nm];
      const off = profile.boneTranslationOffset?.[nm];
      if (!mult && !off) continue;
      const sampler = ch.getSampler();
      const origOut = sampler?.getOutput();
      if (!sampler || !origOut) continue;

      const count = origOut.getCount();
      const data = new Float32Array(count * 3);
      const tmp = [0, 0, 0];
      for (let i = 0; i < count; i++) {
        origOut.getElement(i, tmp);
        data[i * 3 + 0] = tmp[0] * (mult ? mult[0] : 1) + (off ? off[0] : 0);
        data[i * 3 + 1] = tmp[1] * (mult ? mult[1] : 1) + (off ? off[1] : 0);
        data[i * 3 + 2] = tmp[2] * (mult ? mult[2] : 1) + (off ? off[2] : 0);
      }
      const newOut = doc
        .createAccessor()
        .setType(Accessor.Type.VEC3)
        .setArray(data)
        .setBuffer(origOut.getBuffer());
      sampler.setOutput(newOut);
    }
  }

  const newWorldMap = computeNodeWorldMatrices(allNodes);

  for (const skin of skins) {
    const joints = skin.listJoints();
    const oldIbmAcc = skin.getInverseBindMatrices();
    const posTransforms: THREE.Matrix4[] = [];
    const normTransforms: THREE.Matrix3[] = [];
    const newIbmData = new Float32Array(joints.length * 16);

    const tmpIbmArr = new Array<number>(16).fill(0);
    for (let jIdx = 0; jIdx < joints.length; jIdx++) {
      const joint = joints[jIdx];
      const jName = joint.getName();

      let oldIbm = new THREE.Matrix4();
      if (oldIbmAcc) {
        oldIbmAcc.getElement(jIdx, tmpIbmArr);
        oldIbm.fromArray(tmpIbmArr);
      } else {
        oldIbm = oldWorldMap.get(joint)!.clone().invert();
      }

      const newWorld = newWorldMap.get(joint)!;
      const newIbm = newWorld.clone().invert();
      newIbm.toArray(newIbmData, jIdx * 16);

      const sc = profile.boneScales[jName] ?? [1, 1, 1];
      const localScaleMat = new THREE.Matrix4().makeScale(sc[0], sc[1], sc[2]);

      const posT = newWorld.clone().multiply(localScaleMat).multiply(oldIbm);
      posTransforms.push(posT);

      const normT = new THREE.Matrix3().setFromMatrix4(posT).invert().transpose();
      normTransforms.push(normT);
    }

    const newIbmAcc = doc
      .createAccessor()
      .setType(Accessor.Type.MAT4)
      .setArray(newIbmData)
      .setBuffer(oldIbmAcc ? oldIbmAcc.getBuffer() : root.listBuffers()[0]);
    skin.setInverseBindMatrices(newIbmAcc);

    for (const node of allNodes) {
      if (node.getSkin() !== skin) continue;
      const mesh = node.getMesh();
      if (!mesh) continue;

      for (const prim of mesh.listPrimitives()) {
        const posAcc = prim.getAttribute('POSITION');
        const normAcc = prim.getAttribute('NORMAL');
        const j0Acc = prim.getAttribute('JOINTS_0');
        const w0Acc = prim.getAttribute('WEIGHTS_0');
        if (!posAcc || !j0Acc || !w0Acc) continue;

        const vCount = posAcc.getCount();
        const newPos = new Float32Array(vCount * 3);
        const newNorm = normAcc ? new Float32Array(vCount * 3) : null;

        const pArr = [0, 0, 0];
        const nArr = [0, 0, 0];
        const jArr = [0, 0, 0, 0];
        const wArr = [0, 0, 0, 0];
        const pVec = new THREE.Vector3();
        const pSum = new THREE.Vector3();
        const nVec = new THREE.Vector3();
        const nSum = new THREE.Vector3();

        for (let i = 0; i < vCount; i++) {
          posAcc.getElement(i, pArr);
          j0Acc.getElement(i, jArr);
          w0Acc.getElement(i, wArr);
          if (normAcc) normAcc.getElement(i, nArr);

          let wSum = wArr[0] + wArr[1] + wArr[2] + wArr[3];
          if (wSum <= 1e-6) wSum = 1;

          pSum.set(0, 0, 0);
          nSum.set(0, 0, 0);

          for (let k = 0; k < 4; k++) {
            const wk = wArr[k] / wSum;
            if (wk <= 0) continue;
            const jIdx = jArr[k];
            const pt = posTransforms[jIdx];
            if (!pt) continue;

            pVec.set(pArr[0], pArr[1], pArr[2]).applyMatrix4(pt).multiplyScalar(wk);
            pSum.add(pVec);

            if (newNorm) {
              const nt = normTransforms[jIdx];
              nVec.set(nArr[0], nArr[1], nArr[2]).applyMatrix3(nt).multiplyScalar(wk);
              nSum.add(nVec);
            }
          }

          newPos[i * 3 + 0] = pSum.x;
          newPos[i * 3 + 1] = pSum.y;
          newPos[i * 3 + 2] = pSum.z;

          if (newNorm) {
            if (nSum.lengthSq() > 1e-8) nSum.normalize();
            else nSum.set(0, 1, 0);
            newNorm[i * 3 + 0] = nSum.x;
            newNorm[i * 3 + 1] = nSum.y;
            newNorm[i * 3 + 2] = nSum.z;
          }
        }

        const outPosAcc = doc
          .createAccessor()
          .setType(Accessor.Type.VEC3)
          .setArray(newPos)
          .setBuffer(posAcc.getBuffer());
        prim.setAttribute('POSITION', outPosAcc);

        if (newNorm && normAcc) {
          const outNormAcc = doc
            .createAccessor()
            .setType(Accessor.Type.VEC3)
            .setArray(newNorm)
            .setBuffer(normAcc.getBuffer());
          prim.setAttribute('NORMAL', outNormAcc);
        }
      }
    }
  }
}

interface IdlePoseContext {
  jointIndexByName: Map<string, number>;
  jointNames: string[];
  jointWorldIdle: Map<string, THREE.Vector3>;
  skinMats: THREE.Matrix4[];
  invSkinMats: THREE.Matrix4[];
}

function buildIdlePoseContext(doc: Document): IdlePoseContext | null {
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  if (!skin) return null;
  const joints = skin.listJoints();
  const ibmAcc = skin.getInverseBindMatrices();
  const anim =
    root.listAnimations().find((a) => a.getName().toLowerCase().includes('idle')) ??
    root.listAnimations()[0];

  const trMap = new Map<string, [number, number, number]>();
  const rotMap = new Map<string, [number, number, number, number]>();
  if (anim) {
    for (const ch of anim.listChannels()) {
      const jn = ch.getTargetNode()?.getName();
      const out = ch.getSampler()?.getOutput();
      if (!jn || !out) continue;
      if (ch.getTargetPath() === 'translation') trMap.set(jn, out.getElement(0, [0, 0, 0]) as [number, number, number]);
      if (ch.getTargetPath() === 'rotation') rotMap.set(jn, out.getElement(0, [0, 0, 0, 1]) as [number, number, number, number]);
    }
  }

  const wCache = new Map<Node, THREE.Matrix4>();
  const getW = (n: Node): THREE.Matrix4 => {
    const hit = wCache.get(n);
    if (hit) return hit;
    const nm = n.getName();
    const t = trMap.get(nm) ?? n.getTranslation();
    const r = rotMap.get(nm) ?? n.getRotation();
    const s = n.getScale();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(t[0], t[1], t[2]),
      new THREE.Quaternion(r[0], r[1], r[2], r[3]),
      new THREE.Vector3(s[0], s[1], s[2])
    );
    const parent = n.getParentNode();
    const w = parent ? getW(parent).clone().multiply(m) : m;
    wCache.set(n, w);
    return w;
  };

  const jointIndexByName = new Map<string, number>();
  const jointNames: string[] = [];
  const jointWorldIdle = new Map<string, THREE.Vector3>();
  const skinMats: THREE.Matrix4[] = [];
  const invSkinMats: THREE.Matrix4[] = [];
  const arr = new Array<number>(16).fill(0);

  for (let i = 0; i < joints.length; i++) {
    const j = joints[i];
    const jn = j.getName();
    jointIndexByName.set(jn, i);
    jointNames.push(jn);
    const w = getW(j);
    jointWorldIdle.set(jn, new THREE.Vector3().setFromMatrixPosition(w));

    let ibm = new THREE.Matrix4();
    if (ibmAcc) {
      ibmAcc.getElement(i, arr);
      ibm.fromArray(arr);
    } else {
      ibm = w.clone().invert();
    }
    const sm = w.clone().multiply(ibm);
    skinMats.push(sm);
    invSkinMats.push(sm.clone().invert());
  }

  return { jointIndexByName, jointNames, jointWorldIdle, skinMats, invSkinMats };
}

function getOrCreateMaterial(
  doc: Document,
  name: string,
  hex: number,
  roughness: number,
  metallic = 0.02
): Material {
  const existing = doc.getRoot().listMaterials().find((m) => m.getName() === name);
  if (existing) {
    existing.setBaseColorFactor(hexToLinearRgba(hex));
    existing.setRoughnessFactor(roughness);
    existing.setMetallicFactor(metallic);
    return existing;
  }
  return doc
    .createMaterial(name)
    .setBaseColorFactor(hexToLinearRgba(hex))
    .setRoughnessFactor(roughness)
    .setMetallicFactor(metallic);
}

interface RawTriBuilder {
  positions: number[]; // Idle-world space
  joints: number[]; // JOINTS_0 (vec4)
  weights: number[]; // WEIGHTS_0 (vec4)
  indices: number[];
}

function createBuilder(): RawTriBuilder {
  return { positions: [], joints: [], weights: [], indices: [] };
}

function pushVertex(
  b: RawTriBuilder,
  x: number,
  y: number,
  z: number,
  j0: number,
  w0: number,
  j1 = 0,
  w1 = 0
): number {
  const idx = b.positions.length / 3;
  b.positions.push(x, y, z);
  b.joints.push(j0, j1, 0, 0);
  b.weights.push(w0, w1, 0, 0);
  return idx;
}

function pushTri(b: RawTriBuilder, a: number, c: number, d: number): void {
  b.indices.push(a, c, d);
}

function pushQuad(b: RawTriBuilder, a: number, c: number, d: number, e: number): void {
  b.indices.push(a, c, d, a, d, e);
}

function appendEllipsoid(
  b: RawTriBuilder,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  segU: number,
  segV: number,
  jIdx: number
): void {
  const grid: number[][] = [];
  for (let iv = 0; iv <= segV; iv++) {
    const phi = (iv / segV) * Math.PI;
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);
    const row: number[] = [];
    for (let iu = 0; iu <= segU; iu++) {
      const theta = (iu / segU) * Math.PI * 2;
      const x = cx + Math.cos(theta) * sinP * rx;
      const y = cy + cosP * ry;
      const z = cz + Math.sin(theta) * sinP * rz;
      row.push(pushVertex(b, x, y, z, jIdx, 1));
    }
    grid.push(row);
  }
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = grid[iv][iu];
      const b1 = grid[iv + 1][iu];
      const c = grid[iv + 1][iu + 1];
      const d = grid[iv][iu + 1];
      if (iv > 0) pushTri(b, a, b1, d);
      if (iv < segV - 1) pushTri(b, b1, c, d);
    }
  }
}

/**
 * Generates a sculpted 3D shoe (upper + crisp outsole) in Idle-world space around (footX, floorY, footZ).
 */
function buildShoePair(
  ctx: IdlePoseContext,
  style: ArchetypeShoeStyle,
  upperBuilder: RawTriBuilder,
  soleBuilder: RawTriBuilder,
  floorY: number,
  ankleCenters: { left: { x: number; z: number }; right: { x: number; z: number } }
): void {
  const specs: Array<{ side: 1 | -1; footName: string; legName: string; cx: number; cz: number }> = [
    { side: 1, footName: 'Foot.L', legName: 'LowerLeg.L', cx: ankleCenters.left.x, cz: ankleCenters.left.z },
    { side: -1, footName: 'Foot.R', legName: 'LowerLeg.R', cx: ankleCenters.right.x, cz: ankleCenters.right.z },
  ];

  const isDress = style === 'dress';
  const isBoot = style === 'workboot';
  const cuffTopY = isBoot ? floorY + 0.125 : isDress ? floorY + 0.095 : floorY + 0.102;
  const soleThick = isBoot ? 0.022 : isDress ? 0.015 : 0.020;
  const soleTopY = floorY + soleThick;
  const toeLen = isDress ? 0.148 : 0.140;
  const heelBack = -0.082;
  const halfW = isDress ? 0.053 : 0.057;

  // Cross-section profile from back of heel (t=0) to tip of toe (t=1):
  // [zOffset, halfWidth, topHeightAboveSole, bottomY]
  const stations: Array<[number, number, number, number]> = [
    [heelBack, halfW * 0.86, cuffTopY - soleTopY, soleTopY], // 0: heel back
    [-0.044, halfW * 0.96, cuffTopY - soleTopY, soleTopY], // 1: ankle cuff center (wider than ankle!)
    [-0.008, halfW * 0.98, isBoot ? 0.088 : 0.068, soleTopY], // 2: instep tongue
    [0.042, halfW * 1.02, 0.050, soleTopY], // 3: mid-vamp / ball
    [0.094, halfW * (isDress ? 0.88 : 0.98), 0.036, soleTopY], // 4: toe box start
    [toeLen - 0.018, halfW * (isDress ? 0.62 : 0.78), 0.026, soleTopY + 0.002], // 5: rounded toe curve
    [toeLen, halfW * (isDress ? 0.36 : 0.48), 0.013, soleTopY + 0.004], // 6: toe tip
  ];

  const ringSegs = 12;

  for (const sp of specs) {
    const fIdx = ctx.jointIndexByName.get(sp.footName);
    const lIdx = ctx.jointIndexByName.get(sp.legName);
    if (fIdx === undefined || lIdx === undefined) continue;

    const cx = sp.cx;
    const cz = sp.cz;

    // 1. Shoe Upper
    const upperRings: number[][] = [];
    for (let s = 0; s < stations.length; s++) {
      const [dz, hw, hTop, yBase] = stations[s];
      const z = cz + dz;

      const ring: number[] = [];
      for (let i = 0; i < ringSegs; i++) {
        const ang = (i / ringSegs) * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const vx = cx + cosA * hw * (sinA < 0 ? 0.96 : 1.0);
        const vy = sinA >= 0 ? yBase + Math.pow(sinA, 0.82) * hTop : yBase;
        // Blend ankle cuff top smoothly with LowerLeg so shoe cuff tracks shin sway in Idle/Walk
        let wLeg = 0.0;
        if (s <= 1 && sinA > 0.25) {
          wLeg = 0.62 * Math.min(1, (sinA - 0.25) / 0.75);
        } else if (s === 2 && sinA > 0.45) {
          wLeg = 0.30 * Math.min(1, (sinA - 0.45) / 0.55);
        }
        const wFoot = 1.0 - wLeg;
        ring.push(pushVertex(upperBuilder, vx, vy, z, fIdx, wFoot, lIdx, wLeg));
      }
      upperRings.push(ring);
    }

    for (let s = 0; s < upperRings.length - 1; s++) {
      const r0 = upperRings[s];
      const r1 = upperRings[s + 1];
      for (let i = 0; i < ringSegs; i++) {
        const ni = (i + 1) % ringSegs;
        pushQuad(upperBuilder, r0[i], r0[ni], r1[ni], r1[i]);
      }
    }
    // Cap heel back & toe front
    const heelCenter = pushVertex(
      upperBuilder,
      cx,
      soleTopY + (cuffTopY - soleTopY) * 0.5,
      cz + heelBack - 0.010,
      fIdx,
      0.75,
      lIdx,
      0.25
    );
    for (let i = 0; i < ringSegs; i++) {
      const ni = (i + 1) % ringSegs;
      pushTri(upperBuilder, heelCenter, upperRings[0][ni], upperRings[0][i]);
    }
    const toeCap = pushVertex(
      upperBuilder,
      cx,
      soleTopY + 0.010,
      cz + toeLen + 0.006,
      fIdx,
      1.0
    );
    const lastRing = upperRings[upperRings.length - 1];
    for (let i = 0; i < ringSegs; i++) {
      const ni = (i + 1) % ringSegs;
      pushTri(upperBuilder, toeCap, lastRing[i], lastRing[ni]);
    }

    // 2. Crisp Outsole (slightly wider footprint around shoe base, seated at floorY)
    const soleStations: Array<[number, number, number]> = [
      [heelBack - 0.005, halfW * 0.78, floorY],
      [-0.045, halfW * 0.92, floorY],
      [0.035, halfW * 1.03, floorY],
      [0.084, halfW * (isDress ? 0.90 : 1.00), floorY],
      [toeLen - 0.012, halfW * (isDress ? 0.64 : 0.80), floorY + 0.002],
      [toeLen + 0.005, halfW * (isDress ? 0.36 : 0.48), floorY + 0.004],
    ];
    const soleAngles = 8;
    const soleBotRings: number[][] = [];
    const soleTopRings: number[][] = [];
    for (let s = 0; s < soleStations.length; s++) {
      const [dz, hw, yb] = soleStations[s];
      const z = cz + dz;
      const bRing: number[] = [];
      const tRing: number[] = [];
      for (let i = 0; i < soleAngles; i++) {
        const ang = (i / soleAngles) * Math.PI * 2;
        const vx = cx + Math.cos(ang) * hw;
        const vz = z + Math.sin(ang) * 0.006;
        bRing.push(pushVertex(soleBuilder, vx, yb, vz, fIdx, 1.0));
        tRing.push(pushVertex(soleBuilder, vx * 0.99 + cx * 0.01, yb + soleThick + 0.002, vz, fIdx, 1.0));
      }
      soleBotRings.push(bRing);
      soleTopRings.push(tRing);
    }
    // Side walls of sole
    for (let s = 0; s < soleStations.length - 1; s++) {
      for (let i = 0; i < soleAngles; i++) {
        const ni = (i + 1) % soleAngles;
        pushQuad(soleBuilder, soleBotRings[s][i], soleTopRings[s][i], soleTopRings[s + 1][i], soleBotRings[s + 1][i]);
        // Top & bottom ribbon between stations
        pushQuad(soleBuilder, soleTopRings[s][i], soleTopRings[s][ni], soleTopRings[s + 1][ni], soleTopRings[s + 1][i]);
        pushQuad(soleBuilder, soleBotRings[s][ni], soleBotRings[s][i], soleBotRings[s + 1][i], soleBotRings[s + 1][ni]);
      }
    }
    // Back/front sole caps
    for (let i = 0; i < soleAngles; i++) {
      const ni = (i + 1) % soleAngles;
      pushQuad(soleBuilder, soleBotRings[0][ni], soleBotRings[0][i], soleTopRings[0][i], soleTopRings[0][ni]);
      const last = soleStations.length - 1;
      pushQuad(soleBuilder, soleBotRings[last][i], soleBotRings[last][ni], soleTopRings[last][ni], soleTopRings[last][i]);
    }
  }
}

/**
 * Adds a sculpted 3D nose, optional ears, subtle mouth, and soft white eye sclera in Idle-world space.
 */
function buildFacialDetails(
  ctx: IdlePoseContext,
  style: ModelVisualStyle,
  headCenter: THREE.Vector3,
  faceZAtY: (y: number) => number,
  eyeY: number,
  eyeXAbs: number,
  eyeZCenter: number,
  headHalfW: number,
  skinBuilder: RawTriBuilder,
  eyeWhiteBuilder: RawTriBuilder,
  mouthBuilder: RawTriBuilder
): void {
  const headIdx = ctx.jointIndexByName.get('Head');
  if (headIdx === undefined) return;

  // 1. Subtle 3D Nose (bridge + rounded tip protruding cleanly ahead of face surface)
  const nBridgeY = eyeY + 0.004;
  const nMidY = eyeY - 0.017;
  const nTipY = eyeY - 0.035;
  const nBaseY = eyeY - 0.045;
  const surfBridge = faceZAtY(nBridgeY);
  const surfTip = faceZAtY(nTipY);
  const zBack = surfBridge - 0.010;
  const zTip = surfTip + 0.021;
  const zBridge = surfBridge + 0.009;

  const vTop = pushVertex(skinBuilder, 0, nBridgeY, zBack + 0.008, headIdx, 1);
  const vBridge = pushVertex(skinBuilder, 0, nMidY, zBridge, headIdx, 1);
  const vTip = pushVertex(skinBuilder, 0, nTipY, zTip, headIdx, 1);
  const vSeptum = pushVertex(skinBuilder, 0, nBaseY, surfTip + 0.001, headIdx, 1);
  const vLeft = pushVertex(skinBuilder, 0.013, nTipY - 0.004, surfTip, headIdx, 1);
  const vRight = pushVertex(skinBuilder, -0.013, nTipY - 0.004, surfTip, headIdx, 1);
  const vLeftTop = pushVertex(skinBuilder, 0.009, nMidY + 0.004, zBack + 0.006, headIdx, 1);
  const vRightTop = pushVertex(skinBuilder, -0.009, nMidY + 0.004, zBack + 0.006, headIdx, 1);

  pushTri(skinBuilder, vTop, vLeftTop, vBridge);
  pushTri(skinBuilder, vTop, vBridge, vRightTop);
  pushTri(skinBuilder, vBridge, vLeftTop, vLeft);
  pushTri(skinBuilder, vBridge, vLeft, vTip);
  pushTri(skinBuilder, vBridge, vTip, vRight);
  pushTri(skinBuilder, vBridge, vRight, vRightTop);
  pushTri(skinBuilder, vTip, vLeft, vSeptum);
  pushTri(skinBuilder, vTip, vSeptum, vRight);

  // 2. Subtle Ears on left/right sides of head (when hair doesn't drape over ears)
  if (style.addEars) {
    const earY = eyeY - 0.014;
    const earZ = headCenter.z + 0.012;
    appendEllipsoid(skinBuilder, headHalfW - 0.002, earY, earZ, 0.012, 0.025, 0.014, 6, 4, headIdx);
    appendEllipsoid(skinBuilder, -(headHalfW - 0.002), earY, earZ, 0.012, 0.025, 0.014, 6, 4, headIdx);
  }

  // 3. Soft White Eye Sclera neatly framing the dark irises (slightly behind iris front)
  const scleraZ = eyeZCenter - 0.005;
  appendEllipsoid(eyeWhiteBuilder, eyeXAbs, eyeY, scleraZ, 0.021, 0.0105, 0.008, 8, 5, headIdx);
  appendEllipsoid(eyeWhiteBuilder, -eyeXAbs, eyeY, scleraZ, 0.021, 0.0105, 0.008, 8, 5, headIdx);

  // 4. Subtle Natural Mouth / Lips (gentle neutral/warm arc curving slightly up at corners)
  if (style.addMouth) {
    const mouthY = eyeY - 0.068;
    const mouthZ = faceZAtY(mouthY) + 0.001;
    const startIdx = mouthBuilder.positions.length / 3;
    appendEllipsoid(mouthBuilder, 0, mouthY, mouthZ, 0.022, 0.0052, 0.0065, 8, 5, headIdx);
    for (let vi = startIdx; vi < mouthBuilder.positions.length / 3; vi++) {
      const x = mouthBuilder.positions[vi * 3 + 0];
      const nx = x / 0.022;
      mouthBuilder.positions[vi * 3 + 1] += nx * nx * 0.0032; // gentle upward smile arc
      mouthBuilder.positions[vi * 3 + 2] -= nx * nx * 0.0030; // follows face curvature
    }
  }
}

/**
 * Appends a raw Idle-world triangle builder as a new Primitive (or merges vertices into an existing Primitive)
 * converting Idle-world positions back to bind pose via inverse skinning matrices.
 */
function appendBuilderPrimitive(
  doc: Document,
  mesh: Mesh,
  ctx: IdlePoseContext,
  builder: RawTriBuilder,
  mat: Material
): void {
  if (builder.indices.length === 0) return;

  const vCount = builder.positions.length / 3;
  const bindPos = new Float32Array(vCount * 3);
  const jArr = new Uint16Array(vCount * 4);
  const wArr = new Float32Array(vCount * 4);

  const pIdle = new THREE.Vector3();
  const blendedM = new THREE.Matrix4();
  const invM = new THREE.Matrix4();
  const me = new Float32Array(16);

  for (let i = 0; i < vCount; i++) {
    pIdle.set(builder.positions[i * 3], builder.positions[i * 3 + 1], builder.positions[i * 3 + 2]);
    const j0 = builder.joints[i * 4];
    const j1 = builder.joints[i * 4 + 1];
    const w0 = builder.weights[i * 4];
    const w1 = builder.weights[i * 4 + 1];

    if (w1 > 1e-4) {
      const m0 = ctx.skinMats[j0].elements;
      const m1 = ctx.skinMats[j1].elements;
      for (let k = 0; k < 16; k++) me[k] = m0[k] * w0 + m1[k] * w1;
      blendedM.fromArray(me);
      invM.copy(blendedM).invert();
      pIdle.applyMatrix4(invM);
    } else {
      pIdle.applyMatrix4(ctx.invSkinMats[j0]);
    }

    bindPos[i * 3 + 0] = pIdle.x;
    bindPos[i * 3 + 1] = pIdle.y;
    bindPos[i * 3 + 2] = pIdle.z;

    jArr[i * 4 + 0] = j0;
    jArr[i * 4 + 1] = j1;
    wArr[i * 4 + 0] = w0;
    wArr[i * 4 + 1] = w1;
  }

  // Compute smooth normals directly on the new primitive in bind pose
  const normals = computeSmoothNormalsForBuffers(bindPos, builder.indices, Math.cos((65 * Math.PI) / 180));
  const uvs = computeContinuousUvs(builder.positions); // use clean Idle-world coords for UVs

  const buf = doc.getRoot().listBuffers()[0];
  const prim = doc
    .createPrimitive()
    .setMaterial(mat)
    .setAttribute('POSITION', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(bindPos).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(normals).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType(Accessor.Type.VEC2).setArray(uvs).setBuffer(buf))
    .setAttribute('JOINTS_0', doc.createAccessor().setType(Accessor.Type.VEC4).setArray(jArr).setBuffer(buf))
    .setAttribute('WEIGHTS_0', doc.createAccessor().setType(Accessor.Type.VEC4).setArray(wArr).setBuffer(buf))
    .setIndices(
      doc
        .createAccessor()
        .setType(Accessor.Type.SCALAR)
        .setArray(new Uint16Array(builder.indices))
        .setBuffer(buf)
    );

  mesh.addPrimitive(prim);
}

function computeSmoothNormalsForBuffers(
  positions: Float32Array | number[],
  indices: Uint16Array | Uint32Array | number[],
  cosThreshold: number
): Float32Array {
  const vCount = positions.length / 3;
  const outNorm = new Float32Array(vCount * 3);

  // Build spatial hash map so unshared/split vertices at identical locations smooth together
  const posKey = (i: number) =>
    `${Math.round(positions[i * 3] * 8000)},${Math.round(positions[i * 3 + 1] * 8000)},${Math.round(positions[i * 3 + 2] * 8000)}`;

  const vertFaceNormals: THREE.Vector3[] = new Array(vCount);
  const spatialGroups = new Map<string, number[]>();

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const fn = new THREE.Vector3();

  for (let i = 0; i < vCount; i++) {
    const k = posKey(i);
    let grp = spatialGroups.get(k);
    if (!grp) {
      grp = [];
      spatialGroups.set(k, grp);
    }
    grp.push(i);
  }

  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t];
    const i1 = indices[t + 1];
    const i2 = indices[t + 2];
    a.set(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
    b.set(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
    c.set(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    fn.crossVectors(ab, ac); // area-weighted (2x area magnitude)
    const lenSq = fn.lengthSq();
    if (lenSq < 1e-14) continue;
    for (const idx of [i0, i1, i2]) {
      if (!vertFaceNormals[idx]) vertFaceNormals[idx] = fn.clone();
      else vertFaceNormals[idx].add(fn);
    }
  }

  // Normalized self-normals for crease angle comparison
  const selfDir: THREE.Vector3[] = new Array(vCount);
  for (let i = 0; i < vCount; i++) {
    const v = vertFaceNormals[i];
    if (v && v.lengthSq() > 1e-14) selfDir[i] = v.clone().normalize();
    else selfDir[i] = new THREE.Vector3(0, 1, 0);
  }

  const acc = new THREE.Vector3();
  for (let i = 0; i < vCount; i++) {
    const grp = spatialGroups.get(posKey(i))!;
    const sd = selfDir[i];
    acc.set(0, 0, 0);
    for (const other of grp) {
      const ov = vertFaceNormals[other];
      if (!ov) continue;
      if (sd.dot(selfDir[other]) >= cosThreshold) {
        acc.add(ov);
      }
    }
    if (acc.lengthSq() > 1e-12) acc.normalize();
    else acc.copy(sd);
    outNorm[i * 3 + 0] = acc.x;
    outNorm[i * 3 + 1] = acc.y;
    outNorm[i * 3 + 2] = acc.z;
  }

  return outNorm;
}

function computeContinuousUvs(idlePositions: Float32Array | number[]): Float32Array {
  const vCount = idlePositions.length / 3;
  const uvs = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    const x = idlePositions[i * 3 + 0];
    const y = idlePositions[i * 3 + 1];
    const z = idlePositions[i * 3 + 2];
    // Seamless continuous projection (zero UV wrap discontinuity, uniform tile density across body)
    uvs[i * 2 + 0] = (x * 1.15 + z * 0.85) * 2.2 + 0.5;
    uvs[i * 2 + 1] = y * 2.2;
  }
  return uvs;
}

/**
 * Stage B/C/D:
 * - Sculpts neck collar, jawline/chin, ankle tuck, eye & brow proportions in Idle-world space
 * - Converts lower dress-pant ankles to dark socks on formal/medical models
 * - Appends sculpted 3D shoes + soles + nose + ears + mouth + eye sclera
 * - Recomputes angle-weighted smooth normals and seamless TEXCOORD_0 UVs
 */
function upgradeRealismDetails(doc: Document, fileName: string, style: ModelVisualStyle): void {
  const root = doc.getRoot();
  const ctx = buildIdlePoseContext(doc);
  if (!ctx) return;

  const mesh = root.listMeshes()[0];
  if (!mesh) return;

  const neckPos = ctx.jointWorldIdle.get('Neck')!;
  const headPos = ctx.jointWorldIdle.get('Head')!;
  const footLPos = ctx.jointWorldIdle.get('Foot.L')!;
  const footRPos = ctx.jointWorldIdle.get('Foot.R')!;
  const lowerLegLPos = ctx.jointWorldIdle.get('LowerLeg.L')!;

  // Inspect existing Idle-world Skin:Head and Face bounds for exact facial placement
  const prims = mesh.listPrimitives();
  const skinPrim = prims.find((p) => p.getMaterial()?.getName() === 'Skin');
  const facePrim = prims.find((p) => p.getMaterial()?.getName() === 'Face');
  if (!skinPrim) return;

  const evalIdleVerts = (prim: Primitive): THREE.Vector3[] => {
    const pos = prim.getAttribute('POSITION')!;
    const j0 = prim.getAttribute('JOINTS_0')!;
    const w0 = prim.getAttribute('WEIGHTS_0')!;
    const out: THREE.Vector3[] = new Array(pos.getCount());
    const pa = [0, 0, 0];
    const ja = [0, 0, 0, 0];
    const wa = [0, 0, 0, 0];
    const pv = new THREE.Vector3();
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, pa);
      j0.getElement(i, ja);
      w0.getElement(i, wa);
      const sum = new THREE.Vector3();
      for (let k = 0; k < 4; k++) {
        if (wa[k] > 1e-4) {
          pv.set(pa[0], pa[1], pa[2]).applyMatrix4(ctx.skinMats[ja[k]]).multiplyScalar(wa[k]);
          sum.add(pv);
        }
      }
      out[i] = sum;
    }
    return out;
  };

  // Measure Head bounds & Eye bounds in Idle-world
  const headIdx = ctx.jointIndexByName.get('Head')!;
  const skinIdle = evalIdleVerts(skinPrim);
  const skinJ0 = skinPrim.getAttribute('JOINTS_0')!;
  const skinW0 = skinPrim.getAttribute('WEIGHTS_0')!;

  const headMin = new THREE.Vector3(1e9, 1e9, 1e9);
  const headMax = new THREE.Vector3(-1e9, -1e9, -1e9);
  for (let i = 0; i < skinIdle.length; i++) {
    const ja = skinJ0.getElement(i, [0, 0, 0, 0]);
    const wa = skinW0.getElement(i, [0, 0, 0, 0]);
    const isHead = [0, 1, 2, 3].some((k) => ja[k] === headIdx && wa[k] > 0.5);
    if (isHead) {
      headMin.min(skinIdle[i]);
      headMax.max(skinIdle[i]);
    }
  }
  const headCenter = new THREE.Vector3().addVectors(headMin, headMax).multiplyScalar(0.5);
  const headHalfW = (headMax.x - headMin.x) * 0.5;
  const faceFrontZ = headMax.z;

  // Measure floorY from actual lowest Foot vertex
  let floorY = 1e9;
  for (const v of skinIdle) floorY = Math.min(floorY, v.y);
  floorY = Math.max(-0.02, floorY);

  // Measure Eye & Brow cluster centroids on Face primitive
  let eyeY = headCenter.y + 0.01;
  let eyeXAbs = 0.068;
  let eyeZCenter = faceFrontZ - 0.006;
  if (facePrim) {
    const faceIdle = evalIdleVerts(facePrim);
    const faceIdx = facePrim.getIndices()!.getArray()!;
    const adj: Set<number>[] = Array.from({ length: faceIdle.length }, () => new Set<number>());
    const keyMap = new Map<string, number[]>();
    faceIdle.forEach((v, idx) => {
      const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      let arr = keyMap.get(k);
      if (!arr) {
        arr = [];
        keyMap.set(k, arr);
      }
      arr.push(idx);
    });
    for (let t = 0; t < faceIdx.length; t += 3) {
      const a = faceIdx[t], b = faceIdx[t + 1], c = faceIdx[t + 2];
      adj[a].add(b).add(c);
      adj[b].add(a).add(c);
      adj[c].add(a).add(b);
    }
    for (const grp of keyMap.values()) {
      for (let g = 1; g < grp.length; g++) {
        adj[grp[0]].add(grp[g]);
        adj[grp[g]].add(grp[0]);
      }
    }

    const vis = new Uint8Array(faceIdle.length);
    const clusters: { verts: number[]; cx: number; cy: number; cz: number }[] = [];
    for (let i = 0; i < faceIdle.length; i++) {
      if (vis[i]) continue;
      const q = [i];
      vis[i] = 1;
      const verts: number[] = [];
      let sx = 0, sy = 0, sz = 0;
      while (q.length) {
        const u = q.pop()!;
        verts.push(u);
        sx += faceIdle[u].x;
        sy += faceIdle[u].y;
        sz += faceIdle[u].z;
        for (const w of adj[u]) {
          if (!vis[w]) {
            vis[w] = 1;
            q.push(w);
          }
        }
      }
      clusters.push({ verts, cx: sx / verts.length, cy: sy / verts.length, cz: sz / verts.length });
    }

    // Sort clusters by cy ascending: bottom 2 are eyes, top 2 are brows
    clusters.sort((a, b) => a.cy - b.cy);
    if (clusters.length >= 4) {
      const eyes = clusters.slice(0, 2);
      const brows = clusters.slice(2, 4);
      eyeY = (eyes[0].cy + eyes[1].cy) * 0.5 + 0.004;
      eyeXAbs = (Math.abs(eyes[0].cx) + Math.abs(eyes[1].cx)) * 0.5;
      eyeZCenter = (eyes[0].cz + eyes[1].cz) * 0.5 + 0.004;

      // Reshape Eyes: balanced calm dark iris (wider & taller than pinprick, sits cleanly in front of sclera)
      for (const cl of eyes) {
        for (const vi of cl.verts) {
          const p = faceIdle[vi];
          p.x = cl.cx + (p.x - cl.cx) * 1.10;
          p.y = cl.cy + 0.004 + (p.y - cl.cy) * 0.52;
          p.z = cl.cz + (p.z - cl.cz) * 0.90 + 0.004;
        }
      }
      // Reshape Eyebrows: thinner, subtly arched brow line closer to eyes
      for (const cl of brows) {
        let halfW = 0.01;
        for (const vi of cl.verts) halfW = Math.max(halfW, Math.abs(faceIdle[vi].x - cl.cx));
        for (const vi of cl.verts) {
          const p = faceIdle[vi];
          const nx = Math.min(1, Math.abs(p.x - cl.cx) / halfW);
          const arch = (0.45 - nx * nx) * 0.005;
          p.x = cl.cx + (p.x - cl.cx) * 0.90;
          p.y = cl.cy - 0.015 + arch + (p.y - cl.cy) * 0.44;
          p.z = cl.cz + (p.z - cl.cz) * 0.85;
        }
      }

      const fPos = facePrim.getAttribute('POSITION')!;
      const fj0 = facePrim.getAttribute('JOINTS_0')!;
      const fw0 = facePrim.getAttribute('WEIGHTS_0')!;
      const newFaceBind = new Float32Array(faceIdle.length * 3);
      const tmpV = new THREE.Vector3();
      const invMat = new THREE.Matrix4();
      for (let i = 0; i < faceIdle.length; i++) {
        const ja = fj0.getElement(i, [0, 0, 0, 0]);
        const wa = fw0.getElement(i, [0, 0, 0, 0]);
        let bestK = 0;
        for (let k = 1; k < 4; k++) if (wa[k] > wa[bestK]) bestK = k;
        invMat.copy(ctx.invSkinMats[ja[bestK]]);
        tmpV.copy(faceIdle[i]).applyMatrix4(invMat);
        newFaceBind[i * 3 + 0] = tmpV.x;
        newFaceBind[i * 3 + 1] = tmpV.y;
        newFaceBind[i * 3 + 2] = tmpV.z;
      }
      fPos.setArray(newFaceBind);
    }
  }

  // Measure actual Idle-world ankle centroids (y in [floorY + 0.02, floorY + 0.11]) so shoes align 100% around the shins
  let lSumX = 0, lSumZ = 0, lCnt = 0;
  let rSumX = 0, rSumZ = 0, rCnt = 0;
  for (const p of skinIdle) {
    if (p.y >= floorY + 0.02 && p.y <= floorY + 0.11) {
      if (p.x > 0) { lSumX += p.x; lSumZ += p.z; lCnt++; }
      else { rSumX += p.x; rSumZ += p.z; rCnt++; }
    }
  }
  const ankleCenters = {
    left: { x: lCnt > 0 ? lSumX / lCnt : footLPos.x, z: lCnt > 0 ? lSumZ / lCnt : footLPos.z },
    right: { x: rCnt > 0 ? rSumX / rCnt : footRPos.x, z: rCnt > 0 ? rSumZ / rCnt : footRPos.z },
  };

  // Sculpt all existing primitives in Idle-world (collar taper, jawline/chin contour, calf/foot tuck)
  const footLIdx = ctx.jointIndexByName.get('Foot.L');
  const footRIdx = ctx.jointIndexByName.get('Foot.R');
  const lowerLegLIdx = ctx.jointIndexByName.get('LowerLeg.L');
  const lowerLegRIdx = ctx.jointIndexByName.get('LowerLeg.R');

  const sockTriIndices: number[] = [];
  const keepSkinTriIndices: number[] = [];
  let sculptedHeadVerts: THREE.Vector3[] = [];

  for (const prim of prims) {
    const matName = prim.getMaterial()?.getName() || '';
    const posAcc = prim.getAttribute('POSITION')!;
    const j0Acc = prim.getAttribute('JOINTS_0')!;
    const w0Acc = prim.getAttribute('WEIGHTS_0')!;
    if (!posAcc || !j0Acc || !w0Acc) continue;

    const idleVerts = evalIdleVerts(prim);
    const ja = [0, 0, 0, 0];
    const wa = [0, 0, 0, 0];

    if (matName !== 'Face') {
      for (let i = 0; i < idleVerts.length; i++) {
        const p = idleVerts[i];
        j0Acc.getElement(i, ja);
        w0Acc.getElement(i, wa);

        let bestK = 0;
        for (let k = 1; k < 4; k++) if (wa[k] > wa[bestK]) bestK = k;
        const domJ = ctx.jointNames[ja[bestK]];

        // 1. Neck & Shirt Collar Seal: taper only wide lower collar funnel cleanly onto neck base
        if (
          p.y >= neckPos.y - 0.11 &&
          p.y <= neckPos.y + 0.045 &&
          Math.abs(p.x) < 0.165 &&
          (domJ === 'Torso' || domJ === 'Neck')
        ) {
          const tCol = Math.exp(-Math.pow((p.y - (neckPos.y - 0.03)) / 0.055, 2));
          p.x *= 1.0 - 0.25 * tCol;
          p.z = neckPos.z + (p.z - neckPos.z) * (1.0 - 0.18 * tCol);
        }

        // 2. Jawline & Chin Contour on Skin:Head
        if (matName === 'Skin' && domJ === 'Head' && p.y < eyeY - 0.005) {
          const tJaw = Math.min(1, Math.max(0, (eyeY - p.y) / Math.max(0.06, eyeY - headMin.y)));
          p.x *= 1.0 - 0.17 * tJaw;
          if (p.z > headCenter.z + 0.02) {
            const centerBell = Math.max(0, 1.0 - Math.abs(p.x) / 0.09);
            p.z += 0.010 * centerBell * Math.sin(tJaw * Math.PI);
          }
          if (p.y < headPos.y + 0.025) {
            p.y += 0.008 * tJaw;
          }
        }

        if (matName === 'Skin' && domJ === 'Head') {
          sculptedHeadVerts.push(p);
        }

        // 3. Subtle Calf Shaping + Clean Ankle/Foot Tuck inside shoes
        if (matName === 'Skin' && (domJ === 'LowerLeg.L' || domJ === 'LowerLeg.R' || domJ === 'Foot.L' || domJ === 'Foot.R')) {
          const isLeft = domJ.endsWith('.L');
          const legX = isLeft ? ankleCenters.left.x : ankleCenters.right.x;
          const legZ = isLeft ? ankleCenters.left.z : ankleCenters.right.z;
          const shinLen = Math.max(0.25, lowerLegLPos.y - floorY);
          const hFrac = Math.min(1, Math.max(0, (p.y - floorY) / shinLen));

          if (hFrac > 0.16 && hFrac < 0.92) {
            const calfBell = Math.exp(-Math.pow((hFrac - 0.68) / 0.22, 2));
            const ankleSlim = hFrac < 0.30 ? (0.30 - hFrac) * 0.45 : 0;
            const scaleR = 1.0 + 0.06 * calfBell - ankleSlim;
            p.x = legX + (p.x - legX) * scaleR;
            p.z = legZ + (p.z - legZ) * scaleR;
          }

          // Tuck ankle & bare foot peg firmly inside the shoe interior (y < floorY + 0.098)
          if (p.y < floorY + 0.098 || domJ === 'Foot.L' || domJ === 'Foot.R') {
            const tAnk = Math.min(1, Math.max(0, (floorY + 0.098 - p.y) / 0.040));
            const radScale = 1.0 - 0.56 * tAnk;
            p.x = legX + (p.x - legX) * radScale;
            p.z = legZ + (p.z - legZ) * radScale;
            p.y = Math.max(floorY + 0.024, p.y);
          }
        }
      }

      // Write sculpted Idle-world positions back to bind pose
      const newBindPos = new Float32Array(idleVerts.length * 3);
      const pv = new THREE.Vector3();
      const me = new Float32Array(16);
      const bm = new THREE.Matrix4();
      const invBm = new THREE.Matrix4();
      for (let i = 0; i < idleVerts.length; i++) {
        j0Acc.getElement(i, ja);
        w0Acc.getElement(i, wa);
        me.fill(0);
        let wSum = 0;
        for (let k = 0; k < 4; k++) {
          if (wa[k] > 1e-4) {
            wSum += wa[k];
            const sm = ctx.skinMats[ja[k]].elements;
            for (let m = 0; m < 16; m++) me[m] += sm[m] * wa[k];
          }
        }
        if (wSum > 1e-4) {
          for (let m = 0; m < 16; m++) me[m] /= wSum;
        }
        bm.fromArray(me);
        invBm.copy(bm).invert();
        pv.copy(idleVerts[i]).applyMatrix4(invBm);
        newBindPos[i * 3 + 0] = pv.x;
        newBindPos[i * 3 + 1] = pv.y;
        newBindPos[i * 3 + 2] = pv.z;
      }
      posAcc.setArray(newBindPos);

      // Split lower-ankle Skin triangles into dark Sock material on formal/medical models
      if (matName === 'Skin' && style.sockHex !== null) {
        const idxAcc = prim.getIndices();
        if (idxAcc) {
          const idxArr = idxAcc.getArray()!;
          for (let t = 0; t < idxArr.length; t += 3) {
            const a = idxArr[t], b = idxArr[t + 1], c = idxArr[t + 2];
            const avgY = (idleVerts[a].y + idleVerts[b].y + idleVerts[c].y) / 3;
            j0Acc.getElement(a, ja);
            w0Acc.getElement(a, wa);
            const onLeg = [0, 1, 2, 3].some(
              (k) =>
                wa[k] > 0.4 &&
                (ja[k] === footLIdx || ja[k] === footRIdx || ja[k] === lowerLegLIdx || ja[k] === lowerLegRIdx)
            );
            if (onLeg && avgY < floorY + 0.19) {
              sockTriIndices.push(a, b, c);
            } else {
              keepSkinTriIndices.push(a, b, c);
            }
          }
        }
      }
    }

    // Recompute smooth vertex normals (softer threshold on Skin/Clothes, crisper on Hat/Details/Hair)
    const idxAcc = prim.getIndices();
    const bindPosArr = posAcc.getArray() as Float32Array;
    if (idxAcc && bindPosArr) {
      const hardGroup =
        matName === 'Hat' ||
        matName === 'Belt' ||
        matName === 'Details' ||
        matName === 'Detail' ||
        matName === 'Vest' ||
        matName === 'Hair' ||
        matName === 'Face';
      const cosThresh = hardGroup ? Math.cos((48 * Math.PI) / 180) : Math.cos((72 * Math.PI) / 180);
      const smoothN = computeSmoothNormalsForBuffers(bindPosArr, idxAcc.getArray()!, cosThresh);
      const normAcc = prim.getAttribute('NORMAL');
      if (normAcc) normAcc.setArray(smoothN);
      else prim.setAttribute('NORMAL', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(smoothN).setBuffer(posAcc.getBuffer()));
    }

    // Add seamless TEXCOORD_0 UVs from Idle-world coordinates
    const uvs = computeContinuousUvs(idleVerts.flatMap((v) => [v.x, v.y, v.z]));
    const existingUv = prim.getAttribute('TEXCOORD_0');
    if (existingUv) existingUv.setArray(uvs);
    else prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType(Accessor.Type.VEC2).setArray(uvs).setBuffer(posAcc.getBuffer()));
  }

  // Extract Sock primitive from Skin if formal/medical model
  if (style.sockHex !== null && sockTriIndices.length > 0 && keepSkinTriIndices.length > 0) {
    const skinIdxAcc = skinPrim.getIndices()!;
    const buf = skinIdxAcc.getBuffer();
    skinIdxAcc.setArray(new Uint16Array(keepSkinTriIndices));

    const sockMat = getOrCreateMaterial(doc, 'Sock', style.sockHex, 0.88, 0.01);
    const sockPrim = doc
      .createPrimitive()
      .setMaterial(sockMat)
      .setAttribute('POSITION', skinPrim.getAttribute('POSITION')!)
      .setAttribute('NORMAL', skinPrim.getAttribute('NORMAL')!)
      .setAttribute('TEXCOORD_0', skinPrim.getAttribute('TEXCOORD_0')!)
      .setAttribute('JOINTS_0', skinPrim.getAttribute('JOINTS_0')!)
      .setAttribute('WEIGHTS_0', skinPrim.getAttribute('WEIGHTS_0')!)
      .setIndices(doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(new Uint16Array(sockTriIndices)).setBuffer(buf));
    mesh.addPrimitive(sockPrim);
  }

  // Tune Skin & Face & Shirt & Pants materials subtly for richer lifelike tone
  const skinMat = doc.getRoot().listMaterials().find((m) => m.getName() === 'Skin');
  if (skinMat) {
    skinMat.setBaseColorFactor(hexToLinearRgba(style.skinHex));
    skinMat.setRoughnessFactor(0.66);
    skinMat.setMetallicFactor(0.01);
  }
  const faceMat = doc.getRoot().listMaterials().find((m) => m.getName() === 'Face');
  if (faceMat) {
    faceMat.setBaseColorFactor(hexToLinearRgba(0x1e1916));
    faceMat.setRoughnessFactor(0.45);
  }

  // Stage C: Build Sculpted 3D Shoes + Outsoles + Facial Nose/Ears/Mouth/Sclera
  const faceZAtY = (yTarget: number): number => {
    let bestZ = faceFrontZ;
    let found = false;
    for (const v of sculptedHeadVerts) {
      if (Math.abs(v.x) < 0.045 && Math.abs(v.y - yTarget) < 0.028 && v.z > headCenter.z) {
        if (!found || v.z > bestZ) {
          bestZ = v.z;
          found = true;
        }
      }
    }
    return bestZ;
  };

  const shoeUpperBuilder = createBuilder();
  const shoeSoleBuilder = createBuilder();
  buildShoePair(ctx, style.shoeStyle, shoeUpperBuilder, shoeSoleBuilder, floorY, ankleCenters);

  const extraSkinBuilder = createBuilder();
  const eyeWhiteBuilder = createBuilder();
  const mouthBuilder = createBuilder();
  buildFacialDetails(
    ctx,
    style,
    headCenter,
    faceZAtY,
    eyeY,
    eyeXAbs,
    eyeZCenter,
    headHalfW,
    extraSkinBuilder,
    eyeWhiteBuilder,
    mouthBuilder
  );

  const shoesMat = getOrCreateMaterial(doc, 'Shoes', style.shoeHex, style.shoeStyle === 'dress' ? 0.44 : 0.62, 0.03);
  const soleMat = getOrCreateMaterial(doc, 'ShoeSole', style.soleHex, 0.80, 0.01);
  const eyeWhiteMat = getOrCreateMaterial(doc, 'EyeWhite', 0xf1f5f9, 0.48, 0.01);
  const mouthMat = getOrCreateMaterial(doc, 'Mouth', 0xc67c6f, 0.68, 0.01);

  appendBuilderPrimitive(doc, mesh, ctx, shoeUpperBuilder, shoesMat);
  appendBuilderPrimitive(doc, mesh, ctx, shoeSoleBuilder, soleMat);
  appendBuilderPrimitive(doc, mesh, ctx, extraSkinBuilder, skinMat!);
  appendBuilderPrimitive(doc, mesh, ctx, eyeWhiteBuilder, eyeWhiteMat);
  appendBuilderPrimitive(doc, mesh, ctx, mouthBuilder, mouthMat);
}

async function run() {
  const fromV1 = process.argv.includes('--from-v1');
  const force = process.argv.includes('--force');
  const targetDir = path.resolve(process.cwd(), 'public/models/quaternius');
  const sourceDir = fromV1 && fs.existsSync('/tmp/quaternius_v1') ? '/tmp/quaternius_v1' : targetDir;

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.glb')).sort();

  for (const file of files) {
    const inPath = path.join(sourceDir, file);
    const outPath = path.join(targetDir, file);
    const doc = await io.read(inPath);
    const asset = doc.getRoot().getAsset();
    const extras = (asset.extras ?? {}) as Record<string, unknown>;

    if (extras.humanRealismV2 && !fromV1 && !force) {
      console.log(`${file.padEnd(24)} | already upgraded to V2 (skipping)`);
      continue;
    }

    const isFemale = file.toLowerCase().includes('female');
    const profile = isFemale ? V2_ANATOMY_FEMALE : V2_ANATOMY_MALE;
    const style = MODEL_STYLES[file] ?? MODEL_STYLES['Casual_Male.glb'];

    reshapeDocument(doc, profile);
    upgradeRealismDetails(doc, file, style);

    asset.extras = { ...extras, humanProportionV1: true, humanRealismV2: true };

    await doc.transform(prune(), quantize(), dedup(), prune());

    const outBytes = await io.writeBinary(doc);
    fs.writeFileSync(outPath, outBytes);

    let tris = 0;
    for (const m of doc.getRoot().listMeshes()) {
      for (const p of m.listPrimitives()) {
        tris += Math.round((p.getIndices()?.getCount() || 0) / 3);
      }
    }
    console.log(
      `${file.padEnd(24)} | V2 realism (${isFemale ? 'F' : 'M'}, ${style.shoeStyle}) -> ${(outBytes.byteLength / 1024).toFixed(0)} KB, ${tris} tris`
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
