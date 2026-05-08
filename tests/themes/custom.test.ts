import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../../src/themes/index.js';
import { builtInThemes } from '../../src/themes/built-ins.js';

describe('resolveTheme', () => {
  it('returns built-in theme by name', () => {
    const theme = resolveTheme('default', {}, builtInThemes);
    expect(theme.name).toBe('default');
  });

  it('merges custom overrides', () => {
    const theme = resolveTheme('default', { colors: { model: '[35m' } }, builtInThemes);
    expect(theme.colors.model).toBe('[35m');
    expect(theme.colors.warning).toBe(builtInThemes.default.colors.warning);
  });
});
