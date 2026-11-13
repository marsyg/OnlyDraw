import { serve } from 'inngest/next';
import { inngest } from '@/agent/inngest/client';
import { runCommandFn } from '@/agent/inngest/functions/run-command';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runCommandFn],
});
