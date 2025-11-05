#!/bin/bash

# Clear Vite Cache Script
# Run this script whenever you encounter Vite dependency optimization issues

echo "🧹 Clearing Vite cache..."

# Navigate to project root
cd "$(dirname "$0")"

# Remove Vite cache
rm -rf node_modules/.vite
echo "✅ Removed node_modules/.vite"

# Remove dist folder
rm -rf dist
echo "✅ Removed dist folder"

# Optional: Clear browser cache recommendation
echo ""
echo "📝 Additional steps:"
echo "1. Restart your Vite dev server (npm run dev or yarn dev)"
echo "2. Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)"
echo "3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)"
echo ""
echo "✨ Cache cleared successfully!"
