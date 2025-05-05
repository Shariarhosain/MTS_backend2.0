const jwt = require('jsonwebtoken');

// JWT Secret (Keep this in a .env file for security)
const JWT_SECRET = 'your_secret_key';  // Store this securely, preferably in a .env file

// Middleware to generate and attach the JWT token
const generateToken = (user) => {
    return jwt.sign(
        { uid: user },  // Payload
        JWT_SECRET,  // Secret key
        { expiresIn: '12h' }  // Token expiration time
    );
};

module.exports = generateToken;
