import { describe, it, expect } from 'vitest';
import { createPulseFrames } from '../../src/animations/pulse.js';

const ESC = '\x1b';
const FG = `${ESC}[38;2;57;197;187m`;

describe('createPulseFrames', () => {
  it('returns brightness-scaled variants of a truecolor fg', () => {
    const frames = createPulseFrames(FG, 6);
    expect(frames.length).toBe(6);
    // Every frame is a truecolor fg escape...
    frames.forEach((f) => {
      expect(f.startsWith(`${ESC}[38;2;`)).toBe(true);
      expect(f.endsWith('m')).toBe(true);
    });
    // ...and the pulse actually changes brightness across the cycle.
    expect(frames[0]).not.toBe(frames[3]);
  });

  it('preserves a bold/italic prefix', () => {
    const frames = createPulseFrames('\x1b[1m' + FG, 4);
    frames.forEach((f) => expect(f.startsWith('\x1b[1m')).toBe(true));
  });

  it('returns the color unchanged for non-truecolor input', () => {
    const frames = createPulseFrames('[32m', 3);
    expect(frames).toEqual(['[32m', '[32m', '[32m']);
  });
});
