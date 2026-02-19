import { boundType, getBounds } from './getBounds';
import * as Y from 'yjs';

export function getCompoundBounds(
  elementIds: string[],
  yElementMap: Y.Map<Y.Map<unknown>>
): boundType | null {
  if (!elementIds || elementIds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const id of elementIds) {
    const el = yElementMap.get(id);
    if (!el || el.get('isDeleted')) continue;
    const b = getBounds({ element: el });
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
    count++;
  }

  if (count === 0 || !isFinite(minX) || !isFinite(minY)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function isRectIntersecting(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}
