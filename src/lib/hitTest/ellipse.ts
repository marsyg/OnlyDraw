import { args } from './argumentType';
export const isInsideEllipse = ({ point, element }: args) => {
  const x = point[0];
  const y = point[1];
  const dx = x - (element.x + element.width / 2);
  const dy = y - (element.y + element.height / 2);
  return (
    dx ** 2 / (element.width / 2) ** 2 + dy ** 2 / (element.height / 2) ** 2 <=
    1
  );
};
