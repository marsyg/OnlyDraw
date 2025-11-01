import { args } from './argumentType';


export function isNearLine({point , element} : args) {
    const x = point[0]
    const y = point[1]
    const threshold = 5 
    const x1 = Number(element.get('x'));
    const y1 = Number(element.get('y'));
    const width = Number(element.get('width'));
    const height = Number(element.get('height'));
  
  const x2 = x1 + width;
  const y2 = y1 + height;
  const distance =
    Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) /
    Math.hypot(y2 - y1, x2 - x1);
  return distance <= threshold;
}
