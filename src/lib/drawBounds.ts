type args = {
  context: CanvasRenderingContext2D;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
};

export const DrawBounds = ({ context, bounds }: args) => {
  const { minX, minY, maxX, maxY } = bounds;
  const padding = 6;
  const handleRadius = 4;

  context.save();

  // --- Draw outer bounding box ---
  context.strokeStyle = 'rgba(0, 120, 255, 0.8)';
  context.lineWidth = 2;
  context.shadowColor = 'rgba(0, 120, 255, 0.3)';
  context.shadowBlur = 8;

  const x = minX - padding;
  const y = minY - padding;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  context.strokeRect(x, y, width, height);

  // --- Draw resize handles ---
  context.shadowBlur = 0; 
  context.fillStyle = 'white';
  context.strokeStyle = 'rgba(0, 120, 255, 0.9)';
  context.lineWidth = 1.5;

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  
  const handles = [
    [minX, minY], // top-left
    [midX, minY], // top-middle
    [maxX, minY], // top-right
    [maxX, midY], // middle-right
    [maxX, maxY], // bottom-right
    [midX, maxY], // bottom-middle
    [minX, maxY], // bottom-left
    [minX, midY], // middle-left
  ];

  handles.forEach(([hx, hy]) => {
    const cx = hx + (hx === minX ? -padding : hx === maxX ? padding : 0);
    const cy = hy + (hy === minY ? -padding : hy === maxY ? padding : 0);

    context.beginPath();
    context.arc(cx, cy, handleRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  context.restore();
};
