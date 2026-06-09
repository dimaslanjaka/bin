import path from 'upath';
import { getArgs } from './utils/index.cjs';
import { normalizeResolutions, restoreResolutions } from './node-package-packer/normalize-resolutions.mjs';

const args = getArgs({ boolean: ['h', 'help', 'normalize-resolutions'] });

if (args.h || args.help) {
  const scriptName = path.basename(new URL(import.meta.url).pathname);
  console.log(`Automated tarball (tgz) creator for release folder`);
  console.log(``);
  console.log(`Usage: node ${scriptName} [options]`);
  console.log(``);
  console.log(`Options:`);
  console.log(`  -h, --help                  Show this help message`);
  console.log(`  -y, --yarn                  Force yarn pack instead of npm pack`);
  console.log(`  -d, --verbose               Enable verbose output`);
  console.log(`  --fn, --filename            Set output filename variant`);
  console.log(`  --normalize-resolutions     Replace pinned commit hashes in resolutions`);
  console.log(`                               with branch names before pack, then restore`);
  process.exit(0);
}

(async () => {
  console.log('[packer] loading build-tarball module...');
  const { bundle } = await import('./node-package-packer/build-tarball.mjs');
  console.log('[packer] module loaded, starting bundle...');

  let didNormalize = false;
  if (args['normalize-resolutions']) {
    console.log('[packer] normalizing resolutions...');
    didNormalize = await normalizeResolutions(process.cwd());
    console.log('[packer] resolutions normalized');
  }

  try {
    await bundle();
    console.log('[packer] bundle completed');
  } finally {
    if (didNormalize) {
      restoreResolutions(process.cwd());
    }
  }
})().catch((error) => {
  console.error('[packer] error:', error);
  process.exit(1);
});
