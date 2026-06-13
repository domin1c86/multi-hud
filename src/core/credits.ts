import mimoCreditsData from '../info/mimo2credits.json' with { type: 'json' };

interface MimoCreditPrice {
  input: number;
  input_uncached: number;
  output: number;
}

export function getMimoCreditPrice(modelId: string): MimoCreditPrice | null {
  const prices = mimoCreditsData.price as Record<string, MimoCreditPrice>;
  // Strip provider prefix if present (e.g. "mimo-v2.5-pro" matches directly)
  if (modelId in prices) {
    return prices[modelId];
  }
  return null;
}

export function getMimoPlanLimit(plan: string): number {
  const plans = mimoCreditsData.plan as Record<string, number>;
  if (plan in plans) {
    return plans[plan] * 1_000_000; // JSON stores values in millions (m), convert to raw units
  }
  // Default to 'standard' plan
  return (plans['standard'] ?? 11_000) * 1_000_000;
}

export interface MimoTokenCounts {
  inputUncached: number;
  cacheRead: number;
  cacheCreation: number;
  output: number;
}

export function computeMimoCredits(modelId: string, tokens: MimoTokenCounts): number | null {
  const price = getMimoCreditPrice(modelId);
  if (!price) return null;

  // Prices are per 1M tokens, same pattern as pricing.ts
  const uncachedCost = ((tokens.inputUncached / 1000) * price.input_uncached) / 1000;
  const cacheReadCost = ((tokens.cacheRead / 1000) * price.input) / 1000;
  const cacheCreationCost = ((tokens.cacheCreation / 1000) * price.input) / 1000;
  const outputCost = ((tokens.output / 1000) * price.output) / 1000;

  return uncachedCost + cacheReadCost + cacheCreationCost + outputCost;
}