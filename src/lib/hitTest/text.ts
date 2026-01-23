import { args } from './argumentType';

export const isInsideText = ({ point, element }: args): boolean => {
  const px = point[0];
  const py = point[1];
  const x = Number(element.get('x'));
  const y = Number(element.get('y'));
  const width = Number(element.get('width')) || 60;
  const height = Number(element.get('height')) || 30;

  const minX = Math.min(x, x + width);
  const maxX = Math.max(x, x + width);
  const minY = Math.min(y, y + height);
  const maxY = Math.max(y, y + height);

  return px >= minX && px <= maxX && py >= minY && py <= maxY;
};
