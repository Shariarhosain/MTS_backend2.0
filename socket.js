let io;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDepartmentName } = require('./middlewares/TeamName');
const { getTeamName } = require('./middlewares/TeamName');
const { getTeamMember } = require('./middlewares/TeamName');
const emitProfilename = require('./middlewares/showProfilename');
const emitProjectMoneyMetrics = require('./middlewares/carddetailsForoperation');
const {eachTeamChart,eachTeamChartForTeamId,getProfileCurrentMonthWeeklyDetails,getMonthlyProfileActivityChart,teamwiseDeliveryGraph} = require('./middlewares/teamwiseDeliveryGraph');
//const {eachTeamChartByTeamId} = require('./middlewares/teamwiseDeliveryGraph');

const totalOrdersCardData  = require('./middlewares/projectCardEmitter');
const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    }
  });


const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_secret_key';  // Store securely in .env


  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    try {
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;  // Attach user info to this socket instance
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });



















  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send initial project data or request paginated projects when the client connects
    socket.on('requestPaginatedProjects', async (data) => {
      const { page, limit } = data;
      try {
        await require('./controllers/projectController').sendPaginatedProjectData(socket, page, limit);
      } catch (error) {
        console.error('Error sending paginated project data:', error);
      }
    });

    // Real-time updates for project creation and updates
    socket.on('projectCreated', (project) => {
      // Emit project creation event
      io.emit('projectCreated', project);
    });

    socket.on('projectUpdated', (project) => {
      // Emit project update event
      io.emit('projectUpdated', project);
 
    
    
    });

    socket.on('salesDataEachProfile', (salesDataWithProfileName) => {
      io.emit('salesDataEachProfile', salesDataWithProfileName);
    });

    // io.emit("allProjects", projects); 
    socket.on('allProjects',async () => {
     try{
       
       await totalOrdersCardData(io);

     }
      catch (error) {
        console.error("Error fetching all projects:", error);
      }
   
    });

    socket.on('getTeamMemberByDepartment', async (departmentName) => {
      try {
        console.log('Fetching team members for department:', departmentName);
        await getTeamMember(departmentName, io);  // Fetch and emit team members for the selected department
      } catch (error) {
        console.error("Error fetching team members:", error);
        
      }
    });

  
//   io.emit('getProfilename', profiles);
socket.on('getProfilename', async () => {

try{
  await emitProfilename(io);  // Emit profile names to the client

} catch (error) {
  console.error("Error emitting profile names:", error);
}
  
});






    socket.on('ProjectPageCardDetails', async () => {
      try {
        console.log('Fetching project page card details...');
        await emitProjectMoneyMetrics(io);  // Fetch and emit project page card details
      } catch (error) {
        console.error("Error fetching project page card details:", error);
      }
    }
    );

    // socket.emit('totalOrdersCardData', (totalOrdersAmount) => {
    //   io.emit('totalOrdersCardData', totalOrdersAmount);
    // });

  
    // Handle 'getTeamsForDepartment' socket event
    socket.on('getTeamsForDepartment', async (departmentId) => {
      try {
        console.log('Fetching teams for department ID:', departmentId);
        await getTeamName(departmentId, io);  // Fetch and emit teams for the selected department      sssssssssssssssssssssss
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    });

    // Emit department names when a user connects or triggers the relevant event
    socket.on('getDepartmentNames', async () => {
      try {
        await getDepartmentName(io);  // Emit department names to the client
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    });
     






socket.on('getTeamwiseDeliveryGraph', async () => {
  try {
    await teamwiseDeliveryGraph(io);
  } catch (error) {
    console.error("Error fetching team-wise delivery graph:", error);
  }
});



 socket.on('TeamChart', async () => {

      try {

        await eachTeamChart(io, socket.user);  // Pass user info to your function

      } catch (error) {

        console.error("Error fetching each team chart data:", error);

      }

    });



socket.on('TeamChartid', async (teamId) => {
  try {
    console.log('Fetching each team chart data by ID:', teamId);
    await eachTeamChartForTeamId(io, teamId); // Must use io.emit inside this
  } catch (error) {
    console.error("Error fetching each team chart data by ID:", error);
  }
});


    // Listen for 'disconnect' event
 /*  io.emit('profile_based_special_orders', {
      currentYear: year,
      currentMonth: currentMonthName,
      overallTotalSpecialOrderAmount: parseFloat(overallTotalSpecialOrderAmount.toFixed(2)),
      profileOrderSummary: profileSummaryForResponse,
      report: reportDataByProfile,
    }); */

    socket.on('getProfileCurrentMonthWeeklyDetails', async () => {
      try {
        await getProfileCurrentMonthWeeklyDetails(io);
      } catch (error) {
        console.error("Error fetching profile current month weekly details:", error);
      }
    });



    


/*  
    io.emit('monthlyProfileActivityChart', {
      message: 'Monthly profile activity chart',
      data: groupedActivity,
      month: monthIndex + 1,
      year: year,
    }); */


    socket.on('getMonthlyProfileActivityChart', async () => {
      try {
        await getMonthlyProfileActivityChart(io);
      } catch (error) {
        console.error("Error fetching monthly profile activity chart:", error);
      }
    });

    



  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };