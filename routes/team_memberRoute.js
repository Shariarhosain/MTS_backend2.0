const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const asyncHandler = require('../middlewares/asyncHandler');

// Import the functions from the controller
const {
  createTeamMember,
  getAllTeamMembers,
  updateTeamMember,
  deactivateTeamMember,
} = require('../controllers/Team_memberController');

// Define route for creating a team member
router.post('/create', uploadMiddleware, createTeamMember);

// Define route for getting all team members
router.post('/', asyncHandler(getAllTeamMembers)); // Make sure this is a POST for pagination

// Define route for updating a team member by ID
router.put('/:id', asyncHandler(updateTeamMember));

// Define route for deleting a team member by ID
router.delete('/:id', asyncHandler(deactivateTeamMember));

module.exports = router; // Export the router for use in other files
