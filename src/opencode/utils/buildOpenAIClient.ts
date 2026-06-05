import OpenAI from 'openai';
import { getOpenCodeAuth } from '../storage.js';
import { ProxyAgent } from 'undici';
import { OpenCodeAuthData } from '../types.js';
import { BinaryCollectionsConfig } from '../../binary-collections/config-types.js';

export interface BuildOpenAIClientOptions {
  /** The model name to use. Default varies by provider. */
  model?: string;

  /**
   * HTTP/HTTPS proxy URL for all API requests.
   *
   * Supported formats:
   *   - `http://proxy:8080`
   *   - `https://proxy:8443`
   *   - `http://user:pass@proxy:8080`
   *
   * SOCKS5 is **not** directly supported by the underlying undici `ProxyAgent`.
   * For SOCKS5, use an HTTP-to-SOCKS bridge such as `hpts` or set the
   * `HTTP_PROXY` / `HTTPS_PROXY` environment variables at the process level.
   */
  proxy?: string;

  /**
   * Pre-resolved auth data.
   *
   * Accepts either:
   *   - `OpenCodeAuthData` — auth shape from `getOpenCodeAuth()` with
   *     `{ opencode: { key } }`, `{ google: { key } }`, etc.
   *   - `BinaryCollectionsConfig` — config file shape with
   *     `{ opencode: { keys: [{ name, key }] } }`. The first key in the
   *     array is extracted automatically.
   *
   * When provided, `buildOpenAIClient` skips `getOpenCodeAuth()` and uses
   * these keys directly (useful when auth is already loaded by the caller).
   */
  apiKeys?: OpenCodeAuthData | BinaryCollectionsConfig;
}

/**
 * Extract an `opencode` key token from a pre-resolved auth object.
 *
 * Supports two runtime shapes:
 *   1. **OpenCodeAuthData** — detected by `opencode.key` → returned as-is.
 *   2. **BinaryCollectionsConfig** — detected by `opencode.keys` (array) →
 *      the first item is extracted into an `OpenCodeAuthData`-shaped object
 *      with only the `opencode` field populated.
 *
 * @param keys - Auth data in either supported shape.
 * @returns An `OpenCodeAuthData`-shaped object with just the `opencode` token,
 *          or `undefined` if neither shape matched.
 */
function extractApiKey(keys: OpenCodeAuthData | BinaryCollectionsConfig): OpenCodeAuthData | undefined {
  // OpenCodeAuthData shape: { opencode: { key: string } }
  if ('opencode' in keys && typeof keys.opencode === 'object' && keys.opencode !== null && 'key' in keys.opencode) {
    return keys as OpenCodeAuthData;
  }

  // BinaryCollectionsConfig shape: { opencode: { keys: OpencodeKey[] } }
  if (
    'opencode' in keys &&
    typeof keys.opencode === 'object' &&
    keys.opencode !== null &&
    'keys' in keys.opencode &&
    Array.isArray(keys.opencode.keys) &&
    keys.opencode.keys.length > 0
  ) {
    const first = keys.opencode.keys[0];
    return { opencode: { type: 'binary-collections', key: first.key } } as OpenCodeAuthData;
  }

  return undefined;
}

/**
 * Build fetch options from a proxy URL using undici `ProxyAgent`.
 *
 * @param proxy - HTTP/HTTPS proxy URL (SOCKS5 throws).
 * @returns An object with `fetchOptions` (for the OpenAI constructor) and
 *          the raw `dispatcher` (for per-request overrides).
 */
function buildProxyOptions(proxy: string): {
  fetchOptions: { dispatcher: ProxyAgent };
  dispatcher: ProxyAgent;
} {
  if (!proxy.startsWith('http://') && !proxy.startsWith('https://')) {
    throw new Error(
      `Unsupported proxy protocol: '${proxy.split(':')[0]}'. ` +
        'Only HTTP/HTTPS proxies are supported. ' +
        'For SOCKS5, use an HTTP-to-SOCKS bridge (e.g. `hpts`) or set the HTTP_PROXY/HTTPS_PROXY env vars.'
    );
  }

  const dispatcher = new ProxyAgent(proxy);
  return {
    fetchOptions: { dispatcher },
    dispatcher
  };
}

/**
 * Build an OpenAI client (and resolved model name) from available credentials.
 *
 * Priority order:
 *   1. `apiKeys` option (pre-resolved auth, if provided — only the `opencode`
 *      token is extracted from either `OpenCodeAuthData` or `BinaryCollectionsConfig`)
 *   2. OpenCode auth file (`opencode.ai/zen` endpoint)
 *   3. Google Gemini (OpenAI-compatible endpoint)
 *   4. `OPENAI_API_KEY` env var (standard OpenAI)
 *
 * @param modelOrOptions - Either a model name string (backward-compatible) or
 *                         a `BuildOpenAIClientOptions` object with `model`,
 *                         `proxy`, and/or `apiKeys` (accepts both
 *                         `OpenCodeAuthData` and `BinaryCollectionsConfig`).
 * @returns The OpenAI client instance, the resolved model name, and an optional
 *          undici `ProxyAgent` dispatcher for per-request fetch overrides.
 */
export async function buildOpenAIClient(
  modelOrOptions?: string | BuildOpenAIClientOptions
): Promise<{ client: OpenAI; model: string; dispatcher?: ProxyAgent }> {
  // Normalise arguments for backward compatibility:
  //   buildOpenAIClient('gpt-4')          ← old string-only signature
  //   buildOpenAIClient({ model, proxy }) ← new options object
  const opts: BuildOpenAIClientOptions =
    typeof modelOrOptions === 'string' ? { model: modelOrOptions } : { ...modelOrOptions };

  const { model, proxy, apiKeys } = opts;
  const proxyResult = proxy ? buildProxyOptions(proxy) : undefined;
  const proxyConfig = proxyResult;
  const dispatcher = proxyResult?.dispatcher;

  // 1. Try OpenCode auth (opencode.ai/zen endpoint)
  const auth = apiKeys ? extractApiKey(apiKeys) : await getOpenCodeAuth();
  if (auth?.opencode?.key) {
    return {
      client: new OpenAI({
        baseURL: 'https://opencode.ai/zen/v1',
        apiKey: auth.opencode.key,
        ...proxyConfig
      }),
      model: model || 'deepseek-v4-flash-free',
      dispatcher
    };
  }

  // 2. Try Google Gemini via OpenAI-compatible endpoint
  if (auth?.google?.key) {
    return {
      client: new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: auth.google.key,
        ...proxyConfig
      }),
      model: model || 'gemini-2.0-flash',
      dispatcher
    };
  }

  // 3. Fallback: standard OpenAI from env
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'No LLM API key found.\n' + 'Either configure opencode (run opencode once) or set OPENAI_API_KEY env var.'
    );
  }

  return {
    client: new OpenAI({ apiKey, ...proxyConfig }),
    model: model || 'gpt-4o-mini',
    dispatcher
  };
}
