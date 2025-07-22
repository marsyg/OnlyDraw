import { point, Rectangle } from '@/types/type';

 export function pointFrom<Point extends point>(
  x: number,
  y: number,
): Point {
  return [x, y] as Point;
}

export function pointDistance<P extends point>(
  a: P,
  b: P,
): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function pointCenter<P extends point>(a: P, b: P): P {
  return pointFrom((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
}
export function pointDistanceSq<P extends point>(
  a: P,
  b: P,
): number {
  const xDiff = b[0] - a[0];
  const yDiff = b[1] - a[1];

  return xDiff * xDiff + yDiff * yDiff;
}
export function rectangle<P extends point>(
  topLeft: P,
  bottomRight: P,
): Rectangle<P> {
  return [topLeft, bottomRight] as Rectangle<P>;
}
