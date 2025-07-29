import { spawnSync } from "child_process";
import path from "path";

describe("remove-module CLI --help and -h", () => {
  const cliPath = path.resolve(__dirname, "../src/remove-module.mjs");

  function runCli(args: string[]) {
    return spawnSync("node", [cliPath, ...args], {
      encoding: "utf-8"
    });
  }

  test("--help prints usage and exits 0", () => {
    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: remove-module/);
    expect(result.stdout).toMatch(/--help, -h/);
  });

  test("-h prints usage and exits 0", () => {
    const result = runCli(["-h"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: remove-module/);
    expect(result.stdout).toMatch(/--help, -h/);
  });
});
