import fs from 'fs';
import { MultiHudConfig } from '../types/index.js';

export const defaultConfig: MultiHudConfig = {
  providerOverride: null,
  pollIntervalMs: 30000,
  theme: 'default',
  customTheme: {},
  animations: {
    enabled: true,
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
  pricing: {
    currency: 'CNY',
    models: {
      'deepseek-chat': { input: 0.001, output: 0.002 },
      'deepseek-coder': { input: 0.001, output: 0.002 },
      'kimi-latest': { input: 0.003, output: 0.006 },
      'glm-4': { input: 0.005, output: 0.005 },
      'minimax-text-01': { input: 0.001, output: 0.001 },
    },
  },
  providers: {
    deepseek: { apiKey: '', baseUrl: null },
    kimi: { apiKey: '', baseUrl: null },
    glm: { apiKey: '', baseUrl: null },
    minimax: { apiKey: '', baseUrl: null },
  },
};

export function loadConfig(configPath: string): MultiHudConfig {
  if (!fs.existsSync(configPath)) {
    return { ...defaultConfig };
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return deepMerge(defaultConfig, parsed);
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: unknown): T {
  if (!source || typeof source !== 'object') return target;
  const result = { ...target };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const srcVal = (source as Record<string, unknown>)[key];
    const tgtVal = result[key];
    if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && tgtVal && typeof tgtVal === 'object') {
      result[key] = deepMerge(tgtVal as Record<string, unknown>, srcVal) as T[Extract<keyof T, string>];
    } else {
      result[key] = srcVal as T[Extract<keyof T, string>];
    }
  }
  return result;
}
