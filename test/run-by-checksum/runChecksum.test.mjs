import fs from 'fs-extra';
import path from 'path';
import { runChecksum } from '../../src/run-by-checksum/run.js';
import { TEST_ROOT } from './shared.mjs';

describe('checksum-runner - runChecksum', () => {
  beforeEach(async () => {
    await fs.remove(TEST_ROOT);
    await fs.ensureDir(TEST_ROOT);
    await fs.outputFile(path.join(TEST_ROOT, 'a.js'), "console.log('a1')");
    await fs.outputFile(path.join(TEST_ROOT, 'b.js'), "console.log('b1')");
  });

  test('should run command when files changed', async () => {
    const result1 = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo RUN_1'
    });

    expect(result1.changed).toBe(true);

    // modify file to force checksum change
    await fs.outputFile(path.join(TEST_ROOT, 'a.js'), "console.log('changed')");

    const result2 = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo RUN_2'
    });

    expect(result2.changed).toBe(true);
  });

  test('should NOT run command when unchanged', async () => {
    const first = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo RUN'
    });

    expect(first.changed).toBe(true);

    const second = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo RUN'
    });

    expect(second.changed).toBe(false);
  });
});
