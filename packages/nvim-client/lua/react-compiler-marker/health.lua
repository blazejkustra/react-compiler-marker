local M = {}

local health = vim.health or require("health")
local start = health.start or health.report_start
local ok = health.ok or health.report_ok
local warn = health.warn or health.report_warn
local error = health.error or health.report_error
local info = health.info or health.report_info

-- Check Neovim version
local function check_neovim_version()
  start("Neovim Version")

  local version = vim.version()
  local version_str = string.format("%d.%d.%d", version.major, version.minor, version.patch)
  info(string.format("Neovim version: %s", version_str))

  if vim.fn.has("nvim-0.10") == 1 then
    ok("Neovim 0.10+ detected (inlay hints supported)")
  else
    warn("Neovim version < 0.10 detected. Inlay hints require Neovim 0.10+")
  end
end

-- Check Node.js installation
local function check_node()
  start("Node.js")

  local config = require("react-compiler-marker.config").get()
  local node_path = config.server.node_path

  -- Check if Node.js is available
  local handle = io.popen(node_path .. " --version 2>&1")
  if not handle then
    error(string.format("Node.js not found at '%s'", node_path))
    return
  end

  local result = handle:read("*a")
  handle:close()

  local version = result:match("v(%d+%.%d+%.%d+)")
  if version then
    ok(string.format("Node.js found: %s", version))
  else
    error(string.format("Node.js not found at '%s'", node_path))
    info("Install Node.js from https://nodejs.org/")
  end
end

-- Check LSP server
local function check_lsp_server()
  start("LSP Server")

  local config = require("react-compiler-marker.config").get()

  -- Try to find the server
  local server_path = nil

  -- 1. User-provided path
  if config.server.path then
    if vim.fn.filereadable(config.server.path) == 1 then
      server_path = config.server.path
      ok(string.format("Server found (configured): %s", server_path))
      return
    else
      warn(string.format("Configured server path not found: %s", config.server.path))
    end
  end

  -- 2. Bundled server
  local plugin_path = vim.fn.fnamemodify(debug.getinfo(1).source:sub(2), ":h:h:h")
  local bundled_server = plugin_path .. "/server/server.bundle.js"
  if vim.fn.filereadable(bundled_server) == 1 then
    server_path = bundled_server
    ok(string.format("Server found (bundled): %s", server_path))
    return
  end

  -- 3. Workspace node_modules
  local workspace_root = vim.fn.getcwd()
  local workspace_server = workspace_root .. "/node_modules/@react-compiler-marker/server/out/server.js"
  if vim.fn.filereadable(workspace_server) == 1 then
    server_path = workspace_server
    ok(string.format("Server found (workspace): %s", server_path))
    return
  end

  -- 4. Development paths
  local dev_paths = {
    workspace_root .. "/packages/server/out/server.js",
    workspace_root .. "/../server/out/server.js",
  }
  for _, path in ipairs(dev_paths) do
    if vim.fn.filereadable(path) == 1 then
      server_path = path
      ok(string.format("Server found (development): %s", server_path))
      return
    end
  end

  -- 5. Global installation
  local global_server = vim.fn.exepath("react-compiler-marker-lsp")
  if global_server ~= "" then
    server_path = global_server
    ok(string.format("Server found (global): %s", server_path))
    return
  end

  error("LSP server not found")
  info("Install with: npm install @react-compiler-marker/server")
  info("Or configure server.path in your setup()")
end

-- Check babel-plugin-react-compiler
local function check_babel_plugin()
  start("React Compiler Plugin")

  local config = require("react-compiler-marker.config").get()
  local workspace_root = vim.fn.getcwd()
  local plugin_path = workspace_root .. "/" .. config.babel_plugin_path

  if vim.fn.isdirectory(plugin_path) == 1 then
    ok(string.format("babel-plugin-react-compiler found: %s", plugin_path))
  else
    warn(string.format("babel-plugin-react-compiler not found at: %s", plugin_path))
    info("Install with: npm install babel-plugin-react-compiler")
    info("Or configure babel_plugin_path in your setup()")
  end
end

-- Check LSP client status
local function check_lsp_status()
  start("LSP Client Status")

  local lsp = require("react-compiler-marker.lsp")

  if lsp.is_running() then
    local client = lsp.get_client()
    ok(string.format("LSP client running (ID: %d)", client.id))
    info(string.format("Root directory: %s", client.config.root_dir or "N/A"))
    info(string.format("Activated: %s", lsp.is_activated and "Yes" or "No"))
  else
    info("LSP client not running")
    info("LSP will start automatically when opening React files")
  end
end

-- Check configuration
local function check_configuration()
  start("Configuration")

  local config = require("react-compiler-marker.config").get()

  info(string.format("Success emoji: %s", config.emojis.success))
  info(string.format("Error emoji: %s", config.emojis.error))
  info(string.format("Inlay hints enabled: %s", config.inlay_hints.enabled and "Yes" or "No"))
  info(string.format("Autostart: %s", config.autostart and "Yes" or "No"))
  info(string.format("Filetypes: %s", table.concat(config.filetypes, ", ")))
  info(string.format("Log level: %s", config.log_level))
end

-- Main health check function
function M.check()
  check_neovim_version()
  check_node()
  check_lsp_server()
  check_babel_plugin()
  check_lsp_status()
  check_configuration()
end

return M
