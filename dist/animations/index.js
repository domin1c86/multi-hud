import { frameIndex } from './frame.js';
import { createPulseFrames } from './pulse.js';
import { createLaserFrames } from './laser.js';
import { parseTruecolorFg, truecolorFg } from './color.js';
/** Frames per second the time-based frame selector advances at. */
const FPS = 8;
/** Number of brightness steps in one pulse cycle. */
const PULSE_FRAMES = 6;
/**
 * Decide how a single bar animates, combining the master switch, the bar's own
 * theme animation, and the global defaults:
 *   - master off        → no animation anywhere (the default),
 *   - bar opts in        → use the bar's own type/mode/threshold,
 *   - otherwise          → fall back to the global defaults, so flipping the one
 *                          master switch animates every bar.
 */
export function resolveBarAnimation(barAnim, global) {
    if (!global.enabled)
        return null;
    if (barAnim.enabled && barAnim.type !== 'none') {
        return { type: barAnim.type, mode: barAnim.mode, triggerThreshold: barAnim.triggerThreshold };
    }
    if (global.defaultType === 'none')
        return null;
    return { type: global.defaultType, mode: global.defaultMode, triggerThreshold: global.triggerThreshold };
}
/** Render a progress bar for the current time frame using the given effect. */
export function animateBar(percentage, fg, bg, width, type, now) {
    const filled = Math.min(width, Math.round((percentage / 100) * width));
    const empty = width - filled;
    if (type === 'laser' && filled > 0) {
        const frames = createLaserFrames(width, filled, fg, bg, laserHighlight(fg));
        // Sweep the highlight only across the filled cells so it never stalls.
        const frame = frames[frameIndex(now, FPS, filled)];
        if (frame)
            return frame;
    }
    // Pulse (also the fallback when a laser has nothing to sweep): modulate fill brightness.
    const frames = createPulseFrames(fg, PULSE_FRAMES);
    const pulsedFg = frames[frameIndex(now, FPS, frames.length)] ?? fg;
    return `${pulsedFg}${'█'.repeat(filled)}${bg}${'░'.repeat(empty)}\x1b[0m`;
}
/** A brightened, still-tinted variant of the fill color for the laser highlight. */
function laserHighlight(fg) {
    const parsed = parseTruecolorFg(fg);
    if (!parsed)
        return '\x1b[38;2;255;255;255m';
    const up = (n) => n * 1.7 + 40;
    return truecolorFg('', up(parsed.r), up(parsed.g), up(parsed.b));
}
