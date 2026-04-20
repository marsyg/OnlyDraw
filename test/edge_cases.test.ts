import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import { getBounds } from '../src/lib/utils/boundsUtility/getBounds';
import { isInsideRectangle } from '../src/lib/hitTest/rectangle';
import { isNearLine } from '../src/lib/hitTest/line';
import { isInsideText } from '../src/lib/hitTest/text';
import resizeBound from '../src/lib/resizeBound';
import { groupElements, ungroupElements, parseGroupIds } from '../src/lib/grouping';
import { getBindingPosition } from '../src/lib/arrowSnap';
import { elementType } from '../src/types/type';

describe('Edge Cases and Boundary Conditions', () => {
  it('handles zero-dimension elements without NaN or crashing', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('zero');
    el.set('type', elementType.Rectangle);
    el.set('x', 50);
    el.set('y', 50);
    el.set('width', 0);
    el.set('height', 0);

    const b = getBounds({ element: el });
    assert.strictEqual(b.width, 0);
    assert.strictEqual(b.height, 0);
    assert.strictEqual(b.x, 50);
    assert.strictEqual(b.y, 50);

    // Hit test at exact point
    const hit = isInsideRectangle({ point: [50, 50], element: el });
    assert.strictEqual(hit, true);
    // Hit test outside
    const miss = isInsideRectangle({ point: [51, 50], element: el });
    assert.strictEqual(miss, false);
  });

  it('handles negative coordinates and canvas panning ranges', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('neg');
    el.set('type', elementType.Rectangle);
    el.set('x', -500);
    el.set('y', -300);
    el.set('width', 200);
    el.set('height', 150);

    const b = getBounds({ element: el });
    assert.strictEqual(b.x, -500);
    assert.strictEqual(b.y, -300);
    assert.strictEqual(b.width, 200);
    assert.strictEqual(b.height, 150);

    assert.strictEqual(isInsideRectangle({ point: [-400, -200], element: el }), true);
    assert.strictEqual(isInsideRectangle({ point: [0, 0], element: el }), false);
  });

  it('handles resizeBound inversion when handle crosses zero boundary', () => {
    const original = { x: 100, y: 100, width: 20, height: 20 };
    // Drag 'se' handle 100px leftwards and 100px upwards (crossing 'nw')
    const res = resizeBound('se', [120, 120], [20, 20], original, false);
    assert.ok(res.width >= 0);
    assert.ok(res.height >= 0);
    assert.strictEqual(res.width, 80);
    assert.strictEqual(res.height, 80);
    assert.strictEqual(res.x, 20);
    assert.strictEqual(res.y, 20);
  });

  it('handles line hit testing when line is a single point (width=0, height=0)', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('pointLine');
    el.set('type', elementType.Line);
    el.set('x', 100);
    el.set('y', 100);
    el.set('width', 0);
    el.set('height', 0);

    // Should hit within tolerance (threshold is 8px)
    assert.strictEqual(isNearLine({ point: [100, 102], element: el }), true);
    // Should miss outside tolerance
    assert.strictEqual(isNearLine({ point: [120, 120], element: el }), false);
  });

  it('gracefully handles arrow binding to non-existent or deleted target element', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const nonExistentPos = getBindingPosition(
      { elementId: 'ghost_id', point: 'center' },
      root
    );
    assert.strictEqual(nonExistentPos, null);

    const deletedEl = new Y.Map<unknown>();
    deletedEl.set('id', 'd1');
    deletedEl.set('isDeleted', true);
    root.set('d1', deletedEl);

    const deletedPos = getBindingPosition(
      { elementId: 'd1', point: 'top' },
      root
    );
    assert.strictEqual(deletedPos, null);
  });

  it('handles nested grouping without corrupting parent or child group IDs', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const e1 = new Y.Map<unknown>();
    e1.set('id', 'e1');
    root.set('e1', e1);

    const e2 = new Y.Map<unknown>();
    e2.set('id', 'e2');
    root.set('e2', e2);

    const e3 = new Y.Map<unknown>();
    e3.set('id', 'e3');
    root.set('e3', e3);

    // Inner group
    const innerGrp = groupElements(['e1', 'e2'], root, doc);
    assert.ok(innerGrp);

    // Outer group with e3
    const outerGrp = groupElements(['e1', 'e2', 'e3'], root, doc);
    assert.ok(outerGrp);

    // e1 should contain both innerGrp and outerGrp
    const gIds1 = parseGroupIds(e1);
    assert.strictEqual(gIds1.length, 2);
    assert.strictEqual(gIds1[0], innerGrp);
    assert.strictEqual(gIds1[1], outerGrp);

    // Ungrouping outermost removes outerGrp, leaves innerGrp intact
    ungroupElements(['e1'], root, doc);
    const gIds1After = parseGroupIds(e1);
    assert.deepStrictEqual(gIds1After, [innerGrp]);
    const gIds3After = parseGroupIds(e3);
    assert.deepStrictEqual(gIds3After, []);
  });

  it('handles text with empty content or whitespace', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('emptyText');
    el.set('type', elementType.Text);
    el.set('text', '   ');
    el.set('x', 200);
    el.set('y', 200);
    el.set('width', 0);
    el.set('height', 0);

    // Hit test uses fallback 60x30 width/height when not measured
    const hit = isInsideText({ point: [210, 210], element: el });
    assert.strictEqual(hit, true);
  });
});
