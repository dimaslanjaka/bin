import color from 'ansi-colors';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'upath';
import { fileURLToPath } from 'url';
import pkg from './package.json' with { type: 'json' };
import { defaultBin, generateMapping } from './build.config.cjs';

// Polyfill __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build binary mapping from lib/*.cjs and bin/*
const binBuilder = generateMapping();

// Ensure binaries directory exists and is empty
fs.ensureDirSync(path.resolve(__dirname, 'binaries'));
fs.emptyDirSync(path.resolve(__dirname, 'binaries'));

// Copy required supporting scripts that are referenced by lib/* commands.
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

// Build ignore list for bin/* files already mapped
const binIgnores = Object.keys({ ...binBuilder, ...defaultBin })
  .map((key) => `bin/${key}*`)
  .concat('**/*.txt', '**/*dummy*', '**/bc*');

// Copy remaining bin/* files to binaries/ and add binary-executor for each
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
    // Copy binary file to binaries directory
    fs.copySync(absolute, destination);
    console.log(`${color.yellow(file)} copied to ${color.greenBright(destination)}`);
    // Copy binary-executor.cjs for each binary
    const executorDestination = path.join(__dirname, `binaries/${filename}.cjs`);
    fs.copySync(path.resolve(__dirname, 'bin/binary-executor.cjs'), executorDestination);
    return { filename, executorDestination };
  });

// Log each added binary
for (const { filename, executorDestination } of binFiles) {
  // Log the binary and executor paths
  // console.log(`${filename}:`);
  const relativeExecutor = path.relative(__dirname, executorDestination);
  // console.log(`  ${color.yellow(executorDestination)} -> ${color.blueBright(relativeExecutor)}`);
  binBuilder[filename] = relativeExecutor; // Update binBuilder with executor path
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
    // Fix missing shebang for .cjs files by adding `#!/usr/bin/env node` at the top of the file
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
