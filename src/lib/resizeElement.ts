import { boundType } from './utils/boundsUtility/getBounds';
import * as Y from 'yjs';
import { elementType, PointsFreeHand } from '@/types/type';
import canvasDoc from '@/Store/yjs-store';
type resizeArgs = {
  element: Y.Map<unknown>;
  newBounds: boundType;
  oldBounds: boundType;
  originalPoints?: PointsFreeHand[] | null;
};
import { Point } from 'roughjs/bin/geometry';
const resizeSimpleShape = ({ element, newBounds, oldBounds }: resizeArgs) => {
  element.set('x', newBounds.x);
  element.set('y', newBounds.y);
  element.set('width', newBounds.width);
  element.set('height', newBounds.height);
};

export const resizeFreehand = ({
  element,
  newBounds,
  oldBounds,
  originalPoints,
}: resizeArgs) => {
  const oldElementX = Number(element.get('x'));
  const oldElementY = Number(element.get('y'));
  const points = element.get('points') as Y.Array<Y.Map<number>>;
  const stroke = points
    .toArray()
    .map((p) => [p.get('x') as number, p.get('y') as number, 1]);
  const strokeData = { points: stroke } as { points: Point[] };

  if (!originalPoints || originalPoints.length === 0) {
    console.error('Freehand element has no stroke points to resize.');
    return;
  }

  const Sx = newBounds.width / Math.max(1, oldBounds.width);
  const Sy = newBounds.height / Math.max(1, oldBounds.height);

  const newPoints: PointsFreeHand[] = originalPoints.map(
    ([px, py, pressure]) => {
      const R_primeX = px * Sx;
      const R_primeY = py * Sy;
      return [R_primeX, R_primeY, pressure];
    }
  );

  element.set('x', newBounds.x);
  element.set('y', newBounds.y);
  element.set('width', newBounds.width);
  element.set('height', newBounds.height);

  const newPointsY = new Y.Array<Y.Map<number>>();
  newPoints.forEach(([px, py, pressure]) => {
    const pointMap = new Y.Map<number>();
    pointMap.set('x', px);
    pointMap.set('y', py);
    pointMap.set('pressure', pressure);
    newPointsY.push([pointMap]);
  });

  element.set('points', newPointsY);
};
export const resizeElement = ({
  element,
  newBounds,
  oldBounds,
  originalPoints,
}: resizeArgs) => {
  const type = element.get('type') as unknown as elementType;

  switch (type) {
    case elementType.Rectangle:
    case elementType.Line:
    case elementType.Ellipse: {
      resizeSimpleShape({ element, newBounds, oldBounds });
      break;
    }

    case elementType.Freehand: {
      resizeFreehand({ element, newBounds, oldBounds, originalPoints });
      break;
    }
  }
};
