/* eslint-env jest */
const { runGitCommand, isGitRepository } = require("../src/git/utils.cjs");
const { spawnSync, execSync } = require("child_process");

// Mock child_process
jest.mock("child_process");

describe("git-utils", () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("runGitCommand", () => {
    it("should return true on successful git command", () => {
      spawnSync.mockReturnValue({
        status: 0,
        stdout: "success",
        stderr: ""
      });

      const result = runGitCommand(["config", "user.name"], "Setting user name");

      expect(result).toBe(true);
      expect(spawnSync).toHaveBeenCalledWith("git", ["config", "user.name"], { encoding: "utf-8" });
      expect(consoleLogSpy).toHaveBeenCalledWith("[i] Setting user name");
      expect(consoleLogSpy).toHaveBeenCalledWith("[✓] Setting user name");
    });

    it("should return false on failed git command", () => {
      spawnSync.mockReturnValue({
        status: 1,
        stdout: "",
        stderr: "error: not a git repository"
      });

      const result = runGitCommand(["config", "user.name"], "Setting user name");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[✗] Failed: Setting user name");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error: error: not a git repository");
    });

    it("should handle thrown exceptions", () => {
      spawnSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const result = runGitCommand(["config", "user.name"], "Setting user name");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[✗] Failed: Setting user name");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error: Command not found");
    });

    it("should use stdout for error message when stderr is empty", () => {
      spawnSync.mockReturnValue({
        status: 1,
        stdout: "stdout error message",
        stderr: ""
      });

      const result = runGitCommand(["config", "user.name"], "Setting user name");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error: stdout error message");
    });
  });

  describe("isGitRepository", () => {
    it("should return true when in git repository", () => {
      execSync.mockReturnValue(".git");

      const result = isGitRepository();

      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith("git rev-parse --git-dir", { stdio: "pipe" });
    });

    it("should return false when not in git repository", () => {
      execSync.mockImplementation(() => {
        throw new Error("not a git repository");
      });

      const result = isGitRepository();

      expect(result).toBe(false);
      expect(execSync).toHaveBeenCalledWith("git rev-parse --git-dir", { stdio: "pipe" });
    });
  });
});
