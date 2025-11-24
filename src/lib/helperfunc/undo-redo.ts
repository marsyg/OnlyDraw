import { UndoManager } from '@/Store/yjs-store';
const handleUndo = () => {
  if (UndoManager.undoStack.length > 0) {
   

   
    UndoManager.undo();
  }
};

const handleRedo = () => {
  if (UndoManager.redoStack.length > 0) {
    UndoManager.redo();
  }
};
export { handleUndo, handleRedo };
