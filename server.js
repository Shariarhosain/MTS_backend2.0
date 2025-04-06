const express = require("express"); // Import express
const router = require("./routes/index.js"); // Import the router from routes/index.js

const app = express(); // Create an instance of express

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

app.use(router); // Use the router for handling routes


const PORT = process.env.PORT || 3000; // Set the port to listen on

app.listen(PORT, () => { // Start the server
    

    console.log(`http://localhost:${PORT}`); // Log the URL to access the server
}
); // End of the app.listen function





