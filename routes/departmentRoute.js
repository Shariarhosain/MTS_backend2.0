
const express = require("express");
const router = express.Router();

const verifyToken = require('../middlewares/jwt'); // Import the JWT verification middleware


const { departmentCreate, updateDepartment, deleteDepartment,getAllDepartments} = require('../controllers/DepartmentController.js');

router.post('/create', verifyToken,departmentCreate);
router.put('/update/:id', verifyToken,updateDepartment);
router.delete('/delete/:id', verifyToken,deleteDepartment);
router.get('/', getAllDepartments);

module.exports = router; // Export the router for use in other files