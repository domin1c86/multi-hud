import { parseTruecolorFg, truecolorFg } from './color.js';

/**
 * Brightness-scaled copies of a compiled truecolor foreground escape, forming a
 * smooth pulse: a triangle wave that dims to `minBrightness` at the ends and
 * returns to full brightness in the middle. Any bold/italic prefix on the input
 * escape is preserved. If the input is not a truecolor fg (e.g. a themeless ASCII
 * theme), the color is returned unchanged for every frame.
 */
export function createPulseFrames(compiledFg: string, frameCount: number, minBrightness = 0.45): string[] {
  const count = Math.max(0, frameCount);
  const parsed = parseTruecolorFg(compiledFg);
  if (!parsed || count === 0) {
    return Array.from({ length: count }, () => compiledFg);
  }

  const { prefix, r, g, b } = parsed;
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const phase = i / count; // 0..1 across the cycle
    const triangle = 1 - Math.abs(0.5 - phase) * 2; // 0 → 1 → 0
    const scale = minBrightness + (1 - minBrightness) * triangle;
    frames.push(truecolorFg(prefix, r * scale, g * scale, b * scale));
  }
  return frames;
}
