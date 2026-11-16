import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_WORM_COUNT,
  ARENA_RADIUS,
  BASE_SPEED,
  BOOST_SPEED,
  GameEngine,
  INITIAL_PLAYER_MASS,
  MIN_BOOST_MASS,
  TARGET_FOOD_COUNT,
} from './engine';
import type { InputState } from './types';

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    pointerActive: false,
    pointerAngle: 0,
    joystickActive: false,
    joystickAngle: 0,
    joystickMagnitude: 0,
    keysHeld: new Set<string>(),
    boostHeld: false,
    ...overrides,
  };
}

test('startGame initializes player, 10 AI worms, and arena food safely', () => {
  const engine = new GameEngine();
  engine.setPlayerSkin('mint-cobra');
  engine.startGame();

  assert.equal(engine.phase, 'playing');
  const player = engine.getPlayer();
  assert.ok(player, 'Player worm should exist');
  assert.equal(player.alive, true);
  assert.equal(player.skin.id, 'mint-cobra');
  assert.equal(player.mass, INITIAL_PLAYER_MASS);

  const aiWorms = engine.worms.filter((w) => !w.isPlayer && w.alive);
  assert.equal(aiWorms.length, AI_WORM_COUNT);
  assert.equal(engine.foods.length, TARGET_FOOD_COUNT);

  // Verify player spawns well inside arena and away from AI worms
  assert.ok(Math.hypot(player.x, player.y) < 100);
  for (const ai of aiWorms) {
    assert.ok(Math.hypot(ai.x - player.x, ai.y - player.y) >= 240);
  }
});

test('eating food increases mass, score, and worm segment length', () => {
  const engine = new GameEngine();
  engine.startGame();
  const player = engine.getPlayer()!;
  const initialMass = player.mass;
  const initialScore = player.score;
  const initialSegs = player.segments.length;

  // Drop rich food directly in front of the player
  for (let i = 0; i < 4; i++) {
    engine.foods.push({
      id: 99000 + i,
      x: player.x + Math.cos(player.angle) * (10 + i * 6),
      y: player.y + Math.sin(player.angle) * (10 + i * 6),
      vx: 0,
      vy: 0,
      value: 25,
      radius: 12,
      color: '#FF5A5F',
      glowColor: 'rgba(255,90,95,0.4)',
      kind: 'loot',
      phase: 0,
      fromDeath: true,
      attractedBy: null,
    });
  }

  const input = makeInput();
  for (let f = 0; f < 10; f++) {
    engine.update(0.016, input);
  }

  assert.ok(player.mass > initialMass, 'Mass should increase after eating');
  assert.ok(player.score > initialScore, 'Score should increase after eating');
  assert.ok(player.segments.length > initialSegs, 'Segments should grow after eating');
});

test('speed boost increases speed and drains mass down to MIN_BOOST_MASS', () => {
  const engine = new GameEngine();
  engine.startGame();
  const player = engine.getPlayer()!;
  player.spawnProtection = 0;

  const normalInput = makeInput();
  engine.update(0.016, normalInput);
  assert.equal(player.speed, BASE_SPEED);
  assert.equal(player.boosting, false);

  const boostInput = makeInput({ boostHeld: true });
  const massBefore = player.mass;
  for (let i = 0; i < 20; i++) {
    engine.foods.length = 0;
    engine.update(0.02, boostInput);
  }
  assert.equal(player.boosting, true);
  assert.ok(player.speed > BASE_SPEED + 120, 'Boosting should smoothly accelerate toward BOOST_SPEED');
  assert.ok(player.speed <= BOOST_SPEED + 0.01);
  assert.ok(player.mass < massBefore, 'Boosting should consume mass');

  // Drain down to floor (clear ambient food each tick so replenished orbs don't restore mass mid-test)
  player.mass = MIN_BOOST_MASS;
  for (let i = 0; i < 30; i++) {
    engine.foods.length = 0;
    engine.update(0.02, boostInput);
  }
  assert.equal(player.boosting, false, 'Cannot boost at or below MIN_BOOST_MASS');
  assert.ok(player.speed < BASE_SPEED + 5, 'Speed should decelerate back to BASE_SPEED');
});

test('arena boundary collision kills player and transitions to gameover', () => {
  let reportedPhase = '';
  const engine = new GameEngine({
    onPhaseChange: (phase) => {
      reportedPhase = phase;
    },
  });
  engine.startGame();
  const player = engine.getPlayer()!;
  player.spawnProtection = 0;
  player.x = ARENA_RADIUS - 5;
  player.y = 0;
  player.angle = 0;
  player.targetAngle = 0;

  const input = makeInput();
  engine.update(0.016, input);
  assert.equal(player.alive, false, 'Player should die upon hitting arena wall');

  // Advance past the 0.55s dramatic death beat
  for (let i = 0; i < 20; i++) {
    engine.update(0.04, input);
  }
  assert.equal(engine.phase, 'gameover');
  assert.equal(reportedPhase, 'gameover');
});

test('head-to-enemy-body collision kills attacker and spawns loot orbs', () => {
  const engine = new GameEngine();
  engine.startGame();
  const player = engine.getPlayer()!;
  const enemy = engine.worms.find((w) => !w.isPlayer)!;
  player.spawnProtection = 0;
  enemy.spawnProtection = 0;

  // Position player's head right onto enemy's mid-body segment, keeping body behind player
  const targetSeg = enemy.segments[Math.min(8, enemy.segments.length - 1)];
  const perpAngle = enemy.angle + Math.PI * 0.5;
  const dx = targetSeg.x - player.x;
  const dy = targetSeg.y - player.y;
  player.x = targetSeg.x;
  player.y = targetSeg.y;
  player.angle = perpAngle;
  player.targetAngle = perpAngle;
  for (let i = 0; i < player.segments.length; i++) {
    player.segments[i].x = targetSeg.x - Math.cos(perpAngle) * i * 10;
    player.segments[i].y = targetSeg.y - Math.sin(perpAngle) * i * 10;
  }
  player.pathHistory = player.segments.map((s) => ({ x: s.x, y: s.y }));
  void dx;
  void dy;

  const foodsBefore = engine.foods.length;
  engine.update(0.016, makeInput());

  assert.equal(player.alive, false, 'Player colliding with enemy body should die');
  assert.equal(enemy.alive, true, 'Enemy whose body was hit should survive');
  assert.equal(enemy.kills, 1, 'Enemy should be credited with 1 kill');
  assert.ok(engine.foods.length > foodsBefore, 'Dead worm should drop loot food orbs');
});

test('maintains 10 AI worms via respawning when an AI worm dies', () => {
  const engine = new GameEngine();
  engine.startGame();
  const enemy = engine.worms.find((w) => !w.isPlayer)!;
  enemy.spawnProtection = 0;
  enemy.x = ARENA_RADIUS - 2;
  enemy.y = 0;

  const input = makeInput();
  engine.update(0.016, input);
  assert.equal(enemy.alive, false);

  // Advance 1.4 seconds for respawn timer
  for (let i = 0; i < 35; i++) {
    engine.update(0.04, input);
  }

  const aliveAi = engine.worms.filter((w) => !w.isPlayer && w.alive);
  assert.equal(aliveAi.length, AI_WORM_COUNT);
});

test('HUD snapshot sorts leaderboard and computes rank accurately', () => {
  const engine = new GameEngine();
  engine.startGame();
  const player = engine.getPlayer()!;
  player.score = 9999;

  const hud = engine.getHudSnapshot();
  assert.equal(hud.rank, 1);
  assert.equal(hud.leaderboard[0].isPlayer, true);
  assert.equal(hud.leaderboard[0].score, 9999);
  assert.equal(hud.totalWorms, AI_WORM_COUNT + 1);
});

test('60fps turning records breadcrumb curve and keeps tail segments curved rather than straight', () => {
  const engine = new GameEngine();
  engine.startGame();
  const player = engine.getPlayer()!;
  player.angle = 0;
  player.targetAngle = 0;
  for (let i = 0; i < player.segments.length; i++) {
    player.segments[i].x = -i * 10;
    player.segments[i].y = 0;
  }
  player.pathHistory = player.segments.map((s) => ({ x: s.x, y: s.y }));

  // Move straight for 10 frames at 60fps (3.44px/frame < 4px), then turn 90 degrees down
  const straight = makeInput({ pointerActive: true, pointerAngle: 0 });
  for (let i = 0; i < 10; i++) {
    engine.update(1 / 60, straight);
  }

  const turnDown = makeInput({ pointerActive: true, pointerAngle: Math.PI / 2 });
  for (let i = 0; i < 24; i++) {
    engine.update(1 / 60, turnDown);
  }

  const head = player.segments[0];
  const tail = player.segments[player.segments.length - 1];
  // Head has moved significantly downward (+Y), while tail still trails behind horizontally (smaller Y)
  assert.ok(head.y > 40, `Expected head.y > 40 after turning down, got ${head.y}`);
  assert.ok(head.y - tail.y > 25, 'Worm body should form a smooth curve instead of a rigid straight line');
  assert.ok(player.pathHistory.length >= 15, '60fps movement must record dense breadcrumb history');
});

test('onDeath callback triggers multi-layer particle explosion animation when worm is defeated', () => {
  let deathCallbackCount = 0;
  let capturedIsPlayer = false;
  let engine!: GameEngine;

  engine = new GameEngine({
    onDeath: (isPlayer, deathEvent) => {
      deathCallbackCount++;
      capturedIsPlayer = isPlayer;
      engine.triggerExplosion(deathEvent);
    },
  });

  engine.startGame();
  const player = engine.getPlayer()!;
  player.spawnProtection = 0;
  player.x = ARENA_RADIUS - 4;
  player.y = 0;
  player.angle = 0;
  player.targetAngle = 0;

  engine.update(0.016, makeInput());

  assert.equal(deathCallbackCount, 1, 'onDeath callback should fire once when player dies');
  assert.equal(capturedIsPlayer, true);

  const activeParticles = engine.particles.filter((p) => p.active);
  assert.ok(activeParticles.length >= 60, `Expected >= 60 explosion particles, got ${activeParticles.length}`);

  const kinds = new Set(activeParticles.map((p) => p.kind));
  assert.ok(kinds.has('ring'), 'Explosion must include expanding shockwave rings');
  assert.ok(kinds.has('spark'), 'Explosion must include high-velocity directional sparks');
  assert.ok(kinds.has('orb'), 'Explosion must include glowing burst orbs');
  assert.ok(kinds.has('confetti'), 'Explosion must include spinning body confetti shards');

  const ring = activeParticles.find((p) => p.kind === 'ring')!;
  const initialRingRadius = ring.radius;
  engine.update(0.05, makeInput());
  assert.ok(ring.radius > initialRingRadius, 'Shockwave ring radius must expand over time');

  // Advance past particle lifetimes so pooled particles deactivate cleanly
  for (let i = 0; i < 30; i++) {
    engine.update(0.05, makeInput());
  }
  const remaining = engine.particles.filter((p) => p.active).length;
  assert.equal(remaining, 0, 'All explosion particles should deactivate cleanly back into the pool');
});

test('landscape-only viewport forces 90-degree horizontal geometry and transforms touch coordinates cleanly', async () => {
  const { getLandscapeViewport, toLogicalDelta, toLogicalPoint } = await import('./orientation');

  assert.ok(ARENA_RADIUS >= 2800, `Expected widened arena radius >= 2800, got ${ARENA_RADIUS}`);

  // Vertical physical Android screen (390x844) must force 90-deg landscape dimensions (844x390)
  const forced = getLandscapeViewport(390, 844);
  assert.equal(forced.forceRotated, true);
  assert.equal(forced.logicalW, 844);
  assert.equal(forced.logicalH, 390);
  assert.equal(forced.isCompact, true);

  // Native horizontal Android screen (844x390) preserves 844x390 unrotated
  const native = getLandscapeViewport(844, 390);
  assert.equal(native.forceRotated, false);
  assert.equal(native.logicalW, 844);
  assert.equal(native.logicalH, 390);
  assert.equal(native.isCompact, true);

  // Swiping physically downward (+dy) on a +90deg rotated stage steers logically right (+dx)
  const rotatedDelta = toLogicalDelta(0, 40, true);
  assert.equal(rotatedDelta.dx, 40);
  assert.equal(rotatedDelta.dy, 0);

  // Physical top-right corner on 390x844 (x=390, y=0) corresponds to logical top-left (x=0, y=0)
  const rotatedPoint = toLogicalPoint(390, 0, 390, 844, true);
  assert.equal(rotatedPoint.x, 0);
  assert.equal(rotatedPoint.y, 0);
});

test('Workshop catalog contains 30 skins across 4 rarities, 6 upgrades, 13 arena decors, 22 foods, and 6 special decors', async () => {
  const {
    WORM_SKINS,
    POWER_UPS,
    ARENA_DECORS,
    DAILY_REWARDS,
    SPECIAL_OFFERS,
    FOOD_CATALOG,
    SPECIAL_DECORS,
    COLLECTION_GOALS,
  } = await import('./workshopData');

  assert.equal(WORM_SKINS.length, 30);
  assert.equal(WORM_SKINS.filter((s) => s.rarity === 'basic').length, 8);
  assert.equal(WORM_SKINS.filter((s) => s.rarity === 'rare').length, 8);
  assert.equal(WORM_SKINS.filter((s) => s.rarity === 'epic').length, 8);
  assert.equal(WORM_SKINS.filter((s) => s.rarity === 'legendary').length, 6);
  assert.equal(new Set(WORM_SKINS.map((s) => s.id)).size, 30);

  assert.equal(POWER_UPS.length, 6);
  assert.deepEqual(
    POWER_UPS.map((p) => p.id),
    ['magnet', 'multiplier', 'radar', 'speed', 'mobility', 'zoom']
  );

  assert.equal(ARENA_DECORS.length, 13);
  assert.equal(new Set(ARENA_DECORS.map((d) => d.id)).size, 13);
  assert.equal(FOOD_CATALOG.length, 22);
  assert.equal(new Set(FOOD_CATALOG.map((f) => f.id)).size, 22);
  assert.equal(SPECIAL_DECORS.length, 6);
  assert.equal(COLLECTION_GOALS.length, 4);
  assert.equal(DAILY_REWARDS.length, 7);
  assert.equal(SPECIAL_OFFERS.length, 3);
});

test('workshopLogic enforces coin balances, prevents duplicate purchases, and persists progress', async () => {
  const logic = await import('./workshopLogic');
  let profile = logic.createDefaultProfile('test-worm');
  assert.equal(profile.coins, 500);
  assert.equal(profile.ownedSkins.length, 2);

  // Equip unowned skin should fail
  const badEquip = logic.equipSkin(profile, 'berry-candy');
  assert.equal(badEquip.ok, false);

  // Buy Berry Swirl (120 coins)
  const boughtSkin = logic.buySkin(profile, 'berry-candy');
  assert.equal(boughtSkin.ok, true);
  profile = boughtSkin.profile;
  assert.equal(profile.coins, 380);
  assert.equal(profile.equippedSkinId, 'berry-candy');
  assert.ok(profile.ownedSkins.includes('berry-candy'));

  // Duplicate skin purchase blocked without deducting coins
  const dupSkin = logic.buySkin(profile, 'berry-candy');
  assert.equal(dupSkin.ok, false);
  assert.equal(dupSkin.profile.coins, 380);

  // Claim Daily Reward Day 1 (+150 -> 530) and block same-day repeat
  const day1Ms = Date.UTC(2026, 10, 15, 12, 0, 0);
  const daily1 = logic.claimDailyReward(profile, day1Ms);
  assert.equal(daily1.ok, true);
  assert.equal(daily1.coinsAwarded, 150);
  profile = daily1.profile;
  assert.equal(profile.coins, 530);
  assert.equal(logic.claimDailyReward(profile, day1Ms).ok, false);

  // Claim Free Coins (+120 -> 650) and enforce cooldown
  const free1 = logic.claimFreeCoins(profile, day1Ms);
  assert.equal(free1.ok, true);
  profile = free1.profile;
  assert.equal(profile.coins, 650);
  assert.equal(logic.claimFreeCoins(profile, day1Ms + 10_000).ok, false);
  assert.equal(logic.claimFreeCoins(profile, day1Ms + 185_000).ok, true);

  // Rewarded Video Ad adds 250 coins (-> 900)
  const adRes = logic.claimAdReward(profile);
  assert.equal(adRes.ok, true);
  profile = adRes.profile;
  assert.equal(profile.coins, 900);
  assert.equal(profile.adsWatchedCount, 1);

  // Buy Upgrade Magnet Lv.1 (-200 -> 700)
  const upg1 = logic.buyUpgrade(profile, 'magnet');
  assert.equal(upg1.ok, true);
  profile = upg1.profile;
  assert.equal(profile.upgrades.magnet, 1);
  assert.equal(profile.coins, 700);

  // Buy Arena Decor Coral Reef (-250 -> 450) & prevent duplicate buy
  const dec1 = logic.buyDecor(profile, 'ocean-reef');
  assert.equal(dec1.ok, true);
  profile = dec1.profile;
  assert.equal(profile.equippedDecorId, 'ocean-reef');
  assert.equal(profile.coins, 450);
  assert.equal(logic.buyDecor(profile, 'ocean-reef').ok, false);

  // Buy Special Offer Starter Pack (-300 -> 150) & prevent duplicate buy
  const offer1 = logic.buySpecialOffer(profile, 'starter-pack');
  assert.equal(offer1.ok, true);
  profile = offer1.profile;
  assert.equal(profile.coins, 150);
  assert.ok(profile.ownedSkins.includes('lava-ember'));
  assert.ok(profile.ownedDecors.includes('candy-kingdom'));
  assert.equal(profile.upgrades.magnet, 2);
  assert.equal(logic.buySpecialOffer(profile, 'starter-pack').ok, false);

  // Match completion adds earned coins without resetting existing balance
  const afterMatch = logic.recordMatchResult(profile, { score: 400, kills: 2, survivalSeconds: 45 });
  assert.equal(afterMatch.ok, true);
  assert.ok(afterMatch.coinsAwarded! >= 100);
  assert.equal(afterMatch.profile.coins, 150 + afterMatch.coinsAwarded!);
});

test('GameEngine applies purchased power-up upgrades (Multiplier, Speed, Zoom) during gameplay', () => {
  const baseEngine = new GameEngine();
  baseEngine.startGame();
  const basePlayer = baseEngine.getPlayer()!;
  baseEngine.update(0.016, makeInput());
  const baseScoreBefore = basePlayer.score;

  // Drop identical food orb directly at head
  baseEngine.foods.push({
    id: 88001,
    x: basePlayer.x,
    y: basePlayer.y,
    vx: 0,
    vy: 0,
    value: 20,
    radius: 10,
    color: '#FACC15',
    glowColor: 'rgba(250,204,21,0.5)',
    kind: 'berry',
    phase: 0,
    fromDeath: false,
    attractedBy: null,
  });
  baseEngine.update(0.016, makeInput());
  const baseGain = basePlayer.score - baseScoreBefore;

  // Upgraded engine with Multiplier Lv.3 (2.0x), Speed Lv.3 (+21%), Zoom Lv.3 (+22%)
  const upgradedEngine = new GameEngine();
  upgradedEngine.setDecorId('ocean-reef');
  upgradedEngine.setUpgrades({
    magnet: 3,
    multiplier: 3,
    radar: 2,
    speed: 3,
    mobility: 3,
    zoom: 3,
  });
  upgradedEngine.startGame();

  const upPlayer = upgradedEngine.getPlayer()!;
  assert.equal(upgradedEngine.activePowerUps.multiplier.level, 3);
  assert.ok(upgradedEngine.activePowerUps.multiplier.remaining > 20);

  for (let i = 0; i < 15; i++) {
    upgradedEngine.update(0.03, makeInput());
  }
  assert.ok(upPlayer.speed > BASE_SPEED * 1.15, `Expected upgraded speed > 247, got ${upPlayer.speed}`);

  const upScoreBefore = upPlayer.score;
  upgradedEngine.foods.push({
    id: 88002,
    x: upPlayer.x,
    y: upPlayer.y,
    vx: 0,
    vy: 0,
    value: 20,
    radius: 10,
    color: '#FACC15',
    glowColor: 'rgba(250,204,21,0.5)',
    kind: 'berry',
    phase: 0,
    fromDeath: false,
    attractedBy: null,
  });
  upgradedEngine.update(0.016, makeInput());
  const upGain = upPlayer.score - upScoreBefore;
  assert.ok(upGain >= baseGain * 1.8, `Expected multiplied score gain >= ${baseGain * 1.8}, got ${upGain}`);

  const hud = upgradedEngine.getHudSnapshot();
  assert.equal(hud.scoreMultiplier, 2.0);
  assert.equal(hud.activePowerUps.length, 6);
});

test('multi-food selection, special decors, collections, and arena spawning work end to end', async () => {
  const logic = await import('./workshopLogic');
  let profile = logic.createDefaultProfile('food-tester');
  profile = { ...profile, coins: 2000 };

  // Buy Mushrooms (120) -> ownedFoods increases & auto-added to selectedFoods
  const f1 = logic.buyFood(profile, 'mushroom');
  assert.equal(f1.ok, true);
  profile = f1.profile;
  assert.equal(profile.coins, 1880);
  assert.ok(profile.ownedFoods.includes('mushroom'));
  assert.ok(profile.selectedFoods.includes('mushroom'));

  // Duplicate food buy prevented
  assert.equal(logic.buyFood(profile, 'mushroom').ok, false);

  // Solo mode selects only 1, and cannot toggle off the last remaining food
  const soloRes = logic.toggleFoodSelection(profile, 'cheese', 'solo');
  assert.equal(soloRes.ok, true);
  profile = soloRes.profile;
  assert.deepEqual(profile.selectedFoods, ['cheese']);
  assert.equal(logic.toggleFoodSelection(profile, 'cheese', 'toggle').ok, false);

  // Adding multiple foods allows multiple food types together in the arena
  profile = logic.toggleFoodSelection(profile, 'tomato', 'add').profile;
  profile = logic.toggleFoodSelection(profile, 'mushroom', 'add').profile;
  assert.deepEqual(profile.selectedFoods, ['cheese', 'tomato', 'mushroom']);

  // Buy Special Decoration & equip it
  const spBuy = logic.buySpecialDecor(profile, 'flower-blossoms');
  assert.equal(spBuy.ok, true);
  profile = spBuy.profile;
  assert.equal(profile.equippedSpecialDecorId, 'flower-blossoms');
  assert.equal(logic.buySpecialDecor(profile, 'flower-blossoms').ok, false);

  // Unlock 5 total foods beyond default 9 -> reaches 14 foods -> claim Master Chef collection (+400)
  for (const fid of ['meat', 'fish', 'shrimp', 'candy'] as const) {
    profile = logic.buyFood(profile, fid).profile;
  }
  assert.equal(profile.ownedFoods.length, 14);
  const coinsBeforeCol = profile.coins;
  const colRes = logic.claimCollectionGoal(profile, 'col-foods-14');
  assert.equal(colRes.ok, true);
  assert.equal(colRes.coinsAwarded, 400);
  profile = colRes.profile;
  assert.equal(profile.coins, coinsBeforeCol + 400);
  assert.equal(logic.claimCollectionGoal(profile, 'col-foods-14').ok, false);

  // GameEngine spawns selected multiple foods together inside the live arena
  const engine = new GameEngine();
  engine.setDecorId('purple-craters');
  engine.setSelectedFoods(['cheese', 'tomato', 'mushroom', 'fish']);
  engine.setSpecialDecorId('flower-blossoms');
  engine.startGame();

  const spawnedKinds = new Set(engine.foods.map((f) => f.kind));
  assert.ok(spawnedKinds.has('cheese'), 'Arena must spawn selected cheese food');
  assert.ok(spawnedKinds.has('tomato'), 'Arena must spawn selected tomato food');
  assert.ok(spawnedKinds.has('mushroom'), 'Arena must spawn selected mushroom food');
  assert.ok(spawnedKinds.has('fish'), 'Arena must spawn selected fish food');
});
