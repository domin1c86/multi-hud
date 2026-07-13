export function createLaserFrames(barWidth, fillCount, fgColor, bgColor, laserColor) {
    const frames = [];
    for (let i = 0; i < barWidth; i++) {
        let bar = '';
        for (let j = 0; j < barWidth; j++) {
            if (j < fillCount) {
                bar += j === i ? `${laserColor}█` : `${fgColor}█`;
            }
            else {
                bar += `${bgColor}░`;
            }
        }
        frames.push(bar + '[0m');
    }
    return frames;
}
