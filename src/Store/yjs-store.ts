import * as Y from 'yjs';
// import { YElement } from '@/types/type';
import { WebsocketProvider } from 'y-websocket';

const doc = new Y.Doc();
if (!doc) {
  throw new Error('Failed to create Yjs document');
}
console.log('Yjs store initialized');

// const wsProvider = new WebsocketProvider(
//   'ws://localhost:1234',
//   'my-roomname',
//   doc
// );
export const LOCAL_ORIGIN = { local: true };
export const LIVE_ORIGIN = { live: true };

const elements = doc.getMap<Y.Map<unknown>>('elements');
const order = doc.getArray<string>('order');
// wsProvider.on('status', (event) => {
//   console.log('Provider Status:', event.status);
// });

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
