/* eslint-env jest */

const { repoDir, nonGitDir } = require("../env");
const originalCwd = process.cwd();

describe("isGitRepository", () => {
  let isGitRepository;
  beforeEach(() => {
    jest.resetModules();
    isGitRepository = require("../../src/git/utils.cjs").isGitRepository;
  });

  it("returns true if git rev-parse succeeds", () => {
    process.chdir(repoDir); // Ensure we're in the test repo directory
    expect(isGitRepository(repoDir)).toBe(true);
    expect(isGitRepository()).toBe(true);
  });

  it("returns false if git rev-parse throws", () => {
    process.chdir(nonGitDir); // Ensure we're in a non-git directory
    expect(isGitRepository(nonGitDir)).toBe(false);
    process.cwd = () => nonGitDir; // Mock current working directory
    expect(isGitRepository()).toBe(false);
    process.cwd = () => originalCwd; // Restore original cwd
  });
});
