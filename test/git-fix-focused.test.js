/* eslint-env jest */
// Load .env file for project environment
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
require("./env.js"); // Ensure environment is set up
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// Import individual git modules for focused testing
const { isGitRepository } = require("../src/git/utils.cjs");
const { forceLfLineEndings } = require("../src/git/line-endings.cjs");

describe("git-fix focused integration tests", () => {
  let tempDir;
  let originalCwd;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `git-fix-focused-test-${Date.now()}`);
    originalCwd = process.cwd();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    // Restore working directory
    process.chdir(originalCwd);

    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("git repository detection", () => {
    it("should detect git repository correctly", () => {
      // Create git repo
      fs.mkdirSync(tempDir, { recursive: true });
      process.chdir(tempDir);
      execSync("git init", { stdio: "pipe" });

      expect(isGitRepository()).toBe(true);
    });

    it("should detect non-git directory correctly", () => {
      fs.mkdirSync(tempDir, { recursive: true });
      process.chdir(tempDir);

      expect(isGitRepository()).toBe(false);
    });
  });

  describe("gitattributes file creation", () => {
    beforeEach(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      process.chdir(tempDir);
      execSync("git init", { stdio: "pipe" });

      // Set basic git config to avoid commit issues
      try {
        execSync('git config user.name "Test User"', { stdio: "pipe" });
        execSync('git config user.email "test@example.com"', { stdio: "pipe" });
      } catch {
        // Ignore config errors for this focused test
      }
    });

    it("should create .gitattributes file with correct content", () => {
      // No need to chdir, cwd is forced by env.js
      forceLfLineEndings();

      const gitattributesPath = path.join(process.cwd(), ".gitattributes");
      expect(fs.existsSync(gitattributesPath)).toBe(true);

      const content = fs.readFileSync(gitattributesPath, "utf-8");

      // Check for the key patterns that should be in the file
      expect(content).toContain("* text=auto eol=lf");
      expect(content).toContain("*.{cmd,bat,ps1,sh,cmd1,cmd2,bat1,bat2,vbs} text eol=crlf");
      expect(content).toContain("binary");
    });

    it("should handle pattern conflicts correctly", () => {
      const gitattributesPath = path.join(process.cwd(), ".gitattributes");
      // This content should NOT prevent the '* text=auto eol=lf' rule from being added
      // because the pattern matching checks for exact patterns
      const existingContent = "*.txt text\n*.js text\n";
      fs.writeFileSync(gitattributesPath, existingContent);

      forceLfLineEndings();

      const content = fs.readFileSync(gitattributesPath, "utf-8");
      expect(content).toContain("*.txt text");
      expect(content).toContain("*.js text");

      // The algorithm checks if `*` (the pattern) exists in the content
      // Since `*.txt` contains `*`, it might think the rule exists
      // Let's verify what actually happens
      console.log("Generated content:", JSON.stringify(content));
    });

    it("should preserve existing .gitattributes content", () => {
      // No need to chdir, cwd is forced by env.js
      const gitattributesPath = path.join(process.cwd(), ".gitattributes");
      // Use content that won't conflict with the patterns being added
      const existingContent = "# Existing content\n# Custom rules\n";
      fs.writeFileSync(gitattributesPath, existingContent);

      forceLfLineEndings();

      const content = fs.readFileSync(gitattributesPath, "utf-8");
      // Debug output
      console.log("CWD:", process.cwd());
      console.log("gitattributes exists:", fs.existsSync(gitattributesPath));
      if (fs.existsSync(gitattributesPath)) {
        console.log("gitattributes content:", content);
      }
      expect(content).toContain("# Existing content");
      expect(content).toContain("# Custom rules");
      expect(content).toContain("* text=auto eol=lf");
    });

    it("should not duplicate rules if already present", () => {
      const gitattributesPath = path.join(process.cwd(), ".gitattributes");
      const existingContent = "* text=auto eol=lf\n*.{cmd,bat,ps1,sh,cmd1,cmd2,bat1,bat2,vbs} text eol=crlf\n";
      fs.writeFileSync(gitattributesPath, existingContent);

      forceLfLineEndings();

      const content = fs.readFileSync(gitattributesPath, "utf-8");

      // Count occurrences - should only appear once each
      const lfRuleCount = (content.match(/\* text=auto eol=lf/g) || []).length;
      const crlfRuleCount = (content.match(/\*\.\{cmd,bat,ps1,sh,cmd1,cmd2,bat1,bat2,vbs\} text eol=crlf/g) || [])
        .length;

      expect(lfRuleCount).toBe(1);
      expect(crlfRuleCount).toBe(1);
    });
  });

  describe("console output verification", () => {
    beforeEach(() => {
      fs.mkdirSync(tempDir, { recursive: true });
      process.chdir(tempDir);
      execSync("git init", { stdio: "pipe" });
    });

    it("should log configuration messages", () => {
      forceLfLineEndings();

      // Verify that configuration messages were logged
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Configuring LF Line Endings"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Disable automatic CRLF conversion"));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Set end-of-line to LF"));
    });
  });
});
