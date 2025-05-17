
const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();





// Helper function to determine the role based on department name and if they are the leader
const determineRole = (departmentName, memberId, leaderId) => {
    if (memberId === leaderId) {
        return departmentName === 'sales' ? 'sales_leader' : 'operation_leader';
    } else {
        return departmentName === 'sales' ? 'sales_member' : 'operation_member';
    }
};

exports.teamCreate = async (req, res) => {
    // Receive input from the request body
    const { team_name, department_id, team_target, leader_id, members: selectedMembers } = req.body;

    // Input validation
    if (!team_name || !department_id) {
        return res.status(400).json({ message: 
            'Team name and department ID are required.' 
        });
    }

    try {
        console.log('Received request to create team:', req.body);
        // 1. First search department_name in department table by department_id
        const department = await prisma.department.findUnique({
            where: {
                id: department_id,
            },
            select: {
                department_name: true,
            },
        });

        if (!department) {
            return res.status(404).json({ message: `Department with ID ${department_id} not found.` });
        }

        const departmentName = department.department_name;

        // 2. Create the team
        const team = await prisma.team.create({
            data: {
                team_name,
                team_target: team_target ? parseFloat(team_target) : null, // Convert to float if provided
                department: {
                    connect: {
                        id: department_id,
                    },
                },
                created_date: new Date(),
            },
        });

        // Store member IDs to update, including the leader if provided
        const membersToUpdate = new Set();

        // 3. If leader_id is available, set role and connect him in team_member table
        if (leader_id !== undefined && leader_id !== null) {
            membersToUpdate.add(leader_id);
        }

        // 4. If selectedMembers are available, connect them in team_member table
        if (selectedMembers && Array.isArray(selectedMembers)) {
                console.log('Members to update:', selectedMembers);
            selectedMembers.forEach(memberId => membersToUpdate.add(memberId));
        }
    

        // 5. Update team_member records for the leader and selected members
        if (membersToUpdate.size > 0) {
             // Validate if all members to update exist
            const membersExist = await prisma.team_member.findMany({
                where: { id: { in: Array.from(membersToUpdate) } },
                select: { id: true }
            });
            console.log('Members to update:', membersToUpdate);
            console.log('Members exist:', membersExist);
             if (membersExist.length !== membersToUpdate.size) {
                  const existingIds = new Set(membersExist.map(m => m.id));
                  const nonExistingIds = Array.from(membersToUpdate).filter(id => !existingIds.has(id));
                   // Clean up the created team if member validation fails
                   await prisma.team.delete({ where: { id: team.id } });
                   return res.status(404).json({ message: `One or more team members not found with IDs: ${nonExistingIds.join(', ')}. Team creation rolled back.` });
             }


            const teamMemberUpdates = Array.from(membersToUpdate).map(memberId => {
                let role;
                // Determine role based on department and if the member is the leader
                // Ensure leader_id is checked against the actual memberId
                role = determineRole(departmentName, memberId, leader_id);

                return prisma.team_member.update({
                    where: {
                        id: memberId,
                    },
                    data: {
                        team: {
                            connect: {
                                id: team.id,
                            },
                        },
                        role: role,
                        department: { // Also ensure team members are linked to the department
                            connect: {
                                id: department_id,
                            },
                        },
                    },
                });
            });

            // Execute all team member updates in parallel within a transaction for atomicity
             try {
                await prisma.$transaction(teamMemberUpdates);
             } catch (memberError) {
                 console.error('Error connecting team members:', memberError);
                 // Clean up the created team if member updates fail
                 await prisma.team.delete({ where: { id: team.id } });
                 throw new Error('Failed to assign team members.'); // Propagate error to outer catch
             }
        }

        return res.status(201).json({ message: 'Team created successfully', team });

    } catch (error) {
        console.error('Error creating team:', error);

        // It's good practice to handle specific Prisma errors if needed
        // For example, unique constraint errors for team_name or email
        if (error.code === 'P2002') {
            const target = error.meta.target;
            if (target.includes('team_name')) {
                 return res.status(409).json({ message: `Team name '${req.body.team_name}' already exists.` });
            }
             if (target.includes('email')) {
                 return res.status(409).json({ message: `One of the selected members has a duplicate email.` });
            }
        }


        return res.status(500).json({ message: 'An error occurred while creating the team', error: error.message });
    }
};


exports.getAllTeams = async (req, res) => {
    try {
        const teams = await prisma.team.findMany({
            include: {
                team_member: true, // Include members for each team
                department: true, // Include department details
            },
        });
        return res.status(200).json({ message: 'Teams retrieved successfully', teams });
    } catch (error) {
        console.error('Error retrieving teams:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving the teams', error: error.message });
    }
};


exports.updateTeam = async (req, res) => {
    const { id } = req.params;
    const teamId = parseInt(id, 10);

    // Input validation for team ID
    if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID provided.' });
    }

    const { team_name, department_id, team_target, leader_id, selectedMembers } = req.body;

    try {
        // Start a transaction to ensure all updates are atomic
        const result = await prisma.$transaction(async (prisma) => {

            // 1. Fetch the current team with its members
            // We need the current members to know who is on the team right now
            const currentTeam = await prisma.team.findUnique({
                where: { id: teamId },
                include: {
                    team_member: {
                        select: { id: true, team_id: true }, // Select IDs and current team_id
                    },
                    // We don't necessarily need the department for removal logic based on the new instruction,
                    // but fetching the team confirms its existence.
                },
            });

            if (!currentTeam) {
                throw new Error(`Team with ID ${teamId} not found.`); // Use throw to trigger transaction rollback
            }

            // 2. Identify member IDs to potentially remove based on the request body
            // *Literal interpretation of the latest instruction:*
            // If leader_id is in the body, remove that specific member from the team.
            // If selectedMembers is in the body, remove all members whose IDs are in that array from the team.
            // This is an unusual API design for an update operation.
            const memberIdsToAttemptRemoval = new Set();

            if (leader_id !== undefined && leader_id !== null) {
                 // Add the specified leader_id to the removal set
                 memberIdsToAttemptRemoval.add(leader_id);
            }

            if (selectedMembers !== undefined && Array.isArray(selectedMembers)) {
                selectedMembers.forEach(memberId => {
                    // Add all provided selectedMember IDs to the removal set
                    memberIdsToAttemptRemoval.add(memberId);
                });
            }

             // 3. Filter the removal set to only include members currently linked to *this* team
             // This prevents attempting to remove members not actually on this team.
             const currentMemberIdsOnThisTeam = new Set(currentTeam.team_member
                 .filter(member => member.team_id === teamId)
                 .map(member => member.id)
             );

             const actualMembersToRemove = Array.from(memberIdsToAttemptRemoval)
                 .filter(memberId => currentMemberIdsOnThisTeam.has(memberId));


            // 4. Prepare update operations
            const updateOperations = [];

            // Team update data (handle team_name, team_target, department_id updates as before)
            const teamUpdateData = {};
            if (team_name !== undefined) teamUpdateData.team_name = team_name;
            if (team_target !== undefined) teamUpdateData.team_target = team_target ? parseFloat(team_target) : null;
            if (department_id !== undefined) {
                // Validate department_id if provided
                 const newDepartment = await prisma.department.findUnique({
                     where: { id: department_id },
                     select: { id: true }, // Just check if it exists
                 });
                 if (!newDepartment) {
                      throw new Error(`Department with ID ${department_id} not found.`); // Trigger rollback
                 }
                teamUpdateData.department = {
                    connect: { id: department_id },
                };
            }

             // Add team update operation if there are changes
            if (Object.keys(teamUpdateData).length > 0) {
                updateOperations.push(
                    prisma.team.update({
                        where: { id: teamId },
                        data: teamUpdateData,
                    })
                );
            }


            // Member updates: set team_id to null and role to null for identified members
            if (actualMembersToRemove.length > 0) {
                 // No need to re-validate existence here if filtered by currentMemberIdsOnThisTeam
                 actualMembersToRemove.forEach(memberId => {
                     updateOperations.push(
                         prisma.team_member.update({
                             where: { id: memberId },
                             data: {
                                 team: { disconnect: true }, // Set team_id to null
                                 role: null, // Remove team-specific role
                             },
                         })
                     );
                 });
            }

            // Note: Based on the literal interpretation of the last instruction,
            // this update function *only* handles updating team details and
            // *removing* specific members provided in the body. It does *not*
            // handle adding new members or managing the team's full roster based
            // on the leader_id or selectedMembers in the body. This is an unusual
            // design pattern for a PUT/PATCH endpoint. A more conventional approach
            // would interpret leader_id and selectedMembers as the *desired final state*
            // of the team's members.


            // 5. Execute all operations in the transaction
            await Promise.all(updateOperations);

             // 6. Fetch the updated team after the transaction to return the complete state
             // Fetching again ensures we get the state after member removals and team updates
             const updatedTeam = await prisma.team.findUnique({
                where: { id: teamId },
                include: {
                    team_member: true, // Include the remaining members of the updated team
                    department: true, // Include department details
                },
             });

            return updatedTeam; // Return the updated team object from the transaction
        });

        return res.status(200).json({ message: 'Team updated successfully', team: result });

    } catch (error) {
        console.error('Error updating team:', error);

        // Handle specific Prisma errors
        if (error.code === 'P2025') { // Record not found error
             // This will be caught by the thrown error in the transaction for team or department not found.
             return res.status(404).json({ message: error.message }); // Use the message from the thrown error
        }
        if (error.code === 'P2002') { // Unique constraint violation
             const target = error.meta.target;
             if (target.includes('team_name')) {
                  return res.status(409).json({ message: `Team name '${req.body.team_name}' already exists.` });
             }
        }


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
