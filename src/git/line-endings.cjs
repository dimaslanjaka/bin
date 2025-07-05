const fs = require("fs");
const path = require("path");
const { runGitCommand } = require("./utils.cjs");

/**
 * Force LF line endings configuration
 * - Sets core.autocrlf = false
 * - Sets core.eol = lf
 * - Creates/updates .gitattributes with proper line ending rules
 */
function forceLfLineEndings() {
  console.log("\n=== Configuring LF Line Endings ===");

  // Force LF line endings
  runGitCommand(["config", "core.autocrlf", "false"], "Disable automatic CRLF conversion");
  runGitCommand(["config", "core.eol", "lf"], "Set end-of-line to LF");

  // Create or update .gitattributes
  const gitattributesPath = path.join(process.cwd(), ".gitattributes");
  let gitattributesContent = "";

  if (fs.existsSync(gitattributesPath)) {
    gitattributesContent = fs.readFileSync(gitattributesPath, "utf8");
  }

  // Add line ending rules if not present
  const rules = [
    "* text=auto eol=lf",
    "*.{cmd,bat} text eol=crlf",
    "*.{png,jpg,jpeg,gif,ico,svg} binary",
    "*.{zip,tar,gz,7z,rar} binary"
  ];

  let modified = false;
  rules.forEach((rule) => {
    const rulePattern = rule.split(" ")[0];
    if (!gitattributesContent.includes(rulePattern)) {
      gitattributesContent += (gitattributesContent.endsWith("\n") ? "" : "\n") + rule + "\n";
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(gitattributesPath, gitattributesContent);
    console.log("[✓] Updated .gitattributes with line ending rules");
  } else {
    console.log("[i] .gitattributes already contains line ending rules");
  }
}

module.exports = {
  forceLfLineEndings
};
