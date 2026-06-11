import { array_random, isEmpty, sanitizeFilename, writefile } from 'sbg-utility';
import { getTempPath } from '../binary-collections/config.cjs';
import { loadMessages, loadPartsForMessages } from './database.js';
import {
  buildTranscript,
  formatTranscript,
  loadNewSessions,
  openDb,
  SessionSummary
} from './session-title-reasoner.js';
import { buildOpenAIClient } from './utils/buildOpenAIClient.js';

function cleanUpMessageData(data: any | any[]): { data: any | any[] } | null {
  const toolLine = /^\[tool:\s+[^\]\n]+\](?:\s*→\s*(.*))?$/;

  const allowedToolOutputs: (string | RegExp)[] = [
    '(no output)',
    'Edit applied successfully.',
    'No files found',
    /^Found \d+ matches$/,
    'Wrote file successfully.',
    /^Updated memory block .+\.$/
  ];

  const exactSkips = ['N…'];

  const isAllowedToolOutput = (output: string | undefined): boolean => {
    if (!output) return true;

    return allowedToolOutputs.some((allowed) =>
      typeof allowed === 'string' ? output === allowed : allowed.test(output)
    );
  };

  const isOnlyToolContent = (content: string): boolean => {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return false;

    return lines.every((line) => {
      const match = line.match(toolLine);
      if (!match) return false;

      return isAllowedToolOutput(match[1]);
    });
  };

  if (Array.isArray(data)) {
    const cleaned = data
      .map((item) => cleanUpMessageData(item))
      .filter((item) => item !== null)
      .map((item) => item!.data);

    return { data: cleaned };
  }

  for (const key of ['id', 'session_id', 'time_created', 'time_updated', 'directory']) {
    delete data[key];
  }

  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) {
      const result = cleanUpMessageData(data[key]);
      data[key] = result?.data ?? [];
    }
  }

  if (typeof data.content === 'string' && (exactSkips.includes(data.content) || isOnlyToolContent(data.content))) {
    return null;
  }

  return { data };
}

async function main(): Promise<void> {
  const db = openDb();
  const sessions = loadNewSessions(db, undefined, undefined);

  if (sessions.length === 0) {
    console.log('No sessions with "New session" title found. Nothing to do.');
    return;
  }

  console.log(`Found ${sessions.length} session(s) with "New session" title.\n`);

  // ── Build SessionSummary objects (transcript extraction) ───────────────────
  const summaries: SessionSummary[] = [];
  for (const row of sessions) {
    const messages = loadMessages(db, row.id);
    const messageIds = messages.map((m) => m.id);
    const parts = loadPartsForMessages(db, messageIds);
    const turns = buildTranscript(messages, parts);

    summaries.push({
      id: row.id,
      directory: row.directory,
      title: row.title,
      createdAt: new Date(row.time_created),
      turns
    });
  }

  const pickedSummary = array_random(summaries);
  const sessionId = pickedSummary.id;
  if (isEmpty(sessionId)) {
    console.log('session id empty', pickedSummary);
    return;
  }
  const picked = cleanUpMessageData(pickedSummary);
  const transcript = formatTranscript((picked?.data as SessionSummary)?.turns ?? []);

  const question = `You are a helpful assistant that proposes concise and descriptive titles for user sessions based on their conversation transcripts. The session title should capture the main topic or purpose of the session in a few words.

Here is an example session summary with transcript:

Session directory: /path/to/session
Created: 2024-01-01T12:00:00.000Z

Conversation transcript:
**User**:
How do I fix ESLint errors in my TypeScript files?

**Assistant**:
To fix ESLint errors in your TypeScript files, you can follow these steps:
1. Install ESLint and the necessary plugins for TypeScript.
2. Create an ESLint configuration file (.eslintrc) in your project root.
3. Run ESLint on your TypeScript files to see the list of errors.
4. Address each error based on the provided messages, which may include updating your code or adjusting your ESLint rules.

Based on this conversation, a good session title would be "Fix ESLint errors in TypeScript".

Below is the session summary and transcript for a new session. Propose a concise title that captures the main topic or purpose of the session, based on the conversation content.

Session directory: ${pickedSummary.directory}
Created: ${pickedSummary.createdAt.toISOString()}

Conversation transcript (truncated):
${transcript}
`;

  const { client, model, dispatcher } = await buildOpenAIClient({ proxy: 'http://127.0.0.1:3128' });
  const completion = await client.chat.completions.create(
    {
      model,
      messages: [{ role: 'user', content: question }]
    },
    {
      // Per-request fetch options — uses the same proxy agent from the client
      fetchOptions: { dispatcher }
    }
  );

  const debugFile = getTempPath('logs/session-title-reasoner', `${sanitizeFilename(sessionId)}.log`);
  const result = writefile(debugFile, {
    title: completion.choices[0].message.content,
    question: question,
    response: completion.choices
  });
  console.log(`Log ${sessionId} written to ${result.file}`);
}

main().catch((err) => {
  console.error('Error in session title reasoner:', err);
  process.exit(1);
});
