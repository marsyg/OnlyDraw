import { args } from './argumentType';
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
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};
