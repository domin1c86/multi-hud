import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Per-session animation state for `on-change` mode. The statusline subprocess is
 * stateless, so to animate a bar only when its value jumps we persist the last
 * value (and when it changed) to a small temp file keyed by session id.
 */

/** How long a bar keeps animating after an `on-change` trigger. */
export const ANIM_WINDOW_MS = 1500;

export interface BarState {
  pct: number;
  changedAt: number;
}

export type AnimationState = Record<string, BarState>;

function stateFile(sessionId: string): string {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
  return path.join(os.tmpdir(), `multi-hud-anim-${safe}.json`);
}

export function readAnimationState(sessionId: string): AnimationState {
  try {
    return JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf-8')) as AnimationState;
  } catch {
    return {};
  }
}

export function writeAnimationState(sessionId: string, state: AnimationState): void {
  try {
    fs.writeFileSync(stateFile(sessionId), JSON.stringify(state));
  } catch {
    // Best-effort — a read-only temp dir must never crash the statusline.
  }
}

/**
 * Pure `on-change` decision: given the prior state for a bar and its current
 * percentage, report whether it is actively animating (its value changed by at
 * least `threshold` within the window) and the state entry to persist next.
 */
export function resolveOnChange(
  prev: BarState | undefined,
  pct: number,
  threshold: number,
  now: number,
): { active: boolean; next: BarState } {
  const changed = !prev || Math.abs(pct - prev.pct) >= threshold;
  const changedAt = changed ? now : prev.changedAt;
  return { active: now - changedAt < ANIM_WINDOW_MS, next: { pct, changedAt } };
}
