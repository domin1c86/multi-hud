import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'deepseek';

  async getTokenUsage(): Promise<TokenUsage | null> {
    try {
      const data = await this.fetchJson<{
        data: { total_tokens: number; input_tokens: number; output_tokens: number };
      }>('/v1/user/balance');
      return {
        totalTokens: data.data.total_tokens,
        inputTokens: data.data.input_tokens,
        outputTokens: data.data.output_tokens,
      };
    } catch {
      return null;
    }
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    try {
      const data = await this.fetchJson<{
        data: {
          quotas: Array<{
            window: string;
            used: number;
            limit: number;
            reset_at?: string;
          }>;
        };
      }>('/v1/user/quotas');
      return data.data.quotas.map((q) => ({
        name: q.window as QuotaWindow['name'],
        used: q.used,
        limit: q.limit,
        usedPercentage: Math.round((q.used / q.limit) * 100),
        resetsAt: q.reset_at ? new Date(q.reset_at) : undefined,
      }));
    } catch {
      return null;
    }
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
