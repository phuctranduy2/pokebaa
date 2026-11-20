import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('scripts/fetched_cards_raw.json', 'utf-8'));

function mapType(types) {
  if (!types || !types.length) return 'Colorless';
  const t = types[0];
  const valid = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless'];
  return valid.includes(t) ? t : 'Colorless';
}

function mapRarity(rarity) {
  if (rarity === 'Illustration Rare') {
    return {
      rarity: 'Illustration Rare',
      pocketRarity: 'Star1',
      raritySymbol: '☆',
      rarityLabel: 'Illustration Rare (IR)',
      holo: 'holo',
    };
  }
  if (rarity === 'Special Illustration Rare') {
    return {
      rarity: 'Special Illustration Rare',
      pocketRarity: 'Star2',
      raritySymbol: '☆☆',
      rarityLabel: 'Special Illustration Rare (SIR)',
      holo: 'rainbow',
    };
  }
  if (rarity === 'Ultra Rare' || rarity === 'Double Rare') {
    return {
      rarity: 'Double Rare EX',
      pocketRarity: 'Diamond4',
      raritySymbol: '♢♢♢♢',
      rarityLabel: 'Pokemon ex (Double Rare)',
      holo: 'holo',
    };
  }
  if (rarity === 'Rare Holo' || rarity === 'Rare') {
    return {
      rarity: 'Rare Holo',
      pocketRarity: 'Diamond3',
      raritySymbol: '♢♢♢',
      rarityLabel: 'Rare Holo',
      holo: 'holo',
    };
  }
  if (rarity === 'Uncommon') {
    return {
      rarity: 'Uncommon',
      pocketRarity: 'Diamond2',
      raritySymbol: '♢♢',
      rarityLabel: 'Uncommon (2 Kim Cương)',
      holo: 'none',
    };
  }
  return {
    rarity: 'Common',
    pocketRarity: 'Diamond1',
    raritySymbol: '♢',
    rarityLabel: 'Common (1 Kim Cương)',
    holo: 'none',
  };
}

function getTypeColor(type) {
  const colors = {
    Fire: { card: '#b91c1c', accent: '#f87171', icon: '🔥' },
    Water: { card: '#1d4ed8', accent: '#60a5fa', icon: '💧' },
    Grass: { card: '#15803d', accent: '#4ade80', icon: '🌿' },
    Lightning: { card: '#ca8a04', accent: '#fde047', icon: '⚡' },
    Psychic: { card: '#7e22ce', accent: '#c084fc', icon: '🔮' },
    Fighting: { card: '#c2410c', accent: '#fb923c', icon: '🥊' },
    Darkness: { card: '#334155', accent: '#94a3b8', icon: '🌑' },
    Metal: { card: '#475569', accent: '#cbd5e1', icon: '⚙️' },
    Dragon: { card: '#4338ca', accent: '#818cf8', icon: '🐉' },
    Colorless: { card: '#52525b', accent: '#a1a1aa', icon: '⭐' },
  };
  return colors[type] || colors.Colorless;
}

const cards = raw.map((c) => {
  const type = mapType(c.types);
  const typeInfo = getTypeColor(type);
  const rarityInfo = mapRarity(c.rarity);

  let price = 0.5;
  if (c.tcgplayer?.prices?.holofoil?.market) {
    price = c.tcgplayer.prices.holofoil.market;
  } else if (c.tcgplayer?.prices?.normal?.market) {
    price = c.tcgplayer.prices.normal.market;
  } else if (c.tcgplayer?.prices?.reverseHolofoil?.market) {
    price = c.tcgplayer.prices.reverseHolofoil.market;
  } else if (c.cardmarket?.prices?.averageSellPrice) {
    price = c.cardmarket.prices.averageSellPrice;
  } else {
    price = rarityInfo.pocketRarity === 'Diamond1' ? 0.35 : rarityInfo.pocketRarity === 'Diamond2' ? 0.85 : 3.5;
  }
  price = Math.max(0.1, Math.round(price * 100) / 100);

  const dexNum = c.nationalPokedexNumbers?.[0] || 25;
  const attacks = (c.attacks || []).slice(0, 2).map((a) => ({
    name: a.name || 'Strike',
    damage: a.damage || '20',
    cost: (a.cost || []).map(mapType),
  }));

  if (attacks.length === 0) {
    attacks.push({ name: 'Quick Attack', damage: '20', cost: ['Colorless'] });
  }

  const weakness = c.weaknesses?.[0]?.type ? mapType([c.weaknesses[0].type]) : 'Colorless';
  const retreat = c.convertedRetreatCost || (c.retreatCost?.length || 1);

  return {
    id: c.id,
    dexNumber: dexNum,
    name: c.name,
    subtitle: `${c.set?.name || 'Pokemon TCG'} · #${c.number}`,
    type,
    hp: parseInt(c.hp) || 60,
    rarity: rarityInfo.rarity,
    pocketRarity: rarityInfo.pocketRarity,
    raritySymbol: rarityInfo.raritySymbol,
    rarityLabel: rarityInfo.rarityLabel,
    setName: c.set?.name || 'Pokemon TCG',
    setNumber: `${c.number}/${c.set?.printedTotal || 102}`,
    marketPrice: price,
    artist: c.artist || 'Ken Sugimori',
    attacks,
    weakness,
    retreatCost: retreat,
    flavorText: c.flavorText || 'Thẻ bài Pokémon TCG chính hãng bản quyền.',
    holographicType: rarityInfo.holo,
    cardColor: typeInfo.card,
    accentColor: typeInfo.accent,
    icon: typeInfo.icon,
    imageUrl: c.images?.large || c.images?.small,
    artUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNum}.png`,
    hasRgbAura: price >= 50,
  };
});

console.log(`Generated ${cards.length} cards!`);

const output = `import { PokemonCard } from './pokemonShopLogic';

export const EXPANDED_POKEMON_CARDS: PokemonCard[] = ${JSON.stringify(cards, null, 2)};
`;

fs.writeFileSync('src/game/pokemonCardsExpanded.ts', output);
console.log('Successfully written src/game/pokemonCardsExpanded.ts');
