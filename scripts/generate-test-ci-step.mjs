#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'upath';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionFile = path.resolve(__dirname, '..', '.github', 'actions', 'run-tests', 'action.yml');
const actionObject = {
  name: 'Run Tests',
  description: `Composite action to run tests discovered by ${path.relative(path.join(__dirname, '..'), __filename)}`,

  runs: {
    using: 'composite',
    steps: [
      // {
      //   name: 'Run tests',
      //   id: 'run-tests',
      //   shell: 'bash',
      //   run: `node scripts/generate-test-ci-step.mjs`
      // }
    ]
  }
};

async function collectTests() {
  // Use fast-glob by default; fail fast with a clear message if not present
  let fg;
  try {
    const fgMod = await import('fast-glob');
    fg = fgMod.default || fgMod;
  } catch {
    console.error('Error: fast-glob is required to run this script.');
    console.error('Install it with: npm install --no-save fast-glob');
    process.exit(2);
  }

  const patterns = [
    'test/**/*.test.{js,cjs,mjs,ts}',
    'test/**/*.spec.{js,cjs,mjs,ts}',
    'tests/**/*.test.{js,cjs,mjs,ts}',
    'tests/**/*.spec.{js,cjs,mjs,ts}'
  ];

  const entries = await fg(patterns, { onlyFiles: true, cwd: process.cwd() });
  return entries.map((p) => p.replace(/\\/g, '/')).sort();
}

async function main() {
  const files = await collectTests();
  for (const file of files) {
    const ext = (path.extname(file) || '').toLowerCase();
    const filename = path.basename(file);
    let runCmd;
    if (ext === '.mjs') {
      runCmd = `if [ -f "${file}" ]; then\n  bash bin/test-esm --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    } else if (ext === '.cjs') {
      runCmd = `if [ -f "${file}" ]; then\n  bash bin/test-cjs --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    } else {
      runCmd = `if [ -f "${file}" ]; then\n  npm test -- --testPathPatterns="${filename}"\nelse\n  echo "Skipping missing test file: ${file}"\nfi`;
    }

    actionObject.runs.steps.push({
      name: `Run tests in ${file}`,
      id: `run-${path.basename(file, path.extname(file))}`,
      shell: 'bash',
      run: runCmd,
      env: {
        NODE_ENV: 'test',
        ACCESS_TOKEN: '${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN }}'
      }
    });
  }

  const yamlContent = yaml.stringify(actionObject);
  fs.ensureDirSync(path.dirname(actionFile));
  fs.writeFileSync(actionFile, yamlContent, 'utf-8');
  console.log(`Generated ${actionFile} with ${files.length} test steps.`);
}

main();
