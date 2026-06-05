import OpenAI from 'openai';
import { getOpenCodeAuth } from '../storage.js';
import { ProxyAgent } from 'undici';

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
}

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

/** Build an OpenAI client from the OpenCode auth file or OPENAI_API_KEY env var. */
export async function buildOpenAIClient(
  modelOrOptions?: string | BuildOpenAIClientOptions
): Promise<{ client: OpenAI; model: string; dispatcher?: ProxyAgent }> {
  // Normalise arguments for backward compatibility:
  //   buildOpenAIClient('gpt-4')          ← old string-only signature
  //   buildOpenAIClient({ model, proxy }) ← new options object
  const opts: BuildOpenAIClientOptions =
    typeof modelOrOptions === 'string' ? { model: modelOrOptions } : { ...modelOrOptions };

  const { model, proxy } = opts;
  const proxyResult = proxy ? buildProxyOptions(proxy) : undefined;
  const proxyConfig = proxyResult;
  const dispatcher = proxyResult?.dispatcher;

  // 1. Try OpenCode auth (opencode.ai/zen endpoint)
  const auth = await getOpenCodeAuth();
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
