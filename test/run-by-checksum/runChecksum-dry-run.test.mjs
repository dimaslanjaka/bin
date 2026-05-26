import { runChecksum } from '../../src/run-by-checksum/run.js';
import { TEST_ROOT, cleanTestRoot, createTestFile } from './shared.mjs';

describe('checksum-runner - runChecksum (dry-run)', () => {
  beforeEach(() => {
    cleanTestRoot();
    createTestFile(TEST_ROOT, 'a.js', "console.log('a1')");
    createTestFile(TEST_ROOT, 'b.js', "console.log('b1')");
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

  test('should detect unchanged when cache exists from previous normal run', async () => {
    // First run normally (not dry) to create a persisted cache
    const normal = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo OK'
    });
    expect(normal.changed).toBe(true);

    // Second run with dry-run — cache matches → no change detected
    const dry = await runChecksum({
      cwd: TEST_ROOT,
      patterns: ['**/*.js'],
      ignore: [],
      exec: 'echo SHOULD_NOT_RUN',
      dryRun: true
    });
    expect(dry.changed).toBe(false);
  });
});
