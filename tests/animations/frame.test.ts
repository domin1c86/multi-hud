import { describe, it, expect } from 'vitest';
import { frameIndex } from '../../src/animations/frame.js';

describe('frameIndex', () => {
  it('advances one frame per frame-duration and wraps', () => {
    // 8 fps → 125ms per frame, 4 frames → full cycle every 500ms.
    expect(frameIndex(0, 8, 4)).toBe(0);
    expect(frameIndex(125, 8, 4)).toBe(1);
    expect(frameIndex(375, 8, 4)).toBe(3);
    expect(frameIndex(500, 8, 4)).toBe(0); // wrapped
  });

  it('returns 0 for degenerate inputs', () => {
    expect(frameIndex(1234, 8, 0)).toBe(0);
    expect(frameIndex(1234, 0, 4)).toBe(0);
  });
});
