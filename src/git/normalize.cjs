const { execSync } = require("child_process");

/**
 * Normalize line endings in existing tracked files
 * - Refreshes the git index to detect line ending changes
 * - Applies renormalization to all tracked files
 */
function normalizeLineEndings() {
  console.log("\n=== Normalizing Existing Files ===");

  try {
    // Check if there are any tracked files
    const result = execSync("git ls-files", { encoding: "utf-8", stdio: "pipe" });
    if (!result.trim()) {
      console.log("[i] No tracked files to normalize");
      return;
    }

    console.log("[i] Refreshing index to detect line ending changes...");
    execSync("git add --renormalize .", { stdio: "pipe" });

    // Check if there are changes after normalization
    try {
      const statusResult = execSync("git status --porcelain", { encoding: "utf-8", stdio: "pipe" });
      if (statusResult.trim()) {
        console.log("[✓] Line endings normalized for tracked files");
        console.log("[i] Files with updated line endings are now staged");
        console.log("[i] Run 'git status' to see the changes");
      } else {
        console.log("[✓] All files already have correct line endings");
      }
    } catch {
      console.log("[✓] Line ending normalization completed");
    }
  } catch (error) {
    console.error("[✗] Failed to normalize line endings");
    console.error(`Error: ${error.message}`);
  }
}

module.exports = {
  normalizeLineEndings
};
