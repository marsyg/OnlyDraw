import { elementType } from '@/types/type';
import { args } from '../../hitTest/argumentType';

import { isInsideRectangle } from '../../hitTest/rectangle';
import { isInsideEllipse } from '../../hitTest/ellipse';
import { isNearLine } from '../../hitTest/line';
import { isNearFreehand } from '../../hitTest/free-hand';
import { isInsideText } from '../../hitTest/text';
import { getPivotPoint, unrotatePoint } from '@/lib/math/pivot';

export const isPointInsideElement = ({ point, element }: args): boolean => {
  const angle = Number(element.get('angle')) || 0;
  let testPoint = point;

  if (angle !== 0) {
    const elX = Number(element.get('x'));
    const elY = Number(element.get('y'));
    const elW = Number(element.get('width'));
    const elH = Number(element.get('height'));
    const axis = String(element.get('rotationAxis') || 'center');
    const pivot = getPivotPoint({ x: elX, y: elY, width: elW, height: elH }, axis);
    testPoint = unrotatePoint(point, pivot, angle);
  }

  const type = element.get('type') as unknown as elementType;
  switch (type) {
    case elementType.Rectangle:
    case elementType.Image: {
      return isInsideRectangle({ point: testPoint, element });
    }
    case elementType.Ellipse: {
      return isInsideEllipse({ point: testPoint, element });
    }
    case elementType.Line:
    case elementType.Arrow:
    case elementType.ArrowTwoWay: {
      return isNearLine({ point: testPoint, element });
    }
    case elementType.Freehand: {
      return isNearFreehand({ point: testPoint, element });
    }
    case elementType.Text: {
      return isInsideText({ point: testPoint, element });
    }
    default:
      return false;
  }
};
