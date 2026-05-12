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
