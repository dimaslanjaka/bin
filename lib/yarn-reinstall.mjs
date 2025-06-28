import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  init_esm_shims
} from "./chunk-VXZQNLPU.mjs";
import {
  __commonJS,
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/yarn-reinstall.cjs
var require_yarn_reinstall = __commonJS({
  "src/yarn-reinstall.cjs"() {
    init_esm_shims();
    var { execSync } = __require("child_process");
    var args = process.argv.slice(2);
    if (args.length === 0) {
      console.error("Usage: yarn-reinstall <packageName> [--dev|-D|--peer|-P|--optional|-O]");
      process.exit(1);
    }
    var pkgIndex = args.findIndex((arg) => !arg.startsWith("-"));
    if (pkgIndex === -1) {
      console.error("Please provide a package name.");
      process.exit(1);
    }
    var packageName = args[pkgIndex];
    var flags = args.slice(pkgIndex + 1);
    var removeCmd = `yarn remove ${packageName}`;
    var addCmd = `yarn add ${packageName} ${flags.join(" ")}`.trim();
    try {
      let isInstalled = false;
      try {
        const listOutput = execSync(`yarn list --pattern "${packageName}" --depth=0`, { encoding: "utf8" });
        isInstalled = listOutput.includes(packageName + "@");
      } catch (_e) {
        isInstalled = false;
      }
      if (isInstalled) {
        console.log(`Running: ${removeCmd}`);
        execSync(removeCmd, { stdio: "inherit" });
      } else {
        console.warn(`Package "${packageName}" was not installed or not referenced, skipping remove.`);
      }
      console.log(`Running: ${addCmd}`);
      execSync(addCmd, { stdio: "inherit" });
    } catch (err) {
      process.exit(err.status || 1);
    }
  }
});
export default require_yarn_reinstall();
