/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import { WorkshopModal, type WorkshopTab } from './components/WorkshopModal';
import { GameEngine } from './game/engine';
import { getLandscapeViewport, toLogicalDelta, type LandscapeViewport } from './game/orientation';
import {
  apiBuyDecor,
  apiBuyFood,
  apiBuySkin,
  apiBuySpecialDecor,
  apiBuySpecialOffer,
  apiBuyUpgrade,
  apiClaimAdReward,
  apiClaimCollectionGoal,
  apiClaimDailyReward,
  apiClaimFreeCoins,
  apiEquipDecor,
  apiEquipSkin,
  apiEquipSpecialDecor,
  apiRecordMatchResult,
  apiSelectAllFoods,
  apiToggleFood,
  fetchProfileFromBackend,
  loadCachedProfile,
  saveCachedProfile,
  syncSettingsToBackend,
} from './game/profileClient';
import { ArenaRenderer, getViewportZoomScale } from './game/renderer';
import type {
  ArenaDecorId,
  ControlMode,
  FoodItemId,
  GameOverStats,
  GamePhase,
  HudSnapshot,
  InputState,
  PlayerProfile,
  PowerUpId,
  SpecialDecorId,
} from './game/types';
import type { ActionResult } from './game/workshopLogic';

const CONTROL_MODE_STORAGE_KEY = 'wormz_arena_control_mode_v1';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  bestScore: 0,
  length: 14,
  kills: 0,
  rank: 1,
  totalWorms: 11,
  canBoost: true,
  isBoosting: false,
  boostMeter: 0.4,
  combo: 0,
  survivalSeconds: 0,
  leaderboard: [],
  killBanner: null,
  activePowerUps: [],
  scoreMultiplier: 1,
};

function getInitialStageViewport(): LandscapeViewport {
  if (typeof window === 'undefined') {
    return { logicalW: 844, logicalH: 390, forceRotated: false, isCompact: true };
  }
  return getLandscapeViewport(window.innerWidth, window.innerHeight);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputState>({
    pointerActive: false,
    pointerAngle: 0,
    joystickActive: false,
    joystickAngle: 0,
    joystickMagnitude: 0,
    keysHeld: new Set<string>(),
    boostHeld: false,
  });
  const pointerOffsetRef = useRef<{ x: number; y: number; hasPos: boolean }>({
    x: 0,
    y: 0,
    hasPos: false,
  });

  const [profile, setProfile] = useState<PlayerProfile>(() => loadCachedProfile());
  const profileRef = useRef<PlayerProfile>(profile);
  const controlModeRef = useRef<ControlMode>(profile.controlMode);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [workshopOpen, setWorkshopOpen] = useState<boolean>(false);
  const [workshopInitialTab, setWorkshopInitialTab] = useState<WorkshopTab>('skins');
  const workshopOpenRef = useRef<boolean>(false);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [stageViewport, setStageViewport] = useState<LandscapeViewport>(getInitialStageViewport);
  const forceRotatedRef = useRef<boolean>(stageViewport.forceRotated);
  const nameSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    workshopOpenRef.current = workshopOpen;
  }, [workshopOpen]);

  const applyProfileToEngine = useCallback((nextProfile: PlayerProfile) => {
    profileRef.current = nextProfile;
    controlModeRef.current = nextProfile.controlMode;
    saveCachedProfile(nextProfile);

    const engine = engineRef.current;
    if (!engine) return;
    engine.setPlayerSkin(nextProfile.equippedSkinId);
    engine.setDecorId(nextProfile.equippedDecorId);
    engine.setSelectedFoods(nextProfile.selectedFoods);
    engine.setSpecialDecorId(nextProfile.equippedSpecialDecorId);
    engine.setUpgrades(nextProfile.upgrades);
    engine.setPlayerName(nextProfile.playerName);
    if (nextProfile.bestScore > engine.bestScore) {
      engine.bestScore = nextProfile.bestScore;
    }
  }, []);

  const updateProfileState = useCallback(
    (nextProfile: PlayerProfile) => {
      setProfile(nextProfile);
      applyProfileToEngine(nextProfile);
    },
    [applyProfileToEngine]
  );

  const syncBodyState = useCallback((nextPhase: GamePhase) => {
    document.body.dataset.state = nextPhase;
    setPhase(nextPhase);
  }, []);

  const clearInputs = useCallback(() => {
    const inp = inputRef.current;
    inp.keysHeld.clear();
    inp.boostHeld = false;
    inp.pointerActive = false;
    inp.joystickActive = false;
    inp.joystickMagnitude = 0;
    pointerOffsetRef.current.hasPos = false;
  }, []);

  const handleOpenWorkshop = useCallback((tab: WorkshopTab = 'skins') => {
    setWorkshopInitialTab(tab);
    setWorkshopOpen(true);
  }, []);

  const handleCloseWorkshop = useCallback(() => {
    setWorkshopOpen(false);
  }, []);

  const handleStartGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setWorkshopOpen(false);
    clearInputs();
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (lockType: string) => Promise<void>;
      };
      orientation?.lock?.('landscape')?.catch?.(() => {});
    } catch {
      // Orientation lock is optional and unsupported on desktop/some webviews
    }
    const current = profileRef.current;
    engine.setPlayerSkin(current.equippedSkinId);
    engine.setDecorId(current.equippedDecorId);
    engine.setSelectedFoods(current.selectedFoods);
    engine.setSpecialDecorId(current.equippedSpecialDecorId);
    engine.setUpgrades(current.upgrades);
    engine.setPlayerName(current.playerName);
    engine.startGame();
    setGameOverStats(null);
    setHud(engine.getHudSnapshot());
    syncBodyState('playing');
    canvasRef.current?.focus();
  }, [clearInputs, syncBodyState]);

  const handlePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.phase !== 'playing') return;
    clearInputs();
    engine.pauseGame();
    syncBodyState('paused');
  }, [clearInputs, syncBodyState]);

  const handleResume = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.phase !== 'paused') return;
    clearInputs();
    engine.resumeGame();
    syncBodyState('playing');
    canvasRef.current?.focus();
  }, [clearInputs, syncBodyState]);

  const handleReturnToTitle = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    clearInputs();
    setWorkshopOpen(false);
    engine.returnToTitle();
    setGameOverStats(null);
    setHud((prev) => ({
      ...prev,
      bestScore: Math.max(Math.round(engine.bestScore), profileRef.current.bestScore),
    }));
    syncBodyState('title');
  }, [clearInputs, syncBodyState]);

  // Mount Canvas, Engine, Renderer & 60fps loop once + hydrate backend profile
  useEffect(() => {
    const renderer = new ArenaRenderer();

    const initialProfile = profileRef.current;

    const engine = new GameEngine({
      onDeath: (_isPlayer, deathEvent) => {
        engine.triggerExplosion(deathEvent);
      },
      onPhaseChange: (nextPhase, stats) => {
        if (nextPhase === 'gameover' && stats) {
          setGameOverStats(stats);
          clearInputs();

          // Persist coins & match stats to backend without ever resetting existing coins
          apiRecordMatchResult({
            score: stats.finalScore,
            kills: stats.kills,
            survivalSeconds: stats.survivalSeconds,
          })
            .then((res) => {
              if (res.ok && res.profile) {
                updateProfileState(res.profile);
                setGameOverStats((prev) =>
                  prev
                    ? {
                        ...prev,
                        coinsEarned: res.coinsAwarded ?? prev.coinsEarned,
                        bestScore: Math.max(prev.bestScore, res.profile.bestScore),
                      }
                    : prev
                );
              }
            })
            .catch(() => {
              // Offline fallback: keep local stats intact
            });
        }
        syncBodyState(nextPhase);
      },
    });
    engineRef.current = engine;
    applyProfileToEngine(initialProfile);

    // Sync persisted profile from Express backend on mount
    fetchProfileFromBackend().then((serverProfile) => {
      updateProfileState(serverProfile);
      if (engine.phase === 'title') {
        setHud((prev) => ({
          ...prev,
          bestScore: Math.max(Math.round(engine.bestScore), serverProfile.bestScore),
        }));
      }
    });

    setHud(engine.getHudSnapshot());

    // Handle ?autostart=1 or ?workshop=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame();
      syncBodyState('playing');
      setHud(engine.getHudSnapshot());
    } else {
      syncBodyState('title');
      if (params.get('workshop') === '1') {
        setWorkshopOpen(true);
      }
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const initialVp = getLandscapeViewport(window.innerWidth, window.innerHeight);
    let viewW = initialVp.logicalW;
    let viewH = initialVp.logicalH;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let needsStaticRender = true;
    let lastPhase: GamePhase = engine.phase;

    let prevForceRotated = initialVp.forceRotated;
    let orientationTimerId: number | null = null;

    const resizeCanvas = () => {
      const physW = window.innerWidth;
      const physH = window.innerHeight;
      const vp = getLandscapeViewport(physW, physH);
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetCanvasW = Math.max(1, Math.floor(vp.logicalW * nextDpr));
      const targetCanvasH = Math.max(1, Math.floor(vp.logicalH * nextDpr));

      viewW = vp.logicalW;
      viewH = vp.logicalH;
      dpr = nextDpr;
      forceRotatedRef.current = vp.forceRotated;

      if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
        canvas.width = targetCanvasW;
        canvas.height = targetCanvasH;
      }

      if (vp.forceRotated !== prevForceRotated) {
        prevForceRotated = vp.forceRotated;
        clearInputs();
      }

      document.body.dataset.orientation = 'landscape';
      document.body.dataset.rotated = vp.forceRotated ? '90' : '0';

      setStageViewport((prev) =>
        prev.logicalW === vp.logicalW &&
        prev.logicalH === vp.logicalH &&
        prev.forceRotated === vp.forceRotated &&
        prev.isCompact === vp.isCompact
          ? prev
          : vp
      );

      renderer.render(ctx, engine, vp.logicalW, vp.logicalH, dpr);
      needsStaticRender = false;
    };

    const handleOrientationChange = () => {
      resizeCanvas();
      if (orientationTimerId !== null) {
        window.clearTimeout(orientationTimerId);
      }
      orientationTimerId = window.setTimeout(() => {
        orientationTimerId = null;
        resizeCanvas();
      }, 120);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.visualViewport?.addEventListener('resize', resizeCanvas);

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      if (engine.phase !== lastPhase) {
        lastPhase = engine.phase;
        needsStaticRender = true;
      }

      if (engine.phase === 'title' || engine.phase === 'playing') {
        if (engine.phase === 'playing' && inputRef.current.pointerActive && pointerOffsetRef.current.hasPos) {
          const player = engine.getPlayer();
          if (player && player.alive) {
            const mobileScale = getViewportZoomScale(viewW, viewH);
            const zoom = engine.cameraZoom * mobileScale;
            const headScreenX = (player.x - engine.cameraX) * zoom;
            const headScreenY = (player.y - engine.cameraY) * zoom;
            const dx = pointerOffsetRef.current.x - headScreenX;
            const dy = pointerOffsetRef.current.y - headScreenY;
            if (dx * dx + dy * dy > 144) {
              inputRef.current.pointerAngle = Math.atan2(dy, dx);
            }
          }
        }
        engine.update(rawDt, inputRef.current);
        renderer.render(ctx, engine, viewW, viewH, dpr);
        needsStaticRender = true;
      } else if (needsStaticRender) {
        renderer.render(ctx, engine, viewW, viewH, dpr);
        needsStaticRender = false;
      }

      hudSyncAccum += rawDt;
      if (hudSyncAccum >= 0.2 && engine.phase === 'playing') {
        hudSyncAccum = 0;
        setHud(engine.getHudSnapshot());
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      if (orientationTimerId !== null) {
        window.clearTimeout(orientationTimerId);
      }
      if (nameSyncTimerRef.current !== null) {
        window.clearTimeout(nameSyncTimerRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', resizeCanvas);
    };
  }, [applyProfileToEngine, clearInputs, syncBodyState, updateProfileState]);

  // Global keyboard, blur, and visibility listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if (workshopOpenRef.current) {
        if (e.code === 'Escape') {
          e.preventDefault();
          handleCloseWorkshop();
        }
        return;
      }

      const currentPhase = engineRef.current?.phase;

      if (currentPhase === 'title') {
        if ((e.code === 'Enter' || e.code === 'Space') && !isTextInput) {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (currentPhase === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (currentPhase === 'playing') handlePause();
        else if (currentPhase === 'paused') handleResume();
        return;
      }

      if (currentPhase === 'playing') {
        if (
          e.code === 'Space' ||
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight'
        ) {
          e.preventDefault();
        }
        if (
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight' ||
          e.code === 'KeyW' ||
          e.code === 'KeyA' ||
          e.code === 'KeyS' ||
          e.code === 'KeyD'
        ) {
          inputRef.current.pointerActive = false;
        }
        inputRef.current.keysHeld.add(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keysHeld.delete(e.code);
    };

    const onWindowBlur = () => {
      clearInputs();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearInputs();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearInputs, handleCloseWorkshop, handlePause, handleResume, handleStartGame]);

  // Canvas pointer steering & touch drag fallback (90-degree aware)
  const updatePointerAngle = (clientX: number, clientY: number) => {
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    const { dx, dy } = toLogicalDelta(clientX - cx, clientY - cy, forceRotatedRef.current);
    pointerOffsetRef.current.x = dx;
    pointerOffsetRef.current.y = dy;
    pointerOffsetRef.current.hasPos = true;
    inputRef.current.pointerActive = true;
    if (dx * dx + dy * dy > 144) {
      inputRef.current.pointerAngle = Math.atan2(dy, dx);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (engineRef.current?.phase !== 'playing') return;
    if (controlModeRef.current !== 'follow') return;
    updatePointerAngle(e.clientX, e.clientY);
    if (e.pointerType === 'mouse' && e.button === 0) {
      inputRef.current.boostHeld = true;
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (engineRef.current?.phase !== 'playing') return;
    if (controlModeRef.current !== 'follow') return;
    if (e.pointerType === 'mouse' || e.buttons > 0) {
      updatePointerAngle(e.clientX, e.clientY);
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse') {
      inputRef.current.boostHeld = false;
    }
  };

  const handleJoystickChange = useCallback((active: boolean, angle: number, magnitude: number) => {
    inputRef.current.joystickActive = active;
    inputRef.current.joystickAngle = angle;
    inputRef.current.joystickMagnitude = magnitude;
  }, []);

  const handleBoostChange = useCallback((active: boolean) => {
    inputRef.current.boostHeld = active;
  }, []);

  // Generic backend-synced workshop action runner
  const runWorkshopCall = useCallback(
    async (
      call: () => Promise<ActionResult>,
      _chime = true
    ): Promise<{ ok: boolean; error?: string; coinsAwarded?: number }> => {
      try {
        const res = await call();
        if (res.ok && res.profile) {
          updateProfileState(res.profile);
          return { ok: true, coinsAwarded: res.coinsAwarded };
        }
        return { ok: false, error: res.error || 'Action failed.' };
      } catch {
        return { ok: false, error: 'Server sync failed.' };
      }
    },
    [updateProfileState]
  );

  const handleSelectSkin = useCallback(
    (skinId: string) => {
      const optimistic: PlayerProfile = { ...profileRef.current, equippedSkinId: skinId };
      updateProfileState(optimistic);
      apiEquipSkin(skinId)
        .then((res) => {
          if (res.ok && res.profile) {
            updateProfileState(res.profile);
          }
        })
        .catch(() => {});
    },
    [updateProfileState]
  );

  const handleSelectControlMode = useCallback(
    (mode: ControlMode) => {
      controlModeRef.current = mode;
      inputRef.current.joystickActive = false;
      inputRef.current.joystickMagnitude = 0;
      inputRef.current.pointerActive = false;
      pointerOffsetRef.current.hasPos = false;
      try {
        localStorage.setItem(CONTROL_MODE_STORAGE_KEY, mode);
      } catch {
        // Ignore storage errors
      }
      const next: PlayerProfile = { ...profileRef.current, controlMode: mode };
      updateProfileState(next);
      syncSettingsToBackend({ controlMode: mode }).then((saved) => {
        if (saved) updateProfileState(saved);
      });
    },
    [updateProfileState]
  );

  const handleChangeName = useCallback(
    (name: string) => {
      const next: PlayerProfile = { ...profileRef.current, playerName: name };
      updateProfileState(next);
      if (nameSyncTimerRef.current !== null) {
        window.clearTimeout(nameSyncTimerRef.current);
      }
      nameSyncTimerRef.current = window.setTimeout(() => {
        nameSyncTimerRef.current = null;
        syncSettingsToBackend({ playerName: name }).then((saved) => {
          if (saved) updateProfileState(saved);
        });
      }, 300);
    },
    [updateProfileState]
  );

  const handleBuySkin = useCallback(
    (skinId: string) => runWorkshopCall(() => apiBuySkin(skinId), true),
    [runWorkshopCall]
  );
  const handleEquipSkin = useCallback(
    (skinId: string) => runWorkshopCall(() => apiEquipSkin(skinId), false),
    [runWorkshopCall]
  );
  const handleBuyUpgrade = useCallback(
    (powerUpId: PowerUpId) => runWorkshopCall(() => apiBuyUpgrade(powerUpId), true),
    [runWorkshopCall]
  );
  const handleBuyDecor = useCallback(
    (decorId: ArenaDecorId) => runWorkshopCall(() => apiBuyDecor(decorId), true),
    [runWorkshopCall]
  );
  const handleEquipDecor = useCallback(
    (decorId: ArenaDecorId) => runWorkshopCall(() => apiEquipDecor(decorId), false),
    [runWorkshopCall]
  );
  const handleClaimDaily = useCallback(
    () => runWorkshopCall(() => apiClaimDailyReward(), true),
    [runWorkshopCall]
  );
  const handleClaimFreeCoins = useCallback(
    () => runWorkshopCall(() => apiClaimFreeCoins(), true),
    [runWorkshopCall]
  );
  const handleClaimAdReward = useCallback(
    () => runWorkshopCall(() => apiClaimAdReward(), true),
    [runWorkshopCall]
  );
  const handleBuyOffer = useCallback(
    (offerId: string) => runWorkshopCall(() => apiBuySpecialOffer(offerId), true),
    [runWorkshopCall]
  );
  const handleBuyFood = useCallback(
    (foodId: FoodItemId) => runWorkshopCall(() => apiBuyFood(foodId), true),
    [runWorkshopCall]
  );
  const handleToggleFood = useCallback(
    (foodId: FoodItemId, mode: 'toggle' | 'add' | 'solo' = 'toggle') =>
      runWorkshopCall(() => apiToggleFood(foodId, mode), false),
    [runWorkshopCall]
  );
  const handleSelectAllFoods = useCallback(
    () => runWorkshopCall(() => apiSelectAllFoods(), false),
    [runWorkshopCall]
  );
  const handleBuySpecialDecor = useCallback(
    (specialDecorId: SpecialDecorId) => runWorkshopCall(() => apiBuySpecialDecor(specialDecorId), true),
    [runWorkshopCall]
  );
  const handleEquipSpecialDecor = useCallback(
    (specialDecorId: SpecialDecorId) => runWorkshopCall(() => apiEquipSpecialDecor(specialDecorId), false),
    [runWorkshopCall]
  );
  const handleClaimCollection = useCallback(
    (goalId: string) => runWorkshopCall(() => apiClaimCollectionGoal(goalId), true),
    [runWorkshopCall]
  );

  const isCompactViewport = stageViewport.logicalW < 768 || stageViewport.logicalH < 560;
  const displayedBestScore = Math.max(hud.bestScore, profile.bestScore);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#090d1c]">
      {/* Full-Screen Landscape Stage (auto-rotated 90deg clockwise on vertical viewports) */}
      <div
        ref={containerRef}
        data-testid="landscape-stage"
        className={stageViewport.forceRotated ? 'overflow-hidden' : 'fixed inset-0 w-full h-full overflow-hidden'}
        style={
          stageViewport.forceRotated
            ? {
                width: `${stageViewport.logicalW}px`,
                height: `${stageViewport.logicalH}px`,
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                transformOrigin: 'center center',
              }
            : undefined
        }
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          data-testid="game-canvas"
          aria-label="Wormz Arena Game Canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="game-canvas-surface outline-none"
        />

        {phase === 'title' && !workshopOpen && (
          <TitleScreen
            selectedSkinId={profile.equippedSkinId}
            ownedSkins={profile.ownedSkins}
            equippedDecorId={profile.equippedDecorId}
            coins={profile.coins}
            onSelectSkin={handleSelectSkin}
            controlMode={profile.controlMode}
            onSelectControlMode={handleSelectControlMode}
            playerName={profile.playerName}
            onChangeName={handleChangeName}
            bestScore={displayedBestScore}
            isLandscapeCompact={stageViewport.isCompact}
            onStart={handleStartGame}
            onOpenWorkshop={(tab) => handleOpenWorkshop(tab ?? 'skins')}
          />
        )}

        {(phase === 'playing' || phase === 'paused') && (
          <GameHud
            hud={hud}
            controlMode={profile.controlMode}
            isCompactViewport={isCompactViewport}
            isLandscapeCompact={stageViewport.isCompact}
            forceRotated={stageViewport.forceRotated}
            onPause={handlePause}
            onJoystickChange={handleJoystickChange}
            onBoostChange={handleBoostChange}
          />
        )}

        {phase === 'paused' && (
          <PauseModal
            controlMode={profile.controlMode}
            isLandscapeCompact={stageViewport.isCompact}
            onSelectControlMode={handleSelectControlMode}
            onResume={handleResume}
            onRestart={handleStartGame}
            onTitle={handleReturnToTitle}
          />
        )}

        {phase === 'gameover' && gameOverStats && !workshopOpen && (
          <GameOverModal
            stats={gameOverStats}
            totalCoins={profile.coins}
            isLandscapeCompact={stageViewport.isCompact}
            onRestart={handleStartGame}
            onOpenWorkshop={() => handleOpenWorkshop('skins')}
            onTitle={handleReturnToTitle}
          />
        )}

        {workshopOpen && (
          <WorkshopModal
            profile={profile}
            initialTab={workshopInitialTab}
            isLandscapeCompact={stageViewport.isCompact}
            onClose={handleCloseWorkshop}
            onBuySkin={handleBuySkin}
            onEquipSkin={handleEquipSkin}
            onBuyUpgrade={handleBuyUpgrade}
            onBuyDecor={handleBuyDecor}
            onEquipDecor={handleEquipDecor}
            onBuyFood={handleBuyFood}
            onToggleFood={handleToggleFood}
            onSelectAllFoods={handleSelectAllFoods}
            onBuySpecialDecor={handleBuySpecialDecor}
            onEquipSpecialDecor={handleEquipSpecialDecor}
            onClaimCollection={handleClaimCollection}
            onClaimDaily={handleClaimDaily}
            onClaimFreeCoins={handleClaimFreeCoins}
            onClaimAdReward={handleClaimAdReward}
            onBuyOffer={handleBuyOffer}
          />
        )}
      </div>
    </main>
  );
}

