const { runGitCommand } = require('./utils.cjs');

function undoLastCommit() {
  console.log('\n=== Undoing Last Commit ===');

  runGitCommand(['reset', '--soft', 'HEAD~1'], 'Undo last commit while keeping changes staged');
}

module.exports = {
  undoLastCommit
};
// Provide a `default` alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
