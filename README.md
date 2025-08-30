# W-Store E-commerce Platform

A modern, full-stack e-commerce platform built with React, Node.js, and MySQL.

## 🚀 Features

- **User Management**: Registration, authentication, and profile management
- **Product Management**: CRUD operations for products with image uploads
- **Order Management**: Complete order lifecycle management
- **Admin Panel**: Comprehensive admin dashboard with analytics
- **Real-time Updates**: WebSocket integration for live updates
- **Multi-language Support**: Internationalization support
- **Responsive Design**: Mobile-first responsive UI
- **Security**: JWT authentication, rate limiting, and input validation

## 🏗️ Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Database**: MySQL
- **Authentication**: JWT tokens
- **File Uploads**: Multer with Sharp image processing
- **Real-time**: Socket.io for live updates

## 📁 Project Structure

```
W-Store/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── database.sql       # Database schema
└── DEPLOYMENT.md      # Deployment instructions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd W-Store
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your database credentials
   npm run migrate
   npm run seed
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp env.example .env
   # Edit .env with your backend URL
   npm run dev
   ```

4. **Database Setup**
   - Create a MySQL database
   - Import `database.sql`
   - Update backend `.env` with database credentials

## 🌐 Deployment

### Frontend (Vercel)
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend (Render)
- Environment: Node
- Build Command: `npm install`
- Start Command: `npm start`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=w_store
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=http://localhost:5000
```

## 📊 API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/products` - Get products
- `POST /api/products` - Create product (admin)
- `GET /api/orders` - Get orders
- `POST /api/orders` - Create order
- `GET /health` - Health check

## 🛠️ Available Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔒 Security Features

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- Password hashing with bcrypt

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS for styling
- Responsive navigation
- Touch-friendly interfaces

## 🌍 Internationalization

- Multi-language support
- RTL language support
- Localized date formats
- Currency formatting

## 📈 Performance

- Image optimization with Sharp
- Compression middleware
- Efficient database queries
- Lazy loading components

## 🧪 Testing

The project is configured for testing but test files have been removed for production deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
2. Review the logs in your deployment platform
3. Check environment variables configuration
4. Verify database connectivity

## 🔄 Updates

- Keep dependencies updated
- Monitor security advisories
- Regular database backups
- Monitor application performance
