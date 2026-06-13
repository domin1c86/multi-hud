import { describe, it, expect } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek.js';

describe('DeepSeekProvider', () => {
  const provider = new DeepSeekProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: null });

  it('getQuotas returns null (pay-as-you-go)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new DeepSeekProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
