# ArchivArt - AR Media Platform

A comprehensive platform for creating and managing augmented reality media experiences. Users can scan images with a mobile app to unlock interactive video and audio content.

## Features

### Admin Panel (Web)
- **Authentication**: Secure login with role-based access control
- **User Management**: View, block/unblock users
- **Media Upload**: Upload images and video/audio files
- **Duplicate Detection**: Automatic image hash checking
- **Cloud Storage**: AWS S3 integration for scalable storage
- **Dashboard**: Real-time statistics and activity monitoring

### Mobile Application (Flutter)
- **Camera Scanner**: Default screen opens camera for image scanning
- **Authentication**: Email/password and social login (Google, Facebook)
- **Media Playback**: Stream video/audio content
- **API Integration**: RESTful API communication

### API Endpoints
- **Authentication**: `/api/auth/register`, `/api/auth/login`, `/api/auth/social-login`
- **Media Management**: `/api/admin/media`, `/api/admin/check-duplicate`
- **Image Scanning**: `/api/media/scan`

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Template Engine**: EJS
- **Styling**: Tailwind CSS, Font Awesome
- **File Upload**: Multer
- **Cloud Storage**: AWS S3
- **Authentication**: JWT, bcryptjs
- **Architecture**: MVC Pattern

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ArchivArt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=archivart

   # JWT Secret
   JWT_SECRET=your_jwt_secret_key_here

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=archivart-media

   # Session Secret
   SESSION_SECRET=your_session_secret_here

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Facebook OAuth
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Project Structure

```
src/
├── app.js                 # Main application file
├── config/               # Configuration files
│   ├── database.js       # MySQL connection
│   ├── aws.js           # AWS S3 configuration
│   └── multer.js        # File upload configuration
├── controllers/          # MVC Controllers
│   ├── authController.js # Authentication logic
│   ├── adminController.js # Admin panel logic
│   └── mediaController.js # Media management logic
├── middleware/           # Custom middleware
│   └── auth.js          # Authentication middleware
├── routes/              # Route definitions
│   ├── admin.js         # Admin panel routes
│   ├── api.js           # API routes
│   └── web.js           # Web routes
├── views/               # EJS templates
│   ├── layouts/         # Layout templates
│   ├── partials/        # Reusable components
│   ├── admin/           # Admin panel views
│   ├── index.ejs        # Home page
│   ├── api-docs.ejs     # API documentation
│   └── error.ejs        # Error page
└── public/              # Static assets
    └── css/             # Custom styles
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Social Login
```http
POST /api/auth/social-login
Content-Type: application/json

{
  "provider": "google",
  "providerId": "google_user_id",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Media Endpoints

#### Upload Media (Admin)
```http
POST /api/admin/media
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- image: (file) - Scanning image
- media: (file) - Video/audio file
- title: (string) - Media title
- description: (string) - Media description
```

#### Check Duplicate Image
```http
POST /api/admin/check-duplicate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- image: (file) - Image to check
```

#### Scan Image
```http
GET /api/media/scan?image_hash=abc123
Authorization: Bearer YOUR_JWT_TOKEN
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    auth_provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    provider_id VARCHAR(255),
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Media Table
```sql
CREATE TABLE media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_hash VARCHAR(255) UNIQUE NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    media_type ENUM('video', 'audio') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    uploaded_by INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
```

## Default Admin Account

After running the database schema, you can login with:
- **Email**: admin@archivart.com
- **Password**: admin123

## Mobile App Integration

The Flutter mobile app should integrate with the following endpoints:

1. **Authentication Flow**:
   - Register/login users
   - Store JWT tokens securely
   - Handle social authentication

2. **Image Scanning**:
   - Capture images with camera
   - Generate image hash
   - Send scan request to API
   - Play returned media content

3. **Media Playback**:
   - Stream video/audio from S3 URLs
   - Handle different media types
   - Implement offline caching if needed

## Deployment

### Environment Variables
Ensure all environment variables are properly set in production:

```bash
NODE_ENV=production
PORT=3000
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_NAME=archivart_production
JWT_SECRET=your_strong_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_production_bucket
```

### AWS S3 Setup
1. Create an S3 bucket
2. Configure CORS policy for web access
3. Set up IAM user with S3 permissions
4. Update environment variables

### Database Setup
1. Create production MySQL database
2. Run the schema.sql file
3. Update database connection settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
