import { describe, it, expect } from 'vitest';
import { calculateCost } from '../../src/core/cost.js';
import { PricingConfig } from '../../src/types/index.js';

const pricing: PricingConfig = {
  currency: 'CNY',
  models: {
    'deepseek-chat': { input: 0.001, output: 0.002 },
  },
};

describe('calculateCost', () => {
  it('calculates cost from token usage', () => {
    const cost = calculateCost('deepseek-chat', 1000, 500, pricing);
    expect(cost).toBeCloseTo(0.002, 3);
  });

  it('returns null for unknown model', () => {
    const cost = calculateCost('unknown-model', 1000, 500, pricing);
    expect(cost).toBeNull();
  });

  it('returns 0 for zero tokens', () => {
    const cost = calculateCost('deepseek-chat', 0, 0, pricing);
    expect(cost).toBe(0);
  });
});
