'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KEYBINDINGS } from '@/lib/keybindings';
import { X, Keyboard, Search } from 'lucide-react';

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
  const [search, setSearch] = useState('');

  const categories = ['Tools', 'Edit', 'View'] as const;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return KEYBINDINGS.filter(
      (kb) =>
        kb.description.toLowerCase().includes(q) ||
        kb.displayKeys.some((k) => k.toLowerCase().includes(q)) ||
        kb.category.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl border ${
            isDark
              ? 'bg-zinc-900/98 border-zinc-800 text-zinc-100 shadow-black/70'
              : 'bg-white/98 border-zinc-200 text-zinc-800 shadow-zinc-300/50'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-100 bg-zinc-50/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
                }`}
              >
                <Keyboard size={18} />
              </div>
              <div>
                <h3 className={`font-bold text-base ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Keyboard Shortcuts
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Quick shortcuts for high-speed drafting and navigation
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar */}
          <div className={`px-6 py-3 border-b ${isDark ? 'border-zinc-800/80 bg-zinc-950/20' : 'border-zinc-100 bg-zinc-50/40'}`}>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shortcuts (e.g. pan, rectangle, zoom)..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs outline-none border transition-all ${
                  isDark
                    ? 'bg-zinc-950/60 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600'
                    : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400'
                }`}
                autoFocus
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6" style={{ scrollbarWidth: 'none' }}>
            {filteredItems ? (
              filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                        isDark
                          ? 'bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                          : 'bg-zinc-50/80 hover:bg-zinc-100/90 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.displayKeys.map((k, i) => (
                          <kbd
                            key={i}
                            className={`px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded shadow-sm border ${
                              isDark
                                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                                : 'bg-white text-zinc-800 border-zinc-300'
                            }`}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-zinc-400">
                  No keyboard shortcut matching &quot;{search}&quot;
                </div>
              )
            ) : (
              categories.map((cat) => {
                const items = KEYBINDINGS.filter((kb) => kb.category === cat);
                return (
                  <div key={cat} className="space-y-2.5">
                    <h4
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {cat}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                            isDark
                              ? 'bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                              : 'bg-zinc-50/80 hover:bg-zinc-100/90 border-zinc-200 text-zinc-700'
                          }`}
                        >
                          <span className="text-xs font-medium">{item.description}</span>
                          <div className="flex items-center gap-1">
                            {item.displayKeys.map((k, i) => (
                              <kbd
                                key={i}
                                className={`px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded shadow-sm border ${
                                  isDark
                                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                                    : 'bg-white text-zinc-800 border-zinc-300'
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
              })
            )}
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-3 border-t text-xs flex items-center justify-between ${
              isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-zinc-50/80 border-zinc-100 text-zinc-500'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Press</span>
              <kbd
                className={`px-1.5 py-0.5 font-mono text-[10px] rounded border ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    : 'bg-white border-zinc-300 text-zinc-700'
                }`}
              >
                Esc
              </kbd>
              <span>to dismiss</span>
            </div>
            <span className="font-semibold text-zinc-400">OnlyDraw</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
