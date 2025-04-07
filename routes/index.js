const express = require('express');
const projectRoute = require('./projectRoute.js'); // Import user routes

const router = express.Router(); // Create a new router instance

router.use('/api/project', projectRoute); // Use user routes for '/users' path


module.exports = router; // Export the router for use in other files