# React Compiler Marker - Neovim

Neovim plugin that shows which React components are optimized by the [React Compiler](https://react.dev/learn/react-compiler). See at a glance which components get automatically memoized ✨ and which ones have issues preventing optimization 🚫

![Demo](https://github.com/blazejkustra/react-compiler-marker/raw/main/images/showcase.png)

## Features

- 🎯 **Inlay hints** with emoji markers next to React components
- 🔄 **Auto-refresh** with smart debouncing
- 📝 **Hover tooltips** with detailed error messages
- ⚡ **LSP-based** - Uses the React Compiler Marker Language Server
- 🔧 **Configurable** - Customize emojis, hints format, keybindings, and behavior
- 💡 **Commands** - Activate, deactivate, check, preview compiled output
- 🏥 **Health check** - `:checkhealth react-compiler-marker`

## Requirements

- **Neovim 0.9+** (0.10+ recommended for native inlay hints)
- **Node.js**
- **babel-plugin-react-compiler** installed in your project

## Installation

### Using [lazy.nvim](https://github.com/folke/lazy.nvim)

```lua
{
  'blazejkustra/react-compiler-marker',
  ft = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
  build = './scripts/build-nvim.sh',
  opts = {},
}
```

- `ft` - lazy-loads the plugin only for React/JS/TS files
- `build` - runs after installation to compile the LSP server locally
- `opts` - automatically passed to `setup()` (empty table uses defaults)

## Configuration

### Minimal Setup

```lua
require('react-compiler-marker').setup()
```

### Key Configuration Options

```lua
require('react-compiler-marker').setup({
  -- Visual settings
  emojis = {
    success = "✨",  -- Successfully optimized
    error = "🚫",    -- Failed to optimize
  },

  -- Inlay hint settings
  inlay_hints = {
    enabled = true,
    only_current_line = false,
    hide_in_insert_mode = true,
  },

  -- Auto-refresh settings
  auto_refresh = {
    on_save = true,
    on_text_change = true,
    debounce_ms = 300,
  },

  -- Keybindings (set to false to disable)
  keybindings = {
    check = "<leader>rcc",     -- Check/refresh current file
    preview = "<leader>rcp",   -- Preview compiled output
    status = "<leader>rcs",    -- Show status
    toggle = "<leader>rct",    -- Toggle activation
    refresh = "<leader>rr",    -- Manual refresh (buffer-local)
  },

  -- Notifications
  notifications = {
    enabled = true,
    level = "info",  -- "off", "error", "warn", "info"
  },

  -- LSP server settings
  server = {
    path = nil,  -- Auto-detect
    node_path = "node",
  },

  -- Enable/disable on startup
  enabled = true,
  autostart = true,

  -- File types to attach to
  filetypes = { "javascript", "javascriptreact", "typescript", "typescriptreact" },

  -- Logging level
  log_level = "warn",  -- "off", "error", "warn", "info", "debug", "trace"
})
```

### Example Configurations

**Custom Emojis:**

```lua
require('react-compiler-marker').setup({
  emojis = { success = "✓", error = "✗" },
})
```

## Commands

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `:RCMActivate`   | Enable markers                       |
| `:RCMDeactivate` | Disable markers                      |
| `:RCMToggle`     | Toggle markers on/off                |
| `:RCMCheck`      | Refresh markers in current file      |
| `:RCMPreview`    | Preview compiled output in split     |
| `:RCMStart`      | Start LSP server                     |
| `:RCMStop`       | Stop LSP server                      |
| `:RCMRestart`    | Restart LSP server                   |
| `:RCMStatus`     | Show server status and configuration |

### Default Keybindings

| Keybinding    | Command       | Description                   |
| ------------- | ------------- | ----------------------------- |
| `<leader>rcc` | `:RCMCheck`   | Check/refresh current file    |
| `<leader>rcp` | `:RCMPreview` | Preview compiled output       |
| `<leader>rcs` | `:RCMStatus`  | Show status                   |
| `<leader>rct` | `:RCMToggle`  | Toggle activation             |
| `<leader>rr`  | Refresh       | Manual refresh (buffer-local) |

Set to `false` in config to disable.

## Inlay Hints

The plugin uses Neovim's native inlay hints (Neovim 0.10+). Hints appear inline next to React components.

**Auto-refresh behavior:**

1. Hints hide immediately when you edit
2. After 300ms of no changes, hints refresh
3. Prevents hints from showing at wrong positions

**Manual refresh:** Press `<leader>rr` to refresh immediately.

## Health Check

Run `:checkhealth react-compiler-marker` to verify:

- Neovim version
- Node.js installation
- LSP server availability
- babel-plugin-react-compiler installation
- Current LSP client status

## Troubleshooting

**Inlay hints not showing:**

1. Ensure Neovim 0.10+
2. Check: `:lua print(vim.lsp.inlay_hint.is_enabled())`
3. Verify server: `:RCMStatus`
4. Run: `:checkhealth react-compiler-marker`

**LSP server not starting:**

1. Verify Node.js: `node --version`
2. Run: `:checkhealth react-compiler-marker`
3. Check logs: `:messages`
4. Try: `:RCMStart`

**babel-plugin-react-compiler not found:**

```bash
npm install babel-plugin-react-compiler
```

**Enable debug logging:**

```lua
require('react-compiler-marker').setup({
  log_level = "debug",
})
```

## Links

- [Main Repository](https://github.com/blazejkustra/react-compiler-marker)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Report Issues](https://github.com/blazejkustra/react-compiler-marker/issues)

## License

MIT
