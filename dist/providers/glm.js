import { BaseProvider } from './base.js';
const UNIT_NAME = {
    5: '5h',
    6: '7d',
    3: '30d',
};
export class GlmProvider extends BaseProvider {
    name = 'glm';
    defaultBaseUrl = 'https://open.bigmodel.cn';
    async getQuotas() {
        if (!this.config.apiKey)
            return null;
        try {
            const data = await this.fetchJson('/api/monitor/usage/quota/limit');
            if (!data.success)
                return null;
            return data.data.limits
                .filter((item) => UNIT_NAME[item.unit] !== undefined)
                .map((item) => ({
                name: UNIT_NAME[item.unit],
                used: item.percentage,
                limit: 100,
                usedPercentage: item.percentage,
                resetsAt: item.nextResetTime ? new Date(item.nextResetTime) : undefined,
            }));
        }
        catch {
            return null;
        }
    }
}
