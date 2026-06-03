import axios from 'axios';
import { writefile } from 'sbg-utility';
import { getTempPath } from '../../binary-collections/config.cjs';
import { isDebug } from '../../utils/isDebug.cjs';
import { sha256 } from '../../run-by-checksum/hash.cjs';
import { ProxyAgent } from 'proxy-agent';

function getProxyUrl(proxyUrl?: string): string | undefined {
  return (
    proxyUrl ||
    process.env.OPENCODE_PROXY ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy
  );
}

function maskProxyUrl(proxyUrl: string): string {
  try {
    const url = new URL(proxyUrl);

    if (url.username || url.password) {
      url.username = '***';
      url.password = '***';
    }

    return url.toString();
  } catch {
    return proxyUrl.replace(/:\/\/.*@/, '://***@');
  }
}

/**
 * Checks whether the OpenCode API returns a non-empty response for a given prompt.
 *
 * Sends a chat completion request and returns `true` when the model produces
 * meaningful output (non-empty `content` or `reasoning_content`).
 *
 * @param prompt - The user message to send to the model.
 * @param apiKey - Bearer token for API authentication.
 * @param model  - Model identifier (defaults to `'deepseek-v4-flash-free'`).
 * @param proxyUrl - Optional proxy URL. e.g: `http://127.0.0.1:8080, https://127.0.0.1:8443, socks4://127.0.0.1:1080, socks5://127.0.0.1:1080, socks5://user:pass@127.0.0.1:1080`
 * @returns `true` if the response contains non-empty content, `false` otherwise.
 *
 * @example
 * await checkOpenCodeApi('Hello', apiKey, 'deepseek-v4-flash-free', 'socks5://127.0.0.1:1080');
 */
export async function checkOpenCodeApi(
  prompt: string,
  apiKey: string,
  model: string = 'deepseek-v4-flash-free',
  proxyUrl?: string
): Promise<boolean> {
  const debug = isDebug();
  const resolvedProxyUrl = getProxyUrl(proxyUrl);

  let proxyAgent: ProxyAgent | undefined;

  if (resolvedProxyUrl) {
    const proxyUrlValue = resolvedProxyUrl;

    proxyAgent = new ProxyAgent({
      getProxyForUrl: () => proxyUrlValue
    });
  }

  try {
    if (debug && resolvedProxyUrl) {
      console.log(`Using proxy: ${maskProxyUrl(resolvedProxyUrl)}`);
    }

    const res = await axios.post(
      'https://opencode.ai/zen/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true,
        timeout: 30000,
        proxy: false,
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent
      }
    );

    if (debug) {
      console.log('OpenCode status:', res.status);
    }

    const filePath = getTempPath('logs', `opencode-api-check-${sha256(apiKey)}.json`);

    if (debug) {
      writefile(filePath, JSON.stringify(res.data, null, 2));
      console.log(`OpenCode API check response dumped to: ${filePath}`);
    }

    const errorType = res.data?.error?.type;

    if (res.status === 429 && errorType === 'FreeUsageLimitError') {
      if (debug) {
        console.warn('OpenCode API rate limit exceeded. Skipping this key.');
      }

      return false;
    }

    if (res.status < 200 || res.status >= 300) {
      if (debug) {
        console.error('OpenCode API returned non-2xx response:', res.data);
      }

      return false;
    }

    const message = res.data?.choices?.[0]?.message;
    const output = message?.content || message?.reasoning_content;

    return Boolean(output && output.trim().length > 0);
  } catch (err) {
    if (debug) {
      console.error('OpenCode API check failed');

      if (axios.isAxiosError(err)) {
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        console.error('Status:', err.response?.status);
        console.error('Response:', err.response?.data);
      } else {
        console.error(err);
      }
    }

    return false;
  }
}
