import { ProviderAdapter, ProviderConfig } from '../types/index.js';

export abstract class BaseProvider implements ProviderAdapter {
  abstract readonly name: string;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract getTokenUsage(): Promise<import('../types/index.js').TokenUsage | null>;
  abstract getQuotas(): Promise<import('../types/index.js').QuotaWindow[] | null>;
  abstract getContextLimit(modelId: string): Promise<number>;

  async validateConfig(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  protected async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const base = this.config.baseUrl ?? '';
    const response = await fetch(base + url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  }
}
