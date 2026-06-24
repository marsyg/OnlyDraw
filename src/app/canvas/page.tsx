'use client';

import rough from 'roughjs';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/Store/store';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { generateUsername } from "unique-username-generator";
import { OnlyDrawElement, point, PointsFreeHand, ArrowBinding } from '@/types/type';
import { actionType, elementType } from '@/types/type';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
import { isPointInsideElement } from '@/lib/utils/drawingUtility/hitTest';
import { DrawBounds } from '@/lib/drawBounds';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { isPointInPaddedBounds } from '@/lib/utils/boundsUtility/isPointInPaddedBounds';
import { findNearestSnapTarget, drawGhostSnapIndicators, SnapTarget, cleanupArrowBindings, getBindingPosition, SnapLocation } from '@/lib/arrowSnap';
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
import { getGroupMembers, groupElements, ungroupElements, cleanupOrphanGroups } from '@/lib/grouping';
import { nanoid } from 'nanoid';
import WorkspaceManager from '@/component/WorkspaceManager';
import { getArrowLabelPosition } from '@/lib/utils/arrowLabel';

export default function App() {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(() => {
    return canvasDoc.activeWorkspaceId;
  });

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
    isFillTransparent,
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
    fontSize,
    fontFamily,
    textAlign,
    setFontSize,
    setFontFamily,
    setTextAlign,
    arrowRouting,
  } = useAppStore();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('canvas_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync dark mode with <html> class so CSS vars and theme tokens respect it
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('canvas_theme', isDark ? 'dark' : 'light');
    } catch {}
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
    width?: number;
    height?: number;
    fontSize: number;
    fontFamily: string;
    textAlign: string;
    fillColor: string;
    angle?: number;
    rotationAxis?: string;
    isArrow?: boolean;
  };
  const [editingTextElement, setEditingTextElement] = useState<EditingTextState | null>(null);
  const editingTextElementRef = useRef<EditingTextState | null>(null);
  const finishEditingTextRef = useRef<() => void>(() => {});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  type ElementResizeSnapshot = {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    points?: PointsFreeHand[];
    fontSize?: number;
  };
  const resizeOriginalElementsRef = useRef<ElementResizeSnapshot[]>([]);
  const justFinishedEditingTextRef = useRef<boolean>(false);
  const textCreationTimeRef = useRef<number>(0);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const isCurvingArrowRef = useRef<{ el: Y.Map<unknown> } | null>(null);

  const flagRef = useRef<boolean>(false)
  const animationFrameIdRef = useRef<number | null>(null);

  const resizeHandleRef = useRef<{ direction: string; cursor: string } | null>(null);
  const originalPointRef = useRef<PointsFreeHand[] | null>(null);
  const isRotatingRef = useRef<boolean>(false);
  const rotationCenterRef = useRef<[number, number]>([0, 0]);
  const rotationInitialAngleRef = useRef<number>(0);
  const rotationStartPointerAngleRef = useRef<number>(0);

  const marqueeBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const isMarqueeRef = useRef<boolean>(false);
  const marqueeStartRef = useRef<point | null>(null);

  const activeSnapTargetRef = useRef<SnapTarget | null>(null);
  const arrowStartBindingRef = useRef<ArrowBinding | null>(null);
  const arrowEndBindingRef = useRef<ArrowBinding | null>(null);

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

    yElement.forEach(el => {
      if (!el.get('isDeleted')) {
        // Suppress drawing the element currently being edited to avoid ghost text behind textarea
        if (editingTextElementRef.current && el.get('id') === editingTextElementRef.current.id) {
          return;
        }
        DrawElements({ ctx, element: el, rc: rc });
      }
    });
    if ((selectedYElement || selectedElementIds.length > 0) && bound) {
      // Suppress drawing canvas bounding box and resize handles while editing text (no "two boxed" issue)
      const isEditingCurrent = Boolean(
        editingTextElementRef.current &&
        ((selectedYElement && selectedYElement.get('id') === editingTextElementRef.current.id) ||
         (selectedElementIds.length === 1 && selectedElementIds[0] === editingTextElementRef.current.id))
      );
      if (!isEditingCurrent) {
        DrawBounds({ context: ctx, bounds: bound });

        const targetEl = selectedYElement || (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null);
        if (targetEl && (targetEl.get('type') === elementType.Arrow || targetEl.get('type') === elementType.ArrowTwoWay)) {
          let ax1 = Number(targetEl.get('x'));
          let ay1 = Number(targetEl.get('y'));
          let ax2 = ax1 + Number(targetEl.get('width'));
          let ay2 = ay1 + Number(targetEl.get('height'));
          const startBinding = targetEl.get('startBinding') as { elementId: string; point: SnapLocation } | undefined;
          const endBinding = targetEl.get('endBinding') as { elementId: string; point: SnapLocation } | undefined;
          if (startBinding) {
            const sp = getBindingPosition(startBinding, yElement);
            if (sp) { ax1 = sp[0]; ay1 = sp[1]; }
          }
          if (endBinding) {
            const ep = getBindingPosition(endBinding, yElement);
            if (ep) { ax2 = ep[0]; ay2 = ep[1]; }
          }
          const rawControl = targetEl.get('controlPoint') as { x: number; y: number } | undefined;
          const midX = (ax1 + ax2) / 2;
          const midY = (ay1 + ay2) / 2;
          const cx = rawControl ? rawControl.x : midX;
          const cy = rawControl ? rawControl.y : midY;

          ctx.save();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(cx, cy);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.fillStyle = '#a855f7';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (marqueeBoxRef.current) {
      const mb = marqueeBoxRef.current;
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(mb.x, mb.y, mb.width, mb.height);
      ctx.strokeRect(mb.x, mb.y, mb.width, mb.height);
      ctx.restore();
    }

    if (activeSnapTargetRef.current) {
      drawGhostSnapIndicators(ctx, activeSnapTargetRef.current);
    }

    ctx.restore();
  }, [isDark, isDragging, isResizing, isDrawing, yElement, selectedYElement, selectedElementIds, bound]);


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

  const startEditingText = useCallback((yEl: Y.Map<unknown>) => {
    const id = yEl.get('id') as string;
    const type = yEl.get('type') as string;
    const isArrow = type === elementType.Arrow || type === elementType.ArrowTwoWay;

    setYElement(yEl);
    setSelectedElementIds([id]);
    setSelectedElementId(id);
    setBound(null); // Clear canvas bounds so only ONE clean box (the editor) is visible!

    const currentFill = String(yEl.get('fillColor') || yEl.get('strokeColor') || '');
    let color = currentFill;
    if (isDark) {
      if (!color || color === '#000000' || color === 'black' || color === '#1e293b' || color === '#0f172a') {
        color = '#f8fafc';
      }
    } else {
      if (!color || color === '#ffffff' || color === 'white' || color === '#f8fafc' || color === '#f1f5f9') {
        color = '#0f172a';
      }
    }

    let edX = Number(yEl.get('x'));
    let edY = Number(yEl.get('y'));
    let edW = Number(yEl.get('width')) || 120;
    let edH = Number(yEl.get('height')) || 36;
    let edFontSize = Number(yEl.get('fontSize')) || 24;
    let edAlign = String(yEl.get('textAlign') || 'left');

    if (isArrow) {
      const pos = getArrowLabelPosition(yEl, yElement);
      edFontSize = Number(yEl.get('fontSize')) || 16;
      edAlign = 'center';
      edW = 120;
      edH = 36;
      edX = pos.x;
      edY = pos.y;
    }

    if (typeof window !== 'undefined') {
      (window as unknown as { __canvas_editing_text_id?: string | null }).__canvas_editing_text_id = id;
    }

    const nextState: EditingTextState = {
      id,
      text: String(yEl.get('text') || ''),
      x: edX,
      y: edY,
      width: edW,
      height: edH,
      fontSize: edFontSize,
      fontFamily: String(yEl.get('fontFamily') || 'sans-serif'),
      textAlign: edAlign,
      fillColor: color,
      angle: isArrow ? 0 : (Number(yEl.get('angle')) || 0),
      rotationAxis: String(yEl.get('rotationAxis') || 'center'),
      isArrow,
    };
    textCreationTimeRef.current = Date.now();
    editingTextElementRef.current = nextState;
    setEditingTextElement(nextState);
    scheduleRender();
  }, [setYElement, setSelectedElementIds, setSelectedElementId, setBound, isDark, yElement, scheduleRender]);

  const finishEditingText = useCallback(() => {
    const currentEditing = editingTextElementRef.current;
    if (!currentEditing) return;

    if (typeof window !== 'undefined') {
      (window as unknown as { __canvas_editing_text_id?: string | null }).__canvas_editing_text_id = null;
    }

    // Guard against premature blur from the click that spawned the textarea
    if (Date.now() - textCreationTimeRef.current < 250) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
      return;
    }

    const { id } = currentEditing;
    const text = textareaRef.current ? textareaRef.current.value : currentEditing.text;
    const targetYEl = yElement.get(id);
    if (!targetYEl) {
      setEditingTextElement(null);
      editingTextElementRef.current = null;
      return;
    }

    const trimmed = text.trim();
    const isArrow = targetYEl.get('type') === elementType.Arrow || targetYEl.get('type') === elementType.ArrowTwoWay;

    if (isArrow) {
      doc.transact(() => {
        targetYEl.set('text', trimmed);
      }, LOCAL_ORIGIN);
      setYElement(targetYEl);
      setSelectedElementIds([id]);
      setBound(getBounds({ element: targetYEl }));
    } else if (!trimmed) {
      doc.transact(() => {
        const delSet = new Set([id]);
        cleanupArrowBindings(delSet, yElement);
        cleanupOrphanGroups(delSet, yElement);
        yElement.delete(id);
        const idx = order.toArray().indexOf(id);
        if (idx > -1) order.delete(idx, 1);
      }, LOCAL_ORIGIN);
      setYElement(null);
      setSelectedElementIds([]);
      setBound(null);
    } else {
      const fontSize = Number(targetYEl.get('fontSize')) || currentEditing.fontSize || 24;
      const fontFamily = String(targetYEl.get('fontFamily') || currentEditing.fontFamily || 'sans-serif');
      const lines = text.split('\n');

      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      let maxWidth = 20;
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        lines.forEach((l) => {
          maxWidth = Math.max(maxWidth, ctx.measureText(l || 'M').width);
        });
      }
      const measuredWidth = Math.ceil(maxWidth);
      const measuredHeight = Math.ceil(
        lines.length > 1
          ? (lines.length - 1) * (fontSize * 1.25) + fontSize
          : fontSize * 1.15
      );

      doc.transact(() => {
        targetYEl.set('text', text);
        targetYEl.set('width', measuredWidth);
        targetYEl.set('height', measuredHeight);
        targetYEl.set('fillColor', currentEditing.fillColor);
        targetYEl.set('strokeColor', currentEditing.fillColor);
      }, LOCAL_ORIGIN);

      setYElement(targetYEl);
      setSelectedElementIds([id]);
      setBound(getBounds({ element: targetYEl }));
    }

    setEditingTextElement(null);
    editingTextElementRef.current = null;
    justFinishedEditingTextRef.current = true;
    setTimeout(() => {
      justFinishedEditingTextRef.current = false;
    }, 150);

    setCurrentTool({ action: actionType.Selecting, elementType: elementType.Select });
    setActiveToolbarId('select');
    scheduleRender();
  }, [yElement, doc, order, setYElement, setSelectedElementIds, setBound, setCurrentTool, setActiveToolbarId, scheduleRender]);

  useEffect(() => {
    finishEditingTextRef.current = finishEditingText;
  }, [finishEditingText]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const [x, y] = getPointerCoordinates(e);
      const hit = hitTestAtPoint([x, y]);
      if (hit && hit.yEl) {
        const hitType = hit.yEl.get('type');
        if (hitType === elementType.Text || hitType === elementType.Arrow || hitType === elementType.ArrowTwoWay) {
          startEditingText(hit.yEl);
          return;
        }
        // Double-clicked on a shape: center a new text element inside the shape
        const shapeX = Number(hit.yEl.get('x'));
        const shapeY = Number(hit.yEl.get('y'));
        const shapeW = Number(hit.yEl.get('width')) || 120;
        const shapeH = Number(hit.yEl.get('height')) || 40;

        const defaultColor = isDark ? '#f8fafc' : '#0f172a';
        let txtColor = fillColor || strokeColor || defaultColor;
        if (isDark && (txtColor === '#000000' || txtColor === 'black' || txtColor === '#1e293b' || txtColor === '#0f172a')) {
          txtColor = '#f8fafc';
        } else if (!isDark && (txtColor === '#ffffff' || txtColor === 'white' || txtColor === '#f8fafc' || txtColor === '#f1f5f9')) {
          txtColor = '#0f172a';
        }

        const textX = shapeX + Math.max(0, (shapeW - 120) / 2);
        const textY = shapeY + Math.max(0, (shapeH - 36) / 2);

        const textElement = handleDrawElement({
          action: actionType.Drawing,
          element: elementType.Text,
          startPoint: [textX, textY],
          endPoint: [textX + 120, textY + 36],
          options: {
            strokeColor: txtColor,
            strokeWidth: strokeWidth,
            fillColor: txtColor,
            fillStyle: fillStyle,
            roughness: roughness,
            boundaryStyle: boundaryStyle,
            fillWeight: fillWeight,
            opacity: opacity,
            hasShadow: hasShadow,
            text: '',
            fontSize: fontSize || 24,
            fontFamily: fontFamily || 'sans-serif',
            textAlign: 'center',
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
          startEditingText(createdYEl);
        }
        return;
      }

      // Double-clicked on empty canvas: create a new text element at [x, y]
      const defaultColor = isDark ? '#f8fafc' : '#0f172a';
      let txtColor = fillColor || strokeColor || defaultColor;
      if (isDark && (txtColor === '#000000' || txtColor === 'black' || txtColor === '#1e293b' || txtColor === '#0f172a')) {
        txtColor = '#f8fafc';
      } else if (!isDark && (txtColor === '#ffffff' || txtColor === 'white' || txtColor === '#f8fafc' || txtColor === '#f1f5f9')) {
        txtColor = '#0f172a';
      }

      const textElement = handleDrawElement({
        action: actionType.Drawing,
        element: elementType.Text,
        startPoint: [x, y],
        endPoint: [x + 120, y + 36],
        options: {
          strokeColor: txtColor,
          strokeWidth: strokeWidth,
          fillColor: txtColor,
          fillStyle: fillStyle,
          roughness: roughness,
          boundaryStyle: boundaryStyle,
          fillWeight: fillWeight,
          opacity: opacity,
          hasShadow: hasShadow,
          text: '',
          fontSize: fontSize || 24,
          fontFamily: fontFamily || 'sans-serif',
          textAlign: textAlign || 'left',
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
        startEditingText(createdYEl);
      }
    },
    [
      getPointerCoordinates,
      hitTestAtPoint,
      startEditingText,
      isDark,
      fillColor,
      strokeColor,
      strokeWidth,
      fillStyle,
      roughness,
      boundaryStyle,
      fillWeight,
      opacity,
      hasShadow,
      fontSize,
      fontFamily,
      textAlign,
      doc,
      yElement,
      order,
    ]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTextDrawing = currentTool.action === actionType.Drawing && currentTool.elementType === elementType.Text;
    if (!isTextDrawing) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    }

    if (editingTextElementRef.current) {
      if (Date.now() - textCreationTimeRef.current < 400) {
        return;
      }
      finishEditingTextRef.current();
      return;
    }
    if (justFinishedEditingTextRef.current) {
      justFinishedEditingTextRef.current = false;
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    // Middle-mouse or space+left-click: start panning
    if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
      e.preventDefault();
      isPanningRef.current = true;
      const cam = cameraRef.current;
      panStartRef.current = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y };
      setCursorStyle('grabbing');
      return;
    }

    const [x, y] = getPointerCoordinates(e);
    const initialPoint: point = [x, y];


    setFreehandPoint([[initialPoint[0], initialPoint[1], 1] as PointsFreeHand]);
    if (currentTool.action === actionType.Selecting) {
      const singleArrow = selectedYElement || (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null);
      if (singleArrow && (singleArrow.get('type') === elementType.Arrow || singleArrow.get('type') === elementType.ArrowTwoWay)) {
        let ax1 = Number(singleArrow.get('x'));
        let ay1 = Number(singleArrow.get('y'));
        let ax2 = ax1 + Number(singleArrow.get('width'));
        let ay2 = ay1 + Number(singleArrow.get('height'));
        const startBinding = singleArrow.get('startBinding') as { elementId: string; point: SnapLocation } | undefined;
        const endBinding = singleArrow.get('endBinding') as { elementId: string; point: SnapLocation } | undefined;
        if (startBinding) {
          const sp = getBindingPosition(startBinding, yElement);
          if (sp) { ax1 = sp[0]; ay1 = sp[1]; }
        }
        if (endBinding) {
          const ep = getBindingPosition(endBinding, yElement);
          if (ep) { ax2 = ep[0]; ay2 = ep[1]; }
        }
        const rawControl = singleArrow.get('controlPoint') as { x: number; y: number } | undefined;
        const cx = rawControl ? rawControl.x : (ax1 + ax2) / 2;
        const cy = rawControl ? rawControl.y : (ay1 + ay2) / 2;

        if (Math.hypot(initialPoint[0] - cx, initialPoint[1] - cy) <= 12) {
          isCurvingArrowRef.current = { el: singleArrow };
          setCursorStyle('crosshair');
          setIsDragging(false);
          return;
        }
      }

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

        const elementsToSnap: ElementResizeSnapshot[] = [];
        const targetIds = selectedElementIds.length > 0 ? selectedElementIds : (selectedYElement ? [selectedYElement.get('id') as string] : []);
        targetIds.forEach((id) => {
          const el = yElement.get(id);
          if (!el || el.get('isDeleted')) return;
          const elType = el.get('type') as string;
          let pts: PointsFreeHand[] | undefined = undefined;
          let fSize: number | undefined = undefined;
          if (elType === 'freehand') {
            const stroke = el.get('points') as Y.Array<Y.Map<number>>;
            if (stroke) {
              pts = stroke.toArray().map((p) => [
                Number(p.get('x')),
                Number(p.get('y')),
                Number(p.get('pressure') ?? 1),
              ]);
            }
          } else if (elType === 'text') {
            fSize = Number(el.get('fontSize')) || 24;
          }
          elementsToSnap.push({
            id,
            type: elType,
            x: Number(el.get('x')),
            y: Number(el.get('y')),
            width: Number(el.get('width')),
            height: Number(el.get('height')),
            points: pts,
            fontSize: fSize,
          });
        });
        resizeOriginalElementsRef.current = elementsToSnap;

        setLockedBounds(true);
        return;
      }

      const hit = hitTestAtPoint(initialPoint);

      if (hit && hit.yEl) {
        const groupMembers = getGroupMembers(hit.yEl, yElement);
        if (e.shiftKey) {
          const isSelected = groupMembers.some((id) => selectedElementIds.includes(id));
          const nextIds = isSelected
            ? selectedElementIds.filter((id) => !groupMembers.includes(id))
            : [...selectedElementIds, ...groupMembers.filter((id) => !selectedElementIds.includes(id))];

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
            setSelectedElementIds(groupMembers);
            if (groupMembers.length === 1) {
              setYElement(hit.yEl);
              const b = getBounds({ element: hit.yEl });
              setBound(b);
              if (b) setGlobalPointerPosition([x - b.x, y - b.y]);
            } else {
              setYElement(null);
              const cBound = getCompoundBounds(groupMembers, yElement);
              setBound(cBound);
              if (cBound) setGlobalPointerPosition([x - cBound.x, y - cBound.y]);
            }
            setIsDragging(true);
            setLockedBounds(true);
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
        const defaultColor = isDark ? '#f8fafc' : '#0f172a';
        let txtColor = fillColor || strokeColor || defaultColor;
        if (isDark && (txtColor === '#000000' || txtColor === 'black' || txtColor === '#1e293b' || txtColor === '#0f172a')) {
          txtColor = '#f8fafc';
        } else if (!isDark && (txtColor === '#ffffff' || txtColor === 'white' || txtColor === '#f8fafc' || txtColor === '#f1f5f9')) {
          txtColor = '#0f172a';
        }

        const textElement = handleDrawElement({
          action: actionType.Drawing,
          element: elementType.Text,
          startPoint: initialPoint,
          endPoint: [initialPoint[0] + 120, initialPoint[1] + 36],
          options: {
            strokeColor: txtColor,
            strokeWidth: strokeWidth,
            fillColor: txtColor,
            fillStyle: fillStyle,
            roughness: roughness,
            boundaryStyle: boundaryStyle,
            fillWeight: fillWeight,
            opacity: opacity,
            hasShadow: hasShadow,
            text: '',
            fontSize: fontSize || 24,
            fontFamily: fontFamily || 'sans-serif',
            textAlign: textAlign || 'left',
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
          startEditingText(createdYEl);
        }
        return;
      }

      setCursorStyle("crosshair");

      const isArrowTool =
        currentTool.elementType === elementType.Arrow ||
        currentTool.elementType === elementType.ArrowTwoWay;
      let startPoint = initialPoint;
      if (isArrowTool) {
        const snap = findNearestSnapTarget(initialPoint, yElement);
        if (snap) {
          startPoint = [snap.x, snap.y];
          arrowStartBindingRef.current = { elementId: snap.elementId, point: snap.location };
        } else {
          arrowStartBindingRef.current = null;
        }
        arrowEndBindingRef.current = null;
      }

      const element = handleDrawElement({
        action: actionType.Drawing,
        element: currentTool.elementType,
        startPoint: startPoint,
        endPoint: startPoint,
        options: {
          strokeColor: strokeColor,
          strokeWidth: strokeWidth,
          fillColor: fillColor,
          isFillTransparent: isFillTransparent,
          fillStyle: fillStyle,
          roughness: roughness,
          boundaryStyle: boundaryStyle,
          fillWeight: fillWeight,
          opacity: opacity,
          hasShadow: hasShadow,
          startBinding: arrowStartBindingRef.current,
          endBinding: null,
          routing: isArrowTool ? arrowRouting : undefined,
        },
        stroke: {
          points: [[startPoint[0], startPoint[1], 1]],
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
    strokeWidth, fillColor, isFillTransparent, fillStyle, roughness, boundaryStyle, fillWeight, doc, yElement,
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

    if (isCurvingArrowRef.current) {
      const targetEl = isCurvingArrowRef.current.el;
      doc.transact(() => {
        targetEl.set('controlPoint', { x, y });
        targetEl.set('routing', 'curved');
      }, LOCAL_ORIGIN);
      scheduleRender();
      return;
    }

    if (isMarqueeRef.current && marqueeStartRef.current) {
      const [startX, startY] = marqueeStartRef.current;
      const boxX = Math.min(startX, x);
      const boxY = Math.min(startY, y);
      const boxW = Math.abs(x - startX);
      const boxH = Math.abs(y - startY);
      marqueeBoxRef.current = { x: boxX, y: boxY, width: boxW, height: boxH };
      scheduleRender();
      return;
    }

    const pt: point = [x, y];
    const now = Date.now();
    if (now - lastMoveTimeRef.current < MOVE_THROTTLE_MS && !isDrawing && !isDragging && !isResizing) {
      return;
    }
    lastMoveTimeRef.current = now;

    if (
      currentTool.action === actionType.Drawing &&
      (currentTool.elementType === elementType.Arrow || currentTool.elementType === elementType.ArrowTwoWay) &&
      !isDrawing
    ) {
      const snap = findNearestSnapTarget([x, y], yElement);
      if (snap) {
        activeSnapTargetRef.current = snap;
        setCursorStyle('crosshair');
        scheduleRender();
      } else if (activeSnapTargetRef.current) {
        activeSnapTargetRef.current = null;
        setCursorStyle('crosshair');
        scheduleRender();
      }
    }

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

      } else if (type === elementType.Arrow || type === elementType.ArrowTwoWay) {
        const arrowId = selectedYElement.get('id') as string;
        const snap = findNearestSnapTarget([x, y], yElement, arrowId);
        let endX = x;
        let endY = y;
        if (snap) {
          endX = snap.x;
          endY = snap.y;
          activeSnapTargetRef.current = snap;
          arrowEndBindingRef.current = { elementId: snap.elementId, point: snap.location };
        } else {
          activeSnapTargetRef.current = null;
          arrowEndBindingRef.current = null;
        }

        const startX = Number(selectedYElement.get('x'));
        const startY = Number(selectedYElement.get('y'));
        const updatedElement = {
          ...elementJSON,
          width: endX - startX,
          height: endY - startY,
          endBinding: arrowEndBindingRef.current,
          startBinding: arrowStartBindingRef.current,
        };
        doc.transact(() => {
          yUtils.updateYElement(updatedElement as OnlyDrawElement, selectedYElement);
        }, LOCAL_ORIGIN);
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
      if (!resizeHandle) return;

      if (resizeHandle === 'rotate') {
        const targetEl = selectedYElement || (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null);
        if (!targetEl) return;
        const [cx, cy] = rotationCenterRef.current;
        const currentPointerAngle = Math.atan2(y - cy, x - cx);
        const deltaAngle = currentPointerAngle - rotationStartPointerAngleRef.current;
        let newAngle = rotationInitialAngleRef.current + deltaAngle;

        if (e.shiftKey) {
          const snapStep = Math.PI / 12; // 15 degrees snap
          newAngle = Math.round(newAngle / snapStep) * snapStep;
        }

        doc.transact(() => {
          targetEl.set('angle', newAngle);
        }, LOCAL_ORIGIN);

        setBound(getBounds({ element: targetEl }));
        scheduleRender();
        return;
      }

      if (!GlobalPointerPosition) return;

      const startPointer = resizeStartPointerRef.current;
      const originalBound = resizeOriginalRectRef.current;

      if (!startPointer || !originalBound || !bound) return;
      const isSingleText = (selectedYElement?.get('type') === elementType.Text) ||
        (resizeOriginalElementsRef.current.length === 1 && resizeOriginalElementsRef.current[0].type === 'text');
      const proportional = e.shiftKey || isSingleText;
      const resizedBound = resizeBound(resizeHandle, startPointer, [x, y], originalBound, proportional);

      setBound(resizedBound);
      scheduleRender();

      if (resizeOriginalElementsRef.current.length > 1) {
        const scaleX = resizedBound.width / Math.max(1, originalBound.width);
        const scaleY = resizedBound.height / Math.max(1, originalBound.height);

        doc.transact(() => {
          resizeOriginalElementsRef.current.forEach((snap) => {
            const el = yElement.get(snap.id);
            if (!el) return;
            const relX = snap.x - originalBound.x;
            const relY = snap.y - originalBound.y;
            const newX = resizedBound.x + relX * scaleX;
            const newY = resizedBound.y + relY * scaleY;
            const newW = snap.width * scaleX;
            const newH = snap.height * scaleY;

            el.set('x', newX);
            el.set('y', newY);
            el.set('width', newW);
            el.set('height', newH);

            if (snap.type === 'text' && snap.fontSize) {
              const textScale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
              const newFontSize = Math.max(8, Math.min(300, Math.round(snap.fontSize * textScale)));
              el.set('fontSize', newFontSize);
            }

            if (snap.type === 'freehand' && snap.points) {
              const newPointsY = new canvasDoc.Y.Array<Y.Map<number>>();
              snap.points.forEach(([px, py, pressure]) => {
                const pointMap = new Y.Map<number>();
                pointMap.set('x', px * scaleX);
                pointMap.set('y', py * scaleY);
                pointMap.set('pressure', pressure);
                newPointsY.push([pointMap]);
              });
              el.set('points', newPointsY);
            }
          });
        }, LOCAL_ORIGIN);
      } else {
        const singleTarget = selectedYElement || (resizeOriginalElementsRef.current.length === 1 ? yElement.get(resizeOriginalElementsRef.current[0].id) : null);
        if (singleTarget) {
          const originalPoint = originalPointRef.current;
          const snap = resizeOriginalElementsRef.current[0];
          doc.transact(() => {
            resizeElement({
              element: singleTarget,
              newBounds: resizedBound,
              oldBounds: originalBound,
              originalPoints: originalPoint,
              originalFontSize: snap?.fontSize,
            });
          }, LOCAL_ORIGIN);
        }
      }
      return;
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
      marqueeBoxRef.current = null;
      const [endX, endY] = getPointerCoordinates(e);
      const box = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
      };

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

        // Expand to include full group members if any grouped element was selected
        const expandedIds = new Set<string>();
        foundIds.forEach((id) => {
          const el = yElement.get(id);
          if (el) {
            const members = getGroupMembers(el, yElement);
            members.forEach((mId) => expandedIds.add(mId));
          } else {
            expandedIds.add(id);
          }
        });
        const finalIds = Array.from(expandedIds);

        setSelectedElementIds(finalIds);
        if (finalIds.length === 1) {
          const singleEl = yElement.get(finalIds[0]) || null;
          setYElement(singleEl);
          setBound(singleEl ? getBounds({ element: singleEl }) : null);
          setLockedBounds(true);
        } else if (finalIds.length > 1) {
          setYElement(null);
          setBound(getCompoundBounds(finalIds, yElement));
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

    if (isDrawing) {
      activeSnapTargetRef.current = null;
      if (selectedYElement) {
        const type = selectedYElement.get('type') as unknown as elementType;
        if (type === elementType.Arrow || type === elementType.ArrowTwoWay) {
          const w = Number(selectedYElement.get('width'));
          const h = Number(selectedYElement.get('height'));
          if (Math.hypot(w, h) < 6) {
            doc.transact(() => {
              selectedYElement.set('width', 100);
              selectedYElement.set('height', 0);
            }, LOCAL_ORIGIN);
          }
        }
      }
      arrowStartBindingRef.current = null;
      arrowEndBindingRef.current = null;
    }

    if (isCurvingArrowRef.current) {
      const targetEl = isCurvingArrowRef.current.el;
      isCurvingArrowRef.current = null;
      setBound(getBounds({ element: targetEl }));
      scheduleRender();
      return;
    }

    const wasMoving = isDrawing || isDragging || isResizing || isPanningRef.current;
    setIsDrawing(false);
    setIsDragging(false);

    flagRef.current = false;

    setFreehandPoint(null);

    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}

    if (!wasMoving && (e.pointerType === 'touch' || isTouchDevice)) {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (lastTap && now - lastTap.time < 350) {
        const dist = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y);
        if (dist < 30) {
          lastTapRef.current = null;
          handleDoubleClick(e as unknown as React.MouseEvent);
          return;
        }
      }
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }

    if (isResizing) {
      if (selectedElementIds.length > 1) {
        setBound(getCompoundBounds(selectedElementIds, yElement));
      } else {
        const single = selectedYElement || (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null);
        if (single) {
          setBound(getBounds({ element: single }));
        }
      }
    }

    resizeHandleRef.current = null;
    setIsResizing(false);
    isRotatingRef.current = false;
    UndoManager.stopCapturing();
    setResizeHandle(null);
    setCursorStyle(isSpacePressedRef.current ? 'grab' : 'default');
    resizeStartPointerRef.current = null;
    resizeOriginalRectRef.current = null;
    resizeOriginalElementsRef.current = [];
    scheduleRender();
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
    handleDoubleClick,
    isTouchDevice,
  ]);



  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    // If the browser supports Pointer Events, onPointerDown already handles it
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      return;
    }
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
  }, [handlePointerMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.changedTouches[0];
    if (touch) {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (lastTap && now - lastTap.time < 350) {
        const dist = Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y);
        if (dist < 30) {
          lastTapRef.current = null;
          handleDoubleClick({ clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent);
          return;
        }
      }
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    }

    const syntheticEvent = {
      clientX: e.changedTouches[0]?.clientX || 0,
      clientY: e.changedTouches[0]?.clientY || 0,
      currentTarget: canvas,
      target: canvas,
    } as unknown as React.PointerEvent;

    handlePointerUp(syntheticEvent);
  }, [handlePointerUp, handleDoubleClick]);
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
        // Unbind any arrows attached to elements being deleted
        cleanupArrowBindings(idsToDelete, yElement);
        // Clean up orphan groups if elements being deleted reduce group size to <= 1
        cleanupOrphanGroups(idsToDelete, yElement);

        idsToDelete.forEach((key) => {
          yElement.delete(key);
          const index = order.toArray().indexOf(key);
          if (index > -1) {
            order.delete(index, 1);
          }
        });
      }, LOCAL_ORIGIN);

      if (editingTextElementRef.current && idsToDelete.has(editingTextElementRef.current.id)) {
        editingTextElementRef.current = null;
        setEditingTextElement(null);
      }

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

  const insertTextElement = useCallback(
    (text: string, customX?: number, customY?: number) => {
      const canvas = canvasRef.current;
      const cam = cameraRef.current;
      const screenCenterX = canvas ? canvas.width / 2 : window.innerWidth / 2;
      const screenCenterY = canvas ? canvas.height / 2 : window.innerHeight / 2;
      const defaultX = (screenCenterX - cam.x) / cam.scale;
      const defaultY = (screenCenterY - cam.y) / cam.scale;
      const targetX = customX !== undefined ? customX : defaultX - 80;
      const targetY = customY !== undefined ? customY : defaultY - 20;

      const fSize = fontSize || 24;
      const fFam = fontFamily || 'sans-serif';
      const lines = text.split('\n');

      let maxW = 40;
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.font = `${fSize}px ${fFam}`;
          lines.forEach((line) => {
            maxW = Math.max(maxW, ctx.measureText(line || 'M').width);
          });
        }
      }
      const measuredWidth = Math.ceil(maxW);
      const measuredHeight = Math.ceil(
        lines.length > 1 ? (lines.length - 1) * (fSize * 1.25) + fSize : fSize * 1.15
      );

      const defaultColor = isDark ? '#f8fafc' : '#0f172a';
      let txtColor = fillColor || strokeColor || defaultColor;
      if (isDark && (txtColor === '#000000' || txtColor === 'black' || txtColor === '#1e293b' || txtColor === '#0f172a')) {
        txtColor = '#f8fafc';
      } else if (!isDark && (txtColor === '#ffffff' || txtColor === 'white' || txtColor === '#f8fafc' || txtColor === '#f1f5f9')) {
        txtColor = '#0f172a';
      }

      const textElement = handleDrawElement({
        action: actionType.Drawing,
        element: elementType.Text,
        startPoint: [targetX, targetY],
        endPoint: [targetX + measuredWidth, targetY + measuredHeight],
        options: {
          strokeColor: txtColor,
          strokeWidth: strokeWidth,
          fillColor: txtColor,
          isFillTransparent: true, // Transparent so it cleanly overlaps any diagram
          fillStyle: fillStyle,
          roughness: roughness,
          boundaryStyle: boundaryStyle,
          fillWeight: fillWeight,
          opacity: opacity,
          hasShadow: hasShadow,
          text: text,
          fontSize: fSize,
          fontFamily: fFam,
          textAlign: textAlign || 'left',
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
        setSelectedElementIds([textElement.id]);
        setYElement(createdYEl);
        setBound(getBounds({ element: createdYEl }));
        setLockedBounds(true);
        setCurrentTool({ action: actionType.Selecting, elementType: elementType.Select });
        setActiveToolbarId('select');
        scheduleRender();
      }
    },
    [
      doc,
      yElement,
      order,
      fontSize,
      fontFamily,
      isDark,
      fillColor,
      strokeColor,
      strokeWidth,
      fillStyle,
      roughness,
      boundaryStyle,
      fillWeight,
      opacity,
      hasShadow,
      textAlign,
      setSelectedElementIds,
      setYElement,
      setBound,
      setLockedBounds,
      setCurrentTool,
      setActiveToolbarId,
      scheduleRender,
    ]
  );

  const insertImageElement = useCallback((dataUrl: string, targetX: number, targetY: number) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 300;
      let h = img.naturalHeight || 200;
      const maxDim = 400;
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const id = nanoid();
      const newMap = new canvasDoc.Y.Map<unknown>();
      newMap.set('id', id);
      newMap.set('type', elementType.Image);
      newMap.set('x', targetX);
      newMap.set('y', targetY);
      newMap.set('width', w);
      newMap.set('height', h);
      newMap.set('src', dataUrl);
      newMap.set('naturalWidth', img.naturalWidth);
      newMap.set('naturalHeight', img.naturalHeight);
      newMap.set('seed', Math.floor(Math.random() * 2 ** 31));
      newMap.set('opacity', 1);
      newMap.set('hasShadow', false);
      newMap.set('angle', 0);
      newMap.set('rotationAxis', 'center');
      newMap.set('isDeleted', false);
      newMap.set('author', doc.clientID);

      doc.transact(() => {
        yElement.set(id, newMap);
        order.push([id]);
      }, LOCAL_ORIGIN);

      setSelectedElementIds([id]);
      setYElement(newMap);
      setBound(getBounds({ element: newMap }));
      setLockedBounds(true);
      setCurrentTool({ action: actionType.Selecting, elementType: elementType.Select });
      setActiveToolbarId('select');
      scheduleRender();
    };
    img.src = dataUrl;
  }, [doc, yElement, order, setSelectedElementIds, setYElement, setBound, setLockedBounds, setCurrentTool, setActiveToolbarId, scheduleRender]);

  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const canvas = canvasRef.current;
        const cam = cameraRef.current;
        const screenCenterX = canvas ? canvas.width / 2 : window.innerWidth / 2;
        const screenCenterY = canvas ? canvas.height / 2 : window.innerHeight / 2;
        const worldX = (screenCenterX - cam.x) / cam.scale;
        const worldY = (screenCenterY - cam.y) / cam.scale;
        insertImageElement(dataUrl, worldX - 150, worldY - 100);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [insertImageElement]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const [worldX, worldY] = getPointerCoordinates(e);
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            insertImageElement(dataUrl, worldX, worldY);
          }
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    const textData = e.dataTransfer.getData('text/plain');
    if (textData && textData.trim().length > 0) {
      const [worldX, worldY] = getPointerCoordinates(e);
      insertTextElement(textData, worldX, worldY);
    }
  }, [getPointerCoordinates, insertImageElement, insertTextElement]);

  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              const reader = new FileReader();
              reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                if (dataUrl) {
                  const canvas = canvasRef.current;
                  const cam = cameraRef.current;
                  const screenCenterX = canvas ? canvas.width / 2 : window.innerWidth / 2;
                  const screenCenterY = canvas ? canvas.height / 2 : window.innerHeight / 2;
                  const worldX = (screenCenterX - cam.x) / cam.scale;
                  const worldY = (screenCenterY - cam.y) / cam.scale;
                  insertImageElement(dataUrl, worldX - 150, worldY - 100);
                }
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }
      }

      const text = e.clipboardData?.getData('text/plain');
      if (text && text.trim().length > 0) {
        e.preventDefault();
        insertTextElement(text);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [insertImageElement, insertTextElement]);

  const selectTool = useCallback(
    (id: string, action: actionType, elType: elementType) => {
      if (id === 'image') {
        imageInputRef.current?.click();
        return;
      }
      setActiveToolbarId(id);
      setCurrentTool({ action, elementType: elType });
      setIsSelecting(action === actionType.Selecting);
      setIsDragging(action === actionType.Dragging);
      setBound(null);
      activeSnapTargetRef.current = null;
      arrowStartBindingRef.current = null;
      arrowEndBindingRef.current = null;
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

  const handlePaste = useCallback(async () => {
    if (clipboard) {
      if (Array.isArray(clipboard)) {
        const newIds: string[] = [];
        doc.transact(() => {
          const newElements = deserializeYElements(clipboard, { x: 30, y: 30 }, yElement);
          newElements.forEach((el) => {
            const id = el.get('id') as string;
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
        let newYElement: Y.Map<unknown> | null = null;
        let newId = '';
        doc.transact(() => {
          newYElement = deserializeYElement(clipboard, { x: 30, y: 30 }, yElement);
          newId = newYElement.get('id') as string;
          order.push([newId]);
        }, LOCAL_ORIGIN);

        setClipboard({
          ...clipboard,
          x: (Number(clipboard.x) || 0) + 30,
          y: (Number(clipboard.y) || 0) + 30,
        });

        if (newYElement) {
          setSelectedElementIds([newId]);
          setYElement(newYElement);
          const bounds = getBounds({ element: newYElement });
          setBound(bounds);
          setLockedBounds(true);
          scheduleRender();
        }
      }
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        if (navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                if (dataUrl) {
                  const canvas = canvasRef.current;
                  const cam = cameraRef.current;
                  const screenCenterX = canvas ? canvas.width / 2 : window.innerWidth / 2;
                  const screenCenterY = canvas ? canvas.height / 2 : window.innerHeight / 2;
                  const worldX = (screenCenterX - cam.x) / cam.scale;
                  const worldY = (screenCenterY - cam.y) / cam.scale;
                  insertImageElement(dataUrl, worldX - 150, worldY - 100);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
        if (navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim().length > 0) {
            insertTextElement(text);
            return;
          }
        }
      }
    } catch {}
  }, [clipboard, doc, yElement, order, setClipboard, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender, insertImageElement, insertTextElement]);

  const handleDuplicate = useCallback(() => {
    if (selectedElementIds.length > 1) {
      const els: Y.Map<unknown>[] = [];
      selectedElementIds.forEach((id) => {
        const el = yElement.get(id);
        if (el && !el.get('isDeleted')) els.push(el);
      });
      if (els.length === 0) return;
      const serialized = serializeYElements(els);
      const newIds: string[] = [];

      doc.transact(() => {
        const newElements = deserializeYElements(serialized, { x: 30, y: 30 }, yElement);
        newElements.forEach((el) => {
          const id = el.get('id') as string;
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
      let newYElement: Y.Map<unknown> | null = null;
      let newId = '';
      doc.transact(() => {
        newYElement = deserializeYElement(serialized, { x: 30, y: 30 }, yElement);
        newId = newYElement.get('id') as string;
        order.push([newId]);
      }, LOCAL_ORIGIN);

      if (newYElement) {
        setSelectedElementIds([newId]);
        setYElement(newYElement);
        const bounds = getBounds({ element: newYElement });
        setBound(bounds);
        setLockedBounds(true);
        scheduleRender();
      }
    }
  }, [selectedElementIds, selectedYElement, doc, yElement, order, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender]);

  const handleCut = useCallback(() => {
    if (!selectedYElement && selectedElementIds.length === 0) return;
    handleCopy();
    handleDelete();
  }, [selectedYElement, selectedElementIds, handleCopy, handleDelete]);

  const handleDeselect = useCallback(() => {
    isMarqueeRef.current = false;
    marqueeBoxRef.current = null;
    setIsDragging(false);
    setIsResizing(false);
    setIsDrawing(false);
    activeSnapTargetRef.current = null;
    arrowStartBindingRef.current = null;
    arrowEndBindingRef.current = null;
    resizeOriginalElementsRef.current = [];
    setSelectedElementIds([]);
    setYElement(null);
    setBound(null);
    setLockedBounds(false);
    if (editingTextElementRef.current) {
      finishEditingTextRef.current();
    }
    setCurrentTool({ action: actionType.Selecting, elementType: elementType.Select });
    setActiveToolbarId('select');
    scheduleRender();
  }, [setSelectedElementIds, setYElement, setBound, setLockedBounds, setCurrentTool, setActiveToolbarId, scheduleRender, setIsDragging, setIsResizing, setIsDrawing]);

  const handleSelectAll = useCallback(() => {
    const allIds = order.toArray().filter((id) => {
      const el = yElement.get(id);
      return el && !el.get('isDeleted');
    });
    if (allIds.length === 0) return;
    setSelectedElementIds(allIds);
    if (allIds.length === 1) {
      const el = yElement.get(allIds[0]) || null;
      setYElement(el);
      setBound(el ? getBounds({ element: el }) : null);
    } else {
      setYElement(null);
      setBound(getCompoundBounds(allIds, yElement));
    }
    setLockedBounds(true);
    scheduleRender();
  }, [order, yElement, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender]);

  const handleGroup = useCallback(() => {
    if (selectedElementIds.length < 2) return;
    groupElements(selectedElementIds, yElement, doc);
    setBound(getCompoundBounds(selectedElementIds, yElement));
    scheduleRender();
  }, [selectedElementIds, yElement, doc, scheduleRender]);

  const handleUngroup = useCallback(() => {
    const targetIds = selectedElementIds.length > 0
      ? selectedElementIds
      : (selectedYElement ? [selectedYElement.get('id') as string] : []);
    if (targetIds.length === 0) return;
    ungroupElements(targetIds, yElement, doc);
    scheduleRender();
  }, [selectedElementIds, selectedYElement, yElement, doc, scheduleRender]);

  const handleAlign = useCallback((type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => {
    if (selectedElementIds.length < 2) return;
    const els = selectedElementIds.map(id => yElement.get(id)).filter((el): el is Y.Map<unknown> => !!el && !el.get('isDeleted'));
    if (els.length < 2) return;

    const compound = getCompoundBounds(selectedElementIds, yElement);
    if (!compound) return;

    doc.transact(() => {
      switch (type) {
        case 'left':
          els.forEach(el => el.set('x', compound.x));
          break;
        case 'center': {
          const midX = compound.x + compound.width / 2;
          els.forEach(el => {
            const w = Number(el.get('width')) || 0;
            el.set('x', midX - w / 2);
          });
          break;
        }
        case 'right': {
          const rightX = compound.x + compound.width;
          els.forEach(el => {
            const w = Number(el.get('width')) || 0;
            el.set('x', rightX - w);
          });
          break;
        }
        case 'top':
          els.forEach(el => el.set('y', compound.y));
          break;
        case 'middle': {
          const midY = compound.y + compound.height / 2;
          els.forEach(el => {
            const h = Number(el.get('height')) || 0;
            el.set('y', midY - h / 2);
          });
          break;
        }
        case 'bottom': {
          const bottomY = compound.y + compound.height;
          els.forEach(el => {
            const h = Number(el.get('height')) || 0;
            el.set('y', bottomY - h);
          });
          break;
        }
        case 'distribute-h': {
          const sorted = [...els].sort((a, b) => Number(a.get('x')) - Number(b.get('x')));
          const totalW = sorted.reduce((acc, el) => acc + (Number(el.get('width')) || 0), 0);
          const freeSpace = compound.width - totalW;
          const gap = freeSpace / Math.max(1, sorted.length - 1);
          let currX = compound.x;
          sorted.forEach(el => {
            el.set('x', currX);
            currX += (Number(el.get('width')) || 0) + gap;
          });
          break;
        }
        case 'distribute-v': {
          const sorted = [...els].sort((a, b) => Number(a.get('y')) - Number(b.get('y')));
          const totalH = sorted.reduce((acc, el) => acc + (Number(el.get('height')) || 0), 0);
          const freeSpace = compound.height - totalH;
          const gap = freeSpace / Math.max(1, sorted.length - 1);
          let currY = compound.y;
          sorted.forEach(el => {
            el.set('y', currY);
            currY += (Number(el.get('height')) || 0) + gap;
          });
          break;
        }
      }
    }, LOCAL_ORIGIN);

    const newBound = getCompoundBounds(selectedElementIds, yElement);
    setBound(newBound);
    scheduleRender();
  }, [selectedElementIds, yElement, doc, scheduleRender, setBound]);

  const keybindingActions = useMemo(
    () => ({
      'tool.select': () => selectTool('select', actionType.Selecting, elementType.Select),
      'tool.rectangle': () => selectTool('rectangle', actionType.Drawing, elementType.Rectangle),
      'tool.ellipse': () => selectTool('circle', actionType.Drawing, elementType.Ellipse),
      'tool.line': () => selectTool('line', actionType.Drawing, elementType.Line),
      'tool.arrow': () => selectTool('arrow', actionType.Drawing, elementType.Arrow),
      'tool.arrow-two-way': () => selectTool('arrowTwoWay', actionType.Drawing, elementType.ArrowTwoWay),
      'tool.freehand': () => selectTool('freeHand', actionType.Drawing, elementType.Freehand),
      'tool.text': () => selectTool('text', actionType.Drawing, elementType.Text),
      'tool.image': () => imageInputRef.current?.click(),
      'edit.editText': () => {
        if (selectedYElement && selectedYElement.get('type') === elementType.Text) {
          startEditingText(selectedYElement);
        } else if (selectedElementIds.length === 1) {
          const el = yElement.get(selectedElementIds[0]);
          if (el && el.get('type') === elementType.Text) {
            startEditingText(el);
          }
        }
      },
      'edit.undo': handleUndoClick,
      'edit.redo': handleRedoClick,
      'edit.copy': handleCopy,
      'edit.paste': handlePaste,
      'edit.duplicate': handleDuplicate,
      'edit.cut': handleCut,
      'edit.selectAll': handleSelectAll,
      'edit.delete': handleDelete,
      'edit.deselect': handleDeselect,
      'edit.group': handleGroup,
      'edit.ungroup': handleUngroup,
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
      handleGroup,
      handleUngroup,
      startEditingText,
      selectedYElement,
      selectedElementIds,
      yElement,
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

  // Listen for workspace changes to re-render and re-bind active Y.Doc
  useEffect(() => {
    const handleWsChange = (e: Event) => {
      const custom = e as CustomEvent<{ workspaceId: string }>;
      const newId = custom.detail?.workspaceId || canvasDoc.activeWorkspaceId;
      setActiveWorkspaceIdState(newId);
      setYElement(null);
      setSelectedElementIds([]);
      setBound(null);
      scheduleRender();
    };
    window.addEventListener('canvas:workspace-changed', handleWsChange);
    return () => window.removeEventListener('canvas:workspace-changed', handleWsChange);
  }, [scheduleRender, setYElement, setSelectedElementIds, setBound]);

  // IndexedDB local storage sync listener
  useEffect(() => {
    const p = canvasDoc.persistence;
    if (!p) return;
    const handleSynced = () => {
      scheduleRender();
    };
    p.on('synced', handleSynced);
    return () => {
      p.off('synced', handleSynced);
    };
  }, [scheduleRender, activeWorkspaceId]);

  useEffect(() => {
    const currentYEl = canvasDoc.yElement;
    const observerDeep = () => {
      scheduleRender();
    };

    currentYEl.observeDeep(observerDeep);
    scheduleRender();
    return () => {
      currentYEl.unobserveDeep(observerDeep);
    };
  }, [scheduleRender, activeWorkspaceId]);

  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (isMarqueeRef.current || isDragging || isResizing || isDrawing) {
        handlePointerUp(e as unknown as React.PointerEvent);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [handlePointerUp, isDragging, isResizing, isDrawing]);

  useEffect(() => {
    const handleRedraw = () => scheduleRender();
    window.addEventListener('canvas:redraw', handleRedraw);
    return () => window.removeEventListener('canvas:redraw', handleRedraw);
  }, [scheduleRender]);

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
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <RoughSketchToolbox
        isDark={isDark}
        onDelete={handleDelete}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onImageUpload={() => imageInputRef.current?.click()}
        onEditText={() => {
          const isTextOrArrow = (el: Y.Map<unknown>) => {
            const t = el.get('type');
            return t === elementType.Text || t === elementType.Arrow || t === elementType.ArrowTwoWay;
          };
          if (selectedYElement && isTextOrArrow(selectedYElement)) {
            startEditingText(selectedYElement);
          } else if (selectedElementIds.length === 1) {
            const el = yElement.get(selectedElementIds[0]);
            if (el && isTextOrArrow(el)) {
              startEditingText(el);
            }
          }
        }}
        onAlign={handleAlign}
      />
      <FeaturePanel isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />
      {/* ── Top Left: Workspace Manager ── */}
      <div className={`fixed ${isTouchDevice ? 'top-2 left-2' : 'top-4 left-4'} z-50 select-none`}>
        <WorkspaceManager isDark={isDark} />
      </div>
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
        className={`fixed ${isTouchDevice ? 'top-2 right-2' : 'top-4 right-4'} z-50 select-none`}
        initial={false}
      >
        {!isCollaborating ? (
          <>
            {!showRoomInput ? (
              <motion.button
                onClick={() => setShowRoomInput(true)}
                className={`${isTouchDevice ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'} rounded-xl font-bold uppercase tracking-wide flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-colors border ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                    : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-slate-200/50'
                }`}
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
                className={`backdrop-blur-xl rounded-2xl p-3 space-y-2 border shadow-2xl ${isTouchDevice ? 'w-[180px]' : 'w-[230px]'} ${
                  isDark
                    ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
                    : 'bg-white/95 border-slate-200 text-slate-800'
                }`}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <input
                  type='text'
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder='Room ID'
                  className={`w-full px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isTouchDevice ? 'text-[10px]' : 'text-xs'} ${
                    isDark
                      ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isTouchDevice ? 'text-[10px]' : 'text-xs'} ${
                    isDark
                      ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
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
                    className={`flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold ${isTouchDevice ? 'text-[10px]' : 'text-xs'} uppercase tracking-wide transition-all active:scale-95 shadow-md shadow-blue-500/20`}
                  >
                    Join
                  </button>
                  <button
                    onClick={() => {
                      setShowRoomInput(false);
                      setRoomId('');
                    }}
                    className={`px-3 py-2 rounded-lg ${isTouchDevice ? 'text-[10px]' : 'text-xs'} uppercase font-bold transition-colors ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
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
            className={`backdrop-blur-xl rounded-xl p-2.5 space-y-2 border shadow-xl ${isTouchDevice ? 'w-[140px]' : 'w-[180px]'} ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {connectionStatus === 'connecting' ? (
                  <>
                    <div className='w-2 h-2 bg-yellow-500 rounded-full animate-pulse'></div>
                    <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Connecting
                    </span>
                  </>
                ) : (
                  <>
                    <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                    <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Live
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={stopCollaboration}
                className='px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase transition-all active:scale-95'
                title="Disconnect"
              >
                ✕
              </button>
            </div>
            <div className={`text-[10px] font-mono px-2 py-1 rounded border truncate ${
              isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {roomId}
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className={`fixed ${isTouchDevice ? 'bottom-2 right-2' : 'bottom-4 right-4'} z-50 flex items-center gap-2 select-none`}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Zoom & View Controls */}
        <div className={`flex items-center backdrop-blur-md rounded-xl p-1 shadow-xl border transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/40'
            : 'bg-white/90 border-slate-200 text-slate-700 shadow-slate-200/50'
        }`}>
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
              const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
              zoomCamera(-100, cx, cy);
              scheduleRender();
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>

          <button
            onClick={() => {
              resetCamera();
              scheduleRender();
            }}
            className={`px-2 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-colors min-w-[50px] ${
              isDark ? 'hover:bg-slate-800 text-slate-200 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
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
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <button
            onClick={() => {
              resetCamera();
              scheduleRender();
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-l ml-1 pl-1 ${
              isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title="Reset View"
          >
            <Maximize2 size={14} />
          </button>

          <button
            onClick={handleExportPNG}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-l ml-1 pl-1 ${
              isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title="Export to PNG"
          >
            <Download size={14} />
          </button>

          <button
            onClick={() => setIsKeybindingsOpen(true)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-l ml-1 pl-1 ${
              isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={14} />
          </button>
        </div>

        {/* Undo / Redo */}
        <motion.button
          onClick={handleUndoClick}
          className={`${isTouchDevice ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl font-bold flex items-center justify-center shadow-lg border backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-slate-200/50'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Undo (Ctrl+Z)"
        >
          <span className={isTouchDevice ? 'text-base' : 'text-lg'}>↶</span>
        </motion.button>

        <motion.button
          onClick={handleRedoClick}
          className={`${isTouchDevice ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl font-bold flex items-center justify-center shadow-lg border backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-slate-200/50'
          }`}
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
          autoFocus
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          value={editingTextElement.text}
          onChange={(e) => {
            const nextVal = e.target.value;
            setEditingTextElement((prev) => {
              const updated = prev ? { ...prev, text: nextVal } : null;
              editingTextElementRef.current = updated;
              return updated;
            });
          }}
          onBlur={finishEditingText}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              finishEditingText();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              finishEditingText();
            }
          }}
          placeholder={editingTextElement.isArrow ? "Label arrow..." : "Type text..."}
          style={(() => {
            const lines = (editingTextElement.text || ' ').split('\n');
            const canvas = canvasRef.current;
            const ctx = canvas ? canvas.getContext('2d') : null;
            let maxLineWidth = 0;
            if (ctx) {
              ctx.font = `${editingTextElement.fontSize}px ${editingTextElement.fontFamily}`;
              lines.forEach((l) => {
                maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l || 'M').width);
              });
            }
            const currentScale = camera.scale;
            const lineH = editingTextElement.fontSize * 1.25;
            const minW = editingTextElement.isArrow ? 40 : 20;
            const textW = Math.max(editingTextElement.text ? minW : 48, maxLineWidth);
            const editorWidth = Math.ceil((textW + 4) * currentScale);
            const editorHeight = Math.ceil((Math.max(1, lines.length) * lineH + 2) * currentScale);

            let textColor = editingTextElement.fillColor;
            if (isDark) {
              if (!textColor || textColor === '#000000' || textColor === 'black' || textColor === '#1e293b' || textColor === '#0f172a') {
                textColor = '#f8fafc';
              }
            } else {
              if (!textColor || textColor === '#ffffff' || textColor === 'white' || textColor === '#f8fafc' || textColor === '#f1f5f9') {
                textColor = '#0f172a';
              }
            }

            const leftPos = editingTextElement.isArrow
              ? editingTextElement.x * currentScale + camera.x - editorWidth / 2
              : editingTextElement.x * currentScale + camera.x;
            const topPos = editingTextElement.isArrow
              ? editingTextElement.y * currentScale + camera.y - editorHeight / 2
              : editingTextElement.y * currentScale + camera.y;

            return {
              position: 'absolute',
              left: leftPos,
              top: topPos,
              width: `${editorWidth}px`,
              height: `${editorHeight}px`,
              fontSize: `${editingTextElement.fontSize * currentScale}px`,
              fontFamily: editingTextElement.fontFamily,
              color: textColor,
              textAlign: editingTextElement.textAlign as React.CSSProperties['textAlign'],
              lineHeight: 1.25,
              background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: isDark ? '1px dashed rgba(255, 255, 255, 0.35)' : '1px dashed rgba(0, 0, 0, 0.35)',
              borderRadius: '4px',
              boxShadow: isDark
                ? '0 4px 16px rgba(0, 0, 0, 0.5)'
                : '0 2px 8px rgba(0, 0, 0, 0.08)',
              outline: 'none',
              resize: 'none',
              padding: `${1 * currentScale}px ${2 * currentScale}px`,
              margin: 0,
              zIndex: 60,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              caretColor: textColor,
              transform: editingTextElement.angle ? `rotate(${editingTextElement.angle}rad)` : undefined,
              transformOrigin: '0 0',
            };
          })()}
        />
      )}

      <KeybindingsDialog
        isOpen={isKeybindingsOpen}
        onClose={() => setIsKeybindingsOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}