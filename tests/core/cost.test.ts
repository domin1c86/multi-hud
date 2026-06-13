import { describe, it, expect } from 'vitest';
import { computeSessionCost } from '../../src/core/cost.js';

describe('computeSessionCost', () => {
  it('delegates to calculateCost with token breakdown', () => {
    const cost = computeSessionCost({
      modelId: 'mimo-v2.5',
      inputUncachedTokens: 500_000,
      cacheReadTokens: 200_000,
      cacheCreationTokens: 100_000,
      outputTokens: 50_000,
      contextTokens: 800_000,
    });
    // mimo-v2.5: input_uncached=1.0, input_cached=0.02, output=2.0 per 1M
    // uncached: 500k * 1.0 / 1M = 0.5
    // cache_read: 200k * 0.02 / 1M = 0.004
    // cache_creation: 100k * 0.02 / 1M = 0.002
    // output: 50k * 2.0 / 1M = 0.1
    // total = 0.606
    expect(cost).toBeCloseTo(0.606, 3);
  });

  it('returns null for unknown model', () => {
    const cost = computeSessionCost({
      modelId: 'unknown-model',
      inputUncachedTokens: 1000,
      cacheReadTokens: 500,
      cacheCreationTokens: 0,
      outputTokens: 500,
      contextTokens: 2000,
    });
    expect(cost).toBeNull();
  });
});
