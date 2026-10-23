'use client';

import { useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import rough from 'roughjs';
import { nanoid } from 'nanoid';
import { actionType, elementType } from '@/types/type';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { getCompoundBounds } from '@/lib/utils/boundsUtility/compoundBounds';
import { serializeYElement, serializeYElements, deserializeYElement, deserializeYElements } from '@/lib/clipboard';
import { cleanupArrowBindings } from '@/lib/arrowSnap';
import { cleanupOrphanGroups, groupElements, ungroupElements } from '@/lib/grouping';
import { handleUndo, handleRedo } from '@/lib/helperfunc/undo-redo';
import { handleDrawElement } from '@/lib/handleElement';
import { DrawElements } from '@/lib/utils/drawingUtility/drawElement';
import yUtils from '@/lib/utils/createYElement';
import canvasDoc, { LOCAL_ORIGIN } from '@/Store/yjs-store';

interface UseCanvasActionsProps {
  doc: Y.Doc;
  yElement: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
  selectedYElement: Y.Map<unknown> | null;
  selectedElementIds: string[];
  clipboard: any;
  isDark: boolean;
  camera: { x: number; y: number; scale: number };
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  fontSize?: number;
  fontFamily?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillStyle?: string;
  roughness?: number;
  boundaryStyle?: string;
  fillWeight?: number;
  opacity?: number;
  hasShadow?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  setClipboard: (c: any) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setYElement: (el: Y.Map<unknown> | null) => void;
  setBound: (b: any) => void;
  setLockedBounds: (l: boolean) => void;
  setCurrentTool: (tool: any) => void;
  setActiveToolbarId: (id: string) => void;
  setIsSelecting: (s: boolean) => void;
  setIsDragging: (d: boolean) => void;
  setIsResizing: (r: boolean) => void;
  setIsDrawing: (d: boolean) => void;
  scheduleRender: () => void;
  resetCamera: () => void;
  startEditingText: (yEl: Y.Map<unknown>) => void;
  finishEditingTextRef: React.MutableRefObject<() => void>;
  editingTextElementRef: React.MutableRefObject<any>;
  setEditingTextElement: (state: any) => void;
  isMarqueeRef: React.MutableRefObject<boolean>;
  marqueeBoxRef: React.MutableRefObject<any>;
  activeSnapTargetRef: React.MutableRefObject<any>;
  arrowStartBindingRef: React.MutableRefObject<any>;
  arrowEndBindingRef: React.MutableRefObject<any>;
  resizeOriginalElementsRef: React.MutableRefObject<any>;
}

export function useCanvasActions({
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
  setIsDragging,
  setIsResizing,
  setIsDrawing,
  scheduleRender,
  resetCamera,
  startEditingText,
  finishEditingTextRef,
  editingTextElementRef,
  setEditingTextElement,
  isMarqueeRef,
  marqueeBoxRef,
  activeSnapTargetRef,
  arrowStartBindingRef,
  arrowEndBindingRef,
  resizeOriginalElementsRef,
}: UseCanvasActionsProps) {
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
    [setActiveToolbarId, setCurrentTool, setIsSelecting, setIsDragging, setBound, imageInputRef, activeSnapTargetRef, arrowStartBindingRef, arrowEndBindingRef]
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

  const insertTextElement = useCallback(
    (text: string, customX?: number, customY?: number) => {
      const canvas = canvasRef.current;
      const cam = camera;
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
          lines.forEach((l) => {
            maxW = Math.max(maxW, ctx.measureText(l || 'M').width);
          });
        }
      }
      const measuredW = Math.ceil(maxW);
      const measuredH = Math.ceil(
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
        endPoint: [targetX + measuredW, targetY + measuredH],
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
          text,
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
      canvasRef,
      camera,
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
      doc,
      yElement,
      order,
      setSelectedElementIds,
      setYElement,
      setBound,
      setLockedBounds,
      setCurrentTool,
      setActiveToolbarId,
      scheduleRender,
    ]
  );

  const insertImageElement = useCallback(
    (dataUrl: string, targetX: number, targetY: number) => {
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
    },
    [doc, yElement, order, setSelectedElementIds, setYElement, setBound, setLockedBounds, setCurrentTool, setActiveToolbarId, scheduleRender]
  );

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
                  const cam = camera;
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
  }, [
    clipboard,
    doc,
    yElement,
    order,
    setClipboard,
    setSelectedElementIds,
    setYElement,
    setBound,
    setLockedBounds,
    scheduleRender,
    insertImageElement,
    insertTextElement,
    canvasRef,
    camera,
  ]);

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
        cleanupArrowBindings(idsToDelete, yElement);
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
  }, [selectedElementIds, selectedYElement, doc, yElement, order, setSelectedElementIds, setYElement, setBound, setLockedBounds, scheduleRender, editingTextElementRef, setEditingTextElement]);

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
  }, [
    isMarqueeRef,
    marqueeBoxRef,
    setIsDragging,
    setIsResizing,
    setIsDrawing,
    activeSnapTargetRef,
    arrowStartBindingRef,
    arrowEndBindingRef,
    resizeOriginalElementsRef,
    setSelectedElementIds,
    setYElement,
    setBound,
    setLockedBounds,
    editingTextElementRef,
    finishEditingTextRef,
    setCurrentTool,
    setActiveToolbarId,
    scheduleRender,
  ]);

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
  }, [selectedElementIds, yElement, doc, setBound, scheduleRender]);

  const handleUngroup = useCallback(() => {
    const targetIds =
      selectedElementIds.length > 0
        ? selectedElementIds
        : selectedYElement
        ? [selectedYElement.get('id') as string]
        : [];
    if (targetIds.length === 0) return;
    ungroupElements(targetIds, yElement, doc);
    scheduleRender();
  }, [selectedElementIds, selectedYElement, yElement, doc, scheduleRender]);

  const handleAlign = useCallback(
    (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => {
      if (selectedElementIds.length < 2) return;
      const els = selectedElementIds
        .map((id) => yElement.get(id))
        .filter((el): el is Y.Map<unknown> => !!el && !el.get('isDeleted'));
      if (els.length < 2) return;

      const compound = getCompoundBounds(selectedElementIds, yElement);
      if (!compound) return;

      doc.transact(() => {
        switch (type) {
          case 'left':
            els.forEach((el) => el.set('x', compound.x));
            break;
          case 'center':
            els.forEach((el) => {
              const w = Number(el.get('width')) || 0;
              el.set('x', compound.x + (compound.width - w) / 2);
            });
            break;
          case 'right':
            els.forEach((el) => {
              const w = Number(el.get('width')) || 0;
              el.set('x', compound.x + compound.width - w);
            });
            break;
          case 'top':
            els.forEach((el) => el.set('y', compound.y));
            break;
          case 'middle':
            els.forEach((el) => {
              const h = Number(el.get('height')) || 0;
              el.set('y', compound.y + (compound.height - h) / 2);
            });
            break;
          case 'bottom':
            els.forEach((el) => {
              const h = Number(el.get('height')) || 0;
              el.set('y', compound.y + compound.height - h);
            });
            break;
          case 'distribute-h': {
            const sorted = [...els].sort((a, b) => Number(a.get('x')) - Number(b.get('x')));
            const totalW = sorted.reduce((acc, el) => acc + (Number(el.get('width')) || 0), 0);
            const freeSpace = compound.width - totalW;
            const gap = freeSpace / Math.max(1, sorted.length - 1);
            let currX = compound.x;
            sorted.forEach((el) => {
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
            sorted.forEach((el) => {
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
    },
    [selectedElementIds, yElement, doc, scheduleRender, setBound]
  );

  const handleExportPNG = useCallback(() => {
    const elementIds = order.toArray();
    if (elementIds.length === 0) {
      alert('Canvas is empty — draw something first!');
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
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

  // Window paste listener
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
                  const cam = camera;
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
  }, [insertImageElement, insertTextElement, canvasRef, camera]);

  return {
    selectTool,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleDelete,
    handleSelectAll,
    handleDeselect,
    handleGroup,
    handleUngroup,
    handleAlign,
    handleExportPNG,
    handleUndoClick,
    handleRedoClick,
    insertTextElement,
    insertImageElement,
  };
}
