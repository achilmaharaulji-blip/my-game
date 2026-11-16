import React from 'react';
import type { ControlMode, GameOverStats } from '../game/types';

interface PauseModalProps {
  controlMode: ControlMode;
  onSelectControlMode: (mode: ControlMode) => void;
  isLandscapeCompact: boolean;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

const CONTROL_LABELS: Array<{ id: ControlMode; label: string }> = [
  { id: 'fixed', label: 'Fixed' },
  { id: 'floating', label: 'Floating' },
  { id: 'follow', label: 'Follow' },
];

export const PauseModal: React.FC<PauseModalProps> = ({
  controlMode,
  onSelectControlMode,
  isLandscapeCompact,
  onResume,
  onRestart,
  onTitle,
}) => {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-2 sm:p-3.5 bg-[#070b18]/78"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-heading"
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-[#131932] border border-slate-500/40 shadow-2xl text-center animate-modal-in max-h-[94%] overflow-y-auto ${
          isLandscapeCompact ? 'p-4' : 'p-6'
        }`}
      >
        <h2
          id="pause-heading"
          className={`font-display font-bold text-white ${
            isLandscapeCompact ? 'text-2xl mb-1' : 'text-3xl mb-1.5'
          }`}
        >
          Paused
        </h2>
        <p className={`text-xs sm:text-sm text-slate-300 ${isLandscapeCompact ? 'mb-3' : 'mb-5'}`}>
          Switch joystick style or jump right back into the arena.
        </p>

        {/* Joystick Control */}
        <div className={`text-left ${isLandscapeCompact ? 'mb-3.5' : 'mb-5'}`}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Joystick Control
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0b1024] border border-slate-700/60">
            {CONTROL_LABELS.map((opt) => {
              const active = opt.id === controlMode;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectControlMode(opt.id)}
                  className={`rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isLandscapeCompact ? 'min-h-[34px]' : 'min-h-[40px]'
                  } ${
                    active
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-[#161f3f]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className={`w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-lg cursor-pointer ${
              isLandscapeCompact ? 'h-10' : 'h-12'
            }`}
          >
            Resume
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className={`w-full rounded-xl bg-[#1c264b] hover:bg-[#253263] text-white font-semibold text-sm border border-slate-500/40 cursor-pointer ${
                isLandscapeCompact ? 'h-9' : 'h-11'
              }`}
            >
              Restart Run
            </button>
            <button
              type="button"
              onClick={onTitle}
              className={`w-full rounded-xl bg-transparent hover:bg-slate-800/60 text-slate-300 font-semibold text-sm border border-slate-700/60 cursor-pointer ${
                isLandscapeCompact ? 'h-9' : 'h-11'
              }`}
            >
              Change Skin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  stats: GameOverStats;
  totalCoins: number;
  isLandscapeCompact: boolean;
  onRestart: () => void;
  onOpenWorkshop: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  totalCoins,
  isLandscapeCompact,
  onRestart,
  onOpenWorkshop,
  onTitle,
}) => {
  const mins = Math.floor(stats.survivalSeconds / 60);
  const secs = stats.survivalSeconds % 60;
  const timeLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-3.5 bg-[#070b18]/82"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-heading"
    >
      <div
        className={`w-full max-w-2xl rounded-2xl bg-[#131932] border border-slate-500/45 shadow-2xl text-center animate-modal-in max-h-[92%] overflow-y-auto ${
          isLandscapeCompact ? 'p-4' : 'p-6'
        }`}
      >
        {stats.isNewBest ? (
          <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-0.5">
            New High Score
          </div>
        ) : (
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-300 mb-0.5">
            Eliminated by {stats.eliminatedBy}
          </div>
        )}

        <h2
          id="gameover-heading"
          className={`font-display font-bold text-white ${
            isLandscapeCompact ? 'text-2xl mb-2.5' : 'text-3xl sm:text-4xl mb-4'
          }`}
        >
          Game Over
        </h2>

        <div className="grid grid-cols-5 gap-2 mb-4 sm:mb-5">
          <div className="rounded-xl bg-[#0b1024] border border-slate-700/60 p-2 sm:p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Final Score
            </div>
            <div
              className="font-mono-num text-lg sm:text-2xl font-bold text-amber-300"
              data-testid="gameover-score"
            >
              {stats.finalScore.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl bg-[#0b1024] border border-slate-700/60 p-2 sm:p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Best Score
            </div>
            <div
              className="font-mono-num text-lg sm:text-2xl font-bold text-white"
              data-testid="gameover-best"
            >
              {stats.bestScore.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl bg-[#0b1024] border border-slate-700/60 p-2 sm:p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Coins Won
            </div>
            <div
              className="font-mono-num text-lg sm:text-2xl font-bold text-yellow-300"
              data-testid="gameover-coins-earned"
            >
              +{stats.coinsEarned}
            </div>
            <div className="text-[10px] font-mono-num text-slate-400">
              Total {totalCoins.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl bg-[#0b1024] border border-slate-700/60 p-2 sm:p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Length · Kills
            </div>
            <div className="font-mono-num text-base sm:text-lg font-bold text-emerald-300">
              {stats.peakLength} · {stats.kills}
            </div>
          </div>

          <div className="rounded-xl bg-[#0b1024] border border-slate-700/60 p-2 sm:p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Survived
            </div>
            <div className="font-mono-num text-base sm:text-lg font-bold text-sky-300">
              {timeLabel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full h-11 sm:h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display font-bold text-base sm:text-lg border-b-4 border-amber-600 shadow-lg transition-transform cursor-pointer"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onOpenWorkshop}
            className="w-full h-11 sm:h-12 rounded-xl bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 text-slate-950 font-display font-bold text-base border-b-4 border-sky-700 cursor-pointer"
          >
            Workshop
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full h-11 sm:h-12 rounded-xl bg-[#1c264b] hover:bg-[#253263] text-slate-100 font-semibold text-sm border border-slate-500/40 cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
