/* eslint-env jest */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { createTempGitRepo, cleanupTempDir, getGitConfig } = require("./test-helpers");

// Load .env file for project environment
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Import individual git modules for integration testing
const { isGitRepository } = require("../src/git/utils.cjs");
const { forceLfLineEndings } = require("../src/git/line-endings.cjs");
const { ignoreFilePermissions } = require("../src/git/permissions.cjs");
const { configureGitUser } = require("../src/git/user-config.cjs");

describe("git-fix integration tests", () => {
  let tempDir;
  let originalCwd;
  let consoleLogSpy;
  let consoleErrorSpy;
  let originalGithubUser;
  let originalGithubEmail;

  beforeEach(() => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `git-fix-test-${Date.now()}`);
    originalCwd = process.cwd();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Store original .env variables
    originalGithubUser = process.env.GITHUB_USER;
    originalGithubEmail = process.env.GITHUB_EMAIL;
  });

  afterEach(() => {
    // Restore working directory
    process.chdir(originalCwd);

    // Restore original .env variables
    if (originalGithubUser !== undefined) {
      process.env.GITHUB_USER = originalGithubUser;
    } else {
      delete process.env.GITHUB_USER;
    }
    if (originalGithubEmail !== undefined) {
      process.env.GITHUB_EMAIL = originalGithubEmail;
    } else {
      delete process.env.GITHUB_EMAIL;
    }

    // Clean up
    cleanupTempDir(tempDir);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("environment configuration", () => {
    it("should load .env file variables", () => {
      // Verify that .env variables are loaded
      expect(process.env.GITHUB_USER).toBeDefined();
      expect(process.env.GITHUB_EMAIL).toBeDefined();

      // Verify specific values from .env (these should match the .env file)
      expect(process.env.GITHUB_USER).toBe("dimaslanjaka");
      expect(process.env.GITHUB_EMAIL).toBe("dimaslanjaka@gmail.com");
    });
  });

  describe("git repository detection", () => {
    it("should detect git repository correctly", () => {
      createTempGitRepo(tempDir);
      process.chdir(tempDir);

      expect(isGitRepository()).toBe(true);
    });

    it("should detect non-git directory correctly", () => {
      fs.mkdirSync(tempDir, { recursive: true });
      process.chdir(tempDir);

      expect(isGitRepository()).toBe(false);
    });
  });

  describe("line endings configuration", () => {
    beforeEach(() => {
      createTempGitRepo(tempDir);
      process.chdir(tempDir);
    });

    it("should configure LF line endings", () => {
      forceLfLineEndings();

      // Check git config (local repository level)
      expect(getGitConfig("core.autocrlf")).toBe("false");
      expect(getGitConfig("core.eol")).toBe("lf");

      // Verify that .gitattributes file is created
      const gitattributesPath = path.join(tempDir, ".gitattributes");
      expect(fs.existsSync(gitattributesPath)).toBe(true);
    });
  });

  describe("file permissions configuration", () => {
    beforeEach(() => {
      createTempGitRepo(tempDir);
      process.chdir(tempDir);
    });

    it("should ignore file permissions", () => {
      ignoreFilePermissions();

      expect(getGitConfig("core.filemode")).toBe("false");
    });
  });

  describe("user configuration", () => {
    beforeEach(() => {
      createTempGitRepo(tempDir);
      process.chdir(tempDir);

      // Clear any existing local git config to ensure clean test environment
      try {
        const { execSync } = require("child_process");
        execSync("git config --unset user.name", { stdio: "pipe" });
        execSync("git config --unset user.email", { stdio: "pipe" });
      } catch {
        // Ignore errors if config doesn't exist
      }
    });

    it("should configure git user from CLI arguments", () => {
      configureGitUser("Test User", "test@example.com");

      expect(getGitConfig("user.name")).toBe("Test User");
      expect(getGitConfig("user.email")).toBe("test@example.com");
    });

    it("should configure git user from .env environment variables", () => {
      // Use the actual .env variables that are loaded
      configureGitUser();

      // Check that the .env values were used
      expect(getGitConfig("user.name")).toBe(originalGithubUser || "dimaslanjaka");
      expect(getGitConfig("user.email")).toBe(originalGithubEmail || "dimaslanjaka@gmail.com");
    });

    it("should configure git user from custom environment variables", () => {
      // Override .env variables with custom test values
      process.env.GITHUB_USER = "Custom Test User";
      process.env.GITHUB_EMAIL = "custom@example.com";

      configureGitUser();

      expect(getGitConfig("user.name")).toBe("Custom Test User");
      expect(getGitConfig("user.email")).toBe("custom@example.com");
    });

    it("should prefer CLI arguments over environment variables", () => {
      // Ensure environment variables are set
      process.env.GITHUB_USER = "Env User";
      process.env.GITHUB_EMAIL = "env@example.com";

      configureGitUser("CLI User", "cli@example.com");

      expect(getGitConfig("user.name")).toBe("CLI User");
      expect(getGitConfig("user.email")).toBe("cli@example.com");
    });

    it("should not configure anything when no user info provided and env cleared", () => {
      // Clear environment variables
      delete process.env.GITHUB_USER;
      delete process.env.GITHUB_EMAIL;

      const originalName = getGitConfig("user.name");
      const originalEmail = getGitConfig("user.email");

      configureGitUser();

      expect(getGitConfig("user.name")).toBe(originalName);
      expect(getGitConfig("user.email")).toBe(originalEmail);
    });

    it("should configure partial user info", () => {
      // This test verifies that the function executes without errors
      // We don't check the exact git config due to global config inheritance
      expect(() => {
        configureGitUser("Only Name", null);
      }).not.toThrow();

      // Verify that console messages were logged
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Configuring Git User"));
    });
  });

  describe("error handling", () => {
    it("should handle non-git directory gracefully", () => {
      fs.mkdirSync(tempDir, { recursive: true });
      process.chdir(tempDir);

      // These should not throw but may show error messages
      expect(() => {
        forceLfLineEndings();
        ignoreFilePermissions();
        configureGitUser("Test", "test@example.com");
      }).not.toThrow();
    });
  });

  describe("console output", () => {
    beforeEach(() => {
      createTempGitRepo(tempDir);
      process.chdir(tempDir);
    });

    it("should log appropriate messages for line endings", () => {
      forceLfLineEndings();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Configuring LF Line Endings"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Disable automatic CRLF conversion"));
    });

    it("should log appropriate messages for user configuration", () => {
      configureGitUser("Test User", "test@example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Configuring Git User"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("CLI-provided user configuration"));
    });
  });
});
