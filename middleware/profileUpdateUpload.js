import multer from 'multer';

export const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
export const AVATAR_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
]);

const receiveAvatar = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 1,
        fileSize: MAX_AVATAR_SIZE,
        fields: 1,
        fieldSize: 1024,
        fieldNameSize: 100,
        parts: 2
    },
    fileFilter: (_, file, callback) => {
        if (!AVATAR_TYPES.has(file.mimetype)) {
            return callback(new Error('Use a JPG, PNG, WebP, GIF or AVIF avatar'));
        }
        callback(null, true);
    }
}).single('avatar');

export const profileUpdateUpload = (req, res, next) => {
    if (!req.is('multipart/form-data')) {
        return res.status(400).json({ message: 'Expected multipart/form-data' });
    }

    receiveAvatar(req, res, (error) => {
        if (!error) return next();

        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'Avatar must be at most 10 MiB'
            : error instanceof multer.MulterError
                ? 'Use an optional username field and one avatar file within the upload limits'
                : 'Invalid avatar upload. Use a JPG, PNG, WebP, GIF or AVIF image';

        res.status(400).json({ message });
    });
};
