# Agent Instructions for binary-collections

## Project Shape
- This repository is a Node.js CLI toolkit. Source lives in [src/](src), command docs live in [docs-src/](docs-src), and generated runtime artifacts are written to [lib/](lib) and [binaries/](binaries).
- Treat [build.config.cjs](build.config.cjs) and [build.mjs](build.mjs) as the source of truth for binary mapping and packaging behavior.
- The package `bin` map is generated, not hand-maintained. If command entrypoints change, update the source and rerun the build pipeline instead of editing generated output directly.

## DO NOT EDIT generated folders
- **Never edit files inside [lib/](lib) or [binaries/](binaries).** These are build artifacts, written exclusively by `yarn build`.
- All source code lives in [src/](src) — edit there, then run `yarn build` to regenerate `lib/` and `binaries/`.

## Working Rules
- Prefer small, targeted edits in [src/](src), [bin/](bin), or [packages/](packages) depending on the feature area.
- Do not duplicate command documentation in this file; link to the existing docs in [docs-src/](docs-src) instead.
- When changing CLI commands, check whether the command is covered by an existing docs page before adding new prose.
- Keep Windows-specific launcher behavior in mind: several commands are distributed through wrapper scripts under [bin/](bin) and copied into [binaries/](binaries) by the build.

## Build And Test
- Build with `npm run build` (or `yarn build`).
- After editing any file in `src/`, always run `yarn build` **before** running any test shell command.
- Regenerate the package `bin` field with `npm run build-exports` or `node build.mjs`.
- Run tests with `npm test`, `npm run test-esm`, or `npm run test-coverage`.
- Use `test-cjs` for the CommonJS test runner and `test-esm` for the ESM path.

## Implementation Notes
- `build.mjs` copies selected scripts from [bin/](bin) into [binaries/](binaries), adds `.cjs` wrappers, and ensures `.cjs` files have a Node shebang when needed.
- `build.config.cjs` contains the default binary mappings and the `generateMapping()` logic used during packaging.
- Package resolution URLs are intentionally pinned in `package.json`; use the dedicated package-resolution updater flow when those references need to change.

## Documentation Links
- Main overview: [readme.md](readme.md)
- Binary generation and packaging details: [docs-src/package-resolutions-updater.md](docs-src/package-resolutions-updater.md)
- CLI reference entries: [docs-src/](docs-src)
