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
