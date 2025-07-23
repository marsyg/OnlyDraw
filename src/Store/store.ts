import { actionType, elementType, OnlyDrawElement, point } from '@/types/type';
import { create } from 'zustand';
type Point = [number , number , number ]
type Stroke = {
    points : Point[]
    timeStamp : number 
}

type strokeStore = {
    allStrokes : Stroke[]
    currentStroke : Stroke ;
    startingStroke : (point : Point)=> void
    continueStroke : (point : Point)=> void
    endStroke : ()=> void 
    clearAllStroke  :  () => void 
}

type CurrentTool = {
  actionType: actionType;
  elementType: elementType | null;
};
export type AppState = {

  elements : OnlyDrawElement[]
  currentTool : CurrentTool
  selectedElementId?  : number |null
  toolbar :{
    activeToolId : string | null 
  }
  isDragging : boolean
  isResizing : boolean 

   pointerPosition: point
  
  //actions 

  setCurrentTool : (tool : CurrentTool) => void
  addElement : ( el : OnlyDrawElement) => void 
  updateElement : (id : number , data  : Partial<OnlyDrawElement>) => void
  setSelectedElementId : (id : number ) => void 
  setIsDragging : (drag : boolean ) => void 
  setIsResizing : (resize : boolean) => void
  setActiveToolbarId : ( id : string) => void
  setPointerPosition : (pos : point) => void 
}


export const useAppStore = create<AppState>((set) => ({
  elements: [],
  selectedElementId: null,
  currentTool: {
    actionType: actionType.Selecting,
    elementType: null,
  },
  isDragging: false,
  isResizing: false,
  pointerPosition: [0, 0],
  toolbar: {
    activeToolId: null,
  },

  setCurrentTool: (tool) => set({ currentTool: tool }),
  addElement: (el) => set((state) => ({ elements: [...state.elements, el] })),
  updateElement: (id, data) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...data } : el
      ),
    })),

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  setIsDragging: (drag) => set({ isDragging: drag }),

  setIsResizing: (resize) => set({ isResizing: resize }),

  setPointerPosition: (pos) => set({ pointerPosition: pos }),
  
  setActiveToolbarId: (id) => set((state) => ({
    toolbar: { ...state.toolbar, activeToolId: id }
  })),
}));

export const useStroke = create<strokeStore>((set) => ({
  allStrokes: [],
  currentStroke: { points: [], timeStamp: Date.now() },

  startingStroke: (point) =>
    set(() => ({
      currentStroke: {
        points: [point],
        timeStamp: Date.now(),
      },
    })),

  continueStroke: (point) =>
    set((state) => ({
      currentStroke: {
        ...state.currentStroke,
        points: [...state.currentStroke.points, point],
      },
    })),

  endStroke: () =>
    set((state) => ({
      allStrokes: [...state.allStrokes, state.currentStroke],
      currentStroke: { points: [], timeStamp: Date.now() },
    })),
   
  clearAllStroke  : () => set({allStrokes :[]})
}));