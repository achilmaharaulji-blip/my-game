import {
  AI_NAMES,
  DEFAULT_OWNED_FOODS,
  WORM_SKINS,
  getDecorById,
  getFoodById,
  getPowerUpById,
  getSkinById,
  getSpecialDecorById,
  POWER_UPS,
} from './workshopData';
import { computeMatchCoins } from './workshopLogic';
import { SpatialGrid } from './spatialGrid';
import type {
  ActivePowerUpState,
  AIStyle,
  ArenaDecorId,
  ArenaPowerUpOrb,
  DeathEvent,
  FloatingText,
  FoodItem,
  FoodItemId,
  GameOverStats,
  GamePhase,
  HudPowerUpChip,
  HudSnapshot,
  InputState,
  LeaderboardEntry,
  Particle,
  ParticleKind,
  PowerUpId,
  SpecialDecorId,
  Vec2,
  Worm,
  WormSkin,
} from './types';

export const ARENA_RADIUS = 2800;
export const AI_WORM_COUNT = 10;
export const TARGET_FOOD_COUNT = 640;
export const TARGET_POWERUP_ORBS = 6;
export const INITIAL_PLAYER_MASS = 150;
export const MIN_BOOST_MASS = 95;
export const BASE_SPEED = 215;
export const BOOST_SPEED = 385;
export const BOOST_MASS_COST_PER_SEC = 22;
export const HIGH_SCORE_STORAGE_KEY = 'wormz_arena_high_score_v1';

export interface SegmentProxy {
  wormId: number;
  segIndex: number;
  x: number;
  y: number;
  radius: number;
}

export interface EngineCallbacks {
  onEat?: (combo: number, isLoot: boolean, isPlayer: boolean) => void;
  onKill?: (killerIsPlayer: boolean, victimName: string) => void;
  onDeath?: (isPlayer: boolean, event: DeathEvent) => void;
  onBoostTick?: () => void;
  onPhaseChange?: (phase: GamePhase, gameOverStats: GameOverStats | null) => void;
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

export function computeWormRadius(mass: number): number {
  return 15 + Math.min(22, Math.sqrt(Math.max(0, mass - 100)) * 0.45);
}

export function computeTargetSegments(mass: number): number {
  return Math.max(10, Math.min(220, 12 + Math.floor((mass - 80) / 14)));
}

export class GameEngine {
  phase: GamePhase = 'title';
  worms: Worm[] = [];
  foods: FoodItem[] = [];
  powerUpOrbs: ArenaPowerUpOrb[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];

  cameraX = 0;
  cameraY = 0;
  cameraZoom = 1;
  cameraTrauma = 0;
  hitstopTimer = 0;
  elapsedTime = 0;
  survivalTime = 0;
  bestScore = 0;
  playerPeakLength = 0;
  playerSkinId: string = WORM_SKINS[0].id;
  playerName = 'You';
  decorId: ArenaDecorId = 'purple-craters';
  selectedFoods: FoodItemId[] = [...DEFAULT_OWNED_FOODS];
  specialDecorId: SpecialDecorId = 'none';
  playerUpgrades: Record<PowerUpId, number> = {
    magnet: 0,
    multiplier: 0,
    radar: 0,
    speed: 0,
    mobility: 0,
    zoom: 0,
  };
  activePowerUps: Record<PowerUpId, ActivePowerUpState> = {
    magnet: { level: 0, remaining: 0, maxDuration: 0 },
    multiplier: { level: 0, remaining: 0, maxDuration: 0 },
    radar: { level: 0, remaining: 0, maxDuration: 0 },
    speed: { level: 0, remaining: 0, maxDuration: 0 },
    mobility: { level: 0, remaining: 0, maxDuration: 0 },
    zoom: { level: 0, remaining: 0, maxDuration: 0 },
  };

  private nextId = 1;
  private foodGrid = new SpatialGrid<FoodItem>(200);
  private segmentGrid = new SpatialGrid<SegmentProxy>(140);
  private foodQueryScratch: FoodItem[] = [];
  private segQueryScratch: SegmentProxy[] = [];
  private segmentProxies: SegmentProxy[] = [];
  private pendingAiRespawns: number[] = [];
  private pendingOrbRespawns: Array<{ delay: number; powerUpId: PowerUpId }> = [];
  private playerDeathDelayTimer = 0;
  private pendingGameOverStats: GameOverStats | null = null;
  private killBannerText: string | null = null;
  private killBannerTimer = 0;
  private titlePanAngle = 0;
  private callbacks: EngineCallbacks;

  constructor(callbacks: EngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.bestScore = this.loadBestScore();

    // Pre-allocate pooled particles (zero GC in loop)
    for (let i = 0; i < 640; i++) {
      this.particles.push({
        active: false,
        kind: 'orb',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 4,
        expandRate: 0,
        rotation: 0,
        vRot: 0,
        color: '#fff',
        life: 0,
        maxLife: 1,
        glow: false,
      });
    }

    // Pre-allocate pooled floating score texts
    for (let i = 0; i < 32; i++) {
      this.floatingTexts.push({
        active: false,
        x: 0,
        y: 0,
        vy: -38,
        text: '',
        color: '#fff',
        life: 0,
        maxLife: 0.7,
        scale: 1,
      });
    }

    this.initTitleWorld();
  }

  private loadBestScore(): number {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(Math.floor(score)));
    } catch {
      // Ignore storage quota errors
    }
  }

  setPlayerSkin(skinId: string): void {
    this.playerSkinId = getSkinById(skinId).id;
    const player = this.getPlayer();
    if (player && player.alive && this.phase === 'title') {
      player.skin = getSkinById(this.playerSkinId);
    }
  }

  setPlayerName(name: string): void {
    const trimmed = name.trim().slice(0, 14);
    this.playerName = trimmed.length > 0 ? trimmed : 'You';
  }

  setDecorId(decorId: ArenaDecorId): void {
    const nextDecor = getDecorById(decorId).id;
    const changed = nextDecor !== this.decorId;
    this.decorId = nextDecor;
    if (changed && this.phase === 'title') {
      this.foods = [];
      for (let i = 0; i < TARGET_FOOD_COUNT; i++) {
        this.spawnRandomFood();
      }
    }
  }

  setSelectedFoods(foods: FoodItemId[]): void {
    const clean = Array.from(new Set(foods));
    this.selectedFoods = clean.length > 0 ? clean : [...DEFAULT_OWNED_FOODS];
    if (this.phase === 'title') {
      this.foods = [];
      for (let i = 0; i < TARGET_FOOD_COUNT; i++) {
        this.spawnRandomFood();
      }
    }
  }

  setSpecialDecorId(specialDecorId: SpecialDecorId): void {
    this.specialDecorId = getSpecialDecorById(specialDecorId).id;
  }

  setUpgrades(upgrades: Record<PowerUpId, number>): void {
    for (const def of POWER_UPS) {
      const lv = Math.max(0, Math.min(def.maxLevel, Math.floor(upgrades[def.id] ?? 0)));
      this.playerUpgrades[def.id] = lv;
    }
  }

  getActivePowerUpEffect(id: PowerUpId): number {
    const state = this.activePowerUps[id];
    if (!state || state.level <= 0 || state.remaining <= 0) {
      return id === 'multiplier' ? 1 : 0;
    }
    const def = getPowerUpById(id);
    return def.effectValues[Math.min(def.effectValues.length - 1, state.level - 1)];
  }

  private resetActivePowerUpsForMatch(): void {
    for (const def of POWER_UPS) {
      const lv = this.playerUpgrades[def.id] ?? 0;
      if (lv > 0) {
        const dur = def.durations[Math.min(def.durations.length - 1, lv - 1)];
        this.activePowerUps[def.id] = { level: lv, remaining: dur, maxDuration: dur };
      } else {
        this.activePowerUps[def.id] = { level: 0, remaining: 0, maxDuration: 0 };
      }
    }
  }

  initTitleWorld(): void {
    this.phase = 'title';
    this.worms = [];
    this.foods = [];
    this.powerUpOrbs = [];
    this.pendingAiRespawns = [];
    this.pendingOrbRespawns = [];
    this.playerDeathDelayTimer = 0;
    this.pendingGameOverStats = null;
    this.killBannerText = null;
    this.killBannerTimer = 0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.clearPools();

    for (let i = 0; i < TARGET_FOOD_COUNT; i++) {
      this.spawnRandomFood();
    }
    for (let i = 0; i < AI_WORM_COUNT; i++) {
      this.spawnAiWorm(true);
    }
    this.rebuildSpatialGrids();
  }

  startGame(): void {
    this.phase = 'playing';
    this.worms = [];
    this.foods = [];
    this.powerUpOrbs = [];
    this.pendingAiRespawns = [];
    this.pendingOrbRespawns = [];
    this.playerDeathDelayTimer = 0;
    this.pendingGameOverStats = null;
    this.killBannerText = null;
    this.killBannerTimer = 0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.survivalTime = 0;
    this.clearPools();
    this.resetActivePowerUpsForMatch();

    for (let i = 0; i < TARGET_FOOD_COUNT; i++) {
      this.spawnRandomFood();
    }
    for (const def of POWER_UPS) {
      this.spawnPowerUpOrb(def.id);
    }

    // Spawn player safely near center facing an open direction
    const playerSkin = getSkinById(this.playerSkinId);
    const player = this.createWorm({
      name: this.playerName,
      isPlayer: true,
      skin: playerSkin,
      x: 0,
      y: 0,
      angle: -Math.PI * 0.25,
      mass: INITIAL_PLAYER_MASS,
      aiStyle: 'forager',
      spawnProtection: 1.5,
    });
    this.worms.push(player);
    this.playerPeakLength = player.segments.length;

    // Spawn 10 AI worms away from player spawn
    for (let i = 0; i < AI_WORM_COUNT; i++) {
      this.spawnAiWorm(true);
    }

    this.cameraX = player.x;
    this.cameraY = player.y;
    const zoomPct = this.getActivePowerUpEffect('zoom');
    this.cameraZoom = zoomPct > 0 ? 1 / (1 + zoomPct / 100) : 1;
    this.rebuildSpatialGrids();
    this.callbacks.onPhaseChange?.('playing', null);
  }

  pauseGame(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.callbacks.onPhaseChange?.('paused', null);
    }
  }

  resumeGame(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.callbacks.onPhaseChange?.('playing', null);
    }
  }

  returnToTitle(): void {
    this.initTitleWorld();
    this.callbacks.onPhaseChange?.('title', null);
  }

  private clearPools(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
    }
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].active = false;
    }
  }

  getPlayer(): Worm | undefined {
    return this.worms.find((w) => w.isPlayer);
  }

  private findSafeSpawnPos(minDistFromWorms = 320): Vec2 {
    for (let attempt = 0; attempt < 24; attempt++) {
      const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 360);
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;

      let safe = true;
      for (let i = 0; i < this.worms.length; i++) {
        const w = this.worms[i];
        if (!w.alive) continue;
        const dx = w.x - x;
        const dy = w.y - y;
        if (dx * dx + dy * dy < minDistFromWorms * minDistFromWorms) {
          safe = false;
          break;
        }
      }
      if (safe) return { x, y };
    }
    const theta = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(theta) * (ARENA_RADIUS * 0.55),
      y: Math.sin(theta) * (ARENA_RADIUS * 0.55),
    };
  }

  createWorm(opts: {
    name: string;
    isPlayer: boolean;
    skin: WormSkin;
    x: number;
    y: number;
    angle: number;
    mass: number;
    aiStyle: AIStyle;
    spawnProtection?: number;
  }): Worm {
    const baseRadius = computeWormRadius(opts.mass);
    const segCount = computeTargetSegments(opts.mass);
    const spacing = baseRadius * 0.62;
    const segments: Vec2[] = [];
    const pathHistory: Vec2[] = [];

    // Initialize trailing segments opposite facing angle
    const backX = -Math.cos(opts.angle);
    const backY = -Math.sin(opts.angle);
    for (let i = 0; i < segCount; i++) {
      const px = opts.x + backX * i * spacing;
      const py = opts.y + backY * i * spacing;
      segments.push({ x: px, y: py });
      pathHistory.push({ x: px, y: py });
    }

    return {
      id: this.nextId++,
      name: opts.name,
      isPlayer: opts.isPlayer,
      skin: opts.skin,
      alive: true,
      x: opts.x,
      y: opts.y,
      angle: opts.angle,
      targetAngle: opts.angle,
      speed: BASE_SPEED,
      baseRadius,
      mass: opts.mass,
      score: Math.max(0, Math.round(opts.mass - 100)),
      kills: 0,
      boosting: false,
      boostDrainAccum: 0,
      segments,
      pathHistory,
      mouthOpen: 0,
      comboCount: 0,
      comboTimer: 0,
      spawnProtection: opts.spawnProtection ?? 1.2,
      aiStyle: opts.aiStyle,
      aiDecisionTimer: 0,
      aiTargetFoodId: null,
      aiWanderAngle: opts.angle,
      aiBoostTimer: 0,
    };
  }

  private spawnAiWorm(initialSpread = false): Worm {
    const pos = this.findSafeSpawnPos(initialSpread ? 340 : 380);
    // Face inward toward arena center with slight jitter so newly spawned worms don't immediately hit walls
    const inwardAngle = Math.atan2(-pos.y, -pos.x) + (Math.random() - 0.5) * 1.1;
    const usedNames = new Set(this.worms.map((w) => w.name));
    const availableNames = AI_NAMES.filter((n) => !usedNames.has(n));
    const namePool = availableNames.length > 0 ? availableNames : AI_NAMES;
    const name = namePool[Math.floor(Math.random() * namePool.length)];
    const skin = WORM_SKINS[Math.floor(Math.random() * WORM_SKINS.length)];
    const styles: AIStyle[] = ['forager', 'hunter', 'opportunist'];
    const aiStyle = styles[Math.floor(Math.random() * styles.length)];

    // Vary initial AI worm sizes slightly on initial spawn for lively hierarchy
    const mass = initialSpread
      ? 140 + Math.floor(Math.random() * 260)
      : 145 + Math.floor(Math.random() * 90);

    const worm = this.createWorm({
      name,
      isPlayer: false,
      skin,
      x: pos.x,
      y: pos.y,
      angle: inwardAngle,
      mass,
      aiStyle,
      spawnProtection: 1.4,
    });
    this.worms.push(worm);
    return worm;
  }

  spawnRandomFood(): FoodItem {
    const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 85);
    const theta = Math.random() * Math.PI * 2;
    const pool = this.selectedFoods.length > 0 ? this.selectedFoods : DEFAULT_OWNED_FOODS;
    const chosenId = pool[Math.floor(Math.random() * pool.length)];
    const foodDef = getFoodById(chosenId);
    const isRich = Math.random() < 0.14;
    const value = isRich ? 14 : 6 + Math.floor(Math.random() * 4);
    const radius = isRich ? 15 : 11.5 + Math.random() * 2.5;

    const item: FoodItem = {
      id: this.nextId++,
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
      vx: 0,
      vy: 0,
      value,
      radius,
      color: foodDef.color,
      glowColor: foodDef.glow,
      kind: foodDef.id,
      phase: Math.random() * Math.PI * 2,
      fromDeath: false,
      attractedBy: null,
    };
    this.foods.push(item);
    return item;
  }

  spawnPowerUpOrb(powerUpId: PowerUpId): ArenaPowerUpOrb {
    const r = 240 + Math.sqrt(Math.random()) * (ARENA_RADIUS - 520);
    const theta = Math.random() * Math.PI * 2;
    const orb: ArenaPowerUpOrb = {
      id: this.nextId++,
      powerUpId,
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
      radius: 18,
      phase: Math.random() * Math.PI * 2,
    };
    this.powerUpOrbs.push(orb);
    return orb;
  }

  private spawnDeathLoot(worm: Worm): void {
    const step = worm.segments.length > 60 ? 2 : 1;
    const lootValue = Math.max(14, Math.min(34, Math.round(worm.mass / Math.max(8, worm.segments.length / step))));

    for (let i = 0; i < worm.segments.length; i += step) {
      const seg = worm.segments[i];
      const jitterAngle = Math.random() * Math.PI * 2;
      const jitterDist = Math.random() * worm.baseRadius * 0.9;
      const fx = seg.x + Math.cos(jitterAngle) * jitterDist;
      const fy = seg.y + Math.sin(jitterAngle) * jitterDist;

      // Clamp inside arena
      const d = Math.hypot(fx, fy);
      const scale = d > ARENA_RADIUS - 40 ? (ARENA_RADIUS - 40) / d : 1;

      const color = i % 2 === 0 ? worm.skin.primary : worm.skin.secondary;
      const item: FoodItem = {
        id: this.nextId++,
        x: fx * scale,
        y: fy * scale,
        vx: Math.cos(jitterAngle) * (40 + Math.random() * 60),
        vy: Math.sin(jitterAngle) * (40 + Math.random() * 60),
        value: lootValue,
        radius: 11.5 + Math.random() * 3,
        color,
        glowColor: worm.skin.glow,
        kind: 'loot',
        phase: Math.random() * Math.PI * 2,
        fromDeath: true,
        attractedBy: null,
      };
      this.foods.push(item);
    }
  }

  private spawnTrailPellet(worm: Worm): void {
    const tail = worm.segments[worm.segments.length - 1];
    if (!tail) return;
    const item: FoodItem = {
      id: this.nextId++,
      x: tail.x + (Math.random() - 0.5) * 8,
      y: tail.y + (Math.random() - 0.5) * 8,
      vx: -Math.cos(worm.angle) * 28,
      vy: -Math.sin(worm.angle) * 28,
      value: 5,
      radius: 6.5,
      color: worm.skin.accent,
      glowColor: worm.skin.glow,
      kind: 'berry',
      phase: Math.random() * Math.PI * 2,
      fromDeath: false,
      attractedBy: null,
    };
    this.foods.push(item);
  }

  emitParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    speedMin = 50,
    speedMax = 210,
    radius = 5,
    glow = true,
    kind: ParticleKind = 'orb',
    lifeMin = 0.35,
    lifeMax = 0.7,
    expandRate = 0
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        p.active = true;
        p.kind = kind;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.radius = kind === 'ring' ? radius : radius * (0.7 + Math.random() * 0.65);
        p.expandRate = expandRate;
        p.rotation = angle;
        p.vRot = kind === 'confetti' ? (Math.random() - 0.5) * 14 : 0;
        p.color = color;
        p.maxLife = lifeMin + Math.random() * (lifeMax - lifeMin);
        p.life = p.maxLife;
        p.glow = glow;
        spawned++;
      }
    }
  }

  /**
   * Triggers a multi-layered explosion animation for a defeated worm.
   * Invoked via the `onDeath` engine callback so audio, camera, and particles stay decoupled.
   */
  triggerExplosion(event: DeathEvent): void {
    const { x, y, skin, baseRadius, segments } = event;

    // 1. Concentric expanding shockwave rings at the impact point
    this.emitParticles(x, y, 1, '#FFFFFF', 0, 0, baseRadius * 0.9, true, 'ring', 0.32, 0.36, 360);
    this.emitParticles(x, y, 1, skin.primary, 0, 0, baseRadius * 0.65, true, 'ring', 0.48, 0.52, 290);

    // 2. Fiery core flash & primary skin burst orbs
    this.emitParticles(x, y, 10, '#FFFFFF', 110, 320, 6.5, true, 'orb', 0.25, 0.48);
    this.emitParticles(x, y, 12, '#FDE047', 120, 360, 7, true, 'orb', 0.32, 0.58);
    this.emitParticles(x, y, 18, skin.primary, 90, 340, 8, true, 'orb', 0.4, 0.75);

    // 3. High-velocity directional sparks radiating from the collision head
    this.emitParticles(x, y, 16, skin.accent, 240, 520, 4.5, true, 'spark', 0.28, 0.52);
    this.emitParticles(x, y, 10, '#FFFFFF', 280, 560, 3.8, true, 'spark', 0.22, 0.42);

    // 4. Body-segment chain pops & spinning confetti shards along the defeated worm
    const maxSampleSegs = 16;
    const step = Math.max(1, Math.floor(segments.length / maxSampleSegs));
    for (let i = 0; i < segments.length; i += step) {
      const seg = segments[i];
      const segColor = i % 3 === 0 ? skin.primary : i % 3 === 1 ? skin.secondary : skin.accent;
      this.emitParticles(seg.x, seg.y, 3, segColor, 45, 190, 6, true, 'orb', 0.35, 0.68);
      this.emitParticles(seg.x, seg.y, 2, segColor, 70, 230, 5.5, false, 'confetti', 0.42, 0.78);
    }
  }

  emitFloatingText(x: number, y: number, text: string, color: string, scale = 1): void {
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      if (!ft.active) {
        ft.active = true;
        ft.x = x;
        ft.y = y - 16;
        ft.vy = -44;
        ft.text = text;
        ft.color = color;
        ft.maxLife = 0.75;
        ft.life = ft.maxLife;
        ft.scale = scale;
        return;
      }
    }
  }

  update(rawDt: number, input: InputState): void {
    const dt = Math.min(Math.max(rawDt, 0), 0.05);
    this.elapsedTime += dt;

    if (this.phase === 'paused') {
      return;
    }

    // Decay camera shake and visual-only particles even during hitstop or gameover
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.9);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    if (this.phase === 'gameover') {
      return;
    }

    if (this.killBannerTimer > 0) {
      this.killBannerTimer -= dt;
      if (this.killBannerTimer <= 0) {
        this.killBannerText = null;
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.phase === 'playing') {
      this.survivalTime += dt;
      for (const def of POWER_UPS) {
        const state = this.activePowerUps[def.id];
        if (state.remaining > 0) {
          state.remaining = Math.max(0, state.remaining - dt);
        }
      }
    }

    // Delayed game-over modal after player death burst
    if (this.playerDeathDelayTimer > 0) {
      this.playerDeathDelayTimer -= dt;
      if (this.playerDeathDelayTimer <= 0 && this.pendingGameOverStats) {
        this.phase = 'gameover';
        const stats = this.pendingGameOverStats;
        this.pendingGameOverStats = null;
        this.callbacks.onPhaseChange?.('gameover', stats);
        return;
      }
    }

    this.rebuildSpatialGrids();

    // Update steering for player and AI
    for (let i = 0; i < this.worms.length; i++) {
      const w = this.worms[i];
      if (!w.alive) continue;

      if (w.spawnProtection > 0) {
        w.spawnProtection = Math.max(0, w.spawnProtection - dt);
      }
      if (w.mouthOpen > 0) {
        w.mouthOpen = Math.max(0, w.mouthOpen - dt * 4.5);
      }
      if (w.comboTimer > 0) {
        w.comboTimer -= dt;
        if (w.comboTimer <= 0) {
          w.comboCount = 0;
        }
      }

      if (w.isPlayer) {
        this.applyPlayerInput(w, input);
      } else {
        this.updateAiSteering(w, dt);
      }
    }

    // Move worms and handle boost mass drain
    for (let i = 0; i < this.worms.length; i++) {
      const w = this.worms[i];
      if (!w.alive) continue;
      this.stepWormMovement(w, dt);
    }

    // Rebuild grids after movement for accurate eating & collisions
    this.rebuildSpatialGrids();

    // Update food velocity, attraction, and eating
    this.stepFoods(dt);

    // Update & collect Arena Power-Up Orbs
    this.stepPowerUpOrbs(dt);

    // Collision detection
    this.resolveCollisions();

    // Replenish ambient food
    const ambientCount = this.foods.length;
    if (ambientCount < TARGET_FOOD_COUNT) {
      const toSpawn = Math.min(8, TARGET_FOOD_COUNT - ambientCount);
      for (let i = 0; i < toSpawn; i++) {
        this.spawnRandomFood();
      }
    }

    // Handle AI respawns to keep 10 active AI worms
    for (let i = this.pendingAiRespawns.length - 1; i >= 0; i--) {
      this.pendingAiRespawns[i] -= dt;
      if (this.pendingAiRespawns[i] <= 0) {
        this.pendingAiRespawns.splice(i, 1);
        this.spawnAiWorm(false);
      }
    }

    // Handle Power-Up Orb respawns
    for (let i = this.pendingOrbRespawns.length - 1; i >= 0; i--) {
      this.pendingOrbRespawns[i].delay -= dt;
      if (this.pendingOrbRespawns[i].delay <= 0) {
        const nextId = this.pendingOrbRespawns[i].powerUpId;
        this.pendingOrbRespawns.splice(i, 1);
        if (this.powerUpOrbs.length < TARGET_POWERUP_ORBS) {
          this.spawnPowerUpOrb(nextId);
        }
      }
    }

    // Prune dead worms from active array
    for (let i = this.worms.length - 1; i >= 0; i--) {
      if (!this.worms[i].alive) {
        this.worms.splice(i, 1);
      }
    }

    // Ensure exact AI count in title mode or playing mode
    const aiAlive = this.worms.filter((w) => !w.isPlayer && w.alive).length;
    const totalPending = aiAlive + this.pendingAiRespawns.length;
    if (totalPending < AI_WORM_COUNT) {
      for (let k = totalPending; k < AI_WORM_COUNT; k++) {
        this.pendingAiRespawns.push(0.9);
      }
    }

    // Update camera
    this.updateCamera(dt);
  }

  private applyPlayerInput(player: Worm, input: InputState): void {
    // Priority: Keyboard 8-way directional input -> Touch Joystick -> Mouse Pointer
    let kx = 0;
    let ky = 0;
    if (input.keysHeld.has('ArrowUp') || input.keysHeld.has('KeyW')) ky -= 1;
    if (input.keysHeld.has('ArrowDown') || input.keysHeld.has('KeyS')) ky += 1;
    if (input.keysHeld.has('ArrowLeft') || input.keysHeld.has('KeyA')) kx -= 1;
    if (input.keysHeld.has('ArrowRight') || input.keysHeld.has('KeyD')) kx += 1;

    if (kx !== 0 || ky !== 0) {
      player.targetAngle = Math.atan2(ky, kx);
    } else if (input.joystickActive && input.joystickMagnitude > 0.08) {
      player.targetAngle = input.joystickAngle;
    } else if (input.pointerActive) {
      player.targetAngle = input.pointerAngle;
    }

    const canBoost = player.mass > MIN_BOOST_MASS;
    const wantsBoost =
      input.boostHeld ||
      input.keysHeld.has('Space') ||
      input.keysHeld.has('ShiftLeft') ||
      input.keysHeld.has('ShiftRight');

    player.boosting = wantsBoost && canBoost;
    if (player.boosting) {
      this.callbacks.onBoostTick?.();
    }
  }

  private updateAiSteering(worm: Worm, dt: number): void {
    worm.aiDecisionTimer -= dt;
    if (worm.aiBoostTimer > 0) {
      worm.aiBoostTimer -= dt;
    }

    // 1. Immediate boundary avoidance
    const distFromCenter = Math.hypot(worm.x, worm.y);
    if (distFromCenter > ARENA_RADIUS - 260) {
      const toCenter = Math.atan2(-worm.y, -worm.x);
      worm.targetAngle = toCenter;
      worm.boosting = false;
      return;
    }

    // 2. Ray/lookahead obstacle avoidance against other worms' segments
    const lookDist = worm.boosting ? 220 : 165;
    const nearbySegs = this.segmentGrid.queryRadius(
      worm.x + Math.cos(worm.angle) * (lookDist * 0.55),
      worm.y + Math.sin(worm.angle) * (lookDist * 0.55),
      lookDist,
      this.segQueryScratch
    );

    let avoidX = 0;
    let avoidY = 0;
    let dangerLevel = 0;

    for (let i = 0; i < nearbySegs.length; i++) {
      const seg = nearbySegs[i];
      if (seg.wormId === worm.id) continue;
      const dx = worm.x - seg.x;
      const dy = worm.y - seg.y;
      const distSq = dx * dx + dy * dy;
      const safeDist = worm.baseRadius + seg.radius + 115;
      if (distSq < safeDist * safeDist && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const toSegAngle = Math.atan2(seg.y - worm.y, seg.x - worm.x);
        const rel = Math.abs(angleDiff(worm.angle, toSegAngle));
        if (rel < Math.PI * 0.65) {
          const weight = (1 - dist / safeDist) * (1 - rel / (Math.PI * 0.7));
          avoidX += (dx / dist) * weight;
          avoidY += (dy / dist) * weight;
          dangerLevel = Math.max(dangerLevel, weight);
        }
      }
    }

    if (dangerLevel > 0.22) {
      worm.targetAngle = Math.atan2(avoidY, avoidX);
      worm.boosting =
        worm.aiStyle === 'opportunist' &&
        dangerLevel > 0.55 &&
        worm.mass > MIN_BOOST_MASS + 25;
      return;
    }

    // 3. Archetype-specific goal seeking
    if (worm.aiDecisionTimer <= 0) {
      worm.aiDecisionTimer = 0.22 + Math.random() * 0.18;

      // Hunter archetype: look for smaller/medium worms nearby to intercept
      if (worm.aiStyle === 'hunter' && worm.mass > MIN_BOOST_MASS + 30) {
        let bestPrey: Worm | null = null;
        let bestPreyDist = 460;
        for (let i = 0; i < this.worms.length; i++) {
          const other = this.worms[i];
          if (!other.alive || other.id === worm.id || other.spawnProtection > 0) continue;
          const d = Math.hypot(other.x - worm.x, other.y - worm.y);
          if (d < bestPreyDist && d > 95) {
            bestPreyDist = d;
            bestPrey = other;
          }
        }
        if (bestPrey) {
          // Aim ahead of prey's trajectory to cut them off
          const leadX = bestPrey.x + Math.cos(bestPrey.angle) * 115;
          const leadY = bestPrey.y + Math.sin(bestPrey.angle) * 115;
          worm.targetAngle = Math.atan2(leadY - worm.y, leadX - worm.x);
          if (bestPreyDist < 310 && Math.random() < 0.65) {
            worm.aiBoostTimer = 0.45;
          }
          worm.boosting = worm.aiBoostTimer > 0 && worm.mass > MIN_BOOST_MASS + 20;
          return;
        }
      }

      // Food seeking (opportunist prioritizes death loot strongly)
      const nearbyFood = this.foodGrid.queryRadius(worm.x, worm.y, 440, this.foodQueryScratch);
      let bestFood: FoodItem | null = null;
      let bestScore = -Infinity;

      for (let i = 0; i < nearbyFood.length; i++) {
        const f = nearbyFood[i];
        const d = Math.hypot(f.x - worm.x, f.y - worm.y);
        if (d > 440) continue;
        const lootBonus = f.fromDeath ? (worm.aiStyle === 'opportunist' ? 4.2 : 2.6) : 1;
        const score = (f.value * lootBonus) / (d + 45);
        if (score > bestScore) {
          bestScore = score;
          bestFood = f;
        }
      }

      if (bestFood) {
        worm.targetAngle = Math.atan2(bestFood.y - worm.y, bestFood.x - worm.x);
        if (bestFood.fromDeath && worm.mass > MIN_BOOST_MASS + 25 && Math.random() < 0.55) {
          worm.aiBoostTimer = 0.35;
        }
      } else {
        worm.aiWanderAngle += (Math.random() - 0.5) * 0.9;
        worm.targetAngle = worm.aiWanderAngle;
      }
    }

    worm.boosting = worm.aiBoostTimer > 0 && worm.mass > MIN_BOOST_MASS + 18;
  }

  private stepWormMovement(worm: Worm, dt: number): void {
    // Smooth angular turn (Mobility upgrade increases player turn agility)
    const mobilityPct = worm.isPlayer ? this.getActivePowerUpEffect('mobility') : 0;
    const baseTurnRate = Math.max(3.6, 6.4 - worm.baseRadius * 0.048);
    const turnRate = baseTurnRate * (1 + mobilityPct / 100);
    const diff = angleDiff(worm.angle, worm.targetAngle);
    const maxStep = turnRate * dt;
    if (Math.abs(diff) <= maxStep) {
      worm.angle = worm.targetAngle;
    } else {
      worm.angle = normalizeAngle(worm.angle + Math.sign(diff) * maxStep);
    }

    // Smooth speed acceleration/deceleration & boost cost (Speed upgrade increases velocity & trims drain)
    const speedPct = worm.isPlayer ? this.getActivePowerUpEffect('speed') : 0;
    const canBoost = worm.boosting && worm.mass > MIN_BOOST_MASS;
    if (canBoost) {
      const drainFactor = Math.max(0.55, 1 - speedPct * 0.008);
      const drain = BOOST_MASS_COST_PER_SEC * drainFactor * dt;
      worm.mass = Math.max(MIN_BOOST_MASS, worm.mass - drain);
      worm.boostDrainAccum += drain;
      if (worm.boostDrainAccum >= 18) {
        worm.boostDrainAccum -= 18;
        this.spawnTrailPellet(worm);
      }
      if (Math.random() < 0.45) {
        this.emitParticles(
          worm.segments[worm.segments.length - 1]?.x ?? worm.x,
          worm.segments[worm.segments.length - 1]?.y ?? worm.y,
          1,
          worm.skin.accent,
          15,
          55,
          4.5,
          true
        );
      }
    } else {
      worm.boosting = false;
    }

    const baseTargetSpeed = canBoost ? BOOST_SPEED : BASE_SPEED;
    const targetSpeed = baseTargetSpeed * (1 + speedPct / 100);
    const speedBlend = 1 - Math.exp(-dt * 14);
    worm.speed += (targetSpeed - worm.speed) * speedBlend;

    // Advance head
    worm.x += Math.cos(worm.angle) * worm.speed * dt;
    worm.y += Math.sin(worm.angle) * worm.speed * dt;

    // Update size & segment count
    worm.baseRadius = computeWormRadius(worm.mass);
    const targetSegCount = computeTargetSegments(worm.mass);
    const spacing = worm.baseRadius * 0.62;

    if (worm.isPlayer) {
      this.playerPeakLength = Math.max(this.playerPeakLength, targetSegCount);
    }

    // Keep pathHistory[0] at live head and lock breadcrumbs every >= 4px from pathHistory[1]
    const anchor = worm.pathHistory[1];
    if (!anchor || Math.hypot(worm.x - anchor.x, worm.y - anchor.y) >= 4) {
      worm.pathHistory.unshift({ x: worm.x, y: worm.y });
    } else if (worm.pathHistory[0]) {
      worm.pathHistory[0].x = worm.x;
      worm.pathHistory[0].y = worm.y;
    } else {
      worm.pathHistory.unshift({ x: worm.x, y: worm.y });
    }

    // Resample segments along pathHistory at fixed arc-length spacing
    if (worm.segments.length < targetSegCount) {
      while (worm.segments.length < targetSegCount) {
        const last = worm.segments[worm.segments.length - 1] ?? { x: worm.x, y: worm.y };
        worm.segments.push({ x: last.x, y: last.y });
      }
    } else if (worm.segments.length > targetSegCount) {
      worm.segments.length = targetSegCount;
    }

    worm.segments[0].x = worm.x;
    worm.segments[0].y = worm.y;

    let histIdx = 0;
    let prevX = worm.x;
    let prevY = worm.y;
    let segIdx = 1;
    let accum = 0;

    while (segIdx < worm.segments.length && histIdx < worm.pathHistory.length - 1) {
      const nextPt = worm.pathHistory[histIdx + 1];
      const segDx = nextPt.x - prevX;
      const segDy = nextPt.y - prevY;
      const segLen = Math.hypot(segDx, segDy);

      if (segLen < 0.0001) {
        histIdx++;
        continue;
      }

      if (accum + segLen >= spacing) {
        const remain = spacing - accum;
        const t = remain / segLen;
        const sx = prevX + segDx * t;
        const sy = prevY + segDy * t;
        worm.segments[segIdx].x = sx;
        worm.segments[segIdx].y = sy;
        segIdx++;
        prevX = sx;
        prevY = sy;
        accum = 0;
      } else {
        accum += segLen;
        histIdx++;
        prevX = nextPt.x;
        prevY = nextPt.y;
      }
    }

    // Fill any remaining tail segments cleanly
    const lastValid = worm.segments[Math.max(0, segIdx - 1)];
    for (let k = segIdx; k < worm.segments.length; k++) {
      worm.segments[k].x = lastValid.x;
      worm.segments[k].y = lastValid.y;
    }

    // Trim excess path history to keep memory bounded
    const maxHist = Math.max(24, histIdx + 12);
    if (worm.pathHistory.length > maxHist) {
      worm.pathHistory.length = maxHist;
    }
  }

  private rebuildSpatialGrids(): void {
    this.foodGrid.clear();
    for (let i = 0; i < this.foods.length; i++) {
      const f = this.foods[i];
      this.foodGrid.insert(f.x, f.y, f);
    }

    this.segmentGrid.clear();
    let proxyIdx = 0;
    for (let wIdx = 0; wIdx < this.worms.length; wIdx++) {
      const w = this.worms[wIdx];
      if (!w.alive) continue;
      for (let sIdx = 0; sIdx < w.segments.length; sIdx++) {
        const seg = w.segments[sIdx];
        const taper = sIdx > w.segments.length - 4 ? 0.72 : 1;
        const rad = w.baseRadius * taper;
        let proxy = this.segmentProxies[proxyIdx];
        if (!proxy) {
          proxy = { wormId: w.id, segIndex: sIdx, x: seg.x, y: seg.y, radius: rad };
          this.segmentProxies.push(proxy);
        } else {
          proxy.wormId = w.id;
          proxy.segIndex = sIdx;
          proxy.x = seg.x;
          proxy.y = seg.y;
          proxy.radius = rad;
        }
        proxyIdx++;
        this.segmentGrid.insert(seg.x, seg.y, proxy);
      }
    }
  }

  private stepPowerUpOrbs(dt: number): void {
    const player = this.getPlayer();
    for (let i = this.powerUpOrbs.length - 1; i >= 0; i--) {
      const orb = this.powerUpOrbs[i];
      orb.phase += dt * 3.4;

      if (player && player.alive) {
        const dx = player.x - orb.x;
        const dy = player.y - orb.y;
        const hitDist = player.baseRadius + orb.radius + 14;
        if (dx * dx + dy * dy <= hitDist * hitDist) {
          const def = getPowerUpById(orb.powerUpId);
          const level = Math.max(1, this.playerUpgrades[orb.powerUpId] ?? 0);
          const dur = def.durations[Math.min(def.durations.length - 1, level - 1)];
          this.activePowerUps[orb.powerUpId] = {
            level,
            remaining: dur,
            maxDuration: dur,
          };
          this.emitParticles(orb.x, orb.y, 14, def.color, 60, 220, 6, true);
          this.emitFloatingText(orb.x, orb.y, `${def.name.toUpperCase()}!`, def.color, 1.2);
          this.callbacks.onEat?.(6, true, true);
          this.powerUpOrbs.splice(i, 1);
          this.pendingOrbRespawns.push({ delay: 8, powerUpId: orb.powerUpId });
        }
      }
    }
  }

  private stepFoods(dt: number): void {
    // Drift & damp loot scatter velocities
    for (let i = 0; i < this.foods.length; i++) {
      const f = this.foods[i];
      f.phase += dt * 3.2;
      if (Math.abs(f.vx) > 0.5 || Math.abs(f.vy) > 0.5) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const damp = Math.pow(0.06, dt);
        f.vx *= damp;
        f.vy *= damp;
      }
    }

    const eatenIds = new Set<number>();

    for (let i = 0; i < this.worms.length; i++) {
      const w = this.worms[i];
      if (!w.alive) continue;

      const magnetBonus = w.isPlayer ? this.getActivePowerUpEffect('magnet') : 0;
      const attractRadius = w.baseRadius * 2.55 + magnetBonus;
      const eatRadius = w.baseRadius + 10;
      const nearby = this.foodGrid.queryRadius(w.x, w.y, attractRadius + 16, this.foodQueryScratch);

      for (let j = 0; j < nearby.length; j++) {
        const f = nearby[j];
        if (eatenIds.has(f.id)) continue;

        const dx = w.x - f.x;
        const dy = w.y - f.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= eatRadius + f.radius * 0.5) {
          eatenIds.add(f.id);
          this.applyFoodEaten(w, f);
        } else if (dist <= attractRadius) {
          const pullBoost = magnetBonus > 0 ? 260 : 0;
          const pullSpeed = (420 + pullBoost) * (1 - dist / attractRadius) + (140 + pullBoost * 0.5);
          f.x += (dx / dist) * pullSpeed * dt;
          f.y += (dy / dist) * pullSpeed * dt;
          w.mouthOpen = Math.min(1, w.mouthOpen + 0.35);
        }
      }
    }

    if (eatenIds.size > 0) {
      for (let i = this.foods.length - 1; i >= 0; i--) {
        if (eatenIds.has(this.foods[i].id)) {
          this.foods.splice(i, 1);
        }
      }
    }
  }

  private applyFoodEaten(worm: Worm, food: FoodItem): void {
    worm.mass += food.value * 0.85;
    worm.comboTimer = 1.1;
    worm.comboCount = Math.min(12, worm.comboCount + 1);
    const comboMult = worm.comboCount >= 5 ? 1.25 : 1;
    const upgradeMult = worm.isPlayer ? this.getActivePowerUpEffect('multiplier') : 1;
    const points = Math.round(food.value * comboMult * upgradeMult);
    worm.score += points;
    worm.mouthOpen = 1;

    if (worm.isPlayer) {
      if (worm.score > this.bestScore) {
        this.bestScore = worm.score;
        this.saveBestScore(this.bestScore);
      }
      this.emitParticles(food.x, food.y, food.fromDeath ? 6 : 4, food.color, 45, 130, 4, true);
      if (food.fromDeath || worm.comboCount >= 4 || upgradeMult > 1) {
        this.emitFloatingText(food.x, food.y, `+${points}`, food.color, food.fromDeath ? 1.15 : 0.95);
      }
      this.callbacks.onEat?.(worm.comboCount, food.fromDeath, true);
    }
  }

  private resolveCollisions(): void {
    const killedThisFrame: Array<{ victim: Worm; killer: Worm | null; cause: string }> = [];

    for (let i = 0; i < this.worms.length; i++) {
      const w = this.worms[i];
      if (!w.alive || w.spawnProtection > 0) continue;

      // 1. Arena wall collision
      const distCenter = Math.hypot(w.x, w.y);
      if (distCenter + w.baseRadius * 0.72 >= ARENA_RADIUS) {
        killedThisFrame.push({ victim: w, killer: null, cause: 'Arena Boundary' });
        continue;
      }

      // 2. Other worm body/head collision
      const searchRad = w.baseRadius + 46;
      const nearbySegs = this.segmentGrid.queryRadius(w.x, w.y, searchRad, this.segQueryScratch);

      let hitKiller: Worm | null = null;
      for (let j = 0; j < nearbySegs.length; j++) {
        const seg = nearbySegs[j];
        if (seg.wormId === w.id) continue;

        const other = this.worms.find((cand) => cand.id === seg.wormId);
        if (!other || !other.alive || other.spawnProtection > 0) continue;

        const dx = w.x - seg.x;
        const dy = w.y - seg.y;
        const hitDist = w.baseRadius * 0.7 + seg.radius * 0.76;

        if (dx * dx + dy * dy <= hitDist * hitDist) {
          // Head-to-head fairness: slightly larger mass wins, equal mass both die
          if (seg.segIndex === 0 && other.mass < w.mass * 0.88) {
            continue;
          }
          hitKiller = other;
          break;
        }
      }

      if (hitKiller) {
        killedThisFrame.push({ victim: w, killer: hitKiller, cause: hitKiller.name });
      }
    }

    for (let i = 0; i < killedThisFrame.length; i++) {
      const { victim, killer, cause } = killedThisFrame[i];
      if (!victim.alive) continue;
      this.killWorm(victim, killer, cause);
    }
  }

  private killWorm(victim: Worm, killer: Worm | null, cause: string): void {
    victim.alive = false;
    victim.deathCause = cause;
    this.spawnDeathLoot(victim);

    if (killer && killer.alive) {
      killer.kills += 1;
      const killBonus = killer.isPlayer ? Math.round(60 * this.getActivePowerUpEffect('multiplier')) : 60;
      killer.score += killBonus;
      if (killer.isPlayer) {
        if (killer.score > this.bestScore) {
          this.bestScore = killer.score;
          this.saveBestScore(this.bestScore);
        }
        this.hitstopTimer = 0.045;
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
        this.killBannerText = `Eliminated ${victim.name} +${killBonus}`;
        this.killBannerTimer = 2.0;
        this.emitFloatingText(victim.x, victim.y, `ELIMINATED! +${killBonus}`, '#FDE047', 1.3);
        this.callbacks.onKill?.(true, victim.name);
      }
    }

    const deathEvent: DeathEvent = {
      isPlayer: victim.isPlayer,
      wormName: victim.name,
      x: victim.x,
      y: victim.y,
      skin: victim.skin,
      baseRadius: victim.baseRadius,
      segments: victim.segments.map((s) => ({ x: s.x, y: s.y })),
    };

    if (victim.isPlayer) {
      const isNewBest = victim.score > 0 && victim.score >= this.bestScore;
      if (victim.score > this.bestScore) {
        this.bestScore = victim.score;
        this.saveBestScore(this.bestScore);
      }
      this.hitstopTimer = 0.06;
      this.cameraTrauma = 1.0;
      this.playerDeathDelayTimer = 0.7;
      this.pendingGameOverStats = {
        finalScore: victim.score,
        bestScore: this.bestScore,
        isNewBest,
        peakLength: Math.max(this.playerPeakLength, victim.segments.length),
        kills: victim.kills,
        survivalSeconds: Math.floor(this.survivalTime),
        eliminatedBy: cause,
        coinsEarned: computeMatchCoins(victim.score, victim.kills, this.playerUpgrades.multiplier ?? 0),
      };
    } else {
      this.pendingAiRespawns.push(1.1);
    }

    if (this.callbacks.onDeath) {
      this.callbacks.onDeath(victim.isPlayer, deathEvent);
    } else {
      this.triggerExplosion(deathEvent);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.expandRate !== 0) {
        p.radius += p.expandRate * dt;
      }
      if (p.vRot !== 0) {
        p.rotation += p.vRot * dt;
      }
      const damp = Math.pow(0.08, dt);
      p.vx *= damp;
      p.vy *= damp;
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      if (!ft.active) continue;
      ft.life -= dt;
      if (ft.life <= 0) {
        ft.active = false;
        continue;
      }
      ft.y += ft.vy * dt;
    }
  }

  private updateCamera(dt: number): void {
    const player = this.getPlayer();
    if (this.phase === 'title' || !player) {
      // Smooth scenic flyover across the live AI arena
      this.titlePanAngle += dt * 0.14;
      const targetX = Math.cos(this.titlePanAngle) * 780;
      const targetY = Math.sin(this.titlePanAngle * 0.85) * 620;
      const lerp = 1 - Math.exp(-dt * 2.5);
      this.cameraX += (targetX - this.cameraX) * lerp;
      this.cameraY += (targetY - this.cameraY) * lerp;
      this.cameraZoom += (0.85 - this.cameraZoom) * lerp;
      return;
    }

    const lerp = 1 - Math.exp(-dt * 14.5);
    this.cameraX += (player.x - this.cameraX) * lerp;
    this.cameraY += (player.y - this.cameraY) * lerp;

    // Gentle zoom out as worm grows bigger, plus Zoom power-up viewing expansion
    const baseTargetZoom = Math.max(0.66, 1.04 - (player.baseRadius - 15) * 0.015);
    const zoomPct = this.getActivePowerUpEffect('zoom');
    const targetZoom = Math.max(0.48, baseTargetZoom / (1 + zoomPct / 100));
    this.cameraZoom += (targetZoom - this.cameraZoom) * (1 - Math.exp(-dt * 3));
  }

  getHudSnapshot(): HudSnapshot {
    const aliveWorms = this.worms.filter((w) => w.alive);
    const sorted = [...aliveWorms].sort((a, b) => b.score - a.score);
    const player = this.getPlayer();
    const playerRank = player ? sorted.findIndex((w) => w.id === player.id) + 1 : 0;

    const leaderboard: LeaderboardEntry[] = sorted.slice(0, 5).map((w, idx) => ({
      id: w.id,
      name: w.name,
      score: Math.round(w.score),
      isPlayer: w.isPlayer,
      color: w.skin.primary,
      rank: idx + 1,
    }));

    const deadStats = this.pendingGameOverStats;
    const mass = player ? player.mass : INITIAL_PLAYER_MASS;
    const boostMeter = player ? Math.max(0, Math.min(1, (mass - MIN_BOOST_MASS) / 140)) : 0;

    const activePowerUps: HudPowerUpChip[] = [];
    for (const def of POWER_UPS) {
      const state = this.activePowerUps[def.id];
      if (state.level > 0 && state.remaining > 0) {
        activePowerUps.push({
          id: def.id,
          name: def.name,
          badgeLabel: def.badgeLabel,
          color: def.color,
          level: state.level,
          remaining: Math.ceil(state.remaining),
          maxDuration: state.maxDuration,
        });
      }
    }

    return {
      score: player ? Math.round(player.score) : (deadStats ? deadStats.finalScore : 0),
      bestScore: Math.round(this.bestScore),
      length: player ? player.segments.length : (deadStats ? deadStats.peakLength : 0),
      kills: player ? player.kills : (deadStats ? deadStats.kills : 0),
      rank: playerRank || sorted.length + 1,
      totalWorms: aliveWorms.length,
      canBoost: player ? player.mass > MIN_BOOST_MASS : false,
      isBoosting: player ? player.boosting : false,
      boostMeter,
      combo: player ? player.comboCount : 0,
      survivalSeconds: Math.floor(this.survivalTime),
      leaderboard,
      killBanner: this.killBannerText,
      activePowerUps,
      scoreMultiplier: this.getActivePowerUpEffect('multiplier'),
    };
  }
}
