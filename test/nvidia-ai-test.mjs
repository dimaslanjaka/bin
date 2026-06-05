import { loadDotenv } from '../src/binary-collections/config.cjs';
import OpenAI from 'openai';
import { isEmpty } from 'sbg-utility';

loadDotenv();

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'nvidia/nemotron-3-ultra-550b-a55b',
    messages: [{ role: 'user', content: 'hello' }],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: { enable_thinking: true },
    stream: true
  });

  for await (const chunk of completion) {
    const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) {
      process.stdout.write(reasoning);
      if (isEmpty(chunk.choices[0]?.delta?.content)) continue;
    }
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
