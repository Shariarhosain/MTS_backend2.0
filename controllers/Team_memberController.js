// controllers/teamMemberController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Create a new team member
exports.createTeamMember = async (req, res) => {
    const { first_name, last_name, email, number, permanent_address, present_address, gender, blood_group, relationship, guardian_relation, guardian_number, guardian_address, religion, education, designation } = req.body;
    
    try {
        if (!first_name || !last_name || !email || !number || !permanent_address || !present_address || !gender || !blood_group || !relationship || !guardian_relation || !guardian_number || !guardian_address || !religion || !education || !designation) {
            // handle the case where any field is missing
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const dpPath = req.file ? `/uploads/${req.file.filename}` : null;

        // Check for existing email
        const existingEmail = await prisma.team_member.findUnique({
            where: { email }
        });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
        }


        // Email and phone validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const phoneRegex = /^\d{11}$/;
        if (!phoneRegex.test(number)) {
            return res.status(400).json({ message: 'Invalid phone number format. It should be 11 digits.' });
        }

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
                dp: dpPath,  // Store the image path
                designation,
                role: 'null', // Default role, can be updated later
                target:0,
                rewards: 0,
                rating: 0,
                account_status: 'active', // Default account status
            }
        });

        return res.status(201).json({ message: 'Team member created successfully', teamMember });
    } catch (error) {
        console.error('Error during team member creation:', error);
        return res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

exports.getAllTeamMembers = async (req, res) => {
    try {
        // Check if req.body is empty or contains invalid data
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
            skip,
            take: limitNumber,
        });

        const totalTeamMembers = await prisma.team_member.count();

        return res.status(200).json({
            message: 'All team members retrieved successfully',
            teamMembers,
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




        upload.single('dp')(req, res, async (err) => {
            if (err) {
                console.error('Error during image upload:', err);
                return res.status(400).json({ message: 'Error uploading image', error: err.message });
            }

            const teamMember = await prisma.team_member.findUnique({ where: { id: parseInt(id, 10) } });
            if (!teamMember) {
                return res.status(404).json({ message: 'Team member not found' });
            }

            const updateData = { ...req.body };
            
            if (req.file) {
                // Delete old image if being updated
                if (teamMember.dp) {
                    const oldImagePath = path.join(__dirname, '..', teamMember.dp);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);  // Delete old image file
                    }
                }

                updateData.dp = `/uploads/${req.file.filename}`;
            }

            const updatedTeamMember = await prisma.team_member.update({
                where: { id: parseInt(id, 10) },
                data: updateData,
            });

            return res.status(200).json({ message: 'Team member updated successfully', teamMember: updatedTeamMember });
        });
    } catch (error) {
        console.error('Error updating team member:', error);
        return res.status(500).json({ message: 'An error occurred while updating the team member', error: error.message });
    }
};

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
