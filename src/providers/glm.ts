import { BaseProvider } from './base.js';
import { QuotaWindow } from '../types/index.js';

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

  override async getQuotas(): Promise<QuotaWindow[] | null> {
    if (!this.config.apiKey) return null;
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
}
