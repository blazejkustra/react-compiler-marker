# Changelog

All notable changes to the React Compiler Marker CLI will be documented in this file.

## [Unreleased]

---

## [0.2.0] - 2026-08-18
### Added
- `"use no memo"` opt-outs are now counted and reported as skipped (⏭️) instead of being dropped
- `--compilation-mode <mode>` flag to set the React Compiler `compilationMode` (`infer`, `annotation`, `syntax`, `all`; default `infer`)

### Fixed
- `.js`/`.jsx`/`.mjs` files with a `@flow` pragma are now parsed with hermes-parser, so modern Flow syntax (`component`, `hook`, `renders`, `readonly`, `match`, `x is T`, …) no longer fails to parse — thanks @jonreading81
- Skipped entries are now reported at the start of the function for multi-line signatures instead of a later line

## [0.1.0] - 2026-03-15
### Added
- Fix publishing to npm 

## [0.0.1] - 2026-03-15
### Added
- Initial release of **React Compiler Marker CLI**
- Project scanning to identify components optimized by the React Compiler
- Output formats: text (default), HTML (interactive report), and JSON
- Configurable options: `--format`, `--output`, `--exclude-dirs`, `--include-extensions`, `--babel-plugin-path`
- CI-friendly exit codes (exits with 1 if any compilation failures exist)
- Real-time progress reporting during scanning
