import { elementType } from '@/types/type';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './getSVGStroke';
import * as Y from 'yjs';
import canvasDoc from '@/Store/yjs-store';
import { Drawable } from 'roughjs/bin/core';
import { RoughCanvas } from 'roughjs/bin/canvas';
import { RoughGenerator } from 'roughjs/bin/generator';
import getStrokeLineDash from '@/lib/helperfunc/getStrokedLine';
import { BoundaryStyle } from '@/Store/store';
import { getPivotPoint } from '@/lib/math/pivot';
import { getBindingPosition, SnapLocation } from '@/lib/arrowSnap';
type DrawingArgs = {
  ctx: CanvasRenderingContext2D;
  element: Y.Map<unknown>;
  rc: RoughCanvas;
};

type CachedDrawable = { key: string; drawable: Drawable | null };
const drawableCache = new WeakMap<Y.Map<unknown>, CachedDrawable>();
const imageCache = new Map<string, HTMLImageElement>();

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
  const strokeWidth = Number(element.get('strokeWidth') ?? 2);
  const roughness = Number(element.get('roughness') ?? 0);
  const isFillTransparent = Boolean(element.get('isFillTransparent'));
  const fill = isFillTransparent ? '' : String(element.get('fillColor') || '');
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
    isFillTransparent,
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
  const uiGap = Number(element.get('fillWeight')) || 3;
  const minGap = 2;
  const maxGap = 40;
  const hachureGap = maxGap - (uiGap - minGap);

  const strokeColor = String(element.get('strokeColor') || '#1e293b');
  const strokeWidthVal = element.get('strokeWidth');
  const strokeWidth = (strokeWidthVal !== undefined && strokeWidthVal !== null) ? Number(strokeWidthVal) : 2;
  const roughnessVal = element.get('roughness');
  const roughness = (roughnessVal !== undefined && roughnessVal !== null) ? Number(roughnessVal) : 0;
  const boundaryStyle = String(element.get('boundaryStyle') || 'solid') as BoundaryStyle;

  const isTransparent = Boolean(element.get('isFillTransparent')) || element.get('fillColor') === 'transparent' || !element.get('fillColor');
  const fill = isTransparent ? undefined : String(element.get('fillColor'));
  const fillStyle = String(element.get('fillStyle') || 'solid');

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
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            roughness: roughness,
            ...(fill ? { fill, fillStyle } : {}),
            hachureGap: hachureGap,
            strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
          }
        );

      case elementType.Line: {
        const x1 = Number(element.get('x'));
        const y1 = Number(element.get('y'));
        const x2 = x1 + Number(element.get('width'));
        const y2 = y1 + Number(element.get('height'));
        return generator.line(x1, y1, x2, y2, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
        });
      }

      case elementType.Ellipse: {
        const x = Number(element.get('x'));
        const y = Number(element.get('y'));
        const width = Number(element.get('width'));
        const height = Number(element.get('height'));
        return generator.ellipse(x + width / 2, y + height / 2, width, height, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          ...(fill ? { fill, fillStyle } : {}),
          hachureGap: hachureGap,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
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

  // Apply opacity
  const opacity = element.get('opacity') as number | undefined;
  if (opacity !== undefined && opacity !== null) {
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  }

  // Apply shadow
  const hasShadow = element.get('hasShadow') as boolean | undefined;
  if (hasShadow) {
    const strokeColor = String(element.get('strokeColor') || '#000000');
    ctx.shadowColor = strokeColor + '88';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  }

  // Apply rotation
  const angle = Number(element.get('angle')) || 0;
  if (angle !== 0) {
    const elX = Number(element.get('x'));
    const elY = Number(element.get('y'));
    const elW = Number(element.get('width'));
    const elH = Number(element.get('height'));
    const axis = String(element.get('rotationAxis') || 'center');
    const [cx, cy] = getPivotPoint({ x: elX, y: elY, width: elW, height: elH }, axis);
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }

  if (type === elementType.Arrow || type === elementType.ArrowTwoWay) {
    let x1 = Number(element.get('x'));
    let y1 = Number(element.get('y'));
    let x2 = x1 + Number(element.get('width'));
    let y2 = y1 + Number(element.get('height'));

    const startBinding = element.get('startBinding') as { elementId: string; point: SnapLocation } | undefined;
    const endBinding = element.get('endBinding') as { elementId: string; point: SnapLocation } | undefined;
    const parentMap = (element.parent as Y.Map<Y.Map<unknown>> | undefined) || canvasDoc.yElement;
    if (parentMap) {
      if (startBinding) {
        const sp = getBindingPosition(startBinding, parentMap);
        if (sp) {
          x1 = sp[0];
          y1 = sp[1];
        }
      }
      if (endBinding) {
        const ep = getBindingPosition(endBinding, parentMap);
        if (ep) {
          x2 = ep[0];
          y2 = ep[1];
        }
      }
    }

    const strokeColor = String(element.get('strokeColor') || '#1e293b');
    const strokeWidthVal = element.get('strokeWidth');
    const strokeWidth = (strokeWidthVal !== undefined && strokeWidthVal !== null) ? Number(strokeWidthVal) : 2;
    const roughnessVal = element.get('roughness');
    const roughness = (roughnessVal !== undefined && roughnessVal !== null) ? Number(roughnessVal) : 0;
    const boundaryStyle = String(element.get('boundaryStyle') || 'solid') as BoundaryStyle;
    const isTwoWay = type === elementType.ArrowTwoWay || !!element.get('isTwoWay');

    const seed = parseInt(String(element.get('seed')), 10) || 1;
    const lineDrawable = withSeededMath(seed, () =>
      generator.line(x1, y1, x2, y2, {
        seed,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        roughness: roughness,
        strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
      })
    );
    rc.draw(lineDrawable);

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLen = Math.max(14, strokeWidth * 3.5);
    const arrowSpread = Math.PI / 6;

    const drawHead = (tipX: number, tipY: number, tipAngle: number) => {
      const xA = tipX - arrowLen * Math.cos(tipAngle - arrowSpread);
      const yA = tipY - arrowLen * Math.sin(tipAngle - arrowSpread);
      const xB = tipX - arrowLen * Math.cos(tipAngle + arrowSpread);
      const yB = tipY - arrowLen * Math.sin(tipAngle + arrowSpread);

      const headDrawable = withSeededMath(seed + 1, () =>
        generator.linearPath([[xA, yA], [tipX, tipY], [xB, yB]], {
          seed: seed + 1,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness === 0 ? 0 : Math.max(0.2, roughness * 0.7),
        })
      );
      rc.draw(headDrawable);
    };

    drawHead(x2, y2, angle);

    if (isTwoWay) {
      drawHead(x1, y1, angle + Math.PI);
    }

    ctx.restore();
    return;
  }

  if (type === elementType.Text) {
    const x = Number(element.get('x'));
    const y = Number(element.get('y'));
    const text = String(element.get('text') || '');
    const fontSize = Number(element.get('fontSize')) || 24;
    const fontFamily = String(element.get('fontFamily') || 'sans-serif');
    const textAlign = (element.get('textAlign') as CanvasTextAlign) || 'left';
    let fillColor = String(element.get('fillColor') || element.get('strokeColor') || '#000000');
    const lineHeight = Number(element.get('lineHeight')) || 1.3;

    if (!text) {
      ctx.restore();
      return;
    }

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    if (isDark) {
      if (!fillColor || fillColor === '#000000' || fillColor === 'black' || fillColor === '#000' || fillColor === '#1e293b' || fillColor === '#0f172a') {
        fillColor = '#f8fafc';
      }
    } else {
      if (!fillColor || fillColor === '#ffffff' || fillColor === 'white' || fillColor === '#fff' || fillColor === '#f8fafc' || fillColor === '#f1f5f9') {
        fillColor = '#0f172a';
      }
    }

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fillColor;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'top';

    const lines = text.split('\n');
    const lineSpacing = fontSize * lineHeight;

    lines.forEach((line, index) => {
      let lineX = x;
      if (textAlign === 'center') {
        const width = Number(element.get('width')) || 0;
        lineX = x + width / 2;
      } else if (textAlign === 'right') {
        const width = Number(element.get('width')) || 0;
        lineX = x + width;
      }
      ctx.fillText(line, lineX, y + index * lineSpacing);
    });

    ctx.restore();
    return;
  }

  if (type === elementType.Image) {
    const x = Number(element.get('x'));
    const y = Number(element.get('y'));
    const width = Number(element.get('width'));
    const height = Number(element.get('height'));
    const src = String(element.get('src') || '');

    if (src) {
      let img = imageCache.get(src);
      if (!img) {
        img = new Image();
        img.onload = () => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('canvas:redraw'));
          }
        };
        img.src = src;
        imageCache.set(src, img);
      }

      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, width, height);
      } else {
        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.fillRect(x, y, width, height);
        ctx.restore();
      }
    }

    ctx.restore();
    return;
  }

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

    if (!points || points.length === 0) {
      ctx.restore();
      return;
    }

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
