/**
 * Wall-clock frame selection for the stateless statusline subprocess.
 *
 * The status line renders exactly one frame per invocation — there is no animation
 * loop. The current frame is therefore a pure function of the clock, so the effect
 * advances as fast as Claude Code re-invokes the status line.
 */
export function frameIndex(now: number, fps: number, frameCount: number): number {
  if (frameCount <= 0 || fps <= 0) return 0;
  const frameDurationMs = 1000 / fps;
  return Math.floor(now / frameDurationMs) % frameCount;
}
