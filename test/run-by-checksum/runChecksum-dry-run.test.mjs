import fs from 'fs-extra';
import path from 'path';
import { runChecksum } from '../../src/run-by-checksum/run.js';
import { TEST_ROOT } from './shared.mjs';

describe('checksum-runner - runChecksum (dry-run)', () => {
  beforeEach(async () => {
    await fs.remove(TEST_ROOT);
    await fs.ensureDir(TEST_ROOT);
    await fs.outputFile(path.join(TEST_ROOT, 'a.js'), "console.log('a1')");
    await fs.outputFile(path.join(TEST_ROOT, 'b.js'), "console.log('b1')");
  });

  test('should skip execution but still detect changes', async () => {
    const result = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo SHOULD_NOT_RUN',
      dryRun: true
    });

    expect(result.changed).toBe(true);
    expect(result.skipped).toBe(true);
  });

  test('should not re-run in dry-run when unchanged', async () => {
    const first = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo SHOULD_NOT_RUN',
      dryRun: true
    });

    expect(first.changed).toBe(true);

    const second = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo SHOULD_NOT_RUN',
      dryRun: true
    });

    expect(second.changed).toBe(false);
  });
});
