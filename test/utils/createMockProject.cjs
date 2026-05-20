const fs = require("fs-extra");
const path = require("path");
const cp = require("cross-spawn");

function createMockProject(projectPath, options) {
  const normalizedOptions = typeof options === "boolean" ? { workspaces: options } : options || {};
  const { workspaces = false, name: projectName = "mock-project" } = normalizedOptions;

  fs.removeSync(projectPath);
  fs.ensureDirSync(projectPath);

  const results = [initPackageJson(projectPath, { name: projectName })];

  if (workspaces) {
    results.push(...initWorkspace(projectPath, { name: `${projectName}-root` }));
  }

  const lockFile = path.join(projectPath, "yarn.lock");
  if (!fs.existsSync(lockFile)) {
    fs.writeFileSync(lockFile, "# Mock lock file");
  }

  const yarnRcFile = path.join(projectPath, ".yarnrc.yml");
  if (!fs.existsSync(yarnRcFile)) {
    fs.writeFileSync(
      yarnRcFile,
      `checksumBehavior: update

cloneConcurrency: 1

compressionLevel: mixed

enableImmutableInstalls: false

enableInlineBuilds: true

enableGlobalCache: true

enableScripts: true

networkConcurrency: 1

nmHoistingLimits: workspaces

nodeLinker: node-modules`
    );

    cp.sync("yarn", ["set", "version", "berry"], { cwd: projectPath, stdio: "inherit" });
  }

  return results;
}

function initPackageJson(projectPath, options = {}) {
  const { dependencies = {}, devDependencies = {}, name = "mock-project" } = options;
  const file = path.join(projectPath, "package.json");

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        name: name,
        version: "1.0.0",
        private: true,
        workspaces: ["packages/*"],
        dependencies: {
          jquery: "^3.6.0",
          lodash: "^4.17.21",
          bootstrap: "^5.0.0",
          ...dependencies
        },
        devDependencies: {
          "@types/node": "^18.0.0",
          ...devDependencies
        }
      },
      null,
      2
    )
  );

  return {
    pkgJson: file,
    content: JSON.parse(fs.readFileSync(file, "utf-8"))
  };
}

function initWorkspace(projectPath, options = {}) {
  const { name: workspaceName = "mock-workspace" } = options;
  const results = [];
  const project = initPackageJson(projectPath, { name: workspaceName });
  project.content.workspaces = ["packages/*"];
  fs.writeFileSync(project.pkgJson, JSON.stringify(project.content, null, 2));
  results.push(project);

  const workspaces = [
    {
      name: "workspace-a",
      location: path.join(projectPath, "packages/workspace-a")
    },
    {
      name: "workspace-b",
      location: path.join(projectPath, "packages/workspace-b")
    }
  ];
  for (const ws of workspaces) {
    fs.ensureDirSync(ws.location);
    results.push(initPackageJson(ws.location, { name: ws.name }));
  }

  return results;
}

module.exports = {
  createMockProject,
  initPackageJson,
  initWorkspace
};
