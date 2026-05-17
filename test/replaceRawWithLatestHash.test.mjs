import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import * as updater from "../src/package-resolutions-updater.mjs";

describe("replaceRawWithLatestHash", () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  test("replaces branch name with latest commit SHA in GitHub tarball URL", async () => {
    const url = "https://raw.githubusercontent.com/dimaslanjaka/hexo-themes/master/releases/hexo-theme-flowbite.tgz";
    const latestHash = "abc123def456";

    const result = updater.replaceRawWithLatestHash(url, latestHash);

    expect(result).toBe(
      "https://raw.githubusercontent.com/dimaslanjaka/hexo-themes/abc123def456/releases/hexo-theme-flowbite.tgz"
    );
  });
});
