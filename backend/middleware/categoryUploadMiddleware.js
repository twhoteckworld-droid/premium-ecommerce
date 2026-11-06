const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads', 'categories');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 2 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
    }
});

function fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. JPG/PNG/WEBP only.'));
    }
    if (!ALLOWED_EXTS.includes(path.extname(file.originalname).toLowerCase())) {
        return cb(new Error('Invalid extension.'));
    }
    cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE, files: 1 } });

function uploadCategoryImage(req, res, next) {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'File too large. Max 2MB.' });
            }
            return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
        }
        next();
    });
}

module.exports = { uploadCategoryImage, uploadDir };
