import { NextRequest, NextResponse } from 'next/server';

interface TranscribeRequestBody {
  audio: string;
  language?: string[];
  context?: {
    app?: { type: 'ai' | 'email' | 'other' };
    dictionary_context?: string[];
    textbox_contents?: {
      before_text?: string;
      selected_text?: string;
      after_text?: string;
    };
    user_identifier?: string;
  };
}

async function transcribeWithAssemblyAI(base64Audio: string, apiKey: string): Promise<string | null> {
  try {
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    console.log('[Transcribe API] Uploading audio to AssemblyAI (size:', audioBuffer.length, 'bytes)...');

    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        Authorization: apiKey.trim(),
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    });

    if (!uploadRes.ok) {
      console.warn('[Transcribe API] AssemblyAI audio upload failed:', uploadRes.status);
      return null;
    }

    const { upload_url } = (await uploadRes.json()) as { upload_url: string };
    console.log('[Transcribe API] AssemblyAI uploaded URL obtained:', upload_url);

    // Request transcript
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        Authorization: apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speech_model: 'universal-2',
      }),
    });

    if (!transcriptRes.ok) {
      console.warn('[Transcribe API] AssemblyAI transcript request failed:', transcriptRes.status);
      return null;
    }

    const transcriptData = (await transcriptRes.json()) as { id: string; status: string; text?: string };
    const transcriptId = transcriptData.id;

    // Poll for completion (usually 1-3 seconds for short voice commands)
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 800));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey.trim() },
      });
      if (pollRes.ok) {
        const pollData = (await pollRes.json()) as { status: string; text?: string; error?: string };
        if (pollData.status === 'completed') {
          console.log('[Transcribe API] AssemblyAI transcription completed:', pollData.text);
          return pollData.text || '';
        }
        if (pollData.status === 'error') {
          console.warn('[Transcribe API] AssemblyAI transcription error:', pollData.error);
          return null;
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[Transcribe API] AssemblyAI error:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranscribeRequestBody;
    const { audio, language = ['en'], context } = body;

    if (!audio) {
      return NextResponse.json(
        { success: false, error: 'No audio data provided', fallbackToWebSpeech: true },
        { status: 400 }
      );
    }

    // 1. Try AssemblyAI if key configured
    const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY;
    if (assemblyAiKey) {
      const text = await transcribeWithAssemblyAI(audio, assemblyAiKey);
      if (text) {
        return NextResponse.json({
          success: true,
          text,
          source: 'assemblyai',
        });
      }
    }

    // 2. Try Wispr Flow if configured
    const wisprKey = process.env.WISPR_FLOW_API_KEY;
    if (wisprKey) {
      try {
        console.log('[Transcribe API] Trying Wispr Flow...');
        const wisprResponse = await fetch('https://platform-api.wisprflow.ai/api/v1/dash/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${wisprKey.trim()}`,
          },
          body: JSON.stringify({
            audio,
            language: Array.isArray(language) ? language : ['en'],
            context: context || { app: { type: 'ai' } },
          }),
        });

        if (wisprResponse.ok) {
          const wisprData = (await wisprResponse.json()) as { text: string };
          if (wisprData.text) {
            return NextResponse.json({
              success: true,
              text: wisprData.text,
              source: 'wispr-flow',
            });
          }
        }
      } catch {
        // fallback
      }
    }

    // 3. Fallback to Web Speech API
    return NextResponse.json(
      {
        success: false,
        error: 'Cloud transcription unavailable; falling back to Web Speech API',
        fallbackToWebSpeech: true,
      },
      { status: 200 }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown transcription error';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        fallbackToWebSpeech: true,
      },
      { status: 200 }
    );
  }
}
