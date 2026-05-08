export function createLaserFrames(
  barWidth: number,
  fillCount: number,
  fgColor: string,
  bgColor: string,
  laserColor: string,
): string[] {
  const frames: string[] = [];
  for (let i = 0; i < barWidth; i++) {
    let bar = '';
    for (let j = 0; j < barWidth; j++) {
      if (j < fillCount) {
        bar += j === i ? `${laserColor}█` : `${fgColor}█`;
      } else {
        bar += `${bgColor}░`;
      }
    }
    frames.push(bar + '[0m');
  }
  return frames;
}
