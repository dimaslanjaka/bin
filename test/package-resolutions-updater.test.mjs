import { resolvePackageResolutionUpdates, replaceRawWithLatestHash } from '../src/package-resolutions-updater.mjs';

describe('package-resolutions-updater', () => {
  it('returns a skipped result when the url is not a valid GitHub url', async () => {
    const result = await resolvePackageResolutionUpdates({ 'pkg-a': 'https://example.com/not-github.tgz' });

    expect(result[0]).toMatchObject({
      skipped: true,
      currentPkgName: 'pkg-a',
      url: 'https://example.com/not-github.tgz'
    });
    expect(result[0].error).toBeInstanceOf(Error);
  });

  it('rewrites a refs heads raw url to use the latest sha', () => {
    const result = replaceRawWithLatestHash(
      'https://github.com/dimaslanjaka/nodejs-package-types/raw/refs/heads/through2/release/types-through2.tgz',
      'branch-sha'
    );

    expect(result).toBe(
      'https://github.com/dimaslanjaka/nodejs-package-types/raw/branch-sha/release/types-through2.tgz'
    );
  });

  it('rewrites blob url to use the sha', () => {
    const result = replaceRawWithLatestHash(
      'https://github.com/dimaslanjaka/bin/blob/master/releases/bin.tgz',
      '0f6ba48'
    );

    expect(result).toBe('https://github.com/dimaslanjaka/bin/raw/0f6ba48/releases/bin.tgz');
  });
});
