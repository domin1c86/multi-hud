import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlmProvider } from '../../src/providers/glm.js';

describe('GlmProvider', () => {
  let provider: GlmProvider;

  beforeEach(() => {
    provider = new GlmProvider({ apiKey: 'test-key', baseUrl: null });
    global.fetch = vi.fn();
  });

  it('returns token usage', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { total_tokens: 500, input_tokens: 300, output_tokens: 200 },
      }),
    } as Response);

    const usage = await provider.getTokenUsage();
    expect(usage!.totalTokens).toBe(500);
  });

  it('returns context limit', async () => {
    expect(await provider.getContextLimit('glm-4')).toBe(128000);
  });
});
