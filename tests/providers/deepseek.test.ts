import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek.js';

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;

  beforeEach(() => {
    provider = new DeepSeekProvider({ apiKey: 'test-key', baseUrl: null });
    global.fetch = vi.fn();
  });

  it('returns token usage', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          total_tokens: 1000,
          input_tokens: 600,
          output_tokens: 400,
        },
      }),
    } as Response);

    const usage = await provider.getTokenUsage();
    expect(usage).not.toBeNull();
    expect(usage!.totalTokens).toBe(1000);
    expect(usage!.inputTokens).toBe(600);
    expect(usage!.outputTokens).toBe(400);
  });

  it('returns quotas', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          quotas: [
            { window: '5h', used: 10, limit: 100, reset_at: '2026-05-08T20:00:00Z' },
          ],
        },
      }),
    } as Response);

    const quotas = await provider.getQuotas();
    expect(quotas).not.toBeNull();
    expect(quotas!.length).toBe(1);
    expect(quotas![0].name).toBe('5h');
    expect(quotas![0].usedPercentage).toBe(10);
  });

  it('returns context limit for known models', async () => {
    const limit = await provider.getContextLimit('deepseek-chat');
    expect(limit).toBe(64000);
  });

  it('validates config', async () => {
    expect(await provider.validateConfig()).toBe(true);
    const bad = new DeepSeekProvider({ apiKey: '', baseUrl: null });
    expect(await bad.validateConfig()).toBe(false);
  });
});
