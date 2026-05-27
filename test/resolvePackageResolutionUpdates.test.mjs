import { resolvePackageResolutionUpdates } from '../src/package-resolutions-updater.mjs';
import { describe, expect, it, jest } from '@jest/globals';

describe('resolvePackageResolutionUpdates (real GitHub API)', () => {
  // GitHub requests may take time
  jest.setTimeout(60_000);

  it('updates through2 resolution to latest commit hash', async () => {
    const resolutions = {
      '@types/through2':
        'https://github.com/dimaslanjaka/nodejs-package-types/raw/refs/heads/through2/release/types-through2.tgz'
    };

    const result = await resolvePackageResolutionUpdates(resolutions);

    expect(result).toHaveLength(1);

    const update = result[0];

    expect(update.failed).toBe(true);
    expect(update.currentPkgName).toBe('@types/through2');
  });
});
