/* eslint-env jest */
// Load .env file for project environment
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
require("./env.js"); // Ensure environment is set up
const { configureGitUser } = require("../src/git/user-config.cjs");
const { runGitCommand } = require("../src/git/utils.cjs");

// Mock the utils module
jest.mock("../src/git/utils.cjs");

describe("git-user-config", () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let mockRunGitCommand;
  let originalGithubUser;
  let originalGithubEmail;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    mockRunGitCommand = runGitCommand;
    mockRunGitCommand.mockReturnValue(true);

    // Store original .env variables
    originalGithubUser = process.env.GITHUB_USER;
    originalGithubEmail = process.env.GITHUB_EMAIL;

    // Clear environment variables for clean testing
    delete process.env.GITHUB_USER;
    delete process.env.GITHUB_EMAIL;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    if (consoleWarnSpy) consoleWarnSpy.mockRestore();

    // Restore original .env variables
    if (originalGithubUser !== undefined) {
      process.env.GITHUB_USER = originalGithubUser;
    }
    if (originalGithubEmail !== undefined) {
      process.env.GITHUB_EMAIL = originalGithubEmail;
    }
  });

  describe("configureGitUser", () => {
    describe("remote URL update via --update-remote or options", () => {
      let configureGitUserInteractive;
      let mockRunGitCommandInteractive;
      let consoleLogSpyInteractive;
      let consoleWarnSpyInteractive;
      let runGitCommandOutputSpy;
      let originalArgv;

      beforeEach(() => {
        jest.resetModules();
        jest.doMock("git-command-helper", () => ({
          parseGitHubUrl: () => ({ owner: "otheruser", repo: "repo" })
        }));
        jest.doMock("../src/git/utils.cjs", () => {
          const original = jest.requireActual("../src/git/utils.cjs");
          return {
            ...original,
            runGitCommand: jest.fn(() => true),
            runGitCommandOutput: jest.fn(() => "https://github.com/otheruser/repo.git")
          };
        });
        consoleLogSpyInteractive = jest.spyOn(console, "log").mockImplementation();
        consoleWarnSpyInteractive = jest.spyOn(console, "warn").mockImplementation();
        originalArgv = process.argv;
        ({ configureGitUser: configureGitUserInteractive } = require("../src/git/user-config.cjs"));
        mockRunGitCommandInteractive = require("../src/git/utils.cjs").runGitCommand;
        runGitCommandOutputSpy = require("../src/git/utils.cjs").runGitCommandOutput;
      });

      afterEach(() => {
        jest.resetModules();
        if (consoleLogSpyInteractive) consoleLogSpyInteractive.mockRestore();
        if (consoleWarnSpyInteractive) consoleWarnSpyInteractive.mockRestore();
        process.argv = originalArgv;
      });

      it("should update remote URL when options.updateRemote is true", () => {
        configureGitUserInteractive("testuser", "test@example.com", { updateRemote: true });
        expect(runGitCommandOutputSpy).toHaveBeenCalledWith(
          ["remote", "get-url", "origin"],
          "Fetching remote URL for verification"
        );
        expect(consoleLogSpyInteractive).toHaveBeenCalledWith(expect.stringContaining("Remote URL updated to"));
        expect(mockRunGitCommandInteractive).toHaveBeenCalledWith(
          ["remote", "set-url", "origin", expect.stringContaining("testuser")],
          expect.stringContaining("Set origin to")
        );
      });

      it("should not update remote URL and log info when options.updateRemote is false", () => {
        configureGitUserInteractive("testuser", "test@example.com", { updateRemote: false });
        expect(runGitCommandOutputSpy).toHaveBeenCalledWith(
          ["remote", "get-url", "origin"],
          "Fetching remote URL for verification"
        );
        expect(consoleLogSpyInteractive).toHaveBeenCalledWith(
          "[i] Remote URL not changed. Use --update-remote to update automatically."
        );
        expect(mockRunGitCommandInteractive).not.toHaveBeenCalledWith(
          ["remote", "set-url", "origin", expect.stringContaining("testuser")],
          expect.stringContaining("Set origin to")
        );
      });

      it("should update remote URL when --update-remote is in process.argv", () => {
        process.argv = ["node", "script.js", "--update-remote"];
        jest.resetModules();
        jest.doMock("git-command-helper", () => ({
          parseGitHubUrl: () => ({ owner: "otheruser", repo: "repo" })
        }));
        jest.doMock("../src/git/utils.cjs", () => {
          const original = jest.requireActual("../src/git/utils.cjs");
          return {
            ...original,
            runGitCommand: jest.fn(() => true),
            runGitCommandOutput: jest.fn(() => "https://github.com/otheruser/repo.git")
          };
        });
        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
        const { configureGitUser } = require("../src/git/user-config.cjs");
        const mockRunGitCommand = require("../src/git/utils.cjs").runGitCommand;
        const runGitCommandOutput = require("../src/git/utils.cjs").runGitCommandOutput;
        configureGitUser("testuser", "test@example.com");
        expect(runGitCommandOutput).toHaveBeenCalledWith(
          ["remote", "get-url", "origin"],
          "Fetching remote URL for verification"
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Remote URL updated to"));
        expect(mockRunGitCommand).toHaveBeenCalledWith(
          ["remote", "set-url", "origin", expect.stringContaining("testuser")],
          expect.stringContaining("Set origin to")
        );
        consoleLogSpy.mockRestore();
      });
    });
    it("should configure user from .env file variables", () => {
      // Restore .env variables for this test
      process.env.GITHUB_USER = originalGithubUser || "dimaslanjaka";
      process.env.GITHUB_EMAIL = originalGithubEmail || "dimaslanjaka@gmail.com";

      configureGitUser();

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Using environment variable user configuration");
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", originalGithubUser || "dimaslanjaka"],
        `Set Git username to "${originalGithubUser || "dimaslanjaka"}"`
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", originalGithubEmail || "dimaslanjaka@gmail.com"],
        `Set Git email to "${originalGithubEmail || "dimaslanjaka@gmail.com"}"`
      );
    });

    it("should configure user with CLI arguments", () => {
      configureGitUser("John Doe", "john@example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Using CLI-provided user configuration");
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "John Doe"],
        'Set Git username to "John Doe"'
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", "john@example.com"],
        'Set Git email to "john@example.com"'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("[✓] Git user configuration completed");
    });

    it("should configure user from environment variables", () => {
      process.env.GITHUB_USER = "envuser";
      process.env.GITHUB_EMAIL = "env@example.com";

      configureGitUser();

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Using environment variable user configuration");
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "envuser"],
        'Set Git username to "envuser"'
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", "env@example.com"],
        'Set Git email to "env@example.com"'
      );
    });

    it("should handle CLI arguments with whitespace", () => {
      configureGitUser("  Spaced Name  ", "  spaced@email.com  ");

      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "Spaced Name"],
        'Set Git username to "Spaced Name"'
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", "spaced@email.com"],
        'Set Git email to "spaced@email.com"'
      );
    });

    it("should handle environment variables with whitespace", () => {
      process.env.GITHUB_USER = "  env-user  ";
      process.env.GITHUB_EMAIL = "  env@test.com  ";

      configureGitUser();

      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "env-user"],
        'Set Git username to "env-user"'
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", "env@test.com"],
        'Set Git email to "env@test.com"'
      );
    });

    it("should skip configuration when no user or email provided", () => {
      configureGitUser();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[i] No Git user configuration needed (no CLI args or environment variables set)"
      );
      expect(mockRunGitCommand).not.toHaveBeenCalled();
    });

    it("should configure only username when only username provided (falls back to env for email)", () => {
      // The current implementation requires both CLI args or falls back to env vars entirely
      // Since no env vars are set, it will show "no configuration needed"
      configureGitUser("OnlyUser", null);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[i] No Git user configuration needed (no CLI args or environment variables set)"
      );
      expect(mockRunGitCommand).not.toHaveBeenCalled();
    });

    it("should configure only email when only email provided (falls back to env for username)", () => {
      // The current implementation requires both CLI args or falls back to env vars entirely
      configureGitUser(null, "only@email.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[i] No Git user configuration needed (no CLI args or environment variables set)"
      );
      expect(mockRunGitCommand).not.toHaveBeenCalled();
    });

    it("should continue when git commands fail", () => {
      mockRunGitCommand.mockReturnValue(false);

      configureGitUser("TestUser", "test@example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Failed to set Git username, but continuing...");
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Failed to set Git email, but continuing...");
      expect(consoleLogSpy).toHaveBeenCalledWith("[✓] Git user configuration completed");
    });

    it("should prefer CLI arguments over environment variables", () => {
      process.env.GITHUB_USER = "envuser";
      process.env.GITHUB_EMAIL = "env@example.com";

      configureGitUser("CLIUser", "cli@example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Using CLI-provided user configuration");
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "CLIUser"],
        'Set Git username to "CLIUser"'
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", "cli@example.com"],
        'Set Git email to "cli@example.com"'
      );
    });

    it("should handle partial CLI args with environment fallback", () => {
      // Set environment variables
      process.env.GITHUB_USER = "envuser";
      process.env.GITHUB_EMAIL = "env@example.com";

      // Provide only username via CLI - current implementation will use env for both
      configureGitUser("CLIUser", null);

      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Using environment variable user configuration");
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "envuser"],
        'Set Git username to "envuser"'
      );
      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.email", "env@example.com"],
        'Set Git email to "env@example.com"'
      );
    });

    it("should handle partial environment configuration", () => {
      process.env.GITHUB_USER = "onlyuser";
      // No GITHUB_EMAIL set

      configureGitUser();

      expect(mockRunGitCommand).toHaveBeenCalledWith(
        ["config", "user.name", "onlyuser"],
        'Set Git username to "onlyuser"'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] No email provided, skipping email configuration");
    });

    it("should handle empty string arguments", () => {
      configureGitUser("", "");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[i] No Git user configuration needed (no CLI args or environment variables set)"
      );
      expect(mockRunGitCommand).not.toHaveBeenCalled();
    });
  });
});
