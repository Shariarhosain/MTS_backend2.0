// const { PrismaClient } = require('@prisma/client');
// const generateToken = require('../config/generateToken');  // Adjust path to your token generator

// const prisma = new PrismaClient();
// const fs = require('fs');
// const path = require('path');



// // exports.getTodayTask = async (req, res) => {
// //   try {
// //      const uid = req.user.uid; // Assuming you have user ID in the request object
 
// //      // search from uid roll start with operation_ then allow to access. show client name from today_task table, send as last_update as project table update_at filter by project  from today_task table,show all list of member if his role is operation_leader from his team_id he belongs to(send as array of object), show expected_finish_time from today_task table, show ops_status from project table belong to project id from tofay task table with connected with this team id.  can be multiple today_task belong to that team_id. also only show is_delivered = false from project table by project id from today_task table. 

// //      // if user operation_member then show all except only his task by teamMember_id from today_task table. like clientName, lastupdate, expected_finish_time, ops_status from project table by project id from today_task table. also only show is_delivered = false from project table by project id from today_task table. and also show his staus he made  from ops_status table by teamMember_id from today_task table.

      
// //           const user = await prisma.team_member.findUnique({
// //             where: { uid },
// //             include: { team: true },
// //           });
      
// //           if (!user || !user.role?.startsWith('operation_')) {
// //             return res.status(403).json({ error: 'Access denied' });
// //           }
      
// //           const isLeader = user.role === 'operation_leader';
// //           const teamId = user.team_id;
      
// //           const todayTasks = await prisma.today_task.findMany({
// //             where: {
// //               team_id: teamId,
// //               project: { is_delivered: false },
// //               ...(isLeader ? {} : {
// //                 team_member: {
// //                   some: { id: user.id }
// //                 }
// //               }),
// //             },
// //             include: {
// //               project: true,
// //               team_member: true,
// //             },
// //           });
      
// //           let teamMembers = [];
// //           if (isLeader) {
// //             teamMembers = await prisma.team_member.findMany({
// //               where: { team_id: teamId },
// //               select: {
// //                 id: true,
// //                 first_name: true,
// //                 last_name: true,
// //                 email: true,
// //                 role: true,
// //               },
// //             });
// //           }
      
// //           const response = todayTasks.map(task => ({
// //             client_name: task.client_name,
// //             expected_finish_time: task.expected_finish_time,
// //             last_update: task.project?.update_at,
// //             ops_status: task.project?.ops_status,
// //             ...(isLeader ? { team_members: teamMembers } : {})
// //           }));
      
// //           return res.status(200).json(response);
      
// //         } catch (error) {
// //           console.error('Error fetching today tasks:', error);
// //           return res.status(500).json({ error: 'Internal server error' });
// //         }
// //       };
      


// exports.getTodayTask = async (req, res) => {
//     try {
//       const uid = req.user.uid;
  
//       const user = await prisma.team_member.findUnique({
//         where: { uid },
//         include: { team: true },
//       });
  
//       if (!user || !user.role?.startsWith('operation_')) {
//         return res.status(403).json({ error: 'Access denied' });
//       }
  
//       const teamId = user.team_id;
  
//       // === For Operation Leader ===
//       if (user.role === 'operation_leader') {
//         const todayTasks = await prisma.today_task.findMany({
//           where: {
//             team_id: teamId,
//             project: {
//               is_delivered: false,
//             },
//           },
//           include: {
//             project: true,
//             team_member: true, // ✅ Fix: Include team members
//           },
//           orderBy: {
//             project: {
//               update_at: 'desc',
//             },
//           },
//         });
  
//         const teamMembers = await prisma.team_member.findMany({
//           where: { team_id: teamId },
//           select: {
//             id: true,
//             first_name: true,
//             last_name: true,
//             email: true,
//             role: true,
//           },
//         });
  
//         const response = todayTasks.map(task => ({
//           client_name: task.client_name,
//           expected_finish_time: task.expected_finish_time,
//           last_update: task.project?.update_at,
//           ops_status: task.project?.ops_status,
//           team_members: task.team_member?.map(member => ({
//             id: member.id,
//             first_name: member.first_name,
//             last_name: member.last_name,
//             email: member.email,
//             role: member.role,
//           })) || [],
//         }));
  
//         return res.status(200).json({
//           tasks: response,
//           team_members: teamMembers,
//         });
//       }
  
//       // === For Operation Member ===
//       const allTeamTasks = await prisma.today_task.findMany({
//         where: {
//           team_id: teamId,
//           project: {
//             is_delivered: false,
//           },
//           NOT: {
//             team_member: {
//               some: { id: user.id },
//             },
//           },
//         },
//         include: {
//           project: true,
//           team_member: true, // ✅ Needed to show assigned members
//         },
//         orderBy: {
//           project: {
//             update_at: 'desc',
//           },
//         },
//       });
  
//       const myAssignedTasks = await prisma.today_task.findMany({
//         where: {
//           team_id: teamId,
//           team_member: {
//             some: { id: user.id },
//           },
//           project: {
//             is_delivered: false,
//           },
//         },
//       });
  
//       const myProjectIds = myAssignedTasks.map(task => task.project_id);
  
//       const myStatuses = await prisma.ops_status.findMany({
//         where: {
//           project_id: { in: myProjectIds },
//           team_member_id: user.id,
//         },
//         select: {
//           project_id: true,
//           status: true,
//         },
//       });
  
//       const statusMap = Object.fromEntries(myStatuses.map(s => [s.project_id, s.status]));
  
//       const response = allTeamTasks.map(task => ({
//         client_name: task.client_name,
//         expected_finish_time: task.expected_finish_time,
//         last_update: task.project?.update_at,
//         ops_status: task.project?.ops_status,
//         team_members: task.team_member?.map(member => ({
//           id: member.id,
//           first_name: member.first_name,
//           last_name: member.last_name,
//           email: member.email,
//           role: member.role,
//         })) || [],
//       }));
  
//       return res.status(200).json({
//         tasks: response,
//         my_statuses: statusMap,
//       });
  
//     } catch (error) {
//       console.error('Error fetching today tasks:', error);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//   };
  
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// exports.getTodayTask = async (req, res) => {
//   try {
//     const uid = req.user.uid;

//     const user = await prisma.team_member.findUnique({
//       where: { uid },
//       include: { team: true },
//     });

//     if (!user || !user.role?.startsWith('operation_')) {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     const teamId = user.team_id;

//     // === For Operation Leader ===
//     if (user.role === 'operation_leader') {
//       const todayTasks = await prisma.today_task.findMany({
//         where: {
//           team_id: teamId,
//           project: {
//             is_delivered: false,
//           },
//         },
//         include: {
//           project: true,
//           team_member: true, // ✅ Include assigned team members
//         },
//         orderBy: {
//           project: {
//             update_at: 'desc',
//           },
//         },
//       });

//       console.log(todayTasks, 'todayTasks');
//       const teamMembers = await prisma.team_member.findMany({
//         where: { team_id: teamId },
//         select: {
//           id: true,
//           first_name: true,
//           last_name: true,
//           email: true,
//           role: true,
//         },
//       });

//       const response = todayTasks.map(task => ({
//         project_id: task.project_id,
//         client_name: task.client_name,
//         expected_finish_time: task.expected_finish_time,
//         last_update: task.project?.update_at,
//         ops_status: task.project?.ops_status,
//         deli_last_date: task.project?.deli_last_date,
//         assign: task.team_member?.map(member => ({
//           id: member.id,
//           first_name: member.first_name,
//           last_name: member.last_name,
//           email: member.email,
//           role: member.role,
//         })) || [],
//       }));

//       return res.status(200).json({
//         tasks: response,
//         team_members: teamMembers,
//       });
//     }

//     // === For Operation Member ===
//     const allTeamTasks = await prisma.today_task.findMany({
//         where: {
//           team_id: teamId,
//           project: {
//             is_delivered: false,
//           },
//           team_member: {
//             some: { id: user.id } // Use `some` to check if the user is assigned to the task
//           },
//         },
//         include: {
//           project: true,
//           team_member: true, // ✅ Needed to show assigned members
//         },
//         orderBy: {
//           project: {
//             update_at: 'desc',
//           },
//         },
//       });
      
//     console.log(allTeamTasks, 'allTeamTasks');

//     const myAssignedTasks = await prisma.today_task.findMany({
//       where: {
//         team_id: teamId,
//         team_member: {
//           some: { id: user.id },
//         },
//         project: {
//           is_delivered: false,
//         },
//       },
//     });

//     const myProjectIds = myAssignedTasks.map(task => task.project_id);

//     const myStatuses = await prisma.project.findMany({
//       where: {
//         id: { in: myProjectIds },
//       },
//       select: {
//         id: true,
//         ops_status: true,
//       },
//     });

//     const statusMap = Object.fromEntries(myStatuses.map(s => [s.project_id, s.status]));

//     const response = allTeamTasks.map(task => {
//         // Filter the team members assigned to the current task
//         const assignedMembers = task.team_member?.filter(member => {
//           // Ensure that the team member is assigned to this task (based on some relation or condition)
//           return member.id === user.id || member.is_assigned;
//         }) || [];
      
//         return {
//           project_id: task.project_id,
//           client_name: task.client_name,
//           expected_finish_time: task.expected_finish_time,
//           last_update: task.project?.update_at,
//           ops_status: task.project?.ops_status,
//           deli_last_date: task.project?.deli_last_date,
//           assign: assignedMembers.map(member => ({
//             id: member.id,
//             first_name: member.first_name,
//             last_name: member.last_name,
//             email: member.email,
//             role: member.role,
//           })) || [],
//         };
//       });

//     return res.status(200).json({
//       tasks: response,
//       my_statuses: statusMap,
//     });

//   } catch (error) {
//     console.error('Error fetching today tasks:', error);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };

// // Update project assignments and details based on the user's role
// exports.updateProjectAssignments = async (req, res) => {
//   try {
//     const uid = req.user.uid;
//     const { project_id, team_member_ids, expected_finish_time, ops_status } = req.body;

//     // Validate required fields
//     if (!project_id || (team_member_ids && !Array.isArray(team_member_ids))) {
//       return res.status(400).json({ error: 'project_id and team_member_ids (array) are required' });
//     }

//     const user = await prisma.team_member.findUnique({ where: { uid } });
//     if (!user) return res.status(404).json({ error: 'User not found' });

//     const project = await prisma.project.findUnique({
//       where: { id: project_id },
//       include: {
//         team: {
//             include: {
//                 team_member: true, // Include team members for validation
//             },
//         },
//       },
//     });

//     if (!project) {
//       return res.status(404).json({ error: 'Project not found' });
//     }

//     // === For Operation Leader ===
//     if (user.role === 'operation_leader') {
//       if (team_member_ids) {
//         // Update assigned team members
//         await prisma.project.update({
//           where: { id: project_id },
//           data: {
//            team:{
//             update: {
//               team_member: {
//                 connect: team_member_ids.map(id => ({ id })), // Connect new members
//               },
//             },
//            },
//             ...(ops_status && { ops_status }),
//           },
//         });
//       } else {
//         // Only update expected_finish_time and ops_status
//         await prisma.project.update({
//           where: { id: project_id },
//           data: {
//             ...(expected_finish_time && { expected_finish_time }),
//             ...(ops_status && { ops_status }),
//           },
//         });
//       }

//       return res.status(200).json({
//         message: 'Project updated successfully by operation leader',
//         project_id,
//         updated_team_members: team_member_ids,
//         expected_finish_time,
//         ops_status,
//       });
//     }

//     // === For Operation Member ===
//     if (user.role === 'operation_member') {
//       // Check if the operation member is assigned to the project
//       const assignedTask = await prisma.today_task.findUnique({
//         where: {
//           project_id_team_member_id: {
//             project_id: project_id,
//             team_member_id: user.id,
//           },
//         },
//       });

//       if (!assignedTask) {
//         return res.status(403).json({ error: 'You are not assigned to this project' });
//       }

//       // Operation member can only update their ops_status and expected_finish_time
//       await prisma.project.update({
//         where: { id: project_id },
//         data: {
//           ...(expected_finish_time && { expected_finish_time }),  // Only if provided
//           ...(ops_status && { ops_status }),  // Only if provided
//         },
//       });

//       return res.status(200).json({
//         message: 'Project updated successfully by operation member',
//       });
//     }

//     // Access denied for other roles
//     return res.status(403).json({ error: 'Access denied' });
//   } catch (error) {
//     console.error('Error updating project assignments:', error);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };

// controllers/todayTask.js
// controllers/todayTaskController.js
// controllers/todayTaskController.js
// controllers/todayTaskController.js
// controllers/todayTaskController.js
// controllers/todayTaskController.js
// controllers/todayTaskController.js




const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ──────────────────────────────────────────────────────────────────────────
 * GET /today‑tasks  (unchanged)
 * ──────────────────────────────────────────────────────────────────────── */
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
          ? { ...row.team_member, ops_status: row.ops_status }
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

/* ──────────────────────────────────────────────────────────────────────────
 * POST /projects/assign   (leader)   or   /projects/update   (member)
 * ──────────────────────────────────────────────────────────────────────── */
// exports.updateProjectAssignments = async (req, res) => {
//   try {
//     const { uid } = req.user;
//     const me = await prisma.team_member.findUnique({ where: { uid } });
//     if (!me) return res.status(404).json({ error: 'User not found' });

//     const project_id = req.body.project_id;
//     if (!project_id)
//       return res.status(400).json({ error: 'project_id is required' });

//     const project = await prisma.project.findUnique({
//       where: { id: project_id },
//       select: { team_id: true, is_delivered: true },
//     });
//     if (!project)      return res.status(404).json({ error: 'Project not found' });
//     if (project.is_delivered)
//       return res.status(400).json({ error: 'Project already delivered' });

//     const expected_finish_time = req.body.expected_finish_time;
//     const ops_status           = req.body.ops_status;

//     /* ─────────────── LEADER ─────────────── */
//     if (me.role === 'operation_leader') {
//       const team_member_ids   = Array.isArray(req.body.team_member_ids)
//                                 ? req.body.team_member_ids : [];
//       const target_member_ids = Array.isArray(req.body.target_member_ids)
//                                 ? req.body.target_member_ids : [];

//       /* validation */
//       const allIds = [...team_member_ids, ...target_member_ids];
//       if (allIds.length) {
//         const ok = await prisma.team_member.count({
//           where: { id: { in: allIds }, team_id: project.team_id },
//         });
//         if (ok !== allIds.length)
//           return res.status(400).json({ error: 'One or more IDs not in team' });
//       }

//       /* need target_member_ids when changing status/date */
//       if ((ops_status || expected_finish_time) && !target_member_ids.length) {
//         return res
//           .status(400)
//           .json({ error: 'target_member_ids is required to update status or date' });
//       }

//       /* fetch parent row for client_name */
//       const parentRow = await prisma.today_task.findFirst({
//         where: { project_id, team_member_id: null },
//         select: { client_name: true },
//       });
//       if (!parentRow)
//         return res.status(404).json({ error: 'Parent today_task row not found' });

//       const tx = [];

//       /* A) replace assignees if list supplied */
//       if (team_member_ids.length) {
//         tx.push(
//           prisma.today_task.deleteMany({
//             where: { project_id, NOT: { team_member_id: null } },
//           })
//         );
//         team_member_ids.forEach(id =>
//           tx.push(
//             prisma.today_task.create({
//               data: {
//                 project_id,
//                 team_id: project.team_id,
//                 team_member_id: id,
//                 client_name: parentRow.client_name,
//                 expected_finish_time,
//                 ops_status,
//               },
//             })
//           )
//         );
//       }

//       /* B) update only the specified member rows */
//       if (target_member_ids.length) {
//         tx.push(
//           prisma.today_task.updateMany({
//             where: {
//               project_id,
//               team_member_id: { in: target_member_ids },
//             },
//             data: {
//               ...(expected_finish_time && { expected_finish_time }),
//               ...(ops_status && { ops_status }),
//             },
//           })
//         );
//       }

//       await prisma.$transaction(tx);

//       return res.json({
//         message: 'Leader update complete',
//         project_id,
//         ...(team_member_ids.length   && { team_member_ids }),
//         ...(target_member_ids.length && { target_member_ids }),
//       });
//     }

//     /* ─────────────── MEMBER ─────────────── */
//     if (me.role === 'operation_member') {
//       const mine = await prisma.today_task.findFirst({
//         where: { project_id, team_member_id: me.id },
//       });
//       if (!mine) return res.status(403).json({ error: 'Not your project' });

//       await prisma.today_task.update({
//         where: { id: mine.id },
//         data: {
//           ...(expected_finish_time && { expected_finish_time }),
//           ...(ops_status && { ops_status }),
//         },
//       });

//       return res.json({ message: 'Updated by member', project_id });
//     }

//     return res.status(403).json({ error: 'Access denied' });
//   } catch (err) {
//     console.error('updateProjectAssignments →', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };
// API for assigning team members to a project
exports.assignProjectToTeam = async (req, res) => {
  try {
    const { uid } = req.user;
    const me = await prisma.team_member.findUnique({ where: { uid } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const project_id = req.body.project_id;
    const team_member_ids = req.body.team_member_ids;

    if (!project_id || !team_member_ids || !Array.isArray(team_member_ids) || !team_member_ids.length)
      return res.status(400).json({ error: 'Invalid project_id or team_member_ids' });

    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const parentRow = await prisma.today_task.findFirst({
      where: { project_id, team_member_id: null },
      select: { client_name: true },
    });
    if (!parentRow)
      return res.status(404).json({ error: 'Parent task not found' });

    const tx = [];

    // Add new task rows for each new team member
    team_member_ids.forEach(id => {
      tx.push(
        prisma.today_task.create({
          data: {
            project_id,
            team_id: project.team_id,
            team_member_id: id,
            client_name: parentRow.client_name,
          },
        })
      );
    });

    await prisma.$transaction(tx);

    return res.json({
      message: 'New team members assigned successfully',
      project_id,
      team_member_ids,
    });
  } catch (err) {
    console.error('assignProjectToTeam →', err);
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

