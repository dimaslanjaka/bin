const { runGitCommand } = require('./utils.cjs');

function undoStagedChanges() {
  console.log('\n=== Undoing Staged Changes ===');

  runGitCommand(['reset', 'HEAD', '.'], 'Undo staged changes');
}

module.exports = {
  undoStagedChanges
};
// Provide a `default` alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
