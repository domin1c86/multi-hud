import { describe, it, expect } from 'vitest';
import { MiMoProvider } from '../../src/providers/mimo.js';

describe('MiMoProvider', () => {
  const provider = new MiMoProvider({ apiKey: 'test-key', baseUrl: null });

  it('getTokenUsage returns null (no documented usage API)', async () => {
    const usage = await provider.getTokenUsage();
    expect(usage).toBeNull();
  });

  it('getQuotas returns null (no documented quota API)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('returns context limit for known models', async () => {
    expect(await provider.getContextLimit('mimo-v2-flash')).toBe(262144);
    expect(await provider.getContextLimit('mimo-v2-pro')).toBe(1048576);
    expect(await provider.getContextLimit('mimo-v2.5-pro')).toBe(1048576);
    expect(await provider.getContextLimit('unknown-model')).toBe(262144);
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new MiMoProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
