let io;

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


  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
