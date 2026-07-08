#!/usr/bin/env node
import { loadConfig, defaultConfig } from './core/config.js';
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
  if (modelId.startsWith('moonshot')) return 'kimi';
  if (modelId.startsWith('glm')) return 'glm';
  if (modelId.startsWith('minimax')) return 'minimax';
  if (modelId.startsWith('mimo')) return 'mimo';
  return null;
}

type CurrentUsage = NonNullable<StatuslineEvent['context_window']['current_usage']>;

export interface CostBasis {
  inputUncached: number;
  cacheRead: number;
  cacheCreation: number;
  output: number;
  context: number;
}

/**
 * Resolve the token basis for cost on a single consistent reference point: the current
 * context snapshot when available (so cache discounts and GLM/MiniMax tier resolution
 * reflect one moment), else the context_window input/output totals treated as uncached
 * input + output.
 */
export function costBasisFrom(
  currentUsage: CurrentUsage | null | undefined,
  totalInput: number,
  totalOutput: number,
): CostBasis {
  if (currentUsage) {
    return {
      inputUncached: currentUsage.input_tokens,
      cacheRead: currentUsage.cache_read_input_tokens,
      cacheCreation: currentUsage.cache_creation_input_tokens,
      output: currentUsage.output_tokens,
      context:
        currentUsage.input_tokens + currentUsage.cache_read_input_tokens + currentUsage.cache_creation_input_tokens,
    };
  }
  return { inputUncached: totalInput, cacheRead: 0, cacheCreation: 0, output: totalOutput, context: totalInput };
}

/** Map Claude Code's built-in `rate_limits` event data to quota windows. */
export function quotasFromRateLimits(rateLimits: StatuslineEvent['rate_limits']): QuotaWindow[] {
  if (!rateLimits) return [];
  const windows: QuotaWindow[] = [];
  if (rateLimits.five_hour) {
    windows.push({
      name: '5h',
      used: rateLimits.five_hour.used_percentage,
      limit: 100,
      usedPercentage: rateLimits.five_hour.used_percentage,
      // resets_at is Unix epoch *seconds* (per Claude Code statusline docs); Date wants ms.
      resetsAt: rateLimits.five_hour.resets_at ? new Date(rateLimits.five_hour.resets_at * 1000) : undefined,
    });
  }
  if (rateLimits.seven_day) {
    windows.push({
      name: '7d',
      used: rateLimits.seven_day.used_percentage,
      limit: 100,
      usedPercentage: rateLimits.seven_day.used_percentage,
      resetsAt: rateLimits.seven_day.resets_at ? new Date(rateLimits.seven_day.resets_at * 1000) : undefined,
    });
  }
  return windows;
}

export async function main(): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  // Write a default config template on first run (best-effort; a read-only FS must not crash).
  if (!fs.existsSync(CONFIG_PATH)) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2) + '\n');
    } catch {
      // Ignore — loadConfig falls through to defaults anyway.
    }
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
  // As of Claude Code v2.1.132 these reflect current context usage (input includes cache
  // reads/writes), not cumulative session totals; older versions sent session totals.
  const totalInput = evt.context_window?.total_input_tokens ?? 0;
  const totalOutput = evt.context_window?.total_output_tokens ?? 0;

  // The Tokens/Total display line reflects the context_window totals reported by Claude Code.
  const tokenUsage: TokenUsage | undefined =
    totalInput > 0 || totalOutput > 0
      ? {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          totalTokens: totalInput + totalOutput,
          cacheReadTokens: currentUsage?.cache_read_input_tokens ?? 0,
          cacheCreationTokens: currentUsage?.cache_creation_input_tokens ?? 0,
        }
      : undefined;

  const costBasis = costBasisFrom(currentUsage, totalInput, totalOutput);

  let cost: number | null = null;
  if (config.display.showCost && rawModelId) {
    cost = computeSessionCost({
      modelId: rawModelId,
      inputUncachedTokens: costBasis.inputUncached,
      cacheReadTokens: costBasis.cacheRead,
      cacheCreationTokens: costBasis.cacheCreation,
      outputTokens: costBasis.output,
      contextTokens: costBasis.context,
    });
  }

  // Quotas: prefer Claude Code's built-in rate_limits (always available, no network),
  // fall back to the provider API. Balance has no built-in source, so always try the API.
  const rateLimitQuotas = quotasFromRateLimits(evt.rate_limits);
  let quotas: QuotaWindow[] | undefined = rateLimitQuotas.length > 0 ? rateLimitQuotas : undefined;
  let balance: BalanceInfo | undefined;
  let errorMessage: string | undefined;

  if (providerName) {
    try {
      const adapter = getProviderAdapter(providerName, config);
      if (adapter) {
        if (!quotas) {
          const quotaResult = await adapter.getQuotas();
          if (quotaResult) quotas = quotaResult;
        }
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
