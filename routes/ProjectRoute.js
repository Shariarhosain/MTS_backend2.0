const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { createProject, getAllProjects, updateProject } = require('../controllers/project_Controlller');

module.exports = (getIO) => {
    const router = express.Router();

    router.post('/create', (req, res) => createProject(req, res, getIO())); // 👈 now using getIO()
    router.post('/', asyncHandler(getAllProjects));
    router.put('/:id', (req, res) => updateProject(req, res, getIO()));

    return router;
};
