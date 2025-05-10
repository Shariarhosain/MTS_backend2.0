


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

