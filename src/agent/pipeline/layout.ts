import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { FlowPlan } from '@/agent/domain/plan';
import type { Box } from '@/agent/domain/proposed-change';
import { measureAndSizeNode } from '@/agent/pipeline/measure';
import type { SnapLocation } from '@/lib/arrowSnap';

const elk = new ELK();

const ORIGIN_X = 60;
const ORIGIN_Y = 140;

export type EdgeLayout = {
  id: string;
  from: string;
  to: string;
  points: [number, number][];
  fromPoint: SnapLocation;
  toPoint: SnapLocation;
  label?: string;
};

export type DiagramLayoutResult = {
  positions: Map<string, Box>;
  edges: EdgeLayout[];
  bbox: Box;
};

function getNearestAnchor(box: Box, pt: { x: number; y: number }): SnapLocation {
  const dLeft = Math.abs(pt.x - box.x);
  const dRight = Math.abs(pt.x - (box.x + box.w));
  const dTop = Math.abs(pt.y - box.y);
  const dBottom = Math.abs(pt.y - (box.y + box.h));

  const min = Math.min(dLeft, dRight, dTop, dBottom);
  if (min === dLeft) return 'left';
  if (min === dRight) return 'right';
  if (min === dTop) return 'top';
  return 'bottom';
}

export async function layoutPlan(plan: FlowPlan): Promise<DiagramLayoutResult> {
  const sizedNodes = new Map<string, { w: number; h: number }>();
  for (const node of plan.nodes) {
    const measured = measureAndSizeNode(node.label, node.role);
    sizedNodes.set(node.id, { w: measured.w, h: measured.h });
  }

  const direction = plan.direction === 'DOWN' ? 'DOWN' : 'RIGHT';

  const elkChildren: ElkNode[] = plan.nodes.map((node) => {
    const s = sizedNodes.get(node.id) || { w: 160, h: 70 };
    return {
      id: node.id,
      width: s.w,
      height: s.h,
    };
  });

  const elkEdges: ElkExtendedEdge[] = plan.edges.map((edge, index) => ({
    id: `e_${index}_${edge.from}_${edge.to}`,
    sources: [edge.from],
    targets: [edge.to],
  }));

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '64',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: elkChildren,
    edges: elkEdges,
  };

  const layoutResult = await elk.layout(elkGraph);

  const positions = new Map<string, Box>();
  if (layoutResult.children) {
    for (const child of layoutResult.children) {
      if (child.id && child.x !== undefined && child.y !== undefined) {
        positions.set(child.id, {
          x: ORIGIN_X + child.x,
          y: ORIGIN_Y + child.y,
          w: child.width ?? 160,
          h: child.height ?? 70,
        });
      }
    }
  }

  const edges: EdgeLayout[] = [];
  if (layoutResult.edges) {
    layoutResult.edges.forEach((edge, index) => {
      const originalEdge = plan.edges[index];
      if (!originalEdge) return;
      const fromBox = positions.get(originalEdge.from);
      const toBox = positions.get(originalEdge.to);

      let points: [number, number][] = [];
      let fromPoint: SnapLocation = direction === 'DOWN' ? 'bottom' : 'right';
      let toPoint: SnapLocation = direction === 'DOWN' ? 'top' : 'left';

      const section = edge.sections?.[0];
      if (section && fromBox && toBox) {
        const start = {
          x: ORIGIN_X + section.startPoint.x,
          y: ORIGIN_Y + section.startPoint.y,
        };
        const end = {
          x: ORIGIN_X + section.endPoint.x,
          y: ORIGIN_Y + section.endPoint.y,
        };
        fromPoint = getNearestAnchor(fromBox, start);
        toPoint = getNearestAnchor(toBox, end);

        const bendPts: [number, number][] = (section.bendPoints ?? []).map((bp) => [
          ORIGIN_X + bp.x,
          ORIGIN_Y + bp.y,
        ]);

        points = [[start.x, start.y], ...bendPts, [end.x, end.y]];
      } else if (fromBox && toBox) {
        const p1: [number, number] = [fromBox.x + fromBox.w, fromBox.y + fromBox.h / 2];
        const p2: [number, number] = [toBox.x, toBox.y + toBox.h / 2];
        points = [p1, p2];
      }

      edges.push({
        id: edge.id,
        from: originalEdge.from,
        to: originalEdge.to,
        points,
        fromPoint,
        toPoint,
        label: originalEdge.label,
      });
    });
  }

  const boxes = Array.from(positions.values());
  const bbox: Box = boxes.length
    ? {
        x: Math.min(...boxes.map((b) => b.x)),
        y: Math.min(...boxes.map((b) => b.y)),
        w: Math.max(...boxes.map((b) => b.x + b.w)) - Math.min(...boxes.map((b) => b.x)),
        h: Math.max(...boxes.map((b) => b.y + b.h)) - Math.min(...boxes.map((b) => b.y)),
      }
    : { x: 0, y: 0, w: 0, h: 0 };

  return { positions, edges, bbox };
}
