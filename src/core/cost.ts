import { PricingConfig } from '../types/index.js';

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  pricing: PricingConfig,
): number | null {
  const modelPricing = pricing.models[modelId];
  if (!modelPricing) return null;
  const inputCost = (inputTokens * modelPricing.input) / 1000;
  const outputCost = (outputTokens * modelPricing.output) / 1000;
  return inputCost + outputCost;
}
