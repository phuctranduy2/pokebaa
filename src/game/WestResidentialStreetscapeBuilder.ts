import * as THREE from 'three';
import {
  WEST_ALLEYS,
  WEST_INNER_ROADS,
  WEST_WALKABLE_SHOPS,
  SOUTH_FAR_WEST_CONN_CX,
  SOUTH_SW_MID_CONN_CX,
  WEST_SOUTH_CONNECTOR_CX,
  SOUTH_HOSP_WEST_CONN_CX,
  SOUTH_HOSP_EAST_CONN_CX,
  SOUTH_CENTER_MID_CONN_CX,
  SOUTH_OCEAN_RING_CONN_CX,
} from './westResidentialLayout';
import type { WestResPalette } from './WestResidentialExpansionBuilders';

export interface StreetHangoutSpot {
  kind: 'stall_vendor' | 'stall_customer' | 'bus_waiter' | 'bench_sitter' | 'park_visitor';
  x: number;
  z: number;
  yaw: number;
}

export interface StreetWalkSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface StreetscapeBuildResult {
  hangoutSpots: StreetHangoutSpot[];
  walkSegments: StreetWalkSegment[];
}

interface StreetscapeExtras {
  lanternGlowMat: THREE.MeshStandardMaterial;
  warmPoolMat: THREE.MeshBasicMaterial;
  lampPoolGeo: THREE.PlaneGeometry;
}

function addPropBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  rot?: [number, number, number]
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  return m;
}

function addPropCyl(
  parent: THREE.Object3D,
  rt: number,
  rb: number,
  h: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  segs = 8
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

const NS_CONNECTOR_XS = [
  SOUTH_FAR_WEST_CONN_CX,
  SOUTH_SW_MID_CONN_CX,
  WEST_SOUTH_CONNECTOR_CX,
  SOUTH_HOSP_WEST_CONN_CX,
  SOUTH_HOSP_EAST_CONN_CX,
  SOUTH_CENTER_MID_CONN_CX,
  SOUTH_OCEAN_RING_CONN_CX,
];

/**
 * Checks whether a sidewalk/curb coordinate (x, z) is strictly clear of:
 * - Đại Lộ Bệnh Viện (-245..-210)
 * - All 7 N-S Connector roads (cx ± 7.5m)
 * - All 101 alley mouths nearby in Z
 * - All 46 walkable shop doorways & curb parking zones
 */
function isSafeSidewalkSpot(x: number, z: number, halfSpanX = 2.6): boolean {
  // Keep clear of Đại Lộ Bệnh Viện sunken avenue & ramps
  if (x >= -246.0 && x <= -209.0) return false;
  // Keep clear of outer edge boundaries
  if (x <= -948.0 || x >= 90.0) return false;
  // Keep clear of all N-S connectors
  for (let i = 0; i < NS_CONNECTOR_XS.length; i++) {
    if (Math.abs(x - NS_CONNECTOR_XS[i]) < 7.2 + halfSpanX) return false;
  }
  // Keep clear of nearby alley mouths
  for (let i = 0; i < WEST_ALLEYS.length; i++) {
    const a = WEST_ALLEYS[i];
    if (z >= a.minZ - 11.5 && z <= a.maxZ + 11.5) {
      if (x >= a.minX - (2.2 + halfSpanX) && x <= a.maxX + (2.2 + halfSpanX)) return false;
    }
  }
  // Keep clear of walkable shop doorways & fronts
  for (let i = 0; i < WEST_WALKABLE_SHOPS.length; i++) {
    const s = WEST_WALKABLE_SHOPS[i];
    if (Math.abs(z - s.doorZ) < 12.0 && Math.abs(x - s.doorX) < Math.max(4.4, s.w * 0.52) + halfSpanX) {
      return false;
    }
  }
  return true;
}

/**
 * Populates rich Vietnamese neighborhood streetscape across all 10 inner roads, 101 alleys,
 * main West Boulevard sidewalks, and parks — 100% staticGroup (merged by grid chunks for 60 FPS)
 * with zero road/alley/doorway collider interference!
 */
export function buildWestResidentialStreetscape(
  staticGroup: THREE.Group,
  p: WestResPalette,
  extras: StreetscapeExtras
): StreetscapeBuildResult {
  const hangoutSpots: StreetHangoutSpot[] = [];
  const walkSegments: StreetWalkSegment[] = [];

  // Shared materials (allocated once, reused across entire 1,060m district!)
  const lanternRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.72,
    roughness: 0.35,
  });
  const lanternGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.78,
    roughness: 0.35,
  });
  const waterCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.15,
  });
  const atmBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    emissive: 0x2563eb,
    emissiveIntensity: 0.45,
    roughness: 0.32,
  });
  const busGreenMat = new THREE.MeshStandardMaterial({
    color: 0x047857,
    roughness: 0.45,
    metalness: 0.25,
  });
  const hydrantRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38, metalness: 0.35 });
  const binGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });
  const binOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
  const slideYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const sugarcaneMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.7 });
  const wireMat = p.darkSteelMat;

  // =========================================================================
  // 1. COMPOSITE STREET FURNITURE & VIETNAMESE STALL BUILDERS
  // =========================================================================

  /** Vietnamese Sidewalk Trà Đá / Bánh Mì / Nước Mía Stall (`xe đẩy vỉa hè + dù che + bàn ghế nhựa`) */
  const addStreetFoodStall = (
    x: number,
    z: number,
    faceDirZ: 1 | -1, // +1 faces South (towards road at +Z), -1 faces North
    variant: 'banhmi' | 'nuocmia' | 'trada'
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (faceDirZ < 0) g.rotation.y = Math.PI;
    staticGroup.add(g);

    const cartMat =
      variant === 'banhmi' ? p.plasticRedMat : variant === 'nuocmia' ? p.emeraldRoofMat : p.plasticBlueMat;
    const umbrellaMat =
      variant === 'banhmi' ? p.stripedAwningMat : variant === 'nuocmia' ? p.greenAwningMat : p.stripedAwningMat;

    // Wheeled street cart body + stainless top + glass display showcase
    addPropBox(g, 1.48, 0.88, 0.78, cartMat, 0, 0.54, 0);
    addPropBox(g, 1.54, 0.06, 0.84, p.chromeInoxMat, 0, 1.0, 0);
    addPropBox(g, 1.4, 0.64, 0.7, p.clearSeeThroughGlassMat, 0, 1.35, 0);
    // 4 rubber cart wheels
    [[-0.58, -0.32], [0.58, -0.32], [-0.58, 0.32], [0.58, 0.32]].forEach(([wx, wz]) => {
      addPropCyl(g, 0.14, 0.14, 0.08, p.charcoalTrimMat, wx, 0.14, wz, 8);
    });
    // Visible goods inside glass showcase!
    if (variant === 'banhmi') {
      // Golden crusty baguettes (`ổ bánh mì`) + pâté / pork trays
      for (let bi = -2; bi <= 2; bi++) {
        addPropBox(g, 0.16, 0.12, 0.38, p.apricotBlossomMat, bi * 0.24, 1.15, 0.06);
      }
      addPropBox(g, 0.36, 0.12, 0.28, p.beddingCoralMat, -0.35, 1.12, -0.18);
      addPropBox(g, 0.36, 0.12, 0.28, p.foliageMat, 0.28, 1.12, -0.18);
    } else if (variant === 'nuocmia') {
      // Sugarcane press roller + bundle of green sugarcane stalks + ice cooler box
      addPropBox(g, 0.52, 0.44, 0.46, p.chromeInoxMat, -0.32, 1.24, 0);
      addPropCyl(g, 0.06, 0.06, 1.45, sugarcaneMat, 0.92, 0.74, -0.12, 6);
      addPropCyl(g, 0.06, 0.06, 1.38, sugarcaneMat, 1.02, 0.7, 0.04, 6);
      addPropBox(g, 0.48, 0.38, 0.38, p.plasticRedMat, 0.35, 1.22, 0); // Red ice cooler
    } else {
      // Iced tea thermos jug + glass jar of candies/snacks + green plastic cups
      addPropCyl(g, 0.18, 0.18, 0.44, p.plasticRedMat, -0.38, 1.24, 0, 8);
      addPropCyl(g, 0.15, 0.15, 0.32, p.apricotBlossomMat, 0.1, 1.18, 0, 8);
      addPropCyl(g, 0.15, 0.15, 0.32, p.bougainvilleaMat, 0.44, 1.18, 0, 8);
    }

    // Overhead glowing bulb & big sidewalk sun umbrella (`dù che nắng`)
    addPropBox(g, 0.07, 2.52, 0.07, p.chromeInoxMat, -0.78, 1.26, -0.2);
    addPropBox(g, 2.35, 0.14, 2.35, umbrellaMat, -0.55, 2.52, 0.15);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), extras.lanternGlowMat);
    bulb.position.set(0, 1.72, 0.12);
    g.add(bulb);

    // Sidewalk low plastic table + 2 stools right beside cart (`ngồi uống trà đá vỉa hè`)
    const stoolMat = variant === 'trada' ? p.plasticBlueMat : p.plasticRedMat;
    addPropBox(g, 0.68, 0.44, 0.68, stoolMat, 1.38, 0.22, 0.12);
    addPropBox(g, 0.28, 0.28, 0.28, p.plasticBlueMat, 1.38, 0.14, -0.52);
    addPropBox(g, 0.28, 0.28, 0.28, p.plasticRedMat, 2.02, 0.14, 0.12);
    // Two iced tea glasses on the low plastic table
    addPropCyl(g, 0.05, 0.04, 0.13, p.apricotBlossomMat, 1.26, 0.5, 0.04, 6);
    addPropCyl(g, 0.05, 0.04, 0.13, p.apricotBlossomMat, 1.48, 0.5, 0.2, 6);

    // Small ceramic herb pot & wooden menu board beside cart
    addPropCyl(g, 0.16, 0.13, 0.24, p.woodMat, -1.06, 0.12, 0.24, 8);
    addPropBox(g, 0.26, 0.28, 0.26, p.foliageMat, -1.06, 0.34, 0.24);
    addPropBox(g, 0.42, 0.56, 0.06, cartMat, -1.06, 0.32, -0.32, [-0.14, 0.2, 0]);

    // Register vendor + seated tea customer for the live StreetLifePool!
    hangoutSpots.push({
      kind: 'stall_vendor',
      x,
      z: z - faceDirZ * 0.78,
      yaw: faceDirZ > 0 ? 0 : Math.PI,
    });
    // Quaternius 'Sit' shifts hips forward ~0.20m along facing vector -> pull back 0.20m from stool center (-0.52)
    hangoutSpots.push({
      kind: 'stall_customer',
      x: x + (faceDirZ > 0 ? 1.38 : -1.38),
      z: z - faceDirZ * 0.72,
      yaw: faceDirZ > 0 ? 0 : Math.PI,
    });
  };

  /** Covered Vietnamese Bus Stop Shelter (`trạm chờ xe buýt`) */
  const addBusStopShelter = (x: number, z: number, faceDirZ: 1 | -1) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (faceDirZ < 0) g.rotation.y = Math.PI;
    staticGroup.add(g);

    // Concrete curb pad + green steel posts + curved-feel sloped roof canopy
    addPropBox(g, 4.6, 0.08, 1.75, p.concreteMat, 0, 0.04, 0);
    [-2.05, 0, 2.05].forEach((px) => {
      addPropBox(g, 0.11, 2.55, 0.11, busGreenMat, px, 1.32, -0.68);
    });
    [-2.05, 2.05].forEach((px) => {
      addPropBox(g, 0.09, 2.48, 0.09, busGreenMat, px, 1.28, 0.62);
    });
    addPropBox(g, 4.75, 0.12, 1.85, busGreenMat, 0, 2.6, 0, [0.07, 0, 0]);
    // Clear glass windbreak + illuminated route map lightbox
    addPropBox(g, 4.0, 1.85, 0.06, p.clearSeeThroughGlassMat, 0, 1.36, -0.66);
    addPropBox(g, 1.25, 1.45, 0.14, p.charcoalTrimMat, -1.3, 1.32, -0.58);
    addPropBox(g, 1.08, 1.25, 0.04, p.windowWarmMat, -1.3, 1.32, -0.5);
    // Waiting bench + blue bus route totem pole + corner safety bollards + sidewalk trash bin
    addPropBox(g, 2.45, 0.08, 0.48, p.woodMat, 0.6, 0.48, -0.32);
    addPropBox(g, 0.1, 0.44, 0.42, p.darkSteelMat, -0.45, 0.24, -0.32);
    addPropBox(g, 0.1, 0.44, 0.42, p.darkSteelMat, 1.65, 0.24, -0.32);
    addPropBox(g, 0.09, 2.85, 0.09, p.chromeInoxMat, 2.55, 1.42, 0.4);
    addPropBox(g, 0.56, 0.72, 0.08, atmBlueMat, 2.55, 2.48, 0.4);
    addPropCyl(g, 0.07, 0.07, 0.68, p.apricotBlossomMat, -2.18, 0.34, 0.72, 8);
    addPropCyl(g, 0.07, 0.07, 0.68, p.apricotBlossomMat, 2.18, 0.34, 0.72, 8);
    addPropBox(g, 0.34, 0.68, 0.34, binGreenMat, -2.55, 0.36, -0.2);

    // Warm shelter light pool at night
    const pool = new THREE.Mesh(extras.lampPoolGeo, extras.warmPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.09, 0.2);
    g.add(pool);

    hangoutSpots.push({
      kind: 'bus_waiter',
      x: x + (faceDirZ > 0 ? 0.55 : -0.55),
      z: z - faceDirZ * 0.25,
      yaw: faceDirZ > 0 ? 0 : Math.PI,
    });
  };

  /** Glowing 24/7 Bank ATM Kiosk Booth (`trụ ATM`) */
  const addAtmKiosk = (x: number, z: number, faceDirZ: 1 | -1) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (faceDirZ < 0) g.rotation.y = Math.PI;
    staticGroup.add(g);

    addPropBox(g, 1.5, 0.08, 1.35, p.concreteMat, 0, 0.04, 0);
    addPropBox(g, 1.42, 2.35, 0.14, atmBlueMat, 0, 1.22, -0.56); // Back enclosure wall
    addPropBox(g, 0.1, 2.35, 1.15, p.clearSeeThroughGlassMat, -0.68, 1.22, 0); // Left glass side
    addPropBox(g, 0.1, 2.35, 1.15, p.clearSeeThroughGlassMat, 0.68, 1.22, 0); // Right glass side
    addPropBox(g, 1.54, 0.36, 1.38, atmBlueMat, 0, 2.52, 0); // Glowing blue ATM canopy header
    addPropBox(g, 0.92, 0.22, 0.05, p.windowWarmMat, 0, 2.52, 0.7); // Illuminated "ATM 24/7" strip
    // ATM machine body + glowing cyan screen + keypad
    addPropBox(g, 0.74, 1.55, 0.52, p.paintWhiteMat, 0, 0.85, -0.2);
    addPropBox(g, 0.44, 0.34, 0.04, p.tvScreenMat, 0, 1.34, 0.07);
    addPropBox(g, 0.36, 0.08, 0.16, p.chromeInoxMat, 0, 1.02, 0.1);
  };

  /** Children's Playground Set (`cầu trượt + xích đu + bập bênh`) for Community Parks */
  const addChildrenPlayground = (cx: number, cz: number) => {
    // Soft turf / rubber safety mat pad
    addPropBox(staticGroup, 8.6, 0.09, 6.2, p.tilePatioMat, cx, 0.055, cz);

    // 1. Multi-color Slide Tower (`cầu trượt`)
    const sx = cx - 2.3;
    const sz = cz - 0.5;
    addPropBox(staticGroup, 1.45, 0.12, 1.45, slideYellowMat, sx, 1.48, sz);
    [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]].forEach(([ox, oz]) => {
      addPropBox(staticGroup, 0.1, 2.45, 0.1, p.plasticBlueMat, sx + ox, 1.24, sz + oz);
    });
    // Little pagoda roof over slide deck
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.75, 4), p.plasticRedMat);
    roof.position.set(sx, 2.8, sz);
    roof.rotation.y = Math.PI / 4;
    staticGroup.add(roof);
    // Sloped yellow slide chute going East (+X)
    addPropBox(staticGroup, 2.35, 0.12, 0.72, slideYellowMat, sx + 1.55, 0.82, sz, [0, 0, -0.52]);
    // Ladder steps going West (-X)
    for (let st = 0; st < 4; st++) {
      addPropBox(staticGroup, 0.08, 0.06, 0.68, p.plasticRedMat, sx - 0.82 - st * 0.12, 0.35 + st * 0.34, sz);
    }

    // 2. Twin Swing Frame (`xích đu 2 ghế`)
    const wx = cx + 2.2;
    const wz = cz - 0.6;
    addPropBox(staticGroup, 3.0, 0.1, 0.1, p.plasticRedMat, wx, 2.28, wz); // Top crossbar
    [-1.4, 1.4].forEach((ox) => {
      addPropBox(staticGroup, 0.09, 2.35, 0.09, p.plasticBlueMat, wx + ox, 1.15, wz - 0.45, [0.2, 0, 0]);
      addPropBox(staticGroup, 0.09, 2.35, 0.09, p.plasticBlueMat, wx + ox, 1.15, wz + 0.45, [-0.2, 0, 0]);
    });
    [-0.58, 0.58].forEach((ox) => {
      addPropBox(staticGroup, 0.03, 1.65, 0.03, p.chromeInoxMat, wx + ox - 0.2, 1.42, wz);
      addPropBox(staticGroup, 0.03, 1.65, 0.03, p.chromeInoxMat, wx + ox + 0.2, 1.42, wz);
      addPropBox(staticGroup, 0.5, 0.07, 0.28, slideYellowMat, wx + ox, 0.58, wz);
    });

    // 3. Seesaw (`bập bênh`)
    const bx = cx + 0.1;
    const bz = cz + 1.85;
    addPropBox(staticGroup, 0.22, 0.56, 0.22, p.plasticBlueMat, bx, 0.3, bz);
    addPropBox(staticGroup, 2.95, 0.1, 0.32, p.plasticRedMat, bx, 0.62, bz, [0, 0, 0.15]);
    addPropBox(staticGroup, 0.32, 0.12, 0.32, slideYellowMat, bx - 1.25, 0.48, bz);
    addPropBox(staticGroup, 0.32, 0.12, 0.32, slideYellowMat, bx + 1.25, 0.85, bz);

    hangoutSpots.push({ kind: 'park_visitor', x: cx - 3.6, z: cz + 2.2, yaw: 0.4 });
  };

  /** Tiered Stone Park Water Fountain (`đài phun nước công viên`) */
  const addParkFountain = (fx: number, fz: number) => {
    addPropCyl(staticGroup, 2.35, 2.5, 0.56, p.creamPlasterMat, fx, 0.3, fz, 12);
    addPropCyl(staticGroup, 2.08, 2.08, 0.42, waterCyanMat, fx, 0.36, fz, 12);
    addPropCyl(staticGroup, 0.42, 0.52, 1.35, p.creamPlasterMat, fx, 0.92, fz, 10);
    addPropCyl(staticGroup, 1.15, 0.45, 0.28, p.creamPlasterMat, fx, 1.56, fz, 10);
    addPropCyl(staticGroup, 0.96, 0.96, 0.14, waterCyanMat, fx, 1.66, fz, 10);
    addPropCyl(staticGroup, 0.16, 0.22, 0.72, waterCyanMat, fx, 2.05, fz, 8);
    // Warm fountain night glow ring
    const pool = new THREE.Mesh(extras.lampPoolGeo, extras.warmPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(fx, 0.1, fz);
    staticGroup.add(pool);
  };

  /** Street Corner Utilities: Dual Recycling Bins + Red Fire Hydrant + Flower Planter Box */
  const addSidewalkFurnitureCluster = (x: number, z: number, seed: number) => {
    const mode = seed % 4;
    if (mode === 0) {
      // Community Stone Flower Planter Box (`bồn hoa vỉa hè`)
      addPropBox(staticGroup, 1.85, 0.44, 0.78, p.creamPlasterMat, x, 0.22, z);
      addPropBox(staticGroup, 1.62, 0.42, 0.56, p.foliageMat, x, 0.54, z);
      const blossomMat = seed % 2 === 0 ? p.bougainvilleaMat : p.apricotBlossomMat;
      addPropBox(staticGroup, 1.3, 0.22, 0.38, blossomMat, x, 0.8, z);
    } else if (mode === 1) {
      // Public Stone Bench (`ghế đá vỉa hè`) + Dual Green/Orange Trash Bin
      addPropBox(staticGroup, 1.75, 0.1, 0.5, p.concreteMat, x, 0.45, z);
      addPropBox(staticGroup, 0.16, 0.42, 0.46, p.charcoalTrimMat, x - 0.62, 0.21, z);
      addPropBox(staticGroup, 0.16, 0.42, 0.46, p.charcoalTrimMat, x + 0.62, 0.21, z);
      addPropBox(staticGroup, 0.36, 0.72, 0.36, binGreenMat, x + 1.25, 0.36, z);
      addPropBox(staticGroup, 0.36, 0.72, 0.36, binOrangeMat, x + 1.66, 0.36, z);
      const yaw = seed % 2 === 0 ? 0 : Math.PI;
      hangoutSpots.push({ kind: 'bench_sitter', x, z: z - (yaw === 0 ? 0.2 : -0.2), yaw });
    } else if (mode === 2) {
      // Red Fire Hydrant (`trụ cứu hỏa`) + Green Utility Cabinet + Blue Street Signpost
      addPropCyl(staticGroup, 0.14, 0.16, 0.76, hydrantRedMat, x - 0.55, 0.38, z, 8);
      addPropBox(staticGroup, 0.76, 1.18, 0.52, p.concreteModernMat, x + 0.35, 0.59, z);
      addPropBox(staticGroup, 0.08, 2.7, 0.08, p.chromeInoxMat, x + 1.15, 1.35, z);
      addPropBox(staticGroup, 0.74, 0.26, 0.06, atmBlueMat, x + 1.15, 2.58, z);
    } else {
      // Dual Recycling Bins + Shade Tree Planter Curb
      addPropBox(staticGroup, 0.36, 0.72, 0.36, binGreenMat, x - 0.22, 0.36, z);
      addPropBox(staticGroup, 0.36, 0.72, 0.36, binOrangeMat, x + 0.22, 0.36, z);
    }
  };

  // =========================================================================
  // 2. ROADSIDE SHADE TREES, STALLS, BUS STOPS, ATMS & URBAN FURNITURE ALONG ALL 10 INNER ROADS!
  // =========================================================================
  let propSeed = 11;
  WEST_INNER_ROADS.forEach((road, roadIdx) => {
    const northCurbZ = road.minZ - 0.85;
    const southCurbZ = road.maxZ + 0.85;

    // Register sidewalk pedestrian patrol segments along EVERY inner road for StreetLifePool!
    for (let sx = road.x1 + 16; sx < road.x2 - 22; sx += 46) {
      const segEnd = Math.min(road.x2 - 14, sx + 34);
      if (sx < -248 && segEnd > -250) continue;
      if (sx > -248 && sx < -208) continue;
      walkSegments.push({ x1: sx, z1: northCurbZ - 0.35, x2: segEnd, z2: northCurbZ - 0.35 });
      walkSegments.push({ x1: segEnd, z1: southCurbZ + 0.35, x2: sx, z2: southCurbZ + 0.35 });
    }

    // Plant shade trees & urban furniture along BOTH curbs of all 10 inner roads!
    let slotIdx = 0;
    for (let x = road.x1 + 12; x <= road.x2 - 12; x += 15.5) {
      propSeed++;
      slotIdx++;

      // North sidewalk curb (facing South toward road, +1)
      if (isSafeSidewalkSpot(x, northCurbZ, 1.8)) {
        if (slotIdx % 2 === 0) {
          const blossom = (propSeed + roadIdx) % 3 === 0 ? 'pink' : (propSeed + roadIdx) % 3 === 1 ? 'yellow' : 'none';
          p.addTree(staticGroup, x, northCurbZ - 0.25, 0.82, blossom);
        } else if (slotIdx % 9 === 3 && isSafeSidewalkSpot(x, northCurbZ - 0.3, 2.8)) {
          const v = (propSeed % 3 === 0 ? 'banhmi' : propSeed % 3 === 1 ? 'nuocmia' : 'trada') as
            | 'banhmi'
            | 'nuocmia'
            | 'trada';
          addStreetFoodStall(x, northCurbZ - 0.45, 1, v);
        } else if (slotIdx % 5 === 1) {
          addSidewalkFurnitureCluster(x, northCurbZ - 0.2, propSeed);
        }
      }

      // South sidewalk curb (facing North toward road, -1), offset slightly for alternating rhythm
      const sx = x + 7.2;
      if (sx <= road.x2 - 12 && isSafeSidewalkSpot(sx, southCurbZ, 1.8)) {
        if (slotIdx % 2 === 1) {
          const blossom = (propSeed + roadIdx) % 3 === 0 ? 'yellow' : (propSeed + roadIdx) % 3 === 1 ? 'pink' : 'none';
          p.addTree(staticGroup, sx, southCurbZ + 0.25, 0.82, blossom);
        } else if (slotIdx % 10 === 4 && isSafeSidewalkSpot(sx, southCurbZ + 0.3, 2.8)) {
          const v = (propSeed % 3 === 0 ? 'trada' : propSeed % 3 === 1 ? 'banhmi' : 'nuocmia') as
            | 'banhmi'
            | 'nuocmia'
            | 'trada';
          addStreetFoodStall(sx, southCurbZ + 0.45, -1, v);
        } else if (slotIdx % 6 === 2) {
          addSidewalkFurnitureCluster(sx, southCurbZ + 0.2, propSeed + 3);
        }
      }
    }
  });

  // =========================================================================
  // 3. MAIN WEST BOULEVARD SIDEWALKS (Z = 15.8 North Curb & Z = 42.2 South Curb)
  // =========================================================================
  for (let bx = -940; bx <= -375; bx += 26) {
    propSeed++;
    if (isSafeSidewalkSpot(bx, 16.4, 2.4)) {
      if (propSeed % 3 === 0) {
        addStreetFoodStall(bx, 16.1, 1, propSeed % 2 === 0 ? 'banhmi' : 'trada');
      } else {
        addSidewalkFurnitureCluster(bx, 16.4, propSeed);
      }
    }
    const sbx = bx + 13;
    if (sbx <= -442 && isSafeSidewalkSpot(sbx, 41.8, 2.4)) {
      if (propSeed % 3 === 1) {
        addStreetFoodStall(sbx, 42.0, -1, propSeed % 2 === 0 ? 'nuocmia' : 'trada');
      } else {
        addSidewalkFurnitureCluster(sbx, 41.8, propSeed + 1);
      }
    }
  }
  // Boulevard pedestrian walk segments
  for (let bx = -930; bx <= -450; bx += 64) {
    walkSegments.push({ x1: bx, z1: 17.6, x2: bx + 48, z2: 17.6 });
    walkSegments.push({ x1: bx + 48, z1: 40.4, x2: bx, z2: 40.4 });
  }

  // =========================================================================
  // 4. STRATEGIC COVERED BUS STOPS & 24/7 BANK ATM BOOTHS ACROSS THE DISTRICT
  // =========================================================================
  const busStopSpots: Array<{ x: number; z: number; faceDirZ: 1 | -1 }> = [
    { x: -456.0, z: 16.2, faceDirZ: 1 },    // Đại Lộ Trung Tâm (North side)
    { x: -642.0, z: 16.2, faceDirZ: 1 },    // Đại Lộ Trung Tâm West
    { x: -826.0, z: 16.2, faceDirZ: 1 },    // Đại Lộ Trung Tâm Far-West
    { x: -518.0, z: 42.1, faceDirZ: -1 },   // Đại Lộ Trung Tâm South
    { x: -764.0, z: 42.1, faceDirZ: -1 },   // Đại Lộ Trung Tâm Southwest
    { x: -518.0, z: 146.9, faceDirZ: 1 },   // Đường Nội Khu Nam 2
    { x: -162.0, z: 146.9, faceDirZ: 1 },   // Nam Bệnh Viện (Nam 2)
    { x: -52.0, z: 238.9, faceDirZ: 1 },    // Nam Trung Tâm (Nam 4)
    { x: -712.0, z: 354.4, faceDirZ: -1 },  // Đại Lộ Nam 6 West
    { x: -158.0, z: 354.4, faceDirZ: -1 },  // Đại Lộ Nam 6 East
    { x: 38.0, z: 354.4, faceDirZ: -1 },    // Đại Lộ Nam 6 Ocean Park Link
    { x: -518.0, z: -27.1, faceDirZ: 1 },   // Đường Nội Khu Bắc 1
  ];
  busStopSpots.forEach((bs) => {
    if (isSafeSidewalkSpot(bs.x, bs.z, 2.5)) {
      addBusStopShelter(bs.x, bs.z, bs.faceDirZ);
    }
  });

  const atmSpots: Array<{ x: number; z: number; faceDirZ: 1 | -1 }> = [
    { x: -414.0, z: 16.0, faceDirZ: 1 },
    { x: -702.0, z: 16.0, faceDirZ: 1 },
    { x: -452.0, z: 146.9, faceDirZ: 1 },
    { x: -124.0, z: 146.9, faceDirZ: 1 },
    { x: 24.0, z: 192.9, faceDirZ: 1 },
    { x: -582.0, z: 288.9, faceDirZ: 1 },
    { x: -346.0, z: 354.4, faceDirZ: -1 },
  ];
  atmSpots.forEach((atm) => {
    if (isSafeSidewalkSpot(atm.x, atm.z, 1.5)) {
      addAtmKiosk(atm.x, atm.z, atm.faceDirZ);
    }
  });

  // =========================================================================
  // 5. FESTIVE OVERHEAD ALLEY LANTERN STRINGS (Y = 4.55m — 100% CLEAR FOR BIKES!)
  //    + ALLEY PEDESTRIAN WALK ANCHORS FOR ALL 101 ALLEYS!
  // =========================================================================
  const lanternBulbGeo = new THREE.SphereGeometry(0.18, 7, 6);
  WEST_ALLEYS.forEach((alley, aIdx) => {
    const spanW = Math.max(3.6, alley.maxX - alley.minX);
    const lenZ = alley.maxZ - alley.minZ;
    // Register cozy alley pedestrian walking path along the margin so alleys always feel alive
    if (lenZ >= 12) {
      const sideOffset = aIdx % 2 === 0 ? -1.45 : 1.45;
      walkSegments.push({
        x1: alley.cx + sideOffset,
        z1: alley.minZ + 2.5,
        x2: alley.cx + sideOffset,
        z2: alley.maxZ - 2.5,
      });
    }

    // Hang festive overhead red & gold lantern strings at Y = 4.55m on primary alleys & every 2nd alley!
    if (!alley.hasArch && aIdx % 2 !== 0) return;
    const stringCount = lenZ >= 34 ? 3 : 2;
    for (let si = 0; si < stringCount; si++) {
      const lz = alley.minZ + ((si + 1) / (stringCount + 1)) * lenZ;
      addPropBox(staticGroup, spanW + 0.2, 0.03, 0.03, wireMat, alley.cx, 4.58, lz);
      [-spanW * 0.28, 0, spanW * 0.28].forEach((ox, li) => {
        const bulb = new THREE.Mesh(lanternBulbGeo, (li + aIdx) % 2 === 0 ? lanternRedMat : lanternGoldMat);
        bulb.scale.set(1.0, 1.28, 1.0);
        bulb.position.set(alley.cx + ox, 4.3, lz);
        staticGroup.add(bulb);
      });
    }
  });

  // =========================================================================
  // 6. UPGRADED COMMUNITY PARKS: FOUNTAINS & CHILDREN'S PLAYGROUNDS!
  // =========================================================================
  // Công Viên Bắc Tổ 7 (-396..-362, Z = -134..-102): Center Fountain + West Children's Playground + Trà Đá Stall!
  addParkFountain(-379.0, -118.0);
  addChildrenPlayground(-388.5, -118.0);
  addStreetFoodStall(-368.5, -104.2, 1, 'trada');
  hangoutSpots.push({ kind: 'park_visitor', x: -373.5, z: -115.2, yaw: -Math.PI * 0.5 });

  // Công Viên Đại Lộ Nam Liên Khu (Z = 352.4..362.0): Fountains, Playgrounds & Street Stalls along the 1,060m Southern Park!
  [-820.0, -510.0, -227.5, -2.0].forEach((fx, idx) => {
    addParkFountain(fx, 358.2);
    if (idx % 2 === 0) {
      addChildrenPlayground(fx + 26.0, 358.4);
    }
    addStreetFoodStall(fx - 16.0, 355.4, -1, idx % 2 === 0 ? 'nuocmia' : 'banhmi');
    hangoutSpots.push({ kind: 'park_visitor', x: fx + 4.0, z: 356.2, yaw: Math.PI });
  });

  // Extra Playgrounds & Fountains in Southern Community Pocket Parks (Row S1 & S2 parks)
  addChildrenPlayground(-530.0, 84.5);
  addChildrenPlayground(-790.0, 84.5);
  addParkFountain(-660.0, 84.5);
  addParkFountain(-492.0, 139.8);
  addParkFountain(-758.0, 139.8);

  return { hangoutSpots, walkSegments };
}
