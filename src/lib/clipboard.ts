import canvasDoc from '@/Store/yjs-store';
import * as Y from 'yjs';
import { nanoid } from 'nanoid';

export function serializeYElement(yEl: Y.Map<unknown>): Record<string, unknown> {
  return yEl.toJSON() as Record<string, unknown>;
}

export function serializeYElements(yEls: Y.Map<unknown>[]): Record<string, unknown>[] {
  return yEls.map((el) => serializeYElement(el));
}

export function deserializeYElement(
  data: Record<string, unknown>,
  offset = { x: 20, y: 20 }
): Y.Map<unknown> {
  const newMap = new canvasDoc.Y.Map<unknown>();
  const newId = nanoid();

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') {
      newMap.set('id', newId);
    } else if (key === 'x') {
      newMap.set('x', (Number(value) || 0) + offset.x);
    } else if (key === 'y') {
      newMap.set('y', (Number(value) || 0) + offset.y);
    } else if (key === 'author') {
      newMap.set('author', canvasDoc.doc.clientID);
    } else if (key === 'points' && Array.isArray(value)) {
      const pointsArray = new canvasDoc.Y.Array<Y.Map<number>>();
      value.forEach((pt: Record<string, unknown>) => {
        const pointMap = new Y.Map<number>();
        pointMap.set('x', Number(pt.x) || 0);
        pointMap.set('y', Number(pt.y) || 0);
        pointMap.set('pressure', Number(pt.pressure) || 1);
        pointsArray.push([pointMap]);
      });
      newMap.set('points', pointsArray);
    } else {
      newMap.set(key, value);
    }
  }

  // Ensure unique seed for roughjs redraw
  newMap.set('seed', Math.floor(Math.random() * 2 ** 31));

  return newMap;
}

export function deserializeYElements(
  data: Record<string, unknown>[],
  offset = { x: 20, y: 20 }
): Y.Map<unknown>[] {
  return data.map((d) => deserializeYElement(d, offset));
}

