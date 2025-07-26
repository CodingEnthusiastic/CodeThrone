# 🚀 Complete Render Deployment Guide for Your Coding Platform

## 📋 **Project Structure Overview**
```
Building-Wonders---2/
├── backend/           # Node.js API server
├── src/              # React frontend source
├── public/           # Static assets
├── dist/             # Frontend build output (created by Vite)
├── package.json      # Frontend dependencies & build scripts
├── backend/package.json # Backend dependencies
└── .env              # Environment variables (DO NOT COMMIT)
```

## 🎯 **Deployment Strategy: Single Service (Recommended)**

Deploy as **one web service** that:
1. Builds the frontend (React/Vite)
2. Serves the frontend static files 
3. Runs the backend API
4. Handles Socket.IO for real-time features

---

## 🔧 **Step-by-Step Render Deployment**

### **1. Prepare Your Repository**

Make sure your code is pushed to GitHub/GitLab:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### **2. Create New Web Service on Render**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- **Name**: `coding-platform` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy Settings:**
- **Build Command**: 
  ```bash
  npm install && npm run build && cd backend && npm install
  ```
- **Start Command**: 
  ```bash
  cd backend && npm start
  ```

### **3. Environment Variables**

Add these in Render Dashboard → Environment:

```bash
# Core Settings
NODE_ENV=production
PORT=10000

# Database
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/codearena?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# AI Integration
GEMINI_API_KEY=AIzaSyAaZooWxlIEf6-_nI61YZyKDMHsn6lj4Nk

# Judge0 API Keys (Fallback System)
JUDGE0_API_KEY_1=6122def4d2mshe32cbcfded19d6dp158ca4jsn8310ab11ffd6
JUDGE0_API_KEY_2=ab2e9c3104msh1bbe6d326aef7f6p1ffa71jsn844d209e717a
JUDGE0_API_KEY_3=515b75cad0mshe6e5ecf2ab4eb03p1f0e3ejsn242d18a58e3e
JUDGE0_API_KEY_4=f7b6209c49msh4a25edf04f27133p1247edjsn15b5227e5164
JUDGE0_API_KEY_5=b7055c95acmsh34946e84e4e6f61p1448adjsn7ebce46cd253

# Google OAuth
GOOGLE_CLIENT_ID=561790631366-g69bn00ov5r3hvrb6v92r2mv804so4ir.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### **4. Advanced Settings**

- **Auto-Deploy**: Enable (deploys on git push)
- **Health Check Path**: `/api/health`
- **Disk Size**: 1GB (should be sufficient)

---

## 🔧 **Google OAuth Configuration**

After deployment, update your Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   ```
   https://your-app-name.onrender.com/api/auth/google/callback
   ```
5. Add authorized JavaScript origins:
   ```
   https://your-app-name.onrender.com
   ```

---

## 📊 **MongoDB Atlas Configuration**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to Network Access
3. Add IP Address: `0.0.0.0/0` (allows all IPs - for Render)
4. Or get Render's IP ranges and add them specifically

---

## 🚨 **Important Render Configuration**

### **Backend CORS Update**
Your backend is already configured to handle production CORS. Just update the allowed origins:

```javascript
// In backend/index.js (already updated)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-render-app.onrender.com'] // Update this URL
    : ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
};
```

### **Socket.IO Configuration**
Update your frontend Socket.IO connection (if needed):

```javascript
// In your React components
const socket = io(
  process.env.NODE_ENV === 'production' 
    ? 'https://your-render-app.onrender.com' 
    : 'http://localhost:5000'
);
```

---

## 🎯 **Deployment Process**

1. **First Deploy**: Takes 5-10 minutes
   - Installs frontend dependencies
   - Builds React app with Vite
   - Installs backend dependencies
   - Starts Node.js server

2. **Subsequent Deploys**: 2-5 minutes
   - Only rebuilds changed components
   - Uses Render's caching

---

## 🏥 **Health Check & Monitoring**

Your app includes a health check endpoint:
- **URL**: `https://your-app.onrender.com/api/health`
- **Response**: Database status, timestamp, etc.

Monitor in Render Dashboard:
- View real-time logs
- Check metrics (CPU, memory)
- Monitor response times

---

## 🐛 **Common Issues & Solutions**

### **1. Build Fails - Missing Dependencies**
```bash
# Make sure both package.json files have all dependencies
npm install
cd backend && npm install
```

### **2. Environment Variables Not Loading**
- Double-check variable names in Render Dashboard
- Restart the service after adding variables

### **3. Database Connection Issues**
- Verify MongoDB Atlas network access
- Check connection string format
- Ensure username/password are correct

### **4. API Routes Return 404**
- Check if API routes start with `/api/`
- Verify CORS configuration
- Check server logs in Render Dashboard

---

## 🎉 **Success Verification**

After deployment, test these endpoints:

1. **Frontend**: `https://your-app.onrender.com`
2. **Health Check**: `https://your-app.onrender.com/api/health`
3. **Judge0 Stats**: `https://your-app.onrender.com/api/problems/admin/judge0-stats`
4. **Socket.IO**: Test real-time gaming features

---

## 💰 **Render Pricing**

- **Starter Plan**: $7/month (perfect for your app)
- **Free Tier**: Available but may spin down (not recommended for production)

Your app with the Judge0 fallback system should handle 10,000+ daily submissions smoothly on the Starter plan!

---

## 🔄 **Continuous Deployment**

Once set up:
1. Push code to GitHub: `git push origin main`
2. Render automatically detects changes
3. Rebuilds and redeploys
4. Zero downtime deployments

Your coding platform will be live and scalable! 🚀
