const express = require("express");
const asyncHandler = require("../middlewares/asyncHandler");

const {teamwiseDelivery,eachTeamChart} = require('../controllers/salesTeamController');
//const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware
const {
  createProject,
  getAllProjects,
  updateProject,
  getClientSuggestionsFromProjects,
  new_revision,
  projectDistribution,
  getProjectsByClientName,
  getAllDepartmentNames,
  getProjectById,
  showallStatusRevisionProjects
} = require("../controllers/projectController"); // Import the controller functions

module.exports = (getIO) => {
  const router = express.Router();
  // Create project route, using getIO() to get the socket instance
  router.post("/create", (req, res) => createProject(req, res, getIO()));

  // Get all projects route, wrapped with asyncHandler to catch errors

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      await getAllProjects(req, res, getIO()); // Ensure this is asynchronous
    })
  );

  router.get("/clientSuggestions", getClientSuggestionsFromProjects);
  

  router.get("/teamwiseDelivery", teamwiseDelivery);
  router.get("/eachTeamChart", eachTeamChart); // Added this line to include the new route



  router.get("/getall/:id", getProjectById);


  // Update project route, using getIO() for socket functionality
  router.put("/:id", (req, res) => updateProject(req, res, getIO()));

  router.put("/updateRevision/:id", new_revision);

  // Get project distribution for the current month, using getIO() for socket functionality
  router.get("/monthWise", projectDistribution);
  router.get("/byClient", getProjectsByClientName);
  router.get("/departmentNames", getAllDepartmentNames); // Corrected to use getIO()

  //showallStatusRevisionProjects
  router.get("/showallStatusRevisionProjects/:id", showallStatusRevisionProjects);


  return router;
};
