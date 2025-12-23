#!/usr/bin/env node

/**
 * React Compiler Marker Language Server
 *
 * This server can be used with any LSP-compatible editor:
 *
 * Usage:
 *   react-compiler-marker-lsp --stdio
 *
 * Examples for different editors:
 *
 * WebStorm/IntelliJ:
 *   1. Go to Settings > Languages & Frameworks > Language Server Protocol
 *   2. Add a new server definition
 *   3. Set the command to: npx react-compiler-marker-lsp --stdio
 *   4. Set file patterns to: *.js, *.jsx, *.ts, *.tsx
 *
 * Neovim (with nvim-lspconfig):
 *   require('lspconfig').configs.react_compiler_marker = {
 *     default_config = {
 *       cmd = { 'npx', 'react-compiler-marker-lsp', '--stdio' },
 *       filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
 *       root_dir = require('lspconfig').util.root_pattern('package.json'),
 *     },
 *   }
 *   require('lspconfig').react_compiler_marker.setup({})
 *
 * Sublime Text (with LSP package):
 *   Add to LSP settings:
 *   {
 *     "clients": {
 *       "react-compiler-marker": {
 *         "command": ["npx", "react-compiler-marker-lsp", "--stdio"],
 *         "selector": "source.js, source.jsx, source.ts, source.tsx"
 *       }
 *     }
 *   }
 */

require('../out/server.js');
