import * as Y from 'yjs';
import canvasDoc from '@/Store/yjs-store';
import { getBindingPosition, SnapLocation } from '@/lib/arrowSnap';

export function getArrowLabelPosition(
  element: Y.Map<unknown> | Record<string, unknown>,
  parentMap?: Y.Map<Y.Map<unknown>>
): { x: number; y: number } {
  const getProp = (key: string): unknown => {
    if (element instanceof Y.Map || (element && typeof (element as { get?: unknown }).get === 'function')) {
      return (element as Y.Map<unknown>).get(key);
    }
    return (element as Record<string, unknown>)[key];
  };

  let x1 = Number(getProp('x') || 0);
  let y1 = Number(getProp('y') || 0);
  let x2 = x1 + Number(getProp('width') || 0);
  let y2 = y1 + Number(getProp('height') || 0);

  const startBinding = getProp('startBinding') as { elementId: string; point: SnapLocation } | undefined;
  const endBinding = getProp('endBinding') as { elementId: string; point: SnapLocation } | undefined;
  const pMap = parentMap || (element instanceof Y.Map ? (element.parent as Y.Map<Y.Map<unknown>> | undefined) : undefined) || canvasDoc.yElement;

  if (pMap) {
    if (startBinding) {
      const sp = getBindingPosition(startBinding, pMap);
      if (sp) {
        x1 = sp[0];
        y1 = sp[1];
      }
    }
    if (endBinding) {
      const ep = getBindingPosition(endBinding, pMap);
      if (ep) {
        x2 = ep[0];
        y2 = ep[1];
      }
    }
  }

  const rawControl = getProp('controlPoint') as { x: number; y: number } | undefined;
  const routing = String(getProp('routing') || (rawControl ? 'curved' : 'straight'));

  if (routing === 'curved' || rawControl) {
    const cx = rawControl ? rawControl.x : (x1 + x2) / 2;
    const cy = rawControl ? rawControl.y : (y1 + y2) / 2;
    // Quadratic Bezier midpoint at t = 0.5:
    // B(0.5) = 0.25 * P0 + 0.5 * P1 + 0.25 * P2
    const midX = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
    const midY = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
    return { x: midX, y: midY };
  }

  if (routing === 'angled') {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return { x: midX, y: midY };
  }

  // Straight arrow midpoint
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

export function getArrowLabelBounds(
  element: Y.Map<unknown> | Record<string, unknown>,
  parentMap?: Y.Map<Y.Map<unknown>>,
  ctx?: CanvasRenderingContext2D | null
): { x: number; y: number; width: number; height: number; text: string; lines: string[]; fontSize: number; fontFamily: string } | null {
  const getProp = (key: string): unknown => {
    if (element instanceof Y.Map || (element && typeof (element as { get?: unknown }).get === 'function')) {
      return (element as Y.Map<unknown>).get(key);
    }
    return (element as Record<string, unknown>)[key];
  };

  const text = String(getProp('text') || '').trim();
  if (!text) return null;

  const { x, y } = getArrowLabelPosition(element, parentMap);
  const fontSize = Number(getProp('fontSize')) || 15;
  const fontFamily = String(getProp('fontFamily') || 'sans-serif');
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.35;

  let maxW = 24;
  if (ctx) {
    ctx.save();
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    lines.forEach((l) => {
      maxW = Math.max(maxW, ctx.measureText(l || 'M').width);
    });
    ctx.restore();
  } else {
    lines.forEach((l) => {
      maxW = Math.max(maxW, (l.length || 1) * fontSize * 0.62);
    });
  }

  const padX = 10;
  const padY = 5;
  const width = Math.ceil(maxW + padX * 2);
  const height = Math.ceil(lines.length * lineHeight + padY * 2);

  return {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    text,
    lines,
    fontSize,
    fontFamily,
  };
}
