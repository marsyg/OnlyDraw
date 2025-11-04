import * as Y from 'yjs';
import { point } from '@/types/type';
export type args = {
  point: point;
  element: Y.Map<unknown>;
  tolerance: number;
};
function detectResizeHandle({ point, element, tolerance }: args) {
  const pointerX = point[0];
  const pointerY = point[1];
  const x = element.get('x') as number;
  const y = element.get('y') as number;
  const w = element.get('width') as number;
  const h = element.get('height') as number;

  const corners = {
    nw: { x, y, cursor: 'nw-resize' },
    ne: { x: x + w, y, cursor: 'ne-resize' },
    sw: { x, y: y + h, cursor: 'sw-resize' },
    se: { x: x + w, y: y + h, cursor: 'se-resize' },
  };

  const sides = {
    n: { x: x + w / 2, y, cursor: 'n-resize' },
    s: { x: x + w / 2, y: y + h, cursor: 's-resize' },
    e: { x: x + w, y: y + h / 2, cursor: 'e-resize' },
    w: { x, y: y + h / 2, cursor: 'w-resize' },
  };

  const allHandles = { ...corners, ...sides };

  for (const [key, handle] of Object.entries(allHandles)) {
    const dx = pointerX - handle.x;
    const dy = pointerY - handle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= tolerance) {
      return { direction: key, cursor: handle.cursor };
    }
  }

  return null;
}
export default detectResizeHandle;
