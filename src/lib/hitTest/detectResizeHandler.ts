import { point } from '@/types/type';
import { boundType } from '../utils/boundsUtility/getBounds';

export const BOUNDS_PADDING = 8;

export type args = {
  point: point;
  element: boundType;
  tolerance: number;
};

export type ResizeHandleInfo = {
  direction: string;
  cursor: string;
};

function detectResizeHandle({ point, element, tolerance }: args): ResizeHandleInfo | null {
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

  const corners: Record<string, { x: number; y: number; cursor: string }> = {
    nw: { x: boxX, y: boxY, cursor: 'nwse-resize' },
    ne: { x: boxX + boxWidth, y: boxY, cursor: 'nesw-resize' },
    sw: { x: boxX, y: boxY + boxHeight, cursor: 'nesw-resize' },
    se: { x: boxX + boxWidth, y: boxY + boxHeight, cursor: 'nwse-resize' },
  };

  const sides: Record<string, { x: number; y: number; cursor: string }> = {
    n: { x: boxX + boxWidth / 2, y: boxY, cursor: 'ns-resize' },
    s: { x: boxX + boxWidth / 2, y: boxY + boxHeight, cursor: 'ns-resize' },
    e: { x: boxX + boxWidth, y: boxY + boxHeight / 2, cursor: 'ew-resize' },
    w: { x: boxX, y: boxY + boxHeight / 2, cursor: 'ew-resize' },
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
