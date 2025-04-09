const express = require('express');
const router = require('./routes/index'); // Import the main router from routes/index.js


const app = express(); // Create an instance of express
 const  host= '192.168.10.40'
// Middleware to parse JSON request bodies  
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

app.use(express.static('public')); // Serve static files from the 'public' directory

app.use(router); // Use the router for handling routes

const PORT = process.env.PORT || 3000; // Set the port to listen on


// Global error handler for uncaught errors
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});



//only localhost
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});