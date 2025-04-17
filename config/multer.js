const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// ✅ Cloudinary Storage Setup
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'uploads', // Cloudinary folder name
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'pdf', 'mp4'],
  },
});

// ✅ Multer Upload Middleware
const upload = multer({ storage });

const uploadMulterMiddleware = upload.fields([{ name: 'dp', maxCount: 1 }]);

module.exports = uploadMulterMiddleware;
