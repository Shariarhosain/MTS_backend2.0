const express = require('express');
const http = require('http');
const cors = require('cors');
const router = require('./routes/ProjectRoute');
const { initSocket, getIO } = require('./socket');

const app = express();
const server = http.createServer(app);

initSocket(server); // ✅ Initialize Socket.IO here

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Pass the getIO function to your router
app.use('/api/project', router(getIO));
app.use('/api/teamMember', require('./routes/team_memberRoute'));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res
    .status(err.status || 500)
    .json({ message: err.message || 'Something went wrong.' });
});

const host = '192.168.10.40';

server.listen(3000, host, () => {
  console.log(`Server is running on http://${host}:3000`);
  console.log('Socket.IO server is running');
});
