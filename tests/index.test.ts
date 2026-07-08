import { describe, it, expect } from 'vitest';
import { main, quotasFromRateLimits, costBasisFrom } from '../src/index.js';

describe('index', () => {
  it('exports a main function', () => {
    expect(typeof main).toBe('function');
  });
});

describe('quotasFromRateLimits', () => {
  it('maps five_hour and seven_day to 5h/7d windows', () => {
    const quotas = quotasFromRateLimits({
      five_hour: { used_percentage: 42, resets_at: 1774091383998 },
      seven_day: { used_percentage: 77, resets_at: 1772276983998 },
    });
    expect(quotas.map((q) => q.name)).toEqual(['5h', '7d']);
    expect(quotas[0].usedPercentage).toBe(42);
    expect(quotas[0].resetsAt).toBeInstanceOf(Date);
    expect(quotas[1].usedPercentage).toBe(77);
  });

  it('returns an empty array when rate_limits is absent or empty', () => {
    expect(quotasFromRateLimits(undefined)).toEqual([]);
    expect(quotasFromRateLimits({})).toEqual([]);
  });
});

describe('costBasisFrom', () => {
  it('uses the current-context snapshot when current_usage is present', () => {
    const basis = costBasisFrom(
      { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 200, cache_creation_input_tokens: 100 },
      999_999, // session totals must NOT leak into the basis
      888_888,
    );
    expect(basis).toEqual({ inputUncached: 1000, cacheRead: 200, cacheCreation: 100, output: 500, context: 1300 });
  });

  it('falls back to session totals as uncached input + output when current_usage is null', () => {
    const basis = costBasisFrom(null, 5000, 2000);
    expect(basis).toEqual({ inputUncached: 5000, cacheRead: 0, cacheCreation: 0, output: 2000, context: 5000 });
  });
});
