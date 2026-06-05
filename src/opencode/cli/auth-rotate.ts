import { getOpenCodeAuth, saveOpenCodeAuth } from '../storage.js';
import { checkOpenCodeApi } from '../utils/check-api.js';
import { getConfig } from '../../binary-collections/config.cjs';
import { OpencodeKey } from '../../binary-collections/config-types.js';

/**
 * Shuffle candidates and test each one against the OpenCode API.
 * Returns the first key that responds successfully.
 *
 * @param candidates - Key entries to test (shuffled internally).
 * @param proxy      - Optional HTTP proxy URL for the API call.
 * @returns The first working key entry, or `null` if none respond.
 */
export async function findWorkingKey(candidates: OpencodeKey[], proxy?: string): Promise<OpencodeKey | null> {
  // Shuffle to avoid always picking the same one if multiple are valid
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const candidate of candidates) {
    try {
      const ok = await checkOpenCodeApi('Hello', candidate.key, 'deepseek-v4-flash-free', proxy);
      if (ok) {
        return candidate;
      }
    } catch {
      // Key failed or errored — skip to next
    }
  }

  return null;
}

export async function handleAuthRotate(options?: { proxy?: string }): Promise<void> {
  // Load keys from project config (binary-collections.config.{js,cjs,mjs} / package.json)
  const config = await getConfig();
  const keys: Array<OpencodeKey> | undefined = config?.opencode?.keys;
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
  const candidates = keys.filter((k: OpencodeKey) => k.key !== currentKey);
  if (candidates.length === 0) {
    console.error('No other keys available to rotate to');
    process.exit(1);
  }

  const chosen = await findWorkingKey(candidates, options?.proxy);

  if (!chosen) {
    console.error('No working key found among available keys');
    process.exit(1);
  }

  auth.opencode.key = chosen.key;
  await saveOpenCodeAuth(auth);
  console.log(`Rotated OpenCode API key to: ${chosen.name}`);
}
