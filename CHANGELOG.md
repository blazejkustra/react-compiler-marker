# Changelog

All notable changes to **react-compiler-marker** will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org).

## [Unreleased]

---

## [1.3.0] – 2025-01-30
### Added
- Workspace scanning to find all unoptimized components across the project
- Interactive HTML report with sortable/filterable table
- Problems panel integration with inline warnings
- Status bar indicator for quick workspace access
- Ignore functionality via settings patterns or inline comments (`// react-compiler-marker-disable`)
- Visual distinction for ignored components (⭕ decoration)

---

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