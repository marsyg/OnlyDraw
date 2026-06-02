'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KEYBINDINGS } from '@/lib/keybindings';
import { X, Keyboard } from 'lucide-react';

interface KeybindingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export default function KeybindingsDialog({
  isOpen,
  onClose,
  isDark = true,
}: KeybindingsDialogProps) {
  if (!isOpen) return null;

  const categories = ['Tools', 'Edit', 'View'] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Keyboard size={18} />
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Keyboard Shortcuts
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Boost your workflow with quick navigation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
            {categories.map((cat) => {
              const items = KEYBINDINGS.filter((kb) => kb.category === cat);
              return (
                <div key={cat} className="space-y-3">
                  <h4
                    className={`text-xs font-semibold uppercase tracking-wider border-b pb-1 ${
                      isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-500 border-slate-200/80'
                    }`}
                  >
                    {cat}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-sm ${
                          isDark
                            ? 'bg-slate-800/50 hover:bg-slate-800/90 border-slate-800 text-slate-300'
                            : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {item.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.displayKeys.map((k, i) => (
                            <kbd
                              key={i}
                              className={`px-2 py-0.5 text-xs font-mono font-semibold rounded shadow-sm border ${
                                isDark
                                  ? 'bg-slate-700/80 text-slate-200 border-slate-600/70'
                                  : 'bg-slate-200 text-slate-800 border-slate-300'
                              }`}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-3 border-t text-xs flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-100 text-slate-500'
            }`}
          >
            <span>
              Press{' '}
              <kbd
                className={`px-1.5 py-0.5 font-mono rounded border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-slate-200 border-slate-300 text-slate-700'
                }`}
              >
                Esc
              </kbd>{' '}
              to close
            </span>
            <span className="font-medium">OnlyDraw Canvas</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
