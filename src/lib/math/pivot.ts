export type RotationAxis =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export function getPivotPoint(
  rect: { x: number; y: number; width: number; height: number },
  axis: RotationAxis | string = 'center'
): [number, number] {
  const { x, y, width, height } = rect;

  switch (axis) {
    case 'top-left':
      return [x, y];
    case 'top-right':
      return [x + width, y];
    case 'bottom-left':
      return [x, y + height];
    case 'bottom-right':
      return [x + width, y + height];
    case 'center':
    default:
      return [x + width / 2, y + height / 2];
  }
}

export function rotatePoint(
  p: [number, number],
  pivot: [number, number],
  angle: number
): [number, number] {
  if (!angle) return [p[0], p[1]];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p[0] - pivot[0];
  const dy = p[1] - pivot[1];
  return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
}

export function unrotatePoint(
  p: [number, number],
  pivot: [number, number],
  angle: number
): [number, number] {
  return rotatePoint(p, pivot, -angle);
}
