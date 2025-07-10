/* eslint-env jest */
// Load .env file for project environment
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
require("./env.js"); // Ensure environment is set up

// Mock all git modules
jest.mock("../src/git/utils.cjs");
jest.mock("../src/git/line-endings.cjs");
jest.mock("../src/git/permissions.cjs");
jest.mock("../src/git/pull-strategy.cjs");
jest.mock("../src/git/user-config.cjs");
jest.mock("../src/git/normalize.cjs");

// Mock child_process
jest.mock("child_process");

describe("git-fix utility", () => {
  let mockIsGitRepository;
  let mockForceLfLineEndings;
  let mockIgnoreFilePermissions;
  let mockSetPullStrategy;
  let mockConfigureGitUser;
  let mockNormalizeLineEndings;
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    // Reset all mocks
    jest.resetModules();
    jest.clearAllMocks();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    processExitSpy = jest.spyOn(process, "exit").mockImplementation();

    // Setup module mocks
    mockIsGitRepository = require("../src/git/utils.cjs").isGitRepository;
    mockForceLfLineEndings = require("../src/git/line-endings.cjs").forceLfLineEndings;
    mockIgnoreFilePermissions = require("../src/git/permissions.cjs").ignoreFilePermissions;
    mockSetPullStrategy = require("../src/git/pull-strategy.cjs").setPullStrategy;
    mockConfigureGitUser = require("../src/git/user-config.cjs").configureGitUser;
    mockNormalizeLineEndings = require("../src/git/normalize.cjs").normalizeLineEndings;

    // Default mock implementations
    mockIsGitRepository.mockReturnValue(true);
    mockForceLfLineEndings.mockImplementation(() => {});
    mockIgnoreFilePermissions.mockImplementation(() => {});
    mockSetPullStrategy.mockImplementation(() => {});
    mockConfigureGitUser.mockImplementation(() => {});
    mockNormalizeLineEndings.mockImplementation(() => {});

    // Clear environment variables
    delete process.env.GITHUB_USER;
    delete process.env.GITHUB_EMAIL;

    // Mock process.argv
    process.argv = ["node", "git-fix.cjs"];
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe("help functionality", () => {
    it("should show help with --help flag", () => {
      process.argv = ["node", "git-fix.cjs", "--help"];

      require("../src/git-fix.cjs");

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("Git Fix Utility");
    });

    it("should show help with -h flag", () => {
      process.argv = ["node", "git-fix.cjs", "-h"];

      require("../src/git-fix.cjs");

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("Git Fix Utility");
    });
  });

  describe("git repository validation", () => {
    it("should exit with error if not in git repository", () => {
      mockIsGitRepository.mockReturnValue(false);
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      expect(consoleErrorSpy).toHaveBeenCalledWith("[✗] Error: Not in a git repository");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should continue if in git repository", () => {
      mockIsGitRepository.mockReturnValue(true);
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      expect(processExitSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Git Fix Utility");
    });
  });

  describe("default behavior (all fixes)", () => {
    it("should run all fixes when no options provided", () => {
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      expect(mockForceLfLineEndings).toHaveBeenCalled();
      expect(mockIgnoreFilePermissions).toHaveBeenCalled();
      expect(mockSetPullStrategy).toHaveBeenCalled();
      expect(mockConfigureGitUser).toHaveBeenCalledWith(null, null);
      expect(mockNormalizeLineEndings).toHaveBeenCalled();
    });

    it("should display summary messages for all fixes", () => {
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Line endings are now configured for LF");
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] File permission changes will be ignored");
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Repository is ready for cross-platform development");
    });
  });

  describe("individual options", () => {
    it("should only force LF line endings with --lf-only", () => {
      process.argv = ["node", "git-fix.cjs", "--lf-only"];

      require("../src/git-fix.cjs");

      expect(mockForceLfLineEndings).toHaveBeenCalled();
      expect(mockIgnoreFilePermissions).not.toHaveBeenCalled();
      expect(mockSetPullStrategy).not.toHaveBeenCalled();
      expect(mockConfigureGitUser).not.toHaveBeenCalled();
      expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
    });

    it("should only ignore file permissions with --permissions", () => {
      process.argv = ["node", "git-fix.cjs", "--permissions"];

      require("../src/git-fix.cjs");

      expect(mockForceLfLineEndings).not.toHaveBeenCalled();
      expect(mockIgnoreFilePermissions).toHaveBeenCalled();
      expect(mockSetPullStrategy).not.toHaveBeenCalled();
      expect(mockConfigureGitUser).not.toHaveBeenCalled();
      expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
    });

    it("should only normalize line endings with --normalize", () => {
      process.argv = ["node", "git-fix.cjs", "--normalize"];

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
      process.argv = ["node", "git-fix.cjs", "--user"];

      require("../src/git-fix.cjs");

      expect(mockForceLfLineEndings).not.toHaveBeenCalled();
      expect(mockIgnoreFilePermissions).not.toHaveBeenCalled();
      expect(mockSetPullStrategy).not.toHaveBeenCalled();
      expect(mockConfigureGitUser).toHaveBeenCalledWith(null, null);
      expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
    });
  });

  describe("combined options", () => {
    it("should run multiple fixes when multiple options provided", () => {
      process.argv = ["node", "git-fix.cjs", "--lf-only", "--permissions"];

      require("../src/git-fix.cjs");

      expect(mockForceLfLineEndings).toHaveBeenCalled();
      expect(mockIgnoreFilePermissions).toHaveBeenCalled();
      expect(mockSetPullStrategy).not.toHaveBeenCalled();
      expect(mockConfigureGitUser).not.toHaveBeenCalled();
      expect(mockNormalizeLineEndings).not.toHaveBeenCalled();
    });
  });

  describe("user configuration", () => {
    it("should configure user with CLI arguments", () => {
      process.argv = ["node", "git-fix.cjs", "--user", "John Doe", "john@example.com"];

      require("../src/git-fix.cjs");

      expect(mockConfigureGitUser).toHaveBeenCalledWith("John Doe", "john@example.com");
    });

    it("should configure user from environment variables", () => {
      process.env.GITHUB_USER = "envuser";
      process.env.GITHUB_EMAIL = "env@example.com";
      process.argv = ["node", "git-fix.cjs", "--user"];

      require("../src/git-fix.cjs");

      expect(mockConfigureGitUser).toHaveBeenCalledWith(null, null);
    });

    it("should show error for incomplete --user arguments", () => {
      process.argv = ["node", "git-fix.cjs", "--user", "OnlyName"];

      require("../src/git-fix.cjs");

      expect(consoleErrorSpy).toHaveBeenCalledWith("[✗] Error: --user requires both NAME and EMAIL or no arguments");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should show user configuration applied message when user/email available", () => {
      process.env.GITHUB_USER = "testuser";
      process.env.GITHUB_EMAIL = "test@example.com";
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Git user configuration has been applied");
    });

    it("should not show user configuration message when no user/email", () => {
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      expect(consoleLogSpy).not.toHaveBeenCalledWith("[i] Git user configuration has been applied");
    });
  });

  describe("summary messages", () => {
    it("should show appropriate summary for LF-only option", () => {
      process.argv = ["node", "git-fix.cjs", "--lf-only"];

      require("../src/git-fix.cjs");

      expect(consoleLogSpy).toHaveBeenCalledWith("[✓] Git fix utility completed successfully");
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Line endings are now configured for LF");
      expect(consoleLogSpy).not.toHaveBeenCalledWith("[i] File permission changes will be ignored");
    });

    it("should show appropriate summary for permissions option", () => {
      process.argv = ["node", "git-fix.cjs", "--permissions"];

      require("../src/git-fix.cjs");

      expect(consoleLogSpy).toHaveBeenCalledWith("[✓] Git fix utility completed successfully");
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] File permission changes will be ignored");
      expect(consoleLogSpy).not.toHaveBeenCalledWith("[i] Line endings are now configured for LF");
    });

    it("should show appropriate summary for normalize option", () => {
      process.argv = ["node", "git-fix.cjs", "--normalize"];

      require("../src/git-fix.cjs");

      expect(consoleLogSpy).toHaveBeenCalledWith("[✓] Git fix utility completed successfully");
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Line endings are now configured for LF");
    });
  });

  describe("edge cases", () => {
    it("should handle CLI user arguments with extra spaces", () => {
      process.argv = ["node", "git-fix.cjs", "--user", "  John Doe  ", "  john@example.com  "];

      require("../src/git-fix.cjs");

      expect(mockConfigureGitUser).toHaveBeenCalledWith("  John Doe  ", "  john@example.com  ");
    });

    it("should handle mixed option order", () => {
      process.argv = ["node", "git-fix.cjs", "--permissions", "--user", "John", "john@test.com", "--lf-only"];

      require("../src/git-fix.cjs");

      expect(mockForceLfLineEndings).toHaveBeenCalled();
      expect(mockIgnoreFilePermissions).toHaveBeenCalled();
      expect(mockConfigureGitUser).toHaveBeenCalledWith("John", "john@test.com");
    });

    it("should handle environment variables with whitespace", () => {
      process.env.GITHUB_USER = "  spaced-user  ";
      process.env.GITHUB_EMAIL = "  spaced@email.com  ";
      process.argv = ["node", "git-fix.cjs"];

      require("../src/git-fix.cjs");

      // The trimming is handled in the actual user-config module
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Git user configuration has been applied");
    });
  });
});
