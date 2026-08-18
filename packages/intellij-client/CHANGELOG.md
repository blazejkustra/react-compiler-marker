# Changelog

All notable changes to the React Compiler Marker WebStorm/IntelliJ plugin will be documented in this file.

## [Unreleased]
### Added
- **`"use no memo"` opt-outs**: Functions opted out of the compiler are now reported as skipped (configurable Skipped Emoji, default ⏭️) instead of being dropped from markers and reports
- **Respect .gitignore**: New setting to honor .gitignore rules when scanning files for report generation (enabled by default)
- **Compilation Mode**: New setting to choose the React Compiler `compilationMode` (`infer`, `annotation`, `syntax`, `all`) so markers match your project's configuration

### Fixed
- **Flow files**: `.js`/`.jsx`/`.mjs` files with a `@flow` pragma are now parsed with hermes-parser, so modern Flow syntax (`component`, `hook`, `renders`, `readonly`, `match`, `x is T`, …) no longer fails to parse and drop all markers — thanks @jonreading81
- **Plugin and report resolution**: the React Compiler plugin and generated reports are now resolved relative to the project root
- **Skipped marker position**: the skipped marker is now placed at the start of the function for multi-line signatures instead of drifting onto a later line

---

## [1.0.1] - 2026-03-14
### Added
- **Respect .gitignore**: New setting to honor .gitignore rules when scanning files for report generation (enabled by default)

## [1.0.0] - 2026-02-23
Stable release! 🎉 

- **Report generation and visualization**: Generate a project-wide report of React Compiler optimization results, displayed in an interactive webview with a tree view of files and components
- **"Fix with AI" button in report webview**: Generates a markdown file listing all failed components with their error locations and reasons, including AI instructions for fixing them

## [0.0.5] - 2026-01-14
**Full Changelog**: https://github.com/blazejkustra/react-compiler-marker/compare/intellij-v0.0.4...intellij-v0.0.5

## [0.0.4] - 2026-01-14
### Changed
- Use Node.js interpreter from IDE settings (Settings → Languages & Frameworks → Node.js) instead of hardcoded paths
- Simplified Node.js discovery with `which`/`where` fallback for cross-platform support (macOS, Linux, Windows)

## [0.0.3] - 2025-12-27
### Fixed
- Reduced JS bundle size


## [0.0.1] - 2025-12-27

### Added
- Initial release of WebStorm/IntelliJ plugin
- LSP client integration with React Compiler Marker server
- Inlay hints provider for React component optimization markers
- Actions for activate, deactivate, check once, and preview compiled output
- Settings page for customizing emoji markers and babel plugin path
- Support for JavaScript, TypeScript, JSX, and TSX files

### Features
- Visual markers (✨) for successfully optimized components
- Error markers (🚫) for components that failed optimization
- Detailed error messages with suggestions
- Preview compiled output functionality
- Customizable emoji markers
- Enable/disable extension on demand

