import { Theme } from '../types/index.js';

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
    s = s.slice(fgMatch[0].length);
  }

  if (!fg && !bg) {
    throw new Error(`Invalid color spec: "${spec}"`);
  }

  if (s.length > 0) {
    throw new Error(`Invalid color spec: "${spec}" (unexpected: "${s}")`);
  }

  return { fg, bg, bold, italic };
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function formatHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
    .join('');
}

export function deriveBackground(fg: string): string {
  const { r, g, b } = parseHex(fg);
  return formatHex(
    Math.round(r * 2 / 3),
    Math.round(g * 2 / 3),
    Math.round(b * 2 / 3),
  );
}

export function deriveForeground(bg: string): string {
  const { r, g, b } = parseHex(bg);
  return formatHex(
    Math.round(r * 3 / 2),
    Math.round(g * 3 / 2),
    Math.round(b * 3 / 2),
  );
}

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

  const { r, g, b } = parseHex(hex);

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
