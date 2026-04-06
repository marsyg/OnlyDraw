import { args } from './argumentType';
import * as Y from 'yjs';
import canvasDoc from '@/Store/yjs-store';
import { getBindingPosition, SnapLocation } from '@/lib/arrowSnap';

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

