import { getOpenCodeAuth, saveOpenCodeAuth } from '../storage.js';
import { checkOpenCodeApi } from '../utils/check-api.js';
import { getConfig } from '../../binary-collections/config.cjs';

export async function handleAuthRotate(): Promise<void> {
  // Load keys from project config (binary-collectionsrc / package.json)
  const config = await getConfig();
  const keys: Array<{ name: string; key: string }> | undefined = config?.opencode?.keys;
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    console.error(
      'No opencode.keys found in project config. ' +
        'Add an "opencode" section with a "keys" array to your .binary-collectionsrc file.'
    );
    process.exit(1);
  }
  const auth = await getOpenCodeAuth();
  if (!auth) {
    console.error('No auth file found. Run configure first.');
    process.exit(1);
  }
  const currentKey = auth.opencode.key;
  const candidates = keys.filter((k: { name: string; key: string }) => k.key !== currentKey);
  if (candidates.length === 0) {
    console.error('No other keys available to rotate to');
    process.exit(1);
  }

  // shuffle candidates to avoid always picking the same one if multiple are valid
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Test each candidate key in order and pick the first one that responds
  let chosen: { name: string; key: string } | null = null;
  for (const candidate of candidates) {
    try {
      const ok = await checkOpenCodeApi('Hello', candidate.key);
      if (ok) {
        chosen = candidate;
        break;
      }
    } catch {
      // Key failed or errored — skip to next
    }
  }

  if (!chosen) {
    console.error('No working key found among available keys');
    process.exit(1);
  }

  auth.opencode.key = chosen.key;
  await saveOpenCodeAuth(auth);
  console.log(`Rotated OpenCode API key to: ${chosen.name}`);
}
