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
import { getArrowLabelBounds } from '@/lib/utils/arrowLabel';
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

/**
 * Analyzes color luminance and ensures high visibility across light and dark themes.
 * Adapts dark tones (like black, dark slate, dark navy) to high-contrast crisp tones in dark mode,
 * and adapts white/near-white tones to dark slate in light mode, while preserving vibrant colors.
 */
export function getThemeAdaptedColor(rawColor: string, isDark: boolean): string {
  if (!rawColor || rawColor === 'transparent') return rawColor;

  const lower = rawColor.trim().toLowerCase();

  // Fast-path common neutrals
  if (isDark) {
    const darkNeutrals = ['#000000', '#000', 'black', '#1e293b', '#0f172a', '#020617', '#111827', '#18181b', '#171717', '#262626', '#334155'];
    if (darkNeutrals.includes(lower)) {
      return '#fafafa';
    }
  } else {
    const lightNeutrals = ['#ffffff', '#fff', 'white', '#f8fafc', '#fafafa', '#f1f5f9', '#fdfdfd'];
    if (lightNeutrals.includes(lower)) {
      return '#18181b';
    }
  }



  // Parse RGB or Hex to check perceived luminance
  let r = 0, g = 0, b = 0, hasColor = false;
  if (lower.startsWith('#')) {
    const hex = lower.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
      hasColor = true;
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      hasColor = true;
    }
  } else if (lower.startsWith('rgb')) {
    const match = lower.match(/\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
      if (parts.length >= 3) {
        r = parts[0];
        g = parts[1];
        b = parts[2];
        hasColor = true;
      }
    }
  }

  if (hasColor && !isNaN(r) && !isNaN(g) && !isNaN(b)) {
    // Standard perceived relative luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (isDark && luminance < 60) {
      return '#fafafa';
    }
    if (!isDark && luminance > 230) {
      return '#18181b';
    }
  }

  return rawColor;
}

export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const lower = color.trim().toLowerCase();

  if (lower.startsWith('#')) {
    let hex = lower.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${clamped})`;
      }
    }
  }

  if (lower.startsWith('rgb')) {
    const match = lower.match(/\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
      if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clamped})`;
      }
    }
  }

  return color;
}

 export const getTextColor = (fillColor:string |undefined , strokeColor : string | undefined, isDark : boolean):string =>{
   const defaultColor = isDark ? '#fafafa' : '#18181b';
      let txtColor = fillColor || strokeColor || defaultColor;
      if (isDark && (txtColor === '#000000' || txtColor === 'black' || txtColor === '#1e293b' || txtColor === '#0f172a')) {
        txtColor = '#fafafa';
      } else if (!isDark && (txtColor === '#ffffff' || txtColor === 'white' || txtColor === '#f8fafc' || txtColor === '#f1f5f9')) {
        txtColor = '#18181b';
      }
      return txtColor;
  }
function elementDrawKey(element: Y.Map<unknown>) {
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

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return JSON.stringify({
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
    isDark,
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

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const rawStroke = String(element.get('strokeColor') || '#1e293b');
  const strokeColor = getThemeAdaptedColor(rawStroke, isDarkMode);
  const strokeWidthVal = element.get('strokeWidth');
  const strokeWidth = (strokeWidthVal !== undefined && strokeWidthVal !== null) ? Number(strokeWidthVal) : 2;
  const roughnessVal = element.get('roughness');
  const roughness = (roughnessVal !== undefined && roughnessVal !== null) ? Number(roughnessVal) : 0;
  const boundaryStyle = String(element.get('boundaryStyle') || 'solid') as BoundaryStyle;

  const isTransparent = Boolean(element.get('isFillTransparent')) || element.get('fillColor') === 'transparent' || !element.get('fillColor');
  const fill = isTransparent ? undefined : String(element.get('fillColor'));
  const fillStyle = String(element.get('fillStyle') || 'solid');

  drawable = withSeededMath(seed, () => {
    const width = Number(element.get('width'));
    const height = Number(element.get('height'));

    switch (type) {
      case elementType.Rectangle:
        return generator.rectangle(
          0,
          0,
          width,
          height,
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

      case elementType.Diamond: {
        const cx = width / 2;
        const cy = height / 2;
        const diamondPts: [number, number][] = [
          [cx, 0],
          [width, cy],
          [cx, height],
          [0, cy],
        ];
        return generator.polygon(diamondPts, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          ...(fill ? { fill, fillStyle } : {}),
          hachureGap: hachureGap,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
        });
      }

      case elementType.RoundedRect: {
        const r = Math.min(18, Math.min(Math.abs(width), Math.abs(height)) / 3);
        const path = `M ${r} 0 ` +
          `H ${width - r} Q ${width} 0 ${width} ${r} ` +
          `V ${height - r} Q ${width} ${height} ${width - r} ${height} ` +
          `H ${r} Q 0 ${height} 0 ${height - r} ` +
          `V ${r} Q 0 0 ${r} 0 Z`;
        return generator.path(path, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          ...(fill ? { fill, fillStyle } : {}),
          hachureGap: hachureGap,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
        });
      }

      case elementType.Line: {
        return generator.line(0, 0, width, height, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
        });
      }

      case elementType.Ellipse: {
        return generator.ellipse(width / 2, height / 2, width, height, {
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let curLine = '';
    for (const w of words) {
      if (!w) continue;
      const testLine = curLine ? `${curLine} ${w}` : w;
      if (curLine && ctx.measureText(testLine).width > maxWidth) {
        lines.push(curLine);
        curLine = w;
      } else {
        curLine = testLine;
      }
    }
    if (curLine) lines.push(curLine);
  }
  return lines.length > 0 ? lines : [text];
}

function drawEmbeddedShapeLabel(ctx: CanvasRenderingContext2D, element: Y.Map<unknown>) {
  const label = String(element.get('text') || '').trim();
  if (!label) return;
  const isEditingThis =
    typeof window !== 'undefined' &&
    (window as unknown as { __canvas_editing_text_id?: string }).__canvas_editing_text_id ===
      element.get('id');
  if (isEditingThis) return;

  const x = Number(element.get('x'));
  const y = Number(element.get('y'));
  const width = Number(element.get('width'));
  const height = Number(element.get('height'));
  const type = element.get('type') as unknown as elementType;

  const fontSize = Number(element.get('fontSize')) || 14;
  const fontFamily = String(element.get('fontFamily') || 'sans-serif');
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const rawTextColor = String(element.get('strokeColor') || (isDark ? '#fafafa' : '#18181b'));
  const textColor = getThemeAdaptedColor(rawTextColor, isDark);

  ctx.save();
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let maxW = Math.max(30, width - 24);
  if (type === elementType.Diamond) {
    maxW = Math.max(30, width * 0.65 - 16);
  } else if (type === elementType.Ellipse) {
    maxW = Math.max(30, width * 0.72 - 16);
  }

  const lines = wrapText(ctx, label, maxW);
  const lineHeight = fontSize * 1.35;
  const totalTextH = lines.length * lineHeight;
  const startY = y + (height - totalTextH) / 2 + lineHeight / 2;
  const centerX = x + width / 2;

  lines.forEach((line, idx) => {
    ctx.fillText(line, centerX, startY + idx * lineHeight);
  });

  ctx.restore();
}

export const DrawElements = ({ ctx, element, rc }: DrawingArgs) => {
  const generator = rc.generator;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    ctx.shadowColor = withAlpha(getThemeAdaptedColor(strokeColor, isDark), 0.55);
    ctx.shadowBlur = 10 + (Number(element.get('strokeWidth')) || 2);
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

    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const rawStroke = String(element.get('strokeColor') || '#1e293b');
    const strokeColor = getThemeAdaptedColor(rawStroke, isDarkMode);
    const strokeWidthVal = element.get('strokeWidth');
    const strokeWidth = (strokeWidthVal !== undefined && strokeWidthVal !== null) ? Number(strokeWidthVal) : 2;
    const roughnessVal = element.get('roughness');
    const roughness = (roughnessVal !== undefined && roughnessVal !== null) ? Number(roughnessVal) : 0;
    const boundaryStyle = String(element.get('boundaryStyle') || 'solid') as BoundaryStyle;
    const isTwoWay = type === elementType.ArrowTwoWay || !!element.get('isTwoWay');

    const seed = parseInt(String(element.get('seed')), 10) || 1;
    const span = Math.hypot(x2 - x1, y2 - y1);
    const preferredHead = Math.max(12, strokeWidth * 3.5);
    const maxHead = span > 0 ? Math.max(6, span * (isTwoWay ? 0.3 : 0.42)) : preferredHead;
    const arrowLen = Math.min(preferredHead, maxHead);
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

    const rawControl = element.get('controlPoint') as { x: number; y: number } | undefined;
    const routing = String(element.get('routing') || (rawControl ? 'curved' : 'straight'));
    const isCurved = routing === 'curved' || !!rawControl;
    const isAngled = routing === 'angled';

    const cx = rawControl ? rawControl.x : (x1 + x2) / 2;
    const cy = rawControl ? rawControl.y : (y1 + y2) / 2;

    if (isCurved && (rawControl || routing === 'curved')) {
      const curveDrawable = withSeededMath(seed, () =>
        generator.path(`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
        })
      );
      rc.draw(curveDrawable);

      const endAngle = Math.atan2(y2 - cy, x2 - cx);
      const startAngle = Math.atan2(y1 - cy, x1 - cx);

      drawHead(x2, y2, endAngle);
      if (isTwoWay) {
        drawHead(x1, y1, startAngle);
      }
    } else if (isAngled) {
      const midX = (x1 + x2) / 2;
      const pathPoints: [number, number][] = [
        [x1, y1],
        [midX, y1],
        [midX, y2],
        [x2, y2],
      ];
      const angledDrawable = withSeededMath(seed, () =>
        generator.linearPath(pathPoints, {
          seed,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          roughness: roughness,
          strokeLineDash: getStrokeLineDash(boundaryStyle, strokeWidth),
        })
      );
      rc.draw(angledDrawable);

      const endAngle = Math.atan2(y2 - y2, x2 - midX);
      drawHead(x2, y2, endAngle);
      if (isTwoWay) {
        const startAngle = Math.atan2(y1 - y1, x1 - midX);
        drawHead(x1, y1, startAngle);
      }
    } else {
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
      drawHead(x2, y2, angle);
      if (isTwoWay) {
        drawHead(x1, y1, angle + Math.PI);
      }
    }

    const labelText = String(element.get('text') || '').trim();
    const isEditingThis = typeof window !== 'undefined' && (window as unknown as { __canvas_editing_text_id?: string }).__canvas_editing_text_id === element.get('id');

    if (labelText && !isEditingThis) {
      const bounds = getArrowLabelBounds(element, parentMap, ctx);
      if (bounds) {
        ctx.save();
        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const bgFill = isDark ? '#121214' : '#ffffff';
        const textColor = isDark ? '#fafafa' : '#18181b';
        const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

        // Draw pill/badge background to mask the arrow line seamlessly
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 6);
        } else {
          ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
        ctx.fillStyle = bgFill;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text lines centered inside the pill
        ctx.font = `600 ${bounds.fontSize}px ${bounds.fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lineHeight = bounds.fontSize * 1.35;
        const centerX = bounds.x + bounds.width / 2;
        const startY = bounds.y + (bounds.height - (bounds.lines.length - 1) * lineHeight) / 2;

        bounds.lines.forEach((line, idx) => {
          ctx.fillText(line, centerX, startY + idx * lineHeight);
        });
        ctx.restore();
      }
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
    fillColor = getThemeAdaptedColor(fillColor, isDark);

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

    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
      pathLength += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }

    const brushSize = Math.max(1, Number(element.get('strokeWidth')) || 2) * 2;
    const endTaper = Math.min(brushSize * 6, pathLength * 0.35);

    const options = {
      size: brushSize,
      thinning: 0.45,
      smoothing: 0.55,
      streamline: 0.5,
      easing: (t: number) => t,
      start: { taper: 0, easing: (t: number) => t, cap: true },
      end: { taper: endTaper, easing: (t: number) => t, cap: true },
    };

    const normalizedPoints = points.map(([x, y, pressure]) => ({
      x: Number(x),
      y: Number(y),
      pressure: pressure ?? 0.5,
    }));

    const stroke = getStroke(normalizedPoints, options);
    const path = getSvgPathFromStroke(stroke);

    const path2D = new Path2D(path);

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const rawStroke = String(element.get('strokeColor') || '#1e293b');
    ctx.fillStyle = getThemeAdaptedColor(rawStroke, isDark);
    ctx.fill(path2D);

    ctx.translate(-x, -y);
    ctx.restore();
    return;
  }

  const elX = Number(element.get('x'));
  const elY = Number(element.get('y'));
  ctx.translate(elX, elY);

  const drawable = getOrCreateDrawable(generator, element);
  if (drawable) {
    rc.draw(drawable);
  } else {
    const seed = parseInt(String(element.get('seed')), 10) || 0;
    const fallbackDrawable = withSeededMath(seed, () =>
      generator.rectangle(
        0,
        0,
        Number(element.get('width')),
        Number(element.get('height')),
        {
          seed,
          stroke: getThemeAdaptedColor(String(element.get('strokeColor') || '#1e293b'), typeof document !== 'undefined' && document.documentElement.classList.contains('dark')),
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

  ctx.translate(-elX, -elY);

  // Draw embedded text label if present
  drawEmbeddedShapeLabel(ctx, element);

  ctx.restore();
};
