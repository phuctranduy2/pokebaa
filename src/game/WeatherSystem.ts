import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CITY_BUILDINGS, CITY_ROADS } from './cityMapData';

export type WeatherMode = 'clear' | 'rain';

export interface WeatherScheduleState {
  weatherMode: WeatherMode;
  minutesUntilRoll: number;
  rainIntensityLevel: number;
}

const OPEN_AIR_ARENA_ID = 'ron_football';
// Inside ron_football footprint (-207..-148, Z 42.5..82.5), only the Pro-Shop (-163..-148, Z 42.5..78.5) has a roof.
const FOOTBALL_PRO_SHOP_ROOF = {
  minX: -163.0,
  maxX: -148.0,
  minZ: 42.5,
  maxZ: 78.5,
};

interface RoofBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Mixed-use or open-plaza city plots where sidewalks, courtyards, bridges, or patios are open-air
const MIXED_ROOFED_SUBBOXES: Readonly<Record<string, readonly RoofBox[]>> = {
  // Completely open-air pedestrian pier & Love Bridge
  north_bank_love_bridge: [],
  // Open-air Night Market Dining Plaza & EV Pickup Loop; only clinic wing, 4 kiosks, and EV scooter canopy are roofed
  hospital_night_hub: [
    { minX: -340.0, maxX: -302.5, minZ: -15.8, maxZ: 6.2 },
    { minX: -297.2, maxX: -291.6, minZ: -15.8, maxZ: -9.6 },
    { minX: -289.3, maxX: -283.7, minZ: -15.8, maxZ: -9.6 },
    { minX: -281.3, maxX: -275.7, minZ: -15.8, maxZ: -9.6 },
    { minX: -273.3, maxX: -267.7, minZ: -15.8, maxZ: -9.6 },
    { minX: -263.4, maxX: -243.4, minZ: -16.2, maxZ: -3.8 },
  ],
  // Open-air bicycle/motorbike parking forecourt (Z 5.4..15.6); 2-story Cyber Stadium hall sits at Z = -16.2..5.4
  cyber_stadium: [{ minX: -360.8, maxX: -343.2, minZ: -16.2, maxZ: 5.4 }],
  // Open-air front gate plaza, central school courtyard, and rear yard; only classroom wings & gym hall have roofs
  phan_chau_trinh: [
    { minX: -357.5, maxX: -308.5, minZ: 55.2, maxZ: 66.5 },
    { minX: -357.5, maxX: -348.5, minZ: 66.5, maxZ: 103.2 },
    { minX: -317.5, maxX: -308.5, minZ: 66.5, maxZ: 103.2 },
    { minX: -357.5, maxX: -308.5, minZ: 103.2, maxZ: 115.6 },
    { minX: -348.0, maxX: -318.0, minZ: 136.0, maxZ: 147.0 },
  ],
  // Front forecourt driveway (Z 42.5..55.0) is open-air; main 5-story hospital sits behind Z = 55.0
  hospital: [{ minX: -296.0, maxX: -246.0, minZ: 55.0, maxZ: 90.0 }],
  // Forecourt sidewalk terrace (Z < 48.0) is open-air
  peri_pool: [{ minX: 236.5, maxX: 270.5, minZ: 48.0, maxZ: 67.0 }],
  // Outdoor Phố Đi Bộ dining patio (X 207..211.15) is open-air; awning + hall starts at X = 211.15
  khoi_garden: [{ minX: 211.15, maxX: 235.8, minZ: -39.8, maxZ: -12.2 }],
  // Front EV charging plaza walkway (Z < 52.0) is open-air; glass showroom begins at Z = 52.0
  vinfast_showroom: [{ minX: -50.0, maxX: -20.0, minZ: 52.0, maxZ: 90.0 }],
  // Forecourt apron (Z < 47.8) is open-air; covered charging hall spans Z = 47.8..94.0
  vgreen_garage: [{ minX: -74.0, maxX: -50.0, minZ: 47.8, maxZ: 94.0 }],
  // Front arrival plaza (Z < -88.0) is open-air; luxury podium spans Z = -88.0..-53.3
  casa_riva: [{ minX: 256.3, maxX: 311.7, minZ: -88.0, maxZ: -53.3 }],
  // FAHASA Bookstore & Hobby Manga: main 2-story building roofed at X=-391.6..-364.4, Z=48.0..88.0
  fahasa_bookstore: [{ minX: -391.6, maxX: -364.4, minZ: 48.0, maxZ: 88.0 }],
  // Phố Ăn Vặt Cổng Trường: open-air cobblestone promenade; only the 4 kiosks have awnings/roofs
  school_snack_alley: [
    { minX: -424.2, maxX: -418.0, minZ: 48.8, maxZ: 58.2 },
    { minX: -424.2, maxX: -418.0, minZ: 64.8, maxZ: 74.2 },
    { minX: -402.0, maxX: -395.8, minZ: 48.8, maxZ: 58.2 },
    { minX: -402.0, maxX: -395.8, minZ: 64.8, maxZ: 74.2 },
  ],
  // Open-air 3x3 Basketball Court & Youth Skatepark
  youth_basketball_park: [],
};

function isInsideBoxWithMargin(x: number, z: number, box: RoofBox, margin: number): boolean {
  return (
    x >= box.minX + margin &&
    x <= box.maxX - margin &&
    z >= box.minZ + margin &&
    z <= box.maxZ - margin
  );
}

/**
 * Checks whether world coordinate (x, z) sits underneath a roofed building footprint.
 * Prevents falling rain streaks and ground ripples from clipping inside the Pokémon Card Shop or any city building,
 * while still allowing open-air areas (sidewalks, streets, parks, Han River, bridges, courtyards, football turf pitches) to get rained on.
 */
export function isPointInsideRoofedBuilding(x: number, z: number): boolean {
  // Nhà Văn Hóa Tổ Dân Phố Số 4 Hall (X = -379.8..-362.2, Z = -54.0..-38.0); front yard (-38.0..-26.0) stays open-air
  if (x >= -379.7 && x <= -362.3 && z >= -53.9 && z <= -38.1) {
    return true;
  }
  for (let i = 0; i < CITY_BUILDINGS.length; i++) {
    const b = CITY_BUILDINGS[i];
    if (b.id === OPEN_AIR_ARENA_ID) {
      if (isInsideBoxWithMargin(x, z, FOOTBALL_PRO_SHOP_ROOF, 0.15)) {
        return true;
      }
      continue;
    }
    const subBoxes = MIXED_ROOFED_SUBBOXES[b.id];
    if (subBoxes !== undefined) {
      for (let s = 0; s < subBoxes.length; s++) {
        if (isInsideBoxWithMargin(x, z, subBoxes[s], 0.12)) {
          return true;
        }
      }
      continue;
    }
    if (isInsideBoxWithMargin(x, z, b, 0.12)) {
      return true;
    }
  }
  return false;
}

/**
 * Determines whether an NPC should open and carry an umbrella in the rain:
 * active whenever it is raining, the NPC is outdoors (outside any roofed building footprint),
 * and the NPC is actively walking (Walk / WalkBasket / CarryWalk).
 */
export function shouldNpcCarryRainUmbrella(
  isRaining: boolean,
  allowRainUmbrella: boolean,
  animState: string,
  worldX: number,
  worldZ: number
): boolean {
  if (!isRaining || !allowRainUmbrella) return false;
  if (animState !== 'Walk' && animState !== 'WalkBasket' && animState !== 'CarryWalk') {
    return false;
  }
  return !isPointInsideRoofedBuilding(worldX, worldZ);
}

/**
 * Estimates outdoor pavement elevation for rain ground splash ripples.
 * Returns null when coordinate is over Han River water or roofed interior so ripples stay cleanly on roads/sidewalks.
 */
export function getRainSplashGroundY(x: number, z: number): number | null {
  if (isPointInsideRoofedBuilding(x, z)) return null;
  // Skip Han River water basin (Z = -345 .. -134.5) outside bridges
  if (z >= -345.0 && z <= -134.5) return null;

  for (let i = 0; i < CITY_ROADS.length; i++) {
    const r = CITY_ROADS[i];
    if (r.kind === 'bridge') continue;
    const halfW = r.width * 0.5;
    if (r.z1 === r.z2) {
      const minX = Math.min(r.x1, r.x2);
      const maxX = Math.max(r.x1, r.x2);
      if (x >= minX && x <= maxX && Math.abs(z - r.z1) <= halfW) {
        return r.kind === 'promenade' ? 0.025 : -0.242;
      }
    } else if (r.x1 === r.x2) {
      const minZ = Math.min(r.z1, r.z2);
      const maxZ = Math.max(r.z1, r.z2);
      if (z >= minZ && z <= maxZ && Math.abs(x - r.x1) <= halfW) {
        return r.kind === 'promenade' ? 0.025 : -0.242;
      }
    }
  }

  // Sidewalks & commercial plazas sit around Y = 0.0
  if (z >= -134.5 && z <= 380) {
    return 0.022;
  }
  return -0.295;
}

export function createInitialWeatherSchedule(
  rng: () => number = Math.random
): WeatherScheduleState {
  return {
    weatherMode: 'clear',
    minutesUntilRoll: 45 + Math.floor(rng() * 60),
    rainIntensityLevel: 1.08,
  };
}

function getMinutesUntilHalfDayBoundary(rawHour: number): number {
  const h = (((Math.floor(rawHour) || 0) % 24) + 24) % 24;
  // Daytime window: 06:00 .. 17:59 -> rains continuously until dusk (18:00)
  if (h >= 6 && h < 18) {
    return Math.max(60, (18 - h) * 60);
  }
  // Nighttime window: 18:00 .. 05:59 -> rains continuously all night until dawn (06:00)
  const hoursUntilDawn = h >= 18 ? 30 - h : 6 - h;
  return Math.max(120, hoursUntilDawn * 60);
}

/**
 * Advances automatic random weather by 1 in-game minute.
 * Rolls occasionally ("lâu lâu") and when rain hits, triggers heavy rainfall lasting the entire daytime (until 18:00)
 * or entire nighttime (until 06:00).
 */
export function advanceWeatherScheduleMinute(
  state: WeatherScheduleState,
  rawHour: number,
  rng: () => number = Math.random
): { nextState: WeatherScheduleState; changed: boolean } {
  const remaining = state.minutesUntilRoll - 1;
  if (remaining > 0) {
    return {
      nextState: { ...state, minutesUntilRoll: remaining },
      changed: false,
    };
  }

  const h = (((rawHour || 0) % 24) + 24) % 24;
  const isNight = h >= 18 || h < 6;

  if (state.weatherMode === 'clear') {
    const rainChance = isNight ? 0.34 : 0.30;
    if (rng() < rainChance) {
      const durationMins = getMinutesUntilHalfDayBoundary(h);
      const intensity = 1.0 + rng() * 0.24; // Heavy rain downpour
      return {
        nextState: {
          weatherMode: 'rain',
          minutesUntilRoll: durationMins,
          rainIntensityLevel: intensity,
        },
        changed: true,
      };
    }
    return {
      nextState: {
        ...state,
        weatherMode: 'clear',
        minutesUntilRoll: 95 + Math.floor(rng() * 75),
      },
      changed: false,
    };
  }

  // Half-day rain ends -> clear sky stretches out before the next weather roll
  const clearMins = 120 + Math.floor(rng() * 110);
  return {
    nextState: {
      ...state,
      weatherMode: 'clear',
      minutesUntilRoll: clearMins,
    },
    changed: true,
  };
}

export function rollNewDayWeatherSchedule(
  _current: WeatherScheduleState,
  rng: () => number = Math.random
): WeatherScheduleState {
  const fullDayRain = rng() < 0.22;
  return {
    weatherMode: fullDayRain ? 'rain' : 'clear',
    // If morning rolls rain (at 07:00), rain all daytime until 18:00 (660 in-game mins)
    minutesUntilRoll: fullDayRain ? 660 : 90 + Math.floor(rng() * 90),
    rainIntensityLevel: fullDayRain ? 1.02 + rng() * 0.22 : 1.08,
  };
}

export function resolveWeatherModeFromUrl(search: string): {
  forcedWeather: WeatherMode | null;
} {
  if (!search) return { forcedWeather: null };
  const params = new URLSearchParams(search);
  const w = params.get('weather')?.trim().toLowerCase();
  if (w === 'rain') {
    return { forcedWeather: 'rain' };
  }
  if (w === 'clear') {
    return { forcedWeather: 'clear' };
  }
  return { forcedWeather: null };
}

function createRainStreakTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 16, 128);
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  grad.addColorStop(0.22, 'rgba(226, 240, 255, 0.38)');
  grad.addColorStop(0.65, 'rgba(241, 248, 255, 0.92)');
  grad.addColorStop(0.92, 'rgba(255, 255, 255, 0.72)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(5, 0, 6, 128);

  const coreGrad = ctx.createLinearGradient(0, 0, 0, 128);
  coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  coreGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.85)');
  coreGrad.addColorStop(0.88, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(7, 8, 2, 114);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRainRippleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 64, 64);
  const outer = ctx.createRadialGradient(32, 32, 10, 32, 32, 30);
  outer.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  outer.addColorStop(0.62, 'rgba(224, 242, 254, 0.08)');
  outer.addColorStop(0.78, 'rgba(240, 249, 255, 0.88)');
  outer.addColorStop(0.90, 'rgba(224, 242, 254, 0.25)');
  outer.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const inner = ctx.createRadialGradient(32, 32, 0, 32, 32, 10);
  inner.addColorStop(0.0, 'rgba(255, 255, 255, 0.72)');
  inner.addColorStop(0.45, 'rgba(224, 242, 254, 0.28)');
  inner.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(32, 32, 10, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class WeatherRainController {
  public readonly rootGroup = new THREE.Group();

  private weatherMode: WeatherMode = 'clear';
  private targetIntensity: number = 0;
  private currentIntensity: number = 0;

  private readonly dropCount: number;
  private readonly rippleCount: number;
  private readonly boxRadius = 22.0;
  private readonly boxHeight = 20.0;

  private streakGeo: THREE.BufferGeometry;
  private streakMat: THREE.MeshBasicMaterial;
  private streakMesh: THREE.InstancedMesh;
  private streakTex: THREE.CanvasTexture | null;

  private rippleGeo: THREE.BufferGeometry;
  private rippleMat: THREE.MeshBasicMaterial;
  private rippleMesh: THREE.InstancedMesh;
  private rippleTex: THREE.CanvasTexture | null;

  // Pre-allocated drop state (zero GC in tick)
  private dropX: Float32Array;
  private dropY: Float32Array;
  private dropZ: Float32Array;
  private dropSpeed: Float32Array;
  private dropScale: Float32Array;

  // Pre-allocated ripple state
  private rippleX: Float32Array;
  private rippleY: Float32Array;
  private rippleZ: Float32Array;
  private ripplePhase: Float32Array;
  private rippleRate: Float32Array;
  private rippleScale: Float32Array;

  // Reusable math scratch objects (zero allocations in update)
  private readonly _mat = new THREE.Matrix4();
  private readonly _pos = new THREE.Vector3();
  private readonly _quat = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3();
  private readonly _euler = new THREE.Euler(0.09, 0, -0.05);
  private readonly _rippleQuat = new THREE.Quaternion();
  private readonly _dayStreakCol = new THREE.Color(0xdbeafe);
  private readonly _nightStreakCol = new THREE.Color(0x93c5fd);
  private readonly _dayRippleCol = new THREE.Color(0xe0f2fe);
  private readonly _nightRippleCol = new THREE.Color(0x7dd3fc);

  private timeAccum = 0;

  constructor(isSoftwareGl: boolean) {
    this.dropCount = isSoftwareGl ? 740 : 1480;
    this.rippleCount = isSoftwareGl ? 135 : 270;

    this._quat.setFromEuler(this._euler);
    this._rippleQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

    // Build crossed-plane raindrop geometry so streaks remain crisp from every horizontal angle
    const p1 = new THREE.PlaneGeometry(0.036, 1.35);
    const p2 = new THREE.PlaneGeometry(0.036, 1.35);
    p2.rotateY(Math.PI / 2);
    const mergedStreak = mergeGeometries([p1, p2], false);
    p1.dispose();
    p2.dispose();
    this.streakGeo = mergedStreak || new THREE.PlaneGeometry(0.036, 1.35);

    this.streakTex = createRainStreakTexture();
    this.streakMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      map: this.streakTex || undefined,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.streakMesh = new THREE.InstancedMesh(this.streakGeo, this.streakMat, this.dropCount);
    this.streakMesh.frustumCulled = false;
    this.streakMesh.renderOrder = 6;
    this.rootGroup.add(this.streakMesh);

    this.rippleGeo = new THREE.PlaneGeometry(0.46, 0.46);
    this.rippleTex = createRainRippleTexture();
    this.rippleMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      map: this.rippleTex || undefined,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.rippleMesh = new THREE.InstancedMesh(this.rippleGeo, this.rippleMat, this.rippleCount);
    this.rippleMesh.frustumCulled = false;
    this.rippleMesh.renderOrder = 3;
    this.rootGroup.add(this.rippleMesh);

    this.dropX = new Float32Array(this.dropCount);
    this.dropY = new Float32Array(this.dropCount);
    this.dropZ = new Float32Array(this.dropCount);
    this.dropSpeed = new Float32Array(this.dropCount);
    this.dropScale = new Float32Array(this.dropCount);

    for (let i = 0; i < this.dropCount; i++) {
      this.dropX[i] = (Math.random() - 0.5) * this.boxRadius * 2;
      this.dropY[i] = Math.random() * this.boxHeight;
      this.dropZ[i] = (Math.random() - 0.5) * this.boxRadius * 2;
      this.dropSpeed[i] = 17.5 + Math.random() * 6.5;
      this.dropScale[i] = 0.78 + Math.random() * 0.52;
    }

    this.rippleX = new Float32Array(this.rippleCount);
    this.rippleY = new Float32Array(this.rippleCount);
    this.rippleZ = new Float32Array(this.rippleCount);
    this.ripplePhase = new Float32Array(this.rippleCount);
    this.rippleRate = new Float32Array(this.rippleCount);
    this.rippleScale = new Float32Array(this.rippleCount);

    for (let i = 0; i < this.rippleCount; i++) {
      this.rippleX[i] = (Math.random() - 0.5) * 34;
      this.rippleZ[i] = (Math.random() - 0.5) * 34;
      this.rippleY[i] = -999;
      this.ripplePhase[i] = Math.random();
      this.rippleRate[i] = 1.8 + Math.random() * 1.4;
      this.rippleScale[i] = 0.75 + Math.random() * 0.65;
    }

    this.rootGroup.visible = false;
  }

  public setWeather(mode: WeatherMode, intensityLevel: number = 1.08, instant: boolean = false) {
    this.weatherMode = mode;
    this.targetIntensity = mode === 'rain' ? THREE.MathUtils.clamp(intensityLevel, 0.5, 1.25) : 0;
    if (instant) {
      this.currentIntensity = this.targetIntensity;
      this.rootGroup.visible = this.currentIntensity > 0.01;
    }
  }

  public getWeatherMode(): WeatherMode {
    return this.weatherMode;
  }

  public getRainFactor(): number {
    return this.currentIntensity;
  }

  public isTransitioning(): boolean {
    return Math.abs(this.currentIntensity - this.targetIntensity) > 0.002;
  }

  public update(delta: number, camPos: THREE.Vector3, lampFactor: number): boolean {
    const prev = this.currentIntensity;
    if (Math.abs(this.currentIntensity - this.targetIntensity) > 0.0005) {
      const rate = this.targetIntensity > this.currentIntensity ? 0.55 : 0.42;
      const step = Math.min(1, delta * rate);
      this.currentIntensity = THREE.MathUtils.lerp(this.currentIntensity, this.targetIntensity, step);
      if (Math.abs(this.currentIntensity - this.targetIntensity) < 0.002) {
        this.currentIntensity = this.targetIntensity;
      }
    } else {
      this.currentIntensity = this.targetIntensity;
    }

    const rf = this.currentIntensity;
    const changed = Math.abs(rf - prev) > 0.0015;
    if (rf <= 0.005) {
      this.rootGroup.visible = false;
      return changed;
    }

    this.rootGroup.visible = true;
    this.timeAccum += delta;

    // Tint streaks & ground ripples smoothly for daytime overcast vs nighttime illuminated rain
    this.streakMat.color.lerpColors(this._dayStreakCol, this._nightStreakCol, lampFactor);
    this.streakMat.opacity = Math.min(0.76, rf * THREE.MathUtils.lerp(0.60, 0.50, lampFactor));

    this.rippleMat.color.lerpColors(this._dayRippleCol, this._nightRippleCol, lampFactor);
    this.rippleMat.opacity = Math.min(0.62, rf * THREE.MathUtils.lerp(0.48, 0.44, lampFactor));

    const cx = camPos.x;
    const cz = camPos.z;
    const baseMinY = Math.max(-0.5, camPos.y - 3.2);
    const windVx = 1.65 + Math.sin(this.timeAccum * 0.45) * 0.45;
    const windVz = -0.85 + Math.cos(this.timeAccum * 0.35) * 0.25;
    const span = this.boxRadius * 2;

    // Active visible fraction scales with rain intensity so heavy storms pour thickly
    const activeDrops = Math.min(
      this.dropCount,
      Math.max(120, Math.floor(this.dropCount * (0.28 + 0.62 * rf)))
    );

    for (let i = 0; i < this.dropCount; i++) {
      if (i >= activeDrops) {
        this._scale.set(0, 0, 0);
        this._pos.set(cx, -50, cz);
        this._mat.compose(this._pos, this._quat, this._scale);
        this.streakMesh.setMatrixAt(i, this._mat);
        continue;
      }

      const spd = this.dropSpeed[i] * (0.88 + 0.22 * rf);
      this.dropY[i] -= spd * delta;
      this.dropX[i] += windVx * delta;
      this.dropZ[i] += windVz * delta;

      if (this.dropY[i] < 0) {
        this.dropY[i] += this.boxHeight;
      }

      // Wrap X/Z smoothly around camera position without storing world drift
      let dx = this.dropX[i] - cx;
      dx = dx - Math.floor((dx + this.boxRadius) / span) * span;
      this.dropX[i] = cx + dx;

      let dz = this.dropZ[i] - cz;
      dz = dz - Math.floor((dz + this.boxRadius) / span) * span;
      this.dropZ[i] = cz + dz;

      const wx = this.dropX[i];
      const wz = this.dropZ[i];
      const wy = baseMinY + this.dropY[i];

      if (isPointInsideRoofedBuilding(wx, wz)) {
        this._scale.set(0, 0, 0);
      } else {
        const sc = this.dropScale[i];
        this._scale.set(sc, sc * (0.90 + 0.32 * rf), sc);
      }
      this._pos.set(wx, wy, wz);
      this._mat.compose(this._pos, this._quat, this._scale);
      this.streakMesh.setMatrixAt(i, this._mat);
    }
    this.streakMesh.instanceMatrix.needsUpdate = true;

    // Ground rain splash ripples
    const activeRipples = Math.min(this.rippleCount, Math.max(24, Math.floor(this.rippleCount * rf * 0.85)));
    for (let i = 0; i < this.rippleCount; i++) {
      if (i >= activeRipples) {
        this._scale.set(0, 0, 0);
        this._pos.set(cx, -50, cz);
        this._mat.compose(this._pos, this._rippleQuat, this._scale);
        this.rippleMesh.setMatrixAt(i, this._mat);
        continue;
      }

      let p = this.ripplePhase[i] + this.rippleRate[i] * delta;
      if (p >= 1.0 || this.rippleY[i] < -100) {
        p = p >= 1.0 ? p - 1.0 : p;
        const rx = cx + (Math.random() - 0.5) * 34;
        const rz = cz + (Math.random() - 0.5) * 34;
        const gy = getRainSplashGroundY(rx, rz);
        this.rippleX[i] = rx;
        this.rippleZ[i] = rz;
        this.rippleY[i] = gy !== null ? gy : -999;
      }
      this.ripplePhase[i] = p;

      const gy = this.rippleY[i];
      if (gy < -100) {
        this._scale.set(0, 0, 0);
        this._pos.set(cx, -50, cz);
      } else {
        const expand = (0.35 + p * 0.95) * this.rippleScale[i];
        const fade = Math.sin(p * Math.PI);
        const s = expand * fade;
        this._scale.set(s, s, s);
        this._pos.set(this.rippleX[i], gy, this.rippleZ[i]);
      }
      this._mat.compose(this._pos, this._rippleQuat, this._scale);
      this.rippleMesh.setMatrixAt(i, this._mat);
    }
    this.rippleMesh.instanceMatrix.needsUpdate = true;

    return changed;
  }

  public dispose() {
    this.streakGeo.dispose();
    this.streakMat.dispose();
    this.streakTex?.dispose();
    this.rippleGeo.dispose();
    this.rippleMat.dispose();
    this.rippleTex?.dispose();
  }
}
