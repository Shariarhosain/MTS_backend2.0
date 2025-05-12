const express = require('express');
const {
  selesView_recent_month, // Assuming this is from your existing routes, kept for context
  announcement,           // Assuming this is from your existing routes, kept for context
  announcementPost,       // Assuming this is from your existing routes, kept for context
  profileRanking,
  AllprofileRankingGet,
  updateprofile_ranking,
  deleteProfileRanking,
  promotionprofile,
  AllprofilePromotionGet,
  updateprofile_promotion,
  deleteProfilePromotion,
  deleteProjectSpecialOrder,
  updateProjectSpecialOrder,
  getProjectSpecialOrder,
  createProjectSpecialOrder
} = require('../controllers/profileController'); // Import the controller functions
const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware

const router = express.Router();

// Existing routes (from your example)
router.get('/', selesView_recent_month); // Example, adjust if it's for a different base path
router.get('/announcement', announcement);
router.post('/done', announcementPost); // Assuming '/done' is related to announcementPost

// Profile Ranking Routes
router.post('/ranking/create', verifyToken, profileRanking);          // Create a new profile ranking
router.get('/ranking', verifyToken, AllprofileRankingGet);      // Get all profile rankings
router.put('/ranking/:id', verifyToken, updateprofile_ranking); // Update a specific profile ranking
router.delete('/ranking/delete/:id', verifyToken, deleteProfileRanking); // Delete a specific profile ranking

// Profile Promotion Routes
router.post('/promotion/create', verifyToken, promotionprofile);        // Create a new profile promotion
router.get('/promotion', verifyToken, AllprofilePromotionGet);    // Get all profile promotions
router.put('/promotion/:id', verifyToken, updateprofile_promotion); // Update a specific profile promotion
router.delete('/promotion/delete/:id', verifyToken, deleteProfilePromotion); // Delete a specific profile promotion


// Project Special Order Routes
router.post('/projectSpecialOrder/create', verifyToken, createProjectSpecialOrder); // Create project special order
router.put('/projectSpecialOrder/:id', verifyToken, updateProjectSpecialOrder); // Update project special order
router.get('/projectSpecialOrder', verifyToken, getProjectSpecialOrder); // Get all project special orders
router.delete('/projectSpecialOrder/:id', verifyToken, deleteProjectSpecialOrder); // Delete project special order
module.exports = router; // Export the router for use in other files