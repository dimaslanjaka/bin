---
applyTo: '**/*.{js,jsx,ts,tsx,mjs,cjs}'
---
# Node.js Configuration Loader Instructions

Coding standards, domain knowledge, and preferences that AI should follow.

- Using `yarn` as the package manager.
- Linter using `eslint` and formatter using `prettier`.
- Using `jest` for testing.
- When running shell commands that produce output files, direct these outputs to the `tmp` directory and review the complete results for thorough debugging, especially for long-running processes.
- Test files should be placed in the `test/` directory.
- Test current project as dependency in `test-project/` directory.
- Always read `.env` file for project environment.
- When doing testing, look for the `test/env.js` file to ensure the environment is set up correctly.