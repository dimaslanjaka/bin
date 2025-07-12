const path = require("upath");
const fs = require("fs");
const { runGitCommand } = require("./utils.cjs");
const { updateGitAttributes } = require("./gitattributes.js");

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

  // Always ensure the universal LF rule is present, even if file exists
  if (fs.existsSync(gitattributesPath)) {
    let content = fs.readFileSync(gitattributesPath, "utf8");
    // Match * text=auto eol=lf with any whitespace (space or tab) between tokens
    if (!/^\*\s+text=auto\s+eol=lf/m.test(content)) {
      content = `* text=auto eol=lf\n` + content;
      fs.writeFileSync(gitattributesPath, content);
    }
  }

  // Define desired rules with priorities
  const desiredRules = [
    { pattern: "*", attributes: "text=auto eol=lf", priority: 1 },
    {
      pattern: "*.{cmd,bat,ps1,sh,cmd1,cmd2,bat1,bat2,vbs}",
      attributes: "text eol=crlf",
      priority: 2
    },
    {
      pattern: "*.{png,jpg,jpeg,gif,ico,svg,bmp,webp,avif,tiff,tif,psd,ai,eps,raw}",
      attributes: "binary",
      priority: 3
    },
    {
      pattern:
        "*.{zip,tar,gz,7z,rar,exe,dll,so,bin,jar,war,ear,apk,msi,deb,rpm,iso,img,dmg,pdf,mp3,mp4,mov,avi,mkv,flv,wmv,ogg,webm,wav,aac,m4a,otf,ttf,woff,woff2,eot}",
      attributes: "binary",
      priority: 3
    }
  ];

  // Update .gitattributes using the dedicated module
  const result = updateGitAttributes(gitattributesPath, desiredRules);

  // Report results
  if (result.error) {
    console.log(`[✗] Error updating .gitattributes: ${result.error}`);
    return;
  }

  // Report conflicts if any
  if (result.conflicts.length > 0) {
    console.log("\n[!] Detected conflicts in .gitattributes:");
    result.conflicts.forEach((conflict) => {
      console.log(`    ${conflict.pattern}: ${conflict.existing} -> ${conflict.proposed} (${conflict.action})`);
    });
  }

  // Report changes
  if (result.success) {
    console.log(`[✓] ${result.message}:`);
    result.changes.forEach((change) => {
      console.log(`    ${change.action}: ${change.pattern} ${change.attributes}`);
    });
  } else {
    console.log(`[i] ${result.message}`);
  }
}

module.exports = {
  forceLfLineEndings
};
