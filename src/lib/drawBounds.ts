import { boundType } from './utils/boundsUtility/getBounds';
import { BOUNDS_PADDING } from './hitTest/detectResizeHandler';

type args = {
  context: CanvasRenderingContext2D;
  bounds: boundType;
};

export const DrawBounds = ({ context, bounds }: args) => {
  const { x, y, width, height } = bounds;
  const padding = BOUNDS_PADDING;
  const handleSize = 8;
  const halfHandle = handleSize / 2;

  context.save();

  // Bounding box outline
  context.strokeStyle = 'rgba(59, 130, 246, 0.9)';
  context.lineWidth = 1.5;
  context.setLineDash([4, 4]);

  const boxX = x - padding;
  const boxY = y - padding;
  const boxWidth = width + padding * 2;
  const boxHeight = height + padding * 2;

  context.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // Reset line dash for handles
  context.setLineDash([]);
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#2563eb';
  context.lineWidth = 1.5;

  const handleMinX = boxX;
  const handleMinY = boxY;
  const handleMaxX = boxX + boxWidth;
  const handleMaxY = boxY + boxHeight;
  const handleMidX = boxX + boxWidth / 2;
  const handleMidY = boxY + boxHeight / 2;

  const handles = [
    [handleMinX, handleMinY], // nw
    [handleMidX, handleMinY], // n
    [handleMaxX, handleMinY], // ne
    [handleMaxX, handleMidY], // e
    [handleMaxX, handleMaxY], // se
    [handleMidX, handleMaxY], // s
    [handleMinX, handleMaxY], // sw
    [handleMinX, handleMidY], // w
  ];

  handles.forEach(([hx, hy]) => {
    context.beginPath();
    context.rect(hx - halfHandle, hy - halfHandle, handleSize, handleSize);
    context.fill();
    context.stroke();
  });

  context.restore();
};
