#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'upath';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as glob from 'glob';
import { getArgs } from '../utils/index.cjs';
import { writeYamlFile } from './utils.cjs';
import actionObject from './ci-yaml-fixtures/workflow-test-data.cjs';
import setupEnvironmentsObject from './ci-yaml-fixtures/setup-environments-data.cjs';

const __filename = fileURLToPath(import.meta.url);

let actionFile = path.resolve(process.cwd(), '.github/workflows/test.yml');

const DEFAULT_PATTERNS = [
  'test/**/*.test.{js,cjs,mjs,ts}',
  'test/**/*.spec.{js,cjs,mjs,ts}',
  'tests/**/*.test.{js,cjs,mjs,ts}',
  'tests/**/*.spec.{js,cjs,mjs,ts}'
];

const scriptName = path.toUnix(path.relative(process.cwd(), __filename));
function showHelp() {
  console.log(`\
Usage: ${scriptName} [options]

Options:
  -p, --pattern <glob>   Test file patterns to search for (can be specified multiple times)
      --ignore, --ex <glob>  Ignore patterns to exclude from results (can be specified multiple times)
  -o, --output <file>    Output YAML file path (default: .github/workflows/test.yml)
  -h, --help             Show this help message

Examples:
  $ node ${scriptName}
  $ node ${scriptName} -p "test/**/*.test.js"
  $ node ${scriptName} --pattern "test/**/*.test.js" --ignore "**/fixtures/**"
  $ node ${scriptName} -o .github/workflows/ci.yml -p "src/**/*.test.ts" --ignore "**/node_modules/**"
`);
}

async function collectTests(patterns, ignorePatterns) {
  const entries = await glob.glob(patterns, {
    onlyFiles: true,
    cwd: process.cwd(),
    ignore: ignorePatterns
  });
  return entries.map((p) => path.toUnix(p)).sort();
}

async function main() {
  const argv = getArgs({
    string: ['pattern', 'ignore', 'ex', 'output'],
    alias: {
      p: 'pattern',
      o: 'output',
      h: 'help'
    }
  });

  // Merge --ex into --ignore so both flags work
  if (argv.ex) {
    const exList = Array.isArray(argv.ex) ? argv.ex : [argv.ex];
    argv.ignore = argv.ignore ? [].concat(argv.ignore).concat(exList) : exList;
  }

  if (argv.help) {
    showHelp();
    process.exit(0);
  }

  if (argv.output) {
    actionFile = path.resolve(process.cwd(), argv.output);
  }

  const patterns = argv.pattern ? (Array.isArray(argv.pattern) ? argv.pattern : [argv.pattern]) : DEFAULT_PATTERNS;

  const ignorePatterns = argv.ignore ? (Array.isArray(argv.ignore) ? argv.ignore : [argv.ignore]) : [];
  let isModule = false;
  const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = fs.readJsonSync(pkgJsonPath);
    isModule = pkgJson.type === 'module';
  }

  const files = await collectTests(patterns, ignorePatterns);
  for (const file of files) {
    // const ext = (path.extname(file) || '').toLowerCase();
    const filename = path.basename(file);
    let pathPattern = filename;
    const isDirnameTestOrRoot = [/tests?$/, /__tests?__/].some((rg) => rg.test(path.dirname(file)));
    if (!isDirnameTestOrRoot) {
      pathPattern = path.relative(process.cwd(), file).replace(/^(__tests?__|tests?)\//, '');
    }
    // console.log(path.dirname(file), isDirnameTestOrRoot, { pathPattern });
    let runCmd;
    // if (ext === '.mjs') {
    //   runCmd = `if [ -f "${file}" ]; then\n  bash bin/test-esm --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    // } else if (ext === '.cjs') {
    //   runCmd = `if [ -f "${file}" ]; then\n  bash bin/test-cjs --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    // } else if (ext === '.ts') {
    //   runCmd = `if [ -f "${file}" ]; then\n  node node_modules/jest/bin/jest.js --runInBand --forceExit --testTimeout=120000 --detectOpenHandles --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    // } else {
    //   runCmd = `if [ -f "${file}" ]; then\n  npm test -- --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    // }

    if (isModule) {
      runCmd = `if [ -f "${file}" ]; then\n  node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --forceExit --testTimeout=120000 --detectOpenHandles --bail=1 --testPathPatterns="${pathPattern}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    } else {
      runCmd = `if [ -f "${file}" ]; then\n  node node_modules/jest/bin/jest.js --runInBand --forceExit --testTimeout=120000 --detectOpenHandles --bail=1 --testPathPatterns="${pathPattern}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    }

    // Skip files that are not tracked by git (untracked files shouldn't be included in committed actions)
    try {
      execSync(`git ls-files --error-unmatch -- "${file}"`, { cwd: process.cwd(), stdio: 'ignore' });
    } catch {
      console.warn(`Skipping untracked test file: ${file}`);
      continue;
    }

    const rawId = file;
    let safeId = rawId.replace(/[^A-Za-z0-9_-]+/g, '-');
    if (!/^[A-Za-z_]/.test(safeId)) safeId = `_${safeId}`;
    safeId = (safeId.slice(0, 90) || `test-${Math.random().toString(36).slice(2, 8)}`).replace(/-(test|spec)$/, '');

    actionObject.jobs.ci.steps.push({
      name: `🧪 Run tests in ${file}`,
      id: `run-${safeId}`,
      shell: 'bash',
      run: runCmd
    });
  }

  writeYamlFile(actionFile, actionObject);
  console.log(`Generated ${actionFile} with ${files.length} test steps.`);

  const setupEnvironmentsFile = writeYamlFile('.github/actions/setup-environments/action.yml', setupEnvironmentsObject);
  console.log(`Generated ${setupEnvironmentsFile}.`);
}

main();
