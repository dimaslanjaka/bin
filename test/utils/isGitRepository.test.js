/* eslint-env jest */

const { repoDir, nonGitDir } = require("../env");
const originalCwd = process.cwd();

describe("isGitRepository", () => {
  let isGitRepository;
  let logSpy;
  beforeEach(() => {
    jest.resetModules();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    isGitRepository = require("../../src/git/utils.cjs").isGitRepository;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.chdir(originalCwd); // Restore original working directory
  });

  it("returns true if git rev-parse succeeds", () => {
    process.chdir(repoDir); // Ensure we're in the test repo directory
    expect(isGitRepository(repoDir)).toBe(true);
    expect(isGitRepository()).toBe(true);
  });

  it("returns true if git rev-parse failed", () => {
    process.chdir(nonGitDir); // Ensure we're in a non-git directory
    expect(isGitRepository(nonGitDir)).toBe(false);
    process.cwd = () => nonGitDir; // Mock current working directory
    expect(isGitRepository()).toBe(false);
    process.cwd = () => originalCwd; // Restore original cwd
  });
});
