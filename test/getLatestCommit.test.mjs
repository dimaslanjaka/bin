import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { EventEmitter } from 'node:events';
import https from 'https';
import * as updater from '../src/package-resolutions-updater.mjs';

describe('getLatestCommit', () => {
  let httpsGetSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (httpsGetSpy) {
      httpsGetSpy.mockRestore();
    }
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  function mockGithubResponse(payload, statusCode = 200) {
    httpsGetSpy = jest.spyOn(https, 'get').mockImplementation((url, options, callback) => {
      const request = new EventEmitter();
      const response = new EventEmitter();

      response.statusCode = statusCode;

      callback(response);

      process.nextTick(() => {
        response.emit('data', JSON.stringify(payload));
        response.emit('end');
      });

      return request;
    });
  }

  test('returns the latest commit metadata for the requested branch', async () => {
    mockGithubResponse({
      sha: 'abc123def456',
      commit: {
        committer: {
          date: '2026-05-13T12:34:56Z'
        }
      }
    });

    await expect(updater.getLatestCommit('dimaslanjaka', 'bin')).resolves.toEqual({
      owner: 'dimaslanjaka',
      repo: 'bin',
      branch: 'main',
      sha: 'abc123def456',
      date: '2026-05-13T12:34:56.000Z'
    });

    expect(httpsGetSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/dimaslanjaka/bin/commits/main',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': expect.any(String),
          'X-GitHub-Api-Version': '2022-11-28'
        })
      }),
      expect.any(Function)
    );
  });

  test('throws when the GitHub response is missing the SHA or date', async () => {
    mockGithubResponse({
      commit: {}
    });

    await expect(updater.getLatestCommit('dimaslanjaka', 'bin', 'develop')).rejects.toThrow(
      'Missing SHA or date for dimaslanjaka/bin@develop'
    );
  });
});
