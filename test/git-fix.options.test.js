/* eslint-env jest */
const { repoDir, originalCwd } = require("./env.js");
const path = require("upath");

jest.mock("../src/git/utils.cjs");
jest.mock("../src/git/line-endings.cjs");
jest.mock("../src/git/permissions.cjs");
jest.mock("../src/git/pull-strategy.cjs");
jest.mock("../src/git/user-config.cjs");
jest.mock("../src/git/normalize.cjs");
jest.mock("child_process");

describe("git-fix utility - individual options", () => {
  let mockForceLfLineEndings;
  let mockIgnoreFilePermissions;
  let mockSetPullStrategy;
  let mockConfigureGitUser;
  let mockNormalizeLineEndings;
  let consoleLogSpy;
  const gitFixPath = path.resolve(__dirname, "../src/git-fix.cjs");

  beforeEach(() => {
    process.cwd = () => repoDir; // Set working directory to test repo
    jest.resetModules();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    mockForceLfLineEndings = require("../src/git/line-endings.cjs").forceLfLineEndings;
    mockIgnoreFilePermissions = require("../src/git/permissions.cjs").ignoreFilePermissions;
    mockSetPullStrategy = require("../src/git/pull-strategy.cjs").setPullStrategy;
    mockConfigureGitUser = require("../src/git/user-config.cjs").configureGitUser;
    mockNormalizeLineEndings = require("../src/git/normalize.cjs").normalizeLineEndings;
    mockForceLfLineEndings.mockImplementation(() => {});
    mockIgnoreFilePermissions.mockImplementation(() => {});
    mockSetPullStrategy.mockImplementation(() => {});
    mockConfigureGitUser.mockImplementation(() => {});
    mockNormalizeLineEndings.mockImplementation(() => {});
    // Ensure isGitRepository always returns true in tests
    const mockIsGitRepository = require("../src/git/utils.cjs").isGitRepository;
    if (mockIsGitRepository && typeof mockIsGitRepository.mockImplementation === "function") {
      mockIsGitRepository.mockImplementation(() => true);
    }
  });

  afterAll(() => {
    jest.restoreAllMocks();
    process.cwd = () => originalCwd; // Restore original cwd
  });

  it("should only force LF line endings with --lf-only", () => {
    process.argv = ["node", gitFixPath, "--lf-only"];
    require("../src/git-fix.cjs");
    expect(consoleLogSpy).toHaveBeenCalledWith("[i] Current working directory:", repoDir);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[✓] Detected git repository"));
    expect(mockForceLfLineEndings).toHaveBeenCalled();
    expect(mockIgnoreFilePermissions).not.toHaveBeenCalled();
    expect(mockSetPullStrategy).not.toHaveBeenCalled();
    expect(mockConfigureGitUser).not.toHaveBeenCalled();
    expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
  });

  it("should only ignore file permissions with --permissions", () => {
    process.argv = ["node", gitFixPath, "--permissions"];
    require("../src/git-fix.cjs");
    expect(mockForceLfLineEndings).not.toHaveBeenCalled();
    expect(mockIgnoreFilePermissions).toHaveBeenCalled();
    expect(mockSetPullStrategy).not.toHaveBeenCalled();
    expect(mockConfigureGitUser).not.toHaveBeenCalled();
    expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
  });

  it("should only normalize line endings with --normalize", () => {
    process.argv = ["node", gitFixPath, "--normalize"];
    require("../src/git-fix.cjs");
    expect(mockForceLfLineEndings).not.toHaveBeenCalled();
    expect(mockIgnoreFilePermissions).not.toHaveBeenCalled();
    expect(mockSetPullStrategy).not.toHaveBeenCalled();
    expect(mockConfigureGitUser).not.toHaveBeenCalled();
    expect(mockNormalizeLineEndings).toHaveBeenCalled();
  });

  it("should only configure user with --user (environment)", () => {
    process.env.GITHUB_USER = "testuser";
    process.env.GITHUB_EMAIL = "test@example.com";
    process.argv = ["node", gitFixPath, "--user"];
    require("../src/git-fix.cjs");
    expect(mockForceLfLineEndings).not.toHaveBeenCalled();
    expect(mockIgnoreFilePermissions).not.toHaveBeenCalled();
    expect(mockSetPullStrategy).not.toHaveBeenCalled();
    expect(mockConfigureGitUser).toHaveBeenCalledWith(null, null, { updateRemote: false });
    expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
  });
});
