# Handbook Backend API

A Node.js Express API server for the Handbook Management System - enabling employees to share feedback, praise, and suggestions within their organization.

## 📋 Overview

This backend provides REST API endpoints for managing employee expressions (praise/feedback), user authentication, and organizational data. It connects to Oracle Database and uses JWT-based authentication through an external verification service.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Oracle Database access
- VPN connection to company network
- External authentication service access

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd handbook-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create environment variables for:
   ```bash
   NODE_ENV=dev
   DB_HOST=your_oracle_host
   DB_PORT=1521
   DB_SERVICE=your_service_name
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

4. **Start the server**
   ```bash
   # Development
   npm start

   # Production
   npm run prod
   ```

The server will start on the default port (usually 2525).

## 🏗️ Architecture

### Core Components

- **Express.js** - Web framework
- **Oracle Database** - Data persistence
- **JWT Authentication** - Token-based security
- **Winston** - Logging system
- **Multer** - File upload handling

### Project Structure

```
handbook-backend/
├── Controllers/           # Business logic
│   ├── expressionController.js  # Expression CRUD operations
│   └── authController.js        # Authentication logic
├── Models/               # Database models
│   ├── expression.js     # Expression data model
│   └── user.js          # User data model
├── middleware/          # Custom middleware
│   ├── auth.js         # JWT verification
│   └── error.js        # Error handling
├── routes/             # API routes
│   └── expressionRoute.js  # Expression endpoints
├── config/             # Configuration
│   ├── database.js     # Oracle DB connection
│   └── config.js       # App configuration
├── utils/              # Utilities
│   ├── helpers.js      # Common functions
│   └── logger.js       # Logging setup
└── server.js           # Application entry point
```

## 🔧 API Endpoints

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Expressions API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expressions` | Get all expressions |
| POST | `/api/expressions` | Create new expression |
| GET | `/api/expressions/:id` | Get specific expression |
| PUT | `/api/expressions/:id` | Update expression |
| DELETE | `/api/expressions/:id` | Delete expression |
| GET | `/api/expressions/received/:empId` | Get received expressions |
| GET | `/api/expressions/sent/:empId` | Get sent expressions |

### Request/Response Examples

**Create Expression:**
```bash
POST /api/expressions
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "praise",           # "praise" or "suggestion"
  "recipient": "EMP123",      # Employee ID
  "content": "Great work!",   # Expression content
  "privacy": "public",        # "public" or "private"
  "status": "published"       # "published" or "draft"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "EXP_ID": "EXP001",
    "EXP_TYPE": "G",
    "EXP_TO": "EMP123",
    "EXP_DETAIL": "Great work!",
    "EXP_KIND": "X",
    "STATUS": "T",
    "CREATED_AT": "2024-01-15T10:30:00Z"
  }
}
```

## 🗄️ Database Schema

### Expression Table (KPDBA.EXPRESSIONS)

| Column | Type | Description |
|--------|------|-------------|
| EXP_ID | VARCHAR2(50) | Primary key |
| EXP_TYPE | CHAR(1) | G=Give/Praise, B=By/Suggestion |
| EXP_TO | VARCHAR2(50) | Recipient employee ID |
| EXP_FROM | VARCHAR2(50) | Sender employee ID |
| EXP_SUBJECT | VARCHAR2(200) | Short description |
| EXP_DETAIL | CLOB | Full content |
| EXP_KIND | CHAR(1) | X=eXternal/Public, H=Hidden/Private |
| STATUS | CHAR(1) | T=True/Published, F=False/Draft |
| CR_OID | VARCHAR2(50) | Organization ID |
| CREATED_AT | TIMESTAMP | Creation timestamp |

## 🔐 Security

### Authentication Flow
1. Client sends JWT token from external auth service
2. Backend validates token with `https://api.nitisakc.dev/auth/verify`
3. User profile extracted from verification response
4. User data attached to request object (`req.user`)

### Authorization
- All expression endpoints require authentication
- Users can only access data from their organization
- Employee ID validation ensures data privacy

### Data Validation
- Input sanitization for all endpoints
- Required field validation
- Type checking for enums (praise/suggestion, public/private)

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Recipient and content are required"
  }
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## 📝 Logging

### Log Levels
- **Error**: Database errors, authentication failures
- **Warn**: Validation warnings, deprecated usage
- **Info**: API requests, successful operations
- **Debug**: Detailed execution flow

### Log Files
- `logs/error.log` - Error level and above
- `logs/combined.log` - All log levels
- Console output in development

## 🔧 Configuration

### Environment Variables
```bash
# Database
DB_HOST=oracle.company.com
DB_PORT=1521
DB_SERVICE=PROD
DB_USER=handbook_user
DB_PASSWORD=secure_password

# Application
NODE_ENV=production
PORT=2525
JWT_SECRET=your_jwt_secret

# External Services
AUTH_VERIFY_URL=https://api.nitisakc.dev/auth/verify
```

### Database Connection Pool
- Initial: 1 connection
- Maximum: 10 connections
- Idle timeout: 30 seconds
- Connection timeout: 60 seconds

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] VPN access verified
- [ ] External auth service accessible
- [ ] Log directory permissions set
- [ ] PM2 or similar process manager configured

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'handbook-backend',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 2525
    },
    instances: 2,
    max_memory_restart: '1G'
  }]
}
```

## 🧪 Testing

### Manual Testing
```bash
# Health check
curl http://localhost:2525/api/health

# Test authentication
curl -H "Authorization: Bearer <token>" \
     http://localhost:2525/api/expressions
```

### Database Testing
```sql
-- Verify expression creation
SELECT * FROM KPDBA.EXPRESSIONS 
WHERE EXP_FROM = 'your_emp_id' 
ORDER BY CREATED_AT DESC;
```

## 🔍 Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify VPN connection
- Check Oracle client installation
- Validate connection string
- Test database credentials

**Authentication Failures**
- Verify external auth service availability
- Check JWT token format
- Validate token expiration
- Test auth verification endpoint

**Performance Issues**
- Monitor database connection pool
- Check Oracle database performance
- Review log files for bottlenecks
- Verify network latency to database

### Debug Mode
```bash
# Enable detailed logging
DEBUG=handbook:* npm start

# Database query logging
DB_DEBUG=true npm start
```

## 🤝 Contributing

### Code Standards
- Use ESLint for code quality
- Follow RESTful API conventions
- Include error handling for all operations
- Add logging for important operations
- Validate all user inputs

### Development Workflow
1. Create feature branch
2. Implement changes with proper error handling
3. Test with real database connections
4. Update documentation if needed
5. Submit pull request

## 📞 Support

For technical support or questions:
- Check logs in `logs/` directory
- Review database connection status
- Verify external service availability
- Contact system administrator for VPN/database access

---

**Note**: This backend requires VPN access to company network and proper database credentials to function correctly.