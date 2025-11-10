
import { point } from '@/types/type';
import { boundType } from '../utils/boundsUtility/getBounds';

const BOUNDS_PADDING = 8; 

export type args = {
  point: point;
  element: boundType;
  tolerance: number;
};
function detectResizeHandle({ point, element, tolerance }: args) {
  const pointerX = point[0];
  const pointerY = point[1];
  const x = element.x;
  const y = element.y;
  const w = element.width;
  const h = element.height;

  
  const boxX = x - BOUNDS_PADDING;
  const boxY = y - BOUNDS_PADDING;
  const boxWidth = w + BOUNDS_PADDING * 2;
  const boxHeight = h + BOUNDS_PADDING * 2;

 
  const corners = {
    nw: { x: boxX, y: boxY, cursor: 'nw-resize' },
    ne: { x: boxX + boxWidth, y: boxY, cursor: 'ne-resize' },
    sw: { x: boxX, y: boxY + boxHeight, cursor: 'sw-resize' },
    se: { x: boxX + boxWidth, y: boxY + boxHeight, cursor: 'se-resize' },
  };

  const sides = {
    n: { x: boxX + boxWidth / 2, y: boxY, cursor: 'n-resize' },
    s: { x: boxX + boxWidth / 2, y: boxY + boxHeight, cursor: 's-resize' },
    e: { x: boxX + boxWidth, y: boxY + boxHeight / 2, cursor: 'e-resize' },
    w: { x: boxX, y: boxY + boxHeight / 2, cursor: 'w-resize' },
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
