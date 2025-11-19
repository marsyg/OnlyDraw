import {
  actionType,
  elementType,
  point,
  OnlyDrawElement,
  Stroke,
} from '@/types/type';
import { nanoid } from 'nanoid';

import { ElementOptions } from '@/types/type';
type DrawArgs = {
  action: actionType;
  options: ElementOptions;
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
  options,
  stroke,
}: DrawArgs): OnlyDrawElement | null => {
  if (action !== actionType.Drawing) return null;
  const seed = Math.floor(Math.random() * 2 ** 31).toString();
  const baseProperties = {
    id: nanoid(),
    x: startPoint[0],
    y: startPoint[1],
    width: endPoint[0] - startPoint[0],
    height: endPoint[1] - startPoint[1],
    isDeleted: false,
    seed: seed,
    strokeColor: options.strokeColor,
    strokeWidth: options.strokeWidth,
    roughness: options.roughness,
  };
  switch (element) {
    case elementType.Rectangle:
      return {
        ...baseProperties,
        type: elementType.Rectangle,
        fillColor: options.fillColor,
        fillStyle: options.fillStyle,
        fillWeight: options.fillWeight,
        boundaryStyle: options.boundaryStyle,
      };

    case elementType.Line:
      return {
        ...baseProperties,
        type: elementType.Line,
        boundaryStyle: options.boundaryStyle,
      };

    case elementType.Ellipse:
      return {
        ...baseProperties,
        type: elementType.Ellipse,
        fillColor: options.fillColor,
        fillStyle: options.fillStyle,
        fillWeight: options.fillWeight,
        boundaryStyle: options.boundaryStyle,
      };

    case elementType.Freehand:
      if (!stroke) return null;
      return {
        ...baseProperties,
        type: elementType.Freehand,
        stroke: stroke,
      };

    default:
      return null;
  }
};
