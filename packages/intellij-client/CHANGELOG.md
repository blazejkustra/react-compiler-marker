# Changelog

All notable changes to the React Compiler Marker WebStorm/IntelliJ plugin will be documented in this file.

## [Unreleased]
### Added
-

### Fixed
-

---

## [0.0.4] - 2025-01-14
### Changed
- Use Node.js interpreter from IDE settings (Settings → Languages & Frameworks → Node.js) instead of hardcoded paths
- Simplified Node.js discovery with `which`/`where` fallback for cross-platform support (macOS, Linux, Windows)

---

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

