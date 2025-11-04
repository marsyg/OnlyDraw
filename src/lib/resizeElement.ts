import { point } from '@/types/type';
import { boundType } from './utils/boundsUtility/getBounds';
function resizeElement(
  handle: string,
  initialPosition: point,
  currentPosition: point,
  originalRect: { x: number; y: number; width: number; height: number }
) {
  const [startX, startY] = initialPosition;
  const [x, y] = currentPosition;
  const dx = x - startX;
  const dy = y - startY;

  let newX = originalRect.x;
  let newY = originalRect.y;
  let newWidth = originalRect.width;
  let newHeight = originalRect.height;

  switch (handle) {
    case 'se':
      newWidth += dx;
      newHeight += dy;
      break;
    case 'sw':
      newX += dx;
      newWidth -= dx;
      newHeight += dy;
      break;
    case 'ne':
      newY += dy;
      newWidth += dx;
      newHeight -= dy;
      break;
    case 'nw':
      newX += dx;
      newY += dy;
      newWidth -= dx;
      newHeight -= dy;
      break;
    case 'n':
      newY += dy;
      newHeight -= dy;
      break;
    case 's':
      newHeight += dy;
      break;
    case 'e':
      newWidth += dx;
      break;
    case 'w':
      newX += dx;
      newWidth -= dx;
      break;
  }

  if (newWidth < 0) {
    newX += newWidth;
    newWidth = Math.abs(newWidth);
  }
  if (newHeight < 0) {
    newY += newHeight;
    newHeight = Math.abs(newHeight);
  }

  return { x: newX, y: newY, width: newWidth, height: newHeight };
}
export default resizeElement;
