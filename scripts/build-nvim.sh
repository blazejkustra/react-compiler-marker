#!/bin/bash

# Build script for Neovim plugin installation
# This script builds the LSP server and copies the necessary files to the root
# for lazy.nvim and other Neovim package managers to use

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "Installing dependencies..."
npm install

echo "Building LSP server for Neovim..."
BUILD_TARGET=nvim node esbuild.js --production

echo "Copying Neovim plugin files to root..."
cp -r packages/nvim-client/lua packages/nvim-client/plugin packages/nvim-client/server .

echo "Build complete!"
