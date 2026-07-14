import { builtInThemes } from './built-ins.js';
import { mergeTheme } from './custom.js';
import { compileTheme } from './compiler.js';
export function resolveTheme(themeName, customOverrides, registry = builtInThemes) {
    const base = registry[themeName] ?? registry['default'];
    const merged = mergeTheme(base, customOverrides);
    return compileTheme(merged);
}
export { builtInThemes, mergeTheme, compileTheme };
