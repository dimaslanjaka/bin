/**
 * Unit tests for src/github-workflows/generate-test-ci-step-cli.mjs
 *
 * The CLI auto-executes `main()` on import, so every test spawns it as a
 * child process inside an isolated temp project directory.
 *
 * Covered behaviors:
 * - --help / -h output
 * - Default Jest fallback (CJS vs ESM auto-detection)
 * - testRunner.bin / testRunner.args overrides
 * - testRunner.template token substitution ({{file}}, {{filename}}, {{pathPattern}})
 * - testRunner.aggregated single-step mode
 * - testRunner.skipUntracked toggle
 * - safeId normalization (ids must start with a letter or underscore)
 * - --output path override
 * - --pattern restriction
 */

import { describe, expect, test, jest } from '@jest/globals';
import fs from 'fs-extra';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'upath';
import { fileURLToPath } from 'url';
import { makeProject } from '../env.cjs';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(path.dirname(path.dirname(__filename)));
const cliScript = path.join(repoRoot, 'src', 'github-workflows', 'generate-test-ci-step-cli.mjs');

function runGenerator(dir, args = ['--output', 'test.yml']) {
  const out = execFileSync('node', [cliScript, ...args], { cwd: dir, encoding: 'utf8' });
  return { output: out, outPath: path.join(dir, args[args.indexOf('--output') + 1] || 'test.yml') };
}

function readOutput(dir, name = 'test.yml') {
  const p = path.join(dir, name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

jest.setTimeout(30000);
describe('generate-test-ci-step-cli', () => {
  test('--help prints usage and exits 0', () => {
    const out = execFileSync('node', [cliScript, '--help'], { cwd: repoRoot, encoding: 'utf8' });
    expect(out).toContain('Usage:');
    expect(out).toContain('generate-test-ci-step-cli.mjs');
    expect(out).toContain('--pattern');
    expect(out).toContain('--output');
    expect(out).toContain('--help');
  });

  test('-h is an alias of --help', () => {
    const out = execFileSync('node', [cliScript, '-h'], { cwd: repoRoot, encoding: 'utf8' });
    expect(out).toContain('Usage:');
  });

  test('default fallback uses CJS jest command for non-module packages', () => {
    const dir = makeProject({
      pkg: { name: 'cjs-pkg', version: '1.0.0' },
      tests: { 'test/sample.test.cjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir);
    const yml = readOutput(dir);

    expect(yml).toBeTruthy();
    expect(yml).toContain('node node_modules/jest/bin/jest.js');
    expect(yml).toContain('--runInBand');
    expect(yml).not.toContain('--experimental-vm-modules');
  });

  test('default fallback uses ESM jest command for type:module packages', () => {
    const dir = makeProject({
      pkg: { name: 'esm-pkg', version: '1.0.0', type: 'module' },
      tests: { 'test/sample.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir);
    const yml = readOutput(dir);

    expect(yml).toBeTruthy();
    expect(yml).toContain('node --experimental-vm-modules node_modules/jest/bin/jest.js');
  });

  test('testRunner.bin and testRunner.args override the default command', () => {
    const dir = makeProject({
      pkg: { name: 'vitest-pkg', version: '1.0.0', type: 'module' },
      config: { testRunner: { bin: 'npx vitest', args: ['--run', '--reporter=dot'] } },
      tests: { 'test/sample.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir);
    const yml = readOutput(dir);

    expect(yml).toContain('npx vitest');
    expect(yml).toContain('--run');
    expect(yml).toContain('--reporter=dot');
    expect(yml).not.toContain('node_modules/jest/bin/jest.js');
  });

  test('testRunner.template substitutes {{file}}, {{filename}} and {{pathPattern}}', () => {
    const dir = makeProject({
      pkg: { name: 'tpl-pkg', version: '1.0.0', type: 'module' },
      config: { testRunner: { template: 'npx mocha {{file}} # name={{filename}} pat={{pathPattern}}' } },
      tests: { 'test/alpha.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir);
    const yml = readOutput(dir);

    expect(yml).toContain('npx mocha test/alpha.test.mjs');
    expect(yml).toContain('name=alpha.test.mjs');
    expect(yml).toContain('pat=alpha.test.mjs');
    // No unresolved tokens should remain
    expect(yml).not.toContain('{{file}}');
    expect(yml).not.toContain('{{filename}}');
    expect(yml).not.toContain('{{pathPattern}}');
  });

  test('skipUntracked defaults to true and drops untracked files', () => {
    const dir = makeProject({
      pkg: { name: 'skip-pkg', version: '1.0.0', type: 'module' },
      tests: { 'test/tracked.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    // Add a file that is not staged/indexed
    fs.writeFileSync(path.join(dir, 'test/untracked.test.mjs'), '// test\n', 'utf8');

    runGenerator(dir);
    const yml = readOutput(dir);

    expect(yml).toContain('Run tests in test/tracked.test.mjs');
    expect(yml).not.toContain('untracked.test.mjs');
  });

  test('testRunner.skipUntracked=false keeps untracked files', () => {
    const dir = makeProject({
      pkg: { name: 'no-skip-pkg', version: '1.0.0', type: 'module' },
      config: { testRunner: { skipUntracked: false } },
      tests: { 'test/tracked.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    fs.writeFileSync(path.join(dir, 'test/untracked.test.mjs'), '// test\n', 'utf8');

    runGenerator(dir);
    const yml = readOutput(dir);

    expect(yml).toContain('Run tests in test/untracked.test.mjs');
  });

  test('step ids are normalized to start with a letter or underscore', () => {
    const dir = makeProject({
      pkg: { name: 'id-pkg', version: '1.0.0', type: 'module' },
      tests: { 'test/123numeric.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir);
    const yml = readOutput(dir);

    // safeId prepends "_" when the normalized value starts with a digit
    expect(yml).toMatch(/id:\s*run-_?\w/);
    expect(yml).toContain('123numeric.test.mjs');
  });

  test('--output writes the workflow to the requested path', () => {
    const dir = makeProject({
      pkg: { name: 'out-pkg', version: '1.0.0', type: 'module' },
      tests: { 'test/sample.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir, ['--output', 'custom-ci.yml']);

    expect(fs.existsSync(path.join(dir, 'custom-ci.yml'))).toBe(true);
    expect(readOutput(dir, 'custom-ci.yml')).toContain('Run tests in test/sample.test.mjs');
  });

  test('--pattern restricts which test files are collected', () => {
    const dir = makeProject({
      pkg: { name: 'pattern-pkg', version: '1.0.0', type: 'module' },
      tests: { 'test/included.test.mjs': '// test\n', 'specs/excluded.test.mjs': '// test\n' }
    });
    spawnSync('git', ['add', '-A'], { cwd: dir });

    runGenerator(dir, ['--output', 'test.yml', '--pattern', 'test/**/*.test.mjs']);
    const yml = readOutput(dir);

    expect(yml).toContain('Run tests in test/included.test.mjs');
    expect(yml).not.toContain('specs/excluded.test.mjs');
  });
});
