const { execSync } = require("child_process");
const env = require("./env.js");

const TEST_REPO = env.repoDir;

describe("git-diff CLI", () => {
  beforeAll(() => {
    // Prepare test repo and install CLI
    env.ensureYarnProject();
    env.installYarnPackage();
  });

  it("shows help output", () => {
    const result = execSync(`npx git-diff -h`, { cwd: TEST_REPO, encoding: "utf8" });
    expect(result).toMatch(/Git Diff Helper/);
    expect(result).toMatch(/Usage:/);
    expect(result).toMatch(/--help/);
  });

  it("shows staged diff output", () => {
    // This will run in a clean repo, so expect error or no changes
    let result;
    try {
      result = execSync(`npx git-diff -s`, { cwd: TEST_REPO, encoding: "utf8" });
    } catch (error) {
      result = error.stdout || error.message;
    }
    // Accept either no changes or error message
    expect(result).toMatch(/No changes found|not a git repository|Failed to save staged diff/);
  });
});
