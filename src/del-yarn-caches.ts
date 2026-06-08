import { cleanProjectYarnCaches } from './cache-cleaner/yarn';

(async () => {
  try {
    const deleted = await cleanProjectYarnCaches();
    if (deleted.length > 0) {
      console.log(`Deleted ${deleted.length} Yarn cache path(s):`);
      deleted.forEach((p) => console.log(`  ${p}`));
    } else {
      console.log('No Yarn cache files found.');
    }
  } catch (err) {
    console.error('Failed to clean Yarn caches:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
