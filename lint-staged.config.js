import path from 'upath';

process.env.ESLINT_USE_FLAT_CONFIG = 'true';

export default {
  // JS/TS/React files
  '**/*.{js,cjs,mjs,ts,jsx,tsx}': (files) => {
    if (!files.length) return [];
    // Return an array of ESLint commands for staged files
    return files.map((file) => `corepack yarn exec eslint --fix --max-warnings=0 "${file}"`);
  },

  // Prettier for JSON, CSS, SCSS, LESS, YAML, SQL
  '**/*.{json,css,scss,less,yml,yaml,sql}': (files) => {
    if (!files.length) return [];
    return files.map((file) => `npx prettier --list-different --write "${file}"`);
  },

  // PHP files
  '**/*.php': (files) => {
    if (!files.length) return [];
    return files.map((file) => `composer exec php-cs-fixer fix "${file}"`);
  },

  // Python files
  '**/*.py': (files) => {
    if (!files.length) return [];
    const cwd = process.cwd();
    const relativePaths = files.map((file) => path.relative(cwd, file));
    return relativePaths.map((file) => `py -m black "${file}"`);
  }
};
