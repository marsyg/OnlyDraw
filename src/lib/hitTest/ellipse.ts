import { args } from './argumentType';

const isShapeUnfilled = (element: args['element']): boolean => {
  if (element.get('isFillTransparent') === true) return true;
  return element.get('fillColor') === 'transparent';
};

const hitTolerance = (element: args['element']): number => {
  const strokeWidth = Number(element.get('strokeWidth')) || 1;
  return Math.max(6, strokeWidth * 1.5 + 4);
};

export const isInsideEllipse = ({ point, element }: args) => {
  const x = point[0];
  const y = point[1];
  const elX = Number(element.get('x'));
  const elY = Number(element.get('y'));
  const elW = Number(element.get('width'));
  const elH = Number(element.get('height'));
  const rx = Math.abs(elW) / 2;
  const ry = Math.abs(elH) / 2;
  if (rx <= 0 || ry <= 0) {
    return Math.hypot(x - elX, y - elY) <= 8;
  }
  const cx = elX + elW / 2;
  const cy = elY + elH / 2;
  const dx = x - cx;
  const dy = y - cy;

  if (!isShapeUnfilled(element)) {
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  // Unfilled ellipses are only selectable near their outline.
  const angle = Math.atan2(dy / ry, dx / rx);
  const edgeX = rx * Math.cos(angle);
  const edgeY = ry * Math.sin(angle);
  return Math.hypot(dx - edgeX, dy - edgeY) <= hitTolerance(element);
};
