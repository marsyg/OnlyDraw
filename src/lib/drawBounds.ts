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
  console.log('this is also firing up');
  const { maxX, minY, maxY, minX } = bounds;
  context.save();
  context.strokeStyle = 'red'; 
  context.setLineDash([4, 2]);
  context.lineWidth = 6;
  context.strokeRect(minX, minY, maxX - minX, maxY - minY);
  context.restore();
};
