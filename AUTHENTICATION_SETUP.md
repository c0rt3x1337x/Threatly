# Authentication System Setup

This document describes the authentication system implemented for the Threatly application.

## Features Implemented

### Backend Authentication
- ✅ User registration with email + password (bcrypt hashing)
- ✅ Login with JWT tokens (stored in HttpOnly cookies)
- ✅ Middleware to validate JWT and inject current user
- ✅ Middleware for role and plan checks
- ✅ User approval workflow (pending → approved)
- ✅ Admin user management (approve/reject users, update plans)
- ✅ MongoDB indexes for email (unique) and user fields
- ✅ Admin user seeding on startup

### Frontend Authentication
- ✅ Login and registration pages
- ✅ "Pending approval" message for unapproved users
- ✅ Conditional rendering based on user roles and plans:
  - Articles: all users
  - Rules + Alerts: only premium users
  - User Management: only admin users
- ✅ User info display in sidebar
- ✅ Logout functionality

### Security Features
- ✅ Password hashing with bcrypt (salt rounds: 12)
- ✅ JWT with expiration (1 hour default)
- ✅ HttpOnly cookies for token storage
- ✅ CORS configuration with credentials
- ✅ Input validation and error handling

## User Roles and Plans

### Roles
- **user**: Regular user with basic access
- **admin**: Full access including user management

### Plans
- **simple**: Can log in and see all articles
- **premium**: Can also create rules and access Alerts tab

### User Status
- **pending**: New registrations (default)
- **approved**: Can log in and access the application
- **rejected**: Cannot log in

## Setup Instructions

### Backend Setup

1. Install new dependencies:
```bash
cd threat-intelligence-backend
npm install bcryptjs jsonwebtoken cookie-parser
```

2. Create environment file:
```bash
cp env.example .env
```

3. Update `.env` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/threatly
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
ADMIN_EMAIL=admin@threatly.com
ADMIN_PASSWORD=admin123
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Start the backend server:
```bash
npm start
```

The admin user will be automatically created on first startup if it doesn't exist.

### Frontend Setup

1. Install new dependencies:
```bash
npm install axios
```

2. Create environment file:
```bash
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
```

3. Start the frontend:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### User Management (Admin only)
- `GET /api/auth/users` - Get all users
- `PATCH /api/auth/users/:userId/status` - Approve/reject user
- `PATCH /api/auth/users/:userId/plan` - Update user plan
- `DELETE /api/auth/users/:userId` - Delete user

## Usage Flow

1. **Registration**: New users register and are set to "pending" status
2. **Admin Approval**: Admin logs in and approves users from the User Management page
3. **User Access**: Approved users can log in and access features based on their plan
4. **Plan Management**: Admin can upgrade users to premium plan

## Security Considerations

- Passwords are hashed with bcrypt (12 salt rounds)
- JWT tokens expire after 1 hour
- Tokens are stored in HttpOnly cookies (not localStorage)
- CORS is configured to only allow requests from the frontend URL
- All protected routes require authentication
- Premium features require premium plan
- Admin features require admin role

## Testing the System

1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000`
3. You'll be redirected to the login page
4. Register a new account (it will be pending)
5. Login with the admin account (from .env)
6. Go to User Management to approve the new user
7. Login with the approved user account
8. Test different features based on user plan

## File Structure

### Backend
```
threat-intelligence-backend/
├── models/
│   └── User.js                 # User model with roles, plans, status
├── middleware/
│   └── auth.js                 # JWT validation and role/plan middleware
├── routes/
│   └── auth.js                 # Authentication routes
├── utils/
│   └── seedAdmin.js            # Admin user seeding
└── server.js                   # Updated with auth middleware
```

### Frontend
```
src/
├── context/
│   └── AuthContext.tsx         # Authentication context
├── components/
│   ├── ProtectedRoute.tsx      # Route protection component
│   └── Sidebar.tsx             # Updated with user info and conditional rendering
├── pages/
│   ├── LoginPage.tsx           # Login page
│   ├── RegisterPage.tsx        # Registration page
│   └── UserManagementPage.tsx  # Admin user management
├── types/
│   └── User.ts                 # User type definitions
└── App.tsx                     # Updated with auth provider and protected routes
```

## Next Steps

The authentication system is now fully implemented and ready for use. You can:

1. Test the registration and login flow
2. Approve users through the admin interface
3. Test plan-based access control
4. Customize the UI further if needed
5. Add additional security features as required
