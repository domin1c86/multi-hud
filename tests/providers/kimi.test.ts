import { describe, it, expect } from 'vitest';
import { KimiProvider } from '../../src/providers/kimi.js';

describe('KimiProvider', () => {
  const provider = new KimiProvider({ apiKey: 'test-key', baseUrl: null });

  it('getTokenUsage returns null (balance endpoint, not token usage)', async () => {
    // Kimi /v1/users/me/balance returns account balance, not token counts.
    const usage = await provider.getTokenUsage();
    expect(usage).toBeNull();
  });

  it('getQuotas returns null (no public quota API documented)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('returns context limit', async () => {
    expect(await provider.getContextLimit('kimi-latest')).toBe(256000);
    expect(await provider.getContextLimit('unknown')).toBe(256000);
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new KimiProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
