import { nanoid } from 'nanoid';
import canvasDoc from '@/Store/yjs-store';
import { OnlyDrawElement } from '@/types/type';
import * as Y from 'yjs';
const createYElement = (element: OnlyDrawElement) => {
  const elementId = nanoid();
  const safeSeed = element.seed ?? Math.floor(Math.random() * 2 ** 31);
  const newElement = new canvasDoc.Y.Map();
  newElement.set('id', elementId);
  newElement.set('type', element.type);
  newElement.set('x', element.x);
  newElement.set('y', element.y);
  newElement.set('seed', safeSeed);
  newElement.set('width', element.width);
  newElement.set('height', element.height);
  newElement.set('strokeColor', element.strokeColor);
  newElement.set('strokeWidth', element.strokeWidth);
  if (element.type === 'freehand') {
    const points = new canvasDoc.Y.Array<Y.Map<number>>();
    if (element.stroke && Array.isArray(element.stroke.points)) {
      element.stroke.points.forEach((relPoint: number[]) => {
        const pointMap = new Y.Map<number>();
        pointMap.set('x', relPoint[0] || 0);
        pointMap.set('y', relPoint[1] || 0);
        pointMap.set('pressure', relPoint[2] || 1);
        points.push([pointMap]);
      });
    } else {
      const initialPoint = new canvasDoc.Y.Map<number>();
      initialPoint.set('x', 0);
      initialPoint.set('y', 0);
      initialPoint.set('pressure', 1);
      points.push([initialPoint]);
    }
    newElement.set('points', points);
  } else if (element.type === 'text') {
    newElement.set('text', element.text);
    newElement.set('fontSize', element.fontSize);
    newElement.set('fontFamily', element.fontFamily);
    newElement.set('textAlign', element.textAlign);
    newElement.set('fillColor', element.fillColor);
    newElement.set('lineHeight', element.lineHeight);
  } else if (element.type === 'line') {
    newElement.set('boundaryStyle', element.boundaryStyle);
    newElement.set('roughness', element.roughness);
  } else {
    newElement.set('fillColor', element.fillColor);
    newElement.set('fillStyle', element.fillStyle);
    newElement.set('fillWeight', element.fillWeight);
    newElement.set('boundaryStyle', element.boundaryStyle);
    newElement.set('roughness', element.roughness);
  }
  newElement.set('isDeleted', element.isDeleted);
  newElement.set('author', canvasDoc.doc.clientID);
  // Visual properties
  newElement.set('opacity', (element as OnlyDrawElement & { opacity?: number }).opacity ?? 1);
  newElement.set('hasShadow', (element as OnlyDrawElement & { hasShadow?: boolean }).hasShadow ?? false);
  newElement.set('angle', (element as OnlyDrawElement & { angle?: number }).angle ?? 0);
  newElement.set('rotationAxis', (element as OnlyDrawElement & { rotationAxis?: string }).rotationAxis ?? 'center');

  return newElement;
};
const updateYElement = (element: OnlyDrawElement, yElement: Y.Map<unknown>) => {
  // console.log(`[DEBUG] Updating element ${element.id}`);
  // console.log(
  //   `[DEBUG] Input seed: ${element.seed}, type: ${typeof element.seed}`
  // );

  // const existingSeed = yElement.get('seed');
  // console.log(
  //   `[DEBUG] Existing Yjs seed: ${existingSeed}, type: ${typeof existingSeed}`
  // );

  yElement.set('x', element.x);
  yElement.set('y', element.y);
  yElement.set('width', element.width);
  yElement.set('height', element.height);

  if (element.type === 'freehand') {
    const points = new canvasDoc.Y.Array<Y.Map<number>>();
    if (element.stroke && Array.isArray(element.stroke.points)) {
      element.stroke.points.forEach((relPoint: number[]) => {
        const pointMap = new Y.Map<number>();
        pointMap.set('x', relPoint[0] || 0);
        pointMap.set('y', relPoint[1] || 0);
        pointMap.set('pressure', relPoint[2] || 1);
        points.push([pointMap]);
      });
    } else {
      const initialPoint = new canvasDoc.Y.Map<number>();
      initialPoint.set('x', 0);
      initialPoint.set('y', 0);
      initialPoint.set('pressure', 1);
      points.push([initialPoint]);
    }
    yElement.set('points', points);
  } else if (element.type === 'text') {
    yElement.set('text', element.text);
    yElement.set('fontSize', element.fontSize);
    yElement.set('fontFamily', element.fontFamily);
    yElement.set('textAlign', element.textAlign);
    yElement.set('fillColor', element.fillColor);
    yElement.set('lineHeight', element.lineHeight);
  } else if (element.type === 'line') {
    yElement.set('boundaryStyle', element.boundaryStyle);
    yElement.set('roughness', element.roughness);
  } else {
    yElement.set('fillColor', element.fillColor);
    yElement.set('fillStyle', element.fillStyle);
    yElement.set('fillWeight', element.fillWeight);
    yElement.set('boundaryStyle', element.boundaryStyle);
    yElement.set('roughness', element.roughness);
  }
  yElement.set('isDeleted', element.isDeleted);
  // Visual properties
  if ((element as OnlyDrawElement & { opacity?: number }).opacity !== undefined) {
    yElement.set('opacity', (element as OnlyDrawElement & { opacity?: number }).opacity);
  }
  if ((element as OnlyDrawElement & { hasShadow?: boolean }).hasShadow !== undefined) {
    yElement.set('hasShadow', (element as OnlyDrawElement & { hasShadow?: boolean }).hasShadow);
  }
  if ((element as OnlyDrawElement & { angle?: number }).angle !== undefined) {
    yElement.set('angle', (element as OnlyDrawElement & { angle?: number }).angle);
  }
  if ((element as OnlyDrawElement & { rotationAxis?: string }).rotationAxis !== undefined) {
    yElement.set('rotationAxis', (element as OnlyDrawElement & { rotationAxis?: string }).rotationAxis);
  }

  return yElement;
};
const yUtils = { createYElement, updateYElement };
export default yUtils;
