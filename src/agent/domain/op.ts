export type ShapeStyle = {
  fillColor?: string;
  strokeColor?: string;
  fillStyle?: string;
  fillWeight?: number;
  boundaryStyle?: string;
  roughness?: number;
  strokeWidth?: number;
  opacity?: number;
  hasShadow?: boolean;
};

export type ArrowStyle = {
  strokeColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  hasShadow?: boolean;
  boundaryStyle?: string;
  routing?: 'straight' | 'curved' | 'angled';
};

export type Op =
  | { op: 'create_shape'; id: string; shape: 'rect' | 'diamond' | 'ellipse' | 'rounded-rect';
      x: number; y: number; w: number; h: number; label: string; seed: number;
      style?: ShapeStyle }
  | { op: 'create_arrow'; id: string; fromId: string; toId: string;
      points: [number, number][]; label?: string; seed: number;
      style?: ArrowStyle;
      fromPoint?: 'center' | 'top' | 'bottom' | 'left' | 'right';
      toPoint?: 'center' | 'top' | 'bottom' | 'left' | 'right' }
  | { op: 'update_shape'; id: string;
      patch: Partial<ShapeStyle & { label?: string; x?: number; y?: number; w?: number; h?: number }> }
  | { op: 'delete_element'; id: string }
  | { op: 'move_element'; id: string; dx: number; dy: number }
  | { op: 'apply_theme'; theme: string; targetIds?: string[] };
