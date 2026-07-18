#!/usr/bin/env node
import { loadConfig, defaultConfig } from './core/config.js';
import { loadApiKeys, mergeApiKeys, KEYS_FILENAME } from './core/keys.js';
import { renderStatusline } from './core/renderer.js';
import { getGitStatus } from './core/git.js';
import { computeSessionCost } from './core/cost.js';
import { getContextLimit } from './core/pricing.js';
import { resolveTheme } from './themes/index.js';
import { isRoutedBaseUrl, resolveActiveModel } from './core/routing.js';
import { readLatestModel } from './core/transcriptModel.js';
import { resolveBarAnimation } from './animations/index.js';
import { readAnimationState, writeAnimationState, resolveOnChange, } from './core/animationState.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { KimiProvider } from './providers/kimi.js';
import { GlmProvider } from './providers/glm.js';
import { MiniMaxProvider } from './providers/minimax.js';
import { MiMoProvider } from './providers/mimo.js';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'multi-hud');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
function getProviderAdapter(name, config) {
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
function detectProvider(modelId, config) {
    if (config.providerOverride)
        return config.providerOverride;
    if (modelId.startsWith('deepseek'))
        return 'deepseek';
    if (modelId.startsWith('kimi'))
        return 'kimi';
    if (modelId.startsWith('moonshot'))
        return 'kimi';
    if (modelId.startsWith('glm'))
        return 'glm';
    if (modelId.startsWith('minimax'))
        return 'minimax';
    if (modelId.startsWith('mimo'))
        return 'mimo';
    return null;
}
/**
 * Resolve the token basis for cost on a single consistent reference point: the current
 * context snapshot when available (so cache discounts and GLM/MiniMax tier resolution
 * reflect one moment), else the context_window input/output totals treated as uncached
 * input + output.
 */
export function costBasisFrom(currentUsage, totalInput, totalOutput) {
    if (currentUsage) {
        return {
            inputUncached: currentUsage.input_tokens,
            cacheRead: currentUsage.cache_read_input_tokens,
            cacheCreation: currentUsage.cache_creation_input_tokens,
            output: currentUsage.output_tokens,
            context: currentUsage.input_tokens + currentUsage.cache_read_input_tokens + currentUsage.cache_creation_input_tokens,
        };
    }
    return { inputUncached: totalInput, cacheRead: 0, cacheCreation: 0, output: totalOutput, context: totalInput };
}
/**
 * Resolve which bars animate this frame. Reads/writes the per-session `on-change`
 * state file as a side effect; returns a map keyed by bar key (`context`, `quota5h`, …)
 * for the bars that should animate now. Returns an empty map when animations are off.
 */
export function resolveAnimations(params) {
    const { config, theme, sessionId, now, contextPercentage, quotas } = params;
    const animations = {};
    if (!config.animations.enabled)
        return animations;
    const targets = [
        { key: 'context', pct: contextPercentage },
        ...(quotas ?? []).map((q) => ({ key: `quota${q.name}`, pct: q.usedPercentage })),
    ];
    const prev = readAnimationState(sessionId);
    const next = {};
    for (const { key, pct } of targets) {
        const barStyle = theme.bars[key];
        if (!barStyle)
            continue;
        const resolved = resolveBarAnimation(barStyle.animation, config.animations);
        if (!resolved)
            continue;
        if (resolved.mode === 'always') {
            // Track pct so a later switch to on-change has a baseline; always animate.
            next[key] = { pct, changedAt: prev[key]?.changedAt ?? now };
            animations[key] = { type: resolved.type };
        }
        else {
            const r = resolveOnChange(prev[key], pct, resolved.triggerThreshold, now);
            next[key] = r.next;
            if (r.active)
                animations[key] = { type: resolved.type };
        }
    }
    writeAnimationState(sessionId, next);
    return animations;
}
/** Map Claude Code's built-in `rate_limits` event data to quota windows. */
export function quotasFromRateLimits(rateLimits) {
    if (!rateLimits)
        return [];
    const windows = [];
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
export async function main() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    // Write a default config template on first run (best-effort; a read-only FS must not crash).
    if (!fs.existsSync(CONFIG_PATH)) {
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2) + '\n');
        }
        catch {
            // Ignore — loadConfig falls through to defaults anyway.
        }
    }
    const config = loadConfig(CONFIG_PATH);
    // Provider API keys come from a dedicated keys.json that only this runtime reads (never any
    // AI-facing command). Overlay them onto the provider config; never log or print them.
    mergeApiKeys(config, loadApiKeys(path.join(CONFIG_DIR, KEYS_FILENAME)));
    const theme = resolveTheme(config.theme, config.customTheme);
    // Read the full JSON object from stdin (Claude Code sends one JSON object per invocation)
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
    }
    let evt;
    try {
        evt = JSON.parse(input);
    }
    catch {
        return;
    }
    // Model ID and provider detection. When a routing layer is active (ANTHROPIC_BASE_URL points
    // away from Anthropic), the requested model.id is only an alias — prefer the actual model the
    // transcript reports so provider/cost/display reflect what really served the request.
    const routed = isRoutedBaseUrl(process.env.ANTHROPIC_BASE_URL);
    const transcriptModel = routed && evt.transcript_path ? readLatestModel(evt.transcript_path) : null;
    const active = resolveActiveModel({ requestedId: evt.model?.id || '', transcriptModel, routed });
    const rawModelId = active.modelId;
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
    const tokenUsage = totalInput > 0 || totalOutput > 0
        ? {
            inputTokens: totalInput,
            outputTokens: totalOutput,
            totalTokens: totalInput + totalOutput,
            cacheReadTokens: currentUsage?.cache_read_input_tokens ?? 0,
            cacheCreationTokens: currentUsage?.cache_creation_input_tokens ?? 0,
        }
        : undefined;
    const costBasis = costBasisFrom(currentUsage, totalInput, totalOutput);
    let cost = null;
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
    let quotas = rateLimitQuotas.length > 0 ? rateLimitQuotas : undefined;
    let balance;
    let errorMessage;
    if (providerName) {
        try {
            const adapter = getProviderAdapter(providerName, config);
            if (adapter) {
                if (!quotas) {
                    const quotaResult = await adapter.getQuotas();
                    if (quotaResult)
                        quotas = quotaResult;
                }
                const balanceResult = await adapter.getBalance?.();
                if (balanceResult)
                    balance = balanceResult;
            }
        }
        catch {
            // Never surface the raw provider error (URL/response body) on the status line — it could
            // echo request context. A generic message is enough; keys are never in the error anyway.
            errorMessage = `${providerName}: request failed`;
        }
    }
    // Git status
    const gitStatus = config.display.showGitStatus
        ? getGitStatus(evt.cwd || process.cwd())
        : { branch: '', dirty: false, ahead: 0, behind: 0 };
    const now = Date.now();
    const animations = resolveAnimations({
        config,
        theme,
        sessionId: evt.session_id || 'default',
        now,
        contextPercentage,
        quotas,
    });
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
        routing: { active: active.routed },
        errorMessage,
        now,
        animations,
    });
    process.stdout.write(renderLines.join('\n') + '\n');
}
// Auto-execute only when run directly (not when imported by tests)
const __main = async () => {
    try {
        await main();
    }
    catch (err) {
        console.error('multi-hud error:', err);
        process.exit(1);
    }
};
const __isDirectRun = process.argv[1] && path.normalize(fileURLToPath(import.meta.url)) === path.normalize(process.argv[1]);
if (__isDirectRun)
    __main();
