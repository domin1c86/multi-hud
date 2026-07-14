import { describe, it, expect } from 'vitest';
import { animateBar, resolveBarAnimation } from '../../src/animations/index.js';
import type { AnimationConfig } from '../../src/types/index.js';

const ESC = '\x1b';
const FG = `${ESC}[38;2;57;197;187m`;
const BG = `${ESC}[48;2;38;131;124m`;

const globalOn = {
  enabled: true,
  defaultMode: 'always' as const,
  defaultType: 'pulse' as const,
  triggerThreshold: 5,
};

describe('resolveBarAnimation', () => {
  const barOff: AnimationConfig = { enabled: false, mode: 'on-change', type: 'none', triggerThreshold: 5 };

  it('returns null when the master switch is off', () => {
    expect(resolveBarAnimation(barOff, { ...globalOn, enabled: false })).toBeNull();
  });

  it('falls back to global defaults when the bar does not opt in', () => {
    expect(resolveBarAnimation(barOff, globalOn)).toEqual({ type: 'pulse', mode: 'always', triggerThreshold: 5 });
  });

  it('uses the bar’s own animation when it opts in', () => {
    const bar: AnimationConfig = { enabled: true, mode: 'on-change', type: 'laser', triggerThreshold: 10 };
    expect(resolveBarAnimation(bar, globalOn)).toEqual({ type: 'laser', mode: 'on-change', triggerThreshold: 10 });
  });

  it('returns null when neither the bar nor the global default names an effect', () => {
    expect(resolveBarAnimation(barOff, { ...globalOn, defaultType: 'none' })).toBeNull();
  });
});

describe('animateBar', () => {
  it('pulse changes the fill color as time advances but keeps the bar shape', () => {
    const a = animateBar(50, FG, BG, 10, 'pulse', 0);
    const b = animateBar(50, FG, BG, 10, 'pulse', 375);
    expect(a).not.toBe(b); // different brightness frame
    // 50% of width 10 = 5 filled blocks in both frames
    expect((a.match(/█/g) || []).length).toBe(5);
    expect((b.match(/█/g) || []).length).toBe(5);
  });

  it('laser moves the highlight cell across the filled region over time', () => {
    const f0 = animateBar(100, FG, BG, 10, 'laser', 0);
    const f1 = animateBar(100, FG, BG, 10, 'laser', 125);
    expect(f0).not.toBe(f1);
    // The highlight is a brightened, still-tinted truecolor (not the plain fill).
    expect(f0).toContain(`${ESC}[38;2;`);
    expect(f0).toContain('█');
  });

  it('laser with an empty bar falls back to a pulse frame instead of throwing', () => {
    const out = animateBar(0, FG, BG, 10, 'laser', 0);
    expect((out.match(/░/g) || []).length).toBe(10);
  });
});
