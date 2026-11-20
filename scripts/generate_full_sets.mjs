import fs from 'fs';
import { execSync } from 'child_process';

const TCGCSV_GROUP_IDS = {
  // Paldean Fates
  sv4pt5: 23353,
  sv1: 22873,
  sv2: 23120,
  sv3: 23228,
  sv4: 23286,
  // Ascended Heroes
  me2pt5: 24541,
  sv8pt5: 23821,
  me1: 24380,
  me2: 24448,
  // Evolving Skies
  swsh7: 2848,
  swsh12pt5gg: 17689,
  swsh8: 2906,
  swsh11: 3118,
  swsh1: 2585,
  swsh4: 2701,
  swsh6: 2807,
  // Cosmic Eclipse
  sm12: 2534,
  sm9: 2377,
  sm10: 2420,
  sm11: 2464,
  // Destined Rivals
  sv10: 24269,
  sv8: 23651,
  sv9: 24073,
  sv7: 23537,
  // Perfect Order
  me3: 24587,
  me4: 24655,
  me5: 24688,
  xy2: 1464,
  xy1: 1387,
  // Base Set Vintage (Red Version)
  base1: 604,
  base2: 635,
  base3: 630,
  base4: 605,
  base5: 1373,
  gym1: 1441,
  gym2: 1440,
  // 30th Anniversary (Common Set)
  me55: 24722,
  me55c: 24837,
  cel25: 2867,
  cel25c: 2931,
  sv3pt5: 23237,
  sv5: 23381,
  sv6: 23473,
};

function fetchJson(url) {
  const raw = execSync(`curl -s -L --max-time 25 "${url}"`, {
    encoding: 'utf-8',
    maxBuffer: 30 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function fetchSetJson(setCode) {
  const url = `https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/${setCode}.json`;
  console.log(`Fetching cards ${setCode}...`);
  const data = fetchJson(url);
  if (!Array.isArray(data)) {
    throw new Error(`Invalid JSON array for ${setCode}`);
  }
  return data;
}

function normalizeNum(numStr) {
  if (!numStr) return '';
  const head = String(numStr).split('/')[0].trim().toUpperCase();
  if (/^0+\d+$/.test(head)) {
    return String(parseInt(head, 10));
  }
  const m = head.match(/^([A-Z]+)0*(\d+)([A-Z]*)$/);
  if (m) {
    return `${m[1]}${parseInt(m[2], 10)}${m[3]}`;
  }
  return head;
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*-\s*[\w/]+$/, '')
    .replace(/[^a-z0-9]/g, '');
}

const tcgcsvCache = new Map();

function fetchTcgcsvLookup(setCode) {
  const gid = TCGCSV_GROUP_IDS[setCode];
  if (!gid) return null;
  if (tcgcsvCache.has(gid)) return tcgcsvCache.get(gid);

  console.log(`  Fetching live TCGplayer prices (group ${gid}) for ${setCode}...`);
  const prods = fetchJson(`https://tcgcsv.com/tcgplayer/3/${gid}/products`).results || [];
  const prices = fetchJson(`https://tcgcsv.com/tcgplayer/3/${gid}/prices`).results || [];

  const pricesByProd = new Map();
  for (const p of prices) {
    if (!pricesByProd.has(p.productId)) pricesByProd.set(p.productId, []);
    pricesByProd.get(p.productId).push(p);
  }

  const byNum = new Map();
  const byName = new Map();

  for (const pr of prods) {
    const numExt = (pr.extendedData || []).find((e) => e.name === 'Number');
    const rarExt = (pr.extendedData || []).find((e) => e.name === 'Rarity');
    const prodPrices = pricesByProd.get(pr.productId) || [];
    if (!numExt && !rarExt) continue; // skip sealed boxes/packs

    const entry = {
      name: pr.name,
      rarity: rarExt?.value || '',
      number: numExt?.value || '',
      prices: prodPrices,
    };

    if (numExt?.value) {
      const kNum = normalizeNum(numExt.value);
      if (!byNum.has(kNum)) byNum.set(kNum, []);
      byNum.get(kNum).push(entry);
    }
    const kName = normalizeName(pr.cleanName || pr.name);
    if (kName) {
      if (!byName.has(kName)) byName.set(kName, []);
      byName.get(kName).push(entry);
    }
  }

  const res = { byNum, byName };
  tcgcsvCache.set(gid, res);
  return res;
}

function pickBestPrice(prodEntry, isVintage, isHoloRarity) {
  if (!prodEntry || !prodEntry.prices || prodEntry.prices.length === 0) return 0;
  const rows = prodEntry.prices;

  const getVal = (row) => {
    if (!row) return 0;
    return Number(row.marketPrice || row.midPrice || row.lowPrice || 0);
  };

  if (isVintage) {
    // Prefer Unlimited / Normal over 1st Edition so Commons/Uncommons reflect standard pack pulls
    const prefOrder = isHoloRarity
      ? ['Unlimited Holofoil', 'Holofoil', 'Unlimited', 'Normal', '1st Edition Holofoil', '1st Edition']
      : ['Unlimited', 'Normal', 'Unlimited Holofoil', 'Holofoil', '1st Edition', '1st Edition Holofoil'];
    for (const sub of prefOrder) {
      const found = rows.find((r) => r.subTypeName === sub && getVal(r) > 0);
      if (found) return +getVal(found).toFixed(2);
    }
  } else {
    const prefOrder = isHoloRarity
      ? ['Holofoil', 'Normal', 'Reverse Holofoil']
      : ['Normal', 'Holofoil', 'Reverse Holofoil'];
    for (const sub of prefOrder) {
      const found = rows.find((r) => r.subTypeName === sub && getVal(r) > 0);
      if (found) return +getVal(found).toFixed(2);
    }
  }

  let best = 0;
  for (const r of rows) {
    const v = getVal(r);
    if (v > best) best = v;
  }
  return +best.toFixed(2);
}

function findTcgcsvMatch(lookup, card) {
  if (!lookup) return null;
  const kNum = normalizeNum(card.number);
  const kName = normalizeName(card.name);

  if (kNum && lookup.byNum.has(kNum)) {
    const candidates = lookup.byNum.get(kNum);
    if (candidates.length === 1) return candidates[0];
    const nameMatched = candidates.find(
      (c) => normalizeName(c.name) === kName || normalizeName(c.name).includes(kName) || kName.includes(normalizeName(c.name))
    );
    if (nameMatched) return nameMatched;
    return candidates[0];
  }

  if (kName && lookup.byName.has(kName)) {
    return lookup.byName.get(kName)[0];
  }
  return null;
}

function mapType(types) {
  if (!types || !types.length) return 'Colorless';
  const t = types[0];
  const valid = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless', 'Fairy'];
  return valid.includes(t) ? t : 'Colorless';
}

function hashFloat(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

const RARITY_RANK = {
  '': 0,
  None: 0,
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  'Rare Holo': 4,
  'Holo Rare': 4,
  'Double Rare': 5,
  'ACE SPEC Rare': 5,
  'Rare Holo V': 5,
  'Holo Rare V': 5,
  'Rare Holo GX': 5,
  'Rare Holo EX': 5,
  'Rare Holo ex': 5,
  'Rare Holo LV.X': 5,
  'Rare Prime': 5,
  'Rare BREAK': 5,
  'Amazing Rare': 5,
  'Holo Rare VSTAR': 5,
  'Shiny Ultra Rare': 6,
  'Illustration Rare': 6,
  'Shiny Rare': 6,
  'Rare Holo VMAX': 6,
  'Holo Rare VMAX': 6,
  LEGEND: 6,
  'Classic Collection': 6,
  'Pikachu Rare': 7,
  'Ultra Rare': 7,
  'Rare Ultra': 7,
  MEGA_ATTACK_RARE: 7,
  'Futuristic Rare': 8,
  'Special Illustration Rare': 8,
  'Rare Rainbow': 8,
  'Hyper Rare': 9,
  'Mega Hyper Rare': 9,
  'Rare Secret': 9,
  'RGB Rare': 10,
};

// Rarity tier codes: 0=D1, 1=D2, 2=D3, 3=D4, 4=S1, 5=S2, 6=S3, 7=CR, 8=Pikachu30th(S1)
function mapRarityAndPrice(rawRarity, tcgMatch, card, isVintage, commonOnly, isClassicHit) {
  const r1 = rawRarity && rawRarity !== 'UNDEFINED' ? rawRarity : '';
  const r2 = tcgMatch?.rarity || '';
  // Prefer whichever rarity is more specific / higher (fixes pokemon-tcg-data tagging me55-R/G/B as Common!)
  const rank1 = RARITY_RANK[r1] ?? 3;
  const rank2 = RARITY_RANK[r2] ?? 0;
  let r = rank2 > rank1 ? r2 : r1 || r2 || 'Common';

  const isHoloRarity = (RARITY_RANK[r] ?? 0) >= 4;
  let price = pickBestPrice(tcgMatch, isVintage, isHoloRarity);
  const rand = hashFloat(card.id);

  // Fallback synthetic pricing only if TCGCSV had $0 / missing market data
  if (!price || price <= 0) {
    if (r === 'Common' || r === 'None') price = +(0.12 + rand * 0.45).toFixed(2);
    else if (r === 'Uncommon') price = +(0.25 + rand * 0.75).toFixed(2);
    else if (r === 'Rare') price = +(0.75 + rand * 2.25).toFixed(2);
    else if (r === 'Pikachu Rare') price = +(0.45 + rand * 2.00).toFixed(2);
    else if (r === 'Rare Holo' || r === 'Holo Rare') price = isVintage || isClassicHit ? +(14.0 + rand * 35.0).toFixed(2) : +(1.5 + rand * 4.5).toFixed(2);
    else if ((RARITY_RANK[r] ?? 0) === 5) price = +(3.5 + rand * 12.0).toFixed(2);
    else if ((RARITY_RANK[r] ?? 0) === 6) price = +(5.5 + rand * 26.0).toFixed(2);
    else if ((RARITY_RANK[r] ?? 0) === 7) price = +(14.0 + rand * 42.0).toFixed(2);
    else if ((RARITY_RANK[r] ?? 0) === 8) price = +(38.0 + rand * 110.0).toFixed(2);
    else price = +(55.0 + rand * 175.0).toFixed(2);
  }

  // Special celebration card: always tag Pikachu Rare as Pikachu 30th (code 8)
  if (r === 'Pikachu Rare') {
    if (commonOnly) return null;
    return { code: 8, price };
  }

  // Determine base code from official rarity
  let code = 0;
  if (r === 'Common' || r === 'None') code = 0;
  else if (r === 'Uncommon') code = 1;
  else if (r === 'Rare') code = 2;
  else if (r === 'Rare Holo' || r === 'Holo Rare') code = isVintage || isClassicHit ? 3 : 2;
  else if ((RARITY_RANK[r] ?? 0) === 5) code = 3;
  else if ((RARITY_RANK[r] ?? 0) === 6) code = 4;
  else if ((RARITY_RANK[r] ?? 0) === 7) code = 5;
  else if ((RARITY_RANK[r] ?? 0) === 8) code = 6;
  else code = 7;

  // PRICE-DRIVEN RARITY PROMOTION ("lấy giá để xem độ hiếm"):
  // Any card whose real TCGplayer price is high gets promoted accordingly!
  if (r === 'RGB Rare' || price >= 250) {
    code = Math.max(code, 7); // Crown
  } else if (price >= 75) {
    code = Math.max(code, 6); // Star3
  } else if (price >= 25) {
    code = Math.max(code, 5); // Star2
  } else if (price >= 8) {
    code = Math.max(code, 4); // Star1
  } else if (price >= 5) {
    code = Math.max(code, 3); // Diamond4 — guarantees NO Diamond1/Diamond2 costs >= $5!
  }

  if (commonOnly && (code > 1 || price >= 5)) {
    return null;
  }

  return { code, price };
}

function convertCardsToTuples(
  rawCards,
  lookup,
  { printedTotalFallback, isVintage = false, commonOnly = false, isClassicHit = false, excludeIds = new Set() }
) {
  const tuples = [];
  for (const c of rawCards) {
    if (!c || !c.id || !c.name) continue;
    const img = c.images?.large || c.images?.small;
    if (!img) continue;
    if (excludeIds.has(c.id)) continue;

    const tcgMatch = findTcgcsvMatch(lookup, c);
    const rInfo = mapRarityAndPrice(c.rarity, tcgMatch, c, isVintage, commonOnly, isClassicHit);
    if (!rInfo) continue;

    const dex = c.nationalPokedexNumbers?.[0] || 0;
    const type = mapType(c.types);
    const hp = parseInt(c.hp, 10) || 0;
    const setNumber = `${c.number || '0'}/${printedTotalFallback}`;
    const artist = c.artist || 'Ken Sugimori';
    const atkName =
      c.attacks?.[0]?.name || (c.supertype === 'Trainer' ? 'Trainer Effect' : c.supertype === 'Energy' ? 'Energy' : 'Tackle');
    const atkDmg = c.attacks?.[0]?.damage || (c.supertype === 'Pokemon' || c.supertype === 'Pokémon' ? '20' : 'Effect');

    tuples.push([c.id, dex, c.name, setNumber, type, hp, rInfo.code, rInfo.price, artist, img, atkName, atkDmg]);
  }
  return tuples;
}

const config = [
  {
    exportName: 'FULL_POOL_PALDEAN_FATES',
    setId: 'paldeanFates',
    setName: 'Scarlet & Violet: Paldean Fates',
    sources: [
      { code: 'sv4pt5', total: 91, isVintage: false, commonOnly: false },
      { code: 'sv1', total: 198, isVintage: false, commonOnly: false },
      { code: 'sv2', total: 193, isVintage: false, commonOnly: false },
      { code: 'sv3', total: 197, isVintage: false, commonOnly: false },
      { code: 'sv4', total: 182, isVintage: false, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_PRISMATIC_EVOLUTIONS',
    setId: 'prismaticEvolutions',
    setName: 'Ascended Heroes',
    sources: [
      { code: 'me2pt5', total: 217, isVintage: false, commonOnly: false },
      { code: 'sv8pt5', total: 131, isVintage: false, commonOnly: false },
      { code: 'me1', total: 188, isVintage: false, commonOnly: false },
      { code: 'me2', total: 130, isVintage: false, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_EVOLVING_SKIES',
    setId: 'evolvingSkies',
    setName: 'Sword & Shield: Evolving Skies',
    sources: [
      { code: 'swsh7', total: 203, isVintage: false, commonOnly: false },
      { code: 'swsh12pt5gg', total: 70, isVintage: false, commonOnly: false },
      { code: 'swsh8', total: 264, isVintage: false, commonOnly: false },
      { code: 'swsh11', total: 196, isVintage: false, commonOnly: false },
      { code: 'swsh1', total: 202, isVintage: false, commonOnly: true },
      { code: 'swsh4', total: 185, isVintage: false, commonOnly: true },
      { code: 'swsh6', total: 198, isVintage: false, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_COSMIC_ECLIPSE',
    setId: 'cosmicEclipse',
    setName: 'Sun & Moon: Cosmic Eclipse',
    sources: [
      { code: 'sm12', total: 236, isVintage: false, commonOnly: false },
      { code: 'sm9', total: 181, isVintage: false, commonOnly: false },
      { code: 'sm10', total: 214, isVintage: false, commonOnly: false },
      { code: 'sm11', total: 236, isVintage: false, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_DESTINED_RIVALS',
    setId: 'deltaReign',
    setName: 'Destined Rivals',
    sources: [
      { code: 'sv10', total: 182, isVintage: false, commonOnly: false },
      { code: 'sv8', total: 191, isVintage: false, commonOnly: false },
      { code: 'sv9', total: 159, isVintage: false, commonOnly: false },
      { code: 'sv7', total: 142, isVintage: false, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_PERFECT_ORDER',
    setId: 'perfectOrder',
    setName: 'Perfect Order',
    sources: [
      { code: 'me3', total: 124, isVintage: false, commonOnly: false },
      { code: 'me4', total: 122, isVintage: false, commonOnly: false },
      { code: 'me5', total: 120, isVintage: false, commonOnly: false },
      { code: 'xy2', total: 106, isVintage: false, commonOnly: false },
      { code: 'xy1', total: 146, isVintage: false, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_POKEMON_RED_VINTAGE',
    setId: 'pokemonRedVintage',
    setName: 'Base Set Vintage (Red Version)',
    sources: [
      {
        code: 'base1',
        total: 102,
        isVintage: true,
        commonOnly: false,
        excludeIds: new Set([
          'base1-1', 'base1-2', 'base1-4', 'base1-6', 'base1-8', 'base1-10',
          'base1-14', 'base1-15', 'base1-16', 'base1-44', 'base1-46', 'base1-58', 'base1-63',
        ]),
      },
      { code: 'base2', total: 64, isVintage: true, commonOnly: false },
      { code: 'base3', total: 62, isVintage: true, commonOnly: false },
      { code: 'base5', total: 82, isVintage: true, commonOnly: false },
      { code: 'gym1', total: 132, isVintage: true, commonOnly: false },
      { code: 'gym2', total: 132, isVintage: true, commonOnly: false },
      { code: 'base4', total: 130, isVintage: true, commonOnly: true },
    ],
  },
  {
    exportName: 'FULL_POOL_POKEMON_30TH_COMMON',
    setId: 'pokemon30thCommon',
    setName: '30th Anniversary (Common Set)',
    sources: [
      { code: 'me55', total: 161, isVintage: false, commonOnly: false },
      { code: 'me55c', total: 30, isVintage: false, commonOnly: false, isClassicHit: true },
      { code: 'cel25', total: 25, isVintage: false, commonOnly: false, isClassicHit: true },
      { code: 'cel25c', total: 25, isVintage: false, commonOnly: false, isClassicHit: true },
      {
        code: 'sv3pt5',
        total: 165,
        isVintage: false,
        commonOnly: false,
        excludeIds: new Set([
          'sv3pt5-6', 'sv3pt5-25', 'sv3pt5-94', 'sv3pt5-173', 'sv3pt5-182',
          'sv3pt5-198', 'sv3pt5-199', 'sv3pt5-200', 'sv3pt5-201', 'sv3pt5-202', 'sv3pt5-205',
        ]),
      },
      { code: 'sv5', total: 162, isVintage: false, commonOnly: true },
      { code: 'sv6', total: 167, isVintage: false, commonOnly: true },
    ],
  },
];

const header = `// Auto-generated compact full official card pools with live TCGplayer pricing & rarity sync
import type { PokemonCard, PokemonType, PocketRarity, CardRarity } from './pokemonShopLogic';

type CompactCardTuple = [
  string, // id
  number, // dexNumber
  string, // name
  string, // setNumber
  PokemonType, // type
  number, // hp
  number, // rarityCode (0..8)
  number, // marketPrice
  string, // artist
  string, // imageUrl
  string, // atkName
  string  // atkDmg
];

const TYPE_STYLE: Record<string, { cardColor: string; accentColor: string; icon: string }> = {
  Fire: { cardColor: '#b91c1c', accentColor: '#f87171', icon: '🔥' },
  Water: { cardColor: '#0369a1', accentColor: '#38bdf8', icon: '💧' },
  Grass: { cardColor: '#15803d', accentColor: '#4ade80', icon: '🌿' },
  Lightning: { cardColor: '#ca8a04', accentColor: '#fde047', icon: '⚡' },
  Psychic: { cardColor: '#7e22ce', accentColor: '#c084fc', icon: '🔮' },
  Fighting: { cardColor: '#c2410c', accentColor: '#fb923c', icon: '🥊' },
  Darkness: { cardColor: '#1e293b', accentColor: '#94a3b8', icon: '🌑' },
  Metal: { cardColor: '#475569', accentColor: '#cbd5e1', icon: '⚙️' },
  Dragon: { cardColor: '#4338ca', accentColor: '#818cf8', icon: '🐉' },
  Fairy: { cardColor: '#be185d', accentColor: '#f472b6', icon: '✨' },
  Colorless: { cardColor: '#52525b', accentColor: '#a1a1aa', icon: '⭐' },
};

const RARITY_META: Array<{
  rarity: CardRarity;
  pocketRarity: PocketRarity;
  symbol: string;
  labelPrefix: string;
  holo: PokemonCard['holographicType'];
}> = [
  { rarity: 'Common', pocketRarity: 'Diamond1', symbol: '♢', labelPrefix: 'Common', holo: 'none' },
  { rarity: 'Uncommon', pocketRarity: 'Diamond2', symbol: '♢♢', labelPrefix: 'Uncommon', holo: 'none' },
  { rarity: 'Rare Holo', pocketRarity: 'Diamond3', symbol: '♢♢♢', labelPrefix: '3 Kim Cương', holo: 'reverse' },
  { rarity: 'Double Rare EX', pocketRarity: 'Diamond4', symbol: '♢♢♢♢', labelPrefix: '4 Kim Cương', holo: 'holo' },
  { rarity: 'Illustration Rare', pocketRarity: 'Star1', symbol: '☆', labelPrefix: '1 Sao', holo: 'holo' },
  { rarity: 'Special Illustration Rare', pocketRarity: 'Star2', symbol: '☆☆', labelPrefix: '2 Sao', holo: 'rainbow' },
  { rarity: 'Special Illustration Rare', pocketRarity: 'Star3', symbol: '☆☆☆', labelPrefix: '3 Sao', holo: 'cosmic' },
  { rarity: 'Hyper Rare Gold', pocketRarity: 'Crown', symbol: '👑', labelPrefix: 'Crown Rare', holo: 'gold' },
  { rarity: 'Illustration Rare', pocketRarity: 'Star1', symbol: '⚡30TH', labelPrefix: 'Pikachu 30th', holo: 'holo' },
];

function hydratePool(tuples: CompactCardTuple[], setId: string, setName: string): PokemonCard[] {
  return tuples.map(([id, dexNumber, name, setNumber, type, hp, rCode, marketPrice, artist, imageUrl, atkName, atkDmg]) => {
    const style = TYPE_STYLE[type] || TYPE_STYLE.Colorless;
    const r = RARITY_META[rCode] || RARITY_META[0];
    const artDex = dexNumber > 0 ? dexNumber : 25;
    const isPika30 = rCode === 8;
    return {
      id,
      dexNumber,
      name: isPika30 ? \`Pikachu 30th (#\${setNumber.split('/')[0]})\` : name,
      subtitle: isPika30
        ? \`30th Anniversary Pikachu Rare ($\${marketPrice.toFixed(2)})\`
        : \`\${setName} · #\${setNumber.split('/')[0]}\`,
      setId,
      type,
      hp,
      rarity: r.rarity,
      pocketRarity: r.pocketRarity,
      raritySymbol: r.symbol,
      rarityLabel: \`\${r.labelPrefix} ($\${marketPrice.toFixed(2)})\`,
      setName,
      setNumber,
      marketPrice,
      artist,
      attacks: [{ name: atkName, damage: atkDmg, cost: [type === 'None' ? 'Colorless' : type] }],
      weakness: 'None',
      retreatCost: 1,
      flavorText: isPika30
        ? 'Thẻ Pikachu kỷ niệm 30 năm Pokémon phiên bản đặc biệt (1 trong 30 mẫu sưu tầm)!'
        : \`\${name} - Thẻ bài chính hãng thuộc bộ \${setName}.\`,
      holographicType: r.holo,
      cardColor: style.cardColor,
      accentColor: style.accentColor,
      icon: style.icon,
      imageUrl,
      artUrl: \`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/\${artDex}.png\`,
      hasRgbAura: rCode >= 6 || marketPrice >= 25,
    };
  });
}

`;

let body = '';
const cardCache = new Map();

for (const entry of config) {
  const combined = [];
  const seen = new Set();
  for (const src of entry.sources) {
    if (!cardCache.has(src.code)) {
      cardCache.set(src.code, fetchSetJson(src.code));
    }
    const raw = cardCache.get(src.code);
    const lookup = fetchTcgcsvLookup(src.code);
    const tuples = convertCardsToTuples(raw, lookup, {
      printedTotalFallback: src.total,
      isVintage: src.isVintage,
      commonOnly: src.commonOnly,
      isClassicHit: src.isClassicHit || false,
      excludeIds: src.excludeIds || new Set(),
    });
    for (const t of tuples) {
      if (!seen.has(t[0])) {
        seen.add(t[0]);
        combined.push(t);
      }
    }
  }
  const counts = {};
  for (const t of combined) {
    const key = ['D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3', 'CR', 'Pika30'][t[6]];
    counts[key] = (counts[key] || 0) + 1;
  }
  console.log(`${entry.exportName}: ${combined.length} cards`, counts);
  body += `const RAW_${entry.exportName}: CompactCardTuple[] = ${JSON.stringify(combined)};\n`;
  body += `export const ${entry.exportName}: PokemonCard[] = hydratePool(RAW_${entry.exportName}, '${entry.setId}', '${entry.setName}');\n\n`;
}

fs.writeFileSync('src/game/pokemonSetsFullPools.ts', header + body);
console.log('Successfully synced live TCGplayer pricing & rarity tiers into src/game/pokemonSetsFullPools.ts');
