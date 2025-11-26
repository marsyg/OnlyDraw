type BoundaryStyle = 'solid' | 'dashed' | 'dotted';

const getStrokeLineDash = (
  boundaryStyle: BoundaryStyle,
  strokeWidth: number
): number[] => {
  switch (boundaryStyle) {
    case 'solid':
      return [];
    case 'dashed':
      return [strokeWidth * 3, strokeWidth * 2]; 
    case 'dotted':
      return [strokeWidth * 0.5, strokeWidth * 1.5]; 
    default:
      return [];
  }
};
export default getStrokeLineDash;
