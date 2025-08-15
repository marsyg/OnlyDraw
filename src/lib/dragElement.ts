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

  const offsetX = initialPosition[0] - element.x;

  const offsetY = initialPosition[1] - element.y;

  const x = currentPosition[0] - offsetX;
  const y = currentPosition[1] - offsetY;

  const updatedElement: OnlyDrawElement = {
    ...element,
    x: x,
    y: y,
  };
  return updatedElement;
};
