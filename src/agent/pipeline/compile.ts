import type { Op } from '@/agent/domain/op';
import type { Plan } from '@/agent/domain/plan';
import type { ProposedChange } from '@/agent/domain/proposed-change';
import { resolveTheme } from '@/agent/pipeline/theme';
import { layoutPlan } from '@/agent/pipeline/layout';

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 2147483647;
}

function scopeId(runPrefix: string, id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${runPrefix}_${safe}`;
}

export async function compilePlan(plan: Plan, runId: string): Promise<ProposedChange> {
  const runPrefix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase() || 'run';

  if (plan.kind === 'mutate') {
    const ops: Op[] = [];
    if (plan.action === 'delete') {
      for (const id of plan.targetIds || []) {
        ops.push({ op: 'delete_element', id });
      }
    } else if (plan.action === 'move') {
      for (const id of plan.targetIds || []) {
        ops.push({ op: 'move_element', id, dx: plan.dx ?? 0, dy: plan.dy ?? 0 });
      }
    } else if (plan.action === 'theme' || plan.action === 'restyle') {
      ops.push({
        op: 'apply_theme',
        theme: plan.theme ?? 'clean',
        targetIds: plan.targetIds,
      });
    }

    return {
      runId,
      ops,
      bbox: { x: 0, y: 0, w: 0, h: 0 },
      summary: plan.summary ?? `Applied ${plan.action} on ${ops.length} elements`,
      theme: plan.theme,
    };
  }

  const theme = resolveTheme(plan.theme);
  const nodeIdMap = new Map<string, string>();
  for (const node of plan.nodes) {
    nodeIdMap.set(node.id, scopeId(runPrefix, node.id));
  }

  const layout = await layoutPlan(plan);
  const ops: Op[] = [];

  for (const node of plan.nodes) {
    const box = layout.positions.get(node.id) || { x: 60, y: 140, w: 160, h: 70 };
    const scopedId = nodeIdMap.get(node.id) ?? scopeId(runPrefix, node.id);
    const shape =
      node.role === 'decision'
        ? 'diamond'
        : node.role === 'terminal'
          ? 'rounded-rect'
          : 'rect';

    ops.push({
      op: 'create_shape',
      id: scopedId,
      shape,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      label: node.label,
      seed: hashSeed(`${node.id}:${node.label}`),
      style: theme.shape(node.role),
    });
  }

  layout.edges.forEach((edgeLayout, index) => {
    const fromId = nodeIdMap.get(edgeLayout.from);
    const toId = nodeIdMap.get(edgeLayout.to);
    if (!fromId || !toId) return;

    ops.push({
      op: 'create_arrow',
      id: `arrow_${runPrefix}_${index}`,
      fromId,
      toId,
      points: edgeLayout.points,
      fromPoint: edgeLayout.fromPoint,
      toPoint: edgeLayout.toPoint,
      label: edgeLayout.label,
      seed: hashSeed(`${edgeLayout.from}->${edgeLayout.to}`),
      style: { ...theme.arrow },
    });
  });

  return {
    runId,
    ops,
    bbox: layout.bbox,
    summary: `${plan.nodes.length} nodes, ${plan.edges.length} connections`,
    theme: theme.id,
  };
}
