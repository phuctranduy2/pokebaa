import * as THREE from 'three';
import {
  CITY_ROAD_BOUNDS,
  EAST_INTERSECTION_CENTER_X,
  EAST_INTERSECTION_EB_STOP_X,
  WEST_INTERSECTION_CENTER_X,
  WEST_INTERSECTION_EW_STOP_X,
  WEST_INTERSECTION_WB_STOP_X,
  computeBoulevardSignalFactor,
  computeNorthSouthSignalFactor,
  type BoulevardSignalGetter,
  type CityTrafficCoordinator,
} from './CityTrafficCoordinator';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import {
  pickOutsideNpcModel,
  pickSeatedCivilianModel,
  pickStationaryCivilianModel,
} from './NpcModelCatalog';

export const CITY_BUS_SCHEDULE_HOURS = [8.0, 14.0, 20.0] as const;
export const CITY_BUS_STOP_X = 27.0;
export const CITY_BUS_FLEET_SIZE = 3;

export type ParkBusStopId = 'park_central' | 'park_west' | 'park_phodibo' | 'park_hotel';

export interface ParkBusStopSpec {
  id: ParkBusStopId;
  stopNumber: string;
  nameVi: string;
  nameEn: string;
  x: number;
  z: number;
  rotY: number;
  bayX: number;
  bayZ: number;
  approachDirX: -1 | 0 | 1;
  approachDirZ: -1 | 0 | 1;
  /** Local +X (+1) or -X (-1) door flank that faces the shelter sidewalk */
  doorSide: 1 | -1;
}

export const PARK_BUS_STOPS: readonly ParkBusStopSpec[] = [
  {
    id: 'park_central',
    stopNumber: '01',
    nameVi: 'Công Viên Trung Tâm',
    nameEn: 'CENTRAL GREEN PARK',
    x: CITY_BUS_STOP_X,
    z: 39.0,
    rotY: 0,
    bayX: CITY_BUS_STOP_X,
    bayZ: 35.35,
    approachDirX: -1,
    approachDirZ: 0,
    doorSide: 1,
  },
  {
    id: 'park_west',
    stopNumber: '02',
    nameVi: 'Công Viên Tây',
    nameEn: 'WEST GREEN PARK',
    x: -162.5,
    z: 19.0,
    rotY: Math.PI,
    bayX: -162.5,
    bayZ: 22.65,
    approachDirX: 1,
    approachDirZ: 0,
    doorSide: 1,
  },
  {
    id: 'park_hotel',
    stopNumber: '04',
    nameVi: 'Công Viên Hotel Xanh',
    nameEn: 'HOTEL GREEN PARK',
    x: 203.9,
    z: 104.5,
    rotY: Math.PI / 2,
    bayX: 200.25,
    bayZ: 104.5,
    approachDirX: 0,
    approachDirZ: -1,
    doorSide: -1,
  },
  {
    id: 'park_phodibo',
    stopNumber: '03',
    nameVi: 'Công Viên Sông Hàn Bắc',
    nameEn: 'PHỐ ĐI BỘ NORTH PARK',
    x: 203.9,
    z: -96.5,
    rotY: Math.PI / 2,
    bayX: 200.25,
    bayZ: -96.5,
    approachDirX: 0,
    approachDirZ: -1,
    doorSide: -1,
  },
] as const;

export class CityBusScheduleTracker {
  public tripsCompletedToday: [boolean, boolean, boolean] = [false, false, false];
  private lastTrackedHour: number = 7.0;

  public syncAndCheckTrigger(
    rawHour: number,
    isShopOpen: boolean,
    isBusIdle: boolean
  ): { triggerTripIndex: number | null; shouldHaveWaiters: boolean; resetOccurred: boolean } {
    let resetOccurred = false;
    if (rawHour < this.lastTrackedHour - 1.5) {
      for (let i = 0; i < CITY_BUS_SCHEDULE_HOURS.length; i++) {
        if (rawHour < CITY_BUS_SCHEDULE_HOURS[i] - 0.05) {
          this.tripsCompletedToday[i] = false;
        }
      }
      if (rawHour < 7.5) {
        this.tripsCompletedToday = [false, false, false];
      }
      resetOccurred = true;
    }
    this.lastTrackedHour = rawHour;

    if (!isShopOpen) {
      return { triggerTripIndex: null, shouldHaveWaiters: false, resetOccurred };
    }

    for (let i = 0; i < CITY_BUS_SCHEDULE_HOURS.length; i++) {
      const tripHour = CITY_BUS_SCHEDULE_HOURS[i];
      if (!this.tripsCompletedToday[i] && rawHour >= tripHour + 0.75) {
        this.tripsCompletedToday[i] = true;
      }
    }

    let triggerTripIndex: number | null = null;
    if (isBusIdle) {
      for (let i = 0; i < CITY_BUS_SCHEDULE_HOURS.length; i++) {
        const tripHour = CITY_BUS_SCHEDULE_HOURS[i];
        if (!this.tripsCompletedToday[i] && rawHour >= tripHour && rawHour < tripHour + 0.75) {
          this.tripsCompletedToday[i] = true;
          triggerTripIndex = i;
          break;
        }
      }
    }

    const allTripsDone = this.tripsCompletedToday[0] && this.tripsCompletedToday[1] && this.tripsCompletedToday[2];
    const shouldHaveWaiters = rawHour >= 6.5 && rawHour < 20.5 && !allTripsDone;
    return { triggerTripIndex, shouldHaveWaiters, resetOccurred };
  }
}

/**
 * Coordinates strictly 3 transit buses taking alternating relay shifts across the 4-park loop.
 * At most `maxActiveOnRoute` (default 2 of 3) run simultaneously on opposite sides of the city
 * while the 3rd rests in the depot waiting its turn, rotating strictly 0 -> 1 -> 2 -> 0...
 */
export class CityBusRelayScheduler {
  public readonly fleetSize: number = CITY_BUS_FLEET_SIZE;
  public readonly maxActiveOnRoute: number;
  public readonly headwaySeconds: number;
  public readonly restCooldownSeconds: number;

  public nextTurnIndex: number = 0;
  private activeFlags: boolean[] = [false, false, false];
  private restTimers: number[] = [0, 0, 0];
  private timeSinceLastDispatch: number = 999;

  constructor(options?: {
    maxActiveOnRoute?: number;
    headwaySeconds?: number;
    restCooldownSeconds?: number;
  }) {
    this.maxActiveOnRoute = Math.min(CITY_BUS_FLEET_SIZE, Math.max(1, options?.maxActiveOnRoute ?? 2));
    this.headwaySeconds = options?.headwaySeconds ?? 24.0;
    this.restCooldownSeconds = options?.restCooldownSeconds ?? 6.0;
  }

  public markDispatched(busIndex: number): void {
    if (busIndex < 0 || busIndex >= this.fleetSize) return;
    this.activeFlags[busIndex] = true;
    this.restTimers[busIndex] = 0;
    this.timeSinceLastDispatch = 0;
    this.nextTurnIndex = (busIndex + 1) % this.fleetSize;
  }

  public markFinished(busIndex: number): void {
    if (busIndex < 0 || busIndex >= this.fleetSize) return;
    this.activeFlags[busIndex] = false;
    this.restTimers[busIndex] = this.restCooldownSeconds;
  }

  public resetAll(): void {
    for (let i = 0; i < this.fleetSize; i++) {
      this.activeFlags[i] = false;
      this.restTimers[i] = 0;
    }
    this.timeSinceLastDispatch = this.headwaySeconds;
    this.nextTurnIndex = 0;
  }

  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.fleetSize; i++) {
      if (this.activeFlags[i]) count++;
    }
    return count;
  }

  public step(delta: number, isOpen: boolean): number | null {
    this.timeSinceLastDispatch += delta;
    for (let i = 0; i < this.fleetSize; i++) {
      if (this.restTimers[i] > 0) {
        this.restTimers[i] = Math.max(0, this.restTimers[i] - delta);
      }
    }

    if (!isOpen) return null;
    if (this.getActiveCount() >= this.maxActiveOnRoute) return null;
    if (this.timeSinceLastDispatch < this.headwaySeconds) return null;

    const candidate = this.nextTurnIndex;
    if (!this.activeFlags[candidate] && this.restTimers[candidate] <= 0) {
      this.markDispatched(candidate);
      return candidate;
    }
    return null;
  }
}

export interface BusPassengerCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface UpgradedBusStopResult {
  group: THREE.Group;
  canopyLedMat: THREE.MeshStandardMaterial;
  neonMats: THREE.MeshStandardMaterial[];
}

function shelterLocalToWorld(
  stop: ParkBusStopSpec,
  lx: number,
  lz: number,
  localRotY: number = 0
): { x: number; z: number; rotY: number } {
  const c = Math.cos(stop.rotY);
  const s = Math.sin(stop.rotY);
  return {
    x: stop.x + lx * c + lz * s,
    z: stop.z - lx * s + lz * c,
    rotY: stop.rotY + localRotY,
  };
}

export function createUpgradedBusStopShelterGroup(
  stopSpec: ParkBusStopSpec = PARK_BUS_STOPS[0]
): UpgradedBusStopResult {
  const busGroup = new THREE.Group();
  busGroup.position.set(stopSpec.x, 0, stopSpec.z);
  busGroup.rotation.y = stopSpec.rotY;

  const busSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.28 });
  const busTrimSilverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.22 });
  const busBaseGraniteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88, metalness: 0.08 });
  const busTactileMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.72 });
  const busWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.62 });
  const busGlassPanelMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.08,
    metalness: 0.22,
    transparent: true,
    opacity: 0.26,
  });
  const busSkylightGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.65,
  });
  const canopyLedMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde68a,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });

  const neonMats: THREE.MeshStandardMaterial[] = [];

  // Subtle dark granite platform slab & tactile yellow safety strip along boarding edge
  const shelterPlinth = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.024, 2.35), busBaseGraniteMat);
  shelterPlinth.position.set(0.05, 0.012, 0.08);
  busGroup.add(shelterPlinth);

  const tactileStrip = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.016, 0.26), busTactileMat);
  tactileStrip.position.set(0, 0.008, -1.72);
  busGroup.add(tactileStrip);

  // 3 Brushed Charcoal Steel Rear Columns + Bolted Floor Flanges
  [-2.35, 0.12, 2.35].forEach((px) => {
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.24), busSteelMat);
    flange.position.set(px, 0.032, 0.86);
    busGroup.add(flange);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.70, 0.11), busSteelMat);
    post.position.set(px, 1.36, 0.86);
    busGroup.add(post);
  });

  // Rear lower kick rail + upper transom rail + West side windbreak stanchion
  const rearLowerRail = new THREE.Mesh(new THREE.BoxGeometry(4.82, 0.06, 0.07), busSteelMat);
  rearLowerRail.position.set(0, 0.20, 0.86);
  busGroup.add(rearLowerRail);

  const rearUpperRail = new THREE.Mesh(new THREE.BoxGeometry(4.82, 0.08, 0.08), busSteelMat);
  rearUpperRail.position.set(0, 2.52, 0.86);
  busGroup.add(rearUpperRail);

  const sideFrontPost = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.70, 0.11), busSteelMat);
  sideFrontPost.position.set(-2.35, 1.36, -0.78);
  busGroup.add(sideFrontPost);

  const sideFrontFlange = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.24), busSteelMat);
  sideFrontFlange.position.set(-2.35, 0.032, -0.78);
  busGroup.add(sideFrontFlange);

  // Rear Tempered Glass Windbreak Panels
  const rearGlassLeft = new THREE.Mesh(new THREE.BoxGeometry(2.34, 2.26, 0.045), busGlassPanelMat);
  rearGlassLeft.position.set(-1.11, 1.36, 0.86);
  busGroup.add(rearGlassLeft);

  const rearGlassRight = new THREE.Mesh(new THREE.BoxGeometry(2.12, 2.26, 0.045), busGlassPanelMat);
  rearGlassRight.position.set(1.24, 1.36, 0.86);
  busGroup.add(rearGlassRight);

  // Cantilevered Architectural Canopy Roof + Silver Anodized Fascia + Skylight + Under-Canopy LED Strip
  const roofCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.09, 2.38), busSteelMat);
  roofCanopy.position.set(0.05, 2.72, -0.05);
  roofCanopy.rotation.x = -0.045;
  busGroup.add(roofCanopy);

  const roofFrontFascia = new THREE.Mesh(new THREE.BoxGeometry(5.58, 0.11, 0.05), busTrimSilverMat);
  roofFrontFascia.position.set(0.05, 2.67, -1.23);
  busGroup.add(roofFrontFascia);

  const roofBackFascia = new THREE.Mesh(new THREE.BoxGeometry(5.58, 0.11, 0.05), busTrimSilverMat);
  roofBackFascia.position.set(0.05, 2.77, 1.13);
  busGroup.add(roofBackFascia);

  const roofSkylight = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 1.45), busSkylightGlassMat);
  roofSkylight.position.set(0.05, 2.76, -0.05);
  roofSkylight.rotation.x = -0.045;
  busGroup.add(roofSkylight);

  [-2.35, 0.12, 2.35].forEach((cx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 2.05), busSteelMat);
    arm.position.set(cx, 2.64, -0.04);
    arm.rotation.x = -0.045;
    busGroup.add(arm);
  });

  const underLedHousing = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.035, 0.20), busSteelMat);
  underLedHousing.position.set(0.05, 2.65, 0.02);
  busGroup.add(underLedHousing);
  const underLedDiffuser = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.025, 0.14), canopyLedMat);
  underLedDiffuser.position.set(0.05, 2.63, 0.02);
  busGroup.add(underLedDiffuser);

  // Realistic Multi-Slat Teakwood & Cast-Steel Waiting Bench
  const benchCenterX = 0.45;
  const benchZ = 0.42;
  [-0.95, 0.45, 1.85].forEach((lx) => {
    const footBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.48), busSteelMat);
    footBar.position.set(lx, 0.04, benchZ);
    busGroup.add(footBar);

    const legFront = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.42, 0.055), busSteelMat);
    legFront.position.set(lx, 0.23, benchZ - 0.18);
    busGroup.add(legFront);

    const legBack = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.88, 0.055), busSteelMat);
    legBack.position.set(lx, 0.46, benchZ + 0.21);
    legBack.rotation.x = 0.08;
    busGroup.add(legBack);
  });

  [-0.95, -0.02, 0.92, 1.85].forEach((ax) => {
    const armTop = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.38), busSteelMat);
    armTop.position.set(ax, 0.64, benchZ + 0.01);
    busGroup.add(armTop);
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.045), busSteelMat);
    armPost.position.set(ax, 0.54, benchZ - 0.15);
    busGroup.add(armPost);
  });

  [-0.14, -0.04, 0.06, 0.16].forEach((sz) => {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.90, 0.042, 0.082), busWoodMat);
    slat.position.set(benchCenterX, 0.445, benchZ + sz);
    busGroup.add(slat);
  });
  [0.64, 0.76, 0.88].forEach((by, bIdx) => {
    const backSlat = new THREE.Mesh(new THREE.BoxGeometry(2.90, 0.085, 0.04), busWoodMat);
    backSlat.position.set(benchCenterX, by, benchZ + 0.21 + bIdx * 0.012);
    backSlat.rotation.x = 0.10;
    busGroup.add(backSlat);
  });

  // High-DPI Backlit Mupi Route Map showing 4 Park Bus Stops & 3 Alternating Fleet Units
  const createBusMupiTex = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 1228;
    const ctx = canvas.getContext('2d')!;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1228);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#0b1322');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 768, 1228);

    const hdrGrad = ctx.createLinearGradient(0, 0, 768, 220);
    hdrGrad.addColorStop(0, '#047857');
    hdrGrad.addColorStop(1, '#0f766e');
    ctx.fillStyle = hdrGrad;
    ctx.fillRect(0, 0, 768, 226);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 220, 768, 10);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(42, 42, 148, 138, 22);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 84px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('25', 116, 114);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = '900 40px system-ui, -apple-system, sans-serif';
    ctx.fillText(`TRẠM ${stopSpec.stopNumber} • TUYẾN CÔNG VIÊN`, 212, 86);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '700 25px system-ui, sans-serif';
    ctx.fillText(stopSpec.nameEn, 212, 142);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(42, 266, 684, 420, 20);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.fillText('LỘ TRÌNH 4 TRẠM CÔNG VIÊN (LINE 25)', 76, 314);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(116, 376);
    ctx.lineTo(116, 634);
    ctx.stroke();

    const orderedStops: Array<{ id: ParkBusStopId; label: string; y: number }> = [
      { id: 'park_west', label: '02 · Công Viên Tây', y: 376 },
      { id: 'park_hotel', label: '04 · Công Viên Hotel Xanh', y: 462 },
      { id: 'park_phodibo', label: '03 · Công Viên Sông Hàn Bắc', y: 548 },
      { id: 'park_central', label: '01 · Công Viên Trung Tâm', y: 634 },
    ];
    orderedStops.forEach((st) => {
      const isHere = st.id === stopSpec.id;
      ctx.fillStyle = isHere ? '#facc15' : '#ffffff';
      ctx.beginPath();
      ctx.arc(116, st.y, isHere ? 18 : 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = isHere ? '#fde047' : '#e2e8f0';
      ctx.font = isHere ? '900 27px system-ui, sans-serif' : '600 25px system-ui, sans-serif';
      ctx.fillText(isHere ? `${st.label} (Trạm này)` : st.label, 160, st.y + 2);
    });

    ctx.fillStyle = '#131f33';
    ctx.beginPath();
    ctx.roundRect(42, 718, 684, 412, 20);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('ĐỘI XE TUẦN HOÀN: 3 CHIẾC LUÂN PHIÊN', 76, 772);

    const fleetUnits = [
      { label: 'XE BUÝT #01 • EMERALD GOLD', tag: 'XE 01', badge: '#047857' },
      { label: 'XE BUÝT #02 • OCEAN TEAL', tag: 'XE 02', badge: '#0284c7' },
      { label: 'XE BUÝT #03 • AMBER EXPRESS', tag: 'XE 03', badge: '#d97706' },
    ];
    fleetUnits.forEach((u, idx) => {
      const ty = 832 + idx * 94;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(72, ty, 624, 74, 14);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.font = '700 25px system-ui, sans-serif';
      ctx.fillText(u.label, 98, ty + 39);

      ctx.fillStyle = u.badge;
      ctx.beginPath();
      ctx.roundRect(524, ty + 12, 152, 50, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 28px monospace';
      ctx.fillText(u.tag, 600, ty + 39);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('3 XE BUÝT THAY NHAU CHẠY PHỤC VỤ 4 CÔNG VIÊN', 384, 1178);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };

  const mupiHousing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.28, 1.32), busSteelMat);
  mupiHousing.position.set(-2.35, 1.36, 0.04);
  busGroup.add(mupiHousing);

  const busMupiTex = createBusMupiTex();
  const busMupiMat = new THREE.MeshStandardMaterial({
    map: busMupiTex,
    emissive: 0xffffff,
    emissiveMap: busMupiTex,
    emissiveIntensity: 0.42,
    roughness: 0.22,
  });
  neonMats.push(busMupiMat);
  [-1, 1].forEach((side) => {
    const mupiFace = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 1.82), busMupiMat);
    mupiFace.position.set(-2.35 + side * 0.086, 1.38, 0.04);
    mupiFace.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    busGroup.add(mupiFace);
  });

  // Roadside Illuminated BUS STOP Totem Pole
  const totemX = -3.65;
  const totemZ = -1.25;
  const totemBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.14, 12), busSteelMat);
  totemBase.position.set(totemX, 0.07, totemZ);
  busGroup.add(totemBase);

  const totemPole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 2.75, 12), busSteelMat);
  totemPole.position.set(totemX, 1.40, totemZ);
  busGroup.add(totemPole);

  const totemHeadFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.12), busSteelMat);
  totemHeadFrame.position.set(totemX, 2.75, totemZ);
  busGroup.add(totemHeadFrame);

  const createTotemHeadTex = () => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 18;
    ctx.strokeRect(14, 14, 484, 484);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 66px system-ui, sans-serif';
    ctx.fillText('BUS STOP', 256, 112);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(106, 174, 300, 178, 28);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 132px system-ui, sans-serif';
    ctx.fillText('25', 256, 268);

    ctx.fillStyle = '#d1fae5';
    ctx.font = '800 36px monospace';
    ctx.fillText(`TRẠM ${stopSpec.stopNumber} • 3 XE`, 256, 428);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  const totemHeadTex = createTotemHeadTex();
  const totemHeadMat = new THREE.MeshStandardMaterial({
    map: totemHeadTex,
    emissive: 0xffffff,
    emissiveMap: totemHeadTex,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  neonMats.push(totemHeadMat);
  [-1, 1].forEach((side) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.68), totemHeadMat);
    face.position.set(totemX, 2.75, totemZ + side * 0.064);
    face.rotation.y = side > 0 ? 0 : Math.PI;
    busGroup.add(face);
  });

  // Sidewalk Dual Recycling Trash Bin
  const binBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.86, 14), busSteelMat);
  binBody.position.set(3.05, 0.43, 0.55);
  busGroup.add(binBody);
  const binLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.08, 14),
    new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.35, metalness: 0.25 })
  );
  binLid.position.set(3.05, 0.88, 0.55);
  busGroup.add(binLid);

  // Asphalt Yellow BUS STOP Bay Markings on Opposite Curb Lane (local z = -3.65)
  const createBusRoadMarkingTex = () => {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 280;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 1280, 280);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.92)';
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, 1244, 244);

    ctx.lineWidth = 12;
    for (let i = 0; i < 4; i++) {
      const lx = 56 + i * 54;
      ctx.beginPath();
      ctx.moveTo(lx, 24);
      ctx.lineTo(lx - 34, 256);
      ctx.stroke();

      const rx = 1044 + i * 54;
      ctx.beginPath();
      ctx.moveTo(rx, 24);
      ctx.lineTo(rx - 34, 256);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(250, 204, 21, 0.94)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 108px system-ui, -apple-system, sans-serif';
    ctx.fillText('BUS STOP', 640, 142);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  const busBayDecalMat = new THREE.MeshBasicMaterial({
    map: createBusRoadMarkingTex(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const busBayDecal = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 2.65), busBayDecalMat);
  busBayDecal.rotation.x = -Math.PI / 2;
  busBayDecal.position.set(0, -0.247, -3.65);
  busGroup.add(busBayDecal);

  return { group: busGroup, canopyLedMat, neonMats };
}

interface BusPassengerRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  glbHandle?: GlbHumanHandle;
}

export interface BoardingWaypoint {
  x: number;
  z: number;
  stepY?: number;
}

export function computeStopPassengerPaths(spec: ParkBusStopSpec) {
  // travelSignInLocalX: -1 for Stops 1 & 2 (bus moves local -X), +1 for Stops 3 & 4 (bus moves local +X)
  const travelSign = spec.doorSide === 1 ? -1 : 1;
  const frontDoorLx = 3.35 * travelSign;
  const rearDoorLx = -0.85 * travelSign;

  const boardDoorW = shelterLocalToWorld(spec, frontDoorLx, -2.52, 0);
  const curbWaitW = shelterLocalToWorld(spec, frontDoorLx, -1.58, 0);

  const localWaiterConfigs: Array<{
    lx: number;
    lz: number;
    seated: boolean;
    lRotY: number;
    bag: boolean;
    waypoints: Array<{ lx: number; lz: number; stepY?: number }>;
  }> = [
    {
      lx: -0.48,
      lz: 0.48,
      seated: true,
      lRotY: Math.PI,
      bag: false,
      waypoints: [
        { lx: -0.48, lz: -0.35, stepY: 0 },
        { lx: frontDoorLx * 0.72, lz: -1.38, stepY: 0 },
        { lx: frontDoorLx, lz: -1.58, stepY: 0 },
        { lx: frontDoorLx, lz: -2.52, stepY: 0.08 },
      ],
    },
    {
      lx: 1.38,
      lz: 0.48,
      seated: true,
      lRotY: Math.PI,
      bag: true,
      waypoints: [
        { lx: 1.38, lz: -0.35, stepY: 0 },
        { lx: frontDoorLx * 0.50, lz: -1.38, stepY: 0 },
        { lx: frontDoorLx, lz: -1.58, stepY: 0 },
        { lx: frontDoorLx, lz: -2.52, stepY: 0.08 },
      ],
    },
    {
      lx: 1.55 * travelSign,
      lz: -0.45,
      seated: false,
      lRotY: Math.PI - 0.3 * travelSign,
      bag: true,
      waypoints: [
        { lx: frontDoorLx * 0.72, lz: -1.38, stepY: 0 },
        { lx: frontDoorLx, lz: -1.58, stepY: 0 },
        { lx: frontDoorLx, lz: -2.52, stepY: 0.08 },
      ],
    },
  ];

  const waiterPlans = localWaiterConfigs.map((cfg) => {
    const slotPose = shelterLocalToWorld(spec, cfg.lx, cfg.lz, cfg.lRotY);
    const boardingWaypoints: BoardingWaypoint[] = cfg.waypoints.map((wp) => {
      const worldPt = shelterLocalToWorld(spec, wp.lx, wp.lz, 0);
      return { x: worldPt.x, z: worldPt.z, stepY: wp.stepY };
    });
    return {
      slot: { x: slotPose.x, z: slotPose.z, seated: cfg.seated, rotY: slotPose.rotY },
      bag: cfg.bag,
      boardingWaypoints,
    };
  });

  const alightSpecs: Array<{
    dir: 1 | -1;
    doorOffset: number;
    laneLz: number;
    exitDelay: number;
    bag: boolean;
  }> = [
    { dir: 1, doorOffset: rearDoorLx, laneLz: -1.48, exitDelay: 0.42, bag: true },
    { dir: -1, doorOffset: frontDoorLx, laneLz: -1.60, exitDelay: 0.58, bag: false },
  ];

  const alighterPlans = alightSpecs.map((as) => {
    const doorW = shelterLocalToWorld(spec, as.doorOffset, -2.52, 0);
    const swW = shelterLocalToWorld(spec, as.doorOffset, as.laneLz, 0);
    const dirEndW = shelterLocalToWorld(spec, as.doorOffset + as.dir, as.laneLz, 0);
    const wdX = dirEndW.x - swW.x;
    const wdZ = dirEndW.z - swW.z;
    const wLen = Math.hypot(wdX, wdZ) || 1;
    return {
      bag: as.bag,
      doorX: doorW.x,
      doorZ: doorW.z,
      exitDelay: as.exitDelay,
      targetSidewalkX: swW.x,
      targetSidewalkZ: swW.z,
      walkDirX: wdX / wLen,
      walkDirZ: wdZ / wLen,
    };
  });

  const faceBusW = shelterLocalToWorld(spec, 0, 0, Math.PI);
  return {
    boardDoorX: boardDoorW.x,
    boardDoorZ: boardDoorW.z,
    curbApproachX: curbWaitW.x,
    curbApproachZ: curbWaitW.z,
    faceBusYaw: faceBusW.rotY,
    waiterPlans,
    alighterPlans,
  };
}

interface BusWaiterActor extends BusPassengerRig {
  slot: { x: number; z: number; seated: boolean; rotY: number };
  state: 'hidden' | 'waiting_seated' | 'waiting_standing' | 'boarding' | 'on_bus';
  boardingWaypoints: BoardingWaypoint[];
  boardingWpIdx: number;
  boardingElapsed: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  walkPhase: number;
  phaseOffset: number;
}

interface BusAlighterActor extends BusPassengerRig {
  state: 'hidden' | 'waiting_to_exit' | 'exiting_bus' | 'walking_away';
  doorX: number;
  doorZ: number;
  exitDelay: number;
  exitElapsed: number;
  x: number;
  y: number;
  z: number;
  walkDirX: number;
  walkDirZ: number;
  targetSidewalkX: number;
  targetSidewalkZ: number;
  distanceWalked: number;
  speed: number;
  walkPhase: number;
}

interface StopRuntimeState {
  spec: ParkBusStopSpec;
  waiters: BusWaiterActor[];
  alighters: BusAlighterActor[];
  dockedBusIndex: number | null;
  respawnCooldown: number;
  boardDoorX: number;
  boardDoorZ: number;
  curbApproachX: number;
  curbApproachZ: number;
  faceBusYaw: number;
}

type BusRoutePhase =
  | 'idle'
  | 'ew_east_to_stop2'
  | 'ew_east_to_east_int'
  | 'turning_curve'
  | 'ns_south_to_vh_turn'
  | 'ns_north_to_stop4'
  | 'ns_north_to_east_int'
  | 'ns_north_to_stop3'
  | 'ns_north_to_bd_turn'
  | 'ns_south_to_east_turn'
  | 'ew_west_to_stop1'
  | 'ew_west_to_depot'
  | 'docked';

interface BusCurvePlan {
  p0x: number;
  p0z: number;
  p1x: number;
  p1z: number;
  p2x: number;
  p2z: number;
  t: number;
  duration: number;
  nextPhase: BusRoutePhase;
  exitLaneCoord: number;
}

interface TransitBusUnit {
  index: number;
  trafficId: string;
  unitLabel: string;
  bodyColor: number;
  stripeColor: number;
  root: THREE.Group;
  pitchPivot: THREE.Group;
  wheels: THREE.Group[];
  rightFrontDoorL: THREE.Mesh;
  rightFrontDoorR: THREE.Mesh;
  rightRearDoorL: THREE.Mesh;
  rightRearDoorR: THREE.Mesh;
  leftFrontDoorL: THREE.Mesh;
  leftFrontDoorR: THREE.Mesh;
  leftRearDoorL: THREE.Mesh;
  leftRearDoorR: THREE.Mesh;
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  brakeMat: THREE.MeshStandardMaterial;
  hazardMat: THREE.MeshStandardMaterial;
  interiorGlowMat: THREE.MeshStandardMaterial;
  ledSignMat: THREE.MeshStandardMaterial;

  phase: BusRoutePhase;
  resumePhase: BusRoutePhase;
  x: number;
  z: number;
  laneCoord: number;
  yaw: number;
  speed: number;
  prevX: number;
  prevZ: number;
  doorOpen: number;
  dockDoorSide: 1 | -1;
  dockStopIdx: number;
  dockTimer: number;
  departWaitElapsed: number;
  curve: BusCurvePlan | null;
}

const BUS_UNIT_SPECS: ReadonlyArray<{ unitLabel: string; bodyColor: number; stripeColor: number; signBadge: string }> = [
  { unitLabel: 'XE 01', bodyColor: 0x0f766e, stripeColor: 0xf59e0b, signBadge: '#047857' },
  { unitLabel: 'XE 02', bodyColor: 0x0369a1, stripeColor: 0x38bdf8, signBadge: '#0284c7' },
  { unitLabel: 'XE 03', bodyColor: 0x047857, stripeColor: 0xfbbf24, signBadge: '#d97706' },
];

export class CityBusController {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  private buses: TransitBusUnit[] = [];
  private stopStates: StopRuntimeState[] = [];
  private relayScheduler = new CityBusRelayScheduler({
    maxActiveOnRoute: 2,
    headwaySeconds: 22.0,
    restCooldownSeconds: 5.0,
  });
  private scheduleTracker = new CityBusScheduleTracker();
  private trafficCoordinator: CityTrafficCoordinator | null = null;
  private getWestSignal: BoulevardSignalGetter | null = null;
  private getEastSignal: BoulevardSignalGetter | null = null;
  private getVinhomesSignal: BoulevardSignalGetter | null = null;
  private hasDoneInitialStagger = false;

  constructor(helpers: BusPassengerCharacterHelpers, trafficCoordinator?: CityTrafficCoordinator) {
    this.rootGroup.userData.noMerge = true;
    this.trafficCoordinator = trafficCoordinator ?? null;

    for (let i = 0; i < CITY_BUS_FLEET_SIZE; i++) {
      const unit = this.buildTransitBusUnit(i, BUS_UNIT_SPECS[i]);
      this.buses.push(unit);
      this.rootGroup.add(unit.root);
    }

    this.buildAllStopPassengers(helpers);
    this.dispatchInitialStaggeredPair();
  }

  public setTrafficCoordinator(coordinator: CityTrafficCoordinator) {
    this.trafficCoordinator = coordinator;
  }

  public setIntersectionSignalGetters(
    west?: BoulevardSignalGetter | null,
    east?: BoulevardSignalGetter | null,
    vinhomes?: BoulevardSignalGetter | null
  ) {
    this.getWestSignal = west ?? null;
    this.getEastSignal = east ?? null;
    this.getVinhomesSignal = vinhomes ?? null;
  }

  private buildPassengerRig(
    paletteIndex: number,
    helpers: BusPassengerCharacterHelpers,
    withBag: boolean
  ): BusPassengerRig {
    const skinPalette = [
      { color: 0xffdbac, hex: '#ffdbac' },
      { color: 0xf1c27d, hex: '#f1c27d' },
      { color: 0xe0ac69, hex: '#e0ac69' },
      { color: 0xc68642, hex: '#c68642' },
      { color: 0xffe0bd, hex: '#ffe0bd' },
    ];
    const hairPalette = [0x111111, 0x2b1d0c, 0x6b3e1a, 0xd4a359, 0x1e293b];
    const shirtPalette = [0x0284c7, 0xdc2626, 0x059669, 0xf59e0b, 0x4f46e5, 0x0d9488];
    const pantsPalette = [0x1e293b, 0x0f172a, 0x334155, 0x1e3a8a, 0x27272a];

    const skin = skinPalette[paletteIndex % skinPalette.length];
    const hair = hairPalette[(paletteIndex + 1) % hairPalette.length];
    const shirt = shirtPalette[paletteIndex % shirtPalette.length];
    const pants = pantsPalette[(paletteIndex + 2) % pantsPalette.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.color, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.7 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });

    const group = new THREE.Group();
    const hipsGroup = new THREE.Group();
    hipsGroup.position.set(0, 0.84, 0);
    group.add(hipsGroup);

    const buildArticulatedLeg = (lx: number) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.02, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), pantsMat);
      thigh.position.set(0, -0.19, 0);
      leg.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.38, 0);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), pantsMat);
      shin.position.set(0, -0.19, 0);
      knee.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), shoesMat);
      shoe.position.set(0, -0.40, 0.04);
      knee.add(shoe);

      leg.add(knee);
      hipsGroup.add(leg);
      return { leg, knee };
    };

    const left = buildArticulatedLeg(-0.10);
    const right = buildArticulatedLeg(0.10);

    const torsoGroup = new THREE.Group();
    hipsGroup.add(torsoGroup);

    const hipsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), pantsMat);
    hipsMesh.position.set(0, 0.08, 0);
    torsoGroup.add(hipsMesh);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.40, 0.22), shirtMat);
    chest.position.set(0, 0.36, 0);
    torsoGroup.add(chest);

    if (withBag) {
      const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.12), bagMat);
      backpack.position.set(0, 0.35, -0.16);
      torsoGroup.add(backpack);
    }

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.08, 10), skinMat);
    neck.position.set(0, 0.60, 0);
    torsoGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.74, 0);
    torsoGroup.add(headGroup);

    const faceTex = helpers.createFaceTexture('happy', skin.hex);
    headGroup.add(helpers.createHeadMesh(skinMat, faceTex, 0.22, 0.24, 0.21));

    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.235), hairMat);
    hairTop.position.set(0, 0.12, -0.004);
    headGroup.add(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.045), hairMat);
    hairBack.position.set(0, 0.025, -0.104);
    headGroup.add(hairBack);

    [-0.112, 0.112].forEach((sx) => {
      const sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.11), hairMat);
      sideHair.position.set(sx, 0.06, -0.03);
      headGroup.add(sideHair);
    });

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.25, 0.52, 0);
    const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), shirtMat);
    lSleeve.position.set(0, -0.11, 0);
    leftArm.add(lSleeve);
    const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.10), skinMat);
    lForearm.position.set(0, -0.32, 0);
    leftArm.add(lForearm);
    torsoGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.25, 0.52, 0);
    const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), shirtMat);
    rSleeve.position.set(0, -0.11, 0);
    rightArm.add(rSleeve);
    const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.10), skinMat);
    rForearm.position.set(0, -0.32, 0);
    rightArm.add(rForearm);
    torsoGroup.add(rightArm);

    return {
      group,
      hipsGroup,
      leftLeg: left.leg,
      rightLeg: right.leg,
      leftKnee: left.knee,
      rightKnee: right.knee,
      leftArm,
      rightArm,
      headGroup,
    };
  }

  private buildAllStopPassengers(helpers: BusPassengerCharacterHelpers) {
    this.stopStates = PARK_BUS_STOPS.map((spec, sIdx) => {
      const paths = computeStopPassengerPaths(spec);

      const waiters: BusWaiterActor[] = paths.waiterPlans.map((plan, wIdx) => {
        const rig = this.buildPassengerRig(sIdx * 3 + wIdx + 2, helpers, plan.bag);
        const modelSpec = plan.slot.seated
          ? pickSeatedCivilianModel(210 + sIdx * 3 + wIdx)
          : pickStationaryCivilianModel(210 + sIdx * 3 + wIdx);
        const glbHandle = attachGlbHumanToNpc({
          modelSource: modelSpec.modelSource,
          hostGroup: rig.group,
          fallbackMeshes: [rig.hipsGroup],
          targetHeight: modelSpec.targetHeight,
          rotationY: modelSpec.rotationY,
          clipProfile: modelSpec.clipProfile,
          initialState: plan.slot.seated ? 'Sit' : 'Idle',
          phaseOffset: (sIdx * 3 + wIdx) * 1.4,
        });
        rig.group.visible = false;
        this.rootGroup.add(rig.group);
        return {
          ...rig,
          glbHandle,
          slot: plan.slot,
          state: 'hidden',
          boardingWaypoints: plan.boardingWaypoints,
          boardingWpIdx: 0,
          boardingElapsed: 0,
          x: plan.slot.x,
          y: 0,
          z: plan.slot.z,
          speed: 1.38 + (wIdx % 2) * 0.14,
          walkPhase: (sIdx + wIdx) * 1.3,
          phaseOffset: (sIdx * 3 + wIdx) * 1.4,
        };
      });

      const alighters: BusAlighterActor[] = paths.alighterPlans.map((plan, aIdx) => {
        const rig = this.buildPassengerRig(sIdx * 2 + aIdx + 10, helpers, plan.bag);
        const modelSpec = pickOutsideNpcModel(240 + sIdx * 2 + aIdx);
        const glbHandle = attachGlbHumanToNpc({
          modelSource: modelSpec.modelSource,
          hostGroup: rig.group,
          fallbackMeshes: [rig.hipsGroup],
          targetHeight: modelSpec.targetHeight,
          rotationY: modelSpec.rotationY,
          clipProfile: modelSpec.clipProfile,
          initialState: 'Walk',
          phaseOffset: aIdx * 2.1,
        });
        rig.group.visible = false;
        this.rootGroup.add(rig.group);
        return {
          ...rig,
          glbHandle,
          state: 'hidden',
          doorX: plan.doorX,
          doorZ: plan.doorZ,
          exitDelay: plan.exitDelay,
          exitElapsed: 0,
          x: plan.doorX,
          y: 0.08,
          z: plan.doorZ,
          walkDirX: plan.walkDirX,
          walkDirZ: plan.walkDirZ,
          targetSidewalkX: plan.targetSidewalkX,
          targetSidewalkZ: plan.targetSidewalkZ,
          distanceWalked: 0,
          speed: 1.42 + aIdx * 0.12,
          walkPhase: aIdx * 2.1,
        };
      });

      return {
        spec,
        waiters,
        alighters,
        dockedBusIndex: null,
        respawnCooldown: 0,
        boardDoorX: paths.boardDoorX,
        boardDoorZ: paths.boardDoorZ,
        curbApproachX: paths.curbApproachX,
        curbApproachZ: paths.curbApproachZ,
        faceBusYaw: paths.faceBusYaw,
      };
    });

    for (const st of this.stopStates) {
      this.spawnWaitersForStop(st);
    }
  }

  private buildTransitBusUnit(
    index: number,
    spec: { unitLabel: string; bodyColor: number; stripeColor: number; signBadge: string }
  ): TransitBusUnit {
    const root = new THREE.Group();
    const pitchPivot = new THREE.Group();
    root.add(pitchPivot);

    const pearlWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.22, roughness: 0.26 });
    const bodyTransitMat = new THREE.MeshStandardMaterial({ color: spec.bodyColor, metalness: 0.30, roughness: 0.28 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: spec.stripeColor, metalness: 0.40, roughness: 0.24 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.32, roughness: 0.72 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.90, roughness: 0.14 });
    const tireRubberMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.92 });
    const busTintedGlassMat = new THREE.MeshStandardMaterial({
      color: 0x050a12,
      metalness: 0.48,
      roughness: 0.08,
      transparent: true,
      opacity: 0.74,
    });
    const interiorGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfde68a,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    const interiorSeatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.75 });
    const silhouetteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 1.6,
      roughness: 0.1,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0xdc2626,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.05,
      roughness: 0.2,
    });

    // 1. Lower Chassis & Transit Skirt (Local +Z = forward nose, both flanks have bi-parting doors!)
    const chassisApron = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.36, 10.68), darkTrimMat);
    chassisApron.position.set(0, 0.42, 0);
    pitchPivot.add(chassisApron);

    const frontNoseLower = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.72, 0.30), bodyTransitMat);
    frontNoseLower.position.set(0, 0.88, 5.20);
    pitchPivot.add(frontNoseLower);

    const rearTailLower = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.72, 0.28), bodyTransitMat);
    rearTailLower.position.set(0, 0.88, -5.20);
    pitchPivot.add(rearTailLower);

    const sideWallSegments = [
      { zMin: 4.10, zMax: 5.30 },
      { zMin: -0.10, zMax: 2.60 },
      { zMin: -5.30, zMax: -1.60 },
    ];
    [-1, 1].forEach((sideSign) => {
      sideWallSegments.forEach((seg) => {
        const len = seg.zMax - seg.zMin;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, len), bodyTransitMat);
        wall.position.set(sideSign * 1.17, 0.88, (seg.zMin + seg.zMax) * 0.5);
        pitchPivot.add(wall);

        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, len), stripeMat);
        belt.position.set(sideSign * 1.24, 1.24, (seg.zMin + seg.zMax) * 0.5);
        pitchPivot.add(belt);
      });
    });

    // Floor Deck & Illuminated Entry Stepwells on both sides
    const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(2.30, 0.10, 10.2), darkTrimMat);
    cabinFloor.position.set(0, 0.58, 0);
    pitchPivot.add(cabinFloor);

    [-1, 1].forEach((sideSign) => {
      [3.35, -0.85].forEach((dz) => {
        const stepLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 1.40), interiorGlowMat);
        stepLight.position.set(sideSign * 1.06, 0.42, dz);
        pitchPivot.add(stepLight);
      });
    });

    // 2. Interior Seats, Passenger Silhouettes & Warm Ceiling LED Bar
    for (let sz = -3.8; sz <= 2.4; sz += 1.24) {
      [-0.74, 0.74].forEach((sx) => {
        if (Math.abs(sz - 3.35) < 0.8 || Math.abs(sz + 0.85) < 0.8) return;
        const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.10), interiorSeatMat);
        seatBack.position.set(sx, 1.18, sz - 0.16);
        pitchPivot.add(seatBack);
      });
    }

    [
      [-0.72, 3.8],
      [-0.74, 1.4],
      [0.74, 0.6],
      [-0.74, -2.0],
      [0.74, -3.2],
    ].forEach(([px, pz]) => {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.22), silhouetteMat);
      torso.position.set(px, 1.32, pz);
      pitchPivot.add(torso);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.20), silhouetteMat);
      head.position.set(px, 1.66, pz);
      pitchPivot.add(head);
    });

    const cabinLightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 8.6), interiorGlowMat);
    cabinLightStrip.position.set(0, 2.58, -0.2);
    pitchPivot.add(cabinLightStrip);

    // 3. Sleek Tinted Glass Greenhouse & Window Mullions (Symmetric Left & Right)
    const sideGlassSegments = [
      { zMin: 4.10, zMax: 5.20 },
      { zMin: -0.10, zMax: 2.60 },
      { zMin: -5.18, zMax: -1.60 },
    ];
    [-1, 1].forEach((sideSign) => {
      sideGlassSegments.forEach((seg) => {
        const len = seg.zMax - seg.zMin;
        const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.16, len), busTintedGlassMat);
        glassPane.position.set(sideSign * 1.20, 1.88, (seg.zMin + seg.zMax) * 0.5);
        pitchPivot.add(glassPane);
      });
    });

    const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.24, 0.08), busTintedGlassMat);
    frontWindshield.position.set(0, 1.86, 5.24);
    frontWindshield.rotation.x = -0.09;
    pitchPivot.add(frontWindshield);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.02, 0.08), busTintedGlassMat);
    rearGlass.position.set(0, 1.88, -5.30);
    pitchPivot.add(rearGlass);

    [-1.22, 1.22].forEach((px) => {
      const frontPillar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.28, 0.14), darkTrimMat);
      frontPillar.position.set(px * 0.96, 1.86, 5.20);
      frontPillar.rotation.x = -0.09;
      pitchPivot.add(frontPillar);

      const rearPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.32, 0.24), pearlWhiteMat);
      rearPillar.position.set(px * 0.96, 1.90, -5.22);
      pitchPivot.add(rearPillar);
    });

    [-3.5, -1.6, 0.0, 1.7, 4.1].forEach((mz) => {
      [-1.21, 1.21].forEach((mx) => {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.20, 0.12), darkTrimMat);
        mullion.position.set(mx, 1.88, mz);
        pitchPivot.add(mullion);
      });
    });

    const upperCrown = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.44, 10.56), pearlWhiteMat);
    upperCrown.position.set(0, 2.70, -0.02);
    pitchPivot.add(upperCrown);

    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.10, 10.28), pearlWhiteMat);
    roofCap.position.set(0, 2.95, -0.02);
    pitchPivot.add(roofCap);

    [1.8, -1.9].forEach((hz) => {
      const hvacPod = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.22, 1.85), pearlWhiteMat);
      hvacPod.position.set(0, 3.08, hz);
      pitchPivot.add(hvacPod);

      const hvacGrille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.04, 1.32), darkTrimMat);
      hvacGrille.position.set(0, 3.19, hz);
      pitchPivot.add(hvacGrille);
    });

    // 4. Dual-Side Animated Bi-Parting Plug Doors (+X for E-W parks, -X for N-S parks)
    const makeDoorLeaf = (xPos: number, zCenter: number) => {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.84, 0.72), busTintedGlassMat);
      leaf.position.set(xPos, 1.50, zCenter);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.88, 0.08), darkTrimMat);
      leaf.add(frame);
      pitchPivot.add(leaf);
      return leaf;
    };
    const rightFrontDoorL = makeDoorLeaf(1.245, 3.35 - 0.37);
    const rightFrontDoorR = makeDoorLeaf(1.245, 3.35 + 0.37);
    const rightRearDoorL = makeDoorLeaf(1.245, -0.85 - 0.37);
    const rightRearDoorR = makeDoorLeaf(1.245, -0.85 + 0.37);

    const leftFrontDoorL = makeDoorLeaf(-1.245, 3.35 - 0.37);
    const leftFrontDoorR = makeDoorLeaf(-1.245, 3.35 + 0.37);
    const leftRearDoorL = makeDoorLeaf(-1.245, -0.85 - 0.37);
    const leftRearDoorR = makeDoorLeaf(-1.245, -0.85 + 0.37);

    // 5. High-DPI LED Destination Boards (Front, Both Sides, Rear) with Distinct Unit #01 / #02 / #03
    const createBusLedBoardTex = () => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 176;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 1024, 176);

      ctx.fillStyle = spec.signBadge;
      ctx.beginPath();
      ctx.roundRect(14, 14, 168, 148, 16);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.font = '900 94px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('25', 98, 92);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 48px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${spec.unitLabel} • 4 CÔNG VIÊN`, 214, 88);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    };
    const busLedTex = createBusLedBoardTex();
    const ledSignMat = new THREE.MeshStandardMaterial({
      map: busLedTex,
      emissive: 0xffffff,
      emissiveMap: busLedTex,
      emissiveIntensity: 1.0,
      roughness: 0.15,
    });

    const frontLedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 0.32), ledSignMat);
    frontLedSign.position.set(0, 2.66, 5.28);
    pitchPivot.add(frontLedSign);

    const sideLedSignR = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.26), ledSignMat);
    sideLedSignR.position.set(1.23, 2.66, 1.35);
    sideLedSignR.rotation.y = Math.PI / 2;
    pitchPivot.add(sideLedSignR);

    const sideLedSignL = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.26), ledSignMat);
    sideLedSignL.position.set(-1.23, 2.66, 1.35);
    sideLedSignL.rotation.y = -Math.PI / 2;
    pitchPivot.add(sideLedSignL);

    const rearLedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.24), ledSignMat);
    rearLedSign.position.set(0, 2.68, -5.32);
    rearLedSign.rotation.y = Math.PI;
    pitchPivot.add(rearLedSign);

    // 6. Wing Mirrors, Headlights, Taillights, Brake Lights, Hazards & Plates
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.06), darkTrimMat);
      arm.position.set(side * 1.30, 1.98, side > 0 ? 5.38 : 5.18);
      pitchPivot.add(arm);

      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.10), darkTrimMat);
      mirror.position.set(side * 1.38, 1.84, side > 0 ? 5.42 : 5.20);
      pitchPivot.add(mirror);

      const headlamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), headlightMat);
      headlamp.position.set(side * 0.86, 0.72, 5.34);
      pitchPivot.add(headlamp);

      const frontHazard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.08), hazardMat);
      frontHazard.position.set(side * 1.12, 0.72, 5.33);
      pitchPivot.add(frontHazard);

      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.08), taillightMat);
      taillight.position.set(side * 1.06, 1.08, -5.33);
      pitchPivot.add(taillight);

      const brakeLamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.08), brakeMat);
      brakeLamp.position.set(side * 1.06, 0.76, -5.33);
      pitchPivot.add(brakeLamp);

      const rearHazard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), hazardMat);
      rearHazard.position.set(side * 1.06, 1.44, -5.33);
      pitchPivot.add(rearHazard);
    });

    const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.24, 0.06), chromeMat);
    frontGrille.position.set(0, 0.68, 5.34);
    pitchPivot.add(frontGrille);

    const plateMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.03), plateMat);
    frontPlate.position.set(0, 0.42, 5.36);
    pitchPivot.add(frontPlate);
    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.03), plateMat);
    rearPlate.position.set(0, 0.58, -5.35);
    pitchPivot.add(rearPlate);

    // 7. 4 Heavy-Duty Rotating Transit Wheels
    const wheels: THREE.Group[] = [];
    [
      [-1.08, 3.05],
      [1.08, 3.05],
      [-1.08, -2.85],
      [1.08, -2.85],
    ].forEach(([wx, wz]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, 0.48, wz);

      const well = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.34, 18), darkTrimMat);
      well.rotation.z = Math.PI / 2;
      well.position.set(wx, 0.48, wz);
      pitchPivot.add(well);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.30, 22), tireRubberMat);
      tire.rotation.z = Math.PI / 2;
      wGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.31, 16), chromeMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      const sideSign = wx > 0 ? 1 : -1;
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.52, 0.07), darkTrimMat);
        spoke.position.x = sideSign * 0.16;
        spoke.rotation.x = (s * Math.PI) / 5;
        wGroup.add(spoke);
      }

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.33, 12), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wGroup.add(hub);

      pitchPivot.add(wGroup);
      wheels.push(wGroup);
    });

    root.visible = false;

    return {
      index,
      trafficId: `city_bus_${index}`,
      unitLabel: spec.unitLabel,
      bodyColor: spec.bodyColor,
      stripeColor: spec.stripeColor,
      root,
      pitchPivot,
      wheels,
      rightFrontDoorL,
      rightFrontDoorR,
      rightRearDoorL,
      rightRearDoorR,
      leftFrontDoorL,
      leftFrontDoorR,
      leftRearDoorL,
      leftRearDoorR,
      headlightMat,
      taillightMat,
      brakeMat,
      hazardMat,
      interiorGlowMat,
      ledSignMat,
      phase: 'idle',
      resumePhase: 'idle',
      x: -942.0,
      z: 23.25,
      laneCoord: 23.25,
      yaw: Math.PI / 2,
      speed: 0,
      prevX: -942.0,
      prevZ: 23.25,
      doorOpen: 0,
      dockDoorSide: 1,
      dockStopIdx: 0,
      dockTimer: 0,
      departWaitElapsed: 0,
      curve: null,
    };
  }

  private setRigSeated(actor: BusPassengerRig) {
    actor.hipsGroup.position.y = 0.49;
    actor.leftLeg.rotation.x = -Math.PI / 2;
    actor.rightLeg.rotation.x = -Math.PI / 2;
    actor.leftKnee.rotation.x = Math.PI / 2;
    actor.rightKnee.rotation.x = Math.PI / 2;
    actor.leftArm.rotation.x = -0.35;
    actor.rightArm.rotation.x = -0.35;
  }

  private setRigStanding(actor: BusPassengerRig) {
    actor.hipsGroup.position.y = 0.84;
    actor.leftLeg.rotation.x = 0;
    actor.rightLeg.rotation.x = 0;
    actor.leftKnee.rotation.x = 0;
    actor.rightKnee.rotation.x = 0;
    actor.leftArm.rotation.x = 0;
    actor.rightArm.rotation.x = 0;
  }

  private animateRigWalk(actor: BusPassengerRig, delta: number, speed: number) {
    actor.hipsGroup.position.y = 0.84 + Math.abs(Math.sin((actor as BusWaiterActor).walkPhase * 2)) * 0.024;
    const swing = Math.sin((actor as BusWaiterActor).walkPhase) * 0.48;
    actor.leftLeg.rotation.x = swing;
    actor.rightLeg.rotation.x = -swing;
    actor.leftKnee.rotation.x = Math.max(0, -swing * 0.55);
    actor.rightKnee.rotation.x = Math.max(0, swing * 0.55);
    actor.leftArm.rotation.x = -swing * 0.75;
    actor.rightArm.rotation.x = (actor as { glbHandle?: { hasActiveUmbrella?: () => boolean } }).glbHandle?.hasActiveUmbrella?.()
      ? -0.88
      : swing * 0.75;
    (actor as BusWaiterActor).walkPhase += delta * speed * 3.9;
  }

  private spawnWaitersForStop(st: StopRuntimeState) {
    for (const w of st.waiters) {
      if (w.state !== 'hidden' && w.state !== 'on_bus') continue;
      w.x = w.slot.x;
      w.y = 0;
      w.z = w.slot.z;
      w.boardingWpIdx = 0;
      w.boardingElapsed = 0;
      w.state = w.slot.seated ? 'waiting_seated' : 'waiting_standing';
      w.group.position.set(w.x, w.y, w.z);
      w.group.rotation.y = w.slot.rotY;
      w.group.visible = true;
      if (w.slot.seated) {
        this.setRigSeated(w);
        w.glbHandle?.setAnimState('Sit');
      } else {
        this.setRigStanding(w);
        w.glbHandle?.setAnimState('Idle');
      }
    }
  }

  private dispatchInitialStaggeredPair() {
    if (this.hasDoneInitialStagger) return;
    this.hasDoneInitialStagger = true;

    // Bus 01 starts near East side approaching Central Park Stop 1 so player sees immediate activity in front of Card Shop
    const b0 = this.buses[0];
    b0.phase = 'ew_west_to_stop1';
    b0.x = 84.0;
    b0.z = 34.75;
    b0.laneCoord = 34.75;
    b0.prevX = b0.x;
    b0.prevZ = b0.z;
    b0.yaw = -Math.PI / 2;
    b0.speed = 11.8;
    b0.doorOpen = 0;
    b0.curve = null;
    b0.root.position.set(b0.x, -0.26, b0.z);
    b0.root.rotation.y = b0.yaw;
    b0.root.visible = true;
    this.relayScheduler.markDispatched(0);

    // Bus 02 starts along the extended West Central Boulevard approaching West Green Park Stop 2
    const b1 = this.buses[1];
    b1.phase = 'ew_east_to_stop2';
    b1.x = -460.0;
    b1.z = 23.25;
    b1.laneCoord = 23.25;
    b1.prevX = b1.x;
    b1.prevZ = b1.z;
    b1.yaw = Math.PI / 2;
    b1.speed = 11.8;
    b1.doorOpen = 0;
    b1.curve = null;
    b1.root.position.set(b1.x, -0.26, b1.z);
    b1.root.rotation.y = b1.yaw;
    b1.root.visible = true;
    this.relayScheduler.markDispatched(1);
    // Bus 03 stays resting in depot until Bus 01 finishes its tour!
  }

  private dispatchBusFromWestDepot(busIndex: number) {
    const bus = this.buses[busIndex];
    if (!bus) return;
    let spawnX = -936.0;
    let spawnZ = 23.25;
    if (this.trafficCoordinator) {
      while (spawnX > CITY_ROAD_BOUNDS.westEndX) {
        if (
          this.trafficCoordinator.isZoneClear({
            id: bus.trafficId,
            x: spawnX,
            y: -0.26,
            z: 23.25,
            halfX: 6.4,
            halfZ: 1.5,
          })
        ) {
          spawnZ = 23.25;
          break;
        }
        if (
          this.trafficCoordinator.isZoneClear({
            id: bus.trafficId,
            x: spawnX,
            y: -0.26,
            z: 26.90,
            halfX: 6.4,
            halfZ: 1.5,
          })
        ) {
          spawnZ = 26.90;
          break;
        }
        spawnX -= 11.0;
      }
    }

    bus.phase = 'ew_east_to_stop2';
    bus.x = spawnX;
    bus.z = spawnZ;
    bus.laneCoord = spawnZ;
    bus.prevX = spawnX;
    bus.prevZ = spawnZ;
    bus.yaw = Math.PI / 2;
    bus.speed = 11.5;
    bus.doorOpen = 0;
    bus.departWaitElapsed = 0;
    bus.curve = null;
    bus.root.position.set(bus.x, -0.26, bus.z);
    bus.root.rotation.y = bus.yaw;
    bus.root.visible = true;
  }

  private dockBusAtStop(bus: TransitBusUnit, stopIdx: number, resumePhase: BusRoutePhase) {
    const st = this.stopStates[stopIdx];
    const spec = st.spec;
    bus.x = spec.bayX;
    bus.z = spec.bayZ;
    bus.speed = 0;
    bus.yaw = Math.atan2(spec.approachDirX, spec.approachDirZ);
    bus.root.rotation.y = bus.yaw;
    bus.phase = 'docked';
    bus.resumePhase = resumePhase;
    bus.dockStopIdx = stopIdx;
    bus.dockDoorSide = spec.doorSide;
    bus.dockTimer = 0;
    bus.departWaitElapsed = 0;

    st.dockedBusIndex = bus.index;
    st.respawnCooldown = 0;
    this.spawnWaitersForStop(st);

    for (const a of st.alighters) {
      a.state = 'waiting_to_exit';
      a.exitElapsed = 0;
      a.x = a.doorX;
      a.y = 0.08;
      a.z = a.doorZ;
      a.distanceWalked = 0;
      a.group.position.set(a.x, a.y, a.z);
      a.group.rotation.y = Math.atan2(a.targetSidewalkX - a.x, a.targetSidewalkZ - a.z);
      a.group.visible = false;
    }
  }

  private startCurve(
    bus: TransitBusUnit,
    p1x: number,
    p1z: number,
    p2x: number,
    p2z: number,
    duration: number,
    nextPhase: BusRoutePhase,
    exitLaneCoord: number
  ) {
    bus.phase = 'turning_curve';
    bus.curve = {
      p0x: bus.x,
      p0z: bus.z,
      p1x,
      p1z,
      p2x,
      p2z,
      t: 0,
      duration,
      nextPhase,
      exitLaneCoord,
    };
  }

  public syncTimeOfDay(rawHour: number, isShopOpen: boolean) {
    const anyBusActive = this.buses.some((b) => b.phase !== 'idle');
    this.scheduleTracker.syncAndCheckTrigger(rawHour, isShopOpen, !anyBusActive);

    if (!isShopOpen) {
      for (const b of this.buses) {
        b.phase = 'idle';
        b.speed = 0;
        b.root.visible = false;
        this.trafficCoordinator?.deactivateVehicle(b.trafficId);
      }
      this.relayScheduler.resetAll();
      this.hasDoneInitialStagger = false;
      for (const st of this.stopStates) {
        st.dockedBusIndex = null;
        st.respawnCooldown = 0;
        for (const w of st.waiters) {
          w.state = 'hidden';
          w.boardingWpIdx = 0;
          w.boardingElapsed = 0;
          w.group.visible = false;
        }
        for (const a of st.alighters) {
          a.state = 'hidden';
          a.exitElapsed = 0;
          a.group.visible = false;
        }
      }
    }
  }

  public getActivePose(): { active: boolean; x: number; z: number } {
    for (const b of this.buses) {
      if (b.phase !== 'idle' && b.root.visible) {
        return { active: true, x: b.x, z: b.z };
      }
    }
    return { active: false, x: 0, z: 0 };
  }

  public getActivePoses(): Array<{
    id: string;
    unitLabel: string;
    active: boolean;
    x: number;
    z: number;
    yaw: number;
  }> {
    const out: Array<{ id: string; unitLabel: string; active: boolean; x: number; z: number; yaw: number }> = [];
    for (const b of this.buses) {
      if (b.phase !== 'idle' && b.root.visible) {
        out.push({
          id: b.trafficId,
          unitLabel: b.unitLabel,
          active: true,
          x: b.x,
          z: b.z,
          yaw: b.yaw,
        });
      }
    }
    return out;
  }

  public getScheduleState() {
    const firstActive = this.buses.find((b) => b.phase !== 'idle');
    return {
      busState: firstActive ? firstActive.phase : 'idle',
      activeBusCount: this.buses.filter((b) => b.phase !== 'idle').length,
      fleetSize: this.buses.length,
      tripsCompletedToday: [...this.scheduleTracker.tripsCompletedToday] as [boolean, boolean, boolean],
      activeWaiters: this.stopStates.reduce(
        (acc, st) => acc + st.waiters.filter((w) => w.group.visible).length,
        0
      ),
    };
  }

  private queryForwardAndCruiseEW(
    bus: TransitBusUnit,
    dirX: 1 | -1,
    lanes: readonly [number, number],
    allowSwitch: boolean,
    preferLane?: number
  ): { speedFactor: number; targetZ: number; braking: boolean } {
    let factor = 1;
    let targetZ = bus.z;
    let braking = false;

    if (this.trafficCoordinator) {
      const pick = this.trafficCoordinator.pickBestCruiseLane({
        id: bus.trafficId,
        x: bus.x,
        y: -0.26,
        currentZ: bus.z,
        laneZ: bus.laneCoord,
        moveDirX: dirX,
        lanes,
        halfW: 1.24,
        halfL: 5.38,
        lookahead: 14.0,
        minGap: 2.4,
        priority: 40,
        allowSwitch,
        preferLane,
      });
      if (pick.switched) {
        bus.laneCoord = pick.targetZ;
      }
      targetZ = pick.targetZ;
      factor *= pick.clearance.maxSpeedFactor;
      if (pick.clearance.maxSpeedFactor < 0.75) braking = true;
    }

    const sigFactor = computeBoulevardSignalFactor({
      x: bus.x,
      halfL: 5.38,
      moveDirX: dirX,
      getWestSignal: this.getWestSignal,
      getEastSignal: this.getEastSignal,
      coordinator: this.trafficCoordinator,
      vehicleId: bus.trafficId,
    });
    if (sigFactor < 1.0) {
      factor = Math.min(factor, sigFactor);
      if (sigFactor < 0.75) braking = true;
    }

    return { speedFactor: factor, targetZ, braking };
  }

  private queryForwardNS(bus: TransitBusUnit, dirZ: 1 | -1, ignoreSignals = false): { speedFactor: number; braking: boolean } {
    let factor = 1;
    let braking = false;

    if (this.trafficCoordinator) {
      const clr = this.trafficCoordinator.getForwardClearance({
        id: bus.trafficId,
        x: bus.x,
        y: -0.26,
        z: bus.z,
        moveDirX: 0,
        moveDirZ: dirZ,
        halfW: 1.24,
        halfL: 5.38,
        lookahead: 14.0,
        minGap: 2.5,
        priority: 40,
      });
      factor *= clr.blocked ? 0 : clr.maxSpeedFactor;
      if (clr.maxSpeedFactor < 0.75) braking = true;
    }

    if (!ignoreSignals) {
      const sigEast = computeNorthSouthSignalFactor({
        z: bus.z,
        halfL: 5.38,
        moveDirZ: dirZ,
        centerX: EAST_INTERSECTION_CENTER_X,
        getSignal: this.getEastSignal,
        coordinator: this.trafficCoordinator,
        vehicleId: bus.trafficId,
      });
      factor = Math.min(factor, sigEast);
      if (sigEast < 0.75) braking = true;
    }

    return { speedFactor: factor, braking };
  }

  private updateSingleBus(bus: TransitBusUnit, delta: number, nowSec: number, lampFactor: number) {
    if (bus.phase === 'idle') {
      this.trafficCoordinator?.deactivateVehicle(bus.trafficId);
      return;
    }

    const blinkOn = Math.floor(nowSec * 2.4) % 2 === 0;
    let isBraking = false;
    let isHazardOn = false;
    const cruiseBase = 12.2;

    if (bus.phase === 'ew_east_to_stop2') {
      const stop = PARK_BUS_STOPS[1]; // Stop 2: West Green Park (bayX = -162.5, bayZ = 22.65)
      const dist = Math.max(0, stop.bayX - bus.x);
      let targetSpd = dist > 18.0 ? cruiseBase : Math.max(1.35, dist * 0.68);
      if (dist <= 18.0) isBraking = true;

      const q = this.queryForwardAndCruiseEW(
        bus,
        1,
        [23.25, 26.90],
        dist > 26.0 && (bus.x < WEST_INTERSECTION_EW_STOP_X - 6.0 || bus.x > WEST_INTERSECTION_CENTER_X + 18.0),
        dist < 42.0 ? 23.25 : undefined
      );
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.2)));
      bus.x = Math.min(stop.bayX, bus.x + bus.speed * delta);

      const pullStartX = stop.bayX - 18.0;
      if (bus.x >= pullStartX) {
        const pullT = THREE.MathUtils.clamp((bus.x - pullStartX) / 18.0, 0, 1);
        const s = pullT * pullT * (3 - 2 * pullT);
        bus.z = THREE.MathUtils.lerp(bus.z, stop.bayZ, Math.min(1, delta * 3.5 + s * 0.25));
      } else {
        bus.z = THREE.MathUtils.lerp(bus.z, q.targetZ, Math.min(1, delta * 2.8));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.x >= stop.bayX - 0.06) {
        this.dockBusAtStop(bus, 1, 'ew_east_to_east_int');
      }
    } else if (bus.phase === 'ew_east_to_east_int') {
      const turnEntryX = 180.2;
      const dist = Math.max(0, turnEntryX - bus.x);
      const mergeStartX = PARK_BUS_STOPS[1].bayX + 2.5;
      const mergeDone = bus.x >= mergeStartX + 12.0;

      let targetSpd = dist < 12.0 ? 7.8 : cruiseBase;
      const q = this.queryForwardAndCruiseEW(
        bus,
        1,
        [23.25, 26.90],
        mergeDone && dist > 28.0 && bus.x < 168.0,
        dist < 45.0 ? 23.25 : undefined
      );
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.0)));
      bus.x = Math.min(turnEntryX, bus.x + bus.speed * delta);

      if (!mergeDone) {
        const mergeT = THREE.MathUtils.clamp((bus.x - mergeStartX) / 12.0, 0, 1);
        bus.z = THREE.MathUtils.lerp(PARK_BUS_STOPS[1].bayZ, 23.25, mergeT * mergeT * (3 - 2 * mergeT));
        bus.laneCoord = 23.25;
      } else {
        bus.z = THREE.MathUtils.lerp(bus.z, q.targetZ, Math.min(1, delta * 2.8));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.x >= EAST_INTERSECTION_EB_STOP_X - 0.4) {
        const ewGreen = !this.getEastSignal || this.getEastSignal().ewPhase === 'green';
        const boxClear =
          !this.trafficCoordinator ||
          this.trafficCoordinator.isZoneClear({
            id: bus.trafficId,
            x: 187.4,
            y: -0.26,
            z: 44.0,
            halfX: 2.0,
            halfZ: 7.0,
          });
        if (ewGreen && boxClear) {
          this.startCurve(bus, 187.4, bus.z, 187.4, 41.5, 2.3, 'ns_south_to_vh_turn', 187.4);
        }
      }
    } else if (bus.phase === 'turning_curve' && bus.curve) {
      const c = bus.curve;
      c.t = Math.min(1, c.t + delta / Math.max(0.4, c.duration));
      const u = c.t;
      const mu = 1 - u;
      const nx = mu * mu * c.p0x + 2 * mu * u * c.p1x + u * u * c.p2x;
      const nz = mu * mu * c.p0z + 2 * mu * u * c.p1z + u * u * c.p2z;
      const dx = nx - bus.x;
      const dz = nz - bus.z;
      bus.x = nx;
      bus.z = nz;
      bus.speed = Math.hypot(dx, dz) / Math.max(delta, 0.001);
      if (Math.hypot(dx, dz) > 0.0008) {
        bus.yaw = Math.atan2(dx, dz);
      }
      if (c.t >= 1) {
        bus.laneCoord = c.exitLaneCoord;
        bus.phase = c.nextPhase;
        bus.curve = null;
      }
    } else if (bus.phase === 'ns_south_to_vh_turn') {
      const uTurnEntryZ = 141.5;
      const dist = Math.max(0, uTurnEntryZ - bus.z);
      let targetSpd = dist < 12.0 ? 7.5 : 11.4;
      const q = this.queryForwardNS(bus, 1, true);
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      if (bus.z >= 134.0 && this.getVinhomesSignal) {
        const nsGreen = (this.getVinhomesSignal().nsPhase ?? 'green') === 'green';
        if (!nsGreen && !this.trafficCoordinator?.isJamBypassActive(bus.trafficId)) {
          targetSpd = 0;
          isBraking = true;
        }
      }

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.0)));
      bus.z = Math.min(uTurnEntryZ, bus.z + bus.speed * delta);
      bus.x = THREE.MathUtils.lerp(bus.x, 187.4, Math.min(1, delta * 3.5));
      bus.yaw = 0;

      if (bus.z >= uTurnEntryZ - 0.3) {
        const oppClear =
          !this.trafficCoordinator ||
          this.trafficCoordinator.isZoneClear({
            id: bus.trafficId,
            x: 199.6,
            y: -0.26,
            z: 141.0,
            halfX: 2.2,
            halfZ: 7.5,
          });
        if (oppClear || this.trafficCoordinator?.isJamBypassActive(bus.trafficId)) {
          this.startCurve(bus, 193.5, 155.0, 199.6, 138.5, 2.5, 'ns_north_to_stop4', 199.6);
        }
      }
    } else if (bus.phase === 'ns_north_to_stop4') {
      const stop = PARK_BUS_STOPS[2]; // Stop 4: Hotel Green Park (bayX = 200.25, bayZ = 104.5)
      const dist = Math.max(0, bus.z - stop.bayZ);
      let targetSpd = dist > 16.0 ? 11.4 : Math.max(1.35, dist * 0.68);
      if (dist <= 16.0) isBraking = true;

      const q = this.queryForwardNS(bus, -1, true);
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.2)));
      bus.z = Math.max(stop.bayZ, bus.z - bus.speed * delta);

      const pullStartZ = stop.bayZ + 14.0;
      if (bus.z <= pullStartZ) {
        const pullT = THREE.MathUtils.clamp((pullStartZ - bus.z) / 14.0, 0, 1);
        bus.x = THREE.MathUtils.lerp(bus.x, stop.bayX, Math.min(1, delta * 3.5 + pullT * 0.25));
      } else {
        bus.x = THREE.MathUtils.lerp(bus.x, 199.6, Math.min(1, delta * 3.0));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.z <= stop.bayZ + 0.06) {
        this.dockBusAtStop(bus, 2, 'ns_north_to_east_int');
      }
    } else if (bus.phase === 'ns_north_to_east_int') {
      const mergeStartZ = PARK_BUS_STOPS[2].bayZ - 2.0;
      const mergeDone = bus.z <= mergeStartZ - 10.0;
      let targetSpd = 11.4;
      const q = this.queryForwardNS(bus, -1, false);
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.0)));
      bus.z -= bus.speed * delta;

      if (!mergeDone) {
        const mt = THREE.MathUtils.clamp((mergeStartZ - bus.z) / 10.0, 0, 1);
        bus.x = THREE.MathUtils.lerp(PARK_BUS_STOPS[2].bayX, 199.6, mt * mt * (3 - 2 * mt));
      } else {
        bus.x = THREE.MathUtils.lerp(bus.x, 199.6, Math.min(1, delta * 3.0));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.z <= 29.0) {
        bus.phase = 'ns_north_to_stop3';
      }
    } else if (bus.phase === 'ns_north_to_stop3') {
      const stop = PARK_BUS_STOPS[3]; // Stop 3: Công Viên Sông Hàn Bắc (bayX = 200.25, bayZ = -96.5)
      const dist = Math.max(0, bus.z - stop.bayZ);
      let targetSpd = dist > 16.0 ? 11.4 : Math.max(1.35, dist * 0.68);
      if (dist <= 16.0) isBraking = true;

      const q = this.queryForwardNS(bus, -1, true);
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.2)));
      bus.z = Math.max(stop.bayZ, bus.z - bus.speed * delta);

      const pullStartZ = stop.bayZ + 14.0;
      if (bus.z <= pullStartZ) {
        const pullT = THREE.MathUtils.clamp((pullStartZ - bus.z) / 14.0, 0, 1);
        bus.x = THREE.MathUtils.lerp(bus.x, stop.bayX, Math.min(1, delta * 3.5 + pullT * 0.25));
      } else {
        bus.x = THREE.MathUtils.lerp(bus.x, 199.6, Math.min(1, delta * 3.0));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.z <= stop.bayZ + 0.06) {
        this.dockBusAtStop(bus, 3, 'ns_north_to_bd_turn');
      }
    } else if (bus.phase === 'ns_north_to_bd_turn') {
      const mergeStartZ = PARK_BUS_STOPS[3].bayZ - 1.5;
      const mergeDone = bus.z <= mergeStartZ - 7.0;
      const bdEntryZ = -111.5;
      let targetSpd = 8.4;
      const q = this.queryForwardNS(bus, -1, true);
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.0)));
      bus.z = Math.max(bdEntryZ, bus.z - bus.speed * delta);
      if (!mergeDone) {
        const mt = THREE.MathUtils.clamp((mergeStartZ - bus.z) / 7.0, 0, 1);
        bus.x = THREE.MathUtils.lerp(PARK_BUS_STOPS[3].bayX, 199.6, mt * mt * (3 - 2 * mt));
      } else {
        bus.x = THREE.MathUtils.lerp(bus.x, 199.6, Math.min(1, delta * 3.0));
      }
      bus.yaw = Math.PI;

      if (bus.z <= bdEntryZ + 0.3) {
        this.startCurve(bus, 193.5, -123.5, 187.4, -110.5, 2.3, 'ns_south_to_east_turn', 187.4);
      }
    } else if (bus.phase === 'ns_south_to_east_turn') {
      const turnEntryZ = 15.8;
      const dist = Math.max(0, turnEntryZ - bus.z);
      let targetSpd = dist < 12.0 ? 7.8 : 11.4;
      const q = this.queryForwardNS(bus, 1, false);
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.0)));
      bus.z = Math.min(turnEntryZ, bus.z + bus.speed * delta);
      bus.x = THREE.MathUtils.lerp(bus.x, 187.4, Math.min(1, delta * 3.2));
      bus.yaw = 0;

      if (bus.z >= CITY_ROAD_BOUNDS.nsStopNorthZ - 0.5) {
        const nsGreen = !this.getEastSignal || (this.getEastSignal().nsPhase ?? 'green') === 'green';
        const exitClear =
          !this.trafficCoordinator ||
          this.trafficCoordinator.isZoneClear({
            id: bus.trafficId,
            x: 175.0,
            y: -0.26,
            z: 34.75,
            halfX: 7.5,
            halfZ: 2.0,
          });
        if ((nsGreen && exitClear) || this.trafficCoordinator?.isJamBypassActive(bus.trafficId)) {
          this.startCurve(bus, 187.4, 34.75, 177.5, 34.75, 2.3, 'ew_west_to_stop1', 34.75);
        }
      }
    } else if (bus.phase === 'ew_west_to_stop1') {
      const stop = PARK_BUS_STOPS[0]; // Stop 1: Central Green Park (bayX = 27.0, bayZ = 35.35)
      const dist = Math.max(0, bus.x - stop.bayX);
      let targetSpd = dist > 18.0 ? cruiseBase : Math.max(1.35, dist * 0.68);
      if (dist <= 18.0) isBraking = true;

      const q = this.queryForwardAndCruiseEW(
        bus,
        -1,
        [31.10, 34.75],
        dist > 26.0 && (bus.x > 214.0 || bus.x < 170.0),
        dist < 42.0 ? 34.75 : undefined
      );
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 3.2)));
      bus.x = Math.max(stop.bayX, bus.x - bus.speed * delta);

      const pullStartX = stop.bayX + 18.0;
      if (bus.x <= pullStartX) {
        const pullT = THREE.MathUtils.clamp((pullStartX - bus.x) / 18.0, 0, 1);
        const s = pullT * pullT * (3 - 2 * pullT);
        bus.z = THREE.MathUtils.lerp(bus.z, stop.bayZ, Math.min(1, delta * 3.5 + s * 0.25));
      } else {
        bus.z = THREE.MathUtils.lerp(bus.z, q.targetZ, Math.min(1, delta * 2.8));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.x <= stop.bayX + 0.06) {
        this.dockBusAtStop(bus, 0, 'ew_west_to_depot');
      }
    } else if (bus.phase === 'docked') {
      isBraking = true;
      isHazardOn = true;
      bus.speed = 0;
      bus.dockTimer += delta;

      const st = this.stopStates[bus.dockStopIdx];
      // Safety cap at 13.5s so extreme frame hitches can never deadlock a bus or passenger at a stop
      if (bus.dockTimer >= 13.5 && st) {
        for (const a of st.alighters) {
          if (a.state === 'waiting_to_exit' || a.state === 'exiting_bus') {
            a.x = a.targetSidewalkX;
            a.y = 0;
            a.z = a.targetSidewalkZ;
            a.state = 'walking_away';
            a.group.position.set(a.x, a.y, a.z);
            a.group.rotation.y = Math.atan2(a.walkDirX, a.walkDirZ);
            this.setRigStanding(a);
            a.glbHandle?.setAnimState('Walk');
            a.group.visible = true;
          }
        }
        for (const w of st.waiters) {
          if (w.state === 'waiting_seated' || w.state === 'waiting_standing' || w.state === 'boarding') {
            w.state = 'on_bus';
            w.group.visible = false;
          }
        }
      }

      const anyStillExiting = st
        ? st.alighters.some((a) => a.state === 'waiting_to_exit' || a.state === 'exiting_bus')
        : false;
      const anyStillBoarding = st ? st.waiters.some((w) => w.state === 'boarding') : false;
      const allWaitersTriggered = st
        ? st.waiters.every((w) => w.state === 'on_bus' || w.state === 'hidden' || w.state === 'boarding')
        : true;
      const shouldCloseDoors =
        (bus.dockTimer >= 7.6 && allWaitersTriggered && !anyStillBoarding && !anyStillExiting) ||
        bus.dockTimer >= 13.5;

      const targetDoor = shouldCloseDoors ? 0 : 1;
      bus.doorOpen = THREE.MathUtils.damp(bus.doorOpen, targetDoor, 6.5, delta);

      if (bus.dockTimer >= 1.15 && bus.doorOpen > 0.5 && !shouldCloseDoors && st) {
        for (let i = 0; i < st.waiters.length; i++) {
          const w = st.waiters[i];
          if (
            (w.state === 'waiting_seated' || w.state === 'waiting_standing') &&
            bus.dockTimer >= 1.15 + i * 0.65
          ) {
            w.state = 'boarding';
            w.boardingWpIdx = 0;
            w.boardingElapsed = 0;
            this.setRigStanding(w);
            w.glbHandle?.setAnimState('Walk');
          }
        }
      }

      if (shouldCloseDoors && !anyStillBoarding && !anyStillExiting && bus.doorOpen < 0.04) {
        bus.doorOpen = 0;
        bus.departWaitElapsed += delta;
        const spec = st.spec;
        const checkAheadX = spec.bayX + spec.approachDirX * 8.0;
        const checkAheadZ = spec.bayZ + spec.approachDirZ * 8.0;
        const mergeClear =
          !this.trafficCoordinator ||
          bus.departWaitElapsed > 4.0 ||
          this.trafficCoordinator.isZoneClear({
            id: bus.trafficId,
            x: checkAheadX,
            y: -0.26,
            z: checkAheadZ,
            halfX: spec.approachDirX !== 0 ? 8.0 : 2.0,
            halfZ: spec.approachDirZ !== 0 ? 8.0 : 2.0,
          });
        if (mergeClear) {
          st.dockedBusIndex = null;
          st.respawnCooldown = 14.0;
          bus.phase = bus.resumePhase;
        }
      }
    } else if (bus.phase === 'ew_west_to_depot') {
      bus.doorOpen = 0;
      const mergeStartX = PARK_BUS_STOPS[0].bayX - 2.5;
      const mergeDone = bus.x <= mergeStartX - 12.0;
      let targetSpd = 12.6;

      const q = this.queryForwardAndCruiseEW(
        bus,
        -1,
        [34.75, 31.10],
        mergeDone && (bus.x > WEST_INTERSECTION_WB_STOP_X + 8.0 || bus.x < WEST_INTERSECTION_CENTER_X - 20.0)
      );
      targetSpd *= q.speedFactor;
      if (q.braking) isBraking = true;

      bus.speed = THREE.MathUtils.lerp(bus.speed, targetSpd, Math.min(1, delta * (targetSpd < 0.2 ? 6.0 : 2.8)));
      bus.x -= bus.speed * delta;

      if (!mergeDone) {
        const mt = THREE.MathUtils.clamp((mergeStartX - bus.x) / 12.0, 0, 1);
        bus.z = THREE.MathUtils.lerp(PARK_BUS_STOPS[0].bayZ, 34.75, mt * mt * (3 - 2 * mt));
        bus.laneCoord = 34.75;
      } else {
        bus.z = THREE.MathUtils.lerp(bus.z, q.targetZ, Math.min(1, delta * 2.8));
      }

      const mdx = bus.x - bus.prevX;
      const mdz = bus.z - bus.prevZ;
      if (Math.hypot(mdx, mdz) > 0.0005) bus.yaw = Math.atan2(mdx, mdz);

      if (bus.x < CITY_ROAD_BOUNDS.westEndX) {
        bus.phase = 'idle';
        bus.speed = 0;
        bus.root.visible = false;
        this.trafficCoordinator?.deactivateVehicle(bus.trafficId);
        this.relayScheduler.markFinished(bus.index);
        return;
      }
    }

    // Apply transforms, wheel spin, active flank door slide, pitch, lighting, and coordinator registration
    const stepDist = Math.hypot(bus.x - bus.prevX, bus.z - bus.prevZ);
    bus.prevX = bus.x;
    bus.prevZ = bus.z;

    bus.root.position.set(bus.x, -0.26, bus.z);
    bus.root.rotation.y = bus.yaw;

    if (this.trafficCoordinator) {
      this.trafficCoordinator.updateVehicle({
        id: bus.trafficId,
        kind: 'bus',
        x: bus.x,
        y: -0.26,
        z: bus.z,
        fwdX: Math.sin(bus.yaw),
        fwdZ: Math.cos(bus.yaw),
        halfW: 1.24,
        halfL: 5.38,
        speed: bus.speed,
        isStoppedOrParked: bus.phase === 'docked',
        priority: 40,
        active: bus.root.visible,
      });
    }

    bus.pitchPivot.rotation.x = isBraking
      ? 0.012
      : bus.phase === 'docked'
        ? Math.sin(nowSec * 14) * 0.001
        : -0.006;

    if (stepDist > 0.0001) {
      const wheelSpin = stepDist / 0.48;
      for (const w of bus.wheels) {
        w.rotation.x += wheelSpin;
      }
    }

    const rSlide = bus.dockDoorSide === 1 ? bus.doorOpen * 0.56 : 0;
    const lSlide = bus.dockDoorSide === -1 ? bus.doorOpen * 0.56 : 0;
    bus.rightFrontDoorL.position.z = 3.35 - 0.37 - rSlide;
    bus.rightFrontDoorR.position.z = 3.35 + 0.37 + rSlide;
    bus.rightRearDoorL.position.z = -0.85 - 0.37 - rSlide;
    bus.rightRearDoorR.position.z = -0.85 + 0.37 + rSlide;

    bus.leftFrontDoorL.position.z = 3.35 - 0.37 - lSlide;
    bus.leftFrontDoorR.position.z = 3.35 + 0.37 + lSlide;
    bus.leftRearDoorL.position.z = -0.85 - 0.37 - lSlide;
    bus.leftRearDoorR.position.z = -0.85 + 0.37 + lSlide;

    bus.headlightMat.emissiveIntensity = 1.4 + lampFactor * 1.6;
    bus.taillightMat.emissiveIntensity = 0.8 + lampFactor * 0.7;
    bus.brakeMat.emissiveIntensity = isBraking ? 2.1 : 0.25 + lampFactor * 0.35;
    bus.hazardMat.emissiveIntensity = isHazardOn ? (blinkOn ? 2.3 : 0.08) : 0.04;
    bus.interiorGlowMat.emissiveIntensity = 0.55 + lampFactor * 0.65;
    bus.ledSignMat.emissiveIntensity = 0.85 + lampFactor * 0.55;
  }

  private updateStopPassengers(st: StopRuntimeState, delta: number, nowSec: number) {
    if (st.dockedBusIndex === null && st.respawnCooldown > 0) {
      st.respawnCooldown -= delta;
      if (st.respawnCooldown <= 0) {
        this.spawnWaitersForStop(st);
      }
    }

    const dockedBus = st.dockedBusIndex !== null ? this.buses[st.dockedBusIndex] : null;

    for (const w of st.waiters) {
      if (!w.group.visible) continue;
      if (w.state === 'waiting_seated') {
        w.headGroup.rotation.y = Math.sin(nowSec * 0.7 + w.phaseOffset) * 0.22 - 0.2;
      } else if (w.state === 'waiting_standing') {
        w.headGroup.rotation.y = Math.sin(nowSec * 0.85 + w.phaseOffset) * 0.28 - 0.15;
      } else if (w.state === 'boarding') {
        w.boardingElapsed += delta;
        if (w.boardingElapsed >= 12.0 || w.boardingWpIdx >= w.boardingWaypoints.length) {
          w.state = 'on_bus';
          w.group.visible = false;
          continue;
        }

        let remaining = w.speed * delta;
        while (remaining > 0.0001 && w.boardingWpIdx < w.boardingWaypoints.length) {
          const wp = w.boardingWaypoints[w.boardingWpIdx];
          const dx = wp.x - w.x;
          const dz = wp.z - w.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= remaining + 0.04) {
            w.x = wp.x;
            w.z = wp.z;
            if (dist > 0.001) {
              w.group.rotation.y = Math.atan2(dx, dz);
            }
            remaining = Math.max(0, remaining - dist);
            w.boardingWpIdx++;
            if (w.boardingWpIdx >= w.boardingWaypoints.length) {
              w.state = 'on_bus';
              w.group.visible = false;
              break;
            }
          } else {
            w.x += (dx / dist) * remaining;
            w.z += (dz / dist) * remaining;
            w.group.rotation.y = Math.atan2(dx, dz);
            remaining = 0;
          }
        }

        if (w.state === 'boarding') {
          const curWp = w.boardingWaypoints[w.boardingWpIdx];
          if (curWp && curWp.stepY && curWp.stepY > 0) {
            const dDoor = Math.hypot(curWp.x - w.x, curWp.z - w.z);
            w.y = THREE.MathUtils.lerp(0, curWp.stepY, THREE.MathUtils.clamp(1 - dDoor / 0.95, 0, 1));
          } else {
            w.y = 0;
          }
          w.group.position.set(w.x, w.y, w.z);
          this.animateRigWalk(w, delta, w.speed);
        }
      }
    }

    for (const a of st.alighters) {
      if (a.state === 'waiting_to_exit') {
        if (!dockedBus || dockedBus.phase !== 'docked') {
          a.state = 'hidden';
          a.group.visible = false;
          continue;
        }
        a.exitElapsed += delta;
        if (a.exitElapsed >= a.exitDelay && dockedBus.doorOpen >= 0.45) {
          a.state = 'exiting_bus';
          a.x = a.doorX;
          a.y = 0.08;
          a.z = a.doorZ;
          a.group.position.set(a.x, a.y, a.z);
          a.group.rotation.y = Math.atan2(a.targetSidewalkX - a.x, a.targetSidewalkZ - a.z);
          this.setRigStanding(a);
          a.glbHandle?.setAnimState('Walk');
          a.group.visible = true;
        }
        continue;
      }

      if (!a.group.visible) continue;
      if (a.state === 'exiting_bus') {
        const dx = a.targetSidewalkX - a.x;
        const dz = a.targetSidewalkZ - a.z;
        const dist = Math.hypot(dx, dz);
        const step = a.speed * delta;
        if (dist <= step + 0.05) {
          a.x = a.targetSidewalkX;
          a.z = a.targetSidewalkZ;
          a.y = 0;
          a.state = 'walking_away';
          a.group.position.set(a.x, a.y, a.z);
          a.group.rotation.y = Math.atan2(a.walkDirX, a.walkDirZ);
        } else {
          a.x += (dx / dist) * step;
          a.z += (dz / dist) * step;
          a.group.rotation.y = Math.atan2(dx, dz);
          a.y = THREE.MathUtils.lerp(0.08, 0, THREE.MathUtils.clamp(1 - dist / 0.95, 0, 1));
          a.group.position.set(a.x, a.y, a.z);
          this.animateRigWalk(a, delta, a.speed);
        }
      } else if (a.state === 'walking_away') {
        const step = a.speed * delta;
        a.x += a.walkDirX * step;
        a.z += a.walkDirZ * step;
        a.distanceWalked += step;
        a.group.position.set(a.x, 0, a.z);
        this.animateRigWalk(a, delta, a.speed);
        if (a.distanceWalked >= 22.0) {
          a.state = 'hidden';
          a.group.visible = false;
        }
      }
    }
  }

  public update(delta: number, rawHour: number, lampFactor: number, isShopOpen: boolean) {
    const dt = Math.min(Math.max(delta, 0), 0.1);
    this.syncTimeOfDay(rawHour, isShopOpen);
    if (!isShopOpen) return;

    if (!this.hasDoneInitialStagger) {
      this.dispatchInitialStaggeredPair();
    }

    const nextBusIdx = this.relayScheduler.step(dt, isShopOpen);
    if (nextBusIdx !== null && this.buses[nextBusIdx]?.phase === 'idle') {
      this.dispatchBusFromWestDepot(nextBusIdx);
    }

    const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

    for (let i = 0; i < this.buses.length; i++) {
      this.updateSingleBus(this.buses[i], dt, nowSec, lampFactor);
    }

    for (let s = 0; s < this.stopStates.length; s++) {
      this.updateStopPassengers(this.stopStates[s], dt, nowSec);
    }
  }
}
