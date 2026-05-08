import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Engine } from '../../src/core/engine.js';
import { MultiHudConfig, ProviderAdapter } from '../../src/types/index.js';
import { Cache } from '../../src/core/cache.js';

class MockProvider implements ProviderAdapter {
  readonly name = 'mock';
  async getTokenUsage() { return null; }
  async getQuotas() { return null; }
  async getContextLimit() { return 64000; }
  async validateConfig() { return true; }
}

const config: MultiHudConfig = {
  providerOverride: null,
  pollIntervalMs: 100,
  theme: 'default',
  customTheme: {},
  animations: { enabled: false, defaultMode: 'on-change', defaultType: 'none', triggerThreshold: 5 },
  display: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
  pricing: { currency: 'CNY', models: {} },
  providers: { deepseek: { apiKey: '', baseUrl: null }, kimi: { apiKey: '', baseUrl: null }, glm: { apiKey: '', baseUrl: null }, minimax: { apiKey: '', baseUrl: null } },
};

describe('Engine', () => {
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
});
