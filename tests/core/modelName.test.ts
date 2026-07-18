import { describe, it, expect } from 'vitest';
import { formatModelId } from '../../src/core/modelName.js';

describe('formatModelId', () => {
  it.each([
    // Claude: `claude-` branding stripped, prefix is the family, version dashes → dots
    ['claude-opus-4-8', '[claude] opus-4.8'],
    ['claude-sonnet-5', '[claude] sonnet-5'],
    ['claude-fable-5', '[claude] fable-5'],
    // Trailing date/build stamp dropped
    ['claude-haiku-4-5-20251001', '[claude] haiku-4.5'],
    // Prefix owned by a different company
    ['glm-5.1', '[zai] glm-5.1'],
    ['mimo-v2.5', '[xiaomi] mimo-v2.5'],
    ['gpt-4o', '[openai] gpt-4o'],
    ['gemini-2.0-flash', '[google] gemini-2.0-flash'],
    ['qwen-max', '[ali] qwen-max'],
    ['hunyuan-turbo', '[tencent] hunyuan-turbo'],
    // Company name == prefix → keep the prefix (user choice)
    ['deepseek-v4-pro', '[deepseek] deepseek-v4-pro'],
    ['kimi-k2.6', '[moonshot] kimi-k2.6'],
    ['minimax-m3', '[minimax] minimax-m3'],
    // Context-size suffix preserved
    ['deepseek-v4-pro[1m]', '[deepseek] deepseek-v4-pro[1m]'],
  ])('formats %s → %s', (input, expected) => {
    expect(formatModelId(input)).toBe(expected);
  });

  it('omits the [provider] bracket when showProvider is false, keeping the formatted name', () => {
    expect(formatModelId('glm-5.1', false)).toBe('glm-5.1');
    expect(formatModelId('claude-opus-4-8', false)).toBe('opus-4.8');
    expect(formatModelId('deepseek-v4-pro', false)).toBe('deepseek-v4-pro');
    expect(formatModelId('claude-haiku-4-5-20251001', false)).toBe('haiku-4.5');
  });

  it('includes the bracket by default (showProvider defaults true)', () => {
    expect(formatModelId('glm-5.1')).toBe('[zai] glm-5.1');
  });

  it('renders no bracket when the prefix is not in the map', () => {
    // The map has `kimi`, not the legacy `moonshot` prefix.
    expect(formatModelId('moonshot-v1-128k')).toBe('moonshot-v1-128k');
    expect(formatModelId('unknown-9-9')).toBe('unknown-9.9');
  });

  it('returns an empty string for empty input', () => {
    expect(formatModelId('')).toBe('');
  });
});
