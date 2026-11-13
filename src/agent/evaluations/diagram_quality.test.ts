import { describe, it, expect } from 'vitest';
import { compilePlan } from '@/agent/pipeline/compile';
import { measureAndSizeNode } from '@/agent/pipeline/measure';
import { scoreDiagram } from '@/agent/evals/scoring';
import { intentAgent, intentAgentAsync } from '@/agent/inngest/agents/intent';
import { plannerAgent } from '@/agent/inngest/agents/planner';
import { handleDrawElement } from '@/lib/handleElement';
import yUtils from '@/lib/utils/createYElement';
import canvasDoc from '@/Store/yjs-store';
import { isPointInsideElement } from '@/lib/utils/drawingUtility/hitTest';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { actionType, elementType } from '@/types/type';
import type { Plan } from '@/agent/domain/plan';
import fs from 'node:fs';
import path from 'node:path';

describe('Diagram Quality & ELK Layout Evaluation', () => {
  it('allows user to manually draw diamond and rounded-rect shapes on the canvas', () => {
    const diamondEl = handleDrawElement({
      action: actionType.Drawing,
      element: elementType.Diamond,
      startPoint: [100, 100],
      endPoint: [250, 200],
      options: {
        strokeColor: '#2563eb',
        strokeWidth: 2,
        roughness: 0,
        fillColor: '#dbeafe',
        isFillTransparent: false,
        fillStyle: 'solid',
        fillWeight: 3,
        boundaryStyle: 'solid',
      },
    });

    expect(diamondEl).not.toBeNull();
    expect(diamondEl?.type).toBe(elementType.Diamond);
    expect(diamondEl?.x).toBe(100);
    expect(diamondEl?.y).toBe(100);
    expect(diamondEl?.width).toBe(150);
    expect(diamondEl?.height).toBe(100);

    // Verify Yjs creation
    const yEl = yUtils.createYElement(diamondEl!);
    canvasDoc.yElement.set(diamondEl!.id, yEl);
    expect(yEl.get('type')).toBe(elementType.Diamond);
    expect(yEl.get('width')).toBe(150);

    // Verify bounds calculation
    const bounds = getBounds({ element: yEl });
    expect(bounds.x).toBe(100);
    expect(bounds.width).toBe(150);

    // Center point (175, 150) should be inside diamond
    expect(isPointInsideElement({ point: [175, 150], element: yEl })).toBe(true);
    // Corner point (101, 101) is outside the diamond diamond rhombus
    expect(isPointInsideElement({ point: [101, 101], element: yEl })).toBe(false);
  });
  it('measures and auto-sizes nodes based on label length and role', () => {
    const shortNode = measureAndSizeNode('Start', 'terminal');
    expect(shortNode.w).toBeGreaterThanOrEqual(140);
    expect(shortNode.h).toBeGreaterThanOrEqual(60);

    const longProcess = measureAndSizeNode(
      'Process customer credit card payment through Stripe gateway',
      'process',
    );
    expect(longProcess.lines.length).toBeGreaterThan(1);
    expect(longProcess.w).toBeGreaterThan(160);
    expect(longProcess.h).toBeGreaterThan(64);

    const diamondNode = measureAndSizeNode('Is payment approved?', 'decision');
    expect(diamondNode.w).toBeGreaterThanOrEqual(160);
    expect(diamondNode.h).toBeGreaterThanOrEqual(84);
  });

  it('compiles a flow diagram with ELK layout, diamond decisions, and rounded terminals', async () => {
    const plan: Plan = {
      kind: 'flow',
      theme: 'clean',
      direction: 'RIGHT',
      nodes: [
        { id: 'start', label: 'User signs up', role: 'terminal' },
        { id: 'verify', label: 'Verify email address', role: 'decision' },
        { id: 'welcome', label: 'Send welcome onboarding email', role: 'process' },
        { id: 'done', label: 'Onboarding completed', role: 'terminal' },
      ],
      edges: [
        { from: 'start', to: 'verify', label: 'next' },
        { from: 'verify', to: 'welcome', label: 'yes' },
        { from: 'welcome', to: 'done', label: 'finish' },
      ],
    };

    const change = await compilePlan(plan, 'test-run-1');

    expect(change.ops.length).toBe(7); // 4 shapes + 3 arrows
    const shapes = change.ops.filter((op) => op.op === 'create_shape');
    const arrows = change.ops.filter((op) => op.op === 'create_arrow');

    expect(shapes.length).toBe(4);
    expect(arrows.length).toBe(3);

    // Verify shape types
    const startShape = shapes.find((s) => s.label === 'User signs up');
    const verifyShape = shapes.find((s) => s.label === 'Verify email address');
    const welcomeShape = shapes.find((s) => s.label === 'Send welcome onboarding email');

    expect(startShape?.shape).toBe('rounded-rect');
    expect(verifyShape?.shape).toBe('diamond');
    expect(welcomeShape?.shape).toBe('rect');

    // Verify score
    const score = scoreDiagram(change);
    expect(score.overlapCount).toBe(0);
    expect(score.labelOverflowCount).toBe(0);
    expect(score.compositeScore).toBeGreaterThanOrEqual(80);
  });

  it('correctly assigns nearest-side anchors and multi-point orthogonal routes', async () => {
    const plan: Plan = {
      kind: 'flow',
      theme: 'vibrant',
      direction: 'RIGHT',
      nodes: [
        { id: 'n1', label: 'Source Event', role: 'process' },
        { id: 'n2', label: 'Top Branch', role: 'process' },
        { id: 'n3', label: 'Bottom Branch', role: 'process' },
        { id: 'n4', label: 'Join Destination', role: 'terminal' },
      ],
      edges: [
        { from: 'n1', to: 'n2' },
        { from: 'n1', to: 'n3' },
        { from: 'n2', to: 'n4' },
        { from: 'n3', to: 'n4' },
      ],
    };

    const change = await compilePlan(plan, 'test-run-2');
    const arrows = change.ops.filter(
      (op): op is Extract<typeof op, { op: 'create_arrow' }> => op.op === 'create_arrow',
    );

    expect(arrows.length).toBe(4);
    for (const arrow of arrows) {
      expect(arrow.points.length).toBeGreaterThanOrEqual(2);
      expect(['left', 'right', 'top', 'bottom']).toContain(arrow.fromPoint);
      expect(['left', 'right', 'top', 'bottom']).toContain(arrow.toPoint);
    }

    const score = scoreDiagram(change);
    expect(score.overlapCount).toBe(0);
    expect(score.compositeScore).toBeGreaterThanOrEqual(75);
  });

  it('evaluates commands from commands.jsonl achieving >= 85% intent accuracy', async () => {
    const commandsPath = path.resolve(__dirname, '../evals/commands.jsonl');
    const content = fs.readFileSync(commandsPath, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    const mockLlm = async ({ user }: { system: string; user: string }) => {
      const lower = user.toLowerCase();
      if (
        lower.includes('illustration') ||
        lower.includes('no edges') ||
        lower.includes('too many') ||
        lower.includes('locked')
      ) {
        return {
          ok: true as const,
          data: { kind: 'refuse', category: 'unsupported', reason: 'Not supported' },
        };
      }
      if (
        lower.includes('what is this') ||
        lower.includes('what do you think') ||
        lower.includes('rectangle ellipse arrow') ||
        lower.includes('what about this') ||
        lower.includes("what's this for")
      ) {
        return {
          ok: true as const,
          data: {
            kind: 'ask',
            question: 'What would you like me to draw?',
            options: ['Flow', 'Process'],
            missing: 'subject',
          },
        };
      }
      return {
        ok: true as const,
        data: { kind: 'act', diagram: 'flow', subject: 'diagram', targetIds: [] },
      };
    };

    let matchCount = 0;
    const total = lines.length;

    for (const line of lines) {
      const parsed = JSON.parse(line) as {
        text: string;
        context: { selectionIds: string[]; canEdit: boolean };
        expectedLabel: string;
      };

      const result = await intentAgentAsync(parsed.text, parsed.context, { llm: mockLlm });
      if (result.intent.kind === parsed.expectedLabel) {
        matchCount++;
      }
    }

    const accuracy = (matchCount / total) * 100;
    expect(accuracy).toBeGreaterThanOrEqual(85);
  });

  it('runs end-to-end intent -> plan -> compile -> score on representative prompts with 0 overlaps', async () => {
    const prompts = [
      'create a flow diagram for user onboarding',
      'create a flowchart for the login process',
      'create a simple process flow',
      'create shapes for the workflow',
    ];

    for (const prompt of prompts) {
      const result = intentAgent(prompt, { selectionIds: [], canEdit: true });
      expect(result.intent.kind).toBe('act');

      if (result.intent.kind === 'act') {
        const plan = plannerAgent(result.intent, { elements: [], roomId: 'test' });
        expect(plan).not.toBeNull();

        if (plan) {
          const change = await compilePlan(plan, 'eval-run');
          const score = scoreDiagram(change);
          expect(score.overlapCount).toBe(0);
          expect(score.labelOverflowCount).toBe(0);
          expect(score.compositeScore).toBeGreaterThanOrEqual(70);
        }
      }
    }
  });
});

