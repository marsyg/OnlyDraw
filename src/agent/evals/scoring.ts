import type { ProposedChange, Box } from '@/agent/domain/proposed-change';

export type DiagramScore = {
  overlapCount: number;
  crossingCount: number;
  labelOverflowCount: number;
  inViewport: boolean;
  compositeScore: number;
  details: {
    nodeCount: number;
    edgeCount: number;
  };
};

function ccw(p1: [number, number], p2: [number, number], p3: [number, number]): boolean {
  return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

export function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number],
): boolean {
  // If sharing an endpoint, they connect rather than cross
  if (
    (p1[0] === p3[0] && p1[1] === p3[1]) ||
    (p1[0] === p4[0] && p1[1] === p4[1]) ||
    (p2[0] === p3[0] && p2[1] === p3[1]) ||
    (p2[0] === p4[0] && p2[1] === p4[1])
  ) {
    return false;
  }
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

export function boxesOverlap(b1: Box, b2: Box, margin = 2): boolean {
  return !(
    b1.x + b1.w - margin <= b2.x ||
    b2.x + b2.w - margin <= b1.x ||
    b1.y + b1.h - margin <= b2.y ||
    b2.y + b2.h - margin <= b1.y
  );
}

export function scoreDiagram(
  change: ProposedChange,
  viewport?: { x: number; y: number; w: number; h: number },
): DiagramScore {
  const shapes = change.ops.filter(
    (op): op is Extract<typeof op, { op: 'create_shape' }> => op.op === 'create_shape',
  );
  const arrows = change.ops.filter(
    (op): op is Extract<typeof op, { op: 'create_arrow' }> => op.op === 'create_arrow',
  );

  // 1. Check node overlaps
  let overlapCount = 0;
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];
      if (boxesOverlap({ x: s1.x, y: s1.y, w: s1.w, h: s1.h }, { x: s2.x, y: s2.y, w: s2.w, h: s2.h })) {
        overlapCount++;
      }
    }
  }

  // 2. Check edge crossings
  let crossingCount = 0;
  // Collect all line segments from arrows
  const segments: [number, number][][] = [];
  for (const arrow of arrows) {
    const pts = arrow.points;
    for (let k = 0; k < pts.length - 1; k++) {
      segments.push([pts[k], pts[k + 1]]);
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const seg1 = segments[i];
      const seg2 = segments[j];
      if (segmentsIntersect(seg1[0], seg1[1], seg2[0], seg2[1])) {
        crossingCount++;
      }
    }
  }

  // 3. Check label overflow
  let labelOverflowCount = 0;
  for (const shape of shapes) {
    const label = shape.label?.trim() || '';
    if (!label) continue;
    const isDiamond = shape.shape === 'diamond';
    const effectiveW = isDiamond ? shape.w * 0.65 : shape.w;
    const effectiveH = isDiamond ? shape.h * 0.65 : shape.h;

    const maxLines = Math.max(1, Math.floor((effectiveH - 16) / 18));
    const charsPerLine = Math.max(5, Math.floor((effectiveW - 16) / 8.5));
    const maxCapacity = maxLines * charsPerLine;

    if (label.length > maxCapacity) {
      labelOverflowCount++;
    }
  }

  // 4. Viewport check
  let inViewport = true;
  if (viewport) {
    inViewport =
      change.bbox.x >= viewport.x &&
      change.bbox.y >= viewport.y &&
      change.bbox.x + change.bbox.w <= viewport.x + viewport.w &&
      change.bbox.y + change.bbox.h <= viewport.y + viewport.h;
  }

  const compositeScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - overlapCount * 30 - crossingCount * 12 - labelOverflowCount * 20),
    ),
  );

  return {
    overlapCount,
    crossingCount,
    labelOverflowCount,
    inViewport,
    compositeScore,
    details: {
      nodeCount: shapes.length,
      edgeCount: arrows.length,
    },
  };
}

