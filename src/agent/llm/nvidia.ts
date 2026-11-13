/**
 * NVIDIA NIM / API Integration for OnlyDraw Agent.
 * Compatible with OpenAI chat completions spec at https://integrate.api.nvidia.com/v1.
 */

export const NVIDIA_DEFAULT_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export type NvidiaChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
    };

export type NvidiaChatCompletionOptions = {
  model?: string;
  messages: NvidiaChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  seed?: number;
  stream?: boolean;
  enableThinking?: boolean;
};

export async function createNvidiaChatCompletion(options: NvidiaChatCompletionOptions) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY environment variable is not set');
  }

  const baseUrl = (process.env.NVIDIA_BASE_URL || NVIDIA_BASE_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: options.model || process.env.NVIDIA_MODEL || NVIDIA_DEFAULT_MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    top_p: options.top_p ?? 0.95,
    max_tokens: options.max_tokens ?? 16384,
    seed: options.seed ?? 42,
    stream: Boolean(options.stream),
    chat_template_kwargs: { enable_thinking: options.enableThinking ?? true },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`NVIDIA API HTTP ${response.status}: ${errorText.slice(0, 300)}`);
  }

  return response;
}

