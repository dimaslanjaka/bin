/* eslint-env jest */
const { repoDir } = require("./env.js");
const path = require("upath");

jest.mock("../src/git/utils.cjs");
jest.mock("../src/git/line-endings.cjs");
jest.mock("../src/git/permissions.cjs");
jest.mock("../src/git/pull-strategy.cjs");
jest.mock("../src/git/user-config.cjs");
jest.mock("../src/git/normalize.cjs");
jest.mock("child_process");

describe("git-fix utility - help functionality", () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;
  const gitFixPath = path.resolve(__dirname, "../src/git-fix.cjs");

  beforeAll(() => {
    // Change working directory to the test repo
    process.chdir(repoDir);
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    processExitSpy = jest.spyOn(process, "exit").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should show help with --help flag", () => {
    process.argv = ["node", gitFixPath, "--help"];
    require("../src/git-fix.cjs");
    expect(processExitSpy).toHaveBeenCalledWith(0);
    expect(consoleLogSpy).toHaveBeenCalledWith("Git Fix Utility");
  });

  it("should show help with -h flag", () => {
    process.argv = ["node", gitFixPath, "-h"];
    require("../src/git-fix.cjs");
    expect(processExitSpy).toHaveBeenCalledWith(0);
    expect(consoleLogSpy).toHaveBeenCalledWith("Git Fix Utility");
  });
});
