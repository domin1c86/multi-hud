export function mergeTheme(base, overrides) {
    const result = structuredClone(base);
    if (overrides.colors) {
        Object.assign(result.colors, overrides.colors);
    }
    if (overrides.bars) {
        for (const key of Object.keys(overrides.bars)) {
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
