import { describe, it, expect } from 'vitest';
import { parseColorSpec, deriveBackground, deriveForeground, compileColorSpec, compileTheme } from '../../src/themes/compiler.js';
import { builtInThemes } from '../../src/themes/built-ins.js';

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

  it('is case insensitive for background', () => {
    const parsed = parseColorSpec('[#39C5BB]');
    expect(parsed.bg).toBe('#39c5bb');
  });

  it('throws on invalid hex characters', () => {
    expect(() => parseColorSpec('#gggggg')).toThrow('Invalid color spec: "#gggggg"');
    expect(() => parseColorSpec('[#zzzzzz]')).toThrow('Invalid color spec: "[#zzzzzz]"');
  });

  it('throws on empty string', () => {
    expect(() => parseColorSpec('')).toThrow('Invalid color spec: ""');
  });

  it('throws on unknown prefix', () => {
    expect(() => parseColorSpec('x#39c5bb')).toThrow('Invalid color spec: "x#39c5bb"');
    expect(() => parseColorSpec('bx#39c5bb')).toThrow('Invalid color spec: "bx#39c5bb"');
  });

  it('throws on trailing junk', () => {
    expect(() => parseColorSpec('#39c5bbjunk')).toThrow('Invalid color spec: "#39c5bbjunk"');
    expect(() => parseColorSpec('#39c5bb[#7f7f7f]junk')).toThrow('Invalid color spec: "#39c5bb[#7f7f7f]junk"');
    expect(() => parseColorSpec('#39c5bbx[#7f7f7f]')).toThrow('Invalid color spec: "#39c5bbx[#7f7f7f]" (unexpected: "#39c5bbx")');
  });

  it('throws on invalid hex length', () => {
    expect(() => parseColorSpec('#39c5b')).toThrow('Invalid color spec: "#39c5b"');
    expect(() => parseColorSpec('[#39c5b]')).toThrow('Invalid color spec: "[#39c5b]"');
  });

  it('throws on missing hash', () => {
    expect(() => parseColorSpec('39c5bb')).toThrow('Invalid color spec: "39c5bb"');
  });

  it('throws on only prefixes with no color', () => {
    expect(() => parseColorSpec('bi')).toThrow('Invalid color spec: "bi"');
  });

  it('throws on reversed order', () => {
    expect(() => parseColorSpec('[#7f7f7f]#39c5bb')).toThrow('Invalid color spec: "[#7f7f7f]#39c5bb"');
  });
});

describe('derivation', () => {
  it('derives background from foreground', () => {
    expect(deriveBackground('#c0c0c0')).toBe('#808080');
  });

  it('derives foreground from background', () => {
    expect(deriveForeground('#808080')).toBe('#c0c0c0');
  });

  it('clamps background at high end', () => {
    expect(deriveBackground('#ffffff')).toBe('#aaaaaa');
  });

  it('clamps background at low end', () => {
    expect(deriveBackground('#000000')).toBe('#000000');
  });

  it('clamps foreground at high end', () => {
    expect(deriveForeground('#ffffff')).toBe('#ffffff');
  });

  it('clamps foreground at low end', () => {
    expect(deriveForeground('#000000')).toBe('#000000');
  });

  it('derives background per-channel for non-grayscale', () => {
    expect(deriveBackground('#ff0000')).toBe('#aa0000');
  });

  it('derives foreground per-channel for non-grayscale', () => {
    expect(deriveForeground('#00ff00')).toBe('#00ff00');
    expect(deriveForeground('#00aaaa')).toBe('#00ffff');
  });

  it('throws on invalid hex in deriveBackground', () => {
    expect(() => deriveBackground('ff0000')).toThrow('Invalid hex color: "ff0000"');
    expect(() => deriveBackground('#ff000')).toThrow('Invalid hex color: "#ff000"');
  });

  it('throws on invalid hex in deriveForeground', () => {
    expect(() => deriveForeground('ff0000')).toThrow('Invalid hex color: "ff0000"');
    expect(() => deriveForeground('#ff000')).toThrow('Invalid hex color: "#ff000"');
  });
});

describe('compileColorSpec', () => {
  it('compiles foreground role', () => {
    const ansi = compileColorSpec('#39c5bb', 'fg');
    expect(ansi).toBe('\x1b[38;2;57;197;187m');
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
    expect(ansi).toBe('\x1b[1m\x1b[3m\x1b[38;2;57;197;187m');
  });

  it('passes through raw ANSI', () => {
    const ansi = compileColorSpec('\x1b[36m', 'fg');
    expect(ansi).toBe('\x1b[36m');
  });

  it('applies styles with derived foreground for bg role', () => {
    const ansi = compileColorSpec('bi[#808080]', 'bg');
    expect(ansi).toBe('\x1b[1m\x1b[3m\x1b[48;2;128;128;128m');
  });
});

describe('compileTheme', () => {
  it('compiles all color fields in a theme', () => {
    const theme = {
      ...builtInThemes.default,
      colors: {
        model: '#39c5bb',
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
        context: { fgColor: '#4caf50', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota5h: { fgColor: '#ff9800', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota24h: { fgColor: '#2196f3', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota7d: { fgColor: '#e91e63', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota30d: { fgColor: '#00bcd4', bgColor: '[#000000]', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      },
      icons: builtInThemes.default.icons,
      layout: builtInThemes.default.layout,
    };
    const compiled = compileTheme(theme);
    for (const key of Object.keys(theme.colors)) {
      expect(compiled.colors[key as keyof typeof compiled.colors]).toContain('\x1b[38;2;');
    }
    for (const key of Object.keys(theme.bars)) {
      expect(compiled.bars[key as keyof typeof compiled.bars].fgColor).toContain('\x1b[38;2;');
      expect(compiled.bars[key as keyof typeof compiled.bars].bgColor).toContain('\x1b[48;2;');
    }
  });

  it('passes through raw ANSI codes', () => {
    const theme = {
      ...builtInThemes.default,
      colors: {
        model: '\x1b[36m',
        label: '\x1b[90m',
        warning: '\x1b[33m',
        error: '\x1b[31m',
        dim: '\x1b[90m',
        toolActive: '\x1b[33m',
        toolDone: '\x1b[32m',
        agentRunning: '\x1b[36m',
        todoPending: '\x1b[33m',
        todoDone: '\x1b[32m',
        cost: '\x1b[35m',
        gitBranch: '\x1b[34m',
        gitDirty: '\x1b[33m',
      },
      bars: {
        context: { fgColor: '\x1b[32m', bgColor: '\x1b[40m', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota5h: { fgColor: '\x1b[33m', bgColor: '\x1b[40m', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota24h: { fgColor: '\x1b[34m', bgColor: '\x1b[40m', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota7d: { fgColor: '\x1b[35m', bgColor: '\x1b[40m', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
        quota30d: { fgColor: '\x1b[36m', bgColor: '\x1b[40m', animation: { enabled: false, mode: 'on-change' as const, type: 'none' as const, triggerThreshold: 5 } },
      },
      icons: builtInThemes.default.icons,
      layout: builtInThemes.default.layout,
    };
    const compiled = compileTheme(theme);
    expect(compiled.colors.model).toBe('\x1b[36m');
    expect(compiled.bars.context.fgColor).toBe('\x1b[32m');
    expect(compiled.bars.context.bgColor).toBe('\x1b[40m');
  });
});
