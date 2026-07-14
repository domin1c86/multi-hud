import fs from 'fs';
export const defaultConfig = {
    providerOverride: null,
    pollIntervalMs: 30000,
    theme: 'default',
    customTheme: {},
    animations: {
        enabled: false,
        defaultMode: 'on-change',
        defaultType: 'pulse',
        triggerThreshold: 5,
    },
    display: {
        showGitStatus: true,
        showTools: true,
        showAgents: true,
        showTodos: true,
        showCost: true,
    },
    providers: {
        deepseek: { apiKey: '', baseUrl: null },
        kimi: { apiKey: '', baseUrl: null },
        glm: { apiKey: '', baseUrl: null },
        minimax: { apiKey: '', baseUrl: null },
        mimo: { apiKey: '', baseUrl: null },
    },
};
export function loadConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        return { ...defaultConfig };
    }
    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return deepMerge(defaultConfig, parsed);
    }
    catch {
        // Unreadable or malformed config must not crash the statusline — fall back to defaults.
        return { ...defaultConfig };
    }
}
function deepMerge(target, source) {
    if (!source || typeof source !== 'object')
        return target;
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const srcVal = source[key];
        const tgtVal = result[key];
        if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && tgtVal && typeof tgtVal === 'object') {
            result[key] = deepMerge(tgtVal, srcVal);
        }
        else {
            result[key] = srcVal;
        }
    }
    return result;
}
