const express = require('express');
const userRoutes = require('./userRoutes.js'); // Import user routes

const router = express.Router(); // Create a new router instance

router.use('/api/users', userRoutes); // Use user routes for '/users' path


module.exports = router; // Export the router for use in other files