import OpenAI from 'openai';
import { getOpenCodeAuth } from '../storage.js';
import { ProxyAgent } from 'undici';
import { OpenCodeAuthData } from '../types.js';
import { BinaryCollectionsConfig } from '../../binary-collections/config-types.js';
import { findWorkingKey } from '../cli/auth-rotate.js';

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
async function extractApiKey(
  keys: OpenCodeAuthData | BinaryCollectionsConfig,
  proxy?: string
): Promise<OpenCodeAuthData | undefined> {
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
    const pick = await findWorkingKey(keys.opencode.keys, { proxy });
    if (!pick) {
      return undefined;
    }
    return { opencode: { type: 'binary-collections', key: pick.key } } as OpenCodeAuthData;
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
  dispatcher: ProxyAgent;
  /**  */
  proxy: string;
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
    dispatcher,
    proxy
  };
}

/**
 * Build an OpenAI-compatible client and resolve the model name from the
 * available credentials.
 *
 * Credential resolution:
 *   1. Use `apiKeys` from options when provided.
 *   2. Otherwise, read the saved OpenCode auth data.
 *   3. If no compatible saved credentials are available, fall back to
 *      `OPENAI_API_KEY`.
 *
 * Provider priority from the resolved auth data:
 *   1. OpenCode via `https://opencode.ai/zen/v1`
 *   2. Google Gemini via OpenAI-compatible endpoint
 *   3. Standard OpenAI using `OPENAI_API_KEY`
 *
 * Default models:
 *   - OpenCode: `deepseek-v4-flash-free`
 *   - Google Gemini: `gemini-2.0-flash`
 *   - OpenAI: `gpt-4o-mini`
 *
 * @param modelOrOptions - A model name string for backward compatibility, or a
 * `BuildOpenAIClientOptions` object containing an optional `model`, `proxy`,
 * and/or `apiKeys`.
 *
 * @returns An object containing the configured OpenAI client, the resolved model
 * name, and the optional undici `ProxyAgent` dispatcher created from `proxy`.
 *
 * @throws If no OpenCode, Google, or `OPENAI_API_KEY` credential is available.
 */
export async function buildOpenAIClient(
  modelOrOptions?: string | BuildOpenAIClientOptions
): Promise<{ client: OpenAI; model: string; dispatcher?: ProxyAgent; proxy?: string }> {
  // Backward compatibility:
  //   buildOpenAIClient('gpt-4')
  //   buildOpenAIClient({ model, proxy })
  const opts: BuildOpenAIClientOptions =
    typeof modelOrOptions === 'string' ? { model: modelOrOptions } : (modelOrOptions ?? {});

  const { model, proxy, apiKeys } = opts;

  const proxyOptions = proxy ? buildProxyOptions(proxy) : undefined;
  const dispatcher = proxyOptions?.dispatcher;

  const createClient = (baseURL: string | undefined, apiKey: string) =>
    new OpenAI({
      ...(baseURL ? { baseURL } : {}),
      apiKey,
      ...proxyOptions
    });

  const auth = apiKeys ? await extractApiKey(apiKeys, proxyOptions?.proxy) : await getOpenCodeAuth();

  // 1. Try OpenCode auth via opencode.ai/zen
  if (auth?.opencode?.key) {
    return {
      client: createClient('https://opencode.ai/zen/v1', auth.opencode.key),
      model: model || 'deepseek-v4-flash-free',
      dispatcher
    };
  }

  // 2. Try Google Gemini via OpenAI-compatible endpoint
  if (auth?.google?.key) {
    return {
      client: createClient('https://generativelanguage.googleapis.com/v1beta/openai', auth.google.key),
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
    client: createClient(undefined, apiKey),
    model: model || 'gpt-4o-mini',
    dispatcher,
    proxy
  };
}
