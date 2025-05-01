let io;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDepartmentName } = require('./middlewares/TeamName');
const { getTeamName } = require('./middlewares/TeamName');
const { getTeamMember } = require('./middlewares/TeamName');
const emitProfilename = require('./middlewares/showProfilename');

const totalOrdersCardData  = require('./middlewares/projectCardEmitter');
const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
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
     
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
