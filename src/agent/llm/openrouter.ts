export type LlmJsonResult<T> =
  | { ok: true; data: T; provider?: string; model?: string }
  | { ok: false; error: string };

function extractJson(raw: string): unknown {
  let text = raw.trim();
  // Strip reasoning/thinking tags if model outputs them in content
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return a JSON object');
  }
  return JSON.parse(text.slice(start, end + 1));
}

type ProviderConfig = {
  name: 'nvidia' | 'openrouter';
  url: string;
  apiKey: string;
  model: string;
  headers: Record<string, string>;
  extraBody?: Record<string, unknown>;
};

function getProviders(): ProviderConfig[] {
  const list: ProviderConfig[] = [];

  // NVIDIA NIM API (Preferred - fast, high limits with user key)
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
  if (nvidiaKey) {
    const baseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    list.push({
      name: 'nvidia',
      url: `${baseUrl}/chat/completions`,
      apiKey: nvidiaKey,
      model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
      headers: {
        Authorization: `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      extraBody: {
        chat_template_kwargs: { enable_thinking: true },
      },
    });
  }

  // OpenRouter API (Fallback)
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    list.push({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: openrouterKey,
      model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free',
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OnlyDraw Agent',
      },
    });
  }

  return list;
}

export async function llmJson<T>(options: {
  system: string;
  user: string;
  timeoutMs?: number;
  temperature?: number;
}): Promise<LlmJsonResult<T>> {
  const providers = getProviders();
  if (providers.length === 0) {
    return { ok: false, error: 'No LLM API keys configured (set NVIDIA_API_KEY or OPENROUTER_API_KEY)' };
  }

  const errors: string[] = [];

  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45000);

    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: provider.headers,
        body: JSON.stringify({
          model: provider.model,
          temperature: options.temperature ?? 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: options.system },
            { role: 'user', content: options.user },
          ],
          ...(provider.extraBody || {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        errors.push(`${provider.name} HTTP ${response.status}${detail ? `: ${detail.slice(0, 150)}` : ''}`);
        continue;
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        errors.push(`${provider.name} returned empty content`);
        continue;
      }

      const data = extractJson(content) as T;
      return { ok: true, data, provider: provider.name, model: provider.model };
    } catch (error) {
      errors.push(`${provider.name} threw: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    error: `All LLM providers failed: ${errors.join('; ')}`,
  };
}
