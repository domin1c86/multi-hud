import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MiniMaxProvider } from '../../src/providers/minimax.js';

describe('MiniMaxProvider', () => {
  let provider: MiniMaxProvider;

  beforeEach(() => {
    provider = new MiniMaxProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: null });
    global.fetch = vi.fn();
  });

  describe('getQuotas', () => {
    it('parses coding plan response with 5h and weekly windows', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0, status_msg: '' },
          model_remains: [
            {
              model_name: 'general',
              current_interval_remaining_percent: 75.5,
              current_weekly_remaining_percent: 60.0,
              current_weekly_status: 1,
              end_time: 1774091383998,
              weekly_end_time: 1774696183998,
            },
            {
              model_name: 'video',
              current_interval_remaining_percent: 90.0,
              current_weekly_remaining_percent: 80.0,
              current_weekly_status: 3,
              end_time: 1774091383998,
              weekly_end_time: 1774696183998,
            },
          ],
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas!.length).toBe(2);

      // 5h window
      expect(quotas![0].name).toBe('5h');
      expect(quotas![0].usedPercentage).toBe(24.5); // 100 - 75.5
      expect(quotas![0].limit).toBe(100);
      expect(quotas![0].resetsAt).toBeInstanceOf(Date);

      // Weekly window
      expect(quotas![1].name).toBe('weekly');
      expect(quotas![1].usedPercentage).toBe(40.0); // 100 - 60.0
      expect(quotas![1].resetsAt).toBeInstanceOf(Date);
    });

    it('excludes weekly window when current_weekly_status is not 1', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0, status_msg: '' },
          model_remains: [
            {
              model_name: 'general',
              current_interval_remaining_percent: 50.0,
              current_weekly_remaining_percent: 80.0,
              current_weekly_status: 3,
              end_time: 1774091383998,
              weekly_end_time: 1774696183998,
            },
          ],
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).not.toBeNull();
      expect(quotas!.length).toBe(1);
      expect(quotas![0].name).toBe('5h');
    });

    it('returns null when base_resp status_code is non-zero', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 400, status_msg: 'Invalid request' },
          model_remains: [],
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).toBeNull();
    });

    it('returns null when no general model entry found', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0, status_msg: '' },
          model_remains: [
            {
              model_name: 'video',
              current_interval_remaining_percent: 50,
              current_weekly_remaining_percent: 50,
              current_weekly_status: 1,
              end_time: 1774091383998,
              weekly_end_time: 1774696183998,
            },
          ],
        }),
      } as Response);

      const quotas = await provider.getQuotas();
      expect(quotas).toBeNull();
    });

    it('returns null without api key', async () => {
      const noKey = new MiniMaxProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
      const quotas = await noKey.getQuotas();
      expect(quotas).toBeNull();
    });

    it('returns null on fetch error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
      const quotas = await provider.getQuotas();
      expect(quotas).toBeNull();
    });

    it('uses international base URL when region is intl', async () => {
      const intlProvider = new MiniMaxProvider({
        apiKey: 'test-key',
        baseUrl: null,
        codingPlanBaseUrl: null,
        region: 'intl',
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0, status_msg: '' },
          model_remains: [
            {
              model_name: 'general',
              current_interval_remaining_percent: 100,
              current_weekly_remaining_percent: 100,
              current_weekly_status: 1,
              end_time: 1774091383998,
              weekly_end_time: 1774696183998,
            },
          ],
        }),
      } as Response);

      await intlProvider.getQuotas();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.minimax.io/v1/api/openplatform/coding_plan/remains',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('uses CN base URL by default', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0, status_msg: '' },
          model_remains: [
            {
              model_name: 'general',
              current_interval_remaining_percent: 100,
              current_weekly_remaining_percent: 100,
              current_weekly_status: 3,
              end_time: 1774091383998,
              weekly_end_time: 0,
            },
          ],
        }),
      } as Response);

      await provider.getQuotas();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });

    it('uses custom baseUrl when configured', async () => {
      const customProvider = new MiniMaxProvider({
        apiKey: 'test-key',
        baseUrl: 'https://custom.minimax.api',
        codingPlanBaseUrl: null,
        region: null,
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0, status_msg: '' },
          model_remains: [
            {
              model_name: 'general',
              current_interval_remaining_percent: 100,
              current_weekly_remaining_percent: 100,
              current_weekly_status: 3,
              end_time: 1774091383998,
              weekly_end_time: 0,
            },
          ],
        }),
      } as Response);

      await customProvider.getQuotas();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom.minimax.api/v1/api/openplatform/coding_plan/remains',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        }),
      );
    });
  });

  describe('validateConfig', () => {
    it('validates config', async () => {
      expect(await provider.validateConfig()).toBe(true);
      const bad = new MiniMaxProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
      expect(await bad.validateConfig()).toBe(false);
    });
  });
});