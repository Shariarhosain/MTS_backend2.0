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
  createProjectSpecialOrder,
  getProfileCurrentMonthWeeklyDetails,
  getMonthlyProfileActivityChart,
  createProfile,
  getAllProfiles,
  updateProfile,
  getProfileOverviewById,
  getQuarterlyPerformance,
  getAllConsolidatedReports,
  getMonthlyDeliveries,
  getTodaysDeliveries,
  getMonthlyCancellations,
  getTodaysPromotionCosts,
  getMonthlyPromotionCosts,
  getTodaysSpecialOrders,
  getMonthlySpecialOrders,
  getOperationalPerformance,
  getSalesPerformance,
  getMonthlyOrders,
  getTodaysOrders,
  getProjectsNeedingAssignment,
  getTotalProjectsNotDelivered,
  getCarryForwardProjects,
  createOtherCost,
  getAllOtherCosts,
  updateOtherCost,
  deleteOtherCost,

} = require('../controllers/profileController'); // Import the controller functions
const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware

const router = express.Router();

// Profile Routes
router.post('/create', verifyToken, createProfile); // Create a new profile
router.get('/', verifyToken, getAllProfiles); // Get all profiles
router.put('/update/:id', verifyToken, updateProfile); // Update a specific profile











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




// In your router file
router.get('/special-orders/reports/current-month-weekly-details', getProfileCurrentMonthWeeklyDetails);







router.get('/profileRanking/monthly-activity-chart', getMonthlyProfileActivityChart);





router.get('/singleprofile/:profileId', verifyToken, getProfileOverviewById); // Get profile overview by ID
















router.get('/quarterly-performance', verifyToken, getQuarterlyPerformance); // Get quarterly performance by profile ID




// Consolidated Report Route
router.get('/reports/all', verifyToken, getAllConsolidatedReports);

// Project Delivery Reports
router.get('/projects/delivered/month', verifyToken, getMonthlyDeliveries);
router.get('/projects/delivered/today', verifyToken, getTodaysDeliveries);

// Project Order Reports
router.get('/projects/ordered/month', verifyToken, getMonthlyOrders);
router.get('/projects/ordered/today', verifyToken, getTodaysOrders);

// Project Cancellation Reports
router.get('/projects/cancelled/month', verifyToken, getMonthlyCancellations);

// Promotion Cost Reports
router.get('/promotions/today', verifyToken, getTodaysPromotionCosts);
router.get('/promotions/month', verifyToken, getMonthlyPromotionCosts);

// Special Order Reports
router.get('/special-orders/today', verifyToken, getTodaysSpecialOrders);
router.get('/special-orders/month', verifyToken, getMonthlySpecialOrders);

// Operational Performance Reports
router.get('/operational-performance', verifyToken, getOperationalPerformance);

// Sales Performance Reports
router.get('/sales-performance', verifyToken, getSalesPerformance);
// 8. Projects Needing Assignment Report
router.get('/projects/unassigned', verifyToken, getProjectsNeedingAssignment);
// 9. Total Projects Not Delivered
router.get('/projects/not-delivered', verifyToken, getTotalProjectsNotDelivered);

// 10. Carry Forward Projects
router.get('/projects/carry-forward', verifyToken, getCarryForwardProjects);

// 11. Other Cost Routes
router.post('/other-cost/create', verifyToken, createOtherCost); 
router.get('/other-cost', verifyToken, getAllOtherCosts);
router.put('/other-cost/:id', verifyToken, updateOtherCost); 
router.delete('/other-cost/:id', verifyToken, deleteOtherCost); 

module.exports = router; // Export the router for use in other files









