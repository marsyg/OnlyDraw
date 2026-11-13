import { describe, it, expect } from 'vitest';
import fs from 'fs';

// Load .env
const envContent = fs.readFileSync('.env', 'utf8');
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

import { POST } from '@/app/api/agent/route';

describe('/api/agent endpoint live check', () => {
  it('handles "create a user onboarding flow" and returns completed diagram', async () => {
    const req = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'create a user onboarding flow',
        canEdit: true,
        selectionIds: [],
        elements: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    console.log('Result payload for onboarding:', {
      status: data.status,
      source: data.source,
      intentKind: data.intent?.kind,
      nodesCount: data.plan?.nodes?.length,
      opsCount: data.change?.ops?.length,
      summary: data.summary,
      issues: data.issues,
    });

    expect(data.status).toBe('completed');
    expect(data.intent?.kind).toBe('act');
    expect(data.plan?.kind).toBe('flow');
    expect(data.plan?.nodes?.length).toBeGreaterThan(0);
    expect(data.change?.ops?.length).toBeGreaterThan(0);
  }, 45000);

  it('handles "hi there" and returns chat', async () => {
    const req = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'hi there',
        canEdit: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('completed');
    expect(data.intent?.kind).toBe('chat');
  });
});

