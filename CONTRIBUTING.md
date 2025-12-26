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

# Build all packages
npm run compile
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
# Build server
cd packages/server
npm run build

# Watch mode
npm run watch
```

### VS Code Client

```bash
# Build extension
npm run compile

# Watch mode (from root)
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
./gradlew buildPlugin # or ./gradlew compileKotlin

# Run in development IDE
./gradlew runIde

# The built plugin is at build/distributions/react-compiler-marker-*.zip
```

## Code Style

- TypeScript: ESLint + Prettier (run `npm run format`)
- Kotlin: Default IntelliJ formatter

## Testing

```bash
# Run VS Code extension tests
npm run test

# Run type checking
npm run typecheck

# Run linting
npm run lint
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

1. Update version in `packages/vscode-client/package.json`
2. Create a GitHub release with tag `vscode-v{version}` (e.g., `vscode-v1.3.5`)
3. CI will publish to VS Code Marketplace and Open VSX

### IntelliJ Plugin

1. Update version in `packages/intellij-client/gradle.properties`
2. Create a GitHub release with tag `intellij-v{version}` (e.g., `intellij-v1.0.0`)
3. CI will build the plugin and attach it to the release

## Adding a New Client

To add support for a new IDE:

1. Create a new package in `packages/` (e.g., `packages/neovim-client/`)
2. Use the LSP server via stdio mode: `node server.bundle.js --stdio`
3. Implement the client-side UI for displaying inlay hints
4. Add documentation to your client's README
5. Update the release workflow if needed

## Questions?

Open an issue on [GitHub](https://github.com/blazejkustra/react-compiler-marker/issues).
