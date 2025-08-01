import { actionType, elementType, point, OnlyDrawElement , Stroke } from '@/types/type';
type DrawArgs = {
  action: actionType;
  element: elementType |null;
  startPoint: point;
  endPoint: point;
  stroke?: Stroke
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
        id: Date.now(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        type: elementType.Rectangle,
      };
    case elementType.line:
      return {
        id: Date.now(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        type: elementType.line,
      };
    case elementType.ellipse:
      return {
        id: Date.now(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        type: elementType.ellipse,
      };
    case elementType.freehand:
      if(!stroke)return null
      return {
        id: Date.now(),
        x: startPoint[0],
        y: startPoint[1],
        width: endPoint[0] - startPoint[0],
        height: endPoint[1] - startPoint[1],
        isDeleted: false,
        stroke: stroke,
        type: elementType.freehand,
      };
    default:
      return null;
  }
};
