import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MiniMaxProvider } from '../../src/providers/minimax.js';

describe('MiniMaxProvider', () => {
  let provider: MiniMaxProvider;

  beforeEach(() => {
    provider = new MiniMaxProvider({ apiKey: 'test-key', baseUrl: null });
    global.fetch = vi.fn();
  });

  it('returns token usage', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { total_tokens: 800, input_tokens: 500, output_tokens: 300 },
      }),
    } as Response);

    const usage = await provider.getTokenUsage();
    expect(usage!.totalTokens).toBe(800);
  });

  it('returns context limit', async () => {
    expect(await provider.getContextLimit('minimax-text-01')).toBe(8000);
  });
});
