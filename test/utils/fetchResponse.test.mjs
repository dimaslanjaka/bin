import fetchResponseModule from '../../src/utils/fetchResponse.cjs';

const { fetchResponse } = fetchResponseModule;
const TGZ_URLS = [
  'https://github.com/dimaslanjaka/nodejs-package-types/raw/through2/release/types-through2.tgz',
  'https://github.com/dimaslanjaka/nodejs-package-types/raw/refs/heads/through2/release/types-through2.tgz'
];

function isArchive(buffer) {
  const header = buffer.subarray(0, 8);

  // ZIP: 50 4B 03 04
  if (header[0] === 0x50 && header[1] === 0x4b) return 'zip';

  // RAR: 52 61 72 21 ("Rar!")
  if (header[0] === 0x52 && header[1] === 0x61 && header[2] === 0x72 && header[3] === 0x21) return 'rar';

  // GZIP: 1F 8B
  if (header[0] === 0x1f && header[1] === 0x8b) return 'gzip';

  // TAR usually detected via "ustar" at offset 257
  const ustar = buffer.toString('utf8', 257, 262);
  if (ustar === 'ustar') return 'tar';

  return null;
}

describe('fetchResponse()', () => {
  for (const url of TGZ_URLS) {
    it(`should fetch and return metadata for ${url}`, async () => {
      const result = await fetchResponse(url);

      expect(result).toHaveProperty('data');

      expect(result.status).toBe(200);
      expect(result.contentType).toMatch(/application\/octet-stream|application\/gzip|application\/x-tar/);
      expect(typeof result.dataLength).toBe('number');
      expect(isArchive(result.data)).not.toBeNull();
      const type = isArchive(Buffer.from(result.data));
      expect(type).toBe('gzip');
    });
  }
});
