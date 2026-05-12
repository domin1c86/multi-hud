# Hex Color Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw ANSI escape codes in theme color definitions with human-readable hex color specs (e.g. `#39c5bb[#7f7f7f]`), including automatic derivation of missing colors and prefix markers for text styles.

**Architecture:** Add a `src/themes/compiler.ts` module that parses hex color specs, derives missing foreground/background colors via a fixed ratio, and converts them to true-color ANSI escape sequences. Integrate compilation into `resolveTheme()` so the renderer continues to receive ANSI strings without changes.

**Tech Stack:** TypeScript, Vitest, Node.js

---

## File Structure

- **Create:** `src/themes/compiler.ts` — Color spec parser, derivation functions, ANSI compiler, theme compiler
- **Modify:** `src/themes/index.ts` — Integrate `compileTheme()` into `resolveTheme()`
- **Modify:** `src/themes/built-ins.ts` — Migrate all ANSI codes to hex specs
- **Modify:** `src/types/index.ts` — Update comments on color fields
- **Create:** `tests/themes/compiler.test.ts` — Parser, derivation, compiler tests
- **Modify:** `tests/themes/custom.test.ts` — Update to work with compiled themes
- **Modify:** `tests/themes/built-ins.test.ts` — Add compilation smoke test
- **Modify:** `tests/core/renderer.test.ts` — Use compiled theme instead of raw `builtInThemes.default`

---

### Task 1: Color Spec Parser + Derivation

**Files:**
- Create: `src/themes/compiler.ts`
- Create: `tests/themes/compiler.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/themes/compiler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseColorSpec, deriveBackground, deriveForeground } from '../../src/themes/compiler.js';

describe('parseColorSpec', () => {
  it('parses foreground only', () => {
    const parsed = parseColorSpec('#39c5bb');
    expect(parsed.fg).toBe('#39c5bb');
    expect(parsed.bg).toBeUndefined();
    expect(parsed.bold).toBe(false);
    expect(parsed.italic).toBe(false);
  });

  it('parses background only', () => {
    const parsed = parseColorSpec('[#7f7f7f]');
    expect(parsed.fg).toBeUndefined();
    expect(parsed.bg).toBe('#7f7f7f');
  });

  it('parses both colors', () => {
    const parsed = parseColorSpec('#39c5bb[#7f7f7f]');
    expect(parsed.fg).toBe('#39c5bb');
    expect(parsed.bg).toBe('#7f7f7f');
  });

  it('parses style prefixes', () => {
    const parsed = parseColorSpec('bi#39c5bb');
    expect(parsed.bold).toBe(true);
    expect(parsed.italic).toBe(true);
    expect(parsed.fg).toBe('#39c5bb');
  });

  it('is case insensitive', () => {
    const parsed = parseColorSpec('#39C5BB');
    expect(parsed.fg).toBe('#39c5bb');
  });
});

describe('derivation', () => {
  it('derives background from foreground', () => {
    expect(deriveBackground('#c0c0c0')).toBe('#808080');
  });

  it('derives foreground from background', () => {
    expect(deriveForeground('#808080')).toBe('#c0c0c0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/themes/compiler.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

Create `src/themes/compiler.ts`:

```typescript
export interface ParsedColor {
  fg?: string;
  bg?: string;
  bold: boolean;
  italic: boolean;
}

export function parseColorSpec(spec: string): ParsedColor {
  let bold = false;
  let italic = false;
  let s = spec;

  while (s.length > 0 && (s[0] === 'b' || s[0] === 'i')) {
    if (s[0] === 'b') bold = true;
    if (s[0] === 'i') italic = true;
    s = s.slice(1);
  }

  let bg: string | undefined;
  const bgMatch = s.match(/\[#([0-9a-fA-F]{6})\]$/);
  if (bgMatch) {
    bg = '#' + bgMatch[1].toLowerCase();
    s = s.slice(0, -bgMatch[0].length);
  }

  let fg: string | undefined;
  const fgMatch = s.match(/^#([0-9a-fA-F]{6})$/);
  if (fgMatch) {
    fg = '#' + fgMatch[1].toLowerCase();
  }

  return { fg, bg, bold, italic };
}

export function deriveBackground(fg: string): string {
  const r = parseInt(fg.slice(1, 3), 16);
  const g = parseInt(fg.slice(3, 5), 16);
  const b = parseInt(fg.slice(5, 7), 16);
  return '#' + [
    Math.max(0, Math.min(255, Math.round(r * 2 / 3))),
    Math.max(0, Math.min(255, Math.round(g * 2 / 3))),
    Math.max(0, Math.min(255, Math.round(b * 2 / 3))),
  ].map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function deriveForeground(bg: string): string {
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  return '#' + [
    Math.max(0, Math.min(255, Math.round(r * 3 / 2))),
    Math.max(0, Math.min(255, Math.round(g * 3 / 2))),
    Math.max(0, Math.min(255, Math.round(b * 3 / 2))),
  ].map((c) => c.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/themes/compiler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/themes/compiler.ts tests/themes/compiler.test.ts
git commit -m "feat: add color spec parser and derivation"
```

---

### Task 2: ANSI Compiler + Theme Compiler

**Files:**
- Modify: `src/themes/compiler.ts`
- Modify: `tests/themes/compiler.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/themes/compiler.test.ts` (append after existing code):

```typescript
import { compileColorSpec, compileTheme } from '../../src/themes/compiler.js';
import { builtInThemes } from '../../src/themes/built-ins.js';

describe('compileColorSpec', () => {
  it('compiles foreground role', () => {
    const ansi = compileColorSpec('#39c5bb', 'fg');
    expect(ansi).toContain('\x1b[38;2;');
    expect(ansi).toContain('57');
    expect(ansi).toContain('197');
    expect(ansi).toContain('187');
  });

  it('compiles background role', () => {
    const ansi = compileColorSpec('[#7f7f7f]', 'bg');
    expect(ansi).toBe('\x1b[48;2;127;127;127m');
  });

  it('derives missing foreground', () => {
    const ansi = compileColorSpec('[#808080]', 'fg');
    expect(ansi).toBe('\x1b[38;2;192;192;192m');
  });

  it('derives missing background', () => {
    const ansi = compileColorSpec('#c0c0c0', 'bg');
    expect(ansi).toBe('\x1b[48;2;128;128;128m');
  });

  it('applies bold style', () => {
    const ansi = compileColorSpec('b#39c5bb', 'fg');
    expect(ansi.startsWith('\x1b[1m')).toBe(true);
  });

  it('applies italic style', () => {
    const ansi = compileColorSpec('i#39c5bb', 'fg');
    expect(ansi.startsWith('\x1b[3m')).toBe(true);
  });

  it('applies both bold and italic', () => {
    const ansi = compileColorSpec('bi#39c5bb', 'fg');
    expect(ansi).toContain('\x1b[1m');
    expect(ansi).toContain('\x1b[3m');
  });

  it('passes through raw ANSI', () => {
    const ansi = compileColorSpec('\x1b[36m', 'fg');
    expect(ansi).toBe('\x1b[36m');
  });
});

describe('compileTheme', () => {
  it('compiles built-in default theme', () => {
    const compiled = compileTheme(builtInThemes.default);
    expect(compiled.colors.model).toContain('\x1b[38;2;');
    expect(compiled.bars.context.fgColor).toContain('\x1b[38;2;');
    expect(compiled.bars.context.bgColor).toContain('\x1b[48;2;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/themes/compiler.test.ts`
Expected: FAIL with "compileColorSpec is not defined" or similar

- [ ] **Step 3: Write minimal implementation**

Add to `src/themes/compiler.ts` (append after existing code):

```typescript
import { Theme } from '../types/index.js';

export function compileColorSpec(spec: string, role: 'fg' | 'bg'): string {
  if (spec.startsWith('\x1b[')) {
    return spec;
  }

  const parsed = parseColorSpec(spec);

  if (!parsed.fg && !parsed.bg) {
    return '\x1b[0m';
  }

  let hex: string;
  if (role === 'fg') {
    hex = parsed.fg ?? deriveForeground(parsed.bg!);
  } else {
    hex = parsed.bg ?? deriveBackground(parsed.fg!);
  }

  const parts: string[] = [];
  if (parsed.bold) parts.push('\x1b[1m');
  if (parsed.italic) parts.push('\x1b[3m');

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (role === 'fg') {
    parts.push(`\x1b[38;2;${r};${g};${b}m`);
  } else {
    parts.push(`\x1b[48;2;${r};${g};${b}m`);
  }

  return parts.join('');
}

export function compileTheme(theme: Theme): Theme {
  const compiled = structuredClone(theme) as Theme;

  for (const key of Object.keys(compiled.colors) as Array<keyof Theme['colors']>) {
    compiled.colors[key] = compileColorSpec(compiled.colors[key], 'fg');
  }

  for (const barKey of Object.keys(compiled.bars) as Array<keyof Theme['bars']>) {
    const bar = { ...compiled.bars[barKey] };
    bar.fgColor = compileColorSpec(bar.fgColor, 'fg');
    bar.bgColor = compileColorSpec(bar.bgColor, 'bg');
    compiled.bars[barKey] = bar;
  }

  return compiled;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/themes/compiler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/themes/compiler.ts tests/themes/compiler.test.ts
git commit -m "feat: add ANSI compiler and theme compilation"
```

---

### Task 3: Integrate Compilation into Theme Resolution

**Files:**
- Modify: `src/themes/index.ts`
- Modify: `tests/themes/custom.test.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Modify `src/themes/index.ts`**

Edit `src/themes/index.ts`:

```typescript
import { Theme } from '../types/index.js';
import { builtInThemes } from './built-ins.js';
import { mergeTheme } from './custom.js';
import { compileTheme } from './compiler.js';

export function resolveTheme(
  themeName: string,
  customOverrides: Partial<Theme>,
  registry: Record<string, Theme> = builtInThemes,
): Theme {
  const base = registry[themeName] ?? registry['default'];
  const merged = mergeTheme(base, customOverrides);
  return compileTheme(merged);
}

export { builtInThemes, mergeTheme, compileTheme };
```

- [ ] **Step 2: Modify `src/types/index.ts` comments**

Update comments to indicate color fields now accept hex specs:

```typescript
export interface BarStyle {
  /** Color spec (e.g. "#39c5bb", "[#7f7f7f]", "b#39c5bb[#7f7f7f]") */
  fgColor: string;
  /** Color spec (e.g. "[#7f7f7f]", "#39c5bb") */
  bgColor: string;
  animation: AnimationConfig;
}
```

- [ ] **Step 3: Update `tests/themes/custom.test.ts`**

Replace the existing test file with:

```typescript
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
    expect(theme.colors.model).toContain('\x1b[38;2;');
    const baseTheme = resolveTheme('default', {}, builtInThemes);
    expect(theme.colors.warning).toBe(baseTheme.colors.warning);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/themes/`
Expected: PASS (both built-ins and custom tests should pass since built-ins still use ANSI codes at this point)

- [ ] **Step 5: Commit**

```bash
git add src/themes/index.ts src/types/index.ts tests/themes/custom.test.ts
git commit -m "feat: integrate theme compilation into resolveTheme"
```

---

### Task 4: Migrate Built-in Themes to Hex Specs

**Files:**
- Modify: `src/themes/built-ins.ts`
- Modify: `tests/themes/built-ins.test.ts`

- [ ] **Step 1: Rewrite `src/themes/built-ins.ts`**

Replace the entire file with hex specs. Use the ANSI-to-hex mapping below.

Default theme mapping:
- `\x1b[36m` (cyan) → `#00bcd4`
- `\x1b[90m` (bright black) → `#757575`
- `\x1b[33m` (yellow) → `#ff9800`
- `\x1b[31m` (red) → `#f44336`
- `\x1b[32m` (green) → `#4caf50`
- `\x1b[35m` (magenta) → `#e91e63`
- `\x1b[34m` (blue) → `#2196f3`
- `\x1b[40m` (black bg) → `[#000000]`
- `\x1b[0m` (reset) → `#e5e5e5`
- `\x1b[97;44m` (white on blue) → `#ffffff`
- `\x1b[30;43m` (black on yellow) → `#000000`
- `\x1b[97;41m` (white on red) → `#ffffff`
- `\x1b[95m` (bright magenta) → `#e040fb`
- `\x1b[93m` (bright yellow) → `#ffd740`
- `\x1b[92m` (bright green) → `#69f0ae`
- `\x1b[94m` (bright blue) → `#448aff`
- `\x1b[96m` (bright cyan) → `#29b8db`
- `\x1b[91m` (bright red) → `#ff5252`

The complete migrated `src/themes/built-ins.ts`:

```typescript
import { Theme } from '../types/index.js';

const defaultBarStyle = {
  fgColor: '#4caf50',
  bgColor: '[#000000]',
  animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 },
};

export const builtInThemes: Record<string, Theme> = {
  default: {
    name: 'default',
    colors: {
      model: '#00bcd4',
      label: '#757575',
      warning: '#ff9800',
      error: '#f44336',
      dim: '#9e9e9e',
      toolActive: '#ff9800',
      toolDone: '#4caf50',
      agentRunning: '#00bcd4',
      todoPending: '#ff9800',
      todoDone: '#4caf50',
      cost: '#e91e63',
      gitBranch: '#2196f3',
      gitDirty: '#ff9800',
    },
    bars: {
      context: { ...defaultBarStyle },
      quota5h: { ...defaultBarStyle, fgColor: '#ff9800' },
      quota24h: { ...defaultBarStyle, fgColor: '#2196f3' },
      quota7d: { ...defaultBarStyle, fgColor: '#e91e63' },
      quota30d: { ...defaultBarStyle, fgColor: '#00bcd4' },
    },
    icons: {
      deepseek: '🔥',
      kimi: '🌙',
      glm: '🧠',
      minimax: '🎭',
      warning: '⚠️',
      error: '🔴',
      tool: '🔧',
      agent: '🤖',
      todo: '📝',
      gitBranch: '⎇',
      gitDirty: '*',
    },
    layout: { compact: false, showLabels: true, barWidth: 10 },
  },
  minimal: {
    name: 'minimal',
    colors: {
      model: '#e5e5e5',
      label: '#e5e5e5',
      warning: '#e5e5e5',
      error: '#e5e5e5',
      dim: '#e5e5e5',
      toolActive: '#e5e5e5',
      toolDone: '#e5e5e5',
      agentRunning: '#e5e5e5',
      todoPending: '#e5e5e5',
      todoDone: '#e5e5e5',
      cost: '#e5e5e5',
      gitBranch: '#e5e5e5',
      gitDirty: '#e5e5e5',
    },
    bars: {
      context: { fgColor: '#e5e5e5', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota5h: { fgColor: '#e5e5e5', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota24h: { fgColor: '#e5e5e5', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota7d: { fgColor: '#e5e5e5', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota30d: { fgColor: '#e5e5e5', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
    },
    icons: {
      warning: '!',
      error: 'X',
      tool: '',
      agent: '',
      todo: '',
      gitBranch: '',
      gitDirty: '*',
    },
    layout: { compact: true, showLabels: false, barWidth: 10 },
  },
  powerline: {
    name: 'powerline',
    colors: {
      model: '#ffffff',
      label: '#757575',
      warning: '#000000',
      error: '#ffffff',
      dim: '#757575',
      toolActive: '#ff9800',
      toolDone: '#4caf50',
      agentRunning: '#00bcd4',
      todoPending: '#ff9800',
      todoDone: '#4caf50',
      cost: '#e91e63',
      gitBranch: '#2196f3',
      gitDirty: '#ff9800',
    },
    bars: {
      context: { ...defaultBarStyle },
      quota5h: { ...defaultBarStyle, fgColor: '#ff9800' },
      quota24h: { ...defaultBarStyle, fgColor: '#2196f3' },
      quota7d: { ...defaultBarStyle, fgColor: '#e91e63' },
      quota30d: { ...defaultBarStyle, fgColor: '#00bcd4' },
    },
    icons: {
      deepseek: 'DS',
      kimi: 'KM',
      glm: 'GL',
      minimax: 'MX',
      warning: '▲',
      error: '✖',
      tool: '●',
      agent: '◎',
      todo: '○',
      gitBranch: '⎇',
      gitDirty: '●',
    },
    layout: { compact: false, showLabels: true, barWidth: 10 },
  },
  neon: {
    name: 'neon',
    colors: {
      model: '#e040fb',
      label: '#757575',
      warning: '#ffd740',
      error: '#ff5252',
      dim: '#757575',
      toolActive: '#ffd740',
      toolDone: '#69f0ae',
      agentRunning: '#29b8db',
      todoPending: '#ffd740',
      todoDone: '#69f0ae',
      cost: '#e040fb',
      gitBranch: '#448aff',
      gitDirty: '#ffd740',
    },
    bars: {
      context: { fgColor: '#69f0ae', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota5h: { fgColor: '#ffd740', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota24h: { fgColor: '#448aff', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota7d: { fgColor: '#e040fb', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      quota30d: { fgColor: '#29b8db', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
    },
    icons: {
      deepseek: '🔥',
      kimi: '🌙',
      glm: '🧠',
      minimax: '🎭',
      warning: '⚡',
      error: '💥',
      tool: '🔧',
      agent: '🤖',
      todo: '📝',
      gitBranch: '⎇',
      gitDirty: '✨',
    },
    layout: { compact: false, showLabels: true, barWidth: 12 },
  },
};
```

- [ ] **Step 2: Update `tests/themes/built-ins.test.ts`**

Replace with:

```typescript
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
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/themes/`
Expected: PASS (all theme tests pass with hex themes being compiled)

- [ ] **Step 4: Commit**

```bash
git add src/themes/built-ins.ts tests/themes/built-ins.test.ts
git commit -m "feat: migrate built-in themes to hex color specs"
```

---

### Task 5: Update Renderer Tests

**Files:**
- Modify: `tests/core/renderer.test.ts`

- [ ] **Step 1: Update imports and theme setup**

Replace the import and `theme` constant in `tests/core/renderer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderStatusline } from '../../src/core/renderer.js';
import { QuotaWindow } from '../../src/types/index.js';
import { resolveTheme } from '../../src/themes/index.js';

const theme = resolveTheme('default', {});
```

Remove the `builtInThemes` import if it was the only one. Keep `QuotaWindow` import.

- [ ] **Step 2: Run renderer tests**

Run: `npx vitest run tests/core/renderer.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/core/renderer.test.ts
git commit -m "test: update renderer tests to use compiled themes"
```

---

### Task 6: Full Test Suite Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Commit if any fixes were needed**

If any tests failed and were fixed:
```bash
git add <fixed-files>
git commit -m "fix: adjust tests for hex theme migration"
```

If no fixes needed, skip this step.

---

## Self-Review

**1. Spec coverage:**
- Color spec parser with style prefixes → Task 1
- Derivation algorithm (fg/bg ratio) → Task 1
- ANSI conversion (true color) → Task 2
- Theme compilation → Task 2
- Integration into resolveTheme → Task 3
- Backward compatibility (ANSI passthrough) → Task 2
- Built-in theme migration → Task 4
- Type comment updates → Task 3
- Test updates → Tasks 1-6

**2. Placeholder scan:** No TBD, TODO, or vague steps. All steps contain exact code and commands.

**3. Type consistency:** `ParsedColor`, `compileColorSpec`, `compileTheme` signatures are consistent across tasks. `Theme` and `BarStyle` interfaces remain structurally unchanged.
