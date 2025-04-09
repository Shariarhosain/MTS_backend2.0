const express = require('express');
const teamMemberRoute = require('./team_memberRoute'); // Import team member routes
const projectRoute = require('./ProjectRoute'); // Import test routes




const router = express.Router(); // Create a new router instance

// Register the routes for project and team members
router.use('/api/teamMember', teamMemberRoute); // Use team member routes
router.use('/api/project', projectRoute); // Use test routes


module.exports = router; // Export the router for use in other files
