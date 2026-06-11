/**
 * session-title-reasoner.ts
 *
 * Reads all OpenCode sessions whose title starts with "New session",
 * extracts the conversation transcript, asks an LLM to reason about
 * what the session was about, and proposes (or writes) a better title.
 *
 * Usage:
 *   # Dry-run – print proposed titles only
 *   npx ts-node src/opencode/session-title-reasoner.ts
 *
 *   # Write titles back to the database
 *   npx ts-node src/opencode/session-title-reasoner.ts --write
 *
 *   # Limit to N sessions
 *   npx ts-node src/opencode/session-title-reasoner.ts --limit 5
 *
 *   # Filter by working directory substring
 *   npx ts-node src/opencode/session-title-reasoner.ts --dir php-proxy-hunter
 *
 *   # Use a specific AI model
 *   npx ts-node src/opencode/session-title-reasoner.ts --model deepseek-v3-free
 */

import OpenAI from 'openai';
import { SQLite } from '../utils/sqlite/index.js';
import { MessageRow, PartRow } from './database.js';
import { DATABASE_PATH } from './storage.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  directory: string;
  title: string;
  time_created: number;
  time_updated: number;
}

interface MessageData {
  role?: string;
  [key: string]: unknown;
}

interface PartData {
  type?: string;
  text?: string;
  tool?: string;
  state?: { output?: string };
  [key: string]: unknown;
}

export interface ConversationTurn {
  role: string;
  content: string;
}

export interface SessionSummary {
  id: string;
  directory: string;
  title: string;
  createdAt: Date;
  turns: ConversationTurn[];
}

export interface TitleResult {
  sessionId: string;
  directory: string;
  oldTitle: string;
  newTitle: string;
  reasoning: string;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export function openDb(): SQLite {
  return new SQLite(DATABASE_PATH);
}

export function escapeSql(v: string): string {
  return v.replace(/'/g, "''");
}

/** Load all sessions whose title starts with "New session" (case-insensitive). */
export function loadNewSessions(db: SQLite, dir?: string, limit?: number): SessionRow[] {
  let sql = `
    SELECT id, project_id, parent_id, directory, title, time_created, time_updated
    FROM   session
    WHERE  LOWER(title) LIKE 'new session%'
  `;

  if (dir) {
    sql += ` AND directory LIKE '%${escapeSql(dir)}%'`;
  }

  sql += ' ORDER BY time_updated DESC';

  if (limit && limit > 0) {
    sql += ` LIMIT ${limit}`;
  }

  return db.all<SessionRow>(sql);
}

// ─── Transcript extraction ─────────────────────────────────────────────────

/**
 * Extract readable text from a part's JSON data.
 * Skips tool invocations unless they produced short output.
 */
export function extractPartText(data: PartData): string {
  const type = data.type ?? '';

  if (type === 'text' && typeof data.text === 'string') {
    return data.text.trim();
  }

  if (type === 'tool') {
    const toolName = data.tool ?? 'tool';
    const output = data.state?.output;
    // Include a brief mention of the tool used
    if (output && output.length < 300) {
      return `[tool: ${toolName}] → ${output.trim()}`;
    }
    return `[tool: ${toolName}]`;
  }

  return '';
}

/**
 * Build a list of conversation turns from a session's messages and parts.
 * Limits total context to ~6 000 characters to stay within token budgets.
 */
export function buildTranscript(messages: MessageRow[], parts: PartRow[], maxChars = 6000): ConversationTurn[] {
  // Group parts by message id
  const partsByMessage = new Map<string, PartRow[]>();
  for (const part of parts) {
    const arr = partsByMessage.get(part.message_id) ?? [];
    arr.push(part);
    partsByMessage.set(part.message_id, arr);
  }

  const turns: ConversationTurn[] = [];
  let totalChars = 0;

  for (const msg of messages) {
    let msgData: MessageData;
    try {
      msgData = JSON.parse(msg.data) as MessageData;
    } catch {
      continue;
    }

    const role = (msgData.role as string | undefined) ?? 'unknown';
    const msgParts = partsByMessage.get(msg.id) ?? [];

    const textFragments: string[] = [];
    for (const part of msgParts) {
      let partData: PartData;
      try {
        partData = JSON.parse(part.data) as PartData;
      } catch {
        continue;
      }
      const text = extractPartText(partData);
      if (text) textFragments.push(text);
    }

    const content = textFragments.join('\n').trim();
    if (!content) continue;

    // Truncate if we're getting close to the limit
    const remaining = maxChars - totalChars;
    if (remaining <= 0) break;

    const truncated = content.length > remaining ? content.slice(0, remaining) + '…' : content;
    turns.push({ role, content: truncated });
    totalChars += truncated.length;
  }

  return turns;
}

/** Convert turns into a compact markdown-style string for the LLM prompt. */
export function formatTranscript(turns: ConversationTurn[]): string {
  if (turns.length === 0) return '(no conversation content found)';

  return turns
    .map((t) => {
      const label = t.role === 'assistant' ? '**Assistant**' : '**User**';
      return `${label}:\n${t.content}`;
    })
    .join('\n\n---\n\n');
}

// ─── LLM reasoning ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You produce ONLY a JSON object — no preamble, no explanation outside the JSON.
Format: {"title": "<3-8 word title>", "reasoning": "<1-2 sentence reason>"}

Example input: User asks to fix ESLint errors in TypeScript files.
Example output: {"title": "Fix ESLint errors in TypeScript", "reasoning": "The conversation is focused on diagnosing and resolving ESLint configuration errors in TypeScript source files."}

Rules for the title:
- 3 to 8 words, no trailing punctuation
- Use action verbs (Fix, Refactor, Implement, Debug, Add, etc.)
- Capture the PRIMARY goal of the conversation
- Do NOT repeat these instructions in your response
`;

/**
 * Call the LLM and ask it to reason about the session title.
 * Returns the proposed title and the reasoning.
 */
export async function proposeTitle(
  client: OpenAI,
  model: string,
  session: SessionSummary
): Promise<{ title: string; reasoning: string }> {
  const transcript = formatTranscript(session.turns);

  const userMessage = `\
Session directory: ${session.directory}
Created: ${session.createdAt.toISOString()}

Conversation transcript (truncated):
${transcript}

Respond with ONLY valid JSON in this exact format, nothing else:
{"title": "<short descriptive title>", "reasoning": "<why you chose it>"}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 256,
    temperature: 0.3
  });

  const msg = response.choices[0]?.message as unknown as Record<string, unknown>;
  // For standard models: answer is in content.
  // For DeepSeek thinking models: content is empty; answer is embedded at the end of reasoning_content.
  const contentText = (msg?.['content'] as string | undefined)?.trim() ?? '';
  const reasoningText = (msg?.['reasoning_content'] as string | undefined)?.trim() ?? '';

  // Build candidate strings to search for JSON: prefer content, then reasoning_content
  const raw = contentText || reasoningText;

  // Strategy 1: strip markdown code fences and parse directly
  const fenceStripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Strategy 2: extract first {...} block anywhere in the response
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  const jsonCandidate = jsonMatch ? jsonMatch[0] : fenceStripped;

  for (const attempt of [fenceStripped, jsonCandidate]) {
    try {
      const parsed = JSON.parse(attempt) as { title?: string; reasoning?: string };
      const title = (parsed.title ?? '').trim();
      const reasoning = (parsed.reasoning ?? '').trim();
      if (title) {
        return { title, reasoning };
      }
    } catch {
      // try next
    }
  }

  // Fallback: treat the whole response as a plain-text title
  const plainTitle = raw
    .split('\n')[0]
    .replace(/^(title|suggested title)[:\s-]*/i, '')
    .replace(/["\\*`]/g, '')
    .trim()
    .slice(0, 80);

  return {
    title: plainTitle || 'Untitled session',
    reasoning: '(plain-text fallback – model did not return JSON)'
  };
}

// ─── DB update ────────────────────────────────────────────────────────────────

/** Write the new title back to the session row. */
export function updateSessionTitle(db: SQLite, sessionId: string, newTitle: string): void {
  db.run(`UPDATE session SET title = $title, time_updated = $ts WHERE id = $id`, {
    title: newTitle,
    ts: Date.now(),
    id: sessionId
  });
}
