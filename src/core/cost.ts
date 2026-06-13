import { calculateCost as calcCost } from './pricing.js';

export interface CostInput {
  modelId: string;
  inputUncachedTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
  contextTokens: number;
}

export { getModelPrice, calculateCost } from './pricing.js';

/** Convenience wrapper that returns CNY cost from token breakdown. */
export function computeSessionCost(input: CostInput): number | null {
  return calcCost(
    input.modelId,
    input.inputUncachedTokens,
    input.cacheReadTokens,
    input.cacheCreationTokens,
    input.outputTokens,
    input.contextTokens,
  );
}
