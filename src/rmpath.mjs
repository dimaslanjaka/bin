// Fast huge folder deleter for Node.js
// Usage: node rmpath.js <file-or-folder-path>

import dotenv from "dotenv";
import fs from "fs-extra";
import * as glob from "glob";
import path from "upath";
import { fileURLToPath, pathToFileURL } from "url";
import { getArgs } from "./utils/index.cjs";

// Polyfill __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
const dotenvPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(dotenvPath)) {
  dotenv.config({ path: dotenvPath, override: true, quiet: true });
}

const argv = getArgs();
const positional = argv._ || [];

const deletePatterns = [];

export function resolveDeletePatterns(targetPath) {
  if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
    deletePatterns.push(targetPath);
    return;
  }

  const vowels = ["a", "i", "u", "e", "o", "A", "I", "U", "E", "O"];
  const letters = [];
  for (let i = 97; i <= 122; i++) letters.push(String.fromCharCode(i)); // a-z
  for (let i = 65; i <= 90; i++) letters.push(String.fromCharCode(i)); // A-Z

  for (const letter of letters) {
    for (const vowel of vowels) {
      deletePatterns.push(
        `.${letter}*`,
        `@${letter}*`,
        `${letter}*`,
        `@${letter}${vowel}*`,
        `.${letter}${vowel}*`,
        `${letter}${vowel}*`
      );
    }
  }
}

export async function deleteMatchingFiles(baseDir) {
  for (const pattern of deletePatterns) {
    if (fs.existsSync(pattern)) {
      // delete absolute path
      fs.rmSync(pattern, { recursive: true, force: true });
      continue;
    }
    const matches = glob.sync(path.join(baseDir, pattern), { dot: true, nocase: true });
    for (const fpath of matches) {
      try {
        console.log(`deleting ${fpath}`);
        fs.rmSync(fpath, { recursive: true, force: true });
      } catch (_e) {
        console.error(`cannot delete ${fpath}`);
      }
    }
  }
}

export async function deleteMainScript(targetPath) {
  if (!fs.existsSync(targetPath)) {
    targetPath = path.resolve(process.cwd(), targetPath);
  }

  resolveDeletePatterns(targetPath);
  await deleteMatchingFiles(targetPath);
  console.log(`cleaning ${targetPath}`);
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (_e) {
    // ignore
  }
}

// Support both ES modules and CommonJS main script detection
let isMain = false;
try {
  // CommonJS
  if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
    isMain = true;
  }
} catch (_e) {
  // ignore
}
// ES module (robust, cross-platform)
try {
  const mainArg = process.argv[1] && path.resolve(process.argv[1]);
  if (mainArg && import.meta.url === pathToFileURL(mainArg).href) {
    isMain = true;
  }
} catch (_e) {
  // ignore
}

if (isMain) {
  console.log("Invoked from CLI");
  if (positional.length === 0) {
    console.error("You need to provide a file or folder path");
    process.exit(1);
  } else {
    deleteMainScript(positional[0]);
  }
} else {
  console.log("Not invoked from CLI");
}
