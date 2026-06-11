const { runGitCommand } = require('./utils.cjs');

/**
 * Set git pull strategy to disable automatic rebase
 * - Sets pull.rebase = false
 */
function setPullStrategy() {
  console.log('\n=== Configuring Pull Strategy ===');

  runGitCommand(['config', 'pull.rebase', 'false'], 'Disable automatic rebase on pull');
}

module.exports = {
  setPullStrategy
};
// Provide a `default` alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
