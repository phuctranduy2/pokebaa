import * as THREE from 'three';

// =========================================================================
// OPERATING HOURS SCHEDULES (24h clock)
// - AEON Mall:        07:00 - 22:00
// - RON Pickleball:   07:00 - 22:00 (Both Pro-Shop Showroom & 6 Courts)
// - Porsche Center:   07:00 - 21:00
// - VinFast Showroom: 07:00 - 22:00
// - NY Steakhouse:    07:00 - 22:00
// - RON Barber Shop:  07:00 - 21:00
// - RON Football:     Pro-Shop 07:00 - 22:00 (2 Football Pitches Open 24/7 Xuyên Đêm)
// - Quán Nhậu Ron Béo: 15:00 - 04:00 (3h chiều đến 4h sáng)
// - Nhạc DJ Phố Đi Bộ: 15:00 - 05:00 (3h chiều đến 5h sáng)
// - Quán Lẩu Cua Đồng Hà Nội Phố: 12:00 - 23:00 (12h trưa đến 11h tối)
// - Ngân hàng Vietcombank: 08:00 - 18:00 (8h sáng đến 6h chiều; Khu ATM 24h ngoài trời mở 24/24)
// - Cà phê Phê La (Nốt Hương Đặc Sản): 07:00 - 23:00 (7h sáng đến 11h tối)
// =========================================================================

export const isAeonMallOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 22.0;
export const isRonPickleballOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 22.0;
export const isPorscheShowroomOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 21.0;
export const isVinFastShowroomOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 22.0;
export const isSteakhouseOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 22.0;
export const isRonBarberShopOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 21.0;
export const isRonFootballOpenAtHour = (rawHour: number): boolean => rawHour >= 7.0 && rawHour < 22.0;
export const isRonBeoOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 15.0 || h < 4.0;
};
export const isPhoDiBoMusicActiveAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 15.0 || h < 5.0;
};
// Quán Nhậu Giới Trẻ TOXIC: Đóng cửa 07:00 - 16:00 (Mở cửa 16:00 - 07:00 sáng)
export const isToxicPubOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 7.0;
};
export const isToxicNightPartyAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 7.0;
};
// Quán Nhậu Khói Food Garden (Phố Đi Bộ East beside Ron Béo): Đóng cửa 07:00 - 16:00 (Mở cửa 16:00 - 07:00 sáng)
export const isKhoiGardenOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 7.0;
};
// 4U CLUB (Phố Đi Bộ East beside Khói Food Garden): Đóng cửa 07:00 - 16:00 (Mở cửa 16:00 - 07:00)
export const isFourUClubOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 7.0;
};
// Quán Nhậu LAN QUẾ PHƯỜNG (Phố Đi Bộ West beside TOXIC): Đóng cửa 07:00 - 12:00 trưa (Mở cửa 12:00 - 07:00)
export const isLanQuePhuongOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 12.0 || h < 7.0;
};
// NewDTV Nightclub & KTV (Phố Đi Bộ West beside Lan Quế Phường): Đóng cửa 07:00 - 16:00 (Mở cửa 16:00 - 07:00)
export const isNewDtvOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 7.0;
};
// THE GANG — Food & Music (Phố Đi Bộ West beside NewDTV): Đóng cửa 07:00 - 16:00 (Mở cửa 16:00 - 07:00)
export const isTheGangOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 16.0 || h < 7.0;
};
// Quán Lẩu Cua Đồng Hà Nội Phố (SE Ngã Tư Phố Đông): Mở cửa 12:00 trưa - 23:00 tối
export const isHaNoiPhoOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 12.0 && h < 23.0;
};
// Ngân hàng Vietcombank (NE Avenue beside Ron Béo): Mở cửa 08:00 sáng - 18:00 chiều (ATM 24h ngoài trời mở 24/24)
export const isVietcombankOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 8.0 && h < 18.0;
};
// Ngân hàng VPBank (Đường Sơn Tây Nam cạnh Highlands Coffee): Mở cửa 08:00 sáng - 18:00 chiều (ATM 24h ngoài trời mở 24/24)
export const isVpbankOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 8.0 && h < 18.0;
};
// Cà phê Phê La — Nốt Hương Đặc Sản (SE Boulevard beside Peri Pool Arena): Mở cửa 07:00 sáng - 23:00 tối
export const isPheLaOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cà phê Phúc Long Coffee & Tea (NE Boulevard beside Vietcombank ATM): Mở cửa 07:00 sáng - 23:00 tối
export const isPhucLongOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cửa hàng Adidas Flagship Store (SE Boulevard beside Phê La): Mở cửa 07:00 sáng - 23:00 tối
export const isAdidasOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cửa hàng Giày Skechers Store (NE Boulevard beside Phúc Long): Mở cửa 07:00 sáng - 23:00 tối
export const isSkechersOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cửa hàng Thời Trang John Henry & Freelancer (NE Boulevard beside Skechers): Mở cửa 07:00 sáng - 23:00 tối
export const isJohnHenryOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cửa hàng Thời Trang DESERT — Made in Viet Nam (SE Boulevard beside Adidas): Mở cửa 07:00 sáng - 23:00 tối
export const isDesertOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cà phê Highlands Coffee Flagship (SE Corner Ngã Tư Sơn Tây beside DESERT): Mở cửa 07:00 sáng - 23:00 tối
export const isHighlandsOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Cà phê KATINAT Coffee & Tea House (Đường Sơn Tây Nam cạnh DESERT): Mở cửa 07:00 sáng - 23:00 tối
export const isKatinatOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Louis Vuitton Flagship Boutique (NE Corner Ngã Tư Sơn Tây cạnh John Henry): Mở cửa 07:00 sáng - 23:00 tối
export const isLouisVuittonOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Gucci Flagship Boutique (Đại lộ Đông Tây cạnh Louis Vuitton): Mở cửa 07:00 sáng - 23:00 tối
export const isGucciOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Hermès Flagship Boutique (Đại lộ Đông Tây cạnh Highlands Coffee): Mở cửa 07:00 sáng - 23:00 tối
export const isHermesOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Saint Laurent (YSL) Flagship Boutique (Đại lộ Đông Tây cạnh Gucci): Mở cửa 07:00 sáng - 23:00 tối
export const isYslOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Chanel Flagship Boutique (Đại lộ Đông Tây cạnh Hermès): Mở cửa 07:00 sáng - 23:00 tối
export const isChanelOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// DIOR Flagship Boutique (Đại lộ Đông Tây cạnh Saint Laurent YSL): Mở cửa 07:00 sáng - 23:00 tối
export const isDiorOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// PRADA Flagship Boutique (Đại lộ Đông Tây cạnh Chanel, góc SW Ngã Tư DIOR): Mở cửa 07:00 sáng - 23:00 tối
export const isPradaOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Apple Flagship Store (Đường Sơn Tây Bắc cạnh Louis Vuitton): Mở cửa 07:00 sáng - 23:00 tối
export const isAppleStoreOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Samsung Flagship Showcase Store (Đường Sơn Tây Bắc cạnh John Henry): Mở cửa 07:00 sáng - 23:00 tối
export const isSamsungStoreOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// Xiaomi Flagship Store (Đường Sơn Tây Bắc cạnh Samsung): Mở cửa 07:00 sáng - 23:00 tối
export const isXiaomiStoreOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// LG Flagship Brandshop (Đường Sơn Tây Bắc cạnh Apple Store): Mở cửa 07:00 sáng - 23:00 tối
export const isLgStoreOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// HUAWEI Flagship Store (2 mặt tiền Đường Bạch Đằng & Đường Sơn Tây Bắc cạnh Xiaomi): Mở cửa 07:00 sáng - 23:00 tối
export const isHuaweiStoreOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};
// SONY Flagship Store (Ginza Place • 2 mặt tiền Đường Bạch Đằng & Đường Sơn Tây Bắc cạnh LG): Mở cửa 07:00 sáng - 23:00 tối
export const isSonyStoreOpenAtHour = (rawHour: number): boolean => {
  const h = ((rawHour % 24) + 24) % 24;
  return h >= 7.0 && h < 23.0;
};

export interface RollingShutterDoorSpec {
  id: string;
  axis: 'x' | 'z'; // 'z' = doorway along Z (at fixed X), 'x' = doorway along X (at fixed Z)
  pos: number; // Fixed coordinate (local or world depending on parent group)
  spanCenter: number; // Center along spanning axis
  width: number;
  baseY: number;
  topY: number;
  thickness?: number;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number; floor?: number };
}

export interface RollingShutterHandle {
  id: string;
  curtain: THREE.Mesh;
  fullH: number;
  progress: number;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number; floor?: number };
}

export function createRollingShutterTexture(opts: {
  title: string;
  hoursLabel: string;
  accentHex?: string;
  slatDarkHex?: string;
  slatLightHex?: string;
}): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const accent = opts.accentHex ?? '#b91c1c';
  const darkHex = opts.slatDarkHex ?? '#334155';
  const lightHex = opts.slatLightHex ?? '#64748b';

  // Corrugated steel slat bands
  const slatCount = 18;
  const slatH = h / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const sy = i * slatH;
    const g = ctx.createLinearGradient(0, sy, 0, sy + slatH);
    g.addColorStop(0, darkHex);
    g.addColorStop(0.28, lightHex);
    g.addColorStop(0.76, '#475569');
    g.addColorStop(1, '#1e293b');
    ctx.fillStyle = g;
    ctx.fillRect(0, sy, w, slatH);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, sy + slatH - 3, w, 3);
  }

  // Heavy bottom security lock bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(w * 0.5 - 64, h - 20, 128, 12);

  // Center Closed Sign Plaque
  const pw = 660;
  const ph = 188;
  const px = (w - pw) * 0.5;
  const py = (h - ph) * 0.5 - 10;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(px + 4, py + 4, pw - 8, ph - 8);

  ctx.fillStyle = accent;
  ctx.fillRect(px + 12, py + 12, pw - 24, 52);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('ĐÃ ĐÓNG CỬA  •  CLOSED', w * 0.5, py + 38);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 34px system-ui, -apple-system, sans-serif';
  ctx.fillText(opts.title, w * 0.5, py + 104);

  ctx.fillStyle = '#fde68a';
  ctx.font = '700 25px system-ui, -apple-system, sans-serif';
  ctx.fillText(opts.hoursLabel, w * 0.5, py + 152);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createRollingShutterDoor(
  parentGroup: THREE.Group,
  spec: RollingShutterDoorSpec,
  shutterMat: THREE.Material,
  housingMat: THREE.Material
): RollingShutterHandle {
  const fullH = Math.max(0.5, spec.topY - spec.baseY);
  const thick = spec.thickness ?? 0.12;

  // Static overhead cassette housing box (never merges with animated curtain)
  const hoodGeo =
    spec.axis === 'z'
      ? new THREE.BoxGeometry(thick + 0.10, 0.24, spec.width + 0.18)
      : new THREE.BoxGeometry(spec.width + 0.18, 0.24, thick + 0.10);
  const hood = new THREE.Mesh(hoodGeo, housingMat);
  hood.position.set(
    spec.axis === 'z' ? spec.pos : spec.spanCenter,
    spec.topY + 0.12,
    spec.axis === 'z' ? spec.spanCenter : spec.pos
  );
  parentGroup.add(hood);

  // Side guide rails
  [-1, 1].forEach((side) => {
    const railGeo = new THREE.BoxGeometry(0.10, fullH, 0.10);
    const rail = new THREE.Mesh(railGeo, housingMat);
    const offset = side * (spec.width * 0.5 + 0.04);
    rail.position.set(
      spec.axis === 'z' ? spec.pos : spec.spanCenter + offset,
      spec.baseY + fullH * 0.5,
      spec.axis === 'z' ? spec.spanCenter + offset : spec.pos
    );
    parentGroup.add(rail);
  });

  // Animated curtain mesh: unit-height box shifted so pivot Y=0 sits at topY
  const curtainGeo =
    spec.axis === 'z'
      ? new THREE.BoxGeometry(thick, 1.0, spec.width)
      : new THREE.BoxGeometry(spec.width, 1.0, thick);
  curtainGeo.translate(0, -0.5, 0);

  const curtain = new THREE.Mesh(curtainGeo, shutterMat);
  curtain.userData.noMerge = true;
  curtain.position.set(
    spec.axis === 'z' ? spec.pos : spec.spanCenter,
    spec.topY,
    spec.axis === 'z' ? spec.spanCenter : spec.pos
  );
  curtain.scale.y = 0.01;
  curtain.visible = false;
  parentGroup.add(curtain);

  return {
    id: spec.id,
    curtain,
    fullH,
    progress: 0,
    bounds: spec.bounds,
  };
}

export function setShutterProgress(handle: RollingShutterHandle, progress: number) {
  const clamped = THREE.MathUtils.clamp(progress, 0, 1);
  handle.progress = clamped;
  handle.curtain.visible = clamped > 0.015;
  handle.curtain.scale.y = Math.max(0.015, clamped * handle.fullH);
}

/**
 * Shared step helper for NPC evacuation paths when a venue closes.
 * Returns true once the NPC reaches the final waypoint.
 */
export function advanceNpcExitPath(
  root: THREE.Group,
  waypoints: THREE.Vector3[],
  wpIdxRef: { idx: number },
  speed: number,
  delta: number,
  limbs?: {
    legL?: THREE.Object3D | null;
    legR?: THREE.Object3D | null;
    armL?: THREE.Object3D | null;
    armR?: THREE.Object3D | null;
  },
  walkPhaseRef?: { phase: number }
): boolean {
  if (wpIdxRef.idx >= waypoints.length) return true;
  const target = waypoints[wpIdxRef.idx];
  const dx = target.x - root.position.x;
  const dy = target.y - root.position.y;
  const dz = target.z - root.position.z;
  const distXZ = Math.hypot(dx, dz);
  const dist3D = Math.hypot(dx, dy, dz);
  const step = speed * delta;

  if (dist3D <= step + 0.09) {
    root.position.copy(target);
    wpIdxRef.idx += 1;
    if (wpIdxRef.idx >= waypoints.length) {
      return true;
    }
    return false;
  }

  const ratio = step / dist3D;
  root.position.x += dx * ratio;
  root.position.y += dy * ratio;
  root.position.z += dz * ratio;

  if (distXZ > 0.04) {
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    root.rotation.y += diff * Math.min(1, delta * 9.0);
  }

  if (walkPhaseRef) {
    walkPhaseRef.phase += delta * 7.2;
    const swing = Math.sin(walkPhaseRef.phase) * 0.42;
    if (limbs?.legL) limbs.legL.rotation.x = swing;
    if (limbs?.legR) limbs.legR.rotation.x = -swing;
    if (limbs?.armL) limbs.armL.rotation.x = -swing * 0.55;
    if (limbs?.armR) limbs.armR.rotation.x = swing * 0.55;
  }

  return false;
}
