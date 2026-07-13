import { BaseProvider } from './base.js';
export class KimiProvider extends BaseProvider {
    name = 'kimi';
    defaultBaseUrl = 'https://api.moonshot.cn';
    async getBalance() {
        if (!this.config.apiKey)
            return null;
        try {
            const data = await this.fetchJson('/v1/users/me/balance');
            return {
                provider: 'kimi',
                available: data.data.available_balance,
                currency: '¥',
            };
        }
        catch {
            return null;
        }
    }
}
