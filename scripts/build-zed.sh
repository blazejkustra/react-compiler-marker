#!/bin/bash

# Build script for Zed extension
# This script builds the LSP server bundle and compiles the WASM extension

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "Installing dependencies..."
npm install

echo "Building LSP server for Zed..."
BUILD_TARGET=zed node esbuild.js --production

echo "Building Zed extension WASM..."
cd packages/zed-client && cargo build --target wasm32-wasip1 --release

echo "Build complete!"
