import React, { useEffect, useRef, useState } from 'react';
import { toLogicalDelta, toLogicalPoint } from '../game/orientation';
import type { ControlMode, HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  controlMode: ControlMode;
  isCompactViewport: boolean;
  isLandscapeCompact: boolean;
  forceRotated: boolean;
  onPause: () => void;
  onJoystickChange: (active: boolean, angle: number, magnitude: number) => void;
  onBoostChange: (active: boolean) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  controlMode,
  isCompactViewport,
  isLandscapeCompact,
  forceRotated,
  onPause,
  onJoystickChange,
  onBoostChange,
}) => {
  const fixedPadRef = useRef<HTMLDivElement | null>(null);
  const activeJoyPointerId = useRef<number | null>(null);
  const activeBoostPointerId = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number } | null>(null);

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joyActiveVisual, setJoyActiveVisual] = useState(false);
  const [floatingCenter, setFloatingCenter] = useState<{ x: number; y: number } | null>(null);

  const maxKnobDist = isLandscapeCompact ? 32 : 36;

  // Release any active thumb drag cleanly if device rotation state changes mid-touch
  useEffect(() => {
    activeJoyPointerId.current = null;
    activeBoostPointerId.current = null;
    joyOrigin.current = null;
    setJoyActiveVisual(false);
    setFloatingCenter(null);
    setKnobOffset({ x: 0, y: 0 });
    onJoystickChange(false, 0, 0);
    onBoostChange(false);
  }, [forceRotated, isLandscapeCompact, onBoostChange, onJoystickChange]);

  // Fixed Stick handlers
  const updateFixedJoystick = (clientX: number, clientY: number) => {
    const el = fixedPadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const padCx = rect.left + rect.width * 0.5;
    const padCy = rect.top + rect.height * 0.5;

    let physDx = clientX - padCx;
    let physDy = clientY - padCy;

    if (joyOrigin.current) {
      const dragDx = clientX - joyOrigin.current.x;
      const dragDy = clientY - joyOrigin.current.y;
      if (dragDx * dragDx + dragDy * dragDy >= 36) {
        physDx = dragDx;
        physDy = dragDy;
      }
    }

    const { dx, dy } = toLogicalDelta(physDx, physDy, forceRotated);
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxKnobDist, dist);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 0.01 ? (dx / dist) * clampedDist : 0;
    const ky = dist > 0.01 ? (dy / dist) * clampedDist : 0;
    setKnobOffset({ x: kx, y: ky });
    onJoystickChange(true, angle, clampedDist / maxKnobDist);
  };

  const handleFixedDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activeJoyPointerId.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setJoyActiveVisual(true);
    updateFixedJoystick(e.clientX, e.clientY);
  };

  const handleFixedMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeJoyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateFixedJoystick(e.clientX, e.clientY);
  };

  const handleFixedEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeJoyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    activeJoyPointerId.current = null;
    joyOrigin.current = null;
    setJoyActiveVisual(false);
    setKnobOffset({ x: 0, y: 0 });
    onJoystickChange(false, 0, 0);
  };

  // Floating Stick handlers (spawn anywhere inside left steering zone)
  const handleFloatingDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toLogicalPoint(e.clientX, e.clientY, window.innerWidth, window.innerHeight, forceRotated);
    const zoneTop = e.currentTarget.offsetTop;
    const zoneLeft = e.currentTarget.offsetLeft;
    activeJoyPointerId.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setFloatingCenter({ x: pt.x - zoneLeft, y: pt.y - zoneTop });
    setKnobOffset({ x: 0, y: 0 });
    setJoyActiveVisual(true);
  };

  const handleFloatingMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeJoyPointerId.current !== e.pointerId || !joyOrigin.current) return;
    e.stopPropagation();
    const { dx, dy } = toLogicalDelta(
      e.clientX - joyOrigin.current.x,
      e.clientY - joyOrigin.current.y,
      forceRotated
    );
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxKnobDist, dist);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 0.01 ? (dx / dist) * clampedDist : 0;
    const ky = dist > 0.01 ? (dy / dist) * clampedDist : 0;
    setKnobOffset({ x: kx, y: ky });
    onJoystickChange(true, angle, clampedDist / maxKnobDist);
  };

  const handleFloatingEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeJoyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    activeJoyPointerId.current = null;
    joyOrigin.current = null;
    setFloatingCenter(null);
    setJoyActiveVisual(false);
    setKnobOffset({ x: 0, y: 0 });
    onJoystickChange(false, 0, 0);
  };

  // Boost button handlers (multi-touch safe)
  const handleBoostPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activeBoostPointerId.current = e.pointerId;
    onBoostChange(true);
  };

  const handleBoostPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeBoostPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    activeBoostPointerId.current = null;
    onBoostChange(false);
  };

  const visibleLeaderboard = isCompactViewport ? hud.leaderboard.slice(0, 3) : hud.leaderboard;

  return (
    <div
      className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-between ${
        isLandscapeCompact
          ? 'px-3 py-2 pl-[max(0.85rem,env(safe-area-inset-left))] pr-[max(0.85rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]'
          : 'p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.85rem,env(safe-area-inset-bottom))]'
      }`}
    >
      {/* Top Perimeter Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Score, Length, Rank & Boost Meter */}
        <div
          className={`flex flex-col bg-[#0f1630]/82 border border-slate-500/35 rounded-2xl shadow-lg ${
            isLandscapeCompact
              ? 'gap-1 px-3 py-1.5 min-w-[138px]'
              : 'gap-1.5 px-3.5 py-2.5 min-w-[180px]'
          }`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Score
              </div>
              <div
                className={`font-mono-num font-bold text-amber-300 leading-none ${
                  isLandscapeCompact ? 'text-xl' : 'text-2xl sm:text-3xl'
                }`}
                data-testid="hud-score"
              >
                {hud.score}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Rank
              </div>
              <div className="font-mono-num text-sm sm:text-base font-bold text-white">
                #{hud.rank}/{hud.totalWorms}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>
              Length <span className="font-mono-num text-white">{hud.length}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Kills <span className="font-mono-num text-emerald-300">{hud.kills}</span>
            </span>
          </div>

          {/* Boost Energy Bar */}
          <div className="mt-0.5">
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full origin-left ${
                  hud.isBoosting
                    ? 'bg-amber-300'
                    : hud.canBoost
                    ? 'bg-sky-400'
                    : 'bg-slate-600'
                }`}
                style={{ transform: `scaleX(${Math.max(0.04, hud.boostMeter)})` }}
              />
            </div>
          </div>

          {hud.activePowerUps.length > 0 && (
            <div
              className="flex flex-wrap gap-1 pt-1 border-t border-slate-600/35"
              data-testid="hud-active-powerups"
            >
              {hud.activePowerUps.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#090f24]/90 border text-[10px] font-mono-num font-bold"
                  style={{ borderColor: p.color, color: p.color }}
                >
                  <span>{p.badgeLabel}</span>
                  <span className="text-white">{p.remaining}s</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center Kill Notification */}
        {hud.killBanner && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 flex items-center px-3.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-lg whitespace-nowrap animate-modal-in ${
              isLandscapeCompact ? 'top-2.5' : 'top-4'
            }`}
          >
            {hud.killBanner}
          </div>
        )}

        {/* Top-Right: Utility Controls + Live Leaderboard */}
        <div className="flex flex-row-reverse items-start gap-2.5">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause game"
              className={`rounded-xl bg-[#0f1630]/85 border border-slate-500/40 flex items-center justify-center text-slate-100 hover:bg-[#1a254d] active:scale-95 transition-transform cursor-pointer ${
                isLandscapeCompact ? 'w-10 h-10' : 'w-11 h-11'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1.2" />
                <rect x="14" y="5" width="4" height="14" rx="1.2" />
              </svg>
            </button>
          </div>

          <div
            className="bg-[#0f1630]/82 border border-slate-500/35 rounded-2xl px-3 py-1.5 sm:py-2 shadow-lg min-w-[136px] sm:min-w-[180px]"
            aria-label="Live Leaderboard"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-0.5 sm:mb-1">
              Top Worms
            </div>
            <div className="flex flex-col gap-0.5">
              {visibleLeaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-3 text-xs ${
                    entry.isPlayer ? 'text-amber-300 font-bold' : 'text-slate-200 font-medium'
                  }`}
                >
                  <span className="truncate max-w-[96px] sm:max-w-[116px]">
                    <span className="font-mono-num text-slate-400 mr-1">{entry.rank}.</span>
                    {entry.name}
                  </span>
                  <span className="font-mono-num">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Joystick Touch Capture Zone */}
      {controlMode === 'floating' && (
        <div
          onPointerDown={handleFloatingDown}
          onPointerMove={handleFloatingMove}
          onPointerUp={handleFloatingEnd}
          onPointerCancel={handleFloatingEnd}
          data-testid="floating-joystick-zone"
          aria-label="Floating joystick touch area"
          className={`absolute left-0 bottom-0 right-28 pointer-events-auto touch-none ${
            isLandscapeCompact ? 'top-24' : 'top-32'
          }`}
        >
          {!floatingCenter && (
            <div
              className={`absolute rounded-full border-2 border-dashed border-slate-400/35 flex items-center justify-center pointer-events-none ${
                isLandscapeCompact ? 'bottom-4 left-4 w-22 h-22' : 'bottom-6 left-5 w-24 h-24'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-300/20" />
            </div>
          )}

          {floatingCenter && (
            <div
              data-testid="floating-joystick-pad"
              className="absolute w-28 h-28 -ml-14 -mt-14 rounded-full border-2 bg-[#1a254d]/55 border-sky-400/85 flex items-center justify-center pointer-events-none"
              style={{ left: floatingCenter.x, top: floatingCenter.y }}
            >
              <div className="w-12 h-12 rounded-full border border-slate-300/25" />
              <div
                className="absolute w-12 h-12 rounded-full bg-sky-400 border-2 border-white shadow-lg"
                style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Phone Controls Row */}
      <div className="flex items-end justify-between w-full pb-1 px-1">
        {controlMode === 'fixed' ? (
          <div
            ref={fixedPadRef}
            onPointerDown={handleFixedDown}
            onPointerMove={handleFixedMove}
            onPointerUp={handleFixedEnd}
            onPointerCancel={handleFixedEnd}
            data-testid="touch-joystick"
            aria-label="Movement joystick"
            className={`pointer-events-auto relative rounded-full border-2 flex items-center justify-center touch-none transition-colors ${
              isLandscapeCompact ? 'w-24 h-24' : 'w-28 h-28'
            } ${
              joyActiveVisual
                ? 'bg-[#1a254d]/60 border-sky-400/85'
                : 'bg-[#0f1630]/58 border-slate-400/45'
            }`}
          >
            <span className="absolute top-2 w-1.5 h-1.5 rounded-full bg-slate-300/40 pointer-events-none" />
            <span className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-slate-300/40 pointer-events-none" />
            <span className="absolute left-2 w-1.5 h-1.5 rounded-full bg-slate-300/40 pointer-events-none" />
            <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-slate-300/40 pointer-events-none" />

            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-400/25 pointer-events-none" />
            <div
              className={`absolute rounded-full shadow-lg pointer-events-none border-2 ${
                isLandscapeCompact ? 'w-10 h-10' : 'w-12 h-12'
              } ${
                joyActiveVisual
                  ? 'bg-sky-400 border-white'
                  : 'bg-slate-200/85 border-slate-900/40'
              }`}
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>
        ) : (
          <div aria-hidden="true" />
        )}

        <button
          type="button"
          onPointerDown={handleBoostPointerDown}
          onPointerUp={handleBoostPointerEnd}
          onPointerCancel={handleBoostPointerEnd}
          disabled={!hud.canBoost}
          data-testid="touch-boost"
          aria-label="Speed boost"
          className={`pointer-events-auto rounded-full border-2 flex flex-col items-center justify-center font-display font-bold text-xs tracking-wide shadow-xl touch-none transition-transform active:scale-95 cursor-pointer ${
            isLandscapeCompact ? 'w-[72px] h-[72px]' : 'w-20 h-20'
          } ${
            !hud.canBoost
              ? 'bg-slate-800/60 border-slate-600/40 text-slate-400'
              : hud.isBoosting
              ? 'bg-amber-400 border-white text-slate-950 scale-95'
              : 'bg-amber-500/90 border-amber-200 text-slate-950'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 mb-0.5" fill="currentColor" aria-hidden="true">
            <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
          </svg>
          BOOST
        </button>
      </div>
    </div>
  );
};
