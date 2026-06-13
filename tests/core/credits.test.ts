import { describe, it, expect } from 'vitest';
import { getMimoCreditPrice, getMimoPlanLimit, computeMimoCredits } from '../../src/core/credits.js';

describe('getMimoCreditPrice', () => {
  it('returns pricing for mimo-v2.5', () => {
    const price = getMimoCreditPrice('mimo-v2.5');
    expect(price).not.toBeNull();
    expect(price!.input).toBe(2);
    expect(price!.input_uncached).toBe(100);
    expect(price!.output).toBe(200);
  });

  it('returns pricing for mimo-v2.5-pro', () => {
    const price = getMimoCreditPrice('mimo-v2.5-pro');
    expect(price).not.toBeNull();
    expect(price!.input).toBe(2.5);
    expect(price!.input_uncached).toBe(300);
    expect(price!.output).toBe(600);
  });

  it('returns pricing for mimo-v2.5-pro-ultraspeed', () => {
    const price = getMimoCreditPrice('mimo-v2.5-pro-ultraspeed');
    expect(price).not.toBeNull();
    expect(price!.input).toBe(7.5);
    expect(price!.input_uncached).toBe(900);
    expect(price!.output).toBe(1800);
  });

  it('returns null for unknown model', () => {
    expect(getMimoCreditPrice('unknown-model')).toBeNull();
  });
});

describe('getMimoPlanLimit', () => {
  it('returns correct limit for lite plan', () => {
    expect(getMimoPlanLimit('lite')).toBe(4_100_000_000);
  });

  it('returns correct limit for standard plan', () => {
    expect(getMimoPlanLimit('standard')).toBe(11_000_000_000);
  });

  it('returns correct limit for pro plan', () => {
    expect(getMimoPlanLimit('pro')).toBe(38_000_000_000);
  });

  it('returns correct limit for max plan', () => {
    expect(getMimoPlanLimit('max')).toBe(82_000_000_000);
  });

  it('defaults to standard for unknown plan', () => {
    expect(getMimoPlanLimit('unknown')).toBe(11_000_000_000);
  });
});

describe('computeMimoCredits', () => {
  it('computes credits for mimo-v2.5 with uncached input only', () => {
    const result = computeMimoCredits('mimo-v2.5', {
      inputUncached: 1_000_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    });
    expect(result).toBeCloseTo(100, 2); // 1M tokens × 100 credits/1M = 100
  });

  it('computes credits for mimo-v2.5-pro with all token types', () => {
    const result = computeMimoCredits('mimo-v2.5-pro', {
      inputUncached: 500_000,
      cacheRead: 300_000,
      cacheCreation: 100_000,
      output: 200_000,
    });
    // uncached: 500k * 300 / 1M = 150
    // cache read: 300k * 2.5 / 1M = 0.75
    // cache creation: 100k * 2.5 / 1M = 0.25
    // output: 200k * 600 / 1M = 120
    // total: 150 + 0.75 + 0.25 + 120 = 271
    expect(result).toBeCloseTo(271, 2);
  });

  it('returns null for unknown model', () => {
    expect(computeMimoCredits('unknown-model', {
      inputUncached: 1000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    })).toBeNull();
  });

  it('returns 0 for zero tokens', () => {
    const result = computeMimoCredits('mimo-v2.5', {
      inputUncached: 0,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    });
    expect(result).toBe(0);
  });
});