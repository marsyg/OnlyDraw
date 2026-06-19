import { args } from './argumentType';
import * as Y from 'yjs';
import canvasDoc from '@/Store/yjs-store';
import { getBindingPosition, SnapLocation } from '@/lib/arrowSnap';
import { getArrowLabelBounds } from '@/lib/utils/arrowLabel';

export function isNearLine({ point, element }: args) {
  const px = point[0];
  const py = point[1];
  const threshold = 8;
  let x1 = Number(element.get('x'));
  let y1 = Number(element.get('y'));
  let x2 = x1 + Number(element.get('width'));
  let y2 = y1 + Number(element.get('height'));

  const type = element.get('type') as string;
  if (type === 'arrow' || type === 'arrow-two-way') {
    const startBinding = element.get('startBinding') as { elementId: string; point: SnapLocation } | undefined;
    const endBinding = element.get('endBinding') as { elementId: string; point: SnapLocation } | undefined;
    const parentMap = (element.parent as Y.Map<Y.Map<unknown>> | undefined) || canvasDoc.yElement;
    if (parentMap) {
      if (startBinding) {
        const sp = getBindingPosition(startBinding, parentMap);
        if (sp) {
          x1 = sp[0];
          y1 = sp[1];
        }
      }
      if (endBinding) {
        const ep = getBindingPosition(endBinding, parentMap);
        if (ep) {
          x2 = ep[0];
          y2 = ep[1];
        }
      }
    }

    const labelBounds = getArrowLabelBounds(element, parentMap);
    if (labelBounds) {
      if (
        px >= labelBounds.x - 4 &&
        px <= labelBounds.x + labelBounds.width + 4 &&
        py >= labelBounds.y - 4 &&
        py <= labelBounds.y + labelBounds.height + 4
      ) {
        return true;
      }
    }
  }

  const rawControl = element.get('controlPoint') as { x: number; y: number } | undefined;
  const routing = String(element.get('routing') || (rawControl ? 'curved' : 'straight'));

  if (routing === 'curved' || rawControl) {
    const cx = rawControl ? rawControl.x : (x1 + x2) / 2;
    const cy = rawControl ? rawControl.y : (y1 + y2) / 2;
    if (Math.hypot(px - cx, py - cy) <= threshold + 4) return true;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const inv = 1 - t;
      const qx = inv * inv * x1 + 2 * inv * t * cx + t * t * x2;
      const qy = inv * inv * y1 + 2 * inv * t * cy + t * t * y2;
      if (Math.hypot(px - qx, py - qy) <= threshold) return true;
    }
    return false;
  }

  if (routing === 'angled') {
    const midX = (x1 + x2) / 2;
    const segs: [[number, number], [number, number]][] = [
      [[x1, y1], [midX, y1]],
      [[midX, y1], [midX, y2]],
      [[midX, y2], [x2, y2]],
    ];
    for (const [[sx1, sy1], [sx2, sy2]] of segs) {
      const sdx = sx2 - sx1;
      const sdy = sy2 - sy1;
      const slenSq = sdx * sdx + sdy * sdy;
      if (slenSq === 0) {
        if (Math.hypot(px - sx1, py - sy1) <= threshold) return true;
        continue;
      }
      const st = Math.max(0, Math.min(1, ((px - sx1) * sdx + (py - sy1) * sdy) / slenSq));
      if (Math.hypot(px - (sx1 + st * sdx), py - (sy1 + st * sdy)) <= threshold) return true;
    }
    return false;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1) <= threshold;
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const dist = Math.hypot(px - projX, py - projY);
  return dist <= threshold;
}

