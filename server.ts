import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type {
  ArenaDecorId,
  ControlMode,
  FoodItemId,
  PlayerProfile,
  PowerUpId,
  SpecialDecorId,
} from './src/game/types.ts';
import {
  buyDecor,
  buyFood,
  buySkin,
  buySpecialDecor,
  buySpecialOffer,
  buyUpgrade,
  claimAdReward,
  claimCollectionGoal,
  claimDailyReward,
  claimFreeCoins,
  createDefaultProfile,
  equipDecor,
  equipSkin,
  equipSpecialDecor,
  recordMatchResult,
  sanitizeProfile,
  selectAllOwnedFoods,
  toggleFoodSelection,
} from './src/game/workshopLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '.data');
const PROFILES_FILE = path.join(DATA_DIR, 'player-profiles.json');
const PORT = Number(process.env.PORT || 3000);

function ensureDataFile(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILES_FILE)) {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

function readAllProfiles(): Record<string, PlayerProfile> {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, PlayerProfile>;
    }
  } catch {
    // Recover gracefully if file was partially written
  }
  return {};
}

function writeAllProfiles(store: Record<string, PlayerProfile>): void {
  ensureDataFile();
  const tmpFile = `${PROFILES_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpFile, PROFILES_FILE);
}

function getPlayerId(req: express.Request): string {
  const headerId = req.header('x-player-id') || (typeof req.query.playerId === 'string' ? req.query.playerId : '');
  const cleaned = headerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  return cleaned.length > 0 ? cleaned : 'default-player';
}

function loadProfile(playerId: string): PlayerProfile {
  const store = readAllProfiles();
  if (!store[playerId]) {
    const created = createDefaultProfile(playerId);
    store[playerId] = created;
    writeAllProfiles(store);
    return created;
  }
  return sanitizeProfile(store[playerId], playerId);
}

function saveProfile(profile: PlayerProfile): PlayerProfile {
  const store = readAllProfiles();
  const clean = sanitizeProfile(profile, profile.playerId);
  store[clean.playerId] = clean;
  writeAllProfiles(store);
  return clean;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/profile', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    res.json({ ok: true, profile });
  });

  app.patch('/api/profile/settings', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { playerName, controlMode } = req.body as {
      playerName?: string;
      controlMode?: ControlMode;
    };
    const next: PlayerProfile = {
      ...profile,
      playerName:
        typeof playerName === 'string' && playerName.trim().length > 0
          ? playerName.trim().slice(0, 14)
          : profile.playerName,
      controlMode:
        controlMode === 'fixed' || controlMode === 'floating' || controlMode === 'follow'
          ? controlMode
          : profile.controlMode,
    };
    const saved = saveProfile(next);
    res.json({ ok: true, profile: saved });
  });

  app.post('/api/workshop/buy-skin', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { skinId } = req.body as { skinId?: string };
    if (!skinId) {
      res.status(400).json({ ok: false, error: 'skinId is required', profile });
      return;
    }
    const result = buySkin(profile, skinId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/equip-skin', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { skinId } = req.body as { skinId?: string };
    if (!skinId) {
      res.status(400).json({ ok: false, error: 'skinId is required', profile });
      return;
    }
    const result = equipSkin(profile, skinId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/buy-upgrade', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { powerUpId } = req.body as { powerUpId?: PowerUpId };
    if (!powerUpId) {
      res.status(400).json({ ok: false, error: 'powerUpId is required', profile });
      return;
    }
    const result = buyUpgrade(profile, powerUpId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/buy-decor', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { decorId } = req.body as { decorId?: ArenaDecorId };
    if (!decorId) {
      res.status(400).json({ ok: false, error: 'decorId is required', profile });
      return;
    }
    const result = buyDecor(profile, decorId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/equip-decor', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { decorId } = req.body as { decorId?: ArenaDecorId };
    if (!decorId) {
      res.status(400).json({ ok: false, error: 'decorId is required', profile });
      return;
    }
    const result = equipDecor(profile, decorId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/buy-food', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { foodId } = req.body as { foodId?: FoodItemId };
    if (!foodId) {
      res.status(400).json({ ok: false, error: 'foodId is required', profile });
      return;
    }
    const result = buyFood(profile, foodId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/toggle-food', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { foodId, mode } = req.body as { foodId?: FoodItemId; mode?: 'toggle' | 'add' | 'solo' };
    if (!foodId) {
      res.status(400).json({ ok: false, error: 'foodId is required', profile });
      return;
    }
    const result = toggleFoodSelection(profile, foodId, mode ?? 'toggle');
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/select-all-foods', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const result = selectAllOwnedFoods(profile);
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/buy-special-decor', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { specialDecorId } = req.body as { specialDecorId?: SpecialDecorId };
    if (!specialDecorId) {
      res.status(400).json({ ok: false, error: 'specialDecorId is required', profile });
      return;
    }
    const result = buySpecialDecor(profile, specialDecorId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/equip-special-decor', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { specialDecorId } = req.body as { specialDecorId?: SpecialDecorId };
    if (!specialDecorId) {
      res.status(400).json({ ok: false, error: 'specialDecorId is required', profile });
      return;
    }
    const result = equipSpecialDecor(profile, specialDecorId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/claim-collection', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { goalId } = req.body as { goalId?: string };
    if (!goalId) {
      res.status(400).json({ ok: false, error: 'goalId is required', profile });
      return;
    }
    const result = claimCollectionGoal(profile, goalId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/claim-daily', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const result = claimDailyReward(profile, Date.now());
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/claim-free-coins', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const result = claimFreeCoins(profile, Date.now());
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/claim-ad-reward', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const result = claimAdReward(profile);
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/workshop/buy-offer', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { offerId } = req.body as { offerId?: string };
    if (!offerId) {
      res.status(400).json({ ok: false, error: 'offerId is required', profile });
      return;
    }
    const result = buySpecialOffer(profile, offerId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  app.post('/api/profile/match-result', (req, res) => {
    const playerId = getPlayerId(req);
    const profile = loadProfile(playerId);
    const { score, kills, survivalSeconds } = req.body as {
      score?: number;
      kills?: number;
      survivalSeconds?: number;
    };
    const result = recordMatchResult(profile, {
      score: Number(score) || 0,
      kills: Number(kills) || 0,
      survivalSeconds: Number(survivalSeconds) || 0,
    });
    const saved = saveProfile(result.profile);
    res.json({ ...result, profile: saved });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wormz Arena server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
