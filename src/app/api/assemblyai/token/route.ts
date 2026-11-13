import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error('[AssemblyAI Token] ASSEMBLYAI_API_KEY is not defined in environment variables');
    return NextResponse.json({ error: 'ASSEMBLYAI_API_KEY is not configured' }, { status: 500 });
  }

  try {
    console.log('[AssemblyAI Token] Minting temporary streaming token from AssemblyAI...');
    const response = await fetch('https://token.assemblyai.com/v1/token', {
      method: 'POST',
      headers: {
        Authorization: apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product: 'streaming',
        expires_in_seconds: 480, // 8 minutes validity window to connect
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AssemblyAI Token] Token minting failed:', response.status, errText);
      return NextResponse.json(
        { error: `AssemblyAI token error (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as { token: string; expires_in_seconds: number };
    console.log('[AssemblyAI Token] Successfully minted token for streaming v3');
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AssemblyAI Token] Exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

