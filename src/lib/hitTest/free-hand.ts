
import { args } from './argumentType';
import * as Y from 'yjs';


export function isNearFreehand({ point, element }: args): boolean {
  const threshold = 15;
  const x = point[0];
  const y = point[1];
  const originX = element.get('x') as number;
  const originY = element.get('y') as number;
  const points = element.get('points') as Y.Array<Y.Map<number>>;
  const stroke = points
    .toArray()
    .map((p) => [
      (p.get('x') as number) + originX,
      (p.get('y') as number) + originY,
      p.get('pressure') as number,
    ]);

  for (let i = 0; i < stroke.length - 1; i++) {
    const [x1, y1] = stroke[i];
    const [x2, y2] = stroke[i + 1];
    if (isNearLineSegment(x, y, x1, y1, x2, y2, threshold)) {
      return true;
    }
  }
  return false;
}


function isNearLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // Line segment is a point
    const dist = Math.hypot(px - x1, py - y1);
    return dist <= threshold;
  }
  
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))
  );

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const dist = Math.hypot(px - closestX, py - closestY);

  return dist <= threshold;
}
