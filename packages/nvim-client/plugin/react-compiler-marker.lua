-- React Compiler Marker Neovim Plugin
-- This file is automatically loaded by Neovim when the plugin is installed

-- Prevent loading the plugin twice
if vim.g.loaded_react_compiler_marker then
  return
end
vim.g.loaded_react_compiler_marker = 1

-- Check minimum Neovim version
if vim.fn.has("nvim-0.9") == 0 then
  vim.notify(
    "react-compiler-marker requires Neovim 0.9+. Inlay hints require 0.10+",
    vim.log.levels.ERROR
  )
  return
end

-- The plugin doesn't auto-setup to allow users to configure it
-- Users must call require('react-compiler-marker').setup() in their config
