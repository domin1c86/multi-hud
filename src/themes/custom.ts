import { Theme } from '../types/index.js';

export function mergeTheme(base: Theme, overrides: Partial<Theme>): Theme {
  const result = structuredClone(base) as Theme;
  if (overrides.colors) {
    Object.assign(result.colors, overrides.colors);
  }
  if (overrides.bars) {
    for (const key of Object.keys(overrides.bars) as Array<keyof Theme['bars']>) {
      if (overrides.bars[key]) {
        Object.assign(result.bars[key], overrides.bars[key]);
      }
    }
  }
  if (overrides.icons) {
    Object.assign(result.icons, overrides.icons);
  }
  if (overrides.layout) {
    Object.assign(result.layout, overrides.layout);
  }
  return result;
}
