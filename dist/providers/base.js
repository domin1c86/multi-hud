export class BaseProvider {
    /** Fallback base URL used when `config.baseUrl` is not set. Overridden per provider. */
    defaultBaseUrl = '';
    config;
    constructor(config) {
        this.config = config;
    }
    async getQuotas() {
        return null;
    }
    async getBalance() {
        return null;
    }
    async validateConfig() {
        return !!this.config.apiKey;
    }
    async fetchJson(url, init, baseOverride) {
        const base = baseOverride ?? this.config.baseUrl ?? this.defaultBaseUrl;
        const response = await fetch(base + url, {
            ...init,
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                ...(init?.headers || {}),
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        return response.json();
    }
}
