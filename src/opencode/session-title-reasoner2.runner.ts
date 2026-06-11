/**
 * Runner for session-title-reasoner2.
 *
 * Picks a random "New Session" from the OpenCode database, extracts the
 * first user message, and generates a title using the same prompt template
 * as the plugin.
 */

import { array_random, isEmpty } from 'sbg-utility';
import { SessionRenamerConfig, loadConfig } from './config.js';
import { loadMessages, loadPartsForMessages } from './database.js';
import { loadNewSessions, openDb } from './session-title-reasoner.js';
import { SYSTEM_PROMPT, formatDate } from './session-title-reasoner2.js';
import { buildOpenAIClient } from './utils/buildOpenAIClient.js';

async function main(): Promise<void> {
  // 1. Load config
  const config: SessionRenamerConfig = loadConfig(process.cwd());
  const titleMaxLength = config.titleMaxLength;

  // 2. Find "New Session" sessions from the database
  const db = openDb();
  const sessions = loadNewSessions(db);

  if (sessions.length === 0) {
    console.log('No sessions with "New session" title found. Nothing to do.');
    db.close();
    return;
  }

  console.log(`Found ${sessions.length} session(s) with "New session" title.\n`);

  // 3. Pick a random session
  const picked = array_random(sessions);
  if (!picked || isEmpty(picked.id)) {
    console.log('Failed to pick a session.');
    db.close();
    return;
  }

  console.log('Picked session:', picked.id);
  console.log('  Directory:', picked.directory);
  console.log('  Current title:', picked.title);

  // 4. Extract first user message
  const messages = loadMessages(db, picked.id);
  const messageIds = messages.map((m) => m.id);
  const parts = loadPartsForMessages(db, messageIds);

  let userMessage: string | null = null;

  for (const msg of messages) {
    let msgData: Record<string, unknown>;
    try {
      msgData = JSON.parse(msg.data) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (msgData.role === 'user') {
      // Find the text part for this message
      const msgParts = parts.filter((p) => p.message_id === msg.id);
      for (const part of msgParts) {
        let partData: Record<string, unknown>;
        try {
          partData = JSON.parse(part.data) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (partData.type === 'text' && typeof partData.text === 'string' && partData.text.trim()) {
          userMessage = partData.text.trim();
          break;
        }
      }
      if (userMessage) break;
    }
  }

  if (!userMessage) {
    console.log('  No user message found in session.');
    db.close();
    return;
  }

  console.log('  First user message:', userMessage.slice(0, 80) + (userMessage.length > 80 ? '...' : ''));

  // 5. Build OpenAI client and generate title
  const { client, model } = await buildOpenAIClient();
  const systemPrompt = SYSTEM_PROMPT.replace('{maxLength}', titleMaxLength.toString());

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a title for this message:\n\n${userMessage}` }
    ]
  });

  const generatedTitle = completion.choices[0]?.message?.content?.trim() || null;
  if (!generatedTitle) {
    console.log('  Failed to generate title.');
    db.close();
    return;
  }

  // 6. Format final title with date (same as plugin does)
  let finalTitle = generatedTitle;
  if (finalTitle.length > titleMaxLength) {
    finalTitle = finalTitle.slice(0, titleMaxLength);
  }
  const dateStr = formatDate(config.dateFormat);
  const fullTitle = `${finalTitle} (${dateStr})`;

  console.log('\n  Generated title:', fullTitle);

  db.close();
}

main().catch((err) => {
  console.error('[session-title-reasoner2] Error:', err);
  process.exit(1);
});
