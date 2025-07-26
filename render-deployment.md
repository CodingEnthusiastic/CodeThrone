# Render Deployment Configuration

## Frontend Build Commands
npm install
npm run build

## Backend Start Command
cd backend && npm install && npm start

## Environment Variables to Set in Render:
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key

# Judge0 API Keys
JUDGE0_API_KEY_1=your_first_key
JUDGE0_API_KEY_2=your_second_key
JUDGE0_API_KEY_3=your_third_key
JUDGE0_API_KEY_4=your_fourth_key
JUDGE0_API_KEY_5=your_pro_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

## Important Render Settings:
- Build Command: npm install && npm run build
- Start Command: cd backend && npm install && npm start
- Publish Directory: dist (for frontend)
- Node Version: 18 or higher
