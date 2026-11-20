export type PlayerCharacterId =
  | 'default'
  | 'naruto'
  | 'luffy_gear5'
  | 'gojo'
  | 'itachi';

export type PlayerCharacterRigKind =
  | 'builtin'
  | 'mixamo_clip'
  | 'mixamo_rot_walk'
  | 'procedural'
  | 'gojo_standing';

export interface PlayerCharacterDefinition {
  id: PlayerCharacterId;
  name: string;
  shortName: string;
  series: string;
  subtitle: string;
  accentHex: string;
  badgeLabel: string;
  modelUrl: string | null;
  targetHeight: number;
  rotationY: number;
  rigKind: PlayerCharacterRigKind;
  /** Optional shared GLB animation source (rotation-only tracks retargeted onto identical skeleton) */
  animationSourceUrl?: string;
  /** True for Gojo: disables source dance clip and forces calm upright standing */
  disableSourceDanceAnimation?: boolean;
  /** Optional standing shoulder drop angle multiplier for A/T-pose static rigs */
  armRestDropRad?: number;
}

export const PLAYER_CHARACTER_STORAGE_KEY = 'tcg_shop_player_character_id_v1';

export const PLAYER_CHARACTER_CATALOG: readonly PlayerCharacterDefinition[] = [
  {
    id: 'default',
    name: 'Chủ Tiệm TCG (Mặc Định)',
    shortName: 'Mặc Định',
    series: 'TCG Shop',
    subtitle: 'Nhân vật chủ tiệm mặc áo xanh & balo du lịch',
    accentHex: '#14b8a6',
    badgeLabel: 'Mặc Định',
    modelUrl: null,
    targetHeight: 1.72,
    rotationY: 0,
    rigKind: 'builtin',
  },
  {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    shortName: 'Naruto',
    series: 'Naruto',
    subtitle: 'Trang phục ninja Làng Lá • Đầy đủ động tác đứng, đi, chạy',
    accentHex: '#f97316',
    badgeLabel: 'Konoha',
    modelUrl: '/models/characters/naruto.glb',
    targetHeight: 1.70,
    rotationY: Math.PI,
    rigKind: 'mixamo_clip',
  },
  {
    id: 'luffy_gear5',
    name: 'Luffy Gear 5',
    shortName: 'Luffy G5',
    series: 'One Piece',
    subtitle: 'Hình thái Thức Tỉnh Nika tóc trắng • Đầy đủ động tác đứng, đi, chạy',
    accentHex: '#e2e8f0',
    badgeLabel: 'Gear 5',
    modelUrl: '/models/characters/luffy_gear5.glb',
    targetHeight: 1.74,
    rotationY: Math.PI,
    rigKind: 'mixamo_clip',
    animationSourceUrl: '/models/characters/naruto.glb',
  },
  {
    id: 'gojo',
    name: 'Gojo Satoru',
    shortName: 'Gojo',
    series: 'Jujutsu Kaisen',
    subtitle: 'Chú thuật sư Vô Hạ Hạn • Đứng, đi, chạy mượt (không nhảy)',
    accentHex: '#38bdf8',
    badgeLabel: 'JJK',
    modelUrl: '/models/characters/gojo.glb',
    targetHeight: 1.84,
    rotationY: Math.PI,
    rigKind: 'gojo_standing',
    animationSourceUrl: '/models/characters/naruto.glb',
    disableSourceDanceAnimation: true,
  },
  {
    id: 'itachi',
    name: 'Itachi Uchiha',
    shortName: 'Itachi',
    series: 'Naruto',
    subtitle: 'Áo choàng mây đỏ Akatsuki • Đầy đủ động tác đứng, đi, chạy',
    accentHex: '#b91c1c',
    badgeLabel: 'Akatsuki',
    modelUrl: '/models/characters/itachi.glb',
    targetHeight: 1.78,
    rotationY: Math.PI,
    rigKind: 'mixamo_clip',
    animationSourceUrl: '/models/characters/naruto.glb',
  },
];

const CHARACTER_MAP = new Map<PlayerCharacterId, PlayerCharacterDefinition>(
  PLAYER_CHARACTER_CATALOG.map((item) => [item.id, item])
);

export function isValidPlayerCharacterId(value: unknown): value is PlayerCharacterId {
  return typeof value === 'string' && CHARACTER_MAP.has(value as PlayerCharacterId);
}

export function getPlayerCharacterDef(id: PlayerCharacterId | string | null | undefined): PlayerCharacterDefinition {
  if (id && CHARACTER_MAP.has(id as PlayerCharacterId)) {
    return CHARACTER_MAP.get(id as PlayerCharacterId)!;
  }
  return CHARACTER_MAP.get('default')!;
}

export function loadSavedPlayerCharacterId(): PlayerCharacterId {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'default';
    const raw = window.localStorage.getItem(PLAYER_CHARACTER_STORAGE_KEY);
    return isValidPlayerCharacterId(raw) ? raw : 'default';
  } catch {
    return 'default';
  }
}

export function savePlayerCharacterId(id: PlayerCharacterId): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(PLAYER_CHARACTER_STORAGE_KEY, id);
  } catch {
    // Ignore storage quota / private-mode restrictions
  }
}
