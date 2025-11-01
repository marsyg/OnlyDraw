import { elementType, OnlyDrawElement } from '@/types/type';
import { Point } from 'roughjs/bin/geometry';
import * as Y from 'yjs';

type args = {
  element: Y.Map<unknown> ;
};
export type boundType = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
export const getBounds = ({ element }: args): boundType => {
 
  const x = Number(element.get('x'));
  const y = Number(element.get('y'));
  const width = Number(element.get('width'));
  const height = Number(element.get('height')); 
   const type = element.get('type') as unknown as elementType;
  switch (type) {
    case elementType.Line:
    case elementType.Rectangle:
    case elementType.Ellipse: {
      const x1 = Math.min(x, x + width);
      const y1 = Math.min(y, y + height);
      const x2 = Math.max(x, x + width);
      const y2 = Math.max(y, y + height);
      return { minX: x1, minY: y1, maxX: x2, maxY: y2 };
    }

    case elementType.Freehand: {
      const stroke = element.get('stroke') as unknown as { points: Point[] } | undefined;
      const points = stroke?.points ?? [];
      if (points.length === 0) {
        const x1 = Math.min(x, x + width);
        const y1 = Math.min(y, y + height);
        const x2 = Math.max(x, x + width);
        const y2 = Math.max(y, y + height);
        return { minX: x1, minY: y1, maxX: x2, maxY: y2 };
      }

      const absPoints = points.map(([px, py]) => [x + px, y + py] as Point);
      const xs = absPoints.map(([px]) => px);
      const ys = absPoints.map(([, py]) => py);

      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }
    default:
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
};
