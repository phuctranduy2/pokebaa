import fs from 'fs';
import { execSync } from 'child_process';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchPokemonCards(query, pageSize = 40) {
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=${pageSize}`;
  console.log(`Fetching: ${url}`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) execSync('sleep 2');
      const raw = execSync(`curl -s -L --max-time 20 "${url}"`, { encoding: 'utf-8' });
      const json = JSON.parse(raw);
      if (json && json.data) {
        return json.data;
      }
    } catch (err) {
      console.warn(`Attempt ${attempt + 1} failed for ${query}:`, err.message);
    }
  }
  return [];
}

async function run() {
  console.log('--- FETCHING POKEMON TCG CARDS FROM API.POKEMONTCG.IO ---');

  // 1. Base Set Cards (including base1-4 Charizard, Pikachu, starters, etc.)
  await sleep(1000);
  const baseSetCards = fetchPokemonCards('set.id:"base1"', 50);
  console.log(`Fetched ${baseSetCards.length} Base Set cards`);

  // 2. 151 Commons (Huge variety of commons)
  await sleep(1000);
  const sv151Commons = fetchPokemonCards('set.id:"sv3pt5" rarity:"Common"', 50);
  console.log(`Fetched ${sv151Commons.length} 151 Common cards`);

  // 3. 151 Uncommons
  await sleep(1000);
  const sv151Uncommons = fetchPokemonCards('set.id:"sv3pt5" rarity:"Uncommon"', 40);
  console.log(`Fetched ${sv151Uncommons.length} 151 Uncommon cards`);

  // 4. Illustration Rare (Full Art modern)
  await sleep(1000);
  const illustrationRares = fetchPokemonCards('rarity:"Illustration Rare"', 40);
  console.log(`Fetched ${illustrationRares.length} Illustration Rares`);

  // 5. Special Illustration Rare (Special Full Art grails)
  await sleep(1000);
  const specialIllustrationRares = fetchPokemonCards('rarity:"Special Illustration Rare"', 30);
  console.log(`Fetched ${specialIllustrationRares.length} Special Illustration Rares`);

  // 6. Ultra Rare (Ex, V, GX full arts)
  await sleep(1000);
  const ultraRares = fetchPokemonCards('rarity:"Ultra Rare"', 40);
  console.log(`Fetched ${ultraRares.length} Ultra Rares`);

  const allRaw = [
    ...baseSetCards,
    ...sv151Commons,
    ...sv151Uncommons,
    ...illustrationRares,
    ...specialIllustrationRares,
    ...ultraRares,
  ];

  // Remove duplicates by ID
  const map = new Map();
  for (const c of allRaw) {
    if (!map.has(c.id)) {
      map.set(c.id, c);
    }
  }

  const unique = Array.from(map.values());
  console.log(`Total unique cards fetched from pokemontcg.io: ${unique.length}`);

  fs.writeFileSync('scripts/fetched_cards_raw.json', JSON.stringify(unique, null, 2));
}

run();
