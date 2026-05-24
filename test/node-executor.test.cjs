const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cli = path.resolve(__dirname, '../src/node-executor.cjs');

function run(args) {
  return spawnSync('node', [cli, ...args], {
    encoding: 'utf8'
  });
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

    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Usage:/);
  });

  test('fails when no file provided', () => {
    const res = run([]);

    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/No file specified/);
  });

  test('runs javascript file via node', () => {
    const res = run([tmpJs]);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('JS OK');
  });

  test('runs python file via python', () => {
    const res = run([tmpPy]);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PY OK');
  });

  test('rejects unknown extension', () => {
    const res = run([tmpUnknown]);

    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/No executor registered/);
  });

  test('file not found error', () => {
    const res = run(['not-exists.php']);

    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/File not found/);
  });

  test('custom exit code option works', () => {
    const res = run(['not-exists.php', '--exit-code=0']);

    expect(res.status).toBe(0);
  });
});
