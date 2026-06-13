import fs from 'fs';
import { MultiHudConfig } from '../types/index.js';

export const defaultConfig: MultiHudConfig = {
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

export function loadConfig(configPath: string): MultiHudConfig {
  if (!fs.existsSync(configPath)) {
    return { ...defaultConfig };
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return deepMerge(defaultConfig as unknown as Record<string, unknown>, parsed) as unknown as MultiHudConfig;
}

function deepMerge(target: Record<string, unknown>, source: unknown): Record<string, unknown> {
  if (!source || typeof source !== 'object') return target;
  const result = { ...target };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const srcVal = (source as Record<string, unknown>)[key];
    const tgtVal = result[key];
    if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && tgtVal && typeof tgtVal === 'object') {
      result[key] = deepMerge(tgtVal as Record<string, unknown>, srcVal);
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}
