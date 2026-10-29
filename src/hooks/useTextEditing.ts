'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import { EditingTextState } from '@/types/canvas';
import { elementType, actionType, point } from '@/types/type';
import { getThemeAdaptedColor } from '@/lib/utils/drawingUtility/drawElement';
import { getArrowLabelPosition } from '@/lib/utils/arrowLabel';
import { getBounds, boundType } from '@/lib/utils/boundsUtility/getBounds';
import { cleanupArrowBindings } from '@/lib/arrowSnap';
import { cleanupOrphanGroups } from '@/lib/grouping';
import { LOCAL_ORIGIN } from '@/Store/yjs-store';
import { createTextElement } from '@/lib/createTextElement';

interface UseTextEditingProps {
  doc: Y.Doc;
  yElement: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
  isDark: boolean;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillStyle?: string;
  roughness?: number;
  boundaryStyle?: string;
  fillWeight?: number;
  opacity?: number;
  hasShadow?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  setYElement: (el: Y.Map<unknown> | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setSelectedElementId: (id: string | null) => void;
  setBound: (b: boundType | null) => void;
  setCurrentTool: (tool: { action: actionType; elementType: elementType | null }) => void;
  setActiveToolbarId: (id: string) => void;
  scheduleRender: () => void;
  getPointerCoordinates: (e: React.MouseEvent) => point;
  hitTestAtPoint: (pt: point) => { id: string; yEl: Y.Map<unknown> } | null;
}

export function useTextEditing({
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
  scheduleRender,
  getPointerCoordinates,
  hitTestAtPoint,
}: UseTextEditingProps) {
  const [editingTextElement, setEditingTextElement] = useState<EditingTextState | null>(null);
  const editingTextElementRef = useRef<EditingTextState | null>(null);
  const finishEditingTextRef = useRef<() => void>(() => {});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textCreationTimeRef = useRef<number>(0);
  const justFinishedEditingTextRef = useRef<boolean>(false);

  useEffect(() => {
    if (editingTextElement && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingTextElement]);

  const startEditingText = useCallback(
    (yEl: Y.Map<unknown>) => {
      const id = yEl.get('id') as string;
      const type = yEl.get('type') as string;
      const isArrow = type === elementType.Arrow || type === elementType.ArrowTwoWay;

      setYElement(yEl);
      setSelectedElementIds([id]);
      setSelectedElementId(id);
      setBound(null);

      const currentFill = String(yEl.get('fillColor') || yEl.get('strokeColor') || '');
      const color = getThemeAdaptedColor(currentFill || (isDark ? '#f8fafc' : '#0f172a'), isDark);

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
        angle: isArrow ? 0 : Number(yEl.get('angle')) || 0,
        rotationAxis: String(yEl.get('rotationAxis') || 'center'),
        isArrow,
      };
      textCreationTimeRef.current = Date.now();
      editingTextElementRef.current = nextState;
      setEditingTextElement(nextState);
      scheduleRender();
    },
    [setYElement, setSelectedElementIds, setSelectedElementId, setBound, isDark, yElement, scheduleRender]
  );

  const finishEditingText = useCallback(() => {
    const currentEditing = editingTextElementRef.current;
    if (!currentEditing) return;

    if (typeof window !== 'undefined') {
      (window as unknown as { __canvas_editing_text_id?: string | null }).__canvas_editing_text_id = null;
    }

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
      const fSize = Number(targetYEl.get('fontSize')) || currentEditing.fontSize || 24;
      const fFam = String(targetYEl.get('fontFamily') || currentEditing.fontFamily || 'sans-serif');
      const lines = text.split('\n');

      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      let maxWidth = 20;
      if (ctx) {
        ctx.font = `${fSize}px ${fFam}`;
        lines.forEach((l) => {
          maxWidth = Math.max(maxWidth, ctx.measureText(l || 'M').width);
        });
      }
      const measuredWidth = Math.ceil(maxWidth);
      const measuredHeight = Math.ceil(
        lines.length > 1
          ? (lines.length - 1) * (fSize * 1.25) + fSize
          : fSize * 1.15
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
  }, [
    yElement,
    doc,
    order,
    canvasRef,
    setYElement,
    setSelectedElementIds,
    setBound,
    setCurrentTool,
    setActiveToolbarId,
    scheduleRender,
  ]);

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
        const shapeX = Number(hit.yEl.get('x'));
        const shapeY = Number(hit.yEl.get('y'));
        const shapeW = Number(hit.yEl.get('width')) || 120;
        const shapeH = Number(hit.yEl.get('height')) || 40;

        const textX = shapeX + Math.max(0, (shapeW - 120) / 2);
        const textY = shapeY + Math.max(0, (shapeH - 36) / 2);

        const createdYEl = createTextElement({
          startPoint: [textX, textY],
          endPoint: [textX + 120, textY + 36],
          text: '',
          isDark,
          style: { fillColor, strokeColor, strokeWidth, fillStyle, roughness, boundaryStyle, fillWeight, opacity, hasShadow, fontSize, fontFamily, textAlign: 'center' },
          doc,
          yElement,
          order,
        });

        if (createdYEl) {
          startEditingText(createdYEl);
        }
        return;
      }

      const createdYEl = createTextElement({
        startPoint: [x, y],
        endPoint: [x + 120, y + 36],
        text: '',
        isDark,
        style: { fillColor, strokeColor, strokeWidth, fillStyle, roughness, boundaryStyle, fillWeight, opacity, hasShadow, fontSize, fontFamily, textAlign },
        doc,
        yElement,
        order,
      });

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

  return {
    editingTextElement,
    setEditingTextElement,
    editingTextElementRef,
    finishEditingTextRef,
    textareaRef,
    textCreationTimeRef,
    justFinishedEditingTextRef,
    startEditingText,
    finishEditingText,
    handleDoubleClick,
  };
}
