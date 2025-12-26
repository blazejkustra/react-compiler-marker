# WebStorm Plugin Implementation Summary

This document summarizes the WebStorm/IntelliJ IDEA plugin implementation for React Compiler Marker.

## Overview

The WebStorm plugin provides the same functionality as the VS Code extension by connecting to the existing LSP (Language Server Protocol) server. The plugin is built using Kotlin and the IntelliJ Platform SDK.

## Architecture

```
┌─────────────────────────────────────┐
│   WebStorm/IntelliJ IDEA IDE        │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  React Compiler Marker Plugin │ │
│  │                               │ │
│  │  ├─ Inlay Hints Provider      │ │
│  │  ├─ Actions (Activate, etc.)  │ │
│  │  ├─ Settings UI               │ │
│  │  └─ LSP Client                │ │
│  └──────────┬────────────────────┘ │
└─────────────┼───────────────────────┘
              │
              │ LSP Protocol (stdio)
              │
     ┌────────▼────────────┐
     │  Node.js LSP Server │
     │                     │
     │  server.ts          │
     │  (existing code)    │
     └─────────────────────┘
```

## Key Components

### 1. LSP Server Manager (`ReactCompilerLspServerManager.kt`)

**Purpose**: Manages the lifecycle and communication with the Node.js LSP server.

**Features**:
- Starts the Node.js server process with `--stdio` flag
- Implements LSP4J client interface
- Handles server initialization and configuration
- Provides methods to execute commands and request inlay hints
- Manages server shutdown on IDE close

**Key Methods**:
- `startServer()`: Starts the Node.js LSP server
- `stopServer()`: Shuts down the server gracefully
- `executeCommand()`: Sends commands to the server
- `getInlayHints()`: Requests inlay hints for a file/range
- `notifyConfigurationChange()`: Updates server configuration

### 2. Inlay Hints Provider (`ReactCompilerInlayHintsProvider.kt`)

**Purpose**: Displays emoji markers inline with the code.

**Features**:
- Implements IntelliJ's `InlayHintsProvider` interface
- Requests hints from the LSP server for visible code
- Renders emoji markers next to React components
- Respects activation state from settings

**How it works**:
1. Editor requests inlay hints for visible range
2. Provider sends request to LSP server via `ReactCompilerLspServerManager`
3. Server responds with inlay hint positions and labels
4. Provider renders hints in the editor

### 3. Actions

All actions are accessible via **Tools** → **React Compiler Marker** menu.

#### `ActivateAction.kt`
- Enables the extension
- Updates settings
- Sends activation command to LSP server

#### `DeactivateAction.kt`
- Disables the extension
- Updates settings
- Sends deactivation command to LSP server

#### `CheckOnceAction.kt`
- Manually refreshes markers in current file
- Sends check command to LSP server

#### `PreviewCompiledAction.kt`
- Gets compiled output from LSP server
- Opens result in a new editor tab
- Shows errors if compilation fails

### 4. Settings

#### `ReactCompilerMarkerSettings.kt`
- Persists settings using IntelliJ's state management
- Stores: success emoji, error emoji, babel plugin path, activation state
- Project-level service

#### `ReactCompilerMarkerConfigurable.kt`
- Provides UI for settings page
- Located at: **Settings** → **Languages & Frameworks** → **React Compiler Marker**
- Notifies LSP server when settings change

### 5. Startup Activity (`ReactCompilerMarkerStartupActivity.kt`)

**Purpose**: Initializes the plugin when a project opens.

**Features**:
- Runs automatically when IDE starts
- Starts the LSP server
- Logs initialization status

## File Structure

```
webstorm-plugin/
├── build.gradle.kts                          # Gradle build configuration
├── settings.gradle.kts                       # Gradle settings
├── gradle.properties                         # Gradle properties
├── gradlew                                   # Gradle wrapper (Unix)
├── gradlew.bat                               # Gradle wrapper (Windows)
├── gradle/wrapper/
│   └── gradle-wrapper.properties             # Wrapper configuration
│
├── src/main/
│   ├── kotlin/com/blazejkustra/reactcompilermarker/
│   │   ├── actions/
│   │   │   ├── ActivateAction.kt            # Activate extension
│   │   │   ├── DeactivateAction.kt          # Deactivate extension
│   │   │   ├── CheckOnceAction.kt           # Refresh markers
│   │   │   └── PreviewCompiledAction.kt     # Show compiled output
│   │   │
│   │   ├── hints/
│   │   │   └── ReactCompilerInlayHintsProvider.kt  # Inlay hints
│   │   │
│   │   ├── lsp/
│   │   │   └── ReactCompilerLspServerManager.kt    # LSP client
│   │   │
│   │   ├── settings/
│   │   │   ├── ReactCompilerMarkerSettings.kt      # Settings storage
│   │   │   └── ReactCompilerMarkerConfigurable.kt  # Settings UI
│   │   │
│   │   └── ReactCompilerMarkerStartupActivity.kt   # Initialization
│   │
│   └── resources/
│       └── META-INF/
│           └── plugin.xml                    # Plugin configuration
│
├── README.md                                 # User documentation
└── .gitignore                               # Git ignore rules
```

## LSP Communication

The plugin uses the Language Server Protocol to communicate with the Node.js server:

### Server Capabilities
- **Text Document Sync**: Incremental
- **Inlay Hint Provider**: Enabled
- **Execute Command**: Supports 4 commands

### Commands
1. `react-compiler-marker/activate` - Enable extension
2. `react-compiler-marker/deactivate` - Disable extension
3. `react-compiler-marker/checkOnce` - Refresh hints
4. `react-compiler-marker/getCompiledOutput` - Get compiled code

### Configuration
Settings are synced to server via `didChangeConfiguration`:
```json
{
  "reactCompilerMarker": {
    "successEmoji": "✨",
    "errorEmoji": "🚫",
    "babelPluginPath": "node_modules/babel-plugin-react-compiler"
  }
}
```

## Building & Distribution

### Prerequisites
- JDK 17+
- Gradle 8.5+
- Node.js (for running the server)

### Build Commands

```bash
# Initialize Gradle wrapper
gradle wrapper --gradle-version 8.5

# Build plugin
./gradlew buildPlugin

# Run in development IDE
./gradlew runIde

# Run tests
./gradlew test

# Verify plugin
./gradlew verifyPlugin

# Publish to JetBrains Marketplace
./gradlew publishPlugin
```

### Output
Built plugin: `build/distributions/react-compiler-marker-*.zip`

## Dependencies

### Kotlin Dependencies
- `org.eclipse.lsp4j:org.eclipse.lsp4j:0.21.1` - LSP protocol implementation
- `org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3` - Coroutines support

### IntelliJ Platform
- IntelliJ IDEA 2023.3+
- JavaScript plugin (bundled)
- CSS plugin (bundled)

## Comparison with VS Code Extension

| Feature           | VS Code               | WebStorm             |
| ----------------- | --------------------- | -------------------- |
| **Language**      | TypeScript            | Kotlin               |
| **LSP Client**    | vscode-languageclient | LSP4J                |
| **Communication** | Node IPC              | stdio                |
| **Inlay Hints**   | Native API            | InlayHintsProvider   |
| **Settings**      | settings.json         | XML persistence      |
| **Commands**      | Command Palette       | Tools Menu + Actions |
| **UI Framework**  | React (webview)       | Swing                |

## Testing

### Manual Testing
1. Run `./gradlew runIde`
2. Open a React project
3. Create a React component
4. Verify markers appear
5. Test all actions

### Automated Testing
- Unit tests can be added using IntelliJ Platform Test Framework
- Test LSP communication with mock server
- Test settings persistence

## Known Limitations

1. **Server Discovery**: Currently looks for server at:
   - `$PROJECT/dist/server.js`
   - `$PROJECT/packages/server/out/server.js`
   - `$PROJECT/node_modules/react-compiler-marker/dist/server.js`

2. **Error Handling**: Silent failures when LSP server is not available

3. **Performance**: Hints are requested for visible range only (optimization)

## Future Enhancements

1. **Better Server Discovery**: Auto-detect server location
2. **Quick Fixes**: Implement code actions for fixing compilation errors
3. **Status Bar**: Show extension status in status bar
4. **Notifications**: Better error notifications
5. **Code Lens**: Alternative to inlay hints using code lens
6. **Tests**: Add comprehensive test suite

## Resources

- [IntelliJ Platform SDK](https://plugins.jetbrains.com/docs/intellij/)
- [LSP4J Documentation](https://github.com/eclipse/lsp4j)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [Kotlin Documentation](https://kotlinlang.org/docs/)

## License

MIT License - Same as the main project

## Author

Błażej Kustra - [kustrablazej@gmail.com](mailto:kustrablazej@gmail.com)

