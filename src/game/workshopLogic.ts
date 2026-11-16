import type {
  ArenaDecorId,
  ControlMode,
  FoodItemId,
  PlayerProfile,
  PowerUpId,
  SpecialDecorId,
} from './types.ts';
import {
  AD_REWARD_COINS,
  ARENA_DECORS,
  COLLECTION_GOALS,
  DAILY_REWARDS,
  DEFAULT_OWNED_FOODS,
  FOOD_CATALOG,
  FREE_COINS_AMOUNT,
  FREE_COINS_COOLDOWN_MS,
  POWER_UPS,
  SPECIAL_DECORS,
  SPECIAL_OFFERS,
  STARTING_COINS,
  WORM_SKINS,
  getDecorById,
  getFoodById,
  getPowerUpById,
  getSkinById,
  getSpecialDecorById,
} from './workshopData.ts';

export interface ActionResult {
  ok: boolean;
  error?: string;
  profile: PlayerProfile;
  coinsAwarded?: number;
  unlockedItems?: string[];
}

export function getUtcDayString(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function createDefaultProfile(playerId = 'default-player'): PlayerProfile {
  return {
    playerId,
    playerName: 'You',
    controlMode: 'fixed',
    coins: STARTING_COINS,
    ownedSkins: ['coral-viper', 'mint-cobra'],
    equippedSkinId: 'coral-viper',
    upgrades: {
      magnet: 0,
      multiplier: 0,
      radar: 0,
      speed: 0,
      mobility: 0,
      zoom: 0,
    },
    ownedDecors: ['purple-craters', 'midnight-hex'],
    equippedDecorId: 'purple-craters',
    ownedFoods: [...DEFAULT_OWNED_FOODS],
    selectedFoods: [...DEFAULT_OWNED_FOODS],
    ownedSpecialDecors: ['none'],
    equippedSpecialDecorId: 'none',
    claimedCollections: [],
    claimedOffers: [],
    dailyStreak: 0,
    lastDailyClaimDate: null,
    lastFreeCoinsAt: 0,
    adsWatchedCount: 0,
    bestScore: 0,
    totalMatches: 0,
    totalKills: 0,
  };
}

export function sanitizeProfile(raw: Partial<PlayerProfile> | null | undefined, playerId = 'default-player'): PlayerProfile {
  const base = createDefaultProfile(playerId);
  if (!raw || typeof raw !== 'object') return base;

  const validSkinIds = new Set(WORM_SKINS.map((s) => s.id));
  const validDecorIds = new Set(ARENA_DECORS.map((d) => d.id));
  const validFoodIds = new Set(FOOD_CATALOG.map((f) => f.id));
  const validSpecialIds = new Set(SPECIAL_DECORS.map((s) => s.id));

  const ownedSkins = Array.isArray(raw.ownedSkins)
    ? Array.from(new Set(['coral-viper', 'mint-cobra', ...raw.ownedSkins.filter((id) => validSkinIds.has(id))]))
    : base.ownedSkins;

  const equippedSkinId =
    typeof raw.equippedSkinId === 'string' && ownedSkins.includes(raw.equippedSkinId)
      ? raw.equippedSkinId
      : base.equippedSkinId;

  const ownedDecors = Array.isArray(raw.ownedDecors)
    ? (Array.from(
        new Set([
          'purple-craters',
          'midnight-hex',
          ...raw.ownedDecors.filter((id) => validDecorIds.has(id as ArenaDecorId)),
        ])
      ) as ArenaDecorId[])
    : base.ownedDecors;

  const equippedDecorId =
    typeof raw.equippedDecorId === 'string' && ownedDecors.includes(raw.equippedDecorId as ArenaDecorId)
      ? (raw.equippedDecorId as ArenaDecorId)
      : base.equippedDecorId;

  const ownedFoods = Array.isArray(raw.ownedFoods)
    ? (Array.from(
        new Set([
          ...DEFAULT_OWNED_FOODS,
          ...raw.ownedFoods.filter((id) => validFoodIds.has(id as FoodItemId)),
        ])
      ) as FoodItemId[])
    : base.ownedFoods;

  const rawSelectedFoods = Array.isArray(raw.selectedFoods)
    ? (Array.from(new Set(raw.selectedFoods.filter((id) => ownedFoods.includes(id as FoodItemId)))) as FoodItemId[])
    : base.selectedFoods;
  const selectedFoods = rawSelectedFoods.length > 0 ? rawSelectedFoods : [...DEFAULT_OWNED_FOODS];

  const ownedSpecialDecors = Array.isArray(raw.ownedSpecialDecors)
    ? (Array.from(
        new Set(['none', ...raw.ownedSpecialDecors.filter((id) => validSpecialIds.has(id as SpecialDecorId))])
      ) as SpecialDecorId[])
    : base.ownedSpecialDecors;

  const equippedSpecialDecorId =
    typeof raw.equippedSpecialDecorId === 'string' &&
    ownedSpecialDecors.includes(raw.equippedSpecialDecorId as SpecialDecorId)
      ? (raw.equippedSpecialDecorId as SpecialDecorId)
      : base.equippedSpecialDecorId;

  const upgrades = { ...base.upgrades };
  if (raw.upgrades && typeof raw.upgrades === 'object') {
    for (const def of POWER_UPS) {
      const val = Number(raw.upgrades[def.id]);
      if (Number.isFinite(val)) {
        upgrades[def.id] = Math.max(0, Math.min(def.maxLevel, Math.floor(val)));
      }
    }
  }

  const controlMode: ControlMode =
    raw.controlMode === 'fixed' || raw.controlMode === 'floating' || raw.controlMode === 'follow'
      ? raw.controlMode
      : 'fixed';

  return {
    playerId,
    playerName:
      typeof raw.playerName === 'string' && raw.playerName.trim().length > 0
        ? raw.playerName.trim().slice(0, 14)
        : 'You',
    controlMode,
    coins: typeof raw.coins === 'number' && Number.isFinite(raw.coins) && raw.coins >= 0 ? Math.floor(raw.coins) : base.coins,
    ownedSkins,
    equippedSkinId,
    upgrades,
    ownedDecors,
    equippedDecorId,
    ownedFoods,
    selectedFoods,
    ownedSpecialDecors,
    equippedSpecialDecorId,
    claimedCollections: Array.isArray(raw.claimedCollections)
      ? Array.from(new Set(raw.claimedCollections.filter((id) => typeof id === 'string')))
      : [],
    claimedOffers: Array.isArray(raw.claimedOffers) ? Array.from(new Set(raw.claimedOffers.filter((id) => typeof id === 'string'))) : [],
    dailyStreak:
      typeof raw.dailyStreak === 'number' && Number.isFinite(raw.dailyStreak) && raw.dailyStreak >= 0
        ? Math.floor(raw.dailyStreak)
        : 0,
    lastDailyClaimDate: typeof raw.lastDailyClaimDate === 'string' ? raw.lastDailyClaimDate : null,
    lastFreeCoinsAt:
      typeof raw.lastFreeCoinsAt === 'number' && Number.isFinite(raw.lastFreeCoinsAt) ? raw.lastFreeCoinsAt : 0,
    adsWatchedCount:
      typeof raw.adsWatchedCount === 'number' && Number.isFinite(raw.adsWatchedCount)
        ? Math.max(0, Math.floor(raw.adsWatchedCount))
        : 0,
    bestScore:
      typeof raw.bestScore === 'number' && Number.isFinite(raw.bestScore) ? Math.max(0, Math.floor(raw.bestScore)) : 0,
    totalMatches:
      typeof raw.totalMatches === 'number' && Number.isFinite(raw.totalMatches)
        ? Math.max(0, Math.floor(raw.totalMatches))
        : 0,
    totalKills:
      typeof raw.totalKills === 'number' && Number.isFinite(raw.totalKills) ? Math.max(0, Math.floor(raw.totalKills)) : 0,
  };
}

export function buySkin(profile: PlayerProfile, skinId: string): ActionResult {
  const skin = WORM_SKINS.find((s) => s.id === skinId);
  if (!skin) {
    return { ok: false, error: 'Skin not found.', profile };
  }
  if (profile.ownedSkins.includes(skinId)) {
    return { ok: false, error: 'Skin already owned.', profile };
  }
  if (profile.coins < skin.price) {
    return { ok: false, error: `Need ${skin.price - profile.coins} more coins.`, profile };
  }

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins - skin.price,
    ownedSkins: [...profile.ownedSkins, skinId],
    equippedSkinId: skinId,
  };
  return { ok: true, profile: next, unlockedItems: [skin.name] };
}

export function equipSkin(profile: PlayerProfile, skinId: string): ActionResult {
  const skin = getSkinById(skinId);
  if (!profile.ownedSkins.includes(skin.id)) {
    return { ok: false, error: 'Purchase this skin before equipping it.', profile };
  }
  return {
    ok: true,
    profile: { ...profile, equippedSkinId: skin.id },
  };
}

export function getNextUpgradePrice(profile: PlayerProfile, powerUpId: PowerUpId): number | null {
  const def = getPowerUpById(powerUpId);
  const currentLevel = profile.upgrades[powerUpId] ?? 0;
  if (currentLevel >= def.maxLevel) return null;
  return def.prices[currentLevel];
}

export function buyUpgrade(profile: PlayerProfile, powerUpId: PowerUpId): ActionResult {
  const def = POWER_UPS.find((p) => p.id === powerUpId);
  if (!def) {
    return { ok: false, error: 'Upgrade not found.', profile };
  }
  const currentLevel = profile.upgrades[powerUpId] ?? 0;
  if (currentLevel >= def.maxLevel) {
    return { ok: false, error: `${def.name} is already at max level.`, profile };
  }
  const price = def.prices[currentLevel];
  if (profile.coins < price) {
    return { ok: false, error: `Need ${price - profile.coins} more coins.`, profile };
  }

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins - price,
    upgrades: {
      ...profile.upgrades,
      [powerUpId]: currentLevel + 1,
    },
  };
  return { ok: true, profile: next, unlockedItems: [`${def.name} Lv.${currentLevel + 1}`] };
}

export function buyDecor(profile: PlayerProfile, decorId: ArenaDecorId): ActionResult {
  const decor = ARENA_DECORS.find((d) => d.id === decorId);
  if (!decor) {
    return { ok: false, error: 'Arena decor not found.', profile };
  }
  if (profile.ownedDecors.includes(decorId)) {
    return { ok: false, error: 'Arena decor already owned.', profile };
  }
  if (profile.coins < decor.price) {
    return { ok: false, error: `Need ${decor.price - profile.coins} more coins.`, profile };
  }

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins - decor.price,
    ownedDecors: [...profile.ownedDecors, decorId],
    equippedDecorId: decorId,
  };
  return { ok: true, profile: next, unlockedItems: [decor.name] };
}

export function equipDecor(profile: PlayerProfile, decorId: ArenaDecorId): ActionResult {
  const decor = getDecorById(decorId);
  if (!profile.ownedDecors.includes(decor.id)) {
    return { ok: false, error: 'Unlock this arena decor before selecting it.', profile };
  }
  return {
    ok: true,
    profile: { ...profile, equippedDecorId: decor.id },
  };
}

export function buyFood(profile: PlayerProfile, foodId: FoodItemId): ActionResult {
  const food = FOOD_CATALOG.find((f) => f.id === foodId);
  if (!food) {
    return { ok: false, error: 'Food item not found.', profile };
  }
  if (profile.ownedFoods.includes(foodId)) {
    return { ok: false, error: 'Food item already owned.', profile };
  }
  if (profile.coins < food.price) {
    return { ok: false, error: `Need ${food.price - profile.coins} more coins.`, profile };
  }

  const nextSelected = profile.selectedFoods.includes(foodId)
    ? profile.selectedFoods
    : [...profile.selectedFoods, foodId];

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins - food.price,
    ownedFoods: [...profile.ownedFoods, foodId],
    selectedFoods: nextSelected,
  };
  return { ok: true, profile: next, unlockedItems: [food.name] };
}

export function toggleFoodSelection(
  profile: PlayerProfile,
  foodId: FoodItemId,
  mode: 'toggle' | 'add' | 'solo' = 'toggle'
): ActionResult {
  const food = getFoodById(foodId);
  if (!profile.ownedFoods.includes(food.id)) {
    return { ok: false, error: 'Purchase this food item first.', profile };
  }

  const currentlySelected = profile.selectedFoods.includes(food.id);
  let nextSelected: FoodItemId[];

  if (mode === 'solo') {
    nextSelected = [food.id];
  } else if (mode === 'add') {
    nextSelected = currentlySelected ? profile.selectedFoods : [...profile.selectedFoods, food.id];
  } else {
    if (currentlySelected) {
      if (profile.selectedFoods.length <= 1) {
        return { ok: false, error: 'Keep at least 1 food type active in the arena.', profile };
      }
      nextSelected = profile.selectedFoods.filter((id) => id !== food.id);
    } else {
      nextSelected = [...profile.selectedFoods, food.id];
    }
  }

  return {
    ok: true,
    profile: { ...profile, selectedFoods: nextSelected },
  };
}

export function selectAllOwnedFoods(profile: PlayerProfile): ActionResult {
  return {
    ok: true,
    profile: { ...profile, selectedFoods: [...profile.ownedFoods] },
  };
}

export function buySpecialDecor(profile: PlayerProfile, specialDecorId: SpecialDecorId): ActionResult {
  const def = SPECIAL_DECORS.find((d) => d.id === specialDecorId);
  if (!def) {
    return { ok: false, error: 'Special decoration not found.', profile };
  }
  if (profile.ownedSpecialDecors.includes(specialDecorId)) {
    return { ok: false, error: 'Decoration already owned.', profile };
  }
  if (profile.coins < def.price) {
    return { ok: false, error: `Need ${def.price - profile.coins} more coins.`, profile };
  }
  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins - def.price,
    ownedSpecialDecors: [...profile.ownedSpecialDecors, specialDecorId],
    equippedSpecialDecorId: specialDecorId,
  };
  return { ok: true, profile: next, unlockedItems: [def.name] };
}

export function equipSpecialDecor(profile: PlayerProfile, specialDecorId: SpecialDecorId): ActionResult {
  const def = getSpecialDecorById(specialDecorId);
  if (!profile.ownedSpecialDecors.includes(def.id)) {
    return { ok: false, error: 'Unlock this decoration first.', profile };
  }
  return {
    ok: true,
    profile: { ...profile, equippedSpecialDecorId: def.id },
  };
}

export function getCollectionProgress(profile: PlayerProfile, kind: 'skins' | 'foods' | 'decors' | 'special'): number {
  if (kind === 'skins') return profile.ownedSkins.length;
  if (kind === 'foods') return profile.ownedFoods.length;
  if (kind === 'decors') return profile.ownedDecors.length;
  return profile.ownedSpecialDecors.filter((id) => id !== 'none').length;
}

export function claimCollectionGoal(profile: PlayerProfile, goalId: string): ActionResult {
  const goal = COLLECTION_GOALS.find((g) => g.id === goalId);
  if (!goal) {
    return { ok: false, error: 'Collection goal not found.', profile };
  }
  if (profile.claimedCollections.includes(goalId)) {
    return { ok: false, error: 'Collection reward already claimed.', profile };
  }
  const current = getCollectionProgress(profile, goal.kind);
  if (current < goal.target) {
    return { ok: false, error: `Collect ${goal.target - current} more to claim.`, profile };
  }
  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins + goal.rewardCoins,
    claimedCollections: [...profile.claimedCollections, goalId],
  };
  return { ok: true, profile: next, coinsAwarded: goal.rewardCoins };
}

export function canClaimDailyReward(profile: PlayerProfile, nowMs = Date.now()): boolean {
  const today = getUtcDayString(nowMs);
  return profile.lastDailyClaimDate !== today;
}

export function claimDailyReward(profile: PlayerProfile, nowMs = Date.now()): ActionResult {
  const today = getUtcDayString(nowMs);
  if (profile.lastDailyClaimDate === today) {
    return { ok: false, error: 'Daily reward already claimed today.', profile };
  }

  const nextStreak = (profile.dailyStreak % DAILY_REWARDS.length) + 1;
  const step = DAILY_REWARDS[nextStreak - 1];
  const unlockedItems: string[] = [];
  let nextOwnedSkins = profile.ownedSkins;

  if (step.bonusSkinId && !nextOwnedSkins.includes(step.bonusSkinId)) {
    nextOwnedSkins = [...nextOwnedSkins, step.bonusSkinId];
    unlockedItems.push(getSkinById(step.bonusSkinId).name);
  }

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins + step.coins,
    dailyStreak: nextStreak,
    lastDailyClaimDate: today,
    ownedSkins: nextOwnedSkins,
  };
  return { ok: true, profile: next, coinsAwarded: step.coins, unlockedItems };
}

export function getFreeCoinsCooldownRemainingMs(profile: PlayerProfile, nowMs = Date.now()): number {
  if (!profile.lastFreeCoinsAt) return 0;
  return Math.max(0, profile.lastFreeCoinsAt + FREE_COINS_COOLDOWN_MS - nowMs);
}

export function claimFreeCoins(profile: PlayerProfile, nowMs = Date.now()): ActionResult {
  const remaining = getFreeCoinsCooldownRemainingMs(profile, nowMs);
  if (remaining > 0) {
    const secs = Math.ceil(remaining / 1000);
    return { ok: false, error: `Free coins ready in ${secs}s.`, profile };
  }

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins + FREE_COINS_AMOUNT,
    lastFreeCoinsAt: nowMs,
  };
  return { ok: true, profile: next, coinsAwarded: FREE_COINS_AMOUNT };
}

export function claimAdReward(profile: PlayerProfile): ActionResult {
  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins + AD_REWARD_COINS,
    adsWatchedCount: profile.adsWatchedCount + 1,
  };
  return { ok: true, profile: next, coinsAwarded: AD_REWARD_COINS };
}

export function buySpecialOffer(profile: PlayerProfile, offerId: string): ActionResult {
  const offer = SPECIAL_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    return { ok: false, error: 'Offer not found.', profile };
  }
  if (profile.claimedOffers.includes(offerId)) {
    return { ok: false, error: 'Offer already purchased.', profile };
  }
  if (profile.coins < offer.price) {
    return { ok: false, error: `Need ${offer.price - profile.coins} more coins.`, profile };
  }

  const nextSkins = [...profile.ownedSkins];
  const unlockedItems: string[] = [];
  for (const sid of offer.skinIds) {
    if (!nextSkins.includes(sid)) {
      nextSkins.push(sid);
    }
    unlockedItems.push(getSkinById(sid).name);
  }

  const nextDecors = [...profile.ownedDecors];
  if (offer.decorId && !nextDecors.includes(offer.decorId)) {
    nextDecors.push(offer.decorId);
    unlockedItems.push(getDecorById(offer.decorId).name);
  }

  const nextUpgrades = { ...profile.upgrades };
  if (offer.upgradeBoosts) {
    for (const [key, levels] of Object.entries(offer.upgradeBoosts)) {
      const pid = key as PowerUpId;
      const def = getPowerUpById(pid);
      nextUpgrades[pid] = Math.min(def.maxLevel, (nextUpgrades[pid] ?? 0) + (levels ?? 0));
      unlockedItems.push(`${def.name} Lv.${nextUpgrades[pid]}`);
    }
  }

  const bonusCoins = offer.bonusCoins ?? 0;
  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins - offer.price + bonusCoins,
    ownedSkins: nextSkins,
    equippedSkinId: offer.skinIds[0] ?? profile.equippedSkinId,
    ownedDecors: nextDecors,
    equippedDecorId: offer.decorId ?? profile.equippedDecorId,
    upgrades: nextUpgrades,
    claimedOffers: [...profile.claimedOffers, offerId],
  };

  return { ok: true, profile: next, coinsAwarded: bonusCoins, unlockedItems };
}

export function computeMatchCoins(score: number, kills: number, multiplierLevel = 0): number {
  const safeScore = Math.max(0, Math.floor(score));
  const safeKills = Math.max(0, Math.floor(kills));
  const baseCoins = Math.max(10, Math.floor(safeScore / 10) + safeKills * 30);
  const multBonus = 1 + Math.max(0, multiplierLevel) * 0.12;
  return Math.round(baseCoins * multBonus);
}

export function recordMatchResult(
  profile: PlayerProfile,
  result: { score: number; kills: number; survivalSeconds?: number }
): ActionResult {
  const safeScore = Math.max(0, Math.floor(result.score || 0));
  const safeKills = Math.max(0, Math.floor(result.kills || 0));
  const multLevel = profile.upgrades.multiplier ?? 0;
  const coinsEarned = computeMatchCoins(safeScore, safeKills, multLevel);

  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins + coinsEarned,
    bestScore: Math.max(profile.bestScore, safeScore),
    totalMatches: profile.totalMatches + 1,
    totalKills: profile.totalKills + safeKills,
  };
  return { ok: true, profile: next, coinsAwarded: coinsEarned };
}
