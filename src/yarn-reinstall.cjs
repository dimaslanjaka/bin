const { execSync } = require("child_process");
const { getArgs } = require("./utils.js");
const args = getArgs();
const positional = args._ || [];

if (positional.length === 0) {
  console.error("Usage: yarn-reinstall <packageName> [--dev|-D|--peer|-P|--optional|-O]");
  process.exit(1);
}

const packageName = positional[0];
const flags = positional.slice(1).concat(
  Object.keys(args)
    .filter((k) => k !== "_" && args[k] === true)
    .map((k) => `--${k}`)
);

if (!packageName) {
  console.error("Please provide a package name.");
  process.exit(1);
}

// Remove and add commands
const removeCmd = `yarn remove ${packageName}`;
const addCmd = `yarn add ${packageName} ${flags.join(" ")}`.trim();

try {
  // Check if the package is installed before removing
  let isInstalled = false;
  try {
    const listOutput = execSync(`yarn list --pattern "${packageName}" --depth=0`, { encoding: "utf8" });
    isInstalled = listOutput.includes(packageName + "@");
  } catch (_e) {
    // If yarn list fails, assume not installed
    isInstalled = false;
  }

  if (isInstalled) {
    console.log(`Running: ${removeCmd}`);
    execSync(removeCmd, { stdio: "inherit" });
  } else {
    console.warn(`Package "${packageName}" was not installed or not referenced, skipping remove.`);
  }

  console.log(`Running: ${addCmd}`);
  execSync(addCmd, { stdio: "inherit" });
} catch (err) {
  process.exit(err.status || 1);
}
