import { describe, it, expect } from 'vitest';
import { parseModelId, getContextLimit, getModelPrice, calculateCost } from '../../src/core/pricing.js';

describe('parseModelId', () => {
  it('parses a simple model ID', () => {
    const result = parseModelId('mimo-v2.5-pro');
    expect(result.modelId).toBe('mimo-v2.5-pro');
    expect(result.provider).toBe('mimo');
    expect(result.oneMCtx).toBe(false);
  });

  it('parses a model ID with [1m] suffix', () => {
    const result = parseModelId('deepseek-v4-pro[1m]');
    expect(result.modelId).toBe('deepseek-v4-pro');
    expect(result.provider).toBe('deepseek');
    expect(result.oneMCtx).toBe(true);
  });

  it('parses a model ID with multiple dashes', () => {
    const result = parseModelId('glm-4.6v-flashx');
    expect(result.modelId).toBe('glm-4.6v-flashx');
    expect(result.provider).toBe('glm');
    expect(result.oneMCtx).toBe(false);
  });

  it('handles model ID with [2m] suffix', () => {
    const result = parseModelId('deepseek-v4-flash[2m]');
    expect(result.modelId).toBe('deepseek-v4-flash');
    expect(result.oneMCtx).toBe(true);
  });
});

describe('getContextLimit', () => {
  it('returns provider default for mimo (1M)', () => {
    expect(getContextLimit('mimo-v2.5-pro')).toBe(1_000_000);
  });

  it('returns model-specific context for kimi', () => {
    expect(getContextLimit('kimi-k2.7-code')).toBe(256_000);
    expect(getContextLimit('moonshot-v1-8k')).toBe(8_000);
    expect(getContextLimit('moonshot-v1-128k')).toBe(128_000);
  });

  it('returns 200k for deepseek without [1m]', () => {
    expect(getContextLimit('deepseek-v4-flash')).toBe(200_000);
  });

  it('returns 1M for deepseek with [1m]', () => {
    expect(getContextLimit('deepseek-v4-pro[1m]')).toBe(1_000_000);
  });

  it('prefers claudeCodeCtxSize when provided', () => {
    expect(getContextLimit('deepseek-v4-flash', 500_000)).toBe(500_000);
    expect(getContextLimit('glm-4.7', 300_000)).toBe(300_000);
  });

  it('returns model-specific context for glm', () => {
    expect(getContextLimit('glm-5.1')).toBe(200_000);
    expect(getContextLimit('glm-4.5')).toBe(100_000);
    expect(getContextLimit('glm-4.6v')).toBe(128_000);
  });

  it('returns model-specific context for minimax', () => {
    expect(getContextLimit('minimax-m3')).toBe(1_000_000);
    expect(getContextLimit('minimax-m2.7')).toBe(200_000);
  });

  it('returns 200k fallback for unknown provider', () => {
    expect(getContextLimit('unknown-model')).toBe(200_000);
  });
});

describe('getModelPrice', () => {
  it('returns flat pricing for mimo models', () => {
    const price = getModelPrice('mimo-v2.5-pro', 50_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(3.0);
    expect(price!.inputCached).toBe(0.025);
    expect(price!.output).toBe(6.0);
  });

  it('returns flat pricing for deepseek models', () => {
    const price = getModelPrice('deepseek-v4-flash', 50_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(1.0);
    expect(price!.inputCached).toBe(0.02);
    expect(price!.output).toBe(2.0);
  });

  it('returns null for unknown model', () => {
    expect(getModelPrice('unknown-model', 50_000, 1_000)).toBeNull();
  });

  it('resolves GLM high tier when context >= 32k', () => {
    const price = getModelPrice('glm-4.7', 40_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(4.0); // high tier
    expect(price!.output).toBe(16.0);
  });

  it('resolves GLM medium tier when context < 32k and output >= 0.2k', () => {
    const price = getModelPrice('glm-4.7', 20_000, 500);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(3.0); // medium tier
    expect(price!.output).toBe(14.0);
  });

  it('resolves GLM low tier when context < 32k and output < 0.2k', () => {
    const price = getModelPrice('glm-4.7', 20_000, 100);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(2.0); // low tier
    expect(price!.output).toBe(8.0);
  });

  it('resolves MiniMax high tier when context > 512k', () => {
    const price = getModelPrice('minimax-m3', 600_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(4.2);
    expect(price!.output).toBe(16.8);
  });

  it('resolves MiniMax low tier when context <= 512k', () => {
    const price = getModelPrice('minimax-m3', 200_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(2.1);
    expect(price!.output).toBe(8.4);
  });

  it('returns free pricing for glm-4.7-flash', () => {
    const price = getModelPrice('glm-4.7-flash', 50_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(0);
    expect(price!.output).toBe(0);
  });

  it('returns flat pricing for minimax-m2.7', () => {
    const price = getModelPrice('minimax-m2.7', 50_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(2.1);
    expect(price!.inputCached).toBe(0.42);
    expect(price!.output).toBe(8.4);
  });

  it('handles [1m] suffix in model ID for pricing lookup', () => {
    const price = getModelPrice('deepseek-v4-pro[1m]', 50_000, 1_000);
    expect(price).not.toBeNull();
    expect(price!.inputUncached).toBe(3.0); // same as deepseek-v4-pro
  });
});

describe('calculateCost', () => {
  it('calculates cost with cache hit distinction', () => {
    // mimo-v2.5: input_uncached=1.0, input_cached=0.02, output=2.0 per 1M tokens
    const cost = calculateCost('mimo-v2.5', 500_000, 200_000, 100_000, 50_000, 800_000);
    // uncached: 500k * 1.0 / 1M = 0.5
    // cache_read: 200k * 0.02 / 1M = 0.004
    // cache_creation: 100k * 0.02 / 1M = 0.002
    // output: 50k * 2.0 / 1M = 0.1
    // total = 0.5 + 0.004 + 0.002 + 0.1 = 0.606
    expect(cost).toBeCloseTo(0.606, 3);
  });

  it('returns null for unknown model', () => {
    expect(calculateCost('unknown-model', 1000, 500, 0, 500, 2000)).toBeNull();
  });

  it('calculates cost for GLM with context-based tiering', () => {
    // glm-4.7 with context < 32k and output < 0.2k → low tier
    // low: input_uncached=2.0, input_cached=0.4, output=8.0
    const cost = calculateCost('glm-4.7', 10_000, 5_000, 0, 100, 15_100);
    // uncached: 10k * 2.0 / 1M = 0.02
    // cache_read: 5k * 0.4 / 1M = 0.002
    // output: 100 * 8.0 / 1M = 0.0008
    // total = 0.02 + 0.002 + 0 + 0.0008 = 0.0228
    expect(cost).toBeCloseTo(0.0228, 4);
  });

  it('calculates zero cost for free models', () => {
    const cost = calculateCost('glm-4.7-flash', 100_000, 50_000, 0, 10_000, 160_000);
    expect(cost).toBe(0);
  });
});
