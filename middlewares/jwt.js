const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_secret_key';  // Store securely in .env
global.user = null;
const verifyToken = (req, res, next) => {
//Bearer token from header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];  // Extract token from Bearer scheme
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    console.log('Token received:', token);



    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;  // Attach user data to the request object
        global.user = decoded

        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired, please login again.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = verifyToken;  // Export the middleware for use in routes