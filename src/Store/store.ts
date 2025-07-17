import { create } from 'zustand';
type Point = [number , number , number ]

type pointerStore = {
    points : Point[] ,
    addPoint : (point : Point) => void 
     setPoint : (points : Point[]) => void 
    clearPoint : () => void 
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

