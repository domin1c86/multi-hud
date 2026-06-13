import { describe, it, expect } from 'vitest';
import { MiMoProvider } from '../../src/providers/mimo.js';

describe('MiMoProvider', () => {
  it('getQuotas returns null (local credit tracking, no API)', async () => {
    const provider = new MiMoProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null, plan: null });
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config with apiKey', async () => {
    const provider = new MiMoProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: null, plan: null });
    expect(await provider.validateConfig()).toBe(true);
  });

  it('validates config with plan instead of apiKey', async () => {
    const provider = new MiMoProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null, plan: 'standard' });
    expect(await provider.validateConfig()).toBe(true);
  });

  it('rejects config with neither apiKey nor plan', async () => {
    const provider = new MiMoProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null, plan: null });
    expect(await provider.validateConfig()).toBe(false);
  });

  it('getBalance returns null', async () => {
    const provider = new MiMoProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: null, plan: null });
    const balance = await provider.getBalance();
    expect(balance).toBeNull();
  });
});