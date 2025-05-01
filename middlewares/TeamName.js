// const { PrismaClient } = require('@prisma/client');
// const { io } = require('socket.io-client');
// const prisma = new PrismaClient();

// // Get team names for the selected department
// async function getTeamName(departmentId, io) {
//     try {
//         console.log('Fetching team names for department ID:', departmentId);
//         //convert departmentId to a number if it's a string
//         if (typeof departmentId === 'string') {
//             departmentId = parseInt(departmentId, 10); // Convert to number
//         }
//         if (isNaN(departmentId)) {
//             console.error('Invalid departmentId:', departmentId);
//             return; // Exit if departmentId is not a valid number
//         }
//         const teamNames = await prisma.team.findMany({
//             where: {
//                 department_id: departmentId // Using the departmentId for filtering teams
//             },
//             select: {
//                 team_name: true,
//                 id: true
//             }
//         });
//        // console.log('Team Names:', teamNames);
//         io.emit('getTeamName', teamNames);  // Emit team names to the client
//     } catch (err) {
//         console.error('[Socket] Failed to emit team names:', err);
//     }
// }

// // Get all department names
// async function getDepartmentName(io) {
//     try {
//         const departmentNames = await prisma.department.findMany({
//             select: {
//                 department_name: true,
//                 id: true
//             }
//         });
//         console.log('Department Names:', departmentNames);
//         io.emit('getDepartmentName', departmentNames);  // Emit department names to the client
//     } catch (err) {
//         console.error('[Socket] Failed to emit department names:', err);
//     }
// }
// ================= no ==========

//get all team member of  department  department_name:sales
// async function getTeamMember(departmentId,io) {
//     try {
//         const teamMembers = await prisma.department.findMany({
//             where: {

//                 id: departmentId // Filter by the department ID
                  
//             },
//             include: {
//                 department_teams: {
//                     include: {
//                         team_member:true,
            
//                     },
//                 }
//             }
//         });
//         console.log('Team Members:', teamMembers);
//         io.emit('getTeamMember', teamMembers);  // Emit team members to the client

//         return teamMembers;  // Return team members
//     } catch (err) {
//         console.error('[Socket] Failed to fetch team members:', err);
//     }
// }

// ================ ss =================
// async function getTeamMember(departmentId, io) {
//     try {
//       console.log('Fetching team members for department ID:', departmentId);
//       const departmentWithTeams = await prisma.department.findUnique({
//         where: {
//           id: departmentId,  // Filter by the department ID
//         },
//         include: {
//           department_teams: {  // Include the teams in this department
//             include: {
//               team_member: true,  // Include the team members for each team
//             },
//           },
//         },
//       });
  
//       console.log('Department with Teams:', departmentWithTeams);
//       if (!departmentWithTeams) {
//         io.emit('getTeamMemberData', { error: "Department not found" });
//         return;
//       }
  
//       // Extract team members from the included teams
//       const teamMembers = departmentWithTeams.department_teams.map(team => ({
//         team_name: team.team_name,
//         members: team.team_member,
//       }));
  
//       console.log('Team Members:', teamMembers);
//       io.emit('getTeamMember', teamMembers);  // Emit the team members to the client
//     } catch (err) {
//       console.error('[Socket] Failed to emit team member data:', err);
//       io.emit('getTeamMemberData', { error: "Failed to fetch team members" });
//     }
//   }
  

// module.exports = { getTeamName, getDepartmentName, getTeamMember };




// ======================== my ===============

const { Server } = require('socket.io');  
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTeamName(departmentId, socket) {
  try {
      console.log('Fetching team names for department ID:', departmentId);

      if (typeof departmentId === 'string') {
          departmentId = parseInt(departmentId, 10);
      }
      if (isNaN(departmentId)) {
          console.error('Invalid departmentId:', departmentId);
          return;
      }

      const teamNames = await prisma.team.findMany({
          where: { department_id: departmentId },
          select: { team_name: true, id: true }
      });

      // ✅ Dynamically emit event
      socket.emit(`getTeamName:${departmentId}`, teamNames);

  } catch (err) {
      console.error('[Socket] Failed to emit team names:', err);
  }
}


async function getDepartmentName(socket) {
    try {
        const departmentNames = await prisma.department.findMany({
            select: { department_name: true, id: true }
        });
        console.log('Department Names:', departmentNames);
        socket.emit('getDepartmentName', departmentNames);
    } catch (err) {
        console.error('[Socket] Failed to emit department names:', err);
    }
}

async function getTeamMember(departmentId, socket) {
    try {
        console.log('Fetching team members for department ID:', departmentId);

        if (typeof departmentId === 'string') {
            departmentId = parseInt(departmentId, 10);
        }
        if (isNaN(departmentId)) {
            console.error('Invalid departmentId:', departmentId);
            return;
        }

        const departmentWithTeams = await prisma.department.findUnique({
            where: { id: departmentId },
            include: {
                department_teams: {
                    include: {
                        team_member: true,
                    },
                },
            },
        });

        if (!departmentWithTeams) {
            socket.emit('getTeamMember', { error: "Department not found" });
            return;
        }

        const teamMembers = departmentWithTeams.department_teams.map(team => ({
            team_name: team.team_name,
            members: team.team_member,
        }));

        console.log('Team Members:', teamMembers);
        socket.emit('getTeamMember', teamMembers);

    } catch (err) {
        console.error('[Socket] Failed to fetch team members:', err);
        socket.emit('getTeamMember', { error: "Failed to fetch team members" });
    }
}

module.exports = { getTeamName, getDepartmentName, getTeamMember };

