import React, { useEffect, useRef } from 'react';
import {
  drawCartoonFood,
  drawSkinPreviewWorm,
  drawSpecialDecorationLayer,
  drawWormBodyAndHead,
  renderFloorPatternTile,
} from '../game/renderer';
import type {
  ArenaDecorTheme,
  FoodItemId,
  PowerUpId,
  SpecialDecorDefinition,
  SpecialDecorId,
  Worm,
  WormSkin,
} from '../game/types';
import { getFoodById } from '../game/workshopData';

export const CoinIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="wormCoinGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#D97706" />
      </radialGradient>
    </defs>
    <circle cx="14" cy="14" r="12.5" fill="url(#wormCoinGrad)" stroke="#78350F" strokeWidth="1.8" />
    <circle cx="14" cy="14" r="9.2" fill="#FDE047" stroke="#B45309" strokeWidth="1.2" />
    {/* Smiling worm face */}
    <ellipse cx="11.2" cy="12" rx="2.1" ry="2.5" fill="#78350F" />
    <ellipse cx="16.8" cy="12" rx="2.1" ry="2.5" fill="#78350F" />
    <circle cx="11.6" cy="11.2" r="0.8" fill="#FEF9C3" />
    <circle cx="17.2" cy="11.2" r="0.8" fill="#FEF9C3" />
    <path
      d="M10.2 16.2c1.2 2 6.4 2 7.6 0"
      fill="none"
      stroke="#78350F"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

export const WormsShopTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    {/* Yellow happy worm peeking out of blue shopping basket */}
    <path
      d="M14 20c0-7.5 3.8-13 8-13 3.5 0 6 3 6 8v5"
      fill="#FACC15"
      stroke="#854D0E"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="20.2" cy="12.5" r="2.2" fill="#FFF" stroke="#0F172A" strokeWidth="0.9" />
    <circle cx="20.6" cy="12.5" r="1.1" fill="#0F172A" />
    <circle cx="24.5" cy="12.5" r="2.2" fill="#FFF" stroke="#0F172A" strokeWidth="0.9" />
    <circle cx="24.9" cy="12.5" r="1.1" fill="#0F172A" />
    <path d="M20.2 16.4c1.3 1.2 3.3 1.2 4.5 0" fill="none" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" />
    {/* Blue shopping basket */}
    <path d="M6 21h28l-3.2 12.5a2.2 2.2 0 01-2.1 1.6H11.3a2.2 2.2 0 01-2.1-1.6L6 21z" fill="#38BDF8" stroke="#0C4A6E" strokeWidth="2" strokeLinejoin="round" />
    <rect x="4.5" y="19" width="31" height="4" rx="2" fill="#7DD3FC" stroke="#0C4A6E" strokeWidth="1.6" />
    <path d="M13 25v6M20 25v6M27 25v6" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CardsTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <g transform="rotate(-12 16 22)">
      <rect x="7" y="8" width="17" height="24" rx="3" fill="#C084FC" stroke="#4C1D95" strokeWidth="2" />
      <rect x="9.5" y="11" width="12" height="14" rx="1.5" fill="#FDE047" />
      <circle cx="15.5" cy="18" r="4" fill="#9333EA" />
    </g>
    <g transform="rotate(11 25 22)">
      <rect x="16" y="8" width="17" height="24" rx="3" fill="#FDE047" stroke="#854D0E" strokeWidth="2" />
      <rect x="18.5" y="11" width="12" height="14" rx="1.5" fill="#38BDF8" />
      <circle cx="24.5" cy="18" r="4.2" fill="#FB923C" />
      <circle cx="23.4" cy="17.2" r="1.1" fill="#FFF" />
      <circle cx="25.8" cy="17.2" r="1.1" fill="#FFF" />
    </g>
  </svg>
);

export const UpgradesTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    {/* Cool worm */}
    <path d="M11 33c1-11 2.2-19 7-19s6 7 6.5 19z" fill="#FACC15" stroke="#854D0E" strokeWidth="2" />
    {/* Cap */}
    <path d="M11.5 14c1-4 4-6.5 7.5-6.5 4 0 6.8 2.5 7.3 6.5H11.5z" fill="#F97316" stroke="#7C2D12" strokeWidth="1.8" />
    <path d="M19 12.8h10c1 0 1.3 1.4 0 1.8H19" fill="#EF4444" stroke="#7C2D12" strokeWidth="1.4" />
    {/* Shades */}
    <rect x="12.5" y="15.5" width="5.2" height="3.6" rx="1" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1" />
    <rect x="19" y="15.5" width="5.2" height="3.6" rx="1" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1" />
    {/* Green up arrow */}
    <path d="M29 14l6.5 7h-4v11h-5V21h-4L29 14z" fill="#4ADE80" stroke="#14532D" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const ArenaDecorTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    {/* Isometric patterned floor swatch */}
    <rect x="5" y="9" width="20" height="20" rx="3.5" fill="#7C3AED" stroke="#3B0764" strokeWidth="2" />
    <circle cx="11" cy="15" r="2.2" fill="#4C1D95" />
    <circle cx="19" cy="15" r="2.2" fill="#4C1D95" />
    <circle cx="11" cy="23" r="2.2" fill="#4C1D95" />
    <circle cx="19" cy="23" r="2.2" fill="#4C1D95" />
    {/* Glowing orange orb */}
    <circle cx="27" cy="21" r="8.5" fill="#FB923C" stroke="#7C2D12" strokeWidth="1.8" />
    <circle cx="24.8" cy="18.2" r="2.5" fill="#FEF08A" opacity="0.85" />
    {/* Plus sparkle */}
    <path d="M12 27v6M9 30h6" stroke="#FACC15" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

export const BgSubTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <rect x="4" y="6" width="28" height="24" rx="4" fill="#FACC15" stroke="#854D0E" strokeWidth="2" />
    <rect x="7" y="9" width="22" height="18" rx="2" fill="#38BDF8" />
    <circle cx="13" cy="14.5" r="2.5" fill="#FEF08A" />
    <path d="M7 25l6.5-7 5 5.5 4.2-4 6.3 5.5v2H7z" fill="#22C55E" />
  </svg>
);

export const FoodSubTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    {/* Cloche dome + sandwich plate */}
    <path d="M8 21c0-6.2 4.5-10.5 10-10.5S28 14.8 28 21H8z" fill="#BAE6FD" stroke="#0369A1" strokeWidth="1.8" />
    <circle cx="18" cy="8.5" r="2.2" fill="#7DD3FC" stroke="#0369A1" strokeWidth="1.5" />
    <rect x="6" y="21.5" width="24" height="3.5" rx="1.6" fill="#FDE047" stroke="#854D0E" strokeWidth="1.5" />
    <rect x="5" y="25" width="26" height="4" rx="2" fill="#22C55E" stroke="#14532D" strokeWidth="1.5" />
  </svg>
);

export const SpecialSubTabIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    {/* Cartoon star flower badge */}
    <rect x="5" y="6" width="26" height="24" rx="5" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
    <circle cx="18" cy="18" r="8.2" fill="#FACC15" stroke="#854D0E" strokeWidth="1.8" />
    <circle cx="15.3" cy="16.2" r="1.4" fill="#451A03" />
    <circle cx="20.7" cy="16.2" r="1.4" fill="#451A03" />
    <path d="M14.8 20c1.4 1.8 5 1.8 6.4 0" fill="none" stroke="#451A03" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const PowerUpIcon: React.FC<{ id: PowerUpId; color: string; className?: string }> = ({
  id,
  color,
  className = 'w-6 h-6',
}) => {
  if (id === 'magnet') {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none" strokeLinecap="round">
        <path d="M7 5v9a7 7 0 0014 0V5" stroke={color} strokeWidth="4.2" />
        <path d="M7 5v3.5M21 5v3.5" stroke="#F8FAFC" strokeWidth="4.2" />
      </svg>
    );
  }
  if (id === 'multiplier') {
    return (
      <svg viewBox="0 0 28 28" className={className}>
        <path
          d="M14 2.8l3.2 6.5 7.2 1-5.2 5.1 1.2 7.2L14 19.2 7.6 22.6l1.2-7.2-5.2-5.1 7.2-1L14 2.8z"
          fill={color}
          stroke="#78350F"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <text x="14" y="16.5" textAnchor="middle" fill="#451A03" fontSize="8" fontWeight="900">
          2X
        </text>
      </svg>
    );
  }
  if (id === 'radar') {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
        <circle cx="14" cy="14" r="10" fill={color} fillOpacity="0.16" />
        <circle cx="14" cy="14" r="5.5" strokeOpacity="0.7" />
        <path d="M14 14l7-7" strokeWidth="2.6" />
        <circle cx="14" cy="14" r="2" fill={color} stroke="none" />
      </svg>
    );
  }
  if (id === 'speed') {
    return (
      <svg viewBox="0 0 28 28" className={className}>
        <path
          d="M15.5 2.5L5 16h7.5l-1.5 9.5L23 12h-7.5l0-9.5z"
          fill={color}
          stroke="#7C2D12"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === 'mobility') {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 16a9 9 0 0116-5.5l2.2-2.2V15h-6.8l2.2-2.2" />
        <path d="M23 12a9 9 0 01-16 5.5" strokeOpacity="0.55" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round">
      <circle cx="12.5" cy="12.5" r="7.5" fill={color} fillOpacity="0.18" />
      <path d="M23 23l-4.8-4.8M12.5 9v7M9 12.5h7" />
    </svg>
  );
};

export const SkinBadgeSvg: React.FC<{ skin: WormSkin; className?: string }> = ({
  skin,
  className = 'w-full h-8',
}) => (
  <svg viewBox="0 0 88 40" className={className} aria-hidden="true">
    <circle cx="14" cy="23" r="6" fill={skin.secondary} stroke={skin.outline} strokeWidth="2" />
    <circle cx="25" cy="18" r="7.5" fill={skin.primary} stroke={skin.outline} strokeWidth="2" />
    <circle cx="37" cy="22" r="8.5" fill={skin.secondary} stroke={skin.outline} strokeWidth="2" />
    <circle cx="49" cy="18" r="9" fill={skin.primary} stroke={skin.outline} strokeWidth="2" />
    <circle cx="61" cy="21" r="10" fill={skin.secondary} stroke={skin.outline} strokeWidth="2" />
    <circle cx="72" cy="20" r="11" fill={skin.primary} stroke={skin.outline} strokeWidth="2" />
    {skin.faceStyle === 'cyber' ? (
      <rect x="69" y="13" width="6" height="14" rx="2.5" fill="#090D1F" stroke={skin.accent} strokeWidth="1.5" />
    ) : skin.faceStyle === 'cool' ? (
      <>
        <rect x="70" y="11.5" width="7" height="6.5" rx="1.5" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1.1" />
        <rect x="70" y="22" width="7" height="6.5" rx="1.5" fill="#0F172A" stroke="#F8FAFC" strokeWidth="1.1" />
      </>
    ) : (
      <>
        <circle cx="75" cy="15" r="3.4" fill="#FFFFFF" stroke={skin.outline} strokeWidth="1.2" />
        <circle cx="76" cy="15" r="1.8" fill={skin.eyeIris} />
        <circle cx="75" cy="25" r="3.4" fill="#FFFFFF" stroke={skin.outline} strokeWidth="1.2" />
        <circle cx="76" cy="25" r="1.8" fill={skin.eyeIris} />
      </>
    )}
  </svg>
);

export const SkinLivePreviewCanvas: React.FC<{ skin: WormSkin }> = ({ skin }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 240;
      const h = canvas.clientHeight || 110;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      drawSkinPreviewWorm(ctx, skin, w, h, elapsed);
      ctx.restore();
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="workshop-skin-preview-canvas"
      className="w-full h-24 sm:h-28 block"
    />
  );
};

export const DecorTileCanvas: React.FC<{ decor: ArenaDecorTheme }> = ({ decor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 96;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderFloorPatternTile(ctx, decor, size, size);
    ctx.restore();
  }, [decor]);

  return <canvas ref={canvasRef} className="w-full h-full block rounded-lg" />;
};

export const FoodTileCanvas: React.FC<{ foodId: FoodItemId }> = ({ foodId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const def = getFoodById(foodId);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 84;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    drawCartoonFood(ctx, size * 0.5, size * 0.52, 22, foodId, def.color, def.glow, 0, '#1D4ED8', false);
    ctx.restore();
  }, [foodId]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

export const SpecialDecorTileCanvas: React.FC<{ special: SpecialDecorDefinition }> = ({ special }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 84;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    const cx = size * 0.5;
    const cy = size * 0.5;

    if (special.id === 'none') {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 13, cy + 13);
      ctx.lineTo(cx + 13, cy - 13);
      ctx.stroke();
    } else if (special.id === 'glow-fireflies') {
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
      grad.addColorStop(0, '#E0F2FE');
      grad.addColorStop(0.38, '#22D3EE');
      grad.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (special.id === 'flower-blossoms') {
      const petals = ['#F472B6', '#FB7185', '#F472B6', '#FB7185', '#F472B6'];
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.fillStyle = petals[i];
        ctx.strokeStyle = '#831843';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 9, 6.5, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (special.id === 'sea-bubbles') {
      const bubbles = [
        [cx - 8, cy + 4, 13],
        [cx + 12, cy - 10, 9],
        [cx + 9, cy + 12, 6],
      ];
      for (const [bx, by, br] of bubbles) {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.25)';
        ctx.strokeStyle = '#67E8F9';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (special.id === 'candy-sparkles') {
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#854D0E';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const r = p % 2 === 0 ? 22 : 9.5;
        const a = (p * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(cx - 18, cy - 16, 4, 0, Math.PI * 2);
      ctx.arc(cx + 19, cy + 15, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (special.id === 'cartoon-badges') {
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#713F12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#451A03';
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 3.5, 2.6, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 3.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 8.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }, [special]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

const STAGE_FOOD_SPOTS = [
  [0.18, 0.24],
  [0.24, 0.72],
  [0.36, 0.42],
  [0.48, 0.21],
  [0.54, 0.76],
  [0.64, 0.36],
  [0.78, 0.25],
  [0.82, 0.68],
  [0.31, 0.16],
  [0.71, 0.56],
];

export const ArenaDecorStageCanvas: React.FC<{
  decor: ArenaDecorTheme;
  skin: WormSkin;
  selectedFoods: FoodItemId[];
  spotlightFoodId?: FoodItemId;
  specialDecorId: SpecialDecorId;
}> = ({ decor, skin, selectedFoods, spotlightFoodId, specialDecorId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const patternCacheRef = useRef<{ decorId: string; pattern: CanvasPattern | null }>({
    decorId: '',
    pattern: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 420;
      const h = canvas.clientHeight || 260;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      if (patternCacheRef.current.decorId !== decor.id) {
        const tile = document.createElement('canvas');
        tile.width = 120;
        tile.height = 104;
        const tctx = tile.getContext('2d');
        if (tctx) {
          renderFloorPatternTile(tctx, decor, 120, 104);
        }
        patternCacheRef.current = {
          decorId: decor.id,
          pattern: ctx.createPattern(tile, 'repeat'),
        };
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Arena background floor tile pattern
      ctx.fillStyle = patternCacheRef.current.pattern ?? decor.floorBg;
      ctx.fillRect(0, 0, w, h);

      // Subtle arena radial rings for depth
      ctx.strokeStyle = decor.ringColors[0] ?? 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, Math.min(w, h) * 0.41, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Active Special Decor overlay
      if (specialDecorId && specialDecorId !== 'none') {
        drawSpecialDecorationLayer(ctx, specialDecorId, t, 0, 0, w, h);
      }

      // 3. Multi-food cartoon showcase (active selected foods + spotlight item)
      const basePool: FoodItemId[] = selectedFoods.length > 0 ? selectedFoods : ['cheese', 'tomato', 'corn'];
      const displayPool: FoodItemId[] =
        spotlightFoodId && !basePool.includes(spotlightFoodId)
          ? [spotlightFoodId, ...basePool.slice(0, 5), spotlightFoodId]
          : basePool;

      STAGE_FOOD_SPOTS.forEach(([nx, ny], idx) => {
        const fid =
          spotlightFoodId && idx === 4
            ? spotlightFoodId
            : displayPool[idx % displayPool.length];
        const fdef = getFoodById(fid);
        const fx = w * nx;
        const fy = h * ny + Math.sin(t * 2.4 + idx * 1.1) * 2.5;
        const baseR = idx === 4 && spotlightFoodId ? 15.5 : 13.5;

        if (spotlightFoodId && fid === spotlightFoodId) {
          ctx.save();
          ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(fx, fy, baseR * 1.48, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        drawCartoonFood(ctx, fx, fy, baseR, fid, fdef.color, fdef.glow, t + idx, decor.floorBg, false);
      });

      // 4. Slithering animated worm in the center arena
      const segCount = 13;
      const segs: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < segCount; i++) {
        const phase = t * 1.85 - i * 0.24;
        const px = w * 0.52 + Math.cos(phase) * (w * 0.19);
        const py = h * 0.56 + Math.sin(phase * 2) * (h * 0.15);
        segs.push({ x: px, y: py });
      }
      const head = segs[0];
      const neck = segs[1];
      const wormAngle = Math.atan2(head.y - neck.y, head.x - neck.x);

      const previewWorm: Worm = {
        id: 1,
        name: skin.name,
        isPlayer: false,
        skin,
        alive: true,
        x: head.x,
        y: head.y,
        angle: wormAngle,
        targetAngle: wormAngle,
        speed: 200,
        baseRadius: Math.min(15, h * 0.06),
        mass: 180,
        score: 0,
        kills: 0,
        boosting: false,
        boostDrainAccum: 0,
        segments: segs,
        pathHistory: segs,
        mouthOpen: 0,
        comboCount: 0,
        comboTimer: 0,
        spawnProtection: 0,
        aiStyle: 'forager',
        aiDecisionTimer: 0,
        aiTargetFoodId: null,
        aiWanderAngle: 0,
        aiBoostTimer: 0,
      };
      drawWormBodyAndHead(ctx, previewWorm, false, -60, -60, w + 60, h + 60, t, false);

      // Subtle inner shadow frame
      ctx.strokeStyle = decor.hazardColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      ctx.restore();

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [decor, skin, selectedFoods, spotlightFoodId, specialDecorId]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="arena-decor-stage-canvas"
      className="w-full h-full block"
    />
  );
};
