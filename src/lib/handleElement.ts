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
    opacity: options.opacity ?? 1,
    hasShadow: options.hasShadow ?? false,
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

    case elementType.Text:
      return {
        ...baseProperties,
        type: elementType.Text,
        text: options.text ?? '',
        fontSize: options.fontSize ?? 24,
        fontFamily: options.fontFamily ?? 'sans-serif',
        textAlign: options.textAlign ?? 'left',
        fillColor: options.strokeColor || '#000000',
        lineHeight: 1.4,
        width: Math.max(60, Math.abs(endPoint[0] - startPoint[0]) || 120),
        height: Math.max(30, Math.abs(endPoint[1] - startPoint[1]) || 36),
      };

    default:
      return null;
  }
};
