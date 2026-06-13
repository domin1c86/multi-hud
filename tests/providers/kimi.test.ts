import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KimiProvider } from '../../src/providers/kimi.js';

describe('KimiProvider', () => {
  let provider: KimiProvider;

  beforeEach(() => {
    provider = new KimiProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: null });
    global.fetch = vi.fn();
  });

  describe('getQuotas', () => {
    it('parses coding plan quota response with 5h and weekly windows', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          limits: [
            {
              detail: {
                limit: 100,
                remaining: 80,
                resetTime: 1774091383998,
              },
            },
          ],
          usage: {
            limit: 500,
            remaining: 350,
            resetTime: '2025-07-01T00:00:00Z',
          },
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas!.length).toBe(2);

      // 5h window
      expect(quotas![0].name).toBe('5h');
      expect(quotas![0].used).toBe(20); // 100 - 80
      expect(quotas![0].limit).toBe(100);
      expect(quotas![0].usedPercentage).toBe(20); // (20/100)*100
      expect(quotas![0].resetsAt).toBeInstanceOf(Date);

      // Weekly window
      expect(quotas![1].name).toBe('weekly');
      expect(quotas![1].used).toBe(150); // 500 - 350
      expect(quotas![1].limit).toBe(500);
      expect(quotas![1].usedPercentage).toBe(30); // (150/500)*100
      expect(quotas![1].resetsAt).toBeInstanceOf(Date);
    });

    it('handles string-valued limit/remaining and numeric ms resetTime', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          limits: [
            {
              detail: {
                limit: '200',
                remaining: '150',
                resetTime: 1774091383998, // ms timestamp
              },
            },
          ],
          usage: {
            limit: '1000',
            remaining: '750',
            resetTime: 1720000000, // seconds timestamp (<1e12)
          },
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas![0].limit).toBe(200);
      expect(quotas![0].used).toBe(50);
      expect(quotas![0].usedPercentage).toBe(25);
      expect(quotas![1].limit).toBe(1000);
      expect(quotas![1].used).toBe(250);
    });

    it('uses codingPlanBaseUrl when configured', async () => {
      const customProvider = new KimiProvider({
        apiKey: 'test-key',
        baseUrl: null,
        codingPlanBaseUrl: 'https://custom.kimi.api',
        region: null,
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          limits: [
            { detail: { limit: 100, remaining: 90, resetTime: 1774091383998 } },
          ],
          usage: { limit: 500, remaining: 500, resetTime: 1774091383998 },
        }),
      } as Response);

      await customProvider.getQuotas();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom.kimi.api/coding/v1/usages',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('returns null without api key', async () => {
      const noKey = new KimiProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
      const quotas = await noKey.getQuotas();
      expect(quotas).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
      const quotas = await provider.getQuotas();
      expect(quotas).toBeNull();
    });

    it('returns null on HTTP error', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);
      const quotas = await provider.getQuotas();
      expect(quotas).toBeNull();
    });

    it('returns null when response has no limits or usage', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);
      const quotas = await provider.getQuotas();
      expect(quotas).toBeNull();
    });

    it('skips 5h window if limit is 0', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          limits: [{ detail: { limit: 0, remaining: 0, resetTime: 0 } }],
          usage: { limit: 100, remaining: 50, resetTime: '2025-07-01T00:00:00Z' },
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas!.length).toBe(1);
      expect(quotas![0].name).toBe('weekly');
    });
  });

  describe('getBalance', () => {
    it('parses balance response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          data: { available_balance: 50.5, voucher_balance: 10, cash_balance: 40.5 },
        }),
      } as Response);

      const balance = await provider.getBalance();
      expect(balance).not.toBeNull();
      expect(balance!.provider).toBe('kimi');
      expect(balance!.available).toBe(50.5);
      expect(balance!.currency).toBe('¥');
    });

    it('returns null without api key', async () => {
      const noKey = new KimiProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
      const balance = await noKey.getBalance();
      expect(balance).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('validates config', async () => {
      expect(await provider.validateConfig()).toBe(true);
      const bad = new KimiProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
      expect(await bad.validateConfig()).toBe(false);
    });
  });
});