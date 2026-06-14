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

/**
 * Rotates the active OpenCode API key by selecting and testing a working key.
 *
 * @remarks
 * This function performs the following steps:
 * 1. Loads keys from options, or falls back to the project configuration
 * 2. Filters out the currently active key
 * 3. Tests remaining keys against the OpenCode API to find a working one
 * 4. Updates the auth file with the selected working key
 *
 * @param options - Optional configuration for rotation behavior
 * @param options.proxy - HTTP proxy URL to use for API validation
 * @param options.noCache - Bypass cache and force fresh API checks
 * @param options.keys - Custom array of key candidates to test. If provided, overrides config keys.
 *
 * @returns A promise that resolves when rotation completes successfully
 *
 * @throws Will call `process.exit(1)` if:
 * - No keys are found in either options or project config
 * - No auth file exists
 * - No alternative keys are available
 * - No working key can be found among candidates
 *
 * @example
 * ```typescript
 * await handleAuthRotate({
 *   keys: [{ name: 'custom-key', key: 'sk-...' }],
 *   proxy: 'http://proxy.example.com'
 * });
 * ```
 */
export async function handleAuthRotate(options?: {
  proxy?: string;
  noCache?: boolean;
  keys?: KeyData[];
}): Promise<void> {
  // Load keys from options, fallback to project config (binary-collections.config.{js,cjs,mjs} / package.json)
  let keys = options?.keys;
  if (!keys) {
    const config = await getConfig();
    keys = config?.opencode?.keys;
  }

  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    console.error(
      'No opencode.keys found. ' +
        'Add an "opencode" section with a "keys" array to your binary-collections.config.{js,cjs,mjs} file, ' +
        'or pass custom keys in the options.'
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
