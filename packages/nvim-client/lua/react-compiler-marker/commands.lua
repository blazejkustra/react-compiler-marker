local M = {}

local lsp = require("react-compiler-marker.lsp")
local config = require("react-compiler-marker.config")

-- Register all user commands
function M.setup(cfg)
  cfg = cfg or config.get()
  -- Activate the extension
  vim.api.nvim_create_user_command("RCMActivate", function()
    lsp.activate()
  end, {
    desc = "React Compiler Marker: Activate",
  })

  -- Deactivate the extension
  vim.api.nvim_create_user_command("RCMDeactivate", function()
    lsp.deactivate()
  end, {
    desc = "React Compiler Marker: Deactivate",
  })

  -- Toggle activation
  vim.api.nvim_create_user_command("RCMToggle", function()
    if lsp.is_activated then
      lsp.deactivate()
    else
      lsp.activate()
    end
  end, {
    desc = "React Compiler Marker: Toggle activation",
  })

  -- Check current file
  vim.api.nvim_create_user_command("RCMCheck", function()
    lsp.check_current_file()
  end, {
    desc = "React Compiler Marker: Refresh markers",
  })

  -- Preview compiled output
  vim.api.nvim_create_user_command("RCMPreview", function()
    lsp.preview_compiled()
  end, {
    desc = "React Compiler Marker: Preview compiled output",
  })

  -- Start LSP server
  vim.api.nvim_create_user_command("RCMStart", function()
    local cfg = config.get()
    lsp.start(cfg)
  end, {
    desc = "React Compiler Marker: Start LSP server",
  })

  -- Stop LSP server
  vim.api.nvim_create_user_command("RCMStop", function()
    lsp.stop()
  end, {
    desc = "React Compiler Marker: Stop LSP server",
  })

  -- Restart LSP server
  vim.api.nvim_create_user_command("RCMRestart", function()
    local cfg = config.get()
    lsp.restart(cfg)
  end, {
    desc = "React Compiler Marker: Restart LSP server",
  })

  -- Show server status
  vim.api.nvim_create_user_command("RCMStatus", function()
    local is_running = lsp.is_running()
    local client = lsp.get_client()

    local status_lines = {
      "React Compiler Marker Status:",
      "",
      string.format("  Server: %s", is_running and "Running" or "Stopped"),
      string.format("  Activated: %s", lsp.is_activated and "Yes" or "No"),
    }

    if client then
      table.insert(status_lines, string.format("  Client ID: %d", client.id))
      table.insert(status_lines, string.format("  Root: %s", client.config.root_dir or "N/A"))
    end

    local cfg = config.get()
    table.insert(status_lines, "")
    table.insert(status_lines, "Configuration:")
    table.insert(status_lines, string.format("  Success Emoji: %s", cfg.emojis.success))
    table.insert(status_lines, string.format("  Error Emoji: %s", cfg.emojis.error))
    table.insert(
      status_lines,
      string.format("  Inlay Hints: %s", cfg.inlay_hints.enabled and "Enabled" or "Disabled")
    )

    vim.notify(table.concat(status_lines, "\n"), vim.log.levels.INFO)
  end, {
    desc = "React Compiler Marker: Show status",
  })

  -- Register keybindings if configured
  if cfg.keybindings.check then
    vim.keymap.set('n', cfg.keybindings.check, ':RCMCheck<CR>',
      { desc = 'React Compiler: Check/Refresh', silent = true })
  end

  if cfg.keybindings.preview then
    vim.keymap.set('n', cfg.keybindings.preview, ':RCMPreview<CR>',
      { desc = 'React Compiler: Preview Compiled', silent = true })
  end

  if cfg.keybindings.status then
    vim.keymap.set('n', cfg.keybindings.status, ':RCMStatus<CR>',
      { desc = 'React Compiler: Status', silent = true })
  end

  if cfg.keybindings.toggle then
    vim.keymap.set('n', cfg.keybindings.toggle, ':RCMToggle<CR>',
      { desc = 'React Compiler: Toggle', silent = true })
  end
end

return M
