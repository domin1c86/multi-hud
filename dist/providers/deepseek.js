import { BaseProvider } from './base.js';
export class DeepSeekProvider extends BaseProvider {
    name = 'deepseek';
    defaultBaseUrl = 'https://api.deepseek.com';
    async getBalance() {
        if (!this.config.apiKey)
            return null;
        try {
            const data = await this.fetchJson('/user/balance');
            const info = data.balance_infos?.[0];
            if (!info)
                return null;
            return {
                provider: 'deepseek',
                available: parseFloat(info.total_balance),
                currency: info.currency === 'CNY' ? '¥' : '$',
            };
        }
        catch {
            return null;
        }
    }
}
