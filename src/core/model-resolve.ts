import fs from 'fs';
import path from 'path';
import os from 'os';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * When cc-switch is active, model.id is replaced with an official Claude model ID
 * (e.g. "claude-sonnet-4-20250514"). The real model name is stored in
 * ANTHROPIC_DEFAULT_{TIER}_MODEL_NAME in ~/.claude/settings.json.
 * This function resolves the actual provider model ID.
 */
export function resolveModelIdFromSettings(rawModelId: string, settingsPath?: string): string {
  // Only resolve if the model ID looks like an official Claude model (cc-switch routing)
  if (!rawModelId.startsWith('claude-')) return rawModelId;

  try {
    const filePath = settingsPath ?? SETTINGS_PATH;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const settings = JSON.parse(raw);
    const env = settings?.env;
    if (!env) return rawModelId;

    // Find the matching tier: HAIKU, SONNET, or OPUS based on the model ID
    const tier = rawModelId.includes('haiku') ? 'HAIKU' : rawModelId.includes('opus') ? 'OPUS' : 'SONNET';
    const modelNameKey = `ANTHROPIC_DEFAULT_${tier}_MODEL_NAME`;
    const realModelId = env[modelNameKey];
    if (typeof realModelId === 'string' && realModelId) return realModelId;
  } catch {
    // settings.json may not exist or be invalid — fall through
  }
  return rawModelId;
}