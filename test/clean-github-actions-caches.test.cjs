const {
  getCachePrefix,
  getMeaningfulCacheKeyParts,
  groupCachesByPrefix,
  isChecksumSegment,
  normalizePrefixDepth
} = require('../src/github-workflows/clean-github-actions-caches.cjs');

describe('clean-github-actions-caches prefix grouping', () => {
  it('defaults to three segments when the depth is missing or invalid', () => {
    expect(normalizePrefixDepth()).toBe(3);
    expect(normalizePrefixDepth('not-a-number')).toBe(3);
    expect(normalizePrefixDepth(0)).toBe(3);
  });

  it('keeps the first three key segments as the grouping prefix', () => {
    expect(getCachePrefix('Linux-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6', 3)).toBe('Linux-');
    expect(getCachePrefix('Linux-node-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6', 3)).toBe(
      'Linux-node-'
    );
    expect(getCachePrefix('Linux-node-vxx-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6', 3)).toBe(
      'Linux-node-vxx'
    );
  });

  it('removes checksum-like segments before grouping', () => {
    expect(isChecksumSegment('36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6')).toBe(true);
    expect(isChecksumSegment('Linux')).toBe(false);
    expect(
      getMeaningfulCacheKeyParts('Linux-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6', 3)
    ).toEqual(['Linux']);
  });

  it('skips checksum segments in the middle of a cache key', () => {
    expect(getCachePrefix('x-d-x-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6-x-v-n', 3)).toBe(
      'x-d-x-x-v-n'
    );
  });

  it('groups cache entries by the configured prefix depth', () => {
    const grouped = groupCachesByPrefix(
      [
        { id: 1, key: 'Linux-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6' },
        { id: 2, key: 'Linux-node-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6' },
        { id: 3, key: 'Linux-node-vxx-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6' },
        { id: 4, key: 'x-d-x-36b76193f978c44ac66de6d0f0d15ade304b7d4e22e846b9a5110b10fec4a5f6-x-v-n' }
      ],
      3
    );

    expect(Object.keys(grouped).sort()).toEqual(['Linux-', 'Linux-node-', 'Linux-node-vxx', 'x-d-x-x-v-n']);
    expect(grouped['x-d-x-x-v-n']).toHaveLength(1);
  });
});
