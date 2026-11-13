export type ElementSummary = {
  id: string;
  type: string;
  bbox: { x: number; y: number; w: number; h: number };
  label: string | undefined;
  locked: boolean;
};