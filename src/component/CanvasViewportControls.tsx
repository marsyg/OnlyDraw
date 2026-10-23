'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, Download, Keyboard } from 'lucide-react';

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

export const CanvasViewportControls: React.FC<CanvasViewportControlsProps> = ({
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
  return (
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
      <div
        className={`flex items-center backdrop-blur-md rounded-xl p-1 shadow-xl border transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/40'
            : 'bg-white/90 border-slate-200 text-slate-700 shadow-slate-200/50'
        }`}
      >
        <button
          onClick={onZoomOut}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={onResetZoom}
          className={`px-2 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-colors min-w-[50px] ${
            isDark ? 'hover:bg-slate-800 text-slate-200 hover:text-white' : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
          }`}
          title="Reset Zoom (100% / Ctrl+0)"
        >
          {Math.round(cameraScale * 100)}%
        </button>

        <button
          onClick={onZoomIn}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={onResetView}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-l ml-1 pl-1 ${
            isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
          }`}
          title="Reset View"
        >
          <Maximize2 size={14} />
        </button>

        <button
          onClick={onExportPNG}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-l ml-1 pl-1 ${
            isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
          }`}
          title="Export to PNG"
        >
          <Download size={14} />
        </button>

        <button
          onClick={onOpenKeybindings}
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
        onClick={onUndo}
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
        onClick={onRedo}
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
  );
};

export default CanvasViewportControls;
