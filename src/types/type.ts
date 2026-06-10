import { LucideIcon } from 'lucide-react';
import type * as Y from 'yjs';

export type PointsFreeHand = [number, number, number];
export type Stroke = {
  points: PointsFreeHand[];
};

type baseType = {
  id: string;
  x: number;
  y: number;
  seed: string;
  height: number;
  width: number;
  isDeleted: boolean;
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  opacity?: number;
  hasShadow?: boolean;
  angle?: number;
  rotationAxis?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  groupIds?: string[];
};
export type rectangleElement = baseType & {
  type: elementType.Rectangle;
  fillColor: string;
  isFillTransparent?: boolean;
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
};

export type ellipseElement = baseType & {
  type: elementType.Ellipse;
  fillColor: string;
  isFillTransparent?: boolean;
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
};

export type lineElement = baseType & {
  type: elementType.Line;
  boundaryStyle: string;
  
};


export type ArrowBinding = {
  elementId: string;
  point: 'center' | 'top' | 'bottom' | 'left' | 'right';
};

export type arrowElement = baseType & {
  type: elementType.Arrow | elementType.ArrowTwoWay;
  boundaryStyle: string;
  startBinding?: ArrowBinding | null;
  endBinding?: ArrowBinding | null;
  isTwoWay?: boolean;
  routing?: 'straight' | 'curved' | 'angled';
  controlPoint?: { x: number; y: number } | null;
};

export type freeHandElement = baseType & {
  stroke: Stroke;

  type: elementType.Freehand;
};
export type textElement = baseType & {
  type: elementType.Text;
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  fillColor: string;
  lineHeight: number;
};

export type imageElement = baseType & {
  type: elementType.Image;
  src: string;
  naturalWidth?: number;
  naturalHeight?: number;
};

export type Degrees = number;

export type OnlyDrawElement =
  | rectangleElement
  | lineElement
  | arrowElement
  | ellipseElement
  | freeHandElement
  | textElement
  | imageElement;

export type YElement = OnlyDrawElement & {
  author: number;
};
export interface SharedDoc {
  elements: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
}
export type point = [x: number, y: number];

// line is tuple of points P is a generic is a here which is extended
export type line<P extends point> = [p: P, q: P];

export type Vector = [u: number, v: number];

export type Rectangle<P extends point> = [a: P, b: P];

export type Ellipse<Point extends point> = {
  center: Point;
  halfWidth: number;
  halfHeight: number;
};

export const enum actionType {
  Drawing = 'drawing',
  Selecting = 'selecting',
  Dragging = 'dragging',
  Resizing = 'resizing',
  Delete = 'delete',
}

export enum elementType {
  Rectangle = 'rectangle',
  Ellipse = 'ellipse',
  Line = 'line',
  Arrow = 'arrow',
  ArrowTwoWay = 'arrow-two-way',
  Freehand = 'freehand',
  Text = 'text',
  Image = 'image',
  Select = 'select',
  Delete = 'delete',
}

export type ToolBarDataType = {
  id: string;
  name: string;
  icon: LucideIcon;
  elementType: elementType;
  actionType: actionType;
  isActive: boolean;
};
export type ElementOptions = {
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  fillColor: string;
  isFillTransparent?: boolean;
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
  opacity?: number;
  hasShadow?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  angle?: number;
  rotationAxis?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  src?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  isTwoWay?: boolean;
  startBinding?: ArrowBinding | null;
  endBinding?: ArrowBinding | null;
  routing?: 'straight' | 'curved' | 'angled';
  controlPoint?: { x: number; y: number } | null;
};
