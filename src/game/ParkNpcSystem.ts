import * as THREE from 'three';
import { attachGlbHumanToNpc, steerYawSmooth, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickOutsideNpcModel, pickSeatedCivilianModel, pickStationaryCivilianModel } from './NpcModelCatalog';

export interface ParkCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

interface ParkNpcRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  glbHandle: GlbHumanHandle;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
}

interface StationaryParkActor extends ParkNpcRig {
  phaseOffset: number;
  mode: 'seated_chill' | 'seated_chat' | 'admire_fountain' | 'stretch_rest';
}

interface WalkingParkActor extends ParkNpcRig {
  waypoints: Array<{ x: number; z: number; pauseSec: number }>;
  wpIdx: number;
  x: number;
  z: number;
  speed: number;
  isJogger: boolean;
  pauseTimer: number;
  walkPhase: number;
}

/**
 * Animated Green Park Fountain Water Jets, Parabolic Streams, Droplets & Ripples.
 * Centered at World (36.5, 0, 54.5).
 * Runs actively from 07:00 AM until 21:00 (9:00 PM), then turns off overnight.
 */
export class ParkFountainController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private sprayGroup: THREE.Group = new THREE.Group();
  private centerPlume!: THREE.Mesh;
  private centerCrownSpray!: THREE.Mesh;
  private midArcStreams: Array<{ mesh: THREE.Mesh; baseScaleY: number; phase: number }> = [];
  private droplets: Array<{
    mesh: THREE.Mesh;
    angle: number;
    phase: number;
    speed: number;
    tier: 'top' | 'mid';
  }> = [];
  private rippleRings: Array<{ mesh: THREE.Mesh; phase: number }> = [];
  private poolWaterMat!: THREE.MeshStandardMaterial;

  constructor(worldX: number = 36.5, worldZ: number = 54.5) {
    this.rootGroup.userData.noMerge = true;
    this.rootGroup.position.set(worldX, 0, worldZ);
    this.buildFountainWater();
  }

  private buildFountainWater() {
    // Shimmering basin water surface + shallow bowl water discs (always present even when jets are off)
    this.poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.14,
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.85,
    });

    const basinPool = new THREE.Mesh(new THREE.CylinderGeometry(2.90, 2.90, 0.06, 28), this.poolWaterMat);
    basinPool.position.set(0, 0.50, 0);
    this.rootGroup.add(basinPool);

    const lowerBowlPool = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.04, 18), this.poolWaterMat);
    lowerBowlPool.position.set(0, 1.56, 0);
    this.rootGroup.add(lowerBowlPool);

    const upperBowlPool = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.03, 16), this.poolWaterMat);
    upperBowlPool.position.set(0, 2.43, 0);
    this.rootGroup.add(upperBowlPool);

    // Spray Group (Hidden cleanly when fountain is OFF after 21:00 until 07:00)
    this.rootGroup.add(this.sprayGroup);

    const jetMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      transparent: true,
      opacity: 0.78,
    });

    const dropletMat = new THREE.MeshStandardMaterial({
      color: 0xf0f9ff,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    });

    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.50,
      side: THREE.DoubleSide,
    });

    // 1. Central High Geyser Column rising from top finial nozzle (Y = 2.44 .. 4.1)
    const plumeGeo = new THREE.CylinderGeometry(0.06, 0.20, 1.55, 12);
    plumeGeo.translate(0, 0.775, 0); // Pivot at nozzle base
    this.centerPlume = new THREE.Mesh(plumeGeo, jetMat);
    this.centerPlume.position.set(0, 2.44, 0);
    this.sprayGroup.add(this.centerPlume);

    // Mist crown flare at peak of center geyser
    this.centerCrownSpray = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.08, 0.48, 12), dropletMat);
    this.centerCrownSpray.position.set(0, 3.85, 0);
    this.sprayGroup.add(this.centerCrownSpray);

    // 2. 8 Upper Rim Spray Jets fanning outward into Lower Bowl
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const streamGeo = new THREE.CylinderGeometry(0.025, 0.045, 0.72, 6);
      const stream = new THREE.Mesh(streamGeo, jetMat);
      stream.position.set(Math.sin(ang) * 0.62, 2.15, Math.cos(ang) * 0.62);
      stream.rotation.y = ang;
      stream.rotation.x = 0.58;
      this.sprayGroup.add(stream);
      this.midArcStreams.push({ mesh: stream, baseScaleY: 1.0, phase: i * 0.75 });
    }

    // 3. 12 Lower Bowl Cascading Jets pouring down into the Main Basin Pool
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + 0.12;
      const cascadeGeo = new THREE.CylinderGeometry(0.03, 0.06, 1.08, 6);
      const cascade = new THREE.Mesh(cascadeGeo, jetMat);
      cascade.position.set(Math.sin(ang) * 1.48, 1.05, Math.cos(ang) * 1.48);
      cascade.rotation.y = ang;
      cascade.rotation.x = 0.46;
      this.sprayGroup.add(cascade);
      this.midArcStreams.push({ mesh: cascade, baseScaleY: 1.0, phase: i * 0.52 });
    }

    // 4. 28 Parabolic Flying Water Droplets
    const dropGeo = new THREE.SphereGeometry(0.055, 6, 6);
    for (let i = 0; i < 28; i++) {
      const drop = new THREE.Mesh(dropGeo, dropletMat);
      this.sprayGroup.add(drop);
      this.droplets.push({
        mesh: drop,
        angle: (i / 28) * Math.PI * 2 * 2.3,
        phase: (i / 28),
        speed: 0.95 + (i % 5) * 0.14,
        tier: i % 2 === 0 ? 'top' : 'mid',
      });
    }

    // 5. 3 Expanding Concentric Water Ripple Rings on Basin Surface (Y = 0.54)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.85, 28), rippleMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.542, 0);
      this.sprayGroup.add(ring);
      this.rippleRings.push({ mesh: ring, phase: i / 3 });
    }
  }

  public update(delta: number, rawHour: number) {
    // Runs from 07:00 AM until 21:00 (9:00 PM), turns off completely from 21:00 to 07:00
    const isFountainRunning = rawHour >= 7.0 && rawHour < 21.0;
    this.sprayGroup.visible = isFountainRunning;
    this.poolWaterMat.emissiveIntensity = isFountainRunning ? 0.18 : 0.05;

    if (!isFountainRunning) return;

    const dt = Math.min(delta, 0.1);
    const now = performance.now() * 0.001;

    // Pulse main center plume height & radial width smoothly
    const pulseA = Math.sin(now * 6.5) * 0.08 + Math.sin(now * 11.2) * 0.04;
    this.centerPlume.scale.set(1.0 - pulseA * 0.35, 1.0 + pulseA, 1.0 - pulseA * 0.35);
    this.centerCrownSpray.position.y = 3.88 + pulseA * 1.15;
    this.centerCrownSpray.rotation.y += dt * 3.8;
    const crownS = 1.0 + Math.sin(now * 8.0) * 0.14;
    this.centerCrownSpray.scale.set(crownS, 1.0 + Math.cos(now * 9.0) * 0.15, crownS);

    // Shimmer side arc streams
    for (let i = 0; i < this.midArcStreams.length; i++) {
      const s = this.midArcStreams[i];
      const w = 1.0 + Math.sin(now * 7.5 + s.phase) * 0.08;
      s.mesh.scale.set(1.0, w, 1.0);
    }

    // Parabolic trajectories for falling spray droplets
    for (let i = 0; i < this.droplets.length; i++) {
      const d = this.droplets[i];
      d.phase = (d.phase + dt * d.speed) % 1.0;
      const t = d.phase;

      if (d.tier === 'top') {
        // Erupts from top nozzle (Y=3.6 -> arcs outward radius 0.1..1.15 -> lands in lower bowl Y=1.55)
        const r = 0.08 + t * 1.08;
        const y = 3.55 + 1.85 * t - 3.85 * t * t;
        d.mesh.position.set(Math.sin(d.angle) * r, Math.max(1.56, y), Math.cos(d.angle) * r);
        const s = 0.75 + Math.sin(t * Math.PI) * 0.45;
        d.mesh.scale.setScalar(s);
      } else {
        // Cascades from lower bowl rim (R=1.18, Y=1.54 -> R=2.45, Y=0.52)
        const r = 1.18 + t * 1.28;
        const y = 1.54 + 0.62 * t - 1.64 * t * t;
        d.mesh.position.set(Math.sin(d.angle) * r, Math.max(0.52, y), Math.cos(d.angle) * r);
        const s = 0.7 + Math.sin(t * Math.PI) * 0.4;
        d.mesh.scale.setScalar(s);
      }
    }

    // Concentric surface ripples spreading outward on basin pool
    for (let i = 0; i < this.rippleRings.length; i++) {
      const r = this.rippleRings[i];
      r.phase = (r.phase + dt * 0.48) % 1.0;
      const scale = 0.9 + r.phase * 2.4;
      r.mesh.scale.set(scale, scale, 1);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1.0 - r.phase) * 0.55;
    }
  }
}

export interface ParkPlacementConfig {
  centerX?: number;
  centerZ?: number;
  rotationY?: number;
  latScale?: number;
}

/**
 * Animated Green Park NPCs (strollers, joggers, bench loungers, fountain viewers).
 * Strictly active from 05:30 until 22:00 — automatically clears out after 10 PM so the park is empty at night.
 */
export class ParkNpcController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private stationaryActors: StationaryParkActor[] = [];
  private walkingActors: WalkingParkActor[] = [];
  private readonly latScale: number;

  constructor(helpers: ParkCharacterHelpers, placement: ParkPlacementConfig = {}) {
    this.rootGroup.userData.noMerge = true;
    const cx = placement.centerX ?? 36.5;
    const cz = placement.centerZ ?? 54.5;
    const rotY = placement.rotationY ?? 0;
    this.latScale = placement.latScale ?? 1.0;
    this.rootGroup.position.set(cx, 0, cz);
    this.rootGroup.rotation.y = rotY;
    this.buildStationaryActors(helpers);
    this.buildWalkingActors(helpers);
  }

  private buildNpcRig(
    paletteIndex: number,
    helpers: ParkCharacterHelpers,
    opts: { isJogger?: boolean; withBook?: boolean; initialState?: 'Idle' | 'Walk' | 'Sit'; stationary?: boolean } = {}
  ): ParkNpcRig {
    const skinPalette = [
      { color: 0xffdbac, hex: '#ffdbac' },
      { color: 0xf1c27d, hex: '#f1c27d' },
      { color: 0xe0ac69, hex: '#e0ac69' },
      { color: 0xc68642, hex: '#c68642' },
      { color: 0xffe0bd, hex: '#ffe0bd' },
    ];
    const hairPalette = [0x111111, 0x2b1d0c, 0x6b3e1a, 0xd4a359, 0x1e293b];
    const casualShirts = [0x10b981, 0x3b82f6, 0xf59e0b, 0xec4899, 0x06b6d4, 0xf8fafc, 0x8b5cf6];
    const pantsPalette = [0x1e293b, 0x334155, 0x0f172a, 0x475569];

    const skin = skinPalette[paletteIndex % skinPalette.length];
    const hair = hairPalette[(paletteIndex + 1) % hairPalette.length];
    const shirtColor = opts.isJogger ? 0xf97316 : casualShirts[paletteIndex % casualShirts.length];
    const pantsColor = opts.isJogger ? 0x0f172a : pantsPalette[(paletteIndex + 2) % pantsPalette.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.color, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.58 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.72 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

    const group = new THREE.Group();
    const hipsGroup = new THREE.Group();
    hipsGroup.position.set(0, 0.84, 0);
    group.add(hipsGroup);

    const buildLeg = (lx: number) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(lx, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.40, 0.145), pantsMat);
      thigh.position.set(0, -0.20, 0);
      hipPivot.add(thigh);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.40, 0);
      hipPivot.add(kneePivot);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.36, 0.135), pantsMat);
      shin.position.set(0, -0.18, 0);
      kneePivot.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.09, 0.22), shoesMat);
      shoe.position.set(0, -0.39, 0.04);
      kneePivot.add(shoe);

      hipsGroup.add(hipPivot);
      return { hipPivot, kneePivot };
    };

    const leftLegPair = buildLeg(-0.1);
    const rightLegPair = buildLeg(0.1);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.52, 0.23), shirtMat);
    torso.position.set(0, 0.28, 0);
    hipsGroup.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.70, 0);
    const faceTex = helpers.createFaceTexture('happy', skin.hex);
    headGroup.add(helpers.createHeadMesh(skinMat, faceTex, 0.22, 0.24, 0.21));
    const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.23), hairMat);
    hairCap.position.set(0, 0.14, -0.01);
    headGroup.add(hairCap);
    hipsGroup.add(headGroup);

    const buildArm = (ax: number) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(ax, 0.49, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.23, 0.11), shirtMat);
      sleeve.position.set(0, -0.11, 0);
      armPivot.add(sleeve);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.23, 0.095), skinMat);
      forearm.position.set(0, -0.31, 0);
      armPivot.add(forearm);
      hipsGroup.add(armPivot);
      return armPivot;
    };
    const leftArm = buildArm(-0.265);
    const rightArm = buildArm(0.265);

    if (opts.withBook) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.035, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 })
      );
      book.position.set(0.02, -0.38, 0.14);
      leftArm.add(book);
    }

    const npcSpec = opts.initialState === 'Sit'
      ? pickSeatedCivilianModel(paletteIndex)
      : opts.stationary
      ? pickStationaryCivilianModel(paletteIndex)
      : pickOutsideNpcModel(paletteIndex);
    const glbHandle = attachGlbHumanToNpc({
      modelSource: npcSpec.modelSource,
      targetHeight: npcSpec.targetHeight,
      clipProfile: npcSpec.clipProfile,
      rotationY: npcSpec.rotationY,
      hostGroup: group,
      fallbackMeshes: [hipsGroup],
      initialState: opts.initialState ?? 'Idle',
      phaseOffset: paletteIndex * 0.9,
      palette: {
        shirt: shirtColor,
        pants: pantsColor,
        hair,
        skin: skin.color,
      },
    });

    return {
      group,
      hipsGroup,
      glbHandle,
      leftLeg: leftLegPair.hipPivot,
      rightLeg: rightLegPair.hipPivot,
      leftKnee: leftLegPair.kneePivot,
      rightKnee: rightLegPair.kneePivot,
      leftArm,
      rightArm,
      headGroup,
    };
  }

  private sitRig(rig: ParkNpcRig, seatHeight: number = 0.50) {
    rig.hipsGroup.position.y = seatHeight;
    rig.leftLeg.rotation.x = -Math.PI / 2;
    rig.rightLeg.rotation.x = -Math.PI / 2;
    rig.leftKnee.rotation.x = Math.PI / 2;
    rig.rightKnee.rotation.x = Math.PI / 2;
  }

  private buildStationaryActors(helpers: ParkCharacterHelpers) {
    const s = this.latScale;
    // 1. Bench reader at West Garden Bench (local X = -7.8, Z = -1.86)
    const benchWest = this.buildNpcRig(0, helpers, { withBook: true, initialState: 'Sit', stationary: true });
    benchWest.group.position.set(-7.8 * s, 0.04, -1.86);
    benchWest.group.rotation.y = 0;
    this.sitRig(benchWest, 0.50);
    this.rootGroup.add(benchWest.group);
    this.stationaryActors.push({ ...benchWest, phaseOffset: 0.5, mode: 'seated_chill' });

    // 2. Bench visitor chatting on East Garden Bench (local X = 7.8, Z = -1.86)
    const benchEast = this.buildNpcRig(3, helpers, { initialState: 'Sit', stationary: true });
    benchEast.group.position.set(7.8 * s, 0.04, -1.86);
    benchEast.group.rotation.y = 0;
    this.sitRig(benchEast, 0.50);
    this.rootGroup.add(benchEast.group);
    this.stationaryActors.push({ ...benchEast, phaseOffset: 1.8, mode: 'seated_chat' });

    // 3. Bench rester inside Timber Pergola Pavilion (local X = 11.2, Z = 6.24)
    const benchPergola = this.buildNpcRig(5, helpers, { initialState: 'Sit', stationary: true });
    benchPergola.group.position.set(11.2 * s, 0.04, 6.24);
    benchPergola.group.rotation.y = 0;
    this.sitRig(benchPergola, 0.50);
    this.rootGroup.add(benchPergola.group);
    this.stationaryActors.push({ ...benchPergola, phaseOffset: 3.1, mode: 'seated_chill' });

    // 4. Fountain admirer beside South-West Fountain Rim (local X = -3.2, Z = -2.3)
    const fountainViewer = this.buildNpcRig(2, helpers, { initialState: 'Idle', stationary: true });
    fountainViewer.group.position.set(-3.2, 0.04, -2.3);
    fountainViewer.group.rotation.y = Math.PI * 0.25;
    this.rootGroup.add(fountainViewer.group);
    this.stationaryActors.push({ ...fountainViewer, phaseOffset: 2.3, mode: 'admire_fountain' });

    // 5. Park visitor relaxing by entrance trees (local X = -3.7, Z = -6.9)
    const entryGuest = this.buildNpcRig(4, helpers, { initialState: 'Idle', stationary: true });
    entryGuest.group.position.set(-3.7 * s, 0.04, -6.9);
    entryGuest.group.rotation.y = Math.PI * 0.35;
    this.rootGroup.add(entryGuest.group);
    this.stationaryActors.push({ ...entryGuest, phaseOffset: 4.0, mode: 'stretch_rest' });
  }

  private buildWalkingActors(helpers: ParkCharacterHelpers) {
    const s = this.latScale;
    const strollRouteA: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: 0.0, z: -13.3, pauseSec: 0.4 },
      { x: 0.0, z: -4.7, pauseSec: 4.0 },
      { x: 4.1 * s, z: 0.0, pauseSec: 2.5 },
      { x: 11.2 * s, z: 3.7, pauseSec: 4.5 },
      { x: 4.7 * s, z: 0.0, pauseSec: 0.5 },
      { x: 0.0, z: -7.5, pauseSec: 1.5 },
      { x: 0.0, z: -13.3, pauseSec: 0.4 },
      { x: -10.5 * s, z: -13.3, pauseSec: 1.2 },
    ];

    const jogRouteB: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: 0.0, z: -8.3, pauseSec: 0.0 },
      { x: -4.7 * s, z: -3.7, pauseSec: 0.0 },
      { x: -13.7 * s, z: 0.0, pauseSec: 0.5 },
      { x: -4.7 * s, z: 4.1, pauseSec: 0.0 },
      { x: 0.0, z: 8.1, pauseSec: 0.4 },
      { x: 5.3 * s, z: 3.9, pauseSec: 0.0 },
      { x: 13.7 * s, z: 0.0, pauseSec: 0.5 },
      { x: 5.3 * s, z: -3.9, pauseSec: 0.0 },
    ];

    const strollRouteC: Array<{ x: number; z: number; pauseSec: number }> = [
      { x: -12.0 * s, z: 0.0, pauseSec: 2.5 },
      { x: -5.5 * s, z: 0.0, pauseSec: 3.0 },
      { x: 0.0, z: 7.5, pauseSec: 2.0 },
      { x: 0.0, z: 21.0, pauseSec: 4.5 }, // Strolls deep into Rear Pergola Rotunda
      { x: -6.7 * s, z: 16.5, pauseSec: 4.0 }, // Admires Deep Left Koi Pond
      { x: 0.0, z: 13.5, pauseSec: 1.5 },
      { x: 5.7 * s, z: 0.0, pauseSec: 3.0 },
      { x: 12.5 * s, z: 0.0, pauseSec: 2.2 },
    ];

    [
      { route: strollRouteA, startIdx: 1, palette: 1, speed: 1.25, isJogger: false },
      { route: jogRouteB, startIdx: 2, palette: 6, speed: 2.65, isJogger: true },
      { route: strollRouteC, startIdx: 0, palette: 9, speed: 1.18, isJogger: false },
    ].forEach((cfg) => {
      const rig = this.buildNpcRig(cfg.palette, helpers, { isJogger: cfg.isJogger, initialState: 'Walk' });
      const startPt = cfg.route[cfg.startIdx];
      rig.group.position.set(startPt.x, startPt.z > -12.0 ? 0.04 : 0.0, startPt.z);
      this.rootGroup.add(rig.group);
      this.walkingActors.push({
        ...rig,
        waypoints: cfg.route,
        wpIdx: (cfg.startIdx + 1) % cfg.route.length,
        x: startPt.x,
        z: startPt.z,
        speed: cfg.speed,
        isJogger: cfg.isJogger,
        pauseTimer: 0.8,
        walkPhase: cfg.palette * 1.2,
      });
    });
  }

  public update(delta: number, rawHour: number) {
    // Strictly present between 05:30 and 22:00 (10 PM). After 22:00 nobody remains in the park!
    const isParkPopulated = rawHour >= 5.5 && rawHour < 22.0;
    this.rootGroup.visible = isParkPopulated;
    if (!isParkPopulated) return;

    const dt = Math.min(delta, 0.1);
    const now = performance.now() * 0.001;

    for (let i = 0; i < this.stationaryActors.length; i++) {
      const a = this.stationaryActors[i];
      if (!a.hipsGroup.visible) continue;
      const t = now * 1.45 + a.phaseOffset;
      if (a.mode === 'seated_chill') {
        a.leftArm.rotation.x = -0.58 + Math.sin(t * 0.8) * 0.05;
        a.rightArm.rotation.x = -0.42 + Math.cos(t * 0.9) * 0.08;
        a.headGroup.rotation.x = 0.10 + Math.sin(t * 1.1) * 0.05;
        a.headGroup.rotation.y = Math.sin(t * 0.55) * 0.20;
      } else if (a.mode === 'seated_chat') {
        a.leftArm.rotation.x = -0.35 + Math.sin(t * 1.6) * 0.16;
        a.rightArm.rotation.x = -0.45 + Math.cos(t * 1.8) * 0.18;
        a.headGroup.rotation.y = Math.sin(t * 0.9) * 0.28;
      } else if (a.mode === 'admire_fountain') {
        a.rightArm.rotation.x = -0.50 + Math.sin(t * 0.9) * 0.16;
        a.leftArm.rotation.x = -0.15;
        a.headGroup.rotation.y = Math.sin(t * 0.6) * 0.24;
        a.headGroup.rotation.x = -0.08 + Math.sin(t * 0.7) * 0.05;
      } else {
        a.leftArm.rotation.x = Math.sin(t * 1.2) * 0.14;
        a.rightArm.rotation.x = -Math.sin(t * 1.2) * 0.14;
        a.headGroup.rotation.y = Math.sin(t * 0.7) * 0.26;
      }
    }

    for (let i = 0; i < this.walkingActors.length; i++) {
      const w = this.walkingActors[i];
      if (w.pauseTimer > 0) {
        w.pauseTimer -= dt;
        w.glbHandle.setAnimState('Idle', 1.0);
        if (w.hipsGroup.visible) {
          const lookT = now * 1.4 + i;
          w.leftLeg.rotation.x = 0;
          w.rightLeg.rotation.x = 0;
          w.leftKnee.rotation.x = 0;
          w.rightKnee.rotation.x = 0;
          w.leftArm.rotation.x = -0.12 + Math.sin(lookT) * 0.06;
          w.rightArm.rotation.x = -0.15 + Math.cos(lookT * 1.1) * 0.08;
          w.hipsGroup.position.y = 0.84;
          w.headGroup.rotation.y = Math.sin(lookT * 0.8) * 0.28;
        }
        continue;
      }

      const target = w.waypoints[w.wpIdx];
      const dx = target.x - w.x;
      const dz = target.z - w.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.14) {
        w.x = target.x;
        w.z = target.z;
        w.pauseTimer = target.pauseSec;
        w.wpIdx = (w.wpIdx + 1) % w.waypoints.length;
        continue;
      }

      const step = Math.min(dist, w.speed * dt);
      w.x += (dx / dist) * step;
      w.z += (dz / dist) * step;
      steerYawSmooth(w.group, Math.atan2(dx, dz), w.isJogger ? 10.0 : 7.5, dt);
      w.group.position.set(w.x, w.z > -12.0 ? 0.04 : 0.0, w.z);

      w.glbHandle.setAnimState('Walk', THREE.MathUtils.clamp(w.speed / 1.08, 0.85, 1.85));
      if (w.hipsGroup.visible) {
        w.walkPhase += dt * w.speed * (w.isJogger ? 4.8 : 5.2);
        const strideAmp = w.isJogger ? 0.65 : 0.44;
        const swing = Math.sin(w.walkPhase) * strideAmp;
        w.leftLeg.rotation.x = swing;
        w.rightLeg.rotation.x = -swing;
        w.leftKnee.rotation.x = w.isJogger ? Math.max(0, -swing * 0.85) : Math.max(0, -swing * 0.45);
        w.rightKnee.rotation.x = w.isJogger ? Math.max(0, swing * 0.85) : Math.max(0, swing * 0.45);
        w.leftArm.rotation.x = (w.isJogger ? -0.75 : 0) - swing * 0.72;
        w.rightArm.rotation.x = w.glbHandle.hasActiveUmbrella() ? -0.88 : (w.isJogger ? -0.75 : 0) + swing * 0.72;
        w.hipsGroup.position.y = 0.84 + Math.abs(Math.cos(w.walkPhase)) * (w.isJogger ? 0.06 : 0.032);
        w.headGroup.rotation.y = 0;
      }
    }
  }
}
