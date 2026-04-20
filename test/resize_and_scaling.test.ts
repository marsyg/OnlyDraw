import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import resizeBound from '../src/lib/resizeBound';
import { resizeText, resizeFreehand, resizeElement } from '../src/lib/resizeElement';
import { elementType, PointsFreeHand } from '../src/types/type';

describe('Resize Bounds and Scaling Calculations', () => {
  it('resizes from SE corner without proportional constraint', () => {
    const originalRect = { x: 100, y: 100, width: 200, height: 100 };
    const initialPos: [number, number] = [300, 200];
    const currentPos: [number, number] = [350, 250]; // +50 dx, +50 dy

    const res = resizeBound('se', initialPos, currentPos, originalRect, false);
    assert.strictEqual(res.x, 100);
    assert.strictEqual(res.y, 100);
    assert.strictEqual(res.width, 250);
    assert.strictEqual(res.height, 150);
  });

  it('resizes from NW corner moving origin and dimensions', () => {
    const originalRect = { x: 100, y: 100, width: 200, height: 100 };
    const initialPos: [number, number] = [100, 100];
    const currentPos: [number, number] = [80, 70]; // -20 dx, -30 dy

    const res = resizeBound('nw', initialPos, currentPos, originalRect, false);
    assert.strictEqual(res.x, 80);
    assert.strictEqual(res.y, 70);
    assert.strictEqual(res.width, 220);
    assert.strictEqual(res.height, 130);
  });

  it('enforces proportional aspect ratio when isProportional is true on corner handles', () => {
    const originalRect = { x: 100, y: 100, width: 200, height: 100 }; // 2:1 aspect ratio
    const initialPos: [number, number] = [300, 200];
    const currentPos: [number, number] = [400, 220]; // dx = +100, dy = +20

    const res = resizeBound('se', initialPos, currentPos, originalRect, true);
    assert.strictEqual(res.width, 300); // 200 + 100
    assert.strictEqual(res.height, 150); // 300 / 2 = 150 (preserves 2:1 ratio!)
  });

  it('handles negative bounds inversion when dragging past opposite side', () => {
    const originalRect = { x: 100, y: 100, width: 50, height: 50 };
    const initialPos: [number, number] = [150, 150];
    const currentPos: [number, number] = [50, 50]; // dx = -100, dy = -100 (inverting past top-left)

    const res = resizeBound('se', initialPos, currentPos, originalRect, false);
    assert.ok(res.width > 0, 'Width should be normalized to positive');
    assert.ok(res.height > 0, 'Height should be normalized to positive');
    assert.strictEqual(res.width, 50);
    assert.strictEqual(res.height, 50);
    assert.strictEqual(res.x, 50);
    assert.strictEqual(res.y, 50);
  });

  it('scales text font size proportionally when resized', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('textEl');
    el.set('type', elementType.Text);
    el.set('x', 100);
    el.set('y', 100);
    el.set('width', 100);
    el.set('height', 40);
    el.set('fontSize', 24);

    const oldBounds = { x: 100, y: 100, width: 100, height: 40 };
    const newBounds = { x: 100, y: 100, width: 200, height: 80 }; // 2x scale

    resizeText({
      element: el,
      oldBounds,
      newBounds,
      originalFontSize: 24,
    });

    assert.strictEqual(el.get('width'), 200);
    assert.strictEqual(el.get('height'), 80);
    assert.strictEqual(el.get('fontSize'), 48); // 24 * 2 = 48!
  });

  it('scales text font size down when shrinking', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('textEl');
    el.set('type', elementType.Text);
    el.set('x', 100);
    el.set('y', 100);
    el.set('width', 200);
    el.set('height', 80);
    el.set('fontSize', 48);

    const oldBounds = { x: 100, y: 100, width: 200, height: 80 };
    const newBounds = { x: 100, y: 100, width: 100, height: 40 }; // 0.5x scale

    resizeText({
      element: el,
      oldBounds,
      newBounds,
      originalFontSize: 48,
    });

    assert.strictEqual(el.get('fontSize'), 24);
  });

  it('clamps text font size between 8px and 300px', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('textEl');
    el.set('type', elementType.Text);
    el.set('fontSize', 24);

    // Extreme shrink
    resizeText({
      element: el,
      oldBounds: { x: 0, y: 0, width: 100, height: 40 },
      newBounds: { x: 0, y: 0, width: 5, height: 2 },
      originalFontSize: 24,
    });
    assert.strictEqual(el.get('fontSize'), 8);

    // Extreme grow
    resizeText({
      element: el,
      oldBounds: { x: 0, y: 0, width: 100, height: 40 },
      newBounds: { x: 0, y: 0, width: 5000, height: 2000 },
      originalFontSize: 24,
    });
    assert.strictEqual(el.get('fontSize'), 300);
  });

  it('scales freehand points coordinates accurately during resize', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('fhEl');
    el.set('type', elementType.Freehand);
    el.set('x', 0);
    el.set('y', 0);
    el.set('width', 100);
    el.set('height', 100);

    const originalPoints: PointsFreeHand[] = [
      [10, 20, 0.5],
      [50, 60, 0.8],
    ];

    resizeFreehand({
      element: el,
      oldBounds: { x: 0, y: 0, width: 100, height: 100 },
      newBounds: { x: 50, y: 50, width: 200, height: 200 }, // 2x scale
      originalPoints,
    });

    assert.strictEqual(el.get('x'), 50);
    assert.strictEqual(el.get('width'), 200);

    const pointsArr = el.get('points') as Y.Array<Y.Map<number>>;
    assert.strictEqual(pointsArr.length, 2);
    const p1 = pointsArr.get(0);
    assert.strictEqual(p1.get('x'), 20); // 10 * 2
    assert.strictEqual(p1.get('y'), 40); // 20 * 2
  });
});
