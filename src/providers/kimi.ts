import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

export class KimiProvider extends BaseProvider {
  readonly name = 'kimi';

  async getTokenUsage(): Promise<TokenUsage | null> {
    // Kimi's /v1/users/me/balance returns account balance, not token usage.
    // There is no public API for aggregate token consumption.
    return null;
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    // Kimi Code Plan may have quota windows, but no public API endpoint is documented.
    return null;
  }

  async getContextLimit(modelId: string): Promise<number> {
    const limits: Record<string, number> = {
      'kimi-latest': 256000,
      'kimi-k1': 256000,
    };
    return limits[modelId] ?? 256000;
  }
}
