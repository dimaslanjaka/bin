const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  parseGitAttributes,
  patternsConflict,
  mergeGitAttributeRules,
  formatGitAttributes,
  updateGitAttributes
} = require("../src/git/gitattributes.js");

describe("GitAttributes Parser", () => {
  let tempDir;
  let tempGitattributes;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitattributes-test-"));
    tempGitattributes = path.join(tempDir, ".gitattributes");
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("parseGitAttributes", () => {
    test("should return empty array for non-existent file", () => {
      const result = parseGitAttributes(tempGitattributes);
      expect(result).toEqual([]);
    });

    test("should parse existing .gitattributes file correctly", () => {
      const content = `# This is a comment
* text=auto
*.js text eol=lf

*.png binary
# Another comment
*.{jpg,gif} binary
`;
      fs.writeFileSync(tempGitattributes, content);

      const result = parseGitAttributes(tempGitattributes);

      expect(result).toHaveLength(8);
      expect(result[0]).toEqual({
        type: "comment",
        content: "# This is a comment",
        lineNumber: 1
      });
      expect(result[1]).toEqual({
        type: "rule",
        pattern: "*",
        attributes: "text=auto",
        content: "* text=auto",
        lineNumber: 2
      });
      expect(result[2]).toEqual({
        type: "rule",
        pattern: "*.js",
        attributes: "text eol=lf",
        content: "*.js text eol=lf",
        lineNumber: 3
      });
      expect(result[3]).toEqual({
        type: "empty",
        content: "",
        lineNumber: 4
      });
      expect(result[4]).toEqual({
        type: "rule",
        pattern: "*.png",
        attributes: "binary",
        content: "*.png binary",
        lineNumber: 5
      });
      expect(result[5]).toEqual({
        type: "comment",
        content: "# Another comment",
        lineNumber: 6
      });
      expect(result[6]).toEqual({
        type: "rule",
        pattern: "*.{jpg,gif}",
        attributes: "binary",
        content: "*.{jpg,gif} binary",
        lineNumber: 7
      });
      expect(result[7]).toEqual({
        type: "empty",
        content: "",
        lineNumber: 8
      });
    });
  });

  describe("patternsConflict", () => {
    test("should detect exact pattern conflicts", () => {
      expect(patternsConflict("*", "*")).toBe(true);
      expect(patternsConflict("*.js", "*.js")).toBe(true);
    });

    test("should detect universal pattern conflicts", () => {
      expect(patternsConflict("*", "*.js")).toBe(true);
      expect(patternsConflict("*.txt", "*")).toBe(true);
    });

    test("should detect glob pattern conflicts", () => {
      expect(patternsConflict("*.{js,ts}", "*.{jsx,tsx}")).toBe(true);
      expect(patternsConflict("*.js", "*.ts")).toBe(false);
    });
  });

  describe("mergeGitAttributeRules", () => {
    test("should add new rules without conflicts", () => {
      const existing = [{ type: "rule", pattern: "*.js", attributes: "text eol=lf" }];
      const desired = [{ pattern: "*.png", attributes: "binary", priority: 1 }];

      const result = mergeGitAttributeRules(existing, desired);

      expect(result.conflicts).toHaveLength(0);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        action: "added",
        pattern: "*.png",
        attributes: "binary"
      });
    });

    test("should handle priority-based conflict resolution", () => {
      const existing = [{ type: "rule", pattern: "*", attributes: "text", priority: 1 }];
      const desired = [{ pattern: "*", attributes: "text=auto eol=lf", priority: 2 }];

      const result = mergeGitAttributeRules(existing, desired);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].action).toBe("replaced (higher priority)");
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].action).toBe("replaced");
    });

    test("should keep existing rules with identical attributes", () => {
      const existing = [{ type: "rule", pattern: "*.png", attributes: "binary" }];
      const desired = [{ pattern: "*.png", attributes: "binary", priority: 1 }];

      const result = mergeGitAttributeRules(existing, desired);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].action).toBe("kept existing (identical)");
      expect(result.changes).toHaveLength(0);
    });
  });

  describe("formatGitAttributes", () => {
    test("should format rules back to .gitattributes content", () => {
      const rules = [
        { type: "comment", content: "# Test comment" },
        { type: "rule", pattern: "*", attributes: "text=auto eol=lf" },
        { type: "empty", content: "" },
        { type: "rule", pattern: "*.png", attributes: "binary" }
      ];

      const result = formatGitAttributes(rules);

      expect(result).toBe("# Test comment\n* text=auto eol=lf\n\n*.png binary\n");
    });
  });

  describe("updateGitAttributes", () => {
    test("should create new .gitattributes file with desired rules", () => {
      const desiredRules = [
        { pattern: "*", attributes: "text=auto eol=lf", priority: 1 },
        { pattern: "*.png", attributes: "binary", priority: 2 }
      ];

      const result = updateGitAttributes(tempGitattributes, desiredRules);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(fs.existsSync(tempGitattributes)).toBe(true);

      const content = fs.readFileSync(tempGitattributes, "utf8");
      expect(content).toContain("* text=auto eol=lf");
      expect(content).toContain("*.png binary");
    });

    test("should merge with existing .gitattributes file", () => {
      // Create existing file
      const existingContent = "# Existing comment\n*.js text eol=lf\n";
      fs.writeFileSync(tempGitattributes, existingContent);

      const desiredRules = [{ pattern: "*.png", attributes: "binary", priority: 1 }];

      const result = updateGitAttributes(tempGitattributes, desiredRules);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);

      const content = fs.readFileSync(tempGitattributes, "utf8");
      expect(content).toContain("# Existing comment");
      expect(content).toContain("*.js text eol=lf");
      expect(content).toContain("*.png binary");
    });

    test("should handle errors gracefully", () => {
      // Try to write to a non-existent directory
      const invalidPath = path.join(tempDir, "non-existent", ".gitattributes");
      const desiredRules = [{ pattern: "*", attributes: "text=auto eol=lf", priority: 1 }];

      const result = updateGitAttributes(invalidPath, desiredRules);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
