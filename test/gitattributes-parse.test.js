const fs = require("fs");
const path = require("path");
const os = require("os");
const { parseGitAttributes } = require("../src/git/gitattributes.js");
require("./env.js");

describe("parseGitAttributes", () => {
  let tempDir;
  let gitattributesPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitattributes-parse-test-"));
    gitattributesPath = path.join(tempDir, ".gitattributes");
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should return empty array if file does not exist", () => {
    expect(parseGitAttributes(gitattributesPath)).toEqual([]);
  });

  it("should parse rules, comments, and empty lines", () => {
    const content = `# Comment line\n* text=auto eol=lf\n\n*.bin binary\n# Another comment\n`;
    fs.writeFileSync(gitattributesPath, content);
    const rules = parseGitAttributes(gitattributesPath);
    expect(rules).toEqual([
      { type: "comment", content: "# Comment line", lineNumber: 1 },
      { type: "rule", pattern: "*", attributes: "text=auto eol=lf", content: "* text=auto eol=lf", lineNumber: 2 },
      { type: "empty", content: "", lineNumber: 3 },
      { type: "rule", pattern: "*.bin", attributes: "binary", content: "*.bin binary", lineNumber: 4 },
      { type: "comment", content: "# Another comment", lineNumber: 5 },
      { type: "empty", content: "", lineNumber: 6 }
    ]);
  });

  it("should mark invalid lines as type 'invalid'", () => {
    fs.writeFileSync(gitattributesPath, "invalidline\n");
    const rules = parseGitAttributes(gitattributesPath);
    expect(rules[0]).toMatchObject({ type: "invalid", content: "invalidline", lineNumber: 1 });
  });
});
