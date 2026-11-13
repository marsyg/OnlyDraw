export type DiagramTheme = 'clean' | 'sketch' | 'vibrant' | 'monochrome';

export type FlowPlan = {
  kind: 'flow';
  theme: DiagramTheme;
  direction?: 'RIGHT' | 'DOWN';
  nodes: {
    id: string;
    label: string;
    role: 'process' | 'decision' | 'terminal';
  }[];
  edges: { from: string; to: string; label?: string }[];
};

export type MutatePlan = {
  kind: 'mutate';
  action: 'delete' | 'restyle' | 'move' | 'theme';
  theme?: DiagramTheme;
  targetIds?: string[];
  dx?: number;
  dy?: number;
  summary?: string;
};

export type Plan = FlowPlan | MutatePlan;
