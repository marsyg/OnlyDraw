import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Intent } from '@/agent/domain/intent';
import type { Plan } from '@/agent/domain/plan';
import type { ProposedChange } from '@/agent/domain/proposed-change';
import { intentAgentAsync } from '@/agent/inngest/agents/intent';
import { plannerAgentAsync } from '@/agent/inngest/agents/planner';
import { compilePlan } from '@/agent/pipeline/compile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AgentStatus = 'completed' | 'needs_input' | 'refused';

export async function POST(request: Request) {
  const started = Date.now();

  let body: {
    text?: string;
    canEdit?: boolean;
    elements?: unknown[];
    selectionIds?: string[];
  } | null = null;
  try {
    body = (await request.json()) as {
      text?: string;
      canEdit?: boolean;
      elements?: unknown[];
      selectionIds?: string[];
    };
  } catch {
    body = null;
  }

  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const selectionIds = Array.isArray(body?.selectionIds) ? body.selectionIds : [];
  const rawElements = Array.isArray(body?.elements) ? body.elements : [];

  const selectionSet = new Set(selectionIds);
  const elements = rawElements.map((el) => {
    const obj = (typeof el === 'object' && el !== null ? el : {}) as Record<string, unknown>;
    return {
      id: String(obj.id || ''),
      type: typeof obj.type === 'string' ? obj.type : undefined,
      label: typeof obj.label === 'string' ? obj.label : undefined,
      role: typeof obj.role === 'string' ? obj.role : undefined,
      locked: Boolean(obj.locked),
    };
  });

  const selection = elements
    .filter((el) => selectionSet.has(el.id))
    .map((el) => ({
      id: el.id,
      type: el.type,
      label: el.label,
      locked: el.locked,
    }));

  const timings: Record<string, number> = {};

  const intentStarted = Date.now();
  const classifyResult = await intentAgentAsync(text, {
    selectionIds,
    canEdit: body?.canEdit !== false,
    selection,
  });
  const intent = classifyResult.intent;
  timings.intentMs = Date.now() - intentStarted;

  let plan: Plan | null = null;
  let change: ProposedChange | null = null;
  let summary = '';
  let status: AgentStatus = 'completed';

  if (intent.kind === 'act') {
    const planStarted = Date.now();
    plan = await plannerAgentAsync(
      { ...intent, rawCommand: intent.rawCommand || text },
      { elements, roomId: 'ui' },
    );
    timings.planMs = Date.now() - planStarted;

    if (plan && plan.kind === 'flow') {
      const compileStarted = Date.now();
      change = await compilePlan(plan, randomUUID());
      timings.compileMs = Date.now() - compileStarted;
      summary = `Created "${intent.subject}": ${plan.nodes.length} nodes, ${plan.edges.length} connections`;
    } else {
      status = 'refused';
      summary = `Could not produce a flow diagram for "${intent.subject}". Try describing the steps (e.g. A -> B -> C) or clarifying the workflow.`;
    }
  } else if (intent.kind === 'ask') {
    status = 'needs_input';
    summary = intent.question;
  } else if (intent.kind === 'chat') {
    status = 'completed';
    summary = intent.reply;
  } else {
    status = 'refused';
    summary = intent.reason;
  }

  return NextResponse.json({
    status,
    intent,
    plan,
    change,
    summary,
    timings,
    source: classifyResult.source,
    attempts: classifyResult.attempts,
    issues: classifyResult.issues,
    totalMs: Date.now() - started,
  });
}
