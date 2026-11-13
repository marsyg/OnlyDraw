import { elementType } from '@/types/type';

export type DraftRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const sign = (value: number) => (value < 0 ? -1 : 1);

/**
 * Constrains a box-shaped draft (rectangle / ellipse).
 *
 * - `square` locks width and height to the same magnitude.
 * - `fromCenter` grows the box symmetrically around the anchor point.
 */
export function constrainBoxDraft(
  start: readonly [number, number],
  current: readonly [number, number],
  square = false,
  fromCenter = false
): DraftRect {
  const [startX, startY] = start;
  let dx = current[0] - startX;
  let dy = current[1] - startY;

  if (square) {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    dx = sign(dx || 1) * size;
    dy = sign(dy || 1) * size;
  }

  if (fromCenter) {
    return {
      x: startX - dx,
      y: startY - dy,
      width: dx * 2,
      height: dy * 2,
    };
  }

  return { x: startX, y: startY, width: dx, height: dy };
}

/**
 * Constrains a line / arrow draft to 45 degree increments when `snapAngle` is on.
 * The anchor point always stays at the pointer-down position.
 */
export function constrainLineDraft(
  start: readonly [number, number],
  current: readonly [number, number],
  snapAngle = false
): DraftRect {
  const [startX, startY] = start;
  let dx = current[0] - startX;
  let dy = current[1] - startY;

  if (snapAngle) {
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const step = Math.PI / 4;
      const angle = Math.round(Math.atan2(dy, dx) / step) * step;
      dx = Math.cos(angle) * length;
      dy = Math.sin(angle) * length;
    }
  }

  return { x: startX, y: startY, width: dx, height: dy };
}

/**
 * Sensible shape to drop when the user clicks (without dragging) with a shape tool.
 * Keeps the result centered on the click where it makes sense.
 */
export function getTapDraft(
  type: elementType,
  point: readonly [number, number]
): DraftRect | null {
  const [x, y] = point;

  switch (type) {
    case elementType.Rectangle:
      return { x: x - 60, y: y - 40, width: 120, height: 80 };
    case elementType.Diamond:
      return { x: x - 60, y: y - 50, width: 120, height: 100 };
    case elementType.RoundedRect:
      return { x: x - 60, y: y - 40, width: 120, height: 80 };
    case elementType.Ellipse:
      return { x: x - 50, y: y - 50, width: 100, height: 100 };
    case elementType.Line:
    case elementType.Arrow:
    case elementType.ArrowTwoWay:
      return { x, y, width: 120, height: 0 };
    default:
      return null;
  }
}
