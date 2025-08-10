import { OnlyDrawElement } from '@/types/type';
import { Point } from 'roughjs/bin/geometry';
type args = {
  initialPosition: Point;
  currentPosition: Point;
  element: OnlyDrawElement;
};
export const DragElements = ({
  initialPosition,
  currentPosition,
  element,
}: args): OnlyDrawElement => {
  const id = element.id;
  console.log(initialPosition);
  console.log('for offsetX ', element.x, initialPosition[0]);
  const offsetX = initialPosition[0] - element.x;
  console.log(' offsetX calculated  ', offsetX);
  console.log('======');
  console.log('for offsety ', element.y, initialPosition[1]);

  const offsetY = initialPosition[1] - element.y;
  console.log(' offsetY calculated  ', offsetY);
  const x = currentPosition[0] - offsetX;
  const y = currentPosition[1] - offsetY;
  console.log(x, y, 'these are the coordinate ');
  const updatedElement: OnlyDrawElement = {
    ...element,
    x: x,
    y: y,
  };
  return updatedElement;
};
