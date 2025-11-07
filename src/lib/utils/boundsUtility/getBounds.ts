import { elementType, OnlyDrawElement } from '@/types/type';
import { Point } from 'roughjs/bin/geometry';
import * as Y from 'yjs';

type args = {
  element: Y.Map<unknown>;
};
export type boundType = {
  x: number;
  y: number;
  width: number;
  height: number;
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
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }

    case elementType.Freehand: {
      const stroke = element.get('stroke') as unknown as
        | { points: Point[] }
        | undefined;
      const points = stroke?.points ?? [];
      if (points.length === 0) {
        const x1 = Math.min(x, x + width);
        const y1 = Math.min(y, y + height);
        const x2 = Math.max(x, x + width);
        const y2 = Math.max(y, y + height);
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
      }

      const absPoints = points.map(([px, py]) => [x + px, y + py] as Point);
      const xs = absPoints.map(([px]) => px);
      const ys = absPoints.map(([py]) => py);

      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
};
