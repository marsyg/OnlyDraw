import { args } from './argumentType';

const isShapeUnfilled = (element: args['element']): boolean => {
  if (element.get('isFillTransparent') === true) return true;
  return element.get('fillColor') === 'transparent';
};

const hitTolerance = (element: args['element']): number => {
  const strokeWidth = Number(element.get('strokeWidth')) || 1;
  return Math.max(6, strokeWidth * 1.5 + 4);
};

export const isInsideRectangle = ({ point, element }: args) => {
  const x = point[0];
  const y = point[1];
  const elX = Number(element.get('x'));
  const elY = Number(element.get('y'));
  const elW = Number(element.get('width'));
  const elH = Number(element.get('height'));
  const minX = Math.min(elX, elX + elW);
  const maxX = Math.max(elX, elX + elW);
  const minY = Math.min(elY, elY + elH);
  const maxY = Math.max(elY, elY + elH);

  if (!isShapeUnfilled(element)) {
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  // Unfilled shapes are only selectable near their outline so that clicks
  // inside them fall through to whatever is behind.
  const tolerance = hitTolerance(element);
  const withinX = x >= minX - tolerance && x <= maxX + tolerance;
  const withinY = y >= minY - tolerance && y <= maxY + tolerance;
  const nearVerticalEdge =
    withinY &&
    (Math.abs(x - minX) <= tolerance || Math.abs(x - maxX) <= tolerance);
  const nearHorizontalEdge =
    withinX &&
    (Math.abs(y - minY) <= tolerance || Math.abs(y - maxY) <= tolerance);

  return nearVerticalEdge || nearHorizontalEdge;
};
