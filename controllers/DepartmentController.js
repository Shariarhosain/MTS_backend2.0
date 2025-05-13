const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

  exports.departmentCreate = async (req, res) => {
    const { department_name } = req.body;
    try {
        const department = await prisma.department.create({
            data: {
                department_name,
            },
        });
        return res.status(201).json({ message: 'Department created successfully', department });
    } catch (error) {
        console.error('Error creating department:', error);
        return res.status(500).json({ message: 'An error occurred while creating the department', error: error.message });
    }
};
exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { department_name } = req.body;
    try {
        const updatedDepartment = await prisma.department.update({
            where: { id: parseInt(id, 10) },
            data: {
                department_name,
            },
        });
        return res.status(200).json({ message: 'Department updated successfully', department: updatedDepartment });
    } catch (error) {
        console.error('Error updating department:', error);
        return res.status(500).json({ message: 'An error occurred while updating the department', error: error.message });
    }
};

exports.deleteDepartment = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedDepartment = await prisma.department.delete({
            where: { id: parseInt(id, 10) },
        });
        return res.status(200).json({ message: 'Department deleted successfully', department: deletedDepartment });
    } catch (error) {
        console.error('Error deleting department:', error);
        return res.status(500).json({ message: 'An error occurred while deleting the department', error: error.message });
    }
};
