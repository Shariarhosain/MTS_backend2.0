

const express = require("express");
const router = express.Router();
const { teamCreate, updateTeam, deleteTeam } = require('../controllers/TeamController');

router.post('/create', teamCreate);
router.put('/update/:id', updateTeam);
router.delete('/delete/:id', deleteTeam);



module.exports = router; // Export the router for use in other files