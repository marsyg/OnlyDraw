import { args } from './argumentType';
export const isInsideRectangle = ({ point, element }: args) => {
  const x = point[0];
  const y = point[1];
  return (
    x >= Number(element.get('x')) &&
    x <= Number(element.get('x')) + Number(element.get('width')) &&
    y >= Number(element.get('y')) &&
    y <= Number(element.get('y')) + Number(element.get('height'))
  );
};
