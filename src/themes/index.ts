import { Theme } from '../types/index.js';
import { builtInThemes } from './built-ins.js';
import { mergeTheme } from './custom.js';

export function resolveTheme(
  themeName: string,
  customOverrides: Partial<Theme>,
  registry: Record<string, Theme> = builtInThemes,
): Theme {
  const base = registry[themeName] ?? registry['default'];
  return mergeTheme(base, customOverrides);
}

export { builtInThemes, mergeTheme };
