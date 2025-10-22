import { nanoid } from 'nanoid';
import canvasDoc from '@/Store/yjs-store';
import { OnlyDrawElement } from '@/types/type';

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
  if (element.type === 'freehand') newElement.set('stroke', element.stroke);
  newElement.set('isDeleted', element.isDeleted);
  newElement.set('author', canvasDoc.doc.clientID);
  canvasDoc.yElement.set(elementId, newElement);
  canvasDoc.order.push([elementId]);
  return newElement;
};

export default createYElement;
