const cp = require('child_process');
const fs = require('fs-extra');
const env = require('./env.cjs');
const path = require('upath');
const { removeAnsi } = require('sbg-utility');

const TEST_REPO = env.repoDir;
const PROJECT_DIR = env.originalCwd;
const cliPath = path.resolve(__dirname, '../src/git-diff-cli.js');

const exec = (cmd, args, opts = {}) =>
  cp.spawnSync(cmd, args, {
    cwd: TEST_REPO,
    stdio: 'ignore',
    ...opts
  });

const runCLI = (args, opts = {}) => {
  try {
    return cp.execSync(`node ${cliPath} ${args}`, {
      cwd: TEST_REPO,
      encoding: 'utf8',
      ...opts
    });
  } catch (err) {
    return err.stdout || err.message;
  }
};

describe('git-diff CLI', () => {
  const stagedFile = path.join(TEST_REPO, 'staged-file.txt');
  const unstagedFile = path.join(TEST_REPO, 'unstaged-file.txt');
  const autoResolveFile = path.join(TEST_REPO, 'package.json');

  const restoreRepo = () => {
    exec('git', ['restore', '--staged', '.']);
    exec('git', ['restore', '.']);
    exec('git', ['fetch', '--all', '--prune']);
    exec('git', ['reset', '--hard', 'origin/test']);
    // write the staged test fixture so it exists for the staged-file scenario
    const now = new Date().toISOString();
    fs.writeFileSync(stagedFile, `This is a staged file. (for testing purposes)\n# Updated at ${now}\n`);
  };

  beforeAll(() => {
    exec('yarn', ['build'], { cwd: PROJECT_DIR });
    exec('yarn', ['run', 'pack'], { cwd: PROJECT_DIR });

    env.ensureRepoExists();
    env.ensureYarnProject();

    restoreRepo();
  });

  afterEach(() => {
    restoreRepo();
  });

  it('shows help output', () => {
    const result = runCLI('-h');

    expect(removeAnsi(result)).toMatch(/Git Diff Helper/);
    expect(removeAnsi(result)).toMatch(/Usage:/);
    expect(removeAnsi(result)).toMatch(/--help/);
  });

  it('shows staged diff output (clean repo)', () => {
    const result = runCLI('-s');

    expect(removeAnsi(result)).toMatch(/No changes found|not a git repository|Failed to save staged diff/);
  });

  it('shows staged diff output for a target file', () => {
    const original = fs.readFileSync(stagedFile, 'utf8');
    const marker = `\n# staged test ${Date.now()}\n`;

    fs.writeFileSync(stagedFile, original + marker);

    exec('git', ['add', 'staged-file.txt']);

    const result = runCLI('"staged-file.txt"');

    expect(removeAnsi(result)).toMatch(/Running command: git --no-pager diff --cached -- "staged-file\.txt"/);
    expect(removeAnsi(result)).toMatch(/Staged diff of "staged-file\.txt" saved to/);
  });

  it('shows unstaged diff output for a target file', () => {
    const initial = `explicit unstaged file\ncreated for git-diff testing\n`;
    const marker = `# explicit unstaged test ${Date.now()}\n`;

    try {
      fs.writeFileSync(unstagedFile, initial, 'utf8');
      exec('git', ['add', 'unstaged-file.txt']);
      fs.writeFileSync(unstagedFile, initial + marker, 'utf8');

      const result = runCLI('--unstaged "unstaged-file.txt"');

      expect(removeAnsi(result)).toMatch(/Running command: git --no-pager diff -- "unstaged-file\.txt"/);
      expect(removeAnsi(result)).toMatch(/Unstaged diff of "unstaged-file\.txt" saved to/);
    } finally {
      exec('git', ['restore', '--staged', 'unstaged-file.txt']);
      fs.removeSync(unstagedFile);
    }
  });

  it('automatically resolves unstaged diff output for a target file without --unstaged', () => {
    const original = fs.readFileSync(autoResolveFile, 'utf8');
    const marker = `\n<!-- git-diff unstaged test ${Date.now()} -->\n`;

    fs.writeFileSync(autoResolveFile, original + marker);

    const result = runCLI('"package.json"');

    expect(removeAnsi(result)).toMatch(/Running command: git --no-pager diff -- "package\.json"/);
    expect(removeAnsi(result)).toMatch(/Unstaged diff of "package\.json" saved to/);
  });
});
