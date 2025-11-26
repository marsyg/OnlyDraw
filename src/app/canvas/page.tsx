'use client';

import rough from 'roughjs';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { UndoManager } from '@/Store/yjs-store';
import canvasDoc from '@/Store/yjs-store';
import * as Y from 'yjs';
import { Point } from 'roughjs/bin/geometry';
import yUtils from '@/lib/utils/createYElement';
import { handleUndo, handleRedo } from '@/lib/helperfunc/undo-redo';
import { LOCAL_ORIGIN, LIVE_ORIGIN } from '@/Store/yjs-store';
import detectResizeHandle from '@/lib/hitTest/detectResizeHandler';
import resizeBound from '@/lib/resizeBound';
import { resizeElement } from '@/lib/resizeElement';
import { WebsocketProvider } from 'y-websocket';
import RoughSketchToolbox from '@/component/crazyToolbar';
import { motion } from 'framer-motion';



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
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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


  const getPointerCoordinates = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0] as [number, number];

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      // Pointer/Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return [0, 0] as [number, number];
    }

    const X = clientX - rect.left;
    const Y = clientY - rect.top;
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

    const [x, y] = getPointerCoordinates(e);
    console.log({ getPointerCoordinates })
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
        // console.log("Resize Handle Found on Pointer Down:", resizeHandleRef.current.direction);
        setIsResizing(true);
        setResizeHandle(resizeHandleRef.current.direction);
        setIsDragging(false);
        resizeStartPointerRef.current = initialPoint;

        const type = selectedYElement?.get('type') as unknown as elementType;
        if (type === 'freehand') {

          const stroke = selectedYElement?.get('points') as Y.Array<Y.Map<number>>;
          // console.log(selectedYElement?.toJSON(), "yaha se ----------------------------------")

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
          `x`
          createdYEl = yUtils.createYElement(element);

          if (!yElement.get(element.id) && createdYEl) {
            yElement.set(element.id, createdYEl);
            order.push([element.id]);
          }
        }, LOCAL_ORIGIN);

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
  }, [getPointerCoordinates, currentTool, bound, lockedBounds, selectedYElement, hitTestAtPoint,
    setYElement, setBound, setIsDragging, setIsResizing, setResizeHandle, strokeColor,
    strokeWidth, fillColor, fillStyle, roughness, boundaryStyle, fillWeight, doc, yElement,
    order, setSelectedElementId, setIsDrawing]

  );
  const lastMoveTimeRef = useRef<number>(0);
  const MOVE_THROTTLE_MS = 16;

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const [x, y] = getPointerCoordinates(e);
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
        // console.log({ pt })
        // console.log("bounds calculated at resizing ", getBounds({ element: foundElementToSelect }))

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
      // console.log('Original seed:', selectedYElement.get('seed'));
      // console.log('JSON seed:', elementJSON.seed);
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

        // console.log(
        //   "Updated Element Values:",
        //   {
        //     x: minX,
        //     y: minY,
        //     width: maxX - minX,
        //     height: maxY - minY,
        //     elementJSON,
        //   }
        // );

        // console.log(
        //   '[Move] Updating Freehand:',
        //   `x: ${updatedElement.x}, y: ${updatedElement.y}`,
        //   `Points (Count: ${updatedElement.stroke.points.length}):`,
        //   JSON.parse(JSON.stringify(updatedElement.stroke.points))
        // );

        doc.transact(() => {
          yUtils.updateYElement(updatedElement, selectedYElement);
        }, LOCAL_ORIGIN)

        scheduleRender();

      } else {
        const updatedElement = {
          ...elementJSON,
          width: x - elementJSON.x,
          height: y - elementJSON.y,
        };
        doc.transact(() => {
          yUtils.updateYElement(updatedElement, selectedYElement);
        }, LOCAL_ORIGIN)
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
        }, LOCAL_ORIGIN);
      } catch (err) {
        console.error("Error updating Y element during drag:", err);
      }
      scheduleRender();



    }
    if (isResizing) {
      // console.log("Resizing in progress...");
      // console.log({ GlobalPointerPosition })
      // console.log({ selectedYElement })
      // console.log({ resizeHandle })
      if (!GlobalPointerPosition || !selectedYElement || !resizeHandle) return;

      // console.log("are we resizing ?")


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
      }, LOCAL_ORIGIN)

    }

  }, [getPointerCoordinates, currentTool, isDragging, isResizing, lockedBounds, bound,
    selectedYElement, hitTestAtPoint, setBound, setYElement, setIsDragging, isDrawing,
    freehandPoint, doc, scheduleRender, GlobalPointerPosition, resizeHandle]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {

    if (!selectedYElement) return
    setIsDrawing(false);
    setIsDragging(false);


    flagRef.current = false;



    setFreehandPoint(null)

    resizeHandleRef.current = null;
    setIsResizing(false);
    // const element = selectedYElement?.toJSON() as OnlyDrawElement
    // doc.transact(() => {
    //   yUtils.updateYElement(element, selectedYElement)
    // }, LOCAL_ORIGIN)
    UndoManager.stopCapturing();
    setResizeHandle(null);
    setCursorStyle("default")
    resizeStartPointerRef.current = null;
    resizeOriginalRectRef.current = null;


  }, [selectedYElement, setIsDragging, setIsDrawing, setIsResizing, setResizeHandle]);



  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    const canvas = canvasRef.current;
    if (!canvas) return;

    const [x, y] = getPointerCoordinates(e);
    const syntheticEvent = {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      currentTarget: canvas,
      target: canvas,
    } as unknown as React.PointerEvent;

    handlePointerDown(syntheticEvent);
  }, [getPointerCoordinates, handlePointerDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syntheticEvent = {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      currentTarget: canvas,
      target: canvas,
    } as unknown as React.PointerEvent;

    handlePointerMove(syntheticEvent);
  }, [, handlePointerMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syntheticEvent = {
      clientX: e.changedTouches[0]?.clientX || 0,
      clientY: e.changedTouches[0]?.clientY || 0,
      currentTarget: canvas,
      target: canvas,
    } as unknown as React.PointerEvent;

    handlePointerUp(syntheticEvent);
  }, [handlePointerUp]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showRoomInput, setShowRoomInput] = useState(false);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const startCollaboration = useCallback(() => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    try {
      const serverUrl = process.env.NEXT_PUBLIC_URL;
      if (!serverUrl) {
        console.error('NEXT_PUBLIC_URL is not set');
        alert('Collaboration server URL is not configured.');
        return;
      }
      console.log(serverUrl)

      setConnectionStatus('connecting');
      setIsCollaborating(true);
      setShowRoomInput(false);

      providerRef.current = new WebsocketProvider(
        serverUrl,
        roomId,
        doc
      );

      providerRef.current.on('status', (event: { status: string }) => {
        console.log('Provider status:', event.status);
        if (event.status === 'connected') {
          setConnectionStatus('connected');
        } else if (event.status === 'disconnected') {
          setConnectionStatus('connecting');
        }
      });

      console.log(`Joining room: ${roomId}`);
    } catch (error) {
      console.error('Failed to start collaboration:', error);
      alert('Failed to connect to room');
      setConnectionStatus('disconnected');
      setIsCollaborating(false);
      setConnectionStatus('disconnected');
    }
  }, [roomId, doc]);

  const stopCollaboration = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
      setIsCollaborating(false);
      console.log('Disconnected from room');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Allow pinch zoom
      e.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);



  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        handleUndo();
        setYElement(null);
        setBound(null);
        setLockedBounds(false);
        scheduleRender();
      }
      if (e.ctrlKey && e.key === 'y') {
        handleRedo();
        setYElement(null);
        setBound(null);
        setLockedBounds(false);
        scheduleRender();
      }
      console.log("Key pressed:", selectedYElement, e.key);
      if (e.key === 'Delete' && selectedYElement) {
        console.log("Deleting selected element");

        // Find the outer key (the actual Map key in yElement)
        let elementKeyToDelete: string | null = null;
        yElement.forEach((value, key) => {
          if (value === selectedYElement) {
            elementKeyToDelete = key;
          }
        });

        if (elementKeyToDelete) {
          console.log("Found element key to delete:", elementKeyToDelete);
          console.log("yElement before delete:", yElement.toJSON());
          console.log("order before delete:", order.toArray());

          doc.transact(() => {
            yElement.delete(elementKeyToDelete!);
            const index = order.toArray().indexOf(elementKeyToDelete!);
            if (index > -1) {
              order.delete(index, 1);
            }
          }, LOCAL_ORIGIN);

          console.log("yElement after delete:", yElement.toJSON());
          console.log("order after delete:", order.toArray());

          setYElement(null);
          setBound(null);
          setLockedBounds(false);
          scheduleRender();
        } else {
          console.error("Could not find element key in yElement Map");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, selectedYElement, yElement, order, scheduleRender, setYElement, setLockedBounds, setBound]);

  useEffect(() => {


    const observerDeep = (events: Array<unknown>, transaction: Y.Transaction) => {
      scheduleRender();
      // // Log simple useful info
      // console.log('order:', canvasDoc.order.toArray());
      // console.log('yElements snapshot (string):', JSON.stringify(canvasDoc.yElement.toJSON()));
      // console.log('observeDeep events count', events.length, 'origin:', transaction.origin);

    };

    // console.log(`[UNDO] Undo Stack Size: ${UndoManager.undoStack.length}`);
    // console.log(`[UNDO] Redo Stack Size: ${UndoManager.redoStack.length}`);

    canvasDoc.yElement.observeDeep(observerDeep);
    return () => {
      canvasDoc.yElement.unobserveDeep(observerDeep);
    };
  }, [scheduleRender, yElement]);

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

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  return (

    <div className='bg-white relative w-full h-screen overflow-hidden touch-none'>
      {/* <Toolbar className='absolute top-2 left-2 z-10' /> */}
      <RoughSketchToolbox />
      <motion.div
        className={`fixed ${isTouchDevice ? 'top-2 right-2' : 'top-4 right-4'} z-50 sketch-font select-none`}
        initial={false}
      >
        {!isCollaborating ? (
          <>
            {!showRoomInput ? (
              <motion.button
                onClick={() => setShowRoomInput(true)}
                className={`${isTouchDevice ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'} rough-btn font-bold uppercase tracking-wide flex items-center gap-1`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={isTouchDevice ? 'text-xs' : 'text-sm'}>🌐</span>
                {!isTouchDevice && 'Collab'}
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`modern-panel p-3 space-y-2 ${isTouchDevice ? 'w-[180px]' : 'w-[220px]'}`}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <input
                  type='text'
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder='Room ID'
                  className={`w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${isTouchDevice ? 'text-[10px]' : 'text-xs'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') startCollaboration();
                    if (e.key === 'Escape') {
                      setShowRoomInput(false);
                      setRoomId('');
                    }
                  }}
                  autoFocus={!isTouchDevice}
                />
                <div className='flex gap-2'>
                  <button
                    onClick={startCollaboration}
                    className={`flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold ${isTouchDevice ? 'text-[10px]' : 'text-xs'} uppercase tracking-wide transition-all active:scale-95 border border-blue-800 shadow-[2px_2px_0px_0px_#1e3a8a]`}
                  >
                    Join
                  </button>
                  <button
                    onClick={() => {
                      setShowRoomInput(false);
                      setRoomId('');
                    }}
                    className={`px-3 py-2 rough-btn ${isTouchDevice ? 'text-[10px]' : 'text-xs'} uppercase font-bold`}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`modern-panel p-2 space-y-2 ${isTouchDevice ? 'w-[140px]' : 'w-[180px]'}`}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {connectionStatus === 'connecting' ? (
                  <>
                    <div className='w-2 h-2 bg-yellow-500 rounded-full animate-pulse'></div>
                    <span className='text-[10px] font-bold uppercase text-gray-100'>
                      Connecting
                    </span>
                  </>
                ) : (
                  <>
                    <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                    <span className='text-[10px] font-bold uppercase text-gray-100'>
                      Live
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={stopCollaboration}
                className='px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase transition-all active:scale-95 border border-red-900'
                title="Disconnect"
              >
                ✕
              </button>
            </div>
            <div className='text-[10px] text-gray-300 font-mono bg-gray-950 px-2 py-1 rounded border border-gray-800 truncate'>
              {roomId}
            </div>
          </motion.div>
        )}
      </motion.div>


      <canvas
        ref={canvasRef}
        className='w-full h-screen touch-none select-none'
        id='canvas'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          border: '1px solid black',
          cursor: CursorStyle
        }}
      />
    </div>
  );
}
