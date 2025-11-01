import {
  actionType,
  elementType,
  point,
  OnlyDrawElement,
  Stroke,
} from '@/types/type';
import { nanoid } from 'nanoid';
type DrawArgs = {
  action: actionType;
  element: elementType | null;
  startPoint: point;
  endPoint: point;
  stroke?: Stroke;
};
export const handleDrawElement = ({
  action,
  element,
  startPoint,
  endPoint,
  stroke,
}: DrawArgs): OnlyDrawElement | null => {
  if (action !== actionType.Drawing) return null;
  switch (element) {
    case elementType.Rectangle:
      return {
        id: nanoid(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        type: elementType.Rectangle,
      };
    case elementType.Line:
      return {
        id:nanoid(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        type: elementType.Line,
      };
    case elementType.Ellipse:
      return {
        id:nanoid(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        type: elementType.Ellipse,
      };
    case elementType.Freehand:
      if (!stroke) return null;
      return {
        id:nanoid(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        stroke: stroke,
        type: elementType.Freehand,
      };
    default:
      return null;
  }
};
