import lintStaged from 'lint-staged';

// register new PATH for lint-staged to find the config file
const paths = ['node_modules/.bin', 'vendor/bin', 'bin'];

paths.forEach((path) => {
  if (!process.env.PATH.includes(path)) {
    process.env.PATH = `${path}:${process.env.PATH}`;
  }
});

try {
  const success = await lintStaged({ configPath: 'lint-staged.config.js', verbose: true, debug: true });
  console.log(success ? 'Linting was successful!' : 'Linting failed!');
} catch (e) {
  // Failed to load configuration
  console.error(e);
}
