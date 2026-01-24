import { point } from '@/types/type';

function resizeBound(
  handle: string,
  initialPosition: point,
  currentPosition: point,
  originalRect: { x: number; y: number; width: number; height: number },
  isProportional = false
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

  // Preserve aspect ratio if Shift is held and it is a corner handle
  if (
    isProportional &&
    originalRect.width > 0 &&
    originalRect.height > 0 &&
    ['nw', 'ne', 'sw', 'se'].includes(handle)
  ) {
    const aspectRatio = originalRect.width / originalRect.height;
    if (Math.abs(newWidth - originalRect.width) > Math.abs(newHeight - originalRect.height)) {
      newHeight = Math.max(1, newWidth / aspectRatio);
    } else {
      newWidth = Math.max(1, newHeight * aspectRatio);
    }

    if (handle === 'nw') {
      newX = originalRect.x + (originalRect.width - newWidth);
      newY = originalRect.y + (originalRect.height - newHeight);
    } else if (handle === 'ne') {
      newY = originalRect.y + (originalRect.height - newHeight);
    } else if (handle === 'sw') {
      newX = originalRect.x + (originalRect.width - newWidth);
    }
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

export default resizeBound;
