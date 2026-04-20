import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import { isInsideRectangle } from '../src/lib/hitTest/rectangle';
import { isInsideEllipse } from '../src/lib/hitTest/ellipse';
import { isNearLine } from '../src/lib/hitTest/line';
import { isInsideText } from '../src/lib/hitTest/text';
import detectResizeHandle from '../src/lib/hitTest/detectResizeHandler';
import { elementType } from '../src/types/type';

describe('Hit Testing and Resize Handle Detection', () => {
  it('hits inside rectangle and misses outside', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el');
    el.set('x', 50);
    el.set('y', 50);
    el.set('width', 100);
    el.set('height', 80);

    assert.strictEqual(isInsideRectangle({ point: [100, 90], element: el }), true);
    assert.strictEqual(isInsideRectangle({ point: [40, 90], element: el }), false);
    assert.strictEqual(isInsideRectangle({ point: [160, 90], element: el }), false);
  });

  it('handles negative-dimension rectangle hit testing', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el');
    el.set('x', 150);
    el.set('y', 130);
    el.set('width', -100);
    el.set('height', -80);

    // Min X: 50, Max X: 150, Min Y: 50, Max Y: 130
    assert.strictEqual(isInsideRectangle({ point: [100, 90], element: el }), true);
    assert.strictEqual(isInsideRectangle({ point: [30, 90], element: el }), false);
  });

  it('hits inside ellipse and misses in bounding box corners', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el');
    el.set('x', 100);
    el.set('y', 100);
    el.set('width', 100);
    el.set('height', 100);

    // Center is (150, 150), radius 50
    assert.strictEqual(isInsideEllipse({ point: [150, 150], element: el }), true);
    // Point (105, 105) is inside the bounding box, but outside the inscribed circle!
    assert.strictEqual(isInsideEllipse({ point: [105, 105], element: el }), false);
  });

  it('hits line within tolerance threshold', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el');
    el.set('x', 0);
    el.set('y', 0);
    el.set('width', 100);
    el.set('height', 0);

    // Point on the line
    assert.strictEqual(isNearLine({ point: [50, 0], element: el }), true);
    // Point within tolerance (e.g. 3px off)
    assert.strictEqual(isNearLine({ point: [50, 3], element: el }), true);
    // Point far from line (e.g. 20px off)
    assert.strictEqual(isNearLine({ point: [50, 20], element: el }), false);
  });

  it('hits text element correctly', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el');
    el.set('x', 200);
    el.set('y', 200);
    el.set('width', 120);
    el.set('height', 40);

    assert.strictEqual(isInsideText({ point: [250, 220], element: el }), true);
    assert.strictEqual(isInsideText({ point: [190, 220], element: el }), false);
  });

  it('detects 8 resize handles and rotation handle', () => {
    const bounds = { x: 100, y: 100, width: 200, height: 100, angle: 0 };
    const pad = 8;
    const boxX = 100 - pad;
    const boxY = 100 - pad;
    const boxW = 200 + pad * 2;
    const boxH = 100 + pad * 2;

    // Rotation handle is boxX + boxW/2, boxY - 24
    const rotHit = detectResizeHandle({
      point: [boxX + boxW / 2, boxY - 24],
      element: bounds,
      tolerance: 8,
    });
    assert.ok(rotHit);
    assert.strictEqual(rotHit?.direction, 'rotate');

    // Northwest corner
    const nwHit = detectResizeHandle({
      point: [boxX, boxY],
      element: bounds,
      tolerance: 8,
    });
    assert.ok(nwHit);
    assert.strictEqual(nwHit?.direction, 'nw');

    // Southeast corner
    const seHit = detectResizeHandle({
      point: [boxX + boxW, boxY + boxH],
      element: bounds,
      tolerance: 8,
    });
    assert.ok(seHit);
    assert.strictEqual(seHit?.direction, 'se');

    // Far outside returns null
    const miss = detectResizeHandle({
      point: [500, 500],
      element: bounds,
      tolerance: 8,
    });
    assert.strictEqual(miss, null);
  });

  it('detects resize handles correctly on rotated elements', () => {
    const bounds = {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      angle: Math.PI / 2, // 90 degrees
      rotationAxis: 'center',
    };
    // Center is (150, 150).
    // The rotation handle is above the top of the box in unrotated space: (150, 100 - 8 - 24) = (150, 68).
    // Rotated 90 degrees around (150, 150):
    // (x - cx) = 0, (y - cy) = -82.
    // Rotated by +90 deg: x' = 150 - (-82)*sin(90) = 150 + 82 = 232, y' = 150.
    const rotHit = detectResizeHandle({
      point: [232, 150],
      element: bounds,
      tolerance: 8,
    });
    assert.ok(rotHit, 'Should detect rotation handle after 90 degree rotation');
    assert.strictEqual(rotHit?.direction, 'rotate');
  });
});
