# React Compiler Marker - WebStorm Plugin Overview

## What is this?

This is a WebStorm/IntelliJ IDEA plugin that provides the same functionality as the VS Code extension for React Compiler Marker. It shows visual markers (✨ and 🚫) next to React components to indicate whether they were successfully optimized by the React Compiler.

## Quick Start

### For Users

1. **Build the plugin:**
   ```bash
   ./quick-start.sh
   ```

2. **Install in WebStorm/IntelliJ:**
   - Open IDE
   - Settings → Plugins → ⚙️ → Install Plugin from Disk
   - Select `build/distributions/react-compiler-marker-*.zip`
   - Restart IDE

3. **Use it:**
   - Open a React project
   - The plugin will automatically show markers next to your components
   - Access commands via **Tools → React Compiler Marker**

### For Developers

1. **Read the documentation:**
   - `README.md` - User-facing documentation
   - `CHANGELOG.md` - Version history

2. **Run in development:**
   ```bash
   ./gradlew runIde
   ```

3. **Build for distribution:**
   ```bash
   ./gradlew buildPlugin
   ```

## How It Works

```
┌──────────────────┐
│   WebStorm IDE   │
│                  │
│  ┌────────────┐  │
│  │   Plugin   │  │ ← Kotlin code
│  │  (LSP4J)   │  │
│  └─────┬──────┘  │
└────────┼─────────┘
         │
         │ stdio (LSP Protocol)
         │
    ┌────▼────┐
    │ Node.js │
    │  Server │ ← TypeScript code (shared with VS Code)
    └─────────┘
```

The plugin:
1. Starts a Node.js LSP server (the same one used by VS Code extension)
2. Communicates via Language Server Protocol over stdio
3. Receives inlay hints from the server
4. Displays them in the IDE

## Key Features

- ✨ Visual markers for optimized components
- 🚫 Error markers for failed optimizations
- 👁️ Preview compiled output
- ⚙️ Configurable settings
- 🎮 Easy activate/deactivate
- 📝 Detailed error messages with suggestions

## File Structure

```
webstorm-plugin/
├── build.gradle.kts              # Build configuration
├── src/main/
│   ├── kotlin/                   # Source code
│   │   ├── actions/              # Plugin actions
│   │   ├── hints/                # Inlay hints
│   │   ├── lsp/                  # LSP client
│   │   └── settings/             # Settings
│   └── resources/
│       └── META-INF/plugin.xml   # Plugin metadata
├── IMPLEMENTATION_SUMMARY.md     # Architecture
├── OVERVIEW.md                   # This file
├── CHANGELOG.md                  # Version history
├── quick-start.sh                # Setup script
├── gradlew                       # Gradle wrapper
└── .gitignore                    # Git ignore
```

## Requirements

**Runtime:**
- WebStorm 2023.3+ or IntelliJ IDEA Ultimate 2023.3+
- Node.js (for the LSP server)
- `babel-plugin-react-compiler` in your project

**Development:**
- JDK 17+
- Gradle 8.5+
- IntelliJ IDEA (for development)

## Commands

All commands available via **Tools → React Compiler Marker**:

1. **Activate Extension** - Enable the plugin
2. **Deactivate Extension** - Disable the plugin
3. **Check Current File** - Manually refresh markers
4. **Preview Compiled Output** - View compiled code

## Configuration

Settings at: **Settings → Languages & Frameworks → React Compiler Marker**

- **Success Emoji**: Marker for optimized components (default: ✨)
- **Error Emoji**: Marker for failed components (default: 🚫)
- **Babel Plugin Path**: Path to React Compiler plugin (default: `node_modules/babel-plugin-react-compiler`)

## Comparison: WebStorm vs VS Code

| Aspect            | WebStorm  | VS Code               |
| ----------------- | --------- | --------------------- |
| Language          | Kotlin    | TypeScript            |
| LSP Communication | stdio     | Node IPC              |
| Build System      | Gradle    | npm + esbuild         |
| UI Framework      | Swing     | None (native APIs)    |
| LSP Library       | LSP4J     | vscode-languageclient |
| Plugin Format     | ZIP       | VSIX                  |
| Marketplace       | JetBrains | VS Code Marketplace   |

**Shared Components:**
- LSP Server (TypeScript)
- React Compiler analysis logic
- Configuration schema
- Command set

## Development Workflow

1. **Make changes** to Kotlin files
2. **Build**: `./gradlew buildPlugin`
3. **Test**: `./gradlew runIde`
4. **Debug**: Use IntelliJ IDEA's debugger
5. **Verify**: `./gradlew verifyPlugin`
6. **Publish**: `./gradlew publishPlugin`

## Testing

### Manual Testing
1. Run `./gradlew runIde`
2. Create/open React project
3. Write React components
4. Verify markers appear
5. Test all actions
6. Change settings and verify updates

### Automated Testing
- Add unit tests in `src/test/kotlin/`
- Run: `./gradlew test`

## Troubleshooting

### Build fails
- Ensure JDK 17+ is installed
- Run `gradle wrapper --gradle-version 8.5` first
- Check Gradle logs

### Plugin doesn't load
- Check IDE version (2023.3+)
- Verify plugin.xml syntax
- Check IDE logs: Help → Show Log

### Markers don't appear
- Ensure Node.js is installed
- Check server.js exists in project
- Look for LSP errors in logs
- Try "Check Current File" command

### Performance issues
- Hints are lazy-loaded per visible range
- Large files may take longer
- Consider disabling for very large files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Resources

- [IntelliJ Platform SDK](https://plugins.jetbrains.com/docs/intellij/)
- [LSP4J Documentation](https://github.com/eclipse/lsp4j)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [React Compiler](https://react.dev/learn/react-compiler)

## Support

- GitHub Issues: [Report bugs](https://github.com/blazejkustra/react-compiler-marker/issues)
- Email: kustrablazej@gmail.com
- Documentation: See README.md and other docs

## License

MIT License - See LICENSE file in project root

---

**Made with ❤️ by Błażej Kustra**

**Enjoy coding with React Compiler Marker ✨!**

