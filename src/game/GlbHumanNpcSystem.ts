import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getContactShadowResources, getHumanSlotTexture } from './VisualPolishSystem';
import { shouldNpcCarryRainUmbrella } from './WeatherSystem';

export type HumanArchetypeId =
  | 'student_male'
  | 'student_female'
  | 'teacher_aodai'
  | 'staff_casual'
  | 'guard_officer'
  | 'doctor_coat';

export type HumanAnimState =
  | 'Idle'
  | 'Walk'
  | 'Sit'
  | 'Lecture'
  | 'Wave'
  | 'Checkout'
  | 'Carry'
  | 'CarryWalk'
  | 'PickUp'
  | 'Stock'
  | 'CarryBasket'
  | 'WalkBasket'
  | 'PickShelf'
  | 'InspectItem'
  | 'DropBasket'
  | 'Attack'
  | 'Surrender'
  | 'FilmPhone';

/**
 * Describes what animation clips a GLB asset ships with:
 * - 'multi': dedicated Idle + Walk (+ optional Sit/Talk) clips
 * - 'idle_only': only Idle clip (uses procedural leg/arm Walk & Sit overlays)
 * - 'walk_only': only Walk/Run clip (pauses at neutral frame when Idle/Sit)
 * - 'static': 0s pose clip (uses procedural Walk, Sit & Idle breathing overlays)
 */
export type HumanClipProfile = 'multi' | 'idle_only' | 'walk_only' | 'static';

export interface HumanPaletteOverride {
  shirt?: number;
  pants?: number;
  hair?: number;
  skin?: number;
  shoes?: number;
  accent?: number;
  suit?: number;
}

export interface AttachGlbHumanOptions {
  /** Archetype id from /models/{id}.glb */
  modelSource: HumanArchetypeId | string;
  /** Wrapper group that receives the loaded GLB model */
  hostGroup: THREE.Group;
  /** Optional lightweight fallback meshes hidden whenever LOD0 GLB is active */
  fallbackMeshes?: THREE.Object3D[];
  /** Custom uniform/hair/skin color overrides (only applies to built-in slot-named meshes) */
  palette?: HumanPaletteOverride;
  /** Scale multiplier (defaults to 1.0) */
  scale?: number;
  /** Auto-fit external GLB height in meters (defaults to 1.72m for external URLs, 0 for built-in) */
  targetHeight?: number;
  /** Optional Y rotation offset (radians) if external GLB doesn't face +Z by default */
  rotationY?: number;
  /** Distance within which GLB + AnimationMixer actively runs (defaults to 38m for crowd perf) */
  lodMixerRadius?: number;
  /** Initial clip state */
  initialState?: HumanAnimState;
  /** Clip profile hint so walk-only or static 0s models behave naturally */
  clipProfile?: HumanClipProfile;
  /** Random start phase offset so crowds don't walk in unison */
  phaseOffset?: number;
  /** Enable shadows on skinned meshes (default false for high-FPS crowd rendering) */
  castShadow?: boolean;
  /** Allow NPC to carry an umbrella outdoors while walking in rain (default true) */
  allowRainUmbrella?: boolean;
  /** Optional hook invoked once the GLB skeleton/model clone is mounted */
  onModelMounted?: (modelRoot: THREE.Object3D) => void;
}

export interface GlbHumanHandle {
  setAnimState: (state: HumanAnimState, timeScale?: number) => void;
  setVisible: (vis: boolean) => void;
  isLoaded: () => boolean;
  hasActiveUmbrella: () => boolean;
  dispose: () => void;
}

interface TemplateFitMetrics {
  rawHeight: number;
  rawCenterX: number;
  rawMinY: number;
  rawCenterZ: number;
}

type CalmWalkBoneRole = 'leftArm' | 'rightArm' | 'leftForeArm' | 'rightForeArm' | 'spine2' | 'spine' | 'head';

interface CalmWalkTarget {
  bone: THREE.Object3D;
  restQuat: THREE.Quaternion;
  blend: number;
}

interface TaskPoseState {
  lWeight: number;
  rWeight: number;
  bodyWeight: number;
  lU: [number, number, number];
  lL: [number, number, number];
  rU: [number, number, number];
  rL: [number, number, number];
  sp: [number, number, number];
  hd: [number, number, number];
}

interface LoadedTemplate {
  gltf: GLTF;
  clipMap: Map<string, THREE.AnimationClip>;
  maxClipDuration: number;
  fit: TemplateFitMetrics;
  idleCalmQuats: Partial<Record<CalmWalkBoneRole, THREE.Quaternion>> | null;
}

const ARCHETYPE_SET = new Set<string>([
  'student_male',
  'student_female',
  'teacher_aodai',
  'staff_casual',
  'guard_officer',
  'doctor_coat',
]);

function resolveModelUrl(source: HumanArchetypeId | string): string {
  if (ARCHETYPE_SET.has(source)) {
    return `/models/${source}.glb`;
  }
  return source;
}

const sharedSlotMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
function getCachedMaterial(slotName: string, hex: number): THREE.MeshStandardMaterial {
  const key = `${slotName}:${hex}`;
  let mat = sharedSlotMaterialCache.get(key);
  if (!mat) {
    const texKind =
      slotName === 'pants_mesh'
        ? 'pants'
        : slotName === 'shirt_mesh' || slotName === 'accent_mesh'
          ? 'shirt'
          : slotName === 'skin_mesh'
            ? 'skin'
            : slotName === 'hair_mesh'
              ? 'hair'
              : slotName === 'shoes_mesh' || slotName === 'belt_mesh'
                ? 'shoes'
                : null;
    const map = texKind ? getHumanSlotTexture(texKind) : null;
    mat = new THREE.MeshStandardMaterial({
      color: hex,
      map: map ?? undefined,
      roughness:
        slotName === 'shoes_mesh' || slotName === 'belt_mesh'
          ? 0.50
          : slotName === 'hair_mesh'
            ? 0.84
            : slotName === 'pants_mesh'
              ? 0.86
              : slotName === 'skin_mesh'
                ? 0.66
                : 0.80,
      metalness: 0.02,
      envMapIntensity: slotName === 'skin_mesh' ? 0.32 : slotName === 'shoes_mesh' ? 0.48 : 0.42,
    });
    sharedSlotMaterialCache.set(key, mat);
  }
  return mat;
}

function getFlatCachedMaterial(slotKey: string, hex: number): THREE.MeshStandardMaterial {
  const key = `flat:${slotKey}:${hex}`;
  let mat = sharedSlotMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: hex,
      roughness:
        slotKey === 'belt' || slotKey === 'shoes'
          ? 0.52
          : slotKey === 'sole'
            ? 0.82
            : slotKey === 'eyewhite' || slotKey === 'face'
              ? 0.44
              : slotKey === 'mouth'
                ? 0.65
                : slotKey === 'sock'
                  ? 0.88
                  : slotKey === 'hair'
                    ? 0.84
                    : slotKey === 'pants'
                      ? 0.86
                      : slotKey === 'skin'
                        ? 0.66
                        : 0.80,
      metalness: 0.02,
      envMapIntensity: slotKey === 'skin' || slotKey === 'eyewhite' ? 0.30 : 0.40,
    });
    sharedSlotMaterialCache.set(key, mat);
  }
  return mat;
}

interface RigBoneSet {
  hips?: THREE.Object3D;
  spine?: THREE.Object3D;
  spine2?: THREE.Object3D;
  head?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  leftForeArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  rightForeArm?: THREE.Object3D;
  leftUpLeg?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightUpLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
}

interface ActiveGlbNpcRecord {
  hostGroup: THREE.Group;
  fallbackMeshes: THREE.Object3D[];
  modelRoot: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  hasClips: boolean;
  clipProfile: HumanClipProfile;
  hasDedicatedWalkClip: boolean;
  hasDedicatedIdleClip: boolean;
  hasDedicatedSitClip: boolean;
  hasSitDownClip: boolean;
  hasDedicatedCheckoutClip: boolean;
  rigBones: RigBoneSet | null;
  idleCalmQuats: Partial<Record<CalmWalkBoneRole, THREE.Quaternion>> | null;
  idleCalmTargets: CalmWalkTarget[];
  taskPose: TaskPoseState;
  prevBoneOverlays: Map<THREE.Object3D, THREE.Quaternion>;
  walkOverlayWeight: number;
  sitOverlayWeight: number;
  sitOffsetWeight: number;
  checkoutOverlayWeight: number;
  staticClock: number;
  pendingDt: number;
  actions: Map<HumanAnimState, THREE.AnimationAction>;
  currentState: HumanAnimState;
  targetState: HumanAnimState;
  timeScale: number;
  lodMixerRadiusSq: number;
  lodModelRadiusSq: number;
  phaseOffset: number;
  visible: boolean;
  lastShowGlb: boolean | null;
  lastDistSq: number;
  disposed: boolean;
  worldPos: THREE.Vector3;
  isQuaterniusRig: boolean;
  allowRainUmbrella: boolean;
  umbrellaColorIdx: number;
  umbrellaActive: boolean;
  umbrellaGroup: THREE.Group | null;
  rightHandBone: THREE.Object3D | null;
  onModelMounted?: (modelRoot: THREE.Object3D) => void;
}

// Distance-LOD & Active-Mixer Budgets (configurable per Graphics Quality preset)
export interface GlbNpcQualityBudget {
  maxVisibleModels: number;
  maxModelRadius: number;
  maxMixerRadius: number;
  maxClosePriorityMixers: number;
  maxWalkFullRateMixers: number;
  maxStationaryFullMixers: number;
  maxStaggeredMixers: number;
}

const CLOSE_WALK_DIST_SQ = 18 * 18;
const CLOSE_STATIONARY_DIST_SQ = 10 * 10;
let _maxVisibleModels = 12;
let _maxModelRadiusSq = 26 * 26;
let _maxMixerRadiusSq = 24 * 24;
let _maxClosePriorityMixers = 12;
let _maxWalkFullRateMixers = 14;
let _maxStationaryFullMixers = 4;
let _maxStaggeredMixers = 26;
let _budgetVersion = 0;
let _lastAppliedBudgetVersion = -1;
const MAX_CONCURRENT_LOADS = 4;

export function setGlbNpcQualityBudget(budget: Partial<GlbNpcQualityBudget>): void {
  if (budget.maxVisibleModels !== undefined) {
    _maxVisibleModels = Math.max(2, Math.floor(budget.maxVisibleModels));
  }
  if (budget.maxModelRadius !== undefined) {
    const r = Math.max(8, budget.maxModelRadius);
    _maxModelRadiusSq = r * r;
  }
  if (budget.maxMixerRadius !== undefined) {
    const r = Math.max(8, budget.maxMixerRadius);
    _maxMixerRadiusSq = r * r;
  }
  if (budget.maxClosePriorityMixers !== undefined) {
    _maxClosePriorityMixers = Math.max(2, Math.floor(budget.maxClosePriorityMixers));
  }
  if (budget.maxWalkFullRateMixers !== undefined) {
    _maxWalkFullRateMixers = Math.max(2, Math.floor(budget.maxWalkFullRateMixers));
  }
  if (budget.maxStationaryFullMixers !== undefined) {
    _maxStationaryFullMixers = Math.max(1, Math.floor(budget.maxStationaryFullMixers));
  }
  if (budget.maxStaggeredMixers !== undefined) {
    _maxStaggeredMixers = Math.max(4, Math.floor(budget.maxStaggeredMixers));
  }
  _budgetVersion++;
}

// Pre-allocated zero-GC buffers for closest-N visible GLB SkinnedMesh selection
let _visCandIdx = new Int32Array(256);
let _visCandDistSq = new Float64Array(256);
let _visCandInFrustum = new Uint8Array(256);

const loaderInstance = new GLTFLoader();
loaderInstance.setCrossOrigin('anonymous');
const loadedTemplates = new Map<string, LoadedTemplate>();
const loadingPromises = new Map<string, Promise<LoadedTemplate | null>>();
const pendingMounts = new Map<string, Array<() => void>>();
const activeGlbRecords: ActiveGlbNpcRecord[] = [];

// Bounded download/parse queue so 13+ models never freeze the main thread simultaneously
const loadQueue: Array<{ url: string; resolve: (tpl: LoadedTemplate | null) => void }> = [];
let activeLoadCount = 0;

function pumpLoadQueue(): void {
  while (activeLoadCount < MAX_CONCURRENT_LOADS && loadQueue.length > 0) {
    const job = loadQueue.shift()!;
    activeLoadCount++;
    loaderInstance.load(
      job.url,
      (gltf) => {
        activeLoadCount--;
        const clipMap = buildClipMap(gltf.animations);
        let maxClipDuration = 0;
        for (const c of gltf.animations) {
          if (c.duration > maxClipDuration) maxClipDuration = c.duration;
        }
        const { fit, idleCalmQuats } = computeTemplateFitOnce(gltf, clipMap);
        const tpl: LoadedTemplate = { gltf, clipMap, maxClipDuration, fit, idleCalmQuats };
        loadedTemplates.set(job.url, tpl);
        const cbs = pendingMounts.get(job.url);
        if (cbs) {
          pendingMounts.delete(job.url);
          for (let i = 0; i < cbs.length; i++) cbs[i]();
        }
        job.resolve(tpl);
        pumpLoadQueue();
      },
      undefined,
      () => {
        activeLoadCount--;
        pendingMounts.delete(job.url);
        job.resolve(null);
        pumpLoadQueue();
      }
    );
  }
}

function computeTemplateFitOnce(
  gltf: GLTF,
  clipMap: Map<string, THREE.AnimationClip>
): { fit: TemplateFitMetrics; idleCalmQuats: Partial<Record<CalmWalkBoneRole, THREE.Quaternion>> | null } {
  const probe = SkeletonUtils.clone(gltf.scene);
  let tmpMixer: THREE.AnimationMixer | null = null;
  if (gltf.animations.length > 0) {
    tmpMixer = new THREE.AnimationMixer(probe);
    const act = tmpMixer.clipAction(gltf.animations[0]);
    act.play();
    tmpMixer.update(0);
  }
  probe.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(probe, true);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const rawCenter = rawBox.getCenter(new THREE.Vector3());

  let idleCalmQuats: Partial<Record<CalmWalkBoneRole, THREE.Quaternion>> | null = null;
  const hasIdle = hasClipWithKeywords(clipMap, ['idle', 'stand', 'breath', 'alert']);
  const idleClip = hasIdle ? findMatchingClip(clipMap, gltf.animations, 'Idle') : null;
  if (idleClip) {
    if (!tmpMixer) {
      tmpMixer = new THREE.AnimationMixer(probe);
    } else if (idleClip !== gltf.animations[0]) {
      tmpMixer.stopAllAction();
    }
    if (idleClip !== gltf.animations[0] || gltf.animations.length > 0) {
      const idleAct = tmpMixer.clipAction(idleClip);
      idleAct.reset().play();
      tmpMixer.update(0);
    }
    const probeBones = detectRigBones(probe);
    if (probeBones) {
      idleCalmQuats = {};
      if (probeBones.leftArm) idleCalmQuats.leftArm = probeBones.leftArm.quaternion.clone();
      if (probeBones.rightArm) idleCalmQuats.rightArm = probeBones.rightArm.quaternion.clone();
      if (probeBones.leftForeArm) idleCalmQuats.leftForeArm = probeBones.leftForeArm.quaternion.clone();
      if (probeBones.rightForeArm) idleCalmQuats.rightForeArm = probeBones.rightForeArm.quaternion.clone();
      if (probeBones.spine2) idleCalmQuats.spine2 = probeBones.spine2.quaternion.clone();
      if (probeBones.spine) idleCalmQuats.spine = probeBones.spine.quaternion.clone();
      if (probeBones.head) idleCalmQuats.head = probeBones.head.quaternion.clone();
    }
  }

  return {
    fit: {
      rawHeight: rawSize.y,
      rawCenterX: rawCenter.x,
      rawMinY: rawBox.min.y,
      rawCenterZ: rawCenter.z,
    },
    idleCalmQuats,
  };
}

// Reusable math helpers (Zero GC in per-frame tick)
const _tmpCam = new THREE.Vector3();
const _projScreenMatrix = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const _frustumSphere = new THREE.Sphere(new THREE.Vector3(), 1.35);
const _tmpOverlayEuler = new THREE.Euler();
const _tmpOverlayQuat = new THREE.Quaternion();
const _tmpUndoQuat = new THREE.Quaternion();
const _taskEuler = new THREE.Euler();
const _taskDeltaQuat = new THREE.Quaternion();
const _taskTargetQuat = new THREE.Quaternion();
const _tmpHandPos = new THREE.Vector3();
let _frameCounter = 0;
let _globalRainActive = false;

export function setGlobalNpcRainActive(active: boolean): void {
  _globalRainActive = active;
}

export function isGlobalNpcRainActive(): boolean {
  return _globalRainActive;
}

interface UmbrellaStyleSpec {
  id: string;
  primary: string;
  secondary: string;
  trim: string;
  pattern: 'piped' | 'twotone' | 'pinstripe' | 'clear';
  opacity?: number;
  roughness: number;
}

const UMBRELLA_STYLE_SPECS: readonly UmbrellaStyleSpec[] = [
  { id: 'navy_ivory', primary: '#1d3566', secondary: '#162950', trim: '#e2e8f0', pattern: 'piped', roughness: 0.42 },
  { id: 'clear_frosted', primary: '#e0f2fe', secondary: '#bae6fd', trim: '#f8fafc', pattern: 'clear', opacity: 0.54, roughness: 0.14 },
  { id: 'cream_navy_gore', primary: '#f1ede4', secondary: '#1e3a5f', trim: '#cbd5e1', pattern: 'twotone', roughness: 0.44 },
  { id: 'bordeaux_gold', primary: '#7f1d2e', secondary: '#631422', trim: '#eab308', pattern: 'piped', roughness: 0.40 },
  { id: 'emerald_sage', primary: '#0f5c4d', secondary: '#0b473b', trim: '#e2e8f0', pattern: 'piped', roughness: 0.42 },
  { id: 'sakura_clear', primary: '#fce7f3', secondary: '#fbcfe8', trim: '#f472b6', pattern: 'clear', opacity: 0.56, roughness: 0.15 },
  { id: 'obsidian_pinstripe', primary: '#1e222b', secondary: '#14171f', trim: '#cbd5e1', pattern: 'pinstripe', roughness: 0.36 },
  { id: 'sky_white_gore', primary: '#0284c7', secondary: '#f8fafc', trim: '#e0f2fe', pattern: 'twotone', roughness: 0.40 },
  { id: 'camel_espresso', primary: '#b4743b', secondary: '#9a5f2d', trim: '#451a03', pattern: 'piped', roughness: 0.46 },
  { id: 'blossom_rose', primary: '#be185d', secondary: '#9d174d', trim: '#fce7f3', pattern: 'piped', roughness: 0.40 },
] as const;

const UMBRELLA_NUM_GORES = 8;
const UMBRELLA_CANOPY_RADIUS = 0.50;
const UMBRELLA_RIM_Y = 0.675;
const UMBRELLA_APEX_Y = 0.840;

function sampleUmbrellaDomeY(rNorm: number): number {
  const drop = Math.pow(rNorm, 1.82) * (UMBRELLA_APEX_Y - UMBRELLA_RIM_Y);
  return UMBRELLA_APEX_Y - drop;
}

function createUmbrellaCanopyTexture(spec: UmbrellaStyleSpec): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;
  const half = w * 0.5;

  // Base panels (gore A = u:[0..0.5], gore B = u:[0.5..1.0])
  ctx.fillStyle = spec.primary;
  ctx.fillRect(0, 0, half, h);
  ctx.fillStyle = spec.pattern === 'twotone' ? spec.secondary : spec.primary;
  ctx.fillRect(half, 0, half, h);

  // Subtle woven nylon weft/warp grain + radial dome shading from apex (y=0) to rim (y=h)
  const radGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (spec.pattern === 'clear') {
    radGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    radGrad.addColorStop(0.75, 'rgba(255,255,255,0.06)');
    radGrad.addColorStop(1, 'rgba(255,255,255,0.34)');
  } else {
    radGrad.addColorStop(0, 'rgba(255,255,255,0.14)');
    radGrad.addColorStop(0.55, 'rgba(0,0,0,0.0)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0.18)');
  }
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, w, h);

  if (spec.pattern !== 'clear') {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 4; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // Pinstripe accents for executive obsidian
  if (spec.pattern === 'pinstripe') {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
    for (const px of [half * 0.25, half * 0.5, half * 0.75, half * 1.25, half * 1.5, half * 1.75]) {
      ctx.fillRect(px - 1, 0, 2, h);
    }
  }

  // Soft rib-seam highlight & shadow lines along gore boundaries (x = 0, half, w)
  ctx.fillStyle = spec.pattern === 'clear' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, 3, h);
  ctx.fillRect(half - 2, 0, 4, h);
  ctx.fillRect(w - 3, 0, 3, h);

  // Scalloped hem piping border at v=0 (canvas bottom y = h)
  const trimHeight = spec.pattern === 'clear' ? 22 : 16;
  ctx.fillStyle = spec.trim;
  ctx.fillRect(0, h - trimHeight, w, trimHeight);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, h - trimHeight - 2, w, 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function buildUmbrellaCanopyGeometry(): THREE.BufferGeometry {
  const numGores = UMBRELLA_NUM_GORES;
  const angSub = 5;
  const radSteps = 7;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let g = 0; g < numGores; g++) {
    const theta0 = (g / numGores) * Math.PI * 2;
    const dTheta = (Math.PI * 2) / numGores;
    const uBase = (g % 2) * 0.5;
    const baseVertex = positions.length / 3;

    for (let rIdx = 0; rIdx <= radSteps; rIdx++) {
      const rNorm = rIdx / radSteps;
      const baseDomeY = sampleUmbrellaDomeY(rNorm);

      for (let s = 0; s <= angSub; s++) {
        const f = s / angSub;
        const theta = theta0 + f * dTheta;
        const arch = Math.sin(f * Math.PI); // 0 along ribs, 1 at mid-gore

        // Natural tension: slight inward draw along scalloped hem between ribs + gentle panel belly puff
        const rimPull = 1 - 0.032 * arch * Math.pow(rNorm, 2.2);
        const radius = rNorm * UMBRELLA_CANOPY_RADIUS * rimPull;
        const puffY = 0.0085 * arch * Math.sin(rNorm * Math.PI);
        const scallopY = 0.017 * arch * Math.pow(rNorm, 2.4);
        const ribDipY = -0.012 * (1 - arch) * Math.pow(rNorm, 2.8);
        const y = baseDomeY + puffY + scallopY + ribDipY;

        positions.push(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
        uvs.push(uBase + f * 0.5, 1 - rNorm);
      }
    }

    const rowStride = angSub + 1;
    for (let rIdx = 0; rIdx < radSteps; rIdx++) {
      for (let s = 0; s < angSub; s++) {
        const a = baseVertex + rIdx * rowStride + s;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildUmbrellaSegmentGeometry(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  radius: number,
  radialSegments: number = 5
): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, radialSegments, 1, true);
  const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mat = new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(mat);
  return geo;
}

function buildUmbrellaFrameGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Slim brushed steel central shaft (handle collar y=0.070 -> top rosette y=0.845)
  const shaft = new THREE.CylinderGeometry(0.0055, 0.0055, 0.775, 8);
  shaft.translate(0, 0.4575, 0);
  parts.push(shaft);

  // Sleek top rosette washer + short tapered ferrule tip
  const rosette = new THREE.CylinderGeometry(0.011, 0.025, 0.012, 12);
  rosette.translate(0, UMBRELLA_APEX_Y + 0.006, 0);
  parts.push(rosette);

  const ferrule = new THREE.CylinderGeometry(0.0024, 0.0075, 0.044, 8);
  ferrule.translate(0, UMBRELLA_APEX_Y + 0.032, 0);
  parts.push(ferrule);

  // Upper rib notch hub & sliding spring runner collar
  const topHub = new THREE.CylinderGeometry(0.013, 0.015, 0.018, 10);
  topHub.translate(0, UMBRELLA_APEX_Y - 0.018, 0);
  parts.push(topHub);

  const runnerY = 0.645;
  const runner = new THREE.CylinderGeometry(0.012, 0.012, 0.024, 10);
  runner.translate(0, runnerY, 0);
  parts.push(runner);

  // 8 underside curved rib spines, tip beads & diagonal stretcher spokes
  const radSplits = 3;
  for (let g = 0; g < UMBRELLA_NUM_GORES; g++) {
    const theta = (g / UMBRELLA_NUM_GORES) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    let prevPt = new THREE.Vector3(cosT * 0.012, UMBRELLA_APEX_Y - 0.016, sinT * 0.012);
    let midRibPt: THREE.Vector3 | null = null;

    for (let k = 1; k <= radSplits; k++) {
      const rNorm = k / radSplits;
      const r = rNorm * (UMBRELLA_CANOPY_RADIUS + 0.004);
      const y = sampleUmbrellaDomeY(rNorm) - 0.012 * Math.pow(rNorm, 2.8) - 0.005;
      const pt = new THREE.Vector3(cosT * r, y, sinT * r);
      parts.push(buildUmbrellaSegmentGeometry(prevPt, pt, 0.0032, 4));
      if (k === 1) midRibPt = pt.clone();
      prevPt = pt;
    }

    // Rib tip ferrule bead
    const tipBead = new THREE.SphereGeometry(0.0055, 5, 4);
    tipBead.translate(prevPt.x, prevPt.y, prevPt.z);
    parts.push(tipBead);

    // Stretcher spoke connecting runner sleeve to mid-rib
    if (midRibPt) {
      const runnerPt = new THREE.Vector3(cosT * 0.011, runnerY, sinT * 0.011);
      parts.push(buildUmbrellaSegmentGeometry(runnerPt, midRibPt, 0.0028, 4));
    }
  }

  const nonIndexed = parts.map((p) => p.toNonIndexed());
  const merged = mergeGeometries(nonIndexed, false);
  for (const p of parts) p.dispose();
  for (const n of nonIndexed) n.dispose();
  return merged;
}

function buildUmbrellaHandleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Ergonomic palm grip centered at (0, 0, 0), flowing downward into a -Z J-hook behind wrist
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.068, 0),
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(0, -0.056, 0),
    new THREE.Vector3(0, -0.082, -0.013),
    new THREE.Vector3(0, -0.088, -0.032),
    new THREE.Vector3(0, -0.078, -0.050),
    new THREE.Vector3(0, -0.055, -0.056),
  ]);
  const jTube = new THREE.TubeGeometry(curve, 18, 0.0125, 8, false);
  parts.push(jTube);

  // Rounded tip cap at end of J-hook & top plug
  const endCap = new THREE.SphereGeometry(0.0125, 8, 6);
  endCap.translate(0, -0.055, -0.056);
  parts.push(endCap);

  const nonIndexed = parts.map((p) => p.toNonIndexed());
  const merged = mergeGeometries(nonIndexed, false);
  for (const p of parts) p.dispose();
  for (const n of nonIndexed) n.dispose();
  return merged;
}

interface SharedUmbrellaResources {
  canopyGeo: THREE.BufferGeometry;
  frameGeo: THREE.BufferGeometry;
  handleGeo: THREE.BufferGeometry;
  collarGeo: THREE.CylinderGeometry;
  canopyMats: THREE.MeshStandardMaterial[];
  metalMat: THREE.MeshStandardMaterial;
  brassMat: THREE.MeshStandardMaterial;
  handleMat: THREE.MeshStandardMaterial;
}

let _sharedUmbrellaRes: SharedUmbrellaResources | null = null;
function getSharedUmbrellaResources(): SharedUmbrellaResources {
  if (_sharedUmbrellaRes) return _sharedUmbrellaRes;

  const canopyGeo = buildUmbrellaCanopyGeometry();
  const frameGeo = buildUmbrellaFrameGeometry();
  const handleGeo = buildUmbrellaHandleGeometry();
  const collarGeo = new THREE.CylinderGeometry(0.0135, 0.0135, 0.013, 10);

  const canopyMats = UMBRELLA_STYLE_SPECS.map((spec) => {
    const tex = createUmbrellaCanopyTexture(spec);
    const isClear = spec.pattern === 'clear';
    return new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : new THREE.Color(spec.primary).getHex(),
      ...(tex ? { map: tex } : {}),
      roughness: spec.roughness,
      metalness: isClear ? 0.04 : 0.06,
      envMapIntensity: isClear ? 1.1 : 0.72,
      transparent: isClear,
      opacity: isClear ? (spec.opacity ?? 0.54) : 1.0,
      depthWrite: !isClear,
      side: THREE.DoubleSide,
    });
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    roughness: 0.28,
    metalness: 0.84,
    envMapIntensity: 0.85,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc9a254,
    roughness: 0.26,
    metalness: 0.86,
    envMapIntensity: 0.9,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x5c361c,
    roughness: 0.56,
    metalness: 0.06,
    envMapIntensity: 0.5,
  });

  _sharedUmbrellaRes = {
    canopyGeo,
    frameGeo,
    handleGeo,
    collarGeo,
    canopyMats,
    metalMat,
    brassMat,
    handleMat,
  };
  return _sharedUmbrellaRes;
}

function createNpcUmbrellaMeshGroup(colorIndex: number): THREE.Group {
  const res = getSharedUmbrellaResources();
  const group = new THREE.Group();
  group.userData.noMerge = true;

  // Ergonomic wooden J-hook handle (palm grip centered at y = 0, hook curves toward -Z)
  const handle = new THREE.Mesh(res.handleGeo, res.handleMat);
  handle.userData.noMerge = true;
  group.add(handle);

  // Brushed brass shaft collar right above hand
  const collar = new THREE.Mesh(res.collarGeo, res.brassMat);
  collar.position.set(0, 0.070, 0);
  collar.userData.noMerge = true;
  group.add(collar);

  // Merged brushed steel shaft, runner, 8 underside ribs, stretchers, rosette & sleek ferrule
  const frame = new THREE.Mesh(res.frameGeo, res.metalMat);
  frame.userData.noMerge = true;
  group.add(frame);

  // Scalloped 8-gore tensioned canopy dome
  const mat = res.canopyMats[Math.abs(colorIndex) % res.canopyMats.length];
  const canopy = new THREE.Mesh(res.canopyGeo, mat);
  canopy.userData.noMerge = true;
  group.add(canopy);

  return group;
}

export function inspectUmbrellaResourcesForTest() {
  const res = getSharedUmbrellaResources();
  return {
    styleCount: res.canopyMats.length,
    hasClearVariant: res.canopyMats.some((m) => m.transparent && m.opacity < 0.8),
    canopyVertexCount: res.canopyGeo.getAttribute('position').count,
    frameTriangleCount: res.frameGeo.getAttribute('position').count / 3,
    handleTriangleCount: res.handleGeo.getAttribute('position').count / 3,
    sampleGroupChildrenCount: createNpcUmbrellaMeshGroup(0).children.length,
    sampleGroupNoMerge: createNpcUmbrellaMeshGroup(1).children.every((c) => c.userData.noMerge === true),
  };
}

function buildClipMap(animations: THREE.AnimationClip[]): Map<string, THREE.AnimationClip> {
  const map = new Map<string, THREE.AnimationClip>();
  for (const clip of animations) {
    map.set(clip.name.toLowerCase(), clip);
  }
  return map;
}

function hasClipWithKeywords(clipMap: Map<string, THREE.AnimationClip>, keywords: string[]): boolean {
  for (const k of clipMap.keys()) {
    for (const kw of keywords) {
      if (k.includes(kw)) return true;
    }
  }
  return false;
}

function detectRigBones(root: THREE.Object3D): RigBoneSet | null {
  const bones: RigBoneSet = {};
  let foundCount = 0;
  root.traverse((obj) => {
    if (!obj.name) return;
    const nm = obj.name.toLowerCase();
    // Skip finger/toe/twist/facial/helper/attachment leaf bones
    if (
      nm.includes('thumb') ||
      nm.includes('index') ||
      nm.includes('middle') ||
      nm.includes('ring') ||
      nm.includes('pinky') ||
      nm.includes('toe') ||
      nm.includes('twist') ||
      nm.includes('roll') ||
      nm.includes('eye') ||
      nm.includes('jaw') ||
      nm.includes('mouth') ||
      nm.includes('cheek') ||
      nm.includes('lip') ||
      nm.includes('brow') ||
      nm.includes('lid') ||
      nm.includes('tongue') ||
      nm.includes('teeth') ||
      nm.includes('nose') ||
      nm.includes('chin') ||
      nm.includes('forehead') ||
      nm.includes('temple') ||
      nm.includes('ear') ||
      nm.includes('end') ||
      nm.includes('poletarget')
    ) {
      return;
    }

    if (!bones.hips && (nm.includes('hips') || nm.includes('pelvis'))) {
      bones.hips = obj;
      foundCount++;
    } else if (!bones.spine2 && (nm.includes('spine2') || nm.includes('spine02') || nm.includes('spine_02') || nm.includes('chest') || nm === 'torso')) {
      bones.spine2 = obj;
      foundCount++;
    } else if (!bones.spine && ((nm.includes('spine') && !nm.includes('spine1') && !nm.includes('spine2') && !nm.includes('spine01') && !nm.includes('spine02')) || nm === 'abdomen')) {
      bones.spine = obj;
      foundCount++;
    } else if (!bones.head && nm.includes('head') && !nm.includes('headtop') && !nm.includes('headfront')) {
      bones.head = obj;
      foundCount++;
    } else if (!bones.leftForeArm && (nm.includes('leftforearm') || nm.includes('left_forearm') || nm.includes('lowerarm_l') || nm.includes('lowerarm.l') || nm === 'lowerarml' || nm.includes('forearm_l'))) {
      bones.leftForeArm = obj;
      foundCount++;
    } else if (!bones.leftArm && (nm.includes('leftarm') || nm.includes('left_arm') || nm.includes('upperarm_l') || nm.includes('upperarm.l') || nm === 'upperarml') && !nm.includes('fore')) {
      bones.leftArm = obj;
      foundCount++;
    } else if (!bones.rightForeArm && (nm.includes('rightforearm') || nm.includes('right_forearm') || nm.includes('lowerarm_r') || nm.includes('lowerarm.r') || nm === 'lowerarmr' || nm.includes('forearm_r'))) {
      bones.rightForeArm = obj;
      foundCount++;
    } else if (!bones.rightArm && (nm.includes('rightarm') || nm.includes('right_arm') || nm.includes('upperarm_r') || nm.includes('upperarm.r') || nm === 'upperarmr') && !nm.includes('fore')) {
      bones.rightArm = obj;
      foundCount++;
    } else if (!bones.leftUpLeg && (nm.includes('leftupleg') || nm.includes('left_upleg') || nm.includes('thigh_l') || nm.includes('upperleg_l') || nm.includes('upperleg.l') || nm === 'upperlegl')) {
      bones.leftUpLeg = obj;
      foundCount++;
    } else if (!bones.leftLeg && ((nm.includes('leftleg') || nm.includes('left_leg')) && !nm.includes('upleg')) || (!bones.leftLeg && (nm.includes('calf_l') || nm.includes('shin_l') || nm.includes('lowerleg_l') || nm.includes('lowerleg.l') || nm === 'lowerlegl'))) {
      bones.leftLeg = obj;
      foundCount++;
    } else if (!bones.rightUpLeg && (nm.includes('rightupleg') || nm.includes('right_upleg') || nm.includes('thigh_r') || nm.includes('upperleg_r') || nm.includes('upperleg.r') || nm === 'upperlegr')) {
      bones.rightUpLeg = obj;
      foundCount++;
    } else if (!bones.rightLeg && ((nm.includes('rightleg') || nm.includes('right_leg')) && !nm.includes('upleg')) || (!bones.rightLeg && (nm.includes('calf_r') || nm.includes('shin_r') || nm.includes('lowerleg_r') || nm.includes('lowerleg.r') || nm === 'lowerlegr'))) {
      bones.rightLeg = obj;
      foundCount++;
    }
  });
  return foundCount >= 4 ? bones : null;
}

function undoBoneOverlays(rec: ActiveGlbNpcRecord): void {
  if (rec.prevBoneOverlays.size === 0) return;
  for (const [bone, q] of rec.prevBoneOverlays.entries()) {
    if (q.w === 1 && q.x === 0 && q.y === 0 && q.z === 0) continue;
    _tmpUndoQuat.copy(q).invert();
    bone.quaternion.multiply(_tmpUndoQuat);
    q.identity();
  }
}

function applyBoneOverlayEuler(
  rec: ActiveGlbNpcRecord,
  bone: THREE.Object3D | undefined,
  rx: number,
  ry: number,
  rz: number
): void {
  if (!bone) return;
  if (Math.abs(rx) < 1e-4 && Math.abs(ry) < 1e-4 && Math.abs(rz) < 1e-4) return;
  _tmpOverlayEuler.set(rx, ry, rz, 'XYZ');
  _tmpOverlayQuat.setFromEuler(_tmpOverlayEuler);
  bone.quaternion.multiply(_tmpOverlayQuat);
  let stored = rec.prevBoneOverlays.get(bone);
  if (!stored) {
    stored = new THREE.Quaternion();
    rec.prevBoneOverlays.set(bone, stored);
  }
  stored.copy(_tmpOverlayQuat);
}

function findMatchingClip(
  clipMap: Map<string, THREE.AnimationClip>,
  animations: THREE.AnimationClip[],
  desired: HumanAnimState
): THREE.AnimationClip | null {
  const exact = clipMap.get(desired.toLowerCase());
  if (exact) return exact;
  const walkKw = ['walk', 'run', 'locomotion', 'move'];
  const idleKw = ['idle', 'stand', 'breath', 'alert'];
  const keywords: Record<HumanAnimState, string[]> = {
    Walk: walkKw,
    CarryWalk: walkKw,
    WalkBasket: walkKw,
    Idle: idleKw,
    Carry: idleKw,
    PickUp: idleKw,
    Stock: idleKw,
    CarryBasket: idleKw,
    PickShelf: idleKw,
    InspectItem: idleKw,
    DropBasket: idleKw,
    Sit: ['sit', 'chair'],
    Lecture: ['talk', 'speak', 'lecture', 'gesture', 'wave'],
    Wave: ['wave', 'greet', 'hello', 'talk'],
    Checkout: ['checkout', 'scan', 'cashier', 'work', ...idleKw],
    Attack: ['attack', 'punch', 'strike', 'hit', ...idleKw],
    Surrender: ['surrender', ...idleKw],
    FilmPhone: idleKw,
  };
  for (const kw of keywords[desired]) {
    for (const [k, clip] of clipMap.entries()) {
      if (k.includes(kw)) return clip;
    }
  }
  return animations[0] ?? null;
}

function loadTemplate(url: string): Promise<LoadedTemplate | null> {
  const existing = loadedTemplates.get(url);
  if (existing) return Promise.resolve(existing);

  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return Promise.resolve(null);
  }

  let promise = loadingPromises.get(url);
  if (!promise) {
    promise = new Promise<LoadedTemplate | null>((resolve) => {
      loadQueue.push({ url, resolve });
      pumpLoadQueue();
    });
    loadingPromises.set(url, promise);
  }
  return promise;
}

export function preloadAllGlbHumanArchetypes(): void {
  if (typeof window === 'undefined') return;
  for (const id of ARCHETYPE_SET) {
    void loadTemplate(`/models/${id}.glb`);
  }
}

export function preloadGlbUrlList(urls: readonly string[]): void {
  if (typeof window === 'undefined') return;
  for (let i = 0; i < urls.length; i++) {
    void loadTemplate(resolveModelUrl(urls[i]));
  }
}

function resolveQuaterniusMatSlot(
  matName: string,
  palette: HumanPaletteOverride | undefined,
  isSuitModel: boolean,
  defaultHex: number
): { slotKey: string; hex: number; textured: boolean } | null {
  switch (matName) {
    case 'Skin':
      return { slotKey: 'skin', hex: palette?.skin ?? defaultHex, textured: true };
    case 'Hair':
      return { slotKey: 'hair', hex: palette?.hair ?? defaultHex, textured: true };
    case 'Pants':
      return { slotKey: 'pants', hex: palette?.pants ?? defaultHex, textured: true };
    case 'Shirt':
      if (isSuitModel) {
        const hex = palette?.suit !== undefined && palette?.shirt !== undefined ? palette.shirt : defaultHex;
        return { slotKey: 'shirt', hex, textured: true };
      }
      return { slotKey: 'shirt', hex: palette?.shirt ?? defaultHex, textured: true };
    case 'Main':
      return { slotKey: 'shirt', hex: defaultHex, textured: true };
    case 'Black':
      return {
        slotKey: 'pants',
        hex: isSuitModel && palette?.suit !== undefined ? palette.suit : defaultHex,
        textured: true,
      };
    case 'Details':
    case 'Detail':
    case 'Vest': {
      const hex = palette?.accent ?? (isSuitModel && palette?.shirt !== undefined ? palette.shirt : defaultHex);
      return { slotKey: 'accent', hex, textured: true };
    }
    case 'Shoes':
      return { slotKey: 'shoes', hex: palette?.shoes ?? defaultHex, textured: true };
    case 'Belt':
      return { slotKey: 'belt', hex: palette?.shoes ?? defaultHex, textured: true };
    case 'ShoeSole':
      return { slotKey: 'sole', hex: defaultHex, textured: false };
    case 'Sock':
      return { slotKey: 'sock', hex: defaultHex, textured: false };
    case 'EyeWhite':
      return { slotKey: 'eyewhite', hex: defaultHex, textured: false };
    case 'Mouth':
      return { slotKey: 'mouth', hex: defaultHex, textured: false };
    case 'Face':
      return { slotKey: 'face', hex: defaultHex, textured: false };
    default:
      return null;
  }
}

function applyPaletteToClone(clone: THREE.Object3D, palette?: HumanPaletteOverride): void {
  const slotColorMap: Record<string, number | undefined> = palette
    ? {
        shirt_mesh: palette.shirt,
        pants_mesh: palette.pants,
        hair_mesh: palette.hair,
        skin_mesh: palette.skin,
        shoes_mesh: palette.shoes,
        accent_mesh: palette.accent,
      }
    : {};

  // Detect Suit_* models (which have both 'Black' and 'Details' materials) so casual shirt colors tint tie instead of dress shirt
  let hasBlack = false;
  let hasDetails = false;
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (let i = 0; i < mats.length; i++) {
      const nm = mats[i]?.name;
      if (nm === 'Black') hasBlack = true;
      else if (nm === 'Details') hasDetails = true;
    }
  });
  const isSuitModel = hasBlack && hasDetails;

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const builtInHex = slotColorMap[child.name];
    if (builtInHex !== undefined) {
      child.material = getCachedMaterial(child.name, builtInHex);
      return;
    }

    const hasUv = Boolean(child.geometry?.attributes?.uv);
    const pickMat = (slotKey: string, hex: number, textured: boolean) =>
      hasUv && textured ? getCachedMaterial(`${slotKey}_mesh`, hex) : getFlatCachedMaterial(slotKey, hex);

    if (Array.isArray(child.material)) {
      let changed = false;
      const nextMats = child.material.slice();
      for (let i = 0; i < nextMats.length; i++) {
        const m = nextMats[i] as THREE.MeshStandardMaterial | undefined;
        if (!m?.name) continue;
        const defaultHex = m.color ? m.color.getHex() : 0xffffff;
        const resolved = resolveQuaterniusMatSlot(m.name, palette, isSuitModel, defaultHex);
        if (resolved) {
          nextMats[i] = pickMat(resolved.slotKey, resolved.hex, resolved.textured);
          changed = true;
        }
      }
      if (changed) child.material = nextMats;
    } else if (child.material?.name) {
      const m = child.material as THREE.MeshStandardMaterial;
      const defaultHex = m.color ? m.color.getHex() : 0xffffff;
      const resolved = resolveQuaterniusMatSlot(m.name, palette, isSuitModel, defaultHex);
      if (resolved) {
        child.material = pickMat(resolved.slotKey, resolved.hex, resolved.textured);
      }
    }
  });
}

function inferClipProfile(tpl: LoadedTemplate, hint?: HumanClipProfile): HumanClipProfile {
  if (hint) return hint;
  if (tpl.maxClipDuration < 0.05) return 'static';
  const hasWalk = hasClipWithKeywords(tpl.clipMap, ['walk', 'run', 'locomotion', 'move']);
  const hasIdle = hasClipWithKeywords(tpl.clipMap, ['idle', 'stand', 'breath', 'alert']);
  if (hasWalk && hasIdle) return 'multi';
  if (hasWalk) return 'walk_only';
  return 'idle_only';
}

function syncActionPlaybackForState(rec: ActiveGlbNpcRecord, state: HumanAnimState): void {
  if (!rec.mixer || !rec.hasClips) return;
  const next = rec.actions.get(state) ?? rec.actions.get('Idle') ?? rec.actions.values().next().value;
  const prev = rec.actions.get(rec.currentState);

  const shouldPauseWalkOnly =
    rec.clipProfile === 'walk_only' && (state === 'Idle' || state === 'Sit' || state === 'Lecture' || state === 'Wave');
  const isSitDown = state === 'Sit' && rec.hasSitDownClip;
  const rate = isSitDown ? 1.0 : rec.timeScale;

  if (next && prev && next !== prev) {
    next.reset().setEffectiveTimeScale(rate).setEffectiveWeight(1).play();
    if (isSitDown) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    }
    next.paused = shouldPauseWalkOnly;
    if (shouldPauseWalkOnly) next.time = 0;
    prev.crossFadeTo(next, 0.22, true);
    rec.currentState = state;
  } else if (next) {
    if (!next.isRunning()) {
      next.reset().setEffectiveTimeScale(rate).play();
    } else {
      next.setEffectiveTimeScale(rate);
    }
    next.paused = shouldPauseWalkOnly;
    if (shouldPauseWalkOnly) next.time = 0;
    rec.currentState = state;
  }
}

function mountTemplateOnRecord(
  rec: ActiveGlbNpcRecord,
  tpl: LoadedTemplate,
  palette: HumanPaletteOverride | undefined,
  scale: number,
  targetHeight: number,
  rotationY: number,
  clipProfileHint: HumanClipProfile | undefined,
  castShadow: boolean
): void {
  const wrapper = new THREE.Group();
  const clone = SkeletonUtils.clone(tpl.gltf.scene);

  wrapper.add(clone);
  wrapper.userData.noMerge = true;
  wrapper.traverse((obj) => {
    obj.userData.noMerge = true;
    if (obj instanceof THREE.SkinnedMesh) {
      obj.frustumCulled = false;
      obj.castShadow = castShadow;
      obj.receiveShadow = castShadow;
    } else if (obj instanceof THREE.Mesh) {
      obj.castShadow = castShadow;
      obj.receiveShadow = castShadow;
    }
  });
  applyPaletteToClone(clone, palette);

  const mixer = new THREE.AnimationMixer(clone);
  const actions = new Map<HumanAnimState, THREE.AnimationAction>();
  const states: HumanAnimState[] = [
    'Idle',
    'Walk',
    'Sit',
    'Lecture',
    'Wave',
    'Checkout',
    'Carry',
    'CarryWalk',
    'PickUp',
    'Stock',
    'CarryBasket',
    'WalkBasket',
    'PickShelf',
    'InspectItem',
    'DropBasket',
    'Attack',
    'Surrender',
    'FilmPhone',
  ];
  let sitClipIsTransition = false;
  let sitClipDuration = 0;
  for (const st of states) {
    const clip = findMatchingClip(tpl.clipMap, tpl.gltf.animations, st);
    if (clip) {
      const action = mixer.clipAction(clip);
      if (st === 'Sit' && clip.name.toLowerCase().includes('sitdown')) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        sitClipIsTransition = true;
        sitClipDuration = clip.duration;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      actions.set(st, action);
    }
  }

  const resolvedProfile = inferClipProfile(tpl, clipProfileHint);
  rec.modelRoot = wrapper;
  rec.mixer = mixer;
  rec.actions = actions;
  rec.hasClips = actions.size > 0;
  rec.clipProfile = resolvedProfile;
  rec.hasDedicatedWalkClip =
    resolvedProfile === 'multi' ||
    resolvedProfile === 'walk_only' ||
    hasClipWithKeywords(tpl.clipMap, ['walk', 'run', 'locomotion', 'move']);
  rec.hasDedicatedIdleClip =
    resolvedProfile === 'multi' ||
    resolvedProfile === 'idle_only' ||
    hasClipWithKeywords(tpl.clipMap, ['idle', 'stand', 'breath', 'alert']);
  rec.hasDedicatedSitClip = hasClipWithKeywords(tpl.clipMap, ['sit', 'chair']);
  rec.hasSitDownClip = sitClipIsTransition;
  rec.hasDedicatedCheckoutClip = hasClipWithKeywords(tpl.clipMap, ['checkout', 'scan', 'cashier']);
  rec.rigBones = detectRigBones(clone);
  rec.isQuaterniusRig = Boolean(
    clone.getObjectByName('UpperArmR') ||
    clone.getObjectByName('UpperArm.R') ||
    clone.getObjectByName('FistR') ||
    clone.getObjectByName('Fist.R')
  );
  rec.rightHandBone =
    clone.getObjectByName('RightHand') ??
    clone.getObjectByName('FistR') ??
    clone.getObjectByName('Fist.R') ??
    clone.getObjectByName('HandR') ??
    clone.getObjectByName('Hand.R') ??
    clone.getObjectByName('Hand_R') ??
    clone.getObjectByName('mixamorigRightHand') ??
    null;
  rec.idleCalmQuats = tpl.idleCalmQuats;
  rec.idleCalmTargets = [];
  if (rec.rigBones && tpl.idleCalmQuats) {
    const pushTarget = (role: CalmWalkBoneRole, bone: THREE.Object3D | undefined, blend: number) => {
      const restQuat = tpl.idleCalmQuats?.[role];
      if (bone && restQuat) rec.idleCalmTargets.push({ bone, restQuat, blend });
    };
    pushTarget('leftArm', rec.rigBones.leftArm, 0.78);
    pushTarget('rightArm', rec.rigBones.rightArm, 0.78);
    pushTarget('leftForeArm', rec.rigBones.leftForeArm, 0.80);
    pushTarget('rightForeArm', rec.rigBones.rightForeArm, 0.80);
    pushTarget('spine2', rec.rigBones.spine2, 0.42);
  }

  const initialAction = actions.get(rec.targetState) ?? actions.get('Idle') ?? actions.values().next().value;
  if (initialAction) {
    const isInitialSitDown = rec.targetState === 'Sit' && sitClipIsTransition;
    initialAction.reset().setEffectiveTimeScale(isInitialSitDown ? 1.0 : rec.timeScale).play();
    const shouldPauseWalkOnly =
      resolvedProfile === 'walk_only' &&
      (rec.targetState === 'Idle' || rec.targetState === 'Sit' || rec.targetState === 'Lecture' || rec.targetState === 'Wave');
    if (shouldPauseWalkOnly) {
      initialAction.time = 0;
      initialAction.paused = true;
      mixer.update(0);
    } else if (isInitialSitDown) {
      // Advance immediately to clamped seated pose on frame 0
      mixer.update(sitClipDuration + 0.05);
      rec.sitOffsetWeight = 1;
    } else {
      mixer.update(rec.phaseOffset % 2.0);
    }
    rec.currentState = rec.targetState;
  }

  if (rotationY !== 0) {
    clone.rotation.y += rotationY;
  }

  if (targetHeight > 0 && tpl.fit.rawHeight > 0.001) {
    const fitScale = (targetHeight / tpl.fit.rawHeight) * scale;
    clone.scale.multiplyScalar(fitScale);
    if (rotationY === 0) {
      clone.position.set(
        -tpl.fit.rawCenterX * fitScale,
        -tpl.fit.rawMinY * fitScale,
        -tpl.fit.rawCenterZ * fitScale
      );
    } else {
      clone.updateMatrixWorld(true);
      const fittedBox = new THREE.Box3().setFromObject(clone, true);
      const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
      clone.position.x -= fittedCenter.x;
      clone.position.y -= fittedBox.min.y;
      clone.position.z -= fittedCenter.z;
    }
  } else {
    clone.scale.multiplyScalar(scale);
  }

  rec.hostGroup.add(wrapper);

  // Lightweight shared radial contact shadow disc under NPC (zero shadow-pass GPU cost)
  const contactRes = getContactShadowResources();
  if (contactRes) {
    const contactShadow = new THREE.Mesh(contactRes.geometry, contactRes.material);
    contactShadow.position.set(0, 0.015, 0);
    contactShadow.userData.noMerge = true;
    wrapper.add(contactShadow);
  }

  if (rec.onModelMounted) {
    rec.onModelMounted(clone);
    wrapper.traverse((obj) => {
      obj.userData.noMerge = true;
    });
  }

  // Immediately sync initial overlay weights & pose so static T-pose rigs never flash T-pose on frame 0
  if (rec.targetState === 'Walk' && !rec.hasDedicatedWalkClip) rec.walkOverlayWeight = 1;
  if (rec.targetState === 'Sit' && !rec.hasDedicatedSitClip) rec.sitOverlayWeight = 1;
  if (rec.targetState === 'Checkout' && !rec.hasDedicatedCheckoutClip) rec.checkoutOverlayWeight = 1;
  stepRecordAnimation(rec, 0);

  // Hide blocky fallback placeholder immediately once GLB is mounted; updateAllGlbHumanNpcs toggles if beyond LOD radius
  rec.lastShowGlb = true;
  for (let f = 0; f < rec.fallbackMeshes.length; f++) {
    rec.fallbackMeshes[f].visible = false;
  }
}

/**
 * Attaches a `.glb` humanoid (loaded via GLTFLoader, cloned via SkeletonUtils,
 * animated via AnimationMixer) onto an NPC group with distance-based 3-tier LOD,
 * staggered AnimationMixer updates, template-cached bounds, and procedural bone overlays.
 */
export function attachGlbHumanToNpc(opts: AttachGlbHumanOptions): GlbHumanHandle {
  const isBuiltIn = ARCHETYPE_SET.has(opts.modelSource);
  const url = resolveModelUrl(opts.modelSource);
  const scale = opts.scale ?? 1.0;
  const targetHeight = opts.targetHeight ?? (isBuiltIn ? 0 : 1.72);
  const rotationY = opts.rotationY ?? 0;
  const fallbackMeshes = opts.fallbackMeshes ?? [];
  const lodMixerRadius = Math.min(opts.lodMixerRadius ?? 28, 32);
  const hasFallback = fallbackMeshes.length > 0;
  const modelRadius = hasFallback ? lodMixerRadius + 4 : 44;
  const castShadow = opts.castShadow ?? false;

  const rec: ActiveGlbNpcRecord = {
    hostGroup: opts.hostGroup,
    fallbackMeshes,
    modelRoot: null,
    mixer: null,
    hasClips: false,
    clipProfile: opts.clipProfile ?? 'idle_only',
    hasDedicatedWalkClip: false,
    hasDedicatedIdleClip: false,
    hasDedicatedSitClip: false,
    hasSitDownClip: false,
    hasDedicatedCheckoutClip: false,
    rigBones: null,
    idleCalmQuats: null,
    idleCalmTargets: [],
    taskPose: {
      lWeight: 0,
      rWeight: 0,
      bodyWeight: 0,
      lU: [0, 0, 0],
      lL: [0, 0, 0],
      rU: [0, 0, 0],
      rL: [0, 0, 0],
      sp: [0, 0, 0],
      hd: [0, 0, 0],
    },
    prevBoneOverlays: new Map(),
    walkOverlayWeight: 0,
    sitOverlayWeight: 0,
    sitOffsetWeight: 0,
    checkoutOverlayWeight: 0,
    staticClock: opts.phaseOffset ?? 0,
    pendingDt: 0,
    actions: new Map(),
    currentState: opts.initialState ?? 'Idle',
    targetState: opts.initialState ?? 'Idle',
    timeScale: 1.0,
    lodMixerRadiusSq: lodMixerRadius * lodMixerRadius,
    lodModelRadiusSq: modelRadius * modelRadius,
    phaseOffset: opts.phaseOffset ?? 0,
    visible: true,
    lastShowGlb: null,
    lastDistSq: 0,
    disposed: false,
    worldPos: new THREE.Vector3(),
    isQuaterniusRig: false,
    allowRainUmbrella: opts.allowRainUmbrella !== false,
    umbrellaColorIdx: activeGlbRecords.length,
    umbrellaActive: false,
    umbrellaGroup: null,
    rightHandBone: null,
    onModelMounted: opts.onModelMounted,
  };
  opts.hostGroup.userData.noMerge = true;
  activeGlbRecords.push(rec);

  const tpl = loadedTemplates.get(url);
  if (tpl) {
    mountTemplateOnRecord(
      rec,
      tpl,
      opts.palette,
      scale,
      targetHeight,
      rotationY,
      opts.clipProfile,
      castShadow
    );
  } else {
    let q = pendingMounts.get(url);
    if (!q) {
      q = [];
      pendingMounts.set(url, q);
    }
    q.push(() => {
      if (rec.disposed) return;
      const loaded = loadedTemplates.get(url);
      if (loaded && !rec.modelRoot) {
        mountTemplateOnRecord(
          rec,
          loaded,
          opts.palette,
          scale,
          targetHeight,
          rotationY,
          opts.clipProfile,
          castShadow
        );
      }
    });
    void loadTemplate(url);
  }

  return {
    setAnimState(state: HumanAnimState, timeScale = 1.0) {
      if (rec.disposed) return;
      rec.timeScale = timeScale;
      if (rec.targetState === state) {
        const cur = rec.actions.get(rec.currentState);
        if (cur) cur.setEffectiveTimeScale(timeScale);
        return;
      }
      rec.targetState = state;
      syncActionPlaybackForState(rec, state);
    },
    setVisible(vis: boolean) {
      rec.visible = vis;
      if (rec.hostGroup.visible !== vis) {
        rec.hostGroup.visible = vis;
      }
    },
    isLoaded() {
      return rec.modelRoot !== null;
    },
    hasActiveUmbrella() {
      return rec.umbrellaActive;
    },
    dispose() {
      rec.disposed = true;
      rec.mixer?.stopAllAction();
      if (rec.umbrellaGroup) {
        rec.hostGroup.remove(rec.umbrellaGroup);
        rec.umbrellaGroup = null;
      }
      if (rec.modelRoot) {
        rec.hostGroup.remove(rec.modelRoot);
        rec.modelRoot = null;
      }
      for (let f = 0; f < rec.fallbackMeshes.length; f++) {
        rec.fallbackMeshes[f].visible = true;
      }
    },
  };
}

function dampVec3Tuple(cur: [number, number, number], tx: number, ty: number, tz: number, lambda: number, dt: number): void {
  if (dt <= 0) {
    cur[0] = tx;
    cur[1] = ty;
    cur[2] = tz;
    return;
  }
  cur[0] = THREE.MathUtils.damp(cur[0], tx, lambda, dt);
  cur[1] = THREE.MathUtils.damp(cur[1], ty, lambda, dt);
  cur[2] = THREE.MathUtils.damp(cur[2], tz, lambda, dt);
}

function applyQuatTaskBone(
  bone: THREE.Object3D | undefined,
  restQuat: THREE.Quaternion | undefined,
  eulerXYZ: [number, number, number],
  weight: number
): void {
  if (!bone || !restQuat || weight <= 0.005) return;
  _taskEuler.set(eulerXYZ[0], eulerXYZ[1], eulerXYZ[2], 'XYZ');
  _taskDeltaQuat.setFromEuler(_taskEuler);
  _taskTargetQuat.copy(restQuat).multiply(_taskDeltaQuat);
  bone.quaternion.slerp(_taskTargetQuat, weight);
}

function isWalkingLikeState(state: HumanAnimState): boolean {
  return state === 'Walk' || state === 'CarryWalk' || state === 'WalkBasket';
}

function stepRecordAnimation(rec: ActiveGlbNpcRecord, dt: number): void {
  if (!rec.modelRoot) return;
  rec.staticClock += dt * rec.timeScale;
  const st = rec.staticClock;

  if ((rec.hasClips && rec.mixer) || rec.rigBones) {
    undoBoneOverlays(rec);
    if (rec.hasClips && rec.mixer) {
      rec.mixer.update(dt);
    }

    const walkLike = isWalkingLikeState(rec.targetState);

    // Damp exaggerated Walk arm pumping toward calm Idle arm posture so pedestrians walk naturally
    if (
      walkLike &&
      rec.hasDedicatedWalkClip &&
      rec.idleCalmTargets.length > 0 &&
      (!rec.hasSitDownClip || rec.sitOffsetWeight < 0.05)
    ) {
      for (let t = 0; t < rec.idleCalmTargets.length; t++) {
        const target = rec.idleCalmTargets[t];
        target.bone.quaternion.slerp(target.restQuat, target.blend);
      }
    }

    // Track Quaternius SitDown root offset weight independently so both root alignment & bone posture apply
    if (rec.hasSitDownClip) {
      const wantSitOffset = rec.targetState === 'Sit' ? 1 : 0;
      rec.sitOffsetWeight = dt > 0 ? THREE.MathUtils.damp(rec.sitOffsetWeight, wantSitOffset, 7.5, dt) : wantSitOffset;
      const sitW = rec.sitOffsetWeight;
      if (sitW > 0.001) {
        // Lift thighs/hips flush onto 0.46-0.49m chair seats & shift forward so torso/shins clear backrest/base
        rec.modelRoot.position.set(0, 0.085 * sitW, 0.27 * sitW);
      } else {
        rec.modelRoot.position.set(0, 0, 0);
      }
      rec.modelRoot.rotation.y = dt > 0 ? THREE.MathUtils.damp(rec.modelRoot.rotation.y, 0, 10, dt) : 0;
      rec.modelRoot.rotation.x = dt > 0 ? THREE.MathUtils.damp(rec.modelRoot.rotation.x, 0, 10, dt) : 0;
    }

    // Calibrated Quaternius articulated arm & body poses for work, carrying, picking, inspecting & checkout tasks
    if (rec.rigBones && rec.idleCalmQuats && (!rec.hasSitDownClip || rec.sitOffsetWeight < 0.05)) {
      const tp = rec.taskPose;
      const q = rec.idleCalmQuats;
      const bones = rec.rigBones;
      let wantL = 0;
      let wantR = 0;
      let wantBody = 0;
      let lUx = 0, lUy = 0, lUz = 0;
      let lLx = 0, lLy = 0, lLz = 0;
      let rUx = 0, rUy = 0, rUz = 0;
      let rLx = 0, rLy = 0, rLz = 0;
      let spX = 0, spY = 0, spZ = 0;
      let hdX = 0, hdY = 0, hdZ = 0;

      if (rec.targetState === 'Checkout') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const sw = Math.sin(st * 3.8);
        const tap = Math.max(0, Math.sin(st * 5.2));
        lUx = -0.155 + tap * 0.06; lUy = -0.31 - sw * 0.08; lUz = -0.305;
        lLx = 0.935 + tap * 0.14; lLy = -0.015; lLz = -0.67 + sw * 0.08;
        rUx = 0.045 + sw * 0.12; rUy = 0.02 + sw * 0.14; rUz = 0.55 + Math.sin(st * 2.1) * 0.08;
        rLx = 1.035 + Math.sin(st * 3.8) * 0.18; rLy = -0.075 + sw * 0.12; rLz = 0.555 + Math.cos(st * 2.9) * 0.14;
        spX = 0.04; spY = sw * 0.04;
        hdX = 0.14 + Math.sin(st * 2.2) * 0.03; hdY = Math.sin(st * 1.4) * 0.16;
      } else if (rec.targetState === 'PickUp') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        lUx = -0.015; lUy = -0.22; lUz = -0.505;
        lLx = 0.04; lLy = -0.035; lLz = 0.225;
        rUx = -0.015; rUy = 0.20; rUz = 0.515;
        rLx = 0.04; rLy = 0.015; rLz = -0.255;
        spX = 0.24;
        hdX = -0.08;
      } else if (rec.targetState === 'Carry' || rec.targetState === 'CarryWalk') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const bob = rec.targetState === 'CarryWalk' ? Math.sin(st * 6.0) * 0.025 : 0;
        lUx = -0.005 + bob * 0.4; lUy = -0.34; lUz = -0.335;
        lLx = 0.39; lLy = -0.02; lLz = -0.44 + bob;
        rUx = bob * 0.4; rUy = 0.33; rUz = 0.32;
        rLx = 0.41; rLy = 0; rLz = 0.46 - bob;
        spX = -0.03;
        hdX = 0.03; hdY = Math.sin(st * 0.9) * 0.06;
      } else if (rec.targetState === 'Stock') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const reach = 0.5 + 0.5 * Math.sin(st * 4.8);
        lUx = -0.005; lUy = -0.34; lUz = -0.335;
        lLx = 0.39; lLy = -0.02; lLz = -0.44;
        rUx = THREE.MathUtils.lerp(0.0, 0.39, reach); rUy = 0.33; rUz = THREE.MathUtils.lerp(0.32, 0.70, reach);
        rLx = THREE.MathUtils.lerp(0.41, 1.19, reach); rLy = 0.01 * reach; rLz = THREE.MathUtils.lerp(0.46, 0.915, reach);
        spX = 0.04 * reach; spY = -0.06 * reach;
        hdX = THREE.MathUtils.lerp(0.05, -0.10, reach); hdY = -0.06;
      } else if (rec.targetState === 'CarryBasket' || rec.targetState === 'WalkBasket') {
        wantL = 1;
        const sway = rec.targetState === 'WalkBasket' ? Math.sin(st * 6.0) * 0.02 : 0;
        lUx = sway; lUy = -0.225; lUz = -0.165;
        lLx = -0.075; lLy = 0.025; lLz = 0.17;
        if (rec.umbrellaActive && rec.targetState === 'WalkBasket') {
          wantR = 1;
          const uSway = Math.sin(st * 5.6) * 0.018;
          if (rec.isQuaterniusRig) {
            rUx = 0.14 + uSway; rUy = 0.10; rUz = 0.56;
            rLx = 0.82; rLy = 0.04; rLz = 0.98;
          } else {
            rUx = -0.28 + uSway; rUy = 0.0; rUz = -0.08;
            rLx = -1.25; rLy = 0.0; rLz = 0.0;
          }
        }
      } else if (rec.targetState === 'PickShelf') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const reach = 0.90 + 0.10 * Math.sin(st * 3.5);
        lUx = 0; lUy = -0.225; lUz = -0.165;
        lLx = -0.075; lLy = 0.025; lLz = 0.17;
        rUx = 0.275 * reach; rUy = 0.345 * reach; rUz = 0.695 * reach;
        rLx = 0.725 * reach; rLy = 0.01 * reach; rLz = 0.96 * reach;
        spX = 0.05;
        hdX = -0.10; hdY = Math.sin(st * 2.0) * 0.08;
      } else if (rec.targetState === 'InspectItem') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const tilt = Math.sin(st * 2.8) * 0.06;
        lUx = 0; lUy = -0.225; lUz = -0.165;
        lLx = -0.075; lLy = 0.025; lLz = 0.17;
        rUx = 0.275; rUy = 0.005 + tilt; rUz = 0.49;
        rLx = 1.405; rLy = 0.25 + tilt; rLz = 1.055;
        hdX = 0.12; hdY = 0.08 + Math.sin(st * 1.8) * 0.08;
      } else if (rec.targetState === 'DropBasket') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        lUx = 0; lUy = -0.225; lUz = -0.165;
        lLx = -0.075; lLy = 0.025; lLz = 0.17;
        rUx = -0.065; rUy = 0.0; rUz = 0.70;
        rLx = -0.64; rLy = 0.0; rLz = 0.48;
        spX = 0.04; spY = 0.10;
        hdX = 0.18; hdY = 0.18;
      } else if (rec.targetState === 'Attack') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        // Snappy overhead-to-diagonal stun baton strike loop with defensive left guard & torso lunge
        const raw = Math.sin(st * 9.5);
        const strike = 0.5 - 0.5 * Math.cos(Math.pow(0.5 + 0.5 * raw, 0.75) * Math.PI);
        lUx = 0.06; lUy = -0.32; lUz = -0.52;
        lLx = 0.56; lLy = -0.04; lLz = -0.58;
        rUx = THREE.MathUtils.lerp(0.36, -0.14, strike);
        rUy = THREE.MathUtils.lerp(-0.18, 0.44, strike);
        rUz = THREE.MathUtils.lerp(1.16, 0.42, strike);
        rLx = THREE.MathUtils.lerp(1.06, 0.36, strike);
        rLy = THREE.MathUtils.lerp(0.05, -0.10, strike);
        rLz = THREE.MathUtils.lerp(0.88, 0.34, strike);
        spX = 0.10 + 0.16 * strike;
        spY = THREE.MathUtils.lerp(-0.18, 0.24, strike);
        hdX = 0.06;
        hdY = -spY * 0.55;
      } else if (rec.targetState === 'Surrender') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const tremble = Math.sin(st * 8.0) * 0.04;
        lUx = 0.18; lUy = -0.18; lUz = -1.24 + tremble;
        lLx = 0.38; lLy = 0.0; lLz = -0.62;
        rUx = 0.18; rUy = 0.18; rUz = 1.24 - tremble;
        rLx = 0.38; rLy = 0.0; rLz = 0.62;
        spX = -0.04;
        hdX = 0.10; hdY = Math.sin(st * 5.2) * 0.22;
      } else if (rec.targetState === 'Wave') {
        wantR = 1;
        wantBody = 1;
        const wave = Math.sin(st * 6.5) * 0.22;
        rUx = 0.32; rUy = 0.15; rUz = 1.12;
        rLx = 0.42; rLy = 0.0; rLz = 0.68 + wave;
        spY = 0.04;
        hdX = -0.04;
      } else if (rec.targetState === 'Lecture') {
        wantL = 1;
        wantR = 1;
        wantBody = 1;
        const g = Math.sin(st * 4.2);
        lUx = 0.02; lUy = -0.24; lUz = -0.34;
        lLx = 0.28; lLy = 0; lLz = -0.45 - g * 0.10;
        rUx = 0.05; rUy = 0.24; rUz = 0.54;
        rLx = 0.38; rLy = 0; rLz = 0.58 + g * 0.16;
        spX = 0.04; spY = g * 0.05;
        hdX = 0.04; hdY = g * 0.10;
      } else if (rec.targetState === 'FilmPhone') {
        wantR = 1;
        wantBody = 1;
        const panX = Math.sin(st * 1.15) * 0.06;
        const panY = Math.cos(st * 1.65) * 0.04;
        const tilt = Math.sin(st * 2.3) * 0.03;
        rUx = 0.18 + panY; rUy = 0.28 + panX; rUz = 1.48 + tilt * 0.5;
        rLx = 0.15 + panY * 0.4; rLy = 0.0; rLz = 0.35 + tilt;
        spX = -0.05; spY = panX * 0.35;
        hdX = -0.24 + Math.sin(st * 1.4) * 0.04;
        hdY = panX * 0.5 + Math.sin(st * 0.85) * 0.06;
      } else if (rec.umbrellaActive && rec.targetState === 'Walk') {
        // Hold open rain umbrella upright beside shoulder so canopy centers cleanly above head
        wantR = 1;
        const sway = Math.sin(st * 5.6) * 0.018;
        if (rec.isQuaterniusRig) {
          rUx = 0.14 + sway;
          rUy = 0.10;
          rUz = 0.56;
          rLx = 0.82;
          rLy = 0.04;
          rLz = 0.98;
        } else {
          rUx = -0.28 + sway;
          rUy = 0.0;
          rUz = -0.08;
          rLx = -1.25;
          rLy = 0.0;
          rLz = 0.0;
        }
      }

      const lambda = 11;
      tp.lWeight = dt > 0 ? THREE.MathUtils.damp(tp.lWeight, wantL, lambda, dt) : wantL;
      tp.rWeight = dt > 0 ? THREE.MathUtils.damp(tp.rWeight, wantR, lambda, dt) : wantR;
      tp.bodyWeight = dt > 0 ? THREE.MathUtils.damp(tp.bodyWeight, wantBody, lambda, dt) : wantBody;

      if (wantL > 0) {
        dampVec3Tuple(tp.lU, lUx, lUy, lUz, lambda, dt);
        dampVec3Tuple(tp.lL, lLx, lLy, lLz, lambda, dt);
      }
      if (wantR > 0) {
        dampVec3Tuple(tp.rU, rUx, rUy, rUz, lambda, dt);
        dampVec3Tuple(tp.rL, rLx, rLy, rLz, lambda, dt);
      }
      if (wantBody > 0) {
        dampVec3Tuple(tp.sp, spX, spY, spZ, lambda, dt);
        dampVec3Tuple(tp.hd, hdX, hdY, hdZ, lambda, dt);
      }

      if (tp.lWeight > 0.005) {
        applyQuatTaskBone(bones.leftArm, q.leftArm, tp.lU, tp.lWeight);
        applyQuatTaskBone(bones.leftForeArm, q.leftForeArm, tp.lL, tp.lWeight);
      }
      if (tp.rWeight > 0.005) {
        applyQuatTaskBone(bones.rightArm, q.rightArm, tp.rU, tp.rWeight);
        applyQuatTaskBone(bones.rightForeArm, q.rightForeArm, tp.rL, tp.rWeight);
      }
      if (tp.bodyWeight > 0.005) {
        applyQuatTaskBone(bones.spine, q.spine, tp.sp, tp.bodyWeight);
        applyQuatTaskBone(bones.head, q.head, tp.hd, tp.bodyWeight);
      }
    }

    if (rec.rigBones) {
      const wantWalk = walkLike && !rec.hasDedicatedWalkClip ? 1 : 0;
      const wantSit = rec.targetState === 'Sit' && !rec.hasDedicatedSitClip ? 1 : 0;
      const wantCheckout = rec.targetState === 'Checkout' && !rec.hasDedicatedCheckoutClip && !rec.idleCalmQuats ? 1 : 0;
      rec.walkOverlayWeight = dt > 0 ? THREE.MathUtils.damp(rec.walkOverlayWeight, wantWalk, 9, dt) : wantWalk;
      rec.sitOverlayWeight = dt > 0 ? THREE.MathUtils.damp(rec.sitOverlayWeight, wantSit, 10, dt) : wantSit;
      rec.checkoutOverlayWeight = dt > 0 ? THREE.MathUtils.damp(rec.checkoutOverlayWeight, wantCheckout, 9, dt) : wantCheckout;

      const bones = rec.rigBones;
      const ww = rec.walkOverlayWeight;
      const sw = rec.sitOverlayWeight;
      const cw = rec.checkoutOverlayWeight;
      const qSitW = rec.hasSitDownClip ? rec.sitOffsetWeight : 0;
      const isStaticTpose = rec.clipProfile === 'static';
      // Static 0s rigs start in horizontal T-pose: pull upper arms down ~73 deg along torso
      const baseArmDown = isStaticTpose ? 1.28 : 0;

      if (qSitW > 0.01) {
        // Quaternius SitDown posture refinement: upright relaxed spine, symmetric forward arms & natural seated glance
        const breath = Math.sin(st * 1.65);
        applyBoneOverlayEuler(rec, bones.spine, (0.14 + breath * 0.016) * qSitW, Math.sin(st * 0.55) * 0.022 * qSitW, 0);
        applyBoneOverlayEuler(rec, bones.spine2, (0.06 + breath * 0.012) * qSitW, Math.sin(st * 0.45) * 0.018 * qSitW, 0);
        applyBoneOverlayEuler(
          rec,
          bones.head,
          (-0.05 + Math.sin(st * 0.85) * 0.03) * qSitW,
          Math.sin(st * 0.52) * 0.14 * qSitW,
          Math.sin(st * 0.37) * 0.018 * qSitW
        );
        applyBoneOverlayEuler(rec, bones.leftArm, -0.235 * qSitW, 0.067 * qSitW, -0.553 * qSitW);
        applyBoneOverlayEuler(rec, bones.leftForeArm, (0.651 + Math.sin(st * 1.15) * 0.026) * qSitW, 0.353 * qSitW, 0.972 * qSitW);
        applyBoneOverlayEuler(rec, bones.rightArm, -0.347 * qSitW, 0.021 * qSitW, -0.122 * qSitW);
        applyBoneOverlayEuler(rec, bones.rightForeArm, (0.867 + Math.cos(st * 1.1) * 0.026) * qSitW, 0.173 * qSitW, 0.370 * qSitW);
      } else if (ww > 0.01 && sw <= 0.25) {
        const stride = st * 6.4;
        const s = Math.sin(stride);
        const c = Math.cos(stride);
        const lHipX = s * 0.44 * ww;
        const rHipX = -s * 0.44 * ww;
        const lKneeX = -Math.max(0, -c * 0.48 + 0.12) * ww;
        const rKneeX = -Math.max(0, c * 0.48 + 0.12) * ww;
        applyBoneOverlayEuler(rec, bones.leftUpLeg, lHipX, 0, 0);
        applyBoneOverlayEuler(rec, bones.rightUpLeg, rHipX, 0, 0);
        applyBoneOverlayEuler(rec, bones.leftLeg, lKneeX, 0, 0);
        applyBoneOverlayEuler(rec, bones.rightLeg, rKneeX, 0, 0);

        const armSwing = s * 0.10 * ww;
        applyBoneOverlayEuler(rec, bones.leftArm, baseArmDown - 0.03 * ww, 0, armSwing);
        applyBoneOverlayEuler(rec, bones.leftForeArm, 0, 0, -(0.12 + Math.max(0, -s) * 0.06) * ww);
        if (rec.umbrellaActive && !rec.idleCalmQuats) {
          if (rec.isQuaterniusRig) {
            applyBoneOverlayEuler(rec, bones.rightArm, baseArmDown + 0.14 * ww, 0, 0.50 * ww);
            applyBoneOverlayEuler(rec, bones.rightForeArm, 0.72 * ww, 0, 0.76 * ww);
          } else {
            applyBoneOverlayEuler(rec, bones.rightArm, (baseArmDown - 0.28) * ww, 0, -0.08 * ww);
            applyBoneOverlayEuler(rec, bones.rightForeArm, -1.25 * ww, 0, 0);
          }
        } else {
          applyBoneOverlayEuler(rec, bones.rightArm, baseArmDown + 0.03 * ww, 0, armSwing);
          applyBoneOverlayEuler(rec, bones.rightForeArm, 0, 0, (0.12 + Math.max(0, s) * 0.06) * ww);
        }

        applyBoneOverlayEuler(rec, bones.spine, 0.025 * ww, s * 0.025 * ww, 0);
        applyBoneOverlayEuler(rec, bones.head, 0.015 * ww, Math.sin(st * 0.7) * 0.05 * ww, 0);
        rec.modelRoot.position.y = Math.abs(Math.sin(stride)) * 0.02 * ww;
      } else if (sw > 0.01) {
        // Procedural seated classroom/bench pose for static-rig / idle-only models
        const breath = Math.sin(st * 1.8);
        applyBoneOverlayEuler(rec, bones.leftUpLeg, 1.42 * sw, 0, 0);
        applyBoneOverlayEuler(rec, bones.rightUpLeg, 1.42 * sw, 0, 0);
        applyBoneOverlayEuler(rec, bones.leftLeg, -1.46 * sw, 0, 0);
        applyBoneOverlayEuler(rec, bones.rightLeg, -1.46 * sw, 0, 0);
        applyBoneOverlayEuler(rec, bones.leftArm, (baseArmDown * 0.88 + 0.12) * sw, 0, -0.22 * sw);
        applyBoneOverlayEuler(rec, bones.rightArm, (baseArmDown * 0.88 + 0.12) * sw, 0, 0.22 * sw);
        applyBoneOverlayEuler(rec, bones.leftForeArm, 0, 0, -0.58 * sw);
        applyBoneOverlayEuler(rec, bones.rightForeArm, 0, 0, 0.58 * sw);
        applyBoneOverlayEuler(rec, bones.spine, (0.04 + breath * 0.02) * sw, 0, 0);
        applyBoneOverlayEuler(rec, bones.head, 0.04 * sw, Math.sin(st * 0.7) * 0.12 * sw, 0);
        rec.modelRoot.position.y = (isStaticTpose ? -0.22 : -0.33) * sw;
      } else {
        if (!rec.hasSitDownClip) {
          rec.modelRoot.position.y = dt > 0 ? THREE.MathUtils.damp(rec.modelRoot.position.y, 0, 10, dt) : 0;
        }
        if (walkLike && rec.hasDedicatedWalkClip && rec.taskPose.bodyWeight < 0.05) {
          // Subtle relaxed gaze stabilization atop dedicated Walk clip
          applyBoneOverlayEuler(rec, bones.spine, 0.015, Math.sin(st * 2.5) * 0.008, 0);
          applyBoneOverlayEuler(
            rec,
            bones.head,
            0.01 + Math.sin(st * 5.0) * 0.008,
            Math.sin(st * 0.72) * 0.055,
            Math.sin(st * 2.5) * 0.008
          );
        } else if (isStaticTpose) {
          const idleSway = Math.sin(st * 1.4);
          applyBoneOverlayEuler(rec, bones.leftArm, baseArmDown + idleSway * 0.02, 0, -0.05);
          applyBoneOverlayEuler(rec, bones.rightArm, baseArmDown - idleSway * 0.02, 0, 0.05);
          applyBoneOverlayEuler(rec, bones.leftForeArm, 0, 0, -0.18);
          applyBoneOverlayEuler(rec, bones.rightForeArm, 0, 0, 0.18);
          applyBoneOverlayEuler(rec, bones.spine, idleSway * 0.018, Math.sin(st * 0.6) * 0.03, 0);
          applyBoneOverlayEuler(rec, bones.head, Math.sin(st * 0.9) * 0.03, Math.sin(st * 0.55) * 0.11, 0);
        } else if (rec.targetState === 'Idle') {
          const idleSway = Math.sin(st * 1.45);
          applyBoneOverlayEuler(rec, bones.spine, idleSway * 0.016, Math.sin(st * 0.52) * 0.028, 0);
          applyBoneOverlayEuler(rec, bones.head, Math.sin(st * 0.85) * 0.032, Math.sin(st * 0.58) * 0.12, Math.sin(st * 0.41) * 0.018);
        }
      }

      if (cw > 0.01 && ww <= 0.25 && sw <= 0.25) {
        const scanCycle = st * 3.6;
        const sweepLR = Math.sin(scanCycle * 0.75);
        const reachPulse = 0.5 + 0.5 * Math.sin(scanCycle * 1.35);
        const aimDip = Math.max(0, Math.sin(scanCycle * 1.8)) * 0.16;

        // Right arm extends forward at counter height holding the barcode scanner
        const rArmInward = (baseArmDown * 0.72 + 0.16 + 0.14 * sweepLR) * cw;
        const rArmForward = -(0.62 + 0.18 * reachPulse) * cw;
        const rForeBend = (0.76 + 0.22 * reachPulse + aimDip) * cw;
        applyBoneOverlayEuler(rec, bones.rightArm, rArmInward, 0.16 * sweepLR * cw, rArmForward);
        applyBoneOverlayEuler(rec, bones.rightForeArm, 0.12 * cw, -0.10 * sweepLR * cw, rForeBend);

        // Left arm reaches slightly toward items/bag on counter
        const lArmInward = (baseArmDown * 0.72 - (0.14 + 0.08 * sweepLR)) * cw;
        const lArmForward = (0.44 + 0.10 * Math.cos(scanCycle * 0.8)) * cw;
        const lForeBend = -(0.68 + 0.14 * Math.cos(scanCycle * 0.8)) * cw;
        applyBoneOverlayEuler(rec, bones.leftArm, lArmInward, 0, lArmForward);
        applyBoneOverlayEuler(rec, bones.leftForeArm, -0.06 * cw, 0, lForeBend);

        applyBoneOverlayEuler(rec, bones.spine, 0.09 * cw, 0.09 * sweepLR * cw, 0);
        applyBoneOverlayEuler(rec, bones.head, (0.10 + 0.03 * Math.sin(scanCycle * 1.4)) * cw, 0.14 * sweepLR * cw, 0);
      }
    }
  } else {
    rec.modelRoot.scale.y = 1 + Math.sin(st * 2.2) * 0.006;
    if (rec.targetState === 'Walk') {
      rec.modelRoot.position.y = Math.abs(Math.sin(st * 7.2)) * 0.03;
      rec.modelRoot.rotation.z = Math.sin(st * 3.6) * 0.035;
      rec.modelRoot.rotation.y = Math.sin(st * 1.4) * 0.04;
    } else if (rec.targetState === 'Wave' || rec.targetState === 'Lecture' || rec.targetState === 'Checkout') {
      rec.modelRoot.position.y = 0;
      rec.modelRoot.rotation.z = 0;
      rec.modelRoot.rotation.y = Math.sin(st * 1.6) * 0.14;
      rec.modelRoot.rotation.x = 0.025 + Math.sin(st * 2.8) * 0.015;
    } else {
      rec.modelRoot.position.y = 0;
      rec.modelRoot.rotation.z = 0;
      rec.modelRoot.rotation.x = 0;
      rec.modelRoot.rotation.y = Math.sin(st * 0.85) * 0.07;
    }
  }
}

function syncUmbrellaPlacementForRecord(rec: ActiveGlbNpcRecord, glbShown: boolean): void {
  if (!rec.umbrellaActive) {
    if (rec.umbrellaGroup) rec.umbrellaGroup.visible = false;
    return;
  }
  if (!rec.umbrellaGroup) {
    rec.umbrellaGroup = createNpcUmbrellaMeshGroup(rec.umbrellaColorIdx);
    rec.hostGroup.add(rec.umbrellaGroup);
  }
  rec.umbrellaGroup.visible = true;

  if (glbShown && rec.rightHandBone) {
    rec.rightHandBone.getWorldPosition(_tmpHandPos);
    rec.hostGroup.worldToLocal(_tmpHandPos);
    if (
      Math.abs(_tmpHandPos.x) < 0.65 &&
      _tmpHandPos.y >= 0.72 &&
      _tmpHandPos.y <= 1.65 &&
      Math.abs(_tmpHandPos.z) < 0.65
    ) {
      rec.umbrellaGroup.position.copy(_tmpHandPos);
      // Negative X tilts shaft gently back toward head center; Z tilts inward toward centerline
      rec.umbrellaGroup.rotation.set(-0.11, 0, _tmpHandPos.x < 0 ? -0.10 : 0.10);
      return;
    }
  }

  if (glbShown) {
    if (rec.isQuaterniusRig) {
      rec.umbrellaGroup.position.set(-0.14, 1.09, 0.29);
      rec.umbrellaGroup.rotation.set(-0.11, 0, -0.10);
    } else {
      rec.umbrellaGroup.position.set(0.17, 1.09, 0.29);
      rec.umbrellaGroup.rotation.set(-0.11, 0, 0.10);
    }
  } else {
    // Fallback blocky rig has rightArm on +X side (+0.25)
    rec.umbrellaGroup.position.set(0.24, 1.14, 0.22);
    rec.umbrellaGroup.rotation.set(-0.10, 0, 0.12);
  }
}

/**
 * Steps active GLB AnimationMixers with 3-Tier Distance LOD, Frustum Culling,
 * Closest-N Visible SkinnedMesh Cap & Staggered Updates (Zero GC per frame).
 */
export function updateAllGlbHumanNpcs(
  delta: number,
  cameraPos: THREE.Vector3,
  camera?: THREE.Camera
): void {
  if (activeGlbRecords.length === 0) return;
  const dt = Math.min(delta, 0.08);
  _tmpCam.copy(cameraPos);
  _frameCounter = (_frameCounter + 1) & 0x7fffffff;

  const budgetChanged = _lastAppliedBudgetVersion !== _budgetVersion;
  if (budgetChanged) {
    _lastAppliedBudgetVersion = _budgetVersion;
  }

  const useFrustum = !!camera;
  if (camera) {
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);
  }

  if (_visCandIdx.length < activeGlbRecords.length) {
    const nextCap = Math.max(activeGlbRecords.length + 64, _visCandIdx.length * 2);
    _visCandIdx = new Int32Array(nextCap);
    _visCandDistSq = new Float64Array(nextCap);
    _visCandInFrustum = new Uint8Array(nextCap);
  }

  let candCount = 0;

  // Pass 1: Distance/hierarchy culling, umbrella toggles, hide out-of-range GLBs, collect in-range GLB candidates
  for (let i = activeGlbRecords.length - 1; i >= 0; i--) {
    const rec = activeGlbRecords[i];
    if (rec.disposed) {
      activeGlbRecords.splice(i, 1);
      continue;
    }
    if (!rec.visible) continue;

    const walkLikeState = isWalkingLikeState(rec.targetState);
    const rainStatePendingToggle = _globalRainActive !== rec.umbrellaActive && walkLikeState;

    // Stagger distant NPC matrix lookups (1-in-24 beyond 120m, 1-in-12 beyond 90m, 1-in-6 beyond 60m)
    if (!budgetChanged && !rainStatePendingToggle) {
      if (rec.lastDistSq > 14400) {
        if ((i + _frameCounter) % 24 !== 0) continue;
      } else if (rec.lastDistSq > 8100) {
        if ((i + _frameCounter) % 12 !== 0) continue;
      } else if (rec.lastDistSq > 3600) {
        const mod = walkLikeState ? 3 : 6;
        if ((i + _frameCounter) % mod !== 0) continue;
      }
    }

    // Fast hierarchy visibility check before matrix read
    if (!rec.hostGroup.visible) continue;
    let p: THREE.Object3D | null = rec.hostGroup.parent;
    if (p && !p.visible) continue;
    let parentVis = true;
    while (p) {
      if (!p.visible) {
        parentVis = false;
        break;
      }
      p = p.parent;
    }
    if (!parentVis) continue;

    rec.hostGroup.getWorldPosition(rec.worldPos);
    const dx = rec.worldPos.x - _tmpCam.x;
    const dz = rec.worldPos.z - _tmpCam.z;
    const dSq = dx * dx + dz * dz;
    rec.lastDistSq = dSq;

    // Rain umbrella state applies to ALL outdoor walking NPCs (both GLB rigs & fallback rigs within 180m)
    const wantUmbrella =
      dSq <= 32400 &&
      shouldNpcCarryRainUmbrella(
        _globalRainActive,
        rec.allowRainUmbrella,
        rec.targetState,
        rec.worldPos.x,
        rec.worldPos.z
      );
    rec.umbrellaActive = wantUmbrella;

    if (!rec.modelRoot) {
      if (rec.umbrellaActive || (rec.umbrellaGroup && rec.umbrellaGroup.visible)) {
        syncUmbrellaPlacementForRecord(rec, false);
      }
      continue;
    }

    const effectiveModelRadiusSq = Math.min(rec.lodModelRadiusSq, _maxModelRadiusSq);
    if (dSq > effectiveModelRadiusSq) {
      if (rec.lastShowGlb !== false) {
        rec.lastShowGlb = false;
        rec.modelRoot.visible = false;
        for (let f = 0; f < rec.fallbackMeshes.length; f++) {
          rec.fallbackMeshes[f].visible = true;
        }
      }
      rec.pendingDt = 0;
      if (rec.umbrellaActive || (rec.umbrellaGroup && rec.umbrellaGroup.visible)) {
        syncUmbrellaPlacementForRecord(rec, false);
      }
      continue;
    }

    let inFrustum = true;
    if (useFrustum) {
      _frustumSphere.center.set(rec.worldPos.x, rec.worldPos.y + 0.9, rec.worldPos.z);
      inFrustum = _frustum.intersectsSphere(_frustumSphere);
    }

    // Off-frustum NPCs > 8m behind camera don't burn visible SkinnedMesh slots
    if (!inFrustum && dSq > 64) {
      if (rec.lastShowGlb !== false) {
        rec.lastShowGlb = false;
        rec.modelRoot.visible = false;
        for (let f = 0; f < rec.fallbackMeshes.length; f++) {
          rec.fallbackMeshes[f].visible = true;
        }
      }
      rec.pendingDt = Math.min(rec.pendingDt + dt, 0.25);
      if (rec.umbrellaActive || (rec.umbrellaGroup && rec.umbrellaGroup.visible)) {
        syncUmbrellaPlacementForRecord(rec, false);
      }
      continue;
    }

    _visCandIdx[candCount] = i;
    _visCandDistSq[candCount] = dSq;
    _visCandInFrustum[candCount] = inFrustum ? 1 : 0;
    candCount++;
  }

  // Sort small in-range candidate list by distance (insertion sort — <0.005ms for ~20-50 items, zero GC)
  for (let a = 1; a < candCount; a++) {
    const keyDist = _visCandDistSq[a];
    const keyIdx = _visCandIdx[a];
    const keyFrustum = _visCandInFrustum[a];
    let b = a - 1;
    while (b >= 0 && _visCandDistSq[b] > keyDist) {
      _visCandDistSq[b + 1] = _visCandDistSq[b];
      _visCandIdx[b + 1] = _visCandIdx[b];
      _visCandInFrustum[b + 1] = _visCandInFrustum[b];
      b--;
    }
    _visCandDistSq[b + 1] = keyDist;
    _visCandIdx[b + 1] = keyIdx;
    _visCandInFrustum[b + 1] = keyFrustum;
  }

  let closePriorityCount = 0;
  let walkFullCount = 0;
  let stationaryFullCount = 0;
  let staggeredCount = 0;

  // Pass 2: Show GLB SkinnedMesh ONLY for closest _maxVisibleModels candidates; fallback for overflow
  for (let c = 0; c < candCount; c++) {
    const recIdx = _visCandIdx[c];
    const rec = activeGlbRecords[recIdx];
    const dSq = _visCandDistSq[c];
    const inFrustum = _visCandInFrustum[c] === 1;
    const showGlb = c < _maxVisibleModels;

    if (rec.lastShowGlb !== showGlb) {
      rec.lastShowGlb = showGlb;
      if (rec.modelRoot) rec.modelRoot.visible = showGlb;
      for (let f = 0; f < rec.fallbackMeshes.length; f++) {
        rec.fallbackMeshes[f].visible = !showGlb;
      }
    }

    const effectiveMixerRadiusSq = Math.min(rec.lodMixerRadiusSq, _maxMixerRadiusSq);
    if (!showGlb || dSq > effectiveMixerRadiusSq) {
      rec.pendingDt = 0;
      syncUmbrellaPlacementForRecord(rec, showGlb);
      continue;
    }

    if (!inFrustum) {
      rec.pendingDt = Math.min(rec.pendingDt + dt, 0.25);
      syncUmbrellaPlacementForRecord(rec, showGlb);
      continue;
    }

    const isWalking = isWalkingLikeState(rec.targetState);
    const isActiveTask =
      rec.targetState === 'Checkout' ||
      rec.targetState === 'PickUp' ||
      rec.targetState === 'Carry' ||
      rec.targetState === 'Stock' ||
      rec.targetState === 'PickShelf' ||
      rec.targetState === 'InspectItem' ||
      rec.targetState === 'DropBasket' ||
      rec.targetState === 'Attack' ||
      rec.targetState === 'Surrender' ||
      rec.targetState === 'Wave' ||
      rec.targetState === 'Lecture' ||
      rec.targetState === 'FilmPhone';
    const isSettlingSit =
      rec.hasSitDownClip &&
      ((rec.targetState === 'Sit' && rec.sitOffsetWeight < 0.995) ||
        (rec.targetState !== 'Sit' && rec.sitOffsetWeight > 0.005));
    const isClosePriority =
      dSq <= CLOSE_WALK_DIST_SQ &&
      closePriorityCount < _maxClosePriorityMixers &&
      (isWalking || isActiveTask || isSettlingSit);
    if (isClosePriority || ((isWalking || isSettlingSit) && walkFullCount < _maxWalkFullRateMixers)) {
      if (isClosePriority) {
        closePriorityCount++;
      } else {
        walkFullCount++;
      }
      const stepDt = dt + rec.pendingDt;
      rec.pendingDt = 0;
      stepRecordAnimation(rec, stepDt);
    } else if (
      !isWalking &&
      dSq <= CLOSE_STATIONARY_DIST_SQ &&
      rec.targetState !== 'Sit' &&
      stationaryFullCount < _maxStationaryFullMixers
    ) {
      stationaryFullCount++;
      const stepDt = dt + rec.pendingDt;
      rec.pendingDt = 0;
      stepRecordAnimation(rec, stepDt);
    } else if (staggeredCount < _maxStaggeredMixers) {
      staggeredCount++;
      rec.pendingDt += dt;
      if ((recIdx + _frameCounter) % 3 === 0) {
        const stepDt = rec.pendingDt;
        rec.pendingDt = 0;
        stepRecordAnimation(rec, stepDt);
      }
    }

    // Sync umbrella after animation step so rightHandBone world matrix is current (zero 1-frame lag)
    syncUmbrellaPlacementForRecord(rec, showGlb);
  }
}

/**
 * Shortest-arc damped yaw steering so NPCs turn smoothly around corners without 1-frame snaps.
 */
export function steerYawSmooth(obj: THREE.Object3D, targetYaw: number, turnRate: number, dt: number): void {
  let diff = ((targetYaw - obj.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  const alpha = 1 - Math.exp(-turnRate * Math.max(0, dt));
  obj.rotation.y += diff * alpha;
}

export function getRegisteredGlbHumanCount(): number {
  return activeGlbRecords.length;
}

export function clearGlbHumanRegistryForTest(): void {
  activeGlbRecords.length = 0;
}
