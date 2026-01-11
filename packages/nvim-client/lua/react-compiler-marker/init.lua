local M = {}

local config = require("react-compiler-marker.config")
local lsp = require("react-compiler-marker.lsp")
local commands = require("react-compiler-marker.commands")

-- Track if setup has been called
M._setup_done = false

-- Setup the plugin
function M.setup(user_config)
  -- Prevent double setup
  if M._setup_done then
    vim.notify("react-compiler-marker: setup() called multiple times", vim.log.levels.WARN)
    return
  end

  -- Merge user configuration with defaults
  local cfg = config.setup(user_config or {})

  -- Register user commands with keybindings
  commands.setup(cfg)

  -- Create autocommands for React file types
  local augroup = vim.api.nvim_create_augroup("ReactCompilerMarker", { clear = true })

  -- Auto-attach to React files
  local function try_attach(bufnr)
    if not cfg.enabled or not cfg.autostart then
      return
    end

    -- Check if this is a React file
    local bufname = vim.api.nvim_buf_get_name(bufnr)
    if not bufname or bufname == "" then
      return
    end

    local ft = vim.api.nvim_buf_get_option(bufnr, "filetype")
    if not vim.tbl_contains(cfg.filetypes, ft) then
      return
    end

    -- Check if already attached
    local clients = vim.lsp.get_clients({ bufnr = bufnr, name = "react-compiler-marker" })
    if #clients > 0 then
      return -- Already attached
    end

    -- Start the LSP client if not already running
    if not lsp.is_running() then
      lsp.start(cfg)
    end

    -- Attach to the current buffer
    vim.defer_fn(function()
      if vim.api.nvim_buf_is_valid(bufnr) then
        lsp.attach_to_buffer(bufnr, cfg)
      end
    end, 200)
  end

  vim.api.nvim_create_autocmd({ "FileType", "BufEnter", "BufWinEnter" }, {
    group = augroup,
    callback = function(args)
      try_attach(args.buf or vim.api.nvim_get_current_buf())
    end,
    desc = "Attach React Compiler Marker to React files",
  })

  -- Auto-refresh inlay hints on text changes
  vim.api.nvim_create_autocmd("LspAttach", {
    group = augroup,
    callback = function(args)
      local client = vim.lsp.get_client_by_id(args.data.client_id)
      if client and client.name == "react-compiler-marker" then
        local bufnr = args.buf

        -- Enable inlay hints when LSP attaches
        -- Wait longer to ensure buffer is fully ready
        vim.defer_fn(function()
          if vim.api.nvim_buf_is_valid(bufnr) then
            vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })

            -- Force a refresh after enabling to ensure correct positions
            vim.defer_fn(function()
              pcall(vim.lsp.inlay_hint.refresh)
            end, 200)
          end
        end, 300)

        -- Hide hints in insert mode if configured (prevents rendering issues)
        if cfg.inlay_hints.hide_in_insert_mode then
          local buf_augroup = vim.api.nvim_create_augroup("ReactCompilerMarker_buf_" .. bufnr, { clear = true })

          vim.api.nvim_create_autocmd("InsertEnter", {
            buffer = bufnr,
            group = buf_augroup,
            callback = function()
              vim.lsp.inlay_hint.enable(false, { bufnr = bufnr })
            end,
            desc = "Hide hints in insert mode"
          })

          vim.api.nvim_create_autocmd("InsertLeave", {
            buffer = bufnr,
            group = buf_augroup,
            callback = function()
              vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
            end,
            desc = "Re-enable hints after insert mode"
          })
        end

        -- Manual refresh keybinding (if configured)
        if cfg.keybindings.refresh then
          vim.keymap.set('n', cfg.keybindings.refresh, function()
            lsp.check_current_file()
          end, { buffer = bufnr, desc = 'React Compiler: Refresh hints' })
        end
      end
    end,
    desc = "Setup React Compiler Marker inlay hints and auto-refresh",
  })

  -- Cleanup on exit
  vim.api.nvim_create_autocmd("VimLeavePre", {
    group = augroup,
    callback = function()
      lsp.stop()
    end,
    desc = "Stop React Compiler Marker LSP on exit",
  })

  M._setup_done = true

  -- If there are React files already open, attach to them
  for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
    if vim.api.nvim_buf_is_loaded(bufnr) then
      local ft = vim.api.nvim_buf_get_option(bufnr, "filetype")
      if vim.tbl_contains(cfg.filetypes, ft) and cfg.enabled and cfg.autostart then
        if not lsp.is_running() then
          lsp.start(cfg)
        end
        vim.defer_fn(function()
          lsp.attach_to_buffer(bufnr, cfg)
        end, 200)
      end
    end
  end
end

-- Get the current configuration
function M.get_config()
  return config.get()
end

-- Update configuration at runtime
function M.update_config(updates)
  local new_config = config.update(updates)

  -- If server settings changed, notify the LSP server
  if lsp.is_running() then
    local client = lsp.get_client()
    if client then
      client.notify("workspace/didChangeConfiguration", {
        settings = config.get_server_settings(),
      })
    end
  end

  return new_config
end

-- Expose submodules
M.lsp = lsp
M.config = config
M.commands = commands

return M
