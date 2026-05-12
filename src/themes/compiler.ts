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
