import { args } from './argumentType';
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
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
};
