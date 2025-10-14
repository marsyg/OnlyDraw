
import { nanoid } from 'nanoid';
import canvasDoc from '@/Store/yjs-store';
import { OnlyDrawElement } from '@/types/type';


const createYElement = (element : OnlyDrawElement) =>{
    const Y = canvasDoc.Y;
    const newElement = new Y.Map() ;
    newElement.set('id', nanoid());
    newElement.set('type', element.type);
    newElement.set('x', element.x);
    newElement.set('y', element.y);
    newElement.set('width', element.width);
    newElement.set('height', element.height);
    if(element.type==='freehand')newElement.set('stroke', element.stroke);
    newElement.set('isDeleted', element.isDeleted);
    newElement.set('author', canvasDoc.doc.clientID);
    canvasDoc.yElement.set(newElement.get('id') as string, newElement );
    canvasDoc.order.push([newElement.get('id') as string]);
    
    return newElement;
}

export default createYElement
