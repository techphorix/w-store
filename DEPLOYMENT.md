# W-Store Deployment Guide

This guide will help you deploy your W-Store application on Vercel (Frontend) and Render (Backend).

## Prerequisites

- GitHub repository with your code
- Vercel account
- Render account
- MySQL database (you can use PlanetScale, Railway, or any MySQL provider)

## Frontend Deployment on Vercel

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as the root directory

### 2. Configure Build Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Environment Variables
Add these environment variables in Vercel:
```
VITE_API_URL=https://your-backend-url.onrender.com
VITE_WS_URL=https://your-backend-url.onrender.com
VITE_APP_NAME=W-Store
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_REAL_TIME=true
```

### 4. Deploy
Click "Deploy" and wait for the build to complete.

## Backend Deployment on Render

### 1. Connect to Render
1. Go to [render.com](https://render.com) and sign in
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the `backend` folder as the root directory

### 2. Configure Service
- **Name**: `w-store-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3. Environment Variables
Add these environment variables in Render:

#### Database Configuration
```
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=w_store
DB_PORT=3306
```

#### JWT Configuration
```
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
```

#### Server Configuration
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-url.vercel.app
```

#### Email Configuration
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### Other Configuration
```
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### 4. Deploy
Click "Create Web Service" and wait for the deployment to complete.

## Database Setup

### Option 1: PlanetScale (Recommended)
1. Go to [planetscale.com](https://planetscale.com)
2. Create a new database
3. Use the connection details in your environment variables
4. Run the migration script: `npm run migrate`

### Option 2: Railway
1. Go to [railway.app](https://railway.app)
2. Create a new MySQL database
3. Use the connection details in your environment variables
4. Run the migration script: `npm run migrate`

### Option 3: Any MySQL Provider
1. Set up a MySQL database with your provider
2. Update the environment variables
3. Run the migration script: `npm run migrate`

## Post-Deployment Steps

### 1. Update Frontend API URL
After backend deployment, update the `VITE_API_URL` in Vercel to point to your Render backend URL.

### 2. Test the Application
1. Test the health check endpoint: `https://your-backend-url.onrender.com/health`
2. Test the frontend: `https://your-frontend-url.vercel.app`
3. Test user registration and login
4. Test product creation and management

### 3. Monitor Logs
- **Render**: Check the logs tab in your web service
- **Vercel**: Check the functions tab for any errors

## Troubleshooting

### Common Issues

#### Backend Won't Start
- Check environment variables are set correctly
- Verify database connection
- Check the logs in Render

#### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

#### Database Connection Issues
- Verify database credentials
- Check if database is accessible from Render
- Ensure database exists and migrations are run

### Useful Commands
```bash
# Check backend logs
npm run dev

# Run database migration
npm run migrate

# Seed database
npm run seed
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret
2. **Database**: Use strong passwords and restrict access
3. **CORS**: Only allow your frontend domain
4. **Rate Limiting**: Already configured in the backend
5. **Environment Variables**: Never commit `.env` files

## Cost Optimization

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Render**: Free tier includes 750 hours/month
- **Database**: Choose a plan that fits your needs

## Support

If you encounter issues:
1. Check the logs in both platforms
2. Verify environment variables
3. Test locally first
4. Check the documentation for both platforms
