import OpenAI from 'openai';
import axios from 'axios';

const client = new OpenAI({
  apiKey: 'sk-9aLZhac0dYGY2v37HTBBAo6glifcRZLUNJmh8NaoRN5VOnPlGQ2kh53mBZY32inV',
  baseURL: 'https://opencode.ai/zen/v1' // OpenCode Zen base URL
});

async function _callDeepSeek() {
  const response = await client.chat.completions.create({
    model: 'deepseek-v4-flash-free', // Model ID in Zen
    messages: [{ role: 'user', content: 'Explain promises in JavaScript' }],
    max_tokens: 300
  });

  console.log(response.choices[0].message);
  const message = response.choices[0].message;
  let finalAnswer = message.content;
  if (!finalAnswer && message.reasoning_content) {
    // simple heuristic: take the last paragraph after "1." / "2." structure
    const parts = message.reasoning_content.split('\n');
    finalAnswer = parts.slice(10).join(' ').trim(); // tweak based on structure
  }
}

async function callZen(prompt) {
  const res = await axios.post(
    'https://opencode.ai/zen/v1/chat/completions',
    {
      model: 'deepseek-v4-flash-free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512
    },
    {
      headers: { Authorization: `Bearer ${client.apiKey}` }
    }
  );

  const message = res.data.choices[0].message;
  const output = message.content || message.reasoning_content;
  console.log(output);
}

callZen('Hello');
