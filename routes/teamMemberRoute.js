const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');
const uploadMulterMiddleware = require('../config/multer'); // Import the multer middleware for file uploads

const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware

// Import the functions from the controller
const { createTeamMember, getAllTeamMembers, updateTeamMember, deactivateTeamMember, getTeamMemberById,login} = require('../controllers/TeamMemberController');

// Define route for creating a team member
router.post('/create', uploadMulterMiddleware, createTeamMember);

// Define route for getting all team members
router.post('/', verifyToken, getAllTeamMembers);  // Make sure this is a POST for pagination
router.get('/:id', verifyToken, asyncHandler(getTeamMemberById));
// Define route for updating a team member by ID
router.put('/:id', verifyToken,asyncHandler(updateTeamMember));

// Define route for deleting a team member by ID
router.delete('/:id', verifyToken, asyncHandler(deactivateTeamMember));

// Define route for login
router.post('/login', asyncHandler(login)); // Use asyncHandler to wrap the login function




module.exports = router; // Export the router for use in other files
