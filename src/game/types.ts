export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type ControlMode = 'fixed' | 'floating' | 'follow';

export type SkinPattern =
  | 'striped'
  | 'spotted'
  | 'gradient'
  | 'segmented'
  | 'cosmic'
  | 'honey'
  | 'circuit'
  | 'candy'
  | 'rainbow'
  | 'flame';

export type SkinRarity = 'basic' | 'rare' | 'epic' | 'legendary';

export type SkinFaceStyle = 'cheerful' | 'fierce' | 'cool' | 'kawaii' | 'cyber' | 'royal';

export type SkinAnimation = 'pulse' | 'shimmer' | 'sparkle' | 'wave' | 'flame' | 'orbit';

export interface WormSkin {
  id: string;
  name: string;
  rarity: SkinRarity;
  price: number;
  pattern: SkinPattern;
  primary: string;
  secondary: string;
  accent: string;
  belly: string;
  outline: string;
  glow: string;
  eyeIris: string;
  crestStyle: 'none' | 'horns' | 'crown' | 'antennae' | 'fins';
  faceStyle: SkinFaceStyle;
  bodyAnim: SkinAnimation;
  description: string;
  offerOnly?: boolean;
}

export type PowerUpId = 'magnet' | 'multiplier' | 'radar' | 'speed' | 'mobility' | 'zoom';

export interface PowerUpDefinition {
  id: PowerUpId;
  name: string;
  shortDesc: string;
  color: string;
  badgeLabel: string;
  maxLevel: number;
  prices: number[];
  durations: number[];
  effectValues: number[];
  formatEffect: (value: number) => string;
}

export interface ActivePowerUpState {
  level: number;
  remaining: number;
  maxDuration: number;
}

export type ArenaDecorId =
  | 'purple-craters'
  | 'ocean-blue'
  | 'obsidian-black'
  | 'midnight-hex'
  | 'ocean-reef'
  | 'candy-kingdom'
  | 'emerald-jungle'
  | 'magma-core'
  | 'arctic-glacier'
  | 'cyber-grid'
  | 'desert-dunes'
  | 'sakura-garden'
  | 'galactic-nebula';

export type ArenaPatternStyle = 'circles' | 'hex' | 'dots' | 'grid' | 'waves' | 'stars' | 'petals';

export type SpecialDecorId =
  | 'none'
  | 'glow-fireflies'
  | 'flower-blossoms'
  | 'sea-bubbles'
  | 'candy-sparkles'
  | 'cartoon-badges';

export interface SpecialDecorDefinition {
  id: SpecialDecorId;
  name: string;
  category: 'none' | 'glowing' | 'flowers' | 'sea' | 'food' | 'cartoon';
  price: number;
  description: string;
  colors: string[];
}

export type FoodItemId =
  | 'cheese'
  | 'tomato'
  | 'carrot'
  | 'corn'
  | 'bread'
  | 'sandwich'
  | 'cherry'
  | 'pumpkin'
  | 'cake'
  | 'mushroom'
  | 'meat'
  | 'fish'
  | 'shrimp'
  | 'starfish'
  | 'candy'
  | 'lollipop'
  | 'strawberry'
  | 'watermelon'
  | 'grapes'
  | 'avocado'
  | 'pineapple'
  | 'lemon';

export interface FoodDefinition {
  id: FoodItemId;
  name: string;
  category: 'savory' | 'produce' | 'sweets' | 'ocean';
  price: number;
  color: string;
  glow: string;
  description: string;
}

export interface ArenaFoodSwatch {
  color: string;
  glow: string;
}

export interface ArenaDecorTheme {
  id: ArenaDecorId;
  name: string;
  price: number;
  description: string;
  voidBg: string;
  floorBg: string;
  patternStyle: ArenaPatternStyle;
  patternStroke: string;
  patternAccent: string;
  ringColors: string[];
  hazardColor: string;
  hazardGlow: string;
  foodThemeName: string;
  foodPalette: ArenaFoodSwatch[];
  foodKinds: Exclude<FoodKind, 'loot'>[];
}

export interface SpecialOffer {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  originalValue: number;
  badge: string;
  accentColor: string;
  skinIds: string[];
  decorId?: ArenaDecorId;
  upgradeBoosts?: Partial<Record<PowerUpId, number>>;
  bonusCoins?: number;
}

export interface DailyRewardStep {
  day: number;
  coins: number;
  bonusSkinId?: string;
  label: string;
}

export interface PlayerProfile {
  playerId: string;
  playerName: string;
  controlMode: ControlMode;
  coins: number;
  ownedSkins: string[];
  equippedSkinId: string;
  upgrades: Record<PowerUpId, number>;
  ownedDecors: ArenaDecorId[];
  equippedDecorId: ArenaDecorId;
  ownedFoods: FoodItemId[];
  selectedFoods: FoodItemId[];
  ownedSpecialDecors: SpecialDecorId[];
  equippedSpecialDecorId: SpecialDecorId;
  claimedCollections: string[];
  claimedOffers: string[];
  dailyStreak: number;
  lastDailyClaimDate: string | null;
  lastFreeCoinsAt: number;
  adsWatchedCount: number;
  bestScore: number;
  totalMatches: number;
  totalKills: number;
}

export type FoodKind = FoodItemId | 'berry' | 'gem' | 'donut' | 'loot';

export interface FoodItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  color: string;
  glowColor: string;
  kind: FoodKind;
  phase: number;
  fromDeath: boolean;
  attractedBy: number | null;
}

export interface ArenaPowerUpOrb {
  id: number;
  powerUpId: PowerUpId;
  x: number;
  y: number;
  radius: number;
  phase: number;
}

export type AIStyle = 'forager' | 'hunter' | 'opportunist';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Worm {
  id: number;
  name: string;
  isPlayer: boolean;
  skin: WormSkin;
  alive: boolean;
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  speed: number;
  baseRadius: number;
  mass: number;
  score: number;
  kills: number;
  boosting: boolean;
  boostDrainAccum: number;
  segments: Vec2[];
  pathHistory: Vec2[];
  mouthOpen: number;
  comboCount: number;
  comboTimer: number;
  spawnProtection: number;
  aiStyle: AIStyle;
  aiDecisionTimer: number;
  aiTargetFoodId: number | null;
  aiWanderAngle: number;
  aiBoostTimer: number;
  deathCause?: string;
}

export type ParticleKind = 'orb' | 'spark' | 'ring' | 'confetti';

export interface DeathEvent {
  isPlayer: boolean;
  wormName: string;
  x: number;
  y: number;
  skin: WormSkin;
  baseRadius: number;
  segments: Vec2[];
}

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  expandRate: number;
  rotation: number;
  vRot: number;
  color: string;
  life: number;
  maxLife: number;
  glow: boolean;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  score: number;
  isPlayer: boolean;
  color: string;
  rank: number;
}

export interface HudPowerUpChip {
  id: PowerUpId;
  name: string;
  badgeLabel: string;
  color: string;
  level: number;
  remaining: number;
  maxDuration: number;
}

export interface HudSnapshot {
  score: number;
  bestScore: number;
  length: number;
  kills: number;
  rank: number;
  totalWorms: number;
  canBoost: boolean;
  isBoosting: boolean;
  boostMeter: number;
  combo: number;
  survivalSeconds: number;
  leaderboard: LeaderboardEntry[];
  killBanner: string | null;
  activePowerUps: HudPowerUpChip[];
  scoreMultiplier: number;
}

export interface GameOverStats {
  finalScore: number;
  bestScore: number;
  isNewBest: boolean;
  peakLength: number;
  kills: number;
  survivalSeconds: number;
  eliminatedBy: string;
  coinsEarned: number;
}

export interface InputState {
  pointerActive: boolean;
  pointerAngle: number;
  joystickActive: boolean;
  joystickAngle: number;
  joystickMagnitude: number;
  keysHeld: Set<string>;
  boostHeld: boolean;
}
