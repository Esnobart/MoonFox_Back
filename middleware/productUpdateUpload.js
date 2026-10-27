import multer from 'multer';

export const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
]);

const receiveImages = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 5,
        fileSize: MAX_PRODUCT_IMAGE_SIZE,
        fields: 1,
        fieldSize: 64 * 1024,
        fieldNameSize: 100,
        parts: 6
    },
    fileFilter: (_, file, callback) => {
        if (!PRODUCT_IMAGE_TYPES.has(file.mimetype)) {
            const error = new Error('Use JPG, PNG, WebP, GIF or AVIF photos');
            error.status = 422;
            return callback(error);
        }
        callback(null, true);
    }
}).array('newImages', 5);

export const productUpdateUpload = (req, res, next) => {
    if (!req.is('multipart/form-data')) {
        return res.status(400).json({ message: 'Expected multipart/form-data' });
    }

    receiveImages(req, res, (error) => {
        if (!error) return next();

        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'Each photo must be at most 10 MiB'
            : error instanceof multer.MulterError
                ? 'Use one data field and up to 5 newImages files within the upload limits'
                : error.status === 422
                    ? error.message
                    : 'Invalid multipart request';

        res.status(error.status === 422 ? 422 : 400).json({ message });
    });
};
