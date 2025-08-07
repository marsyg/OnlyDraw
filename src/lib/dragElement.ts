import { useAppStore } from '@/Store/store';
import { OnlyDrawElement } from '@/types/type';
import { Point } from 'roughjs/bin/geometry';
type args = {
  initialPosition: Point;
  currentPosition: Point;
  element: OnlyDrawElement;
};
export const UseDragElements = ({
  initialPosition,
  currentPosition,
  element,
}: args) => {
  const id = element.id;
  const offsetX = element.x - initialPosition[0];
  const offsetY = element.y - initialPosition[1];
  const x = currentPosition[0] - offsetX;
  const y = currentPosition[1] - offsetY;
  const { updateElement } = useAppStore();

  const updatedElement: OnlyDrawElement = {
    ...element,
    x: x,
    y: y,
  };
  updateElement(id, updatedElement);
};
