'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Intent } from '@/agent/domain/intent';
import type { DiagramTheme, Plan } from '@/agent/domain/plan';
import type { ProposedChange } from '@/agent/domain/proposed-change';
import { commit, placeInFreeSpace, undoRun, getDraftZoneBoundingBox } from '@/agent/canvas/onlydraw-adapter';
import { DIAGRAM_THEMES } from '@/agent/pipeline/theme';
import canvasDoc from '@/Store/yjs-store';
import { useAppStore } from '@/Store/store';
import { useWebSpeech } from '@/hooks/useWebSpeech';

type AgentStatus = 'completed' | 'needs_input' | 'refused';
type Phase = 'idle' | 'working' | 'done' | 'error';

type AgentResponse = {
  status: AgentStatus;
  intent: Intent;
  plan: Plan | null;
  change: ProposedChange | null;
  summary: string;
  timings: Record<string, number>;
  totalMs: number;
};

export interface PromptInputProps {
  isDark?: boolean;
  onClose?: () => void;
}

type StageState = 'done' | 'active' | 'skipped' | 'pending';

function stageDotClass(state: StageState): string {
  if (state === 'done') return 'bg-emerald-500';
  if (state === 'active') return 'bg-blue-500 animate-pulse';
  if (state === 'skipped') return 'bg-zinc-400';
  return 'bg-zinc-300 dark:bg-zinc-700';
}

function stageLabelClass(state: StageState, isDark?: boolean): string {
  if (state === 'done') return isDark ? 'text-emerald-400' : 'text-emerald-600';
  if (state === 'active') return isDark ? 'text-blue-400' : 'text-blue-600';
  if (state === 'skipped') return isDark ? 'text-zinc-500' : 'text-zinc-400';
  return isDark ? 'text-zinc-400' : 'text-zinc-500';
}

function intentBadgeClass(intent: Intent): string {
  if (intent.kind === 'act') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  if (intent.kind === 'ask') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20';
  if (intent.kind === 'chat') return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20';
}

export default function PromptInput({ isDark }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [drawnCount, setDrawnCount] = useState(0);

  const {
    isListening,
    isTranscribing,
    isSpeaking,
    transcript: liveTranscript,
    error: speechError,
    activeService,
    synthesisSupported,
    toggleListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useWebSpeech({
    onTranscriptChange: (text, isFinal) => {
      console.log('[PromptInput] onTranscriptChange:', { text, isFinal });
      setPrompt(text);
    },
  });

  // Keep liveTranscript synced to prompt
  useEffect(() => {
    if (liveTranscript) {
      setPrompt(liveTranscript);
    }
  }, [liveTranscript]);

  const isAgentWorkingInStore = useAppStore((s) => s.agentState.isWorking);

  useEffect(() => {
    if (!isAgentWorkingInStore && phase === 'working') {
      setPhase('idle');
    }
  }, [isAgentWorkingInStore, phase]);

  useEffect(() => {
    if (phase !== 'working') return;
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - started) / 100) / 10);
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  const sendPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || phase === 'working') return;

      stopListening();
      stopSpeaking();

      setLastPrompt(trimmed);
      setPhase('working');
      setResult(null);
      setError(null);
      setElapsed(0);
      setDrawnCount(0);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const store = useAppStore.getState();
      const draftZone = getDraftZoneBoundingBox({ camera: store.camera });

      store.setAgentState({
        isWorking: true,
        prompt: trimmed,
        startedAt: Date.now(),
        stage: 'intent',
        targetBbox: draftZone,
        abortController: controller,
      });

      const t1 = setTimeout(() => {
        store.setAgentState({ stage: 'planning' });
      }, 1200);
      const t2 = setTimeout(() => {
        store.setAgentState({ stage: 'compiling' });
      }, 2800);
      const t3 = setTimeout(() => {
        store.setAgentState({ stage: 'rendering' });
      }, 5200);

      try {
        const selectionIds = store.selectedElementIds;
        const elements: { id: string; type: string; label?: string }[] = [];
        canvasDoc.yElement.forEach((el, id) => {
          if (!el.get('isDeleted')) {
            elements.push({
              id,
              type: String(el.get('type') || ''),
              label: String(el.get('text') || ''),
            });
          }
        });

        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            selectionIds,
            elements,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `HTTP ${response.status}`);
        }

        const data = (await response.json()) as AgentResponse;

        if (data.status === 'completed' && data.change && data.change.ops.length > 0) {
          const placed = placeInFreeSpace(data.change, { camera: store.camera });
          const styles = store;
          const { committedIds } = await commit(
            canvasDoc.activeWorkspaceId,
            placed,
            {
              agent: true,
              runId: placed.runId,
              invokedBy: 'model',
            },
            {
              strokeColor: styles.strokeColor,
              strokeWidth: styles.strokeWidth,
              roughness: styles.roughness,
              fillColor: styles.fillColor,
              isFillTransparent: styles.isFillTransparent,
              fillStyle: styles.fillStyle,
              fillWeight: styles.fillWeight,
              boundaryStyle: styles.boundaryStyle,
              opacity: styles.opacity,
              hasShadow: styles.hasShadow,
              fontSize: styles.fontSize,
              fontFamily: styles.fontFamily,
              arrowRouting: styles.arrowRouting,
            },
          );
          setDrawnCount(placed.ops.length);

          if (committedIds && committedIds.length > 0) {
            store.setSelectedElementIds(committedIds);
          }
          if (placed.bbox.w > 0 && placed.bbox.h > 0) {
            store.fitToBounds(placed.bbox);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('canvas:agent-highlight', {
                  detail: {
                    x: placed.bbox.x,
                    y: placed.bbox.y,
                    w: placed.bbox.w,
                    h: placed.bbox.h,
                  },
                })
              );
            }
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('canvas:redraw'));
          }
        }

        setResult(data);
        setPhase('done');
        setPrompt('');
      } catch (err) {
        const message =
          err instanceof Error
            ? err.name === 'AbortError'
              ? 'Request timed out after 120s'
              : err.message
            : 'Unknown error';
        setError(message);
        setPhase('error');
      } finally {
        clearTimeout(timeout);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        store.setAgentState({
          isWorking: false,
          targetBbox: null,
          abortController: null,
        });
      }
    },
    [phase, stopListening, stopSpeaking],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendPrompt(prompt);
      }
    },
    [prompt, sendPrompt],
  );

  const handleClear = useCallback(() => {
    setPrompt('');
    setPhase('idle');
    setResult(null);
    setError(null);
    setElapsed(0);
    setDrawnCount(0);
  }, []);

  const handleUndoRun = useCallback(async () => {
    if (!result?.change?.runId) return;
    await undoRun(canvasDoc.activeWorkspaceId, result.change.runId);
    setDrawnCount(0);
    useAppStore.getState().setSelectedElementIds([]);
    window.dispatchEvent(new CustomEvent('canvas:redraw'));
  }, [result]);

  const handleApplyTheme = useCallback(
    async (newTheme: DiagramTheme) => {
      if (!result?.change) return;
      const targetIds = result.change.ops
        .filter((o): o is Extract<typeof o, { id: string }> => 'id' in o)
        .map((o) => o.id);

      await commit(
        canvasDoc.activeWorkspaceId,
        {
          runId: result.change.runId,
          ops: [{ op: 'apply_theme', theme: newTheme, targetIds }],
          bbox: result.change.bbox,
          summary: `Changed theme to ${newTheme}`,
          theme: newTheme,
        },
        { agent: true, runId: result.change.runId, invokedBy: 'human' },
      );
      setResult((prev) =>
        prev && prev.change
          ? { ...prev, change: { ...prev.change, theme: newTheme } }
          : prev,
      );
      window.dispatchEvent(new CustomEvent('canvas:redraw'));
    },
    [result],
  );

  const busy = phase === 'working';

  const intentStage: StageState = result ? 'done' : busy ? 'active' : 'pending';
  const planStage: StageState = result
    ? result.plan
      ? 'done'
      : 'skipped'
    : 'pending';
  const compileStage: StageState = result
    ? result.change
      ? 'done'
      : 'skipped'
    : 'pending';

  const statusPill = (() => {
    if (phase === 'working')
      return {
        text: `Thinking ${elapsed.toFixed(1)}s`,
        cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      };
    if (phase === 'error')
      return {
        text: 'Failed',
        cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      };
    if (phase === 'done' && result) {
      if (result.status === 'completed')
        return {
          text: 'Completed',
          cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        };
      if (result.status === 'needs_input')
        return {
          text: 'Needs input',
          cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        };
      return {
        text: 'Refused',
        cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      };
    }
    return {
      text: 'Ready',
      cls: isDark
        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
        : 'bg-zinc-100 text-zinc-500 border border-zinc-200',
    };
  })();

  return (
    <div className="space-y-2 select-none">
      {/* ── Main Input Box ── */}
      <div
        className={`rounded-2xl p-3 sm:p-4 shadow-lg border backdrop-blur-md transition-all ${
          isDark
            ? 'bg-zinc-900/98 border-zinc-800 shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-zinc-100'
            : 'bg-white/98 border-zinc-200/90 shadow-[0_6px_20px_rgba(0,0,0,0.06)] text-zinc-900'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-[11px] shadow-sm">
              <Sparkles size={13} />
            </div>
            <span className="text-xs font-semibold tracking-wide">
              AI Canvas Agent
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium flex items-center gap-1.5 ${statusPill.cls}`}
            >
              {phase === 'working' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
              {statusPill.text}
            </span>
          </div>
        </div>

        {/* Text Input Row */}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? 'Listening... speak your diagram request...'
                  : 'Describe what to create (e.g., "auth flow with OAuth & JWT")...'
              }
              className={`w-full resize-none rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none border transition-all ${
                isDark
                  ? 'bg-zinc-950 text-zinc-100 border-zinc-800 placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                  : 'bg-zinc-50 text-zinc-900 border-zinc-200 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400'
              } ${
                isListening
                  ? 'ring-2 ring-rose-500/70 border-rose-500 bg-rose-500/5 dark:bg-rose-950/20'
                  : ''
              }`}
              rows={2}
              disabled={busy}
              aria-label="Agent prompt input"
            />

            {/* Listening Indicator */}
            {isListening && (
              <div className="absolute top-2.5 right-3 flex items-center gap-1.5 pointer-events-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-[10px] font-semibold tracking-wide uppercase text-rose-500">
                  {activeService === 'assemblyai' ? 'AssemblyAI Live' : 'Listening'}
                </span>
              </div>
            )}

            {/* Transcribing Indicator */}
            {isTranscribing && (
              <div className="absolute top-2.5 right-3 flex items-center gap-1.5 pointer-events-none">
                <div className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-semibold tracking-wide uppercase text-zinc-400">
                  Transcribing...
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0 self-end">
            {/* Dictation Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={busy || isTranscribing}
              className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl transition-all border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : isTranscribing
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-zinc-700'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 border-zinc-200'
              }`}
              title={
                isListening
                  ? 'Stop dictation'
                  : 'Dictate prompt with voice'
              }
              aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 animate-pulse" />
              ) : isTranscribing ? (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send Button */}
            <button
              onClick={() => void sendPrompt(prompt)}
              disabled={!prompt.trim() || busy}
              className="h-9 sm:h-10 px-3.5 sm:px-4 flex items-center justify-center gap-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Speech Error Banner */}
        {speechError && (
          <div className="mt-2.5 px-3 py-1.5 rounded-lg text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{speechError}</span>
          </div>
        )}
      </div>

      {/* ── Status & Results Panel ── */}
      {phase !== 'idle' && (
        <div
          className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm border shadow-lg backdrop-blur-md ${
            isDark
              ? 'bg-zinc-900/98 border-zinc-800 text-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.5)]'
              : 'bg-white/98 border-zinc-200 text-zinc-800 shadow-[0_6px_20px_rgba(0,0,0,0.06)]'
          }`}
          aria-live="polite"
        >
          {phase === 'working' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Generating diagram: classifying intent → planning layout → committing elements</span>
              </div>
              <span className="font-mono text-xs text-zinc-400">{elapsed.toFixed(1)}s</span>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-rose-500">Agent request failed</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{error}</p>
              </div>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="space-y-3">
              {/* Intent & Timing row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${intentBadgeClass(result.intent)}`}>
                    {result.intent.kind}
                  </span>
                  {result.change?.theme && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {result.change.theme} theme
                    </span>
                  )}
                </div>

                <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  {result.plan?.kind === 'flow' ? `${result.plan.nodes.length} nodes · ${result.plan.edges.length} edges · ` : ''}
                  {result.totalMs}ms
                </span>
              </div>

              {/* Stepper Pipeline */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageDotClass(intentStage)}`} />
                  <span className={`text-[11px] font-medium truncate ${stageLabelClass(intentStage, isDark)}`}>
                    Intent
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-400">
                    {result.timings.intentMs ?? 0}ms
                  </span>
                </div>

                <div className="flex items-center gap-1.5 min-w-0 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageDotClass(planStage)}`} />
                  <span className={`text-[11px] font-medium truncate ${stageLabelClass(planStage, isDark)}`}>
                    Plan
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-400">
                    {planStage === 'done' ? `${result.timings.planMs ?? 0}ms` : 'skip'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 min-w-0 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageDotClass(compileStage)}`} />
                  <span className={`text-[11px] font-medium truncate ${stageLabelClass(compileStage, isDark)}`}>
                    Compile
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-400">
                    {compileStage === 'done' ? `${result.change?.ops.length ?? 0} ops` : 'skip'}
                  </span>
                </div>
              </div>

              {/* Summary message */}
              <div className={`rounded-xl p-3 text-xs sm:text-sm flex items-start justify-between gap-2 border ${
                isDark ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
              }`}>
                <div className="flex-1 space-y-2">
                  <p className="leading-relaxed">{result.summary}</p>

                  {/* Clarification options if agent asks questions */}
                  {result.intent.kind === 'ask' && result.intent.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {result.intent.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setPrompt(option);
                            void sendPrompt(option);
                          }}
                          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {synthesisSupported && (
                  <button
                    type="button"
                    onClick={() => (isSpeaking ? stopSpeaking() : speak(result.summary))}
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-colors border ${
                      isSpeaking
                        ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                        : isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 border-zinc-700'
                          : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 border-zinc-300'
                    }`}
                    title={isSpeaking ? 'Stop voice readout' : 'Read aloud with Web Speech Synthesis'}
                    aria-label={isSpeaking ? 'Stop voice readout' : 'Read aloud with Web Speech Synthesis'}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Success Badge */}
              {drawnCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span>Drawn to canvas ({drawnCount} elements)</span>
                </div>
              )}

              {/* Post-execution actions (Undo, Retry, Theme) */}
              {result.change && drawnCount > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Run Actions:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUndoRun}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Revert all elements created in this run"
                      >
                        <RotateCcw size={12} />
                        <span>Undo Run</span>
                      </button>
                      {lastPrompt && (
                        <button
                          onClick={() => void sendPrompt(lastPrompt)}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Re-run prompt"
                        >
                          <RefreshCw size={12} />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Theme Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Theme:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAGRAM_THEMES.map((theme) => {
                        const isCurrent = result.change?.theme === theme;
                        return (
                          <button
                            key={theme}
                            onClick={() => void handleApplyTheme(theme)}
                            className={`rounded-lg px-2.5 py-0.5 text-xs capitalize transition-all border ${
                              isCurrent
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold border-transparent shadow-sm'
                                : isDark
                                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200'
                            }`}
                          >
                            {theme}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Dismiss Button */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleClear}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
