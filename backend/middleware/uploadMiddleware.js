const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 3 * 1024 * 1024;
const MAX_FILES = 5;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = crypto.randomBytes(16).toString('hex');
        cb(null, `${Date.now()}-${unique}${ext}`);
    }
});

function fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only JPG, PNG, WEBP allowed.'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
        return cb(new Error('Invalid file extension.'));
    }
    cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE, files: MAX_FILES } });

function uploadProductImages(req, res, next) {
    upload.array('images', MAX_FILES)(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'File too large. Max 3MB.' });
            }
            return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
        }
        next();
    });
}

module.exports = { upload, uploadProductImages, uploadDir };
