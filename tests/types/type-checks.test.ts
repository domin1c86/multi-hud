import { describe, it, expect } from 'vitest';
import type { TokenUsage, QuotaWindow, ProviderAdapter } from '../../src/types/index.js';

describe('type checks', () => {
  it('TokenUsage type compiles', () => {
    const usage: TokenUsage = { inputTokens: 1, outputTokens: 2, totalTokens: 3 };
    expect(usage.totalTokens).toBe(3);
  });

  it('QuotaWindow type compiles', () => {
    const qw: QuotaWindow = { name: '5h', used: 1, limit: 10, usedPercentage: 10 };
    expect(qw.name).toBe('5h');
  });
});
