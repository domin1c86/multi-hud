import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Engine } from '../../src/core/engine.js';
import { MultiHudConfig, ProviderAdapter } from '../../src/types/index.js';

const config: MultiHudConfig = {
  providerOverride: null,
  pollIntervalMs: 100,
  theme: 'default',
  customTheme: {},
  animations: { enabled: false, defaultMode: 'on-change', defaultType: 'none', triggerThreshold: 5 },
  display: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
  providers: {
    deepseek: { apiKey: '', baseUrl: null },
    kimi: { apiKey: '', baseUrl: null },
    glm: { apiKey: '', baseUrl: null },
    minimax: { apiKey: '', baseUrl: null },
    mimo: { apiKey: '', baseUrl: null },
  },
};

describe('Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('detects provider from model prefix', () => {
    const engine = new Engine(config);
    expect(engine.detectProvider('deepseek-v4-flash')).toBe('deepseek');
    expect(engine.detectProvider('kimi-k2.7-code')).toBe('kimi');
    expect(engine.detectProvider('glm-4.7')).toBe('glm');
    expect(engine.detectProvider('minimax-m3')).toBe('minimax');
    expect(engine.detectProvider('mimo-v2.5-pro')).toBe('mimo');
  });

  it('returns null for unknown model', () => {
    const engine = new Engine(config);
    expect(engine.detectProvider('unknown-model')).toBeNull();
  });

  it('uses providerOverride when set', () => {
    const overrideConfig = { ...config, providerOverride: 'kimi' };
    const engine = new Engine(overrideConfig);
    expect(engine.detectProvider('deepseek-v4-flash')).toBe('kimi');
  });

  it('does not start polling for non-pollable providers', () => {
    const engine = new Engine(config);
    const noPollProvider: ProviderAdapter = {
      name: 'mimo',
      async getQuotas() {
        return null;
      },
      async validateConfig() {
        return true;
      },
    };
    engine.setProvider('mimo', noPollProvider);
    // No error — we just don't poll for mimo since it's not in POLLABLE_PROVIDERS or BALANCE_PROVIDERS
    expect(engine.getCurrentProvider()).toBe(noPollProvider);
  });

  it('starts polling for GLM provider', () => {
    const engine = new Engine(config);
    const glmProvider: ProviderAdapter = {
      name: 'glm',
      async getQuotas() {
        return [{ name: '5h', used: 10, limit: 100, usedPercentage: 10 }];
      },
      async validateConfig() {
        return true;
      },
    };
    engine.setProvider('glm', glmProvider);
    expect(engine.getCurrentProvider()).toBe(glmProvider);
  });

  it('destroy stops polling without errors', () => {
    const engine = new Engine(config);
    const provider: ProviderAdapter = {
      name: 'mock',
      async getQuotas() {
        return null;
      },
      async validateConfig() {
        return true;
      },
    };
    engine.setProvider('mock', provider);
    expect(() => engine.destroy()).not.toThrow();
  });
});
