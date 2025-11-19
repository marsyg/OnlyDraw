import { elementType, OnlyDrawElement } from '@/types/type';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './getSVGStroke';
import * as Y from 'yjs';
import { RoughCanvas } from 'roughjs/bin/canvas';
type DrawingArgs = {
  ctx: CanvasRenderingContext2D;
  element: Y.Map<unknown>;
  rc: RoughCanvas;
};

export const DrawElements = ({ ctx, element, rc }: DrawingArgs) => {
  const generator = rc.generator;

  ctx.save();
  const type = element.get('type') as unknown as elementType;
  const seed = parseInt(String(element.get('seed')), 10);
  switch (type) {
    case elementType.Rectangle: {
      const drawable = generator.rectangle(
        Number(element.get('x')),
        Number(element.get('y')),
        Number(element.get('width')),
        Number(element.get('height')),
        {
          seed,
          stroke: String(element.get('strokeColor')),
          strokeWidth: Number(element.get('strokeWidth')),
          roughness: Number(element.get('roughness')),
          fill: String(element.get('fillColor')),
          fillStyle: String(element.get('fillStyle')),
          hachureGap: Number(element.get('fillWeight')),
          // strokeStyle: String(element.get('boundaryStyle')), // Map boundaryStyle
        }
      );

      rc.draw(drawable);
      break;
    }

    case elementType.Line: {
      const x1 = Number(element.get('x'));
      const y1 = Number(element.get('y'));
      const x2 = x1 + Number(element.get('width'));
      const y2 = y1 + Number(element.get('height'));

      const drawable = generator.line(x1, y1, x2, y2, {
        seed,
        stroke: String(element.get('strokeColor')),
        strokeWidth: Number(element.get('strokeWidth')),
        roughness: Number(element.get('roughness')),
        // strokeStyle: String(element.get('boundaryStyle')),
      });

      rc.draw(drawable);
      break;
    }

    case elementType.Ellipse: {
      const x = Number(element.get('x'));
      const y = Number(element.get('y'));
      const width = Number(element.get('width'));
      const height = Number(element.get('height'));

      const drawable = generator.ellipse(
        x + width / 2,
        y + height / 2,
        width,
        height,
        {
          seed,
          stroke: String(element.get('strokeColor')),
          strokeWidth: Number(element.get('strokeWidth')),
          roughness: Number(element.get('roughness')),
          fill: String(element.get('fillColor')),
          fillStyle: String(element.get('fillStyle')),
          hachureGap: Number(element.get('fillWeight')),
          // strokeStyle: String(element.get('boundaryStyle')),
        }
      );

      rc.draw(drawable);
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

      const options = {
        size: 10,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t: number) => t,
        start: { taper: 0, easing: (t: number) => t, cap: true },
        end: { taper: 100, easing: (t: number) => t, cap: true },
      };

      const normalizedPoints = points.map(([x, y, pressure]) => ({
        x: Number(x),
        y: Number(y),
        pressure: pressure ?? 1,
      }));

      const stroke = getStroke(normalizedPoints, options);
      const path = getSvgPathFromStroke(stroke);

      const path2D = new Path2D(path);

      ctx.fillStyle = String(element.get('strokeColor'));
      ctx.fill(path2D);
      break;
    }

    default:
      break;
  }
  ctx.restore();
};
