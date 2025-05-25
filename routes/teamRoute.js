

const express = require("express");
const router = express.Router();
const { teamCreate, updateTeam, deleteTeam,getAllTeams,teamWisechart} = require('../controllers/TeamController');

router.post('/create', teamCreate);
router.put('/update/:id', updateTeam);
router.delete('/delete/:id', deleteTeam);
router.get('/', getAllTeams); // Get all teams and their members

router.get('/teamwisechart', teamWisechart); // Get all teams and their members

module.exports = router; // Export the router for use in other files