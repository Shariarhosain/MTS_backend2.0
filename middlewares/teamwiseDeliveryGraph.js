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

async function eachTeamChart(io) {
    try {
      const userId = global.user.uid;
  
      const userTeam = await prisma.team_member.findUnique({
        where: { uid: userId },
        select: { team_id: true },
      });
  
      if (!userTeam) {
        console.log("User not found in any team");
        return;
      }
  
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
      const teamData = await prisma.team.findUnique({
        where: { id: userTeam.team_id },
        select: {
          team_target: true,
          team_name: true,
          team_member: {
            select: {
              id: true,
              first_name: true,
              target: true,
            },
          },
        },
      });
  
      const teamProjectsThisMonth = await prisma.project.findMany({
        where: {
          team_id: userTeam.team_id,
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
  
      console.log('Team Projects This Month:', teamProjectsThisMonth);
  
      const teamProjectsNotDelivered = await prisma.project.findMany({
        where: {
          team_id: userTeam.team_id,
          is_delivered: false,
        },
      });
  
      let teamTarget = teamData.team_target ? parseInt(teamData.team_target) : 0;
      let teamAchievement = 0;
      let teamCancelled = 0;
      let teamTotalCarry = 0;
      let submitted = 0;
      let totalAssign = 0;
  
      teamProjectsThisMonth.forEach(project => {
        if (project.is_delivered) {
          teamAchievement += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
          console.log('Team Achievement:', teamAchievement);
          console.log('Project Team Achievement:', project);
        }
      });
  
      teamProjectsNotDelivered.forEach(project => {
        teamTotalCarry += parseFloat(project.total_carry) || 0;
  
        if (project.status === 'submitted') {
          submitted += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
        }
  
        if (project.status === 'cancelled') {
          teamCancelled += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
        }
  
        totalAssign += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
      });
  
      // Fetch member distribution (earnings)
      const memberIds = teamData.team_member.map(m => m.id);
      const distributions = await prisma.member_distribution.findMany({
        where: {
          team_member_id: { in: memberIds },
        },
      });
  
      const memberTarget = teamData.team_member.map(member => {
        const totalEarned = distributions
          .filter(dist => dist.team_member_id === member.id)
          .reduce((sum, dist) => sum + parseFloat(dist.amount), 0);
  
        return {
          memberName: member.first_name,
          target: member.target || 0,
          earned: totalEarned,
        };
      });
  
      // Weekly Achievement Breakdown
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const weeks = [
        { week: "Week 1", start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 7) },
        { week: "Week 2", start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8), end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 14) },
        { week: "Week 3", start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15), end: new Date(currentDate.getFullYear(), currentDate.getMonth(), 21) },
        { week: "Week 4", start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22), end: endOfMonth },
      ];
  
      const weeklyAchievementBreakdown = [];
  
      for (const { week, start, end } of weeks) {
        const weekProjects = teamProjectsThisMonth.filter(p => {
          const delivery = new Date(p.delivery_date);
          return p.is_delivered && delivery >= start && delivery <= end;
        });
  
        const amount = weekProjects.reduce((sum, p) =>
          sum + parseFloat(p.after_fiverr_amount) + (parseFloat(p.after_Fiverr_bonus) || 0), 0);
  
        const range = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  
        weeklyAchievementBreakdown.push({
          week,
          range,
          target: Math.round(teamTarget / 4),
          amount
        });
      }
  
      const result = {
        teamTarget,
        teamAchievement,
        teamCancelled,
        teamTotalCarry,
        submitted,
        totalAssign,
        teamName: teamData.team_name || 'Unknown Team',
        memberTarget,
        weeklyAchievementBreakdown
      };
  
      console.log('Team Chart Data:', result);
      io.emit("eachTeamChart", result);
  
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  }
  

module.exports = { teamwiseDeliveryGraph, eachTeamChart };