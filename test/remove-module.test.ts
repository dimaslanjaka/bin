import { describe, expect, test } from '@jest/globals';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'upath';

// This suite runs as ESM, so derive the directory from import.meta.url instead of __dirname.
const testDir = path.dirname(fileURLToPath(import.meta.url));

describe('remove-module CLI --help and -h', () => {
  const cliPath = path.resolve(testDir, '../src/remove-module.mjs');

  function runCli(args: string[]) {
    return spawnSync('node', [cliPath, ...args], {
      encoding: 'utf-8'
    });
  }

  test('--help prints usage and exits 0', () => {
    const result = runCli(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: remove-module/);
    expect(result.stdout).toMatch(/--help, -h/);
  });

  test('-h prints usage and exits 0', () => {
    const result = runCli(['-h']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: remove-module/);
    expect(result.stdout).toMatch(/--help, -h/);
  });
});
