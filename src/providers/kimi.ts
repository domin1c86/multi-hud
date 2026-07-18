import { BaseProvider } from './base.js';
import { BalanceInfo, QuotaWindow } from '../types/index.js';

interface KimiBalanceResponse {
  code: number;
  data: {
    available_balance: number;
    voucher_balance: number;
    cash_balance: number;
  };
}

/** Coding-plan (subscription) usage host — distinct from the pay-as-you-go balance host. */
const CODING_BASE_URL = 'https://api.kimi.com/coding/v1';

type ResetField = number | string | undefined;

interface KimiLimitItem {
  detail?: { name?: string; limit?: number; used?: number; remaining?: number; percentage?: number };
  window?: { duration?: number; time_unit?: string; timeUnit?: string };
  name?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  percentage?: number;
  resetTime?: ResetField;
  reset_at?: ResetField;
  reset_time?: ResetField;
  reset_in?: number;
}

interface KimiDataItem {
  model_name?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  percentage?: number;
  resetTime?: ResetField;
  reset_at?: ResetField;
  reset_in?: number;
}

interface KimiUsageResponse {
  limits?: KimiLimitItem[];
  data?: KimiDataItem[];
}

export class KimiProvider extends BaseProvider {
  readonly name = 'kimi';
  protected override readonly defaultBaseUrl = 'https://api.moonshot.cn';

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

  /**
   * Kimi Code (subscription) windowed quotas, via the coding-plan usage endpoint the Kimi CLI
   * uses (reverse-engineered — parse defensively). Only attempted for coding-plan keys
   * (`sk-kimi-…`); pay-as-you-go keys fall through to `getBalance()` instead.
   */
  override async getQuotas(): Promise<QuotaWindow[] | null> {
    if (!this.config.apiKey || !this.config.apiKey.startsWith('sk-kimi')) return null;
    try {
      const data = await this.fetchUsage();
      const windows = parseKimiUsage(data);
      return windows.length > 0 ? windows : null;
    } catch {
      return null;
    }
  }

  private async fetchUsage(): Promise<KimiUsageResponse> {
    const init: RequestInit = { headers: { 'User-Agent': 'KimiCLI/1.6' } };
    try {
      return await this.fetchJson<KimiUsageResponse>('/usages', init, CODING_BASE_URL);
    } catch (err) {
      if (String(err).includes('404')) {
        return await this.fetchJson<KimiUsageResponse>('/usage', init, CODING_BASE_URL);
      }
      throw err;
    }
  }
}

/** Map a Kimi usage payload to quota windows, tolerating the two shapes the endpoint returns. */
function parseKimiUsage(payload: KimiUsageResponse): QuotaWindow[] {
  if (Array.isArray(payload.limits)) {
    const windows: QuotaWindow[] = [];
    for (const item of payload.limits) {
      const name = windowName(item);
      if (!name) continue;
      const d = item.detail ?? item;
      const limit = d.limit;
      const used = d.used ?? (limit != null && d.remaining != null ? limit - d.remaining : undefined);
      const usedPercentage = percentage(used, limit, d.percentage);
      windows.push({
        name,
        used: used ?? usedPercentage,
        limit: limit ?? 100,
        usedPercentage,
        resetsAt: resetsAt(item.resetTime ?? item.reset_at ?? item.reset_time, item.reset_in),
      });
    }
    return windows;
  }

  if (Array.isArray(payload.data)) {
    // The `all` row is the overall (weekly) allowance.
    const all = payload.data.find((d) => d.model_name === 'all');
    if (all) {
      const used = all.used ?? (all.limit != null && all.remaining != null ? all.limit - all.remaining : undefined);
      const usedPercentage = percentage(used, all.limit, all.percentage);
      return [
        {
          name: '7d',
          used: used ?? usedPercentage,
          limit: all.limit ?? 100,
          usedPercentage,
          resetsAt: resetsAt(all.resetTime ?? all.reset_at, all.reset_in),
        },
      ];
    }
  }

  return [];
}

/** Resolve a window's canonical name from its `window` unit/duration, falling back to its label. */
function windowName(item: KimiLimitItem): QuotaWindow['name'] | null {
  const w = item.window ?? {};
  const unit = String(w.time_unit ?? w.timeUnit ?? '').toUpperCase();
  const dur = Number(w.duration ?? 0);
  if (unit === 'HOUR' && dur === 5) return '5h';
  if ((unit === 'HOUR' && dur === 24) || (unit === 'DAY' && dur === 1)) return '24h';
  if ((unit === 'DAY' && dur === 7) || unit === 'WEEK') return '7d';
  if (unit === 'DAY' && dur === 30) return '30d';

  const label = String(item.detail?.name ?? item.name ?? '').toLowerCase();
  if (label.includes('5h') || label.includes('5-hour') || label.includes('5 hour')) return '5h';
  if (label.includes('week') || label === '7d') return '7d';
  if (label.includes('month') || label === '30d') return '30d';
  if (label.includes('day') || label === '24h') return '24h';
  return null;
}

function percentage(used: number | undefined, limit: number | undefined, explicit: number | undefined): number {
  if (explicit != null) return explicit;
  if (limit != null && limit > 0 && used != null) return (used / limit) * 100;
  return 0;
}

/** Reset time as a Date. Accepts an epoch (s or ms), an ISO string, or a `reset_in` seconds delta. */
function resetsAt(at: ResetField, resetIn: number | undefined): Date | undefined {
  if (at != null) {
    const n = Number(at);
    if (!Number.isNaN(n)) return new Date(n < 1e12 ? n * 1000 : n);
    const d = new Date(String(at));
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (resetIn != null) return new Date(Date.now() + resetIn * 1000);
  return undefined;
}
