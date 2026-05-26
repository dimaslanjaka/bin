import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs-extra';
import { TEST_ROOT } from './shared.mjs';

const mockRunChecksum = jest.fn().mockResolvedValue({ changed: true, files: [] });

jest.unstable_mockModule('../../src/run-by-checksum/run.js', () => ({
  runChecksum: mockRunChecksum
}));

describe('run-by-checksum CLI', () => {
  beforeAll(() => {
    fs.ensureDirSync(TEST_ROOT);
  });
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    processExitSpy?.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const importCLI = async () => {
    jest.resetModules();
    return import('../../src/run-by-checksum-cli.js');
  };

  describe('argument parsing', () => {
    test('should parse multiple --pattern and --ignore args from cli.txt and call runChecksum', async () => {
      process.argv = [
        'node',
        'src/run-by-checksum-cli.js',
        '--pattern',
        'hexo/lib/**/*',
        '--pattern',
        'yarn.lock',
        '--ignore',
        '**/{__tests__,__mocks__,test,tests,coverage}/**',
        '--ignore',
        '**/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx}',
        '--ignore',
        '**/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx}'
      ];

      await importCLI();

      expect(mockRunChecksum).toHaveBeenCalledTimes(1);
      expect(mockRunChecksum).toHaveBeenCalledWith({
        patterns: ['hexo/lib/**/*', 'yarn.lock'],
        ignore: [
          '**/{__tests__,__mocks__,test,tests,coverage}/**',
          '**/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx}',
          '**/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx}'
        ],
        exec: undefined,
        cwd: undefined
      });
    });

    test('should parse aliases -p, -i, -e, -c', async () => {
      process.argv = [
        'node',
        'src/run-by-checksum-cli.js',
        '-p',
        '*.js',
        '-i',
        'node_modules/**',
        '-e',
        'echo hello',
        '-c',
        '/tmp'
      ];

      await importCLI();

      expect(mockRunChecksum).toHaveBeenCalledWith({
        patterns: ['*.js'],
        ignore: ['node_modules/**'],
        exec: 'echo hello',
        cwd: '/tmp'
      });
    });

    test('should convert single pattern string to array', async () => {
      process.argv = ['node', 'src/run-by-checksum-cli.js', '--pattern', 'src/**/*.js', '--exec', 'npm test'];

      await importCLI();

      expect(mockRunChecksum).toHaveBeenCalledWith({
        patterns: ['src/**/*.js'],
        ignore: [],
        exec: 'npm test',
        cwd: undefined
      });
    });

    test('should handle no arguments with defaults', async () => {
      process.argv = ['node', 'src/run-by-checksum-cli.js'];

      await importCLI();

      expect(mockRunChecksum).toHaveBeenCalledWith({
        patterns: [],
        ignore: [],
        exec: undefined,
        cwd: undefined
      });
    });
  });

  describe('--help flag', () => {
    test('should print help and exit(0) with --help', async () => {
      process.argv = ['node', 'src/run-by-checksum-cli.js', '--help'];

      await importCLI();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: run-by-checksum'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    test('should print help and exit(0) with -h', async () => {
      process.argv = ['node', 'src/run-by-checksum-cli.js', '-h'];

      await importCLI();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: run-by-checksum'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    test('should log error and exit(1) when runChecksum rejects', async () => {
      const testError = new Error('checksum failed');
      mockRunChecksum.mockRejectedValueOnce(testError);

      process.argv = ['node', 'src/run-by-checksum-cli.js', '-p', '*.js'];

      await importCLI();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
