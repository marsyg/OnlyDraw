import { args } from './argumentType';
export const isInsideEllipse = ({ point, element }: args) => {
  console.log('checking if inside ellipse ');
  console.log(element.toJSON());
  const x = point[0];
  const y = point[1];
  const dx = x - (Number(element.get('x')) + Number(element.get('width')) / 2);
  const dy = y - (Number(element.get('y')) + Number(element.get('height')) / 2);
  return (
    dx ** 2 / (Number(element.get('width')) / 2) ** 2 +
      dy ** 2 / (Number(element.get('height')) / 2) ** 2 <=
    1
  );
};
