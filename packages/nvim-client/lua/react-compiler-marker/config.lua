local M = {}

-- Default configuration
M.defaults = {
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
}

-- Current configuration (merged defaults + user config)
M.config = vim.deepcopy(M.defaults)

-- Merge user configuration with defaults
function M.setup(user_config)
  M.config = vim.tbl_deep_extend("force", M.defaults, user_config or {})
  return M.config
end

-- Get current configuration
function M.get()
  return M.config
end

-- Update configuration at runtime
function M.update(updates)
  M.config = vim.tbl_deep_extend("force", M.config, updates or {})
  return M.config
end

-- Get LSP server settings for the language server
function M.get_server_settings()
  return {
    reactCompilerMarker = {
      successEmoji = M.config.emojis.success,
      errorEmoji = M.config.emojis.error,
      babelPluginPath = M.config.babel_plugin_path,
    },
  }
end

return M
