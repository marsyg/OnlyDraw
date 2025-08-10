import { LucideIcon } from 'lucide-react';

export type PointsFreeHand = [number, number, number];
export type Stroke = {
  points: PointsFreeHand[];
};

type baseType = {
  id: number;
  x: number;
  y: number;
  height: number;
  width: number;
  isDeleted: boolean;
};
export type rectangleElement = baseType & {
  type: elementType.Rectangle;
};

export type ellipseElement = baseType & {
  type: elementType.ellipse;
};

export type lineElement = baseType & {
  type: elementType.line;
};

export type freeHandElement = baseType & {
  stroke: Stroke;

  type: elementType.freehand;
};
export type Degrees = number;

export type OnlyDrawElement =
  | rectangleElement
  | lineElement
  | ellipseElement
  | freeHandElement;

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
}

export enum elementType {
  Rectangle = 'rectangle',
  ellipse = 'ellipse',
  line = 'line',
  freehand = 'freehand',
  Select = 'select',
}

export type ToolBarDataType = {
  id: string;
  name: string;
  icon: LucideIcon;
  elementType: elementType;
  actionType: actionType;
  isActive: boolean;
};
