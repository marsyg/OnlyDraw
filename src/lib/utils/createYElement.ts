import { nanoid } from 'nanoid';
import canvasDoc from '@/Store/yjs-store';
import { OnlyDrawElement, elementType } from '@/types/type';
import * as Y from 'yjs';
const createYElement = (element: OnlyDrawElement) => {
  const elementId = element.id || nanoid();
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
  switch (element.type) {
    case elementType.Freehand: {
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
      break;
    }
    case elementType.Text: {
      newElement.set('text', element.text);
      newElement.set('fontSize', element.fontSize);
      newElement.set('fontFamily', element.fontFamily);
      newElement.set('textAlign', element.textAlign);
      newElement.set('fillColor', element.fillColor);
      newElement.set('lineHeight', element.lineHeight);
      break;
    }
    case elementType.Image: {
      newElement.set('src', element.src);
      newElement.set('naturalWidth', element.naturalWidth ?? element.width);
      newElement.set('naturalHeight', element.naturalHeight ?? element.height);
      break;
    }
    case elementType.Line: {
      newElement.set('boundaryStyle', element.boundaryStyle);
      newElement.set('roughness', element.roughness);
      break;
    }
    case elementType.Arrow:
    case elementType.ArrowTwoWay: {
      newElement.set('boundaryStyle', element.boundaryStyle);
      newElement.set('roughness', element.roughness);
      newElement.set('isTwoWay', element.type === elementType.ArrowTwoWay || !!element.isTwoWay);
      newElement.set('startBinding', element.startBinding ?? null);
      newElement.set('endBinding', element.endBinding ?? null);
      break;
    }
    case elementType.Rectangle:
    case elementType.Ellipse: {
      newElement.set('fillColor', element.fillColor);
      newElement.set('isFillTransparent', element.isFillTransparent ?? true);
      newElement.set('fillStyle', element.fillStyle);
      newElement.set('fillWeight', element.fillWeight);
      newElement.set('boundaryStyle', element.boundaryStyle);
      newElement.set('roughness', element.roughness);
      break;
    }
  }
  newElement.set('isDeleted', element.isDeleted);
  newElement.set('author', canvasDoc.doc.clientID);
  // Visual properties
  newElement.set('opacity', element.opacity ?? 1);
  newElement.set('hasShadow', element.hasShadow ?? false);
  newElement.set('angle', element.angle ?? 0);
  newElement.set('rotationAxis', element.rotationAxis ?? 'center');

  return newElement;
};
const updateYElement = (element: OnlyDrawElement, yElement: Y.Map<unknown>) => {
  yElement.set('x', element.x);
  yElement.set('y', element.y);
  yElement.set('width', element.width);
  yElement.set('height', element.height);

  switch (element.type) {
    case elementType.Freehand: {
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
      break;
    }
    case elementType.Text: {
      yElement.set('text', element.text);
      yElement.set('fontSize', element.fontSize);
      yElement.set('fontFamily', element.fontFamily);
      yElement.set('textAlign', element.textAlign);
      yElement.set('fillColor', element.fillColor);
      yElement.set('lineHeight', element.lineHeight);
      break;
    }
    case elementType.Image: {
      yElement.set('src', element.src);
      yElement.set('naturalWidth', element.naturalWidth ?? element.width);
      yElement.set('naturalHeight', element.naturalHeight ?? element.height);
      break;
    }
    case elementType.Line: {
      yElement.set('boundaryStyle', element.boundaryStyle);
      yElement.set('roughness', element.roughness);
      break;
    }
    case elementType.Arrow:
    case elementType.ArrowTwoWay: {
      yElement.set('boundaryStyle', element.boundaryStyle);
      yElement.set('roughness', element.roughness);
      yElement.set('isTwoWay', element.type === elementType.ArrowTwoWay || !!element.isTwoWay);
      yElement.set('startBinding', element.startBinding ?? null);
      yElement.set('endBinding', element.endBinding ?? null);
      break;
    }
    case elementType.Rectangle:
    case elementType.Ellipse: {
      yElement.set('fillColor', element.fillColor);
      if (element.isFillTransparent !== undefined) {
        yElement.set('isFillTransparent', element.isFillTransparent);
      }
      yElement.set('fillStyle', element.fillStyle);
      yElement.set('fillWeight', element.fillWeight);
      yElement.set('boundaryStyle', element.boundaryStyle);
      yElement.set('roughness', element.roughness);
      break;
    }
  }
  yElement.set('isDeleted', element.isDeleted);
  // Visual properties
  if (element.opacity !== undefined) {
    yElement.set('opacity', element.opacity);
  }
  if (element.hasShadow !== undefined) {
    yElement.set('hasShadow', element.hasShadow);
  }
  if (element.angle !== undefined) {
    yElement.set('angle', element.angle);
  }
  if (element.rotationAxis !== undefined) {
    yElement.set('rotationAxis', element.rotationAxis);
  }

  return yElement;
};
const yUtils = { createYElement, updateYElement };
export default yUtils;
