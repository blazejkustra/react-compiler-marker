# React Compiler Marker - Neovim

**Neovim plugin that shows which React components are optimized by the [React Compiler](https://react.dev/learn/react-compiler)**. See at a glance which components get automatically memoized ✨ and which ones have issues preventing optimization 🚫

![Demo](https://github.com/blazejkustra/react-compiler-marker/raw/main/images/showcase.png)

## Features

- 🎯 **Inlay hints** with emoji markers next to React components
- 🔄 **Auto-refresh** - Hints automatically update as you type with smart debouncing
- 📝 **Hover tooltips** with detailed optimization information and error messages
- ⚡ **LSP-based** - Uses the React Compiler Marker Language Server
- 🔧 **Configurable** - Customize emojis and behavior
- 💡 **Commands** - Activate, deactivate, check current file, preview compiled output
- 🏥 **Health check** - `:checkhealth react-compiler-marker` to verify setup

## Requirements

- **Neovim 0.9+** (0.10+ recommended for native inlay hints)
- **Node.js** (to run the LSP server)
- **babel-plugin-react-compiler** installed in your project

## Installation

### Using [lazy.nvim](https://github.com/folke/lazy.nvim) (Recommended)

```lua
{
  'blazejkustra/react-compiler-marker',
  event = { 'BufReadPre *.js,*.jsx,*.ts,*.tsx', 'BufNewFile *.js,*.jsx,*.ts,*.tsx' },
  build = 'npm install && node esbuild.js --production',
  opts = {
    -- your configuration here (optional)
  },
}
```

> **Note**: The `build` step compiles the LSP server after installation. The `event` option provides lazy-loading for React/JS/TS files.

### Using [packer.nvim](https://github.com/wbthomason/packer.nvim)

```lua
use {
  'blazejkustra/react-compiler-marker',
  run = 'npm install && node esbuild.js --production',
  config = function()
    require('react-compiler-marker').setup()
  end
}
```

### Using [vim-plug](https://github.com/junegunn/vim-plug)

```vim
Plug 'blazejkustra/react-compiler-marker', { 'do': 'npm install && node esbuild.js --production' }

" In your init.lua or init.vim:
lua << EOF
require('react-compiler-marker').setup()
EOF
```

### Manual Installation

Clone this repository and build the server:

```bash
git clone https://github.com/blazejkustra/react-compiler-marker.git \
  ~/.local/share/nvim/site/pack/plugins/start/react-compiler-marker

cd ~/.local/share/nvim/site/pack/plugins/start/react-compiler-marker
npm install && node esbuild.js --production
```

## Configuration

### Default Configuration

```lua
require('react-compiler-marker').setup({
  -- LSP server settings
  server = {
    -- Path to the LSP server. If nil, will auto-detect
    path = nil,
    -- Path to Node.js executable
    node_path = "node",
    -- Additional command line arguments for the server
    args = { "--stdio" },
  },

  -- Visual settings
  emojis = {
    -- Marker for successfully optimized components
    success = "✨",
    -- Marker for components that failed to optimize
    error = "🚫",
  },

  -- Path to babel-plugin-react-compiler (relative to workspace root)
  babel_plugin_path = "node_modules/babel-plugin-react-compiler",

  -- Enable/disable on startup
  enabled = true,

  -- Inlay hint settings
  inlay_hints = {
    -- Enable inlay hints (requires Neovim 0.10+)
    enabled = true,
    -- Only show hints on current line
    only_current_line = false,
    -- Hide hints in insert mode (prevents rendering issues)
    hide_in_insert_mode = true,
    -- Hint position: "eol" (end of line) or "inline"
    position = "eol",
    -- Format template: {emoji}, {name}, {status}
    -- Examples:
    --   "{emoji}" - Just the emoji
    --   "{emoji} {name}" - "✨ MyComponent"
    --   "{name} {emoji}" - "MyComponent ✨"
    format = "{emoji}",
  },

  -- Hover settings
  hover = {
    -- Enable hover provider
    enabled = true,
  },

  -- Custom highlight groups
  highlights = {
    -- Highlight group for success hints
    success_hint = "Comment",
    -- Highlight group for error hints
    error_hint = "DiagnosticError",
  },

  -- Auto-refresh settings
  auto_refresh = {
    -- Refresh hints on save
    on_save = true,
    -- Refresh hints on text changes
    on_text_change = true,
    -- Debounce delay in milliseconds
    debounce_ms = 300,
  },

  -- Notification settings
  notifications = {
    -- Enable notifications
    enabled = true,
    -- Notification level: "off", "error", "warn", "info"
    level = "info",
    -- Show notification when activating
    show_on_activate = true,
    -- Show notification when checking file
    show_on_check = false,
  },

  -- Keybindings (set to false to disable)
  keybindings = {
    -- Check/refresh current file
    check = "<leader>rcc",
    -- Preview compiled output
    preview = "<leader>rcp",
    -- Show status
    status = "<leader>rcs",
    -- Toggle activation
    toggle = "<leader>rct",
    -- Manual refresh (buffer-local, set on LspAttach)
    refresh = "<leader>rr",
  },

  -- Automatically start LSP server when opening React files
  autostart = true,

  -- File types to attach to
  filetypes = { "javascript", "javascriptreact", "typescript", "typescriptreact" },

  -- Logging level: "off", "error", "warn", "info", "debug", "trace"
  log_level = "warn",
})
```

### Example Configurations

#### Minimal Configuration

```lua
require('react-compiler-marker').setup()
```

#### Custom Emojis

```lua
require('react-compiler-marker').setup({
  emojis = {
    success = "✓",
    error = "✗",
  },
})
```

#### Custom Server Path

```lua
require('react-compiler-marker').setup({
  server = {
    path = vim.fn.expand("~/path/to/server/server.js"),
  },
})
```

#### Custom Hint Format

```lua
require('react-compiler-marker').setup({
  inlay_hints = {
    format = "{emoji} {name}",  -- "✨ MyComponent"
  },
})
```

#### Disable Notifications

```lua
require('react-compiler-marker').setup({
  notifications = {
    enabled = false,
  },
})
```

#### Custom Keybindings

```lua
require('react-compiler-marker').setup({
  keybindings = {
    check = "<leader>rc",
    preview = "<leader>rp",
    status = "<leader>rs",
    toggle = "<leader>rt",
    refresh = false,  -- Disable refresh keybinding
  },
})
```

#### Disable Autostart

```lua
require('react-compiler-marker').setup({
  autostart = false,
})
-- Manually start with :RCMStart
```

## Commands

All commands are prefixed with `RCM` for convenience:

| Command | Description |
|---------|-------------|
| `:RCMActivate` | Enable markers |
| `:RCMDeactivate` | Disable markers |
| `:RCMToggle` | Toggle markers on/off |
| `:RCMCheck` | Refresh markers in current file |
| `:RCMPreview` | Preview compiled output in split |
| `:RCMStart` | Start LSP server |
| `:RCMStop` | Stop LSP server |
| `:RCMRestart` | Restart LSP server |
| `:RCMStatus` | Show server status and configuration |

### Keybindings

By default, the plugin sets up the following keybindings (configurable via `keybindings` option):

| Keybinding | Command | Description |
|------------|---------|-------------|
| `<leader>rcc` | `:RCMCheck` | Check/refresh current file |
| `<leader>rcp` | `:RCMPreview` | Preview compiled output |
| `<leader>rcs` | `:RCMStatus` | Show status |
| `<leader>rct` | `:RCMToggle` | Toggle activation |
| `<leader>rr` | Refresh | Manual refresh (buffer-local) |

To disable keybindings, set them to `false` in your configuration.

## Inlay Hints

The plugin uses Neovim's native inlay hints feature (available in Neovim 0.10+). Inlay hints appear inline in your code next to React components.

### Toggling Inlay Hints

You can toggle inlay hints globally with Neovim's built-in command:

```vim
:lua vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled())
```

Or add a keymap:

```lua
vim.keymap.set('n', '<leader>ih', function()
  vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled())
end, { desc = 'Toggle inlay hints' })
```

### Automatic Refresh

The plugin automatically refreshes inlay hints when you edit code. Here's how it works:

1. **Immediate hide**: When you make any edit (typing, deleting lines, etc.), hints disappear instantly
2. **Debounced refresh**: After 300ms of no changes, the plugin requests fresh hints from the server
3. **Re-display**: Once the server responds (~150ms), hints reappear with correct positions

This prevents hints from "shifting" or showing at wrong positions during edits. You'll see a brief flicker-free editing experience.

### Manual Refresh

A convenient keybinding is automatically set up for you:

- **`<leader>rr`** - Manually refresh hints in the current buffer

This is useful if you want to immediately see updated hints without waiting for the automatic debounce.

## Health Check

Run the health check to verify your setup:

```vim
:checkhealth react-compiler-marker
```

This will check:
- Neovim version
- Node.js installation
- LSP server availability
- babel-plugin-react-compiler installation
- Current LSP client status
- Configuration

## Troubleshooting

### Inlay hints not showing

1. Make sure you're using Neovim 0.10+
2. Check if inlay hints are enabled: `:lua print(vim.lsp.inlay_hint.is_enabled())`
3. Verify the LSP server is running: `:ReactCompilerMarkerStatus`
4. Run health check: `:checkhealth react-compiler-marker`

### LSP server not starting

1. Verify Node.js is installed: `node --version`
2. Check if the server exists: Run `:checkhealth react-compiler-marker`
3. Check logs: `:lua vim.cmd('messages')`
4. Try starting manually: `:ReactCompilerMarkerStart`

### babel-plugin-react-compiler not found

1. Install in your project: `npm install babel-plugin-react-compiler`
2. Or configure custom path in setup:
   ```lua
   require('react-compiler-marker').setup({
     babel_plugin_path = "path/to/babel-plugin-react-compiler",
   })
   ```

### Server crashes or errors

1. Check Node.js version (Node.js 16+ recommended)
2. Restart the server: `:ReactCompilerMarkerRestart`
3. Check the logs: `:messages`
4. Try with debug logging:
   ```lua
   require('react-compiler-marker').setup({
     log_level = "debug",
   })
   ```

## Server Discovery

The plugin automatically searches for the LSP server in this order:

1. User-configured path (`server.path` in setup)
2. Bundled server in plugin directory
3. Project's `node_modules/@react-compiler-marker/server`
4. Monorepo development paths
5. Global npm installation

## API

### Setup

```lua
require('react-compiler-marker').setup(config)
```

### Get Configuration

```lua
local config = require('react-compiler-marker').get_config()
```

### Update Configuration at Runtime

```lua
require('react-compiler-marker').update_config({
  emojis = {
    success = "👍",
    error = "👎",
  },
})
```

### Access LSP Client Directly

```lua
local lsp = require('react-compiler-marker').lsp

-- Check if running
if lsp.is_running() then
  print("LSP is running")
end

-- Get client
local client = lsp.get_client()

-- Execute custom command
lsp.execute_command("custom-command", {}, function(err, result)
  print(vim.inspect(result))
end)
```

## Integration with Other Plugins

### With [lualine.nvim](https://github.com/nvim-lualine/lualine.nvim)

Show React Compiler status in your statusline:

```lua
require('lualine').setup({
  sections = {
    lualine_x = {
      function()
        local lsp = require('react-compiler-marker').lsp
        if lsp.is_running() then
          return lsp.is_activated and '✨ RC' or '🚫 RC'
        end
        return ''
      end,
    },
  },
})
```

### With [nvim-notify](https://github.com/rcarriga/nvim-notify)

The plugin uses `vim.notify()` for all notifications, so if you have nvim-notify installed, you'll automatically get nice notification popups.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) in the main repository.

## License

MIT

## Links

- [Main Repository](https://github.com/blazejkustra/react-compiler-marker)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Report Issues](https://github.com/blazejkustra/react-compiler-marker/issues)
