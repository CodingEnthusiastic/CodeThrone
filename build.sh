#!/bin/bash

# Render.com deployment script for full-stack application
echo "🚀 Starting Render deployment..."

# Install root dependencies (frontend)
echo "📦 Installing frontend dependencies..."
npm install

# Build the frontend
echo "🏗️ Building frontend with Vite..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "✅ Deployment preparation complete!"
echo "🎯 Frontend built to: dist/"
echo "🎯 Backend ready in: backend/"
