import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { pickStationaryCivilianModel } from './NpcModelCatalog';
import {
  CITY_ROAD_BOUNDS,
  computeBoulevardSignalFactor,
  type BoulevardSignalGetter,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import {
  VinFastCharacterHelpers,
  VinFastEvVehicleRig,
  createVinFastEvVehicle,
} from './VinFastShowroomSystem';

export interface VinFastChargingGarageResult {
  staticGroup: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  controller: VinFastChargingFleetController;
}

interface ChargingBaySlot {
  bayIndex: number;
  side: -1 | 1; // -1 = West side bay (nose -X), +1 = East side bay (nose +X)
  worldX: number;
  localX: number;
  carParkZ: number;
  localZ: number;
  pillarWorldX: number;
  pillarLocalX: number;
  statusCrownMat: THREE.MeshStandardMaterial;
  activeCableMesh: THREE.Mesh;
  holsterCableMesh: THREE.Mesh;
  occupiedByVehicleIdx: number | null;
}

type EvLifecycleState =
  | 'road_cruise'
  | 'entering_aisle'
  | 'turning_into_bay'
  | 'driver_walk_to_pillar'
  | 'charging'
  | 'driver_walk_to_car'
  | 'reversing_to_aisle'
  | 'exiting_aisle';

interface StandingDriverRig {
  group: THREE.Group;
  fallbackGroup: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  glbHandle?: GlbHumanHandle;
}

interface AnimatedChargingEv {
  rig: VinFastEvVehicleRig;
  driverStanding: StandingDriverRig;
  bayIndex: number;
  state: EvLifecycleState;
  speed: number;
  baseSpeed: number;
  chargeTimer: number;
  cooldownTimer: number;
  turnProgress: number;
  laneZ: number;
  laneCooldown: number;
  exitWaitTimer: number;
  walkPhase: number;
  phaseOffset: number;
}

function drawMiniVinFastV(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.44, -size * 0.34);
  ctx.lineTo(0, size * 0.38);
  ctx.lineTo(size * 0.44, -size * 0.34);
  ctx.stroke();

  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, -size * 0.34);
  ctx.lineTo(0, size * 0.16);
  ctx.lineTo(size * 0.28, -size * 0.34);
  ctx.stroke();
  ctx.restore();
}

function createGarageMainFasciaTexture(): THREE.CanvasTexture {
  const w = 1792;
  const h = 280;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#041218');
  grad.addColorStop(0.5, '#092734');
  grad.addColorStop(1, '#041218');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, h - 8, w, 8);

  ctx.strokeStyle = 'rgba(52, 211, 153, 0.38)';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 38, 185, h - 76);
  ctx.strokeRect(w - 225, 38, 185, h - 76);
  drawMiniVinFastV(ctx, 132, h / 2, 130, '#34d399');
  drawMiniVinFastV(ctx, w - 132, h / 2, 130, '#38bdf8');

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 72px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V-GREEN  •  GARA TRẠM SẠC VINFAST', w / 2, h / 2 - 28);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('TRẠM ĐỖ & SẠC NHANH DC 250kW  •  CỔNG SẠC 01 - 08  •  TỰ ĐỘNG 24/7', w / 2, h / 2 + 56);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBayBadgeTexture(bayNum: number): THREE.CanvasTexture {
  const w = 384;
  const h = 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#071b24';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  ctx.fillStyle = '#ecfdf5';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`CỔNG SẠC 0${bayNum}`, w / 2, 34);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('V-GREEN 250kW CCS2', w / 2, 68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPedestalScreenTexture(bayNum: number): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#031219';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  drawMiniVinFastV(ctx, w / 2, 54, 48, '#38bdf8');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`TRỤ SẠC 0${bayNum}`, w / 2, 108);

  ctx.fillStyle = '#34d399';
  ctx.font = '900 26px system-ui, sans-serif';
  ctx.fillText('VINFAST EV', w / 2, 150);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 5;
  ctx.strokeRect(32, 182, w - 64, 92);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 40px monospace';
  ctx.fillText('250 kW', w / 2, 238);

  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 22px monospace';
  ctx.fillText('DC FAST CCS2', w / 2, 326);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildStandingNpcRig(
  helpers: VinFastCharacterHelpers,
  shirtHex: number,
  pantsHex: number,
  skinHex: string,
  withPhone: boolean
): StandingDriverRig {
  const group = new THREE.Group();
  const fallbackGroup = new THREE.Group();
  group.add(fallbackGroup);
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.78 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.80 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
  leftLeg.position.set(-0.1, 0.36, 0);
  fallbackGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
  rightLeg.position.set(0.1, 0.36, 0);
  fallbackGroup.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtMat);
  torso.position.set(0, 1.01, 0);
  fallbackGroup.add(torso);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
  leftArm.position.set(-0.29, 1.02, 0);
  fallbackGroup.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
  rightArm.position.set(0.29, 1.02, 0);
  fallbackGroup.add(rightArm);

  const faceTex = helpers.createFaceTexture('smile', skinHex);
  const head = helpers.createHeadMesh(skinMat, faceTex, 0.32, 0.32, 0.32);
  head.position.set(0, 1.48, 0);
  fallbackGroup.add(head);

  if (withPhone) {
    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.5 })
    );
    phone.position.set(0.0, -0.22, 0.12);
    rightArm.add(phone);
  }

  return { group, fallbackGroup, head, leftArm, rightArm, leftLeg, rightLeg };
}

export class VinFastChargingFleetController {
  public rootGroup: THREE.Group = new THREE.Group();
  private bays: ChargingBaySlot[];
  private vehicles: AnimatedChargingEv[] = [];
  private technician: StandingDriverRig;
  private inboundAisleX: number;
  private outboundAisleX: number;
  private trafficCoordinator: CityTrafficCoordinator | null = null;
  private getWestSignal: BoulevardSignalGetter | null = null;
  private getEastSignal: BoulevardSignalGetter | null = null;
  private timer = 0;

  constructor(
    bays: ChargingBaySlot[],
    helpers: VinFastCharacterHelpers,
    centerX: number,
    trafficCoordinator?: CityTrafficCoordinator
  ) {
    this.bays = bays;
    this.trafficCoordinator = trafficCoordinator ?? null;
    // Dedicated 2-way center aisle lanes inside the 7.4m central drive avenue
    this.inboundAisleX = centerX + 1.75;
    this.outboundAisleX = centerX - 1.75;

    // Resident V-GREEN EV Technician supervising the deep charging hall near the rear service lounge
    this.technician = buildStandingNpcRig(helpers, 0x0d9488, 0x0f172a, '#f5cfa0', true);
    this.technician.group.position.set(centerX + 5.8, 0.08, 91.2);
    this.technician.group.rotation.y = Math.PI * 0.85;
    this.rootGroup.add(this.technician.group);
    const techSpec = pickStationaryCivilianModel(0);
    this.technician.glbHandle = attachGlbHumanToNpc({
      modelSource: techSpec.modelSource,
      hostGroup: this.technician.group,
      fallbackMeshes: [this.technician.fallbackGroup],
      targetHeight: techSpec.targetHeight,
      clipProfile: techSpec.clipProfile,
      rotationY: techSpec.rotationY,
      initialState: 'Idle',
      phaseOffset: 0.2,
    });

    // 6 active VinFast EVs cycling across the 8 deep charging bays (opaque black tinted windows)
    const fleetSpecs: Array<{
      bayIdx: number;
      variant: 'vf9' | 'vf8' | 'vf7' | 'vf3';
      paintHex: number;
      withRoofContrast?: boolean;
      shirtHex: number;
      skinHex: string;
      initialState: EvLifecycleState;
      startX: number;
      initialTimer: number;
      baseSpeed: number;
    }> = [
      {
        bayIdx: 0, // West Front Bay 01 (Z = 55.0)
        variant: 'vf8',
        paintHex: 0xb91c1c,
        shirtHex: 0x334155,
        skinHex: '#f5cfa0',
        initialState: 'charging',
        startX: bays[0].worldX,
        initialTimer: 11.0,
        baseSpeed: 8.6,
      },
      {
        bayIdx: 2, // West Deep Bay 03 (Z = 72.0)
        variant: 'vf7',
        paintHex: 0x94a3b8,
        shirtHex: 0x7c2d12,
        skinHex: '#f1c9a5',
        initialState: 'charging',
        startX: bays[2].worldX,
        initialTimer: 20.0,
        baseSpeed: 8.8,
      },
      {
        bayIdx: 5, // East Mid Bay 06 (Z = 63.5)
        variant: 'vf3',
        paintHex: 0xeab308,
        withRoofContrast: true,
        shirtHex: 0x065f46,
        skinHex: '#e8be9e',
        initialState: 'charging',
        startX: bays[5].worldX,
        initialTimer: 28.0,
        baseSpeed: 8.4,
      },
      {
        bayIdx: 7, // East Deepest Bay 08 (Z = 80.5)
        variant: 'vf9',
        paintHex: 0x1d4ed8,
        shirtHex: 0x1e3a8a,
        skinHex: '#f8d9c0',
        initialState: 'charging',
        startX: bays[7].worldX,
        initialTimer: 16.0,
        baseSpeed: 8.0,
      },
      {
        bayIdx: 1, // West Mid Bay 02 (Z = 63.5) - cruises from Phố Cư Dân Tây
        variant: 'vf9',
        paintHex: 0x0f766e,
        shirtHex: 0x0f172a,
        skinHex: '#f5cfa0',
        initialState: 'road_cruise',
        startX: -560.0,
        initialTimer: 0,
        baseSpeed: 8.2,
      },
      {
        bayIdx: 6, // East Deep Bay 07 (Z = 72.0) - cruises from East-Mid / Sơn Tây
        variant: 'vf8',
        paintHex: 0xe2e8f0,
        shirtHex: 0x4338ca,
        skinHex: '#e8be9e',
        initialState: 'road_cruise',
        startX: 315.0,
        initialTimer: 0,
        baseSpeed: 8.6,
      },
    ];

    fleetSpecs.forEach((spec, idx) => {
      const bay = bays[spec.bayIdx];
      const rig = createVinFastEvVehicle({
        variant: spec.variant,
        paintHex: spec.paintHex,
        withRoofContrast: spec.withRoofContrast,
      });
      rig.group.userData.noMerge = true;

      const driverStanding = buildStandingNpcRig(helpers, spec.shirtHex, 0x18181b, spec.skinHex, true);
      driverStanding.group.userData.noMerge = true;
      const driverSpec = pickStationaryCivilianModel(idx * 3 + 1);
      driverStanding.glbHandle = attachGlbHumanToNpc({
        modelSource: driverSpec.modelSource,
        hostGroup: driverStanding.group,
        fallbackMeshes: [driverStanding.fallbackGroup],
        targetHeight: driverSpec.targetHeight,
        clipProfile: driverSpec.clipProfile,
        rotationY: driverSpec.rotationY,
        initialState: spec.initialState === 'charging' ? 'Idle' : 'Walk',
        phaseOffset: idx * 1.1,
      });

      const initLaneZ = idx % 2 === 0 ? 34.75 : 31.10;
      if (spec.initialState === 'charging') {
        bay.occupiedByVehicleIdx = idx;
        rig.group.position.set(bay.worldX, 0.08, bay.carParkZ);
        rig.group.rotation.y = bay.side < 0 ? -Math.PI / 2 : Math.PI / 2;
        driverStanding.group.visible = true;
        driverStanding.group.position.set(
          bay.pillarWorldX - bay.side * 0.85,
          0.08,
          bay.carParkZ + 1.25
        );
        driverStanding.group.rotation.y = bay.side < 0 ? -Math.PI * 0.75 : Math.PI * 0.75;
        bay.activeCableMesh.visible = true;
        bay.holsterCableMesh.visible = false;
        bay.statusCrownMat.color.setHex(0x38bdf8);
        bay.statusCrownMat.emissive.setHex(0x0ea5e9);
      } else {
        rig.group.position.set(spec.startX, -0.26, initLaneZ);
        rig.group.rotation.y = -Math.PI / 2;
        driverStanding.group.visible = false;
      }

      this.rootGroup.add(rig.group);
      this.rootGroup.add(driverStanding.group);

      this.vehicles.push({
        rig,
        driverStanding,
        bayIndex: spec.bayIdx,
        state: spec.initialState,
        speed: spec.initialState === 'road_cruise' ? spec.baseSpeed : 0,
        baseSpeed: spec.baseSpeed,
        chargeTimer: spec.initialTimer,
        cooldownTimer: spec.initialState === 'road_cruise' ? 0 : 12.0,
        turnProgress: 0,
        laneZ: initLaneZ,
        laneCooldown: 0,
        exitWaitTimer: 0,
        walkPhase: 0,
        phaseOffset: idx * 1.3,
      });
    });
  }

  public setTrafficCoordinator(coordinator: CityTrafficCoordinator) {
    this.trafficCoordinator = coordinator;
  }

  public setIntersectionSignalGetters(
    west?: BoulevardSignalGetter | null,
    east?: BoulevardSignalGetter | null
  ) {
    this.getWestSignal = west ?? null;
    this.getEastSignal = east ?? null;
  }

  private getGroundY(z: number): number {
    if (z <= 36.6) return -0.26;
    if (z >= 38.4) return 0.08;
    const t = (z - 36.6) / (38.4 - 36.6);
    return THREE.MathUtils.lerp(-0.26, 0.08, t);
  }

  public update(
    delta: number,
    lampFactor: number,
    cityBusPose?: { active: boolean; x: number; z: number } | null
  ) {
    this.timer += delta;
    const blink = Math.sin(this.timer * 8.5) > 0;

    // Subtle technician supervision idle
    this.technician.head.rotation.y = Math.sin(this.timer * 1.1) * 0.28;
    this.technician.rightArm.rotation.x = -0.85 + Math.sin(this.timer * 2.2) * 0.1;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const vehId = `vf_garage_${i}`;
      const bay = this.bays[v.bayIndex];
      const targetParkYaw = bay.side < 0 ? -Math.PI / 2 : Math.PI / 2;
      let wheelDir = 1;
      let isBraking = false;
      let isHazardOn = false;

      if (v.laneCooldown > 0) v.laneCooldown -= delta;

      if (v.state === 'road_cruise') {
        if (!v.rig.group.visible) {
          let respawnZ: number | null = null;
          if (!this.trafficCoordinator) {
            respawnZ = v.laneZ;
          } else {
            const prefZ = v.laneZ;
            const altZ = Math.abs(prefZ - 34.75) < 0.5 ? 31.10 : 34.75;
            if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: prefZ, halfX: 5.5, halfZ: 1.5 })) {
              respawnZ = prefZ;
            } else if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: altZ, halfX: 5.5, halfZ: 1.5 })) {
              respawnZ = altZ;
            }
          }
          if (respawnZ !== null) {
            v.laneZ = respawnZ;
            v.rig.group.position.set(304.0, -0.26, respawnZ);
            v.rig.group.rotation.y = -Math.PI / 2;
            v.rig.group.visible = true;
            v.speed = v.baseSpeed;
          } else {
            this.trafficCoordinator?.deactivateVehicle(vehId);
            continue;
          }
        }

        if (v.cooldownTimer > 0) v.cooldownTimer -= delta;

        if (
          v.cooldownTimer <= 0 &&
          bay.occupiedByVehicleIdx === null &&
          v.rig.group.position.z >= 33.4 &&
          v.rig.group.position.x <= this.inboundAisleX + 1.3 &&
          v.rig.group.position.x >= this.inboundAisleX - 1.3 &&
          (!this.trafficCoordinator ||
            this.trafficCoordinator.isZoneClear({
              id: vehId,
              x: this.inboundAisleX,
              y: -0.26,
              z: 39.2,
              halfX: 1.25,
              halfZ: 2.0,
            }))
        ) {
          bay.occupiedByVehicleIdx = i;
          v.speed = Math.max(4.6, v.speed);
          v.turnProgress = 0;
          v.state = 'entering_aisle';
        } else {
          let speedFactor = 1;
          const approachingGarage =
            v.cooldownTimer <= 0 &&
            bay.occupiedByVehicleIdx === null &&
            v.rig.group.position.x > this.inboundAisleX + 4.0 &&
            v.rig.group.position.x < this.inboundAisleX + 38.0;

          if (this.trafficCoordinator) {
            const pick = this.trafficCoordinator.pickBestCruiseLane({
              id: vehId,
              x: v.rig.group.position.x,
              y: -0.26,
              currentZ: v.rig.group.position.z,
              laneZ: v.laneZ,
              moveDirX: -1,
              lanes: [31.10, 34.75],
              halfW: v.rig.halfW,
              halfL: v.rig.halfL,
              lookahead: 11.5,
              minGap: 2.0,
              priority: 20,
              allowSwitch:
                v.laneCooldown <= 0 &&
                ((v.rig.group.position.x > -205.0 && v.rig.group.position.x < 170.0) ||
                  v.rig.group.position.x > 214.0),
              preferLane: approachingGarage ? 34.75 : undefined,
            });
            if (pick.switched) {
              v.laneZ = pick.targetZ;
              v.laneCooldown = 1.8;
            }
            speedFactor = pick.clearance.maxSpeedFactor;
          } else {
            const yieldBehindBus = Boolean(
              cityBusPose?.active &&
                Math.abs(v.rig.group.position.z - cityBusPose.z) < 2.1 &&
                v.rig.group.position.x > cityBusPose.x + 5.0 &&
                v.rig.group.position.x - cityBusPose.x < 16.0
            );
            if (yieldBehindBus) speedFactor = 0;
            for (let j = 0; j < this.vehicles.length && speedFactor > 0; j++) {
              if (j === i) continue;
              const other = this.vehicles[j];
              if (
                other.state === 'road_cruise' &&
                Math.abs(other.rig.group.position.z - v.rig.group.position.z) < 2.0 &&
                v.rig.group.position.x > other.rig.group.position.x &&
                v.rig.group.position.x - other.rig.group.position.x < 8.5
              ) {
                speedFactor = 0;
                break;
              }
            }
          }

          const sigFactor = computeBoulevardSignalFactor({
            x: v.rig.group.position.x,
            halfL: v.rig.halfL,
            moveDirX: -1,
            getWestSignal: this.getWestSignal,
            getEastSignal: this.getEastSignal,
            coordinator: this.trafficCoordinator,
            vehicleId: vehId,
          });
          speedFactor = Math.min(speedFactor, sigFactor);

          if (speedFactor < 0.75) isBraking = true;
          v.speed = THREE.MathUtils.lerp(v.speed, v.baseSpeed * speedFactor, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 3.2)));
          v.rig.group.position.x -= v.speed * delta;
          const prevZPos = v.rig.group.position.z;
          v.rig.group.position.z = THREE.MathUtils.lerp(prevZPos, v.laneZ, Math.min(1, delta * (v.speed > 0.8 ? 3.2 : 0.4)));
          v.rig.group.position.y = -0.26;
          const latVel = (v.rig.group.position.z - prevZPos) / Math.max(0.001, delta);
          v.rig.group.rotation.y = Math.atan2(-Math.max(1.5, v.speed), latVel);

          if (v.rig.group.position.x < CITY_ROAD_BOUNDS.westEndX) {
            let wrapZ: number | null = null;
            if (!this.trafficCoordinator) {
              wrapZ = v.laneZ;
            } else {
              const altZ = Math.abs(v.laneZ - 34.75) < 0.5 ? 31.10 : 34.75;
              if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: v.laneZ, halfX: 5.5, halfZ: 1.5 })) {
                wrapZ = v.laneZ;
              } else if (this.trafficCoordinator.isZoneClear({ id: vehId, x: 304.0, y: -0.26, z: altZ, halfX: 5.5, halfZ: 1.5 })) {
                wrapZ = altZ;
              }
            }
            if (wrapZ !== null) {
              v.laneZ = wrapZ;
              v.rig.group.position.x = 304.0;
              v.rig.group.position.z = wrapZ;
            } else {
              v.rig.group.visible = false;
              this.trafficCoordinator?.deactivateVehicle(vehId);
              continue;
            }
          }
        }
      } else if (v.state === 'entering_aisle') {
        // Smoothly steer into the dedicated inbound aisle (+Z) and drive to the target bay's Z row
        v.rig.group.position.x = THREE.MathUtils.lerp(
          v.rig.group.position.x,
          this.inboundAisleX,
          Math.min(1, delta * 5.2)
        );
        const turnStartZ = bay.carParkZ - 1.6;
        const distZ = Math.max(0, turnStartZ - v.rig.group.position.z);
        const clearingEntrance = v.rig.group.position.z < 41.5;

        let speedFactor = 1;
        if (this.trafficCoordinator) {
          const clr = this.trafficCoordinator.getForwardClearance({
            id: vehId,
            x: v.rig.group.position.x,
            y: v.rig.group.position.y,
            z: v.rig.group.position.z,
            moveDirX: 0,
            moveDirZ: 1,
            halfW: v.rig.halfW,
            halfL: v.rig.halfL,
            lookahead: 6.2,
            minGap: clearingEntrance ? 0.9 : 1.6,
            latMargin: 0.16,
            priority: clearingEntrance ? 48 : 22,
          });
          // Never stall across active street / bike lane while turning in off the boulevard
          speedFactor = clearingEntrance ? Math.max(0.45, clr.maxSpeedFactor) : clr.maxSpeedFactor;
        } else {
          for (let j = 0; j < this.vehicles.length; j++) {
            if (j === i) continue;
            const other = this.vehicles[j];
            if (
              (other.state === 'entering_aisle' || other.state === 'turning_into_bay') &&
              other.rig.group.position.z > v.rig.group.position.z &&
              other.rig.group.position.z - v.rig.group.position.z < 7.0 &&
              Math.abs(other.rig.group.position.x - v.rig.group.position.x) < 2.4
            ) {
              speedFactor = 0;
              break;
            }
          }
        }

        const baseAisleSpd = distZ > 4.0 ? 6.2 : Math.max(2.6, distZ * 1.1);
        const targetSpd = baseAisleSpd * speedFactor;
        isBraking = speedFactor < 0.75 || distZ <= 3.5;
        v.speed = THREE.MathUtils.lerp(v.speed, targetSpd, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 4.5)));
        v.rig.group.position.z = Math.min(turnStartZ, v.rig.group.position.z + v.speed * delta);
        v.rig.group.position.y = this.getGroundY(v.rig.group.position.z);

        const steerInT = THREE.MathUtils.clamp((v.rig.group.position.z - 33.5) / 5.0, 0, 1);
        v.rig.group.rotation.y = THREE.MathUtils.lerp(-Math.PI / 2, 0, steerInT);

        if (v.rig.group.position.z >= turnStartZ - 0.05) {
          v.turnProgress = 0;
          v.state = 'turning_into_bay';
        }
      } else if (v.state === 'turning_into_bay') {
        // Smooth 90-degree turn from center aisle into assigned West or East charging bay
        isBraking = v.turnProgress > 0.72;
        v.speed = 3.6;
        v.turnProgress = Math.min(1, v.turnProgress + delta * 0.75);
        const smoothT = v.turnProgress * v.turnProgress * (3 - 2 * v.turnProgress);
        const turnStartZ = bay.carParkZ - 1.6;

        v.rig.group.position.x = THREE.MathUtils.lerp(this.inboundAisleX, bay.worldX, smoothT);
        v.rig.group.position.z = THREE.MathUtils.lerp(turnStartZ, bay.carParkZ, smoothT);
        v.rig.group.position.y = 0.08;
        v.rig.group.rotation.y = THREE.MathUtils.lerp(0, targetParkYaw, smoothT);

        if (v.turnProgress >= 1) {
          v.rig.group.position.set(bay.worldX, 0.08, bay.carParkZ);
          v.rig.group.rotation.y = targetParkYaw;
          v.speed = 0;
          // Driver steps out on the bay side walkway and walks to the charger pedestal
          v.driverStanding.group.visible = true;
          v.driverStanding.group.position.set(bay.worldX - bay.side * 0.4, 0.08, bay.carParkZ + 1.45);
          v.driverStanding.glbHandle?.setAnimState('Walk');
          v.state = 'driver_walk_to_pillar';
        }
      } else if (v.state === 'driver_walk_to_pillar') {
        v.speed = 0;
        const targetX = bay.pillarWorldX - bay.side * 0.85;
        const targetZ = bay.carParkZ + 1.25;
        const dx = targetX - v.driverStanding.group.position.x;
        const dz = targetZ - v.driverStanding.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.1) {
          v.driverStanding.group.position.set(targetX, 0.08, targetZ);
          v.driverStanding.group.rotation.y = bay.side < 0 ? -Math.PI * 0.75 : Math.PI * 0.75;
          v.driverStanding.leftLeg.rotation.x = 0;
          v.driverStanding.rightLeg.rotation.x = 0;
          v.driverStanding.glbHandle?.setAnimState('Idle');
          bay.activeCableMesh.visible = true;
          bay.holsterCableMesh.visible = false;
          bay.statusCrownMat.color.setHex(0x38bdf8);
          bay.statusCrownMat.emissive.setHex(0x0ea5e9);
          v.chargeTimer = 12.5 + (i % 3) * 2.5;
          v.state = 'charging';
        } else {
          v.driverStanding.glbHandle?.setAnimState('Walk');
          const step = Math.min(dist, 1.85 * delta);
          v.driverStanding.group.position.x += (dx / dist) * step;
          v.driverStanding.group.position.z += (dz / dist) * step;
          v.driverStanding.group.rotation.y = Math.atan2(dx, dz);
          v.walkPhase += delta * 7.5;
          const swing = Math.sin(v.walkPhase) * 0.55;
          v.driverStanding.leftLeg.rotation.x = swing;
          v.driverStanding.rightLeg.rotation.x = -swing;
          v.driverStanding.leftArm.rotation.x = -swing * 0.6;
          v.driverStanding.rightArm.rotation.x = v.driverStanding.glbHandle?.hasActiveUmbrella() ? -0.88 : swing * 0.6;
        }
      } else if (v.state === 'charging') {
        v.speed = 0;
        v.driverStanding.glbHandle?.setAnimState('Idle');
        const t = this.timer + v.phaseOffset;
        v.driverStanding.head.rotation.y = 0.22 * Math.sin(t * 0.9);
        v.driverStanding.rightArm.rotation.x = -0.92 + 0.08 * Math.sin(t * 2.0);
        v.driverStanding.leftArm.rotation.x = -0.15;
        bay.statusCrownMat.emissiveIntensity = 0.65 + 0.45 * Math.sin(t * 3.2);

        v.chargeTimer -= delta;
        if (v.chargeTimer <= 0) {
          bay.activeCableMesh.visible = false;
          bay.holsterCableMesh.visible = true;
          bay.statusCrownMat.color.setHex(0x34d399);
          bay.statusCrownMat.emissive.setHex(0x10b981);
          bay.statusCrownMat.emissiveIntensity = 0.75;
          v.driverStanding.glbHandle?.setAnimState('Walk');
          v.state = 'driver_walk_to_car';
        }
      } else if (v.state === 'driver_walk_to_car') {
        v.speed = 0;
        v.driverStanding.glbHandle?.setAnimState('Walk');
        const targetX = bay.worldX - bay.side * 0.4;
        const targetZ = bay.carParkZ + 1.45;
        const dx = targetX - v.driverStanding.group.position.x;
        const dz = targetZ - v.driverStanding.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.1) {
          v.driverStanding.group.visible = false;
          v.turnProgress = 0;
          v.state = 'reversing_to_aisle';
        } else {
          const step = Math.min(dist, 1.85 * delta);
          v.driverStanding.group.position.x += (dx / dist) * step;
          v.driverStanding.group.position.z += (dz / dist) * step;
          v.driverStanding.group.rotation.y = Math.atan2(dx, dz);
          v.walkPhase += delta * 7.5;
          const swing = Math.sin(v.walkPhase) * 0.55;
          v.driverStanding.leftLeg.rotation.x = swing;
          v.driverStanding.rightLeg.rotation.x = -swing;
          v.driverStanding.leftArm.rotation.x = -swing * 0.6;
          v.driverStanding.rightArm.rotation.x = v.driverStanding.glbHandle?.hasActiveUmbrella() ? -0.88 : swing * 0.6;
        }
      } else if (v.state === 'reversing_to_aisle') {
        // Reverse out of charging bay into the dedicated outbound aisle lane facing -Z street
        isBraking = true;
        isHazardOn = true;
        wheelDir = -1;
        v.speed = 3.8;
        v.turnProgress = Math.min(1, v.turnProgress + delta * 0.72);
        const smoothT = v.turnProgress * v.turnProgress * (3 - 2 * v.turnProgress);
        const exitStartZ = bay.carParkZ - 1.5;

        v.rig.group.position.x = THREE.MathUtils.lerp(bay.worldX, this.outboundAisleX, smoothT);
        v.rig.group.position.z = THREE.MathUtils.lerp(bay.carParkZ, exitStartZ, smoothT);
        v.rig.group.position.y = 0.08;

        const exitYawTarget = bay.side < 0 ? -Math.PI : Math.PI;
        v.rig.group.rotation.y = THREE.MathUtils.lerp(targetParkYaw, exitYawTarget, smoothT);

        if (v.turnProgress >= 1) {
          v.rig.group.position.set(this.outboundAisleX, 0.08, exitStartZ);
          v.rig.group.rotation.y = Math.PI;
          v.exitWaitTimer = 0;
          v.state = 'exiting_aisle';
        }
      } else if (v.state === 'exiting_aisle') {
        // Yield strictly BEHIND curb (Z = 39.8..41.3) for upstream Westbound traffic before merging onto South Outer Z = 34.75
        let speedFactor = 1;
        const yaw = v.rig.group.rotation.y;
        const committedToRoad = v.rig.group.position.z < 39.8;
        if (this.trafficCoordinator) {
          if (v.rig.group.position.z <= 41.3 && v.rig.group.position.z >= 39.8) {
            const mouthClear = this.trafficCoordinator.isZoneClear({
              id: vehId,
              x: this.outboundAisleX,
              y: -0.26,
              z: 35.1,
              halfX: 3.4,
              halfZ: 1.45,
            });
            const roadClear = this.trafficCoordinator.isZoneClear({
              id: vehId,
              x: this.outboundAisleX + 3.0,
              y: -0.26,
              z: 35.1,
              halfX: 5.5,
              halfZ: 1.45,
            });
            if (!mouthClear || (!roadClear && v.exitWaitTimer < 7.0)) {
              speedFactor = 0;
              v.exitWaitTimer += delta;
            } else {
              v.exitWaitTimer = 0;
            }
          } else {
            const clr = this.trafficCoordinator.getForwardClearance({
              id: vehId,
              x: v.rig.group.position.x,
              y: v.rig.group.position.y,
              z: v.rig.group.position.z,
              moveDirX: Math.sin(yaw),
              moveDirZ: Math.cos(yaw),
              halfW: v.rig.halfW,
              halfL: v.rig.halfL,
              lookahead: 6.2,
              minGap: committedToRoad ? 0.9 : 1.5,
              latMargin: 0.16,
              priority: committedToRoad ? 48 : 16,
            });
            speedFactor = committedToRoad ? Math.max(0.45, clr.maxSpeedFactor) : clr.maxSpeedFactor;
          }
        } else {
          for (let j = 0; j < this.vehicles.length; j++) {
            if (j === i) continue;
            const other = this.vehicles[j];
            if (
              other.state === 'exiting_aisle' &&
              other.rig.group.position.z < v.rig.group.position.z &&
              v.rig.group.position.z - other.rig.group.position.z < 7.5 &&
              Math.abs(other.rig.group.position.x - v.rig.group.position.x) < 2.2
            ) {
              speedFactor = 0;
              break;
            }
          }
        }

        isBraking = speedFactor < 0.75;
        v.speed = THREE.MathUtils.lerp(v.speed, 6.0 * speedFactor, Math.min(1, delta * (speedFactor === 0 ? 6.5 : 4.0)));

        if (v.rig.group.position.z > 34.75) {
          v.rig.group.position.z = Math.max(34.75, v.rig.group.position.z - v.speed * delta);
          v.rig.group.position.y = this.getGroundY(v.rig.group.position.z);
          const turnOutT = THREE.MathUtils.clamp((37.4 - v.rig.group.position.z) / (37.4 - 34.75), 0, 1);
          v.rig.group.rotation.y = THREE.MathUtils.lerp(Math.PI, Math.PI * 1.5, turnOutT);
        } else {
          v.laneZ = 34.75;
          v.laneCooldown = 1.2;
          v.rig.group.position.z = 34.75;
          v.rig.group.position.y = -0.26;
          v.rig.group.rotation.y = -Math.PI / 2;
          bay.occupiedByVehicleIdx = null;
          v.cooldownTimer = 14.0;
          v.state = 'road_cruise';
        }
      }

      if (this.trafficCoordinator) {
        const yaw = v.rig.group.rotation.y;
        const isStopped =
          v.state === 'charging' ||
          v.state === 'driver_walk_to_pillar' ||
          v.state === 'driver_walk_to_car';
        const isCommittedExit =
          v.state === 'entering_aisle' ||
          (v.state === 'exiting_aisle' && v.rig.group.position.z < 39.8);
        this.trafficCoordinator.updateVehicle({
          id: vehId,
          kind: 'car',
          x: v.rig.group.position.x,
          y: v.rig.group.position.y,
          z: v.rig.group.position.z,
          fwdX: Math.sin(yaw),
          fwdZ: Math.cos(yaw),
          halfW: v.rig.halfW,
          halfL: v.rig.halfL,
          speed: v.speed,
          isStoppedOrParked: isStopped,
          priority: isCommittedExit ? 48 : v.state === 'road_cruise' ? 20 : 14,
          active: v.rig.group.visible,
        });
      }

      // Spin all 4 wheels according to travel speed & direction
      if (v.speed > 0.02) {
        const angularStep = (v.speed * delta) / v.rig.wheelR;
        for (const w of v.rig.wheels) {
          w.rotation.x += angularStep * wheelDir;
        }
      }

      const isActiveDrive =
        v.state === 'road_cruise' ||
        v.state === 'entering_aisle' ||
        v.state === 'turning_into_bay' ||
        v.state === 'reversing_to_aisle' ||
        v.state === 'exiting_aisle';
      v.rig.headlightMat.emissiveIntensity = isActiveDrive ? 1.15 + lampFactor * 1.1 : 0.25;
      v.rig.brakeMat.emissiveIntensity = !isActiveDrive ? 0.2 : isBraking ? 2.0 : 0.45 + lampFactor * 0.35;
      v.rig.hazardMat.emissiveIntensity = isHazardOn ? (blink ? 2.2 : 0.1) : 0.05;
    }
  }
}

export function createVinFastChargingGarage(
  helpers: VinFastCharacterHelpers,
  centerX: number = -62.0
): VinFastChargingGarageResult {
  // Occupies world X = -74.0 .. -50.0, Z = 42.5 .. 94.0 (deep 51.5m EV Charging Hub with wide pedestrian walkways)
  const group = new THREE.Group();
  group.position.set(centerX, 0, 52.0);

  const neonMats: THREE.MeshStandardMaterial[] = [];

  const apronMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.88, metalness: 0.04 });
  const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.82 });
  const darkSlateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.62, metalness: 0.28 });
  const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.56, metalness: 0.32 });
  const intWallMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.84 });
  const brushedSilverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.34, metalness: 0.72 });
  const chargerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.15 });
  const tealMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.45, metalness: 0.2 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65 });
  const laneMarkMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.72 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.78 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });

  const ledStripMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.65,
    roughness: 0.38,
  });
  neonMats.push(ledStripMat);

  const tealLedBarMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.82,
    roughness: 0.35,
  });
  neonMats.push(tealLedBarMat);

  // Full 51.5m Deep Concrete Garage Floor & Forecourt Apron (localZ = -9.5 .. +42.0 -> world Z = 42.5 .. 94.0)
  const garageFloor = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.08, 51.6), apronMat);
  garageFloor.position.set(0, 0.04, 16.25);
  group.add(garageFloor);

  // Dedicated 1.7m-Wide West & East Pedestrian Walkways (Lối đi bộ 2 bên kéo dài suốt 51.5m từ vỉa hè tới khu chờ sâu)
  [-10.8, 10.8].forEach((wx) => {
    const walkStrip = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.014, 51.0), walkwayMat);
    walkStrip.position.set(wx, 0.087, 16.2);
    group.add(walkStrip);

    const borderX = wx < 0 ? wx + 0.90 : wx - 0.90;
    const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.016, 51.0), stripeMat);
    edgeLine.position.set(borderX, 0.088, 16.2);
    group.add(edgeLine);
  });

  // Painted Center Drive-In Avenue Divider & Entrance/Rear Pedestrian Crosswalks (localX = -3.4 .. +3.4)
  for (let lz = -7.0; lz <= 32.0; lz += 3.2) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 1.6), laneMarkMat);
    dash.position.set(0, 0.088, lz);
    group.add(dash);
  }
  [-6.2, 34.4].forEach((cz) => {
    for (let cx = -3.0; cx <= 3.0; cx += 0.85) {
      const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 1.5), chargerWhiteMat);
      zebra.position.set(cx, 0.088, cz);
      group.add(zebra);
    }
  });

  // Rear North Wall (world Z = 93.8), West Wall (world X = -73.8), Short East Rear Wall (world Z = 90..94)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(24.0, 5.6, 0.36), darkSlateMat);
  backWall.position.set(0, 2.8, 41.82);
  group.add(backWall);

  const intBackWall = new THREE.Mesh(new THREE.BoxGeometry(23.4, 5.2, 0.10), intWallMat);
  intBackWall.position.set(0, 2.7, 41.58);
  group.add(intBackWall);

  const backDado = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.28, 0.12), tealMat);
  backDado.position.set(0, 1.25, 41.56);
  group.add(backDado);

  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.6, 46.2), darkSlateMat);
  westWall.position.set(-11.82, 2.8, 18.9);
  group.add(westWall);

  const eastRearWall = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.6, 4.2), darkSlateMat);
  eastRearWall.position.set(11.82, 2.8, 39.9);
  group.add(eastRearWall);

  // Full 46.2m Deep Canopy Roof (localZ = -4.2 .. +42.0 -> world Z = 47.8 .. 94.0)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(24.2, 0.28, 46.4), darkSlateMat);
  roof.position.set(0, 5.45, 18.9);
  group.add(roof);

  const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(24.24, 0.14, 0.32), tealLedBarMat);
  frontTrim.position.set(0, 4.72, -4.22);
  group.add(frontTrim);

  const fasciaBack = new THREE.Mesh(new THREE.BoxGeometry(24.2, 0.72, 0.25), graphiteMat);
  fasciaBack.position.set(0, 5.05, -4.20);
  group.add(fasciaBack);

  // Brushed-Chrome Framed Main Signboard (facing -Z street)
  const signFrame = new THREE.Mesh(new THREE.BoxGeometry(19.6, 2.65, 0.24), brushedSilverMat);
  signFrame.position.set(0, 6.65, -4.18);
  group.add(signFrame);

  const signTex = createGarageMainFasciaTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xa7f3d0,
    emissiveMap: signTex,
    emissiveIntensity: 0.34,
    roughness: 0.45,
  });
  const mainSign = new THREE.Mesh(new THREE.PlaneGeometry(19.0, 2.38), signMat);
  mainSign.rotation.y = Math.PI;
  mainSign.position.set(0, 6.65, -4.32);
  mainSign.userData.noMerge = true;
  group.add(mainSign);

  // Front Structural H-Columns leaving the entire 7.4m Center Drive Avenue & 1.7m Side Walkways wide open!
  [-11.6, -3.7, 3.7, 11.6].forEach((px) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.3, 0.28), graphiteMat);
    col.position.set(px, 2.65, -4.1);
    group.add(col);
  });

  // Interior Structural Columns placed cleanly between bay rows (never blocking drive-in turns or walkways)
  [7.25, 15.75, 24.25, 32.75].forEach((cz) => {
    [-3.7, 3.7].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.26, 5.3, 0.26), graphiteMat);
      col.position.set(px, 2.65, cz);
      group.add(col);
    });
  });

  // Continuous Overhead Linear LED Ceiling Light Strips along Center Avenue & Both Bay Wings
  [1.0, 9.0, 17.0, 25.0, 33.0, 39.5].forEach((lz) => {
    [-6.2, 0.0, 6.2].forEach((lx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 4.2), ledStripMat);
      strip.position.set(lx, 5.26, lz);
      group.add(strip);
    });
  });

  // 2 Wide Ceiling PointLights covering the entire 51.5m deep charging hall evenly
  const interiorPointLights = [
    { wx: centerX, wy: 4.95, wz: 60.0, dayInt: 8.5, nightInt: 28.0, dist: 38.0 },
    { wx: centerX, wy: 4.95, wz: 82.0, dayInt: 8.5, nightInt: 28.0, dist: 38.0 },
  ].map((ld) => {
    const light = new THREE.PointLight(0xe0f2fe, ld.dayInt, ld.dist, 1.15);
    light.position.set(ld.wx, ld.wy, ld.wz);
    return { light, dayInt: ld.dayInt, nightInt: ld.nightInt };
  });

  // 8 EV Charging Bays (4 West Bays 01..04 + 4 East Bays 05..08) separated by generous 6.5m walkable aisles
  const baySlots: ChargingBaySlot[] = [];
  const rowZs = [3.0, 11.5, 20.0, 28.5];

  ([-1, 1] as const).forEach((side, sideIdx) => {
    rowZs.forEach((bz, rowIdx) => {
      const bayIndex = sideIdx * 4 + rowIdx;
      const bayNum = bayIndex + 1;
      const carLocalX = side * 6.2;
      const pillarLocalX = side * 9.2;
      const worldX = centerX + carLocalX;
      const pillarWorldX = centerX + pillarLocalX;

      // Painted Bay Boundary Stripes (leaving wide walkways between bays)
      [-2.35, 2.35].forEach((sz) => {
        const line = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.015, 0.10), stripeMat);
        line.position.set(carLocalX, 0.088, bz + sz);
        group.add(line);
      });

      // Wheel Stop parallel to side walkway
      const wheelStop = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 2.2), tealMat);
      wheelStop.position.set(side * 8.15, 0.15, bz);
      group.add(wheelStop);

      // Overhead Bay Sign facing center drive avenue
      const bayTex = createBayBadgeTexture(bayNum);
      const baySign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.48),
        new THREE.MeshStandardMaterial({ map: bayTex, emissive: 0x34d399, emissiveMap: bayTex, emissiveIntensity: 0.28 })
      );
      baySign.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      baySign.position.set(side * 3.85, 4.25, bz);
      baySign.userData.noMerge = true;
      group.add(baySign);

      // V-GREEN 250kW DC Fast Charger Pedestal at outer edge of bay (leaving 1.7m walkway behind it!)
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.92), darkSlateMat);
      plinth.position.set(pillarLocalX, 0.17, bz);
      group.add(plinth);

      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 2.1, 0.66), chargerWhiteMat);
      cabinet.position.set(pillarLocalX, 1.30, bz);
      group.add(cabinet);

      [-0.35, 0.35].forEach((sz) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.12, 0.05), tealMat);
        rail.position.set(pillarLocalX, 1.30, bz + sz);
        group.add(rail);
      });

      const statusCrownMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 0.75,
        roughness: 0.3,
      });
      const statusCrown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.70), statusCrownMat);
      statusCrown.position.set(pillarLocalX, 2.42, bz);
      statusCrown.userData.noMerge = true;
      group.add(statusCrown);

      const screenTex = createPedestalScreenTexture(bayNum);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.48, 0.74),
        new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0x38bdf8, emissiveMap: screenTex, emissiveIntensity: 0.38 })
      );
      screen.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      screen.position.set(pillarLocalX - side * 0.23, 1.56, bz);
      screen.userData.noMerge = true;
      group.add(screen);

      // Active Charging Cable (connects pillar side to parked EV front-side charge port)
      const activeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pillarLocalX - side * 0.18, 1.45, bz + 0.35),
        new THREE.Vector3(pillarLocalX - side * 0.95, 0.35, bz + 0.72),
        new THREE.Vector3(carLocalX + side * 1.45, 0.92, bz + 0.85),
      ]);
      const activeCableMesh = new THREE.Mesh(new THREE.TubeGeometry(activeCurve, 12, 0.034, 8, false), cableMat);
      activeCableMesh.visible = false;
      activeCableMesh.userData.noMerge = true;
      group.add(activeCableMesh);

      // Holstered Standby Cable
      const holsterCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pillarLocalX - side * 0.14, 1.45, bz + 0.35),
        new THREE.Vector3(pillarLocalX - side * 0.14, 0.72, bz + 0.46),
        new THREE.Vector3(pillarLocalX + side * 0.05, 1.15, bz + 0.35),
      ]);
      const holsterCableMesh = new THREE.Mesh(new THREE.TubeGeometry(holsterCurve, 10, 0.03, 8, false), cableMat);
      holsterCableMesh.userData.noMerge = true;
      group.add(holsterCableMesh);

      baySlots.push({
        bayIndex,
        side,
        worldX,
        localX: carLocalX,
        carParkZ: 52.0 + bz,
        localZ: bz,
        pillarWorldX,
        pillarLocalX,
        statusCrownMat,
        activeCableMesh,
        holsterCableMesh,
        occupiedByVehicleIdx: null,
      });
    });
  });

  // Deep Rear Promenade Zone (localZ = 35.5 .. 41.6 -> worldZ = 87.5 .. 93.6): BESS Energy Hub + Lounge + Service Desk
  // 1. BESS Battery Energy Storage System Bank on West Rear Wall
  const bessUnit = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.35, 1.0), graphiteMat);
  bessUnit.position.set(-7.2, 1.25, 40.6);
  group.add(bessUnit);
  const bessAccent = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.16, 1.04), tealLedBarMat);
  bessAccent.position.set(-7.2, 2.24, 40.6);
  group.add(bessAccent);

  // 2. Center Rear EV Driver Waiting Lounge (Sofa & Table with plenty of walking clearance)
  const loungeSofa = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.48, 0.92), sofaMat);
  loungeSofa.position.set(0, 0.32, 40.6);
  group.add(loungeSofa);
  const loungeBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.78, 0.22), sofaMat);
  loungeBack.position.set(0, 0.75, 41.02);
  group.add(loungeBack);
  const loungeTable = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.85), graphiteMat);
  loungeTable.position.set(0, 0.29, 39.0);
  group.add(loungeTable);

  // 3. East Rear V-GREEN Supervision & Support Counter
  const serviceDesk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.06, 0.95), darkSlateMat);
  serviceDesk.position.set(7.2, 0.61, 40.5);
  group.add(serviceDesk);
  const serviceTop = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.08, 1.08), brushedSilverMat);
  serviceTop.position.set(7.2, 1.15, 40.5);
  group.add(serviceTop);

  const controller = new VinFastChargingFleetController(baySlots, helpers, centerX);

  return {
    staticGroup: group,
    neonMats,
    interiorPointLights,
    controller,
  };
}
