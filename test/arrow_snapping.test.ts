import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import {
  getElementSnapPoints,
  findNearestSnapTarget,
  getBindingPosition,
  cleanupArrowBindings,
  SNAP_RADIUS,
} from '../src/lib/arrowSnap';
import { elementType } from '../src/types/type';

describe('Arrow Snapping and Dynamic Binding', () => {
  it('computes 5 snap locations (center, top, bottom, left, right) for a shape', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el1');
    el.set('id', 'el1');
    el.set('type', elementType.Rectangle);
    el.set('x', 100);
    el.set('y', 100);
    el.set('width', 200);
    el.set('height', 100);

    const { snapPoints, bounds } = getElementSnapPoints(el);
    assert.strictEqual(snapPoints.length, 5);
    assert.strictEqual(bounds.width, 200);
    assert.strictEqual(bounds.height, 100);

    const center = snapPoints.find((sp) => sp.location === 'center');
    assert.ok(center);
    assert.strictEqual(center.x, 200); // 100 + 100
    assert.strictEqual(center.y, 150); // 100 + 50

    const top = snapPoints.find((sp) => sp.location === 'top');
    assert.ok(top);
    assert.strictEqual(top.x, 200);
    assert.strictEqual(top.y, 100);

    const left = snapPoints.find((sp) => sp.location === 'left');
    assert.ok(left);
    assert.strictEqual(left.x, 100);
    assert.strictEqual(left.y, 150);
  });

  it('snaps to nearest point within SNAP_RADIUS', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const el = new Y.Map<unknown>();
    el.set('id', 'target1');
    el.set('type', elementType.Rectangle);
    el.set('x', 100);
    el.set('y', 100);
    el.set('width', 100);
    el.set('height', 100);
    root.set('target1', el);

    // Center is (150, 150). Cursor at (155, 152) is ~5.8px away (< SNAP_RADIUS)
    const target = findNearestSnapTarget([155, 152], root);
    assert.ok(target, 'Should find snap target');
    assert.strictEqual(target?.elementId, 'target1');
    assert.strictEqual(target?.location, 'center');
    assert.strictEqual(target?.x, 150);
    assert.strictEqual(target?.y, 150);
  });

  it('ignores freehand and other arrows for snapping targets', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const arrow = new Y.Map<unknown>();
    arrow.set('id', 'arrow1');
    arrow.set('type', elementType.Arrow);
    arrow.set('x', 0);
    arrow.set('y', 0);
    arrow.set('width', 100);
    arrow.set('height', 0);
    root.set('arrow1', arrow);

    const target = findNearestSnapTarget([50, 0], root);
    assert.strictEqual(target, null, 'Should not snap to arrow elements');
  });

  it('resolves dynamic binding position when shape moves or resizes', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const rect = new Y.Map<unknown>();
    rect.set('id', 'r1');
    rect.set('type', elementType.Rectangle);
    rect.set('x', 50);
    rect.set('y', 50);
    rect.set('width', 100);
    rect.set('height', 100);
    root.set('r1', rect);

    const initialPos = getBindingPosition({ elementId: 'r1', point: 'right' }, root);
    assert.ok(initialPos);
    assert.strictEqual(initialPos[0], 150); // 50 + 100
    assert.strictEqual(initialPos[1], 100); // 50 + 50

    // Now move the rectangle to x=200, y=300
    rect.set('x', 200);
    rect.set('y', 300);

    const updatedPos = getBindingPosition({ elementId: 'r1', point: 'right' }, root);
    assert.ok(updatedPos);
    assert.strictEqual(updatedPos[0], 300); // 200 + 100
    assert.strictEqual(updatedPos[1], 350); // 300 + 50
  });

  it('returns null if bound element was deleted', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const rect = new Y.Map<unknown>();
    rect.set('id', 'deleted_el');
    rect.set('type', elementType.Rectangle);
    rect.set('isDeleted', true);
    root.set('deleted_el', rect);

    const pos = getBindingPosition({ elementId: 'deleted_el', point: 'center' }, root);
    assert.strictEqual(pos, null, 'Should return null for deleted target');
  });

  it('gracefully bakes endpoints and cleans up arrow bindings when connected shape is deleted', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const rect = new Y.Map<unknown>();
    rect.set('id', 'r_source');
    rect.set('type', elementType.Rectangle);
    rect.set('x', 100);
    rect.set('y', 100);
    rect.set('width', 100);
    rect.set('height', 100);
    root.set('r_source', rect);

    const arrow = new Y.Map<unknown>();
    arrow.set('id', 'a1');
    arrow.set('type', elementType.Arrow);
    arrow.set('x', 0);
    arrow.set('y', 0);
    arrow.set('width', 50);
    arrow.set('height', 50);
    arrow.set('startBinding', { elementId: 'r_source', point: 'right' });
    arrow.set('endBinding', null);
    root.set('a1', arrow);

    cleanupArrowBindings(new Set(['r_source']), root);

    assert.strictEqual(arrow.get('startBinding'), null);
    assert.strictEqual(arrow.get('x'), 200);
    assert.strictEqual(arrow.get('y'), 150);
  });
});

