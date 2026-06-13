const color = require('ansi-colors');
const glob = require('glob');
const path = require('upath');

/** Define default binary mappings for package.json "bin" field */
const defaultBin = {
  'actions-badge': 'lib/github-workflows/workflow-badge-cli.cjs',
  'binary-collections': 'lib/binary-collections.cjs',
  'build-package': 'lib/node-package-packer-cli.cjs',
  'build-package-tarball': 'lib/node-package-packer-cli.cjs',
  'build-tarball': 'lib/node-package-packer-cli.cjs',
  chatgpt: 'lib/free-chatgpt.cjs',
  'clean-github-actions-cache': 'lib/github-workflows/clean-github-actions-caches-cli.cjs',
  'clean-github-actions-caches': 'lib/github-workflows/clean-github-actions-caches-cli.cjs',
  'clear-gh-caches': 'lib/github-workflows/clean-github-actions-caches-cli.cjs',
  'clear-github-caches': 'lib/github-workflows/clean-github-actions-caches-cli.cjs',
  'clear-github-actions-cache': 'lib/github-workflows/clean-github-actions-caches-cli.cjs',
  'clear-github-actions-caches': 'lib/github-workflows/clean-github-actions-caches-cli.cjs',
  copy: 'lib/file/copy-cli.cjs',
  'copy-file': 'lib/file/copy-cli.cjs',
  'del-gradle': 'lib/del-gradle.cjs',
  'del-nodemodules': 'lib/del-node-modules.cjs',
  'del-ps': 'lib/del-ps-cli.cjs',
  'del-yarn-caches': 'lib/del-yarn-caches.cjs',
  'del-yarncaches': 'lib/del-yarn-caches.cjs',
  'dir-tree': 'lib/print-directory-tree-cli.cjs',
  download: 'lib/downloader-cli.cjs',
  'download-file': 'lib/downloader-cli.cjs',
  downloader: 'lib/downloader-cli.cjs',
  'exec-node': 'lib/node-executor.cjs',
  'execute-node': 'lib/node-executor.cjs',
  'fetch-file': 'lib/downloader-cli.cjs',
  'file-downloader': 'lib/downloader-cli.cjs',
  'free-chatgpt': 'lib/free-chatgpt.cjs',
  'generate-build-ci': 'lib/github-workflows/generate-build-release-ci-cli.cjs',
  'generate-ci': 'lib/github-workflows/generate-ci-cli.cjs',
  'generate-test-ci': 'src/github-workflows/generate-test-ci-step-cli.cjs',
  'get-latest-workflow': 'lib/github-workflows/get-latest-workflow-status-cli.cjs',
  'get-latest-workflow-status': 'lib/github-workflows/get-latest-workflow-status-cli.cjs',
  'gh-status-badge': 'lib/github-workflows/workflow-badge-cli.cjs',
  'git-diff': 'lib/git/git-diff-cli.cjs',
  'git-diff-staged-ai': 'lib/git/git-diff-staged-ai-cli.cjs',
  'git-fix': 'lib/git/git-fix.cjs',
  'git-purge': 'lib/git/git-purge.cjs',
  'git-undo-commit': 'lib/git/undo-commit.cjs',
  'git-undo-staged': 'lib/git/undo-staged.cjs',
  'latest-workflow': 'lib/github-workflows/get-latest-workflow-status-cli.cjs',
  move: 'lib/file/move-cli.cjs',
  'move-file': 'lib/file/move-cli.cjs',
  'node-copy': 'lib/file/copy-cli.cjs',
  'node-exec': 'lib/node-executor.cjs',
  'node-executor': 'lib/node-executor.cjs',
  'node-move': 'lib/file/move-cli.cjs',
  'node-package-packer': 'lib/node-package-packer-cli.cjs',
  'npm-run-series': 'lib/npm-run-series.cjs',
  nrs: 'lib/npm-run-series.cjs',
  opc: 'lib/opencode-cli.cjs',
  'opencode-cli': 'lib/opencode-cli.cjs',
  'pack-node-package': 'lib/node-package-packer-cli.cjs',
  'pack-tarball': 'lib/node-package-packer-cli.cjs',
  'pkg-res-updater': 'lib/package-resolutions-updater-cli.cjs',
  'pkg-resolutions-updater': 'lib/package-resolutions-updater-cli.cjs',
  'print-tarball-tree': 'lib/print-tarball-tree-cli.cjs',
  'print-tree': 'lib/print-tree-cli.cjs',
  'remove-node-module': 'lib/rm-node-module-cli.cjs',
  'remove-node-modules': 'lib/rm-node-module-cli.cjs',
  'rm-node-module': 'lib/rm-node-module-cli.cjs',
  'rm-node-modules': 'lib/rm-node-module-cli.cjs',
  rmpath: 'lib/rmpath-cli.cjs',
  'run-by-checksum': 'lib/run-by-checksum-cli.cjs',
  'run-c': 'lib/run-by-checksum-cli.cjs',
  'run-checksum': 'lib/run-by-checksum-cli.cjs',
  'run-s': 'lib/npm-run-series.cjs',
  'run-series': 'lib/npm-run-series.cjs',
  'submodule-install': 'lib/submodule-install.cjs',
  'tarball-packer': 'lib/node-package-packer-cli.cjs',
  'tarball-tree': 'lib/print-tarball-tree-cli.cjs',
  'undo-commit': 'lib/git/undo-commit.cjs',
  'undo-last-commit': 'lib/git/undo-commit.cjs',
  'undo-staged': 'lib/git/undo-staged.cjs',
  'vscode-cli': 'lib/vscode-cli.cjs',
  'wf-badge': 'lib/github-workflows/workflow-badge-cli.cjs',
  'wf-status': 'lib/github-workflows/get-latest-workflow-status-cli.cjs',
  'workflow-badge': 'lib/github-workflows/workflow-badge-cli.cjs',
  'y-install': 'lib/yarn-per-branch-lock-installer.cjs',
  'yarn-install': 'lib/yarn-per-branch-lock-installer.cjs'
};

/**
 * Generate mapping for package.json "bin" from `lib/*.cjs` and `bin/*`.
 *
 * Scans `lib` for `.cjs` modules and attempts to match corresponding entries
 * in `bin/`. If a name exists in `defaultBin` that mapping is used. Paths
 * are normalized to unix-style using `upath.toUnix` for consistent output.
 *
 * @returns {Object.<string,string>} Mapping of binary name to file path (unix-style)
 */
function generateMapping() {
  const fnName = generateMapping.name;
  // Build binary mapping from lib/*.cjs and bin/*
  const binBuilder = {};
  const libs = glob
    .globSync('lib/*.cjs', {
      cwd: __dirname,
      nodir: true,
      ignore: [
        '**/*.d.{ts,mts,cts}',
        '**/*.txt',
        '**/*.d.*',
        '**/chunk*',
        '**/build.*',
        '**/{ps,git}/**',
        '**/index.*',
        '**/*.config.*',
        '**/utils.*',
        '**/*-config.*'
      ]
    })
    .map((file) => {
      // For each lib/*.cjs, find matching bin/*
      const filename = path.basename(file, path.extname(file));
      const bins = glob.globSync(`bin/${filename}*`, { cwd: __dirname, nodir: true });
      return { file, filename, bins };
    });

  // Assign binaries to binBuilder, preferring defaultBin if present
  for (const { file, filename, bins } of libs) {
    if (defaultBin[filename]) {
      binBuilder[filename] = defaultBin[filename];
      continue;
    }
    if (bins.length === 0) {
      binBuilder[filename] = file;
    } else {
      // If local bin exists, log and use lib/*.cjs
      console.log(
        `[${color.cyanBright(fnName)}] ${color.yellow(filename)} contains local bin: [${color.blueBright(bins.join(', '))}] use ${color.greenBright(file)} instead`
      );
      binBuilder[filename] = file;
    }
    // capture *-cli* file
    if (filename.includes('-cli')) {
      binBuilder[filename.replace('-cli', '')] = file; // Update binBuilder with CLI file
      if (filename in binBuilder) {
        delete binBuilder[filename]; // Remove from binBuilder if it exists
      }
    }

    if (!binBuilder[filename]) {
      if (filename.includes('-cli')) {
        console.warn(
          `[${color.yellow(fnName)}] ${color.yellowBright('Warning:')} Binary for ${color.yellow(filename)} (CLI) already has another binary assigned for ${color.yellow(filename.replace('-cli', ''))}. Skipping ${color.yellow(filename)}.`
        );
        continue;
      }
      console.warn(
        `[${color.yellow(fnName)}] ${color.redBright('Warning:')} No binary assigned for ${color.yellow(filename)}. Please check the lib/ and bin/ directories.`
      );
      continue;
    }

    // Convert to unix-style path for consistent logging
    binBuilder[filename] = path.toUnix(binBuilder[filename]);

    console.log(
      `[${color.greenBright(fnName)}] Processed ${color.cyan(filename)}: assigned ${color.greenBright(binBuilder[filename])}`
    );
  }

  console.log(`[${color.green(fnName)}] Final binary mapping:`, binBuilder);
  return binBuilder;
}

module.exports = { defaultBin, generateMapping };
