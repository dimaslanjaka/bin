const { spawnAsync } = require("cross-spawn");
const path = require("upath");
const fs = require("fs-extra");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function removeSubmodule(submodulePath) {
  // Deinitialize the submodule
  await spawnAsync("git", ["submodule", "deinit", "-f", submodulePath], { stdio: "inherit" });
  try {
    // Remove the submodule entry from .git/config
    await spawnAsync("git", ["config", "--remove-section", `submodule.${submodulePath}`], { stdio: "inherit" });
  } catch (error) {
    console.warn(`Warning: Could not remove git config section for submodule "${submodulePath}". It may not exist.`);
    console.warn(error.message);
  }
  // Remove the submodule from .git/modules
  const gitModulesPath = path.resolve(".git", "modules", submodulePath);
  if (fs.existsSync(gitModulesPath)) {
    fs.rmSync(gitModulesPath, { recursive: true, force: true });
  } else {
    console.warn(`Warning: The path "${gitModulesPath}" does not exist. Skipping removal of .git/modules entry.`);
  }
  // Remove the submodule directory
  fs.rmSync(path.resolve(submodulePath), { recursive: true, force: true });
  console.log(`Submodule "${submodulePath}" has been removed.`);
}

module.exports = removeSubmodule;
