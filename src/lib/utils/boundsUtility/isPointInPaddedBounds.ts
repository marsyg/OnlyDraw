import { point } from '@/types/type';
import { boundType } from './getBounds';
import { BOUNDS_PADDING } from '../../hitTest/detectResizeHandler';
import { getPivotPoint, unrotatePoint } from '../../math/pivot';

export const isPointInPaddedBounds = (
  point: point,
  bounds: boundType
): boolean => {
  let [px, py] = point;
  const { x, y, width, height, angle } = bounds;

  if (angle && angle !== 0) {
    const pivot = getPivotPoint(bounds, bounds.rotationAxis || 'center');
    const unrotated = unrotatePoint(point, pivot, angle);
    px = unrotated[0];
    py = unrotated[1];
  }

  const boxX = x - BOUNDS_PADDING;
  const boxY = y - BOUNDS_PADDING;
  const boxWidth = width + BOUNDS_PADDING * 2;
  const boxHeight = height + BOUNDS_PADDING * 2;

  return (
    px >= boxX &&
    px <= boxX + boxWidth &&
    py >= boxY &&
    py <= boxY + boxHeight
  );
};
