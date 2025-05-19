

const express = require("express");
const router = express.Router();

const {getMonthlyAttendanceReport} = require("../controllers/TeamMemberController"); // Import the controller functions

router.get("/monthly-attendance-report", getMonthlyAttendanceReport); // Route to get monthly attendance report

module.exports = router; // Export the router for use in other files