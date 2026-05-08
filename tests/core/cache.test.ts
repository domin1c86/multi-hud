import { describe, it, expect, vi } from 'vitest';
import { Cache } from '../../src/core/cache.js';

describe('Cache', () => {
  it('stores and retrieves a value', () => {
    const cache = new Cache();
    cache.set('key', 'value', 1000);
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined for expired entries', () => {
    const cache = new Cache();
    cache.set('key', 'value', 0);
    expect(cache.get('key')).toBeUndefined();
  });

  it('returns undefined for missing keys', () => {
    const cache = new Cache();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = new Cache();
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
