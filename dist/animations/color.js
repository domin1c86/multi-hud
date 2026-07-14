/**
 * Helpers for manipulating the already-compiled truecolor foreground escapes that
 * the renderer works with (e.g. `\x1b[1m\x1b[38;2;57;197;187m`). Animations need to
 * read the RGB back out of a compiled color and re-emit a modulated variant while
 * preserving any bold/italic prefix.
 */
const ESC = String.fromCharCode(27);
// Built via RegExp (not a literal) so the ESC control char doesn't trip no-control-regex.
const TRUECOLOR_FG = new RegExp(`${ESC}\\[38;2;(\\d+);(\\d+);(\\d+)m`);
/** Parse the RGB (and any leading attribute prefix) out of a compiled fg escape. */
export function parseTruecolorFg(escape) {
    const m = escape.match(TRUECOLOR_FG);
    if (!m || m.index === undefined)
        return null;
    return { prefix: escape.slice(0, m.index), r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}
/** Re-emit a compiled truecolor fg escape, clamping channels to [0, 255]. */
export function truecolorFg(prefix, r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n)));
    return `${prefix}\x1b[38;2;${c(r)};${c(g)};${c(b)}m`;
}
