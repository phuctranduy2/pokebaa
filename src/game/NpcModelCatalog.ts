import type { HumanArchetypeId, HumanClipProfile } from './GlbHumanNpcSystem';

export interface NpcModelSpec {
  id: string;
  modelSource: HumanArchetypeId | string;
  targetHeight: number;
  clipProfile: HumanClipProfile;
  /** True for models that look natural standing/working (multi-clip, idle-only, or static pose). */
  suitableForStationary: boolean;
  /** True ONLY for models that sit cleanly (genuine forward-facing Sit clip). */
  suitableForSit: boolean;
  /** Optional Y rotation offset (radians) when raw GLB doesn't face +Z */
  rotationY?: number;
}

/**
 * 14 Quaternius CC0 low-poly character models (from Yametech12/ghostname-3d-assets),
 * locally optimized in /public/models/quaternius/*.glb (177–378 KB each, 0 textures, Idle/Walk/SitDown).
 * Heights are tuned per silhouette (hat/hardhat/bald) so shoulder & eye proportions stay uniform (~0.525x raw).
 */
export const ADULT_NPC_MODELS: readonly NpcModelSpec[] = [
  { id: 'Casual_Male', modelSource: '/models/quaternius/Casual_Male.glb', targetHeight: 1.73, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual_Female', modelSource: '/models/quaternius/Casual_Female.glb', targetHeight: 1.66, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual2_Male', modelSource: '/models/quaternius/Casual2_Male.glb', targetHeight: 1.67, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual2_Female', modelSource: '/models/quaternius/Casual2_Female.glb', targetHeight: 1.66, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual3_Male', modelSource: '/models/quaternius/Casual3_Male.glb', targetHeight: 1.67, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual_Bald', modelSource: '/models/quaternius/Casual_Bald.glb', targetHeight: 1.65, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Suit_Male', modelSource: '/models/quaternius/Suit_Male.glb', targetHeight: 1.73, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Suit_Female', modelSource: '/models/quaternius/Suit_Female.glb', targetHeight: 1.66, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'OldClassy_Male', modelSource: '/models/quaternius/OldClassy_Male.glb', targetHeight: 1.83, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'OldClassy_Female', modelSource: '/models/quaternius/OldClassy_Female.glb', targetHeight: 1.76, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Worker_Male', modelSource: '/models/quaternius/Worker_Male.glb', targetHeight: 1.73, clipProfile: 'multi', suitableForStationary: true, suitableForSit: false, rotationY: 0 },
  { id: 'Worker_Female', modelSource: '/models/quaternius/Worker_Female.glb', targetHeight: 1.71, clipProfile: 'multi', suitableForStationary: true, suitableForSit: false, rotationY: 0 },
];

export const DOCTOR_NPC_MODELS: readonly NpcModelSpec[] = [
  { id: 'Doctor_Male_Young', modelSource: '/models/quaternius/Doctor_Male_Young.glb', targetHeight: 1.73, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Doctor_Female_Young', modelSource: '/models/quaternius/Doctor_Female_Young.glb', targetHeight: 1.66, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
];

export const GUARD_NPC_MODEL: NpcModelSpec = {
  id: 'Suit_Male',
  modelSource: '/models/quaternius/Suit_Male.glb',
  targetHeight: 1.76,
  clipProfile: 'multi',
  suitableForStationary: true,
  suitableForSit: false,
  rotationY: 0,
};

export const WORKER_GUARD_NPC_MODEL: NpcModelSpec = {
  id: 'Worker_Male',
  modelSource: '/models/quaternius/Worker_Male.glb',
  targetHeight: 1.75,
  clipProfile: 'multi',
  suitableForStationary: true,
  suitableForSit: false,
  rotationY: 0,
};

export const TEACHER_NPC_MODEL: NpcModelSpec = {
  id: 'Suit_Female',
  modelSource: '/models/quaternius/Suit_Female.glb',
  targetHeight: 1.66,
  clipProfile: 'multi',
  suitableForStationary: true,
  suitableForSit: false,
  rotationY: 0,
};

/**
 * School student models (THPT Phan Chau Trinh) using crisp Quaternius rigs scaled to teen height.
 */
export const CHILD_NPC_MODELS: readonly NpcModelSpec[] = [
  { id: 'Casual_Male', modelSource: '/models/quaternius/Casual_Male.glb', targetHeight: 1.58, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual_Female', modelSource: '/models/quaternius/Casual_Female.glb', targetHeight: 1.54, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual2_Male', modelSource: '/models/quaternius/Casual2_Male.glb', targetHeight: 1.56, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
  { id: 'Casual2_Female', modelSource: '/models/quaternius/Casual2_Female.glb', targetHeight: 1.54, clipProfile: 'multi', suitableForStationary: true, suitableForSit: true, rotationY: 0 },
];

export const STATIONARY_ADULT_NPC_MODELS: readonly NpcModelSpec[] = ADULT_NPC_MODELS.filter(
  (m) => m.suitableForStationary
);

export const SEATED_ADULT_NPC_MODELS: readonly NpcModelSpec[] = ADULT_NPC_MODELS.filter(
  (m) => m.suitableForSit
);

/**
 * Mixed outside pedestrian & customer pool using all 12 civilian/suit/classy/worker Quaternius models.
 */
export const OUTSIDE_MIXED_NPC_MODELS: readonly NpcModelSpec[] = ADULT_NPC_MODELS;

export const CASHIER_NPC_MODEL: NpcModelSpec = {
  id: 'Suit_Female',
  modelSource: '/models/quaternius/Suit_Female.glb',
  targetHeight: 1.66,
  clipProfile: 'multi',
  suitableForStationary: true,
  suitableForSit: false,
  rotationY: 0,
};

/**
 * Preload list of all 14 local Quaternius CC0 NPC GLBs for bounded queue preloading.
 */
export const ALL_EXTERNAL_NPC_URLS: readonly string[] = [
  ...ADULT_NPC_MODELS.map((m) => m.modelSource),
  ...DOCTOR_NPC_MODELS.map((m) => m.modelSource),
];

function safeIdx(seed: number, len: number): number {
  return ((Math.abs(Math.floor(seed)) % len) + len) % len;
}

export function pickSchoolStudentModel(seed: number): NpcModelSpec {
  return CHILD_NPC_MODELS[safeIdx(seed, CHILD_NPC_MODELS.length)];
}

export function pickDoctorNpcModel(seed: number): NpcModelSpec {
  return DOCTOR_NPC_MODELS[safeIdx(seed, DOCTOR_NPC_MODELS.length)];
}

export function pickOutsideNpcModel(seed: number): NpcModelSpec {
  return OUTSIDE_MIXED_NPC_MODELS[safeIdx(seed, OUTSIDE_MIXED_NPC_MODELS.length)];
}

export function pickShopCustomerModel(seed: number): NpcModelSpec {
  return OUTSIDE_MIXED_NPC_MODELS[safeIdx(seed, OUTSIDE_MIXED_NPC_MODELS.length)];
}

export function pickStationaryCivilianModel(seed: number): NpcModelSpec {
  return STATIONARY_ADULT_NPC_MODELS[safeIdx(seed, STATIONARY_ADULT_NPC_MODELS.length)];
}

export function pickSeatedCivilianModel(seed: number): NpcModelSpec {
  return SEATED_ADULT_NPC_MODELS[safeIdx(seed, SEATED_ADULT_NPC_MODELS.length)];
}
