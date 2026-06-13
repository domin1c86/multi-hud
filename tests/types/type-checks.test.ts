import { describe, it, expect } from 'vitest';
import type { TokenUsage, QuotaWindow, BalanceInfo } from '../../src/types/index.js';

describe('type checks', () => {
  it('TokenUsage type compiles with cache fields', () => {
    const usage: TokenUsage = {
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3,
      cacheReadTokens: 4,
      cacheCreationTokens: 5,
    };
    expect(usage.totalTokens).toBe(3);
    expect(usage.cacheReadTokens).toBe(4);
  });

  it('QuotaWindow type compiles', () => {
    const qw: QuotaWindow = { name: '5h', used: 1, limit: 10, usedPercentage: 10 };
    expect(qw.name).toBe('5h');
  });

  it('BalanceInfo type compiles', () => {
    const bi: BalanceInfo = { provider: 'deepseek', available: 100.5, currency: '¥' };
    expect(bi.provider).toBe('deepseek');
  });
});
