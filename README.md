# Storage Management System

A comprehensive storage management system built with Node.js, Express, SQLite, and a web frontend for managing items, borrowing, and returns with automated email notifications.

## Features

### User Features
- **Register/Login**: JWT-based authentication system
- **Register Items**: Add new items to the storage system with categories, package codes, and sample counts
- **Borrow Items**: Filter and borrow available items (24-hour automatic timer)
- **Return Items**: Return borrowed items with sample validation and justification system
- **Email Notifications**: Automated reminders 2 hours before 24-hour deadline

### Admin Features  
- **Dashboard**: Overview statistics of borrowed, available, and overdue items
- **Monitor Borrowing**: View all borrowed items and borrower information
- **Approval System**: Review and approve/reject returns with missing samples
- **Overdue Tracking**: Monitor overdue items and users

### Technical Features
- **RESTful API**: Complete API with Swagger documentation
- **Database**: SQLite with Sequelize ORM
- **Email System**: Nodemailer with automated scheduling
- **Frontend**: Responsive web interface
- **Security**: JWT authentication, input validation, role-based access

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your email settings:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ADMIN_EMAIL=admin@company.com
   ```

3. **Start the Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - **Web Interface**: http://localhost:3000
   - **API Documentation**: http://localhost:3000/api-docs
   - **Health Check**: http://localhost:3000/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login  
- `GET /api/auth/profile` - Get user profile

### Items Management
- `POST /api/items` - Register new item
- `GET /api/items` - List items with filters
- `GET /api/items/:id` - Get item details
- `PUT /api/items/:id` - Update item
- `GET /api/items/categories` - Get available categories
- `GET /api/items/package-codes` - Get package codes

### Borrowing System
- `GET /api/borrow/available` - Get available items
- `POST /api/borrow/:itemId` - Borrow an item
- `GET /api/borrow/history` - User's borrow history
- `GET /api/borrow/current` - Currently borrowed items

### Return System
- `POST /api/return/:itemId` - Return an item
- `GET /api/return/returnable` - Get returnable items
- `GET /api/return/pending` - Get pending returns
- `PUT /api/return/justification/:borrowId` - Update justification

### Admin Operations
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/borrowed` - All borrowed items
- `GET /api/admin/pending-approvals` - Pending approvals
- `POST /api/admin/approve/:borrowId` - Approve/reject return
- `GET /api/admin/overdue` - Overdue items

## Database Schema

### Users
- Authentication and role management
- Supports User and Admin roles

### Items  
- Storage item information
- Category, package code, sample counts
- Availability status (MATERIAL_AT_ENG_ROOM)

### Borrow History
- Complete borrowing and return tracking
- 24-hour timer system
- Justification and approval workflow

## Email Notifications

The system automatically sends:
- **Reminder emails**: 2 hours before 24-hour deadline
- **Admin notifications**: When returns need approval
- **User notifications**: When returns are approved/rejected

## Frontend Interface

The web interface provides:
- **Login/Registration**: User authentication
- **Dashboard**: Personal overview and statistics  
- **Item Registration**: Add new items to inventory
- **Borrowing Interface**: Browse and borrow available items
- **Return Management**: Return items with sample validation
- **Admin Panel**: Complete administrative controls

## Development

### Project Structure
```
├── src/
│   └── app.js              # Express application setup
├── controllers/            # Route controllers
├── models/                # Database models  
├── routes/                # API routes
├── middleware/            # Authentication middleware
├── config/                # Database and email configuration
├── public/                # Frontend files
├── server.js              # Server entry point
└── package.json
```

### Database Migration
The system automatically creates and synchronizes the database on first run.

### Email Configuration
For Gmail, use App Passwords:
1. Enable 2-factor authentication
2. Generate App Password in Google Account settings
3. Use the App Password in EMAIL_PASS

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up proper email credentials
4. Use PM2 or similar for process management
5. Set up reverse proxy (nginx)
6. Enable HTTPS

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- CORS configuration
- SQL injection prevention with Sequelize

## License

This project is for internal use only.