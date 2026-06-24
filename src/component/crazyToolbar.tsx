import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  Layers,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Edit3,
} from 'lucide-react';
import canvasDoc, { LOCAL_ORIGIN } from '@/Store/yjs-store';
import * as Y from 'yjs';

import { TOOLBAR_ITEM } from '@/types/toolbarData';
import { BoundaryStyle, FillStyle, useAppStore } from '@/Store/store';
import { actionType, elementType } from '@/types/type';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';

// --- Helper Functions ---
const getRoughnessLabel = (value: number) => {
  if (value <= 0.1) return "Crisp (CAD)";
  if (value <= 0.6) return "Subtle Sketch";
  if (value <= 1.2) return "Natural Sketch";
  if (value <= 2.2) return "Casual Sketch";
  return "Rough Sketch";
};

const measureTextDims = (text: string, fSize: number, fFam: string) => {
  if (typeof document === 'undefined') return { width: 30, height: 24 };
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx) return { width: 30, height: 24 };
  ctx.font = `${fSize}px ${fFam}`;
  const lines = text.split('\n');
  let maxW = 20;
  lines.forEach((l) => {
    maxW = Math.max(maxW, ctx.measureText(l || 'M').width);
  });
  return {
    width: Math.ceil(maxW),
    height: Math.ceil(
      lines.length > 1 ? (lines.length - 1) * (fSize * 1.25) + fSize : fSize * 1.15
    ),
  };
};

const ToolbarStyles = () => (
  <style>{`
    /* Glassmorphism Base - Adaptive via CSS classes */
    .canvas-glass-panel {
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 16px;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    /* Tool button */
    .tool-island-btn {
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 10px;
    }
    .tool-island-btn:hover {
      transform: translateY(-1px);
    }
    .tool-island-btn.active {
      background: #2563eb !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }

    /* Custom Range Slider */
    .modern-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      outline: none;
    }
    .modern-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      transition: transform 0.1s, background 0.1s;
    }
    .modern-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }

    /* Scrollbar cleanup */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

interface RoughSketchToolboxProps {
  isDark?: boolean;
  onDelete?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onImageUpload?: () => void;
  onEditText?: () => void;
  onAlign?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
}

export default function RoughSketchToolbox({
  isDark = false,
  onDelete,
  onGroup,
  onUngroup,
  onImageUpload,
  onEditText,
  onAlign,
}: RoughSketchToolboxProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Store
  const {
    strokeColor, setActiveToolbarId, toolbar, setCurrentTool, currentTool, setIsDragging, setIsSelecting, setStrokeColor,
    fillColor, setFillColor, isFillTransparent, setIsFillTransparent, strokeWidth, setStrokeWidth,
    setRoughness, fillStyle, setFillStyle, fillWeight, setFillWeight, roughness,
    boundaryStyle, setBoundaryStyle, hasShadow, setHasShadow, opacity, setOpacity, setBound,
    rotation, setRotation, rotationAxis, setRotationAxis, selectedYElement, selectedElementIds,
    fontSize, setFontSize, fontFamily, setFontFamily, textAlign, setTextAlign,
    arrowRouting, setArrowRouting,
  } = useAppStore();

  const colorRef = useRef<HTMLInputElement | null>(null);

  // Determine element context
  const selectedType = selectedYElement ? (selectedYElement.get('type') as elementType) : null;
  const isTextElement = Boolean(
    selectedType === elementType.Text ||
    (currentTool.elementType === elementType.Text)
  );

  const isArrowElement = Boolean(
    selectedType === elementType.Arrow ||
    selectedType === elementType.ArrowTwoWay ||
    currentTool.elementType === elementType.Arrow ||
    currentTool.elementType === elementType.ArrowTwoWay
  );

  const isLineElement = Boolean(
    selectedType === elementType.Line ||
    currentTool.elementType === elementType.Line
  );

  const currentRouting = String(
    selectedYElement?.get('routing') || arrowRouting || 'straight'
  );

  // Palettes tuned for light / dark
  const shapeSwatches = isDark
    ? ["#f8fafc", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#94a3b8", "#1e293b"]
    : ["#0f172a", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b", "#ffffff"];

  // Dedicated light/pastel fill swatches designed for readability when writing text over shapes
  const fillSwatches = isDark
    ? ["#1e293b", "#1e3a5f", "#14532d", "#3b1e54", "#451a03", "#450a0a", "#334155", "#0f172a"]
    : ["#dbeafe", "#dcfce7", "#ede9fe", "#fef3c7", "#fee2e2", "#e0f2fe", "#f1f5f9", "#ffffff"];

  const textSwatches = isDark
    ? ["#f8fafc", "#94a3b8", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f87171", "#38bdf8"]
    : ["#0f172a", "#475569", "#2563eb", "#10b981", "#8b5cf6", "#d97706", "#dc2626", "#0284c7"];

  const fillStyles = [
    { id: "solid", label: "Solid" },
    { id: "hachure", label: "Hachure" },
    { id: "dots", label: "Dots" },
    { id: "zigzag", label: "ZigZag" },
  ];
  const boundaryStyles = [
    { id: "solid", label: "Solid" },
    { id: "dashed", label: "Dashed" },
    { id: "dotted", label: "Dotted" },
  ];

  const getSelectedElements = useCallback((): Y.Map<unknown>[] => {
    if (selectedYElement) return [selectedYElement];
    if (selectedElementIds.length > 0) {
      const list: Y.Map<unknown>[] = [];
      selectedElementIds.forEach((id) => {
        const el = canvasDoc.yElement.get(id);
        if (el && !el.get('isDeleted')) list.push(el);
      });
      return list;
    }
    return [];
  }, [selectedYElement, selectedElementIds]);

  const updateSelectedProperty = useCallback((key: string, value: unknown) => {
    const targets = getSelectedElements();
    if (targets.length > 0) {
      canvasDoc.doc.transact(() => {
        targets.forEach((el) => {
          el.set(key, value);
        });
      }, LOCAL_ORIGIN);
    }
  }, [getSelectedElements]);

  const updateTextProperty = useCallback((key: 'fontSize' | 'fontFamily' | 'textAlign' | 'color', val: unknown) => {
    const targets = getSelectedElements();
    if (targets.length > 0) {
      canvasDoc.doc.transact(() => {
        targets.forEach((el) => {
          if (el.get('type') === elementType.Text) {
            if (key === 'fontSize') {
              const fSize = Number(val);
              const fFam = String(el.get('fontFamily') || 'sans-serif');
              const txt = String(el.get('text') || '');
              const dims = measureTextDims(txt, fSize, fFam);
              el.set('fontSize', fSize);
              el.set('width', dims.width);
              el.set('height', dims.height);
            } else if (key === 'fontFamily') {
              const fFam = String(val);
              const fSize = Number(el.get('fontSize') || 24);
              const txt = String(el.get('text') || '');
              const dims = measureTextDims(txt, fSize, fFam);
              el.set('fontFamily', fFam);
              el.set('width', dims.width);
              el.set('height', dims.height);
            } else if (key === 'textAlign') {
              el.set('textAlign', val);
            } else if (key === 'color') {
              el.set('fillColor', val);
              el.set('strokeColor', val);
            }
          } else {
            el.set(key, val);
          }
        });
      }, LOCAL_ORIGIN);
      if (selectedYElement) {
        setBound(getBounds({ element: selectedYElement }));
      }
    }
  }, [getSelectedElements, selectedYElement, setBound]);

  // Sync toolbar controls with selected element
  useEffect(() => {
    if (selectedYElement) {
      const sColor = selectedYElement.get('strokeColor') as string | undefined;
      if (sColor) setStrokeColor(sColor);
      const fColor = selectedYElement.get('fillColor') as string | undefined;
      if (fColor) setFillColor(fColor);
      const isTrans = selectedYElement.get('isFillTransparent') as boolean | undefined;
      if (isTrans !== undefined) setIsFillTransparent(isTrans);
      const sWidth = selectedYElement.get('strokeWidth') as number | undefined;
      if (sWidth !== undefined) setStrokeWidth(sWidth);
      const rough = selectedYElement.get('roughness') as number | undefined;
      if (rough !== undefined) setRoughness(rough);
      const fStyle = selectedYElement.get('fillStyle') as FillStyle | undefined;
      if (fStyle) setFillStyle(fStyle);
      const fWeight = selectedYElement.get('fillWeight') as number | undefined;
      if (fWeight !== undefined) setFillWeight(fWeight);
      const bStyle = selectedYElement.get('boundaryStyle') as BoundaryStyle | undefined;
      if (bStyle) setBoundaryStyle(bStyle);
      const shadow = selectedYElement.get('hasShadow') as boolean | undefined;
      if (shadow !== undefined) setHasShadow(shadow);
      const op = selectedYElement.get('opacity') as number | undefined;
      if (op !== undefined) setOpacity(op);
      const ang = selectedYElement.get('angle') as number | undefined;
      if (ang !== undefined) setRotation(Math.round((ang * 180) / Math.PI));
      const axis = selectedYElement.get('rotationAxis') as 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | undefined;
      if (axis) setRotationAxis(axis);

      const fSize = selectedYElement.get('fontSize') as number | undefined;
      if (fSize !== undefined) setFontSize(fSize);
      const fFam = selectedYElement.get('fontFamily') as string | undefined;
      if (fFam) setFontFamily(fFam);
      const tAlign = selectedYElement.get('textAlign') as 'left' | 'center' | 'right' | undefined;
      if (tAlign) setTextAlign(tAlign);
      const rting = selectedYElement.get('routing') as 'straight' | 'curved' | 'angled' | undefined;
      if (rting) setArrowRouting(rting);
    }
  }, [
    selectedYElement,
    setStrokeColor,
    setFillColor,
    setIsFillTransparent,
    setStrokeWidth,
    setRoughness,
    setFillStyle,
    setFillWeight,
    setBoundaryStyle,
    setHasShadow,
    setOpacity,
    setRotation,
    setRotationAxis,
    setFontSize,
    setFontFamily,
    setTextAlign,
    setArrowRouting,
  ]);

  const changeArrowRouting = (newRouting: 'straight' | 'curved' | 'angled') => {
    setArrowRouting(newRouting);
    getSelectedElements().forEach((el) => {
      const type = el.get('type') as elementType;
      if (type === elementType.Arrow || type === elementType.ArrowTwoWay) {
        el.set('routing', newRouting);
        if (newRouting === 'straight') {
          el.set('controlPoint', null);
        }
      }
    });
    if (selectedYElement) {
      setBound(getBounds({ element: selectedYElement }));
    }
  };

  // Handlers
  const handleClick = (id: string, action: actionType, elType: elementType) => {
    if (action === actionType.Delete) {
      if (onDelete) onDelete();
      return;
    }
    if (id === 'image') {
      if (onImageUpload) onImageUpload();
      return;
    }
    setActiveToolbarId(id);
    setCurrentTool({ action, elementType: elType });
    setIsSelecting(action === actionType.Selecting);
    setIsDragging(action === actionType.Dragging);
    setBound(null);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    if (target === "stroke") {
      setStrokeColor(value);
      updateSelectedProperty('strokeColor', value);
      if (isTextElement) {
        updateTextProperty('color', value);
      }
    }
    if (target === "fill") {
      setFillColor(value);
      setIsFillTransparent(false);
      updateSelectedProperty('fillColor', value);
      updateSelectedProperty('isFillTransparent', false);
      if (isTextElement) {
        updateTextProperty('color', value);
      }
    }
    if (target === "text") {
      setFillColor(value);
      setStrokeColor(value);
      updateTextProperty('color', value);
    }
  };

  const openPicker = (type: string | null) => {
    setTarget(type);
    colorRef.current?.click();
  };

  const getHeaderTitle = () => {
    if (selectedElementIds.length > 1) return `Selected (${selectedElementIds.length})`;
    if (selectedYElement) {
      const t = selectedYElement.get('type') as string;
      if (t) return `${t.charAt(0).toUpperCase() + t.slice(1)}`;
    }
    if (currentTool.elementType) {
      return `${currentTool.elementType.charAt(0).toUpperCase() + currentTool.elementType.slice(1)} Style`;
    }
    return 'Styles';
  };

  const hasSelection = Boolean(selectedYElement || selectedElementIds.length > 0);
  const showFillControl = !isTextElement && !isArrowElement && !isLineElement && (
    !currentTool.elementType ||
    currentTool.elementType === elementType.Rectangle ||
    currentTool.elementType === elementType.Ellipse ||
    hasSelection
  );

  // Theme-aware color tokens
  const panelClasses = isDark
    ? 'bg-slate-900/95 border-slate-700/80 shadow-[0_20px_35px_-10px_rgba(0,0,0,0.6)] text-slate-100'
    : 'bg-white/95 border-slate-200/90 shadow-[0_12px_32px_-5px_rgba(0,0,0,0.08)] text-slate-800';

  const toolBtnClasses = isDark
    ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';

  const subpanelBorder = isDark ? 'border-slate-800' : 'border-slate-100';
  const subpanelBg = isDark ? 'bg-slate-950/40' : 'bg-slate-50/80';
  const labelColor = isDark ? 'text-slate-300' : 'text-slate-600';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-400';
  const btnBase = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900';

  return (
    <>
      <ToolbarStyles />
      <input ref={colorRef} type="color" hidden onChange={handleChange} />

      {/* ─────────────────────────────────────────────────────────────
          1. PRIMARY CREATION TOOLBAR (Top-Center Floating Island)
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 select-none"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className={`canvas-glass-panel px-2 py-1.5 flex items-center gap-1 border shadow-2xl ${panelClasses}`}>
          {TOOLBAR_ITEM.map((item) => {
            const isActive = toolbar.activeToolId === item.id || (item.id === 'select' && toolbar.activeToolId === null);

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id, item.actionType, item.elementType)}
                className={`tool-island-btn w-9 h-9 flex items-center justify-center ${isActive ? 'active' : toolBtnClasses}`}
                title={item.name}
                aria-label={item.name}
              >
                {React.createElement(item.icon, { size: 18 })}
              </button>
            );
          })}

          {/* Divider */}
          <div className={`w-[1px] h-6 mx-1 ${isDark ? 'bg-slate-700/80' : 'bg-slate-200'}`} />

          {/* Toggle Property Inspector Button */}
          <button
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className={`tool-island-btn w-9 h-9 flex items-center justify-center relative transition-colors ${
              isPanelOpen
                ? (isDark ? 'text-blue-400 bg-slate-800' : 'text-blue-600 bg-blue-50')
                : toolBtnClasses
            }`}
            title={isPanelOpen ? "Hide Styles" : "Show Styles"}
            aria-label="Toggle Properties Panel"
          >
            <SlidersHorizontal size={17} />
            {/* Color swatch dot on button */}
            <span
              className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border ${isDark ? 'border-slate-900' : 'border-white'}`}
              style={{ backgroundColor: isTextElement ? (fillColor || strokeColor) : strokeColor }}
            />
          </button>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. CONTEXTUAL PROPERTY INSPECTOR (Progressive Disclosure)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: -16, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={`fixed top-20 left-4 z-40 select-none canvas-glass-panel w-[280px] overflow-hidden border ${panelClasses}`}
          >
            {/* Inspector Header */}
            <div className={`px-3.5 py-2.5 flex items-center justify-between border-b ${subpanelBorder} ${subpanelBg}`}>
              <span className="text-xs font-semibold tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {getHeaderTitle()}
              </span>
              <button
                onClick={() => setIsPanelOpen(false)}
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Hide Inspector"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-3.5 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">

              {/* Contextual Action Bar (Multi-Select / Grouping / Delete) */}
              {hasSelection && (
                <div className={`flex flex-col gap-2 pb-3 border-b ${subpanelBorder}`}>
                  <div className="flex gap-1.5">
                    {onGroup && selectedElementIds.length > 1 && (
                      <button
                        onClick={onGroup}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                          isDark
                            ? 'bg-blue-950/60 hover:bg-blue-900/60 border-blue-700/80 text-blue-200'
                            : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                        }`}
                        title="Group elements (Ctrl+G)"
                      >
                        <Layers size={13} />
                        <span>Group</span>
                      </button>
                    )}
                    {onUngroup && (
                      <button
                        onClick={onUngroup}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                          isDark
                            ? 'bg-purple-950/60 hover:bg-purple-900/60 border-purple-700/80 text-purple-200'
                            : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                        }`}
                        title="Ungroup elements (Ctrl+Shift+G)"
                      >
                        <Layers size={13} />
                        <span>Ungroup</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={onDelete}
                        className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium border flex items-center justify-center transition-colors ${
                          isDark
                            ? 'bg-red-950/50 hover:bg-red-900/60 border-red-800/80 text-red-200'
                            : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                        }`}
                        title="Delete selected (Del)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Multi-Element Alignment Tools */}
                  {selectedElementIds.length > 1 && onAlign && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                        <span className={mutedColor}>Align Elements</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {([
                          { id: 'left', label: 'L', title: 'Align Left' },
                          { id: 'center', label: 'C', title: 'Align Center Horizontal' },
                          { id: 'right', label: 'R', title: 'Align Right' },
                          { id: 'top', label: 'T', title: 'Align Top' },
                          { id: 'middle', label: 'M', title: 'Align Middle Vertical' },
                          { id: 'bottom', label: 'B', title: 'Align Bottom' },
                        ] as const).map((a) => (
                          <button
                            key={a.id}
                            onClick={() => onAlign(a.id)}
                            title={a.title}
                            className={`py-1 text-[10px] rounded border font-semibold transition-colors ${btnBase}`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <button
                          onClick={() => onAlign('distribute-h')}
                          className={`py-1 text-[10px] rounded border font-medium transition-colors ${btnBase}`}
                          title="Distribute Horizontally"
                        >
                          Distribute H
                        </button>
                        <button
                          onClick={() => onAlign('distribute-v')}
                          className={`py-1 text-[10px] rounded border font-medium transition-colors ${btnBase}`}
                          title="Distribute Vertically"
                        >
                          Distribute V
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TEXT CONTROLS (Displayed when Text is active/selected)
              ───────────────────────────────────────────────────────────── */}
              {isTextElement && (
                <div className="space-y-3.5">
                  {/* Quick Edit Action */}
                  {selectedYElement && onEditText && (
                    <button
                      onClick={onEditText}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
                    >
                      <Edit3 size={14} />
                      <span>Edit Text Content</span>
                    </button>
                  )}

                  {/* 1. Text Alignment */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Alignment</span>
                      <span className={`font-mono text-[10px] uppercase ${mutedColor}`}>{textAlign}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                        { id: 'right', label: 'Right', icon: AlignRight },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setTextAlign(item.id as 'left' | 'center' | 'right');
                            updateTextProperty('textAlign', item.id);
                          }}
                          className={`py-1.5 rounded border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            textAlign === item.id
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : btnBase
                          }`}
                        >
                          <item.icon size={13} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Font Size */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Font Size</span>
                      <span className={`font-mono text-[10px] ${mutedColor}`}>{fontSize}px</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'S (16)', val: 16 },
                        { label: 'M (24)', val: 24 },
                        { label: 'L (36)', val: 36 },
                        { label: 'XL (48)', val: 48 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          onClick={() => {
                            setFontSize(p.val);
                            updateTextProperty('fontSize', p.val);
                          }}
                          className={`text-[10px] py-1 rounded border font-medium transition-colors ${
                            fontSize === p.val
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : btnBase
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="96"
                      step="2"
                      value={fontSize}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFontSize(v);
                        updateTextProperty('fontSize', v);
                      }}
                      className="modern-slider mt-1"
                      style={{
                        background: isDark ? '#334155' : '#e2e8f0',
                      }}
                    />
                  </div>

                  {/* 3. Font Family */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Font Family</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { id: 'sans-serif', label: 'Sans (Clean)' },
                        { id: 'serif', label: 'Serif (Classic)' },
                        { id: 'monospace', label: 'Mono (Code)' },
                        { id: "'Kalam', cursive", label: 'Hand (Sketch)' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setFontFamily(f.id);
                            updateTextProperty('fontFamily', f.id);
                          }}
                          className={`text-[10px] py-1.5 rounded border font-medium transition-colors ${
                            fontFamily === f.id
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : btnBase
                          }`}
                          style={{ fontFamily: f.id }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Text Color */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Text Color</span>
                      <span className={`font-mono text-[10px] ${mutedColor}`}>{fillColor || strokeColor}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Pick custom text color"
                        className={`w-6 h-6 rounded-md border shadow-sm active:scale-95 transition-transform flex-shrink-0 ${
                          isDark ? 'border-slate-700' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: fillColor || strokeColor }}
                        onClick={() => openPicker('text')}
                      />
                      <div className="flex flex-wrap gap-1 items-center flex-1">
                        {textSwatches.map((c) => {
                          const activeColor = (fillColor || strokeColor || '').toLowerCase();
                          const isSel = activeColor === c.toLowerCase();
                          return (
                            <button
                              key={'text-' + c}
                              onClick={() => {
                                setFillColor(c);
                                setStrokeColor(c);
                                updateTextProperty('color', c);
                              }}
                              style={{ backgroundColor: c }}
                              title={`Color: ${c}`}
                              className={`w-4 h-4 rounded-full border transition-all ${
                                isSel
                                  ? 'border-blue-500 scale-125 shadow-md ring-2 ring-blue-500/30'
                                  : isDark
                                  ? 'border-slate-700 hover:scale-110'
                                  : 'border-slate-300 hover:scale-110'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  SHAPE CONTROLS (Displayed when shapes are active/selected)
              ───────────────────────────────────────────────────────────── */}
              {!isTextElement && (
                <>
                  {/* Arrow Routing Style (Straight, Curved, Angled) & Label */}
                  {isArrowElement && (
                    <>
                      <div className="space-y-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800/80">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={`font-semibold ${labelColor}`}>Arrow Type</span>
                          <span className={`font-mono text-[10px] uppercase ${mutedColor}`}>{currentRouting}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'straight', label: 'Straight' },
                            { id: 'curved', label: 'Curved' },
                            { id: 'angled', label: 'Angled' },
                          ].map((rt) => (
                            <button
                              key={rt.id}
                              onClick={() => changeArrowRouting(rt.id as 'straight' | 'curved' | 'angled')}
                              className={`py-1.5 text-[10px] rounded border font-medium transition-colors ${
                                currentRouting === rt.id
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                  : btnBase
                              }`}
                            >
                              {rt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800/80">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={`font-semibold ${labelColor}`}>Arrow Label</span>
                          {onEditText && (
                            <button
                              onClick={onEditText}
                              className="text-[10px] text-blue-500 hover:text-blue-400 font-medium transition-colors"
                              title="Double click arrow on canvas or open editor"
                            >
                              Edit on Canvas
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Label this arrow..."
                          value={String(selectedYElement?.get('text') || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (selectedYElement) {
                              canvasDoc.doc.transact(() => {
                                selectedYElement.set('text', val);
                              }, LOCAL_ORIGIN);
                            }
                          }}
                          className={`w-full px-2 py-1.5 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDark
                              ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-500'
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </>
                  )}

                  {/* 1. Stroke Color */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Stroke</span>
                      <span className={`font-mono text-[10px] ${mutedColor}`}>{strokeColor}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Pick custom stroke color"
                        className={`w-6 h-6 rounded-md border shadow-sm active:scale-95 transition-transform flex-shrink-0 ${
                          isDark ? 'border-slate-700' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: strokeColor }}
                        onClick={() => openPicker('stroke')}
                      />
                      <div className="flex flex-wrap gap-1 items-center flex-1">
                        {shapeSwatches.map((c) => (
                          <button
                            key={'stroke-' + c}
                            onClick={() => {
                              setStrokeColor(c);
                              updateSelectedProperty('strokeColor', c);
                            }}
                            style={{ backgroundColor: c }}
                            title={`Stroke: ${c}`}
                            className={`w-4 h-4 rounded-full border transition-all ${
                              strokeColor.toLowerCase() === c.toLowerCase()
                                ? 'border-blue-500 scale-125 shadow-md ring-2 ring-blue-500/30'
                                : isDark
                                ? 'border-slate-700 hover:scale-110'
                                : 'border-slate-300 hover:scale-110'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. Fill Color & Mode */}
                  {showFillControl && (
                    <div className={`space-y-1.5 pt-3 border-t ${subpanelBorder}`}>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={`font-semibold ${labelColor}`}>Fill</span>
                        <button
                          onClick={() => {
                            const next = !isFillTransparent;
                            setIsFillTransparent(next);
                            updateSelectedProperty('isFillTransparent', next);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                            isFillTransparent
                              ? isDark
                                ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                              : btnBase
                          }`}
                        >
                          {isFillTransparent ? 'Transparent' : 'Solid'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          title={isFillTransparent ? 'Transparent (click to choose color)' : 'Pick custom fill color'}
                          className={`w-6 h-6 rounded-md border shadow-sm relative overflow-hidden active:scale-95 transition-transform flex-shrink-0 ${
                            isDark ? 'border-slate-700' : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: isFillTransparent ? (isDark ? '#1e293b' : '#f1f5f9') : fillColor }}
                          onClick={() => openPicker('fill')}
                        >
                          {isFillTransparent && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-[1.5px] h-full bg-red-400 rotate-45 transform" />
                            </div>
                          )}
                        </button>
                        <div className="flex flex-wrap gap-1 items-center flex-1">
                          {fillSwatches.map((c) => (
                            <button
                              key={'fill-' + c}
                              onClick={() => {
                                setFillColor(c);
                                setIsFillTransparent(false);
                                updateSelectedProperty('fillColor', c);
                                updateSelectedProperty('isFillTransparent', false);
                              }}
                              style={{ backgroundColor: c }}
                              title={`Fill: ${c}`}
                              className={`w-4 h-4 rounded-full border transition-all ${
                                !isFillTransparent && fillColor.toLowerCase() === c.toLowerCase()
                                  ? 'border-blue-500 scale-125 shadow-md ring-2 ring-blue-500/30'
                                  : isDark
                                  ? 'border-slate-700 hover:scale-110'
                                  : 'border-slate-300 hover:scale-110'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Thickness Presets & Slider */}
                  <div className={`space-y-1.5 pt-3 border-t ${subpanelBorder}`}>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Thickness</span>
                      <span className={`font-mono text-[10px] ${mutedColor}`}>{strokeWidth}px</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'Fine (1px)', val: 1 },
                        { label: 'Medium (2px)', val: 2 },
                        { label: 'Bold (4px)', val: 4 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          onClick={() => {
                            setStrokeWidth(p.val);
                            updateSelectedProperty('strokeWidth', p.val);
                          }}
                          className={`text-[10px] py-1 rounded border font-medium transition-colors ${
                            strokeWidth === p.val
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : btnBase
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={strokeWidth}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setStrokeWidth(v);
                        updateSelectedProperty('strokeWidth', v);
                      }}
                      className="modern-slider mt-1"
                      style={{
                        background: isDark ? '#334155' : '#e2e8f0',
                      }}
                    />
                  </div>

                  {/* 4. Sloppiness (Roughness) */}
                  <div className={`space-y-1.5 pt-3 border-t ${subpanelBorder}`}>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className={`font-semibold ${labelColor}`}>Sloppiness</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isDark
                          ? 'bg-blue-950/60 border-blue-900/60 text-blue-300'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        {getRoughnessLabel(roughness)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'Crisp (0)', val: 0 },
                        { label: 'Natural (0.8)', val: 0.8 },
                        { label: 'Sketch (2)', val: 2 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          onClick={() => {
                            setRoughness(p.val);
                            updateSelectedProperty('roughness', p.val);
                          }}
                          className={`text-[10px] py-1 rounded border font-medium transition-colors ${
                            Math.abs(roughness - p.val) < 0.2
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : btnBase
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={roughness}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRoughness(v);
                        updateSelectedProperty('roughness', v);
                      }}
                      className="modern-slider mt-1"
                      style={{
                        background: isDark ? '#334155' : '#e2e8f0',
                      }}
                    />
                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TIER 2: PROGRESSIVE DISCLOSURE (Advanced on Demand)
              ───────────────────────────────────────────────────────────── */}
              <div className={`pt-2 border-t ${subpanelBorder}`}>
                <button
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className={`w-full py-1.5 px-2 flex items-center justify-between text-[11px] font-medium rounded-lg transition-colors ${
                    isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span>More Styling Options</span>
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 pt-2.5 overflow-hidden"
                    >
                      {/* Line Boundary Style (for shapes) */}
                      {!isTextElement && (
                        <div className="space-y-1">
                          <label className={`text-[10px] uppercase font-bold tracking-wider ${mutedColor}`}>Line Style</label>
                          <div className="flex gap-1">
                            {boundaryStyles.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setBoundaryStyle(s.id as BoundaryStyle);
                                  updateSelectedProperty('boundaryStyle', s.id);
                                }}
                                className={`flex-1 py-1 text-[10px] rounded border font-medium transition-colors ${
                                  boundaryStyle === s.id
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                    : btnBase
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fill Pattern (for shapes when not transparent) */}
                      {!isTextElement && !isFillTransparent && showFillControl && (
                        <div className="space-y-1.5 pt-1">
                          <label className={`text-[10px] uppercase font-bold tracking-wider ${mutedColor}`}>Pattern</label>
                          <div className="grid grid-cols-4 gap-1">
                            {fillStyles.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setFillStyle(s.id as FillStyle);
                                  updateSelectedProperty('fillStyle', s.id);
                                }}
                                className={`text-[10px] py-1 rounded border font-medium transition-colors ${
                                  fillStyle === s.id
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                    : btnBase
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                          {fillStyle !== 'solid' && (
                            <div className="pt-1.5 space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className={mutedColor}>Pattern Density</span>
                                <span className={`font-mono ${mutedColor}`}>{fillWeight}</span>
                              </div>
                              <input
                                type="range"
                                min="2"
                                max="30"
                                value={fillWeight}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setFillWeight(v);
                                  updateSelectedProperty('fillWeight', v);
                                }}
                                className="modern-slider"
                                style={{
                                  background: isDark ? '#334155' : '#e2e8f0',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Opacity & Shadow */}
                      <div className="flex items-center justify-between pt-1">
                        <label className={`text-[11px] font-medium flex items-center gap-1.5 cursor-pointer ${labelColor}`}>
                          <input
                            type="checkbox"
                            checked={hasShadow}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setHasShadow(v);
                              updateSelectedProperty('hasShadow', v);
                            }}
                            className="accent-blue-500 rounded"
                          />
                          Drop Shadow
                        </label>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] ${mutedColor}`}>Opacity</span>
                          <input
                            type="number"
                            min="10"
                            max="100"
                            value={Math.round(opacity * 100)}
                            onChange={(e) => {
                              const v = Math.max(0.1, Math.min(1, Number(e.target.value) / 100));
                              setOpacity(v);
                              updateSelectedProperty('opacity', v);
                            }}
                            className={`w-11 text-right rounded text-[10px] p-0.5 font-mono border ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-slate-200'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                          <span className={`text-[10px] ${mutedColor}`}>%</span>
                        </div>
                      </div>

                      {/* Rotation */}
                      <div className={`space-y-1.5 pt-1 border-t ${subpanelBorder}`}>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className={`font-semibold ${labelColor}`}>Rotation</span>
                          <span className={`font-mono ${mutedColor}`}>
                            {Math.round((selectedYElement ? (Number(selectedYElement.get('angle')) || 0) * 180 / Math.PI : rotation) % 360)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={Math.round((selectedYElement ? (Number(selectedYElement.get('angle')) || 0) * 180 / Math.PI : rotation) % 360)}
                          onChange={(e) => {
                            const deg = Number(e.target.value) || 0;
                            setRotation(deg);
                            updateSelectedProperty('angle', (deg * Math.PI) / 180);
                          }}
                          className="modern-slider"
                          style={{
                            background: isDark ? '#334155' : '#e2e8f0',
                          }}
                        />

                        {/* Pivot Axis */}
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          {[
                            { id: 'center', label: 'Mid' },
                            { id: 'top-left', label: 'TL' },
                            { id: 'top-right', label: 'TR' },
                            { id: 'bottom-left', label: 'BL' },
                            { id: 'bottom-right', label: 'BR' },
                          ].map((ax) => (
                            <button
                              key={ax.id}
                              onClick={() => {
                                const axisId = ax.id as 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
                                setRotationAxis(axisId);
                                updateSelectedProperty('rotationAxis', axisId);
                              }}
                              className={`text-[9px] py-0.5 rounded border transition-colors ${
                                (selectedYElement ? (selectedYElement.get('rotationAxis') || 'center') : rotationAxis) === ax.id
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                  : btnBase
                              }`}
                            >
                              {ax.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}