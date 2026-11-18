import multer from 'multer';
import { PROFILE_IMAGE_FIELDS } from '../models/usersModel.js';

export const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
export const AVATAR_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
]);

const receiveImages = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 3,
        fileSize: MAX_AVATAR_SIZE,
        fields: 1,
        fieldSize: 1024,
        fieldNameSize: 100,
        parts: 4
    },
    fileFilter: (_, file, callback) => {
        if (!AVATAR_TYPES.has(file.mimetype)) {
            return callback(new Error('Use JPG, PNG, WebP, GIF or AVIF profile images'));
        }
        callback(null, true);
    }
}).fields(PROFILE_IMAGE_FIELDS.map((name) => ({ name, maxCount: 1 })));

export const profileUpdateUpload = (req, res, next) => {
    if (!req.is('multipart/form-data')) {
        return res.status(400).json({ message: 'Expected multipart/form-data' });
    }

    receiveImages(req, res, (error) => {
        if (!error) return next();

        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'Each profile image must be at most 10 MiB'
            : error instanceof multer.MulterError
                ? 'Use an optional username and at most one file each for avatar, artistBanner and catalogBanner'
                : 'Invalid profile image upload. Use JPG, PNG, WebP, GIF or AVIF images';

        res.status(400).json({ message });
    });
};
