import { args } from './argumentType';
export const isInsideRectangle = ({ point, element }: args) => {
  const x = point[0];
  const y = point[1];
  return (
    x >= element.x &&
    x <= element.x + element.width &&
    y >= element.y &&
    y <= element.y + element.height
  );
};
