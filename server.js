const express = require('express');
const router = require('./routes/ProjectRoute'); // Import the main router from routes/index.js
const http = require('http');
const { Server } = require('socket.io');
const host ='192.168.10.40';

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

app.use(express.static('public')); // Serve static files from the 'public' directory

app.use('/api/project', router(io)); // Use the main router for API routes
const cors = require('cors');

app.use(cors()); // Enable CORS for all routes
// On client connection, send message history

// Global error handler for uncaught errors
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  // Send all project data when a client connects
  require('./controllers/project_Controlller.js').sendProjectData(socket);

  // Listen for other events if needed (e.g., 'projectCreated', 'projectUpdated')
});


server.listen(3000, () => {
  console.log(`Server running at http://localhost:3000`);
  

});