/**
 * Built-in model pricing, context limits, and tier resolution.
 *
 * Prices are in CNY per 1M tokens, sourced from src/info/model2price.json.
 * Context limits are in tokens, sourced from src/info/model2context.json.
 * Tier rules for GLM and MiniMax are from src/info/model2addons.json.
 */

// --- Context limits (tokens) ---

const CONTEXT_LIMITS: Record<string, number | Record<string, number>> = {
  mimo: 1_000_000,
  kimi: {
    'kimi-k2.7-code': 256_000,
    'kimi-k2.6': 256_000,
    'kimi-k2.5': 256_000,
    'moonshot-v1-8k': 8_000,
    'moonshot-v1-32k': 32_000,
    'moonshot-v1-128k': 128_000,
    'moonshot-v1-8k-vision-preview': 8_000,
    'moonshot-v1-32k-vision-preview': 32_000,
    'moonshot-v1-128k-vision-preview': 128_000,
  },
  deepseek: 1_000_000, // default 200k unless [1m] suffix
  glm: {
    'glm-5.1': 200_000,
    'glm-5': 200_000,
    'glm-5-turbo': 200_000,
    'glm-4.7': 200_000,
    'glm-4.6': 200_000,
    'glm-4.5': 100_000,
    'glm-5v-turbo': 200_000,
    'glm-4.6v': 128_000,
    'glm-4.6v-flashx': 128_000,
    'glm-4.6v-flash': 128_000,
  },
  minimax: {
    'minimax-m3': 1_000_000,
    'minimax-m2.7': 200_000,
    'minimax-m2.7-highspeed': 200_000,
  },
};

/** DeepSeek models default to 200k context; [1m] suffix enables 1M */
const DEEPSEEK_DEFAULT_CONTEXT = 200_000;

// --- Pricing (CNY per 1M tokens) ---

type PriceTier = {
  input_uncached: number;
  input_cached: number;
  output: number;
};

type ModelPricing = PriceTier | Record<string, PriceTier>;

const PRICING: Record<string, ModelPricing> = {
  // MiMo — flat pricing per model
  'mimo-v2.5': { input_uncached: 1.0, input_cached: 0.02, output: 2.0 },
  'mimo-v2.5-pro': { input_uncached: 3.0, input_cached: 0.025, output: 6.0 },
  'mimo-v2.5-pro-ultraspeed': { input_uncached: 9.0, input_cached: 0.075, output: 18.0 },

  // GLM — tiered pricing for some models
  'glm-5.1': {
    low: { input_uncached: 6.0, input_cached: 1.3, output: 24.0 },
    high: { input_uncached: 8.0, input_cached: 2.0, output: 28.0 },
  },
  'glm-5-turbo': {
    low: { input_uncached: 5.0, input_cached: 1.2, output: 22.0 },
    high: { input_uncached: 7.0, input_cached: 1.8, output: 26.0 },
  },
  'glm-5': {
    low: { input_uncached: 4.0, input_cached: 1.0, output: 18.0 },
    high: { input_uncached: 6.0, input_cached: 1.5, output: 22.0 },
  },
  'glm-4.7': {
    low: { input_uncached: 2.0, input_cached: 0.4, output: 8.0 },
    medium: { input_uncached: 3.0, input_cached: 0.6, output: 14.0 },
    high: { input_uncached: 4.0, input_cached: 0.8, output: 16.0 },
  },
  'glm-4.7-flash': { input_uncached: 0, input_cached: 0, output: 0 }, // free
  'glm-5v-turbo': {
    low: { input_uncached: 5.0, input_cached: 1.2, output: 22.0 },
    high: { input_uncached: 7.0, input_cached: 1.8, output: 26.0 },
  },
  'glm-4.6v': {
    low: { input_uncached: 1.0, input_cached: 0.2, output: 3.0 },
    high: { input_uncached: 2.0, input_cached: 0.4, output: 6.0 },
  },
  'glm-4.6v-flashx': {
    low: { input_uncached: 0.15, input_cached: 0.03, output: 1.5 },
    high: { input_uncached: 0.3, input_cached: 0.03, output: 3.0 },
  },
  'glm-4.6v-flash': { input_uncached: 0, input_cached: 0, output: 0 }, // free

  // Kimi — flat pricing per model
  'kimi-k2.7-code': { input_uncached: 6.5, input_cached: 1.3, output: 27.0 },
  'kimi-k2.6': { input_uncached: 6.5, input_cached: 1.1, output: 27.0 },
  'kimi-k2.5': { input_uncached: 4.0, input_cached: 0.7, output: 21.0 },
  'moonshot-v1-8k': { input_uncached: 2.0, input_cached: 2.0, output: 10.0 },
  'moonshot-v1-32k': { input_uncached: 5.0, input_cached: 5.0, output: 20.0 },
  'moonshot-v1-128k': { input_uncached: 10.0, input_cached: 10.0, output: 30.0 },
  'moonshot-v1-8k-vision-preview': { input_uncached: 2.0, input_cached: 2.0, output: 10.0 },
  'moonshot-v1-32k-vision-preview': { input_uncached: 5.0, input_cached: 5.0, output: 20.0 },
  'moonshot-v1-128k-vision-preview': { input_uncached: 10.0, input_cached: 10.0, output: 30.0 },

  // DeepSeek — flat pricing per model
  'deepseek-v4-flash': { input_uncached: 1.0, input_cached: 0.02, output: 2.0 },
  'deepseek-v4-pro': { input_uncached: 3.0, input_cached: 0.025, output: 6.0 },

  // MiniMax — tiered for m3, flat for others
  'minimax-m3': {
    low: { input_uncached: 2.1, input_cached: 0.42, output: 8.4 },
    high: { input_uncached: 4.2, input_cached: 0.42, output: 16.8 },
  },
  'minimax-m2.7': { input_uncached: 2.1, input_cached: 0.42, output: 8.4 },
  'minimax-m2.7-highspeed': { input_uncached: 4.2, input_cached: 0.42, output: 16.8 },
};

// --- Tier resolution ---

function isTiered(pricing: ModelPricing): pricing is Record<string, PriceTier> {
  const firstValue = Object.values(pricing)[0];
  return typeof firstValue === 'object' && firstValue !== null;
}

/**
 * Resolve the pricing tier for GLM models.
 * - high: context >= 32k
 * - medium: context < 32k && output >= 0.2k
 * - low: context < 32k && output < 0.2k
 */
function resolveGlmTier(contextTokens: number, outputTokens: number): string {
  if (contextTokens >= 32_000) return 'high';
  if (outputTokens >= 200) return 'medium';
  return 'low';
}

/**
 * Resolve the pricing tier for MiniMax models.
 * - high: context > 512k
 * - low: context <= 512k
 */
function resolveMinimaxTier(contextTokens: number): string {
  if (contextTokens > 512_000) return 'high';
  return 'low';
}

function resolveTier(
  provider: string,
  pricing: Record<string, PriceTier>,
  contextTokens: number,
  outputTokens: number,
): PriceTier {
  if (provider === 'glm') {
    return pricing[resolveGlmTier(contextTokens, outputTokens)] ?? pricing['low'];
  }
  if (provider === 'minimax') {
    return pricing[resolveMinimaxTier(contextTokens)] ?? pricing['low'];
  }
  return pricing['low'] ?? pricing['high'] ?? Object.values(pricing)[0];
}

// --- Exported functions ---

export interface ModelPrice {
  inputUncached: number; // CNY per 1M tokens
  inputCached: number; // CNY per 1M tokens
  output: number; // CNY per 1M tokens
}

export interface ParsedModelId {
  /** The model ID without the [1m] suffix */
  modelId: string;
  /** Whether the [1m] suffix was present (enables 1M context for DeepSeek) */
  oneMCtx: boolean;
  /** Provider name derived from the first segment before '-' */
  provider: string;
}

/**
 * Parse a model ID like "deepseek-v4-pro[1m]" into its components.
 * Strips the [1m] suffix and extracts the provider prefix.
 */
export function parseModelId(rawModelId: string): ParsedModelId {
  let modelId = rawModelId;
  let oneMCtx = false;

  const match = rawModelId.match(/^(.+)\[(\d+)([km])\]$/);
  if (match) {
    modelId = match[1];
    oneMCtx = true;
  }

  const dashIdx = modelId.indexOf('-');
  const provider = dashIdx > 0 ? modelId.substring(0, dashIdx) : modelId;

  return { modelId, oneMCtx, provider };
}

/** Map provider prefixes (from detectProvider) to CONTEXT_LIMITS keys */
function providerToLimitsKey(provider: string): string | null {
  if (provider === 'moonshot') return 'kimi';
  return provider;
}

/**
 * Get the context window size (in tokens) for a model.
 * Uses Claude Code's context_window_size if available, falls back to built-in table.
 */
export function getContextLimit(rawModelId: string, claudeCodeCtxSize?: number): number {
  const parsed = parseModelId(rawModelId);

  if (claudeCodeCtxSize) return claudeCodeCtxSize;

  if (parsed.provider === 'deepseek') {
    return parsed.oneMCtx ? 1_000_000 : DEEPSEEK_DEFAULT_CONTEXT;
  }

  const limitsKey = providerToLimitsKey(parsed.provider);
  if (!limitsKey) return 200_000;

  const providerLimits = CONTEXT_LIMITS[limitsKey];
  if (!providerLimits) return 200_000;

  if (typeof providerLimits === 'number') return providerLimits;

  if (parsed.modelId in providerLimits) {
    return (providerLimits as Record<string, number>)[parsed.modelId];
  }

  const values = Object.values(providerLimits as Record<string, number>);
  return values[0] ?? 200_000;
}

/**
 * Get the pricing for a model, resolving tier if applicable.
 * Returns null if the model is not in the pricing table.
 */
export function getModelPrice(rawModelId: string, contextTokens: number, outputTokens: number): ModelPrice | null {
  const parsed = parseModelId(rawModelId);
  const pricing = PRICING[parsed.modelId];
  if (!pricing) return null;

  if (isTiered(pricing)) {
    const tier = resolveTier(parsed.provider, pricing, contextTokens, outputTokens);
    return {
      inputUncached: tier.input_uncached,
      inputCached: tier.input_cached,
      output: tier.output,
    };
  }

  const flat = pricing as PriceTier;
  return {
    inputUncached: flat.input_uncached,
    inputCached: flat.input_cached,
    output: flat.output,
  };
}

/**
 * Calculate the cost in CNY for a model's token usage.
 * Distinguishes cache hit vs cache miss for input tokens.
 * All prices are per 1M tokens.
 */
export function calculateCost(
  rawModelId: string,
  inputUncachedTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
  outputTokens: number,
  contextTokens: number,
): number | null {
  const price = getModelPrice(rawModelId, contextTokens, outputTokens);
  if (!price) return null;

  // Divide by 1K first to keep intermediate values small, then by 1K again
  // Prices are per 1M tokens = per (1K × 1K) tokens
  const uncachedCost = ((inputUncachedTokens / 1000) * price.inputUncached) / 1000;
  const cacheReadCost = ((cacheReadTokens / 1000) * price.inputCached) / 1000;
  const cacheCreationCost = ((cacheCreationTokens / 1000) * price.inputCached) / 1000;
  const outputCost = ((outputTokens / 1000) * price.output) / 1000;

  return uncachedCost + cacheReadCost + cacheCreationCost + outputCost;
}
