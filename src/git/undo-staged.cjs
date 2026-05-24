const { runGitCommand } = require('./utils.cjs');

function undoStagedChanges() {
  console.log('\n=== Undoing Staged Changes ===');

  runGitCommand(['reset', 'HEAD', '.'], 'Undo staged changes');
}

module.exports = {
  undoStagedChanges
};
