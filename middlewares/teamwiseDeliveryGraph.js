const { PrismaClient } = require('@prisma/client');
const { io } = require('socket.io-client');
const prisma = new PrismaClient();


// async function teamwiseDeliveryGraph(io) {
//     //show team wise total  delivery amout( after fiverr amount) group by team name
//     try {
//         const projects = await prisma.project.findMany({
//             where: {
//                 is_delivered: true,
//             },
//             include: {
//                 team: true,
//             },
//         });

//         const teamWiseDelivery = projects.reduce((acc, project) => {
//             const teamName = project.team ? project.team.team_name : 'Unknown Team';
//             const amount = parseInt(project.after_fiverr_amount) + (parseInt(project.after_Fiverr_bonus) || 0) || 0;

//             if (!acc[teamName]) {
//                 acc[teamName] = 0;
//             }
//             acc[teamName] += amount;
//             return acc;
//         }, {});

//         io.emit("teamwiseDeliveryGraph", teamWiseDelivery); // Emit the data to the socket
  
//     } catch (error) {
//         console.error('Error fetching team-wise delivery:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }



// }

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



// async function eachTeamChart(io) {
//   try {
//     const me = await prisma.team_member.findUnique({
//       where:  { uid: global.user.uid },
//       select: { id: true, role: true, first_name: true, team_id: true },
//     });
//     if (!me) {
//       console.log('User not found');
//       return;
//     }

//     const isSalesRole  = me.role?.startsWith('sales_');
//     const isOperation  = me.role?.startsWith('operation_');

//     const today        = new Date();
//     const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

//     // ← Define weeks *once*, here, so both branches can use it
//     const weeks = [
//       { week: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1),  end: new Date(today.getFullYear(), today.getMonth(), 7) },
//       { week: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8),  end: new Date(today.getFullYear(), today.getMonth(), 14) },
//       { week: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15), end: new Date(today.getFullYear(), today.getMonth(), 21) },
//       { week: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22), end: endOfMonth },
//     ];

//     // ─── SALES branch ───────────────────────────────────────────────────────────
//     if (isSalesRole) {
//       const teamMembers = await prisma.team_member.findMany({
//         where:  { team_id: me.team_id },
//         select: { id: true, first_name: true, target: true },
//       });
//       const memberIds   = teamMembers.map(m => m.id);

//       const allProjects = await prisma.project.findMany({
//         where: { ordered_by: { in: memberIds } },
//       });

//       const projectsThisMonth = allProjects.filter(p =>
//         (p.is_delivered || (!p.is_delivered && new Date(p.delivery_date) >= startOfMonth)) &&
//         new Date(p.delivery_date) <= endOfMonth
//       );
//       const notDelivered = allProjects.filter(p => !p.is_delivered);

//       const {
//         team_target: rawTarget,
//         team_name:    teamName
//       } = await prisma.team.findUnique({
//         where:  { id: me.team_id },
//         select: { team_target: true, team_name: true }
//       }) || { team_target: 0, team_name: '' };

//       const teamTarget = Number(rawTarget);

//       let teamAchievement = 0, teamCancelled = 0,
//           teamTotalCarry = 0, submitted = 0, totalAssign = 0;

//       projectsThisMonth.forEach(p => {
//         if (p.is_delivered) {
//           teamAchievement += Number(p.after_fiverr_amount || 0)
//                            + Number(p.after_Fiverr_bonus || 0);
//         }
//       });
//       notDelivered.forEach(p => {
//         teamTotalCarry += Number(p.total_carry || 0);
//         if (p.status === 'submitted') {
//           submitted += Number(p.after_fiverr_amount || 0)
//                      + Number(p.after_Fiverr_bonus || 0);
//         }
//         if (p.status === 'cancelled') {
//           teamCancelled += Number(p.after_fiverr_amount || 0)
//                          + Number(p.after_Fiverr_bonus || 0);
//         }
//         totalAssign += Number(p.after_fiverr_amount || 0)
//                      + Number(p.after_Fiverr_bonus || 0);
//       });

//       const memberTarget = teamMembers.map(m => {
//         const earned = allProjects
//           .filter(p => p.ordered_by === m.id)
//           .reduce((sum, p) =>
//             sum + Number(p.after_fiverr_amount || 0)
//                 + Number(p.after_Fiverr_bonus || 0)
//           , 0);
//         return { memberName: m.first_name, target: m.target || 0, earned };
//       });

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
//         week,
//         range: `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
//         target: Math.round(teamTarget / 4),
//         amount: projectsThisMonth
//           .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
//           .reduce((s, p) =>
//             s + Number(p.after_fiverr_amount || 0)
//               + Number(p.after_Fiverr_bonus || 0)
//           , 0),
//       }));

//       io.emit('eachTeamChart', {
//         teamTarget,
//         teamAchievement,
//         teamCancelled,
//         teamTotalCarry,
//         submitted,
//         totalAssign,
//         teamName,
//         memberTarget,
//         weeklyAchievementBreakdown,
//       });
//       return;
//     }

//     // ─── OPERATION branch ───────────────────────────────────────────────────────
//     if (!isOperation) {
//       console.log('Invalid role');
//       return;
//     }

//     const teamIds    = [me.team_id].filter(Boolean);
   

//     for (const teamId of teamIds) {
//       const teamData = await prisma.team.findUnique({
//         where: { id: teamId },
//         select: {
//           team_target: true,
//           team_name:   true,
//           team_member: {
//             select: { id: true, first_name: true, target: true },
//           },
//         },
//       });
//       if (!teamData) continue;

//       const baseFilter  = { team_id: teamId };
//       const thisMonth   = await prisma.project.findMany({
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

//       let teamTarget      = Number(teamData.team_target || 0),
//           teamAchievement = 0,
//           teamCancelled   = 0,
//           teamTotalCarry  = 0,
//           submitted       = 0,
//           totalAssign     = 0;

//       thisMonth.forEach(p => {
//         if (p.is_delivered) {
//           teamAchievement += Number(p.after_fiverr_amount || 0)
//                            + Number(p.after_Fiverr_bonus || 0);
//         }
//       });
//       notDelivered.forEach(p => {
//         teamTotalCarry += Number(p.total_carry || 0);
//         if (p.status === 'submitted') {
//           submitted += Number(p.after_fiverr_amount || 0)
//                      + Number(p.after_Fiverr_bonus || 0);
//         }
//         if (p.status === 'cancelled') {
//           teamCancelled += Number(p.after_fiverr_amount || 0)
//                          + Number(p.after_Fiverr_bonus || 0);
//         }
//         totalAssign += Number(p.after_fiverr_amount || 0)
//                      + Number(p.after_Fiverr_bonus || 0);
//       });

//       const memberIds     = teamData.team_member.map(m => m.id);
//       const distributions = await prisma.member_distribution.findMany({
//         where: { team_member_id: { in: memberIds } },
//       });
//       const memberTarget = teamData.team_member.map(m => ({
//         memberName: m.first_name,
//         target:     m.target || 0,
//         earned:     distributions
//                      .filter(d => d.team_member_id === m.id)
//                      .reduce((s, d) => s + Number(d.amount), 0),
//       }));

//       const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => ({
//         week,
//         range: `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`,
//         target: Math.round(teamTarget / 4),
//         amount: thisMonth
//           .filter(p => p.is_delivered && new Date(p.delivery_date) >= start && new Date(p.delivery_date) <= end)
//           .reduce((s, p) =>
//             s + Number(p.after_fiverr_amount || 0)
//               + Number(p.after_Fiverr_bonus || 0)
//           , 0),
//       }));
//       const resultArray = {
//         teamTarget,
//         teamAchievement,
//         teamCancelled,
//         teamTotalCarry,
//         submitted,
//         totalAssign,
//         teamName: teamData.team_name,
//         memberTarget,
//         weeklyAchievementBreakdown,
//       };
//       io.emit('eachTeamChart', resultArray);

//     }

//   } catch (err) {
//     console.error('Error fetching team data:', err);
//   }
// }
// async function teamwiseDeliveryGraph(io) {
//     try {
//         const today = new Date();
//         const year = today.getFullYear();
//         const monthIndex = today.getMonth(); // 0 for Jan, 1 for Feb, etc.

//         // Define week boundaries in UTC
//         const weeks = [
//             { week: 'Week 1', start: new Date(Date.UTC(year, monthIndex, 1)), end: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)) }, // Include end of day
//             { week: 'Week 2', start: new Date(Date.UTC(year, monthIndex, 8)), end: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)) }, // Include end of day
//             { week: 'Week 3', start: new Date(Date.UTC(year, monthIndex, 15)), end: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)) }, // Include end of day
//             { week: 'Week 4', start: new Date(Date.UTC(year, monthIndex, 22)), end: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)) } // Last day of month, end of day
//         ];

//         // Fetch all teams
//         const teams = await prisma.team.findMany({
//             select: {
//                 id: true,
//                 team_name: true,
//             },
//         });

//         // Fetch all projects that are relevant to these teams within the current month's scope
//         // This includes projects ordered this month, delivered this month, or carry-over active projects.
//         // To calculate all weekly metrics correctly, we need a broad set of projects.
//         // Projects ordered this month, or delivered this month are key.
//         // Projects ordered before but cancelled this month? Or submitted this month?
//         // Let's fetch projects ordered or delivered within the current month, and those
//         // ordered previously but currently assigned and not delivered/cancelled.
//          const startOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1));
//          const endOfMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));


//         const projects = await prisma.project.findMany({
//             where: {
//                 team_id: { not: null }, // Assigned to some team
//                 OR: [
//                     {
//                         // Projects ordered this month (relevant for Cancelled, Submitted, Weekly Assign)
//                         date: { gte: startOfMonthUTC, lte: endOfMonthUTC }
//                     },
//                     {
//                         // Projects delivered this month (relevant for Delivered)
//                          delivery_date: { gte: startOfMonthUTC, lte: endOfMonthUTC },
//                          is_delivered: true // Ensure it's actually delivered
//                     },
//                      // Optionally include carry-over projects ordered before but still active
//                      // This isn't strictly needed for the *weekly slices* of metrics
//                      // based on activity *in* the week, but might be relevant for a
//                      // monthly summary if you were to add one. Sticking to weekly activity for now.
//                 ]
//             },
//             select: {
//                 id: true,
//                 team_id: true,
//                 date: true, // Order date
//                 delivery_date: true, // Delivery date
//                 status: true,
//                 is_delivered: true,
//                 after_fiverr_amount: true,
//                 after_Fiverr_bonus: true,
//             },
//         });

//         // Structure the result: { weekName: { teamName: { metrics } } }
//         const weeklyTeamMetrics = {};

//         // Initialize the structure with default values
//         weeks.forEach(({ week }) => {
//             weeklyTeamMetrics[week] = {};
//             teams.forEach(team => {
//                 const teamName = team.team_name || `Team ${team.id}`;
//                 weeklyTeamMetrics[week][teamName] = {
//                     "total canceled": 0,
//                     "total Submit": 0,
//                     "total delivery": 0,
//                     "Total Assign": 0, // Sum of value for projects ordered in this week AND assigned to this team
//                 };
//             });
//         });

//         // Populate the weekly metrics based on project data
//         projects.forEach(project => {
//             const team = teams.find(t => t.id === project.team_id);
//             if (!team) return; // Should not happen if team_id is valid
//             const teamName = team.team_name || `Team ${team.id}`;
//             const amount = Number(project.after_fiverr_amount || 0) + Number(project.after_Fiverr_bonus || 0);

//             weeks.forEach(({ week, start, end }) => {
//                 // Calculate 'total delivery' based on delivery_date
//                 if (project.is_delivered && project.delivery_date) {
//                     const deliveryDate = new Date(project.delivery_date);
//                      // Check if deliveryDate falls within the current week's range (inclusive)
//                     if (deliveryDate.getTime() >= start.getTime() && deliveryDate.getTime() <= end.getTime()) {
//                         weeklyTeamMetrics[week][teamName]["total delivery"] += amount;
//                     }
//                 }

//                 // Calculate 'total canceled', 'total Submit', and 'Total Assign' based on order date ('date')
//                  if (project.date) {
//                      const orderDate = new Date(project.date);
//                       // Check if orderDate falls within the current week's range (inclusive)
//                      if (orderDate.getTime() >= start.getTime() && orderDate.getTime() <= end.getTime()) {

//                          // Canceled projects ordered this week
//                          if (project.status === 'cancelled') {
//                              weeklyTeamMetrics[week][teamName]["total canceled"] += amount;
//                          }

//                          // Submitted projects ordered this week (and not delivered)
//                          if (project.status === 'submitted' && !project.is_delivered) {
//                              weeklyTeamMetrics[week][teamName]["total Submit"] += amount;
//                          }

//                          // Projects ordered this week and assigned to this team ('Total Assign' interpretation)
//                          // Note: This counts the project value in the week it was ordered, if assigned.
//                          // It doesn't track assignment date specifically.
//                          if (project.team_id === team.id) {
//                              weeklyTeamMetrics[week][teamName]["Total Assign"] += amount;
//                          }
//                      }
//                  }
//             });
//         });

//          // Emit the structured data
//          // You might want to wrap the result in a top-level key like 'weeklyTeamData'
//         io.emit("teamwiseGraph", { weeklyTeamData: weeklyTeamMetrics });
//  console.log("teamwiseGraph", { weeklyTeamData: weeklyTeamMetrics });
//     } catch (error) {
//         console.error('Error fetching all teams weekly metrics:', error);
//         // Emit an error back to the client
//         io.emit("teamwiseGraph", { error: 'Internal server error fetching weekly team data.' });
//     }
// }


async function teamwiseDeliveryGraph(io) {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const monthIndex = today.getMonth(); // 0 for Jan, 1 for Feb, etc.

        // Define week boundaries in UTC, including the end of the day (23:59:59.999)
        const weeks = [
            { week: 'Week 1', start: new Date(Date.UTC(year, monthIndex, 1)), end: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)) },
            { week: 'Week 2', start: new Date(Date.UTC(year, monthIndex, 8)), end: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)) },
            { week: 'Week 3', start: new Date(Date.UTC(year, monthIndex, 15)), end: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)) },
            { week: 'Week 4', start: new Date(Date.UTC(year, monthIndex, 22)), end: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)) } // end is last moment of the last day of the month
        ];

        const teamsWithData = await prisma.team.findMany({
            select: {
                id: true,
                team_name: true,
                team_target: true, // Added team_target
                team_member: {
                    select: {
                        id: true,
                        role: true,
                    },
                },
            },
        });

        const teamInfoMap = new Map();
        teamsWithData.forEach(team => {
            const isSales = team.team_member.some(member => member.role?.toLowerCase().startsWith('sales_'));
            const memberIds = team.team_member.map(member => member.id);
            const teamName = team.team_name || `Team ${team.id}`;
            teamInfoMap.set(team.id, {
                id: team.id,
                name: teamName,
                isSales: isSales,
                memberIds: memberIds,
                target: Number(team.team_target || 0), // Store numeric team target
            });
        });

        const startOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1));
        const endOfMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)); // Last moment of the last day of the month

        const allRelevantProjects = await prisma.project.findMany({
            where: {
                // Fetch projects relevant for the month:
                // - Ordered this month (for sales achievement, operations cancellations/assignments)
                // - Delivered this month (for operations achievement)
                // Ensure cancelled projects ordered this month are also fetched.
                OR: [
                    { date: { gte: startOfMonthUTC, lte: endOfMonthUTC } }, // Ordered this month
                    { 
                        delivery_date: { gte: startOfMonthUTC, lte: endOfMonthUTC }, 
                        is_delivered: true 
                    }, // Delivered this month
                ]
            },
            select: {
                id: true,
                team_id: true, // ID of the team assigned to the project (usually operations)
                date: true,         // Order date
                delivery_date: true,
                status: true,
                is_delivered: true,
                after_fiverr_amount: true,
                after_Fiverr_bonus: true,
                ordered_by: true,   // ID of the team_member who ordered (relevant for sales)
            },
        });

        const weeklyTeamMetrics = {};
        weeks.forEach(({ week }) => {
            weeklyTeamMetrics[week] = {};
            teamInfoMap.forEach(team => {
                weeklyTeamMetrics[week][team.name] = {
                    "total target": Math.round((team.target || 0) / weeks.length), // Distribute target weekly
                    "total achieve": 0,
                    "total cancelled": 0, // Will only be populated for Operations teams
                };
            });
        });

        allRelevantProjects.forEach(project => {
            const amount = Number(project.after_fiverr_amount || 0) + Number(project.after_Fiverr_bonus || 0);
            const orderDate = project.date ? new Date(project.date) : null;
            const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;

            weeks.forEach(({ week, start, end }) => {
                const orderedInWeek = orderDate && orderDate.getTime() >= start.getTime() && orderDate.getTime() <= end.getTime();
                const deliveredInWeek = deliveryDate && deliveryDate.getTime() >= start.getTime() && deliveryDate.getTime() <= end.getTime();

                teamInfoMap.forEach(team => {
                    const teamName = team.name;
                    const currentWeekMetrics = weeklyTeamMetrics[week][teamName];

                    if (team.isSales) {
                        // Logic for Sales Teams
                        const isRelevantOrderForSalesTeam = project.ordered_by && team.memberIds.includes(project.ordered_by);
                        
                        if (isRelevantOrderForSalesTeam && orderedInWeek) {
                            if (project.status !== 'cancelled') {
                                currentWeekMetrics["total achieve"] += amount;
                            }
                            // "total cancelled" is NOT calculated for sales teams as per requirements
                        }
                    } else {
                        // Logic for Operations Teams (non-Sales)
                        if (project.team_id === team.id) { // Project is assigned to this operations team
                            if (project.is_delivered && deliveredInWeek) {
                                currentWeekMetrics["total achieve"] += amount;
                            }
                            // Calculate "total cancelled" for operations teams
                            // Based on projects assigned to them (team_id match)
                            // and ordered in the week (orderedInWeek) that are now cancelled.
                            if (project.status === 'cancelled' && orderedInWeek) {
                                currentWeekMetrics["total cancelled"] += amount;
                            }
                        }
                    }
                }); // End team loop
            }); // End week loop
        }); // End project loop

        io.emit("teamwiseGraph", { weeklyTeamData: weeklyTeamMetrics });
        console.log("Emitted teamwiseGraph", { weeklyTeamData: weeklyTeamMetrics });

    } catch (error) {
        console.error('Error fetching weekly team metrics for teamwiseDeliveryGraph:', error);
        io.emit("teamwiseGraph", { error: 'Internal server error fetching weekly team data.' });
    }
}

// async function eachTeamChart(clientSocket, user) { // Changed io to clientSocket
//   try {
//     const me = await prisma.team_member.findUnique({
//       where: { uid: user.uid },  // Use user from socket auth
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
//         io.emit('eachTeamChart', { /* ... error object ... */ });
//         return;
//       }

//       const teamMembers = await prisma.team_member.findMany({
//         where: { team_id: me.team_id },
//         select: { id: true, first_name: true, target: true },
//       });
//       const memberIds = teamMembers.map(m => m.id);

//       if (memberIds.length === 0) {
//         // ... handle team with no members ...
//         io.emit('eachTeamChart', { /* ... error or empty state object ... */ });
//         return;
//       }

//       const allProjectsByTeamMembers = await prisma.project.findMany({
//         where: { ordered_by: { in: memberIds } },
//         select: { /* ... all necessary fields including date, status, amounts, team_id ... */
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
      
//       // ... (teamTotalCarry, submitted, totalAssign/assignedProjectCount calculations as before) ...
//       // For brevity, assuming they are correct from previous iteration
//       let teamTotalCarry = 0; // Placeholder for actual calculation
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

//       let submitted = 0; // Placeholder
//       allProjectsByTeamMembers.forEach(p => {
//         if (p.status === 'submitted' && !p.is_delivered) {
//           submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });

//       let assignedProjectCount = 0; // Placeholder
//       let totalAssignedAmount = 0;  // Placeholder
//       allProjectsByTeamMembers.forEach(p => {
//         if (p.team_id != null) {
//           assignedProjectCount++;
//           totalAssignedAmount += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
//         }
//       });
//       // End of placeholder calculations


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

//       clientSocket.emit('eachTeamChart', {
//         teamTarget, teamAchievement, teamCancelled, teamTotalCarry, submitted,
//         totalAssign: totalAssignedAmount, assignedProjectCount,
//         teamName, memberTarget, weeklyAchievementBreakdown,
//       });
//       return;
//     }
//     //─── OPERATION branch ───────────────────────────────────────────────────────
 
// //─── OPERATION branch ───────────────────────────────────────────────────────
//     if (isOperation) {
//       const teamIds = [me.team_id].filter(Boolean);

//       for (const teamId of teamIds) {
//         const teamData = await prisma.team.findUnique({
//           where: { id: teamId },
//           select: {
//             team_target: true,
//             team_name:   true,
//             team_member: {
//               select: { id: true, first_name: true, target: true },
//             },
//           },
//         });
//         if (!teamData) continue;

//         const baseFilter   = { team_id: teamId };
//         const startOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1));
//         const endOfMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 0));

//         // Projects delivered this month
//         const deliveredThisMonth = await prisma.project.findMany({
//           where: { ...baseFilter, is_delivered: true, delivery_date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Projects cancelled this monthghjo7='ikgbf` qa
//         const cancelledThisMonth = await prisma.project.findMany({
//           where: { ...baseFilter, status: 'cancelled', date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Carry projects (not delivered, ordered before this month, and not cancelled)
//         const carryProjects = await prisma.project.findMany({
//           where: {
//             ...baseFilter,
//             is_delivered: false,
//             date: { lt: startOfMonthUTC },
//             status: { not: 'cancelled' },
//           },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Submitted projects this month (not delivered)
//         const submittedThisMonth = await prisma.project.findMany({
//           where: { ...baseFilter, status: 'submitted', is_delivered: false, date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
//           select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // All projects assigned to the team (including carry)
//         const allAssignedProjects = await prisma.project.findMany({
//           where: baseFilter,
//           select: { is_delivered: true, after_fiverr_amount: true, after_Fiverr_bonus: true },
//         });

//         // Fetch weekly delivered projects in bulk
//         const weeklyDeliveredProjects = await Promise.all(
//           weeks.map(({ start, end }) =>
//             prisma.project.findMany({
//               where: {
//                 team_id: teamId,
//                 is_delivered: true,
//                 delivery_date: { gte: start, lte: end },
//               },
//               select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
//             })
//           )
//         );

//         let teamTarget     = Number(teamData.team_target || 0);
//         let teamAchievement = deliveredThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let teamCancelled   = cancelledThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let teamTotalCarry  = carryProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let submitted     = submittedThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//         let totalAssign     = allAssignedProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

//         const memberIds   = teamData.team_member.map(m => m.id);
//         // const distributions = await prisma.member_distribution.findMany({
//         //   where: { team_member_id: { in: memberIds } },
//         // });
//         // const memberTarget = teamData.team_member.map(m => ({
//         //   memberName: m.first_name,
//         //   target:     m.target || 0,
//         //   earned:     distributions
//         //                   .filter(d => d.team_member_id === m.id)
//         //                   .reduce((s, d) => s + Number(d.amount), 0),
//         // }));
// // MODIFICATION START: Fetch distributions with project delivery details
//         const distributions = await prisma.member_distribution.findMany({
//           where: { team_member_id: { in: memberIds } },
//           include: {      // Include project data for filtering by delivery date
//             project: {
//               select: {
//                 is_delivered: true,
//                 delivery_date: true
//               }
//             }
//           }
//         });
//         // MODIFICATION END

//         // MODIFICATION START: Adjust memberTarget earned calculation
//         const memberTarget = teamData.team_member.map(m => {
//           const earnedForMonth = distributions
//             .filter(d => {
//               if (d.team_member_id === m.id && d.project && d.project.is_delivered && d.project.delivery_date) {
//                 // Prisma returns dates as JS Date objects (already in UTC if your db stores them as such or as DATE type)
//                 const deliveryDate = d.project.delivery_date;
//                 return deliveryDate.getTime() >= startOfMonthUTC.getTime() && deliveryDate.getTime() <= endOfMonthUTC.getTime();
//               }
//               return false;
//             })
//             .reduce((s, d) => s + Number(d.amount || 0), 0); // Ensure d.amount is handled if it can be null/undefined

//           return {
//             memberName: m.first_name,
//             target: Number(m.target || 0), // Ensure target is a number
//             earned: earnedForMonth,
//           };
//         });
//         // MODIFICATION END
//         const weeklyAchievementBreakdown = weeks.map(({ week, start, end }, index) => {
//           const weeklyAmount = weeklyDeliveredProjects[index].reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
//           return {
//             week,
//             range: `${start.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})}`,
//             target: Math.round(teamTarget / 4),
//             amount: weeklyAmount,
//           };
//         });

//         const resultArray = {
//           teamTarget,
//           teamAchievement,
//           teamCancelled,
//           teamTotalCarry,
//           submitted,
//           totalAssign,
//           teamName: teamData.team_name,
//           memberTarget,
//           weeklyAchievementBreakdown,
//         };
//         clientSocket.emit('eachTeamChart', resultArray);
//       }
//       return;
//     }
//     // ... other role handling ...
//   } catch (err) {
//     console.error('Error fetching team data in eachTeamChart:', err);
//     clientSocket.emit('eachTeamChart', { error: "Server error fetching team data." });
//   }
// }

async function eachTeamChart(io, user) {

  try {

    const me = await prisma.team_member.findUnique({

      where: { uid: user.uid },  // Use user from socket auth

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

      { week: 'Week 1', start: new Date(Date.UTC(year, monthIndex, 1)),  end: new Date(Date.UTC(year, monthIndex, 7)) },

      { week: 'Week 2', start: new Date(Date.UTC(year, monthIndex, 8)),  end: new Date(Date.UTC(year, monthIndex, 14)) },

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

      let totalAssignedAmount = 0;  // Placeholder

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

            team_name:   true,

            team_member: {

              select: { id: true, first_name: true, target: true },

            },

          },

        });

        if (!teamData) continue;



        const baseFilter   = { team_id: teamId };

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



        let teamTarget     = Number(teamData.team_target || 0);

        let teamAchievement = deliveredThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

        let teamCancelled   = cancelledThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

        let teamTotalCarry  = carryProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

        let submitted     = submittedThisMonth.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);

        let totalAssign     = allAssignedProjects.reduce((sum, p) => sum + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);



        const memberIds   = teamData.team_member.map(m => m.id);

        // const distributions = await prisma.member_distribution.findMany({

        //   where: { team_member_id: { in: memberIds } },

        // });

        // const memberTarget = teamData.team_member.map(m => ({

        //   memberName: m.first_name,

        //   target:     m.target || 0,

        //   earned:     distributions

        //                   .filter(d => d.team_member_id === m.id)

        //                   .reduce((s, d) => s + Number(d.amount), 0),

        // }));

// MODIFICATION START: Fetch distributions with project delivery details

        const distributions = await prisma.member_distribution.findMany({

          where: { team_member_id: { in: memberIds } },

          include: {      // Include project data for filtering by delivery date

            project: {

              select: {

                is_delivered: true,

                delivery_date: true

              }

            }

          }

        });

        // MODIFICATION END



        // MODIFICATION START: Adjust memberTarget earned calculation

        const memberTarget = teamData.team_member.map(m => {

          const earnedForMonth = distributions

            .filter(d => {

              if (d.team_member_id === m.id && d.project && d.project.is_delivered && d.project.delivery_date) {

                // Prisma returns dates as JS Date objects (already in UTC if your db stores them as such or as DATE type)

                const deliveryDate = d.project.delivery_date;

                return deliveryDate.getTime() >= startOfMonthUTC.getTime() && deliveryDate.getTime() <= endOfMonthUTC.getTime();

              }

              return false;

            })

            .reduce((s, d) => s + Number(d.amount || 0), 0); // Ensure d.amount is handled if it can be null/undefined



          return {

            memberName: m.first_name,

            target: Number(m.target || 0), // Ensure target is a number

            earned: earnedForMonth,

          };

        });

        // MODIFICATION END

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


// This function is called when a specific team ID is provided
async function eachTeamChartForTeamId(io, teamIdToQuery) {
  try {
    if (!teamIdToQuery) {
      console.log('Team ID not provided');
      io.emit('eachTeamChart', { error: "Team ID is required." });
      return;
    }

    // Step 1: Fetch team members to determine the team's nature (Sales or Operations)
    // We need at least one member's role. Fetching all members of the team.
    const teamMembersForRoleCheck = await prisma.team_member.findMany({
      where: { team_id: teamIdToQuery },
      select: { id: true, role: true, first_name: true, target: true }, // Include fields needed by both branches
    });

    let isSalesTeam = false;
    if (teamMembersForRoleCheck && teamMembersForRoleCheck.length > 0) {
      // Check if any member has a sales role
      isSalesTeam = teamMembersForRoleCheck.some(member => member.role?.startsWith('sales_'));
    } else {
      // No members found for the team. Default to operations logic or handle as an error/empty state.
      // For now, let's assume it will proceed with operations logic, which will likely result in zeros.
      // Or, you could emit an empty chart data here.
      console.log(`No members found for team ID ${teamIdToQuery} to determine role. Defaulting to operations logic.`);
      // To provide a clean empty state if no members:
      // const teamDataForEmpty = await prisma.team.findUnique({ where: { id: teamIdToQuery }, select: { team_target: true, team_name: true } });
      // io.emit('eachTeamChart', { teamTarget: Number(teamDataForEmpty?.team_target || 0), teamName: teamDataForEmpty?.team_name || `Team ${teamIdToQuery}`, ... (other fields as 0/empty) });
      // return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();

    const weeks = [
      { week: 'Week 1', start: new Date(Date.UTC(year, monthIndex, 1)),  end: new Date(Date.UTC(year, monthIndex, 7)) },
      { week: 'Week 2', start: new Date(Date.UTC(year, monthIndex, 8)),  end: new Date(Date.UTC(year, monthIndex, 14)) },
      { week: 'Week 3', start: new Date(Date.UTC(year, monthIndex, 15)), end: new Date(Date.UTC(year, monthIndex, 21)) },
      { week: 'Week 4', start: new Date(Date.UTC(year, monthIndex, 22)), end: new Date(Date.UTC(year, monthIndex + 1, 0)) }
    ];
    const startOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1));
    const endOfMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 0));


    if (isSalesTeam) {
      // --- SALES LOGIC ---
      // (Adapted from your original isSalesRole block and eachTeamChartForSalesTeamId)
      console.log(`Team ID ${teamIdToQuery} identified as SALES team. Applying sales logic.`);

      const memberIds = teamMembersForRoleCheck.map(m => m.id); // Already fetched

      if (memberIds.length === 0) { // Should not happen if isSalesTeam is true based on members, but good check
        io.emit('eachTeamChart', { error: `Sales team ${teamIdToQuery} has no members to process.` });
        return;
      }

      const allProjectsByTeamMembers = await prisma.project.findMany({
        where: { ordered_by: { in: memberIds } },
        select: {
          id: true, date: true, ordered_by: true, status: true,
          after_fiverr_amount: true, after_Fiverr_bonus: true,
          is_delivered: true, delivery_date: true, team_id: true,
        }
      });

      const teamData = await prisma.team.findUnique({
        where: { id: teamIdToQuery },
        select: { team_target: true, team_name: true }
      });
      
      const teamTarget = Number(teamData?.team_target || 0);
      const teamName = teamData?.team_name || 'Unknown Sales Team';

      const projectsOrderedThisMonth = allProjectsByTeamMembers.filter(p => {
        if (!p.date) return false;
        const orderDate = new Date(p.date);
        return orderDate.getTime() >= startOfMonthUTC.getTime() && orderDate.getTime() <= endOfMonthUTC.getTime();
      });

      let teamAchievement = 0, teamCancelled = 0;
      projectsOrderedThisMonth.forEach(p => {
        const projectValue = Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        if (p.status === 'cancelled') teamCancelled += projectValue;
        else teamAchievement += projectValue;
      });
      
      let teamTotalCarry = 0;
      allProjectsByTeamMembers.filter(p => p.date && new Date(p.date).getTime() < startOfMonthUTC.getTime())
        .forEach(p => {
          if (!p.is_delivered && p.status !== 'cancelled') {
            teamTotalCarry += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
          }
        });

      let submitted = 0;
      allProjectsByTeamMembers.forEach(p => {
        if (p.status === 'submitted' && !p.is_delivered) {
          submitted += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        }
      });

      let assignedProjectCount = 0, totalAssignedAmount = 0;
      allProjectsByTeamMembers.forEach(p => {
        if (p.team_id != null) {
          assignedProjectCount++;
          totalAssignedAmount += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
        }
      });

      const memberTargetData = teamMembersForRoleCheck.map(m => { // Use already fetched members
        let earnedThisMonth = 0;
        projectsOrderedThisMonth.forEach(p => {
          if (p.ordered_by === m.id && p.status !== 'cancelled') {
            earnedThisMonth += Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0);
          }
        });
        return { memberName: m.first_name, target: Number(m.target || 0), earned: earnedThisMonth };
      });

      const achievementProjectsThisMonth = projectsOrderedThisMonth.filter(p => p.status !== 'cancelled');
      const weeklyAchievementBreakdown = weeks.map(({ week, start, end }) => {
        const amount = achievementProjectsThisMonth
          .filter(p => p.date && new Date(p.date).getTime() >= start.getTime() && new Date(p.date).getTime() <= end.getTime())
          .reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
        return {
          week,
          range: `${start.toLocaleDateString('en-US', {timeZone: 'UTC', month:'short', day:'numeric'})} - ${end.toLocaleDateString('en-US', {timeZone: 'UTC', month:'short', day:'numeric'})}`,
          target: weeks.length > 0 ? Math.round(teamTarget / weeks.length) : 0,
          amount,
        };
      });

      io.emit('eachTeamChartForTeamId', {
        teamTarget, teamAchievement, teamCancelled, teamTotalCarry, submitted,
        totalAssign: totalAssignedAmount, assignedProjectCount,
        teamName, memberTarget: memberTargetData, weeklyAchievementBreakdown,
        _meta: { logicUsed: 'sales', teamId: teamIdToQuery } // Optional metadata for debugging
      });

    } else {
      // --- OPERATIONS (or DEFAULT) LOGIC ---
      // (Adapted from your isOperation block and the first eachTeamChartForTeamId)
      console.log(`Team ID ${teamIdToQuery} identified as OPERATIONS/OTHER team. Applying operations logic.`);

      const teamData = await prisma.team.findUnique({ // teamMembersForRoleCheck contains member info if needed
        where: { id: teamIdToQuery },
        select: { team_target: true, team_name: true, team_member: { select: {id: true, first_name: true, target: true}} }, // Re-fetch with full member list if needed, or use teamMembersForRoleCheck
      });

      if (!teamData) {
        io.emit('eachTeamChart', { error: `Team ${teamIdToQuery} not found for operations logic.` });
        return;
      }
      
      const teamTarget = Number(teamData.team_target || 0);
      const teamName = teamData.team_name || 'Unknown Operations Team';
      const currentTeamMembers = teamData.team_member || teamMembersForRoleCheck; // Use more complete list if available

      const baseFilter = { team_id: teamIdToQuery };

      const deliveredThisMonth = await prisma.project.findMany({
        where: { ...baseFilter, is_delivered: true, delivery_date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
        select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
      });

      const cancelledThisMonth = await prisma.project.findMany({
        where: { ...baseFilter, status: 'cancelled', date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
        select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
      });

      const carryProjects = await prisma.project.findMany({
        where: { ...baseFilter, is_delivered: false, date: { lt: startOfMonthUTC }, status: { not: 'cancelled' } },
        select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
      });

      const submittedThisMonth = await prisma.project.findMany({
        where: { ...baseFilter, status: 'submitted', is_delivered: false, date: { gte: startOfMonthUTC, lte: endOfMonthUTC } },
        select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
      });
      
      const allAssignedProjects = await prisma.project.findMany({
          where: baseFilter,
          select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
      });
      const assignedProjectCount = await prisma.project.count({ where: baseFilter });

      const weeklyDeliveredProjectsData = await Promise.all(
        weeks.map(({ start, end }) =>
          prisma.project.findMany({
            where: { team_id: teamIdToQuery, is_delivered: true, delivery_date: { gte: start, lte: end }},
            select: { after_fiverr_amount: true, after_Fiverr_bonus: true },
          })
        )
      );

      let teamAchievement_ops = deliveredThisMonth.reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
      let teamCancelled_ops = cancelledThisMonth.reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
      let teamTotalCarry_ops = carryProjects.reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
      let submitted_ops = submittedThisMonth.reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
      let totalAssignedAmount_ops = allAssignedProjects.reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_F_bonus || 0), 0);

      let memberTargetData_ops = [];
      const memberIds_ops = currentTeamMembers.map(m => m.id);
      if (memberIds_ops.length > 0) {
          const distributions = await prisma.member_distribution.findMany({
              where: { team_member_id: { in: memberIds_ops } },
              include: { project: { select: { is_delivered: true, delivery_date: true } } }
          });
          memberTargetData_ops = currentTeamMembers.map(m => {
              const earnedForMonth = distributions
                  .filter(d => d.team_member_id === m.id && d.project?.is_delivered && d.project.delivery_date &&
                               new Date(d.project.delivery_date).getTime() >= startOfMonthUTC.getTime() &&
                               new Date(d.project.delivery_date).getTime() <= endOfMonthUTC.getTime())
                  .reduce((s, d) => s + Number(d.amount || 0), 0);
              return { memberName: m.first_name, target: Number(m.target || 0), earned: earnedForMonth };
          });
      }
      
      const weeklyAchievementBreakdown_ops = weeks.map(({ week, start, end }, index) => {
        const amount = weeklyDeliveredProjectsData[index].reduce((s, p) => s + Number(p.after_fiverr_amount || 0) + Number(p.after_Fiverr_bonus || 0), 0);
        return {
          week,
          range: `${start.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})} - ${end.toLocaleDateString('en-US',{timeZone: 'UTC', month:'short',day:'numeric'})}`,
          target: weeks.length > 0 ? Math.round(teamTarget / weeks.length) : 0,
          amount,
        };
      });

      io.emit('eachTeamChartForTeamId', {
        teamTarget, teamAchievement: teamAchievement_ops, teamCancelled: teamCancelled_ops,
        teamTotalCarry: teamTotalCarry_ops, submitted: submitted_ops,
        totalAssign: totalAssignedAmount_ops, assignedProjectCount,
        teamName, memberTarget: memberTargetData_ops, weeklyAchievementBreakdown: weeklyAchievementBreakdown_ops,
        _meta: { logicUsed: 'operations', teamId: teamIdToQuery } // Optional metadata for debugging
      });
    }

  } catch (err) {
    console.error(`Error in getTeamChartDataByRole for team ${teamIdToQuery}:`, err);
    io.emit('eachTeamChart', { error: "Server error processing team chart data." });
  }
}



async function getProfileCurrentMonthWeeklyDetails  (io)  {
  try {
    // 1. Determine Current Year and Month
    const currentServerDate = new Date();
    const year = currentServerDate.getFullYear();
    const monthIndex = currentServerDate.getMonth(); // 0-indexed (e.g., January is 0, May is 4)
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[monthIndex];

    // Calculate the last day of the current month for the range string
    const lastDayOfCurrentMonthNumber = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

    // 2. Define Week Structures
    // This base definition will be deep-copied for each profile.
    const baseWeeksDefinition = [
      {
        week: 'Week 1',
        range: `${currentMonthName} 1 - ${currentMonthName} 7`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)),
        amount: 0,
        clients: []
      },
      {
        week: 'Week 2',
        range: `${currentMonthName} 8 - ${currentMonthName} 14`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 8, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)),
        amount: 0,
        clients: []
      },
      {
        week: 'Week 3',
        range: `${currentMonthName} 15 - ${currentMonthName} 21`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 15, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)),
        amount: 0,
        clients: []
      },
      {
        week: 'Week 4',
        range: `${currentMonthName} 22 - ${currentMonthName} ${lastDayOfCurrentMonthNumber}`,
        _internal_start_date: new Date(Date.UTC(year, monthIndex, 22, 0, 0, 0, 0)),
        _internal_end_date: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)), // End of the last day
        amount: 0,
        clients: []
      }
    ];

    // 3. Fetch Special Orders for the Entire Current Month
    const firstDayOfMonth = baseWeeksDefinition[0]._internal_start_date;
    const lastDayOfMonth = baseWeeksDefinition[3]._internal_end_date;

    const ordersInMonth = await prisma.project_special_order.findMany({
      where: {
        created_date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      select: {
        special_order_amount: true,
        created_date: true,
        client_name: true, // Crucial for the report
        profile: {
          select: {
            profile_name: true,
          },
        },
      },
    });

    // 4. Process and Aggregate Orders
    const reportDataByProfile = {};
    let overallTotalSpecialOrderAmount = 0; // Initialize overall total amount
    const profileOrderStats = {}; // To store { totalOrders: 0, totalAmount: 0 } for each profile

    ordersInMonth.forEach(order => {
      if (
        !order.profile ||
        !order.profile.profile_name ||
        !order.created_date ||
        order.special_order_amount === null ||
        order.special_order_amount === undefined
      ) {
        console.warn('Skipping order due to missing essential data:', order);
        return;
      }

      const profileName = order.profile.profile_name;
      const amount = parseFloat(order.special_order_amount);
      const clientName = order.client_name ? order.client_name.trim() : null;

      if (isNaN(amount)) {
        console.warn(`Skipping order for profile ${profileName} due to invalid amount:`, order.special_order_amount);
        return;
      }
      
      if (!clientName || clientName === "") {
        // Client name is crucial for the weekly breakdown details.
        // If it's missing, we might still count it for overall/profile totals if requirements differ,
        // but for this report's structure, it's better to skip if client name is missing for weekly aggregation.
        console.warn(`Skipping order for profile ${profileName} due to missing client name (client name is required for weekly client breakdown).`);
        return;
      }

      // Update overall total amount
      overallTotalSpecialOrderAmount += amount;

      // Initialize and update profile-specific stats
      if (!profileOrderStats[profileName]) {
        profileOrderStats[profileName] = { totalOrders: 0, totalAmount: 0 };
      }
      profileOrderStats[profileName].totalOrders += 1;
      profileOrderStats[profileName].totalAmount += amount;

      const orderDate = new Date(order.created_date);

      // Initialize for the profile in reportDataByProfile if it's the first time encountered
      if (!reportDataByProfile[profileName]) {
        // Deep copy baseWeeksDefinition for this specific profile
        reportDataByProfile[profileName] = baseWeeksDefinition.map(weekDef => ({
          ...weekDef, // Spread to copy properties from baseWeeksDefinition
          // target: weekDef.target, // Uncomment if target is part of baseWeeksDefinition and needed
          amount: 0, // Ensure amount starts at 0 for this profile's week
          clients: [] // Fresh array for this profile's week clients
        }));
      }

      // Assign order to the correct week for this profile
      for (const weekData of reportDataByProfile[profileName]) {
        if (orderDate >= weekData._internal_start_date && orderDate <= weekData._internal_end_date) {
          // Aggregate total amount for the week
          weekData.amount += amount;

          // Find if the client already exists in this week's client list
          const existingClient = weekData.clients.find(client => client.name === clientName);

          if (existingClient) {
            // If client exists, add the amount
            existingClient.amount += amount;
          } else {
            // If client does not exist, add a new client object
            weekData.clients.push({ name: clientName, amount: amount });
          }
          break; // Order processed for one week
        }
      }
    });

    // 5. Finalize data: sort clients by name, remove internal date fields, and format profile summary
    for (const profileName in reportDataByProfile) {
      reportDataByProfile[profileName].forEach(weekData => {
        // Sort clients by name
        weekData.clients.sort((a, b) => a.name.localeCompare(b.name));
        
        // Clean up helper fields
        delete weekData._internal_start_date;
        delete weekData._internal_end_date;
      });
    }

    // Format profile summary for the response
    const profileSummaryForResponse = {};
    for (const profileName in profileOrderStats) {
      const stats = profileOrderStats[profileName];
      profileSummaryForResponse[profileName] = {
        "total special orders": stats.totalOrders, // Key as per your example
        "total amount": parseFloat(stats.totalAmount.toFixed(2)) // Key as per your example
      };
    }

    // If you want to ensure all profiles (even those with no orders) are listed in profileOrderSummary or report,
    // you would need to fetch all profile names first, initialize reportDataByProfile and profileOrderStats for all of them,
    // and then populate. Currently, only profiles with orders in the current month will appear.

    io.emit('profile_based_special_orders', {
      currentYear: year,
      currentMonth: currentMonthName,
      overallTotalSpecialOrderAmount: parseFloat(overallTotalSpecialOrderAmount.toFixed(2)),
      profileOrderSummary: profileSummaryForResponse,
      report: reportDataByProfile,
    });

  } catch (error) {
    console.error('Error generating profile current month weekly details:', error);
    res.status(500).json({ error: 'Failed to generate current month weekly details report' });
  }
};




// Assuming prisma client is initialized elsewhere
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// Helper function to generate the predefined week structures for a given month
function generatePredefinedWeeks(year, monthIndex) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[monthIndex];
    const lastDayOfMonthObject = new Date(year, monthIndex + 1, 0);
    const lastDayOfCurrentMonthNumber = lastDayOfMonthObject.getDate();

    return [
        {
            week: 'Week 1',
            range: `${currentMonthName} 1 - ${currentMonthName} 7`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, 7, 23, 59, 59, 999)),
            amount: 0,
        },
        {
            week: 'Week 2',
            range: `${currentMonthName} 8 - ${currentMonthName} 14`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 8, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, 14, 23, 59, 59, 999)),
            amount: 0,
        },
        {
            week: 'Week 3',
            range: `${currentMonthName} 15 - ${currentMonthName} 21`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 15, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, 21, 23, 59, 59, 999)),
            amount: 0,
        },
        {
            week: 'Week 4',
            range: `${currentMonthName} 22 - ${currentMonthName} ${lastDayOfCurrentMonthNumber}`,
            _internal_start_date: new Date(Date.UTC(year, monthIndex, 22, 0, 0, 0, 0)),
            _internal_end_date: new Date(Date.UTC(year, monthIndex, lastDayOfCurrentMonthNumber, 23, 59, 59, 999)),
            amount: 0,
        }
    ];
}

// Custom deep copy function to preserve Date objects and reset amounts
function deepCopyWeeklySummary(weeksArray) {
    return weeksArray.map(week => ({
        // Copy all properties from the original week object
        ...week,
        // Explicitly create new Date objects to ensure they are instances of Date
        _internal_start_date: new Date(week._internal_start_date.getTime()),
        _internal_end_date: new Date(week._internal_end_date.getTime()),
        // Ensure amount is reset for the fresh copy
        amount: 0
    }));
}

 async function getMonthlyProfileActivityChart(io) {
  try {
    const now = new Date(); // Current server time: May 15, 2025
    const year = now.getFullYear(); // 2025
    const monthIndex = now.getMonth(); // 4 (for May, 0-indexed)

    const baseWeeksDefinition = generatePredefinedWeeks(year, monthIndex);

    // Use UTC dates for Prisma query to align with UTC week definitions
    const firstDayOfMonthUTC = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const firstDayOfNextMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

    const rankingsThisMonth = await prisma.profile_ranking.findMany({
      where: {
        created_date: {
          gte: firstDayOfMonthUTC,
          lt: firstDayOfNextMonthUTC,
        },
      },
      include: {
        profile: {
          select: { profile_name: true, id: true },
        },
      },
      orderBy: { created_date: 'asc' },
    });

    const promotionsThisMonth = await prisma.profile_promotion.findMany({
      where: {
        created_date: {
          gte: firstDayOfMonthUTC,
          lt: firstDayOfNextMonthUTC,
        },
      },
      include: {
        profile: {
          select: { profile_name: true, id: true },
        },
      },
      orderBy: { created_date: 'asc' },
    });

    const groupedActivity = {};

    rankingsThisMonth.forEach(ranking => {
      const profileName = ranking.profile ? ranking.profile.profile_name : 'Unknown Profile';
      if (!groupedActivity[profileName]) {
        groupedActivity[profileName] = {
          profileId: ranking.profile_id,
          ranking: [],
          promotion: {
            weeklySummary: deepCopyWeeklySummary(baseWeeksDefinition), // Use proper deep copy
            totalAmountThisMonth: 0,
          },
        };
      }
      groupedActivity[profileName].ranking.push({
        date: ranking.created_date,
        keywords: ranking.keywords,
        row: ranking.row,
        rankingPage: ranking.ranking_page,
      });
    });

    promotionsThisMonth.forEach(promotion => {
      const profileName = promotion.profile ? promotion.profile.profile_name : 'Unknown Profile';
      const numPromotionAmount = parseFloat(promotion.promotion_amount) || 0;
      const promotionDate = new Date(promotion.created_date);

      if (!groupedActivity[profileName]) {
        groupedActivity[profileName] = {
          profileId: promotion.profile_id,
          ranking: [],
          promotion: {
            weeklySummary: deepCopyWeeklySummary(baseWeeksDefinition), // Use proper deep copy
            totalAmountThisMonth: 0,
          },
        };
      } else if (!groupedActivity[profileName].promotion) {
         groupedActivity[profileName].promotion = {
            weeklySummary: deepCopyWeeklySummary(baseWeeksDefinition), // Use proper deep copy
            totalAmountThisMonth: 0,
         };
      }
      // Ensure weeklySummary exists if promotion object was somehow partially initialized
      // This should be redundant if the above initializations are correct
      else if (!groupedActivity[profileName].promotion.weeklySummary) {
        groupedActivity[profileName].promotion.weeklySummary = deepCopyWeeklySummary(baseWeeksDefinition);
      }


      groupedActivity[profileName].promotion.totalAmountThisMonth += numPromotionAmount;

      for (const weekDefinition of groupedActivity[profileName].promotion.weeklySummary) {
        // Now both promotionDate and weekDefinition._internal_..._date are proper Date objects
        if (promotionDate >= weekDefinition._internal_start_date && promotionDate <= weekDefinition._internal_end_date) {
          weekDefinition.amount += numPromotionAmount;
          break; 
        }
      }
    });

    Object.values(groupedActivity).forEach(profileData => {
      if (profileData.promotion && profileData.promotion.weeklySummary) {
        profileData.promotion.weeklySummary.forEach(week => {
          delete week._internal_start_date;
          delete week._internal_end_date;
        });
      }
    });

    if (Object.keys(groupedActivity).length === 0) {
      return res.status(404).json({
        message: 'No profile activity (rankings or promotions) found for the current month.',
        data: {},
      });
    }

   
    io.emit('monthlyProfileActivityChart', {
      message: 'Monthly profile activity chart',
      data: groupedActivity,
      month: monthIndex + 1,
      year: year,
    });

  } catch (error) {
    console.error('Error retrieving monthly profile activity chart:', error);
    io.emit('monthlyProfileActivityChart', {
      error: 'Failed to retrieve monthly profile activity chart',
    });
  }
};


module.exports = { teamwiseDeliveryGraph, eachTeamChart, eachTeamChartForTeamId, getProfileCurrentMonthWeeklyDetails, getMonthlyProfileActivityChart };