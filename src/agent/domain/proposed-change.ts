import { Op } from './op';
import type { DiagramTheme } from './plan';

export type Box = { x: number; y: number; w: number; h: number };

export type ProposedChange = {
  runId: string;
  ops: Op[];
  bbox: Box;
  summary: string;
  theme?: DiagramTheme;
};
