import { v2 as cloudinary } from 'cloudinary';

import Collection from '../models/collectionsModel.js';
import Product from '../models/productsModel.js';
import ProductSubmission from '../models/productsSubmissionModel.js';
import User from '../models/usersModel.js';

const cloudinaryOptions = () => {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud_name || !api_key || !api_secret) {
        throw new Error('Cloudinary credentials are missing');
    }

    return { cloud_name, api_key, api_secret, secure: true };
};

export const uploadProductImage = async (buffer, publicId) => {
    try {
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                ...cloudinaryOptions(),
                resource_type: 'image',
                public_id: publicId,
                overwrite: false,
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
                timeout: 60000
            }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
            stream.on('error', reject);
            stream.end(buffer);
        });

        if (result?.public_id !== publicId || !result.secure_url?.startsWith('https://')) {
            throw new Error('Invalid upload response');
        }

        return { publicId, url: result.secure_url };
    } catch (cause) {
        const error = new Error(cause.http_code === 400
            ? 'The photo could not be processed. Please use a valid image'
            : 'Photo upload failed. Please try again later');
        error.status = cause.http_code === 400 ? 422 : 500;
        throw error;
    }
};

const isImageReferenced = async (url) => {
    const references = await Promise.all([
        Product.exists({ $or: [{ images: url }, { 'imageAssets.url': url }] }),
        Collection.exists({ coverImg: url }),
        User.exists({ avatar: url }),
        ProductSubmission.exists({ 'product.images': url })
    ]);
    return references.some(Boolean);
};

// Only server-recorded public IDs are eligible for deletion; legacy URLs stay in storage.
// Cleanup failures must never turn a completed database update into a failed response.
export const deleteUnreferencedProductImages = async (assets) => {
    await Promise.all(assets.map(async (asset) => {
        try {
            if (asset.url && await isImageReferenced(asset.url)) return;

            const result = await cloudinary.uploader.destroy(asset.publicId, {
                ...cloudinaryOptions(),
                resource_type: 'image',
                type: 'upload',
                invalidate: true,
                timeout: 15000
            });
            if (!['ok', 'not found'].includes(result.result)) {
                throw new Error('Image cleanup failed');
            }
        } catch (error) {
            console.error('Unable to clean up product image:', asset.publicId, error.name);
        }
    }));
};
