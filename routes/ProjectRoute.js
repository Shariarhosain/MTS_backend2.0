
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middlewares/asyncHandler');

const { createProject, getAllProjects, updateProject } = require('../controllers/project_Controlller'); // Import the functions from the controller


module.exports = (io) => {
    // Define route for creating a project
    router.post('/create', (req, res) => createProject(req, res, io)); // Use asyncHandler for error handling
    // Define route for getting all projects with pagination
    router.post('/', asyncHandler(getAllProjects)); // Use asyncHandler for error handling
    // Define route for updating a project by ID
    router.put('/:id', (req, res) => updateProject(req, res, io)); // Use asyncHandler for error handling
    // Define route for deleting a project by ID

return router; // Export the router for use in other files
}
