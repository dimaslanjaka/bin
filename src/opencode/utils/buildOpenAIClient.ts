import OpenAI from 'openai';
import { getOpenCodeAuth } from '../storage.js';

/** Build an OpenAI client from the OpenCode auth file or OPENAI_API_KEY env var. */
export async function buildOpenAIClient(
  model: string = 'deepseek-v4-flash-free'
): Promise<{ client: OpenAI; model: string }> {
  // 1. Try OpenCode auth (opencode.ai/zen endpoint)
  const auth = await getOpenCodeAuth();
  if (auth?.opencode?.key) {
    return {
      client: new OpenAI({
        baseURL: 'https://opencode.ai/zen/v1',
        apiKey: auth.opencode.key
      }),
      model: model || 'deepseek-v4-flash-free'
    };
  }

  // 2. Try Google Gemini via OpenAI-compatible endpoint
  if (auth?.google?.key) {
    return {
      client: new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: auth.google.key
      }),
      model: model || 'gemini-2.0-flash'
    };
  }

  // 3. Fallback: standard OpenAI from env
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'No LLM API key found.\n' + 'Either configure opencode (run opencode once) or set OPENAI_API_KEY env var.'
    );
  }

  return {
    client: new OpenAI({ apiKey }),
    model: model || 'gpt-4o-mini'
  };
}
