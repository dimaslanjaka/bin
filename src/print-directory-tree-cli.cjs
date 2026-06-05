const { loadDotenv } = require('./binary-collections/config.cjs');
const { getArgs } = require('./utils/index.cjs');
const { mainPrintDirectoryTree } = require('./print-directory-tree.cjs');

loadDotenv();

// Parse CLI arguments
const argv = getArgs();

if (argv.help || argv.h) {
  console.log(`
Usage: print-directory-tree [options]

Options:
  --output, -o <file>           Output file path (default: tmp/directory-structure.txt)
  --ext <exts>                  Comma-separated list of file extensions (no dot, e.g. js,ts)
  --pattern <glob>              Glob pattern(s) for files (can be repeated)
  --exclude <dirs>              Comma-separated list of directories to exclude (appends to default)
  --override-exclude, -we       Override default exclude directories with --exclude
  --git-add                     Add output file to git after writing
  --help, -h                    Show this help message

Examples:
  print-directory-tree --ext=js,ts
  print-directory-tree --pattern=src/**/*.js --pattern=test/**/*.js
  print-directory-tree --exclude=dist,build
  print-directory-tree --output=tmp/tree.txt
`);
  process.exit(0);
}

// Execute the main function
mainPrintDirectoryTree(argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
