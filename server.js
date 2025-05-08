const express = require('express');
const http = require('http');
const cors = require('cors');
const ProjectRoute = require('./routes/ProjectRoute');
const ProfileRoute = require('./routes/profileRoute');
const todayTaskRoute = require('./routes/todayTaskRoute');
const { initSocket, getIO } = require('./socket');

const app = express();
const server = http.createServer(app);

initSocket(server); // ✅ Initialize Socket.IO here
const cookieParser = require('cookie-parser');
const verifyToken = require('./middlewares/jwt');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


app.use(cors({
  origin: '*', // or use '*' to allow all origins (not recommended in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Pass the getIO function to your router
app.use(cookieParser());  // This should be before your routes
app.use('/api/project',verifyToken,ProjectRoute(getIO)); // Ensure ProjectRoute is returning a function
app.use('/api/teamMember', require('./routes/teamMemberRoute'));

app.use('/api/profile', verifyToken, ProfileRoute);

app.use('/api/today-task', verifyToken, todayTaskRoute); // Ensure todayTaskRoute is returning a function

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});
server.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
  console.log('Socket.IO server is running');


});
