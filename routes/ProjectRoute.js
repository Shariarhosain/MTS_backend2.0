
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');

const { createProject, getAllProjects, updateProject } = require('../controllers/project_Controlller'); // Import the functions from the controller


// Define route for creating a project
router.post('/create', asyncHandler(createProject)); // Use asyncHandler for error handling
// Define route for getting all projects with pagination
router.post('/', asyncHandler(getAllProjects)); // Use asyncHandler for error handling
// Define route for updating a project by ID
router.put('/:id', asyncHandler(updateProject)); // Use asyncHandler for error handling
// Define route for deleting a project by ID



module.exports = router; // Export the router for use in other files

