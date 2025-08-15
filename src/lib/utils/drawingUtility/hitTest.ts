import { elementType } from '@/types/type';
import { args } from '../../hitTest/argumentType';

import { isInsideRectangle } from '../../hitTest/rectangle';
import { isInsideEllipse } from '../../hitTest/ellipse';
import { isNearLine } from '../../hitTest/line';
import { isNearFreehand } from '../../hitTest/free-hand';
export const isPointInsideElement = ({ point, element }: args): boolean => {
  switch (element.type) {
    case elementType.Rectangle: {
      return isInsideRectangle({ point, element });
    }
    case elementType.ellipse: {
      return isInsideEllipse({ point, element });
    }
    case elementType.line: {
      return isNearLine({ point, element });
    }
    case elementType.freehand: {
      if (element.type === elementType.freehand) {
        return isNearFreehand(point, element.stroke);
      }
    }
    default:
      return false;
  }
};
