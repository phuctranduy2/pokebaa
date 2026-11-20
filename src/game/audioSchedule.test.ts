import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeOfDayMusicPeriod,
  getTrackIdForHour,
  isPlayerInsidePokemonShop,
  soundManager,
} from './audio';
import { computeRonBeoCheerVolume } from './RonBeoPubSystem';
import { isRonBeoOpenAtHour, isPhoDiBoMusicActiveAtHour } from './VenueOperatingHours';
import { isPlayerInPhoDiBoZone } from './EastIntersectionSystem';

test('getTimeOfDayMusicPeriod and getTrackIdForHour map morning->track_3, afternoon->track_2, evening->track_1', () => {
  // Morning: 05:30 -> 11:59 => Track #3
  assert.equal(getTimeOfDayMusicPeriod(5.5), 'morning');
  assert.equal(getTimeOfDayMusicPeriod(7.0), 'morning');
  assert.equal(getTimeOfDayMusicPeriod(11.9), 'morning');
  assert.equal(getTrackIdForHour(7.0), 'track_3');
  assert.equal(getTrackIdForHour(10.5), 'track_3');

  // Afternoon: 12:00 -> 17:59 => Track #2
  assert.equal(getTimeOfDayMusicPeriod(12.0), 'afternoon');
  assert.equal(getTimeOfDayMusicPeriod(14.5), 'afternoon');
  assert.equal(getTimeOfDayMusicPeriod(17.99), 'afternoon');
  assert.equal(getTrackIdForHour(12.0), 'track_2');
  assert.equal(getTrackIdForHour(16.0), 'track_2');

  // Evening & Night: 18:00 -> 05:29 => Track #1
  assert.equal(getTimeOfDayMusicPeriod(18.0), 'evening');
  assert.equal(getTimeOfDayMusicPeriod(20.0), 'evening');
  assert.equal(getTimeOfDayMusicPeriod(23.5), 'evening');
  assert.equal(getTimeOfDayMusicPeriod(0.0), 'evening');
  assert.equal(getTimeOfDayMusicPeriod(5.0), 'evening');
  assert.equal(getTrackIdForHour(18.0), 'track_1');
  assert.equal(getTrackIdForHour(21.0), 'track_1');
  assert.equal(getTrackIdForHour(2.0), 'track_1');
});

test('SoundEngine.syncTimeOfDayMusic selects the matching playlist track when synced', () => {
  soundManager.setTimeScheduleMode(true);

  soundManager.syncTimeOfDayMusic(7.5);
  assert.equal(soundManager.getCurrentTrack(), 'track_3');

  soundManager.syncTimeOfDayMusic(15.0);
  assert.equal(soundManager.getCurrentTrack(), 'track_2');

  soundManager.syncTimeOfDayMusic(19.5);
  assert.equal(soundManager.getCurrentTrack(), 'track_1');
});

test('Quán Nhậu Ron Béo cheer audio plays only inside/adjacent while open (15:00 - 04:00)', () => {
  assert.equal(isRonBeoOpenAtHour(15.0), true);
  assert.equal(isRonBeoOpenAtHour(21.0), true);
  assert.equal(isRonBeoOpenAtHour(3.5), true);
  assert.equal(isRonBeoOpenAtHour(4.0), false);
  assert.equal(isRonBeoOpenAtHour(12.0), false);

  // Inside building / patio while open -> full 1.0 volume
  assert.equal(computeRonBeoCheerVolume(220.0, 2.0, true), 1.0);
  assert.equal(computeRonBeoCheerVolume(209.5, 4.0, true), 1.0);
  // Immediately adjacent sidewalk -> attenuated > 0 and < 1.0
  const nearVol = computeRonBeoCheerVolume(203.0, 2.0, true);
  assert.ok(nearVol > 0.15 && nearVol < 1.0);
  // Far away -> silent (0)
  assert.equal(computeRonBeoCheerVolume(150.0, 2.0, true), 0);
  assert.equal(computeRonBeoCheerVolume(0.0, 0.0, true), 0);
  // Closed -> silent even if standing inside
  assert.equal(computeRonBeoCheerVolume(220.0, 2.0, false), 0);
});

test('Phố Đi Bộ zone detection and external Mixcloud BGM override toggle cleanly', () => {
  // Inside Phố Đi Bộ street & promenades (north of gateway arch Z = 15.5)
  assert.equal(isPlayerInPhoDiBoZone(193.5, 0), true);
  assert.equal(isPlayerInPhoDiBoZone(182.0, -20), true);
  assert.equal(isPlayerInPhoDiBoZone(193.5, 14.0), true);

  // Outside gateway arch on East Intersection main road or in main store
  assert.equal(isPlayerInPhoDiBoZone(193.5, 20.0), false);
  assert.equal(isPlayerInPhoDiBoZone(0, 0), false);
  assert.equal(isPlayerInPhoDiBoZone(160, 0), false);

  // Phố Đi Bộ Mixcloud DJ music runs strictly 15:00 - 05:00 (3 PM to 5 AM)
  assert.equal(isPhoDiBoMusicActiveAtHour(12.0), false);
  assert.equal(isPhoDiBoMusicActiveAtHour(14.99), false);
  assert.equal(isPhoDiBoMusicActiveAtHour(15.0), true);
  assert.equal(isPhoDiBoMusicActiveAtHour(21.0), true);
  assert.equal(isPhoDiBoMusicActiveAtHour(0.0), true);
  assert.equal(isPhoDiBoMusicActiveAtHour(4.99), true);
  assert.equal(isPhoDiBoMusicActiveAtHour(5.0), false);
  assert.equal(isPhoDiBoMusicActiveAtHour(7.0), false);

  // External BGM override preserves track selection while toggling active state
  soundManager.setTimeScheduleMode(true);
  soundManager.syncTimeOfDayMusic(21.0);
  assert.equal(soundManager.isExternalZoneOverride(), false);
  soundManager.setExternalZoneOverride(true);
  assert.equal(soundManager.isExternalZoneOverride(), true);
  assert.equal(soundManager.getCurrentTrack(), 'track_1');
  soundManager.setExternalZoneOverride(false);
  assert.equal(soundManager.isExternalZoneOverride(), false);
  assert.equal(soundManager.getCurrentTrack(), 'track_1');
});

test('SoundEngine music ducking factor scales effective BGM volume to 25% while preserving UI volume slider', () => {
  soundManager.setMusicDuckingFactor(1.0);
  soundManager.setVolume(0.8);
  assert.equal(soundManager.getVolume(), 0.8);
  assert.equal(soundManager.getMusicDuckingFactor(), 1.0);
  const fullEffectiveVol = soundManager.getEffectiveBgmVolume();
  assert.ok(fullEffectiveVol > 0);

  // Mounting motorbike ducks BGM to 25% without altering user's slider setting
  soundManager.setMusicDuckingFactor(0.25);
  assert.equal(soundManager.getVolume(), 0.8);
  assert.equal(soundManager.getMusicDuckingFactor(), 0.25);
  assert.ok(Math.abs(soundManager.getEffectiveBgmVolume() - fullEffectiveVol * 0.25) < 1e-6);

  // Dismounting restores 100%
  soundManager.setMusicDuckingFactor(1.0);
  assert.ok(Math.abs(soundManager.getEffectiveBgmVolume() - fullEffectiveVol) < 1e-6);
});

test('isPlayerInsidePokemonShop detects shop interior vs exterior and gates shop audio cleanly', () => {
  // Floor 1, Floor 2, Manager Office, and Live Studio are inside the Pokémon shop
  assert.equal(isPlayerInsidePokemonShop(0, 0, 10), true);
  assert.equal(isPlayerInsidePokemonShop(8.4, 5.2, 6.0), true);
  assert.equal(isPlayerInsidePokemonShop(-10.5, 0, -14.0), true);
  assert.equal(isPlayerInsidePokemonShop(10.0, 0, -14.0), true);

  // Outside front glass doors onto sidewalk/street, neighboring Grading Lab, or Phố Đi Bộ -> outside
  assert.equal(isPlayerInsidePokemonShop(0, 0, 16.0), false);
  assert.equal(isPlayerInsidePokemonShop(0, 0, 22.0), false);
  assert.equal(isPlayerInsidePokemonShop(20.0, 0, 5.0), false);
  assert.equal(isPlayerInsidePokemonShop(193.5, 0, 0), false);

  soundManager.setMuted(false);
  soundManager.setExternalZoneOverride(false);
  soundManager.setVolume(0.8);
  soundManager.setPlayerInsideShop(true);
  assert.equal(soundManager.isPlayerInsideShop(), true);
  assert.equal(soundManager.isShopWorldAudioAllowed(), true);
  assert.ok(soundManager.getEffectiveBgmVolume() > 0);

  // Stepping outside mutes shop BGM & world audio while preserving volume setting and track selection
  soundManager.setPlayerInsideShop(false);
  assert.equal(soundManager.isPlayerInsideShop(), false);
  assert.equal(soundManager.isShopWorldAudioAllowed(), false);
  assert.equal(soundManager.getEffectiveBgmVolume(), 0);
  assert.equal(soundManager.getVolume(), 0.8);

  // Stepping back inside restores shop BGM & world audio
  soundManager.setPlayerInsideShop(true);
  assert.equal(soundManager.isShopWorldAudioAllowed(), true);
  assert.ok(soundManager.getEffectiveBgmVolume() > 0);
});

