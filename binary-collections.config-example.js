// rename to binary-collections.config.js and update paths in imports

import path from 'node:path';

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
  }

  // Other configuration options can go here
};
