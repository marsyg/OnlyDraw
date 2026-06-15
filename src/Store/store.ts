import {
  actionType,
  elementType,
  freeHandElement,
  OnlyDrawElement,
  point,
} from '@/types/type';
import { boundType } from '@/lib/utils/boundsUtility/getBounds';
import type * as Y from 'yjs';
import { create } from 'zustand';

type CurrentTool = {
  action: actionType;
  elementType: elementType | null;
};
export type ShapeType = 'rect' | 'circle' | 'line' | 'freehand';
export type FillStyle = 'solid' | 'hachure' | 'dots' | 'zigzag';
export type BoundaryStyle = 'solid' | 'dashed' | 'dotted';
export type Camera = { x: number; y: number; scale: number };
export type AppState = {
  elements: OnlyDrawElement[];
  currentTool: CurrentTool;
  selectedElementId?: string | null;
  selectedElementIds: string[];
  toolbar: {
    activeToolId: string | null;
  };
  bound: boundType | null;
  strokeColor: string;
  fillColor: string;
  isDragging: boolean;
  isSelecting: boolean;
  isResizing: boolean;
  isDrawing: boolean;
  pointerPosition: point;
  resizeHandle?: string | null;
  selectedYElement: Y.Map<unknown> | null;
  isFillTransparent: boolean;
  strokeWidth: number;
  roughness: number;
  fillStyle: FillStyle;
  fillWeight: number;
  shapeType: ShapeType;
  boundaryStyle: BoundaryStyle;
  isAdvancedOpen: boolean;
  hasShadow: boolean;
  opacity: number;
  rotation: number;
  rotationAxis: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  camera: Camera;
  clipboard: Record<string, unknown> | Record<string, unknown>[] | null;
  //actions
  setFontSize: (v: number) => void;
  setFontFamily: (v: string) => void;
  setTextAlign: (v: 'left' | 'center' | 'right') => void;
  setClipboard: (item: Record<string, unknown> | Record<string, unknown>[] | null) => void;
  setBound: (bound: boundType | null) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setYElement: (el: Y.Map<unknown> | null) => void;
  setResizeHandle: (handle: string | null) => void;
  setCurrentTool: (tool: CurrentTool) => void;
  addElement: (el: OnlyDrawElement) => void;
  updateElement: (id: string, data: Partial<OnlyDrawElement>) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setIsDragging: (drag: boolean) => void;
  setIsDrawing: (draw: boolean) => void;
  setIsSelecting: (draw: boolean) => void;
  setIsResizing: (resize: boolean) => void;
  setActiveToolbarId: (id: string) => void;
  setPointerPosition: (pos: point) => void;
  setIsFillTransparent: (v: boolean) => void;
  setStrokeWidth: (v: number) => void;
  setRoughness: (v: number) => void;
  setFillStyle: (v: FillStyle) => void;
  setFillWeight: (v: number) => void;
  setShapeType: (v: ShapeType) => void;
  setBoundaryStyle: (v: BoundaryStyle) => void;
  setIsAdvancedOpen: (v: boolean) => void;
  setHasShadow: (v: boolean) => void;
  setOpacity: (v: number) => void;
  setRotation: (v: number) => void;
  setRotationAxis: (axis: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  setCamera: (camera: Camera) => void;
  panCamera: (dx: number, dy: number) => void;
  zoomCamera: (delta: number, centerX: number, centerY: number) => void;
  resetCamera: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  elements: [],
  bound: null,
  selectedElementId: null,
  selectedElementIds: [],
  resizeHandle: null,
  currentTool: {
    action: actionType.Selecting,
    elementType: null,
  },
  strokeColor: '#1e293b',
  fillColor: '#dbeafe',
  isDrawing: false,
  isDragging: false,
  isResizing: false,
  isSelecting: false,
  selectedYElement: null,
  pointerPosition: [0, 0],
  toolbar: {
    activeToolId: null,
  },

  isFillTransparent: true,
  strokeWidth: 2,
  roughness: 0,
  fillStyle: 'solid',
  fillWeight: 3,
  shapeType: 'rect',
  boundaryStyle: 'solid',
  isAdvancedOpen: false,
  hasShadow: false,
  opacity: 1,
  rotation: 0,
  rotationAxis: 'center',
  fontSize: 24,
  fontFamily: 'sans-serif',
  textAlign: 'left',
  camera: { x: 0, y: 0, scale: 1 },
  clipboard: null,

  setFontSize: (v) => set({ fontSize: v }),
  setFontFamily: (v) => set({ fontFamily: v }),
  setTextAlign: (v) => set({ textAlign: v }),
  setClipboard: (item) => set({ clipboard: item }),
  setBound: (bound) => set({ bound }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setYElement: (el) => set({ selectedYElement: el }),
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
          case elementType.Arrow:
          case elementType.ArrowTwoWay:
          case elementType.Text:
          case elementType.Image:
            return { ...el, ...(data as Record<string, unknown>) } as typeof el;
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
  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),

  setIsDragging: (drag) => set({ isDragging: drag }),

  setIsResizing: (resize) => set({ isResizing: resize }),

  setPointerPosition: (pos) => set({ pointerPosition: pos }),

  setActiveToolbarId: (id) =>
    set((state) => ({
      toolbar: { ...state.toolbar, activeToolId: id },
    })),

  setIsFillTransparent: (v) => set({ isFillTransparent: v }),
  setStrokeWidth: (v) => set({ strokeWidth: v }),
  setRoughness: (v) => set({ roughness: v }),
  setFillStyle: (v) => set({ fillStyle: v }),
  setFillWeight: (v) => set({ fillWeight: v }),
  setShapeType: (v) => set({ shapeType: v }),
  setBoundaryStyle: (v) => set({ boundaryStyle: v }),
  setIsAdvancedOpen: (v) => set({ isAdvancedOpen: v }),
  setHasShadow: (v) => set({ hasShadow: v }),
  setOpacity: (v) => set({ opacity: v }),
  setRotation: (v) => set({ rotation: v }),
  setRotationAxis: (axis) => set({ rotationAxis: axis }),
  setCamera: (camera) => set({ camera }),
  panCamera: (dx, dy) =>
    set((state) => ({
      camera: { ...state.camera, x: state.camera.x + dx, y: state.camera.y + dy },
    })),
  zoomCamera: (delta, centerX, centerY) =>
    set((state) => {
      const MIN_SCALE = 0.05;
      const MAX_SCALE = 20;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.camera.scale * zoomFactor));
      const scaleRatio = newScale / state.camera.scale;
      return {
        camera: {
          x: centerX - scaleRatio * (centerX - state.camera.x),
          y: centerY - scaleRatio * (centerY - state.camera.y),
          scale: newScale,
        },
      };
    }),
  resetCamera: () => set({ camera: { x: 0, y: 0, scale: 1 } }),
}));
