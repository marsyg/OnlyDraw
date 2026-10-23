import { PointsFreeHand, point } from './type';
import * as Y from 'yjs';

export type EditingTextState = {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  fontFamily: string;
  textAlign: string;
  fillColor: string;
  angle?: number;
  rotationAxis?: string;
  isArrow?: boolean;
};

export type ElementResizeSnapshot = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: PointsFreeHand[];
  fontSize?: number;
};

export type ElementDragSnapshot = {
  id: string;
  origX: number;
  origY: number;
  origControlPoint?: { x: number; y: number };
};

export type EndpointDragState = {
  el: Y.Map<unknown>;
  endpoint: 'start' | 'end';
  fixedPt: [number, number];
};

export type MarqueeBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
