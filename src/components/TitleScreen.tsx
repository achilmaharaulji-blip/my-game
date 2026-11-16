import React from 'react';
import { getDecorById, getSkinById } from '../game/workshopData';
import type { ArenaDecorId, ControlMode } from '../game/types';
import { CoinIcon, SkinBadgeSvg } from './WorkshopPreviews';

interface TitleScreenProps {
  selectedSkinId: string;
  ownedSkins: string[];
  equippedDecorId: ArenaDecorId;
  coins: number;
  onSelectSkin: (skinId: string) => void;
  controlMode: ControlMode;
  onSelectControlMode: (mode: ControlMode) => void;
  playerName: string;
  onChangeName: (name: string) => void;
  bestScore: number;
  isLandscapeCompact: boolean;
  onStart: () => void;
  onOpenWorkshop: (tab?: 'skins' | 'cards' | 'upgrades' | 'decor') => void;
}

const CONTROL_OPTIONS: Array<{ id: ControlMode; label: string }> = [
  { id: 'fixed', label: 'Fixed Stick' },
  { id: 'floating', label: 'Floating Stick' },
  { id: 'follow', label: 'Touch Follow' },
];

function ControlModeIcon({ mode }: { mode: ControlMode }) {
  if (mode === 'fixed') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (mode === 'floating') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
        <circle cx="14.5" cy="9.5" r="3" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h11M12 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TitleEmblem({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 420 106"
      className={`w-full h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] ${
        compact ? 'max-w-[205px] mb-0.5' : 'max-w-[245px] sm:max-w-[285px] mb-1'
      }`}
      role="img"
      aria-label="Wormz Arena"
    >
      <path
        d="M42 74 C 18 74, 16 40, 46 36 C 72 32, 88 60, 118 54"
        fill="none"
        stroke="#10B981"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M42 74 C 18 74, 16 40, 46 36 C 72 32, 88 60, 118 54"
        fill="none"
        stroke="#A7F3D0"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="10 16"
      />
      <circle cx="48" cy="36" r="10" fill="#10B981" stroke="#064E3B" strokeWidth="2.5" />
      <circle cx="45" cy="32" r="3.4" fill="#FFF" />
      <circle cx="44" cy="32" r="1.8" fill="#0F172A" />
      <circle cx="52" cy="39" r="3.4" fill="#FFF" />
      <circle cx="51" cy="39" r="1.8" fill="#0F172A" />

      <text
        x="232"
        y="55"
        textAnchor="middle"
        fill="#FACC15"
        stroke="#1E1B4B"
        strokeWidth="8"
        paintOrder="stroke fill"
        fontFamily="Fredoka, system-ui, sans-serif"
        fontSize="46"
        fontWeight="700"
        letterSpacing="1"
      >
        WORMZ
      </text>
      <text
        x="232"
        y="91"
        textAnchor="middle"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="6"
        paintOrder="stroke fill"
        fontFamily="Fredoka, system-ui, sans-serif"
        fontSize="26"
        fontWeight="700"
        letterSpacing="4"
      >
        ARENA
      </text>
    </svg>
  );
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedSkinId,
  ownedSkins,
  equippedDecorId,
  coins,
  onSelectSkin,
  controlMode,
  onSelectControlMode,
  playerName,
  onChangeName,
  bestScore,
  isLandscapeCompact,
  onStart,
  onOpenWorkshop,
}) => {
  const hintText =
    controlMode === 'fixed'
      ? 'Drag Left Pad to Steer · Hold Boost Button to Dash · Esc Pause'
      : controlMode === 'floating'
      ? 'Swipe Anywhere on Left to Steer · Hold Boost Button to Dash · Esc Pause'
      : 'Drag Finger or Pointer to Steer · Hold Boost Button to Dash · Esc Pause';

  const quickSkins = ownedSkins.slice(0, 8).map((id) => getSkinById(id));
  const equippedSkin = getSkinById(selectedSkinId);
  const equippedDecor = getDecorById(equippedDecorId);

  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-b from-[#090d1c]/75 via-[#090d1c]/55 to-[#090d1c]/85 overflow-y-auto ${
        isLandscapeCompact
          ? 'px-4 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]'
          : 'px-6 py-4 md:p-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]'
      }`}
    >
      {/* Top Bar: High Score, Coin Balance + Mute */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 hud-text-stroke">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              High Score
            </span>
            <span
              className="font-mono-num text-xl sm:text-2xl font-bold text-amber-300"
              data-testid="title-best-score"
            >
              {bestScore.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenWorkshop('cards')}
            data-testid="title-coin-balance"
            aria-label="Open Workshop Rewards and Coin Balance"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0e327d]/90 border-2 border-amber-400/70 hover:bg-[#1545a8] active:scale-95 transition-transform cursor-pointer"
          >
            <CoinIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-mono-num text-sm sm:text-base font-bold text-amber-300">
              {coins.toLocaleString()}
            </span>
          </button>
        </div>
      </div>

      {/* Horizontal Landscape Split Card (Landscape-Only) */}
      <div
        className={`mx-auto w-full my-auto rounded-2xl bg-[#131932]/92 border border-slate-600/45 shadow-2xl grid grid-cols-[1fr_1.45fr] items-center ${
          isLandscapeCompact ? 'max-w-3xl p-3 gap-3.5' : 'max-w-4xl p-6 gap-6'
        }`}
      >
        {/* Left Column: Emblem, Nickname, Play & Workshop CTAs */}
        <div className={`flex flex-col items-center ${isLandscapeCompact ? 'gap-2' : 'gap-3.5'}`}>
          <TitleEmblem compact={isLandscapeCompact} />
          <div className="w-full flex flex-col gap-1 text-left">
            <label
              htmlFor="player-name-input"
              className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-300"
            >
              Nickname
            </label>
            <input
              id="player-name-input"
              type="text"
              maxLength={14}
              value={playerName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Enter nickname"
              className={`w-full px-3.5 rounded-xl bg-[#0b1024] border border-slate-600/60 text-white placeholder-slate-400 font-semibold text-sm focus:outline-none focus:border-amber-400 ${
                isLandscapeCompact ? 'h-9' : 'h-11'
              }`}
            />
          </div>

          <div className="w-full grid grid-cols-[1.25fr_1fr] gap-2">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStart();
              }}
              className={`w-full rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display font-bold tracking-wide border-b-4 border-amber-600 shadow-lg transition-transform cursor-pointer ${
                isLandscapeCompact ? 'h-10 text-base' : 'h-12 text-lg'
              }`}
            >
              Play Now
            </button>

            <button
              type="button"
              data-testid="open-workshop-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenWorkshop('skins');
              }}
              className={`w-full rounded-xl bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 text-slate-950 font-display font-bold tracking-wide border-b-4 border-sky-700 shadow-lg transition-transform cursor-pointer whitespace-nowrap ${
                isLandscapeCompact ? 'h-10 text-sm' : 'h-12 text-base'
              }`}
            >
              Workshop
            </button>
          </div>
        </div>

        {/* Right Column: Equipped Loadout, Quick Owned Skins & Joystick Control */}
        <div className={`flex flex-col ${isLandscapeCompact ? 'gap-2' : 'gap-3'}`}>
          <div className="text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                My Skins ({ownedSkins.length}/30) · Arena: {equippedDecor.name}
              </span>
              <button
                type="button"
                onClick={() => onOpenWorkshop('skins')}
                className="text-xs font-bold text-sky-300 hover:text-sky-200 underline cursor-pointer whitespace-nowrap"
              >
                {equippedSkin.name} · Shop All
              </button>
            </div>

            <div className={`grid grid-cols-4 ${isLandscapeCompact ? 'gap-1.5' : 'gap-2'}`}>
              {quickSkins.map((skin) => {
                const selected = skin.id === selectedSkinId;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => onSelectSkin(skin.id)}
                    aria-label={`Select ${skin.name} skin`}
                    aria-pressed={selected}
                    className={`rounded-xl px-1 py-1 flex flex-col items-center justify-center border transition-transform active:scale-95 cursor-pointer ${
                      isLandscapeCompact ? 'min-h-[40px]' : 'min-h-[48px]'
                    } ${
                      selected
                        ? 'bg-[#1e2a55] border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-[#0c1126] border-slate-700/60 hover:border-slate-500'
                    }`}
                  >
                    <SkinBadgeSvg skin={skin} className={isLandscapeCompact ? 'w-full h-5' : 'w-full h-7'} />
                    <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-200 truncate w-full text-center mt-0.5">
                      {skin.name}
                    </span>
                  </button>
                );
              })}

              {quickSkins.length < 8 && (
                <button
                  type="button"
                  onClick={() => onOpenWorkshop('skins')}
                  className={`rounded-xl px-1 py-1 flex flex-col items-center justify-center border border-dashed border-sky-400/50 bg-[#0d2864]/70 hover:bg-[#14398a] text-sky-200 text-[10px] font-bold cursor-pointer ${
                    isLandscapeCompact ? 'min-h-[40px]' : 'min-h-[48px]'
                  }`}
                >
                  <span>+More Skins</span>
                </button>
              )}
            </div>
          </div>

          <div className="text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Joystick Control
              </span>
              <span className="text-[11px] font-semibold text-sky-300">
                {CONTROL_OPTIONS.find((o) => o.id === controlMode)?.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0b1024] border border-slate-700/60">
              {CONTROL_OPTIONS.map((opt) => {
                const active = opt.id === controlMode;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`joystick-mode-${opt.id}`}
                    aria-pressed={active}
                    onClick={() => onSelectControlMode(opt.id)}
                    className={`px-1 rounded-lg flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isLandscapeCompact ? 'min-h-[36px]' : 'min-h-[42px]'
                    } ${
                      active
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-[#161f3f]'
                    }`}
                  >
                    <ControlModeIcon mode={opt.id} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Flat Single-Line Control Hint */}
      <div className="text-center text-[11px] sm:text-sm font-medium text-slate-300 hud-text-stroke shrink-0">
        {hintText}
      </div>
    </div>
  );
};
