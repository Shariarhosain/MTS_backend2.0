


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
        project: {
          OR: [{ is_delivered: false }, { status: 'revision' }] }, // Include both delivered and not delivered projects
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

   const rawAssignee = row.team_member
  ? {
      first_name: row.team_member.first_name,
      email: row.team_member.email,
      role: row.team_member.role,
      id: row.team_member.id,
      today_task_id: row.id,
      ops_status: row.ops_status,
      expected_finish_time: row.expected_finish_time,
      client_name: row.client_name,
      last_update: row.project?.update_at,
      project_id: pid,
      deli_last_date: row.project?.deli_last_date,
    }
  : {
      id: null,
      first_name: null,
      last_name: null,
      email: null,
      role: null,
      today_task_id: null,
      ops_status: row.ops_status,
    };

// (২) null বা undefined যেগুলো আছে সেগুলো ফিল্টার করে ক্লিন কপি বানাই
const assigneeObj = Object.fromEntries(
  Object.entries(rawAssignee).filter(([, v]) => v != null) // v != null  ➜ null ও undefined দুই-টাই বাদ
);
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
    // const distributionTx = await prisma.member_distribution.updateMany({
    //   where: { team_member_id: old_member_id, today_task: { project_id } },
    //   data: {
    //     team_member_id: new_member_id,
    //   }
    // });
    // await distributionTx;
    
   

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
// exports.updateProjectAssignments = async (req, res) => {
//   try {
//     const { uid } = req.user;
//     const me = await prisma.team_member.findUnique({ where: { uid } });
//     if (!me) return res.status(404).json({ error: 'User not found' });

//     const { project_id, member_id, ops_status, expected_finish_time } = req.body;

//     if (!project_id || !member_id) return res.status(400).json({ error: 'project_id and member_id are required' });

//     const project = await prisma.project.findUnique({
//       where: { id: project_id },
//       select: { team_id: true, is_delivered: true },
//     });
//     if (!project) return res.status(404).json({ error: 'Project not found' });
//     if (project.is_delivered) return res.status(400).json({ error: 'Project already delivered' });

//     // If the user is an operation member, ensure that they can only update their own tasks
//     if (me.role === 'operation_member') {
//       const mine = await prisma.today_task.findFirst({
//         where: { project_id, team_member_id: me.id },
//       });
//       if (!mine) return res.status(403).json({ error: 'Not your project' });

//       // Update the task assigned to the specific member (operation member can only update their own task)
//       await prisma.today_task.update({
//         where: { id: mine.id },
//         data: {
//           ...(expected_finish_time && { expected_finish_time }),
//           ...(ops_status && { ops_status }),
//         },
//       });

//       return res.json({ message: 'Project updated by member', project_id, member_id });
//     }

//     // If the user is an operation leader, they can update any member's task
//     if (me.role === 'operation_leader') {
//       // Update the task for the specific member
//       const taskToUpdate = await prisma.today_task.findFirst({
//         where: { project_id, team_member_id: member_id },
//       });

//       if (!taskToUpdate) {
//         return res.status(404).json({ error: 'Task not found for the specified member' });
//       }

//       await prisma.today_task.update({
//         where: { id: taskToUpdate.id },
//         data: {
//           ...(expected_finish_time && { expected_finish_time }),
//           ...(ops_status && { ops_status }),
//         },
//       });

//       return res.json({
//         message: 'Project updated by operation leader',
//         project_id,
//         member_id,
//       });
//     }

//     return res.status(403).json({ error: 'Access denied' });
//   } catch (err) {
//     console.error('updateProjectAssignments →', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };

exports.updateProjectAssignments = async (req, res) => {
  try {
    const { uid } = req.user;
    const me = await prisma.team_member.findUnique({ where: { uid } });
    if (!me) {
      return res.status(404).json({ error: 'User not found' });
    }
    const taskId = Number(req.params.id); // Expect the task ID to be passed in the request parameters
    // Expect the task ID and the fields to update in the request body
    const { ops_status, expected_finish_time } = req.body;

    // The task ID is now required to identify the specific task
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Find the task by its ID
    const taskToUpdate = await prisma.today_task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            is_delivered: true, // Still need to check if the related project is delivered
          },
        },
      },
    });

    if (!taskToUpdate) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if the associated project is delivered
    if (taskToUpdate.project && taskToUpdate.project.is_delivered) {
       return res.status(400).json({ error: 'Cannot update task on a delivered project' });
    }

    // If the user is an operation member, ensure they can only update their own task
    if (me.role === 'operation_member') {
      if (taskToUpdate.team_member_id !== me.id) {
        return res.status(403).json({ error: 'Not authorized to update this task' });
      }
      // Update the task assigned to this specific member
      await prisma.today_task.update({
        where: { id: taskId },
        data: {
          ...(expected_finish_time !== undefined && { expected_finish_time }), // Use !== undefined to allow updating to null/empty string if needed
          ...(ops_status !== undefined && { ops_status }), // Use !== undefined
        },
      });

      return res.json({ message: 'Task updated by member', taskId: taskId });
    }

    // If the user is an operation leader, they can update any member's task by its ID
    if (me.role === 'operation_leader') {
      await prisma.today_task.update({
        where: { id: taskId },
        data: {
           ...(expected_finish_time !== undefined && { expected_finish_time }), // Use !== undefined
           ...(ops_status !== undefined && { ops_status }), // Use !== undefined
        },
      });

      return res.json({
        message: 'Task updated by operation leader',
        taskId: taskId,
      });
    }

    // If the user is neither operation_member nor operation_leader
    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('updateProjectAssignments →', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};







// /**
//  * Fetches member distribution records, grouped by project, based on user role.
//  * - Operation Leaders: See all distributions for DELIVERED projects within their team.
//  * - Operation Members (and other non-leader operational roles): See only their own distributions for DELIVERED projects.
//  * A project is considered delivered if 'is_delivered' is true and 'delivery_date' is not null.
//  */
// exports.getAllmemberDistribution = async (req, res) => {
//   try {
//     const { uid } = req.user;
//     if (!uid) {
//       return res.status(401).json({ error: 'User not authenticated' });
//     }

//     const currentUser = await prisma.team_member.findUnique({
//       where: { uid },
//       select: { id: true, role: true, team_id: true },
//     });

//     if (!currentUser) {
//       return res.status(403).json({ error: 'User profile not found' });
//     }
// //or  start with hod_

//     if (!currentUser.role || !currentUser.role.startsWith('operation_')) {
//       return res.status(403).json({ error: 'Access denied. User does not have an operational role.' });
//     }

//     // Define the mandatory delivery condition for projects
//     const projectDeliveryCondition = {
//       is_delivered: true,
//       delivery_date: { not: null },
//     };

//     let whereClause = {};
//     if (currentUser.role === 'operation_leader' ) {
//       if (!currentUser.team_id) {
//         console.warn(`Operation leader ${currentUser.id} (uid: ${uid}) does not have a team_id. No distributions will be fetched.`);
//         return res.status(403).json({ error: 'Access denied. Leader not associated with a team.' });
//       }
//       whereClause = {
//         project: {
//           team_id: currentUser.team_id,
//           ...projectDeliveryCondition, // Spread the delivery conditions
//         },
//       };
//     } else { // Operation Members and other non-leader operational roles
//       whereClause = {
//         team_member_id: currentUser.id,
//         project: {
//           ...projectDeliveryCondition, // Spread the delivery conditions
//         },
//       };
//     }

//     const flatDistributions = await prisma.member_distribution.findMany({
//       where: whereClause,
//       select: {
//         id: true,
//         amount: true,
//         project_id: true,
//         team_member_id: true,
//         team_member: {
//           select: { id: true, first_name: true, last_name: true, email: true, role: true },
//         },
//         project: {
//           select: {
//             id: true,
//             project_name: true, // Added based on schema, uncomment if needed
//             update_at: true,
// after_fiverr_amount: true, // This is likely your 'after_fiverr_amount' as per schema 'after_fiverr_amount Decimal? @db.Decimal(65,0)'
// after_Fiverr_bonus  : true, // This is likely your 'after_Fiverr_bonus' as per schema 'after_Fiverr_bonus Decimal? @db.Decimal(65,0)'
//             deli_last_date: true, // This is likely your 'delivery_date' as per schema 'delivery_date DateTime? @db.Date'
//                                 // but your schema also has 'deli_last_date DateTime? @db.Date'. Clarify which one to use for display.
//                                 // Using 'delivery_date' for filtering logic as per prompt.
//             delivery_date: true, // Selected for display and for sorting logic
//             is_delivered: true,
//             // Add other relevant project fields as per your schema, e.g., project_name
//           },
//         },
//       },
//       orderBy: [
//         { project_id: 'asc' },
//         { project: { update_at: 'desc' } }, // Consider sorting by project.delivery_date if more relevant
//         { team_member_id: 'asc' },
//       ],
//     });

//     if (!flatDistributions || flatDistributions.length === 0) {
//       return res.json([]);
//     }

//     // Grouping logic
//     const groupedByProjectMap = new Map();

//     flatDistributions.forEach(dist => {
//       const projectId = dist.project_id;
//       if (!groupedByProjectMap.has(projectId)) {
//         groupedByProjectMap.set(projectId, {
//           project_id: projectId,
//      client_name: dist.project.project_name.split('-')[0] || null,
//         amount:
//         Number(dist.project.after_fiverr_amount || 0) +
//         Number(dist.project.after_fiverr_bonus || 0),
//           project_details: dist.project,
//           distributions: [],
//         });
//       }

//       groupedByProjectMap.get(projectId).distributions.push({
//         id: dist.id,
//         amount: Number(dist.amount || 0),
//         team_member_id: dist.team_member_id,
//         team_member_details: dist.team_member,
//       });
//     });

//     const groupedByProjectArray = Array.from(groupedByProjectMap.values());

//     // Optional: Sort the final array of projects, e.g., by project's delivery date or last update date
//     groupedByProjectArray.sort((a, b) => {
//       // Sort by project's delivery_date descending, then by update_at as a fallback
//       const dateA = a.project_details.delivery_date ? new Date(a.project_details.delivery_date) : (a.project_details.update_at ? new Date(a.project_details.update_at) : null);
//       const dateB = b.project_details.delivery_date ? new Date(b.project_details.delivery_date) : (b.project_details.update_at ? new Date(b.project_details.update_at) : null);

//       if (!dateA && !dateB) return 0;
//       if (!dateA) return 1;
//       if (!dateB) return -1;
//       return dateB - dateA; // Sort by date descending
//     });

//     return res.json(groupedByProjectArray);

//   } catch (err) {
//     console.error('getAllmemberDistribution Error →', err);
//     return res.status(500).json({ error: 'Internal server error while fetching member distributions.' });
//   }
// };
async function getDepartmentTeamIdsForHOD(hodUserId) {
    // 1. Find the department_id of the HOD user
    const hodTeamMember = await prisma.team_member.findUnique({
        where: { id: hodUserId },
        select: { department_id: true }
    });

    // If the HOD user is not found or not linked to a department, return an empty array
    if (!hodTeamMember || !hodTeamMember.department_id) {
        console.warn(`HOD User ID ${hodUserId} not found or not linked to a department.`);
        return [];
    }

    const departmentId = hodTeamMember.department_id;

    // 2. Find all teams associated with this department_id
    const teamsInDepartment = await prisma.team.findMany({
        where: {
            department_id: departmentId
        },
        select: { id: true } // Select only the team ID
    });

    // 3. Extract and return the team IDs
    return teamsInDepartment.map(team => team.id);
}

exports.getAllmemberDistribution = async (req, res) => {
  try {
    const { uid } = req.user;
    if (!uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await prisma.team_member.findUnique({
      where: { uid },
      select: { id: true, role: true, team_id: true /* You might need to select a department_id here if your schema supports it */ },
    });

    if (!currentUser) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    // Allow roles starting with 'operation_' or 'hod_'
    if (!currentUser.role || (!currentUser.role.startsWith('operation_') && !currentUser.role.startsWith('hod_'))) {
      return res.status(403).json({ error: 'Access denied. User does not have an authorized operational or HOD role.' });
    }

    // Define the mandatory delivery condition for projects
    const projectDeliveryCondition = {
      is_delivered: true,
      delivery_date: { not: null },
    };

    let whereClause = {};

    if (currentUser.role === 'operation_leader') {
      // Operation Leaders still require a single team_id
      if (!currentUser.team_id) {
        console.warn(`Operation leader ${currentUser.id} (uid: ${uid}) does not have a team_id. No distributions will be fetched.`);
        return res.status(403).json({ error: 'Access denied. Leader not associated with a team.' });
      }
      whereClause = {
        project: {
          team_id: currentUser.team_id, // Filter by the leader's single team_id
          ...projectDeliveryCondition,
        },
      };
    } else if (currentUser.role.startsWith('hod_')) {
       // HODs need to see distributions for ALL teams in their department
       // >>>>>>>>>>>>>> START: HOD Specific Logic <<<<<<<<<<<<<<
       // You need to implement this function/logic based on your database schema
       // This function should take the HOD's user ID (or department ID) and return
       // an array of team IDs belonging to their department.
       const teamIdsForDepartment = await getDepartmentTeamIdsForHOD(currentUser.id /* or currentUser.department_id */); // Placeholder

       if (!teamIdsForDepartment || teamIdsForDepartment.length === 0) {
           console.warn(`HOD ${currentUser.id} (uid: ${uid}) is not associated with any teams in a department.`);
           return res.status(403).json({ error: 'Access denied. HOD not associated with any teams in a department.' });
       }

       whereClause = {
           project: {
               team_id: { in: teamIdsForDepartment }, // Filter by the list of team IDs
               ...projectDeliveryCondition,
           },
       };
       // >>>>>>>>>>>>>> END: HOD Specific Logic <<<<<<<<<<<<<<

    } else { // Operation Members and other non-leader operational roles
      whereClause = {
        team_member_id: currentUser.id, // Filter by the member's own ID
        project: {
          ...projectDeliveryCondition,
        },
      };
    }

    const flatDistributions = await prisma.member_distribution.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        project_id: true,
        team_member_id: true,
        team_member: {
          select: { id: true, first_name: true, last_name: true, email: true, role: true },
        },
        project: {
          select: {
            id: true,
            project_name: true,
            update_at: true,
            after_fiverr_amount: true,
            after_Fiverr_bonus: true,
            deli_last_date: true,
            delivery_date: true,
            is_delivered: true,
          },
        },
      },
      orderBy: [
        { project_id: 'asc' },
        { project: { update_at: 'desc' } },
        { team_member_id: 'asc' },
      ],
    });

    if (!flatDistributions || flatDistributions.length === 0) {
      return res.json([]);
    }

    // Grouping logic (remains the same - grouping by project)
    const groupedByProjectMap = new Map();

    flatDistributions.forEach(dist => {
      const projectId = dist.project_id;
      if (!groupedByProjectMap.has(projectId)) {
        groupedByProjectMap.set(projectId, {
          project_id: projectId,
          client_name: dist.project.project_name ? dist.project.project_name.split('-')[0] : null,
          amount:
          Number(dist.project.after_fiverr_amount || 0) +
          Number(dist.project.after_Fiverr_bonus || 0),
          project_details: dist.project,
          distributions: [],
        });
      }

      groupedByProjectMap.get(projectId).distributions.push({
        id: dist.id,
        amount: Number(dist.amount || 0),
        team_member_id: dist.team_member_id,
        team_member_details: dist.team_member,
      });
    });

    const groupedByProjectArray = Array.from(groupedByProjectMap.values());

    // Optional: Sort the final array of projects
    groupedByProjectArray.sort((a, b) => {
      const dateA = a.project_details.delivery_date ? new Date(a.project_details.delivery_date) : (a.project_details.update_at ? new Date(a.project_details.update_at) : null);
      const dateB = b.project_details.delivery_date ? new Date(b.project_details.delivery_date) : (b.project_details.update_at ? new Date(b.project_details.update_at) : null);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
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
            project_name: true, // Matching the select from getAllmemberDistribution
            update_at: true,
            delivery_date: true, // Matching the select
            is_delivered: true, // Matching the select
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





exports.getOperationsDashboard = async (req, res) => {
  try {
    const { uid } = req.user; // Get the user's UID from the request object. Assumes auth middleware sets req.user.uid
    console.log('User UID:', uid);

    const today = new Date();
    console.log('Today (start of day):', today);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Set to the beginning of tomorrow (00:00:00)
    console.log('Tomorrow (start of day):', tomorrow);

    // 1. Get the current user's team_id, role, and department information
    const currentUser = await prisma.team_member.findUnique({
      where: { uid: uid },
      select: { team_id: true, role: true, department: { select: { department_name: true, id: true } } },
    });
    console.log('Current User:', currentUser);

    // Basic authorization check: Must be an operation role (corrected role string: 'operation_leader' with underscore)
    if (!currentUser || (currentUser.role !== 'operation_leader' && currentUser.role !== 'operation_member')) {
      return res.status(403).json({ message: 'Unauthorized access or not an operation team member.' });
    }

    // Sales Department Exclusion: No access for Sales department members (standardizing 'Sales' capitalization)
    if (currentUser.department && currentUser.department.department_name === 'Sales') {
        return res.status(403).json({ message: 'Sales department members do not have access to this dashboard.' });
    }

    const userTeamId = currentUser.team_id;

    let teamIdsToQuery;
    // Corrected role string in this conditional check as well: 'operation_leader' with underscore
    if (currentUser.role === 'operation_leader') {
      // If operation-leader, they can see data for all teams within their department (excluding Sales dept teams)
      const departmentTeams = await prisma.team.findMany({
        where: {
            department: {
                id: currentUser.department?.id, // Filter by their department ID
                NOT: { department_name: 'Sales' } // Ensure the team is not in the Sales department (standardizing 'Sales' capitalization)
            }
        },
        select: { id: true }, // Select only the team IDs
      });
      teamIdsToQuery = departmentTeams.map(team => team.id);
    } else {
      // If operation_member, they can only see data for their own team
      teamIdsToQuery = [userTeamId];
    }
    console.log('Teams to Query:', teamIdsToQuery);

    // --- Query for Today Assign ---
    const todayAssignRaw = await prisma.project.groupBy({ // Renamed to _Raw for clarity in aggregation
      by: ['team_id'],
      where: {
        Assigned_date: {
          gte: today,
          lt: tomorrow,
        },
        team_id: { in: teamIdsToQuery },
        department: { NOT: { department_name: 'Sales' } } // Standardizing 'Sales' capitalization
      },
      _sum: {
        after_fiverr_amount: true,
        bonus: true,
        after_Fiverr_bonus: true,
      },
      _count: {
        id: true,
      },
    });

    let totalTodayAssignAmount = 0;
    todayAssignRaw.forEach(item => {
        const afterFiverr = item._sum.after_fiverr_amount ? item._sum.after_fiverr_amount.toNumber() : 0;
        const bonus = item._sum.bonus ? item._sum.bonus.toNumber() : 0;
        const afterFiverrBonus = item._sum.after_Fiverr_bonus ? item._sum.after_Fiverr_bonus.toNumber() : 0;
        totalTodayAssignAmount += afterFiverr + bonus + afterFiverrBonus;
    });
    // Format to a whole number string as requested
    const formattedTodayAssign = totalTodayAssignAmount.toFixed(0);
    console.log('Formatted Today Assign (Total Amount):', formattedTodayAssign);


    // --- Query for Today Cancel ---
    const todayCancelRaw = await prisma.project.groupBy({ // Renamed to _Raw for clarity in aggregation
      by: ['team_id'],
      where: {
        update_at: {
          gte: today,
          lt: tomorrow,
        },
        status: 'Cancelled',
        team_id: { in: teamIdsToQuery },
        department: { NOT: { department_name: 'Sales' } } // Standardizing 'Sales' capitalization
      },
      _count: {
        id: true,
      },
    });

    let totalTodayCancelCount = 0;
    todayCancelRaw.forEach(item => {
        totalTodayCancelCount += item._count.id;
    });
    const formattedTodayCancel = totalTodayCancelCount; // Keeping as number, not array
    console.log('Formatted Today Cancel (Total Count):', formattedTodayCancel);


    // --- Query for Today Delivery ---
    const todayDeliveryRaw = await prisma.project.groupBy({ // Renamed to _Raw for clarity in aggregation
      by: ['team_id'],
      where: {
        delivery_date: {
          gte: today,
          lt: tomorrow,
        },
        is_delivered: true,
        team_id: { in: teamIdsToQuery },
        department: { NOT: { department_name: 'Sales' } } // Standardizing 'Sales' capitalization
      },
      _sum: {
        after_fiverr_amount: true,
        bonus: true,
        after_Fiverr_bonus: true,
      },
      _count: {
        id: true,
      },
    });

    let totalTodayDeliveryAmount = 0;
    todayDeliveryRaw.forEach(item => {
        const afterFiverr = item._sum.after_fiverr_amount ? item._sum.after_fiverr_amount.toNumber() : 0;
        const bonus = item._sum.bonus ? item._sum.bonus.toNumber() : 0;
        const afterFiverrBonus = item._sum.after_Fiverr_bonus ? item._sum.after_Fiverr_bonus.toNumber() : 0;
        totalTodayDeliveryAmount += afterFiverr + bonus + afterFiverrBonus;
    });
    const formattedTodayDelivery = totalTodayDeliveryAmount.toFixed(0);
    console.log('Formatted Today Delivery (Total Amount):', formattedTodayDelivery);


    // --- Query for Total Submit ---
    const totalSubmitRaw = await prisma.project.groupBy({ // Renamed to _Raw for clarity in aggregation
      by: ['team_id'],
      where: {
        status: 'Submitted',
        team_id: { in: teamIdsToQuery },
        department: { NOT: { department_name: 'Sales' } } // Standardizing 'Sales' capitalization
      },
      _count: {
        id: true,
      },
    });

    let totalSubmittedCount = 0;
    totalSubmitRaw.forEach(item => {
        totalSubmittedCount += item._count.id;
    });
    const formattedTotalSubmit = totalSubmittedCount; // Keeping as number
    console.log('Formatted Total Submit (Total Count):', formattedTotalSubmit);


    // --- Query for Total Short Time ---
    const totalShortTimeProjects = await prisma.project.findMany({
      where: {
        team_id: { in: teamIdsToQuery },
        department: { NOT: { department_name: 'Sales' } },
        deli_last_date: {
          gte: today, // Only consider projects where delivery date is today or in the future
        },
        is_delivered: false, // <--- ADDED THIS LINE: Exclude already delivered projects
      },
      select: {
        team_id: true,
        project_name: true,
        Assigned_date: true,
        deli_last_date: true,
        after_fiverr_amount: true,
        bonus: true,
        after_Fiverr_bonus: true,
      },
    });

    let totalShortTimeProjectCount = 0;
    let totalShortTimeSumAmount = 0;
    const SHORT_TIME_THRESHOLD_DAYS = 3; // Define your threshold for "short time" here (e.g., within the next 3 days)

    totalShortTimeProjects.forEach(project => {
      if (project.deli_last_date) { // Only proceed if deli_last_date exists
        const deliveryLastDate = new Date(project.deli_last_date);
        
        // Calculate the difference in days between TODAY (start of day) and deli_last_date
        const diffTime = deliveryLastDate.getTime() - today.getTime(); 
        // Convert milliseconds to days, rounding up. e.g., 2025-05-23 (deli) - 2025-05-21 (today) = 2 days
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        // A project is "short time" if its delivery date is within the next SHORT_TIME_THRESHOLD_DAYS (inclusive of today)
        // diffDays >= 0 ensures we only count current/future projects.
        // diffDays <= SHORT_TIME_THRESHOLD_DAYS defines the window.
        if (diffDays >= 0 && diffDays <= SHORT_TIME_THRESHOLD_DAYS) { 
          const afterFiverr = project.after_fiverr_amount ? project.after_fiverr_amount.toNumber() : 0;
          const bonus = project.bonus ? project.bonus.toNumber() : 0;
          const afterFiverrBonus = project.after_Fiverr_bonus ? project.after_Fiverr_bonus.toNumber() : 0;
          const totalAmount = afterFiverr + bonus + afterFiverrBonus;

          totalShortTimeProjectCount++;
          totalShortTimeSumAmount += totalAmount;
        }
      }
    });

    // Format totalShortTime as an object with count and amount
    const formattedTotalShortTime = {
        project_count: totalShortTimeProjectCount,
        total_amount: totalShortTimeSumAmount.toFixed(0),
    };
    console.log('Formatted Total Short Time:', formattedTotalShortTime);


    // Send the aggregated data as a JSON response
    res.status(200).json({
      todayAssign: formattedTodayAssign,
      todayCancel: formattedTodayCancel,
      todayDelivery: formattedTodayDelivery,
      totalSubmit: formattedTotalSubmit,
      totalShortTime: formattedTotalShortTime,
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  } finally {
    // It's generally good practice to disconnect Prisma client in a serverless function
    // or if you want to explicitly manage connections. For a long-running Node.js app,
    // you might not need to disconnect on every request if Prisma is global.
    // await prisma.$disconnect();
  }
};