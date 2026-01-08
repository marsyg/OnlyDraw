'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Zap, Users, Pencil, Shapes, RotateCcw, MousePointer2, ChevronRight } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface FeaturePanelProps {
  isDark: boolean;
  onToggleDark: () => void;
}

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Pencil,
    title: 'Freehand Drawing',
    desc: 'Sketch naturally with pressure-sensitive strokes using perfect-freehand.',
    color: '#6366f1',
  },
  {
    icon: Shapes,
    title: 'Rough Shapes',
    desc: 'Draw rectangles, ellipses & lines with a hand-crafted sketchy aesthetic.',
    color: '#f59e0b',
  },
  {
    icon: Users,
    title: 'Live Collaboration',
    desc: 'Share a Room ID and draw together in real-time via WebSocket sync.',
    color: '#10b981',
  },
  {
    icon: MousePointer2,
    title: 'Select & Resize',
    desc: 'Pick elements, drag them around, or resize from any corner handle.',
    color: '#3b82f6',
  },
  {
    icon: RotateCcw,
    title: 'Undo / Redo',
    desc: 'Full history powered by Yjs — press Ctrl+Z / Ctrl+Y anytime.',
    color: '#ec4899',
  },
  {
    icon: Zap,
    title: 'Rich Style Options',
    desc: 'Control stroke width, fill patterns, roughness, opacity & shadows.',
    color: '#f97316',
  },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], action: 'Undo' },
  { keys: ['Ctrl', 'Y'], action: 'Redo' },
  { keys: ['Del'], action: 'Delete selected' },
  { keys: ['Esc'], action: 'Cancel / Close' },
];

// ─── Keyboard Badge ───────────────────────────────────────────────────────────
function KBD({ children, isDark }: { children: string; isDark: boolean }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono leading-none"
      style={{
        background: isDark ? '#1e293b' : '#f1f5f9',
        color: isDark ? '#94a3b8' : '#475569',
        border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
        boxShadow: `0 1px 0 ${isDark ? '#0f172a' : '#94a3b8'}`,
      }}
    >
      {children}
    </kbd>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeaturePanel({ isDark, onToggleDark }: FeaturePanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'features' | 'shortcuts'>('features');

  // bg & text derived from dark mode
  const bg = isDark ? '#0f172a' : '#ffffff';
  const surface = isDark ? '#1e293b' : '#f8fafc';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const muted = isDark ? '#64748b' : '#94a3b8';

  return (
    <>
      {/* ── Trigger button ── */}
      <motion.button
        id="feature-panel-toggle"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider select-none"
        style={{
          background: isDark
            ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
            : 'linear-gradient(135deg,#6366f1,#4f46e5)',
          color: '#fff',
          boxShadow: isDark
            ? '0 0 20px rgba(99,102,241,0.45)'
            : '0 4px 14px rgba(99,102,241,0.4)',
        }}
        whileHover={{ scale: 1.06, y: -1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open feature panel"
      >
        <Zap size={14} />
        Features
        <ChevronRight size={12} />
      </motion.button>

      {/* ── Dark mode toggle ── */}
      <motion.button
        id="dark-mode-toggle"
        onClick={onToggleDark}
        className="fixed bottom-4 left-[130px] z-50 flex items-center justify-center rounded-xl select-none"
        style={{
          width: 40,
          height: 36,
          background: isDark ? '#1e293b' : '#f1f5f9',
          border: `1px solid ${border}`,
          color: isDark ? '#fbbf24' : '#6366f1',
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.08)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Toggle dark mode"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Sun size={16} />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Moon size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Slide-over panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              key="panel"
              className="fixed left-0 top-0 bottom-0 z-[70] flex flex-col overflow-hidden"
              style={{
                width: 340,
                background: bg,
                borderRight: `1px solid ${border}`,
                boxShadow: isDark
                  ? '8px 0 32px rgba(0,0,0,0.6)'
                  : '8px 0 32px rgba(0,0,0,0.12)',
              }}
              initial={{ x: -340 }}
              animate={{ x: 0 }}
              exit={{ x: -340 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: `1px solid ${border}` }}
              >
                <div>
                  <h1
                    className="text-lg font-extrabold tracking-tight"
                    style={{ color: text, fontFamily: "'Kalam', cursive" }}
                  >
                    ✏️ Only Draw
                  </h1>
                  <p className="text-[11px] mt-0.5" style={{ color: muted }}>
                    A collaborative sketch canvas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Inline dark toggle in header too */}
                  <motion.button
                    onClick={onToggleDark}
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: 32,
                      height: 32,
                      background: surface,
                      border: `1px solid ${border}`,
                      color: isDark ? '#fbbf24' : '#6366f1',
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Toggle dark mode"
                  >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                  </motion.button>
                  <motion.button
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: 32,
                      height: 32,
                      background: surface,
                      border: `1px solid ${border}`,
                      color: muted,
                    }}
                    whileHover={{ scale: 1.1, color: '#ef4444' }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Close panel"
                  >
                    <X size={14} />
                  </motion.button>
                </div>
              </div>

              {/* Tab bar */}
              <div
                className="flex px-5 pt-3 gap-2 flex-shrink-0"
                style={{ borderBottom: `1px solid ${border}`, paddingBottom: 0 }}
              >
                {(['features', 'shortcuts'] as const).map((t) => (
                  <button
                    key={t}
                    id={`tab-${t}`}
                    onClick={() => setTab(t)}
                    className="pb-2 px-1 text-xs font-bold uppercase tracking-wide transition-colors relative"
                    style={{
                      color: tab === t ? '#6366f1' : muted,
                      borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
                <AnimatePresence mode="wait">
                  {tab === 'features' ? (
                    <motion.div
                      key="features"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      {/* Banner */}
                      <div
                        className="rounded-xl p-4 mb-2"
                        style={{
                          background: isDark
                            ? 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))'
                            : 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.07))',
                          border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                        }}
                      >
                        <p className="text-xs leading-relaxed" style={{ color: isDark ? '#a5b4fc' : '#4338ca' }}>
                          Draw freely, collaborate live, and express yourself with a rich set of tools — all in your browser.
                        </p>
                      </div>

                      {/* Feature cards */}
                      {FEATURES.map((f, i) => (
                        <motion.div
                          key={f.title}
                          className="flex items-start gap-3 rounded-xl p-3"
                          style={{
                            background: surface,
                            border: `1px solid ${border}`,
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={{
                            scale: 1.01,
                            borderColor: f.color + '60',
                          }}
                        >
                          <div
                            className="flex-shrink-0 flex items-center justify-center rounded-lg"
                            style={{
                              width: 34,
                              height: 34,
                              background: f.color + (isDark ? '25' : '15'),
                              border: `1px solid ${f.color}40`,
                            }}
                          >
                            <f.icon size={16} color={f.color} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold mb-0.5" style={{ color: text }}>
                              {f.title}
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: muted }}>
                              {f.desc}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="shortcuts"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2"
                    >
                      <p className="text-[11px] mb-3" style={{ color: muted }}>
                        Master these shortcuts to draw faster.
                      </p>
                      {SHORTCUTS.map((s) => (
                        <div
                          key={s.action}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ background: surface, border: `1px solid ${border}` }}
                        >
                          <span className="text-xs font-medium" style={{ color: text }}>
                            {s.action}
                          </span>
                          <div className="flex items-center gap-1">
                            {s.keys.map((k, i) => (
                              <React.Fragment key={k}>
                                {i > 0 && (
                                  <span className="text-[10px]" style={{ color: muted }}>
                                    +
                                  </span>
                                )}
                                <KBD isDark={isDark}>{k}</KBD>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Tips section */}
                      <div
                        className="rounded-xl p-4 mt-4"
                        style={{
                          background: isDark
                            ? 'rgba(16,185,129,0.08)'
                            : 'rgba(16,185,129,0.06)',
                          border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.2)'}`,
                        }}
                      >
                        <p className="text-[11px] font-bold mb-2" style={{ color: '#10b981' }}>
                          💡 Pro Tips
                        </p>
                        <ul className="space-y-1.5">
                          {[
                            'Click a shape to select it, then drag any corner to resize',
                            'Hover over an element before clicking to see resize handles',
                            'Enter a Room ID and share it to draw with others in real-time',
                          ].map((tip) => (
                            <li
                              key={tip}
                              className="text-[10px] leading-relaxed flex items-start gap-1.5"
                              style={{ color: isDark ? '#6ee7b7' : '#065f46' }}
                            >
                              <span className="mt-px opacity-60">▸</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3 flex items-center justify-between flex-shrink-0"
                style={{ borderTop: `1px solid ${border}` }}
              >
                <span className="text-[10px]" style={{ color: muted }}>
                  Built with Next.js · Yjs · RoughJS
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                    color: '#6366f1',
                  }}
                >
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
