'use client';

import rough from 'roughjs';

import { useCallback, useEffect,  useRef, useState } from 'react';
import { useAppStore } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';

import { OnlyDrawElement, point, PointsFreeHand } from '@/types/type';
import { actionType, elementType } from '@/types/type';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
import { isPointInsideElement } from '@/lib/utils/drawingUtility/hitTest';
import { DrawBounds } from '@/lib/drawBounds';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { isPointInPaddedBounds } from '@/lib/utils/boundsUtility/isPointInPaddedBounds';

import canvasDoc from '@/Store/yjs-store';
import * as Y from 'yjs';
import { Point } from 'roughjs/bin/geometry';
import yUtils from '@/lib/utils/createYElement';
import { handleUndo, handleRedo } from '@/lib/helperfunc/undo-redo';

import detectResizeHandle from '@/lib/hitTest/detectResizeHandler';
import resizeBound from '@/lib/resizeBound';
import { resizeElement } from '@/lib/resizeElement';

import RoughSketchToolbox from '@/component/crazyToolbar';



export default function App() {
  const { doc, yElement, order } = canvasDoc;


  const {
    setPointerPosition,
    currentTool,

    setSelectedElementId,

    setIsDrawing,
    setIsDragging,
    isDragging,
    isDrawing,
    pointerPosition,

    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    selectedYElement,
    setYElement,
    bound,
    setBound,
    roughness,
    fillColor,
    strokeColor,
    strokeWidth,
    fillStyle,
    fillWeight,
    boundaryStyle,

  } = useAppStore();

  const [freehandPoint, setFreehandPoint] = useState<PointsFreeHand[] | null>([
    [pointerPosition[0], pointerPosition[1], 1] as PointsFreeHand,
  ]);
  const [CursorStyle, setCursorStyle] = useState("default")
  const [lockedBounds, setLockedBounds] = useState<boolean>(false)
  const roughGeneratorRef = useRef<RoughGenerator | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);


  const [GlobalPointerPosition, setGlobalPointerPosition] = useState<Point | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resizeStartPointerRef = useRef<point | null>(null);
  const resizeOriginalRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const flagRef = useRef<boolean>(false)
  const animationFrameIdRef = useRef<number | null>(null);

  const resizeHandleRef = useRef<{ direction: string; cursor: string } | null>(null);
  const originalPointRef = useRef<PointsFreeHand[] | null>(null)

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!roughCanvasRef.current) {
      roughCanvasRef.current = rough.canvas(canvas);
      roughGeneratorRef.current = roughCanvasRef.current.generator;
    }
    const rc = roughCanvasRef.current;
    if (isDragging || isResizing || isDrawing) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ;
    yElement.forEach(el => DrawElements({ ctx, element: el, rc: rc }));
    if (selectedYElement && bound) DrawBounds({ context: ctx, bounds: bound });
  }, [isDragging, isResizing, isDrawing, yElement, selectedYElement, bound]);

  const scheduleRender = useCallback(() => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(renderCanvas);
  }, [renderCanvas]);


  const getMOuseCoordinate = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0] as [number, number];
    const rect = canvas.getBoundingClientRect();
    const X = e.clientX - rect.left;
    const Y = e.clientY - rect.top;
    setPointerPosition([X, Y]);
    return [X, Y] as [number, number];
  }, [setPointerPosition]);

  const hitTestAtPoint = useCallback((pt: point) => {

    for (let i = order.length - 1; i >= 0; i--) {
      const elementId = order.get(i) as string;
      const element = yElement.get(elementId);
      if (!element) continue;
      if (isPointInsideElement({ point: pt, element })) {
        return { id: elementId, yEl: element };
      }
    }

    return null;
  }, [order, yElement]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const [x, y] = getMOuseCoordinate(e);
    console.log({ getMOuseCoordinate })
    const initialPoint: point = [x, y];


    setFreehandPoint([[initialPoint[0], initialPoint[1], 1] as PointsFreeHand]);
    if (currentTool.action === actionType.Selecting) {

      const handleHit = bound ? detectResizeHandle({ point: initialPoint, element: bound, tolerance: 10 }) : null;
      if (handleHit) {
        resizeHandleRef.current = handleHit;
      }

      let hit = null;
      if (lockedBounds && bound && isPointInPaddedBounds(initialPoint, bound)) {
        if (selectedYElement) {
          hit = { id: selectedYElement.get('id') as string, yEl: selectedYElement };
        }
      } else {
        hit = hitTestAtPoint(initialPoint);
      }

      if (hit && hit.yEl) {
        const currentBounds = getBounds({ element: hit.yEl });
        setYElement(hit.yEl);
        setBound(getBounds({ element: hit.yEl }));
        setIsDragging(true);
        const offsetXToBound = x - currentBounds.x;
        const offsetYToBound = y - currentBounds.y;
        setGlobalPointerPosition([offsetXToBound, offsetYToBound])

        flagRef.current = true;
      }
      else {
        setLockedBounds(false)
        setIsDragging(false);
      }
      if (resizeHandleRef.current) {
        console.log("Resize Handle Found on Pointer Down:", resizeHandleRef.current.direction);
        setIsResizing(true);
        setResizeHandle(resizeHandleRef.current.direction);
        setIsDragging(false);
        resizeStartPointerRef.current = initialPoint;

        const type = selectedYElement?.get('type') as unknown as elementType;
        if (type === 'freehand') {

          const stroke = selectedYElement?.get('points') as Y.Array<Y.Map<number>>;
          console.log(selectedYElement?.toJSON(), "yaha se ----------------------------------")

          const points: PointsFreeHand[] = stroke
            .toArray()
            .map((p) => [
              (p.get('x') as number),
              (p.get('y') as number),
              p.get('pressure') as number,
            ]);

          originalPointRef.current = points
        }

        if (hit && hit.yEl) {
          resizeOriginalRectRef.current = (getBounds({ element: hit.yEl })) as { x: number; y: number; width: number; height: number };
        } else if (bound) {
          resizeOriginalRectRef.current = (bound) as { x: number; y: number; width: number; height: number };
        }

      }
      if (bound) setLockedBounds(true)
      else setLockedBounds(false)

      if (!hit && !resizeHandleRef.current) {
        setYElement(null)
        setBound(null)
        setLockedBounds(false)

      }

    }

    if (currentTool.action === actionType.Drawing) {
      setCursorStyle("crosshair")
      const element = handleDrawElement({
        action: actionType.Drawing,
        element: currentTool.elementType,
        startPoint: initialPoint,
        endPoint: initialPoint,
        options: {
          strokeColor: strokeColor,
          strokeWidth: strokeWidth,
          fillColor: fillColor,
          fillStyle: fillStyle,
          roughness: roughness,
          boundaryStyle: boundaryStyle,
          fillWeight: fillWeight,
        },
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

        }
      } catch (error) {
        console.error("error in creating y element", error);
      }
      return;
    }
  }, [getMOuseCoordinate, currentTool, bound, lockedBounds, selectedYElement, hitTestAtPoint,
    setYElement, setBound, setIsDragging, setIsResizing, setResizeHandle, strokeColor,
    strokeWidth, fillColor, fillStyle, roughness, boundaryStyle, fillWeight, doc, yElement,
    order, setSelectedElementId, setIsDrawing]

  );
  const lastMoveTimeRef = useRef<number>(0);
  const MOVE_THROTTLE_MS = 16;

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const [x, y] = getMOuseCoordinate(e);
    const pt: point = [x, y];
    // console.log([x, y])
    // console.log("resizing status ", isResizing)
    const now = Date.now();
    if (now - lastMoveTimeRef.current < MOVE_THROTTLE_MS && !isDrawing && !isDragging && !isResizing) {
      return;
    }
    lastMoveTimeRef.current = now;
    if (currentTool.action === actionType.Selecting && !isDragging && !isResizing) {
      // console.log("inside hover logic")
      let foundElementToSelect: Y.Map<unknown> | null = null;
      let hit = null;
      if (lockedBounds && bound && isPointInPaddedBounds(pt, bound)) {

        if (selectedYElement) {
          hit = { id: selectedYElement.get('id') as string, yEl: selectedYElement };
        }
      } else {
        hit = hitTestAtPoint(pt);
      }

      if (hit && !lockedBounds) {
        foundElementToSelect = hit.yEl;
        setBound(getBounds({ element: foundElementToSelect }));
        console.log({ pt })
        console.log("bounds calculated at resizing ", getBounds({ element: foundElementToSelect }))

      }
      let newCursorStyle = 'default';
      let newResizeHandle: { direction: string; cursor: string } | null = null;
      const elementToCheck = selectedYElement || foundElementToSelect;


      if (bound || elementToCheck) {
        const handleHit = detectResizeHandle({ point: pt, element: bound || getBounds({ element: elementToCheck! }), tolerance: 10 });
        if (handleHit) {
          newResizeHandle = handleHit;
          newCursorStyle = handleHit.cursor;

        }
      } else {
        setBound(null)
        setYElement(null)
      }

      if (newResizeHandle) {
        setCursorStyle(newCursorStyle);
        resizeHandleRef.current = newResizeHandle;
        setYElement(elementToCheck);
        setIsDragging(false);
      } else if (foundElementToSelect && !lockedBounds) {

        setYElement(foundElementToSelect);
        setBound(getBounds({ element: foundElementToSelect }));
        setCursorStyle('grab');
        resizeHandleRef.current = null;
      } else {
        setCursorStyle('default');
        resizeHandleRef.current = null;
      }

    }


    if (!isDrawing && !isDragging && !isResizing) return;


    if (currentTool.action === actionType.Drawing) {
      if (!selectedYElement) return;

      const elementJSON = selectedYElement.toJSON() as OnlyDrawElement;
      console.log('Original seed:', selectedYElement.get('seed'));
      console.log('JSON seed:', elementJSON.seed);
      const type = selectedYElement.get('type') as unknown as elementType;

      if (type === elementType.Freehand && freehandPoint) {

        const newAbsPoints: PointsFreeHand[] = [
          ...freehandPoint,
          [x, y, 1] as PointsFreeHand,
        ];
        setFreehandPoint(newAbsPoints);

        const xs = newAbsPoints.map(([px]) => px);
        const ys = newAbsPoints.map(([, py]) => py);
        // console.log({ xs })
        // console.log({ ys })
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        // console.log("minX:", minX);
        // console.log("minY:", minY);
        // console.log("maxX:", maxX);
        // console.log("maxY:", maxY);

        const relPoints = newAbsPoints.map(
          ([px, py, pressure]) =>
            [px - minX, py - minY, pressure] as PointsFreeHand
        );


        const updatedElement = {
          ...(elementJSON as Extract<OnlyDrawElement, { type: elementType.Freehand }>),
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          stroke: { points: relPoints },
        } as Extract<OnlyDrawElement, { type: elementType.Freehand }>;

        console.log(
          "Updated Element Values:",
          {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            elementJSON,
          }
        );

        console.log(
          '[Move] Updating Freehand:',
          `x: ${updatedElement.x}, y: ${updatedElement.y}`,
          `Points (Count: ${updatedElement.stroke.points.length}):`,
          JSON.parse(JSON.stringify(updatedElement.stroke.points))
        );

        doc.transact(() => {
          yUtils.updateYElement(updatedElement, selectedYElement);
        }, doc.clientID)

        scheduleRender();

      } else {
        const updatedElement = {
          ...elementJSON,
          width: x - elementJSON.x,
          height: y - elementJSON.y,
        };
        doc.transact(() => {
          yUtils.updateYElement(updatedElement, selectedYElement);
        }, doc.clientID)
        scheduleRender();
      }
      return;
    }


    if (isDragging) {
      setCursorStyle("grabbing")
      if (!GlobalPointerPosition || !selectedYElement || !bound) return;
      const newBoundX = x - GlobalPointerPosition[0];
      const newBoundY = y - GlobalPointerPosition[1];
      const dx = newBoundX - bound.x;
      const dy = newBoundY - bound.y;

      try {
        doc.transact(() => {
          selectedYElement.set("x", Number(selectedYElement.get("x")) + dx);
          selectedYElement.set("y", Number(selectedYElement.get("y")) + dy);
          setBound(getBounds({ element: selectedYElement }));
        }, doc.clientID);
      } catch (err) {
        console.error("Error updating Y element during drag:", err);
      }
      scheduleRender();



    }
    if (isResizing) {
      console.log("Resizing in progress...");
      console.log({ GlobalPointerPosition })
      console.log({ selectedYElement })
      console.log({ resizeHandle })
      if (!GlobalPointerPosition || !selectedYElement || !resizeHandle) return;

      console.log("are we resizing ?")


      const startPointer = resizeStartPointerRef.current
      const originalBound = resizeOriginalRectRef.current

      if (!startPointer || !originalBound || !selectedYElement || !resizeHandle || !bound) return;
      const resizedBound = resizeBound(resizeHandle, startPointer, [x, y], originalBound);

      const originalPoint = originalPointRef.current
      setBound(resizedBound)
      scheduleRender()
      doc.transact(() => {
        resizeElement({
          element: selectedYElement,
          newBounds: resizedBound,
          oldBounds: originalBound,
          originalPoints: originalPoint
        })
      }, doc.clientID)

    }

  }, [getMOuseCoordinate, currentTool, isDragging, isResizing, lockedBounds, bound,
    selectedYElement, hitTestAtPoint, setBound, setYElement, setIsDragging, isDrawing,
    freehandPoint, doc, scheduleRender, GlobalPointerPosition, resizeHandle]);

  const handlePointerUp = (e: React.PointerEvent) => {
    flagRef.current = false;
    setIsDrawing(false);
    setIsDragging(false);

    setFreehandPoint(null)
    setSelectedElementId(null);
    resizeHandleRef.current = null;
    setIsResizing(false);
    setResizeHandle(null);
    setCursorStyle("default")
    resizeStartPointerRef.current = null;
    resizeOriginalRectRef.current = null;

    
  };



  // useEffect(() => {
  //   const canvas = canvasRef.current;
  //   if (!canvas) return;
  //   const context = canvas.getContext('2d');
  //   if (!context) {
  //     return;
  //   }
  //   console.log("selectedYElement changed ", selectedYElement?.toJSON());
  //   console.log("bound changed ", bound);

  //   if (selectedYElement && bound) {
  //     DrawBounds({ context, bounds: bound })
  //   }
  // }, [selectedYElement, bound]);

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

    const observer: YElementsObserver = () => {
      scheduleRender();
      // event.target.forEach((element: YElement, key: string) => {
      //   console.log('Y.Element Key:', key, 'Value:', element.toJSON());
      // });
    }

    // console.log(`[UNDO] Undo Stack Size: ${undoManager.undoStack.length}`)
    // console.log(`[UNDO] Redo Stack Size: ${undoManager.redoStack.length}`)
    canvasDoc.yElement.observe(observer);
    return () => {
      canvasDoc.yElement.unobserve(observer);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    roughCanvasRef.current = rough.canvas(canvas);
    roughGeneratorRef.current = roughCanvasRef.current.generator;
    const setSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      scheduleRender();
    };

    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, [scheduleRender]);
  // useEffect(() => {


  //   console.log("isdragging ---> ", isDragging)
  //   console.log("isDrawing ---> ", isDrawing)
  //   console.log("CursorStyle ---> ", CursorStyle)
  //   console.log("currentTool ---> ", currentTool)
  //   console.log("selectedYElement ---> ", selectedYElement)
  //   console.log("resizeHandle ---> ", resizeHandle)
  //   console.log("isResizing ---> ", isResizing)
  //   console.log({ bound })
  //   console.log("lockedBounds ---> ", lockedBounds)
  // }, [isDragging, isDrawing, CursorStyle, currentTool, selectedYElement, resizeHandle, isResizing, lockedBounds, bound]);
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
      {/* <Toolbar className='absolute top-2 left-2 z-10' /> */}
      <RoughSketchToolbox />


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
