#!/bin/bash

# Quick Start Script for React Compiler Marker WebStorm Plugin
# This script helps you get started with development

set -e

echo "🚀 React Compiler Marker - WebStorm Plugin Quick Start"
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install JDK 17 or later."
    echo "   Download from: https://adoptium.net/"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "❌ Java 17 or later is required. You have Java $JAVA_VERSION"
    exit 1
fi

echo "✅ Java $JAVA_VERSION found"

# Check if Node.js is installed (needed for LSP server)
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Initialize Gradle wrapper if not present
if [ ! -f "gradlew" ]; then
    echo ""
    echo "📦 Initializing Gradle wrapper..."
    
    if command -v gradle &> /dev/null; then
        gradle wrapper --gradle-version 8.5
        chmod +x gradlew
        echo "✅ Gradle wrapper initialized"
    else
        echo "❌ Gradle is not installed globally and wrapper doesn't exist."
        echo "   Please install Gradle: https://gradle.org/install/"
        exit 1
    fi
else
    echo "✅ Gradle wrapper found"
fi

# Ensure LSP server is built
echo ""
echo "🔨 Checking LSP server..."
cd ../..

if [ ! -f "dist/server.js" ]; then
    echo "⚠️  LSP server not found. Building..."
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    echo "🔨 Building server..."
    npm run compile
    echo "✅ LSP server built"
else
    echo "✅ LSP server found"
fi

cd packages/intellij-client

# Build the plugin
echo ""
echo "🔨 Building plugin..."
./gradlew buildPlugin

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Plugin built successfully!"
    echo ""
    echo "📍 Plugin location: build/distributions/react-compiler-marker-*.zip"
    echo ""
    echo "🎯 Next steps:"
    echo ""
    echo "1. Test in development IDE:"
    echo "   ./gradlew runIde"
    echo ""
    echo "2. Install manually:"
    echo "   - Open WebStorm/IntelliJ IDEA"
    echo "   - Settings → Plugins → ⚙️ → Install Plugin from Disk..."
    echo "   - Select: build/distributions/react-compiler-marker-*.zip"
    echo ""
    echo "3. Read the docs:"
    echo "   - README.md (user documentation)"
    echo "   - IMPLEMENTATION_SUMMARY.md (technical details)"
    echo ""
    echo "Happy coding! ✨"
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi

