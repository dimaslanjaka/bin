// rename to .binary-collections.config.js and update paths in imports

import path from 'node:path';

export default {
  // Example configuration for binary-collections
  // You can customize these settings as needed

  // Base directory for temporary files (optional)
  tempDir: path.join(process.cwd(), 'tmp'),

  // GitHub token for API access (can also be set via environment variables)
  githubToken: process.env.GITHUB_TOKEN || 'your-github-token-here',

  // Opencode API keys (replace with your actual keys)
  opencode: {
    keys: [
      {
        name: '<unique-identifier>',
        key: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      }
      // Add more keys as needed
    ]
  }

  // Other configuration options can go here
};
