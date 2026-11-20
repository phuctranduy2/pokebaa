import * as THREE from 'three';

export type YachtStyle = 'catamaran' | 'flybridge_superyacht';

export interface YachtBuildOptions {
  style: YachtStyle;
  accentColor?: number;
  scale?: number;
  showWake?: boolean;
}

export interface BuiltYachtHandle {
  group: THREE.Group;
  warmGlowMats: THREE.MeshStandardMaterial[];
  waterGlowMats: THREE.MeshStandardMaterial[];
  nightHaloMats: THREE.MeshBasicMaterial[];
  radarScanner?: THREE.Object3D;
  wakeMeshes: THREE.Mesh[];
}

let cachedWaterHaloTex: THREE.CanvasTexture | null = null;
function getWaterHaloTexture(): THREE.CanvasTexture | null {
  if (cachedWaterHaloTex) return cachedWaterHaloTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.32, 'rgba(186, 230, 253, 0.65)');
  g.addColorStop(0.68, 'rgba(56, 189, 248, 0.22)');
  g.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedWaterHaloTex = tex;
  return cachedWaterHaloTex;
}

// ---------------------------------------------------------------------------
// 1. PROCEDURAL BURMESE TEAK DECK TEXTURE (Cached Singleton)
// ---------------------------------------------------------------------------
let cachedTeakTex: THREE.CanvasTexture | null = null;

function getTeakDeckTexture(): THREE.CanvasTexture | null {
  if (cachedTeakTex) return cachedTeakTex;
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#c4935c';
  ctx.fillRect(0, 0, size, size);

  const plankW = 16;
  const plankCount = size / plankW;
  for (let p = 0; p < plankCount; p++) {
    const x = p * plankW;
    // Subtle deterministic variation per plank
    const h = Math.sin(p * 12.9898 + 1.7) * 43758.5453;
    const rnd = h - Math.floor(h);
    const r = Math.round(182 + (rnd - 0.5) * 26);
    const g = Math.round(134 + (rnd - 0.5) * 22);
    const b = Math.round(80 + (rnd - 0.5) * 16);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, 0, plankW - 2, size);

    // Subtle longitudinal wood grain lines
    ctx.fillStyle = `rgba(92, 56, 26, ${0.06 + rnd * 0.08})`;
    for (let gLine = 0; gLine < 3; gLine++) {
      const gx = x + 2 + ((p * 5 + gLine * 4) % (plankW - 5));
      ctx.fillRect(gx, 0, 1, size);
    }

    // Crisp marine dark caulking seam
    ctx.fillStyle = '#2b1e14';
    ctx.fillRect(x + plankW - 2, 0, 2, size);
  }

  // Occasional cross butt-joints
  ctx.fillStyle = 'rgba(43, 30, 20, 0.72)';
  for (let p = 0; p < plankCount; p += 2) {
    const yJoint = ((p * 137) % (size - 40)) + 20;
    ctx.fillRect(p * plankW, yJoint, plankW - 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.2, 4.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cachedTeakTex = tex;
  return cachedTeakTex;
}

// ---------------------------------------------------------------------------
// 2. SHARED YACHT MATERIALS
// ---------------------------------------------------------------------------
interface SharedBaseYachtMaterials {
  hullWhiteMat: THREE.MeshPhysicalMaterial;
  bootTopMat: THREE.MeshStandardMaterial;
  smokedGlassMat: THREE.MeshPhysicalMaterial;
  skylightGlassMat: THREE.MeshStandardMaterial;
  teakMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshStandardMaterial;
  blackMullionMat: THREE.MeshStandardMaterial;
  cushionCreamMat: THREE.MeshStandardMaterial;
  cushionDarkMat: THREE.MeshStandardMaterial;
  navPortMat: THREE.MeshStandardMaterial;
  navStbdMat: THREE.MeshStandardMaterial;
  navMastMat: THREE.MeshStandardMaterial;
  wakeFoamMat: THREE.MeshStandardMaterial;
}

let cachedBaseMats: SharedBaseYachtMaterials | null = null;

function getSharedBaseYachtMaterials(): SharedBaseYachtMaterials {
  if (cachedBaseMats) return cachedBaseMats;
  const teakTex = getTeakDeckTexture();

  cachedBaseMats = {
    hullWhiteMat: new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.20,
      metalness: 0.05,
      clearcoat: 0.85,
      clearcoatRoughness: 0.14,
    }),
    bootTopMat: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.42,
      metalness: 0.18,
    }),
    smokedGlassMat: new THREE.MeshPhysicalMaterial({
      color: 0x132036,
      roughness: 0.06,
      metalness: 0.62,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.65,
    }),
    skylightGlassMat: new THREE.MeshStandardMaterial({
      color: 0x162438,
      roughness: 0.14,
      metalness: 0.58,
    }),
    teakMat: new THREE.MeshStandardMaterial({
      color: teakTex ? 0xffffff : 0xc08a52,
      ...(teakTex ? { map: teakTex } : {}),
      roughness: 0.72,
      metalness: 0.04,
    }),
    steelMat: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.16,
      metalness: 0.90,
    }),
    blackMullionMat: new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.34,
      metalness: 0.35,
    }),
    cushionCreamMat: new THREE.MeshStandardMaterial({
      color: 0xf3ede0,
      roughness: 0.82,
      metalness: 0.02,
    }),
    cushionDarkMat: new THREE.MeshStandardMaterial({
      color: 0x262d38,
      roughness: 0.78,
      metalness: 0.04,
    }),
    navPortMat: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    }),
    navStbdMat: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    }),
    navMastMat: new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfde047,
      emissiveIntensity: 0.65,
      roughness: 0.22,
    }),
    wakeFoamMat: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.12,
      roughness: 0.55,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  };
  return cachedBaseMats;
}

// ---------------------------------------------------------------------------
// 3. GEOMETRY HELPERS
// ---------------------------------------------------------------------------
function addTubeSegment(
  parent: THREE.Object3D,
  p0: readonly [number, number, number],
  p1: readonly [number, number, number],
  radius: number,
  mat: THREE.Material,
  radialSegments = 8
): THREE.Mesh {
  const a = new THREE.Vector3(p0[0], p0[1], p0[2]);
  const b = new THREE.Vector3(p1[0], p1[1], p1[2]);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, Math.max(0.01, len), radialSegments);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  if (len > 1e-4) {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }
  parent.add(mesh);
  return mesh;
}

function addPolylineRail(
  parent: THREE.Object3D,
  pts: ReadonlyArray<readonly [number, number, number]>,
  railH: number,
  mat: THREE.Material,
  addMidRail = true
) {
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z] = pts[i];
    addTubeSegment(parent, [x, y, z], [x, y + railH, z], 0.022, mat, 7);
    if (i < pts.length - 1) {
      const [nx, ny, nz] = pts[i + 1];
      addTubeSegment(parent, [x, y + railH, z], [nx, ny + railH, nz], 0.024, mat, 7);
      if (addMidRail) {
        addTubeSegment(parent, [x, y + railH * 0.5, z], [nx, ny + railH * 0.5, nz], 0.014, mat, 6);
      }
    }
  }
}

function addBoxMesh(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function addWakeTrail(parent: THREE.Object3D, xOff: number, zStart: number, width: number, wakeMat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.35, 0);
  shape.lineTo(width * 0.35, 0);
  shape.lineTo(width * 1.15, 5.8);
  shape.lineTo(-width * 1.15, 5.8);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, wakeMat);
  mesh.position.set(xOff, 0.03, zStart);
  parent.add(mesh);
  return mesh;
}

function addNightWaterGlowRig(
  parent: THREE.Object3D,
  waterGlowMats: THREE.MeshStandardMaterial[],
  nightHaloMats: THREE.MeshBasicMaterial[],
  glowColor: number,
  width: number,
  length: number
) {
  const haloTex = getWaterHaloTexture();
  const haloMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    ...(haloTex ? { map: haloTex } : {}),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  nightHaloMats.push(haloMat);

  // Soft luminous reflection pool on river surface right beneath the hull & stern
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(width, length), haloMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.015, -0.4);
  parent.add(pool);

  // Stern underwater spotlight halo behind swim platform
  const sternPool = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.85, 4.8), haloMat);
  sternPool.rotation.x = -Math.PI / 2;
  sternPool.position.set(0, 0.02, -length * 0.48 - 1.2);
  parent.add(sternPool);

  // Warm bow navigation / searchlight halo visible from bridges at night
  const bowHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c4,
    ...(haloTex ? { map: haloTex } : {}),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  nightHaloMats.push(bowHaloMat);
  const bowGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.2), bowHaloMat);
  bowGlow.rotation.x = -Math.PI / 2;
  bowGlow.position.set(0, 0.02, length * 0.48 + 1.4);
  parent.add(bowGlow);

  // Keep reference param used cleanly
  void waterGlowMats;
}

// ---------------------------------------------------------------------------
// 4. STYLE A — LUXURY POWER CATAMARAN (Faithful to Reference Image 1)
// ---------------------------------------------------------------------------
function buildLuxuryCatamaranYacht(
  mats: SharedBaseYachtMaterials,
  accentColor: number,
  showWake: boolean
): BuiltYachtHandle {
  const root = new THREE.Group();
  const warmGlowMats: THREE.MeshStandardMaterial[] = [];
  const waterGlowMats: THREE.MeshStandardMaterial[] = [];
  const nightHaloMats: THREE.MeshBasicMaterial[] = [];
  const wakeMeshes: THREE.Mesh[] = [];

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.32,
    metalness: 0.25,
  });
  const cabinLedMat = new THREE.MeshStandardMaterial({
    color: 0xffe4b5,
    emissive: 0xffb85c,
    emissiveIntensity: 0.15,
    roughness: 0.28,
  });
  const salonNightGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x132036,
    emissive: 0xffb347,
    emissiveIntensity: 0.0,
    roughness: 0.06,
    metalness: 0.58,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.65,
  });
  warmGlowMats.push(cabinLedMat, salonNightGlassMat);

  const underwaterLedMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: accentColor,
    emissiveIntensity: 0.12,
    roughness: 0.24,
  });
  waterGlowMats.push(underwaterLedMat);

  // 1. Twin Sculpted Catamaran Hull Sponsons (Profile in Z-Y extruded along X)
  // Shape coordinates: sx = +Z (forward), sy = +Y (up) -> rotateY(-PI/2) maps shape +X to +Z!
  const hullSideShape = new THREE.Shape();
  hullSideShape.moveTo(-6.95, -0.32); // stern keel
  hullSideShape.lineTo(6.62, -0.32);  // plumb bow forefoot
  hullSideShape.lineTo(6.84, 0.28);   // lower bow stem
  hullSideShape.lineTo(6.88, 1.18);   // plumb bow deck edge
  hullSideShape.lineTo(-3.65, 1.18);  // main sheer aft end
  hullSideShape.lineTo(-5.85, 0.28);  // stepped transom slope down to swim step
  hullSideShape.lineTo(-6.95, 0.28);  // stern swim step top
  hullSideShape.closePath();

  const sponsonWidth = 1.24;
  const sponsonGeo = new THREE.ExtrudeGeometry(hullSideShape, {
    depth: sponsonWidth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  sponsonGeo.translate(0, 0, -sponsonWidth * 0.5);
  sponsonGeo.rotateY(-Math.PI / 2);

  [-1.68, 1.68].forEach((sx) => {
    const sponson = new THREE.Mesh(sponsonGeo, mats.hullWhiteMat);
    sponson.position.x = sx;
    root.add(sponson);

    // Antifouling dark boot-top band along waterline (proud by 0.015m)
    addBoxMesh(root, sx, -0.14, -0.05, sponsonWidth + 0.11, 0.28, 13.68, mats.bootTopMat);

    // Accent shear stripe along upper hull gunwale
    const outerSign = Math.sign(sx);
    const outerWallX = sx + outerSign * (sponsonWidth * 0.5 + 0.045);
    addBoxMesh(root, outerWallX, 1.07, 1.50, 0.025, 0.055, 10.65, accentMat);

    // 3 Recessed Smoked-Glass Outer Hull Windows (glow warmly at night!)
    const winX = sx + outerSign * (sponsonWidth * 0.5 + 0.042);
    addBoxMesh(root, winX, 0.72, 4.45, 0.032, 0.26, 2.55, salonNightGlassMat);
    addBoxMesh(root, winX, 0.72, 1.35, 0.032, 0.26, 2.65, salonNightGlassMat);
    addBoxMesh(root, winX, 0.68, -2.05, 0.032, 0.24, 2.85, salonNightGlassMat);

    // Stern teak swim step cap & 4-tread stepped transom staircase
    addBoxMesh(root, sx, 0.33, -6.38, sponsonWidth - 0.06, 0.035, 1.12, mats.teakMat);
    for (let st = 0; st < 4; st++) {
      const f = (st + 0.5) / 4;
      const treadY = THREE.MathUtils.lerp(0.36, 1.12, f);
      const treadZ = THREE.MathUtils.lerp(-5.70, -3.85, f);
      addBoxMesh(root, sx, treadY, treadZ, sponsonWidth - 0.14, 0.045, 0.44, mats.teakMat);
    }

    // Side teak walkaround deck atop sponson gunwale
    addBoxMesh(root, sx, 1.23, -0.82, sponsonWidth - 0.14, 0.035, 5.82, mats.teakMat);
  });

  // 2. Bridgedeck Tunnel Underside & Spacious Full-Beam Teak Foredeck (z = +2.05 .. +6.82)
  addBoxMesh(root, 0, 0.90, 1.65, 3.36, 0.54, 10.20, mats.hullWhiteMat);
  addBoxMesh(root, 0, 1.21, 4.45, 4.42, 0.06, 4.65, mats.hullWhiteMat);
  addBoxMesh(root, 0, 1.255, 4.45, 4.24, 0.035, 4.45, mats.teakMat);

  // Twin plush bow sunpad loungers on the teak foredeck
  [-0.95, 0.95].forEach((px) => {
    addBoxMesh(root, px, 1.33, 4.15, 1.55, 0.11, 2.25, mats.cushionCreamMat);
    addBoxMesh(root, px, 1.43, 3.22, 1.55, 0.14, 0.48, mats.cushionCreamMat, -0.35, 0, 0);
  });
  // Foredeck windlass & chrome bow mooring cleats
  addBoxMesh(root, 0, 1.32, 6.25, 0.42, 0.11, 0.36, mats.steelMat);
  [-1.92, 1.92].forEach((cx) => {
    addBoxMesh(root, cx, 1.28, 6.38, 0.08, 0.06, 0.28, mats.steelMat);
    addBoxMesh(root, cx, 1.28, -3.55, 0.08, 0.06, 0.28, mats.steelMat);
  });

  // 3. Hydraulic Teak Swim Platform Centered Astern + Underwater Stern LED Strip
  addBoxMesh(root, 0, 0.29, -6.42, 2.18, 0.09, 1.98, mats.hullWhiteMat);
  addBoxMesh(root, 0, 0.35, -6.42, 2.08, 0.035, 1.88, mats.teakMat);
  addBoxMesh(root, 0, 0.29, -7.42, 2.22, 0.08, 0.05, mats.steelMat); // brushed stainless stern lip
  addBoxMesh(root, 0, 0.14, -5.42, 2.15, 0.08, 0.10, underwaterLedMat);
  [-1.68, 1.68].forEach((sx) => {
    addBoxMesh(root, sx, 0.12, -6.96, 1.10, 0.07, 0.08, underwaterLedMat);
  });
  [-0.78, 0.78].forEach((ax) => {
    addTubeSegment(root, [ax, 0.38, -5.18], [ax, 0.28, -5.58], 0.045, mats.steelMat, 8);
  });

  // 4. Main Salon Smoked-Glass Deckhouse & Open-Air Aft Dining Cockpit
  // Teak cockpit floor
  addBoxMesh(root, 0, 1.22, -3.28, 3.40, 0.04, 3.72, mats.teakMat);
  // Sculpted white deckhouse body + wraparound frameless smoked glass (glows warm golden-amber at night!)
  addBoxMesh(root, 0, 1.78, 0.45, 3.06, 1.06, 3.55, mats.blackMullionMat);
  addBoxMesh(root, 0, 1.80, 0.50, 3.14, 0.84, 3.32, salonNightGlassMat);
  addBoxMesh(root, 0, 1.84, 2.18, 2.98, 0.82, 0.16, salonNightGlassMat, -0.34, 0, 0);
  addBoxMesh(root, 0, 2.24, -1.32, 2.45, 0.06, 0.18, cabinLedMat);

  // Open-air aft dining cockpit furniture (L-sofa + teak table + curved stern sofa)
  addBoxMesh(root, 0, 1.48, -4.85, 2.65, 0.56, 0.58, mats.hullWhiteMat);
  addBoxMesh(root, 0, 1.82, -4.72, 2.52, 0.14, 0.48, mats.cushionCreamMat);
  addBoxMesh(root, 0, 1.98, -5.06, 2.52, 0.28, 0.16, mats.cushionDarkMat);
  addBoxMesh(root, -0.95, 1.44, -2.85, 0.72, 0.44, 1.95, mats.hullWhiteMat);
  addBoxMesh(root, -0.95, 1.70, -2.85, 0.68, 0.10, 1.88, mats.cushionCreamMat);
  addBoxMesh(root, 0.18, 1.68, -2.85, 0.92, 0.05, 1.45, mats.teakMat);
  addTubeSegment(root, [0.18, 1.24, -2.55], [0.18, 1.66, -2.55], 0.055, mats.steelMat, 8);
  addTubeSegment(root, [0.18, 1.24, -3.15], [0.18, 1.66, -3.15], 0.055, mats.steelMat, 8);

  // Sculpted white rear cockpit structural arch pillars flanking the aft lounge
  [-1.56, 1.56].forEach((px) => {
    addTubeSegment(root, [px, 1.24, -4.75], [px * 0.98, 2.44, -4.32], 0.11, mats.hullWhiteMat, 10);
  });

  // 5. Overhanging Flybridge Deck, Teak Sole, Upper Helm & Sculpted White Hardtop
  addBoxMesh(root, 0, 2.42, -1.28, 3.44, 0.18, 7.15, mats.hullWhiteMat);
  addBoxMesh(root, 0, 2.46, 2.22, 3.22, 0.18, 0.75, mats.hullWhiteMat, -0.22, 0, 0);
  addBoxMesh(root, 0, 2.525, -1.32, 3.16, 0.035, 6.62, mats.teakMat);
  // Warm perimeter overhang LED strips (visible from riverside promenade & bridges at night!)
  addBoxMesh(root, 0, 2.32, -4.65, 2.95, 0.05, 0.09, cabinLedMat);
  [-1.72, 1.72].forEach((ex) => {
    addBoxMesh(root, ex, 2.35, -1.25, 0.04, 0.05, 6.80, cabinLedMat);
  });

  // Upper flybridge helm console + cream lounge seating
  addBoxMesh(root, -0.45, 2.86, 0.75, 1.15, 0.62, 0.58, mats.hullWhiteMat);
  addBoxMesh(root, -0.45, 3.05, 0.65, 0.95, 0.18, 0.35, mats.blackMullionMat, -0.35, 0, 0);
  addBoxMesh(root, -0.45, 2.88, -0.15, 0.92, 0.52, 0.52, mats.cushionCreamMat);
  addBoxMesh(root, 0.96, 2.80, -1.55, 0.76, 0.52, 2.65, mats.hullWhiteMat);
  addBoxMesh(root, 0.96, 3.08, -1.55, 0.72, 0.11, 2.55, mats.cushionCreamMat);
  addBoxMesh(root, -0.05, 2.96, -1.85, 0.85, 0.05, 1.35, mats.teakMat);
  addTubeSegment(root, [-0.05, 2.54, -1.85], [-0.05, 2.94, -1.85], 0.05, mats.steelMat, 8);

  // Curved tinted flybridge windshield + diagonal black A-pillars + rear stainless struts
  addBoxMesh(root, 0, 2.94, 1.48, 2.75, 0.44, 0.12, mats.smokedGlassMat, -0.52, 0, 0);
  [-1.36, 1.36].forEach((px) => {
    addTubeSegment(root, [px, 2.52, 1.25], [px * 0.92, 3.74, -0.05], 0.075, mats.blackMullionMat, 8);
    addTubeSegment(root, [px * 0.98, 2.52, -4.35], [px * 0.94, 3.74, -4.15], 0.042, mats.steelMat, 8);
  });

  // Sculpted White Hardtop Canopy with Recessed Sunroof Glass, Underside Warm LED Perimeter, Radome & Antennas
  addBoxMesh(root, 0, 3.78, -2.05, 2.98, 0.13, 4.65, mats.hullWhiteMat);
  addBoxMesh(root, -0.70, 3.86, -1.45, 1.15, 0.025, 1.55, mats.skylightGlassMat);
  addBoxMesh(root, 0.70, 3.86, -1.45, 1.15, 0.025, 1.55, mats.skylightGlassMat);
  [-1.49, 1.49].forEach((hx) => {
    addBoxMesh(root, hx, 3.71, -2.05, 0.04, 0.04, 4.35, cabinLedMat);
  });
  addBoxMesh(root, 0, 3.71, -4.32, 2.75, 0.04, 0.05, cabinLedMat);
  // Marine radome & VHF antennas on hardtop
  const radome = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.28, 16), mats.hullWhiteMat);
  radome.position.set(0, 4.02, -1.95);
  root.add(radome);
  const radomeCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.hullWhiteMat);
  radomeCap.scale.y = 0.55;
  radomeCap.position.set(0, 4.16, -1.95);
  root.add(radomeCap);
  addTubeSegment(root, [0, 3.85, -2.55], [0, 4.46, -2.72], 0.032, mats.steelMat, 8);
  const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mats.navMastMat);
  mastLight.position.set(0, 4.48, -2.72);
  root.add(mastLight);
  [-0.95, 0.95].forEach((ax) => {
    addTubeSegment(root, [ax, 3.84, -2.35], [ax * 1.12, 4.68, -2.95], 0.012, mats.steelMat, 6);
  });

  // Port (Red) & Starboard (Green) Navigation Lights on flybridge brow cheeks
  const portLight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), mats.navPortMat);
  portLight.position.set(-1.72, 2.44, 1.85);
  root.add(portLight);
  const stbdLight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), mats.navStbdMat);
  stbdLight.position.set(1.72, 2.44, 1.85);
  root.add(stbdLight);

  // 6. Stainless Steel Bow Pulpit, Side Gunwale Safety Rails & Aft Flybridge Railing
  const bowSideStarboard: ReadonlyArray<readonly [number, number, number]> = [
    [2.24, 1.24, -3.55],
    [2.24, 1.24, -1.20],
    [2.24, 1.24, 1.40],
    [2.24, 1.24, 4.05],
    [2.24, 1.24, 6.70],
    [0.95, 1.24, 6.76],
    [-0.95, 1.24, 6.76],
    [-2.24, 1.24, 6.70],
    [-2.24, 1.24, 4.05],
    [-2.24, 1.24, 1.40],
    [-2.24, 1.24, -1.20],
    [-2.24, 1.24, -3.55],
  ];
  addPolylineRail(root, bowSideStarboard, 0.56, mats.steelMat, true);

  // Flybridge perimeter safety railing
  const flyRailPts: ReadonlyArray<readonly [number, number, number]> = [
    [-1.56, 2.52, -0.95],
    [-1.56, 2.52, -2.85],
    [-1.56, 2.52, -4.68],
    [0.0, 2.52, -4.68],
    [1.56, 2.52, -4.68],
    [1.56, 2.52, -2.85],
    [1.56, 2.52, -0.95],
  ];
  addPolylineRail(root, flyRailPts, 0.58, mats.steelMat, false);

  addNightWaterGlowRig(root, waterGlowMats, nightHaloMats, accentColor, 8.2, 15.0);

  if (showWake) {
    wakeMeshes.push(addWakeTrail(root, -1.68, -6.95, 0.85, mats.wakeFoamMat));
    wakeMeshes.push(addWakeTrail(root, 1.68, -6.95, 0.85, mats.wakeFoamMat));
  }

  return { group: root, warmGlowMats, waterGlowMats, nightHaloMats, wakeMeshes };
}

// ---------------------------------------------------------------------------
// 5. STYLE B — ITALIAN FLYBRIDGE SUPERYACHT (Faithful to Reference Image 2)
// ---------------------------------------------------------------------------
interface HullStation {
  z: number;
  halfBeam: number;
  sheerY: number;
  chineY: number;
  keelY: number;
}

const SUPERYACHT_STATIONS: readonly HullStation[] = [
  { z: 7.28, halfBeam: 0.04, sheerY: 1.48, chineY: 0.74, keelY: -0.26 }, // Vertical axe-bow stem
  { z: 6.45, halfBeam: 0.92, sheerY: 1.45, chineY: 0.56, keelY: -0.34 },
  { z: 4.85, halfBeam: 1.72, sheerY: 1.40, chineY: 0.34, keelY: -0.38 },
  { z: 2.65, halfBeam: 2.12, sheerY: 1.34, chineY: 0.16, keelY: -0.36 },
  { z: 0.00, halfBeam: 2.24, sheerY: 1.30, chineY: 0.08, keelY: -0.34 },
  { z: -3.20, halfBeam: 2.20, sheerY: 1.26, chineY: 0.06, keelY: -0.30 },
  { z: -6.25, halfBeam: 2.08, sheerY: 1.23, chineY: 0.06, keelY: -0.26 }, // Wide stern transom
];

function sampleHullAt(z: number): { halfBeam: number; sheerY: number; chineY: number; keelY: number } {
  const st = SUPERYACHT_STATIONS;
  if (z >= st[0].z) return st[0];
  if (z <= st[st.length - 1].z) return st[st.length - 1];
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i];
    const b = st[i + 1];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / (a.z - b.z);
      return {
        halfBeam: THREE.MathUtils.lerp(a.halfBeam, b.halfBeam, t),
        sheerY: THREE.MathUtils.lerp(a.sheerY, b.sheerY, t),
        chineY: THREE.MathUtils.lerp(a.chineY, b.chineY, t),
        keelY: THREE.MathUtils.lerp(a.keelY, b.keelY, t),
      };
    }
  }
  return st[0];
}

function createLoftedMonohullGeometry(): {
  hullSkinGeo: THREE.BufferGeometry;
  deckCapGeo: THREE.BufferGeometry;
  teakForedeckGeo: THREE.BufferGeometry;
} {
  // Build separate smooth-normal left & right outer hull skins + flat stern transom
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const nZ = SUPERYACHT_STATIONS.length;
  // Cross section per side: 0=keel, 1=mid-bottom, 2=chine, 3=mid-flank, 4=sheer
  const nProf = 5;

  const addSideSkin = (side: -1 | 1) => {
    const baseIdx = positions.length / 3;
    for (let i = 0; i < nZ; i++) {
      const s = SUPERYACHT_STATIONS[i];
      const u = i / (nZ - 1);
      const pts: Array<[number, number]> = [
        [0, s.keelY],
        [side * s.halfBeam * 0.52, THREE.MathUtils.lerp(s.keelY, s.chineY, 0.58)],
        [side * s.halfBeam * 0.88, s.chineY],
        [side * s.halfBeam * 0.97, THREE.MathUtils.lerp(s.chineY, s.sheerY, 0.52)],
        [side * s.halfBeam, s.sheerY],
      ];
      for (let j = 0; j < nProf; j++) {
        positions.push(pts[j][0], pts[j][1], s.z);
        uvs.push(u, j / (nProf - 1));
      }
    }
    for (let i = 0; i < nZ - 1; i++) {
      for (let j = 0; j < nProf - 1; j++) {
        const a = baseIdx + i * nProf + j;
        const b = baseIdx + (i + 1) * nProf + j;
        const c = baseIdx + (i + 1) * nProf + (j + 1);
        const d = baseIdx + i * nProf + (j + 1);
        if (side > 0) {
          // Right side (+X outward)
          indices.push(a, b, c, a, c, d);
        } else {
          // Left side (-X outward)
          indices.push(a, c, b, a, d, c);
        }
      }
    }
  };

  addSideSkin(1);
  addSideSkin(-1);

  // Flat transom plate closing stern (z = -6.25, -Z outward)
  const stern = SUPERYACHT_STATIONS[nZ - 1];
  const tBase = positions.length / 3;
  const transomPts: Array<[number, number]> = [
    [-stern.halfBeam, stern.sheerY],
    [stern.halfBeam, stern.sheerY],
    [stern.halfBeam * 0.88, stern.chineY],
    [0, stern.keelY],
    [-stern.halfBeam * 0.88, stern.chineY],
  ];
  for (const [tx, ty] of transomPts) {
    positions.push(tx, ty, stern.z);
    uvs.push(0.5 + tx / 5, (ty + 0.3) / 2);
  }
  indices.push(tBase, tBase + 1, tBase + 2);
  indices.push(tBase, tBase + 2, tBase + 3);
  indices.push(tBase, tBase + 3, tBase + 4);

  const hullSkinGeo = new THREE.BufferGeometry();
  hullSkinGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  hullSkinGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  hullSkinGeo.setIndex(indices);
  hullSkinGeo.computeVertexNormals();
  hullSkinGeo.computeBoundingSphere();

  // Deck Cap Shape in (X, -Z) so rotateX(-PI/2) maps -(-Z) -> +Z bow forward!
  const deckShape = new THREE.Shape();
  deckShape.moveTo(0, -SUPERYACHT_STATIONS[0].z);
  for (let i = 1; i < nZ; i++) {
    deckShape.lineTo(SUPERYACHT_STATIONS[i].halfBeam, -SUPERYACHT_STATIONS[i].z);
  }
  for (let i = nZ - 1; i >= 1; i--) {
    deckShape.lineTo(-SUPERYACHT_STATIONS[i].halfBeam, -SUPERYACHT_STATIONS[i].z);
  }
  deckShape.closePath();

  const deckCapGeo = new THREE.ExtrudeGeometry(deckShape, {
    depth: 0.08,
    bevelEnabled: false,
  });
  deckCapGeo.rotateX(-Math.PI / 2);
  // Adjust vertex Y subtly to match sheer slope
  const dPos = deckCapGeo.attributes.position;
  for (let i = 0; i < dPos.count; i++) {
    const vz = dPos.getZ(i);
    const vy = dPos.getY(i);
    const h = sampleHullAt(vz);
    dPos.setY(i, h.sheerY - 0.06 + vy);
  }
  deckCapGeo.computeVertexNormals();

  // Slightly inset teak deck plate sitting +0.025m proud of fiberglass deck cap
  const teakShape = new THREE.Shape();
  teakShape.moveTo(0, -(SUPERYACHT_STATIONS[0].z - 0.35));
  for (let i = 1; i < nZ; i++) {
    teakShape.lineTo(Math.max(0.02, SUPERYACHT_STATIONS[i].halfBeam - 0.18), -SUPERYACHT_STATIONS[i].z);
  }
  for (let i = nZ - 1; i >= 1; i--) {
    teakShape.lineTo(-Math.max(0.02, SUPERYACHT_STATIONS[i].halfBeam - 0.18), -SUPERYACHT_STATIONS[i].z);
  }
  teakShape.closePath();

  const teakForedeckGeo = new THREE.ExtrudeGeometry(teakShape, {
    depth: 0.035,
    bevelEnabled: false,
  });
  teakForedeckGeo.rotateX(-Math.PI / 2);
  const tPos = teakForedeckGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const vz = tPos.getZ(i);
    const vy = tPos.getY(i);
    const h = sampleHullAt(vz);
    tPos.setY(i, h.sheerY + 0.015 + vy);
  }
  teakForedeckGeo.computeVertexNormals();

  return { hullSkinGeo, deckCapGeo, teakForedeckGeo };
}

let cachedMonohullGeos: ReturnType<typeof createLoftedMonohullGeometry> | null = null;
function getMonohullGeometries() {
  if (!cachedMonohullGeos) cachedMonohullGeos = createLoftedMonohullGeometry();
  return cachedMonohullGeos;
}

function createHullConformingQuad(
  side: -1 | 1,
  z0: number,
  z1: number,
  yFracBot0: number,
  yFracTop0: number,
  yFracBot1: number,
  yFracTop1: number,
  outwardOffset: number
): THREE.BufferGeometry {
  const s0 = sampleHullAt(z0);
  const s1 = sampleHullAt(z1);

  const evalX = (s: { halfBeam: number; sheerY: number; chineY: number }, yFrac: number) =>
    side * (s.halfBeam * THREE.MathUtils.lerp(0.91, 0.99, yFrac) + outwardOffset);

  const y0b = THREE.MathUtils.lerp(s0.chineY, s0.sheerY, yFracBot0);
  const y0t = THREE.MathUtils.lerp(s0.chineY, s0.sheerY, yFracTop0);
  const y1b = THREE.MathUtils.lerp(s1.chineY, s1.sheerY, yFracBot1);
  const y1t = THREE.MathUtils.lerp(s1.chineY, s1.sheerY, yFracTop1);

  const verts = new Float32Array([
    evalX(s0, yFracBot0), y0b, z0,
    evalX(s1, yFracBot1), y1b, z1,
    evalX(s1, yFracTop1), y1t, z1,
    evalX(s0, yFracTop0), y0t, z0,
  ]);
  const indices = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildFlybridgeSuperyacht(
  mats: SharedBaseYachtMaterials,
  accentColor: number,
  showWake: boolean
): BuiltYachtHandle {
  const root = new THREE.Group();
  const warmGlowMats: THREE.MeshStandardMaterial[] = [];
  const waterGlowMats: THREE.MeshStandardMaterial[] = [];
  const nightHaloMats: THREE.MeshBasicMaterial[] = [];
  const wakeMeshes: THREE.Mesh[] = [];

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.25,
    metalness: 0.28,
  });
  const cabinLedMat = new THREE.MeshStandardMaterial({
    color: 0xffe8c2,
    emissive: 0xffb85c,
    emissiveIntensity: 0.15,
    roughness: 0.28,
  });
  const salonNightGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x132036,
    emissive: 0xffb347,
    emissiveIntensity: 0.0,
    roughness: 0.06,
    metalness: 0.58,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.65,
  });
  warmGlowMats.push(cabinLedMat, salonNightGlassMat);

  const underwaterLedMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: accentColor,
    emissiveIntensity: 0.14,
    roughness: 0.24,
  });
  waterGlowMats.push(underwaterLedMat);

  // 1. Sculpted Lofted Monohull + Teak Main Deck
  const monohull = getMonohullGeometries();
  root.add(new THREE.Mesh(monohull.hullSkinGeo, mats.hullWhiteMat));
  root.add(new THREE.Mesh(monohull.deckCapGeo, mats.hullWhiteMat));
  root.add(new THREE.Mesh(monohull.teakForedeckGeo, mats.teakMat));

  // Signature Sky-Teal / Turquoise Chine Accent Stripe & Dark Boot-Top + Sculpted Hull Windows
  [-1, 1].forEach((s) => {
    const side = s as -1 | 1;
    root.add(new THREE.Mesh(createHullConformingQuad(side, 7.10, -6.20, -0.35, -0.02, -0.35, -0.02, 0.026), mats.bootTopMat));
    root.add(new THREE.Mesh(createHullConformingQuad(side, 6.85, -6.15, 0.01, 0.12, 0.01, 0.12, 0.032), accentMat));
    // Forward trapezoidal bow stateroom window + amidship panoramic window (warm golden cabin glow at night!)
    root.add(new THREE.Mesh(createHullConformingQuad(side, 5.55, 2.35, 0.34, 0.72, 0.26, 0.76, 0.036), salonNightGlassMat));
    root.add(new THREE.Mesh(createHullConformingQuad(side, 1.55, -3.35, 0.24, 0.76, 0.22, 0.74, 0.036), salonNightGlassMat));
    root.add(new THREE.Mesh(createHullConformingQuad(side, 7.22, -6.20, 0.94, 0.99, 0.94, 0.99, 0.032), mats.blackMullionMat));
  });

  // Chrome bow anchor pocket & hanging sculpted stainless anchor at vertical bow stem
  addBoxMesh(root, 0, 1.08, 7.28, 0.24, 0.36, 0.18, mats.steelMat);
  addTubeSegment(root, [0, 1.12, 7.36], [0, 0.78, 7.46], 0.05, mats.steelMat, 8);
  addBoxMesh(root, 0, 0.78, 7.46, 0.36, 0.08, 0.16, mats.steelMat);

  // 2. Teak Foredeck Lounge (U-Shaped Cream Bow Sofa + Teak Coffee Table + Forward Sunpad)
  addBoxMesh(root, 0, 1.50, 5.45, 1.55, 0.14, 1.25, mats.cushionCreamMat);
  addBoxMesh(root, 0, 1.60, 4.92, 1.48, 0.16, 0.32, mats.cushionCreamMat, -0.35, 0, 0);
  addBoxMesh(root, 0, 1.54, 4.25, 2.15, 0.32, 0.56, mats.cushionCreamMat);
  [-0.95, 0.95].forEach((bx) => {
    addBoxMesh(root, bx, 1.54, 3.45, 0.54, 0.32, 1.35, mats.cushionCreamMat);
  });
  addBoxMesh(root, 0, 1.72, 3.48, 0.88, 0.05, 0.72, mats.teakMat);
  addTubeSegment(root, [0, 1.38, 3.48], [0, 1.70, 3.48], 0.045, mats.steelMat, 8);

  const bowRailPts: ReadonlyArray<readonly [number, number, number]> = [
    [-2.08, 1.32, 0.65],
    [-1.92, 1.35, 2.75],
    [-1.56, 1.40, 4.85],
    [-0.84, 1.45, 6.45],
    [0.00, 1.48, 7.22],
    [0.84, 1.45, 6.45],
    [1.56, 1.40, 4.85],
    [1.92, 1.35, 2.75],
    [2.08, 1.32, 0.65],
  ];
  addPolylineRail(root, bowRailPts, 0.56, mats.steelMat, true);

  // Signature Sculpted White Arched Side Fashion-Plates & Midship Glass Bulwarks
  [-1.96, 1.96].forEach((fx) => {
    addTubeSegment(root, [fx * 0.96, 1.30, 0.75], [fx, 1.78, -1.65], 0.085, mats.hullWhiteMat, 8);
    addTubeSegment(root, [fx, 1.78, -1.65], [fx * 0.97, 1.54, -5.65], 0.085, mats.hullWhiteMat, 8);
    addBoxMesh(root, fx * 0.98, 1.48, -2.45, 0.04, 0.34, 4.20, mats.smokedGlassMat);
  });

  // 3. Hydraulic Teak Swim Platform & Twin Transom Stairways
  addBoxMesh(root, 0, 0.32, -6.92, 3.85, 0.12, 1.42, mats.hullWhiteMat);
  addBoxMesh(root, 0, 0.39, -6.92, 3.72, 0.035, 1.30, mats.teakMat);
  addBoxMesh(root, 0, 0.32, -7.64, 3.88, 0.08, 0.04, mats.steelMat);
  addBoxMesh(root, 0, 0.16, -6.24, 3.45, 0.08, 0.10, underwaterLedMat);
  [-1.62, 1.62].forEach((sx) => {
    for (let st = 0; st < 3; st++) {
      const f = (st + 0.5) / 3;
      addBoxMesh(
        root,
        sx,
        THREE.MathUtils.lerp(0.48, 1.18, f),
        THREE.MathUtils.lerp(-6.18, -5.25, f),
        0.58,
        0.045,
        0.34,
        mats.teakMat
      );
    }
  });

  // 4. Frameless Smoked-Glass Main Salon Deckhouse & Aft Cockpit (glows warm golden-amber at night!)
  addBoxMesh(root, 0, 1.92, -0.78, 3.36, 1.18, 5.20, mats.blackMullionMat);
  addBoxMesh(root, 0, 1.94, -0.75, 3.44, 0.96, 4.95, salonNightGlassMat);
  addBoxMesh(root, 0, 1.98, 1.88, 3.12, 0.98, 0.32, salonNightGlassMat, -0.34, 0, 0);
  addBoxMesh(root, 0, 2.38, -3.45, 2.55, 0.06, 0.18, cabinLedMat);

  // Open Aft Cockpit Lounge beneath overhanging flybridge
  addBoxMesh(root, 0, 1.56, -5.25, 2.75, 0.56, 0.56, mats.hullWhiteMat);
  addBoxMesh(root, 0, 1.88, -5.12, 2.62, 0.14, 0.48, mats.cushionCreamMat);
  addBoxMesh(root, 0, 1.74, -4.25, 1.15, 0.05, 0.85, mats.teakMat);
  addTubeSegment(root, [0, 1.28, -4.25], [0, 1.72, -4.25], 0.05, mats.steelMat, 8);

  // 5. Flared White Flybridge Eyebrow Canopy + Perimeter Warm LED Strips + Rear Pillars
  addBoxMesh(root, 0, 2.58, -1.55, 3.68, 0.22, 8.20, mats.hullWhiteMat);
  addBoxMesh(root, 0, 2.59, 2.55, 3.24, 0.20, 0.95, mats.hullWhiteMat, -0.18, 0, 0);
  addBoxMesh(root, 0, 2.46, -5.35, 3.10, 0.05, 0.09, cabinLedMat);
  [-1.84, 1.84].forEach((ex) => {
    addBoxMesh(root, ex, 2.50, -1.50, 0.04, 0.05, 7.75, cabinLedMat);
  });
  [-1.56, 1.56].forEach((px) => {
    addTubeSegment(root, [px, 1.28, -5.45], [px, 2.52, -5.45], 0.048, mats.steelMat, 8);
  });

  // 6. Upper Flybridge Deck, Sleek Wraparound Windscreen, Sculpted Extruded Radar Arch & Dual SATCOM Domes
  addBoxMesh(root, 0, 2.705, -1.65, 3.34, 0.035, 7.35, mats.teakMat);

  // Sleek wraparound tinted flybridge windscreen (continuous U-arc hugging bow edge)
  // Note: rotateX(-PI/2) maps 2D y -> -Z, so negative shape Y coordinates orient the bow arc forward (+Z)!
  const windShape = new THREE.Shape();
  windShape.moveTo(-1.42, -0.20);
  windShape.lineTo(-1.38, -1.25);
  windShape.quadraticCurveTo(0, -1.92, 1.38, -1.25);
  windShape.lineTo(1.42, -0.20);
  windShape.lineTo(1.28, -0.20);
  windShape.lineTo(1.24, -1.15);
  windShape.quadraticCurveTo(0, -1.76, -1.24, -1.15);
  windShape.lineTo(-1.28, -0.20);
  windShape.closePath();
  const windGeo = new THREE.ExtrudeGeometry(windShape, {
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  windGeo.rotateX(-Math.PI / 2);
  // Subtle raked backward lean on windscreen top
  const wPos = windGeo.attributes.position;
  for (let i = 0; i < wPos.count; i++) {
    const wy = wPos.getY(i);
    wPos.setZ(i, wPos.getZ(i) - wy * 0.42);
  }
  windGeo.computeVertexNormals();
  const windscreen = new THREE.Mesh(windGeo, mats.smokedGlassMat);
  windscreen.position.set(0, 2.70, 0.05);
  root.add(windscreen);

  // Upper flybridge helm + white sunlounger seating
  addBoxMesh(root, -0.45, 2.98, 0.65, 1.12, 0.52, 0.56, mats.hullWhiteMat);
  addBoxMesh(root, 0.82, 2.96, -1.15, 0.92, 0.44, 2.85, mats.cushionCreamMat);

  // Sculpted Swept-Back Trapezoidal White Radar-Arch A-Pillars (Z-Y profile extruded cleanly!)
  // Side profile coordinates: shapeX = +Z (forward), shapeY = +Y (up) -> rotateY(-PI/2) maps +shapeX to +Z!
  const archShape = new THREE.Shape();
  archShape.moveTo(-4.35, 2.68);
  archShape.lineTo(-3.38, 2.68);
  archShape.lineTo(-2.12, 3.94);
  archShape.lineTo(-2.98, 3.94);
  archShape.closePath();
  const archHole = new THREE.Path();
  archHole.moveTo(-3.98, 2.94);
  archHole.lineTo(-3.46, 2.94);
  archHole.lineTo(-2.62, 3.74);
  archHole.lineTo(-3.12, 3.74);
  archHole.closePath();
  archShape.holes.push(archHole);
  const archGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  archGeo.translate(0, 0, -0.08);
  archGeo.rotateY(-Math.PI / 2);

  // Flush recessed smoked-glass inlay sitting right inside the arch hole
  const archGlassShape = new THREE.Shape();
  archGlassShape.moveTo(-4.00, 2.92);
  archGlassShape.lineTo(-3.44, 2.92);
  archGlassShape.lineTo(-2.60, 3.76);
  archGlassShape.lineTo(-3.14, 3.76);
  archGlassShape.closePath();
  const archGlassGeo = new THREE.ExtrudeGeometry(archGlassShape, {
    depth: 0.05,
    bevelEnabled: false,
  });
  archGlassGeo.translate(0, 0, -0.025);
  archGlassGeo.rotateY(-Math.PI / 2);

  [-1.34, 1.34].forEach((ax) => {
    const archMesh = new THREE.Mesh(archGeo, mats.hullWhiteMat);
    archMesh.position.x = ax;
    root.add(archMesh);

    const archGlassMesh = new THREE.Mesh(archGlassGeo, mats.smokedGlassMat);
    archGlassMesh.position.x = ax;
    root.add(archGlassMesh);

    // Slender stainless front flybridge hardtop stanchions
    addTubeSegment(root, [ax * 0.96, 2.70, 0.65], [ax * 0.90, 3.92, 0.65], 0.038, mats.steelMat, 8);
  });

  // Sleek Razor-Thin White Hardtop Roof + Underside Night LED Perimeter
  addBoxMesh(root, 0, 3.96, -1.35, 2.96, 0.12, 4.95, mats.hullWhiteMat);
  addBoxMesh(root, 0, 3.97, 1.20, 2.58, 0.10, 0.58, mats.hullWhiteMat, -0.14, 0, 0);
  [-1.46, 1.46].forEach((hx) => {
    addBoxMesh(root, hx, 3.89, -1.35, 0.04, 0.04, 4.65, cabinLedMat);
  });
  addBoxMesh(root, 0, 3.89, -3.80, 2.75, 0.04, 0.05, cabinLedMat);

  // Twin White Hemispherical SATCOM Radomes + Central Open-Array Radar Mast
  [-0.64, 0.64].forEach((dx) => {
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.24, 16), mats.hullWhiteMat);
    domeBase.position.set(dx, 4.14, -2.55);
    root.add(domeBase);
    const domeTop = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mats.hullWhiteMat);
    domeTop.position.set(dx, 4.26, -2.55);
    root.add(domeTop);
  });

  addTubeSegment(root, [0, 4.02, -2.65], [0, 4.56, -2.80], 0.036, mats.steelMat, 8);
  const radarScanner = new THREE.Group();
  radarScanner.position.set(0, 4.46, -2.74);
  addBoxMesh(radarScanner, 0, -0.05, 0, 0.18, 0.12, 0.24, mats.hullWhiteMat);
  addBoxMesh(radarScanner, 0, 0.04, 0, 0.96, 0.06, 0.10, mats.hullWhiteMat);
  root.add(radarScanner);

  const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mats.navMastMat);
  mastLight.position.set(0, 4.58, -2.80);
  root.add(mastLight);
  [-0.95, 0.95].forEach((wx) => {
    addTubeSegment(root, [wx, 4.02, -2.95], [wx * 1.08, 4.76, -3.45], 0.012, mats.steelMat, 6);
  });

  // Port (Red) & Starboard (Green) Navigation Lights on flared brow wings
  const portLight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), mats.navPortMat);
  portLight.position.set(-1.82, 2.58, 1.95);
  root.add(portLight);
  const stbdLight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), mats.navStbdMat);
  stbdLight.position.set(1.82, 2.58, 1.95);
  root.add(stbdLight);

  // Aft flybridge stainless safety rail
  const aftFlyRail: ReadonlyArray<readonly [number, number, number]> = [
    [-1.44, 2.70, -4.15],
    [-1.44, 2.70, -5.32],
    [0.00, 2.70, -5.32],
    [1.44, 2.70, -5.32],
    [1.44, 2.70, -4.15],
  ];
  addPolylineRail(root, aftFlyRail, 0.56, mats.steelMat, false);

  addNightWaterGlowRig(root, waterGlowMats, nightHaloMats, accentColor, 8.0, 15.2);

  if (showWake) {
    wakeMeshes.push(addWakeTrail(root, 0, -6.25, 1.45, mats.wakeFoamMat));
  }

  return { group: root, warmGlowMats, waterGlowMats, nightHaloMats, radarScanner, wakeMeshes };
}

// ---------------------------------------------------------------------------
// 6. PUBLIC FACTORY
// ---------------------------------------------------------------------------
export function buildLuxuryYachtMesh(options: YachtBuildOptions): BuiltYachtHandle {
  const mats = getSharedBaseYachtMaterials();
  const accentColor = options.accentColor ?? (options.style === 'catamaran' ? 0x0ea5e9 : 0x38bdf8);
  const handle =
    options.style === 'catamaran'
      ? buildLuxuryCatamaranYacht(mats, accentColor, Boolean(options.showWake))
      : buildFlybridgeSuperyacht(mats, accentColor, Boolean(options.showWake));

  if (options.scale && options.scale !== 1) {
    handle.group.scale.setScalar(options.scale);
  }
  handle.group.userData.noMerge = true;
  return handle;
}
