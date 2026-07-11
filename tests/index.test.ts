import { describe, it, expect } from 'vitest';
import { main, quotasFromRateLimits, costBasisFrom, resolveAnimations } from '../src/index.js';
import { resolveTheme } from '../src/themes/index.js';
import { defaultConfig } from '../src/core/config.js';

describe('index', () => {
  it('exports a main function', () => {
    expect(typeof main).toBe('function');
  });
});

describe('quotasFromRateLimits', () => {
  it('maps five_hour and seven_day to 5h/7d windows', () => {
    // resets_at is Unix epoch *seconds* (per Claude Code statusline docs).
    const fiveHourResetsAt = 1774091383;
    const sevenDayResetsAt = 1772276983;
    const quotas = quotasFromRateLimits({
      five_hour: { used_percentage: 42, resets_at: fiveHourResetsAt },
      seven_day: { used_percentage: 77, resets_at: sevenDayResetsAt },
    });
    expect(quotas.map((q) => q.name)).toEqual(['5h', '7d']);
    expect(quotas[0].usedPercentage).toBe(42);
    expect(quotas[0].resetsAt).toBeInstanceOf(Date);
    expect(quotas[0].resetsAt?.getTime()).toBe(fiveHourResetsAt * 1000);
    expect(quotas[1].usedPercentage).toBe(77);
    expect(quotas[1].resetsAt?.getTime()).toBe(sevenDayResetsAt * 1000);
  });

  it('returns an empty array when rate_limits is absent or empty', () => {
    expect(quotasFromRateLimits(undefined)).toEqual([]);
    expect(quotasFromRateLimits({})).toEqual([]);
  });
});

describe('resolveAnimations', () => {
  const theme = resolveTheme('default', {});

  it('returns an empty map when animations are disabled (the default)', () => {
    const map = resolveAnimations({
      config: defaultConfig,
      theme,
      sessionId: 'test-disabled',
      now: 1000,
      contextPercentage: 50,
      quotas: [{ name: '5h', used: 10, limit: 100, usedPercentage: 10 }],
    });
    expect(map).toEqual({});
  });

  it('animates context and quota bars via global defaults when the master switch is on', () => {
    const config = {
      ...defaultConfig,
      animations: { enabled: true, defaultMode: 'always' as const, defaultType: 'pulse' as const, triggerThreshold: 5 },
    };
    const map = resolveAnimations({
      config,
      theme,
      sessionId: 'test-enabled',
      now: 1000,
      contextPercentage: 50,
      quotas: [{ name: '5h', used: 10, limit: 100, usedPercentage: 10 }],
    });
    expect(map.context).toEqual({ type: 'pulse' });
    expect(map.quota5h).toEqual({ type: 'pulse' });
  });
});

describe('costBasisFrom', () => {
  it('uses the current-context snapshot when current_usage is present', () => {
    const basis = costBasisFrom(
      { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 200, cache_creation_input_tokens: 100 },
      999_999, // session totals must NOT leak into the basis
      888_888,
    );
    expect(basis).toEqual({ inputUncached: 1000, cacheRead: 200, cacheCreation: 100, output: 500, context: 1300 });
  });

  it('falls back to session totals as uncached input + output when current_usage is null', () => {
    const basis = costBasisFrom(null, 5000, 2000);
    expect(basis).toEqual({ inputUncached: 5000, cacheRead: 0, cacheCreation: 0, output: 2000, context: 5000 });
  });
});
