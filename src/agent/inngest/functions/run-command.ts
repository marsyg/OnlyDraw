import { randomUUID } from 'node:crypto';
import { inngest } from '@/agent/inngest/client';
import { events } from '@/agent/inngest/events';
import { intentAgentAsync } from '@/agent/inngest/agents/intent';
import { plannerAgentAsync } from '@/agent/inngest/agents/planner';
import { compilePlan } from '@/agent/pipeline/compile';

export const runCommandFn = inngest.createFunction(
  {
    id: 'agent-run-command',
    name: 'Agent: run command',
    triggers: [{ event: events.commandReceived }],
  },
  async ({ event, step }) => {
    const data = (event.data ?? {}) as {
      text?: string;
      canEdit?: boolean;
      commandId?: string;
      roomId?: string;
    };
    const commandId = data.commandId ?? randomUUID();

    const classifyResult = await step.run('intent', () =>
      intentAgentAsync(data.text ?? '', {
        selectionIds: [],
        canEdit: data.canEdit !== false,
      }),
    );
    const intent = classifyResult.intent;

    if (intent.kind !== 'act' || intent.subject === 'greeting') {
      await step.sendEvent('run-completed', {
        name: events.runCompleted,
        data: { commandId, intent, change: null },
      });
      return { commandId, intent, change: null };
    }

    const plan = await step.run('plan', () =>
      plannerAgentAsync(
        { ...intent, rawCommand: intent.rawCommand || data.text },
        {
          elements: [],
          roomId: data.roomId ?? 'unknown',
        },
      ),
    );

    if (!plan) {
      await step.sendEvent('run-completed', {
        name: events.runCompleted,
        data: { commandId, intent, change: null },
      });
      return { commandId, intent, change: null };
    }

    const change = await step.run('compile', () => compilePlan(plan, commandId));

    await step.sendEvent('run-completed', {
      name: events.runCompleted,
      data: { commandId, intent, change },
    });

    return { commandId, intent, change };
  },
);
