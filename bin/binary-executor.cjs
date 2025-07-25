#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const binDir = __dirname;
const base = path.basename(__filename, path.extname(__filename));

// Define possible script extensions by platform
const candidates = process.platform === "win32" ? [".cmd", ".bat", ".ps1", ".vbs"] : [".sh", ""];

let found = null;
for (const ext of candidates) {
  const script = path.join(binDir, base + ext);
  if (fs.existsSync(script)) {
    found = script;
    break;
  }
}

if (!found) {
  console.error(`No script found for ${base} in ${binDir}`);
  process.exit(1);
}

const isPs1 = found.endsWith(".ps1");
const isCmd = found.endsWith(".cmd");
// const isSh = found.endsWith(".sh") || (found === found && process.platform !== "win32");

let cmd, args;
if (isPs1) {
  cmd = "powershell.exe";
  args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", found, ...process.argv.slice(2)];
} else if (isCmd) {
  cmd = "cmd.exe";
  args = ["/c", found, ...process.argv.slice(2)];
} else {
  cmd = found;
  args = process.argv.slice(2);
}

const result = spawnSync(cmd, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
