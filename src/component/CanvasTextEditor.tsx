'use client';

import React from 'react';
import { EditingTextState } from '@/types/canvas';
import { getThemeAdaptedColor } from '@/lib/utils/drawingUtility/drawElement';

interface CanvasTextEditorProps {
  editingTextElement: EditingTextState | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  camera: { x: number; y: number; scale: number };
  isDark: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onChangeText: (text: string) => void;
  onFinish: () => void;
}

export const CanvasTextEditor: React.FC<CanvasTextEditorProps> = ({
  editingTextElement,
  textareaRef,
  camera,
  isDark,
  canvasRef,
  onChangeText,
  onFinish,
}) => {
  if (!editingTextElement) return null;

  const lines = (editingTextElement.text || ' ').split('\n');
  const canvas = canvasRef.current;
  const ctx = canvas ? canvas.getContext('2d') : null;
  let maxLineWidth = 0;
  if (ctx) {
    ctx.font = `${editingTextElement.fontSize}px ${editingTextElement.fontFamily}`;
    lines.forEach((l) => {
      const measured = ctx.measureText(l || '').width;
      maxLineWidth = Math.max(maxLineWidth, measured);
    });
  }

  const currentScale = camera.scale;
  const lineH = editingTextElement.fontSize * 1.35;
  const hPad = 36;
  const vPad = 12;
  const minW = editingTextElement.isArrow ? 130 : 180;
  const textW = Math.max(minW, Math.ceil(maxLineWidth * 1.12) + hPad);
  const editorWidth = Math.ceil(textW * currentScale);
  const editorHeight = Math.ceil((Math.max(1, lines.length) * lineH + vPad) * currentScale);

  const textColor = getThemeAdaptedColor(
    editingTextElement.fillColor || (isDark ? '#f8fafc' : '#0f172a'),
    isDark
  );

  const leftPos = editingTextElement.isArrow
    ? editingTextElement.x * currentScale + camera.x - editorWidth / 2
    : editingTextElement.x * currentScale + camera.x;
  const topPos = editingTextElement.isArrow
    ? editingTextElement.y * currentScale + camera.y - editorHeight / 2
    : editingTextElement.y * currentScale + camera.y;

  return (
    <textarea
      ref={textareaRef}
      autoFocus
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      value={editingTextElement.text}
      onChange={(e) => onChangeText(e.target.value)}
      onBlur={onFinish}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onFinish();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onFinish();
        }
      }}
      placeholder={editingTextElement.isArrow ? 'Label arrow...' : 'Type text...'}
      style={{
        position: 'absolute',
        left: leftPos,
        top: topPos,
        width: `${editorWidth}px`,
        height: `${editorHeight}px`,
        minWidth: `${Math.ceil(minW * currentScale)}px`,
        minHeight: `${Math.ceil((lineH + vPad) * currentScale)}px`,
        fontSize: `${editingTextElement.fontSize * currentScale}px`,
        fontFamily: editingTextElement.fontFamily,
        color: textColor,
        textAlign: editingTextElement.textAlign as React.CSSProperties['textAlign'],
        lineHeight: 1.35,
        background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: isDark
          ? '1.5px dashed rgba(148, 163, 184, 0.5)'
          : '1.5px dashed rgba(99, 102, 241, 0.5)',
        borderRadius: '6px',
        boxShadow: isDark
          ? '0 4px 20px rgba(0, 0, 0, 0.6)'
          : '0 4px 16px rgba(0, 0, 0, 0.08)',
        outline: 'none',
        resize: 'none',
        padding: `${Math.ceil(4 * currentScale)}px ${Math.ceil(10 * currentScale)}px`,
        margin: 0,
        zIndex: 60,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        caretColor: textColor,
        transform: editingTextElement.angle
          ? `rotate(${editingTextElement.angle}rad)`
          : undefined,
        transformOrigin: '0 0',
        boxSizing: 'border-box',
      }}
    />
  );
};

export default CanvasTextEditor;
