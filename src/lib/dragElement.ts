import { OnlyDrawElement } from '@/types/type';
import { Point } from 'roughjs/bin/geometry';
import * as Y from 'yjs';
type args = {
  initialPosition: Point;
  currentPosition: Point;
  element: Y.Map<unknown>;
};
export const DragElements = ({
  initialPosition,
  currentPosition,
  element,
}: args) => {
  

  const offsetX = initialPosition[0] - Number(element.get('x'));

  const offsetY = initialPosition[1] - Number(element.get('y'));

  const x = currentPosition[0] - offsetX;
  const y = currentPosition[1] - offsetY;

  const updatedElement = {
    ...element,
    x: x,
    y: y,
  };
  return updatedElement;
};
