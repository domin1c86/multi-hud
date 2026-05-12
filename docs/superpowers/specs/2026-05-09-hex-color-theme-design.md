# Hex Color Theme System Design

## Goal

Replace raw ANSI escape codes in theme color definitions with human-readable hex color specs (e.g. `#39c5bb[#7f7f7f]`), enabling:
- Easy custom color selection without knowing ANSI codes
- Automatic derivation of missing foreground/background colors via a fixed ratio
- Simple prefix markers for text styles (bold, italic)

## Color Spec Syntax

```
spec       := [styles] [fg] [bg]
styles     := ("b" | "i")*
fg         := "#" hex6
bg         := "[" "#" hex6 "]"
hex6       := [0-9a-fA-F]{6}
```

### Examples

| Spec | Meaning |
|------|---------|
| `#39c5bb` | Foreground `#39c5bb`, background derived |
| `[#7f7f7f]` | Background `#7f7f7f`, foreground derived |
| `#39c5bb[#7f7f7f]` | Both explicitly set |
| `b#39c5bb` | Bold + foreground `#39c5bb`, background derived |
| `i[#7f7f7f]` | Italic + background `#7f7f7f`, foreground derived |
| `bi#39c5bb[#7f7f7f]` | Bold + italic + both colors set |

## Derivation Algorithm

Reference pair: foreground `#c0c0c0` (192, 192, 192), background `#808080` (128, 128, 128).
Ratio: `fg / bg = 1.5` per RGB channel.

### Rules

- Derive background from foreground: `bg_channel = round(fg_channel × 2/3)`
- Derive foreground from background: `fg_channel = min(255, round(bg_channel × 3/2))`

Both operations clamp to `[0, 255]`.

## ANSI Conversion

Use true-color ANSI escape sequences:

- Foreground: `\x1b[38;2;R;G;Bm`
- Background: `\x1b[48;2;R;G;Bm`
- Bold: `\x1b[1m`
- Italic: `\x1b[3m`

Style prefixes are emitted before color codes. Reset `\x1b[0m` remains handled by the renderer.

## Architecture

### New Module: `src/themes/compiler.ts`

```typescript
export interface ParsedColor {
  fg?: string;      // hex, e.g. "#39c5bb"
  bg?: string;      // hex, e.g. "#7f7f7f"
  bold: boolean;
  italic: boolean;
}

export function parseColorSpec(spec: string): ParsedColor;
export function compileColorSpec(spec: string, role: 'fg' | 'bg'): string;
export function compileTheme(theme: Theme): Theme;
```

### Field Role Rules

Each color field in `Theme` has a semantic role that determines which part of the parsed spec to compile:

| Field Path | Role | Behavior |
|------------|------|----------|
| `colors.*` | `fg` | Text color; bg part ignored if present |
| `bars.*.fgColor` | `fg` | Bar fill color |
| `bars.*.bgColor` | `bg` | Bar empty background |

If the spec provides the opposite color type (e.g. `fgColor` field receives `[#7f7f7f]`), the required color is derived from the provided one using the fixed ratio.

### Integration Point

In `src/themes/index.ts`, `resolveTheme()` returns a `Theme`. `compileTheme()` is then called on the result before it reaches the renderer.

In `src/index.ts`:
```typescript
const theme = compileTheme(resolveTheme(config.theme, config.customTheme));
```

The renderer (`src/core/renderer.ts`) requires **no changes** — it still receives ANSI strings.

### Backward Compatibility

If a color string starts with `\x1b[` (ESC character), it is treated as a raw ANSI escape sequence and passed through unchanged. This preserves any existing custom themes that use raw ANSI codes.

## Built-in Theme Migration

All four built-in themes (`default`, `minimal`, `powerline`, `neon`) are migrated from ANSI codes to hex specs.

### Mapping Reference (Default Theme)

| Old ANSI | Approximate Hex |
|----------|-----------------|
| `\x1b[30m` / `\x1b[40m` | `#000000` |
| `\x1b[31m` / `\x1b[41m` | `#f44336` |
| `\x1b[32m` / `\x1b[42m` | `#4caf50` |
| `\x1b[33m` / `\x1b[43m` | `#ff9800` |
| `\x1b[34m` / `\x1b[44m` | `#2196f3` |
| `\x1b[35m` / `\x1b[45m` | `#9c27b0` |
| `\x1b[36m` / `\x1b[46m` | `#00bcd4` |
| `\x1b[37m` / `\x1b[47m` | `#e0e0e0` |
| `\x1b[90m` | `#757575` |
| `\x1b[91m` | `#ff5252` |
| `\x1b[92m` | `#69f0ae` |
| `\x1b[93m` | `#ffd740` |
| `\x1b[94m` | `#448aff` |
| `\x1b[95m` | `#e040fb` |
| `\x1b[96m` | `#18ffff` |
| `\x1b[97m` | `#ffffff` |

## Type Changes

`Theme` and `BarStyle` interfaces require **no structural changes**. Color fields remain `string`. Only their semantic meaning changes from "raw ANSI" to "color spec". Comments in `src/types/index.ts` should be updated to reflect this.

## Testing Strategy

1. **Unit tests for `parseColorSpec`** — cover all syntax variations, style extraction, hex parsing, case insensitivity
2. **Unit tests for derivation** — verify `deriveBackground('#c0c0c0')` returns `#808080` and vice versa
3. **Unit tests for `compileColorSpec`** — verify role-based compilation produces correct ANSI sequences
4. **Unit tests for backward compatibility** — raw ANSI strings pass through unchanged
5. **Integration tests** — built-in themes compile successfully and existing renderer tests still pass
6. **Theme tests update** — `tests/themes/built-ins.test.ts` should verify themes compile without errors
