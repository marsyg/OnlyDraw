import type { DiagramTheme } from '@/agent/domain/plan';

export type DiagramPreset = {
  id: string;
  label: string;
  theme: DiagramTheme;
  direction: 'RIGHT' | 'DOWN';
  nodeDefaults: { minW: number; minH: number };
  edgeDefaults: { routing: 'straight' | 'curved' | 'angled' };
};

export const DIAGRAM_PRESETS: DiagramPreset[] = [
  {
    id: 'flow-horizontal',
    label: 'Horizontal Flow',
    theme: 'clean',
    direction: 'RIGHT',
    nodeDefaults: { minW: 150, minH: 64 },
    edgeDefaults: { routing: 'angled' },
  },
  {
    id: 'flow-vertical',
    label: 'Vertical Hierarchy',
    theme: 'clean',
    direction: 'DOWN',
    nodeDefaults: { minW: 160, minH: 64 },
    edgeDefaults: { routing: 'angled' },
  },
  {
    id: 'sketch-architecture',
    label: 'Sketch Architecture',
    theme: 'sketch',
    direction: 'RIGHT',
    nodeDefaults: { minW: 160, minH: 70 },
    edgeDefaults: { routing: 'curved' },
  },
  {
    id: 'vibrant-product',
    label: 'Vibrant Journey',
    theme: 'vibrant',
    direction: 'RIGHT',
    nodeDefaults: { minW: 170, minH: 72 },
    edgeDefaults: { routing: 'angled' },
  },
  {
    id: 'monochrome-spec',
    label: 'Monochrome Spec',
    theme: 'monochrome',
    direction: 'DOWN',
    nodeDefaults: { minW: 150, minH: 60 },
    edgeDefaults: { routing: 'straight' },
  },
];

export function getPresetById(id: string): DiagramPreset {
  return DIAGRAM_PRESETS.find((p) => p.id === id) || DIAGRAM_PRESETS[0];
}

