import { afterEach, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

// Set reasonable per-test timeout (30 seconds)
jest.setTimeout(30000);

const mockFetchResponse = jest.fn();

jest.unstable_mockModule('../src/utils/fetchResponse.cjs', () => ({
  __esModule: true,
  default: mockFetchResponse,
  fetchResponse: mockFetchResponse
}));

describe('getLatestCommit', () => {
  let updater;
  let consoleLogSpy;

  beforeAll(async () => {
    updater = await import('../src/package-resolutions-updater.mjs');
  });

  beforeEach(() => {
    mockFetchResponse.mockReset();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  test('returns the latest commit metadata for the requested branch', async () => {
    mockFetchResponse.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'content-length': String(Math.random())
      },
      data: {
        sha: 'abc123def456',
        commit: {
          committer: {
            date: '2026-05-13T12:34:56Z'
          }
        }
      },
      request: {
        responseURL: 'https://api.github.com/repos/dimaslanjaka/bin/commits/main'
      }
    });

    await expect(updater.getLatestCommit('dimaslanjaka', 'bin')).resolves.toEqual({
      owner: 'dimaslanjaka',
      repo: 'bin',
      branch: 'main',
      sha: 'abc123def456',
      date: '2026-05-13T12:34:56.000Z'
    });

    expect(mockFetchResponse).toHaveBeenCalledWith(
      'https://api.github.com/repos/dimaslanjaka/bin/commits/main',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': expect.any(String),
          'X-GitHub-Api-Version': '2022-11-28'
        })
      })
    );
  });

  test('throws when the GitHub response is missing the SHA or date', async () => {
    mockFetchResponse.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'content-length': String(Math.random())
      },
      data: {
        commit: {}
      },
      request: {
        responseURL: 'https://api.github.com/repos/dimaslanjaka/bin/commits/develop'
      }
    });

    await expect(updater.getLatestCommit('dimaslanjaka', 'bin', 'develop')).rejects.toThrow(
      'Missing SHA or date for dimaslanjaka/bin@develop'
    );
  });
});
