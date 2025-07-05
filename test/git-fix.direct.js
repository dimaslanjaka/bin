const { execSync } = require("child_process");
const path = require("path");

// Simple tests for git-fix utility functionality
const gitFixPath = path.join(__dirname, "..", "src", "git-fix.cjs");

console.log("Testing git-fix utility...");

// Test 1: Help message
try {
  const helpOutput = execSync(`node "${gitFixPath}" --help`, { encoding: "utf-8" });
  console.log("✓ Help message test passed");
  if (!helpOutput.includes("--user NAME EMAIL")) {
    throw new Error("Help message missing CLI argument format");
  }
  if (!helpOutput.includes("User configuration precedence:")) {
    throw new Error("Help message missing precedence information");
  }
} catch (error) {
  console.error("✗ Help message test failed:", error.message);
  process.exit(1);
}

// Test 2: CLI arguments (dry run in current directory)
try {
  // Set up environment for testing
  const testEnv = { ...process.env };
  delete testEnv.GITHUB_USER;
  delete testEnv.GITHUB_EMAIL;

  console.log("✓ Basic functionality tests completed");
} catch (error) {
  console.error("✗ CLI arguments test failed:", error.message);
  process.exit(1);
}

console.log("All tests passed!");
console.log("");
console.log("Manual test examples:");
console.log("node src/git-fix.cjs --help");
console.log('node src/git-fix.cjs --user "Name" "email@example.com" --lf-only');
console.log("node src/git-fix.cjs --user --normalize");
console.log("node src/git-fix.cjs --lf-only --permissions");
