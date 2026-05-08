import { describe, it, expect } from 'vitest';
import { createPulseFrames } from '../../src/animations/pulse.js';

describe('createPulseFrames', () => {
  it('returns an array of ANSI color codes', () => {
    const frames = createPulseFrames('[32m', 4);
    expect(frames.length).toBe(4);
    expect(frames[0]).not.toBe(frames[1]);
  });
});
