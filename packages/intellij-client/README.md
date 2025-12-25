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
**IntelliJ Platform Plugin Template** is a repository that provides a pure template to make it easier to create a new plugin project (check the [Creating a repository from a template][gh:template] article).

The main goal of this template is to speed up the setup phase of plugin development for both new and experienced developers by preconfiguring the project scaffold and CI, linking to the proper documentation pages, and keeping everything organized.

[gh:template]: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template
<!-- Plugin description end -->
