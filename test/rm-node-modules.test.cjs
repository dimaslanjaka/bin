const path = require('upath');
const cp = require('cross-spawn');
const fs = require('fs-extra');
const { createMockProject } = require('./utils/createMockProject.cjs');
const { writefile, removeAnsi } = require('sbg-utility');

require('./env.cjs');

describe('rm-node-modules', () => {
  const rootDir = path.join(__dirname, '../tmp/rm-node-modules-test-project');
  const cliPath = path.join(__dirname, '../src/rm-node-module-cli.cjs');
  const logDir = path.join(__dirname, 'tmp/rm-node-modules');

  const runCli = (cwd, args = []) => {
    const res = cp.sync(process.execPath, [cliPath, ...args], {
      cwd,
      stdio: 'pipe',
      env: process.env
    });

    return Promise.resolve({
      code: res.status ?? 0,
      stdout: res.stdout?.toString('utf8') ?? '',
      stderr: res.stderr?.toString('utf8') ?? ''
    });
  };

  const writeLog = (filename, content) => {
    writefile(path.join(logDir, filename), content);
  };

  const formatLog = (title, result, extra = []) =>
    [
      `Project dir: ${rootDir}`,
      ...(Array.isArray(extra) ? extra : [extra]),
      `Exit code: ${result.code}`,
      '[stdout]',
      result.stdout,
      '[stderr]',
      result.stderr
    ]
      .filter(Boolean)
      .join('\n');

  beforeEach(() => {
    createMockProject(rootDir, { workspaces: true });
    cp.sync('yarn', ['install'], { cwd: rootDir, stdio: 'inherit' });
  });

  test('dry-run mode shows what would be deleted', async () => {
    const result = await runCli(rootDir);

    writeLog('dry-run.log', formatLog('dry-run', result));

    expect(result.code).toBe(0);
    expect(removeAnsi(result.stdout)).toContain('Dry-run mode');
    expect(removeAnsi(result.stdout)).toContain('Would remove: node_modules (final cleanup)');
  });

  test('workspace mode dry-run resolves workspace paths', async () => {
    const result = await runCli(rootDir, ['--workspace', '.']);

    writeLog('workspace-dry-run.log', formatLog('workspace-dry-run', result));

    expect(result.code).toBe(0);
    expect(removeAnsi(result.stdout)).toContain('packages/workspace-a');
    expect(removeAnsi(result.stdout)).toContain('packages/workspace-b');
  });

  test('workspace real delete removes node_modules in each workspace', async () => {
    const workspaceA = path.join(rootDir, 'packages/workspace-a');
    const workspaceB = path.join(rootDir, 'packages/workspace-b');

    fs.ensureDirSync(path.join(workspaceA, 'node_modules/foo'));
    fs.ensureDirSync(path.join(workspaceB, 'node_modules/bar'));

    expect(fs.existsSync(path.join(workspaceA, 'node_modules'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceB, 'node_modules'))).toBe(true);

    const [resA, resB] = await Promise.all([runCli(workspaceA, ['--force']), runCli(workspaceB, ['--force'])]);

    writeLog(
      'workspace-real-delete.log',
      formatLog('workspace-real-delete', resA, [`Exit codes: ${resA.code}, ${resB.code}`, '[stdout B]', resB.stdout])
    );

    expect(resA.code).toBe(0);
    expect(resB.code).toBe(0);
    expect(fs.existsSync(path.join(workspaceA, 'node_modules'))).toBe(false);
    expect(fs.existsSync(path.join(workspaceB, 'node_modules'))).toBe(false);
  }, 120000);

  test('real delete removes node_modules', async () => {
    expect(fs.existsSync(path.join(rootDir, 'node_modules'))).toBe(true);

    const result = await runCli(rootDir, ['--force']);

    writeLog('real-delete.log', formatLog('real-delete', result));

    expect(result.code).toBe(0);
    expect(fs.existsSync(path.join(rootDir, 'node_modules'))).toBe(false);
  }, 120000);
});
