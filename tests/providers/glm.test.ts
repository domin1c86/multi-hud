import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlmProvider } from '../../src/providers/glm.js';

describe('GlmProvider', () => {
  let provider: GlmProvider;

  beforeEach(() => {
    provider = new GlmProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: null });
    global.fetch = vi.fn();
  });

  it('getQuotas parses quota/limit response with updated unit mapping', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          level: 'lite',
          limits: [
            { type: 'TOKENS_LIMIT', unit: 3, percentage: 10, nextResetTime: 1774091383998 },
            { type: 'TOKENS_LIMIT', unit: 6, percentage: 77, nextResetTime: 1772276983998 },
            { type: 'TOKENS_LIMIT', unit: 99, percentage: 50 },
          ],
        },
      }),
    } as Response);

    const quotas = await provider.getQuotas();
    expect(quotas).not.toBeNull();
    expect(quotas!.length).toBe(2);
    expect(quotas![0].name).toBe('5h');
    expect(quotas![0].usedPercentage).toBe(10);
    expect(quotas![0].resetsAt).toBeInstanceOf(Date);
    expect(quotas![1].name).toBe('weekly');
    expect(quotas![1].usedPercentage).toBe(77);
  });

  it('getQuotas returns null without api key', async () => {
    const noKey = new GlmProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
    const quotas = await noKey.getQuotas();
    expect(quotas).toBeNull();
  });

  it('getQuotas returns null when success is false', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, data: { limits: [] } }),
    } as Response);

    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('uses CN base URL by default', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { limits: [] } }),
    } as Response);

    await provider.getQuotas();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://open.bigmodel.cn/api/monitor/usage/quota/limit',
      expect.objectContaining({}),
    );
  });

  it('uses international base URL when region is intl', async () => {
    const intlProvider = new GlmProvider({ apiKey: 'test-key', baseUrl: null, codingPlanBaseUrl: null, region: 'intl' });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { limits: [] } }),
    } as Response);

    await intlProvider.getQuotas();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.z.ai/api/monitor/usage/quota/limit',
      expect.objectContaining({}),
    );
  });

  it('uses custom baseUrl when provided', async () => {
    const customProvider = new GlmProvider({ apiKey: 'test-key', baseUrl: 'https://custom.glm.api', codingPlanBaseUrl: null, region: null });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { limits: [] } }),
    } as Response);

    await customProvider.getQuotas();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://custom.glm.api/api/monitor/usage/quota/limit',
      expect.objectContaining({}),
    );
  });

  it('sends raw API key without Bearer prefix', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { limits: [] } }),
    } as Response);

    await provider.getQuotas();
    const callArgs = vi.mocked(global.fetch).mock.calls[0][1];
    const headers = callArgs?.headers as Record<string, string>;
    expect(headers?.Authorization).toBe('test-key');
  });

  it('returns null on fetch error', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new GlmProvider({ apiKey: '', baseUrl: null, codingPlanBaseUrl: null, region: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});