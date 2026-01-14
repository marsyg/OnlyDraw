import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

const doc = new Y.Doc();
if (!doc) {
  throw new Error('Failed to create Yjs document');
}
console.log('Yjs store initialized');

export const LOCAL_ORIGIN = { local: true };
export const LIVE_ORIGIN = { live: true };

const elements = doc.getMap<Y.Map<unknown>>('elements');
const order = doc.getArray<string>('order');

// IndexedDB persistence — syncs on load, persists all changes automatically
export const persistence: IndexeddbPersistence | null =
  typeof window !== 'undefined'
    ? new IndexeddbPersistence('canvas-v1', doc)
    : null;

if (persistence) {
  persistence.on('synced', () => {
    console.log('[IndexedDB] Content loaded from local storage');
  });
}

const UndoManager = new Y.UndoManager([elements], {
  captureTimeout: 500,
  trackedOrigins: new Set([LOCAL_ORIGIN]),
});

UndoManager.on('stack-item-added', () => {
  console.log(
    'Undo stack item added. Current undo stack size:',
    UndoManager.undoStack.length
  );
});

UndoManager.on('stack-item-popped', () => {
  console.log(
    'Undo stack item removed. Current undo stack size:',
    UndoManager.undoStack.length
  );
});
export { UndoManager };
export const canvasDoc = {
  Y: Y,
  doc: doc,
  yElement: elements,
  order: order,
};

export default canvasDoc;
