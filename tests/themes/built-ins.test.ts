import { describe, it, expect } from 'vitest';
import { builtInThemes } from '../../src/themes/built-ins.js';

describe('builtInThemes', () => {
  it('has default theme', () => {
    expect(builtInThemes.default).toBeDefined();
    expect(builtInThemes.default.colors.model).toBeDefined();
  });

  it('has dark, minimal, powerline, neon themes', () => {
    expect(builtInThemes.minimal).toBeDefined();
    expect(builtInThemes.powerline).toBeDefined();
    expect(builtInThemes.neon).toBeDefined();
  });
});
