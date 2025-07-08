const { getFileTreeString } = require("../src/utils");

describe("getFileTreeString", () => {
  it("should return a tree for a flat file list", () => {
    const hashArray = ["foo.js abcdef12", "bar.js 12345678", "baz.txt deadbeef"];
    expect(getFileTreeString(hashArray)).toMatchInlineSnapshot(`
"├── bar.js [12345678]\n├── baz.txt [deadbeef]\n└── foo.js [abcdef12]"
`);
  });

  it("should return a tree for nested files", () => {
    const hashArray = ["src/foo.js abcdef12", "src/bar.js 12345678", "test/baz.test.js deadbeef"];
    expect(getFileTreeString(hashArray)).toMatchInlineSnapshot(`
"├── src/\n│   ├── bar.js [12345678]\n│   └── foo.js [abcdef12]\n└── test/\n    └── baz.test.js [deadbeef]"
`);
  });

  it("should handle empty input", () => {
    expect(getFileTreeString([])).toBe("");
  });
});
