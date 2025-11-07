'use client';

import rough from 'roughjs';

import { use, useCallback, useEffect, useRef, useState } from 'react';
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
import yUtils from '@/lib/utils/createYElement';
import { handleUndo, handleRedo } from '@/lib/helperfunc/undo-redo';
import { UndoManager as undoManager } from '@/Store/yjs-store';
import detectResizeHandle from '@/lib/hitTest/detectResizeHandler';
import resizeBound from '@/lib/resizeBound';
import { resizeElement } from '@/lib/resizeElement';

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
    isSelecting,
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    selectedYElement,
    setYElement,
    bound,
    setBound,
  } = useAppStore();
  
  const [freehandPoint, setFreehandPoint] = useState<PointsFreeHand[]>([
    [pointerPosition[0], pointerPosition[1], 1] as PointsFreeHand,
  ]);
  const [CursorStyle, setCursorStyle] = useState("default")

  const [GlobalPointerPosition, setGlobalPointerPosition] = useState<Point | null>(null)
  const generatorRef = useRef<RoughGenerator | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const resizeStartPointerRef = useRef<point | null>(null);
  const resizeOriginalRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const flagRef = useRef<boolean>(false)
  const animationFrameIdRef = useRef<number | null>(null);
  let foundResizeHandle: { direction: string; cursor: string } | null = null;
  const resizeHandleRef = useRef<{ direction: string; cursor: string } | null>(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    yElement.forEach(el => DrawElements({ ctx, element: el }));
    if (selectedYElement && bound) DrawBounds({ context: ctx, bounds: bound });
  }, [yElement, selectedYElement, bound]);

  const scheduleRender = useCallback(() => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(renderCanvas);
  }, [renderCanvas]);

  
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

    for (let i = order.length - 1; i >= 0; i--) {
      const elementId = order.get(i) as string;
      const element = yElement.get(elementId);
      if (!element) continue;
      if (isPointInsideElement({ point: pt, element })) {
        return { id: elementId, yEl: element };
      }
    }

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

    
    if (currentTool.action === actionType.Selecting) {
      const hit = hitTestAtPoint(initialPoint);
      if (hit && hit.yEl) {
        ;
        setYElement(hit.yEl);
        setBound(getBounds({ element: hit.yEl }));
        setIsDragging(true);
        setGlobalPointerPosition([x, y]);

        flagRef.current = true;

       
        try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { }
      } else {
        
        setIsDragging(false);
      }
      if (resizeHandleRef.current) {
        console.log("Resize Handle Found on Pointer Down:", resizeHandleRef.current.direction);
        setIsResizing(true);
        setResizeHandle(resizeHandleRef.current.direction);
        setIsDragging(false);
        resizeStartPointerRef.current = initialPoint; 
        if (hit && hit.yEl) {

          resizeOriginalRectRef.current = (getBounds({ element: hit.yEl })) as { x: number; y: number; width: number; height: number };
        } else if (bound) {
          resizeOriginalRectRef.current = (bound) as { x: number; y: number; width: number; height: number };
        }

      }
    
    }

    
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

          if (!yElement.get(element.id) && createdYEl) {
            yElement.set(element.id, createdYEl);
            order.push([element.id]);
          }
        }, doc.clientID);
        
        if (createdYEl) {
          setYElement(createdYEl);
          
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
    console.log("resizing status ", isResizing)
    
    if (currentTool.action === actionType.Selecting && !isDragging && !isResizing ) {
      console.log("inside hover logic")
      
      let foundElementToSelect: Y.Map<unknown> | null = null;
      

      const hit = hitTestAtPoint(pt);
      if (hit) {
        foundElementToSelect = hit.yEl;
        
      }
      let newCursorStyle = 'default';
      let newResizeHandle: { direction: string; cursor: string } | null = null;
      const elementToCheck = selectedYElement || foundElementToSelect;

      const boundsToCheck = bound || (elementToCheck ? getBounds({ element: elementToCheck }) : null);
      if (boundsToCheck) {
        const handleHit = detectResizeHandle({ point: pt, element: boundsToCheck, tolerance: 10 });
        if (handleHit) {
          newResizeHandle = handleHit;
          newCursorStyle = handleHit.cursor;
          console.log({handleHit})
          console.log({newResizeHandle})
          console.log({newCursorStyle})
        }
      }

      // for (let i = order.length - 1; i >= 0; i--) {
      //   const elementId = order.get(i) as string;
      //   const element = yElement.get(elementId);
      //   if (element) console.log(element.toJSON())
      //   if (!element) continue;
      //   const isHit = isPointInsideElement({ point: pt, element });
      //   console.log("isHit --->", isHit)
      //   flagRef.current = isHit;
      //   if (isHit) {
      //     found = true;
      //     foundElementToSelect = element;
      //     if (!bound) return
      //     const resizeHandle = detectResizeHandle({ point: pt, element: bound, tolerance: 10 })
      //     if (resizeHandle) {
      //       foundResizeHandle = resizeHandle
      //       resizeHandleRef.current = resizeHandle;
      //       setFoundHandle(true)
      //       // setCursorStyle(resizeHandle.cursor)
      //       // setIsDragging(false)
      //       // setIsResizing(true)
      //       // setResizeHandle(resizeHandle.direction)
      //       // resizeElement expects four positional arguments: (handle, element, initialPosition, currentPosition)


      //     }
      //     break;
      //   }

      // }
      // if (found && foundElementToSelect) {
      //   setYElement(foundElementToSelect);
      //   setCursorStyle('grab');

      //   if (foundResizeHandle) {
      //     setIsDragging(false)
      //     setResizeHandle(foundResizeHandle.direction)
      //     console.log("Resize Handle Detected:", foundResizeHandle.direction);
      //     setCursorStyle(foundResizeHandle.cursor);
      //   }


      // } else {
      //   // setYElement(null);
      //   setCursorStyle('default');
      //   setIsResizing(false);
      //   setResizeHandle(null)
      // }

      
      if (newResizeHandle) {
        
        setCursorStyle(newCursorStyle);
        resizeHandleRef.current = newResizeHandle;
        setYElement(elementToCheck); 
        setBound(boundsToCheck); 
        setIsDragging(false);
      } else if (foundElementToSelect) {
       
        setYElement(foundElementToSelect);
        setBound(getBounds({ element: foundElementToSelect }));
        setCursorStyle('grab');
        resizeHandleRef.current = null;
      } else {
        
        setCursorStyle('default');
        resizeHandleRef.current = null;        
      }

     
      foundResizeHandle = newResizeHandle;


    }

   
    if (!isDrawing && !isDragging && !isResizing) return;

   
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
        yUtils.updateYElement(updatedElement, selectedYElement);
        scheduleRender();
      } else {
        const updatedElement = {
          ...elementJSON,
          width: x - elementJSON.x,
          height: y - elementJSON.y,
        };
        yUtils.updateYElement(updatedElement, selectedYElement);
        scheduleRender();
      }
      return;
    }

    
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


      setGlobalPointerPosition([x, y]);
    }
    if (isResizing) {
      console.log("Resizing in progress...");
      console.log({GlobalPointerPosition})
      console.log({selectedYElement})
      console.log({resizeHandle})
      if (!GlobalPointerPosition || !selectedYElement || !resizeHandle) return;

     console.log("are we resizing ?")


      const startPointer = resizeStartPointerRef.current
      const originalBound = resizeOriginalRectRef.current
      if (!startPointer || !originalBound || !selectedYElement || !resizeHandle || !bound) return;
      const resizedBound = resizeBound(resizeHandle, startPointer, [x, y], originalBound);

      setBound(resizedBound)
      scheduleRender()
      doc.transact(() => {
        resizeElement({
          element: selectedYElement,
          newBounds: resizedBound,
          oldBounds: originalBound
        })
      }, doc.clientID)

    }

  };

  const handlePointerUp = (e: React.PointerEvent) => {
    flagRef.current = false;
    setIsDrawing(false);
    setIsDragging(false);

   
    setSelectedElementId(null);
    resizeHandleRef.current = null;
    setIsResizing(false);
    setResizeHandle(null);
    setCursorStyle("default")
    resizeStartPointerRef.current = null;
    resizeOriginalRectRef.current = null;

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
   
    console.log(isDragging, currentTool);
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

    console.log("selectedYElement changed ", selectedYElement?.toJSON());
    console.log("bound changed ", bound);

    if (selectedYElement && bound) {
      DrawBounds({ context, bounds: bound })
    }
  }, [selectedYElement, bound]);

  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        handleUndo()
      }
      if (e.ctrlKey && e.key === 'y') {
        handleRedo()
      }
      console.log("Key pressed:", selectedYElement, e.key);
      if (e.key === 'Delete' && selectedYElement) {
        console.log("Deleting selected element");
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
  useEffect(() => {


    console.log("isdragging ---> ", isDragging)
    console.log("isDrawing ---> ", isDrawing)
    console.log("CursorStyle ---> ", CursorStyle)
    console.log("currentTool ---> ", currentTool)
    console.log("selectedYElement ---> ", selectedYElement)
    console.log("resizeHandle ---> ", resizeHandle)
    console.log("isResizing ---> ", isResizing)
  }, [isDragging, isDrawing, CursorStyle, currentTool, selectedYElement, resizeHandle, isResizing]);
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

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
