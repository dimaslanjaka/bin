# Git-Fix Test Suite

This directory contains comprehensive tests for the `git-fix` utility and its related modules.

## Environment Configuration

The test suite properly reads the `.env` file from the project root to load environment variables:
- `GITHUB_USER` - Used for git user.name configuration
- `GITHUB_EMAIL` - Used for git user.email configuration

This ensures tests run with the same environment as the actual application.

## Test Files

### 1. `git-fix.test.js`
**Main unit tests for the git-fix CLI utility**
- Tests command-line argument parsing (`--help`, `-h`, `--user`, etc.)
- Tests option combinations (`--lf-only`, `--permissions`, `--normalize`)
- Tests user configuration with CLI arguments and environment variables
- Tests error handling for invalid arguments and non-git repositories
- Tests summary message output
- Uses extensive mocking to isolate the CLI logic

### 2. `git-utils.test.js`
**Unit tests for the git utility functions**
- Tests `runGitCommand()` function with success/failure scenarios
- Tests `isGitRepository()` function
- Tests error handling and console output
- Mocks `child_process` functions

### 3. `git-user-config.test.js`
**Unit tests for the git user configuration module**
- Tests user configuration with CLI arguments vs environment variables
- Tests precedence (CLI args override environment variables)
- Tests partial configuration (username only, email only)
- Tests whitespace handling and trimming
- Tests error scenarios when git commands fail

### 4. `git-fix-integration.test.js`
**Integration tests using real git repositories**
- Creates temporary git repositories for testing
- Tests actual git configuration changes
- Tests `.gitattributes` file creation and modification
- Tests real git config values (`core.autocrlf`, `core.eol`, etc.)
- Tests console output and error handling
- More realistic testing but slower than unit tests

### 5. `test-helpers.js`
**Test utility functions**
- `createTempGitRepo()` - Creates temporary git repositories for testing
- `cleanupTempDir()` - Cleans up test directories
- `getGitConfig()` - Reads actual git configuration values
- `gitAttributesContains()` - Checks .gitattributes file content
- Helper functions for mocking `process.argv`

## Running Tests

```bash
# Run all git-related tests
yarn test --testNamePattern="git"

# Run specific test files
yarn test git-fix.test.js
yarn test git-utils.test.js
yarn test git-user-config.test.js
yarn test git-fix-integration.test.js

# Run with coverage
yarn test:coverage

# Run in watch mode
yarn test:watch
```

## Test Coverage

The test suite covers:
- ✅ Command-line argument parsing
- ✅ Help system (`--help`, `-h`)
- ✅ All CLI options and combinations
- ✅ User configuration (CLI args + environment variables)
- ✅ Git repository detection
- ✅ Error handling and edge cases
- ✅ Console output and logging
- ✅ Real git configuration changes (integration tests)
- ✅ File system operations (.gitattributes creation)

## Test Structure

- **Unit tests** use extensive mocking to test logic in isolation
- **Integration tests** use real git repositories to test actual functionality
- **Helper functions** provide reusable utilities for test setup and cleanup
- All tests use Jest with proper setup/teardown for clean testing environment

## Notes

- Integration tests create temporary directories in the system temp folder
- All tests clean up after themselves (no leftover files or directories)
- Console output is mocked in tests to avoid cluttered test output
- Environment variables are properly reset between tests
- Tests work on both Windows and Unix-like systems
