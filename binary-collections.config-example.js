// rename to binary-collections.config.js and update paths in imports

import path from 'node:path';
import dotenv from 'dotenv';

// load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

export default {
  // Example configuration for binary-collections
  // You can customize these settings as needed

  // Base directory for temporary files (optional)
  tempDir: path.join(process.cwd(), 'tmp'),

  // GitHub token for API access (can also be set via environment variables)
  githubToken: process.env.GITHUB_TOKEN || 'your-github-token-here',

  // Resolutions normalization mappings for node-package-packer
  // Replaces pinned commit hashes in package.json resolutions with branch/tag names before pack
  normalizeResolutions: [
    { pkg: 'cross-spawn', to: 'private' },
    { pkg: 'binary-collections', to: 'master' },
    { pkg: 'git-command-helper', to: 'pre-release' },
    { pkg: 'sbg-utility', to: 'sbg-utility' }
  ],

  // Opencode API keys (replace with your actual keys)
  opencode: {
    keys: [
      {
        name: '<unique-identifier>',
        key: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      }
      // Add more keys as needed
    ]
  },

  // NVIDIA API keys (replace with your actual keys)
  nvidia: {
    keys: [
      {
        name: '<unique-identifier>',
        key: 'nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      }
      // Add more keys as needed
    ]
  },

  // Package packer options for node-package-packer
  // Controls post-pack tarball cleanup behavior
  packer: {
    // Filter entries from the packed tarball. Return false to exclude.
    // Runs after built-in workspace artifact stripping.
    onFilter: (entryPath) => {
      // Example: exclude node_modules from the tarball
      if (entryPath.includes('node_modules')) return false;
      return true;
    },
    // Callback invoked after tarball cleanup finishes
    // Fires regardless of whether entries were removed.
    // Supports sync, async, or Node-style (err, result) callbacks.
    onFinish: (tarballPath) => {
      console.log(`Tarball cleaned: ${tarballPath}`);
    }
  },

  // Test runner configuration for generate-test-ci-step-cli.
  // Controls how each discovered test file is executed in the generated CI workflow.
  // When omitted, the generator falls back to built-in Jest detection
  // (node --experimental-vm-modules for ESM packages, plain node for CJS).
  testRunner: {
    // Shell command template for running a single test file.
    // Supported tokens:
    //   {{file}}        relative test file path, e.g. test/foo.test.js
    //   {{filename}}    basename only, e.g. foo.test.js
    //   {{pathPattern}} pathPattern used by the built-in Jest fallback
    // When set, takes precedence over bin/args below.
    // template: 'npx vitest run {{pathPattern}}',
    // Runner executable. Defaults to jest auto-detected from package.json type.
    // bin: 'npx vitest',
    // Extra args appended before the --testPathPatterns value (ignored when template is set).
    // args: ['--runInBand', '--forceExit', '--testTimeout=120000'],
    // Skip git-untracked test files (default true, matches current behavior).
    // skipUntracked: true
  }

  // Other configuration options can go here
};
