import { describe, it, expect } from 'vitest';
import { MiMoProvider } from '../../src/providers/mimo.js';

describe('MiMoProvider', () => {
  const provider = new MiMoProvider({ apiKey: 'test-key', baseUrl: null });

  it('getQuotas returns null (no documented quota API)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new MiMoProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
