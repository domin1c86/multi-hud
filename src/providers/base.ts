import { ProviderAdapter, ProviderConfig, QuotaWindow, BalanceInfo } from '../types/index.js';

export abstract class BaseProvider implements ProviderAdapter {
  abstract readonly name: string;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    return null;
  }

  async getBalance(): Promise<BalanceInfo | null> {
    return null;
  }

  async validateConfig(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  protected async fetchJson<T>(url: string, init?: RequestInit, overrideBaseUrl?: string): Promise<T> {
    const base = overrideBaseUrl ?? this.config.baseUrl ?? '';
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
