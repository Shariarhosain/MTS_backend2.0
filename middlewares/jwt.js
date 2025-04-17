const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_secret_key';  // Store securely in .env

const verifyToken = (req, res, next) => {
    console.log("Cookies:", req.cookies.auth_token);  // Log cookies to ensure they are set
    const token = req.cookies.auth_token;  // Token is stored in cookies

    if (!token) {
        return res.status(403).json({ message: 'No token provided, authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;  // Attach user data to the request object
        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired, please login again.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = verifyToken;  // Export the middleware for use in routes