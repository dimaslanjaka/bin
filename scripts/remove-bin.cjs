const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.bin) {
    delete packageJson.bin;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('Removed "bin" from package.json');
  } else {
    console.log('"bin" field not found in package.json');
  }
} catch (error) {
  console.error('Error processing package.json:', error.message);
  process.exit(1);
}
