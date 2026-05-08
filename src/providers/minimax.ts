import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

export class MiniMaxProvider extends BaseProvider {
  readonly name = 'minimax';

  async getTokenUsage(): Promise<TokenUsage | null> {
    try {
      const data = await this.fetchJson<{
        data: { total_tokens: number; input_tokens: number; output_tokens: number };
      }>('/v1/query_usage');
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
          quotas: Array<{ window: string; used: number; limit: number; reset_at?: string }>;
        };
      }>('/v1/query_quota');
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
      'minimax-text-01': 8000,
    };
    return limits[modelId] ?? 8000;
  }
}
