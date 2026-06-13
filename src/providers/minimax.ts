import { BaseProvider } from './base.js';
import { QuotaWindow } from '../types/index.js';

const MINIMAX_BASE_URL_CN = 'https://api.minimaxi.com';
const MINIMAX_BASE_URL_INTL = 'https://api.minimax.io';

interface MiniMaxCodingPlanModelRemain {
  model_name: string;
  current_interval_remaining_percent: number;
  current_weekly_remaining_percent: number;
  current_weekly_status: number;
  end_time: number;
  weekly_end_time: number;
}

interface MiniMaxCodingPlanResponse {
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  model_remains: MiniMaxCodingPlanModelRemain[];
}

export class MiniMaxProvider extends BaseProvider {
  readonly name = 'minimax';

  override async getQuotas(): Promise<QuotaWindow[] | null> {
    if (!this.config.apiKey) return null;
    try {
      const base =
        this.config.baseUrl ??
        (this.config.region === 'intl' ? MINIMAX_BASE_URL_INTL : MINIMAX_BASE_URL_CN);
      const data = await this.fetchJson<MiniMaxCodingPlanResponse>(
        '/v1/api/openplatform/coding_plan/remains',
        {},
        base,
      );

      if (data.base_resp?.status_code !== 0) return null;

      // Find the 'general' model entry (skip 'video' entries)
      const general = data.model_remains?.find((m) => m.model_name === 'general');
      if (!general) return null;

      const quotas: QuotaWindow[] = [];

      // 5-hour window
      const usedPercentage5h = 100 - general.current_interval_remaining_percent;
      quotas.push({
        name: '5h',
        used: usedPercentage5h,
        limit: 100,
        usedPercentage: usedPercentage5h,
        resetsAt: general.end_time ? new Date(general.end_time) : undefined,
      });

      // Weekly window (only if current_weekly_status === 1)
      if (general.current_weekly_status === 1) {
        const usedPercentageWeekly = 100 - general.current_weekly_remaining_percent;
        quotas.push({
          name: 'weekly',
          used: usedPercentageWeekly,
          limit: 100,
          usedPercentage: usedPercentageWeekly,
          resetsAt: general.weekly_end_time ? new Date(general.weekly_end_time) : undefined,
        });
      }

      return quotas.length > 0 ? quotas : null;
    } catch {
      return null;
    }
  }
}