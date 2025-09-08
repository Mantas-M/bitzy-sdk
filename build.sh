#!/bin/bash

echo "🚀 Building Bitzy Swap V3 SDK..."

# Clean previous build
echo "🧹 Cleaning previous build..."
npm run clean

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the SDK
echo "🔨 Building SDK..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Output files:"
    ls -la dist/
    
    # Show package size
    echo "📊 Package size:"
    du -sh dist/
    
    echo "🎉 SDK is ready for use!"
else
    echo "❌ Build failed!"
    exit 1
fi
