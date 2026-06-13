import { BaseProvider } from './base.js';
import { QuotaWindow } from '../types/index.js';

const GLM_BASE_URL_CN = 'https://open.bigmodel.cn';
const GLM_BASE_URL_INTL = 'https://api.z.ai';

interface GLMLimitItem {
  type: 'TIME_LIMIT' | 'TOKENS_LIMIT';
  unit: number;
  percentage: number;
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
  3: '5h',
  6: 'weekly',
};

export class GlmProvider extends BaseProvider {
  readonly name = 'glm';

  override async getQuotas(): Promise<QuotaWindow[] | null> {
    if (!this.config.apiKey) return null;
    try {
      const base =
        this.config.baseUrl ?? (this.config.region === 'intl' ? GLM_BASE_URL_INTL : GLM_BASE_URL_CN);
      // GLM uses raw API key without Bearer prefix
      const data = await this.fetchJson<GLMQuotaResponse>(
        '/api/monitor/usage/quota/limit',
        {
          headers: { Authorization: this.config.apiKey },
        },
        base,
      );

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