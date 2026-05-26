import { describe, expect, test } from '@jest/globals';
import { execFileSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { TEST_ROOT, createTestFile, ensureTestDir, deleteTestFile } from './shared.mjs';

const cliScript = path.resolve(process.cwd(), 'src/run-by-checksum-cli.js');

/**
 * Helper: find a cache file in dir whose patterns + ignore arrays deeply
 * equal the expected lists. Returns the parsed JSON or null.
 */
function findCacheByConfig(cacheDir, expectedPatterns, expectedIgnores) {
  if (!fs.existsSync(cacheDir)) return null;
  const key = JSON.stringify({
    patterns: [...expectedPatterns].sort(),
    ignore: [...expectedIgnores].sort()
  });
  for (const name of fs.readdirSync(cacheDir)) {
    if (!name.endsWith('.json')) continue;
    try {
      const data = fs.readJsonSync(path.join(cacheDir, name));
      const candidate = JSON.stringify({
        patterns: (data.patterns || []).sort(),
        ignore: (data.ignore || []).sort()
      });
      if (candidate === key) return data;
    } catch {
      // skip corrupt files
    }
  }
  return null;
}

describe('run-by-checksum CLI (real spawn)', () => {
  test('should print usage with --help and exit 0', () => {
    const stdout = execFileSync('node', [cliScript, '--help'], {
      encoding: 'utf8',
      timeout: 10000
    });

    expect(stdout).toContain('Usage: run-by-checksum');
    expect(stdout).toContain('--pattern');
    expect(stdout).toContain('--exec');
    expect(stdout).toContain('--ignore');
    expect(stdout).toContain('--cwd');
  });

  test('should execute command, create cache, and exit 0 when files match patterns', () => {
    const sandbox = path.join(TEST_ROOT, 'test-exec-cmd');
    ensureTestDir(sandbox);
    createTestFile(sandbox, 'a.js', "console.log('a');");
    createTestFile(sandbox, 'b.js', "console.log('b');");

    // Marker file to prove the --exec command was invoked
    const markerFile = path.join(sandbox, '.ran');

    // Run the CLI: scan .js files in sandbox, execute node to create a marker
    execFileSync(
      'node',
      [
        cliScript,
        '-p',
        '**/*.js',
        '-e',
        // Cross-platform: use node to create a marker file
        `node -e "require('fs').writeFileSync('${markerFile.replace(/\\/g, '/')}','ok')"`,
        '-c',
        sandbox
      ],
      {
        timeout: 15000,
        cwd: sandbox,
        encoding: 'utf8'
      }
    );

    // Verify the --exec command actually ran
    expect(fs.existsSync(markerFile)).toBe(true);

    // Verify a cache file was created under tmp/.checksum/
    const cacheDir = path.join(sandbox, 'tmp', '.checksum');
    expect(fs.existsSync(cacheDir)).toBe(true);

    const cacheFiles = fs.readdirSync(cacheDir);
    expect(cacheFiles.length).toBe(1);
    expect(cacheFiles[0]).toMatch(/\.json$/);

    // Verify cache contents
    const cacheData = fs.readJsonSync(path.join(cacheDir, cacheFiles[0]));
    expect(cacheData).toMatchObject({
      patterns: ['**/*.js'],
      files: expect.arrayContaining([expect.stringContaining('a.js'), expect.stringContaining('b.js')])
    });
  });

  test('should skip re-execution when files have not changed (idempotent)', () => {
    const sandbox = path.join(TEST_ROOT, 'test-idempotent');
    ensureTestDir(sandbox);
    createTestFile(sandbox, 'a.js', 'unchanged content');

    // First run
    const out1 = execFileSync('node', [cliScript, '-p', '**/*.js', '-e', 'node -e "process.exit(0)"', '-c', sandbox], {
      timeout: 15000,
      cwd: sandbox,
      encoding: 'utf8'
    });

    // Should contain debug log line; --exec command produces no output
    expect(out1).toContain('[run-by-checksum]');

    // Grab the cache file reference
    const cacheDir = path.join(sandbox, 'tmp', '.checksum');
    const cacheFiles = fs.readdirSync(cacheDir);
    expect(cacheFiles.length).toBe(1);

    // Second run with identical files – should not throw (exit 0)
    const out2 = execFileSync('node', [cliScript, '-p', '**/*.js', '-e', 'node -e "process.exit(0)"', '-c', sandbox], {
      timeout: 15000,
      cwd: sandbox,
      encoding: 'utf8'
    });

    // Second run also has the debug log
    expect(out2).toContain('[run-by-checksum]');

    // Still exactly one cache file (not re-created)
    const cacheFilesAfter = fs.readdirSync(cacheDir);
    expect(cacheFilesAfter.length).toBe(1);
    expect(cacheFilesAfter[0]).toBe(cacheFiles[0]);
  });

  test('should re-execute when a file is modified', () => {
    const sandbox = path.join(TEST_ROOT, 'test-rexec');
    ensureTestDir(sandbox);
    createTestFile(sandbox, 'a.js', 'version 1');

    // First run — command runs, marker is created
    const marker1 = path.join(sandbox, '.ran-v2');
    execFileSync(
      'node',
      [
        cliScript,
        '-p',
        '**/*.js',
        '-e',
        `node -e "require('fs').writeFileSync('${marker1.replace(/\\/g, '/')}','v2')"`,
        '-c',
        sandbox
      ],
      { timeout: 15000, cwd: sandbox, encoding: 'utf8' }
    );
    expect(fs.existsSync(marker1)).toBe(true);

    // Remove first marker
    deleteTestFile(marker1);

    // Modify the file
    createTestFile(sandbox, 'a.js', 'version 2');

    // Second run — should detect change and re-execute
    execFileSync(
      'node',
      [
        cliScript,
        '-p',
        '**/*.js',
        '-e',
        `node -e "require('fs').writeFileSync('${marker1.replace(/\\/g, '/')}','v2')"`,
        '-c',
        sandbox
      ],
      { timeout: 15000, cwd: sandbox, encoding: 'utf8' }
    );

    // Marker was created again → command re-ran
    expect(fs.existsSync(marker1)).toBe(true);
  });

  test('should match complex glob patterns and capture --exec output', () => {
    const sandbox = path.join(TEST_ROOT, 'test-complex-glob');
    ensureTestDir(sandbox);

    // Create files matching various patterns from the arg list;
    // embed a timestamp in content so checksum changes every run
    const stamp = Date.now();
    ensureTestDir(path.join(sandbox, 'hexo', 'lib'));
    createTestFile(sandbox, 'hexo/lib/index.js', `module.exports = {};\n// ${stamp}`);
    createTestFile(sandbox, 'hexo/lib/util.js', `exports.help = () => {};\n// ${stamp}`);

    // A test file (should not match any pattern)
    createTestFile(sandbox, 'README.md', '# docs');

    const patterns = ['hexo/lib/**/*'];

    const ignores = [
      '**/{__tests__,__mocks__,test,tests,coverage}/**',
      '**/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx}',
      '**/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx}'
    ];

    const stdout = execFileSync(
      'node',
      [
        cliScript,
        '--pattern',
        patterns[0],
        '--ignore',
        ignores[0],
        '--ignore',
        ignores[1],
        '--ignore',
        ignores[2],
        '--exec',
        'echo hello world',
        '-c',
        sandbox
      ],
      { timeout: 15000, cwd: sandbox, encoding: 'utf8' }
    );

    // The --exec command's stdout is inherited by the CLI and captured here
    expect(stdout).toContain('hello world');

    // Verify cache was created with the right patterns + ignores
    const cacheDir = path.join(sandbox, 'tmp', '.checksum');
    const cacheData = findCacheByConfig(cacheDir, patterns, ignores);
    expect(cacheData).not.toBeNull();
    expect(cacheData.patterns).toEqual(expect.arrayContaining(patterns));
    expect(cacheData.ignore).toEqual(expect.arrayContaining(ignores));
    expect(cacheData.files).toEqual(
      expect.arrayContaining([
        expect.stringContaining('hexo/lib/index.js'),
        expect.stringContaining('hexo/lib/util.js')
      ])
    );
    // README.md should NOT be in matched files
    expect(cacheData.files.filter((f) => f.includes('README.md'))).toEqual([]);
  });

  test('should handle mixed --pattern and --ignore with src/test dirs', () => {
    const sandbox = path.join(TEST_ROOT, 'test-mixed-args');
    ensureTestDir(sandbox);

    ensureTestDir(path.join(sandbox, 'src'));
    createTestFile(sandbox, 'src/index.js', 'module.exports = {};');
    // This should be excluded by --ignore (matches *.test.js)
    createTestFile(sandbox, 'src/index.test.js', '// test');

    ensureTestDir(path.join(sandbox, 'test'));
    // This should also be excluded by --ignore
    createTestFile(sandbox, 'test/app.test.js', '// test');

    // Should match **/{jest.config,...}
    createTestFile(sandbox, 'jest.config.js', 'module.exports = {};');

    // Should not match any pattern
    createTestFile(sandbox, 'README.md', '# docs');

    const patterns = [
      '**/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx}',
      'src/**/*.{cjs,mjs,js}',
      'test/**/*.{cjs,mjs,js}'
    ];

    const ignores = ['**/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx}'];

    const stdout = execFileSync(
      'node',
      [
        cliScript,
        '--pattern',
        patterns[0],
        '--ignore',
        ignores[0],
        '-p',
        patterns[1],
        '-p',
        patterns[2],
        '--exec',
        'echo hello world',
        '-c',
        sandbox
      ],
      { timeout: 15000, cwd: sandbox, encoding: 'utf8' }
    );

    // --exec output should be captured
    expect(stdout).toContain('hello world');

    // Verify cache was created with correct patterns + ignores
    const cacheDir = path.join(sandbox, 'tmp', '.checksum');
    const cacheData = findCacheByConfig(cacheDir, patterns, ignores);
    expect(cacheData).not.toBeNull();
    expect(cacheData.patterns).toEqual(expect.arrayContaining(patterns));
    expect(cacheData.ignore).toEqual(expect.arrayContaining(ignores));

    // src/index.js and jest.config.js should be matched
    expect(cacheData.files).toEqual(
      expect.arrayContaining([expect.stringContaining('src/index.js'), expect.stringContaining('jest.config.js')])
    );
    // Test files and README should NOT be in matched files
    expect(cacheData.files.filter((f) => f.includes('.test.'))).toEqual([]);
    expect(cacheData.files.filter((f) => f.includes('README.md'))).toEqual([]);
  });

  test('should exit with code 1 when no patterns provided', () => {
    expect(() => {
      execFileSync('node', [cliScript], {
        timeout: 10000,
        encoding: 'utf8'
      });
    }).toThrow();
    // execFileSync throws on non-zero exit; we just verify an error is thrown
  });

  test('should exit with code 1 when no --exec provided', () => {
    const sandbox = path.join(TEST_ROOT, 'test-no-exec');
    ensureTestDir(sandbox);
    createTestFile(sandbox, 'a.js', 'no exec test');

    expect(() => {
      execFileSync('node', [cliScript, '-p', '**/*.js', '-c', sandbox], {
        timeout: 10000,
        cwd: sandbox,
        encoding: 'utf8'
      });
    }).toThrow();
  });
});
