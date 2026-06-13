import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlmProvider } from '../../src/providers/glm.js';

describe('GlmProvider', () => {
  let provider: GlmProvider;

  beforeEach(() => {
    provider = new GlmProvider({ apiKey: 'test-key', baseUrl: null });
    global.fetch = vi.fn();
  });

  it('getTokenUsage parses model-usage response', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { totalTokens: 500, inputTokens: 300, outputTokens: 200 },
      }),
    } as Response);

    const usage = await provider.getTokenUsage();
    expect(usage).not.toBeNull();
    expect(usage!.totalTokens).toBe(500);
    expect(usage!.inputTokens).toBe(300);
    expect(usage!.outputTokens).toBe(200);
  });

  it('getTokenUsage returns null when success is false', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, data: null }),
    } as Response);

    const usage = await provider.getTokenUsage();
    expect(usage).toBeNull();
  });

  it('getQuotas parses quota/limit response', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          level: 'lite',
          limits: [
            { type: 'TIME_LIMIT', unit: 5, percentage: 10, nextResetTime: 1774091383998 },
            { type: 'TOKENS_LIMIT', unit: 6, percentage: 77, nextResetTime: 1772276983998 },
            { type: 'TOKENS_LIMIT', unit: 3, percentage: 36 },
            { type: 'TOKENS_LIMIT', unit: 99, percentage: 50 }, // unknown unit → filtered
          ],
        },
      }),
    } as Response);

    const quotas = await provider.getQuotas();
    expect(quotas).not.toBeNull();
    expect(quotas!.length).toBe(3); // unit 99 filtered out
    expect(quotas![0].name).toBe('5h');
    expect(quotas![0].usedPercentage).toBe(10);
    expect(quotas![0].resetsAt).toBeInstanceOf(Date);
    expect(quotas![1].name).toBe('7d');
    expect(quotas![2].name).toBe('30d');
  });

  it('getQuotas returns null when success is false', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, data: { limits: [] } }),
    } as Response);

    const quotas = await provider.getQuotas();
    expect(quotas).toBeNull();
  });

  it('returns context limit', async () => {
    expect(await provider.getContextLimit('glm-4')).toBe(128000);
    expect(await provider.getContextLimit('glm-4-flash')).toBe(128000);
    expect(await provider.getContextLimit('unknown')).toBe(128000);
  });
});
