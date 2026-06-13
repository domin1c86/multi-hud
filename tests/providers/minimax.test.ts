import { describe, it, expect } from 'vitest';
import { MiniMaxProvider } from '../../src/providers/minimax.js';

describe('MiniMaxProvider', () => {
  const provider = new MiniMaxProvider({ apiKey: 'test-key', baseUrl: null });

  it('getTokenUsage returns null (no public usage API)', async () => {
    const usage = await provider.getTokenUsage();
    expect(usage).toBeNull();
  });

  it('getQuotas returns null (no public quota API)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('returns context limit', async () => {
    expect(await provider.getContextLimit('minimax-m2.5')).toBe(200000);
    expect(await provider.getContextLimit('unknown')).toBe(200000);
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new MiniMaxProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
