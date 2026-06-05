import { getOpenCodeAuth, saveOpenCodeAuth } from '../storage.js';
import { checkOpenCodeApi } from '../utils/check-api.js';
import { getConfig } from '../../binary-collections/config.cjs';
import { KeyData } from '../../binary-collections/config-types.js';

const WORKING_KEY_CACHE_TTL_MS = 5 * 60 * 1000;

interface WorkingKeyCache {
  key: string;
  proxy?: string;
  expiresAt: number;
}

export interface FindWorkingKeyOptions {
  /** Optional HTTP proxy URL for the API call. */
  proxy?: string;

  /** Disable cache lookup and force checking candidates again. */
  noCache?: boolean;
}

let workingKeyCache: WorkingKeyCache | null = null;

function getCachedWorkingKey(candidates: KeyData[], proxy?: string): KeyData | null {
  if (!workingKeyCache) {
    return null;
  }

  if (Date.now() >= workingKeyCache.expiresAt) {
    workingKeyCache = null;
    return null;
  }

  if (workingKeyCache.proxy !== proxy) {
    return null;
  }

  return candidates.find((candidate) => candidate.key === workingKeyCache?.key) ?? null;
}

function setCachedWorkingKey(candidate: KeyData, proxy?: string): void {
  workingKeyCache = {
    key: candidate.key,
    proxy,
    expiresAt: Date.now() + WORKING_KEY_CACHE_TTL_MS
  };
}

/**
 * Shuffle candidates and test each one against the OpenCode API.
 * Returns the first key that responds successfully.
 *
 * Successful results are cached for 5 minutes per proxy value unless
 * `noCache` is enabled.
 *
 * @param candidates - Key entries to test.
 * @param options    - Optional proxy and cache controls.
 * @returns The first working key entry, or `null` if none respond.
 */
export async function findWorkingKey(candidates: KeyData[], options?: FindWorkingKeyOptions): Promise<KeyData | null> {
  const proxy = options?.proxy;

  if (!options?.noCache) {
    const cached = getCachedWorkingKey(candidates, proxy);
    if (cached) {
      return cached;
    }
  }

  // Shuffle to avoid always picking the same one if multiple are valid
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const candidate of shuffled) {
    try {
      const ok = await checkOpenCodeApi('Hello', candidate.key, 'deepseek-v4-flash-free', proxy);
      if (ok) {
        if (!options?.noCache) {
          setCachedWorkingKey(candidate, proxy);
        }

        return candidate;
      }
    } catch {
      // Key failed or errored — skip to next
    }
  }

  return null;
}

export async function handleAuthRotate(options?: { proxy?: string; noCache?: boolean }): Promise<void> {
  // Load keys from project config (binary-collections.config.{js,cjs,mjs} / package.json)
  const config = await getConfig();
  const keys: Array<KeyData> | undefined = config?.opencode?.keys;
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    console.error(
      'No opencode.keys found in project config. ' +
        'Add an "opencode" section with a "keys" array to your binary-collections.config.{js,cjs,mjs} file.'
    );
    process.exit(1);
  }

  const auth = await getOpenCodeAuth();
  if (!auth) {
    console.error('No auth file found. Run configure first.');
    process.exit(1);
  }

  const currentKey = auth.opencode.key;
  const candidates = keys.filter((k: KeyData) => k.key !== currentKey);
  if (candidates.length === 0) {
    console.error('No other keys available to rotate to');
    process.exit(1);
  }

  const chosen = await findWorkingKey(candidates, {
    proxy: options?.proxy,
    noCache: options?.noCache
  });

  if (!chosen) {
    console.error('No working key found among available keys');
    process.exit(1);
  }

  auth.opencode.key = chosen.key;
  await saveOpenCodeAuth(auth);
  console.log(`Rotated OpenCode API key to: ${chosen.name}`);
}
