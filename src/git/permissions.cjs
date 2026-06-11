const { runGitCommand } = require('./utils.cjs');

/**
 * Configure git to ignore file permission changes
 * - Sets core.filemode = false
 * - Sets diff.ignoreSubmodules = dirty
 */
function ignoreFilePermissions() {
  console.log('\n=== Configuring File Permissions ===');

  runGitCommand(['config', 'core.filemode', 'false'], 'Ignore file permission changes');
  runGitCommand(['config', 'diff.ignoreSubmodules', 'dirty'], 'Ignore submodule permission changes');
}

module.exports = {
  ignoreFilePermissions
};
// Provide a `default` alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
