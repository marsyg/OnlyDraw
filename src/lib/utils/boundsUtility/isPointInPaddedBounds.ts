import { point } from '@/types/type';
import { boundType } from './getBounds';

const BOUNDS_PADDING = 6; // Same as in drawBounds.ts

export const isPointInPaddedBounds = (
  point: point,
  bounds: boundType
): boolean => {
  const [px, py] = point;
  const { x, y, width, height } = bounds;
  
  // Calculate padded bounding box (same as in drawBounds.ts)
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

