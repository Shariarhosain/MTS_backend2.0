const express = require("express");
const {
  addUser,
  getAllUsers,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const uploadMulterMiddleware = require("../config/multer"); // Import the Hybrid Multer Setup

const router = express.Router();

// ✅ Apply Multer Middleware
router.post("/adduser", uploadMulterMiddleware, addUser);

router.get("/allusers", getAllUsers);
router.put("/userUpdate", updateUser);
router.delete("/deleteuser", deleteUser);

module.exports = router;
