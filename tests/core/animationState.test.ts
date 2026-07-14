import { describe, it, expect } from 'vitest';
import { resolveOnChange, ANIM_WINDOW_MS } from '../../src/core/animationState.js';

describe('resolveOnChange', () => {
  it('activates on the first sighting of a bar', () => {
    const r = resolveOnChange(undefined, 20, 5, 1000);
    expect(r.active).toBe(true);
    expect(r.next).toEqual({ pct: 20, changedAt: 1000 });
  });

  it('activates when the value jumps by at least the threshold', () => {
    const prev = { pct: 20, changedAt: 0 };
    const r = resolveOnChange(prev, 26, 5, 10_000); // jumped 6 ≥ 5
    expect(r.active).toBe(true);
    expect(r.next.changedAt).toBe(10_000);
  });

  it('does not re-trigger for a sub-threshold change and expires after the window', () => {
    const prev = { pct: 20, changedAt: 0 };
    const r = resolveOnChange(prev, 22, 5, ANIM_WINDOW_MS + 1); // jumped 2 < 5
    expect(r.active).toBe(false);
    expect(r.next.changedAt).toBe(0); // unchanged
    expect(r.next.pct).toBe(22);
  });

  it('stays active within the window after a change', () => {
    const prev = { pct: 20, changedAt: 500 };
    const r = resolveOnChange(prev, 21, 5, 500 + ANIM_WINDOW_MS - 1);
    expect(r.active).toBe(true);
  });
});
