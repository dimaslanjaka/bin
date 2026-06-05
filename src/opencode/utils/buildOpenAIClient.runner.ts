/**
 * Runner — samples demonstrating buildOpenAIClient usage.
 *
 * Run with: npx tsx src/opencode/utils/buildOpenAIClient.runner.ts
 *
 * NOTE: Requires valid API keys in .opencode.keys.jsonc or OPENAI_API_KEY env var.
 * Proxy examples will fail unless you actually have a proxy listening.
 */

import { buildOpenAIClient } from './buildOpenAIClient.js';

/* ------------------------------------------------------------------ */
/*  1. Basic — string model name (backward-compatible signature)       */
/* ------------------------------------------------------------------ */
// async function exampleStringArg() {
//   console.log('\n--- 1. String argument ---');
//   const { client, model } = await buildOpenAIClient('gpt-4o-mini');
//   console.log('Model:', model);
//   // client is a ready-to-use OpenAI instance
// }

/* ------------------------------------------------------------------ */
/*  2. Options object — no proxy                                      */
/* ------------------------------------------------------------------ */
// async function exampleOptionsNoProxy() {
//   console.log('\n--- 2. Options object, no proxy ---');
//   const { client, model } = await buildOpenAIClient({ model: 'gpt-4o-mini' });
//   console.log('Model:', model);
// }

/* ------------------------------------------------------------------ */
/*  3. HTTP proxy via options object                                  */
/* ------------------------------------------------------------------ */
// async function exampleHttpProxy() {
//   console.log('\n--- 3. HTTP proxy ---');
//   const { client, model } = await buildOpenAIClient({
//     model: 'gpt-4o-mini',
//     proxy: 'http://127.0.0.1:8080'
//   });
//   console.log('Model:', model);
//   // All API requests go through http://127.0.0.1:8080
// }

/* ------------------------------------------------------------------ */
/*  4. HTTPS proxy with auth                                          */
/* ------------------------------------------------------------------ */
// async function exampleHttpsProxyWithAuth() {
//   console.log('\n--- 4. HTTPS proxy with authentication ---');
//   const { client, model } = await buildOpenAIClient({
//     model: 'gpt-4o-mini',
//     proxy: 'https://user:password@proxy.example.com:8443'
//   });
//   console.log('Model:', model);
// }

/* ------------------------------------------------------------------ */
/*  5. SOCKS5 — will throw a clear error                              */
/* ------------------------------------------------------------------ */
// async function exampleSocks5Error() {
//   console.log('\n--- 5. SOCKS5 (expected to error) ---');
//   try {
//     await buildOpenAIClient({
//       model: 'gpt-4o-mini',
//       proxy: 'socks5://127.0.0.1:1080'
//     });
//   } catch (err) {
//     console.log('Expected error:', (err as Error).message);
//   }
// }

/* ------------------------------------------------------------------ */
/*  Run a hello prompt                                                */
/* ------------------------------------------------------------------ */
async function main() {
  const { client, model, dispatcher } = await buildOpenAIClient({ proxy: 'http://127.0.0.1:3128' });
  console.log('Using model:', model);

  const completion = await client.chat.completions.create(
    {
      model,
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }]
    },
    {
      // Per-request fetch options — uses the same proxy agent from the client
      fetchOptions: { dispatcher }
    }
  );

  console.log('Response:', completion.choices[0]?.message?.content);
}

main().catch(console.error);
