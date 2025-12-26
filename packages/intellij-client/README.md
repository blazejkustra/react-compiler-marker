# React Compiler Marker ✨ - WebStorm/IntelliJ Plugin

A WebStorm/IntelliJ IDEA plugin that highlights components optimized by the React Compiler, providing ✨ visual cues ✨ to make the optimization process more transparent during development.

## Features

- 🎯 **Visual Markers**: See ✨ next to successfully optimized React components
- 🚫 **Error Indicators**: Identify components that failed optimization with 🚫 markers
- 📝 **Detailed Messages**: Get helpful error messages and suggestions
- 👁️ **Preview Compiled**: View the compiled output of your React components
- ⚙️ **Customizable**: Configure emoji markers and babel plugin path
- 🎮 **Easy Control**: Activate/deactivate the extension on demand

## Requirements

- WebStorm 2023.3+ or IntelliJ IDEA Ultimate 2023.3+
- Node.js installed
- `babel-plugin-react-compiler` in your project's `node_modules`

## Installation

### From JetBrains Marketplace

1. Open WebStorm/IntelliJ IDEA
2. Go to **Settings/Preferences** → **Plugins**
3. Search for "React Compiler Marker"
4. Click **Install**
5. Restart the IDE

### Manual Installation

1. Download the latest release `.zip` file
2. Open WebStorm/IntelliJ IDEA
3. Go to **Settings/Preferences** → **Plugins**
4. Click the ⚙️ icon → **Install Plugin from Disk...**
5. Select the downloaded `.zip` file
6. Restart the IDE

## Building from Source

```bash
cd packages/intellij-client
./gradlew buildPlugin
```

The plugin will be built to `build/distributions/react-compiler-marker-*.zip`

## Usage

The plugin automatically starts when you open a project containing React code. It analyzes your JavaScript/TypeScript files and shows inlay hints next to React components.

### Commands

Access these commands from **Tools** → **React Compiler Marker**:

- **Activate Extension**: Enable the extension
- **Deactivate Extension**: Disable the extension
- **Check Current File**: Manually refresh markers in the current file
- **Preview Compiled Output**: View the compiled output of the current file

### Configuration

Go to **Settings/Preferences** → **Languages & Frameworks** → **React Compiler Marker**:

- **Success Emoji**: Emoji shown for optimized components (default: ✨)
- **Error Emoji**: Emoji shown for failed components (default: 🚫)
- **Babel Plugin Path**: Path to babel-plugin-react-compiler (default: `node_modules/babel-plugin-react-compiler`)

## How It Works

The plugin uses a Language Server Protocol (LSP) server that:

1. Monitors your React component files
2. Runs the React Compiler on each component
3. Reports success/failure with detailed information
4. Displays inlay hints in your editor

## Troubleshooting

### Markers not appearing

1. Ensure `babel-plugin-react-compiler` is installed in your project
2. Check that the plugin is activated: **Tools** → **React Compiler Marker** → **Activate Extension**
3. Try manually refreshing: **Tools** → **React Compiler Marker** → **Check Current File**

### LSP Server not starting

1. Check the IDE logs: **Help** → **Show Log in Finder/Explorer**
2. Ensure Node.js is in your PATH
3. Verify the server script exists in your project at `dist/server.js`

## License

MIT License - see [LICENSE](../../LICENSE) file for details

## Author

Błażej Kustra - [kustrablazej@gmail.com](mailto:kustrablazej@gmail.com)

## Links

- [GitHub Repository](https://github.com/blazejkustra/react-compiler-marker)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=blazejkustra.react-compiler-marker)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)

<!-- Plugin description -->
**React Compiler Marker** highlights React components optimized by the [React Compiler](https://react.dev/learn/react-compiler).

See at a glance which components are automatically memoized with ✨ markers, identify optimization failures with 🚫 indicators and detailed error messages, and preview the compiled output.

**Features:**
- ✨ Visual markers next to successfully optimized React components
- 🚫 Error indicators for components that failed optimization
- Hover tooltips with optimization details and suggestions
- Preview compiled output of your React components
- Easy activation/deactivation via Tools menu

**Configuration** (Settings → Languages & Frameworks → React Compiler Marker):
- **Success Emoji**: Customize the marker for optimized components (default: ✨)
- **Error Emoji**: Customize the marker for failed components (default: 🚫)
- **Babel Plugin Path**: Set custom path to babel-plugin-react-compiler

<!-- Plugin description end -->
