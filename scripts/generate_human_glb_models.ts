import * as fs from 'node:fs';
import * as path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

if (typeof globalThis.FileReader === 'undefined') {
  (globalThis as Record<string, unknown>).FileReader = class NodeFileReader {
    result: ArrayBuffer | string | null = null;
    onloadend: (() => void) | null = null;
    onload: (() => void) | null = null;
    onerror: ((err: unknown) => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onload?.();
          this.onloadend?.();
        })
        .catch((e) => this.onerror?.(e));
    }
    readAsDataURL(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          const b64 = Buffer.from(buf).toString('base64');
          this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
          this.onload?.();
          this.onloadend?.();
        })
        .catch((e) => this.onerror?.(e));
    }
  };
}

export type HumanArchetypeId =
  | 'student_male'
  | 'student_female'
  | 'teacher_aodai'
  | 'staff_casual'
  | 'guard_officer'
  | 'doctor_coat';

const BONE_NAMES = [
  'Hips', // 0
  'Spine', // 1
  'Spine1', // 2
  'Neck', // 3
  'Head', // 4
  'LeftShoulder', // 5
  'LeftArm', // 6
  'LeftForeArm', // 7
  'LeftHand', // 8
  'RightShoulder', // 9
  'RightArm', // 10
  'RightForeArm', // 11
  'RightHand', // 12
  'LeftUpLeg', // 13
  'LeftLeg', // 14
  'LeftFoot', // 15
  'RightUpLeg', // 16
  'RightLeg', // 17
  'RightFoot', // 18
] as const;

type BoneName = (typeof BONE_NAMES)[number];
const BONE_INDEX: Record<BoneName, number> = Object.fromEntries(BONE_NAMES.map((n, i) => [n, i])) as Record<BoneName, number>;

type SlotName = 'skin_mesh' | 'hair_mesh' | 'shirt_mesh' | 'pants_mesh' | 'shoes_mesh' | 'accent_mesh' | 'eyes_mesh';

function createHumanoidSkeleton(): { rootBone: THREE.Bone; bones: THREE.Bone[]; skeleton: THREE.Skeleton } {
  const b: Record<BoneName, THREE.Bone> = {} as Record<BoneName, THREE.Bone>;
  for (const name of BONE_NAMES) {
    const bone = new THREE.Bone();
    bone.name = name;
    b[name] = bone;
  }

  // Ground at Y = 0.00; Hips at Y = 0.88; Top of Head ~ 1.72
  b.Hips.position.set(0, 0.88, 0);
  b.Spine.position.set(0, 0.14, 0);
  b.Spine1.position.set(0, 0.22, 0);
  b.Neck.position.set(0, 0.20, 0);
  b.Head.position.set(0, 0.14, 0);

  b.Hips.add(b.Spine);
  b.Spine.add(b.Spine1);
  b.Spine1.add(b.Neck);
  b.Neck.add(b.Head);

  // Arms hanging from upper spine (world Y ~ 1.38)
  b.LeftShoulder.position.set(-0.14, 0.14, 0);
  b.LeftArm.position.set(-0.08, -0.02, 0);
  b.LeftForeArm.position.set(0, -0.26, 0);
  b.LeftHand.position.set(0, -0.24, 0);
  b.Spine1.add(b.LeftShoulder);
  b.LeftShoulder.add(b.LeftArm);
  b.LeftArm.add(b.LeftForeArm);
  b.LeftForeArm.add(b.LeftHand);

  b.RightShoulder.position.set(0.14, 0.14, 0);
  b.RightArm.position.set(0.08, -0.02, 0);
  b.RightForeArm.position.set(0, -0.26, 0);
  b.RightHand.position.set(0, -0.24, 0);
  b.Spine1.add(b.RightShoulder);
  b.RightShoulder.add(b.RightArm);
  b.RightArm.add(b.RightForeArm);
  b.RightForeArm.add(b.RightHand);

  // Legs descending from Hips (world Y = 0.86 -> Knee 0.46 -> Ankle 0.08 -> Sole 0.00)
  b.LeftUpLeg.position.set(-0.095, -0.02, 0);
  b.LeftLeg.position.set(0, -0.40, 0);
  b.LeftFoot.position.set(0, -0.38, 0);
  b.Hips.add(b.LeftUpLeg);
  b.LeftUpLeg.add(b.LeftLeg);
  b.LeftLeg.add(b.LeftFoot);

  b.RightUpLeg.position.set(0.095, -0.02, 0);
  b.RightLeg.position.set(0, -0.40, 0);
  b.RightFoot.position.set(0, -0.38, 0);
  b.Hips.add(b.RightUpLeg);
  b.RightUpLeg.add(b.RightLeg);
  b.RightLeg.add(b.RightFoot);

  const bones = BONE_NAMES.map((n) => b[n]);
  b.Hips.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();

  return { rootBone: b.Hips, bones, skeleton };
}

interface WeightedPart {
  geo: THREE.BufferGeometry;
  weights: Array<[BoneName, number]>;
}

function makeWeightedGeometry(
  rawGeo: THREE.BufferGeometry,
  weights: Array<[BoneName, number]>,
  matrix?: THREE.Matrix4
): THREE.BufferGeometry {
  const g = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
  if (matrix) g.applyMatrix4(matrix);
  g.computeVertexNormals();
  const count = g.attributes.position.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  let sum = 0;
  for (let j = 0; j < Math.min(4, weights.length); j++) sum += weights[j][1];
  const norm = sum > 0 ? 1 / sum : 1;

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 4; j++) {
      if (j < weights.length) {
        skinIndices[i * 4 + j] = BONE_INDEX[weights[j][0]];
        skinWeights[i * 4 + j] = weights[j][1] * norm;
      }
    }
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
  return g;
}

function xform(pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...scale));
  return m;
}

function buildArchetypeParts(id: HumanArchetypeId): Record<SlotName, WeightedPart[]> {
  const parts: Record<SlotName, WeightedPart[]> = {
    skin_mesh: [],
    hair_mesh: [],
    shirt_mesh: [],
    pants_mesh: [],
    shoes_mesh: [],
    accent_mesh: [],
    eyes_mesh: [],
  };
  const push = (
    slot: SlotName,
    geo: THREE.BufferGeometry,
    pos: [number, number, number],
    weights: Array<[BoneName, number]>,
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1]
  ) => {
    parts[slot].push({ geo: makeWeightedGeometry(geo, weights, xform(pos, rot, scale)), weights });
  };

  // --- Shared Head, Neck, Eyes & Sculpted Ears (centered around Head = [0, 1.58, 0]) ---
  push('skin_mesh', new THREE.CylinderGeometry(0.055, 0.068, 0.12, 8), [0, 1.47, 0], [['Neck', 0.7], ['Spine1', 0.3]]);
  // Sculpted slightly elongated low-poly head
  push('skin_mesh', new THREE.SphereGeometry(0.118, 12, 10), [0, 1.60, 0.005], [['Head', 1]], [0, 0, 0], [0.92, 1.06, 0.96]);
  // Subtle nose bridge + ears
  push('skin_mesh', new THREE.BoxGeometry(0.024, 0.036, 0.026), [0, 1.59, 0.114], [['Head', 1]]);
  push('skin_mesh', new THREE.BoxGeometry(0.022, 0.044, 0.026), [-0.11, 1.60, 0.0], [['Head', 1]]);
  push('skin_mesh', new THREE.BoxGeometry(0.022, 0.044, 0.026), [0.11, 1.60, 0.0], [['Head', 1]]);
  // Eyes & eyebrows facing +Z
  push('eyes_mesh', new THREE.BoxGeometry(0.026, 0.022, 0.012), [-0.04, 1.615, 0.106], [['Head', 1]]);
  push('eyes_mesh', new THREE.BoxGeometry(0.026, 0.022, 0.012), [0.04, 1.615, 0.106], [['Head', 1]]);
  push('eyes_mesh', new THREE.BoxGeometry(0.034, 0.009, 0.012), [-0.04, 1.642, 0.105], [['Head', 1]]);
  push('eyes_mesh', new THREE.BoxGeometry(0.034, 0.009, 0.012), [0.04, 1.642, 0.105], [['Head', 1]]);

  // --- Hair Style Variants ---
  if (id === 'student_female' || id === 'teacher_aodai') {
    // Sleek crown + side locks
    push('hair_mesh', new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), [0, 1.615, -0.005], [['Head', 1]], [0, 0, 0], [0.96, 1.04, 1.0]);
    push('hair_mesh', new THREE.BoxGeometry(0.22, 0.06, 0.08), [0, 1.66, 0.06], [['Head', 1]], [0.18, 0, 0]);
    if (id === 'student_female') {
      // Shoulder-length bob & back hair
      push('hair_mesh', new THREE.CylinderGeometry(0.115, 0.135, 0.24, 10, 1, false, Math.PI * 0.45, Math.PI * 1.1), [0, 1.50, -0.02], [['Head', 0.75], ['Neck', 0.25]]);
      push('accent_mesh', new THREE.TorusGeometry(0.116, 0.014, 6, 12, Math.PI * 1.15), [0, 1.65, 0.0], [['Head', 1]], [Math.PI * 0.42, 0, Math.PI * 0.5]);
    } else {
      // Elegant Teacher Chignon / Low Bun
      push('hair_mesh', new THREE.BoxGeometry(0.22, 0.15, 0.07), [0, 1.56, -0.095], [['Head', 1]]);
      push('hair_mesh', new THREE.SphereGeometry(0.065, 8, 6), [0, 1.54, -0.145], [['Head', 1]]);
      push('accent_mesh', new THREE.TorusGeometry(0.064, 0.012, 5, 10), [0, 1.54, -0.138], [['Head', 1]]);
    }
  } else if (id === 'guard_officer') {
    // Clean short trim + Peaked Service Cap!
    push('hair_mesh', new THREE.BoxGeometry(0.21, 0.08, 0.16), [0, 1.61, -0.04], [['Head', 1]]);
    push('accent_mesh', new THREE.CylinderGeometry(0.145, 0.125, 0.08, 12), [0, 1.70, -0.01], [['Head', 1]]);
    push('shoes_mesh', new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12, 1, false, -Math.PI * 0.4, Math.PI * 0.8), [0, 1.66, 0.06], [['Head', 1]], [0.18, 0, 0]);
    push('shirt_mesh', new THREE.BoxGeometry(0.04, 0.04, 0.015), [0, 1.70, 0.125], [['Head', 1]]); // Cap emblem
  } else {
    // Stylish modern layered top & bangs
    push('hair_mesh', new THREE.SphereGeometry(0.124, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), [0, 1.618, -0.008], [['Head', 1]], [0, 0, 0], [0.96, 1.05, 1.0]);
    push('hair_mesh', new THREE.BoxGeometry(0.21, 0.12, 0.07), [0, 1.58, -0.09], [['Head', 1]]);
    push('hair_mesh', new THREE.BoxGeometry(0.18, 0.055, 0.07), [0, 1.66, 0.065], [['Head', 1]], [0.22, 0, 0]);
  }

  // --- Torso / Pelvis Silhouette (Spine = 1.02, Spine1 = 1.24, Shoulders = 1.38) ---
  const shoulderHalf = id === 'student_female' || id === 'teacher_aodai' ? 0.165 : 0.185;
  const waistRadius = id === 'student_female' || id === 'teacher_aodai' ? 0.105 : 0.125;
  // Upper chest tapered cylinder
  push('shirt_mesh', new THREE.CylinderGeometry(shoulderHalf, waistRadius * 1.1, 0.25, 10), [0, 1.30, 0], [['Spine1', 0.85], ['Spine', 0.15]], [0, 0, 0], [1.0, 1.0, 0.65]);
  // Mid waist
  push('shirt_mesh', new THREE.CylinderGeometry(waistRadius * 1.08, waistRadius, 0.22, 10), [0, 1.07, 0], [['Spine', 0.75], ['Hips', 0.25]], [0, 0, 0], [1.0, 1.0, 0.68]);
  // Crisp Shirt Collar
  push('shirt_mesh', new THREE.CylinderGeometry(0.085, 0.095, 0.05, 10), [0, 1.43, 0.005], [['Spine1', 0.6], ['Neck', 0.4]]);

  // Pelvis / Hips
  push('pants_mesh', new THREE.CylinderGeometry(waistRadius * 1.04, waistRadius * 1.15, 0.16, 10), [0, 0.90, 0], [['Hips', 1]], [0, 0, 0], [1.02, 1.0, 0.72]);

  // Clothing Details by Archetype
  if (id === 'student_male') {
    // School tie + sleek backpack on Spine1
    push('accent_mesh', new THREE.BoxGeometry(0.042, 0.22, 0.02), [0, 1.28, 0.108], [['Spine1', 0.8], ['Spine', 0.2]]);
    push('accent_mesh', new THREE.BoxGeometry(0.24, 0.30, 0.12), [0, 1.24, -0.15], [['Spine1', 0.85], ['Spine', 0.15]]);
  } else if (id === 'student_female') {
    // Pleated School Skirt
    push('pants_mesh', new THREE.CylinderGeometry(0.125, 0.195, 0.32, 12), [0, 0.74, 0], [['Hips', 0.8], ['LeftUpLeg', 0.1], ['RightUpLeg', 0.1]], [0, 0, 0], [1.02, 1.0, 0.85]);
    // Sailor / School collar bow
    push('accent_mesh', new THREE.BoxGeometry(0.11, 0.045, 0.025), [0, 1.37, 0.105], [['Spine1', 1]]);
    push('accent_mesh', new THREE.BoxGeometry(0.22, 0.27, 0.10), [0, 1.23, -0.14], [['Spine1', 0.85], ['Spine', 0.15]]);
  } else if (id === 'teacher_aodai') {
    // Flowing Áo Dài front & back long flaps
    push('shirt_mesh', new THREE.BoxGeometry(0.24, 0.56, 0.03), [0, 0.62, 0.095], [['Hips', 0.7], ['LeftUpLeg', 0.15], ['RightUpLeg', 0.15]]);
    push('shirt_mesh', new THREE.BoxGeometry(0.24, 0.58, 0.03), [0, 0.61, -0.095], [['Hips', 0.7], ['LeftUpLeg', 0.15], ['RightUpLeg', 0.15]]);
    push('accent_mesh', new THREE.BoxGeometry(0.16, 0.045, 0.02), [0, 1.41, 0.05], [['Spine1', 0.8], ['Neck', 0.2]]);
  } else if (id === 'doctor_coat') {
    // White Medical Coat Skirts + Stethoscope loop + ID Badge
    push('shirt_mesh', new THREE.CylinderGeometry(0.14, 0.17, 0.42, 10), [0, 0.72, 0], [['Hips', 0.8], ['LeftUpLeg', 0.1], ['RightUpLeg', 0.1]], [0, 0, 0], [1.02, 1.0, 0.78]);
    push('accent_mesh', new THREE.TorusGeometry(0.095, 0.012, 6, 12, Math.PI * 1.2), [0, 1.39, 0.04], [['Spine1', 0.9], ['Neck', 0.1]], [Math.PI * 0.45, 0, -Math.PI * 0.1]);
    push('accent_mesh', new THREE.BoxGeometry(0.055, 0.075, 0.02), [0.08, 1.28, 0.112], [['Spine1', 1]]);
  } else if (id === 'guard_officer') {
    // Belt + Gold Buckle + Epaulets
    push('shoes_mesh', new THREE.CylinderGeometry(0.118, 0.118, 0.045, 10), [0, 0.97, 0], [['Hips', 0.5], ['Spine', 0.5]], [0, 0, 0], [1.02, 1.0, 0.72]);
    push('accent_mesh', new THREE.BoxGeometry(0.05, 0.045, 0.02), [0, 0.97, 0.092], [['Hips', 0.5], ['Spine', 0.5]]);
    push('accent_mesh', new THREE.BoxGeometry(0.09, 0.022, 0.05), [-0.15, 1.425, 0], [['LeftShoulder', 1]]);
    push('accent_mesh', new THREE.BoxGeometry(0.09, 0.022, 0.05), [0.15, 1.425, 0], [['RightShoulder', 1]]);
  } else {
    // Staff casual belt + chest pocket/collar accent
    push('accent_mesh', new THREE.BoxGeometry(0.24, 0.04, 0.15), [0, 0.97, 0], [['Hips', 0.5], ['Spine', 0.5]]);
    push('accent_mesh', new THREE.BoxGeometry(0.06, 0.07, 0.015), [-0.075, 1.30, 0.105], [['Spine1', 1]]);
  }

  // --- Articulated Arms (Upper Arm 1.36->1.10, Forearm 1.10->0.86, Hand 0.86->0.76) ---
  (['Left', 'Right'] as const).forEach((side) => {
    const sx = side === 'Left' ? -0.22 : 0.22;
    const armBone: BoneName = side === 'Left' ? 'LeftArm' : 'RightArm';
    const foreBone: BoneName = side === 'Left' ? 'LeftForeArm' : 'RightForeArm';
    const handBone: BoneName = side === 'Left' ? 'LeftHand' : 'RightHand';
    const shoulderBone: BoneName = side === 'Left' ? 'LeftShoulder' : 'RightShoulder';

    const longSleeve = id === 'teacher_aodai' || id === 'doctor_coat' || id === 'guard_officer';
    // Shoulder cap
    push('shirt_mesh', new THREE.SphereGeometry(0.056, 8, 6), [sx, 1.36, 0], [[shoulderBone, 0.4], [armBone, 0.6]]);
    // Upper arm sleeve
    push('shirt_mesh', new THREE.CylinderGeometry(0.050, 0.042, 0.24, 8), [sx, 1.24, 0], [[armBone, 0.85], [foreBone, 0.15]]);
    // Forearm (long sleeve or bare skin)
    push(longSleeve ? 'shirt_mesh' : 'skin_mesh', new THREE.CylinderGeometry(0.041, 0.033, 0.24, 8), [sx, 0.99, 0], [[foreBone, 0.9], [handBone, 0.1]]);
    // Sculpted Hand + thumb
    push('skin_mesh', new THREE.BoxGeometry(0.056, 0.092, 0.068), [sx, 0.83, 0.005], [[handBone, 1]]);
  });

  // --- Articulated Legs (Thigh 0.86->0.46, Shin 0.46->0.08, Foot/Shoe 0.08->0.00) ---
  (['Left', 'Right'] as const).forEach((side) => {
    const lx = side === 'Left' ? -0.095 : 0.095;
    const upLegBone: BoneName = side === 'Left' ? 'LeftUpLeg' : 'RightUpLeg';
    const legBone: BoneName = side === 'Left' ? 'LeftLeg' : 'RightLeg';
    const footBone: BoneName = side === 'Left' ? 'LeftFoot' : 'RightFoot';

    if (id === 'student_female') {
      // Bare upper knee/thigh + white knee socks below!
      push('skin_mesh', new THREE.CylinderGeometry(0.060, 0.048, 0.38, 8), [lx, 0.66, 0], [[upLegBone, 0.85], [legBone, 0.15]]);
      push('shirt_mesh', new THREE.CylinderGeometry(0.047, 0.039, 0.36, 8), [lx, 0.28, 0], [[legBone, 0.9], [footBone, 0.1]]);
    } else {
      const pantThick = id === 'teacher_aodai' ? 1.15 : 1.0;
      push('pants_mesh', new THREE.CylinderGeometry(0.068 * pantThick, 0.056 * pantThick, 0.40, 8), [lx, 0.66, 0], [[upLegBone, 0.85], [legBone, 0.15]]);
      push('pants_mesh', new THREE.CylinderGeometry(0.055 * pantThick, 0.046 * pantThick, 0.38, 8), [lx, 0.27, 0], [[legBone, 0.9], [footBone, 0.1]]);
    }

    // Tapered Low-Poly Sneaker / Dress Shoe resting cleanly on ground Y = 0.00
    push('shoes_mesh', new THREE.BoxGeometry(0.094, 0.075, 0.195), [lx, 0.038, 0.042], [[footBone, 1]]);
    push('shoes_mesh', new THREE.BoxGeometry(0.084, 0.042, 0.09), [lx, 0.082, -0.005], [[footBone, 1]]);
  });

  return parts;
}

function buildClips(): THREE.AnimationClip[] {
  const quatTrack = (bone: BoneName, times: number[], eulers: Array<[number, number, number]>) => {
    const vals: number[] = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (const [rx, ry, rz] of eulers) {
      e.set(rx, ry, rz);
      q.setFromEuler(e);
      vals.push(q.x, q.y, q.z, q.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, vals);
  };

  // 1. Idle (gentle breathing & micro-sway, 2.0s loop)
  const idleClip = new THREE.AnimationClip('Idle', 2.0, [
    quatTrack('Spine1', [0, 1.0, 2.0], [
      [0.01, 0, 0],
      [-0.025, 0, 0],
      [0.01, 0, 0],
    ]),
    quatTrack('LeftArm', [0, 1.0, 2.0], [
      [0.04, 0, 0.08],
      [-0.02, 0, 0.11],
      [0.04, 0, 0.08],
    ]),
    quatTrack('RightArm', [0, 1.0, 2.0], [
      [0.04, 0, -0.08],
      [-0.02, 0, -0.11],
      [0.04, 0, -0.08],
    ]),
    quatTrack('Head', [0, 1.0, 2.0], [
      [0.0, -0.05, 0],
      [0.02, 0.05, 0],
      [0.0, -0.05, 0],
    ]),
  ]);

  // 2. Walk (natural knee-bending, hip-bobbing, counter-arm swing, 1.0s loop)
  const wt = [0, 0.25, 0.5, 0.75, 1.0];
  const walkClip = new THREE.AnimationClip('Walk', 1.0, [
    new THREE.VectorKeyframeTrack('Hips.position', wt, [
      0, 0.87, 0,
      0, 0.90, 0,
      0, 0.87, 0,
      0, 0.90, 0,
      0, 0.87, 0,
    ]),
    quatTrack('LeftUpLeg', wt, [
      [-0.45, 0, 0],
      [0.0, 0, 0],
      [0.42, 0, 0],
      [0.05, 0, 0],
      [-0.45, 0, 0],
    ]),
    quatTrack('LeftLeg', wt, [
      [0.08, 0, 0],
      [0.12, 0, 0],
      [0.25, 0, 0],
      [0.68, 0, 0],
      [0.08, 0, 0],
    ]),
    quatTrack('RightUpLeg', wt, [
      [0.42, 0, 0],
      [0.05, 0, 0],
      [-0.45, 0, 0],
      [0.0, 0, 0],
      [0.42, 0, 0],
    ]),
    quatTrack('RightLeg', wt, [
      [0.25, 0, 0],
      [0.68, 0, 0],
      [0.08, 0, 0],
      [0.12, 0, 0],
      [0.25, 0, 0],
    ]),
    quatTrack('LeftArm', wt, [
      [0.38, 0, 0.06],
      [0.0, 0, 0.06],
      [-0.36, 0, 0.06],
      [0.0, 0, 0.06],
      [0.38, 0, 0.06],
    ]),
    quatTrack('LeftForeArm', wt, [
      [-0.18, 0, 0],
      [-0.25, 0, 0],
      [-0.42, 0, 0],
      [-0.22, 0, 0],
      [-0.18, 0, 0],
    ]),
    quatTrack('RightArm', wt, [
      [-0.36, 0, -0.06],
      [0.0, 0, -0.06],
      [0.38, 0, -0.06],
      [0.0, 0, -0.06],
      [-0.36, 0, -0.06],
    ]),
    quatTrack('RightForeArm', wt, [
      [-0.42, 0, 0],
      [-0.22, 0, 0],
      [-0.18, 0, 0],
      [-0.25, 0, 0],
      [-0.42, 0, 0],
    ]),
    quatTrack('Spine', wt, [
      [0.04, 0.06, 0],
      [0.03, 0, 0],
      [0.04, -0.06, 0],
      [0.03, 0, 0],
      [0.04, 0.06, 0],
    ]),
  ]);

  // 3. Sit (seated at classroom/library desk writing gently, 2.0s loop)
  const sitClip = new THREE.AnimationClip('Sit', 2.0, [
    new THREE.VectorKeyframeTrack('Hips.position', [0, 1.0, 2.0], [
      0, 0.48, -0.02,
      0, 0.48, -0.02,
      0, 0.48, -0.02,
    ]),
    quatTrack('LeftUpLeg', [0, 2.0], [[-1.38, 0, 0], [-1.38, 0, 0]]),
    quatTrack('RightUpLeg', [0, 2.0], [[-1.38, 0, 0], [-1.38, 0, 0]]),
    quatTrack('LeftLeg', [0, 2.0], [[1.35, 0, 0], [1.35, 0, 0]]),
    quatTrack('RightLeg', [0, 2.0], [[1.35, 0, 0], [1.35, 0, 0]]),
    quatTrack('Spine1', [0, 1.0, 2.0], [[0.10, 0, 0], [0.14, 0, 0], [0.10, 0, 0]]),
    quatTrack('LeftArm', [0, 2.0], [[-0.55, 0, 0.14], [-0.55, 0, 0.14]]),
    quatTrack('LeftForeArm', [0, 2.0], [[-0.55, 0, 0], [-0.55, 0, 0]]),
    quatTrack('RightArm', [0, 0.5, 1.0, 1.5, 2.0], [
      [-0.58, -0.1, -0.12],
      [-0.64, -0.04, -0.12],
      [-0.56, -0.12, -0.12],
      [-0.62, -0.02, -0.12],
      [-0.58, -0.1, -0.12],
    ]),
    quatTrack('RightForeArm', [0, 1.0, 2.0], [[-0.62, 0, 0], [-0.48, 0, 0], [-0.62, 0, 0]]),
  ]);

  // 4. Lecture (teacher speaking & gesturing at podium, 2.0s loop)
  const lectureClip = new THREE.AnimationClip('Lecture', 2.0, [
    quatTrack('Spine1', [0, 1.0, 2.0], [[0, -0.08, 0], [0.04, 0.08, 0], [0, -0.08, 0]]),
    quatTrack('Head', [0, 1.0, 2.0], [[0.03, -0.14, 0], [-0.02, 0.14, 0], [0.03, -0.14, 0]]),
    quatTrack('RightArm', [0, 0.65, 1.35, 2.0], [
      [-0.45, 0, -0.15],
      [-0.95, 0.18, -0.25],
      [-0.65, -0.1, -0.18],
      [-0.45, 0, -0.15],
    ]),
    quatTrack('RightForeArm', [0, 1.0, 2.0], [[-0.65, 0, 0], [-0.35, 0, 0], [-0.65, 0, 0]]),
    quatTrack('LeftArm', [0, 1.0, 2.0], [[-0.25, 0, 0.12], [-0.48, 0, 0.16], [-0.25, 0, 0.12]]),
  ]);

  // 5. Wave (guard/staff greeting wave, 1.5s loop)
  const waveClip = new THREE.AnimationClip('Wave', 1.5, [
    quatTrack('RightArm', [0, 0.75, 1.5], [[-2.4, 0, -0.35], [-2.55, 0, -0.55], [-2.4, 0, -0.35]]),
    quatTrack('RightForeArm', [0, 0.38, 0.75, 1.12, 1.5], [
      [0, 0, -0.25],
      [0, 0, 0.25],
      [0, 0, -0.25],
      [0, 0, 0.25],
      [0, 0, -0.25],
    ]),
    quatTrack('Head', [0, 0.75, 1.5], [[0, 0.05, 0], [-0.04, -0.05, 0], [0, 0.05, 0]]),
  ]);

  return [idleClip, walkClip, sitClip, lectureClip, waveClip];
}

const DEFAULT_PALETTES: Record<HumanArchetypeId, Record<SlotName, number>> = {
  student_male: {
    skin_mesh: 0xf1c27d,
    hair_mesh: 0x1c1917,
    shirt_mesh: 0xf8fafc,
    pants_mesh: 0x1e293b,
    shoes_mesh: 0x0f172a,
    accent_mesh: 0xdc2626,
    eyes_mesh: 0x111827,
  },
  student_female: {
    skin_mesh: 0xf7d0a8,
    hair_mesh: 0x1e1b4b,
    shirt_mesh: 0xf8fafc,
    pants_mesh: 0x1e3a5f,
    shoes_mesh: 0x0f172a,
    accent_mesh: 0xef4444,
    eyes_mesh: 0x111827,
  },
  teacher_aodai: {
    skin_mesh: 0xf5caa6,
    hair_mesh: 0x1c1917,
    shirt_mesh: 0x0f766e,
    pants_mesh: 0xf8fafc,
    shoes_mesh: 0x1f2937,
    accent_mesh: 0xfbbf24,
    eyes_mesh: 0x111827,
  },
  staff_casual: {
    skin_mesh: 0xf1c27d,
    hair_mesh: 0x3b2314,
    shirt_mesh: 0x0ea5e9,
    pants_mesh: 0x334155,
    shoes_mesh: 0xf8fafc,
    accent_mesh: 0xf59e0b,
    eyes_mesh: 0x111827,
  },
  guard_officer: {
    skin_mesh: 0xe8b48e,
    hair_mesh: 0x18181b,
    shirt_mesh: 0x0369a1,
    pants_mesh: 0x0f172a,
    shoes_mesh: 0x09090b,
    accent_mesh: 0xfacc15,
    eyes_mesh: 0x111827,
  },
  doctor_coat: {
    skin_mesh: 0xf5caa6,
    hair_mesh: 0x1c1917,
    shirt_mesh: 0xffffff,
    pants_mesh: 0x0284c7,
    shoes_mesh: 0xf1f5f9,
    accent_mesh: 0x38bdf8,
    eyes_mesh: 0x111827,
  },
};

async function exportArchetype(id: HumanArchetypeId, outDir: string) {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.name = `NpcRoot_${id}`;
  scene.add(root);

  const { rootBone, skeleton } = createHumanoidSkeleton();
  root.add(rootBone);

  const partsBySlot = buildArchetypeParts(id);
  const palette = DEFAULT_PALETTES[id];

  (Object.keys(partsBySlot) as SlotName[]).forEach((slot) => {
    const geos = partsBySlot[slot].map((p) => p.geo);
    if (geos.length === 0) return;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) return;

    const mat = new THREE.MeshStandardMaterial({
      name: `mat_${slot}`,
      color: palette[slot],
      roughness: slot === 'shoes_mesh' ? 0.55 : slot === 'hair_mesh' ? 0.85 : 0.72,
      metalness: 0.02,
    });

    const sm = new THREE.SkinnedMesh(merged, mat);
    sm.name = slot;
    sm.bind(skeleton);
    root.add(sm);
  });

  const clips = buildClips();
  const exporter = new GLTFExporter();
  const ab = (await exporter.parseAsync(root, {
    binary: true,
    animations: clips,
  })) as ArrayBuffer;

  const filePath = path.join(outDir, `${id}.glb`);
  fs.writeFileSync(filePath, Buffer.from(ab));

  // Verify roundtrip with GLTFLoader + SkeletonUtils.clone + AnimationMixer
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(ab, '');
  const clone = SkeletonUtils.clone(gltf.scene);
  const mixer = new THREE.AnimationMixer(clone);
  const action = mixer.clipAction(gltf.animations[1]); // Walk
  action.play();
  mixer.update(0.25);

  console.log(`Generated ${id}.glb (${(ab.byteLength / 1024).toFixed(1)} KB, clips=${gltf.animations.length})`);
}

async function main() {
  const outDir = path.resolve(process.cwd(), 'public', 'models');
  fs.mkdirSync(outDir, { recursive: true });
  const ids: HumanArchetypeId[] = [
    'student_male',
    'student_female',
    'teacher_aodai',
    'staff_casual',
    'guard_officer',
    'doctor_coat',
  ];
  for (const id of ids) {
    await exportArchetype(id, outDir);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
