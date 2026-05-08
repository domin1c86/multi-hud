import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KimiProvider } from '../../src/providers/kimi.js';

describe('KimiProvider', () => {
  let provider: KimiProvider;

  beforeEach(() => {
    provider = new KimiProvider({ apiKey: 'test-key', baseUrl: null });
    global.fetch = vi.fn();
  });

  it('returns token usage', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { total_tokens: 2000, input_tokens: 1200, output_tokens: 800 },
      }),
    } as Response);

    const usage = await provider.getTokenUsage();
    expect(usage!.totalTokens).toBe(2000);
  });

  it('returns quotas', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          quotas: [
            { window: '5h', used: 5, limit: 50, reset_at: '2026-05-08T20:00:00Z' },
            { window: '24h', used: 20, limit: 200, reset_at: '2026-05-09T08:00:00Z' },
          ],
        },
      }),
    } as Response);

    const quotas = await provider.getQuotas();
    expect(quotas!.length).toBe(2);
    expect(quotas![1].name).toBe('24h');
  });

  it('returns context limit', async () => {
    expect(await provider.getContextLimit('kimi-latest')).toBe(256000);
  });
});
