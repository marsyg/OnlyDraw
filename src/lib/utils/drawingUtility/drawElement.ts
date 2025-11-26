import { elementType } from '@/types/type';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './getSVGStroke';
import * as Y from 'yjs';
import { Drawable } from 'roughjs/bin/core';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { RoughGenerator } from 'roughjs/bin/generator';
import getStrokeLineDash from '@/lib/helperfunc/getStrokedLine';
import { BoundaryStyle } from '@/Store/store';
type DrawingArgs = {
  ctx: CanvasRenderingContext2D;
  element: Y.Map<unknown>;
  rc: RoughCanvas;
};

type CachedDrawable = { key: string; drawable: Drawable | null };
const drawableCache = new WeakMap<Y.Map<unknown>, CachedDrawable>();

// ---------- Small deterministic PRNG (mulberry32) & helper ----------
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeededMath<T>(seed: number, fn: () => T): T {
  const originalRandom = Math.random;
  try {
    const s = seed >>> 0 || 1;
    Math.random = mulberry32(s) as unknown as () => number;
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

function elementDrawKey(element: Y.Map<unknown>) {
  const x = Number(element.get('x'));
  const y = Number(element.get('y'));
  const width = Number(element.get('width'));
  const height = Number(element.get('height'));
  const seed = Number(element.get('seed')) || 0;
  const stroke = String(element.get('strokeColor') || '');
  const strokeWidth = Number(element.get('strokeWidth') || 0);
  const roughness = Number(element.get('roughness') || 0);
  const fill = String(element.get('fillColor') || '');
  const fillStyle = String(element.get('fillStyle') || '');
  const fillWeight = Number(element.get('fillWeight') || 0);
  const boundaryStyle = String(element.get('boundaryStyle') || '');

  return JSON.stringify({
    x,
    y,
    width,
    height,
    seed,
    stroke,
    strokeWidth,
    roughness,
    fill,
    fillStyle,
    fillWeight,
    boundaryStyle,
  });
}

function getOrCreateDrawable(
  generator: RoughGenerator,
  element: Y.Map<unknown>
) {
  const key = elementDrawKey(element);
  const cached = drawableCache.get(element);
  if (cached && cached.key === key) {
    return cached.drawable;
  }

  const type = element.get('type') as unknown as elementType;
  const seed = parseInt(String(element.get('seed')), 10) || 0;

  let drawable: Drawable | null = null;
  const uiGap = Number(element.get('fillWeight'));
  const minGap = 2;
  const maxGap = 40;
  const hachureGap = maxGap - (uiGap - minGap);
  drawable = withSeededMath(seed, () => {
    switch (type) {
      case elementType.Rectangle:
        return generator.rectangle(
          Number(element.get('x')),
          Number(element.get('y')),
          Number(element.get('width')),
          Number(element.get('height')),
          {
            seed,
            stroke: String(element.get('strokeColor')),
            strokeWidth: Number(element.get('strokeWidth')),
            roughness: Number(element.get('roughness')),
            fill: String(element.get('fillColor')),
            fillStyle: String(element.get('fillStyle')),
            hachureGap: hachureGap,
            strokeLineDash: getStrokeLineDash(
              String(element.get('boundaryStyle')) as BoundaryStyle,
              Number(element.get('strokeWidth'))
            ),
          }
        );

      case elementType.Line: {
        const x1 = Number(element.get('x'));
        const y1 = Number(element.get('y'));
        const x2 = x1 + Number(element.get('width'));
        const y2 = y1 + Number(element.get('height'));
        return generator.line(x1, y1, x2, y2, {
          seed,
          stroke: String(element.get('strokeColor')),
          strokeWidth: Number(element.get('strokeWidth')),
          roughness: Number(element.get('roughness')),
          strokeLineDash: getStrokeLineDash(
            String(element.get('boundaryStyle')) as BoundaryStyle,
            Number(element.get('strokeWidth'))
          ),
        });
      }

      case elementType.Ellipse: {
        const x = Number(element.get('x'));
        const y = Number(element.get('y'));
        const width = Number(element.get('width'));
        const height = Number(element.get('height'));
        return generator.ellipse(x + width / 2, y + height / 2, width, height, {
          seed,
          stroke: String(element.get('strokeColor')),
          strokeWidth: Number(element.get('strokeWidth')),
          roughness: Number(element.get('roughness')),
          fill: String(element.get('fillColor')),
          fillStyle: String(element.get('fillStyle')),
          hachureGap: hachureGap,
          strokeLineDash: getStrokeLineDash(
            String(element.get('boundaryStyle')) as BoundaryStyle,
            Number(element.get('strokeWidth'))
          ),
        });
      }

      case elementType.Freehand: {
        return null;
      }

      default:
        return null;
    }
  });

  drawableCache.set(element, { key, drawable });
  return drawable;
}

export const DrawElements = ({ ctx, element, rc }: DrawingArgs) => {
  const generator = rc.generator;

  ctx.save();
  const type = element.get('type') as unknown as elementType;

  if (type === elementType.Freehand) {
    const x = Number(element.get('x'));
    const y = Number(element.get('y'));

    ctx.translate(x, y);
    const strokeData = element.get('points') as Y.Array<Y.Map<number>>;
    const points = strokeData
      .toArray()
      .map((p) => [
        Number(p.get('x')),
        Number(p.get('y')),
        Number(p.get('pressure') ?? 0.5),
      ]);

    if (!points) return;

    const options = {
      size: Number(element.get('strokeWidth')),
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t: number) => t,
      start: { taper: 0, easing: (t: number) => t, cap: true },
      end: { taper: 100, easing: (t: number) => t, cap: true },
    };

    const normalizedPoints = points.map(([x, y, pressure]) => ({
      x: Number(x),
      y: Number(y),
      pressure: pressure ?? 1,
    }));

    const stroke = getStroke(normalizedPoints, options);
    const path = getSvgPathFromStroke(stroke);

    const path2D = new Path2D(path);

    ctx.fillStyle = String(element.get('strokeColor'));
    ctx.fill(path2D);

    ctx.translate(-x, -y);
    ctx.restore();
    return;
  }

  const drawable = getOrCreateDrawable(generator, element);
  if (drawable) {
    rc.draw(drawable);
  } else {
    const seed = parseInt(String(element.get('seed')), 10) || 0;
    const fallbackDrawable = withSeededMath(seed, () =>
      generator.rectangle(
        Number(element.get('x')),
        Number(element.get('y')),
        Number(element.get('width')),
        Number(element.get('height')),
        {
          seed,
          stroke: String(element.get('strokeColor')),
          strokeWidth: Number(element.get('strokeWidth')),
          roughness: Number(element.get('roughness')),
          fill: String(element.get('fillColor')),
          fillStyle: String(element.get('fillStyle')),
          hachureGap: Number(element.get('fillWeight')),
          strokeLineDash: getStrokeLineDash(
            String(element.get('fillStyle')) as BoundaryStyle,
            Number(element.get('strokeWidth'))
          ),
        }
      )
    );
    if (fallbackDrawable) rc.draw(fallbackDrawable);
  }

  ctx.restore();
};
