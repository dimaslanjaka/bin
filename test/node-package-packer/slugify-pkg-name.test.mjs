import { describe, expect, it } from '@jest/globals';
import { slugifyPkgName } from '../../src/node-package-packer/utils.cjs';

describe('slugifyPkgName()', () => {
  it('replaces @ and / for scoped packages', () => {
    expect(slugifyPkgName('@scope/name')).toBe('scope-name');
  });

  it('keeps unscoped names unchanged', () => {
    expect(slugifyPkgName('simple-package')).toBe('simple-package');
  });

  it('handles names with version strings', () => {
    expect(slugifyPkgName('my-pkg-1.0.0')).toBe('my-pkg-1.0.0');
  });

  it('handles deeply scoped names', () => {
    expect(slugifyPkgName('@a/b/c')).toBe('a-b-c');
  });
});
