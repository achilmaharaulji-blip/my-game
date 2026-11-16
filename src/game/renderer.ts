import { ARENA_RADIUS, GameEngine } from './engine';
import type {
  ArenaDecorTheme,
  ArenaPowerUpOrb,
  FoodItem,
  FoodKind,
  SpecialDecorId,
  Worm,
  WormSkin,
} from './types';
import { getDecorById, getPowerUpById } from './workshopData';

export function getViewportZoomScale(viewW: number, viewH: number): number {
  // Always landscape (viewW >= viewH); keep wide horizontal & vertical visibility on mobile phones
  if (viewH < 440) return 0.7;
  if (viewH < 600 || viewW < 960) return 0.85;
  return 1;
}

const RAINBOW_SPECTRUM = [
  '#FB7185',
  '#FB923C',
  '#FACC15',
  '#4ADE80',
  '#38BDF8',
  '#818CF8',
  '#E879F9',
];

export function renderFloorPatternTile(
  octx: CanvasRenderingContext2D,
  decor: ArenaDecorTheme,
  tileW: number,
  tileH: number
): void {
  octx.fillStyle = decor.floorBg;
  octx.fillRect(0, 0, tileW, tileH);

  octx.strokeStyle = decor.patternStroke;
  octx.fillStyle = decor.patternAccent;
  octx.lineWidth = 1.6;

  if (decor.patternStyle === 'circles') {
    const spots = [
      [tileW * 0.25, tileH * 0.25, 16],
      [tileW * 0.75, tileH * 0.25, 16],
      [tileW * 0.25, tileH * 0.75, 16],
      [tileW * 0.75, tileH * 0.75, 16],
    ];
    for (const [cx, cy, cr] of spots) {
      octx.fillStyle = decor.patternAccent;
      octx.beginPath();
      octx.arc(cx, cy, cr, 0, Math.PI * 2);
      octx.fill();

      octx.strokeStyle = decor.patternStroke;
      octx.lineWidth = 2;
      octx.beginPath();
      octx.arc(cx, cy, cr, Math.PI * 0.08, Math.PI * 0.92);
      octx.stroke();
    }
  } else if (decor.patternStyle === 'hex') {
    const r = 30;
    const hexCenters = [
      [0, 0],
      [tileW, 0],
      [tileW * 0.5, tileH * 0.5],
      [0, tileH],
      [tileW, tileH],
    ];
    for (const [cx, cy] of hexCenters) {
      octx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const hx = cx + Math.cos(a) * r;
        const hy = cy + Math.sin(a) * r;
        if (i === 0) octx.moveTo(hx, hy);
        else octx.lineTo(hx, hy);
      }
      octx.closePath();
      octx.stroke();

      octx.beginPath();
      octx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      octx.fill();
    }
  } else if (decor.patternStyle === 'dots') {
    const spots = [
      [28, 24, 6],
      [88, 24, 4],
      [58, 54, 7],
      [22, 82, 4.5],
      [92, 80, 6],
    ];
    for (const [sx, sy, sr] of spots) {
      octx.beginPath();
      octx.arc(sx, sy, sr, 0, Math.PI * 2);
      octx.fill();
      octx.beginPath();
      octx.arc(sx, sy, sr + 4, 0, Math.PI * 2);
      octx.stroke();
    }
  } else if (decor.patternStyle === 'grid') {
    octx.beginPath();
    octx.moveTo(0, 0);
    octx.lineTo(tileW, 0);
    octx.moveTo(0, tileH * 0.5);
    octx.lineTo(tileW, tileH * 0.5);
    octx.moveTo(0, 0);
    octx.lineTo(0, tileH);
    octx.moveTo(tileW * 0.5, 0);
    octx.lineTo(tileW * 0.5, tileH);
    octx.stroke();

    octx.beginPath();
    octx.arc(0, 0, 3.2, 0, Math.PI * 2);
    octx.arc(tileW * 0.5, tileH * 0.5, 3.2, 0, Math.PI * 2);
    octx.fill();
  } else if (decor.patternStyle === 'waves') {
    for (const yOff of [26, 78]) {
      octx.beginPath();
      octx.moveTo(0, yOff);
      octx.quadraticCurveTo(tileW * 0.25, yOff - 14, tileW * 0.5, yOff);
      octx.quadraticCurveTo(tileW * 0.75, yOff + 14, tileW, yOff);
      octx.stroke();
    }
    octx.beginPath();
    octx.arc(tileW * 0.25, 52, 3, 0, Math.PI * 2);
    octx.arc(tileW * 0.75, 16, 2.5, 0, Math.PI * 2);
    octx.fill();
  } else if (decor.patternStyle === 'petals') {
    const centers = [
      [30, 26],
      [90, 76],
    ];
    for (const [cx, cy] of centers) {
      for (let p = 0; p < 5; p++) {
        const a = (Math.PI * 2 * p) / 5;
        octx.beginPath();
        octx.ellipse(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 5, 2.8, a, 0, Math.PI * 2);
        octx.fill();
      }
    }
    octx.beginPath();
    octx.arc(88, 24, 9, 0, Math.PI * 2);
    octx.stroke();
  } else {
    // 'stars'
    const stars = [
      [24, 20, 4.5],
      [88, 36, 3.5],
      [52, 68, 5.5],
      [104, 88, 3],
    ];
    for (const [sx, sy, sr] of stars) {
      octx.beginPath();
      octx.moveTo(sx - sr, sy);
      octx.lineTo(sx + sr, sy);
      octx.moveTo(sx, sy - sr);
      octx.lineTo(sx, sy + sr);
      octx.stroke();
      octx.beginPath();
      octx.arc(sx, sy, 1.8, 0, Math.PI * 2);
      octx.fill();
    }
  }
}

export function drawWormBodyAndHead(
  ctx: CanvasRenderingContext2D,
  worm: Worm,
  isLeader: boolean,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  elapsedTime: number,
  drawNameplate = true
): void {
  const segs = worm.segments;
  if (segs.length === 0) return;

  let anyVisible = false;
  for (let i = 0; i < segs.length; i += 4) {
    const s = segs[i];
    if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) {
      anyVisible = true;
      break;
    }
  }
  if (!anyVisible) {
    const last = segs[segs.length - 1];
    if (last.x < minX || last.x > maxX || last.y < minY || last.y > maxY) {
      return;
    }
  }

  ctx.save();
  if (worm.spawnProtection > 0) {
    ctx.globalAlpha = 0.55 + Math.sin(elapsedTime * 18) * 0.28;
  }

  const skin = worm.skin;
  const len = segs.length;

  // Skin-specific animated aura or flame glow
  if (worm.boosting || skin.bodyAnim === 'flame' || skin.bodyAnim === 'pulse') {
    const pulseScale =
      skin.bodyAnim === 'pulse' ? 1.24 + Math.sin(elapsedTime * 6) * 0.1 : 1.38;
    const auraScale = worm.boosting ? 1.46 : pulseScale;
    ctx.save();
    ctx.globalAlpha *= worm.boosting ? 0.85 : 0.42;
    ctx.fillStyle = skin.glow;
    for (let i = len - 1; i >= 0; i -= 2) {
      const s = segs[i];
      const taper = i > len - 5 ? 0.65 + (len - 1 - i) * 0.08 : 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, worm.baseRadius * taper * auraScale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Soft drop shadow
  ctx.fillStyle = 'rgba(5, 8, 20, 0.35)';
  for (let i = len - 1; i >= 0; i -= 2) {
    const s = segs[i];
    const taper = i > len - 5 ? 0.55 + (len - 1 - i) * 0.11 : 1;
    ctx.beginPath();
    ctx.arc(s.x + 3, s.y + 6, worm.baseRadius * taper * 1.02, 0, Math.PI * 2);
    ctx.fill();
  }

  // Segments from tail to head
  for (let i = len - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.x < minX - 40 || s.x > maxX + 40 || s.y < minY - 40 || s.y > maxY + 40) continue;

    const taper = i > len - 5 ? 0.52 + (len - 1 - i) * 0.12 : 1;
    const waveBump =
      skin.bodyAnim === 'wave' ? 1 + Math.sin(elapsedTime * 7 - i * 0.55) * 0.06 : 1;
    const r = worm.baseRadius * taper * waveBump;

    // Choose segment color by skin pattern
    let segColor = skin.primary;
    if (skin.pattern === 'rainbow') {
      const idx = (i + Math.floor(elapsedTime * 5)) % RAINBOW_SPECTRUM.length;
      segColor = RAINBOW_SPECTRUM[idx];
    } else if (skin.pattern === 'flame') {
      segColor = i % 3 === 0 ? skin.accent : i % 2 === 0 ? skin.primary : skin.secondary;
    } else if (skin.pattern === 'striped' || skin.pattern === 'honey') {
      segColor = Math.floor(i / 2) % 2 === 0 ? skin.primary : skin.secondary;
    } else if (skin.pattern === 'candy') {
      segColor = i % 3 === 0 ? skin.secondary : i % 3 === 1 ? skin.primary : skin.accent;
    } else if (skin.pattern === 'gradient') {
      segColor = i % 4 === 0 ? skin.secondary : i % 4 === 2 ? skin.accent : skin.primary;
    } else if (skin.pattern === 'segmented' || skin.pattern === 'cosmic') {
      segColor = i % 2 === 0 ? skin.primary : skin.secondary;
    } else if (skin.pattern === 'circuit') {
      segColor = i % 3 === 0 ? skin.primary : skin.secondary;
    }

    // Outer outline ring
    ctx.fillStyle = skin.outline;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r + 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Main segment body
    ctx.fillStyle = segColor;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Pattern overlays
    if (skin.pattern === 'spotted' && i % 2 === 1 && i > 0) {
      ctx.fillStyle = skin.secondary;
      const side = i % 4 === 1 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(s.x + side * r * 0.32, s.y - r * 0.18, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    } else if (skin.pattern === 'cosmic' && i % 2 === 0 && i > 0) {
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.arc(
        s.x + Math.sin(i * 2.1 + elapsedTime * 2) * r * 0.38,
        s.y + Math.cos(i * 1.7 + elapsedTime * 2) * r * 0.38,
        r * 0.17,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (skin.pattern === 'circuit' && i % 3 === 0 && i > 0) {
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shimmer wave highlight
    if (skin.bodyAnim === 'shimmer') {
      const shimmerPhase = Math.sin(elapsedTime * 8 - i * 0.7);
      if (shimmerPhase > 0.35) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Orbiting accent motes or sparkles on selected segments
    if (skin.bodyAnim === 'orbit' && i > 0 && i % 5 === 2) {
      const orbitA = elapsedTime * 4.5 + i;
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.arc(
        s.x + Math.cos(orbitA) * (r + 5),
        s.y + Math.sin(orbitA) * (r + 5),
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (skin.bodyAnim === 'sparkle' && i % 4 === 1 && Math.sin(elapsedTime * 7 + i) > 0.45) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x + r * 0.35, s.y - r * 0.35, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top glossy ridge highlight
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(s.x - r * 0.22, s.y - r * 0.28, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Expressive Head Details (Crests, FaceStyle, Eyes, Crown)
  drawWormHead(ctx, worm, isLeader);

  if (drawNameplate) {
    ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelY = worm.y - worm.baseRadius - (isLeader ? 24 : 16);
    const labelText = isLeader ? `★ ${worm.name}` : worm.name;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(9, 13, 28, 0.88)';
    ctx.strokeText(labelText, worm.x, labelY);
    ctx.fillStyle = worm.isPlayer ? '#FDE047' : '#F8FAFC';
    ctx.fillText(labelText, worm.x, labelY);
  }

  ctx.restore();
}

function drawWormHead(ctx: CanvasRenderingContext2D, worm: Worm, isLeader: boolean): void {
  const r = worm.baseRadius * 1.08;
  const skin = worm.skin;
  const cos = Math.cos(worm.angle);
  const sin = Math.sin(worm.angle);
  const perpX = -sin;
  const perpY = cos;

  // Crest / Horns / Antennae / Fins
  if (skin.crestStyle === 'antennae') {
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      const ax = worm.x - cos * r * 0.2 + perpX * side * r * 0.65;
      const ay = worm.y - sin * r * 0.2 + perpY * side * r * 0.65;
      const tx = ax + cos * r * 0.55 + perpX * side * r * 0.45;
      const ty = ay + sin * r * 0.55 + perpY * side * r * 0.45;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skin.crestStyle === 'horns') {
    ctx.fillStyle = skin.accent;
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      const bx = worm.x - cos * r * 0.1 + perpX * side * r * 0.65;
      const by = worm.y - sin * r * 0.1 + perpY * side * r * 0.65;
      const tipX = bx - cos * r * 0.4 + perpX * side * r * 0.55;
      const tipY = by - sin * r * 0.4 + perpY * side * r * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx + cos * r * 0.25, by + sin * r * 0.25);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx - cos * r * 0.25, by - sin * r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (skin.crestStyle === 'fins') {
    ctx.fillStyle = skin.secondary;
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      const fx = worm.x - cos * r * 0.25 + perpX * side * r * 0.92;
      const fy = worm.y - sin * r * 0.25 + perpY * side * r * 0.92;
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Open mouth bite animation when eating
  if (worm.mouthOpen > 0.12) {
    const mx = worm.x + cos * r * 0.72;
    const my = worm.y + sin * r * 0.72;
    ctx.fillStyle = '#3B0A18';
    ctx.beginPath();
    ctx.arc(mx, my, r * 0.42 * worm.mouthOpen, 0, Math.PI * 2);
    ctx.fill();
  }

  // FaceStyle Eyes & Expressions
  const eyeForward = r * 0.34;
  const eyeSpread = r * 0.5;
  const eyeRadius = skin.faceStyle === 'kawaii' ? r * 0.39 : r * 0.34;
  const pupilRadius = eyeRadius * 0.56;
  const lookCos = Math.cos(worm.targetAngle);
  const lookSin = Math.sin(worm.targetAngle);
  const pupilShift = eyeRadius * 0.3;

  if (skin.faceStyle === 'cyber') {
    // Sleek glowing cyber visor bar across eyes
    const vx = worm.x + cos * eyeForward;
    const vy = worm.y + sin * eyeForward;
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(worm.angle);
    ctx.fillStyle = '#090D1F';
    ctx.strokeStyle = skin.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-r * 0.26, -r * 0.78, r * 0.52, r * 1.56, r * 0.22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = skin.accent;
    ctx.beginPath();
    ctx.arc(0, -r * 0.38, r * 0.14, 0, Math.PI * 2);
    ctx.arc(0, r * 0.38, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    for (const side of [-1, 1]) {
      const ex = worm.x + cos * eyeForward + perpX * side * eyeSpread;
      const ey = worm.y + sin * eyeForward + perpY * side * eyeSpread;

      if (skin.faceStyle === 'cool') {
        // Cool dark sunglasses lenses with white specular reflection
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(worm.angle);
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-eyeRadius * 0.85, -eyeRadius * 0.95, eyeRadius * 1.7, eyeRadius * 1.9, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(-eyeRadius * 0.35, -eyeRadius * 0.55, eyeRadius * 0.35, eyeRadius * 0.9);
        ctx.restore();
        continue;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const px = ex + lookCos * pupilShift;
      const py = ey + lookSin * pupilShift;
      ctx.fillStyle = skin.eyeIris;
      ctx.beginPath();
      ctx.arc(px, py, pupilRadius, 0, Math.PI * 2);
      ctx.fill();

      // Specular sparkle
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px - pupilRadius * 0.3, py - pupilRadius * 0.3, pupilRadius * 0.34, 0, Math.PI * 2);
      ctx.fill();

      // Fierce angled brows
      if (skin.faceStyle === 'fierce') {
        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(ex - perpX * side * eyeRadius * 0.8 + cos * eyeRadius * 0.4, ey - perpY * side * eyeRadius * 0.8 + sin * eyeRadius * 0.4);
        ctx.lineTo(ex + perpX * side * eyeRadius * 0.7 - cos * eyeRadius * 0.25, ey + perpY * side * eyeRadius * 0.7 - sin * eyeRadius * 0.25);
        ctx.stroke();
      } else if (skin.faceStyle === 'kawaii') {
        // Rosy blush cheek dot
        ctx.fillStyle = 'rgba(251, 113, 133, 0.72)';
        ctx.beginPath();
        ctx.arc(
          worm.x + cos * (eyeForward * 0.15) + perpX * side * (eyeSpread + r * 0.32),
          worm.y + sin * (eyeForward * 0.15) + perpY * side * (eyeSpread + r * 0.32),
          r * 0.18,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (skin.faceStyle === 'royal') {
        // Golden cheek trim
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(
          worm.x - cos * r * 0.05 + perpX * side * (eyeSpread + r * 0.26),
          worm.y - sin * r * 0.05 + perpY * side * (eyeSpread + r * 0.26),
          r * 0.12,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // Leader or Royal crown icon above head
  if (isLeader || skin.crestStyle === 'crown') {
    const cx = worm.x - cos * r * 0.25;
    const cy = worm.y - sin * r * 0.25 - r * 0.95;
    ctx.fillStyle = isLeader ? '#FACC15' : skin.accent;
    ctx.strokeStyle = '#713F12';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 5);
    ctx.lineTo(cx - 10, cy - 5);
    ctx.lineTo(cx - 4, cy);
    ctx.lineTo(cx, cy - 8);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx + 10, cy - 5);
    ctx.lineTo(cx + 8, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function drawSkinPreviewWorm(
  ctx: CanvasRenderingContext2D,
  skin: WormSkin,
  width: number,
  height: number,
  elapsedTime: number
): void {
  ctx.clearRect(0, 0, width, height);
  const segCount = 13;
  const segments = [];
  const startX = width * 0.74;
  const stepX = (width * 0.56) / segCount;
  const centerY = height * 0.55;
  const baseRadius = Math.min(16, height * 0.17);

  for (let i = 0; i < segCount; i++) {
    const px = startX - i * stepX;
    const py = centerY + Math.sin(elapsedTime * 4.2 - i * 0.55) * (height * 0.12);
    segments.push({ x: px, y: py });
  }

  const head = segments[0];
  const neck = segments[1];
  const angle = Math.atan2(head.y - neck.y, head.x - neck.x);

  const previewWorm: Worm = {
    id: 0,
    name: skin.name,
    isPlayer: false,
    skin,
    alive: true,
    x: head.x,
    y: head.y,
    angle,
    targetAngle: angle,
    speed: 200,
    baseRadius,
    mass: 160,
    score: 0,
    kills: 0,
    boosting: false,
    boostDrainAccum: 0,
    segments,
    pathHistory: segments,
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

  drawWormBodyAndHead(ctx, previewWorm, false, -50, -50, width + 50, height + 50, elapsedTime, false);
}

export class ArenaRenderer {
  private floorPattern: CanvasPattern | null = null;
  private cachedDecorId: string | null = null;

  private ensureFloorPattern(
    ctx: CanvasRenderingContext2D,
    decor: ArenaDecorTheme
  ): CanvasPattern | null {
    if (this.floorPattern && this.cachedDecorId === decor.id) {
      return this.floorPattern;
    }
    if (typeof document === 'undefined') return null;

    const tileW = 120;
    const tileH = 104;
    const off = document.createElement('canvas');
    off.width = tileW;
    off.height = tileH;
    const octx = off.getContext('2d');
    if (!octx) return null;

    renderFloorPatternTile(octx, decor, tileW, tileH);

    this.cachedDecorId = decor.id;
    this.floorPattern = ctx.createPattern(off, 'repeat');
    return this.floorPattern;
  }

  render(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    viewW: number,
    viewH: number,
    dpr: number
  ): void {
    const decor = getDecorById(engine.decorId);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear outer void in active decor color
    ctx.fillStyle = decor.voidBg;
    ctx.fillRect(0, 0, viewW, viewH);

    // Responsive zoom scaling for landscape phones
    const mobileScale = getViewportZoomScale(viewW, viewH);
    const zoom = engine.cameraZoom * mobileScale;

    // Decaying camera shake (trauma^2)
    const shakeMag = engine.cameraTrauma * engine.cameraTrauma * 16;
    const shakeX = shakeMag > 0.2 ? (Math.random() * 2 - 1) * shakeMag : 0;
    const shakeY = shakeMag > 0.2 ? (Math.random() * 2 - 1) * shakeMag : 0;

    ctx.save();
    ctx.translate(viewW * 0.5 + shakeX, viewH * 0.5 + shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-engine.cameraX, -engine.cameraY);

    // Visible world bounds for culling
    const halfW = (viewW * 0.5) / zoom + 120;
    const halfH = (viewH * 0.5) / zoom + 120;
    const minX = engine.cameraX - halfW;
    const maxX = engine.cameraX + halfW;
    const minY = engine.cameraY - halfH;
    const maxY = engine.cameraY + halfH;

    // 1. Arena floor circle & tiled themed pattern
    this.drawArenaFloor(ctx, engine, decor, minX, minY, maxX, maxY);

    // 1b. Special Arena Decorations Layer
    if (engine.specialDecorId && engine.specialDecorId !== 'none') {
      drawSpecialDecorationLayer(ctx, engine.specialDecorId, engine.elapsedTime, minX, minY, maxX, maxY);
    }

    // 2. Foods (culled to viewport, themed hole fill)
    this.drawFoods(ctx, engine.foods, decor.floorBg, minX, minY, maxX, maxY);

    // 3. Collectible Arena Power-Up Orbs
    this.drawPowerUpOrbs(ctx, engine.powerUpOrbs, minX, minY, maxX, maxY);

    // 4. Worms (find rank #1 leader for crown marker)
    let leaderId = -1;
    let maxScore = -1;
    for (let i = 0; i < engine.worms.length; i++) {
      const w = engine.worms[i];
      if (w.alive && w.score > maxScore) {
        maxScore = w.score;
        leaderId = w.id;
      }
    }

    // Draw AI worms first, then player worm on top
    for (let i = 0; i < engine.worms.length; i++) {
      const w = engine.worms[i];
      if (!w.alive || w.isPlayer) continue;
      drawWormBodyAndHead(ctx, w, w.id === leaderId, minX, minY, maxX, maxY, engine.elapsedTime, true);
    }

    const player = engine.getPlayer();
    if (player && player.alive) {
      // Magnet attraction aura ring
      const magnetBonus = engine.getActivePowerUpEffect('magnet');
      if (magnetBonus > 0) {
        const magnetR = player.baseRadius * 2.55 + magnetBonus;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 10]);
        ctx.lineDashOffset = -engine.elapsedTime * 55;
        ctx.beginPath();
        ctx.arc(player.x, player.y, magnetR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      drawWormBodyAndHead(ctx, player, player.id === leaderId, minX, minY, maxX, maxY, engine.elapsedTime, true);

      // Radar directional scanner markers for nearby enemy worms
      const radarRange = engine.getActivePowerUpEffect('radar');
      if (radarRange > 0) {
        this.drawPlayerRadar(ctx, engine, player, radarRange);
      }
    }

    // 5. Particles & death explosion bursts on top of arena entities
    this.drawParticles(ctx, engine, minX, minY, maxX, maxY);

    // 6. Floating score texts
    this.drawFloatingTexts(ctx, engine);

    ctx.restore();

    // 7. Screen-space boundary vignette & corner Minimap
    if (engine.phase === 'playing' && player && player.alive) {
      const distCenter = Math.hypot(player.x, player.y);
      if (distCenter > ARENA_RADIUS - 320) {
        const warnAlpha = Math.min(0.32, ((distCenter - (ARENA_RADIUS - 320)) / 320) * 0.32);
        const grad = ctx.createRadialGradient(
          viewW * 0.5,
          viewH * 0.5,
          Math.min(viewW, viewH) * 0.25,
          viewW * 0.5,
          viewH * 0.5,
          Math.max(viewW, viewH) * 0.7
        );
        grad.addColorStop(0, 'rgba(255, 65, 85, 0)');
        grad.addColorStop(1, `rgba(255, 65, 85, ${warnAlpha.toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      this.drawMinimap(ctx, engine, player, leaderId, viewW, viewH);
    }

    ctx.restore();
  }

  private drawPlayerRadar(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    player: Worm,
    radarRange: number
  ): void {
    const ringRadius = player.baseRadius + 58;
    ctx.save();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating sweep arc
    const sweepA = engine.elapsedTime * 3.2;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, ringRadius, sweepA, sweepA + 0.9);
    ctx.stroke();

    // Threat arrows for nearby enemy worms within radarRange
    for (let i = 0; i < engine.worms.length; i++) {
      const other = engine.worms[i];
      if (!other.alive || other.isPlayer) continue;
      const dx = other.x - player.x;
      const dy = other.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= radarRange && dist > 10) {
        const a = Math.atan2(dy, dx);
        const ax = player.x + Math.cos(a) * (ringRadius + 10);
        const ay = player.y + Math.sin(a) * (ringRadius + 10);
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a);
        ctx.fillStyle = dist < 300 ? '#F43F5E' : '#34D399';
        ctx.strokeStyle = '#090D1C';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-5, -5.5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-5, 5.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawPowerUpOrbs(
    ctx: CanvasRenderingContext2D,
    orbs: ArenaPowerUpOrb[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i];
      if (orb.x < minX || orb.x > maxX || orb.y < minY || orb.y > maxY) continue;
      const def = getPowerUpById(orb.powerUpId);
      const pulse = 1 + Math.sin(orb.phase * 1.4) * 0.1;
      const r = orb.radius * pulse;

      ctx.save();
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * 1.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = def.color;
      ctx.font = '700 10px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.badgeLabel, orb.x, orb.y + 0.5);
      ctx.restore();
    }
  }

  private drawArenaFloor(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    decor: ArenaDecorTheme,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const maxCornerDist = Math.max(
      Math.hypot(minX, minY),
      Math.hypot(maxX, minY),
      Math.hypot(minX, maxY),
      Math.hypot(maxX, maxY)
    );
    const nearEdge = maxCornerDist >= ARENA_RADIUS - 20;

    const pat = this.ensureFloorPattern(ctx, decor);
    ctx.fillStyle = pat ?? decor.floorBg;
    if (!nearEdge) {
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Colourful concentric zone rings for spatial orientation across wide arena
    const ringRadii = [560, 1240, 1920, 2420];
    for (let i = 0; i < ringRadii.length; i++) {
      ctx.strokeStyle = decor.ringColors[i % decor.ringColors.length];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadii[i], 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center hub emblem
    ctx.fillStyle = decor.patternAccent;
    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, Math.PI * 2);
    ctx.fill();

    if (!nearEdge) {
      return;
    }

    // Glowing hazard boundary wall
    const pulse = 0.78 + Math.sin(engine.elapsedTime * 3.5) * 0.22;
    ctx.strokeStyle = decor.hazardGlow;
    ctx.lineWidth = 22 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = decor.hazardColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 224, 130, 0.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    ctx.lineDashOffset = -engine.elapsedTime * 45;
    ctx.beginPath();
    ctx.arc(0, 0, ARENA_RADIUS - 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawFoods(
    ctx: CanvasRenderingContext2D,
    foods: FoodItem[],
    holeFill: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      if (f.x < minX || f.x > maxX || f.y < minY || f.y > maxY) continue;
      const bob = Math.sin(f.phase) * 1.4;
      const r = f.radius + Math.sin(f.phase * 1.3) * 0.7;
      drawCartoonFood(ctx, f.x, f.y + bob, r, f.kind, f.color, f.glowColor, f.phase, holeFill, f.fromDeath);
    }
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    ctx.save();
    for (let i = 0; i < engine.particles.length; i++) {
      const p = engine.particles[i];
      if (!p.active) continue;
      const pad = p.radius + 24;
      if (p.x < minX - pad || p.x > maxX + pad || p.y < minY - pad || p.y > maxY + pad) continue;

      const alpha = Math.max(0, p.life / p.maxLife);

      if (p.kind === 'ring') {
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 6 * alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, p.radius), 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      if (p.kind === 'spark') {
        const speed = Math.hypot(p.vx, p.vy);
        const tailLen = Math.min(24, Math.max(6, speed * 0.055)) * alpha;
        const angle = speed > 1 ? Math.atan2(p.vy, p.vx) : p.rotation;
        const dx = Math.cos(angle) * tailLen;
        const dy = Math.sin(angle) * tailLen;

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, p.radius * 0.8 * alpha);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - dx, p.y - dy);
        ctx.lineTo(p.x + dx * 0.35, p.y + dy * 0.35);
        ctx.stroke();
        continue;
      }

      if (p.kind === 'confetti') {
        const half = p.radius * (0.45 + 0.55 * alpha);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-half, -half * 0.55, half * 2, half * 1.1);
        ctx.restore();
        continue;
      }

      const rad = p.radius * (0.4 + 0.6 * alpha);
      if (p.glow) {
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 1.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < engine.floatingTexts.length; i++) {
      const ft = engine.floatingTexts[i];
      if (!ft.active) continue;
      const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
      ctx.globalAlpha = alpha;
      const size = Math.round(16 * ft.scale);
      ctx.font = `700 ${size}px "Fredoka", system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(9, 13, 28, 0.9)';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  private drawMinimap(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    player: Worm,
    leaderId: number,
    viewW: number,
    viewH: number
  ): void {
    void viewW;
    const isCompactLandscape = viewH < 560;
    const mapRadius = isCompactLandscape ? 32 : 44;
    const cx = isCompactLandscape ? 202 : 244;
    const cy = isCompactLandscape ? 46 : 60;
    const radarActive = engine.getActivePowerUpEffect('radar') > 0;

    ctx.save();
    ctx.fillStyle = 'rgba(13, 18, 38, 0.78)';
    ctx.strokeStyle = radarActive ? 'rgba(52, 211, 153, 0.7)' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - mapRadius + 4, cy);
    ctx.lineTo(cx + mapRadius - 4, cy);
    ctx.moveTo(cx, cy - mapRadius + 4);
    ctx.lineTo(cx, cy + mapRadius - 4);
    ctx.stroke();

    const scale = (mapRadius - 6) / ARENA_RADIUS;

    // Power-Up Orbs on radar when active
    if (radarActive) {
      for (let i = 0; i < engine.powerUpOrbs.length; i++) {
        const orb = engine.powerUpOrbs[i];
        const mx = cx + orb.x * scale;
        const my = cy + orb.y * scale;
        ctx.fillStyle = getPowerUpById(orb.powerUpId).color;
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    }

    // AI worms
    for (let i = 0; i < engine.worms.length; i++) {
      const w = engine.worms[i];
      if (!w.alive || w.isPlayer) continue;
      const mx = cx + w.x * scale;
      const my = cy + w.y * scale;
      ctx.fillStyle = w.id === leaderId ? '#FACC15' : w.skin.primary;
      ctx.beginPath();
      ctx.arc(mx, my, w.id === leaderId ? 3.5 : radarActive ? 2.8 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player beacon
    const px = cx + player.x * scale;
    const py = cy + player.y * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, py, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function drawSpecialDecorationLayer(
  ctx: CanvasRenderingContext2D,
  specialId: SpecialDecorId,
  elapsedTime: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): void {
  if (specialId === 'none') return;
  const cell = 240;
  const gx0 = Math.floor(minX / cell);
  const gx1 = Math.ceil(maxX / cell);
  const gy0 = Math.floor(minY / cell);
  const gy1 = Math.ceil(maxY / cell);

  ctx.save();
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const hash = Math.abs(Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453);
      const frac = hash - Math.floor(hash);
      if (frac < 0.38) continue;

      const x = gx * cell + ((frac * 173) % (cell * 0.7)) + cell * 0.15;
      const y = gy * cell + ((frac * 293) % (cell * 0.7)) + cell * 0.15;
      if (x * x + y * y > (ARENA_RADIUS - 120) * (ARENA_RADIUS - 120)) continue;

      const pulse = 0.75 + Math.sin(elapsedTime * 2.2 + frac * 12) * 0.25;
      ctx.save();
      ctx.translate(x, y);

      if (specialId === 'glow-fireflies') {
        ctx.globalAlpha = 0.28 * pulse;
        ctx.fillStyle = frac > 0.7 ? '#22D3EE' : '#A855F7';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#E0F2FE';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (specialId === 'flower-blossoms') {
        ctx.globalAlpha = 0.42;
        ctx.rotate(frac * Math.PI * 2 + elapsedTime * 0.15);
        const petalCol = frac > 0.7 ? '#F472B6' : frac > 0.55 ? '#FDE047' : '#FB7185';
        ctx.fillStyle = petalCol;
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 5.5, 3.5, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (specialId === 'sea-bubbles') {
        ctx.globalAlpha = 0.36 * pulse;
        ctx.strokeStyle = '#67E8F9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 11 + (frac * 7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(-4, -4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (specialId === 'candy-sparkles') {
        ctx.globalAlpha = 0.45 * pulse;
        ctx.rotate(elapsedTime * 0.6 + frac * 6);
        ctx.fillStyle = frac > 0.68 ? '#FACC15' : '#EC4899';
        ctx.beginPath();
        for (let p = 0; p < 8; p++) {
          const r = p % 2 === 0 ? 11 : 4.5;
          const a = (p * Math.PI) / 4;
          if (p === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else if (specialId === 'cartoon-badges') {
        ctx.globalAlpha = 0.42;
        ctx.rotate((frac - 0.5) * 0.5);
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#713F12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#713F12';
        ctx.beginPath();
        ctx.arc(-3.5, -2, 1.5, 0, Math.PI * 2);
        ctx.arc(3.5, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 1, 4.5, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawCartoonFood(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  r: number,
  kind: FoodKind,
  color: string,
  glowColor: string,
  phase = 0,
  holeFill = '#1e1b4b',
  fromDeath = false
): void {
  ctx.save();
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(fx, fy, r * (fromDeath ? 1.75 : 1.38), 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'loot' || kind === 'berry') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(fx - r * 0.3, fy - r * 0.3, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (kind === 'gem') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(fx, fy - r);
    ctx.lineTo(fx + r * 0.85, fy);
    ctx.lineTo(fx, fy + r);
    ctx.lineTo(fx - r * 0.85, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(fx, fy - r * 0.7);
    ctx.lineTo(fx + r * 0.35, fy - r * 0.15);
    ctx.lineTo(fx, fy);
    ctx.lineTo(fx - r * 0.35, fy - r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (kind === 'donut') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = holeFill;
    ctx.beginPath();
    ctx.arc(fx, fy, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.translate(fx, fy);
  ctx.rotate(Math.sin(phase * 0.25) * 0.15);

  switch (kind) {
    case 'cheese': {
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, r * 0.6);
      ctx.lineTo(r * 0.95, r * 0.6);
      ctx.lineTo(r * 0.72, -r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, r * 0.2);
      ctx.lineTo(r * 0.72, -r * 0.75);
      ctx.lineTo(r * 0.9, r * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.arc(-r * 0.1, r * 0.28, r * 0.18, 0, Math.PI * 2);
      ctx.arc(r * 0.42, r * 0.32, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.15, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#7F1D1D';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.24, r * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.72, r * 0.48, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillRect(-r * 0.08, -r * 0.98, r * 0.16, r * 0.3);
      break;
    }
    case 'carrot': {
      ctx.rotate(-0.55);
      ctx.fillStyle = '#F97316';
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.45);
      ctx.lineTo(r * 0.45, -r * 0.45);
      ctx.lineTo(0, r * 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(-r * 0.18, -r * 0.72, r * 0.22, 0, Math.PI * 2);
      ctx.arc(r * 0.18, -r * 0.72, r * 0.22, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.85, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'corn': {
      ctx.rotate(0.45);
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#713F12';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.1, r * 0.44, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, r * 0.38, r * 0.28, r * 0.52, -0.35, 0, Math.PI * 2);
      ctx.ellipse(r * 0.35, r * 0.38, r * 0.28, r * 0.52, 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bread': {
      ctx.fillStyle = '#D97706';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-r * 0.78, -r * 0.52, r * 1.56, r * 1.22, r * 0.3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.roundRect(-r * 0.62, -r * 0.38, r * 1.24, r * 0.94, r * 0.22);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.45, r * 0.38, Math.PI, 0);
      ctx.arc(r * 0.35, -r * 0.45, r * 0.38, Math.PI, 0);
      ctx.fill();
      break;
    }
    case 'sandwich': {
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.72, r * 1.7, r * 1.44, r * 0.25);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(-r * 0.78, -r * 0.05, r * 1.56, r * 0.24);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-r * 0.72, r * 0.18, r * 1.44, r * 0.2);
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.roundRect(-r * 0.7, -r * 0.6, r * 1.4, r * 0.55, r * 0.16);
      ctx.fill();
      break;
    }
    case 'cherry': {
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.8, r * 0.12, -r * 0.9);
      ctx.quadraticCurveTo(r * 0.25, -r * 0.5, r * 0.42, r * 0.22);
      ctx.stroke();
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(r * 0.35, -r * 0.72, r * 0.32, r * 0.16, -0.4, 0, Math.PI * 2);
      ctx.fill();
      for (const cx of [-r * 0.42, r * 0.42]) {
        ctx.fillStyle = '#E11D48';
        ctx.strokeStyle = '#881337';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, r * 0.35, r * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.14, r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pumpkin': {
      ctx.fillStyle = '#EA580C';
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-r * 0.36, r * 0.1, r * 0.5, r * 0.72, 0, 0, Math.PI * 2);
      ctx.ellipse(r * 0.36, r * 0.1, r * 0.5, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.1, r * 0.45, r * 0.76, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-r * 0.12, -r * 0.92, r * 0.24, r * 0.36);
      break;
    }
    case 'cake': {
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.7);
      ctx.lineTo(r * 0.85, r * 0.7);
      ctx.lineTo(r * 0.85, -r * 0.1);
      ctx.lineTo(-r * 0.6, -r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(-r * 0.75, r * 0.12, r * 1.52, r * 0.24);
      ctx.fillStyle = '#FCE7F3';
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.5);
      ctx.lineTo(r * 0.85, -r * 0.1);
      ctx.lineTo(r * 0.85, -r * 0.34);
      ctx.lineTo(-r * 0.48, -r * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, -r * 0.58, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = '#E0E7FF';
      ctx.strokeStyle = '#1E1B4B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-r * 0.34, 0, r * 0.68, r * 0.85, r * 0.28);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#14B8A6';
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.92, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#A7F3D0';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.18, 0, Math.PI * 2);
      ctx.arc(r * 0.28, -r * 0.45, r * 0.15, 0, Math.PI * 2);
      ctx.arc(r * 0.42, -r * 0.12, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'meat': {
      ctx.rotate(-0.4);
      ctx.fillStyle = '#FEF3C7';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.4;
      ctx.fillRect(r * 0.35, -r * 0.18, r * 0.6, r * 0.36);
      ctx.strokeRect(r * 0.35, -r * 0.18, r * 0.6, r * 0.36);
      ctx.fillStyle = '#E11D48';
      ctx.strokeStyle = '#881337';
      ctx.beginPath();
      ctx.ellipse(-r * 0.12, 0, r * 0.78, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FECDD3';
      ctx.beginPath();
      ctx.arc(-r * 0.18, 0, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(-r * 0.18, 0, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'fish': {
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#0C4A6E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, 0);
      ctx.lineTo(r * 1.05, -r * 0.48);
      ctx.lineTo(r * 1.05, r * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-r * 0.12, 0, r * 0.76, r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#BAE6FD';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, r * 0.12, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(-r * 0.48, -r * 0.12, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-r * 0.5, -r * 0.12, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'shrimp': {
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = r * 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.56, -Math.PI * 0.9, Math.PI * 0.35);
      ctx.stroke();
      ctx.strokeStyle = '#FDBA74';
      ctx.lineWidth = r * 0.25;
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.56, -Math.PI * 0.75, Math.PI * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(-r * 0.54, -r * 0.02, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'starfish': {
      ctx.fillStyle = '#F97316';
      ctx.strokeStyle = '#9A3412';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r * 0.96 : r * 0.42;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = Math.cos(a) * rad;
        const sy = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'candy': {
      ctx.rotate(-0.45);
      ctx.fillStyle = '#F472B6';
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, 0);
      ctx.lineTo(-r * 0.98, -r * 0.35);
      ctx.lineTo(-r * 0.98, r * 0.35);
      ctx.closePath();
      ctx.moveTo(r * 0.55, 0);
      ctx.lineTo(r * 0.98, -r * 0.35);
      ctx.lineTo(r * 0.98, r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E879F9';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.62, r * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.35);
      ctx.lineTo(0, r * 0.35);
      ctx.moveTo(r * 0.15, -r * 0.35);
      ctx.lineTo(r * 0.32, r * 0.32);
      ctx.stroke();
      break;
    }
    case 'lollipop': {
      ctx.rotate(0.45);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.25);
      ctx.lineTo(0, r * 1.05);
      ctx.stroke();
      ctx.fillStyle = '#FB7185';
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -r * 0.18, r * 0.64, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -r * 0.18, r * 0.35, 0, Math.PI * 1.5);
      ctx.stroke();
      break;
    }
    case 'strawberry': {
      ctx.fillStyle = '#F43F5E';
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.95);
      ctx.bezierCurveTo(-r * 0.95, r * 0.35, -r * 0.85, -r * 0.65, 0, -r * 0.58);
      ctx.bezierCurveTo(r * 0.85, -r * 0.65, r * 0.95, r * 0.35, 0, r * 0.95);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDE047';
      for (const [sx, sy] of [[-0.3, -0.1], [0.3, -0.1], [0, 0.25], [-0.2, 0.45], [0.22, 0.45]]) {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.62, r * 0.45, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'watermelon': {
      ctx.fillStyle = '#16A34A';
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 0.92, 0.15, Math.PI - 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r * 0.72, 0.18, Math.PI - 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1E293B';
      for (const [sx, sy] of [[-0.25, 0.15], [0, 0.32], [0.25, 0.15]]) {
        ctx.beginPath();
        ctx.arc(sx * r, sy * r, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'grapes': {
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-r * 0.08, -r * 0.95, r * 0.16, r * 0.32);
      const pts = [
        [-0.34, -0.35],
        [0, -0.35],
        [0.34, -0.35],
        [-0.2, 0.05],
        [0.2, 0.05],
        [0, 0.45],
      ];
      for (const [gx, gy] of pts) {
        ctx.fillStyle = '#9333EA';
        ctx.strokeStyle = '#581C87';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(gx * r, gy * r, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'avocado': {
      ctx.fillStyle = '#4D7C0F';
      ctx.strokeStyle = '#1A2E05';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.68, r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#D9F99D';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.5, r * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#92400E';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pineapple': {
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.05);
      ctx.lineTo(-r * 0.35, -r * 0.42);
      ctx.lineTo(r * 0.35, -r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#EAB308';
      ctx.strokeStyle = '#713F12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-r * 0.52, -r * 0.45, r * 1.04, r * 1.25, r * 0.35);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(113, 63, 18, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.38, -r * 0.15);
      ctx.lineTo(r * 0.38, r * 0.45);
      ctx.moveTo(r * 0.38, -r * 0.15);
      ctx.lineTo(-r * 0.38, r * 0.45);
      ctx.stroke();
      break;
    }
    case 'lemon': {
      ctx.rotate(-0.3);
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#854D0E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.88, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.25, -r * 0.22, r * 0.28, r * 0.12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

