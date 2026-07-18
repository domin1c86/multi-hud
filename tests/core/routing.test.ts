import { describe, it, expect } from 'vitest';
import { isRoutedBaseUrl, resolveActiveModel } from '../../src/core/routing.js';

describe('isRoutedBaseUrl', () => {
  it('is false when unset or empty', () => {
    expect(isRoutedBaseUrl(undefined)).toBe(false);
    expect(isRoutedBaseUrl('')).toBe(false);
  });

  it('is false for the canonical Anthropic host', () => {
    expect(isRoutedBaseUrl('https://api.anthropic.com')).toBe(false);
    expect(isRoutedBaseUrl('https://api.anthropic.com/v1')).toBe(false);
  });

  it('is true for a non-Anthropic proxy host', () => {
    expect(isRoutedBaseUrl('http://localhost:3456')).toBe(true);
    expect(isRoutedBaseUrl('https://my-gateway.example.com/api')).toBe(true);
  });

  it('is false for an unparseable value', () => {
    expect(isRoutedBaseUrl('not a url')).toBe(false);
  });
});

describe('resolveActiveModel', () => {
  it('keeps the requested id when not routed (no substitution)', () => {
    const r = resolveActiveModel({ requestedId: 'glm-5.1', transcriptModel: 'deepseek-v4-pro', routed: false });
    expect(r).toEqual({ modelId: 'glm-5.1', requestedId: 'glm-5.1', routed: false });
  });

  it('prefers the transcript model when routed', () => {
    const r = resolveActiveModel({ requestedId: 'default', transcriptModel: 'deepseek-v4-pro', routed: true });
    expect(r).toEqual({ modelId: 'deepseek-v4-pro', requestedId: 'default', routed: true });
  });

  it('falls back to the requested id when routed but no transcript model, and does not flag routing', () => {
    const r = resolveActiveModel({ requestedId: 'default', transcriptModel: null, routed: true });
    expect(r).toEqual({ modelId: 'default', requestedId: 'default', routed: false });
  });
});
