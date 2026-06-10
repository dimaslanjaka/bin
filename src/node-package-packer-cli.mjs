import path from 'upath';
import fs from 'fs-extra';
import { getArgs } from './utils/index.cjs';
import { bundle } from './node-package-packer/build-tarball.mjs';
import { normalizeResolutions, restoreResolutions } from './node-package-packer/normalize-resolutions.mjs';

const args = getArgs({ boolean: ['h', 'help', 'normalize-resolutions', 'yarn', 'bun', 'commit'] });

if (args.h || args.help) {
  const scriptName = path.basename(new URL(import.meta.url).pathname);
  console.log(`Automated tarball (tgz) creator for release folder`);
  console.log(``);
  console.log(`Usage: node ${scriptName} [options]`);
  console.log(``);
  console.log(`Options:`);
  console.log(`  -h, --help                  Show this help message`);
  console.log(`  -y, --yarn                  Force yarn pack instead of npm pack`);
  console.log(`  -b, --bun                   Force bun pm pack`);
  console.log(`  -d, --verbose               Enable verbose output`);
  console.log(`  --fn, --filename            Set output filename variant`);
  console.log(`  --commit                    Auto-commit tarballs via git`);
  console.log(`  --normalize-resolutions     Replace pinned commit hashes in resolutions`);
  console.log(`                               with branch names before pack, then restore`);
  console.log(``);
  console.log(`Examples:`);
  console.log(`  node ${scriptName}                              Pack with detected pm (npm/yarn/bun)`);
  console.log(`  node ${scriptName} --yarn                        Force yarn pack`);
  console.log(`  node ${scriptName} --bun                         Force bun pm pack`);
  console.log(`  node ${scriptName} --filename my-pkg             Output as my-pkg.tgz`);
  console.log(`  node ${scriptName} --normalize-resolutions       Normalize resolutions before pack`);
  console.log(`  node ${scriptName} --normalize-resolutions --yarn Combine normalize with yarn pack`);
  process.exit(0);
}

// Detect package manager from CLI flags or lockfiles
const cwd = process.cwd();
let pm = 'npm';
if (args.bun || args._.includes('-bun') || args._.includes('--bun')) {
  pm = 'bun';
} else if (args.yarn || args._.includes('-yarn') || args._.includes('--yarn')) {
  pm = 'yarn';
} else if (fs.existsSync(path.join(cwd, 'bun.lockb')) || fs.existsSync(path.join(cwd, 'bun.lock'))) {
  pm = 'bun';
} else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
  pm = 'yarn';
}

(async () => {
  console.log('[packer] module loaded, starting bundle...');

  let didNormalize = false;
  if (args['normalize-resolutions']) {
    console.log('[packer] normalizing resolutions...');
    didNormalize = await normalizeResolutions(cwd);
    console.log('[packer] resolutions normalized');
  }

  try {
    await bundle({
      cwd,
      pm,
      filename: args.fn || args.filename,
      commit: args.commit
    });
    console.log('[packer] bundle completed');
  } finally {
    if (didNormalize) {
      restoreResolutions(cwd);
    }
  }
})().catch((error) => {
  console.error('[packer] error:', error);
  process.exit(1);
});
