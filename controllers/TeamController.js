
const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();










exports.teamCreate = async (req, res) => {  

    const { team_name, department_id } = req.body;
    try {
        const team = await prisma.team.create({
            data: {
                team_name,
                department: {
                    connect: {
                        id: department_id,
                    },
                },
            },
        });
        return res.status(201).json({ message: 'Team created successfully', team });
    } catch (error) {
        console.error('Error creating team:', error);
        return res.status(500).json({ message: 'An error occurred while creating the team', error: error.message });
    }

}


exports.updateTeam = async (req, res) => {
    const { id } = req.params;
    const { team_name, department_id } = req.body;
    try {
        const updatedTeam = await prisma.team.update({
            where: { id: parseInt(id, 10) },
            data: {
               ...team_name && { team_name },
                ...(department_id && {
                    department: {
                        connect: {
                            id: department_id,
                        },
                    },
                }),
            },
        });
        return res.status(200).json({ message: 'Team updated successfully', team: updatedTeam });
    } catch (error) {
        console.error('Error updating team:', error);
        return res.status(500).json({ message: 'An error occurred while updating the team', error: error.message });
    }
};

exports.deleteTeam = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTeam = await prisma.team.delete({
            where: { id: parseInt(id, 10) },
        });
        return res.status(200).json({ message: 'Team deleted successfully', team: deletedTeam });
    } catch (error) {
        console.error('Error deleting team:', error);
        return res.status(500).json({ message: 'An error occurred while deleting the team', error: error.message });
    }
};
