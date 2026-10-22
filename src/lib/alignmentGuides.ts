import * as Y from 'yjs';
import { getBounds, boundType } from '@/lib/utils/boundsUtility/getBounds';

/** One rendered guide line on the canvas */
export type AlignmentGuide = {
  /** 'v' = vertical red line (x constant), 'h' = horizontal red line (y constant) */
  axis: 'v' | 'h';
  /** World-space coordinate of the line */
  pos: number;
  /** World-space start of the drawn segment */
  start: number;
  /** World-space end of the drawn segment */
  end: number;
};

export type AlignmentResult = {
  /** Guides to draw */
  guides: AlignmentGuide[];
  /** Corrected dx after snapping */
  snapDx: number;
  /** Corrected dy after snapping */
  snapDy: number;
};

const SNAP_THRESHOLD = 6; // world-space pixels

/**
 * Returns the 3 key x-positions (left, center, right) and 3 key y-positions
 * (top, center, bottom) for a bounding rectangle.
 */
function keyPoints(b: { x: number; y: number; width: number; height: number }) {
  return {
    xs: [b.x, b.x + b.width / 2, b.x + b.width],
    ys: [b.y, b.y + b.height / 2, b.y + b.height],
  };
}

/**
 * Computes alignment guides and snap deltas while dragging.
 *
 * @param movingIds       IDs of elements being dragged
 * @param proposedBounds  The bounding rect of the dragged selection AFTER applying dx/dy
 * @param dx              Proposed delta-x this frame
 * @param dy              Proposed delta-y this frame
 * @param yElement        The Yjs elements map
 */
export function computeAlignmentGuides(
  movingIds: Set<string>,
  proposedBounds: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
  yElement: Y.Map<Y.Map<unknown>>,
): AlignmentResult {
  const guides: AlignmentGuide[] = [];

  // Gather all stationary element bounds
  const stationary: boundType[] = [];
  yElement.forEach((el) => {
    const id = el.get('id') as string;
    if (movingIds.has(id)) return;
    if (el.get('isDeleted')) return;
    stationary.push(getBounds({ element: el }));
  });

  if (stationary.length === 0) {
    return { guides, snapDx: dx, snapDy: dy };
  }

  const { xs: mxs, ys: mys } = keyPoints(proposedBounds);

  let bestSnapDx = dx;
  let bestSnapDy = dy;
  let minDxDist = SNAP_THRESHOLD + 1;
  let minDyDist = SNAP_THRESHOLD + 1;

  // Accumulate snap candidates
  const xSnaps: { proposedX: number; targetX: number; delta: number }[] = [];
  const ySnaps: { proposedY: number; targetY: number; delta: number }[] = [];

  for (const sb of stationary) {
    const { xs: sxs, ys: sys } = keyPoints(sb);

    // Check every moving key-x against every stationary key-x
    for (const mx of mxs) {
      for (const sx of sxs) {
        const dist = Math.abs(mx - sx);
        if (dist <= SNAP_THRESHOLD) {
          xSnaps.push({ proposedX: mx, targetX: sx, delta: sx - mx });
        }
      }
    }

    // Check every moving key-y against every stationary key-y
    for (const my of mys) {
      for (const sy of sys) {
        const dist = Math.abs(my - sy);
        if (dist <= SNAP_THRESHOLD) {
          ySnaps.push({ proposedY: my, targetY: sy, delta: sy - my });
        }
      }
    }
  }

  // Pick the closest snap per axis
  for (const snap of xSnaps) {
    const dist = Math.abs(snap.delta);
    if (dist < minDxDist) {
      minDxDist = dist;
      bestSnapDx = dx + snap.delta;
    }
  }
  for (const snap of ySnaps) {
    const dist = Math.abs(snap.delta);
    if (dist < minDyDist) {
      minDyDist = dist;
      bestSnapDy = dy + snap.delta;
    }
  }

  // After we know the final snap deltas, recompute snapped moving bounds
  const snappedBounds = {
    x: proposedBounds.x + (bestSnapDx - dx),
    y: proposedBounds.y + (bestSnapDy - dy),
    width: proposedBounds.width,
    height: proposedBounds.height,
  };
  const { xs: smxs, ys: smys } = keyPoints(snappedBounds);

  // Build guide lines
  for (const sb of stationary) {
    const { xs: sxs, ys: sys } = keyPoints(sb);

    for (const smx of smxs) {
      for (const sx of sxs) {
        if (Math.abs(smx - sx) < 0.5) {
          // Vertical guide line spanning both elements
          const minY = Math.min(snappedBounds.y, sb.y);
          const maxY = Math.max(snappedBounds.y + snappedBounds.height, sb.y + sb.height);
          guides.push({ axis: 'v', pos: sx, start: minY, end: maxY });
        }
      }
    }

    for (const smy of smys) {
      for (const sy of sys) {
        if (Math.abs(smy - sy) < 0.5) {
          // Horizontal guide line spanning both elements
          const minX = Math.min(snappedBounds.x, sb.x);
          const maxX = Math.max(snappedBounds.x + snappedBounds.width, sb.x + sb.width);
          guides.push({ axis: 'h', pos: sy, start: minX, end: maxX });
        }
      }
    }
  }

  // Deduplicate guides (same axis + same pos)
  const seen = new Set<string>();
  const uniqueGuides = guides.filter((g) => {
    const key = `${g.axis}-${Math.round(g.pos)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { guides: uniqueGuides, snapDx: bestSnapDx, snapDy: bestSnapDy };
}

/**
 * Draws alignment guides onto a 2D canvas context (call INSIDE the camera transform).
 */
export function drawAlignmentGuides(ctx: CanvasRenderingContext2D, guides: AlignmentGuide[]) {
  if (guides.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#ef4444'; // red-500
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.85;

  for (const g of guides) {
    ctx.beginPath();
    if (g.axis === 'v') {
      ctx.moveTo(g.pos, g.start - 20);
      ctx.lineTo(g.pos, g.end + 20);
    } else {
      ctx.moveTo(g.start - 20, g.pos);
      ctx.lineTo(g.end + 20, g.pos);
    }
    ctx.stroke();

    // Small diamond at the snap point for flair
    ctx.fillStyle = '#ef4444';
    ctx.globalAlpha = 1;
    const cx = g.axis === 'v' ? g.pos : (g.start + g.end) / 2;
    const cy = g.axis === 'h' ? g.pos : (g.start + g.end) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    ctx.globalAlpha = 0.85;
  }

  ctx.restore();
}
