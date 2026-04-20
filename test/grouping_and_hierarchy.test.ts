import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as Y from 'yjs';
import {
  parseGroupIds,
  getGroupMembers,
  groupElements,
  ungroupElements,
  isElementGrouped,
} from '../src/lib/grouping';

describe('Element Grouping and Hierarchy', () => {
  it('parses group IDs from stringified JSON or array', () => {
    const doc = new Y.Doc();
    const el = doc.getMap('el');

    assert.deepStrictEqual(parseGroupIds(el), []);

    el.set('groupIds', JSON.stringify(['g1', 'g2']));
    assert.deepStrictEqual(parseGroupIds(el), ['g1', 'g2']);

    el.set('groupIds', ['g3']);
    assert.deepStrictEqual(parseGroupIds(el), ['g3']);

    el.set('groupIds', 'invalid json string');
    assert.deepStrictEqual(parseGroupIds(el), []);
  });

  it('rejects grouping with less than 2 elements', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');
    const gid = groupElements(['single_el'], root, doc);
    assert.strictEqual(gid, null);
  });

  it('groups multiple elements and assigns group ID to all members', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const el1 = new Y.Map<unknown>();
    el1.set('id', 'el1');
    root.set('el1', el1);

    const el2 = new Y.Map<unknown>();
    el2.set('id', 'el2');
    root.set('el2', el2);

    const gid = groupElements(['el1', 'el2'], root, doc);
    assert.ok(gid);
    assert.ok(gid.startsWith('grp_'));

    assert.deepStrictEqual(parseGroupIds(el1), [gid]);
    assert.deepStrictEqual(parseGroupIds(el2), [gid]);
    assert.strictEqual(isElementGrouped(el1), true);
  });

  it('resolves all group members when any child is queried', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const el1 = new Y.Map<unknown>();
    el1.set('id', 'el1');
    root.set('el1', el1);

    const el2 = new Y.Map<unknown>();
    el2.set('id', 'el2');
    root.set('el2', el2);

    const gid = groupElements(['el1', 'el2'], root, doc);
    assert.ok(gid);

    const membersFrom1 = getGroupMembers(el1, root);
    assert.strictEqual(membersFrom1.length, 2);
    assert.ok(membersFrom1.includes('el1'));
    assert.ok(membersFrom1.includes('el2'));

    const membersFrom2 = getGroupMembers(el2, root);
    assert.deepStrictEqual(membersFrom1.sort(), membersFrom2.sort());
  });

  it('ungroups elements cleanly, stripping group IDs', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');

    const el1 = new Y.Map<unknown>();
    el1.set('id', 'el1');
    root.set('el1', el1);

    const el2 = new Y.Map<unknown>();
    el2.set('id', 'el2');
    root.set('el2', el2);

    groupElements(['el1', 'el2'], root, doc);
    assert.strictEqual(isElementGrouped(el1), true);

    ungroupElements(['el1'], root, doc);
    assert.strictEqual(isElementGrouped(el1), false);
    assert.strictEqual(isElementGrouped(el2), false);
    assert.deepStrictEqual(parseGroupIds(el1), []);
    assert.deepStrictEqual(parseGroupIds(el2), []);
  });

  it('handles ungroup on already ungrouped elements safely', () => {
    const doc = new Y.Doc();
    const root = doc.getMap<Y.Map<unknown>>('elements');
    const el = new Y.Map<unknown>();
    el.set('id', 'free_el');
    root.set('free_el', el);

    // Should not throw or alter element
    ungroupElements(['free_el'], root, doc);
    assert.strictEqual(isElementGrouped(el), false);
  });
});
