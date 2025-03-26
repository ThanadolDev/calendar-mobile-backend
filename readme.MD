diecut-management-api/
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── package.json            # Project dependencies and scripts
├── app.js                  # Main application file
├── server.js               # Server startup file
├── config/
│   ├── database.js         # Database configuration
│   └── config.js           # Application configuration
├── models/
│   ├── index.js            # Export all models
│   ├── diecut.js           # Diecut model
│   ├── user.js             # User model
│   └── tooling.js          # Tooling model
├── controllers/
│   ├── index.js            # Export all controllers
│   ├── diecutController.js # Diecut controller
│   ├── authController.js   # Authentication controller
│   └── toolingController.js# Tooling controller
├── routes/
│   ├── index.js            # Main router
│   ├── diecutRoutes.js     # Diecut routes
│   ├── authRoutes.js       # Authentication routes
│   └── toolingRoutes.js    # Tooling routes
├── middleware/
│   ├── auth.js             # Authentication middleware
│   └── error.js            # Error handling middleware
├── utils/
│   ├── logger.js           # Logging utility
│   └── helpers.js          # Helper functions
└── tests/                  # Test files
    ├── unit/
    └── integration/


    # Diecut Management API

This project is an Express.js API with MVC architecture for managing diecuts and tooling. It's a conversion of a C# desktop application to a modern web API.

## Features

- User authentication with JWT
- Diecut management (create, read, update, delete)
- Tooling management
- Serial number generation for diecuts
- Image upload capability
- Error handling
- Logging
- Oracle Database integration

## Project Structure

```
diecut-management-api/
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── package.json            # Project dependencies and scripts
├── app.js                  # Main application file
├── server.js               # Server startup file
├── config/                 # Configuration files
├── models/                 # Database models
├── controllers/            # Request handlers
├── routes/                 # API routes
├── middleware/             # Custom middleware
├── utils/                  # Utility functions
└── tests/                  # Test files
```

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database
- Oracle Instant Client

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/diecut-management-api
   ```

2. Install dependencies:
   ```
   cd diecut-management-api
   npm install
   ```

3. Set up Oracle Instant Client:
   - Download and install Oracle Instant Client: https://www.oracle.com/database/technologies/instant-client/downloads.html
   - Set environment variables according to your OS:
     - Windows: Add Oracle Instant Client to PATH
     - macOS/Linux: Set LD_LIBRARY_PATH or DYLD_LIBRARY_PATH

4. Create .env file:
   ```
   cp .env.example .env
   ```
   Edit the .env file with your database credentials and other settings.

5. Start the server:
   ```
   npm start
   ```
   
   For development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- POST /api/auth/login - Log in and get JWT token
- GET /api/auth/me - Get current user profile
- GET /api/auth/version - Get application version

### Diecuts
- GET /api/diecuts - Get all diecuts
- GET /api/diecuts/:id - Get diecut by ID
- POST /api/diecuts - Create a new diecut
- PUT /api/diecuts/:id - Update a diecut
- DELETE /api/diecuts/:id - Delete a diecut
- POST /api/diecuts/:id/serial - Generate a serial number for a diecut

### Toolings
- GET /api/toolings - Get all toolings
- GET /api/toolings/:id - Get tooling by ID
- POST /api/toolings - Create a new tooling
- PUT /api/toolings/:id - Update a tooling
- DELETE /api/toolings/:id - Delete a tooling
- GET /api/toolings/materials/:prodId/:revision - Get materials by product ID and revision

## Database Models

### Users
- User authentication and management

### Diecuts
- Diecut management
- Serial number generation and tracking

### Toolings
- Tooling management
- Material management

## Development

### Running Tests
```
npm test
```

### Code Style
The project follows JavaScript Standard Style. You can run the linter with:
```
npm run lint
```

## Production Deployment

1. Set NODE_ENV to production:
   ```
   NODE_ENV=production
   ```

2. Ensure all production environment variables are correctly set in your deployment environment

3. Start the server:
   ```
   npm start
   ```

## License

[ISC](https://opensource.org/licenses/ISC)