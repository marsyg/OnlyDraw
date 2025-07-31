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
        element.x + element.width / 2,
        element.y + element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      break;
    }

    case elementType.freehand: {
      const points = element.stroke;
      if (!points) return;
      const stroke = getStroke(points);
      const path = getSvgPathFromStroke(stroke);

      const path2D = new Path2D(path);
      ctx.stroke(path2D);
      break;
    }

    default:
      break;
  }
  ctx.restore();
};
