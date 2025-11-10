import { nanoid } from 'nanoid';
import canvasDoc from '@/Store/yjs-store';
import { OnlyDrawElement } from '@/types/type';
import * as Y from 'yjs';
const createYElement = (element: OnlyDrawElement) => {
  const elementId = nanoid();
  const newElement = new canvasDoc.Y.Map();
  // newElement.doc = canvasDoc.doc;
  newElement.set('id', elementId);
  newElement.set('type', element.type);
  newElement.set('x', element.x);
  newElement.set('y', element.y);
  newElement.set('width', element.width);
  newElement.set('height', element.height);
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
  }
  newElement.set('isDeleted', element.isDeleted);
  newElement.set('author', canvasDoc.doc.clientID);

  return newElement;
};
const updateYElement = (element: OnlyDrawElement, yElement: Y.Map<unknown>) => {
  const newElement = yElement;
  newElement.set('x', element.x);
  newElement.set('y', element.y);
  newElement.set('width', element.width);
  newElement.set('height', element.height);
  if (element.type === 'freehand')
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
    }
  newElement.set('isDeleted', element.isDeleted);

  return newElement;
};
const yUtils = { createYElement, updateYElement };
export default yUtils;
