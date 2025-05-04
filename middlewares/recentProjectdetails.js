const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emitRecentProject(io) {
  const currentDate = new Date();

  const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
  const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          {
            date: {
              gte: startOfCurrentMonth,
              lte: endOfCurrentMonth,
            },
          },
          {
            delivery_date: {
              gte: startOfCurrentMonth,
              lte: endOfCurrentMonth,
            },
          },
          {
            status: {
              in: ['revision', 'realrevision'],
            },
          },
        ],
      },
      include: {
        department: true,
        team: true,
        team_member: true,
        profile: true,
      },
    });

    const departmentMap = new Map();
    const teamMap = new Map();
    const salesMap = new Map();
    const profileMap = new Map();
    const statusSet = new Set();

    projects.forEach(project => {
      if (project.department) {
        departmentMap.set(project.department.id, project.department.department_name);
      }
      if (project.team) {
        teamMap.set(project.team.id, project.team.team_name);
      }
      if (project.team_member) {
        salesMap.set(project.team_member.id, project.team_member.first_name);
      }
      if (project.profile) {
        profileMap.set(project.profile.id, project.profile.profile_name);
      }
      if (project.status) {
        statusSet.add(project.status);
      }
    });

    const result = [
      [
        {department: Array.from(departmentMap, ([id, name]) => ({ id, name }))},
      ],
      [
        {team: Array.from(teamMap, ([id, name]) => ({ id, name }))},
      ],
      [
        {sales_member: Array.from(salesMap, ([id, name]) => ({ id, name }))},
      ],
      [
        {status: [...statusSet]},
      ],
      [
        {profile: Array.from(profileMap, ([id, name]) => ({ id, name }))},
      ],
    ];

    io.emit('recentProjectsData', result);
    console.log('Recent Projects with ID + Name:', result);

  } catch (err) {
    console.error('[Socket] Failed to emit recent projects:', err);
  }
}

module.exports = emitRecentProject;
