const { PrismaClient } = require('@prisma/client');
const generateToken = require('../config/generateToken');  // Adjust path to your token generator

const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');



exports.teamwiseDelivery = async (req, res) => {
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

        res.status(200).json(teamWiseDelivery);
    } catch (error) {
        console.error('Error fetching team-wise delivery:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}



exports.eachTeamChart = async (req, res) => {
    try {
         // Get the user ID from the session (global.user assumed)
      const userId = req.user.uid; // Assuming user ID is stored in req.user.uid
      console.log('User ID:', userId);

      // Step 1: Find the team of the user
      const userTeam = await prisma.team_member.findUnique({
          where: { uid: userId },
          select: { team_id: true }, // Fetch the team_id of the user
      });

      if (!userTeam) {
          return res.status(404).json({ error: 'User not found in any team' });
      }

      // Step 2: Get the current date and calculate the start of the current month
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      // Step 3: Retrieve the team associated with this user and get its target value once
      const teamData = await prisma.team.findUnique({
          where: { id: userTeam.team_id },
          select: {
              team_target: true, // Get the team target
              team_name: true,   // Get the team name
          },
      });

      // Step 4: Retrieve all projects assigned to this team for this month (delivered or not)
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
          include: {
              team: true
          },
      });

      // Step 5: Retrieve previous projects that are NOT delivered (and are from previous months)
      const teamProjectsNotDelivered = await prisma.project.findMany({
          where: {
              team_id: userTeam.team_id,
              is_delivered: false, // Not delivered
          },
          include: {
              team: true,
          },
      });

      // Initialize variables to hold the overall team achievements, targets, and cancellations
      let teamTarget = teamData.team_target || 0;  // Now using the team target directly from team data
      let teamAchievement = 0;
      let teamCancelled = 0;
      let teamTotalCarry = 0;
      let submitted = 0;

      console.log('Team Projects This Month:', teamProjectsThisMonth);
      console.log('Team Target:', teamTarget);

      // Step 6: Loop through projects for this month to calculate achievements, cancellations, and submitted
      teamProjectsThisMonth.forEach(project => {
          if (project.is_delivered) {
              teamAchievement += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
          }

        

        console.log('Project:', project);
      });

      // Step 7: Loop through previous (not delivered) projects to calculate carry-over value
      teamProjectsNotDelivered.forEach(project => {
          teamTotalCarry += parseFloat(project.total_carry) || 0;
          
console.log('Submitted Project:', project.status);  
if (project.status === 'submitted') {

     
         submitted += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
}

if (project.status === 'cancelled') {
    teamCancelled += parseFloat(project.after_fiverr_amount) + (parseFloat(project.after_Fiverr_bonus) || 0) || 0;
}

      });



               
 

  
      // Step 8: Return the response with team chart data
      return res.json({
        teamTarget,
        teamAchievement,
        teamCancelled,
        teamTotalCarry,
        submitted,
        teamName: teamData.team_name, // Include the team name in the response
      });
    } catch (error) {
      console.error('Error fetching team data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  