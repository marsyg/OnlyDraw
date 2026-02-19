'use client';

import rough from 'roughjs';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { generateUsername } from "unique-username-generator";
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
import { LOCAL_ORIGIN, persistence } from '@/Store/yjs-store';
import detectResizeHandle from '@/lib/hitTest/detectResizeHandler';
import resizeBound from '@/lib/resizeBound';
import { resizeElement } from '@/lib/resizeElement';
import { WebsocketProvider } from 'y-websocket';
import RoughSketchToolbox from '@/component/crazyToolbar';
import FeaturePanel from '@/component/FeaturePanel';
import { motion } from 'framer-motion';
import getRandomColor from '@/lib/helperfunc/getRandomColor';
import { ZoomIn, ZoomOut, Maximize2, Download, Keyboard } from 'lucide-react';
import { useKeybindings } from '@/hooks/useKeybindings';
import KeybindingsDialog from '@/component/KeybindingsDialog';
import { serializeYElement, serializeYElements, deserializeYElement, deserializeYElements } from '@/lib/clipboard';
import { getPivotPoint } from '@/lib/math/pivot';
import { getCompoundBounds, isRectIntersecting } from '@/lib/utils/boundsUtility/compoundBounds';



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
    opacity,
    hasShadow,
    camera,
    panCamera,
    zoomCamera,
    resetCamera,
    clipboard,
    setClipboard,
    setActiveToolbarId,
    setCurrentTool,
    setIsSelecting,
    selectedElementIds,
    setSelectedElementIds,
  } = useAppStore();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Sync dark mode with <html> class so any CSS vars respect it
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);
  const [freehandPoint, setFreehandPoint] = useState<PointsFreeHand[] | null>([
    [pointerPosition[0], pointerPosition[1], 1] as PointsFreeHand,
  ]);
  const [CursorStyle, setCursorStyle] = useState("default")
  const [lockedBounds, setLockedBounds] = useState<boolean>(false)
  const roughGeneratorRef = useRef<RoughGenerator | null>(null);
  const [userName, setUserName] = useState<string>('');
  const roughCanvasRef = useRef<RoughCanvas | null>(null);

  type EditingTextState = {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    textAlign: string;
    fillColor: string;
  };
  const [editingTextElement, setEditingTextElement] = useState<EditingTextState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTextElement && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingTextElement]);

  // Infinite canvas pan state
  const isPanningRef = useRef<boolean>(false);
  const isSpacePressedRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);
  // Keep a ref to camera so event handlers always see latest value without re-creating
  const cameraRef = useRef(camera);
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resizeStartPointerRef = useRef<point | null>(null);
  const resizeOriginalRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const flagRef = useRef<boolean>(false)
  const animationFrameIdRef = useRef<number | null>(null);

  const resizeHandleRef = useRef<{ direction: string; cursor: string } | null>(null);
  const originalPointRef = useRef<PointsFreeHand[] | null>(null);
  const isRotatingRef = useRef<boolean>(false);
  const rotationCenterRef = useRef<[number, number]>([0, 0]);
  const rotationInitialAngleRef = useRef<number>(0);
  const rotationStartPointerAngleRef = useRef<number>(0);

  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const isMarqueeRef = useRef<boolean>(false);
  const marqueeStartRef = useRef<point | null>(null);

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
    const cam = cameraRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Draw adaptive infinite dot grid ---
    const gridColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    let gridSpacing = 30 * cam.scale;
    while (gridSpacing < 18) gridSpacing *= 2;
    while (gridSpacing > 100) gridSpacing /= 2;
    const dotR = Math.max(0.75, Math.min(2.5, 1.2 * cam.scale));
    const offsetX = ((cam.x % gridSpacing) + gridSpacing) % gridSpacing;
    const offsetY = ((cam.y % gridSpacing) + gridSpacing) % gridSpacing;
    ctx.fillStyle = gridColor;
    for (let gx = offsetX; gx < canvas.width; gx += gridSpacing) {
      for (let gy = offsetY; gy < canvas.height; gy += gridSpacing) {
        ctx.beginPath();
        ctx.arc(gx, gy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Apply camera transform ---
    ctx.save();
    ctx.setTransform(cam.scale, 0, 0, cam.scale, cam.x, cam.y);

    yElement.forEach(el => DrawElements({ ctx, element: el, rc: rc }));
    if ((selectedYElement || selectedElementIds.length > 0) && bound) {
      DrawBounds({ context: ctx, bounds: bound });
    }

    if (marqueeBox) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(marqueeBox.x, marqueeBox.y, marqueeBox.width, marqueeBox.height);
      ctx.strokeRect(marqueeBox.x, marqueeBox.y, marqueeBox.width, marqueeBox.height);
      ctx.restore();
    }

    ctx.restore();
  }, [isDark, isDragging, isResizing, isDrawing, yElement, selectedYElement, selectedElementIds, bound, marqueeBox]);


  const scheduleRender = useCallback(() => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(renderCanvas);
  }, [renderCanvas]);


  const getPointerCoordinates = useCallback((e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0] as [number, number];

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return [0, 0] as [number, number];
    }

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    // Convert screen → world space
    const cam = cameraRef.current;
    const worldX = (screenX - cam.x) / cam.scale;
    const worldY = (screenY - cam.y) / cam.scale;
    setPointerPosition([screenX, screenY]);
    return [worldX, worldY] as [number, number];
  }, [setPointerPosition]);

  const [GlobalPointerPosition, setGlobalPointerPosition] = useState<Point | null>(null);

  // ── Wheel: zoom + ctrl-scroll ──────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    if (e.ctrlKey || e.metaKey) {
      // Pinch-zoom (trackpad) or ctrl+scroll
      zoomCamera(-e.deltaY, centerX, centerY);
    } else if (e.shiftKey) {
      // Shift + scroll: horizontal pan
      panCamera(-e.deltaY, 0);
    } else {
      // Pan
      panCamera(-e.deltaX, -e.deltaY);
    }
    scheduleRender();
  }, [zoomCamera, panCamera, scheduleRender]);

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

  const finishEditingText = useCallback(() => {
    if (!editingTextElement) return;
    const { id, text } = editingTextElement;
    const targetYEl = yElement.get(id);
    if (!targetYEl) {
      setEditingTextElement(null);
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      doc.transact(() => {
        yElement.delete(id);
        const idx = order.toArray().indexOf(id);
        if (idx > -1) order.delete(idx, 1);
      }, LOCAL_ORIGIN);
      setYElement(null);
      setBound(null);
    } else {
      const fontSize = Number(targetYEl.get('fontSize')) || 24;
      const fontFamily = String(targetYEl.get('fontFamily') || 'sans-serif');
      const lines = text.split('\n');

      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      let maxWidth = 60;
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        lines.forEach((l) => {
          maxWidth = Math.max(maxWidth, ctx.measureText(l).width);
        });
      }
      const measuredWidth = Math.ceil(maxWidth + 16);
      const measuredHeight = Math.ceil(lines.length * fontSize * 1.3 + 8);

      doc.transact(() => {
        targetYEl.set('text', text);
        targetYEl.set('width', measuredWidth);
        targetYEl.set('height', measuredHeight);
      }, LOCAL_ORIGIN);

      setYElement(targetYEl);
      setBound(getBounds({ element: targetYEl }));
    }

    setEditingTextElement(null);
    setCurrentTool({ action: actionType.Selecting, elementType: elementType.Select });
    setActiveToolbarId('select');
    scheduleRender();
  }, [editingTextElement, yElement, doc, order, setYElement, setBound, setCurrentTool, setActiveToolbarId, scheduleRender]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const [x, y] = getPointerCoordinates(e);
    const hit = hitTestAtPoint([x, y]);
    if (hit && hit.yEl && hit.yEl.get('type') === elementType.Text) {
      const yEl = hit.yEl;
      setYElement(yEl);
      setEditingTextElement({
        id: yEl.get('id') as string,
        text: String(yEl.get('text') || ''),
        x: Number(yEl.get('x')),
        y: Number(yEl.get('y')),
        fontSize: Number(yEl.get('fontSize')) || 24,
        fontFamily: String(yEl.get('fontFamily') || 'sans-serif'),
        textAlign: String(yEl.get('textAlign') || 'left'),
        fillColor: String(yEl.get('fillColor') || yEl.get('strokeColor') || '#000000'),
      });
    }
  }, [getPointerCoordinates, hitTestAtPoint, setYElement]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (editingTextElement) {
      finishEditingText();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Middle-mouse or space+left-click: start panning
    if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
      e.preventDefault();
      isPanningRef.current = true;
      const cam = cameraRef.current;
      panStartRef.current = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y };
      setCursorStyle('grabbing');
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const [x, y] = getPointerCoordinates(e);
    const initialPoint: point = [x, y];


    setFreehandPoint([[initialPoint[0], initialPoint[1], 1] as PointsFreeHand]);
    if (currentTool.action === actionType.Selecting) {
      const handleHit = bound ? detectResizeHandle({ point: initialPoint, element: bound, tolerance: 10 }) : null;
      if (handleHit) {
        resizeHandleRef.current = handleHit;
      }

      if (resizeHandleRef.current) {
        if (resizeHandleRef.current.direction === 'rotate') {
          isRotatingRef.current = true;
          const targetEl = selectedYElement || (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null);
          const currentBounds = targetEl ? getBounds({ element: targetEl }) : (bound || { x: 0, y: 0, width: 0, height: 0 });
          const axis = String(targetEl?.get('rotationAxis') || 'center');
          const pivot = getPivotPoint(currentBounds, axis);
          rotationCenterRef.current = pivot;
          rotationInitialAngleRef.current = Number(targetEl?.get('angle')) || 0;
          rotationStartPointerAngleRef.current = Math.atan2(y - pivot[1], x - pivot[0]);

          setIsResizing(true);
          setResizeHandle('rotate');
          setIsDragging(false);
          if (bound) setLockedBounds(true);
          return;
        }

        setIsResizing(true);
        setResizeHandle(resizeHandleRef.current.direction);
        setIsDragging(false);
        resizeStartPointerRef.current = initialPoint;

        const type = selectedYElement?.get('type') as unknown as elementType;
        if (type === 'freehand') {
          const stroke = selectedYElement?.get('points') as Y.Array<Y.Map<number>>;
          const points: PointsFreeHand[] = stroke
            .toArray()
            .map((p) => [
              (p.get('x') as number),
              (p.get('y') as number),
              p.get('pressure') as number,
            ]);
          originalPointRef.current = points;
        }

        if (bound) {
          resizeOriginalRectRef.current = bound;
        }
        setLockedBounds(true);
        return;
      }

      const hit = hitTestAtPoint(initialPoint);

      if (hit && hit.yEl) {
        if (e.shiftKey) {
          const isSelected = selectedElementIds.includes(hit.id);
          const nextIds = isSelected
            ? selectedElementIds.filter((id) => id !== hit.id)
            : [...selectedElementIds, hit.id];

          setSelectedElementIds(nextIds);
          if (nextIds.length === 1) {
            setYElement(yElement.get(nextIds[0]) || null);
          } else {
            setYElement(null);
          }
          const cBound = getCompoundBounds(nextIds, yElement);
          setBound(cBound);
          setIsDragging(true);
          setLockedBounds(nextIds.length > 0);
          if (cBound) {
            setGlobalPointerPosition([x - cBound.x, y - cBound.y]);
          }
        } else {
          if (selectedElementIds.includes(hit.id) && selectedElementIds.length > 1) {
            setIsDragging(true);
            setLockedBounds(true);
            if (bound) {
              setGlobalPointerPosition([x - bound.x, y - bound.y]);
            }
          } else {
            setSelectedElementIds([hit.id]);
            setYElement(hit.yEl);
            const b = getBounds({ element: hit.yEl });
            setBound(b);
            setIsDragging(true);
            setLockedBounds(true);
            setGlobalPointerPosition([x - b.x, y - b.y]);
          }
        }
        flagRef.current = true;
      } else {
        if (!e.shiftKey) {
          setSelectedElementIds([]);
          setYElement(null);
          setBound(null);
          setLockedBounds(false);
        }
        setIsDragging(false);
        isMarqueeRef.current = true;
        marqueeStartRef.current = initialPoint;
      }
    }

    if (currentTool.action === actionType.Drawing) {
      if (currentTool.elementType === elementType.Text) {
        const textElement = handleDrawElement({
          action: actionType.Drawing,
          element: elementType.Text,
          startPoint: initialPoint,
          endPoint: [initialPoint[0] + 120, initialPoint[1] + 36],
          options: {
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            fillColor: fillColor,
            fillStyle: fillStyle,
            roughness: roughness,
            boundaryStyle: boundaryStyle,
            fillWeight: fillWeight,
            opacity: opacity,
            hasShadow: hasShadow,
            text: '',
            fontSize: 24,
            fontFamily: 'sans-serif',
            textAlign: 'left',
          },
        });

        if (!textElement) return;
        let createdYEl: Y.Map<unknown> | null = null;
        doc.transact(() => {
          createdYEl = yUtils.createYElement(textElement);
          if (createdYEl) {
            yElement.set(textElement.id, createdYEl);
            order.push([textElement.id]);
          }
        }, LOCAL_ORIGIN);

        if (createdYEl) {
          setYElement(createdYEl);
          setSelectedElementId(textElement.id);
          setEditingTextElement({
            id: textElement.id,
            text: '',
            x: textElement.x,
            y: textElement.y,
            fontSize: 24,
            fontFamily: 'sans-serif',
            textAlign: 'left',
            fillColor: strokeColor || '#000000',
          });
          scheduleRender();
        }
        return;
      }

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
          opacity: opacity,
          hasShadow: hasShadow,
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
    // Handle panning (middle-mouse or space+drag)
    if (isPanningRef.current && panStartRef.current) {
      const { x: startX, y: startY, camX, camY } = panStartRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newCam = { ...cameraRef.current, x: camX + dx, y: camY + dy };
      cameraRef.current = newCam;
      useAppStore.setState({ camera: newCam });
      scheduleRender();
      return;
    }

    const [x, y] = getPointerCoordinates(e);

    if (isMarqueeRef.current && marqueeStartRef.current) {
      const [startX, startY] = marqueeStartRef.current;
      const boxX = Math.min(startX, x);
      const boxY = Math.min(startY, y);
      const boxW = Math.abs(x - startX);
      const boxH = Math.abs(y - startY);
      setMarqueeBox({ x: boxX, y: boxY, width: boxW, height: boxH });
      scheduleRender();
      return;
    }

    const pt: point = [x, y];
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
      setCursorStyle("grabbing");
      if (!GlobalPointerPosition || !bound) return;
      const newBoundX = x - GlobalPointerPosition[0];
      const newBoundY = y - GlobalPointerPosition[1];
      const dx = newBoundX - bound.x;
      const dy = newBoundY - bound.y;

      try {
        doc.transact(() => {
          if (selectedElementIds.length > 1) {
            selectedElementIds.forEach((id) => {
              const el = yElement.get(id);
              if (el && !el.get('isDeleted')) {
                el.set("x", Number(el.get("x")) + dx);
                el.set("y", Number(el.get("y")) + dy);
              }
            });
          } else if (selectedYElement) {
            selectedYElement.set("x", Number(selectedYElement.get("x")) + dx);
            selectedYElement.set("y", Number(selectedYElement.get("y")) + dy);
          }
        }, LOCAL_ORIGIN);

        if (selectedElementIds.length > 1) {
          setBound(getCompoundBounds(selectedElementIds, yElement));
        } else if (selectedYElement) {
          setBound(getBounds({ element: selectedYElement }));
        }
      } catch (err) {
        console.error("Error updating Y element during drag:", err);
      }
      scheduleRender();
      return;
    }
    if (isResizing) {
      if (!selectedYElement || !resizeHandle) return;

      if (resizeHandle === 'rotate') {
        const [cx, cy] = rotationCenterRef.current;
        const currentPointerAngle = Math.atan2(y - cy, x - cx);
        const deltaAngle = currentPointerAngle - rotationStartPointerAngleRef.current;
        let newAngle = rotationInitialAngleRef.current + deltaAngle;

        if (e.shiftKey) {
          const snapStep = Math.PI / 12; // 15 degrees snap
          newAngle = Math.round(newAngle / snapStep) * snapStep;
        }

        doc.transact(() => {
          selectedYElement.set('angle', newAngle);
        }, LOCAL_ORIGIN);

        setBound(getBounds({ element: selectedYElement }));
        scheduleRender();
        return;
      }

      if (!GlobalPointerPosition) return;

      const startPointer = resizeStartPointerRef.current;
      const originalBound = resizeOriginalRectRef.current;

      if (!startPointer || !originalBound || !bound) return;
      const resizedBound = resizeBound(resizeHandle, startPointer, [x, y], originalBound, e.shiftKey);

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
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
      setCursorStyle(isSpacePressedRef.current ? 'grab' : 'default');
      return;
    }

    if (isMarqueeRef.current && marqueeStartRef.current) {
      isMarqueeRef.current = false;
      const [startX, startY] = marqueeStartRef.current;
      marqueeStartRef.current = null;
      const [endX, endY] = getPointerCoordinates(e);
      const box = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
      };
      setMarqueeBox(null);

      if (box.width > 4 || box.height > 4) {
        const foundIds: string[] = [];
        order.toArray().forEach((id) => {
          const el = yElement.get(id);
          if (el && !el.get('isDeleted')) {
            const b = getBounds({ element: el });
            if (b && isRectIntersecting(box, b)) {
              foundIds.push(id);
            }
          }
        });

        setSelectedElementIds(foundIds);
        if (foundIds.length === 1) {
          const singleEl = yElement.get(foundIds[0]) || null;
          setYElement(singleEl);
          setBound(singleEl ? getBounds({ element: singleEl }) : null);
          setLockedBounds(true);
        } else if (foundIds.length > 1) {
          setYElement(null);
          setBound(getCompoundBounds(foundIds, yElement));
          setLockedBounds(true);
        } else {
          setSelectedElementIds([]);
          setYElement(null);
          setBound(null);
          setLockedBounds(false);
        }
      }
      scheduleRender();
      return;
    }

    setIsDrawing(false);
    setIsDragging(false);

    flagRef.current = false;

    setFreehandPoint(null);

    resizeHandleRef.current = null;
    setIsResizing(false);
    isRotatingRef.current = false;
    UndoManager.stopCapturing();
    setResizeHandle(null);
    setCursorStyle(isSpacePressedRef.current ? 'grab' : 'default');
    resizeStartPointerRef.current = null;
    resizeOriginalRectRef.current = null;
  }, [
    getPointerCoordinates,
    order,
    yElement,
    setSelectedElementIds,
    setYElement,
    setBound,
    setLockedBounds,
    scheduleRender,
    setIsDragging,
    setIsDrawing,
    setIsResizing,
    setResizeHandle,
  ]);



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
  const [participants, setParticipants] = useState<Array<{ clientId: number; name: string; color: string, cursor?: { x: number; y: number } }>>([]);
  const awarenessHandlerRef = useRef<(() => void) | null>(null);
  const unloadHandlerRef = useRef<(() => void) | null>(null);
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
      const awareness = providerRef.current.awareness;
      const finalUserName = userName.trim() !== '' ? userName.trim() : generateUsername("", 3, 5);
      awareness.setLocalState({
        user: {
          name: finalUserName,
          color: getRandomColor()
        },
        cursor: { x: pointerPosition[0], y: pointerPosition[1] }
      });

      const updateParticipants = () => {
        console.log('awareness change', Array.from(awareness.getStates().keys()));
        const arr: Array<{ clientId: number; name: string; color: string; cursor?: { x: number; y: number } }> = [];
        for (const [clientId, state] of awareness.getStates()) {

          if (clientId === awareness.clientID) continue;

          const name = state?.user?.name ?? '';
          const color = state?.user?.color ?? '#777';
          const cursor = state?.cursor;
          arr.push({ clientId: Number(clientId), name, color, cursor });
          console.log('client', clientId, 'state', state);
        }
        setParticipants(arr);
      };
      awareness.on('change', updateParticipants);
      awarenessHandlerRef.current = updateParticipants;
      updateParticipants();

      providerRef.current.on('status', (event: { status: string }) => {
        console.log('Provider status:', event.status);
        if (event.status === 'connected') {
          setConnectionStatus('connected');
        } else if (event.status === 'disconnected') {
          setConnectionStatus('connecting');
        }
      });

      const onUnload = () => providerRef.current?.destroy();
      window.addEventListener('beforeunload', onUnload);
      unloadHandlerRef.current = onUnload;
      console.log(`Joining room: ${roomId}`);
    } catch (error) {
      console.error('Failed to start collaboration:', error);
      alert('Failed to connect to room');
      setConnectionStatus('disconnected');
      setIsCollaborating(false);
      setConnectionStatus('disconnected');
    }
  }, [roomId, doc, userName, pointerPosition]);


  const stopCollaboration = useCallback(() => {
    if (providerRef.current) {
      try {
        const awareness = providerRef.current.awareness;
        if (awareness && awarenessHandlerRef.current) {
          awareness.off('change', awarenessHandlerRef.current);
          awarenessHandlerRef.current = null;
        }
      } catch (e) {

      }

      if (unloadHandlerRef.current) {
        window.removeEventListener('beforeunload', unloadHandlerRef.current);
        unloadHandlerRef.current = null;
      }

      providerRef.current.destroy();
      providerRef.current = null;
      setParticipants([]);
      setIsCollaborating(false);
      setConnectionStatus('disconnected');
      console.log('Disconnected from room');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        try {
          const awareness = providerRef.current.awareness;
          if (awareness && awarenessHandlerRef.current) {
            awareness.off('change', awarenessHandlerRef.current);
          }
        } catch (e) { }
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (unloadHandlerRef.current) {
        window.removeEventListener('beforeunload', unloadHandlerRef.current);
        unloadHandlerRef.current = null;
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



  const handleDelete = useCallback(() => {
    const idsToDelete = new Set<string>();
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach((id) => idsToDelete.add(id));
    } else if (selectedYElement) {
      yElement.forEach((value, key) => {
        if (value === selectedYElement) {
          idsToDelete.add(key);
        }
      });
    }

    if (idsToDelete.size > 0) {
      doc.transact(() => {
        idsToDelete.forEach((key) => {
          yElement.delete(key);
          const index = order.toArray().indexOf(key);
          if (index > -1) {
            order.delete(index, 1);
          }
        });
      }, LOCAL_ORIGIN);

      setSelectedElementIds([]);
      setYElement(null);
      setBound(null);
      setLockedBounds(false);
      scheduleRender();
    }
  }, [selectedElementIds, selectedYElement, doc, yElement, order, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender]);

  const handleExportPNG = useCallback(() => {
    const elementIds = order.toArray();
    if (elementIds.length === 0) {
      alert('Canvas is empty — draw something first!');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elementIds.forEach((id) => {
      const el = yElement.get(id);
      if (!el || el.get('isDeleted')) return;
      const b = getBounds({ element: el });
      if (b) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
    });

    if (!isFinite(minX) || !isFinite(minY)) {
      alert('No visible elements to export.');
      return;
    }

    const padding = 50;
    const width = Math.ceil(maxX - minX + padding * 2);
    const height = Math.ceil(maxY - minY + padding * 2);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    expCtx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    expCtx.fillRect(0, 0, width, height);
    expCtx.translate(-minX + padding, -minY + padding);
    const expRc = rough.canvas(exportCanvas);

    elementIds.forEach((id) => {
      const el = yElement.get(id);
      if (el && !el.get('isDeleted')) {
        DrawElements({ ctx: expCtx, element: el, rc: expRc });
      }
    });

    const link = document.createElement('a');
    link.download = `canvas-sketch-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [order, yElement, isDark]);

  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);

  const handleUndoClick = useCallback(() => {
    handleUndo();
    setYElement(null);
    setBound(null);
    setLockedBounds(false);
    scheduleRender();
  }, [setYElement, setBound, setLockedBounds, scheduleRender]);

  const handleRedoClick = useCallback(() => {
    handleRedo();
    setYElement(null);
    setBound(null);
    setLockedBounds(false);
    scheduleRender();
  }, [setYElement, setBound, setLockedBounds, scheduleRender]);

  const selectTool = useCallback(
    (id: string, action: actionType, elType: elementType) => {
      setActiveToolbarId(id);
      setCurrentTool({ action, elementType: elType });
      setIsSelecting(action === actionType.Selecting);
      setIsDragging(action === actionType.Dragging);
      setBound(null);
    },
    [setActiveToolbarId, setCurrentTool, setIsSelecting, setIsDragging, setBound]
  );

  const handleCopy = useCallback(() => {
    if (selectedElementIds.length > 1) {
      const els: Y.Map<unknown>[] = [];
      selectedElementIds.forEach((id) => {
        const el = yElement.get(id);
        if (el && !el.get('isDeleted')) els.push(el);
      });
      if (els.length > 0) {
        setClipboard(serializeYElements(els));
      }
    } else if (selectedYElement) {
      const serialized = serializeYElement(selectedYElement);
      setClipboard(serialized);
    }
  }, [selectedElementIds, selectedYElement, yElement, setClipboard]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;

    if (Array.isArray(clipboard)) {
      const newElements = deserializeYElements(clipboard, { x: 30, y: 30 });
      const newIds: string[] = [];

      doc.transact(() => {
        newElements.forEach((el) => {
          const id = el.get('id') as string;
          yElement.set(id, el);
          order.push([id]);
          newIds.push(id);
        });
      }, LOCAL_ORIGIN);

      setClipboard(
        clipboard.map((item) => ({
          ...item,
          x: (Number(item.x) || 0) + 30,
          y: (Number(item.y) || 0) + 30,
        }))
      );

      setSelectedElementIds(newIds);
      setYElement(null);
      setBound(getCompoundBounds(newIds, yElement));
      setLockedBounds(true);
      scheduleRender();
    } else {
      const newYElement = deserializeYElement(clipboard, { x: 30, y: 30 });
      const newId = newYElement.get('id') as string;
      doc.transact(() => {
        yElement.set(newId, newYElement);
        order.push([newId]);
      }, LOCAL_ORIGIN);

      setClipboard({
        ...clipboard,
        x: (Number(clipboard.x) || 0) + 30,
        y: (Number(clipboard.y) || 0) + 30,
      });

      setSelectedElementIds([newId]);
      setYElement(newYElement);
      const bounds = getBounds({ element: newYElement });
      setBound(bounds);
      setLockedBounds(true);
      scheduleRender();
    }
  }, [clipboard, doc, yElement, order, setClipboard, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender]);

  const handleDuplicate = useCallback(() => {
    if (selectedElementIds.length > 1) {
      const els: Y.Map<unknown>[] = [];
      selectedElementIds.forEach((id) => {
        const el = yElement.get(id);
        if (el && !el.get('isDeleted')) els.push(el);
      });
      if (els.length === 0) return;
      const serialized = serializeYElements(els);
      const newElements = deserializeYElements(serialized, { x: 30, y: 30 });
      const newIds: string[] = [];

      doc.transact(() => {
        newElements.forEach((el) => {
          const id = el.get('id') as string;
          yElement.set(id, el);
          order.push([id]);
          newIds.push(id);
        });
      }, LOCAL_ORIGIN);

      setSelectedElementIds(newIds);
      setYElement(null);
      setBound(getCompoundBounds(newIds, yElement));
      setLockedBounds(true);
      scheduleRender();
    } else if (selectedYElement) {
      const serialized = serializeYElement(selectedYElement);
      const newYElement = deserializeYElement(serialized, { x: 30, y: 30 });
      const newId = newYElement.get('id') as string;
      doc.transact(() => {
        yElement.set(newId, newYElement);
        order.push([newId]);
      }, LOCAL_ORIGIN);

      setSelectedElementIds([newId]);
      setYElement(newYElement);
      const bounds = getBounds({ element: newYElement });
      setBound(bounds);
      setLockedBounds(true);
      scheduleRender();
    }
  }, [selectedElementIds, selectedYElement, doc, yElement, order, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender]);

  const handleCut = useCallback(() => {
    if (!selectedYElement && selectedElementIds.length === 0) return;
    handleCopy();
    handleDelete();
  }, [selectedYElement, selectedElementIds, handleCopy, handleDelete]);

  const handleDeselect = useCallback(() => {
    setSelectedElementIds([]);
    setYElement(null);
    setBound(null);
    setLockedBounds(false);
    setCurrentTool({ action: actionType.Selecting, elementType: elementType.Select });
    setActiveToolbarId('select');
    scheduleRender();
  }, [setSelectedElementIds, setYElement, setBound, setLockedBounds, setCurrentTool, setActiveToolbarId, scheduleRender]);

  const keybindingActions = useMemo(
    () => ({
      'tool.select': () => selectTool('select', actionType.Selecting, elementType.Select),
      'tool.rectangle': () => selectTool('rectangle', actionType.Drawing, elementType.Rectangle),
      'tool.ellipse': () => selectTool('circle', actionType.Drawing, elementType.Ellipse),
      'tool.line': () => selectTool('line', actionType.Drawing, elementType.Line),
      'tool.freehand': () => selectTool('freeHand', actionType.Drawing, elementType.Freehand),
      'tool.text': () => selectTool('text', actionType.Drawing, elementType.Text),
      'edit.undo': handleUndoClick,
      'edit.redo': handleRedoClick,
      'edit.copy': handleCopy,
      'edit.paste': handlePaste,
      'edit.duplicate': handleDuplicate,
      'edit.cut': handleCut,
      'edit.delete': handleDelete,
      'edit.deselect': handleDeselect,
      'view.resetZoom': () => {
        resetCamera();
        scheduleRender();
      },
      'view.zoomIn': () => {
        const canvas = canvasRef.current;
        const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
        const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
        zoomCamera(100, cx, cy);
        scheduleRender();
      },
      'view.zoomOut': () => {
        const canvas = canvasRef.current;
        const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
        const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
        zoomCamera(-100, cx, cy);
        scheduleRender();
      },
      'help.toggle': () => setIsKeybindingsOpen((prev) => !prev),
    }),
    [
      selectTool,
      handleUndoClick,
      handleRedoClick,
      handleCopy,
      handlePaste,
      handleDuplicate,
      handleCut,
      handleDelete,
      handleDeselect,
      resetCamera,
      zoomCamera,
      scheduleRender,
    ]
  );

  useKeybindings({
    actionMap: keybindingActions,
    onSpaceDown: () => {
      isSpacePressedRef.current = true;
      if (!isDrawing && !isDragging && !isResizing) {
        setCursorStyle('grab');
      }
    },
    onSpaceUp: () => {
      isSpacePressedRef.current = false;
      if (!isPanningRef.current) {
        setCursorStyle('default');
      }
    },
  });

  // IndexedDB local storage sync listener
  useEffect(() => {
    if (!persistence) return;
    const p = persistence;
    const handleSynced = () => {
      scheduleRender();
    };
    p.on('synced', handleSynced);
    return () => {
      p.off('synced', handleSynced);
    };
  }, [scheduleRender]);

  useEffect(() => {
    const observerDeep = (events: Array<unknown>, transaction: Y.Transaction) => {
      scheduleRender();
    };

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

    // Non-passive wheel listener for smooth infinite pan & zoom
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', setSize);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [scheduleRender, handleWheel]);

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

  useEffect(() => {
    if (isCollaborating && providerRef.current) {
      const awareness = providerRef.current.awareness;
      const localState = awareness.getLocalState();
      if (localState) {
        awareness.setLocalStateField('cursor', { x: pointerPosition[0], y: pointerPosition[1] });
      }
    }
  }, [pointerPosition, isCollaborating]);

  return (
    <div
      className='relative w-full h-screen overflow-hidden touch-none'
      style={{ background: isDark ? '#0f172a' : '#ffffff', transition: 'background 0.3s ease' }}
    >
      <RoughSketchToolbox onDelete={handleDelete} />
      <FeaturePanel isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />
      {isCollaborating && connectionStatus === 'connected' && participants.map(p => {

        if (!p.cursor || p.clientId === providerRef.current?.awareness.clientID) return null;
        return (
          <motion.div
            key={p.clientId}
            className="fixed pointer-events-none z-40"
            style={{
              left: p.cursor.x,
              top: p.cursor.y,
              color: p.color,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={p.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            <div
              className="absolute left-6 top-1 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap"
              style={{
                backgroundColor: p.color,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {p.name}
            </div>
          </motion.div>
        );
      })}
      {isCollaborating && connectionStatus === 'connected' && participants.length > 0 && (
        <motion.div
          className={`fixed top-4 left-1/2 z-50 transform -translate-x-1/2`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className=" px-2 py-1 flex items-center gap-2">
            {participants.map(p => (
              <div
                key={p.clientId}
                title={p.name}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white select-none"
                style={{ backgroundColor: p.color }}
              >
                {p.name ? p.name.charAt(0).toUpperCase() : '?'}
              </div>
            ))}
          </div>
        </motion.div>
      )}
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
                <input
                  type='text'
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder='username'
                  className={`w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${isTouchDevice ? 'text-[10px]' : 'text-xs'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && roomId) startCollaboration();
                    if (e.key === 'Escape') {
                      setShowRoomInput(false);
                      setUserName('')
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


      <motion.div
        className={`fixed ${isTouchDevice ? 'bottom-2 right-2' : 'bottom-4 right-4'} z-50 flex items-center gap-2 sketch-font select-none`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Zoom & View Controls */}
        <div className="flex items-center bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl p-1 shadow-xl text-white">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
              const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
              zoomCamera(-100, cx, cy);
              scheduleRender();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>

          <button
            onClick={() => {
              resetCamera();
              scheduleRender();
            }}
            className="px-2 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 text-xs font-mono font-bold text-gray-200 hover:text-white transition-colors min-w-[50px]"
            title="Reset Zoom (100% / Ctrl+0)"
          >
            {Math.round(camera.scale * 100)}%
          </button>

          <button
            onClick={() => {
              const canvas = canvasRef.current;
              const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
              const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
              zoomCamera(100, cx, cy);
              scheduleRender();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <button
            onClick={() => {
              resetCamera();
              scheduleRender();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 text-gray-300 hover:text-white transition-colors border-l border-gray-800 ml-1 pl-1"
            title="Reset View"
          >
            <Maximize2 size={14} />
          </button>

          <button
            onClick={handleExportPNG}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 text-gray-300 hover:text-white transition-colors border-l border-gray-800 ml-1 pl-1"
            title="Export to PNG"
          >
            <Download size={14} />
          </button>

          <button
            onClick={() => setIsKeybindingsOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 text-gray-300 hover:text-white transition-colors border-l border-gray-800 ml-1 pl-1"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={14} />
          </button>
        </div>

        {/* Undo / Redo */}
        <motion.button
          onClick={handleUndoClick}
          className={`${isTouchDevice ? 'w-9 h-9' : 'w-10 h-10'} rough-btn font-bold flex items-center justify-center`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Undo (Ctrl+Z)"
        >
          <span className={isTouchDevice ? 'text-base' : 'text-lg'}>↶</span>
        </motion.button>

        <motion.button
          onClick={handleRedoClick}
          className={`${isTouchDevice ? 'w-9 h-9' : 'w-10 h-10'} rough-btn font-bold flex items-center justify-center`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Redo (Ctrl+Y)"
        >
          <span className={isTouchDevice ? 'text-base' : 'text-lg'}>↷</span>
        </motion.button>
      </motion.div>

      <canvas
        ref={canvasRef}
        className='w-full h-screen touch-none select-none'
        id='canvas'
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          cursor: CursorStyle,
          touchAction: 'none',
        }}
      />

      {editingTextElement && (
        <textarea
          ref={textareaRef}
          value={editingTextElement.text}
          onChange={(e) => {
            setEditingTextElement((prev) =>
              prev ? { ...prev, text: e.target.value } : null
            );
          }}
          onBlur={finishEditingText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              finishEditingText();
            }
          }}
          placeholder="Type text..."
          style={{
            position: 'fixed',
            left: editingTextElement.x * camera.scale + camera.x,
            top: editingTextElement.y * camera.scale + camera.y,
            fontSize: `${editingTextElement.fontSize * camera.scale}px`,
            fontFamily: editingTextElement.fontFamily,
            color: editingTextElement.fillColor,
            textAlign: editingTextElement.textAlign as any,
            lineHeight: 1.3,
            background: 'transparent',
            border: '1.5px dashed #3b82f6',
            borderRadius: '4px',
            outline: 'none',
            resize: 'none',
            padding: '2px 4px',
            margin: 0,
            zIndex: 60,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            minWidth: `${120 * camera.scale}px`,
            minHeight: `${36 * camera.scale}px`,
          }}
        />
      )}

      <KeybindingsDialog
        isOpen={isKeybindingsOpen}
        onClose={() => setIsKeybindingsOpen(false)}
      />
    </div>
  );
}