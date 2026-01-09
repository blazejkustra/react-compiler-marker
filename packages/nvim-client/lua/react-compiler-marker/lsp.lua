local M = {}

local config = require("react-compiler-marker.config")

-- Store the client ID
M.client_id = nil

-- Store whether the extension is activated
M.is_activated = true

-- Helper to send notifications respecting config
local function notify(message, level, context)
  local cfg = config.get()

  -- Check if notifications are enabled
  if not cfg.notifications.enabled then
    return
  end

  -- Check notification level
  local level_priority = { off = 0, error = 1, warn = 2, info = 3 }
  local configured_level = level_priority[cfg.notifications.level] or 3
  local message_level = level_priority[level] or 3

  if message_level > configured_level then
    return
  end

  -- Check context-specific settings
  if context == "activate" and not cfg.notifications.show_on_activate then
    return
  end

  if context == "check" and not cfg.notifications.show_on_check then
    return
  end

  -- Map level string to vim.log.levels
  local vim_levels = {
    error = vim.log.levels.ERROR,
    warn = vim.log.levels.WARN,
    info = vim.log.levels.INFO,
  }

  vim.notify(message, vim_levels[level] or vim.log.levels.INFO)
end

-- Find the LSP server executable
local function find_server_path(cfg)
  -- 1. User-provided path
  if cfg.server.path then
    if vim.fn.filereadable(cfg.server.path) == 1 then
      return cfg.server.path
    end
    notify(
      string.format("react-compiler-marker: Configured server path not found: %s", cfg.server.path),
      "warn"
    )
  end

  -- 2. Bundled server in plugin directory
  local plugin_path = vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":h:h:h")
  local bundled_server = plugin_path .. "/server/server.bundle.js"
  if vim.fn.filereadable(bundled_server) == 1 then
    return bundled_server
  end

  -- 3. Check workspace node_modules
  local workspace_root = vim.fn.getcwd()
  local workspace_server = workspace_root .. "/node_modules/@react-compiler-marker/server/out/server.js"
  if vim.fn.filereadable(workspace_server) == 1 then
    return workspace_server
  end

  -- 4. Check for monorepo development setup
  local dev_paths = {
    workspace_root .. "/packages/server/out/server.js",
    workspace_root .. "/../server/out/server.js",
  }
  for _, path in ipairs(dev_paths) do
    if vim.fn.filereadable(path) == 1 then
      return path
    end
  end

  -- 5. Try global installation
  local global_server = vim.fn.exepath("react-compiler-marker-lsp")
  if global_server ~= "" then
    return global_server
  end

  return nil
end

-- Check if Node.js is available
local function check_node(node_path)
  local handle = io.popen(node_path .. " --version 2>&1")
  if not handle then
    return false
  end
  local result = handle:read("*a")
  handle:close()
  return result:match("v%d+%.%d+%.%d+") ~= nil
end

-- Create the LSP client configuration
function M.create_client_config(config)
  local server_path = find_server_path(config)
  if not server_path then
    vim.notify(
      "react-compiler-marker: LSP server not found. Please install @react-compiler-marker/server or configure server.path",
      vim.log.levels.ERROR
    )
    return nil
  end

  if not check_node(config.server.node_path) then
    vim.notify(
      string.format("react-compiler-marker: Node.js not found at '%s'", config.server.node_path),
      vim.log.levels.ERROR
    )
    return nil
  end

  local cmd = { config.server.node_path, server_path }
  vim.list_extend(cmd, config.server.args)

  return {
    name = "react-compiler-marker",
    cmd = cmd,
    filetypes = config.filetypes,
    root_dir = vim.fn.getcwd(),
    init_options = {
      tooltipFormat = "markdown",
    },
    settings = require("react-compiler-marker.config").get_server_settings(),
    on_init = function(client, initialize_result)
      notify("React Compiler Marker LSP started", "info")
      if config.log_level ~= "off" then
        notify(
          string.format(
            "Server: %s %s",
            initialize_result.serverInfo.name or "Unknown",
            initialize_result.serverInfo.version or ""
          ),
          "info"
        )
      end
    end,
    on_attach = function(client, bufnr)
      -- Enable inlay hints if supported and configured
      if config.inlay_hints.enabled and client.server_capabilities.inlayHintProvider then
        if vim.fn.has("nvim-0.10") == 1 then
          -- Enable inlay hints for this buffer
          vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
        else
          vim.notify(
            "react-compiler-marker: Inlay hints require Neovim 0.10+",
            vim.log.levels.WARN
          )
        end
      end

      -- Set up buffer-local keymaps and options here if needed
      vim.bo[bufnr].omnifunc = "v:lua.vim.lsp.omnifunc"
    end,
    on_exit = function(code, signal, client_id)
      if config.log_level ~= "off" then
        vim.notify(
          string.format("React Compiler Marker LSP exited with code %d, signal %d", code, signal),
          vim.log.levels.INFO
        )
      end
    end,
    flags = {
      debounce_text_changes = 150,
    },
    -- CRITICAL: Disable hint caching to prevent stale position errors
    -- Force Neovim to always request fresh hints from server
    capabilities = vim.tbl_deep_extend(
      'force',
      vim.lsp.protocol.make_client_capabilities(),
      {
        textDocument = {
          inlayHint = {
            dynamicRegistration = true,
            resolveSupport = {
              properties = {}
            }
          }
        }
      }
    ),
  }
end

-- Start the LSP client
function M.start(config)
  if M.client_id then
    local client = vim.lsp.get_client_by_id(M.client_id)
    if client then
      vim.notify("react-compiler-marker: LSP client already running", vim.log.levels.INFO)
      return M.client_id
    end
    -- Client died, reset the ID
    M.client_id = nil
  end

  local client_config = M.create_client_config(config)
  if not client_config then
    return nil
  end

  M.client_id = vim.lsp.start_client(client_config)
  return M.client_id
end

-- Stop the LSP client
function M.stop()
  if M.client_id then
    vim.lsp.stop_client(M.client_id)
    M.client_id = nil
    notify("React Compiler Marker LSP stopped", "info")
  end
end

-- Restart the LSP client
function M.restart(config)
  M.stop()
  vim.defer_fn(function()
    M.start(config)
  end, 500)
end

-- Check if the client is running
function M.is_running()
  if not M.client_id then
    return false
  end
  local client = vim.lsp.get_client_by_id(M.client_id)
  return client ~= nil
end

-- Get the LSP client
function M.get_client()
  if M.client_id then
    return vim.lsp.get_client_by_id(M.client_id)
  end
  return nil
end

-- Execute a command on the LSP server
function M.execute_command(command, args, callback)
  if not M.is_running() then
    vim.notify("react-compiler-marker: LSP server not running", vim.log.levels.WARN)
    return
  end

  local client = M.get_client()
  if not client then
    return
  end

  local params = {
    command = command,
    arguments = args or {},
  }

  client.request("workspace/executeCommand", params, callback, 0)
end

-- Activate the extension
function M.activate(callback)
  M.is_activated = true
  M.execute_command("react-compiler-marker/activate", {}, function(err, result)
    if err then
      notify("Failed to activate: " .. vim.inspect(err), "error")
    else
      notify("React Compiler Marker activated", "info", "activate")
      -- Inlay hints will be automatically refreshed by the LSP server
    end
    if callback then
      callback(err, result)
    end
  end)
end

-- Deactivate the extension
function M.deactivate(callback)
  M.is_activated = false
  M.execute_command("react-compiler-marker/deactivate", {}, function(err, result)
    if err then
      notify("Failed to deactivate: " .. vim.inspect(err), "error")
    else
      notify("React Compiler Marker deactivated", "info", "activate")
      -- Inlay hints will be automatically cleared by the LSP server
    end
    if callback then
      callback(err, result)
    end
  end)
end

-- Check current file
function M.check_current_file(callback)
  M.execute_command("react-compiler-marker/checkOnce", {}, function(err, result)
    if err then
      notify("Failed to check file: " .. vim.inspect(err), "error")
    else
      notify("React Compiler Markers refreshed", "info", "check")
      -- Inlay hints will be automatically refreshed by the LSP server
    end
    if callback then
      callback(err, result)
    end
  end)
end

-- Preview compiled output
function M.preview_compiled(callback)
  local bufnr = vim.api.nvim_get_current_buf()
  local uri = vim.uri_from_bufnr(bufnr)

  M.execute_command("react-compiler-marker/getCompiledOutput", { uri }, function(err, result)
    if err or not result or not result.success then
      vim.notify(
        "Failed to compile: " .. (result and result.error or vim.inspect(err)),
        vim.log.levels.ERROR
      )
      if callback then
        callback(err, result)
      end
      return
    end

    -- Create a new buffer with the compiled output
    local new_buf = vim.api.nvim_create_buf(false, true)
    vim.api.nvim_buf_set_option(new_buf, "buftype", "nofile")
    vim.api.nvim_buf_set_option(new_buf, "bufhidden", "wipe")
    vim.api.nvim_buf_set_option(new_buf, "filetype", vim.bo[bufnr].filetype)
    vim.api.nvim_buf_set_name(new_buf, "React Compiler Output")

    -- Set the content
    local lines = vim.split(result.code, "\n")
    vim.api.nvim_buf_set_lines(new_buf, 0, -1, false, lines)
    vim.api.nvim_buf_set_option(new_buf, "modifiable", false)

    -- Open in a vertical split
    vim.cmd("vsplit")
    vim.api.nvim_win_set_buf(0, new_buf)

    if callback then
      callback(nil, result)
    end
  end)
end

-- Attach to buffer
function M.attach_to_buffer(bufnr, config)
  if not M.is_running() then
    if config.autostart then
      M.start(config)
    else
      return
    end
  end

  local client = M.get_client()
  if client then
    vim.lsp.buf_attach_client(bufnr, M.client_id)
  end
end

return M
