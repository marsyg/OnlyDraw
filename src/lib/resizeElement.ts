import { boundType } from './utils/boundsUtility/getBounds';
import * as Y from 'yjs';
import { elementType } from '@/types/type';
type resizeArgs = {
  element: Y.Map<unknown>;
  newBounds: boundType;
  oldBounds: boundType;
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
}: resizeArgs) => {
  
  const oldElementX = Number(element.get('x'));
  const oldElementY = Number(element.get('y'));
  const strokeData = element.get('stroke') as { points: Point[] } | undefined;

  if (!strokeData || strokeData.points.length === 0) {
    console.error('Freehand element has no stroke points to resize.');
    return;
  }

  const oldPoints = strokeData.points;


  const Sx = newBounds.width / Math.max(1, oldBounds.width);
  const Sy = newBounds.height / Math.max(1, oldBounds.height);

  
  const newPoints = oldPoints.map(([px, py]) => {
    // The point (px, py) is relative to (oldElementX, oldElementY).

    // a. Calculate the point's absolute offset from the OLD BOUNDS origin.
    // This gives us the point's coordinates relative to the bounding box's top-left corner.
    const Rx = oldElementX + px - oldBounds.x;
    const Ry = oldElementY + py - oldBounds.y;

    // b. Apply scaling factors to this relative position.
    const R_primeX = Rx * Sx;
    const R_primeY = Ry * Sy;

    // c. The new point (p_primeX, p_primeY) must be relative to the NEW ELEMENT X/Y.
    // Since we are setting the new element X/Y to newBounds.x/y, the new relative
    // point is simply R_primeX, R_primeY.
    const p_primeX = R_primeX;
    const p_primeY = R_primeY;

    return [p_primeX, p_primeY] as Point;
  });

  // 4. Update the element's properties (using Y.Map for collaborative changes)
  element.set('x', newBounds.x);
  element.set('y', newBounds.y);
  element.set('width', newBounds.width);
  element.set('height', newBounds.height);

  // Update the stroke points
  element.set('stroke', { points: newPoints });
};
export const resizeElement = ({
  element,
  newBounds,
  oldBounds,
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
      resizeFreehand({ element, newBounds, oldBounds });
      break;
    }
  }
};
