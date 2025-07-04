/**
 * Test for findNodeModules function
 */

import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { findNodeModules } from "../src/index";

describe("findNodeModules", () => {
  let tempDir: string;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-find-node-modules-"));
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
    consoleSpy.mockRestore();
  });

  test("should return empty array when no node_modules found", async () => {
    const result = await findNodeModules(tempDir);
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith("No node_modules directories found.");
  });

  test("should find node_modules directories", async () => {
    // Create some node_modules directories
    const nodeModules1 = path.join(tempDir, "project1", "node_modules");
    const nodeModules2 = path.join(tempDir, "project2", "node_modules");

    await fs.ensureDir(nodeModules1);
    await fs.ensureDir(nodeModules2);

    const result = await findNodeModules(tempDir);

    expect(result).toHaveLength(2);
    expect(result).toContain(nodeModules1);
    expect(result).toContain(nodeModules2);
  });

  test("should call callback for each found directory", async () => {
    const callback = jest.fn();

    // Create node_modules directory
    const nodeModules = path.join(tempDir, "test-project", "node_modules");
    await fs.ensureDir(nodeModules);

    await findNodeModules(tempDir, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(nodeModules);
  });

  test("should handle callback errors gracefully", async () => {
    const errorCallback = jest.fn(() => {
      throw new Error("Callback error");
    });
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Create node_modules directory
    const nodeModules = path.join(tempDir, "test-project", "node_modules");
    await fs.ensureDir(nodeModules);

    const result = await findNodeModules(tempDir, errorCallback);

    expect(result).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("findNodeModules callback error:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  test("should use current working directory when no dir provided", async () => {
    const result = await findNodeModules();
    expect(Array.isArray(result)).toBe(true);
  });

  test("should ignore .git directories", async () => {
    // Create .git/node_modules which should be ignored
    const gitNodeModules = path.join(tempDir, ".git", "node_modules");
    const normalNodeModules = path.join(tempDir, "project", "node_modules");

    await fs.ensureDir(gitNodeModules);
    await fs.ensureDir(normalNodeModules);

    const result = await findNodeModules(tempDir);

    expect(result).toHaveLength(1);
    expect(result).toContain(normalNodeModules);
    expect(result).not.toContain(gitNodeModules);
  });
});
