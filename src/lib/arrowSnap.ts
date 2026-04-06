import * as Y from 'yjs';
import { getBounds } from './utils/boundsUtility/getBounds';
import { getPivotPoint, rotatePoint } from './math/pivot';

export type SnapLocation = 'center' | 'top' | 'bottom' | 'left' | 'right';

export type SnapPoint = {
  elementId: string;
  location: SnapLocation;
  x: number;
  y: number;
};

export type SnapTarget = SnapPoint & {
  allElementSnapPoints: SnapPoint[];
  elementBounds: { x: number; y: number; width: number; height: number };
};

export const SNAP_RADIUS = 28;

export function getElementSnapPoints(element: Y.Map<unknown>): {
  snapPoints: SnapPoint[];
  bounds: { x: number; y: number; width: number; height: number };
} {
  const id = element.get('id') as string;
  const bounds = getBounds({ element });
  const { x, y, width, height } = bounds;
  const angle = Number(element.get('angle')) || 0;
  const axis = String(element.get('rotationAxis') || 'center');
  const pivot = getPivotPoint(bounds, axis);

  const rawPoints: { location: SnapLocation; pt: [number, number] }[] = [
    { location: 'center', pt: [x + width / 2, y + height / 2] },
    { location: 'top', pt: [x + width / 2, y] },
    { location: 'bottom', pt: [x + width / 2, y + height] },
    { location: 'left', pt: [x, y + height / 2] },
    { location: 'right', pt: [x + width, y + height / 2] },
  ];

  const snapPoints: SnapPoint[] = rawPoints.map(({ location, pt }) => {
    let finalPt = pt;
    if (angle !== 0) {
      finalPt = rotatePoint(pt, pivot, angle);
    }
    return {
      elementId: id,
      location,
      x: finalPt[0],
      y: finalPt[1],
    };
  });

  return { snapPoints, bounds };
}

export function findNearestSnapTarget(
  cursorPoint: [number, number],
  yElement: Y.Map<Y.Map<unknown>>,
  excludeId?: string,
  radius: number = SNAP_RADIUS
): SnapTarget | null {
  const [cx, cy] = cursorPoint;
  let closestTarget: SnapTarget | null = null;
  let minDistance = radius;

  yElement.forEach((el, id) => {
    if (excludeId && id === excludeId) return;
    if (el.get('isDeleted')) return;
    const type = el.get('type') as string;
    // Don't snap to freehand or another arrow's bounding box
    if (type === 'freehand' || type === 'arrow' || type === 'arrow-two-way' || type === 'line') {
      return;
    }

    const { snapPoints, bounds } = getElementSnapPoints(el);
    for (const sp of snapPoints) {
      const dist = Math.hypot(sp.x - cx, sp.y - cy);
      if (dist < minDistance) {
        minDistance = dist;
        closestTarget = {
          ...sp,
          allElementSnapPoints: snapPoints,
          elementBounds: bounds,
        };
      }
    }
  });

  return closestTarget;
}

export function getBindingPosition(
  binding: { elementId: string; point: SnapLocation },
  yElement: Y.Map<Y.Map<unknown>>
): [number, number] | null {
  const el = yElement.get(binding.elementId);
  if (!el || el.get('isDeleted')) return null;

  const { snapPoints } = getElementSnapPoints(el);
  const found = snapPoints.find((sp) => sp.location === binding.point);
  return found ? [found.x, found.y] : null;
}

export function drawGhostSnapIndicators(
  ctx: CanvasRenderingContext2D,
  target: SnapTarget | null
) {
  if (!target) return;

  ctx.save();

  // 1. Draw subtle ghost highlight outline around target element bounding box
  const b = target.elementBounds;
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(b.x - 3, b.y - 3, b.width + 6, b.height + 6);

  // 2. Draw all available snap points on this element in ghost mode
  ctx.setLineDash([]);
  target.allElementSnapPoints.forEach((sp) => {
    const isCurrent = sp.location === target.location;
    ctx.beginPath();
    if (isCurrent) {
      // Active snapped target: glowing outer ring + solid center
      ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Faint ghost candidate point
      ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(147, 197, 253, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  ctx.restore();
}
