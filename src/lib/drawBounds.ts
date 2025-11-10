import { boundType } from './utils/boundsUtility/getBounds';
type args = {
  context: CanvasRenderingContext2D;
  bounds: boundType;
};

export const DrawBounds = ({ context, bounds }: args) => {
  const { x, y, width, height } = bounds;
  const padding = 6;
  const handleRadius = 4;

  context.save();

  
  context.strokeStyle = 'rgba(0, 120, 255, 0.8)';
  context.lineWidth = 2;
  context.shadowColor = 'rgba(0, 120, 255, 0.3)';
  context.shadowBlur = 8;

  const boxX = x - padding;
  const boxY = y - padding;
  const boxWidth = width + padding * 2;
  const boxHeight = height + padding * 2;

  context.strokeRect(boxX, boxY, boxWidth, boxHeight);
 
  context.shadowBlur = 0;
  context.fillStyle = 'white';
  context.strokeStyle = 'rgba(0, 120, 255, 0.9)';
  context.lineWidth = 1.5;

 
  const handleMinX = boxX;
  const handleMinY = boxY;
  const handleMaxX = boxX + boxWidth;
  const handleMaxY = boxY + boxHeight;
  const handleMidX = boxX + boxWidth / 2;
  const handleMidY = boxY + boxHeight / 2;

  const handles = [
    [handleMinX, handleMinY], 
    [handleMidX, handleMinY], 
    [handleMaxX, handleMinY],
    [handleMaxX, handleMidY], 
    [handleMaxX, handleMaxY], 
    [handleMidX, handleMaxY], // bottom-middle
    [handleMinX, handleMaxY], // bottom-left
    [handleMinX, handleMidY], // middle-left
  ];

  handles.forEach(([hx, hy]) => {
    context.beginPath();
    context.arc(hx, hy, handleRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });
  context.restore();
};
