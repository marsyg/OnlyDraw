import { llmJson } from '@/agent/llm/openrouter';
import {
  classifyIntent,
  prePolicy,
  fallbackIntent,
  type ClassifyDeps,
  type ClassifyResult,
  type IntentContext,
  type LlmFn,
} from './intent-classifier';

export type { IntentContext } from './intent-classifier';

// Adjust the cast if your llmJson signature differs from { ok, data | error }.
const defaultDeps: ClassifyDeps = { llm: llmJson as unknown as LlmFn };

/**
 * Replaces intentAgentAsync. Returns { intent, source, attempts, issues }.
 * Call it inside step.run so a replay does not call the model again.
 */
export function intentAgentAsync(
  text: string,
  context: IntentContext,
  deps: ClassifyDeps = defaultDeps,
): Promise<ClassifyResult> {
  return classifyIntent(text, context, deps);
}

/** Replaces intentAgent. Deterministic only: policy, then the strong-match fallback. */
export function intentAgent(text: string, context: IntentContext): ClassifyResult {
  const pre = prePolicy(text, context);
  if (pre) return { intent: pre, source: 'policy', attempts: 0, issues: [] };
  return { intent: fallbackIntent(text, context), source: 'fallback', attempts: 0, issues: [] };
}
