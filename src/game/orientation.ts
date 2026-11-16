export interface LandscapeViewport {
  logicalW: number;
  logicalH: number;
  forceRotated: boolean;
  isCompact: boolean;
}

/**
 * Forces landscape dimensions even when the device is held vertically (physH > physW),
 * matching the 90-degree rotated stage in App.tsx.
 */
export function getLandscapeViewport(physW: number, physH: number): LandscapeViewport {
  const forceRotated = physH > physW;
  const logicalW = forceRotated ? physH : physW;
  const logicalH = forceRotated ? physW : physH;
  const isCompact = logicalH < 560;
  return { logicalW, logicalH, forceRotated, isCompact };
}

/**
 * Converts a physical pointer displacement (dx, dy) into logical landscape-stage displacement.
 */
export function toLogicalDelta(
  dx: number,
  dy: number,
  forceRotated: boolean
): { dx: number; dy: number } {
  if (!forceRotated) return { dx, dy };
  return { dx: dy, dy: dx === 0 ? 0 : -dx };
}

/**
 * Converts physical viewport pointer coordinates (clientX, clientY) into logical
 * stage-local coordinates (0..logicalW, 0..logicalH).
 */
export function toLogicalPoint(
  clientX: number,
  clientY: number,
  physW: number,
  physH: number,
  forceRotated: boolean
): { x: number; y: number } {
  if (!forceRotated) return { x: clientX, y: clientY };
  void physH;
  return {
    x: clientY,
    y: physW - clientX,
  };
}
