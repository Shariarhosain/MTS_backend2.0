// // middlewares/uploadMiddleware.js
// const multer = require('multer');
// const path = require('path');

// // Directory where files will be stored
// const uploadDir = './uploads';

// // Create the "uploads" directory if it doesn't exist
// const fs = require('fs');
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Set up Multer storage configuration to save files in the "uploads" directory
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, uploadDir);  // Destination directory for file uploads
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);  // Unique filename
//         cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));  // Add suffix to filename
//     }
// });

// // File type and size validation
// const fileValidation = (req, file, cb) => {
//     const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];  // Allowed MIME types
//     const maxSize = 5 * 1024 * 1024;  // Max file size (5MB)

//     if (!allowedTypes.includes(file.mimetype)) {
//         return cb(new Error('Only JPEG, PNG, or GIF images are allowed'), false);
//     }
//     if (file.size > maxSize) {
//         return cb(new Error('File size must be less than 5MB'), false);
//     }
//     cb(null, true);  // Accept the file
// };

// // Multer instance with validation
// const upload = multer({
//     storage: storage,
//     fileFilter: fileValidation,  // Apply validation
// });

// module.exports = upload.single('dp');  // Handle single file upload (profile picture)
