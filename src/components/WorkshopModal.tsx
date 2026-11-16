import React, { useEffect, useState } from 'react';
import type {
  ArenaDecorId,
  FoodItemId,
  PlayerProfile,
  PowerUpId,
  SkinRarity,
  SpecialDecorId,
} from '../game/types';
import {
  AD_REWARD_COINS,
  ARENA_DECORS,
  COLLECTION_GOALS,
  DAILY_REWARDS,
  FOOD_CATALOG,
  FREE_COINS_AMOUNT,
  POWER_UPS,
  SPECIAL_DECORS,
  SPECIAL_OFFERS,
  WORM_SKINS,
  getDecorById,
  getFoodById,
  getSkinById,
  getSpecialDecorById,
} from '../game/workshopData';
import {
  canClaimDailyReward,
  getCollectionProgress,
  getFreeCoinsCooldownRemainingMs,
  getNextUpgradePrice,
} from '../game/workshopLogic';
import {
  ArenaDecorStageCanvas,
  ArenaDecorTabIcon,
  BgSubTabIcon,
  CardsTabIcon,
  CoinIcon,
  DecorTileCanvas,
  FoodSubTabIcon,
  FoodTileCanvas,
  PowerUpIcon,
  SkinBadgeSvg,
  SkinLivePreviewCanvas,
  SpecialDecorTileCanvas,
  SpecialSubTabIcon,
  UpgradesTabIcon,
  WormsShopTabIcon,
} from './WorkshopPreviews';

export type WorkshopTab = 'skins' | 'cards' | 'upgrades' | 'decor';
type DecorSubTab = 'backgrounds' | 'foods' | 'special';

interface WorkshopModalProps {
  profile: PlayerProfile;
  initialTab?: WorkshopTab;
  isLandscapeCompact: boolean;
  onClose: () => void;
  onBuySkin: (skinId: string) => Promise<{ ok: boolean; error?: string }>;
  onEquipSkin: (skinId: string) => Promise<{ ok: boolean; error?: string }>;
  onBuyUpgrade: (powerUpId: PowerUpId) => Promise<{ ok: boolean; error?: string }>;
  onBuyDecor: (decorId: ArenaDecorId) => Promise<{ ok: boolean; error?: string }>;
  onEquipDecor: (decorId: ArenaDecorId) => Promise<{ ok: boolean; error?: string }>;
  onBuyFood: (foodId: FoodItemId) => Promise<{ ok: boolean; error?: string }>;
  onToggleFood: (foodId: FoodItemId, mode?: 'toggle' | 'add' | 'solo') => Promise<{ ok: boolean; error?: string }>;
  onSelectAllFoods: () => Promise<{ ok: boolean; error?: string }>;
  onBuySpecialDecor: (specialDecorId: SpecialDecorId) => Promise<{ ok: boolean; error?: string }>;
  onEquipSpecialDecor: (specialDecorId: SpecialDecorId) => Promise<{ ok: boolean; error?: string }>;
  onClaimCollection: (goalId: string) => Promise<{ ok: boolean; error?: string; coinsAwarded?: number }>;
  onClaimDaily: () => Promise<{ ok: boolean; error?: string; coinsAwarded?: number }>;
  onClaimFreeCoins: () => Promise<{ ok: boolean; error?: string; coinsAwarded?: number }>;
  onClaimAdReward: () => Promise<{ ok: boolean; error?: string; coinsAwarded?: number }>;
  onBuyOffer: (offerId: string) => Promise<{ ok: boolean; error?: string }>;
}

const RARITY_STYLES: Record<SkinRarity, { text: string; badge: string; label: string }> = {
  basic: { text: 'text-sky-200', badge: 'bg-sky-500/20 border-sky-300/40', label: 'Basic' },
  rare: { text: 'text-emerald-300', badge: 'bg-emerald-500/20 border-emerald-300/45', label: 'Rare' },
  epic: { text: 'text-fuchsia-300', badge: 'bg-fuchsia-500/20 border-fuchsia-300/45', label: 'Epic' },
  legendary: { text: 'text-amber-300', badge: 'bg-amber-500/25 border-amber-300/55', label: 'Legendary' },
};

const GreenCheckBadge: React.FC<{ placement?: 'bottom-center' | 'top-right' }> = ({
  placement = 'bottom-center',
}) => (
  <span
    aria-hidden="true"
    className={`absolute w-5 h-5 rounded-full bg-[#22C55E] border-2 border-white shadow-md flex items-center justify-center z-10 ${
      placement === 'top-right' ? 'top-1 right-1' : 'bottom-1 left-1/2 -translate-x-1/2'
    }`}
  >
    <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M3 8.5l3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const LockBadge: React.FC = () => (
  <span
    aria-hidden="true"
    className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-slate-200 border border-slate-600 shadow flex items-center justify-center z-10"
  >
    <svg viewBox="0 0 16 16" className="w-3 h-3 text-slate-700" fill="currentColor">
      <path d="M11 7V5a3 3 0 10-6 0v2H4v7h8V7h-1zm-4.5-2a1.5 1.5 0 113 0v2h-3V5z" />
    </svg>
  </span>
);

export const WorkshopModal: React.FC<WorkshopModalProps> = ({
  profile,
  initialTab = 'skins',
  isLandscapeCompact,
  onClose,
  onBuySkin,
  onEquipSkin,
  onBuyUpgrade,
  onBuyDecor,
  onEquipDecor,
  onBuyFood,
  onToggleFood,
  onSelectAllFoods,
  onBuySpecialDecor,
  onEquipSpecialDecor,
  onClaimCollection,
  onClaimDaily,
  onClaimFreeCoins,
  onClaimAdReward,
  onBuyOffer,
}) => {
  const [activeTab, setActiveTab] = useState<WorkshopTab>(initialTab);
  const [rarityFilter, setRarityFilter] = useState<'all' | SkinRarity>('all');
  const [previewSkinId, setPreviewSkinId] = useState<string>(profile.equippedSkinId);

  const [decorSubTab, setDecorSubTab] = useState<DecorSubTab>('backgrounds');
  const [previewDecorId, setPreviewDecorId] = useState<ArenaDecorId>(profile.equippedDecorId);
  const [previewFoodId, setPreviewFoodId] = useState<FoodItemId>(profile.selectedFoods[0] ?? 'cheese');
  const [previewSpecialId, setPreviewSpecialId] = useState<SpecialDecorId>(profile.equippedSpecialDecorId);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [adModalCountdown, setAdModalCountdown] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (adModalCountdown === null) return;
    if (adModalCountdown <= 0) {
      setAdModalCountdown(null);
      setBusyKey('ad');
      onClaimAdReward()
        .then((res) => {
          if (res.ok) {
            setNotice({ text: `+${AD_REWARD_COINS} Coins claimed from video reward!`, tone: 'success' });
          } else {
            setNotice({ text: res.error || 'Could not claim ad reward.', tone: 'error' });
          }
        })
        .finally(() => setBusyKey(null));
      return;
    }
    const timer = window.setTimeout(() => {
      setAdModalCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [adModalCountdown, onClaimAdReward]);

  const filteredSkins =
    rarityFilter === 'all' ? WORM_SKINS : WORM_SKINS.filter((s) => s.rarity === rarityFilter);
  const previewSkin = getSkinById(previewSkinId);
  const isPreviewSkinOwned = profile.ownedSkins.includes(previewSkin.id);
  const isPreviewSkinEquipped = profile.equippedSkinId === previewSkin.id;

  const previewDecor = getDecorById(previewDecorId);
  const isPreviewDecorOwned = profile.ownedDecors.includes(previewDecor.id);
  const isPreviewDecorEquipped = profile.equippedDecorId === previewDecor.id;

  const previewFood = getFoodById(previewFoodId);
  const isPreviewFoodOwned = profile.ownedFoods.includes(previewFood.id);
  const isPreviewFoodSelected = profile.selectedFoods.includes(previewFood.id);

  const previewSpecial = getSpecialDecorById(previewSpecialId);
  const isPreviewSpecialOwned = profile.ownedSpecialDecors.includes(previewSpecial.id);
  const isPreviewSpecialEquipped = profile.equippedSpecialDecorId === previewSpecial.id;

  const equippedSkin = getSkinById(profile.equippedSkinId);

  const dailyReady = canClaimDailyReward(profile, nowMs);
  const nextDailyIndex = profile.dailyStreak % DAILY_REWARDS.length;
  const freeCooldownMs = getFreeCoinsCooldownRemainingMs(profile, nowMs);

  const runAction = async (
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string
  ) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const res = await fn();
      if (res.ok) {
        setNotice({ text: successMsg, tone: 'success' });
      } else {
        setNotice({ text: res.error || 'Action unavailable.', tone: 'error' });
      }
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-[#174AB6] via-[#103891] to-[#0B2464] text-white overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Wormz Workshop"
      data-testid="workshop-modal"
    >
      {/* Cartoon Header & Folder Tabs Bar (with Worm Watermark Texture) */}
      <header className="relative shrink-0 bg-gradient-to-b from-[#113996] to-[#0D2E7E] overflow-hidden">
        {/* Subtle Repeating Cartoon Worm Face Watermarks */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.09]"
        >
          <defs>
            <pattern id="wormHeaderWatermark" width="76" height="44" patternUnits="userSpaceOnUse">
              <circle cx="26" cy="22" r="10" fill="#60A5FA" />
              <circle cx="38" cy="19" r="11" fill="#60A5FA" />
              <circle cx="36" cy="16" r="2.2" fill="#0D2E7E" />
              <circle cx="42" cy="16" r="2.2" fill="#0D2E7E" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wormHeaderWatermark)" />
        </svg>

        {/* Top Row: Yellow "Workshop" Title + Coin Pill + "+" Button + Orange "X" Close Button */}
        <div
          className={`relative z-10 flex items-center justify-between gap-2 px-3 sm:px-5 ${
            isLandscapeCompact ? 'pt-1.5 pb-1' : 'pt-2.5 pb-1.5'
          }`}
        >
          <h2 className="font-display font-bold tracking-wide text-xl sm:text-3xl text-[#FDE047] drop-shadow-[0_2px_0_rgba(11,22,58,0.95)] whitespace-nowrap">
            Workshop
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            {/* Black Coin Balance Pill + Smiling Coin + Blue "+" Button */}
            <div className="flex items-center">
              <div
                data-testid="workshop-coin-balance"
                className="relative flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-l-xl bg-[#071333]/95 border-2 border-r-0 border-[#3B82F6]/55 shadow-inner"
              >
                <CoinIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <span className="font-mono-num font-bold text-sm sm:text-base text-white">
                  {profile.coins.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                data-testid="workshop-plus-coins-btn"
                aria-label="Get More Coins and Offers"
                onClick={() => setActiveTab('cards')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-r-xl bg-gradient-to-b from-[#60A5FA] to-[#2563EB] hover:from-[#93C5FD] hover:to-[#3B82F6] active:translate-y-0.5 border-2 border-[#1E3A8A] border-b-4 flex items-center justify-center text-white font-display font-bold text-lg shadow cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Orange Square "X" Close Button */}
            <button
              type="button"
              data-testid="workshop-close-btn"
              onClick={onClose}
              aria-label="Close Workshop"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#FB923C] to-[#EA580C] hover:from-[#FDBA74] hover:to-[#F97316] active:translate-y-0.5 border-2 border-[#7C2D12] border-b-4 flex items-center justify-center text-white font-display font-bold text-base shadow-md cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4 Blue Rounded Folder Tabs */}
        <nav
          aria-label="Workshop sections"
          className="relative z-10 flex items-end gap-1.5 sm:gap-2 px-3 sm:px-5 pt-0.5 border-b-4 border-[#3B7BF2]"
        >
          {(
            [
              { id: 'skins', label: 'Worms Shop', Icon: WormsShopTabIcon },
              { id: 'cards', label: 'Cards / Collections', Icon: CardsTabIcon },
              { id: 'upgrades', label: 'Worm Upgrades', Icon: UpgradesTabIcon },
              { id: 'decor', label: 'Arena Decor', Icon: ArenaDecorTabIcon },
            ] as Array<{ id: WorkshopTab; label: string; Icon: React.FC<{ className?: string }> }>
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`workshop-tab-${id}`}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-t-xl font-display font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#3B7BF2] text-[#FDE047] px-3 sm:px-4 pt-1.5 pb-2 shadow-[0_-2px_10px_rgba(59,130,246,0.35)] border-t-2 border-x-2 border-[#93C5FD]/60 -mb-[4px] pb-[10px]'
                    : 'bg-[#1A4DB5] hover:bg-[#225BD0] text-sky-100/90 px-2.5 sm:px-3.5 py-1.5 border-t border-x border-[#60A5FA]/35'
                }`}
              >
                <Icon className={isLandscapeCompact ? 'w-5 h-5 sm:w-6 sm:h-6 shrink-0' : 'w-6 h-6 sm:w-7 sm:h-7 shrink-0'} />
                <span className={`text-[11px] sm:text-xs ${active ? 'drop-shadow-[0_1px_0_rgba(15,23,42,0.85)]' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Toast Feedback Banner */}
      {notice && (
        <div
          role="status"
          data-testid="workshop-notice"
          className={`absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-xl border-2 animate-modal-in ${
            notice.tone === 'success'
              ? 'bg-[#22C55E] border-white text-slate-950'
              : 'bg-rose-500 border-rose-200 text-white'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* === TAB 1: WORMS SHOP (30 SKINS) === */}
        {activeTab === 'skins' && (
          <div className="h-full grid grid-cols-[1.55fr_1fr] gap-2.5 sm:gap-4 p-2.5 sm:p-3.5 min-h-0">
            {/* Left: Category Filter + Scrollable Skin Grid */}
            <div className="flex flex-col min-h-0 bg-[#123B95]/90 border-2 border-[#60A5FA]/40 rounded-2xl p-2 sm:p-2.5">
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {(['all', 'basic', 'rare', 'epic', 'legendary'] as const).map((cat) => {
                    const active = rarityFilter === cat;
                    const count =
                      cat === 'all'
                        ? WORM_SKINS.length
                        : WORM_SKINS.filter((s) => s.rarity === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        data-testid={`skin-filter-${cat}`}
                        onClick={() => setRarityFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#FDE047] text-slate-950 shadow'
                            : 'bg-[#09205B] text-sky-100 hover:bg-[#194BB5]'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-bold text-[#FDE047] whitespace-nowrap">
                  Owned {profile.ownedSkins.length}/{WORM_SKINS.length}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
                {filteredSkins.map((skin) => {
                  const owned = profile.ownedSkins.includes(skin.id);
                  const equipped = profile.equippedSkinId === skin.id;
                  const inspecting = previewSkin.id === skin.id;
                  const rarityMeta = RARITY_STYLES[skin.rarity];
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      data-testid={`shop-skin-${skin.id}`}
                      onClick={() => setPreviewSkinId(skin.id)}
                      className={`relative rounded-xl p-1.5 pb-2.5 flex flex-col items-center text-center border-2 transition-transform active:scale-95 cursor-pointer ${
                        inspecting
                          ? 'bg-[#2563EB] border-[#4ADE80] ring-2 ring-[#4ADE80]/60 shadow-[0_0_12px_rgba(74,222,128,0.45)]'
                          : 'bg-[#1D54C4]/80 border-[#60A5FA]/35 hover:border-[#93C5FD]'
                      }`}
                    >
                      <SkinBadgeSvg skin={skin} className="w-full h-7" />
                      <div className="text-[11px] font-bold text-white truncate w-full mt-0.5">
                        {skin.name}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold mt-0.5">
                        {equipped ? (
                          <span className="text-[#4ADE80]">Selected</span>
                        ) : owned ? (
                          <span className="text-sky-200">Select</span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[#FDE047] font-mono-num">
                            <CoinIcon className="w-3 h-3" />
                            {skin.price}
                          </span>
                        )}
                        <span aria-hidden="true" className="text-sky-300/40">·</span>
                        <span className={rarityMeta.text}>{rarityMeta.label}</span>
                      </div>
                      {equipped && <GreenCheckBadge placement="top-right" />}
                      {!owned && <LockBadge />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Preview + Select/Selected/Purchase */}
            <div className="flex flex-col justify-between bg-[#123B95]/95 border-2 border-[#60A5FA]/45 rounded-2xl p-2.5 sm:p-3 min-h-0">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
                      RARITY_STYLES[previewSkin.rarity].badge
                    } ${RARITY_STYLES[previewSkin.rarity].text}`}
                  >
                    {RARITY_STYLES[previewSkin.rarity].label}
                  </span>
                  <span className="text-[11px] font-semibold text-sky-200 capitalize">
                    {previewSkin.faceStyle} · {previewSkin.bodyAnim}
                  </span>
                </div>

                <div className="rounded-xl bg-[#360B3E] border-2 border-[#60A5FA]/40 p-1.5 mb-2">
                  <SkinLivePreviewCanvas skin={previewSkin} />
                </div>

                <h3 className="font-display font-bold text-base sm:text-xl text-[#FDE047]">
                  {previewSkin.name}
                </h3>
                <p className="text-xs text-sky-100/95 mt-0.5 leading-snug">
                  {previewSkin.description}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 pt-2">
                {isPreviewSkinEquipped ? (
                  <button
                    type="button"
                    disabled
                    data-testid="skin-action-equipped"
                    className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] text-white font-display font-bold text-sm sm:text-base border-b-4 border-[#14532D] flex items-center justify-center gap-1.5"
                  >
                    <span className="text-[#FDE047]">✓</span> Selected
                  </button>
                ) : isPreviewSkinOwned ? (
                  <button
                    type="button"
                    data-testid="skin-action-equip"
                    disabled={busyKey !== null}
                    onClick={() =>
                      runAction(
                        `equip-${previewSkin.id}`,
                        () => onEquipSkin(previewSkin.id),
                        `${previewSkin.name} selected!`
                      )
                    }
                    className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white font-display font-bold text-base border-b-4 border-[#14532D] shadow cursor-pointer"
                  >
                    Select
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="skin-action-buy"
                    disabled={busyKey !== null || profile.coins < previewSkin.price}
                    onClick={() =>
                      runAction(
                        `buy-${previewSkin.id}`,
                        () => onBuySkin(previewSkin.id),
                        `Unlocked & selected ${previewSkin.name}!`
                      )
                    }
                    className={`w-full h-10 sm:h-11 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 border-b-4 cursor-pointer ${
                      profile.coins >= previewSkin.price
                        ? 'bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white border-[#14532D]'
                        : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                    }`}
                  >
                    <CoinIcon className="w-5 h-5" />
                    <span>
                      {profile.coins >= previewSkin.price
                        ? `${previewSkin.price.toLocaleString()}`
                        : `Need ${previewSkin.price.toLocaleString()}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === TAB 2: CARDS / COLLECTIONS + DAILY REWARDS & OFFERS === */}
        {activeTab === 'cards' && (
          <div className="h-full overflow-y-auto p-2.5 sm:p-3.5 flex flex-col gap-2.5 pr-2">
            {/* Collection Cards Row */}
            <div className="bg-[#123B95]/95 border-2 border-[#60A5FA]/40 rounded-2xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-[#FDE047]">
                  Collection Cards
                </h3>
                <span className="text-[11px] font-bold text-sky-200">
                  Complete sets to earn bonus coins
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLLECTION_GOALS.map((goal) => {
                  const current = getCollectionProgress(profile, goal.kind);
                  const claimed = profile.claimedCollections.includes(goal.id);
                  const ready = !claimed && current >= goal.target;
                  const pct = Math.min(100, Math.round((current / goal.target) * 100));
                  return (
                    <div
                      key={goal.id}
                      data-testid={`collection-card-${goal.id}`}
                      className="rounded-xl bg-[#0A225C] border-2 border-[#60A5FA]/35 p-2 flex flex-col justify-between gap-1.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display font-bold text-xs text-white truncate">
                            {goal.title}
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] font-mono-num font-bold text-[#FDE047] shrink-0">
                            <CoinIcon className="w-3.5 h-3.5" />+{goal.rewardCoins}
                          </span>
                        </div>
                        <p className="text-[10px] text-sky-200 leading-tight mt-0.5">
                          {goal.subtitle}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-sky-100 mb-1">
                          <span>Progress</span>
                          <span className="font-mono-num">
                            {Math.min(current, goal.target)}/{goal.target}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#061336] overflow-hidden mb-1.5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: goal.accentColor }}
                          />
                        </div>
                        {claimed ? (
                          <button
                            type="button"
                            disabled
                            className="w-full h-7 rounded-lg bg-emerald-600/75 text-white font-display font-bold text-[11px]"
                          >
                            ✓ Collected
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`claim-collection-${goal.id}`}
                            disabled={!ready || busyKey !== null}
                            onClick={() =>
                              runAction(
                                `col-${goal.id}`,
                                () => onClaimCollection(goal.id),
                                `Claimed +${goal.rewardCoins} Coins for ${goal.title}!`
                              )
                            }
                            className={`w-full h-7 rounded-lg font-display font-bold text-[11px] border-b-2 cursor-pointer ${
                              ready
                                ? 'bg-[#22C55E] hover:bg-[#4ADE80] text-slate-950 border-[#15803D]'
                                : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                            }`}
                          >
                            {ready ? `Claim +${goal.rewardCoins}` : `${goal.target - Math.min(current, goal.target)} left`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Login Rewards Strip */}
            <div className="bg-[#123B95]/95 border-2 border-[#60A5FA]/40 rounded-2xl p-2.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-display font-bold text-sm sm:text-base text-[#FDE047]">
                    Daily Login Rewards
                  </h3>
                  <p className="text-[11px] text-sky-200">
                    Streak: {profile.dailyStreak} day(s) · Day 7 unlocks Neon Prism Epic skin
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="claim-daily-btn"
                  disabled={!dailyReady || busyKey !== null}
                  onClick={() =>
                    runAction('daily', onClaimDaily, `Claimed Day ${nextDailyIndex + 1} Daily Reward!`)
                  }
                  className={`px-4 h-9 rounded-xl font-display font-bold text-xs sm:text-sm border-b-4 whitespace-nowrap shrink-0 cursor-pointer ${
                    dailyReady
                      ? 'bg-[#22C55E] hover:bg-[#4ADE80] text-slate-950 border-[#15803D]'
                      : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                  }`}
                >
                  {dailyReady ? `Claim Day ${nextDailyIndex + 1}` : 'Claimed Today'}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {DAILY_REWARDS.map((step, idx) => {
                  const isNext = dailyReady && idx === nextDailyIndex;
                  const completed =
                    idx < (profile.dailyStreak % DAILY_REWARDS.length) && !(dailyReady && idx === nextDailyIndex);
                  return (
                    <div
                      key={step.day}
                      className={`rounded-xl p-1.5 text-center border ${
                        isNext
                          ? 'bg-[#2563EB] border-[#FDE047]'
                          : completed
                          ? 'bg-emerald-900/55 border-emerald-400/60'
                          : 'bg-[#09205B] border-sky-400/25'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-sky-200">{step.label}</div>
                      <div className="flex items-center justify-center gap-0.5 text-xs font-mono-num font-bold text-[#FDE047] mt-0.5">
                        <CoinIcon className="w-3.5 h-3.5" />
                        {step.coins}
                      </div>
                      {step.bonusSkinId && (
                        <div className="text-[9px] font-bold text-fuchsia-300 mt-0.5">+Skin</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Free Coin Gift + Rewarded Video Ad */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#123B95]/95 border-2 border-[#60A5FA]/40 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#FDE047]">Free Coin Gift</h3>
                  <p className="text-[11px] text-sky-100">+{FREE_COINS_AMOUNT} free coins every 3 minutes</p>
                </div>
                <button
                  type="button"
                  data-testid="claim-free-coins-btn"
                  disabled={freeCooldownMs > 0 || busyKey !== null}
                  onClick={() =>
                    runAction('free-coins', onClaimFreeCoins, `+${FREE_COINS_AMOUNT} Free Coins added!`)
                  }
                  className={`px-3.5 h-9 rounded-xl font-display font-bold text-xs sm:text-sm border-b-4 whitespace-nowrap shrink-0 cursor-pointer ${
                    freeCooldownMs === 0
                      ? 'bg-[#22C55E] hover:bg-[#4ADE80] text-slate-950 border-[#15803D]'
                      : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                  }`}
                >
                  {freeCooldownMs === 0
                    ? `Claim +${FREE_COINS_AMOUNT}`
                    : `Wait ${Math.ceil(freeCooldownMs / 1000)}s`}
                </button>
              </div>

              <div className="bg-[#123B95]/95 border-2 border-[#60A5FA]/40 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#FDE047]">Rewarded Video Ad</h3>
                  <p className="text-[11px] text-sky-100">
                    Short promo clip for +{AD_REWARD_COINS} Coins ({profile.adsWatchedCount} watched)
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="watch-ad-btn"
                  disabled={busyKey !== null || adModalCountdown !== null}
                  onClick={() => setAdModalCountdown(3)}
                  className="px-3.5 h-9 rounded-xl bg-sky-400 hover:bg-sky-300 active:translate-y-0.5 text-slate-950 font-display font-bold text-xs sm:text-sm border-b-4 border-sky-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Watch Ad +{AD_REWARD_COINS}
                </button>
              </div>
            </div>

            {/* Special Offers */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#FDE047] mb-1.5">
                Special Offers & Premium Bundles
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {SPECIAL_OFFERS.map((offer) => {
                  const owned = profile.claimedOffers.includes(offer.id);
                  const canAfford = profile.coins >= offer.price;
                  return (
                    <div
                      key={offer.id}
                      data-testid={`special-offer-${offer.id}`}
                      className="bg-[#123B95]/95 border-2 border-[#FDE047]/45 rounded-2xl p-2.5 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-display font-bold text-xs sm:text-sm text-white leading-tight">
                            {offer.title}
                          </span>
                          <span className="text-[10px] font-bold text-[#FDE047] whitespace-nowrap">
                            {offer.badge}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-sky-100 leading-snug">{offer.subtitle}</p>
                      </div>

                      {owned ? (
                        <button
                          type="button"
                          disabled
                          className="w-full h-8 rounded-xl bg-emerald-500 text-slate-950 font-display font-bold text-xs border-b-4 border-emerald-700"
                        >
                          Purchased
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`buy-offer-${offer.id}`}
                          disabled={busyKey !== null || !canAfford}
                          onClick={() =>
                            runAction(`offer-${offer.id}`, () => onBuyOffer(offer.id), `Unlocked ${offer.title}!`)
                          }
                          className={`w-full h-8 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border-b-4 cursor-pointer ${
                            canAfford
                              ? 'bg-[#22C55E] hover:bg-[#4ADE80] text-slate-950 border-[#15803D]'
                              : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                          }`}
                        >
                          <CoinIcon className="w-4 h-4" />
                          <span>Buy · {offer.price}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* === TAB 3: WORM UPGRADES (6 POWER-UPS WITH PLUS "+" PURCHASE BUTTONS) === */}
        {activeTab === 'upgrades' && (
          <div className="h-full overflow-y-auto p-2.5 sm:p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 content-start">
            {POWER_UPS.map((def) => {
              const level = profile.upgrades[def.id] ?? 0;
              const nextPrice = getNextUpgradePrice(profile, def.id);
              const currentDur = level > 0 ? def.durations[level - 1] : 0;
              const nextDur = level < def.maxLevel ? def.durations[level] : def.durations[def.maxLevel - 1];
              const currentEffect = level > 0 ? def.formatEffect(def.effectValues[level - 1]) : 'Locked';
              const nextEffect =
                level < def.maxLevel
                  ? def.formatEffect(def.effectValues[level])
                  : def.formatEffect(def.effectValues[def.maxLevel - 1]);
              const canAfford = nextPrice !== null && profile.coins >= nextPrice;

              return (
                <div
                  key={def.id}
                  data-testid={`upgrade-card-${def.id}`}
                  className={`bg-gradient-to-b from-[#1A4DB5] to-[#11368B] border-2 border-[#60A5FA]/45 rounded-2xl flex flex-col justify-between shadow-lg ${
                    isLandscapeCompact ? 'p-2 gap-1.5' : 'p-3 gap-2'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`rounded-xl bg-[#09205B] border-2 border-[#60A5FA]/40 flex items-center justify-center shrink-0 ${
                            isLandscapeCompact ? 'w-8 h-8' : 'w-10 h-10'
                          }`}
                        >
                          <PowerUpIcon
                            id={def.id}
                            color={def.color}
                            className={isLandscapeCompact ? 'w-5 h-5' : 'w-6 h-6'}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-[#FDE047] text-sm sm:text-base leading-tight truncate">
                            {def.name}
                          </h3>
                          <div className="text-[10.5px] font-bold text-sky-100 font-mono-num whitespace-nowrap">
                            Lv {level}/{def.maxLevel} · ⏱ {level > 0 ? `${currentDur}s` : `${nextDur}s`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p
                      className={`text-sky-100/95 leading-snug ${
                        isLandscapeCompact ? 'text-[10px] mb-1 line-clamp-1' : 'text-[11px] mb-1.5'
                      }`}
                    >
                      {def.shortDesc}
                    </p>

                    {/* Level Progress Pips */}
                    <div className="grid grid-cols-5 gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div
                          key={step}
                          className={`rounded-sm ${isLandscapeCompact ? 'h-1.5' : 'h-2'} ${
                            step <= level ? 'bg-[#4ADE80]' : 'bg-[#081A4B]'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] font-semibold">
                      <span className="text-sky-200">{currentEffect}</span>
                      {level < def.maxLevel && (
                        <span className="text-[#4ADE80]">Next: {nextEffect} ({nextDur}s)</span>
                      )}
                    </div>
                  </div>

                  {nextPrice === null ? (
                    <button
                      type="button"
                      disabled
                      className={`w-full rounded-xl bg-[#22C55E] text-white font-display font-bold text-xs border-b-4 border-[#15803D] ${
                        isLandscapeCompact ? 'h-8' : 'h-9'
                      }`}
                    >
                      ✓ Max Level
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex-1 rounded-xl bg-[#09205B] border border-[#60A5FA]/35 flex items-center justify-center gap-1.5 font-mono-num font-bold text-[#FDE047] ${
                          isLandscapeCompact ? 'h-8 text-xs' : 'h-9 text-sm'
                        }`}
                      >
                        <CoinIcon className="w-4 h-4" />
                        <span>{nextPrice}</span>
                      </div>
                      <button
                        type="button"
                        data-testid={`upgrade-buy-${def.id}`}
                        aria-label={`Upgrade ${def.name} for ${nextPrice} coins`}
                        disabled={busyKey !== null || !canAfford}
                        onClick={() =>
                          runAction(
                            `upgrade-${def.id}`,
                            () => onBuyUpgrade(def.id),
                            `Upgraded ${def.name} to Level ${level + 1}!`
                          )
                        }
                        className={`px-3.5 rounded-xl font-display font-bold flex items-center justify-center gap-1 border-b-4 shrink-0 cursor-pointer ${
                          isLandscapeCompact ? 'h-8 text-base' : 'h-9 text-lg'
                        } ${
                          canAfford
                            ? 'bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white border-[#14532D]'
                            : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                        }`}
                      >
                        <span>+</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* === TAB 4: ARENA DECOR (3-COLUMN REFERENCE LAYOUT) === */}
        {activeTab === 'decor' && (
          <div className="h-full flex min-h-0 overflow-hidden bg-[#1D54B5]">
            {/* LEFT SIDEBAR: 3 Vertical Sub-Category Icon Buttons */}
            <aside
              aria-label="Arena Decor Categories"
              className="w-14 sm:w-[70px] shrink-0 bg-gradient-to-b from-[#15429E] to-[#0E317D] border-r-2 border-[#3B7BF2]/70 flex flex-col items-center gap-2.5 py-3 px-1.5"
            >
              {(
                [
                  { id: 'backgrounds', label: 'Backgrounds', Icon: BgSubTabIcon },
                  { id: 'foods', label: 'Food Items', Icon: FoodSubTabIcon },
                  { id: 'special', label: 'Special Decorations', Icon: SpecialSubTabIcon },
                ] as Array<{ id: DecorSubTab; label: string; Icon: React.FC<{ className?: string }> }>
              ).map(({ id, label, Icon }) => {
                const active = decorSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`decor-subtab-${id}`}
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => setDecorSubTab(id)}
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border-2 transition-transform active:scale-95 cursor-pointer ${
                      active
                        ? 'bg-[#3B82F6] border-[#4ADE80] ring-2 ring-[#4ADE80]/55 shadow-lg'
                        : 'bg-[#1D4ED8]/70 hover:bg-[#2563EB] border-[#60A5FA]/40'
                    }`}
                  >
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                  </button>
                );
              })}
            </aside>

            {/* CENTER PANEL: Live Animated Arena Preview */}
            <div className="flex-1 min-w-0 relative bg-[#19051F] overflow-hidden">
              <ArenaDecorStageCanvas
                decor={decorSubTab === 'backgrounds' ? previewDecor : getDecorById(profile.equippedDecorId)}
                skin={equippedSkin}
                selectedFoods={profile.selectedFoods}
                spotlightFoodId={decorSubTab === 'foods' ? previewFood.id : undefined}
                specialDecorId={
                  decorSubTab === 'special' ? previewSpecial.id : profile.equippedSpecialDecorId
                }
              />

              {/* Compact Bottom-Left Context Caption */}
              <div className="pointer-events-none absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-[#071333]/80 border border-[#60A5FA]/35 text-[10.5px] sm:text-xs font-bold text-white shadow">
                {decorSubTab === 'backgrounds' && (
                  <span>
                    <span className="text-[#FDE047]">{previewDecor.name}</span> · {ARENA_DECORS.length} Themes
                  </span>
                )}
                {decorSubTab === 'foods' && (
                  <span>
                    <span className="text-[#FDE047]">{previewFood.name}</span> · {profile.selectedFoods.length}/
                    {FOOD_CATALOG.length} Active in Arena
                  </span>
                )}
                {decorSubTab === 'special' && (
                  <span>
                    <span className="text-[#FDE047]">{previewSpecial.name}</span> · {previewSpecial.description}
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: Scrollable 2-Column Blue Tile Grid + Green Action Button */}
            <div className="w-[186px] sm:w-[248px] md:w-[270px] shrink-0 flex flex-col bg-gradient-to-b from-[#235DC7] to-[#17469F] border-l-2 border-[#60A5FA]/50 p-2 min-h-0">
              {/* Header Bar above 2-Col Grid */}
              <div className="flex items-center justify-between gap-1 mb-1.5 shrink-0">
                <span className="font-display font-bold text-xs sm:text-sm text-[#FDE047] truncate">
                  {decorSubTab === 'backgrounds'
                    ? 'Backgrounds'
                    : decorSubTab === 'foods'
                    ? 'Food Items'
                    : 'Special Decor'}
                </span>
                {decorSubTab === 'foods' && (
                  <button
                    type="button"
                    data-testid="food-mix-all-btn"
                    disabled={busyKey !== null}
                    onClick={() =>
                      runAction(
                        'mix-all-foods',
                        onSelectAllFoods,
                        `Activated all ${profile.ownedFoods.length} unlocked food items!`
                      )
                    }
                    className="px-2 py-0.5 rounded-lg bg-[#0D2E7E] hover:bg-[#1542B0] border border-[#4ADE80]/60 text-[10px] font-bold text-[#4ADE80] cursor-pointer whitespace-nowrap"
                  >
                    Mix All ({profile.ownedFoods.length})
                  </button>
                )}
              </div>

              {/* 2-Column Scrollable Grid */}
              <div
                data-testid="decor-right-grid"
                className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-2 gap-2 content-start"
              >
                {decorSubTab === 'backgrounds' &&
                  ARENA_DECORS.map((decor) => {
                    const owned = profile.ownedDecors.includes(decor.id);
                    const equipped = profile.equippedDecorId === decor.id;
                    const inspecting = previewDecor.id === decor.id;
                    return (
                      <button
                        key={decor.id}
                        type="button"
                        data-testid={`decor-card-${decor.id}`}
                        aria-label={`${decor.name} Background`}
                        onClick={() => setPreviewDecorId(decor.id)}
                        className={`relative aspect-square rounded-2xl overflow-hidden bg-[#1D54B5] border-[3px] transition-transform active:scale-95 cursor-pointer ${
                          inspecting
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/65 shadow-[0_0_12px_rgba(74,222,128,0.6)]'
                            : 'border-[#60A5FA]/50 hover:border-[#93C5FD]'
                        }`}
                      >
                        <DecorTileCanvas decor={decor} />
                        {equipped && <GreenCheckBadge />}
                        {!owned && <LockBadge />}
                      </button>
                    );
                  })}

                {decorSubTab === 'foods' &&
                  FOOD_CATALOG.map((food) => {
                    const owned = profile.ownedFoods.includes(food.id);
                    const activeInArena = profile.selectedFoods.includes(food.id);
                    const inspecting = previewFood.id === food.id;
                    return (
                      <button
                        key={food.id}
                        type="button"
                        data-testid={`food-card-${food.id}`}
                        aria-label={`${food.name} Food`}
                        onClick={() => setPreviewFoodId(food.id)}
                        className={`relative aspect-square rounded-2xl p-1.5 bg-gradient-to-b from-[#3377EA] to-[#235AC2] border-[3px] transition-transform active:scale-95 cursor-pointer ${
                          inspecting
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/65 shadow-[0_0_12px_rgba(74,222,128,0.6)]'
                            : 'border-[#60A5FA]/45 hover:border-[#93C5FD]'
                        }`}
                      >
                        <FoodTileCanvas foodId={food.id} />
                        {activeInArena && <GreenCheckBadge />}
                        {!owned && <LockBadge />}
                      </button>
                    );
                  })}

                {decorSubTab === 'special' &&
                  SPECIAL_DECORS.map((special) => {
                    const owned = profile.ownedSpecialDecors.includes(special.id);
                    const equipped = profile.equippedSpecialDecorId === special.id;
                    const inspecting = previewSpecial.id === special.id;
                    return (
                      <button
                        key={special.id}
                        type="button"
                        data-testid={`special-card-${special.id}`}
                        aria-label={special.name}
                        onClick={() => setPreviewSpecialId(special.id)}
                        className={`relative aspect-square rounded-2xl p-1.5 bg-gradient-to-b from-[#3377EA] to-[#235AC2] border-[3px] transition-transform active:scale-95 cursor-pointer ${
                          inspecting
                            ? 'border-[#4ADE80] ring-2 ring-[#4ADE80]/65 shadow-[0_0_12px_rgba(74,222,128,0.6)]'
                            : 'border-[#60A5FA]/45 hover:border-[#93C5FD]'
                        }`}
                      >
                        <SpecialDecorTileCanvas special={special} />
                        {equipped && <GreenCheckBadge />}
                        {!owned && <LockBadge />}
                      </button>
                    );
                  })}
              </div>

              {/* Bottom Green Action Button (Use / Selected / [Coin] Price) */}
              <div className="pt-2 shrink-0">
                {decorSubTab === 'backgrounds' && (
                  <>
                    {isPreviewDecorEquipped ? (
                      <button
                        type="button"
                        disabled
                        data-testid="decor-action-equipped"
                        className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] text-[#FDE047] font-display font-bold text-sm sm:text-base border-b-4 border-[#14532D] flex items-center justify-center gap-1.5 shadow"
                      >
                        <span className="text-[#22C55E] bg-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                        <span>Selected</span>
                      </button>
                    ) : isPreviewDecorOwned ? (
                      <button
                        type="button"
                        data-testid="decor-action-equip"
                        disabled={busyKey !== null}
                        onClick={() =>
                          runAction(
                            `equip-decor-${previewDecor.id}`,
                            () => onEquipDecor(previewDecor.id),
                            `${previewDecor.name} background selected!`
                          )
                        }
                        className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white font-display font-bold text-base border-b-4 border-[#14532D] shadow cursor-pointer"
                      >
                        Use
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="decor-action-buy"
                        disabled={busyKey !== null || profile.coins < previewDecor.price}
                        onClick={() =>
                          runAction(
                            `buy-decor-${previewDecor.id}`,
                            () => onBuyDecor(previewDecor.id),
                            `Unlocked & activated ${previewDecor.name}!`
                          )
                        }
                        className={`w-full h-10 sm:h-11 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 border-b-4 cursor-pointer ${
                          profile.coins >= previewDecor.price
                            ? 'bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white border-[#14532D]'
                            : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                        }`}
                      >
                        <CoinIcon className="w-5 h-5" />
                        <span>{previewDecor.price.toLocaleString()}</span>
                      </button>
                    )}
                  </>
                )}

                {decorSubTab === 'foods' && (
                  <>
                    {!isPreviewFoodOwned ? (
                      <button
                        type="button"
                        data-testid="food-action-buy"
                        disabled={busyKey !== null || profile.coins < previewFood.price}
                        onClick={() =>
                          runAction(
                            `buy-food-${previewFood.id}`,
                            () => onBuyFood(previewFood.id),
                            `Unlocked & added ${previewFood.name} to arena menu!`
                          )
                        }
                        className={`w-full h-10 sm:h-11 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 border-b-4 cursor-pointer ${
                          profile.coins >= previewFood.price
                            ? 'bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white border-[#14532D]'
                            : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                        }`}
                      >
                        <CoinIcon className="w-5 h-5" />
                        <span>{previewFood.price.toLocaleString()}</span>
                      </button>
                    ) : isPreviewFoodSelected ? (
                      <button
                        type="button"
                        data-testid="food-action-selected"
                        disabled={busyKey !== null || profile.selectedFoods.length <= 1}
                        onClick={() =>
                          runAction(
                            `toggle-food-${previewFood.id}`,
                            () => onToggleFood(previewFood.id, 'toggle'),
                            `Removed ${previewFood.name} from arena menu.`
                          )
                        }
                        className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] text-[#FDE047] font-display font-bold text-sm sm:text-base border-b-4 border-[#14532D] flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:cursor-default"
                      >
                        <span className="text-[#22C55E] bg-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                        <span>
                          {profile.selectedFoods.length > 1 ? 'Selected (Tap Off)' : 'Selected'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="food-action-use"
                        disabled={busyKey !== null}
                        onClick={() =>
                          runAction(
                            `use-food-${previewFood.id}`,
                            () => onToggleFood(previewFood.id, 'add'),
                            `${previewFood.name} added to arena foods!`
                          )
                        }
                        className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white font-display font-bold text-base border-b-4 border-[#14532D] shadow cursor-pointer"
                      >
                        Use
                      </button>
                    )}
                  </>
                )}

                {decorSubTab === 'special' && (
                  <>
                    {isPreviewSpecialEquipped ? (
                      <button
                        type="button"
                        disabled
                        data-testid="special-action-equipped"
                        className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] text-[#FDE047] font-display font-bold text-sm sm:text-base border-b-4 border-[#14532D] flex items-center justify-center gap-1.5 shadow"
                      >
                        <span className="text-[#22C55E] bg-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                        <span>Selected</span>
                      </button>
                    ) : isPreviewSpecialOwned ? (
                      <button
                        type="button"
                        data-testid="special-action-equip"
                        disabled={busyKey !== null}
                        onClick={() =>
                          runAction(
                            `equip-special-${previewSpecial.id}`,
                            () => onEquipSpecialDecor(previewSpecial.id),
                            `${previewSpecial.name} activated!`
                          )
                        }
                        className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white font-display font-bold text-base border-b-4 border-[#14532D] shadow cursor-pointer"
                      >
                        Use
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="special-action-buy"
                        disabled={busyKey !== null || profile.coins < previewSpecial.price}
                        onClick={() =>
                          runAction(
                            `buy-special-${previewSpecial.id}`,
                            () => onBuySpecialDecor(previewSpecial.id),
                            `Unlocked & activated ${previewSpecial.name}!`
                          )
                        }
                        className={`w-full h-10 sm:h-11 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 border-b-4 cursor-pointer ${
                          profile.coins >= previewSpecial.price
                            ? 'bg-gradient-to-b from-[#4ADE80] to-[#16A34A] hover:from-[#86EFAC] hover:to-[#22C55E] active:translate-y-0.5 text-white border-[#14532D]'
                            : 'bg-slate-700 text-slate-300 border-slate-900 cursor-not-allowed'
                        }`}
                      >
                        <CoinIcon className="w-5 h-5" />
                        <span>{previewSpecial.price.toLocaleString()}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Simulated Rewarded Video Ad Overlay */}
      {adModalCountdown !== null && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#040c24]/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Rewarded Ad Playback"
          data-testid="rewarded-ad-overlay"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0e327d] border-2 border-[#FDE047] p-5 text-center shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-wider text-[#FDE047] mb-1">
              Sponsored Arcade Spotlight
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">
              Wormz Turbo Boosters
            </h3>
            <div className="rounded-xl bg-[#360B3E] border border-[#60A5FA]/35 p-3 mb-3">
              <SkinLivePreviewCanvas skin={getSkinById('rainbow-aurora')} />
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#07163e] overflow-hidden mb-2">
              <div
                className="h-full bg-[#FDE047] transition-transform duration-300 origin-left"
                style={{ transform: `scaleX(${(3 - adModalCountdown) / 3})` }}
              />
            </div>
            <p className="text-sm font-bold text-sky-100">
              Rewarding +{AD_REWARD_COINS} Coins in {adModalCountdown}s...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
