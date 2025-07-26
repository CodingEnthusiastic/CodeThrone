#!/bin/bash

# Render.com start script
echo "🚀 Starting application..."

# Navigate to backend and start the server
cd backend
echo "📍 Current directory: $(pwd)"
echo "📝 Starting Node.js server..."
npm start
