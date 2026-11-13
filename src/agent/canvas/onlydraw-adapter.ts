import { CanvasPort, AgentOrigin, ProposedChange, Op, ElementSummary } from '@/agent/domain';
import * as Y from 'yjs';
import canvasDoc, { LOCAL_ORIGIN } from '@/Store/yjs-store';
import { elementType } from '@/types/type';
import { resolveTheme } from '@/agent/pipeline/theme';

type ShapeOp = Extract<Op, { op: 'create_shape' }>;
type ArrowOp = Extract<Op, { op: 'create_arrow' }>;

export type AgentStyle = {
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  fillColor: string;
  isFillTransparent: boolean;
  fillStyle: string;
  fillWeight: number;
  boundaryStyle: string;
  opacity: number;
  hasShadow: boolean;
  fontSize: number;
  fontFamily: string;
  arrowRouting: 'straight' | 'curved' | 'angled';
};

const DEFAULT_STYLE: AgentStyle = {
  strokeColor: '#1e293b',
  strokeWidth: 2,
  roughness: 0,
  fillColor: '#dbeafe',
  isFillTransparent: true,
  fillStyle: 'solid',
  fillWeight: 3,
  boundaryStyle: 'solid',
  opacity: 1,
  hasShadow: false,
  fontSize: 16,
  fontFamily: 'sans-serif',
  arrowRouting: 'straight',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function baseFields(
  map: Y.Map<unknown>,
  fields: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    seed: number;
    runId: string;
  },
): void {
  map.set('id', fields.id);
  map.set('x', fields.x);
  map.set('y', fields.y);
  map.set('width', fields.w);
  map.set('height', fields.h);
  map.set('seed', String(fields.seed));
  map.set('isDeleted', false);
  map.set('angle', 0);
  map.set('rotationAxis', 'center');
  map.set('groupIds', [fields.runId]);
  map.set('author', canvasDoc.doc.clientID);
}

function createShapeMap(op: ShapeOp, runId: string, style: AgentStyle): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  baseFields(map, { id: op.id, x: op.x, y: op.y, w: op.w, h: op.h, seed: op.seed, runId });
  const typeMap: Record<string, elementType> = {
    diamond: elementType.Diamond,
    'rounded-rect': elementType.RoundedRect,
    ellipse: elementType.Ellipse,
    rect: elementType.Rectangle,
  };
  map.set('type', typeMap[op.shape] || elementType.Rectangle);
  map.set('strokeColor', op.style?.strokeColor ?? style.strokeColor);
  map.set('strokeWidth', op.style?.strokeWidth ?? style.strokeWidth);
  map.set('roughness', op.style?.roughness ?? style.roughness);
  map.set('opacity', op.style?.opacity ?? style.opacity);
  map.set('hasShadow', op.style?.hasShadow ?? style.hasShadow);
  map.set('fillColor', op.style?.fillColor ?? style.fillColor);
  map.set(
    'isFillTransparent',
    op.style?.fillColor ? false : style.isFillTransparent,
  );
  map.set('fillStyle', op.style?.fillStyle ?? style.fillStyle);
  map.set('fillWeight', op.style?.fillWeight ?? style.fillWeight);
  map.set('boundaryStyle', op.style?.boundaryStyle ?? style.boundaryStyle);

  // Embedded label stored directly on the shape so dragging/resizing keeps label bound
  if (op.label) {
    map.set('text', op.label);
    map.set('fontSize', clamp(style.fontSize, 12, 16));
    map.set('fontFamily', style.fontFamily);
    map.set('textAlign', 'center');
  }

  return map;
}

function createLabelMap(op: ShapeOp, runId: string, style: AgentStyle): Y.Map<unknown> {
  const fontSize = clamp(style.fontSize, 12, 20);
  const map = new Y.Map<unknown>();
  baseFields(map, {
    id: `${op.id}__label`,
    x: op.x,
    y: op.y + op.h / 2 - fontSize * 0.65,
    w: op.w,
    h: fontSize * 1.4,
    seed: op.seed + 1,
    runId,
  });
  map.set('type', elementType.Text);
  map.set('text', op.label);
  map.set('fontSize', fontSize);
  map.set('fontFamily', style.fontFamily);
  map.set('textAlign', 'center');
  map.set('fillColor', op.style?.strokeColor ?? style.strokeColor);
  map.set('strokeColor', op.style?.strokeColor ?? style.strokeColor);
  map.set('strokeWidth', 1);
  map.set('roughness', 0);
  map.set('opacity', style.opacity);
  map.set('hasShadow', false);
  map.set('lineHeight', 1.3);
  return map;
}

function createArrowMap(op: ArrowOp, runId: string, style: AgentStyle): Y.Map<unknown> {
  const first = op.points[0] ?? [0, 0];
  const last = op.points[op.points.length - 1] ?? first;
  const map = new Y.Map<unknown>();
  baseFields(map, {
    id: op.id,
    x: first[0],
    y: first[1],
    w: last[0] - first[0],
    h: last[1] - first[1],
    seed: op.seed,
    runId,
  });
  map.set('type', elementType.Arrow);
  map.set('strokeColor', op.style?.strokeColor ?? style.strokeColor);
  map.set('strokeWidth', op.style?.strokeWidth ?? style.strokeWidth);
  map.set('roughness', op.style?.roughness ?? style.roughness);
  map.set('opacity', op.style?.opacity ?? style.opacity);
  map.set('hasShadow', op.style?.hasShadow ?? style.hasShadow);
  map.set('isTwoWay', false);
  map.set('boundaryStyle', op.style?.boundaryStyle ?? style.boundaryStyle);
  map.set('routing', op.style?.routing ?? style.arrowRouting);
  map.set('controlPoint', null);
  map.set('startBinding', { elementId: op.fromId, point: op.fromPoint ?? 'right' });
  map.set('endBinding', { elementId: op.toId, point: op.toPoint ?? 'left' });
  if (op.label !== undefined) {
    map.set('text', op.label);
    map.set('fontSize', clamp(style.fontSize, 10, 14));
    map.set('fontFamily', style.fontFamily);
  }
  return map;
}

/** Convert a Yjs Y.Map element back to ElementSummary for the agent port. */
function yMapToSummary(el: Y.Map<unknown>): ElementSummary {
  const type = el.get('type') as elementType | undefined;
  const locked = el.get('isLocked') === true;
  const w = el.get('width');
  const h = el.get('height');
  const bbox = {
    x: el.get('x') as number,
    y: el.get('y') as number,
    w: typeof w === 'number' ? w : 0,
    h: typeof h === 'number' ? h : 0,
  };
  return {
    id: el.get('id') as string,
    type: type || elementType.Rectangle,
    bbox,
    label: el.get('text') as string | undefined,
    locked,
  };
}

/** listElements: reads all elements from the Yjs doc and returns summaries.
 *  For v1 we return all elements in the active workspace.
 */
export async function listElements(roomId: string): Promise<ElementSummary[]> {
  void roomId;
  const results: ElementSummary[] = [];
  canvasDoc.yElement.forEach((elYMap: Y.Map<unknown>) => {
    results.push(yMapToSummary(elYMap));
  });
  return results;
}

/** commit: transacts the ProposedChange into the Yjs doc with an agent origin.
 *  Idempotent by runId: a retried commit step must not duplicate elements.
 *  Uses LOCAL_ORIGIN so the user's undo manager can revert the agent run.
 */
export async function commit(
  roomId: string,
  change: ProposedChange,
  origin: AgentOrigin,
  style: AgentStyle = DEFAULT_STYLE,
): Promise<{ committedIds: string[] }> {
  void roomId;
  void origin;

  const runId = change.runId;
  const elements = canvasDoc.yElement;
  const order = canvasDoc.order;

  canvasDoc.doc.transact(() => {
    change.ops.forEach((op) => {
      if (op.op === 'create_shape') {
        if (!elements.get(op.id)) {
          order.push([op.id]);
        }
        elements.set(op.id, createShapeMap(op, runId, style));
        return;
      }

      if (op.op === 'create_arrow') {
        if (!elements.get(op.id)) {
          order.push([op.id]);
        }
        elements.set(op.id, createArrowMap(op, runId, style));
        return;
      }

      if (op.op === 'update_shape') {
        const el = elements.get(op.id);
        if (el) {
          const patch = op.patch;
          if (patch.label !== undefined) el.set('text', patch.label);
          if (patch.x !== undefined) el.set('x', patch.x);
          if (patch.y !== undefined) el.set('y', patch.y);
          if (patch.w !== undefined) el.set('width', patch.w);
          if (patch.h !== undefined) el.set('height', patch.h);
          if (patch.fillColor !== undefined) el.set('fillColor', patch.fillColor);
          if (patch.strokeColor !== undefined) el.set('strokeColor', patch.strokeColor);
          if (patch.fillStyle !== undefined) el.set('fillStyle', patch.fillStyle);
          if (patch.strokeWidth !== undefined) el.set('strokeWidth', patch.strokeWidth);
          if (patch.roughness !== undefined) el.set('roughness', patch.roughness);
          if (patch.opacity !== undefined) el.set('opacity', patch.opacity);
          if (patch.hasShadow !== undefined) el.set('hasShadow', patch.hasShadow);
        }
        return;
      }

      if (op.op === 'delete_element') {
        const el = elements.get(op.id);
        if (el) {
          el.set('isDeleted', true);
        }
        return;
      }

      if (op.op === 'move_element') {
        const el = elements.get(op.id);
        if (el) {
          const curX = Number(el.get('x')) || 0;
          const curY = Number(el.get('y')) || 0;
          el.set('x', curX + op.dx);
          el.set('y', curY + op.dy);
        }
        return;
      }

      if (op.op === 'apply_theme') {
        const themeDef = resolveTheme(op.theme);
        const targetIds =
          op.targetIds && op.targetIds.length > 0 ? new Set(op.targetIds) : null;
        elements.forEach((el, id) => {
          if (targetIds && !targetIds.has(id)) return;
          if (el.get('isDeleted')) return;
          const t = el.get('type') as string;
          if (
            t === elementType.Rectangle ||
            t === elementType.RoundedRect ||
            t === elementType.Diamond ||
            t === elementType.Ellipse
          ) {
            const role =
              t === elementType.Diamond
                ? 'decision'
                : t === elementType.RoundedRect
                  ? 'terminal'
                  : 'process';
            const s = themeDef.shape(role);
            if (s.fillColor) el.set('fillColor', s.fillColor);
            if (s.strokeColor) el.set('strokeColor', s.strokeColor);
            if (s.fillStyle) el.set('fillStyle', s.fillStyle);
            if (s.strokeWidth) el.set('strokeWidth', s.strokeWidth);
            if (s.roughness !== undefined) el.set('roughness', s.roughness);
          } else if (t === elementType.Arrow || t === elementType.ArrowTwoWay) {
            const a = themeDef.arrow;
            if (a.strokeColor) el.set('strokeColor', a.strokeColor);
            if (a.strokeWidth) el.set('strokeWidth', a.strokeWidth);
            if (a.routing) el.set('routing', a.routing);
          }
        });
        return;
      }
    });
  }, LOCAL_ORIGIN);

  const committedIds = change.ops
    .filter((op): op is Extract<Op, { id: string }> => 'id' in op)
    .map((op) => op.id);
  return { committedIds };
}

/** shiftProposedChange: translates all ops and bbox of a proposed change by (dx, dy). */
export function shiftProposedChange(change: ProposedChange, dx: number, dy: number): ProposedChange {
  if (dx === 0 && dy === 0) return change;
  return {
    ...change,
    bbox: { ...change.bbox, x: change.bbox.x + dx, y: change.bbox.y + dy },
    ops: change.ops.map((op) => {
      if (op.op === 'create_shape') {
        return { ...op, x: op.x + dx, y: op.y + dy };
      }
      if (op.op === 'create_arrow') {
        return {
          ...op,
          points: op.points.map(([px, py]) => [px + dx, py + dy] as [number, number]),
        };
      }
      return op;
    }),
  };
}

export type PlacementOptions = {
  camera?: { x: number; y: number; scale: number };
  viewport?: { width: number; height: number };
};

/** Predicts the canvas world coordinates where the agent's generated diagram will land */
export function getDraftZoneBoundingBox(
  options?: PlacementOptions,
  estimatedSize = { w: 680, h: 420 },
): { x: number; y: number; w: number; h: number } {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let hasElements = false;

  canvasDoc.yElement.forEach((el) => {
    if (el.get('isDeleted')) return;
    hasElements = true;
    const x = Number(el.get('x')) || 0;
    const y = Number(el.get('y')) || 0;
    const w = Number(el.get('width')) || 0;
    const h = Number(el.get('height')) || 0;
    minX = Math.min(minX, x, x + w);
    maxX = Math.max(maxX, x, x + w);
    minY = Math.min(minY, y, y + h);
    maxY = Math.max(maxY, y, y + h);
  });

  const GAP = 80;

  if (hasElements && Number.isFinite(maxY)) {
    const centerX = Number.isFinite(minX) && Number.isFinite(maxX) ? (minX + maxX) / 2 : 0;
    return {
      x: centerX - estimatedSize.w / 2,
      y: maxY + GAP,
      w: estimatedSize.w,
      h: estimatedSize.h,
    };
  }

  if (options?.camera) {
    const cam = options.camera;
    const vw = options.viewport?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const vh = options.viewport?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
    const centerCanvasX = (vw / 2 - cam.x) / cam.scale;
    const centerCanvasY = (vh / 2 - cam.y) / cam.scale;
    return {
      x: centerCanvasX - estimatedSize.w / 2,
      y: centerCanvasY - estimatedSize.h / 2,
      w: estimatedSize.w,
      h: estimatedSize.h,
    };
  }

  return {
    x: 0,
    y: 0,
    w: estimatedSize.w,
    h: estimatedSize.h,
  };
}

/** placeInFreeSpace: positions diagram in user view or below existing elements */
export function placeInFreeSpace(
  change: ProposedChange,
  options?: PlacementOptions,
): ProposedChange {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let hasElements = false;

  canvasDoc.yElement.forEach((el) => {
    if (el.get('isDeleted')) return;
    hasElements = true;
    const x = Number(el.get('x')) || 0;
    const y = Number(el.get('y')) || 0;
    const w = Number(el.get('width')) || 0;
    const h = Number(el.get('height')) || 0;
    minX = Math.min(minX, x, x + w);
    maxX = Math.max(maxX, x, x + w);
    minY = Math.min(minY, y, y + h);
    maxY = Math.max(maxY, y, y + h);
  });

  const GAP = 80;

  // If there are existing elements, place below them
  if (hasElements && Number.isFinite(maxY)) {
    const dy = maxY + GAP - change.bbox.y;
    if (dy > 0) {
      return shiftProposedChange(change, 0, dy);
    }
    return change;
  }

  // If canvas is empty and camera is provided, place in viewport center
  if (options?.camera) {
    const cam = options.camera;
    const vw = options.viewport?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const vh = options.viewport?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
    const centerCanvasX = (vw / 2 - cam.x) / cam.scale;
    const centerCanvasY = (vh / 2 - cam.y) / cam.scale;

    const dx = centerCanvasX - (change.bbox.x + change.bbox.w / 2);
    const dy = centerCanvasY - (change.bbox.y + change.bbox.h / 2);
    return shiftProposedChange(change, dx, dy);
  }

  return change;
}

/** placeBelowExisting: backwards-compatible alias for placeInFreeSpace */
export function placeBelowExisting(change: ProposedChange): ProposedChange {
  return placeInFreeSpace(change);
}

/** undoRun: removes the entire run's elements from the Yjs doc.
 *  Only removes elements committed by this agent run; human elements are untouched.
 *  Uses runId tracking via groupIds on each element.
 */
export async function undoRun(roomId: string, runId: string): Promise<void> {
  void roomId;
  const elementsMap = canvasDoc.yElement;
  const idsToRemove: string[] = [];

  elementsMap.forEach((elYMap: Y.Map<unknown>, id: string) => {
    const groupIds = elYMap.get('groupIds') as string[] | undefined;
    if ((groupIds && groupIds.includes(runId)) || id === runId) {
      idsToRemove.push(id);
    }
  });

  if (idsToRemove.length > 0) {
    const removedSet = new Set(idsToRemove);
    const orderArray = canvasDoc.order.toArray();
    const kept = orderArray.filter((entry: string) => !removedSet.has(entry));
    canvasDoc.order.delete(0, canvasDoc.order.length);
    if (kept.length > 0) {
      canvasDoc.order.insert(0, kept);
    }

    idsToRemove.forEach((id) => {
      elementsMap.delete(id);
    });
  }
}

export const onlydrawCanvasPort: CanvasPort = {
  listElements,
  commit,
  undoRun,
};
