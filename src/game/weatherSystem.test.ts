import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceWeatherScheduleMinute,
  createInitialWeatherSchedule,
  getRainSplashGroundY,
  isPointInsideRoofedBuilding,
  resolveWeatherModeFromUrl,
  rollNewDayWeatherSchedule,
  shouldNpcCarryRainUmbrella,
} from './WeatherSystem';

test('isPointInsideRoofedBuilding blocks rain inside roofed shops while keeping streets and open football pitches wet', () => {
  // Inside main Pokémon Card Shop
  assert.equal(isPointInsideRoofedBuilding(0, 4), true);
  // Outside Card Shop glass doors on sidewalk (Z = 18.2) and Main Boulevard (Z = 29)
  assert.equal(isPointInsideRoofedBuilding(0, 18.2), false);
  assert.equal(isPointInsideRoofedBuilding(0, 29.0), false);
  // Open-air Ron Football turf pitches vs roofed Pro-Shop
  assert.equal(isPointInsideRoofedBuilding(-185, 62), false);
  assert.equal(isPointInsideRoofedBuilding(-155, 60), true);
});

test('getRainSplashGroundY resolves accurate street, sidewalk, interior, and river elevations', () => {
  assert.equal(getRainSplashGroundY(0, 4), null); // Inside Card Shop
  assert.equal(getRainSplashGroundY(0, -200), null); // Han River water
  assert.equal(getRainSplashGroundY(0, 18.5), 0.022); // Sidewalk
  assert.equal(getRainSplashGroundY(0, 29.0), -0.242); // Main Boulevard Asphalt
});

test('advanceWeatherScheduleMinute triggers full-daytime or full-nighttime heavy rain and clears when period expires', () => {
  // Daytime random rain at 12:00 runs continuously until 18:00 (360 mins) with heavy intensity
  let dayState = createInitialWeatherSchedule(() => 0);
  dayState = { ...dayState, minutesUntilRoll: 1 };
  const dayRes = advanceWeatherScheduleMinute(dayState, 12, () => 0.1);
  assert.equal(dayRes.changed, true);
  assert.equal(dayRes.nextState.weatherMode, 'rain');
  assert.equal(dayRes.nextState.minutesUntilRoll, 360);
  assert.ok(dayRes.nextState.rainIntensityLevel >= 1.0);

  // Daytime rain transitions back to clear when its scheduled window completes
  const clearRes = advanceWeatherScheduleMinute(
    { ...dayRes.nextState, minutesUntilRoll: 1 },
    18,
    () => 0.5
  );
  assert.equal(clearRes.changed, true);
  assert.equal(clearRes.nextState.weatherMode, 'clear');

  // Nighttime random rain at 19:00 runs all night until 06:00 (660 mins) with heavy intensity
  let nightState = createInitialWeatherSchedule(() => 0);
  nightState = { ...nightState, minutesUntilRoll: 1 };
  const nightRes = advanceWeatherScheduleMinute(nightState, 19, () => 0.1);
  assert.equal(nightRes.changed, true);
  assert.equal(nightRes.nextState.weatherMode, 'rain');
  assert.equal(nightRes.nextState.minutesUntilRoll, 660);
  assert.ok(nightRes.nextState.rainIntensityLevel >= 1.0);
});

test('rollNewDayWeatherSchedule rolls full-daytime heavy morning rain or clear morning on new day', () => {
  const prev = createInitialWeatherSchedule(() => 0.5);
  const rainyMorning = rollNewDayWeatherSchedule(prev, () => 0.1);
  assert.equal(rainyMorning.weatherMode, 'rain');
  assert.equal(rainyMorning.minutesUntilRoll, 660);
  assert.ok(rainyMorning.rainIntensityLevel >= 1.0);

  const clearMorning = rollNewDayWeatherSchedule(prev, () => 0.9);
  assert.equal(clearMorning.weatherMode, 'clear');
});

test('resolveWeatherModeFromUrl parses ?weather=rain and ?weather=clear', () => {
  assert.deepEqual(resolveWeatherModeFromUrl('?autostart=1&hour=12&weather=rain'), {
    forcedWeather: 'rain',
  });
  assert.deepEqual(resolveWeatherModeFromUrl('?weather=clear'), {
    forcedWeather: 'clear',
  });
  assert.deepEqual(resolveWeatherModeFromUrl('?hour=21'), {
    forcedWeather: null,
  });
});

test('shouldNpcCarryRainUmbrella equips umbrellas on all outdoor walking NPCs including bridges, courtyards, and open plazas', () => {
  // Walking outdoors on sidewalk or park during rain -> must carry umbrella
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', 0, 18.5), true);
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'WalkBasket', 35, 39.5), true);

  // Open-air Love Bridge, Night Hub Dining Plaza, School Courtyard, Hospital Forecourt, Khoi Patio -> carry umbrella
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -197, -110), true); // Love Bridge
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -280, -2), true); // Hospital Night Hub Plaza
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -333, 85), true); // Phan Chau Trinh Courtyard
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -270, 48), true); // Hospital forecourt
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', 209, -25), true); // Khoi Garden patio

  // Roofed sub-buildings inside mixed plots -> folds away umbrella
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', 0, 4), false); // Card Shop interior
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -320, -4), false); // Night Hub clinic roof
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -333, 60), false); // Phan Chau Trinh classroom wing
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Walk', -270, 72), false); // Main Hospital building

  // Stationary / seated / checkout NPCs outdoors -> no umbrella
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Idle', 0, 18.5), false);
  assert.equal(shouldNpcCarryRainUmbrella(true, true, 'Sit', 35, 50), false);

  // Clear weather -> no umbrella
  assert.equal(shouldNpcCarryRainUmbrella(false, true, 'Walk', 0, 18.5), false);

  // Match athlete opt-out -> no umbrella
  assert.equal(shouldNpcCarryRainUmbrella(true, false, 'Walk', -185, 62), false);
});
