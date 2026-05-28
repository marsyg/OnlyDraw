import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, SlidersHorizontal, X, Layers, Trash2 } from 'lucide-react';
import canvasDoc, { LOCAL_ORIGIN } from '@/Store/yjs-store';
import * as Y from 'yjs';

import { TOOLBAR_ITEM } from '@/types/toolbarData';
import { BoundaryStyle, FillStyle, useAppStore } from '@/Store/store';
import { actionType, elementType } from '@/types/type';

// --- Helper Functions ---
const getRoughnessLabel = (value: number) => {
  if (value <= 0.1) return "Crisp (Architect)";
  if (value <= 0.6) return "Subtle Sketch";
  if (value <= 1.2) return "Natural (Diagram)";
  if (value <= 2.2) return "Casual Sketch";
  return "Rough Sketch";
};

const ToolbarStyles = () => (
  <style>{`
    /* Dark Slate Glassmorphism Base */
    .canvas-glass-panel {
      background-color: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 65, 85, 0.8);
      border-radius: 16px;
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.6), 0 8px 16px -6px rgba(0, 0, 0, 0.5);
      color: #f1f5f9;
    }

    /* Tool button */
    .tool-island-btn {
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 10px;
      color: #94a3b8;
    }
    .tool-island-btn:hover {
      background: rgba(51, 65, 85, 0.6);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .tool-island-btn.active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }

    /* Custom Range Slider (Dark) */
    .modern-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 4px;
      background: #334155;
      border-radius: 2px;
      outline: none;
    }
    .modern-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #f8fafc;
      cursor: pointer;
      border: 2px solid #0f172a;
      box-shadow: 0 0 0 1px #3b82f6;
      transition: transform 0.1s, background 0.1s;
    }
    .modern-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      background: #ffffff;
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
  onDelete?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onImageUpload?: () => void;
}

export default function RoughSketchToolbox({ onDelete, onGroup, onUngroup, onImageUpload }: RoughSketchToolboxProps) {
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
  } = useAppStore();

  const colorRef = useRef<HTMLInputElement | null>(null);

  // Constants - Curated Modern Diagram Palette
  const swatches = [
    "#1e293b", // Slate (ink / primary)
    "#3b82f6", // Blue (components)
    "#10b981", // Emerald (services)
    "#8b5cf6", // Purple (controllers)
    "#f59e0b", // Amber (database)
    "#ef4444", // Rose (gateways)
    "#64748b", // Slate-500 (notes)
    "#ffffff", // White
  ];
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
    }
  }, [selectedYElement, setStrokeColor, setFillColor, setIsFillTransparent, setStrokeWidth, setRoughness, setFillStyle, setFillWeight, setBoundaryStyle, setHasShadow, setOpacity, setRotation, setRotationAxis]);

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
    }
    if (target === "fill") {
      setFillColor(value);
      setIsFillTransparent(false);
      updateSelectedProperty('fillColor', value);
      updateSelectedProperty('isFillTransparent', false);
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
  const showFillControl = !currentTool.elementType || currentTool.elementType === elementType.Rectangle || currentTool.elementType === elementType.Ellipse || hasSelection;

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
        <div className="canvas-glass-panel px-2 py-1.5 flex items-center gap-1 shadow-2xl">
          {TOOLBAR_ITEM.map((item) => {
            const isActive = toolbar.activeToolId === item.id || (item.id === 'select' && toolbar.activeToolId === null);

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id, item.actionType, item.elementType)}
                className={`tool-island-btn w-9 h-9 flex items-center justify-center ${isActive ? 'active' : ''}`}
                title={item.name}
                aria-label={item.name}
              >
                {React.createElement(item.icon, { size: 18 })}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-[1px] h-6 bg-slate-700/80 mx-1" />

          {/* Toggle Property Inspector Button */}
          <button
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className={`tool-island-btn w-9 h-9 flex items-center justify-center relative ${isPanelOpen ? 'text-blue-400 bg-slate-800' : 'text-slate-400'}`}
            title={isPanelOpen ? "Hide Styles" : "Show Styles"}
            aria-label="Toggle Properties Panel"
          >
            <SlidersHorizontal size={17} />
            {/* Color swatch dot on button */}
            <span
              className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border border-slate-900"
              style={{ backgroundColor: strokeColor }}
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
            className="fixed top-20 left-4 z-40 select-none canvas-glass-panel w-[276px] overflow-hidden"
          >
            {/* Inspector Header */}
            <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
              <span className="text-xs font-semibold text-slate-200 tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {getHeaderTitle()}
              </span>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Hide Inspector"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-3.5 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">

              {/* Contextual Action Bar (Multi-Select / Grouping) */}
              {hasSelection && (
                <div className="flex gap-1.5 pb-3 border-b border-slate-800">
                  {onGroup && selectedElementIds.length > 1 && (
                    <button
                      onClick={onGroup}
                      className="flex-1 py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/80 rounded-lg text-[11px] font-medium text-blue-200 flex items-center justify-center gap-1.5 transition-colors"
                      title="Group elements (Ctrl+G)"
                    >
                      <Layers size={13} />
                      <span>Group</span>
                    </button>
                  )}
                  {onUngroup && (
                    <button
                      onClick={onUngroup}
                      className="flex-1 py-1.5 px-2 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/80 rounded-lg text-[11px] font-medium text-purple-200 flex items-center justify-center gap-1.5 transition-colors"
                      title="Ungroup elements (Ctrl+Shift+G)"
                    >
                      <Layers size={13} />
                      <span>Ungroup</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={onDelete}
                      className="py-1.5 px-2.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded-lg text-[11px] font-medium text-red-200 flex items-center justify-center transition-colors"
                      title="Delete selected (Del)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TIER 1: ESSENTIAL CONTROLS (Always Visible)
              ───────────────────────────────────────────────────────────── */}

              {/* 1. Stroke Color */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-300">Stroke</span>
                  <span className="font-mono text-[10px] text-slate-400">{strokeColor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    title="Pick custom stroke color"
                    className="w-6 h-6 rounded-md border border-slate-600 shadow-sm active:scale-95 transition-transform flex-shrink-0"
                    style={{ backgroundColor: strokeColor }}
                    onClick={() => openPicker('stroke')}
                  />
                  <div className="flex flex-wrap gap-1 items-center flex-1">
                    {swatches.map((c) => (
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
                            ? 'border-blue-400 scale-110 shadow-sm'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Fill Color & Mode */}
              {showFillControl && (
                <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-300">Fill</span>
                    <button
                      onClick={() => {
                        const next = !isFillTransparent;
                        setIsFillTransparent(next);
                        updateSelectedProperty('isFillTransparent', next);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                        isFillTransparent
                          ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {isFillTransparent ? 'Transparent' : 'Solid'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      title={isFillTransparent ? 'Transparent (click to choose color)' : 'Pick custom fill color'}
                      className="w-6 h-6 rounded-md border border-slate-600 shadow-sm relative overflow-hidden active:scale-95 transition-transform flex-shrink-0"
                      style={{ backgroundColor: isFillTransparent ? '#1e293b' : fillColor }}
                      onClick={() => openPicker('fill')}
                    >
                      {isFillTransparent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[1.5px] h-full bg-red-400 rotate-45 transform" />
                        </div>
                      )}
                    </button>
                    <div className="flex flex-wrap gap-1 items-center flex-1">
                      {swatches.map((c) => (
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
                              ? 'border-blue-400 scale-110 shadow-sm'
                              : 'border-slate-700 hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Thickness Presets & Slider */}
              <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-300">Thickness</span>
                  <span className="font-mono text-[10px] text-slate-400">{strokeWidth}px</span>
                </div>
                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: 'Fine (1px)', val: 1 },
                    { label: 'Diagram (2px)', val: 2 },
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
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
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
                />
              </div>

              {/* 4. Sloppiness Presets & Slider (Architect / CAD Crisp = 0) */}
              <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-300">Sloppiness</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-900/60 text-blue-300">
                    {getRoughnessLabel(roughness)}
                  </span>
                </div>
                {/* Quick Presets */}
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
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
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
                />
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  TIER 2: PROGRESSIVE DISCLOSURE (Advanced on Demand)
              ───────────────────────────────────────────────────────────── */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="w-full py-1.5 px-2 flex items-center justify-between text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
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
                      {/* Line Boundary Style */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Line Style</label>
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
                                  ? 'bg-blue-900/40 border-blue-500 text-blue-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fill Pattern (when not transparent) */}
                      {!isFillTransparent && showFillControl && (
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pattern</label>
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
                                    ? 'bg-blue-900/40 border-blue-500 text-blue-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                          {fillStyle !== 'solid' && (
                            <div className="pt-1.5 space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">Pattern Density</span>
                                <span className="font-mono text-slate-400">{fillWeight}</span>
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
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Opacity & Shadow */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer">
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
                          <span className="text-[10px] text-slate-400">Opacity</span>
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
                            className="w-11 text-right bg-slate-900 border border-slate-700 rounded text-[10px] p-0.5 text-slate-200 font-mono"
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Rotation */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-semibold">Rotation</span>
                          <span className="font-mono text-slate-400">
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
                                  ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
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