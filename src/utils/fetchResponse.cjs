const axios = require('axios');

/**
 * Fetch a URL with axios and return response metadata.
 * @param {string} url The URL to request.
 * @param {import('axios').AxiosRequestConfig} [options] Axios request options.
 * @returns {Promise<{
 *   finalUrl: string,
 *   status: number,
 *   statusText: string,
 *   contentType: string | undefined,
 *   contentLength: string | undefined,
 *   dataLength: number | undefined
 * }>}
 */
async function fetchResponse(url, options = {}) {
  const response = await axios.get(url, {
    maxRedirects: 5,
    responseType: 'arraybuffer',
    validateStatus: () => true,
    ...options
  });

  const finalUrl = response.request?.res?.responseUrl ?? response.request?.responseURL ?? url;

  return {
    finalUrl,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers['content-type'],
    contentLength: response.headers['content-length'],
    dataLength: Buffer.isBuffer(response.data) ? response.data.length : undefined,
    data: response.data
  };
}

module.exports = fetchResponse;
module.exports.fetchResponse = fetchResponse;
module.exports.default = fetchResponse;
