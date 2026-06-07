import { describe, expect, test, jest, beforeAll } from '@jest/globals';
import env from '../env.cjs';
import runStagedDiff from '../../src/git/git-diff-staged-ai.mjs';
import * as cp from 'cross-spawn';
import path from 'upath';
import { writefile } from 'sbg-utility';

const TEST_REPO = env.repoDir;

const exec = (cmd, args, opts = {}) =>
  cp.spawnSync(cmd, args, {
    cwd: TEST_REPO,
    stdio: 'ignore',
    ...opts
  });

function withSilentConsole(fn) {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  try {
    return fn();
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

describe('git-diff-staged-ai module exports', () => {
  beforeAll(() => {
    // Ensure test repo is set up before running tests
    env.ensureRepoExists();
  });

  test('should not has staged diff', async () => {
    // reset any changes
    const reset = exec('git', ['reset', '--hard']);
    expect(reset.status).toBe(0);

    const hasDiff = runStagedDiff(
      'git --no-pager diff --staged',
      'Staged diff saved successfully',
      'Failed to generate staged diff',
      { cwd: TEST_REPO }
    );
    expect(hasDiff).toBe(false);
  });

  test('has staged diff', async () => {
    // create new file and stage
    const file = path.join(TEST_REPO, 'stage-file.txt');
    writefile(file, new Date());
    const result = exec('git', ['add', 'stage-file.txt']);
    expect(result.status).toBe(0);

    // should be has staged diff
    const hasDiff = runStagedDiff(
      'git --no-pager diff --staged',
      'Staged diff saved successfully',
      'Failed to generate staged diff',
      { cwd: TEST_REPO }
    );
    expect(hasDiff).toBe(true);

    // const status = exec('git', ['status', '--porcelain'], { stdio: 'pipe' });
    // console.log('Git status output:', status.stdout?.toString());
  });

  test('accepts execOptions parameter', () => {
    withSilentConsole(() => {
      expect(() => {
        runStagedDiff('git --no-pager diff --staged', 'should not succeed', 'expected failure with timeout', {
          timeout: 1
        });
      }).toThrow();
    });
  });

  test('execOptions override defaults', async () => {
    withSilentConsole(() => {
      const hasDiff = runStagedDiff(
        'git --no-pager diff --staged',
        'Staged diff with custom cwd',
        'Failed with custom cwd',
        { cwd: TEST_REPO }
      );

      expect(typeof hasDiff).toBe('boolean');
    });
  });
});
