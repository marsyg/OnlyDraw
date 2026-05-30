import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

const globalStore = globalThis as unknown as {
  __canvas_doc__?: Y.Doc;
  __canvas_persistence__?: IndexeddbPersistence | null;
  __canvas_undo_manager__?: Y.UndoManager;
};

export const LOCAL_ORIGIN = { local: true };
export const LIVE_ORIGIN = { live: true };

const doc = globalStore.__canvas_doc__ ?? new Y.Doc();
globalStore.__canvas_doc__ = doc;

const elements = doc.getMap<Y.Map<unknown>>('elements');
const order = doc.getArray<string>('order');

// IndexedDB persistence — syncs on load, persists all changes automatically
let persistence = globalStore.__canvas_persistence__ ?? null;
if (typeof window !== 'undefined' && !persistence) {
  try {
    persistence = new IndexeddbPersistence('canvas-v1', doc);
    globalStore.__canvas_persistence__ = persistence;
    persistence.on('synced', () => {
      console.log('[IndexedDB] Content loaded from local storage');
    });
  } catch (err) {
    console.warn('[IndexedDB] Persistence initialization warning:', err);
  }
}

const UndoManager =
  globalStore.__canvas_undo_manager__ ??
  new Y.UndoManager([elements], {
    captureTimeout: 500,
    trackedOrigins: new Set([LOCAL_ORIGIN]),
  });
globalStore.__canvas_undo_manager__ = UndoManager;

export { persistence, UndoManager };
export const canvasDoc = {
  Y: Y,
  doc: doc,
  yElement: elements,
  order: order,
};

export default canvasDoc;

