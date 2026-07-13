import { calculateCost as calcCost } from './pricing.js';
export { getModelPrice, calculateCost } from './pricing.js';
/** Convenience wrapper that returns CNY cost from token breakdown. */
export function computeSessionCost(input) {
    return calcCost(input.modelId, input.inputUncachedTokens, input.cacheReadTokens, input.cacheCreationTokens, input.outputTokens, input.contextTokens);
}
