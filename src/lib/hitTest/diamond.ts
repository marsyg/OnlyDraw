import { args } from './argumentType';

const isShapeUnfilled = (element: args['element']): boolean => {
  if (element.get('isFillTransparent') === true) return true;
  return element.get('fillColor') === 'transparent';
};

const hitTolerance = (element: args['element']): number => {
  const strokeWidth = Number(element.get('strokeWidth')) || 1;
  return Math.max(6, strokeWidth * 1.5 + 4);
};

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export const isInsideDiamond = ({ point, element }: args): boolean => {
  const x = point[0];
  const y = point[1];
  const elX = Number(element.get('x'));
  const elY = Number(element.get('y'));
  const elW = Number(element.get('width'));
  const elH = Number(element.get('height'));
  const hw = Math.abs(elW) / 2;
  const hh = Math.abs(elH) / 2;
  if (hw <= 0 || hh <= 0) return false;

  const cx = elX + elW / 2;
  const cy = elY + elH / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);

  if (!isShapeUnfilled(element)) {
    return dx / hw + dy / hh <= 1;
  }

  const tolerance = hitTolerance(element);
  const top = [cx, cy - hh];
  const right = [cx + hw, cy];
  const bottom = [cx, cy + hh];
  const left = [cx - hw, cy];

  const d1 = distToSegment(x, y, top[0], top[1], right[0], right[1]);
  const d2 = distToSegment(x, y, right[0], right[1], bottom[0], bottom[1]);
  const d3 = distToSegment(x, y, bottom[0], bottom[1], left[0], left[1]);
  const d4 = distToSegment(x, y, left[0], left[1], top[0], top[1]);

  return Math.min(d1, d2, d3, d4) <= tolerance;
};

