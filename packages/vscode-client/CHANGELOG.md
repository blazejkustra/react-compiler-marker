# Changelog

All notable changes to the React Compiler Marker VS Code/Cursor plugin will be documented in this file.

## [Unreleased]
### Added
- **Report generation and visualization**: New command to generate a project-wide report of React Compiler optimization results, displayed in an interactive webview with a tree view of files and components
- **Configurable report settings**: Added `excludedDirectories` and `supportedExtensions` settings to customize report scanning

### Fixed
-

---

## [2.1.0] - 2026-02-20
### Added
- **Report generation and visualization**: New command to generate a project-wide report of React Compiler optimization results, displayed in an interactive webview with a tree view of files and components
- **Configurable report settings**: Added `excludedDirectories` and `supportedExtensions` settings to customize report scanning

## [2.0.2] - 2026-01-20
### Added
- **Language Server Protocol (LSP) architecture**: Complete rewrite using LSP for improved performance and cross-editor compatibility
- **LRU caching**: Implemented caching for compilation results to improve performance
- **Debounce functionality**: Added debouncing for inlay hints to reduce unnecessary computations
- **Enhanced logging**: Improved logging with timestamps and better error messages
- **"Fix with AI" support for Cursor**: Extended the "Fix with AI" button to work in Cursor in addition to VS Code and Antigravity

## [1.3.4] - 2025-12-12
### Added
- Support for Google's Antigravity IDE
- User customizable emoji markers

## [1.3.3] - 2025-11-20
### Fixed
- Updated the preview compiled output to use the TypeScript React language for proper syntax highlighting and IntelliSense (Issue #29, PR #30).

## [1.3.2] – 2025-11-16
### Fixed
- Fixed issue where error locations were not being precisely indicated, causing generic error messages without specific code locations (Issue #27, PR #28)

## [1.3.1] – 2025-11-06
### Fixed
- Fixes compiled output command not showing correct output 

## [1.3.0] – 2025-11-04
### Added
- Added `babelPluginPath` configuration option to specify a directory where the babel-plugin-react-compiler is located. By default it's `node_modules/babel-plugin-react-compiler`.

### Fixed
- Fixes an issue where critical errors in the Babel plugin were not properly reported in the extension.

## [1.2.0] – 2025-10-20
### Added
- Added "Fix with AI" button for failed optimizations
- Added command to reveal the selection that caused the failure
- Added "Preview compiled output" link in hover tooltips for successfully optimized components

## [1.1.0] – 2025-10-06

### Added
- Added preview compiled output command
- New extension icon and readme

### Fixed
- Activation and deactivations commands

## [1.0.1-1.0.5] – 2025-10-06

### Fixed
- Fixed bunch of bugs related to marker position

## [1.0.0] – 2024-11-15
### Added
- Initial release of **React Compiler Marker**  
- Added markers: ✨ for successfully optimized components, 🚫 for failed optimizations  
- Hover tooltips explaining success/failure reasons  
- Commands:
  - Activate Decorations  
  - Deactivate Decorations  
  - Check Once (file-level check)  
