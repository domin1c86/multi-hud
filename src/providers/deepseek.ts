import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'deepseek';

  async getTokenUsage(): Promise<TokenUsage | null> {
    // DeepSeek's /user/balance returns account balance (CNY), not token usage.
    // There is no public API for per-request or aggregate token consumption.
    return null;
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    // DeepSeek is pay-as-you-go only — no time-window quota system exists.
    return null;
  }

  async getContextLimit(modelId: string): Promise<number> {
    const limits: Record<string, number> = {
      'deepseek-chat': 64000,
      'deepseek-coder': 64000,
      'deepseek-reasoner': 64000,
    };
    return limits[modelId] ?? 64000;
  }
}
