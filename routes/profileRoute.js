const express = require('express');
const {selesView_recent_month,announcement,announcementPost} = require('../controllers/profileController'); // Import the controller functions
const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware



const router = express.Router();
// Define your routes here
router.get('/', selesView_recent_month);
router.get('/announcement', announcement);
router.post('/done', announcementPost);





module.exports = router; // Export the router for use in other files
