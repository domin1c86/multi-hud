import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KimiProvider } from '../../src/providers/kimi.js';

describe('KimiProvider', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('validates config', async () => {
    const provider = new KimiProvider({ apiKey: 'test-key', baseUrl: null });
    expect(await provider.validateConfig()).toBe(true);
    const bad = new KimiProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });

  describe('getQuotas', () => {
    it('returns null without an api key', async () => {
      const provider = new KimiProvider({ apiKey: '', baseUrl: null });
      expect(await provider.getQuotas()).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null (and does not call the endpoint) for a non-coding key', async () => {
      const provider = new KimiProvider({ apiKey: 'sk-pay-as-you-go', baseUrl: null });
      expect(await provider.getQuotas()).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('parses the limits[] shape into 5h + weekly windows', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          limits: [
            { detail: { name: '5h', limit: 100, used: 30 }, window: { duration: 5, time_unit: 'HOUR' } },
            { detail: { name: 'weekly', limit: 1000, used: 250 }, window: { duration: 7, time_unit: 'DAY' } },
          ],
        }),
      } as Response);

      const provider = new KimiProvider({ apiKey: 'sk-kimi-abc', baseUrl: null });
      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas!.map((q) => q.name)).toEqual(['5h', '7d']);
      expect(quotas![0].usedPercentage).toBe(30);
      expect(quotas![1].usedPercentage).toBe(25);
    });

    it('hits the coding host with the KimiCLI user-agent', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ limits: [] }),
      } as Response);

      const provider = new KimiProvider({ apiKey: 'sk-kimi-abc', baseUrl: null });
      await provider.getQuotas();

      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe('https://api.kimi.com/coding/v1/usages');
      expect((init?.headers as Record<string, string>)['User-Agent']).toBe('KimiCLI/1.6');
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-kimi-abc');
    });

    it('parses the data[] "all" weekly shape', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { model_name: 'all', limit: 1000, used: 400 },
            { model_name: 'kimi-k2.6', limit: 500, used: 100 },
          ],
        }),
      } as Response);

      const provider = new KimiProvider({ apiKey: 'sk-kimi-abc', baseUrl: null });
      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas!.length).toBe(1);
      expect(quotas![0].name).toBe('7d');
      expect(quotas![0].usedPercentage).toBe(40);
    });

    it('falls back to /usage when /usages 404s', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'not found' } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            limits: [{ detail: { name: '5h', limit: 100, used: 10 }, window: { duration: 5, time_unit: 'HOUR' } }],
          }),
        } as Response);

      const provider = new KimiProvider({ apiKey: 'sk-kimi-abc', baseUrl: null });
      const quotas = await provider.getQuotas();
      expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe('https://api.kimi.com/coding/v1/usages');
      expect(vi.mocked(global.fetch).mock.calls[1][0]).toBe('https://api.kimi.com/coding/v1/usage');
      expect(quotas!.length).toBe(1);
      expect(quotas![0].name).toBe('5h');
    });

    it('returns null on a non-ok response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500, text: async () => 'err' } as Response);
      const provider = new KimiProvider({ apiKey: 'sk-kimi-abc', baseUrl: null });
      expect(await provider.getQuotas()).toBeNull();
    });

    it('returns null on an unrecognized payload', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({ foo: 'bar' }) } as Response);
      const provider = new KimiProvider({ apiKey: 'sk-kimi-abc', baseUrl: null });
      expect(await provider.getQuotas()).toBeNull();
    });
  });

  describe('getBalance', () => {
    it('parses the balance response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ code: 0, data: { available_balance: 42.5, voucher_balance: 0, cash_balance: 42.5 } }),
      } as Response);

      const provider = new KimiProvider({ apiKey: 'sk-abc', baseUrl: null });
      const balance = await provider.getBalance();
      expect(balance).toEqual({ provider: 'kimi', available: 42.5, currency: '¥' });
    });
  });
});
