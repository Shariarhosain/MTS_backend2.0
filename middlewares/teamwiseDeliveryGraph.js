const { PrismaClient } = require('@prisma/client');
const { io } = require('socket.io-client');
const prisma = new PrismaClient();


async function teamwiseDeliveryGraph(io) {
    //show team wise total  delivery amout( after fiverr amount) group by team name
    try {
        const projects = await prisma.project.findMany({
            where: {
                is_delivered: true,
            },
            include: {
                team: true,
            },
        });

        const teamWiseDelivery = projects.reduce((acc, project) => {
            const teamName = project.team ? project.team.team_name : 'Unknown Team';
            const amount = parseInt(project.after_fiverr_amount) + (parseInt(project.after_Fiverr_bonus) || 0) || 0;

            if (!acc[teamName]) {
                acc[teamName] = 0;
            }
            acc[teamName] += amount;
            return acc;
        }, {});

        io.emit("teamwiseDeliveryGraph", teamWiseDelivery); // Emit the data to the socket
        res.status(200).json(teamWiseDelivery);
    } catch (error) {
        console.error('Error fetching team-wise delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }



}

// async function eachTeamChart(io) {
//   try {
//     /* 1️⃣ ইউজারের আইডি + রোল */
//     const me = await prisma.team_member.findUnique({
//       where: { uid: global.user.uid },
//       select: { id: true, role: true, first_name: true, team_id: true },
//     });
//     if (!me) return console.log('User not found');

//     const isSalesLeader = me.role === 'sales_leader';
//     const isSales = me.role?.startsWith('sales_') && !isSalesLeader;
//     const isOperation = me.role?.startsWith('operation_');

//     const today = new Date();
//     const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

//     /* SALES PATH */
//     if (isSales || isSalesLeader) {
//       let orderByIds = isSalesLeader
//         ? (await prisma.team_member.findMany({
//             where: { team_id: me.team_id, role: { startsWith: 'sales_' } },
//             select: { id: true },
//           })).map(m => m.id).concat(me.id)
//         : [me.id];

//       const projectsThisMonth = await prisma.project.findMany({
//         where: {
//           ordered_by: { in: orderByIds },
//           OR: [
//             { is_delivered: true },
//             {
//               AND: [
//                 { is_delivered: false },
//                 { delivery_date: { gte: startOfMonth } },
//               ],
//             },
//           ],
//         },
//       });

//       const projectsNotDelivered = await prisma.project.findMany({
//         where: {
//           ordered_by: { in: orderByIds },
//           is_delivered: false,
//         },
//       });

//       const teamData = await prisma.team.findUnique({
//         where: { id: me.team_id },
//         select: {
//           team_target: true,
//           team_name: true,
//           team_member: { select: { id: true, first_name: true, target: true } },
//         },
//       });

//       let teamTarget = Number(teamData.team_target || 0);
//       let teamAchievement = 0,
//         teamCancelled = 0,
//         teamTotalCarry = 0,
//         submitted = 0,
//         totalAssign = 0;

//       projectsThisMonth.forEach(p => {
//         if (p.is_delivered) {
//           teamAchievement += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       projectsNotDelivered.forEach(p => {
//         teamTotalCarry += Number(p.total_carry || 0);
//         if (p.status === 'submitted') {
//           submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         if (p.status === 'cancelled') {
//           teamCancelled += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         totalAssign += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//       });

//       let memberTarget = [];

//       if (isSalesLeader) {
//         const memberIds = teamData.team_member.map(m => m.id);

//         const memberProjects = await prisma.project.findMany({
//           where: {
//             ordered_by: { in: memberIds },
//             OR: [
//               { is_delivered: true },
//               {
//                 AND: [
//                   { is_delivered: false },
//                   { delivery_date: { gte: startOfMonth } },
//                 ],
//               },
//             ],
//           },
//         });

//         memberTarget = teamData.team_member.map(m => ({
//           memberName: m.first_name,
//           target: m.target || 0,
//           earned: memberProjects
//             .filter(p => p.ordered_by === m.id)
//             .reduce(
//               (s, p) =>
//                 s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0),
//               0
//             ),
//         }));
//       } else {
//         const myProjects = await prisma.project.findMany({
//           where: {
//             ordered_by: me.id,
//             OR: [
//               { is_delivered: true },
//               {
//                 AND: [
//                   { is_delivered: false },
//                   { delivery_date: { gte: startOfMonth } },
//                 ],
//               },
//             ],
//           },
//         });

//         const myTarget = teamData.team_member.find(m => m.id === me.id)?.target || 0;
//         const myEarned = myProjects.reduce(
//           (s, p) =>
//             s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0),
//           0
//         );

//         memberTarget = [
//           {
//             memberName: me.first_name || 'You',
//             target: myTarget,
//             earned: myEarned,
//           },
//         ];
//       }

//       const weeks = [
//         { week: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth(), 7) },
//         { week: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8), end: new Date(today.getFullYear(), today.getMonth(), 14) },
//         { week: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15), end: new Date(today.getFullYear(), today.getMonth(), 21) },
//         { week: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22), end: endOfMonth },
//       ];

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
//         week,
//         range: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
//         target: Math.round(teamTarget / 4),
//         amount: projectsThisMonth
//           .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
//           .reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0),
//       }));

//       io.emit('eachTeamChart', {
//         teamTarget,
//         teamAchievement,
//         teamCancelled,
//         teamTotalCarry,
//         submitted,
//         totalAssign,
//         teamName: teamData.team_name,
//         memberTarget,
//         weeklyAchievementBreakdown,
//       });
//       return;
//     }

//     /* OPERATION PATH */
//     if (!isOperation) return console.log('Invalid role');

//     const teamIds = [me.team_id].filter(Boolean);
//     const resultArray = [];

//     for (const teamId of teamIds) {
//       const teamData = await prisma.team.findUnique({
//         where: { id: teamId },
//         select: {
//           team_target: true,
//           team_name: true,
//           team_member: { select: { id: true, first_name: true, target: true } },
//         },
//       });
//       if (!teamData) continue;

//       const baseFilter = { team_id: teamId };
//       const thisMonth = await prisma.project.findMany({
//         where: {
//           ...baseFilter,
//           OR: [
//             { is_delivered: true },
//             {
//               AND: [
//                 { is_delivered: false },
//                 { delivery_date: { gte: startOfMonth } },
//               ],
//             },
//           ],
//         },
//       });

//       const notDelivered = await prisma.project.findMany({
//         where: { ...baseFilter, is_delivered: false },
//       });

//       let teamTarget = Number(teamData.team_target || 0);
//       let teamAchievement = 0, teamCancelled = 0,
//           teamTotalCarry = 0, submitted = 0, totalAssign = 0;

//       thisMonth.forEach(p => {
//         if (p.is_delivered) {
//           teamAchievement += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       notDelivered.forEach(p => {
//         teamTotalCarry += Number(p.total_carry || 0);
//         if (p.status === 'submitted') {
//           submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         if (p.status === 'cancelled') {
//           teamCancelled += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         totalAssign += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//       });

//       const memberIds = teamData.team_member.map(m => m.id);
//       const distributions = await prisma.member_distribution.findMany({
//         where: { team_member_id: { in: memberIds } },
//       });

//       const memberTarget = teamData.team_member.map(m => ({
//         memberName: m.first_name,
//         target: m.target || 0,
//         earned: distributions
//           .filter(d => d.team_member_id === m.id)
//           .reduce((s, d) => s + Number(d.amount), 0),
//       }));

//       const weeks = [
//         { week: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth(), 7) },
//         { week: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8), end: new Date(today.getFullYear(), today.getMonth(), 14) },
//         { week: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15), end: new Date(today.getFullYear(), today.getMonth(), 21) },
//         { week: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22), end: endOfMonth },
//       ];

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
//         week,
//         range: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
//         target: Math.round(teamTarget / 4),
//         amount: thisMonth
//           .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
//           .reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0),
//       }));

//       resultArray.push({
//         teamTarget,
//         teamAchievement,
//         teamCancelled,
//         teamTotalCarry,
//         submitted,
//         totalAssign,
//         teamName: teamData.team_name,
//         memberTarget,
//         weeklyAchievementBreakdown,
//       });
//     }

//     io.emit('eachTeamChart', resultArray);

//   } catch (err) {
//     console.error('Error fetching team data:', err);
//   }
// }

//   async function eachTeamChart(io) {
//   try {
//     const me = await prisma.team_member.findUnique({
//       where: { uid: global.user.uid },
//       select: { id: true, role: true, first_name: true, team_id: true },
//     });
//     if (!me) return console.log('User not found');

//     const isSalesLeader = me.role === 'sales_leader';
//     const isSales = me.role?.startsWith('sales_') && !isSalesLeader;
//     const isOperation = me.role?.startsWith('operation_');

//     const today = new Date();
//     const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

//     if (isSales || isSalesLeader) {
//       const teamMembers = await prisma.team_member.findMany({
//         where: { team_id: me.team_id, role: { startsWith: 'sales_' } },
//         select: { id: true, first_name: true, target: true },
//       });

//       const teamMemberIds = teamMembers.map(m => m.id);

//       const allProjects = await prisma.project.findMany({
//         where: { ordered_by: { in: teamMemberIds } },
//       });

//       const projectsThisMonth = allProjects.filter(p =>
//         (p.is_delivered || (!p.is_delivered && new Date(p.delivery_date) >= startOfMonth)) &&
//         new Date(p.delivery_date) <= endOfMonth
//       );

//       const notDelivered = allProjects.filter(p => !p.is_delivered);

//       const teamTarget = Number(
//         (
//           await prisma.team.findUnique({
//             where: { id: me.team_id },
//             select: { team_target: true },
//           })
//         )?.team_target || 0
//       );

//       let teamAchievement = 0, teamCancelled = 0,
//           teamTotalCarry = 0, submitted = 0, totalAssign = 0;

//       projectsThisMonth.forEach(p => {
//         if (p.is_delivered) {
//           teamAchievement += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       notDelivered.forEach(p => {
//         teamTotalCarry += Number(p.total_carry || 0);
//         if (p.status === 'submitted') {
//           submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         if (p.status === 'cancelled') {
//           teamCancelled += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         totalAssign += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//       });

//       const memberTarget = teamMembers.map(m => {
//         const memberProjects = allProjects.filter(p => p.ordered_by === m.id);
//         const earned = memberProjects.reduce(
//           (sum, p) =>
//             sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0),
//           0
//         );

//         return {
//           memberName: m.first_name,
//           target: m.target || 0,
//           earned,
//         };
//       });

//       const weeks = [
//         { week: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth(), 7) },
//         { week: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8), end: new Date(today.getFullYear(), today.getMonth(), 14) },
//         { week: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15), end: new Date(today.getFullYear(), today.getMonth(), 21) },
//         { week: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22), end: endOfMonth },
//       ];

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
//         week,
//         range: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
//         target: Math.round(teamTarget / 4),
//         amount: projectsThisMonth
//           .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
//           .reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0),
//       }));

//       const teamInfo = await prisma.team.findUnique({ where: { id: me.team_id } });

//       io.emit('eachTeamChart', {
//         teamTarget,
//         teamAchievement,
//         teamCancelled,
//         teamTotalCarry,
//         submitted,
//         totalAssign,
//         teamName: teamInfo?.team_name,
//         memberTarget,
//         weeklyAchievementBreakdown,
//       });

//       return;
//     }

//      /* OPERATION PATH */
//     if (!isOperation) return console.log('Invalid role');

//     const teamIds = [me.team_id].filter(Boolean);
//     const resultArray = [];

//     for (const teamId of teamIds) {
//       const teamData = await prisma.team.findUnique({
//         where: { id: teamId },
//         select: {
//           team_target: true,
//           team_name: true,
//           team_member: { select: { id: true, first_name: true, target: true } },
//         },
//       });
//       if (!teamData) continue;

//       const baseFilter = { team_id: teamId };
//       const thisMonth = await prisma.project.findMany({
//         where: {
//           ...baseFilter,
//           OR: [
//             { is_delivered: true },
//             {
//               AND: [
//                 { is_delivered: false },
//                 { delivery_date: { gte: startOfMonth } },
//               ],
//             },
//           ],
//         },
//       });

//       const notDelivered = await prisma.project.findMany({
//         where: { ...baseFilter, is_delivered: false },
//       });

//       let teamTarget = Number(teamData.team_target || 0);
//       let teamAchievement = 0, teamCancelled = 0,
//           teamTotalCarry = 0, submitted = 0, totalAssign = 0;

//       thisMonth.forEach(p => {
//         if (p.is_delivered) {
//           teamAchievement += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       notDelivered.forEach(p => {
//         teamTotalCarry += Number(p.total_carry || 0);
//         if (p.status === 'submitted') {
//           submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         if (p.status === 'cancelled') {
//           teamCancelled += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//         totalAssign += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//       });

//       const memberIds = teamData.team_member.map(m => m.id);
//       const distributions = await prisma.member_distribution.findMany({
//         where: { team_member_id: { in: memberIds } },
//       });

//       const memberTarget = teamData.team_member.map(m => ({
//         memberName: m.first_name,
//         target: m.target || 0,
//         earned: distributions
//           .filter(d => d.team_member_id === m.id)
//           .reduce((s, d) => s + Number(d.amount), 0),
//       }));

//       const weeks = [
//         { week: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth(), 7) },
//         { week: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8), end: new Date(today.getFullYear(), today.getMonth(), 14) },
//         { week: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15), end: new Date(today.getFullYear(), today.getMonth(), 21) },
//         { week: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22), end: endOfMonth },
//       ];

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
//         week,
//         range: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
//         target: Math.round(teamTarget / 4),
//         amount: thisMonth
//           .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
//           .reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0),
//       }));

//       resultArray.push({
//         teamTarget,
//         teamAchievement,
//         teamCancelled,
//         teamTotalCarry,
//         submitted,
//         totalAssign,
//         teamName: teamData.team_name,
//         memberTarget,
//         weeklyAchievementBreakdown,
//       });
//     }

//     io.emit('eachTeamChart', resultArray);

//   } catch (err) {
//     console.error('Error fetching team data:', err);
//   }
// }



async function eachTeamChart(io) {
  try {
    const me = await prisma.team_member.findUnique({
      where:  { uid: global.user.uid },
      select: { id: true, role: true, first_name: true, team_id: true },
    });
    if (!me) {
      console.log('User not found');
      return;
    }

    const isSalesRole  = me.role?.startsWith('sales_');
    const isOperation  = me.role?.startsWith('operation_');

    const today        = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // ← Define weeks *once*, here, so both branches can use it
    const weeks = [
      { week: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1),  end: new Date(today.getFullYear(), today.getMonth(), 7) },
      { week: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8),  end: new Date(today.getFullYear(), today.getMonth(), 14) },
      { week: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15), end: new Date(today.getFullYear(), today.getMonth(), 21) },
      { week: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22), end: endOfMonth },
    ];

    // ─── SALES branch ───────────────────────────────────────────────────────────
    if (isSalesRole) {
      const teamMembers = await prisma.team_member.findMany({
        where:  { team_id: me.team_id },
        select: { id: true, first_name: true, target: true },
      });
      const memberIds   = teamMembers.map(m => m.id);

      const allProjects = await prisma.project.findMany({
        where: { ordered_by: { in: memberIds } },
      });

      const projectsThisMonth = allProjects.filter(p =>
        (p.is_delivered || (!p.is_delivered && new Date(p.delivery_date) >= startOfMonth)) &&
        new Date(p.delivery_date) <= endOfMonth
      );
      const notDelivered = allProjects.filter(p => !p.is_delivered);

      const {
        team_target: rawTarget,
        team_name:    teamName
      } = await prisma.team.findUnique({
        where:  { id: me.team_id },
        select: { team_target: true, team_name: true }
      }) || { team_target: 0, team_name: '' };

      const teamTarget = Number(rawTarget);

      let teamAchievement = 0, teamCancelled = 0,
          teamTotalCarry = 0, submitted = 0, totalAssign = 0;

      projectsThisMonth.forEach(p => {
        if (p.is_delivered) {
          teamAchievement += Number(p.after_fiverr_amount || 0)
                           + Number(p.after_Fiverr_bonus || 0);
        }
      });
      notDelivered.forEach(p => {
        teamTotalCarry += Number(p.total_carry || 0);
        if (p.status === 'submitted') {
          submitted += Number(p.after_fiverr_amount || 0)
                     + Number(p.after_Fiverr_bonus || 0);
        }
        if (p.status === 'cancelled') {
          teamCancelled += Number(p.after_fiverr_amount || 0)
                         + Number(p.after_Fiverr_bonus || 0);
        }
        totalAssign += Number(p.after_fiverr_amount || 0)
                     + Number(p.after_Fiverr_bonus || 0);
      });

      const memberTarget = teamMembers.map(m => {
        const earned = allProjects
          .filter(p => p.ordered_by === m.id)
          .reduce((sum, p) =>
            sum + Number(p.after_fiverr_amount || 0)
                + Number(p.after_Fiverr_bonus || 0)
          , 0);
        return { memberName: m.first_name, target: m.target || 0, earned };
      });

      const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
        week,
        range: `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
        target: Math.round(teamTarget / 4),
        amount: projectsThisMonth
          .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
          .reduce((s, p) =>
            s + Number(p.after_fiverr_amount || 0)
              + Number(p.after_Fiverr_bonus || 0)
          , 0),
      }));

      io.emit('eachTeamChart', {
        teamTarget,
        teamAchievement,
        teamCancelled,
        teamTotalCarry,
        submitted,
        totalAssign,
        teamName,
        memberTarget,
        weeklyAchievementBreakdown,
      });
      return;
    }

    // ─── OPERATION branch ───────────────────────────────────────────────────────
    if (!isOperation) {
      console.log('Invalid role');
      return;
    }

    const teamIds    = [me.team_id].filter(Boolean);
   

    for (const teamId of teamIds) {
      const teamData = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          team_target: true,
          team_name:   true,
          team_member: {
            select: { id: true, first_name: true, target: true },
          },
        },
      });
      if (!teamData) continue;

      const baseFilter  = { team_id: teamId };
      const thisMonth   = await prisma.project.findMany({
        where: {
          ...baseFilter,
          OR: [
            { is_delivered: true },
            {
              AND: [
                { is_delivered: false },
                { delivery_date: { gte: startOfMonth } },
              ],
            },
          ],
        },
      });
      const notDelivered = await prisma.project.findMany({
        where: { ...baseFilter, is_delivered: false },
      });

      let teamTarget      = Number(teamData.team_target || 0),
          teamAchievement = 0,
          teamCancelled   = 0,
          teamTotalCarry  = 0,
          submitted       = 0,
          totalAssign     = 0;

      thisMonth.forEach(p => {
        if (p.is_delivered) {
          teamAchievement += Number(p.after_fiverr_amount || 0)
                           + Number(p.after_Fiverr_bonus || 0);
        }
      });
      notDelivered.forEach(p => {
        teamTotalCarry += Number(p.total_carry || 0);
        if (p.status === 'submitted') {
          submitted += Number(p.after_fiverr_amount || 0)
                     + Number(p.after_Fiverr_bonus || 0);
        }
        if (p.status === 'cancelled') {
          teamCancelled += Number(p.after_fiverr_amount || 0)
                         + Number(p.after_Fiverr_bonus || 0);
        }
        totalAssign += Number(p.after_fiverr_amount || 0)
                     + Number(p.after_Fiverr_bonus || 0);
      });

      const memberIds     = teamData.team_member.map(m => m.id);
      const distributions = await prisma.member_distribution.findMany({
        where: { team_member_id: { in: memberIds } },
      });
      const memberTarget = teamData.team_member.map(m => ({
        memberName: m.first_name,
        target:     m.target || 0,
        earned:     distributions
                     .filter(d => d.team_member_id === m.id)
                     .reduce((s, d) => s + Number(d.amount), 0),
      }));

      const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
        week,
        range: `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
        target: Math.round(teamTarget / 4),
        amount: thisMonth
          .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
          .reduce((s, p) =>
            s + Number(p.after_fiverr_amount || 0)
              + Number(p.after_Fiverr_bonus || 0)
          , 0),
      }));
      const resultArray = {
        teamTarget,
        teamAchievement,
        teamCancelled,
        teamTotalCarry,
        submitted,
        totalAssign,
        teamName: teamData.team_name,
        memberTarget,
        weeklyAchievementBreakdown,
      };
      io.emit('eachTeamChart', resultArray);

    }

  } catch (err) {
    console.error('Error fetching team data:', err);
  }
}


async function eachTeamChart(io) {
  try {
    const me = await prisma.team_member.findUnique({
      where: { uid: global.user.uid },
      select: { id: true, role: true, first_name: true, team_id: true },
    });
    if (!me) {
      console.log('User not found');
      io.emit('eachTeamChart', { error: "User not found." });
      return;
    }

    const isSalesRole = me.role?.startsWith('sales_');
    const isOperation = me.role?.startsWith('operation_');

    const today = new Date(); // Date for determining the current month
    const year = today.getFullYear();
    const monthIndex = today.getMonth(); // 0 for Jan, 1 for Feb, etc.

    // Define week boundaries in UTC
    // Prisma returns project.date as a JS Date object at UTC midnight (YYYY-MM-DDT00:00:00.000Z)
    const weeks = [
      { week: 'Week 1', start: new Date(Date.UTC(year, monthIndex, 1)),  end: new Date(Date.UTC(year, monthIndex, 7)) },
      { week: 'Week 2', start: new Date(Date.UTC(year, monthIndex, 8)),  end: new Date(Date.UTC(year, monthIndex, 14)) },
      { week: 'Week 3', start: new Date(Date.UTC(year, monthIndex, 15)), end: new Date(Date.UTC(year, monthIndex, 21)) },
      // For Week 4, ensure 'end' is the last day of the current month, at UTC midnight
      { week: 'Week 4', start: new Date(Date.UTC(year, monthIndex, 22)), end: new Date(Date.UTC(year, monthIndex + 1, 0)) } // Date.UTC(year, monthIndex + 1, 0) gives the last day of monthIndex
    ];
    // Note: The 'end' dates are the start of that specific day in UTC (00:00:00.000Z).
    // The comparison `orderDate.getTime() <= end.getTime()` correctly includes projects ordered on the end day.

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1));
    const endOfMonthDate = new Date(Date.UTC(year, monthIndex + 1, 0)); // Last day of the month, UTC midnight

    if (isSalesRole) {
      if (!me.team_id) {
        console.log('Sales user does not have a team_id.');
        io.emit('eachTeamChart', { /* ... error object ... */ });
        return;
      }

      const teamMembers = await prisma.team_member.findMany({
        where: { team_id: me.team_id },
        select: { id: true, first_name: true, target: true },
      });
      const memberIds = teamMembers.map(m => m.id);

      if (memberIds.length === 0) {
        // ... handle team with no members ...
        io.emit('eachTeamChart', { /* ... error or empty state object ... */ });
        return;
      }

      const allProjectsByTeamMembers = await prisma.project.findMany({
        where: { ordered_by: { in: memberIds } },
        select: { /* ... all necessary fields including date, status, amounts, team_id ... */
            id: true, date: true, ordered_by: true, status: true,
            after_fiverr_amount: true, after_Fiverr_bonus: true,
            is_delivered: true, delivery_date: true, team_id: true,
        }
      });

      const teamData = await prisma.team.findUnique({
        where: { id: me.team_id },
        select: { team_target: true, team_name: true }
      });
      
      const teamTarget = Number(teamData?.team_target || 0);
      const teamName = teamData?.team_name || 'Unknown Team';

      let teamAchievement = 0;
      let teamCancelled = 0;
      // ... other metric initializations ...

      // Filter projects ordered this month (based on UTC dates)
      const projectsOrderedThisMonth = allProjectsByTeamMembers.filter(p => {
        if (!p.date) return false;
        const orderDate = new Date(p.date); // p.date is YYYY-MM-DDT00:00:00.000Z
        return orderDate.getTime() >= startOfMonth.getTime() && orderDate.getTime() <= endOfMonthDate.getTime();
      });

      projectsOrderedThisMonth.forEach(p => {
        const projectValue = Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        if (p.status === 'cancelled') {
          teamCancelled += projectValue;
        } else {
          teamAchievement += projectValue;
        }
      });
      
      // ... (teamTotalCarry, submitted, totalAssign/assignedProjectCount calculations as before) ...
      // For brevity, assuming they are correct from previous iteration
      let teamTotalCarry = 0; // Placeholder for actual calculation
      const projectsOrderedPreviously = allProjectsByTeamMembers.filter(p => {
        if (!p.date) return false;
        const orderDate = new Date(p.date);
        return orderDate.getTime() < startOfMonth.getTime();
      });
      projectsOrderedPreviously.forEach(p => {
        if (!p.is_delivered && p.status !== 'cancelled') {
          teamTotalCarry += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        }
      });

      let submitted = 0; // Placeholder
      allProjectsByTeamMembers.forEach(p => {
        if (p.status === 'submitted' && !p.is_delivered) {
          submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        }
      });

      let assignedProjectCount = 0; // Placeholder
      let totalAssignedAmount = 0;  // Placeholder
      allProjectsByTeamMembers.forEach(p => {
        if (p.team_id != null) {
          assignedProjectCount++;
          totalAssignedAmount += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        }
      });
      // End of placeholder calculations


      const memberTarget = teamMembers.map(m => {
        let earnedThisMonth = 0;
        projectsOrderedThisMonth.forEach(p => {
          if (p.ordered_by === m.id && p.status !== 'cancelled') {
            earnedThisMonth += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
          }
        });
        return { memberName: m.first_name, target: Number(m.target || 0), earned: earnedThisMonth };
      });

      // Projects contributing to teamAchievement (ordered this month, UTC, not cancelled)
      const achievementProjectsThisMonth = projectsOrderedThisMonth.filter(
        p => p.status !== 'cancelled'
      );

      const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => {
        const amount = achievementProjectsThisMonth
          .filter(p => {
            if (!p.date) return false;
            const orderDate = new Date(p.date); // p.date is YYYY-MM-DDT00:00:00.000Z
            // Ensure orderDate is compared against UTC week boundaries
            return orderDate.getTime() >= start.getTime() && orderDate.getTime() <= end.getTime();
          })
          .reduce((s, p) =>
            s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0)
          , 0);
        return {
          week,
          range: `${start.toLocaleDateString('en-US', {timeZone: 'UTC', month:'short', day:'numeric'})} - ${end.toLocaleDateString('en-US', {timeZone: 'UTC', month:'short', day:'numeric'})}`,
          target: weeks.length > 0 ? Math.round(teamTarget / weeks.length) : 0,
          amount,
        };
      });

      io.emit('eachTeamChart', {
        teamTarget, teamAchievement, teamCancelled, teamTotalCarry, submitted,
        totalAssign: totalAssignedAmount, assignedProjectCount,
        teamName, memberTarget, weeklyAchievementBreakdown,
      });
      return;
    }
    //─── OPERATION branch ───────────────────────────────────────────────────────
 
//─── OPERATION branch ───────────────────────────────────────────────────────
    if (isOperation) {
      const teamIds = [me.team_id].filter(Boolean);

      for (const teamId of teamIds) {
        const teamData = await prisma.team.findUnique({
          where: { id: teamId },
          select: {
            team_target: true,
            team_name:   true,
            team_member: {
              select: { id: true, first_name: true, target: true },
            },
          },
        });
        if (!teamData) continue;

        const baseFilter   = { team_id: teamId };
        const startOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1));
        const endOfMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 0));

        // Projects delivered this month
        const deliveredThisMonth = await prisma.project.findMany({
          where: { ...baseFilter, is_delivered: true, delivery_date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
          select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
        });

        // Projects cancelled this monthghjo7='ikgbf` qa
        const cancelledThisMonth = await prisma.project.findMany({
          where: { ...baseFilter, status: 'cancelled', date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
          select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
        });

        // Carry projects (not delivered, ordered before this month, and not cancelled)
        const carryProjects = await prisma.project.findMany({
          where: {
            ...baseFilter,
            is_delivered: false,
            date: { lt: startOfMonthUTC },
            status: { not: 'cancelled' },
          },
          select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
        });

        // Submitted projects this month (not delivered)
        const submittedThisMonth = await prisma.project.findMany({
          where: { ...baseFilter, status: 'submitted', is_delivered: false, date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
          select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
        });

        // All projects assigned to the team (including carry)
        const allAssignedProjects = await prisma.project.findMany({
          where: baseFilter,
          select: { is_delivered: true, after_fiverr_amount: true, after_Fiverr_bonus: true },
        });

        // Fetch weekly delivered projects in bulk
        const weeklyDeliveredProjects = await Promise.all(
          weeks.map(({ start, end }) =>
            prisma.project.findMany({
              where: {
                team_id: teamId,
                is_delivered: true,
                delivery_date: { gte: start, lte: end },
              },
              select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
            })
          )
        );

        let teamTarget     = Number(teamData.team_target || 0);
        let teamAchievement = deliveredThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
        let teamCancelled   = cancelledThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
        let teamTotalCarry  = carryProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
        let submitted     = submittedThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
        let totalAssign     = allAssignedProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

        const memberIds   = teamData.team_member.map(m => m.id);
        const distributions = await prisma.member_distribution.findMany({
          where: { team_member_id: { in: memberIds } },
        });
        const memberTarget = teamData.team_member.map(m => ({
          memberName: m.first_name,
          target:     m.target || 0,
          earned:     distributions
                          .filter(d => d.team_member_id === m.id)
                          .reduce((s, d) => s + Number(d.amount), 0),
        }));

        const weeklyAchievementBreakdown = weeks.map(({ week, start, end }, index) => {
          const weeklyAmount = weeklyDeliveredProjects[index].reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
          return {
            week,
            range: `${start.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})}`,
            target: Math.round(teamTarget / 4),
            amount: weeklyAmount,
          };
        });

        const resultArray = {
          teamTarget,
          teamAchievement,
          teamCancelled,
          teamTotalCarry,
          submitted,
          totalAssign,
          teamName: teamData.team_name,
          memberTarget,
          weeklyAchievementBreakdown,
        };
        io.emit('eachTeamChart', resultArray);
      }
      return;
    }
    // ... other role handling ...
  } catch (err) {
    console.error('Error fetching team data in eachTeamChart:', err);
    io.emit('eachTeamChart', { error: "Server error fetching team data." });
  }
}

// async function eachTeamChart(io, teamId=2) {
//   try {
//     // Validate that a teamId was provided
//     if (!teamId) {
//       console.log('No team_id provided.');
//       io.emit('eachTeamChart', { error: "Team ID is required." });
//       return;
//     }

//     const me = await prisma.team_member.findUnique({
//       where: { team_id: teamId },
//       select: { id: true, role: true, first_name: true, team_id: true },
//     });
//     if (!me) {
//       console.log('User not found');
//       io.emit('eachTeamChart', { error: "User not found." });
//       return;
//     }

//     const isSalesRole = me.role?.startsWith('sales_');
//     const isOperation = me.role?.startsWith('operation_');

//     const today = new Date(); // Date for determining the current month
//     const year = today.getFullYear();
//     const monthIndex = today.getMonth(); // 0 for Jan, 1 for Feb, etc.

//     // Define week boundaries in UTC
//     // Prisma returns project.date as a JS Date object at UTC midnight (YYYY-MM-DDT00:00:00.000Z)
//     const weeks = [
//       { week: 'Week 1', start: new Date(Date.UTC(year, monthIndex, 1)),  end: new Date(Date.UTC(year, monthIndex, 7)) },
//       { week: 'Week 2', start: new Date(Date.UTC(year, monthIndex, 8)),  end: new Date(Date.UTC(year, monthIndex, 14)) },
//       { week: 'Week 3', start: new Date(Date.UTC(year, monthIndex, 15)), end: new Date(Date.UTC(year, monthIndex, 21)) },
//       // For Week 4, ensure 'end' is the last day of the current month, at UTC midnight
//       { week: 'Week 4', start: new Date(Date.UTC(year, monthIndex, 22)), end: new Date(Date.UTC(year, monthIndex + 1, 0)) } // Date.UTC(year, monthIndex + 1, 0) gives the last day of monthIndex
//     ];
//     // Note: The 'end' dates are the start of that specific day in UTC (00:00:00.000Z).
//     // The comparison `orderDate.getTime() <= end.getTime()` correctly includes projects ordered on the end day.

//     const startOfMonth = new Date(Date.UTC(year, monthIndex, 1));
//     const endOfMonthDate = new Date(Date.UTC(year, monthIndex + 1, 0)); // Last day of the month, UTC midnight

//     if (isSalesRole) {
//       if (!me.team_id) {
//         console.log('Sales user does not have a team_id.');
//         io.emit('eachTeamChart', { error: "Sales user is missing team ID." }); // Added a more specific error
//         return;
//       }

//       const teamMembers = await prisma.team_member.findMany({
//         where: { team_id: me.team_id },
//         select: { id: true, first_name: true, target: true },
//       });
//       const memberIds = teamMembers.map(m => m.id);

//       if (memberIds.length === 0) {
//          console.log('Team found, but no members in the team.');
//         io.emit('eachTeamChart', { teamName: 'Unknown Team', teamTarget: 0, teamAchievement: 0, teamCancelled: 0, teamTotalCarry: 0, submitted: 0, totalAssign: 0, assignedProjectCount: 0, memberTarget: [], weeklyAchievementBreakdown: [] }); // Emit empty state
//         return;
//       }

//       const allProjectsByTeamMembers = await prisma.project.findMany({
//         where: { ordered_by: { in: memberIds } },
//         select: {
//             id: true, date: true, ordered_by: true, status: true,
//             after_fiverr_amount: true, after_Fiverr_bonus: true,
//             is_delivered: true, delivery_date: true, team_id: true,
//         }
//       });

//       const teamData = await prisma.team.findUnique({
//         where: { id: me.team_id },
//         select: { team_target: true, team_name: true }
//       });

//       const teamTarget = Number(teamData?.team_target || 0);
//       const teamName = teamData?.team_name || 'Unknown Team';

//       let teamAchievement = 0;
//       let teamCancelled = 0;
//       // ... other metric initializations ...

//       // Filter projects ordered this month (based on UTC dates)
//       const projectsOrderedThisMonth = allProjectsByTeamMembers.filter(p => {
//         if (!p.date) return false;
//         const orderDate = new Date(p.date); // p.date is YYYY-MM-DDT00:00:00.000Z
//         return orderDate.getTime() >= startOfMonth.getTime() && orderDate.getTime() <= endOfMonthDate.getTime();
//       });

//       projectsOrderedThisMonth.forEach(p => {
//         const projectValue = Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         if (p.status === 'cancelled') {
//           teamCancelled += projectValue;
//         } else {
//           teamAchievement += projectValue;
//         }
//       });

//       // Calculate teamTotalCarry (ordered previously, not delivered, not cancelled)
//       let teamTotalCarry = 0;
//       const projectsOrderedPreviously = allProjectsByTeamMembers.filter(p => {
//         if (!p.date) return false;
//         const orderDate = new Date(p.date);
//         return orderDate.getTime() < startOfMonth.getTime();
//       });
//       projectsOrderedPreviously.forEach(p => {
//         if (!p.is_delivered && p.status !== 'cancelled') {
//           teamTotalCarry += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       // Calculate submitted (status === 'submitted', not delivered)
//       let submitted = 0;
//        allProjectsByTeamMembers.forEach(p => {
//         if (p.status === 'submitted' && !p.is_delivered) { // Note: Assuming submitted projects ordered anytime contribute to this count
//           submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       // Calculate total assigned value and count (team_id is not null)
//       let assignedProjectCount = 0;
//       let totalAssignedAmount = 0;
//       allProjectsByTeamMembers.forEach(p => {
//         // Note: Assuming projects in `allProjectsByTeamMembers` (ordered by team members)
//         // are considered "assigned" if they have a team_id, which seems redundant
//         // since the initial query filtered by ordered_by which are in this team.
//         // This logic might need review based on exact definitions.
//         if (p.team_id != null) { // Check if a team_id is assigned (could be null if not assigned to a team yet?)
//           assignedProjectCount++;
//           totalAssignedAmount += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });


//       const memberTarget = teamMembers.map(m => {
//         let earnedThisMonth = 0;
//         projectsOrderedThisMonth.forEach(p => {
//           if (p.ordered_by === m.id && p.status !== 'cancelled') {
//             earnedThisMonth += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//           }
//         });
//         return { memberName: m.first_name, target: Number(m.target || 0), earned: earnedThisMonth };
//       });

//       // Projects contributing to teamAchievement (ordered this month, UTC, not cancelled)
//       const achievementProjectsThisMonth = projectsOrderedThisMonth.filter(
//         p => p.status !== 'cancelled'
//       );

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => {
//         const amount = achievementProjectsThisMonth
//           .filter(p => {
//             if (!p.date) return false;
//             const orderDate = new Date(p.date); // p.date is YYYY-MM-DDT00:00:00.000Z
//             // Ensure orderDate is compared against UTC week boundaries
//             return orderDate.getTime() >= start.getTime() && orderDate.getTime() <= end.getTime();
//           })
//           .reduce((s, p) =>
//             s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0)
//           , 0);
//         return {
//           week,
//           range: `${start.toLocaleDateString('en-US', {timeZone: 'UTC', month:'short', day:'numeric'})} - ${end.toLocaleDateString('en-US', {timeZone: 'UTC', month:'short', day:'numeric'})}`,
//           target: weeks.length > 0 ? Math.round(teamTarget / weeks.length) : 0,
//           amount,
//         };
//       });

//       io.emit('eachTeamChart', {
//         teamTarget, teamAchievement, teamCancelled, teamTotalCarry, submitted,
//         totalAssign: totalAssignedAmount, assignedProjectCount,
//         teamName, memberTarget, weeklyAchievementBreakdown,
//       });
//       return;
//     }
//     //─── OPERATION branch ───────────────────────────────────────────────────────

//     if (isOperation) {
//       const teamIds = [me.team_id].filter(Boolean); // Ensures teamId exists and is in an array

//       // Since an operation user is linked to a single team_id via `me`,
//       // this loop will likely only run once for that team.
//       for (const teamId of teamIds) {
//         const teamData = await prisma.team.findUnique({
//           where: { id: teamId },
//           select: {
//             team_target: true,
//             team_name:    true,
//             team_member: {
//               select: { id: true, first_name: true, target: true },
//             },
//           },
//         });
//         if (!teamData) {
//             console.log(`Team data not found for teamId: ${teamId}`);
//             // Optionally, emit an error or skip this team
//             continue;
//         }

//         const baseFilter   = { team_id: teamId };
//         const startOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1));
//         const endOfMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 0));

//         // Projects delivered this month (based on delivery_date)
//         const deliveredThisMonth = await prisma.project.findMany({
//           where: { ...baseFilter, is_delivered: true, delivery_date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Projects cancelled this month (based on order date 'date')
//         const cancelledThisMonth = await prisma.project.findMany({
//           where: { ...baseFilter, status: 'cancelled', date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Carry projects (not delivered, ordered *before* this month, and not cancelled)
//         const carryProjects = await prisma.project.findMany({
//           where: {
//             ...baseFilter,
//             is_delivered: false,
//             date: { lt: startOfMonthUTC },
//             status: { not: 'cancelled' },
//           },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Submitted projects this month (ordered this month, status 'submitted', not delivered)
//         const submittedThisMonth = await prisma.project.findMany({
//           where: { ...baseFilter, status: 'submitted', is_delivered: false, date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // All projects assigned to the team (including carry and future projects)
//         // The filter `where: baseFilter` (team_id: teamId) already gets all projects for the team.
//         const allAssignedProjects = await prisma.project.findMany({
//           where: baseFilter, // Filters by team_id
//           select: { is_delivered: true, after_fiverr_amount: true, after_Fiverr_bonus: true, date: true }, // Include date to be explicit
//         });

//         // Fetch weekly delivered projects in bulk using Promise.all
//         const weeklyDeliveredProjects = await Promise.all(
//           weeks.map(({ start, end }) =>
//             prisma.project.findMany({
//               where: {
//                 team_id: teamId,
//                 is_delivered: true,
//                 delivery_date: { gte: start, lte: end }, // Filter by delivery_date for operation's weekly achievement
//               },
//               select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//             })
//           )
//         );

//         let teamTarget      = Number(teamData.team_target || 0);
//         let teamAchievement = deliveredThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let teamCancelled   = cancelledThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let teamTotalCarry  = carryProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let submitted     = submittedThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let totalAssign     = allAssignedProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

//         // For the Operation role, member "earned" is based on distributions, not project ordering
//         const memberIds   = teamData.team_member.map(m => m.id);
//         const distributions = await prisma.member_distribution.findMany({
//           where: {
//             team_member_id: { in: memberIds },
//             // Assuming distributions might also be linked to a period (month/week)
//             // If distributions are monthly, you might need a date filter here too.
//             // Without schema/distribution logic details, fetching all for members.
//           },
//         });
//         const memberTarget = teamData.team_member.map(m => ({
//           memberName: m.first_name,
//           target:     Number(m.target || 0),
//           earned:     distributions
//                       .filter(d => d.team_member_id === m.id)
//                       // Need to filter distributions by the relevant period if necessary (e.g., current month)
//                       // Based on the original code, it seems to sum *all* distributions for the member.
//                       // If it should be *this month's* distributions, you'd need a date filter on `distributions` query.
//                       .reduce((s, d) => s + Number(d.amount || 0), 0), // Added || 0 for robustness
//         }));

//         const weeklyAchievementBreakdown = weeks.map(({ week, start, end }, index) => {
//           // This breakdown uses the results from the weeklyDeliveredProjects queries
//           const weeklyAmount = weeklyDeliveredProjects[index].reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//           return {
//             week,
//             range: `${start.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})}`,
//             target: Math.round(teamTarget / 4), // Assuming weekly target is simply monthly target divided by 4
//             amount: weeklyAmount,
//           };
//         });

//         const resultArray = {
//           teamTarget,
//           teamAchievement, // Operations achievement is based on delivery
//           teamCancelled, // Operations cancelled is based on order date status change
//           teamTotalCarry, // Operations carry is projects ordered previously but not delivered/cancelled
//           submitted, // Operations submitted is projects ordered this month with status submitted
//           totalAssign, // Total value of all projects assigned to the team
//           teamName: teamData.team_name,
//           memberTarget, // Operations member earnings based on distributions
//           weeklyAchievementBreakdown, // Operations weekly achievement based on delivery
//         };
//         io.emit('eachTeamChart', resultArray);
//       }
//       return; // Exit after handling the operation team
//     }

//     // If the role is neither sales nor operation
//     console.log(`User role ${me.role} is not handled.`);
//     io.emit('eachTeamChart', { error: "User role not supported for chart data." });

//   } catch (err) {
//     // THIS IS THE KEY ERROR SOURCE YOU NEED TO SEE
//     console.error('Error fetching team data in eachTeamChart:', err);
//     io.emit('eachTeamChart', { error: "Server error fetching team data." });
//     // You might want to log the error details differently in production,
//     // but for debugging, printing the full `err` is essential.
//   }
// }
module.exports = { teamwiseDeliveryGraph, eachTeamChart };