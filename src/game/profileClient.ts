import type { ArenaDecorId, ControlMode, FoodItemId, PlayerProfile, PowerUpId, SpecialDecorId } from './types';
import { createDefaultProfile, sanitizeProfile, type ActionResult } from './workshopLogic';

const PLAYER_ID_KEY = 'wormz_arena_player_id_v1';
const PROFILE_CACHE_KEY = 'wormz_arena_profile_cache_v1';

export function getOrCreatePlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{4,48}$/.test(existing)) {
      return existing;
    }
    const created = `worm_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(PLAYER_ID_KEY, created);
    return created;
  } catch {
    return 'default-player';
  }
}

export function loadCachedProfile(): PlayerProfile {
  const playerId = getOrCreatePlayerId();
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      return sanitizeProfile(parsed, playerId);
    }
  } catch {
    // Ignore storage read errors
  }
  return createDefaultProfile(playerId);
}

export function saveCachedProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore quota errors
  }
}

async function apiRequest<T extends { ok: boolean; profile?: PlayerProfile; error?: string }>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown
): Promise<T> {
  const playerId = getOrCreatePlayerId();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-player-id': playerId,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as T;
  if (data.profile) {
    saveCachedProfile(data.profile);
  }
  return data;
}

export async function fetchProfileFromBackend(): Promise<PlayerProfile> {
  try {
    const res = await apiRequest<{ ok: boolean; profile: PlayerProfile }>('/api/profile', 'GET');
    if (res.ok && res.profile) {
      return res.profile;
    }
  } catch {
    // Fallback to cached profile if offline
  }
  return loadCachedProfile();
}

export async function syncSettingsToBackend(settings: {
  playerName?: string;
  controlMode?: ControlMode;
}): Promise<PlayerProfile | null> {
  try {
    const res = await apiRequest<{ ok: boolean; profile: PlayerProfile }>(
      '/api/profile/settings',
      'PATCH',
      settings
    );
    return res.ok ? res.profile : null;
  } catch {
    return null;
  }
}

export async function apiBuySkin(skinId: string): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/buy-skin', 'POST', { skinId });
}

export async function apiEquipSkin(skinId: string): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/equip-skin', 'POST', { skinId });
}

export async function apiBuyUpgrade(powerUpId: PowerUpId): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/buy-upgrade', 'POST', { powerUpId });
}

export async function apiBuyDecor(decorId: ArenaDecorId): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/buy-decor', 'POST', { decorId });
}

export async function apiEquipDecor(decorId: ArenaDecorId): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/equip-decor', 'POST', { decorId });
}

export async function apiClaimDailyReward(): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/claim-daily', 'POST', {});
}

export async function apiClaimFreeCoins(): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/claim-free-coins', 'POST', {});
}

export async function apiClaimAdReward(): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/claim-ad-reward', 'POST', {});
}

export async function apiBuySpecialOffer(offerId: string): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/buy-offer', 'POST', { offerId });
}

export async function apiBuyFood(foodId: FoodItemId): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/buy-food', 'POST', { foodId });
}

export async function apiToggleFood(
  foodId: FoodItemId,
  mode: 'toggle' | 'add' | 'solo' = 'toggle'
): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/toggle-food', 'POST', { foodId, mode });
}

export async function apiSelectAllFoods(): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/select-all-foods', 'POST', {});
}

export async function apiBuySpecialDecor(specialDecorId: SpecialDecorId): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/buy-special-decor', 'POST', { specialDecorId });
}

export async function apiEquipSpecialDecor(specialDecorId: SpecialDecorId): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/equip-special-decor', 'POST', { specialDecorId });
}

export async function apiClaimCollectionGoal(goalId: string): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/workshop/claim-collection', 'POST', { goalId });
}

export async function apiRecordMatchResult(result: {
  score: number;
  kills: number;
  survivalSeconds: number;
}): Promise<ActionResult> {
  return apiRequest<ActionResult>('/api/profile/match-result', 'POST', result);
}
