import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Engine } from '../../src/core/engine.js';
import { MultiHudConfig, ProviderAdapter } from '../../src/types/index.js';
import { Cache } from '../../src/core/cache.js';

class MockProvider implements ProviderAdapter {
  readonly name = 'mock';
  async getTokenUsage() {
    return null;
  }
  async getQuotas() {
    return null;
  }
  async getContextLimit() {
    return 64000;
  }
  async validateConfig() {
    return true;
  }
}

const config: MultiHudConfig = {
  providerOverride: null,
  pollIntervalMs: 100,
  theme: 'default',
  customTheme: {},
  animations: { enabled: false, defaultMode: 'on-change', defaultType: 'none', triggerThreshold: 5 },
  display: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
  pricing: { currency: 'CNY', models: {} },
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
    const engine = new Engine(config, '/tmp');
    const provider = engine.detectProvider('deepseek-chat');
    expect(provider).toBe('deepseek');
  });

  it('returns null for unknown model', () => {
    const engine = new Engine(config, '/tmp');
    const provider = engine.detectProvider('unknown-model');
    expect(provider).toBeNull();
  });

  it('uses providerOverride when set', () => {
    const overrideConfig = { ...config, providerOverride: 'kimi' };
    const engine = new Engine(overrideConfig, '/tmp');
    const provider = engine.detectProvider('deepseek-chat');
    expect(provider).toBe('kimi');
  });

  it('detects kimi provider from model prefix', () => {
    const engine = new Engine(config, '/tmp');
    expect(engine.detectProvider('kimi-latest')).toBe('kimi');
  });

  it('detects glm provider from model prefix', () => {
    const engine = new Engine(config, '/tmp');
    expect(engine.detectProvider('glm-4')).toBe('glm');
  });

  it('detects minimax provider from model prefix', () => {
    const engine = new Engine(config, '/tmp');
    expect(engine.detectProvider('minimax-text-01')).toBe('minimax');
  });

  it('detects mimo provider from model prefix', () => {
    const engine = new Engine(config, '/tmp');
    expect(engine.detectProvider('mimo-v2.5-pro')).toBe('mimo');
  });

  it('setProvider sets the current provider and starts polling', () => {
    const engine = new Engine(config, '/tmp');
    const mockProvider = new MockProvider();
    engine.setProvider('mock', mockProvider);
    expect(engine.getCurrentProvider()).toBe(mockProvider);
    expect(engine.getCache()).toBeInstanceOf(Cache);
  });

  it('setProvider does not re-set same provider', () => {
    const engine = new Engine(config, '/tmp');
    const mockProvider = new MockProvider();
    engine.setProvider('mock', mockProvider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stopPollingSpy = vi.spyOn(engine as any, 'stopPolling');
    engine.setProvider('mock', mockProvider);
    expect(stopPollingSpy).not.toHaveBeenCalled();
  });

  it('destroy stops polling', () => {
    const engine = new Engine(config, '/tmp');
    const mockProvider = new MockProvider();
    engine.setProvider('mock', mockProvider);
    expect(() => engine.destroy()).not.toThrow();
  });

  it('pollOnce populates cache', async () => {
    const engine = new Engine(config, '/tmp');
    const mockProvider: ProviderAdapter = {
      name: 'mock',
      async getTokenUsage() {
        return { prompt: 10, completion: 20, total: 30 };
      },
      async getQuotas() {
        return { rpm: 100, tpm: 1000 };
      },
      async getContextLimit() {
        return 128000;
      },
      async validateConfig() {
        return true;
      },
    };

    engine.setProvider('mock', mockProvider);
    await vi.advanceTimersByTimeAsync(0);

    const cache = engine.getCache();
    expect(cache.get('quotas')).toEqual({ rpm: 100, tpm: 1000 });
    expect(cache.get('tokenUsage')).toEqual({ prompt: 10, completion: 20, total: 30 });
    expect(cache.get('contextLimit')).toBe(128000);
  });

  it('destroy clears the interval', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const engine = new Engine(config, '/tmp');
    const mockProvider = new MockProvider();

    engine.setProvider('mock', mockProvider);
    engine.destroy();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('error handling in pollOnce stores error in cache', async () => {
    const engine = new Engine(config, '/tmp');
    const errorProvider: ProviderAdapter = {
      name: 'error',
      async getTokenUsage() {
        return null;
      },
      async getQuotas() {
        throw new Error('quota failure');
      },
      async getContextLimit() {
        return 64000;
      },
      async validateConfig() {
        return true;
      },
    };

    engine.setProvider('error', errorProvider);
    await vi.advanceTimersByTimeAsync(0);

    const cache = engine.getCache();
    const errorEntry = cache.get('error');
    expect(errorEntry).toBeDefined();
    expect(String(errorEntry)).toContain('quota failure');
  });
});
