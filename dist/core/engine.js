import { Cache } from './cache.js';
/** Providers that have an API we can poll for quota data. Only GLM currently. */
const POLLABLE_PROVIDERS = new Set(['glm']);
/** Providers that have a balance API. */
const BALANCE_PROVIDERS = new Set(['deepseek', 'kimi']);
export class Engine {
    config;
    cache;
    currentProvider = null;
    providerName = null;
    pollTimer = null;
    constructor(config) {
        this.config = config;
        this.cache = new Cache();
    }
    detectProvider(modelId) {
        if (this.config.providerOverride)
            return this.config.providerOverride;
        if (modelId.startsWith('deepseek'))
            return 'deepseek';
        if (modelId.startsWith('kimi'))
            return 'kimi';
        if (modelId.startsWith('glm'))
            return 'glm';
        if (modelId.startsWith('minimax'))
            return 'minimax';
        if (modelId.startsWith('mimo'))
            return 'mimo';
        return null;
    }
    setProvider(name, adapter) {
        if (this.providerName === name)
            return;
        this.stopPolling();
        this.providerName = name;
        this.currentProvider = adapter;
        this.cache.clear();
        if (POLLABLE_PROVIDERS.has(name) || BALANCE_PROVIDERS.has(name)) {
            this.startPolling();
        }
    }
    getCache() {
        return this.cache;
    }
    getCurrentProvider() {
        return this.currentProvider;
    }
    startPolling() {
        this.pollOnce().catch(() => { });
        this.pollTimer = setInterval(() => {
            this.pollOnce().catch(() => { });
        }, this.config.pollIntervalMs);
    }
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }
    async pollOnce() {
        if (!this.currentProvider)
            return;
        try {
            const quotas = await this.currentProvider.getQuotas();
            if (quotas) {
                this.cache.set('quotas', quotas, this.config.pollIntervalMs + 5000);
            }
            const balance = await this.currentProvider.getBalance?.();
            if (balance) {
                this.cache.set('balance', balance, this.config.pollIntervalMs + 5000);
            }
        }
        catch (err) {
            this.cache.set('error', String(err), 60000);
        }
    }
    destroy() {
        this.stopPolling();
    }
}
