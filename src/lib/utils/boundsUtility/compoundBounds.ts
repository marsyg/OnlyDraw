import { boundType, getBounds } from './getBounds';
import * as Y from 'yjs';
import { getBindingPosition, SnapLocation } from '@/lib/arrowSnap';

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

function segmentIntersectsSegment(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  r: { x: number; y: number; width: number; height: number }
): boolean {
  // If either endpoint is inside rect
  if (
    (x1 >= r.x && x1 <= r.x + r.width && y1 >= r.y && y1 <= r.y + r.height) ||
    (x2 >= r.x && x2 <= r.x + r.width && y2 >= r.y && y2 <= r.y + r.height)
  ) {
    return true;
  }
  // Check against 4 edges of rect
  const rx2 = r.x + r.width;
  const ry2 = r.y + r.height;
  return (
    segmentIntersectsSegment(x1, y1, x2, y2, r.x, r.y, rx2, r.y) ||
    segmentIntersectsSegment(x1, y1, x2, y2, rx2, r.y, rx2, ry2) ||
    segmentIntersectsSegment(x1, y1, x2, y2, rx2, ry2, r.x, ry2) ||
    segmentIntersectsSegment(x1, y1, x2, y2, r.x, ry2, r.x, r.y)
  );
}

export function isElementIntersectingBox(
  element: Y.Map<unknown>,
  box: { x: number; y: number; width: number; height: number },
  yElementMap?: Y.Map<Y.Map<unknown>>
): boolean {
  const b = getBounds({ element });
  if (!b || !isRectIntersecting(box, b)) return false;

  // If the element's bounding box is fully enclosed inside the marquee box, always select
  if (
    b.x >= box.x &&
    b.y >= box.y &&
    b.x + b.width <= box.x + box.width &&
    b.y + b.height <= box.y + box.height
  ) {
    return true;
  }

  const type = element.get('type') as string;

  if (type === 'line' || type === 'arrow' || type === 'arrow-two-way') {
    let x1 = Number(element.get('x'));
    let y1 = Number(element.get('y'));
    let x2 = x1 + Number(element.get('width'));
    let y2 = y1 + Number(element.get('height'));

    if (yElementMap && (type === 'arrow' || type === 'arrow-two-way')) {
      const startBinding = element.get('startBinding') as { elementId: string; point: SnapLocation } | undefined;
      const endBinding = element.get('endBinding') as { elementId: string; point: SnapLocation } | undefined;
      if (startBinding) {
        const sp = getBindingPosition(startBinding, yElementMap);
        if (sp) {
          x1 = sp[0];
          y1 = sp[1];
        }
      }
      if (endBinding) {
        const ep = getBindingPosition(endBinding, yElementMap);
        if (ep) {
          x2 = ep[0];
          y2 = ep[1];
        }
      }
    }

    const rawControl = element.get('controlPoint') as { x: number; y: number } | undefined;
    const routing = String(element.get('routing') || (rawControl ? 'curved' : 'straight'));

    if (routing === 'curved' || rawControl) {
      const cx = rawControl ? rawControl.x : (x1 + x2) / 2;
      const cy = rawControl ? rawControl.y : (y1 + y2) / 2;
      let prevX = x1;
      let prevY = y1;
      for (let i = 1; i <= 10; i++) {
        const t = i / 10;
        const inv = 1 - t;
        const curX = inv * inv * x1 + 2 * inv * t * cx + t * t * x2;
        const curY = inv * inv * y1 + 2 * inv * t * cy + t * t * y2;
        if (segmentIntersectsRect(prevX, prevY, curX, curY, box)) return true;
        prevX = curX;
        prevY = curY;
      }
      return false;
    }

    if (routing === 'angled') {
      const midX = (x1 + x2) / 2;
      return (
        segmentIntersectsRect(x1, y1, midX, y1, box) ||
        segmentIntersectsRect(midX, y1, midX, y2, box) ||
        segmentIntersectsRect(midX, y2, x2, y2, box)
      );
    }

    return segmentIntersectsRect(x1, y1, x2, y2, box);
  }

  if (type === 'freehand') {
    const originX = Number(element.get('x'));
    const originY = Number(element.get('y'));
    const strokeData = element.get('points') as Y.Array<Y.Map<number>> | undefined;
    if (!strokeData) return false;
    const pts = strokeData.toArray();
    for (let i = 0; i < pts.length; i++) {
      const px = Number(pts[i].get('x')) + originX;
      const py = Number(pts[i].get('y')) + originY;
      if (px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height) {
        return true;
      }
      if (i > 0) {
        const prevX = Number(pts[i - 1].get('x')) + originX;
        const prevY = Number(pts[i - 1].get('y')) + originY;
        if (segmentIntersectsRect(prevX, prevY, px, py, box)) return true;
      }
    }
    return false;
  }

  // Rectangles, text, ellipses, images: AABB intersection
  return isRectIntersecting(box, b);
}
