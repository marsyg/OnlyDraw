import { elementType, OnlyDrawElement } from '@/types/type';
import { Point } from 'roughjs/bin/geometry';

type args = {
  element: OnlyDrawElement;
};

export const getBounds = ({
  element
}: args): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} => {
  const { x, y, width, height } = element;
  switch (element.type) {
    case elementType.line:
    case elementType.Rectangle:
    case elementType.ellipse: {
      const x1 = Math.min(x, x + width);
      const y1 = Math.min(y, y + height);
      const x2 = Math.max(x, x + width);
      const y2 = Math.max(y, y + height);
      return { minX: x1, minY: y1, maxX: x2, maxY: y2 };
    }

    case elementType.freehand: {
      if (elementType.freehand === 'freehand') {
        const absPoints = element.stroke.points.map(
          ([px, py]) => [x + px, y + py] as Point
        );
        const xs = absPoints.map(([px]) => px);
        const ys = absPoints.map(([, py]) => py);

        return {
          minX: Math.min(...xs),
          minY: Math.min(...ys),
          maxX: Math.max(...xs),
          maxY: Math.max(...ys),
        };
      }
    }
    default:
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
};
