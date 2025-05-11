


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ──────────────────────────────────────────────────────────────────────────
 * GET /today‑tasks  (unchanged)
 * ──────────────────────────────────────────────────────────────────────── */
// exports.getTodayTask = async (req, res) => {

//   try {
//     const { uid } = req.user;
//     const me = await prisma.team_member.findUnique({
//       where: { uid },
//       include: { team: true },
//     });
//     if (!me || !me.role?.startsWith('operation_'))
//       return res.status(403).json({ error: 'Access denied' });

//     const rows = await prisma.today_task.findMany({
//       where: {
//         project: { is_delivered: false },
//         ...(me.role === 'operation_leader'
//           ? { team_id: me.team_id }
//           : { team_member_id: me.id }),
//       },
//       include: {
//         project: { select: { update_at: true, deli_last_date: true } },
//         team_member: {
//           select: { id: true, first_name: true, last_name: true, email: true, role: true },
//         },
//       },
//       orderBy: { project: { update_at: 'desc' } },
//     });

//     const tasks = Object.values(
//       rows.reduce((acc, row) => {
//         const pid = row.project_id;
//         if (!acc[pid]) {
//           acc[pid] = {
//             project_id: pid,
//             client_name: row.client_name,
//             expected_finish_time: row.expected_finish_time,
//             last_update: row.project?.update_at,
//             deli_last_date: row.project?.deli_last_date,
//             assign: [],
//           };
//         }

//         const assigneeObj = row.team_member
//           ? { ...row.team_member, ops_status: row.ops_status, expected_finish_time: row.expected_finish_time, client_name: row.client_name, last_update: row.project?.update_at, project_id: pid, deli_last_date: row.project?.deli_last_date }
//           : { id: null, first_name: null, last_name: null, email: null, role: null, ops_status: row.ops_status };

//         acc[pid].assign.push(assigneeObj);
//         return acc;
//       }, {})
//     );

//     let teamMembers = [];
//     if (me.role === 'operation_leader') {
//       teamMembers = await prisma.team_member.findMany({
//         where: { team_id: me.team_id },
//         select: { id: true, first_name: true, last_name: true, email: true, role: true },
//       });
//     }

//     return res.json(
//       me.role === 'operation_leader' ? { tasks, team_members: teamMembers } : { tasks }
//     );
//   } catch (err) {
//     console.error('getTodayTask →', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };



// exports.assignProjectToTeam = async (req, res) => {

//   try {
//     const { uid } = req.user;

//     // Step 1: Validate user
//     const me = await prisma.team_member.findUnique({ where: { uid } });
//     if (!me) return res.status(404).json({ error: 'User not found' });

//     const { project_id, team_member_ids } = req.body;

//     // Step 2: Validate input
//     if (!project_id || !Array.isArray(team_member_ids) || !team_member_ids.length) {
//       return res.status(400).json({ error: 'Invalid project_id or team_member_ids' });
//     }

//     // Step 3: Validate project
//     const project = await prisma.project.findUnique({ where: { id: project_id } });
//     if (!project) return res.status(404).json({ error: 'Project not found' });

//     // Step 4: Find parent task row to get client_name
//     const parentRow = await prisma.today_task.findFirst({
//       where: { project_id, team_member_id: null },
//       select: { client_name: true },
//     });
//     if (!parentRow)
//       return res.status(404).json({ error: 'Parent task not found' });

//     // Step 5: Create today_task rows for each team member
//     const createdTasks = await prisma.$transaction(
//       team_member_ids.map(id =>
//         prisma.today_task.create({
//           data: {
//             project_id,
//             team_id: project.team_id,
//             team_member_id: id,
//             client_name: parentRow.client_name,
//           },
//         })
//       )
//     );

//     // Step 6: Create member_distribution rows connected to corresponding today_task
//     const distributionTx = createdTasks.map(task =>
//       prisma.member_distribution.create({
//         data: {
//           team_member_id: task.team_member_id,
//           amount: 0,
//           today_task: {
//             connect: [{ id: task.id }], // ✅ Each member gets their own task link
//           },
//         },
//       })
//     );

//     // Step 7: Execute member_distribution inserts
//     await prisma.$transaction(distributionTx);

//     // Step 8: Respond
//     return res.json({
//       message: 'New team members assigned successfully',
//       project_id,
//       team_member_ids,
//     });
//   } catch (err) {
//     console.error('assignProjectToTeam →', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };



exports.getTodayTask = async (req, res) => {
  try {
    const { uid } = req.user;
    const me = await prisma.team_member.findUnique({
      where: { uid },
      include: { team: true },
    });
    if (!me || !me.role?.startsWith('operation_'))
      return res.status(403).json({ error: 'Access denied' });

    const rows = await prisma.today_task.findMany({
      where: {
        project: { is_delivered: false },
        ...(me.role === 'operation_leader'
          ? { team_id: me.team_id }
          : { team_member_id: me.id }),
      },
      include: {
        project: { select: { update_at: true, deli_last_date: true } },
        team_member: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
      },
      orderBy: { project: { update_at: 'desc' } },
    });

    const tasks = Object.values(
      rows.reduce((acc, row) => {
        const pid = row.project_id;
        if (!acc[pid]) {
          acc[pid] = {
            project_id: pid,
            client_name: row.client_name,
            expected_finish_time: row.expected_finish_time,
            last_update: row.project?.update_at,
            deli_last_date: row.project?.deli_last_date,
            assign: [],
          };
        }

        const assigneeObj = row.team_member
          ? { ...row.team_member, ops_status: row.ops_status, expected_finish_time: row.expected_finish_time, client_name: row.client_name, last_update: row.project?.update_at, project_id: pid, deli_last_date: row.project?.deli_last_date }
          : { id: null, first_name: null, last_name: null, email: null, role: null, ops_status: row.ops_status };

        acc[pid].assign.push(assigneeObj);
        return acc;
      }, {})
    );

    let teamMembers = [];
    if (me.role === 'operation_leader') {
      teamMembers = await prisma.team_member.findMany({
        where: { team_id: me.team_id },
        select: { id: true, first_name: true, last_name: true, email: true, role: true },
      });
    }

    return res.json(
      me.role === 'operation_leader' ? { tasks, team_members: teamMembers } : { tasks }
    );
  } catch (err) {
    console.error('getTodayTask →', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// exports.assignProjectToTeam = async (req, res) => {

//   try {
//     const { uid } = req.user;

//     // Step 1: Validate user
//     const me = await prisma.team_member.findUnique({ where: { uid } });
//     if (!me) return res.status(404).json({ error: 'User not found' });

//     const { project_id, team_member_ids } = req.body; // These are the members being *assigned* to the task

//     // Step 2: Validate input
//     if (!project_id || !Array.isArray(team_member_ids) || !team_member_ids.length) {
//       return res.status(400).json({ error: 'Invalid project_id or team_member_ids' });
//     }

//     // Step 3: Validate project
//     const project = await prisma.project.findUnique({ where: { id: project_id } });
//     if (!project) return res.status(404).json({ error: 'Project not found' });
//     // Ensure the project has a team_id
//     if (!project.team_id) return res.status(404).json({ error: 'Project is not associated with a team' });


//     // Step 4: Find parent task row to get client_name (for today_task creation)
//     const parentRow = await prisma.today_task.findFirst({
//       where: { project_id, team_member_id: null },
//       select: { client_name: true },
//     });
//     if (!parentRow)
//       return res.status(404).json({ error: 'Parent task not found for client_name lookup' });

//     // Step 5: Create today_task rows for each *selected* team member in the request
//     // These tasks link specific members to the project for a "today_task" context
//     const createdTodayTasks = await prisma.$transaction(
//       team_member_ids.map(id =>
//         prisma.today_task.create({
//           data: {
//             project_id,
//             team_id: project.team_id, // The project's team_id
//             team_member_id: id,      // The specific member being assigned to the task
//             client_name: parentRow.client_name,
//           },
//         })
//       )
//     );

//     // New Step: Fetch all team members of the project's team
//     const allProjectTeamMembers = await prisma.team_member.findMany({
//         where: { team_id: project.team_id }, // Get all members of the project's team
//         select: { id: true }, // We only need their IDs for member_distribution
//     });

//     if (!allProjectTeamMembers) { // findMany returns [] if not found, so check length if needed
//         console.warn(`No team members found for project's team_id: ${project.team_id}. No member_distribution records will be created.`);
//         // Depending on business logic, you might want to return an error or proceed.
//         // For now, we proceed, and if allProjectTeamMembers is empty, no member_distribution records are made.
//     }

//     // Step 6 (Modified): Create member_distribution rows for *all* team members in the project's team.
//     // These records are NOT connected to a specific today_task.
//     const memberDistributionCreations = [];
//     if (allProjectTeamMembers && allProjectTeamMembers.length > 0) {
//         allProjectTeamMembers.forEach(member => {
//             memberDistributionCreations.push(
//                 prisma.member_distribution.create({
//                     data: {
//                         team_member_id: member.id, // ID of a team member from the project's team
//                         amount: 0,
//                         // project_id: project_id, // Optional: Add if your schema has project_id directly on member_distribution
//                                                 // and you want to link it to the project.
//                         // NO `today_task: { connect: ... }` as per requirement
//                     },
//                 })
//             );
//         });
//     }

//     // Step 7 (Modified): Execute member_distribution inserts in a transaction
//     if (memberDistributionCreations.length > 0) {
//         await prisma.$transaction(memberDistributionCreations);
//     }

//     // Step 8: Respond
//     return res.json({
//       message: 'Team members assigned to task, and member distribution updated for all project team members.',
//       project_id,
//       assigned_team_member_ids_to_task: team_member_ids, // Members for whom a today_task was created
//       created_today_tasks_count: createdTodayTasks.length,
//       member_distribution_records_created_count: memberDistributionCreations.length,
//     });

//   } catch (err) {
//     console.error('assignProjectToTeam →', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };

exports.assignProjectToTeam = async (req, res) => {
  try {
    const { uid } = req.user; // Assuming req.user and prisma are available

    // Step 1: Validate user
    const me = await prisma.team_member.findUnique({ where: { uid } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const { project_id, team_member_ids } = req.body; // team_member_ids are for today_task assignment

    // Step 2: Validate input
    if (!project_id || !Array.isArray(team_member_ids) || !team_member_ids.length) {
      return res.status(400).json({ error: 'Invalid project_id or team_member_ids' });
    }
    // Assuming project_id and team_member_ids contain integers as per your schema
    const numericProjectId = parseInt(project_id, 10);
    if (isNaN(numericProjectId)) {
        return res.status(400).json({ error: 'Invalid project_id format' });
    }
    const numericTeamMemberIds = team_member_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericTeamMemberIds.length !== team_member_ids.length) {
        return res.status(400).json({ error: 'Invalid team_member_ids format' });
    }


    // Step 3: Validate project
    const project = await prisma.project.findUnique({ where: { id: numericProjectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.team_id) return res.status(404).json({ error: 'Project is not associated with a team' });

    // Step 4: Find parent task row to get client_name (for today_task creation)
    const parentRow = await prisma.today_task.findFirst({
      where: { project_id: numericProjectId, team_member_id: null },
      select: { client_name: true },
    });
    if (!parentRow)
      return res.status(404).json({ error: 'Parent task (for client_name lookup) not found' });

    // Step 5: Create today_task rows for each *selected* team member in the request
    const createdTodayTasks = await prisma.$transaction(
      numericTeamMemberIds.map(memberId =>
        prisma.today_task.create({
          data: {
            project_id: numericProjectId,
            team_id: project.team_id,
            team_member_id: memberId,
            client_name: parentRow.client_name,
          },
        })
      )
    );

    // --- Member Distribution Logic ---
    let newDistributionsCount = 0;

    // Step 6: Fetch all team members of the project's team
    const allProjectTeamMembers = await prisma.team_member.findMany({
        where: { team_id: project.team_id },
        select: { id: true },
    });

    if (!allProjectTeamMembers || allProjectTeamMembers.length === 0) {
        console.warn(`No team members found for project's team_id: ${project.team_id}. No new member_distribution records considered.`);
    } else {
        // Step 7: Identify which of these team members do NOT already have a member_distribution record for this project
        const existingDistributions = await prisma.member_distribution.findMany({
            where: {
                project_id: numericProjectId,
                team_member_id: {
                    in: allProjectTeamMembers.map(member => member.id),
                },
            },
            select: {
                team_member_id: true,
            },
        });

        const existingMemberIdsWithDistribution = new Set(
            existingDistributions.map(dist => dist.team_member_id)
        );

        const distributionCreatePromises = [];
        allProjectTeamMembers.forEach(member => {
            if (!existingMemberIdsWithDistribution.has(member.id)) {
                // This member does not have a distribution record for this project yet. Create one.
                distributionCreatePromises.push(
                    prisma.member_distribution.create({
                        data: {
                            team_member_id: member.id,
                            project_id: numericProjectId, // Link to the project
                            amount: 0, // Default amount as Decimal
                        },
                    })
                );
            }
        });

        // Step 8: Execute new member_distribution inserts in a transaction, if any
        if (distributionCreatePromises.length > 0) {
            await prisma.$transaction(distributionCreatePromises);
            newDistributionsCount = distributionCreatePromises.length;
            console.log(`${newDistributionsCount} new member_distribution records created for project ${numericProjectId}.`);
        } else {
            console.log(`All relevant team members for project ${numericProjectId} already have member_distribution records, or no new members to add distribution for.`);
        }
    }
    // --- End of Member Distribution Logic ---

    // Step 9: Respond
    return res.json({
      message: 'Team members assigned to task, and project member distributions processed.',
      project_id: numericProjectId,
      assigned_team_member_ids_to_task: numericTeamMemberIds, // IDs for whom today_task was created
      created_today_tasks_count: createdTodayTasks.length,
      new_member_distribution_records_created: newDistributionsCount,
    });

  } catch (err) {
    console.error('assignProjectToTeam →', err);
    if (err.code === 'P2002') { // Prisma unique constraint violation code
        return res.status(409).json({ error: 'Conflict: A unique constraint violation occurred. This might happen if trying to create duplicate member_distribution entries and the DB constraint is active.'});
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};






// API for replacing a team member in an existing project
exports.replaceProjectMember = async (req, res) => {
  try {
    const { uid } = req.user;
    const me = await prisma.team_member.findUnique({ where: { uid } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const project_id = req.body.project_id;
    const old_member_id = req.body.old_member_id;
    const new_member_id = req.body.new_member_id;

    if (!project_id || !old_member_id || !new_member_id)
      return res.status(400).json({ error: 'Invalid project_id, old_member_id, or new_member_id' });

    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const parentRow = await prisma.today_task.findFirst({
      where: { project_id, team_member_id: null },
      select: { client_name: true },
    });
    if (!parentRow)
      return res.status(404).json({ error: 'Parent task not found' });

    const existingTask = await prisma.today_task.findFirst({
      where: { project_id, team_member_id: old_member_id },
    });
    if (!existingTask) {
      return res.status(400).json({ error: 'Old team member is not assigned to this project' });
    }

    const tx = [];

    // Remove old member's assignment
    tx.push(
      prisma.today_task.delete({
        where: { id: existingTask.id }
      })
    );

    // Add new member assignment
    tx.push(
      prisma.today_task.create({
        data: {
          project_id,
          team_id: project.team_id,
          team_member_id: new_member_id,
          client_name: parentRow.client_name,
        }
      })
    );

    await prisma.$transaction(tx);

        //when replacing  team member also update row of members into  member distribution table. first find the old member and then update it with new member id
    /*model member_distribution {
  id                 Int       @id @default(autoincrement())
  team_member_id     Int
  team_member        team_member? @relation(fields: [team_member_id], references: [id])
  amount            Decimal?  @db.Decimal(65,0)
  today_task         today_task[] 
}
 */
    const distributionTx = await prisma.member_distribution.updateMany({
      where: { team_member_id: old_member_id, today_task: { project_id } },
      data: {
        team_member_id: new_member_id,
      }
    });
    await distributionTx;
    
   

    console.log(`Updated member distribution from ${old_member_id} to ${new_member_id} for project ${project_id}`);

    return res.json({
      message: 'Team member replaced successfully',
      project_id,
      old_member_id,
      new_member_id,
    });
  } catch (err) {
    console.error('replaceProjectMember →', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// API for updating project assignments (only allowed for operation members)
exports.updateProjectAssignments = async (req, res) => {
  try {
    const { uid } = req.user;
    const me = await prisma.team_member.findUnique({ where: { uid } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const { project_id, member_id, ops_status, expected_finish_time } = req.body;

    if (!project_id || !member_id) return res.status(400).json({ error: 'project_id and member_id are required' });

    const project = await prisma.project.findUnique({
      where: { id: project_id },
      select: { team_id: true, is_delivered: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.is_delivered) return res.status(400).json({ error: 'Project already delivered' });

    // If the user is an operation member, ensure that they can only update their own tasks
    if (me.role === 'operation_member') {
      const mine = await prisma.today_task.findFirst({
        where: { project_id, team_member_id: me.id },
      });
      if (!mine) return res.status(403).json({ error: 'Not your project' });

      // Update the task assigned to the specific member (operation member can only update their own task)
      await prisma.today_task.update({
        where: { id: mine.id },
        data: {
          ...(expected_finish_time && { expected_finish_time }),
          ...(ops_status && { ops_status }),
        },
      });

      return res.json({ message: 'Project updated by member', project_id, member_id });
    }

    // If the user is an operation leader, they can update any member's task
    if (me.role === 'operation_leader') {
      // Update the task for the specific member
      const taskToUpdate = await prisma.today_task.findFirst({
        where: { project_id, team_member_id: member_id },
      });

      if (!taskToUpdate) {
        return res.status(404).json({ error: 'Task not found for the specified member' });
      }

      await prisma.today_task.update({
        where: { id: taskToUpdate.id },
        data: {
          ...(expected_finish_time && { expected_finish_time }),
          ...(ops_status && { ops_status }),
        },
      });

      return res.json({
        message: 'Project updated by operation leader',
        project_id,
        member_id,
      });
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('updateProjectAssignments →', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};




/**
 * Fetches member distribution records, grouped by project, based on user role.
 * - Operation Leaders: See all distributions for projects within their team.
 * - Operation Members (and other non-leader operational roles): See only their own distributions.
 */
exports.getAllmemberDistribution = async (req, res) => {
  try {
    const { uid } = req.user;
    if (!uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await prisma.team_member.findUnique({
      where: { uid },
      select: { id: true, role: true, team_id: true },
    });

    if (!currentUser) {
      return res.status(403).json({ error: 'User profile not found' });
    }
    if (!currentUser.role || !currentUser.role.startsWith('operation_')) {
      return res.status(403).json({ error: 'Access denied. User does not have an operational role.' });
    }

    let whereClause = {};
    if (currentUser.role === 'operation_leader') {
      if (!currentUser.team_id) {
        console.warn(`Operation leader ${currentUser.id} (uid: ${uid}) does not have a team_id. No distributions will be fetched.`);
        return res.status(403).json({ error: 'Access denied. Leader not associated with a team.' });
      }
      whereClause = { project: { team_id: currentUser.team_id } };
    } else {
      whereClause = { team_member_id: currentUser.id };
    }

    const flatDistributions = await prisma.member_distribution.findMany({
      where: whereClause,
      select: { // Select all necessary fields for grouping and display
        id: true,
        amount: true,
        project_id: true,
        team_member_id: true,
        team_member: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
        project: { // Select project details that will be top-level in the group
          select: {
            id: true,
            // name: true, // Uncomment if your project model has a 'name' field
            // client_name: true, // Uncomment if your project model has 'client_name'
            update_at: true,
            deli_last_date: true,
            is_delivered: true,
            // Add other relevant project fields as per your schema
          },
        },
      },
      orderBy: [ // It's good to sort by project_id to help with grouping if processing very large datasets sequentially
        { project_id: 'asc' },
        { project: { update_at: 'desc' } }, // Secondary sort for distributions within a project if needed
        { team_member_id: 'asc' },
      ],
    });

    if (!flatDistributions || flatDistributions.length === 0) {
      return res.json([]); // Return empty array if no distributions found
    }

    // Grouping logic
    const groupedByProjectMap = new Map();

    flatDistributions.forEach(dist => {
      const projectId = dist.project_id;
      if (!groupedByProjectMap.has(projectId)) {
        groupedByProjectMap.set(projectId, {
          project_id: projectId,
          project_details: dist.project, // Contains all selected project fields
          distributions: [],
        });
      }

      groupedByProjectMap.get(projectId).distributions.push({
        id: dist.id,
        amount: dist.amount,
        team_member_id: dist.team_member_id,
        team_member_details: dist.team_member, // Contains all selected team_member fields
      });
    });

    // Convert map to array
    const groupedByProjectArray = Array.from(groupedByProjectMap.values());

    // Optional: Sort the final array of projects, e.g., by project's last update date (descending)
    groupedByProjectArray.sort((a, b) => {
        const dateA = a.project_details.update_at ? new Date(a.project_details.update_at) : null;
        const dateB = b.project_details.update_at ? new Date(b.project_details.update_at) : null;

        if (!dateA && !dateB) return 0; // Both null or invalid
        if (!dateA) return 1;  // Place projects with null/invalid update_at at the end
        if (!dateB) return -1; // Place projects with null/invalid update_at at the end
        return dateB - dateA; // Sort by date descending
    });

    return res.json(groupedByProjectArray);

  } catch (err) {
    console.error('getAllmemberDistribution Error →', err);
    return res.status(500).json({ error: 'Internal server error while fetching member distributions.' });
  }
};


/**
 * Updates the amount of a specific member_distribution record.
 * Only accessible by 'operation_leader' for distributions within their team's projects.
 */
exports.updateMemberDistribution = async (req, res) => {
  try {
    const { uid } = req.user; // Assuming req.user is populated
    const distributionIdParam = req.params.id; // ID from URL path e.g., /distributions/:id
    const { amount } = req.body; // Expecting 'amount' in the request body

    if (!uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const distributionId = parseInt(distributionIdParam, 10);
    if (isNaN(distributionId)) {
      return res.status(400).json({ error: 'Invalid distribution ID format in URL.' });
    }

    // Validate amount: must be provided and be a number.
    // Note: `amount` can be 0.
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required in the request body.' });
    }
    const numericAmount = parseFloat(amount); // Or use a more robust decimal library if precision is critical
    if (isNaN(numericAmount)) {
      return res.status(400).json({ error: 'Invalid amount format. Amount must be a number.' });
    }

    // Fetch current user details
    const currentUser = await prisma.team_member.findUnique({
      where: { uid },
      select: { id: true, role: true, team_id: true },
    });

    if (!currentUser) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    // Authorization: Check if user is an operation leader
    if (currentUser.role !== 'operation_leader') {
      return res.status(403).json({ error: 'Access denied. You do not have permission to update distributions.' });
    }
    if (!currentUser.team_id) {
      // Leader must be associated with a team to have a scope for updates
      return res.status(403).json({ error: 'Access denied. Leader not associated with a team.' });
    }

    // Fetch the member_distribution record to verify existence and its project's team_id
    const distributionToUpdate = await prisma.member_distribution.findUnique({
      where: { id: distributionId },
      include: {
        project: { // Need project to check its team_id for authorization
          select: { team_id: true },
        },
      },
    });

    if (!distributionToUpdate) {
      return res.status(404).json({ error: 'Member distribution record not found.' });
    }

    // Authorization: Leader can only update distributions for projects belonging to their own team.
    if (distributionToUpdate.project.team_id !== currentUser.team_id) {
      return res.status(403).json({ error: 'Access denied. You can only update distributions for projects within your assigned team.' });
    }

    // Perform the update
    const updatedDistribution = await prisma.member_distribution.update({
      where: { id: distributionId },
      data: {
        amount: numericAmount, // Prisma handles conversion to Decimal type in DB
      },
      select: { // Select desired fields for the response
        id: true,
        amount: true,
        project_id: true,
        team_member_id: true,
        team_member: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        project: {
          select: {
            id: true,
            // name: true, // Example project name
            update_at: true,
          },
        },
      },
    });

    return res.json(updatedDistribution);

  } catch (err) {
    console.error('updateMemberDistribution Error →', err);
    // Handle specific Prisma errors if needed
    if (err.code === 'P2025') { // Prisma error: "Record to update not found."
      return res.status(404).json({ error: 'Failed to update. Member distribution record not found.' });
    }
    return res.status(500).json({ error: 'Internal server error while updating member distribution.' });
  }
};





