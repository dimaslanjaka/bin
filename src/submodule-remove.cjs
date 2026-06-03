const { spawnAsync } = require('cross-spawn');
const path = require('upath');
const fs = require('fs-extra');
const { loadDotenv } = require('./binary-collections/config.cjs');

loadDotenv();

async function removeSubmodule(submodulePath) {
  // Deinitialize the submodule
  try {
    await spawnAsync('git', ['submodule', 'deinit', '-f', submodulePath], { stdio: 'inherit' });
  } catch (error) {
    console.warn(`Warning: Could not deinitialize submodule "${submodulePath}". It may not exist.`);
    console.warn(error.message);
  }
  // Remove the submodule entry from .git/config
  try {
    await spawnAsync('git', ['config', '--remove-section', `submodule.${submodulePath}`], { stdio: 'inherit' });
  } catch (error) {
    console.warn(`Warning: Could not remove git config section for submodule "${submodulePath}". It may not exist.`);
    console.warn(error.message);
  }
  // Remove the submodule from .git/modules
  const gitModulesPath = path.resolve('.git', 'modules', submodulePath);
  if (fs.existsSync(gitModulesPath)) {
    fs.rmSync(gitModulesPath, { recursive: true, force: true });
    console.log(`Removed .git/modules entry for submodule "${submodulePath}".`);
  } else {
    console.warn(`Warning: The path "${gitModulesPath}" does not exist. Skipping removal of .git/modules entry.`);
  }
  // Remove the submodule from the .gitmodules file
  const gitmodulesPath = path.resolve('.gitmodules');
  if (fs.existsSync(gitmodulesPath)) {
    let gitmodulesContent = fs.readFileSync(gitmodulesPath, 'utf-8');
    const submoduleSectionRegex = new RegExp(
      `\\[submodule "${submodulePath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"]([\\s\\S]*?)(?=\\[|$)`,
      'g'
    );
    gitmodulesContent = gitmodulesContent.replace(submoduleSectionRegex, '').trim();
    fs.writeFileSync(gitmodulesPath, gitmodulesContent);
    console.log(`Removed submodule "${submodulePath}" from .gitmodules.`);
  } else {
    console.warn(`Warning: The .gitmodules file does not exist. Skipping removal of submodule "${submodulePath}".`);
  }
  // Remove the submodule directory
  fs.rmSync(path.resolve(submodulePath), { recursive: true, force: true });
  console.log(`Submodule "${submodulePath}" has been removed.`);
}

module.exports = removeSubmodule;
