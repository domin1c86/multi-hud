import { loadConfig } from './core/config.js';
import { renderStatusline } from './core/renderer.js';
import { getGitStatus } from './core/git.js';
import { computeSessionCost } from './core/cost.js';
import { getContextLimit } from './core/pricing.js';
import { resolveTheme } from './themes/index.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { KimiProvider } from './providers/kimi.js';
import { GlmProvider } from './providers/glm.js';
import { MiniMaxProvider } from './providers/minimax.js';
import { MiMoProvider } from './providers/mimo.js';
import type { MultiHudConfig, ProviderAdapter, BalanceInfo, QuotaWindow, TokenUsage } from './types/index.js';
import type { StatuslineEvent } from './types/statusline.js';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'multi-hud');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function getProviderAdapter(name: string, config: MultiHudConfig): ProviderAdapter | null {
  switch (name) {
    case 'deepseek':
      return new DeepSeekProvider(config.providers.deepseek);
    case 'kimi':
      return new KimiProvider(config.providers.kimi);
    case 'glm':
      return new GlmProvider(config.providers.glm);
    case 'minimax':
      return new MiniMaxProvider(config.providers.minimax);
    case 'mimo':
      return new MiMoProvider(config.providers.mimo);
    default:
      return null;
  }
}

function detectProvider(modelId: string, config: MultiHudConfig): string | null {
  if (config.providerOverride) return config.providerOverride;
  if (modelId.startsWith('deepseek')) return 'deepseek';
  if (modelId.startsWith('kimi')) return 'kimi';
  if (modelId.startsWith('glm')) return 'glm';
  if (modelId.startsWith('minimax')) return 'minimax';
  if (modelId.startsWith('mimo')) return 'mimo';
  return null;
}

export async function main(): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const config = loadConfig(CONFIG_PATH);
  const theme = resolveTheme(config.theme, config.customTheme);

  // Read the full JSON object from stdin (Claude Code sends one JSON object per invocation)
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let evt: StatuslineEvent;
  try {
    evt = JSON.parse(input) as StatuslineEvent;
  } catch {
    return;
  }

  // Model ID and provider detection
  const rawModelId = evt.model?.id || '';
  const providerName = detectProvider(rawModelId, config);

  // Context data from Claude Code
  const ctxSize = evt.context_window?.context_window_size ?? getContextLimit(rawModelId);
  const usedPct = evt.context_window?.used_percentage ?? 0;
  const contextPercentage = Math.min(100, usedPct);

  // Token usage from Claude Code
  const currentUsage = evt.context_window?.current_usage;
  const totalInput = evt.context_window?.total_input_tokens ?? 0;
  const totalOutput = evt.context_window?.total_output_tokens ?? 0;
  const inputUncached = currentUsage?.input_tokens ?? totalInput;
  const cacheRead = currentUsage?.cache_read_input_tokens ?? 0;
  const cacheCreation = currentUsage?.cache_creation_input_tokens ?? 0;

  const tokenUsage: TokenUsage | undefined =
    totalInput > 0 || totalOutput > 0
      ? {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          totalTokens: totalInput + totalOutput,
          cacheReadTokens: cacheRead,
          cacheCreationTokens: cacheCreation,
        }
      : undefined;

  // Cost calculation using built-in pricing
  let cost: number | null = null;
  if (config.display.showCost && rawModelId) {
    cost = computeSessionCost({
      modelId: rawModelId,
      inputUncachedTokens: inputUncached,
      cacheReadTokens: cacheRead,
      cacheCreationTokens: cacheCreation,
      outputTokens: totalOutput,
      contextTokens: totalInput,
    });
  }

  // Quota/balance data from provider API (best-effort, read from cache file)
  let quotas: QuotaWindow[] | undefined;
  let balance: BalanceInfo | undefined;
  let errorMessage: string | undefined;

  if (providerName) {
    try {
      const adapter = getProviderAdapter(providerName, config);
      if (adapter) {
        const quotaResult = await adapter.getQuotas();
        if (quotaResult) quotas = quotaResult;
        const balanceResult = await adapter.getBalance?.();
        if (balanceResult) balance = balanceResult;
      }
    } catch (err) {
      errorMessage = String(err);
    }
  }

  // Git status
  const gitStatus = config.display.showGitStatus
    ? getGitStatus(evt.cwd || process.cwd())
    : { branch: '', dirty: false, ahead: 0, behind: 0 };

  const renderLines = renderStatusline({
    modelId: rawModelId,
    contextPercentage,
    contextSize: ctxSize,
    tokenUsage,
    quotas,
    balance,
    cost,
    theme,
    gitStatus,
    tools: [],
    agents: [],
    todos: [],
    displayConfig: config.display,
    errorMessage,
  });

  process.stdout.write(renderLines.join('\n') + '\n');
}

// Auto-execute only when run directly (not when imported by tests)
const __main = async () => {
  try {
    await main();
  } catch (err) {
    console.error('multi-hud error:', err);
    process.exit(1);
  }
};

const __isDirectRun =
  process.argv[1] && path.normalize(fileURLToPath(import.meta.url)) === path.normalize(process.argv[1]);
if (__isDirectRun) __main();