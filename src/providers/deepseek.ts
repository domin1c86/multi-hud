import { BaseProvider } from './base.js';
import { BalanceInfo } from '../types/index.js';

interface DeepSeekBalanceResponse {
  is_available: boolean;
  balance_infos: Array<{
    currency: string;
    total_balance: string;
    granted_balance: string;
    topped_up_balance: string;
  }>;
}

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'deepseek';
  protected override readonly defaultBaseUrl = 'https://api.deepseek.com';

  override async getBalance(): Promise<BalanceInfo | null> {
    if (!this.config.apiKey) return null;
    try {
      const data = await this.fetchJson<DeepSeekBalanceResponse>('/user/balance');
      const info = data.balance_infos?.[0];
      if (!info) return null;
      return {
        provider: 'deepseek',
        available: parseFloat(info.total_balance),
        currency: info.currency === 'CNY' ? '¥' : '$',
      };
    } catch {
      return null;
    }
  }
}
