# React Compiler Marker - Zed

Zed extension that shows which React components are optimized by the [React Compiler](https://react.dev/learn/react-compiler). See at a glance which components get automatically memoized ✨ and which ones have issues preventing optimization 🚫

![Demo](https://github.com/blazejkustra/react-compiler-marker/raw/main/images/showcase.png)

## Features

- 🎯 **Inlay hints** with emoji markers next to React components
- 🔄 **Auto-refresh** on file changes
- 📝 **Hover tooltips** with detailed error messages
- ⚡ **LSP-based** - Uses the React Compiler Marker Language Server
- 🔧 **Configurable** - Customize emojis and babel plugin path

## Requirements

- **Zed** (latest version recommended)
- **Node.js**
- **babel-plugin-react-compiler** installed in your project

## Installation

1. Open Zed
2. Go to **Extensions** (`cmd+shift+x`)
3. Search for **"React Compiler Marker"**
4. Click **Install**

### Dev Installation

1. Install the WASM target: `rustup target add wasm32-wasip1`
2. Build: `cd packages/zed-client && cargo build --target wasm32-wasip1 --release`
3. In Zed: **Extensions** → **Install Dev Extension** → select the `packages/zed-client/` directory

## Setup

Inlay hints are disabled by default in Zed. To see React Compiler markers, add this to your Zed `settings.json` (`cmd+,`):

```json
{
  "inlay_hints": {
    "enabled": true
  }
}
```

## Configuration

Add settings to your Zed `settings.json` (`cmd+,`):

```json
{
  "lsp": {
    "react-compiler-marker": {
      "settings": {
        "successEmoji": "✨",
        "errorEmoji": "🚫",
        "skippedEmoji": "⏭️",
        "babelPluginPath": "node_modules/babel-plugin-react-compiler"
      }
    }
  }
}
```

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `successEmoji` | `✨` | Emoji shown for successfully optimized components |
| `errorEmoji` | `🚫` | Emoji shown for components with optimization errors |
| `skippedEmoji` | `⏭️` | Emoji shown for components that opted out via `"use no memo"` |
| `babelPluginPath` | `node_modules/babel-plugin-react-compiler` | Path to the babel-plugin-react-compiler package |

## Limitations

- **No custom commands** - Zed does not yet fully support `workspace/executeCommand` ([zed#13756](https://github.com/zed-industries/zed/issues/13756)), so commands like "Preview Compiled Output" are not available
- **No custom panels** - Compiled output preview requires custom panels which are not yet available in the Zed extension API
- **Activate/Deactivate** - Use Zed's built-in language server toggle instead
