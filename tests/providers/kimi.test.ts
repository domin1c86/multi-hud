import { describe, it, expect } from 'vitest';
import { KimiProvider } from '../../src/providers/kimi.js';

describe('KimiProvider', () => {
  const provider = new KimiProvider({ apiKey: 'test-key', baseUrl: null });

  it('getQuotas returns null (no public quota API documented)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new KimiProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
