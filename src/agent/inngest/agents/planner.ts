import type { Plan, FlowPlan } from '@/agent/domain/plan';
import { llmJson } from '@/agent/llm/openrouter';
import { isDiagramTheme } from '@/agent/pipeline/theme';

export type PlannerIntent = {
  kind: 'act';
  diagram: 'flow';
  subject: string;
  /** The original, unmodified command text the user typed. */
  rawCommand?: string;
  targetIds?: string[];
};

export type CanvasElementSummary = {
  id: string;
  type?: string;
  label?: string;
  role?: string;
  locked?: boolean;
};

export type PlannerContext = {
  elements: CanvasElementSummary[];
  roomId: string;
};

/* ---------- Constants ---------- */

const MAX_NODES = 25;
const MAX_CANVAS_ELEMENTS_IN_PROMPT = 30;
const MAX_LABEL_CHARS = 80;
const MAX_PLANNER_ATTEMPTS = 2;

/* ---------- System prompt ---------- */

const SYSTEM_PROMPT = [
  'You are a flow diagram planner for OnlyDraw, a collaborative canvas agent.',
  'Respond with JSON only: {"theme":"clean"|"sketch"|"vibrant"|"monochrome","direction":"RIGHT"|"DOWN","nodes":[...],"edges":[...]}.',
  'Node: {"id":string,"label":string,"role":"process"|"decision"|"terminal"}.',
  'Edge: {"from":nodeId,"to":nodeId,"label":string optional}.',
  `Maximum ${MAX_NODES} nodes total.`,
  'Reflect the actual structure the user described — do not simplify, merge, or reduce nodes to fit a template.',
  'If the user describes 8 steps, produce 8 nodes. If they describe branches, produce decision nodes and edges for each branch.',
  '"decision" role = branches/conditions (if/check/validate), "terminal" = start and end nodes, "process" = all other steps.',
  'Every edge must reference existing node ids.',
  'Labels must be specific to the domain — never generic like "Check / Confirm" or "Complete" unless the user said those words.',
  'Do not include colors or styles; the app derives all styling from the theme.',
  'Themes: clean = crisp corporate (default), sketch = hand-drawn, vibrant = bold and elevated, monochrome = grayscale.',
  "Pick the theme that matches the user's tone; default to clean when unsure.",
  'direction: RIGHT = left-to-right, DOWN = top-to-bottom. Pick what fits the diagram shape.',
].join(' ');

/* ---------- Sanitize raw model output ---------- */

function sanitizePlan(raw: unknown): Plan | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;

  // Reject mutate plans produced by a creation intent — the model should not
  // return mutate for a draw request; silently converting it to a theme change
  // is worse than returning null and surfacing an error.
  if (value.kind === 'mutate') return null;

  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null;

  const nodes: { id: string; label: string; role: 'process' | 'decision' | 'terminal' }[] = [];
  for (const item of value.nodes.slice(0, MAX_NODES)) {
    if (typeof item !== 'object' || item === null) continue;
    const node = item as Record<string, unknown>;
    if (typeof node.id !== 'string' || !node.id.trim()) continue;
    if (typeof node.label !== 'string' || !node.label.trim()) continue;
    const role =
      node.role === 'decision' || node.role === 'terminal' ? node.role : 'process';
    nodes.push({ id: node.id, label: node.label.trim(), role });
  }
  if (nodes.length === 0) return null;

  const ids = new Set(nodes.map((n) => n.id));
  const edges: { from: string; to: string; label?: string }[] = [];
  for (const item of value.edges.slice(0, MAX_NODES * 3)) {
    if (typeof item !== 'object' || item === null) continue;
    const edge = item as Record<string, unknown>;
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string') continue;
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    if (edge.from === edge.to) continue;
    edges.push({
      from: edge.from,
      to: edge.to,
      label: typeof edge.label === 'string' ? edge.label : undefined,
    });
  }

  const theme = isDiagramTheme(value.theme) ? value.theme : 'clean';
  const direction = value.direction === 'DOWN' ? 'DOWN' : 'RIGHT';
  return { kind: 'flow', theme, direction, nodes, edges };
}

/* ---------- Build the user prompt ---------- */

function buildPlannerPrompt(intent: PlannerIntent, context: PlannerContext): string {
  const command = intent.rawCommand?.trim() || intent.subject;

  const canvasLines: string[] = [];
  const elements = context.elements.slice(0, MAX_CANVAS_ELEMENTS_IN_PROMPT);
  if (elements.length > 0) {
    canvasLines.push(`Existing canvas (${context.elements.length} elements, showing first ${elements.length}):`);
    for (const el of elements) {
      const label = el.label ? el.label.slice(0, MAX_LABEL_CHARS) : '(no label)';
      const parts = [`id=${el.id}`, `type=${el.type ?? '?'}`, `label="${label}"`];
      if (el.role) parts.push(`role=${el.role}`);
      if (el.locked) parts.push('locked');
      canvasLines.push(`  - ${parts.join(', ')}`);
    }
  } else {
    canvasLines.push('Canvas: empty');
  }

  return [
    `Command: ${JSON.stringify(command)}`,
    canvasLines.join('\n'),
    'Produce the flow diagram plan as JSON.',
  ].join('\n');
}

function extractDomainSteps(text: string): { label: string; role: 'process' | 'decision' | 'terminal' }[] {
  const lower = text.toLowerCase();

  if (/\b(onboard|signup|register|registration)\b/.test(lower)) {
    return [
      { label: 'Register Account', role: 'terminal' },
      { label: 'Enter User Details', role: 'process' },
      { label: 'Verify Email / Phone', role: 'decision' },
      { label: 'Setup Profile', role: 'process' },
      { label: 'Welcome to App', role: 'terminal' },
    ];
  }
  if (/\b(login|auth|signin|authentication)\b/.test(lower)) {
    return [
      { label: 'Enter Credentials', role: 'terminal' },
      { label: 'Validate Password', role: 'decision' },
      { label: '2FA Verification', role: 'decision' },
      { label: 'Grant Access', role: 'terminal' },
    ];
  }
  if (/\b(checkout|payment|purchase|order)\b/.test(lower)) {
    return [
      { label: 'Review Cart', role: 'terminal' },
      { label: 'Enter Shipping Info', role: 'process' },
      { label: 'Process Payment', role: 'decision' },
      { label: 'Send Confirmation', role: 'terminal' },
    ];
  }
  if (/\b(approval|review|request)\b/.test(lower)) {
    return [
      { label: 'Submit Request', role: 'terminal' },
      { label: 'Manager Review', role: 'decision' },
      { label: 'Approve & Sign', role: 'process' },
      { label: 'Notification Sent', role: 'terminal' },
    ];
  }
  if (/\b(deploy|ci|cd|pipeline|build|release)\b/.test(lower)) {
    return [
      { label: 'Code Commit', role: 'terminal' },
      { label: 'Run Automated Tests', role: 'decision' },
      { label: 'Build Docker Image', role: 'process' },
      { label: 'Deploy to Production', role: 'terminal' },
    ];
  }

  const cleaned = text
    .replace(/^(draw|create|make|add|build|generate|sketch)\s+(an?\s+)?(flowchart|flow\s+diagram|diagram|process|chart|shapes|elements)?(\s+for|\s+of|\s+about|\s+with)?\s*/i, '')
    .trim();

  const title = cleaned.length > 2 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Workflow';

  return [
    { label: `Start ${title}`, role: 'terminal' },
    { label: `Process ${title}`, role: 'process' },
    { label: `Verify ${title}`, role: 'decision' },
    { label: `${title} Complete`, role: 'terminal' },
  ];
}

/* ---------- Sync fallback: parse explicit arrow/comma notation or domain steps ---------- */

/**
 * Deterministic fallback used when the LLM is unavailable (offline/testing)
 * or after LLM retries are exhausted.
 * Parses explicit arrow syntax (`A -> B -> C`), comma lists (`steps: X, Y, Z`),
 * or synthesizes domain-grounded steps from the user's specific subject.
 */
export function plannerAgent(
  intent: PlannerIntent,
  _context: PlannerContext,
): FlowPlan | null {
  const command = (intent.rawCommand ?? intent.subject).trim();
  if (!command) return null;
  const lower = command.toLowerCase();

  const direction = /(vertical|down|top[- ]to[- ]bottom)/.test(lower) ? 'DOWN' : 'RIGHT';

  // Try arrow notation: A -> B -> C
  let rawSteps: string[] = [];
  if (/->|-->|=>/.test(command)) {
    rawSteps = command.split(/->|-->|=>/).map((s) => s.trim()).filter(Boolean);
  }

  // Try "steps: A, B, C" or "phases: A then B then C"
  if (rawSteps.length < 2) {
    const colonMatch = command.match(/(?:steps?|phases?|stages?|nodes?)\s*:\s*(.+)/i);
    if (colonMatch) {
      rawSteps = colonMatch[1].split(/,|\bthen\b/i).map((s) => s.trim()).filter(Boolean);
    }
  }

  let stepDefs: { label: string; role: 'process' | 'decision' | 'terminal' }[] = [];
  if (rawSteps.length >= 2) {
    stepDefs = rawSteps.slice(0, MAX_NODES).map((step, idx) => {
      const l = step.toLowerCase();
      let role: 'process' | 'decision' | 'terminal' = 'process';
      if (/\b(if|check|confirm|valid|decision|verify|approve|\?)\b/.test(l)) {
        role = 'decision';
      } else if (
        idx === rawSteps.length - 1 ||
        /\b(end|done|stop|finish|complete|exit)\b/.test(l) ||
        (idx === 0 && /\b(start|begin)\b/.test(l))
      ) {
        role = 'terminal';
      }
      return { label: step, role };
    });
  } else {
    stepDefs = extractDomainSteps(command);
  }

  const nodes: FlowPlan['nodes'] = stepDefs.map((step, idx) => ({
    id: `n${idx + 1}`,
    label: step.label,
    role: step.role,
  }));

  const edges: FlowPlan['edges'] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      from: nodes[i]!.id,
      to: nodes[i + 1]!.id,
      label: nodes[i]!.role === 'decision' ? 'yes' : undefined,
    });
  }

  return { kind: 'flow', theme: 'clean', direction, nodes, edges };
}

/* ---------- Async entry point (LLM with retry) ---------- */

export async function plannerAgentAsync(
  intent: PlannerIntent,
  context: PlannerContext,
): Promise<Plan | null> {
  const userPrompt = buildPlannerPrompt(intent, context);
  const issues: string[] = [];

  for (let attempt = 1; attempt <= MAX_PLANNER_ATTEMPTS; attempt++) {
    const user =
      attempt === 1
        ? userPrompt
        : `${userPrompt}\n\nYour previous response was invalid (${issues[issues.length - 1] ?? 'unknown'}). Return one valid JSON object only.`;

    let result: Awaited<ReturnType<typeof llmJson<unknown>>>;
    try {
      result = await llmJson<unknown>({ system: SYSTEM_PROMPT, user, timeoutMs: 60_000 });
    } catch (e) {
      issues.push(`attempt ${attempt}: llm threw: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (!result.ok) {
      issues.push(`attempt ${attempt}: llm error: ${String(result.error ?? 'unknown')}`);
      continue;
    }

    const plan = sanitizePlan(result.data);
    if (plan) return plan;

    issues.push(`attempt ${attempt}: sanitizePlan rejected model output`);
  }

  // LLM unavailable or produced invalid output twice — try deterministic parse
  const fallback = plannerAgent(intent, context);
  if (fallback) return fallback;

  // Cannot produce a diagram — return null so the caller surfaces a real error
  return null;
}
