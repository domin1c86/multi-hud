import { MultiHudConfig, ProviderAdapter } from '../types/index.js';
import { Cache } from './cache.js';

export class Engine {
  private config: MultiHudConfig;
  private cwd: string;
  private cache: Cache;
  private currentProvider: ProviderAdapter | null = null;
  private providerName: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: MultiHudConfig, cwd: string) {
    this.config = config;
    this.cwd = cwd;
    this.cache = new Cache();
  }

  detectProvider(modelId: string): string | null {
    if (this.config.providerOverride) return this.config.providerOverride;
    if (modelId.startsWith('deepseek')) return 'deepseek';
    if (modelId.startsWith('kimi')) return 'kimi';
    if (modelId.startsWith('glm')) return 'glm';
    if (modelId.startsWith('minimax')) return 'minimax';
    return null;
  }

  setProvider(name: string, adapter: ProviderAdapter): void {
    if (this.providerName === name) return;
    this.stopPolling();
    this.providerName = name;
    this.currentProvider = adapter;
    this.cache.clear();
    this.startPolling();
  }

  getCache(): Cache {
    return this.cache;
  }

  getCurrentProvider(): ProviderAdapter | null {
    return this.currentProvider;
  }

  private startPolling(): void {
    this.pollOnce().catch(() => {});
    this.pollTimer = setInterval(() => {
      this.pollOnce().catch(() => {});
    }, this.config.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollOnce(): Promise<void> {
    if (!this.currentProvider) return;
    try {
      const quotas = await this.currentProvider.getQuotas();
      if (quotas) {
        this.cache.set('quotas', quotas, this.config.pollIntervalMs + 5000);
      }
      const usage = await this.currentProvider.getTokenUsage();
      if (usage) {
        this.cache.set('tokenUsage', usage, this.config.pollIntervalMs + 5000);
      }
      const limit = await this.currentProvider.getContextLimit('default');
      this.cache.set('contextLimit', limit, 300000);
    } catch (err) {
      this.cache.set('error', String(err), 60000);
    }
  }

  destroy(): void {
    this.stopPolling();
  }
}
