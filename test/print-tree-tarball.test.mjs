import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';
import { jest } from '@jest/globals';
import { addToTree, formatTree, printTgzTree, mainPrintTgzTree } from '../src/print-tarball-tree.mjs';

function appendTarEntry(pack, entry) {
  return new Promise(function (resolve, reject) {
    pack.entry(
      {
        name: entry.name,
        type: entry.type || 'file'
      },
      entry.content || '',
      function (err) {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

async function createTgz(filePath, entries) {
  const pack = tar.pack();
  const writePromise = pipeline(pack, zlib.createGzip(), fs.createWriteStream(filePath));

  for (const entry of entries) {
    await appendTarEntry(pack, entry);
  }

  pack.finalize();

  await writePromise;
}

describe('print-tarball-tree', function () {
  let tempDir;

  beforeEach(async function () {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'print-tarball-tree-'));
  });

  afterEach(async function () {
    await fsp.rm(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  test('addToTree builds nested tree object from path parts', function () {
    const tree = {};

    addToTree(tree, ['package', 'src', 'index.js']);
    addToTree(tree, ['package', 'src', 'utils', 'helper.js']);
    addToTree(tree, ['package', 'README.md']);

    expect(tree).toEqual({
      package: {
        'README.md': {},
        src: {
          'index.js': {},
          utils: {
            'helper.js': {}
          }
        }
      }
    });
  });

  test('addToTree returns the original tree object', function () {
    const tree = {};
    const result = addToTree(tree, ['package', 'index.js']);

    expect(result).toBe(tree);
    expect(tree).toEqual({
      package: {
        'index.js': {}
      }
    });
  });

  test('formatTree returns sorted printable tree lines', function () {
    const tree = {
      package: {
        src: {
          'z-file.js': {},
          'a-file.js': {}
        },
        'README.md': {}
      }
    };

    expect(formatTree(tree)).toEqual([
      '└── package',
      '    ├── README.md',
      '    └── src',
      '        ├── a-file.js',
      '        └── z-file.js'
    ]);
  });

  test('formatTree returns empty array for empty tree', function () {
    expect(formatTree({})).toEqual([]);
  });

  test('printTree sends formatted tree lines to logger', function () {
    const logger = jest.fn();
    const tree = {
      package: {
        'README.md': {},
        src: {
          'index.js': {}
        }
      }
    };

    printTgzTree(tree, '', logger);

    expect(
      logger.mock.calls.map(function (call) {
        return call[0];
      })
    ).toEqual(['└── package', '    ├── README.md', '    └── src', '        └── index.js']);
  });

  test('printTree does not call logger for empty tree', function () {
    const logger = jest.fn();

    printTgzTree({}, '', logger);

    expect(logger).not.toHaveBeenCalled();
  });

  test('printTgzTree reads tgz file and prints tree structure', async function () {
    const tgzPath = path.join(tempDir, 'package.tgz');
    const logger = jest.fn();

    await createTgz(tgzPath, [
      {
        name: 'package/zeta.txt',
        content: 'zeta'
      },
      {
        name: 'package/src/index.js',
        content: 'console.log("hello");'
      },
      {
        name: 'package/src/utils/helper.js',
        content: 'export const helper = true;'
      }
    ]);

    const tree = await mainPrintTgzTree(tgzPath, { logger });

    expect(tree).toEqual({
      package: {
        src: {
          'index.js': {},
          utils: {
            'helper.js': {}
          }
        },
        'zeta.txt': {}
      }
    });

    expect(
      logger.mock.calls.map(function (call) {
        return call[0];
      })
    ).toEqual([
      '└── package',
      '    ├── src',
      '    │   ├── index.js',
      '    │   └── utils',
      '    │       └── helper.js',
      '    └── zeta.txt'
    ]);
  });

  test('printTgzTree handles nested folder-like paths', async function () {
    const tgzPath = path.join(tempDir, 'nested.tgz');
    const logger = jest.fn();

    await createTgz(tgzPath, [
      {
        name: 'package/bin/cli.cjs',
        content: '#!/usr/bin/env node'
      },
      {
        name: 'package/lib/submodule-install.cjs',
        content: 'module.exports = {};'
      },
      {
        name: 'package/package.json',
        content: '{"name":"binary-collections"}'
      }
    ]);

    const tree = await mainPrintTgzTree(tgzPath, { logger });

    expect(tree).toEqual({
      package: {
        bin: {
          'cli.cjs': {}
        },
        lib: {
          'submodule-install.cjs': {}
        },
        'package.json': {}
      }
    });

    expect(
      logger.mock.calls.map(function (call) {
        return call[0];
      })
    ).toEqual([
      '└── package',
      '    ├── bin',
      '    │   └── cli.cjs',
      '    ├── lib',
      '    │   └── submodule-install.cjs',
      '    └── package.json'
    ]);
  });

  test('printTgzTree rejects invalid tgz file', async function () {
    const invalidPath = path.join(tempDir, 'invalid.tgz');

    await fsp.writeFile(invalidPath, 'this is not a valid tgz file');

    await expect(mainPrintTgzTree(invalidPath, { logger: jest.fn() })).rejects.toThrow();
  });

  test('printTgzTree rejects missing tgz file', async function () {
    const missingPath = path.join(tempDir, 'missing.tgz');

    await expect(mainPrintTgzTree(missingPath, { logger: jest.fn() })).rejects.toThrow();
  });
});
