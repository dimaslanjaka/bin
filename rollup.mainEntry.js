import alias from '@rollup/plugin-alias';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import fs from 'fs-extra';
import path from 'upath';
import { extractLocalFiles } from './src/utils/extract-local-files.js';

const input = path.resolve('src/index.ts');
const references = extractLocalFiles(input);

export default [
  {
    input: [input, ...Array.from(references)],
    output: [
      {
        // file: path.toUnix('lib/index.cjs'),
        dir: 'lib',
        format: 'cjs',
        sourcemap: false
      },
      {
        // file: path.toUnix('lib/index.mjs'),
        dir: 'lib',
        format: 'es',
        sourcemap: false
      }
    ],
    plugins: [
      alias({
        entries: []
      }),
      json(),
      resolve({ preferBuiltins: true, extensions: ['.js', '.mjs', '.cjs', '.ts', '.json', '.node'] }),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/test*/**', '**/tmp/**', '**/packages/**'],
        presets: [
          '@babel/preset-typescript',
          [
            '@babel/preset-env',
            {
              targets: {
                node: '18'
              }
            }
          ]
        ]
      }),
      commonjs({ extensions: ['.js', '.mjs', '.cjs', '.ts', '.json', '.node'] })
    ],
    external: [
      ...(() => {
        const pkgPath = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
      })()
    ]
  }
];
