import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  getPlayerCharacterDef,
  type PlayerCharacterDefinition,
  type PlayerCharacterId,
} from './PlayerCharacterCatalog';

interface LoadedPlayerTemplate {
  gltf: GLTF;
}

const templatePromiseCache = new Map<string, Promise<LoadedPlayerTemplate>>();
const sharedLoader = new GLTFLoader();

function loadPlayerTemplate(url: string): Promise<LoadedPlayerTemplate> {
  let pending = templatePromiseCache.get(url);
  if (!pending) {
    pending = new Promise<LoadedPlayerTemplate>((resolve, reject) => {
      sharedLoader.load(
        url,
        (gltf) => resolve({ gltf }),
        undefined,
        (err) => {
          templatePromiseCache.delete(url);
          reject(err);
        }
      );
    });
    templatePromiseCache.set(url, pending);
  }
  return pending;
}

type RigRole =
  | 'hips'
  | 'spine'
  | 'head'
  | 'leftArm'
  | 'leftForeArm'
  | 'leftHand'
  | 'rightArm'
  | 'rightForeArm'
  | 'rightHand'
  | 'leftUpLeg'
  | 'leftLeg'
  | 'leftFoot'
  | 'rightUpLeg'
  | 'rightLeg'
  | 'rightFoot';

interface BoneDriver {
  bone: THREE.Object3D;
  restQuat: THREE.Quaternion;
  localPitchAxis: THREE.Vector3; // +X in mountGroup space (+pitch swings downward limbs toward -Z; -pitch leans upward torso toward -Z)
  localYawAxis: THREE.Vector3;   // +Y in mountGroup space (+yaw turns -Z forward toward -X left)
  localRollAxis: THREE.Vector3;  // +Z in mountGroup space (+roll swings downward limbs toward +X right)
}

interface RestBoneSnapshot {
  bone: THREE.Object3D;
  quat: THREE.Quaternion;
  pos: THREE.Vector3;
}

type RigDrivers = Partial<Record<RigRole, BoneDriver>>;

export interface PlayerAvatarMotionInput {
  delta: number;
  isMoving: boolean;
  isSprinting: boolean;
  moveDistance: number;
  isRidingBike: boolean;
  steerAngle: number;
  headLookYaw?: number;
  visible: boolean;
}

function findBoneByPatterns(root: THREE.Object3D, patterns: RegExp[]): THREE.Object3D | undefined {
  const realBones: THREE.Object3D[] = [];
  const otherNodes: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone && !/scaleCompensation/i.test(obj.name)) {
      realBones.push(obj);
    } else if (!/scaleCompensation/i.test(obj.name)) {
      otherNodes.push(obj);
    }
  });
  for (const pat of patterns) {
    const boneMatch = realBones.find((obj) => pat.test(obj.name));
    if (boneMatch) return boneMatch;
  }
  for (const pat of patterns) {
    const nodeMatch = otherNodes.find((obj) => pat.test(obj.name));
    if (nodeMatch) return nodeMatch;
  }
  return undefined;
}

function alignBoneModelDirection(
  refRoot: THREE.Object3D,
  bone: THREE.Object3D,
  childBone: THREE.Object3D,
  desiredRefDir: THREE.Vector3,
  blend: number = 1
): void {
  refRoot.updateMatrixWorld(true);
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  bone.getWorldPosition(p1);
  childBone.getWorldPosition(p2);

  const rootWorldQ = new THREE.Quaternion();
  refRoot.getWorldQuaternion(rootWorldQ);
  const rootInv = rootWorldQ.clone().invert();

  const curDir = p2.sub(p1).applyQuaternion(rootInv);
  if (curDir.lengthSq() < 1e-6) return;
  curDir.normalize();

  const targetDir = desiredRefDir.clone().normalize();
  const qModelDelta = new THREE.Quaternion().setFromUnitVectors(curDir, targetDir);
  if (blend < 1) {
    qModelDelta.slerp(new THREE.Quaternion(), 1 - blend);
  }

  const boneWorldQ = new THREE.Quaternion();
  bone.getWorldQuaternion(boneWorldQ);
  const boneInRoot = rootInv.clone().multiply(boneWorldQ);
  const localDelta = boneInRoot.clone().invert().multiply(qModelDelta).multiply(boneInRoot);
  bone.quaternion.multiply(localDelta);
}

/**
 * Calibrates Gojo's Sketchfab dance GLB into a clean, calm, upright standing pose
 * facing +Z (which becomes -Z once visualRoot rotates by Math.PI).
 * Modifies only quaternions so skinned geometry stays completely intact.
 */
export function applyGojoStandingCalibration(modelRoot: THREE.Object3D): void {
  const hip = findBoneByPatterns(modelRoot, [/^hip_1$/i, /^hip$/i]);
  if (hip) {
    const uprightBasis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 1, 0), // hip local +X = Up
      new THREE.Vector3(0, 0, 1), // hip local +Y = Forward (+Z)
      new THREE.Vector3(1, 0, 0)  // hip local +Z = Left (+X)
    );
    hip.quaternion.setFromRotationMatrix(uprightBasis);
  }

  for (const pat of [
    /^waist_14$/i,
    /^chest_15$/i,
    /^shoulder_16$/i,
    /^neck_29$/i,
    /^head_30$/i,
  ]) {
    const bone = findBoneByPatterns(modelRoot, [pat]);
    if (bone) bone.quaternion.identity();
  }

  const leftThigh = findBoneByPatterns(modelRoot, [/^leftThigh_8$/i, /leftThigh/i]);
  const rightThigh = findBoneByPatterns(modelRoot, [/^rightThigh_2$/i, /rightThigh/i]);
  if (leftThigh) leftThigh.quaternion.set(0, 1, 0, 0);
  if (rightThigh) rightThigh.quaternion.set(0, 1, 0, 0);

  for (const pat of [
    /^leftCalf_9$/i,
    /^leftFoot_10$/i,
    /^rightCalf_3$/i,
    /^rightFoot_4$/i,
  ]) {
    const bone = findBoneByPatterns(modelRoot, [pat]);
    if (bone) bone.quaternion.identity();
  }

  const alignLocalX = (bone: THREE.Object3D | undefined, dir: THREE.Vector3) => {
    if (!bone || !bone.parent) return;
    bone.parent.updateMatrixWorld(true);
    const parentQ = new THREE.Quaternion();
    bone.parent.getWorldQuaternion(parentQ);
    const xAxis = dir.clone().normalize();
    const refZ = new THREE.Vector3(0, 0, 1);
    const yAxis = new THREE.Vector3().crossVectors(refZ, xAxis).normalize();
    if (yAxis.lengthSq() < 1e-6) {
      yAxis.set(0, 1, 0);
    }
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const worldMat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(worldMat);
    bone.quaternion.copy(parentQ.invert().multiply(worldQ));
  };

  alignLocalX(
    findBoneByPatterns(modelRoot, [/^leftShoulder_23$/i, /leftShoulder/i]),
    new THREE.Vector3(1, -0.08, 0)
  );
  alignLocalX(
    findBoneByPatterns(modelRoot, [/^leftUpperArm_24$/i, /leftUpperArm/i]),
    new THREE.Vector3(0.15, -1, 0)
  );
  alignLocalX(
    findBoneByPatterns(modelRoot, [/^rightShoulder_17$/i, /rightShoulder/i]),
    new THREE.Vector3(-1, -0.08, 0)
  );
  alignLocalX(
    findBoneByPatterns(modelRoot, [/^rightUpperArm_18$/i, /rightUpperArm/i]),
    new THREE.Vector3(-0.15, -1, 0)
  );

  for (const pat of [
    /^leftForearm_25$/i,
    /^leftHand_26$/i,
    /^rightForearm_19$/i,
    /^rightHand_20$/i,
  ]) {
    const bone = findBoneByPatterns(modelRoot, [pat]);
    if (bone) bone.quaternion.identity();
  }

  modelRoot.updateMatrixWorld(true);
}

/**
 * Removes the disconnected oversized shirt mesh (`Object_106`) floating above Luffy Gear 5's head.
 */
export function removeStrayGear5FloatingMesh(modelRoot: THREE.Object3D): number {
  let removed = 0;
  const targets: THREE.Object3D[] = [];
  modelRoot.traverse((obj) => {
    if (obj.name === 'Object_106') {
      targets.push(obj);
    }
  });
  for (const obj of targets) {
    obj.parent?.remove(obj);
    removed++;
  }
  modelRoot.updateMatrixWorld(true);
  return removed;
}

function canonicalMixamoBoneName(name: string): string {
  return name.replace(/_\d+$/, '').replace(/^mixamorig:?/i, 'mixamorig');
}

/**
 * Creates a rotation-only clone of a Mixamo clip (stripping .position and .scale tracks)
 * and remaps bone suffixes (e.g. mixamorigRightArm_033 -> mixamorigRightArm_032) against targetRoot
 * so Mixamo skeletons like Itachi & Luffy Gear 5 share Naruto's stand/walk/run clips cleanly.
 */
export function cloneRotationOnlyClip(
  clip: THREE.AnimationClip,
  namePrefix: string = 'RotOnly',
  targetRoot?: THREE.Object3D
): THREE.AnimationClip {
  const exactNames = new Set<string>();
  const canonMap = new Map<string, string>();
  if (targetRoot) {
    targetRoot.traverse((obj) => {
      if ((obj as THREE.Bone).isBone && obj.name) {
        exactNames.add(obj.name);
        const canon = canonicalMixamoBoneName(obj.name);
        if (!canonMap.has(canon)) {
          canonMap.set(canon, obj.name);
        }
      }
    });
  }

  const rotTracks: THREE.KeyframeTrack[] = [];
  for (let i = 0; i < clip.tracks.length; i++) {
    const t = clip.tracks[i];
    if (!t.name.endsWith('.quaternion')) continue;
    if (!targetRoot) {
      rotTracks.push(t);
      continue;
    }
    const rawNodeName = t.name.slice(0, -'.quaternion'.length);
    let mappedName = rawNodeName;
    if (!exactNames.has(rawNodeName)) {
      const remapped = canonMap.get(canonicalMixamoBoneName(rawNodeName));
      if (!remapped) continue;
      mappedName = remapped;
    }
    if (mappedName === rawNodeName) {
      rotTracks.push(t);
    } else {
      const clonedTrack = t.clone();
      clonedTrack.name = `${mappedName}.quaternion`;
      rotTracks.push(clonedTrack);
    }
  }
  return new THREE.AnimationClip(`${namePrefix}_${clip.name}`, clip.duration, rotTracks);
}

const NARUTO_TO_GOJO_BONE_MAP: ReadonlyArray<readonly [string, string]> = [
  ['mixamorigHips', 'hip_1'],
  ['mixamorigSpine', 'waist_14'],
  ['mixamorigSpine2', 'chest_15'],
  ['mixamorigNeck', 'neck_29'],
  ['mixamorigHead', 'head_30'],
  ['mixamorigLeftShoulder', 'leftShoulder_23'],
  ['mixamorigLeftArm', 'leftUpperArm_24'],
  ['mixamorigLeftForeArm', 'leftForearm_25'],
  ['mixamorigLeftHand', 'leftHand_26'],
  ['mixamorigRightShoulder', 'rightShoulder_17'],
  ['mixamorigRightArm', 'rightUpperArm_18'],
  ['mixamorigRightForeArm', 'rightForearm_19'],
  ['mixamorigRightHand', 'rightHand_20'],
  ['mixamorigLeftUpLeg', 'leftThigh_8'],
  ['mixamorigLeftLeg', 'leftCalf_9'],
  ['mixamorigLeftFoot', 'leftFoot_10'],
  ['mixamorigRightUpLeg', 'rightThigh_2'],
  ['mixamorigRightLeg', 'rightCalf_3'],
  ['mixamorigRightFoot', 'rightFoot_4'],
];

/**
 * Retargets a Mixamo animation clip (e.g. Naruto's stand/walk/run) onto Gojo's 32-bone skeleton
 * using an exact model-space quaternion similarity transform from Naruto's 45-deg A-pose bind
 * to Gojo's calibrated matching 45-deg A-pose. Never touches Gojo's original dance clip.
 */
export function retargetMixamoClipToGojo(
  clip: THREE.AnimationClip,
  narutoScene: THREE.Object3D,
  gojoScene: THREE.Object3D,
  namePrefix: string = 'gojo'
): THREE.AnimationClip {
  // Clone Naruto reference scene cleanly into its exact bind pose (45-deg A-pose facing +Z)
  const srcRef = SkeletonUtils.clone(narutoScene);
  srcRef.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      (o as THREE.SkinnedMesh).skeleton?.pose();
    }
  });
  srcRef.position.set(0, 0, 0);
  srcRef.rotation.set(0, 0, 0);
  srcRef.scale.set(1, 1, 1);
  srcRef.updateMatrixWorld(true);

  const srcBonesByCanon = new Map<string, THREE.Object3D>();
  srcRef.traverse((o) => {
    if ((o as THREE.Bone).isBone && o.name) {
      const canon = canonicalMixamoBoneName(o.name);
      if (!srcBonesByCanon.has(canon)) srcBonesByCanon.set(canon, o);
    }
  });

  // Snapshot Gojo's current bone quaternions, then pose Gojo's upper arms into Naruto's exact 45-deg A-pose
  const savedQuats: Array<{ obj: THREE.Object3D; q: THREE.Quaternion }> = [];
  gojoScene.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      savedQuats.push({ obj: o, q: o.quaternion.clone() });
    }
  });

  const alignGojoArmLocalX = (boneName: string, dirInGojoModel: THREE.Vector3) => {
    const bone = gojoScene.getObjectByName(boneName);
    if (!bone || !bone.parent) return;
    gojoScene.updateMatrixWorld(true);
    const rootQ = new THREE.Quaternion();
    gojoScene.getWorldQuaternion(rootQ);
    const rootInv = rootQ.clone().invert();
    const parentWorldQ = new THREE.Quaternion();
    bone.parent.getWorldQuaternion(parentWorldQ);
    const parentInModel = rootInv.clone().multiply(parentWorldQ);

    const xAxis = dirInGojoModel.clone().normalize();
    const refZ = new THREE.Vector3(0, 0, 1);
    const yAxis = new THREE.Vector3().crossVectors(refZ, xAxis).normalize();
    if (yAxis.lengthSq() < 1e-6) yAxis.set(0, 1, 0);
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    const targetInModelQ = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
    );
    bone.quaternion.copy(parentInModel.invert().multiply(targetInModelQ));
  };

  alignGojoArmLocalX('leftUpperArm_24', new THREE.Vector3(0.704, -0.710, 0));
  alignGojoArmLocalX('rightUpperArm_18', new THREE.Vector3(-0.704, -0.710, 0));
  gojoScene.updateMatrixWorld(true);

  const gojoRootQ = new THREE.Quaternion();
  gojoScene.getWorldQuaternion(gojoRootQ);
  const gojoRootInv = gojoRootQ.clone().invert();

  const srcTrackByCanon = new Map<string, THREE.KeyframeTrack>();
  for (let i = 0; i < clip.tracks.length; i++) {
    const tr = clip.tracks[i];
    if (!tr.name.endsWith('.quaternion')) continue;
    const rawName = tr.name.slice(0, -'.quaternion'.length);
    srcTrackByCanon.set(canonicalMixamoBoneName(rawName), tr);
  }

  const outTracks: THREE.KeyframeTrack[] = [];
  const qSrc = new THREE.Quaternion();
  const qSrcRestInv = new THREE.Quaternion();
  const qSrcParentModel = new THREE.Quaternion();
  const qDstParentModel = new THREE.Quaternion();
  const qC = new THREE.Quaternion();
  const qCInv = new THREE.Quaternion();
  const qDelta = new THREE.Quaternion();
  const qOut = new THREE.Quaternion();
  const qPrev = new THREE.Quaternion();

  for (const [srcCanon, dstName] of NARUTO_TO_GOJO_BONE_MAP) {
    const srcTrack = srcTrackByCanon.get(srcCanon);
    const srcBone = srcBonesByCanon.get(srcCanon);
    const dstBone = gojoScene.getObjectByName(dstName);
    if (!srcTrack || !srcBone || !dstBone || !srcBone.parent || !dstBone.parent) continue;

    qSrcRestInv.copy(srcBone.quaternion).invert();
    srcBone.parent.getWorldQuaternion(qSrcParentModel);

    dstBone.parent.getWorldQuaternion(qDstParentModel);
    qDstParentModel.premultiply(gojoRootInv);

    // Similarity transform C = inv(qDstParentInModel) * qSrcParentInModel
    qC.copy(qDstParentModel).invert().multiply(qSrcParentModel);
    qCInv.copy(qC).invert();
    const qDstRest = dstBone.quaternion.clone();

    const times = new Float32Array(srcTrack.times);
    const values = new Float32Array(srcTrack.values.length);
    const count = times.length;

    for (let k = 0; k < count; k++) {
      const idx = k * 4;
      qSrc.set(
        srcTrack.values[idx],
        srcTrack.values[idx + 1],
        srcTrack.values[idx + 2],
        srcTrack.values[idx + 3]
      ).normalize();

      // qOut = C * (qSrc * inv(qSrcRest)) * inv(C) * qDstRest
      qDelta.copy(qSrc).multiply(qSrcRestInv);
      qOut.copy(qC).multiply(qDelta).multiply(qCInv).multiply(qDstRest).normalize();

      if (k > 0 && qPrev.dot(qOut) < 0) {
        qOut.set(-qOut.x, -qOut.y, -qOut.z, -qOut.w);
      }
      qPrev.copy(qOut);

      values[idx] = qOut.x;
      values[idx + 1] = qOut.y;
      values[idx + 2] = qOut.z;
      values[idx + 3] = qOut.w;
    }

    outTracks.push(new THREE.QuaternionKeyframeTrack(`${dstName}.quaternion`, times, values));
  }

  // Restore Gojo's calibrated standing pose
  for (let i = 0; i < savedQuats.length; i++) {
    savedQuats[i].obj.quaternion.copy(savedQuats[i].q);
  }
  gojoScene.updateMatrixWorld(true);

  return new THREE.AnimationClip(`${namePrefix}_${clip.name}`, clip.duration, outTracks);
}

function resolveRigBones(modelRoot: THREE.Object3D): Partial<Record<RigRole, THREE.Object3D>> {
  return {
    hips: findBoneByPatterns(modelRoot, [
      /mixamorig:?Hips/i,
      /^root_hips/i,
      /^CC_Base_Hip/i,
      /^hip_1$/i,
      /\bhips?\b/i,
    ]),
    spine: findBoneByPatterns(modelRoot, [
      /mixamorig:?Spine1/i,
      /mixamorig:?Spine2/i,
      /^spine_upper/i,
      /^CC_Base_Spine01/i,
      /^CC_Base_Spine02/i,
      /^waist_14$/i,
      /^chest_15$/i,
    ]),
    head: findBoneByPatterns(modelRoot, [
      /mixamorig:?Head(?:_\d+)?$/i,
      /^head_neck_upper/i,
      /^CC_Base_Head(?:_\d+)?$/i,
      /^head_30$/i,
      /head/i,
    ]),
    leftArm: findBoneByPatterns(modelRoot, [
      /mixamorig:?LeftArm/i,
      /^arm_.*shoulder_2L/i,
      /^CC_Base_L_Upperarm/i,
      /^leftUpperArm/i,
    ]),
    leftForeArm: findBoneByPatterns(modelRoot, [
      /mixamorig:?LeftForeArm/i,
      /^arm_.*elbowL/i,
      /^CC_Base_L_Forearm/i,
      /^leftForearm/i,
    ]),
    leftHand: findBoneByPatterns(modelRoot, [
      /^mixamorig:?LeftHand(?:_\d+)?$/i,
      /^CC_Base_L_Hand(?:_\d+)?$/i,
      /^leftHand(?:_\d+)?$/i,
      /^arm_.*wristL/i,
    ]),
    rightArm: findBoneByPatterns(modelRoot, [
      /mixamorig:?RightArm/i,
      /^arm_.*shoulder_2R/i,
      /^CC_Base_R_Upperarm/i,
      /^rightUpperArm/i,
    ]),
    rightForeArm: findBoneByPatterns(modelRoot, [
      /mixamorig:?RightForeArm/i,
      /^arm_.*elbowR/i,
      /^CC_Base_R_Forearm/i,
      /^rightForearm/i,
    ]),
    rightHand: findBoneByPatterns(modelRoot, [
      /^mixamorig:?RightHand(?:_\d+)?$/i,
      /^CC_Base_R_Hand(?:_\d+)?$/i,
      /^rightHand(?:_\d+)?$/i,
      /^arm_.*wristR/i,
    ]),
    leftUpLeg: findBoneByPatterns(modelRoot, [
      /mixamorig:?LeftUpLeg/i,
      /^leg_.*thighL/i,
      /^CC_Base_L_Thigh/i,
      /^leftThigh/i,
    ]),
    leftLeg: findBoneByPatterns(modelRoot, [
      /mixamorig:?LeftLeg/i,
      /^leg_.*kneeL/i,
      /^CC_Base_L_Calf/i,
      /^leftCalf/i,
    ]),
    leftFoot: findBoneByPatterns(modelRoot, [
      /^mixamorig:?LeftFoot(?:_\d+)?$/i,
      /^CC_Base_L_Foot(?:_\d+)?$/i,
      /^leftFoot(?:_\d+)?$/i,
      /^leg_.*ankleL/i,
    ]),
    rightUpLeg: findBoneByPatterns(modelRoot, [
      /mixamorig:?RightUpLeg/i,
      /^leg_.*thighR/i,
      /^CC_Base_R_Thigh/i,
      /^rightThigh/i,
    ]),
    rightLeg: findBoneByPatterns(modelRoot, [
      /mixamorig:?RightLeg/i,
      /^leg_.*kneeR/i,
      /^CC_Base_R_Calf/i,
      /^rightCalf/i,
    ]),
    rightFoot: findBoneByPatterns(modelRoot, [
      /^mixamorig:?RightFoot(?:_\d+)?$/i,
      /^CC_Base_R_Foot(?:_\d+)?$/i,
      /^rightFoot(?:_\d+)?$/i,
      /^leg_.*ankleR/i,
    ]),
  };
}

/**
 * Ensures resolved left* chains sit on character-left (-X in mountGroup space facing -Z)
 * and right* chains sit on character-right (+X in mountGroup space).
 */
function normalizeLeftRightRigSides(
  mountGroup: THREE.Object3D,
  bones: Partial<Record<RigRole, THREE.Object3D>>
): void {
  mountGroup.updateMatrixWorld(true);
  const invMount = new THREE.Matrix4().copy(mountGroup.matrixWorld).invert();
  const pL = new THREE.Vector3();
  const pR = new THREE.Vector3();

  if (bones.leftArm && bones.rightArm) {
    bones.leftArm.getWorldPosition(pL).applyMatrix4(invMount);
    bones.rightArm.getWorldPosition(pR).applyMatrix4(invMount);
    if (pL.x > pR.x) {
      [bones.leftArm, bones.rightArm] = [bones.rightArm, bones.leftArm];
      [bones.leftForeArm, bones.rightForeArm] = [bones.rightForeArm, bones.leftForeArm];
      [bones.leftHand, bones.rightHand] = [bones.rightHand, bones.leftHand];
    }
  }

  if (bones.leftUpLeg && bones.rightUpLeg) {
    bones.leftUpLeg.getWorldPosition(pL).applyMatrix4(invMount);
    bones.rightUpLeg.getWorldPosition(pR).applyMatrix4(invMount);
    if (pL.x > pR.x) {
      [bones.leftUpLeg, bones.rightUpLeg] = [bones.rightUpLeg, bones.leftUpLeg];
      [bones.leftLeg, bones.rightLeg] = [bones.rightLeg, bones.leftLeg];
      [bones.leftFoot, bones.rightFoot] = [bones.rightFoot, bones.leftFoot];
    }
  }
}

function buildBoneDrivers(mountGroup: THREE.Object3D, bones: Partial<Record<RigRole, THREE.Object3D>>): RigDrivers {
  mountGroup.updateMatrixWorld(true);
  const rootWorldQ = new THREE.Quaternion();
  mountGroup.getWorldQuaternion(rootWorldQ);
  const rootInv = rootWorldQ.clone().invert();

  // Mount-space canonical axes (forward = -Z, up = +Y, right = +X, left = -X)
  const pitchAxisMount = new THREE.Vector3(1, 0, 0);
  const yawAxisMount = new THREE.Vector3(0, 1, 0);
  const rollAxisMount = new THREE.Vector3(0, 0, 1);

  const drivers: RigDrivers = {};
  (Object.keys(bones) as RigRole[]).forEach((role) => {
    const bone = bones[role];
    if (!bone) return;
    const boneWorldQ = new THREE.Quaternion();
    bone.getWorldQuaternion(boneWorldQ);
    const boneInMountInv = rootInv.clone().multiply(boneWorldQ).invert();
    drivers[role] = {
      bone,
      restQuat: bone.quaternion.clone(),
      localPitchAxis: pitchAxisMount.clone().applyQuaternion(boneInMountInv).normalize(),
      localYawAxis: yawAxisMount.clone().applyQuaternion(boneInMountInv).normalize(),
      localRollAxis: rollAxisMount.clone().applyQuaternion(boneInMountInv).normalize(),
    };
  });
  return drivers;
}

// Target hip center in playerMesh space when seated squarely on the front rider saddle (saddle top = Y:0.77, Z:-0.20..+0.15)
const SEATED_HIPS_TARGET_Y = 0.855;
const SEATED_HIPS_TARGET_Z = -0.095;

export class PlayerGlbAvatarController {
  private readonly hostGroup: THREE.Group;
  private readonly mountGroup: THREE.Group;
  private readonly fallbackMeshes: THREE.Object3D[];
  private readonly castShadow: boolean;

  private activeCharacterId: PlayerCharacterId = 'default';
  private loadGeneration: number = 0;

  private activeDef: PlayerCharacterDefinition = getPlayerCharacterDef('default');
  private activeVisualRoot: THREE.Group | null = null;
  private activeMixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private runAction: THREE.AnimationAction | null = null;
  private activeClipRole: 'none' | 'idle' | 'walk' | 'run' = 'none';
  private drivers: RigDrivers = {};
  private allRestPose: RestBoneSnapshot[] = [];
  private isSharedExternalClips: boolean = false;
  private sharedClipOffsetY: number = 0;
  private seatedOffsetY: number = 0;
  private seatedOffsetZ: number = 0;

  private walkPhase: number = 0;
  private idleClock: number = 0;
  private moveWeight: number = 0;
  private bikeWeight: number = 0;

  // Pre-allocated scratch math objects (zero per-frame GC allocations)
  private readonly tmpQuatA = new THREE.Quaternion();
  private readonly tmpQuatB = new THREE.Quaternion();
  private readonly tmpQuatTarget = new THREE.Quaternion();
  private readonly ikInvMountMat = new THREE.Matrix4();
  private readonly ikMountWorldQ = new THREE.Quaternion();
  private readonly ikMountWorldQInv = new THREE.Quaternion();
  private readonly ikBoneWorldQ = new THREE.Quaternion();
  private readonly ikBoneInMount = new THREE.Quaternion();
  private readonly ikBoneInMountInv = new THREE.Quaternion();
  private readonly ikDeltaMount = new THREE.Quaternion();
  private readonly ikLocalDelta = new THREE.Quaternion();
  private readonly ikPosA = new THREE.Vector3();
  private readonly ikPosB = new THREE.Vector3();
  private readonly ikPosC = new THREE.Vector3();
  private readonly ikToTarget = new THREE.Vector3();
  private readonly ikDir = new THREE.Vector3();
  private readonly ikBendDir = new THREE.Vector3();
  private readonly ikDesiredMid = new THREE.Vector3();
  private readonly ikCurUpper = new THREE.Vector3();
  private readonly ikDesUpper = new THREE.Vector3();
  private readonly ikCurLower = new THREE.Vector3();
  private readonly ikDesLower = new THREE.Vector3();
  private readonly ikTargetVec = new THREE.Vector3();
  private readonly ikPoleVec = new THREE.Vector3();

  constructor(options: {
    playerMesh: THREE.Group;
    fallbackMeshes: THREE.Object3D[];
    castShadow?: boolean;
    initialCharacterId?: PlayerCharacterId;
  }) {
    this.hostGroup = options.playerMesh;
    this.fallbackMeshes = options.fallbackMeshes;
    this.castShadow = Boolean(options.castShadow);

    this.mountGroup = new THREE.Group();
    this.mountGroup.name = 'player_glb_mount';
    this.mountGroup.visible = false;
    this.hostGroup.add(this.mountGroup);

    if (options.initialCharacterId && options.initialCharacterId !== 'default') {
      this.setCharacter(options.initialCharacterId);
    }
  }

  public getCharacterId(): PlayerCharacterId {
    return this.activeCharacterId;
  }

  public hasActiveGlb(): boolean {
    return this.activeCharacterId !== 'default' && Boolean(this.activeVisualRoot);
  }

  public getActiveClipRole(): 'none' | 'idle' | 'walk' | 'run' {
    return this.activeClipRole;
  }

  public getBoneWorldPosition(role: RigRole, out: THREE.Vector3): boolean {
    const drv = this.drivers[role];
    if (!drv) return false;
    this.hostGroup.updateMatrixWorld(true);
    drv.bone.getWorldPosition(out);
    return true;
  }

  public mountPreloadedForTest(
    def: PlayerCharacterDefinition,
    gltf: GLTF,
    animSourceGltf?: GLTF
  ): void {
    this.activeCharacterId = def.id;
    this.activeDef = def;
    this.loadGeneration++;
    this.mountLoadedCharacter(def, gltf, animSourceGltf);
  }

  public setCharacter(id: PlayerCharacterId): void {
    const def = getPlayerCharacterDef(id);
    if (this.activeCharacterId === def.id && (def.id === 'default' || this.activeVisualRoot)) {
      return;
    }

    this.activeCharacterId = def.id;
    this.activeDef = def;
    const gen = ++this.loadGeneration;

    if (def.id === 'default' || !def.modelUrl) {
      this.clearMountedModel();
      this.setFallbackVisible(true);
      this.mountGroup.visible = false;
      return;
    }

    // Keep fallback visible cleanly while the new GLB finishes downloading
    if (!this.activeVisualRoot) {
      this.setFallbackVisible(true);
    }

    const animPromise = def.animationSourceUrl
      ? loadPlayerTemplate(def.animationSourceUrl).catch(() => null)
      : Promise.resolve(null);

    Promise.all([loadPlayerTemplate(def.modelUrl), animPromise])
      .then(([tpl, animTpl]) => {
        if (gen !== this.loadGeneration) return;
        this.mountLoadedCharacter(def, tpl.gltf, animTpl?.gltf);
      })
      .catch((err) => {
        console.warn(`[PlayerGlbAvatar] Failed loading ${def.modelUrl}:`, err);
        if (gen === this.loadGeneration) {
          this.clearMountedModel();
          this.setFallbackVisible(true);
          this.mountGroup.visible = false;
        }
      });
  }

  private setFallbackVisible(vis: boolean): void {
    for (let i = 0; i < this.fallbackMeshes.length; i++) {
      this.fallbackMeshes[i].visible = vis;
    }
  }

  private clearMountedModel(): void {
    if (this.activeMixer) {
      this.activeMixer.stopAllAction();
      this.activeMixer = null;
    }
    this.idleAction = null;
    this.walkAction = null;
    this.runAction = null;
    this.activeClipRole = 'none';
    this.drivers = {};
    this.allRestPose = [];
    this.isSharedExternalClips = false;
    this.sharedClipOffsetY = 0;
    this.seatedOffsetY = 0;
    this.seatedOffsetZ = 0;
    if (this.activeVisualRoot) {
      this.mountGroup.remove(this.activeVisualRoot);
      this.activeVisualRoot = null;
    }
  }

  private restoreFullRestPose(): void {
    for (let i = 0; i < this.allRestPose.length; i++) {
      const snap = this.allRestPose[i];
      snap.bone.quaternion.copy(snap.quat);
      snap.bone.position.copy(snap.pos);
    }
  }

  private mountLoadedCharacter(
    def: PlayerCharacterDefinition,
    gltf: GLTF,
    animSourceGltf?: GLTF
  ): void {
    this.clearMountedModel();
    this.mountGroup.position.set(0, 0, 0);

    const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m && 'envMapIntensity' in m) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 0.65;
          }
        }
      }
    });

    // Apply model-specific bind calibration BEFORE measuring Box3
    if (def.id === 'luffy_gear5') {
      cloned.traverse((obj) => {
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
          (obj as THREE.SkinnedMesh).skeleton?.pose();
        }
      });
      removeStrayGear5FloatingMesh(cloned);
    } else if (def.id === 'gojo') {
      applyGojoStandingCalibration(cloned);
    }

    const visualWrapper = new THREE.Group();
    visualWrapper.name = `player_char_${def.id}`;
    visualWrapper.add(cloned);
    visualWrapper.updateMatrixWorld(true);

    // Measure calibrated bounds and normalize height + ground alignment
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const rawHeight = Math.max(0.05, size.y);
    const scale = def.targetHeight / rawHeight;
    cloned.scale.multiplyScalar(scale);
    cloned.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    // Rotate wrapper so character always faces -Z (matching ShopScene playerMesh forward)
    visualWrapper.rotation.y = def.rotationY;
    this.mountGroup.add(visualWrapper);
    this.mountGroup.updateMatrixWorld(true);

    // Resolve rig bones and normalize Left (-X) / Right (+X) sides in mountGroup space
    const resolvedBones = resolveRigBones(cloned);
    normalizeLeftRightRigSides(this.mountGroup, resolvedBones);

    // Calibrate relaxed standing arms (mountGroup space: -X = character left, +X = character right)
    if (def.rigKind !== 'gojo_standing') {
      if (resolvedBones.leftArm && resolvedBones.leftForeArm) {
        alignBoneModelDirection(
          this.mountGroup,
          resolvedBones.leftArm,
          resolvedBones.leftForeArm,
          new THREE.Vector3(-0.18, -1, 0),
          def.rigKind === 'procedural' ? 0.94 : 0.72
        );
      }
      if (resolvedBones.rightArm && resolvedBones.rightForeArm) {
        alignBoneModelDirection(
          this.mountGroup,
          resolvedBones.rightArm,
          resolvedBones.rightForeArm,
          new THREE.Vector3(0.18, -1, 0),
          def.rigKind === 'procedural' ? 0.94 : 0.72
        );
      }
    }

    this.mountGroup.updateMatrixWorld(true);

    // Measure calibrated hip height/depth in mountGroup space so every character sits flush on the motorbike saddle
    if (resolvedBones.hips) {
      const invMount = new THREE.Matrix4().copy(this.mountGroup.matrixWorld).invert();
      const hipMountPos = new THREE.Vector3();
      resolvedBones.hips.getWorldPosition(hipMountPos).applyMatrix4(invMount);
      this.seatedOffsetY = SEATED_HIPS_TARGET_Y - hipMountPos.y;
      this.seatedOffsetZ = SEATED_HIPS_TARGET_Z - hipMountPos.z;
    } else {
      this.seatedOffsetY = 0;
      this.seatedOffsetZ = 0.02;
    }

    // Snapshot full standing rest pose for clean reset when switching between Mixamo clips and seated motorbike IK
    this.allRestPose = [];
    cloned.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        this.allRestPose.push({
          bone: obj,
          quat: obj.quaternion.clone(),
          pos: obj.position.clone(),
        });
      }
    });

    this.drivers = buildBoneDrivers(this.mountGroup, resolvedBones);

    // Configure AnimationMixer for native Mixamo clips AND external Naruto retargeted clips (NEVER source dance clips!)
    const hasExternalAnimSource = Boolean(
      def.animationSourceUrl && animSourceGltf && animSourceGltf.animations.length > 0
    );
    const sourceClips = hasExternalAnimSource
      ? animSourceGltf!.animations
      : def.disableSourceDanceAnimation
        ? []
        : gltf.animations;
    this.isSharedExternalClips = hasExternalAnimSource;

    if (sourceClips.length > 0) {
      if (def.rigKind === 'mixamo_clip' || (def.rigKind === 'gojo_standing' && hasExternalAnimSource)) {
        const mixer = new THREE.AnimationMixer(cloned);
        const rawStand = sourceClips.find((c) => /^stand$/i.test(c.name) || /idle/i.test(c.name));
        const rawWalk = sourceClips.find((c) => /^walk$/i.test(c.name));
        const rawRun = sourceClips.find((c) => /^run$/i.test(c.name));

        // Retarget Naruto's clips cleanly onto Itachi, Luffy Gear 5 (Mixamo suffix remap) or Gojo (similarity transform)
        const prepareClip = (c: THREE.AnimationClip | undefined) => {
          if (!c) return undefined;
          if (!hasExternalAnimSource) return c;
          if (def.id === 'gojo') {
            return retargetMixamoClipToGojo(c, animSourceGltf!.scene, cloned, def.id);
          }
          return cloneRotationOnlyClip(c, def.id, cloned);
        };

        const standClip = prepareClip(rawStand);
        const walkClip = prepareClip(rawWalk);
        const runClip = prepareClip(rawRun);

        if (standClip) this.idleAction = mixer.clipAction(standClip);
        if (walkClip) this.walkAction = mixer.clipAction(walkClip);
        if (runClip) this.runAction = mixer.clipAction(runClip);
        this.activeMixer = mixer;
        if (this.idleAction) {
          this.idleAction.play();
          this.activeClipRole = 'idle';
        }
      } else if (def.rigKind === 'mixamo_rot_walk') {
        const walkClip = sourceClips.find((c) => /walk/i.test(c.name));
        if (walkClip) {
          // Strip .scale and .position tracks so Luffy Gear 5 stays cleanly at 1.74m height
          const rotWalkClip = cloneRotationOnlyClip(walkClip, 'Gear5WalkRot', cloned);
          const mixer = new THREE.AnimationMixer(cloned);
          this.walkAction = mixer.clipAction(rotWalkClip);
          this.activeMixer = mixer;
        }
      }
    }

    this.activeVisualRoot = visualWrapper;
    this.walkPhase = 0;
    this.idleClock = 0;
    this.moveWeight = 0;
    this.bikeWeight = 0;

    this.setFallbackVisible(false);
    this.mountGroup.visible = true;
  }

  private setClipRole(role: 'none' | 'idle' | 'walk' | 'run'): void {
    if (this.activeClipRole === role) return;
    const prevAction =
      this.activeClipRole === 'idle'
        ? this.idleAction
        : this.activeClipRole === 'walk'
          ? this.walkAction
          : this.activeClipRole === 'run'
            ? this.runAction
            : null;
    const nextAction =
      role === 'idle'
        ? this.idleAction
        : role === 'walk'
          ? this.walkAction
          : role === 'run'
            ? this.runAction
            : null;

    if (nextAction) {
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.setEffectiveWeight(1);
      nextAction.play();
      if (prevAction && prevAction !== nextAction) {
        prevAction.crossFadeTo(nextAction, 0.16, false);
      }
    } else if (prevAction) {
      prevAction.fadeOut(0.14);
    }
    this.activeClipRole = role;
  }

  private applyDriverEuler(
    role: RigRole,
    pitchRad: number,
    yawRad: number,
    rollRad: number,
    weight: number = 1
  ): void {
    const drv = this.drivers[role];
    if (!drv) return;
    this.tmpQuatTarget.copy(drv.restQuat);
    if (Math.abs(pitchRad) > 1e-4) {
      this.tmpQuatA.setFromAxisAngle(drv.localPitchAxis, pitchRad);
      this.tmpQuatTarget.multiply(this.tmpQuatA);
    }
    if (Math.abs(yawRad) > 1e-4) {
      this.tmpQuatB.setFromAxisAngle(drv.localYawAxis, yawRad);
      this.tmpQuatTarget.multiply(this.tmpQuatB);
    }
    if (Math.abs(rollRad) > 1e-4) {
      this.tmpQuatA.setFromAxisAngle(drv.localRollAxis, rollRad);
      this.tmpQuatTarget.multiply(this.tmpQuatA);
    }
    if (weight >= 0.999) {
      drv.bone.quaternion.copy(this.tmpQuatTarget);
    } else {
      drv.bone.quaternion.slerp(this.tmpQuatTarget, THREE.MathUtils.clamp(weight, 0, 1));
    }
  }

  /**
   * Zero-allocation Analytic 2-Bone IK solver in mountGroup local space.
   * Aligns rootBone -> midBone -> endBone so endBone reaches targetInMount
   * with the mid joint (elbow or knee) bent cleanly toward poleDirInMount.
   */
  private solveTwoBoneIk(
    rootRole: RigRole,
    midRole: RigRole,
    endRole: RigRole,
    targetInMount: THREE.Vector3,
    poleDirInMount: THREE.Vector3
  ): void {
    const rootBone = this.drivers[rootRole]?.bone;
    const midBone = this.drivers[midRole]?.bone;
    const endBone = this.drivers[endRole]?.bone;
    if (!rootBone || !midBone || !endBone) return;

    this.mountGroup.updateMatrixWorld(true);
    this.ikInvMountMat.copy(this.mountGroup.matrixWorld).invert();
    this.mountGroup.getWorldQuaternion(this.ikMountWorldQ);
    this.ikMountWorldQInv.copy(this.ikMountWorldQ).invert();

    rootBone.getWorldPosition(this.ikPosA).applyMatrix4(this.ikInvMountMat);
    midBone.getWorldPosition(this.ikPosB).applyMatrix4(this.ikInvMountMat);
    endBone.getWorldPosition(this.ikPosC).applyMatrix4(this.ikInvMountMat);

    const len1 = this.ikPosB.distanceTo(this.ikPosA);
    const len2 = this.ikPosC.distanceTo(this.ikPosB);
    if (len1 < 1e-4 || len2 < 1e-4) return;

    this.ikToTarget.subVectors(targetInMount, this.ikPosA);
    const rawDist = this.ikToTarget.length();
    if (rawDist < 1e-4) return;

    const minDist = Math.abs(len1 - len2) + 0.015;
    const maxDist = (len1 + len2) * 0.992;
    const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);
    this.ikDir.copy(this.ikToTarget).divideScalar(rawDist);

    const cosAlpha = THREE.MathUtils.clamp(
      (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist),
      -1,
      1
    );
    const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

    // Orthogonalize pole direction against root->target axis
    const poleDot = poleDirInMount.dot(this.ikDir);
    this.ikBendDir.copy(poleDirInMount).addScaledVector(this.ikDir, -poleDot);
    if (this.ikBendDir.lengthSq() < 1e-5) {
      this.ikBendDir.set(0, 0, -1).addScaledVector(this.ikDir, this.ikDir.z);
    }
    this.ikBendDir.normalize();

    // Desired mid-joint position in mountGroup space
    this.ikDesiredMid
      .copy(this.ikPosA)
      .addScaledVector(this.ikDir, len1 * cosAlpha)
      .addScaledVector(this.ikBendDir, len1 * sinAlpha);

    this.ikCurUpper.subVectors(this.ikPosB, this.ikPosA).normalize();
    this.ikDesUpper.subVectors(this.ikDesiredMid, this.ikPosA).normalize();

    // Rotate rootBone so upper segment points toward desired mid-joint
    this.ikDeltaMount.setFromUnitVectors(this.ikCurUpper, this.ikDesUpper);
    rootBone.getWorldQuaternion(this.ikBoneWorldQ);
    this.ikBoneInMount.copy(this.ikMountWorldQInv).multiply(this.ikBoneWorldQ);
    this.ikBoneInMountInv.copy(this.ikBoneInMount).invert();
    this.ikLocalDelta
      .copy(this.ikBoneInMountInv)
      .multiply(this.ikDeltaMount)
      .multiply(this.ikBoneInMount);
    rootBone.quaternion.multiply(this.ikLocalDelta);

    // Update chain world matrices and rotate midBone so endBone lands directly on target
    rootBone.updateMatrixWorld(true);
    midBone.getWorldPosition(this.ikPosB).applyMatrix4(this.ikInvMountMat);
    endBone.getWorldPosition(this.ikPosC).applyMatrix4(this.ikInvMountMat);

    this.ikCurLower.subVectors(this.ikPosC, this.ikPosB).normalize();
    this.ikDesLower
      .copy(this.ikPosA)
      .addScaledVector(this.ikDir, dist)
      .sub(this.ikPosB)
      .normalize();

    this.ikDeltaMount.setFromUnitVectors(this.ikCurLower, this.ikDesLower);
    midBone.getWorldQuaternion(this.ikBoneWorldQ);
    this.ikBoneInMount.copy(this.ikMountWorldQInv).multiply(this.ikBoneWorldQ);
    this.ikBoneInMountInv.copy(this.ikBoneInMount).invert();
    this.ikLocalDelta
      .copy(this.ikBoneInMountInv)
      .multiply(this.ikDeltaMount)
      .multiply(this.ikBoneInMount);
    midBone.quaternion.multiply(this.ikLocalDelta);
  }

  public update(input: PlayerAvatarMotionInput): void {
    if (this.activeCharacterId === 'default' || !this.activeVisualRoot) {
      return;
    }

    // Align mountGroup position cleanly so every character's pelvis sits flush on the motorbike saddle
    if (input.isRidingBike) {
      this.mountGroup.position.set(0, this.seatedOffsetY, this.seatedOffsetZ);
    } else if (this.isSharedExternalClips) {
      let targetGroundOffset = 0;
      if (this.activeDef.id === 'gojo') {
        targetGroundOffset = this.activeClipRole === 'run' ? -0.12 : 0;
      } else if (this.activeDef.id === 'luffy_gear5') {
        targetGroundOffset =
          this.activeClipRole === 'run' ? -0.14 : this.activeClipRole === 'walk' ? -0.02 : -0.03;
      } else {
        targetGroundOffset =
          this.activeClipRole === 'run' ? -0.16 : this.activeClipRole === 'walk' ? -0.06 : -0.05;
      }
      const alpha = Math.min(1, Math.min(0.05, Math.max(0, input.delta)) * 14);
      this.sharedClipOffsetY = THREE.MathUtils.lerp(this.sharedClipOffsetY, targetGroundOffset, alpha);
      this.mountGroup.position.set(0, this.sharedClipOffsetY, 0);
    } else {
      this.mountGroup.position.set(0, 0, 0);
    }

    if (!input.visible) {
      return;
    }

    const dt = Math.min(0.05, Math.max(0, input.delta));
    this.idleClock += dt;

    const targetBike = input.isRidingBike ? 1 : 0;
    this.bikeWeight = THREE.MathUtils.lerp(this.bikeWeight, targetBike, Math.min(1, dt * 14));

    const targetMove = !input.isRidingBike && input.isMoving ? 1 : 0;
    this.moveWeight = THREE.MathUtils.lerp(this.moveWeight, targetMove, Math.min(1, dt * 12));

    if (input.isMoving && !input.isRidingBike) {
      this.walkPhase += Math.max(dt * 4.2, input.moveDistance * 3.1);
    }

    // Unified seated motorbike IK pose across ALL 5 GLB characters
    if (input.isRidingBike) {
      if (this.activeMixer && this.activeClipRole !== 'none') {
        this.activeMixer.stopAllAction();
        this.activeClipRole = 'none';
      }
      this.applySeatedBikePose(input.steerAngle);
      return;
    }

    const rigKind = this.activeDef.rigKind;

    // 1. Native & Shared/Retargeted Mixamo clip characters (Naruto, Itachi, Luffy Gear 5, Gojo)
    if ((rigKind === 'mixamo_clip' || rigKind === 'gojo_standing') && this.activeMixer) {
      const desiredRole = input.isMoving ? (input.isSprinting && this.runAction ? 'run' : 'walk') : 'idle';
      this.setClipRole(desiredRole);
      const speedScale = input.isSprinting ? 1.25 : 1.0;
      if (this.walkAction) this.walkAction.timeScale = speedScale;
      if (this.runAction) this.runAction.timeScale = speedScale;
      this.activeMixer.update(dt);
      return;
    }

    // 2. Mixamo Rotation-Only Walk + Clean Pose Idle (Luffy Gear 5)
    if (rigKind === 'mixamo_rot_walk' && this.activeMixer) {
      if (input.isMoving && this.walkAction) {
        this.setClipRole('walk');
        this.walkAction.timeScale = input.isSprinting ? 1.32 : 1.02;
        this.activeMixer.update(dt);
      } else {
        if (this.activeClipRole !== 'none') {
          this.activeMixer.stopAllAction();
          this.activeClipRole = 'none';
          this.restoreFullRestPose();
        }
        const breath = Math.sin(this.idleClock * 2.1) * 0.018;
        const relax = Math.min(1, dt * 10);
        this.applyDriverEuler('hips', 0, 0, 0, relax);
        this.applyDriverEuler('spine', -breath, 0, 0, relax);
        this.applyDriverEuler('head', breath * 0.5, 0, 0, relax);
        this.applyDriverEuler('leftArm', 0, 0, 0, relax);
        this.applyDriverEuler('rightArm', 0, 0, 0, relax);
        this.applyDriverEuler('leftForeArm', 0.08, 0, 0, relax);
        this.applyDriverEuler('rightForeArm', 0.08, 0, 0, relax);
        this.applyDriverEuler('leftUpLeg', 0, 0, 0, relax);
        this.applyDriverEuler('rightUpLeg', 0, 0, 0, relax);
        this.applyDriverEuler('leftLeg', 0, 0, 0, relax);
        this.applyDriverEuler('rightLeg', 0, 0, 0, relax);
      }
      return;
    }

    // 3. Procedural Walk & Calm Standing Idle (Gojo stands composed & dance-free!)
    const swing = Math.sin(this.walkPhase) * 0.54 * this.moveWeight;
    const isGojo = this.activeDef.id === 'gojo';
    const idleBreath = isGojo ? Math.sin(this.idleClock * 1.6) * 0.008 : Math.sin(this.idleClock * 2.2) * 0.016;
    const blend = Math.min(1, dt * 14);

    // Legs walk cycle (+pitch around +X swings downward limb forward toward -Z; -pitch bends knee backward)
    this.applyDriverEuler('leftUpLeg', swing, 0, 0, blend);
    this.applyDriverEuler('rightUpLeg', -swing, 0, 0, blend);
    this.applyDriverEuler('leftLeg', -Math.max(0, -swing) * 0.62 - 0.03 * this.moveWeight, 0, 0, blend);
    this.applyDriverEuler('rightLeg', -Math.max(0, swing) * 0.62 - 0.03 * this.moveWeight, 0, 0, blend);

    // Natural opposing arm swing & relaxed elbow
    this.applyDriverEuler('leftArm', -swing * 0.65, 0, 0, blend);
    this.applyDriverEuler('rightArm', swing * 0.65, 0, 0, blend);
    this.applyDriverEuler('leftForeArm', 0.14 * this.moveWeight + Math.max(0, -swing) * 0.22 + 0.05, 0, 0, blend);
    this.applyDriverEuler('rightForeArm', 0.14 * this.moveWeight + Math.max(0, swing) * 0.22 + 0.05, 0, 0, blend);

    this.applyDriverEuler('hips', 0, 0, 0, blend);
    this.applyDriverEuler('spine', -idleBreath - 0.04 * this.moveWeight, 0, 0, blend);
    this.applyDriverEuler('head', idleBreath * 0.5, 0, 0, blend);
  }

  private applySeatedBikePose(steerAngle: number): void {
    const steer = THREE.MathUtils.clamp(steerAngle, -0.5, 0.5);

    // 1. Reset full skeleton to clean standing rest pose so no stale walk/run clavicle or spine twists leak in
    this.restoreFullRestPose();

    // 2. Lean torso naturally forward toward handlebars (-pitch tilts +Y torso toward -Z), turn shoulders subtly into steer, and keep head level
    this.applyDriverEuler('hips', -0.18, 0, 0, 1);
    this.applyDriverEuler('spine', -0.38, steer * 0.34, 0, 1);
    this.applyDriverEuler('head', 0.48, steer * 0.20, 0, 1);

    // 3. Solve exact 2-Bone IK for both legs straddling the fuel tank onto the left/right footboards
    const offY = this.mountGroup.position.y;
    const offZ = this.mountGroup.position.z;

    // Footboard top is at Y=0.283, X=±0.21, Z=-0.20 in playerMesh space; ankle sits ~8cm above sole
    this.ikTargetVec.set(-0.215, 0.365 - offY, -0.20 - offZ);
    this.ikPoleVec.set(-0.28, 0.20, -0.94).normalize();
    this.solveTwoBoneIk('leftUpLeg', 'leftLeg', 'leftFoot', this.ikTargetVec, this.ikPoleVec);

    this.ikTargetVec.set(0.215, 0.365 - offY, -0.20 - offZ);
    this.ikPoleVec.set(0.28, 0.20, -0.94).normalize();
    this.solveTwoBoneIk('rightUpLeg', 'rightLeg', 'rightFoot', this.ikTargetVec, this.ikPoleVec);

    // 4. Solve exact 2-Bone IK for both arms gripping the steering-rotated handlebars
    // Motorbike steerPivot is at (0, 0.01, -0.60) in playerMesh space; grips sit at (±0.275, 0.968, 0.02) in steerPivot
    const cosS = Math.cos(steer);
    const sinS = Math.sin(steer);

    // Left wrist sits ~4.5cm behind & ~1.5cm above grip bar so palm/fingers wrap naturally around the rubber grip
    const leftGripX = -0.275 * cosS + 0.02 * sinS;
    const leftGripY = 0.988;
    const leftGripZ = -0.60 + 0.275 * sinS + 0.02 * cosS + 0.045;
    this.ikTargetVec.set(leftGripX, leftGripY - offY, leftGripZ - offZ);
    this.ikPoleVec.set(-0.55, -0.78, 0.28).normalize();
    this.solveTwoBoneIk('leftArm', 'leftForeArm', 'leftHand', this.ikTargetVec, this.ikPoleVec);

    const rightGripX = 0.275 * cosS + 0.02 * sinS;
    const rightGripY = 0.988;
    const rightGripZ = -0.60 - 0.275 * sinS + 0.02 * cosS + 0.045;
    this.ikTargetVec.set(rightGripX, rightGripY - offY, rightGripZ - offZ);
    this.ikPoleVec.set(0.55, -0.78, 0.28).normalize();
    this.solveTwoBoneIk('rightArm', 'rightForeArm', 'rightHand', this.ikTargetVec, this.ikPoleVec);
  }

  public dispose(): void {
    this.loadGeneration++;
    this.clearMountedModel();
    this.hostGroup.remove(this.mountGroup);
  }
}
