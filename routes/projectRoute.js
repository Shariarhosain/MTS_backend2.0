const express = require("express"); // Import express
const router = express.Router(); // Create a new router instance


    const {
         createUser,
         getAllProjects, 
        getProjectById,
        updateProject,
        deleteProject

        } = require("../controllers/ProjectController.js"); // Import the createUser function from UserController

router.get("/", getAllProjects); // Define route for getting all projects
router.post("/create", createUser); // Define route for creating a user
router.get("/:id", getProjectById); // Define route for getting a project by ID
router.put("/:id", updateProject); // Define route for updating a project by ID
router.delete("/:id", deleteProject); // Define route for deleting a project by ID
// Define route for creating a project




// Export the router for use in other files
module.exports = router;
