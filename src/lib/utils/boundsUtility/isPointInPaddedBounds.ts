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

  const padding = bounds.padding !== undefined ? bounds.padding : BOUNDS_PADDING;
  const boxX = x - padding;
  const boxY = y - padding;
  const boxWidth = width + padding * 2;
  const boxHeight = height + padding * 2;

  return (
    px >= boxX &&
    px <= boxX + boxWidth &&
    py >= boxY &&
    py <= boxY + boxHeight
  );
};
