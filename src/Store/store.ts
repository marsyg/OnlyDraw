import { create } from 'zustand';
type Point = [number , number , number ]
type Stroke = {
    points : Point[]
    timeStamp : number 
}

type pointerStore = {
    points : Point[] ,
    addPoint : (point : Point) => void 
     setPoint : (points : Point[]) => void 
    clearPoint : () => void 
}
type strokeStore = {
    allStrokes : Stroke[]
    currentStroke : Stroke ;
    startingStroke : (point : Point)=> void
    continueStroke : (point : Point)=> void
    endStroke : ()=> void 
    clearAllStroke  :  () => void 
}
export const useDraw = create<pointerStore>((set) => ({
    points: [] ,
    addPoint: (point) =>
        set((state) => ({
            points: [...state.points,  point ]
        })),
     setPoint: (points) =>
        set(() => ({
            points: points 
        })),


     clearPoint: () => set({ points: [] }),
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