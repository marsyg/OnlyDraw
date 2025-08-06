import {
  actionType,
  elementType,
  freeHandElement,
  OnlyDrawElement,
  point,
} from '@/types/type';

import { create } from 'zustand';

type CurrentTool = {
  actionType: actionType;
  elementType: elementType | null;
};

export type AppState = {
  elements: OnlyDrawElement[];
  currentTool: CurrentTool;
  selectedElementId?: number;
  toolbar: {
    activeToolId: string | null;
  };
  isDragging: boolean;
  isSelecting: boolean;
  isResizing: boolean;
  isDrawing: boolean;
  pointerPosition: point;

  //actions

  setCurrentTool: (tool: CurrentTool) => void;
  addElement: (el: OnlyDrawElement) => void;
  updateElement: (id: number, data: Partial<OnlyDrawElement>) => void;
  setSelectedElementId: (id: number) => void;
  setIsDragging: (drag: boolean) => void;
  setIsDrawing: (draw: boolean) => void;
  setIsSelecting: (draw: boolean) => void;
  setIsResizing: (resize: boolean) => void;
  setActiveToolbarId: (id: string) => void;
  setPointerPosition: (pos: point) => void;
};

export const useAppStore = create<AppState>((set) => ({
  elements: [],
  selectedElementId: 0,
  currentTool: {
    actionType: actionType.Selecting,
    elementType: null,
  },
  isDrawing: false,
  isDragging: false,
  isResizing: false,
  isSelecting: false,
  pointerPosition: [0, 0],
  toolbar: {
    activeToolId: null,
  },
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
          case elementType.ellipse:
          case elementType.line:
            return { ...el, ...data } as typeof el;
          case elementType.freehand:
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
