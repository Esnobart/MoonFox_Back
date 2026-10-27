import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

import Collection from '../models/collectionsModel.js';
import Product from '../models/productsModel.js';
import User from '../models/usersModel.js';
import { productUpdateSchema } from '../models/productUpdateSchema.js';
import { MAX_PRODUCT_IMAGE_SIZE, PRODUCT_IMAGE_TYPES } from '../middleware/productUpdateUpload.js';
import { deleteUnreferencedProductImages, uploadProductImage } from './productImagesService.js';

const fail = (status, message) => {
    const error = new Error(message);
    error.status = status;
    throw error;
};

const parseProductData = (body) => {
    if (!body || Object.keys(body).length !== 1 || typeof body.data !== 'string') {
        fail(400, 'Provide one data field containing product JSON');
    }

    let data;
    try {
        data = JSON.parse(body.data);
    } catch {
        fail(400, 'The data field must contain valid JSON');
    }

    const result = productUpdateSchema.safeParse(data);
    if (!result.success) fail(422, result.error.issues[0].message);
    return result.data;
};

const validateImages = async (images, files, product) => {
    if (files.length > 5) fail(422, 'Use up to 5 new photos');

    const existingUrls = new Set(product.images || []);
    const retainedUrls = new Set();
    const usedFiles = new Set();

    for (const image of images) {
        if ('url' in image) {
            if (!existingUrls.has(image.url)) fail(422, 'A photo does not belong to this product');
            if (retainedUrls.has(image.url)) fail(422, 'Each photo must appear only once');
            retainedUrls.add(image.url);
        } else {
            if (image.fileIndex >= files.length) fail(422, 'A photo fileIndex is out of range');
            if (usedFiles.has(image.fileIndex)) fail(422, 'Each new photo must appear only once');
            usedFiles.add(image.fileIndex);
        }
    }

    if (usedFiles.size !== files.length) fail(422, 'Every new photo must be included in images');

    // Check all file contents before uploading anything; MIME headers alone are untrusted.
    for (const file of files) {
        if (!file.buffer?.length || file.buffer.length > MAX_PRODUCT_IMAGE_SIZE) {
            fail(422, 'Each photo must contain data and be at most 10 MiB');
        }
        let detected;
        try {
            detected = await fileTypeFromBuffer(file.buffer);
        } catch {
            fail(422, 'Invalid photo file');
        }
        if (!detected || !PRODUCT_IMAGE_TYPES.has(detected.mime) || detected.mime !== file.mimetype) {
            fail(422, 'Photo contents must match their JPG, PNG, WebP, GIF or AVIF type');
        }
    }
};

export const updateProduct = async (productId, body, files = []) => {
    if (!/^[a-f\d]{24}$/i.test(productId)) fail(400, 'Invalid product id');
    const { images: imageEntries, version, ...values } = parseProductData(body);
    const product = await Product.findById(productId).select('+imageAssets').lean();
    if (!product) fail(404, 'Product not found');
    if (version !== undefined && version !== (product.__v ?? 0)) {
        fail(422, 'Product changed during editing. Reload it and try again');
    }

    const [author, collection] = await Promise.all([
        User.findById(values.author).select('username avatar role').lean(),
        Collection.findById(values.collectionName).select('name coverImg').lean()
    ]);
    if (!author) fail(422, 'Selected author does not exist');
    if (!collection) fail(422, 'Selected collection does not exist');
    await validateImages(imageEntries, files, product);

    const uploadedAssets = [];
    let updatedProduct;
    let images;
    try {
        for (const file of files) {
            // Know the public ID even if Cloudinary accepts a file but its response is lost.
            const asset = { publicId: `moonfox/products/${randomUUID()}` };
            uploadedAssets.push(asset);
            Object.assign(asset, await uploadProductImage(file.buffer, asset.publicId));
        }

        images = imageEntries.map((image) => 'url' in image
            ? image.url
            : uploadedAssets[image.fileIndex].url);
        const imageAssets = [
            ...(product.imageAssets || []).filter((asset) => images.includes(asset.url)),
            ...uploadedAssets
        ];

        updatedProduct = await Product.findOneAndUpdate({
            _id: productId,
            __v: product.__v ?? { $exists: false }
        }, {
            $set: { ...values, images, imageAssets },
            $inc: { __v: 1 }
        }, { new: true, runValidators: true }).select('-imageAssets').lean();

        if (!updatedProduct) {
            if (!await Product.exists({ _id: productId })) fail(404, 'Product not found');
            fail(422, 'Product changed during editing. Reload it and try again');
        }
    } catch (error) {
        await deleteUnreferencedProductImages(uploadedAssets);
        throw error;
    }

    const removedAssets = (product.imageAssets || []).filter((asset) => !images.includes(asset.url));
    await deleteUnreferencedProductImages(removedAssets);

    // Relations were read before the write, so a failed populate cannot invalidate a saved update.
    return { ...updatedProduct, author, collectionName: collection };
};
