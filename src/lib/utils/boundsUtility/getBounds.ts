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
      const strokeData = element.get('points') as Y.Array<Y.Map<number>>;
      const points = strokeData
        .toArray()
        .map((p) => [
          p.get('x') as number,
          p.get('y') as number,
          p.get('pressure') as number,
        ]);

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
      const pad = 11;
      return {
        x: Number(element.get('x')) - pad,
        y: Number(element.get('y')) - pad,
        width: Number(element.get('width')) + 2 * pad,
        height: Number(element.get('height')) + 2 * pad,
      };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
};
