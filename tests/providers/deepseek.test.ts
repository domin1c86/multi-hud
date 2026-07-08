import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek.js';

describe('DeepSeekProvider', () => {
  const provider = new DeepSeekProvider({ apiKey: 'test-key', baseUrl: null });

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('getQuotas returns null (pay-as-you-go)', async () => {
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new DeepSeekProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });

  it('getBalance fetches the default absolute base URL when baseUrl is null', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '42.50' }] }),
    } as Response);

    const balance = await provider.getBalance();
    expect(global.fetch).toHaveBeenCalledWith('https://api.deepseek.com/user/balance', expect.anything());
    expect(balance).toEqual({ provider: 'deepseek', available: 42.5, currency: '¥' });
  });

  it('getBalance honors an explicit baseUrl override', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ is_available: true, balance_infos: [{ currency: 'USD', total_balance: '1.00' }] }),
    } as Response);

    const custom = new DeepSeekProvider({ apiKey: 'k', baseUrl: 'https://proxy.example.com' });
    await custom.getBalance();
    expect(global.fetch).toHaveBeenCalledWith('https://proxy.example.com/user/balance', expect.anything());
  });
});
