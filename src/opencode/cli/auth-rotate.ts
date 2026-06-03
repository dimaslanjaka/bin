import path from 'upath';
import { getOpenCodeAuth, saveOpenCodeAuth, readJson } from '../storage.js';
import { checkOpenCodeApi } from '../utils/check-api.js';

export async function handleAuthRotate(): Promise<void> {
  // Try reading .opencode.keys.jsonc first, fallback to .opencode.keys.json
  let keysFile = path.join(process.cwd(), '.opencode.keys.jsonc');
  let keys = await readJson<Array<{ name: string; key: string }>>(keysFile);
  if (!keys) {
    keysFile = path.join(process.cwd(), '.opencode.keys.json');
    keys = await readJson<Array<{ name: string; key: string }>>(keysFile);
  }
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    console.error('No valid .opencode.keys.json or .opencode.keys.jsonc found in current directory');
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
