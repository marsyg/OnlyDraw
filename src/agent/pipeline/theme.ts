import type { DiagramTheme } from '@/agent/domain/plan';
import type { ArrowStyle, ShapeStyle } from '@/agent/domain/op';

export type NodeRole = 'process' | 'decision' | 'terminal';

export type ThemeDefinition = {
  id: DiagramTheme;
  label: string;
  shape: (role: NodeRole) => ShapeStyle;
  arrow: ArrowStyle;
};

const CLEAN: ThemeDefinition = {
  id: 'clean',
  label: 'Clean',
  shape: (role) => {
    if (role === 'terminal') {
      return {
        fillColor: '#dcfce7',
        strokeColor: '#16a34a',
        fillStyle: 'solid',
        fillWeight: 3,
        boundaryStyle: 'solid',
        roughness: 0,
        strokeWidth: 2,
        opacity: 1,
        hasShadow: false,
      };
    }
    if (role === 'decision') {
      return {
        fillColor: '#fef3c7',
        strokeColor: '#d97706',
        fillStyle: 'solid',
        fillWeight: 3,
        boundaryStyle: 'solid',
        roughness: 0,
        strokeWidth: 2,
        opacity: 1,
        hasShadow: false,
      };
    }
    return {
      fillColor: '#dbeafe',
      strokeColor: '#2563eb',
      fillStyle: 'solid',
      fillWeight: 3,
      boundaryStyle: 'solid',
      roughness: 0,
      strokeWidth: 2,
      opacity: 1,
      hasShadow: false,
    };
  },
  arrow: {
    strokeColor: '#475569',
    strokeWidth: 2,
    roughness: 0,
    opacity: 1,
    hasShadow: false,
    boundaryStyle: 'solid',
    routing: 'angled',
  },
};

const SKETCH: ThemeDefinition = {
  id: 'sketch',
  label: 'Sketch',
  shape: (role) => {
    const base = {
      fillStyle: 'hachure',
      fillWeight: 4,
      boundaryStyle: 'solid',
      roughness: 1.4,
      strokeWidth: 2,
      opacity: 1,
      hasShadow: false,
    };
    if (role === 'terminal') return { ...base, fillColor: '#dcfce7', strokeColor: '#15803d' };
    if (role === 'decision') return { ...base, fillColor: '#fef3c7', strokeColor: '#b45309' };
    return { ...base, fillColor: '#dbeafe', strokeColor: '#1d4ed8' };
  },
  arrow: {
    strokeColor: '#334155',
    strokeWidth: 2,
    roughness: 1.2,
    opacity: 1,
    hasShadow: false,
    boundaryStyle: 'solid',
    routing: 'curved',
  },
};

const VIBRANT: ThemeDefinition = {
  id: 'vibrant',
  label: 'Vibrant',
  shape: (role) => {
    const base = {
      fillStyle: 'solid',
      fillWeight: 3,
      boundaryStyle: 'solid',
      roughness: 0,
      strokeWidth: 2.5,
      opacity: 1,
      hasShadow: true,
    };
    if (role === 'terminal') return { ...base, fillColor: '#bbf7d0', strokeColor: '#15803d' };
    if (role === 'decision') return { ...base, fillColor: '#fde68a', strokeColor: '#b45309' };
    return { ...base, fillColor: '#bfdbfe', strokeColor: '#1d4ed8' };
  },
  arrow: {
    strokeColor: '#1e293b',
    strokeWidth: 2.5,
    roughness: 0,
    opacity: 1,
    hasShadow: true,
    boundaryStyle: 'solid',
    routing: 'angled',
  },
};

const MONOCHROME: ThemeDefinition = {
  id: 'monochrome',
  label: 'Monochrome',
  shape: (role) => {
    const base = {
      fillStyle: 'solid',
      fillWeight: 3,
      roughness: 0,
      strokeWidth: 2,
      opacity: 1,
      hasShadow: false,
    };
    if (role === 'terminal') {
      return { ...base, fillColor: '#cbd5e1', strokeColor: '#334155', boundaryStyle: 'solid' };
    }
    if (role === 'decision') {
      return { ...base, fillColor: '#f8fafc', strokeColor: '#334155', boundaryStyle: 'dashed' };
    }
    return { ...base, fillColor: '#e2e8f0', strokeColor: '#334155', boundaryStyle: 'solid' };
  },
  arrow: {
    strokeColor: '#334155',
    strokeWidth: 2,
    roughness: 0,
    opacity: 1,
    hasShadow: false,
    boundaryStyle: 'solid',
    routing: 'straight',
  },
};

const THEMES: Record<DiagramTheme, ThemeDefinition> = {
  clean: CLEAN,
  sketch: SKETCH,
  vibrant: VIBRANT,
  monochrome: MONOCHROME,
};

export const DIAGRAM_THEMES = Object.keys(THEMES) as DiagramTheme[];

export function isDiagramTheme(value: unknown): value is DiagramTheme {
  return typeof value === 'string' && value in THEMES;
}

export function resolveTheme(theme?: string): ThemeDefinition {
  return isDiagramTheme(theme) ? THEMES[theme] : CLEAN;
}
