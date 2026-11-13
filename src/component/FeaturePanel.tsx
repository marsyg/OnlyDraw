'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Moon,
  Sun,
  Zap,
  Users,
  Pencil,
  Shapes,
  RotateCcw,
  MousePointer2,
  ChevronRight,
  Move,
  Database,
  Download,
  Layers,
  Tag,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FeaturePanelProps {
  isDark: boolean;
  onToggleDark: () => void;
}

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Move,
    title: 'Infinite Canvas',
    desc: 'Pan and zoom smoothly across an unlimited canvas with Space+drag or mouse wheel.',
  },
  {
    icon: Database,
    title: 'Local Persistence (IndexedDB)',
    desc: 'Your sketches are automatically saved locally in your browser and restored on refresh.',
  },
  {
    icon: Pencil,
    title: 'Freehand Drawing',
    desc: 'Sketch naturally with pressure-sensitive strokes using perfect-freehand.',
  },
  {
    icon: Shapes,
    title: 'Rough Shapes',
    desc: 'Draw rectangles, ellipses & lines with a hand-crafted sketchy aesthetic.',
  },
  {
    icon: Users,
    title: 'Live Collaboration',
    desc: 'Share a Room ID and draw together in real-time via WebSocket sync.',
  },
  {
    icon: MousePointer2,
    title: 'Select & Resize',
    desc: 'Pick elements, drag them around, or resize from any corner handle.',
  },
  {
    icon: RotateCcw,
    title: 'Undo / Redo',
    desc: 'Full history powered by Yjs — press Ctrl+Z / Ctrl+Y anytime.',
  },
  {
    icon: Zap,
    title: 'Rich Style Options',
    desc: 'Control stroke width, fill patterns, roughness, opacity & drop shadows.',
  },
  {
    icon: Download,
    title: 'PNG Export',
    desc: 'Export your artwork as a crisp, cropped PNG image with one click.',
  },
  {
    icon: Tag,
    title: 'Arrow Labels',
    desc: 'Label any straight, curved or angled arrow with perfectly centered, auto-masking text pills.',
  },
  {
    icon: Layers,
    title: 'Multiple Workspaces',
    desc: 'Create, duplicate, rename and switch between separate workspaces saved locally in IndexedDB.',
  },
];

const SHORTCUTS = [
  { keys: ['Space', 'Drag'], action: 'Pan infinite canvas' },
  { keys: ['Ctrl', 'Scroll'], action: 'Zoom in / out' },
  { keys: ['Ctrl', '0'], action: 'Reset view (100%)' },
  { keys: ['Middle-Click'], action: 'Drag to pan' },
  { keys: ['Ctrl', 'Z'], action: 'Undo' },
  { keys: ['Ctrl', 'Y'], action: 'Redo' },
  { keys: ['Del'], action: 'Delete selected' },
  { keys: ['Double-Click', 'Arrow'], action: 'Label arrow' },
  { keys: ['Esc'], action: 'Cancel / Close' },
];

// ─── Keyboard Badge ───────────────────────────────────────────────────────────
function KBD({ children, isDark }: { children: string; isDark: boolean }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono leading-none border shadow-sm ${
        isDark
          ? 'bg-zinc-800 text-zinc-300 border-zinc-700 shadow-black/40'
          : 'bg-zinc-100 text-zinc-700 border-zinc-300/80 shadow-zinc-200/50'
      }`}
    >
      {children}
    </kbd>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeaturePanel({ isDark, onToggleDark }: FeaturePanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'features' | 'shortcuts'>('features');

  return (
    <>
      {/* ── Floating Unified Dock (Bottom Left) ── */}
      <motion.div
        className="fixed bottom-4 left-4 z-50 flex items-center gap-1 p-1 rounded-xl backdrop-blur-md shadow-lg border select-none transition-colors"
        style={{
          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Features Trigger Button */}
        <button
          id="feature-panel-toggle"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            isDark
              ? 'text-zinc-200 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          aria-label="Open features and guide panel"
        >
          <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
            <Sparkles size={13} className="text-blue-500" />
          </div>
          <span>Features</span>
          <ChevronRight size={13} className="text-zinc-400 opacity-70" />
        </button>

        {/* Divider */}
        <div className={`w-[1px] h-4 mx-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

        {/* Dark Mode Toggle */}
        <button
          id="dark-mode-toggle"
          onClick={onToggleDark}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDark
              ? 'text-amber-400 hover:text-amber-300 hover:bg-zinc-800'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <Sun size={15} />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <Moon size={15} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </motion.div>

      {/* ── Slide-over Drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              key="panel"
              className={`fixed left-0 top-0 bottom-0 z-[70] flex flex-col w-[360px] max-w-[90vw] overflow-hidden border-r shadow-2xl backdrop-blur-xl ${
                isDark
                  ? 'bg-zinc-900/98 border-zinc-800 text-zinc-100 shadow-black/60'
                  : 'bg-white/98 border-zinc-200 text-zinc-900 shadow-zinc-300/40'
              }`}
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-zinc-200/80 dark:border-zinc-700/80">
                    <Pencil size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight">OnlyDraw</h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Collaborative sketch canvas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Close panel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="flex px-5 pt-2 border-b border-zinc-200/80 dark:border-zinc-800/80 flex-shrink-0 gap-6">
                {(['features', 'shortcuts'] as const).map((t) => {
                  const isActive = tab === t;
                  return (
                    <button
                      key={t}
                      id={`tab-${t}`}
                      onClick={() => setTab(t)}
                      className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      {t}
                      {isActive && (
                        <motion.div
                          layoutId="tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
                <AnimatePresence mode="wait">
                  {tab === 'features' ? (
                    <motion.div
                      key="features"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.16 }}
                      className="space-y-2.5"
                    >
                      {/* Sub-banner */}
                      <div
                        className={`rounded-xl p-3 text-xs leading-relaxed border ${
                          isDark
                            ? 'bg-zinc-800/60 border-zinc-700/80 text-zinc-300'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        Sketch freely, collaborate with live cursors, and build diagrams assisted by the AI agent.
                      </div>

                      {/* Feature cards */}
                      {FEATURES.map((f, i) => (
                        <motion.div
                          key={f.title}
                          className={`flex items-start gap-3 rounded-xl p-3 border transition-colors ${
                            isDark
                              ? 'bg-zinc-800/30 hover:bg-zinc-800/60 border-zinc-800/80 text-zinc-200'
                              : 'bg-zinc-50/80 hover:bg-zinc-100/90 border-zinc-200/80 text-zinc-800'
                          }`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80">
                            <f.icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold mb-0.5">{f.title}</h3>
                            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {f.desc}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="shortcuts"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.16 }}
                      className="space-y-2"
                    >
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                        Essential canvas shortcuts for rapid navigation and drafting:
                      </p>

                      {SHORTCUTS.map((s) => (
                        <div
                          key={s.action}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                            isDark
                              ? 'bg-zinc-800/30 border-zinc-800/80 text-zinc-200'
                              : 'bg-zinc-50/80 border-zinc-200/80 text-zinc-800'
                          }`}
                        >
                          <span className="text-xs font-medium">{s.action}</span>
                          <div className="flex items-center gap-1">
                            {s.keys.map((k, i) => (
                              <React.Fragment key={k}>
                                {i > 0 && <span className="text-[10px] text-zinc-400">+</span>}
                                <KBD isDark={isDark}>{k}</KBD>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Tips Section */}
                      <div
                        className={`rounded-xl p-3.5 mt-3 border ${
                          isDark
                            ? 'bg-zinc-800/60 border-zinc-700/80 text-zinc-300'
                            : 'bg-zinc-100/80 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          <Lightbulb size={14} />
                          <span>Pro Tips</span>
                        </div>
                        <ul className="space-y-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                          <li className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>Click any shape to select it, then drag corner handles to scale.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>Double click any arrow to add or edit its centered label.</span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>Ask the AI agent below to build flowcharts, architecture diagrams, or UI wireframes.</span>
                          </li>
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-zinc-200/80 dark:border-zinc-800/80 flex-shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Next.js · Yjs · RoughJS</span>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  v0.1.0
                </span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
