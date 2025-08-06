
import { point, Stroke } from '@/types/type';


/**
 * Checks if a point is near a freehand stroke (polyline).
 * @param x Clicked X
 * @param y Clicked Y
 * @param stroke The stroke array of points
 * @param threshold How close the point must be to count as a hit
 */
export function isNearFreehand(
  point : point,
  argStroke: Stroke,
  threshold = 5
): boolean {
    const x  = point[0]
    const y = point[1]
    const stroke = argStroke.points
  for (let i = 0; i < stroke.length - 1; i++) {
    const [x1, y1] = stroke[i];
    const [x2, y2] = stroke[i + 1];
    if (isNearLineSegment(x, y, x1, y1, x2, y2, threshold)) {
      return true;
    }
  }
  return false;
}

// Helper function to check if point is near line segment
function isNearLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // Line segment is a point
    const dist = Math.hypot(px - x1, py - y1);
    return dist <= threshold;
  }

  // Project point onto line, clamp t to [0, 1] to stay on segment
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))
  );

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const dist = Math.hypot(px - closestX, py - closestY);

  return dist <= threshold;
}
