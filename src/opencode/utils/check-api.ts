import axios from 'axios';

/**
 * Checks whether the OpenCode API returns a non-empty response for a given prompt.
 *
 * Sends a chat completion request and returns `true` when the model produces
 * meaningful output (non-empty `content` or `reasoning_content`).
 *
 * @param prompt - The user message to send to the model.
 * @param apiKey - Bearer token for API authentication.
 * @param model  - Model identifier (defaults to `'deepseek-v4-flash-free'`).
 * @returns `true` if the response contains non-empty content, `false` otherwise.
 */
export async function checkOpenCodeApi(
  prompt: string,
  apiKey: string,
  model: string = 'deepseek-v4-flash-free'
): Promise<boolean> {
  const res = await axios.post(
    'https://opencode.ai/zen/v1/chat/completions',
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` }
    }
  );

  const message = res.data.choices[0].message;
  const output = message.content || message.reasoning_content;
  const notEmptyOutput = output && output.trim().length > 0;
  return notEmptyOutput;
}
