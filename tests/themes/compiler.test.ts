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
