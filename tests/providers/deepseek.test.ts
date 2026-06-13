import { describe, it, expect } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek.js';

describe('DeepSeekProvider', () => {
  const provider = new DeepSeekProvider({ apiKey: 'test-key', baseUrl: null });

  it('getTokenUsage returns null (no public token usage API)', async () => {
    // DeepSeek /user/balance returns account balance, not token counts.
    const usage = await provider.getTokenUsage();
    expect(usage).toBeNull();
  });

  it('getQuotas returns null (DeepSeek is pay-as-you-go, no quotas)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('returns context limit for known models', async () => {
    expect(await provider.getContextLimit('deepseek-chat')).toBe(64000);
    expect(await provider.getContextLimit('deepseek-coder')).toBe(64000);
    expect(await provider.getContextLimit('unknown')).toBe(64000);
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new DeepSeekProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
