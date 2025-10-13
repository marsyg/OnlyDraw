import { OnlyDrawElement, SharedDoc } from '@/types/type';
import * as Y from 'yjs'
import { YElement } from '@/types/type';

const doc = new Y.Doc();

const elements = doc.getMap<Y.Map<unknown>>('elements');
const order = doc.getArray<string>('order');

// yElement.observe(() => {
//   // Convert the Y.Map into a plain JavaScript object
//   const elements : OnlyDrawElement[] = [];
//   yElement.forEach((yElement, key) => {
  
//     const id  = yElement.id;
//     elements.push({ ...yElement, id  });  
//   });

//   // TODO Update the Zustand store with the new, synchronized data
//   });
  



export const canvasDoc = {
  doc: doc,
  yElement: elements,
  order: order
}

export default  canvasDoc ;