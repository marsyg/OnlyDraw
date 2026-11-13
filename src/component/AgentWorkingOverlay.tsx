'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/Store/store';
import {
  Sparkles,
  X,
  Focus,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  PenTool,
} from 'lucide-react';

interface AgentWorkingOverlayProps {
  isDark?: boolean;
}

const STAGES = [
  { id: 'intent', label: 'Intent & Context', icon: Cpu },
  { id: 'planning', label: 'Topology & Layout', icon: Layers },
  { id: 'compiling', label: 'Sketching Vectors', icon: PenTool },
  { id: 'rendering', label: 'Canvas Sync', icon: CheckCircle2 },
] as const;

export default function AgentWorkingOverlay({ isDark = false }: AgentWorkingOverlayProps) {
  const { agentState, cancelAgent, fitToBounds } = useAppStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!agentState.isWorking) {
      setElapsed(0);
      return;
    }
    const start = agentState.startedAt || Date.now();
    const interval = setInterval(() => {
      setElapsed(+((Date.now() - start) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(interval);
  }, [agentState.isWorking, agentState.startedAt]);

  const handleFocusZone = () => {
    if (agentState.targetBbox) {
      fitToBounds(agentState.targetBbox, 0.65);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas:redraw'));
      }
    }
  };

  const currentStageIndex = STAGES.findIndex((s) => s.id === agentState.stage);

  return (
    <AnimatePresence>
      {agentState.isWorking && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] w-[94vw] max-w-lg select-none"
        >
          <div
            className={`relative rounded-2xl p-4 border shadow-2xl backdrop-blur-2xl overflow-hidden transition-colors ${
              isDark
                ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
                : 'bg-white/95 border-zinc-200/90 text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
            }`}
          >
            {/* Top iridescent animated gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-[pulse_2s_ease-in-out_infinite]" />
            </div>

            {/* Header: Status, Timer, and Controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Animated Gyroscope Ring */}
                <div className="relative w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-blue-600 dark:text-blue-400 animate-spin [animation-duration:6s]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold tracking-tight">OnlyDraw Agent Drafting</h3>
                    <div className="flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      <Clock size={10} className="text-zinc-400" />
                      <span>{elapsed.toFixed(1)}s</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Synthesizing hand-crafted diagram on canvas
                  </p>
                </div>
              </div>

              {/* Action Buttons: Focus Drafting Zone & Cancel */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {agentState.targetBbox && (
                  <button
                    onClick={handleFocusZone}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Focus view on drafting zone"
                    aria-label="Focus view on drafting zone"
                  >
                    <Focus size={14} />
                    <span className="hidden sm:inline text-[11px]">Focus Zone</span>
                  </button>
                )}

                <button
                  onClick={cancelAgent}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Cancel drafting (Esc)"
                  aria-label="Cancel agent drafting"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Prompt Excerpt */}
            {agentState.prompt && (
              <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-300 italic truncate flex items-center gap-1.5">
                <span className="text-blue-500 font-semibold not-italic text-[10px] uppercase tracking-wide">
                  Prompt
                </span>
                <span className="truncate">&ldquo;{agentState.prompt}&rdquo;</span>
              </div>
            )}

            {/* 4-Step Pipeline Stepper */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
              {STAGES.map((s, idx) => {
                const isPassed = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx || (currentStageIndex === -1 && idx === 0);
                const Icon = s.icon;

                return (
                  <div
                    key={s.id}
                    className={`flex flex-col items-center gap-1 text-center py-1.5 px-1 rounded-lg transition-all ${
                      isCurrent
                        ? 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold'
                        : isPassed
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-zinc-400 dark:text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Icon size={12} className={isCurrent ? 'animate-pulse' : ''} />
                    </div>
                    <span className="text-[10px] leading-tight line-clamp-1">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

