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
  context.save();
  const { maxX, minY, maxY, minX } = bounds;

  context.strokeStyle = 'rgba(0, 0, 255, 0.6)';
  context.setLineDash([4, 2]);
  context.lineWidth = 2;
  context.strokeRect(minX - 3, minY - 3, maxX - minX + 6, maxY - minY + 6);
  context.restore();
};
