import { getArgs } from "./utils/index.cjs";
import fs from "fs";
import path from "path";
import * as glob from "glob";

const argv = getArgs();
const positional = argv._ || [];

if (argv.help || argv.h) {
  console.log();
  console.log("Usage: remove-module <moduleName> [<moduleName> ...]");
  console.log();
  console.log("Removes a module from one or more dependency directories:");
  console.log("  - node_modules (Node.js, with --node)");
  console.log("  - vendor/composer (PHP Composer, with --composer)");
  console.log("  - venv/.venv site-packages (Python, with --venv)");
  console.log();
  console.log("Options:");
  console.log("  --node         Remove from node_modules (default if no flag given)");
  console.log("  --composer     Remove from vendor/composer");
  console.log("  --venv         Remove from venv/.venv site-packages");
  console.log("  --help, -h     Show this help message");
  console.log();
  process.exit(0);
}

if (positional.length === 0) {
  console.log();
  console.error("No module name provided.");
  console.log();
  process.exit(1);
} else {
  if (!argv.node && !argv.composer && !argv.venv) {
    // Default to removing node modules if no specific option is provided
    argv.node = true;
  }
}

for (const moduleName of positional) {
  if (argv.node) {
    // Find module name from node_modules
    const modulePath = path.resolve("node_modules", moduleName);
    if (fs.existsSync(modulePath)) {
      try {
        // Attempt to remove the module directory
        fs.rmSync(modulePath, { recursive: true, force: true });
        console.log();
        console.log(`Module ${moduleName} removed successfully.`);
        console.log();
      } catch (error) {
        console.log();
        console.error(`Failed to remove module ${moduleName}:`, error.message);
        console.log();
      }
    }
  }

  if (argv.composer) {
    // Find module name from vendor composer
    const vendorPath = path.resolve("vendor", "composer", moduleName);
    if (fs.existsSync(vendorPath)) {
      try {
        // Attempt to remove the vendor module directory
        fs.rmSync(vendorPath, { recursive: true, force: true });
        console.log();
        console.log(`Vendor module ${moduleName} removed successfully.`);
        console.log();
      } catch (error) {
        console.log();
        console.error(`Failed to remove vendor module ${moduleName}:`, error.message);
        console.log();
      }
    }
  }

  if (argv.venv) {
    // Find module name from venv Python
    const venvs = [".venv", "venv"];
    for (const venv of venvs) {
      const sitePackages = path.resolve(venv, "Lib", "site-packages");
      const venvModulePaths = [
        // main package directory (for packages)
        path.resolve(sitePackages, moduleName),
        // main module file (for single-file modules)
        path.resolve(sitePackages, moduleName + ".py"),
        // dist-info metadata directories
        ...glob.sync(`${moduleName}-*.dist-info`, { cwd: sitePackages }).map((p) => path.resolve(sitePackages, p)),
        // egg-info metadata directories
        ...glob.sync(`${moduleName}-*.egg-info`, { cwd: sitePackages }).map((p) => path.resolve(sitePackages, p)),
        // compiled extension files (.pyd for Windows, .so for Linux)
        ...glob.sync(`${moduleName}*.pyd`, { cwd: sitePackages }).map((p) => path.resolve(sitePackages, p)),
        ...glob.sync(`${moduleName}*.so`, { cwd: sitePackages }).map((p) => path.resolve(sitePackages, p)),
        // editable install directories (legacy pattern)
        ...glob.sync(`_*editable_*${moduleName}*`, { cwd: sitePackages }).map((p) => path.resolve(sitePackages, p))
      ];
      for (const venvModulePath of venvModulePaths) {
        if (fs.existsSync(venvModulePath)) {
          try {
            // Attempt to remove the venv module directory
            fs.rmSync(venvModulePath, { recursive: true, force: true });
            console.log();
            console.log(`Virtual environment module ${moduleName} removed successfully.`);
            console.log();
          } catch (error) {
            console.log();
            console.error(`Failed to remove virtual environment module ${moduleName}:`, error.message);
            console.log();
          }
        }
      }
    }
  }
}
