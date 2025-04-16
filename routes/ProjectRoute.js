const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
//const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware
const { createProject, getAllProjects, updateProject,getClientSuggestionsFromProjects} = require('../controllers/projectController'); // Import the controller functions


module.exports = (getIO) => {
    const router = express.Router();
    // Create project route, using getIO() to get the socket instance
    router.post('/create', (req, res) => createProject(req, res, getIO()));

    // Get all projects route, wrapped with asyncHandler to catch errors
    
    router.post('/', asyncHandler(async (req, res) => {
        await getAllProjects(req, res); // Ensure this is asynchronous
    }));

    router.get('/clientSuggestions', getClientSuggestionsFromProjects);


    // Update project route, using getIO() for socket functionality
    router.put('/:id', (req, res) => updateProject(req, res, getIO()));


    return router;
};
