import https from 'node:https';

/**
 * Check whether a GitHub token is valid.
 *
 * @param {string} token GitHub personal access token
 * @returns {Promise<boolean>}
 */
export async function isGitHubTokenValid(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: '/user',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'github-token-validator',
          Accept: 'application/vnd.github+json'
        }
      },
      (res) => {
        // 200 = valid token
        resolve(res.statusCode === 200);

        // consume response to avoid memory leak
        res.resume();
      }
    );

    req.on('error', () => resolve(false));
    req.end();
  });
}
