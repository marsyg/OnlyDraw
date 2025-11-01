'use client';

import rough from 'roughjs';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import Toolbar from '@/component/toolbar';
import { OnlyDrawElement, point, PointsFreeHand, Stroke } from '@/types/type';
import { actionType, elementType } from '@/types/type';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
import { isPointInsideElement } from '@/lib/utils/drawingUtility/hitTest';
import { DrawBounds } from '@/lib/drawBounds';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { DragElements } from '@/lib/dragElement';
import canvasDoc from '@/Store/yjs-store';
import * as Y from 'yjs';
import { Point } from 'roughjs/bin/geometry';
import { boundType } from '@/lib/utils/boundsUtility/getBounds';
import yUtils from '@/lib/utils/createYElement';
import { handleUndo, handleRedo } from '@/lib/helperfunc/undo-redo';
import { UndoManager as undoManager } from '@/Store/yjs-store';

export default function App() {
  const { doc, yElement, order } = canvasDoc;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    setPointerPosition,
    currentTool,
    addElement,
    setSelectedElementId,
    selectedElementId,
    elements,
    setIsDrawing,
    setIsDragging,
    isDragging,
    isDrawing,
    pointerPosition,
    updateElement,
    setIsSelecting,
    isSelecting
  } = useAppStore();

  const [freehandPoint, setFreehandPoint] = useState<PointsFreeHand[]>([
    [pointerPosition[0], pointerPosition[1], 1] as PointsFreeHand,
  ]);
  const [CursorStyle, setCursorStyle] = useState("default")
  const [SelectedElement, setSelectedElement] = useState<OnlyDrawElement | null>(null)
  const [selectedYElement, setSelectedYElement] = useState<Y.Map<unknown> | null>(null)
  const [GlobalPointerPosition, setGlobalPointerPosition] = useState<Point | null>(null)
  const generatorRef = useRef<RoughGenerator | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const [Bound, setBound] = useState<boundType | null>(null)
  const flagRef = useRef<boolean>(false)
  const animationFrameIdRef = useRef<number | null>(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    yElement.forEach(el => DrawElements({ ctx, element: el }));
    if (selectedYElement && Bound) DrawBounds({ context: ctx, bounds: Bound });
  }, [yElement, selectedYElement, Bound]);

  const scheduleRender = useCallback(() => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(renderCanvas);
  }, [renderCanvas]);

  // return coords synchronously and update pointerPosition state (but prefer using returned coords)
  const getMOuseCoordinate = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0] as [number, number];
    const rect = canvas.getBoundingClientRect();
    const X = e.clientX - rect.left;
    const Y = e.clientY - rect.top;
    setPointerPosition([X, Y]);
    return [X, Y] as [number, number];
  };

  const hitTestAtPoint = (pt: point) => {
    // use the order (top-most last) to find topmost element under pt
    for (let i = order.length - 1; i >= 0; i--) {
      const elementId = order.get(i) as string;
      const element = yElement.get(elementId);
      if (!element) continue;
      if (isPointInsideElement({ point: pt, element })) {
        return { id: elementId, yEl: element };
      }
    }
    // fallback to local elements array if needed
    // for (let i = elements.length - 1; i >= 0; i--) {
    //   const el = elements[i];
    //   if (isPointInsideElement({ point: pt, element: el })) return { id: el.id, yEl: yElement.get(el.id) as Y.Map<unknown> | undefined };
    // }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const [x, y] = getMOuseCoordinate(e);
    const initialPoint: point = [x, y];
    setFreehandPoint([[initialPoint[0], initialPoint[1], 1] as PointsFreeHand]);

    // If selecting tool: perform immediate hit-test and start dragging if clicked an element
    if (currentTool.action === actionType.Selecting) {
      const hit = hitTestAtPoint(initialPoint);
      if (hit && hit.yEl) {
        // setSelectedElementId(hit.id);
        setSelectedYElement(hit.yEl);
        setIsDragging(true);
        setGlobalPointerPosition([x, y]);
        flagRef.current = true;
        // capture pointer so we get consistent move/up events
        try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { }
      } else {
        setSelectedYElement(null);
        setIsDragging(false);
      }
      return;
    }

    // Drawing tool: create element and use returned Y element to start drawing immediately
    if (currentTool.action === actionType.Drawing) {
      const element = handleDrawElement({
        action: actionType.Drawing,
        element: currentTool.elementType,
        startPoint: initialPoint,
        endPoint: initialPoint,
        stroke: {
          points: [[initialPoint[0], initialPoint[1], 1]],
        },
      });
      if (!element) return;

      try {
        if (!doc) throw new Error("Y.Doc is not initialized");
        let createdYEl: Y.Map<unknown> | null = null;
        doc.transact(() => {
          createdYEl = yUtils.createYElement(element);
          // ensure it exists in shared map
          if (!yElement.get(element.id) && createdYEl) {
            yElement.set(element.id, createdYEl);
            order.push([element.id]);
          }
        }, doc.clientID);
        // start drawing immediately using createdYEl (don't rely on selectedYElement state)
        if (createdYEl) {
          setSelectedYElement(createdYEl);
          // addElement(element);
          setSelectedElementId(element.id);
          setIsDrawing(true);
          setGlobalPointerPosition([x, y]);
          try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { }
        }
      } catch (error) {
        console.error("error in creating y element", error);
      }
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const [x, y] = getMOuseCoordinate(e);
    const pt: point = [x, y];

    // Selection hover logic (only when not dragging)
    if (currentTool.action === actionType.Selecting && !isDragging) {
      let found = false;
      for (let i = order.length - 1; i >= 0; i--) {
        const elementId = order.get(i) as string;
        const element = yElement.get(elementId);
        if (!element) continue;
        const isHit = isPointInsideElement({ point: pt, element });
        flagRef.current = isHit;
        if (isHit) {
          found = true;
          setSelectedYElement(element);
          setCursorStyle("grab");
          // corner detection
          const w = element.get('width') as number || 0;
          const h = element.get('height') as number || 0;
          const ex = element.get('x') as number || 0;
          const ey = element.get('y') as number || 0;
          const cornerX = ex + w;
          const cornerY = ey + h;
          const dx = x - cornerX;
          const dy = y - cornerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 10)
            setCursorStyle("se-resize");
          break;
        }
      }
      if (!found) {
        setSelectedYElement(null);
        setCursorStyle("default");
      }
    }

    // If not drawing or dragging, nothing to do
    if (!isDrawing && !isDragging) return;

    // Drawing update: use x,y directly and update shared element via yUtils
    if (currentTool.action === actionType.Drawing) {
      if (!selectedYElement) return;
      const elementJSON = selectedYElement.toJSON() as OnlyDrawElement;
      const type = selectedYElement.get('type') as unknown as elementType;
      if (type === elementType.Freehand) {
        const newPoints: PointsFreeHand[] = [...freehandPoint, [x, y, 1] as PointsFreeHand];
        setFreehandPoint(newPoints);
        const stroke: Stroke = { points: newPoints };
        const updatedElement = {
          ...(elementJSON as Extract<OnlyDrawElement, { type: elementType.Freehand }>),
          width: x - elementJSON.x,
          height: y - elementJSON.y,
          stroke,
        } as Extract<OnlyDrawElement, { type: elementType.Freehand }>;
        yUtils.updateYelement(updatedElement, selectedYElement);
        scheduleRender();
      } else {
        const updatedElement = {
          ...elementJSON,
          width: x - elementJSON.x,
          height: y - elementJSON.y,
        };
        yUtils.updateYelement(updatedElement, selectedYElement);
        scheduleRender();
      }
      return;
    }

    // Dragging update: compute movement from GlobalPointerPosition (initial down) to current x,y
    if (isDragging) {
      if (!GlobalPointerPosition || !selectedYElement) return;
      const updatedElement = DragElements({
        initialPosition: GlobalPointerPosition,
        currentPosition: [x, y],
        element: selectedYElement,
      });
      try {
        doc.transact(() => {
          selectedYElement.set("x", updatedElement.x);
          selectedYElement.set("y", updatedElement.y);
          setBound(getBounds({ element: selectedYElement }));
        }, doc.clientID);
      } catch (err) {
        console.error("Error updating Y element during drag:", err);
      }
      scheduleRender();

      // Update GlobalPointerPosition to current so drag becomes incremental (optional)
      setGlobalPointerPosition([x, y]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    flagRef.current = false;
    setIsDrawing(false);
    setIsDragging(false);
    setSelectedYElement(null);
    setGlobalPointerPosition(null);
    setSelectedElementId(null);
    setBound(null);
    // release pointer capture
    try {
      if ((e.target as Element).hasPointerCapture && (e.target as Element).hasPointerCapture(e.pointerId)) {
        (e.target as Element).releasePointerCapture(e.pointerId);
      }
    } catch (err) { }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    if (currentTool.action === actionType.Drawing) {
      setCursorStyle("crosshair")
    } else if (isDragging) {
      setCursorStyle("grabbing")
    } else {
      setCursorStyle("default")
    }

  }, [currentTool, isDragging,]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    if (selectedYElement && Bound) {
      DrawBounds({ context, bounds: Bound })
    }
  }, [selectedYElement, Bound]);

  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        handleUndo()
      }
      if (e.ctrlKey && e.key === 'y') {
        handleRedo()
      }
      if (e.key === 'Delete' && selectedYElement) {
        doc.transact(() => {
          const elementId = selectedYElement.get("id") as string;
          yElement.delete(elementId);
          const index = order.toArray().indexOf(elementId);
          if (index > -1) {
            order.delete(index, 1);
          }
        }, doc.clientID);
      }

    }


    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [doc, selectedYElement, yElement, order]);

  useEffect(() => {
    yElement.forEach((element, key) => {
      console.log('Y.Element Key:', key, 'Value:', element.toJSON());
    })
    if (yElement.size) {
      console.log("Y.Element size:", yElement.size);
    }
    type YElement = Y.Map<unknown>;

    type YElementsObserver = (event: Y.YMapEvent<YElement>) => void;

    const observer: YElementsObserver = (event) => {
      scheduleRender();
      event.target.forEach((element: YElement, key: string) => {
        console.log('Y.Element Key:', key, 'Value:', element.toJSON());
      });
    }

    console.log(`[UNDO] Undo Stack Size: ${undoManager.undoStack.length}`)
    console.log(`[UNDO] Redo Stack Size: ${undoManager.redoStack.length}`)
    canvasDoc.yElement.observe(observer);
    return () => {
      canvasDoc.yElement.unobserve(observer);
    }
  }, [yElement.size, yElement, scheduleRender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      scheduleRender();
    };

    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, [scheduleRender]);
  return (

    <div className='bg-white relative w-full h-screen'>
      <Toolbar className='absolute top-2 left-2 z-10' />
      <canvas
        ref={canvasRef}
        className={`w-full h-screen `}
        id='canvas'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          border: '1px solid black',
          cursor: CursorStyle
        }}
      />
    </div>
  );
}
