'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import { actionType, elementType, point, PointsFreeHand, ArrowBinding } from '@/types/type';
import { ElementDragSnapshot, ElementResizeSnapshot, EndpointDragState, MarqueeBox } from '@/types/canvas';
import { boundType, getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { getCompoundBounds, isElementIntersectingBox } from '@/lib/utils/boundsUtility/compoundBounds';
import { isPointInPaddedBounds } from '@/lib/utils/boundsUtility/isPointInPaddedBounds';
import { isPointInsideElement } from '@/lib/utils/drawingUtility/hitTest';
import { findNearestSnapTarget, getBindingPosition, SnapLocation, SnapTarget, getLineEndpoints, isLineOrArrow } from '@/lib/arrowSnap';
import { computeAlignmentGuides, AlignmentGuide } from '@/lib/alignmentGuides';
import { getPivotPoint } from '@/lib/math/pivot';
import { getGroupMembers } from '@/lib/grouping';
import { handleDrawElement } from '@/lib/handleElement';
import detectResizeHandle from '@/lib/hitTest/detectResizeHandler';
import resizeBound from '@/lib/resizeBound';
import { resizeElement } from '@/lib/resizeElement';
import yUtils from '@/lib/utils/createYElement';
import canvasDoc, { LOCAL_ORIGIN, UndoManager } from '@/Store/yjs-store';
import { useAppStore } from '@/Store/store';

interface UseCanvasPointerEventsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  camera: { x: number; y: number; scale: number };
  cameraRef: React.MutableRefObject<{ x: number; y: number; scale: number }>;
  currentTool: { action: actionType; elementType: elementType | null };
  doc: Y.Doc;
  yElement: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
  isDark: boolean;
  bound: boundType | null;
  lockedBounds: boolean;
  selectedYElement: Y.Map<unknown> | null;
  selectedElementIds: string[];
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  isFillTransparent?: boolean;
  fillStyle?: string;
  roughness?: number;
  boundaryStyle?: string;
  fillWeight?: number;
  opacity?: number;
  hasShadow?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  arrowRouting?: 'straight' | 'curved' | 'angled';
  isTouchDevice: boolean;
  editingTextElementRef: React.MutableRefObject<any>;
  finishEditingTextRef: React.MutableRefObject<() => void>;
  textCreationTimeRef: React.MutableRefObject<number>;
  justFinishedEditingTextRef: React.MutableRefObject<boolean>;
  startEditingText: (yEl: Y.Map<unknown>) => void;
  handleDoubleClick: (e: React.MouseEvent) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setYElement: (el: Y.Map<unknown> | null) => void;
  setBound: (b: boundType | null) => void;
  setLockedBounds: (l: boolean) => void;
  setPointerPosition: (pt: [number, number]) => void;
  scheduleRender: () => void;
}

export function useCanvasPointerEvents({
  canvasRef,
  camera,
  cameraRef,
  currentTool,
  doc,
  yElement,
  order,
  isDark,
  bound,
  lockedBounds,
  selectedYElement,
  selectedElementIds,
  strokeColor,
  strokeWidth,
  fillColor,
  isFillTransparent,
  fillStyle,
  roughness,
  boundaryStyle,
  fillWeight,
  opacity,
  hasShadow,
  fontSize,
  fontFamily,
  textAlign,
  arrowRouting,
  isTouchDevice,
  editingTextElementRef,
  finishEditingTextRef,
  textCreationTimeRef,
  justFinishedEditingTextRef,
  startEditingText,
  handleDoubleClick,
  setSelectedElementId,
  setSelectedElementIds,
  setYElement,
  setBound,
  setLockedBounds,
  setPointerPosition,
  scheduleRender,
}: UseCanvasPointerEventsProps) {
  const { zoomCamera, panCamera } = useAppStore();

  const [CursorStyle, setCursorStyle] = useState('default');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [GlobalPointerPosition, setGlobalPointerPosition] = useState<[number, number] | null>(null);
  const [freehandPoint, setFreehandPoint] = useState<PointsFreeHand[] | null>(null);

  // Pan state
  const isPanningRef = useRef<boolean>(false);
  const isSpacePressedRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);

  // Drag snapshots
  const dragStartPointerRef = useRef<point | null>(null);
  const dragElementsSnapshotRef = useRef<ElementDragSnapshot[]>([]);
  const dragInitialBoundRef = useRef<boundType | null>(null);

  // Resize snapshots
  const resizeStartPointerRef = useRef<point | null>(null);
  const resizeOriginalRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const resizeOriginalElementsRef = useRef<ElementResizeSnapshot[]>([]);
  const originalPointRef = useRef<PointsFreeHand[] | null>(null);
  const resizeHandleRef = useRef<{ direction: string; cursor: string } | null>(null);

  // Rotation refs
  const isRotatingRef = useRef<boolean>(false);
  const rotationCenterRef = useRef<[number, number]>([0, 0]);
  const rotationInitialAngleRef = useRef<number>(0);
  const rotationStartPointerAngleRef = useRef<number>(0);

  // Marquee selection
  const marqueeBoxRef = useRef<MarqueeBox | null>(null);
  const isMarqueeRef = useRef<boolean>(false);
  const marqueeStartRef = useRef<point | null>(null);

  // Snaps and bindings
  const activeSnapTargetRef = useRef<SnapTarget | null>(null);
  const arrowStartBindingRef = useRef<ArrowBinding | null>(null);
  const arrowEndBindingRef = useRef<ArrowBinding | null>(null);
  const alignmentGuidesRef = useRef<AlignmentGuide[]>([]);

  // Arrow curve and endpoint drag
  const isCurvingArrowRef = useRef<{ el: Y.Map<unknown> } | null>(null);
  const isDraggingEndpointRef = useRef<EndpointDragState | null>(null);

  const flagRef = useRef<boolean>(false);
  const lastMoveTimeRef = useRef<number>(0);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const MOVE_THROTTLE_MS = 16;

  const startDragSnapshot = useCallback(
    (targetIds: string[], targetBound: boundType | null, startPt: point) => {
      dragStartPointerRef.current = startPt;
      dragInitialBoundRef.current = targetBound;
      const snaps: ElementDragSnapshot[] = [];
      targetIds.forEach((id) => {
        const el = yElement.get(id);
        if (!el || el.get('isDeleted')) return;
        const rawCp = el.get('controlPoint') as { x: number; y: number } | undefined;
        snaps.push({
          id,
          origX: Number(el.get('x')),
          origY: Number(el.get('y')),
          origControlPoint: rawCp ? { x: Number(rawCp.x), y: Number(rawCp.y) } : undefined,
        });
      });
      dragElementsSnapshotRef.current = snaps;
    },
    [yElement]
  );

  const getPointerCoordinates = useCallback(
    (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
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
      const cam = cameraRef.current;
      const worldX = (screenX - cam.x) / cam.scale;
      const worldY = (screenY - cam.y) / cam.scale;
      setPointerPosition([screenX, screenY]);
      return [worldX, worldY] as [number, number];
    },
    [setPointerPosition, canvasRef, cameraRef]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        zoomCamera(-e.deltaY, centerX, centerY);
      } else if (e.shiftKey) {
        panCamera(-e.deltaY, 0);
      } else {
        panCamera(-e.deltaX, -e.deltaY);
      }
      scheduleRender();
    },
    [zoomCamera, panCamera, scheduleRender, canvasRef]
  );

  const hitTestAtPoint = useCallback(
    (pt: point) => {
      const checkedIds = new Set<string>();
      // 1. Traverse in z-order order (topmost first)
      for (let i = order.length - 1; i >= 0; i--) {
        const elementId = order.get(i) as string;
        checkedIds.add(elementId);
        const element = yElement.get(elementId);
        if (!element || element.get('isDeleted')) continue;
        if (isPointInsideElement({ point: pt, element })) {
          return { id: elementId, yEl: element };
        }
      }

      // 2. Fallback check for any elements in yElement missing from order
      for (const [id, element] of yElement.entries()) {
        if (checkedIds.has(id)) continue;
        if (!element || element.get('isDeleted')) continue;
        if (isPointInsideElement({ point: pt, element })) {
          return { id, yEl: element };
        }
      }

      return null;
    },
    [order, yElement]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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
        const singleTarget = (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null) || selectedYElement;
        const targetType = singleTarget?.get('type') as string | undefined;
        const isSingleLineOrArrow = Boolean(
          singleTarget &&
          selectedElementIds.length <= 1 &&
          isLineOrArrow(targetType)
        );

        if (isSingleLineOrArrow && singleTarget) {
          const { x1: ax1, y1: ay1, x2: ax2, y2: ay2 } = getLineEndpoints(singleTarget, yElement as Y.Map<Y.Map<unknown>>);
          const hitRadius = Math.max(12, 14 / (cameraRef.current?.scale || 1));

          // 1. Check curve control handle if arrow
          if (targetType === elementType.Arrow || targetType === elementType.ArrowTwoWay) {
            const rawControl = singleTarget.get('controlPoint') as { x: number; y: number } | undefined;
            const cx = rawControl ? rawControl.x : (ax1 + ax2) / 2;
            const cy = rawControl ? rawControl.y : (ay1 + ay2) / 2;
            if (Math.hypot(initialPoint[0] - cx, initialPoint[1] - cy) <= hitRadius) {
              isCurvingArrowRef.current = { el: singleTarget };
              setCursorStyle('crosshair');
              setIsDragging(false);
              setIsResizing(false);
              return;
            }
          }

          // 2. Check start endpoint handle (P1)
          if (Math.hypot(initialPoint[0] - ax1, initialPoint[1] - ay1) <= hitRadius) {
            isDraggingEndpointRef.current = {
              el: singleTarget,
              endpoint: 'start',
              fixedPt: [ax2, ay2],
            };
            setCursorStyle('crosshair');
            setIsDragging(false);
            setIsResizing(false);
            return;
          }

          // 3. Check end endpoint handle (P2)
          if (Math.hypot(initialPoint[0] - ax2, initialPoint[1] - ay2) <= hitRadius) {
            isDraggingEndpointRef.current = {
              el: singleTarget,
              endpoint: 'end',
              fixedPt: [ax1, ay1],
            };
            setCursorStyle('crosshair');
            setIsDragging(false);
            setIsResizing(false);
            return;
          }

          resizeHandleRef.current = null;
        } else {
          const handleHit = bound ? detectResizeHandle({ point: initialPoint, element: bound, tolerance: 10 }) : null;
          if (handleHit) {
            resizeHandleRef.current = handleHit;
          }
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
          const hitType = hit.yEl.get('type') as string;
          if (isLineOrArrow(hitType) && !e.shiftKey) {
            const { x1: ax1, y1: ay1, x2: ax2, y2: ay2 } = getLineEndpoints(hit.yEl, yElement as Y.Map<Y.Map<unknown>>);
            const hitRadius = Math.max(12, 14 / (cameraRef.current?.scale || 1));
            const d1 = Math.hypot(initialPoint[0] - ax1, initialPoint[1] - ay1);
            const d2 = Math.hypot(initialPoint[0] - ax2, initialPoint[1] - ay2);

            if (d1 <= hitRadius || d2 <= hitRadius) {
              setSelectedElementIds([hit.id]);
              setYElement(hit.yEl);
              const b = getBounds({ element: hit.yEl });
              setBound(b);
              setLockedBounds(true);
              isDraggingEndpointRef.current = {
                el: hit.yEl,
                endpoint: d1 <= d2 ? 'start' : 'end',
                fixedPt: d1 <= d2 ? [ax2, ay2] : [ax1, ay1],
              };
              setIsDragging(false);
              setIsResizing(false);
              setCursorStyle('crosshair');
              flagRef.current = true;
              scheduleRender();
              return;
            }
          }

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
            startDragSnapshot(nextIds, cBound, initialPoint);
          } else {
            const anyMemberSelected = groupMembers.some((id) => selectedElementIds.includes(id));
            if (anyMemberSelected && selectedElementIds.length > 1) {
              setIsDragging(true);
              setLockedBounds(true);
              const curBound = bound || getCompoundBounds(selectedElementIds, yElement);
              if (curBound) {
                setGlobalPointerPosition([x - curBound.x, y - curBound.y]);
              }
              startDragSnapshot(selectedElementIds, curBound, initialPoint);
            } else {
              setSelectedElementIds(groupMembers);
              if (groupMembers.length === 1) {
                setYElement(hit.yEl);
                const b = getBounds({ element: hit.yEl });
                setBound(b);
                if (b) setGlobalPointerPosition([x - b.x, y - b.y]);
                startDragSnapshot(groupMembers, b, initialPoint);
              } else {
                setYElement(null);
                const cBound = getCompoundBounds(groupMembers, yElement);
                setBound(cBound);
                if (cBound) setGlobalPointerPosition([x - cBound.x, y - cBound.y]);
                startDragSnapshot(groupMembers, cBound, initialPoint);
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
              strokeWidth: strokeWidth ?? 2,
              fillColor: txtColor,
              fillStyle: fillStyle || 'solid',
              roughness: roughness ?? 0,
              boundaryStyle: boundaryStyle || 'solid',
              fillWeight: fillWeight ?? 3,
              opacity: opacity ?? 1,
              hasShadow: hasShadow ?? false,
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

        const isArrowTool =
          currentTool.elementType === elementType.Arrow ||
          currentTool.elementType === elementType.ArrowTwoWay;

        if (isArrowTool) {
          const snap = findNearestSnapTarget(initialPoint, yElement);
          if (snap) {
            arrowStartBindingRef.current = { elementId: snap.elementId, point: snap.location };
            initialPoint[0] = snap.x;
            initialPoint[1] = snap.y;
          } else {
            arrowStartBindingRef.current = null;
          }
        }

        const startPoint: point = [initialPoint[0], initialPoint[1]];
        const element = handleDrawElement({
          action: currentTool.action,
          element: currentTool.elementType,
          startPoint,
          endPoint: [startPoint[0] + 1, startPoint[1] + 1],
          options: {
            strokeColor: strokeColor || '#000000',
            strokeWidth: strokeWidth ?? 2,
            fillColor: fillColor || 'transparent',
            isFillTransparent: isFillTransparent,
            fillStyle: fillStyle || 'solid',
            roughness: roughness ?? 0,
            boundaryStyle: boundaryStyle || 'solid',
            fillWeight: fillWeight ?? 3,
            opacity: opacity ?? 1,
            hasShadow: hasShadow ?? false,
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
          if (!doc) throw new Error('Y.Doc is not initialized');
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
          console.error('error in creating y element', error);
        }
        return;
      }
    },
    [
      canvasRef,
      currentTool,
      bound,
      lockedBounds,
      selectedYElement,
      hitTestAtPoint,
      setYElement,
      setBound,
      setIsDragging,
      setIsResizing,
      setResizeHandle,
      strokeColor,
      strokeWidth,
      fillColor,
      isFillTransparent,
      fillStyle,
      roughness,
      boundaryStyle,
      fillWeight,
      opacity,
      hasShadow,
      fontSize,
      fontFamily,
      textAlign,
      arrowRouting,
      doc,
      yElement,
      order,
      setSelectedElementId,
      setIsDrawing,
      startDragSnapshot,
      selectedElementIds,
      setSelectedElementIds,
      isDark,
      startEditingText,
      getPointerCoordinates,
      cameraRef,
      editingTextElementRef,
      textCreationTimeRef,
      justFinishedEditingTextRef,
      finishEditingTextRef,
      scheduleRender,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
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

      if (isDraggingEndpointRef.current) {
        setCursorStyle('crosshair');
        const { el, endpoint, fixedPt } = isDraggingEndpointRef.current;
        const [fx, fy] = fixedPt;
        const elType = el.get('type') as string;
        const isArrow = elType === elementType.Arrow || elType === elementType.ArrowTwoWay;

        let targetX = x;
        let targetY = y;

        if (e.shiftKey) {
          const dx = targetX - fx;
          const dy = targetY - fy;
          const dist = Math.hypot(dx, dy);
          if (dist > 1) {
            let angle = Math.atan2(dy, dx);
            const snapAngle = Math.PI / 4;
            angle = Math.round(angle / snapAngle) * snapAngle;
            targetX = fx + dist * Math.cos(angle);
            targetY = fy + dist * Math.sin(angle);
          }
        }

        const snap = findNearestSnapTarget([targetX, targetY], yElement as Y.Map<Y.Map<unknown>>, el.get('id') as string);
        if (snap) {
          targetX = snap.x;
          targetY = snap.y;
          activeSnapTargetRef.current = snap;
        } else {
          activeSnapTargetRef.current = null;
        }

        doc.transact(() => {
          if (endpoint === 'start') {
            el.set('x', targetX);
            el.set('y', targetY);
            el.set('width', fx - targetX);
            el.set('height', fy - targetY);
            if (isArrow) {
              el.set('startBinding', snap ? { elementId: snap.elementId, point: snap.location } : null);
            }
          } else {
            el.set('x', fx);
            el.set('y', fy);
            el.set('width', targetX - fx);
            el.set('height', targetY - fy);
            if (isArrow) {
              el.set('endBinding', snap ? { elementId: snap.elementId, point: snap.location } : null);
            }
          }
        }, LOCAL_ORIGIN);

        setBound(getBounds({ element: el }));
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
        const singleTarget = (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null) || selectedYElement;
        const targetType = singleTarget?.get('type') as string | undefined;
        const isSingleLineOrArrow = Boolean(
          singleTarget &&
          selectedElementIds.length <= 1 &&
          isLineOrArrow(targetType)
        );

        if (isSingleLineOrArrow && singleTarget) {
          const { x1: ax1, y1: ay1, x2: ax2, y2: ay2 } = getLineEndpoints(singleTarget, yElement as Y.Map<Y.Map<unknown>>);
          const hitTol = Math.max(10, 12 / (cameraRef.current?.scale || 1));
          const isArrow = targetType === elementType.Arrow || targetType === elementType.ArrowTwoWay;
          const rawControl = isArrow ? (singleTarget.get('controlPoint') as { x: number; y: number } | undefined) : undefined;
          const cx = rawControl ? rawControl.x : (ax1 + ax2) / 2;
          const cy = rawControl ? rawControl.y : (ay1 + ay2) / 2;

          const nearStart = Math.hypot(pt[0] - ax1, pt[1] - ay1) <= hitTol;
          const nearEnd = Math.hypot(pt[0] - ax2, pt[1] - ay2) <= hitTol;
          const nearCurve = isArrow && Math.hypot(pt[0] - cx, pt[1] - cy) <= hitTol;

          if (nearStart || nearEnd || nearCurve) {
            setCursorStyle('crosshair');
            resizeHandleRef.current = null;
            return;
          }

          if (isPointInsideElement({ point: pt, element: singleTarget })) {
            setCursorStyle('grab');
            resizeHandleRef.current = null;
            return;
          }

          setCursorStyle('default');
          resizeHandleRef.current = null;
          return;
        }

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
          setBound(null);
          setYElement(null);
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

        const elementJSON = selectedYElement.toJSON() as any;
        const type = selectedYElement.get('type') as unknown as elementType;

        if (type === elementType.Freehand && freehandPoint) {
          const newAbsPoints: PointsFreeHand[] = [...freehandPoint, [x, y, 1] as PointsFreeHand];
          setFreehandPoint(newAbsPoints);

          const xs = newAbsPoints.map(([px]) => px);
          const ys = newAbsPoints.map(([, py]) => py);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          const relPoints = newAbsPoints.map(([px, py, pressure]) => [px - minX, py - minY, pressure] as PointsFreeHand);

          const updatedElement = {
            ...elementJSON,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            stroke: { points: relPoints },
          };

          doc.transact(() => {
            yUtils.updateYElement(updatedElement, selectedYElement);
          }, LOCAL_ORIGIN);

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
            yUtils.updateYElement(updatedElement as any, selectedYElement);
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
          }, LOCAL_ORIGIN);
          scheduleRender();
        }
        return;
      }

      if (isDragging) {
        setCursorStyle('grabbing');
        const startPt = dragStartPointerRef.current;
        const initialBound = dragInitialBoundRef.current;
        const snapshots = dragElementsSnapshotRef.current;

        if (!startPt || !initialBound || snapshots.length === 0) return;

        const rawTotalDx = x - startPt[0];
        const rawTotalDy = y - startPt[1];

        const proposedBounds = {
          x: initialBound.x + rawTotalDx,
          y: initialBound.y + rawTotalDy,
          width: initialBound.width,
          height: initialBound.height,
        };

        const movingIds = new Set<string>(snapshots.map((s) => s.id));
        const { guides, snapDx, snapDy } = e.altKey
          ? { guides: [] as AlignmentGuide[], snapDx: rawTotalDx, snapDy: rawTotalDy }
          : computeAlignmentGuides(movingIds, proposedBounds, rawTotalDx, rawTotalDy, yElement as Y.Map<Y.Map<unknown>>);

        alignmentGuidesRef.current = guides;
        const finalDx = snapDx;
        const finalDy = snapDy;

        try {
          doc.transact(() => {
            snapshots.forEach((snap) => {
              const el = yElement.get(snap.id);
              if (el && !el.get('isDeleted')) {
                el.set('x', snap.origX + finalDx);
                el.set('y', snap.origY + finalDy);
                if (snap.origControlPoint) {
                  el.set('controlPoint', {
                    x: snap.origControlPoint.x + finalDx,
                    y: snap.origControlPoint.y + finalDy,
                  });
                }
              }
            });
          }, LOCAL_ORIGIN);

          setBound({
            ...initialBound,
            x: initialBound.x + finalDx,
            y: initialBound.y + finalDy,
          });
        } catch (err) {
          console.error('Error updating Y element during drag:', err);
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
            const snapStep = Math.PI / 12;
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
        const isSingleText =
          selectedYElement?.get('type') === elementType.Text ||
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
          const singleTarget =
            selectedYElement ||
            (resizeOriginalElementsRef.current.length === 1 ? yElement.get(resizeOriginalElementsRef.current[0].id) : null);
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
    },
    [
      getPointerCoordinates,
      currentTool,
      isDragging,
      isResizing,
      lockedBounds,
      bound,
      selectedYElement,
      hitTestAtPoint,
      setBound,
      setYElement,
      setIsDragging,
      isDrawing,
      freehandPoint,
      doc,
      scheduleRender,
      GlobalPointerPosition,
      resizeHandle,
      yElement,
      selectedElementIds,
      cameraRef,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
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
              if (isElementIntersectingBox(el, box, yElement)) {
                foundIds.push(id);
              }
            }
          });

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

      if (isDraggingEndpointRef.current) {
        const targetEl = isDraggingEndpointRef.current.el;
        isDraggingEndpointRef.current = null;
        activeSnapTargetRef.current = null;
        try {
          canvasRef.current?.releasePointerCapture(e.pointerId);
        } catch {}
        setBound(getBounds({ element: targetEl }));
        scheduleRender();
        return;
      }

      const wasMoving = isDrawing || isDragging || isResizing || isPanningRef.current;
      if (isDragging) {
        dragStartPointerRef.current = null;
        dragElementsSnapshotRef.current = [];
        dragInitialBoundRef.current = null;
        if (selectedElementIds.length > 1) {
          setBound(getCompoundBounds(selectedElementIds, yElement));
        } else if (selectedYElement) {
          setBound(getBounds({ element: selectedYElement }));
        }
      }
      setIsDrawing(false);
      setIsDragging(false);
      alignmentGuidesRef.current = [];
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
    },
    [
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
      isDrawing,
      isDragging,
      isResizing,
      selectedYElement,
      selectedElementIds,
      doc,
      canvasRef,
    ]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (typeof window !== 'undefined' && 'PointerEvent' in window) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      const syntheticEvent = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        currentTarget: canvas,
        target: canvas,
      } as unknown as React.PointerEvent;

      handlePointerDown(syntheticEvent);
    },
    [canvasRef, handlePointerDown]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const syntheticEvent = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        currentTarget: canvas,
        target: canvas,
      } as unknown as React.PointerEvent;

      handlePointerMove(syntheticEvent);
    },
    [canvasRef, handlePointerMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
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
    },
    [canvasRef, handlePointerUp, handleDoubleClick]
  );

  return {
    CursorStyle,
    setCursorStyle,
    isDragging,
    setIsDragging,
    isResizing,
    setIsResizing,
    isDrawing,
    setIsDrawing,
    resizeHandle,
    isPanningRef,
    isSpacePressedRef,
    marqueeBoxRef,
    isMarqueeRef,
    activeSnapTargetRef,
    arrowStartBindingRef,
    arrowEndBindingRef,
    alignmentGuidesRef,
    isCurvingArrowRef,
    isDraggingEndpointRef,
    dragStartPointerRef,
    dragElementsSnapshotRef,
    dragInitialBoundRef,
    resizeOriginalElementsRef,
    getPointerCoordinates,
    handleWheel,
    hitTestAtPoint,
    startDragSnapshot,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
