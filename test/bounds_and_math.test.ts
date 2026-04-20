import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import { getBounds } from '../src/lib/utils/boundsUtility/getBounds';
import { getCompoundBounds } from '../src/lib/utils/boundsUtility/compoundBounds';
import { isPointInPaddedBounds } from '../src/lib/utils/boundsUtility/isPointInPaddedBounds';
import { getPivotPoint, unrotatePoint } from '../src/lib/math/pivot';
import { elementType } from '../src/types/type';

describe('Bounds and Math Calculations', () => {
  it('calculates standard AABB for rectangle', () => {
    const doc = new Y.Doc();
    const map = doc.getMap('el');
    map.set('type', elementType.Rectangle);
    map.set('x', 100);
    map.set('y', 200);
    map.set('width', 150);
    map.set('height', 80);
    map.set('angle', 0);

    const b = getBounds({ element: map });
    assert.strictEqual(b.x, 100);
    assert.strictEqual(b.y, 200);
    assert.strictEqual(b.width, 150);
    assert.strictEqual(b.height, 80);
  });

  it('handles negative width and height correctly (normalizing min/max)', () => {
    const doc = new Y.Doc();
    const map = doc.getMap('el');
    map.set('type', elementType.Rectangle);
    map.set('x', 200);
    map.set('y', 200);
    map.set('width', -50);
    map.set('height', -60);

    const b = getBounds({ element: map });
    assert.strictEqual(b.x, 150);
    assert.strictEqual(b.y, 140);
    assert.strictEqual(b.width, 50);
    assert.strictEqual(b.height, 60);
  });

  it('calculates compound bounds for multiple elements', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const el1 = new Y.Map<unknown>();
    el1.set('id', '1');
    el1.set('type', elementType.Rectangle);
    el1.set('x', 50);
    el1.set('y', 50);
    el1.set('width', 50);
    el1.set('height', 50);
    root.set('1', el1);

    const el2 = new Y.Map<unknown>();
    el2.set('id', '2');
    el2.set('type', elementType.Ellipse);
    el2.set('x', 120);
    el2.set('y', 150);
    el2.set('width', 80);
    el2.set('height', 70);
    root.set('2', el2);

    const cb = getCompoundBounds(['1', '2'], root);
    assert.ok(cb, 'Compound bounds should exist');
    assert.strictEqual(cb.x, 50);
    assert.strictEqual(cb.y, 50);
    assert.strictEqual(cb.width, 150); // max X is 200, min X is 50 -> 150
    assert.strictEqual(cb.height, 170); // max Y is 220, min Y is 50 -> 170
  });

  it('returns null for empty compound bounds or missing elements', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');
    const cb = getCompoundBounds(['non-existent'], root);
    assert.strictEqual(cb, null);
  });

  it('calculates pivot point correctly for center and corner anchors', () => {
    const rect = { x: 100, y: 100, width: 200, height: 100 };
    const center = getPivotPoint(rect, 'center');
    assert.deepStrictEqual(center, [200, 150]);

    const topLeft = getPivotPoint(rect, 'top-left');
    assert.deepStrictEqual(topLeft, [100, 100]);

    const bottomRight = getPivotPoint(rect, 'bottom-right');
    assert.deepStrictEqual(bottomRight, [300, 200]);
  });

  it('unrotates point back to local space correctly', () => {
    const pivot: [number, number] = [100, 100];
    const angle = Math.PI / 2; // 90 deg clockwise
    // Point (100, 150) rotated 90 deg around (100, 100) becomes (50, 100)
    const rotatedPoint: [number, number] = [50, 100];
    const unrotated = unrotatePoint(rotatedPoint, pivot, angle);
    assert.ok(Math.abs(unrotated[0] - 100) < 0.001);
    assert.ok(Math.abs(unrotated[1] - 150) < 0.001);
  });

  it('checks isPointInPaddedBounds accurately', () => {
    const bound = { x: 100, y: 100, width: 100, height: 100 };
    assert.strictEqual(isPointInPaddedBounds([150, 150], bound), true);
    assert.strictEqual(isPointInPaddedBounds([95, 95], bound), true); // inside padding
    assert.strictEqual(isPointInPaddedBounds([80, 80], bound), false); // outside padding
  });
});
