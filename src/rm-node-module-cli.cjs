const path = require('upath');
const fs = require('fs-extra');
const { getArgs } = require('./utils/index.cjs');
const glob = require('glob');
const ansiColors = require('ansi-colors');
const { cleanUp } = require('./rm-node-modules.cjs');

const argv = getArgs({
  boolean: ['h', 'help', 'force'],
  alias: {
    h: 'help'
  }
});

if (argv.help) {
  console.log(`
rm-node-modules

Usage:
  rm-node-modules [options]

Examples:
  node src/rm-node-module-cli.cjs
  node src/rm-node-module-cli.cjs --force
  npx binary-collections rm-node-modules
  npx binary-collections rm-node-modules --force

Options:
  -h, --help     Show this help message
  --force        Actually delete node_modules (default is dry-run mode)

Description:
  Removes node_modules subfolders by first-letter in parallel to speed up
  deletions. By default runs in dry-run mode (shows what would be deleted).
  Pass --force to actually perform deletion.
  The script writes a temporary shell script and executes it; the
  temporary script is removed after completion. On Windows, this requires a
  Unix-compatible shell in PATH (e.g., Git Bash or WSL).
`);
  process.exit(0);
}

async function main() {
  if (!argv.workspace) {
    await cleanUp(process.cwd(), { dryRun: !argv.force });
    return;
  }

  const pkgJsonPath = path.resolve(process.cwd(), argv.workspace, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error(`Error: package.json not found in workspace directory: ${ansiColors.red(argv.workspace)}`);
    process.exitCode = 1;
    return;
  }

  /** @type {string[]} */
  const workspaces = (JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')).workspaces || []).flatMap((workspace) => {
    return glob.sync(workspace, {
      cwd: process.cwd(),
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
  });

  for (const workspacePath of workspaces) {
    if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
      console.log(`Cleaning node_modules in workspace: ${ansiColors.cyan(workspacePath)}`);
      await cleanUp(workspacePath, { dryRun: !argv.force });
    } else {
      console.warn(
        `Warning: No package.json found in workspace path: ${ansiColors.yellow(workspacePath)}, skipping...`
      );
    }
  }
}

main().catch((e) => {
  console.error(ansiColors.red(e instanceof Error ? e.stack || e.message : String(e)));
  process.exitCode = 1;
});
