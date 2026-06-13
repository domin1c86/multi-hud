import { BaseProvider } from './base.js';
import { TokenUsage, QuotaWindow } from '../types/index.js';

interface GLMLimitItem {
  type: 'TIME_LIMIT' | 'TOKENS_LIMIT';
  unit: number;
  percentage: number;
  number?: number;
  nextResetTime?: number;
}

interface GLMQuotaResponse {
  success: boolean;
  data: {
    limits: GLMLimitItem[];
    level: string;
  };
}

const UNIT_NAME: Record<number, QuotaWindow['name']> = {
  5: '5h',
  6: '7d',
  3: '30d',
};

export class GlmProvider extends BaseProvider {
  readonly name = 'glm';

  async getTokenUsage(): Promise<TokenUsage | null> {
    try {
      const data = await this.fetchJson<{
        success: boolean;
        data: {
          totalTokens: number;
          inputTokens: number;
          outputTokens: number;
        };
      }>('/api/monitor/usage/model-usage');
      if (!data.success) return null;
      return {
        totalTokens: data.data.totalTokens,
        inputTokens: data.data.inputTokens,
        outputTokens: data.data.outputTokens,
      };
    } catch {
      return null;
    }
  }

  async getQuotas(): Promise<QuotaWindow[] | null> {
    try {
      const data = await this.fetchJson<GLMQuotaResponse>('/api/monitor/usage/quota/limit');
      if (!data.success) return null;

      return data.data.limits
        .filter((item) => UNIT_NAME[item.unit] !== undefined)
        .map((item) => ({
          name: UNIT_NAME[item.unit],
          used: item.percentage,
          limit: 100,
          usedPercentage: item.percentage,
          resetsAt: item.nextResetTime ? new Date(item.nextResetTime) : undefined,
        }));
    } catch {
      return null;
    }
  }

  async getContextLimit(modelId: string): Promise<number> {
    const limits: Record<string, number> = {
      'glm-4': 128000,
      'glm-4-plus': 128000,
      'glm-4-flash': 128000,
    };
    return limits[modelId] ?? 128000;
  }
}
