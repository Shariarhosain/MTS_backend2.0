// controllers/teamMemberController.js
const { PrismaClient } = require('@prisma/client');
const generateToken = require('../config/generateToken');  // Adjust path to your token generator

const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');



// // Create a new team member
// exports.createTeamMember = async (req, res) => {


//     const { first_name, last_name, email, number, permanent_address, present_address, gender, blood_group, relationship, guardian_relation, guardian_number, guardian_address, religion, education } = req.body;
    
//     try {
//            console.log("📦 Fields:", req.body); // All form fields
//         console.log("🖼️ Files:", req.files); // All files    

//  // Access the first file in the array path
//         const file = req.files.dp[0].path; // Assuming 'dp' is the field name for the image upload
//         console.log("🖼️ File Path:", file); // Log the file path

//         // Create team member in database
//         const teamMember = await prisma.team_member.create({
//             data: {
//                 first_name,
//                 last_name,
//                 email,
//                 number,
//                 permanent_address,
//                 present_address,
//                 gender,
//                 blood_group,
//                 relationship,
//                 guardian_relation,
//                 guardian_number,
//                 guardian_address,
//                 religion,
//                 education,
//                 dp: file,  // Store the image path
//                 role: 'null', // Default role, can be updated later
//                 target:0,
//                 rewards: 0,
//                 rating: 0,
//                 account_status: 'active', // Default account status
              
//             }
//         });

//         console.log('Team member created:', teamMember);
//         return res.status(201).json({ message: 'Team member created successfully' });
//     } catch (error) {
//         console.error('Error during team member creation:', error);
//         return res.status(500).json({ message: 'An error occurred', error: error.message });
//     }
// };


// Create a new team member and generate a JWT token
exports.createTeamMember = async (req, res) => {
    const { 
        first_name, 
        last_name, 
        email, 
        number, 
        permanent_address, 
        present_address, 
        gender, 
        blood_group, 
        relationship, 
        guardian_relation, 
        guardian_number, 
        guardian_address, 
        religion, 
        education, 
    } = req.body;

    try {
        console.log("📦 Fields:", req.body); // All form fields
        console.log("🖼️ Files:", req.files); // All files    

        // Access the first file in the array path
        const file = req.files.dp[0].path; // Assuming 'dp' is the field name for the image upload
        console.log("🖼️ File Path:", file); // Log the file path

        // Create team member in database
        const teamMember = await prisma.team_member.create({
            data: {
                first_name,
                last_name,
                email,
                number,
                permanent_address,
                present_address,
                gender,
                blood_group,
                relationship,
                guardian_relation,
                guardian_number,
                guardian_address,
                religion,
                education,
                dp: file,  // Store the image path
                role: 'null', // Default role, can be updated later
                target: 0,
                rewards: 0,
                rating: 0,
                account_status: 'active', // Default account status
                uid: req.body.uid, // Assuming uid is passed in the request body
            }
        });

        console.log('Team member created:', teamMember);

        // Generate JWT Token
        const uid= req.body.uid; // Assuming uid is passed in the request body
        if (!uid) { 
            return res.status(400).json({ message: 'UID is required to generate token.' });
        }
        console.log("UID:", uid); // Log the UID
        const token = generateToken(uid);
         // Send this token to the frontend for authentication
        console.log("Token:", token); // Log the generated token;
        
        // Send response with token
        return res.status(201).json({ 
            message: 'Team member created successfully',
            token: token  // Send JWT token to frontend
        });

    } catch (error) {
        console.error('Error during team member creation:', error);
        return res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};


exports.getAllTeamMembers = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(200).json({
                message: 'No pagination data provided, returning empty result.',
                teamMembers: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                }
            });
        }

        const { page = 1, limit = 10 } = req.body;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;
        const teamMembers = await prisma.team_member.findMany({
            include: {
              team: {
                include: {
                  department: true, // this is nested via team
                },
              },
              project: true, // directly related
              profile: true, // directly related
            },
            skip,
            take: limitNumber,
          });
          

        const totalTeamMembers = await prisma.team_member.count();

        const teamMembersWithoutPassword = teamMembers.map(({ password, ...rest }) => rest);

        return res.status(200).json({
            message: 'All team members retrieved successfully',
            teamMembers: teamMembersWithoutPassword,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: totalTeamMembers,
                totalPages: Math.ceil(totalTeamMembers / limitNumber),
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'An error occurred while retrieving team members', error: error.message });
    }
};

// Update a team member by ID
exports.updateTeamMember = async (req, res) => {
    const { id } = req.params;
    try {

        //find by id if not error
        const ID = await prisma.team_member.findUnique({
            where: { id: parseInt(id, 10) }
        });
        if (!ID) {
            return res.status(404).json({ error: 'Team member not found.' });
        }


            const updateData = { ...req.body };
            
        
            const updatedTeamMember = await prisma.team_member.update({
                where: { id: parseInt(id, 10) },
                data: updateData,
            });

            return res.status(200).json({ message: 'Team member updated successfully', teamMember: updatedTeamMember });
        
    } catch (error) {
        console.error('Error updating team member:', error);
        return res.status(500).json({ message: 'An error occurred while updating the team member', error: error.message });
    }
};


exports.getTeamMemberById = async (req, res) => {
    const { id } = req.params;
    try {
        const teamMember = await prisma.team_member.findUnique({
            where: { id: parseInt(id, 10) },
            include: {
                team: true,
                project: true,
                profile: true,
            }
        });
        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        return res.status(200).json({ message: 'Team member retrieved successfully', teamMember });
    } catch (error) {
        console.error('Error retrieving team member:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving the team member', error: error.message });
    }
}
// Deactivate a team member by ID (soft delete)
exports.deactivateTeamMember = async (req, res) => {
    const { id } = req.params;
    try {
        const teamMember = await prisma.team_member.findUnique({ where: { id: parseInt(id, 10) } });
        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // If the team member has a dp image, delete it
        if (teamMember.dp) {
            const dpPath = path.join(__dirname, '..', teamMember.dp);
            if (fs.existsSync(dpPath)) {
                fs.unlinkSync(dpPath);
            }
        }

        await prisma.team_member.update({
            where: { id: parseInt(id, 10) },
            data: { account_status: 'inactive' },
        });

        return res.status(200).json({ message: 'Team member deactivated and image deleted successfully' });
    } catch (error) {
        console.error('Error deactivating team member:', error);
        return res.status(500).json({ message: 'An error occurred while deactivating the team member', error: error.message });
    }
};


exports.login = async (req, res) => {
    const { email } = req.body;
    try {
        const teamMember = await prisma.team_member.findUnique({
            where: { email },
        });
        if (!teamMember) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        // Check if the account is active
        if (teamMember.account_status !== 'active') {
            return res.status(403).json({ message: 'Account is inactive' });
        }
    
        // Generate JWT Token
        const token = generateToken(teamMember.uid); // Assuming you want to use the team member's ID as the UID

        return res.status(200).json({
            message: 'Login successful',
            token,
            teamMember: { ...teamMember, password: undefined }, // Exclude password from response
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'An error occurred during login', error: error.message });
    }
}