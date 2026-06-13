import { BaseProvider } from './base.js';
import { BalanceInfo, QuotaWindow } from '../types/index.js';

const KIMI_CODING_PLAN_BASE_URL = 'https://api.kimi.com';

interface KimiBalanceResponse {
  code: number;
  data: {
    available_balance: number;
    voucher_balance: number;
    cash_balance: number;
  };
}

interface KimiCodingPlanUsageDetail {
  limit: number | string;
  remaining: number | string;
  resetTime: number | string;
}

interface KimiCodingPlanLimit {
  detail: KimiCodingPlanUsageDetail;
}

interface KimiCodingPlanUsage {
  limit: number | string;
  remaining: number | string;
  resetTime: number | string;
}

interface KimiCodingPlanResponse {
  limits: KimiCodingPlanLimit[];
  usage: KimiCodingPlanUsage;
}

function parseNumber(val: number | string): number {
  return typeof val === 'number' ? val : parseFloat(val);
}

function parseResetTime(val: number | string): Date | undefined {
  if (val == null) return undefined;
  if (typeof val === 'string') return new Date(val);
  // Numeric: >1e12 means milliseconds, otherwise seconds
  const ms = val > 1e12 ? val : val * 1000;
  return new Date(ms);
}

export class KimiProvider extends BaseProvider {
  readonly name = 'kimi';

  override async getBalance(): Promise<BalanceInfo | null> {
    if (!this.config.apiKey) return null;
    try {
      const data = await this.fetchJson<KimiBalanceResponse>('/v1/users/me/balance');
      return {
        provider: 'kimi',
        available: data.data.available_balance,
        currency: '¥',
      };
    } catch {
      return null;
    }
  }

  override async getQuotas(): Promise<QuotaWindow[] | null> {
    if (!this.config.apiKey) return null;
    try {
      const base = this.config.codingPlanBaseUrl ?? KIMI_CODING_PLAN_BASE_URL;
      const data = await this.fetchJson<KimiCodingPlanResponse>(
        '/coding/v1/usages',
        {},
        base,
      );

      const quotas: QuotaWindow[] = [];

      // 5-hour window from limits[]
      if (data.limits && data.limits.length > 0) {
        for (const limit of data.limits) {
          const total = parseNumber(limit.detail.limit);
          const remaining = parseNumber(limit.detail.remaining);
          if (total > 0) {
            const used = Math.max(0, total - remaining);
            const usedPercentage = (used / total) * 100;
            quotas.push({
              name: '5h',
              used,
              limit: total,
              usedPercentage,
              resetsAt: parseResetTime(limit.detail.resetTime),
            });
          }
          // Only use the first limit entry for the 5h window
          break;
        }
      }

      // Weekly window from usage object
      if (data.usage) {
        const total = parseNumber(data.usage.limit);
        const remaining = parseNumber(data.usage.remaining);
        if (total > 0) {
          const used = Math.max(0, total - remaining);
          const usedPercentage = (used / total) * 100;
          quotas.push({
            name: 'weekly',
            used,
            limit: total,
            usedPercentage,
            resetsAt: parseResetTime(data.usage.resetTime),
          });
        }
      }

      return quotas.length > 0 ? quotas : null;
    } catch {
      return null;
    }
  }
}