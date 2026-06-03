const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('upath');

const cli = path.resolve(__dirname, '../src/node-executor.cjs');
const distCli = path.resolve(__dirname, '../lib/node-executor.cjs');

function run(args) {
  return {
    src: spawnSync('node', [cli, ...args], { encoding: 'utf8' }),
    dist: spawnSync('node', [distCli, ...args], { encoding: 'utf8' })
  };
}

describe('node-executor.cjs CLI executor', () => {
  const tmpJs = path.resolve(__dirname, 'tmp.test.js');
  const tmpPy = path.resolve(__dirname, 'tmp.test.py');
  const tmpUnknown = path.resolve(__dirname, 'tmp.test.xyz');

  beforeAll(() => {
    fs.writeFileSync(tmpJs, `console.log("JS OK")`);
    fs.writeFileSync(tmpPy, `print("PY OK")`);
    fs.writeFileSync(tmpUnknown, `hello`);
  });

  afterAll(() => {
    fs.unlinkSync(tmpJs);
    fs.unlinkSync(tmpPy);
    fs.unlinkSync(tmpUnknown);
  });

  test('prints help', () => {
    const res = run(['--help']);

    expect(res.src.status).toBe(0);
    expect(res.dist.status).toBe(0);
    expect(res.src.stdout).toMatch(/Usage:/);
    expect(res.dist.stdout).toMatch(/Usage:/);
  });

  test('fails when no file provided', () => {
    const res = run([]);

    expect(res.src.status).not.toBe(0);
    expect(res.dist.status).not.toBe(0);
    expect(res.src.stderr).toMatch(/No file specified/);
    expect(res.dist.stderr).toMatch(/No file specified/);
  });

  test('runs javascript file via node', () => {
    const res = run([tmpJs]);

    expect(res.src.status).toBe(0);
    expect(res.dist.status).toBe(0);
    expect(res.src.stdout).toContain('JS OK');
    expect(res.dist.stdout).toContain('JS OK');
  });

  test('runs python file via python', () => {
    const res = run([tmpPy]);

    expect(res.src.status).toBe(0);
    expect(res.dist.status).toBe(0);
    expect(res.src.stdout).toContain('PY OK');
    expect(res.dist.stdout).toContain('PY OK');
  });

  test('rejects unknown extension', () => {
    const res = run([tmpUnknown]);

    expect(res.src.status).not.toBe(0);
    expect(res.dist.status).not.toBe(0);
    expect(res.src.stderr).toMatch(/No executor registered/);
    expect(res.dist.stderr).toMatch(/No executor registered/);
  });

  test('file not found error', () => {
    const res = run(['not-exists.php']);

    expect(res.src.status).not.toBe(0);
    expect(res.dist.status).not.toBe(0);
    expect(res.src.stderr).toMatch(/File not found/);
    expect(res.dist.stderr).toMatch(/File not found/);
  });

  test('custom exit code option works', () => {
    const res = run(['not-exists.php', '--exit-code=0']);

    expect(res.src.status).toBe(0);
    expect(res.dist.status).toBe(0);
  });
});
