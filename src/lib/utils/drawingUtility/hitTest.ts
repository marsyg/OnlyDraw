import { elementType } from '@/types/type';
import { args } from '../../hitTest/argumentType';

import { isInsideRectangle } from '../../hitTest/rectangle';
import { isInsideEllipse } from '../../hitTest/ellipse';
import { isNearLine } from '../../hitTest/line';
import { isNearFreehand } from '../../hitTest/free-hand';
export const isPointInsideElement = ({ point, element }: args): boolean => {
  const type = element.get('type') as unknown as elementType;
  switch (type) {
    case elementType.Rectangle: {
      return isInsideRectangle({ point, element });
    }
    case elementType.Ellipse: {
      return isInsideEllipse({ point, element });
    }
    case elementType.Line: {
      return isNearLine({ point, element });
    }
    case elementType.Freehand: {
      return isNearFreehand(point, element.get('stroke') as any);
    }
    default:
      return false;
  }
};
