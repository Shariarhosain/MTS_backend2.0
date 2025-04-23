const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
//const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware
const { createProject, getAllProjects, updateProject,getClientSuggestionsFromProjects,new_revision,projectDistribution,getProjectsByClientName} = require('../controllers/projectController'); // Import the controller functions


module.exports = (getIO) => {
    const router = express.Router();
    // Create project route, using getIO() to get the socket instance
    router.post('/create', (req, res) => createProject(req, res, getIO()));

    // Get all projects route, wrapped with asyncHandler to catch errors
    
    
    router.get('/', asyncHandler(async (req, res) => {
        await getAllProjects(req, res); // Ensure this is asynchronous
    }));

    router.get('/clientSuggestions', getClientSuggestionsFromProjects);


    // Update project route, using getIO() for socket functionality
    router.put('/:id', (req, res) => updateProject(req, res, getIO()));
    
    router.put('/updateRevision/:id', new_revision);

    // Get project distribution for the current month, using getIO() for socket functionality
    router.get('/monthWise', projectDistribution);
    router.get('/byClient', getProjectsByClientName);

    return router;
};
