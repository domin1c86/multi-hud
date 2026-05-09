import { describe, it, expect, vi } from 'vitest';

describe('index', () => {
  it('exports a main function', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.main).toBe('function');
  });
});
