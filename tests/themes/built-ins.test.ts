import { describe, it, expect } from 'vitest';
import { builtInThemes } from '../../src/themes/built-ins.js';
import { compileTheme } from '../../src/themes/compiler.js';

describe('builtInThemes', () => {
  it('has default theme', () => {
    expect(builtInThemes.default).toBeDefined();
    expect(builtInThemes.default.colors.model).toBeDefined();
  });

  it('has minimal, powerline, neon themes', () => {
    expect(builtInThemes.minimal).toBeDefined();
    expect(builtInThemes.powerline).toBeDefined();
    expect(builtInThemes.neon).toBeDefined();
  });

  it('all themes compile without errors', () => {
    for (const name of Object.keys(builtInThemes)) {
      expect(() => compileTheme(builtInThemes[name])).not.toThrow();
    }
  });
});
