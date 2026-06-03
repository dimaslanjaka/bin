import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as updater from '../src/package-resolutions-updater.mjs';

describe('replaceRawWithLatestHash', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  test('replaces branch name with latest commit SHA in GitHub tarball URL', async () => {
    const url = 'https://raw.githubusercontent.com/dimaslanjaka/hexo-themes/master/releases/hexo-theme-flowbite.tgz';
    const latestHash = 'abc123def456';

    const result = updater.replaceRawWithLatestHash(url, latestHash);

    expect(result).toBe(
      'https://raw.githubusercontent.com/dimaslanjaka/hexo-themes/abc123def456/releases/hexo-theme-flowbite.tgz'
    );
  });
});

describe('resolvePackageResolutionUpdates', () => {
  test('skips entries where version is a semver string, not a URL', async () => {
    const resolutions = {
      'pkg-a': '^1.2.3',
      'pkg-b': '~4.5.0',
      'pkg-c': '0.0.1',
      'pkg-d': '>=1.0.0 <2.0.0'
    };

    const results = await updater.resolvePackageResolutionUpdates(resolutions);

    expect(results).toHaveLength(4);
    results.forEach((r) => {
      expect(r.skipped).toBe(true);
      expect(r.error.message).toContain('Version is not a URL');
    });

    expect(results.map((r) => r.currentPkgName)).toEqual(['pkg-a', 'pkg-b', 'pkg-c', 'pkg-d']);
  });
});
