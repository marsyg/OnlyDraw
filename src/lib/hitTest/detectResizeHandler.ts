import { point } from '@/types/type';
import { boundType } from '../utils/boundsUtility/getBounds';
import { getPivotPoint, unrotatePoint } from '../math/pivot';

export const BOUNDS_PADDING = 8;
export const ROTATION_HANDLE_OFFSET = 24;

export type args = {
  point: point;
  element: boundType & { angle?: number; rotationAxis?: string };
  tolerance: number;
  /** Camera zoom. When provided, padding/handles stay constant on screen. */
  scale?: number;
};

export type ResizeHandleInfo = {
  direction: string;
  cursor: string;
};

function detectResizeHandle({ point, element, tolerance, scale = 1 }: args): ResizeHandleInfo | null {
  const inverseScale = 1 / Math.max(0.05, scale);
  const hitTolerance = tolerance * inverseScale;
  const angle = element.angle || 0;
  let testPoint = point;

  if (angle !== 0) {
    const pivot = getPivotPoint(element, element.rotationAxis || 'center');
    testPoint = unrotatePoint(point, pivot, angle);
  }

  const pointerX = testPoint[0];
  const pointerY = testPoint[1];
  const x = element.x;
  const y = element.y;
  const w = element.width;
  const h = element.height;

  const padding = (element.padding !== undefined ? element.padding : BOUNDS_PADDING) * inverseScale;
  const boxX = x - padding;
  const boxY = y - padding;
  const boxWidth = w + padding * 2;
  const boxHeight = h + padding * 2;

  // Check rotation handle first
  const rotX = boxX + boxWidth / 2;
  const rotY = boxY - ROTATION_HANDLE_OFFSET * inverseScale;
  const rotDx = pointerX - rotX;
  const rotDy = pointerY - rotY;
  if (Math.sqrt(rotDx * rotDx + rotDy * rotDy) <= hitTolerance + 4 * inverseScale) {
    return { direction: 'rotate', cursor: 'grab' };
  }

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
    if (distance <= hitTolerance) {
      return { direction: key, cursor: handle.cursor };
    }
  }

  return null;
}

export default detectResizeHandle;
