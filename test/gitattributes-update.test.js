const fs = require("fs");
const path = require("path");
const os = require("os");
const { updateGitAttributes } = require("../src/git/gitattributes.js");
require("./env.js"); // Ensure environment is set up

describe("updateGitAttributes integration", () => {
  let tempDir;
  let gitattributesPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitattributes-test-"));
    gitattributesPath = path.join(tempDir, ".gitattributes");
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should create .gitattributes with desired rules if file does not exist", () => {
    const desiredRules = [
      { pattern: "*", attributes: "text=auto eol=lf", priority: 1 },
      { pattern: "*.bin", attributes: "binary", priority: 2 }
    ];
    const result = updateGitAttributes(gitattributesPath, desiredRules);
    expect(result.success).toBe(true);
    const content = fs.readFileSync(gitattributesPath, "utf-8");
    expect(content).toContain("* text=auto eol=lf");
    expect(content).toContain("*.bin binary");
  });

  it("should add missing rules to existing .gitattributes", () => {
    fs.writeFileSync(gitattributesPath, "*.txt text\n");
    const desiredRules = [
      { pattern: "*", attributes: "text=auto eol=lf", priority: 1 },
      { pattern: "*.txt", attributes: "text", priority: 2 },
      { pattern: "*.bin", attributes: "binary", priority: 2 }
    ];
    const result = updateGitAttributes(gitattributesPath, desiredRules);
    expect(result.success).toBe(true);
    const content = fs.readFileSync(gitattributesPath, "utf-8");
    expect(content).toContain("* text=auto eol=lf");
    expect(content).toContain("*.txt text");
    expect(content).toContain("*.bin binary");
  });

  it("should not duplicate rules if already present", () => {
    fs.writeFileSync(gitattributesPath, "* text=auto eol=lf\n*.bin binary\n");
    const desiredRules = [
      { pattern: "*", attributes: "text=auto eol=lf", priority: 1 },
      { pattern: "*.bin", attributes: "binary", priority: 2 }
    ];
    const result = updateGitAttributes(gitattributesPath, desiredRules);
    expect(result.success).toBe(false); // No changes needed
    const content = fs.readFileSync(gitattributesPath, "utf-8");
    const lfRuleCount = (content.match(/\* text=auto eol=lf/g) || []).length;
    const binRuleCount = (content.match(/\*.bin binary/g) || []).length;
    expect(lfRuleCount).toBe(1);
    expect(binRuleCount).toBe(1);
  });

  it("should replace lower priority rule with higher priority", () => {
    fs.writeFileSync(gitattributesPath, "* text\n");
    const desiredRules = [{ pattern: "*", attributes: "text=auto eol=lf", priority: 2 }];
    const result = updateGitAttributes(gitattributesPath, desiredRules);
    expect(result.success).toBe(true);
    const content = fs.readFileSync(gitattributesPath, "utf-8");
    expect(content).toContain("* text=auto eol=lf");
    expect(content).not.toContain("* text\n");
  });
});
