import { elementType, OnlyDrawElement } from '@/types/type';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './getSVGStroke';
import * as Y from 'yjs';
type DrawingArgs = {
  ctx: CanvasRenderingContext2D;
  element: Y.Map<unknown>;
};

export const DrawElements = ({ ctx, element }: DrawingArgs) => {
  ctx.save();
  const type = element.get('type') as unknown as elementType;
  switch (type) {
    case elementType.Rectangle: {
      ctx.beginPath();
      ctx.rect(
        Number(element.get('x')),
        Number(element.get('y')),
        Number(element.get('width')),
        Number(element.get('height'))
      );
      ctx.strokeStyle = 'black';

      ctx.stroke();
      break;
    }

    case elementType.Line: {
      ctx.beginPath();
      ctx.moveTo(Number(element.get('x')), Number(element.get('y')));
      ctx.lineTo(
        Number(element.get('x')) + Number(element.get('width')),
        Number(element.get('y')) + Number(element.get('height'))
      );
      ctx.stroke();
      break;
    }

    case elementType.Ellipse: {
      ctx.beginPath();
      ctx.ellipse(
        Math.abs(Number(element.get('x')) + Number(element.get('width')) / 2),
        Math.abs(Number(element.get('y')) + Number(element.get('height')) / 2),
        Math.abs(Number(element.get('width')) / 2),
        Math.abs(Number(element.get('height')) / 2),
        0,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      break;
    }

    case elementType.Freehand: {
      const x = Number(element.get('x'));
      const y = Number(element.get('y'));
      ctx.translate(x, y);
      const strokeData = element.get('points') as Y.Array<Y.Map<number>>;
      const points = strokeData
        .toArray()
        .map((p) => [
          p.get('x') as number,
          p.get('y') as number,
          p.get('pressure') as number,
        ]);

      if (!points) return;
      interface StrokeTaperOptions {
        taper: number;
        easing: (t: number) => number;
        cap: boolean;
      }

      interface StrokeOptions {
        size: number;
        thinning: number;
        smoothing: number;
        streamline: number;
        easing: (t: number) => number;
        start: StrokeTaperOptions;
        end: StrokeTaperOptions;
      }

      const options: StrokeOptions = {
        size: 10,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t: number) => t,
        start: {
          taper: 0,
          easing: (t: number) => t,
          cap: true,
        },
        end: {
          taper: 100,
          easing: (t: number) => t,
          cap: true,
        },
      };
      const normalizedPoints = points.map(([x, y, pressure]) => ({
        x: Number(x),
        y: Number(y),
        pressure: pressure ?? 1,
      }));
      const stroke = getStroke(normalizedPoints, options);
      const path = getSvgPathFromStroke(stroke);

      const path2D = new Path2D(path);
      ctx.fillStyle = 'black';
      ctx.fill(path2D);
      break;
    }

    default:
      break;
  }
  ctx.restore();
};
