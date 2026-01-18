'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KEYBINDINGS } from '@/lib/keybindings';
import { X, Keyboard } from 'lucide-react';

interface KeybindingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeybindingsDialog({
  isOpen,
  onClose,
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
          className="relative w-full max-w-2xl bg-neutral-900/95 border border-neutral-700 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300">
                <Keyboard size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-neutral-100">Keyboard Shortcuts</h3>
                <p className="text-xs text-neutral-400">Boost your workflow with quick navigation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800/80 pb-1">
                    {cat}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 bg-neutral-800/50 hover:bg-neutral-800/90 rounded-lg border border-neutral-800 transition-colors text-sm"
                      >
                        <span className="text-neutral-300 text-xs sm:text-sm font-medium">
                          {item.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.displayKeys.map((k, i) => (
                            <kbd
                              key={i}
                              className="px-2 py-0.5 text-xs font-mono font-semibold bg-neutral-700/80 text-neutral-200 border border-neutral-600/70 rounded shadow-sm"
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
          <div className="px-6 py-3 bg-neutral-950/60 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
            <span>Press <kbd className="px-1.5 py-0.5 font-mono bg-neutral-800 rounded border border-neutral-700 text-neutral-300">Esc</kbd> to close</span>
            <span>OnlyDraw Canvas</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
