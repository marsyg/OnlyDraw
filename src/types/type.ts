import { LucideIcon } from 'lucide-react';

import * as Y from 'yjs';
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
};
export type rectangleElement = baseType & {
  type: elementType.Rectangle;
  fillColor: string;
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
};

export type ellipseElement = baseType & {
  type: elementType.Ellipse;
  fillColor: string;
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
};

export type lineElement = baseType & {
  type: elementType.Line;
  boundaryStyle: string;
};

export type freeHandElement = baseType & {
  stroke: Stroke;

  type: elementType.Freehand;
};
export type Degrees = number;

export type OnlyDrawElement =
  | rectangleElement
  | lineElement
  | ellipseElement
  | freeHandElement;

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
  Freehand = 'freehand',
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
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
};
