import { args } from './argumentType';


export function isNearLine({point , element} : args) {
    const x = point[0]
    const y = point[1]
    const threshold = 5 
  const { x: x1, y: y1, width, height } = element;
  const x2 = x1 + width;
  const y2 = y1 + height;
  const distance =
    Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) /
    Math.hypot(y2 - y1, x2 - x1);
  return distance <= threshold;
}
