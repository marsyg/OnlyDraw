'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rough from 'roughjs';
import { RoughGenerator } from 'roughjs/bin/generator';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { motion } from 'framer-motion';
import * as Y from 'yjs';

import { point, actionType, elementType } from '@/types/type';
import { useAppStore } from '@/Store/store';
import canvasDoc from '@/Store/yjs-store';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
import { DrawBounds } from '@/lib/drawBounds';
import { drawGhostSnapIndicators, getLineEndpoints, isLineOrArrow } from '@/lib/arrowSnap';
import { drawAlignmentGuides } from '@/lib/alignmentGuides';
import { useKeybindings } from '@/hooks/useKeybindings';

import RoughSketchToolbox from '@/component/crazyToolbar';
import FeaturePanel from '@/component/FeaturePanel';
import WorkspaceManager from '@/component/WorkspaceManager';
import KeybindingsDialog from '@/component/KeybindingsDialog';
import CanvasViewportControls from '@/component/CanvasViewportControls';
import CanvasTextEditor from '@/component/CanvasTextEditor';

import { useTextEditing } from '@/hooks/useTextEditing';
import { useCanvasPointerEvents } from '@/hooks/useCanvasPointerEvents';
import { useCanvasActions } from '@/hooks/useCanvasActions';
import { useCanvasCollaboration } from '@/hooks/useCanvasCollaboration';

export default function App() {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(() => {
    return canvasDoc.activeWorkspaceId;
  });

  const { doc, yElement, order } = canvasDoc;

  const {
    setPointerPosition,
    currentTool,
    setSelectedElementId,
    pointerPosition,
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
    arrowRouting,
  } = useAppStore();

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [lockedBounds, setLockedBounds] = useState<boolean>(false);
  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('canvas_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync dark mode with <html> class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('canvas_theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const roughCanvasRef = useRef<RoughCanvas | null>(null);
  const roughGeneratorRef = useRef<RoughGenerator | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  // Forward refs for pointer coordinates and hit test to resolve cyclic hook wiring
  const getPointerCoordsRef = useRef<
    (e: React.PointerEvent | React.TouchEvent | React.MouseEvent | React.DragEvent) => [number, number]
  >(() => [0, 0]);
  const hitTestRef = useRef<((pt: point) => { id: string; yEl: Y.Map<unknown> } | null)>(() => null);

  // 1. Text Editing Hook
  const textEditing = useTextEditing({
    doc,
    yElement,
    order,
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
    canvasRef,
    setYElement,
    setSelectedElementIds,
    setSelectedElementId,
    setBound,
    setCurrentTool,
    setActiveToolbarId,
    scheduleRender: () => scheduleRender(),
    getPointerCoordinates: (e) => getPointerCoordsRef.current(e),
    hitTestAtPoint: (pt) => hitTestRef.current(pt),
  });

  // 2. Pointer Events Hook
  const pointerEvents = useCanvasPointerEvents({
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
    editingTextElementRef: textEditing.editingTextElementRef,
    finishEditingTextRef: textEditing.finishEditingTextRef,
    textCreationTimeRef: textEditing.textCreationTimeRef,
    justFinishedEditingTextRef: textEditing.justFinishedEditingTextRef,
    startEditingText: textEditing.startEditingText,
    handleDoubleClick: textEditing.handleDoubleClick,
    setSelectedElementId,
    setSelectedElementIds,
    setYElement,
    setBound,
    setLockedBounds,
    setPointerPosition,
    scheduleRender: () => scheduleRender(),
  });

  // Connect forward refs
  getPointerCoordsRef.current = pointerEvents.getPointerCoordinates;
  hitTestRef.current = pointerEvents.hitTestAtPoint;

  // 3. Canvas Actions Hook
  const actions = useCanvasActions({
    doc,
    yElement,
    order,
    selectedYElement,
    selectedElementIds,
    clipboard,
    isDark,
    camera,
    canvasRef,
    imageInputRef,
    fontSize,
    fontFamily,
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
    setClipboard,
    setSelectedElementIds,
    setYElement,
    setBound,
    setLockedBounds,
    setCurrentTool,
    setActiveToolbarId,
    setIsSelecting,
    setIsDragging: pointerEvents.setIsDragging,
    setIsResizing: pointerEvents.setIsResizing,
    setIsDrawing: pointerEvents.setIsDrawing,
    scheduleRender: () => scheduleRender(),
    finishEditingTextRef: textEditing.finishEditingTextRef,
    editingTextElementRef: textEditing.editingTextElementRef,
    setEditingTextElement: textEditing.setEditingTextElement,
    isMarqueeRef: pointerEvents.isMarqueeRef,
    marqueeBoxRef: pointerEvents.marqueeBoxRef,
    activeSnapTargetRef: pointerEvents.activeSnapTargetRef,
    arrowStartBindingRef: pointerEvents.arrowStartBindingRef,
    arrowEndBindingRef: pointerEvents.arrowEndBindingRef,
    resizeOriginalElementsRef: pointerEvents.resizeOriginalElementsRef,
  });

  // 4. Collaboration Hook
  const collaboration = useCanvasCollaboration({
    doc,
    pointerPosition,
  });

  // 5. Canvas Rendering Cycle
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

    // Adaptive infinite dot grid
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

    // Apply camera transform
    ctx.save();
    ctx.setTransform(cam.scale, 0, 0, cam.scale, cam.x, cam.y);

    // Render elements
    yElement.forEach((el) => {
      if (!el.get('isDeleted')) {
        if (textEditing.editingTextElementRef.current && el.get('id') === textEditing.editingTextElementRef.current.id) {
          return;
        }
        DrawElements({ ctx, element: el, rc });
      }
    });

    // Render bounds / endpoints handles
    if ((selectedYElement || selectedElementIds.length > 0) && bound) {
      const isEditingCurrent = Boolean(
        textEditing.editingTextElementRef.current &&
          ((selectedYElement && selectedYElement.get('id') === textEditing.editingTextElementRef.current.id) ||
            (selectedElementIds.length === 1 && selectedElementIds[0] === textEditing.editingTextElementRef.current.id))
      );
      if (!isEditingCurrent) {
        const singleTarget =
          (selectedElementIds.length === 1 ? yElement.get(selectedElementIds[0]) : null) || selectedYElement;
        const targetType = singleTarget?.get('type') as string | undefined;
        const isSingleLineOrArrow = Boolean(singleTarget && selectedElementIds.length <= 1 && isLineOrArrow(targetType));

        if (isSingleLineOrArrow && singleTarget) {
          const { x1: ax1, y1: ay1, x2: ax2, y2: ay2 } = getLineEndpoints(singleTarget, yElement as Y.Map<Y.Map<unknown>>);
          const isArrow = targetType === elementType.Arrow || targetType === elementType.ArrowTwoWay;
          const startBinding = isArrow ? singleTarget.get('startBinding') : null;
          const endBinding = isArrow ? singleTarget.get('endBinding') : null;
          const handleR = 6 / Math.min(1.4, Math.max(0.6, cam.scale));
          const handleStroke = 2 / Math.min(1.4, Math.max(0.6, cam.scale));

          ctx.save();

          // P1 Handle
          ctx.beginPath();
          ctx.arc(ax1, ay1, handleR, 0, Math.PI * 2);
          ctx.fillStyle = startBinding ? '#2563eb' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = handleStroke;
          ctx.stroke();

          // P2 Handle
          ctx.beginPath();
          ctx.arc(ax2, ay2, handleR, 0, Math.PI * 2);
          ctx.fillStyle = endBinding ? '#2563eb' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = handleStroke;
          ctx.stroke();

          // Curve handle
          if (isArrow) {
            const rawControl = singleTarget.get('controlPoint') as { x: number; y: number } | undefined;
            const routing = String(singleTarget.get('routing') || (rawControl ? 'curved' : 'straight'));
            if (rawControl || routing === 'curved') {
              const midX = (ax1 + ax2) / 2;
              const midY = (ay1 + ay2) / 2;
              const cx = rawControl ? rawControl.x : midX;
              const cy = rawControl ? rawControl.y : midY;

              ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
              ctx.setLineDash([3, 3]);
              ctx.lineWidth = 1.2 / Math.min(1.4, Math.max(0.6, cam.scale));
              ctx.beginPath();
              ctx.moveTo(midX, midY);
              ctx.lineTo(cx, cy);
              ctx.stroke();

              ctx.setLineDash([]);
              ctx.fillStyle = '#a855f7';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = handleStroke;
              ctx.beginPath();
              ctx.arc(cx, cy, handleR + 0.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          }

          ctx.restore();
        } else {
          DrawBounds({ context: ctx, bounds: bound });
        }
      }
    }

    // Marquee Box
    if (pointerEvents.marqueeBoxRef.current) {
      const mb = pointerEvents.marqueeBoxRef.current;
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(mb.x, mb.y, mb.width, mb.height);
      ctx.strokeRect(mb.x, mb.y, mb.width, mb.height);
      ctx.restore();
    }

    // Snap targets
    if (pointerEvents.activeSnapTargetRef.current) {
      drawGhostSnapIndicators(ctx, pointerEvents.activeSnapTargetRef.current);
    }

    // Alignment Guides
    if (pointerEvents.alignmentGuidesRef.current.length > 0) {
      drawAlignmentGuides(ctx, pointerEvents.alignmentGuidesRef.current);
    }

    ctx.restore();
  }, [isDark, yElement, selectedYElement, selectedElementIds, bound, pointerEvents, textEditing]);

  const scheduleRender = useCallback(() => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(renderCanvas);
  }, [renderCanvas]);

  // 6. Drag & Drop and Image Upload Handlers
  const handleImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
          actions.insertImageElement(dataUrl, worldX - 150, worldY - 100);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [actions]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const [worldX, worldY] = pointerEvents.getPointerCoordinates(e);
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              actions.insertImageElement(dataUrl, worldX, worldY);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      const textData = e.dataTransfer.getData('text/plain');
      if (textData && textData.trim().length > 0) {
        const [worldX, worldY] = pointerEvents.getPointerCoordinates(e);
        actions.insertTextElement(textData, worldX, worldY);
      }
    },
    [pointerEvents, actions]
  );

  // 7. Keybindings
  const keybindingActions = useMemo(
    () => ({
      'tool.select': () => actions.selectTool('select', actionType.Selecting, elementType.Select),
      'tool.rectangle': () => actions.selectTool('rectangle', actionType.Drawing, elementType.Rectangle),
      'tool.ellipse': () => actions.selectTool('circle', actionType.Drawing, elementType.Ellipse),
      'tool.line': () => actions.selectTool('line', actionType.Drawing, elementType.Line),
      'tool.arrow': () => actions.selectTool('arrow', actionType.Drawing, elementType.Arrow),
      'tool.arrow-two-way': () => actions.selectTool('arrowTwoWay', actionType.Drawing, elementType.ArrowTwoWay),
      'tool.freehand': () => actions.selectTool('freeHand', actionType.Drawing, elementType.Freehand),
      'tool.text': () => actions.selectTool('text', actionType.Drawing, elementType.Text),
      'tool.image': () => imageInputRef.current?.click(),
      'edit.editText': () => {
        if (selectedYElement && selectedYElement.get('type') === elementType.Text) {
          textEditing.startEditingText(selectedYElement);
        } else if (selectedElementIds.length === 1) {
          const el = yElement.get(selectedElementIds[0]);
          if (el && el.get('type') === elementType.Text) {
            textEditing.startEditingText(el);
          }
        }
      },
      'edit.undo': actions.handleUndoClick,
      'edit.redo': actions.handleRedoClick,
      'edit.copy': actions.handleCopy,
      'edit.paste': actions.handlePaste,
      'edit.duplicate': actions.handleDuplicate,
      'edit.cut': actions.handleCut,
      'edit.selectAll': actions.handleSelectAll,
      'edit.delete': actions.handleDelete,
      'edit.deselect': actions.handleDeselect,
      'edit.group': actions.handleGroup,
      'edit.ungroup': actions.handleUngroup,
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
    [actions, textEditing, selectedYElement, selectedElementIds, yElement, resetCamera, zoomCamera, scheduleRender]
  );

  useKeybindings({
    actionMap: keybindingActions,
    onSpaceDown: () => {
      pointerEvents.isSpacePressedRef.current = true;
      if (!pointerEvents.isDrawing && !pointerEvents.isDragging && !pointerEvents.isResizing) {
        pointerEvents.setCursorStyle('grab');
      }
    },
    onSpaceUp: () => {
      pointerEvents.isSpacePressedRef.current = false;
      if (!pointerEvents.isPanningRef.current) {
        pointerEvents.setCursorStyle('default');
      }
    },
  });

  // 8. Lifecycle & Event Listeners
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
      if (
        pointerEvents.isMarqueeRef.current ||
        pointerEvents.isDragging ||
        pointerEvents.isResizing ||
        pointerEvents.isDrawing
      ) {
        pointerEvents.handlePointerUp(e as unknown as React.PointerEvent);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [pointerEvents]);

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
    canvas.addEventListener('wheel', pointerEvents.handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', setSize);
      canvas.removeEventListener('wheel', pointerEvents.handleWheel);
    };
  }, [scheduleRender, pointerEvents.handleWheel]);

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
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
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

  return (
    <div
      className="relative w-full h-screen overflow-hidden touch-none"
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

      {/* Top Floating Sketch Toolbar */}
      <RoughSketchToolbox
        isDark={isDark}
        onDelete={actions.handleDelete}
        onGroup={actions.handleGroup}
        onUngroup={actions.handleUngroup}
        onImageUpload={() => imageInputRef.current?.click()}
        onEditText={() => {
          const isTextOrArrow = (el: Y.Map<unknown>) => {
            const t = el.get('type');
            return t === elementType.Text || t === elementType.Arrow || t === elementType.ArrowTwoWay;
          };
          if (selectedYElement && isTextOrArrow(selectedYElement)) {
            textEditing.startEditingText(selectedYElement);
          } else if (selectedElementIds.length === 1) {
            const el = yElement.get(selectedElementIds[0]);
            if (el && isTextOrArrow(el)) {
              textEditing.startEditingText(el);
            }
          }
        }}
        onAlign={actions.handleAlign}
      />

      {/* Feature & Properties Panel */}
      <FeaturePanel isDark={isDark} onToggleDark={() => setIsDark((d) => !d)} />

      {/* Top Left: Workspace Manager */}
      <div className={`fixed ${isTouchDevice ? 'top-2 left-2' : 'top-4 left-4'} z-50 select-none`}>
        <WorkspaceManager isDark={isDark} />
      </div>

      {/* Collaboration Remote Cursors */}
      {collaboration.isCollaborating &&
        collaboration.connectionStatus === 'connected' &&
        collaboration.participants.map((p) => {
          if (!p.cursor || p.clientId === collaboration.providerRef.current?.awareness.clientID) return null;
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

      {/* Collaboration Participants Avatars */}
      {collaboration.isCollaborating &&
        collaboration.connectionStatus === 'connected' &&
        collaboration.participants.length > 0 && (
          <motion.div
            className="fixed top-4 left-1/2 z-50 transform -translate-x-1/2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="px-2 py-1 flex items-center gap-2">
              {collaboration.participants.map((p) => (
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

      {/* Top Right: Collaboration Toggle */}
      <motion.div
        className={`fixed ${isTouchDevice ? 'top-2 right-2' : 'top-4 right-4'} z-50 select-none`}
        initial={false}
      >
        {!collaboration.isCollaborating ? (
          <>
            {!collaboration.showRoomInput ? (
              <motion.button
                onClick={() => collaboration.setShowRoomInput(true)}
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
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <input
                  type="text"
                  value={collaboration.roomId}
                  onChange={(e) => collaboration.setRoomId(e.target.value)}
                  placeholder="Room ID"
                  className={`w-full px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isTouchDevice ? 'text-[10px]' : 'text-xs'} ${
                    isDark
                      ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') collaboration.startCollaboration();
                    if (e.key === 'Escape') {
                      collaboration.setShowRoomInput(false);
                      collaboration.setRoomId('');
                    }
                  }}
                  autoFocus={!isTouchDevice}
                />
                <input
                  type="text"
                  value={collaboration.userName}
                  onChange={(e) => collaboration.setUserName(e.target.value)}
                  placeholder="username"
                  className={`w-full px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isTouchDevice ? 'text-[10px]' : 'text-xs'} ${
                    isDark
                      ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && collaboration.roomId) collaboration.startCollaboration();
                    if (e.key === 'Escape') {
                      collaboration.setShowRoomInput(false);
                      collaboration.setUserName('');
                      collaboration.setRoomId('');
                    }
                  }}
                  autoFocus={!isTouchDevice}
                />
                <div className="flex gap-2">
                  <button
                    onClick={collaboration.startCollaboration}
                    className={`flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold ${isTouchDevice ? 'text-[10px]' : 'text-xs'} uppercase tracking-wide transition-all active:scale-95 shadow-md shadow-blue-500/20`}
                  >
                    Join
                  </button>
                  <button
                    onClick={() => {
                      collaboration.setShowRoomInput(false);
                      collaboration.setRoomId('');
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {collaboration.connectionStatus === 'connecting' ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Connecting
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Live
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={collaboration.stopCollaboration}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold uppercase transition-all active:scale-95"
                title="Disconnect"
              >
                ✕
              </button>
            </div>
            <div
              className={`text-[10px] font-mono px-2 py-1 rounded border truncate ${
                isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {collaboration.roomId}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom Right: Viewport & Undo/Redo Controls */}
      <CanvasViewportControls
        isDark={isDark}
        isTouchDevice={isTouchDevice}
        cameraScale={camera.scale}
        onZoomIn={() => {
          const canvas = canvasRef.current;
          const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
          const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
          zoomCamera(100, cx, cy);
          scheduleRender();
        }}
        onZoomOut={() => {
          const canvas = canvasRef.current;
          const cx = canvas ? canvas.width / 2 : window.innerWidth / 2;
          const cy = canvas ? canvas.height / 2 : window.innerHeight / 2;
          zoomCamera(-100, cx, cy);
          scheduleRender();
        }}
        onResetZoom={() => {
          resetCamera();
          scheduleRender();
        }}
        onResetView={() => {
          resetCamera();
          scheduleRender();
        }}
        onExportPNG={actions.handleExportPNG}
        onOpenKeybindings={() => setIsKeybindingsOpen(true)}
        onUndo={actions.handleUndoClick}
        onRedo={actions.handleRedoClick}
      />

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-screen touch-none select-none"
        id="canvas"
        onDoubleClick={textEditing.handleDoubleClick}
        onPointerDown={pointerEvents.handlePointerDown}
        onPointerMove={pointerEvents.handlePointerMove}
        onPointerUp={pointerEvents.handlePointerUp}
        onPointerCancel={pointerEvents.handlePointerUp}
        onTouchStart={pointerEvents.handleTouchStart}
        onTouchMove={pointerEvents.handleTouchMove}
        onTouchEnd={pointerEvents.handleTouchEnd}
        style={{
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          cursor: pointerEvents.CursorStyle,
          touchAction: 'none',
        }}
      />

      {/* Inline Text Editor */}
      <CanvasTextEditor
        editingTextElement={textEditing.editingTextElement}
        textareaRef={textEditing.textareaRef}
        camera={camera}
        isDark={isDark}
        canvasRef={canvasRef}
        onChangeText={(nextVal) => {
          textEditing.setEditingTextElement((prev) => {
            const updated = prev ? { ...prev, text: nextVal } : null;
            textEditing.editingTextElementRef.current = updated;
            return updated;
          });
        }}
        onFinish={textEditing.finishEditingText}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeybindingsDialog
        isOpen={isKeybindingsOpen}
        onClose={() => setIsKeybindingsOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}