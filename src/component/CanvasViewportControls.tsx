'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Keyboard,
  Undo2,
  Redo2,
} from 'lucide-react';

interface CanvasViewportControlsProps {
  isDark: boolean;
  isTouchDevice: boolean;
  cameraScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onResetView: () => void;
  onExportPNG: () => void;
  onOpenKeybindings: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

 const CanvasViewportControls: React.FC<CanvasViewportControlsProps> = ({
  isDark,
  isTouchDevice,
  cameraScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onResetView,
  onExportPNG,
  onOpenKeybindings,
  onUndo,
  onRedo,
}) => {
  const panelStyle = isDark
    ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100 shadow-xl'
    : 'bg-white/95 border-zinc-200 text-zinc-700 shadow-sm';

  const btnHover = isDark
    ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
    : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900';

  return (
    <motion.div
      className={`fixed ${isTouchDevice ? 'bottom-2 right-2' : 'bottom-4 right-4'} z-50 flex items-center gap-2 select-none`}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      {/* Undo / Redo Pill */}
      <div className={`flex items-center backdrop-blur-md rounded-xl p-1 shadow-lg border transition-colors ${panelStyle}`}>
        <button
          onClick={onUndo}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Undo (Ctrl+Z)"
          aria-label="Undo canvas change"
        >
          <Undo2 size={15} />
        </button>

        <div className={`w-[1px] h-4 mx-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

        <button
          onClick={onRedo}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Redo (Ctrl+Y)"
          aria-label="Redo canvas change"
        >
          <Redo2 size={15} />
        </button>
      </div>

      {/* Zoom & View Controls Pill */}
      <div className={`flex items-center backdrop-blur-md rounded-xl p-1 shadow-lg border transition-colors ${panelStyle}`}>
        <button
          onClick={onZoomOut}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Zoom Out (Ctrl+-)"
          aria-label="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={onResetZoom}
          className={`px-2 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-semibold transition-all min-w-[52px] ${
            isDark
              ? 'hover:bg-zinc-800 text-zinc-200 hover:text-white'
              : 'hover:bg-zinc-100 text-zinc-800 hover:text-zinc-900'
          }`}
          title="Reset Zoom (100% / Ctrl+0)"
          aria-label="Reset Zoom percentage"
        >
          {Math.round(cameraScale * 100)}%
        </button>

        <button
          onClick={onZoomIn}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Zoom In (Ctrl++)"
          aria-label="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        <div className={`w-[1px] h-4 mx-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

        <button
          onClick={onResetView}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Reset View"
          aria-label="Reset View to Origin"
        >
          <Maximize2 size={14} />
        </button>

        <button
          onClick={onExportPNG}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Export to PNG"
          aria-label="Export canvas as PNG image"
        >
          <Download size={14} />
        </button>

        <button
          onClick={onOpenKeybindings}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${btnHover}`}
          title="Keyboard Shortcuts (?)"
          aria-label="Open keyboard shortcuts dialog"
        >
          <Keyboard size={14} />
        </button>
      </div>
    </motion.div>
  );
};

export default CanvasViewportControls;