import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

export class MiniMaxProvider extends BaseProvider {
  readonly name = 'minimax';

  async getTokenUsage(): Promise<TokenUsage | null> {
    // MiniMax does not expose a public API for token usage queries.
    // Usage data is only available via the web console at platform.minimax.io.
    return null;
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    // MiniMax Coding Plan has quota windows, but no public API endpoint
    // is documented. Quota info is only available via the web console.
    return null;
  }

  async getContextLimit(modelId: string): Promise<number> {
    const limits: Record<string, number> = {
      'minimax-text-01': 200000,
      'minimax-m2': 200000,
      'minimax-m2.5': 200000,
      'minimax-m2.7': 200000,
    };
    return limits[modelId] ?? 200000;
  }
}
