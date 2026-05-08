import { describe, it, expect } from 'vitest';
import { createLaserFrames } from '../../src/animations/laser.js';

describe('createLaserFrames', () => {
  it('returns an array of bar strings with a moving highlight', () => {
    const frames = createLaserFrames(10, 5, '[32m', '[40m', '[37m');
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toContain('█');
  });
});
