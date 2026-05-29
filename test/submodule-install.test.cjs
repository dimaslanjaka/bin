const fs = require('fs');
const path = require('upath');
const { execSync } = require('child_process');

jest.setTimeout(360000); // Set a longer timeout for tests

describe('submodule-install.cjs', () => {
  const TEST_DIR = path.join(__dirname, '../tmp/submodule-install/hexo-renderers');
  fs.mkdirSync(TEST_DIR, { recursive: true });
  const REPO_URL = 'https://github.com/dimaslanjaka/hexo-renderers.git';
  const SCRIPT = path.resolve(__dirname, '../src/submodule-install.cjs');

  let consoleSpy;
  beforeAll(() => {
    process.cwd = () => TEST_DIR; // Mock process.cwd to return the test directory
    // Clone the repository if it doesn't exist
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    execSync(`git clone --depth=1 ${REPO_URL} .`, { cwd: TEST_DIR, stdio: 'inherit' });
  }, 60000);

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleSpy) {
      consoleSpy.mockRestore();
      consoleSpy = undefined;
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should install submodules without infinite loop', async () => {
    // Run the script in the cloned repo
    execSync(`node "${SCRIPT}"`, { cwd: TEST_DIR, stdio: 'inherit', env: { ...process.env } });
    // Check if .gitmodules exists and submodules are present
    expect(fs.existsSync(path.join(TEST_DIR, '.gitmodules'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'test/test-site/.git'))).toBe(true);
    expect(fs.readdirSync(path.join(TEST_DIR, 'test/test-site')).length).toBeGreaterThan(7);
    expect(fs.existsSync(path.join(TEST_DIR, 'test/test-site/.gitmodules'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'test/test-site/src-posts/.git'))).toBe(true);
    expect(fs.readdirSync(path.join(TEST_DIR, 'test/test-site/src-posts')).length).toBeGreaterThan(7);
  }, 120000);
});
