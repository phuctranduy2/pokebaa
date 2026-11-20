import type {
  BoosterSetInfo,
  GachaPackInfo,
  GachaPullResult,
  GameStopMysteryBoxResult,
  GradedSlab,
  PackRipResult,
  PokemonCard,
  PokemonType,
  ProductLicense,
  ShelfUnlockDefinition,
} from './pokemonShopLogic';
import { EXPANDED_OP_SEEDS, type OpCardSeed } from './onePieceCardsExpanded';

import { createOnePieceCardSvgDataUrl, encodeSvgDataUrl, escapeXml } from './onePieceSvg';
export { createOnePieceCardSvgDataUrl, encodeSvgDataUrl, escapeXml };
import { getFullOpSetCards, getAllOpCardsList } from './onePieceFullSets';

export function createOnePiecePackSvgDataUrl(params: {
  code: string;
  title: string;
  emblem: string;
  colorA: string;
  colorB: string;
  accent: string;
}): string {
  const { code, title, emblem, colorA, colorB, accent } = params;
  const safeTitle = escapeXml(title.length > 20 ? `${title.slice(0, 18)}..` : title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 390" width="260" height="390">
    <defs>
      <linearGradient id="pk" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colorA}"/>
        <stop offset="60%" stop-color="${colorB}"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
    </defs>
    <rect x="8" y="6" width="244" height="378" rx="14" fill="url(#pk)" stroke="#f8fafc" stroke-width="3"/>
    <rect x="8" y="6" width="244" height="28" rx="6" fill="#090d16" fill-opacity="0.72"/>
    <text x="130" y="25" text-anchor="middle" fill="#fde047" font-family="Arial Black, sans-serif" font-size="11" font-weight="900">ONE PIECE CARD GAME</text>
    <rect x="24" y="48" width="212" height="38" rx="8" fill="#090d16" fill-opacity="0.82" stroke="${accent}" stroke-width="2"/>
    <text x="130" y="72" text-anchor="middle" fill="#ffffff" font-family="Arial Black, sans-serif" font-size="16" font-weight="900">${escapeXml(code)}</text>
    <circle cx="130" cy="190" r="72" fill="#090d16" fill-opacity="0.55" stroke="${accent}" stroke-width="4"/>
    <circle cx="130" cy="190" r="58" fill="${accent}" fill-opacity="0.22" stroke="#fde047" stroke-width="2"/>
    <text x="130" y="210" text-anchor="middle" font-size="68">${emblem}</text>
    <rect x="20" y="286" width="220" height="46" rx="8" fill="#090d16" fill-opacity="0.86" stroke="#fde047" stroke-width="1.5"/>
    <text x="130" y="308" text-anchor="middle" fill="#ffffff" font-family="Arial Black, sans-serif" font-size="13" font-weight="900">${safeTitle}</text>
    <text x="130" y="324" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="10" font-weight="700">10 CARDS · BOOSTER PACK</text>
    <rect x="8" y="352" width="244" height="32" rx="6" fill="#090d16" fill-opacity="0.85"/>
    <text x="130" y="372" text-anchor="middle" fill="#38bdf8" font-family="Arial, sans-serif" font-size="11" font-weight="900">GRAND LINE EDITION · 2F</text>
  </svg>`;
  return encodeSvgDataUrl(svg);
}

export function createOnePieceBoxSvgDataUrl(params: {
  code: string;
  title: string;
  emblem: string;
  colorA: string;
  colorB: string;
  accent: string;
  badge?: string;
}): string {
  const { code, title, emblem, colorA, colorB, accent, badge = '10 PACKS · BOOSTER BOX' } = params;
  const safeTitle = escapeXml(title.length > 26 ? `${title.slice(0, 24)}..` : title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" width="360" height="300">
    <defs>
      <linearGradient id="bx" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colorA}"/>
        <stop offset="55%" stop-color="${colorB}"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
    </defs>
    <rect x="10" y="10" width="340" height="280" rx="16" fill="url(#bx)" stroke="${accent}" stroke-width="4"/>
    <rect x="20" y="20" width="320" height="44" rx="8" fill="#090d16" fill-opacity="0.88" stroke="#fde047" stroke-width="1.5"/>
    <text x="180" y="39" text-anchor="middle" fill="#fde047" font-family="Arial Black, sans-serif" font-size="12" font-weight="900">ONE PIECE CARD GAME · ${escapeXml(code)}</text>
    <text x="180" y="56" text-anchor="middle" fill="#ffffff" font-family="Arial Black, sans-serif" font-size="13" font-weight="900">${safeTitle}</text>
    <circle cx="180" cy="154" r="64" fill="#090d16" fill-opacity="0.65" stroke="${accent}" stroke-width="4"/>
    <text x="180" y="176" text-anchor="middle" font-size="66">${emblem}</text>
    <rect x="34" y="232" width="292" height="38" rx="8" fill="#090d16" fill-opacity="0.9" stroke="#fde047" stroke-width="2"/>
    <text x="180" y="256" text-anchor="middle" fill="#fde047" font-family="Arial Black, sans-serif" font-size="13" font-weight="900">${escapeXml(badge)}</text>
  </svg>`;
  return encodeSvgDataUrl(svg);
}

// ==========================================
// 1. ONE PIECE BOOSTER SETS (LEVEL 10 - 20 & 21+ RESERVED)
// Standardized: 1 Booster Box = 10 packs (10 cards/pack, identical to Pokemon)
// Box Wholesale = 10 * packWholesalePrice; Box Retail = ~10 * packRetailPrice
// ==========================================
export const ONEPIECE_BOOSTER_SETS: Record<string, BoosterSetInfo> = {
  // --- LEVEL 10: OP10 Royal Blood (Cổng vào Tầng 2) ---
  op10RoyalBlood: {
    id: 'op10RoyalBlood',
    name: 'OP-10: Royal Blood',
    series: 'One Piece Card Game (Dressrosa Royal Blood)',
    releaseYear: 2024,
    totalCards: 126,
    unlockLevel: 10,
    packWholesalePrice: 5.9,
    packRetailPrice: 11.25,
    boxWholesalePrice: 59.0,
    boxRetailPrice: 110.0,
    packsPerBox: 10,
    coverPokemon: 'Gear 4 Luffy Armament & Royal Bloodline',
    themeColor: '#581c87',
    accentColor: '#facc15',
    logoUrl: '/assets/op10_pack_clean.png',
    coverArtUrl: '/assets/op10_pack_clean.png',
    packImageUrl: '/assets/op10_pack_clean.png',
    boxImageUrl: '/assets/op10_box_clean.png',
    description:
      'Cổng vào Tầng 2 (Cấp 10): OP-10 Royal Blood - Cơ hội săn Gear 4 Luffy Haki Vũ Trang cực ngầu và Manga Alt Art! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 11: OP14 The Azure Sea's Seven ---
  op14AzureSea: {
    id: 'op14AzureSea',
    name: "OP-14: The Azure Sea's Seven",
    series: 'One Piece Card Game (Fish-Man Island & Sun Pirates)',
    releaseYear: 2025,
    totalCards: 126,
    unlockLevel: 11,
    packWholesalePrice: 6.05,
    packRetailPrice: 11.5,
    boxWholesalePrice: 60.5,
    boxRetailPrice: 115.0,
    packsPerBox: 10,
    coverPokemon: 'Jinbe, Fisher Tiger & Sun Pirates',
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    logoUrl: '/packs/op14_pack.png',
    packImageUrl: '/packs/op14_pack.png',
    boxImageUrl: '/boxes/op14_box.png',
    description:
      'Cấp 11: Set OP-14 Bảy Vị Anh Hùng Biển Xanh quy tụ Jinbe, Fisher Tiger và Băng Hải Tặc Mặt Trời! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 12: OP15 Adventure on Kami's Island ---
  op15KamisIsland: {
    id: 'op15KamisIsland',
    name: "OP-15: Adventure on Kami's Island",
    series: 'One Piece Card Game (Skypiea)',
    releaseYear: 2025,
    totalCards: 126,
    unlockLevel: 12,
    packWholesalePrice: 6.3,
    packRetailPrice: 12.0,
    boxWholesalePrice: 63.0,
    boxRetailPrice: 120.0,
    packsPerBox: 10,
    coverPokemon: 'Kami Enel 200M Volts & Wiper',
    themeColor: '#ca8a04',
    accentColor: '#fde047',
    logoUrl: '/packs/op15_pack.png',
    packImageUrl: '/packs/op15_pack.png',
    boxImageUrl: '/boxes/op15_box.png',
    description:
      'Cấp 12: Thám hiểm Đảo Trời Skypiea cùng Lôi Thần Enel 200 Triệu Volt và các Thần Binh Thượng Giới! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 13: OP12 Legacy of the Master ---
  op12LegacyMaster: {
    id: 'op12LegacyMaster',
    name: 'OP-12: Legacy of the Master',
    series: 'One Piece Card Game (Roger Pirates)',
    releaseYear: 2025,
    totalCards: 126,
    unlockLevel: 13,
    packWholesalePrice: 6.85,
    packRetailPrice: 13.0,
    boxWholesalePrice: 68.5,
    boxRetailPrice: 130.0,
    packsPerBox: 10,
    coverPokemon: 'Silvers Rayleigh Dark King & Roger Pirates',
    themeColor: '#18181b',
    accentColor: '#f59e0b',
    logoUrl: '/packs/op12_pack.png',
    packImageUrl: '/packs/op12_pack.png',
    boxImageUrl: '/boxes/op12_box.png',
    description:
      'Cấp 13: Di sản của bậc thầy — Vua Bóng Tối Silvers Rayleigh và huyền thoại Băng Hải Tặc Roger! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 14: OP17 The World's Strongest Warriors ---
  op17StrongestWarriors: {
    id: 'op17StrongestWarriors',
    name: "OP-17: The World's Strongest Warriors",
    series: 'One Piece Card Game (Strongest in History)',
    releaseYear: 2025,
    totalCards: 126,
    unlockLevel: 14,
    packWholesalePrice: 7.35,
    packRetailPrice: 14.0,
    boxWholesalePrice: 73.5,
    boxRetailPrice: 140.0,
    packsPerBox: 10,
    coverPokemon: 'Dracule Mihawk & Kozuki Oden',
    themeColor: '#b45309',
    accentColor: '#fbbf24',
    logoUrl: '/packs/op17_pack.png',
    packImageUrl: '/packs/op17_pack.png',
    boxImageUrl: '/boxes/op17_box.png',
    description:
      'Cấp 14: Những chiến binh mạnh nhất lịch sử! Đệ nhất kiếm hào Mihawk Yoru và Kozuki Oden Wano! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 15: OP06 Wings of the Captain ---
  op06WingsCaptain: {
    id: 'op06WingsCaptain',
    name: 'OP-06: Wings of the Captain',
    series: 'One Piece Card Game (Zoro & Sanji)',
    releaseYear: 2024,
    totalCards: 126,
    unlockLevel: 15,
    packWholesalePrice: 7.5,
    packRetailPrice: 14.25,
    boxWholesalePrice: 75.0,
    boxRetailPrice: 142.5,
    packsPerBox: 10,
    coverPokemon: 'Roronoa Zoro Manga & Vinsmoke Sanji',
    themeColor: '#18181b',
    accentColor: '#10b981',
    logoUrl: '/packs/op06_pack.png',
    packImageUrl: '/packs/op06_pack.png',
    boxImageUrl: '/boxes/op06_box.png',
    description:
      'Cấp 15: Đôi cánh của Vua Hải Tặc! Săn Roronoa Zoro Manga Tam Kiếm Phái & Sanji Diable Jambe Alt Art. (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 16: OP07 500 Years in the Future ---
  op07FiveHundred: {
    id: 'op07FiveHundred',
    name: 'OP-07: 500 Years in the Future',
    series: 'One Piece Card Game (Egghead)',
    releaseYear: 2024,
    totalCards: 126,
    unlockLevel: 16,
    packWholesalePrice: 7.65,
    packRetailPrice: 14.5,
    boxWholesalePrice: 76.5,
    boxRetailPrice: 145.0,
    packsPerBox: 10,
    coverPokemon: 'Boa Hancock Manga & Jewelry Bonney',
    themeColor: '#d97706',
    accentColor: '#38bdf8',
    logoUrl: '/packs/op07_pack.png',
    packImageUrl: '/packs/op07_pack.png',
    boxImageUrl: '/boxes/op07_box.png',
    description:
      'Cấp 16: Đảo tương lai Egghead & Nữ Hoàng Hải Tặc Boa Hancock Manga Rare cùng Dr. Vegapunk! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 17: OP13 Carrying on His Will ---
  op13CarryingWill: {
    id: 'op13CarryingWill',
    name: 'OP-13: Carrying on His Will',
    series: 'One Piece Card Game (Revolution & Will of D)',
    releaseYear: 2025,
    totalCards: 126,
    unlockLevel: 17,
    packWholesalePrice: 10.8,
    packRetailPrice: 20.5,
    boxWholesalePrice: 108.0,
    boxRetailPrice: 205.0,
    packsPerBox: 10,
    coverPokemon: 'Monkey D. Dragon & Sabo Flame Emperor',
    themeColor: '#b81828',
    accentColor: '#ea580c',
    logoUrl: '/packs/op13_pack.png',
    packImageUrl: '/packs/op13_pack.png',
    boxImageUrl: '/boxes/op13_box.png',
    description:
      'Cấp 17: Kế thừa ý chí D! Bước nhảy vọt thị trường với Quân Cách Mạng và Sabo Hỏa Đế. (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 18: OP04 Kingdoms of Intrigue ---
  op04KingdomsIntrigue: {
    id: 'op04KingdomsIntrigue',
    name: 'OP-04: Kingdoms of Intrigue',
    series: 'One Piece Card Game (Dressrosa & Alabasta)',
    releaseYear: 2023,
    totalCards: 124,
    unlockLevel: 18,
    packWholesalePrice: 11.7,
    packRetailPrice: 22.25,
    boxWholesalePrice: 117.0,
    boxRetailPrice: 222.5,
    packsPerBox: 10,
    coverPokemon: 'Sabo Manga Rare & Nefeltari Vivi',
    themeColor: '#c8a818',
    accentColor: '#fef08a',
    logoUrl: '/packs/op04_pack.png',
    packImageUrl: '/packs/op04_pack.png',
    boxImageUrl: '/boxes/op04_box.png',
    description:
      'Cấp 18: Bí mật Alabasta & Đấu trường Dressrosa với Tổng tham mưu Sabo Manga & Doflamingo. (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 19: OP09 Emperors in the New World ---
  op09EmperorsNewWorld: {
    id: 'op09EmperorsNewWorld',
    name: 'OP-09: Emperors in the New World',
    series: 'One Piece 2nd Anniversary Special',
    releaseYear: 2024,
    totalCards: 130,
    unlockLevel: 19,
    packWholesalePrice: 12.75,
    packRetailPrice: 24.25,
    boxWholesalePrice: 127.5,
    boxRetailPrice: 242.5,
    packsPerBox: 10,
    coverPokemon: 'Gol D. Roger Gold Manga ($3,800) & Four Emperors',
    themeColor: '#18181b',
    accentColor: '#fbbf24',
    logoUrl: '/packs/op09_pack.png',
    packImageUrl: '/packs/op09_pack.png',
    boxImageUrl: '/boxes/op09_box.png',
    description:
      'Cấp 19: Set tối thượng OP-09 Tứ Hoàng Tân Thế Giới! Cơ hội săn Gol D. Roger Gold Manga $3,800 và Tứ Hoàng Luffy, Shanks, Buggy, Râu Đen! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // --- LEVEL 20: OP11 A Fist of Divine Speed ---
  op11FistDivineSpeed: {
    id: 'op11FistDivineSpeed',
    name: 'OP-11: A Fist of Divine Speed',
    series: 'One Piece Card Game (Garp & Navy Heroes)',
    releaseYear: 2025,
    totalCards: 126,
    unlockLevel: 20,
    packWholesalePrice: 13.4,
    packRetailPrice: 25.5,
    boxWholesalePrice: 134.0,
    boxRetailPrice: 255.0,
    packsPerBox: 10,
    coverPokemon: 'Monkey D. Garp Hero of the Navy & Koby',
    themeColor: '#b80858',
    accentColor: '#f43f5e',
    logoUrl: '/packs/op11_pack.png',
    packImageUrl: '/packs/op11_pack.png',
    boxImageUrl: '/boxes/op11_box.png',
    description:
      'Cấp 20 đỉnh cao Tầng 2: Anh Hùng Hải Quân Garp tung Haki Thiết Quyền Galaxy Impact và Đô Đốc Kuzan! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  // ==========================================
  // DÀNH RIÊNG LEVEL 21+ (RESERVED LEVEL 21+)
  // ==========================================
  op03PillarsStrength: {
    id: 'op03PillarsStrength',
    name: 'OP-03: Pillars of Strength',
    series: 'One Piece Card Game (Whole Cake)',
    releaseYear: 2023,
    totalCards: 122,
    unlockLevel: 21,
    packWholesalePrice: 12.75,
    packRetailPrice: 24.25,
    boxWholesalePrice: 127.5,
    boxRetailPrice: 242.5,
    packsPerBox: 10,
    coverPokemon: 'Sogeking Manga & Charlotte Katakuri',
    themeColor: '#7e22ce',
    accentColor: '#e879f9',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-03',
      title: 'Pillars Strength',
      emblem: '🎯',
      colorA: '#7e22ce',
      colorB: '#3b0764',
      accent: '#f0abfc',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-03',
      title: 'Pillars Strength',
      emblem: '🎯',
      colorA: '#7e22ce',
      colorB: '#3b0764',
      accent: '#f0abfc',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'OP-03',
      title: 'Pillars of Strength Box',
      emblem: '🍩',
      colorA: '#6b21a8',
      colorB: '#2e1065',
      accent: '#f0abfc',
      badge: '10 PACKS · PILLARS',
    }),
    description:
      'Dành cho Cấp 21+: Quy tụ các trụ cột CP9 Rob Lucci và Charlotte Katakuri cùng thẻ Sogeking Manga! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  op02ParamountWar: {
    id: 'op02ParamountWar',
    name: 'OP-02: Paramount War',
    series: 'One Piece Card Game (Marineford)',
    releaseYear: 2023,
    totalCards: 121,
    unlockLevel: 22,
    packWholesalePrice: 13.4,
    packRetailPrice: 25.5,
    boxWholesalePrice: 134.0,
    boxRetailPrice: 255.0,
    packsPerBox: 10,
    coverPokemon: 'Portgas D. Ace Manga & Edward Newgate',
    themeColor: '#ea580c',
    accentColor: '#fbbf24',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-02',
      title: 'Paramount War',
      emblem: '🔥',
      colorA: '#ea580c',
      colorB: '#7c2d12',
      accent: '#fde047',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-02',
      title: 'Paramount War',
      emblem: '🔥',
      colorA: '#ea580c',
      colorB: '#7c2d12',
      accent: '#fde047',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'OP-02',
      title: 'Paramount War Display',
      emblem: '🔥',
      colorA: '#c2410c',
      colorB: '#431407',
      accent: '#fde047',
      badge: '10 PACKS · MARINEFORD',
    }),
    description:
      'Dành cho Cấp 22+: Đại chiến Marineford rực lửa với Hỏa Quyền Ace Manga Rare và Râu Trắng Edward Newgate! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  eb02Anime25th: {
    id: 'eb02Anime25th',
    name: 'EB-02: Anime 25th Collection',
    series: 'One Piece Extra Booster (25th Anniversary)',
    releaseYear: 2024,
    totalCards: 80,
    unlockLevel: 23,
    packWholesalePrice: 17.75,
    packRetailPrice: 33.75,
    boxWholesalePrice: 177.5,
    boxRetailPrice: 337.5,
    packsPerBox: 10,
    coverPokemon: '25th Anniversary Straw Hat Crew',
    themeColor: '#4f46e5',
    accentColor: '#a5b4fc',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'EB-02',
      title: 'Anime 25th',
      emblem: '🎬',
      colorA: '#4f46e5',
      colorB: '#1e1b4b',
      accent: '#fde047',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'EB-02',
      title: 'Anime 25th',
      emblem: '🎬',
      colorA: '#4f46e5',
      colorB: '#1e1b4b',
      accent: '#fde047',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'EB-02',
      title: 'Anime 25th Collection',
      emblem: '⭐',
      colorA: '#4338ca',
      colorB: '#0f172a',
      accent: '#facc15',
      badge: '10 PACKS · 25TH ANIME',
    }),
    description:
      'Dành cho Cấp 23+: Extra Booster kỷ niệm 25 năm Anime One Piece với các hoạt cảnh huyền thoại! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  eb01Memorial: {
    id: 'eb01Memorial',
    name: 'EB-01: Memorial Collection',
    series: 'One Piece Extra Booster (Memorial)',
    releaseYear: 2024,
    totalCards: 80,
    unlockLevel: 24,
    packWholesalePrice: 22.0,
    packRetailPrice: 41.75,
    boxWholesalePrice: 220.0,
    boxRetailPrice: 417.5,
    packsPerBox: 10,
    coverPokemon: 'Tony Tony Chopper Memorial Manga Rare',
    themeColor: '#db2777',
    accentColor: '#f472b6',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'EB-01',
      title: 'Memorial Collection',
      emblem: '🌸',
      colorA: '#db2777',
      colorB: '#4c0519',
      accent: '#fbcfe8',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'EB-01',
      title: 'Memorial Collection',
      emblem: '🌸',
      colorA: '#db2777',
      colorB: '#4c0519',
      accent: '#fbcfe8',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'EB-01',
      title: 'Memorial Collection Box',
      emblem: '🦌',
      colorA: '#be185d',
      colorB: '#1c1917',
      accent: '#f472b6',
      badge: '10 PACKS · MEMORIAL',
    }),
    description:
      'Dành cho Cấp 24+: Set tưởng niệm EB-01 với lá bài Chopper Manga Rare cực hiếm giá trị cao! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  prb01Premium: {
    id: 'prb01Premium',
    name: 'PRB-01: Premium Booster',
    series: 'One Piece Premium Booster (Best Selection)',
    releaseYear: 2024,
    totalCards: 109,
    unlockLevel: 25,
    packWholesalePrice: 22.9,
    packRetailPrice: 43.5,
    boxWholesalePrice: 229.0,
    boxRetailPrice: 435.0,
    packsPerBox: 10,
    coverPokemon: 'Gold All-Star Foil Nami & Zoro',
    themeColor: '#d97706',
    accentColor: '#fde047',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'PRB-01',
      title: 'Premium Booster',
      emblem: '✨',
      colorA: '#d97706',
      colorB: '#451a03',
      accent: '#fde047',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'PRB-01',
      title: 'Premium Booster',
      emblem: '✨',
      colorA: '#d97706',
      colorB: '#451a03',
      accent: '#fde047',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'PRB-01',
      title: 'The Best Premium Booster',
      emblem: '🌟',
      colorA: '#b45309',
      colorB: '#000000',
      accent: '#fde047',
      badge: '10 PACKS · PREMIUM ALL-STAR',
    }),
    description:
      'Dành cho Cấp 25+: Tuyển tập All-Star Premium Booster PRB-01 mạ vàng toàn bộ thẻ hiếm! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  op05Awakening: {
    id: 'op05Awakening',
    name: 'OP-05: Awakening of the New Era',
    series: 'One Piece Card Game (1st Anniversary)',
    releaseYear: 2023,
    totalCards: 126,
    unlockLevel: 26,
    packWholesalePrice: 23.95,
    packRetailPrice: 45.5,
    boxWholesalePrice: 239.5,
    boxRetailPrice: 455.0,
    packsPerBox: 10,
    coverPokemon: 'Gear 5 Luffy Crown Manga ($4,200) & Law/Kid',
    themeColor: '#e2e8f0',
    accentColor: '#c084fc',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-05',
      title: 'Awakening New Era',
      emblem: '☁️',
      colorA: '#6d28d9',
      colorB: '#1e1b4b',
      accent: '#f8fafc',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-05',
      title: 'Awakening New Era',
      emblem: '☁️',
      colorA: '#6d28d9',
      colorB: '#1e1b4b',
      accent: '#f8fafc',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'OP-05',
      title: 'Awakening of New Era',
      emblem: '⚡',
      colorA: '#5b21b6',
      colorB: '#0f172a',
      accent: '#e9d5ff',
      badge: '10 PACKS · GEAR 5 NIKA',
    }),
    description:
      'Dành cho Cấp 26+: Siêu phẩm kỷ niệm 1 năm OP-05 chứa bộ ba Manga Luffy Gear 5, Law & Kid trị giá hàng nghìn đô! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },

  op01RomanceDawn: {
    id: 'op01RomanceDawn',
    name: 'OP-01: Romance Dawn',
    series: 'One Piece Card Game (First Saga)',
    releaseYear: 2022,
    totalCards: 121,
    unlockLevel: 27,
    packWholesalePrice: 31.85,
    packRetailPrice: 60.5,
    boxWholesalePrice: 318.5,
    boxRetailPrice: 605.0,
    packsPerBox: 10,
    coverPokemon: 'Shanks Manga Rare & Monkey D. Luffy Leader',
    themeColor: '#b91c1c',
    accentColor: '#f59e0b',
    logoUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-01',
      title: 'Romance Dawn',
      emblem: '👒',
      colorA: '#b91c1c',
      colorB: '#7f1d1d',
      accent: '#facc15',
    }),
    packImageUrl: createOnePiecePackSvgDataUrl({
      code: 'OP-01',
      title: 'Romance Dawn',
      emblem: '👒',
      colorA: '#dc2626',
      colorB: '#7f1d1d',
      accent: '#facc15',
    }),
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'OP-01',
      title: 'Romance Dawn Booster Box',
      emblem: '🏴‍☠️',
      colorA: '#b91c1c',
      colorB: '#450a0a',
      accent: '#facc15',
      badge: '10 PACKS · ROMANCE DAWN',
    }),
    description:
      'Dành cho Cấp 27+: Chén Thánh khởi đầu OP-01 Romance Dawn săn Shanks Manga Rare! (10 packs/box, 10 cards/pack)',
    universe: 'onepiece',
  },
};

export const ALL_ONEPIECE_BOOSTER_SETS: BoosterSetInfo[] = [
  // Level 10-20 Main Progression
  ONEPIECE_BOOSTER_SETS.op10RoyalBlood,
  ONEPIECE_BOOSTER_SETS.op14AzureSea,
  ONEPIECE_BOOSTER_SETS.op15KamisIsland,
  ONEPIECE_BOOSTER_SETS.op12LegacyMaster,
  ONEPIECE_BOOSTER_SETS.op17StrongestWarriors,
  ONEPIECE_BOOSTER_SETS.op06WingsCaptain,
  ONEPIECE_BOOSTER_SETS.op07FiveHundred,
  ONEPIECE_BOOSTER_SETS.op13CarryingWill,
  ONEPIECE_BOOSTER_SETS.op04KingdomsIntrigue,
  ONEPIECE_BOOSTER_SETS.op09EmperorsNewWorld,
  ONEPIECE_BOOSTER_SETS.op11FistDivineSpeed,
  // Reserved Level 21+
  ONEPIECE_BOOSTER_SETS.op03PillarsStrength,
  ONEPIECE_BOOSTER_SETS.op02ParamountWar,
  ONEPIECE_BOOSTER_SETS.eb02Anime25th,
  ONEPIECE_BOOSTER_SETS.eb01Memorial,
  ONEPIECE_BOOSTER_SETS.prb01Premium,
  ONEPIECE_BOOSTER_SETS.op05Awakening,
  ONEPIECE_BOOSTER_SETS.op01RomanceDawn,
];

// ==========================================
// 2. ONE PIECE VIP COLLECTOR 1x1 BOXES (Tầng 2 Tường Trái)
// ==========================================
export const ONEPIECE_COLLECTOR_BOX_SETS: Record<string, BoosterSetInfo> = {
  op_col_luffy_gear5: {
    id: 'op_col_luffy_gear5',
    name: 'Luffy Gear 5 Nika Ultra-Premium Treasure',
    series: 'One Piece VIP Collector (1×1)',
    releaseYear: 2025,
    totalCards: 200,
    unlockLevel: 9,
    packWholesalePrice: 23.0,
    packRetailPrice: 51.0,
    boxWholesalePrice: 460.0,
    boxRetailPrice: 1020.0,
    packsPerBox: 20,
    coverPokemon: 'Sun God Nika Metal Leader & Gear 5 Alt Art',
    themeColor: '#312e81',
    accentColor: '#e879f9',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op05Awakening.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'VIP-NIKA',
      title: 'Gear 5 Nika Treasure',
      emblem: '☁️',
      colorA: '#6d28d9',
      colorB: '#0f172a',
      accent: '#f0abfc',
      badge: '20 PACKS · GEAR 5 UPC',
    }),
    description:
      'Rương bảo vật VIP Gear 5 Nika trên Tầng 2: 20 pack OP-05, thẻ kim loại Luffy Nika & playmat Trống Giải Phóng. Lãi +$560/hộp!',
    universe: 'onepiece',
  },
  op_col_four_emperors: {
    id: 'op_col_four_emperors',
    name: 'Four Emperors Imperial Vault Box',
    series: 'One Piece VIP Collector (1×1)',
    releaseYear: 2025,
    totalCards: 160,
    unlockLevel: 9,
    packWholesalePrice: 24.4,
    packRetailPrice: 55.0,
    boxWholesalePrice: 390.0,
    boxRetailPrice: 880.0,
    packsPerBox: 16,
    coverPokemon: 'Shanks, Whitebeard, Kaido & Big Mom Promo',
    themeColor: '#991b1b',
    accentColor: '#fbbf24',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op09EmperorsNewWorld.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'VIP-YONKO',
      title: 'Four Emperors Vault',
      emblem: '⚓',
      colorA: '#b91c1c',
      colorB: '#18181b',
      accent: '#fbbf24',
      badge: '16 PACKS · YONKO VIP',
    }),
    description:
      'Rương Tứ Hoàng Tối Cao với 16 packs OP-09 & bộ Promo Tứ Hoàng mạ vàng. Lãi +$490/hộp!',
    universe: 'onepiece',
  },
  op_col_roger_gold: {
    id: 'op_col_roger_gold',
    name: 'Gol D. Roger Laugh Tale Sovereign Trunk',
    series: 'One Piece VIP Collector (1×1)',
    releaseYear: 2026,
    totalCards: 220,
    unlockLevel: 10,
    packWholesalePrice: 21.8,
    packRetailPrice: 52.0,
    boxWholesalePrice: 480.0,
    boxRetailPrice: 1150.0,
    packsPerBox: 22,
    coverPokemon: 'Gol D. Roger Pirate King Gold Metal Card',
    themeColor: '#b45309',
    accentColor: '#fde047',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op09EmperorsNewWorld.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'VIP-ROGER',
      title: 'Laugh Tale Sovereign',
      emblem: '👑',
      colorA: '#d97706',
      colorB: '#1c1917',
      accent: '#fef08a',
      badge: '22 PACKS · PIRATE KING',
    }),
    description:
      'Rương Vua Hải Tặc Gol D. Roger Laugh Tale với 22 packs tuyển chọn và thẻ vàng nguyên khối. Lãi +$670/hộp!',
    universe: 'onepiece',
  },
  op_col_anniversary_trunk: {
    id: 'op_col_anniversary_trunk',
    name: 'One Piece Grand Line 25th Anniversary Trunk',
    series: 'One Piece VIP Collector (1×1)',
    releaseYear: 2026,
    totalCards: 250,
    unlockLevel: 10,
    packWholesalePrice: 20.8,
    packRetailPrice: 52.0,
    boxWholesalePrice: 520.0,
    boxRetailPrice: 1300.0,
    packsPerBox: 25,
    coverPokemon: 'Straw Hat Crew Oda Signed Collection',
    themeColor: '#0f172a',
    accentColor: '#38bdf8',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op01RomanceDawn.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'VIP-25TH',
      title: 'Grand Line 25th Trunk',
      emblem: '🗺️',
      colorA: '#0284c7',
      colorB: '#090d16',
      accent: '#fde047',
      badge: '25 PACKS · ODA TRIBUTE',
    }),
    description:
      'Bảo vật kỷ niệm 25 năm One Piece Grand Line Trunk gồm 25 booster packs kinh điển. Lãi +$780/hộp!',
    universe: 'onepiece',
  },
};

export const ALL_ONEPIECE_COLLECTOR_BOXES: BoosterSetInfo[] = [
  ONEPIECE_COLLECTOR_BOX_SETS.op_col_luffy_gear5,
  ONEPIECE_COLLECTOR_BOX_SETS.op_col_four_emperors,
  ONEPIECE_COLLECTOR_BOX_SETS.op_col_roger_gold,
  ONEPIECE_COLLECTOR_BOX_SETS.op_col_anniversary_trunk,
];

// ==========================================
// 3. ONE PIECE GRAND LINE BOUNTY MYSTERY BOXES (Tầng 2 Kệ Bí Ẩn)
// ==========================================
export const ONEPIECE_BOUNTY_MYSTERY_SETS: Record<string, BoosterSetInfo> = {
  op_bounty_wanted: {
    id: 'op_bounty_wanted',
    name: 'Grand Line Wanted Bounty Box',
    series: 'One Piece Bounty Exclusive',
    releaseYear: 2026,
    totalCards: 200,
    unlockLevel: 10,
    packWholesalePrice: 15.6,
    packRetailPrice: 27.0,
    boxWholesalePrice: 78.0,
    boxRetailPrice: 135.0,
    packsPerBox: 5,
    coverPokemon: 'PSA/CGC 10 Wanted Poster Slab + 2 OP Packs',
    themeColor: '#78350f',
    accentColor: '#fbbf24',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op01RomanceDawn.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'BOUNTY-1',
      title: 'Wanted Bounty Box',
      emblem: '📜',
      colorA: '#92400e',
      colorB: '#1c1917',
      accent: '#fde047',
      badge: 'SLAB PSA 10 + 2 OP PACKS',
    }),
    description:
      'Rương Truy Nã Grand Line: Cam kết 1 Slab PSA/CGC 10 One Piece + 2 OP Booster Packs ngẫu nhiên!',
    universe: 'onepiece',
  },
  op_bounty_yonko: {
    id: 'op_bounty_yonko',
    name: 'Four Emperors Yonko Mystery Chest',
    series: 'One Piece Bounty Exclusive',
    releaseYear: 2026,
    totalCards: 220,
    unlockLevel: 11,
    packWholesalePrice: 15.8,
    packRetailPrice: 29.0,
    boxWholesalePrice: 95.0,
    boxRetailPrice: 175.0,
    packsPerBox: 6,
    coverPokemon: 'Emperor Slab PSA 10 + Gear 5 / Red Hair',
    themeColor: '#881337',
    accentColor: '#fb7185',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op05Awakening.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'BOUNTY-2',
      title: 'Yonko Mystery Chest',
      emblem: '🔥',
      colorA: '#be123c',
      colorB: '#090d16',
      accent: '#fda4af',
      badge: 'YONKO SLAB 10 + 2 PACKS',
    }),
    description:
      'Rương Bí Ẩn Tứ Hoàng: Cam kết 1 Slab PSA/CGC 10 Tứ Hoàng / Supernova + 2 OP Booster Packs!',
    universe: 'onepiece',
  },
  op_bounty_pirate_king: {
    id: 'op_bounty_pirate_king',
    name: 'Pirate King Laugh Tale Black Vault',
    series: 'One Piece Bounty Exclusive',
    releaseYear: 2026,
    totalCards: 250,
    unlockLevel: 12,
    packWholesalePrice: 15.6,
    packRetailPrice: 30.0,
    boxWholesalePrice: 125.0,
    boxRetailPrice: 240.0,
    packsPerBox: 8,
    coverPokemon: 'Crown Manga PSA 10 & Pirate King Vault',
    themeColor: '#09090b',
    accentColor: '#facc15',
    packImageUrl: ONEPIECE_BOOSTER_SETS.op09EmperorsNewWorld.packImageUrl,
    boxImageUrl: createOnePieceBoxSvgDataUrl({
      code: 'BOUNTY-KING',
      title: 'Pirate King Black Vault',
      emblem: '👑',
      colorA: '#18181b',
      colorB: '#000000',
      accent: '#facc15',
      badge: 'MEGA SLAB 10 + 2 OP PACKS',
    }),
    description:
      'Kho báu tối thượng Vua Hải Tặc Laugh Tale Vault: Cam kết Slab PSA/CGC 10 siêu hiếm + cơ hội Manga Crown!',
    universe: 'onepiece',
  },
};

export const ALL_ONEPIECE_BOUNTY_SETS: BoosterSetInfo[] = [
  ONEPIECE_BOUNTY_MYSTERY_SETS.op_bounty_wanted,
  ONEPIECE_BOUNTY_MYSTERY_SETS.op_bounty_yonko,
  ONEPIECE_BOUNTY_MYSTERY_SETS.op_bounty_pirate_king,
];

// ==========================================
// 4. DEVIL FRUIT MYSTERY GACHA (8 TIERS · Tầng 2 Đảo Giữa)
// ==========================================
export const OP_GACHA_PACK_TIERS: Record<string, GachaPackInfo> = {
  op_gomu: {
    id: 'op_gomu' as any,
    name: 'Gomu-Gomu Fruit Pack',
    vietnameseName: 'Trái Cao Su Tân Thủ',
    price: 20.0,
    floorPrice: 10.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 1',
      title: 'Gomu-Gomu No Mi',
      emblem: '🍇',
      colorA: '#9333ea',
      colorB: '#4c1d95',
      accent: '#e9d5ff',
    }),
    themeColor: '#9333ea',
    accentColor: '#d8b4fe',
    rank: 1,
    description: 'Trái Ác Quỷ Gomu-Gomu bình dân: Bảo hiểm sàn 50% ($10+), 0.5% Slab PSA/CGC 10!',
    slabChance: 0.155,
    topJackpot: 120.0,
  },
  op_mera: {
    id: 'op_mera' as any,
    name: 'Mera-Mera Flame Pack',
    vietnameseName: 'Trái Lửa Ace Rực Cháy',
    price: 50.0,
    floorPrice: 25.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 2',
      title: 'Mera-Mera No Mi',
      emblem: '🔥',
      colorA: '#ea580c',
      colorB: '#7c2d12',
      accent: '#fdba74',
    }),
    themeColor: '#ea580c',
    accentColor: '#fb923c',
    rank: 2,
    description: 'Trái Mera-Mera của Hỏa Quyền Ace: 50% sàn $25, cơ hội Slab PSA 10 x4-x5!',
    slabChance: 0.155,
    topJackpot: 350.0,
  },
  op_ope: {
    id: 'op_ope' as any,
    name: 'Ope-Ope Room Pack',
    vietnameseName: 'Trái Phẫu Thuật Law',
    price: 100.0,
    floorPrice: 50.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 3',
      title: 'Ope-Ope No Mi',
      emblem: '💙',
      colorA: '#dc2626',
      colorB: '#7f1d1d',
      accent: '#fca5a5',
    }),
    themeColor: '#dc2626',
    accentColor: '#f87171',
    rank: 3,
    description: 'Trái Ope-Ope tối thượng của Law: Bảo hiểm sàn $50, săn Manga Alt Art & PSA 10!',
    slabChance: 0.155,
    topJackpot: 800.0,
  },
  op_hie: {
    id: 'op_hie' as any,
    name: 'Hie-Hie Ice Pack',
    vietnameseName: 'Trái Băng Giá Kuzan',
    price: 250.0,
    floorPrice: 125.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 4',
      title: 'Hie-Hie No Mi',
      emblem: '❄️',
      colorA: '#0284c7',
      colorB: '#0c4a6e',
      accent: '#7dd3fc',
    }),
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    rank: 4,
    description: 'Trái Hie-Hie Đô Đốc Hải Quân: Sàn $125, jackpot lên tới $2,000!',
    slabChance: 0.155,
    topJackpot: 2000.0,
  },
  op_pika: {
    id: 'op_pika' as any,
    name: 'Pika-Pika Light Pack',
    vietnameseName: 'Trái Ánh Sáng Kizaru',
    price: 500.0,
    floorPrice: 250.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 5',
      title: 'Pika-Pika No Mi',
      emblem: '✨',
      colorA: '#eab308',
      colorB: '#713f12',
      accent: '#fef08a',
    }),
    themeColor: '#eab308',
    accentColor: '#fde047',
    rank: 5,
    description: 'Trái Pika-Pika chói lọi: Bảo hiểm sàn $250, cơ hội nổ hũ tới $4,500!',
    slabChance: 0.155,
    topJackpot: 4500.0,
  },
  op_uo: {
    id: 'op_uo' as any,
    name: 'Uo-Uo Azure Dragon',
    vietnameseName: 'Trái Thanh Long Kaido',
    price: 1000.0,
    floorPrice: 500.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 6',
      title: 'Uo-Uo Seiryu',
      emblem: '🐉',
      colorA: '#0d9488',
      colorB: '#134e4a',
      accent: '#5eead4',
    }),
    themeColor: '#0d9488',
    accentColor: '#2dd4bf',
    rank: 6,
    description: 'Trái Thần Thoại Thanh Long Bách Thú Kaido: Sàn $500, nổ hũ tới $9,000!',
    slabChance: 0.155,
    topJackpot: 9000.0,
  },
  op_yami: {
    id: 'op_yami' as any,
    name: 'Yami-Yami Darkness',
    vietnameseName: 'Trái Bóng Tối Râu Đen',
    price: 2500.0,
    floorPrice: 1250.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 7',
      title: 'Yami-Yami No Mi',
      emblem: '🌑',
      colorA: '#4338ca',
      colorB: '#090d16',
      accent: '#a5b4fc',
    }),
    themeColor: '#4338ca',
    accentColor: '#818cf8',
    rank: 7,
    description: 'Trái Hắc Ám Teach dành cho Đại Gia Whale: Sàn $1,250, săn Manga PSA 10 tới $20,000!',
    slabChance: 0.155,
    topJackpot: 20000.0,
  },
  op_nika: {
    id: 'op_nika' as any,
    name: 'Hito-Hito Model Nika',
    vietnameseName: 'Trái Thần Mặt Trời Nika',
    price: 5000.0,
    floorPrice: 2500.0,
    imageUrl: createOnePiecePackSvgDataUrl({
      code: 'DEVIL 8',
      title: 'Sun God Nika',
      emblem: '☀️',
      colorA: '#db2777',
      colorB: '#3b0764',
      accent: '#fde047',
    }),
    themeColor: '#db2777',
    accentColor: '#f472b6',
    rank: 8,
    description: 'Bảo vật Thần Thoại Hito-Hito Model Nika! Cơ hội rinh Manga Crown PSA 10 lên tới $35,000!',
    slabChance: 0.155,
    topJackpot: 35000.0,
  },
};

// ==========================================
// 5. ONE PIECE CARD DATABASE (64 CARDS · OP-01 -> OP-09)
// ==========================================
// Using EXPANDED_OP_SEEDS imported from onePieceCardsExpanded (138+ card seeds across OP-01 through OP-17, EB-01, EB-02, PRB-01)
export const OP_SEEDS: OpCardSeed[] = EXPANDED_OP_SEEDS;

const RARITY_META: Record<
  OpCardSeed['tier'],
  {
    rarity: PokemonCard['rarity'];
    raritySymbol: string;
    holo: PokemonCard['holographicType'];
    labelPrefix: string;
  }
> = {
  Diamond1: { rarity: 'Common', raritySymbol: '♢', holo: 'none', labelPrefix: 'Common (C)' },
  Diamond2: { rarity: 'Uncommon', raritySymbol: '♢♢', holo: 'reverse', labelPrefix: 'Uncommon (UC)' },
  Diamond3: { rarity: 'Rare Holo', raritySymbol: '♢♢♢', holo: 'holo', labelPrefix: 'Rare (R)' },
  Diamond4: { rarity: 'Double Rare EX', raritySymbol: '♢♢♢♢', holo: 'cosmic', labelPrefix: 'Super Rare (SR)' },
  Star1: { rarity: 'Illustration Rare', raritySymbol: '☆', holo: 'rainbow', labelPrefix: 'Alt Art (AA)' },
  Star2: { rarity: 'Special Illustration Rare', raritySymbol: '☆☆', holo: 'gold', labelPrefix: 'Secret Alt (SP)' },
  Star3: { rarity: 'Special Illustration Rare', raritySymbol: '☆☆☆', holo: 'immersive', labelPrefix: 'Manga Rare' },
  Crown: { rarity: 'Hyper Rare Gold', raritySymbol: '👑', holo: 'gold', labelPrefix: 'Crown Manga' },
};

export function getOnePieceBandaiImageUrl(setNumber: string, isManga?: boolean, tier?: string): string {
  const clean = setNumber.replace(/\s+SP$/i, '').trim().toUpperCase();
  // Manga Alt Art / Crown / Star3 / Alt Art use the parallel _p1 suffix on optcgapi.com
  if (isManga || tier === 'Crown' || tier === 'Star3' || tier === 'Star1' || tier === 'Star2') {
    return `https://optcgapi.com/media/static/Card_Images/${clean}_p1.jpg`;
  }
  return `https://optcgapi.com/media/static/Card_Images/${clean}.jpg`;
}

export function getOnePieceSecondaryImageUrl(setNumber: string, isManga?: boolean, tier?: string): string {
  const clean = setNumber.replace(/\s+SP$/i, '').trim().toUpperCase();
  return `https://optcgapi.com/media/static/Card_Images/${clean}.jpg`;
}

export const ONEPIECE_CARDS_DB: PokemonCard[] = getAllOpCardsList();

// ==========================================
// 6. ONE PIECE LICENSES & FLOOR 2 SHELF UNLOCKS
// Level 10-20 Standardized Market Economy
// Total Level 10-20 Licenses = $16,550 (pack) + $20,800 (box) = $37,350
// ==========================================
export const ONEPIECE_PRODUCT_LICENSES: ProductLicense[] = [
  // --- LEVEL 10: OP-10 Royal Blood (Cổng vào Tầng 2) ---
  {
    id: 'lic_op10_pack',
    productId: 'op10RoyalBlood_pack',
    name: 'Giấy Phép Pack OP-10: Royal Blood',
    set: 'OP-10 Royal Blood (2F)',
    type: 'pack',
    level: 10,
    licenseFee: 600,
    cost: 5.9,
    price: 11.25,
    description: 'Cổng vào Tầng 2 (Cấp 10): Mở bán gói OP-10 Royal Blood (10 thẻ/pack). Vốn nhập $5.90, bán lẻ $11.25 (Lãi 91%).',
    imageUrl: '/assets/op10_pack_clean.png',
  },
  {
    id: 'lic_op10_box',
    productId: 'op10RoyalBlood_box',
    name: 'Giấy Phép Box OP-10: Royal Blood',
    set: 'OP-10 Royal Blood (2F)',
    type: 'box',
    level: 10,
    licenseFee: 750,
    cost: 59.0,
    price: 110.0,
    packsPerBox: 10,
    description: 'Hộp Booster Box OP-10 nguyên seal (10 packs, 10 thẻ/pack). Vốn nhập $59, bán lẻ $110 (Lãi +$51/hộp).',
    imageUrl: '/assets/op10_box_clean.png',
  },

  // --- LEVEL 11: OP-14 The Azure Sea's Seven ---
  {
    id: 'lic_op14_pack',
    productId: 'op14AzureSea_pack',
    name: "Giấy Phép Pack OP-14: Azure Sea's Seven",
    set: 'OP-14 Azure Sea (2F)',
    type: 'pack',
    level: 11,
    licenseFee: 700,
    cost: 6.05,
    price: 11.5,
    description: 'Cấp 11: Mở bán gói OP-14 Bảy Vị Anh Hùng Biển Xanh (10 thẻ/pack). Vốn $6.05, bán $11.50 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op14AzureSea.packImageUrl,
  },
  {
    id: 'lic_op14_box',
    productId: 'op14AzureSea_box',
    name: "Giấy Phép Box OP-14: Azure Sea's Seven",
    set: 'OP-14 Azure Sea (2F)',
    type: 'box',
    level: 11,
    licenseFee: 900,
    cost: 60.5,
    price: 115.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-14 (10 packs, 10 thẻ/pack). Vốn nhập $60.50, bán $115 (Lãi +$54.50/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op14AzureSea.boxImageUrl,
  },

  // --- LEVEL 12: OP-15 Adventure on Kami's Island ---
  {
    id: 'lic_op15_pack',
    productId: 'op15KamisIsland_pack',
    name: "Giấy Phép Pack OP-15: Kami's Island",
    set: 'OP-15 Kami Island (2F)',
    type: 'pack',
    level: 12,
    licenseFee: 800,
    cost: 6.3,
    price: 12.0,
    description: 'Cấp 12: Mở bán gói OP-15 Đảo Trời Skypiea (10 thẻ/pack). Vốn $6.30, bán $12.00 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op15KamisIsland.packImageUrl,
  },
  {
    id: 'lic_op15_box',
    productId: 'op15KamisIsland_box',
    name: "Giấy Phép Box OP-15: Kami's Island",
    set: 'OP-15 Kami Island (2F)',
    type: 'box',
    level: 12,
    licenseFee: 1000,
    cost: 63.0,
    price: 120.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-15 (10 packs, 10 thẻ/pack). Vốn nhập $63, bán $120 (Lãi +$57/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op15KamisIsland.boxImageUrl,
  },

  // --- LEVEL 13: OP-12 Legacy of the Master ---
  {
    id: 'lic_op12_pack',
    productId: 'op12LegacyMaster_pack',
    name: 'Giấy Phép Pack OP-12: Legacy Master',
    set: 'OP-12 Legacy Master (2F)',
    type: 'pack',
    level: 13,
    licenseFee: 950,
    cost: 6.85,
    price: 13.0,
    description: 'Cấp 13: Mở bán gói OP-12 Di Sản Bậc Thầy Rayleigh (10 thẻ/pack). Vốn $6.85, bán $13.00 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op12LegacyMaster.packImageUrl,
  },
  {
    id: 'lic_op12_box',
    productId: 'op12LegacyMaster_box',
    name: 'Giấy Phép Box OP-12: Legacy Master',
    set: 'OP-12 Legacy Master (2F)',
    type: 'box',
    level: 13,
    licenseFee: 1200,
    cost: 68.5,
    price: 130.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-12 (10 packs, 10 thẻ/pack). Vốn nhập $68.50, bán $130 (Lãi +$61.50/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op12LegacyMaster.boxImageUrl,
  },

  // --- LEVEL 14: OP-17 The World's Strongest Warriors ---
  {
    id: 'lic_op17_pack',
    productId: 'op17StrongestWarriors_pack',
    name: 'Giấy Phép Pack OP-17: Strongest Warriors',
    set: 'OP-17 Strongest Warriors (2F)',
    type: 'pack',
    level: 14,
    licenseFee: 1100,
    cost: 7.35,
    price: 14.0,
    description: 'Cấp 14: Mở bán gói OP-17 Chiến Binh Mạnh Nhất (10 thẻ/pack). Vốn $7.35, bán $14.00 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op17StrongestWarriors.packImageUrl,
  },
  {
    id: 'lic_op17_box',
    productId: 'op17StrongestWarriors_box',
    name: 'Giấy Phép Box OP-17: Strongest Warriors',
    set: 'OP-17 Strongest Warriors (2F)',
    type: 'box',
    level: 14,
    licenseFee: 1400,
    cost: 73.5,
    price: 140.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-17 (10 packs, 10 thẻ/pack). Vốn nhập $73.50, bán $140 (Lãi +$66.50/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op17StrongestWarriors.boxImageUrl,
  },

  // --- LEVEL 15: OP-06 Wings of the Captain ---
  {
    id: 'lic_op06_pack',
    productId: 'op06WingsCaptain_pack',
    name: 'Giấy Phép Pack OP-06: Wings of Captain',
    set: 'OP-06 Wings of Captain (2F)',
    type: 'pack',
    level: 15,
    licenseFee: 1300,
    cost: 7.5,
    price: 14.25,
    description: 'Cấp 15: Mở bán gói OP-06 Zoro & Sanji (10 thẻ/pack). Vốn $7.50, bán $14.25 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op06WingsCaptain.packImageUrl,
  },
  {
    id: 'lic_op06_box',
    productId: 'op06WingsCaptain_box',
    name: 'Giấy Phép Box OP-06: Wings of Captain',
    set: 'OP-06 Wings of Captain (2F)',
    type: 'box',
    level: 15,
    licenseFee: 1650,
    cost: 75.0,
    price: 142.5,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-06 (10 packs, 10 thẻ/pack). Vốn nhập $75, bán $142.50 (Lãi +$67.50/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op06WingsCaptain.boxImageUrl,
  },

  // --- LEVEL 16: OP-07 500 Years in the Future ---
  {
    id: 'lic_op07_pack',
    productId: 'op07FiveHundred_pack',
    name: 'Giấy Phép Pack OP-07: 500 Years Future',
    set: 'OP-07 Egghead (2F)',
    type: 'pack',
    level: 16,
    licenseFee: 1500,
    cost: 7.65,
    price: 14.5,
    description: 'Cấp 16: Mở bán gói OP-07 Egghead (10 thẻ/pack). Vốn $7.65, bán $14.50 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op07FiveHundred.packImageUrl,
  },
  {
    id: 'lic_op07_box',
    productId: 'op07FiveHundred_box',
    name: 'Giấy Phép Box OP-07: 500 Years Future',
    set: 'OP-07 Egghead (2F)',
    type: 'box',
    level: 16,
    licenseFee: 1900,
    cost: 76.5,
    price: 145.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-07 (10 packs, 10 thẻ/pack). Vốn nhập $76.50, bán $145 (Lãi +$68.50/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op07FiveHundred.boxImageUrl,
  },

  // --- LEVEL 17: OP-13 Carrying on His Will ---
  {
    id: 'lic_op13_pack',
    productId: 'op13CarryingWill_pack',
    name: 'Giấy Phép Pack OP-13: Carrying Will',
    set: 'OP-13 Carrying Will (2F)',
    type: 'pack',
    level: 17,
    licenseFee: 1800,
    cost: 10.8,
    price: 20.5,
    description: 'Cấp 17 (Bước nhảy vọt): Mở bán gói OP-13 Quân Cách Mạng (10 thẻ/pack). Vốn $10.80, bán $20.50 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op13CarryingWill.packImageUrl,
  },
  {
    id: 'lic_op13_box',
    productId: 'op13CarryingWill_box',
    name: 'Giấy Phép Box OP-13: Carrying Will',
    set: 'OP-13 Carrying Will (2F)',
    type: 'box',
    level: 17,
    licenseFee: 2250,
    cost: 108.0,
    price: 205.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-13 (10 packs, 10 thẻ/pack). Vốn nhập $108, bán $205 (Lãi lớn +$97/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op13CarryingWill.boxImageUrl,
  },

  // --- LEVEL 18: OP-04 Kingdoms of Intrigue ---
  {
    id: 'lic_op04_pack',
    productId: 'op04KingdomsIntrigue_pack',
    name: 'Giấy Phép Pack OP-04: Kingdoms Intrigue',
    set: 'OP-04 Kingdoms Intrigue (2F)',
    type: 'pack',
    level: 18,
    licenseFee: 2200,
    cost: 11.7,
    price: 22.25,
    description: 'Cấp 18: Mở bán gói OP-04 Dressrosa & Sabo Manga (10 thẻ/pack). Vốn $11.70, bán $22.25 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op04KingdomsIntrigue.packImageUrl,
  },
  {
    id: 'lic_op04_box',
    productId: 'op04KingdomsIntrigue_box',
    name: 'Giấy Phép Box OP-04: Kingdoms Intrigue',
    set: 'OP-04 Kingdoms Intrigue (2F)',
    type: 'box',
    level: 18,
    licenseFee: 2750,
    cost: 117.0,
    price: 222.5,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-04 (10 packs, 10 thẻ/pack). Vốn nhập $117, bán $222.50 (Lãi +$105.50/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op04KingdomsIntrigue.boxImageUrl,
  },

  // --- LEVEL 19: OP-09 Emperors in the New World ---
  {
    id: 'lic_op09_pack',
    productId: 'op09EmperorsNewWorld_pack',
    name: 'Giấy Phép Pack OP-09: Emperors New World',
    set: 'OP-09 Four Emperors (2F)',
    type: 'pack',
    level: 19,
    licenseFee: 2600,
    cost: 12.75,
    price: 24.25,
    description: 'Cấp 19: Mở bán gói OP-09 Tứ Hoàng Tân Thế Giới (10 thẻ/pack). Vốn $12.75, bán $24.25 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op09EmperorsNewWorld.packImageUrl,
  },
  {
    id: 'lic_op09_box',
    productId: 'op09EmperorsNewWorld_box',
    name: 'Giấy Phép Box OP-09: Emperors New World',
    set: 'OP-09 Four Emperors (2F)',
    type: 'box',
    level: 19,
    licenseFee: 3250,
    cost: 127.5,
    price: 242.5,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-09 (10 packs, 10 thẻ/pack). Vốn nhập $127.50, bán $242.50 (Lãi +$115/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op09EmperorsNewWorld.boxImageUrl,
  },

  // --- LEVEL 20: OP-11 A Fist of Divine Speed ---
  {
    id: 'lic_op11_pack',
    productId: 'op11FistDivineSpeed_pack',
    name: 'Giấy Phép Pack OP-11: Divine Speed',
    set: 'OP-11 Divine Speed (2F)',
    type: 'pack',
    level: 20,
    licenseFee: 3000,
    cost: 13.4,
    price: 25.5,
    description: 'Cấp 20 đỉnh cao Tầng 2: Mở bán gói OP-11 Anh Hùng Garp (10 thẻ/pack). Vốn $13.40, bán $25.50 (Lãi 90%).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op11FistDivineSpeed.packImageUrl,
  },
  {
    id: 'lic_op11_box',
    productId: 'op11FistDivineSpeed_box',
    name: 'Giấy Phép Box OP-11: Divine Speed',
    set: 'OP-11 Divine Speed (2F)',
    type: 'box',
    level: 20,
    licenseFee: 3750,
    cost: 134.0,
    price: 255.0,
    packsPerBox: 10,
    description: 'Hộp nguyên seal OP-11 (10 packs, 10 thẻ/pack). Vốn nhập $134, bán $255 (Lãi khủng +$121/hộp).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op11FistDivineSpeed.boxImageUrl,
  },

  // --- DÀNH RIÊNG LEVEL 21+ (RESERVED LICENSES) ---
  {
    id: 'lic_op03_pack',
    productId: 'op03PillarsStrength_pack',
    name: 'Giấy Phép Pack OP-03: Pillars of Strength',
    set: 'OP-03 Pillars Strength (2F)',
    type: 'pack',
    level: 21,
    licenseFee: 3500,
    cost: 12.75,
    price: 24.25,
    description: 'Cấp 21+: Gói OP-03 Katakuri & Sogeking Manga (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op03PillarsStrength.packImageUrl,
  },
  {
    id: 'lic_op03_box',
    productId: 'op03PillarsStrength_box',
    name: 'Giấy Phép Box OP-03: Pillars of Strength',
    set: 'OP-03 Pillars Strength (2F)',
    type: 'box',
    level: 21,
    licenseFee: 4500,
    cost: 127.5,
    price: 242.5,
    packsPerBox: 10,
    description: 'Hộp 10 pack OP-03 Pillars of Strength trên Tầng 2.',
    imageUrl: ONEPIECE_BOOSTER_SETS.op03PillarsStrength.boxImageUrl,
  },
  {
    id: 'lic_op02_pack',
    productId: 'op02ParamountWar_pack',
    name: 'Giấy Phép Pack OP-02: Paramount War',
    set: 'OP-02 Paramount War (2F)',
    type: 'pack',
    level: 22,
    licenseFee: 4000,
    cost: 13.4,
    price: 25.5,
    description: 'Cấp 22+: Gói OP-02 Đại chiến Marineford (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op02ParamountWar.packImageUrl,
  },
  {
    id: 'lic_op02_box',
    productId: 'op02ParamountWar_box',
    name: 'Giấy Phép Box OP-02: Paramount War',
    set: 'OP-02 Paramount War (2F)',
    type: 'box',
    level: 22,
    licenseFee: 5000,
    cost: 134.0,
    price: 255.0,
    packsPerBox: 10,
    description: 'Hộp 10 pack OP-02 Paramount War trên Tầng 2.',
    imageUrl: ONEPIECE_BOOSTER_SETS.op02ParamountWar.boxImageUrl,
  },
  {
    id: 'lic_eb02_pack',
    productId: 'eb02Anime25th_pack',
    name: 'Giấy Phép Pack EB-02: Anime 25th',
    set: 'EB-02 Anime 25th (2F)',
    type: 'pack',
    level: 23,
    licenseFee: 4500,
    cost: 17.75,
    price: 33.75,
    description: 'Cấp 23+: Gói Extra Booster kỷ niệm 25 năm Anime One Piece (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.eb02Anime25th.packImageUrl,
  },
  {
    id: 'lic_eb02_box',
    productId: 'eb02Anime25th_box',
    name: 'Giấy Phép Box EB-02: Anime 25th',
    set: 'EB-02 Anime 25th (2F)',
    type: 'box',
    level: 23,
    licenseFee: 6000,
    cost: 177.5,
    price: 337.5,
    packsPerBox: 10,
    description: 'Hộp 10 pack EB-02 Anime 25th Collection.',
    imageUrl: ONEPIECE_BOOSTER_SETS.eb02Anime25th.boxImageUrl,
  },
  {
    id: 'lic_eb01_pack',
    productId: 'eb01Memorial_pack',
    name: 'Giấy Phép Pack EB-01: Memorial',
    set: 'EB-01 Memorial (2F)',
    type: 'pack',
    level: 24,
    licenseFee: 5000,
    cost: 22.0,
    price: 41.75,
    description: 'Cấp 24+: Gói EB-01 Memorial Chopper Manga Rare (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.eb01Memorial.packImageUrl,
  },
  {
    id: 'lic_eb01_box',
    productId: 'eb01Memorial_box',
    name: 'Giấy Phép Box EB-01: Memorial',
    set: 'EB-01 Memorial (2F)',
    type: 'box',
    level: 24,
    licenseFee: 7000,
    cost: 220.0,
    price: 417.5,
    packsPerBox: 10,
    description: 'Hộp 10 pack EB-01 Memorial Collection.',
    imageUrl: ONEPIECE_BOOSTER_SETS.eb01Memorial.boxImageUrl,
  },
  {
    id: 'lic_prb01_pack',
    productId: 'prb01Premium_pack',
    name: 'Giấy Phép Pack PRB-01: Premium Booster',
    set: 'PRB-01 Premium (2F)',
    type: 'pack',
    level: 25,
    licenseFee: 6000,
    cost: 22.9,
    price: 43.5,
    description: 'Cấp 25+: Gói All-Star PRB-01 mạ vàng toàn bộ (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.prb01Premium.packImageUrl,
  },
  {
    id: 'lic_prb01_box',
    productId: 'prb01Premium_box',
    name: 'Giấy Phép Box PRB-01: Premium Booster',
    set: 'PRB-01 Premium (2F)',
    type: 'box',
    level: 25,
    licenseFee: 8000,
    cost: 229.0,
    price: 435.0,
    packsPerBox: 10,
    description: 'Hộp 10 pack PRB-01 Premium Booster All-Star.',
    imageUrl: ONEPIECE_BOOSTER_SETS.prb01Premium.boxImageUrl,
  },
  {
    id: 'lic_op05_pack',
    productId: 'op05Awakening_pack',
    name: 'Giấy Phép Pack OP-05: Awakening New Era',
    set: 'OP-05 Awakening (2F)',
    type: 'pack',
    level: 26,
    licenseFee: 7000,
    cost: 23.95,
    price: 45.5,
    description: 'Cấp 26+: Gói OP-05 Gear 5 Nika & Chữ ký Oda trị giá cao (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op05Awakening.packImageUrl,
  },
  {
    id: 'lic_op05_box',
    productId: 'op05Awakening_box',
    name: 'Giấy Phép Box OP-05: Awakening New Era',
    set: 'OP-05 Awakening (2F)',
    type: 'box',
    level: 26,
    licenseFee: 9000,
    cost: 239.5,
    price: 455.0,
    packsPerBox: 10,
    description: 'Hộp Display 10 pack OP-05 Awakening of the New Era.',
    imageUrl: ONEPIECE_BOOSTER_SETS.op05Awakening.boxImageUrl,
  },
  {
    id: 'lic_op01_pack',
    productId: 'op01RomanceDawn_pack',
    name: 'Giấy Phép Pack OP-01: Romance Dawn',
    set: 'OP-01 Romance Dawn (2F)',
    type: 'pack',
    level: 27,
    licenseFee: 8500,
    cost: 31.85,
    price: 60.5,
    description: 'Cấp 27+: Chén Thánh gói OP-01 Romance Dawn săn Shanks Manga Rare (10 thẻ/pack).',
    imageUrl: ONEPIECE_BOOSTER_SETS.op01RomanceDawn.packImageUrl,
  },
  {
    id: 'lic_op01_box',
    productId: 'op01RomanceDawn_box',
    name: 'Giấy Phép Box OP-01: Romance Dawn',
    set: 'OP-01 Romance Dawn (2F)',
    type: 'box',
    level: 27,
    licenseFee: 12000,
    cost: 318.5,
    price: 605.0,
    packsPerBox: 10,
    description: 'Hộp Chén Thánh 10 pack OP-01 Romance Dawn thị trường $605!',
    imageUrl: ONEPIECE_BOOSTER_SETS.op01RomanceDawn.boxImageUrl,
  },

  // --- SPECIALTY & COLLECTOR LICENSES ---
  {
    id: 'lic_op_bounty_wanted',
    productId: 'op_bounty_wanted_box',
    name: 'Giấy Phép Grand Line Bounty Box (2F)',
    set: 'Grand Line Bounty (2F)',
    type: 'box',
    level: 10,
    licenseFee: 1000,
    cost: 78.0,
    price: 135.0,
    packsPerBox: 5,
    description: 'Mở khóa các rương Bí Ẩn Truy Nã Grand Line trên Tầng 2 (1 Slab PSA 10 + 2 OP Packs).',
    imageUrl: ONEPIECE_BOUNTY_MYSTERY_SETS.op_bounty_wanted.boxImageUrl,
  },
  {
    id: 'lic_op_devil_gacha',
    productId: 'gacha_op_gomu',
    name: 'Giấy Phép Gondola Trái Ác Quỷ Gacha (2F)',
    set: 'Devil Fruit Gacha (2F)',
    type: 'pack',
    level: 10,
    licenseFee: 1200,
    cost: 12.0,
    price: 20.0,
    description: 'Mở khóa phân phối 8 hạng Gói Trái Ác Quỷ Mystery trên đảo giữa Tầng 2.',
    imageUrl: OP_GACHA_PACK_TIERS.op_gomu.imageUrl,
  },
  {
    id: 'lic_op_col_gear5',
    productId: 'op_col_luffy_gear5_box',
    name: 'Giấy Phép VIP Luffy Gear 5 Treasure (2F)',
    set: 'OP VIP Collector 1x1 (2F)',
    type: 'box',
    level: 11,
    licenseFee: 1250,
    cost: 460.0,
    price: 1020.0,
    packsPerBox: 20,
    description: 'Rương Gear 5 Nika Ultra-Premium trên Tầng 2 (Lãi +$560/hộp).',
    imageUrl: ONEPIECE_COLLECTOR_BOX_SETS.op_col_luffy_gear5.boxImageUrl,
  },
  {
    id: 'lic_op_col_four_emperors',
    productId: 'op_col_four_emperors_box',
    name: 'Giấy Phép VIP Four Emperors Vault (2F)',
    set: 'OP VIP Collector 1x1 (2F)',
    type: 'box',
    level: 13,
    licenseFee: 1500,
    cost: 390.0,
    price: 880.0,
    packsPerBox: 16,
    description: 'Rương Tứ Hoàng Tối Cao 16 packs trên Tầng 2 (Lãi +$490/hộp).',
    imageUrl: ONEPIECE_COLLECTOR_BOX_SETS.op_col_four_emperors.boxImageUrl,
  },
  {
    id: 'lic_op_col_roger',
    productId: 'op_col_roger_gold_box',
    name: 'Giấy Phép VIP Gol D. Roger Sovereign (2F)',
    set: 'OP VIP Collector 1x1 (2F)',
    type: 'box',
    level: 16,
    licenseFee: 1850,
    cost: 480.0,
    price: 1150.0,
    packsPerBox: 22,
    description: 'Rương Vua Hải Tặc Gol D. Roger Laugh Tale 22 packs (Lãi +$670/hộp).',
    imageUrl: ONEPIECE_COLLECTOR_BOX_SETS.op_col_roger_gold.boxImageUrl,
  },
  {
    id: 'lic_op_col_anniversary',
    productId: 'op_col_anniversary_trunk_box',
    name: 'Giấy Phép VIP Grand Line 25th Trunk (2F)',
    set: 'OP VIP Collector 1x1 (2F)',
    type: 'box',
    level: 18,
    licenseFee: 2500,
    cost: 520.0,
    price: 1300.0,
    packsPerBox: 25,
    description: 'Rương kỷ niệm 25 năm Grand Line 25 packs trên Tầng 2 (Lãi +$780/hộp).',
    imageUrl: ONEPIECE_COLLECTOR_BOX_SETS.op_col_anniversary_trunk.boxImageUrl,
  },
];

export const ONEPIECE_STARTER_UNLOCKED_SHELVES: string[] = [
  'op_shelf_wall_bay_1',
  'op_shelf_card_1',
];

export const ONEPIECE_SHELF_UNLOCKS: ShelfUnlockDefinition[] = [
  // 1. Floor 2 Right Wall: 4-Bay One Piece Expansion Collection
  {
    id: 'op_shelf_wall_bay_1',
    name: 'Tầng 2 · Khoang Kệ One Piece #1 (Khởi Đầu)',
    shortName: '2F OP Kệ #1',
    category: 'wall_expansion',
    floor: 2,
    level: 10,
    fee: 0,
    capacityText: '2 Ô Box (16 Hộp) · 8 Cột Pack (80 Gói)',
    description: 'Khoang kệ One Piece khởi đầu miễn phí khi mở Tầng 2 cho bộ OP-10 Royal Blood.',
    accentColor: '#581c87',
    bayIndex: 0,
  },
  {
    id: 'op_shelf_wall_bay_2',
    name: 'Tầng 2 · Khoang Kệ One Piece #2',
    shortName: '2F OP Kệ #2',
    category: 'wall_expansion',
    floor: 2,
    level: 12,
    fee: 600,
    capacityText: '+2 Ô Box (16 Hộp) · +8 Cột Pack (80 Gói)',
    description: 'Mở rộng khoang kệ One Piece thứ 2 trên Tầng 2 cho OP-14 Azure Sea & OP-15 Kami.',
    accentColor: '#0284c7',
    bayIndex: 1,
  },
  {
    id: 'op_shelf_wall_bay_3',
    name: 'Tầng 2 · Khoang Kệ One Piece #3',
    shortName: '2F OP Kệ #3',
    category: 'wall_expansion',
    floor: 2,
    level: 15,
    fee: 1200,
    capacityText: '+2 Ô Box (16 Hộp) · +8 Cột Pack (80 Gói)',
    description: 'Mở khóa khoang kệ One Piece thứ 3 trên Tầng 2 cho OP-12 Rayleigh & OP-17 Strongest.',
    accentColor: '#be185d',
    bayIndex: 2,
  },
  {
    id: 'op_shelf_wall_bay_4',
    name: 'Tầng 2 · Khoang Kệ One Piece #4 (Full Dãy)',
    shortName: '2F OP Kệ #4',
    category: 'wall_expansion',
    floor: 2,
    level: 18,
    fee: 2000,
    capacityText: '+2 Ô Box (16 Hộp) · +8 Cột Pack (80 Gói)',
    description: 'Hoàn thiện toàn bộ 4 khoang kệ One Piece Tầng 2 (320 pack + 64 box).',
    accentColor: '#fbbf24',
    bayIndex: 3,
  },
  // 2. Floor 2 Back Wall: 3 OP Card Display Shelves
  {
    id: 'op_shelf_card_1',
    name: 'Tầng 2 · Kệ Trưng Bày Thẻ OP #1',
    shortName: '2F Thẻ OP #1',
    category: 'card_display',
    floor: 2,
    level: 10,
    fee: 0,
    capacityText: '6 Chân Đứng Thẻ OP',
    description: 'Kệ trưng bày thẻ lẻ One Piece đầu tiên trên tường sau Tầng 2 (miễn phí).',
    accentColor: '#581c87',
    bayIndex: 0,
  },
  {
    id: 'op_shelf_card_2',
    name: 'Tầng 2 · Kệ Trưng Bày Thẻ OP #2',
    shortName: '2F Thẻ OP #2',
    category: 'card_display',
    floor: 2,
    level: 13,
    fee: 500,
    capacityText: '+6 Chân Đứng Thẻ OP',
    description: 'Mở khóa kệ kính thẻ lẻ One Piece #2 trên Tầng 2 để trưng thêm Alt Art & Slab.',
    accentColor: '#4338ca',
    bayIndex: 1,
  },
  {
    id: 'op_shelf_card_3',
    name: 'Tầng 2 · Kệ Trưng Bày Thẻ OP #3',
    shortName: '2F Thẻ OP #3',
    category: 'card_display',
    floor: 2,
    level: 16,
    fee: 1000,
    capacityText: '+6 Chân Đứng Thẻ OP',
    description: 'Mở khóa kệ kính Tứ Hoàng & Manga Crown trên tường sau Tầng 2.',
    accentColor: '#a855f7',
    bayIndex: 2,
  },
  // 3. Floor 2 Specialty Shelves (Center Devil Fruit Gondola & Bounty Rack)
  {
    id: 'op_shelf_gacha_gondola',
    name: 'Tầng 2 · Đảo Gondola Trái Ác Quỷ Gacha',
    shortName: '2F Trái Ác Quỷ',
    category: 'specialty',
    floor: 2,
    level: 10,
    fee: 800,
    capacityText: '8 Hạng Gói Trái Ác Quỷ (Tier 1 → 8)',
    description: 'Mở khóa kệ đảo giữa Tầng 2 chuyên bán 8 phân hạng Gói Trái Ác Quỷ One Piece.',
    accentColor: '#9333ea',
  },
  {
    id: 'op_shelf_bounty_mystery',
    name: 'Tầng 2 · Kệ Rương Truy Nã Grand Line',
    shortName: '2F Kệ Bounty',
    category: 'specialty',
    floor: 2,
    level: 10,
    fee: 1000,
    capacityText: '3 Tầng Hộp Grand Line Bounty',
    description: 'Mở khóa kệ rương bí ẩn Truy Nã Grand Line ở góc trước trái Tầng 2.',
    accentColor: '#dc2626',
  },
  // 4. Floor 2 Left-Wall VIP Treasure 1x1 Shelves
  {
    id: 'op_shelf_collector_1',
    name: 'Tầng 2 · Tủ VIP OP #1: Luffy Gear 5 Nika',
    shortName: '2F VIP Gear 5',
    category: 'collector_vip',
    floor: 2,
    level: 11,
    fee: 800,
    capacityText: '4 Hộp VIP Treasure 1×1',
    description: 'Mở khóa tủ trưng bày VIP tường trái Tầng 2 cho rương Gear 5 Nika Treasure.',
    accentColor: '#a855f7',
    bayIndex: 0,
  },
  {
    id: 'op_shelf_collector_2',
    name: 'Tầng 2 · Tủ VIP OP #2: Four Emperors Vault',
    shortName: '2F VIP Tứ Hoàng',
    category: 'collector_vip',
    floor: 2,
    level: 13,
    fee: 1000,
    capacityText: '4 Hộp VIP Treasure 1×1',
    description: 'Mở khóa tủ VIP Tầng 2 #2 dành cho rương Tứ Hoàng Imperial Vault.',
    accentColor: '#dc2626',
    bayIndex: 1,
  },
  {
    id: 'op_shelf_collector_3',
    name: 'Tầng 2 · Tủ VIP OP #3: Gol D. Roger Sovereign',
    shortName: '2F VIP Roger',
    category: 'collector_vip',
    floor: 2,
    level: 16,
    fee: 1500,
    capacityText: '4 Hộp VIP Treasure 1×1',
    description: 'Mở khóa tủ VIP Tầng 2 #3 dành cho rương Vua Hải Tặc Gol D. Roger.',
    accentColor: '#f59e0b',
    bayIndex: 2,
  },
  {
    id: 'op_shelf_collector_4',
    name: 'Tầng 2 · Tủ VIP OP #4: Grand Line 25th Trunk',
    shortName: '2F VIP 25th',
    category: 'collector_vip',
    floor: 2,
    level: 18,
    fee: 2000,
    capacityText: '4 Hộp VIP Treasure 1×1',
    description: 'Mở khóa tủ VIP Tầng 2 #4 dành cho bảo vật Grand Line 25th Anniversary Trunk.',
    accentColor: '#0284c7',
    bayIndex: 3,
  },
];

// ==========================================
// 7. HELPERS & GENERATORS
// ==========================================
export function isOnePieceSetId(id?: string): boolean {
  if (!id) return false;
  const clean = id.replace(/_(pack|box)$/, '');
  return (
    clean in ONEPIECE_BOOSTER_SETS ||
    clean in ONEPIECE_COLLECTOR_BOX_SETS ||
    clean in ONEPIECE_BOUNTY_MYSTERY_SETS ||
    clean.startsWith('gacha_op_') ||
    clean.startsWith('op_') ||
    clean.startsWith('op0') ||
    clean.startsWith('op10') ||
    clean.startsWith('op')
  );
}

export function isOnePieceCollectorProduct(productId?: string): boolean {
  if (!productId) return false;
  const clean = productId.replace(/_box$/, '');
  return clean in ONEPIECE_COLLECTOR_BOX_SETS;
}

export function isOnePieceBountyProduct(productId?: string): boolean {
  if (!productId) return false;
  const clean = productId.replace(/_box$/, '');
  return clean in ONEPIECE_BOUNTY_MYSTERY_SETS;
}

export function isOnePieceGachaProduct(productId?: string): boolean {
  if (!productId) return false;
  const tierKey = productId.replace(/^gacha_/, '');
  return productId.startsWith('gacha_op_') || tierKey in OP_GACHA_PACK_TIERS;
}

export function isOnePieceProductId(productId?: string): boolean {
  if (!productId) return false;
  return (
    isOnePieceSetId(productId) ||
    isOnePieceCollectorProduct(productId) ||
    isOnePieceBountyProduct(productId) ||
    isOnePieceGachaProduct(productId)
  );
}

export function getOnePieceCollectorShelfIdForProduct(productId: string): string | null {
  const clean = (productId || '').replace(/_box$/, '');
  if (clean === 'op_col_luffy_gear5') return 'op_shelf_collector_1';
  if (clean === 'op_col_four_emperors') return 'op_shelf_collector_2';
  if (clean === 'op_col_roger_gold') return 'op_shelf_collector_3';
  if (clean === 'op_col_anniversary_trunk') return 'op_shelf_collector_4';
  return null;
}

export function getOnePieceSet(setId: string): BoosterSetInfo | undefined {
  const clean = (setId || '').replace(/_(pack|box)$/, '');
  if (ONEPIECE_BOOSTER_SETS[clean]) return ONEPIECE_BOOSTER_SETS[clean];
  if (ONEPIECE_COLLECTOR_BOX_SETS[clean]) return ONEPIECE_COLLECTOR_BOX_SETS[clean];
  if (ONEPIECE_BOUNTY_MYSTERY_SETS[clean]) return ONEPIECE_BOUNTY_MYSTERY_SETS[clean];
  return undefined;
}

export function getOnePieceSetCards(setId: string): PokemonCard[] {
  const clean = (setId || '').replace(/_(pack|box)$/, '');
  // VIP Collector trunks pull from signature sets + OP-05/OP-09 grails
  if (clean === 'op_col_luffy_gear5') {
    return [...getFullOpSetCards('op05Awakening'), ...getFullOpSetCards('op01RomanceDawn')];
  }
  if (clean === 'op_col_four_emperors' || clean === 'op_col_roger_gold') {
    return [...getFullOpSetCards('op09EmperorsNewWorld'), ...getFullOpSetCards('op02ParamountWar')];
  }
  if (clean === 'op_col_anniversary_trunk') {
    return ONEPIECE_CARDS_DB;
  }
  const full = getFullOpSetCards(clean);
  if (full && full.length > 0) return full;
  const exact = ONEPIECE_CARDS_DB.filter((c) => c.setId === clean);
  return exact.length > 0 ? exact : ONEPIECE_CARDS_DB;
}

export interface OnePieceSetEventInfo {
  title: string;
  featuredGrail: string;
  mangaQuote: string;
  japaneseTitle: string;
}

export const ONEPIECE_SET_EVENTS: Record<string, OnePieceSetEventInfo> = {
  op01RomanceDawn: {
    title: 'Săn Tóc Đỏ Shanks Manga Rare ($1,650) - Divine Departure',
    featuredGrail: 'Shanks (Manga Alt Art)',
    mangaQuote: 'Ta đến đây để kết thúc cuộc chiến này!',
    japaneseTitle: '赤髪のシャンクス (RED-HAIRED SHANKS)',
  },
  op02ParamountWar: {
    title: 'Đại Chiến Marineford - Săn Hỏa Quyền Portgas D. Ace Manga ($920)',
    featuredGrail: 'Portgas D. Ace (Manga)',
    mangaQuote: 'Cảm ơn mọi người vì đã yêu quý ta!',
    japaneseTitle: '火拳のエース (FIRE FIST ACE)',
  },
  op03PillarsStrength: {
    title: 'Sát Thủ CP9 vs Vua Bắn Tỉa - Săn Sogeking Manga Rare ($680)',
    featuredGrail: 'Sogeking (Manga Rare)',
    mangaQuote: 'Khóa mục tiêu... Bắn cháy lá cờ đó cho ta!',
    japaneseTitle: 'そげキング (SOGEKING)',
  },
  op04KingdomsIntrigue: {
    title: 'Bí Mật Dressrosa & Alabasta - Săn Sabo Manga Alt Art ($790)',
    featuredGrail: 'Sabo (Manga Alt Art)',
    mangaQuote: 'Ngọn lửa của Ace sẽ không bao giờ tắt!',
    japaneseTitle: '革命軍サボ (REVOLUTIONARY SABO)',
  },
  op05Awakening: {
    title: 'Kỷ Niệm 1 Năm - Thần Mặt Trời Nika Gear 5 Manga Crown ($4,200) & Oda Signature',
    featuredGrail: 'Luffy Gear 5 (Manga Crown)',
    mangaQuote: 'Đây chính là đỉnh cao của ta! Gear 5th!',
    japaneseTitle: '太陽の神ニカ ギア5 (SUN GOD NIKA)',
  },
  op06WingsCaptain: {
    title: 'Đôi Cánh Vua Hải Tặc - Săn Roronoa Zoro Manga Tam Kiếm Địa Ngục ($1,280)',
    featuredGrail: 'Roronoa Zoro (Manga)',
    mangaQuote: 'Ta sẽ trở thành Vua Địa Ngục để đưa Luffy lên ngôi!',
    japaneseTitle: '閻王三刀流 ゾロ (KING OF HELL ZORO)',
  },
  op07FiveHundred: {
    title: 'Tương Lai 500 Năm Egghead - Săn Nữ Hoàng Boa Hancock Manga Rare ($1,120)',
    featuredGrail: 'Boa Hancock (Manga Rare)',
    mangaQuote: 'Dù ta có làm gì, thế giới cũng sẽ tha thứ vì ta quá đẹp!',
    japaneseTitle: '海賊女帝 ボア・ハンコック (EMPRESS HANCOCK)',
  },
  op09EmperorsNewWorld: {
    title: 'Tứ Hoàng Tân Thế Giới - Săn Vua Hải Tặc Gol D. Roger Gold Manga 24K ($3,800)',
    featuredGrail: 'Gol D. Roger (Gold Manga)',
    mangaQuote: 'Kho báu của ta? Nếu muốn hãy ra biển mà tìm!',
    japaneseTitle: '海賊王 ゴール・D・ロジャー (PIRATE KING ROGER)',
  },
  op10RoyalBlood: {
    title: 'Vương Tộc Dressrosa - Săn Luffy Gear 4 Manga Crown Haki ($1,680)',
    featuredGrail: 'Monkey D. Luffy (OP-10 Manga Rare Crown)',
    mangaQuote: 'Haki Vũ Trang toàn thân! Gomu Gomu no Cannonball!',
    japaneseTitle: 'ギア4 弾む男 (GEAR 4 TANKMAN)',
  },
  op11FistDivineSpeed: {
    title: 'Nắm Đấm Thần Tốc - Săn Huyền Thoại Monkey D. Garp Galaxy Impact Manga ($2,350)',
    featuredGrail: 'Monkey D. Garp (Galaxy Impact Manga Crown)',
    mangaQuote: 'Nắm đấm của Anh Hùng Hải Quân san phẳng vạn vật!',
    japaneseTitle: '拳骨衝突 ゲンコツ (GALAXY IMPACT)',
  },
  op12LegacyMaster: {
    title: 'Di Sản Bậc Thầy - Săn Vua Bóng Tối Silvers Rayleigh Manga Crown ($1,780)',
    featuredGrail: 'Silvers Rayleigh (Dark King Manga Crown)',
    mangaQuote: 'Kỷ nguyên này chưa kết thúc đâu những kẻ trẻ tuổi!',
    japaneseTitle: '冥王 レイリー (DARK KING RAYLEIGH)',
  },
  op13CarryingWill: {
    title: 'Kế Thừa Ý Chí - Săn Gol D. Roger Will of D Manga Crown ($2,100)',
    featuredGrail: 'Gol D. Roger (Will of D Manga Crown)',
    mangaQuote: 'Ý chí kế thừa, vận mệnh của thời đại, giấc mơ của con người!',
    japaneseTitle: '受け継がれる意志 (WILL OF D)',
  },
  op14AzureSea: {
    title: 'Thất Vũ Hải Biển Xanh - Săn Fisher Tiger Manga Crown Giải Phóng ($1,450)',
    featuredGrail: 'Fisher Tiger (Manga Rare Crown)',
    mangaQuote: 'Giải phóng nô lệ dưới ngọn cờ Băng Mặt Trời!',
    japaneseTitle: 'タイヨウの海賊団 (SUN PIRATES TIGER)',
  },
  op15KamisIsland: {
    title: 'Đảo Kami Skypiea - Săn Lôi Thần Kami Enel Manga Crown ($1,650)',
    featuredGrail: 'Kami Enel (Manga Rare Crown)',
    mangaQuote: 'Con người không thể chống lại Thần! 200 Triệu Volts!',
    japaneseTitle: '雷神 エネル (THUNDER GOD ENEL)',
  },
  op17StrongestWarriors: {
    title: 'Chiến Binh Mạnh Nhất - Săn Đệ Nhất Kiếm Hào Mihawk Manga Crown ($1,850)',
    featuredGrail: 'Dracule Mihawk (Strongest Manga Crown)',
    mangaQuote: 'Thanh Hắc Kiếm Yoru chém đôi vận mệnh!',
    japaneseTitle: '鷹の目のミホーク (HAWKEYE MIHAWK)',
  },
  eb01Memorial: {
    title: 'Bộ Sưu Tập Tưởng Niệm - Săn Tony Tony Chopper Memorial Manga ($1,400)',
    featuredGrail: 'Tony Tony Chopper (Memorial Manga)',
    mangaQuote: 'Khi nào con người mới thực sự chết đi? Khi họ bị lãng quên!',
    japaneseTitle: 'トニートニー・チョッパー (CHOPPER MEMORIAL)',
  },
  eb02Anime25th: {
    title: 'Kỷ Niệm 25 Năm Anime - Săn Trọn Bộ Băng Mũ Rơm Manga Crown ($1,950)',
    featuredGrail: 'Straw Hat Crew (25th Manga Crown)',
    mangaQuote: '25 Năm giương buồm chinh phục Đại Hải Trình!',
    japaneseTitle: '麦わらの一味 25周年 (STRAW HAT 25TH)',
  },
};

export function ripOnePieceBoosterPack(
  setId: string,
  guaranteedHitTier?: 'Crown' | 'Star3' | 'Star2' | 'Star1' | 'Diamond4'
): PackRipResult {
  const cleanId = (setId || 'op10RoyalBlood').replace(/_(pack|box)$/, '');
  const poolCards = getOnePieceSetCards(cleanId);
  const setEvent = ONEPIECE_SET_EVENTS[cleanId];

  const d1 = poolCards.filter((c) => c.pocketRarity === 'Diamond1');
  const d2 = poolCards.filter((c) => c.pocketRarity === 'Diamond2');
  const d3 = poolCards.filter((c) => c.pocketRarity === 'Diamond3');
  const d4 = poolCards.filter((c) => c.pocketRarity === 'Diamond4');
  const s1 = poolCards.filter((c) => c.pocketRarity === 'Star1');
  const s2 = poolCards.filter((c) => c.pocketRarity === 'Star2');
  const s3 = poolCards.filter((c) => c.pocketRarity === 'Star3');
  const crown = poolCards.filter((c) => c.pocketRarity === 'Crown');

  const ultraPool = poolCards.filter(
    (c) =>
      c.isManga ||
      c.pocketRarity === 'Star1' ||
      c.pocketRarity === 'Star2' ||
      c.pocketRarity === 'Star3' ||
      c.pocketRarity === 'Crown'
  );

  // God Pack 0.05% (Manga Pirate God Pack - 10 ultra hit cards!)
  if (!guaranteedHitTier && Math.random() < 0.0005 && ultraPool.length > 0) {
    const godCards: PokemonCard[] = [];
    const usedGodIds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const avail = ultraPool.filter((c) => !usedGodIds.has(c.id));
      const pick = avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : ultraPool[i % ultraPool.length];
      if (pick) {
        usedGodIds.add(pick.id);
        godCards.push(pick);
      }
    }
    const mangaHit = godCards.find((c) => c.isManga || c.pocketRarity === 'Crown' || c.pocketRarity === 'Star3');
    return {
      cards: godCards,
      isGodPack: true,
      setId: cleanId,
      hasMangaRare: !!mangaHit,
      specialEventTitle: '🔥 GÓI THẦN THÁNH MANGA PIRATE GOD PACK (10 SIÊU THẺ HIT)!',
      mangaRareCard: mangaHit,
    };
  }

  // Duplicate protection: ensure 10 distinct cards in the pack
  const pickedIds = new Set<string>();
  const picked: PokemonCard[] = [];

  const pickUnique = (pool: PokemonCard[], fallback: PokemonCard[] = d1): PokemonCard => {
    if (pool && pool.length > 0) {
      const avail = pool.filter((c) => !pickedIds.has(c.id));
      if (avail.length > 0) {
        const chosen = avail[Math.floor(Math.random() * avail.length)];
        pickedIds.add(chosen.id);
        return chosen;
      }
    }
    if (fallback && fallback.length > 0) {
      const availFallback = fallback.filter((c) => !pickedIds.has(c.id));
      if (availFallback.length > 0) {
        const chosen = availFallback[Math.floor(Math.random() * availFallback.length)];
        pickedIds.add(chosen.id);
        return chosen;
      }
      const repeatFallback = fallback[Math.floor(Math.random() * fallback.length)];
      if (repeatFallback) return repeatFallback;
    }
    const anyCard = poolCards[Math.floor(Math.random() * poolCards.length)] || ONEPIECE_CARDS_DB[0];
    pickedIds.add(anyCard.id);
    return anyCard;
  };

  // Cards 1-7: 7 distinct Commons (C) (Tương tự 7 slot Common cơ bản của Pokémon TCG)
  for (let i = 0; i < 7; i++) {
    picked.push(pickUnique(d1, d2));
  }

  // Card 8: Common / Uncommon (UC) - 65% Common, 35% Uncommon
  if (Math.random() < 0.35 && d2.length > 0) {
    picked.push(pickUnique(d2, d1));
  } else {
    picked.push(pickUnique(d1, d2));
  }

  // Card 9: Slot Pre-hit / Foil Slot (Tương tự Reverse Holo Slot của Pokémon TCG)
  // 40% Uncommon, 42% Rare Holo (R), 14% Super Rare (SR), 3.5% Alt Art (AA), 0.5% Secret Rare (SEC)
  const r9 = Math.random();
  if (r9 < 0.005 && (s2.length > 0 || s3.length > 0)) {
    picked.push(pickUnique(s2.length > 0 ? s2 : s3, d4));
  } else if (r9 < 0.04 && s1.length > 0) {
    picked.push(pickUnique(s1, d4));
  } else if (r9 < 0.18 && d4.length > 0) {
    picked.push(pickUnique(d4, d3));
  } else if (r9 < 0.60 && d3.length > 0) {
    picked.push(pickUnique(d3, d2));
  } else {
    picked.push(pickUnique(d2, d1));
  }

  // Card 10: HIT SLOT TỐI THƯỢNG (Tương tự Rare / Ultra Rare / Secret Rare Slot Pokémon TCG)
  let hitCard: PokemonCard;
  let hasMangaRare = false;
  let specialEventTitle: string | undefined;

  if (guaranteedHitTier) {
    // Factory guaranteed hit from Box Seeding
    if (guaranteedHitTier === 'Crown' && (crown.length > 0 || s3.length > 0)) {
      const pool = crown.length > 0 ? crown : s3;
      hitCard = pickUnique(pool, s2);
      hasMangaRare = true;
      specialEventTitle = setEvent?.title || '👑 SỰ KIỆN: HIT MANGA RARE BẢO VẬT TRUYỀN THUYẾT!';
    } else if (guaranteedHitTier === 'Star3' && s3.length > 0) {
      hitCard = pickUnique(s3, s2);
      hasMangaRare = true;
      specialEventTitle = setEvent?.title || '★ SỰ KIỆN: HIT MANGA RARE ALT ART!';
    } else if (guaranteedHitTier === 'Star2' && (s2.length > 0 || s1.length > 0)) {
      hitCard = pickUnique(s2.length > 0 ? s2 : s1, d4);
    } else if (guaranteedHitTier === 'Star1' && s1.length > 0) {
      hitCard = pickUnique(s1, d4);
    } else {
      hitCard = pickUnique(d4, d3);
    }
  } else {
    // Realistic Hit Rate Roll:
    // 0.25% Crown Manga 24K, 0.85% Star3 Manga Rare, 2.8% Secret Alt (Star2), 8.5% Alt Art (Star1), 22.5% Super Rare (Diamond4), 45% Rare Holo (Diamond3), 20.1% Uncommon (Diamond2)
    const hitRoll = Math.random();

    if (hitRoll < 0.0025 && crown.length > 0) {
      hitCard = pickUnique(crown, s3);
      hasMangaRare = true;
      specialEventTitle = setEvent?.title || '👑 SỰ KIỆN: HIT MANGA RARE CROWN 24K!';
    } else if (hitRoll < 0.011 && s3.length > 0) {
      hitCard = pickUnique(s3, s2);
      hasMangaRare = true;
      specialEventTitle = setEvent?.title || '★ SỰ KIỆN: HIT MANGA RARE ALT ART!';
    } else if (hitRoll < 0.039 && s2.length > 0) {
      hitCard = pickUnique(s2, s1);
    } else if (hitRoll < 0.124 && s1.length > 0) {
      hitCard = pickUnique(s1, d4);
    } else if (hitRoll < 0.349 && d4.length > 0) {
      hitCard = pickUnique(d4, d3);
    } else if (hitRoll < 0.799 && d3.length > 0) {
      hitCard = pickUnique(d3, d2);
    } else {
      hitCard = pickUnique(d2, d1);
    }
  }

  if (hitCard.isManga || hitCard.pocketRarity === 'Crown' || hitCard.pocketRarity === 'Star3') {
    hasMangaRare = true;
    if (!specialEventTitle) {
      specialEventTitle = setEvent?.title || '🔥 SỰ KIỆN: HIT MANGA RARE ĐỘC QUYỀN!';
    }
  }

  picked.push(hitCard);

  return {
    cards: picked,
    isGodPack: false,
    setId: cleanId,
    hasMangaRare,
    specialEventTitle,
    mangaRareCard: hasMangaRare ? hitCard : undefined,
  };
}

let cachedOpSortedCards: PokemonCard[] | null = null;
function getOpSortedCards(): PokemonCard[] {
  if (!cachedOpSortedCards) {
    cachedOpSortedCards = [...ONEPIECE_CARDS_DB].sort((a, b) => a.marketPrice - b.marketPrice);
  }
  return cachedOpSortedCards;
}

export function rollOnePieceGachaPack(tierId: string, rng: () => number = Math.random): GachaPullResult {
  const cleanKey = tierId.replace(/^gacha_/, '');
  const pack = OP_GACHA_PACK_TIERS[cleanKey] || OP_GACHA_PACK_TIERS.op_gomu;
  const rand = rng();

  let rawMultiplier = 0.5;
  let isJackpot = false;

  if (rand < 0.35) {
    rawMultiplier = 0.5 + rng() * 0.25;
  } else if (rand < 0.68) {
    rawMultiplier = 0.8 + rng() * 0.35;
  } else if (rand < 0.88) {
    rawMultiplier = 1.25 + rng() * 1.25;
  } else if (rand < 0.97) {
    rawMultiplier = 3.0 + rng() * 3.0;
    isJackpot = true;
  } else {
    rawMultiplier = 7.0 + rng() * 8.0;
    isJackpot = true;
  }

  const rawPrice = Math.max(pack.floorPrice, Math.round(pack.price * rawMultiplier));
  const sorted = getOpSortedCards();
  let bestCard = sorted[0];
  let bestDiff = Math.abs(bestCard.marketPrice - rawPrice);
  for (const c of sorted) {
    const diff = Math.abs(c.marketPrice - rawPrice);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCard = c;
    }
  }

  const slabRoll = rng();
  let isSlab = false;
  let slab: GradedSlab | undefined;
  let gradeMultiplier = 1.0;

  if (slabRoll < 0.005) {
    isSlab = true;
    const company: 'PSA' | 'CGC' = rng() < 0.5 ? 'PSA' : 'CGC';
    gradeMultiplier = +(4.0 + rng() * 1.0).toFixed(2);
    isJackpot = true;
    slab = {
      company,
      grade: 10,
      gradeLabel: company === 'CGC' ? 'PRISTINE 10' : 'GEM MT 10',
      certNumber: Math.floor(10000000 + rng() * 89999999).toString(),
      year: 2024,
    };
  } else if (slabRoll < 0.055) {
    isSlab = true;
    const company: 'PSA' | 'CGC' = rng() < 0.5 ? 'PSA' : 'CGC';
    gradeMultiplier = +(1.3 + rng() * 0.1).toFixed(2);
    slab = {
      company,
      grade: 9,
      gradeLabel: 'MINT 9',
      certNumber: Math.floor(10000000 + rng() * 89999999).toString(),
      year: 2024,
    };
  } else if (slabRoll < 0.155) {
    isSlab = true;
    const company: 'PSA' | 'CGC' = rng() < 0.5 ? 'PSA' : 'CGC';
    gradeMultiplier = 1.0;
    slab = {
      company,
      grade: 8,
      gradeLabel: 'NM-MT 8',
      certNumber: Math.floor(10000000 + rng() * 89999999).toString(),
      year: 2024,
    };
  }

  const finalPayoutValue = Math.max(pack.floorPrice, Math.round(rawPrice * gradeMultiplier * 100) / 100);
  const finalMultiplier = finalPayoutValue / pack.price;

  return {
    card: {
      ...bestCard,
      marketPrice: finalPayoutValue,
      hasRgbAura: finalPayoutValue >= 50 || slab?.grade === 10,
    },
    isSlab,
    slab,
    rawPrice,
    gradeMultiplier,
    payoutValue: finalPayoutValue,
    multiplier: Math.round(finalMultiplier * 100) / 100,
    isJackpot,
    packId: pack.id,
    packName: pack.name,
  };
}

export function rollOnePieceBountyBox(boxId: string, rng: () => number = Math.random): GameStopMysteryBoxResult {
  const cleanId = (boxId || 'op_bounty_wanted').replace(/_box$/, '');
  const box = ONEPIECE_BOUNTY_MYSTERY_SETS[cleanId] || ONEPIECE_BOUNTY_MYSTERY_SETS.op_bounty_wanted;

  const company: 'PSA' | 'CGC' = rng() < 0.65 ? 'PSA' : 'CGC';
  const slab: GradedSlab = {
    company,
    grade: 10,
    gradeLabel: company === 'PSA' ? 'GEM MT 10' : 'PRISTINE 10',
    certNumber: String(Math.floor(10000000 + rng() * 89999999)),
    year: 2025,
  };

  let minRaw = 20;
  let maxRaw = 95;
  if (cleanId === 'op_bounty_yonko') {
    minRaw = 45;
    maxRaw = 160;
  } else if (cleanId === 'op_bounty_pirate_king') {
    minRaw = 80;
    maxRaw = 420;
  }

  const candidates = ONEPIECE_CARDS_DB.filter((c) => c.marketPrice >= minRaw && c.marketPrice <= maxRaw);
  const pool = candidates.length > 0 ? candidates : ONEPIECE_CARDS_DB;
  const rawCard = pool[Math.floor(rng() * pool.length)] || ONEPIECE_CARDS_DB[0];

  const slabMultiplier = Math.round((2.4 + rng() * 1.4) * 10) / 10;
  const slabMarketValue = Math.round(rawCard.marketPrice * slabMultiplier);

  const slabCard: PokemonCard = {
    ...rawCard,
    marketPrice: slabMarketValue,
    hasRgbAura: slabMarketValue >= 80,
    isSlab: true,
    slab,
  };

  const opSetKeys = Object.keys(ONEPIECE_BOOSTER_SETS);
  const k1 = opSetKeys[Math.floor(rng() * opSetKeys.length)];
  let k2 = opSetKeys[Math.floor(rng() * opSetKeys.length)];
  if (k2 === k1) {
    k2 = opSetKeys[(opSetKeys.indexOf(k1) + 1) % opSetKeys.length];
  }

  const s1 = ONEPIECE_BOOSTER_SETS[k1];
  const s2 = ONEPIECE_BOOSTER_SETS[k2];

  const packs = [
    { setId: s1.id, setName: s1.name, packImageUrl: s1.packImageUrl },
    { setId: s2.id, setName: s2.name, packImageUrl: s2.packImageUrl },
  ];

  return {
    boxId: box.id,
    boxName: box.name,
    retailPrice: box.boxRetailPrice,
    slabCard,
    slab,
    slabMarketValue,
    packs,
    totalMarketValue: slabMarketValue + s1.packRetailPrice + s2.packRetailPrice,
  };
}
