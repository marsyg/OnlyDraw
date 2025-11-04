import {
  actionType,
  elementType,
  freeHandElement,
  OnlyDrawElement,
  point,
  
} from '@/types/type';
import { boundType } from '@/lib/utils/boundsUtility/getBounds';
import * as Y from 'yjs';
import { create } from 'zustand';

type CurrentTool = {
  action: actionType;
  elementType: elementType | null;
};

export type AppState = {
  elements: OnlyDrawElement[];
  currentTool: CurrentTool;
  selectedElementId?: string | null;
  toolbar: {
    activeToolId: string | null;
  };
  bound : boundType | null ;
  isDragging: boolean;
  isSelecting: boolean;
  isResizing: boolean;
  isDrawing: boolean;
  pointerPosition: point;
  resizeHandle?: string | null;
  selectedYElement : Y.Map<unknown> | null;
  
  //actions
  setBound : (bound : boundType | null) => void ;
  setYElement : (el : Y.Map<unknown> | null) => void;
  setResizeHandle: (handle: string | null) => void;
  setCurrentTool: (tool: CurrentTool) => void;
  addElement: (el: OnlyDrawElement) => void;
  updateElement: (id:string, data: Partial<OnlyDrawElement>) => void;
  setSelectedElementId: (id: string | null) => void;
  setIsDragging: (drag: boolean) => void;
  setIsDrawing: (draw: boolean) => void;
  setIsSelecting: (draw: boolean) => void;
  setIsResizing: (resize: boolean) => void;
  setActiveToolbarId: (id: string) => void;
  setPointerPosition: (pos: point) => void;
};

export const useAppStore = create<AppState>((set) => ({
  elements: [],
  bound : null ,
  selectedElementId: null,
  resizeHandle: null,
  currentTool: {
    action: actionType.Selecting,
    elementType: null,
  },
 
  isDrawing: false,
  isDragging: false,
  isResizing: false,
  isSelecting: false,
  selectedYElement : null,
  pointerPosition: [0, 0],
  toolbar: {
    activeToolId: null,
  },
  setBound : (bound) => set({ bound }),
  setYElement : (el) => set({ selectedYElement : el }),
  setResizeHandle: (handle) => set({ resizeHandle: handle }),
  setIsDrawing: (draw) => set({ isDrawing: draw }),
  setIsSelecting: (select) => set({ isSelecting: select }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  addElement: (el) => set((state) => ({ elements: [...state.elements, el] })),
  updateElement: (id, data) =>
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id !== id) return el;

        switch (el.type) {
          case elementType.Rectangle:
          case elementType.Ellipse:
          case elementType.Line:
            return { ...el, ...data } as typeof el;
          case elementType.Freehand:
            const freehandData = data as Partial<freeHandElement>;
            return {
              ...el,
              ...freehandData,
              stroke: freehandData.stroke ?? el.stroke,
            };
          default:
            return el;
        }
      }),
    })),

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  setIsDragging: (drag) => set({ isDragging: drag }),

  setIsResizing: (resize) => set({ isResizing: resize }),

  setPointerPosition: (pos) => set({ pointerPosition: pos }),

  setActiveToolbarId: (id) =>
    set((state) => ({
      toolbar: { ...state.toolbar, activeToolId: id },
    })),
}));
