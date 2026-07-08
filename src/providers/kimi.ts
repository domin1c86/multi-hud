import { BaseProvider } from './base.js';
import { BalanceInfo } from '../types/index.js';

interface KimiBalanceResponse {
  code: number;
  data: {
    available_balance: number;
    voucher_balance: number;
    cash_balance: number;
  };
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
}
