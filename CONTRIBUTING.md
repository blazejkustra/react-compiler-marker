# Contributing to React Compiler Marker

## Prerequisites

- Node.js 20+
- npm 9+
- JDK 21 (for IntelliJ plugin development)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/blazejkustra/react-compiler-marker.git
cd react-compiler-marker

# Install dependencies
npm install
```

## Project Structure

```
packages/
  server/           # LSP server (TypeScript)
  vscode-client/    # VS Code extension (TypeScript)
  intellij-client/  # WebStorm/IntelliJ plugin (Kotlin)
```

### Server

The LSP server is shared by all clients. It handles React Compiler analysis and provides language server protocol support.

```bash
cd packages/server
npm run build
npm run watch
```

### VS Code Client

```bash
cd packages/vscode-client

# Build extension
npm run compile

# Watch mode
npm run watch

# Run tests
npm run test

# Package for distribution
npm run package
```

To debug the extension:
1. Open the project in VS Code
2. Press F5 to launch Extension Development Host

### IntelliJ Client

```bash
cd packages/intellij-client

# Build plugin
./gradlew buildPlugin

# Run in development IDE
./gradlew runIde

# The built plugin is at build/distributions/react-compiler-marker-*.zip
```

## Code Style

- TypeScript: ESLint + Prettier (run `npm run prettier` from root)
- Kotlin: Default IntelliJ formatter

## Testing

```bash
# From root - shared checks
npm run typecheck
npm run lint
npm run prettier

# From packages/vscode-client - extension tests
cd packages/vscode-client
npm run test
```

## Versioning

Each client has its own version:

| Package | Version Location |
|---------|------------------|
| VS Code Client | `packages/vscode-client/package.json` |
| IntelliJ Client | `packages/intellij-client/gradle.properties` |
| Server | `packages/server/package.json` |

## Releasing

### VS Code Extension

1. Create a GitHub release with tag `vscode-v{version}` (e.g., `vscode-v1.3.5`)
2. Add release notes in the release body - these will be added to CHANGELOG.md
3. CI will automatically update `package.json` version and publish to VS Code Marketplace and Open VSX

### IntelliJ Plugin

1. Create a GitHub release with tag `intellij-v{version}` (e.g., `intellij-v1.0.0`)
2. Add release notes in the release body - these will be added to CHANGELOG.md
3. CI will automatically update `gradle.properties` version, build the plugin, and attach it to the release

## Adding a New Client

To add support for a new IDE:

1. Create a new package in `packages/` (e.g., `packages/neovim-client/`)
2. Use the LSP server via stdio mode: `node server.bundle.js --stdio`
3. Implement the client-side UI for displaying inlay hints
4. Add documentation to your client's README
5. Update the release workflow if needed

## Questions?

Open an issue on [GitHub](https://github.com/blazejkustra/react-compiler-marker/issues).
