import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../../src/themes/index.js';
import { builtInThemes } from '../../src/themes/built-ins.js';

describe('resolveTheme', () => {
  it('returns built-in theme by name', () => {
    const theme = resolveTheme('default', {}, builtInThemes);
    expect(theme.name).toBe('default');
  });

  it('merges custom overrides', () => {
    const theme = resolveTheme('default', { colors: { model: '#e91e63' } }, builtInThemes);
    expect(theme.colors.model).toContain('[38;2;');
    const baseTheme = resolveTheme('default', {}, builtInThemes);
    expect(theme.colors.warning).toBe(baseTheme.colors.warning);
  });
});
