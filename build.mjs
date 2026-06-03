import color from 'ansi-colors';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'upath';
import { fileURLToPath } from 'url';
import pkg from './package.json' with { type: 'json' };
import { defaultBin, generateMapping } from './build.config.cjs';
import * as cp from 'cross-spawn';

// Derive __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate binary name mapping from lib/*.cjs and bin/*
const binBuilder = generateMapping();

// Ensure binaries directory exists and is empty
fs.ensureDirSync(path.resolve(__dirname, 'binaries'));
fs.emptyDirSync(path.resolve(__dirname, 'binaries'));

// Copy supporting scripts referenced by lib/* commands
const requiredBinFiles = ['bin/kill-night-crows.ps1', 'bin/kill-night-crows.bat'];
for (const file of requiredBinFiles) {
  const source = path.resolve(__dirname, file);
  if (!fs.existsSync(source)) {
    continue;
  }
  const destination = path.join(__dirname, 'binaries', path.basename(file));
  fs.copySync(source, destination);
  console.log(`${color.yellow(file)} copied to ${color.greenBright(destination)}`);
}

// Build ignore patterns for bin/* files already registered as binaries
const binIgnores = Object.keys({ ...binBuilder, ...defaultBin })
  .map((key) => `bin/${key}*`)
  .concat('**/*.txt', '**/*dummy*', '**/bc*');

// Bundle binary-executor.cjs via rollup once (shared by all binaries)
const executorSource = path.resolve(__dirname, 'bin/binary-executor.cjs');
const executorDestination = path.join(__dirname, 'binaries/binary-executor.cjs');
const rollupBin = path.resolve(__dirname, 'node_modules/rollup/dist/bin/rollup');
const result = cp.spawnSync('node', [rollupBin, '-c', path.resolve(__dirname, 'rollup.executor.js')], {
  stdio: 'inherit',
  env: {
    BUNDLE_INPUT: executorSource,
    BUNDLE_OUTPUT: executorDestination,
    ...process.env
  }
});
if (result.error) {
  console.error(
    `${color.redBright('Rollup failed for')} ${color.yellow(executorDestination)}: ${result.error.message}`
  );
  process.exit(1);
}
if (result.status !== 0) {
  console.error(
    `${color.redBright('Rollup exited with code')} ${result.status} ${color.yellow('for')} ${color.yellow(executorDestination)}`
  );
  process.exit(1);
}

// Copy remaining bin/* to binaries/ alongside a named executor copy
const binFiles = glob
  .globSync('bin/*', {
    cwd: __dirname,
    nodir: true,
    ignore: binIgnores
  })
  .map((file) => {
    const absolute = path.resolve(__dirname, file);
    const destination = path.join(__dirname, 'binaries', path.basename(file));
    const filename = path.basename(file, path.extname(file));
    fs.copySync(absolute, destination);
    console.log(`${color.yellow(file)} bundled to ${color.greenBright(destination)}`);
    // Copy the pre-bundled executor as binaries/<name>.cjs (e.g. binaries/cli.cjs for bin/cli)
    const executorDestinationNamed = path.join(__dirname, `binaries/${filename}.cjs`);
    fs.copySync(executorDestination, executorDestinationNamed);
    return { filename, executorDestination: executorDestinationNamed };
  });

// Register each binary-executor pair in the bin mapping
for (const { filename, executorDestination } of binFiles) {
  const relativeExecutor = path.relative(__dirname, executorDestination);
  binBuilder[filename] = relativeExecutor;
}

// Build final bin mapping for package.json
const bin = Object.keys({ ...binBuilder, ...defaultBin })
  .sort()
  .reduce((acc, key) => {
    acc[key] = path.toUnix(binBuilder[key] || defaultBin[key]);
    return acc;
  }, {});

// Log the final bin mapping
console.log(color.greenBright(`Final bin mapping for package.json:`));
for (const [key, value] of Object.entries(bin)) {
  let shebangAdded = false;
  if (value.endsWith('.cjs')) {
    // Add shebang to .cjs files if missing
    const filePath = path.resolve(__dirname, value);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.startsWith('#!')) {
      fs.writeFileSync(filePath, `#!/usr/bin/env node\n${content}`);
      shebangAdded = true;
    }
    fs.chmodSync(filePath, 0o755);
  }
  console.log(
    `  ${color.blueBright(key)}: ${color.yellow(value)} ${shebangAdded ? color.greenBright('(shebang added)') : ''}`
  );
}

// Write final bin mapping to tmp/bin-mapping.json for debugging
const tmpDir = path.resolve(__dirname, 'tmp');
fs.ensureDirSync(tmpDir);
const tmpFile = path.join(tmpDir, 'bin-mapping.json');
fs.writeFileSync(tmpFile, JSON.stringify(bin, null, 2) + '\n');
console.log(
  color.greenBright(
    `Bin mapping written to ${color.yellow(path.relative(process.cwd(), tmpFile) || tmpFile)} for debugging`
  )
);

// Assign bin mapping to package.json
pkg.bin = bin;

// Write updated package.json
fs.writeFileSync(path.resolve(__dirname, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
console.log(color.greenBright(`Updated package.json with ${Object.keys(bin).length} binaries`));
console.log(color.greenBright(`package.json written successfully!`));
