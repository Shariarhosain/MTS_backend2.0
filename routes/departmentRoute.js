
const express = require("express");
const router = express.Router();


const { departmentCreate, updateDepartment, deleteDepartment,getAllDepartments} = require('../controllers/DepartmentController.js');

router.post('/create', departmentCreate);
router.put('/update/:id', updateDepartment);
router.delete('/delete/:id', deleteDepartment);
router.get('/', getAllDepartments);

module.exports = router; // Export the router for use in other files