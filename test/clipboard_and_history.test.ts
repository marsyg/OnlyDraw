import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import {
  serializeYElement,
  serializeYElements,
  deserializeYElement,
  deserializeYElements,
} from '../src/lib/clipboard';
import { elementType } from '../src/types/type';

describe('Clipboard Serialization, Deserialization, and History Undo/Redo', () => {
  it('serializes Y.Map to pure JSON record', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el1');
    el.set('id', 'id-123');
    el.set('type', elementType.Rectangle);
    el.set('x', 50);
    el.set('y', 80);
    el.set('width', 100);
    el.set('height', 60);

    const serialized = serializeYElement(el);
    assert.strictEqual(serialized.id, 'id-123');
    assert.strictEqual(serialized.type, elementType.Rectangle);
    assert.strictEqual(serialized.x, 50);
    assert.strictEqual(serialized.y, 80);
  });

  it('deserializes element with new unique ID and +20,+20 offset', () => {
    const originalData = {
      id: 'old-id',
      type: elementType.Rectangle,
      x: 100,
      y: 150,
      width: 200,
      height: 80,
    };

    const newMap = deserializeYElement(originalData, { x: 20, y: 20 });
    assert.notStrictEqual(newMap.get('id'), 'old-id');
    assert.strictEqual(newMap.get('x'), 120); // 100 + 20
    assert.strictEqual(newMap.get('y'), 170); // 150 + 20
    assert.strictEqual(newMap.get('width'), 200);
    assert.strictEqual(newMap.get('height'), 80);
  });

  it('deserializes freehand stroke points properly into Y.Array', () => {
    const originalData = {
      id: 'fh-1',
      type: elementType.Freehand,
      x: 10,
      y: 10,
      points: [
        { x: 1, y: 2, pressure: 0.5 },
        { x: 3, y: 4, pressure: 0.8 },
      ],
    };

    const newMap = deserializeYElement(originalData, { x: 20, y: 20 });
    const points = newMap.get('points') as Y.Array<Y.Map<number>>;
    assert.ok(points);
    assert.strictEqual(points.length, 2);
    const p1 = points.get(0);
    assert.strictEqual(p1.get('x'), 1);
    assert.strictEqual(p1.get('y'), 2);
  });

  it('tracks Y.UndoManager undo and redo transactions cleanly', () => {
    const doc = new Y.Doc();
    const yElement = doc.getMap<Y.Map<unknown>>('elements');
    const order = doc.getArray<string>('order');
    const undoManager = new Y.UndoManager([yElement, order], { trackedOrigins: new Set(['local']) });

    // Step 1: Add element
    doc.transact(() => {
      const el = new Y.Map<unknown>();
      el.set('id', 'item1');
      el.set('x', 10);
      yElement.set('item1', el);
      order.push(['item1']);
    }, 'local');

    assert.strictEqual(order.length, 1);
    assert.ok(yElement.get('item1'));

    // Step 2: Undo
    undoManager.undo();
    assert.strictEqual(order.length, 0);
    assert.strictEqual(yElement.get('item1'), undefined);

    // Step 3: Redo
    undoManager.redo();
    assert.strictEqual(order.length, 1);
    assert.ok(yElement.get('item1'));
  });
});
