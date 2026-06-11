import {
  openDb,
  loadNewSessions,
  buildTranscript,
  proposeTitle,
  updateSessionTitle,
  SessionRow,
  SessionSummary,
  TitleResult
} from './session-title-reasoner.js';
import { loadMessages, loadPartsForMessages } from './database.js';
import { buildOpenAIClient } from './utils/buildOpenAIClient.js';
import { getArgs } from '../utils/index.cjs';
import { DATABASE_PATH } from './storage.js';

// ─── CLI options ──────────────────────────────────────────────────────────────

interface CliOptions {
  write: boolean;
  limit: number;
  dir: string;
  model: string;
  concurrency: number;
}

function parseArgs(): CliOptions {
  const argv = getArgs({
    boolean: ['write', 'help'],
    string: ['dir', 'model'],
    default: {
      write: false,
      limit: 0,
      dir: '',
      model: '',
      concurrency: 3,
      help: false
    }
  });

  if (argv.help) {
    console.log(`
session-title-reasoner – propose / update OpenCode session titles

Usage:
  npx ts-node src/opencode/session-title-reasoner-cli.ts [options]

Options:
  --write            Write the proposed titles back to the database
  --limit  <n>       Process at most N sessions (default: all)
  --dir    <substr>  Only sessions whose directory contains this substring
  --model  <name>    AI model to use (default: deepseek-v4-flash-free)
  --concurrency <n>  Parallel LLM requests (default: 3)
  --help             Show this help
`);
    process.exit(0);
  }

  return {
    write: argv.write,
    limit: Number(argv.limit) || 0,
    dir: argv.dir || '',
    model: argv.model || '',
    concurrency: Number(argv.concurrency) || 3
  };
}

/** Process sessions in batches to respect concurrency limits. */
async function processBatch<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((item, j) => fn(item, i + j)));
    results.push(...batchResults);
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function sessionTitleReasoner(): Promise<void> {
  const opts = parseArgs();

  console.log('='.repeat(60));
  console.log('OpenCode Session Title Reasoner');
  console.log('='.repeat(60));
  console.log(`Database  : ${DATABASE_PATH}`);
  console.log(`Mode      : ${opts.write ? 'WRITE (will update DB)' : 'DRY RUN (no DB changes)'}`);
  if (opts.dir) console.log(`Dir filter: ${opts.dir}`);
  if (opts.limit) console.log(`Limit     : ${opts.limit}`);
  console.log('');

  // ── Load sessions ──────────────────────────────────────────────────────────
  const db = openDb();
  let sessions: SessionRow[];
  try {
    sessions = loadNewSessions(db, opts.dir || undefined, opts.limit || undefined);
  } finally {
    db.close();
  }

  if (sessions.length === 0) {
    console.log('No sessions with "New session" title found. Nothing to do.');
    return;
  }

  console.log(`Found ${sessions.length} session(s) with "New session" title.\n`);

  // ── Build LLM client ───────────────────────────────────────────────────────
  const { client, model } = await buildOpenAIClient(opts.model);
  console.log(`Using model: ${model}\n`);

  // ── Build SessionSummary objects (transcript extraction) ───────────────────
  const summaries: SessionSummary[] = [];
  {
    const db2 = openDb();
    try {
      for (const row of sessions) {
        const messages = loadMessages(db2, row.id);
        const messageIds = messages.map((m) => m.id);
        const parts = loadPartsForMessages(db2, messageIds);
        const turns = buildTranscript(messages, parts);

        summaries.push({
          id: row.id,
          directory: row.directory,
          title: row.title,
          createdAt: new Date(row.time_created),
          turns
        });
      }
    } finally {
      db2.close();
    }
  }

  // ── Ask the LLM to propose titles ─────────────────────────────────────────
  const results: TitleResult[] = [];

  await processBatch(summaries, opts.concurrency, async (session, index) => {
    const prefix = `[${index + 1}/${summaries.length}]`;
    console.log(`${prefix} Processing session ${session.id.slice(0, 24)}…`);
    console.log(`         Directory : ${session.directory}`);
    console.log(`         Turns     : ${session.turns.length}`);

    if (session.turns.length === 0) {
      console.log(`         → SKIPPED  (no transcript content)\n`);
      return;
    }

    try {
      const { title, reasoning } = await proposeTitle(client, model, session);
      results.push({
        sessionId: session.id,
        directory: session.directory,
        oldTitle: session.title,
        newTitle: title,
        reasoning
      });

      console.log(`         Old title : ${session.title}`);
      console.log(`         New title : ${title}`);
      console.log(`         Reasoning : ${reasoning}`);
      console.log('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} ERROR: ${msg}\n`);
    }
  });

  // ── Write results to DB (if --write) ──────────────────────────────────────
  if (opts.write && results.length > 0) {
    console.log('─'.repeat(60));
    console.log(`Writing ${results.length} title(s) to database…`);
    const db3 = openDb();
    try {
      for (const result of results) {
        updateSessionTitle(db3, result.sessionId, result.newTitle);
        console.log(`  ✓ ${result.sessionId.slice(0, 24)}  →  "${result.newTitle}"`);
      }
    } finally {
      db3.close();
    }
    console.log('Done.\n');
  } else if (!opts.write && results.length > 0) {
    console.log('─'.repeat(60));
    console.log('DRY RUN – no changes written. Re-run with --write to update the database.');
    console.log('');
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  if (results.length > 0) {
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    for (const r of results) {
      console.log(`Session : ${r.sessionId}`);
      console.log(`  Dir   : ${r.directory}`);
      console.log(`  Before: ${r.oldTitle}`);
      console.log(`  After : ${r.newTitle}`);
      console.log('');
    }
  }
}
