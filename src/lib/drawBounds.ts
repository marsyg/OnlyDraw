import { boundType } from './utils/boundsUtility/getBounds';
import { BOUNDS_PADDING, ROTATION_HANDLE_OFFSET } from './hitTest/detectResizeHandler';
import { getPivotPoint } from './math/pivot';

type args = {
  context: CanvasRenderingContext2D;
  bounds: boundType & { angle?: number; rotationAxis?: string };
};

export const DrawBounds = ({ context, bounds }: args) => {
  const { x, y, width, height, angle } = bounds;
  const padding = bounds.padding !== undefined ? bounds.padding : BOUNDS_PADDING;
  const handleSize = 8;
  const halfHandle = handleSize / 2;

  context.save();

  // Apply rotation around pivot if specified
  if (angle && angle !== 0) {
    const pivot = getPivotPoint(bounds, bounds.rotationAxis || 'center');
    context.translate(pivot[0], pivot[1]);
    context.rotate(angle);
    context.translate(-pivot[0], -pivot[1]);
  }

  // Bounding box dashed outline
  context.strokeStyle = 'rgba(59, 130, 246, 0.9)';
  context.lineWidth = 1.5;
  context.setLineDash([4, 4]);

  const boxX = x - padding;
  const boxY = y - padding;
  const boxWidth = width + padding * 2;
  const boxHeight = height + padding * 2;

  context.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // Rotation handle stem line
  const handleMidX = boxX + boxWidth / 2;
  const handleMinY = boxY;
  const rotY = boxY - ROTATION_HANDLE_OFFSET;

  context.setLineDash([]);
  context.beginPath();
  context.moveTo(handleMidX, handleMinY);
  context.lineTo(handleMidX, rotY);
  context.strokeStyle = 'rgba(59, 130, 246, 0.7)';
  context.lineWidth = 1.5;
  context.stroke();

  // Rotation handle circular knob
  context.beginPath();
  context.arc(handleMidX, rotY, 5, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  context.strokeStyle = '#2563eb';
  context.lineWidth = 1.5;
  context.stroke();

  // 8 scale handles
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#2563eb';
  context.lineWidth = 1.5;

  const handleMinX = boxX;
  const handleMaxX = boxX + boxWidth;
  const handleMaxY = boxY + boxHeight;
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
