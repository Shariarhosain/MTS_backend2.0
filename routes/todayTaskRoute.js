const express = require("express");
const router = express.Router();
const asyncHandler = require("../middlewares/asyncHandler");

const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware

const {getTodayTask,updateProjectAssignments} = require("../controllers/todayTaskcontroller"); // Import the controller functions

router.get('/', verifyToken, asyncHandler(getTodayTask));
router.post('/update', verifyToken, asyncHandler(updateProjectAssignments));


module.exports = router; // Export the router for use in other files

