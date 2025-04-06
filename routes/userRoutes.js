const express = require("express"); // Import express
const router = express.Router(); // Create a new router instance

const { createUser } = require("../controllers/userController.js"); // Import user controller functions (ensure the function is named 'createUser')

// Define route for creating a user
router.post("/", createUser); 

// Export the router for use in other files
module.exports = router;
