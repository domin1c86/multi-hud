import fs from 'fs';
import type { MultiHudConfig } from '../types/index.js';

/**
 * Agent-safe API-key loading.
 *
 * Provider API keys live in a dedicated `keys.json` — `{ "<provider>": "<key>" }` — that ONLY the
 * plugin runtime (this subprocess) reads. No AI-facing slash command reads it; the runtime never
 * prints or logs the keys. `config.json` keys (if any legacy user still has them) are a fallback.
 */
export const KEYS_FILENAME = 'keys.json';

/** Load provider→key from `keys.json`. Best-effort: missing/malformed/odd values → `{}`. */
export function loadApiKeys(keysPath: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(keysPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const keys: Record<string, string> = {};
    for (const [provider, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 0) keys[provider] = value;
    }
    return keys;
  } catch {
    return {};
  }
}

/**
 * Overlay `keys.json` values onto `config.providers.*.apiKey`, mutating in place. The keys file
 * wins; a provider absent from it keeps whatever `config.json` had (backward-compat). Returns the
 * same config for convenience.
 */
export function mergeApiKeys(config: MultiHudConfig, keys: Record<string, string>): MultiHudConfig {
  for (const [provider, key] of Object.entries(keys)) {
    const entry = config.providers[provider as keyof MultiHudConfig['providers']];
    if (entry) entry.apiKey = key;
  }
  return config;
}
