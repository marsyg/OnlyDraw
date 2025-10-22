import { elementType, OnlyDrawElement } from '@/types/type';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './getSVGStroke';

type DrawingArgs = {
  ctx: CanvasRenderingContext2D;
  element: OnlyDrawElement;
};

export const DrawElements = ({ ctx, element }: DrawingArgs) => {
  ctx.save();

  switch (element.type) {
    case elementType.Rectangle: {
      ctx.beginPath();
      ctx.rect(element.x, element.y, element.width, element.height);
      ctx.strokeStyle = 'black';

      ctx.stroke();
      break;
    }

    case elementType.line: {
      ctx.beginPath();
      ctx.moveTo(element.x, element.y);
      ctx.lineTo(element.x + element.width, element.y + element.height);
      ctx.stroke();
      break;
    }

    case elementType.ellipse: {
      ctx.beginPath();
      ctx.ellipse(
        Math.abs(element.x + element.width / 2),
        Math.abs(element.y + element.height / 2),
        Math.abs(element.width / 2),
        Math.abs(element.height / 2),
        0,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      break;
    }

    case elementType.freehand: {
      const points = element.stroke.points;
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
        size: 22,
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
      const stroke = getStroke(points, options);
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
