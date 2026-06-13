import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

export class MiMoProvider extends BaseProvider {
  readonly name = 'mimo';

  async getTokenUsage(): Promise<TokenUsage | null> {
    // MiMo does not expose a public API for token usage queries.
    // Usage data is only available via the web console at platform.xiaomimimo.com.
    return null;
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    // MiMo Token Plan has quota windows, but no public API endpoint
    // is documented. Quota info is only available via the web console.
    return null;
  }

  async getContextLimit(modelId: string): Promise<number> {
    const limits: Record<string, number> = {
      'mimo-v2-flash': 262144,
      'mimo-v2-pro': 1048576,
      'mimo-v2-omni': 262144,
      'mimo-v2.5': 1048576,
      'mimo-v2.5-pro': 1048576,
    };
    return limits[modelId] ?? 262144;
  }
}
