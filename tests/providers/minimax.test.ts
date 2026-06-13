import { describe, it, expect } from 'vitest';
import { MiniMaxProvider } from '../../src/providers/minimax.js';

describe('MiniMaxProvider', () => {
  const provider = new MiniMaxProvider({ apiKey: 'test-key', baseUrl: null });

  it('getQuotas returns null (no public quota API)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new MiniMaxProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
