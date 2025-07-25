import { afterAll, beforeAll, describe, jest } from "@jest/globals";
import fs from "fs-extra";
import path from "upath";
import * as rmpath from "../../src/rmpath.mjs";

jest.setTimeout(30000); // Increase timeout for large file operations

describe("rmpath", () => {
  const testDir = path.join(process.cwd(), "tmp", "jest/rmpath-test");
  const testFile = path.join(testDir, "testfile.txt");
  const testSubDir = path.join(testDir, "subdir");
  const testSubFile = path.join(testSubDir, "subfile.txt");
  const manyFilesCount = 1000;

  // Generate random nested file paths
  function randomPath(depth = 3) {
    let p = testDir;
    for (let i = 0; i < depth; i++) {
      p = path.join(p, `dir_${Math.floor(Math.random() * 1000)}`);
    }
    return path.join(p, `file_${Math.floor(Math.random() * 100000)}.txt`);
  }
  const manyFiles = Array.from({ length: manyFilesCount }, () => randomPath(Math.floor(Math.random() * 4) + 1));

  let consoleSpy;
  beforeAll(() => {
    fs.ensureDirSync(testSubDir);
    fs.writeFileSync(testFile, "hello");
    fs.writeFileSync(testSubFile, "world");
    // Create thousands of files in random nested directories for stress test
    for (const file of manyFiles) {
      fs.ensureDirSync(path.dirname(file));
      fs.writeFileSync(file, `data_${file}`);
    }
    // Spy on console.log
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    // Restore console.log
    if (consoleSpy) consoleSpy.mockRestore();
  });

  test("deleteMainScript deletes a file", async () => {
    expect(fs.existsSync(testFile)).toBe(true);
    await rmpath.deleteMainScript(testFile);
    expect(fs.existsSync(testFile)).toBe(false);
  });

  test("deleteMainScript deletes a directory", async () => {
    expect(fs.existsSync(testSubDir)).toBe(true);
    await rmpath.deleteMainScript(testSubDir);
    expect(fs.existsSync(testSubDir)).toBe(false);
  });

  test("deleteMainScript does not throw on non-existent path", async () => {
    const nonExistent = path.join(testDir, "doesnotexist");
    await expect(rmpath.deleteMainScript(nonExistent)).resolves.not.toThrow();
  });

  test("deleteMainScript deletes thousands of random nested files", async () => {
    // Recreate files if needed
    for (const file of manyFiles) {
      if (!fs.existsSync(file)) {
        fs.ensureDirSync(path.dirname(file));
        fs.writeFileSync(file, `data_${file}`);
      }
    }
    // Confirm all files exist
    for (const file of manyFiles) {
      expect(fs.existsSync(file)).toBe(true);
    }
    await rmpath.deleteMainScript(testDir);
    // Confirm all files and directories are deleted
    for (const file of manyFiles) {
      expect(fs.existsSync(file)).toBe(false);
    }
    expect(fs.existsSync(testDir)).toBe(false);
    // Check that console.log was called for deletions
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some(([msg]) => typeof msg === "string" && msg.startsWith("deleting"))).toBe(true);
  });
});
