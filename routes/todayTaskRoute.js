const express = require("express");
const router = express.Router();
const asyncHandler = require("../middlewares/asyncHandler");

const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware

const {getTodayTask,assignProjectToTeam,replaceProjectMember,updateProjectAssignments} = require("../controllers/todayTaskcontroller"); // Import the controller functions

router.get('/', verifyToken, asyncHandler(getTodayTask));

router.post('/assign', verifyToken, asyncHandler(assignProjectToTeam)); // Assign team members
router.post('/replace', verifyToken, asyncHandler(replaceProjectMember)); // Replace a team member
router.post('/update', verifyToken, asyncHandler(updateProjectAssignments)); // Update ops_status or expected_finish_time

module.exports = router; // Export the router for use in other files

