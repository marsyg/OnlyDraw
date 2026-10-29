import * as Y from 'yjs';
import { actionType, elementType, point } from '@/types/type';
import { getTextColor } from '@/lib/utils/drawingUtility/drawElement';
import { handleDrawElement } from '@/lib/handleElement';
import yUtils from '@/lib/utils/createYElement';
import { LOCAL_ORIGIN } from '@/Store/yjs-store';

export interface TextElementStyleOptions {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillStyle?: string;
  roughness?: number;
  boundaryStyle?: string;
  fillWeight?: number;
  opacity?: number;
  hasShadow?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface CreateTextElementArgs {
  /** Top-left corner of the text element */
  startPoint: point;
  /** Bottom-right corner (determines width/height) */
  endPoint: point;
  /** Initial text content — empty string for inline editing */
  text: string;
  isDark: boolean;
  style: TextElementStyleOptions;
  doc: Y.Doc;
  yElement: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
}

/**
 * Creates a text element in the Y.js doc and returns the created Y.Map.
 *
 * This consolidates the repeated pattern of:
 *   getTextColor → handleDrawElement → doc.transact → yUtils.createYElement → yElement.set → order.push
 *
 * Returns `null` if element creation fails.
 */

export function createTextElement({
  startPoint,
  endPoint,
  text,
  isDark,
  style,
  doc,
  yElement,
  order,
}: CreateTextElementArgs): Y.Map<unknown> | null {
  const txtColor = getTextColor(style.fillColor, style.strokeColor, isDark);

  const textElement = handleDrawElement({
    action: actionType.Drawing,
    element: elementType.Text,
    startPoint,
    endPoint,
    options: {
      strokeColor: txtColor,
      strokeWidth: style.strokeWidth ?? 2,
      fillColor: txtColor,
      fillStyle: style.fillStyle ?? 'solid',
      roughness: style.roughness ?? 0,
      boundaryStyle: style.boundaryStyle ?? 'solid',
      fillWeight: style.fillWeight ?? 3,
      opacity: style.opacity ?? 1,
      hasShadow: style.hasShadow ?? false,
      text,
      fontSize: style.fontSize ?? 24,
      fontFamily: style.fontFamily ?? 'sans-serif',
      textAlign: style.textAlign ?? 'left',
    },
  });

  if (!textElement) return null;

  let createdYEl: Y.Map<unknown> | null = null;
  doc.transact(() => {
    createdYEl = yUtils.createYElement(textElement);
    if (createdYEl) {
      yElement.set(textElement.id, createdYEl);
      order.push([textElement.id]);
    }
  }, LOCAL_ORIGIN);

  return createdYEl;
}
