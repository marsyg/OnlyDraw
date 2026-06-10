import { elementType } from '@/types/type';

import * as Y from 'yjs';
import canvasDoc from '@/Store/yjs-store';
import { getBindingPosition, SnapLocation } from '@/lib/arrowSnap';

type args = {
  element: Y.Map<unknown>;
};
export type boundType = {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  rotationAxis?: string;
};
export const getBounds = ({ element }: args): boundType => {
  const x = Number(element.get('x'));
  const y = Number(element.get('y'));
  const width = Number(element.get('width'));
  const height = Number(element.get('height'));
  const angle = Number(element.get('angle')) || 0;
  const rotationAxis = String(element.get('rotationAxis') || 'center');
  const type = element.get('type') as unknown as elementType;
  switch (type) {
    case elementType.Arrow:
    case elementType.ArrowTwoWay: {
      let ax1 = x;
      let ay1 = y;
      let ax2 = x + width;
      let ay2 = y + height;
      const startBinding = element.get('startBinding') as { elementId: string; point: SnapLocation } | undefined;
      const endBinding = element.get('endBinding') as { elementId: string; point: SnapLocation } | undefined;
      const parentMap = (element.parent as Y.Map<Y.Map<unknown>> | undefined) || canvasDoc.yElement;
      if (parentMap) {
        if (startBinding) {
          const sp = getBindingPosition(startBinding, parentMap);
          if (sp) {
            ax1 = sp[0];
            ay1 = sp[1];
          }
        }
        if (endBinding) {
          const ep = getBindingPosition(endBinding, parentMap);
          if (ep) {
            ax2 = ep[0];
            ay2 = ep[1];
          }
        }
      }
      const rawControl = element.get('controlPoint') as { x: number; y: number } | undefined;
      let x1 = Math.min(ax1, ax2);
      let y1 = Math.min(ay1, ay2);
      let x2 = Math.max(ax1, ax2);
      let y2 = Math.max(ay1, ay2);
      if (rawControl) {
        x1 = Math.min(x1, rawControl.x);
        y1 = Math.min(y1, rawControl.y);
        x2 = Math.max(x2, rawControl.x);
        y2 = Math.max(y2, rawControl.y);
      }
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1, angle, rotationAxis };
    }

    case elementType.Line:
    case elementType.Rectangle:
    case elementType.Ellipse:
    case elementType.Text:
    case elementType.Image: {
      const x1 = Math.min(x, x + width);
      const y1 = Math.min(y, y + height);
      const x2 = Math.max(x, x + width);
      const y2 = Math.max(y, y + height);
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1, angle, rotationAxis };
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
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1, angle, rotationAxis };
      }

     
      const pad = 11;
      return {
        x: Number(element.get('x')) - pad,
        y: Number(element.get('y')) - pad,
        width: Number(element.get('width')) + 2 * pad,
        height: Number(element.get('height')) + 2 * pad,
        angle,
        rotationAxis,
      };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0, angle: 0, rotationAxis: 'center' };
  }
};
