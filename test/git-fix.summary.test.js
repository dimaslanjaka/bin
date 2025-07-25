/* eslint-env jest */
const { execSync } = require("child_process");
const env = require("./env.js");
const path = require("upath");

describe("git-fix utility - summary messages", () => {
  const gitFixPath = path.resolve(__dirname, "../src/git-fix.cjs");

  beforeAll(() => {
    // Prepare test repo and install CLI
    env.ensureYarnProject();
    env.installYarnPackage();
  });

  beforeEach(() => {
    process.cwd = () => env.repoDir; // Set working directory to test repo
    process.chdir(env.repoDir); // Ensure we are in the test repo directory
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.cwd = () => env.originalCwd; // Restore original cwd
    process.chdir(env.originalCwd); // Restore original working directory
  });

  it("should show appropriate summary for LF-only option", () => {
    const cmd = ["node", gitFixPath, "--lf-only"];
    const result = execSync(cmd.join(" "), { cwd: env.repoDir, encoding: "utf8" });
    expect(result).toContain(`[i] Current working directory: ${env.repoDir}`);
    expect(result).toMatch(/\[✓\] Detected git repository/);
    expect(result).toContain("[✓] Git fix utility completed successfully");
    expect(result).toContain("[i] Line endings are now configured for LF");
    expect(result).not.toContain("[i] File permission changes will be ignored");
  });

  it("should show appropriate summary for permissions option", () => {
    const cmd = ["node", gitFixPath, "--permissions"];
    const result = execSync(cmd.join(" "), { cwd: env.repoDir, encoding: "utf8" });
    expect(result).toContain("[✓] Git fix utility completed successfully");
    expect(result).toContain("[i] File permission changes will be ignored");
    expect(result).not.toContain("[i] Line endings are now configured for LF");
  });

  it("should show appropriate summary for normalize option", () => {
    const cmd = ["node", gitFixPath, "--normalize"];
    const result = execSync(cmd.join(" "), { cwd: env.repoDir, encoding: "utf8" });
    expect(result).toContain("[✓] Git fix utility completed successfully");
    expect(result).toContain("[i] Line endings are now configured for LF");
  });
});
