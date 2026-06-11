const { getArgs } = require('./utils/index.cjs');
const { cleanGradleBuildDirs, cleanGradleCacheDirs } = require('./cache-cleaner/gradle.cjs');

const argv = getArgs({
  boolean: ['h', 'help', 'g', 'global'],
  alias: {
    h: 'help',
    g: 'global'
  }
});

if (argv.help) {
  console.log(`
del-gradle — Clean Gradle build directories and caches

Usage:
  del-gradle [options]

Options:
  -h, --help     Show this help message
  -g, --global   Also delete Gradle cache/temp directories from the user home (~/.gradle/)

Examples:
  del-gradle                      # Clean project build/ directories only
  del-gradle --global             # Clean build/ dirs + user home Gradle caches
  del-gradle -g                   # Short alias for --global
`);
  process.exit(0);
}

(async () => {
  await cleanGradleBuildDirs();

  if (argv.global) {
    await cleanGradleCacheDirs();
  }
})().catch((err) => {
  console.error('Failed to clean Gradle directories:', err.message);
  process.exit(1);
});

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
