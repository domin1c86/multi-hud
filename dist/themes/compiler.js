export function parseColorSpec(spec) {
    let bold = false;
    let italic = false;
    let s = spec;
    while (s.length > 0 && (s[0] === 'b' || s[0] === 'i')) {
        if (s[0] === 'b')
            bold = true;
        if (s[0] === 'i')
            italic = true;
        s = s.slice(1);
    }
    let bg;
    const bgMatch = s.match(/\[#([0-9a-fA-F]{6})\]$/);
    if (bgMatch) {
        bg = '#' + bgMatch[1].toLowerCase();
        s = s.slice(0, -bgMatch[0].length);
    }
    let fg;
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
function parseHex(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        throw new Error(`Invalid hex color: "${hex}"`);
    }
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}
function formatHex(r, g, b) {
    return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
// Derivation ratio: fg / bg = 1.5 (reference pair: #c0c0c0 / #808080)
export function deriveBackground(fg) {
    const { r, g, b } = parseHex(fg);
    return formatHex(Math.round((r * 2) / 3), Math.round((g * 2) / 3), Math.round((b * 2) / 3));
}
export function deriveForeground(bg) {
    const { r, g, b } = parseHex(bg);
    return formatHex(Math.round((r * 3) / 2), Math.round((g * 3) / 2), Math.round((b * 3) / 2));
}
export function compileColorSpec(spec, role) {
    if (spec.startsWith('\x1b[')) {
        return spec;
    }
    const parsed = parseColorSpec(spec);
    let hex;
    if (role === 'fg') {
        hex = parsed.fg ?? deriveForeground(parsed.bg);
    }
    else {
        hex = parsed.bg ?? deriveBackground(parsed.fg);
    }
    const parts = [];
    if (parsed.bold)
        parts.push('\x1b[1m');
    if (parsed.italic)
        parts.push('\x1b[3m');
    const { r, g, b } = parseHex(hex);
    if (role === 'fg') {
        parts.push(`\x1b[38;2;${r};${g};${b}m`);
    }
    else {
        parts.push(`\x1b[48;2;${r};${g};${b}m`);
    }
    return parts.join('');
}
export function compileTheme(theme) {
    const compiled = structuredClone(theme);
    for (const key of Object.keys(compiled.colors)) {
        compiled.colors[key] = compileColorSpec(compiled.colors[key], 'fg');
    }
    for (const barKey of Object.keys(compiled.bars)) {
        compiled.bars[barKey].fgColor = compileColorSpec(compiled.bars[barKey].fgColor, 'fg');
        compiled.bars[barKey].bgColor = compileColorSpec(compiled.bars[barKey].bgColor, 'bg');
    }
    return compiled;
}
