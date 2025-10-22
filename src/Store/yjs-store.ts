import { OnlyDrawElement, SharedDoc } from '@/types/type';
import * as Y from 'yjs';
import { YElement } from '@/types/type';
import { WebsocketProvider } from 'y-websocket';

const doc = new Y.Doc();
if (!doc) {
  throw new Error('Failed to create Yjs document');
}
console.log('Yjs store initialized');

const wsProvider = new WebsocketProvider(
  'ws://localhost:1234',
  'my-roomname',
  doc
);

const elements = doc.getMap<Y.Map<unknown>>('elements');
const order = doc.getArray<string>('order');
wsProvider.on('status', (event) => {
  console.log('Provider Status:', event.status);
});

export const canvasDoc = {
  Y: Y,
  doc: doc,
  yElement: elements,
  order: order,
};

export default canvasDoc;
