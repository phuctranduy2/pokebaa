import * as THREE from 'three';
import { attachGlbHumanToNpc, type GlbHumanHandle } from './GlbHumanNpcSystem';
import { CASHIER_NPC_MODEL, pickOutsideNpcModel, pickStationaryCivilianModel } from './NpcModelCatalog';
import {
  createRollingShutterDoor,
  createRollingShutterTexture,
  RollingShutterHandle,
  setShutterProgress,
  isPorscheShowroomOpenAtHour,
  advanceNpcExitPath,
} from './VenueOperatingHours';

export interface PorscheCharacterHelpers {
  createFaceTexture: (expression?: string, skinHex?: string) => THREE.Texture;
  createHeadMesh: (
    skinMat: THREE.Material,
    faceTex: THREE.Texture,
    width?: number,
    height?: number,
    depth?: number
  ) => THREE.Mesh;
}

export interface PorscheModelSpec {
  id: string;
  name: string;
  tagline: string;
  category: 'Track GT' | 'Electric Sport' | 'Mid-Engine' | 'Grand Tourer' | 'Performance SUV';
  price: number;
  horsepower: string;
  zeroToHundred: string;
  topSpeed: string;
  engine: string;
  bodyStyle: 'gt3rs' | 'taycan' | 'cayman' | 'turbos' | 'suv';
  defaultPaintHex: number;
  defaultRimHex: number;
  description: string;
}

export interface PorschePaintOption {
  id: string;
  name: string;
  hex: number;
  css: string;
  isMetallic?: boolean;
}

export interface PorscheWheelOption {
  id: string;
  name: string;
  hex: number;
  css: string;
}

export const PORSCHE_PAINT_OPTIONS: PorschePaintOption[] = [
  { id: 'guards_red', name: 'Guards Red', hex: 0xd91c24, css: '#d91c24' },
  { id: 'racing_yellow', name: 'Racing Yellow', hex: 0xfacc15, css: '#facc15' },
  { id: 'frozen_blue', name: 'Frozen Blue Metallic', hex: 0x67a3c9, css: '#67a3c9', isMetallic: true },
  { id: 'python_green', name: 'Python Green', hex: 0x16a34a, css: '#16a34a' },
  { id: 'miami_blue', name: 'Miami Blue', hex: 0x06b6d4, css: '#06b6d4' },
  { id: 'chalk', name: 'Chalk (Craie)', hex: 0xd6d3cd, css: '#d6d3cd' },
  { id: 'gt_silver', name: 'GT Silver Metallic', hex: 0x9ca3af, css: '#9ca3af', isMetallic: true },
  { id: 'jet_black', name: 'Jet Black Metallic', hex: 0x111827, css: '#111827', isMetallic: true },
];

export const PORSCHE_WHEEL_OPTIONS: PorscheWheelOption[] = [
  { id: 'neodyme', name: 'Satin Neodyme Gold', hex: 0xc9a86a, css: '#c9a86a' },
  { id: 'gloss_black', name: 'Satin Black', hex: 0x18181b, css: '#18181b' },
  { id: 'platinum', name: 'Platinum Silver', hex: 0xe2e8f0, css: '#e2e8f0' },
];

export const PORSCHE_CATALOG: PorscheModelSpec[] = [
  {
    id: '911_gt3_rs',
    name: 'Porsche 911 GT3 RS (992)',
    tagline: 'Born in Flacht • Swan-Neck Aero Track Weapon',
    category: 'Track GT',
    price: 245000,
    horsepower: '518 HP',
    zeroToHundred: '3.2 s',
    topSpeed: '296 km/h',
    engine: '4.0L Flat-6 Naturally Aspirated (9,000 RPM)',
    bodyStyle: 'gt3rs',
    defaultPaintHex: 0xd91c24,
    defaultRimHex: 0xc9a86a,
    description:
      'Mẫu xe đua đường phố đỉnh cao của Porsche Motorsport với cánh gió sau cổ thiên nga DRS, hốc thoát gió vè trước và động cơ 6 xi-lanh đối đỉnh hút khí tự nhiên 9.000 vòng/phút.',
  },
  {
    id: 'taycan_turbo_s',
    name: 'Porsche Taycan Turbo S',
    tagline: 'Soul, Electrified • 800V Hyper-Saloon',
    category: 'Electric Sport',
    price: 195000,
    horsepower: '938 HP',
    zeroToHundred: '2.4 s',
    topSpeed: '260 km/h',
    engine: 'Dual Permanent-Magnet Electric Motors (AWD)',
    bodyStyle: 'taycan',
    defaultPaintHex: 0x67a3c9,
    defaultRimHex: 0xe2e8f0,
    description:
      'Sedan thể thao thuần điện hàng đầu với kiến trúc sạc siêu nhanh 800V, tăng tốc 0–100 km/h chỉ 2.4 giây cùng dải đèn LED ma trận 4 điểm đặc trưng.',
  },
  {
    id: '718_cayman_gt4_rs',
    name: 'Porsche 718 Cayman GT4 RS',
    tagline: 'Mid-Engine Razor • Pure Mechanical Focus',
    category: 'Mid-Engine',
    price: 165000,
    horsepower: '493 HP',
    zeroToHundred: '3.4 s',
    topSpeed: '315 km/h',
    engine: '4.0L Mid-Mounted Flat-6',
    bodyStyle: 'cayman',
    defaultPaintHex: 0xfacc15,
    defaultRimHex: 0x18181b,
    description:
      'Cấu hình động cơ đặt giữa cân bằng hoàn hảo, hốc hút gió ngay sau cửa sổ bên người lái và nắp capo sợi carbon siêu nhẹ.',
  },
  {
    id: '911_turbo_s',
    name: 'Porsche 911 Turbo S',
    tagline: 'Everyday Supercar • Twin-Turbo Icon',
    category: 'Grand Tourer',
    price: 230000,
    horsepower: '640 HP',
    zeroToHundred: '2.7 s',
    topSpeed: '330 km/h',
    engine: '3.7L Twin-Turbocharged Flat-6 (AWD)',
    bodyStyle: 'turbos',
    defaultPaintHex: 0x9ca3af,
    defaultRimHex: 0xe2e8f0,
    description:
      'Biểu tượng siêu xe sử dụng hàng ngày với hệ dẫn động 4 bánh toàn thời gian, tăng tốc 0–100 km/h trong 2.7 giây và độ hoàn thiện nội thất Exclusive Manufaktur.',
  },
  {
    id: '911_carrera_gts',
    name: 'Porsche 911 Carrera GTS T-Hybrid',
    tagline: 'Modern Benchmark • Hybrid Performance',
    category: 'Grand Tourer',
    price: 170000,
    horsepower: '532 HP',
    zeroToHundred: '3.0 s',
    topSpeed: '312 km/h',
    engine: '3.6L eTurbo T-Hybrid Flat-6',
    bodyStyle: 'turbos',
    defaultPaintHex: 0x06b6d4,
    defaultRimHex: 0x18181b,
    description:
      'Thế hệ 911 992.2 mới nhất trang bị công nghệ T-Hybrid từ đường đua, phản hồi chân ga tức thì và kiểu dáng fastback bất hủ.',
  },
  {
    id: 'cayenne_turbo_gt',
    name: 'Porsche Cayenne Turbo GT',
    tagline: 'Nürburgring SUV Record Holder',
    category: 'Performance SUV',
    price: 198000,
    horsepower: '650 HP',
    zeroToHundred: '3.3 s',
    topSpeed: '305 km/h',
    engine: '4.0L Twin-Turbo V8',
    bodyStyle: 'suv',
    defaultPaintHex: 0xd6d3cd,
    defaultRimHex: 0xc9a86a,
    description:
      'Mẫu SUV hiệu năng cao nắm giữ kỷ lục vòng chạy tại Nürburgring Nordschleife với ống xả titan đặt giữa và mui carbon nguyên khối.',
  },
];

export interface PorscheCarMeshResult {
  root: THREE.Group;
  paintMat: THREE.MeshStandardMaterial;
  rimMat: THREE.MeshStandardMaterial;
  wingGroup: THREE.Group;
}

export function createPorscheCarMesh(options: {
  bodyStyle: 'gt3rs' | 'taycan' | 'cayman' | 'turbos' | 'suv';
  paintHex: number;
  rimHex?: number;
  headlightsOn?: boolean;
}): PorscheCarMeshResult {
  const { bodyStyle, paintHex, rimHex = 0xc9a86a, headlightsOn = true } = options;

  const root = new THREE.Group();
  const isSuv = bodyStyle === 'suv';
  const isTaycan = bodyStyle === 'taycan';
  const isGt3Rs = bodyStyle === 'gt3rs';
  const isCayman = bodyStyle === 'cayman';
  const hasRearWing = isGt3Rs || isCayman;

  // Automotive Glossy Metallic Paint PBR (using IBL environment reflection without expensive dual-lobe clearcoat)
  const paintMat = new THREE.MeshStandardMaterial({
    color: paintHex,
    metalness: 0.52,
    roughness: 0.14,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.35,
    roughness: 0.36,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.2,
    roughness: 0.72,
  });

  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: 0x060b14,
    metalness: 0.9,
    roughness: 0.06,
  });

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: rimHex, metalness: 0.9, roughness: 0.16 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.32 });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: isGt3Rs || isCayman ? 0xfacc15 : 0xdc2626,
    roughness: 0.28,
    metalness: 0.4,
  });
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.14 });

  const drlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: headlightsOn ? 2.4 : 0.15,
    roughness: 0.1,
  });

  const rearBarMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xff1e2d,
    emissiveIntensity: headlightsOn ? 1.8 : 0.15,
    roughness: 0.15,
  });

  const crestGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0x78350f,
    emissiveIntensity: 0.2,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Dimensions tuned to authentic Porsche proportions (+Z = front nose, -Z = rear tail)
  const wheelRadius = isSuv ? 0.38 : 0.335;
  const frontAxleZ = isTaycan ? 1.44 : 1.32;
  const rearAxleZ = isTaycan ? -1.44 : -1.30;
  const halfTrack = isSuv ? 0.90 : 0.86;
  const beltY = isSuv ? 0.94 : 0.74;
  const roofY = isSuv ? 1.54 : isTaycan ? 1.24 : 1.18;

  // 1. Sculpted Porsche Fastback Lower Body (ExtrudeGeometry rotated so +X -> +Z)
  const bodyProfile = new THREE.Shape();
  if (isSuv) {
    bodyProfile.moveTo(-2.22, 0.28);
    bodyProfile.lineTo(2.22, 0.26);
    bodyProfile.lineTo(2.30, 0.50);
    bodyProfile.lineTo(2.15, 0.82);
    bodyProfile.lineTo(1.15, beltY);
    bodyProfile.lineTo(-1.82, beltY);
    bodyProfile.lineTo(-2.24, 0.88);
    bodyProfile.lineTo(-2.28, 0.40);
  } else {
    // Low-slung Porsche 911 / Taycan / Cayman nose dipping down cleanly
    bodyProfile.moveTo(-2.14, 0.20);
    bodyProfile.lineTo(2.18, 0.17); // Front chin splitter line
    bodyProfile.lineTo(2.26, 0.36); // Low aggressive Porsche bumper nose
    bodyProfile.lineTo(2.04, 0.56); // Sloping frunk hood
    bodyProfile.lineTo(1.12, beltY); // Windshield cowl
    bodyProfile.lineTo(-1.10, beltY + 0.04); // Muscular rear haunches
    bodyProfile.lineTo(-2.10, 0.76); // Fastback rear deck
    bodyProfile.lineTo(-2.22, 0.44); // Rear bumper lip
    bodyProfile.lineTo(-2.16, 0.24);
  }
  bodyProfile.closePath();

  const bodyWidth = isTaycan ? 1.76 : 1.72;
  const lowerGeo = new THREE.ExtrudeGeometry(bodyProfile, {
    depth: bodyWidth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 4,
  });
  lowerGeo.translate(0, 0, -bodyWidth * 0.5);
  const lowerBody = new THREE.Mesh(lowerGeo, paintMat);
  lowerBody.rotation.y = -Math.PI / 2;
  root.add(lowerBody);

  // 2. Sculpted Iconic Porsche Fastback Teardrop Cabin Greenhouse
  const cabinShape = new THREE.Shape();
  if (isSuv) {
    cabinShape.moveTo(-1.75, beltY - 0.03);
    cabinShape.lineTo(1.08, beltY - 0.03);
    cabinShape.lineTo(0.45, roofY);
    cabinShape.lineTo(-1.42, roofY);
  } else if (isTaycan) {
    cabinShape.moveTo(-1.72, beltY - 0.03);
    cabinShape.lineTo(1.06, beltY - 0.03);
    cabinShape.lineTo(0.32, roofY);
    cabinShape.lineTo(-0.78, roofY);
  } else {
    // Classic 911 / Cayman sweeping flyline
    cabinShape.moveTo(-1.68, beltY - 0.02);
    cabinShape.lineTo(1.02, beltY - 0.02);
    cabinShape.lineTo(0.28, roofY);
    cabinShape.lineTo(-0.46, roofY);
  }
  cabinShape.closePath();

  const cabinWidth = isSuv ? 1.38 : 1.32;
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: cabinWidth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  cabinGeo.translate(0, 0, -cabinWidth * 0.5);
  const cabinMesh = new THREE.Mesh(cabinGeo, cabinGlassMat);
  cabinMesh.rotation.y = -Math.PI / 2;
  root.add(cabinMesh);

  // Roof cap (Carbon fiber on GT3 RS / GT4 RS / Cayenne GT, Panoramic glass on Taycan, Painted on Turbo S)
  const roofMat = isGt3Rs || isCayman || isSuv ? carbonMat : isTaycan ? cabinGlassMat : paintMat;
  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(cabinWidth - 0.08, 0.04, isTaycan ? 1.12 : 0.78),
    roofMat
  );
  roofCap.position.set(0, roofY + 0.038, isTaycan ? -0.22 : -0.10);
  root.add(roofCap);

  // 3. Signature Wide Rear Haunches & Front Fender Bulges (Porsche 911 DNA!)
  const haunchWidth = isGt3Rs ? 0.16 : 0.11;
  [-1, 1].forEach((side) => {
    const rearHaunch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 1.15, 16),
      paintMat
    );
    rearHaunch.rotation.x = Math.PI / 2;
    rearHaunch.scale.set(0.65, 1.0, 0.65);
    rearHaunch.position.set(side * (bodyWidth * 0.5 + haunchWidth * 0.25), 0.60, rearAxleZ + 0.08);
    root.add(rearHaunch);

    // Front fender crown rising slightly higher than hood center (classic Porsche frog-eye ridge)
    const frontCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 1.05, 14),
      paintMat
    );
    frontCrown.rotation.x = Math.PI / 2;
    frontCrown.scale.set(0.62, 1.0, 0.52);
    frontCrown.position.set(side * (bodyWidth * 0.44), 0.56, frontAxleZ - 0.05);
    root.add(frontCrown);

    // Side mirrors on sleek twin-stalks
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.05), darkTrimMat);
    stalk.position.set(side * 0.86, beltY + 0.03, 0.64);
    root.add(stalk);
    const mirrorCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.075, 0.12),
      isGt3Rs ? carbonMat : paintMat
    );
    mirrorCap.position.set(side * 0.93, beltY + 0.05, 0.62);
    mirrorCap.rotation.y = side * -0.18;
    root.add(mirrorCap);

    // Side air intake / skirt blade
    const sideSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.07, 2.05),
      carbonMat
    );
    sideSkirt.position.set(side * (bodyWidth * 0.5 + 0.04), 0.20, 0.0);
    root.add(sideSkirt);

    if (isGt3Rs || isCayman || bodyStyle === 'turbos') {
      const sideIntake = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.22, 0.34),
        darkTrimMat
      );
      sideIntake.position.set(side * (bodyWidth * 0.5 + 0.05), 0.56, -0.78);
      root.add(sideIntake);
    }
  });

  // 4. Carbon Front Splitter, NACA Hood Vents, & Aggressive Front Air Intakes
  const frontSplitter = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth + 0.18, 0.045, 0.36),
    carbonMat
  );
  frontSplitter.position.set(0, 0.16, 2.18);
  root.add(frontSplitter);

  const frontGrille = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.18, 0.10),
    darkTrimMat
  );
  frontGrille.position.set(0, 0.26, 2.25);
  root.add(frontGrille);

  // Porsche Crest Hood Emblem Badge
  const hoodCrest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.11), crestGoldMat);
  hoodCrest.position.set(0, 0.525, 2.02);
  hoodCrest.rotation.x = 0.24;
  root.add(hoodCrest);

  if (isGt3Rs || isCayman) {
    // Carbon Weissach hood / NACA cooling ducts
    const hoodCarbon = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.025, 0.92), carbonMat);
    hoodCarbon.position.set(0, 0.635, 1.56);
    hoodCarbon.rotation.x = 0.21;
    root.add(hoodCarbon);
  }

  // 5. Signature Porsche Oval 4-Point Matrix LED Headlights
  [-1, 1].forEach((side) => {
    const hlHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.08, 16),
      darkTrimMat
    );
    hlHousing.rotation.x = Math.PI / 2 - 0.55;
    hlHousing.rotation.z = side * -0.14;
    hlHousing.position.set(side * 0.70, 0.56, 2.04);
    root.add(hlHousing);

    const hlMainLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 12, 10),
      drlMat
    );
    hlMainLens.scale.set(1.0, 0.65, 1.35);
    hlMainLens.position.set(side * 0.70, 0.565, 2.06);
    root.add(hlMainLens);

    // 4-point PDLS LED dots around lens
    [
      [-0.055, 0.04],
      [0.055, 0.04],
      [-0.055, -0.04],
      [0.055, -0.04],
    ].forEach(([ox, oy]) => {
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.03), drlMat);
      dot.position.set(side * 0.70 + ox, 0.57 + oy, 2.13);
      root.add(dot);
    });
  });

  // 6. Signature Full-Width Porsche Rear Crimson LED Lightbar + Rear Diffuser + Exhausts
  const rearLightbar = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.045, 0.06), rearBarMat);
  rearLightbar.position.set(0, 0.66, -2.18);
  root.add(rearLightbar);

  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.20, 0.18), carbonMat);
  rearDiffuser.position.set(0, 0.23, -2.15);
  root.add(rearDiffuser);

  // Dual center-exit titanium exhaust pipes (GT3 RS / GT4 RS / Cayenne GT) or quad corner tips
  const exhaustOffsets = isGt3Rs || isCayman || isSuv ? [-0.11, 0.11] : [-0.62, -0.48, 0.48, 0.62];
  exhaustOffsets.forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 14), exhaustMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.22, -2.23);
    root.add(pipe);
  });

  // Rear "PORSCHE" metallic badge strip
  const rearBadgeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.022, 0.02), exhaustMat);
  rearBadgeStrip.position.set(0, 0.61, -2.20);
  root.add(rearBadgeStrip);

  // 7. Swan-Neck GT Rear Wing (for 911 GT3 RS & 718 Cayman GT4 RS)
  const wingGroup = new THREE.Group();
  if (hasRearWing) {
    const wingY = isGt3Rs ? 1.24 : 1.08;
    const wingZ = isGt3Rs ? -2.02 : -1.94;
    const wingSpan = isGt3Rs ? 1.88 : 1.62;

    [-0.36, 0.36].forEach((px) => {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, wingY - 0.72, 0.22), carbonMat);
      pylon.position.set(px, (wingY + 0.72) * 0.5, wingZ + 0.06);
      pylon.rotation.x = -0.18;
      wingGroup.add(pylon);
    });

    const mainPlane = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.04, 0.32), carbonMat);
    mainPlane.position.set(0, wingY, wingZ);
    mainPlane.rotation.x = 0.10;
    wingGroup.add(mainPlane);

    [-wingSpan * 0.5, wingSpan * 0.5].forEach((ex) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.42), paintMat);
      endplate.position.set(ex, wingY - 0.02, wingZ);
      wingGroup.add(endplate);
    });
  }
  root.add(wingGroup);

  // 8. 4 High-Detail Porsche Multi-Spoke Wheels + PCCB Brake Calipers
  const wheelCoords: Array<[number, number]> = [
    [-halfTrack, frontAxleZ],
    [halfTrack, frontAxleZ],
    [-halfTrack, rearAxleZ],
    [halfTrack, rearAxleZ],
  ];

  wheelCoords.forEach(([wx, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wheelRadius, wz);

    // Tire
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 24), tireMat);
    tire.rotation.z = Math.PI / 2;
    wGroup.add(tire);

    // Alloy barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, 0.29, 20),
      rimMat
    );
    barrel.rotation.z = Math.PI / 2;
    wGroup.add(barrel);

    // Brake disc & yellow/red PCCB caliper
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, 0.14, 18),
      discMat
    );
    disc.rotation.z = Math.PI / 2;
    wGroup.add(disc);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.11), caliperMat);
    caliper.position.set(wx > 0 ? 0.03 : -0.03, 0.08, -0.10);
    wGroup.add(caliper);

    // 5 Y-spokes + center-lock nut
    const signX = wx > 0 ? 1 : -1;
    for (let s = 0; s < 5; s++) {
      const angle = (s * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, wheelRadius * 1.34, 0.045), rimMat);
      spoke.position.x = signX * 0.148;
      spoke.rotation.x = angle;
      wGroup.add(spoke);
    }

    const centerNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12),
      isGt3Rs ? caliperMat : carbonMat
    );
    centerNut.rotation.z = Math.PI / 2;
    centerNut.position.x = signX * 0.155;
    wGroup.add(centerNut);

    root.add(wGroup);
  });

  // Soft Ground Contact Shadow beneath chassis
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 128, 22, 128, 128, 124);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  sGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.35)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.65, 5.1),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  return { root, paintMat, rimMat, wingGroup };
}

function drawPorscheCrestOnCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  const w = size * 0.82;
  const h = size;

  // Shield path
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, -h * 0.45);
  ctx.lineTo(w * 0.5, -h * 0.45);
  ctx.lineTo(w * 0.44, h * 0.14);
  ctx.quadraticCurveTo(w * 0.25, h * 0.42, 0, h * 0.52);
  ctx.quadraticCurveTo(-w * 0.25, h * 0.42, -w * 0.44, h * 0.14);
  ctx.closePath();

  const goldGrad = ctx.createLinearGradient(-w * 0.5, -h * 0.5, w * 0.5, h * 0.5);
  goldGrad.addColorStop(0, '#fde047');
  goldGrad.addColorStop(0.5, '#d4af37');
  goldGrad.addColorStop(1, '#a16207');
  ctx.fillStyle = goldGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = '#18181b';
  ctx.stroke();

  // Top "PORSCHE" header inside crest
  ctx.fillStyle = '#18181b';
  ctx.font = `900 ${Math.round(size * 0.12)}px "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PORSCHE', 0, -h * 0.34);

  // Quarters grid
  const qw = w * 0.34;
  const qh = h * 0.24;
  const qTop = -h * 0.22;

  // Top-Left & Bottom-Right: Württemberg antlers (dark strokes on gold)
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = Math.max(1.5, size * 0.025);
  for (let row = 0; row < 3; row++) {
    const ry1 = qTop + row * (qh * 0.32) + qh * 0.18;
    ctx.beginPath();
    ctx.moveTo(-qw + 4, ry1);
    ctx.lineTo(-4, ry1);
    ctx.stroke();

    const ry2 = qTop + qh + row * (qh * 0.32) + qh * 0.18;
    ctx.beginPath();
    ctx.moveTo(4, ry2);
    ctx.lineTo(qw - 4, ry2);
    ctx.stroke();
  }

  // Top-Right & Bottom-Left: Red & Black Stripes
  const stripeH = qh / 3;
  [
    [0, qTop],
    [-qw, qTop + qh],
  ].forEach(([sx, sy]) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(sx, sy, qw, stripeH);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(sx, sy + stripeH, qw, stripeH);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(sx, sy + stripeH * 2, qw, stripeH);
  });

  // Center Stuttgart miniature shield
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = Math.max(1.5, size * 0.025);
  ctx.beginPath();
  ctx.roundRect(-w * 0.14, qTop + qh * 0.55, w * 0.28, h * 0.22, 4);
  ctx.fill();
  ctx.stroke();

  // Prancing silhouette inside center shield
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(0, qTop + qh * 0.98, size * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function createPorscheFasciaTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#090d14');
  bgGrad.addColorStop(1, '#111827');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle metallic champagne & crimson accent bands
  ctx.fillStyle = '#d91c24';
  ctx.fillRect(0, 0, w, 12);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, h - 10, w, 10);

  // Left & Right Stuttgart Crest
  drawPorscheCrestOnCanvas(ctx, 180, h / 2, 185);
  drawPorscheCrestOnCanvas(ctx, w - 180, h / 2, 185);

  // Main wide-spaced PORSCHE architectural wordmark
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 116px "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P  O  R  S  C  H  E', w / 2, h / 2 - 22);

  // Subtitle
  ctx.fillStyle = '#d4af37';
  ctx.font = '700 32px system-ui, -apple-system, sans-serif';
  ctx.fillText('PORSCHE CENTER  •  SALES GALLERY  •  EXCLUSIVE MANUFAKTUR', w / 2, h / 2 + 80);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createPorschePylonTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#d91c24';
  ctx.fillRect(0, 0, 26, h);

  drawPorscheCrestOnCanvas(ctx, w / 2 + 10, 230, 240);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 62px "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PORSCHE', w / 2 + 10, 445);

  ctx.fillStyle = '#d4af37';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText('SHOWROOM', w / 2 + 10, 520);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('911 GT3 RS', w / 2 + 10, 660);
  ctx.fillText('TAYCAN TURBO S', w / 2 + 10, 725);
  ctx.fillText('718 CAYMAN GT4 RS', w / 2 + 10, 790);

  ctx.fillStyle = '#d91c24';
  ctx.fillRect(85, 875, 360, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('OPEN 07:00 - 21:00', w / 2 + 10, 908);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createModelSpecBoardTexture(
  modelTitle: string,
  powerText: string,
  accelText: string,
  priceText: string,
  accentHex: string
): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#090d14';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = accentHex;
  ctx.fillRect(14, 14, w - 28, 66);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(modelTitle, w / 2, 48);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(powerText, w / 2, 150);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(accelText, w / 2, 222);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText(priceText, w / 2, 315);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface PorscheShowroomBuildResult {
  staticGroup: THREE.Group;
  turntableGroup: THREE.Group;
  heroCarResult: PorscheCarMeshResult;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  neonMats: THREE.MeshStandardMaterial[];
  interiorPointLights: Array<{ light: THREE.PointLight; dayInt: number; nightInt: number }>;
  updateOperatingHours: (rawHour: number, delta: number, npcController?: PorscheShowroomNpcController | null) => void;
  getClosedFactor: () => number;
}

function createHeritagePosterTexture(title: string, subtitle: string, bgHex: string, accentHex: string): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, w, 24);
  ctx.fillRect(0, h - 24, w, 24);

  drawPorscheCrestOnCanvas(ctx, w / 2, 165, 165);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 44px "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, w / 2, 345);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText(subtitle, w / 2, 420);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createPorscheShowroomStructure(): PorscheShowroomBuildResult {
  // Building R3 occupies X = +52 to +84 (center X = 68.0, width = 32.0m), Z = -30.0 to +15.6 (depth = 45.6m!)
  // Local anchor stays at (68.0, 0, 7.8):
  //   Front Glass Facade: localZ = +7.75 (worldZ = +15.55)
  //   Rear North Wall:    localZ = -37.8 (worldZ = -30.0)
  const showroomGroup = new THREE.Group();
  showroomGroup.position.set(68.0, 0, 7.8);

  const neonMats: THREE.MeshStandardMaterial[] = [];

  const silverCladdingMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.72,
    roughness: 0.28,
  });
  const obsidianSteelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.55,
    roughness: 0.35,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xdbeafe,
    emissiveIntensity: 0.16,
    roughness: 0.45,
  });
  const floorTileMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.22,
    roughness: 0.28,
  });
  const floorLightTileMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.2,
    roughness: 0.32,
  });
  const runwayStripMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.3,
    roughness: 0.25,
  });
  const soffitWoodMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.62,
  });
  const porscheRedMat = new THREE.MeshStandardMaterial({
    color: 0xd91c24,
    roughness: 0.28,
    metalness: 0.3,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.25,
  });
  const showroomGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.04,
    metalness: 0.18,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  const ceilingLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 1.3,
    roughness: 0.18,
  });

  const redLedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xd91c24,
    emissiveIntensity: 1.15,
    roughness: 0.2,
  });

  // 2 Wide Interior PointLights illuminating all 3 deep zones cleanly day & night (cuts GPU fragment light loops)
  const interiorLightSpecs: Array<{ wx: number; wy: number; wz: number; dayInt: number; nightInt: number; dist: number }> = [
    { wx: 68.0, wy: 5.5, wz: 4.5, dayInt: 20.0, nightInt: 68.0, dist: 38.0 },
    { wx: 68.0, wy: 5.5, wz: -18.5, dayInt: 20.0, nightInt: 68.0, dist: 38.0 },
  ];
  const interiorPointLights = interiorLightSpecs.map((spec) => {
    const light = new THREE.PointLight(0xf8fafc, spec.dayInt, spec.dist, 1.0);
    light.position.set(spec.wx, spec.wy, spec.wz);
    return { light, dayInt: spec.dayInt, nightInt: spec.nightInt };
  });

  // 1. Polished 45.2m-Deep Showroom Floor (local Z: -37.6 to +7.7)
  const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(31.8, 0.08, 45.4), floorTileMat);
  floorSlab.position.set(0, 0.04, -14.95);
  showroomGroup.add(floorSlab);

  // Architectural display lane strips (West Wing, Center Spine, East Wing)
  [-10.2, 0, 10.2].forEach((tx) => {
    const laneStrip = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.015, 41.0), floorLightTileMat);
    laneStrip.position.set(tx, 0.085, -14.6);
    showroomGroup.add(laneStrip);
  });

  // Twin walkable boulevard runner tracks leading straight from front door to deep Motorsport zone
  [-4.8, 4.8].forEach((rx) => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.014, 41.5), runwayStripMat);
    track.position.set(rx, 0.084, -14.5);
    showroomGroup.add(track);
  });

  // Subtle crimson LED floor accent strips guiding eyes toward deep gallery
  [-3.4, 3.4].forEach((lx) => {
    const floorLed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 38.0), redLedMat);
    floorLed.position.set(lx, 0.086, -15.5);
    showroomGroup.add(floorLed);
  });

  // 2. Structural Shell: Deep Back Wall (local Z = -37.8 -> world Z = -30.0), Side Walls (X = ±15.8), Full Roof
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(32.0, 11.4, 0.8), obsidianSteelMat);
  backWall.position.set(0, 5.7, -37.8);
  showroomGroup.add(backWall);

  const backInteriorPanel = new THREE.Mesh(new THREE.BoxGeometry(30.8, 6.4, 0.14), interiorWallMat);
  backInteriorPanel.position.set(0, 3.2, -37.3);
  showroomGroup.add(backInteriorPanel);

  [-15.8, 15.8].forEach((wx) => {
    const sideShell = new THREE.Mesh(new THREE.BoxGeometry(0.45, 11.4, 45.8), silverCladdingMat);
    sideShell.position.set(wx, 5.7, -15.0);
    showroomGroup.add(sideShell);

    const sideInteriorLiner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 6.2, 44.6), interiorWallMat);
    sideInteriorLiner.position.set(wx > 0 ? wx - 0.28 : wx + 0.28, 3.1, -14.8);
    showroomGroup.add(sideInteriorLiner);

    // Architectural interior wall pilasters every 10m along the 45m depth
    [2.0, -7.0, -16.0, -25.0, -34.0].forEach((pz) => {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.2, 0.45), obsidianSteelMat);
      pilaster.position.set(wx > 0 ? wx - 0.34 : wx + 0.34, 3.1, pz);
      showroomGroup.add(pilaster);
    });
  });

  // Interior Gallery Ceiling at Y = 6.3m + 9 Luminous Softbox Light Panels
  const galleryCeiling = new THREE.Mesh(new THREE.BoxGeometry(31.4, 0.22, 45.0), obsidianSteelMat);
  galleryCeiling.position.set(0, 6.3, -14.8);
  showroomGroup.add(galleryCeiling);

  const ceilingRowZ = [1.0, -11.5, -23.5, -32.2];
  ceilingRowZ.forEach((cz, rowIdx) => {
    const xs = rowIdx === 3 ? [-6.5, 6.5] : [-10.2, 0, 10.2];
    xs.forEach((cx) => {
      const lightBoxFrame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 5.4), obsidianSteelMat);
      lightBoxFrame.position.set(cx, 6.14, cz);
      showroomGroup.add(lightBoxFrame);

      const lightBoxGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 4.9), ceilingLightMat);
      lightBoxGlow.rotation.x = Math.PI / 2;
      lightBoxGlow.position.set(cx, 6.07, cz);
      showroomGroup.add(lightBoxGlow);
    });
  });

  // 3. Upper Architectural Cladding Mass (Y = 6.0..11.4) with Lowered Sidewalk-Visible PORSCHE Fascia
  const upperFrontFacade = new THREE.Mesh(new THREE.BoxGeometry(32.0, 5.4, 45.8), silverCladdingMat);
  upperFrontFacade.position.set(0, 8.7, -15.0);
  showroomGroup.add(upperFrontFacade);

  const roofParapet = new THREE.Mesh(new THREE.BoxGeometry(32.4, 0.50, 46.2), obsidianSteelMat);
  roofParapet.position.set(0, 11.25, -15.0);
  showroomGroup.add(roofParapet);

  // Lowered Fascia Band (Y = 7.75) so P O R S C H E + Crests stay framed cleanly in sidewalk camera view!
  const fasciaBacking = new THREE.Mesh(new THREE.BoxGeometry(31.8, 3.0, 0.25), obsidianSteelMat);
  fasciaBacking.position.set(0, 7.75, 7.86);
  showroomGroup.add(fasciaBacking);

  const fasciaTex = createPorscheFasciaTexture();
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTex,
    emissive: 0xffffff,
    emissiveMap: fasciaTex,
    emissiveIntensity: 0.48,
    roughness: 0.22,
  });
  neonMats.push(fasciaMat);

  const fasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(25.2, 2.75), fasciaMat);
  fasciaSign.position.set(0, 7.75, 8.01);
  showroomGroup.add(fasciaSign);

  [-14.6, -13.4, 13.4, 14.6].forEach((fx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.1, 0.35), obsidianSteelMat);
    fin.position.set(fx, 8.6, 7.90);
    showroomGroup.add(fin);
  });

  // 4. Cantilevered Luxury Entrance Canopy (Y = 4.55..4.95, Z = +7.8..+9.9)
  const canopyDeck = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.34, 2.1), obsidianSteelMat);
  canopyDeck.position.set(0, 4.78, 8.80);
  showroomGroup.add(canopyDeck);

  const canopySoffit = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.06, 1.9), soffitWoodMat);
  canopySoffit.position.set(0, 4.59, 8.80);
  showroomGroup.add(canopySoffit);

  const canopyRedTrim = new THREE.Mesh(new THREE.BoxGeometry(10.64, 0.08, 0.08), redLedMat);
  canopyRedTrim.position.set(0, 4.78, 9.86);
  showroomGroup.add(canopyRedTrim);

  // 5. Panoramic Glass Curtain Wall (Z = 7.75, Leaving Central X = -2.5..+2.5 Open for Sliding Doors!)
  const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(13.0, 5.95, 0.08), showroomGlassMat);
  leftGlass.position.set(-9.08, 3.05, 7.75);
  showroomGroup.add(leftGlass);

  const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(13.0, 5.95, 0.08), showroomGlassMat);
  rightGlass.position.set(9.08, 3.05, 7.75);
  showroomGroup.add(rightGlass);

  const centerTransomGlass = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.55, 0.08), showroomGlassMat);
  centerTransomGlass.position.set(0, 4.75, 7.75);
  showroomGroup.add(centerTransomGlass);

  [-15.55, -12.3, -9.05, -5.8, -2.55, 2.55, 5.8, 9.05, 12.3, 15.55].forEach((mx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 6.15, 0.22), obsidianSteelMat);
    mullion.position.set(mx, 3.08, 7.75);
    showroomGroup.add(mullion);
  });

  const doorHeaderBeam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 0.28), obsidianSteelMat);
  doorHeaderBeam.position.set(0, 3.42, 7.75);
  showroomGroup.add(doorHeaderBeam);

  // Automatic Double Sliding Glass Entrance Doors
  const createSlidingDoorLeaf = (isLeft: boolean) => {
    const leaf = new THREE.Group();
    leaf.userData.noMerge = true;
    const glassLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.48, 3.24, 0.06), showroomGlassMat);
    glassLeaf.position.y = 1.64;
    leaf.add(glassLeaf);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.50, 0.10, 0.10), obsidianSteelMat);
    topRail.position.y = 3.25;
    leaf.add(topRail);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(2.50, 0.12, 0.10), obsidianSteelMat);
    botRail.position.y = 0.08;
    leaf.add(botRail);

    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.12), silverCladdingMat);
    handleBar.position.set(isLeft ? 1.10 : -1.10, 1.30, 0.06);
    leaf.add(handleBar);

    return leaf;
  };

  const doorLeft = createSlidingDoorLeaf(true);
  doorLeft.position.set(-1.26, 0, 7.68);
  showroomGroup.add(doorLeft);

  const doorRight = createSlidingDoorLeaf(false);
  doorRight.position.set(1.26, 0, 7.68);
  showroomGroup.add(doorRight);

  const shutterTex = createRollingShutterTexture({
    title: 'PORSCHE CENTER',
    hoursLabel: 'MỞ CỬA HÀNG NGÀY  •  07:00 - 21:00',
    accentHex: '#d91c24',
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    map: shutterTex,
    roughness: 0.52,
    metalness: 0.48,
  });
  const mainShutter: RollingShutterHandle = createRollingShutterDoor(
    showroomGroup,
    {
      id: 'porsche_main',
      axis: 'x',
      pos: 7.52,
      spanCenter: 0,
      width: 5.05,
      baseY: 0.08,
      topY: 3.35,
    },
    shutterMat,
    obsidianSteelMat
  );

  const thresholdMat = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.02, 1.4), obsidianSteelMat);
  thresholdMat.position.set(0, 0.09, 7.35);
  showroomGroup.add(thresholdMat);

  // 6. Sidewalk Illuminated Porsche Crest Monument Pylon (world X = 53.6, Z = 16.3)
  const pylonGroup = new THREE.Group();
  pylonGroup.position.set(-14.4, 0, 8.5);
  const pylonBody = new THREE.Mesh(new THREE.BoxGeometry(1.55, 5.4, 0.45), obsidianSteelMat);
  pylonBody.position.y = 2.7;
  pylonGroup.add(pylonBody);

  const pylonRedEdge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.45, 0.48), porscheRedMat);
  pylonRedEdge.position.set(-0.76, 2.72, 0);
  pylonGroup.add(pylonRedEdge);

  const pylonTex = createPorschePylonTexture();
  const pylonFaceMat = new THREE.MeshStandardMaterial({
    map: pylonTex,
    emissive: 0xffffff,
    emissiveMap: pylonTex,
    emissiveIntensity: 0.42,
    roughness: 0.25,
  });
  neonMats.push(pylonFaceMat);

  const pylonFront = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 4.9), pylonFaceMat);
  pylonFront.position.set(0.03, 2.72, 0.235);
  pylonGroup.add(pylonFront);
  const pylonBack = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 4.9), pylonFaceMat);
  pylonBack.rotation.y = Math.PI;
  pylonBack.position.set(0.03, 2.72, -0.235);
  pylonGroup.add(pylonBack);
  showroomGroup.add(pylonGroup);

  // 7. Deep North Rear Feature Wall (localZ = -37.2 -> worldZ = -29.4): Grand Header + 3 Spec Boards
  const backHeaderSign = new THREE.Mesh(new THREE.PlaneGeometry(18.0, 2.2), fasciaMat);
  backHeaderSign.position.set(0, 4.85, -37.15);
  showroomGroup.add(backHeaderSign);

  const specBoards = [
    {
      x: -10.2,
      title: 'CAYENNE TURBO GT',
      power: '650 HP • 4.0L TWIN-TURBO V8',
      accel: 'NÜRBURGRING SUV RECORD',
      price: '$198,000',
      accent: '#d6d3cd',
    },
    {
      x: 0,
      title: '911 GT3 RS • MOTORSPORT',
      power: '518 HP • 9,000 RPM FLAT-6',
      accel: 'DRS SWAN-NECK • WEISSACH',
      price: '$245,000',
      accent: '#d91c24',
    },
    {
      x: 10.2,
      title: '911 TURBO S • CARRERA GTS',
      power: '640 HP AWD • T-HYBRID 532 HP',
      accel: '0–100 KM/H IN 2.7S • 330 KM/H',
      price: '$230,000',
      accent: '#38bdf8',
    },
  ];
  const specBoardMats: THREE.MeshStandardMaterial[] = [];
  specBoards.forEach((sb) => {
    const tex = createModelSpecBoardTexture(sb.title, sb.power, sb.accel, sb.price, sb.accent);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.42,
      roughness: 0.25,
    });
    specBoardMats.push(mat);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 0.12), obsidianSteelMat);
    frame.position.set(sb.x, 2.15, -37.18);
    showroomGroup.add(frame);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 3.0), mat);
    face.position.set(sb.x, 2.15, -37.10);
    showroomGroup.add(face);
  });

  // 8. Front Welcome Podium (near entrance, local X = -4.2, Z = +4.8 -> world X = 63.8, Z = 12.6)
  const welcomePodium = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.05, 0.75), obsidianSteelMat);
  welcomePodium.position.set(-4.2, 0.56, 4.8);
  showroomGroup.add(welcomePodium);
  const welcomePodiumTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.85), silverCladdingMat);
  welcomePodiumTop.position.set(-4.2, 1.11, 4.8);
  showroomGroup.add(welcomePodiumTop);

  // 9. Mid-Showroom Exclusive Manufaktur Concierge Counter (local X = 0, Z = -11.8 -> world X = 68.0, Z = -4.0)
  const deskBase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.06, 1.15), obsidianSteelMat);
  deskBase.position.set(0, 0.57, -11.8);
  showroomGroup.add(deskBase);

  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.08, 1.3), silverCladdingMat);
  deskTop.position.set(0, 1.12, -11.8);
  showroomGroup.add(deskTop);

  const deskLedStrip = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.05, 0.05), redLedMat);
  deskLedStrip.position.set(0, 0.22, -11.20);
  showroomGroup.add(deskLedStrip);

  const conciergeScreenMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.48,
    roughness: 0.18,
  });

  [-1.2, 1.2].forEach((mx) => {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), obsidianSteelMat);
    stand.position.set(mx, 1.25, -11.85);
    showroomGroup.add(stand);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.48, 0.04),
      conciergeScreenMat
    );
    screen.position.set(mx, 1.48, -11.85);
    showroomGroup.add(screen);
  });

  // 10. West Wall VIP Lounge & Heritage Posters (Flush along West Wall: local X = -14.2..-13.2)
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 });
  const posterMats: THREE.MeshStandardMaterial[] = [];
  [-5.6, -18.0, -31.8].forEach((lz, lIdx) => {
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.44, 3.0), leatherMat);
    sofaSeat.position.set(-14.2, 0.26, lz);
    showroomGroup.add(sofaSeat);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 3.0), leatherMat);
    sofaBack.position.set(-14.6, 0.62, lz);
    showroomGroup.add(sofaBack);

    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 1.6), silverCladdingMat);
    coffeeTable.position.set(-12.9, 0.25, lz);
    showroomGroup.add(coffeeTable);

    // Heritage Wall Poster above each sofa
    const posterTex = createHeritagePosterTexture(
      lIdx === 0 ? '911 HERITAGE' : lIdx === 1 ? 'STUTTGART' : 'LE MANS GT',
      lIdx === 0 ? 'SINCE 1963 • FLAT-SIX ICON' : lIdx === 1 ? 'PORSCHE EXCLUSIVE MANUFAKTUR' : '19X OVERALL VICTORIES',
      '#0f172a',
      lIdx === 1 ? '#d4af37' : '#d91c24'
    );
    const posterMat = new THREE.MeshStandardMaterial({
      map: posterTex,
      emissive: 0xffffff,
      emissiveMap: posterTex,
      emissiveIntensity: 0.28,
      roughness: 0.3,
    });
    posterMats.push(posterMat);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.2), posterMat);
    poster.rotation.y = Math.PI / 2;
    poster.position.set(-15.32, 2.7, lz);
    showroomGroup.add(poster);
  });

  // 11. East Wall Exclusive Manufaktur Fitting Studio (Flush on East Wall, facing -X — ZERO overlap with any car!)
  // A) Paint-to-Sample 8-Color Display Wall at local X = +15.2, Z = -17.8
  const ptsRack = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.4, 4.8), obsidianSteelMat);
  ptsRack.position.set(15.25, 1.85, -17.8);
  showroomGroup.add(ptsRack);
  PORSCHE_PAINT_OPTIONS.forEach((p, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const swatch = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshStandardMaterial({
        color: p.hex,
        metalness: 0.52,
        roughness: 0.14,
      })
    );
    swatch.scale.set(0.45, 1.0, 1.0);
    swatch.position.set(15.10, 2.25 - row * 0.85, -19.2 + col * 0.95);
    showroomGroup.add(swatch);
  });

  // B) Forged Center-Lock Wheel Rim Display Rack at local X = +15.2, Z = -6.0
  const wheelRack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 4.4), obsidianSteelMat);
  wheelRack.position.set(15.25, 1.75, -6.0);
  showroomGroup.add(wheelRack);
  PORSCHE_WHEEL_OPTIONS.forEach((wOpt, wIdx) => {
    const rimMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.20, 24),
      new THREE.MeshStandardMaterial({ color: wOpt.hex, metalness: 0.9, roughness: 0.16 })
    );
    rimMesh.rotation.z = Math.PI / 2;
    rimMesh.position.set(15.05, 1.75, -7.2 + wIdx * 1.2);
    showroomGroup.add(rimMesh);
  });

  // C) East Rear VIP Signing Table & Lounge Chairs (local X = +13.6, Z = -32.0)
  const signingDesk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.78, 2.6), obsidianSteelMat);
  signingDesk.position.set(13.6, 0.43, -32.0);
  showroomGroup.add(signingDesk);
  const signingTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 2.7), silverCladdingMat);
  signingTop.position.set(13.6, 0.84, -32.0);
  showroomGroup.add(signingTop);

  // 12. NINE PORSCHE DISPLAY PLATFORMS & 3D PORSCHE SPORTS CARS ACROSS 3 DEEP ZONES!
  // --- ZONE 1: FRONT FLAGSHIP GALLERY (localZ = +0.6..+1.0 -> worldZ = +8.4..+8.8) ---
  // 1) Center Hero Rotating Turntable: 911 GT3 RS (live customizable via UI!)
  const turntableGroup = new THREE.Group();
  turntableGroup.position.set(0, 0.08, 0.6);
  turntableGroup.userData.noMerge = true;

  const plinthDisc = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.35, 0.14, 48), obsidianSteelMat);
  plinthDisc.position.y = 0.07;
  turntableGroup.add(plinthDisc);

  const plinthGlowRing = new THREE.Mesh(new THREE.TorusGeometry(3.22, 0.045, 10, 48), redLedMat);
  plinthGlowRing.rotation.x = Math.PI / 2;
  plinthGlowRing.position.y = 0.13;
  turntableGroup.add(plinthGlowRing);

  const heroCarResult = createPorscheCarMesh({
    bodyStyle: 'gt3rs',
    paintHex: 0xd91c24,
    rimHex: 0xc9a86a,
    headlightsOn: true,
  });
  heroCarResult.root.position.set(0, 0.14, 0);
  heroCarResult.root.rotation.y = Math.PI * 0.16;
  turntableGroup.add(heroCarResult.root);
  showroomGroup.add(turntableGroup);

  const addStaticDisplayCar = (
    lx: number,
    lz: number,
    rotY: number,
    bodyStyle: 'gt3rs' | 'taycan' | 'cayman' | 'turbos' | 'suv',
    paintHex: number,
    rimHex: number,
    ringMat?: THREE.Material
  ) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 3.0, 0.12, 36), obsidianSteelMat);
    plinth.position.set(lx, 0.14, lz);
    showroomGroup.add(plinth);

    if (ringMat) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.90, 0.035, 8, 36), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lx, 0.20, lz);
      showroomGroup.add(ring);
    }

    const car = createPorscheCarMesh({ bodyStyle, paintHex, rimHex, headlightsOn: true });
    car.root.position.set(lx, 0.20, lz);
    car.root.rotation.y = rotY;
    showroomGroup.add(car.root);
  };

  // 2) West Front: Porsche Taycan Turbo S (Frozen Blue Metallic)
  addStaticDisplayCar(-10.2, 1.0, 0.36, 'taycan', 0x67a3c9, 0xe2e8f0);
  // 3) East Front: Porsche 718 Cayman GT4 RS (Racing Yellow)
  addStaticDisplayCar(10.2, 1.0, -0.36, 'cayman', 0xfacc15, 0x18181b);

  // --- ZONE 2: MID 911 PERFORMANCE GALLERY (localZ = -11.8 -> worldZ = -4.0) ---
  // 4) West Mid: Porsche 911 Turbo S (GT Silver Metallic)
  addStaticDisplayCar(-10.2, -11.8, 0.34, 'turbos', 0x9ca3af, 0xe2e8f0);
  // 5) East Mid: Porsche 911 Carrera GTS T-Hybrid (Miami Blue)
  addStaticDisplayCar(10.2, -11.8, -0.34, 'turbos', 0x06b6d4, 0x18181b);

  // --- ZONE 3: DEEP MOTORSPORT, SUV & EXCLUSIVE MANUFAKTUR WING (localZ = -22.5..-32.0 -> worldZ = -14.7..-24.2) ---
  // 6) West Deep: Porsche Cayenne Turbo GT (Chalk White)
  addStaticDisplayCar(-10.2, -23.8, 0.30, 'suv', 0xd6d3cd, 0xc9a86a);
  // 7) Center Deep: Porsche 911 Turbo S Exclusive Series (Jet Black Metallic + Gold Trim)
  addStaticDisplayCar(0, -22.5, 0.20, 'turbos', 0x111827, 0xc9a86a, champagneGoldMat);
  // 8) East Deep: Porsche 911 GT3 RS Weissach (Python Green)
  addStaticDisplayCar(10.2, -23.8, -0.30, 'gt3rs', 0x16a34a, 0x18181b);
  // 9) Rear Flagship Heritage Podium (localX = 0, localZ = -32.2 -> worldZ = -24.4): Porsche 911 GT3 RS Track Spec (Miami Blue + Gold Rims)
  addStaticDisplayCar(0, -32.2, 0.32, 'gt3rs', 0x06b6d4, 0xc9a86a, redLedMat);

  let wasOpen: boolean | null = null;
  let closingElapsed = 0;

  const updateOperatingHours = (
    rawHour: number,
    delta: number,
    npcController?: PorscheShowroomNpcController | null
  ) => {
    const isOpen = isPorscheShowroomOpenAtHour(rawHour);
    const snapImmediate =
      (wasOpen === null && !isOpen) ||
      (!isOpen && (rawHour < 7.0 || rawHour >= 21.35) && wasOpen === false && closingElapsed === 0);

    if (isOpen) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, Math.max(0, mainShutter.progress - delta * 1.1));
    } else if (snapImmediate) {
      closingElapsed = 0;
      setShutterProgress(mainShutter, 1.0);
    } else {
      closingElapsed += delta;
      const canClose = closingElapsed >= 18.0 || Boolean(npcController?.isFullyClosedAndEmpty());
      if (canClose && closingElapsed >= 0.8) {
        setShutterProgress(mainShutter, Math.min(1.0, mainShutter.progress + delta * 0.72));
      }
    }
    wasOpen = isOpen;

    const litScale = 1 - mainShutter.progress;
    ceilingLightMat.emissiveIntensity = 1.3 * litScale;
    interiorWallMat.emissiveIntensity = 0.16 * litScale;
    redLedMat.emissiveIntensity = 1.15 * litScale;
    conciergeScreenMat.emissiveIntensity = 0.48 * litScale;
    for (const m of specBoardMats) m.emissiveIntensity = 0.42 * litScale;
    for (const m of posterMats) m.emissiveIntensity = 0.28 * litScale;
  };

  return {
    staticGroup: showroomGroup,
    turntableGroup,
    heroCarResult,
    doorLeft,
    doorRight,
    neonMats,
    interiorPointLights,
    updateOperatingHours,
    getClosedFactor: () => mainShutter.progress,
  };
}

interface ShowroomAdvisorEntry {
  group: THREE.Group;
  head: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  phase: number;
  baseYaw: number;
  homePos: THREE.Vector3;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitPhaseRef?: { phase: number };
  exitDone?: boolean;
  glbHandle: GlbHumanHandle;
}

interface ShowroomPatrolVisitor {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  waypoints: Array<{ x: number; z: number }>;
  wpIndex: number;
  speed: number;
  pauseTimer: number;
  walkCycle: number;
  homePos: THREE.Vector3;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitPhaseRef?: { phase: number };
  exitDone?: boolean;
  glbHandle: GlbHumanHandle;
}

interface ShowroomStaticVisitor {
  group: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  phase: number;
  baseYaw: number;
  homePos: THREE.Vector3;
  exitPath?: THREE.Vector3[];
  exitWpRef?: { idx: number };
  exitPhaseRef?: { phase: number };
  exitDone?: boolean;
  glbHandle: GlbHumanHandle;
}

export class PorscheShowroomNpcController {
  public rootGroup: THREE.Group = new THREE.Group();
  private advisors: ShowroomAdvisorEntry[] = [];
  private patrolVisitors: ShowroomPatrolVisitor[] = [];
  private staticVisitors: ShowroomStaticVisitor[] = [];
  private timer = 0;
  private isOpenState: boolean | null = null;
  private closingActive = false;
  private closingTimer = 0;
  private fullyClosedAndEmpty = false;

  constructor(helpers: PorscheCharacterHelpers) {
    // === 5 PORSCHE SALES ADVISORS ("SALER") IN TAILORED SUITS & RED PORSCHE TIES ===
    const advisorDefs = [
      // 1. Front Welcome Host behind Welcome Podium (world X = 63.8, Z = 11.75)
      { x: 63.8, z: 11.75, yaw: 0.15, suit: 0x0f172a, pants: 0x090d14, tie: 0xd91c24, skin: '#f8d9c0', expr: 'smile', phase: 0.0 },
      // 2. Concierge Advisor Left behind Central Desk (world X = 66.8, Z = -5.0)
      { x: 66.8, z: -5.0, yaw: 0.1, suit: 0x1e293b, pants: 0x0f172a, tie: 0xd91c24, skin: '#f1c9a5', expr: 'smile', phase: 1.1 },
      // 3. Concierge Advisor Right behind Central Desk (world X = 69.2, Z = -5.0)
      { x: 69.2, z: -5.0, yaw: -0.1, suit: 0x1e293b, pants: 0x0f172a, tie: 0xd4af37, skin: '#e8be9e', expr: 'smile', phase: 2.3 },
      // 4. West Performance Specialist presenting 911 Turbo S (world X = 61.4, Z = -2.2)
      { x: 61.4, z: -2.2, yaw: -1.1, suit: 0x0f172a, pants: 0x18181b, tie: 0xd91c24, skin: '#f5cfa0', expr: 'smile', phase: 3.5 },
      // 5. Deep Motorsport Specialist presenting Rear 911 GT3 RS (world X = 63.6, Z = -23.0)
      { x: 63.6, z: -23.0, yaw: 1.25, suit: 0x1e293b, pants: 0x0f172a, tie: 0xd91c24, skin: '#f8d9c0', expr: 'smile', phase: 4.7 },
    ];

    advisorDefs.forEach((def, idx) => {
      const npc = this.buildNpc(helpers, def.suit, def.pants, def.tie, def.skin, def.expr, true);
      npc.group.position.set(def.x, 0.08, def.z);
      npc.group.rotation.y = def.yaw;
      this.rootGroup.add(npc.group);
      const spec = idx <= 2 ? CASHIER_NPC_MODEL : pickStationaryCivilianModel(idx * 3 + 1);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: npc.group,
        fallbackMeshes: [npc.fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Idle',
        phaseOffset: def.phase,
      });
      this.advisors.push({
        group: npc.group,
        head: npc.head,
        rightArm: npc.rightArm,
        leftArm: npc.leftArm,
        leftLeg: npc.leftLeg,
        rightLeg: npc.rightLeg,
        phase: def.phase,
        baseYaw: def.yaw,
        homePos: new THREE.Vector3(def.x, 0.08, def.z),
        glbHandle,
      });
    });

    // === 4 ANIMATED WALKING NPC BROWSERS ("NPC XEM XE") TOURING THE DEEP SHOWROOM ===
    const patrolDefs: Array<{
      shirt: number;
      pants: number;
      tie: number;
      skin: string;
      speed: number;
      waypoints: Array<{ x: number; z: number }>;
    }> = [
      // Browser 1: Loops around Front Hero 911 GT3 RS & Taycan
      {
        shirt: 0x334155,
        pants: 0x18181b,
        tie: 0x38bdf8,
        skin: '#f1c9a5',
        speed: 1.15,
        waypoints: [
          { x: 64.2, z: 10.6 },
          { x: 64.2, z: 5.2 },
          { x: 71.8, z: 5.2 },
          { x: 71.8, z: 11.4 },
          { x: 68.0, z: 12.2 },
        ],
      },
      // Browser 2: Walks the full 40m West Gallery from Taycan -> 911 Turbo S -> Cayenne Turbo GT
      {
        shirt: 0x155e75,
        pants: 0x1e293b,
        tie: 0x0ea5e9,
        skin: '#f8d9c0',
        speed: 1.35,
        waypoints: [
          { x: 62.6, z: 10.0 },
          { x: 62.8, z: -0.5 },
          { x: 62.8, z: -8.0 },
          { x: 62.8, z: -15.5 },
          { x: 62.6, z: -21.5 },
          { x: 62.8, z: -8.0 },
        ],
      },
      // Browser 3: Walks the full 40m East Gallery from Cayman GT4 RS -> Carrera GTS -> Python Green GT3 RS -> PTS Wall
      {
        shirt: 0x7c2d12,
        pants: 0x27272a,
        tie: 0xfacc15,
        skin: '#e8be9e',
        speed: 1.25,
        waypoints: [
          { x: 73.2, z: 9.5 },
          { x: 73.2, z: -1.5 },
          { x: 73.4, z: -9.5 },
          { x: 73.2, z: -16.5 },
          { x: 81.2, z: -11.0 },
          { x: 73.4, z: -3.5 },
        ],
      },
      // Browser 4: Deep Motorsport Wing browser inspecting Jet Black Turbo S, Cayenne & Rear GT3 RS
      {
        shirt: 0x3f3f46,
        pants: 0x090d14,
        tie: 0xef4444,
        skin: '#f5cfa0',
        speed: 1.1,
        waypoints: [
          { x: 64.5, z: -13.0 },
          { x: 64.5, z: -19.5 },
          { x: 72.2, z: -21.5 },
          { x: 72.5, z: -14.5 },
          { x: 68.0, z: -10.5 },
        ],
      },
    ];

    patrolDefs.forEach((pd, idx) => {
      const npc = this.buildNpc(helpers, pd.shirt, pd.pants, pd.tie, pd.skin, 'neutral', false);
      npc.group.position.set(pd.waypoints[0].x, 0.08, pd.waypoints[0].z);
      this.rootGroup.add(npc.group);
      const spec = pickOutsideNpcModel(idx * 5 + 3);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: npc.group,
        fallbackMeshes: [npc.fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Walk',
        phaseOffset: idx * 1.1,
      });
      this.patrolVisitors.push({
        group: npc.group,
        leftLeg: npc.leftLeg,
        rightLeg: npc.rightLeg,
        leftArm: npc.leftArm,
        rightArm: npc.rightArm,
        waypoints: pd.waypoints,
        wpIndex: 1,
        speed: pd.speed,
        pauseTimer: 0,
        walkCycle: Math.random() * Math.PI * 2,
        homePos: new THREE.Vector3(pd.waypoints[0].x, 0.08, pd.waypoints[0].z),
        glbHandle,
      });
    });

    // === 4 STATIONARY ADMIRING / CONSULTING VISITORS BESIDE VEHICLES & DESK ===
    const staticDefs = [
      // Visitor admiring Yellow 718 Cayman GT4 RS
      { x: 74.4, z: 10.8, yaw: -2.2, shirt: 0x1d4ed8, pants: 0x1e293b, tie: 0x93c5fd, skin: '#f8d9c0', phase: 0.4 },
      // Visitor consulting at Central Concierge Desk
      { x: 67.6, z: -2.3, yaw: Math.PI, shirt: 0x475569, pants: 0x0f172a, tie: 0xf8fafc, skin: '#f1c9a5', phase: 1.6 },
      // Visitor listening to West Specialist near 911 Turbo S
      { x: 62.2, z: -3.8, yaw: 0.75, shirt: 0x065f46, pants: 0x18181b, tie: 0x6ee7b7, skin: '#e8be9e', phase: 2.8 },
      // Visitor admiring Rear Heritage 911 GT3 RS Podium
      { x: 71.8, z: -25.0, yaw: 2.1, shirt: 0x581c87, pants: 0x18181b, tie: 0xe9d5ff, skin: '#f5cfa0', phase: 4.1 },
    ];

    staticDefs.forEach((sd, idx) => {
      const npc = this.buildNpc(helpers, sd.shirt, sd.pants, sd.tie, sd.skin, 'smile', false);
      npc.group.position.set(sd.x, 0.08, sd.z);
      npc.group.rotation.y = sd.yaw;
      this.rootGroup.add(npc.group);
      const spec = pickStationaryCivilianModel(idx * 3 + 5);
      const glbHandle = attachGlbHumanToNpc({
        modelSource: spec.modelSource,
        hostGroup: npc.group,
        fallbackMeshes: [npc.fallbackGroup],
        targetHeight: spec.targetHeight,
        clipProfile: spec.clipProfile,
        rotationY: spec.rotationY,
        initialState: 'Idle',
        phaseOffset: sd.phase,
      });
      this.staticVisitors.push({
        group: npc.group,
        head: npc.head,
        leftArm: npc.leftArm,
        rightArm: npc.rightArm,
        leftLeg: npc.leftLeg,
        rightLeg: npc.rightLeg,
        phase: sd.phase,
        baseYaw: sd.yaw,
        homePos: new THREE.Vector3(sd.x, 0.08, sd.z),
        glbHandle,
      });
    });
  }

  private buildNpc(
    helpers: PorscheCharacterHelpers,
    shirtHex: number,
    pantsHex: number,
    tieHex: number,
    skinHex: string,
    expr: string,
    isAdvisor: boolean
  ) {
    const group = new THREE.Group();
    const fallbackGroup = new THREE.Group();
    group.add(fallbackGroup);
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.78 });
    const tieMat = new THREE.MeshStandardMaterial({ color: tieHex, roughness: 0.48 });

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    leftLeg.position.set(-0.1, 0.36, 0);
    fallbackGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), pantsMat);
    rightLeg.position.set(0.1, 0.36, 0);
    fallbackGroup.add(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtMat);
    torso.position.set(0, 1.01, 0);
    fallbackGroup.add(torso);

    // Porsche Advisors wear crisp tie + silver name badge; visitors wear casual collar/accent
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(isAdvisor ? 0.065 : 0.09, isAdvisor ? 0.34 : 0.16, 0.02),
      tieMat
    );
    tie.position.set(0, isAdvisor ? 1.04 : 1.18, 0.125);
    fallbackGroup.add(tie);

    if (isAdvisor) {
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.045, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.2 })
      );
      badge.position.set(0.12, 1.14, 0.126);
      fallbackGroup.add(badge);
    }

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    leftArm.position.set(-0.29, 1.02, 0);
    fallbackGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), shirtMat);
    rightArm.position.set(0.29, 1.02, 0);
    fallbackGroup.add(rightArm);

    const faceTex = helpers.createFaceTexture(expr, skinHex);
    const head = helpers.createHeadMesh(skinMat, faceTex, 0.32, 0.32, 0.32);
    head.position.set(0, 1.48, 0);
    fallbackGroup.add(head);

    return { group, fallbackGroup, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  private buildShowroomExitPath(pos: THREE.Vector3, idx: number): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    const laneX = pos.x < 68.0 ? 63.2 : 72.8;
    if (pos.z < 11.5) {
      pts.push(new THREE.Vector3(laneX, 0.08, Math.min(pos.z + 2.0, 11.8)));
      pts.push(new THREE.Vector3(laneX, 0.08, 12.2));
    }
    pts.push(new THREE.Vector3(68.0, 0.08, 13.8));
    pts.push(new THREE.Vector3(68.0, 0.08, 16.5));
    pts.push(new THREE.Vector3(68.0, 0.08, 18.8));
    pts.push(new THREE.Vector3(idx % 2 === 0 ? 52.0 : 84.0, 0.08, 19.2));
    return pts;
  }

  private beginClosingEvacuation() {
    this.closingActive = true;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    let idx = 0;
    for (const adv of this.advisors) {
      adv.group.visible = true;
      adv.exitPath = this.buildShowroomExitPath(adv.group.position, idx++);
      adv.exitWpRef = { idx: 0 };
      adv.exitPhaseRef = { phase: adv.phase };
      adv.exitDone = false;
      adv.glbHandle.setAnimState('Walk', 1.3);
    }
    for (const pv of this.patrolVisitors) {
      pv.group.visible = true;
      pv.exitPath = this.buildShowroomExitPath(pv.group.position, idx++);
      pv.exitWpRef = { idx: 0 };
      pv.exitPhaseRef = { phase: pv.walkCycle };
      pv.exitDone = false;
      pv.glbHandle.setAnimState('Walk', 1.3);
    }
    for (const vis of this.staticVisitors) {
      vis.group.visible = true;
      vis.exitPath = this.buildShowroomExitPath(vis.group.position, idx++);
      vis.exitWpRef = { idx: 0 };
      vis.exitPhaseRef = { phase: vis.phase };
      vis.exitDone = false;
      vis.glbHandle.setAnimState('Walk', 1.3);
    }
  }

  private hideAllNpcsImmediate() {
    this.closingActive = false;
    this.fullyClosedAndEmpty = true;
    for (const adv of this.advisors) {
      adv.group.visible = false;
      adv.exitDone = true;
    }
    for (const pv of this.patrolVisitors) {
      pv.group.visible = false;
      pv.exitDone = true;
    }
    for (const vis of this.staticVisitors) {
      vis.group.visible = false;
      vis.exitDone = true;
    }
  }

  private restoreForOpen() {
    this.closingActive = false;
    this.closingTimer = 0;
    this.fullyClosedAndEmpty = false;
    for (const adv of this.advisors) {
      adv.group.position.copy(adv.homePos);
      adv.group.rotation.y = adv.baseYaw;
      adv.leftLeg.rotation.x = 0;
      adv.rightLeg.rotation.x = 0;
      adv.leftArm.rotation.x = 0;
      adv.rightArm.rotation.x = 0;
      adv.group.visible = true;
      adv.exitDone = false;
      adv.glbHandle.setAnimState('Idle');
    }
    for (const pv of this.patrolVisitors) {
      pv.group.position.copy(pv.homePos);
      pv.wpIndex = 1;
      pv.pauseTimer = 0;
      pv.leftLeg.rotation.x = 0;
      pv.rightLeg.rotation.x = 0;
      pv.leftArm.rotation.x = 0;
      pv.rightArm.rotation.x = 0;
      pv.group.visible = true;
      pv.exitDone = false;
      pv.glbHandle.setAnimState('Walk');
    }
    for (const vis of this.staticVisitors) {
      vis.group.position.copy(vis.homePos);
      vis.group.rotation.y = vis.baseYaw;
      vis.leftLeg.rotation.x = 0;
      vis.rightLeg.rotation.x = 0;
      vis.leftArm.rotation.x = 0;
      vis.rightArm.rotation.x = 0;
      vis.group.visible = true;
      vis.exitDone = false;
      vis.glbHandle.setAnimState('Idle');
    }
  }

  public hasExitingNpcNearDoor(): boolean {
    if (!this.closingActive) return false;
    const near = (p: THREE.Vector3, visible: boolean) =>
      visible && p.x >= 65.0 && p.x <= 71.0 && p.z >= 12.2 && p.z <= 19.2;
    for (const adv of this.advisors) if (near(adv.group.position, adv.group.visible)) return true;
    for (const pv of this.patrolVisitors) if (near(pv.group.position, pv.group.visible)) return true;
    for (const vis of this.staticVisitors) if (near(vis.group.position, vis.group.visible)) return true;
    return false;
  }

  public isFullyClosedAndEmpty(): boolean {
    return this.fullyClosedAndEmpty;
  }

  public update(delta: number, rawHour: number = 12.0) {
    const isOpen = isPorscheShowroomOpenAtHour(rawHour);

    if (this.isOpenState === null) {
      this.isOpenState = isOpen;
      if (!isOpen) {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (this.isOpenState && !isOpen) {
      this.isOpenState = false;
      if (rawHour >= 21.0 && rawHour < 21.35) {
        this.beginClosingEvacuation();
      } else {
        this.hideAllNpcsImmediate();
        return;
      }
    } else if (!this.isOpenState && isOpen) {
      this.isOpenState = true;
      this.restoreForOpen();
    } else if (!isOpen && !this.closingActive) {
      return;
    }

    if (!isOpen && this.closingActive) {
      this.closingTimer += delta;
      let anyRemaining = false;
      const stepMember = (
        m: {
          group: THREE.Group;
          leftLeg: THREE.Object3D;
          rightLeg: THREE.Object3D;
          leftArm: THREE.Object3D;
          rightArm: THREE.Object3D;
          exitPath?: THREE.Vector3[];
          exitWpRef?: { idx: number };
          exitPhaseRef?: { phase: number };
          exitDone?: boolean;
        }
      ) => {
        if (m.exitDone || !m.group.visible) return;
        if (!m.exitPath || !m.exitWpRef || !m.exitPhaseRef) {
          m.group.visible = false;
          m.exitDone = true;
          return;
        }
        const finished = advanceNpcExitPath(
          m.group,
          m.exitPath,
          m.exitWpRef,
          2.25,
          delta,
          { legL: m.leftLeg, legR: m.rightLeg, armL: m.leftArm, armR: m.rightArm },
          m.exitPhaseRef
        );
        if (finished) {
          m.group.visible = false;
          m.exitDone = true;
        } else {
          anyRemaining = true;
        }
      };

      for (const adv of this.advisors) stepMember(adv);
      for (const pv of this.patrolVisitors) stepMember(pv);
      for (const vis of this.staticVisitors) stepMember(vis);

      if (!anyRemaining || this.closingTimer >= 28.0) {
        this.hideAllNpcsImmediate();
      }
      return;
    }

    this.timer += delta;

    // Animate 5 Sales Advisors (welcoming nods & presenting hand gestures)
    this.advisors.forEach((adv) => {
      const t = this.timer + adv.phase;
      adv.head.rotation.y = 0.22 * Math.sin(t * 0.95);
      adv.rightArm.rotation.x = -0.38 + 0.16 * Math.sin(t * 1.9);
      adv.leftArm.rotation.x = -0.12 + 0.08 * Math.cos(t * 1.4);
    });

    // Animate 4 Stationary Car-Admiring Visitors
    this.staticVisitors.forEach((vis) => {
      const t = this.timer + vis.phase;
      vis.head.rotation.y = 0.28 * Math.sin(t * 0.75);
      vis.head.rotation.x = 0.08 * Math.sin(t * 1.1);
      vis.rightArm.rotation.x = -0.2 + 0.1 * Math.sin(t * 1.5);
    });

    // Animate 4 Patrolling Showroom Visitors walking smoothly between display zones
    this.patrolVisitors.forEach((pv) => {
      if (pv.pauseTimer > 0) {
        pv.glbHandle.setAnimState('Idle');
        pv.pauseTimer -= delta;
        pv.leftLeg.rotation.x = THREE.MathUtils.lerp(pv.leftLeg.rotation.x, 0, delta * 8);
        pv.rightLeg.rotation.x = THREE.MathUtils.lerp(pv.rightLeg.rotation.x, 0, delta * 8);
        pv.leftArm.rotation.x = THREE.MathUtils.lerp(pv.leftArm.rotation.x, 0, delta * 8);
        pv.rightArm.rotation.x = THREE.MathUtils.lerp(pv.rightArm.rotation.x, 0, delta * 8);
        return;
      }

      pv.glbHandle.setAnimState('Walk');
      const target = pv.waypoints[pv.wpIndex];
      const dx = target.x - pv.group.position.x;
      const dz = target.z - pv.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.22) {
        pv.wpIndex = (pv.wpIndex + 1) % pv.waypoints.length;
        pv.pauseTimer = 1.4 + (pv.wpIndex % 3) * 0.8; // Pause to admire each Porsche!
        return;
      }

      const step = Math.min(dist, pv.speed * delta);
      pv.group.position.x += (dx / dist) * step;
      pv.group.position.z += (dz / dist) * step;

      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - pv.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      pv.group.rotation.y += diff * Math.min(1, delta * 7.5);

      pv.walkCycle += delta * 5.2;
      const swing = Math.sin(pv.walkCycle) * 0.38;
      pv.leftLeg.rotation.x = swing;
      pv.rightLeg.rotation.x = -swing;
      pv.leftArm.rotation.x = -swing * 0.6;
      pv.rightArm.rotation.x = swing * 0.6;
    });
  }
}
