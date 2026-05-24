import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptCandidates = [
  path.resolve(__dirname, '../bin/kill-night-crows.ps1'),
  path.resolve(__dirname, '../binaries/kill-night-crows.ps1')
];
const scriptPath = scriptCandidates.find((candidate) => fs.existsSync(candidate));
const scriptChecks = scriptCandidates.map((candidate) => ({
  path: candidate,
  exists: fs.existsSync(candidate)
}));

const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
kill-night-crows

Usage:
  node src/kill-night-crows.mjs [options]

Options:
  --help, -h    Show this help message

Description:
  Runs kill-night-crows.ps1 to watch Night Crows processes
  and kill the launcher tree when the shipping process is not responding.
  Resolution priority: ../bin first, then ../binaries.

Script check:
${scriptChecks.map((check) => `  ${check.exists ? 'found' : 'missing'} - ${check.path}`).join('\n')}
`);
  process.exit(0);
}

if (!scriptPath) {
  console.error(
    `PowerShell script not found in any of these paths:\n${scriptCandidates.map((p) => ` - ${p}`).join('\n')}`
  );
  process.exit(1);
}

if (process.platform !== 'win32') {
  console.error('kill-night-crows is supported only on Windows.');
  process.exit(1);
}

const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args], {
  stdio: 'inherit'
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
