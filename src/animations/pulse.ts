export function createPulseFrames(baseColor: string, frameCount: number): string[] {
  const codes = [2, 3, 4, 5, 4, 3];
  return codes.slice(0, frameCount).map((b) => `[${b}m`);
}
